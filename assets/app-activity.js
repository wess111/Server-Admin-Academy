(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const LS_PREFIX = "sa_academy_v2_ticket_";
  const LS_META_PREFIX = "sa_academy_v2_meta_";

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
    // Backwards-compatible state: supports both legacy textarea workflow
    // and the new gamified (MCQ) validation workflow.
    return {
      // New gamified workflow state
      answers: { triage: null, diagnosis: null, fix: null },
      correct: { triage: false, diagnosis: false, fix: false },
      resolved: false,

      // Optional reflection/change note (kept as a textarea step)
      changeNote: "",
      doneNote: false,

      // Legacy fields (kept so existing saved states don’t break)
      triageNote: "",
      diagnosisNote: "",
      fixNote: "",
      doneTriage: false,
      doneDiagnosis: false,
      doneFix: false,

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
    try { localStorage.removeItem(lsKey(ticketId)); } catch {}
  }

  async function loadLabData(labId) {
    const res = await fetch(`./data/labs/${encodeURIComponent(labId)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("Lab data not found");
    return res.json();
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
            <div class="badge">${escapeHtml(t.category)}</div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => selectTicket(t.id));
      list.appendChild(card);
    }
  }

  function stepEditor({ num, title, hint, fieldId, placeholder, checkedKey, checked }) {
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
            <input type="checkbox" data-step="${checkedKey}" ${checked ? "checked" : ""}/> Done
          </label>
        </div>
        <div class="step-body">
          <textarea class="stepText" id="${fieldId}" rows="7" placeholder="${escapeHtml(placeholder)}"></textarea>
          <div class="note-actions">
            <button class="btn" type="button" data-save="${fieldId}">Save</button>
            <button class="btn ghost" type="button" data-copy="${fieldId}">Copy</button>
            <span class="mini-muted" id="${fieldId}Saved">Not saved yet.</span>
          </div>
        </div>
      </div>
    `;
  }

  function envCards(envObj) {
    const entries = Object.entries(envObj || {});
    if (!entries.length) return "";
    return entries
      .map(
        ([k, v]) => `
        <div class="miniCard">
          <div class="miniTitle">${escapeHtml(k)}</div>
          <div class="miniDesc">${escapeHtml(v)}</div>
        </div>
      `
      )
      .join("");
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

  function ensureGamifiedState(ticketId, state) {
    // Ensure the state object has the MCQ answer/correct shape.
    const next = state && typeof state === "object" ? state : defaultTicketState();
    if (!next.answers || typeof next.answers !== "object") next.answers = { triage: null, diagnosis: null, fix: null };
    if (!next.correct || typeof next.correct !== "object") next.correct = { triage: false, diagnosis: false, fix: false };
    if (typeof next.resolved !== "boolean") next.resolved = false;

    // Normalize keys (avoid undefined)
    ["triage", "diagnosis", "fix"].forEach((k) => {
      if (!(k in next.answers)) next.answers[k] = null;
      if (!(k in next.correct)) next.correct[k] = false;
    });

    // Persist normalization so the UI and progress meters stay consistent.
    saveTicketState(ticketId, next);
    return next;
  }

  function renderStage(stageKey, stageObj, ticketId, ticketState) {
    const selectedIdx = ticketState?.answers?.[stageKey];
    const isCorrect = !!ticketState?.correct?.[stageKey];

    const prettyName =
      stageKey === "triage" ? "Triage (Symptom)" :
      stageKey === "diagnosis" ? "Diagnosis (Root Cause)" :
      "Fix (GUI Action)";

    const stepNum = stageKey === "triage" ? 1 : stageKey === "diagnosis" ? 2 : 3;

    // Keep the existing layout/classes (step, step-head, step-body, btn, ghost, etc.)
    return `
      <div class="step" id="stage-${escapeHtml(stageKey)}">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">${stepNum}</div>
            <div>
              <div class="step-title">${escapeHtml(prettyName)}</div>
              <div class="step-hint">${escapeHtml(stageObj.q || "")}</div>
            </div>
          </div>

          <div class="mini-muted" aria-live="polite">
            ${selectedIdx == null ? "Select an option" : (isCorrect ? "Correct ✅" : "Incorrect ❌")}
          </div>
        </div>

        <div class="step-body">
          <div class="note-actions" style="gap:8px; flex-wrap:wrap;">
            ${(stageObj.options || []).map((label, idx) => {
              const picked = selectedIdx === idx;
              const cls = picked ? "btn" : "btn ghost";
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
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function handleAnswer(ticketId, stageKey, optionIdx) {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;

    const stageObj = t.workflow?.[stageKey];
    if (!isStageObject(stageObj)) return;

    const idx = Number(optionIdx);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;

    const s0 = loadTicketState(ticketId);
    const s = ensureGamifiedState(ticketId, s0);

    s.answers[stageKey] = idx;
    s.correct[stageKey] = (idx === stageObj.correct);

    // Resolved only if all three stages are correct
    s.resolved = !!(s.correct.triage && s.correct.diagnosis && s.correct.fix);

    saveTicketState(ticketId, s);

    // Re-render only this stage to reflect selection + correctness
    const stageRoot = document.getElementById(`stage-${stageKey}`);
    if (stageRoot) {
      stageRoot.outerHTML = renderStage(stageKey, stageObj, ticketId, s);
    }

    updateProgressAndHealth();
  }

  function selectTicket(ticketId) {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;
    selectedId = ticketId;
    renderTicketList();

    let s = loadTicketState(ticketId);

    const wf = t.workflow || {};
    const gamified = isStageObject(wf.triage) && isStageObject(wf.diagnosis) && isStageObject(wf.fix);
    if (gamified) s = ensureGamifiedState(ticketId, s);

    const noteHint =
      (wf.changeNote && typeof wf.changeNote === "string" ? wf.changeNote : "") ||
      "Write a change record: what changed, why, impact, and validation.";

    $("#ticketDetail").innerHTML = `
      <div class="detailCard">
        <div class="detailTop">
          <div class="detailKicker">${escapeHtml(t.id)} • ${escapeHtml(t.category)}</div>
          <div class="detailTitle">${escapeHtml(t.title)}</div>
          <div class="detailSummary">${escapeHtml(t.summary)}</div>
        </div>

        <div class="envGrid">
          ${envCards(t.env)}
        </div>

        ${
          gamified
            ? (
              renderStage("triage", wf.triage, ticketId, s) +
              renderStage("diagnosis", wf.diagnosis, ticketId, s) +
              renderStage("fix", wf.fix, ticketId, s)
            )
            : (
              (() => {
                const triageHint = wf.triage || "Capture symptoms, scope, urgency, and exact error text.";
                const diagHint = wf.diagnosis || "State a likely root cause and what evidence confirms it.";
                const fixHint = wf.fix || "Document the GUI steps you would take, plus verification.";
                return (
                  stepEditor({
                    num: 1,
                    title: "Triage (Symptom)",
                    hint: triageHint,
                    fieldId: "triageNote",
                    placeholder: "What is failing? Who is impacted? How urgent is it? Include exact messages and scope.",
                    checkedKey: "doneTriage",
                    checked: s.doneTriage
                  }) +
                  stepEditor({
                    num: 2,
                    title: "Diagnosis (Root Cause)",
                    hint: diagHint,
                    fieldId: "diagnosisNote",
                    placeholder: "Likely root cause + what evidence you will collect (logs, checks, commands, config).",
                    checkedKey: "doneDiagnosis",
                    checked: s.doneDiagnosis
                  }) +
                  stepEditor({
                    num: 3,
                    title: "Fix (GUI Action)",
                    hint: fixHint,
                    fieldId: "fixNote",
                    placeholder: "GUI steps to remediate + what you will verify afterward.",
                    checkedKey: "doneFix",
                    checked: s.doneFix
                  })
                );
              })()
            )
        }

        ${stepEditor({
          num: 4,
          title: "Change Note",
          hint: noteHint,
          fieldId: "changeNote",
          placeholder: "Change record: what changed, why, impact/risk, rollback notes (if any), validation performed.",
          checkedKey: "doneNote",
          checked: s.doneNote
        })}

        <div class="miniCard" style="margin-top:12px;">
          <div class="miniTitle">Suggested Validation Checks</div>
          <div class="miniDesc">
            <ul class="bullets">
              ${(t.validations || []).map((v) => `<li>${escapeHtml(v)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    `;

    // Populate legacy textareas if present
    const triEl = $("#triageNote");
    const diEl = $("#diagnosisNote");
    const fiEl = $("#fixNote");
    if (triEl) triEl.value = s.triageNote || "";
    if (diEl) diEl.value = s.diagnosisNote || "";
    if (fiEl) fiEl.value = s.fixNote || "";

    const chEl = $("#changeNote");
    if (chEl) chEl.value = s.changeNote || "";

    // Wire checkbox "Done" toggles that exist in the DOM (legacy + change note)
    $$("#ticketDetail input[type='checkbox'][data-step]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-step");
        const next = loadTicketState(ticketId);
        next[key] = cb.checked;
        saveTicketState(ticketId, next);
        updateProgressAndHealth();
      });
    });

    // Wire Save/Copy buttons for any rendered textarea steps
    $$("#ticketDetail [data-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fieldId = btn.getAttribute("data-save");
        const next = loadTicketState(ticketId);
        const el = document.getElementById(fieldId);
        next[fieldId] = el ? el.value : "";
        saveTicketState(ticketId, next);
        const savedEl = document.getElementById(fieldId + "Saved");
        if (savedEl) savedEl.textContent = "Saved locally.";
        updateProgressAndHealth();
      });
    });

    $$("#ticketDetail [data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fieldId = btn.getAttribute("data-copy");
        const el = document.getElementById(fieldId);
        const txt = el ? (el.value || "") : "";
        if (!txt.trim()) return;
        try {
          await navigator.clipboard.writeText(txt);
        } catch {
          if (el) {
            el.select();
            document.execCommand("copy");
          }
        }
      });
    });

    updateProgressAndHealth();
  }

  function computeTicketComplete(s) {
    // New logic: ticket is “Resolved” only when triage + diagnosis + fix are correct.
    // Backwards compatible: if the ticket has no MCQ state, fall back to legacy checkboxes.
    const hasGamified =
      s && typeof s === "object" &&
      s.correct && typeof s.correct === "object" &&
      ("triage" in s.correct) && ("diagnosis" in s.correct) && ("fix" in s.correct);

    if (hasGamified) {
      return !!(s.correct.triage && s.correct.diagnosis && s.correct.fix);
    }
    return !!(s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote);
  }

  function computeProgress() {
    let done = 0;
    for (const t of tickets) {
      const s = loadTicketState(t.id);
      if (computeTicketComplete(s)) done++;
    }
    return { done, total: tickets.length };
  }

  function computeCategoryHealth() {
    const cats = Array.from(new Set(tickets.map(t => t.category)));
    const byCat = {};
    for (const c of cats) {
      const subset = tickets.filter(t => t.category === c);
      const total = subset.length;
      const done = subset.reduce((acc, t) => acc + (computeTicketComplete(loadTicketState(t.id)) ? 1 : 0), 0);
      const pct = total ? Math.round((done / total) * 100) : 0;
      byCat[c] = { done, total, pct };
    }
    return byCat;
  }

  function updateProgressAndHealth() {
    const p = computeProgress();
    $("#labProgress").textContent = `Progress: ${p.done}/${p.total}`;

    const overallPct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    $("#healthOverall").textContent = `Overall Health: ${overallPct}%`;

    const byCat = computeCategoryHealth();
    const catNames = Object.keys(byCat);

    // Show first two categories in the pills (DNS/DHCP or first two)
    const a = catNames[0];
    const b = catNames[1];

    if (a) $("#healthA").textContent = `${a}: ${byCat[a].pct}%`;
    else $("#healthA").textContent = "—";

    if (b) $("#healthB").textContent = `${b}: ${byCat[b].pct}%`;
    else $("#healthB").textContent = "—";
  }

  function resetLab() {
    for (const t of tickets) clearTicketState(t.id);
    selectedId = null;
    applyFilters();
    $("#ticketDetail").innerHTML =
      `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Lab reset.</div></div>`;
    updateProgressAndHealth();
  }

  /* ---------------- Report Generator ---------------- */

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
    lines.push(`Progress: ${p.done}/${p.total} (${p.total ? Math.round((p.done/p.total)*100) : 0}%)`);
    Object.entries(byCat).forEach(([k,v]) => lines.push(`${k}: ${v.done}/${v.total} (${v.pct}%)`));
    lines.push("");
    lines.push("----- Ticket Work -----");

    for (const t of tickets) {
      const s = loadTicketState(t.id);
      lines.push("");
      lines.push(`${t.id} — ${t.title}`);
      lines.push(`Category: ${t.category}`);
      lines.push(`Status: ${computeTicketComplete(s) ? "Complete" : "In Progress"}`);
      lines.push("");

      // If the lab uses gamified MCQ stages, export the selected option + correctness.
      const wf = t.workflow || {};
      const gamified = isStageObject(wf.triage) && isStageObject(wf.diagnosis) && isStageObject(wf.fix);

      if (gamified) {
        const stageLine = (k) => {
          const picked = s.answers?.[k];
          const label =
            Number.isInteger(picked) && wf[k].options && wf[k].options[picked]
              ? wf[k].options[picked]
              : "(no selection)";
          const mark = s.correct?.[k] ? "✅" : "❌";
          return `${mark} ${label}`;
        };

        lines.push("Triage:");
        lines.push(stageLine("triage"));
        lines.push("");
        lines.push("Diagnosis:");
        lines.push(stageLine("diagnosis"));
        lines.push("");
        lines.push("Fix:");
        lines.push(stageLine("fix"));
        lines.push("");
        lines.push("Change Note:");
      } else {
        lines.push("Triage:");
        lines.push(s.triageNote?.trim() ? s.triageNote.trim() : "(blank)");
        lines.push("");
        lines.push("Diagnosis:");
        lines.push(s.diagnosisNote?.trim() ? s.diagnosisNote.trim() : "(blank)");
        lines.push("");
        lines.push("Fix:");
        lines.push(s.fixNote?.trim() ? s.fixNote.trim() : "(blank)");
        lines.push("");
        lines.push("Change Note:");
      }

      lines.push(s.changeNote?.trim() ? s.changeNote.trim() : "(blank)");
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
    const meta = getMeta();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "letter" });

    const p = computeProgress();
    const overallPct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    const byCat = computeCategoryHealth();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Server Admin Academy", 44, 54);

    doc.setFontSize(13);
    doc.text(`${lab.title} — Report`, 44, 74);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    const metaRows = [
      ["Analyst", meta.analystName],
      ["Section", meta.courseSection || "—"],
      ["Course", meta.courseTitle || lab.title],
      ["Date", meta.activityDate || "—"],
      ["Progress", `${p.done}/${p.total} (${overallPct}%)`]
    ];

    doc.autoTable({
      startY: 92,
      head: [["Field", "Value"]],
      body: metaRows,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fontStyle: "bold" }
    });

    // Health table
    const healthBody = Object.entries(byCat).map(([k, v]) => [
      k,
      `${v.done}/${v.total}`,
      `${v.pct}%`
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14,
      head: [["Category", "Completed", "Health"]],
      body: healthBody.length ? healthBody : [["—", "—", "—"]],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fontStyle: "bold" }
    });

    // Ticket summary table
    const ticketRows = tickets.map((t) => {
      const s = loadTicketState(t.id);
      const status = computeTicketComplete(s) ? "Complete" : "In Progress";
      return [t.id, t.category, t.title, status];
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14,
      head: [["Ticket", "Category", "Title", "Status"]],
      body: ticketRows,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 70 },
        2: { cellWidth: 290 },
        3: { cellWidth: 94 }
      }
    });

    // Per-ticket response tables
    for (const t of tickets) {
      const s = loadTicketState(t.id);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${t.id} — ${t.title}`, 44, doc.lastAutoTable.finalY + 26);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const wf = t.workflow || {};
      const gamified = isStageObject(wf.triage) && isStageObject(wf.diagnosis) && isStageObject(wf.fix);

      const mcqVal = (k) => {
        const picked = s.answers?.[k];
        const label =
          Number.isInteger(picked) && wf[k].options && wf[k].options[picked]
            ? wf[k].options[picked]
            : "(no selection)";
        const mark = s.correct?.[k] ? "✅" : "❌";
        return `${mark} ${label}`;
      };

      const responseRows = gamified
        ? [
            ["Triage", mcqVal("triage")],
            ["Diagnosis", mcqVal("diagnosis")],
            ["Fix", mcqVal("fix")],
            ["Change Note", (s.changeNote || "").trim() || "(blank)"]
          ]
        : [
            ["Triage", (s.triageNote || "").trim() || "(blank)"],
            ["Diagnosis", (s.diagnosisNote || "").trim() || "(blank)"],
            ["Fix", (s.fixNote || "").trim() || "(blank)"],
            ["Change Note", (s.changeNote || "").trim() || "(blank)"]
          ];

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 6,
        head: [["Step", "Response"]],
        body: responseRows,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, overflow: "linebreak" },
        headStyles: { fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 414 }
        }
      });
    }

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

    $("#searchInput").addEventListener("input", applyFilters);
    $("#btnRandom").addEventListener("click", () => {
      if (!filteredTickets.length) return;
      const pick = filteredTickets[Math.floor(Math.random() * filteredTickets.length)];
      selectTicket(pick.id);
    });
    $("#btnResetLab").addEventListener("click", resetLab);

    wireMeta();
    wireReport();

    // Delegated handler for gamified MCQ buttons (triage/diagnosis/fix).
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("button[data-answer='true']") : null;
      if (!btn) return;

      const ticketId = btn.getAttribute("data-ticket");
      const stageKey = btn.getAttribute("data-stage");
      const idx = btn.getAttribute("data-idx");
      if (!ticketId || !stageKey) return;

      handleAnswer(ticketId, stageKey, idx);
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
