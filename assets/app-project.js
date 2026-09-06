(function () {
  const state = {
    project: null,
    sections: [],
    activeIndex: 0,
    reviewed: []
  };

  const els = {
    projectTitle: document.getElementById("projectTitle"),
    projectSummary: document.getElementById("projectSummary"),
    projectDifficulty: document.getElementById("projectDifficulty"),
    projectDomain: document.getElementById("projectDomain"),
    reviewedCount: document.getElementById("reviewedCount"),
    totalSections: document.getElementById("totalSections"),
    sidebarNav: document.getElementById("sidebarNav"),
    sectionKicker: document.getElementById("sectionKicker"),
    sectionTitle: document.getElementById("sectionTitle"),
    sectionIntro: document.getElementById("sectionIntro"),
    sectionBlocks: document.getElementById("sectionBlocks"),
    prevSectionBtn: document.getElementById("prevSectionBtn"),
    nextSectionBtn: document.getElementById("nextSectionBtn"),
    markReviewedBtn: document.getElementById("markReviewedBtn"),
    resetProgressBtn: document.getElementById("resetProgressBtn")
  };

  function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "techcon-gh-infrastructure";
  }

  function storageKey() {
    return `saa-project-progress:${getProjectId()}`;
  }

  function titleCase(value) {
    return String(value || "")
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  async function loadProjects() {
    const res = await fetch("./data/projects.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load projects.json");
    }
    return res.json();
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.reviewed) ? parsed.reviewed : [];
    } catch {
      return [];
    }
  }

  function saveProgress() {
    localStorage.setItem(
      storageKey(),
      JSON.stringify({ reviewed: state.reviewed })
    );
  }

  function isReviewed(index) {
    return state.reviewed.includes(index);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createElement(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof html === "string") el.innerHTML = html;
    return el;
  }

  function renderMeta() {
    const project = state.project;

    els.projectTitle.textContent = project.title || "Project";
    els.projectSummary.textContent = project.summary || project.description || "";
    els.projectDifficulty.textContent = titleCase(project.difficulty || "advanced");
    els.projectDomain.textContent = titleCase(project.domain || "systems-engineering");

    if (els.totalSections) {
      els.totalSections.textContent = String(state.sections.length);
    }

    if (els.reviewedCount) {
      const reviewedCard = els.reviewedCount.closest(".statCard");
      if (reviewedCard) {
        reviewedCard.style.display = "none";
      }
    }
  }

  function buildParagraphs(paragraphs) {
    const frag = document.createDocumentFragment();
    (paragraphs || []).forEach((text) => {
      const p = createElement("p", "blockText");
      p.innerHTML = text;
      frag.appendChild(p);
    });
    return frag;
  }

  function buildList(items, ordered = false) {
    const list = createElement(ordered ? "ol" : "ul", "blockList");
    (items || []).forEach((item) => {
      const li = createElement("li");
      li.innerHTML = item;
      list.appendChild(li);
    });
    return list;
  }

  function buildCodeBlock(content) {
    const pre = createElement("pre", "treeBlock");
    pre.textContent = content || "";
    return pre;
  }

  function buildTable(block) {
    const table = createElement("table", "kvTable");

    if (Array.isArray(block.headers) && Array.isArray(block.rows)) {
      const thead = createElement("thead");
      const headRow = createElement("tr");

      block.headers.forEach((header) => {
        const th = createElement("th");
        th.textContent = header;
        headRow.appendChild(th);
      });

      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = createElement("tbody");

      block.rows.forEach((row) => {
        const tr = createElement("tr");
        row.forEach((cell, index) => {
          const cellTag = index === 0 ? "th" : "td";
          const td = createElement(cellTag);
          td.innerHTML = Array.isArray(cell) ? cell.join("<br>") : cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      return table;
    }

    if (Array.isArray(block.rows)) {
      const tbody = createElement("tbody");

      block.rows.forEach((row) => {
        const tr = createElement("tr");
        const th = createElement("th");
        th.textContent = row.label || "";
        const td = createElement("td");
        td.innerHTML = Array.isArray(row.value) ? row.value.join("<br>") : (row.value || "");
        tr.appendChild(th);
        tr.appendChild(td);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      return table;
    }

    return table;
  }

  function buildBlock(block) {
    const wrap = createElement("section", "requirementBlock");

    if (block.title) {
      const title = createElement("h3", "blockTitle");
      title.textContent = block.title;
      wrap.appendChild(title);
    }

    if (block.lead) {
      const lead = createElement("p", "blockLead");
      lead.textContent = block.lead;
      wrap.appendChild(lead);
    }

    switch (block.type) {
      case "text": {
        if (Array.isArray(block.paragraphs)) {
          wrap.appendChild(buildParagraphs(block.paragraphs));
        } else {
          const p = createElement("p", "blockText");
          p.innerHTML = block.content || "";
          wrap.appendChild(p);
        }
        break;
      }

      case "list": {
        wrap.appendChild(buildList(block.items, false));
        break;
      }

      case "ordered-list": {
        wrap.appendChild(buildList(block.items, true));
        break;
      }

      case "table": {
        wrap.appendChild(buildTable(block));
        break;
      }

      case "code":
      case "tree": {
        wrap.appendChild(buildCodeBlock(block.code || block.content || ""));
        break;
      }

      case "combo": {
        if (block.rows && block.rows.length) {
          wrap.appendChild(buildTable(block));
        }
        if (block.items && block.items.length) {
          wrap.appendChild(buildList(block.items, false));
        }
        break;
      }

      case "accordion": {
        const accordion = createElement("div", "accordion");

        (block.items || []).forEach((item, index) => {
          const accItem = createElement("section", "accordionItem");
          const header = createElement("button", "accordionHeader");
          header.type = "button";
          header.setAttribute("aria-expanded", "false");
          header.innerHTML = `
            <span>${escapeHtml(item.title || "Details")}</span>
            <span class="accordionIcon">+</span>
          `;

          const body = createElement("div", "accordionBody");

          if (item.summary) {
            const summary = createElement("p", "accordionSummary");
            summary.textContent = item.summary;
            body.appendChild(summary);
          }

          (item.blocks || []).forEach((nestedBlock) => {
            body.appendChild(buildBlock(nestedBlock));
          });

          header.addEventListener("click", () => {
            const allItems = accordion.querySelectorAll(".accordionItem");

            const isOpen = accItem.classList.contains("open");

            allItems.forEach((otherItem) => {
              otherItem.classList.remove("open");

              const otherHeader = otherItem.querySelector(".accordionHeader");
              const otherBody = otherItem.querySelector(".accordionBody");
              const otherIcon = otherItem.querySelector(".accordionIcon");

              if (otherHeader) otherHeader.setAttribute("aria-expanded", "false");
              if (otherBody) otherBody.classList.remove("open");
              if (otherIcon) otherIcon.textContent = "+";
            });

            if (!isOpen) {
              accItem.classList.add("open");
              body.classList.add("open");
              header.setAttribute("aria-expanded", "true");

              const icon = header.querySelector(".accordionIcon");
              if (icon) icon.textContent = "–";
            }
          });

          accItem.appendChild(header);
          accItem.appendChild(body);
          accordion.appendChild(accItem);
        });

        wrap.appendChild(accordion);
        break;
      }

      default: {
        const fallback = createElement("p", "blockText");
        fallback.textContent = "Unsupported content block.";
        wrap.appendChild(fallback);
      }
    }

    return wrap;
  }

  function renderSidebar() {
    els.sidebarNav.innerHTML = "";

    state.sections.forEach((section, index) => {
      const btn = createElement("button", "sidebarItem");
      btn.type = "button";

      if (index === state.activeIndex) btn.classList.add("isActive");
      if (isReviewed(index)) btn.classList.add("isReviewed");

      btn.innerHTML = `
        <span class="sidebarItemMain">
          <span class="sidebarIndex">${index + 1}</span>
          <span class="sidebarLabel">${section.title}</span>
        </span>
      `;

      btn.addEventListener("click", () => {
        state.activeIndex = index;
        render();
      });

      els.sidebarNav.appendChild(btn);
    });
  }

  function renderSection() {
    const section = state.sections[state.activeIndex];
    if (!section) return;

    els.sectionKicker.textContent = `Section ${state.activeIndex + 1}`;
    els.sectionTitle.textContent = section.title;
    els.sectionIntro.textContent = section.summary || "";
    els.sectionBlocks.innerHTML = "";

    (section.blocks || []).forEach((block) => {
      els.sectionBlocks.appendChild(buildBlock(block));
    });

    els.prevSectionBtn.disabled = state.activeIndex === 0;
    els.nextSectionBtn.disabled = state.activeIndex === state.sections.length - 1;

    if (isReviewed(state.activeIndex)) {
      els.markReviewedBtn.textContent = "Reviewed";
      els.markReviewedBtn.disabled = true;
    } else {
      els.markReviewedBtn.textContent = "Mark as Reviewed";
      els.markReviewedBtn.disabled = false;
    }
  }

  function render() {
    renderMeta();
    renderSidebar();
    renderSection();
  }

  function bindEvents() {
    els.prevSectionBtn.addEventListener("click", () => {
      if (state.activeIndex > 0) {
        state.activeIndex -= 1;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    els.nextSectionBtn.addEventListener("click", () => {
      if (state.activeIndex < state.sections.length - 1) {
        state.activeIndex += 1;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    els.markReviewedBtn.addEventListener("click", () => {
      if (!isReviewed(state.activeIndex)) {
        state.reviewed.push(state.activeIndex);
        state.reviewed.sort((a, b) => a - b);
        saveProgress();
        render();
      }
    });

    els.resetProgressBtn.addEventListener("click", () => {
      state.reviewed = [];
      saveProgress();
      render();
    });
  }

  async function init() {
    try {
      const data = await loadProjects();
      const projectId = getProjectId();

      state.project = (data.projects || []).find((project) => project.id === projectId);

      if (!state.project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      state.sections = Array.isArray(state.project.sections) ? state.project.sections : [];
      state.reviewed = loadProgress();

      bindEvents();
      render();
    } catch (error) {
      if (els.projectTitle) els.projectTitle.textContent = "Unable to load project";
      if (els.projectSummary) els.projectSummary.textContent = error.message;
      if (els.sectionTitle) els.sectionTitle.textContent = "Project Load Error";
      if (els.sectionIntro) els.sectionIntro.textContent = "Please verify the project data file and script.";
      if (els.sectionBlocks) {
        els.sectionBlocks.innerHTML = `
          <section class="requirementBlock">
            <p class="blockText">${escapeHtml(error.message)}</p>
          </section>
        `;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
