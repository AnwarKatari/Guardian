import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Home, 
  Map as MapIcon, 
  Bell, 
  Settings, 
  ShieldAlert, 
  AlertTriangle,
  LogOut,
  Plus,
  Activity,
  Users,
  MessageSquare,
  Trophy,
  Lock,
  ArrowRight,
  Phone
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { signInWithGoogle } from '../firebase';
import AuthLanding from '../pages/AuthLanding';
import Onboarding from '../pages/Onboarding';

import { GuardianLogo } from './GuardianLogo';
import { useSafety } from '../contexts/SafetyEngineContext';
import { triggerHaptic } from '../lib/haptics';

interface NavItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
  badgeCount?: number;
}

const NavItem = ({ icon: Icon, label, active, onClick, variant = 'default', badgeCount }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-1 sm:p-2 rounded-[16px] sm:rounded-[24px] transition-all duration-300 relative group h-12 sm:h-16 flex-1 min-w-0 max-w-[42px] sm:max-w-[64px]",
      active ? "text-blue-600 bg-blue-600/5 scale-105" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/50",
      variant === 'danger' && "text-red-500 hover:text-red-400"
    )}
  >
    <div className="relative">
      <Icon size={16} className={cn("transition-all duration-300 group-hover:scale-110 sm:size-[18px]", active && "scale-110")} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_8px_rgba(220,38,38,0.4)] animate-pulse">
           <span className="text-[6px] sm:text-[7px] font-black text-white">{badgeCount}</span>
        </div>
      )}
    </div>
    <span className={cn(
      "text-[6px] sm:text-[7px] mt-1 sm:mt-1.5 font-sans font-black uppercase tracking-normal sm:tracking-widest transition-all duration-300 truncate w-full text-center",
      active ? "opacity-100" : "opacity-40 group-hover:opacity-60"
    )}>{label}</span>
    {active && (
      <motion.div
        layoutId="nav-active"
        className="absolute -bottom-1 w-5 sm:w-6 h-1 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
      />
    )}
  </button>
);

