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
  console.log("[AuthService] signInWithGoogleRedirect called. Provider created. Attempting Firebase signInWithRedirect...");
  try {
    await signInWithRedirect(auth, provider);
    // Redirect will happen, so no return value needed here.
  } catch (error) {
    console.error("Error initiating Google Sign-In redirect:", error);
    // Re-throw the error to be handled by the UI
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
    console.log("[AuthService] Calling getRedirectResult..."); // Log before call
    const result = await getRedirectResult(auth);
    console.log("[AuthService] getRedirectResult raw result:", result); // Log the raw result
    if (result) {
      // User successfully signed in via redirect.
      console.log("[AuthService] Redirect sign-in successful, returning user:", result.user);
      return result.user; // Return the user object
    }
    // No redirect result found.
    console.log("[AuthService] No redirect result found.");
    return null;
  } catch (error) {
    // Handle specific errors if needed, e.g., account-exists-with-different-credential
    console.error("[AuthService] Error processing redirect result:", error);
    // Re-throw the error to be handled by the AuthContext or UI
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