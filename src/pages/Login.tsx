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
  Link
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import thetaTauLogo from '../assets/logo.png';

const Login = () => {
  const { signInWithGoogle, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL for error indicators or recovery mode
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    const recoveryParam = urlParams.get('recovery');
    
    if (authError) {
      setErrorMessage(`Authentication error: ${authError}. Please try again or use the recovery link below.`);
      setRecoveryMode(true);
    }
    
    if (recoveryParam === 'true') {
      setRecoveryMode(true);
      toast({
        title: 'Recovery Mode',
        description: 'Using alternative authentication method for better compatibility',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      console.log("Login page detected user:", user);
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.verified) {
        navigate('/dashboard');
      } else {
        // If user is logged in but not verified, show them a message
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await signInWithGoogle();
      // Keep loading state active while redirect happens
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      
      // Set the error message to show in the UI
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
      
      // Also show appropriate toast based on the error
      const errorMsg = error.message || 'Please try again later.';
      
      toast({
        title: 'Authentication failed',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // For specific browser issues, show additional guidance
      if (error.message?.toLowerCase().includes('cookies') || 
          error.message?.toLowerCase().includes('safari') ||
          error.message?.toLowerCase().includes('storage') ||
          error.message?.toLowerCase().includes('popup')) {
        setTimeout(() => {
          toast({
            title: 'Browser Privacy Settings',
            description: 'If using Safari or a private browser, please enable cookies and website data for this site. Make sure popup blockers are disabled.',
            status: 'info',
            duration: 8000,
            isClosable: true,
          });
          setRecoveryMode(true);
        }, 1000);
      }
      
      setIsLoading(false);
    }
  };

  const handleClearStorageAndRetry = () => {
    // Clear all browser storage and reload
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Use recovery param to trigger alternative auth flow
      window.location.href = `${window.location.origin}/login?recovery=true`;
    } catch (e) {
      console.error('Error clearing storage:', e);
      toast({
        title: 'Error',
        description: 'Could not clear browser storage. Please try a different browser.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  // If we're loading, show a loading spinner
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
            <Text>Authenticating, please wait...</Text>
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
        
        {recoveryMode && (
          <VStack mt={6} spacing={3}>
            <Text color="red.600" fontWeight="bold">
              Having trouble signing in?
            </Text>
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={handleClearStorageAndRetry}
            >
              Clear Browser Data & Retry
            </Button>
          </VStack>
        )}
        
        <Text mt={6} fontSize="sm" color="gray.500" textAlign="center">
          If you have trouble signing in, please make sure popup blockers and cookie restrictions are disabled.
        </Text>
      </Flex>
    </Box>
  );
}

export default Login;