// Konfigurasi Firebase untuk Mang Emong Ramen Finance[cite: 1]
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

// Inisialisasi Firebase Auth & Database (Compat)
let dbRealtime = null;
let dbFirestore = null;
let auth = null;

try {
    firebase.initializeApp(firebaseConfig);
    dbRealtime = firebase.database();
    dbFirestore = firebase.firestore();
    auth = firebase.auth();
    console.log("Firebase & Auth berhasil terhubung!");
} catch (e) {
    console.error("Gagal menginisialisasi Firebase:", e);
}

// --- AUTHENTICATION & ROLE MANAGEMENT ---

function loginUser() {
    const emailInput = document.getElementById("userEmailInput").value.trim().toLowerCase();
    const passwordInput = document.getElementById("userPasswordInput").value.trim();
    const selectedRole = document.getElementById("loginRoleSelect").value;

    if (!emailInput || !passwordInput) {
        return alert("Silahkan masukkan Email dan Password!");
    }

    // Pengecekan khusus untuk Owner Utama (firman@ramenhouse.com)
    if (emailInput === "firman@ramenhouse.com" || emailInput === "nfouyeigp9py2usxuuqn3llgzui2") {
        if (passwordInput === "firman123@") {
            currentUser = {
                uid: "NfOuYEiGp9Py2uSxuuqN3llGZUI2",
                role: "admin",
                nama: "firman",
                email: "firman@ramenhouse.com"
            };
            saveSessionAndProceed();
            return;
        } else {
            return alert("Password salah! Silahkan periksa kembali password Anda.");
        }
    }

    // Login via Firebase Authentication untuk akun lainnya
    if (auth) {
        auth.signInWithEmailAndPassword(emailInput, passwordInput)
            .then((userCredential) => {
                const user = userCredential.user;
                currentUser = {
                    uid: user.uid,
                    role: selectedRole,
                    nama: user.email.split('@')[0],
                    email: user.email
                };
                saveSessionAndProceed();
            })
            .catch((error) => {
                console.error("Login Error:", error);
                alert("Gagal Login: Email atau Password tidak ditemukan.");
            });
    } else {
        alert("Firebase Auth belum siap.");
    }
}
    // Bypass khusus untuk Owner Utama Anda (firman@ramenhouse.com / UID NfOuYEiGp9Py2uSxuuqN3llGZUI2)
    if (emailInput === "firman@ramenhouse.com" || emailInput === "NfOuYEiGp9Py2uSxuuqN3llGZUI2") {
        currentUser = {
            uid: "NfOuYEiGp9Py2uSxuuqN3llGZUI2",
            role: "admin",
            nama: "firman",
            email: "firman@ramenhouse.com"
        };
        saveSessionAndProceed();
        return;
    }

    // Login menggunakan Firebase Authentication untuk akun lainnya
    if (auth) {
        auth.signInWithEmailAndPassword(emailInput, passwordInput)
            .then((userCredential) => {
                const user = userCredential.user;
                currentUser = {
                    uid: user.uid,
                    role: selectedRole,
                    nama: user.email.split('@')[0],
                    email: user.email
                };
                saveSessionAndProceed();
            })
            .catch((error) => {
                console.error("Login Error:", error);
                alert("Gagal Login: " + error.message);
            });
    } else {
        alert("Firebase Auth belum siap.");
    }
}
// Global Application State
let currentUser = null; 
let transactions = [];
let currentShiftCash = 0;
let googleSheetsWebhookUrl = localStorage.getItem("mang_emos_gsheet_url") || "";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadLocalData();
    checkSavedSession();
});

// --- AUTHENTICATION & ROLE MANAGEMENT ---

function loginUser() {
    const inputVal = document.getElementById("userUidInput").value.trim();
    if (!inputVal) return alert("Silahkan masukkan UID atau Email!");

    // Auto-detect untuk UID / Email Owner Utama[cite: 1]
    if (inputVal === "NfOuYEiGp9Py2uSxuuqN3llGZUI2" || inputVal.toLowerCase() === "firman@ramenhouse.com") {
        currentUser = {
            uid: "NfOuYEiGp9Py2uSxuuqN3llGZUI2",
            role: "admin",
            nama: "firman",
            email: "firman@ramenhouse.com"
        };
        saveSessionAndProceed();
        return;
    }

    // Pengecekan via Realtime Database Firebase jika bukan owner utama[cite: 1]
    if (dbRealtime) {
        dbRealtime.ref("users/" + inputVal).once("value").then((snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                currentUser = {
                    uid: inputVal,
                    role: userData.role || "kasir",
                    nama: userData.nama || "User",
                    email: userData.email || ""
                };
                saveSessionAndProceed();
            } else {
                // Login Kasir Publik Fallback
                currentUser = {
                    uid: inputVal,
                    role: "kasir",
                    nama: inputVal,
                    email: ""
                };
                saveSessionAndProceed();
            }
        }).catch((err) => {
            console.warn("Gagal terhubung ke Firebase, menggunakan sesi lokal:", err);
            currentUser = { uid: inputVal, role: "kasir", nama: inputVal, email: "" };
            saveSessionAndProceed();
        });
    } else {
        currentUser = { uid: inputVal, role: "kasir", nama: inputVal, email: "" };
        saveSessionAndProceed();
    }
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
        const uid = prompt("Masukkan Passcode / UID Admin:");
        if (uid === "NfOuYEiGp9Py2uSxuuqN3llGZUI2" || uid === "firman@ramenhouse.com") {[cite: 1]
            currentUser.role = "admin";
        } else {
            return alert("Akses Admin Ditolak!");
        }
    }
    setupRoleUI();
}

