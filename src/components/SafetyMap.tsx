import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Incident, Alert, UserProfile } from '../types';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafety } from '../contexts/SafetyEngineContext';
import { Shield, AlertCircle, Map as MapIconLucide, Navigation, Download, HardDrive, CheckCircle2, X, AlertTriangle, History, Maximize2, Minimize2 } from 'lucide-react';
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

function Routing({ start, end }: { start: [number, number]; end: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !start || !end || isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) return;
    
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
    }).addTo(map);

    return () => {
      if (map && routingControl) {
        try {
          // Check if control is still on map before removing
          if (map.hasLayer(routingControl as any) || (map as any)._controls?.includes(routingControl)) {
            map.removeControl(routingControl);
          }
        } catch (e) {
          console.error("Error removing routing control:", e);
        }
      }
    };
  }, [map, start, end]);
  return null;
}

function FitHistoryBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(pt => [pt.lat, pt.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

function MapResizeTrigger({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Force immediate invalidate
    map.invalidateSize();

    // Set up multiple staggered invalidateSize calls to ensure the map renders
    // correctly after tab transition animations or lazy loading finishes.
    const intervals = [50, 150, 300, 600, 1200, 2500, 5000];
    const timers = intervals.map(delay => 
      setTimeout(() => {
        map.invalidateSize();
      }, delay)
    );

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen, map]);
  return null;
}


function SafetyEngine({ safeZones, triggerSOS }: { safeZones: any[], triggerSOS: () => void }) {
  const map = useMap();
  const { location } = useLocation();

  useEffect(() => {
    if (!location || safeZones.length === 0) return;
    const isInside = safeZones.some(zone => {
       const dist = map.distance([zone.location.lat, zone.location.lng], [location.latitude, location.longitude]);
       return dist < zone.radius;
    });
    if (!isInside) triggerSOS();
  }, [location, safeZones, map, triggerSOS]);

  return (
    <>
      {safeZones.map(zone => (
        <Circle key={zone.id} center={[zone.location.lat, zone.location.lng]} radius={zone.radius} pathOptions={{color: 'green'}} />
      ))}
    </>
  );
}

export default function SafetyMap() {
  const { location } = useLocation();
  const { user, profile } = useAuth();
  const { triggerSOS } = useSafety();
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [route, setRoute] = useState<[number, number] | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [circleMembers, setCircleMembers] = useState<UserProfile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [mapLayer, setMapLayer] = useState("road");
  const [historyLocations, setHistoryLocations] = useState<{ id: string; lat: number; lng: number; timestamp: string }[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [services, setServices] = useState<{ id: string, type: 'hospital' | 'police' | 'fire', name: string, lat: number, lng: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'safeZones'));
    const unsub = onSnapshot(q, (snapshot) => {
      setSafeZones(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!location) return;
    // Generate mock services near current location
    const newServices = [
      { id: 'h1', type: 'hospital', name: 'City Hospital', lat: location.latitude + 0.003, lng: location.longitude + 0.003 },
      { id: 'h2', type: 'hospital', name: 'General Clinic', lat: location.latitude - 0.004, lng: location.longitude + 0.002 },
      { id: 'p1', type: 'police', name: 'Central Police', lat: location.latitude + 0.005, lng: location.longitude - 0.004 },
      { id: 'p2', type: 'police', name: 'District Station', lat: location.latitude - 0.006, lng: location.longitude - 0.003 },
      { id: 'f1', type: 'fire', name: 'Main Fire Station', lat: location.latitude + 0.001, lng: location.longitude - 0.002 },
    ] as const;
    setServices(newServices as any);
  }, [location]);

  useEffect(() => {
    if (!user) return;

    // Fetch user's private location history
    const qHistory = query(collection(db, 'users', user.uid, 'locationHistory'));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      let historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Sort by timestamp
      historyData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // If empty, generate some beautiful realistic mock historical points around current location
      if (historyData.length === 0 && location) {
        setHistoryLocations(prev => {
          if (prev.length > 0 && prev[0].id.startsWith('mock-hist-')) {
            return prev;
          }
          const baseLat = location.latitude;
          const baseLng = location.longitude;
          const generated = [];
          const nowTime = Date.now();
          for (let i = 5; i > 0; i--) {
            const offsetLat = (Math.sin(i) * 0.002) + (Math.cos(i) * 0.0005);
            const offsetLng = (Math.cos(i) * 0.002) - (Math.sin(i) * 0.0005);
            const time = new Date(nowTime - i * 20 * 60 * 1000).toISOString();
            generated.push({
              id: `mock-hist-${i}`,
              lat: baseLat + offsetLat,
              lng: baseLng + offsetLng,
              timestamp: time
            });
          }
          return generated;
        });
      } else {
        setHistoryLocations(historyData);
      }
    }, (error) => {
      console.error("Failed to subscribe to location history:", error);
    });

    return () => {
      unsubHistory();
    };
  }, [user, location === null]);

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
    <div className={cn(
      "relative transition-all duration-300",
      isFullscreen ? "fixed inset-0 z-[1200] w-screen h-screen bg-white" : "h-full w-full"
    )}>
      <div className="absolute top-4 right-4 z-[1001] flex flex-col items-end gap-2">
        <div className="flex gap-2 items-center">
          {/* Full Screen Toggle Button */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-xl shadow-md text-neutral-700 active:scale-95 transition-all flex items-center justify-center pointer-events-auto"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
              GPS: {location?.accuracy?.toFixed(0) || 0}m
            </span>
          </div>
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
      
      {/* Layer Switcher */}
      <div className="absolute top-4 left-4 z-[1001] flex gap-2">
         <button onClick={() => setMapLayer("road")} className={cn("p-2 rounded-lg bg-white shadow-md text-xs font-bold transition-all", mapLayer === "road" ? "border-2 border-blue-500 text-blue-600" : "text-neutral-700")}>Road</button>
         <button onClick={() => setMapLayer("satellite")} className={cn("p-2 rounded-lg bg-white shadow-md text-xs font-bold transition-all", mapLayer === "satellite" ? "border-2 border-blue-500 text-blue-600" : "text-neutral-700")}>Satellite</button>
         <button onClick={() => setMapLayer("history")} className={cn("p-2 rounded-lg bg-white shadow-md text-xs font-bold transition-all flex items-center gap-1", mapLayer === "history" ? "border-2 border-blue-500 text-blue-600" : "text-neutral-700")}>
           <History size={13} className={cn(mapLayer === "history" ? "text-blue-500" : "text-neutral-400")} /> History
         </button>
      </div>

      {/* Service Finder - Moved to Bottom Left */}
      <div className="absolute bottom-20 left-4 z-[1001]">
         <select onChange={(e) => {
             const val = e.target.value;
             if (location) {
                 // Simulate nearest service by adding a small offset
                 const nearest = services.find(s => s.type === val);
                 if (nearest) setRoute([nearest.lat, nearest.lng]);
                 else setRoute(null);
             }
         }} className="p-3 rounded-xl bg-white shadow-lg text-sm font-bold text-neutral-700 border border-neutral-200">
             <option value="">Find Service</option>
             <option value="hospital">Nearest Hospital</option>
             <option value="police">Nearest Police</option>
             <option value="fire">Nearest Fire Station</option>
         </select>
      </div>

      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <MapResizeTrigger isFullscreen={isFullscreen} />

        <TileLayer
          attribution={mapLayer === "road" ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' : '&copy; <a href="https://www.arcgisonline.com/">ArcGIS</a>'}
          url={mapLayer === "road" ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png"}
        />
        
        <RecenterMap center={center} />
        <SafetyEngine safeZones={safeZones} triggerSOS={triggerSOS} />
        {route && location && <Routing start={[location.latitude, location.longitude]} end={route} />}

        {services.map(service => (
           <Marker key={service.id} position={[service.lat, service.lng]}>
              <Popup>
                <div className="font-bold text-sm">{service.name}</div>
                <div className="text-xs text-neutral-500 capitalize">{service.type} Station</div>
              </Popup>
           </Marker>
        ))}

        {/* Fit Bounds to History Locations to make sure all places are shown */}
        {mapLayer === "history" && historyLocations.length > 0 && (
          <FitHistoryBounds points={historyLocations} />
        )}

        {/* Location History Trails */}
        {mapLayer === "history" && historyLocations.map((pt, idx) => (
          <Marker 
            key={pt.id || idx} 
            position={[pt.lat, pt.lng]}
            icon={L.divIcon({
              className: 'history-marker',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="w-4 h-4 bg-blue-500/20 rounded-full absolute animate-ping"></div>
                  <div class="w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="p-2.5 font-sans min-w-[150px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Visited Place #{idx + 1}</span>
                </div>
                <div className="p-2 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1">
                  <p className="text-xs font-bold text-neutral-800 flex justify-between">
                    <span className="text-neutral-400 font-medium text-[10px] uppercase tracking-wider">Date:</span>
                    <span>{new Date(pt.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                  <p className="text-xs font-bold text-neutral-800 flex justify-between">
                    <span className="text-neutral-400 font-medium text-[10px] uppercase tracking-wider">Time:</span>
                    <span>{new Date(pt.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                  <p className="text-[9px] text-neutral-400 font-mono text-right italic pt-0.5 border-t border-dashed border-neutral-200">
                    {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {mapLayer === "history" && historyLocations.length > 1 && (
          <Polyline 
            positions={historyLocations.map(pt => [pt.lat, pt.lng])} 
            pathOptions={{ color: '#2563eb', weight: 3.5, dashArray: '6, 6', opacity: 0.8 }} 
          />
        )}

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
        {mapLayer === "history" && incidents.map(incident => incident.location && typeof incident.location.lat === 'number' && (
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
        {mapLayer === "history" && alerts.map(alert => alert.location && typeof alert.location.lat === 'number' && (
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
        {mapLayer === "history" && circleMembers.map(member => (
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

      {/* Map Actions Overlay Removed to avoid covering the bottom tabs navigation */}
      <ReportIncidentModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />

      {/* Downloads Modal */}
      <AnimatePresence>
        {showDownloads && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-48 left-4 right-4 md:bottom-20 md:left-6 md:right-auto md:w-96 z-[1002] bg-white rounded-[32px] border border-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
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
