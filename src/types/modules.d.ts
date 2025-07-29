// Global module declarations for JavaScript files

declare module '../config/firebase' {
  import { Auth } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  import { FirebaseApp } from 'firebase/app';
  
  export const auth: Auth;
  export const db: Firestore;
  export const analytics: any;
  export const firebaseApp: FirebaseApp;
}

declare module './AuthContext' {
  import { ReactNode } from 'react';
  
  interface AuthUser {
    uid: string;
    email: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
  
  interface UserData {
    firstName?: string;
    lastName?: string;
  }
  
  interface AuthContextType {
    currentUser: AuthUser | null;
    loading: boolean;
    error: Error | null;
    registerWithEmail: (email: string, password: string, userData?: UserData) => Promise<any>;
    loginWithEmail: (email: string, password: string) => Promise<any>;
    loginWithGoogle: () => Promise<any>;
    loginWithApple: () => Promise<any>;
    signOut: () => Promise<void>;
    updateUserEmail: (email: string) => Promise<void>;
    updateUserPassword: (password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
  }
  
  export function AuthProvider(props: { children: ReactNode }): JSX.Element;
  export function useAuthContext(): AuthContextType;
  export function useAuth(): {
    user: any;
    loading: boolean;
    error: Error | null;
    registerWithEmail: (email: string, password: string, userData?: UserData) => Promise<any>;
    loginWithEmail: (email: string, password: string) => Promise<any>;
    loginWithGoogle: () => Promise<any>;
    signInWithGoogle: () => Promise<any>;
    loginWithApple: () => Promise<any>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
  };
}

// Allow importing any JS file without type declarations
declare module '*.jsx'; 