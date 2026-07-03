import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Navigation, 
  Activity, 
  Flame, 
  Stethoscope, 
  ArrowLeft,
  ChevronRight,
  Crosshair,
  Signal,
  Wifi,
  Battery,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Lock,
  Radio,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Trash,
  Shield,
  Users
} from 'lucide-react';
import SOSConfirmationModal from '../components/SOSConfirmationModal';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafety } from '../contexts/SafetyEngineContext';
import { getEmergencyNumbers } from '../constants/emergencyMatrix';
import { cn } from '../lib/utils';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

export default function EmergencyHub({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { location } = useLocation();
  const { profile, user } = useAuth();
  const { triggerSOS, addLog, systemLogs } = useSafety();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentSOS, setRecentSOS] = useState<any[]>([]);
  const [isConfirmingSOS, setIsConfirmingSOS] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sos_history'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(3)
    );
    return onSnapshot(q, (snapshot) => {
      setRecentSOS(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  const handleBroadcast = async () => {
    setIsConfirmingSOS(false);
    addLog("System: Initializing emergency broadcast...");
    const success = await triggerSOS();
    if (!success) {
      alert("Error: Emergency protocol could not be established. Please check your emergency circle settings.");
      setActiveTab?.('settings');
    }
  };

  const emergency = getEmergencyNumbers(profile?.countryCode || 'GH');

  const safetyStats = [
    { label: 'Signal', icon: Signal, value: '98%', color: 'text-emerald-500' },
    { label: 'Network', icon: Wifi, value: 'encrypted', color: 'text-blue-500' },
    { label: 'Power', icon: Battery, value: '84%', color: 'text-amber-500' },
    { label: 'GPS', icon: Crosshair, value: '±3m', color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col p-4 sm:p-6 pt-12 font-sans relative overflow-y-auto pb-40 custom-scrollbar">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.01)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-blue-100/20 blur-[150px] pointer-events-none" />

      {/* HUD Header */}
      <header className="mb-10 flex items-center justify-between border-b border-neutral-200 pb-8 relative z-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab?.('sos')}
            className="p-3 rounded-2xl bg-white border border-neutral-100 text-neutral-400 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tighter italic flex items-center gap-3 text-neutral-900 leading-none">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
              Emergency Hub
              <span className="text-[10px] bg-neutral-900 text-white font-black px-3 py-1 rounded-full not-italic tracking-normal ml-2 shadow-lg">v4.9.0</span>
            </h1>
            <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.4em] italic leading-none">REGION: {profile?.countryCode || 'GLOBAL'} // SYSTEMS_ACTIVE</p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[9px] font-black text-neutral-300 uppercase tracking-widest leading-none mb-1">LOCAL_TIME</p>
          <p className="text-sm font-black text-blue-600 tabular-nums italic drop-shadow-sm">{currentTime.toLocaleTimeString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <div className="lg:col-span-8 space-y-6">
          {/* Advanced Telemetry Bar */}
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
            {safetyStats.map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-neutral-100 rounded-2xl p-4 text-center group hover:border-blue-200 transition-all shadow-sm"
              >
                <stat.icon className={cn("mx-auto mb-2 transition-all w-5 h-5", stat.color)} />
                <p className="text-[8px] uppercase font-black text-neutral-400 tracking-widest leading-none mb-1 italic">{stat.label}</p>
                <p className={cn("text-xs font-black tracking-tight", stat.color)}>{stat.value}</p>
              </motion.div>
            ))}
          </div>
          {/* Geolocation Section */}
          <section className="bg-white border border-neutral-200 rounded-[40px] p-8 relative overflow-hidden group shadow-2xl shadow-blue-500/10 hover:border-blue-300 transition-all">
            <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 rotate-12 group-hover:rotate-0">
              <Navigation size={200} strokeWidth={1} className="text-blue-600" />
            </div>
            
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-blue-600 text-white rounded-[20px] shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-transform">
                   <MapPin size={24} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-[0.3em] italic leading-none">Location_Services</h3>
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.2em] italic">Real-time coordinate tracking</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest italic animate-pulse">
                  <Signal size={10} />
                  STATUS_ACTIVE
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-neutral-50 rounded-[28px] border border-neutral-100 group-hover:bg-white group-hover:shadow-xl transition-all duration-500 flex flex-col justify-between h-32">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">Latitude</p>
                <p className="text-4xl font-black tracking-tighter text-blue-600 italic leading-none drop-shadow-sm">
                  {location?.latitude.toFixed(6) || '---'}°
                </p>
              </div>
              <div className="p-6 bg-neutral-50 rounded-[28px] border border-neutral-100 group-hover:bg-white group-hover:shadow-xl transition-all duration-500 flex flex-col justify-between h-32">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">Longitude</p>
                <p className="text-4xl font-black tracking-tighter text-blue-600 italic leading-none drop-shadow-sm">
                  {location?.longitude.toFixed(6) || '---'}°
                </p>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between">
               <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-blue-50 text-[10px] font-black flex items-center justify-center text-blue-600 shadow-xl relative overflow-hidden group/sat">
                      <div className="absolute inset-0 bg-blue-600/10 translate-y-full group-hover/sat:translate-y-0 transition-transform" />
                      GPS
                   </div>
                 ))}
               </div>
               <div className="text-right">
                  <p className="text-[9px] text-neutral-300 font-bold uppercase italic tracking-[0.3em]">Accuracy: Optimal</p>
                  <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest italic">SECURE_LOCATION_DATA</p>
               </div>
            </div>
          </section>

          {/* Trusted Circle Monitoring */}
          <section className="bg-white border border-neutral-200 rounded-[40px] p-8 shadow-2xl shadow-blue-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <Users size={140} className="text-blue-600" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-blue-600 text-white rounded-[20px] shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-transform">
                   <Phone size={24} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-[0.3em] italic leading-none">Emergency Circle</h3>
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.2em] italic">Verified trusted responders</p>
                 </div>
               </div>
               <div className="px-5 py-2 bg-neutral-50 border border-neutral-100 rounded-2xl">
                 <p className="text-[10px] font-black text-neutral-900 uppercase tracking-widest italic">STATUS: <span className="text-emerald-600 uppercase tracking-[0.1em]">{profile?.emergencyContacts?.length || 0} SECURED</span></p>
               </div>
            </div>

            <div className="space-y-4">
              {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                profile.emergencyContacts.map((contact: any) => (
                  <motion.a
                    key={contact.id}
                    href={`tel:${contact.phone}`}
                    whileHover={{ scale: 1.01, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-5 bg-neutral-50 rounded-[28px] border border-neutral-100 flex items-center justify-between group/contact hover:border-blue-600/30 transition-all hover:bg-white hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 italic border border-neutral-100 group-hover/contact:bg-blue-600 group-hover/contact:text-white transition-all shadow-sm">
                         {contact.name[0].toUpperCase()}
                       </div>
                       <div className="space-y-0.5">
                         <p className="text-[10px] font-black text-neutral-900 uppercase italic tracking-tight">{contact.name}</p>
                         <div className="flex items-center gap-2">
                            <Signal size={8} className="text-emerald-500" />
                            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest group-hover/contact:text-blue-600 transition-colors underline decoration-blue-600/10 underline-offset-2">{contact.phone}</p>
                         </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 opacity-0 group-hover/contact:opacity-100 transition-opacity">
                          <Phone size={14} />
                       </div>
                       <ChevronRight size={14} className="text-neutral-200 group-hover/contact:text-blue-600 transition-all" />
                    </div>
                  </motion.a>
                ))
              ) : (
                <div className="p-8 text-center bg-neutral-50 rounded-[32px] border border-dashed border-neutral-200">
                  <p className="text-[8px] font-black text-neutral-300 uppercase tracking-[0.4em] italic">No trusted contacts initialized</p>
                </div>
              )}
            </div>
          </section>

          {/* Regional Threat Analysis */}
          <section className="bg-neutral-900 rounded-[40px] p-10 text-white relative overflow-hidden group border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 p-16 opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-1000 scale-125">
              <ShieldAlert size={240} className="text-blue-500" />
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20" />

            <div className="flex flex-col sm:flex-row justify-between items-start gap-10 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                   <p className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-400 italic">SYSTEM STATUS</p>
                </div>
                <h4 className="text-6xl sm:text-7xl font-display font-black italic tracking-tighter leading-none text-white">SECURE</h4>
                <div className="flex flex-wrap items-center gap-4 mt-8">
                   <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 text-[10px] font-black tracking-widest italic backdrop-blur-md">
                      <Activity size={14} />
                      READY
                   </div>
                   <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 text-[10px] font-black tracking-widest italic backdrop-blur-md">
                      <Signal size={14} />
                      SYNCED
                   </div>
                </div>
              </div>
              
              <motion.div 
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.8, ease: "anticipate" }}
                className="p-8 bg-blue-600 rounded-[40px] shadow-[0_20px_50px_rgba(37,99,235,0.4)] hidden lg:block"
              >
                <ShieldAlert size={48} className="text-white" />
              </motion.div>
            </div>
          </section>

          {/* Emergency Services */}
          <section className="space-y-4">
             <div className="flex items-center gap-3 px-2">
                <div className="w-1 h-3 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.4)]" />
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">Emergency Contacts</h3>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Medical */}
               <motion.a 
                 href={`tel:${emergency.ambulance}`}
                 whileHover={{ y: -5, borderColor: '#3b82f6' }}
                 className="p-6 bg-white border border-neutral-200 rounded-[32px] flex items-center justify-between group transition-all shadow-sm"
               >
                 <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                     <Stethoscope size={28} />
                   </div>
                   <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic">Medical Services</p>
                     <p className="text-2xl font-black italic text-neutral-900 tracking-tighter uppercase leading-none group-hover:text-blue-600 transition-colors underline decoration-blue-600/10 underline-offset-4">{emergency.ambulance}</p>
                   </div>
                 </div>
                 <ChevronRight size={16} className="text-neutral-200 group-hover:text-blue-600 transition-all translate-x-0 group-hover:translate-x-1" />
               </motion.a>

               {/* Fire */}
               <motion.a 
                 href={`tel:${emergency.fire}`}
                 whileHover={{ y: -5, borderColor: '#f59e0b' }}
                 className="p-6 bg-white border border-neutral-200 rounded-[32px] flex items-center justify-between group transition-all shadow-sm"
               >
                 <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                     <Flame size={28} />
                   </div>
                   <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic">Fire Services</p>
                     <p className="text-2xl font-black italic text-neutral-900 tracking-tighter uppercase leading-none group-hover:text-amber-500 transition-colors underline decoration-amber-500/10 underline-offset-4">{emergency.fire}</p>
                   </div>
                 </div>
                 <ChevronRight size={16} className="text-neutral-200 group-hover:text-amber-500 transition-all translate-x-0 group-hover:translate-x-1" />
               </motion.a>

               {/* Police - Full width for impact */}
               <motion.a 
                 href={`tel:${emergency.police}`}
                 whileHover={{ scale: 1.01 }}
                 className="sm:col-span-2 p-8 bg-white border-2 border-red-100 rounded-[40px] flex items-center justify-between group transition-all shadow-xl shadow-red-500/5 hover:border-red-600/30"
               >
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-red-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-red-200 transition-transform group-hover:scale-105">
                     <ShieldAlert size={32} />
                   </div>
                   <div className="space-y-1">
                     <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.4em] italic opacity-80 leading-none">Emergency Dispatch</p>
                     <p className="text-4xl font-black italic text-neutral-900 tracking-tighter uppercase leading-none group-hover:text-red-600 transition-colors underline decoration-red-600/20 underline-offset-8">{emergency.police}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                       <p className="text-[8px] font-black text-neutral-300 uppercase tracking-widest leading-none">EMERGENCY</p>
                       <p className="text-[10px] font-black text-red-600 italic tracking-tighter">IMMEDIATE_RESPONSE</p>
                    </div>
                    <ChevronRight size={24} className="text-neutral-200 group-hover:text-red-600 transition-all translate-x-0 group-hover:translate-x-2" strokeWidth={3} />
                 </div>
               </motion.a>
             </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          {/* Safety Readiness Profiles */}
          <section className="bg-white border border-neutral-200 rounded-[32px] p-6 shadow-xl shadow-blue-500/5 space-y-5">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Zap size={14} className="text-blue-600" />
                   <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Emergency Plans</h3>
                </div>
                <span className="text-[7px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase italic">Secure</span>
             </div>
             <div className="space-y-3">
                {[
                   { name: 'Silent Alert', status: 'READY', id: 'SA-9x', color: 'blue' },
                   { name: 'High Monitoring', status: 'ACTIVE', id: 'HM-41', color: 'emerald' },
                   { name: 'Fake Call', status: 'READY', id: 'FC-Tactical', color: 'red', action: 'fake-call' },
                ].map(mission => (
                  <div 
                    key={mission.id} 
                    onClick={() => mission.action === 'fake-call' && setActiveTab?.('fake-call')}
                    className="p-3 bg-neutral-50 rounded-2xl flex items-center justify-between hover:bg-neutral-100 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200"
                  >
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">{mission.id}</p>
                      <p className="text-[11px] font-bold text-neutral-900 uppercase tracking-tight italic">{mission.name}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                      mission.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                      mission.status === 'READY' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-neutral-200 text-neutral-500 border-neutral-300"
                    )}>
                      {mission.status}
                    </div>
                  </div>
                ))}
             </div>
          </section>

          {/* System Kernel Logs */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-neutral-500" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-neutral-500">System Status</h3>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                 <span className="text-[8px] font-bold text-neutral-300 tracking-widest uppercase italic">CONNECTED</span>
              </div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-[32px] p-6 md:h-auto md:max-h-[600px] h-[400px] overflow-y-auto shadow-2xl relative font-sans text-[9px] leading-relaxed custom-scrollbar text-white">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Radio size={40} className="text-blue-500" />
              </div>
              <div className="space-y-2 relative z-10">
                 {systemLogs.length > 0 ? (
                   systemLogs.map((log, i) => (
                      <div key={i} className="flex gap-3 opacity-40 hover:opacity-100 transition-opacity">
                         <span className="text-neutral-500 tabular-nums">[{i.toString().padStart(3, '0')}]</span>
                         <span className={cn(
                           "transition-colors",
                           log.includes("SOS") || log.includes("ALERT") ? "text-red-500 font-black italic" : "text-neutral-400"
                         )}>
                            {log.replace('TACTICAL:', 'Emergency:')}
                         </span>
                      </div>
                   ))
                 ) : (
                   <>
                     <div className="text-neutral-700 italic px-2">Awaiting system initialization...</div>
                     <div className="flex items-center gap-2 text-blue-500 font-black pt-4">
                       <div className="w-1.5 h-3 bg-blue-500 animate-[blink_1s_infinite]" />
                       <span className="italic tracking-widest opacity-60 uppercase">System Active in Region {profile?.countryCode || 'Local'}</span>
                     </div>
                   </>
                 )}
              </div>
            </div>
          </section>

          {/* Recent SOS Activity */}
          <section className="bg-white border border-neutral-200 rounded-[32px] p-6 shadow-xl shadow-blue-500/5 space-y-5 italic overflow-hidden relative">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
             <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                   <History size={14} className="text-red-600" />
                   <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400">Alarm History</h3>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      <span className="text-[7px] font-black text-neutral-400">Active</span>
                   </div>
                   <button 
                     onClick={() => setActiveTab?.('sos-history')}
                     className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                   >
                     View History
                   </button>
                </div>
             </div>
             
             <div className="space-y-3">
                {recentSOS.length > 0 ? (
                  recentSOS.map((log) => (
                    <div key={log.id} className="p-4 bg-neutral-50 rounded-2xl border border-transparent hover:border-neutral-200 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                          log.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {log.status === 'SUCCESS' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-neutral-900 tracking-tight leading-none uppercase">
                            {log.status === 'SUCCESS' ? 'SOS SENT' : 'SOS FAILED'}
                          </p>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">
                            {log.timestamp?.seconds ? format(new Date(log.timestamp.seconds * 1000), 'MMM d, HH:mm') : 'PENDING'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-neutral-300 group-hover:text-blue-500 transition-all" />
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center space-y-2 opacity-20">
                     <History size={24} className="mx-auto" />
                     <p className="text-[8px] font-black uppercase tracking-widest italic">No Incidents</p>
                  </div>
                )}
             </div>
          </section>

          {/* Network Broadcast Module */}
          <section className="p-6 bg-blue-600 text-white rounded-[32px] space-y-4 shadow-xl shadow-blue-500/20 relative overflow-hidden group">
             <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-white/10 blur-3xl" />
             <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 bg-white/20 rounded-xl">
                   <Signal size={20} />
                </div>
                <div>
                   <p className="text-[8px] font-black uppercase tracking-widest opacity-80 leading-none">Network Status</p>
                   <h4 className="font-black text-lg italic tracking-tight uppercase leading-none mt-1">Broadcast SOS</h4>
                </div>
             </div>
             <p className="text-[10px] font-bold text-blue-100 leading-relaxed italic relative z-10">
                Initiate a high-priority signal to all users in your immediate emergency circle.
             </p>
             <button 
               onClick={() => setIsConfirmingSOS(true)}
               className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 active:scale-95 transition-all shadow-lg relative z-10 italic border border-white/20"
             >
               SEND SOS SIGNAL
             </button>
          </section>
        </aside>
      </div>

      {/* SOS Footer */}
      <footer className="mt-12 pt-8 border-t border-neutral-200 relative z-10">
        <div className="max-w-xl mx-auto space-y-6">
           <div className="text-center space-y-1">
              <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.4em] animate-pulse italic">Emergency Actions</p>
              <h2 className="text-xl font-black italic tracking-tighter text-neutral-900 leading-none">SOS CONTROL</h2>
           </div>
           
           <motion.button 
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={() => setIsConfirmingSOS(true)}
             className="w-full py-8 bg-red-600 text-white rounded-[40px] font-black italic tracking-[0.3em] text-xl uppercase shadow-[0_20px_50px_rgba(220,38,38,0.4)] relative group overflow-hidden border-4 border-red-500/50"
           >
             <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
             <span className="relative z-10 flex flex-col items-center gap-2">
                <ShieldAlert size={32} strokeWidth={2.5} className="drop-shadow-lg" />
                <span className="drop-shadow-md">ALERT EMERGENCY CONTACTS</span>
             </span>
           </motion.button>
           
           <div className="flex items-center justify-center gap-8 pt-4">
              <div className="flex flex-col items-center">
                 <p className="text-[7px] font-black text-neutral-300 uppercase tracking-widest">AUTHORIZED</p>
                 <ShieldCheck size={16} className="text-emerald-500" />
              </div>
              <div className="w-[1px] h-8 bg-neutral-100" />
              <div className="flex flex-col items-center">
                 <p className="text-[7px] font-black text-neutral-300 uppercase tracking-widest">SECURE</p>
                 <Lock size={16} className="text-blue-500" />
              </div>
              <div className="w-[1px] h-8 bg-neutral-100" />
              <div className="flex flex-col items-center">
                 <p className="text-[7px] font-black text-neutral-300 uppercase tracking-widest">NETWORK</p>
                 <Radio size={16} className="text-amber-500" />
              </div>
           </div>
           <p className="text-[8px] text-center text-neutral-300 font-bold uppercase tracking-[0.5em] italic">Ai-POWERED // Emergency Hub</p>
        </div>
      </footer>

      {/* Bottom Diagnostic Bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-12 opacity-50 relative z-10">
         <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-1 h-1 bg-blue-600 rounded-full" />
               <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">ENC_RECV: ACTIVE</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-1 h-1 bg-blue-600 rounded-full" />
               <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">GPS_ACC: 99.8%</span>
            </div>
         </div>
         <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">OS_VER: 4.2.0.RELAY</span>
      </div>

      <SOSConfirmationModal 
        isOpen={isConfirmingSOS}
        onClose={() => setIsConfirmingSOS(false)}
        onConfirm={handleBroadcast}
        emergencyContactsCount={profile?.emergencyContacts?.length || 0}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.2); }
      `}} />
    </div>
  );

}
