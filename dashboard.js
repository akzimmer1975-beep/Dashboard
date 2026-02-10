// ===============================
// KONFIGURATION
// ===============================
const API_BASE = "https://nextcloud-backend1.onrender.com";
const API_STATUS = `${API_BASE}/api/status`;

// ===============================
// STATE
// ===============================
let alleBetriebe = [];
let gefilterteBetriebe = [];

let ampelFilter = "alle";
let bezirkFilter = "";

// Virtual Scrolling
const ROW_HEIGHT = 80; // Karte + evtl. Header
const BUFFER = 5;

let grid, spacer, viewport;

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  grid = document.getElementById("grid");

  if (!grid) {
    console.error("GRID nicht gefunden");
    return;
  }

  grid.innerHTML = "";
  grid.style.overflowY = "auto";

  spacer = document.createElement("div");
  viewport = document.createElement("div");
  viewport.style.position = "relative";

  grid.appendChild(spacer);
  grid.appendChild(viewport);

  grid.addEventListener("scroll", renderVirtual);

  loadStatus();
});

// ===============================
// DATEN LADEN
// ===============================
function loadStatus() {
  grid.textContent = "Lade Statusdaten…";

  fetch(API_STATUS)
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(data => {
      alleBetriebe = Array.isArray(data) ? data : [];
      fillBezirkFilter(alleBetriebe);
      applyFilter();
    })
    .catch(err => {
      console.error("STATUS FETCH ERROR:", err);
      grid.textContent = "Fehler beim Laden der Statusdaten";
    });
}

// ===============================
// FILTER
// ===============================
function setAmpelFilter(farbe) {
  ampelFilter = farbe;
  applyFilter();
}

function applyFilter() {
  const select = document.getElementById("bezirkFilter");
  bezirkFilter = select ? select.value : "";

  gefilterteBetriebe = alleBetriebe.filter(b => {
    if (bezirkFilter && b.bezirk !== bezirkFilter) return false;
    if (ampelFilter !== "alle" && b.ampel !== ampelFilter) return false;
    return true;
  });

  // Sortierung: Bezirk → BKZ
  gefilterteBetriebe.sort((a, b) => {
    if (a.bezirk !== b.bezirk) {
      return a.bezirk.localeCompare(b.bezirk);
    }
    return a.bkz.localeCompare(b.bkz);
  });

  renderSummary(gefilterteBetriebe);

  spacer.style.height = `${gefilterteBetriebe.length * ROW_HEIGHT}px`;
  grid.scrollTop = 0;
  renderVirtual();
}

// ===============================
// VIRTUAL SCROLL RENDER
// ===============================
function renderVirtual() {
  if (!gefilterteBetriebe.length) {
    viewport.innerHTML = "Keine Betriebe gefunden";
    return;
  }

  const scrollTop = grid.scrollTop;
  const viewHeight = grid.clientHeight;

  const start = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - BUFFER
  );
  const end = Math.min(
    gefilterteBetriebe.length,
    Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + BUFFER
  );

  viewport.innerHTML = "";
  viewport.style.transform = `translateY(${start * ROW_HEIGHT}px)`;

  let lastBezirk = null;

  for (let i = start; i < end; i++) {
    const b = gefilterteBetriebe[i];

    // Bezirksüberschrift
    if (b.bezirk !== lastBezirk) {
      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = b.bezirk;
      viewport.appendChild(header);
      lastBezirk = b.bezirk;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.ampel = b.ampel;

    card.innerHTML = `
      <span class="ampel ${b.ampel}"></span>
      <strong>BKZ ${b.bkz}</strong>
      <span class="meta">
        ${statusText(b.ampel)} · ${b.files} Datei(en)
      </span>
    `;

    viewport.appendChild(card);
  }
}

// ===============================
// SUMMARY
// ===============================
function renderSummary(liste) {
  const el = document.getElementById("summary");
  if (!el) return;

  const g = liste.filter(b => b.ampel === "gruen").length;
  const y = liste.filter(b => b.ampel === "gelb").length;
  const r = liste.filter(b => b.ampel === "rot").length;

  el.textContent =
    `Gesamt: ${liste.length} | 🟢 ${g} | 🟡 ${y} | 🔴 ${r}`;
}

// ===============================
// BEZIRKSFILTER
// ===============================
function fillBezirkFilter(liste) {
  const select = document.getElementById("bezirkFilter");
  if (!select) return;

  select.querySelectorAll("option:not([value=''])").forEach(o => o.remove());

  [...new Set(liste.map(b => b.bezirk))]
    .sort()
    .forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      select.appendChild(opt);
    });
}

// ===============================
// HELPER
// ===============================
function statusText(a) {
  if (a === "gruen") return "Wahl beendet";
  if (a === "gelb") return "Wahlvorbereitung";
  return "Noch nichts geschehen";
}
