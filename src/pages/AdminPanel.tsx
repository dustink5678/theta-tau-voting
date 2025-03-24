import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Spinner
} from '@chakra-ui/react';
import {
  collection,
  query,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
  onSnapshot,
  where,
  writeBatch,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Question } from '../types/index';
import { FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { DeleteIcon } from '@chakra-ui/icons';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', '']
  });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteAlertOpen, 
    onOpen: onDeleteAlertOpen, 
    onClose: onDeleteAlertClose 
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    // Listen for user changes
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as User));
      
      setUsers(usersData);
      
      // Filter verified and pending users
      const verifiedUsersData = usersData.filter(u => u.verified);
      const pendingUsersData = usersData.filter(u => !u.verified);
      
      setUsers(usersData);
    }, (error) => {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error fetching users',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });

    // Listen for questions
    const unsubscribeQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const questionsData = snapshot.docs.map(doc => ({
        questionId: doc.id,
        ...doc.data()
      } as Question));

      const activeQuestion = questionsData.find(q => q.active);
      setCurrentQuestion(activeQuestion || null);
    }, (error) => {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error fetching questions',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });

    return () => {
      unsubscribeUsers();
      unsubscribeQuestions();
    };
  }, [user, toast]);

  const handleTabsChange = (index: number) => {
    setActiveTab(index);
  };

  const handleVerifyUser = async (uid: string, verify: boolean) => {
    try {
      // If trying to unverify an admin, prevent it and show a message
      if (!verify) {
        const targetUser = users.find(u => u.uid === uid);
        if (targetUser && targetUser.role === 'admin') {
          toast({
            title: 'Cannot Unverify Admin',
            description: 'Admin users cannot be unverified. They can only be deleted.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          return;
        }
      }
      
      await updateDoc(doc(db, 'users', uid), { verified: verify });
      toast({
        title: verify ? 'User Verified' : 'User Unverified',
        description: verify ? 'User can now participate in voting' : 'User can no longer participate in voting',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error(`Error ${verify ? 'verifying' : 'unverifying'} user:`, error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${verify ? 'verify' : 'unverify'} user`,
        status: 'error',
        duration: 5000,
        isClosable: true,
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
      // Delete the user document from Firestore
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

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleAddOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, '']
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...newQuestion.options];
    newOptions.splice(index, 1);
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleCreateQuestion = async () => {
    try {
      // Validate inputs
      if (!newQuestion.text.trim()) {
        toast({
          title: 'Error',
          description: 'Question text is required',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const validOptions = newQuestion.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast({
          title: 'Error',
          description: 'At least two options are required',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Deactivate current question if exists
      if (currentQuestion) {
        await updateDoc(doc(db, 'questions', currentQuestion.questionId), { active: false });
      }

      // Create new question
      const batch = writeBatch(db);

      // Add the new question
      const newQuestionRef = doc(collection(db, 'questions'));
      batch.set(newQuestionRef, {
        questionText: newQuestion.text,
        options: newQuestion.options.filter(o => o.trim()),
        answers: {},
        active: true,
        createdAt: Timestamp.now(),
      });

      // Reset all users' answered status
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.forEach(userDoc => {
        batch.update(doc(db, 'users', userDoc.id), {
          answered: false
        });
      });

      await batch.commit();

      // Update local state to reflect changes immediately
      setUsers(users.map(u => ({ ...u, answered: false })));

      // Reset new question form and close modal
      setNewQuestion({
        text: '',
        options: ['', '', '', '']
      });
      
      onClose();
      
      toast({
        title: 'Success',
        description: 'Question created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create question',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleActivateQuestion = async (questionId: string) => {
    try {
      const batch = writeBatch(db);

      // Deactivate all questions
      for (const question of questions) {
        batch.update(doc(db, 'questions', question.questionId), { active: false });
      }

      // Activate selected question
      batch.update(doc(db, 'questions', questionId), { active: true });

      // Reset all users' answered status
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.docs.forEach((userDoc) => {
        batch.update(doc(db, 'users', userDoc.id), { answered: false });
      });

      await batch.commit();

      // Update local state to reflect changes immediately
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

  // Filter for users who haven't voted
  const pendingVoters = users.filter(user => user.verified && !user.answered);

  if (!user || user.role !== 'admin') {
    return (
      <Box p={5} maxW="100%" textAlign="center">
        <Heading>Unauthorized</Heading>
        <Text mt={4}>You do not have permission to access this page.</Text>
      </Box>
    );
  }

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
          
          {pendingVoters.length > 0 && (
            <Box bg="white" p={6} borderRadius="md" boxShadow="md" mb={6} w="100%">
              <Heading size="md" mb={4}>Pending Voters ({pendingVoters.length})</Heading>
              <Text mb={3}>The following users have not voted on the current question:</Text>
              <Box maxH="300px" overflowY="auto" w="100%">
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
          )}

          <Tabs isLazy w="100%" index={activeTab} onChange={handleTabsChange}>
            <TabList>
              <Tab>Users Management</Tab>
              <Tab>Questions History</Tab>
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
                                {user.role !== 'admin' && (
                                  user.verified ? (
                                    <Button
                                      size="sm"
                                      colorScheme="red"
                                      onClick={() => handleVerifyUser(user.uid, false)}
                                    >
                                      Unverify
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      colorScheme="green"
                                      onClick={() => handleVerifyUser(user.uid, true)}
                                    >
                                      Verify
                                    </Button>
                                  )
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
                  <Heading size="md" mb={4}>Question History</Heading>
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
                              {!question.active && (
                                <Button
                                  size="sm"
                                  colorScheme="red"
                                  onClick={() => handleActivateQuestion(question.questionId)}
                                >
                                  Activate
                                </Button>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Box>

      {/* Create Question Modal */}
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
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  placeholder="Enter your question"
                />
              </FormControl>

              <FormLabel>Options</FormLabel>
              {newQuestion.options.map((option, index) => (
                <Flex key={index} gap={2}>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
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
                newQuestion.text.trim() === '' ||
                newQuestion.options.filter((opt) => opt.trim() !== '').length < 2
              }
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Confirmation Dialog */}
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
    </Box>
  );
};

export default AdminPanel; 