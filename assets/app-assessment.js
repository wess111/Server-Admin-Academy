const params = new URLSearchParams(window.location.search);
const lab = params.get("lab");

let assessment = null;
let currentAttempt = 1;
let currentStep = 0;
let draggedOrderItem = null;
let activityResults = [];

document.addEventListener("DOMContentLoaded", initAssessment);

async function initAssessment() {
  if (!lab) {
    renderFatal("No assessment was specified in the URL.");
    return;
  }

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
    { type: "scenario", label: "Scenario" },
    ...assessment.activities.map((activity, index) => ({
      type: "activity",
      label: `Activity ${index + 1}`,
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

    if (step.type === "results") {
      btn.disabled = true;
    }

    btn.addEventListener("click", () => {
      if (step.type === "results" && currentStep !== assessment._steps.length - 1) return;
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
      currentStep -= 1;
      renderCurrentStep();
    }
  });

  document.getElementById("nextBtn").addEventListener("click", handleNext);
}

function handleNext() {
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
    workspaceEyebrow.textContent = "Scenario";
    workspaceTitle.textContent = "Assessment Context";
    renderScenarioStep(workspaceContent);
    prevBtn.disabled = true;
    nextBtn.disabled = false;
    nextBtn.textContent = "Next";
  }

  if (step.type === "activity") {
    const activity = assessment.activities[step.activityIndex];
    workspaceEyebrow.textContent = `Activity ${step.activityIndex + 1}`;
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

  restoreDropdownValue(select, index);
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

      restoreScriptDropdownValue(select, index, part.id);
      pre.appendChild(select);
    }
  });

  wrapper.appendChild(pre);
  return wrapper;
}

function renderMatching(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "matchGrid";

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

    restoreMatchingValue(select, index, pairIndex);

    row.appendChild(left);
    row.appendChild(select);
    wrapper.appendChild(row);
  });

  return wrapper;
}

function renderOrder(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "orderLayout";
  wrapper.dataset.activityIndex = index;

  const availablePanel = document.createElement("div");
  availablePanel.className = "orderPanel";
  availablePanel.innerHTML = `<h3 class="orderPanelTitle">Actions</h3>`;

  const availableList = document.createElement("div");
  availableList.className = "orderList orderDropzone";
  availableList.dataset.zone = "available";
  availableList.dataset.activityIndex = index;
  setupDropzone(availableList);

  const answerPanel = document.createElement("div");
  answerPanel.className = "orderPanel";
  answerPanel.innerHTML = `<h3 class="orderPanelTitle">Answer Area</h3>`;

  const answerList = document.createElement("div");
  answerList.className = "orderList orderDropzone";
  answerList.dataset.zone = "answer";
  answerList.dataset.activityIndex = index;
  setupDropzone(answerList);

  const restored = getStoredOrderState(index);
  const answerItems = restored.length ? restored : [];
  const availableItems = restored.length
    ? activity.steps.filter(step => !answerItems.includes(step))
    : shuffleArray([...activity.steps]);

  availableItems.forEach(step => availableList.appendChild(createOrderItem(step, index)));
  answerItems.forEach(step => answerList.appendChild(createOrderItem(step, index)));

  availablePanel.appendChild(availableList);
  answerPanel.appendChild(answerList);

  const controls = document.createElement("div");
  controls.className = "orderControls";
  controls.innerHTML = `
    <button type="button" class="orderControlBtn" title="Move selected right" data-action="right">➜</button>
    <button type="button" class="orderControlBtn" title="Move selected left" data-action="left">⬅</button>
  `;

  controls.querySelectorAll(".orderControlBtn").forEach(btn => {
    btn.addEventListener("click", () => handleOrderControl(btn.dataset.action, index));
  });

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
    scope.querySelectorAll(".orderItem").forEach(sib => sib.classList.remove("isSelected"));
    item.classList.add("isSelected");
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

function handleOrderControl(direction, activityIndex) {
  const wrapper = document.querySelector(`.orderLayout[data-activity-index="${activityIndex}"]`);
  if (!wrapper) return;

  const available = wrapper.querySelector('[data-zone="available"]');
  const answer = wrapper.querySelector('[data-zone="answer"]');
  const selected = wrapper.querySelector(".orderItem.isSelected");
  if (!selected) return;

  if (direction === "right" && selected.parentElement === available) {
    answer.appendChild(selected);
    selected.classList.remove("isSelected");
  }

  if (direction === "left" && selected.parentElement === answer) {
    available.appendChild(selected);
    selected.classList.remove("isSelected");
  }

  persistOrderState(activityIndex);
}

function renderMultiSelect(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "multiGrid";
  const restored = getStoredMultiSelectState(index);

  activity.options.forEach((option, optionIndex) => {
    const label = document.createElement("label");
    label.className = "multiOption";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.activityIndex = index;
    input.dataset.optionIndex = optionIndex;
    input.value = option;
    input.checked = restored.includes(option);

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
      <strong>Activity ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)}
      <div style="margin-top:0.45rem; color:#94a3b8;">${escapeHtml(activity.prompt)}</div>
    `;
    list.appendChild(item);
  });

  container.appendChild(list);
}

function handleSubmitAssessment() {
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
    item.textContent = `${result.correct ? "✓" : "✗"} Activity ${index + 1} — ${assessment.activities[index].title || `Task ${index + 1}`}`;
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
      <strong>Activity ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)}
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
        <h3>Activity Results</h3>
        ${assessment.activities.map((activity, index) => `
          <div class="row">
            <strong>Activity ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)} — ${activityResults[index].correct ? "Correct" : "Incorrect"}
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
    case "order":
      return evaluateOrder(activity, index);
    case "multiSelect":
      return evaluateMultiSelect(activity, index);
    default:
      return { correct: false, userAnswer: null, correctAnswer: null };
  }
}

