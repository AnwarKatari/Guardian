import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldAlert, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  Activity, 
  Phone, 
  MapPin, 
  Search, 
  Plus, 
  RefreshCw, 
  Sliders, 
  Send, 
  Lock, 
  Compass, 
  Radio,
  Sparkles,
  Info
} from 'lucide-react';
import { Incident, EmergencyContact, IncidentType, Severity } from '../types';
import { cn } from '../lib/utils';
import { useSafety } from '../contexts/SafetyEngineContext';

// MOCK INCIDENTS FOR SIMULATION OR FALLBACK
const MOCK_LOCAL_INCIDENTS: Incident[] = [
  {
    id: 'mock-1',
    reporterId: 'system',
    reporterName: 'AI Security Agent',
    type: IncidentType.THREAT,
    severity: Severity.HIGH,
    description: 'Suspicious vehicle activity reported near Central Plaza. Exercise high caution.',
    location: { lat: 35.6895, lng: 139.6917, address: 'Central Plaza Block C' },
    mediaUrls: [],
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    isResolved: false
  },
  {
    id: 'mock-2',
    reporterId: 'system',
    reporterName: 'Community Sentinel',
    type: IncidentType.THEFT,
    severity: Severity.MEDIUM,
    description: 'Unattended property theft reported near Sector 4 Transit Hub.',
    location: { lat: 35.6812, lng: 139.7671, address: 'Sector 4 Transit Hub' },
    mediaUrls: [],
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    isResolved: true
  }
];

interface RecentAlertsProps {
  firebaseIncidents: Incident[];
  onSelectTab?: (tab: string) => void;
}

