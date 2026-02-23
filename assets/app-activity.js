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

  /* --- Core Logic Helpers --- */

  function getLabId() {
    const params = new URLSearchParams(location.search);
    return (params.get("lab") || "").trim();
  }

  function lsKey(ticketId) {
    return `${LS_PREFIX}${lab.id}__${ticketId}`;
  }

  function readJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function loadTicketState(ticketId) {
    const defaultState = {
      answers: { triage: null, diagnosis: null, fix: null },
      changeNote: "",
      isResolved: false
    };
    return readJSON(lsKey(ticketId), defaultState);
  }

  /* --- UI Rendering --- */

  function renderTicketList() {
    const container = $("#ticketList");
    container.innerHTML = "";

    filteredTickets.forEach(t => {
      const state = loadTicketState(t.id);
      const isActive = t.id === selectedId;
      
      const item = document.createElement("div");
      item.className = `ticket-item ${isActive ? "active" : ""} ${state.isResolved ? "resolved" : ""}`;
      item.innerHTML = `
        <div class="ticket-id">${t.id}</div>
        <div class="ticket-main">
          <div class="ticket-title">${t.title}</div>
          <div class="ticket-meta">${t.category} • ${state.isResolved ? "✅ Resolved" : "Pending"}</div>
        </div>
      `;
      item.onclick = () => selectTicket(t.id);
      container.appendChild(item);
    });
  }

  function renderTicketDetail(id) {
    const t = tickets.find(x => x.id === id);
    const state = loadTicketState(id);
    const container = $("#ticketDetail");

    if (!t) {
      container.innerHTML = `<div class="empty-detail">Select a ticket to begin.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="detail-card">
        <div class="detail-head">
          <div class="badge">${t.category}</div>
          <h2>${t.id}: ${t.title}</h2>
        </div>
        
        <div class="detail-section">
          <div class="section-label">Incident Summary</div>
          <p class="summary-text">${t.summary}</p>
        </div>

        <div class="workflow-grid">
          ${renderStage("triage", "1. Triage", t.workflow.triage, state)}
          ${renderStage("diagnosis", "2. Diagnosis", t.workflow.diagnosis, state)}
          ${renderStage("fix", "3. Remediation", t.workflow.fix, state)}
        </div>

        <div class="detail-section" style="margin-top:20px;">
          <div class="section-label">Change Note (Required for Closure)</div>
          <textarea class="input change-textarea" 
                    placeholder="Document your actions..."
                    oninput="window.updateChangeNote('${t.id}', this.value)">${state.changeNote || ""}</textarea>
        </div>
      </div>
    `;
  }

  function renderStage(key, label, data, state) {
    if (!data) return "";
    const currentAnswer = state.answers[key];
    
    return `
      <div class="workflow-stage">
        <div class="stage-label">${label}</div>
        <div class="stage-q">${data.q}</div>
        <div class="options-list">
          ${data.options.map((opt, idx) => {
            const isSelected = currentAnswer === idx;
            const isCorrect = idx === data.correct;
            let statusClass = "";
            if (isSelected) {
              statusClass = isCorrect ? "opt-correct" : "opt-wrong";
            }

            return `
              <button class="opt-btn ${statusClass} ${isSelected ? 'selected' : ''}" 
                      onclick="window.handleAnswer('${selectedId}', '${key}', ${idx})">
                ${opt}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /* --- Logic Actions --- */

  window.handleAnswer = (tId, stageKey, answerIdx) => {
    const t = tickets.find(x => x.id === tId);
    const state = loadTicketState(tId);
    
    state.answers[stageKey] = answerIdx;
    
    // Check if all answers are correct
    const triageOk = state.answers.triage === t.workflow.triage.correct;
    const diagOk = state.answers.diagnosis === t.workflow.diagnosis.correct;
    const fixOk = state.answers.fix === t.workflow.fix.correct;
    
    state.isResolved = triageOk && diagOk && fixOk;

    saveTicketState(tId, state);
    renderTicketDetail(tId);
    renderTicketList();
    updateProgressAndHealth();
  };

  window.updateChangeNote = (tId, val) => {
    const state = loadTicketState(tId);
    state.changeNote = val;
    saveTicketState(tId, state);
  };

  function saveTicketState(ticketId, state) {
    writeJSON(lsKey(ticketId), state);
  }

  function updateProgressAndHealth() {
    let resolvedCount = 0;
    tickets.forEach(t => {
      if (loadTicketState(t.id).isResolved) resolvedCount++;
    });

    const pct = tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 0;
    
    $("#labProgress").textContent = `Resolved: ${resolvedCount}/${tickets.length}`;
    if ($("#healthOverall")) $("#healthOverall").textContent = `Accuracy: ${pct}%`;
  }

  function selectTicket(id) {
    selectedId = id;
    renderTicketList();
    renderTicketDetail(id);
  }

  async function init() {
    const labId = getLabId();
    if (!labId) return;

    const res = await fetch(`./data/labs/${labId}.json`);
    lab = await res.json();
    tickets = lab.tickets;
    filteredTickets = tickets;

    document.title = `${lab.title} • Academy`;
    $("#labTitleTop").textContent = lab.title;
    
    updateProgressAndHealth();
    renderTicketList();
    if (tickets.length) selectTicket(tickets[0].id);
  }

  init();

})();
