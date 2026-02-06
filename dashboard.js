const API = "https://nextcloud-backend1.onrender.com/api/status";

let alleBetriebe = [];

fetch(API)
  .then(r => r.json())
  .then(daten => {
    alleBetriebe = daten.map(b => ({
      ...b,
      ampel: berechneAmpel(b.files)
    }));
    render(alleBetriebe);
  })
  .catch(() => {
    document.getElementById("grid").textContent =
      "Fehler beim Laden der Statusdaten";
  });

function berechneAmpel(files = []) {
  if (files.some(f => f.includes("niederschrift"))) return "gruen";
  if (
    files.some(f => f.includes("wahlausschreiben")) ||
    files.some(f => f.includes("wahlvorschlag"))
  ) return "gelb";
  return "rot";
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
        <strong>${b.bkz}</strong> – ${b.bezirk}
      </div>
      <div class="meta">
        Dateien: ${b.files.length}
      </div>
    `;

    grid.appendChild(div);
  });
}

function filterAmpel(farbe) {
  if (farbe === "alle") {
    render(alleBetriebe);
    return;
  }
  render(alleBetriebe.filter(b => b.ampel === farbe));
}
