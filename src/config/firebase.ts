import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  indexedDBLocalPersistence, 
  inMemoryPersistence,
  connectAuthEmulator
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Configure auth settings to improve reliability on mobile
// Enable session cookies for better persistence across mobile browsers
auth.settings.appVerificationDisabledForTesting = false; // Ensure full security

// Set persistence in a more optimized way for mobile browsers
const initializeAuth = async () => {
  try {
    // First try using IndexedDB (most reliable across browsers)
    await setPersistence(auth, indexedDBLocalPersistence);
    console.log("Using indexedDB persistence");
  } catch (error) {
    console.warn("IndexedDB persistence failed, falling back:", error);
    try {
      // Fall back to localStorage if IndexedDB fails
      await setPersistence(auth, browserLocalPersistence);
      console.log("Using localStorage persistence");
    } catch (secondError) {
      console.warn("localStorage persistence failed, falling back:", secondError);
      // Last resort - in-memory only (session only)
      await setPersistence(auth, inMemoryPersistence);
      console.log("Using in-memory persistence");
    }
  }
};

// Initialize auth persistence
initializeAuth().catch(error => {
  console.error("Failed to set auth persistence:", error);
});

export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app; 