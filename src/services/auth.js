import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  browserPopupRedirectResolver,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { firebaseApp } from '../config/firebase';

// Initialize Firebase auth service
const auth = getAuth(firebaseApp);

// Get the current origin for redirect
const origin = window.location.origin;
const redirectUrl = `${origin}/auth`;

// Configure auth persistence to avoid cookie issues
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Error setting persistence:", err);
});

// Modified Google sign-in with fallback strategy
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ 
    prompt: 'select_account',
    // Additional params to improve compatibility
    access_type: 'offline',
    include_granted_scopes: 'true'
  });
  
  try {
    // Try popup auth first with special resolver to avoid COOP issues
    return await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (error) {
    console.warn("Popup auth failed, falling back to redirect:", error);
    // If popup fails, fall back to redirect method with custom redirect URL
    auth.tenantId = null; // Clear any tenant ID to ensure clean redirect
    return signInWithRedirect(auth, provider);
  }
};

// Modified Apple sign-in with the same fallback approach
export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  try {
    return await signInWithPopup(auth, provider, browserPopupRedirectResolver);
  } catch (error) {
    console.warn("Popup auth failed, falling back to redirect:", error);
    return signInWithRedirect(auth, provider);
  }
};

// Email authentication methods
export const registerWithEmail = async (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithEmail = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Password management
export const resetPassword = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const updateUserEmail = async (user, newEmail) => {
  return updateEmail(user, newEmail);
};

export const updateUserPassword = async (user, newPassword) => {
  return updatePassword(user, newPassword);
};

// Session management
export const logOut = async () => {
  return signOut(auth);
};

// Auth state observer
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Legacy aliases for backwards compatibility
export const loginWithGoogle = signInWithGoogle;
export const loginWithApple = signInWithApple;
export const logout = logOut;

// Export auth instance for direct access if needed
export { auth }; 