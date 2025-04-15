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
  browserSessionPersistence,
  setPersistence,
  getRedirectResult
} from 'firebase/auth';
import { firebaseApp } from '../config/firebase';

// Initialize Firebase auth service
const auth = getAuth(firebaseApp);

// Set base URL for redirects
const origin = window.location.origin;
const redirectUrl = `${origin}/auth`;

// Configure auth persistence to avoid cookie issues
setPersistence(auth, browserSessionPersistence).catch(err => {
  console.error("Error setting persistence:", err);
});

// Check for redirect result on page load
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('Redirect result processed successfully');
      return result.user;
    }
    return null;
  } catch (error) {
    console.error('Error processing redirect result:', error);
    throw error;
  }
};

// Modified Google sign-in with optimal strategy based on browser capabilities
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ 
    prompt: 'select_account',
    access_type: 'offline',
    include_granted_scopes: 'true'
  });
  
  // Always use redirect mode to avoid popup COOP issues
  console.log('Using redirect authentication');
  localStorage.setItem('useRedirectMode', 'true');
  return signInWithRedirect(auth, provider);
};

// Modified Apple sign-in with the same approach
export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  console.log('Using redirect authentication');
  localStorage.setItem('useRedirectMode', 'true');
  return signInWithRedirect(auth, provider);
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
  localStorage.removeItem('useRedirectMode');
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