/* Server Admin Academy
   - Dropdown nav (click to open, click outside to close)
   - Data-driven cards + filter chips on Domain / Engagement Mode pages
*/

const MODES = [
  { key: "all", label: "All" },
  { key: "knowledge-assessments", label: "Knowledge Assessments" },
  { key: "incident-scenarios", label: "Incident Scenarios" },
  { key: "guided-practice", label: "Guided Practice" },
  { key: "capstone-projects", label: "Capstone Projects" },
];

const DOMAINS = [
  { key: "all", label: "All" },
  { key: "support-operations", label: "Support Operations" },
  { key: "systems-engineering", label: "Systems Engineering" },
  { key: "security-operations", label: "Security Operations" },
];

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function initDropdowns() {
  const drops = $all(".navDrop");
  drops.forEach(drop => {
    const btn = $(".navDropBtn", drop);
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      drops.forEach(d => { if (d !== drop) d.classList.remove("isOpen"); });
      drop.classList.toggle("isOpen");
    });
  });

  document.addEventListener("click", () => {
    drops.forEach(d => d.classList.remove("isOpen"));
  });

  // Escape closes menus
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") drops.forEach(d => d.classList.remove("isOpen"));
  });
}

async function loadActivities() {
  const res = await fetch("./data/activities.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load activities.json");
  return res.json();
}

function renderChips(rowEl, items, activeKey, onPick) {
  rowEl.innerHTML = "";
  items.forEach(it => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (it.key === activeKey ? " isActive" : "");
    b.textContent = it.label;
    b.addEventListener("click", () => onPick(it.key));
    rowEl.appendChild(b);
  });
}

function badgeLabelFor(item, pageType) {
  // show the "other axis" badge
  if (pageType === "domain") {
    const mode = MODES.find(m => m.key === item.mode);
    return mode ? mode.label : item.mode;
  }
  const dom = DOMAINS.find(d => d.key === item.domain);
  return dom ? dom.label : item.domain;
}

function isAvailable(item) {
  return String(item.status || "").toLowerCase() === "available";
}

function buildCard(item, pageType) {
  const a = document.createElement("a");
  a.className = "card itemCard";
  a.href = isAvailable(item) ? item.link : "#";

  const top = document.createElement("div");
  top.className = "itemTop";

  const title = document.createElement("div");
  title.className = "itemTitle";
  title.textContent = item.title;

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = badgeLabelFor(item, pageType);

  top.appendChild(title);
  top.appendChild(badge);

  const desc = document.createElement("div");
  desc.className = "itemDesc";
  desc.textContent = item.description || "";

  const footer = document.createElement("div");
  footer.className = "itemFooter";

  const btn = document.createElement("span");
  btn.className = "btn btnGhost btnSquare";
  btn.textContent = isAvailable(item) ? "Explore" : "Coming soon";
  if (!isAvailable(item)) btn.classList.add("btnDisabled");

  const statusBadge = document.createElement("span");
  statusBadge.className = "badge purple";
  statusBadge.textContent = (item.difficulty || "standard").toUpperCase();

  footer.appendChild(btn);
  footer.appendChild(statusBadge);

  a.appendChild(top);
  a.appendChild(desc);
  a.appendChild(footer);

  if (!isAvailable(item)) {
    // prevent jumping to top
    a.addEventListener("click", (e) => e.preventDefault());
  }

  return a;
}

function applyFilters(activities, pageType, pageKey, activeFilterKey) {
  let base = activities;

  if (pageType === "domain") {
    base = base.filter(x => x.domain === pageKey);
    if (activeFilterKey !== "all") base = base.filter(x => x.mode === activeFilterKey);
  } else if (pageType === "mode") {
    base = base.filter(x => x.mode === pageKey);
    if (activeFilterKey !== "all") base = base.filter(x => x.domain === activeFilterKey);
  }

  // Sort: available first, then title
  base.sort((a, b) => {
    const av = isAvailable(a) ? 0 : 1;
    const bv = isAvailable(b) ? 0 : 1;
    if (av !== bv) return av - bv;
    return String(a.title).localeCompare(String(b.title));
  });

  return base;
}

async function initDataPages() {
  const body = document.body;
  const pageType = body.dataset.page;
  if (pageType !== "domain" && pageType !== "mode") return;

  const pageKey = pageType === "domain" ? body.dataset.domain : body.dataset.mode;

  const filterRow = $("#filterRow");
  const grid = $("#cardsGrid");
  const empty = $("#emptyState");
  if (!filterRow || !grid || !empty) return;

  let activities = [];
  try {
    activities = await loadActivities();
  } catch (e) {
    empty.hidden = false;
    empty.textContent = "Could not load data/activities.json";
    return;
  }

  const filterItems = pageType === "domain" ? MODES : DOMAINS;
  let active = "all";

  const draw = () => {
    renderChips(filterRow, filterItems, active, (k) => { active = k; draw(); });

    const filtered = applyFilters(activities, pageType, pageKey, active);
    grid.innerHTML = "";
    if (filtered.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    filtered.forEach(item => grid.appendChild(buildCard(item, pageType)));
  };

  draw();
}

(function boot(){
  initDropdowns();
  initDataPages();
})();
