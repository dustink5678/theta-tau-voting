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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Start loading as true, but rely on onAuthChange for the primary loading signal
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Flag to prevent setting loading false too early if redirect check is slow
    let redirectCheckInProgress = true; 

    // Check redirect result, but don't block the main loading state on it.
    // onAuthStateChanged should handle the user state after redirect.
    checkRedirectResult()
      .then(userFromRedirect => {
        console.log("[AuthContext] checkRedirectResult resolved. User from service:", userFromRedirect);
        // We don't necessarily need to do anything with the user here,
        // as onAuthChange should fire shortly after if sign-in was successful.
      })
      .catch(err => {
        console.error("[AuthContext] Redirect check failed in context:", err);
        // Only set error if auth hasn't loaded a user yet
        if (!currentUser) { 
            setError(err instanceof Error ? err : new Error(String(err)));
        } 
      })
      .finally(() => {
        redirectCheckInProgress = false;
        // If onAuthChange has already run and set user to null, 
        // we might be done loading here if redirect also failed.
        // However, let's primarily let onAuthChange control the loading flag.
        console.log("[AuthContext] Redirect check finished.");
      });

    // Subscribe to auth state changes - THIS is the primary source of truth.
    const unsubscribe = onAuthChange((user: User | null) => {
      console.log("[AuthContext] onAuthChange triggered. User received:", user);
      setCurrentUser(user);
      setError(null); // Clear any previous error on successful auth state change
      
      // Regardless of user being null or an object, the auth state is now known.
      // We might wait briefly for redirect check if it's still running, but 
      // generally, onAuthChange means Firebase has initialized its state.
      setLoading(false); 
    });

    // Cleanup subscription on unmount
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