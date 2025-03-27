import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
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
      // First, test browser compatibility
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      console.log(`Browser detection: Safari: ${isSafari}, iOS: ${isIOS}, Mobile: ${isMobile}`);
      
      // Test storage capabilities
      try {
        // Check if cookies are enabled
        document.cookie = "testcookie=1";
        const cookiesEnabled = document.cookie.indexOf("testcookie") !== -1;
        if (!cookiesEnabled) {
          throw new Error("Cookies are disabled");
        }
        
        // Check localStorage
        localStorage.setItem('auth-test-storage', '1');
        localStorage.removeItem('auth-test-storage');
        console.log("Storage access verified");
      } catch (storageError) {
        console.error("Storage error detected:", storageError);
        throw new Error('Please enable cookies and website data in your browser settings. This is required for authentication.');
      }
      
      const provider = new GoogleAuthProvider();
      
      // Add additional configuration for authentication
      provider.setCustomParameters({
        // Force account selection even if user has only one account
        prompt: 'select_account',
        // Additional parameters to help with CORS
        auth_type: 'rerequest',
        include_granted_scopes: 'true'
      });
      
      // For Safari and iOS, use a more reliable approach
      if (isSafari || isIOS) {
        console.log("Using Safari/iOS optimized authentication");
        // Attempt popup first
        try {
          await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          console.error("Safari/iOS popup error:", popupError);
          throw new Error(
            'Authentication failed. Safari may be blocking popups. ' +
            'Please enable popups for this site or try a different browser.'
          );
        }
      } else {
        // Standard approach for other browsers
        try {
          await signInWithPopup(auth, provider);
        } catch (popupError: any) {
          console.error("Popup error:", popupError);
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user') {
            throw new Error('Authentication popup was blocked. Please enable popups for this site.');
          } else {
            throw popupError;
          }
        }
      }
      
      // Navigation will happen via the useEffect watching the auth state
      // Loading will be set to false by the auth state listener
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setLoading(false); // Reset loading state on error
      
      // Provide better error messages to the user
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Authentication popup was blocked. Please enable popups for this site.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Authentication was canceled. Please try again.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/web-storage-unsupported') {
        errorMessage = 'Your browser does not support web storage. Please enable cookies.';
      } else if (error.code === 'auth/cors-unsupported') {
        errorMessage = 'Your browser is blocking cross-origin requests. Please try a different browser.';
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