import { useState, useEffect /*, useRef, useCallback */ } from 'react'; // Remove GSI-related imports
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
import { FcGoogle } from 'react-icons/fc'; // Re-add icon for the button
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import thetaTauLogo from '../assets/logo.png';

// Remove GSI global declaration
// declare global { ... }

const Login = () => {
  // Use signInWithGoogle from context
  const { signInWithGoogle, loading: authLoading } = useAuth(); 
  // Optional: Local loading state specifically for the button click action 
  // if needed, separate from global authLoading
  const [isSigningIn, setIsSigningIn] = useState(false); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();
  // Remove GSI button ref
  // const googleButtonRef = useRef<HTMLDivElement>(null);

  // Remove GSI callback
  // const handleGoogleSignIn = useCallback(async (response: any) => { ... }, [...]);

  // Remove GSI initialization useEffect
  // useEffect(() => { ... }, [handleGoogleSignIn]);

  // New handler for the Chakra Button
  const handleLoginClick = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      // Success is handled by onAuthStateChanged and App routing
      // No navigation needed here
      toast({
        title: 'Redirecting for sign-in...',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Sign-In Error:", error);
      let message = error.message || 'An error occurred during sign-in.';
      // Handle specific errors shown to the user
      if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'An account already exists with the same email address but different sign-in credentials. Try signing in using the original method.';
      } else if (error.code) { // Use error code if available
        message = `Sign-in failed: ${error.code.replace('auth/','').replace(/-/g,' ')}`;
      } else { 
        message = 'Failed to sign in. Please check your connection and try again.';
      }
      setErrorMessage(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Use the global auth loading state for the main loading screen
  if (authLoading && !isSigningIn) { // Show global loader unless actively clicking sign-in
    return (
      <Box 
        width="100%" 
        minH="calc(100vh)" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text>
              Loading...
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box 
      width="100%" 
      minH="calc(100vh)"
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

        {/* Replace GSI button container with Chakra Button */}
        {/* <Box ref={googleButtonRef} mb={4} display="flex" justifyContent="center" /> */}
        <Button 
          leftIcon={<FcGoogle />} 
          onClick={handleLoginClick} 
          isLoading={isSigningIn} // Use local loading state for button feedback
          loadingText="Signing In"
          colorScheme="blue" 
          variant="outline" 
          width="full" 
          size="lg"
          mb={4}
          disabled={authLoading} // Disable if global auth is already processing
        >
          Sign in with Google
        </Button>

      </Flex>
    </Box>
  );
};

export default Login;