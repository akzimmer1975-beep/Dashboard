// ============================
// CONFIG
// ============================
const apiFiles   = "https://nexrcloud-backend-2.onrender.com/api/files";
const apiUpload  = "https://nexrcloud-backend-2.onrender.com/api/upload";
const apiStatus  = "https://nexrcloud-backend-2.onrender.com/api/status";
const apiBetriebe = "https://nexrcloud-backend-2.onrender.com/api/betriebe-json";

// Hilfsfunktion für getElementById
function $(id) { return document.getElementById(id); }

// ============================
// GLOBALS
// ============================
let betriebData = [];
let filterBezirk = "";
let filterAmpel = "";

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
// EXISTING FILES
// ============================
let refreshTimer = null;
function refreshFileListDebounced() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(loadExistingFiles, 300);
}

async function loadExistingFiles() {
  const bezirk = $("bezirk")?.value;
  const bkz    = $("bkz")?.value.trim();
  const target = $("existing-files");

  if (!bezirk || !bkz || !target) {
    if (target) target.textContent = "Bitte Bezirk und BKZ auswählen";
    return;
  }

  try {
    const res = await fetch(`${apiFiles}?bezirk=${encodeURIComponent(bezirk)}&bkz=${encodeURIComponent(bkz)}`);
    const files = await res.json();

    if (!files.length) {
      target.textContent = "Keine Dateien vorhanden";
      return;
    }

    files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    target.innerHTML = `<ul>${files.map(f => `
      <li>
        ${f.name}<br>
        <small>${new Date(f.lastModified).toLocaleString("de-DE")}</small>
      </li>`).join("")}</ul>`;
  } catch (err) {
    console.error("Fehler beim Laden der Dateien", err);
    target.textContent = "Fehler beim Laden der Dateien";
  }
}

// ============================
// DRAG & DROP SETUP
// ============================
const containers = [
  { dropId: "drop-wahlausschreiben", filetype: "wahlausschreiben", prog: "prog-wahlausschreiben", status: "status-wahlausschreiben", list: "list-wahlausschreiben" },
  { dropId: "drop-niederschrift",   filetype: "niederschrift",   prog: "prog-niederschrift",   status: "status-niederschrift",   list: "list-niederschrift" },
  { dropId: "drop-wahlvorschlag",   filetype: "wahlvorschlag",   prog: "prog-wahlvorschlag",   status: "status-wahlvorschlag",   list: "list-wahlvorschlag" }
];

function setupDrops() {
  document.addEventListener("dragover", e => e.preventDefault());
  document.addEventListener("drop", e => e.preventDefault());

  containers.forEach(c => {
    const el = $(c.dropId);
    const status = $(c.status);
    const prog = $(c.prog);
    const list = $(c.list);

    let input = $(`file-${c.filetype}`);
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = `file-${c.filetype}`;
      input.multiple = true;
      input.style.display = "none";
      document.body.appendChild(input);
    }

    if (!el) return;

    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("hover"); });
    el.addEventListener("dragleave", () => el.classList.remove("hover"));
    el.addEventListener("drop", e => { e.preventDefault(); el.classList.remove("hover"); handleFiles(c, e.dataTransfer.files); });
    el.addEventListener("click", () => input.click());
    input.addEventListener("change", e => handleFiles(c, e.target.files));
  });
}

function handleFiles(container, files) {
  const el = $(container.dropId);
  const status = $(container.status);
  const prog = $(container.prog);
  const list = $(container.list);

  if (!el) return;
  el._files = files;

  if (list) list.innerHTML = "";
  for (let f of files) {
    const div = document.createElement("div");
    div.textContent = `📄 ${f.name} (${Math.round(f.size / 1024)} KB)`;
    list?.appendChild(div);
  }

  if (status) status.textContent = `${files.length} Datei(en) bereit`;
  if (prog) { prog.value = 0; prog.style.display = "none"; }

  updateUploadButton();
}

function updateUploadButton() {
  const btn = $("upload-btn");
  if (!btn) return;
  const hasFiles = containers.some(c => { const el = $(c.dropId); return el && el._files && el._files.length > 0; });
  btn.disabled = !hasFiles;
}

