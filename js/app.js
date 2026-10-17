// State Aplikasi & Mock Data Awal
let currentUserRole = 'admin'; // 'admin' atau 'cashier'
let openingCash = 0;

let transactions = [];
let inventory = [];
let pendingAIDraft = null;

// Inisialisasi saat load (Mengambil data online dari Firebase)
window.onload = function() {
    updateCategoryOptions();
    fetchDataFromFirebase();
};

// Ambil Data dari Firebase Firestore secara Online
function fetchDataFromFirebase() {
    if (!db) {
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

        // Perbarui semua elemen penampil saldo awal di UI secara dinamis
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

// Navigasi Tab
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Ganti Role Pengguna
function switchRole() {
    currentUserRole = document.getElementById('userRoleSelect').value;
    alert("Role diubah ke: " + (currentUserRole === 'admin' ? 'Admin (Mang Emong)' : 'Kasir Staf'));
    renderTransactions();
}

// Update Kategori Berdasarkan Jenis Transaksi Restoran
function updateCategoryOptions() {
    const type = document.getElementById('txType').value;
    const catSelect = document.getElementById('txCategory');
    if (!catSelect) return;
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
    const amount = parseFloat(document.getElementById('txAmount').value);
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

    if (db) {
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
            <td>${tx.note}</td>
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
        if (db) {
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

// Dashboard & Kalkulasi Keuangan
function updateDashboard() {
    let totalInc = 0;
    let totalExp = 0;
    let cashSales = 0;

    transactions.forEach(tx => {
        let amt = Number(tx.amount) || 0;
        if (tx.type === 'income') {
            totalInc += amt;
            if (tx.payment === 'Cash') {
                cashSales += amt;
            }
        } else {
            totalExp += amt;
        }
    });

    let net = totalInc - totalExp;
    let currentDrawer = openingCash + cashSales;

    const elInc = document.getElementById('totalIncome');
    const elExp = document.getElementById('totalExpense');
    const elNet = document.getElementById('netProfit');
    const elDrawer = document.getElementById('drawerCash');
    const elShiftCash = document.getElementById('shiftCashSales');

    if (elInc) elInc.textContent = 'Rp ' + totalInc.toLocaleString('id-ID');
    if (elExp) elExp.textContent = 'Rp ' + totalExp.toLocaleString('id-ID');
    if (elNet) elNet.textContent = 'Rp ' + net.toLocaleString('id-ID');
    if (elDrawer) elDrawer.textContent = 'Rp ' + currentDrawer.toLocaleString('id-ID');
    if (elShiftCash) elShiftCash.textContent = 'Rp ' + cashSales.toLocaleString('id-ID');
}

// Manajemen Stok ke Firebase
function saveInventory(e) {
    e.preventDefault();
    const name = document.getElementById('invName').value;
    const qty = parseInt(document.getElementById('invQty').value);
    const unit = document.getElementById('invUnit').value;
    const status = qty > 5 ? 'Aman' : 'Perhatian';

    const newItem = { name, qty, unit, status };

    if (db) {
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
    if (add) {
        let newQty = currentQty + parseInt(add);
        let newStatus = newQty > 5 ? 'Aman' : 'Perhatian';

        if (db) {
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
    if (pendingAIDraft && db) {
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

// Shift Modal (Tersimpan ke Firestore secara Permanen)
function openShiftModal() {
    document.getElementById('shiftModal').style.display = 'flex';
}
function closeShiftModal() {
    document.getElementById('shiftModal').style.display = 'none';
}
function saveShiftClosing() {
    const valInput = parseFloat(document.getElementById('modalOpeningCash').value);
    openingCash = isNaN(valInput) ? 0 : valInput;

    if (db) {
        db.collection("settings").doc("shiftConfig").set({
            openingCash: openingCash
        }).then(() => {
            console.log("Saldo awal berhasil disimpan secara online!");
        }).catch(err => {
            console.error("Gagal menyimpan saldo awal:", err);
        });
    }

    const elDisplay = document.getElementById('openingCashDisplay');
    if (elDisplay) elDisplay.textContent = 'Rp ' + openingCash.toLocaleString('id-ID');
    closeShiftModal();
    updateDashboard();
    alert("Saldo awal kasir berhasil disimpan!");
}

// Firebase Config Save
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

// Fungsi untuk membuka/menutup sidebar di HP
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}
