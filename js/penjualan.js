// js/penjualan.js
// FIXED VERSION (cetak balik jalan)
// - Penjualan + keranjang
// - List penjualan hari ini (group by trx_id kalau ada)
// - Cetak transaksi terakhir + cetak per transaksi

const db = window.db;

/* ===================== ELEMENT ===================== */
const elCari = document.getElementById("cariProduk");
const elSelect = document.getElementById("produkSelect");
const elJumlah = document.getElementById("jumlahBeli");
const elKeranjang = document.getElementById("daftarKeranjang");

const btnTambah = document.getElementById("btnTambah");
const btnSimpan = document.getElementById("btnSimpan");
const btnPrintLast = document.getElementById("btnPrintLast");
const btnRefreshHari = document.getElementById("btnRefreshHari");

const elIsUtang = document.getElementById("isUtang");
const elUtangFields = document.getElementById("utangFields");
const elCustomer = document.getElementById("customerName");
const elNote = document.getElementById("note");

const elLastInfo = document.getElementById("lastTrxInfo");

const elInfoHari = document.getElementById("infoHari");
const elTBodyHari = document.getElementById("tBodyHari");
const elTotalHari = document.getElementById("totalHari");

/* ===================== STATE ===================== */
let allProducts = [];
let cart = [];

/* ===================== UTIL ===================== */
const toRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===================== DATE (WITA) ===================== */
function todayWITA_DateISO() {
  const now = new Date();
  const y = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", year: "numeric" });
  const m = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", month: "2-digit" });
  const d = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", day: "2-digit" });
  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

function timeWITAhhmm(iso) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function shortFromUuid(id) {
  const s = String(id || "").replace(/-/g, "").slice(-6).toUpperCase();
  return s ? `TRX-${s}` : "-";
}

/* ===================== STRUK AREA (AUTO) ===================== */
function ensureAreaStruk() {
  let el = document.getElementById("areaStruk");
  if (el) return el;

  el = document.createElement("div");
  el.id = "areaStruk";
  el.style.display = "none";
  document.body.appendChild(el);
  return el;
}

/* ===================== PRINT ===================== */
function buildStrukHtml(receipt) {
  const dt = receipt.when;

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);

  const jam = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dt);

  const itemsHtml = receipt.items
    .map(
      (it) => `
        <div class="item">
          <div>${escapeHtml(it.nama)} (${escapeHtml(it.kode)})</div>
          <div>${it.jumlah} x ${toRp(it.harga)}</div>
        </div>
        <div class="item" style="justify-content:flex-end;">
          <div style="font-weight:700;">${toRp(it.total)}</div>
        </div>
      `
    )
    .join("");

  const statusLine =
    receipt.payment_status === "unpaid"
      ? `<p class="center" style="margin:6px 0; font-weight:800;">STATUS: UTANG</p>`
      : "";

  return `
    <div class="struk">
      <h2>Toko Berkat Bersaudara</h2>
      <p class="alamat-toko">
    Jl. Kampung Melayu Darat No 34<br>
    Banjarmasin
  </p>
      <div class="info-waktu">
        <p>${tanggal} • ${jam} (WITA)</p>
        <p>ID: ${escapeHtml(receipt.display_id)}</p>
      </div>
      ${statusLine}
      <hr />
      ${itemsHtml}
      <div class="total">
        <span>Total</span>
        <span>${toRp(receipt.grandTotal)}</span>
      </div>
      <p class="center" style="margin-top:8px;">Terima kasih 🙏</p>
    </div>
  `;
}

// identifier bisa trx_id (uuid) atau id numeric (legacy)
async function printByIdentifier(identifier) {
  const idStr = String(identifier || "").trim();

  // deteksi uuid lebih aman (uuid v4 biasanya ada '-')
  const isUuid = idStr.includes("-") || idStr.length >= 32;

  const base = db
    .from("sales")
    .select("id, trx_id, jumlah, harga, total, tanggal, payment_status, product_id(nama,kode)");

  const { data, error } = isUuid
    ? await base.eq("trx_id", idStr).order("id", { ascending: true })
    : await base.eq("id", Number(idStr)).limit(1);

  if (error) {
    console.error(error);
    alert("Gagal memuat transaksi untuk dicetak.");
    return;
  }
  if (!data || !data.length) {
    alert("Data transaksi tidak ditemukan.");
    return;
  }

  const rows = data;
  const when = new Date(rows[0].tanggal);
  const payment_status = rows[0].payment_status || "paid";

  const items = rows.map((r) => ({
    nama: r.product_id?.nama || "-",
    kode: r.product_id?.kode || "-",
    jumlah: r.jumlah,
    harga: r.harga,
    total: r.total,
  }));

  const grandTotal = items.reduce((a, b) => a + (b.total || 0), 0);

  const display_id = rows[0].trx_id ? shortFromUuid(rows[0].trx_id) : `SALE-${rows[0].id}`;

  const receipt = {
    display_id,
    when,
    items,
    grandTotal,
    payment_status,
  };

  const area = ensureAreaStruk();
  area.innerHTML = buildStrukHtml(receipt);
  area.style.display = "block";

  window.print();

  setTimeout(() => {
    area.style.display = "none";
    area.innerHTML = "";
  }, 250);
}

