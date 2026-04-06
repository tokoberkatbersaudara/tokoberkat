// js/stok.js
const db = window.db;

let semuaProduk = [];
let dataTampil = [];
let halaman = 1;
const perHalaman = 5;

// ===== PERINGATAN STATE =====
let peringatanShowAll = false;
let isLoadingStok = false;

/* ===================== ELEMENTS: TAMBAH ===================== */
const elAddCard = document.getElementById("cardTambahProduk");
const elAddNama = document.getElementById("addNama");
const elAddKode = document.getElementById("addKode");
const elAddJumlah = document.getElementById("addJumlah");
const elAddHarga = document.getElementById("addHarga");
const elAddStokMin = document.getElementById("addStokMin");

const btnTambahProduk = document.getElementById("btnTambahProduk");
const btnBuatSku = document.getElementById("btnBuatSku");
const btnResetTambah = document.getElementById("btnResetTambah");
const elAddHint = document.getElementById("addHint");

/* ===================== ELEMENTS: EDIT ===================== */
const elEditCard = document.getElementById("cardEditStok");

const elEditId = document.getElementById("editId");
const elEditNama = document.getElementById("editNama");
const elEditKode = document.getElementById("editKode");
const elEditJumlah = document.getElementById("editJumlah");
const elEditHarga = document.getElementById("editHarga");

const btnSimpanEdit = document.getElementById("btnSimpanEdit");
const btnBatalEdit = document.getElementById("btnBatalEdit");
const btnClearEdit = document.getElementById("btnClearEdit");
const elEditHint = document.getElementById("editHint");

/* ===================== PAGINATION / SEARCH ===================== */
const elCariInput = document.getElementById("cariInput");
const elHalamanSekarang = document.getElementById("halamanSekarang");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

/* ===================== DYNAMIC EDIT FIELD ===================== */
let elEditStokMin = document.getElementById("editStokMin");

/* ===================== UTIL ===================== */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// untuk saat user sedang ngetik: auto CAPS, spasi tetap bisa
function toUpperKeepTyping(s) {
  return String(s || "").toUpperCase();
}

// untuk hasil final: CAPS + rapikan spasi
function toUpperCleanFinal(s) {
  return String(s || "").toUpperCase().trim().replace(/\s+/g, " ");
}

/**
 * Normalisasi SKU:
 * - uppercase
 * - format final: AAA-001
 * - hanya A-Z, 0-9, dan dash
 */
