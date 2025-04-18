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

  console.log("[AuthContext] AuthProvider mounted."); // Log mount

  // Combined effect for persistence and auth state
  useEffect(() => {
    console.log("[AuthContext] Effect: Starting...");
    let isMounted = true;
    let unsubscribe = () => {}; // Initialize unsubscribe to a no-op

    const setupAuth = async () => {
      console.log("[AuthContext] Effect: Setting persistence...");
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log("[AuthContext] Persistence set successfully.");
        
        if (!isMounted) return; // Check mount status after async operation

        // Now that persistence is set, check redirect and listen for auth changes
        console.log("[AuthContext] Effect: Calling checkRedirectResult...");
        try {
          await checkRedirectResult(); // Wait for redirect check
          console.log("[AuthContext] checkRedirectResult completed.");
        } catch (redirectError) {
          if (isMounted) {
            console.error("[AuthContext] Redirect check failed:", redirectError);
            setError(redirectError instanceof Error ? redirectError : new Error(String(redirectError)));
          }
        }
        
        if (!isMounted) return;

        console.log("[AuthContext] Effect: Subscribing to onAuthChange...");
        unsubscribe = onAuthChange((user: User | null) => {
          if (isMounted) {
            console.log("[AuthContext] onAuthChange triggered. User received:", user);
            setCurrentUser(user);
            setError(null); // Clear error on successful auth change (or null user)
            // Set loading to false ONLY after the first auth state is received
            console.log("[AuthContext] First auth state received. Setting loading to false.");
            setLoading(false);
          }
        });

      } catch (persistenceError) {
        if (isMounted) {
          console.error("[AuthContext] Failed to set persistence:", persistenceError);
          setError(persistenceError instanceof Error ? persistenceError : new Error(String(persistenceError)));
          // Still set loading to false even if persistence fails, otherwise app hangs
          console.log("[AuthContext] Persistence failed. Setting loading to false.");
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      console.log("[AuthContext] Unmounting Effect. Cleaning up auth listener.");
      isMounted = false;
      unsubscribe();
    };
  }, []); // Run only once on mount

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