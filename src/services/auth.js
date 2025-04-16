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
setPersistence(auth, browserLocalPersistence).catch(err => {
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

// Utility to clear cookies and local/session storage for cache reset
export function resetUserCache() {
  // Clear all cookies
  document.cookie.split(';').forEach((c) => {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
  });
  // Clear local and session storage
  localStorage.clear();
  sessionStorage.clear();
}

// Updated Google sign-in: only use popup, with robust error handling
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
    access_type: 'offline',
    include_granted_scopes: 'true',
  });
  try {
    // Always use popup for Google sign-in
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    // On success, clear any previous error state
    localStorage.setItem('useRedirectMode', 'false');
    return result;
  } catch (error) {
    // If we get a known cache/cookie/COOP error, reset cache and sign out
    if (
      error.code === 'auth/network-request-failed' ||
      error.code === 'auth/web-storage-unsupported' ||
      error.code === 'auth/storage-unavailable' ||
      error.code === 'auth/cookie-not-set' ||
      error.code === 'auth/operation-not-allowed'
    ) {
      resetUserCache();
      await signOut(auth);
    }
    // Remove any redirect mode flag
    localStorage.removeItem('useRedirectMode');
    throw error;
  }
};

// Modified Apple sign-in with the same approach
export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  const redirectMode = localStorage.getItem('useRedirectMode') === 'true';
  
  if (redirectMode) {
    console.log('Using redirect authentication (previous success)');
    return signInWithRedirect(auth, provider);
  }
  
  try {
    console.log('Attempting popup authentication');
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    localStorage.setItem('useRedirectMode', 'false');
    return result;
  } catch (error) {
    console.warn("Popup auth failed, falling back to redirect:", error);
    localStorage.setItem('useRedirectMode', 'true');
    auth.tenantId = null;
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