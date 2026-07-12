import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBagieHOIU8EcFiIyOpMM-nnjQoLbWb9vw",
  authDomain: "mi-app-movil-tienda.firebaseapp.com",
  projectId: "mi-app-movil-tienda",
  storageBucket: "mi-app-movil-tienda.firebasestorage.app",
  messagingSenderId: "716541503023",
  appId: "1:716541503023:web:41f96af85aaf85556288da",
  measurementId: "G-04CK6Z5CV3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);