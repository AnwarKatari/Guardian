import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  PhoneCall, 
  Shield, 
  X,
  MessageSquare,
  Zap,
  Lock,
  Clock,
  ChevronRight,
  UserCheck,
  Activity,
  ShieldAlert,
  Wifi,
  Signal,
  Eye,
  EyeOff,
  Fingerprint,
  RotateCcw,
  Flame,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useSafety } from '../contexts/SafetyEngineContext';
import { getEmergencyNumbers } from '../constants/emergencyMatrix';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import FakeCallModal from '../components/FakeCallModal';
import { GuardianLogo } from '../components/GuardianLogo';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { triggerHaptic } from '../lib/haptics';

export default function SOSPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [isActivating, setIsActivating] = useState(false);
  const { user, profile } = useAuth();
  const { triggerSOS, addLog, checkInTimer, startCheckInTimer, cancelCheckInTimer, lastSOSConfirmed, setLastSOSConfirmed } = useSafety();

  const [isAlertActive, setIsAlertActive] = useState(lastSOSConfirmed);
  const [progress, setProgress] = useState(0);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [holdWarning, setHoldWarning] = useState<string | null>(null);
  const [showEmergencyPrompt, setShowEmergencyPrompt] = useState(false);
  const [showEmergencyNumbersList, setShowEmergencyNumbersList] = useState(false);
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const warningTimeoutRef = useRef<any>(null);
  const progressRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const HOLD_DURATION = profile?.sosHoldDuration !== undefined ? profile.sosHoldDuration : 1500;
  const CIRCUMFERENCE = 740; // Approx 2 * pi * (280 * 0.42)

  const triggerWarning = (msg: string) => {
    setHoldWarning(msg);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => {
      setHoldWarning(null);
    }, 5000);
  };

  const playFeedbackSound = (freq = 440, duration = 0.1) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  };

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (isAlertActive) return;
    
    // Prevent double triggers / mouse simulation emulation
    e.preventDefault();

    if (HOLD_DURATION === 0) {
      handleTrigger();
      return;
    }

    if (isActivating) return;

    // Clear any previous active timers/intervals and warnings
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    setIsActivating(true);
    setProgress(0);
    progressRef.current = 0;
    setHoldWarning(null);

    // Heavy, persistent and serious vibration pattern designed to simulate an urgent hold
    // alternate 600ms on, 100ms off for a total of over 5 seconds
    triggerHaptic([600, 100, 600, 100, 600, 100, 600, 100, 600, 100, 600, 100, 600, 100, 600]);
    playFeedbackSound(440, 0.1);

    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(p);
      progressRef.current = p;
      if (p < 1) {
        // High-frequency sound feedback matching the vibration intensity
        if (Math.floor(elapsed / 250) > Math.floor((elapsed - 50) / 250)) {
          playFeedbackSound(440 + p * 250, 0.05);
        }
      }
    }, 16);

    timerRef.current = setTimeout(async () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      progressRef.current = 1;
      handleTrigger();
    }, HOLD_DURATION);
  };

  const endHold = (e?: React.MouseEvent | React.TouchEvent) => {
    if (isAlertActive) return;
    if (e) e.preventDefault();

    if (HOLD_DURATION === 0) {
      return;
    }

    const wasActivating = isActivating;

    // Clear active intervals/timers immediately
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If they let go before progress reaches 1, reset and show hold warning
    if (wasActivating && progressRef.current < 1) {
      triggerWarning(`Do not lift your finger up until countdown finishes! Hold for a full ${HOLD_DURATION / 1000} seconds to send SOS.`);
      triggerHaptic([150, 50, 150]); // Short warning buzz
    }

    setIsActivating(false);
    setProgress(0);
    progressRef.current = 0;
    // Cancel the ongoing vibration immediately when user lets go
    triggerHaptic(0);
  };

  const handleTrigger = async () => {
    if (!profile?.emergencyContacts || profile.emergencyContacts.length === 0) {
      triggerHaptic([100, 50, 100]);
      addLog("Warning: No emergency contacts found. Add them in Settings first.");
      alert("Please add emergency contacts in Settings or Onboarding first!");
      setIsActivating(false);
      setProgress(0);
      return;
    }

    setIsAlertActive(true);
    setLastSOSConfirmed(true);
    setIsActivating(false);
    setProgress(0);
    // Heavy rapid final confirmation pulse pattern to signify successful dispatch
    triggerHaptic([300, 80, 300, 80, 500, 80, 800]);
    playFeedbackSound(880, 0.5);
    
    await triggerSOS();
    addLog("Ai-POWERED: SOS Protocol initialised. Emergency circle alerted.");
    setShowEmergencyPrompt(true);
  };

  const cancelSOS = () => {
    setIsAlertActive(false);
    setLastSOSConfirmed(false);
    triggerHaptic(50);
    addLog("Ai-POWERED: Protocol terminated by user.");
  };

  useEffect(() => {
    setIsAlertActive(lastSOSConfirmed);
  }, [lastSOSConfirmed]);

  // Keep-awake implementation using Capacitor plugin
  useEffect(() => {
    let active = false;
    
    const requestKeepAwake = async () => {
      try {
        const supported = await KeepAwake.isSupported();
        if (supported.isSupported) {
          await KeepAwake.keepAwake();
          active = true;
          addLog("SYSTEM: Keep-Awake plugin engaged. Screen dimming/locking suspended.");
        }
      } catch (err) {
        console.warn("Capacitor Keep-Awake is not active or supported in this browser:", err);
      }
    };

    const requestAllowSleep = async () => {
      try {
        if (active) {
          await KeepAwake.allowSleep();
          active = false;
          addLog("SYSTEM: Keep-Awake plugin disengaged. Normal screen dimming/locking restored.");
        }
      } catch (err) {
        console.warn("Capacitor Keep-Awake disengage error:", err);
      }
    };

    if (isAlertActive) {
      requestKeepAwake();
    } else {
      requestAllowSleep();
    }

    return () => {
      requestAllowSleep();
    };
  }, [isAlertActive, addLog]);

  const emergencyData = getEmergencyNumbers(profile?.countryCode || 'GH');

  const [activeCircle, setActiveCircle] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile?.emergencyContacts || profile.emergencyContacts.length === 0) {
      setActiveCircle([]);
      return;
    }

    // Since emergencyContacts are stored as objects in this app, we need to handle them differently
    // than a simple ID list if we want to fetch the latest full UserProfile from Firestore
    // However, the current logic assumes they are IDs for 'in' query.
    // Let's assume based on the context that we want to show the avatars of the actual people.
    // If we only have name/phone, we just use those.
    
    // For now, let's keep it as is but fix the property name to avoid crashing
    // and assume the user's intent was to use emergencyContacts
    const contactIds = profile.emergencyContacts.map((c: any) => c.id).filter(Boolean);
    
    if (contactIds.length === 0) {
      setActiveCircle([]);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('uid', 'in', contactIds.slice(0, 10))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map(doc => doc.data() as UserProfile);
      setActiveCircle(contacts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [profile?.emergencyContacts]);

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 space-y-8 pb-32 max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto relative overflow-hidden font-sans text-neutral-900">
      {/* Dynamic Background Accents (Home Page Style) */}
      <div className="absolute top-0 right-0 w-[80%] h-[40%] bg-blue-50/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[60%] h-[40%] bg-indigo-50/40 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-10" />
      
      {/* Safety Header */}
      <section className="flex justify-between items-center relative z-10 pt-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white rounded-2xl border border-neutral-100 shadow-xl group cursor-crosshair hover:rotate-[360deg] transition-all duration-700">
            <GuardianLogo size={22} pulsing={true} />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xl font-display font-black tracking-tighter text-neutral-900 italic leading-none uppercase">
              Ai-POWERED <span className="text-blue-600 drop-shadow-sm">HUMAN SAFETY ALERT</span>
            </h2>
            <div className="flex items-center gap-2">
               <div className={cn(
                 "w-1.5 h-1.5 rounded-full animate-pulse",
                 isAlertActive ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
               )} />
               <p onClick={() => setActiveTab && setActiveTab('network')} className="text-neutral-400 text-[9px] font-mono font-black uppercase tracking-[0.3em] italic cursor-pointer hover:text-blue-600 transition-colors">
                 {isAlertActive ? "EMERGENCY PROTOCOL BROADCASTING" : `SOS CONTACTS: ${profile?.emergencyContacts?.length || 0} ACTIVE`}
               </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-white rounded-full shadow-lg active:scale-95 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-blue-600/20 translate-y-full group-hover:translate-y-0 transition-transform" />
              <Zap size={10} className="text-blue-400 fill-blue-400 relative z-10" />
              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300 relative z-10">v4.9.0</span>
           </div>
        </div>
      </section>

      {/* Success Toast */}
      <AnimatePresence>
        {isAlertActive && (
          <motion.div 
            initial={{ y: -20, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: -20, x: "-50%", opacity: 0 }}
            className="fixed top-24 left-1/2 z-[60] flex items-center gap-3 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl border border-neutral-700"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] pt-0.5 italic text-emerald-400 font-display">SOS DISPATCHED & SECURE</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Toast */}
      <AnimatePresence>
        {holdWarning && (
          <motion.div 
            initial={{ y: -20, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: -20, x: "-50%", opacity: 0 }}
            className="fixed top-24 left-1/2 z-[60] flex items-center gap-3 bg-red-950 text-white px-6 py-3 rounded-full shadow-2xl border border-red-800"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] pt-0.5 italic text-red-400 font-display">
              {holdWarning}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10 w-full mt-4">
        
        {/* Left Column: Central Hub (SOS Fingerprint Hold Engine) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-neutral-50/50 border border-neutral-100 rounded-[40px] p-6 sm:p-10 shadow-sm relative overflow-hidden w-full">
          {/* Main Content Area - Centered and Firm */}
          <div className="w-full flex flex-col items-center justify-center relative z-10 py-4">
            
            {/* The Central Hub */}
            <div className="relative group">
              {/* External Halo pulses (Apple Blinking Red & Heartbeat Effect) */}
              <AnimatePresence>
                {!isAlertActive ? (
                  <>
                    <motion.div 
                      initial={{ opacity: 0.3, scale: 0.95 }}
                      animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.35, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-[-12px] rounded-full border-2 border-red-500/30 pointer-events-none"
                    />
                    <motion.div 
                      initial={{ opacity: 0.15, scale: 0.9 }}
                      animate={{ opacity: [0.3, 0, 0.3], scale: [1, 1.7, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-[-28px] rounded-full border border-red-500/15 pointer-events-none"
                    />
                    <div className="absolute inset-[-6px] rounded-full bg-red-500/5 animate-pulse pointer-events-none" />
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.8, 0.4, 0.8], scale: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="absolute inset-x-[-40%] inset-y-[-40%] rounded-full bg-red-600/10 blur-3xl"
                  />
                )}
              </AnimatePresence>

              {/* Neumorphic Base */}
              <div className="relative flex items-center justify-center w-[75vw] h-[75vw] max-w-[280px] max-h-[280px] rounded-full bg-white shadow-[12px_12px_36px_rgba(0,0,0,0.06),-12px_-12px_36px_rgba(255,255,255,0.8)] border-[1px] border-neutral-100 p-2">
                
                {/* Inner Ring (Static Detail) */}
                <div className="absolute inset-4 rounded-full border border-neutral-50 shadow-inner" />
                
                {/* Clock Ticks Detail */}
                <div className="absolute inset-3 rounded-full border border-dashed border-neutral-100 opacity-60 pointer-events-none" />

                {/* Rotating UI elements */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 opacity-10 pointer-events-none"
                >
                  {[0, 90, 180, 270].map(deg => (
                    <div key={deg} className="absolute top-4 left-1/2 -translate-x-1/2 w-[2px] h-4 bg-neutral-900 rounded-full" style={{ transform: `rotate(${deg}deg)` }} />
                  ))}
                </motion.div>
     
                {/* SOS Button Container */}
                <div className="relative flex items-center justify-center w-[65vw] h-[65vw] max-w-[240px] max-h-[240px]">
                  
                  {/* SVG Progress Ring */}
                  <AnimatePresence>
                    {!isAlertActive && (
                      <motion.svg 
                        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20"
                        exit={{ opacity: 0, scale: 1.1 }}
                      >
                        <circle 
                          cx="50%" 
                          cy="50%" 
                          r="42%" 
                          stroke="url(#sos-ring-grad)" 
                          strokeWidth="12" 
                          fill="none" 
                          strokeLinecap="round"
                          style={{
                            strokeDasharray: CIRCUMFERENCE,
                            strokeDashoffset: CIRCUMFERENCE - (progress * CIRCUMFERENCE),
                            transition: "stroke-dashoffset 0.1s linear"
                          }}
                        />
                        <defs>
                          <linearGradient id="sos-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f87171" />
                            <stop offset="100%" stopColor="#991b1b" />
                          </linearGradient>
                        </defs>
                      </motion.svg>
                    )}
                  </AnimatePresence>
     
                  {/* The 3D SOS Button with Right-Click and Left-Click holding support */}
                  <motion.button
                    onMouseDown={startHold}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchStart={startHold}
                    onTouchEnd={endHold}
                    onTouchCancel={endHold}
                    onContextMenu={(e) => e.preventDefault()}
                    animate={
                      isAlertActive ? 
                      { scale: 1, backgroundColor: "#09090b" } : 
                      isActivating ? { scale: 0.92, backgroundColor: "#991b1b" } : 
                      { scale: 1, backgroundColor: "#ef4444" }
                    }
                    className={cn(
                      "absolute inset-0 z-30 rounded-full flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-500 border-red-400/50 cursor-pointer",
                      isAlertActive ? "bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),inset_0_-8px_16px_rgba(0,0,0,0.6),0_20px_60px_rgba(0,0,0,0.4)] border-zinc-700/50" :
                      "bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-[inset_0_6px_12px_rgba(255,255,255,0.35),inset_0_-6px_12px_rgba(0,0,0,0.15),0_15px_35px_rgba(239,68,68,0.45)]"
                    )}
                  >
                    {/* Visual Depth / Gloss */}
                    {!isAlertActive && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.25)_0%,_transparent_60%)]" />
                    )}
     
                    <AnimatePresence mode="wait">
                      {isAlertActive ? (
                        <motion.div 
                          key="locked"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center text-white"
                        >
                          <div className="p-4 bg-emerald-500/25 rounded-[24px] mb-2 border border-emerald-500/30 shadow-inner">
                            <Lock size={32} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                          </div>
                          <span className="font-black text-2xl tracking-[0.2em] uppercase leading-none drop-shadow-md text-emerald-400 italic font-display">Locked</span>
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50 mt-2 italic">Dispatch Ongoing</p>
                        </motion.div>
                      ) : isActivating ? (
                        <motion.div 
                          key="activating"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center text-white"
                        >
                          <div className="relative mb-2">
                            <Fingerprint size={56} className="animate-pulse text-red-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                            <motion.div 
                              animate={{ top: ["0%", "100%", "0%"] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                              className="absolute left-0 w-full h-[2px] bg-white brightness-200 shadow-[0_0_10px_white]"
                            />
                          </div>
                          <span className="font-black text-xs tracking-widest uppercase italic font-display text-white">Transmitting</span>
                          <span className="font-black text-xl tracking-tighter text-yellow-300 uppercase italic mt-1 font-display">
                            Hold {Math.max(1, Math.ceil((HOLD_DURATION / 1000) - progress * (HOLD_DURATION / 1000)))}s
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="idle"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center text-white"
                        >
                          <span className="font-black text-[72px] tracking-tighter uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] leading-none mb-1 italic font-display text-white">SOS</span>
                          <div className="bg-black/25 px-5 py-1.5 rounded-full backdrop-blur-md shadow-inner border border-white/10">
                            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-red-50 italic">{HOLD_DURATION === 0 ? "Tap to Trigger" : "Force Hold"}</span>
                          </div>
                          <div className="mt-3 flex items-center gap-1.5 opacity-50">
                             <Shield size={10} />
                             <span className="text-[8px] font-black uppercase tracking-widest italic">Encrypted Connection</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Instant SOS Dispatch Button - Apple style secondary wow button */}
            {!isAlertActive && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleTrigger}
                className="w-full max-w-sm mt-8 p-5 bg-gradient-to-r from-neutral-900 via-red-950 to-neutral-900 border border-neutral-800 rounded-[30px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_15px_30px_rgba(220,38,38,0.15)] flex items-center justify-between group relative overflow-hidden transition-all duration-300 pointer-events-auto cursor-pointer"
              >
                <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 bg-red-600/15 text-red-500 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-all shadow-md">
                    <ShieldAlert size={20} className="animate-pulse" />
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-red-400 font-mono italic">Alternative Trigger</span>
                    <p className="font-black text-sm text-white uppercase tracking-tight mt-0.5">1-TAP INSTANT DISPATCH</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-300">Instant</span>
                </div>
              </motion.button>
            )}
     
            {/* Emergency Circle Status (Firmly anchored) */}
            {!isAlertActive && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-col items-center gap-3"
              >
                <div className="flex -space-x-3">
                  {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                    <>
                      {profile.emergencyContacts.slice(0, 5).map(c => {
                        const fetchedMember = activeCircle.find(m => m.uid === c.id);
                        return (
                          <div key={c.id} className="w-10 h-10 rounded-full border-4 border-white overflow-hidden shadow-xl transition-all hover:scale-110 hover:z-10 group relative">
                            <img 
                              src={fetchedMember?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name || c.id}`} 
                              className="w-full h-full object-cover" 
                              alt="" 
                            />
                            <div className={cn(
                              "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
                              fetchedMember?.isOnline ? "bg-emerald-500 shadow-[0_0_5px_#10b981]" : "bg-neutral-300"
                            )} />
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    [1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-neutral-100 flex items-center justify-center shadow-sm">
                        <UserCheck size={14} className="text-neutral-300" />
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-neutral-400 italic">
                  {profile?.emergencyContacts?.length || 0} Network Contacts Linked
                </p>
              </motion.div>
            )}
          </div>
        </div>
     
        {/* Right Column: Action Panels & Critical Safe Controls */}
        <div className="lg:col-span-6 w-full flex flex-col h-full">
          <AnimatePresence mode="wait">
            {!isAlertActive ? (
              <motion.div 
                key="idle-panel"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="space-y-4 w-full"
              >
                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <button 
                    onClick={() => {
                      if (checkInTimer.isActive) cancelCheckInTimer();
                      else setShowCheckInModal(true);
                    }}
                    className="p-6 bg-white border border-neutral-100 rounded-[32px] shadow-sm flex flex-col items-start gap-4 hover:border-blue-500/30 transition-all group cursor-pointer"
                  >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {checkInTimer.isActive ? (
                        <span className="text-xs font-black">
                          {Math.floor(checkInTimer.remainingSeconds / 60)}m
                        </span>
                      ) : <Clock size={20} />}
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 italic">Safety Timer</p>
                      <p className="font-black text-sm text-neutral-900 mt-0.5 italic uppercase">
                        {checkInTimer.isActive ? "Monitoring..." : "Set Check-in"}
                      </p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setShowFakeCall(true)}
                    className="p-6 bg-white border border-neutral-100 rounded-[32px] shadow-sm flex flex-col items-start gap-4 hover:border-blue-500/30 transition-all group cursor-pointer"
                  >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <PhoneCall size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 italic">Deterrent</p>
                      <p className="font-black text-sm text-neutral-900 mt-0.5 italic uppercase">Fake Call</p>
                    </div>
                  </button>
                </div>

                <div className="bg-white border border-neutral-100 rounded-[40px] p-6 shadow-sm space-y-4 mt-auto">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-3.5 bg-red-600 rounded-full animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 italic">Emergency Hub Contacts</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Police */}
                    <motion.a 
                      href={`tel:${emergencyData.police}`}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="p-5 bg-white border-2 border-red-100 rounded-[28px] flex items-center justify-between group transition-all shadow-md shadow-red-500/5 hover:border-red-600/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-red-200 transition-transform group-hover:scale-105">
                          <ShieldAlert size={24} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic opacity-80 leading-none">Emergency Dispatch</p>
                          <p className="text-2xl font-black italic text-neutral-900 tracking-tighter uppercase leading-none group-hover:text-red-600 transition-colors underline decoration-red-600/20 underline-offset-4">{emergencyData.police}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-200 group-hover:text-red-600 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={2.5} />
                    </motion.a>

                    {/* Medical */}
                    <motion.a 
                      href={`tel:${emergencyData.ambulance}`}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="p-5 bg-white border border-neutral-200 rounded-[28px] flex items-center justify-between group transition-all shadow-sm hover:border-blue-500/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                          <Stethoscope size={24} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic opacity-80 leading-none">Medical Services</p>
                          <p className="text-2xl font-black italic text-neutral-900 tracking-tighter uppercase leading-none group-hover:text-blue-600 transition-colors underline decoration-blue-600/10 underline-offset-4">{emergencyData.ambulance}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-200 group-hover:text-blue-600 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={2.5} />
                    </motion.a>

                    {/* Fire */}
                    <motion.a 
                      href={`tel:${emergencyData.fire}`}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="p-5 bg-white border border-neutral-200 rounded-[28px] flex items-center justify-between group transition-all shadow-sm hover:border-amber-500/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                          <Flame size={24} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic opacity-80 leading-none">Fire Services</p>
                          <p className="text-2xl font-black italic text-neutral-900 tracking-tighter uppercase leading-none group-hover:text-amber-500 transition-colors underline decoration-amber-500/10 underline-offset-4">{emergencyData.fire}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-neutral-200 group-hover:text-amber-500 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={2.5} />
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="active-panel"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="space-y-4 w-full"
              >
                <div className="bg-white border border-neutral-100 p-8 rounded-[44px] shadow-2xl space-y-6 relative overflow-hidden">
                   {/* Background Glow */}
                   <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl -mr-24 -mt-24 pointer-events-none" />

                  <div className="flex items-center gap-5 bg-neutral-50 border border-neutral-100 p-6 rounded-[32px] shadow-inner">
                    <div className="p-4 bg-emerald-500 text-white rounded-2xl relative shadow-lg shadow-emerald-500/20">
                      <ShieldCheck size={28} />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-neutral-900 font-black text-base uppercase tracking-tight italic">Protocol Live</h3>
                      <p className="text-neutral-500 text-[10px] mt-1 font-black uppercase italic tracking-widest opacity-60">Identity & Location Broadcasted</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <a 
                      href={`tel:${emergencyData.police}`}
                      className="w-full flex items-center justify-between px-8 py-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[32px] font-black uppercase tracking-wider transition-all shadow-xl active:scale-95 italic group"
                    >
                      <div className="flex items-center gap-4">
                        <Shield size={20} className="text-blue-500" />
                        <span>Call Police</span>
                      </div>
                      <span className="text-neutral-500 text-xs italic">{emergencyData.police}</span>
                    </a>
                    
                    <a 
                      href={`tel:${emergencyData.ambulance}`}
                      className="w-full flex items-center justify-between px-8 py-5 bg-red-600 hover:bg-red-700 text-white rounded-[32px] font-black uppercase tracking-wider transition-all shadow-xl active:scale-95 italic group"
                    >
                       <div className="flex items-center gap-4">
                        <Activity size={20} className="text-white" />
                        <span>Emergency Med</span>
                      </div>
                      <span className="text-red-200 text-xs italic">{emergencyData.ambulance}</span>
                    </a>
                  </div>

                  <button 
                    onClick={cancelSOS}
                    className="w-full py-4 text-neutral-400 font-black text-[10px] uppercase tracking-[0.4em] hover:text-neutral-900 transition-colors mt-2 italic group flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-200 flex items-center justify-center p-1 group-hover:border-neutral-900 transition-colors">
                      <RotateCcw size={10} />
                    </div>
                    Secure Termination
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      <FakeCallModal isOpen={showFakeCall} onClose={() => setShowFakeCall(false)} />

      {/* Safety Check Modal */}
      <AnimatePresence>
        {showCheckInModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckInModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
              <motion.div 
              initial={{ y: "100%", opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: "100%", opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white border border-neutral-100 rounded-[60px] p-10 shadow-[0_-20px_60px_rgba(0,0,0,0.1)] space-y-10"
            >
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm">
                   <UserCheck size={40} />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-neutral-900 font-display">Safety Checkpoint</h3>
                <p className="text-neutral-400 text-[10px] font-black uppercase leading-relaxed tracking-widest max-w-[200px] mx-auto opacity-80 italic">Auto-send SOS if check-in fails.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[5, 15, 30, 45, 60, 120].map(m => (
                  <button 
                    key={m}
                    onClick={() => {
                       startCheckInTimer(m * 60);
                       setShowCheckInModal(false);
                    }}
                    className="p-6 bg-white border border-neutral-100 rounded-[28px] font-black text-sm text-neutral-900 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all active:scale-95 shadow-sm italic"
                  >
                    {m < 60 ? `${m}m` : `${m/60}h`}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowCheckInModal(false)}
                className="w-full py-4 text-neutral-400 font-black text-[10px] uppercase tracking-[0.5em] hover:text-neutral-900 transition-colors italic"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Emergency Services Prompt Modal */}
      <AnimatePresence>
        {showEmergencyPrompt && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEmergencyPrompt(false);
                localStorage.setItem('settings_success_message', 'SOS DISPATCHED SUCCESSFULLY - EMERGENCY CIRCLE ALERTER ACTIVE');
                if (setActiveTab) setActiveTab('settings');
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: "100%", opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white border border-neutral-100 rounded-[48px] p-8 shadow-[0_-20px_60px_rgba(0,0,0,0.1)] space-y-8 z-10 text-center"
            >
              <div className="space-y-3">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm animate-pulse">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-neutral-900 font-display">
                  CONTACT SERVICES?
                </h3>
                <p className="text-neutral-500 text-[10px] font-black uppercase leading-relaxed tracking-wider max-w-[240px] mx-auto opacity-90 italic">
                  Would you like to dial the Police, Fire Service, or Ambulance services directly?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowEmergencyPrompt(false);
                    setShowEmergencyNumbersList(true);
                  }}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-[24px] font-black uppercase tracking-wider text-xs transition-all active:scale-95 shadow-lg shadow-red-500/20 italic"
                >
                  Yes, Show Emergency Numbers
                </button>
                <button
                  onClick={() => {
                    setShowEmergencyPrompt(false);
                    localStorage.setItem('settings_success_message', 'SOS DISPATCHED SUCCESSFULLY - EMERGENCY CIRCLE ALERTER ACTIVE');
                    if (setActiveTab) setActiveTab('settings');
                  }}
                  className="w-full py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-[24px] font-black uppercase tracking-wider text-xs transition-all active:scale-95 italic border border-neutral-200"
                >
                  No, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Numbers Popup Modal */}
      <AnimatePresence>
        {showEmergencyNumbersList && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEmergencyNumbersList(false);
                localStorage.setItem('settings_success_message', 'SOS DISPATCHED SUCCESSFULLY - EMERGENCY CIRCLE ALERTER ACTIVE');
                if (setActiveTab) setActiveTab('settings');
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: "100%", opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white border border-neutral-100 rounded-[48px] p-8 shadow-[0_-20px_60px_rgba(0,0,0,0.1)] space-y-6 z-10"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-[18px] flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-sm">
                  <PhoneCall size={24} />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase text-neutral-900 font-display">
                  DIRECT DIAL CODES
                </h3>
                <p className="text-neutral-400 text-[9px] font-black uppercase leading-relaxed tracking-wider max-w-[200px] mx-auto opacity-80 italic">
                  Tap any number to call emergency services.
                </p>
              </div>

              <div className="space-y-3">
                {/* Police */}
                <motion.a 
                  href={`tel:${emergencyData.police}`}
                  whileHover={{ y: -2 }}
                  className="p-4 bg-white border-2 border-red-100 rounded-[24px] flex items-center justify-between group transition-all shadow-md shadow-red-500/5 hover:border-red-600/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic opacity-80 leading-none">POLICE SERVICE</p>
                      <p className="text-lg font-black italic text-neutral-900 tracking-tighter uppercase mt-1">{emergencyData.police}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-300 group-hover:text-red-600 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={2.5} />
                </motion.a>

                {/* Fire */}
                <motion.a 
                  href={`tel:${emergencyData.fire}`}
                  whileHover={{ y: -2 }}
                  className="p-4 bg-white border border-neutral-200 rounded-[24px] flex items-center justify-between group transition-all shadow-sm hover:border-amber-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shadow-inner">
                      <Flame size={20} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic opacity-80 leading-none">FIRE SERVICE</p>
                      <p className="text-lg font-black italic text-neutral-900 tracking-tighter uppercase mt-1">{emergencyData.fire}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-300 group-hover:text-amber-500 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={2.5} />
                </motion.a>

                {/* Ambulance */}
                <motion.a 
                  href={`tel:${emergencyData.ambulance}`}
                  whileHover={{ y: -2 }}
                  className="p-4 bg-white border border-neutral-200 rounded-[24px] flex items-center justify-between group transition-all shadow-sm hover:border-blue-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic opacity-80 leading-none">AMBULANCE SERVICES</p>
                      <p className="text-lg font-black italic text-neutral-900 tracking-tighter uppercase mt-1">{emergencyData.ambulance}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-300 group-hover:text-blue-600 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={2.5} />
                </motion.a>
              </div>

              <button
                onClick={() => {
                  setShowEmergencyNumbersList(false);
                  localStorage.setItem('settings_success_message', 'SOS DISPATCHED SUCCESSFULLY - EMERGENCY CIRCLE ALERTER ACTIVE');
                  if (setActiveTab) setActiveTab('settings');
                }}
                className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-900 text-white rounded-[20px] font-black text-[9px] uppercase tracking-[0.4em] transition-colors italic shadow-md"
              >
                Close & Go to Settings
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