function normalizeSkuInput(s) {
  return String(s || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nextConsonant(word) {
  const vowels = new Set(["A", "I", "U", "E", "O"]);
  const w = String(word || "").toUpperCase();

  for (let i = 1; i < w.length; i++) {
    const ch = w[i];
    if (/[A-Z]/.test(ch) && !vowels.has(ch)) return ch;
  }

  for (let i = 1; i < w.length; i++) {
    const ch = w[i];
    if (/[A-Z]/.test(ch)) return ch;
  }

  return "";
}

/**
 * Ambil prefix 3 huruf dari nama inti barang.
 *
 * Aturan:
 * - buang angka dan satuan umum
 * - 3 kata+  => huruf awal 3 kata inti
 *   contoh: KIPAS ANGIN DUDUK => KAD
 * - 2 kata   => awal kata 1 + awal kata 2 + konsonan berikutnya kata 2
 *   contoh: LAMPU TIDUR => LTD
 * - 1 kata   => ambil 3 huruf paling masuk akal dari kata itu
 */
function makePrefixFromName(nama) {
  const stopWords = new Set([
    "WATT", "W", "KG", "G", "GRAM", "GR", "LITER", "LTR", "ML", "CM", "MM", "M",
    "PCS", "PC", "PACK", "PAK", "BOX", "BOTOL", "BTR", "ISI", "RASA", "SIZE",
    "SMALL", "MEDIUM", "LARGE", "WARNA", "LED"
  ]);

  const words = String(nama || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !/^\d+$/.test(w))
    .filter((w) => !stopWords.has(w));

  if (!words.length) return "SKU";

  if (words.length >= 3) {
    return `${words[0][0] || ""}${words[1][0] || ""}${words[2][0] || ""}`
      .slice(0, 3)
      .padEnd(3, "X");
  }

  if (words.length === 2) {
    const first = words[0];
    const second = words[1];

    let prefix = `${first[0] || ""}${second[0] || ""}${nextConsonant(second)}`;

    if (prefix.length < 3) {
      prefix += nextConsonant(first);
    }

    if (prefix.length < 3) {
      const merged = `${first}${second}`;
      for (const ch of merged) {
        if (/[A-Z]/.test(ch) && !prefix.includes(ch)) {
          prefix += ch;
        }
        if (prefix.length >= 3) break;
      }
    }

    return prefix.slice(0, 3).padEnd(3, "X");
  }

  const single = words[0];
  let prefix = single[0] || "";
  prefix += nextConsonant(single);

  for (const ch of single) {
    if (/[A-Z]/.test(ch) && !prefix.includes(ch)) {
      prefix += ch;
    }
    if (prefix.length >= 3) break;
  }

  return prefix.slice(0, 3).padEnd(3, "X");
}

/**
 * Buat SKU format AAA-001
 * Nomor urut berdasarkan prefix yang sama.
 */
function generateSkuFromName(nama, usedSet) {
  const prefix = makePrefixFromName(nama);
  let maxNum = 0;

  for (const kode of usedSet) {
    const normalized = normalizeSkuInput(kode);
    const match = normalized.match(/^([A-Z]{3})-(\d{3})$/);
    if (!match) continue;

    const [, pfx, numStr] = match;
    if (pfx !== prefix) continue;

    const num = parseInt(numStr, 10);
    if (!Number.isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const next = String(maxNum + 1).padStart(3, "0");
  return `${prefix}-${next}`;
}

function getTotalHalaman(totalData) {
  return Math.max(1, Math.ceil(Number(totalData || 0) / perHalaman));
}

function getFilteredProduk() {
  const keyword = (elCariInput?.value || "").toLowerCase().trim();

  if (!keyword) return [...semuaProduk];

  return semuaProduk.filter(
    (p) =>
      (p.nama || "").toLowerCase().includes(keyword) ||
      (p.kode || "").toLowerCase().includes(keyword)
  );
}

/* ===================== DYNAMIC UI HELPERS ===================== */
function ensureEditStokMinimumField() {
  if (elEditStokMin) return elEditStokMin;
  if (!elEditCard) return null;
  if (!elEditHarga) return null;

  const grid = elEditHarga.closest(".grid-2");
  if (!grid) return null;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <label for="editStokMin">Stok Minimum</label>
    <input type="number" id="editStokMin" min="0" placeholder="Kosongkan jika tidak ada" />
  `;
  grid.appendChild(wrap);

  elEditStokMin = wrap.querySelector("#editStokMin");
  return elEditStokMin;
}

function setLoadingStok(on) {
  isLoadingStok = !!on;

  const tbody = document.getElementById("daftarStok");
  if (!tbody) return;

  if (isLoadingStok) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="muted" style="text-align:center;">Memuat data...</td>
      </tr>
    `;
    if (elHalamanSekarang) elHalamanSekarang.textContent = `...`;
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
  }
}

/* ===================== CARD VISIBILITY ===================== */
function setTambahVisible(on) {
  if (!elAddCard) return;
  elAddCard.style.display = on ? "" : "none";
}

function setEditCardVisible(on) {
  if (!elEditCard) return;
  elEditCard.style.display = on ? "" : "none";
}

/* ===================== EDIT HELPERS ===================== */
function setEditEnabled(on) {
  if (btnSimpanEdit) btnSimpanEdit.disabled = !on;
  if (btnBatalEdit) btnBatalEdit.disabled = !on;
  if (btnClearEdit) btnClearEdit.style.display = on ? "inline-block" : "none";
}

function clearEdit() {
  const editStokMinField = ensureEditStokMinimumField();

  elEditId.value = "";
  elEditNama.value = "";
  elEditKode.value = "";
  elEditJumlah.value = "";
  elEditHarga.value = "";
  if (editStokMinField) editStokMinField.value = "";
  elEditHint.innerHTML = 'Klik tombol <b>Ubah</b> pada produk untuk mulai edit.';
  setEditEnabled(false);
  setEditCardVisible(false);
  setTambahVisible(true);
}

function bukaEdit(id) {
  const p = semuaProduk.find((x) => String(x.id) === String(id));
  if (!p) return alert("Produk tidak ditemukan");

  const editStokMinField = ensureEditStokMinimumField();

  setTambahVisible(false);
  setEditCardVisible(true);

  elEditId.value = p.id;
  elEditNama.value = p.nama ?? "";
  elEditKode.value = p.kode ?? "";
  elEditJumlah.value = Number(p.jumlah ?? 0);
  elEditHarga.value = Number(p.harga ?? 0);
  if (editStokMinField) {
    editStokMinField.value =
      p.stok_minimum == null || p.stok_minimum === ""
        ? ""
        : Number(p.stok_minimum);
  }

  elEditHint.innerHTML = `Sedang edit: <b>${escapeHtml(p.nama ?? "-")}</b>`;
  setEditEnabled(true);
}

/* ===================== TAMBAH PRODUK ===================== */
function resetTambah() {
  if (elAddNama) elAddNama.value = "";
  if (elAddKode) elAddKode.value = "";
  if (elAddJumlah) elAddJumlah.value = "";
  if (elAddHarga) elAddHarga.value = "";
  if (elAddStokMin) elAddStokMin.value = "";
  if (elAddHint) elAddHint.textContent = "";
}

function getUsedSkuSet() {
  const set = new Set();
  for (const p of semuaProduk) {
    const k = normalizeSkuInput(p.kode);
    if (k) set.add(k);
  }
  return set;
}

async function tambahProduk() {
  const nama = toUpperCleanFinal(elAddNama?.value || "");
  const kodeRaw = String(elAddKode?.value || "").trim();
  const kode = normalizeSkuInput(kodeRaw);

  const jumlah = Number(elAddJumlah?.value || 0);
  const harga = Number(elAddHarga?.value || 0);
  const stok_minimum =
    elAddStokMin && String(elAddStokMin.value).trim() !== ""
      ? Number(elAddStokMin.value)
      : null;

  if (!nama) return alert("Nama produk wajib diisi.");
  if (!kode) return alert("Kode/SKU wajib diisi (klik Buat SKU atau isi manual).");
  if (!/^[A-Z]{3}-\d{3}$/.test(kode)) return alert("Format SKU harus seperti LTD-001.");
  if (!Number.isFinite(jumlah) || jumlah < 0) return alert("Stok awal harus angka >= 0.");
  if (!Number.isFinite(harga) || harga < 0) return alert("Harga harus angka >= 0.");
  if (stok_minimum != null && (!Number.isFinite(stok_minimum) || stok_minimum < 0)) {
    return alert("Stok minimum harus angka >= 0.");
  }

  const used = getUsedSkuSet();
  if (used.has(kode)) return alert("Kode/SKU sudah dipakai. Klik Buat SKU untuk buat yang unik.");

  if (btnTambahProduk) btnTambahProduk.disabled = true;
  if (btnBuatSku) btnBuatSku.disabled = true;
  if (btnResetTambah) btnResetTambah.disabled = true;

  try {
    const payload = { nama, kode, jumlah, harga, stok_minimum };
    const { error, data } = await db.from("products").insert([payload]).select();

    if (error) {
      console.error(error);
      if (String(error.message || "").toLowerCase().includes("duplicate")) {
        alert("❌ Kode/SKU bentrok di database. Klik Buat SKU lalu simpan ulang.");
        return;
      }
      alert("❌ Gagal menambah produk.");
      return;
    }

    const added = data?.[0];
    alert(`✅ Produk ditambahkan: ${added?.nama || nama}`);

    await tampilkanStok();
    clearEdit();
    resetTambah();
  } finally {
    if (btnTambahProduk) btnTambahProduk.disabled = false;
    if (btnBuatSku) btnBuatSku.disabled = false;
    if (btnResetTambah) btnResetTambah.disabled = false;
  }
}

/* ===================== LOAD STOK ===================== */
async function tampilkanStok() {
  setLoadingStok(true);

  try {
    const { data, error } = await db
      .from("products")
      .select("*")
      .order("nama", { ascending: true });

    if (error) {
      alert("Gagal memuat data stok!");
      console.error(error);
      return;
    }

    semuaProduk = data || [];
    dataTampil = getFilteredProduk();

    const totalHalaman = getTotalHalaman(dataTampil.length);
    if (halaman > totalHalaman) halaman = totalHalaman;
    if (halaman < 1) halaman = 1;

    tampilkanHasil(dataTampil);
    tampilkanPeringatan();

    if (elEditId.value) {
      const still = semuaProduk.find((x) => String(x.id) === String(elEditId.value));
      if (still) {
        const editStokMinField = ensureEditStokMinimumField();
        setTambahVisible(false);
        setEditCardVisible(true);
        elEditJumlah.value = Number(still.jumlah ?? 0);
        elEditHarga.value = Number(still.harga ?? 0);
        if (editStokMinField) {
          editStokMinField.value =
            still.stok_minimum == null || still.stok_minimum === ""
              ? ""
              : Number(still.stok_minimum);
        }
      } else {
        clearEdit();
      }
    } else {
      setEditCardVisible(false);
      setTambahVisible(true);
    }
  } finally {
    isLoadingStok = false;
  }
}

/* ===================== RENDER TABEL ===================== */
function tampilkanHasil(data = semuaProduk) {
  const tbody = document.getElementById("daftarStok");
  tbody.innerHTML = "";

  const totalData = (data || []).length;
  const totalHalaman = getTotalHalaman(totalData);

  if (halaman > totalHalaman) halaman = totalHalaman;
  if (halaman < 1) halaman = 1;

  const awal = (halaman - 1) * perHalaman;
  const akhir = awal + perHalaman;
  const dataHalaman = (data || []).slice(awal, akhir);

  if (!dataHalaman.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Tidak ada data</td>
      </tr>
    `;
    if (elHalamanSekarang) elHalamanSekarang.textContent = `1/1`;
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
    return;
  }

  dataHalaman.forEach((p) => {
    tbody.innerHTML += `
      <tr>
        <td>${escapeHtml(p.nama ?? "-")}</td>
        <td>${escapeHtml(p.kode ?? "-")}</td>
        <td style="font-weight:800;">${p.jumlah ?? 0}</td>
        <td>Rp ${(p.harga ?? 0).toLocaleString("id-ID")}</td>
        <td>
          <button type="button" data-action="edit" data-id="${p.id}">Ubah</button>
          <button type="button" data-action="hapus" data-id="${p.id}">Hapus</button>
        </td>
      </tr>
    `;
  });

  if (elHalamanSekarang) elHalamanSekarang.textContent = `${halaman}/${totalHalaman}`;
  if (btnPrev) btnPrev.disabled = halaman <= 1;
  if (btnNext) btnNext.disabled = halaman >= totalHalaman;
}

/* ===================== PERINGATAN STOK MINIMUM ===================== */
function tampilkanPeringatan() {
  const div = document.getElementById("peringatan");
  if (!div) return;

  const stokRendah = semuaProduk
    .filter((p) => p.stok_minimum != null && Number(p.jumlah ?? 0) < Number(p.stok_minimum))
    .sort(
      (a, b) =>
        (Number(a.jumlah ?? 0) - Number(a.stok_minimum ?? 0)) -
        (Number(b.jumlah ?? 0) - Number(b.stok_minimum ?? 0))
    );

  if (!stokRendah.length) {
    div.innerHTML = "";
    div.style.display = "none";
    return;
  }

  div.style.display = "block";

  const limit = 5;
  const list = peringatanShowAll ? stokRendah : stokRendah.slice(0, limit);

  const itemsHtml = list
    .map((p) => {
      const nama = p.nama ?? "-";
      const kode = p.kode ?? "-";
      const sisa = Number(p.jumlah ?? 0);
      const min = Number(p.stok_minimum ?? 0);

      return `
        <li style="
          display:flex; gap:10px; align-items:flex-start;
          padding:10px 12px;
          border:1px solid rgba(255,77,77,.25);
          background: rgba(255,77,77,.08);
          border-radius: 12px;
        ">
          <div style="margin-top:1px;">⚠️</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:900;">
              ${escapeHtml(nama)}
              <span style="font-weight:700; color: var(--muted);">(${escapeHtml(kode)})</span>
            </div>
            <div style="color: #ffd6d6; font-weight:800;">
              Sisa: ${sisa} • Minimum: ${min}
            </div>
          </div>
        </li>
      `;
    })
    .join("");

  const showToggle = stokRendah.length > limit;
  const toggleText = peringatanShowAll ? "Ringkas" : `Lihat semua (${stokRendah.length})`;

  div.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="font-weight:900;">Peringatan Stok Rendah</div>
      <ul id="peringatanList" style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px;">
        ${itemsHtml}
      </ul>
      ${showToggle ? `<div><button type="button" id="btnPeringatanToggle" class="btn-alt">${toggleText}</button></div>` : ``}
    </div>
  `;

  const btn = document.getElementById("btnPeringatanToggle");
  if (btn) {
    btn.onclick = () => {
      peringatanShowAll = !peringatanShowAll;
      tampilkanPeringatan();
    };
  }
}

/* ===================== PAGINATION ===================== */
function sebelumnya() {
  if (halaman > 1) {
    halaman--;
    tampilkanHasil(dataTampil);
  }
}

function berikutnya() {
  const totalHalaman = getTotalHalaman(dataTampil.length);
  if (halaman < totalHalaman) {
    halaman++;
    tampilkanHasil(dataTampil);
  }
}

/* ===================== SEARCH ===================== */
elCariInput?.addEventListener("input", function () {
  halaman = 1;
  dataTampil = getFilteredProduk();
  tampilkanHasil(dataTampil);
});

/* ===================== BUTTON EVENTS ===================== */
btnPrev?.addEventListener("click", sebelumnya);
btnNext?.addEventListener("click", berikutnya);

/* ===================== DELEGASI AKSI TABEL ===================== */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "edit") {
    bukaEdit(id);
    return;
  }

  if (action === "hapus") {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;

    const { error } = await db.from("products").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus data!");
      console.error(error);
      return;
    }

    alert("Barang berhasil dihapus!");
    clearEdit();
    await tampilkanStok();
  }
});

