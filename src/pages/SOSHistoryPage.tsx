import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  History, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Clock,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';

export default function SOSHistoryPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'sos_history'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        // Use a high value for null timestamps to keep them at the top (newest)
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : Date.now());
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : Date.now());
        return timeB - timeA;
      });
      setHistory(logs);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch SOS history:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;
    try {
      await deleteDoc(doc(db, 'sos_history', logId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="h-full bg-white text-neutral-900 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="p-6 pt-12 flex items-center justify-between border-b border-neutral-100 bg-white/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('settings')}
            className="p-2 sm:p-3 rounded-2xl bg-neutral-50 text-neutral-400 hover:text-blue-600 transition-all active:scale-95 border border-neutral-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tighter italic uppercase text-neutral-900 leading-none">SOS_HISTORY</h1>
            <p className="text-[9px] text-neutral-300 font-black uppercase tracking-widest italic">Encrypted_Log_Access_Active</p>
          </div>
        </div>
        <History size={20} className="text-blue-600 animate-pulse" />
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 relative">
        {/* Background Ambience */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.01)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none" />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30 italic">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Decrypting_Logs...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 text-center italic">
            <div className="w-16 h-16 bg-blue-50 text-blue-300 rounded-3xl flex items-center justify-center border border-blue-100/50">
              <History size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-neutral-400 tracking-tighter">Zero_Records_Found</p>
              <p className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest max-w-[200px]">No distress signals have been synchronized with the cloud network.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {history.map((log, i) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white border border-neutral-100 rounded-[32px] p-6 shadow-sm hover:border-blue-200 transition-all italic"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg",
                      log.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" : "bg-red-50 text-red-600 shadow-red-100"
                    )}>
                      {log.status === 'SUCCESS' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <p className={cn(
                        "text-xs font-black uppercase tracking-tighter",
                        log.status === 'SUCCESS' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {log.status === 'SUCCESS' ? 'PROTOCOL_EXECUTED' : 'PROTOCOL_FAILURE'}
                      </p>
                      <p className="text-[9px] text-neutral-300 font-bold uppercase tracking-[0.2em]">
                        {log.timestamp?.seconds ? format(new Date(log.timestamp.seconds * 1000), 'MMM d, yyyy · HH:mm') : 'TIME_UNKNOWN'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-neutral-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={14} className="text-neutral-300 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-neutral-500 font-medium leading-relaxed italic">
                      {log.message || "No signal body recorded."}
                    </p>
                  </div>
                  {log.relay && (
                    <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse shadow-[0_0_5px_rgba(37,99,235,0.5)]" />
                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest italic">
                        Relay: {log.relay} {log.contactsNotified?.length ? `· [${log.contactsNotified.length}_UNITS]` : ""}
                      </p>
                    </div>
                  )}
                  {log.location && typeof log.location.lat === 'number' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
                      <MapPin size={14} className="text-blue-500 shrink-0" />
                      <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter italic">
                        Coord: {log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)}
                      </p>
                    </div>
                  )}
                  {log.reason && (
                    <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 text-red-500">
                      <AlertTriangle size={14} className="shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest italic">
                        Err_Code: {log.reason}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <footer className="p-6 border-t border-neutral-100 text-center italic">
        <p className="text-[8px] text-neutral-300 font-bold uppercase tracking-[0.4em]">Logs_Immutable_After_Session_Sync</p>
      </footer>
    </div>
  );
}
