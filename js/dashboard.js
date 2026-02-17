// ============================
// CONFIG
// ============================
const apiFiles    = "https://nexrcloud-backend-2.onrender.com/api/files";
const apiUpload   = "https://nexrcloud-backend-2.onrender.com/api/upload";
const apiStatus   = "https://nexrcloud-backend-2.onrender.com/api/status";
const apiBetriebe = "https://nexrcloud-backend-2.onrender.com/api/betriebe-json";

// Helper
function $(id){ return document.getElementById(id); }

// ============================
// GLOBALS
// ============================
let betriebData  = [];
let statusData   = [];
let filterBezirk = "";
let filterAmpel  = "";

// ============================
// LOAD BETRIEBE.JSON
// ============================
async function loadBetriebeNamen(){
  try{
    const res = await fetch(apiBetriebe);
    if(!res.ok) throw new Error(res.status);
    betriebData = await res.json();
  }catch(err){
    console.error("betriebe.json nicht geladen:", err);
    betriebData = [];
  }
}

// ============================
// STATUS / VIRTUAL SCROLL
// ============================
async function loadStatus(){
  const container = $("status-list");
  if(!container) return;

  container.innerHTML = "<p>Lade Daten…</p>";

  try{
    const res = await fetch(apiStatus);
    if(!res.ok) throw new Error(res.status);
    statusData = await res.json();

    populateBezirkDropdown();
    renderStatus();

  }catch(err){
    console.error("Status konnte nicht geladen werden:", err);
    container.innerHTML = "<p>Fehler beim Laden der Statusdaten</p>";
  }
}

// ============================
// BEZIRK DROPDOWN
// ============================
function populateBezirkDropdown(){
  const select = $("bezirkFilter");
  if(!select) return;

  const bezirke = [...new Set(
    statusData
      .map(e => e.bezirk)
      .filter(b => b && b.trim() !== "")
  )].sort((a,b)=>a.localeCompare(b,"de"));

  select.innerHTML = `<option value="">Alle Bezirke</option>`;

  bezirke.forEach(b=>{
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}

// ============================
// RENDER STATUS
// ============================
function renderStatus(){
  const container = $("status-list");
  if(!container) return;
  container.innerHTML = "";

  let filtered = [...statusData];

  if(filterBezirk){
    filtered = filtered.filter(e => e.bezirk === filterBezirk);
  }

  if(filterAmpel){
    filtered = filtered.filter(e => e.ampel === filterAmpel);
  }

  let currentBezirk = null;

  filtered.forEach(entry=>{

    if(entry.bezirk !== currentBezirk){
      currentBezirk = entry.bezirk;

      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = currentBezirk || "–";
      container.appendChild(header);
    }

    const div = document.createElement("div");
    div.className = "card";

    const color =
      entry.ampel === "gruen" ? "#2ecc71" :
      entry.ampel === "gelb"  ? "#f1c40f" :
      "#e74c3c";

    const ampCircle = `<span class="ampel" style="background:${color}"></span>`;

    const betriebEntry = betriebData.find(b => String(b.bkz) === String(entry.bkz));
    const betriebName  = betriebEntry ? betriebEntry.betrieb : "–";

    div.innerHTML = `
      <div class="col-left">
        <a class="bkz-link" href="marker.html?bkz=${entry.bkz}&bezirk=${encodeURIComponent(entry.bezirk)}">
          ${ampCircle} ${entry.bkz}
        </a>
      </div>

      <div class="col-center">
        ${betriebName}
      </div>

      <div class="col-right">
        ${entry.files} | ${entry.bezirk}
      </div>
    `;

    container.appendChild(div);
  });
}

// ============================
// FILTER SETUP
// ============================
function setupFilters(){

  const bezirkSelect = $("bezirkFilter");

  if(bezirkSelect){
    bezirkSelect.addEventListener("change", e=>{
      filterBezirk = e.target.value;
      renderStatus();
    });
  }

  document.querySelectorAll(".ampel-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".ampel-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      filterAmpel = btn.dataset.filter || "";
      renderStatus();
    });
  });
}

// ============================
// INIT
// ============================
document.addEventListener("DOMContentLoaded", async ()=>{

  await loadBetriebeNamen();
  setupFilters();
  await loadStatus();

  // Auto-Refresh
  setInterval(loadStatus, 30000);

});
