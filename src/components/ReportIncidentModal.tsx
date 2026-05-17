import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Shield, MapPin, Loader2, Camera, Send, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { IncidentType, Severity } from '../types';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportIncidentModal({ isOpen, onClose }: ReportIncidentModalProps) {
  const { user, profile } = useAuth();
  const { location } = useLocation();
  const [type, setType] = useState<IncidentType>(IncidentType.THREAT);
  const [severity, setSeverity] = useState<Severity>(Severity.MEDIUM);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !location) return;

    setIsSubmitting(true);
    try {
      const incidentData = {
        reporterId: user.uid,
        reporterName: profile?.displayName || user.displayName || 'Anonymous',
        type,
        severity,
        description,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          address: 'Current Location'
        },
        timestamp: serverTimestamp(),
        isResolved: false,
        mediaUrls: [],
        aiAnalysis: 'Community Report'
      };

      await addDoc(collection(db, 'incidents'), incidentData);
      onClose();
      // Reset form
      setType(IncidentType.THREAT);
      setSeverity(Severity.MEDIUM);
      setDescription('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'incidents', user);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 font-sans"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-xl shadow-lg ring-4 ring-red-600/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-display font-black italic tracking-tighter uppercase leading-none">Report_Threat</h3>
                <p className="text-[9px] text-neutral-400 font-mono font-black uppercase tracking-[0.3em] mt-1 leading-none">Signal community safety</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
            {/* Type Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Incident_Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(IncidentType).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2",
                      type === t 
                        ? "bg-red-50 border-red-200 text-red-600 shadow-sm" 
                        : "bg-neutral-50 border-neutral-100 text-neutral-500 hover:border-neutral-200"
                    )}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      type === t ? "bg-red-600 animate-pulse" : "bg-neutral-300"
                    )} />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Threat_Level</label>
              <div className="flex bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100">
                {Object.values(Severity).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "flex-1 py-2 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all",
                      severity === s 
                        ? "bg-white text-neutral-900 shadow-md ring-1 ring-neutral-200" 
                        : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Intel_Brief</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the observation..."
                required
                className="w-full h-32 bg-neutral-50 border border-neutral-100 rounded-3xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600/20 transition-all resize-none"
              />
            </div>

            {/* Location Check */}
            <div className={cn(
              "p-4 rounded-3xl border flex items-start gap-4 transition-all",
              location ? "bg-blue-50/30 border-blue-100" : "bg-amber-50/30 border-amber-100"
            )}>
              <div className={cn(
                "p-2 rounded-xl",
                location ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
              )}>
                <MapPin size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-neutral-900 uppercase tracking-widest italic leading-none">Anchor_Coordinates</p>
                <p className="text-[9px] text-neutral-500 font-mono italic">
                  {location 
                    ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` 
                    : "Obtaining satellite fix..."}
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex gap-3 text-[9px] text-neutral-400 italic">
               <Info size={14} className="shrink-0" />
               <p>Community reports are anonymous but logged. Deliberate false signaling may result in protocol suspension.</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !location || !description.trim()}
              className={cn(
                "w-full py-5 rounded-[28px] font-display font-black italic tracking-tighter uppercase text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                isSubmitting || !location || !description.trim() 
                  ? "bg-neutral-300 shadow-none cursor-not-allowed" 
                  : "bg-neutral-900 hover:bg-black shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Transmitting...
                </>
              ) : (
                <>
                  <Send size={20} className="-rotate-45" />
                  Broadcast_Signal
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
