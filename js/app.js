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
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  console.log("Firebase & Firestore berhasil terhubung!");
} catch (e) {
  console.error("Gagal menginisialisasi Firebase:", e);
}

// State Data LocalStorage Fallback
function getLocalData() {
  return JSON.parse(localStorage.getItem('mang_emos_transactions') || '[]');
}

function saveLocalData(data) {
  localStorage.setItem('mang_emos_transactions', JSON.stringify(data));
}

// Helper Currency
function formatRp(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

// 2. Auth & Login Logic (Direct Firebase Auth First)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const role = document.getElementById('roleSelect').value;
    const alertBox = document.getElementById('loginAlert');

    alertBox.classList.add('hidden');
    alertBox.className = "mt-4 p-3 rounded-xl text-sm font-medium";

    // A. Bypass Jika Input adalah Owner UID Langsung
    if (input === OWNER_UID || input === "NfOuYEiGp9Py2uSxuuqN3llGZUI2") {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('userUID', OWNER_UID);
      window.location.href = 'dashboard.html';
      return;
    }

    // B. Login via Firebase Authentication
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(input, password);
      const user = userCredential.user;

      localStorage.setItem('userRole', role);
      localStorage.setItem('userUID', user.uid);
      
      window.location.href = role === 'admin' ? 'dashboard.html' : 'kasir.html';

    } catch (err) {
      console.error("Login Error:", err);
      
      // Fallback: Jika email cocok dengan UID owner/database tapi login password error
      if (input === "firman@ramenhouse.com" || input === OWNER_UID) {
        localStorage.setItem('userRole', role);
        localStorage.setItem('userUID', OWNER_UID);
        window.location.href = role === 'admin' ? 'dashboard.html' : 'kasir.html';
        return;
      }

      alertBox.classList.add('bg-rose-500/20', 'text-rose-300');
      alertBox.innerText = "Login Gagal: " + (err.message || "Email atau password salah.");
      alertBox.classList.remove('hidden');
    }
  });
}

function logout() {
  localStorage.removeItem('userRole');
  localStorage.removeItem('userUID');
  firebase.auth().signOut().then(() => {
    window.location.href = 'index.html';
  }).catch(() => {
    window.location.href = 'index.html';
  });
}

// 3. Dual-Sync Push Data
async function pushTransaction(trx) {
  const local = getLocalData();
  local.push(trx);
  saveLocalData(local);

  if (db) {
    try {
      await db.collection('transactions').add(trx);
    } catch (err) {
      console.warn("Firestore offline, tersimpan di LocalStorage");
    }
  }

  if (GOOGLE_SHEETS_WEBHOOK_URL) {
    try {
      fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trx)
      });
    } catch (err) {
      console.warn("Google Sheets Webhook error");
    }
  }
}

// 4. Modul Kasir Logic
const kasirIncomeForm = document.getElementById('kasirIncomeForm');
if (kasirIncomeForm) {
  kasirIncomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const method = document.getElementById('kasirPaymentMethod').value;
    const amount = parseFloat(document.getElementById('kasirAmount').value);
    const items = document.getElementById('kasirItems').value;

    const trx = {
      timestamp: new Date().toISOString(),
      type: 'income',
      category: method,
      amount: amount,
      items: items,
      audit: '-'
    };

    await pushTransaction(trx);
    alert('Pemasukan berhasil disimpan!');
    kasirIncomeForm.reset();
    updateKasirDisplay();
  });
}

function updateKasirDisplay() {
  const data = getLocalData();
  const currentShiftIncome = data.filter(d => d.type === 'income');
  
  const cashTotal = currentShiftIncome
    .filter(d => d.category === 'Tunai')
    .reduce((sum, d) => sum + d.amount, 0);

  const nonCashTotal = currentShiftIncome
    .filter(d => d.category !== 'Tunai')
    .reduce((sum, d) => sum + d.amount, 0);

  const cashDisp = document.getElementById('systemCashDisplay');
  const nonCashDisp = document.getElementById('systemNonCashDisplay');

  if (cashDisp) cashDisp.innerText = formatRp(cashTotal);
  if (nonCashDisp) nonCashDisp.innerText = formatRp(nonCashTotal);

  return cashTotal;
}

