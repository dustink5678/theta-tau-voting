import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
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

// Configure auth persistence to avoid cookie issues
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Error setting persistence:", err);
});

// Google Client ID from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Global state management with proper locking
let isGoogleLoaded = false;
let isInitializing = false;
let oneTapPrompted = false;
let fedcmRequestInProgress = false;
let globalCredentialCallback = null;
let initializationPromise = null;
let progressiveAuthInProgress = false;
let fedcmDisabled = false;

/**
 * Modern Google Authentication Service
 * Implements Google Identity Services with proper FedCM and One Tap handling
 */

// Check if Google Identity Services is available
const checkGoogleAvailability = () => {
  return typeof window !== 'undefined' && window.google?.accounts?.id;
};

// Check if FedCM is supported and enabled
const checkFedCMSupport = () => {
  if (fedcmDisabled) {
    return false;
  }
  
  // Check if FedCM is supported
  if (!navigator.credentials?.get) {
    console.log('FedCM not supported in this browser');
    fedcmDisabled = true;
    return false;
  }
  
  return true;
};

// Wait for Google Identity Services to load with timeout
const waitForGoogle = () => {
  return new Promise((resolve) => {
    if (checkGoogleAvailability()) {
      resolve(true);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (checkGoogleAvailability()) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 10000);
  });
};

// Initialize Google Identity Services with proper configuration
const initializeGoogleIdentityServices = async () => {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }
  
  if (isGoogleLoaded) {
    return true;
  }

  initializationPromise = new Promise(async (resolve) => {
    if (isInitializing) {
      resolve(false);
      return;
    }

    isInitializing = true;

    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not found');
      isInitializing = false;
      initializationPromise = null;
      resolve(false);
      return;
    }

    const googleAvailable = await waitForGoogle();
    if (!googleAvailable) {
      console.warn('Google Identity Services failed to load');
      isInitializing = false;
      initializationPromise = null;
      resolve(false);
      return;
    }

    try {
      // Initialize with proper FedCM configuration
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false, // Disable auto-select to prevent conflicts
        cancel_on_tap_outside: true, // Allow canceling for better UX
        use_fedcm_for_prompt: true, // Enable FedCM for One Tap
        use_fedcm_for_button: true, // Enable FedCM for button
        itp_support: true, // Support Intelligent Tracking Prevention
        context: 'signin',
        prompt_parent_id: 'google-one-tap-container' // Specify parent container
      });

      isGoogleLoaded = true;
      isInitializing = false;
      initializationPromise = null;
      resolve(true);
    } catch (error) {
      console.error('Error initializing Google Identity Services:', error);
      isInitializing = false;
      initializationPromise = null;
      resolve(false);
    }
  });

  return initializationPromise;
};

// Global callback for Google credential response
const handleGoogleCredentialResponse = async (response) => {
  try {
    if (globalCredentialCallback) {
      await globalCredentialCallback(response);
    }
  } catch (error) {
    console.error('Error in credential callback:', error);
  }
};

// Set the global callback
const setGoogleCredentialCallback = (callback) => {
  globalCredentialCallback = callback;
};

/**
 * Try FedCM immediate mediation (no UI shown)
 * This is the most seamless authentication method
 */
const tryFedCMImmediate = async () => {
  if (fedcmRequestInProgress || fedcmDisabled) {
    console.log('FedCM request already in progress or disabled, skipping');
    return null;
  }

  try {
    fedcmRequestInProgress = true;

    // Check if FedCM is supported and enabled
    if (!checkFedCMSupport()) {
      return null;
    }

    // Try immediate mediation with proper error handling
    const credential = await navigator.credentials.get({
      identity: {
        providers: [{
          configURL: 'https://accounts.google.com/gsi/fedcm.json',
          clientId: GOOGLE_CLIENT_ID
        }]
      },
      mediation: 'silent'
    });

    return credential;
  } catch (error) {
    // Handle specific FedCM errors
    if (error.name === 'NotAllowedError') {
      console.log('FedCM silent mediation not available:', error.message);
      // Don't disable FedCM for NotAllowedError as it's expected for silent mediation
    } else if (error.name === 'IdentityCredentialError') {
      console.log('FedCM credential error:', error.message);
    } else if (error.name === 'NotSupportedError' || error.message?.includes('disabled')) {
      console.log('FedCM is disabled by browser or user settings');
      fedcmDisabled = true;
    } else {
      console.log('FedCM error:', error.message);
    }
    return null;
  } finally {
    fedcmRequestInProgress = false;
  }
};

/**
 * Try Google One Tap authentication
 * Properly handles all One Tap scenarios with better state management
 */
const tryOneTap = () => {
  return new Promise((resolve) => {
    if (!isGoogleLoaded) {
      console.log('Google Identity Services not loaded');
      resolve(false);
      return;
    }

    if (oneTapPrompted) {
      console.log('One Tap already prompted');
      resolve(false);
      return;
    }

    try {
      oneTapPrompted = true;
      
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.log('One Tap not displayed:', reason);
          
          // Reset flag for retry
          oneTapPrompted = false;
          resolve(false);
        } else if (notification.isSkippedMoment()) {
          const reason = notification.getSkippedReason();
          console.log('One Tap skipped:', reason);
          
          // For "unknown_reason", try again after a short delay
          if (reason === 'unknown_reason') {
            console.log('One Tap skipped with unknown_reason, will retry after delay');
            setTimeout(() => {
              oneTapPrompted = false;
              resolve(false);
            }, 1000);
          } else {
            // Reset flag for retry
            oneTapPrompted = false;
            resolve(false);
          }
        } else if (notification.isDismissedMoment()) {
          const reason = notification.getDismissedReason();
          console.log('One Tap dismissed:', reason);
          
          // Reset flag for retry
          oneTapPrompted = false;
          resolve(false);
        } else {
          console.log('One Tap displayed successfully');
          resolve(true);
        }
      });
    } catch (error) {
      console.log('One Tap error:', error);
      oneTapPrompted = false;
      resolve(false);
    }
  });
};

