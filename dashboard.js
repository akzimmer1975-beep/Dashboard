// ===============================
// KONFIGURATION
// ===============================
const API_BASE = "https://nexrcloud-backend-2.onrender.com"; 
const API_STATUS = `${API_BASE}/api/status`;

const ROW_HEIGHT = 60;  // MUSS mit .card Höhe übereinstimmen
const BUFFER = 5;

// ===============================
// STATE
// ===============================
let alleBetriebe = [];
let gefilterteBetriebe = [];
let ampelFilter = "alle";
let bezirkFilter = "";

let grid, viewport, spacer;

// ===============================
// OVERLAY
// ===============================
function showOverlay(text = "Lade Statusdaten…") {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  overlay.querySelector('div span')?.textContent = text;
}

function hideOverlay() {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;
  overlay.style.display = "none";
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  grid = document.getElementById("grid");
  if (!grid) return console.error("GRID nicht gefunden");

  grid.style.overflowY = "auto";
  grid.style.position = "relative";
  grid.style.height = "70vh";

  const bezirkSelect = document.getElementById("bezirkFilter");
  bezirkSelect?.addEventListener("change", () => {
    bezirkFilter = bezirkSelect.value;
    applyFilter();
  });

  loadStatus();
});

// ===============================
// LADEN STATUS
// ===============================
async function loadStatus() {
  // Grid vorbereiten
  grid.innerHTML = "";
  spacer = document.createElement("div");
  viewport = document.createElement("div");
  viewport.className = "viewport";
  grid.appendChild(spacer);
  grid.appendChild(viewport);

  showOverlay("Lade Statusdaten…");

  try {
    const res = await fetch(API_STATUS);
    if (!res.ok) throw new Error(res.status);

    const data = await res.json();
    alleBetriebe = Array.isArray(data) ? data : [];

    fillBezirkFilter(alleBetriebe);
    applyFilter();

    hideOverlay();
  } catch (err) {
    console.error("STATUS FETCH ERROR:", err);
    showOverlay("Fehler beim Laden der Statusdaten");
  }
}

// ===============================
// FILTER
// ===============================
function setAmpelFilter(farbe) {
  ampelFilter = farbe;
  applyFilter();
}

function applyFilter() {
  gefilterteBetriebe = alleBetriebe.filter(b => {
    if (ampelFilter !== "alle" && b.ampel !== ampelFilter) return false;
    if (bezirkFilter && b.bezirk !== bezirkFilter) return false;
    return true;
  });

  gefilterteBetriebe.sort((a, b) => {
    if (a.bezirk !== b.bezirk) return a.bezirk.localeCompare(b.bezirk);
    return a.bkz.localeCompare(b.bkz);
  });

  renderSummary(gefilterteBetriebe);

  spacer.style.height = `${gefilterteBetriebe.length * ROW_HEIGHT}px`;
  grid.scrollTop = 0;
  renderVirtual();
}

// ===============================
// VIRTUAL SCROLL
// ===============================
function renderVirtual() {
  if (!gefilterteBetriebe.length) {
    viewport.innerHTML = "<div style='padding:10px'>Keine Betriebe gefunden</div>";
    return;
  }

  const scrollTop = grid.scrollTop;
  const viewHeight = grid.clientHeight || 600;

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
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
      <span class="meta">${statusText(b.ampel)} · ${b.files} Datei(en)</span>
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

  el.textContent = `Gesamt: ${liste.length} | 🟢 ${g} | 🟡 ${y} | 🔴 ${r}`;
}

// ===============================
// BEZIRK-FILTER
// ===============================
function fillBezirkFilter(liste) {
  const select = document.getElementById("bezirkFilter");
  if (!select) return;

  select.querySelectorAll("option:not([value=''])").forEach(o => o.remove());

  [...new Set(liste.map(b => b.bezirk))].sort().forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

// ===============================
// HELPER
// ===============================
function statusText(ampel) {
  if (ampel === "gruen") return "Wahl beendet";
  if (ampel === "gelb") return "Wahlvorbereitung";
  return "Noch nichts geschehen";
}
