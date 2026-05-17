import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, limit, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Incident } from '../types';
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  Terminal, 
  Activity,
  Radio,
  Zap,
  BarChart3,
  Fingerprint,
  Lock,
  History,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Phone
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSafety } from '../contexts/SafetyEngineContext';
import { useAuth } from '../contexts/AuthContext';
import { getEmergencyNumbers } from '../constants/emergencyMatrix';

const chartData = [
  { time: '12am', level: 20 },
  { time: '4am', level: 15 },
  { time: '8am', level: 45 },
  { time: '12pm', level: 30 },
  { time: '4pm', level: 65 },
  { time: '8pm', level: 40 },
  { time: '11pm', level: 25 },
];

export default function DashboardPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sosHistory, setSosHistory] = useState<any[]>([]);
  const { systemLogs } = useSafety();
  const { user, profile } = useAuth();
  const emergency = getEmergencyNumbers(profile?.countryCode || 'GH');

  useEffect(() => {
    if (!user) return;

    // Fetch Incidents
    const qIncidents = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'), limit(10));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'incidents', user);
    });

    // Fetch SOS History
    const qSOS = query(
      collection(db, 'sos_history'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'), 
      limit(5)
    );
    const unsubSOS = onSnapshot(qSOS, (snapshot) => {
      setSosHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sos_history', user);
    });

    return () => {
      unsubIncidents();
      unsubSOS();
    };
  }, [user]);

  const stats = [
    { label: 'Security', value: 'Protected', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Connection', value: 'Active', icon: Radio, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Identity', value: 'Verified', icon: Fingerprint, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Activity', value: 'Monitoring', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Encryption', value: 'Secure', icon: Lock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Safety Level', value: 'High', icon: AlertTriangle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Live Extraction', value: 'Fake Call', icon: Phone, color: 'text-red-500', bg: 'bg-red-500/10', action: 'fake-call' },
  ];

  const handleStatClick = (action?: string) => {
    if (action === 'fake-call' && setActiveTab) {
      setActiveTab('fake-call');
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 p-4 sm:p-6 pb-32 max-w-[1400px] mx-auto font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-blue-50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-50 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between mb-8 gap-6 border-b border-neutral-100 pb-8">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-[10px] font-black tracking-widest uppercase text-neutral-400">System Active</h2>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase text-neutral-900 leading-none">
            Welcome back, <span className="text-blue-600">{profile?.displayName?.split(' ')[0] || 'User'}</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
           <div className="hidden md:block text-right">
             <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Status</p>
             <p className="text-[10px] font-black text-emerald-600 italic tracking-widest uppercase">System Secure</p>
           </div>
           <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-neutral-100 shadow-xl p-1 transition-all group">
             <img 
              src={profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 relative z-10">
        <section className="lg:col-span-8 space-y-6">
          {/* Main Hero Metric */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-10 bg-neutral-900 border border-neutral-800 rounded-[40px] relative overflow-hidden group shadow-2xl text-white"
          >
            <div className="absolute top-0 right-0 p-12 opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
               <Shield size={200} />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 sm:gap-8">
               <div className="space-y-2 text-center sm:text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Safety Rating</p>
                  <h4 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-white leading-none">
                    99.8<span className="text-sm sm:text-2xl text-neutral-500 ml-2">%</span>
                  </h4>
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-8">
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-[9px] font-black tracking-widest">
                       <CheckCircle2 className="w-3 h-3" />
                       OPTIMAL
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 text-neutral-400 rounded-xl border border-white/10 text-[9px] font-black tracking-widest">
                       <Activity className="w-3 h-3 text-blue-400" />
                       REALTIME
                    </div>
                  </div>
               </div>
               <div className="p-4 sm:p-6 bg-blue-600/20 rounded-[32px] border border-blue-500/30 backdrop-blur-xl shadow-lg sm:self-start">
                 <Shield className="text-blue-400 w-8 h-8 sm:w-10 sm:h-10" />
               </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* SOS History log */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-neutral-100 rounded-[32px] p-6 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History size={16} className="text-red-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">SOS History</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                {sosHistory.length > 0 ? (
                  sosHistory.map((item) => (
                    <div key={item.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-blue-200 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.status === 'SUCCESS' ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <XCircle size={12} className="text-red-500" />
                          )}
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest italic",
                            item.status === 'SUCCESS' ? "text-emerald-500" : "text-red-500"
                          )}>
                            {item.status}
                          </span>
                        </div>
                        <span className="text-[9px] text-neutral-400 font-bold tabular-nums">
                          {item.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-600 line-clamp-1 group-hover:line-clamp-none transition-all leading-relaxed font-bold">
                        {item.message || "Emergency alert sent"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center space-y-3 opacity-20 text-neutral-400">
                    <History size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest">No recent alerts</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Tactical Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-neutral-100 rounded-[32px] p-6 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 size={16} className="text-blue-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Activity Trend</h3>
                </div>
              </div>
              
              <div className="h-48 w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6', fontSize: '10px', fontWeight: '800' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPulse)" 
                      animationDuration={3000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Daily Average</span>
                <span className="text-xs font-black text-neutral-900 italic">44.2%</span>
              </div>
            </motion.div>
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-6">
           {/* Quick Stats Grid */}
           <div className="grid grid-cols-2 gap-4 h-fit">
            {stats.map((stat, idx) => {
              const Icon = stat.icon as any;
              return (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleStatClick(stat.action)}
                  className={cn(
                    "bg-white border border-neutral-100 rounded-[28px] p-5 space-y-4 transition-all shadow-sm",
                    stat.action ? "cursor-pointer hover:border-red-500 hover:shadow-red-500/10" : "hover:border-blue-300"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    stat.bg
                  )}>
                    <Icon size={18} className={stat.color} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none">{stat.label}</p>
                    <p className="text-xs font-black text-neutral-900 tracking-widest italic uppercase">{stat.value}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Activity Logs */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-neutral-400" />
                <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Activity Logs</h3>
              </div>
            </div>
            <div className="bg-neutral-50 border border-neutral-100 rounded-[32px] p-6 h-[400px] overflow-y-auto shadow-inner custom-scrollbar relative font-sans text-[10px] leading-relaxed">
              {systemLogs.map((log, i) => (
                <div key={i} className="flex gap-3 mb-3 opacity-60 hover:opacity-100 transition-opacity">
                   <span className="text-neutral-300 font-bold">[{i.toString().padStart(2, '0')}]</span>
                   <span className={cn(
                     "font-bold",
                     log.includes("SOS") || log.includes("ALERT") ? "text-red-600 font-black italic" : 
                     log.includes("FAILED") ? "text-amber-600" : "text-neutral-600"
                   )}>
                     {log}
                   </span>
                </div>
              ))}
            </div>
          </section>

          {/* Emergency Hub */}
          <section className="bg-white border border-neutral-100 rounded-[32px] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-red-500" />
                <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Emergency Services</h3>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <a 
                href={`tel:${emergency.police}`}
                className="flex flex-col items-center gap-2 p-3 bg-neutral-50 rounded-2xl border border-transparent hover:border-red-200 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-red-600 transition-colors">
                  <Shield size={14} className="group-hover:text-white text-red-500" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Police</span>
                <span className="text-[10px] font-bold text-neutral-900">{emergency.police}</span>
              </a>
              
              <a 
                href={`tel:${emergency.ambulance}`}
                className="flex flex-col items-center gap-2 p-3 bg-neutral-50 rounded-2xl border border-transparent hover:border-blue-200 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                   <Activity size={14} className="group-hover:text-white text-blue-600" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Medical</span>
                <span className="text-[10px] font-bold text-neutral-900">{emergency.ambulance}</span>
              </a>

              <a 
                href={`tel:${emergency.fire}`}
                className="flex flex-col items-center gap-2 p-3 bg-neutral-50 rounded-2xl border border-transparent hover:border-amber-200 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                  <Zap size={14} className="group-hover:text-white text-amber-500" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Fire</span>
                <span className="text-[10px] font-bold text-neutral-900">{emergency.fire}</span>
              </a>
            </div>
          </section>
        </aside>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.1); }
      `}} />
    </div>
  );
}

