// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
// Inisialisasi Firebase & Firestore (Compat Version untuk integrasi mudah)
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase & Firestore berhasil terhubung ke project: manajemen-keuangan-mang-emong!");
} catch (e) {
    console.error("Gagal menginisialisasi Firebase:", e);
}

