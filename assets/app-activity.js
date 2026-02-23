(() => {
  "use strict";
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const LS_PREFIX = "sa_academy_v1_ticket_";
  const LS_META_PREFIX = "sa_academy_v1_meta_";

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
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function lsKey(ticketId){ return `${LS_PREFIX}${lab.id}__${ticketId}`; }
  function metaKey(){ return `${LS_META_PREFIX}${lab.id}`; }

  function readJSON(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function writeJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); } catch {} }

  function defaultTicketState(){
    return { doneTriage:false, doneDiagnosis:false, doneFix:false, doneNote:false, changeNote:"", lastSavedAt:null };
  }
  function loadTicketState(ticketId){ return readJSON(lsKey(ticketId), null) || defaultTicketState(); }
  function saveTicketState(ticketId, state){ writeJSON(lsKey(ticketId), state); }
  function clearTicketState(ticketId){ try{ localStorage.removeItem(lsKey(ticketId)); } catch {} }

  async function loadLabData(labId){
    const res = await fetch(`./data/labs/${encodeURIComponent(labId)}.json`, { cache:"no-store" });
    if(!res.ok) throw new Error("Lab data not found");
    return res.json();
  }

  function setTodayIfEmpty(){
    const el = $("#activityDate");
    if(!el || el.value) return;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    el.value = `${yyyy}-${mm}-${dd}`;
  }

  function loadMeta(){
    const m = readJSON(metaKey(), null) || {};
    const set = (id, v) => { const el = document.getElementById(id); if(el && typeof v === "string") el.value = v; };
    set("analystName", m.analystName || "");
    set("courseSection", m.courseSection || "");
    set("courseTitle", m.courseTitle || "");
    set("activityDate", m.activityDate || "");
    set("globalNotes", m.globalNotes || "");
    setTodayIfEmpty();
  }

  function saveMeta(){
    const get = (id) => (document.getElementById(id)?.value || "").trim();
    writeJSON(metaKey(), {
      analystName: get("analystName"),
      courseSection: get("courseSection"),
      courseTitle: get("courseTitle"),
      activityDate: get("activityDate"),
      globalNotes: get("globalNotes")
    });
  }

  function wireMeta(){
    ["analystName","courseSection","courseTitle","activityDate","globalNotes"].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("input", saveMeta);
    });
    loadMeta();
  }

  function buildTabs(categories){
    const tabs = $("#tabs");
    tabs.innerHTML = "";
    const all = ["ALL", ...categories];
    for(const c of all){
      const btn = document.createElement("button");
      btn.className = "tab" + (c === activeCategory ? " active" : "");
      btn.textContent = c;
      btn.addEventListener("click", () => {
        activeCategory = c;
        $$(".tab").forEach(b => b.classList.toggle("active", b.textContent === c));
        applyFilters();
      });
      tabs.appendChild(btn);
    }
  }

  function ticketMatches(t, q){
    if(!q) return true;
    const hay = [
      t.id, t.category, t.title, t.summary,
      (t.tags||[]).join(" "),
      t.workflow?.triage, t.workflow?.diagnosis, t.workflow?.fix,
      ...(t.validations||[])
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function applyFilters(){
    const q = ($("#searchInput").value || "").trim();
    filteredTickets = tickets.filter(t => {
      const catOk = activeCategory === "ALL" ? true : t.category === activeCategory;
      return catOk && ticketMatches(t, q);
    });
    renderTicketList();

    if(selectedId && !filteredTickets.some(t => t.id === selectedId)){
      selectedId = null;
      $("#ticketDetail").innerHTML = `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Your previous selection is hidden by filters.</div></div>`;
    }
    updateProgress();
  }

  function renderTicketList(){
    const list = $("#ticketList");
    list.innerHTML = "";
    if(!filteredTickets.length){
      list.innerHTML = `<div class="card"><div class="card-title">No tickets found</div><div class="card-desc">Try a different tab or search.</div></div>`;
      return;
    }

    for(const t of filteredTickets){
      const card = document.createElement("div");
      card.className = "card" + (t.id === selectedId ? " selected" : "");
      const tags = (t.tags||[]).slice(0,4).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join("");
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div class="card-title">${escapeHtml(t.title)}</div>
            <div class="card-desc">${escapeHtml(truncate(t.summary, 120))}</div>
            <div class="tags">${tags}</div>
          </div>
          <div style="text-align:right;">
            <div style="color:rgba(238,245,255,.78);font-weight:850;font-size:12px;">${escapeHtml(t.id)}</div>
            <div class="badge" style="margin-top:8px;">${escapeHtml(t.category)}</div>
          </div>
        </div>
      `;
      card.addEventListener("click", () => selectTicket(t.id));
      list.appendChild(card);
    }
  }

  function stepTemplate(num, title, hint, key, text, checked){
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
          <label class="toggle"><input type="checkbox" data-step="${key}" ${checked ? "checked":""}/> Done</label>
        </div>
        <div class="step-body">${escapeHtml(text)}</div>
      </div>
    `;
  }

  function noteTemplate(s){
    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">4</div>
            <div>
              <div class="step-title">Change Note (Text Entry)</div>
              <div class="step-hint">Write what you changed, why, impact, and how you validated.</div>
            </div>
          </div>
          <label class="toggle"><input type="checkbox" data-step="doneNote" ${s.doneNote ? "checked":""}/> Done</label>
        </div>
        <div class="step-body">
          <textarea id="changeNote" rows="7" placeholder="Document your change...">${escapeHtml(s.changeNote||"")}</textarea>
          <div class="note-actions">
            <button id="btnSave" class="btn" type="button">Save Note</button>
            <button id="btnCopy" class="btn" type="button">Copy Note</button>
            <span class="mini-muted" id="savedHint">${s.lastSavedAt ? "Saved locally." : "Not saved yet."}</span>
          </div>
        </div>
      </div>
    `;
  }

  function selectTicket(ticketId){
    const t = tickets.find(x => x.id === ticketId);
    if(!t) return;
    selectedId = ticketId;
    renderTicketList();

    const s = loadTicketState(ticketId);

    const envRows = Object.entries(t.env||{}).map(([k,v]) =>
      `<div class="card" style="margin-top:10px;">
         <div class="card-title">${escapeHtml(k)}</div>
         <div class="card-desc">${escapeHtml(v)}</div>
       </div>`
    ).join("");

    $("#ticketDetail").innerHTML = `
      <div class="card">
        <div class="card-title">${escapeHtml(t.id)} • ${escapeHtml(t.category)}</div>
        <div class="card-desc" style="margin-top:6px;"><strong>${escapeHtml(t.title)}</strong></div>
        <div class="card-desc" style="margin-top:6px;">${escapeHtml(t.summary)}</div>
        ${envRows}

        ${stepTemplate(1,"Triage (Symptom)","What the user/system reports.","doneTriage",t.workflow.triage,s.doneTriage)}
        ${stepTemplate(2,"Diagnosis (Root Cause)","Most likely cause, supported by evidence.","doneDiagnosis",t.workflow.diagnosis,s.doneDiagnosis)}
        ${stepTemplate(3,"Fix (GUI Action)","What you would click/configure using Windows tools.","doneFix",t.workflow.fix,s.doneFix)}
        ${noteTemplate(s)}

        <div class="card" style="margin-top:12px;">
          <div class="card-title">Suggested Validation Checks</div>
          <div class="card-desc" style="margin-top:8px;">
            <ul style="margin:0;padding-left:18px;">
              ${(t.validations||[]).map(v => `<li>${escapeHtml(v)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    `;

    $$("#ticketDetail input[type='checkbox'][data-step]").forEach(cb => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-step");
        const next = loadTicketState(ticketId);
        next[key] = cb.checked;
        saveTicketState(ticketId, next);
        updateProgress();
      });
    });

    const note = $("#changeNote");
    $("#btnSave").addEventListener("click", () => {
      const next = loadTicketState(ticketId);
      next.changeNote = note.value;
      next.lastSavedAt = Date.now();
      saveTicketState(ticketId, next);
      $("#savedHint").textContent = "Saved locally.";
      updateProgress();
    });

    $("#btnCopy").addEventListener("click", async () => {
      const txt = note.value || "";
      if(!txt.trim()) return;
      try{ await navigator.clipboard.writeText(txt); }
      catch { note.select(); document.execCommand("copy"); }
    });

    updateProgress();
  }

  function computeProgress(){
    let done = 0;
    for(const t of tickets){
      const s = loadTicketState(t.id);
      if(s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote) done++;
    }
    return { done, total: tickets.length };
  }

  function updateProgress(){
    const p = computeProgress();
    $("#labProgress").textContent = `Progress: ${p.done}/${p.total}`;
  }

  function resetLab(){
    for(const t of tickets) clearTicketState(t.id);
    selectedId = null;
    applyFilters();
    $("#ticketDetail").innerHTML = `<div class="card"><div class="card-title">Select a ticket</div><div class="card-desc">Lab reset.</div></div>`;
    updateProgress();
  }

  function truncate(s, n){
    const str = String(s || "");
    return str.length <= n ? str : str.slice(0, n-1) + "…";
  }

  /* ---------------- Report Generator ---------------- */

  function openReportModal(){
    const m = $("#reportModal");
    if(m) m.setAttribute("aria-hidden","false");
  }
  function closeReportModal(){
    const m = $("#reportModal");
    if(m) m.setAttribute("aria-hidden","true");
  }

  function getMeta(){
    const val = (id) => (document.getElementById(id)?.value || "").trim();
    return {
      analystName: val("analystName") || "Analyst",
      courseSection: val("courseSection"),
      courseTitle: val("courseTitle") || lab.title,
      activityDate: val("activityDate"),
      globalNotes: val("globalNotes")
    };
  }

  function buildTextReport(){
    const meta = getMeta();
    const lines = [];
    lines.push("Server Admin Academy");
    lines.push(`${lab.title} — Report`);
    lines.push("");
    lines.push(`Analyst: ${meta.analystName}`);
    if(meta.courseSection) lines.push(`Section: ${meta.courseSection}`);
    if(meta.courseTitle) lines.push(`Course: ${meta.courseTitle}`);
    if(meta.activityDate) lines.push(`Date: ${meta.activityDate}`);
    lines.push("");
    lines.push("Analyst Notes (Global):");
    lines.push(meta.globalNotes ? meta.globalNotes : "(none)");
    lines.push("");
    lines.push("----- Ticket Notes -----");

    for(const t of tickets){
      const s = loadTicketState(t.id);
      lines.push("");
      lines.push(`${t.id} — ${t.title}`);
      lines.push(`Category: ${t.category}`);
      lines.push(`Status: ${(s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote) ? "Complete" : "In Progress"}`);
      lines.push(`Change Note: ${s.changeNote?.trim() ? s.changeNote.trim() : "(blank)"}`);
    }
    return lines.join("\n");
  }

  function downloadText(){
    const meta = getMeta();
    const txt = buildTextReport();
    const blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lab.id}-${meta.analystName.replace(/\s+/g,"-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadPDF(){
    const meta = getMeta();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:"pt", format:"letter" });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 44;

    let y = 56;

    const ensure = (need) => {
      if(y + need > H - 52){
        doc.addPage();
        y = 56;
      }
    };

    const wrap = (text, size=10.5, width=W - margin*2, lineH=15) => {
      doc.setFontSize(size);
      const split = doc.splitTextToSize(String(text || ""), width);
      ensure(split.length * lineH);
      doc.text(split, margin, y);
      y += split.length * lineH;
    };

    // Header
    doc.setFont("helvetica","bold");
    doc.setFontSize(16);
    doc.text("Server Admin Academy", margin, y); y += 18;

    doc.setFontSize(13);
    doc.text(`${lab.title} — Report`, margin, y); y += 18;

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);

    const metaLines = [
      `Analyst: ${meta.analystName}`,
      meta.courseSection ? `Section: ${meta.courseSection}` : null,
      meta.courseTitle ? `Course: ${meta.courseTitle}` : null,
      meta.activityDate ? `Date: ${meta.activityDate}` : null
    ].filter(Boolean);

    metaLines.forEach(line => { ensure(16); doc.text(line, margin, y); y += 16; });

    y += 10;
    doc.setDrawColor(167,139,250);
    doc.setLineWidth(2);
    doc.line(margin, y, W - margin, y);
    y += 18;

    // Global notes
    doc.setFont("helvetica","bold");
    doc.setFontSize(12);
    doc.text("Analyst Notes (Global)", margin, y); y += 14;

    doc.setFont("helvetica","normal");
    wrap(meta.globalNotes ? meta.globalNotes : "(none)", 10.5, W - margin*2, 15);
    y += 10;

    doc.setDrawColor(220);
    doc.setLineWidth(1);
    doc.line(margin, y, W - margin, y);
    y += 16;

    // Tickets
    doc.setFont("helvetica","bold");
    doc.setFontSize(12);
    doc.text("Tickets", margin, y); y += 16;

    tickets.forEach((t, idx) => {
      ensure(90);

      const s = loadTicketState(t.id);
      const complete = (s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote);

      doc.setFont("helvetica","bold");
      doc.setFontSize(11);
      doc.text(`${idx+1}. ${t.id} — ${t.title}`, margin, y); y += 14;

      doc.setFont("helvetica","normal");
      doc.setFontSize(10);
      doc.text(`Category: ${t.category}`, margin, y); y += 14;
      doc.text(`Status: ${complete ? "Complete" : "In Progress"}`, margin, y); y += 14;

      doc.setFont("helvetica","bold");
      doc.text("Change Note:", margin, y); y += 12;

      doc.setFont("helvetica","normal");
      wrap(s.changeNote?.trim() ? s.changeNote.trim() : "(blank)", 10, W - margin*2, 14);
      y += 10;

      doc.setDrawColor(235);
      doc.setLineWidth(1);
      doc.line(margin, y, W - margin, y);
      y += 14;
    });

    doc.save(`${lab.id}-${meta.analystName.replace(/\s+/g,"-").toLowerCase()}.pdf`);
  }

  function wireReport(){
    const openBtn = $("#btnReport");
    if(openBtn) openBtn.addEventListener("click", openReportModal);

    const modal = $("#reportModal");
    if(modal){
      modal.addEventListener("click", (e) => {
        const t = e.target;
        if(t && t.dataset && t.dataset.close === "true") closeReportModal();
      });
    }

    const btnPDF = $("#btnReportPDF");
    const btnTXT = $("#btnReportText");
    if(btnPDF) btnPDF.addEventListener("click", () => { closeReportModal(); downloadPDF(); });
    if(btnTXT) btnTXT.addEventListener("click", () => { closeReportModal(); downloadText(); });
  }

  async function init(){
    const labId = getLabId();
    if(!labId){
      $("#labTitle").textContent = "Missing lab id";
      $("#labDesc").textContent = "Open from the home page or add ?lab=dns-dhcp to the URL.";
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
    if(lab.rolePill) $("#rolePill").textContent = lab.rolePill;

    buildTabs(lab.categories || []);
    $("#searchInput").addEventListener("input", applyFilters);
    $("#btnRandom").addEventListener("click", () => {
      if(!filteredTickets.length) return;
      const pick = filteredTickets[Math.floor(Math.random()*filteredTickets.length)];
      selectTicket(pick.id);
    });
    $("#btnResetLab").addEventListener("click", resetLab);

    wireMeta();
    wireReport();

    applyFilters();
    updateProgress();
    if(filteredTickets[0]) selectTicket(filteredTickets[0].id);
  }

  init().catch(err => {
    console.error(err);
    $("#labTitle").textContent = "Failed to load lab";
    $("#labDesc").textContent = "Confirm ./data/labs/<lab>.json exists and matches the ?lab= value.";
  });
})();
