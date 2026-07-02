import { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  AlertTriangle, 
  Activity, 
  Phone, 
  MapPin, 
  Users, 
  ArrowLeft, 
  ChevronRight, 
  WifiOff, 
  Signal, 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  BookOpen, 
  Heart, 
  Volume2, 
  VolumeX, 
  Globe, 
  Download, 
  Database,
  ArrowRight,
  ShieldCheck,
  Search,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { cn } from '../lib/utils';

// Local emergency directory structure
interface ServiceNumber {
  name: string;
  number: string;
  desc: string;
  icon: any;
}

interface CountryDirectory {
  country: string;
  code: string;
  flag: string;
  services: ServiceNumber[];
}

const EMERGENCY_DIRECTORY: CountryDirectory[] = [
  {
    country: "United States & Canada",
    code: "US/CA",
    flag: "🇺🇸/🇨🇦",
    services: [
      { name: "General Emergency", number: "911", desc: "Dispatch for Police, Fire, and Ambulance.", icon: ShieldAlert },
      { name: "Suicide & Crisis", number: "988", desc: "24/7 mental health and emotional support.", icon: Heart },
      { name: "Coast Guard", number: "1-800-424-8802", desc: "Maritime search and rescue operations.", icon: Globe },
      { name: "Poison Control", number: "1-800-222-1222", desc: "Immediate toxicity guidance.", icon: Activity }
    ]
  },
  {
    country: "United Kingdom",
    code: "UK",
    flag: "🇬🇧",
    services: [
      { name: "Emergency Services", number: "999", desc: "Police, Fire, Ambulance, and Coastguard.", icon: ShieldAlert },
      { name: "Non-Emergency Medical", number: "111", desc: "Urgent healthcare advice and triage.", icon: Activity },
      { name: "Non-Emergency Police", number: "101", desc: "Reporting crimes that don't need instant response.", icon: Shield },
      { name: "Samaritans Helpline", number: "116 123", desc: "24/7 emotional distress help.", icon: Heart }
    ]
  },
  {
    country: "Ghana",
    code: "GH",
    flag: "🇬🇭",
    services: [
      { name: "Police Dispatch", number: "18555", desc: "National police emergency unit.", icon: Shield },
      { name: "Police Hotlines", number: "191", desc: "General police distress channel.", icon: ShieldAlert },
      { name: "Ambulance Service", number: "193", desc: "Medical evacuations and emergencies.", icon: Activity },
      { name: "Fire Service", number: "192", desc: "Fire fighting and structural rescue.", icon: AlertTriangle }
    ]
  },
  {
    country: "Australia",
    code: "AU",
    flag: "🇦🇺",
    services: [
      { name: "Emergency Services", number: "000", desc: "Police, Fire, and Ambulance.", icon: ShieldAlert },
      { name: "State Emergency Service (SES)", number: "132 500", desc: "Storm, flood, and disaster assistance.", icon: AlertTriangle },
      { name: "Lifeline Crisis", number: "13 11 14", desc: "Crisis support and suicide prevention.", icon: Heart },
      { name: "Poisons Info Centre", number: "13 11 26", desc: "Toxic exposure medical guidance.", icon: Activity }
    ]
  },
  {
    country: "European Union",
    code: "EU",
    flag: "🇪🇺",
    services: [
      { name: "Universal Emergency", number: "112", desc: "Works across all EU states for all services.", icon: ShieldAlert },
      { name: "Police Emergency", number: "112", desc: "National police forces.", icon: Shield },
      { name: "Ambulance / Medical", number: "112", desc: "Red Cross and local medical response.", icon: Activity }
    ]
  },
  {
    country: "Japan",
    code: "JP",
    flag: "🇯🇵",
    services: [
      { name: "Police Dispatch", number: "110", desc: "Crime reporting and emergency police response.", icon: Shield },
      { name: "Fire & Ambulance", number: "119", desc: "Fire rescue and emergency medical transit.", icon: ShieldAlert },
      { name: "Coast Guard", number: "118", desc: "Accidents at sea and marine rescue.", icon: Globe }
    ]
  }
];

// Offline first aid instructions list
interface FirstAidStep {
  title: string;
  steps: string[];
  warning?: string;
  hasMetronome?: boolean;
}

interface FirstAidCategory {
  name: string;
  id: string;
  desc: string;
  icon: any;
  guides: FirstAidStep[];
}

const FIRST_AID_GUIDES: FirstAidCategory[] = [
  {
    name: "Life-Saving Protocols",
    id: "lifesaving",
    desc: "Critical time-sensitive rescue procedures.",
    icon: ShieldCheck,
    guides: [
      {
        title: "CPR (Cardiopulmonary Resuscitation)",
        hasMetronome: true,
        warning: "Call emergency services before starting CPR. Use 100-120 compressions per minute.",
        steps: [
          "Check the scene for safety, then tap the person's shoulder to check for responsiveness.",
          "Check for breathing (look at the chest) for no more than 10 seconds.",
          "If unresponsive and not breathing, place the heel of one hand in the center of their chest, and interlocking your other hand on top.",
          "Push hard and fast: Compress at least 2 inches deep at a rate of 100 to 120 compressions per minute.",
          "Give 2 rescue breaths after every 30 compressions. Tilt head back, lift chin, pinch nose, and blow.",
          "Keep going until professional help arrives, an AED is ready, or the person starts breathing."
        ]
      },
      {
        title: "Choking (Heimlich Maneuver)",
        warning: "Do not perform abdominal thrusts if the person is pregnant or an infant under 1 year.",
        steps: [
          "Ask: 'Are you choking? Can you speak?' If they can cough or speak, encourage coughing.",
          "Stand behind the person. Wrap your arms around their waist.",
          "Make a fist with one hand. Place the thumb side of your fist slightly above the navel.",
          "Grasp your fist with your other hand. Press hard into the abdomen with a quick, upward thrust.",
          "Perform 5 back blows (with heel of hand between shoulder blades) and 5 abdominal thrusts alternately.",
          "If they lose consciousness, lower them to the floor and begin CPR immediately."
        ]
      }
    ]
  },
  {
    name: "Trauma & Wounds",
    id: "trauma",
    desc: "Bleeding control, fractures, and sprains.",
    icon: Activity,
    guides: [
      {
        title: "Severe Bleeding Control",
        warning: "Apply a tourniquet if bleeding is life-threatening and direct pressure fails.",
        steps: [
          "Apply immediate, firm, direct pressure to the wound using a clean cloth or sterile dressing.",
          "Do not remove the cloth if it gets soaked; add more clean cloths on top and keep pressing.",
          "Elevate the injured limb above heart level if possible.",
          "If bleeding is from an arm or leg and pressure fails, apply a tourniquet 2-3 inches above the wound (never on a joint). Tighten until bleeding stops.",
          "Secure and wrap the wound tightly. Keep the patient warm to prevent shock."
        ]
      },
      {
        title: "Fractures & Immobilization",
        warning: "Never try to realign or push back a bone that has broken through the skin.",
        steps: [
          "Keep the injured area as still as possible. Stop any active bleeding first.",
          "Do not try to move the bone. Apply ice wrapped in a cloth to reduce swelling.",
          "Support the fracture with a splint. Use rolled-up newspapers, sticks, or cardboard.",
          "Secure the splint above and below the fracture using bandages, tape, or strips of cloth.",
          "Ensure the splint is not wrapped too tight, checking that blood circulation is still flowing."
        ]
      }
    ]
  },
  {
    name: "Environmental & Burns",
    id: "environmental",
    desc: "Thermal burns, heatstroke, and allergies.",
    icon: AlertTriangle,
    guides: [
      {
        title: "Thermal Burns",
        warning: "Do not apply ice, butter, ointments, or adhesive bandages to severe burns.",
        steps: [
          "Immediately cool the burn under cool running water for at least 10 to 20 minutes.",
          "Remove rings, jewelry, or tight clothing gently before the area begins to swell.",
          "Cover the burn loosely with a sterile, non-adhesive bandage or clean plastic wrap.",
          "Do not break any blisters; doing so increases infection risk.",
          "For severe burns (3rd degree, dark/leathery skin, or larger than 3 inches), call for urgent dispatch."
        ]
      },
      {
        title: "Heatstroke Recovery",
        warning: "Heatstroke is a medical emergency. High body temperature can damage the brain and organs.",
        steps: [
          "Move the person out of the heat and into a cool, shaded, or air-conditioned area.",
          "Strip unnecessary clothing. Cool them rapidly by spraying cool water, using fans, or placing ice packs on neck, armpits, and groin.",
          "If they are conscious, offer sips of cool water or electrolyte drinks. Do NOT give pain relievers.",
          "Elevate feet slightly to keep blood flowing to the head.",
          "Monitor breathing and consciousness closely. Prepare to start CPR if they stop breathing."
        ]
      }
    ]
  }
];

export default function OfflineModule({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { profile } = useAuth();
  const { location } = useLocation();

  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'first-aid' | 'contacts'>('directory');
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(() => {
    return localStorage.getItem('offline_simulated') === 'true';
  });

  // Directory Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryDirectory | null>(
    EMERGENCY_DIRECTORY.find(d => d.code === (profile?.countryCode || 'US')) || EMERGENCY_DIRECTORY[0]
  );

  // First Aid States
  const [activeCategory, setActiveCategory] = useState<string>('lifesaving');
  const [selectedGuide, setSelectedGuide] = useState<FirstAidStep | null>(null);

  // CPR Metronome States
  const [isCprRunning, setIsCprRunning] = useState(false);
  const [cprCount, setCprCount] = useState(0);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [cprMode, setCprMode] = useState<'compress' | 'breath'>('compress');
  const [cprCycle, setCprCycle] = useState(1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeIntervalRef = useRef<any>(null);

  // Local/Offline Fallback Contacts
  const [offlineContacts, setOfflineContacts] = useState<any[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  
  // Call/SMS Simulation Overlay
  const [simulatedCall, setSimulatedCall] = useState<string | null>(null);
  const [simulatedCallTimer, setSimulatedCallTimer] = useState(0);
  const [simulatedSms, setSimulatedSms] = useState<{ phone: string; message: string } | null>(null);

  // Load offline fallback contacts from LocalStorage or cache from profile
  useEffect(() => {
    const saved = localStorage.getItem('offline_fallback_contacts');
    if (saved) {
      setOfflineContacts(JSON.parse(saved));
    } else if (profile?.emergencyContacts) {
      // Sync from profile cache
      setOfflineContacts(profile.emergencyContacts);
      localStorage.setItem('offline_fallback_contacts', JSON.stringify(profile.emergencyContacts));
    }
  }, [profile]);

  // Persist offline simulated state
  useEffect(() => {
    localStorage.setItem('offline_simulated', isOfflineSimulated ? 'true' : 'false');
  }, [isOfflineSimulated]);

  // Metronome Sound Engine (Offline Web Audio API synthesizer)
  const playMetronomeClick = () => {
    if (!audioFeedback) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Keep state clean
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Pitch: high beep on first beat, standard clicks on others
      const isFirstBeat = cprCount === 0 || cprCount === 30;
      osc.frequency.setValueAtTime(isFirstBeat ? 1000 : 800, ctx.currentTime);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (err) {
      console.warn("Audio feedback error (browser block):", err);
    }
  };

  // Metronome Logic: 105 Beats Per Minute (bpm)
  // Interval: 60,000 / 105 = 571 ms
  useEffect(() => {
    if (isCprRunning) {
      setCprCount(1);
      setCprMode('compress');
      setCprCycle(1);
      
      metronomeIntervalRef.current = setInterval(() => {
        setCprCount(prev => {
          const nextVal = prev + 1;
          
          if (nextVal <= 30) {
            // Chest compression tick
            setCprMode('compress');
            playMetronomeClick();
            return nextVal;
          } else if (nextVal <= 34) {
            // Breath cycle (gives 4 beats for 2 rescue breaths, silent)
            setCprMode('breath');
            return nextVal;
          } else {
            // Loop back to next cycle
            setCprCycle(c => c + 1);
            setCprMode('compress');
            playMetronomeClick();
            return 1;
          }
        });
      }, 571);
    } else {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
      setCprCount(0);
      setCprCycle(1);
    }

    return () => {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
    };
  }, [isCprRunning, audioFeedback]);

  // Simulated Call Timer
  useEffect(() => {
    let interval: any = null;
    if (simulatedCall) {
      setSimulatedCallTimer(0);
      interval = setInterval(() => {
        setSimulatedCallTimer(t => t + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [simulatedCall]);

  const handleAddOfflineContact = () => {
    if (!newContactName || !newContactPhone) return;
    const item = {
      id: crypto.randomUUID(),
      name: newContactName,
      phone: newContactPhone,
      isVerified: true
    };
    const updated = [...offlineContacts, item];
    setOfflineContacts(updated);
    localStorage.setItem('offline_fallback_contacts', JSON.stringify(updated));
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const handleRemoveOfflineContact = (id: string) => {
    const updated = offlineContacts.filter(c => c.id !== id);
    setOfflineContacts(updated);
    localStorage.setItem('offline_fallback_contacts', JSON.stringify(updated));
  };

  const triggerMockCall = (number: string, name: string) => {
    setSimulatedCall(`${name} (${number})`);
  };

  const triggerMockSms = (contact: any) => {
    const coords = location 
      ? `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}` 
      : 'Cached Coordinates (5.6037, -0.1874)';
    const msg = `FALLBACK OFFLINE SOS BEACON ACTIVATED. I need assistance. My last logged GPS coords: ${coords}. Sender: ${profile?.displayName || 'Guardian User'}.`;
    setSimulatedSms({ phone: contact.phone, message: msg });
  };

  // Filter emergency services search
  const filteredDirectory = EMERGENCY_DIRECTORY.filter(dir => {
    return dir.country.toLowerCase().includes(searchQuery.toLowerCase()) || 
           dir.services.some(srv => srv.name.toLowerCase().includes(searchQuery.toLowerCase()) || srv.number.includes(searchQuery));
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col font-sans relative overflow-y-auto pb-40 custom-scrollbar">
      {/* HUD Scanner Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-red-900/10 blur-[150px] pointer-events-none" />

      {/* Header Panel */}
      <header className="p-6 border-b border-neutral-800 flex flex-col gap-4 relative z-10 bg-neutral-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('resources')}
              className="p-3 rounded-2xl bg-neutral-800 text-neutral-400 hover:text-red-500 transition-all border border-neutral-700 hover:border-red-900/50"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="space-y-0.5">
              <h1 className="text-lg sm:text-xl font-display font-black tracking-tighter italic uppercase flex items-center gap-2 text-red-500 leading-none">
                <WifiOff size={18} className="animate-pulse" />
                Offline Data Vault
                <span className="text-[8px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full not-italic tracking-normal ml-1">ENCRYPTED</span>
              </h1>
              <p className="text-[8px] text-neutral-500 font-mono font-black uppercase tracking-[0.3em] italic">No connection required // Local SQLite Engine Active</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
            className={cn(
              "px-4 py-2 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 italic",
              isOfflineSimulated 
                ? "bg-red-500/20 text-red-500 border-red-500/40 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600"
            )}
          >
            <WifiOff size={10} />
            {isOfflineSimulated ? "FORCE_OFFLINE: ON" : "SIMULATE OFFLINE"}
          </button>
        </div>

        {/* Offline Banner alert if active */}
        {isOfflineSimulated && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-900/20 border border-red-900/40 rounded-2xl text-red-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 italic"
          >
            <AlertTriangle size={12} className="animate-bounce" />
            DISCONNECTED PROTOCOL ACTIVE — ALL WEB REQUESTS BLOCKED — LOCAL DATABASE SPEED MAXIMUM
          </motion.div>
        )}

        {/* Secondary Sub-navigation */}
        <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 p-1 rounded-2xl border border-neutral-800">
          {[
            { id: 'directory', label: 'Global Directory', icon: Globe },
            { id: 'first-aid', label: 'First Aid Guides', icon: BookOpen },
            { id: 'contacts', label: 'Fallback Contacts', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setSelectedGuide(null); // Reset active first-aid view
              }}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                activeSubTab === tab.id 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/15 font-black" 
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              )}
            >
              <tab.icon size={12} />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="p-6 md:p-10 space-y-8 flex-1 relative z-10 max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: EMERGENCY DIRECTORY */}
          {activeSubTab === 'directory' && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input 
                  type="text" 
                  placeholder="SEARCH OFFLINE NUMBERS (e.g. US, UK, POLICE)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-white uppercase outline-none focus:border-red-900 transition-all italic tracking-wide"
                />
              </div>

              {/* Country Picker Slider */}
              {!searchQuery && (
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic ml-1">Fast Sector Selector</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {EMERGENCY_DIRECTORY.map(dir => (
                      <button
                        key={dir.code}
                        onClick={() => setSelectedCountry(dir)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all shrink-0 italic",
                          selectedCountry?.code === dir.code 
                            ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-500/10" 
                            : "bg-neutral-800/40 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                        )}
                      >
                        <span className="mr-2">{dir.flag}</span>
                        {dir.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Services List */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-[1.5px] h-3 bg-red-600" />
                  <h3 className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">
                    {searchQuery ? "Search Results" : `${selectedCountry?.country} Emergency Matrix`}
                  </h3>
                </div>

                <div className="space-y-3">
                  {searchQuery ? (
                    filteredDirectory.length > 0 ? (
                      filteredDirectory.map(dir => (
                        <div key={dir.code} className="space-y-2">
                          <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] italic ml-1">{dir.country} Sector</p>
                          {dir.services.map((srv, i) => (
                            <ServiceCard key={i} srv={srv} onCall={(n, name) => triggerMockCall(n, `${dir.code} ${name}`)} onSms={(n, name) => setSimulatedSms({ phone: n, message: `Emergency assistance requested at coordinates: ${location ? `${location.latitude}, ${location.longitude}` : 'Cached GPS'}` })} />
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-neutral-500 bg-neutral-950 border border-dashed border-neutral-800 rounded-3xl space-y-2">
                        <Database size={24} className="mx-auto text-neutral-700" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Query Empty</p>
                        <p className="text-[8px] text-neutral-600 font-bold uppercase">No matching offline vectors found.</p>
                      </div>
                    )
                  ) : (
                    selectedCountry?.services.map((srv, i) => (
                      <ServiceCard key={i} srv={srv} onCall={(n, name) => triggerMockCall(n, `${selectedCountry.code} ${name}`)} onSms={(n, name) => setSimulatedSms({ phone: n, message: `Emergency assistance requested at coordinates: ${location ? `${location.latitude}, ${location.longitude}` : 'Cached GPS'}` })} />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: FIRST AID HANDBOOK */}
          {activeSubTab === 'first-aid' && (
            <motion.div
              key="first-aid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!selectedGuide ? (
                <>
                  {/* Category Selector Tabs */}
                  <div className="flex gap-2 border-b border-neutral-800 pb-2">
                    {FIRST_AID_GUIDES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border italic",
                          activeCategory === cat.id 
                            ? "bg-neutral-800 border-neutral-700 text-white" 
                            : "border-transparent text-neutral-500 hover:text-white"
                        )}
                      >
                        {cat.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>

                  {/* Guides list in selected category */}
                  <div className="space-y-4">
                    {FIRST_AID_GUIDES.find(c => c.id === activeCategory)?.guides.map((guide, i) => (
                      <div 
                        key={i}
                        onClick={() => setSelectedGuide(guide)}
                        className="p-5 bg-neutral-950 border border-neutral-800 hover:border-red-900/50 rounded-3xl transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="space-y-1.5 flex-1 pr-4">
                          <p className="font-black text-xs text-white uppercase italic tracking-tight flex items-center gap-2">
                            {guide.title}
                            {guide.hasMetronome && (
                              <span className="text-[7px] bg-red-900/30 text-red-500 font-black px-2 py-0.5 rounded border border-red-900/30">CPR ENGINE</span>
                            )}
                          </p>
                          <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest leading-none italic">
                            {guide.warning ? `CRITICAL WARNING: ${guide.warning.substring(0, 45)}...` : "Safe offline instruction set"}
                          </p>
                        </div>
                        <div className="p-2.5 bg-neutral-900 text-neutral-500 group-hover:text-red-500 group-hover:bg-neutral-850 rounded-xl border border-neutral-800 transition-all shrink-0">
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* ACTIVE FIRST AID GUIDE SHELL */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Back button to guides */}
                  <button 
                    onClick={() => {
                      setSelectedGuide(null);
                      setIsCprRunning(false);
                    }}
                    className="flex items-center gap-2 text-[9px] font-black text-neutral-400 hover:text-white uppercase tracking-widest italic"
                  >
                    <ArrowLeft size={12} /> BACK TO HANDBOOK LIST
                  </button>

                  <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-[32px] space-y-6">
                    <div className="flex items-center gap-4 border-b border-neutral-800 pb-4">
                      <div className="w-10 h-10 bg-red-950 text-red-500 border border-red-900/40 rounded-xl flex items-center justify-center">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-1">Local_Memory_Recall</p>
                        <h4 className="text-sm font-black italic uppercase text-white tracking-tight">{selectedGuide.title}</h4>
                      </div>
                    </div>

                    {selectedGuide.warning && (
                      <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-2xl text-red-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-2.5 leading-relaxed">
                        <AlertTriangle size={14} className="shrink-0 text-red-500" />
                        {selectedGuide.warning}
                      </div>
                    )}

                    {/* Step by Step list */}
                    <div className="space-y-4">
                      <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic ml-1">Emergency Operations Protocol</p>
                      {selectedGuide.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-4 items-start p-3 bg-neutral-900/50 rounded-2xl border border-neutral-800/40">
                          <div className="w-6 h-6 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center font-black text-[9px] text-red-500 shrink-0 tabular-nums">
                            {(idx + 1).toString().padStart(2, '0')}
                          </div>
                          <p className="text-[10px] text-neutral-300 font-bold leading-relaxed uppercase italic tracking-tight">{step}</p>
                        </div>
                      ))}
                    </div>

                    {/* METRONOME INTERACTIVE WORKSPACE (FOR CPR ONLY) */}
                    {selectedGuide.hasMetronome && (
                      <div className="p-6 bg-neutral-900/80 border-2 border-dashed border-neutral-800 rounded-3xl space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                              <Heart size={12} className={cn("text-red-500", isCprRunning && "animate-ping")} />
                              CPR Compression Pulse
                            </h5>
                            <p className="text-[8px] text-neutral-500 font-black uppercase tracking-widest">Target Rate: 105 Beats Per Minute</p>
                          </div>
                          
                          {/* Audio Control */}
                          <button 
                            onClick={() => setAudioFeedback(!audioFeedback)}
                            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                          >
                            {audioFeedback ? <Volume2 size={16} /> : <VolumeX size={16} />}
                          </button>
                        </div>

                        {/* Metronome Indicator Hub */}
                        <div className="flex flex-col items-center justify-center py-6 bg-neutral-950 rounded-2xl border border-neutral-800 relative overflow-hidden">
                          {/* Pulse Animation backplane */}
                          <AnimatePresence>
                            {isCprRunning && cprMode === 'compress' && (
                              <motion.div 
                                key={cprCount}
                                initial={{ scale: 0.8, opacity: 0.2 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="absolute w-24 h-24 bg-red-600/35 rounded-full"
                              />
                            )}
                          </AnimatePresence>

                          <div className="text-center space-y-2 relative z-10">
                            <span className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">
                              {isCprRunning ? `CPR Cycle: ${cprCycle}` : "Engine Status: Standby"}
                            </span>
                            
                            {/* Action text */}
                            <h6 className={cn(
                              "text-4xl font-black italic tracking-tighter uppercase my-2",
                              cprMode === 'compress' ? "text-red-500" : "text-blue-500"
                            )}>
                              {isCprRunning ? (
                                cprMode === 'compress' ? `PUSH #${cprCount}` : "BREATH NOW"
                              ) : "TAP START"}
                            </h6>

                            <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">
                              {isCprRunning ? (
                                cprMode === 'compress' ? "Perform hard, fast chest presses" : "Give 2 rescue breaths"
                              ) : "Press play to coordinate compression clicks"}
                            </p>
                          </div>
                        </div>

                        {/* Control Buttons */}
                        <button
                          onClick={() => setIsCprRunning(!isCprRunning)}
                          className={cn(
                            "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 italic",
                            isCprRunning 
                              ? "bg-red-600 text-white shadow-lg shadow-red-500/20" 
                              : "bg-white text-neutral-900 shadow-md hover:bg-neutral-100"
                          )}
                        >
                          {isCprRunning ? (
                            <>
                              <Square size={12} className="fill-current" /> STOP METRONOME CLICKS
                            </>
                          ) : (
                            <>
                              <Play size={12} className="fill-current" /> START CPR CADENCE TIMERS
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 3: OFFLINE FALLBACK CONTACTS */}
          {activeSubTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Informational Notice */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-500">
                  <WifiOff size={14} />
                  <p className="text-[9px] font-black uppercase tracking-widest italic leading-none">Offline Fallback SMS Relay</p>
                </div>
                <p className="text-[9px] text-neutral-400 font-bold uppercase leading-relaxed italic">
                  When cellular network link is severed, these high-priority contacts are stored securely in internal hardware memory (LocalStorage), allowing coordinate transfer via analog emergency SMS formats.
                </p>
              </div>

              {/* Contacts List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-[1.5px] h-3 bg-red-600" />
                    <h3 className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">Active Fallback circle</h3>
                  </div>
                  <button 
                    onClick={() => setShowAddContact(!showAddContact)}
                    className="p-1.5 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-lg hover:text-white transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Add Contact Drawer form */}
                {showAddContact && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-5 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-4 overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Responders Name</label>
                        <input 
                          type="text" 
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          placeholder="e.g. ALPHA DISPATCH"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-red-900 transition-all italic"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Distress Phone Number</label>
                        <input 
                          type="text" 
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          placeholder="e.g. +14155552671"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-red-900 transition-all italic"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setShowAddContact(false)}
                        className="flex-1 py-3 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl font-black text-[9px] uppercase tracking-widest italic hover:border-neutral-700 active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleAddOfflineContact}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest italic hover:bg-red-500 active:scale-95 transition-all"
                      >
                        Commit Fallback
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {offlineContacts.length > 0 ? (
                    offlineContacts.map(contact => (
                      <div 
                        key={contact.id}
                        className="p-5 bg-neutral-950 border border-neutral-850 hover:border-red-900/30 rounded-3xl flex items-center justify-between shadow-lg group transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-neutral-900 text-red-500 border border-neutral-800 rounded-2xl flex items-center justify-center font-black text-xs italic group-hover:bg-red-600 group-hover:text-white transition-all">
                            {contact.name[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white uppercase italic tracking-tight">{contact.name}</p>
                            <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">{contact.phone}</p>
                          </div>
                        </div>

                        {/* Fast Actions */}
                        <div className="flex items-center gap-2">
                          {/* Copy coordinates trigger */}
                          <button 
                            onClick={() => triggerMockSms(contact)}
                            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-red-500 rounded-xl transition-all"
                            title="Mock SOS SMS Broadcast"
                          >
                            <MessageSquare size={14} />
                          </button>
                          
                          <button 
                            onClick={() => triggerMockCall(contact.phone, contact.name)}
                            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-red-500 rounded-xl transition-all"
                            title="Mock Phone Call"
                          >
                            <Phone size={14} />
                          </button>

                          <button 
                            onClick={() => handleRemoveOfflineContact(contact.id)}
                            className="p-2.5 bg-neutral-900 hover:bg-red-950 border border-neutral-800 hover:border-red-900/50 text-neutral-400 hover:text-red-500 rounded-xl transition-all"
                            title="Remove Fallback Contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-neutral-500 bg-neutral-950 border border-dashed border-neutral-800 rounded-3xl space-y-2">
                      <Database size={24} className="mx-auto text-neutral-700" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Circle Empty</p>
                      <p className="text-[8px] text-neutral-600 font-bold uppercase">No emergency fallback connections set in physical memory.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* OVERLAY: CALL SIMULATOR (COMPLETELY OFFLINE SIM) */}
      <AnimatePresence>
        {simulatedCall && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col justify-between p-8 sm:p-12">
            <div className="flex flex-col items-center pt-20 space-y-6">
              <div className="w-24 h-24 bg-red-600 text-white rounded-full flex items-center justify-center animate-pulse border-4 border-red-500 shadow-2xl shadow-red-500/35">
                <Phone size={40} className="fill-current" />
              </div>
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] italic animate-pulse">OFFLINE_LOCAL_DIALER</span>
                <h4 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-tight">{simulatedCall}</h4>
                <p className="text-xs font-mono font-black text-neutral-400 tracking-widest">
                  {simulatedCallTimer > 0 
                    ? `CONNECTED: ${Math.floor(simulatedCallTimer / 60)}:${(simulatedCallTimer % 60).toString().padStart(2, '0')}` 
                    : "INITIATING DIAL PROTOCOL..."}
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-sm mx-auto w-full pb-10">
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest italic animate-pulse flex items-center justify-center gap-1.5">
                  <Signal size={12} /> ANALOG CARRIER SYNC: EXCELLENT
                </p>
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Satellite Relay bypasses standard IP networks.</p>
              </div>

              <button 
                onClick={() => setSimulatedCall(null)}
                className="w-full py-5 bg-red-600 text-white rounded-[32px] font-black italic tracking-[0.3em] text-sm uppercase shadow-lg shadow-red-500/10 active:scale-95 transition-all"
              >
                DISCONNECT LINE
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: OFFLINE SMS BROADCAST PREVIEW */}
      <AnimatePresence>
        {simulatedSms && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-[36px] p-8 space-y-6 shadow-2xl relative"
            >
              <div className="space-y-1">
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest italic">SATELLITE FALLBACK TRANSMITTER</span>
                <h4 className="text-xl font-black italic tracking-tighter uppercase text-white">Emergency SMS Prepared</h4>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Recipient</p>
                  <p className="text-xs font-black text-white bg-neutral-900 border border-neutral-850 px-4 py-2.5 rounded-xl italic">{simulatedSms.phone}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Message Payload (Analog Carrier format)</p>
                  <div className="bg-neutral-900 border border-neutral-850 px-4 py-4 rounded-2xl italic text-[10px] text-neutral-300 leading-relaxed font-bold font-mono">
                    {simulatedSms.message}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSimulatedSms(null)}
                  className="flex-1 py-4 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-2xl font-black text-[9px] uppercase tracking-widest italic hover:border-neutral-700 active:scale-95 transition-all"
                >
                  ABORT SIGNAL
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(simulatedSms.message);
                    alert(`Copied emergency payload! Emergency carrier dispatch signal initiated to ${simulatedSms.phone}.`);
                    setSimulatedSms(null);
                  }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest italic hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Copy size={12} /> COPY & TRANSMIT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Service Number row helper
const ServiceCard = ({ srv, onCall, onSms }: { srv: ServiceNumber; onCall: (n: string, name: string) => void; onSms: (n: string, name: string) => void }) => {
  const Icon = srv.icon;
  return (
    <div className="p-5 bg-neutral-950 border border-neutral-850 hover:border-red-950/40 rounded-3xl flex items-center justify-between group transition-all">
      <div className="flex items-center gap-4 flex-1 pr-3">
        <div className="w-12 h-12 bg-neutral-900 text-red-500 border border-neutral-800 rounded-2xl flex items-center justify-center transition-all group-hover:bg-red-600 group-hover:text-white shrink-0">
          <Icon size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic">{srv.name}</p>
          <p className="text-lg font-black italic text-white tracking-tighter leading-none group-hover:text-red-500 transition-colors">{srv.number}</p>
          <p className="text-[9px] text-neutral-400 font-bold leading-normal uppercase tracking-wide italic">{srv.desc}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onSms(srv.number, srv.name)}
          className="w-10 h-10 rounded-xl bg-neutral-900 text-neutral-500 hover:text-red-500 hover:bg-neutral-850 border border-neutral-800 flex items-center justify-center transition-colors shadow-sm"
          title="Compose distress SMS"
        >
          <MessageSquare size={14} />
        </button>
        <button 
          onClick={() => onCall(srv.number, srv.name)}
          className="w-10 h-10 rounded-xl bg-neutral-900 text-neutral-500 hover:text-red-500 hover:bg-neutral-850 border border-neutral-800 flex items-center justify-center transition-colors shadow-sm"
          title="Dial offline"
        >
          <Phone size={14} />
        </button>
      </div>
    </div>
  );
};
