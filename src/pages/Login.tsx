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
  const { signInWithGoogle, user } = useAuth() as any;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Effect for checking existing user and redirect
  useEffect(() => {
    if (user) {
      // @ts-ignore
      if (user.role === 'admin') {
        navigate('/admin');
      // @ts-ignore
      } else if (user.verified) {
        navigate('/dashboard');
      } else {
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
      await signInWithGoogle();
    } catch (error: any) {
      handleAuthError(error, 'Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced error handling for browser restrictions
  const handleAuthError = (error: any, provider: string) => {
    console.error(`Error starting ${provider} sign-in:`, error);
    let errorMsg = `${provider} authentication failed. Please try again.`;
    
    // Enhanced error handling for different browser scenarios
    switch (error.code) {
      case 'auth/network-request-failed':
        errorMsg = 'Network error. This may be caused by content blockers, privacy settings, or network restrictions. Try disabling ad blockers, using incognito mode, or checking your network connection.';
        break;
      case 'auth/web-storage-unsupported':
      case 'auth/storage-unavailable':
        errorMsg = 'Your browser has disabled cookies or storage. Please enable them for this site or try a different browser.';
        break;
      case 'auth/popup-blocked':
      case 'auth/popup-closed-by-user':
        errorMsg = 'Authentication popup was blocked or closed. Please allow popups for this site or try using a different browser.';
        break;
      case 'auth/unauthorized-domain':
      case 'auth/domain-not-whitelisted':
        errorMsg = 'This domain is not authorized for authentication. Please contact the administrator.';
        break;
      case 'auth/operation-not-allowed':
        errorMsg = 'Google sign-in is not enabled for this application. Please contact the administrator.';
        break;
      case 'auth/cookie-not-set':
        errorMsg = 'Browser cookies are required for authentication. Please enable cookies and try again.';
        break;
      case 'auth/too-many-requests':
        errorMsg = 'Too many authentication attempts. Please wait a moment and try again.';
        break;
      case 'auth/user-disabled':
        errorMsg = 'This account has been disabled. Please contact the administrator.';
        break;
      case 'auth/invalid-credential':
        errorMsg = 'Invalid credentials. Please try signing in again.';
        break;
      default:
        if (error.message) {
          errorMsg = error.message;
        }
        break;
    }
    
    setErrorMessage(errorMsg);
    toast({
      title: `${provider} Authentication Error`,
      description: errorMsg,
      status: 'error',
      duration: 7000,
      isClosable: true,
    });
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
            <Text>
              {'Processing, please wait...'}
            </Text>
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
          isLoading={isLoading}
        >
          Sign in with Google
        </Button>
      </Flex>
    </Box>
  );
};

export default Login;