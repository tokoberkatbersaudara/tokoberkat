// js/stok.js
const db = window.db;

let semuaProduk = [];
let halaman = 1;
const perHalaman = 5;

// ===== PERINGATAN STATE =====
let peringatanShowAll = false;

// EDIT PANEL ELEMENTS
const elEditId = document.getElementById("editId");
const elEditNama = document.getElementById("editNama");
const elEditKode = document.getElementById("editKode");
const elEditJumlah = document.getElementById("editJumlah");
const elEditHarga = document.getElementById("editHarga");

const btnSimpanEdit = document.getElementById("btnSimpanEdit");
const btnBatalEdit = document.getElementById("btnBatalEdit");
const btnClearEdit = document.getElementById("btnClearEdit");
const elEditHint = document.getElementById("editHint");

function setEditEnabled(on) {
  btnSimpanEdit.disabled = !on;
  btnBatalEdit.disabled = !on;
  btnClearEdit.style.display = on ? "inline-block" : "none";
}

function clearEdit() {
  elEditId.value = "";
  elEditNama.value = "";
  elEditKode.value = "";
  elEditJumlah.value = "";
  elEditHarga.value = "";
  elEditHint.innerHTML = 'Klik tombol <b>Ubah</b> pada produk untuk mulai edit.';
  setEditEnabled(false);
}

function bukaEdit(id) {
  const p = semuaProduk.find((x) => String(x.id) === String(id));
  if (!p) return alert("Produk tidak ditemukan");

  elEditId.value = p.id;
  elEditNama.value = p.nama ?? "";
  elEditKode.value = p.kode ?? "";
  elEditJumlah.value = Number(p.jumlah ?? 0);
  elEditHarga.value = Number(p.harga ?? 0);

  elEditHint.innerHTML = `Sedang edit: <b>${p.nama ?? "-"}</b>`;
  setEditEnabled(true);
}

// LOAD STOK
async function tampilkanStok() {
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
  halaman = 1;
  tampilkanHasil();
  tampilkanPeringatan();

  // kalau sedang edit item yang ada, refresh field jumlah/harga biar up-to-date
  if (elEditId.value) {
    const still = semuaProduk.find((x) => String(x.id) === String(elEditId.value));
    if (still) {
      elEditJumlah.value = Number(still.jumlah ?? 0);
      elEditHarga.value = Number(still.harga ?? 0);
    } else {
      clearEdit();
    }
  }
}

// RENDER TABEL
function tampilkanHasil(data = semuaProduk) {
  const tbody = document.getElementById("daftarStok");
  tbody.innerHTML = "";

  const awal = (halaman - 1) * perHalaman;
  const akhir = awal + perHalaman;
  const dataHalaman = (data || []).slice(awal, akhir);

  if (!dataHalaman.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="muted">Tidak ada data</td>
      </tr>
    `;
    return;
  }

  dataHalaman.forEach((p) => {
    tbody.innerHTML += `
      <tr>
        <td>${p.nama ?? "-"}</td>
        <td>${p.kode ?? "-"}</td>
        <td style="font-weight:800;">${p.jumlah ?? 0}</td>
        <td>Rp ${(p.harga ?? 0).toLocaleString("id-ID")}</td>
        <td>
          <button type="button" data-action="edit" data-id="${p.id}">Ubah</button>
          <button type="button" data-action="hapus" data-id="${p.id}">Hapus</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("halamanSekarang").textContent = String(halaman);
}

// PERINGATAN STOK MINIMUM (RAPI + TOGGLE)
function tampilkanPeringatan() {
  const div = document.getElementById("peringatan");
  if (!div) return;

  const stokRendah = semuaProduk
    .filter((p) => p.stok_minimum != null && Number(p.jumlah ?? 0) < Number(p.stok_minimum))
    .sort((a, b) => (Number(a.jumlah ?? 0) - Number(a.stok_minimum)) - (Number(b.jumlah ?? 0) - Number(b.stok_minimum)));

  if (!stokRendah.length) {
    div.innerHTML = "";
    div.style.display = "none";
    return;
  }

  div.style.display = "block";

  const limit = 5;
  const list = peringatanShowAll ? stokRendah : stokRendah.slice(0, limit);

  const itemsHtml = list.map((p) => {
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
            ${nama}
            <span style="font-weight:700; color: var(--muted);">(${kode})</span>
          </div>
          <div style="color: #ffd6d6; font-weight:800;">
            Sisa: ${sisa} • Minimum: ${min}
          </div>
        </div>
      </li>
    `;
  }).join("");

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

// PAGINATION
function sebelumnya() {
  if (halaman > 1) {
    halaman--;
    tampilkanHasil();
  }
}

function berikutnya() {
  if (halaman * perHalaman < semuaProduk.length) {
    halaman++;
    tampilkanHasil();
  }
}

// SEARCH
document.getElementById("cariInput").addEventListener("input", function () {
  const keyword = (this.value || "").toLowerCase();
  halaman = 1;

  const hasil = semuaProduk.filter(
    (p) =>
      (p.nama || "").toLowerCase().includes(keyword) ||
      (p.kode || "").toLowerCase().includes(keyword)
  );

  tampilkanHasil(hasil);
});

// BUTTON EVENTS
document.getElementById("btnPrev").addEventListener("click", sebelumnya);
document.getElementById("btnNext").addEventListener("click", berikutnya);

// DELEGASI AKSI TABEL
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
    tampilkanStok();
  }
});

// EDIT PANEL EVENTS
btnBatalEdit.addEventListener("click", clearEdit);
btnClearEdit.addEventListener("click", clearEdit);

btnSimpanEdit.addEventListener("click", async () => {
  const id = elEditId.value;
  if (!id) return;

  const jumlah = Number(elEditJumlah.value);
  const harga = Number(elEditHarga.value);

  if (!Number.isFinite(jumlah) || jumlah < 0) return alert("Jumlah harus angka >= 0");
  if (!Number.isFinite(harga) || harga < 0) return alert("Harga harus angka >= 0");

  btnSimpanEdit.disabled = true;

  try {
    const { error, data } = await db
      .from("products")
      .update({ jumlah, harga })
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

// INIT
clearEdit();
tampilkanStok();