// ============================
// CONFIG
// ============================
const apiFiles    = "https://nexrcloud-backend-2.onrender.com/api/files";
const apiUpload   = "https://nexrcloud-backend-2.onrender.com/api/upload";
const apiStatus   = "https://nexrcloud-backend-2.onrender.com/api/status";
const apiBetriebe = "https://nexrcloud-backend-2.onrender.com/api/betriebe-json";

function $(id) { return document.getElementById(id); }

// ============================
// GLOBALS
// ============================
let betriebData = [];
let filterBezirk = "";
let filterAmpel = "";

// ============================
// LOAD BETRIEBE
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
// VIRTUAL SCROLL / STATUS
// ============================
async function loadStatus() {
  const container = $("status-list");
  if (!container) return;

  container.innerHTML = "<p>Lade Daten…</p>";

  try {
    const res = await fetch(apiStatus);
    if (!res.ok) throw new Error(res.status);
    let data = await res.json();

    // Filtern
    let filtered = data.filter(d => {
      const matchBezirk = !filterBezirk || d.bezirk === filterBezirk;
      const matchAmpel = !filterAmpel || d.ampel === filterAmpel;
      return matchBezirk && matchAmpel;
    });

    filtered.sort((a,b) => a.bezirk.localeCompare(b.bezirk) || a.bkz.localeCompare(b.bkz));

    container.innerHTML = "";
    let currentBezirk = null;

    filtered.forEach(entry => {
      // Bezirk-Header
      if (entry.bezirk !== currentBezirk) {
        currentBezirk = entry.bezirk;
        const header = document.createElement("div");
        header.className = "bezirk-header";
        header.textContent = currentBezirk || "–";
        container.appendChild(header);
      }

      const div = document.createElement("div");
      div.className = "card";

      const color = entry.ampel === "gruen" ? "#43a047" :
                    entry.ampel === "gelb"  ? "#fbc02d" :
                                               "#e53935";
      const ampCircle = `<span class="ampel" style="background-color:${color}"></span>`;

      const betriebEntry = betriebData.find(b => b.bkz === entry.bkz);
      const betriebName = betriebEntry ? betriebEntry.betrieb : "–";

      div.innerHTML = `
        <div class="bkz-link">
          <a href="marker.html?bkz=${entry.bkz}&bezirk=${encodeURIComponent(entry.bezirk)}" target="_blank">
            ${ampCircle} ${entry.bkz}
          </a>
        </div>
        <div class="betrieb">${betriebName}</div>
        <div class="files">${entry.files} / ${entry.bezirk}</div>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error("Status konnte nicht geladen werden:", err);
    container.innerHTML = "<p>Fehler beim Laden der Statusdaten</p>";
  }
}

// ============================
// FILTERS
// ============================
function setupFilters() {
  const bezirkSelect = $("bezirkFilter");
  if (!bezirkSelect) return;

  // Bezirke aus Betrieben
  const bezirke = [...new Set(betriebData.map(b => b.bezirk).filter(b => b))].sort();
  bezirke.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    bezirkSelect.appendChild(opt);
  });

  bezirkSelect.addEventListener("change", e => {
    filterBezirk = e.target.value;
    loadStatus();
  });

  document.querySelectorAll(".ampel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ampel-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterAmpel = btn.dataset.filter || "";
      loadStatus();
    });
  });
}

// ============================
// INIT
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadBetriebeNamen();
  setupFilters();
  loadStatus();

  // Refresh alle 30 Sekunden
  setInterval(loadStatus, 30000);
});