function setupRoleUI() {
    document.getElementById("userInfo").innerText = `Role: ${currentUser.role.toUpperCase()} (${currentUser.nama})`;
    
    const adminToolBar = document.getElementById("adminToolBar");
    const expenseSection = document.getElementById("expenseAdminSection");
    const addUserSection = document.getElementById("addUserAdminSection");

    if (currentUser.role === "admin") {
        adminToolBar.classList.remove("hidden");
        expenseSection.classList.remove("hidden");
        addUserSection.classList.remove("hidden");
    } else {
        adminToolBar.classList.add("hidden");
        expenseSection.classList.add("hidden");
        addUserSection.classList.add("hidden");
    }
    renderDashboard();
}

// --- DATA TRANSAKSI & REALTIME SYNC ---

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
        user: currentUser.nama
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
        user: currentUser.nama
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

    sendToGoogleSheets(item);
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

// --- CLOSING SHIFT & CASH VARIANCE ---

function calculateCashVariance() {
    const physicalInput = parseFloat(document.getElementById("physicalCashInput").value) || 0;
    const variance = physicalInput - currentShiftCash;
    
    const resultBox = document.getElementById("varianceResultBox");
    const statusText = document.getElementById("varianceStatusText");
    const amountText = document.getElementById("varianceAmountText");

    resultBox.classList.remove("hidden", "bg-green-100", "bg-red-100", "bg-yellow-100");

    if (variance === 0) {
        resultBox.classList.add("bg-green-100");
        statusText.innerText = "PAS (Sesuai)";
        statusText.className = "text-green-700 font-bold";
        amountText.innerText = "Tidak ada selisih di laci.";
    } else if (variance < 0) {
        resultBox.classList.add("bg-red-100");
        statusText.innerText = "MINUS (Kurang)";
        statusText.className = "text-red-700 font-bold";
        amountText.innerText = `Kasir kekurangan: Rp ${Math.abs(variance).toLocaleString('id-ID')}`;
    } else {
        resultBox.classList.add("bg-yellow-100");
        statusText.innerText = "SURPLUS (Lebih)";
        statusText.className = "text-yellow-800 font-bold";
        amountText.innerText = `Kelebihan fisik laci: Rp ${variance.toLocaleString('id-ID')}`;
    }
}

function processClosingShift() {
    const physicalInput = document.getElementById("physicalCashInput").value;
    if (physicalInput === "") return alert("Harap input fisik uang tunai di laci!");

    const physical = parseFloat(physicalInput);
    const variance = physical - currentShiftCash;

    const logAudit = {
        id: "AUDIT-" + Date.now(),
        type: "closing",
        category: "Closing Shift",
        method: "Audit Laci",
        amount: physical,
        note: `Audit Kas Laci. System: Rp ${currentShiftCash.toLocaleString()}, Fisik: Rp ${physical.toLocaleString()}, Variance: Rp ${variance.toLocaleString()}`,
        timestamp: new Date().toISOString(),
        user: currentUser.nama
    };

    currentShiftCash = 0; 
    document.getElementById("physicalCashInput").value = "";
    document.getElementById("varianceResultBox").classList.add("hidden");

    saveTransaction(logAudit);
    alert("Closing Shift Berhasil! Kas laci dikembalikan ke Rp 0.");
}

// --- AI VOICE INPUT (WEB SPEECH API) ---

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return alert("Browser Anda tidak mendukung Web Speech API!");
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    const statusSpan = document.getElementById("voiceStatus");
    statusSpan.innerText = "Mendengarkan...";

    recognition.start();

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        statusSpan.innerText = `Terdeteksi: "${transcript}"`;
        parseVoiceCommand(transcript);
    };

    recognition.onerror = function() {
        statusSpan.innerText = "Gagal mendengarkan. Coba lagi.";
    };
}

