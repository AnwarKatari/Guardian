import { motion } from 'motion/react';
import { Shield, ChevronLeft, Lock, Eye, FileText, Globe, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  const sections = [
    {
      title: "Data Guardianship",
      icon: Shield,
      content: "We handle your location data with the highest level of encryption. Your real-time coordinates are only transmitted when an SOS protocol is active or when you explicitly share your status with your Trusted Circle."
    },
    {
      title: "Consent Protocol",
      icon: Lock,
      content: "You retain absolute control over your profile visibility. We do not sell or monetize your safety data. Our system is designed as a direct peer-to-peer relay for emergency situations."
    },
    {
      title: "Network Transparency",
      icon: Eye,
      content: "All interactions within the Ai-POWERED ecosystem are logged for your review in the Security Hub. You can audit who has accessed your safety telemetry at any time."
    }
  ];

  return (
    <div className="min-h-screen bg-white p-6 pb-32 space-y-8 max-w-lg mx-auto relative overflow-hidden font-sans text-neutral-900">
      {/* Aesthetic Background Accents */}
      <div className="absolute top-0 right-0 w-[80%] h-[40%] bg-blue-50/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[60%] h-[40%] bg-indigo-50/40 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <header className="flex items-center gap-4 pt-4 relative z-10">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-3 bg-neutral-100 rounded-2xl text-neutral-600 hover:bg-neutral-200 transition-colors shadow-sm"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black tracking-tighter text-neutral-900 uppercase italic leading-none">Privacy_Center</h2>
          <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.3em] italic">Ai-POWERED Data Protection Policy</p>
        </div>
      </header>

      <section className="relative z-10 p-8 bg-blue-600 rounded-[40px] text-white shadow-2xl shadow-blue-200 overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 translate-x-4 -translate-y-4 group-hover:rotate-0 transition-transform duration-700">
          <Shield size={140} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
            <Lock size={24} className="text-white" />
          </div>
          <h3 className="text-3xl font-black italic tracking-tighter leading-none uppercase">Zero-Knowledge<br />Safety Architecture</h3>
          <p className="text-xs text-blue-50/80 font-medium leading-relaxed">
            Ai-POWERED is built on a foundation of trust. We implement military-grade encryption to ensure your safety data remains between you and your allies.
          </p>
        </div>
      </section>

      <div className="space-y-6 relative z-10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h4 className="text-xs font-black text-neutral-900 uppercase tracking-[0.3em]">Operational Clauses</h4>
        </div>

        <div className="space-y-4">
          {sections.map((section, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className="p-6 bg-white border border-neutral-100 rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <section.icon size={20} />
                </div>
                <div className="space-y-2">
                  <h5 className="font-black text-neutral-900 uppercase italic tracking-tight">{section.title}</h5>
                  <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <section className="p-6 bg-neutral-900 text-white rounded-[40px] space-y-4 relative z-10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Globe size={16} className="text-blue-400" />
          </div>
          <h4 className="text-[10px] font-black uppercase tracking-widest italic">Global Compliance</h4>
        </div>
        <div className="space-y-3">
          {[
            "GDPR Secure Processing",
            "End-to-End Dynamic Encryption",
            "Automatic Data Purge Protocol"
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle2 size={12} className="text-blue-500" />
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{item}</p>
            </div>
          ))}
        </div>
        <div className="pt-4 mt-4 border-t border-white/5">
           <p className="text-[9px] text-neutral-500 font-bold leading-relaxed italic uppercase tracking-[0.1em]">
              By using the Ai-POWERED interface, you acknowledge and agree to our decentralized safety protocols. 
              Version 4.9.2 - Authorized Sync.
           </p>
        </div>
      </section>
    </div>
  );
}
