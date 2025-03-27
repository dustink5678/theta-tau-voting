import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, FirestoreError } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/index';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [navigate]);

  // Check for redirect result on initial load (for mobile devices)
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Successful sign-in via redirect");
          // Auth state listener will handle user state
        }
      } catch (error) {
        console.error("Error processing redirect result:", error);
      }
    };

    checkRedirectResult();
  }, []);

  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear previous listener if exists
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }
  
      if (firebaseUser) {
        try {
          // First check if the user document exists
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            // Initialize user data before setting up the listener
            const userData = userSnapshot.data() as User;
            setUser({
              ...userData,
              uid: firebaseUser.uid,
            });
            
            // Now set up real-time listener
            userDocUnsubscribe = onSnapshot(
              userDocRef, 
              (doc) => {
                if (doc.exists()) {
                  const userData = doc.data() as User;
                  
                  // Check if user was previously verified but is now unverified
                  const wasVerifiedButNowUnverified = user?.verified === true && userData.verified === false;
                  
                  // Set user data
                  setUser({
                    ...userData,
                    uid: firebaseUser.uid,
                  });
                  
                  // Update this section in the onSnapshot callback
                  if (userData.verified === false) {
                    console.log("User unverified, redirecting to login");
                    if (wasVerifiedButNowUnverified) {
                      navigate('/login');
                      handleSignOut();
                    } else {
                      // For new unverified users, stay on the page but update UI accordingly
                      // You might want to show a verification pending message instead
                    }
                  }
                }
              }, 
              (error: FirestoreError) => {
                console.error("Error listening to user document:", error);
                
                // If permission error, the user likely doesn't have access or was deleted
                if (error.code === 'permission-denied') {
                  setUser(null);
                  navigate('/login');
                  handleSignOut();
                }
              }
            );
            
            // Only set loading to false after we've initialized the user state
            setLoading(false);
          } else {
            // New user, create a record in Firestore
            const newUser = {
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'user' as const,
              verified: false,
              answered: false,
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            
            // Set initial user state without waiting for listener
            setUser({
              ...newUser,
              uid: firebaseUser.uid,
            });
            
            // Set up listener for the newly created user with error handling
            userDocUnsubscribe = onSnapshot(
              doc(db, 'users', firebaseUser.uid), 
              (doc) => {
                if (doc.exists()) {
                  const userData = doc.data() as User;
                  setUser({
                    ...userData,
                    uid: firebaseUser.uid,
                  });
                } else {
                  setUser(null);
                  navigate('/login');
                  handleSignOut();
                }
              },
              (error: FirestoreError) => {
                console.error("Error listening to user document:", error);
                
                // If permission error, the user was likely deleted
                if (error.code === 'permission-denied') {
                  setUser(null);
                  navigate('/login');
                  handleSignOut();
                }
              }
            );
            
            // Set loading to false after initializing new user
            setLoading(false);
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          setUser(null);
          setLoading(false);
        }
      } else {
        // User signed out
        setUser(null);
        setLoading(false);
      }
    });
  
    // Cleanup function for when component unmounts
    return () => {
      authUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, [navigate, handleSignOut, user?.verified]);

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true); // Set loading to true during sign-in process
    try {
      const provider = new GoogleAuthProvider();
      
      // Add additional configuration to make sign-in more robust
      provider.setCustomParameters({
        // Force account selection even if user has only one account
        // This helps prevent some session issues
        prompt: 'select_account'
      });
      
      // Detect if the user is on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, use redirect flow which works better
        await signInWithRedirect(auth, provider);
        // Control will return to the app after the redirect completes
        // The redirect result will be handled in the useEffect above
        return;
      }
      
      // For desktop, use popup (more reliable)
      try {
        await signInWithPopup(auth, provider);
        // Navigation will happen via the useEffect watching the auth state
      } catch (popupError: any) {
        console.warn("Popup sign-in failed, falling back to redirect:", popupError);
        
        // If popup blocked or not supported, try redirect as fallback
        if (
          popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          await signInWithRedirect(auth, provider);
          return;
        } else {
          // For other errors, throw the original
          throw popupError;
        }
      }
      // Loading will be set to false by the auth state listener
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setLoading(false); // Reset loading state on error
      
      // Provide better error messages to the user
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.message && error.message.includes('cookies and website data')) {
        errorMessage = error.message;
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/web-storage-unsupported') {
        errorMessage = 'Your browser doesn\'t support web storage. Please enable cookies or try a different browser.';
      }
      
      throw new Error(errorMessage);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 