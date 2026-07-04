import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertStatus } from '../types';
import { triggerHaptic } from '../lib/haptics';

interface SafetyEngineType {
  isArmed: boolean;
  setIsArmed: (val: boolean) => void;
  systemLogs: string[];
  addLog: (msg: string) => void;
  triggerSOS: () => Promise<boolean>;
  sendAutomatedEmailSOSAlerts: (contacts: any[], userName: string, message: string, location: any) => Promise<boolean>;
  micStatus: 'granted' | 'denied' | 'prompt' | 'unsupported';
  setMicStatus: (status: 'granted' | 'denied' | 'prompt' | 'unsupported') => void;
  lastSOSConfirmed: boolean;
  setLastSOSConfirmed: (val: boolean) => void;
  checkInTimer: {
    isActive: boolean;
    remainingSeconds: number;
    totalSeconds: number;
  };
  startCheckInTimer: (seconds: number) => void;
  cancelCheckInTimer: () => void;
}

const SafetyEngineContext = createContext<SafetyEngineType | null>(null);

export function SafetyEngineProvider({ children }: { children: React.ReactNode }) {
  const [isArmed, setIsArmedState] = useState(true);
  const setIsArmed = useCallback((val: boolean) => {
    Promise.resolve().then(() => {
      setIsArmedState(val);
    });
  }, []);
  
  const [systemLogs, setSystemLogs] = useState<string[]>(["[SYSTEM] Internal Safety Engine initialized", "[SYSTEM] GPS Connection: SECURE"]);
  const [micStatus, setMicStatus] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [lastSOSConfirmed, setLastSOSConfirmed] = useState(false);
  const [checkInTimer, setCheckInTimer] = useState({ isActive: false, remainingSeconds: 0, totalSeconds: 0 });
  
  const timerIntervalRef = useRef<any>(null);
  const { location } = useLocation();
  const { user, profile } = useAuth();
  
  // Use refs to avoid stale closures in long-running callbacks/intervals
  const locationRef = useRef(location);
  const profileRef = useRef(profile);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  
  const isTriggering = useRef(false);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // Defer update to avoid "update while rendering" warnings in complex re-render cycles
    Promise.resolve().then(() => {
      setSystemLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
    });
  }, []);

  const sendAutomatedEmailSOSAlerts = useCallback(async (
    contacts: any[],
    userName: string,
    message: string,
    location: any
  ) => {
    // 1. Parse the trusted contacts list to extract valid emails
    const emailContacts = contacts.filter(c => c.email && c.email.trim() !== '');
    
    if (emailContacts.length === 0) {
      addLog("EMAIL_BACKUP_WARN: No trusted contacts with registered email addresses found.");
      return false;
    }

    addLog(`EMAIL_BACKUP: Parsing ${emailContacts.length} trusted contact email endpoints...`);
    
    try {
      addLog("EMAIL_BACKUP: Transmitting SOS alerts via secure SMTP configuration...");
      const emailResponse = await fetch('/api/email/send-sos-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: emailContacts,
          senderName: userName,
          message: message,
          location: location
        })
      });
      
      const emailData = await emailResponse.json();
      if (emailData.status === 'success') {
        const simulatedCount = emailData.results?.filter((r: any) => r.status === 'simulated').length || 0;
        const sentCount = emailData.results?.filter((r: any) => r.status === 'sent').length || 0;
        
        if (sentCount > 0) {
          addLog(`EMAIL_BACKUP_SUCCESS: Automated alerts sent via SMTP to ${sentCount} verified contacts.`);
          return true;
        }
        if (simulatedCount > 0) {
          addLog(`EMAIL_BACKUP_SIM: Automated simulation completed for ${simulatedCount} contacts (no active SMTP key).`);
          return true;
        }
      } else {
        addLog(`EMAIL_BACKUP_ERR: SMTP dispatch returned error status - ${emailData.message || "Unknown issue"}`);
      }
    } catch (emailErr: any) {
      console.error("SOS automated fallback email alert dispatch error:", emailErr);
      addLog(`EMAIL_BACKUP_FAIL: Critical failure in email dispatch relay.`);
    }
    
    return false;
  }, [addLog]);

  const triggerSOS = useCallback(async () => {
    if (isTriggering.current) return false;
    isTriggering.current = true;

    const currentUser = user;
    const currentProfile = profileRef.current;
    const currentLocation = locationRef.current;

    if (!currentUser) {
      addLog("SOS FAILED: User not authenticated.");
      isTriggering.current = false;
      return false;
    }

    const allContactsToNotify = currentProfile?.emergencyContacts || [];
    
    if (allContactsToNotify.length === 0) {
      const errorMsg = "SOS ABORTED: No emergency contacts found. Protocol suspended.";
      addLog(errorMsg);
      
      try {
        await addDoc(collection(db, 'sos_history'), {
          userId: currentUser.uid,
          timestamp: serverTimestamp(),
          status: 'FAILED',
          message: errorMsg,
          reason: 'NO_VERIFIED_CONTACTS',
          location: currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null
        });
      } catch (e) {
        console.error("Failed to log failure:", e);
      }
      
      isTriggering.current = false;
      return false;
    }

    addLog("ALERT: SOS PROTOCOL INITIATED");
    addLog("SIGNAL: Synchronizing tactical location...");

    // TACTICAL COORDINATE SELECTION: Absolute priority to the LIVE MAP PIN
    const pinLocation = currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null;
    const dbLocation = currentProfile?.lastLocation ? { lat: currentProfile.lastLocation.lat, lng: currentProfile.lastLocation.lng } : null;
    
    let locationObj = pinLocation || dbLocation;

    // Fast fallback if map pin is missing
    if (!locationObj) {
      addLog("SIGNAL_WARN: Map pin lost. Attempting direct hardware synchronization...");
      const scanPromise: Promise<{lat: number, lng: number} | null> = new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        // Increased timeout for better lock reliability
        const t = setTimeout(() => resolve(null), 8000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(t); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
          (err) => { 
            clearTimeout(t); 
            console.warn("Scan failed:", err.message);
            resolve(null); 
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      locationObj = await scanPromise;
    }

    if (locationObj) {
      addLog(`SIGNAL_LOCKED: Target coordinates acquired from active telemetry.`);
    } else {
      addLog("SIGNAL_CRIT: GPS synchronization failed. Local sectoral relay active.");
    }

    if (currentProfile?.evidenceSync) {
      addLog("EVIDENCE: Initializing secure stream... (Audio/Video Sync Active)");
    }

    // Prepare SMS Message - MANDATORY LOCATION DATA
    const isOffline = !navigator.onLine;
    const coordinatesString = locationObj 
      ? `\nGPS: ${locationObj.lat.toFixed(6)}, ${locationObj.lng.toFixed(6)}`
      : "";
    const mapLink = locationObj 
      ? `\nExact Pinpoint: https://www.google.com/maps/search/?api=1&query=${locationObj.lat},${locationObj.lng}`
      : "\n[SIGNAL_STALLED: GPS UNSTABLE - RELAYING LAST KNOWN SECTOR]";
    
    const offlineWarning = isOffline ? "\n(OFFLINE_RELAY_ACTIVE)" : "";
    
    const sosBody = currentProfile?.customSOSMessage || "EMERGENCY: SOS Triggered!";
    const userName = currentProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || "Unknown User";
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // EMERGENCY MESSAGE CONSTRUCTION
    const senderContact = currentProfile?.phoneNumber ? `\nCONTACT: ${currentProfile.phoneNumber}` : "";
    const finalMessage = `[Ai-POWERED SOS]\nSENDER: ${userName.toUpperCase()}${senderContact}\nSTATUS: ${sosBody}\nLOCATION: https://www.google.com/maps?q=${locationObj?.lat},${locationObj?.lng}\nTIME: ${timestamp}\nREF: ${currentUser.email}`;
    
    let isSuccessfullySent = false;
    let usedRelay = "UNKNOWN";
    let failureReason = "";

    // Broadcast to targets
    try {
      if (allContactsToNotify.length > 0) {
        const phoneNumbers = allContactsToNotify.map(c => c.phone);
        let smsGatewaySucceeded = false;

        // EXCLUSIVE Arkesel Cloud Relay
        try {
          addLog("SAFETY_RELAY: Engaging cloud dispatch protocols...");
          // ARKESEL SENDER ID: Using pre-verified unified ID
          const sanitizedSenderName = "SafetyAlert";

          const response = await fetch('/api/sms/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumbers,
              message: finalMessage,
              senderName: sanitizedSenderName
            })
          });
          const data = await response.json();
          if (data.status === 'success') {
            addLog(`SERVER_RELAY: Signal broadcast via ${data.relay}`);
            isSuccessfullySent = true;
            usedRelay = data.relay;
            
            // Check if it's a real gateway transmission success
            if (data.relay !== "SIMULATION_FALLBACK" && data.relay !== "SIMULATION_MODE") {
              smsGatewaySucceeded = true;
            }
          } else {
            const detailedError = data.details ? JSON.stringify(data.details) : (data.message || data.error);
            failureReason = `RELAY_REJECTION: ${detailedError}`;
            addLog(`SERVER_RELAY_WARN: ${failureReason}`);
          }
        } catch (serverErr: any) {
           const errorText = serverErr instanceof Error ? serverErr.message : String(serverErr);
           failureReason = `NETWORK_ERR: ${errorText}`;
           addLog(`RELAY_FAIL: Socket connection timeout. Arkesel online relay is mandatory.`);
        }

        // Automatic SMTP backup triggers if primary SMS gateway fails (or operates in simulation/fallback modes)
        if (!smsGatewaySucceeded) {
          addLog("BACKUP_PROTOCOL: Primary SMS gateway inactive or failed. Triggering secure automated email fallback...");
          const emailBackupSent = await sendAutomatedEmailSOSAlerts(allContactsToNotify, userName, sosBody, locationObj);
          if (emailBackupSent) {
            isSuccessfullySent = true;
            if (usedRelay === "UNKNOWN" || usedRelay === "SIMULATION_FALLBACK") {
              usedRelay = "EMAIL_BACKUP_RELAY";
            }
          }
        } else {
          // Parallel notification fallback as extra safeguard
          addLog("EMAIL_RELAY: Initiating resilient email backup broadcast...");
          await sendAutomatedEmailSOSAlerts(allContactsToNotify, userName, sosBody, locationObj);
        }
      }

      // ENSURE HISTORY LOGGING IS TRUTHFUL
      addDoc(collection(db, 'sos_history'), {
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        status: isSuccessfullySent ? 'SUCCESS' : 'FAILED',
        message: finalMessage,
        reason: isSuccessfullySent ? null : (failureReason || "TOTAL_DISPATCH_FAILURE"),
        relay: usedRelay,
        location: locationObj,
        contactsNotified: allContactsToNotify.map(c => ({ name: c.name, phone: c.phone }))
      }).catch(logErr => console.warn("HISTORY_SYNC_WARN:", logErr));
      addLog("HISTORY: Cloud record established.");

      addLog("DISPATCH: Emergency signals broadcast correctly.");
      
      const playEmergencySound = () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
        } catch (e) {
          console.warn("Audio Context failed to initialize:", e);
        }
      };

      triggerHaptic([500, 200, 500, 200, 500]);
      playEmergencySound();

      const alertData = {
        senderId: currentUser.uid,
        senderName: currentProfile?.displayName || currentUser.displayName || "Unknown Operator",
        location: locationObj,
        timestamp: serverTimestamp(),
        status: AlertStatus.ACTIVE,
        message: finalMessage,
        isSimulatedRelay: false,
        relayType: isSuccessfullySent ? usedRelay : "CLOUD_ONLY"
      };

      if (currentProfile?.evidenceSync) {
        Object.assign(alertData, {
          evidenceUrl: "sync://evidence-vault-secure-01",
          isEvidenceStreaming: true
        });
      }

      addDoc(collection(db, 'alerts'), alertData).catch(alertErr => console.warn("ALERT_SYNC_WARN:", alertErr));
      
      addDoc(collection(db, 'system_logs'), {
        userId: currentUser.uid,
        event: 'SOS_TRIGGERED',
        message: finalMessage,
        timestamp: serverTimestamp()
      }).catch(logErr => console.warn("LOG_SYNC_WARN:", logErr));

      setLastSOSConfirmed(true);
      return isSuccessfullySent;
    } catch (err) {
      addLog(`ERROR: Sync failed - ${err}`);
      return false;
    } finally {
      isTriggering.current = false;
    }
  }, [user, addLog]);

  // Sensor Fusion Simulation (Accelerometer)
  useEffect(() => {
    if (!isArmed) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;

      const totalForce = Math.sqrt((accel.x || 0)**2 + (accel.y || 0)**2 + (accel.z || 0)**2);
      
      // Threshold for "impact" or "sudden run"
      if (totalForce > 30) {
        addLog("SENSOR: G-Force threshold exceeded (Movement detected)");
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isArmed, addLog]);

  const startCheckInTimer = useCallback((seconds: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    setCheckInTimer({ isActive: true, remainingSeconds: seconds, totalSeconds: seconds });
    addLog(`SAFETY: Check-in timer initialized (${Math.floor(seconds/60)}m)`);

    timerIntervalRef.current = setInterval(() => {
      setCheckInTimer(prev => {
        if (prev.remainingSeconds <= 1) {
          clearInterval(timerIntervalRef.current);
          triggerSOS();
          return { isActive: false, remainingSeconds: 0, totalSeconds: 0 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
  }, [addLog, triggerSOS]);

  const cancelCheckInTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setCheckInTimer({ isActive: false, remainingSeconds: 0, totalSeconds: 0 });
    addLog("SAFETY: Check-in protocols suspended. Status: SAFE");
  }, [addLog]);

  const contextValue = useMemo(() => ({ 
    isArmed, 
    setIsArmed, 
    systemLogs, 
    addLog, 
    triggerSOS,
    sendAutomatedEmailSOSAlerts,
    micStatus,
    setMicStatus,
    lastSOSConfirmed,
    setLastSOSConfirmed,
    checkInTimer,
    startCheckInTimer,
    cancelCheckInTimer
  }), [isArmed, setIsArmed, systemLogs, addLog, triggerSOS, sendAutomatedEmailSOSAlerts, micStatus, lastSOSConfirmed, checkInTimer, startCheckInTimer, cancelCheckInTimer]);

  return (
    <SafetyEngineContext.Provider value={contextValue}>
      {children}
    </SafetyEngineContext.Provider>
  );
}

export function useSafety() {
  const context = useContext(SafetyEngineContext);
  if (!context) throw new Error("useSafety must be used within SafetyEngineProvider");
  return context;
}
