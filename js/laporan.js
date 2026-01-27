// js/laporan.js
const db = window.db;

/* === UTIL === */
const toRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function toWITADisplay(iso) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function rangeISO_WITA(fromStr, toStr) {
  const start = new Date(`${fromStr}T00:00:00+08:00`);
  const end = new Date(`${toStr}T23:59:59+08:00`);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

function todayWITA() {
  const now = new Date();
  const y = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", year: "numeric" });
  const m = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", month: "2-digit" });
  const d = now.toLocaleString("en-CA", { timeZone: "Asia/Makassar", day: "2-digit" });
  return `${y}-${m}-${d}`;
}

function weekStartEndWITA() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" })
  );
  const day = now.getDay(); // 0 Minggu ... 6 Sabtu
  const diffToMon = (day + 6) % 7; // Senin awal minggu

  const start = new Date(now);
  start.setDate(now.getDate() - diffToMon);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const fmt = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });
  return { dari: fmt(start), sampai: fmt(end) };
}

function monthStartEndWITA() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" })
  );
  const y = now.getFullYear();
  const m = now.getMonth();

  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));

  const toLocalStr = (d) =>
    new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });

  return { dari: toLocalStr(start), sampai: toLocalStr(end) };
}

/* === STATE === */
let rawData = [];
let viewData = [];

/* === DOM === */
const elDari = document.getElementById("tglDari");
const elSampai = document.getElementById("tglSampai");
const elCari = document.getElementById("cariLaporan");
const elBody = document.getElementById("tBody");
const elGrand = document.getElementById("grandTotal");
const elInfo = document.getElementById("infoRentang");

const btnHari = document.getElementById("btnHari");
const btnMinggu = document.getElementById("btnMinggu");
const btnBulan = document.getElementById("btnBulan");
const btnMuat = document.getElementById("btnMuat");
const btnCSV = document.getElementById("btnCSV");
const btnCetak = document.getElementById("btnCetak");

/* === RENDER === */
function render() {
  const kw = elCari.value.trim().toLowerCase();

  viewData = rawData.filter((r) => {
    const nama = (r.product_id?.nama || "").toLowerCase();
    const kode = (r.product_id?.kode || "").toLowerCase();
    return !kw || nama.includes(kw) || kode.includes(kw);
  });

  elBody.innerHTML = viewData
    .map(
      (r) => `
      <tr>
        <td>${toWITADisplay(r.tanggal)}</td>
        <td>${r.product_id?.nama || "-"}</td>
        <td>${r.product_id?.kode || "-"}</td>
        <td>${r.jumlah ?? 0}</td>
        <td>${toRp(r.harga)}</td>
        <td>${toRp(r.total)}</td>
      </tr>
    `
    )
    .join("");

  const total = viewData.reduce((a, b) => a + (b.total || 0), 0);
  elGrand.textContent = toRp(total);
}

/* === LOAD DATA === */
async function loadRange(dari, sampai) {
  const { startISO, endISO } = rangeISO_WITA(dari, sampai);
  elInfo.textContent = `Periode: ${dari} s.d. ${sampai} (WITA)`;

  const { data, error } = await db
    .from("sales")
    .select("id, tanggal, jumlah, harga, total, product_id(nama,kode)")
    .gte("tanggal", startISO)
    .lte("tanggal", endISO)
    .order("tanggal", { ascending: true });

  if (error) {
    alert("Gagal memuat data laporan");
    console.error(error);
    return;
  }

  rawData = data || [];
  render();
}

/* === EVENTS === */
btnHari.addEventListener("click", () => {
  const t = todayWITA();
  elDari.value = t;
  elSampai.value = t;
  loadRange(t, t);
});

btnMinggu.addEventListener("click", () => {
  const { dari, sampai } = weekStartEndWITA();
  elDari.value = dari;
  elSampai.value = sampai;
  loadRange(dari, sampai);
});

btnBulan.addEventListener("click", () => {
  const { dari, sampai } = monthStartEndWITA();
  elDari.value = dari;
  elSampai.value = sampai;
  loadRange(dari, sampai);
});

btnMuat.addEventListener("click", () => {
  if (!elDari.value || !elSampai.value) {
    alert("Isi tanggal Dari & Sampai");
    return;
  }
  loadRange(elDari.value, elSampai.value);
});

elCari.addEventListener("input", render);

btnCSV.addEventListener("click", () => {
  if (!viewData.length) {
    alert("Tidak ada data untuk diexport");
    return;
  }

  const header = ["Tanggal(WITA)", "Produk", "Kode", "Jumlah", "Harga", "Total"];

  const rows = viewData.map((r) => [
    toWITADisplay(r.tanggal),
    r.product_id?.nama || "",
    r.product_id?.kode || "",
    r.jumlah ?? 0,
    r.harga ?? 0,
    r.total ?? 0,
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map(String)
        .map((v) => `"${v.replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "laporan_penjualan.csv";
  a.click();

  URL.revokeObjectURL(url);
});

btnCetak.addEventListener("click", () => window.print());

/* === INIT === */
(function init() {
  const t = todayWITA();
  elDari.value = t;
  elSampai.value = t;
  loadRange(t, t);
})();