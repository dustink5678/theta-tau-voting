import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth';

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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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

  // Sign in with Google
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.signInWithGoogle();
      // No user is returned as this is a redirect flow
      // Auth state will be updated by the useEffect
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  };

  // Sign in with Apple
  const loginWithApple = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.signInWithApple();
      // No user is returned as this is a redirect flow
      // Auth state will be updated by the useEffect
    } catch (err) {
      setLoading(false);
      return handleError(err);
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

  // Create value object with all auth state and methods
  const value = {
    currentUser,
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
    // Aliases for compatibility
    signInWithGoogle: loginWithGoogle
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