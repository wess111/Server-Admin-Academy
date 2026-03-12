const params = new URLSearchParams(window.location.search);
let lab = params.get("lab") || "cloud-tenant-provisioning";

let assessment = null;
let currentAttempt = 1;
let currentStep = 0;
let draggedOrderItem = null;
let activityResults = [];

document.addEventListener("DOMContentLoaded", initAssessment);

async function initAssessment() {
  try {
    const response = await fetch(`./data/assessments/${lab}.json`);
    if (!response.ok) throw new Error("Failed to load assessment.");
    assessment = await response.json();

    document.getElementById("assessmentTitle").textContent = assessment.title;
    document.getElementById("attemptMeta").textContent = `${assessment.attemptsAllowed} max`;
    document.getElementById("passMeta").textContent = `${assessment.passScore}%`;

    buildStepModel();
    buildSidebar();
    bindControls();
    renderCurrentStep();
  } catch (error) {
    renderFatal("The assessment could not be loaded. Check the assessment file and link.");
  }
}

function renderFatal(message) {
  document.getElementById("assessmentTitle").textContent = "Assessment Unavailable";
  document.getElementById("workspaceEyebrow").textContent = "Error";
  document.getElementById("workspaceTitle").textContent = "Assessment Unavailable";
  document.getElementById("workspaceContent").innerHTML = `<p class="scenarioText">${escapeHtml(message)}</p>`;
  document.getElementById("prevBtn").disabled = true;
  document.getElementById("nextBtn").disabled = true;
}

function buildStepModel() {
  assessment._steps = [
    { type: "scenario", label: "Case Study" },
    ...assessment.activities.map((activity, index) => ({
      type: "activity",
      label: `Task ${index + 1}`,
      activityIndex: index
    })),
    { type: "review", label: "Review & Submit" },
    { type: "results", label: "Results" }
  ];
}

function buildSidebar() {
  const nav = document.getElementById("assessmentNav");
  nav.innerHTML = "";

  assessment._steps.forEach((step, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `assessmentNavBtn${index === currentStep ? " isActive" : ""}`;
    btn.textContent = step.label;
    btn.dataset.stepIndex = index;

    if (step.type === "results") btn.disabled = true;

    btn.addEventListener("click", () => {
      if (step.type === "results" && currentStep !== assessment._steps.length - 1) return;
      persistVisibleInputs();
      currentStep = index;
      renderCurrentStep();
    });

    nav.appendChild(btn);
  });
}

function updateSidebar() {
  document.querySelectorAll(".assessmentNavBtn").forEach((btn, index) => {
    btn.classList.toggle("isActive", index === currentStep);
    const step = assessment._steps[index];
    if (step.type === "results") {
      btn.disabled = currentStep !== assessment._steps.length - 1;
    }
  });
}

function bindControls() {
  document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentStep > 0) {
      persistVisibleInputs();
      currentStep -= 1;
      renderCurrentStep();
    }
  });

  document.getElementById("nextBtn").addEventListener("click", handleNext);
}

function handleNext() {
  persistVisibleInputs();

  const step = assessment._steps[currentStep];

  if (step.type === "review") {
    handleSubmitAssessment();
    return;
  }

  if (currentStep < assessment._steps.length - 2) {
    currentStep += 1;
    renderCurrentStep();
  }
}

