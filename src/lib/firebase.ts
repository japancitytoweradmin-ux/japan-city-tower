import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Default config from firebase-applet-config.json or import.meta.env
const env = (import.meta as any).env || {};
let firebaseConfig: Record<string, string> = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCoJma63ExeyVbqwTafN1sBnQJvToDnPV0',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'excellent-dispatcher-ht3g1.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'excellent-dispatcher-ht3g1',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'excellent-dispatcher-ht3g1.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '326676867985',
  appId: env.VITE_FIREBASE_APP_ID || '1:326676867985:web:67ccb025b4e4033b4d4830',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-japancitytowerco-15a9dc95-40ab-4028-9822-75f3b6a721e2'
};

// Initialize Firebase App instance safely
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firestore with specific databaseId if configured, or default
const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const db: Firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

export default app;
