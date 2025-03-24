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
            // User exists in Firestore, set up real-time listener with high responsiveness
            userDocUnsubscribe = onSnapshot(
              userDocRef, 
              { includeMetadataChanges: true }, // This makes the listener more responsive
              (doc) => {
                if (doc.exists()) {
                  const userData = doc.data() as User;
                  
                  // If user is unverified, immediately redirect to login
                  if (userData.verified === false) {
                    console.log("User unverified, redirecting to login");
                    setUser({
                      ...userData,
                      uid: firebaseUser.uid,
                    });
                    navigate('/login');
                    return;
                  }
                  
                  // Set user data for verified users
                  setUser({
                    ...userData,
                    uid: firebaseUser.uid,
                  });
                } else {
                  // Document deleted or doesn't exist anymore
                  console.log("User document doesn't exist anymore");
                  setUser(null);
                  navigate('/login');
                  handleSignOut();
                }
              }, 
              (error: FirestoreError) => {
                console.error("Error listening to user document:", error);
                
                // If permission error, the user likely doesn't have access or was deleted
                if (error.code === 'permission-denied') {
                  console.log("Permission denied for user document, signing out");
                  setUser(null);
                  navigate('/login');
                  handleSignOut();
                }
              }
            );
          } else {
            // New user, create a record in Firestore
            console.log("Creating new user in Firestore");
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
              { includeMetadataChanges: true },
              (doc) => {
                if (doc.exists()) {
                  const userData = doc.data() as User;
                  
                  // If user is unverified, stay on login page
                  if (userData.verified === false) {
                    setUser({
                      ...userData,
                      uid: firebaseUser.uid,
                    });
                    return;
                  }
                  
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
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          setUser(null);
        }
      } else {
        // User signed out
        setUser(null);
      }
      
      setLoading(false);
    });

    // Cleanup function for when component unmounts
    return () => {
      authUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, [navigate, handleSignOut]);

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Navigation will happen via the useEffect watching the auth state
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
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