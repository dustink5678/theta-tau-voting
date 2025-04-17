import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  signInWithGoogle as authSignInWithGoogle,
  signInWithApple as authSignInWithApple,
  resetUserCache as authResetUserCache,
  checkRedirectResult,
  subscribeToAuthChanges,
  logOut,
  registerWithEmail,
  loginWithEmail,
  updateUserEmail,
  updateUserPassword,
  resetPassword
} from '../services/auth';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider component that provides authentication state and methods to all children
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle errors consistently
  const handleError = (err) => {
    console.error('Auth error:', err);
    setError(err);
    throw err;
  };

  // Get user data from Firestore
  const getUserData = async (user) => {
    if (!user) return null;
    
    try {
      console.log("Getting user data for:", user.uid);
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        console.log("User document exists:", userDoc.data());
        // Return a combination of Firebase auth user and Firestore data
        return {
          ...user,
          ...userDoc.data(),
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || userDoc.data().name || 'User'
        };
      } else {
        console.log("Creating new user document");
        // Create a new user document
        const newUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          verified: false,
          answered: false,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        
        await setDoc(userRef, newUser);
        return newUser;
      }
    } catch (err) {
      console.error("Error getting user data:", err);
      return {
        ...user,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        role: 'user',
        verified: false,
        answered: false
      };
    }
  };

  // Replace the useEffect for auth state changes with a real-time Firestore listener
  useEffect(() => {
    let unsubscribeUserDoc = null;
    let isRedirectResultChecked = false;
    let isAuthStateReady = false;

    const checkLoadingComplete = () => {
      if (isRedirectResultChecked && isAuthStateReady) {
        setLoading(false);
      }
    };
    
    // Call checkRedirectResult when the component mounts
    checkRedirectResult().then(userFromRedirect => {
      console.log('Redirect result checked, user:', userFromRedirect);
      isRedirectResultChecked = true;
      checkLoadingComplete();
    }).catch(error => {
      console.error("Error during initial redirect check:", error);
      isRedirectResultChecked = true; // Still mark as checked even on error
      checkLoadingComplete();
    });

    const unsubscribeAuth = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to changes on the user's Firestore document
        const userRef = doc(db, 'users', firebaseUser.uid);
        // Clear previous listener if any
        if (unsubscribeUserDoc) unsubscribeUserDoc();

        unsubscribeUserDoc = onSnapshot(userRef, (userDoc) => {
          if (userDoc.exists()) {
            setCurrentUser({
              ...firebaseUser, // Base Firebase Auth user data
              ...userDoc.data(), // Firestore specific data (role, verified, etc.)
              // Ensure crucial fields from Firebase Auth are preserved
              uid: firebaseUser.uid,
              email: firebaseUser.email, 
              displayName: userDoc.data().displayName || firebaseUser.displayName || userDoc.data().name || 'User' 
            });
          } else {
             // If Firestore doc doesn't exist (edge case?), maybe create it or set user to null?
             // For now, setting user to null if Firestore doc is missing.
             console.warn('Firestore document missing for user:', firebaseUser.uid);
             setCurrentUser(null);
             // Attempt to create the doc again
             getUserData(firebaseUser).catch(err => console.error("Error trying to create missing user doc:", err));
          }
          isAuthStateReady = true;
          checkLoadingComplete();
        }, (error) => {
            // Error handling for the Firestore snapshot listener
            console.error("Error listening to user document:", error);
            setCurrentUser(null); // Assume user data is invalid/unavailable on error
            isAuthStateReady = true;
            checkLoadingComplete();
        });
      } else {
        // User is signed out
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        setCurrentUser(null);
        isAuthStateReady = true;
        checkLoadingComplete();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Register with email and password (using imported service)
  const register = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await registerWithEmail(email, password);
      // Optionally wait for Firestore doc creation triggered by onAuthStateChanged
      return userCredential.user;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password (using imported service)
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await loginWithEmail(email, password);
      // Auth state change will handle setting the user state
      return userCredential.user;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in (using imported service)
  const googleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // signInWithGoogle from authService now initiates redirect
      await authSignInWithGoogle();
      // Result is handled by getRedirectResult and onAuthStateChanged
    } catch (err) {
      // Handle redirect initiation errors if any
      setError(err.message || 'Failed to initiate Google Sign-in');
      setLoading(false);
      throw err;
    }
    // setLoading(false) will be handled by the useEffect hook when auth state updates
  };

  // Sign in with Apple (using imported service)
  const appleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // authSignInWithApple handles popup/redirect logic
      await authSignInWithApple();
      // Result/state update handled by getRedirectResult/onAuthStateChanged
    } catch (err) {
      setError(err.message || 'Failed to initiate Apple Sign-in');
      setLoading(false);
      throw err;
    } 
  };

  // Sign out (using imported service)
  const logout = async () => {
    setError(null);
    try {
      await logOut();
      // Auth state change will set currentUser to null
    } catch (err) {
      return handleError(err);
    }
  };

  // Update user email (using imported service)
  const updateEmailHandler = async (newEmail) => {
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      await updateUserEmail(currentUser, newEmail);
      // Optionally refresh user data or rely on listeners
    } catch (err) {
      return handleError(err);
    }
  };

  // Update user password (using imported service)
  const updatePasswordHandler = async (newPassword) => {
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      await updateUserPassword(currentUser, newPassword);
    } catch (err) {
      return handleError(err);
    }
  };

  // Reset password (using imported service)
  const resetPasswordHandler = async (email) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err) {
      return handleError(err);
    }
  };

  // Expose resetUserCache for UI use (using imported service)
  const resetCache = () => {
    authResetUserCache();
  }

  const value = {
    currentUser,
    user: currentUser, // Alias for compatibility
    loading,
    error,
    registerWithEmail: register, // Use wrapped function
    loginWithEmail: login,       // Use wrapped function
    loginWithGoogle: googleLogin, // Use wrapped function
    loginWithApple: appleLogin,   // Use wrapped function
    signOut: logout,             // Use wrapped function
    updateUserEmail: updateEmailHandler, // Use wrapped function
    updateUserPassword: updatePasswordHandler, // Use wrapped function
    resetPassword: resetPasswordHandler, // Use wrapped function
    resetUserCache: resetCache, // Use wrapped function
    // Aliases for compatibility
    signInWithGoogle: googleLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// For backwards compatibility
export const useAuthContext = useAuth; 