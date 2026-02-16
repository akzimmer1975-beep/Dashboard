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
// RENDER STATUS MIT BEZIRKS-ÜBERSCHRIFTEN
// ============================
function renderStatus() {
  const container = $("status-list");
  if (!container) return;
  container.innerHTML = "";

  let filtered = statusData;

  // Filtern nach Bezirk
  if (bezirkFilter) filtered = filtered.filter(e => e.bezirk === bezirkFilter);
  // Filtern nach Ampel
  if (ampelFilter) filtered = filtered.filter(e => e.ampel === ampelFilter);

  // Gruppieren nach Bezirk
  const grouped = {};
  filtered.forEach(e => {
    if (!grouped[e.bezirk]) grouped[e.bezirk] = [];
    grouped[e.bezirk].push(e);
  });

  Object.keys(grouped).sort().forEach(bezirk => {
    // Bezirk-Header
    const header = document.createElement("div");
    header.className = "bezirk-header";
    header.textContent = bezirk || "–";
    container.appendChild(header);

    grouped[bezirk].forEach(entry => {
      const div = document.createElement("div");
      div.className = "card";

      const color = entry.ampel === "gruen" ? "#43a047" :
                    entry.ampel === "gelb"  ? "#fbc02d" :
                    "#e53935";
      const ampCircle = `<span class="ampel" style="background-color:${color}"></span>`;

      const betriebEntry = betriebData.find(b => b.bkz === entry.bkz);
      const betriebName = betriebEntry ? betriebEntry.betrieb : "–";

      div.innerHTML = `
        <div class="bkz-link">${ampCircle} ${entry.bkz}</div>
        <div class="betrieb">${betriebName}</div>
        <div class="files">${entry.files} / ${entry.bezirk}</div>
      `;
      container.appendChild(div);
    });
  });
}

// ============================
// FILTER HANDLER
// ============================
function setupFilters() {
  const bezirkEl = $("bezirkFilter");
  if (!bezirkEl) return;

  function populateBezirkOptions() {
    const bezirke = [...new Set(statusData.map(s => s.bezirk))].sort();
    bezirkEl.innerHTML = `<option value="">Alle Bezirke</option>`;
    bezirke.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      bezirkEl.appendChild(opt);
    });
  }

  populateBezirkOptions();

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
  }, 30000);
});
