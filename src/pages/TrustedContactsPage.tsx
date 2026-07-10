import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trash2, 
  UserPlus,
  ShieldCheck,
  Phone,
  Contact,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { EmergencyContact } from '../types';
import { COUNTRIES } from '../constants/countries';

export default function TrustedContactsPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, profile } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [countryCode, setCountryCode] = useState(
    COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const [priority, setPriority] = useState<'primary' | 'secondary'>('primary');

  const resetForm = () => {
    setName('');
    setPhone('');
    setContactEmail('');
    setPriority('primary');
    setEditingContact(null);
    const defaultCode = COUNTRIES.find(c => c.code === (profile?.countryCode || 'GH'))?.dialCode || '+233';
    setCountryCode(defaultCode);
    setIsAdding(false);
  };

  const openEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setContactEmail(contact.email || '');
    setPriority(contact.priority || 'primary');
    
    // Try to extract country code from existing phone
    const match = COUNTRIES.find(c => contact.phone.startsWith(c.dialCode));
    if (match) {
      setCountryCode(match.dialCode);
      setPhone(contact.phone.replace(match.dialCode, '').replace(/\D/g, ''));
    } else {
      setPhone(contact.phone.replace(/\D/g, ''));
    }
    
    setIsAdding(true);
  };

  const saveContact = async (contactData?: { name: string, phone: string, email?: string, priority?: 'primary' | 'secondary', forcedPrefix?: string }) => {
    if (!user) return;
    
    if (!editingContact && (profile?.emergencyContacts?.length || 0) >= 3) {
      alert("CRITICAL LIMIT: System only supports 3 high-priority emergency contacts.");
      return;
    }

    let finalName = contactData?.name || name;
    let finalPhone = contactData?.phone || phone;
    let finalEmail = contactData?.email !== undefined ? contactData.email : contactEmail;
    let finalPriority = contactData?.priority || priority;

    if (!finalName || !finalPhone) return;

    // TACTICAL NORMALIZATION
    let cleanDigits = finalPhone.replace(/\D/g, '');
    
    if (!finalPhone.trim().startsWith('+')) {
      if (cleanDigits.startsWith('0')) {
        cleanDigits = cleanDigits.substring(1);
      }
      // Use forced prefix (for phonebook) or current selection
      const prefix = contactData?.forcedPrefix || countryCode;
      finalPhone = `${prefix}${cleanDigits}`;
    } else {
      // If it starts with +, ensure it only contains digits after that
      finalPhone = `+${cleanDigits}`;
    }

    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (editingContact) {
        // Update existing: Remove old, add new (Firestore arrayUnion is easiest for simple lists)
        const updatedContacts = profile?.emergencyContacts?.map(c => 
          c.id === editingContact.id ? { ...c, name: finalName, phone: finalPhone, email: finalEmail, priority: finalPriority } : c
        ) || [];
        
        await updateDoc(userRef, {
          emergencyContacts: updatedContacts
        });
      } else {
        // Add new
        const newContact: EmergencyContact = {
          id: crypto.randomUUID(),
          name: finalName,
          phone: finalPhone,
          email: finalEmail,
          priority: finalPriority,
          isVerified: true
        };
        await updateDoc(userRef, {
          emergencyContacts: arrayUnion(newContact)
        });
      }
      
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pickFromPhonebook = async () => {
    try {
      const supported = 'contacts' in navigator && 'select' in (navigator as any).contacts;
      if (!supported) {
        alert("Native contact picker is not supported on this device/browser.");
        return;
      }

      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);

      if (contacts.length > 0) {
        const contact = contacts[0];
        const pickedName = contact.name?.[0] || 'Unknown Contact';
        const pickedPhone = contact.tel?.[0] || '';
        
        if (pickedPhone) {
          // Explicitly force Ghana prefix for phone book picks if missing
          const ghCode = COUNTRIES.find(c => c.code === 'GH')?.dialCode || '+233';
          await saveContact({ name: pickedName, phone: pickedPhone, forcedPrefix: ghCode });
        }
      }
    } catch (err) {
      console.error("Contact picker failed:", err);
    }
  };

  const removeContact = async (contact: EmergencyContact) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emergencyContacts: arrayRemove(contact)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="p-6 space-y-10 pb-32 h-full bg-white text-neutral-900 font-sans relative overflow-hidden">
      {/* Background HUD Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none" />
      
      <header className="space-y-4 relative z-10 pt-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-blue-600 rounded-full" />
          <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-neutral-900">Trusted Contacts</h2>
        </div>
        <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.34em] leading-relaxed max-w-sm italic">
          Manage your emergency contacts and secure synchronization protocols.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAdding(true)}
          className="p-6 bg-blue-600 text-white rounded-[32px] font-black italic tracking-tight uppercase shadow-xl flex flex-col items-center justify-center gap-3 relative overflow-hidden group"
        >
          <UserPlus size={24} />
          <span className="text-[10px] tracking-widest">Add Contact</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={pickFromPhonebook}
          className="p-6 bg-white border border-neutral-100 text-neutral-900 rounded-[32px] font-black italic tracking-tight uppercase shadow-sm flex flex-col items-center justify-center gap-3 group hover:border-blue-600/30 transition-all"
        >
          <Contact size={24} className="text-blue-600" />
          <span className="text-[10px] tracking-widest">Phone Book</span>
        </motion.button>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic">Registered Contacts</h3>
           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{profile?.emergencyContacts?.length || 0} ACTIVE</span>
        </div>

        <div className="space-y-5">
          {!profile?.emergencyContacts || profile.emergencyContacts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-16 text-center bg-blue-50/30 border border-dashed border-blue-100 rounded-[40px]"
            >
              <Users size={64} className="mx-auto text-blue-200 mb-6" />
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] italic">No contacts added</p>
            </motion.div>
          ) : (
            profile.emergencyContacts.map((contact, index) => (
              <motion.div
                layout
                key={contact.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white border border-neutral-100 rounded-[32px] flex items-center justify-between group hover:border-blue-600/30 transition-all shadow-[0_10px_30px_rgba(59,130,246,0.05)]"
              >
                <div 
                  className="flex items-center gap-5 cursor-pointer flex-1"
                  onClick={() => openEdit(contact)}
                >
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl italic border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {contact.name[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center">
                       <CheckCircle2 size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-neutral-900 italic tracking-tighter truncate w-32 uppercase leading-none">{contact.name}</p>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                         <Phone size={10} className="text-blue-500" />
                         <p className="text-[9px] text-neutral-400 font-black uppercase tracking-[0.1em] group-hover:text-blue-600 transition-colors underline decoration-blue-600/10 underline-offset-2">{contact.phone}</p>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2">
                           <Mail size={10} className="text-blue-500" />
                           <p className="text-[9px] text-neutral-400 font-bold lowercase tracking-wider truncate w-32">{contact.email}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="flex gap-0.5">
                          {[1,2,3,4].map(i => (
                             <div key={i} className={`w-2 h-1 rounded-full ${i <= 3 ? 'bg-emerald-400' : 'bg-neutral-100'}`} />
                          ))}
                       </div>
                       <p className="text-[7px] text-neutral-300 font-black uppercase tracking-widest italic">Connected</p>
                    </div>
                  </div>
                </div>
                  <div className="flex items-center gap-3">
                    <motion.a
                      href={`tel:${contact.phone}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => e.stopPropagation()}
                      className="p-4 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm"
                    >
                      <Phone size={24} />
                    </motion.a>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeContact(contact); }}
                      className="p-4 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-neutral-900/60 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-sm bg-white rounded-t-[60px] sm:rounded-[60px] p-10 space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/40 animate-pulse" />
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-neutral-900">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.3em] px-4 italic">
                  {editingContact ? 'Modify your contact details.' : 'Add a new emergency contact.'}
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                    <UserPlus size={10} /> Contact name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Enter name"
                    className="w-full p-6 bg-neutral-50 rounded-[24px] border border-neutral-100 focus:border-blue-600 focus:bg-white transition-all font-black uppercase tracking-tighter text-sm italic"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                    <Globe size={10} /> Region & Phone
                  </label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        className="p-6 pr-12 bg-neutral-50 rounded-[24px] border border-neutral-100 focus:border-blue-600 focus:bg-white transition-all font-black uppercase tracking-tighter text-xs italic appearance-none cursor-pointer"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                      >
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.dialCode} className="text-sm font-sans font-medium">
                            {c.flag} {c.name.toUpperCase()} ({c.dialCode})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600">
                        <Globe size={14} />
                      </div>
                    </div>
                    <input
                      type="tel"
                      placeholder="000-000-0000"
                      className="flex-1 p-6 bg-neutral-50 rounded-[24px] border border-neutral-100 focus:border-blue-600 focus:bg-white transition-all font-black uppercase tracking-tighter text-sm italic"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                    <ShieldCheck size={10} /> Priority
                  </label>
                  <select
                    className="w-full p-6 bg-neutral-50 rounded-[24px] border border-neutral-100 focus:border-blue-600 focus:bg-white transition-all font-black uppercase tracking-tighter text-sm italic cursor-pointer"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'primary' | 'secondary')}
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-4 italic flex items-center gap-2">
                    <Mail size={10} /> Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="contact@example.com"
                    className="w-full p-6 bg-neutral-50 rounded-[24px] border border-neutral-100 focus:border-blue-600 focus:bg-white transition-all font-black tracking-tighter text-sm italic"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={isProcessing || !name || !phone}
                  onClick={() => saveContact()}
                  className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black italic tracking-[0.2em] uppercase shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Globe size={20} />
                    </motion.div>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      {editingContact ? 'Update Contact' : 'Save Contact'}
                    </>
                  )}
                </motion.button>
                <button
                  onClick={resetForm}
                  className="w-full py-2 text-neutral-300 font-black text-[10px] uppercase tracking-[0.5em] hover:text-neutral-900 transition-colors italic"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
