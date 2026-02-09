// ===============================
// KONFIGURATION
// ===============================
const API_BASE = "https://nexrcloud-backend-2.onrender.com";
const API_STATUS = `${API_BASE}/api/status`;

// ===============================
// STATE
// ===============================
let alleBetriebe = [];
let ampelFilter = "alle";
let bezirkFilter = "";

// ===============================
// INIT
// ===============================
fetch(API_STATUS)
  .then(res => res.json())
  .then(daten => {
    alleBetriebe = daten;

    fillBezirkFilter(daten);
    renderSummary(daten);
    render(daten);
  })
  .catch(err => {
    console.error("STATUS FETCH ERROR:", err);
    const grid = document.getElementById("grid");
    if (grid) grid.textContent = "Fehler beim Laden der Statusdaten";
  });

// ===============================
// BEZIRK FILTER FÜLLEN
// ===============================
function fillBezirkFilter(liste) {
  const select = document.getElementById("bezirkFilter");
  if (!select) return;

  // bestehende (außer 'Alle') löschen
  select.querySelectorAll("option:not([value=''])").forEach(o => o.remove());

  const bezirke = [...new Set(liste.map(b => b.bezirk))].sort();

  bezirke.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

// ===============================
// FILTER STEUERN
// ===============================
function setAmpelFilter(farbe) {
  ampelFilter = farbe;
  applyFilter();
}

function applyFilter() {
  const sel = document.getElementById("bezirkFilter");
  bezirkFilter = sel ? sel.value : "";

  let liste = [...alleBetriebe];

  if (bezirkFilter) {
    liste = liste.filter(b => b.bezirk === bezirkFilter);
  }

  if (ampelFilter !== "alle") {
    liste = liste.filter(b => b.ampel === ampelFilter);
  }

  renderSummary(liste);
  render(liste);
}

// ===============================
// SUMMARY
// ===============================
function renderSummary(liste) {
  const sum = document.getElementById("summary");
  if (!sum) return;

  const total = liste.length;
  const gruen = liste.filter(b => b.ampel === "gruen").length;
  const gelb  = liste.filter(b => b.ampel === "gelb").length;
  const rot   = liste.filter(b => b.ampel === "rot").length;

  sum.textContent =
    `Gesamt: ${total} | 🟢 ${gruen} | 🟡 ${gelb} | 🔴 ${rot}`;
}

// ===============================
// RENDER GRID
// ===============================
function render(liste) {
  const grid = document.getElementById("grid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!liste.length) {
    grid.textContent = "Keine Betriebe gefunden";
    return;
  }

  liste.forEach(b => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.ampel = b.ampel;

    card.innerHTML = `
      <div>
        <span class="ampel ${b.ampel}"></span>
        <strong>BKZ ${b.bkz}</strong> – ${b.bezirk}
      </div>
