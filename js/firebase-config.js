// Konfigurasi Firebase untuk Mang Emong Ramen Finance
const firebaseConfig = {
    apiKey: "AIzaSyB7-sRsDabjN9ypOVyJwhdA7jNczWIhoiQ",
    authDomain: "manajemen-keuangan-mang-emong.firebaseapp.com",
    databaseURL: "https://manajemen-keuangan-mang-emong-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "manajemen-keuangan-mang-emong",
    storageBucket: "manajemen-keuangan-mang-emong.firebasestorage.app",
    messagingSenderId: "719220664193",
    appId: "1:719220664193:web:7141f6262a38c5851b6a80",
    measurementId: "G-JTPDTWHRQW"
};

// Inisialisasi Firebase & Firestore (Compat Version untuk integrasi mudah)
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase & Firestore berhasil terhubung ke project: manajemen-keuangan-mang-emong!");
} catch (e) {
    console.error("Gagal menginisialisasi Firebase:", e);
}

