// === KONFIGURASI SUPABASE ===
const SUPABASE_URL = 'https://uorlbeapdkgrnxvttbus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmxiZWFwZGtncm54dnR0YnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzNjUsImV4cCI6MjA2NTQ4MjM2NX0.NftY81NHUzY6HO4ZwkX1EiTPz2sHLqBnXe5Q3RjSe8o';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let semuaProduk = [];
let keranjang = [];
let transaksiTerakhir = null;

// === LOAD PRODUK ===
async function loadProduk() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    alert("❌ Gagal memuat produk!");
    console.error(error);
    return;
  }
  semuaProduk = data;
  tampilkanDropdown(data);
}

function tampilkanDropdown(data) {
  const select = document.getElementById('produkSelect');
  select.innerHTML = data.map(p => `<option value="${p.id}">${p.nama} (${p.kode})</option>`).join('');
}

// === CARI PRODUK ===
document.getElementById('cariProduk').addEventListener('input', function () {
  const keyword = this.value.toLowerCase();
  const hasil = semuaProduk.filter(p =>
    p.nama.toLowerCase().includes(keyword) || p.kode.toLowerCase().includes(keyword)
  );
  tampilkanDropdown(hasil);
});

// === TOMBOL TAMBAH KE KERANJANG ===
document.getElementById('btnTambah').addEventListener('click', () => {
  const idProduk = document.getElementById('produkSelect').value;
  const jumlah = parseInt(document.getElementById('jumlahBeli').value);
  const produk = semuaProduk.find(p => p.id == idProduk);

  if (!produk || isNaN(jumlah) || jumlah <= 0) {
    alert("❗ Mohon pilih produk dan isi jumlah yang benar.");
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
      <span>${item.nama} — ${item.jumlah} × Rp${item.harga.toLocaleString()} = Rp${item.total.toLocaleString()}</span>
      <button class="btn-hapus" onclick="hapusItem(${index})">Hapus</button>
    `;
    ul.appendChild(li);
  });
}

function hapusItem(index) {
  keranjang.splice(index, 1);
  tampilkanKeranjang();
}

// === SIMPAN SEMUA PENJUALAN ===
document.getElementById('btnSimpan').addEventListener('click', async () => {
  if (keranjang.length === 0) {
    alert("❗ Keranjang kosong!");
    return;
  }

  const tanggal = new Date().toISOString();
  const dataPenjualan = keranjang.map(item => ({
    product_id: item.id,
    jumlah: item.jumlah,
    harga: item.harga,
    total: item.total,
    tanggal
  }));

  const { error: insertError } = await supabase.from('sales').insert(dataPenjualan);
  if (insertError) {
    alert("❌ Gagal menyimpan penjualan!");
    console.error(insertError);
    return;
  }

  for (const item of keranjang) {
    const produkAsli = semuaProduk.find(p => p.id === item.id);
    if (!produkAsli) continue;

    const stokBaru = produkAsli.jumlah - item.jumlah;

    const { error: updateError } = await supabase
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
  loadProduk();
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
        <title></title>
        <style>
          body {
            font-family: monospace;
            font-size: 11px;
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          .struk {
            padding: 10px;
          }
          .struk h2 {
            text-align: center;
            margin: 0 0 4px;
          }
          .struk p {
            margin: 2px 0;
          }
          .info-waktu p {
            margin: 1px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .total {
            border-top: 1px dashed #000;
            margin-top: 6px;
            padding-top: 4px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
          }
          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .center {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="struk">
          <h2>Toko Berkat Bersaudara</h2>
          <p class="center">Jl. Kampung Melayu Darat No 34 RT 8</p>
          <p class="center">Banjarmasin</p>
          <hr/>
          <div class="info-waktu">
            <p><strong>Hari</strong>    : ${hari}</p>
            <p><strong>Jam</strong>     : ${jam}</p>
            <p><strong>Tanggal</strong>: ${tanggalLengkap}</p>
          </div>
          <hr/>
          ${items.map(item => `
            <div class="item">
              <span>${item.nama}</span>
              <span>${item.jumlah} x Rp${item.harga.toLocaleString()} = Rp${item.total.toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="total">
            <span>Total</span>
            <span>Rp ${totalSemua.toLocaleString()}</span>
          </div>
          <hr/>
          <p class="center">Terima kasih 🙏</p>
        </div>
      </body>
    </html>
  `);
  strukWindow.document.close();
  strukWindow.print();
});

// === TAMPILKAN WAKTU REALTIME DI HEADER ===
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