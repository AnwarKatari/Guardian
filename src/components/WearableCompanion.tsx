import { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Watch, 
  Wifi, 
  WifiOff, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Play, 
  X, 
  Sparkles,
  Info,
  Radio,
  EyeOff,
  Bell,
  Heart,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSafety } from '../contexts/SafetyEngineContext';
import { cn } from '../lib/utils';

interface WearableCompanionProps {
  onClose: () => void;
}

type WatchType = 'apple' | 'wearos' | 'garmin';
type GestureType = 'crown_triple' | 'clench_double' | 'back_double';

export default function WearableCompanion({ onClose }: WearableCompanionProps) {
  const { triggerSOS, addLog } = useSafety();

  // Settings states
  const [watchType, setWatchType] = useState<WatchType>('apple');
  const [gestureType, setGestureType] = useState<GestureType>('crown_triple');
  const [isPaired, setIsPaired] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(94);
  const [heartRate, setHeartRate] = useState(72);
  
  // Watch screen states
  const [watchScreenState, setWatchScreenState] = useState<'normal' | 'counting' | 'discreet_counting' | 'triggered' | 'cancelled'>('normal');
  const [watchCountdown, setWatchCountdown] = useState(5);
  const [activeCycle, setActiveCycle] = useState(0);

  // Timers and audio
  const countdownIntervalRef = useRef<any>(null);
  const heartRateIntervalRef = useRef<any>(null);

  // Heartbeat rate pulse simulator
  useEffect(() => {
    heartRateIntervalRef.current = setInterval(() => {
      setHeartRate(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const target = watchScreenState === 'normal' ? 72 : 118; // higher during stress
        const next = prev + delta;
        return next > target + 10 ? target : next < target - 10 ? target : next;
      });
    }, 2000);

    return () => clearInterval(heartRateIntervalRef.current);
  }, [watchScreenState]);

  // Audio feedback for watch clicks
  const playWatchBeep = (freq = 800, duration = 0.1) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio blocked or unsupported
    }
  };

  // Watch countdown logic
  useEffect(() => {
    if (watchScreenState === 'counting' || watchScreenState === 'discreet_counting') {
      setWatchCountdown(5);
      playWatchBeep(1000, 0.15);
      
      countdownIntervalRef.current = setInterval(() => {
        setWatchCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            // Fire full SOS on main application
            handleTriggerSOSFromWatch();
            return 0;
          }
          // Beep at each second
          playWatchBeep(1000, 0.1);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [watchScreenState]);

  const handleTriggerSOSFromWatch = async () => {
    setWatchScreenState('triggered');
    addLog(`WEARABLE: SOS command received from ${watchType.toUpperCase()} watch link.`);
    addLog(`WEARABLE: Discreet Gesture verified (${gestureType.toUpperCase()}).`);
    
    // Fire real SOS
    try {
      await triggerSOS();
    } catch (e) {
      console.error(e);
    }
  };

  const startManualWatchTrigger = () => {
    if (!isPaired) {
      alert("DEVICE PAIRING ERROR: Cannot transmit distress packet while Bluetooth link is offline.");
      return;
    }
    setWatchScreenState('counting');
  };

  const startDiscreetWatchTrigger = () => {
    if (!isPaired) {
      alert("DEVICE PAIRING ERROR: Cannot transmit discreet trigger packet while Bluetooth link is offline.");
      return;
    }
    addLog(`WEARABLE: Simulated crown triple-press gesture received. Initializing silent watch backup sequence.`);
    setWatchScreenState('discreet_counting');
  };

  const cancelWatchTrigger = () => {
    setWatchScreenState('cancelled');
    addLog("WEARABLE: Distress transmission aborted from wristwatch panel.");
    playWatchBeep(600, 0.3);
    setTimeout(() => {
      setWatchScreenState('normal');
    }, 2000);
  };

  const togglePairState = () => {
    setIsPaired(!isPaired);
    if (!isPaired) {
      addLog(`WEARABLE: Connected to ${watchType.toUpperCase()} Smartwatch via Bluetooth Low Energy.`);
    } else {
      addLog(`WEARABLE_WARN: Watch telemetry link disconnected.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm"
      />

      {/* Setup Interface Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[40px] border border-neutral-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] overflow-hidden z-10 flex flex-col md:flex-row h-full max-h-[85vh] md:max-h-[680px]"
      >
        {/* LEFT COLUMN: WATCH SIMULATION CONTROL DECK */}
        <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar border-r border-neutral-50 text-neutral-900">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none flex items-center gap-1.5 italic">
                <Watch size={10} className="animate-spin" /> Hardware Integration
              </span>
              <h3 className="text-xl font-display font-black tracking-tighter uppercase italic text-neutral-900 leading-none">Smartwatch Link</h3>
            </div>
            
            {/* Close */}
            <button 
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Bluetooth Pair Switcher */}
          <div className="p-4 rounded-3xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl border flex items-center justify-center transition-all",
                isPaired ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-neutral-100 border-neutral-200 text-neutral-400"
              )}>
                {isPaired ? <Radio size={16} className="animate-pulse" /> : <WifiOff size={16} />}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-wider italic">
                  {isPaired ? "Watch Link: Connected" : "Watch Link: Disconnected"}
                </p>
                <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">
                  {isPaired ? "BLUETOOTH LOW ENERGY // SIGNAL: 98%" : "NO SIGNAL BROADCASTING"}
                </p>
              </div>
            </div>

            <button 
              onClick={togglePairState}
              className={cn(
                "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all italic",
                isPaired 
                  ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-350 border-neutral-300" 
                  : "bg-blue-600 text-white hover:bg-blue-500 border-blue-500"
              )}
            >
              {isPaired ? "Disconnect" : "Connect"}
            </button>
          </div>

          {/* Selection settings */}
          <div className="space-y-4">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.3em] italic ml-1">Companion Setup</p>
            
            {/* Watch Type selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest ml-1">Select Smartwatch Brand</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'apple', label: 'Apple Watch', sub: 'WatchOS' },
                  { id: 'wearos', label: 'Pixel / Galaxy', sub: 'Wear OS' },
                  { id: 'garmin', label: 'Garmin', sub: 'Tactical Connect' }
                ].map(watch => (
                  <button
                    key={watch.id}
                    onClick={() => {
                      setWatchType(watch.id as WatchType);
                      addLog(`WEARABLE: Switched watch target to ${watch.label} layout.`);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95",
                      watchType === watch.id 
                        ? "bg-blue-600/5 border-blue-600 text-blue-600" 
                        : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
                    )}
                  >
                    <Watch size={14} />
                    <span className="text-[9px] font-black uppercase tracking-wide leading-none">{watch.label}</span>
                    <span className="text-[6px] font-bold uppercase tracking-widest opacity-60">{watch.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Discreet Gesture selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest ml-1">Discreet Panic Gesture Setup</label>
              <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider leading-relaxed ml-1 italic">
                Choose a gesture that activates the SOS countdown silently on your wrist without lighting up the watch screen or needing your phone.
              </p>
              <div className="space-y-2">
                {[
                  { id: 'crown_triple', label: 'Digital Crown Triple-Press', desc: 'Slightly press crown three times in rapid succession.' },
                  { id: 'clench_double', label: 'Double-Clench Wrist Gesture', desc: 'Clench your fist twice to trigger using tendon sensors.' },
                  { id: 'back_double', label: 'Double-Tap Watch Chassis', desc: 'Tap the back or sides of the watch casing twice.' }
                ].map(gesture => (
                  <button
                    key={gesture.id}
                    onClick={() => {
                      setGestureType(gesture.id as GestureType);
                      addLog(`WEARABLE: Saved default discreet action gesture: ${gesture.label}`);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left flex items-start justify-between gap-4 transition-all active:scale-98",
                      gestureType === gesture.id 
                        ? "bg-neutral-900 border-neutral-900 text-white" 
                        : "bg-white border-neutral-150 text-neutral-500 hover:border-neutral-200"
                    )}
                  >
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase tracking-wide leading-none">{gesture.label}</p>
                      <p className={cn("text-[8px] leading-relaxed font-bold uppercase", gestureType === gesture.id ? "text-neutral-400" : "text-neutral-400")}>
                        {gesture.desc}
                      </p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                      gestureType === gesture.id ? "border-white bg-blue-600" : "border-neutral-300"
                    )}>
                      {gestureType === gesture.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Discreet simulation triggers */}
          <div className="space-y-3">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.3em] italic ml-1">Hardware Simulator triggers</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startManualWatchTrigger}
                className="py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 italic flex items-center justify-center gap-2"
              >
                <Watch size={12} /> TAP SOS WATCH BUTTON
              </button>
              
              <button
                onClick={startDiscreetWatchTrigger}
                className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 italic flex items-center justify-center gap-2"
              >
                <EyeOff size={12} /> SIMULATE PANIC GESTURE
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE VISUAL WATCH FRAMES */}
        <div className="flex-1 p-8 bg-neutral-950 flex flex-col items-center justify-center gap-6 relative min-h-[380px] md:min-h-0 border-t md:border-t-0 border-neutral-800">
          {/* HUD Tech Grid Backplane */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          
          <p className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.3em] italic absolute top-6">Active Smartwatch telemetry</p>

          {/* WATCH CASE FRAME CONTAINER */}
          <div className="relative">
            {/* Apple Watch (Square rounded chassis) */}
            {watchType === 'apple' && (
              <div className="w-56 h-64 bg-neutral-900 border-4 border-neutral-750 rounded-[50px] shadow-[0_25px_50px_rgba(0,0,0,0.5)] p-4 relative flex items-center justify-center select-none ring-8 ring-neutral-850">
                {/* Crown side element */}
                <div className="absolute -right-3 top-16 w-3 h-12 bg-neutral-800 border border-neutral-750 rounded-r-md cursor-pointer" onClick={startDiscreetWatchTrigger} title="Click to trigger Crown Triple-Press" />
                <div className="absolute -right-2 top-32 w-2 h-8 bg-neutral-800 border border-neutral-750 rounded-r-sm" />
                
                {/* Screen bezel */}
                <div className="w-full h-full bg-[#030303] rounded-[38px] border-2 border-neutral-850 overflow-hidden relative p-3 flex flex-col justify-between">
                  <WatchScreen watchType={watchType} screenState={watchScreenState} countdown={watchCountdown} battery={batteryLevel} heartRate={heartRate} onCancel={cancelWatchTrigger} onTrigger={startManualWatchTrigger} />
                </div>
              </div>
            )}

            {/* Wear OS (Circular bezel case) */}
            {watchType === 'wearos' && (
              <div className="w-60 h-60 bg-neutral-900 border-4 border-neutral-750 rounded-full shadow-[0_25px_50px_rgba(0,0,0,0.5)] p-4 relative flex items-center justify-center select-none ring-8 ring-neutral-850">
                {/* Side Buttons */}
                <div className="absolute -right-2 top-20 w-2.5 h-6 bg-neutral-800 border border-neutral-700 rounded-r-sm cursor-pointer" onClick={startDiscreetWatchTrigger} />
                <div className="absolute -right-2 top-32 w-2.5 h-6 bg-neutral-800 border border-neutral-700 rounded-r-sm" />
                
                {/* Round Bezel text accents */}
                <div className="absolute inset-2 border border-neutral-800 rounded-full pointer-events-none" />

                {/* Round Screen */}
                <div className="w-full h-full bg-[#030303] rounded-full border-2 border-neutral-850 overflow-hidden relative p-5 flex flex-col justify-between items-center text-center">
                  <WatchScreen watchType={watchType} screenState={watchScreenState} countdown={watchCountdown} battery={batteryLevel} heartRate={heartRate} onCancel={cancelWatchTrigger} onTrigger={startManualWatchTrigger} />
                </div>
              </div>
            )}

            {/* Garmin (Tactical Military rugged circle) */}
            {watchType === 'garmin' && (
              <div className="w-60 h-60 bg-neutral-900 border-8 border-neutral-800 rounded-full shadow-[0_25px_50px_rgba(0,0,0,0.5)] p-4 relative flex items-center justify-center select-none ring-8 ring-neutral-850">
                {/* Rugged screws / markers */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[6px] font-black text-neutral-600 font-mono tracking-widest">GARMIN</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[5px] font-black text-neutral-600 font-mono">5X PRO</div>
                
                {/* Tact buttons left */}
                <div className="absolute -left-2 top-16 w-2 h-4 bg-neutral-850 border border-neutral-700 rounded-l-sm" />
                <div className="absolute -left-2 top-28 w-2 h-4 bg-neutral-850 border border-neutral-700 rounded-l-sm" />
                <div className="absolute -left-2 top-40 w-2 h-4 bg-neutral-850 border border-neutral-700 rounded-l-sm" />
                
                {/* Tact buttons right */}
                <div className="absolute -right-2 top-20 w-2 h-4 bg-neutral-850 border border-neutral-700 rounded-r-sm cursor-pointer" onClick={startDiscreetWatchTrigger} />
                <div className="absolute -right-2 top-36 w-2 h-4 bg-neutral-850 border border-neutral-700 rounded-r-sm" />

                {/* Tactical Bezel Compass notches */}
                <div className="absolute inset-1 border-2 border-neutral-750 rounded-full pointer-events-none opacity-30" />

                {/* Garmin Screen */}
                <div className="w-full h-full bg-[#010603] rounded-full border-2 border-neutral-800 overflow-hidden relative p-5 flex flex-col justify-between items-center text-center">
                  <WatchScreen watchType={watchType} screenState={watchScreenState} countdown={watchCountdown} battery={batteryLevel} heartRate={heartRate} onCancel={cancelWatchTrigger} onTrigger={startManualWatchTrigger} />
                </div>
              </div>
            )}
          </div>

          {/* Connection summary line below watch */}
          <div className="text-center space-y-1">
            <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic">Mock active hardware channel</p>
            <p className="text-[10px] font-black text-white uppercase italic tracking-wider flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", isPaired ? "bg-emerald-500 animate-pulse" : "bg-red-500")}></span>
              {isPaired ? `${watchType.toUpperCase()} COMPANION v1.4 // CONNECTED` : "BLE DISCONNECT"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Watch Screen Layout Renderer Helper
const WatchScreen = ({ 
  watchType, 
  screenState, 
  countdown, 
  battery, 
  heartRate, 
  onCancel, 
  onTrigger 
}: { 
  watchType: WatchType; 
  screenState: string; 
  countdown: number; 
  battery: number; 
  heartRate: number; 
  onCancel: () => void; 
  onTrigger: () => void; 
}) => {
  const isCircle = watchType === 'wearos' || watchType === 'garmin';

  // State 1: DISCREET BLOCKED SCREEN (Completely black watch, representing discreet panic mode)
  if (screenState === 'discreet_counting') {
    return (
      <div 
        className="absolute inset-0 bg-[#000000] cursor-pointer flex flex-col items-center justify-center p-4 text-center z-20"
        onClick={onCancel}
        title="Double-tap/Click screen to ABORT PANIC SIGNAL"
      >
        {/* Subtle, barely-visible heartbeat visual pulse so the user knows it's active */}
        <div className="w-2 h-2 bg-red-800/10 rounded-full animate-ping mb-2" />
        <span className="text-[4px] font-black text-neutral-900 tracking-widest uppercase italic">PANIC PROTOCOL RUNNING SILENTLY</span>
        <span className="text-[6px] text-neutral-900 font-black uppercase mt-1">TAP Chassis to abort ({countdown}s)</span>
      </div>
    );
  }

  // State 2: INITIATED SOS COUNTDOWN
  if (screenState === 'counting') {
    return (
      <div className="absolute inset-0 bg-red-950 flex flex-col justify-between p-4 text-center z-10 select-none">
        <div className="space-y-1 pt-4">
          <span className="text-[7px] font-black text-red-500 tracking-widest uppercase block italic leading-none animate-pulse">SOS BROADCASTING</span>
          <p className="text-[6px] text-neutral-400 font-bold uppercase tracking-widest">SENDING RECON PACKET...</p>
        </div>

        {/* Giant countdown digit */}
        <div className="text-5xl font-black italic tracking-tighter text-white tabular-nums my-1">
          {countdown}
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="w-full py-2 bg-white text-red-600 rounded-xl font-black text-[7px] uppercase tracking-widest italic hover:bg-neutral-100 active:scale-95 transition-all mb-2"
        >
          TAP TO CANCEL
        </button>
      </div>
    );
  }

  // State 3: SOS FULLY DISPATCHED
  if (screenState === 'triggered') {
    return (
      <div className="absolute inset-0 bg-[#070000] flex flex-col items-center justify-center p-4 text-center z-10 animate-pulse select-none">
        <div className="p-2.5 bg-red-600 text-white rounded-full mb-3">
          <AlertTriangle size={24} className="animate-bounce" />
        </div>
        <h5 className="text-[9px] font-black uppercase text-red-500 tracking-wider">SOS ACTIVATED</h5>
        <p className="text-[6px] text-neutral-400 font-bold uppercase mt-1 leading-relaxed">TELEMETRY SYNCED WITH CLOUD DISPATCH SYSTEMS.</p>
        <button 
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="mt-3 px-4 py-1.5 bg-neutral-900 text-neutral-400 border border-neutral-800 rounded-lg text-[6px] font-black uppercase tracking-widest italic hover:text-white"
        >
          RESET WATCH
        </button>
      </div>
    );
  }

  // State 4: SOS CANCELLED OK
  if (screenState === 'cancelled') {
    return (
      <div className="absolute inset-0 bg-[#000501] flex flex-col items-center justify-center p-4 text-center z-10 select-none">
        <div className="p-2.5 bg-emerald-600 text-white rounded-full mb-3">
          <CheckCircle2 size={24} />
        </div>
        <h5 className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">SIGNAL ABORTED</h5>
        <p className="text-[6px] text-neutral-400 font-bold uppercase mt-1">DISTRESS CANCELLED SUCCESS.</p>
      </div>
    );
  }

  // State 5: NORMAL WEARABLE HUB WATCHFACE
  return (
    <>
      {/* Top row */}
      <div className={cn("flex justify-between items-center w-full", isCircle && "justify-center gap-6 pt-2")}>
        <span className="text-[7px] font-mono font-black text-neutral-400 uppercase tracking-widest">{battery}% 🔋</span>
        <span className="text-[7px] font-mono font-black text-red-500 uppercase tracking-widest animate-pulse flex items-center gap-0.5">
          💓 {heartRate}
        </span>
      </div>

      {/* Clock / Main body */}
      <div className="text-center space-y-0.5">
        <span className="text-[6px] font-black text-neutral-500 uppercase tracking-[0.25em] leading-none block italic">GUARDIAN SAT-LINK</span>
        <h4 className="text-2xl font-black tracking-tight italic text-neutral-200 uppercase leading-none font-sans">
          {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </h4>
        <span className="text-[5px] font-black text-blue-500 uppercase tracking-widest leading-none block">GPS SECURE SYNC</span>
      </div>

      {/* Giant Red Tactical touch SOS button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => { e.stopPropagation(); onTrigger(); }}
        className={cn(
          "w-16 h-16 rounded-full bg-gradient-to-tr from-red-700 to-red-500 text-white border-2 border-red-400 shadow-lg shadow-red-600/30 flex items-center justify-center flex-col relative overflow-hidden group/sos mx-auto",
          isCircle && "mb-3"
        )}
      >
        <div className="absolute inset-0 bg-red-400/20 rounded-full animate-ping scale-110 pointer-events-none" />
        <AlertTriangle size={16} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" />
        <span className="text-[6px] font-black uppercase tracking-widest block leading-none mt-0.5 italic">TAP SOS</span>
      </motion.button>
    </>
  );
};
