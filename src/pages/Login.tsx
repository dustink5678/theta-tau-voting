import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Container,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Spinner,
  Center
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle, signInWithGoogleProgressive, renderGoogleSignInButton, cancelOneTap, checkGoogleAvailability } from '../services/auth';
import thetaTauLogo from '../assets/logo.png';

interface GoogleCredentialResponse {
  credential: string;
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualButton, setShowManualButton] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { user, loginWithEmail, signInWithGoogle: authSignInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize authentication with progressive enhancement
  useEffect(() => {
    const initializeAuth = async () => {
      if (user || authInitialized) return;

      setAuthInitialized(true);
      
      // Wait longer for page to fully load and Google services to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (user) return; // Check again after delay
      
      try {
        console.log('Starting progressive authentication...');
        
        // Try progressive authentication (FedCM -> One Tap -> Manual button)
        const result = await signInWithGoogleProgressive(async (response: GoogleCredentialResponse) => {
          try {
            setIsLoading(true);
            setErrorMessage(null);
            
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
            
            // Use the auth context's signInWithGoogle for proper user data handling
            await authSignInWithGoogle();
            
            console.log('Google One Tap/FedCM sign-in successful');
            setIsLoading(false);
            
          } catch (error: any) {
            console.error('Error handling Google credential response:', error);
            setErrorMessage(error.message);
            setIsLoading(false);
            throw error;
          }
        });
        
        if (result === false) {
          // Progressive auth indicates manual button is needed
          console.log('Progressive auth completed, showing manual button');
          setShowManualButton(true);
          
          // Small delay to ensure DOM is ready, then render Google button
          setTimeout(async () => {
            await renderModernGoogleButton();
          }, 500);
        }
      } catch (error: any) {
        console.log('Progressive auth failed:', error);
        setShowManualButton(true);
        setTimeout(async () => {
          await renderModernGoogleButton();
        }, 500);
      }
    };

    initializeAuth();
  }, [user, authInitialized, signInWithGoogleProgressive, authSignInWithGoogle]);

  // Render modern Google Sign-In button with proper waiting
  const renderModernGoogleButton = async () => {
    if (!googleButtonRef.current) {
      console.log('Google button ref not available');
      return;
    }

    try {
      // Clear any existing content
      googleButtonRef.current.innerHTML = '';
      
      // Wait for Google Identity Services to be available
      let attempts = 0;
      while (!checkGoogleAvailability() && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!checkGoogleAvailability()) {
        console.log('Google Identity Services not available after waiting');
        return;
      }
      
      // Try to render modern Google button with proper configuration
      const success = await renderGoogleSignInButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 400, // Use pixel width instead of percentage
        click_listener: handleGoogleButtonClick
      });

      if (!success) {
        console.log('Modern Google button not available, using fallback');
      } else {
        console.log('Modern Google button rendered successfully');
      }
    } catch (error) {
      console.log('Error rendering modern Google button:', error);
    }
  };

  // Handle modern Google button click
  const handleGoogleButtonClick = () => {
    console.log('Modern Google Sign-In button clicked');
    handleGoogleSignIn();
  };

  // Handle Google sign-in button click (fallback method)
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    // Cancel any ongoing One Tap prompts
    cancelOneTap();
    
    try {
      await signInWithGoogle();
      
      toast({
        title: 'Sign-in successful!',
        description: 'Welcome to Theta Tau Voting System.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      handleAuthError(error, 'Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle authentication errors
  const handleAuthError = (error: any, provider: string) => {
    console.error(`${provider} sign-in error:`, error);
    
    let errorMessage = 'An error occurred during sign-in.';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters.';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked. Please allow popups for this site and try again.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in was cancelled.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.code === 'auth/web-storage-unsupported') {
      errorMessage = 'Your browser has disabled storage. Please enable cookies and try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setErrorMessage(errorMessage);
    
    toast({
      title: 'Sign-in failed',
      description: errorMessage,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  // Handle email/password form submission
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await loginWithEmail(email, password);
      
      toast({
        title: 'Sign-in successful!',
        description: 'Welcome to Theta Tau Voting System.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      handleAuthError(error, 'Email');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry authentication with different method
  const retryAuthentication = async () => {
    setErrorMessage(null);
    setShowManualButton(true);
    
    // Small delay to ensure DOM is ready
    setTimeout(async () => {
      await renderModernGoogleButton();
    }, 200);
  };

  // Redirect if user is already signed in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container 
        maxW="md"
        width="100%"
        bg="white"
        p={8}
        borderRadius="md"
        boxShadow="lg"
      >
        <VStack spacing={6}>
          <Box 
            width="100%" 
            height="100px"
            display="flex" 
            alignItems="center" 
            justifyContent="center"
          >
            <img 
              src={thetaTauLogo}
              alt="Theta Tau Logo" 
              height="100%"
              style={{ objectFit: 'contain' }}
            />
          </Box>
          <Heading mb={6} textAlign="center">Theta Tau Voting System</Heading>
          <Text mb={8} textAlign="center" color="gray.600">
            Sign in to access the voting system
          </Text>

          {isLoading ? (
            <Center>
              <Spinner size="lg" />
            </Center>
          ) : (
            <VStack spacing={4} width="100%">
              {/* Error Alert */}
              {errorMessage && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Sign-in Error!</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Box>
                  <CloseButton
                    alignSelf="flex-start"
                    position="relative"
                    right={-1}
                    top={-1}
                    onClick={() => setErrorMessage(null)}
                  />
                </Alert>
              )}

              {/* Google Sign-In Button */}
              {showManualButton && (
                <Box width="100%">
                  <Text mb={3} textAlign="center" fontSize="sm" color="gray.600">
                    Sign in with Google
                  </Text>
                  <div ref={googleButtonRef}></div>
                  <Button
                    leftIcon={<FcGoogle />}
                    colorScheme="blue"
                    variant="outline"
                    width="100%"
                    onClick={handleGoogleSignIn}
                    mt={3}
                  >
                    Sign in with Google (Fallback)
                  </Button>
                </Box>
              )}

              {/* Divider */}
              {showManualButton && (
                <Box width="100%" textAlign="center" position="relative">
                  <Box
                    position="absolute"
                    top="50%"
                    left="0"
                    right="0"
                    height="1px"
                    bg="gray.200"
                  />
                  <Text
                    bg="white"
                    px={4}
                    color="gray.500"
                    fontSize="sm"
                    position="relative"
                    zIndex={1}
                  >
                    or
                  </Text>
                </Box>
              )}

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignIn} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    width="100%"
                    isLoading={isLoading}
                  >
                    Sign In
                  </Button>
                </VStack>
              </form>

              {/* Retry Button */}
              {errorMessage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryAuthentication}
                  colorScheme="blue"
                >
                  Try Different Sign-in Method
                </Button>
              )}
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default Login;