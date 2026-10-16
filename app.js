// State Aplikasi & Mock Data Awal
let currentUserRole = 'admin'; // 'admin' atau 'cashier'
let openingCash = 500000;

let transactions = [
    { id: 1, date: '2026-10-16', type: 'income', category: 'Penjualan Dine-in', note: 'Penjualan siang rame', payment: 'Cash', amount: 850000 },
    { id: 2, date: '2026-10-16', type: 'income', category: 'Online Order (Gofood)', note: 'Orderan #102', payment: 'QRIS', amount: 320000 },
    { id: 3, date: '2026-10-16', type: 'expense', category: 'Bahan Baku (COGS)', note: 'Beli daging sapi & kaldu 5kg', payment: 'Cash', amount: 450000 },
    { id: 4, date: '2026-10-16', type: 'expense', category: 'Operasional', note: 'Token Listrik & Gas', payment: 'Transfer', amount: 200000 }
];

let inventory = [
    { id: 1, name: 'Mi Ramen Fresh', qty: 25, unit: 'pack', status: 'Aman' },
    { id: 2, name: 'Daging Sapi Slice', qty: 8, unit: 'kg', status: 'Aman' },
    { id: 3, name: 'Kaldu Ayam Konsentrat', qty: 12, unit: 'liter', status: 'Aman' },
    { id: 4, name: 'Minyak Bawang Ramen', qty: 3, unit: 'liter', status: 'Perhatian' }
];

let pendingAIDraft = null;

// Inisialisasi saat load
window.onload = function() {
    updateCategoryOptions();
    renderTransactions();
    renderInventory();
    updateDashboard();
};

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
}

// Update Kategori Berdasarkan Jenis Transaksi Restoran
function updateCategoryOptions() {
    const type = document.getElementById('txType').value;
    const catSelect = document.getElementById('txCategory');
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

// Simpan Transaksi
function saveTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('txType').value;
    const category = document.getElementById('txCategory').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const payment = document.getElementById('txPayment').value;
    const note = document.getElementById('txNote').value;

    const newTx = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type,
        category,
        amount,
        payment,
        note
    };

    transactions.unshift(newTx);
    renderTransactions();
    updateDashboard();
    document.getElementById('transactionForm').reset();
    alert("Transaksi berhasil disimpan!");
}

// Render Tabel Transaksi
function renderTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';

    transactions.forEach(tx => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tx.date}</td>
            <td><span style="color: ${tx.type === 'income' ? '#27ae60' : '#c0392b'}; font-weight:600;">${tx.type.toUpperCase()}</span></td>
            <td>${tx.category}</td>
            <td>${tx.note}</td>
            <td>${tx.payment}</td>
            <td>Rp ${tx.amount.toLocaleString('id-ID')}</td>
            <td>${currentUserRole === 'admin' ? `<button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="deleteTransaction(${tx.id})">Hapus</button>` : '<span style="color:#888; font-size:0.8rem;">No Access</span>'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Hapus Transaksi (Hanya Admin)
function deleteTransaction(id) {
    if (currentUserRole !== 'admin') {
        alert("Akses ditolak! Hanya Admin (Mang Emong) yang dapat menghapus transaksi.");
        return;
    }
    if (confirm("Yakin ingin menghapus transaksi ini?")) {
        transactions = transactions.filter(t => t.id !== id);
        renderTransactions();
        updateDashboard();
    }
}

// Dashboard & Kalkulasi Keuangan
function updateDashboard() {
    let totalInc = 0;
    let totalExp = 0;
    let cashSales = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') {
            totalInc += tx.amount;
            if (tx.payment === 'Cash') {
                cashSales += tx.amount;
            }
        } else {
            totalExp += tx.amount;
        }
    });

    let net = totalInc - totalExp;
    let currentDrawer = openingCash + cashSales;

    document.getElementById('totalIncome').textContent = 'Rp ' + totalInc.toLocaleString('id-ID');
    document.getElementById('totalExpense').textContent = 'Rp ' + totalExp.toLocaleString('id-ID');
    document.getElementById('netProfit').textContent = 'Rp ' + net.toLocaleString('id-ID');
    document.getElementById('drawerCash').textContent = 'Rp ' + currentDrawer.toLocaleString('id-ID');
    document.getElementById('shiftCashSales').textContent = 'Rp ' + cashSales.toLocaleString('id-ID');
}

// Manajemen Stok
function saveInventory(e) {
    e.preventDefault();
    const name = document.getElementById('invName').value;
    const qty = parseInt(document.getElementById('invQty').value);
    const unit = document.getElementById('invUnit').value;
    const status = qty > 5 ? 'Aman' : 'Perhatian';

    inventory.push({ id: Date.now(), name, qty, unit, status });
    renderInventory();
    document.getElementById('inventoryForm').reset();
    alert("Stok berhasil diperbarui!");
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    inventory.forEach(item => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>${item.unit}</td>
            <td><span style="color: ${item.status === 'Aman' ? '#27ae60' : '#e67e22'}; font-weight:600;">${item.status}</span></td>
            <td><button class="btn btn-primary" style="padding:4px 8px; font-size:0.8rem;" onclick="restockItem(${item.id})">+ Tambah Stok</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function restockItem(id) {
    let add = prompt("Masukkan jumlah penambahan stok:", "5");
    if (add) {
        let item = inventory.find(i => i.id === id);
        if (item) {
            item.qty += parseInt(add);
            item.status = item.qty > 5 ? 'Aman' : 'Perhatian';
            renderInventory();
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

    // Simulasi parsing AI sederhana
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
    if (pendingAIDraft) {
        transactions.unshift({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            ...pendingAIDraft
        });
        renderTransactions();
        updateDashboard();
        closeAIModal();
        document.getElementById('voiceInputText').value = '';
        alert("Data AI berhasil dikonfirmasi dan disimpan!");
    }
}

function closeAIModal() {
    document.getElementById('aiModal').style.display = 'none';
}

// Shift Modal
function openShiftModal() {
    document.getElementById('shiftModal').style.display = 'flex';
}
function closeShiftModal() {
    document.getElementById('shiftModal').style.display = 'none';
}
function saveShiftClosing() {
    openingCash = parseFloat(document.getElementById('modalOpeningCash').value);
    document.getElementById('openingCashDisplay').textContent = 'Rp ' + openingCash.toLocaleString('id-ID');
    closeShiftModal();
    updateDashboard();
    alert("Closing shift berhasil disimpan!");
}

// Firebase Config Save
function saveFirebaseConfig(e) {
    e.preventDefault();
    alert("Konfigurasi API Key Firebase berhasil disimpan! (Sinkronisasi Cloud siap dijalankan)");
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
        doc.text(t.date, 14, y);
        doc.text(t.type.toUpperCase(), 50, y);
        doc.text(t.category.substring(0, 25), 80, y);
        doc.text("Rp " + t.amount.toLocaleString('id-ID'), 160, y);
        y += 8;
        if (y > 280) { doc.addPage(); y = 20; }
    });
    
    doc.save("Laporan_Keuangan_Mang_Emong.pdf");
}
