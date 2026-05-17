import { useEffect, useRef } from 'react';
import { useSafety } from '../contexts/SafetyEngineContext';
import { useAuth } from '../contexts/AuthContext';

export function VoiceSentinel() {
  const { profile } = useAuth();
  const { triggerSOS, addLog, setMicStatus } = useSafety();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const deniedRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      return;
    }

    const scheduleRestart = (delay: number) => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        if (!isListeningRef.current && profile?.voiceSentinelEnabled) {
          startRecognition();
        }
      }, delay);
    };

    if (!profile?.voiceSentinelEnabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        isListeningRef.current = false;
      }
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      deniedRef.current = false; // Reset if disabled
      return;
    }

    const startRecognition = () => {
      if (deniedRef.current || isListeningRef.current) return;
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          isListeningRef.current = true;
          setMicStatus('granted');
          addLog("SENTINEL: Audio monitoring initialized.");
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
          
          // Tactical distress keywords
          const keywords = ['help help', 'emergency emergency', 'dispatch dispatch', 'save me'];
          
          if (keywords.some(k => transcript.includes(k))) {
            addLog(`SENTINEL: Pattern detection [${transcript}] - Triggering SOS`);
            triggerSOS();
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech sentinel error:", event.error);
          isListeningRef.current = false;
          
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setMicStatus('denied');
            deniedRef.current = true;
            addLog("SENTINEL: Access denied. Check browser voice permissions.");
          } else if (event.error === 'network') {
            addLog("SENTINEL: Network connectivity issue.");
            scheduleRestart(5000);
          } else if (event.error === 'no-speech') {
            // Silently restart for no speech
            scheduleRestart(100);
          } else if (event.error === 'aborted') {
            // Usually happens when the engine is interrupted
            addLog("SENTINEL: Protocol interrupted. Re-synchronizing...");
            scheduleRestart(500);
          } else {
            // Attempt restart on other errors
            scheduleRestart(2000);
          }
        };

        recognition.onend = () => {
          isListeningRef.current = false;
          // Auto-restart if still enabled and not already starting
          if (profile?.voiceSentinelEnabled) {
            scheduleRestart(100);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error("Sentinel init failed:", e);
        isListeningRef.current = false;
        scheduleRestart(2000);
      }
    };

    if (!isListeningRef.current) {
      startRecognition();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        isListeningRef.current = false;
      }
    };
  }, [profile?.voiceSentinelEnabled, triggerSOS, addLog]);

  return null; // Background worker
}
