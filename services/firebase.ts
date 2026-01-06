// Initializing Firebase using the modular SDK (v9+)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for Al-Mustafa project
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNd2HQJD9VVBgjKz8WmaZH_yQXwoeCqKE",
  authDomain: "almustafa2-48a22.firebaseapp.com",
  projectId: "almustafa2-48a22",
  storageBucket: "almustafa2-48a22.firebasestorage.app",
  messagingSenderId: "543703217240",
  appId: "1:543703217240:web:aae2241f8cd9b73c4fc62d",
  measurementId: "G-67FK6F7TKG"
};

// Initialize Firebase app and Firestore instance for the application
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
