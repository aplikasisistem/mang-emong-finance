const firebaseConfig = {
  apiKey: "AIzaSyD2V799u779Q6xYvUVa3N2w_6R5Ql00Y-4",
  authDomain: "emong-finance.firebaseapp.com",
  projectId: "emong-finance",
  storageBucket: "emong-finance.firebasestorage.app",
  messagingSenderId: "551600836652",
  appId: "1:551600836652:web:8cdcaed2b02477ebfe0189",
  measurementId: "G-DC7NVV0HM1"
};

let dbRealtime = null;
try {
    firebase.initializeApp(firebaseConfig);
    dbRealtime = firebase.database();
    console.log("Firebase terhubung!");
} catch (e) {
    console.error("Gagal Firebase:", e);
}

let currentUser = null;
let transactions = [];
let currentShiftCash = 0;

document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("mang_emos_user");
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById("loginModal").classList.add("hidden");
        document.getElementById("appContainer").classList.remove("hidden");
        renderDashboard();
    }
});

function loginUser() {
    const role = document.getElementById("loginRoleSelect") ? document.getElementById("loginRoleSelect").value : "admin";
    
    currentUser = {
        uid: "drbd2y4KnGNUF3qkd1M6Ya9QeXj2",
        role: role,
        nama: "firman",
        email: "firman@ramenhouse.com"
    };

    localStorage.setItem("mang_emos_user", JSON.stringify(currentUser));
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
    renderDashboard();
}

function logout() {
    localStorage.removeItem("mang_emos_user");
    location.reload();
}

function toggleRole() {
    if (currentUser) {
        currentUser.role = currentUser.role === "admin" ? "kasir" : "admin";
        localStorage.setItem("mang_emos_user", JSON.stringify(currentUser));
        renderDashboard();
    }
}

function renderDashboard() {
    if (!currentUser) return;
    const info = document.getElementById("userInfo");
    if (info) info.innerText = `Role: ${currentUser.role.toUpperCase()} (${currentUser.nama})`;
    
    const adminBar = document.getElementById("adminToolBar");
    if (adminBar) {
        if (currentUser.role === "admin") adminBar.classList.remove("hidden");
        else adminBar.classList.add("hidden");
    }
}

function handleIncomeSubmit(e) {
    e.preventDefault();
    alert("Pemasukan berhasil disimpan (Mode Lokal)!");
    document.getElementById("incomeForm").reset();
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    alert("Pengeluaran berhasil disimpan (Mode Lokal)!");
    document.getElementById("expenseForm").reset();
}
