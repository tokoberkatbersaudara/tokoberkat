// js/laporan.js
// FINAL (SYNC WITH HTML MODALS + PRINT 80mm via print.css)
// - LUNAS: ringkas per transaksi (Tanggal | No Nota | Total) -> klik baris buka modal
// - Modal LUNAS (sudah ada di HTML) + tombol Cetak ulang
// - Print pakai #areaStruk + afterprint cleanup (stabil)
// - UTANG tetap: ringkas per transaksi + modal detail + Tandai Lunas
// - Export CSV + Cetak periode tetap jalan

const db = window.db;

/* ===================== UTIL ===================== */
const toRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function onlyDateWITA(iso) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function onlyTimeWITA(iso) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function todayWITA() {
  const now = new Date();
  const y = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", year: "numeric" });
  const m = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", month: "2-digit" });
  const d = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", day: "2-digit" });
  return `${y}-${m}-${d}`;
}

function rangeISO_WITA(fromStr, toStr) {
  const start = new Date(`${fromStr}T00:00:00+08:00`);
  const end = new Date(`${toStr}T23:59:59+08:00`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function getPartsWITA(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const obj = {};
  for (const p of parts) if (p.type !== "literal") obj[p.type] = p.value;
  return { y: Number(obj.year), m: Number(obj.month), d: Number(obj.day) };
}

function weekStartEndWITA() {
  const { y, m, d } = getPartsWITA();
  const nowWITA = new Date(
    `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}T12:00:00+08:00`
  );

  const day = nowWITA.getDay();
  const diffToMon = (day + 6) % 7;

  const start = new Date(nowWITA);
  start.setDate(nowWITA.getDate() - diffToMon);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (dt) => {
    const yy = dt.toLocaleString("en-CA", { timeZone: "Asia/Makassar", year: "numeric" });
    const mm = dt.toLocaleString("en-CA", { timeZone: "Asia/Makassar", month: "2-digit" });
    const dd = dt.toLocaleString("en-CA", { timeZone: "Asia/Makassar", day: "2-digit" });
    return `${yy}-${mm}-${dd}`;
  };

  return { dari: fmt(start), sampai: fmt(end) };
}

function monthStartEndWITA() {
  const { y, m } = getPartsWITA();
  const mm = String(m).padStart(2, "0");
  const dari = `${y}-${mm}-01`;

  const last = new Date(`${y}-${mm}-01T12:00:00+08:00`);
  last.setMonth(last.getMonth() + 1);
  last.setDate(0);

  const yy2 = last.toLocaleString("en-CA", { timeZone: "Asia/Makassar", year: "numeric" });
  const mm2 = last.toLocaleString("en-CA", { timeZone: "Asia/Makassar", month: "2-digit" });
  const dd2 = last.toLocaleString("en-CA", { timeZone: "Asia/Makassar", day: "2-digit" });
  const sampai = `${yy2}-${mm2}-${dd2}`;

  return { dari, sampai };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortFromUuid(id) {
  const s = String(id || "").replace(/-/g, "").slice(-6).toUpperCase();
  return s ? `TRX-${s}` : "-";
}

/* ===================== STATE ===================== */
let rawData = [];
let activeUnpaidKey = null;
let activePaidKey = null;
let currentFrom = null;
let currentTo = null;

let btnTandaiLunas = null;

/* ===================== DOM ===================== */
const elDari = document.getElementById("tglDari");
const elSampai = document.getElementById("tglSampai");
const elCari = document.getElementById("cariLaporan");
const elInfo = document.getElementById("infoRentang");

const elTBodyLunas = document.getElementById("tBodyLunas");
const elGrandLunas = document.getElementById("grandTotalLunas");

const elTBodyUtang = document.getElementById("tBodyUtang");
const elGrandUtang = document.getElementById("grandTotalUtang");

const elTotalLunas = document.getElementById("totalLunas");
const elTotalUtang = document.getElementById("totalUtang");
const elGrandAll = document.getElementById("grandTotalAll");

const btnHari = document.getElementById("btnHari");
const btnMinggu = document.getElementById("btnMinggu");
const btnBulan = document.getElementById("btnBulan");
const btnMuat = document.getElementById("btnMuat");
const btnCSV = document.getElementById("btnCSV");
const btnCetak = document.getElementById("btnCetak");

// area cetak
const elAreaStruk = document.getElementById("areaStruk");

// MODAL LUNAS (SUDAH ADA DI HTML)
const modalLunas = document.getElementById("modalLunas");
const modalLunasBackdrop = document.getElementById("modalLunasBackdrop");
const btnTutupModalLunas = document.getElementById("btnTutupModalLunas");
const btnCetakLunas = document.getElementById("btnCetakLunas");
const elLunasMeta = document.getElementById("lunasMeta");
const elLunasItems = document.getElementById("lunasItems");
const elLunasGrand = document.getElementById("lunasGrand");

// MODAL UTANG (SUDAH ADA DI HTML)
const modalUtang = document.getElementById("modalUtang");
const modalUtangBackdrop = document.getElementById("modalUtangBackdrop");
const btnTutupModalUtang = document.getElementById("btnTutupModalUtang");
const btnCetakUtang = document.getElementById("btnCetakUtang"); // placeholder
const elUtangMeta = document.getElementById("utangMeta");
const elUtangItems = document.getElementById("utangItems");
const elUtangGrand = document.getElementById("utangGrand");

/* ===================== HELPERS ===================== */
function isUnpaidRow(r) {
  return String(r.payment_status || "paid") === "unpaid";
}

function getRowKey(r) {
  return r.trx_id ? String(r.trx_id) : `legacy-${r.id}`;
}

function getUnpaidRowsByKey(key) {
  const k = String(key);
  return rawData.filter((r) => isUnpaidRow(r) && getRowKey(r) === k);
}

function getPaidRowsByKey(key) {
  const k = String(key);
  return rawData.filter((r) => !isUnpaidRow(r) && getRowKey(r) === k);
}

/* ===================== PRINT (STABIL) ===================== */
function buildReceiptHtml({ status, displayId, tanggalISO, items, grandTotal }) {
  const tgl = tanggalISO ? onlyDateWITA(tanggalISO) : "-";
  const jam = tanggalISO ? onlyTimeWITA(tanggalISO) : "-";

  const rowsHtml = (items || [])
    .map((it) => {
      const left = `${escapeHtml(it.nama || "")} (${escapeHtml(it.kode || "-")})`;
      const right = `${it.jumlah} x ${toRp(it.harga)}`;
      return `
        <div class="item">
          <div>${left}</div>
          <div>${right}</div>
        </div>
        <div class="item" style="justify-content:flex-end;">
          <div style="font-weight:700;">${toRp(it.total)}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="struk">
      <h2>Toko Berkat Bersaudara</h2>
      <p class="alamat-toko">
        Jl. Kampung Melayu Darat No 34<br>
        Banjarmasin
      </p>
      <div class="info-waktu">
        <p>${tgl} • ${jam} (WITA)</p>
        <p>ID: ${escapeHtml(displayId)}</p>
      </div>
      <p class="center" style="margin:6px 0; font-weight:800;">STATUS: ${escapeHtml(status)}</p>
      <hr />
      ${rowsHtml}
      <div class="total">
        <span>Total</span>
        <span>${toRp(grandTotal)}</span>
      </div>
      <p class="center" style="margin-top:8px;">Terima kasih 🙏</p>
    </div>
  `;
}

function printHtmlOnce(html) {
  if (!elAreaStruk) {
    alert("areaStruk tidak ditemukan.");
    return;
  }

  elAreaStruk.innerHTML = html;
  elAreaStruk.style.display = "block";

  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    elAreaStruk.style.display = "none";
    elAreaStruk.innerHTML = "";
  };
  window.addEventListener("afterprint", cleanup);

  setTimeout(() => {
    try {
      window.print();
    } catch (e) {
      cleanup();
      console.error(e);
      alert("Gagal memulai print.");
    }
  }, 50);
}

function printPaidTransactionByKey(key) {
  const rows = getPaidRowsByKey(key);
  if (!rows.length) return alert("Data transaksi lunas tidak ditemukan.");

  const first = rows.reduce((a, b) => (new Date(a.tanggal) < new Date(b.tanggal) ? a : b));
  const displayId = first.trx_id ? shortFromUuid(first.trx_id) : `SALE-${first.id}`;

  const items = rows.map((r) => ({
    nama: r.product_id?.nama || "",
    kode: r.product_id?.kode || "-",
    jumlah: r.jumlah ?? 0,
    harga: r.harga ?? 0,
    total: r.total ?? 0,
  }));

  const grandTotal = items.reduce((a, b) => a + Number(b.total || 0), 0);

  printHtmlOnce(
    buildReceiptHtml({
      status: "LUNAS",
      displayId,
      tanggalISO: first.tanggal,
      items,
      grandTotal,
    })
  );
}

/* ===================== MODAL LUNAS ===================== */
function bukaModalLunas(key) {
  if (!modalLunas) return;
  activePaidKey = String(key);

  const rows = getPaidRowsByKey(activePaidKey);
  if (!rows.length) return;

  const first = rows.reduce((a, b) => (new Date(a.tanggal) < new Date(b.tanggal) ? a : b));
  const displayId = first.trx_id ? shortFromUuid(first.trx_id) : `SALE-${first.id}`;
  const grand = rows.reduce((a, b) => a + Number(b.total || 0), 0);

  if (elLunasMeta) {
    elLunasMeta.innerHTML = `<b>${escapeHtml(displayId)}</b><br>Tanggal: ${escapeHtml(
      onlyDateWITA(first.tanggal)
    )}`;
  }

  if (elLunasItems) {
    elLunasItems.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td>${escapeHtml(onlyDateWITA(r.tanggal))}</td>
          <td>${escapeHtml(r.product_id?.nama || "-")}</td>
          <td>${escapeHtml(r.product_id?.kode || "-")}</td>
          <td style="text-align:center; font-weight:800;">${r.jumlah ?? 0}</td>
          <td style="text-align:right; font-weight:900;">${toRp(r.total)}</td>
        </tr>
      `
      )
      .join("");
  }

  if (elLunasGrand) elLunasGrand.textContent = toRp(grand);

  modalLunas.hidden = false;
  modalLunas.classList.add("is-open");
  modalLunas.setAttribute("aria-hidden", "false");
}

function tutupModalLunas() {
  if (!modalLunas) return;
  modalLunas.classList.remove("is-open");
  modalLunas.setAttribute("aria-hidden", "true");
  modalLunas.hidden = true;
  activePaidKey = null;
}

/* ===================== MODAL UTANG ===================== */
function ensureBtnTandaiLunas() {
  if (!modalUtang) return null;
  if (btnTandaiLunas) return btnTandaiLunas;

  const panel = modalUtang.querySelector(".modal__panel");
  if (!panel) return null;

  let actionRow = panel.querySelector(".tombol-aksi");
  if (!actionRow) {
    actionRow = document.createElement("div");
    actionRow.className = "tombol-aksi";
    actionRow.style.marginTop = "12px";
    panel.appendChild(actionRow);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "btnTandaiLunas";
  btn.textContent = "✅ Tandai Lunas";
  btn.className = "btn-alt";

  // taruh sebelum tombol cetak (kalau ada)
  if (btnCetakUtang && btnCetakUtang.parentElement === actionRow) {
    actionRow.insertBefore(btn, btnCetakUtang);
  } else {
    actionRow.appendChild(btn);
  }

  btn.addEventListener("click", tandaiUtangLunasAktif);
  btnTandaiLunas = btn;
  return btn;
}

function bukaModalUtang(key) {
  if (!modalUtang) return;

  activeUnpaidKey = String(key);
  const rows = getUnpaidRowsByKey(activeUnpaidKey);
  if (!rows.length) return alert("Detail utang tidak ditemukan. Coba muat ulang.");

  const first = rows[0];
  const displayId = first.trx_id ? shortFromUuid(first.trx_id) : `SALE-${first.id}`;
  const total = rows.reduce((a, b) => a + Number(b.total || 0), 0);

  if (elUtangMeta) {
    elUtangMeta.innerHTML = `<b>${escapeHtml(displayId)}</b><br>Tanggal: ${escapeHtml(
      onlyDateWITA(first.tanggal)
    )}`;
  }
  if (elUtangGrand) elUtangGrand.textContent = toRp(total);

  if (elUtangItems) {
    elUtangItems.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td>${escapeHtml(onlyDateWITA(r.tanggal))}</td>
          <td>${escapeHtml(r.product_id?.kode || "-")}</td>
          <td style="text-align:center; font-weight:800;">${r.jumlah ?? 0}</td>
          <td style="text-align:right; font-weight:900;">${toRp(r.total)}</td>
        </tr>
      `
      )
      .join("");
  }

  ensureBtnTandaiLunas();

  modalUtang.hidden = false;
  modalUtang.classList.add("is-open");
  modalUtang.setAttribute("aria-hidden", "false");
}

function tutupModalUtang() {
  if (!modalUtang) return;
  modalUtang.classList.remove("is-open");
  modalUtang.setAttribute("aria-hidden", "true");
  modalUtang.hidden = true;
  activeUnpaidKey = null;
}

/* ===================== ✅ TANDAI LUNAS ===================== */
async function tandaiUtangLunasAktif() {
  if (!activeUnpaidKey) return;

  const rows = getUnpaidRowsByKey(activeUnpaidKey);
  if (!rows.length) return alert("Data utang tidak ditemukan.");

  const trxId = rows[0].trx_id ? String(rows[0].trx_id) : null;
  if (!confirm("Tandai transaksi utang ini sebagai LUNAS?")) return;

  const btn = ensureBtnTandaiLunas();
  if (btn) btn.disabled = true;

  try {
    let q = db.from("sales").update({ payment_status: "paid" }).eq("payment_status", "unpaid");
    if (trxId) q = q.eq("trx_id", trxId);
    else q = q.eq("id", rows[0].id);

    const { error } = await q;
    if (error) {
      console.error(error);
      alert("❌ Gagal tandai lunas");
      return;
    }

    alert("✅ Berhasil ditandai LUNAS");

    const dari = currentFrom || elDari?.value || todayWITA();
    const sampai = currentTo || elSampai?.value || dari;
    await loadRange(dari, sampai);

    tutupModalUtang();
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ===================== RENDER ===================== */
function render() {
  const kw = (elCari?.value || "").trim().toLowerCase();

  // ===== LUNAS (ringkas per transaksi) =====
  const mapPaid = new Map();

  for (const r of rawData) {
    if (isUnpaidRow(r)) continue;

    const nama = (r.product_id?.nama || "").toLowerCase();
    const kode = (r.product_id?.kode || "").toLowerCase();
    if (kw && !nama.includes(kw) && !kode.includes(kw)) continue;

    const key = getRowKey(r);

    if (!mapPaid.has(key)) {
      mapPaid.set(key, {
        key,
        trx_id: r.trx_id || null,
        legacy_id: r.trx_id ? null : r.id,
        tanggal_first: r.tanggal,
        tanggal_last: r.tanggal,
        total: 0,
      });
    }

    const g = mapPaid.get(key);
    g.total += Number(r.total || 0);

    if (r.tanggal && new Date(r.tanggal) < new Date(g.tanggal_first)) g.tanggal_first = r.tanggal;
    if (r.tanggal && new Date(r.tanggal) > new Date(g.tanggal_last)) g.tanggal_last = r.tanggal;
  }

  const paidGroups = Array.from(mapPaid.values()).sort(
    (a, b) => new Date(b.tanggal_last) - new Date(a.tanggal_last)
  );

  elTBodyLunas.innerHTML = paidGroups.length
    ? paidGroups
        .map((g) => {
          const noNota = g.trx_id ? shortFromUuid(g.trx_id) : `SALE-${g.legacy_id}`;
          const tgl = g.tanggal_first ? onlyDateWITA(g.tanggal_first) : "-";

          return `
            <tr data-lunas-detail="${escapeHtml(g.key)}" style="cursor:pointer;">
              <td>${escapeHtml(tgl)}</td>
              <td style="font-weight:800;">${escapeHtml(noNota)}</td>
              <td style="text-align:right; font-weight:900; white-space:nowrap;">${toRp(g.total)}</td>
              <td></td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4" class="muted">Tidak ada data</td></tr>`;

  const totalLunas = paidGroups.reduce((a, b) => a + Number(b.total || 0), 0);
  elGrandLunas.textContent = toRp(totalLunas);

  // ===== UTANG (ringkas per transaksi) =====
  const map = new Map();

  for (const r of rawData) {
    if (!isUnpaidRow(r)) continue;

    const nama = (r.product_id?.nama || "").toLowerCase();
    const kode = (r.product_id?.kode || "").toLowerCase();
    if (kw && !nama.includes(kw) && !kode.includes(kw)) continue;

    const key = getRowKey(r);

    if (!map.has(key)) {
      map.set(key, {
        key,
        trx_id: r.trx_id || null,
        legacy_id: r.trx_id ? null : r.id,
        tanggal_first: r.tanggal,
        tanggal_last: r.tanggal,
        total: 0,
        qty: 0,
      });
    }

    const g = map.get(key);
    g.total += Number(r.total || 0);
    g.qty += Number(r.jumlah || 0);

    if (r.tanggal && new Date(r.tanggal) < new Date(g.tanggal_first)) g.tanggal_first = r.tanggal;
    if (r.tanggal && new Date(r.tanggal) > new Date(g.tanggal_last)) g.tanggal_last = r.tanggal;
  }

  const groups = Array.from(map.values()).sort(
    (a, b) => new Date(b.tanggal_last) - new Date(a.tanggal_last)
  );

  elTBodyUtang.innerHTML = groups.length
    ? groups
        .map((g) => {
          const kodeTrx = g.trx_id ? shortFromUuid(g.trx_id) : `SALE-${g.legacy_id}`;
          const tgl = g.tanggal_first ? onlyDateWITA(g.tanggal_first) : "-";

          return `
            <tr>
              <td>${escapeHtml(tgl)}</td>
              <td style="font-weight:800;">${escapeHtml(kodeTrx)}</td>
              <td style="text-align:center; font-weight:800;">${g.qty}</td>
              <td style="text-align:right; font-weight:900; white-space:nowrap;">${toRp(g.total)}</td>
              <td style="text-align:right;">
                <button type="button" data-utang-detail="${escapeHtml(g.key)}">Detail</button>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="5" class="muted">Tidak ada utang</td></tr>`;

  const totalUtang = groups.reduce((a, b) => a + Number(b.total || 0), 0);
  elGrandUtang.textContent = toRp(totalUtang);

  elTotalLunas.textContent = toRp(totalLunas);
  elTotalUtang.textContent = toRp(totalUtang);
  elGrandAll.textContent = toRp(totalLunas + totalUtang);
}

/* ===================== LOAD ===================== */
async function loadRange(dari, sampai) {
  currentFrom = dari;
  currentTo = sampai;

  const { startISO, endISO } = rangeISO_WITA(dari, sampai);
  if (elInfo) elInfo.textContent = `Periode: ${dari} s.d. ${sampai} (WITA)`;

  const { data, error } = await db
    .from("sales")
    .select("id, trx_id, tanggal, jumlah, harga, total, payment_status, product_id(nama,kode)")
    .gte("tanggal", startISO)
    .lte("tanggal", endISO)
    .order("tanggal", { ascending: true });

  if (error) {
    console.error(error);
    alert("Gagal memuat data laporan");
    rawData = [];
    render();
    return;
  }

  rawData = data || [];
  render();
}

/* ===================== CSV ===================== */
function exportCSV() {
  const kw = (elCari?.value || "").trim().toLowerCase();

  const rows = rawData.filter((r) => {
    const nama = (r.product_id?.nama || "").toLowerCase();
    const kode = (r.product_id?.kode || "").toLowerCase();
    return !kw || nama.includes(kw) || kode.includes(kw);
  });

  if (!rows.length) return alert("Tidak ada data untuk diexport");

  const header = ["Tanggal(WITA)", "Status", "Kode(TRX)", "Produk", "KodeBarang", "Jumlah", "Harga", "Total"];

  const body = rows.map((r) => {
    const status = isUnpaidRow(r) ? "UTANG" : "LUNAS";
    const kodeTrx = r.trx_id ? shortFromUuid(r.trx_id) : `SALE-${r.id}`;
    return [
      `${onlyDateWITA(r.tanggal)} ${onlyTimeWITA(r.tanggal)}`,
      status,
      kodeTrx,
      r.product_id?.nama || "",
      r.product_id?.kode || "",
      r.jumlah ?? 0,
      r.harga ?? 0,
      r.total ?? 0,
    ];
  });

  const csv = [header, ...body]
    .map((row) => row.map(String).map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "laporan_penjualan.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/* ===================== EVENTS ===================== */
document.addEventListener("DOMContentLoaded", () => {
  // pastikan modal tertutup dari awal
  tutupModalUtang();
  tutupModalLunas();

  btnHari?.addEventListener("click", () => {
    const t = todayWITA();
    elDari.value = t;
    elSampai.value = t;
    loadRange(t, t);
  });

  btnMinggu?.addEventListener("click", () => {
    const { dari, sampai } = weekStartEndWITA();
    elDari.value = dari;
    elSampai.value = sampai;
    loadRange(dari, sampai);
  });

  btnBulan?.addEventListener("click", () => {
    const { dari, sampai } = monthStartEndWITA();
    elDari.value = dari;
    elSampai.value = sampai;
    loadRange(dari, sampai);
  });

  btnMuat?.addEventListener("click", () => {
    if (!elDari.value || !elSampai.value) return alert("Isi tanggal Dari & Sampai");
    loadRange(elDari.value, elSampai.value);
  });

  elCari?.addEventListener("input", render);

  btnCSV?.addEventListener("click", exportCSV);
  btnCetak?.addEventListener("click", () => window.print());

  // klik baris lunas -> modal lunas
  elTBodyLunas?.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-lunas-detail]");
    if (!tr) return;
    bukaModalLunas(tr.dataset.lunasDetail);
  });

  // detail utang -> modal utang
  elTBodyUtang?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-utang-detail]");
    if (!btn) return;
    bukaModalUtang(btn.dataset.utangDetail);
  });

  // close modal lunas
  btnTutupModalLunas?.addEventListener("click", tutupModalLunas);
  modalLunasBackdrop?.addEventListener("click", tutupModalLunas);

  // cetak lunas
  btnCetakLunas?.addEventListener("click", () => {
    if (!activePaidKey) return;
    printPaidTransactionByKey(activePaidKey);
  });

  // close modal utang
  btnTutupModalUtang?.addEventListener("click", tutupModalUtang);
  modalUtangBackdrop?.addEventListener("click", tutupModalUtang);

  // ESC tutup semua modal
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    tutupModalUtang();
    tutupModalLunas();
  });

  // placeholder cetak utang (kalau nanti mau dipakai)
  btnCetakUtang?.addEventListener("click", () => {
    alert("Cetak utang dari modal belum diaktifkan di versi ini.");
  });

  // init hari ini
  const t = todayWITA();
  elDari.value = t;
  elSampai.value = t;
  loadRange(t, t);
});