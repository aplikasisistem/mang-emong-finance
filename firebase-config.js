// Konfigurasi Firebase untuk Mang Emong Ramen Finance
// Masukkan kredensial Firebase Anda di sini jika ingin menghubungkan ke database online.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Inisialisasi Firebase (jika API key valid)
let db = null;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase initialized successfully.");
    } else {
        console.log("Running in Local Mock Mode. Update firebase-config.js to sync with Firebase.");
    }
} catch (e) {
    console.warn("Firebase initialization error:", e);
}