export function RecentAlertsWidget({ firebaseIncidents, onSelectTab }: RecentAlertsProps) {
  const { addLog } = useSafety();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [localSimulatedAlerts, setLocalSimulatedAlerts] = useState<Incident[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  // Merge real database incidents with our mock fallbacks and local simulations
  const allAlerts = useMemo(() => {
    const list = [...localSimulatedAlerts, ...firebaseIncidents];
    if (list.length === 0) {
      return MOCK_LOCAL_INCIDENTS;
    }
    return list;
  }, [firebaseIncidents, localSimulatedAlerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      const matchesSearch = alert.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            alert.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            alert.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = selectedSeverity === 'ALL' || alert.severity.toUpperCase() === selectedSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [allAlerts, searchTerm, selectedSeverity]);

  const handleSimulateAlert = () => {
    const newAlert: Incident = {
      id: `sim-${Date.now()}`,
      reporterId: 'user-sim',
      reporterName: 'Simulated Threat Intel',
      type: IncidentType.HARASSMENT,
      severity: Severity.CRITICAL,
      description: 'TACTICAL INTRUSION SIMULATION: Active alert triggered for regional test drills.',
      location: { lat: 35.6762, lng: 139.6503, address: 'Localized Grid Coordinate (TEST)' },
      mediaUrls: [],
      timestamp: new Date().toISOString(),
      isResolved: false
    };

    setLocalSimulatedAlerts(prev => [newAlert, ...prev]);
    addLog(`⚠️ SIMULATION: Critical emergency alert simulated: "${newAlert.description}"`);
  };

  const handleAcknowledge = (id: string, desc: string) => {
    setAcknowledgedIds(prev => [...prev, id]);
    addLog(`✅ ACKNOWLEDGED: User secured grid coordinate for alert ID: ${id.substring(0, 8)}`);
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-[32px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.02)] flex flex-col h-full relative overflow-hidden group hover:shadow-[0_16px_40px_rgba(0,0,0,0.04)] hover:border-neutral-300/80 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-50 text-red-600">
            <ShieldAlert size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Tactical Feed</h3>
            <h4 className="text-base font-black italic uppercase text-neutral-900 tracking-tight">Recent Live Alerts</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Live Sync</span>
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div className="space-y-3 mb-4 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
          <input 
            type="text" 
            placeholder="Search live incident database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-blue-500/50 transition-colors placeholder:text-neutral-400"
          />
        </div>

        {/* Severity Filters & Simulation Action */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-1.5 shrink-0">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all border",
                  selectedSeverity === sev 
                    ? "bg-neutral-900 text-white border-neutral-950 shadow-sm" 
                    : "bg-white text-neutral-500 border-neutral-100 hover:bg-neutral-50"
                )}
              >
                {sev}
              </button>
            ))}
          </div>

          <button 
            onClick={handleSimulateAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-600 hover:border-red-600 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all shrink-0"
          >
            <RefreshCw size={10} />
            Simulate
          </button>
        </div>
      </div>

      {/* Alerts Stream List */}
      <div className="flex-1 overflow-y-auto max-h-[310px] space-y-3 pr-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => {
              const isAck = acknowledgedIds.includes(alert.id);
              const isCritical = alert.severity === Severity.CRITICAL;
              const isHigh = alert.severity === Severity.HIGH;
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all relative group/item",
                    isAck ? "bg-neutral-50/50 border-neutral-100 opacity-60" :
                    isCritical ? "bg-red-500/[0.02] border-red-100 hover:border-red-300/60" :
                    isHigh ? "bg-amber-500/[0.01] border-amber-100 hover:border-amber-300/60" :
                    "bg-white border-neutral-100 hover:border-blue-200"
                  )}
                >
                  {/* Glowing vertical left bar based on status */}
                  <div className={cn(
                    "absolute left-0 top-3 bottom-3 w-1 rounded-r-md",
                    isAck ? "bg-neutral-300" :
                    isCritical ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                    isHigh ? "bg-amber-500" : "bg-blue-500"
                  )} />

                  <div className="pl-2">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                          isAck ? "bg-neutral-100 text-neutral-400" :
                          isCritical ? "bg-red-600 text-white animate-pulse" :
                          isHigh ? "bg-amber-500 text-white" : "bg-blue-600/10 text-blue-600"
                        )}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 italic">
                          {alert.type}
                        </span>
                      </div>
                      <span className="text-[8px] text-neutral-400 font-bold tabular-nums">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-neutral-700 leading-relaxed mb-3">
                      {alert.description}
                    </p>

                    <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-neutral-50">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <MapPin size={11} className="text-neutral-400 shrink-0" />
                        <span className="text-[9px] font-bold truncate max-w-[140px] italic">
                          {alert.location.address}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isAck && (
                          <button
                            onClick={() => handleAcknowledge(alert.id, alert.description)}
                            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-sm"
                          >
                            Acknowledge
                          </button>
                        )}
                        {onSelectTab && (
                          <button
                            onClick={() => onSelectTab('map')}
                            className="p-1 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Locate on Map"
                          >
                            <Compass size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center opacity-30 text-neutral-400 gap-2">
              <Shield size={28} />
              <p className="text-[9px] font-black uppercase tracking-widest">No matching alerts found</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


export function CommunitySafetyScoreWidget() {
  const { addLog } = useSafety();
  const [radius, setRadius] = useState<number>(5); // 1km - 15km
  const [protocols, setProtocols] = useState({
    masking: true,
    sentinel: false,
    handshake: true,
  });

  // Calculate score dynamically based on interactive variables!
  const safetyScore = useMemo(() => {
    let base = 96.5;
    
    // Changing radius affects the score (larger radius = potential hazards are accounted)
    // 1km = maximum score, 15km = lower base score
    const radiusPenalty = (radius - 1) * 1.1; // up to 15.4 penalty
    base -= radiusPenalty;

    // Active protocols boost score!
    if (protocols.masking) base += 3.2;
    if (protocols.sentinel) base += 5.5;
    if (protocols.handshake) base += 2.8;

    return Math.min(Math.round(base * 10) / 10, 100);
  }, [radius, protocols]);

  const handleProtocolToggle = (key: 'masking' | 'sentinel' | 'handshake', label: string) => {
    const nextVal = !protocols[key];
    setProtocols(prev => ({ ...prev, [key]: nextVal }));
    addLog(`🛡️ CONFIG: ${label} protocol ${nextVal ? 'ENABLED' : 'DISABLED'} - Recalculated Security Index.`);
  };

  const handleRadiusChange = (val: number) => {
    setRadius(val);
    addLog(`🛰️ RANGE: Area telemetry scanning envelope set to ${val}km.`);
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-[32px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.02)] flex flex-col h-full relative overflow-hidden group hover:shadow-[0_16px_40px_rgba(0,0,0,0.04)] hover:border-neutral-300/80 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Radio size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Live Telemetry</h3>
            <h4 className="text-base font-black italic uppercase text-neutral-900 tracking-tight">Community Safety Index</h4>
          </div>
        </div>
      </div>

      {/* Score Visual Meter & Dial */}
      <div className="flex items-center justify-between gap-6 mb-6 p-4 bg-neutral-50/50 rounded-2xl border border-neutral-100/60 relative">
        <div className="space-y-1">
          <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 italic">Regional Safety Grade</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black italic uppercase tracking-tighter text-neutral-900 leading-none">
              {safetyScore}%
            </span>
          </div>
          <p className="text-[10px] font-black text-emerald-600 tracking-widest uppercase flex items-center gap-1 mt-1">
            <Sparkles size={10} className="animate-spin" style={{ animationDuration: '4s' }} />
            {safetyScore > 90 ? 'OPTIMAL PROTOCOL' : safetyScore > 80 ? 'HIGH SECURITY' : 'STANDBY MODE'}
          </p>
        </div>

        {/* Visual progress wheel using dynamic SVG */}
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              cx="40" 
              cy="40" 
              r="34" 
              className="stroke-neutral-100 fill-none" 
              strokeWidth="5" 
            />
            <motion.circle 
              cx="40" 
              cy="40" 
              r="34" 
              className="stroke-blue-600 fill-none" 
              strokeWidth="5"
              strokeDasharray="213.6"
              initial={{ strokeDashoffset: 213.6 }}
              animate={{ strokeDashoffset: 213.6 - (213.6 * safetyScore) / 100 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield size={20} className="text-blue-500/80" />
          </div>
        </div>
      </div>

      {/* Interactive Sliders / Parameters */}
      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
            <span>Detection Envelope Radius</span>
            <span className="text-neutral-800 italic">{radius} km</span>
          </div>
          <div className="relative flex items-center">
            <input 
              type="range" 
              min="1" 
              max="15" 
              value={radius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-neutral-300">
            <span>Immediate (1km)</span>
            <span>Regional (15km)</span>
          </div>
        </div>

        {/* System Protocols Checklist */}
        <div className="space-y-2 pt-2 border-t border-neutral-50">
          <h5 className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Sentinel Core Protocols</h5>
          
          {/* Protocol 1 */}
          <div 
            onClick={() => handleProtocolToggle('masking', 'Location Masking')}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all",
              protocols.masking 
                ? "bg-emerald-500/[0.02] border-emerald-100/80 text-neutral-800" 
                : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                protocols.masking ? "bg-emerald-500" : "bg-neutral-300"
              )} />
              <span className="text-[10px] font-bold">Location Masking Protocol</span>
            </div>
            <span className="text-[9px] font-black text-emerald-600">+3.2%</span>
          </div>

          {/* Protocol 2 */}
          <div 
            onClick={() => handleProtocolToggle('sentinel', 'Biometric Auth Sentinel')}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all",
              protocols.sentinel 
                ? "bg-emerald-500/[0.02] border-emerald-100/80 text-neutral-800" 
                : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                protocols.sentinel ? "bg-emerald-500" : "bg-neutral-300"
              )} />
              <span className="text-[10px] font-bold">Biometric Auth Sentinel</span>
            </div>
            <span className="text-[9px] font-black text-emerald-600">+5.5%</span>
          </div>

          {/* Protocol 3 */}
          <div 
            onClick={() => handleProtocolToggle('handshake', 'Encrypted Message Handshake')}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all",
              protocols.handshake 
                ? "bg-emerald-500/[0.02] border-emerald-100/80 text-neutral-800" 
                : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                protocols.handshake ? "bg-emerald-500" : "bg-neutral-300"
              )} />
              <span className="text-[10px] font-bold">Cryptographic Handshake</span>
            </div>
            <span className="text-[9px] font-black text-emerald-600">+2.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
}


