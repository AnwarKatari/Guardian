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
  User,
  LogOut,
  Plus,
  Activity,
  Users,
  MessageSquare
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { signInWithGoogle } from '../firebase';
import AuthLanding from '../pages/AuthLanding';
import Onboarding from '../pages/Onboarding';

import { GuardianLogo } from './GuardianLogo';

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
      "flex flex-col items-center justify-center p-2 rounded-[24px] transition-all duration-300 relative group h-14 w-14 sm:h-16 sm:w-16",
      active ? "text-blue-600 bg-blue-600/5 scale-105" : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/50",
      variant === 'danger' && "text-red-500 hover:text-red-400"
    )}
  >
    <div className="relative">
      <Icon size={18} className={cn("transition-all duration-300 group-hover:scale-110", active && "scale-110")} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_8px_rgba(220,38,38,0.4)] animate-pulse">
           <span className="text-[7px] font-black text-white">{badgeCount}</span>
        </div>
      )}
    </div>
    <span className={cn(
      "text-[7px] mt-1.5 font-sans font-black uppercase tracking-widest transition-all duration-300",
      active ? "opacity-100" : "opacity-40 group-hover:opacity-60"
    )}>{label}</span>
    {active && (
      <motion.div
        layoutId="nav-active"
        className="absolute -bottom-1 w-6 h-1 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
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
  const { user, profile, loading } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingConnectionCount, setPendingConnectionCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

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

  const isDarkPage = false;

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden transition-colors duration-500",
      isDarkPage ? "bg-[#050505]" : "bg-neutral-50"
    )}>
      {/* Header */}
      <header className={cn(
        "px-6 py-4 backdrop-blur-3xl border-b flex items-center justify-between sticky top-0 z-20 transition-all duration-700",
        isDarkPage 
          ? "bg-[#050505]/60 border-white/5 text-white" 
          : "bg-white/70 border-neutral-200/50 text-neutral-900"
      )}>
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
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "p-2.5 rounded-[18px] transition-all relative overflow-hidden group",
              activeTab === 'dashboard' 
                ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20" 
                : isDarkPage ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:bg-neutral-100"
            )}
          >
            <Activity size={20} />
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              "p-2.5 rounded-[18px] transition-all relative",
              isDarkPage ? "text-neutral-400 hover:text-white hover:bg-white/5" : "text-neutral-500 hover:bg-neutral-100"
            )}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 min-w-[16px] h-[16px] px-1 bg-red-600 rounded-full border-2 border-transparent flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                <span className="text-[9px] font-black text-white">{unreadCount}</span>
              </div>
            )}
          </button>

          {/* Profile Quick Toggle */}
          <div 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-10 h-10 rounded-[18px] p-0.5 overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 active:scale-95",
              isDarkPage ? "border-white/10 bg-white/5" : "border-white bg-neutral-200 shadow-sm"
            )}
          >
            <img 
              src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Profile" 
              className="w-full h-full object-cover rounded-[16px]"
            />
          </div>
        </div>

        {/* Notifications Panel */}
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
                className={cn(
                  "absolute right-6 top-20 w-80 max-h-[480px] overflow-hidden border rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.5)] z-50 p-2 backdrop-blur-2xl transition-colors duration-500",
                  isDarkPage ? "bg-[#0d0d0d]/90 border-white/10" : "bg-white/95 border-neutral-100"
                )}
              >
                <div className="p-6 flex items-center justify-between border-b border-white/5">
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
                        className={cn(
                          "p-4 border-b last:border-0 transition-all cursor-pointer group relative overflow-hidden",
                          isDarkPage ? "border-white/5 hover:bg-white/5" : "border-neutral-50 hover:bg-neutral-50",
                          !notif.read && (isDarkPage ? "bg-blue-600/10" : "bg-blue-50")
                        )}
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
                            <p className={cn(
                              "text-xs font-black uppercase italic tracking-tight",
                              isDarkPage ? "text-white" : "text-neutral-900"
                            )}>{notif.title}</p>
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
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 relative custom-scrollbar",
        activeTab === 'messages' ? "overflow-hidden" : "overflow-y-auto pb-24"
      )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 sm:pb-8 z-30 pointer-events-none">
        <nav className={cn(
          "max-w-md mx-auto border-2 backdrop-blur-3xl rounded-[44px] p-2 flex items-center justify-around pointer-events-auto transition-all duration-500",
          isDarkPage 
            ? "bg-black/95 border-white/20 shadow-[0_40px_80px_rgba(0,0,0,1)]" 
            : "bg-white border-neutral-200/50 shadow-[0_40px_80px_rgba(0,0,0,0.2)]"
        )}>
          <NavItem icon={Home} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={MapIcon} label="Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          
          {/* Quick SOS Trigger */}
          <div className="relative -mt-16 sm:-mt-20">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl scale-150"
            />
            <motion.button
              whileHover={{ scale: 1.15, y: -5 }}
              whileTap={{ scale: 0.9, rotate: -5 }}
              onClick={() => {
                if ('vibrate' in navigator) {
                  navigator.vibrate([100, 50, 100]);
                }
                setActiveTab('sos');
              }}
              className={cn(
                "w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] flex items-center justify-center transition-all border-4 relative overflow-hidden group",
                isDarkPage ? "border-[#050505] shadow-[0_20px_50px_rgba(220,38,38,0.6)]" : "border-white shadow-[0_20px_50px_rgba(220,38,38,0.4)]",
                "bg-red-600 text-white"
              )}
            >
              {/* Internal Diagnostic/Advanced layers */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_70%)] opacity-10 animate-pulse" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 opacity-20"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-white via-transparent to-transparent" />
              </motion.div>
              
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
              
              <div className="relative z-10 flex flex-col items-center gap-1">
                <AlertTriangle size={32} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                <span className="text-[8px] font-black tracking-[0.2em] uppercase italic opacity-80">SOS</span>
              </div>

              {/* Advanced Ripple Layers */}
              <motion.div 
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-red-400"
              />
              <motion.div 
                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                className="absolute inset-0 rounded-full bg-red-300"
              />
            </motion.button>
          </div>
          
          <NavItem icon={Users} label="Network" active={activeTab === 'network'} onClick={() => setActiveTab('network')} badgeCount={pendingConnectionCount} />
          <NavItem icon={MessageSquare} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} badgeCount={unreadMsgCount} />
          <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </div>
    </div>
  );
}
