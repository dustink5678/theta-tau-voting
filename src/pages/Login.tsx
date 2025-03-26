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
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import thetaTauLogo from '../assets/logo.png';

const Login = () => {
  const { signInWithGoogle, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Keep showing loading state - don't set isLoading to false
      // because we want to show loading until redirect completes
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      
      // Show more specific error messages based on the error
      const errorMessage = error.message || 'Please try again later.';
      
      toast({
        title: 'Authentication failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // If it's a Safari-specific error, show additional guidance
      if (errorMessage.toLowerCase().includes('cookies') || 
          errorMessage.toLowerCase().includes('safari') ||
          errorMessage.toLowerCase().includes('storage')) {
        setTimeout(() => {
          toast({
            title: 'Browser Privacy Settings',
            description: 'If using Safari or a private browser, please enable cookies and website data for this site.',
            status: 'info',
            duration: 8000,
            isClosable: true,
          });
        }, 1000);
      }
      
      setIsLoading(false); // Only reset loading state on error
    }
  };

  // If we're loading, show a loading spinner instead of the login form
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
          <Spinner size="xl" color="blue.500" thickness="4px" />
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
        <Heading mb={6}>Theta Tau Voting</Heading>
        <Text mb={8} textAlign="center" color="gray.600">
          Sign in with your Google account to participate in chapter voting
        </Text>
        <Button
          size="lg"
          colorScheme="blue"
          onClick={handleGoogleSignIn}
          isLoading={false}
          width="100%"
        >
          <Box mr={2}><FcGoogle size={20} /></Box>
          Sign in with Google
        </Button>
      </Flex>
    </Box>
  );
};

export default Login; 