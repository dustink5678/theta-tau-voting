import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { resetUserCache, checkRedirectResult } from '../services/auth';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider component that provides authentication state and methods to all children
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redirectCheckComplete, setRedirectCheckComplete] = useState(false);
  const [authStateEstablished, setAuthStateEstablished] = useState(false);

  // Handle errors consistently
  const handleError = (err, context = 'General') => {
    console.error(`Auth error (${context}):`, err);
    setError(err.message || `An unknown auth error occurred (${context})`);
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

  // Effect to check for redirect result ONCE on initial mount
  useEffect(() => {
    console.log('AuthContext: Mounting, starting redirect check...');
    const processRedirect = async () => {
      try {
        const userFromRedirect = await authService.checkRedirectResult();
        if (userFromRedirect) {
          console.log('AuthContext: Redirect result found, user:', userFromRedirect.uid);
          // Don't set user here, let onAuthStateChanged handle it consistently
        } else {
          console.log('AuthContext: No redirect result found.');
        }
      } catch (err) {
        handleError(err, 'checkRedirectResult');
      } finally {
        console.log('AuthContext: Redirect check finished.');
        setRedirectCheckComplete(true);
      }
    };

    processRedirect();
    // This effect should only run once on mount.
  }, []); // Empty dependency array ensures it runs only once

  // Effect for listening to auth state changes AND user document changes
  useEffect(() => {
    console.log('AuthContext: Setting up onAuthStateChanged listener...');
    let unsubscribeUserDoc = null;

    const unsubscribeAuth = authService.subscribeToAuthChanges(async (firebaseUser) => {
      console.log('AuthContext: onAuthStateChanged triggered. User:', firebaseUser?.uid || 'null');
      setAuthStateEstablished(true); // Mark that we've received the initial state

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        // Ensure previous listener is cleaned up before starting a new one
        if (unsubscribeUserDoc) unsubscribeUserDoc(); 
        
        unsubscribeUserDoc = onSnapshot(userRef, (userDoc) => {
          if (userDoc.exists()) {
            console.log('AuthContext: Firestore user doc updated:', userDoc.id);
            setCurrentUser({
              ...firebaseUser,
              ...userDoc.data(),
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userDoc.data().name || 'User'
            });
          } else {
            console.warn('AuthContext: Firestore user doc not found for logged in user:', firebaseUser.uid);
            // Keep firebaseUser basic info if doc is missing, but log warning
             setCurrentUser({ 
              ...firebaseUser, 
              uid: firebaseUser.uid, 
              email: firebaseUser.email, 
              displayName: firebaseUser.displayName || 'User', 
              role: 'user', // Default role? 
              verified: false, 
              answered: false 
             });
            // Or set to null if Firestore doc is mandatory?
            // setCurrentUser(null); 
          }
          // Loading state is handled outside this snapshot listener
        }, (err) => {
            handleError(err, 'Firestore onSnapshot');
             // If Firestore fails, maybe still keep the basic Firebase user?
             setCurrentUser(firebaseUser); 
             // Set loading based on overall state below
        });
      } else {
        setCurrentUser(null);
        // Clean up Firestore listener if user logs out
        if (unsubscribeUserDoc) unsubscribeUserDoc(); 
      }
      // Loading state is now handled in the separate effect below
    });

    return () => {
      console.log('AuthContext: Cleaning up listeners...');
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []); // Also runs only once on mount

  // Effect to manage the final loading state
  useEffect(() => {
    // Only stop loading when BOTH redirect check is done AND initial auth state is known
    if (redirectCheckComplete && authStateEstablished) {
      console.log('AuthContext: Redirect check and auth state established. Setting loading to false.');
      setLoading(false);
    } else {
       console.log(`AuthContext: Waiting to finish loading... (Redirect Check: ${redirectCheckComplete}, Auth State: ${authStateEstablished})`);
       setLoading(true); // Ensure loading remains true until both conditions are met
    }
  }, [redirectCheckComplete, authStateEstablished]);

  // Register with email and password
  const registerWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await authService.registerWithEmail(email, password);
      return userCredential.user;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await authService.loginWithEmail(email, password);
      return userCredential.user;
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in: Initiate redirect flow
  const loginWithGoogle = async () => {
    setError(null);
    console.log('AuthContext: Initiating Google Sign-In (Redirect)');
    try {
      await authService.signInWithGoogle();
      // Redirect initiated, no immediate result here.
    } catch (err) {
      handleError(err, 'signInWithGoogle (Initiation)');
      throw err; // Re-throw for UI component to handle
    }
  };

  // Sign in with Apple: Initiate redirect flow
  const loginWithApple = async () => {
    setLoading(true); // Needs review if switching Apple to redirect too
    setError(null);
    console.log('AuthContext: Initiating Apple Sign-In');
    try {
      // Assuming authService.signInWithApple handles popup/redirect logic internally
      const result = await authService.signInWithApple(); 
      // If Apple also uses redirect, this needs adjustment similar to Google
      // If it uses popup, the result handling might be okay, but needs review
      if (result?.user) { // Check if result is from popup
         console.log('AuthContext: Apple Sign-In (Popup) successful');
         // Let onAuthStateChanged handle user state update for consistency
         // return result.user; 
      } else {
         console.log('AuthContext: Apple Sign-In (Redirect) initiated');
      }
    } catch (err) {
      handleError(err, 'signInWithApple');
      // setLoading(false); // Handled by loading state effect
      throw err; // Re-throw for UI
    } finally {
      // setLoading(false); // Handled by loading state effect
    }
  };

  // Sign out
  const signOut = async () => {
    setError(null);
    console.log('AuthContext: Signing out...');
    try {
      await authService.logOut();
      setCurrentUser(null); // Explicitly set user to null on sign out
      setAuthStateEstablished(false); // Reset established state
      setRedirectCheckComplete(false); // Reset redirect check state? Maybe not needed.
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