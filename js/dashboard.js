// ============================
// CONFIG
// ============================
const apiUpload = "/api/upload";
const apiFiles  = "/api/files";
const apiStatus = "/api/status";
const apiBetriebeJson = "/api/betriebe-json";

// Hilfsfunktion
const $ = id => document.getElementById(id);

// ============================
// CONTAINER DEFINITION
// ============================
const containers = [
  { dropId: "drop-wahlausschreiben", filetype: "wahlausschreiben", prog: "prog-wahlausschreiben", status: "status-wahlausschreiben", list: "list-wahlausschreiben" },
  { dropId: "drop-niederschrift",   filetype: "niederschrift",   prog: "prog-niederschrift",   status: "status-niederschrift",   list: "list-niederschrift" },
  { dropId: "drop-wahlvorschlag",   filetype: "wahlvorschlag",   prog: "prog-wahlvorschlag",   status: "status-wahlvorschlag",   list: "list-wahlvorschlag" }
];

// ============================
// GLOBAL DATA
// ============================
let refreshTimer = null;
let betriebData = [];

// ============================
// DEBOUNCED DATEILISTE
// ============================
function refreshFileListDebounced() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(loadExistingFiles, 300);
}

// ============================
// EXISTIERENDE DATEIEN LADEN
// ============================
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
        ${f.name} <br>
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
function setupDrops() {
  document.addEventListener("dragover", e => e.preventDefault());
  document.addEventListener("drop", e => e.preventDefault());

  containers.forEach(c => {
    const el = $(c.dropId);
    const status = $(c.status);
    const prog = $(c.prog);
    const list = $(c.list);

    if (!el) return;

    // Input Feld für Klick-Upload
    let input = $(`file-${c.filetype}`);
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = `file-${c.filetype}`;
      input.multiple = true;
      input.style.display = "none";
      document.body.appendChild(input);
    }

    // Drag & Drop Events
    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("hover"); });
    el.addEventListener("dragleave", () => el.classList.remove("hover"));
    el.addEventListener("drop", e => { e.preventDefault(); el.classList.remove("hover"); handleFiles(c, e.dataTransfer.files); });

    // Klick zum Öffnen File Dialog
    el.addEventListener("click", () => input.click());
    input.addEventListener("change", e => handleFiles(c, e.target.files));
  });
}

// ============================
// DATEIEN HANDLING
// ============================
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

// ============================
// UPLOAD BUTTON
// ============================
function updateUploadButton() {
  const btn = $("upload-btn");
  if (!btn) return;

  const hasFiles = containers.some(c => $(c.dropId)?._files?.length > 0);
  btn.disabled = !hasFiles;
}

// ============================
// SINGLE FILE UPLOAD
// ============================
function uploadSingleFile(file, filetype, container) {
  return new Promise((resolve, reject) => {
    const bezirk = $("bezirk")?.value;
    const bkz    = $("bkz")?.value;

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

// ============================
// UPLOAD ALL
// ============================
async function uploadAll() {
  const btn = $("upload-btn");
  btn.disabled = true;

  let totalCount = 0;
  let successCount = 0;

  containers.forEach(c => { if ($(c.dropId)?._files) totalCount += $(c.dropId)._files.length; });

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
    alert("Alle Dateien erfolgreich hochgeladen.");
    btn.disabled = true;
  } else {
    alert(`Upload abgeschlossen mit Fehlern.\n${successCount} von ${totalCount} Dateien erfolgreich.`);
    btn.disabled = false;
  }
}

// ============================
// RESET UI
// ============================
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
// BETRIEBSNAMEN LADEN
// ============================
async function loadBetriebeNamen() {
  try {
    const res = await fetch(apiBetriebeJson);
    if (!res.ok) throw new Error("HTTP " + res.status);
    betriebData = await res.json();
    console.log("✅ Betriebe geladen:", betriebData.length);
  } catch (err) {
    console.error("🚨 betriebe.json nicht geladen:", err);
    betriebData = [];
  }
}

// ============================
// BKZ → BETRIEBSNAME
// ============================
function updateBetriebFeld() {
  const bkzEl = $("bkz");
  const betriebEl = $("betrieb");

  if (!bkzEl || !betriebEl) return;

  const bkzVal = bkzEl.value.trim();
  const entry = betriebData.find(b => b.bkz === bkzVal);
  betriebEl.textContent = entry ? entry.betrieb : "–";
}

// ============================
// INIT
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  setupDrops();
  $("upload-btn")?.addEventListener("click", uploadAll);

  // Felder automatisch aus URL vorausfüllen
  const params = new URLSearchParams(window.location.search);
  const bezirkEl = $("bezirk");
  const bkzEl = $("bkz");

  if (params.get("bezirk") && bezirkEl) bezirkEl.value = params.get("bezirk");
  if (params.get("bkz") && bkzEl) bkzEl.value = params.get("bkz");

  // Event-Listener
  if (bezirkEl) bezirkEl.addEventListener("change", refreshFileListDebounced);
  if (bkzEl) {
    bkzEl.addEventListener("input", refreshFileListDebounced);
    bkzEl.addEventListener("input", updateBetriebFeld);
  }

  // Initial Daten laden
  await loadBetriebeNamen();
  updateBetriebFeld();
  refreshFileListDebounced();

  // Upload-Button prüfen
  updateUploadButton();
});
