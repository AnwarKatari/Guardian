import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Incident, Alert, UserProfile } from '../types';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertCircle, Map as MapIconLucide, Navigation, Download, HardDrive, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import ReportIncidentModal from './ReportIncidentModal';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function SafetyMap() {
  const { location } = useLocation();
  const { user, profile } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [circleMembers, setCircleMembers] = useState<UserProfile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const qIncidents = query(collection(db, 'incidents'), where('isResolved', '==', false));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'incidents', user);
    });

    const qAlerts = query(collection(db, 'alerts'), where('status', '==', 'active'));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'alerts', user);
    });

    // Fetch community members who are sharing location
    const qUsers = query(collection(db, 'users'), where('isSharingLocation', '==', true));
    const unsubCircle = onSnapshot(qUsers, (snapshot) => {
      if (profile?.trustedContactIds) {
        const members = snapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => (profile.trustedContactIds.includes(u.uid) || u.uid === user.uid) && u.isOnline);
        setCircleMembers(members);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users', user);
    });

    return () => {
      unsubIncidents();
      unsubAlerts();
      unsubCircle();
    };
  }, [user, profile?.trustedContactIds]);

  const handleDownloadRegion = async () => {
    if (!location || !user) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulated progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 400);

    // Wait for "download" to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newRegion = {
      id: Math.random().toString(36).substring(7),
      name: `Secure Region (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`,
      lat: location.latitude,
      lng: location.longitude,
      radius: 2000, // 2km
      downloadedAt: new Date().toISOString(),
      sizeMB: parseFloat((Math.random() * 5 + 2).toFixed(1))
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        offlineMaps: arrayUnion(newRegion)
      });
    } catch (err) {
      console.error("Failed to save offline map:", err);
    }

    setIsDownloading(false);
  };

  const center: [number, number] = location 
    ? [location.latitude, location.longitude]
    : [5.6037, -0.1870]; // Default to Accra, Ghana

  const isInOfflineZone = profile?.offlineMaps?.some(region => {
    if (!location) return false;
    // Basic approximate distance check (1 deg ~ 111km)
    const latDiff = Math.abs(region.lat - location.latitude);
    const lngDiff = Math.abs(region.lng - location.longitude);
    return latDiff < 0.018 && lngDiff < 0.018; // approx 2km
  });

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 right-4 z-[1001] flex flex-col items-end gap-2">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
            GPS: {location?.accuracy?.toFixed(0) || 0}m
          </span>
        </div>

        {isInOfflineZone && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-neutral-900 text-white px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg"
          >
            <HardDrive size={12} className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-tighter italic">Secure Offline Storage Active</span>
          </motion.div>
        )}
      </div>

      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap center={center} />

        {/* User Marker */}
        <Circle 
          center={center}
          radius={location?.accuracy || 20}
          pathOptions={{ fillColor: '#2563eb', fillOpacity: 0.1, color: '#2563eb', weight: 1 }}
        />

        {/* Offline Zones Overlay */}
        {profile?.offlineMaps?.map(region => region && typeof region.lat === 'number' && (
          <Circle 
            key={region.id}
            center={[region.lat, region.lng]}
            radius={region.radius}
            pathOptions={{ fillColor: '#10b981', fillOpacity: 0.05, color: '#10b981', weight: 1, dashArray: '5, 10' }}
          />
        ))}

        <Marker 
          position={center}
          icon={L.divIcon({
            className: 'user-marker',
            html: `
              <div class="relative flex items-center justify-center">
                <div class="absolute w-12 h-12 ${alerts.some(a => a.senderId === user?.uid) ? 'bg-red-500/40' : 'bg-blue-500/30'} rounded-full animate-ping"></div>
                <div class="w-5 h-5 ${alerts.some(a => a.senderId === user?.uid) ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-blue-600'} rounded-full border-2 border-white shadow-xl ring-4 ${alerts.some(a => a.senderId === user?.uid) ? 'ring-red-500/20' : 'ring-blue-500/20'} transition-colors duration-500"></div>
                ${alerts.some(a => a.senderId === user?.uid) ? '<div class="absolute -top-6 whitespace-nowrap bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-bounce">SOS Active</div>' : ''}
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })}
        >
          <Popup>You are here</Popup>
        </Marker>

        {/* Incidents */}
        {incidents.map(incident => incident.location && typeof incident.location.lat === 'number' && (
          <Marker 
            key={incident.id} 
            position={[incident.location.lat, incident.location.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon transition-transform hover:scale-110 active:scale-95',
              html: `<div class="p-2.5 rounded-full shadow-2xl border-2 transition-all ${
                        incident.severity === 'critical' ? 'bg-red-600 border-red-400 text-white animate-bounce' : 
                        incident.severity === 'high' ? 'bg-orange-600 border-orange-400 text-white' : 
                        'bg-white border-neutral-200 text-orange-600'
                      }">
                      ${
                        incident.type === 'theft' ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grab"><path d="M18 11.5V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"/><path d="M14 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 9.9V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M6 14v0a2 2 0 0 0 2 2h7.5a5.5 5.5 0 0 0 5.5-5.5V11"/></svg>' :
                        incident.type === 'harassment' ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>' :
                        incident.type === 'accident' ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.3 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>' :
                        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>'
                      }
                    </div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup className="tactical-popup">
              <div className="p-3 font-sans space-y-2 min-w-[150px]">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                    incident.severity === 'critical' ? "bg-red-500/10 text-red-600 border-red-600/20" : 
                    "bg-orange-500/10 text-orange-600 border-orange-600/20"
                  )}>
                    {incident.severity}
                  </span>
                  <span className="text-[8px] text-neutral-400 font-mono italic">#{incident.id.slice(0, 5)}</span>
                </div>
                <p className="font-display font-black italic text-neutral-900 leading-none uppercase tracking-tighter text-sm">{incident.type}</p>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                  <p className="text-xs text-neutral-600 italic leading-snug">{incident.description}</p>
                </div>
                <button className="w-full py-2 bg-neutral-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">
                  View Intel Report
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active SOS Alerts */}
        {alerts.map(alert => alert.location && typeof alert.location.lat === 'number' && (
          <Marker 
            key={alert.id} 
            position={[alert.location.lat, alert.location.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="p-2 bg-red-600 rounded-full shadow-lg border-2 border-white text-white animate-pulse">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                    </div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup>
              <div className="p-2 font-sans">
                <p className="font-bold text-red-600 uppercase tracking-wider text-xs">Emergency Alert</p>
                <p className="font-bold text-neutral-900">{alert.senderName || 'Ai-POWERED User'}</p>
                <p className="text-xs text-neutral-500">SOS Signal Detected</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Circle Members */}
        {circleMembers.map(member => (
          member.lastLocation && (
            <Marker
              key={member.uid}
              position={[member.lastLocation.lat, member.lastLocation.lng]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="relative">
                        <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 shadow-lg">
                          <img src="${member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`}" class="w-full h-full object-cover">
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              })}
            >
              <Popup>
                <div className="p-2 font-sans">
                  <p className="font-bold text-neutral-900">{member.displayName}</p>
                  <p className="text-[10px] text-neutral-400 uppercase font-black">Trusted Circle Member</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>

      {/* Map Actions Overlay */}
      <div className="absolute bottom-6 inset-x-6 z-[1001] flex items-center justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => location && window.open(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`)}
            className="p-3 bg-white border border-neutral-100 rounded-2xl shadow-lg text-blue-600 active:scale-95 transition-transform"
          >
            <Navigation size={20} />
          </button>
          <button 
            onClick={() => setShowDownloads(!showDownloads)}
            className={cn(
              "p-3 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2 border border-neutral-100",
              showDownloads ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"
            )}
          >
            <HardDrive size={20} />
            {profile?.offlineMaps?.length ? (
              <span className="text-xs font-black italic">{profile.offlineMaps.length}</span>
            ) : null}
          </button>
        </div>

        <button 
          onClick={handleDownloadRegion}
          disabled={isDownloading || !location}
          className="pointer-events-auto px-6 py-3 bg-neutral-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-3 border border-white/10 disabled:opacity-50"
        >
          {isDownloading ? (
             <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs font-black italic uppercase tracking-tighter">{Math.floor(downloadProgress)}%</span>
             </div>
          ) : (
             <>
               <Download size={18} />
               <span className="text-xs font-black italic uppercase tracking-tighter">Download Current Region</span>
             </>
          )}
        </button>

        <button 
          onClick={() => setShowReportModal(true)}
          className="pointer-events-auto p-4 bg-red-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all flex items-center gap-3 border border-red-400 ring-4 ring-red-600/20"
        >
          <AlertTriangle size={20} />
          <span className="text-xs font-display font-black italic uppercase tracking-tighter">Report_Threat</span>
        </button>
      </div>

      <ReportIncidentModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />

      {/* Downloads Modal */}
      <AnimatePresence>
        {showDownloads && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-6 right-6 z-[1002] bg-white rounded-[32px] border border-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
          >
            <div className="p-5 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-neutral-400" />
                <h4 className="font-black italic tracking-tighter uppercase">Offline Regions</h4>
              </div>
              <button 
                onClick={() => setShowDownloads(false)}
                className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={18} className="text-neutral-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {profile?.offlineMaps && profile.offlineMaps.length > 0 ? (
                profile.offlineMaps.map(region => (
                  <div key={region.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{region.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{region.sizeMB} MB</span>
                        <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          {new Date(region.downloadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-emerald-500">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto text-neutral-300">
                    <Download size={24} />
                  </div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No local data found</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-neutral-50 border-t border-neutral-100">
              <p className="text-[9px] text-center text-neutral-400 uppercase tracking-widest font-bold">
                Download critical regions to ensure safety during connectivity failure
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
