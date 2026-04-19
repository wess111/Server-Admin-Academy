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
    return 'saa-project-progress:' + getProjectId();
  }

  function titleCase(value) {
    return String(value || '')
      .split('-')
      .map(function (part) {
        return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
      })
      .join(' ');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createElement(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof html === 'string') el.innerHTML = html;
    return el;
  }

  async function loadProjects() {
    const response = await fetch('./data/projects.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load ./data/projects.json');
    }
    return response.json();
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.reviewed) ? parsed.reviewed : [];
    } catch (error) {
      return [];
    }
  }

  function saveProgress() {
    localStorage.setItem(storageKey(), JSON.stringify({ reviewed: state.reviewed }));
  }

  function isReviewed(index) {
    return state.reviewed.indexOf(index) !== -1;
  }

  function renderMeta() {
    const project = state.project || {};
    if (els.projectTitle) els.projectTitle.textContent = project.title || 'Project';
    if (els.projectSummary) els.projectSummary.textContent = project.description || 'Project requirements loaded.';
    if (els.projectDifficulty) els.projectDifficulty.textContent = titleCase(project.difficulty || 'standard');
    if (els.projectDomain) els.projectDomain.textContent = titleCase(project.domain || 'systems-engineering');
    if (els.totalSections) els.totalSections.textContent = String(state.sections.length);
    if (els.reviewedCount) els.reviewedCount.textContent = String(state.reviewed.length);
  }

  function renderSimpleTable(headers, rows) {
    const tableWrap = createElement('div', 'tableWrap');
    const table = createElement('table', 'kvTable');

    if (Array.isArray(headers) && headers.length) {
      const thead = createElement('thead');
      const hr = createElement('tr');
      headers.forEach(function (header) {
        const th = createElement('th');
        th.textContent = header;
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);
    }

    const tbody = createElement('tbody');
    (rows || []).forEach(function (row) {
      const tr = createElement('tr');
      (row || []).forEach(function (cell) {
        const td = createElement('td');
        td.innerHTML = Array.isArray(cell) ? cell.join('<br>') : String(cell == null ? '' : cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    return tableWrap;
  }

  function renderKeyValueTable(rows) {
    const tableWrap = createElement('div', 'tableWrap');
    const table = createElement('table', 'kvTable');
    const tbody = createElement('tbody');

    (rows || []).forEach(function (row) {
      const tr = createElement('tr');
      const th = createElement('th');
      const td = createElement('td');
      th.textContent = row.label || '';
      td.innerHTML = Array.isArray(row.value) ? row.value.join('<br>') : String(row.value == null ? '' : row.value);
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    return tableWrap;
  }

  function buildList(items, ordered) {
    const list = createElement(ordered ? 'ol' : 'ul', 'blockList');
    (items || []).forEach(function (item) {
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

  function buildParagraphs(paragraphs) {
    const frag = document.createDocumentFragment();
    (paragraphs || []).forEach(function (paragraph) {
      const p = createElement('p', 'blockText');
      p.innerHTML = paragraph;
      frag.appendChild(p);
    });
    return frag;
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
        if (Array.isArray(block.paragraphs)) {
          wrap.appendChild(buildParagraphs(block.paragraphs));
        } else {
          const p = createElement('p', 'blockText');
          p.innerHTML = block.content || '';
          wrap.appendChild(p);
        }
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
        if (Array.isArray(block.headers)) {
          wrap.appendChild(renderSimpleTable(block.headers, block.rows || []));
        } else {
          wrap.appendChild(renderKeyValueTable(block.rows || []));
        }
        break;
      }
      case 'tree':
      case 'code': {
        wrap.appendChild(buildTree(block.content || block.code || ''));
        break;
      }
      case 'combo': {
        if (Array.isArray(block.headers)) {
          wrap.appendChild(renderSimpleTable(block.headers, block.rows || []));
        } else if (block.rows && block.rows.length) {
          wrap.appendChild(renderKeyValueTable(block.rows));
        }
        if (block.items && block.items.length) {
          wrap.appendChild(buildList(block.items, false));
        }
        break;
      }
      case 'accordion': {
        const accordion = createElement('div', 'accordion');
        (block.items || []).forEach(function (item, index) {
          const accItem = createElement('section', 'accordionItem');
          const header = createElement('button', 'accordionHeader');
          header.type = 'button';
          const openDefault = index === 0;
          header.setAttribute('aria-expanded', openDefault ? 'true' : 'false');
          header.innerHTML = '<span>' + escapeHtml(item.title || 'Details') + '</span><span class="accordionIcon">' + (openDefault ? '–' : '+') + '</span>';

          const body = createElement('div', 'accordionBody');
          if (openDefault) body.classList.add('open');

          if (item.summary) {
            const summary = createElement('p', 'accordionSummary');
            summary.textContent = item.summary;
            body.appendChild(summary);
          }

          (item.blocks || []).forEach(function (nestedBlock) {
            body.appendChild(buildBlock(nestedBlock));
          });

          header.addEventListener('click', function () {
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
    if (!els.sidebarNav) return;
    els.sidebarNav.innerHTML = '';

    state.sections.forEach(function (section, index) {
      const btn = createElement('button', 'sidebarItem');
      btn.type = 'button';
      if (index === state.activeIndex) btn.classList.add('isActive');
      if (isReviewed(index)) btn.classList.add('isReviewed');

      btn.innerHTML =
        '<span class="sidebarItemMain">' +
          '<span class="sidebarIndex">' + (index + 1) + '</span>' +
          '<span class="sidebarLabel">' + escapeHtml(section.title) + '</span>' +
        '</span>' +
        '<span class="sidebarState">' + (isReviewed(index) ? 'Reviewed' : 'Open') + '</span>';

      btn.addEventListener('click', function () {
        state.activeIndex = index;
        render();
      });

      els.sidebarNav.appendChild(btn);
    });
  }

  function renderSection() {
    const section = state.sections[state.activeIndex] || { title: 'Section', summary: '', blocks: [] };
    if (els.sectionKicker) els.sectionKicker.textContent = 'Section ' + (state.activeIndex + 1);
    if (els.sectionTitle) els.sectionTitle.textContent = section.title;
    if (els.sectionIntro) els.sectionIntro.textContent = section.summary || '';
    if (els.sectionBlocks) {
      els.sectionBlocks.innerHTML = '';
      (section.blocks || []).forEach(function (block) {
        els.sectionBlocks.appendChild(buildBlock(block));
      });
    }

    if (els.prevSectionBtn) els.prevSectionBtn.disabled = state.activeIndex === 0;
    if (els.nextSectionBtn) els.nextSectionBtn.disabled = state.activeIndex === state.sections.length - 1;
    if (els.markReviewedBtn) {
      els.markReviewedBtn.textContent = isReviewed(state.activeIndex) ? 'Reviewed' : 'Mark as Reviewed';
      els.markReviewedBtn.disabled = isReviewed(state.activeIndex);
    }
  }

  function render() {
    renderMeta();
    renderSidebar();
    renderSection();
    saveProgress();
  }

  function bindEvents() {
    if (els.prevSectionBtn) {
      els.prevSectionBtn.addEventListener('click', function () {
        if (state.activeIndex > 0) {
          state.activeIndex -= 1;
          render();
        }
      });
    }

    if (els.nextSectionBtn) {
      els.nextSectionBtn.addEventListener('click', function () {
        if (state.activeIndex < state.sections.length - 1) {
          state.activeIndex += 1;
          render();
        }
      });
    }

    if (els.markReviewedBtn) {
      els.markReviewedBtn.addEventListener('click', function () {
        if (!isReviewed(state.activeIndex)) {
          state.reviewed.push(state.activeIndex);
          state.reviewed.sort(function (a, b) { return a - b; });
          render();
        }
      });
    }

    if (els.resetProgressBtn) {
      els.resetProgressBtn.addEventListener('click', function () {
        state.reviewed = [];
        saveProgress();
        render();
      });
    }
  }

  async function init() {
    try {
      const data = await loadProjects();
      const projectId = getProjectId();
      const project = (data.projects || []).find(function (item) {
        return item.id === projectId;
      });

      if (!project) {
        if (els.projectTitle) els.projectTitle.textContent = 'Project not found';
        if (els.projectSummary) els.projectSummary.textContent = 'The requested project definition could not be loaded.';
        return;
      }

      state.project = project;
      state.sections = Array.isArray(project.sections) ? project.sections : [];
      state.reviewed = loadProgress().filter(function (index) {
        return index >= 0 && index < state.sections.length;
      });

      bindEvents();
      render();
    } catch (error) {
      console.error(error);
      if (els.projectTitle) els.projectTitle.textContent = 'Unable to load project';
      if (els.projectSummary) els.projectSummary.textContent = 'An error occurred while loading the project definition.';
      if (els.sectionTitle) els.sectionTitle.textContent = 'Unable to load';
      if (els.sectionIntro) els.sectionIntro.textContent = error.message || 'Project loading failed.';
    }
  }

  init();
})();
