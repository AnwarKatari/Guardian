import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isLocalMode: boolean;
  setLocalMode: (enabled: boolean) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(() => {
    return localStorage.getItem('guardian_local_mode') === 'true';
  });

  const setLocalMode = (enabled: boolean) => {
    setIsLocalMode(enabled);
    if (enabled) {
      localStorage.setItem('guardian_local_mode', 'true');
      // Create or load mock local profile
      const storedProfile = localStorage.getItem('guardian_local_profile');
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      } else {
          const localProfile: UserProfile = {
            uid: 'local-user',
            displayName: 'Local User',
            email: 'local@guardian.offline',
            photoURL: '',
            countryCode: 'GH',
            emergencyContacts: [],
            safetyZones: [],
            isSharingLocation: false,
            evidenceSync: false,
            trustedContactIds: [],
            onboardingComplete: false,
            isPrivacyMode: false,
            isOnline: true,
            voiceSentinelEnabled: false,
            securityOverlayActive: false,
            customSOSMessage: "OFFLINE SOS: Local node emergency triggered.",
            fakeCallSettings: {
              callerName: "Security Dispatch",
              triggerDelay: 5,
              voiceType: 'neutral'
            }
          };
        localStorage.setItem('guardian_local_profile', JSON.stringify(localProfile));
        setProfile(localProfile);
      }
      disableNetwork(db);
    } else {
      localStorage.removeItem('guardian_local_mode');
      localStorage.removeItem('guardian_local_profile');
      setProfile(null);
      enableNetwork(db);
    }
  };

  useEffect(() => {
    if (isLocalMode) {
      disableNetwork(db);
      const storedProfile = localStorage.getItem('guardian_local_profile');
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      } else {
        setLocalMode(true);
      }
      setLoading(false);
      return;
    }

    let unsubSnapshot: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clean up previous snapshot listener if it exists
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      setUser(user);
      
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Initial fetch and setup
        try {
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            const initialProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              email: user.email || '',
              photoURL: user.photoURL || '',
              countryCode: 'GH',
              emergencyContacts: [],
              safetyZones: [],
              isSharingLocation: false,
              evidenceSync: true,
              trustedContactIds: [],
              onboardingComplete: false,
              isPrivacyMode: false,
              isOnline: true,
              lastSeen: new Date().toISOString(),
              voiceSentinelEnabled: false,
              securityOverlayActive: false,
              autoCheckInInterval: 0,
              lastCheckInAt: '',
              bio: '',
              gender: 'other',
              customSOSMessage: "EMERGENCY: I need help! My current location is attached.",
              fakeCallSettings: {
                callerName: "Security Dispatch",
                triggerDelay: 5,
                voiceType: 'neutral'
              }
            };
            await setDoc(userRef, initialProfile);
          }

          // Start listening for profile changes
          unsubSnapshot = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              setProfile(snapshot.data() as UserProfile);
            }
            setLoading(false);
          }, (error) => {
            console.error("Profile snapshot failed:", error);
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, user);
            setLoading(false);
          });

        } catch (error) {
          console.error("Auth initialization failed:", error);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, user);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [isLocalMode]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isLocalMode) {
      if (profile) {
        const newProfile = { ...profile, ...updates };
        localStorage.setItem('guardian_local_profile', JSON.stringify(newProfile));
        setProfile(newProfile);
      }
    } else if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updates, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isLocalMode, setLocalMode, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
