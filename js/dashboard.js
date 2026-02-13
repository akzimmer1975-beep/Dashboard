let alleBetriebe = [];
let ampelFilter = [];   // Multi-Ampel-Filter

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("overlay").style.display = "flex";
  loadDataFromLocalStorage();
  fillBezirkFilter();
  renderDashboard();
  document.getElementById("overlay").style.display = "none";
});

// ---------------- DATA ----------------
function loadDataFromLocalStorage() {
  const data = localStorage.getItem("apiData");
  alleBetriebe = data ? JSON.parse(data) : [];
}

// ---------------- FILTER ----------------
function fillBezirkFilter() {
  const select = document.getElementById("bezirkFilter");
  select.innerHTML = `<option value="">Alle Bezirke</option>`;

  [...new Set(alleBetriebe.map(b => b.bezirk))]
    .sort()
    .forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      select.appendChild(opt);
    });
}

function applyFilter(){
  renderDashboard();
}

function toggleAmpel(farbe){
  if(ampelFilter.includes(farbe)){
    ampelFilter = ampelFilter.filter(f => f !== farbe);
  } else {
    ampelFilter.push(farbe);
  }
  renderDashboard();
}

function clearFilter(){
  ampelFilter = [];
  document.getElementById("bezirkFilter").value = "";
  renderDashboard();
}

// ---------------- RENDER ----------------
function renderDashboard() {
  const list = document.getElementById("listContainer");
  list.innerHTML = "";

  const bezirkFilter = document.getElementById("bezirkFilter").value;
  let filtered = alleBetriebe;

  if (bezirkFilter) {
    filtered = filtered.filter(b => b.bezirk === bezirkFilter);
  }

  if (ampelFilter.length > 0) {
    filtered = filtered.filter(b => ampelFilter.includes(b.ampel));
  }

  let lastBezirk = null;
  const fragment = document.createDocumentFragment();

  filtered.forEach(b => {

    if (b.bezirk !== lastBezirk) {
      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = b.bezirk;
      fragment.appendChild(header);
      lastBezirk = b.bezirk;
    }

    const card = document.createElement("div");
    card.className = "card-row";

    // Ampel (nur Anzeige)
    const ampBtn = document.createElement("div");
    ampBtn.className = `ampel-btn ${b.ampel}`;
    ampBtn.textContent =
      b.ampel === "gruen" ? "🟢" :
      b.ampel === "gelb" ? "🟡" :
      b.ampel === "rot"  ? "🔴" : "";

    // BKZ
    const bkzLink = document.createElement("a");
    bkzLink.href = `../marker.html?bezirk=${encodeURIComponent(b.bezirk)}&bkz=${encodeURIComponent(b.bkz)}`;
    bkzLink.textContent = `BKZ ${b.bkz}`;
    bkzLink.target = "_blank";
    bkzLink.className = "bkz-link";

    // Info
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `(${b.bezirk}) – Dateien: <b>${b.files}</b>`;

    card.appendChild(ampBtn);
    card.appendChild(bkzLink);
    card.appendChild(info);

    fragment.appendChild(card);
  });

  list.appendChild(fragment);

  updateSummaryUI();
}

// ---------------- UI STATE ----------------
function updateSummaryUI(){
  document.querySelectorAll(".sum-btn").forEach(btn=>{
    btn.classList.remove("active");
  });

  ampelFilter.forEach(f=>{
    const btn = document.querySelector(`.sum-btn.${f}`);
    if(btn) btn.classList.add("active");
  });
}
