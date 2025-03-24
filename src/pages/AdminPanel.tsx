import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Stack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Flex,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
  onSnapshot,
  writeBatch,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Question } from '../types/index';
import { FiTrash2 } from 'react-icons/fi';
import { useRef } from 'react';

const AdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
  });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteAlertOpen, 
    onOpen: onDeleteAlertOpen, 
    onClose: onDeleteAlertClose 
  } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();
  const [isDeleteAllQuestionsAlertOpen, setIsDeleteAllQuestionsAlertOpen] = useState(false);
  const deleteAllQuestionsRef = useRef(null);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [isDeleteQuestionAlertOpen, setIsDeleteQuestionAlertOpen] = useState(false);
  const deleteQuestionRef = useRef(null);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData: User[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as User),
        uid: doc.id,
      }));
      setUsers(userData);
    }, error => {
      console.error("Error listening to users collection:", error);
      toast({
        title: 'Error loading users',
        description: 'Please refresh the page and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });

    const unsubscribeQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const questionData = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        questionId: doc.id,
      }));
      setQuestions(questionData);
      const active = questionData.find((q) => q.active);
      setCurrentQuestion(active || null);
    }, error => {
      console.error("Error listening to questions collection:", error);
      toast({
        title: 'Error loading questions',
        description: 'Please refresh the page and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });

    return () => {
      unsubscribeUsers();
      unsubscribeQuestions();
    };
  }, [toast]);

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast({
          title: 'User not found',
          description: 'The user may have been deleted.',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      await updateDoc(userRef, { verified });
      toast({
        title: `User ${verified ? 'verified' : 'unverified'} successfully`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error updating user',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    onDeleteAlertOpen();
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      
      toast({
        title: 'User deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error deleting user',
        description: 'Failed to delete user. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleteLoading(false);
      onDeleteAlertClose();
      setUserToDelete(null);
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleAddOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, ''],
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...newQuestion.options];
    newOptions.splice(index, 1);
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleCreateQuestion = async () => {
    try {
      const batch = writeBatch(db);

      if (currentQuestion) {
        batch.update(doc(db, 'questions', currentQuestion.questionId), { active: false });
      }

      await addDoc(collection(db, 'questions'), {
        questionText: newQuestion.questionText,
        options: newQuestion.options.filter((opt) => opt.trim() !== ''),
        active: true,
        createdAt: Timestamp.now(),
        answers: {},
      });

      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.docs.forEach((userDoc) => {
        batch.update(doc(db, 'users', userDoc.id), { answered: false });
      });

      await batch.commit();

      setUsers(users.map(user => ({
        ...user,
        answered: false
      })));

      setNewQuestion({
        questionText: '',
        options: ['', '', '', ''],
      });
      onClose();
      toast({
        title: 'Question created successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: 'Error creating question',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleActivateQuestion = async (questionId: string) => {
    try {
      const batch = writeBatch(db);

      for (const question of questions) {
        batch.update(doc(db, 'questions', question.questionId), { active: false });
      }

      batch.update(doc(db, 'questions', questionId), { active: true });

      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.docs.forEach((userDoc) => {
        batch.update(doc(db, 'users', userDoc.id), { answered: false });
      });

      await batch.commit();

      setUsers(users.map(user => ({
        ...user,
        answered: false
      })));

      toast({
        title: 'Question activated successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error activating question:', error);
      toast({
        title: 'Error activating question',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const openDeleteQuestionDialog = (questionId: string) => {
    setQuestionToDelete(questionId);
    setIsDeleteQuestionAlertOpen(true);
  };

  const closeDeleteQuestionDialog = () => {
    setIsDeleteQuestionAlertOpen(false);
    setQuestionToDelete(null);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    try {
      const questionObj = questions.find(q => q.questionId === questionToDelete);
      if (questionObj?.active) {
        toast({
          title: 'Cannot delete active question',
          description: 'Please deactivate this question first by activating another question.',
          status: 'error',
          duration: 3000,
        });
        closeDeleteQuestionDialog();
        return;
      }

      await deleteDoc(doc(db, 'questions', questionToDelete));
      
      toast({
        title: 'Question deleted successfully',
        status: 'success',
        duration: 3000,
      });
      closeDeleteQuestionDialog();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error deleting question',
        status: 'error',
        duration: 3000,
      });
      closeDeleteQuestionDialog();
    }
  };

  const openDeleteAllQuestionsDialog = () => {
    setIsDeleteAllQuestionsAlertOpen(true);
  };

  const closeDeleteAllQuestionsDialog = () => {
    setIsDeleteAllQuestionsAlertOpen(false);
  };

  const confirmDeleteAllQuestions = async () => {
    try {
      const batch = writeBatch(db);
      
      const inactiveQuestions = questions.filter(q => !q.active);
      
      if (inactiveQuestions.length === 0) {
        toast({
          title: 'No inactive questions to delete',
          status: 'info',
          duration: 3000,
        });
        closeDeleteAllQuestionsDialog();
        return;
      }

      inactiveQuestions.forEach(question => {
        batch.delete(doc(db, 'questions', question.questionId));
      });

      await batch.commit();
      
      toast({
        title: 'All inactive questions deleted successfully',
        description: `Deleted ${inactiveQuestions.length} questions.`,
        status: 'success',
        duration: 3000,
      });
      closeDeleteAllQuestionsDialog();
    } catch (error) {
      console.error('Error deleting all questions:', error);
      toast({
        title: 'Error deleting questions',
        status: 'error',
        duration: 3000,
      });
      closeDeleteAllQuestionsDialog();
    }
  };

  const pendingVoters = users.filter(user => user.verified && !user.answered);

  return (
    <Box width="100vw" minH="100%" bg="gray.50" p={4}>
      <Box maxW="1400px" mx="auto" w="100%">
        <Flex direction="column" w="100%" mb={6}>
          <Heading size="lg" mb={4}>Admin Panel</Heading>
          
          <Box bg="white" p={6} borderRadius="md" boxShadow="md" mb={6} w="100%">
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Heading size="md">Current Question</Heading>
              <Button colorScheme="red" onClick={onOpen}>Create New Question</Button>
            </Flex>
            
            {currentQuestion ? (
              <Box>
                <Text fontWeight="bold" mb={2}>{currentQuestion.questionText}</Text>
                <Stack spacing={2} mb={4}>
                  {currentQuestion.options.map((option, index) => (
                    <Text key={index}>
                      {option}: {currentQuestion.answers?.[option] || 0} votes
                    </Text>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Text>No active question. Create a new question to get started.</Text>
            )}
          </Box>
          
          <Tabs isLazy w="100%">
            <TabList>
              <Tab>Users Management</Tab>
              <Tab>Questions History</Tab>
              <Tab>Pending Voters</Tab>
            </TabList>

            <TabPanels w="100%">
              <TabPanel p={0} pt={4}>
                <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                  <Heading size="md" mb={4}>Manage Users</Heading>
                  <Box maxH="500px" overflowY="auto" w="100%">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Status</Th>
                          <Th>Voted</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {users.map((user) => (
                          <Tr key={user.uid}>
                            <Td>{user.displayName || user.name || "User"}</Td>
                            <Td>{user.email}</Td>
                            <Td>
                              <Badge colorScheme={user.verified ? 'green' : 'red'}>
                                {user.verified ? 'Verified' : 'Unverified'}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme={user.answered ? 'green' : 'yellow'}>
                                {user.answered ? 'Voted' : 'Not Voted'}
                              </Badge>
                            </Td>
                            <Td>
                              <Flex gap={2}>
                                {user.verified ? (
                                  user.role === 'admin' ? (
                                    <Tooltip label="Admin users cannot be unverified" hasArrow>
                                      <Button
                                        size="sm"
                                        colorScheme="gray"
                                        isDisabled={true}
                                      >
                                        Admin
                                      </Button>
                                    </Tooltip>
                                  ) : (
                                    <Button
                                      size="sm"
                                      colorScheme="red"
                                      onClick={() => handleVerifyUser(user.uid, false)}
                                    >
                                      Unverify
                                    </Button>
                                  )
                                ) : (
                                  <Button
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => handleVerifyUser(user.uid, true)}
                                  >
                                    Verify
                                  </Button>
                                )}
                                <Tooltip label="Delete user" hasArrow>
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    aria-label="Delete user"
                                    colorScheme="red"
                                    variant="solid"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user)}
                                  />
                                </Tooltip>
                              </Flex>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              </TabPanel>

              <TabPanel p={0} pt={4}>
                <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                  <Flex justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading size="md">Question History</Heading>
                    <Button 
                      colorScheme="red" 
                      size="sm"
                      onClick={openDeleteAllQuestionsDialog}
                      leftIcon={<FiTrash2 />}
                    >
                      Delete All Inactive Questions
                    </Button>
                  </Flex>
                  <Box maxH="500px" overflowY="auto" w="100%">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Question</Th>
                          <Th>Status</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {questions.map((question) => (
                          <Tr key={question.questionId}>
                            <Td>{question.questionText}</Td>
                            <Td>
                              <Badge colorScheme={question.active ? 'green' : 'gray'}>
                                {question.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </Td>
                            <Td>
                              <Flex gap={2}>
                                {!question.active && (
                                  <>
                                    <Button
                                      size="sm"
                                      colorScheme="red"
                                      onClick={() => handleActivateQuestion(question.questionId)}
                                    >
                                      Redo
                                    </Button>
                                    <IconButton
                                      icon={<FiTrash2 />}
                                      aria-label="Delete question"
                                      colorScheme="red"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openDeleteQuestionDialog(question.questionId)}
                                    />
                                  </>
                                )}
                              </Flex>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              </TabPanel>
              
              <TabPanel p={0} pt={4}>
                {pendingVoters.length > 0 ? (
                  <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                    <Heading size="md" mb={4}>Pending Voters ({pendingVoters.length})</Heading>
                    <Text mb={3}>The following users have not voted on the current question:</Text>
                    <Box maxH="500px" overflowY="auto" w="100%">
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {pendingVoters.map((user) => (
                            <Tr key={user.uid}>
                              <Td>{user.displayName || user.name || "User"}</Td>
                              <Td>{user.email}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Box>
                ) : (
                  <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                    <Heading size="md" mb={4}>Pending Voters</Heading>
                    <Text>All verified users have voted on the current question.</Text>
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Question</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Question Text</FormLabel>
                <Input
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  placeholder="Enter your question"
                />
              </FormControl>

              <FormLabel>Options</FormLabel>
              {newQuestion.options.map((option, index) => (
                <Flex key={index} gap={2}>
                  <Input
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {newQuestion.options.length > 2 && (
                    <Button
                      colorScheme="red"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                    >
                      X
                    </Button>
                  )}
                </Flex>
              ))}
              <Button onClick={handleAddOption} colorScheme="red" variant="outline">
                Add Option
              </Button>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleCreateQuestion}
              isDisabled={
                newQuestion.questionText.trim() === '' ||
                newQuestion.options.filter((opt) => opt.trim() !== '').length < 2
              }
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {userToDelete?.displayName || userToDelete?.name || userToDelete?.email}? 
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteAlertClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={confirmDeleteUser} 
                ml={3}
                isLoading={deleteLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isDeleteAllQuestionsAlertOpen}
        leastDestructiveRef={deleteAllQuestionsRef}
        onClose={closeDeleteAllQuestionsDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete All Inactive Questions
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete all inactive questions? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteAllQuestionsRef} onClick={closeDeleteAllQuestionsDialog}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDeleteAllQuestions} ml={3}>
                Delete All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isDeleteQuestionAlertOpen}
        leastDestructiveRef={deleteQuestionRef}
        onClose={closeDeleteQuestionDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Question
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteQuestionRef} onClick={closeDeleteQuestionDialog}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDeleteQuestion} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default AdminPanel; 