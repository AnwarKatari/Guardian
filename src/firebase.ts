import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager,
  doc, 
  getDoc 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistency for "Local-First" behavior
// This ensures data is saved inside the device locally.
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "" 
  ? firebaseConfig.firestoreDatabaseId 
  : '(default)';

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
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({ forceOwnership: true }) })
    }, dbId);
  } catch (error2) {
    console.error("Failed to initialize Firestore with localCache, initializing default...", error2);
    dbInstance = initializeFirestore(app, {}, dbId);
  }
}

export const db = dbInstance;

export const storage = getStorage(app);
export const auth = getAuth(app);
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
    console.error("Firebase connection check failed:", error);
    return false;
  }
}
