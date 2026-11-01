import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAV3eA8NR8a9XYxUBPoRs-IlwiQaYJZxlc",
  authDomain: "appdev-53d83.firebaseapp.com",
  projectId: "appdev-53d83",
  storageBucket: "appdev-53d83.firebasestorage.app",
  messagingSenderId: "81885420346",
  appId: "1:81885420346:web:d2b4c5d0ec6aedb3c7ce03",
  measurementId: "G-J0JYC0Q0TF"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);