function renderCurrentStep() {
  updateSidebar();

  const step = assessment._steps[currentStep];
  const workspaceEyebrow = document.getElementById("workspaceEyebrow");
  const workspaceTitle = document.getElementById("workspaceTitle");
  const workspaceContent = document.getElementById("workspaceContent");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepMeta = document.getElementById("stepMeta");
  const stepText = document.getElementById("workspaceStepText");

  workspaceContent.innerHTML = "";

  if (step.type === "scenario") {
    workspaceEyebrow.textContent = "Case Study";
    workspaceTitle.textContent = "Case Study";
    renderScenarioStep(workspaceContent);
    prevBtn.disabled = true;
    nextBtn.disabled = false;
    nextBtn.textContent = "Next";
  }

  if (step.type === "activity") {
    const activity = assessment.activities[step.activityIndex];
    workspaceEyebrow.textContent = `Task ${step.activityIndex + 1}`;
    workspaceTitle.textContent = activity.title || `Task ${step.activityIndex + 1}`;
    renderActivityStep(workspaceContent, activity, step.activityIndex);
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    nextBtn.textContent = "Next";
  }

  if (step.type === "review") {
    workspaceEyebrow.textContent = "Review";
    workspaceTitle.textContent = "Review and Submit";
    renderReviewStep(workspaceContent);
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    nextBtn.textContent = "Submit Assessment";
  }

  if (step.type === "results") {
    workspaceEyebrow.textContent = "Results";
    workspaceTitle.textContent = "Assessment Results";
    renderResultsStep(workspaceContent);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    nextBtn.textContent = "Next";
  }

  stepMeta.textContent = `${currentStep + 1} of ${assessment._steps.length}`;
  stepText.textContent = `${step.label}`;
}

function renderScenarioStep(container) {
  const scenario = document.createElement("p");
  scenario.className = "scenarioText";
  scenario.textContent = assessment.scenario;
  container.appendChild(scenario);

  if (Array.isArray(assessment.reference) && assessment.reference.length) {
    const refCard = document.createElement("div");
    refCard.className = "referenceCard";

    const title = document.createElement("h3");
    title.className = "referenceTitle";
    title.textContent = "Reference Information";
    refCard.appendChild(title);

    const table = document.createElement("table");
    table.className = "referenceTable";

    assessment.reference.forEach(item => {
      const row = document.createElement("tr");

      const key = document.createElement("td");
      key.textContent = item.label;

      const value = document.createElement("td");
      value.textContent = item.value;

      row.appendChild(key);
      row.appendChild(value);
      table.appendChild(row);
    });

    refCard.appendChild(table);
    container.appendChild(refCard);
  }
}

function renderActivityStep(container, activity, index) {
  const prompt = document.createElement("p");
  prompt.className = "activityPrompt";
  prompt.textContent = activity.prompt;
  container.appendChild(prompt);
  container.appendChild(renderActivityWidget(activity, index));
}

function renderActivityWidget(activity, index) {
  switch (activity.type) {
    case "dropdown":
      return renderDropdown(activity, index);
    case "scriptDropdown":
      return renderScriptDropdown(activity, index);
    case "matching":
      return renderMatching(activity, index);
    case "matchLines":
      return renderMatchLines(activity, index);
    case "order":
      return renderOrder(activity, index);
    case "multiSelect":
      return renderMultiSelect(activity, index);
    default:
      return createTextBlock("Unsupported activity type.");
  }
}

function renderDropdown(activity, index) {
  const wrapper = document.createElement("div");
  const select = document.createElement("select");
  select.className = "assessmentSelect";
  select.dataset.activityIndex = index;

  addPlaceholderOption(select, "Select an answer");

  activity.options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });

  const stored = getStoredDropdownValue(index);
  if (stored) select.value = stored;

  select.addEventListener("change", () => storeGeneric(`dropdown-${index}`, select.value));
  wrapper.appendChild(select);
  return wrapper;
}

function renderScriptDropdown(activity, index) {
  const wrapper = document.createElement("div");
  const pre = document.createElement("pre");
  pre.className = "scriptBlock";

  activity.scriptParts.forEach(part => {
    if (typeof part === "string") {
      pre.appendChild(document.createTextNode(part));
    } else if (part && part.type === "dropdown") {
      const select = document.createElement("select");
      select.className = "inlineSelect";
      select.dataset.activityIndex = index;
      select.dataset.scriptBlankId = part.id;

      addPlaceholderOption(select, "Select");

      part.options.forEach(option => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
      });

      const stored = getStoredScriptDropdownState(index);
      if (stored[part.id]) select.value = stored[part.id];

      select.addEventListener("change", () => {
        const current = getStoredScriptDropdownState(index);
        current[part.id] = select.value;
        storeScriptDropdownState(index, current);
      });

      pre.appendChild(select);
    }
  });

  wrapper.appendChild(pre);
  return wrapper;
}

