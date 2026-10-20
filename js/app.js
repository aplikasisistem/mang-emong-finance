// --- KONFIGURASI FIREBASE EMONG FINANCE ---
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
let dbFirestore = null;
let auth = null;

try {
    firebase.initializeApp(firebaseConfig);
    dbRealtime = firebase.database();
    dbFirestore = firebase.firestore();
    auth = firebase.auth();
    console.log("Firebase berhasil terhubung!");
} catch (e) {
    console.error("Gagal menginisialisasi Firebase:", e);
}

let currentUser = null; 
let transactions = [];
let currentShiftCash = 0;
let googleSheetsWebhookUrl = localStorage.getItem("mang_emos_gsheet_url") || "";

document.addEventListener("DOMContentLoaded", () => {
    loadLocalData();
    checkSavedSession();
});

// FUNGSI LOGIN BYPASS
function loginUser() {
    const roleSelect = document.getElementById("loginRoleSelect");
    const selectedRole = roleSelect ? roleSelect.value : "admin";

    currentUser = {
        uid: "drbd2y4KnGNUF3qkd1M6Ya9QeXj2",
        role: selectedRole,
        nama: "firman",
        email: "firman@ramenhouse.com"
    };

    saveSessionAndProceed();
}

function saveSessionAndProceed() {
    localStorage.setItem("mang_emos_user", JSON.stringify(currentUser));
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
    setupRoleUI();
    syncDataFromFirebase();
}

function checkSavedSession() {
    const saved = localStorage.getItem("mang_emos_user");
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById("loginModal").classList.add("hidden");
        document.getElementById("appContainer").classList.remove("hidden");
        setupRoleUI();
        syncDataFromFirebase();
    }
}

function logout() {
    localStorage.removeItem("mang_emos_user");
    location.reload();
}

function toggleRole() {
    if (currentUser.role === "admin") {
        currentUser.role = "kasir";
    } else {
        currentUser.role = "admin";
    }
    setupRoleUI();
}

function setupRoleUI() {
    document.getElementById("userInfo").innerText = `Role: ${currentUser.role.toUpperCase()} (${currentUser.nama})`;
    
    const adminToolBar = document.getElementById("adminToolBar");
    const expenseSection = document.getElementById("expenseAdminSection");
    const addUserSection = document.getElementById("addUserAdminSection");

    if (currentUser.role === "admin") {
        if (adminToolBar) adminToolBar.classList.remove("hidden");
        if (expenseSection) expenseSection.classList.remove("hidden");
        if (addUserSection) addUserSection.classList.remove("hidden");
    } else {
        if (adminToolBar) adminToolBar.classList.add("hidden");
        if (expenseSection) expenseSection.classList.add("hidden");
        if (addUserSection) addUserSection.classList.add("hidden");
    }
    renderDashboard();
}

function handleIncomeSubmit(e) {
    e.preventDefault();
    const method = document.getElementById("incPaymentMethod").value;
    const amount = parseFloat(document.getElementById("incAmount").value);
    const note = document.getElementById("incNote").value;

    const transaction = {
        id: "INC-" + Date.now(),
        type: "pemasukan",
        category: method.includes("Tunai") ? "Pemasukan Tunai" : "Pemasukan Non-Tunai",
        method: method,
        amount: amount,
        note: note,
        timestamp: new Date().toISOString(),
        user: currentUser ? currentUser.nama : "Kasir"
    };

    if (method === "Tunai (Cash)") {
        currentShiftCash += amount;
    }

    saveTransaction(transaction);
    document.getElementById("incomeForm").reset();
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const category = document.getElementById("expCategory").value;
    const amount = parseFloat(document.getElementById("expAmount").value);
    const note = document.getElementById("expNote").value;

    const transaction = {
        id: "EXP-" + Date.now(),
        type: "pengeluaran",
        category: category,
        method: "Tunai Laci",
        amount: amount,
        note: note,
        timestamp: new Date().toISOString(),
        user: currentUser ? currentUser.nama : "Admin"
    };

    saveTransaction(transaction);
    document.getElementById("expenseForm").reset();
}

