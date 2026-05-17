import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Shield, 
  Navigation
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { SafetyZone } from '../types';
import { useLocation } from '../contexts/LocationContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function SafetyZonesPage() {
  const { user, profile } = useAuth();
  const { location } = useLocation();
  const [isAdding, setIsAdding] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [radius, setRadius] = useState(200);

  const addZone = async () => {
    if (!user || !location || !newZoneName) return;

    const newZone: SafetyZone = {
      id: crypto.randomUUID(),
      name: newZoneName,
      lat: location.latitude,
      lng: location.longitude,
      radius: radius
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        safetyZones: arrayUnion(newZone)
      });
      setNewZoneName('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const removeZone = async (zone: SafetyZone) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        safetyZones: arrayRemove(zone)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="p-6 space-y-10 pb-32 h-full bg-[#050505] text-white font-mono relative overflow-hidden">
      {/* Background HUD Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-1 bg-emerald-600/20 animate-pulse pointer-events-none" />

      <header className="space-y-2 relative z-10 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
          <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">SAFETY_ANCHORS</h2>
        </div>
        <p className="text-neutral-500 text-[9px] font-black uppercase tracking-[0.34em] leading-relaxed max-w-sm italic">
          Define localized geofence parameters. Automatic triggering of SOS protocols upon unauthorized departures.
        </p>
      </header>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsAdding(true)}
        className="w-full p-4 bg-emerald-600 text-white rounded-2xl font-black italic tracking-[0.1em] uppercase shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden group z-10"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <Navigation size={18} className="relative z-10 group-hover:rotate-45 transition-transform" />
        <span className="relative z-10 text-sm font-black italic uppercase tracking-tighter">ESTABLISH_NEW_ZONE</span>
      </motion.button>

      <div className="space-y-6 relative z-10">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">Registered_Geofence_Nodes</h3>
           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">{profile?.safetyZones.length || 0} ACTIVE</span>
        </div>

        <div className="space-y-5">
          {profile?.safetyZones.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-16 text-center bg-white/5 border border-dashed border-white/10 rounded-[40px] backdrop-blur-sm"
            >
              <MapPin size={64} className="mx-auto text-neutral-700 mb-6 opacity-40" />
              <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em]">NO_SAFE_ANCHORS_DETECTED</p>
            </motion.div>
          ) : (
            profile?.safetyZones.map((zone, index) => (
              <motion.div
                layout
                key={zone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-xl flex items-center justify-between group hover:border-emerald-600/30 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="w-12 h-12 bg-emerald-600/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all relative z-10">
                      <Shield size={20} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-white italic tracking-tighter uppercase text-sm leading-tight">{zone.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[8px] text-neutral-500 font-black uppercase tracking-[0.2em]">Radius: {zone.radius}M</p>
                    </div>
                    <p className="text-[7px] text-neutral-700 font-black uppercase tracking-[0.1em] mt-1 italic">Lat: {zone.lat.toFixed(4)} // Lng: {zone.lng.toFixed(4)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeZone(zone)}
                  className="p-3 text-neutral-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 rounded-[60px] p-10 space-y-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600/40 animate-pulse" />
              
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-600/10 text-emerald-500 rounded-[30px] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <MapPin size={40} />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white">ANCHOR_GEN_V2</h3>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em] px-4">Register current coordinates as a secure safety node.</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest pl-2">IDENTIFIER_NAME</label>
                  <input
                    autoFocus
                    placeholder="e.g. RESEARCH_BASE_01"
                    className="w-full p-6 bg-white/5 rounded-[28px] border border-white/5 focus:border-emerald-600 focus:bg-white/10 transition-all font-black uppercase tracking-tighter text-sm placeholder:text-neutral-800"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between pl-2">
                    <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">RADIUS_THRESHOLD</label>
                    <span className="text-[10px] font-black text-emerald-500 italic tracking-widest">{radius}M</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-white/5"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addZone}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[28px] font-black italic tracking-[0.2em] uppercase shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
                >
                  CALIBRATE_ANCHOR
                </motion.button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-full py-4 text-neutral-600 font-black text-[10px] uppercase tracking-[0.5em] hover:text-white transition-colors"
                >
                  ABORT_ZONE_GEN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
