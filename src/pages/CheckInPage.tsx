import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Shield,
  Play,
  Square,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertStatus } from '../types';

export default function CheckInPage() {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [duration, setDuration] = useState(15); // in minutes
  const [showFinish, setShowFinish] = useState(false);
  const timerRef = useRef<any>(null);
  const { user } = useAuth();
  const { location } = useLocation();

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            triggerCheckInAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const startCheckIn = async () => {
    setTimeLeft(duration * 60);
    setIsActive(true);
    
    // Save to database
    if (user) {
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: user.uid,
          event: 'CHECK_IN_STARTED',
          message: `User started a ${duration} minute safety check-in timer.`,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to log check-in start:", err);
      }
    }
  };

  const stopCheckIn = async () => {
    setIsActive(false);
    setShowFinish(true);
    
    // Save to database
    if (user) {
      try {
        await addDoc(collection(db, 'system_logs'), {
          userId: user.uid,
          event: 'CHECK_IN_FINISHED',
          message: `User completed their safety check-in successfully.`,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to log check-in finish:", err);
      }
    }
  };

  const triggerCheckInAlert = async () => {
    setIsActive(false);
    if (!user || !location) return;

    try {
      await addDoc(collection(db, 'alerts'), {
        senderId: user.uid,
        senderName: user.displayName,
        location: {
          lat: location.latitude,
          lng: location.longitude
        },
        timestamp: serverTimestamp(),
        status: AlertStatus.ACTIVE,
        message: "SYSTEM ALERT: User missed a scheduled safety check-in."
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="p-6 space-y-8 pb-32 h-full flex flex-col bg-[#050505] text-white font-mono relative overflow-hidden">
      {/* Background HUD Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/20 animate-pulse pointer-events-none" />

      <header className="space-y-4 relative z-10 pt-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">SAFE_CHECK</h2>
        </div>
        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.34em] leading-relaxed max-w-sm">
          Set temporal safety anchors. Failure to verify status will trigger localized SOS broadcast to established nodes.
        </p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12 relative z-10">
        {!isActive ? (
          <div className="w-full space-y-12">
            <div className="flex flex-col items-center gap-10">
              <div className="relative group">
                {/* Orbital Rings */}
                <div className="absolute inset-0 -m-8 border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-0 -m-4 border border-blue-600/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                
                <div className="w-56 h-56 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative shadow-[0_0_50px_rgba(37,99,235,0.1)] group-hover:border-blue-600/30 transition-all">
                  <Clock size={72} className="text-blue-600/20 group-hover:text-blue-600/40 transition-colors" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-5xl font-black text-white italic tracking-tighter">{duration}</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">MINS</p>
                  </div>
                </div>
              </div>
              
              <div className="w-full max-w-xs space-y-4">
                <div className="flex justify-between px-2">
                   <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest italic">1m_Limit</span>
                   <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest italic">120m_Limit</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600 border border-white/5"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startCheckIn}
              className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black italic tracking-[0.2em] uppercase shadow-[0_0_40px_rgba(37,99,235,0.3)] flex items-center justify-center gap-4 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <Play size={20} fill="currentColor" strokeWidth={3} className="relative z-10" />
              <span className="relative z-10 text-xl">INITIATE_TIMER</span>
            </motion.button>
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full space-y-16 flex flex-col items-center"
          >
            <div className="relative">
              {/* Pulse Rings */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0, 0.1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-blue-600 rounded-full blur-2xl"
              />
              
              <div className="relative w-72 h-72 rounded-[60px] bg-black border border-blue-600/30 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.2)] overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/40 animate-pulse" />
                <span className="text-7xl font-black text-white italic tracking-tighter tabular-nums shadow-blue-500/50 drop-shadow-2xl">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mt-4 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                   COUNTDOWN_ACTIVE
                </span>
                
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              </div>
              
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-4 rounded-[20px] shadow-[0_0_30px_rgba(16,185,129,0.4)] border-2 border-[#050505] animate-bounce">
                <Shield size={24} />
              </div>
            </div>

            <div className="w-full space-y-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={stopCheckIn}
                className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black italic tracking-[0.2em] uppercase shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center justify-center gap-4 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <CheckCircle2 size={24} strokeWidth={3} className="relative z-10" />
                <span className="relative z-10 text-xl tracking-tighter italic font-black uppercase">VERIFY_SAFE_STATUS</span>
              </motion.button>
              
              <div className="flex items-center gap-3 justify-center px-8 opacity-40">
                 <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                 <p className="text-center text-[9px] text-neutral-300 font-bold uppercase tracking-[0.2em] leading-relaxed">
                   CRITICAL_FAILURE_TO_CHECK_IN_TRIGGERS_CIRCLE_DEPLOYMENT
                 </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showFinish && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="text-center space-y-10 max-w-sm"
            >
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 bg-emerald-500 rounded-[40px] blur-3xl opacity-20 animate-pulse" />
                <div className="w-32 h-32 bg-emerald-600/10 text-emerald-500 rounded-[40px] border border-emerald-500/20 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 size={56} strokeWidth={2.5} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black italic tracking-tighter uppercase text-white shadow-emerald-500/20">SAFE_SYNC_COMPLETED</h3>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed opacity-60 px-4">
                  Temporal safety protocols successfully terminated. Trusted nodes have been informed of your status.
                </p>
              </div>
              <button
                onClick={() => setShowFinish(false)}
                className="w-full py-5 bg-white text-black rounded-[32px] font-black italic tracking-[0.2em] uppercase shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all text-xl"
              >
                DISMISS_HUD
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
