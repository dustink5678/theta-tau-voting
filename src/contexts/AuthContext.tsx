import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  signInWithGoogle, 
  signInWithGoogleProgressive, 
  cancelOneTap,
  disableAutoSelect,
  initializeGoogleIdentityServices
} from '../services/auth';
import { User as FirebaseUser } from 'firebase/auth';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user';
  verified: boolean;
  answered: boolean;
  createdAt?: string;
  name?: string;
}

interface AuthContextType {
  currentUser: User | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  registerWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  loginWithGoogle: () => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInWithGoogleProgressive: () => Promise<any>;
  signOut: () => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resetUserCache: () => void;
  initializeOneTap: () => Promise<boolean>;
  cancelOneTap: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider component that provides authentication state and methods to all children
 * Now includes modern Google Identity Services with One Tap and FedCM support
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oneTapInitialized, setOneTapInitialized] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const [initializationInProgress, setInitializationInProgress] = useState(false);

  // Handle errors consistently
  const handleError = (err: any): never => {
    console.error('Auth error:', err);
    setError(err.message || err.toString());
    throw err;
  };

  // Handle Google Identity Services credential response
  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Received Google credential response:', response);
      
      // The response contains the Google ID token
      const { credential } = response;
      
      if (!credential) {
        throw new Error('No credential received from Google');
      }

      // Parse the JWT token to get user info
      const base64Payload = credential.split('.')[1];
      const decodedPayload = JSON.parse(atob(base64Payload));
      
      console.log('Decoded Google payload:', decodedPayload);
      
      // Create a mock Firebase user object for compatibility
      const mockFirebaseUser = {
        uid: decodedPayload.sub,
        email: decodedPayload.email,
        displayName: decodedPayload.name,
        photoURL: decodedPayload.picture,
        emailVerified: decodedPayload.email_verified
      };

      // Get or create user data in Firestore
      await getUserData(mockFirebaseUser as any);
      
      console.log('Google One Tap/FedCM sign-in successful');
      setLoading(false);
      
    } catch (error: any) {
      console.error('Error handling Google credential response:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  };

  // Get user data from Firestore with better error handling
  const getUserData = async (user: FirebaseUser): Promise<User | null> => {
    if (!user) return null;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Try to get existing user document
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Return a combination of Firebase auth user and Firestore data
        const userData = userDoc.data();
        const combinedUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || userData.name || 'User',
          role: userData.role || 'user',
          verified: userData.verified || false,
          answered: userData.answered || false,
          createdAt: userData.createdAt,
          name: userData.name
        };
        
        setCurrentUser(combinedUser);
        return combinedUser;
      } else {
        // Create a new user document
        const newUser: User = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          verified: false,
          answered: false,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        
        try {
          await setDoc(userRef, newUser);
          console.log('Created new user document for:', user.uid);
        } catch (writeError: any) {
          console.error('Error creating user document:', writeError);
          // Continue with fallback user even if write fails
        }
        
        setCurrentUser(newUser);
        return newUser;
      }
    } catch (err: any) {
      console.error("Error getting user data:", err);
      
      // Create fallback user if Firestore access fails
      const fallbackUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role: 'user' as const,
        verified: false,
        answered: false
      };
      
      setCurrentUser(fallbackUser);
      return fallbackUser;
    }
  };

  // Initialize One Tap authentication
  const initializeOneTap = async (): Promise<boolean> => {
    if (oneTapInitialized || currentUser || initializationAttempted || initializationInProgress) {
      return false; // Already initialized, user is signed in, already attempted, or in progress
    }

    try {
      setInitializationInProgress(true);
      setInitializationAttempted(true);
      setOneTapInitialized(true);
      
      // Initialize Google Identity Services
      await initializeGoogleIdentityServices();
      
      // Try progressive authentication
      const result = await signInWithGoogleProgressive(handleGoogleCredentialResponse);
      
      return result !== false; // Returns false if manual button click is needed
    } catch (error: any) {
      console.log('One Tap initialization failed:', error);
      return false;
    } finally {
      setInitializationInProgress(false);
    }
  };

  // Replace the useEffect for auth state changes with a real-time Firestore listener
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    
    const unsubscribeAuth = authService.subscribeToAuthChanges(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // First, ensure user document exists
          await getUserData(firebaseUser);
          
          // Then listen to changes on the user's Firestore document
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeUserDoc = onSnapshot(userRef, (userDoc) => {
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setCurrentUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || userData.name || 'User',
                role: userData.role || 'user',
                verified: userData.verified || false,
                answered: userData.answered || false,
                createdAt: userData.createdAt,
                name: userData.name
              });
            } else {
              // User document doesn't exist, create it
              console.log('User document not found, creating new one for:', firebaseUser.uid);
              getUserData(firebaseUser);
            }
            setLoading(false);
          }, (error) => {
            console.error('Error listening to user document:', error);
            // Fallback to basic user data if Firestore fails
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: 'user',
              verified: false,
              answered: false
            });
            setLoading(false);
          });
        } catch (error) {
          console.error('Error setting up user document listener:', error);
          // Fallback to basic user data
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: 'user',
            verified: false,
            answered: false
          });
          setLoading(false);
        }
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

  // Initialize One Tap when component mounts (if user is not signed in)
  useEffect(() => {
    const initOneTapOnMount = async () => {
      if (!currentUser && !loading && !oneTapInitialized && !initializationAttempted && !initializationInProgress) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          initializeOneTap();
        }, 2000);
      }
    };

    initOneTapOnMount();
  }, [currentUser, loading, oneTapInitialized, initializationAttempted, initializationInProgress]);

  // Register with email and password
  const registerWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await authService.registerWithEmail(email, password);
      return userCredential.user;
    } catch (err: any) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const loginWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    setLoading(true);
    setError(null);
    
    // Cancel any ongoing One Tap prompts
    cancelOneTap();
    
    try {
      const userCredential = await authService.loginWithEmail(email, password);
      return userCredential.user;
    } catch (err: any) {
      return handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Progressive Google sign-in (try One Tap first, fallback to button)
  const loginWithGoogleProgressive = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogleProgressive(handleGoogleCredentialResponse);
      
      if (result === false) {
        // Need to show manual sign-in button
        setLoading(false);
        return false;
      }
      
      return result;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Traditional Google sign-in (fallback method)
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    // Cancel any ongoing One Tap prompts
    cancelOneTap();
    
    try {
      const result = await signInWithGoogle();
      await getUserData(result.user);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    setError(null);
    try {
      // Reset auth state and disable auto-select
      resetUserCache();
      
      await authService.logOut();
    } catch (err: any) {
      handleError(err);
    }
  };

  // Update user email
  const updateUserEmail = async (newEmail: string): Promise<void> => {
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      await authService.updateUserEmail(currentUser as any, newEmail);
    } catch (err: any) {
      handleError(err);
    }
  };

  // Update user password
  const updateUserPassword = async (newPassword: string): Promise<void> => {
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      await authService.updateUserPassword(currentUser as any, newPassword);
    } catch (err: any) {
      handleError(err);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (err: any) {
      handleError(err);
    }
  };

  // Modern reset user cache (resets all auth state)
  const resetUserCache = () => {
    authService.resetUserCache();
  };

  const value: AuthContextType = {
    currentUser,
    user: currentUser,
    loading,
    error,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    signInWithGoogle: loginWithGoogle, // Alias for compatibility
    signInWithGoogleProgressive: loginWithGoogleProgressive,
    signOut,
    updateUserEmail,
    updateUserPassword,
    resetPassword,
    resetUserCache,
    initializeOneTap,
    cancelOneTap
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
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// For backwards compatibility
export const useAuthContext = useAuth; 