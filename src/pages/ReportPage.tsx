import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Camera, 
  Video, 
  MapPin, 
  AlertCircle,
  ChevronRight,
  Info,
  Type,
  Shield,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { IncidentType, Severity } from '../types';
import { analyzeThreat } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function ReportPage() {
  const [formData, setFormData] = useState({
    type: IncidentType.OTHER,
    description: '',
    severity: Severity.MEDIUM,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  const { user, profile } = useAuth();
  const { location } = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !location) return;

    setIsSubmitting(true);
    
    try {
      // Get AI Analysis first
      const analysis = await analyzeThreat(formData.description, "Near user location");
      setAiAnalysis(analysis);

      await addDoc(collection(db, 'incidents'), {
        reporterId: user.uid,
        reporterName: user.displayName,
        type: formData.type,
        description: formData.description,
        severity: formData.severity,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          address: "Current Location"
        },
        timestamp: serverTimestamp(),
        isResolved: false,
        mediaUrls: [],
        aiAnalysis: analysis
      });

      setIsSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'incidents');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-10 bg-neutral-50 text-neutral-900 font-mono relative overflow-hidden">
        {/* Success Ambience */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent)] blur-3xl pointer-events-none" />
        
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-10 animate-pulse" />
          <div className="w-32 h-32 bg-white rounded-[40px] border border-emerald-100 flex items-center justify-center text-emerald-500 relative z-10 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={64} strokeWidth={2.5} />
          </div>
        </motion.div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase whitespace-pre-line text-neutral-900">REPORT_SYNCED_&_BROADCAST</h2>
          <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[300px] mx-auto italic">
            Localized threat localized. Signal propagated to network nodes and tactical response circles.
          </p>
        </div>
        
        {aiAnalysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[40px] text-left border border-blue-100 max-w-md relative overflow-hidden shadow-xl shadow-blue-500/5"
          >
            <div className="absolute -top-10 -right-10 opacity-[0.03]">
              <Shield size={160} className="text-blue-600" />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Zap size={16} className="text-blue-600 fill-current" />
              </div>
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em]">Tactical_AI_Insight</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed font-black italic uppercase tracking-tight">"{aiAnalysis}"</p>
          </motion.div>
        )}

        <button 
          onClick={() => setIsSuccess(false)}
          className="w-full max-w-xs py-5 bg-blue-600 text-white rounded-[32px] font-black italic tracking-[0.2em] uppercase shadow-lg shadow-blue-500/30 active:scale-95 transition-all text-xl"
        >
          DISMISS_REPORT
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10 pb-32 bg-neutral-50 text-neutral-900 font-mono relative overflow-hidden">
      {/* Background HUD Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
      
      <header className="space-y-4 relative z-10 pt-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">INCIDENT_UPLOAD</h2>
        </div>
        <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.34em] leading-relaxed max-w-sm italic">
          Crowdsourced surveillance mesh active for {profile?.countryCode || 'GLOBAL'} sector. Deploy tactical data to network.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic px-2">Select_Threat_Category</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(IncidentType).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type })}
                className={cn(
                  "p-6 rounded-[28px] border-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group shadow-sm",
                  formData.type === type 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "bg-white border-neutral-100 text-neutral-400 hover:border-blue-200 hover:text-blue-600"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic px-2">Contextual_Intelligence</h3>
          <div className="relative">
             <textarea
              required
              placeholder="ENTER_THREAT_DESCRIPTION_HERE"
              className="w-full p-8 h-48 rounded-[40px] border border-neutral-100 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 outline-none transition-all resize-none font-black text-sm leading-relaxed uppercase tracking-tight placeholder:text-neutral-300 text-neutral-900 shadow-sm"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div className="absolute bottom-6 right-8 opacity-10">
               <Type size={16} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <button type="button" className="p-8 bg-white rounded-[40px] border border-neutral-100 flex flex-col items-center gap-4 text-neutral-400 hover:text-blue-600 hover:border-blue-200 transition-all group shadow-sm">
            <div className="p-4 bg-neutral-50 rounded-2xl group-hover:bg-blue-50 group-hover:scale-110 transition-all">
              <Camera size={32} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.4em]">EVIDENCE_SYNC</span>
          </button>
          <button type="button" className="p-8 bg-white rounded-[40px] border border-neutral-100 flex flex-col items-center gap-4 text-neutral-400 hover:text-blue-600 hover:border-blue-200 transition-all group shadow-sm">
            <div className="p-4 bg-neutral-50 rounded-2xl group-hover:bg-blue-50 group-hover:scale-110 transition-all">
              <Video size={32} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.4em]">LOOP_RECORDER</span>
          </button>
        </div>

        <div className="p-8 bg-white rounded-[40px] border border-neutral-100 flex items-start gap-6 shadow-sm">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
            <MapPin size={28} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Geospatial_Tagging</p>
            <p className="text-[9px] text-neutral-400 font-black uppercase leading-relaxed tracking-widest italic">
              Precise coordinate mapping authorized. Signal origin verification encrypted at source.
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black italic tracking-[0.2em] uppercase shadow-xl shadow-blue-500/20 flex items-center justify-center gap-4 disabled:opacity-50 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 border-[4px] border-white/20 border-t-white rounded-full"
            />
          ) : (
            <>
              <Shield size={24} strokeWidth={3} className="relative z-10" />
              <span className="relative z-10 text-xl font-black italic uppercase tracking-tighter">BROADCAST_SIGNAL</span>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
