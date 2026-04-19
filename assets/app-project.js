(function () {
  const state = {
    project: null,
    sections: [],
    activeIndex: 0,
    reviewed: []
  };

  const els = {
    projectTitle: document.getElementById('projectTitle'),
    projectSummary: document.getElementById('projectSummary'),
    projectDifficulty: document.getElementById('projectDifficulty'),
    projectDomain: document.getElementById('projectDomain'),
    reviewedCount: document.getElementById('reviewedCount'),
    totalSections: document.getElementById('totalSections'),
    sidebarNav: document.getElementById('sidebarNav'),
    sectionKicker: document.getElementById('sectionKicker'),
    sectionTitle: document.getElementById('sectionTitle'),
    sectionIntro: document.getElementById('sectionIntro'),
    sectionBlocks: document.getElementById('sectionBlocks'),
    prevSectionBtn: document.getElementById('prevSectionBtn'),
    nextSectionBtn: document.getElementById('nextSectionBtn'),
    markReviewedBtn: document.getElementById('markReviewedBtn'),
    resetProgressBtn: document.getElementById('resetProgressBtn')
  };

  function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'techcon-gh-infrastructure';
  }

  function storageKey() {
    return `saa-project-progress:${getProjectId()}`;
  }

  function titleCase(value) {
    return String(value || '')
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  async function loadProjects() {
    const res = await fetch('./data/projects.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load projects.json');
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
    localStorage.setItem(storageKey(), JSON.stringify({ reviewed: state.reviewed }));
  }

  function isReviewed(index) {
    return state.reviewed.includes(index);
  }

  function renderMeta() {
    const project = state.project;
    els.projectTitle.textContent = project.title;
    els.projectSummary.textContent = project.description;
    els.projectDifficulty.textContent = titleCase(project.difficulty || 'standard');
    els.projectDomain.textContent = titleCase(project.domain || 'systems-engineering');
    els.totalSections.textContent = String(state.sections.length);
    els.reviewedCount.textContent = String(state.reviewed.length);
  }

  function createElement(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof html === 'string') el.innerHTML = html;
    return el;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function buildTable(rows) {
    const table = createElement('table', 'kvTable');
    const tbody = createElement('tbody');
    (rows || []).forEach((row) => {
      const tr = createElement('tr');
      const th = createElement('th');
      th.textContent = row.label;
      const td = createElement('td');
      td.innerHTML = Array.isArray(row.value) ? row.value.join('<br>') : row.value;
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function buildList(items, ordered = false) {
    const list = createElement(ordered ? 'ol' : 'ul', 'blockList');
    (items || []).forEach((item) => {
      const li = createElement('li');
      li.innerHTML = item;
      list.appendChild(li);
    });
    return list;
  }

  function buildTree(content) {
    const pre = createElement('pre', 'treeBlock');
    pre.textContent = content || '';
    return pre;
  }

  function buildBlock(block) {
    const wrap = createElement('section', 'requirementBlock');

    if (block.title) {
      const title = createElement('h3', 'blockTitle');
      title.textContent = block.title;
      wrap.appendChild(title);
    }

    if (block.lead) {
      const lead = createElement('p', 'blockLead');
      lead.textContent = block.lead;
      wrap.appendChild(lead);
    }

    switch (block.type) {
      case 'text': {
        const p = createElement('p', 'blockText');
        p.innerHTML = block.content || '';
        wrap.appendChild(p);
        break;
      }
      case 'list': {
        wrap.appendChild(buildList(block.items, false));
        break;
      }
      case 'ordered-list': {
        wrap.appendChild(buildList(block.items, true));
        break;
      }
      case 'table': {
        wrap.appendChild(buildTable(block.rows));
        break;
      }
      case 'tree': {
        wrap.appendChild(buildTree(block.content));
        break;
      }
      case 'combo': {
        if (block.rows && block.rows.length) {
          wrap.appendChild(buildTable(block.rows));
        }
        if (block.items && block.items.length) {
          wrap.appendChild(buildList(block.items, false));
        }
        break;
      }
      case 'accordion': {
        const accordion = createElement('div', 'accordion');
        (block.items || []).forEach((item, index) => {
          const accItem = createElement('section', 'accordionItem');
          const header = createElement('button', 'accordionHeader');
          header.type = 'button';
          header.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
          header.innerHTML = `<span>${escapeHtml(item.title || 'Details')}</span><span class="accordionIcon">+</span>`;

          const body = createElement('div', 'accordionBody');
          if (index === 0) body.classList.add('open');

          if (item.summary) {
            const summary = createElement('p', 'accordionSummary');
            summary.textContent = item.summary;
            body.appendChild(summary);
          }

          (item.blocks || []).forEach((nestedBlock) => {
            body.appendChild(buildBlock(nestedBlock));
          });

          header.addEventListener('click', () => {
            const isOpen = body.classList.contains('open');
            body.classList.toggle('open');
            header.setAttribute('aria-expanded', String(!isOpen));
            const icon = header.querySelector('.accordionIcon');
            if (icon) icon.textContent = isOpen ? '+' : '–';
          });

          accItem.appendChild(header);
          accItem.appendChild(body);
          accordion.appendChild(accItem);
        });
        wrap.appendChild(accordion);
        break;
      }
      default: {
        const fallback = createElement('p', 'blockText');
        fallback.textContent = 'Unsupported content block.';
        wrap.appendChild(fallback);
      }
    }

    return wrap;
  }

  function renderSidebar() {
    els.sidebarNav.innerHTML = '';

    state.sections.forEach((section, index) => {
      const btn = createElement('button', 'sidebarItem');
      btn.type = 'button';
      if (index === state.activeIndex) btn.classList.add('isActive');
      if (isReviewed(index)) btn.classList.add('isReviewed');

      btn.innerHTML = `
        <span class="sidebarItemMain">
          <span class="sidebarIndex">${index + 1}</span>
          <span class="sidebarLabel">${section.title}</span>
        </span>
        <span class="sidebarState">${isReviewed(index) ? 'Reviewed' : 'Open'}</span>
      `;

      btn.addEventListener('click', () => {
        state.activeIndex = index;
        render();
      });

      els.sidebarNav.appendChild(btn);
    });
  }

  function renderSection() {
    const section = state.sections[state.activeIndex];
    els.sectionKicker.textContent = `Section ${state.activeIndex + 1}`;
    els.sectionTitle.textContent = section.title;
    els.sectionIntro.textContent = section.summary || '';
    els.sectionBlocks.innerHTML = '';

    (section.blocks || []).forEach((block) => {
      els.sectionBlocks.appendChild(buildBlock(block));
    });

    els.prevSectionBtn.disabled = state.activeIndex === 0;
    els.nextSectionBtn.disabled = state.activeIndex === state.sections.length - 1;
    els.markReviewedBtn.textContent = isReviewed(state.activeIndex) ? 'Reviewed' : 'Mark as Reviewed';
    els.markReviewedBtn.disabled = isReviewed(state.activeIndex);
  }

  function render() {
    renderMeta();
    renderSidebar();
    renderSection();
    saveProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindEvents() {
    els.prevSectionBtn.addEventListener('click', () => {
      if (state.activeIndex > 0) {
        state.activeIndex -= 1;
        render();
      }
    });

    els.nextSectionBtn.addEventListener('click', () => {
      if (state.activeIndex < state.sections.length - 1) {
        state.activeIndex += 1;
        render();
      }
    });

    els.markReviewedBtn.addEventListener('click', () => {
      if (!isReviewed(state.activeIndex)) {
        state.reviewed.push(state.activeIndex);
        state.reviewed.sort((a, b) => a - b);
        render();
      }
    });

    els.resetProgressBtn.addEventListener('click', () => {
      state.reviewed = [];
      saveProgress();
      render();
    });
  }

  async function init() {
    try {
      const data = await loadProjects();
      const projectId = getProjectId();
      const project = (data.projects || []).find((item) => item.id === projectId);

      if (!project) {
        els.projectTitle.textContent = 'Project not found';
        els.projectSummary.textContent = 'The requested project definition could not be loaded.';
        return;
      }

      state.project = project;
      state.sections = project.sections || [];
      state.reviewed = loadProgress().filter((index) => index >= 0 && index < state.sections.length);

      bindEvents();
      render();
    } catch (error) {
      console.error(error);
      els.projectTitle.textContent = 'Unable to load project';
      els.projectSummary.textContent = 'An error occurred while loading the project definition.';
    }
  }

  init();
})();