function renderMatching(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "matchGrid";

  const stored = getStoredMatchingState(index);

  activity.pairs.forEach((pair, pairIndex) => {
    const row = document.createElement("div");
    row.className = "matchRow";

    const left = document.createElement("div");
    left.className = "matchPromptText";
    left.textContent = pair.left;

    const select = document.createElement("select");
    select.className = "matchSelect";
    select.dataset.activityIndex = index;
    select.dataset.pairIndex = pairIndex;

    addPlaceholderOption(select, "Select a match");

    activity.options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });

    if (stored[pairIndex]) select.value = stored[pairIndex];

    select.addEventListener("change", () => {
      const current = getStoredMatchingState(index);
      current[pairIndex] = select.value;
      storeMatchingState(index, current);
    });

    row.appendChild(left);
    row.appendChild(select);
    wrapper.appendChild(row);
  });

  return wrapper;
}

function renderMatchLines(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "matchLinesWorkspace";
  wrapper.dataset.activityIndex = index;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("matchSvg");

  const leftCol = document.createElement("div");
  leftCol.className = "matchLinesColumn";

  const rightCol = document.createElement("div");
  rightCol.className = "matchLinesColumn";

  const stored = getStoredMatchLinesState(index);
  const leftItems = activity.left || [];
  const rightItems = activity.right || [];

  leftItems.forEach((item, itemIndex) => {
    const row = document.createElement("div");
    row.className = "matchLineItem leftItem";
    row.dataset.value = item;
    row.dataset.index = itemIndex;

    const label = document.createElement("div");
    label.className = "matchLineLabel";
    label.textContent = item;

    const node = document.createElement("button");
    node.type = "button";
    node.className = "matchNode";
    node.textContent = String.fromCharCode(65 + itemIndex);

    row.appendChild(label);
    row.appendChild(node);

    row.addEventListener("click", () => {
      const scope = row.closest(".matchLinesWorkspace");
      if (!scope) return;
      scope.querySelectorAll(".leftItem").forEach(el => el.classList.remove("isSelected"));
      row.classList.add("isSelected");
    });

    row.addEventListener("dblclick", () => {
      const current = getStoredMatchLinesState(index);
      delete current[item];
      storeMatchLinesState(index, current);
      updateMatchLinesUI(wrapper, index, activity);
    });

    leftCol.appendChild(row);
  });

  rightItems.forEach((item, itemIndex) => {
    const row = document.createElement("div");
    row.className = "matchLineItem rightItem";
    row.dataset.value = item;
    row.dataset.index = itemIndex;

    const node = document.createElement("button");
    node.type = "button";
    node.className = "matchNode right";
    node.textContent = String.fromCharCode(65 + itemIndex);

    const label = document.createElement("div");
    label.className = "matchLineLabel";
    label.textContent = item;

    row.appendChild(node);
    row.appendChild(label);

    row.addEventListener("click", () => {
      const selectedLeft = wrapper.querySelector(".leftItem.isSelected");
      if (!selectedLeft) return;

      const leftValue = selectedLeft.dataset.value;
      const rightValue = item;
      const current = getStoredMatchLinesState(index);

      Object.keys(current).forEach(key => {
        if (current[key] === rightValue) {
          delete current[key];
        }
      });

      current[leftValue] = rightValue;
      storeMatchLinesState(index, current);
      selectedLeft.classList.remove("isSelected");
      updateMatchLinesUI(wrapper, index, activity);
    });

    rightCol.appendChild(row);
  });

  wrapper.appendChild(svg);
  wrapper.appendChild(leftCol);
  wrapper.appendChild(rightCol);

  requestAnimationFrame(() => {
    updateMatchLinesUI(wrapper, index, activity);
  });

  window.addEventListener("resize", () => {
    updateMatchLinesUI(wrapper, index, activity);
  });

  return wrapper;
}

