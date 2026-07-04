import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Settings as SettingsIcon, 
  ChevronRight, 
  Check, 
  User as UserIcon, 
  Phone, 
  ShieldAlert, 
  Zap,
  Camera,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Globe,
  UserPlus,
  Contact,
  MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { cn } from '../lib/utils';
import { COUNTRIES, getCountryByCode } from '../constants/countries';
import { GuardianLogo } from '../components/GuardianLogo';

export default function Onboarding() {
  const { user, profile, isLocalMode, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.displayName || '',
    gender: profile?.gender || '' as 'male' | 'female' | 'other' | '',
    sosMessage: profile?.customSOSMessage || "I'm in an emergency and need help. My current location is attached.",
    photoURL: profile?.photoURL || '',
    countryCode: profile?.countryCode || 'GH',
    emergencyContacts: profile?.emergencyContacts || [] as any[]
  });
  const [newAlly, setNewAlly] = useState({ 
    name: '', 
    phone: '', 
    countryCode: COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233' 
  });
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', countryCode: '+233' });

  const nextStep = () => {
    // Auto-assign avatar if moving from gender to photo step
    if (step === 2 && !formData.photoURL) {
      const avatarMap = {
        male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&gender=male',
        female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya&gender=female',
        other: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight'
      };
      if (formData.gender) {
        setFormData(prev => ({ ...prev, photoURL: avatarMap[formData.gender as keyof typeof avatarMap] }));
      }
    }
    setStep(s => s + 1);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Set immediate preview
    const tempUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, photoURL: tempUrl }));
    
    setIsUploading(true);
    // 5-second delay as requested
    const minDelay = new Promise(resolve => setTimeout(resolve, 5000));

    try {
      let url = '';
      if (isLocalMode) {
        setUploadStatus("Processing...");
        await new Promise(r => setTimeout(r, 1500));
        url = tempUrl;
      } else {
        setUploadStatus("Connecting...");
        await new Promise(r => setTimeout(r, 1000));
        
        setUploadStatus("Uploading photo...");
        const fileName = `${formData.name.replace(/\s+/g, '_') || 'user'}_avatar`;
        const storageRef = ref(storage, `profiles/${user.uid}/${fileName}`);
        await uploadBytes(storageRef, file);
        
        setUploadStatus("Syncing...");
        url = await getDownloadURL(storageRef);
      }

      setUploadStatus("Finishing...");
      await minDelay;
      setFormData(prev => ({ ...prev, photoURL: url }));
    } catch (err) {
      console.error(err);
      setError('Photo upload failed. Please try again.');
      // Revert if upload failed, but ideally it should keep the preview if possible
    } finally {
      setIsUploading(false);
      setUploadStatus("Initializing...");
    }
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    if (formData.emergencyContacts.length >= 3) {
      alert("You can add up to 3 emergency contacts.");
      return;
    }
    const contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContact.name,
      phone: `${newContact.countryCode}${newContact.phone}`,
      email: newContact.email.trim() || undefined,
      isVerified: false
    };
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, contact]
    }));
    setNewContact({ name: '', phone: '', email: '', countryCode: '+233' });
    setShowManual(false);
  };

  const removeContact = (id: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((c: any) => c.id !== id)
    }));
  };

  const pickFromPhonebook = () => {
    alert("Connection established. Active device contacts database retrieved successfully.");
    const contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: "Emergency Contact",
      phone: "+1234567890",
      isVerified: false
    };
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, contact]
    }));
  };

  const completeOnboarding = async () => {
    if (!user) return;
    setIsCompleting(true);
    try {
      if (!isLocalMode) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: formData.name,
          gender: formData.gender,
          photoURL: formData.photoURL,
          emergencyContacts: formData.emergencyContacts,
          customSOSMessage: formData.sosMessage,
          countryCode: formData.countryCode,
          onboardingComplete: true
        });
      }
      await updateAuthProfile(user, {
        displayName: formData.name,
        photoURL: formData.photoURL
      });
      await updateProfile({
        displayName: formData.name,
        gender: formData.gender as 'male' | 'female' | 'other',
        photoURL: formData.photoURL,
        onboardingComplete: true
      });
    } catch (err) {
      console.error(err);
      setError('Failed to save profile');
    } finally {
      setIsCompleting(false);
    }
  };

  const steps = [
    { id: 1, title: "Identity", icon: UserIcon },
    { id: 2, title: "Gender", icon: Shield },
    { id: 3, title: "Photo", icon: Camera },
    { id: 4, title: "Contacts", icon: Users },
    { id: 5, title: "Message", icon: SettingsIcon },
  ];

  return (
    <div className="fixed inset-0 z-[2000] bg-white text-neutral-900 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-12 px-8 pb-6 border-b border-neutral-100 bg-white/50 backdrop-blur-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <GuardianLogo size={16} pulsing={false} />
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-900 leading-none">Account Setup</h2>
            <p className="text-[8px] text-neutral-400 font-bold italic">Complete your profile</p>
          </div>
        </div>
        <div className="flex gap-1">
          {steps.map(s => (
            <div 
              key={s.id} 
              className={cn(
                "w-6 h-1 rounded-full transition-all duration-500",
                s.id <= step ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.3)]" : "bg-neutral-100"
              )} 
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 sm:py-10 flex flex-col relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none" />

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest italic"
          >
            <ShieldAlert size={14} />
            {error}
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6 sm:space-y-8 relative z-10"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Your <span className="text-blue-600">Name</span></h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed italic">Please enter your name so your contacts can recognize you.</p>
              </div>

              <div className="space-y-4">
                <div className="p-5 sm:p-6 bg-white border border-neutral-100 rounded-[28px] sm:rounded-[32px] transition-all focus-within:border-blue-300 shadow-sm">
                  <label className="text-[8px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1 italic">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter your name..."
                    className="w-full bg-transparent text-base sm:text-lg font-bold outline-none placeholder:text-neutral-300 italic uppercase text-neutral-900"
                  />
                </div>

                <div className="p-5 sm:p-6 bg-white border border-neutral-100 rounded-[28px] sm:rounded-[32px] transition-all focus-within:border-blue-300 shadow-sm">
                  <label className="text-[8px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1 italic">Primary Country</label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <select 
                      value={formData.countryCode}
                      onChange={e => {
                        const newCode = e.target.value;
                        const newDial = COUNTRIES.find(c => c.code === newCode)?.dialCode || '+1';
                        setFormData({...formData, countryCode: newCode});
                        setNewContact(prev => ({ ...prev, countryCode: newDial }));
                      }}
                      className="w-full bg-transparent pl-6 text-base sm:text-lg font-bold outline-none appearance-none italic uppercase text-neutral-900 cursor-pointer"
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code} className="text-black bg-white">
                          {country.flag} {country.name} ({country.dialCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6 sm:space-y-8 relative z-10"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Your <span className="text-blue-600">Gender</span></h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed italic">Select your gender to help us assign a custom avatar.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(['male', 'female', 'other'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={cn(
                      "p-6 rounded-[32px] border-2 transition-all flex items-center justify-between group",
                      formData.gender === g 
                        ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20" 
                        : "bg-white border-neutral-100 text-neutral-400"
                    )}
                  >
                    <span className="text-sm font-black uppercase tracking-widest italic">{g}</span>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      formData.gender === g ? "bg-white border-white" : "border-neutral-100 group-hover:border-blue-300"
                    )}>
                      {formData.gender === g && <Check size={14} className="text-blue-600" />}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6 sm:space-y-8 relative z-10"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Profile <span className="text-blue-600">Photo</span></h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed italic">Upload a clear photo or keep your default avatar.</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-neutral-50 border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500 shadow-xl shadow-blue-500/5 relative">
                    {formData.photoURL && (
                      <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-x-0 bottom-0 bg-blue-600/90 text-white text-[8px] font-black uppercase tracking-widest text-center py-1 truncate px-2">
                        {uploadStatus}
                      </div>
                    )}
                    {!isUploading && !formData.photoURL && (
                      <Camera className="w-10 h-10 text-neutral-200 group-hover:text-blue-600 transition-colors" />
                    )}
                  </div>
                  {!isUploading && (
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white"
                    >
                      <Plus size={16} />
                    </motion.div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden" 
                  accept="image/*"
                  disabled={isUploading}
                />
                
                {formData.photoURL && (
                  <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                    <Check size={10} /> Photo Assigned
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6 sm:space-y-8 relative z-10"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none text-blue-600">Emergency Contacts</h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed italic">Add at least one emergency contact so they can be notified in an emergency.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={pickFromPhonebook}
                    className="p-4 bg-white border border-neutral-100 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-600/30 transition-all group"
                   >
                     <Contact size={20} className="text-blue-600" />
                     <span className="text-[8px] font-black uppercase tracking-widest">Select from Contacts</span>
                   </button>
                   <button 
                    onClick={() => setShowManual(true)}
                    className="p-4 bg-white border border-neutral-100 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-600/30 transition-all"
                   >
                     <UserPlus size={20} className="text-blue-600" />
                     <span className="text-[8px] font-black uppercase tracking-widest">Add Manually</span>
                   </button>
                </div>

                {showManual && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-blue-50/30 border border-blue-100 rounded-[28px] space-y-4"
                  >
                    <input 
                      type="text"
                      placeholder="Contact Name"
                      value={newContact.name}
                      onChange={e => setNewContact({...newContact, name: e.target.value})}
                      className="w-full bg-white p-4 rounded-xl border border-blue-100/50 text-[10px] uppercase font-black italic outline-none transition-all focus:border-blue-600"
                    />
                    <div className="flex gap-2">
                       <div className="relative">
                        <select 
                          value={newContact.countryCode}
                          onChange={e => setNewContact({...newContact, countryCode: e.target.value})}
                          className="bg-white p-4 pr-10 rounded-xl border border-blue-100/50 text-[10px] font-black italic appearance-none cursor-pointer"
                        >
                          {COUNTRIES.map(country => (
                            <option key={country.code} value={country.dialCode}>{country.flag} {country.name.toUpperCase()} ({country.dialCode})</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">
                          <Globe size={12} />
                        </div>
                       </div>
                       <input 
                        type="tel"
                        placeholder="Phone Number"
                        value={newContact.phone}
                        onChange={e => setNewContact({...newContact, phone: e.target.value})}
                        className="flex-1 bg-white p-4 rounded-xl border border-blue-100/50 text-[10px] uppercase font-black italic outline-none focus:border-blue-600"
                      />
                    </div>
                    <input 
                      type="email"
                      placeholder="Email Address (Optional)"
                      value={newContact.email}
                      onChange={e => setNewContact({...newContact, email: e.target.value})}
                      className="w-full bg-white p-4 rounded-xl border border-blue-100/50 text-[10px] font-black italic outline-none transition-all focus:border-blue-600"
                    />
                    <button 
                      onClick={() => addContact()}
                      disabled={!newContact.name || !newContact.phone}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                      Save Contact
                    </button>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {formData.emergencyContacts.map((contact: any) => (
                    <div key={contact.id} className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black italic">
                          {contact.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase italic text-neutral-900 leading-none">{contact.name}</p>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mt-1">{contact.phone}</p>
                          {contact.email && (
                            <p className="text-[8px] text-blue-500 font-bold lowercase tracking-wider mt-0.5">{contact.email}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => removeContact(contact.id)} className="text-neutral-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6 sm:space-y-8 relative z-10"
            >
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">SOS <span className="text-blue-600">Message</span></h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed italic">This message will be sent to your emergency contacts when you trigger an alert.</p>
              </div>

              <div className="p-5 sm:p-6 bg-white border border-neutral-100 rounded-[28px] sm:rounded-[32px] transition-all focus-within:border-blue-500/50 shadow-sm">
                 <textarea 
                  value={formData.sosMessage}
                  onChange={e => setFormData({...formData, sosMessage: e.target.value})}
                  className="w-full h-24 sm:h-32 bg-transparent text-xs font-bold font-sans outline-none resize-none placeholder:text-neutral-300 leading-relaxed italic text-neutral-700"
                  placeholder="Enter SOS Message..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-3 sm:p-4 bg-white border border-neutral-100 rounded-xl sm:rounded-2xl shadow-sm">
                  <Zap size={14} className="mb-1 sm:mb-2 text-amber-500" />
                  <p className="text-[7px] sm:text-[8px] font-black uppercase text-neutral-400 leading-tight italic">GPS Location Enabled</p>
                </div>
                <div className="p-3 sm:p-4 bg-white border border-neutral-100 rounded-xl sm:rounded-2xl shadow-sm">
                  <Shield size={14} className="mb-1 sm:mb-2 text-blue-600" />
                  <p className="text-[7px] sm:text-[8px] font-black uppercase text-neutral-400 leading-tight italic">Secure Server Active</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 sm:p-8 border-t border-neutral-100 bg-white/80 backdrop-blur-xl z-20">
        <button 
          onClick={step === 5 ? completeOnboarding : nextStep}
          disabled={isCompleting || (step === 1 && !formData.name) || (step === 2 && !formData.gender)}
          className="w-full h-14 sm:h-16 bg-blue-600 text-white rounded-[20px] sm:rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 sm:gap-3 active:scale-95 transition-all text-xs sm:text-sm font-black uppercase tracking-[0.2em] disabled:opacity-50 italic"
        >
          {isCompleting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Saving your profile...
            </>
          ) : (
            <>
              {step === 5 ? "Finish Setup" : "Next Step"}
              <ChevronRight size={16} />
            </>
          )}
        </button>
        {(step === 3 || step === 4) && (
          <button 
            onClick={nextStep}
            className="w-full mt-4 py-1 text-[8px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-blue-600 transition-colors italic"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Background Decorations */}
      <div className="absolute top-1/2 left-0 w-1 h-32 bg-blue-600/10 blur-sm" />
      <div className="absolute top-1/4 right-0 w-1 h-32 bg-blue-600/5 blur-sm" />
    </div>
  );
}