/* ===================== PRODUCTS ===================== */
async function loadProducts() {
  const { data, error } = await db
    .from("products")
    .select("id, nama, kode, jumlah, harga")
    .order("nama");

  if (error) {
    console.error(error);
    alert("Gagal memuat produk");
    allProducts = [];
    renderSelect([]);
    return;
  }

  allProducts = data || [];
  renderSelect(allProducts);
}

function renderSelect(list) {
  elSelect.innerHTML = `<option value="" disabled selected>Pilih produk…</option>`;
  (list || []).forEach((p) => {
    const opt = document.createElement("option");
    opt.value = String(p.id);
    opt.textContent = `${p.nama} (${p.kode}) - stok ${p.jumlah}`;
    if (Number(p.jumlah || 0) <= 0) opt.disabled = true;
    elSelect.appendChild(opt);
  });
}

function filterProducts(kw) {
  const k = (kw || "").toLowerCase();
  return allProducts.filter(
    (p) =>
      (p.nama || "").toLowerCase().includes(k) ||
      (p.kode || "").toLowerCase().includes(k)
  );
}

function getProductById(id) {
  return allProducts.find((p) => String(p.id) === String(id));
}

/* ===================== CART ===================== */
function renderCart() {
  elKeranjang.innerHTML = "";
  if (!cart.length) {
    elKeranjang.innerHTML = `<li class="muted">Keranjang kosong</li>`;
    return;
  }

  cart.forEach((it, i) => {
    elKeranjang.innerHTML += `
      <li>
        <div>
          <strong>${escapeHtml(it.nama)}</strong> (${escapeHtml(it.kode)})<br>
          ${it.qty} x ${toRp(it.harga)} = <strong>${toRp(it.subtotal)}</strong>
        </div>
        <button class="btn-hapus" data-i="${i}" type="button">✕</button>
      </li>
    `;
  });
}

function addToCart() {
  const pid = elSelect.value;
  const qty = parseInt(elJumlah.value, 10);

  if (!pid) return alert("Pilih produk dulu");
  if (!qty || qty < 1) return alert("Jumlah minimal 1");

  const p = getProductById(pid);
  if (!p) return alert("Produk tidak ditemukan");

  const stok = Number(p.jumlah || 0);
  if (qty > stok) return alert("Stok tidak cukup");

  const exist = cart.find((c) => String(c.product_id) === String(pid));
  const newQty = (exist?.qty || 0) + qty;
  if (newQty > stok) return alert("Total di keranjang melebihi stok");

  if (exist) {
    exist.qty = newQty;
    exist.subtotal = exist.qty * exist.harga;
  } else {
    cart.push({
      product_id: String(pid),
      nama: p.nama,
      kode: p.kode,
      harga: Number(p.harga || 0),
      qty,
      subtotal: qty * Number(p.harga || 0),
    });
  }

  elJumlah.value = "";
  renderCart();
}

/* ===================== SAVE SALE ===================== */
function lock(on) {
  btnTambah.disabled = on;
  btnSimpan.disabled = on;
  if (btnRefreshHari) btnRefreshHari.disabled = on;
  if (btnPrintLast) btnPrintLast.disabled = on;

  elCari.disabled = on;
  elSelect.disabled = on;
  elJumlah.disabled = on;
}

async function saveSale() {
  if (!cart.length) return alert("Keranjang kosong");

  lock(true);
  try {
    const trxId = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
    const isUtang = !!(elIsUtang && elIsUtang.checked);
    const status = isUtang ? "unpaid" : "paid";

    for (const it of cart) {
      const { error: eSale } = await db.from("sales").insert([
        {
          trx_id: trxId,
          product_id: Number(it.product_id),
          jumlah: it.qty,
          harga: it.harga,
          total: it.subtotal,
          tanggal: new Date().toISOString(),
          payment_status: status,
          customer_name: isUtang ? (elCustomer?.value || null) : null,
          note: isUtang ? (elNote?.value || null) : null,
        },
      ]);

      if (eSale) {
        console.error(eSale);
        alert("Gagal menyimpan penjualan");
        return;
      }

      // update stok (tanpa db.raw)
      const p = getProductById(it.product_id);
      const stokNow = Number(p?.jumlah || 0);
      const sisa = stokNow - it.qty;

      const { error: eUpd } = await db
        .from("products")
        .update({ jumlah: sisa })
        .eq("id", Number(it.product_id));

      if (eUpd) {
        console.error(eUpd);
        alert("Penjualan tersimpan, tapi gagal update stok. Cek database!");
        return;
      }
    }

    cart = [];
    renderCart();
    await loadProducts();
    await loadTodaySales();

    const display = shortFromUuid(trxId);
    if (elLastInfo) elLastInfo.textContent = `Transaksi terakhir: ${display}`;

    // ✅ FIX: tampilkan tombol cetak terakhir
    if (btnPrintLast) btnPrintLast.style.display = "inline-block";

    localStorage.setItem("last_trx_id", trxId);

    alert(isUtang ? "Transaksi utang tersimpan" : "Transaksi tersimpan");
  } finally {
    lock(false);
  }
}