const SidebarNavItem = ({ icon: Icon, label, active, onClick, badgeCount }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 relative group w-full text-left font-sans font-black text-[10px] uppercase tracking-[0.2em] italic",
      active 
        ? "text-blue-600 bg-blue-50/70 shadow-sm border border-blue-100/30" 
        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
    )}
  >
    <div className="relative shrink-0">
      <Icon size={18} className={cn("transition-all duration-300 group-hover:scale-110", active && "scale-110")} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_8px_rgba(220,38,38,0.4)]">
          <span className="text-[7px] font-black text-white">{badgeCount}</span>
        </div>
      )}
    </div>
    <span className="flex-1 truncate leading-none pt-0.5">{label}</span>
    {active && (
      <motion.div
        layoutId="sidebar-active"
        className="absolute right-3 w-1.5 h-6 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
      />
    )}
  </button>
);

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab 
}: { 
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const { user, profile, loading, isLocalMode } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const { triggerSOS, addLog, isEmergencyActive, isContactModalOpen } = useSafety();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingConnectionCount, setPendingConnectionCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [isConfirmingSOS, setIsConfirmingSOS] = useState(false);

  const handleBroadcast = async () => {
    setIsConfirmingSOS(false);
    addLog("System: Initializing emergency broadcast from Desktop Tactical Control...");
    // Strong alerting haptic pattern
    triggerHaptic([300, 80, 300, 80, 500, 80, 800]);
    const success = await triggerSOS();
    if (!success) {
      alert("Error: Emergency protocol could not be established. Please check your emergency circle settings.");
      setActiveTab('settings');
    } else {
      setActiveTab('sos');
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'friendships'), 
      where('receiverId', '==', user.uid), 
      where('status', '==', 'pending')
    );
    const unsubConnections = onSnapshot(q, (snapshot) => {
      setPendingConnectionCount(snapshot.size);
    }, (error) => {
      console.warn('Silent fail for pending connections:', error);
      setPendingConnectionCount(0);
    });

    const qMsgs = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
      setUnreadMsgCount(snapshot.size);
    }, (error) => {
      console.warn('Silent fail for unread messages (likely permission or empty):', error);
      setUnreadMsgCount(0);
    });

    return () => {
      unsubConnections();
      unsubMsgs();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <GuardianLogo size={48} />
      </div>
    );
  }

  if (!user) {
    return <AuthLanding />;
  }

  if (profile && !profile.onboardingComplete) {
    return <Onboarding />;
  }

  // FORCE SECURITY QUESTION SETUP MODAL FOR SIGNED IN USERS WITHOUT ONE
  if (profile && profile.onboardingComplete && !profile.securityQuestion && !isLocalMode) {
    return <ForceSecurityQuestionModal />;
  }

  // FORCE TELEPHONE NUMBER SETUP FOR SIGNED IN USERS WITHOUT ONE
  if (profile && profile.onboardingComplete && !profile.phoneNumber && !isLocalMode) {
    return <ForcePhoneNumberModal />;
  }

  const isDarkPage = false;

  return (
    <div className={cn(
      "min-h-screen w-screen flex items-center justify-center transition-colors duration-500 overflow-hidden relative font-sans text-neutral-900 bg-neutral-100/60",
      isEmergencyActive && "animate-blink-red"
    )}>
      {/* CSS for blinking red */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink-red { 0%, 100% { background-color: #fca5a5; } 50% { background-color: #ef4444; } }
        .animate-blink-red { animation: blink-red 0.5s infinite; }
      `}} />
      {/* Premium ambient decorative glowing blur circles on laptop/desktop to elevate visual craft */}
      <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-500/[0.03] blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-indigo-500/[0.03] blur-[120px] pointer-events-none rounded-full" />

      {/* Main Centered Panel with Max-Width constraint on Desktop to prevent stretching */}
      <div className="w-full h-screen md:h-[96vh] md:max-w-[1440px] lg:max-w-[1600px] xl:max-w-[1720px] md:my-[2vh] md:rounded-[32px] md:border md:border-neutral-200/60 md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] flex relative overflow-hidden transition-all duration-500 z-10 bg-white">
        
        {/* 1. DESKTOP PERMANENT LEFT SIDEBAR */}
        <aside className="hidden md:flex flex-col w-80 bg-white border-r border-neutral-200/60 shrink-0 h-full relative z-30 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        {/* Brand Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/10">
            <GuardianLogo size={24} pulsing={false} />
          </div>
          <div>
            <h1 className="font-display font-black text-lg tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 leading-none">
              Ai-POWERED
            </h1>
            <span className="text-[9px] font-black tracking-widest block font-sans not-italic text-neutral-400 mt-0.5">HUMAN SAFETY ALERT</span>
          </div>
        </div>

        {/* User Profile Summary */}
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl p-0.5 border-2 border-white shadow-md overflow-hidden bg-neutral-200">
              <img 
                src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black uppercase tracking-tight truncate text-neutral-900">{profile?.displayName || user.displayName || 'Security Agent'}</p>
                <div className="w-2 h-2 bg-emerald-500 rounded-full border border-white shadow-sm shrink-0" />
              </div>
              <p className="text-[10px] text-neutral-400 font-bold truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <SidebarNavItem icon={Home} label="Home Dashboard" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <SidebarNavItem icon={MapIcon} label="Tactical Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <SidebarNavItem icon={MessageSquare} label="AI Chat" active={activeTab === 'conversational-hub'} onClick={() => setActiveTab('conversational-hub')} />
          <SidebarNavItem icon={AlertTriangle} label="SOS" active={activeTab === 'sos'} onClick={() => setActiveTab('sos')} />
          <SidebarNavItem icon={Settings} label="System Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

      </aside>


      {/* 2. MAIN WORKING REGION */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* DESKTOP EXCLUSIVE TOP BAR */}
        <header className="hidden md:flex h-20 bg-white border-b border-neutral-200/50 px-8 items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-0.5">Control Terminal</h2>
              <h1 className="text-xl font-display font-black tracking-tight uppercase text-neutral-900 italic">
                {activeTab === 'home' && "Tactical Safety Command"}
                {activeTab === 'map' && "Operational Map Coverage"}
                {activeTab === 'academy' && "Academy & Threat Prep"}
                {activeTab === 'network' && "Personal Guardian Network"}
                {activeTab === 'messages' && "Cryptographically Secure Chats"}
                {activeTab === 'settings' && "System Configuration"}
                {activeTab === 'sos' && "EMERGENCY TACTICAL RESPONSE"}
                {activeTab === 'dashboard' && "Core Security Telemetry"}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-3 rounded-2xl transition-all border relative",
                  showNotifications 
                    ? "bg-neutral-100 border-neutral-300 text-neutral-900" 
                    : "text-neutral-500 bg-white border-neutral-200/60 hover:bg-neutral-50"
                )}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg shadow-red-500/30">
                    <span className="text-[8px] font-black text-white">{unreadCount}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* MOBILE EXCLUSIVE HEADER */}
        <header className="md:hidden px-6 py-4 backdrop-blur-3xl border-b flex items-center justify-between sticky top-0 z-20 transition-all duration-700 bg-white/70 border-neutral-200/50 text-neutral-900">
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-blue-600/10 group-hover:bg-blue-600/20 transition-all duration-500 group-hover:rotate-[360deg]">
              <GuardianLogo size={22} pulsing={false} />
            </div>
            <h1 className="font-display font-black text-2xl tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 leading-none">
              Ai-POWERED<br/>
              <span className="text-xs tracking-widest block font-sans not-italic text-neutral-500 mt-1">HUMAN SAFETY ALERT</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-[18px] transition-all relative text-neutral-500 hover:bg-neutral-100"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 bg-red-600 rounded-full border-2 border-transparent flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  <span className="text-[9px] font-black text-white">{unreadCount}</span>
                </div>
              )}
            </button>

            <div 
              onClick={() => setActiveTab('settings')}
              className="w-10 h-10 rounded-[18px] p-0.5 overflow-hidden border-2 cursor-pointer border-white bg-neutral-200 shadow-sm"
            >
              <img 
                src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-[16px]"
              />
            </div>
          </div>
        </header>

        {/* Notifications Panel (Absolute overlay) */}
        <AnimatePresence>
          {showNotifications && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotifications(false)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-6 top-20 w-80 max-h-[480px] overflow-hidden border border-neutral-100 rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.12)] z-50 p-2 backdrop-blur-2xl bg-white/95"
              >
                <div className="p-6 flex items-center justify-between border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Security Feed</h3>
                  </div>
                  <button 
                    onClick={clearAll}
                    className="text-[10px] font-black text-red-500 hover:bg-red-500/10 px-3 py-1 rounded-full uppercase tracking-widest transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => {
                           markAsRead(notif.id);
                           setShowNotifications(false);
                        }}
                        className="p-4 border-b last:border-0 transition-all cursor-pointer group relative overflow-hidden border-neutral-50 hover:bg-neutral-50"
                      >
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110",
                            notif.type === 'alert' 
                               ? "bg-red-500/10 text-red-500 border-red-500/20" 
                               : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          )}>
                            {notif.type === 'alert' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black uppercase italic tracking-tight text-neutral-900">{notif.title}</p>
                            <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center space-y-3">
                      <ShieldAlert className="mx-auto text-neutral-800" size={32} />
                      <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">No Notifications</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3. WORKING WORKSPACE VIEWPORT */}
        <main className={cn(
          "flex-1 relative custom-scrollbar overflow-y-auto pb-12",
          (activeTab === 'messages' || activeTab === 'map') && "overflow-hidden h-full flex flex-col pb-0"
        )}>
          <div className={cn(
            "w-full mx-auto relative p-4 sm:p-6 md:p-8",
            (activeTab === 'map' || activeTab === 'messages') ? "h-full w-full flex-1 flex flex-col p-0" : "min-h-full max-w-7xl"
          )}>
            {children}
          </div>
        </main>

        {/* MOBILE EXCLUSIVE BOTTOM NAV (NEVER SHOWN ON DESKTOP) */}
        <div className="md:hidden p-4 sm:p-5 border-t shrink-0 z-30 bg-neutral-50 border-neutral-200/60">
          <nav className="max-w-md mx-auto border border-neutral-200/50 backdrop-blur-3xl rounded-[32px] sm:rounded-[44px] p-1.5 sm:p-2 flex items-center justify-between sm:justify-around gap-1 sm:gap-2 bg-white/95 shadow-[0_32px_64px_rgba(0,0,0,0.08)]">
            <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavItem icon={MapIcon} label="Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
            
            <button
              onClick={() => setActiveTab('sos')}
              className={cn(
                "relative -mt-10 p-4 rounded-full shadow-lg shadow-red-500/30 border-4 border-white transition-all duration-300",
                activeTab === 'sos' ? "bg-red-700 scale-105" : "bg-red-600"
              )}
            >
              <AlertTriangle size={24} />
            </button>

            <NavItem icon={ShieldAlert} label="AI" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
            <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </nav>
        </div>


        {/* Swipe Slide to Confirm SOS Dialog */}

      </div>
    </div>
  </div>
  );
}

// FULL SCREEN MODAL FORCING SECURITY QUESTION SETUP
function ForceSecurityQuestionModal() {
  const { updateProfile } = useAuth();
  const [selectedQuestion, setSelectedQuestion] = useState("What was the name of your first pet?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) {
      setError("Please provide a valid security answer.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateProfile({
        securityQuestion: selectedQuestion,
        securityAnswer: answer.toLowerCase().trim()
      });
    } catch (err: any) {
      setError("Failed to update security profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-neutral-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/5 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.005)_1px,transparent_1px)] bg-[size:30px_30px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-neutral-200/60 rounded-[32px] p-8 sm:p-10 shadow-2xl relative space-y-8"
      >
        <div className="space-y-2 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto sm:mx-0 shadow-sm mb-4">
            <Lock size={22} />
          </div>
          <h2 className="text-2xl font-black italic tracking-tight text-neutral-900 uppercase font-display">Configure Security Question</h2>
          <p className="text-neutral-500 text-xs font-bold leading-relaxed italic">
            To protect your account and ensure you can recover your password if forgotten, you must choose a security question.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs italic font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Select Security Question</label>
            <select
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all italic text-neutral-900 font-bold"
            >
              <option value="What was the name of your first pet?">What was the name of your first pet?</option>
              <option value="What was the name of your first school?">What was the name of your first school?</option>
              <option value="In what city were you born?">In what city were you born?</option>
              <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              <option value="What was the make of your first car?">What was the make of your first car?</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Security Answer</label>
            <input 
              type="text"
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 font-bold uppercase italic tracking-wider"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 text-white rounded-2xl font-black font-sans text-xs uppercase tracking-[0.25em] italic transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Activity size={14} className="animate-spin" />
                <span>Securing Account...</span>
              </>
            ) : (
              <>
                <span>Save and Continue</span>
                <ArrowRight size={14} strokeWidth={3} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

// FULL SCREEN MODAL FORCING CONTACT TELEPHONE SETUP
function ForcePhoneNumberModal() {
  const { updateProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneNumber.trim();
    if (!cleaned) {
      setError("Please provide a valid contact telephone number.");
      return;
    }
    // Simple basic validation
    if (cleaned.length < 7) {
      setError("Please enter a valid telephone number (at least 7 digits).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateProfile({
        phoneNumber: cleaned
      });
    } catch (err: any) {
      setError("Failed to update contact telephone number. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-neutral-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/5 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.005)_1px,transparent_1px)] bg-[size:30px_30px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-neutral-200/60 rounded-[32px] p-8 sm:p-10 shadow-2xl relative space-y-8"
      >
        <div className="space-y-2 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto sm:mx-0 shadow-sm mb-4">
            <Phone size={22} />
          </div>
          <h2 className="text-2xl font-black italic tracking-tight text-neutral-900 uppercase font-display">Contact Required</h2>
          <p className="text-neutral-500 text-xs font-bold leading-relaxed italic">
            To ensure your safety network can locate and contact you during an emergency dispatch, you must provide a valid telephone number.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs italic font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Contact Telephone Number</label>
            <input 
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0244123456"
              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 text-xs focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-neutral-400 text-neutral-900 font-bold tracking-wider"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 text-white rounded-2xl font-black font-sans text-xs uppercase tracking-[0.25em] italic transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Activity size={14} className="animate-spin" />
                <span>Saving contact info...</span>
              </>
            ) : (
              <>
                <span>Save and Continue</span>
                <ArrowRight size={14} strokeWidth={3} />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
