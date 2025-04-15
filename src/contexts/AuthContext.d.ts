import { ReactNode } from 'react';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  error: Error | null;
  registerWithEmail: (email: string, password: string) => Promise<any>;
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
  registerWithEmail: (email: string, password: string) => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  loginWithApple: () => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}; 