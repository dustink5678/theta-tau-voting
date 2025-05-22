// Type declarations for ../config/firebase
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

declare const auth: Auth;
declare const db: Firestore;
declare const analytics: any;
declare const firebaseApp: FirebaseApp;

export { auth, db, analytics, firebaseApp }; 