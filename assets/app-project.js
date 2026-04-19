(function(){
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
    currentSectionBadge: document.getElementById('currentSectionBadge'),
    prevSectionBtn: document.getElementById('prevSectionBtn'),
    nextSectionBtn: document.getElementById('nextSectionBtn'),
    markReviewedBtn: document.getElementById('markReviewedBtn'),
    resetProgressBtn: document.getElementById('resetProgressBtn')
  };

  function getProjectId(){
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'techcon-gh-infrastructure';
  }

  function storageKey(){
    return `saa-project-progress:${getProjectId()}`;
  }

  function titleCase(value){
    return String(value || '')
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  async function loadProjects(){
    const res = await fetch('./data/projects.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load projects.json');
    return res.json();
  }

  function loadProgress(){
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.reviewed) ? parsed.reviewed : [];
    } catch {
      return [];
    }
  }

  function saveProgress(){
    localStorage.setItem(storageKey(), JSON.stringify({ reviewed: state.reviewed }));
  }

  function isReviewed(index){
    return state.reviewed.includes(index);
  }

  function renderMeta(){
    const project = state.project;
    els.projectTitle.textContent = project.title;
    els.projectSummary.textContent = project.description;
    els.projectDifficulty.textContent = titleCase(project.difficulty || 'standard');
    els.projectDomain.textContent = titleCase(project.domain || 'systems-engineering');
    els.totalSections.textContent = String(state.sections.length);
    els.reviewedCount.textContent = String(state.reviewed.length);
  }

  function buildTable(rows){
    const table = document.createElement('table');
    table.className = 'kvTable';
    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = row.label;
      const td = document.createElement('td');
      td.innerHTML = Array.isArray(row.value) ? row.value.join('<br>') : row.value;
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  function buildBlock(block){
    const wrap = document.createElement('section');
    wrap.className = 'requirementBlock';

    if (block.title) {
      const title = document.createElement('h3');
      title.className = 'blockTitle';
      title.textContent = block.title;
      wrap.appendChild(title);
    }

    if (block.type === 'text') {
      const p = document.createElement('p');
      p.className = 'blockText';
      p.textContent = block.content;
      wrap.appendChild(p);
    }

    if (block.type === 'list') {
      const ul = document.createElement('ul');
      ul.className = 'blockList';
      (block.items || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    }

    if (block.type === 'table') {
      wrap.appendChild(buildTable(block.rows || []));
    }

    if (block.type === 'tree') {
      const pre = document.createElement('pre');
      pre.className = 'treeBlock';
      pre.textContent = block.content || '';
      wrap.appendChild(pre);
    }

    if (block.type === 'combo') {
      const grid = document.createElement('div');
      grid.className = 'blockGrid';
      if (block.text) {
        const p = document.createElement('p');
        p.className = 'blockText';
        p.textContent = block.text;
        grid.appendChild(p);
      }
      if (Array.isArray(block.items) && block.items.length) {
        const ul = document.createElement('ul');
        ul.className = 'blockList';
        block.items.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        grid.appendChild(ul);
      }
      if (Array.isArray(block.rows) && block.rows.length) {
        grid.appendChild(buildTable(block.rows));
      }
      wrap.appendChild(grid);
    }

    return wrap;
  }

  function renderSidebar(){
    els.sidebarNav.innerHTML = '';
    state.sections.forEach((section, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebarItem';
      if (index === state.activeIndex) btn.classList.add('isActive');
      if (isReviewed(index)) btn.classList.add('isReviewed');
      btn.addEventListener('click', () => {
        state.activeIndex = index;
        render();
      });

      const top = document.createElement('div');
      top.className = 'sidebarItemTop';

      const title = document.createElement('div');
      title.className = 'sidebarItemTitle';
      title.textContent = section.title;

      const idx = document.createElement('div');
      idx.className = 'sidebarItemIndex';
      idx.textContent = `${index + 1}/${state.sections.length}`;

      const status = document.createElement('div');
      status.className = 'sidebarItemStatus';
      status.textContent = isReviewed(index) ? 'Reviewed' : (index === state.activeIndex ? 'Active' : 'Not reviewed');

      top.appendChild(title);
      top.appendChild(idx);
      btn.appendChild(top);
      btn.appendChild(status);
      els.sidebarNav.appendChild(btn);
    });
  }

  function renderSection(){
    const section = state.sections[state.activeIndex];
    els.sectionKicker.textContent = `Section ${state.activeIndex + 1}`;
    els.sectionTitle.textContent = section.title;
    els.sectionIntro.textContent = section.summary || '';
    els.currentSectionBadge.textContent = section.title;

    els.sectionBlocks.innerHTML = '';
    (section.blocks || []).forEach(block => {
      els.sectionBlocks.appendChild(buildBlock(block));
    });

    els.prevSectionBtn.disabled = state.activeIndex === 0;
    els.nextSectionBtn.disabled = state.activeIndex === state.sections.length - 1;
    els.markReviewedBtn.textContent = isReviewed(state.activeIndex) ? 'Reviewed' : 'Mark as Reviewed';
  }

  function render(){
    renderMeta();
    renderSidebar();
    renderSection();
  }

  function markReviewed(){
    if (!isReviewed(state.activeIndex)) {
      state.reviewed.push(state.activeIndex);
      state.reviewed.sort((a,b) => a-b);
      saveProgress();
      render();
    }
  }

  function resetReviewed(){
    state.reviewed = [];
    saveProgress();
    render();
  }

  function bindEvents(){
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

    els.markReviewedBtn.addEventListener('click', markReviewed);
    els.resetProgressBtn.addEventListener('click', resetReviewed);
  }

  async function init(){
    try {
      const data = await loadProjects();
      const projectId = getProjectId();
      const project = (data.projects || []).find(item => item.id === projectId);
      if (!project) throw new Error('Project not found');

      state.project = project;
      state.sections = project.sections || [];
      state.reviewed = loadProgress().filter(index => index >= 0 && index < state.sections.length);
      bindEvents();
      render();
    } catch (err) {
      els.projectTitle.textContent = 'Project unavailable';
      els.projectSummary.textContent = 'The requested project could not be loaded. Check data/projects.json and the project id in the URL.';
      els.sectionTitle.textContent = 'Unable to load project';
      els.sectionIntro.textContent = err.message || 'Unknown error';
      els.sectionBlocks.innerHTML = '';
    }
  }

  init();
})();
