const PROJECTS_PATH = "data/projects.json";

let projectData = null;
let currentSectionIndex = 0;
let reviewedSections = {};

function getProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getStorageKey(projectId) {
  return `server-admin-project-progress-${projectId}`;
}

async function loadProjects() {
  const response = await fetch(PROJECTS_PATH);
  if (!response.ok) {
    throw new Error("Unable to load project data.");
  }
  return response.json();
}

function loadProgress(projectId) {
  const raw = localStorage.getItem(getStorageKey(projectId));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveProgress(projectId) {
  localStorage.setItem(getStorageKey(projectId), JSON.stringify(reviewedSections));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderNav() {
  const nav = document.getElementById("project-nav");
  nav.innerHTML = "";

  projectData.sections.forEach((section, index) => {
    const button = document.createElement("button");
    button.className = "project-nav-item";
    if (index === currentSectionIndex) button.classList.add("active");
    if (reviewedSections[section.id]) button.classList.add("reviewed");

    button.innerHTML = `
      <span class="nav-title">${escapeHtml(section.title)}</span>
      <span class="nav-status">${reviewedSections[section.id] ? "Reviewed" : ""}</span>
    `;

    button.addEventListener("click", () => {
      currentSectionIndex = index;
      renderCurrentSection();
    });

    nav.appendChild(button);
  });

  updateProgress();
}

function updateProgress() {
  const reviewedCount = projectData.sections.filter(s => reviewedSections[s.id]).length;
  const total = projectData.sections.length;
  document.getElementById("project-progress").textContent = `Sections reviewed: ${reviewedCount}/${total}`;
}

function renderTable(table) {
  const headers = table.headers || [];
  const rows = table.rows || [];

  return `
    <div class="table-wrap">
      <table class="project-table">
        <thead>
          <tr>
            ${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderList(items) {
  return `<ul class="project-list">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
}

function renderCodeBlock(code) {
  return `<pre class="project-code"><code>${escapeHtml(code)}</code></pre>`;
}

function renderParagraphs(paragraphs) {
  return paragraphs.map(p => `<p>${p}</p>`).join("");
}

function renderBlock(block) {
  if (block.type === "table") {
    return `
      <div class="content-card">
        ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ""}
        ${renderTable(block)}
      </div>
    `;
  }

  if (block.type === "list") {
    return `
      <div class="content-card">
        ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ""}
        ${renderList(block.items || [])}
      </div>
    `;
  }

  if (block.type === "code") {
    return `
      <div class="content-card">
        ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ""}
        ${renderCodeBlock(block.code || "")}
      </div>
    `;
  }

  if (block.type === "text") {
    return `
      <div class="content-card">
        ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ""}
        ${renderParagraphs(block.paragraphs || [])}
      </div>
    `;
  }

  if (block.type === "accordion") {
    return `
      <div class="accordion">
        ${(block.items || []).map((item, index) => `
          <div class="accordion-item">
            <button class="accordion-header" type="button" aria-expanded="false" aria-controls="accordion-panel-${index}">
              <span>${escapeHtml(item.title)}</span>
              <span class="accordion-icon">+</span>
            </button>
            <div class="accordion-body" id="accordion-panel-${index}">
              ${(item.blocks || []).map(innerBlock => renderBlock(innerBlock)).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  return "";
}

function initializeAccordions() {
  const headers = document.querySelectorAll(".accordion-header");
  headers.forEach(header => {
    header.addEventListener("click", () => {
      const item = header.closest(".accordion-item");
      const body = item.querySelector(".accordion-body");
      const expanded = header.getAttribute("aria-expanded") === "true";

      header.setAttribute("aria-expanded", String(!expanded));
      item.classList.toggle("open", !expanded);
      body.classList.toggle("open", !expanded);

      const icon = header.querySelector(".accordion-icon");
      if (icon) icon.textContent = expanded ? "+" : "−";
    });
  });
}

function renderCurrentSection() {
  const section = projectData.sections[currentSectionIndex];
  document.getElementById("section-title").textContent = section.title;
  document.getElementById("section-summary").textContent = section.summary || "";

  const content = document.getElementById("project-content");
  content.innerHTML = (section.blocks || []).map(block => renderBlock(block)).join("");

  initializeAccordions();
  renderNav();

  document.getElementById("prev-btn").disabled = currentSectionIndex === 0;
  document.getElementById("next-btn").disabled = currentSectionIndex === projectData.sections.length - 1;

  const reviewButton = document.getElementById("review-btn");
  reviewButton.textContent = reviewedSections[section.id] ? "Reviewed" : "Mark as Reviewed";
  reviewButton.classList.toggle("is-reviewed", !!reviewedSections[section.id]);
}

function setupControls(projectId) {
  document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentSectionIndex > 0) {
      currentSectionIndex -= 1;
      renderCurrentSection();
    }
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    if (currentSectionIndex < projectData.sections.length - 1) {
      currentSectionIndex += 1;
      renderCurrentSection();
    }
  });

  document.getElementById("review-btn").addEventListener("click", () => {
    const section = projectData.sections[currentSectionIndex];
    reviewedSections[section.id] = true;
    saveProgress(projectId);
    renderCurrentSection();
  });
}

async function initProjectPage() {
  try {
    const projectId = getProjectId();
    if (!projectId) throw new Error("Missing project id.");

    const allProjects = await loadProjects();
    projectData = allProjects.projects.find(project => project.id === projectId);

    if (!projectData) throw new Error("Project not found.");

    reviewedSections = loadProgress(projectId);

    document.getElementById("project-title").textContent = projectData.title;
    document.getElementById("project-meta").textContent = `${projectData.domain} • ${projectData.difficulty}`;

    setupControls(projectId);
    renderCurrentSection();
  } catch (error) {
    document.getElementById("section-title").textContent = "Unable to load project";
    document.getElementById("section-summary").textContent = error.message;
    document.getElementById("project-content").innerHTML = `
      <div class="content-card">
        <p>Please confirm that the project files are in the correct folders and that the project id in the URL matches the project data.</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initProjectPage);
