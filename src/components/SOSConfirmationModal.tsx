import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  X, 
  ChevronRight,
  Wifi,
  Signal,
  MapPin,
  Shield,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SOSConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  emergencyContactsCount: number;
}

export default function SOSConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  emergencyContactsCount 
}: SOSConfirmationModalProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSwipeProgress(0);
      setIsConfirming(false);
    }
  }, [isOpen]);

  const handleSwipe = (e: any, info: any) => {
    const progress = Math.min(Math.max(info.offset.x / 200, 0), 1);
    setSwipeProgress(progress);
    if (progress >= 0.95) {
      setIsConfirming(true);
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-red-950/40 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(220,38,38,0.3)]"
          >
            {/* Top Security Header */}
            <div className="bg-red-600/10 border-b border-red-500/20 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={12} className="text-red-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-red-500 italic">Critical Protocol</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-neutral-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-8 pt-10 space-y-8">
              {/* Alert Icon & Message */}
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-red-600 rounded-full blur-2xl"
                  />
                  <div className="relative w-20 h-20 bg-red-600 text-white rounded-[28px] flex items-center justify-center mx-auto shadow-[0_15px_40px_rgba(220,38,38,0.4)] border-4 border-red-500/50">
                    <AlertTriangle size={36} strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">Emergency SOS</h3>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] italic">Immediate Broadcast Mode</p>
                </div>
              </div>

              {/* Impact Indicators */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/5 rounded-[24px] border border-white/5 space-y-1">
                   <div className="flex items-center gap-2 text-blue-400">
                      <Signal size={10} />
                      <span className="text-[7px] font-black uppercase tracking-widest leading-none">Contacts</span>
                   </div>
                   <p className="text-lg font-black text-white italic leading-none">{emergencyContactsCount}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-[24px] border border-white/5 space-y-1">
                   <div className="flex items-center gap-2 text-emerald-400">
                      <MapPin size={10} />
                      <span className="text-[7px] font-black uppercase tracking-widest leading-none">Location</span>
                   </div>
                   <p className="text-lg font-black text-white italic leading-none">Synced</p>
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6">
                <p className="text-[9px] text-neutral-400 text-center uppercase tracking-widest leading-relaxed px-4">
                  Confirming this action will broadcast your <span className="text-red-500 font-black italic">live coordinates</span> and <span className="text-red-500 font-black italic">distress signal</span> to all selected contacts.
                </p>
              </div>

              {/* Slider Confirmation */}
              <div className="relative h-20 bg-neutral-800 rounded-[32px] p-2 border border-white/5 shadow-inner flex items-center group">
                 <motion.div 
                   drag="x"
                   dragConstraints={{ left: 0, right: 240 }}
                   dragElastic={0.05}
                   onDrag={handleSwipe}
                   onDragEnd={() => {
                     if (!isConfirming) {
                       setSwipeProgress(0);
                     }
                   }}
                   animate={!isConfirming && swipeProgress === 0 ? { x: 0 } : undefined}
                   className={cn(
                     "w-16 h-16 rounded-[24px] bg-red-600 text-white flex items-center justify-center shadow-[0_10px_25px_rgba(220,38,38,0.4)] cursor-grab active:cursor-grabbing relative z-30",
                     isConfirming && "opacity-0 pointer-events-none"
                   )}
                 >
                    <ChevronRight size={32} strokeWidth={3} className={cn(
                      "transition-transform",
                      swipeProgress > 0.5 ? "scale-110" : ""
                    )} />
                 </motion.div>

                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300" style={{ opacity: 1 - swipeProgress }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-500 italic ml-4">Slide to Confirm</p>
                 </div>

                 {/* Success Indicator during swipe */}
                 <div className="absolute inset-0 bg-red-600/20 rounded-[32px] overflow-hidden pointer-events-none">
                    <motion.div 
                      className="absolute inset-0 bg-red-600"
                      initial={{ x: "-100%" }}
                      animate={{ x: `${(swipeProgress * 100) - 100}%` }}
                    />
                 </div>
              </div>

              {/* Security Badges */}
              <div className="flex items-center justify-center gap-6 pb-2">
                <div className="flex items-center gap-1 opacity-20 hover:opacity-50 transition-opacity">
                  <Shield size={10} className="text-blue-500" />
                  <span className="text-[6px] font-black uppercase text-white tracking-widest italic">AES-256</span>
                </div>
                <div className="flex items-center gap-1 opacity-20 hover:opacity-50 transition-opacity">
                  <Zap size={10} className="text-amber-500" />
                  <span className="text-[6px] font-black uppercase text-white tracking-widest italic">Instant Relay</span>
                </div>
              </div>
            </div>

            {/* Scanning Line Overlay */}
             <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/20 shadow-[0_0_10px_rgba(220,38,38,0.3)] animate-[scan_4s_linear_infinite]" />
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
