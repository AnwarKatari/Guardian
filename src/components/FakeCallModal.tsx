import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, User, Volume2, Mic, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface FakeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FakeCallModal({ isOpen, onClose }: FakeCallModalProps) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStatus('ringing');
      setTimer(0);
      return;
    }

    const ringtone = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
    if (status === 'ringing') {
      ringtone.loop = true;
      ringtone.play().catch(() => {});
    }

    return () => {
      ringtone.pause();
    };
  }, [isOpen, status]);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-between py-20 px-6 font-sans select-none"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
            <User size={48} className="text-neutral-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-medium text-white">{profile?.fakeCallSettings?.callerName || "Mom"}</h2>
            <p className="text-neutral-400 text-sm font-medium">
              {status === 'ringing' ? 'Incoming call...' : 
               status === 'connected' ? formatTime(timer) : 'Call ended'}
            </p>
          </div>
        </div>

        {status === 'ringing' ? (
          <div className="w-full flex justify-around items-center mb-10">
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={onClose}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
              >
                <PhoneOff size={28} />
              </button>
              <span className="text-white text-xs font-medium">Decline</span>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={() => setStatus('connected')}
                className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all animate-bounce"
              >
                <Phone size={28} />
              </button>
              <span className="text-white text-xs font-medium">Accept</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-10">
               <div className="flex flex-col items-center gap-2">
                 <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
                   <Mic size={20} />
                 </div>
                 <span className="text-white/60 text-[10px]">Mute</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
                   <Volume2 size={20} />
                 </div>
                 <span className="text-white/60 text-[10px]">Speaker</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                 <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
                   <Video size={20} />
                 </div>
                 <span className="text-white/60 text-[10px]">Video</span>
               </div>
            </div>

            <div className="mb-10">
              <button 
                onClick={onClose}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
              >
                <PhoneOff size={28} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