/* ===================== EDIT PANEL EVENTS ===================== */
btnBatalEdit?.addEventListener("click", clearEdit);
btnClearEdit?.addEventListener("click", clearEdit);

btnSimpanEdit?.addEventListener("click", async () => {
  const editStokMinField = ensureEditStokMinimumField();

  const id = elEditId.value;
  if (!id) return;

  const jumlah = Number(elEditJumlah.value);
  const harga = Number(elEditHarga.value);
  const stok_minimum =
    editStokMinField && String(editStokMinField.value).trim() !== ""
      ? Number(editStokMinField.value)
      : null;

  if (!Number.isFinite(jumlah) || jumlah < 0) return alert("Jumlah harus angka >= 0");
  if (!Number.isFinite(harga) || harga < 0) return alert("Harga harus angka >= 0");
  if (stok_minimum != null && (!Number.isFinite(stok_minimum) || stok_minimum < 0)) {
    return alert("Stok minimum harus angka >= 0");
  }

  btnSimpanEdit.disabled = true;

  try {
    const { error, data } = await db
      .from("products")
      .update({ jumlah, harga, stok_minimum })
      .eq("id", id)
      .select();

    if (error || !data?.length) {
      console.error(error);
      alert("Gagal menyimpan perubahan");
      return;
    }

    alert("✅ Stok berhasil diupdate");
    await tampilkanStok();
    clearEdit();
  } finally {
    btnSimpanEdit.disabled = false;
  }
});