function updateMatchLinesUI(wrapper, index, activity) {
  const svg = wrapper.querySelector(".matchSvg");
  if (!svg) return;

  svg.innerHTML = "";

  wrapper.querySelectorAll(".matchLineItem").forEach(item => {
    item.classList.remove("isMatched");
  });

  const stored = getStoredMatchLinesState(index);
  const connections = Object.entries(stored);

  if (!connections.length) return;

  const wrapRect = wrapper.getBoundingClientRect();
  svg.setAttribute("width", wrapRect.width);
  svg.setAttribute("height", wrapper.scrollHeight);

  connections.forEach(([leftValue, rightValue]) => {
    const leftEl = [...wrapper.querySelectorAll(".leftItem")].find(el => el.dataset.value === leftValue);
    const rightEl = [...wrapper.querySelectorAll(".rightItem")].find(el => el.dataset.value === rightValue);
    if (!leftEl || !rightEl) return;

    leftEl.classList.add("isMatched");
    rightEl.classList.add("isMatched");

    const leftNode = leftEl.querySelector(".matchNode");
    const rightNode = rightEl.querySelector(".matchNode");
    if (!leftNode || !rightNode) return;

    const leftRect = leftNode.getBoundingClientRect();
    const rightRect = rightNode.getBoundingClientRect();

    const x1 = leftRect.left + leftRect.width / 2 - wrapRect.left;
    const y1 = leftRect.top + leftRect.height / 2 - wrapRect.top;
    const x2 = rightRect.left + rightRect.width / 2 - wrapRect.left;
    const y2 = rightRect.top + rightRect.height / 2 - wrapRect.top;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const cx1 = x1 + 80;
    const cx2 = x2 - 80;
    line.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`);
    line.setAttribute("class", "matchSvgLine");

    svg.appendChild(line);
  });
}

function renderOrder(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "orderLayout";
  wrapper.dataset.activityIndex = index;

  const storedAnswer = getStoredOrderState(index);
  const availableItems = storedAnswer.length
    ? activity.steps.filter(step => !storedAnswer.includes(step))
    : shuffleArray([...activity.steps]);

  const availablePanel = document.createElement("div");
  availablePanel.className = "orderPanel";
  availablePanel.innerHTML = `<h3 class="orderPanelTitle">Actions</h3>`;

  const availableList = document.createElement("div");
  availableList.className = "orderList orderDropzone";
  availableList.dataset.zone = "available";
  availableList.dataset.activityIndex = index;
  setupDropzone(availableList);

  availableItems.forEach(step => {
    availableList.appendChild(createOrderItem(step, index));
  });

  availablePanel.appendChild(availableList);

  const controls = document.createElement("div");
  controls.className = "orderControls";
  controls.innerHTML = `
    <button type="button" class="orderControlBtn" title="Move selected right" data-action="right">➜</button>
    <button type="button" class="orderControlBtn" title="Move selected left" data-action="left">⬅</button>
    <button type="button" class="orderControlBtn" title="Move selected up" data-action="up">↑</button>
    <button type="button" class="orderControlBtn" title="Move selected down" data-action="down">↓</button>
  `;

  controls.querySelectorAll(".orderControlBtn").forEach(btn => {
    btn.addEventListener("click", () => handleOrderControl(btn.dataset.action, index));
  });

  const answerPanel = document.createElement("div");
  answerPanel.className = "orderPanel";
  answerPanel.innerHTML = `<h3 class="orderPanelTitle">Answer Area</h3>`;

  const answerList = document.createElement("div");
  answerList.className = "orderList orderDropzone";
  answerList.dataset.zone = "answer";
  answerList.dataset.activityIndex = index;
  setupDropzone(answerList);

  storedAnswer.forEach(step => {
    answerList.appendChild(createOrderItem(step, index));
  });

  answerPanel.appendChild(answerList);

  wrapper.appendChild(availablePanel);
  wrapper.appendChild(controls);
  wrapper.appendChild(answerPanel);

  return wrapper;
}

function createOrderItem(text, activityIndex) {
  const item = document.createElement("div");
  item.className = "orderItem";
  item.draggable = true;
  item.textContent = text;
  item.dataset.activityIndex = activityIndex;

  item.addEventListener("click", () => {
    const scope = item.closest(".orderLayout");
    if (!scope) return;
    scope.querySelectorAll(".orderItem").forEach(sib => sib.classList.remove("isSelected"));
    item.classList.add("isSelected");
  });

  item.addEventListener("dblclick", () => {
    const scope = item.closest(".orderLayout");
    if (!scope) return;

    const available = scope.querySelector('[data-zone="available"]');
    const answer = scope.querySelector('[data-zone="answer"]');

    if (item.parentElement === available) {
      answer.appendChild(item);
    } else if (item.parentElement === answer) {
      available.appendChild(item);
    }

    item.classList.remove("isSelected");
    persistOrderState(activityIndex);
  });

  item.addEventListener("dragstart", () => {
    draggedOrderItem = item;
    item.classList.add("dragging");
  });

  item.addEventListener("dragend", () => {
    item.classList.remove("dragging");
    draggedOrderItem = null;
    persistOrderState(activityIndex);
  });

  return item;
}

function setupDropzone(zone) {
  zone.addEventListener("dragover", event => {
    event.preventDefault();
  });

  zone.addEventListener("drop", event => {
    event.preventDefault();
    if (!draggedOrderItem) return;

    const afterElement = getDragAfterElement(zone, event.clientY);
    if (!afterElement) {
      zone.appendChild(draggedOrderItem);
    } else {
      zone.insertBefore(draggedOrderItem, afterElement);
    }

    const activityIndex = Number(zone.dataset.activityIndex);
    persistOrderState(activityIndex);
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".orderItem:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleOrderControl(action, activityIndex) {
  const wrapper = document.querySelector(`.orderLayout[data-activity-index="${activityIndex}"]`);
  if (!wrapper) return;

  const available = wrapper.querySelector('[data-zone="available"]');
  const answer = wrapper.querySelector('[data-zone="answer"]');
  const selected = wrapper.querySelector(".orderItem.isSelected");
  if (!selected) return;

  if (action === "right" && selected.parentElement === available) {
    answer.appendChild(selected);
  }

  if (action === "left" && selected.parentElement === answer) {
    available.appendChild(selected);
  }

  if (action === "up" && selected.parentElement === answer) {
    const prev = selected.previousElementSibling;
    if (prev) answer.insertBefore(selected, prev);
  }

  if (action === "down" && selected.parentElement === answer) {
    const next = selected.nextElementSibling;
    if (next) answer.insertBefore(next, selected);
  }

  persistOrderState(activityIndex);
}

function renderMultiSelect(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "multiGrid";
  const stored = getStoredMultiSelectState(index);

  activity.options.forEach((option, optionIndex) => {
    const label = document.createElement("label");
    label.className = "multiOption";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.activityIndex = index;
    input.dataset.optionIndex = optionIndex;
    input.value = option;
    input.checked = stored.includes(option);

    input.addEventListener("change", () => {
      const checked = [...wrapper.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
      storeMultiSelectState(index, checked);
    });

    const text = document.createElement("span");
    text.textContent = option;

    label.appendChild(input);
    label.appendChild(text);
    wrapper.appendChild(label);
  });

  return wrapper;
}

function renderReviewStep(container) {
  const text = document.createElement("p");
  text.className = "reviewText";
  text.textContent = "Review the assessment structure below, then submit when you are ready.";
  container.appendChild(text);

  const list = document.createElement("div");
  list.className = "reviewList";

  assessment.activities.forEach((activity, index) => {
    const item = document.createElement("div");
    item.className = "reviewItem";
    item.innerHTML = `
      <strong>Task ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)}
      <div style="margin-top:0.45rem; color:#94a3b8;">${escapeHtml(activity.prompt)}</div>
    `;
    list.appendChild(item);
  });

  container.appendChild(list);
}

function persistVisibleInputs() {
  const step = assessment._steps[currentStep];
  if (!step || step.type !== "activity") return;

  const index = step.activityIndex;
  const activity = assessment.activities[index];

  if (activity.type === "dropdown") {
    const select = document.querySelector(`select[data-activity-index="${index}"]`);
    if (select) storeGeneric(`dropdown-${index}`, select.value);
  }

  if (activity.type === "scriptDropdown") {
    const selects = [...document.querySelectorAll(`select[data-activity-index="${index}"][data-script-blank-id]`)];
    const values = {};
    selects.forEach(select => {
      values[select.dataset.scriptBlankId] = select.value;
    });
    storeScriptDropdownState(index, values);
  }

  if (activity.type === "matching") {
    const selects = [...document.querySelectorAll(`select[data-activity-index="${index}"][data-pair-index]`)];
    const values = [];
    selects.forEach(select => {
      values[Number(select.dataset.pairIndex)] = select.value;
    });
    storeMatchingState(index, values);
  }

  if (activity.type === "matchLines") {
    // values are stored live on click
  }

  if (activity.type === "order") {
    persistOrderState(index);
  }

  if (activity.type === "multiSelect") {
    const checked = [...document.querySelectorAll(`input[data-activity-index="${index}"][type="checkbox"]:checked`)]
      .map(input => input.value);
    storeMultiSelectState(index, checked);
  }
}

function handleSubmitAssessment() {
  persistVisibleInputs();
  activityResults = assessment.activities.map((activity, index) => evaluateActivity(activity, index));
  currentStep = assessment._steps.length - 1;
  renderCurrentStep();
}

function renderResultsStep(container) {
  const score = activityResults.filter(result => result.correct).length;
  const total = assessment.activities.length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= assessment.passScore;
  const finalAttempt = currentAttempt >= assessment.attemptsAllowed;

  const summary = document.createElement("div");
  summary.innerHTML = `
    <p class="resultsText"><strong>Score:</strong> ${score} / ${total}</p>
    <p class="resultsText"><strong>Percentage:</strong> ${percentage}%</p>
    <p class="resultsText"><strong>Attempt:</strong> ${currentAttempt} of ${assessment.attemptsAllowed}</p>
    <p class="resultsText"><strong>Status:</strong> ${passed ? "Pass" : (finalAttempt ? "Final Attempt Used" : "Retry Available")}</p>
  `;
  container.appendChild(summary);

  const resultList = document.createElement("div");
  resultList.className = "resultList";

  activityResults.forEach((result, index) => {
    const item = document.createElement("div");
    item.className = `resultItem ${result.correct ? "isCorrect" : "isIncorrect"}`;
    item.textContent = `${result.correct ? "✓" : "✗"} Task ${index + 1} — ${assessment.activities[index].title || `Task ${index + 1}`}`;
    resultList.appendChild(item);
  });

  container.appendChild(resultList);

  if (!passed && !finalAttempt && assessment.retryEnabled !== false) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "assessmentBtn assessmentBtnSecondary";
    retryBtn.textContent = "Retry Assessment";
    retryBtn.addEventListener("click", handleRetry);
    retryBtn.style.marginTop = "1rem";
    container.appendChild(retryBtn);
  }

  if (finalAttempt && assessment.revealAnswersAfterFinalAttempt) {
    container.appendChild(renderAnswerReview());
  }

  if (passed || finalAttempt) {
    container.appendChild(renderReportSection(score, total, percentage, passed));
  }
}

function renderAnswerReview() {
  const wrapper = document.createElement("div");
  wrapper.style.marginTop = "1.2rem";

  const heading = document.createElement("h3");
  heading.className = "referenceTitle";
  heading.textContent = "Answer Review";
  wrapper.appendChild(heading);

  const list = document.createElement("div");
  list.className = "reviewList";

  assessment.activities.forEach((activity, index) => {
    const result = activityResults[index];
    const item = document.createElement("div");
    item.className = "reviewItem";
    item.innerHTML = `
      <strong>Task ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)}
      <div style="margin-top:0.45rem;"><strong>Correct Answer:</strong><br>${formatCorrectAnswer(activity, result.correctAnswer)}</div>
      ${activity.explanation ? `<div style="margin-top:0.45rem;"><strong>Explanation:</strong> ${escapeHtml(activity.explanation)}</div>` : ""}
    `;
    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function renderReportSection(score, total, percentage, passed) {
  const wrapper = document.createElement("div");
  wrapper.className = "reportBox";

  const heading = document.createElement("h3");
  heading.className = "referenceTitle";
  heading.textContent = "Generate Report";

  const text = document.createElement("p");
  text.className = "resultsText";
  text.textContent = "Enter the student name, then generate the assessment report for Canvas submission.";

  const row = document.createElement("div");
  row.className = "reportRow";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "studentName";
  input.className = "reportInput";
  input.placeholder = "Student name";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "assessmentBtn assessmentBtnPrimary";
  button.textContent = "Generate Report";
  button.addEventListener("click", () => generateReport(score, total, percentage, passed));

  row.appendChild(input);
  row.appendChild(button);

  wrapper.appendChild(heading);
  wrapper.appendChild(text);
  wrapper.appendChild(row);

  return wrapper;
}

function handleRetry() {
  currentAttempt += 1;
  currentStep = 0;
  activityResults = [];
  clearStoredResponses();
  renderCurrentStep();
}

function generateReport(score, total, percentage, passed) {
  const studentName = document.getElementById("studentName")?.value.trim() || "Not Provided";
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;

  const attemptId = `SAA-${Date.now()}`;

  win.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Assessment Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #111827; line-height: 1.55; }
        h1, h2 { margin-bottom: 0.35rem; }
        .meta { margin-top: 1.5rem; margin-bottom: 1.5rem; }
        .meta p { margin: 0.35rem 0; }
        .section { margin-top: 1.5rem; }
        .row { margin-bottom: 0.55rem; }
      </style>
    </head>
    <body>
      <h1>Server Admin Academy</h1>
      <h2>Assessment Completion Report</h2>

      <div class="meta">
        <p><strong>Student Name:</strong> ${escapeHtml(studentName)}</p>
        <p><strong>Assessment:</strong> ${escapeHtml(assessment.title)}</p>
        <p><strong>Score:</strong> ${score} / ${total}</p>
        <p><strong>Percentage:</strong> ${percentage}%</p>
        <p><strong>Status:</strong> ${passed ? "Pass" : "Final Attempt Used"}</p>
        <p><strong>Attempts Used:</strong> ${currentAttempt}</p>
        <p><strong>Completion Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Assessment ID:</strong> ${attemptId}</p>
      </div>

      <div class="section">
        <h3>Task Results</h3>
        ${assessment.activities.map((activity, index) => `
          <div class="row">
            <strong>Task ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)} — ${activityResults[index].correct ? "Correct" : "Incorrect"}
          </div>
        `).join("")}
      </div>

      <script>
        window.onload = function () { window.print(); };
      </script>
    </body>
    </html>
  `);

  win.document.close();
}

