import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  List,
  ListItem,
  Flex,
  Container,
  Badge,
} from '@chakra-ui/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types/index';

const PendingVoters = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData: User[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as User),
        uid: doc.id,
      }));
      setUsers(userData);
    });

    // Subscribe to active question to get its text
    const unsubscribeQuestions = onSnapshot(
      collection(db, 'questions'),
      (snapshot) => {
        const activeQuestion = snapshot.docs.find(
          (doc) => doc.data().active === true
        );
        if (activeQuestion) {
          setCurrentQuestion(activeQuestion.data().questionText);
        } else {
          setCurrentQuestion(null);
        }
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeQuestions();
    };
  }, []);

  // Filter for verified users who haven't voted
  const pendingVoters = users.filter(
    (user) => user.verified && !user.answered
  );

  return (
    <Box
      width="100vw"
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={10}
    >
      <Container maxW="container.md">
        <Box
          bg="white"
          p={8}
          borderRadius="md"
          boxShadow="md"
          width="100%"
          textAlign="center"
        >
          <Heading size="lg" mb={2}>Brothers Who Haven't Voted Yet</Heading>
          
          {currentQuestion ? (
            <Text fontSize="xl" mb={6} color="gray.600">
              Current Question: "{currentQuestion}"
            </Text>
          ) : (
            <Text fontSize="xl" mb={6} color="gray.600">
              No active question
            </Text>
          )}

          {pendingVoters.length > 0 ? (
            <>
              <Badge fontSize="md" colorScheme="red" mb={4}>
                {pendingVoters.length} Member{pendingVoters.length !== 1 ? 's' : ''} Pending
              </Badge>
              
              <List spacing={3}>
                {pendingVoters.map((user) => (
                  <ListItem 
                    key={user.uid}
                    p={3}
                    bg="red.50"
                    borderRadius="md"
                    boxShadow="sm"
                    fontSize="xl"
                    fontWeight="bold"
                  >
                    {user.displayName || user.name || "Unknown Member"}
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Box 
              p={10} 
              textAlign="center"
              fontSize="xl"
              fontWeight="bold"
              color="green.500"
            >
              All members have voted!
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PendingVoters; 