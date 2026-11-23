(() => {
  const storageKey = "saa-windows-server-lab-path-v1";
  const workspaceKey = "saa-windows-server-workspace-v1";
  const panels = [...document.querySelectorAll(".labBench > .labPanel")];
  const links = [...document.querySelectorAll(".labRail nav a")];
  const groups = [...document.querySelectorAll("[data-lab]")].map(section =>
    [...section.querySelectorAll("input[type=checkbox]")]
  );
  const checks = groups.flat();
  const progress = document.querySelector("#lab-progress");
  const meter = document.querySelector("#lab-meter");
  const toolbar = document.querySelector("#lab-taskbar");
  const platformPicker = document.querySelector("#hypervisor-choice");
  const platforms = [...document.querySelectorAll("[data-platform]")];
  let state = {};
  try {
    const stored = JSON.parse(localStorage.getItem(workspaceKey));
    if (stored && typeof stored === "object") state = stored;
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) checks.forEach(check => { check.checked = saved.includes(check.id); });
  } catch {
    // Keep the workspace usable when storage is unavailable.
  }

  function save() {
    try {
      localStorage.setItem(workspaceKey, JSON.stringify(state));
      localStorage.setItem(storageKey, JSON.stringify(checks.filter(check => check.checked).map(check => check.id)));
    } catch {
      // Keep current-session progress when persistence fails.
    }
  }

  const tasks = panels.map(panel => {
    const result = [];
    let current;
    for (const node of [...panel.children].slice(1)) {
      if (!current || node.matches("h3, fieldset")) {
        current = document.createElement("div");
        current.className = "labTask";
        current.id = panel.id + "-task-" + (result.length + 1);
        current.dataset.title = node.matches("fieldset")
          ? "Verify in your VMs"
          : node.matches("h3") ? node.textContent.split(" · ")[0] : "Review the deliverables";
        panel.insertBefore(current, node);
        result.push(current);
      }
      current.appendChild(node);
    }
    return result;
  });

  toolbar.innerHTML = `
    <p class="labTaskHeading" aria-live="polite"></p>
    <div class="labControls">
      <button class="btn btnGhost" type="button" data-direction="-1">Previous</button>
      <button class="btn btnPill" type="button" data-direction="1">Continue</button>
    </div>`;
  const taskHeading = toolbar.querySelector(".labTaskHeading");
  const previous = toolbar.querySelector('[data-direction="-1"]');
  const next = toolbar.querySelector('[data-direction="1"]');

  let stage = 0;
  let task = 0;
  const taskButtons = tasks.map((items, stageIndex) => items.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "labTaskToggle";
    button.textContent = `Task ${index + 1} · ${item.dataset.title}`;
    button.setAttribute("aria-controls", item.id);
    item.before(button);
    button.addEventListener("click", () => {
      stage = stageIndex;
      task = index;
      draw();
    });
    return button;
  }));

  function updateProgress() {
    const verified = groups.findIndex(group => !group.every(check => check.checked));
    const count = verified === -1 ? groups.length : verified;
    progress.textContent = `${count} of ${groups.length} labs verified in sequence`;
    meter.value = count;
    links.forEach((link, index) => {
      const status = link.querySelector("small");
      status.textContent = index === stage ? "Current lab"
        : index < count ? "Verified"
        : index > count ? "Review available · setup required" : "Ready to work";
    });
  }

  function draw(focus = false) {
    panels.forEach((panel, index) => { panel.hidden = index !== stage; });
    tasks[stage].forEach((item, index) => {
      item.hidden = index !== task;
      taskButtons[stage][index].setAttribute("aria-expanded", String(index === task));
    });
    links.forEach((link, index) => {
      if (index === stage) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    taskHeading.textContent = `Task ${task + 1} of ${tasks[stage].length}`;
    previous.disabled = stage === 0 && task === 0;
    next.disabled = stage === panels.length - 1 && task === tasks[stage].length - 1;
    next.textContent = next.disabled ? "End of path" : task === tasks[stage].length - 1
      ? (panels[stage + 1].id === "handoff" ? "Open handoff" : "Next lab") : "Continue";
    state.stage = panels[stage].id;
    state.task = task;
    save();
    updateProgress();
    if (focus) {
      const heading = tasks[stage][task].querySelector("h3, legend") || panels[stage].querySelector("h2");
      heading.tabIndex = -1;
      heading.focus();
    }
  }

  function openStage(id, index = 0, focus = false) {
    const target = panels.findIndex(panel => panel.id === id);
    if (target === -1) return;
    stage = target;
    task = Number.isInteger(index) && tasks[stage][index] ? index : 0;
    draw(focus);
  }

  function move(direction) {
    const index = task + direction;
    if (tasks[stage][index]) {
      task = index;
      draw(true);
      return;
    }
    const target = stage + direction;
    if (!panels[target]) return;
    history.pushState(null, "", "#" + panels[target].id);
    openStage(panels[target].id, direction < 0 ? tasks[target].length - 1 : 0, true);
  }

  function updatePlatform() {
    for (const platform of platforms) {
      platform.hidden = platform.dataset.platform !== platformPicker.value;
      platform.open = !platform.hidden;
    }
    state.platform = platformPicker.value;
    save();
  }

  links.forEach(link => link.append(document.createElement("small")));
  checks.forEach(check => check.addEventListener("change", () => { save(); updateProgress(); }));
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));

  const expected = {
    "virtual-lab": "192.168.77.10",
    domain: "ad.academy.test",
    identities: "dl-finance-modify",
    files: "outsider.test"
  };
  if (!state.answers || typeof state.answers !== "object") state.answers = {};
  for (const form of document.querySelectorAll("[data-question]")) {
    const key = form.dataset.question;
    const input = form.elements.answer;
    const feedback = form.querySelector("[role=status]");
    let correct = state.answers[key] === true;
    if (correct) {
      input.value = expected[key];
      feedback.textContent = "Correct. Confirm the result in your VMs.";
    }
    form.addEventListener("input", () => { feedback.textContent = ""; });
    form.addEventListener("submit", event => {
      event.preventDefault();
      correct = input.value.trim().toLowerCase() === expected[key];
      state.answers[key] = correct;
      feedback.textContent = correct
        ? "Correct. Confirm the result in your VMs."
        : "Try again. Use the hint to find the value in your lab.";
      save();
    });
    form.hidden = false;
  }

  document.querySelector(".labWorkspace").addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const id = link.hash.slice(1);
    if (!panels.some(panel => panel.id === id)) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, "", link.hash);
    openStage(id, 0, true);
  });
  window.addEventListener("hashchange", () => openStage(location.hash.slice(1) || panels[0].id, 0, true));

  const hashId = location.hash.slice(1);
  const initial = panels.some(panel => panel.id === hashId) ? hashId : state.stage;
  openStage(panels.some(panel => panel.id === initial) ? initial : panels[0].id, initial === state.stage ? state.task : 0);
  platformPicker.addEventListener("change", updatePlatform);
  platformPicker.value = typeof state.platform === "string" ? state.platform : "";
  updatePlatform();
  document.querySelector("#hypervisor-picker").hidden = false;
  toolbar.hidden = false;
  progress.parentElement.hidden = false;
})();
