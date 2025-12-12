import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyASdWExJrQJjFtPGXg2x20gB4sgLFrpl9o",
  authDomain: "campus-complete.firebaseapp.com",
  projectId: "campus-complete",
  storageBucket: "campus-complete.firebasestorage.app",
  messagingSenderId: "140793637206",
  appId: "1:140793637206:web:6978ccf5a67df2a1898ef7",
  measurementId: "G-81RQNPTRRQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);