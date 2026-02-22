(() => {
  "use strict";

  const SAA = {};
  const $ = (sel) => document.querySelector(sel);

  async function loadCatalog() {
    const res = await fetch("./data/catalog.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load ./data/catalog.json");
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

  function trackHref(trackId) {
    if (trackId === "HelpDesk") return "./helpdesk.html";
    if (trackId === "ServerAdmin") return "./sysadmin.html";
    if (trackId === "Security") return "./security.html";
    return "./index.html";
  }

  function labHref(lab) {
    if (lab.status === "active") return `./activity.html?lab=${encodeURIComponent(lab.id)}`;
    return trackHref(lab.track);
  }

  function badgeForStatus(status) {
    if (status === "active") return `<span class="badge badgeActive">Active</span>`;
    return `<span class="badge badgeSoon">Coming soon</span>`;
  }

  function renderTrackCard(t) {
    // chips: pull first few words from description or use defaults
    const chips = (t.chips && t.chips.length)
      ? t.chips
      : (t.id === "HelpDesk")
        ? ["Ticket Triage", "User Support", "Escalation"]
        : (t.id === "ServerAdmin")
          ? ["AD DS", "DNS/DHCP", "GPO & Storage"]
          : ["Hardening", "Validation", "Investigation"];

    return `
      <a class="card" href="${trackHref(t.id)}">
        <div class="cardTitle">${escapeHtml(t.title)}</div>
        <div class="cardDesc">${escapeHtml(t.description)}</div>
        <div class="chips">
          ${chips.slice(0,3).map(c => `<span class="chip">${escapeHtml(c)}</span>`).join("")}
        </div>
        <div class="metaRow">
          <span class="badge">${escapeHtml(t.level || "All Levels")}</span>
          <span class="badge">${escapeHtml(t.id)}</span>
        </div>
      </a>
    `;
  }

  function renderLabCard(lab) {
    const meta = [
      badgeForStatus(lab.status),
      `<span class="badge">${escapeHtml(lab.subject || "Subject")}</span>`,
      lab.tickets ? `<span class="badge">${escapeHtml(String(lab.tickets))} tickets</span>` : ""
    ].filter(Boolean).join("");

    const chips = (lab.tags || []).slice(0,3).map(x => `<span class="chip">${escapeHtml(x)}</span>`).join("");

    return `
      <a class="card" href="${labHref(lab)}">
        <div class="cardTitle">${escapeHtml(lab.title)}</div>
        <div class="cardDesc">${escapeHtml(lab.description || "")}</div>
        <div class="chips">${chips || ""}</div>
        <div class="metaRow">${meta}</div>
      </a>
    `;
  }

  function renderCheckCard(check) {
    const meta = [
      badgeForStatus(check.status),
      `<span class="badge">${escapeHtml(check.subject || "Subject")}</span>`,
      `<span class="badge">${escapeHtml((check.types || []).slice(0,3).join(" • ") || "Quiz")}</span>`
    ].join("");

    return `
      <a class="card" href="${trackHref(check.track)}#checks">
        <div class="cardTitle">${escapeHtml(check.title)}</div>
        <div class="cardDesc">${escapeHtml(check.description || "")}</div>
        <div class="metaRow">${meta}</div>
      </a>
    `;
  }

  function setMetrics(catalog) {
    const mt = $("#metricTracks");
    const ml = $("#metricLabs");
    const mc = $("#metricChecks");
    if (mt) mt.textContent = String((catalog.tracks || []).length);
    if (ml) ml.textContent = String((catalog.labs || []).length);
    if (mc) mc.textContent = String((catalog.knowledgeChecks || []).length);
  }

  function pickFeaturedLab(catalog) {
    const active = (catalog.labs || []).find(l => l.status === "active");
    return active || (catalog.labs || [])[0] || null;
  }

  function pickFeaturedCheck(catalog) {
    const active = (catalog.knowledgeChecks || []).find(k => k.status === "active");
    return active || (catalog.knowledgeChecks || [])[0] || null;
  }

  SAA.initHome = async function initHome() {
    const catalog = await loadCatalog();
    setMetrics(catalog);

    // Tracks grid
    const tracksGrid = $("#tracksGrid");
    if (tracksGrid) {
      tracksGrid.innerHTML = (catalog.tracks || []).map(renderTrackCard).join("");
    }

    // Featured Lab (hero card)
    const featuredLab = pickFeaturedLab(catalog);
    const featuredLabCard = $("#featuredLabCard");
    if (featuredLabCard) {
      if (featuredLab) {
        featuredLabCard.innerHTML = `
          <div class="cardTitle">${escapeHtml(featuredLab.title)}</div>
          <div class="cardDesc" style="margin-top:8px;">
            ${escapeHtml(featuredLab.description || "")}
          </div>
          <div class="metaRow" style="margin-top:12px;">
            ${badgeForStatus(featuredLab.status)}
            <span class="badge">${escapeHtml(featuredLab.track)}</span>
            <span class="badge">${escapeHtml(featuredLab.subject || "Module")}</span>
            ${featuredLab.tickets ? `<span class="badge">${escapeHtml(String(featuredLab.tickets))} tickets</span>` : ""}
          </div>
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
            <a class="btn btnPrimary" href="${labHref(featuredLab)}">Launch</a>
            <a class="btn btnGhost" href="${trackHref(featuredLab.track)}">Go to Track</a>
          </div>
        `;
      } else {
        featuredLabCard.innerHTML = `<div class="cardDesc">No labs found. Add labs to <code>data/catalog.json</code>.</div>`;
      }
    }

    // Button "Launch Active Module" should go to active lab if present
    const btnLaunchActive = $("#btnLaunchActive");
    if (btnLaunchActive && featuredLab) {
      btnLaunchActive.href = labHref(featuredLab);
    }

    // Featured strip
    const labStrip = $("#featuredLabStrip");
    if (labStrip) {
      labStrip.innerHTML = featuredLab
        ? `
          <div class="cardTitle">Featured Lab</div>
          <div class="cardDesc">${escapeHtml(featuredLab.title)} • ${escapeHtml(featuredLab.description || "")}</div>
          <div class="metaRow">${badgeForStatus(featuredLab.status)}<span class="badge">${escapeHtml(featuredLab.track)}</span></div>
          <div style="margin-top:12px;"><a class="btn btnPrimary" href="${labHref(featuredLab)}">Launch</a></div>
        `
        : `<div class="cardDesc">No featured lab available.</div>`;
    }

    const featuredCheck = pickFeaturedCheck(catalog);
    const checkStrip = $("#featuredCheckStrip");
    if (checkStrip) {
      checkStrip.innerHTML = featuredCheck
        ? `
          <div class="cardTitle">Featured Knowledge Check</div>
          <div class="cardDesc">${escapeHtml(featuredCheck.title)} • ${escapeHtml(featuredCheck.description || "")}</div>
          <div class="metaRow">${badgeForStatus(featuredCheck.status)}<span class="badge">${escapeHtml(featuredCheck.track)}</span></div>
          <div style="margin-top:12px;"><a class="btn btnPrimary" href="${trackHref(featuredCheck.track)}#checks">Open</a></div>
        `
        : `<div class="cardDesc">No knowledge checks available yet.</div>`;
    }
  };

  SAA.initTrackPage = async function initTrackPage(trackId) {
    const catalog = await loadCatalog();

    // Fill counts
    const labs = (catalog.labs || []).filter(l => l.track === trackId);
    const checks = (catalog.knowledgeChecks || []).filter(k => k.track === trackId);

    const labsCount = $("#trackLabsCount");
    const checksCount = $("#trackChecksCount");
    if (labsCount) labsCount.textContent = `Labs: ${labs.length}`;
    if (checksCount) checksCount.textContent = `Knowledge Checks: ${checks.length}`;

    // Labs grid
    const labsGrid = $("#labsGrid");
    if (labsGrid) {
      labsGrid.innerHTML = labs.length
        ? labs.map(renderLabCard).join("")
        : `<div class="card"><div class="cardTitle">Coming soon</div><div class="cardDesc">Labs for this track will appear here.</div></div>`;
    }

    // Checks grid
    const checksGrid = $("#checksGrid");
    if (checksGrid) {
      checksGrid.innerHTML = checks.length
        ? checks.map(renderCheckCard).join("")
        : `<div class="card"><div class="cardTitle">Coming soon</div><div class="cardDesc">Knowledge checks for this track will appear here.</div></div>`;
    }
  };

  window.SAA = SAA;
})();
