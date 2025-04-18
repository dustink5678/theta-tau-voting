import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, User, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase'; // Assuming auth is exported from your firebase config

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
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
        console.log("User logged in:", user.uid);
        // Optionally fetch additional user profile data here
      } else {
        console.log("User logged out");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error("Error signing out:", error);
      // Handle sign-out errors appropriately
    } finally {
      // setLoading(false); // Loading state is handled by onAuthStateChanged
    }
  };

  const signInWithGoogleToken = async (idToken: string) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      // User state will be updated by onAuthStateChanged upon successful sign-in
      console.log("Successfully signed in with Google credential");
    } catch (error) {
      console.error("Error signing in with Google credential:", error);
      // Rethrow the error so the calling component (Login) can handle it
      throw error; 
    } finally {
       // setLoading(false); // Let onAuthStateChanged handle final loading state
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogleToken,
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