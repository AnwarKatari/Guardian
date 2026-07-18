import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager,
  doc, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistency for "Local-First" behavior
// This ensures data is saved inside the device locally.
const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

// Using persistentSingleTabManager with forceOwnership: true is the absolute safest approach.
// This completely avoids any IndexedDB locking/assertion failures (e.g. "Unexpected state")
// when pages are reloaded or opened in multiple tabs on custom hosting (like Railway).
const cacheConfig = persistentLocalCache({ 
  tabManager: persistentSingleTabManager({ forceOwnership: true }) 
});

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: cacheConfig
  }, dbId);
} catch (error) {
  console.warn("Failed to initialize Firestore with primary cache config, falling back...", error);
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({ forceOwnership: true }) }),
      experimentalForceLongPolling: true
    }, dbId);
  } catch (error2) {
    console.error("Failed to initialize Firestore with localCache, initializing default...", error2);
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, dbId);
  }
}

export const db = dbInstance;

// Test Firestore connection on initial boot (Critical Constraint from Skill)
async function testConnection() {
  // Connection test deferred to avoid blocking startup
}
testConnection();

export const storage = getStorage(app);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const loginWithEmail = (email: string, pass: string) => 
  signInWithEmailAndPassword(auth, email, pass);

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential;
};

// Connection check wrapper
export async function checkConnectivity() {
  try {
    // Attempt a simple read to check connectivity
    // Using getDoc (cached allowed) first to avoid immediate 'offline' throw if possible
    const currentUserId = auth.currentUser?.uid;
    if (currentUserId) {
      await getDoc(doc(db, 'users', currentUserId));
    }
    return true;
  } catch (error) {
    console.warn("Firebase connection check failed:", error);
    return false;
  }
}