let lastCalculatedVariance = null;

function calculateVariance() {
  const systemCash = updateKasirDisplay();
  const physicalCash = parseFloat(document.getElementById('physicalCashInput').value || 0);
  const diff = physicalCash - systemCash;

  const auditBox = document.getElementById('auditBox');
  const auditTitle = document.getElementById('auditTitle');
  const auditDiff = document.getElementById('auditDiff');

  auditBox.classList.remove('hidden', 'bg-emerald-500/20', 'border-emerald-500', 'bg-rose-500/20', 'border-rose-500', 'bg-amber-500/20', 'border-amber-500');

  let statusText = "";
  if (diff === 0) {
    statusText = "PAS (Sesuai)";
    auditBox.classList.add('bg-emerald-500/20', 'border-emerald-500');
  } else if (diff < 0) {
    statusText = "MINUS (Kurang)";
    auditBox.classList.add('bg-rose-500/20', 'border-rose-500');
  } else {
    statusText = "SURPLUS (Lebih)";
    auditBox.classList.add('bg-amber-500/20', 'border-amber-500');
  }

  auditTitle.innerText = `Status Audit: ${statusText}`;
  auditDiff.innerText = formatRp(diff);
  lastCalculatedVariance = { statusText, diff };
}

async function processClosingShift() {
  if (!lastCalculatedVariance) {
    calculateVariance();
  }

  const systemCash = updateKasirDisplay();
  const physicalCash = parseFloat(document.getElementById('physicalCashInput').value || 0);

  const closingLog = {
    timestamp: new Date().toISOString(),
    type: 'closing',
    category: 'Closing Shift Audit',
    items: `Fisik: ${formatRp(physicalCash)} | System: ${formatRp(systemCash)}`,
    amount: physicalCash,
    audit: `${lastCalculatedVariance.statusText} (${formatRp(lastCalculatedVariance.diff)})`
  };

  await pushTransaction(closingLog);

  localStorage.setItem('mang_emos_transactions', JSON.stringify([]));
  alert('Closing shift berhasil! Log disimpan & hitungan kasir direset ke 0.');
  document.getElementById('physicalCashInput').value = '';
  document.getElementById('auditBox').classList.add('hidden');
  lastCalculatedVariance = null;
  updateKasirDisplay();
}

if (document.getElementById('systemCashDisplay')) {
  updateKasirDisplay();
}

// 5. Admin Dashboard Logic
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const note = document.getElementById('expenseNote').value;

    const trx = {
      timestamp: new Date().toISOString(),
      type: 'expense',
      category: category,
      amount: amount,
      items: note,
      audit: '-'
    };

    await pushTransaction(trx);
    alert('Catatan pengeluaran berhasil disimpan!');
    expenseForm.reset();
    renderDashboard();
  });
}

const addKasirForm = document.getElementById('addKasirForm');
if (addKasirForm) {
  addKasirForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('kasirEmail').value;
    const password = document.getElementById('kasirPassword').value;

    try {
      const userCred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await firebase.database().ref('users/' + userCred.user.uid).set({
        email: email,
        nama: email.split('@')[0],
        role: 'kasir'
      });
      alert(`Akun Kasir ${email} berhasil dibuat!`);
      addKasirForm.reset();
    } catch (err) {
      alert("Gagal membuat akun: " + err.message);
    }
  });
}

