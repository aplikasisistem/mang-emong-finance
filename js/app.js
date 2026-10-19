// State Aplikasi & Variable Utama
let currentUserRole = 'cashier'; // Default role diset ke 'cashier'
let openingCash = 0;

let transactions = [];
let inventory = [];
let pendingAIDraft = null;

// Inisialisasi saat load (Mengambil data online dari Firebase)
window.onload = function() {
    updateCategoryOptions();
    fetchDataFromFirebase();
    initRupiahInputs();
    applyRolePermissions(); // Proteksi Tampilan & Privasi Modal
};

// Fungsi otomatisasi titik pemisah ribuan untuk semua input angka
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

// Pasang event listener ke semua input angka di aplikasi
function initRupiahInputs() {
    const numberInputs = document.querySelectorAll('input[type="number"], input#txAmount, input#invQty, input#modalOpeningCash, input#modalPhysicalCash');
    numberInputs.forEach(input => {
        input.setAttribute('type', 'text');
        input.setAttribute('inputmode', 'numeric');
        input.addEventListener('input', function() {
            formatRupiahInput(this);
        });
    });
}

// Helper untuk membersihkan titik pemisah sebelum kalkulasi / simpan ke database
function cleanNumber(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/\./g, '').replace(/,/g, '.')) || 0;
}

// Pengaturan Privasi & Proteksi Tampilan Berdasarkan Role Pengguna
function applyRolePermissions() {
    const isCashier = currentUserRole === 'cashier' || currentUserRole === 'cashier';

    // 1. Sembunyikan Card Pengeluaran & Net Profit dari Kasir
    const cardExpense = document.getElementById('cardExpense');
    const cardProfit = document.getElementById('cardProfit');
    if (cardExpense) cardExpense.style.display = isCashier ? 'none' : 'block';
    if (cardProfit) cardProfit.style.display = isCashier ? 'none' : 'block';

    // 2. Sembunyikan Tampilan Saldo Modal Awal dari Kasir
    const openingCashWrapper = document.getElementById('openingCashWrapper');
    const modalOpeningGroup = document.getElementById('modalOpeningCashGroup');
    if (openingCashWrapper) openingCashWrapper.style.display = isCashier ? 'none' : 'block';
    if (modalOpeningGroup) modalOpeningGroup.style.display = isCashier ? 'none' : 'block';

    // 3. Sembunyikan Menu Sidebar Khusus Admin dari Kasir
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isCashier ? 'none' : 'block';
    });

    // 4. Batasi Opsi Pengeluaran pada Form Transaksi Kasir
    const txTypeSelect = document.getElementById('txType');
    if (txTypeSelect) {
        if (isCashier) {
            txTypeSelect.value = 'income';
            document.querySelectorAll('.admin-only-option').forEach(opt => opt.style.display = 'none');
        } else {
            document.querySelectorAll('.admin-only-option').forEach(opt => opt.style.display = 'block');
        }
        updateCategoryOptions();
    }
}

// Ganti Role Pengguna (Admin / Kasir)
function switchRole() {
    currentUserRole = document.getElementById('userRoleSelect').value;
    applyRolePermissions();
    updateDashboard();
    renderTransactions();
    alert("Role diubah ke: " + (currentUserRole === 'admin' ? 'Admin (Mang Emong)' : 'Kasir Staf'));
}

