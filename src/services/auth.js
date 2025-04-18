import { 
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { auth } from '../config/firebase'; // Import the initialized auth instance

/**
 * Initiates the Google Sign-In flow using redirect.
 */
export const signInWithGoogleRedirect = async () => {
  const provider = new GoogleAuthProvider();
  // You can add scopes or custom parameters here if needed
  // provider.addScope('profile');
  // provider.setCustomParameters({ prompt: 'select_account' });
  try {
    console.log("[AuthService] Attempting signInWithRedirect. Auth instance:", auth); // Log auth instance
    await signInWithRedirect(auth, provider);
    console.log("[AuthService] signInWithRedirect called, redirect should occur.");
  } catch (error) {
    console.error("[AuthService] Error during signInWithRedirect initiation:", error.code, error.message, error);
    throw error;
  }
};

/**
 * Checks for the result of a redirect operation.
 * Should be called when the app loads.
 * Returns the user credential on successful sign-in, null otherwise.
 */
export const checkRedirectResult = async () => {
  try {
    console.log("[AuthService] Calling getRedirectResult... Auth persistence:", auth.persistence);
    const result = await getRedirectResult(auth);
    console.log("[AuthService] getRedirectResult raw result:", result);
    if (result) {
      console.log("[AuthService] Redirect sign-in successful, returning user:", result.user);
      return result.user;
    }
    console.log("[AuthService] No redirect result found.");
    return null;
  } catch (error) {
    console.error("[AuthService] Error processing redirect result:", error.code, error.message, error);
    // Log specific details for common redirect errors
    if (error.code === 'auth/account-exists-with-different-credential') {
      console.error("[AuthService] Redirect Error Detail: Account exists with different credential. Email:", error.customData?.email, "Credential:", error.credential);
    }
    throw error;
  }
};

/**
 * Signs out the current user.
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully.");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Subscribes to authentication state changes.
 * @param {function} callback - The function to call when the auth state changes.
 * @returns {Unsubscribe} - The unsubscribe function.
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
}; 