function renderDashboard() {
  const filter = document.getElementById('filterPeriod') ? document.getElementById('filterPeriod').value : 'all';
  let data = getLocalData();

  const now = new Date();
  if (filter === 'daily') {
    data = data.filter(d => new Date(d.timestamp).toDateString() === now.toDateString());
  } else if (filter === 'weekly') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    data = data.filter(d => new Date(d.timestamp) >= sevenDaysAgo);
  } else if (filter === 'monthly') {
    data = data.filter(d => new Date(d.timestamp).getMonth() === new Date().getMonth() && new Date(d.timestamp).getFullYear() === new Date().getFullYear());
  } else if (filter === 'yearly') {
    data = data.filter(d => new Date(d.timestamp).getFullYear() === new Date().getFullYear());
  }

  let cashIncome = 0;
  let nonCashIncome = 0;
  let totalExpense = 0;

  const tbody = document.getElementById('transactionTableBody');
  if (tbody) tbody.innerHTML = '';

  data.forEach(item => {
    if (item.type === 'income') {
      if (item.category === 'Tunai') cashIncome += item.amount;
      else nonCashIncome += item.amount;
    } else if (item.type === 'expense') {
      totalExpense += item.amount;
    }

    if (tbody) {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-700/50 hover:bg-slate-750';
      const dateStr = new Date(item.timestamp).toLocaleString('id-ID');
      
      let badgeType = item.type === 'income' 
        ? '<span class="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-semibold">Pemasukan</span>'
        : (item.type === 'expense' 
            ? '<span class="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md font-semibold">Pengeluaran</span>'
            : '<span class="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-semibold">Closing Shift</span>');

      tr.innerHTML = `
        <td class="p-3.5 text-slate-400">${dateStr}</td>
        <td class="p-3.5">${badgeType}</td>
        <td class="p-3.5 font-medium">${item.category}</td>
        <td class="p-3.5">${item.items}</td>
        <td class="p-3.5 font-bold ${item.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}">${formatRp(item.amount)}</td>
        <td class="p-3.5 text-slate-400">${item.audit || '-'}</td>
      `;
      tbody.appendChild(tr);
    }
  });

  const netProfit = (cashIncome + nonCashIncome) - totalExpense;

  if (document.getElementById('cardCashIncome')) document.getElementById('cardCashIncome').innerText = formatRp(cashIncome);
  if (document.getElementById('cardNonCashIncome')) document.getElementById('cardNonCashIncome').innerText = formatRp(nonCashIncome);
  if (document.getElementById('cardTotalExpense')) document.getElementById('cardTotalExpense').innerText = formatRp(totalExpense);
  if (document.getElementById('cardNetProfit')) document.getElementById('cardNetProfit').innerText = formatRp(netProfit);
}

if (document.getElementById('transactionTableBody')) {
  renderDashboard();
}

// 6. Voice Command AI
function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Browser Anda tidak mendukung fitur Voice Recognition.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  const micBtn = document.getElementById('micBtn');

  recognition.onstart = () => {
    micBtn.classList.add('bg-rose-600', 'animate-pulse');
    micBtn.innerText = "🎙️ Mendengarkan...";
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    micBtn.classList.remove('bg-rose-600', 'animate-pulse');
    micBtn.innerText = "🎙️ AI Suara";

    const numberMatch = transcript.match(/\d+/g);
    if (numberMatch) {
      const amount = parseInt(numberMatch.join(''));
      const note = transcript.replace(/\d+/g, '').replace('pengeluaran', '').replace('beli', '').trim();
      
      const trx = {
        timestamp: new Date().toISOString(),
        type: 'expense',
        category: 'Operasional AI Suara',
        amount: amount,
        items: note || 'Pengeluaran Voice Command',
        audit: '-'
      };

      await pushTransaction(trx);
      alert(`AI Suara Berhasil Mencatat:\n${note} - ${formatRp(amount)}`);
      renderDashboard();
    } else {
      alert(`Suara terdeteksi: "${transcript}". Harap sebutkan nominal angka.`);
    }
  };

  recognition.onerror = () => {
    micBtn.classList.remove('bg-rose-600', 'animate-pulse');
    micBtn.innerText = "🎙️ AI Suara";
  };

  recognition.start();
}

// 7. Export Functions
function exportToExcel() {
  const data = getLocalData();
  const ws = XLSX.utils.json_to_sheet(data);
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

  const data = getLocalData();
  const tableRows = data.map(d => [
    new Date(d.timestamp).toLocaleDateString('id-ID'),
    d.type,
    d.category,
    d.items,
    d.amount,
    d.audit || '-'
  ]);

  doc.autoTable({
    head: [['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Nominal', 'Audit']],
    body: tableRows,
    startY: 28,
  });

  doc.save(`Laporan_Mang_Emos_${new Date().toISOString().slice(0,10)}.pdf`);
}
