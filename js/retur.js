// js/retur.js (SIMPLE - tanpa PIN / modal)
const db = window.db;

let semuaTransaksi = [];

/* ===== LOAD SALES ===== */
async function loadTransaksi() {
  if (!db) {
    alert("Koneksi database belum siap (cek lib/supabase.js).");
    return;
  }

  const { data, error } = await db
    .from("sales")
    .select(
      `
      id,
      jumlah,
      total,
      tanggal,
      product_id (
        id,
        nama
      )
    `
    )
    .order("tanggal", { ascending: false });

  if (error) {
    console.error("Load retur error:", error);
    alert("Gagal memuat transaksi (cek console).");
    return;
  }

  semuaTransaksi = data || [];
  renderTabel(semuaTransaksi);
}

/* ===== RENDER TABLE ===== */
function renderTabel(data) {
  const tbody = document.getElementById("daftarRetur");
  tbody.innerHTML = "";

  if (!data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (item) => `
    <tr>
      <td>${new Date(item.tanggal).toLocaleDateString("id-ID")}</td>
      <td>${item.product_id?.nama || "-"}</td>
      <td>${item.jumlah}</td>
      <td>Rp ${(item.total || 0).toLocaleString("id-ID")}</td>
      <td>
        <button type="button"
          data-id="${item.id}"
          data-produk="${item.product_id?.id || ""}"
          data-jumlah="${item.jumlah}">
          Retur
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

/* ===== PROSES RETUR (balikin stok + hapus row sales) ===== */
async function prosesRetur(salesId, jumlah, productId) {
  if (!salesId || !productId) {
    alert("Data transaksi tidak lengkap.");
    return;
  }

  if (!confirm("Yakin ingin melakukan retur transaksi ini?")) return;

  try {
    const qty = Number(jumlah || 0);

    // 1) ambil stok terbaru
    const { data: produk, error: e1 } = await db
      .from("products")
      .select("jumlah")
      .eq("id", productId)
      .single();

    if (e1 || !produk) {
      console.error(e1);
      alert("Produk tidak ditemukan.");
      return;
    }

    // 2) update stok (balikin)
    const stokBaru = Number(produk.jumlah || 0) + qty;
    const { error: e2 } = await db
      .from("products")
      .update({ jumlah: stokBaru })
      .eq("id", productId);

    if (e2) {
      console.error(e2);
      alert("Gagal update stok.");
      return;
    }

    // 3) hapus transaksi sales (simple dulu)
    const { error: e3 } = await db.from("sales").delete().eq("id", salesId);
    if (e3) {
      console.error(e3);
      alert("Gagal hapus transaksi sales.");
      return;
    }

    alert("✅ Retur berhasil");
    loadTransaksi();
  } catch (err) {
    console.error(err);
    alert("❌ Retur gagal (cek console).");
  }
}

/* ===== EVENTS ===== */
document.getElementById("daftarRetur").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;

  prosesRetur(btn.dataset.id, btn.dataset.jumlah, btn.dataset.produk);
});

document.getElementById("cariTransaksi").addEventListener("input", function () {
  const k = (this.value || "").toLowerCase();
  const hasil = semuaTransaksi.filter((t) =>
    (t.product_id?.nama || "").toLowerCase().includes(k)
  );
  renderTabel(hasil);
});

/* ===== INIT ===== */
loadTransaksi();