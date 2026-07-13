import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missingVars = requiredEnvVars.filter((varName) => {
  const value = import.meta.env[varName as keyof ImportMetaEnv];
  return !value;
});

if (missingVars.length > 0) {
  console.error(
    '🔴 ERROR: Faltan variables de entorno de Firebase:\n' +
      missingVars.map((v) => `  • ${v}`).join('\n') +
      '\n\nConfigúralas en Render, Vercel o en tu archivo .env.local'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const isFirebaseConfigured = missingVars.length === 0;

let firebaseAppInstance: FirebaseApp | null = null;

if (isFirebaseConfigured) {
  console.log('✅ Inicializando Firebase con projectId:', firebaseConfig.projectId);

  firebaseAppInstance = initializeApp(firebaseConfig);
} else {
  console.warn('⚠️ Firebase no se inicializó porque faltan variables de entorno.');
}

export const app = firebaseAppInstance;
export const db = firebaseAppInstance ? getFirestore(firebaseAppInstance) : null;
export const auth = firebaseAppInstance ? getAuth(firebaseAppInstance) : null;
export const storage = firebaseAppInstance ? getStorage(firebaseAppInstance) : null;

let analytics: Analytics | null = null;

if (typeof window !== 'undefined' && firebaseAppInstance) {
  void isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(firebaseAppInstance!);
    }
  });
}

export { analytics };
export default app;
