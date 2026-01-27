// js/ui.js
// Tampilkan tanggal + jam (WITA) di elemen #waktuUpdate kalau ada.

(function () {
  function formatWITA() {
    const now = new Date();

    const tanggal = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);

    const jam = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    return `${tanggal} • ${jam}`;
  }

  function update() {
    const el = document.getElementById("waktuUpdate");
    if (!el) return;
    el.textContent = formatWITA();
  }

  function start() {
    update();

    // cegah interval dobel kalau file kepanggil 2x
    if (window.__waktuInterval) clearInterval(window.__waktuInterval);
    window.__waktuInterval = setInterval(update, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();