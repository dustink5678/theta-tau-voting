import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as authService from '../services/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { resetUserCache } from '../services/auth';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider component that provides authentication state and methods to all children
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authInitialized = useRef(false); // Prevent duplicate initializations

  // Handle errors consistently
  const handleError = (err, context = 'General') => {
    console.error(`Auth error (${context}):`, err);
    setError(err.message || `An unknown auth error occurred (${context})`);
  };

  // Get user data from Firestore
  const getUserData = async (firebaseUser) => {
    if (!firebaseUser) return null;
    console.log(`AuthContext: Getting/creating Firestore data for user ${firebaseUser.uid}`);
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        console.log("AuthContext: Firestore user document exists:", userDoc.id);
        return { ...firebaseUser, ...userDoc.data(), uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || userDoc.data().name || 'User' };
      } else {
        console.log("AuthContext: Creating new Firestore user document:", firebaseUser.uid);
        const newUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User',
          verified: false,
          answered: false,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        return newUser;
      }
    } catch (err) {
      handleError(err, 'getUserData (Firestore)');
      // Fallback to basic firebase user info if Firestore fails
      return { ...firebaseUser, uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || 'User', role: 'user', verified: false, answered: false };
    }
  };

  // Combined effect for initialization, redirect check, and auth state listening
  useEffect(() => {
    // Ensure this runs only once
    if (authInitialized.current) return;
    authInitialized.current = true;

    // Log the URL immediately on initialization
    console.log('AuthContext: Initializing. Current URL:', window.location.href);

    let unsubscribeAuth = () => {};
    let unsubscribeUserDoc = () => {};

    const initializeAuth = async () => {
      console.log('AuthContext: Starting initialization async...');
      try {
        // 1. Check for redirect result FIRST
        console.log('AuthContext: Checking for redirect result...');
        const userFromRedirect = await authService.checkRedirectResult();
        if (userFromRedirect) {
          console.log('AuthContext: Redirect result found, user:', userFromRedirect.uid);
          // User *should* be in session now, onAuthStateChanged will pick them up.
        } else {
          console.log('AuthContext: No redirect result found.');
        }
      } catch (err) {
        handleError(err, 'checkRedirectResult');
        // Don't stop initialization on redirect error, maybe user has existing session
      }

      // 2. Attach the persistent auth state listener
      console.log('AuthContext: Setting up onAuthStateChanged listener...');
      unsubscribeAuth = authService.subscribeToAuthChanges(async (firebaseUser) => {
        console.log('AuthContext: onAuthStateChanged triggered. User:', firebaseUser?.uid || 'null');
        
        // Clean up previous user doc listener if it exists
        unsubscribeUserDoc();

        if (firebaseUser) {
          // Fetch/Create Firestore data and potentially listen for updates
          const userData = await getUserData(firebaseUser);
          setCurrentUser(userData);
          
          // Optional: Set up real-time listener for Firestore document changes *after* getting initial data
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeUserDoc = onSnapshot(userRef, (userDoc) => {
             if (userDoc.exists()) {
                 console.log('AuthContext: Firestore user doc updated:', userDoc.id);
                 // Merge potentially updated Firestore data with existing state
                 // Avoid overwriting firebaseUser object parts if possible
                 setCurrentUser(prevUser => ({ ...prevUser, ...userDoc.data() })); 
             } else {
                 console.warn('AuthContext: Firestore user doc deleted while user logged in?', firebaseUser.uid);
                 setCurrentUser(null); // Or handle appropriately
             }
          }, (err) => {
             handleError(err, 'Firestore onSnapshot');
          });

        } else {
          setCurrentUser(null);
        }
        
        // Whether user is found or not, initialization is complete after first check
        console.log('AuthContext: Auth state processed, setting loading to false.');
        setLoading(false); 
      });
    };

    initializeAuth();

    // Cleanup function
    return () => {
      console.log('AuthContext: Cleaning up listeners on unmount...');
      unsubscribeAuth();
      unsubscribeUserDoc();
      authInitialized.current = false; // Allow re-init if component remounts (though usually shouldn't for top-level provider)
    };
  }, []); // Empty dependency array ensures it runs only once on mount

  // Register with email and password
  const registerWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await authService.registerWithEmail(email, password);
      // Let onAuthStateChanged handle setting the user state
      // return userCredential.user;
    } catch (err) {
      handleError(err, 'registerWithEmail');
      setLoading(false); // Ensure loading stops on error
    } 
    // Loading is set to false by onAuthStateChanged
  };

  // Sign in with email and password
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      await authService.loginWithEmail(email, password);
      // Let onAuthStateChanged handle setting the user state
    } catch (err) {
      handleError(err, 'loginWithEmail');
      setLoading(false); // Ensure loading stops on error
    }
    // Loading is set to false by onAuthStateChanged
  };

  // Google sign-in: Initiate redirect flow
  const loginWithGoogle = async () => {
    // Don't set loading here, page will reload
    setError(null);
    console.log('AuthContext: Initiating Google Sign-In (Redirect)');
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      handleError(err, 'signInWithGoogle (Initiation)');
      // Potentially set loading false here if redirect fails?
    }
  };

  // Sign in with Apple: Initiate redirect flow
  const loginWithApple = async () => {
     // Review Apple logic if switching to redirect
     setLoading(true); 
     setError(null);
     console.log('AuthContext: Initiating Apple Sign-In');
     try {
       await authService.signInWithApple(); // Assumes service handles popup/redirect
       // Let onAuthStateChanged handle user state if successful
     } catch (err) {
       handleError(err, 'signInWithApple');
       setLoading(false); // Ensure loading stops on error
     }
     // Loading is set to false by onAuthStateChanged if successful
  };

  // Sign out
  const signOut = async () => {
    setError(null);
    console.log('AuthContext: Signing out...');
    try {
      await authService.logOut();
      // onAuthStateChanged will set user to null and loading to false
    } catch (err) { 
      handleError(err, 'signOut');
    }
  };

  // Update user email
  const updateUserEmail = async (newEmail) => {
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      await authService.updateUserEmail(currentUser, newEmail);
    } catch (err) {
      return handleError(err);
    }
  };

  // Update user password
  const updateUserPassword = async (newPassword) => {
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      await authService.updateUserPassword(currentUser, newPassword);
    } catch (err) {
      return handleError(err);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (err) {
      return handleError(err);
    }
  };

  // Expose values
  const value = {
    currentUser,
    user: currentUser,
    loading,
    error,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    loginWithApple,
    signOut,
    updateUserEmail,
    updateUserPassword,
    resetPassword,
    resetUserCache: authService.resetUserCache,
    signInWithGoogle: loginWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {/* Optional global loading indicator */} 
      {/* {loading && <GlobalLoadingSpinner />} */}
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