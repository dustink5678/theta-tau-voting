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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  console.log("[AuthContext] AuthProvider mounted."); // Log mount

  useEffect(() => {
    console.log("[AuthContext] useEffect running."); // Log effect run
    let redirectCheckDone = false;
    let authStateReceived = false;
    let isMounted = true; // Track mount status for async operations

    const updateLoadingState = () => {
      // Only update state if the component is still mounted
      if (isMounted && redirectCheckDone && authStateReceived) {
        console.log("[AuthContext] Both checks complete. Setting loading to false.");
        setLoading(false);
      }
    };

    console.log("[AuthContext] Calling checkRedirectResult...");
    checkRedirectResult()
      .then(userFromRedirect => {
        if (!isMounted) return;
        console.log("[AuthContext] checkRedirectResult resolved. User from service:", userFromRedirect);
        if (userFromRedirect) {
           console.log("[AuthContext] User details found via redirect result.");
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error("[AuthContext] Redirect check failed in context:", err, err.code, err.message);
        setError(err instanceof Error ? err : new Error(String(err))); 
      })
      .finally(() => {
        if (!isMounted) return;
        console.log("[AuthContext] checkRedirectResult finally block.");
        redirectCheckDone = true;
        updateLoadingState();
      });

    console.log("[AuthContext] Subscribing to onAuthChange...");
    const unsubscribe = onAuthChange((user: User | null) => {
      if (!isMounted) return;
      console.log("[AuthContext] onAuthChange triggered. User received:", user);
      setCurrentUser(user); 
      if (user) {
          setError(null); // Clear error only if user is successfully authenticated
      }
      authStateReceived = true;
      updateLoadingState();
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("[AuthContext] Unmounting. Cleaning up auth listener.");
      isMounted = false;
      unsubscribe();
    };
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