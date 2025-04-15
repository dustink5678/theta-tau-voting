import { useState, useEffect } from 'react';
import { 
  signInWithRedirect, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  OAuthProvider
} from 'firebase/auth';
import { auth } from '../config/firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to the Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setError(error.message);
      setLoading(false);
    });

    // Clean up the listener
    return () => unsubscribe();
  }, []);

  // Create a new user with email and password
  const registerWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google - use redirect for best cross-browser compatibility
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Set custom parameters for better user experience
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
      // The result will be handled by the auth state observer
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message);
      throw error;
    }
    // Note: We don't set loading to false here because the page will redirect
  };

  // Sign in with Apple - use redirect for best cross-browser compatibility
  const loginWithApple = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new OAuthProvider('apple.com');
      // Set custom parameters for better user experience
      provider.addScope('email');
      provider.addScope('name');
      await signInWithRedirect(auth, provider);
      // The result will be handled by the auth state observer
    } catch (error) {
      console.error('Apple login error:', error);
      setError(error.message);
      throw error;
    }
    // Note: We don't set loading to false here because the page will redirect
  };

  // Reset password
  const resetPassword = async (email) => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    loginWithApple,
    resetPassword,
    logout
  };
} 