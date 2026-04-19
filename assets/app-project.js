const PROJECTS_PATH = "./data/projects.json";

let currentProject = null;
let currentSectionIndex = 0;
let reviewedState = {};

function getProjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getProgressStorageKey(projectId) {
  return `saa-project-progress-${projectId}`;
}

function loadReviewedState(projectId) {
  try {
    const raw = localStorage.getItem(getProgressStorageKey(projectId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveReviewedState(projectId) {
  localStorage.setItem(getProgressStorageKey(projectId), JSON.stringify(reviewedState));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderParagraphs(paragraphs = []) {
  return paragraphs.map(paragraph => `<p>${paragraph}</p>`).join("");
}

function renderList(items = []) {
  return `
    <ul class="projectBulletList">
      ${items.map(item => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderTable(block) {
  return `
    <div class="tableWrap">
      ${block.title ? `<h3 class="blockTitle">${escapeHtml(block.title)}</h3>` : ""}
      <table class="projectTable">
        <thead>
          <tr>
            ${(block.headers || []).map(header => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${(block.rows || []).map(row => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCode(block) {
  return `
    <div class="codeWrap">
      ${block.title ? `<h3 class="blockTitle">${escapeHtml(block.title)}</h3>` : ""}
      <pre class="projectCode"><code>${escapeHtml(block.code || "")}</code></pre>
    </div>
  `;
}

function renderText(block) {
  return `
    <div class="textBlock">
      ${block.title ? `<h3 class="blockTitle">${escapeHtml(block.title)}</h3>` : ""}
      ${renderParagraphs(block.paragraphs || [])}
    </div>
  `;
}

function renderSimpleListBlock(block) {
  return `
    <div class="textBlock">
      ${block.title ? `<h3 class="blockTitle">${escapeHtml(block.title)}</h3>` : ""}
      ${renderList(block.items || [])}
    </div>
  `;
}

function renderBlock(block) {
  if (!block || !block.type) return "";

  switch (block.type) {
    case "text":
      return renderText(block);
    case "list":
      return renderSimpleListBlock(block);
    case "table":
      return renderTable(block);
    case "code":
      return renderCode(block);
    case "accordion":
      return renderAccordion(block);
    default:
      return "";
  }
}

function renderAccordion(block) {
  const items = block.items || [];
  return `
    <div class="accordionGroup">
      ${items.map((item, index) => `
        <div class="accordionItem">
          <button
            class="accordionHeader"
            type="button"
            aria-expanded="false"
            aria-controls="accordion-panel-${currentSectionIndex}-${index}"
            id="accordion-header-${currentSectionIndex}-${index}"
          >
            <span>${escapeHtml(item.title)}</span>
            <span class="accordionIcon">+</span>
          </button>
          <div
            class="accordionBody"
            id="accordion-panel-${currentSectionIndex}-${index}"
            role="region"
            aria-labelledby="accordion-header-${currentSectionIndex}-${index}"
          >
            ${(item.blocks || []).map(innerBlock => renderBlock(innerBlock)).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function updateHero() {
  document.getElementById("projectTitle").textContent = currentProject.title || "Project";
  document.getElementById("projectSummary").textContent = currentProject.summary || "";
  document.getElementById("projectDomain").textContent = currentProject.domain || "Systems Engineering";
  document.getElementById("projectDifficulty").textContent = currentProject.difficulty || "Advanced";

  const reviewedCountEl = document.getElementById("reviewedCount");
  const totalSectionsEl = document.getElementById("totalSections");

  if (reviewedCountEl && reviewedCountEl.parentElement) {
    const statCard = reviewedCountEl.closest(".statCard");
    if (statCard) statCard.style.display = "none";
  }

  if (totalSectionsEl) {
    totalSectionsEl.textContent = String((currentProject.sections || []).length);
  }
}

function renderSidebar() {
  const sidebarNav = document.getElementById("sidebarNav");
  const sections = currentProject.sections || [];

  sidebarNav.innerHTML = sections.map((section, index) => {
    const activeClass = index === currentSectionIndex ? " isActive" : "";
    const reviewedClass = reviewedState[section.id] ? " isReviewed" : "";

    return `
      <button class="sidebarNavItem${activeClass}${reviewedClass}" type="button" data-index="${index}">
        <span class="sidebarNavIndex">${index + 1}</span>
        <span class="sidebarNavTextWrap">
          <span class="sidebarNavTitle">${escapeHtml(section.title)}</span>
        </span>
      </button>
    `;
  }).join("");

  sidebarNav.querySelectorAll(".sidebarNavItem").forEach(button => {
    button.addEventListener("click", () => {
      currentSectionIndex = Number(button.dataset.index);
      renderCurrentSection();
    });
  });
}

function renderCurrentSection() {
  const section = currentProject.sections[currentSectionIndex];
  if (!section) return;

  document.getElementById("sectionKicker").textContent = `Section ${currentSectionIndex + 1}`;
  document.getElementById("sectionTitle").textContent = section.title || "Section";
  document.getElementById("sectionIntro").textContent = section.summary || "";

  const sectionBlocks = document.getElementById("sectionBlocks");
  sectionBlocks.innerHTML = (section.blocks || []).map(block => renderBlock(block)).join("");

  const prevButton = document.getElementById("prevSectionBtn");
  const nextButton = document.getElementById("nextSectionBtn");
  const reviewButton = document.getElementById("markReviewedBtn");

  prevButton.disabled = currentSectionIndex === 0;
  nextButton.disabled = currentSectionIndex === currentProject.sections.length - 1;

  if (reviewedState[section.id]) {
    reviewButton.textContent = "Reviewed";
    reviewButton.classList.add("isReviewed");
  } else {
    reviewButton.textContent = "Mark as Reviewed";
    reviewButton.classList.remove("isReviewed");
  }

  renderSidebar();
  updateHero();
  initializeAccordions();
}

function initializeAccordions() {
  const groups = document.querySelectorAll(".accordionGroup");

  groups.forEach(group => {
    const items = group.querySelectorAll(".accordionItem");

    items.forEach(item => {
      const header = item.querySelector(".accordionHeader");
      const body = item.querySelector(".accordionBody");

      header.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");

        items.forEach(otherItem => {
          otherItem.classList.remove("open");

          const otherHeader = otherItem.querySelector(".accordionHeader");
          const otherBody = otherItem.querySelector(".accordionBody");
          const otherIcon = otherItem.querySelector(".accordionIcon");

          if (otherHeader) otherHeader.setAttribute("aria-expanded", "false");
          if (otherBody) otherBody.classList.remove("open");
          if (otherIcon) otherIcon.textContent = "+";
        });

        if (!isOpen) {
          item.classList.add("open");
          header.setAttribute("aria-expanded", "true");
          body.classList.add("open");

          const icon = item.querySelector(".accordionIcon");
          if (icon) icon.textContent = "−";
        }
      });
    });
  });
}

function bindControls(projectId) {
  document.getElementById("prevSectionBtn").addEventListener("click", () => {
    if (currentSectionIndex > 0) {
      currentSectionIndex -= 1;
      renderCurrentSection();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  document.getElementById("nextSectionBtn").addEventListener("click", () => {
    if (currentSectionIndex < currentProject.sections.length - 1) {
      currentSectionIndex += 1;
      renderCurrentSection();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  document.getElementById("markReviewedBtn").addEventListener("click", () => {
    const section = currentProject.sections[currentSectionIndex];
    reviewedState[section.id] = true;
    saveReviewedState(projectId);
    renderCurrentSection();
  });

  document.getElementById("resetProgressBtn").addEventListener("click", () => {
    reviewedState = {};
    saveReviewedState(projectId);
    renderCurrentSection();
  });
}

async function initializeProject() {
  try {
    const projectId = getProjectIdFromUrl();
    if (!projectId) throw new Error("Missing project id in URL.");

    const response = await fetch(PROJECTS_PATH);
    if (!response.ok) throw new Error("Unable to load projects.json.");

    const data = await response.json();
    const project = (data.projects || []).find(item => item.id === projectId);

    if (!project) throw new Error(`Project not found: ${projectId}`);

    currentProject = project;
    reviewedState = loadReviewedState(projectId);

    updateHero();
    bindControls(projectId);
    renderCurrentSection();
  } catch (error) {
    document.getElementById("projectTitle").textContent = "Unable to load project";
    document.getElementById("projectSummary").textContent = error.message;
    document.getElementById("sectionTitle").textContent = "Project Load Error";
    document.getElementById("sectionIntro").textContent = "Please verify the project data file and script.";
    document.getElementById("sectionBlocks").innerHTML = `
      <div class="textBlock">
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initializeProject);