function evaluateActivity(activity, index) {
  switch (activity.type) {
    case "dropdown":
      return evaluateDropdown(activity, index);
    case "scriptDropdown":
      return evaluateScriptDropdown(activity, index);
    case "matching":
      return evaluateMatching(activity, index);
    case "matchLines":
      return evaluateMatchLines(activity, index);
    case "order":
      return evaluateOrder(activity, index);
    case "multiSelect":
      return evaluateMultiSelect(activity, index);
    default:
      return { correct: false, userAnswer: null, correctAnswer: null };
  }
}

function evaluateDropdown(activity, index) {
  const userAnswer = getStoredDropdownValue(index);
  return {
    correct: userAnswer === activity.answer,
    userAnswer,
    correctAnswer: activity.answer
  };
}

function evaluateScriptDropdown(activity, index) {
  const answerMap = getStoredScriptDropdownState(index);
  let correct = true;

  Object.keys(activity.answers || {}).forEach(key => {
    if (answerMap[key] !== activity.answers[key]) correct = false;
  });

  return {
    correct,
    userAnswer: answerMap,
    correctAnswer: activity.answers || {}
  };
}

function evaluateMatching(activity, index) {
  const userAnswer = getStoredMatchingState(index);
  let correct = true;

  activity.pairs.forEach((pair, pairIndex) => {
    if (userAnswer[pairIndex] !== pair.right) correct = false;
  });

  return {
    correct,
    userAnswer,
    correctAnswer: activity.pairs.map(pair => pair.right)
  };
}

