/* FULL FILE: assets/app-activity.js */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const LS_PREFIX = "sa_academy_v2_ticket_";
  const LS_META_PREFIX = "sa_academy_v2_meta_";
  const CHANGE_NOTE_MIN = 40;

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

  function defaultTicketState() {
    return {
      answers: { triage: null, diagnosis: null, fix: null },
      correct: { triage: false, diagnosis: false, fix: false },
      uiStage: "triage",
      attempts: { total: 0, wrong: 0 },
      triageNote: "",
      diagnosisNote: "",
      fixNote: "",
      changeNote: "",
      doneNote: false,
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
    if (typeof s.triageNote !== "string") s.triageNote = "";
    if (typeof s.diagnosisNote !== "string") s.diagnosisNote = "";
    if (typeof s.fixNote !== "string") s.fixNote = "";
    if (typeof s.changeNote !== "string") s.changeNote = "";
    if (typeof s.doneNote !== "boolean") s.doneNote = false;
    if (typeof s.resolved !== "boolean") s.resolved = false;

    saveTicketState(ticketId, s);
    return s;
  }

  function computeResolved(s) {
    const allCorrect = !!(s.correct?.triage && s.correct?.diagnosis && s.correct?.fix);
    const noteOk = !!(s.doneNote && (s.changeNote || "").trim().length >= CHANGE_NOTE_MIN);
    return allCorrect && noteOk;
  }

  function getUnlockedStages(s) {
    const unlocked = new Set(["triage"]);
    if (s.correct?.triage) unlocked.add("diagnosis");
    if (s.correct?.triage && s.correct?.diagnosis) unlocked.add("fix");
    if (s.correct?.triage && s.correct?.diagnosis && s.correct?.fix) unlocked.add("changeNote");
    return unlocked;
  }

  function normalizeUiStage(s) {
    const unlocked = getUnlockedStages(s);
    if (unlocked.has(s.uiStage)) return s;

    if (unlocked.has("changeNote")) s.uiStage = "changeNote";
    else if (unlocked.has("fix")) s.uiStage = "fix";
    else if (unlocked.has("diagnosis")) s.uiStage = "diagnosis";
    else s.uiStage = "triage";
    return s;
  }

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

  function getMeta() {
    const val = (id) => (document.getElementById(id)?.value || "").trim();
    return {
      analystName: val("analystName") || "Analyst",
      courseSection: val("courseSection"),
      courseTitle: val("courseTitle") || (lab?.title || "Report"),
      activityDate: val("activityDate")
    };
  }

  async function loadLabData(labId) {
    const res = await fetch(`./data/labs/${encodeURIComponent(labId)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("Lab data not found");
    return res.json();
  }

  function buildTabs(categories) {
    const tabsEl = $("#tabs");
    if (!tabsEl) return;
    tabsEl.innerHTML = "";

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
      tabsEl.appendChild(btn);
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
    const q = ($("#searchInput")?.value || "").trim();
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
    if (!list) return;
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

  function evidenceToLines(t) {
    const lines = [];
    const pushLines = (val) => {
      if (!val) return;
      if (typeof val === "string") {
        val.split("\n").map(x => x.trim()).filter(Boolean).forEach(x => lines.push(x));
        return;
      }
      if (Array.isArray(val)) {
        val.forEach(x => typeof x === "string" && x.trim() && lines.push(x.trim()));
        return;
      }
      if (typeof val === "object") {
        Object.entries(val).forEach(([k, v]) => {
          const txt = `${k}: ${String(v ?? "").trim()}`.trim();
          if (txt) lines.push(txt);
        });
      }
    };
    pushLines(t.artifact);
    pushLines(t.evidence);
    if (!lines.length) pushLines(t.env);
    return lines;
  }

  function renderEvidenceOldStyle(t) {
    const lines = evidenceToLines(t);
    const body = lines.length ? lines.join("\n") : "(No evidence provided)";
    return `
      <div class="evidenceBox">
        <div class="evidenceTitle">Evidence</div>
        <pre class="evidencePre">${escapeHtml(body)}</pre>
      </div>
    `;
  }

  function renderStageTabs(ticketId, s) {
    const unlocked = getUnlockedStages(s);
    const mk = (key, label) => {
      const active = s.uiStage === key ? " active" : "";
      const locked = unlocked.has(key) ? "" : " disabled";
      return `
        <button type="button"
          class="tab stageTab${active}${locked}"
          data-stage-tab="true"
          data-ticket="${escapeHtml(ticketId)}"
          data-stage="${escapeHtml(key)}"
          ${unlocked.has(key) ? "" : "aria-disabled='true'"}
        >${escapeHtml(label)}</button>
      `;
    };

    return `
      <div class="tabs stageTabs">
        ${mk("triage", "Triage")}
        ${mk("diagnosis", "Diagnosis")}
        ${mk("fix", "Fix")}
        ${mk("changeNote", "Change Note")}
      </div>
    `;
  }

  function renderStatusLine(s) {
    const status = computeResolved(s)
      ? "Resolved"
      : (s.correct?.triage || s.correct?.diagnosis || s.correct?.fix || s.doneNote ? "In progress" : "Not started");

    return `
      <div class="statusLine">
        <strong>Status:</strong> ${escapeHtml(status)}
        <span class="sep">•</span>
        <strong>Attempts:</strong> ${s.attempts?.total || 0} (wrong: ${s.attempts?.wrong || 0})
        <div class="statusHint">Resolve by answering all three stages correctly + change note (min ${CHANGE_NOTE_MIN} chars).</div>
      </div>
    `;
  }

  function renderMCQStage(stageKey, stageObj, ticketId, s) {
    const prettyName =
      stageKey === "triage" ? "Triage" :
      stageKey === "diagnosis" ? "Diagnosis" :
      "Fix";

    const selectedIdx = s.answers?.[stageKey];
    const isCorrect = !!s.correct?.[stageKey];

    const rightFlag =
      selectedIdx == null ? `<span class="mini-muted">Select an option</span>` :
      isCorrect ? `<span class="mini-good">Correct ✓</span>` :
      `<span class="mini-bad">Incorrect ✕</span>`;

    const optionsHtml = stageObj.options.map((label, idx) => {
      const picked = selectedIdx === idx;
      const cls = picked ? "btn option selected" : "btn option";
      return `
        <button type="button"
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
          <div class="optionsGrid">${optionsHtml}</div>
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

        ${renderEvidenceOldStyle(t)}
        ${stageTabs}
        ${statusLine}
        ${stageHtml}
        ${renderValidations(t)}
      </div>
    `;

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

    const s = ensureStateShape(ticketId, loadTicketState(ticketId));

    s.answers[stageKey] = idx;
    s.attempts.total += 1;

    const correctNow = (idx === stageObj.correct);
    s.correct[stageKey] = correctNow;
    if (!correctNow) s.attempts.wrong += 1;

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
    if (!unlocked.has("changeNote")) return;
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
    const s = ensureStateShape(ticketId, loadTicketState(ticketId));
    const template =
`Change implemented:
Root cause:
Validation performed:
Impact / downtime:`;

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

  function computeProgress() {
    let done = 0;
    for (const t of tickets) {
      const s = ensureStateShape(t.id, loadTicketState(t.id));
      if (computeResolved(s)) done++;
    }
    return { done, total: tickets.length };
  }

  function computeCategoryHealth() {
    const cats = Array.from(new Set(tickets.map((t) => t.category)));
    const byCat = {};
    for (const c of cats) {
      const subset = tickets.filter((t) => t.category === c);
      const total = subset.length;
      const done = subset.reduce((acc, t) => acc + (computeResolved(ensureStateShape(t.id, loadTicketState(t.id))) ? 1 : 0), 0);
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

  function openReportModal() {
    const m = $("#reportModal");
    if (m) m.setAttribute("aria-hidden", "false");
  }
  function closeReportModal() {
    const m = $("#reportModal");
    if (m) m.setAttribute("aria-hidden", "true");
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

  /* ----------------------------- PDF: print-based, fixed to NOT overflow ----------------------------- */

  function buildPrintableHtml() {
    const meta = getMeta();
    const generated = new Date().toLocaleString();

    const p = computeProgress();
    const byCat = computeCategoryHealth();
    const overallPct = p.total ? Math.round((p.done / p.total) * 100) : 0;

    const catLine = Object.entries(byCat)
      .map(([k, v]) => `${escapeHtml(k)} ${v.pct}%`)
      .join(" • ");

    const statusPill = (status) => {
      const cls = status === "Complete" ? "good" : status === "Attempted" ? "bad" : "warn";
      return `<span class="pill ${cls}">${escapeHtml(status)}</span>`;
    };

    const ticketStatus = (s) => {
      if (computeResolved(s)) return "Complete";
      const attempted = (s?.attempts?.total || 0) > 0 || (s?.changeNote || "").trim().length > 0;
      return attempted ? "Attempted" : "Not started";
    };

    const rows = tickets
      .map((t) => {
        const s = ensureStateShape(t.id, loadTicketState(t.id));
        const st = ticketStatus(s);
        const attempts = s?.attempts?.total || 0;
        const wrong = s?.attempts?.wrong || 0;
        const type = escapeHtml(t.type || "—");
        return `
          <tr>
            <td>${escapeHtml(t.id)}</td>
            <td>${escapeHtml(t.category)}</td>
            <td>${type}</td>
            <td>${escapeHtml(t.title)}</td>
            <td>${statusPill(st)}</td>
            <td class="c">${attempts}</td>
            <td class="c">${wrong}</td>
          </tr>
        `;
      })
      .join("");

    const notes = tickets
      .map((t) => {
        const s = ensureStateShape(t.id, loadTicketState(t.id));
        const text = (s.changeNote || "").trim();
        if (!text) return "";
        const resolved = computeResolved(s);
        return `
          <div class="r-note-item">
            <div class="r-note-head">
              <span class="pill ${resolved ? "good" : "warn"}">${resolved ? "Resolved" : "In progress"}</span>
              <span class="note-strong">${escapeHtml(t.id)} — ${escapeHtml(t.title)}</span>
              <span class="note-muted">(${escapeHtml(t.category)})</span>
            </div>
            <div class="r-note-body">${escapeHtml(text)}</div>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    const overviewText = (lab.reportOverview || lab.description || "").trim() || "—";

    // ✅ This is the important part: FIXED print sizing + fixed table layout + forced wrapping.
    const css = `
      @page { size: letter landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      html, body { background:#fff; color:#0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
      .r-wrap { max-width: 100%; margin: 0 auto; }
      .r-header { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; }
      .r-top { display:flex; justify-content:space-between; align-items:flex-start; gap: 14px; }
      .r-title { font-weight: 900; font-size: 16px; letter-spacing: .2px; }
      .r-sub { font-size: 11px; color:#334155; font-weight: 700; margin-top: 2px; }
      .r-meta { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; font-size: 11px; color:#0f172a; }
      .r-meta b { font-weight: 800; }
      .section { margin-top: 12px; }
      h2 { font-size: 12px; margin: 0 0 6px 0; }
      .note { font-size: 11px; color:#334155; line-height: 1.4; white-space: pre-wrap; }

      table { width:100%; border-collapse: collapse; table-layout: fixed; }
      thead th, tbody td {
        border: 1px solid #e2e8f0;
        padding: 6px;
        font-size: 10px;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      thead th { background:#f1f5f9; font-weight: 900; }
      tbody tr:nth-child(even) td { background:#fbfdff; }
      td.c { text-align:center; }

      .pill { display:inline-block; padding: 2px 7px; border-radius: 999px; font-size: 10px; font-weight: 900; border:1px solid #e2e8f0; white-space: nowrap; }
      .pill.good { background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.25); color:#166534; }
      .pill.warn { background: rgba(251,191,36,.12); border-color: rgba(251,191,36,.30); color:#92400e; }
      .pill.bad  { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.25); color:#991b1b; }

      .r-note-item { border:1px solid #e2e8f0; border-radius: 12px; padding: 10px; margin-bottom: 8px; }
      .r-note-head { display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
      .note-strong { font-weight: 900; color:#0f172a; }
      .note-muted { color:#475569; font-weight: 800; }
      .r-note-body { margin-top: 6px; font-size: 11px; color:#0f172a; white-space: pre-wrap; line-height: 1.4; }

      .print-hint { margin-top: 8px; font-size: 10px; color:#64748b; }
      @media print { .print-hint { display:none; } }
    `;

    // ✅ Use colgroup percentages so it ALWAYS fits the page width.
    const colgroup = `
      <colgroup>
        <col style="width: 10%;" />
        <col style="width: 9%;" />
        <col style="width: 7%;" />
        <col style="width: 44%;" />
        <col style="width: 12%;" />
        <col style="width: 9%;" />
        <col style="width: 9%;" />
      </colgroup>
    `;

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(lab.title)} — Report</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="r-wrap">
          <div class="r-header">
            <div class="r-top">
              <div>
                <div class="r-title">NewVue Health — ${escapeHtml(lab.title)} Incident Triage Report</div>
                <div class="r-sub">${escapeHtml(meta.courseTitle || lab.title)} • ${escapeHtml(meta.courseSection || "—")}</div>
              </div>
              <div style="text-align:right; font-size:11px; color:#334155; font-weight:700;">
                <div><b>Date:</b> ${escapeHtml(meta.activityDate || "—")}</div>
                <div><b>Generated:</b> ${escapeHtml(generated)}</div>
              </div>
            </div>

            <div class="r-meta">
              <div><b>Student:</b> ${escapeHtml(meta.analystName || "—")}</div>
              <div><b>Role:</b> ${escapeHtml(lab.rolePill || "Systems Administrator")}</div>
              <div><b>Progress:</b> ${p.done}/${p.total} solved</div>
              <div><b>Health:</b> Overall ${overallPct}%${catLine ? " • " + catLine : ""}</div>
            </div>
          </div>

          <div class="section">
            <h2>Report Overview</h2>
            <div class="note">${escapeHtml(overviewText)}</div>
          </div>

          <div class="section">
            <h2>Challenge Outcomes</h2>
            <table>
              ${colgroup}
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Challenge</th>
                  <th>Status</th>
                  <th style="text-align:center;">Attempts</th>
                  <th style="text-align:center;">Wrong</th>
                </tr>
              </thead>
              <tbody>
                ${rows || "<tr><td colspan='7'>No tickets found.</td></tr>"}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Change Notes</h2>
            <div class="note" style="margin-bottom:8px;">
              Notes are included for tickets where a change note was submitted (minimum 40 characters).
            </div>
            ${notes || `<div class="note">No change notes were submitted.</div>`}
          </div>

          <div class="section">
            <h2>Integrity Note</h2>
            <div class="note">
              This report reflects actions recorded in the offline simulation. Attach screenshots if your instructor requests additional evidence.
            </div>
          </div>

          <div class="print-hint">
            When the print dialog opens, choose <b>Save as PDF</b>.
          </div>
        </div>

        <script>
          window.addEventListener('load', () => {
            setTimeout(() => window.print(), 200);
          });
        </script>
      </body>
      </html>
    `;
  }

  function downloadPDF() {
    const html = buildPrintableHtml();
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Please allow popups for this site, then try again.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
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

  function resetLab() {
    for (const t of tickets) clearTicketState(t.id);
    selectedId = null;
    applyFilters();
    $("#ticketDetail").innerHTML =
      `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Lab reset.</div></div>`;
    updateProgressAndHealth();
  }

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

    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;

      if (btn.classList.contains("disabled") && btn.dataset.stageTab === "true") return;

      if (btn.dataset.answer === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        const stageKey = btn.getAttribute("data-stage");
        const idx = btn.getAttribute("data-idx");
        if (ticketId && stageKey) handleAnswer(ticketId, stageKey, idx);
        return;
      }

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

      if (btn.dataset.next === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) goNextStage(ticketId);
        return;
      }

      if (btn.dataset.gotoNote === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) goChangeNote(ticketId);
        return;
      }

      if (btn.dataset.backFix === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) backToFix(ticketId);
        return;
      }

      if (btn.dataset.insertTemplate === "true") {
        const ticketId = btn.getAttribute("data-ticket");
        if (ticketId) insertTemplate(ticketId);
        return;
      }

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
