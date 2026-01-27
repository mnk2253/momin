// Use explicit @firebase subpath imports for modular Firebase v9+ to ensure compatibility and resolve module resolution issues
import { initializeApp, getApps, getApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBhnPgzF4JHlc6NofDfOedDASXgckKDpZI",
  authDomain: "amazing-gearing-485307-a3.firebaseapp.com",
  databaseURL: "https://amazing-gearing-485307-a3-default-rtdb.firebaseio.com",
  projectId: "amazing-gearing-485307-a3",
  // storageBucket renamed from spacingBucket for correct configuration
  storageBucket: "amazing-gearing-485307-a3.firebasestorage.app",
  messagingSenderId: "541936297000",
  appId: "1:541936297000:web:ca5258e912096bc773c11d",
  measurementId: "G-RGQLJQVWHF"
};

// Initialize Firebase instances using modular functions from @firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances
export { app, auth, db };

// Re-export modular functions directly from @firebase sub-packages to fix compilation errors
export { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from '@firebase/auth';
export type { User } from '@firebase/auth';
export { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  runTransaction, 
  writeBatch 
} from '@firebase/firestore';