function evaluateMatchLines(activity, index) {
  const userAnswer = getStoredMatchLinesState(index);
  const correctAnswer = activity.answer || {};
  let correct = true;

  const leftItems = activity.left || [];
  leftItems.forEach(left => {
    if (userAnswer[left] !== correctAnswer[left]) {
      correct = false;
    }
  });

  return {
    correct,
    userAnswer,
    correctAnswer
  };
}

function evaluateOrder(activity, index) {
  const userAnswer = getStoredOrderState(index);
  return {
    correct: arraysEqual(userAnswer, activity.answer),
    userAnswer,
    correctAnswer: activity.answer
  };
}

function evaluateMultiSelect(activity, index) {
  const userAnswer = getStoredMultiSelectState(index);
  const correctAnswer = [...activity.answer].sort();

  return {
    correct: arraysEqual([...userAnswer].sort(), correctAnswer),
    userAnswer,
    correctAnswer
  };
}

function persistOrderState(index) {
  const wrapper = document.querySelector(`.orderLayout[data-activity-index="${index}"]`);
  if (!wrapper) return;

  const answer = [...wrapper.querySelector('[data-zone="answer"]').querySelectorAll(".orderItem")]
    .map(item => item.textContent.trim());

  storeGeneric(`order-${index}`, answer);
}

