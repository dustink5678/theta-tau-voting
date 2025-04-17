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

// Updated Google sign-in: use redirect
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account', // Optional: customize prompt
    // Add any other Google-specific parameters if needed
  });
  try {
    // Initiate redirect flow
    await signInWithRedirect(auth, provider);
    // Note: signInWithRedirect does not return a result directly here.
    // The result is handled by getRedirectResult on page load.
  } catch (error) {
    console.error('Error initiating Google sign-in redirect:', error);
    // Re-throw the error to be handled by the caller if necessary
    throw error;
  }
  // No return value needed here as the page will redirect.
};

// Modified Apple sign-in: Keep the popup/redirect fallback logic
export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  try {
    console.log('Attempting Apple popup authentication');
    // Try popup first for Apple
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result; // Return result directly on popup success
  } catch (error) {
    // Handle common popup errors or decide to fallback
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      console.warn('Apple Popup cancelled by user.');
      // Don't automatically redirect if user explicitly closed popup
      throw error; 
    } else if (error.code === 'auth/operation-not-supported-in-this-environment' || 
               error.code === 'auth/popup-blocked' ||
               error.code === 'auth/cors-unsupported') { 
      // Fallback to redirect if popup is blocked or unsupported
      console.warn("Apple Popup auth failed, falling back to redirect:", error);
      auth.tenantId = null; // Ensure tenant ID is null if necessary for redirect
      try {
        await signInWithRedirect(auth, provider);
        // Redirect initiated, no return value needed here.
      } catch (redirectError) {
        console.error("Error initiating Apple sign-in redirect:", redirectError);
        throw redirectError; // Throw redirect initiation error
      }
    } else {
       // Handle other errors (e.g., network, provider errors)
       console.error("Apple sign-in error:", error);
       throw error;
    }
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