/* ===================== DAILY LIST ===================== */
async function loadTodaySales() {
  const day = todayWITA_DateISO();
  if (elInfoHari) elInfoHari.textContent = `Tanggal: ${day}`;

  const start = new Date(`${day}T00:00:00+08:00`).toISOString();
  const end = new Date(`${day}T23:59:59+08:00`).toISOString();

  const { data, error } = await db
    .from("sales")
    .select("id, trx_id, tanggal, total, payment_status")
    .gte("tanggal", start)
    .lte("tanggal", end)
    .order("tanggal", { ascending: false });

  if (error) {
    console.error(error);
    if (elTBodyHari) elTBodyHari.innerHTML = `<tr><td colspan="4" class="muted">Gagal memuat</td></tr>`;
    if (elTotalHari) elTotalHari.textContent = toRp(0);
    return;
  }

  if (!data || !data.length) {
    if (elTBodyHari) elTBodyHari.innerHTML = `<tr><td colspan="4" class="muted">Belum ada transaksi</td></tr>`;
    if (elTotalHari) elTotalHari.textContent = toRp(0);
    return;
  }

  // group by trx_id (kalau ada), kalau tidak -> legacy per row
  const map = new Map();
  for (const r of data) {
    const key = r.trx_id ? String(r.trx_id) : `legacy-${r.id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        trx_id: r.trx_id || null,
        id: r.id,
        tanggal_first: r.tanggal,
        payment_status: r.payment_status || "paid",
        total: 0,
      });
    }
    const cur = map.get(key);
    cur.total += Number(r.total || 0);
    if (new Date(r.tanggal) < new Date(cur.tanggal_first)) cur.tanggal_first = r.tanggal;
    if (r.payment_status === "unpaid") cur.payment_status = "unpaid";
  }

  const list = Array.from(map.values()).sort(
    (a, b) => new Date(b.tanggal_first) - new Date(a.tanggal_first)
  );

  let totalHari = 0;
  if (elTBodyHari) {
    elTBodyHari.innerHTML = list
      .map((t) => {
        totalHari += t.total;

        const idLabel = t.trx_id ? shortFromUuid(t.trx_id) : `SALE-${t.id}`;
        const jam = timeWITAhhmm(t.tanggal_first);
        const status = t.payment_status === "unpaid" ? "Utang" : "Tunai";

        // identifier utk print: trx_id kalau ada, kalau legacy pakai id
        const identifier = t.trx_id ? String(t.trx_id) : String(t.id);

        return `
          <tr>
            <td><strong>${escapeHtml(idLabel)}</strong></td>
            <td>${escapeHtml(jam)}</td>
            <td style="text-align:right;">
              ${toRp(t.total)}<br>
              <span class="muted" style="font-size:11px;">${escapeHtml(status)}</span>
            </td>
            <td style="text-align:right;">
              <button type="button" data-print="${escapeHtml(identifier)}">Cetak</button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  if (elTotalHari) elTotalHari.textContent = toRp(totalHari);
}

/* ===================== EVENTS ===================== */
elCari?.addEventListener("input", () => renderSelect(filterProducts(elCari.value)));
btnTambah?.addEventListener("click", addToCart);
btnSimpan?.addEventListener("click", saveSale);
btnRefreshHari?.addEventListener("click", loadTodaySales);

elKeranjang?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-i]");
  if (!btn) return;
  const idx = parseInt(btn.dataset.i, 10);
  if (Number.isNaN(idx)) return;
  cart.splice(idx, 1);
  renderCart();
});

btnPrintLast?.addEventListener("click", async () => {
  const trxId = localStorage.getItem("last_trx_id");
  if (!trxId) return alert("Belum ada transaksi terakhir");
  await printByIdentifier(trxId);
});

// ✅ FIX: tombol cetak dari list harian
elTBodyHari?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-print]");
  if (!btn) return;
  await printByIdentifier(btn.dataset.print);
});

/* ===================== INIT ===================== */
(async function init() {
  await loadProducts();
  renderCart();
  await loadTodaySales();

  // restore last trx
  const lastId = localStorage.getItem("last_trx_id");
  if (lastId && elLastInfo) {
    elLastInfo.textContent = `Transaksi terakhir: ${shortFromUuid(lastId)}`;
    // ✅ FIX: munculkan tombol cetak terakhir juga
    if (btnPrintLast) btnPrintLast.style.display = "inline-block";
  }
})();