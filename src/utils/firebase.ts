// src/utils/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config object here
const firebaseConfig = {
  apiKey: "AIzaSyBpve9ZblJNWy5s3iLNiL_KtgqLnD9-Qq4",
  authDomain: "achievements-27677.firebaseapp.com",
  projectId: "achievements-27677",
  storageBucket: "achievements-27677.firebasestorage.app",
  messagingSenderId: "25194061969",
  appId: "1:25194061969:web:c5cf57cc1270cbb12f9f30"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
