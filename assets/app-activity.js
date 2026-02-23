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
    return {
      triageNote: "",
      diagnosisNote: "",
      fixNote: "",
      changeNote: "",
      doneTriage: false,
      doneDiagnosis: false,
      doneFix: false,
      doneNote: false,
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
    set("globalNotes", m.globalNotes || "");
    setTodayIfEmpty();
  }

  function saveMeta() {
    const get = (id) => (document.getElementById(id)?.value || "").trim();
    writeJSON(metaKey(), {
      analystName: get("analystName"),
      courseSection: get("courseSection"),
      courseTitle: get("courseTitle"),
      activityDate: get("activityDate"),
      globalNotes: get("globalNotes")
    });
  }

  function wireMeta() {
    ["analystName", "courseSection", "courseTitle", "activityDate", "globalNotes"].forEach((id) => {
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
      t.id,
      t.category,
      t.title,
      t.summary,
      (t.tags || []).join(" "),
      JSON.stringify(t.env || {}),
      (t.validations || []).join(" ")
    ]
      .join(" ")
      .toLowerCase();
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
    updateProgress();
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

  function selectTicket(ticketId) {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;
    selectedId = ticketId;
    renderTicketList();

    const s = loadTicketState(ticketId);

    // Prompts (NOT answers)
    const p = t.workflow || {};
    const triageHint = p.triage || "Describe symptoms, scope, and impact. Include exact error text and who is affected.";
    const diagHint = p.diagnosis || "State a likely root cause and what evidence you would collect to confirm it.";
    const fixHint = p.fix || "Document the GUI steps you would take to remediate and what you will verify afterward.";
    const noteHint = p.changeNote || "Record what you changed, why, impact, and validation performed.";

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

        ${stepEditor({
          num: 1,
          title: "Triage (Symptom)",
          hint: triageHint,
          fieldId: "triageNote",
          placeholder: "Write the symptom in your own words. Who is impacted? What is failing? What is the urgency? Include exact error messages.",
          checkedKey: "doneTriage",
          checked: s.doneTriage
        })}

        ${stepEditor({
          num: 2,
          title: "Diagnosis (Root Cause)",
          hint: diagHint,
          fieldId: "diagnosisNote",
          placeholder: "State the most likely root cause. List evidence you would collect (commands, logs, configuration checks).",
          checkedKey: "doneDiagnosis",
          checked: s.doneDiagnosis
        })}

        ${stepEditor({
          num: 3,
          title: "Fix (GUI Action)",
          hint: fixHint,
          fieldId: "fixNote",
          placeholder: "Document the remediation steps using GUI tools. Include verification steps after the fix.",
          checkedKey: "doneFix",
          checked: s.doneFix
        })}

        ${stepEditor({
          num: 4,
          title: "Change Note (Text Entry)",
          hint: noteHint,
          fieldId: "changeNote",
          placeholder: "Change record: what you changed, why, risk/impact, rollback notes (if any), and how you validated.",
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

    // Fill existing notes into textareas
    $("#triageNote").value = s.triageNote || "";
    $("#diagnosisNote").value = s.diagnosisNote || "";
    $("#fixNote").value = s.fixNote || "";
    $("#changeNote").value = s.changeNote || "";

    // Checkbox state handlers
    $$("#ticketDetail input[type='checkbox'][data-step]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-step");
        const next = loadTicketState(ticketId);
        next[key] = cb.checked;
        saveTicketState(ticketId, next);
        updateProgress();
      });
    });

    // Save/Copy handlers for each editor
    $$("#ticketDetail [data-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fieldId = btn.getAttribute("data-save");
        const next = loadTicketState(ticketId);
        next[fieldId] = document.getElementById(fieldId).value;
        saveTicketState(ticketId, next);
        document.getElementById(fieldId + "Saved").textContent = "Saved locally.";
        updateProgress();
      });
    });

    $$("#ticketDetail [data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fieldId = btn.getAttribute("data-copy");
        const txt = document.getElementById(fieldId).value || "";
        if (!txt.trim()) return;
        try {
          await navigator.clipboard.writeText(txt);
        } catch {
          const el = document.getElementById(fieldId);
          el.select();
          document.execCommand("copy");
        }
      });
    });

    updateProgress();
  }

  function computeProgress() {
    let done = 0;
    for (const t of tickets) {
      const s = loadTicketState(t.id);
      if (s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote) done++;
    }
    return { done, total: tickets.length };
  }

  function updateProgress() {
    const p = computeProgress();
    $("#labProgress").textContent = `Progress: ${p.done}/${p.total}`;
  }

  function resetLab() {
    for (const t of tickets) clearTicketState(t.id);
    selectedId = null;
    applyFilters();
    $("#ticketDetail").innerHTML =
      `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Lab reset.</div></div>`;
    updateProgress();
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
      activityDate: val("activityDate"),
      globalNotes: val("globalNotes")
    };
  }

  function buildTextReport() {
    const meta = getMeta();
    const lines = [];
    lines.push("Server Admin Academy");
    lines.push(`${lab.title} — Report`);
    lines.push("");
    lines.push(`Analyst: ${meta.analystName}`);
    if (meta.courseSection) lines.push(`Section: ${meta.courseSection}`);
    if (meta.courseTitle) lines.push(`Course: ${meta.courseTitle}`);
    if (meta.activityDate) lines.push(`Date: ${meta.activityDate}`);
    lines.push("");
    lines.push("Analyst Notes (Global):");
    lines.push(meta.globalNotes ? meta.globalNotes : "(none)");
    lines.push("");
    lines.push("----- Ticket Work -----");

    for (const t of tickets) {
      const s = loadTicketState(t.id);
      lines.push("");
      lines.push(`${t.id} — ${t.title}`);
      lines.push(`Category: ${t.category}`);
      lines.push(`Status: ${(s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote) ? "Complete" : "In Progress"}`);
      lines.push("");
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

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 44;
    let y = 56;

    const ensure = (need) => {
      if (y + need > H - 52) {
        doc.addPage();
        y = 56;
      }
    };

    const wrap = (text, size = 10.5, width = W - margin * 2, lineH = 15) => {
      doc.setFontSize(size);
      const split = doc.splitTextToSize(String(text || ""), width);
      ensure(split.length * lineH);
      doc.text(split, margin, y);
      y += split.length * lineH;
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Server Admin Academy", margin, y);
    y += 18;

    doc.setFontSize(13);
    doc.text(`${lab.title} — Report`, margin, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const metaLines = [
      `Analyst: ${meta.analystName}`,
      meta.courseSection ? `Section: ${meta.courseSection}` : null,
      meta.courseTitle ? `Course: ${meta.courseTitle}` : null,
      meta.activityDate ? `Date: ${meta.activityDate}` : null
    ].filter(Boolean);

    metaLines.forEach((line) => {
      ensure(16);
      doc.text(line, margin, y);
      y += 16;
    });

    y += 10;
    doc.setDrawColor(167, 139, 250);
    doc.setLineWidth(2);
    doc.line(margin, y, W - margin, y);
    y += 18;

    // Global notes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Analyst Notes (Global)", margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    wrap(meta.globalNotes ? meta.globalNotes : "(none)", 10.5, W - margin * 2, 15);
    y += 10;

    doc.setDrawColor(220);
    doc.setLineWidth(1);
    doc.line(margin, y, W - margin, y);
    y += 16;

    // Tickets
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Tickets", margin, y);
    y += 16;

    tickets.forEach((t, idx) => {
      ensure(140);

      const s = loadTicketState(t.id);
      const complete = s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${t.id} — ${t.title}`, margin, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Category: ${t.category}`, margin, y);
      y += 14;
      doc.text(`Status: ${complete ? "Complete" : "In Progress"}`, margin, y);
      y += 14;

      doc.setFont("helvetica", "bold");
      doc.text("Triage:", margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      wrap(s.triageNote?.trim() ? s.triageNote.trim() : "(blank)", 10, W - margin * 2, 14);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Diagnosis:", margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      wrap(s.diagnosisNote?.trim() ? s.diagnosisNote.trim() : "(blank)", 10, W - margin * 2, 14);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Fix:", margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      wrap(s.fixNote?.trim() ? s.fixNote.trim() : "(blank)", 10, W - margin * 2, 14);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Change Note:", margin, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      wrap(s.changeNote?.trim() ? s.changeNote.trim() : "(blank)", 10, W - margin * 2, 14);
      y += 10;

      doc.setDrawColor(235);
      doc.setLineWidth(1);
      doc.line(margin, y, W - margin, y);
      y += 14;
    });

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

    applyFilters();
    updateProgress();

    if (filteredTickets[0]) selectTicket(filteredTickets[0].id);
  }

  init().catch((err) => {
    console.error(err);
    $("#labTitle").textContent = "Failed to load lab";
    $("#labDesc").textContent = "Confirm ./data/labs/<lab>.json exists and matches the ?lab= value.";
  });
})();
