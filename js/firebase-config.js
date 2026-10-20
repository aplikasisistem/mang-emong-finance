import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD2V799u779Q6xYvUVa3N2w_6R5Ql00Y-4",
  authDomain: "emong-finance.firebaseapp.com",
  projectId: "emong-finance",
  storageBucket: "emong-finance.firebasestorage.app",
  messagingSenderId: "551600836652",
  appId: "1:551600836652:web:8cdcaed2b02477ebfe0189",
  measurementId: "G-DC7NVV0HM1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const dbFirestore = getFirestore(app);
const dbRealtime = getDatabase(app);
const auth = getAuth(app);

console.log("Firebase berhasil terhubung!");
