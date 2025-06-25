// Inisialisasi Supabase
const SUPABASE_URL = 'https://uorlbeapdkgrnxvttbus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // dipotong untuk ringkas
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi tampilkan stok (juga isi dropdown jika ada)
async function tampilkanStok() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return alert("Gagal memuat data produk");

  const tbody = document.getElementById('daftarStok');
  const select = document.getElementById('produkSelect');

  if (tbody) tbody.innerHTML = '';
  if (select) select.innerHTML = '';

  data.forEach(produk => {
    // Tabel stok
    if (tbody) {
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
    }

    // Dropdown penjualan
    if (select) {
      select.innerHTML += `<option value="${produk.id}|${produk.jumlah}|${produk.harga}">${produk.nama}</option>`;
    }
  });
}

// Form barang (tambah/edit)
const formBarang = document.getElementById('form-barang');
if (formBarang) {
  formBarang.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const nama = document.getElementById('namaBarang').value.trim();
    const kode = document.getElementById('kodeBarang').value.trim();
    const jumlah = parseInt(document.getElementById('jumlahBarang').value);
    const harga = parseInt(document.getElementById('hargaBarang').value);

    if (!nama || !kode || isNaN(jumlah) || isNaN(harga)) return alert("Mohon isi semua data dengan benar");

    if (id) {
      const { error } = await supabase.from('products').update({ nama, kode, jumlah, harga }).eq('id', id);
      if (error) return alert("Gagal memperbarui barang");
      alert("Barang berhasil diperbarui");
    } else {
      const { error } = await supabase.from('products').insert([{ nama, kode, jumlah, harga }]);
      if (error) return alert("Gagal menambahkan barang");
      alert("Barang berhasil ditambahkan");
    }

    this.reset();
    document.getElementById('editId').value = '';
    tampilkanStok();
  });
}

// Fungsi edit barang
function editBarang(id, nama, kode, jumlah, harga) {
  if (!document.getElementById('editId')) return;
  document.getElementById('editId').value = id;
  document.getElementById('namaBarang').value = nama;
  document.getElementById('kodeBarang').value = kode;
  document.getElementById('jumlahBarang').value = jumlah;
  document.getElementById('hargaBarang').value = harga;
}

// Fungsi hapus barang
async function hapusBarang(id) {
  if (!confirm("Yakin ingin menghapus barang ini?")) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return alert("Gagal menghapus barang");
  alert("Barang berhasil dihapus");
  tampilkanStok();
}

// Form penjualan
const formJual = document.getElementById('form-jual');
if (formJual) {
  formJual.addEventListener('submit', async function (e) {
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
}

// Jalankan tampilkan stok jika ada elemen yang memerlukan
if (document.getElementById('daftarStok') || document.getElementById('produkSelect')) {
  tampilkanStok();
}