function saveTransaction(item) {
    transactions.unshift(item);
    localStorage.setItem("mang_emos_trans", JSON.stringify(transactions));
    localStorage.setItem("mang_emos_shift_cash", currentShiftCash.toString());

    if (dbRealtime) {
        dbRealtime.ref("transactions/" + item.id).set(item);
    }

    renderDashboard();
}

function syncDataFromFirebase() {
    if (!dbRealtime) return;
    dbRealtime.ref("transactions").limitToLast(100).on("value", (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            transactions = Object.values(data).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            localStorage.setItem("mang_emos_trans", JSON.stringify(transactions));
            recalculateCurrentShiftCash();
            renderDashboard();
        }
    });
}

function loadLocalData() {
    const localTrans = localStorage.getItem("mang_emos_trans");
    if (localTrans) transactions = JSON.parse(localTrans);
    const savedCash = localStorage.getItem("mang_emos_shift_cash");
    if (savedCash) currentShiftCash = parseFloat(savedCash);
}

function recalculateCurrentShiftCash() {
    let cash = 0;
    transactions.forEach(t => {
        if (t.type === "pemasukan" && t.method === "Tunai (Cash)") cash += t.amount;
        if (t.type === "closing") cash = 0; 
    });
    currentShiftCash = cash;
}

function renderDashboard() {
    const sysDisplay = document.getElementById("systemCashDisplay");
    if (sysDisplay) sysDisplay.innerText = `Rp ${currentShiftCash.toLocaleString('id-ID')}`;

    const filtered = transactions;
    const dataCount = document.getElementById("dataCount");
    if (dataCount) dataCount.innerText = `${filtered.length} Data Terrekam`;

    let cashIncome = 0;
    let nonCashIncome = 0;
    let totalExpense = 0;

    const tbody = document.getElementById("transactionTableBody");
    if (tbody) {
        tbody.innerHTML = "";

        filtered.forEach(item => {
            if (item.type === "pemasukan") {
                if (item.method === "Tunai (Cash)") cashIncome += item.amount;
                else nonCashIncome += item.amount;
            } else if (item.type === "pengeluaran") {
                totalExpense += item.amount;
            }

            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50 border-b";

            const badgeClass = item.type === "pemasukan" ? "bg-green-100 text-green-800" :
                               item.type === "pengeluaran" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800";

            tr.innerHTML = `
                <td class="p-3 text-xs">${new Date(item.timestamp).toLocaleString('id-ID')}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}">${item.method || item.type}</span></td>
                <td class="p-3">
                    <p class="font-medium text-gray-800">${item.category}</p>
                    <p class="text-xs text-gray-500">${item.note}</p>
                </td>
                <td class="p-3 font-bold ${item.type === 'pengeluaran' ? 'text-red-600' : 'text-green-600'}">
                    ${item.type === 'pengeluaran' ? '-' : '+'} Rp ${item.amount.toLocaleString('id-ID')}
                </td>
                <td class="p-3 text-xs text-gray-500">${item.user || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const netProfit = (cashIncome + nonCashIncome) - totalExpense;

    if (document.getElementById("cardCashIncome")) document.getElementById("cardCashIncome").innerText = `Rp ${cashIncome.toLocaleString('id-ID')}`;
    if (document.getElementById("cardNonCashIncome")) document.getElementById("cardNonCashIncome").innerText = `Rp ${nonCashIncome.toLocaleString('id-ID')}`;
    if (document.getElementById("cardExpense")) document.getElementById("cardExpense").innerText = `Rp ${totalExpense.toLocaleString('id-ID')}`;
    if (document.getElementById("cardNetProfit")) document.getElementById("cardNetProfit").innerText = `Rp ${netProfit.toLocaleString('id-ID')}`;
}
