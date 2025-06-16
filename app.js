<<<<<<< HEAD
// Inisialisasi Supabase
const SUPABASE_URL = 'https://uorlbeapdkgrnxvttbus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmxiZWFwZGtncm54dnR0YnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzNjUsImV4cCI6MjA2NTQ4MjM2NX0.NftY81NHUzY6HO4ZwkX1EiTPz2sHLqBnXe5Q3RjSe8o'; // GANTI jika perlu
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tampilkan stok dan isi dropdown produk
async function tampilkanStok() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return alert("Gagal memuat data produk");

  const tbody = document.getElementById('daftarStok');
  const select = document.getElementById('produkSelect');
  tbody.innerHTML = '';
  select.innerHTML = '';

  data.forEach(produk => {
    // Tabel stok
    tbody.innerHTML += `
      <tr>
        <td>${produk.nama}</td>
        <td>${produk.kode}</td>
        <td>${produk.jumlah}</td>
        <td>Rp ${produk.harga.toLocaleString()}</td>
        <td>
          <button onclick="editBarang('${produk.id}', '${produk.nama}', '${produk.kode}', ${produk.jumlah}, ${produk.harga})">Edit</button>
          <button onclick="hapusBarang('${produk.id}')">Hapus</button>
        </td>
      </tr>
    `;

    // Dropdown penjualan
    select.innerHTML += `<option value="${produk.id}|${produk.jumlah}|${produk.harga}">${produk.nama}</option>`;
  });
}

// Simpan barang baru atau edit barang
document.getElementById('form-barang').addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const nama = document.getElementById('namaBarang').value.trim();
  const kode = document.getElementById('kodeBarang').value.trim();
  const jumlah = parseInt(document.getElementById('jumlahBarang').value);
  const harga = parseInt(document.getElementById('hargaBarang').value);

  if (!nama || !kode || isNaN(jumlah) || isNaN(harga)) return alert("Mohon isi semua data dengan benar");

  if (id) {
    // Edit barang
    const { error } = await supabase.from('products').update({ nama, kode, jumlah, harga }).eq('id', id);
    if (error) return alert("Gagal memperbarui barang");
    alert("Barang berhasil diperbarui");
  } else {
    // Tambah barang baru
    const { error } = await supabase.from('products').insert([{ nama, kode, jumlah, harga }]);
    if (error) return alert("Gagal menambahkan barang");
    alert("Barang berhasil ditambahkan");
  }

  e.target.reset();
  document.getElementById('editId').value = '';
  tampilkanStok();
});

// Isi form edit
function editBarang(id, nama, kode, jumlah, harga) {
  document.getElementById('editId').value = id;
  document.getElementById('namaBarang').value = nama;
  document.getElementById('kodeBarang').value = kode;
  document.getElementById('jumlahBarang').value = jumlah;
  document.getElementById('hargaBarang').value = harga;
}

// Hapus barang
async function hapusBarang(id) {
  if (!confirm("Yakin ingin menghapus barang ini?")) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return alert("Gagal menghapus barang");
  alert("Barang berhasil dihapus");
  tampilkanStok();
}

// Simpan transaksi penjualan
document.getElementById('form-jual').addEventListener('submit', async function (e) {
  e.preventDefault();

  const value = document.getElementById('produkSelect').value;
  const jumlahBeli = parseInt(document.getElementById('jumlahBeli').value);
  const [id, stok, harga] = value.split('|');
  const sisa = parseInt(stok) - jumlahBeli;

  if (jumlahBeli > parseInt(stok)) return alert("Stok tidak cukup");

  const total = jumlahBeli * parseInt(harga);

  const { error: errSale } = await supabase.from('sales').insert([
    { product_id: id, jumlah: jumlahBeli, harga: parseInt(harga), total }
  ]);

  if (errSale) return alert("Gagal menyimpan penjualan");

  const { error: errUpdate } = await supabase.from('products').update({ jumlah: sisa }).eq('id', id);
  if (errUpdate) return alert("Gagal memperbarui stok");

  alert("Penjualan berhasil disimpan");
  this.reset();
  tampilkanStok();
});

