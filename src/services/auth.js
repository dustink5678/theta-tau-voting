import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  GoogleAuthProvider,
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

// Enhanced Google sign-in with better browser compatibility
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  
  // Enhanced custom parameters for better browser compatibility
  provider.setCustomParameters({
    prompt: 'select_account',
    access_type: 'offline',
    include_granted_scopes: 'true',
    // Additional parameters for restricted browsers
    hd: '', // Allow any domain
    response_type: 'code',
  });

  // Detect browser restrictions
  const isRestrictedBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return (
      userAgent.includes('opera') ||
      userAgent.includes('opr/') ||
      userAgent.includes('edg/') && userAgent.includes('chromium') === false ||
      userAgent.includes('safari') && userAgent.includes('chrome') === false
    );
  };

  // Check for popup blockers and storage restrictions
  const checkBrowserCapabilities = () => {
    const hasLocalStorage = typeof Storage !== 'undefined' && window.localStorage;
    const hasSessionStorage = typeof Storage !== 'undefined' && window.sessionStorage;
    const hasCookies = navigator.cookieEnabled;
    
    return {
      hasLocalStorage,
      hasSessionStorage,
      hasCookies,
      isRestricted: isRestrictedBrowser()
    };
  };

  const capabilities = checkBrowserCapabilities();
  
  // For restricted browsers, use redirect method
  if (capabilities.isRestricted || !capabilities.hasLocalStorage || !capabilities.hasCookies) {
    try {
      return await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Redirect authentication failed:', error);
      throw error;
    }
  }

  // For modern browsers, try popup first, then fallback to redirect
  try {
    // Clear any previous authentication state
    localStorage.removeItem('useRedirectMode');
    
    // Attempt popup authentication
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result;
  } catch (error) {
    // Handle specific error codes for restricted browsers
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/network-request-failed' ||
      error.code === 'auth/web-storage-unsupported' ||
      error.code === 'auth/storage-unavailable' ||
      error.code === 'auth/cookie-not-set' ||
      error.code === 'auth/operation-not-allowed' ||
      error.code === 'auth/unauthorized-domain' ||
      error.code === 'auth/domain-not-whitelisted'
    ) {
      // Clear cache and try redirect method
      resetUserCache();
      await signOut(auth);
      
      try {
        return await signInWithRedirect(auth, provider);
      } catch (redirectError) {
        console.error('Both popup and redirect authentication failed:', redirectError);
        throw redirectError;
      }
    }
    
    // For other errors, throw them as-is
    throw error;
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
export const logout = logOut;

// Export auth instance for direct access if needed
export { auth }; 