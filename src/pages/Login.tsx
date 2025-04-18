import { useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext.jsx';
import thetaTauLogo from '../assets/logo.png';

const Login = () => {
  const { signInWithGoogle, loading: authLoading, error: authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    console.log("[Login Page] handleGoogleSignIn called. Attempting to call signInWithGoogle from context...");
    try {
      await signInWithGoogle();
      console.log("[Login Page] signInWithGoogle call completed (redirect should have started).");
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      setErrorMessage(error.message || 'Failed to initiate Google Sign-in. Please try again.');
      toast({
        title: 'Sign-in Error',
        description: error.message || 'An unexpected error occurred during sign-in.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading && !isLoading) {
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
        
        {(errorMessage || authError) && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription display="block">
                {errorMessage || authError?.message || 'An unknown error occurred'}
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
        
        <VStack spacing={4} width="100%">
          <Button
            size="lg"
            colorScheme="blue"
            onClick={handleGoogleSignIn}
            width="100%"
            leftIcon={<FcGoogle size={20} />}
            isLoading={isLoading}
            disabled={authLoading}
          >
            Sign in with Google
          </Button>
        </VStack>
        
        <Text mt={6} fontSize="sm" color="gray.500" textAlign="center">
          This site works best in Chrome, Firefox, Edge, or Safari with cookies and JavaScript enabled.<br />
          {/*
            COOP warning: You may see a 'Cross-Origin-Opener-Policy policy would block the window.close call.' warning in the console after sign-in. This is expected with modern browser security and Firebase popups, and does not affect functionality.
          */}
        </Text>
      </Flex>
    </Box>
  );
};

export default Login;