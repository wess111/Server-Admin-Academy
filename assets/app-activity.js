// assets/app-activity.js
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    labTitleTop: $("#labTitleTop"),
    labSubTop: $("#labSubTop"),
    labProgress: $("#labProgress"),
    btnResetLab: $("#btnResetLab"),

    rolePill: $("#rolePill"),
    healthOverall: $("#healthOverall"),
    healthA: $("#healthA"),
    healthB: $("#healthB"),

    labTitle: $("#labTitle"),
    labDesc: $("#labDesc"),
    tabs: $("#tabs"),

    searchInput: $("#searchInput"),
    btnRandom: $("#btnRandom"),

    ticketList: $("#ticketList"),
    ticketDetail: $("#ticketDetail"),

    footerLeft: $("#footerLeft"),
    footerRight: $("#footerRight")
  };

  const LS_PREFIX = "sa_academy_v1_ticket_";
  const LS_LAB_PREFIX = "sa_academy_v1_lab_";

  let lab = null;
  let tickets = [];
  let activeCategory = "ALL";
  let filteredTickets = [];
  let selectedId = null;

  function getLabId() {
    const params = new URLSearchParams(location.search);
    return (params.get("lab") || "").trim();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function lsKey(ticketId) {
    return `${LS_PREFIX}${lab.id}__${ticketId}`;
  }

  function readJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function defaultTicketState() {
    return {
      doneTriage: false,
      doneDiagnosis: false,
      doneFix: false,
      doneNote: false,
      changeNote: "",
      lastSavedAt: null
    };
  }

  function loadTicketState(ticketId) {
    return readJSON(lsKey(ticketId), null) || defaultTicketState();
  }

  function saveTicketState(ticketId, state) {
    writeJSON(lsKey(ticketId), state);
  }

  function clearTicketState(ticketId) {
    try { localStorage.removeItem(lsKey(ticketId)); } catch {}
  }

  async function loadLabData(labId) {
    const res = await fetch(`./data/labs/${encodeURIComponent(labId)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load lab data for ${labId}`);
    return res.json();
  }

  function buildTabs(categories) {
    els.tabs.innerHTML = "";
    const all = ["ALL", ...categories];

    for (const c of all) {
      const btn = document.createElement("button");
      btn.className = "tab" + (c === activeCategory ? " active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", c === activeCategory ? "true" : "false");
      btn.textContent = c;

      btn.addEventListener("click", () => {
        activeCategory = c;
        $$(".tab").forEach(b => {
          const isActive = b.textContent === c;
          b.classList.toggle("active", isActive);
          b.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        applyFilters();
      });

      els.tabs.appendChild(btn);
    }
  }

  function ticketMatches(t, q) {
    if (!q) return true;
    const hay = [
      t.id, t.category, t.title, t.summary,
      (t.tags || []).join(" "),
      t.workflow?.triage,
      t.workflow?.diagnosis,
      t.workflow?.fix,
      ...(t.validations || [])
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function applyFilters() {
    const q = (els.searchInput.value || "").trim();

    filteredTickets = tickets.filter(t => {
      const catOk = activeCategory === "ALL" ? true : t.category === activeCategory;
      const qOk = ticketMatches(t, q);
      return catOk && qOk;
    });

    renderTicketList();

    if (selectedId) {
      const stillVisible = filteredTickets.some(t => t.id === selectedId);
      if (!stillVisible) {
        selectedId = null;
        els.ticketDetail.innerHTML = `
          <div class="card">
            <div class="card-title">Select a ticket</div>
            <div class="card-desc">Your previous selection is hidden by current filters.</div>
          </div>
        `;
      }
    }

    updateProgressAndHealth();
  }

  function renderTicketList() {
    els.ticketList.innerHTML = "";

    if (!filteredTickets.length) {
      els.ticketList.innerHTML = `
        <div class="card">
          <div class="card-title">No tickets found</div>
          <div class="card-desc">Try adjusting the tab or search keywords.</div>
        </div>
      `;
      return;
    }

    for (const t of filteredTickets) {
      const badgeClass = t.category === lab.categories[0] ? "a" : "b";
      const tags = (t.tags || []).slice(0, 4).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join("");

      const card = document.createElement("div");
      card.className = "card" + (t.id === selectedId ? " selected" : "");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      card.innerHTML = `
        <div class="card-top">
          <div>
            <div class="card-title">${escapeHtml(t.title)}</div>
            <div class="card-desc">${escapeHtml(truncate(t.summary, 120))}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <div class="card-meta">${escapeHtml(t.id)}</div>
            <span class="badge ${badgeClass}">${escapeHtml(t.category)}</span>
          </div>
        </div>
        <div class="tags">${tags}</div>
      `;

      const open = () => selectTicket(t.id);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });

      els.ticketList.appendChild(card);
    }
  }

  function selectTicket(ticketId) {
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;

    selectedId = ticketId;
    renderTicketList();

    const s = loadTicketState(ticketId);

    els.ticketDetail.innerHTML = `
      <div class="detail-head">
        <div class="detail-hgroup">
          <div class="detail-id">${escapeHtml(t.id)} • ${escapeHtml(t.category)}</div>
          <div class="detail-title">${escapeHtml(t.title)}</div>
          <div class="card-desc" style="margin-top:8px;max-width:95ch;">${escapeHtml(t.summary)}</div>

          <div class="env-grid">
            ${Object.entries(t.env || {}).map(([k,v]) => `
              <div class="env">
                <div class="env-k">${escapeHtml(k)}</div>
                <div class="env-v">${escapeHtml(v)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="steps">
        ${stepTemplate(1, "Triage (Symptom)", "What the user/system reports or what monitoring shows.", "doneTriage", t.workflow.triage, s.doneTriage)}
        ${stepTemplate(2, "Diagnosis (Root Cause)", "What is actually wrong (most likely cause).", "doneDiagnosis", t.workflow.diagnosis, s.doneDiagnosis)}
        ${stepTemplate(3, "Fix (GUI Action)", "What you would click/configure in Windows tools (DNS/DHCP MMC).", "doneFix", t.workflow.fix, s.doneFix)}
        ${noteStepTemplate(4, "Change Note (Text Entry)", "Write a short change record (what/why/impact/validation).", s)}
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="card-title">Suggested Validation Checks</div>
        <div class="card-desc" style="margin-top:6px;">Use these to confirm your fix worked.</div>
        <div style="margin-top:10px;color:rgba(238,245,255,.88);font-weight:650;line-height:1.7;">
          <ul style="margin:0;padding-left:18px;">
            ${(t.validations || ["No validations provided."]).map(v => `<li>${escapeHtml(v)}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    wireTicketDetailHandlers(ticketId);
    updateProgressAndHealth();
  }

  function stepTemplate(num, title, hint, key, text, checked) {
    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">${num}</div>
            <div>
              <div class="step-title">${escapeHtml(title)}</div>
              <div class="step-hint">${escapeHtml(hint)}</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-step="${key}" ${checked ? "checked" : ""}/>
            Done
          </label>
        </div>
        <div class="step-body">${escapeHtml(text)}</div>
      </div>
    `;
  }

  function noteStepTemplate(num, title, hint, s) {
    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">${num}</div>
            <div>
              <div class="step-title">${escapeHtml(title)}</div>
              <div class="step-hint">${escapeHtml(hint)}</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-step="doneNote" ${s.doneNote ? "checked" : ""}/>
            Done
          </label>
        </div>
        <div class="step-body">
          <textarea id="changeNote" rows="7" placeholder="Document your change: what you changed, why, impact, and how you validated...">${escapeHtml(s.changeNote || "")}</textarea>
          <div class="note-actions">
            <button id="btnSave" class="btn" type="button">Save Note</button>
            <button id="btnCopy" class="btn" type="button">Copy Note</button>
            <span class="mini-muted" id="savedHint">${s.lastSavedAt ? "Saved locally." : "Not saved yet."}</span>
          </div>
        </div>
      </div>
    `;
  }

  function wireTicketDetailHandlers(ticketId) {
    $$("#ticketDetail input[type='checkbox'][data-step]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-step");
        const next = loadTicketState(ticketId);
        next[key] = cb.checked;
        saveTicketState(ticketId, next);
        updateProgressAndHealth();
      });
    });

    const note = $("#changeNote");
    const btnSave = $("#btnSave");
    const btnCopy = $("#btnCopy");
    const savedHint = $("#savedHint");

    if (note) {
      note.addEventListener("input", debounce(() => {
        const next = loadTicketState(ticketId);
        next.changeNote = note.value;
        saveTicketState(ticketId, next);
      }, 120));
    }

    if (btnSave) {
      btnSave.addEventListener("click", () => {
        const next = loadTicketState(ticketId);
        next.changeNote = note ? note.value : next.changeNote;
        next.lastSavedAt = Date.now();
        saveTicketState(ticketId, next);
        if (savedHint) savedHint.textContent = "Saved locally.";
        updateProgressAndHealth();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener("click", async () => {
        const txt = (note && note.value) ? note.value : "";
        if (!txt.trim()) return;
        try {
          await navigator.clipboard.writeText(txt);
        } catch {
          if (note) { note.select(); document.execCommand("copy"); }
        }
      });
    }
  }

  function computeProgress() {
    let done = 0;
    for (const t of tickets) {
      const s = loadTicketState(t.id);
      const complete = s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote;
      if (complete) done++;
    }
    return { done, total: tickets.length };
  }

  function percent(x, y) {
    if (!y) return 100;
    return Math.round((x / y) * 100);
  }

  function setHealthPill(node, label, pct) {
    node.textContent = `${label}: ${pct}%`;
    node.classList.remove("good", "warn", "bad");
    if (pct >= 85) node.classList.add("good");
    else if (pct >= 60) node.classList.add("warn");
    else node.classList.add("bad");
  }

  function updateProgressAndHealth() {
    const p = computeProgress();
    els.labProgress.textContent = `Progress: ${p.done}/${p.total}`;

    // Category completion (A/B)
    const catA = lab.categories[0];
    const catB = lab.categories[1];

    const aTickets = tickets.filter(t => t.category === catA);
    const bTickets = tickets.filter(t => t.category === catB);

    const aDone = aTickets.filter(t => {
      const s = loadTicketState(t.id);
      return s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote;
    }).length;

    const bDone = bTickets.filter(t => {
      const s = loadTicketState(t.id);
      return s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote;
    }).length;

    const overall = percent(p.done, p.total);
    const aPct = percent(aDone, aTickets.length);
    const bPct = percent(bDone, bTickets.length);

    setHealthPill(els.healthOverall, "Overall Health", overall);
    setHealthPill(els.healthA, `${catA} Health`, aPct);
    setHealthPill(els.healthB, `${catB} Health`, bPct);
  }

  function resetLab() {
    for (const t of tickets) clearTicketState(t.id);
    selectedId = null;
    applyFilters();
    els.ticketDetail.innerHTML = `
      <div class="card">
        <div class="card-title">Select a ticket</div>
        <div class="card-desc">This lab was reset. Choose a ticket to begin again.</div>
      </div>
    `;
    updateProgressAndHealth();
  }

  function truncate(s, n) {
    const str = String(s || "");
    return str.length <= n ? str : str.slice(0, n - 1) + "…";
  }

  function initHeader() {
    document.title = `${lab.title} • Activity`;
    els.labTitleTop.textContent = lab.title;
    els.labSubTop.textContent = `${lab.track} • ${lab.subject} • ${tickets.length} tickets`;
    els.labTitle.textContent = lab.title;
    els.labDesc.textContent = lab.description;
    els.footerLeft.textContent = `${lab.track} • ${lab.subject}`;
  }

  function initTabs() {
    buildTabs(lab.categories);
    // activate ALL by default
    activeCategory = "ALL";
    $$(".tab").forEach(b => {
      const isActive = b.textContent === "ALL";
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function initEvents() {
    els.searchInput.addEventListener("input", debounce(applyFilters, 120));
    els.btnRandom.addEventListener("click", () => {
      if (!filteredTickets.length) return;
      const pick = filteredTickets[Math.floor(Math.random() * filteredTickets.length)];
      selectTicket(pick.id);
    });

    els.btnResetLab.addEventListener("click", resetLab);
  }

  async function init() {
    const labId = getLabId();
    if (!labId) {
      els.labTitle.textContent = "Missing lab id";
      els.labDesc.textContent = "Open from the Academy Home page or add ?lab=dns-dhcp to the URL.";
      return;
    }

    lab = await loadLabData(labId);
    tickets = lab.tickets || [];

    initHeader();
    initTabs();
    initEvents();

    applyFilters();
    updateProgressAndHealth();

    // default select first ticket
    if (filteredTickets[0]) selectTicket(filteredTickets[0].id);
  }

  init().catch(err => {
    console.error(err);
    els.labTitle.textContent = "Failed to load lab";
    els.labDesc.textContent = "Check that the data file exists under /data/labs/ and the lab id matches the filename.";
  });
})();