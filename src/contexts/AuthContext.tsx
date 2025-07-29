import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/auth';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithGoogle, resetUserCache } from '../services/auth';
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
  signOut: () => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resetUserCache: () => void;
  signInWithGoogle: () => Promise<any>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider component that provides authentication state and methods to all children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle errors consistently
  const handleError = (err: any): never => {
    console.error('Auth error:', err);
    setError(err.message || err.toString());
    throw err;
  };

  // Get user data from Firestore
  const getUserData = async (user: FirebaseUser): Promise<User | null> => {
    if (!user) return null;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Return a combination of Firebase auth user and Firestore data
        const userData = userDoc.data();
        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || userData.name || 'User',
          role: userData.role || 'user',
          verified: userData.verified || false,
          answered: userData.answered || false,
          createdAt: userData.createdAt,
          name: userData.name
        };
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
        
        await setDoc(userRef, newUser);
        return newUser;
      }
    } catch (err: any) {
      console.error("Error getting user data:", err);
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role: 'user',
        verified: false,
        answered: false
      };
    }
  };

  // Replace the useEffect for auth state changes with a real-time Firestore listener
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    const unsubscribeAuth = authService.subscribeToAuthChanges(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Listen to changes on the user's Firestore document
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
    try {
      const userCredential = await authService.loginWithEmail(email, password);
      return userCredential.user;
    } catch (err: any) {
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

  const value: AuthContextType = {
    currentUser,
    user: currentUser,
    loading,
    error,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
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
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// For backwards compatibility
export const useAuthContext = useAuth; 