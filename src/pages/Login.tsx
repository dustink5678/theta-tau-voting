import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  useToast,
  Flex,
  Image,
  Center,
  Spinner,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
// import { FcGoogle } from 'react-icons/fc'; // No longer needed for the button
import { useAuth } from '../contexts/AuthContext'; // Import the new context hook
import { useNavigate } from 'react-router-dom';
import thetaTauLogo from '../assets/logo.png';

// Declare the google object from the GSI script
declare global {
  interface Window {
    google: any;
  }
}

const Login = () => {
  const { signInWithGoogleToken } = useAuth(); // Get the sign-in function
  const [isLoading, setIsLoading] = useState(false); // Still useful for the initial GIS button rendering/click
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false); // State to track GSI script loading
  const toast = useToast();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null); // Ref for the Google button container

  // Google Sign-In Callback
  const handleGoogleSignIn = async (response: any) => {
    setIsLoading(true);
    setErrorMessage(null);
    console.log('Google Sign-In response:', response);
    if (response.credential) {
      try {
        await signInWithGoogleToken(response.credential); // Pass the ID token to AuthContext
        // Navigation should be handled by AuthContext's onAuthStateChanged listener
        // and the routing logic in App.tsx
        toast({
          title: 'Sign-in successful',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        console.error("Firebase Sign-In Error:", error);
        // Handle specific Firebase errors if needed
        let message = error.message || 'An error occurred during Firebase sign-in.';
        if (error.code === 'auth/user-disabled') {
          message = 'Your account has been disabled.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            message = 'Sign-in cancelled.'; // Example
        }
        // Consider specific handling for 'auth/account-exists-with-different-credential' if merging accounts isn't desired
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error("Google Sign-In failed:", response);
      setErrorMessage('Google Sign-In failed. No credential received.');
      setIsLoading(false);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
        console.error("Google Client ID not found. Make sure VITE_GOOGLE_CLIENT_ID is set in your environment variables.");
        setErrorMessage("Sign-in configuration error. Please contact support.");
        return;
    }

    // Check if the script is loaded
    if (typeof window.google !== 'undefined' && window.google?.accounts?.id) {
        console.log("GSI script loaded, initializing...");
        try {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleSignIn,
            });
            setIsGsiLoaded(true); // Mark as loaded *before* rendering button
        } catch (error) {
            console.error("Error initializing Google Sign-In:", error);
            setErrorMessage("Failed to initialize Google Sign-In.");
        }
    } else {
      console.error("Google Identity Services script not loaded when component mounted.");
      // You could implement a retry mechanism here if needed, e.g., using setTimeout
      // For now, we'll just show an error if it wasn't loaded initially.
      setErrorMessage("Sign-in service failed to load. Please refresh.");
    }
  }, []); // Run only once on mount

  // Effect to render the button *after* GSI is loaded and the ref is available
  useEffect(() => {
    if (isGsiLoaded && googleButtonRef.current) {
      try {
        window.google.accounts.id.renderButton(
          googleButtonRef.current, 
          { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', width: '300px' } // Customization
        );
        // Consider calling prompt() here if you want One Tap prompt *after* button renders
        // window.google.accounts.id.prompt();
      } catch (error) {
        console.error("Error rendering Google Sign-In button:", error);
        setErrorMessage("Failed to render Google Sign-In button.");
      }
    }
  }, [isGsiLoaded]); // Run when GSI load state changes

  // Show loading spinner if authentication is in progress
  if (isLoading) {
    return (
      <Box 
        width="100%" 
        minH="calc(100vh - 56px)" // Assuming 56px is navbar height
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text>
              {'Signing in...'}
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box 
      width="100%" 
      minH="calc(100vh)" // Use full viewport height for login page
      bg="gray.50" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
    >
      <Flex 
        direction="column" 
        align="center" 
        maxW="md"
        width="100%"
        p={8}
        bg="white"
        boxShadow="md"
        borderRadius="md"
      >
        <Image 
          src={thetaTauLogo}
          alt="Theta Tau Logo" 
          height="100px"
          objectFit="contain"
          mb={6}
        />
        <Heading mb={6} textAlign="center">Theta Tau Voting System</Heading>
        <Text mb={8} textAlign="center" color="gray.600">
          Sign in with your Google account to participate in chapter voting
        </Text>
        
        {errorMessage && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription display="block">
                {errorMessage}
              </AlertDescription>
            </Box>
            <CloseButton 
              position="absolute" 
              right="8px" 
              top="8px" 
              onClick={() => setErrorMessage(null)}
            />
          </Alert>
        )}

        {/* Container for the Google Sign-In Button */} 
        {/* Render the container only when GSI is loaded, button renders inside */} 
        <Box 
            ref={googleButtonRef} 
            mb={4} 
            display="flex" 
            justifyContent="center" 
            minH="40px" // Add min height to prevent layout shift before button renders
        />
        {!isGsiLoaded && !errorMessage && (
            <Text color="gray.500" fontSize="sm">Loading Sign-in options...</Text>
        )}
        
      </Flex>
    </Box>
  );
};

export default Login;