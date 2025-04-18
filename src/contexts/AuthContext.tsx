import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';
import { auth } from '../config/firebase'; // Assuming auth is exported from your firebase config

// Configure Google Provider outside the component for reuse
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account' // Forces account selection even if already logged in
});

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // Add other auth methods or user properties if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        console.log("Auth State Changed - User logged in:", user.uid);
      } else {
        console.log("Auth State Changed - User logged out");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      // currentUser will become null via onAuthStateChanged
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false); // Ensure loading resets on error
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("Sign in with popup successful");
    } catch (error: any) {
      console.error("Popup Sign-in Error:", error);
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') {
        console.log("Popup failed, attempting redirect...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("Redirect Sign-in Error:", redirectError);
          setLoading(false);
          throw redirectError;
        }
      } else {
        setLoading(false);
        throw error;
      }
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signOut,
  };

  // Render children only after initial loading is complete
  // or provide a global loading indicator if preferred
  return (
    <AuthContext.Provider value={value}>
      {/* {!loading ? children : <LoadingScreen />} Example with global loading */}
      {children} 
    </AuthContext.Provider>
  );
}; 