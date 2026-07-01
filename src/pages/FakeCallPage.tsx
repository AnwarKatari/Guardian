import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Grid, Volume2, Plus, User, ArrowLeft, Clock, Settings, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function FakeCallPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { profile, updateProfile } = useAuth();
  const [status, setStatus] = useState<'idle' | 'counting' | 'ringing' | 'active' | 'ended'>('idle');
  const [timer, setTimer] = useState(profile?.fakeCallSettings?.triggerDelay || 5);
  const [activeCallTime, setActiveCallTime] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (status === 'ringing') {
      // Start Tactical Ringtone
      const playRingtone = () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioRef.current = ctx;
          
          const playNote = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };

          const loop = () => {
            if (status !== 'ringing') return;
            const now = ctx.currentTime;
            // Tactical pattern: High-Low-High
            playNote(880, now, 0.2);
            playNote(440, now + 0.3, 0.2);
            playNote(880, now + 0.6, 0.4);
            
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          };

          const intervalId = setInterval(loop, 2000);
          loop();
          return intervalId;
        } catch (e) {
          console.warn("Audio Context failed:", e);
          return null;
        }
      };

      const ringtoneInterval = playRingtone();
      return () => {
        if (ringtoneInterval) clearInterval(ringtoneInterval);
        if (audioRef.current) audioRef.current.close();
      };
    }
  }, [status]);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'counting') {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setStatus('ringing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (status === 'active') {
      interval = setInterval(() => {
        setActiveCallTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startFakeCall = (immediate = false) => {
    if (immediate) {
      setStatus('ringing');
      setTimer(0);
    } else {
      setStatus('counting');
      setTimer(profile?.fakeCallSettings?.triggerDelay || 5);
    }
  };

  const answerCall = async () => {
    setStatus('active');
    if (profile && updateProfile) {
      const completed = profile.completedChallenges || [];
      if (!completed.includes('mock-test')) {
        try {
          await updateProfile({
            completedChallenges: [...completed, 'mock-test']
          });
        } catch (e) {
          console.error("Failed to unlock mock-test challenge:", e);
        }
      }
    }
  };

  const endCall = () => {
    setStatus('ended');
    setTimeout(() => {
      setActiveTab?.('home');
      setStatus('idle');
      setActiveCallTime(0);
    }, 2000);
  };

  if (status === 'idle') {
    return (
      <div className="h-full bg-neutral-50 p-6 flex flex-col pt-12 overflow-y-auto">
        <header className="mb-8">
          <button onClick={() => setActiveTab?.('home')} className="mb-4 p-2 -ml-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter italic">FAKE CALL</h1>
            <div className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-lg uppercase tracking-widest animate-pulse">Tactical</div>
          </div>
          <p className="text-neutral-500 text-sm mt-1">Discreetly exit uncomfortable situations with a simulated tactical broadcast.</p>
        </header>

        <main className="flex-1 space-y-6">
          <section className="bg-white rounded-[40px] p-8 border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-neutral-900 flex items-center justify-center text-white shadow-xl shadow-neutral-200">
                  <User size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Identity Profile</p>
                  <p className="font-bold text-neutral-900 text-lg">{profile?.fakeCallSettings?.callerName || "Security Dispatch"}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab?.('settings')}
                className="p-3 bg-neutral-50 text-neutral-400 rounded-2xl hover:bg-neutral-100 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={14} className="text-neutral-400" />
                  <span className="text-[10px] font-black uppercase text-neutral-400">Trigger</span>
                </div>
                <span className="text-lg font-black italic">{profile?.fakeCallSettings?.triggerDelay || 5}s</span>
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 size={14} className="text-neutral-400" />
                  <span className="text-[10px] font-black uppercase text-neutral-400">Voice</span>
                </div>
                <span className="text-lg font-black italic uppercase">{profile?.fakeCallSettings?.voiceType || "Neutral"}</span>
              </div>
            </div>
          </section>

          <div className="space-y-3">
            <button 
              onClick={() => startFakeCall(false)}
              className="w-full bg-red-600 text-white rounded-[40px] py-8 font-black text-2xl tracking-tighter flex flex-col items-center justify-center gap-1 shadow-2xl shadow-red-200 active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Phone size={28} className="fill-current group-hover:rotate-12 transition-transform" />
                INITIATE PROTOCOL
              </div>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest text-center">Execute extraction in {profile?.fakeCallSettings?.triggerDelay || 5}s</span>
            </button>

            <button 
              onClick={() => startFakeCall(true)}
              className="w-full bg-neutral-900 text-white rounded-[32px] py-5 font-black text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all group border border-white/10"
            >
              <Zap size={18} className="text-blue-500 animate-pulse" />
              IMMEDIATE BROADCAST
            </button>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
               <Grid size={20} />
            </div>
            <div className="space-y-0.5">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic leading-none">Extraction Method</p>
               <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight italic">SMS Delivery protocol verified by relay node alpha</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'counting') {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 space-y-8"
        >
          <div className="space-y-2">
            <p className="text-red-600 font-black uppercase tracking-[0.4em] text-[10px]">Transmission Pending</p>
            <div className="text-[10rem] leading-none font-black text-neutral-900 italic tracking-tighter tabular-nums drop-shadow-[0_0_50px_rgba(0,0,0,0.05)]">
              {timer}
            </div>
          </div>
          
          <button 
            onClick={() => setStatus('idle')}
            className="group flex flex-col items-center gap-3"
          >
            <div className="p-4 rounded-full border border-neutral-100 group-hover:bg-neutral-50 transition-colors">
              <PhoneOff size={24} className="text-neutral-400" />
            </div>
            <span className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">Abort Sequence</span>
          </button>
        </motion.div>

        {/* HUD Decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-pulse" />
          <div className="absolute bottom-10 left-10 text-[8px] text-neutral-900 font-mono text-left space-y-1">
            <p>CRYPTO_LINK_ESTABLISHED</p>
            <p>RELAY_NODE_ALPHA_READY</p>
            <p>SIGNAL_STRENGTH: OPTIMAL</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white text-neutral-900 flex flex-col p-8 pt-24 overflow-hidden">
      <AnimatePresence mode="wait">
        {status === 'ringing' ? (
          <motion.div 
            key="ringing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center relative z-10"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: ["0 0 0px rgba(220,38,38,0)", "0 0 50px rgba(220,38,38,0.1)", "0 0 0px rgba(220,38,38,0)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 rounded-[48px] bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-8 relative overflow-hidden"
            >
              <User size={64} className="text-neutral-200" />
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/5 to-transparent pointer-events-none" />
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black italic tracking-tighter text-neutral-900">{profile?.fakeCallSettings?.callerName || "Security Dispatch"}</h2>
              <p className="text-red-600 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Incoming Voice Overlay</p>
            </div>

            <div className="mt-auto w-full flex items-center justify-between gap-6 pb-12 max-w-sm">
              <button 
                onClick={endCall}
                className="flex-1 flex flex-col items-center gap-4 group"
              >
                <div className="w-20 h-20 rounded-[32px] bg-red-600 flex items-center justify-center shadow-xl shadow-red-100 active:scale-90 transition-all">
                  <PhoneOff size={32} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Decline</span>
              </button>
              
              <button 
                onClick={answerCall}
                className="flex-1 flex flex-col items-center gap-4 group"
              >
                <div className="w-20 h-20 rounded-[32px] bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-100 active:scale-90 transition-all">
                  <Phone size={32} className="fill-current text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Accept</span>
              </button>
            </div>
          </motion.div>
        ) : status === 'active' ? (
          <motion.div 
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center relative z-10"
          >
            <div className="w-24 h-24 rounded-[32px] bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-6">
              <User size={48} className="text-neutral-200" />
            </div>
            
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-3xl font-black italic tracking-tighter text-neutral-900">{profile?.fakeCallSettings?.callerName || "Security Dispatch"}</h2>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-neutral-400 font-mono text-xl tracking-wider leading-none">{formatTime(activeCallTime)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-y-12 gap-x-8 w-full max-w-sm px-4">
              {[
                { icon: MicOff, label: 'mute', active: false },
                { icon: Grid, label: 'keypad', active: false },
                { icon: Volume2, label: 'speaker', active: true },
                { icon: Plus, label: 'add call', active: false },
                { icon: Mic, label: 'video', active: false },
                { icon: User, label: 'contacts', active: false },
              ].map((btn, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <button className={cn(
                    "w-16 h-16 rounded-[24px] flex items-center justify-center transition-all active:scale-90 border",
                    btn.active ? "bg-neutral-900 text-white border-neutral-900 shadow-lg" : "bg-white text-neutral-400 border-neutral-100 hover:bg-neutral-50"
                  )}>
                    <btn.icon size={28} />
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{btn.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pb-12">
              <button 
                onClick={endCall}
                className="w-20 h-20 rounded-[32px] bg-red-600 flex items-center justify-center shadow-xl shadow-red-100 active:scale-95 transition-all"
              >
                <PhoneOff size={32} className="text-white" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-[32px] bg-neutral-50 flex items-center justify-center text-red-600 border border-neutral-100">
              <PhoneOff size={40} />
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-black italic tracking-tighter text-neutral-900">PROTOCOL ENDED</h2>
              <p className="text-neutral-400 font-black uppercase tracking-[0.2em] text-[10px]">Returning to Tactical Hub...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-100 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-neutral-100 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-[30vh] bg-gradient-to-t from-red-600/5 to-transparent" />
      </div>
    </div>
  );
}