function evaluateDropdown(activity, index) {
  const select = document.querySelector(`select[data-activity-index="${index}"]`);
  const userAnswer = select ? select.value : getStoredDropdownValue(index);
  return {
    correct: userAnswer === activity.answer,
    userAnswer,
    correctAnswer: activity.answer
  };
}

function evaluateScriptDropdown(activity, index) {
  const selects = [...document.querySelectorAll(`select[data-activity-index="${index}"][data-script-blank-id]`)];
  const answerMap = {};
  let correct = true;

  if (selects.length) {
    selects.forEach(select => {
      answerMap[select.dataset.scriptBlankId] = select.value;
    });
    storeScriptDropdownState(index, answerMap);
  } else {
    Object.assign(answerMap, getStoredScriptDropdownState(index));
  }

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
  const selects = [...document.querySelectorAll(`select[data-activity-index="${index}"][data-pair-index]`)];
  const userAnswer = [];
  let correct = true;

  if (selects.length) {
    selects.forEach(select => {
      const pairIndex = Number(select.dataset.pairIndex);
      userAnswer[pairIndex] = select.value;
    });
    storeMatchingState(index, userAnswer);
  } else {
    userAnswer.push(...getStoredMatchingState(index));
  }

  activity.pairs.forEach((pair, pairIndex) => {
    if (userAnswer[pairIndex] !== pair.right) correct = false;
  });

  return {
    correct,
    userAnswer,
    correctAnswer: activity.pairs.map(pair => pair.right)
  };
}

function evaluateOrder(activity, index) {
  const answerList = document.querySelector(`.orderLayout[data-activity-index="${index}"] [data-zone="answer"]`);
  const userAnswer = answerList
    ? [...answerList.querySelectorAll(".orderItem")].map(item => item.textContent.trim())
    : getStoredOrderState(index);

  if (answerList) persistOrderState(index);

  return {
    correct: arraysEqual(userAnswer, activity.answer),
    userAnswer,
    correctAnswer: activity.answer
  };
}

function evaluateMultiSelect(activity, index) {
  const checked = [...document.querySelectorAll(`input[data-activity-index="${index}"][type="checkbox"]:checked`)]
    .map(input => input.value);

  const userAnswer = checked.length ? checked : getStoredMultiSelectState(index);
  const correctAnswer = [...activity.answer].sort();

  if (checked.length) storeMultiSelectState(index, userAnswer);

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

function restoreDropdownValue(select, index) {
  const stored = getStoredDropdownValue(index);
  if (stored) select.value = stored;
  select.addEventListener("change", () => storeGeneric(`dropdown-${index}`, select.value));
}

function restoreScriptDropdownValue(select, index, blankId) {
  const stored = getStoredScriptDropdownState(index);
  if (stored[blankId]) select.value = stored[blankId];

  select.addEventListener("change", () => {
    const current = getStoredScriptDropdownState(index);
    current[blankId] = select.value;
    storeScriptDropdownState(index, current);
  });
}

function restoreMatchingValue(select, index, pairIndex) {
  const stored = getStoredMatchingState(index);
  if (stored[pairIndex]) select.value = stored[pairIndex];

  select.addEventListener("change", () => {
    const current = getStoredMatchingState(index);
    current[pairIndex] = select.value;
    storeMatchingState(index, current);
  });
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

function renderAnswerPreview(value) {
  return escapeHtml(String(value || ""));
}

function formatCorrectAnswer(activity, correctAnswer) {
  if (activity.type === "dropdown") {
    return renderAnswerPreview(correctAnswer);
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
