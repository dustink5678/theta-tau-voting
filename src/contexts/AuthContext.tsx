import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithGoogleRedirect,
  checkRedirectResult,
  onAuthChange,
  signOutUser,
} from '../services/auth.js'; // Keep .js extension if service file is JS
import { User, setPersistence, browserLocalPersistence } from 'firebase/auth'; // Import User AND persistence methods
import { auth } from '../config/firebase'; // Import the configured auth instance

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
  const [persistenceReady, setPersistenceReady] = useState<boolean>(false); // New state

  console.log("[AuthContext] AuthProvider mounted."); // Log mount

  // Effect 1: Set persistence on mount
  useEffect(() => {
    console.log("[AuthContext] Effect 1: Setting persistence...");
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("[AuthContext] Persistence set successfully.");
        setPersistenceReady(true);
      })
      .catch((err) => {
        console.error("[AuthContext] Failed to set persistence:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setPersistenceReady(true); // Still mark as ready to allow auth checks, but with potential errors
      });
  }, []); // Run only once on mount

  // Effect 2: Handle auth state and redirect result (depends on persistence)
  useEffect(() => {
    // Only run this effect if persistence has been set (or failed)
    if (!persistenceReady) {
      console.log("[AuthContext] Effect 2: Waiting for persistence...");
      return; 
    }

    console.log("[AuthContext] Effect 2: Persistence ready. Running auth checks.");
    let redirectCheckDone = false;
    let authStateReceived = false;
    let isMounted = true;

    const updateLoadingState = () => {
      if (isMounted && persistenceReady && redirectCheckDone && authStateReceived) {
        console.log("[AuthContext] All checks complete. Setting loading to false.");
        setLoading(false);
      }
    };

    console.log("[AuthContext] Effect 2: Calling checkRedirectResult...");
    checkRedirectResult()
      .then(userFromRedirect => {
        if (!isMounted) return;
        console.log("[AuthContext] checkRedirectResult resolved. User from service:", userFromRedirect);
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

    console.log("[AuthContext] Effect 2: Subscribing to onAuthChange...");
    const unsubscribe = onAuthChange((user: User | null) => {
      if (!isMounted) return;
      console.log("[AuthContext] onAuthChange triggered. User received:", user);
      setCurrentUser(user); 
      if (user) {
          setError(null);
      }
      authStateReceived = true;
      updateLoadingState(); // Update loading state after receiving auth state
    });

    return () => {
      console.log("[AuthContext] Unmounting Effect 2. Cleaning up auth listener.");
      isMounted = false;
      unsubscribe();
    };
  }, [persistenceReady]); // Re-run this effect when persistence becomes ready

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