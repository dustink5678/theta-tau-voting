import { useState, useEffect } from 'react';
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
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import thetaTauLogo from '../assets/logo.png';

const Login = () => {
  const { signInWithGoogle, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Effect for checking existing user and redirect
  useEffect(() => {
    if (user) {
      console.log("Login page detected user:", user);
      
      // Redirect based on role and verification status
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.verified) {
        navigate('/dashboard');
      } else {
        // User is logged in but not verified
        toast({
          title: 'Account pending verification',
          description: 'Your account requires verification by an administrator.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [user, navigate, toast]);

  // Handle Google sign-in button click
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // This will redirect to Google, so the page will unload
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Error starting Google sign-in:', error);
      
      // Handle the error and show appropriate message
      let errorMsg = 'Authentication failed. Please try again.';
      
      // Provide helpful error messages for common issues
      if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. This may be caused by content blockers or privacy settings. Try disabling ad blockers or using incognito mode.';
      } else if (error.code === 'auth/web-storage-unsupported' || error.code === 'auth/storage-unavailable') {
        errorMsg = 'Your browser has disabled cookies or storage. Please enable them for this site or try a different browser.';
      } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Authentication popup was blocked or closed. Please allow popups for this site.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // Show error in both the UI and a toast
      setErrorMessage(errorMsg);
      toast({
        title: 'Authentication Error',
        description: errorMsg,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
      
      setIsLoading(false);
    }
  };

  // Show loading spinner if authentication is in progress
  if (isLoading) {
    return (
      <Box 
        width="100%" 
        minH="calc(100vh - 56px)" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text>Connecting to Google, please wait...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box 
      width="100%" 
      minH="calc(100vh - 56px)" 
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
        
        <Button
          size="lg"
          colorScheme="blue"
          onClick={handleGoogleSignIn}
          width="100%"
          leftIcon={<FcGoogle size={20} />}
        >
          Sign in with Google
        </Button>
        
        <Text mt={6} fontSize="sm" color="gray.500" textAlign="center">
          This site works best in Chrome, Firefox, Edge, or Safari with cookies and JavaScript enabled.
        </Text>
      </Flex>
    </Box>
  );
};

export default Login;