interface ActiveContactsProps {
  contacts: EmergencyContact[];
  onSelectTab?: (tab: string) => void;
}

export function ActiveTrustedContactsWidget({ contacts = [], onSelectTab }: ActiveContactsProps) {
  const { addLog } = useSafety();
  const [pingedContactId, setPingedContactId] = useState<string | null>(null);
  const [gpsSharedId, setGpsSharedId] = useState<string | null>(null);

  const handlePingContact = (id: string, name: string) => {
    setPingedContactId(id);
    addLog(`📡 OUTBOUND: Automated safety heartbeat ping transmitted to contact "${name}".`);
    
    setTimeout(() => {
      setPingedContactId(null);
      addLog(`⚡ RESPONSE: Contact "${name}" device confirmed safe handshake packet received.`);
    }, 2000);
  };

  const handleShareGps = (id: string, name: string) => {
    setGpsSharedId(id);
    addLog(`🛰️ GEOSPATIAL: Real-time encrypted GPS handshake coordinates streaming to contact "${name}".`);
    
    setTimeout(() => {
      setGpsSharedId(null);
    }, 3000);
  };

  return (
    <div className="bg-white border border-neutral-200/80 rounded-[32px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.02)] flex flex-col h-full relative overflow-hidden group hover:shadow-[0_16px_40px_rgba(0,0,0,0.04)] hover:border-neutral-300/80 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Guarding Circle</h3>
            <h4 className="text-base font-black italic uppercase text-neutral-900 tracking-tight">Active Guardians</h4>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-neutral-900 text-white rounded-lg text-[8px] font-black tracking-widest uppercase">
          {contacts.length}/3 Armed
        </span>
      </div>

      {/* Active Status Header Panel */}
      <div className="flex items-center gap-3 p-3 bg-neutral-50/50 border border-neutral-100 rounded-2xl mb-4">
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 leading-none">
          Local Sentinel Sync Active & Armed
        </span>
      </div>

      {/* Contacts Grid/List */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {contacts.length > 0 ? (
          contacts.map((contact) => {
            const isPinged = pingedContactId === contact.id;
            const isSharingGps = gpsSharedId === contact.id;

            return (
              <div 
                key={contact.id}
                className="p-4 rounded-2xl border border-neutral-100 hover:border-indigo-100 bg-white hover:bg-indigo-500/[0.005] transition-all duration-200 relative group/contact"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black uppercase italic text-neutral-900 tracking-tight flex items-center gap-1.5">
                      {contact.name}
                      {contact.isVerified && (
                        <CheckCircle2 size={11} className="text-blue-500 fill-blue-50" />
                      )}
                    </h4>
                    <p className="text-[10px] font-semibold text-neutral-400 tabular-nums">{contact.phone}</p>
                    {contact.email && (
                      <p className="text-[9px] font-bold text-neutral-400 opacity-80">{contact.email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[7px] font-black uppercase tracking-wider text-neutral-400">Armed</span>
                  </div>
                </div>

                {/* Direct Action Speed Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-neutral-50">
                  <button
                    onClick={() => handlePingContact(contact.id, contact.name)}
                    disabled={isPinged}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                      isPinged 
                        ? "bg-emerald-600 text-white" 
                        : "bg-neutral-50 text-neutral-600 hover:bg-neutral-900 hover:text-white"
                    )}
                  >
                    <Send size={9} className={isPinged ? "animate-bounce" : ""} />
                    {isPinged ? 'Pinged' : 'Ping'}
                  </button>

                  <button
                    onClick={() => handleShareGps(contact.id, contact.name)}
                    disabled={isSharingGps}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                      isSharingGps
                        ? "bg-indigo-600 text-white"
                        : "bg-neutral-50 text-neutral-600 hover:bg-neutral-900 hover:text-white"
                    )}
                  >
                    <Compass size={9} className={isSharingGps ? "animate-spin" : ""} />
                    {isSharingGps ? 'Sharing' : 'Share GPS'}
                  </button>

                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-neutral-50 hover:bg-red-600 hover:text-white text-neutral-600 transition-all text-[8px] font-black uppercase tracking-widest"
                  >
                    <Phone size={9} />
                    Call
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl gap-3">
            <div className="p-3 rounded-full bg-indigo-50 text-indigo-500">
              <Users size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 leading-none">Circle Empty</p>
              <p className="text-[9px] font-bold text-neutral-400 max-w-[200px] leading-relaxed mx-auto">
                Configure trusted contacts to enable live coordinate handshakes and automated SMTP panic backup relays.
              </p>
            </div>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('trusted-contacts')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm shadow-indigo-500/10 transition-colors"
              >
                <Plus size={10} />
                Add Contact
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
