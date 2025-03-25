import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// GitHub Pages doesn't handle environment variables reliably
// Adding direct config with fallback to environment variables
const firebaseConfig = {
  apiKey: "AIzaSyAdAugzkAyQGOk4hbVRU3sIVYm8kstkd4k",
  authDomain: "thetatauvoting-8a0d0.firebaseapp.com",
  projectId: "thetatauvoting-8a0d0",
  storageBucket: "thetatauvoting-8a0d0.appspot.com",
  messagingSenderId: "425957846328",
  appId: "1:425957846328:web:6a5e518981b677d94be5cd",
  measurementId: "G-DJ46EVCY2W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize analytics only if supported (avoiding errors in some environments)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app; 