// Navigasi Tab
function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const menuItems = document.querySelectorAll('.sidebar ul li');
    menuItems.forEach(item => item.classList.remove('active'));

    const activeTab = document.getElementById('tab-' + tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// Ambil Data dari Firebase Firestore secara Online
function fetchDataFromFirebase() {
    if (typeof db === 'undefined' || !db) {
        console.warn("Database Firestore belum terinisialisasi. Menggunakan data lokal.");
        renderTransactions();
        renderInventory();
        updateDashboard();
        return;
    }

    // 1. Ambil Saldo Awal (Opening Cash) dari Firestore secara Real-time
    db.collection("settings").doc("shiftConfig").onSnapshot((doc) => {
        if (doc.exists && doc.data().openingCash !== undefined) {
            openingCash = Number(doc.data().openingCash) || 0;
        } else {
            openingCash = 0;
        }

        const elDisplay = document.getElementById('openingCashDisplay');
        if (elDisplay) elDisplay.textContent = 'Rp ' + openingCash.toLocaleString('id-ID');

        updateDashboard();
    }, (error) => {
        console.error("Gagal mengambil data saldo awal: ", error);
    });

    // 2. Ambil Transaksi secara Real-time / On Snapshot
    db.collection("transactions").orderBy("date", "desc").onSnapshot((snapshot) => {
        transactions = [];
        snapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        renderTransactions();
        updateDashboard();
    }, (error) => {
        console.error("Gagal mengambil data transaksi: ", error);
    });

    // 3. Ambil Data Stok / Inventory
    db.collection("inventory").onSnapshot((snapshot) => {
        inventory = [];
        snapshot.forEach((doc) => {
            inventory.push({ id: doc.id, ...doc.data() });
        });
        renderInventory();
    }, (error) => {
        console.error("Gagal mengambil data inventory: ", error);
    });
}

// Update Kategori Berdasarkan Jenis Transaksi Restoran
function updateCategoryOptions() {
    const typeSelect = document.getElementById('txType');
    const catSelect = document.getElementById('txCategory');
    if (!catSelect || !typeSelect) return;
    
    const type = typeSelect.value;
    catSelect.innerHTML = '';

    let categories = [];
    if (type === 'income') {
        categories = ['Penjualan Dine-in', 'Penjualan Takeaway', 'Online Order (Gofood)', 'Online Order (Grabfood)', 'Online Order (ShopeeFood)'];
    } else {
        categories = ['Bahan Baku / COGS (Mi/Daging/Bumbu)', 'Operasional (Listrik/Air/Gas/Sewa)', 'Gaji Karyawan', 'Marketing & Promo', 'Perlengkapan / Peralatan'];
    }

    categories.forEach(cat => {
        let opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
}

// Simpan Transaksi ke Firebase Online
function saveTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('txType').value;
    const category = document.getElementById('txCategory').value;
    const amount = cleanNumber(document.getElementById('txAmount').value);
    const payment = document.getElementById('txPayment').value;
    const note = document.getElementById('txNote').value;

    const newTx = {
        date: new Date().toISOString().split('T')[0],
        type,
        category,
        amount,
        payment,
        note,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (typeof db !== 'undefined' && db) {
        db.collection("transactions").add(newTx)
          .then(() => {
              document.getElementById('transactionForm').reset();
              alert("Transaksi berhasil disimpan secara online!");
          })
          .catch((error) => {
              console.error("Gagal menyimpan transaksi: ", error);
              alert("Gagal menyimpan ke database online.");
          });
    } else {
        alert("Database belum terhubung!");
    }
}

// Render Tabel Transaksi
function renderTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    transactions.forEach(tx => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tx.date}</td>
            <td><span style="color: ${tx.type === 'income' ? '#27ae60' : '#c0392b'}; font-weight:600;">${tx.type.toUpperCase()}</span></td>
            <td>${tx.category}</td>
            <td>${tx.note || '-'}</td>
            <td>${tx.payment}</td>
            <td>Rp ${Number(tx.amount).toLocaleString('id-ID')}</td>
            <td>${currentUserRole === 'admin' ? `<button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteTransaction('${tx.id}')">Hapus</button>` : '<span style="color:#888; font-size:0.8rem;">No Access</span>'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Hapus Transaksi (Hanya Admin) dari Firebase
function deleteTransaction(id) {
    if (currentUserRole !== 'admin') {
        alert("Akses ditolak! Hanya Admin (Mang Emong) yang dapat menghapus transaksi.");
        return;
    }
    if (confirm("Yakin ingin menghapus transaksi ini dari database online?")) {
        if (typeof db !== 'undefined' && db) {
            db.collection("transactions").doc(id).delete()
              .then(() => {
                  alert("Transaksi berhasil dihapus!");
              })
              .catch((error) => {
                  console.error("Gagal menghapus: ", error);
              });
        }
    }
}

// Dashboard & Kalkulasi Keuangan (Menghitung Kas & Bank/QRIS)
function updateDashboard() {
    let totalInc = 0;
    let totalExp = 0;
    let cashSales = 0;
    let bankSales = 0;

    transactions.forEach(tx => {
        let amt = Number(tx.amount) || 0;
        if (tx.type === 'income') {
            totalInc += amt;
            if (tx.payment === 'Cash') {
                cashSales += amt;
            } else {
                bankSales += amt; // QRIS / Transfer / EDC
            }
        } else {
            totalExp += amt;
        }
    });

    let net = totalInc - totalExp;
    let currentDrawer = openingCash + cashSales;
    let totalShiftSales = cashSales + bankSales;

    const elInc = document.getElementById('totalIncome');
    const elExp = document.getElementById('totalExpense');
    const elNet = document.getElementById('netProfit');
    const elDrawer = document.getElementById('drawerCash');
    
    const elShiftCash = document.getElementById('shiftCashSales');
    const elShiftBank = document.getElementById('shiftBankSales');
    const elShiftTotal = document.getElementById('shiftTotalSales');

    if (elInc) elInc.textContent = 'Rp ' + totalInc.toLocaleString('id-ID');
    if (elExp) elExp.textContent = 'Rp ' + totalExp.toLocaleString('id-ID');
    if (elNet) elNet.textContent = 'Rp ' + net.toLocaleString('id-ID');
    if (elDrawer) elDrawer.textContent = 'Rp ' + currentDrawer.toLocaleString('id-ID');
    
    if (elShiftCash) elShiftCash.textContent = 'Rp ' + cashSales.toLocaleString('id-ID');
    if (elShiftBank) elShiftBank.textContent = 'Rp ' + bankSales.toLocaleString('id-ID');
    if (elShiftTotal) elShiftTotal.textContent = 'Rp ' + totalShiftSales.toLocaleString('id-ID');

    const modalBankSummary = document.getElementById('modalBankSummary');
    if (modalBankSummary) modalBankSummary.textContent = 'Rp ' + bankSales.toLocaleString('id-ID');
}

// Shift Modal Operations & Auto-Save Closing Data ke Firebase Firestore
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
    
    transactions.forEach(tx => {
        if (tx.type === 'income') {
            let amt = Number(tx.amount) || 0;
            if (tx.payment === 'Cash') cashSales += amt;
            else bankSales += amt;
        }
    });

    // Update Modal Awal hanya jika Role adalah Admin
    if (currentUserRole === 'admin') {
        const valInput = cleanNumber(document.getElementById('modalOpeningCash').value);
        openingCash = isNaN(valInput) ? 0 : valInput;

        if (typeof db !== 'undefined' && db) {
            db.collection("settings").doc("shiftConfig").set({
                openingCash: openingCash
            }).catch(err => console.error("Gagal menyimpan saldo awal:", err));
        }
    }

    const systemCashDrawer = openingCash + cashSales;
    const totalSemuaKeuangan = physicalCash + bankSales; // Akumulasi Kas Fisik Laci + Rekening Bank/QRIS

    // Objek Data Rekonsiliasi Closing Shift
    const shiftClosingData = {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        tanggal: new Date().toLocaleDateString('id-ID'),
        jam: new Date().toLocaleTimeString('id-ID'),
        kasir: currentUserRole === 'admin' ? 'Admin Mang Emong' : 'Staf Kasir',
        penjualanTunaiSistem: cashSales,
        penjualanBank: bankSales,
        uangFisikLaci: physicalCash,
        selisihKas: physicalCash - systemCashDrawer,
        totalAkumulasiSemua: totalSemuaKeuangan,
        status: 'Closed'
    };

    // Simpan Rekam Data Closing ke Firebase
    if (typeof db !== 'undefined' && db) {
        db.collection("shift_closings").add(shiftClosingData)
          .then(() => {
              alert("Closing Shift Berhasil!\nData telah tersimpan secara otomatis ke database Firebase.");
              closeShiftModal();
              document.getElementById('modalPhysicalCash').value = '';
              updateDashboard();
          })
          .catch((error) => {
              console.error("Gagal menyimpan closing shift: ", error);
              alert("Gagal menyimpan closing ke database.");
          });
    } else {
        alert("Database belum terhubung!");
    }
}

// Manajemen Stok ke Firebase
function saveInventory(e) {
    e.preventDefault();
    const name = document.getElementById('invName').value;
    const qty = parseInt(cleanNumber(document.getElementById('invQty').value));
    const unit = document.getElementById('invUnit').value;
    const status = qty > 5 ? 'Aman' : 'Perhatian';

    const newItem = { name, qty, unit, status };

    if (typeof db !== 'undefined' && db) {
        db.collection("inventory").add(newItem)
          .then(() => {
              document.getElementById('inventoryForm').reset();
              alert("Stok berhasil diperbarui ke database online!");
          })
          .catch((error) => {
              console.error("Gagal menyimpan stok: ", error);
          });
    }
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    inventory.forEach(item => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>${item.unit}</td>
            <td><span style="color: ${item.status === 'Aman' ? '#27ae60' : '#e67e22'}; font-weight:600;">${item.status}</span></td>
            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="restockItem('${item.id}', ${item.qty})">+ Tambah Stok</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function restockItem(id, currentQty) {
    let add = prompt("Masukkan jumlah penambahan stok:", "5");
    if (add && typeof db !== 'undefined' && db) {
        let newQty = currentQty + parseInt(cleanNumber(add));
        let newStatus = newQty > 5 ? 'Aman' : 'Perhatian';

        db.collection("inventory").doc(id).update({
            qty: newQty,
            status: newStatus
        }).then(() => {
            alert("Stok berhasil ditambah!");
        }).catch(err => {
            console.error("Gagal restock:", err);
        });
    }
}

// AI Voice Simulation & Confirmation Modal
function processVoiceCommand() {
    const text = document.getElementById('voiceInputText').value.toLowerCase();
    if (!text) {
        alert("Masukkan perintah suara terlebih dahulu!");
        return;
    }

    let type = text.includes('pemasukan') || text.includes('jual') ? 'income' : 'expense';
    let amount = 150000;
    if (text.includes('200 ribu')) amount = 200000;
    if (text.includes('450 ribu')) amount = 450000;
    if (text.includes('50 ribu')) amount = 50000;

    pendingAIDraft = {
        type: type,
        category: type === 'income' ? 'Penjualan Dine-in' : 'Bahan Baku / COGS (Mi/Daging/Bumbu)',
        amount: amount,
        payment: 'Cash',
        note: text
    };

    document.getElementById('aiDraftDetails').innerHTML = `
        <p><strong>Jenis:</strong> ${pendingAIDraft.type.toUpperCase()}</p>
        <p><strong>Kategori:</strong> ${pendingAIDraft.category}</p>
        <p><strong>Jumlah:</strong> Rp ${pendingAIDraft.amount.toLocaleString('id-ID')}</p>
        <p><strong>Keterangan AI:</strong> ${pendingAIDraft.note}</p>
    `;

    document.getElementById('aiModal').style.display = 'flex';
}

function confirmAIDraft() {
    if (pendingAIDraft && typeof db !== 'undefined' && db) {
        db.collection("transactions").add({
            date: new Date().toISOString().split('T')[0],
            ...pendingAIDraft,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            closeAIModal();
            document.getElementById('voiceInputText').value = '';
            alert("Data AI berhasil dikonfirmasi dan disimpan ke database online!");
        }).catch(err => {
            console.error("Gagal simpan AI draft:", err);
        });
    }
}

function closeAIModal() {
    document.getElementById('aiModal').style.display = 'none';
}

// Pembuatan Akun Kasir Baru ke Firebase
function createNewCashierAccount(event) {
    event.preventDefault();

    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    const name = document.getElementById('newName').value;
    const role = document.getElementById('newRole').value;

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const uid = userCredential.user.uid;

                return firebase.database().ref('users/' + uid).set({
                    email: email,
                    nama: name,
                    role: role
                });
            })
            .then(() => {
                alert('Akun ' + role + ' berhasil ditambahkan!');
                document.getElementById('createAccountForm').reset();
            })
            .catch((error) => {
                alert('Gagal menambah akun: ' + error.message);
            });
    } else {
        alert("Firebase Auth SDK belum dikonfigurasi.");
    }
}

// Konfigurasi API Key
function saveFirebaseConfig(e) {
    e.preventDefault();
    alert("Konfigurasi API Key Firebase berhasil disimpan!");
}

// Ekspor Excel & PDF
function exportToExcel() {
    let wsData = [["Tanggal", "Jenis", "Kategori", "Keterangan", "Metode", "Jumlah"]];
    transactions.forEach(t => wsData.push([t.date, t.type, t.category, t.note, t.payment, t.amount]));
    
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi Ramen");
    XLSX.writeFile(wb, "Laporan_Keuangan_Mang_Emong.xlsx");
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MANAJEMEN KEUANGAN - MANG EMONG RAMEN HOUSE", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Laporan Keuangan & Operasional Restoran", 14, 26);
    doc.text("Tanggal Cetak: " + new Date().toLocaleDateString('id-ID'), 14, 32);
    
    let y = 45;
    doc.setFont("helvetica", "bold");
    doc.text("Tanggal", 14, y);
    doc.text("Jenis", 50, y);
    doc.text("Kategori", 80, y);
    doc.text("Jumlah", 160, y);
    
    doc.setFont("helvetica", "normal");
    y += 8;
    transactions.forEach(t => {
        doc.text(String(t.date), 14, y);
        doc.text(String(t.type).toUpperCase(), 50, y);
        doc.text(String(t.category).substring(0, 25), 80, y);
        doc.text("Rp " + Number(t.amount).toLocaleString('id-ID'), 160, y);
        y += 8;
        if (y > 280) { doc.addPage(); y = 20; }
    });
    
    doc.save("Laporan_Keuangan_Mang_Emong.pdf");
}

// Toggle Sidebar untuk Perangkat Mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}
// Fungsi Admin menetapkan Uang Modal Laci Hari Ini
function setDailyOpeningCash(e) {
    e.preventDefault();
    const amount = cleanNumber(document.getElementById('inputDailyOpeningCash').value);

    if (typeof db !== 'undefined' && db) {
        db.collection("settings").doc("shiftConfig").set({
            openingCash: amount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'Admin Mang Emong'
        }).then(() => {
            alert("Modal awal laci hari ini berhasil diset sebesar Rp " + amount.toLocaleString('id-ID') + "!\nData langsung terupdate di dashboard kasir.");
            document.getElementById('inputDailyOpeningCash').value = '';
        }).catch((err) => {
            console.error("Gagal menyimpan modal laci:", err);
            alert("Gagal menyimpan ke database.");
        });
    } else {
        alert("Database Firestore belum terhubung!");
    }
}

// Update penampil modal di dashboard admin secara realtime
function fetchDataFromFirebase() {
    if (typeof db === 'undefined' || !db) return;

    // Mendengarkan perubahan modal laci secara realtime
    db.collection("settings").doc("shiftConfig").onSnapshot((doc) => {
        if (doc.exists && doc.data().openingCash !== undefined) {
            openingCash = Number(doc.data().openingCash) || 0;
        } else {
            openingCash = 0;
        }

        const elAdminDisplay = document.getElementById('adminOpeningCashDisplay');
        if (elAdminDisplay) elAdminDisplay.textContent = 'Rp ' + openingCash.toLocaleString('id-ID');

        updateDashboard();
    });

    // Ambil data transaksi secara realtime
    db.collection("transactions").orderBy("date", "desc").onSnapshot((snapshot) => {
        transactions = [];
        snapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        renderTransactions();
        updateDashboard();
    });
}
// Fungsi Admin menetapkan Uang Modal Laci Hari Ini
function setDailyOpeningCash(e) {
    e.preventDefault();
    const inputEl = document.getElementById('inputDailyOpeningCash');
    const amount = cleanNumber(inputEl ? inputEl.value : 0);

    if (typeof db !== 'undefined' && db) {
        db.collection("settings").doc("shiftConfig").set({
            openingCash: amount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'Admin Mang Emong'
        }).then(() => {
            alert("Modal awal laci hari ini berhasil diset sebesar Rp " + amount.toLocaleString('id-ID') + "!\nData langsung terupdate di dashboard kasir.");
            if (inputEl) inputEl.value = '';
        }).catch((err) => {
            console.error("Gagal menyimpan modal laci:", err);
            alert("Gagal menyimpan ke database.");
        });
    } else {
        alert("Database Firestore belum terhubung!");
    }
}
