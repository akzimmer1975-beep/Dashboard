const API_STATUS = "https://nextcloud-backend1.onrender.com/api/status";

let alleBetriebe = [];

fetch(API_STATUS)
  .then(r => r.json())
  .then(daten => {
    alleBetriebe = daten;
    renderSummary(daten);
    render(daten);
  })
  .catch(() => {
    document.getElementById("grid").textContent =
      "Fehler beim Laden der Statusdaten";
  });

function renderSummary(liste) {
  const gesamt = liste.length;
  const gruen = liste.filter(b => b.ampel === "gruen").length;
  const gelb  = liste.filter(b => b.ampel === "gelb").length;
  const rot   = liste.filter(b => b.ampel === "rot").length;

  document.getElementById("summary").textContent =
    `Gesamt: ${gesamt} | 🟢 ${gruen} | 🟡 ${gelb} | 🔴 ${rot}`;
}

function render(liste) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  liste.forEach(b => {
    const div = document.createElement("div");
    div.className = "card";
    div.dataset.ampel = b.ampel;

    div.innerHTML = `
      <div>
        <span class="ampel ${b.ampel}"></span>
        <strong>BKZ ${b.bkz}</strong> – ${b.bezirk}
      </div>
      <div class="meta">
        Status: ${statusText(b.ampel)}<br>
        Dateien: ${b.files}
      </div>
    `;

    grid.appendChild(div);
  });
}

function filterAmpel(farbe) {
  if (farbe === "alle") {
    render(alleBetriebe);
  } else {
    render(alleBetriebe.filter(b => b.ampel === farbe));
  }
}

function statusText(a) {
  if (a === "gruen") return "Wahl beendet";
  if (a === "gelb")  return "Wahlvorbereitung";
  return "Noch nichts geschehen";
}