function getStoredDropdownValue(index) {
  return getGeneric(`dropdown-${index}`) || "";
}

function getStoredScriptDropdownState(index) {
  return getGeneric(`script-${index}`) || {};
}

function storeScriptDropdownState(index, value) {
  storeGeneric(`script-${index}`, value);
}

function getStoredMatchingState(index) {
  return getGeneric(`matching-${index}`) || [];
}

function storeMatchingState(index, value) {
  storeGeneric(`matching-${index}`, value);
}

function getStoredMatchLinesState(index) {
  return getGeneric(`matchLines-${index}`) || {};
}

function storeMatchLinesState(index, value) {
  storeGeneric(`matchLines-${index}`, value);
}

function getStoredOrderState(index) {
  return getGeneric(`order-${index}`) || [];
}

function getStoredMultiSelectState(index) {
  return getGeneric(`multi-${index}`) || [];
}

function storeMultiSelectState(index, value) {
  storeGeneric(`multi-${index}`, value);
}

function clearStoredResponses() {
  assessment.activities.forEach((_, index) => {
    localStorage.removeItem(storageKey(`dropdown-${index}`));
    localStorage.removeItem(storageKey(`script-${index}`));
    localStorage.removeItem(storageKey(`matching-${index}`));
    localStorage.removeItem(storageKey(`matchLines-${index}`));
    localStorage.removeItem(storageKey(`order-${index}`));
    localStorage.removeItem(storageKey(`multi-${index}`));
  });
}

