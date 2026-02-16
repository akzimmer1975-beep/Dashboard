let alleBetriebe = [];
let betriebeMap = {};   // BKZ -> Betriebsname
let ampelFilter = "";

// -----------------------------
// INIT
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "flex";

  await loadBetriebeNamen();     // BKZ -> Betriebsname aus betrieb.json
  loadDataFromLocalStorage();    // Dashboard-Daten (API Status)
  fillBezirkFilter();
  initAmpelFilterButtons();
  renderDashboard();

  if (overlay) overlay.style.display = "none";
});

// -----------------------------
// BETRIEBE.JSON LADEN
// -----------------------------
async function loadBetriebeNamen() {
  try {
    const res = await fetch("/api/betriebe-json"); // liefert JSON aus Excel
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();

    // Map BKZ -> Betriebsname
    data.forEach(b => {
      betriebeMap[b.bkz] = b.betrieb;
    });

    console.log("betriebe.json geladen:", Object.keys(betriebeMap).length);

  } catch(e) {
    console.error("betriebe.json nicht geladen:", e);
  }
}

// -----------------------------
// DASHBOARD DATEN
// -----------------------------
function loadDataFromLocalStorage() {
  const data = localStorage.getItem("apiData");
  alleBetriebe = data ? JSON.parse(data) : [];
}

// -----------------------------
// BEZIRK FILTER
// -----------------------------
function fillBezirkFilter() {
  const select = document.getElementById("bezirkFilter");
  if (!select) return;

  select.innerHTML = `<option value="">Alle Bezirke</option>`;

  [...new Set(alleBetriebe.map(b => b.bezirk))]
    .sort()
    .forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      select.appendChild(opt);
    });

  select.addEventListener("change", renderDashboard);
}

// -----------------------------
// AMPEL FILTER BUTTONS
// -----------------------------
function initAmpelFilterButtons() {
  document.querySelectorAll(".ampel-filter .ampel-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ampel-btn").forEach(b => b.classList.remove("active"));
      const val = btn.dataset.filter;
      ampelFilter = val;
      if(val) btn.classList.add("active");
      renderDashboard();
    });
  });
}

// -----------------------------
// RENDER DASHBOARD
// -----------------------------
function renderDashboard() {
  const grid = document.getElementById("grid");
  if (!grid) return;

  grid.innerHTML = "";

  const bezirk = document.getElementById("bezirkFilter").value;

  let filtered = [...alleBetriebe];

  if (bezirk) filtered = filtered.filter(b => b.bezirk === bezirk);
  if (ampelFilter) filtered = filtered.filter(b => b.ampel === ampelFilter);

  let lastBezirk = null;

  filtered.forEach(b => {
    if (b.bezirk !== lastBezirk) {
      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = b.bezirk;
      grid.appendChild(header);
      lastBezirk = b.bezirk;
    }

    const card = document.createElement("div");
    card.className = "card";

    const amp = document.createElement("div");
    amp.textContent = b.ampel === "gruen" ? "🟢" : b.ampel === "gelb" ? "🟡" : "🔴";

    // Betriebsname aus Map holen
    const name = betriebeMap[b.bkz] ? ` – ${betriebeMap[b.bkz]}` : "";

    const bkz = document.createElement("a");
    bkz.className = "bkz-link";
    bkz.href = `marker.html?bezirk=${encodeURIComponent(b.bezirk)}&bkz=${encodeURIComponent(b.bkz)}`;
    bkz.target = "_blank";
    bkz.textContent = `BKZ ${b.bkz}${name}`;

    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `(${b.bezirk}) – Dateien: <b>${b.files}</b>`;

    // Karte zusammenbauen
    card.appendChild(amp);
    card.appendChild(bkz);
    card.appendChild(info);

    grid.appendChild(card);
  });

  // Zusammenfassung
  const el = document.getElementById("summary");
  if (el) {
    const g = filtered.filter(b => b.ampel === "gruen").length;
    const y = filtered.filter(b => b.ampel === "gelb").length;
    const r = filtered.filter(b => b.ampel === "rot").length;
    el.textContent = `Gesamt: ${filtered.length} | 🟢 ${g} | 🟡 ${y} | 🔴 ${r}`;
  }
}
