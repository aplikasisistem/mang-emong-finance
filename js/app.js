// Register Service Worker PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Fail:', err));
}

// 1. Firebase Configuration
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

const OWNER_UID = "NfOuYEiGp9Py2uSxuuqN3llGZUI2";
const GOOGLE_SHEETS_WEBHOOK_URL = ""; 

let db = null;
try {
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase & Firestore terhubung!");
  }
} catch (e) {
  console.error("Gagal Inisialisasi Firebase:", e);
}

// LocalStorage Helpers
function getLocalData() {
  return JSON.parse(localStorage.getItem('mang_emos_transactions') || '[]');
}

function saveLocalData(data) {
  localStorage.setItem('mang_emos_transactions', JSON.stringify(data));
}

function formatRp(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

// 2. Auth & Login Logic (Bypass UID & Direct Auth)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const role = document.getElementById('roleSelect').value;
    const alertBox = document.getElementById('loginAlert');

    if (alertBox) {
      alertBox.className = "mt-4 p-3 rounded-xl text-sm font-medium hidden";
    }

    // A. BISA LOGIN LANGSUNG MENGGUNAKAN UID OWNER ATAU EMAIL OWNER
    if (input === OWNER_UID || input.toLowerCase() === "firman@ramenhouse.com" || input.includes("NfOuYEiGp")) {
      localStorage.setItem('userRole', role);
      localStorage.setItem('userUID', OWNER_UID);
      window.location.href = role === 'admin' ? 'dashboard.html' : 'kasir.html';
      return;
    }

    // B. JIKA LOGIN MENGGUNAKAN EMAIL LAIN VIA FIREBASE AUTH
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const userCred = await firebase.auth().signInWithEmailAndPassword(input, password);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userUID', userCred.user.uid);
        window.location.href = role === 'admin' ? 'dashboard.html' : 'kasir.html';
      } else {
        // Fallback jika SDK offline
        localStorage.setItem('userRole', role);
        window.location.href = role === 'admin' ? 'dashboard.html' : 'kasir.html';
      }
    } catch (err) {
      console.error("Login Error:", err);
      if (alertBox) {
        alertBox.className = "mt-4 p-3 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-300 block";
        alertBox.innerText = "Login gagal: " + (err.message || "Periksa email dan password Anda.");
      }
    }
  });
}

function logout() {
  localStorage.removeItem('userRole');
  localStorage.removeItem('userUID');
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut().finally(() => {
      window.location.href = 'index.html';
    });
  } else {
    window.location.href = 'index.html';
  }
}
