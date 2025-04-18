import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User as FirestoreUser, Question } from '../types/index';
import { useAuth } from './AuthContext.tsx';

interface DataContextType {
  users: FirestoreUser[];
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
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !currentUser) {
      setUsers([]);
      setQuestions([]);
      setCurrentQuestion(null);
      setIsDataLoading(authLoading);
      return;
    }

    setIsDataLoading(true);
    
    let unsubscribeUsers: Unsubscribe | null = null;
    let unsubscribeQuestions: Unsubscribe | null = null;

    let userDataReceived = false;
    let questionDataReceived = false;
    const checkLoadingComplete = () => {
        if (userDataReceived && questionDataReceived) {
            setIsDataLoading(false);
        }
    }

    console.log("Setting up Firestore listeners for user:", currentUser.uid);

    unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData: FirestoreUser[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as FirestoreUser),
        uid: doc.id,
      }));
      setUsers(userData);
      userDataReceived = true;
      checkLoadingComplete();
    }, error => {
      console.error("Error listening to users collection:", error);
      setIsDataLoading(false);
    });

    unsubscribeQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const questionData = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        questionId: doc.id,
      }));
      setQuestions(questionData);
      const active = questionData.find((q) => q.active);
      setCurrentQuestion(active || null);
      questionDataReceived = true;
      checkLoadingComplete();
    }, error => {
      console.error("Error listening to questions collection:", error);
      setIsDataLoading(false);
    });

    return () => {
      console.log("Cleaning up Firestore listeners");
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeQuestions) unsubscribeQuestions();
    };
  }, [currentUser, authLoading]);

  return (
    <DataContext.Provider value={{ users, questions, currentQuestion, isDataLoading }}>
      {children}
    </DataContext.Provider>
  );
}; 