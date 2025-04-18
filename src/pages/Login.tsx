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

    // Interval to check for GSI script loading
    const intervalId = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(intervalId); // Stop polling once loaded
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
          });

          if (googleButtonRef.current) {
            window.google.accounts.id.renderButton(
              googleButtonRef.current, // Render the button in this div
              { theme: 'outline', size: 'large', width: '300px' } // Customize button appearance
            );
          } else {
            console.warn("Google button ref not available when GSI loaded.");
          }
          // Display the One Tap prompt if needed (optional)
          // window.google.accounts.id.prompt(); 
        } catch (error) {
          console.error("Error initializing Google Sign-In:", error);
          setErrorMessage("Failed to initialize Google Sign-In.");
        }
      } else {
        console.log("Waiting for Google Identity Services script...");
      }
    }, 500); // Check every 500ms

    // Cleanup function: clear the interval if the component unmounts
    return () => {
      clearInterval(intervalId);
      // Optional: If using One Tap, might need to cancel it
      // window.google?.accounts?.id?.cancel();
    };
    // Dependencies: Ensure effect runs only once, but handleGoogleSignIn should be stable or wrapped in useCallback if needed
  }, [handleGoogleSignIn]); // Add handleGoogleSignIn to dependency array (wrap in useCallback if performance becomes an issue)

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
        <Box ref={googleButtonRef} mb={4} display="flex" justifyContent="center" />

        {/* Add any other necessary content for the login page */}
      </Flex>
    </Box>
  );
};

export default Login;