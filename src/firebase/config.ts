import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBagieHOIU8EcFiIyOpMM-nnjQoLbWb9vw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mi-app-movil-tienda.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mi-app-movil-tienda",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mi-app-movil-tienda.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "716541503023",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:716541503023:web:41f96af85aaf85556288da",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-04CK6Z5CV3",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let analytics: ReturnType<typeof getAnalytics> | null = null;

if (typeof window !== "undefined" && import.meta.env.PROD) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("No se pudo inicializar Analytics:", error);
  }
}

export { analytics };
export default app;
