let openingCash = 0;
let transactions = [];

window.onload = function() {
    fetchDataFromFirebase();
    initRupiahInputs();
};

function formatRupiahInput(input) {
    let value = input.value.replace(/[^,\d]/g, '').toString();
    let split = value.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    input.value = rupiah;
}

function initRupiahInputs() {
    const numberInputs = document.querySelectorAll('input#txAmount, input#modalPhysicalCash');
    numberInputs.forEach(input => {
        input.setAttribute('type', 'text');
        input.setAttribute('inputmode', 'numeric');
        input.addEventListener('input', function() {
            formatRupiahInput(this);
        });
    });
}

function cleanNumber(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/\./g, '').replace(/,/g, '.')) || 0;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

function fetchDataFromFirebase() {
    if (typeof db === 'undefined' || !db) {
        console.warn("Firestore belum terhubung.");
        return;
    }

    // 1. Ambil Uang Modal Laci
    db.collection("settings").doc("shiftConfig").onSnapshot((doc) => {
        if (doc.exists && doc.data().openingCash !== undefined) {
            openingCash = Number(doc.data().openingCash) || 0;
        } else {
            openingCash = 0;
        }
        updateDashboard();
    });

    // 2. Ambil Data Penjualan
    db.collection("transactions").orderBy("date", "desc").onSnapshot((snapshot) => {
        transactions = [];
        snapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        renderTransactions();
        updateDashboard();
    });
}

function saveTransaction(e) {
    e.preventDefault();
    const category = document.getElementById('txCategory').value;
    const amount = cleanNumber(document.getElementById('txAmount').value);
    const payment = document.getElementById('txPayment').value;
    const note = document.getElementById('txNote').value;

    const newTx = {
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category,
        amount,
        payment,
        note,
        createdBy: 'Kasir Staf',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (typeof db !== 'undefined' && db) {
        db.collection("transactions").add(newTx)
          .then(() => {
              document.getElementById('transactionForm').reset();
              alert("Penjualan berhasil disimpan!");
          })
          .catch((error) => {
              console.error("Gagal menyimpan: ", error);
          });
    }
}

function renderTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0];

    transactions.forEach(tx => {
        if (tx.date === todayStr && tx.type === 'income') {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${tx.date}</td>
                <td>${tx.category}</td>
                <td>${tx.note || '-'}</td>
                <td>${tx.payment}</td>
                <td>Rp ${Number(tx.amount).toLocaleString('id-ID')}</td>
            `;
            tbody.appendChild(tr);
        }
    });
}

function updateDashboard() {
    let totalInc = 0;
    let cashSales = 0;
    let bankSales = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    transactions.forEach(tx => {
        if (tx.date === todayStr && tx.type === 'income') {
            let amt = Number(tx.amount) || 0;
            totalInc += amt;
            if (tx.payment === 'Cash') {
                cashSales += amt;
            } else {
                bankSales += amt;
            }
        }
    });

    let totalUangLaci = cashSales + openingCash; // Pendapatan Tunai + Uang Modal Kembalian Laci

    const elInc = document.getElementById('totalIncome');
    const elModalLaci = document.getElementById('modalLaciDisplay');
    const elTotalLaci = document.getElementById('totalLaciKeseluruhan');

    const elShiftCash = document.getElementById('shiftCashSales');
    const elShiftBank = document.getElementById('shiftBankSales');
    const elShiftTotal = document.getElementById('shiftTotalSales');

    if (elInc) elInc.textContent = 'Rp ' + totalInc.toLocaleString('id-ID');
    if (elModalLaci) elModalLaci.textContent = 'Rp ' + openingCash.toLocaleString('id-ID');
    if (elTotalLaci) elTotalLaci.textContent = 'Rp ' + totalUangLaci.toLocaleString('id-ID');

    if (elShiftCash) elShiftCash.textContent = 'Rp ' + cashSales.toLocaleString('id-ID');
    if (elShiftBank) elShiftBank.textContent = 'Rp ' + bankSales.toLocaleString('id-ID');
    if (elShiftTotal) elShiftTotal.textContent = 'Rp ' + (totalInc).toLocaleString('id-ID');

    const modalBankSummary = document.getElementById('modalBankSummary');
    if (modalBankSummary) modalBankSummary.textContent = 'Rp ' + bankSales.toLocaleString('id-ID');
}

function openShiftModal() {
    document.getElementById('shiftModal').style.display = 'flex';
}

function closeShiftModal() {
    document.getElementById('shiftModal').style.display = 'none';
}

function saveShiftClosing() {
    const physicalCash = cleanNumber(document.getElementById('modalPhysicalCash').value);
    
    let cashSales = 0;
    let bankSales = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    transactions.forEach(tx => {
        if (tx.date === todayStr && tx.type === 'income') {
            let amt = Number(tx.amount) || 0;
            if (tx.payment === 'Cash') cashSales += amt;
            else bankSales += amt;
        }
    });

    const systemCashDrawer = openingCash + cashSales;
    const totalSemuaKeuangan = physicalCash + bankSales;

    const shiftClosingData = {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        tanggal: new Date().toLocaleDateString('id-ID'),
        jam: new Date().toLocaleTimeString('id-ID'),
        kasir: 'Staf Kasir',
        penjualanTunaiSistem: cashSales,
        penjualanBank: bankSales,
        uangFisikLaci: physicalCash,
        selisihKas: physicalCash - systemCashDrawer,
        totalAkumulasiSemua: totalSemuaKeuangan,
        status: 'Closed'
    };

    if (typeof db !== 'undefined' && db) {
        db.collection("shift_closings").add(shiftClosingData)
          .then(() => {
              alert("Closing Shift Berhasil!\nData tersimpan ke database.");
              closeShiftModal();
              document.getElementById('modalPhysicalCash').value = '';
              updateDashboard();
          })
          .catch((error) => {
              console.error("Gagal simpan closing: ", error);
          });
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}
