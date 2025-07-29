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
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import thetaTauLogo from '../assets/logo.png';

const Login = () => {
  const { 
    signInWithGoogle, 
    registerWithEmail, 
    loginWithEmail, 
    resetUserCache, 
    signOut, 
    user 
  } = useAuth() as any;
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Registration form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
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

  // Handle email registration
  const handleEmailRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Validation
    if (!regFirstName || !regLastName || !regEmail || !regPassword || !regConfirmPassword) {
      setErrorMessage('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await registerWithEmail(
        regEmail, 
        regPassword, 
        {
          firstName: regFirstName,
          lastName: regLastName
        }
      );
      
      toast({
        title: 'Account created successfully',
        description: 'Your account has been created and is pending verification.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      handleAuthError(error, 'Registration');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (error: any) {
      handleAuthError(error, 'Login');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Reset Session button click
  const handleResetSession = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      resetUserCache();
      await signOut();
      toast({
        title: 'Session Reset',
        description: 'Your session and cache have been cleared. Please try signing in again.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setErrorMessage('Failed to reset session. Please reload the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for error handling
  const handleAuthError = (error: any, provider: string) => {
    console.error(`Error starting ${provider} sign-in:`, error);
    let errorMsg = `${provider} authentication failed. Please try again.`;
    
    if (error.code === 'auth/network-request-failed') {
      errorMsg = 'Network error. This may be caused by content blockers or privacy settings. Try disabling ad blockers or using incognito mode.';
    } else if (error.code === 'auth/web-storage-unsupported' || error.code === 'auth/storage-unavailable') {
      errorMsg = 'Your browser has disabled cookies or storage. Please enable them for this site or try a different browser.';
    } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Authentication popup was blocked or closed. Please allow popups for this site.';
    } else if (error.code === 'auth/email-already-in-use') {
      errorMsg = 'This email is already registered. Please try signing in instead.';
    } else if (error.code === 'auth/user-not-found') {
      errorMsg = 'No account found with this email. Please check your email or create a new account.';
    } else if (error.code === 'auth/wrong-password') {
      errorMsg = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      errorMsg = 'Invalid email address. Please enter a valid email.';
    } else if (error.code === 'auth/weak-password') {
      errorMsg = 'Password is too weak. Please choose a stronger password.';
    } else if (error.message) {
      errorMsg = error.message;
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
          Sign in to participate in chapter voting
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
        
        <Tabs 
          isFitted 
          variant="enclosed" 
          width="100%" 
          index={activeTab}
          onChange={setActiveTab}
        >
          <TabList mb="1em">
            <Tab>Google Sign In</Tab>
            <Tab>Email Login</Tab>
            <Tab>Create Account</Tab>
          </TabList>
          
          <TabPanels>
            {/* Google Sign In Tab */}
            <TabPanel>
              <VStack spacing={4} width="100%">
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
                
                <Divider />
                
                <Button
                  size="md"
                  variant="outline"
                  colorScheme="gray"
                  onClick={handleResetSession}
                  width="100%"
                  isLoading={isLoading}
                >
                  Reset Session / Clear Cache
                </Button>
              </VStack>
            </TabPanel>
            
            {/* Email Login Tab */}
            <TabPanel>
              <form onSubmit={handleEmailLogin}>
                <VStack spacing={4} width="100%">
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <FiMail color="gray.300" />
                      </InputLeftElement>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </InputGroup>
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <FiLock color="gray.300" />
                      </InputLeftElement>
                      <Input
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <Button
                        size="sm"
                        h="1.75rem"
                        position="absolute"
                        right="0"
                        zIndex={2}
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        variant="ghost"
                      >
                        {showLoginPassword ? <FiEyeOff /> : <FiEye />}
                      </Button>
                    </InputGroup>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    size="lg"
                    colorScheme="blue"
                    width="100%"
                    isLoading={isLoading}
                  >
                    Sign In
                  </Button>
                </VStack>
              </form>
            </TabPanel>
            
            {/* Create Account Tab */}
            <TabPanel>
              <form onSubmit={handleEmailRegistration}>
                <VStack spacing={4} width="100%">
                  <HStack spacing={4} width="100%">
                    <FormControl isRequired>
                      <FormLabel>First Name</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <FiUser color="gray.300" />
                        </InputLeftElement>
                        <Input
                          type="text"
                          placeholder="First name"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                        />
                      </InputGroup>
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Last Name</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <FiUser color="gray.300" />
                        </InputLeftElement>
                        <Input
                          type="text"
                          placeholder="Last name"
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                        />
                      </InputGroup>
                    </FormControl>
                  </HStack>
                  
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <FiMail color="gray.300" />
                      </InputLeftElement>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </InputGroup>
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <FiLock color="gray.300" />
                      </InputLeftElement>
                      <Input
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                      <Button
                        size="sm"
                        h="1.75rem"
                        position="absolute"
                        right="0"
                        zIndex={2}
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        variant="ghost"
                      >
                        {showRegPassword ? <FiEyeOff /> : <FiEye />}
                      </Button>
                    </InputGroup>
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Confirm Password</FormLabel>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <FiLock color="gray.300" />
                      </InputLeftElement>
                      <Input
                        type={showRegConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                      />
                      <Button
                        size="sm"
                        h="1.75rem"
                        position="absolute"
                        right="0"
                        zIndex={2}
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        variant="ghost"
                      >
                        {showRegConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </Button>
                    </InputGroup>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    size="lg"
                    colorScheme="blue"
                    width="100%"
                    isLoading={isLoading}
                  >
                    Create Account
                  </Button>
                </VStack>
              </form>
            </TabPanel>
          </TabPanels>
        </Tabs>
        
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