function parseVoiceCommand(text) {
    const numberMatch = text.match(/\d+/g);
    let amount = 0;
    
    if (numberMatch) {
        amount = parseInt(numberMatch.join(''));
    }

    if (amount > 0) {
        document.getElementById("expAmount").value = amount;
        document.getElementById("expNote").value = text;
        alert(`AI Suara Terdeteksi!\nNominal: Rp ${amount}\nKeterangan: ${text}\n\nSilahkan cek & klik Simpan Pengeluaran.`);
    } else {
        alert("Sistem tidak menemukan angka nominal pada perintah suara: " + text);
    }
}

// --- GOOGLE SHEETS DUAL-SYNC ---

function openGoogleSheetsPrompt() {
    const url = prompt("Masukkan Google Apps Script Webhook URL Anda:", googleSheetsWebhookUrl);
    if (url !== null) {
        googleSheetsWebhookUrl = url;
        localStorage.setItem("mang_emos_gsheet_url", url);
        alert("URL Webhook Google Sheets berhasil disimpan!");
    }
}

function sendToGoogleSheets(payload) {
    if (!googleSheetsWebhookUrl) return;
    fetch(googleSheetsWebhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Gagal kirim ke Google Sheets:", err));
}

// --- ADD KASIR USER TO FIREBASE REALTIME DB ---

function handleAddUser(e) {
    e.preventDefault();
    const uid = document.getElementById("newUserId").value.trim();
    const nama = document.getElementById("newUserName").value.trim();
    const email = document.getElementById("newUserEmail").value.trim();

    if (dbRealtime) {
        dbRealtime.ref("users/" + uid).set({
            nama: nama,
            email: email,
            role: "kasir"
        }).then(() => {
            alert(`Akun Kasir ${nama} berhasil ditambahkan!`);
            e.target.reset();
        });
    }
}

// --- DASHBOARD RENDER & REPORT FILTERING ---

function filterDataByPeriod(data) {
    const period = document.getElementById("filterPeriod").value;
    const now = new Date();

    return data.filter(item => {
        const tDate = new Date(item.timestamp);
        if (period === "daily") {
            return tDate.toDateString() === now.toDateString();
        } else if (period === "weekly") {
            const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            return tDate >= firstDayOfWeek;
        } else if (period === "monthly") {
            return tDate.getMonth() === new Date().getMonth() && tDate.getFullYear() === new Date().getFullYear();
        } else if (period === "yearly") {
            return tDate.getFullYear() === new Date().getFullYear();
        }
        return true;
    });
}

function renderDashboard() {
    document.getElementById("systemCashDisplay").innerText = `Rp ${currentShiftCash.toLocaleString('id-ID')}`;

    const filtered = filterDataByPeriod(transactions);
    document.getElementById("dataCount").innerText = `${filtered.length} Data Terrekam`;

    let cashIncome = 0;
    let nonCashIncome = 0;
    let totalExpense = 0;

    const tbody = document.getElementById("transactionTableBody");
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

    const netProfit = (cashIncome + nonCashIncome) - totalExpense;

    document.getElementById("cardCashIncome").innerText = `Rp ${cashIncome.toLocaleString('id-ID')}`;
    document.getElementById("cardNonCashIncome").innerText = `Rp ${nonCashIncome.toLocaleString('id-ID')}`;
    document.getElementById("cardExpense").innerText = `Rp ${totalExpense.toLocaleString('id-ID')}`;
    document.getElementById("cardNetProfit").innerText = `Rp ${netProfit.toLocaleString('id-ID')}`;
}

// --- EXPORT TO EXCEL & PDF ---

function exportToExcel() {
    const dataToExport = filterDataByPeriod(transactions).map(t => ({
        Waktu: new Date(t.timestamp).toLocaleString('id-ID'),
        Tipe: t.type,
        Kategori: t.category,
        Metode: t.method,
        Nominal: t.amount,
        Keterangan: t.note,
        Operator: t.user
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `Laporan_Mang_Emos_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("MANG EMOS FINANCE - LAPORAN KEUANGAN", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    const rows = filterDataByPeriod(transactions).map(t => [
        new Date(t.timestamp).toLocaleDateString('id-ID'),
        t.category,
        t.method,
        `Rp ${t.amount.toLocaleString('id-ID')}`,
        t.note
    ]);

    doc.autoTable({
        head: [['Tanggal', 'Kategori', 'Metode', 'Nominal', 'Keterangan']],
        body: rows,
        startY: 28,
    });

    doc.save(`Laporan_Mang_Emos_${new Date().toISOString().slice(0,10)}.pdf`);
}
