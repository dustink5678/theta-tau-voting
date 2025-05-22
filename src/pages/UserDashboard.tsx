import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  useToast,
  Radio,
  RadioGroup,
  Flex,
  Center,
  Spinner,
} from '@chakra-ui/react';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const { currentQuestion, isDataLoading } = useData();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!user) return;
    setHasVoted(user.answered);
  }, [user]);

  const handleVote = async () => {
    if (!currentQuestion || !selectedOption || !user) return;

    setIsVoting(true);
    try {
      // Get a reference to the question document
      const questionRef = doc(db, 'questions', currentQuestion.questionId);
      
      // First check if the question exists
      const questionSnapshot = await getDoc(questionRef);
      if (!questionSnapshot.exists()) {
        throw new Error('Question not found');
      }
      
      // Get current answers or initialize empty object
      const questionData = questionSnapshot.data();
      const answers = questionData.answers || {};
      
      // Create a simple update that only affects the answers field
      // This is crucial for our security rules that only allow users to update the answers field
      const updatePayload = {
        answers: { ...answers }
      };
      
      // Increment the count for the selected option
      updatePayload.answers[selectedOption] = (updatePayload.answers[selectedOption] || 0) + 1;
      
      // Update the question document
      await updateDoc(questionRef, updatePayload);
      
      // Update user's answered status
      await updateDoc(doc(db, 'users', user.uid), {
        answered: true
      });
      
      // Update local state
      setHasVoted(true);

      toast({
        title: 'Vote submitted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast({
        title: 'Error submitting vote',
        description: 'Please try again or contact an administrator.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsVoting(false);
    }
  };

  const renderContent = () => {
    if (!user?.verified) {
      return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
          <Box 
            maxW="lg" 
            w="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md" 
            textAlign="center"
          >
            <Heading mb={4}>Waiting for Verification</Heading>
            <Text color="gray.600">
              Your account is pending verification from an administrator. 
              You will be able to participate in voting once your account is verified.
            </Text>
          </Box>
        </Box>
      );
    }

    if (hasVoted) {
      return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
          <Box 
            maxW="lg" 
            w="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md" 
            textAlign="center"
          >
            <Heading mb={4}>Waiting for Next Question</Heading>
            <Text color="gray.600">
              Thank you for submitting your vote! 
              Please wait until the next question is published by the admin.
            </Text>
          </Box>
        </Box>
      );
    }

    if (!currentQuestion) {
      return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
          <Box 
            maxW="lg" 
            w="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md" 
            textAlign="center"
          >
            <Heading mb={4}>No Active Question</Heading>
            <Text color="gray.600">
              There is currently no active question to vote on. 
              Please check back later.
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
        <Box
          maxW="lg"
          w="100%"
          p={8}
          bg="white"
          borderRadius="md"
          boxShadow="md"
        >
          <Stack spacing={6}>
            <Heading size="lg" textAlign="center">{currentQuestion.questionText}</Heading>
            <RadioGroup onChange={setSelectedOption} value={selectedOption}>
              <Stack spacing={4}>
                {currentQuestion.options.map((option) => (
                  <Radio key={option} value={option} size="lg">
                    {option}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
            <Button
              colorScheme="blue"
              size="lg"
              w="full"
              onClick={handleVote}
              isDisabled={!selectedOption || isVoting}
            >
              {isVoting ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  };

  return (
    <Box 
      width="100vw" 
      minH="100%" 
      bg="gray.50" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
    >
      {isDataLoading && !currentQuestion ? (
        <Center>
          <Spinner size="xl" color="blue.500" thickness="4px" />
        </Center>
      ) : (
        renderContent()
      )}
    </Box>
  );
};

export default UserDashboard; 