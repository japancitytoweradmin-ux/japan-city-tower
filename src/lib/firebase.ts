import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Default config from firebase-applet-config.json or import.meta.env
const env = (import.meta as any).env || {};
const defaultFirebaseConfig: Record<string, string> = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCoJma63ExeyVbqwTafN1sBnQJvToDnPV0',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'excellent-dispatcher-ht3g1.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'excellent-dispatcher-ht3g1',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'excellent-dispatcher-ht3g1.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '326676867985',
  appId: env.VITE_FIREBASE_APP_ID || '1:326676867985:web:67ccb025b4e4033b4d4830',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-japancitytowerco-15a9dc95-40ab-4028-9822-75f3b6a721e2'
};

// Check localStorage for custom user firebase configuration
export function getActiveFirebaseConfig(): Record<string, string> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('jct_custom_firebase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return {
            apiKey: parsed.apiKey,
            authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
            projectId: parsed.projectId,
            storageBucket: parsed.storageBucket || `${parsed.projectId}.firebasestorage.app` || `${parsed.projectId}.appspot.com`,
            messagingSenderId: parsed.messagingSenderId || parsed.appId?.split(':')[1] || '326676867985',
            appId: parsed.appId,
            firestoreDatabaseId: '(default)' // Custom user projects always use '(default)'
          };
        }
      }
    } catch (e) {
      console.error('Error reading custom firebase config:', e);
    }
  }
  return defaultFirebaseConfig;
}

const activeConfig = getActiveFirebaseConfig();

// Initialize Firebase App instance safely
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(activeConfig);
} else {
  app = getApp();
}

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firestore with specific databaseId if configured, or default
const databaseId = activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)'
  ? activeConfig.firestoreDatabaseId
  : undefined;

export const db: Firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Connection test helper function
export async function testFirebaseConnection(config: { apiKey: string; projectId: string; appId: string; authDomain?: string }): Promise<boolean> {
  try {
    const tempConfig = {
      apiKey: config.apiKey,
      projectId: config.projectId,
      appId: config.appId,
      authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
      storageBucket: `${config.projectId}.firebasestorage.app`,
      messagingSenderId: config.appId?.split(':')[1] || '123456789'
    };
    const testApp = initializeApp(tempConfig, 'connection-test-app-' + Date.now());
    const testDb = getFirestore(testApp);
    // Simple ping check to see if network/credentials work
    await getDocs(collection(testDb, 'connection_test_ping_123'));
    return true;
  } catch (err: any) {
    console.error('Connection test failed:', err);
    throw err;
  }
}

export default app;
