import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { triggerHaptic } from '../lib/haptics';
import { 
  SAFETY_TIPS, 
  getSchedulerConfig, 
  saveSchedulerConfig, 
  addTipToHistory, 
  sendBrowserNotification 
} from '../services/SafetyTipsService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  timestamp: any;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  addLocalNotification: (title: string, message: string, type: 'alert' | 'info' | 'success') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [firestoreNotifications, setFirestoreNotifications] = useState<Notification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('local_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // use default
      }
    }
    return [];
  });
  
  const { user } = useAuth();

  // Load custom local notifications with timestamp serialization
  const addLocalNotification = useCallback((title: string, message: string, type: 'alert' | 'info' | 'success') => {
    const nowSecs = Math.floor(Date.now() / 1000);
    const newNotif: Notification = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      type,
      timestamp: { seconds: nowSecs, nanoseconds: 0 },
      read: false
    };
    
    setLocalNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('local_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Listen for firestore alerts
  useEffect(() => {
    if (!user) {
      setFirestoreNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'alerts'),
      where('senderId', 'in', [user.uid, ...[]]),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.status === 'ACTIVE') {
            triggerHaptic([100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300, 100, 100, 100, 100, 100, 100, 100]);
          }
        }
      });

      const newNotifications: Notification[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.status === 'ACTIVE' ? 'SOS ALERT' : 'Security Notification',
          message: data.message || 'Emergency signal detected',
          type: data.status === 'ACTIVE' ? 'alert' : 'info',
          timestamp: data.timestamp,
          read: false
        };
      });
      setFirestoreNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [user]);

  // Scheduler mechanism for daily tactical tips
  useEffect(() => {
    const checkScheduledTip = () => {
      const config = getSchedulerConfig();
      if (!config.enabled) return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

      // Skip if already sent today
      if (config.lastSentDate === todayStr) return;

      const [schedHour, schedMin] = config.time.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      // Check if past or equal to scheduled time
      const isPastOrEqual = (currentHour > schedHour) || (currentHour === schedHour && currentMin >= schedMin);
      if (!isPastOrEqual) return;

      // Select tip
      const remainingTips = SAFETY_TIPS.filter(tip => !config.receivedTipIds.includes(tip.id));
      let selectedTip = remainingTips[0];

      if (!selectedTip) {
        config.receivedTipIds = [];
        selectedTip = SAFETY_TIPS[0];
      }

      if (selectedTip) {
        addLocalNotification(
          `DAILY SAFETY TIP // ${selectedTip.category}`,
          `${selectedTip.title}: ${selectedTip.content}`,
          'info'
        );

        sendBrowserNotification(
          `Safety Tip: ${selectedTip.title}`,
          selectedTip.content
        );

        config.lastSentDate = todayStr;
        config.receivedTipIds.push(selectedTip.id);
        saveSchedulerConfig(config);
        addTipToHistory(selectedTip.id);
      }
    };

    // Run initial check on app boot up/context mount
    checkScheduledTip();

    // Check every 30 seconds
    const interval = setInterval(checkScheduledTip, 30000);
    return () => clearInterval(interval);
  }, [addLocalNotification]);

  // Merge lists
  const combinedNotifications = [
    ...localNotifications,
    ...firestoreNotifications
  ].sort((a, b) => {
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });

  const unreadCount = combinedNotifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    if (id.startsWith('local_')) {
      setLocalNotifications(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem('local_notifications', JSON.stringify(updated));
        return updated;
      });
    } else {
      setFirestoreNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const clearAll = () => {
    setLocalNotifications([]);
    localStorage.removeItem('local_notifications');
    setFirestoreNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications: combinedNotifications, 
      unreadCount, 
      markAsRead, 
      clearAll,
      addLocalNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
