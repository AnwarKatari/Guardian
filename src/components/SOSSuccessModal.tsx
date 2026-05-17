import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, X } from 'lucide-react';
import { useSafety } from '../contexts/SafetyEngineContext';
import { useEffect } from 'react';

export function SOSSuccessModal() {
  const { lastSOSConfirmed, setLastSOSConfirmed } = useSafety();

  useEffect(() => {
    if (lastSOSConfirmed) {
      const timer = setTimeout(() => {
        setLastSOSConfirmed(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastSOSConfirmed, setLastSOSConfirmed]);

  return (
    <AnimatePresence>
      {lastSOSConfirmed && (
        <div className="fixed top-6 left-6 right-6 z-[1000] flex justify-center pointer-events-none">
          <motion.div 
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-neutral-900/95 backdrop-blur-2xl border border-emerald-500/50 rounded-[32px] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.2)] flex items-center justify-between pointer-events-auto overflow-hidden relative"
          >
            {/* Progress indicator */}
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_#10b981]"
            />

            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-[inset_0_0_15px_rgba(16,185,129,0.2)]">
                  <ShieldCheck size={28} className="stroke-[2.5px]" />
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-1 bg-emerald-500/20 blur-lg rounded-full -z-10"
                />
              </div>
              <div className="text-left space-y-0.5">
                <p className="text-white text-base font-black uppercase italic tracking-tighter leading-none">Signal Dispatched</p>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-emerald-500/80 font-mono text-[9px] uppercase tracking-[0.2em] font-black">Broadcast Success</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4 self-start">
              <button 
                onClick={() => setLastSOSConfirmed(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90 text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
