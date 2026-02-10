// ===============================
// KONFIGURATION
// ===============================
const API_BASE = "https://DEIN-RENDER-SERVICE.onrender.com";
const API_STATUS = `${API_BASE}/api/status`;

// ===============================
// STATE
// ===============================
let alleBetriebe = [];
let gefilterteBetriebe = [];

let ampelFilter = "alle";
let bezirkFilter = "";

// Virtual Scroll
const ROW_HEIGHT = 70;      // Höhe einer Karte
const BUFFER = 5;           // extra Elemente ober/unterhalb
let container, spacer, viewport;

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  container = document.getElementById("grid");

  viewport = document.createElement("div");
  viewport.style.position = "relative";

  spacer = document.createElement("div");

  container.innerHTML = "";
  container.appendChild(spacer);
  container.appendChild(viewport);

  container.addEventListener("scroll", renderVirtual);

  loadData();
});

function loadData() {
  container.textContent = "Lade Statusdaten…";

  fetch(API_STATUS)
    .then(r => r.json())
    .then(daten => {
      alleBetriebe = daten;
      fillBezirkFilter(daten);
      applyFilter();
    })
    .catch(err => {
      console.error(err);
      container.textContent = "Fehler beim Laden der Statusdaten";
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
  const sel = document.getElementById("bezirkFilter");
  bezirkFilter = sel ? sel.value : "";

  gefilterteBetriebe = alleBetriebe.filter(b => {
    if (bezirkFilter && b.bezirk !== bezirkFilter) return false;
    if (ampelFilter !== "alle" && b.ampel !== ampelFilter) return false;
    return true;
  });

  // Sortierung: Bezirk → BKZ
  gefilterteBetriebe.sort((a, b) => {
    if (a.bezirk !== b.bezirk) return a.bezirk.localeCompare(b.bezirk);
    return a.bkz.localeCompare(b.bkz);
  });

  renderSummary(gefilterteBetriebe);
  spacer.style.height = `${gefilterteBetriebe.length * ROW_HEIGHT}px`;
  container.scrollTop = 0;
  renderVirtual();
}

// ===============================
// VIRTUAL SCROLL RENDERING
// ===============================
function renderVirtual() {
  const scrollTop = container.scrollTop;
  const height = container.clientHeight;

  const start = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - BUFFER
  );

  const end = Math.min(
    gefilterteBetriebe.length,
    Math.ceil((scrollTop + height) / ROW_HEIGHT) + BUFFER
  );

  viewport.innerHTML = "";
  viewport.style.transform = `translateY(${start * ROW_HEIGHT}px)`;

  let lastBezirk = null;

  for (let i = start; i < end; i++) {
    const b = gefilterteBetriebe[i];

    // === Bezirks-Überschrift ===
    if (b.bezirk !== lastBezirk) {
      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = b.bezirk;
      viewport.appendChild(header);
      lastBezirk = b.bezirk;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.style.height = `${ROW_HEIGHT - 10}px`;

    card.innerHTML = `
      <span class="ampel ${b.ampel}"></span>
      <strong>BKZ ${b.bkz}</strong>
      <span class="meta">
        ${statusText(b.ampel)} · ${b.files} Dateien
      </span>
    `;

    viewport.appendChild(card);
  }
}

// ===============================
// SUMMARY
// ===============================
function renderSummary(liste) {
  const sum = document.getElementById("summary");
  if (!sum) return;

  const g = liste.filter(b => b.ampel === "gruen").length;
  const y = liste.filter(b => b.ampel === "gelb").length;
  const r = liste.filter(b => b.ampel === "rot").length;

  sum.textContent =
    `Gesamt: ${liste.length} | 🟢 ${g} | 🟡 ${y} | 🔴 ${r}`;
}

// ===============================
// BEZIRK DROPDOWN
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
