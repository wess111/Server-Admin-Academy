(() => {
  "use strict";

  /* ----------------------------- Helpers ----------------------------- */

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const CHANGE_NOTE_MIN = 40;

  const LS_PREFIX = "sa_academy_v3_ticket_";
  const LS_META_PREFIX = "sa_academy_v3_meta_";

  let lab = null;
  let tickets = [];
  let activeCategory = "ALL";
  let filteredTickets = [];
  let selectedId = null;

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getLabId() {
    const params = new URLSearchParams(location.search);
    return (params.get("lab") || "").trim();
  }

  function lsKey(ticketId) {
    return `${LS_PREFIX}${lab.id}__${ticketId}`;
  }
  function metaKey() {
    return `${LS_META_PREFIX}${lab.id}`;
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
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  /* ----------------------------- State ----------------------------- */

  function defaultTicketState() {
    return {
      // MCQ workflow
      answers: { triage: null, diagnosis: null, fix: null },
      correct: { triage: false, diagnosis: false, fix: false },

      // Progressive UI
      uiStage: "triage", // triage | diagnosis | fix | changeNote

      // Attempts tracking
      attempts: { total: 0, wrong: 0 },

      // Change note
      changeNote: "",
      doneNote: false,

      // Final status
      resolved: false,

      lastSavedAt: null
    };
  }

  function loadTicketState(ticketId) {
    return readJSON(lsKey(ticketId), null) || defaultTicketState();
  }

  function saveTicketState(ticketId, state) {
    state.lastSavedAt = Date.now();
    writeJSON(lsKey(ticketId), state);
  }

  function clearTicketState(ticketId) {
    try {
      localStorage.removeItem(lsKey(ticketId));
    } catch {}
  }

  function isStageObject(v) {
    return (
      v &&
      typeof v === "object" &&
      typeof v.q === "string" &&
      Array.isArray(v.options) &&
      v.options.length === 4 &&
      Number.isInteger(v.correct) &&
      v.correct >= 0 &&
      v.correct <= 3
    );
  }

  function ensureStateShape(ticketId, s0) {
    const s = s0 && typeof s0 === "object" ? s0 : defaultTicketState();

    if (!s.answers || typeof s.answers !== "object") s.answers = { triage: null, diagnosis: null, fix: null };
    if (!s.correct || typeof s.correct !== "object") s.correct = { triage: false, diagnosis: false, fix: false };
    if (!s.attempts || typeof s.attempts !== "object") s.attempts = { total: 0, wrong: 0 };

    ["triage", "diagnosis", "fix"].forEach((k) => {
      if (!(k in s.answers)) s.answers[k] = null;
      if (!(k in s.correct)) s.correct[k] = false;
    });

    if (!["triage", "diagnosis", "fix", "changeNote"].includes(s.uiStage)) s.uiStage = "triage";
    if (typeof s.changeNote !== "string") s.changeNote = "";
    if (typeof s.doneNote !== "boolean") s.doneNote = false;
    if (typeof s.resolved !== "boolean") s.resolved = false;

    saveTicketState(ticketId, s);
    return s;
  }

  function computeResolved(s) {
    const allCorrect = !!(s.correct.triage && s.correct.diagnosis && s.correct.fix);
    const noteOk = !!(s.doneNote && (s.changeNote || "").trim().length >= CHANGE_NOTE_MIN);
    return allCorrect && noteOk;
  }

  function getUnlockedStages(s) {
    // Unlock is based on correctness, not simply visiting stages.
    const unlocked = new Set(["triage"]);

    if (s.correct.triage) unlocked.add("diagnosis");
    if (s.correct.triage && s.correct.diagnosis) unlocked.add("fix");
    if (s.correct.triage && s.correct.diagnosis && s.correct.fix) unlocked.add("changeNote");

    return unlocked;
  }

  function normalizeUiStage(s) {
    const unlocked = getUnlockedStages(s);
    if (!unlocked.has(s.uiStage)) {
      // Force them to the earliest unlocked stage
      if (unlocked.has("triage")) s.uiStage = "triage";
      if (unlocked.has("diagnosis")) s.uiStage = "diagnosis";
      if (unlocked.has("fix")) s.uiStage = "fix";
      if (unlocked.has("changeNote")) s.uiStage = "changeNote";
      // Note: above logic moves to latest unlocked; that’s okay and friendly.
    }
    return s;
  }

  /* ----------------------------- Meta (Top Fields) ----------------------------- */

  function setTodayIfEmpty() {
    const el = $("#activityDate");
    if (!el || el.value) return;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    el.value = `${yyyy}-${mm}-${dd}`;
  }

  function loadMeta() {
    const m = readJSON(metaKey(), null) || {};
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el && typeof v === "string") el.value = v;
    };
    set("analystName", m.analystName || "");
    set("courseSection", m.courseSection || "");
    set("courseTitle", m.courseTitle || "");
    set("activityDate", m.activityDate || "");
    setTodayIfEmpty();
  }

  function saveMeta() {
    const get = (id) => (document.getElementById(id)?.value || "").trim();
    writeJSON(metaKey(), {
      analystName: get("analystName"),
      courseSection: get("courseSection"),
      courseTitle: get("courseTitle"),
      activityDate: get("activityDate")
    });
  }

  function wireMeta() {
    ["analystName", "courseSection", "courseTitle", "activityDate"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", saveMeta);
    });
    loadMeta();
  }

  /* ----------------------------- Data Load ----------------------------- */

  async function loadLabData(labId) {
    const res = await fetch(`./data/labs/${encodeURIComponent(labId)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("Lab data not found");
    return res.json();
  }

  /* ----------------------------- UI: Tabs & Queue ----------------------------- */

  function buildTabs(categories) {
    const tabs = $("#tabs");
    tabs.innerHTML = "";

    const all = ["ALL", ...categories];
    for (const c of all) {
      const btn = document.createElement("button");
      btn.className = "tab" + (c === activeCategory ? " active" : "");
      btn.textContent = c;
      btn.addEventListener("click", () => {
        activeCategory = c;
        $$(".tab").forEach((b) => b.classList.toggle("active", b.textContent === c));
        applyFilters();
      });
      tabs.appendChild(btn);
    }
  }

  function ticketMatches(t, q) {
    if (!q) return true;
    const hay = [
      t.id, t.category, t.title, t.summary,
      (t.tags || []).join(" "),
      JSON.stringify(t.env || {}),
      JSON.stringify(t.evidence || {}),
      JSON.stringify(t.artifact || {}),
      (t.validations || []).join(" ")
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function applyFilters() {
    const q = ($("#searchInput").value || "").trim();
    filteredTickets = tickets.filter((t) => {
      const catOk = activeCategory === "ALL" ? true : t.category === activeCategory;
      return catOk && ticketMatches(t, q);
    });

    renderTicketList();

    if (selectedId && !filteredTickets.some((t) => t.id === selectedId)) {
      selectedId = null;
      $("#ticketDetail").innerHTML =
        `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Your previous selection is hidden by filters.</div></div>`;
    }

    updateProgressAndHealth();
  }

  function truncate(s, n) {
    const str = String(s || "");
    return str.length <= n ? str : str.slice(0, n - 1) + "…";
  }

  function renderTicketList() {
    const list = $("#ticketList");
    list.innerHTML = "";

    if (!filteredTickets.length) {
      list.innerHTML =
        `<div class="card"><div class="card-title">No tickets found</div><div class="card-desc">Try a different tab or search.</div></div>`;
      return;
    }

    for (const t of filteredTickets) {
      const s = ensureStateShape(t.id, loadTicketState(t.id));
      const status = computeResolved(s) ? "Done" : "To do";

      const card = document.createElement("div");
      card.className = "card" + (t.id === selectedId ? " selected" : "");

      const tags = (t.tags || [])
        .slice(0, 4)
        .map((x) => `<span class="tag">${escapeHtml(x)}</span>`)
        .join("");

      card.innerHTML = `
        <div class="rowBetween">
          <div class="leftCol">
            <div class="card-title">${escapeHtml(t.title)}</div>
            <div class="card-desc">${escapeHtml(truncate(t.summary, 120))}</div>
            <div class="tags">${tags}</div>
          </div>
          <div class="rightCol">
            <div class="idText">${escapeHtml(t.id)}</div>
            <span class="badge">${escapeHtml(t.category)}</span>
            <span class="badge badgeStatus">${escapeHtml(status)}</span>
          </div>
        </div>
      `;
      card.addEventListener("click", () => selectTicket(t.id));
      list.appendChild(card);
    }
  }

  /* ----------------------------- Evidence/Artifact Rendering ----------------------------- */

  function renderEvidenceBlock(t) {
    // Preferred fields: evidence / artifact. If absent, fall back to env.
    // Supports string, array of strings, or object key/value.
    const lines = [];

    const pushLines = (val) => {
      if (!val) return;
      if (typeof val === "string") {
        const parts = val.split("\n").map(x => x.trim()).filter(Boolean);
        parts.forEach(p => lines.push(p));
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(x => {
          if (typeof x === "string" && x.trim()) lines.push(x.trim());
        });
        return;
      }
      if (typeof val === "object") {
        Object.entries(val).forEach(([k, v]) => {
          const txt = `${k}: ${String(v ?? "").trim()}`;
          if (txt.trim()) lines.push(txt);
        });
      }
    };

    pushLines(t.artifact);
    pushLines(t.evidence);

    // Fallback to env if nothing exists
    if (!lines.length) {
      pushLines(t.env);
    }

    const content = lines.length
      ? `<ul class="bullets">${lines.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
      : `<div class="miniDesc">(No evidence provided)</div>`;

    return `
      <div class="artifactCard">
        <div class="artifactTitle">Evidence / Artifact</div>
        <div class="artifactBody">
          ${content}
        </div>
      </div>
    `;
  }

  /* ----------------------------- Stage Rendering ----------------------------- */

  function renderStageTabs(ticketId, s) {
    const unlocked = getUnlockedStages(s);

    const tabBtn = (key, label) => {
      const active = s.uiStage === key ? " active" : "";
      const disabled = unlocked.has(key) ? "" : " disabled";

      return `
        <button
          type="button"
          class="stageTab${active}${disabled}"
          data-stage-tab="true"
          data-ticket="${escapeHtml(ticketId)}"
          data-stage="${escapeHtml(key)}"
          ${unlocked.has(key) ? "" : "aria-disabled='true'"}
        >${escapeHtml(label)}</button>
      `;
    };

    return `
      <div class="stageTabs">
        ${tabBtn("triage", "Triage")}
        ${tabBtn("diagnosis", "Diagnosis")}
        ${tabBtn("fix", "Fix")}
        ${tabBtn("changeNote", "Change Note")}
      </div>
    `;
  }

  function renderStatusLine(s) {
    const status = computeResolved(s) ? "Resolved" : (s.correct.triage || s.correct.diagnosis || s.correct.fix || s.doneNote ? "In progress" : "Not started");
    return `
      <div class="statusLine">
        <strong>Status:</strong> ${escapeHtml(status)}
        <span class="sep">•</span>
        <strong>Attempts:</strong> ${s.attempts.total} (wrong: ${s.attempts.wrong})
        <div class="statusHint">Resolve by answering all three stages correctly + change note (min ${CHANGE_NOTE_MIN} chars).</div>
      </div>
    `;
  }

  function renderMCQStage(stageKey, stageObj, ticketId, s) {
    const prettyName =
      stageKey === "triage" ? "Triage" :
      stageKey === "diagnosis" ? "Diagnosis" :
      "Fix";

    const selectedIdx = s.answers[stageKey];
    const isCorrect = !!s.correct[stageKey];

    // show small right-side status when they have selected something
    const rightFlag =
      selectedIdx == null ? `<span class="mini-muted">Select an option</span>` :
      isCorrect ? `<span class="mini-good">Correct ✓</span>` :
      `<span class="mini-bad">Incorrect ✕</span>`;

    const optionsHtml = stageObj.options.map((label, idx) => {
      const picked = selectedIdx === idx;
      const cls = picked ? "btn option selected" : "btn option";
      return `
        <button
          type="button"
          class="${cls}"
          data-answer="true"
          data-ticket="${escapeHtml(ticketId)}"
          data-stage="${escapeHtml(stageKey)}"
          data-idx="${idx}"
          aria-pressed="${picked ? "true" : "false"}"
        >${escapeHtml(label)}</button>
      `;
    }).join("");

    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">${stageKey === "triage" ? 1 : stageKey === "diagnosis" ? 2 : 3}</div>
            <div>
              <div class="step-title">${escapeHtml(prettyName)}</div>
              <div class="step-hint">${escapeHtml(stageObj.q)}</div>
            </div>
          </div>
          ${rightFlag}
        </div>

        <div class="step-body">
          <div class="optionsGrid">
            ${optionsHtml}
          </div>

          <div class="note-actions">
            <button class="btn" type="button" data-next="true" data-ticket="${escapeHtml(ticketId)}">Next Stage</button>
            <button class="btn ghost" type="button" data-goto-note="true" data-ticket="${escapeHtml(ticketId)}">Go to Change Note</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderChangeNote(ticketId, s) {
    const chars = (s.changeNote || "").length;
    const ready = chars >= CHANGE_NOTE_MIN;

    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">4</div>
            <div>
              <div class="step-title">Change Note</div>
              <div class="step-hint">Write a short change note (minimum ${CHANGE_NOTE_MIN} characters). Use the template if helpful.</div>
            </div>
          </div>
          <div class="mini-muted">${ready ? "Ready to submit" : `Need ${CHANGE_NOTE_MIN - chars} more chars`}</div>
        </div>

        <div class="step-body">
          <div class="note-actions">
            <button class="btn ghost" type="button" data-insert-template="true" data-ticket="${escapeHtml(ticketId)}">Insert Template</button>
            <button class="btn" type="button" data-submit-note="true" data-ticket="${escapeHtml(ticketId)}">Submit Note</button>
            <button class="btn ghost" type="button" data-back-fix="true" data-ticket="${escapeHtml(ticketId)}">Back to Fix</button>
          </div>

          <label class="smallLabel" for="changeNoteBox">Change note</label>
          <textarea id="changeNoteBox" class="stepText" rows="8" placeholder="Write your change note here...">${escapeHtml(s.changeNote || "")}</textarea>

          <div class="mini-muted" id="changeNoteCount">Characters: ${chars}</div>
        </div>
      </div>
    `;
  }

  function renderValidations(t) {
    const v = t.validations || [];
    return `
      <div class="miniCard" style="margin-top:12px;">
        <div class="miniTitle">Suggested Validation Checks</div>
        <div class="miniDesc">
          ${v.length ? `<ul class="bullets">${v.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : `<span class="mini-muted">None provided.</span>`}
        </div>
      </div>
    `;
  }

  function renderTicketDetail(ticketId) {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;

    const wf = t.workflow || {};
    const gamified = isStageObject(wf.triage) && isStageObject(wf.diagnosis) && isStageObject(wf.fix);

    let s = ensureStateShape(ticketId, loadTicketState(ticketId));
    s = normalizeUiStage(s);
    s.resolved = computeResolved(s);
    saveTicketState(ticketId, s);

    const stageTabs = renderStageTabs(ticketId, s);
    const statusLine = renderStatusLine(s);

    let stageHtml = "";
    if (!gamified) {
      stageHtml = `<div class="card"><div class="card-title">This ticket is not in MCQ format.</div><div class="card-desc">Update the lab JSON workflow to use q/options/correct objects.</div></div>`;
    } else {
      if (s.uiStage === "triage") stageHtml = renderMCQStage("triage", wf.triage, ticketId, s);
      else if (s.uiStage === "diagnosis") stageHtml = renderMCQStage("diagnosis", wf.diagnosis, ticketId, s);
      else if (s.uiStage === "fix") stageHtml = renderMCQStage("fix", wf.fix, ticketId, s);
      else stageHtml = renderChangeNote(ticketId, s);
    }

    $("#ticketDetail").innerHTML = `
      <div class="detailCard">
        <div class="detailTop">
          <div class="detailKicker">${escapeHtml(t.id)} • ${escapeHtml(t.category)}</div>
          <div class="detailTitle">${escapeHtml(t.title)}</div>
          <div class="detailSummary">${escapeHtml(t.summary)}</div>
        </div>

        ${renderEvidenceBlock(t)}

        ${stageTabs}
        ${statusLine}

        ${stageHtml}

        ${renderValidations(t)}
      </div>
    `;

    // Wire change-note live count + persistence
    const box = $("#changeNoteBox");
    if (box) {
      box.addEventListener("input", () => {
        const ns = ensureStateShape(ticketId, loadTicketState(ticketId));
        ns.changeNote = box.value || "";
        ns.resolved = computeResolved(ns);
        saveTicketState(ticketId, ns);

        const c = (ns.changeNote || "").length;
        const count = $("#changeNoteCount");
        if (count) count.textContent = `Characters: ${c}`;

        updateProgressAndHealth();
      });
    }
  }

  /* ----------------------------- Actions ----------------------------- */

  function selectTicket(ticketId) {
    selectedId = ticketId;
    renderTicketList();
    renderTicketDetail(ticketId);
    updateProgressAndHealth();
  }

  function handleAnswer(ticketId, stageKey, optionIdx) {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;

    const stageObj = t.workflow?.[stageKey];
    if (!isStageObject(stageObj)) return;

    const idx = Number(optionIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;

    const s0 = loadTicketState(ticketId);
    const s = ensureStateShape(ticketId, s0);

    s.answers[stageKey] = idx;
    s.attempts.total += 1;

    const correctNow = (idx === stageObj.correct);
    s.correct[stageKey] = correctNow;
    if (!correctNow) s.attempts.wrong += 1;

    // Unlock progression only if correct
    if (correctNow) {
      if (stageKey === "triage") s.uiStage = "diagnosis";
      else if (stageKey === "diagnosis") s.uiStage = "fix";
      else if (stageKey === "fix") s.uiStage = "changeNote";
    }

    s.resolved = computeResolved(s);
    saveTicketState(ticketId, s);

    renderTicketDetail(ticketId);
    updateProgressAndHealth();
  }

  function goNextStage(ticketId) {
    const s = ensureStateShape(ticketId, loadTicketState(ticketId));
    const unlocked = getUnlockedStages(s);

    const order = ["triage", "diagnosis", "fix", "changeNote"];
    const i = order.indexOf(s.uiStage);
    const next = order[Math.min(i + 1, order.length - 1)];

    if (unlocked.has(next)) {
      s.uiStage = next;
      saveTicketState(ticketId, s);
      renderTicketDetail(ticketId);
    }
  }

  function goChangeNote(ticketId) {
    const s = ensureStateShape(ticketId, loadTicketState(ticketId));
    const unlocked = getUnlockedStages(s);
    if (!unlocked.has("changeNote")) return; // locked until fix is correct
    s.uiStage = "changeNote";
    saveTicketState(ticketId, s);
    renderTicketDetail(ticketId);
  }

  function backToFix(ticketId) {
    const s = ensureStateShape(ticketId, loadTicketState(ticketId));
    const unlocked = getUnlockedStages(s);
    if (!unlocked.has("fix")) return;
    s.uiStage = "fix";
    saveTicketState(ticketId, s);
    renderTicketDetail(ticketId);
  }

  function insertTemplate(ticketId) {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;

    const s = ensureStateShape(ticketId, loadTicketState(ticketId));

    // SIMPLE + NEAT template (like your older screenshot)
    const template =
`Change implemented:
Root cause:
Validation performed:
Impact / downtime:`;

    // If empty, insert. If not empty, append with spacing.
    if (!s.changeNote.trim()) s.changeNote = template;
    else s.changeNote = `${s.changeNote.trim()}\n\n${template}`;

    saveTicketState(ticketId, s);
    renderTicketDetail(ticketId);
    updateProgressAndHealth();
  }

  function submitNote(ticketId) {
    const s = ensureStateShape(ticketId, loadTicketState(ticketId));
    const note = (s.changeNote || "").trim();
    if (note.length < CHANGE_NOTE_MIN) {
      alert(`Change note must be at least ${CHANGE_NOTE_MIN} characters.`);
      return;
    }
    s.doneNote = true;
    s.resolved = computeResolved(s);
    saveTicketState(ticketId, s);
    renderTicketDetail(ticketId);
    updateProgressAndHealth();
  }

  /* ----------------------------- Progress / Health ----------------------------- */

  function computeTicketComplete(s) {
    return computeResolved(s);
  }

  function computeProgress() {
    let done = 0;
    for (const t of tickets) {
      const s = ensureStateShape(t.id, loadTicketState(t.id));
      if (computeTicketComplete(s)) done++;
    }
    return { done, total: tickets.length };
  }

  function computeCategoryHealth() {
    const cats = Array.from(new Set(tickets.map((t) => t.category)));
    const byCat = {};
    for (const c of cats) {
      const subset = tickets.filter((t) => t.category === c);
      const total = subset.length;
      const done = subset.reduce((acc, t) => acc + (computeTicketComplete(ensureStateShape(t.id, loadTicketState(t.id))) ? 1 : 0), 0);
      const pct = total ? Math.round((done / total) * 100) : 0;
      byCat[c] = { done, total, pct };
    }
    return byCat;
  }

  function updateProgressAndHealth() {
    const p = computeProgress();
    const overallPct = p.total ? Math.round((p.done / p.total) * 100) : 0;

    const lp = $("#labProgress");
    if (lp) lp.textContent = `Progress: ${p.done}/${p.total}`;

    const ho = $("#healthOverall");
    if (ho) ho.textContent = `Overall Health: ${overallPct}%`;

    const byCat = computeCategoryHealth();
    const catNames = Object.keys(byCat);

    const a = catNames[0];
    const b = catNames[1];

    const ha = $("#healthA");
    const hb = $("#healthB");

    if (ha) ha.textContent = a ? `${a}: ${byCat[a].pct}%` : "—";
    if (hb) hb.textContent = b ? `${b}: ${byCat[b].pct}%` : "—";
  }

  /* ----------------------------- Report (existing buttons) ----------------------------- */

  function openReportModal() {
    const m = $("#reportModal");
    if (m) m.setAttribute("aria-hidden", "false");
  }
  function closeReportModal() {
    const m = $("#reportModal");
    if (m) m.setAttribute("aria-hidden", "true");
  }

  function getMeta() {
    const val = (id) => (document.getElementById(id)?.value || "").trim();
    return {
      analystName: val("analystName") || "Analyst",
      courseSection: val("courseSection"),
      courseTitle: val("courseTitle") || lab.title,
      activityDate: val("activityDate")
    };
  }

  function buildTextReport() {
    const meta = getMeta();
    const p = computeProgress();
    const byCat = computeCategoryHealth();

    const lines = [];
    lines.push("Server Admin Academy");
    lines.push(`${lab.title} — Report`);
    lines.push("");
    lines.push(`Analyst: ${meta.analystName}`);
    if (meta.courseSection) lines.push(`Section: ${meta.courseSection}`);
    if (meta.courseTitle) lines.push(`Course: ${meta.courseTitle}`);
    if (meta.activityDate) lines.push(`Date: ${meta.activityDate}`);
    lines.push("");
    lines.push(`Progress: ${p.done}/${p.total} (${p.total ? Math.round((p.done / p.total) * 100) : 0}%)`);
    Object.entries(byCat).forEach(([k, v]) => lines.push(`${k}: ${v.done}/${v.total} (${v.pct}%)`));
    lines.push("");
    lines.push("----- Ticket Work -----");

    for (const t of tickets) {
      const wf = t.workflow || {};
      const gamified = isStageObject(wf.triage) && isStageObject(wf.diagnosis) && isStageObject(wf.fix);
      const s = ensureStateShape(t.id, loadTicketState(t.id));

      lines.push("");
      lines.push(`${t.id} — ${t.title}`);
      lines.push(`Category: ${t.category}`);
      lines.push(`Status: ${computeTicketComplete(s) ? "Complete" : "In Progress"}`);
      lines.push("");

      // Include evidence/artifact
      lines.push("Evidence / Artifact:");
      const evLines = [];
      const addEv = (val) => {
        if (!val) return;
        if (typeof val === "string") {
          val.split("\n").map(x => x.trim()).filter(Boolean).forEach(x => evLines.push(x));
        } else if (Array.isArray(val)) {
          val.forEach(x => typeof x === "string" && x.trim() && evLines.push(x.trim()));
        } else if (typeof val === "object") {
          Object.entries(val).forEach(([k, v]) => evLines.push(`${k}: ${String(v ?? "").trim()}`));
        }
      };
      addEv(t.artifact);
      addEv(t.evidence);
      if (!evLines.length) addEv(t.env);
      lines.push(evLines.length ? evLines.map(x => `- ${x}`).join("\n") : "(none)");
      lines.push("");

      if (gamified) {
        const pickLine = (k) => {
          const picked = s.answers[k];
          const label =
            Number.isInteger(picked) && wf[k].options && wf[k].options[picked]
              ? wf[k].options[picked]
              : "(no selection)";
          const mark = s.correct[k] ? "✅" : "❌";
          return `${mark} ${label}`;
        };

        lines.push("Triage:");
        lines.push(pickLine("triage"));
        lines.push("");
        lines.push("Diagnosis:");
        lines.push(pickLine("diagnosis"));
        lines.push("");
        lines.push("Fix:");
        lines.push(pickLine("fix"));
        lines.push("");
      }

      lines.push("Change Note:");
      lines.push((s.changeNote || "").trim() || "(blank)");
    }

    return lines.join("\n");
  }

  function downloadText() {
    const meta = getMeta();
    const txt = buildTextReport();
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lab.id}-${meta.analystName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadPDF() {
    // Keep your existing PDF generator dependency; basic export is enough for now.
    const meta = getMeta();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });

    const txt = buildTextReport();
    const lines = doc.splitTextToSize(txt, 520);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(lines, 44, 54);

    doc.save(`${lab.id}-${meta.analystName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  function wireReport() {
    const openBtn = $("#btnReport");
    if (openBtn) openBtn.addEventListener("click", openReportModal);

    const modal = $("#reportModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.dataset && t.dataset.close === "true") closeReportModal();
      });
    }

    const btnPDF = $("#btnReportPDF");
    const btnTXT = $("#btnReportText");
    if (btnPDF) btnPDF.addEventListener("click", () => { closeReportModal(); downloadPDF(); });
    if (btnTXT) btnTXT.addEventListener("click", () => { closeReportModal(); downloadText(); });
  }

  /* ----------------------------- Reset ----------------------------- */

  function resetLab() {
    for (const t of tickets) clearTicketState(t.id);
    selectedId = null;
    applyFilters();
    $("#ticketDetail").innerHTML =
      `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Lab reset.</div></div>`;
    updateProgressAndHealth();
  }

  /* ----------------------------- Init ----------------------------- */

  async function init() {
    const labId = getLabId();
    if (!labId) {
      $("#labTitle").textContent = "Missing lab id";
      $("#labDesc").textContent = "Open from the academy site or add ?lab=dns-dhcp to the URL.";
      return;
    }

    lab = await loadLabData(labId);
    tickets = lab.tickets || [];

    document.title = `${lab.title} • Activity`;
    $("#labTitleTop").textContent = lab.title;
    $("#labSubTop").textContent = `${lab.track} • ${lab.subject} • ${tickets.length} tickets`;
    $("#labTitle").textContent = lab.title;
    $("#labDesc").textContent = lab.description;
    $("#footerLeft").textContent = `${lab.track} • ${lab.subject}`;
    if (lab.rolePill) $("#rolePill").textContent = lab.rolePill;

    buildTabs(lab.categories || []);

    const sIn = $("#searchInput");
    if (sIn) sIn.addEventListener("input", applyFilters);

    const rBtn = $("#btnRandom");
    if (rBtn) rBtn.addEventListener("click", () => {
      if (!filteredTickets.length) return;
      const pick = filteredTickets[Math.floor(Math.random() * filteredTickets.length)];
      selectTicket(pick.id);
    });

    const resetBtn = $("#btnResetLab");
    if (resetBtn) resetBtn.addEventListener("click", resetLab);

    wireMeta();
    wireReport();

    // Delegated click handlers
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;

      // Answer buttons
      if (btn.dataset.answer === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        const stageKey = btn.getAttribute("data-stage");
        const idx = btn.getAttribute("data-idx");
        if (ticketId && stageKey) handleAnswer(ticketId, stageKey, idx);
        return;
      }

      // Stage tabs
      if (btn.dataset.stageTab === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        const stage = btn.getAttribute("data-stage");
        if (!ticketId || !stage) return;

        const s = ensureStateShape(ticketId, loadTicketState(ticketId));
        const unlocked = getUnlockedStages(s);
        if (!unlocked.has(stage)) return;

        s.uiStage = stage;
        saveTicketState(ticketId, s);
        renderTicketDetail(ticketId);
        return;
      }

      // Next stage
      if (btn.dataset.next === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) goNextStage(ticketId);
        return;
      }

      // Go to Change Note
      if (btn.dataset.gotoNote === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) goChangeNote(ticketId);
        return;
      }

      // Back to Fix
      if (btn.dataset.backFix === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) backToFix(ticketId);
        return;
      }

      // Insert Template
      if (btn.dataset.insertTemplate === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) insertTemplate(ticketId);
        return;
      }

      // Submit Note
      if (btn.dataset.submitNote === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) submitNote(ticketId);
        return;
      }
    });

    applyFilters();
    updateProgressAndHealth();

    if (filteredTickets[0]) selectTicket(filteredTickets[0].id);
  }

  init().catch((err) => {
    console.error(err);
    $("#labTitle").textContent = "Failed to load lab";
    $("#labDesc").textContent = "Confirm ./data/labs/<lab>.json exists and matches the ?lab= value.";
  });
})();