/* ===================== TAMBAH EVENTS ===================== */
btnResetTambah?.addEventListener("click", resetTambah);

btnBuatSku?.addEventListener("click", () => {
  const nama = toUpperCleanFinal(elAddNama?.value || "");
  if (!nama) return alert("Isi Nama dulu untuk buat SKU.");

  if (elAddNama) elAddNama.value = nama;

  const used = getUsedSkuSet();
  const sku = generateSkuFromName(nama, used);

  if (!sku) return alert("Gagal membuat SKU. Coba nama yang lebih jelas.");
  elAddKode.value = sku;
  if (elAddHint) elAddHint.textContent = `SKU dibuat: ${sku}`;
});

elAddNama?.addEventListener("input", () => {
  const start = elAddNama.selectionStart;
  const end = elAddNama.selectionEnd;
  elAddNama.value = toUpperKeepTyping(elAddNama.value);
  try {
    elAddNama.setSelectionRange(start, end);
  } catch (_) {}
});

elAddNama?.addEventListener("blur", () => {
  const nama = toUpperCleanFinal(elAddNama.value || "");
  if (!nama) return;

  elAddNama.value = nama;

  if (String(elAddKode?.value || "").trim()) return;

  const used = getUsedSkuSet();
  const sku = generateSkuFromName(nama, used);
  if (sku) {
    elAddKode.value = sku;
    if (elAddHint) elAddHint.textContent = `SKU disarankan: ${sku} (boleh kamu edit)`;
  }
});

elAddKode?.addEventListener("input", () => {
  elAddKode.value = normalizeSkuInput(elAddKode.value);
});

btnTambahProduk?.addEventListener("click", tambahProduk);

/* ===================== INIT ===================== */
ensureEditStokMinimumField();
resetTambah();
clearEdit();
tampilkanStok();