function storageKey(key) {
  return `saa-${lab}-${key}`;
}

function storeGeneric(key, value) {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}

function getGeneric(key) {
  const raw = localStorage.getItem(storageKey(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatCorrectAnswer(activity, correctAnswer) {
  if (activity.type === "dropdown") {
    return escapeHtml(correctAnswer || "");
  }

  if (activity.type === "scriptDropdown") {
    return Object.entries(correctAnswer || {})
      .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`)
      .join("<br>");
  }

  if (activity.type === "matching") {
    return (activity.pairs || [])
      .map(pair => `${escapeHtml(pair.left)} → ${escapeHtml(pair.right)}`)
      .join("<br>");
  }

  if (activity.type === "matchLines") {
    return Object.entries(correctAnswer || {})
      .map(([left, right]) => `${escapeHtml(left)} → ${escapeHtml(right)}`)
      .join("<br>");
  }

  if (activity.type === "order") {
    return (correctAnswer || [])
      .map((item, i) => `${i + 1}. ${escapeHtml(item)}`)
      .join("<br>");
  }

  if (activity.type === "multiSelect") {
    return (correctAnswer || []).map(item => escapeHtml(item)).join("<br>");
  }

  return "";
}

function addPlaceholderOption(select, text) {
  const option = document.createElement("option");
  option.value = "";
  option.textContent = text;
  option.disabled = true;
  option.selected = true;
  select.appendChild(option);
}

function createTextBlock(text) {
  const p = document.createElement("p");
  p.className = "scenarioText";
  p.textContent = text;
  return p;
}

function arraysEqual(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  if (first.length !== second.length) return false;
  return first.every((item, index) => item === second[index]);
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
