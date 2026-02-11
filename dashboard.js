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

    // Card
    const card = document.createElement("div");
    card.className = "card card-row";

    // -----------------
    // Ampel Button (links, sticky)
    // -----------------
    const ampBtn = document.createElement("button");
    ampBtn.className = `ampel-btn ${b.ampel}`;
    ampBtn.setAttribute("title", b.ampel.toUpperCase());
    ampBtn.textContent =
      b.ampel === 'gruen' ? '🟢' :
      b.ampel === 'gelb'  ? '🟡' :
      b.ampel === 'rot'   ? '🔴' : 'Alle';

    ampBtn.onclick = () => goToIndex(b.ampel, b.bezirk);

    // -----------------
    // BKZ Link
    // -----------------
    const bkzLink = document.createElement("a");
    bkzLink.href = `marker.html?bezirk=${encodeURIComponent(b.bezirk)}&bkz=${encodeURIComponent(b.bkz)}`;
    bkzLink.textContent = `BKZ ${b.bkz}`;
    bkzLink.target = "_blank";
    bkzLink.className = "bkz-link";

    // -----------------
    // Info
    // -----------------
    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `(${b.bezirk}) – Dateien: <b>${b.files}</b>`;

    // Reihenfolge: Ampel | BKZ | Info
    card.appendChild(ampBtn);
    card.appendChild(bkzLink);
    card.appendChild(info);

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  // -----------------
  // Summary
  // -----------------
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

// -----------------------------
// Weiterleitung zur Index-Seite
// -----------------------------
function goToIndex(ampel, bezirk) {
  const params = new URLSearchParams();
  if (ampel && ampel !== "alle") params.set("ampel", ampel);
  if (bezirk) params.set("bezirk", bezirk);
  window.location.href = `index.html?${params.toString()}`;
}
