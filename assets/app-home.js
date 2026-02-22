(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const els = {
    tracksGrid: $("#tracksGrid"),
    metricTracks: $("#metricTracks"),
    metricLabs: $("#metricLabs"),
    metricChecks: $("#metricChecks"),
    trackPreview: $("#trackPreview"),
    labPreview: $("#labPreview"),

    labsHelpDesk: $("#labsHelpDesk"),
    labsServerAdmin: $("#labsServerAdmin"),
    labsSecurity: $("#labsSecurity"),

    checksHelpDesk: $("#checksHelpDesk"),
    checksServerAdmin: $("#checksServerAdmin"),
    checksSecurity: $("#checksSecurity")
  };

  let catalog = null;

  async function loadCatalog() {
    const res = await fetch("./data/catalog.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load data/catalog.json");
    return res.json();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function setMetrics() {
    els.metricTracks.textContent = String((catalog.tracks || []).length);
    els.metricLabs.textContent = String((catalog.labs || []).length);
    els.metricChecks.textContent = String((catalog.knowledgeChecks || []).length);
  }

  function renderTerminalPreview() {
    const tracks = (catalog.tracks || []).map(t => `- ${t.id}: ${t.title}`).join("\n");
    const activeLabs = (catalog.labs || [])
      .filter(l => l.status === "active")
      .map(l => `- ${l.id}: ${l.title} (${l.tickets || "?"} tickets)`)
      .join("\n") || "- none";

    els.trackPreview.textContent = tracks || "- none";
    els.labPreview.textContent = activeLabs;
  }

  function renderTracks() {
    const tracks = catalog.tracks || [];
    els.tracksGrid.innerHTML = tracks.map(t => `
      <a class="track-card" href="#${trackToSection(t.id)}">
        <div class="track-title">${escapeHtml(t.title)}</div>
        <div class="track-desc">${escapeHtml(t.description)}</div>
        <div class="track-meta">
          <span class="badge">${escapeHtml(t.id)}</span>
          <span class="badge">${escapeHtml(t.level || "All Levels")}</span>
        </div>
      </a>
    `).join("");
  }

  function trackToSection(trackId){
    if(trackId === "HelpDesk") return "helpdesk";
    if(trackId === "ServerAdmin") return "sysadmin";
    if(trackId === "Security") return "security";
    return "start";
  }

  function renderLabTiles(trackId, mountEl) {
    const labs = (catalog.labs || []).filter(l => l.track === trackId);

    if (!labs.length) {
      mountEl.innerHTML = `<div class="tile"><div class="tile-title">Coming soon</div><div class="tile-desc">Labs for this track will appear here.</div></div>`;
      return;
    }

    mountEl.innerHTML = labs.map(l => {
      const statusBadge = l.status === "active"
        ? `<span class="badge active">Active</span>`
        : `<span class="badge soon">Coming soon</span>`;

      const href = l.status === "active"
        ? `./activity.html?lab=${encodeURIComponent(l.id)}`
        : "#start";

      return `
        <a class="tile" href="${href}">
          <div class="tile-title">${escapeHtml(l.title)}</div>
          <div class="tile-desc">${escapeHtml(l.description)}</div>
          <div class="tile-meta">
            ${statusBadge}
            <span class="badge">${escapeHtml(l.subject)}</span>
            ${l.tickets ? `<span class="badge">${escapeHtml(String(l.tickets))} tickets</span>` : ``}
          </div>
        </a>
      `;
    }).join("");
  }

  function renderCheckTiles(trackId, mountEl) {
    const checks = (catalog.knowledgeChecks || []).filter(c => c.track === trackId);

    if (!checks.length) {
      mountEl.innerHTML = `<div class="tile"><div class="tile-title">Coming soon</div><div class="tile-desc">Knowledge checks for this track will appear here.</div></div>`;
      return;
    }

    mountEl.innerHTML = checks.map(c => {
      const statusBadge = c.status === "active"
        ? `<span class="badge active">Active</span>`
        : `<span class="badge soon">Coming soon</span>`;

      return `
        <a class="tile" href="#start">
          <div class="tile-title">${escapeHtml(c.title)}</div>
          <div class="tile-desc">${escapeHtml(c.description)}</div>
          <div class="tile-meta">
            ${statusBadge}
            <span class="badge">${escapeHtml(c.subject)}</span>
            <span class="badge">${escapeHtml((c.types || []).join(" • ") || "Quiz")}</span>
          </div>
        </a>
      `;
    }).join("");
  }

  function initJumpLinks(){
    document.querySelectorAll("[data-jump]").forEach(a => {
      a.addEventListener("click", (e) => {
        // just keeps smooth flow, no special logic needed
      });
    });
  }

  async function init() {
    catalog = await loadCatalog();
    setMetrics();
    renderTerminalPreview();
    renderTracks();

    renderLabTiles("HelpDesk", els.labsHelpDesk);
    renderLabTiles("ServerAdmin", els.labsServerAdmin);
    renderLabTiles("Security", els.labsSecurity);

    renderCheckTiles("HelpDesk", els.checksHelpDesk);
    renderCheckTiles("ServerAdmin", els.checksServerAdmin);
    renderCheckTiles("Security", els.checksSecurity);

    initJumpLinks();
  }

  init().catch(err => {
    console.error(err);
    const msg = document.createElement("div");
    msg.style.margin = "16px";
    msg.style.padding = "14px";
    msg.style.border = "1px solid rgba(255,255,255,.12)";
    msg.style.borderRadius = "16px";
    msg.style.background = "rgba(255,255,255,.03)";
    msg.textContent = "Catalog failed to load. Confirm data/catalog.json exists and files are at repo root.";
    document.body.prepend(msg);
  });
})();
