import { useState } from 'react';
import { 
  Phone, 
  Shield, 
  Map as MapIcon, 
  FileText, 
  ChevronRight,
  BookOpen,
  LifeBuoy,
  Zap,
  Info,
  ShieldAlert,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getEmergencyNumbers } from '../constants/emergencyMatrix';
import { cn } from '../lib/utils';

export default function ResourcesPage() {
  const { profile } = useAuth();
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const emergency = getEmergencyNumbers(profile?.countryCode || 'GH');

  const resources = [
    {
      category: "Emergency Contacts",
      items: [
        { name: "Police Dispatch", number: emergency.police, desc: "For life-threatening emergencies or crimes in progress." },
        { name: "Fire Department", number: emergency.fire, desc: "For fire outbreaks and structural hazards." },
        { name: "Ambulance / Medical", number: emergency.ambulance, desc: "Accidental injuries and medical crises." },
      ]
    },
    {
      category: "Safety Guides",
      items: [
        { 
          name: "Standard Operating Procedures", 
          desc: "What to do during a fire, earthquake, or lockdown.", 
          icon: BookOpen,
          procedures: [
            "FIRE: Stay low, exit immediately, do not use elevators.",
            "EARTHQUAKE: Drop, cover, and hold on until shaking stops.",
            "LOCKDOWN: Silence phones, turn off lights, barricade doors.",
            "EVACUATION: Follow designated escape routes to assembly points."
          ]
        },
        { 
          name: "Self Defense Basics", 
          desc: "Simple techniques for personal protection.", 
          icon: Shield,
          procedures: [
            "AWARENESS: Keep head up and scanning for potential threats.",
            "POSITIONING: Maintain a defensive stance with hands up.",
            "STRIKING: Target vulnerable areas (eyes, nose, throat).",
            "ESCAPE: Use the distraction to run to a crowded area."
          ]
        },
        { 
          name: "Bystander Intervention", 
          desc: "How to safely help others in distress.", 
          icon: LifeBuoy,
          procedures: [
            "DISTRACT: Create a diversion to interrupt the situation.",
            "DELEGATE: Ask someone specific to help or call authorities.",
            "DIRECT: Speak up directly if it's safe to do so.",
            "DELAY: Check in with the person after the incident."
          ]
        },
      ]
    },
    {
      category: "Legal & Support",
      items: [
        { 
          name: "Victim Rights", 
          desc: "Information on local victim advocacy services.", 
          icon: FileText,
          procedures: [
            "REPORTING: You have the right to report crimes to police.",
            "PROTECTION: Request a protective order if you feel unsafe.",
            "RESOURCES: Access free legal counseling and support groups.",
            "PRIVACY: Your personal info can be kept confidential in logs."
          ]
        },
        { 
          name: "Counseling Services", 
          desc: "24/7 mental health support hotlines.", 
          icon: Phone,
          procedures: [
            "CRISIS LINE: Call 988 for immediate emotional support.",
            "SUPPORT GROUPS: Connect with others in similar situations.",
            "THERAPY: Find local trauma-informed specialists.",
            "BREATHING: Practice box breathing (4s in, 4s hold, 4s out)."
          ]
        },
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-32 bg-white text-neutral-900 font-sans min-h-screen relative overflow-hidden">
      {/* Background HUD Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none" />

      <div className="space-y-1 relative z-10 pt-4">
        <h2 className="text-xl font-black tracking-tighter italic uppercase text-neutral-900 leading-none">Safety_Annex</h2>
        <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest italic">Node_Status: Archive_Link_Active</p>
      </div>

      <div className="space-y-8 relative z-10">
        {resources.map((section, idx) => (
          <section key={idx} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1 h-3 bg-blue-600/30" />
              <h3 className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">{section.category}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {section.items.map((item, i) => (
                <div 
                  key={i}
                  onClick={() => !('number' in item) && setSelectedResource(item)}
                  className={cn(
                    "p-5 bg-white border border-neutral-100 rounded-3xl hover:border-blue-200 transition-all cursor-pointer group shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    'number' in item && "hover:border-red-200 bg-neutral-50/30"
                  )}
                >
                  <div className="space-y-1">
                    <p className="font-black text-xs text-neutral-900 uppercase italic tracking-tight">{item.name}</p>
                    <p className="text-[9px] text-neutral-400 leading-relaxed font-bold uppercase tracking-wide italic">{item.desc}</p>
                  </div>
                  {'number' in item ? (
                    <a 
                      href={`tel:${item.number}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 px-6 py-3 bg-white border border-red-100 text-red-600 rounded-2xl font-black text-xl italic tracking-tighter hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                    >
                      <Phone size={18} className="shrink-0" />
                      {item.number}
                    </a>
                  ) : (
                    <div className="w-10 h-10 bg-neutral-50 rounded-lg flex items-center justify-center border border-neutral-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shrink-0">
                      <ChevronRight size={16} className="text-neutral-300 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-[32px] text-neutral-900 text-center space-y-4 relative overflow-hidden shadow-xl shadow-blue-50/50 z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full translate-x-8 -translate-y-8" />
        <div className="relative">
          <Shield className="mx-auto text-blue-600 mb-2" size={24} />
          <h4 className="font-black text-sm uppercase italic tracking-tighter">OFFLINE_DATA_VAULT</h4>
          <p className="text-[9px] text-neutral-400 px-4 font-bold uppercase tracking-widest mt-1 italic">Download local sector cache for disconnected operations.</p>
          <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-200 active:scale-95 transition-transform italic">Initiate_Download</button>
        </div>
      </div>

      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedResource(null)}
               className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" 
            />
            <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="w-full max-w-md bg-white border border-neutral-100 rounded-[40px] p-8 shadow-2xl relative overflow-hidden z-[60]"
            >
              <div className="absolute top-0 right-0 p-4">
                <button 
                  onClick={() => setSelectedResource(null)}
                  className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl flex items-center justify-center p-3 shadow-md shadow-blue-100/50">
                       {selectedResource.icon ? <selectedResource.icon size={24} /> : <BookOpen size={24} />}
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1 italic">Safety_Guide_Relay</p>
                       <h3 className="text-xl font-black italic tracking-tighter uppercase text-neutral-900">{selectedResource.name}</h3>
                    </div>
                 </div>
                 <div className="p-6 bg-neutral-50 border border-neutral-100 rounded-3xl space-y-4">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed italic">
                       {selectedResource.desc}
                    </p>
                    <div className="space-y-3 pt-4 border-t border-neutral-200">
                       <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest italic">Standard_Procedures:</p>
                       {(selectedResource.procedures || [
                         "Assess surroundings for threats",
                         "Establish secure communication line",
                         "Execute immediate defensive measures",
                         "Log coordinates for backup transit"
                       ]).map((step: string, i: number) => (
                          <div key={i} className="flex items-center gap-3">
                             <div className="w-1 h-1 bg-blue-600 rounded-full" />
                             <p className="text-[10px] font-bold text-neutral-600 uppercase italic tracking-tight">{step}</p>
                          </div>
                       ))}
                    </div>
                 </div>
                 <button 
                   onClick={() => setSelectedResource(null)}
                   className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black italic tracking-[0.2em] uppercase shadow-lg shadow-blue-200 active:scale-95 transition-all text-xs"
                 >
                   Archive_Intel
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