// Jalankan saat halaman pertama kali dibuka
tampilkanStok();
=======
// Inisialisasi Supabase
const SUPABASE_URL = 'https://uorlbeapdkgrnxvttbus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmxiZWFwZGtncm54dnR0YnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzNjUsImV4cCI6MjA2NTQ4MjM2NX0.NftY81NHUzY6HO4ZwkX1EiTPz2sHLqBnXe5Q3RjSe8o'; // GANTI jika perlu
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Tampilkan stok dan isi dropdown produk
async function tampilkanStok() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return alert("Gagal memuat data produk");

  const tbody = document.getElementById('daftarStok');
  const select = document.getElementById('produkSelect');
  tbody.innerHTML = '';
  select.innerHTML = '';

  data.forEach(produk => {
    // Tabel stok
    tbody.innerHTML += `
      <tr>
        <td>${produk.nama}</td>
        <td>${produk.kode}</td>
        <td>${produk.jumlah}</td>
        <td>Rp ${produk.harga.toLocaleString()}</td>
        <td>
          <button onclick="editBarang('${produk.id}', '${produk.nama}', '${produk.kode}', ${produk.jumlah}, ${produk.harga})">Edit</button>
          <button onclick="hapusBarang('${produk.id}')">Hapus</button>
        </td>
      </tr>
    `;

    // Dropdown penjualan
    select.innerHTML += `<option value="${produk.id}|${produk.jumlah}|${produk.harga}">${produk.nama}</option>`;
  });
}

// Simpan barang baru atau edit barang
document.getElementById('form-barang').addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const nama = document.getElementById('namaBarang').value.trim();
  const kode = document.getElementById('kodeBarang').value.trim();
  const jumlah = parseInt(document.getElementById('jumlahBarang').value);
  const harga = parseInt(document.getElementById('hargaBarang').value);

  if (!nama || !kode || isNaN(jumlah) || isNaN(harga)) return alert("Mohon isi semua data dengan benar");

  if (id) {
    // Edit barang
    const { error } = await supabase.from('products').update({ nama, kode, jumlah, harga }).eq('id', id);
    if (error) return alert("Gagal memperbarui barang");
    alert("Barang berhasil diperbarui");
  } else {
    // Tambah barang baru
    const { error } = await supabase.from('products').insert([{ nama, kode, jumlah, harga }]);
    if (error) return alert("Gagal menambahkan barang");
    alert("Barang berhasil ditambahkan");
  }

  e.target.reset();
  document.getElementById('editId').value = '';
  tampilkanStok();
});

// Isi form edit
function editBarang(id, nama, kode, jumlah, harga) {
  document.getElementById('editId').value = id;
  document.getElementById('namaBarang').value = nama;
  document.getElementById('kodeBarang').value = kode;
  document.getElementById('jumlahBarang').value = jumlah;
  document.getElementById('hargaBarang').value = harga;
}

// Hapus barang
async function hapusBarang(id) {
  if (!confirm("Yakin ingin menghapus barang ini?")) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return alert("Gagal menghapus barang");
  alert("Barang berhasil dihapus");
  tampilkanStok();
}

// Simpan transaksi penjualan
document.getElementById('form-jual').addEventListener('submit', async function (e) {
  e.preventDefault();

  const value = document.getElementById('produkSelect').value;
  const jumlahBeli = parseInt(document.getElementById('jumlahBeli').value);
  const [id, stok, harga] = value.split('|');
  const sisa = parseInt(stok) - jumlahBeli;

  if (jumlahBeli > parseInt(stok)) return alert("Stok tidak cukup");

  const total = jumlahBeli * parseInt(harga);

  const { error: errSale } = await supabase.from('sales').insert([
    { product_id: id, jumlah: jumlahBeli, harga: parseInt(harga), total }
  ]);

  if (errSale) return alert("Gagal menyimpan penjualan");

  const { error: errUpdate } = await supabase.from('products').update({ jumlah: sisa }).eq('id', id);
  if (errUpdate) return alert("Gagal memperbarui stok");

  alert("Penjualan berhasil disimpan");
  this.reset();
  tampilkanStok();
});

// Jalankan saat halaman pertama kali dibuka
tampilkanStok();
>>>>>>> 8f4107d1b0dc03969aeccf7835603f4f68b2b9e1
