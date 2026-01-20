// === KONFIGURASI SUPABASE ===
const SUPABASE_URL = 'https://uorlbeapdkgrnxvttbus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmxiZWFwZGtncm54dnR0YnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzNjUsImV4cCI6MjA2NTQ4MjM2NX0.NftY81NHUzY6HO4ZwkX1EiTPz2sHLqBnXe5Q3RjSe8o';

// pakai nama "db" supaya tidak tabrakan dengan global supabase dari CDN
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === KONFIGURASI TOKO ===
const TOKO = {
  nama: "Toko Berkat Bersaudara",
  alamat: "Jl. Kampung Melayu Darat No 34 RT 8",
  kota: "Banjarmasin",
  ucapan: "Terima kasih 🙏"
};

// === VARIABEL GLOBAL ===
let semuaProduk = [];
let keranjang = [];
let transaksiTerakhir = null;

// === HELPER ===
const formatRupiah = (angka) => "Rp " + angka.toLocaleString("id-ID");

// === LOAD PRODUK ===
async function loadProduk() {
  try {
    const { data, error } = await db.from('products').select('*');
    if (error) throw error;
    semuaProduk = data;
    tampilkanDropdown(data);
  } catch (err) {
    alert("❌ Gagal memuat produk!");
    console.error(err);
  }
}

function tampilkanDropdown(data) {
  const select = document.getElementById('produkSelect');
  select.innerHTML = data
    .map(p => `<option value="${p.id}">${p.nama} (${p.kode})</option>`)
    .join('');
}

// === CARI PRODUK ===
document.getElementById('cariProduk').addEventListener('input', function () {
  const keyword = this.value.toLowerCase();
  const hasil = semuaProduk.filter(p =>
    p.nama.toLowerCase().includes(keyword) || p.kode.toLowerCase().includes(keyword)
  );
  tampilkanDropdown(hasil);
});

// === TAMBAH KE KERANJANG ===
document.getElementById('btnTambah').addEventListener('click', () => {
  const idProduk = document.getElementById('produkSelect').value;
  const jumlah = parseInt(document.getElementById('jumlahBeli').value);
  const produk = semuaProduk.find(p => p.id == idProduk);

  if (!produk || isNaN(jumlah) || jumlah <= 0) {
    alert("❗ Pilih produk dan isi jumlah dengan benar.");
    return;
  }
  if (jumlah > produk.jumlah) {
    alert("⚠️ Stok tidak cukup!");
    return;
  }

  const total = produk.harga * jumlah;
  keranjang.push({ ...produk, jumlah, total });
  tampilkanKeranjang();
  document.getElementById('jumlahBeli').value = '';
});

function tampilkanKeranjang() {
  const ul = document.getElementById('daftarKeranjang');
  ul.innerHTML = '';

  keranjang.forEach((item, index) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '4px 0';

    li.innerHTML = `
      <span>${item.nama} — ${item.jumlah} × ${formatRupiah(item.harga)} = ${formatRupiah(item.total)}</span>
      <button class="btn-hapus" onclick="hapusItem(${index})">Hapus</button>
    `;
    ul.appendChild(li);
  });
}

function hapusItem(index) {
  keranjang.splice(index, 1);
  tampilkanKeranjang();
}

// === SIMPAN PENJUALAN ===
document.getElementById('btnSimpan').addEventListener('click', async () => {
  if (keranjang.length === 0) {
    alert("❗ Keranjang kosong!");
    return;
  }

  try {
    const tanggal = new Date().toISOString();
    const dataPenjualan = keranjang.map(item => ({
      product_id: item.id,
      jumlah: item.jumlah,
      harga: item.harga,
      total: item.total,
      tanggal
    }));

    const { error: insertError } = await db.from('sales').insert(dataPenjualan);
    if (insertError) throw insertError;

    // ✅ Update stok dengan stok asli - jumlah terjual
    for (const item of keranjang) {
      const produkAsli = semuaProduk.find(p => p.id === item.id);
      if (!produkAsli) continue;

      const stokBaru = produkAsli.jumlah - item.jumlah;
      const { error: updateError } = await db
        .from('products')
        .update({ jumlah: stokBaru })
        .eq('id', item.id);

      if (updateError) {
        console.warn(`⚠️ Gagal update stok "${item.nama}"`, updateError);
      }
    }

    alert("✅ Transaksi berhasil disimpan!");
    transaksiTerakhir = { items: keranjang, tanggal };
    keranjang = [];
    tampilkanKeranjang();
    document.getElementById('btnPrint').style.display = 'inline-block';
    await loadProduk(); // refresh cache & dropdown
  } catch (err) {
    alert("❌ Gagal menyimpan penjualan!");
    console.error(err);
  }
});

// === CETAK STRUK ===
document.getElementById('btnPrint').addEventListener('click', () => {
  if (!transaksiTerakhir) return;

  const { items, tanggal } = transaksiTerakhir;
  const waktu = new Date(tanggal);
  const hari = waktu.toLocaleDateString('id-ID', { weekday: 'long' });
  const jam = waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tanggalLengkap = waktu.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalSemua = items.reduce((acc, item) => acc + item.total, 0);

  const strukWindow = window.open('', '', 'width=400,height=600');
  strukWindow.document.write(`
    <html>
      <head>
        <title>Struk Penjualan</title>
        <style>
          body {
            font-family: monospace;
            font-size: 11px;
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          .struk { padding: 10px; }
          .struk h2 { text-align: center; margin: 0 0 4px; }
          .struk p { margin: 2px 0; }
          .info-waktu p { margin: 1px 0; }
          .item { display: flex; justify-content: space-between; margin: 2px 0; }
          .total {
            border-top: 1px dashed #000;
            margin-top: 6px;
            padding-top: 4px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
          }
          hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="struk">
          <h2>${TOKO.nama}</h2>
          <p class="center">${TOKO.alamat}</p>
          <p class="center">${TOKO.kota}</p>
          <hr/>
          <div class="info-waktu">
            <p><strong>Hari</strong>    : ${hari}</p>
            <p><strong>Jam</strong>     : ${jam}</p>
            <p><strong>Tanggal</strong> : ${tanggalLengkap}</p>
          </div>
          <hr/>
          ${items.map(item => `
            <div class="item">
              <span>${item.nama}</span>
              <span>${item.jumlah} x ${formatRupiah(item.harga)} = ${formatRupiah(item.total)}</span>
            </div>
          `).join('')}
          <div class="total">
            <span>Total</span>
            <span>${formatRupiah(totalSemua)}</span>
          </div>
          <hr/>
          <p class="center">${TOKO.ucapan}</p>
        </div>
      </body>
    </html>
  `);
  strukWindow.document.close();
  strukWindow.print();
});

// === WAKTU REALTIME DI HEADER ===
function updateWaktu() {
  const waktu = new Date();
  const tanggal = waktu.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const jam = waktu.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  document.getElementById('waktuUpdate').textContent = `${tanggal} • ${jam}`;
}

updateWaktu();
setInterval(updateWaktu, 1000);
loadProduk();
