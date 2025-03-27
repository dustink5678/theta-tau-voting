import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Enhanced Firebase config with advanced settings for CORS
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  // Added CORS configuration
  appVerificationDisabledForTesting: false
};

// Initialize Firebase with specific CORS settings
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Custom auth domain setting - allows popups to work better across browsers
auth.tenantId = null;
auth.settings.appVerificationDisabledForTesting = false;

// Set persistence to local to fix Safari and mobile browser issues
// Simplified persistence approach for better cross-browser compatibility
const initializeAuth = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("Using localStorage persistence");
    
    // Test localStorage availability
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('firebase-auth-test', 'test');
        localStorage.removeItem('firebase-auth-test');
        console.log("LocalStorage is available");
      } catch (e) {
        console.error("LocalStorage is not available. Authentication may fail.", e);
      }
    }
  } catch (error) {
    console.error("Failed to set auth persistence:", error);
  }
};

// Initialize auth persistence
initializeAuth().catch(error => {
  console.error("Failed to set auth persistence:", error);
});

export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app; 