// === SUPABASE ===
const SUPABASE_URL = 'https://uorlbeapdkgrnxvttbus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmxiZWFwZGtncm54dnR0YnVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MDYzNjUsImV4cCI6MjA2NTQ4MjM2NX0.NftY81NHUzY6HO4ZwkX1EiTPz2sHLqBnXe5Q3RjSe8o';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let semuaTransaksi = [];

// === LOAD SALES ===
async function loadTransaksi() {
  const { data, error } = await db
    .from('sales')
    .select(`
      id,
      jumlah,
      total,
      tanggal,
      product_id (
        id,
        nama
      )
    `)
    .order('tanggal', { ascending: false });

  if (error) {
    alert('Gagal memuat transaksi');
    console.error(error);
    return;
  }

  semuaTransaksi = data || [];
  renderTabel(semuaTransaksi);
}

// === RENDER TABLE ===
function renderTabel(data) {
  const tbody = document.getElementById('daftarRetur');
  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${item.product_id?.nama || '-'}</td>
      <td>${item.jumlah}</td>
      <td>Rp ${item.total.toLocaleString('id-ID')}</td>
      <td>
        <button onclick="retur('${item.id}', ${item.jumlah}, '${item.product_id?.id}')">
          Retur
        </button>
      </td>
    </tr>
  `).join('');
}

// === RETUR ===
async function retur(salesId, jumlah, productId) {
  if (!confirm('Yakin ingin melakukan retur transaksi ini?')) return;

  // ambil stok produk
  const { data: produk, error: errProduk } = await db
    .from('products')
    .select('jumlah')
    .eq('id', productId)
    .single();

  if (errProduk || !produk) {
    alert('Produk tidak ditemukan');
    return;
  }

  // update stok (balikin)
  const stokBaru = produk.jumlah + jumlah;
  const { error: errUpdate } = await db
    .from('products')
    .update({ jumlah: stokBaru })
    .eq('id', productId);

  if (errUpdate) {
    alert('Gagal update stok');
    console.error(errUpdate);
    return;
  }

  // hapus sales
  const { error: errDelete } = await db
    .from('sales')
    .delete()
    .eq('id', salesId);

  if (errDelete) {
    alert('Gagal hapus transaksi');
    console.error(errDelete);
    return;
  }

  alert('✅ Retur berhasil');
  loadTransaksi();
}

// === SEARCH ===
document.getElementById('cariTransaksi').addEventListener('input', function () {
  const keyword = this.value.toLowerCase();
  const hasil = semuaTransaksi.filter(item =>
    (item.product_id?.nama || '').toLowerCase().includes(keyword)
  );
  renderTabel(hasil);
});

loadTransaksi();