/**
 * Progressive Enhancement Google Sign-In
 * Tries methods in order: FedCM Immediate -> One Tap -> Traditional Button
 */
export const signInWithGoogleProgressive = async (callback) => {
  // Prevent concurrent progressive auth attempts
  if (progressiveAuthInProgress) {
    console.log('Progressive auth already in progress, skipping');
    return false;
  }

  progressiveAuthInProgress = true;

  try {
    // Set the callback for credential handling
    setGoogleCredentialCallback(callback);

    // Initialize Google services if not already done
    if (!isGoogleLoaded) {
      const initialized = await initializeGoogleIdentityServices();
      if (!initialized) {
        console.log('Failed to initialize Google Identity Services');
        return false;
      }
    }

    // Step 1: Try FedCM immediate mediation (most seamless) - only if not disabled
    if (!fedcmDisabled) {
      try {
        console.log('Trying FedCM immediate mediation...');
        const immediateCredential = await tryFedCMImmediate();
        if (immediateCredential) {
          console.log('FedCM immediate auth successful');
          return await callback({ credential: immediateCredential.token });
        }
      } catch (error) {
        console.log('FedCM immediate auth failed:', error.message);
        
        // Check for origin registration error
        if (error.message && error.message.includes('origin')) {
          console.warn('Origin not registered in Google Cloud Console. Please add localhost:5173, localhost:5174, and localhost:3000 to authorized origins.');
        }
        
        // If we get a NotAllowedError, disable FedCM for this session
        if (error.name === 'NotAllowedError') {
          console.log('FedCM disabled due to NotAllowedError');
          fedcmDisabled = true;
        }
      }
    } else {
      console.log('FedCM is disabled, skipping to One Tap');
    }

    // Step 2: Try One Tap (if FedCM failed or disabled)
    if (isGoogleLoaded && !oneTapPrompted) {
      console.log('Trying One Tap...');
      const oneTapSuccess = await tryOneTap();
      if (oneTapSuccess) {
        console.log('One Tap initiated successfully');
        return; // Callback will be called by handleGoogleCredentialResponse
      }
    } else if (oneTapPrompted) {
      console.log('One Tap already prompted, skipping');
    } else if (!isGoogleLoaded) {
      console.log('Google Identity Services not loaded for One Tap');
    }

    // Step 3: Fall back to showing traditional sign-in button
    console.log('Falling back to traditional sign-in button');
    return false; // Indicates that manual button click is needed
  } finally {
    progressiveAuthInProgress = false;
  }
};

/**
 * Traditional Google Sign-In (fallback method)
 * Enhanced with proper error handling
 */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
    access_type: 'offline',
    include_granted_scopes: 'true',
  });

  try {
    // Use popup with proper resolver
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result;
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // Enhanced error handling
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site and try again.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.code === 'auth/web-storage-unsupported') {
      throw new Error('Your browser has disabled storage. Please enable cookies and try again.');
    }
    
    throw error;
  }
};

/**
 * Render Google Sign-In Button with proper configuration
 */
export const renderGoogleSignInButton = async (parentElement, options = {}) => {
  // Wait for Google Identity Services to load and initialize
  const initialized = await initializeGoogleIdentityServices();
  if (!initialized) {
    console.warn('Google Identity Services not available');
    return false;
  }

  // Clear any existing content
  if (parentElement) {
    parentElement.innerHTML = '';
  }

  const defaultOptions = {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: 400, // Use pixel width instead of percentage
    ...options
  };

  try {
    window.google.accounts.id.renderButton(parentElement, defaultOptions);
    return true;
  } catch (error) {
    console.error('Error rendering Google Sign-In button:', error);
    return false;
  }
};

/**
 * Cancel One Tap prompt
 */
export const cancelOneTap = () => {
  if (isGoogleLoaded && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.cancel();
      oneTapPrompted = false;
    } catch (error) {
      console.log('Error canceling One Tap:', error);
    }
  }
};

/**
 * Disable auto-select
 */
export const disableAutoSelect = () => {
  if (isGoogleLoaded && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.disableAutoSelect();
    } catch (error) {
      console.log('Error disabling auto-select:', error);
    }
  }
};

/**
 * Reset authentication state
 */
export const resetAuthState = () => {
  oneTapPrompted = false;
  fedcmRequestInProgress = false;
  progressiveAuthInProgress = false;
  fedcmDisabled = false;
  cancelOneTap();
  globalCredentialCallback = null;
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
  // Reset auth state and disable auto-select
  resetAuthState();
  disableAutoSelect();
  return signOut(auth);
};

// Auth state observer
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Initialize Google Identity Services on module load
if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGoogleIdentityServices);
  } else {
    initializeGoogleIdentityServices();
  }
}

// Legacy aliases for backwards compatibility
export const loginWithGoogle = signInWithGoogle;
export const logout = logOut;
export const resetUserCache = resetAuthState;

// Export auth instance and utilities
export { 
  auth, 
  initializeGoogleIdentityServices, 
  checkGoogleAvailability,
  isGoogleLoaded
}; 