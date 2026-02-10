const API_STATUS = "https://nexrcloud-backend-2.onrender.com/api/status";

let alleBetriebe = [];
let bezirkFilter = "";

// -----------------------------
// INIT
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadStatusDashboard();
  fillBezirkFilter();
  renderDashboard();
});

// -----------------------------
// LOAD DATA
// -----------------------------
async function loadStatusDashboard() {
  const overlay = document.getElementById("overlay");
  overlay.style.display = "flex";

  try {
    const res = await fetch(API_STATUS);
    const data = await res.json();
    alleBetriebe = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fehler beim Laden:", err);
  } finally {
    overlay.style.display = "none";
  }
}

// -----------------------------
// BEZIRK-FILTER FÜLLEN
// -----------------------------
function fillBezirkFilter() {
  const select = document.getElementById("bezirkFilter");
  [...new Set(alleBetriebe.map(b => b.bezirk))].sort().forEach(b => {
    const opt = document.createElement("option");
    opt.value = b; opt.textContent = b;
    select.appendChild(opt);
  });
}

// -----------------------------
// DASHBOARD RENDER
// -----------------------------
function renderDashboard() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  let lastBezirk = null;
  const fragment = document.createDocumentFragment();

  alleBetriebe.forEach(b => {
    // Bezirksüberschrift
    if (b.bezirk !== lastBezirk) {
      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = b.bezirk;
      fragment.appendChild(header);
      lastBezirk = b.bezirk;
    }

    // Betriebskarte
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <strong>BKZ ${b.bkz}</strong> (${b.bezirk})<br>
      Dateien: ${b.files}<br>
      <button class="ampel-btn ${b.ampel}" onclick="goToIndex('${b.ampel}','${b.bezirk}')">
        ${b.ampel === 'gruen' ? '🟢' : b.ampel === 'gelb' ? '🟡' : b.ampel === 'rot' ? '🔴' : 'Alle'}
      </button>
    `;
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  // Summary
  const el = document.getElementById("summary");
  const g = alleBetriebe.filter(b => b.ampel === "gruen").length;
  const y = alleBetriebe.filter(b => b.ampel === "gelb").length;
  const r = alleBetriebe.filter(b => b.ampel === "rot").length;
  el.textContent = `Gesamt: ${alleBetriebe.length} | 🟢 ${g} | 🟡 ${y} | 🔴 ${r}`;
}

// -----------------------------
// FILTER -> INDEX.HTML
// -----------------------------
function setAmpelFilter(farbe) {
  const bezirk = document.getElementById("bezirkFilter").value;
  goToIndex(farbe, bezirk);
}

function applyFilter() {
  const amp = "alle"; // default alle beim Bezirkfilter
  const bezirk = document.getElementById("bezirkFilter").value;
  goToIndex(amp, bezirk);
}

// Weiterleitung zur Index-Seite mit Parametern
function goToIndex(ampel, bezirk) {
  const params = new URLSearchParams();
  if (ampel && ampel !== "alle") params.set("ampel", ampel);
  if (bezirk) params.set("bezirk", bezirk);
  window.location.href = `index.html?${params.toString()}`;
}

// -----------------------------
// DASHBOARD RENDER
// -----------------------------
function renderDashboard() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  let lastBezirk = null;
  const fragment = document.createDocumentFragment();

  alleBetriebe.forEach(b => {
    // Bezirksüberschrift
    if (b.bezirk !== lastBezirk) {
      const header = document.createElement("div");
      header.className = "bezirk-header";
      header.textContent = b.bezirk;
      fragment.appendChild(header);
      lastBezirk = b.bezirk;
    }

    // Betriebskarte
    const card = document.createElement("div");
    card.className = "card";

    // BKZ als Link zu marker.html
    const bkzLink = document.createElement("a");
    bkzLink.href = `marker.html?bezirk=${encodeURIComponent(b.bezirk)}&bkz=${encodeURIComponent(b.bkz)}`;
    bkzLink.textContent = `BKZ ${b.bkz}`;
    bkzLink.target = "_blank"; // optional: öffnet in neuem Tab

    // Ampel-Button
    const ampBtn = document.createElement("button");
    ampBtn.className = `ampel-btn ${b.ampel}`;
    ampBtn.textContent = b.ampel === 'gruen' ? '🟢' : b.ampel === 'gelb' ? '🟡' : b.ampel === 'rot' ? '🔴' : 'Alle';
    ampBtn.onclick = () => goToIndex(b.ampel, b.bezirk);

    // Card Inhalt
    card.appendChild(bkzLink);
    card.insertAdjacentHTML('beforeend', ` (${b.bezirk}) - Dateien: ${b.files} `);
    card.appendChild(ampBtn);

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  // Summary
  const el = document.getElementById("summary");
  const g = alleBetriebe.filter(b => b.ampel === "gruen").length;
  const y = alleBetriebe.filter(b => b.ampel === "gelb").length;
  const r = alleBetriebe.filter(b => b.ampel === "rot").length;
  el.textContent = `Gesamt: ${alleBetriebe.length} | 🟢 ${g} | 🟡 ${y} | 🔴 ${r}`;
}
