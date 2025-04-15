import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  Auth
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
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
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

  // Initialize auth - handle redirect results when app loads
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        // Check if we have a redirect result
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Signed in via redirect');
          
          // When we get a redirect result, we need to manually process the user data
          // since the onAuthStateChanged listener might miss the transition
          const firebaseUser = result.user;
          if (firebaseUser) {
            try {
              // Check if user exists in Firestore
              const userRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                // Update user data with latest info from Google
                const userData = userDoc.data() as User;
                await updateDoc(userRef, {
                  displayName: firebaseUser.displayName || userData.displayName,
                  photoURL: firebaseUser.photoURL || userData.photoURL,
                });
              } else {
                // Create new user
                const newUser = {
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || '',
                  photoURL: firebaseUser.photoURL || '',
                  role: 'user' as const,
                  verified: false,
                  answered: false,
                };
                
                await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              }
            } catch (error) {
              console.error('Error processing redirect user data:', error);
            }
          }
        }
      } catch (error) {
        console.error('Redirect sign-in error:', error);
      } finally {
        // Mark initial auth check as done regardless of result
        setInitialAuthCheckDone(true);
      }
    };
    
    checkRedirectResult();
  }, []);

  // Set up auth state listener
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
              displayName: firebaseUser.displayName || userData.displayName || '',
              photoURL: firebaseUser.photoURL || userData.photoURL || '',
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
                    displayName: firebaseUser.displayName || userData.displayName || '',
                    photoURL: firebaseUser.photoURL || userData.photoURL || '',
                  });
                  
                  // If user becomes unverified, sign them out
                  if (userData.verified === false && wasVerifiedButNowUnverified) {
                    console.log("User unverified, redirecting to login");
                    navigate('/login');
                    handleSignOut();
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
            
            // Set initial user state
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
                    displayName: firebaseUser.displayName || userData.displayName || '',
                    photoURL: firebaseUser.photoURL || userData.photoURL || '',
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
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          setUser(null);
        }
      } else {
        // User signed out
        setUser(null);
      }
      
      // Set loading to false when auth state is determined
      setLoading(false);
    }, (error) => {
      console.error('Auth state changed error:', error);
      setLoading(false);
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
    setLoading(true);
    try {
      // Check device and browser info for logging purposes only
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      console.log(`Device detection: Mobile: ${isMobile}, Safari: ${isSafari}, iOS: ${isIOS}`);
      
      const provider = new GoogleAuthProvider();
      
      // Set up custom parameters
      provider.setCustomParameters({
        // Always prompt user to select account
        prompt: 'select_account',
        // Request offline access for better token handling
        access_type: 'offline'
      });
      
      // ALWAYS use redirect auth to avoid COOP issues
      // This is what you wanted - to have the app continue in the new page after auth
      console.log("Using redirect auth for all devices");
      await signInWithRedirect(auth, provider);
      
      // The redirect will navigate away, so this code won't execute
      // until the user comes back to the site, and that will be handled 
      // by the getRedirectResult call in the useEffect
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      
      // Provide detailed error messages
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/web-storage-unsupported') {
        errorMessage = 'Your browser does not support web storage. Please enable cookies or try a different browser.';
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        errorMessage = 'Authentication is not supported in this browser environment. Please try a different browser.';
      }
      
      throw new Error(errorMessage);
    }
  };

  // Show loading screen only when we're still checking auth status
  if (loading && !initialAuthCheckDone) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};