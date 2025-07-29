import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithGoogle, signInWithApple, resetUserCache } from '../services/auth';

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
  const getUserData = async (user, additionalData = {}) => {
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
        // Create a new user document with additional data if provided
        const displayName = additionalData.firstName && additionalData.lastName 
          ? `${additionalData.firstName} ${additionalData.lastName}`
          : user.displayName || 'User';
          
        const newUser = {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          firstName: additionalData.firstName || null,
          lastName: additionalData.lastName || null,
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
    const unsubscribeAuth = authService.subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to changes on the user's Firestore document
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userDoc => {
          if (userDoc.exists()) {
            setCurrentUser({
              ...firebaseUser,
              ...userDoc.data(),
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userDoc.data().name || 'User'
            });
          } else {
            setCurrentUser(null);
          }
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Register with email and password
  const registerWithEmail = async (email, password, userData = {}) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await authService.registerWithEmail(email, password);
      // Create user document with additional data
      await getUserData(userCredential.user, userData);
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

  // Google sign-in (updated)
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      await getUserData(result.user);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Sign in with Apple
  const loginWithApple = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signInWithApple();
      // With popup flow, we get the user result directly
      return result.user;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setError(null);
    try {
      await authService.logOut();
    } catch (err) {
      return handleError(err);
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

  // Expose resetUserCache for UI use
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
    resetUserCache,
    // Aliases for compatibility
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