// ============================
// UPLOAD LOGIC
// ============================
function uploadSingleFile(file, filetype, container) {
  return new Promise((resolve, reject) => {
    const bezirk = $("bezirk")?.value;
    const bkz = $("bkz")?.value;

    if (!bezirk || !bkz) {
      reject("Bezirk/BKZ fehlt");
      return;
    }

    const form = new FormData();
    form.append("bezirk", bezirk);
    form.append("bkz", bkz);
    form.append("containers", filetype);
    form.append("files", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUpload);

    const progEl = $(container.prog);
    const statusEl = $(container.status);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable && progEl && statusEl) {
        const p = Math.round((e.loaded / e.total) * 100);
        progEl.style.display = "block";
        progEl.value = p;
        statusEl.textContent = `Upload: ${p}%`;
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        statusEl && (statusEl.textContent = "✓ Erfolgreich hochgeladen");
        refreshFileListDebounced();
        resolve(true);
      } else {
        statusEl && (statusEl.textContent = `❌ Fehler (${xhr.status})`);
        reject(xhr.status);
      }
    };

    xhr.onerror = () => {
      statusEl && (statusEl.textContent = "❌ Netzwerkfehler");
      reject("network");
    };

    xhr.send(form);
  });
}

async function uploadAll() {
  const btn = $("upload-btn");
  btn.disabled = true;

  let totalCount = 0, successCount = 0;
  containers.forEach(c => { const el = $(c.dropId); if (el && el._files) totalCount += el._files.length; });
  if (totalCount === 0) { btn.disabled = false; return; }

  for (let c of containers) {
    const el = $(c.dropId);
    if (!el || !el._files) continue;

    for (let file of el._files) {
      try { await uploadSingleFile(file, c.filetype, c); successCount++; }
      catch (err) { console.error("Fehler bei Datei:", file.name, err); }
    }
  }

  if (successCount === totalCount) {
    resetUploadUI();
    alert("Alle Dateien wurden erfolgreich hochgeladen.");
    btn.disabled = true;
  } else {
    alert(`Upload abgeschlossen mit Fehlern.\n${successCount} von ${totalCount} Dateien erfolgreich.`);
    btn.disabled = false;
  }
}

function resetUploadUI() {
  containers.forEach(c => {
    const el = $(c.dropId);
    const list = $(c.list);
    const status = $(c.status);
    const prog = $(c.prog);

    if (el) el._files = null;
    if (list) list.innerHTML = "";
    if (status) status.textContent = "";
    if (prog) { prog.value = 0; prog.style.display = "none"; }
  });
  updateUploadButton();
}

// ============================
// STATUS / VIRTUAL SCROLL
// ============================
async function loadStatus() {
  const container = $("status-list");
  if (!container) return;

  container.innerHTML = "<p>Lade Daten…</p>";

  try {
    const res = await fetch(apiStatus);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    // Filter nach Bezirk / Ampel
    let filtered = data.filter(d => {
      const matchBezirk = !filterBezirk || d.bezirk === filterBezirk;
      const matchAmpel = !filterAmpel || d.ampel === filterAmpel;
      return matchBezirk && matchAmpel;
    });

    filtered.sort((a, b) => a.bezirk.localeCompare(b.bezirk) || a.bkz.localeCompare(b.bkz));
    container.innerHTML = "";

    let currentBezirk = null;

    filtered.forEach(entry => {
      // Neue Bezirk-Header
      if (entry.bezirk !== currentBezirk) {
        currentBezirk = entry.bezirk;
        const header = document.createElement("div");
        header.className = "bezirk-header";
        header.textContent = currentBezirk || "–";
        container.appendChild(header);
      }

      const div = document.createElement("div");
      div.className = "card";

      // Ampelfarbe
      const color = entry.ampel === "gruen" ? "green" :
                    entry.ampel === "gelb" ? "gold" : "red";
      const ampCircle = `<span class="ampel" style="background-color:${color}"></span>`;

      // Betriebsname
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
// FILTER HANDLER
// ============================
function setupFilters() {
  const bezirkSelect = $("bezirkFilter");
  if (!bezirkSelect) return;

  // Bezirkfilter aus Betrieben generieren
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
    btn.addEventListener("click", e => {
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
  setupDrops();
  setupFilters();

  $("upload-btn")?.addEventListener("click", uploadAll);

  const params = new URLSearchParams(window.location.search);
  if (params.get("bezirk")) $("bezirkFilter").value = params.get("bezirk");
  if (params.get("bkz")) $("bkz")?.value = params.get("bkz");

  $("bezirkFilter")?.addEventListener("change", refreshFileListDebounced);
  $("bkz")?.addEventListener("input", refreshFileListDebounced);

  refreshFileListDebounced();
  loadStatus();
  setInterval(loadStatus, 30000); // Refresh alle 30 Sekunden
});
