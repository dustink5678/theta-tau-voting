// Firebase configuration with modular SDK
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAwywLsoOLlC5Sw7d94-hfOiVSHJ9y-uE4",
  authDomain: "thetatauzetadeltavoting.firebaseapp.com",
  projectId: "thetatauzetadeltavoting",
  storageBucket: "thetatauzetadeltavoting.firebasestorage.app",
  messagingSenderId: "1066578439936",
  appId: "1:1066578439936:web:7fd9d52aed4f7e7ed50de5",
  measurementId: "G-Z5VBGV9QBZ"
};

// Initialize Firebase with error handling
let firebaseApp;
try {
  firebaseApp = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Initialize Firebase services with error handling
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Initialize Analytics conditionally to handle privacy blockers
let analytics = null;
isSupported().then(yes => {
  if (yes) {
    analytics = getAnalytics(firebaseApp);
    console.log('Analytics initialized successfully');
  } else {
    console.log('Analytics not supported in this environment');
  }
}).catch(error => {
  console.error('Error initializing analytics:', error);
});

// Connect to emulators if in development mode
if (process.env.NODE_ENV === 'development' || import.meta.env?.DEV) {
  try {
    // Uncomment these lines if you're using Firebase emulators
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // console.log('Connected to Firebase emulators');
  } catch (error) {
    console.error('Error connecting to emulators:', error);
  }
}

export { auth, db, analytics, firebaseApp }; 