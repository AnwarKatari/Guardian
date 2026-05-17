import { useState, useEffect } from 'react';
import { 
  Shield, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  ShieldCheck,
  Zap,
  Map as MapIcon,
  Phone,
  Radio,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { collection, query, limit, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Incident } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';

import { GuardianLogo } from '../components/GuardianLogo';

export default function HomePage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const { user, profile } = useAuth();
  const { location } = useLocation();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'incidents'), 
      where('isResolved', '==', false),
      orderBy('timestamp', 'desc'), 
      limit(3)
    );
    return onSnapshot(q, (snapshot) => {
      setRecentIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'incidents');
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-white p-6 space-y-8 pb-32 max-w-lg mx-auto relative overflow-hidden font-sans text-neutral-900">
      {/* Dynamic Background Accents */}
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
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
               <p onClick={() => setActiveTab('network')} className="text-neutral-400 text-[9px] font-mono font-black uppercase tracking-[0.3em] italic cursor-pointer hover:text-blue-600 transition-colors">SOS CONTACTS: {profile?.emergencyContacts?.length || 0} ACTIVE</p>
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

      {/* Safety Status Card (The "Beacon") */}
      <motion.section 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setActiveTab('map')}
        className="group relative cursor-pointer"
      >
        <div className="absolute inset-0 bg-blue-600 rounded-[40px] blur-3xl opacity-20 group-hover:opacity-30 transition-all duration-500" />
        <div className="relative p-10 bg-gradient-to-br from-neutral-900 to-neutral-800 border border-white/10 rounded-[40px] text-white shadow-2xl overflow-hidden shadow-blue-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1)_0%,_transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          <div className="flex items-center justify-between relative z-10 mb-8">
            <div className="p-4 bg-blue-600 text-white rounded-[20px] shadow-lg shadow-blue-500/40 group-hover:rotate-12 transition-transform duration-500">
              <ShieldCheck size={32} />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-[0.25em] shadow-lg animate-pulse">
                STABLE CONNECTION
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-0.5 rounded-md">
                 <Clock size={10} />
                 <span>VERIFIED</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1 relative z-10">
            <p className="text-blue-400 text-[10px] font-mono font-black uppercase tracking-[0.5em] italic opacity-80 leading-none">Safety Assessment</p>
            <h3 className="text-3xl font-display font-black italic tracking-tighter leading-none uppercase drop-shadow-xl">STAYING SAFE</h3>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-2">System monitoring active and stable</p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-neutral-800 bg-neutral-900 flex items-center justify-center">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                  </div>
                ))}
             </div>
             <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic flex items-center gap-2">
               Safety Monitoring <ChevronRight size={10} className="text-blue-500" />
             </div>
          </div>
        </div>
      </motion.section>

      {/* Modular Info Grid */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 bg-white border border-neutral-100 rounded-[32px] shadow-sm space-y-4 hover:border-blue-500/30 transition-all hover:bg-blue-50/50"
        >
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <Radio size={18} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none">Signal Link</p>
            <p className="text-lg font-black text-neutral-900 tracking-tighter italic uppercase leading-none">ACTIVE</p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 bg-white border border-neutral-100 rounded-[32px] shadow-sm space-y-4 hover:border-blue-500/30 transition-all hover:bg-blue-50/50"
        >
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Users size={18} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none">Emergency Circle</p>
            <p className="text-lg font-black text-neutral-900 tracking-tighter italic uppercase leading-none">{profile?.emergencyContacts?.length || 0} MEMBERS</p>
          </div>
        </motion.div>
      </div>

       {/* Services Grid (Grid-styled) */}
      <section className="space-y-6 relative z-10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-[2px] h-4 bg-blue-600 rounded-full" />
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.4em] italic">Safety Services</h3>
        </div>
        <div className="grid grid-cols-2 gap-5">
           {[
             { id: 'check-in', label: 'Safety Check', sub: 'CHECK_IN', icon: Clock, color: 'blue' },
             { id: 'network', label: 'User Network', sub: 'NETWORK', icon: Users, color: 'indigo' },
             { id: 'fake-call', label: 'Mock Call', sub: 'FAKE_CALL', icon: Phone, color: 'neutral' },
             { id: 'emergency-hub', label: 'Emergency Hub', sub: 'SOS_STATUS', icon: ShieldAlert, color: 'red' }
           ].map((srv, idx) => (
             <motion.button 
               key={srv.id}
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 + (idx * 0.08) }}
               onClick={() => setActiveTab(srv.id)}
               className="p-8 bg-white border border-neutral-100 rounded-[40px] shadow-sm flex flex-col items-center gap-5 hover:border-blue-500 transition-all group active:scale-95 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`p-4 rounded-[20px] transition-all duration-500 ${
                  srv.color === 'blue' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                  srv.color === 'red' ? 'bg-red-50 text-red-600 border border-red-100' :
                  srv.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                  'bg-neutral-50 text-neutral-900 border border-neutral-100'
                } group-hover:scale-110 group-hover:rotate-6 shadow-sm relative z-10`}>
                   <srv.icon size={24} />
                </div>
                <div className="text-center space-y-1 relative z-10">
                   <p className="text-xs font-black text-neutral-900 uppercase tracking-tight italic leading-none">{srv.label}</p>
                   <p className="text-[8px] text-neutral-400 font-black uppercase tracking-[0.25em]">{srv.sub}</p>
                </div>
                <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                   <ChevronRight size={12} className="text-blue-500" />
                </div>
             </motion.button>
           ))}
        </div>
      </section>

      {/* AI Safety Advisor (Floating Card) */}
      <motion.section 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-8 bg-[#0d0d0d] text-white rounded-[40px] space-y-6 relative overflow-hidden shadow-2xl border border-white/5 group hover:border-blue-500/30 transition-all"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 blur-[120px] rounded-full translate-x-12 -translate-y-12 opacity-10 group-hover:opacity-20 transition-opacity" />
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md">
              <Lightbulb size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] leading-none">Guard AI Advisor</p>
              <h4 className="font-black text-lg tracking-tighter italic uppercase mt-1">Safety Feed</h4>
            </div>
          </div>
          <div className="animate-pulse flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            <div className="w-1 h-1 bg-blue-500 rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">Live Sync</span>
          </div>
        </div>
        
        <div className="relative z-10 space-y-5">
          <p className="text-[11px] text-neutral-300 font-bold leading-relaxed italic border-l border-blue-600/50 pl-4">
            "Safety levels in your current region are stable. Continue with recommended safety precautions."
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0d0d0d] bg-neutral-900 flex items-center justify-center overflow-hidden grayscale opacity-50">
                  <Shield size={12} className="text-blue-500" />
                </div>
              ))}
            </div>
            <motion.div 
               whileHover={{ x: 3 }}
               className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 italic"
            >
              Analyze Detail <ChevronRight size={10} strokeWidth={3} />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Security Alerts (Enterprise Feed Style) */}
      <section className="space-y-4 relative z-10">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-[1px] h-3 bg-red-600" />
            <h3 className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.3em]">Security Alerts</h3>
          </div>
        </div>
        <div className="space-y-3">
          {recentIncidents.length > 0 ? (
            recentIncidents.map((incident) => (
              <motion.div 
                key={incident.id}
                whileHover={{ scale: 1.02 }}
                className="p-5 bg-white border border-neutral-100 rounded-[32px] flex items-center gap-5 shadow-sm hover:border-blue-500/20 transition-all cursor-pointer group"
              >
                <div className={cn(
                  "p-4 rounded-2xl shrink-0 transition-all",
                  incident.severity === 'critical' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                )}>
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[11px] font-black uppercase text-neutral-900 tracking-tight italic">{incident.type}</p>
                    <p className="text-[8px] text-neutral-400 font-black uppercase tracking-widest">{formatDate(incident.timestamp)}</p>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-bold line-clamp-1 italic uppercase tracking-wider">{incident.description}</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </motion.div>
            ))
          ) : (
            <div className="p-12 text-center bg-neutral-50 border-2 border-dashed border-neutral-100 rounded-[40px] space-y-3">
              <div className="w-16 h-16 bg-white rounded-[28px] flex items-center justify-center mx-auto border border-neutral-100 shadow-sm">
                <ShieldCheck size={32} className="text-neutral-200" />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400 italic">STATUS: SECURE</p>
                <p className="text-[8px] text-neutral-300 font-black uppercase tracking-widest">No security alerts in your local area</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
