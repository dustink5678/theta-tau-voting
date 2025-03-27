import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, FirestoreError, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types/index';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { Box, VStack, Heading, Text, Button, Flex, Image, useToast } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
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
  const [state, setState] = useState<{
    user: User | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    loading: true,
    error: null
  });
  
  const navigate = useNavigate();
  const toast = useToast();

  // Handle user document creation/update
  const createUserDocument = async (firebaseUser: any) => {
    if (!firebaseUser) return false;
    
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnapshot = await getDoc(userRef);
      
      const userData = {
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        role: 'user' as const,
        verified: userSnapshot.exists() ? userSnapshot.data().verified : false,
        answered: userSnapshot.exists() ? userSnapshot.data().answered : false,
        lastLogin: serverTimestamp(),
      };
      
      await setDoc(userRef, userData, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let userDocUnsubscribe: (() => void) | null = null;

    // First, check for redirect result
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted) return;
        
        if (result?.user) {
          try {
            await createUserDocument(result.user);
            // Auth state listener will handle the rest
          } catch (error) {
            console.error('Error handling redirect result:', error);
            setState(prev => ({
              ...prev,
              error: 'Failed to complete sign-in process. Please try again.',
              loading: false
            }));
          }
        }
      })
      .catch(error => {
        console.error('Redirect result error:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: 'Unable to sign in. Please try again.',
            loading: false
          }));
        }
      });

    // Set up auth state listener
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      // Clear previous listener if exists
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (firebaseUser) {
        try {
          // First check if the user document exists
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await createUserDocument(firebaseUser);
          
          // Now set up real-time listener for user data
          userDocUnsubscribe = onSnapshot(
            userDocRef, 
            (doc) => {
              if (doc.exists()) {
                const userData = doc.data() as User;
                
                setState({
                  user: {
                    ...userData,
                    uid: firebaseUser.uid,
                  },
                  loading: false,
                  error: null
                });
                
                // Redirect to home if user is verified
                if (userData.verified) {
                  navigate('/');
                }
              }
            }, 
            (error: FirestoreError) => {
              console.error("Error listening to user document:", error);
              
              // If permission error, the user likely doesn't have access or was deleted
              if (error.code === 'permission-denied') {
                setState({
                  user: null,
                  loading: false,
                  error: 'Access denied. Please try again.'
                });
                firebaseSignOut(auth);
              }
            }
          );
        } catch (error) {
          console.error('Error getting user data:', error);
          setState({
            user: null,
            loading: false,
            error: 'Failed to load user data. Please try again.'
          });
        }
      } else {
        // User signed out
        setState({
          user: null,
          loading: false,
          error: null
        });
      }
    });
  
    // Cleanup function for when component unmounts
    return () => {
      isMounted = false;
      authUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, [navigate]);

  const handleSignIn = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Detect if the user is on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, use redirect flow
        await signInWithRedirect(auth, provider);
        return; // The page will reload after redirect
      }
      
      // For desktop, use popup first
      try {
        const result = await signInWithPopup(auth, provider);
        // Auth state listener will handle setting the user
      } catch (popupError: any) {
        console.warn("Popup sign-in failed:", popupError);
        
        // If popup blocked, try redirect as fallback
        if (
          popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setState(prev => ({
        ...prev,
        error: 'Unable to sign in. Please try again.',
        loading: false
      }));
      toast({
        title: "Authentication Error",
        description: "Failed to sign in. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Auth state listener will handle resetting the user state
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign Out Error",
        description: "Failed to sign out. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (state.loading) {
    return <LoadingScreen />;
  }

  // If user is not authenticated, show login screen
  if (!state.user) {
    return (
      <Box 
        minH="100vh" 
        display="flex" 
        flexDirection="column" 
        bg="linear-gradient(to bottom right, #1a365d, #2a4365, #1a365d)"
        color="white"
      >
        <Flex flex="1" alignItems="center" justifyContent="center" p={6}>
          <VStack w="full" maxW="md" spacing={12} textAlign="center">
            {/* Logo and Title */}
            <VStack>
              <Box bg="whiteAlpha.200" backdropFilter="blur(10px)" borderRadius="xl" p={6} mb={8} display="inline-block">
                <Image src="/logo.png" alt="Theta Tau Logo" h="80px" fallbackSrc="https://thetatauvoting-8a0d0.web.app/logo.png" />
              </Box>
              <Heading size="xl" mb={4}>Theta Tau Voting</Heading>
              <Text fontSize="lg" color="blue.200">Voting made simple for our organization</Text>
            </VStack>

            {/* Sign In Button */}
            <VStack mt={8} spacing={4} w="full">
              {state.error && (
                <Box mb={4} p={4} bg="rgba(153, 27, 27, 0.5)" border="1px" borderColor="red.700" borderRadius="lg">
                  <Text fontSize="sm" color="red.200" textAlign="center">{state.error}</Text>
                </Box>
              )}
              
              <Button
                onClick={handleSignIn}
                isDisabled={state.loading}
                w="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={3}
                bg="whiteAlpha.200"
                _hover={{ bg: "whiteAlpha.300" }}
                color="white"
                borderRadius="xl"
                px={6}
                py={6}
                fontSize="lg"
                fontWeight="medium"
                backdropFilter="blur(8px)"
                transition="all 0.2s"
                border="1px"
                borderColor="whiteAlpha.300"
                leftIcon={<FcGoogle size="24px" />}
              >
                Continue with Google
              </Button>
            </VStack>
          </VStack>
        </Flex>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user: state.user, 
      loading: state.loading, 
      error: state.error,
      signOut: handleSignOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 