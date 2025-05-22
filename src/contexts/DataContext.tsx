import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Question } from '../types/index';
import { useAuthContext } from '../contexts/AuthContext';

interface DataContextType {
  users: User[];
  questions: Question[];
  currentQuestion: Question | null;
  isDataLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const { currentUser: user } = useAuthContext();

  useEffect(() => {
    if (!user) return;

    if (!isInitialLoadComplete) {
      setIsDataLoading(true);
    }
    
    let unsubscribeUsers: Unsubscribe | null = null;
    let unsubscribeQuestions: Unsubscribe | null = null;

    // Track if both subscriptions have received initial data
    let userDataReceived = false;
    let questionDataReceived = false;

    // Subscribe to users
    unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData: User[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as User),
        uid: doc.id,
      }));
      setUsers(userData);
      
      // Mark user data as received
      userDataReceived = true;
      
      // If both subscriptions have received data, mark initial load as complete
      if (userDataReceived && questionDataReceived && !isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
        setIsDataLoading(false);
      }
    }, error => {
      console.error("Error listening to users collection:", error);
      setIsDataLoading(false);
      setIsInitialLoadComplete(true);
    });

    // Subscribe to questions
    unsubscribeQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const questionData = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        questionId: doc.id,
      }));
      setQuestions(questionData);
      const active = questionData.find((q) => q.active);
      setCurrentQuestion(active || null);
      
      // Mark question data as received
      questionDataReceived = true;
      
      // If both subscriptions have received data, mark initial load as complete
      if (userDataReceived && questionDataReceived && !isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
        setIsDataLoading(false);
      }
    }, error => {
      console.error("Error listening to questions collection:", error);
      setIsDataLoading(false);
      setIsInitialLoadComplete(true);
    });

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeQuestions) unsubscribeQuestions();
    };
  }, [user, isInitialLoadComplete]);

  return (
    <DataContext.Provider value={{ users, questions, currentQuestion, isDataLoading }}>
      {children}
    </DataContext.Provider>
  );
}; 