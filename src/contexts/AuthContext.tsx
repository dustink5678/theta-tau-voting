import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithGoogleRedirect,
  checkRedirectResult,
  onAuthChange,
  signOutUser,
} from '../services/auth.js'; // Keep .js extension if service file is JS
import { User } from 'firebase/auth'; // Import Firebase User type

// Define type for context value
interface AuthContextType {
  currentUser: User | null; // Use imported User type
  loading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with the defined type
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provides authentication state and methods.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Use User type
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let redirectCheckDone = false;
    let authStateReceived = false;

    const updateLoadingState = () => {
      if (redirectCheckDone && authStateReceived) {
        setLoading(false);
      }
    };

    checkRedirectResult()
      .then(userFromRedirect => {
        if (userFromRedirect) {
           console.log('User found via redirect result.');
        }
      })
      .catch(err => {
        console.error('Redirect check failed:', err);
        setError(err instanceof Error ? err : new Error(String(err))); 
      })
      .finally(() => {
        redirectCheckDone = true;
        updateLoadingState();
      });

    const unsubscribe = onAuthChange((user: User | null) => { // Add type to user param
      console.log('Auth state changed, user:', user);
      setCurrentUser(user); 
      setError(null); 
      authStateReceived = true;
      updateLoadingState();
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    signInWithGoogle: signInWithGoogleRedirect,
    signOut: signOutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children} 
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the auth context.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 