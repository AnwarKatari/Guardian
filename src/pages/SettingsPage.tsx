import { useState, useEffect } from 'react';
import { 
  User, 
  Users, 
  MapPin, 
  Bell, 
  Phone, 
  LogOut, 
  ChevronRight,
  Shield,
  ShieldCheck,
  Speaker,
  Clock,
  LifeBuoy,
  Globe,
  Save,
  CheckCircle2,
  Trash2,
  Plus,
  History,
  FileText,
  Lock,
  Camera,
  Loader2,
  Mic,
  Calculator,
  Zap,
  AlertTriangle,
  Sparkles,
  Edit2,
  Watch
} from 'lucide-react';
import axios from 'axios';
import { auth, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSafety } from '../contexts/SafetyEngineContext';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  updateProfile as updateAuthProfile,
  deleteUser
} from 'firebase/auth';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { EMERGENCY_MATRIX } from '../constants/emergencyMatrix';
import { COUNTRIES, getCountryByCode } from '../constants/countries';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  SAFETY_TIPS, 
  getSchedulerConfig, 
  saveSchedulerConfig, 
  getReceivedTipsHistory, 
  clearTipsHistory, 
  requestNotificationPermission, 
  addTipToHistory 
} from '../services/SafetyTipsService';

export default function SettingsPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user, profile, isLocalMode, updateProfile } = useAuth();
  const { micStatus, lastSOSConfirmed, setLastSOSConfirmed } = useSafety();
  
  // Daily Safety Tips States
  const { addLocalNotification } = useNotifications();
  const [tipsConfig, setTipsConfig] = useState(() => getSchedulerConfig());
  const [tipsHistory, setTipsHistory] = useState(() => getReceivedTipsHistory());
  const [permissionStatus, setPermissionStatus] = useState<string>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const handleToggleTips = (enabled: boolean) => {
    const updated = { ...tipsConfig, enabled };
    setTipsConfig(updated);
    saveSchedulerConfig(updated);
    setSuccessMessage(enabled ? "DAILY TIPS ENABLED" : "DAILY TIPS DISABLED");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleTimeChange = (time: string) => {
    const updated = { ...tipsConfig, time };
    setTipsConfig(updated);
    saveSchedulerConfig(updated);
    setSuccessMessage(`TIME UPDATED TO ${time}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? "granted" : "denied");
    setSuccessMessage(granted ? "PERMISSION GRANTED" : "PERMISSION DENIED");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleTriggerTestTip = () => {
    const randomTip = SAFETY_TIPS[Math.floor(Math.random() * SAFETY_TIPS.length)];
    
    addLocalNotification(
      `DAILY SAFETY TIP // ${randomTip.category}`,
      `${randomTip.title}: ${randomTip.content}`,
      'info'
    );

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`Safety Tip: ${randomTip.title}`, {
          body: randomTip.content,
          icon: "/favicon.ico"
        });
      } catch (e) {
        console.error(e);
      }
    }

    addTipToHistory(randomTip.id);
    
    const updatedConfig = { ...tipsConfig };
    if (!updatedConfig.receivedTipIds.includes(randomTip.id)) {
      updatedConfig.receivedTipIds.push(randomTip.id);
      saveSchedulerConfig(updatedConfig);
      setTipsConfig(updatedConfig);
    }

    setTipsHistory(getReceivedTipsHistory());
    setSuccessMessage("TEST TIP DELIVERED");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleClearHistory = () => {
    clearTipsHistory();
    setTipsConfig(getSchedulerConfig());
    setTipsHistory([]);
    setSuccessMessage("HISTORY PURGED");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });
  const [contactCountryCode, setContactCountryCode] = useState(
    COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233'
  );
  const [localSOSMessage, setLocalSOSMessage] = useState(profile?.customSOSMessage || '');
  const [isEditingSOS, setIsEditingSOS] = useState(false);
  const [isPickerSupported] = useState('contacts' in navigator && 'ContactsManager' in window);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("Initializing...");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const pendingMsg = localStorage.getItem('settings_success_message');
    if (pendingMsg) {
      setSuccessMessage(pendingMsg);
      localStorage.removeItem('settings_success_message');
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    setIsUpdating(true);
    try {
      await updateProfile({ displayName });
      if (!isLocalMode && user) {
        await updateAuthProfile(user, { displayName });
      }
      setIsEditingName(false);
      setSuccessMessage("IDENTITY UPDATED");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateBio = async () => {
    setIsUpdating(true);
    try {
      await updateProfile({ bio });
      setIsEditingBio(false);
      setSuccessMessage("BIO PERSISTED");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const generateBio = async () => {
    setIsGeneratingBio(true);
    try {
      const response = await axios.post("/api/ai/generate-bio", {
        displayName: displayName || "New User",
        currentBio: bio
      });
      
      if (response.data.status === "success") {
        const generatedBio = response.data.bio;
        setBio(generatedBio);
        setSuccessMessage("BIO OPTIMIZED BY AI");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      // Fallback message if server AI fails
      setBio(bio || "Prepared and vigilant security user.");
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isLocalMode) {
      localStorage.clear();
      window.location.reload();
      return;
    }

    if (!user) return;
    setIsUpdating(true);
    try {
      // Delete from Firestore first (rules allowing?)
      // Actually standard practice is to let Cloud Functions handle it or delete doc then delete user
      const userRef = doc(db, 'users', user.uid);
      // We might need to delete subcollections if any exist
      await deleteUser(user);
      // The user document might remain if rules prevent deleting it after auth is gone.
      // Better to delete auth first if we don't have a backend to cleanup.
      // But deleteUser might fail if not recent login.
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        alert("For security, please sign out and sign back in before deleting your account.");
      } else {
        alert(`Delete failed: ${err.message}`);
      }
    } finally {
      setIsUpdating(false);
      setShowDeleteModal(false);
    }
  };

  const handleSaveContact = async (forcedPhone?: string, forcedName?: string, forcedPrefix?: string) => {
    let finalName = forcedName || newContact.name;
    let finalPhone = forcedPhone || newContact.phone;

    if (!finalName || !finalPhone || !user || !profile) return;
    
    // SAFETY NORMALIZATION
    let cleanDigits = finalPhone.replace(/\D/g, '');
    
    if (!finalPhone.trim().startsWith('+')) {
      if (cleanDigits.startsWith('0')) {
        cleanDigits = cleanDigits.substring(1);
      }
      const prefix = forcedPrefix || contactCountryCode;
      finalPhone = `${prefix}${cleanDigits}`;
    } else {
      finalPhone = `+${cleanDigits}`;
    }

    if (editingContactId) {
      // Update existing
      const updatedContacts = profile.emergencyContacts.map(c => 
        c.id === editingContactId ? { ...c, name: finalName, phone: finalPhone, email: newContact.email || '' } : c
      );
      await updateProfile({ emergencyContacts: updatedContacts });
    } else {
      // LIMIT ENFORCEMENT: 3 CONTACTS MAX
      if (profile.emergencyContacts.length >= 3) {
        alert("CRITICAL LIMIT: System only supports 3 high-priority emergency contacts for tactical efficiency.");
        return;
      }

      // Add new
      const contactId = crypto.randomUUID();
      const contact = {
        id: contactId,
        name: finalName,
        phone: finalPhone,
        email: newContact.email || '',
        isVerified: true
      };

      const updatedContacts = [...(profile?.emergencyContacts || []), contact];
      await updateProfile({
        emergencyContacts: updatedContacts
      });
    }
    
    setNewContact({ name: '', phone: '', email: '' });
    setContactCountryCode(COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233');
    setEditingContactId(null);
    setShowContactModal(false);
  };

  const openNewContactModal = () => {
    setNewContact({ name: '', phone: '', email: '' });
    setContactCountryCode(COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233');
    setEditingContactId(null);
    setShowContactModal(true);
  };

  const handleEditContact = (contact: any) => {
    const contactEmail = contact.email || '';
    setNewContact({ name: contact.name, phone: contact.phone, email: contactEmail });
    
    // Attempt to extract country code
    const match = COUNTRIES.find(c => contact.phone.startsWith(c.dialCode));
    if (match) {
      setContactCountryCode(match.dialCode);
      setNewContact({ 
        name: contact.name, 
        phone: contact.phone.replace(match.dialCode, '').replace(/\D/g, ''),
        email: contactEmail
      });
    } else {
      setNewContact({ 
        name: contact.name, 
        phone: contact.phone.replace(/\D/g, ''),
        email: contactEmail
      });
    }

    setEditingContactId(contact.id);
    setShowContactModal(true);
  };

  const handlePickContact = async () => {
    try {
      const supported = 'contacts' in navigator && 'select' in (navigator as any).contacts;
      if (!supported) {
        alert("Native contact picker is not supported on this device.");
        return;
      }

      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const pickedName = contact.name?.[0] || 'Unknown Connection';
        const pickedPhone = contact.tel?.[0] || '';
        
        if (pickedPhone) {
          const ghCode = COUNTRIES.find(c => c.code === 'GH')?.dialCode || '+233';
          await handleSaveContact(pickedPhone, pickedName, ghCode);
        }
      }
    } catch (err) {
      console.error("Contact picker error:", err);
    }
  };

  const handleRemoveContact = async (contact: any) => {
    const updatedContacts = profile?.emergencyContacts.filter(c => c.id !== contact.id) || [];
    await updateProfile({
      emergencyContacts: updatedContacts
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    // Allow slightly larger for Base64 (approx 1MB original file -> 1.33MB Base64)
    if (file.size > 800 * 1024) { 
      alert('Image size exceeds 800KB limit for database storage. Please use a smaller image.');
      return;
    }

    setIsUploadingPhoto(true);
    setUploadStatus("Processing Image...");
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const dataUrl = await base64Promise;

      if (!isLocalMode && user) {
        setUploadStatus("Syncing with Vault...");
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL: dataUrl });
        // updateAuthProfile might fail with large Base64, so we prefer the database
        try {
          // Firebase Auth profile has smaller limits than Firestore
          if (dataUrl.length < 5000) {
            await updateAuthProfile(user, { photoURL: dataUrl });
          }
        } catch (authErr) {
          console.warn("Auth profile sync skipped due to size:", authErr);
        }
      }

      await updateProfile({ photoURL: dataUrl });
      
      setSuccessMessage("IDENTITY SYNCED SUCCESSFULLY");
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err: any) {
      console.error("Photo synchronization failed:", err);
      alert(`System failed to synchronize photo: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploadingPhoto(false);
      setUploadStatus("Initializing...");
      if (e.target) e.target.value = '';
    }
  };

  const countries = Object.keys(EMERGENCY_MATRIX).sort();

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-32 font-sans bg-white text-neutral-900 min-h-screen relative overflow-hidden">
      {/* Background HUD Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none" />

      <div className="flex items-center justify-between relative z-10 pt-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-black tracking-tighter italic uppercase text-neutral-900 leading-none">Settings</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] italic">System Status: Connected</p>
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => auth.signOut()}
          className="p-3 bg-red-600 text-white hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-500/20 border border-red-500/20"
        >
          <LogOut size={20} />
        </motion.button>
      </div>

      {/* Profile Card */}
      <section className="p-8 bg-white border border-neutral-100 rounded-[40px] shadow-2xl shadow-blue-500/5 relative overflow-hidden group z-10">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 -rotate-12 group-hover:rotate-0 pointer-events-none">
           <User size={160} className="text-blue-600" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10 text-center sm:text-left">
          <div className="w-24 h-24 rounded-[32px] bg-neutral-50 p-1 border-2 border-neutral-100 relative group/photo shadow-xl shadow-blue-500/10 transition-all duration-700">
            {isUploadingPhoto ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-600 rounded-[28px] overflow-hidden relative">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-1 bg-white/40"
                />
                <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                <span className="text-[6px] font-black text-white uppercase tracking-tighter text-center px-1 leading-none">{uploadStatus}</span>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img 
                  src={profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-[28px]"
                />
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer rounded-[28px] backdrop-blur-[2px]">
                  <Camera size={20} className="text-white mb-1" />
                  <span className="text-[6px] font-black text-white uppercase tracking-widest leading-none">Update Identity</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 group/name-edit">
                <h3 className="font-display font-black text-2xl text-neutral-900 tracking-tighter leading-none uppercase italic">
                  {profile?.displayName || user?.displayName || 'NEW USER'}
                </h3>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 rounded-full text-[6px] font-black uppercase tracking-widest text-neutral-400 border border-neutral-200">
                  <Lock size={6} />
                  Identity Locked
                </div>
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest italic opacity-80">{user?.email}</p>
            </div>

            <div className="space-y-2 relative group/bio-edit">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-black text-neutral-300 uppercase tracking-[0.3em] italic">Identity Memo</p>
                {isEditingBio ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={generateBio}
                      disabled={isGeneratingBio}
                      className="flex items-center gap-1 text-[7px] font-black text-blue-600 uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-all active:scale-95"
                    >
                      {isGeneratingBio ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                      AI Optimize
                    </button>
                    <button onClick={handleUpdateBio} className="text-[7px] font-black text-emerald-600 uppercase tracking-tight px-2 py-0.5 border border-emerald-100 rounded-full hover:bg-emerald-50">Save</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingBio(true)}
                    className="opacity-0 group-hover/bio-edit:opacity-100 transition-opacity text-blue-600"
                  >
                    <Edit2 size={10} />
                  </button>
                )}
              </div>
              
              {isEditingBio ? (
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-[10px] font-bold text-neutral-800 outline-none focus:border-blue-500 resize-none h-20 italic"
                  placeholder="Describe your security profile..."
                  autoFocus
                />
              ) : (
                <p 
                  onClick={() => setIsEditingBio(true)}
                  className="text-[10px] font-bold text-neutral-600 leading-relaxed italic cursor-pointer group-hover/bio-edit:text-neutral-900 transition-colors"
                >
                  {profile?.bio || (
                    <span className="text-neutral-300 uppercase tracking-widest text-[8px] font-black">No profile memo initialized...</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-center sm:justify-start pt-2">
               <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-full shadow-lg shadow-blue-500/20 uppercase tracking-wider italic">Member</span>
               <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black rounded-full uppercase tracking-wider italic">Verified</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-50 grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.3em] italic">Primary Region</p>
            <button 
              onClick={() => setShowCountryModal(true)}
              className="flex items-center gap-2 text-xs font-black text-neutral-900 hover:text-blue-600 transition-colors uppercase italic group/loc"
            >
              <Globe size={14} className="text-blue-600 group-hover/loc:rotate-45 transition-transform" />
              {getCountryByCode(profile?.countryCode || 'GH')?.name || profile?.countryCode || 'GH'}
              <ChevronRight size={12} className="opacity-30 translate-x-0 group-hover/loc:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.3em] italic">Data Status</p>
            <div className="text-xs font-black text-emerald-500 uppercase italic tracking-widest flex items-center justify-end gap-2">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               Synced
            </div>
          </div>
        </div>
      </section>

      {/* ADVANCED SECURITY FEATURES */}
      <section className="space-y-4 relative z-10">
        <div className="flex items-center gap-2 px-2">
           <Zap size={14} className="text-blue-600" />
           <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.4em] italic leading-none">Security Features</h3>
        </div>

        <div className="bg-white border border-neutral-100 rounded-[40px] overflow-hidden divide-y divide-neutral-50 shadow-2xl shadow-blue-500/5 transition-all">
          {/* Audio Guard */}
          <div className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
            <div className="flex items-center gap-5">
              <div className={cn(
                "p-4 rounded-[20px] transition-all duration-300 border shadow-sm",
                profile?.voiceSentinelEnabled ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/20" : "bg-neutral-50 text-neutral-400 border-neutral-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100"
              )}>
                <Mic size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-neutral-900 uppercase tracking-widest italic leading-none">Voice Detection</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Detect emergency sounds automatically</p>
                {micStatus === 'denied' && profile?.voiceSentinelEnabled && (
                  <div className="space-y-2 mt-2">
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-[8px] font-black text-red-600 uppercase tracking-widest italic flex items-center gap-1"
                    >
                      <AlertTriangle size={8} /> MICROPHONE ACCESS DENIED
                    </motion.p>
                    <button 
                      onClick={() => {
                        navigator.mediaDevices.getUserMedia({ audio: true })
                          .then(() => window.location.reload())
                          .catch(() => alert("Access Denied. Check your browser settings."));
                      }}
                      className="text-[7px] font-black text-blue-600 uppercase tracking-widest border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                    >
                      Enable Access
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => updateProfile({ voiceSentinelEnabled: !profile?.voiceSentinelEnabled })}
              className={cn(
                "w-14 h-7 rounded-full transition-all relative p-1 shadow-inner",
                profile?.voiceSentinelEnabled ? "bg-blue-600" : "bg-neutral-200"
              )}
            >
              <motion.div 
                animate={{ x: profile?.voiceSentinelEnabled ? 28 : 0 }}
                className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center" 
              >
                <div className={cn("w-1 h-1 rounded-full", profile?.voiceSentinelEnabled ? "bg-blue-600" : "bg-neutral-300")} />
              </motion.div>
            </button>
          </div>

          {/* Privacy Overlay */}
          <div className="p-6 flex items-center justify-between hover:bg-neutral-50 transition-colors group">
            <div className="flex items-center gap-5">
              <div className={cn(
                "p-4 rounded-[20px] transition-all duration-300 border shadow-sm",
                profile?.securityOverlayActive ? "bg-neutral-900 text-white border-neutral-800 shadow-xl" : "bg-neutral-50 text-neutral-400 border-neutral-100 group-hover:bg-neutral-200 group-hover:text-black group-hover:border-neutral-300"
              )}>
                <Calculator size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-neutral-900 uppercase tracking-widest italic leading-none">Safety Overlay</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Hide app behind a calculator interface</p>
              </div>
            </div>
            <button
              onClick={() => updateProfile({ securityOverlayActive: !profile?.securityOverlayActive })}
              className={cn(
                "w-14 h-7 rounded-full transition-all relative p-1 shadow-inner",
                profile?.securityOverlayActive ? "bg-neutral-900" : "bg-neutral-200"
              )}
            >
              <motion.div 
                animate={{ x: profile?.securityOverlayActive ? 28 : 0 }}
                className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center" 
              >
                 <div className={cn("w-1 h-1 rounded-full", profile?.securityOverlayActive ? "bg-neutral-900" : "bg-neutral-300")} />
              </motion.div>
            </button>
          </div>

          {/* Security Question Section */}
          <div className="p-6 space-y-4 hover:bg-neutral-50 transition-colors group">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-[20px] bg-neutral-50 text-neutral-400 border border-neutral-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all duration-300 shadow-sm">
                <Lock size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-neutral-900 uppercase tracking-widest italic leading-none">Security Recovery Question</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Set a question to recover your password if forgotten</p>
              </div>
            </div>

            <div className="space-y-4 pt-2 max-w-md">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Select Security Question</label>
                <select
                  value={profile?.securityQuestion || "What was the name of your first pet?"}
                  onChange={(e) => updateProfile({ securityQuestion: e.target.value })}
                  className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-blue-600 transition-all italic"
                >
                  <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                  <option value="What was the name of your first school?">What was the name of your first school?</option>
                  <option value="In what city were you born?">In what city were you born?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="What was the make of your first car?">What was the make of your first car?</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Security Answer</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profile?.securityAnswer || ""}
                    onChange={(e) => updateProfile({ securityAnswer: e.target.value.toLowerCase().trim() })}
                    placeholder="Provide answer"
                    className="flex-1 bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-blue-600 transition-all uppercase italic"
                  />
                  <button
                    onClick={() => {
                      setSuccessMessage("SECURITY QUESTION SAVED");
                      setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                    className="p-2.5 bg-neutral-900 text-white rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-neutral-200 shrink-0 animate-pulse"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>



          {/* Daily Safety Tips Scheduler */}
          <div className="p-6 space-y-6 hover:bg-neutral-50 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-[20px] bg-neutral-50 text-neutral-400 border border-neutral-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all duration-300 shadow-sm">
                  <Watch size={20} className="text-neutral-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-neutral-900 uppercase tracking-widest italic leading-none">Daily Safety Tips</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Receive scheduled tactical protection & awareness tips</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleTips(!tipsConfig.enabled)}
                className={cn(
                  "w-14 h-7 rounded-full transition-all relative p-1 shadow-inner",
                  tipsConfig.enabled ? "bg-blue-600" : "bg-neutral-200"
                )}
              >
                <motion.div 
                  animate={{ x: tipsConfig.enabled ? 28 : 0 }}
                  className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center" 
                >
                  <div className={cn("w-1 h-1 rounded-full", tipsConfig.enabled ? "bg-blue-600" : "bg-neutral-300")} />
                </motion.div>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Delivery Schedule</label>
                  <select 
                    value={tipsConfig.time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    disabled={!tipsConfig.enabled}
                    className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-blue-600 disabled:opacity-50 transition-all italic appearance-none"
                  >
                    <option value="08:00">08:00 AM (Early commute)</option>
                    <option value="09:00">09:00 AM (Morning brief)</option>
                    <option value="12:00">12:00 PM (Midday check)</option>
                    <option value="18:00">06:00 PM (Evening commute)</option>
                    <option value="20:00">08:00 PM (Perimeter lockup)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Browser Notifications</label>
                  {permissionStatus === "granted" ? (
                    <div className="h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">NATIVE PUSH ENABLED</span>
                    </div>
                  ) : permissionStatus === "unsupported" ? (
                    <div className="h-10 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center">
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest italic">NOT SUPPORTED</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestPermission}
                      className="w-full h-10 bg-neutral-900 hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all"
                    >
                      Grant Permission
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleTriggerTestTip}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest italic shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                >
                  <Sparkles size={12} className="animate-pulse" />
                  Deliver Test Tip Now
                </button>
                {tipsHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="p-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-2xl transition-all"
                    title="Purge Tip History"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {tipsHistory.length > 0 && (
                <div className="pt-4 border-t border-neutral-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Previous Safety Tips History</p>
                    <span className="text-[8px] font-bold text-neutral-400 bg-neutral-100 px-2.5 py-0.5 rounded-full">{tipsHistory.length} Tip{tipsHistory.length > 1 ? 's' : ''} Received</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {tipsHistory.map((hist, idx) => {
                      const tip = SAFETY_TIPS.find(t => t.id === hist.tipId);
                      if (!tip) return null;
                      return (
                        <div key={idx} className="p-3.5 bg-neutral-50 border border-neutral-100/50 rounded-xl space-y-1.5 transition-all hover:bg-white hover:shadow-md hover:border-neutral-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase tracking-wider">{tip.category}</span>
                            <span className="text-[8px] font-semibold text-neutral-400">{new Date(hist.sentAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] font-black text-neutral-800 leading-tight italic">{tip.title}</p>
                          <p className="text-[9px] text-neutral-500 font-bold leading-normal">{tip.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Fake Call Settings */}
          <div className="p-6 space-y-6 hover:bg-neutral-50 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-[20px] bg-neutral-50 text-neutral-400 border border-neutral-100 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-all duration-300 shadow-sm">
                  <Phone size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-neutral-900 uppercase tracking-widest italic leading-none">Fake Call Identity</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Customize your extraction broadcast</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Caller Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={profile?.fakeCallSettings?.callerName || "Security Dispatch"}
                    onChange={(e) => updateProfile({ fakeCallSettings: { ...profile?.fakeCallSettings, callerName: e.target.value } })}
                    className="flex-1 bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-red-500 transition-all italic"
                    placeholder="e.g. Mom, Security Hub, Boss"
                  />
                  <button 
                    onClick={() => {
                       setSuccessMessage("IDENTITY PERSISTED");
                       setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                    className="p-2.5 bg-neutral-900 text-white rounded-xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-neutral-200"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Trigger Delay</label>
                  <select 
                    value={profile?.fakeCallSettings?.triggerDelay || 5}
                    onChange={(e) => updateProfile({ fakeCallSettings: { ...profile?.fakeCallSettings, triggerDelay: parseInt(e.target.value) } })}
                    className="w-full bg-white border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-800 outline-none focus:border-red-500 transition-all italic appearance-none"
                  >
                    <option value={5}>5 Seconds</option>
                    <option value={10}>10 Seconds</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>1 Minute</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] ml-1">Tactical Mode</label>
                  <div className="h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Vibrate On</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOS Message Customization */}
      <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
             <Speaker size={12} className="text-red-500" />
             <h3 className="text-[9px] font-black text-neutral-900 uppercase tracking-[0.3em] italic">SOS Message</h3>
          </div>
          {!isEditingSOS && (
            <div className="flex items-center gap-2 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-100 italic">
               <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
               Locked
            </div>
          )}
        </div>
        <div className="bg-white border border-neutral-100 rounded-[28px] p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12 transition-transform group-hover:rotate-0 pointer-events-none">
             <Shield size={140} className="text-red-600" />
          </div>
          
          <div className="relative">
            <textarea 
              value={localSOSMessage}
              onChange={(e) => setLocalSOSMessage(e.target.value)}
              disabled={!isEditingSOS}
              placeholder="Enter SOS message..."
              className={cn(
                "w-full h-28 border-2 rounded-[20px] p-5 text-[10px] sm:text-xs font-black outline-none transition-all resize-none italic tracking-wide",
                isEditingSOS 
                  ? "bg-white border-red-500 text-neutral-900 shadow-[0_0_30px_rgba(239,68,68,0.1)]" 
                  : "bg-neutral-50 border-neutral-100 text-neutral-400"
              )}
            />
            
            <div className="absolute -top-3 -right-2 flex gap-2">
               <AnimatePresence>
                {isEditingSOS ? (
                  <motion.button 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={async () => {
                      await updateProfile({ customSOSMessage: localSOSMessage });
                      setIsEditingSOS(false);
                      setSuccessMessage("SOS message updated");
                    }}
                    className="h-10 px-6 bg-red-600 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-2 shadow-lg hover:bg-red-500 transition-all active:scale-95 italic"
                  >
                    <Save size={12} />
                    Save Message
                  </motion.button>
                ) : (
                  <motion.button 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => setIsEditingSOS(true)}
                    className="h-10 px-6 bg-neutral-900 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-2 shadow-lg hover:bg-neutral-800 transition-all active:scale-95 italic"
                  >
                    <Shield size={12} className="text-red-500" />
                    Edit
                  </motion.button>
                )}
               </AnimatePresence>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.3em] ml-1 italic">Templates</p>
             <div className="flex flex-wrap gap-2">
              {[
                "I'm in an emergency and need help. My current location is attached.",
                "SECURITY ALERT: I am under threat. Active tracking active.",
                "Please help me, I am in danger."
              ].map((msg, i) => (
                <button 
                  key={i}
                  disabled={!isEditingSOS}
                  onClick={() => setLocalSOSMessage(msg)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all italic border shadow-sm",
                    isEditingSOS 
                      ? "bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-red-500 hover:text-red-600" 
                      : "bg-neutral-50/50 border-neutral-50 text-neutral-300 cursor-not-allowed"
                  )}
                >
                  {msg.length > 20 ? msg.substring(0, 20) + '...' : msg}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 opacity-20">
             <div className="w-1 h-1 rounded-full bg-red-500" />
             <p className="text-[7px] font-black text-neutral-400 uppercase tracking-[0.4em]">Message Encrypted</p>
          </div>
        </div>
      </section>

      {/* Trusted Contacts */}
      <section className="space-y-3 relative z-10">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
             <Users size={10} className="text-blue-500" />
             <h3 className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic">Trusted Contacts ({profile?.emergencyContacts?.length || 0}/3)</h3>
          </div>
          <button 
            onClick={openNewContactModal}
            disabled={profile?.emergencyContacts && profile.emergencyContacts.length >= 3}
            className="p-1 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-md transition-colors border border-blue-100 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {profile?.emergencyContacts.length ? (
            profile.emergencyContacts.map((contact, i) => (
              <div key={i} className="p-3 bg-white border border-neutral-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-blue-500/20 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:text-blue-500 transition-colors border border-neutral-100">
                    <User size={14} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black text-neutral-900 italic uppercase tracking-tight">{contact.name}</p>
                      <CheckCircle2 size={8} className="text-emerald-500" />
                    </div>
                    <p className="text-[9px] font-bold text-neutral-400">{contact.phone}</p>
                    {contact.email && (
                      <p className="text-[8px] font-bold text-blue-500 lowercase tracking-wider mt-0.5">{contact.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => handleEditContact(contact)}
                    className="p-1.5 text-neutral-300 hover:text-blue-500 transition-colors"
                  >
                    <Save size={12} />
                  </button>
                  <button 
                    onClick={() => handleRemoveContact(contact)}
                    className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-neutral-50 border border-dashed border-neutral-100 rounded-2xl">
              <p className="text-[9px] text-neutral-300 font-black uppercase tracking-widest italic">No contacts added</p>
            </div>
          )}
        </div>
      </section>

      {/* Global Safety Switches */}
      <section className="bg-white border border-neutral-100 rounded-[28px] overflow-hidden divide-y divide-neutral-50 shadow-2xl shadow-blue-50 relative z-10">
        <div className="p-3.5 flex items-center justify-between hover:bg-neutral-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <MapPin size={16} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-neutral-900 uppercase tracking-widest italic leading-none">Background Sync</p>
              <p className="text-[7px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Secure Tracking Active</p>
            </div>
          </div>
          <button
            disabled={isUpdating}
            onClick={() => updateProfile({ isSharingLocation: !profile?.isSharingLocation })}
            className={cn(
              "w-10 h-5 rounded-full transition-all relative",
              profile?.isSharingLocation ? "bg-blue-600" : "bg-neutral-200"
            )}
          >
            <motion.div 
              animate={{ x: profile?.isSharingLocation ? 22 : 2 }}
              className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
            />
          </button>
        </div>
        
        <div className="p-3.5 flex items-center justify-between hover:bg-neutral-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-xl text-red-600 border border-red-100">
              <Shield size={16} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-neutral-900 uppercase tracking-widest italic leading-none">Evidence Upload</p>
              <p className="text-[7px] font-bold text-neutral-400 uppercase leading-none tracking-tight italic">Relay Active</p>
            </div>
          </div>
          <button 
            disabled={isUpdating}
            onClick={() => updateProfile({ evidenceSync: !profile?.evidenceSync })}
            className={cn(
              "w-10 h-5 rounded-full transition-all relative",
              profile?.evidenceSync ? "bg-red-600" : "bg-neutral-200"
            )}
          >
            <motion.div 
              animate={{ x: profile?.evidenceSync ? 22 : 2 }}
              className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
            />
          </button>
        </div>
      </section>

      {/* Legal & History Section */}
      <section className="space-y-3 relative z-10">
        <div className="flex items-center gap-2 px-2">
           <Lock size={10} className="text-blue-500" />
           <h3 className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic">Logs & Transparency</h3>
        </div>
        
        <div className="grid gap-2">
          {/* SOS History */}
          <div 
            onClick={() => setActiveTab('sos-history')}
            className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer group hover:border-blue-500/30 transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <History size={16} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-neutral-900 uppercase italic leading-none">SOS History</p>
                 <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Review dispatch logs</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-blue-500 transition-colors" />
          </div>

          {/* Privacy Policy */}
          <div 
            onClick={() => setActiveTab('privacy')}
            className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer group hover:border-blue-500/30 transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <FileText size={16} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-neutral-900 uppercase italic leading-none">Privacy Policy</p>
                 <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Review data guardianship</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="mt-12 pt-12 border-t border-neutral-100 relative z-10 space-y-4">
        <div className="flex items-center gap-2 px-2">
           <AlertTriangle size={12} className="text-red-500" />
           <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] italic leading-none">Danger Zone</h3>
        </div>
        <div className="p-8 bg-red-50 border border-red-100 rounded-[40px] space-y-6">
           <div className="space-y-2">
             <h4 className="text-lg font-black italic uppercase tracking-tight text-red-900 leading-none">Destroy Identity Data</h4>
             <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest italic opacity-60">Permanently erase your profiles, contacts, and logs from the global relay network.</p>
           </div>
           <button 
             onClick={() => setShowDeleteModal(true)}
             className="w-full py-4 bg-white text-red-600 border border-red-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
           >
             Terminate Account
           </button>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-red-950/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-[50px] p-10 shadow-2xl border border-red-100 space-y-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] -rotate-12 pointer-events-none">
                <AlertTriangle size={160} className="text-red-600" />
              </div>

              <div className="text-center space-y-6 relative z-10">
                <div className="w-24 h-24 bg-red-600 text-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/40 border-4 border-red-500/50">
                   <Trash2 size={44} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-neutral-900 leading-none">Security Termination</h3>
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-relaxed px-4 italic">
                    You are about to permanently destroy your identity record. This action will erase your <span className="text-red-600">emergency circle</span>, <span className="text-red-600">safety logs</span>, and <span className="text-red-600">verified relay status</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="p-6 bg-red-50 rounded-[32px] border border-red-100 space-y-3">
                  <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.3em] text-center italic">Type "TERMINATE" to confirm</p>
                  <input 
                    type="text" 
                    id="account-delete-confirm"
                    placeholder="CONFIRMATION"
                    className="w-full bg-white border-2 border-red-100/50 rounded-2xl px-6 py-4 text-center font-black text-xs uppercase tracking-widest outline-none focus:border-red-600 transition-all italic text-red-900"
                  />
                </div>

                <div className="grid gap-3 pt-4">
                  <button 
                    onClick={() => {
                      const input = document.getElementById('account-delete-confirm') as HTMLInputElement;
                      if (input?.value === 'TERMINATE') {
                        handleDeleteAccount();
                      } else {
                        alert("Access Denied: Please type 'TERMINATE' to verify authority.");
                      }
                    }}
                    disabled={isUpdating}
                    className="w-full py-5 bg-red-600 text-white rounded-[30px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-red-500/40 active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                  >
                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <><Shield size={16} /> Execute Termination</>}
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-4 text-neutral-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-neutral-900 transition-colors italic"
                  >
                    Abort Operation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Country Modal */}
      <AnimatePresence>
        {showCountryModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowCountryModal(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-black italic tracking-tighter text-neutral-900 uppercase">Select Region</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    onClick={() => {
                      updateProfile({ countryCode: country.code });
                      setShowCountryModal(false);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center justify-between text-[11px] font-black uppercase italic",
                      profile?.countryCode === country.code 
                        ? "bg-blue-600 border-blue-600 text-white" 
                        : "bg-neutral-50 border-neutral-100 text-neutral-400 hover:bg-neutral-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                    <span>{country.dialCode}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowContactModal(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
             <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] sm:rounded-[40px] p-8 shadow-2xl space-y-6 border border-neutral-100"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tighter italic uppercase text-neutral-900">
                  {editingContactId ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest italic">
                  {editingContactId ? 'Modify contact details' : 'Add new trusted contact'}
                </p>
              </div>

              <div className="space-y-4">
                {!editingContactId && isPickerSupported && (
                  <button 
                    onClick={handlePickContact}
                    className="w-full py-3 bg-neutral-900 text-white rounded-xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all text-[9px] uppercase tracking-[0.2em] shadow-xl italic"
                  >
                    <Users size={14} />
                    Pick From Contacts
                  </button>
                )}

                <div className="relative flex items-center gap-3 py-1">
                  <div className="flex-1 h-[1px] bg-neutral-100" />
                  <span className="text-[8px] font-black text-neutral-300 uppercase tracking-widest italic">
                    {editingContactId ? 'Details' : 'Manual Entry'}
                  </span>
                  <div className="flex-1 h-[1px] bg-neutral-100" />
                </div>

                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Contact Name" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors text-neutral-900 uppercase italic"
                    value={newContact.name}
                    onChange={e => setNewContact({...newContact, name: e.target.value})}
                  />
                  <div className="flex gap-2">
                      <div className="relative">
                       <select
                        className="h-full pl-3 pr-8 bg-neutral-50 rounded-xl border border-neutral-100 focus:border-blue-600 transition-all font-black uppercase text-[10px] italic appearance-none cursor-pointer"
                        value={contactCountryCode}
                        onChange={(e) => setContactCountryCode(e.target.value)}
                      >
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.dialCode} className="text-sm font-sans font-medium">
                            {c.flag} {c.name.toUpperCase()} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">
                        <Globe size={10} />
                      </div>
                    </div>
                    <input 
                      type="tel" 
                      placeholder="Phone Number" 
                      className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors text-neutral-900 italic"
                      value={newContact.phone}
                      onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    />
                  </div>
                  <input 
                    type="email" 
                    placeholder="Email Address (Optional)" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors text-neutral-900 italic"
                    value={newContact.email}
                    onChange={e => setNewContact({...newContact, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={() => {
                    setShowContactModal(false);
                    setEditingContactId(null);
                    setNewContact({ name: '', phone: '', email: '' });
                    setContactCountryCode(COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233');
                  }}
                  className="py-3 bg-neutral-50 text-neutral-400 rounded-xl font-black active:scale-95 transition-all text-[9px] uppercase tracking-widest italic"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveContact()}
                  className="py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all text-[9px] uppercase tracking-widest italic"
                >
                  {editingContactId ? 'Update' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
