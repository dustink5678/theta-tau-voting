import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Question } from '../types/index';

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

  useEffect(() => {
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

    unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData: User[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as User),
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
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeQuestions) unsubscribeQuestions();
    };
  }, []);

  return (
    <DataContext.Provider value={{ users, questions, currentQuestion, isDataLoading }}>
      {children}
    </DataContext.Provider>
  );
}; 