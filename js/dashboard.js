// ============================
// CONFIG
// ============================
const apiStatus = "https://nexrcloud-backend-2.onrender.com/api/status";
const apiBetriebe = "https://nexrcloud-backend-2.onrender.com/api/betriebe-json";

function $(id) { return document.getElementById(id); }

// ============================
// GLOBALS
// ============================
let betriebData = [];
let statusData = [];
let bezirkFilter = "";
let ampelFilter = "";

// ============================
// LOAD BETRIEBE.JSON
// ============================
async function loadBetriebeNamen() {
  try {
    const res = await fetch(apiBetriebe);
    if (!res.ok) throw new Error(res.status);
    betriebData = await res.json();
  } catch (err) {
    console.error("betriebe.json nicht geladen:", err);
    betriebData = [];
  }
}

// ============================
// LOAD STATUS
// ============================
async function loadStatus() {
  const container = $("status-list");
  if (!container) return;

  container.innerHTML = "<p>Lade Daten…</p>";

  try {
    const res = await fetch(apiStatus);
    if (!res.ok) throw new Error(res.status);
    statusData = await res.json();

    renderStatus();
  } catch (err) {
    console.error("Status konnte nicht geladen werden:", err);
    container.innerHTML = "<p>Fehler beim Laden der Statusdaten</p>";
  }
}

// ============================
// RENDER FILTERED STATUS
// ============================
function renderStatus() {
  const container = $("status-list");
  if (!container) return;

  container.innerHTML = "";

  let filtered = statusData;

  // Bezirk filtern
  if (bezirkFilter) {
    filtered = filtered.filter(e => e.bezirk === bezirkFilter);
  }

  // Ampel filtern
  if (ampelFilter) {
    filtered = filtered.filter(e => e.ampel === ampelFilter);
  }

  filtered.sort((a,b) => a.bezirk.localeCompare(b.bezirk) || a.bkz.localeCompare(b.bkz));

  filtered.forEach(entry => {
    const div = document.createElement("div");
    div.className = "status-row";

    const color = entry.ampel === "gruen" ? "#43a047" :
                  entry.ampel === "gelb"  ? "#fbc02d" :
                  "#e53935";

    const ampCircle = `<span class="ampel" style="background-color:${color}"></span>`;

    const betriebEntry = betriebData.find(b => b.bkz === entry.bkz);
    const betriebName = betriebEntry ? betriebEntry.betrieb : "–";

    div.innerHTML = `
      <div class="bkz">${ampCircle} ${entry.bkz}</div>
      <div class="betrieb">${betriebName}</div>
      <div class="files">${entry.files} / ${entry.bezirk}</div>
    `;
    container.appendChild(div);
  });
}

// ============================
// FILTER HANDLER
// ============================
function setupFilters() {
  const bezirkEl = $("bezirkFilter");
  if (!bezirkEl) return;

  // Bezirk options befüllen
  const bezirke = [...new Set(statusData.map(s => s.bezirk))].sort();
  bezirke.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    bezirkEl.appendChild(opt);
  });

  bezirkEl.addEventListener("change", () => {
    bezirkFilter = bezirkEl.value;
    renderStatus();
  });

  // Ampel Buttons
  document.querySelectorAll(".ampel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ampel-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      ampelFilter = btn.dataset.filter;
      renderStatus();
    });
  });
}

// ============================
// INIT
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadBetriebeNamen();
  await loadStatus();
  setupFilters();

  // Refresh alle 30 Sekunden
  setInterval(async () => {
    await loadStatus();
    setupFilters();
  }, 30000);
});
