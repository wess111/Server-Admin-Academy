const params = new URLSearchParams(window.location.search);
const lab = params.get("lab");

let assessment = null;
let currentAttempt = 1;
let activityResults = [];
let draggedOrderItem = null;

document.addEventListener("DOMContentLoaded", initAssessment);

async function initAssessment() {
  if (!lab) {
    showFatalMessage("No assessment was specified in the URL.");
    return;
  }

  try {
    const response = await fetch(`./data/assessments/${lab}.json`);
    if (!response.ok) {
      throw new Error("Assessment file could not be loaded.");
    }

    assessment = await response.json();
    renderAssessment();
    bindSubmit();
  } catch (error) {
    showFatalMessage("The assessment could not be loaded. Please verify that the assessment file exists and the link is correct.");
  }
}

function showFatalMessage(message) {
  const titleEl = document.getElementById("assessmentTitle");
  const scenarioEl = document.getElementById("assessmentScenario");
  titleEl.textContent = "Assessment Unavailable";
  scenarioEl.textContent = message;
}

function renderAssessment() {
  document.getElementById("assessmentTitle").textContent = assessment.title;
  document.getElementById("assessmentScenario").textContent = assessment.scenario;
  document.getElementById("attemptMeta").textContent = `${assessment.attemptsAllowed} max`;
  document.getElementById("passMeta").textContent = `${assessment.passScore}%`;

  buildSidebar();
  renderActivities();
}

function buildSidebar() {
  const nav = document.getElementById("assessmentNav");
  nav.innerHTML = "";

  const sections = [
    { id: "scenarioSection", label: "Scenario" },
    ...assessment.activities.map((activity, index) => ({
      id: `activity-${index + 1}`,
      label: `Activity ${index + 1}`
    })),
    { id: "submitSection", label: "Submit" },
    { id: "resultsSection", label: "Results" }
  ];

  sections.forEach((section, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `assessmentNavBtn${index === 0 ? " isActive" : ""}`;
    btn.textContent = section.label;
    btn.dataset.target = section.id;
    btn.addEventListener("click", () => {
      scrollToSection(section.id);
      setActiveNav(section.id);
    });
    nav.appendChild(btn);
  });

  window.addEventListener("scroll", handleScrollSpy, { passive: true });
}

function setActiveNav(sectionId) {
  document.querySelectorAll(".assessmentNavBtn").forEach(btn => {
    btn.classList.toggle("isActive", btn.dataset.target === sectionId);
  });
}

function handleScrollSpy() {
  const sectionIds = [
    "scenarioSection",
    ...assessment.activities.map((_, index) => `activity-${index + 1}`),
    "submitSection",
    "resultsSection"
  ];

  let activeId = "scenarioSection";

  for (const id of sectionIds) {
    const el = document.getElementById(id);
    if (!el || el.hidden) continue;

    const rect = el.getBoundingClientRect();
    if (rect.top <= 140) {
      activeId = id;
    }
  }

  setActiveNav(activeId);
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target || target.hidden) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderActivities() {
  const container = document.getElementById("activitiesContainer");
  container.innerHTML = "";

  assessment.activities.forEach((activity, index) => {
    const card = document.createElement("section");
    card.className = "activityCard";
    card.id = `activity-${index + 1}`;
    card.dataset.activityIndex = index;

    const header = document.createElement("div");
    header.className = "activityHeader";
    header.innerHTML = `
      <p class="activityEyebrow">Activity ${index + 1}</p>
      <h2 class="activityTitle">${escapeHtml(activity.title || `Task ${index + 1}`)}</h2>
    `;

    const body = document.createElement("div");
    body.className = "activityBody";

    const prompt = document.createElement("p");
    prompt.className = "activityPrompt";
    prompt.textContent = activity.prompt;
    body.appendChild(prompt);

    body.appendChild(renderActivityWidget(activity, index));
    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });
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

  wrapper.appendChild(select);
  return wrapper;
}

function renderScriptDropdown(activity, index) {
  const wrapper = document.createElement("div");
  const pre = document.createElement("pre");
  pre.className = "scriptBlock";

  const parts = activity.scriptParts || [];
  if (!parts.length) {
    pre.textContent = activity.script || "";
    wrapper.appendChild(pre);
    return wrapper;
  }

  parts.forEach(part => {
    if (typeof part === "string") {
      pre.appendChild(document.createTextNode(part));
    } else if (part && part.type === "dropdown") {
      const select = document.createElement("select");
      select.className = "inlineSelect";
      select.dataset.activityIndex = index;
      select.dataset.scriptBlankId = part.id || "blank1";

      addPlaceholderOption(select, "Select");

      (part.options || []).forEach(option => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
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

  shuffleArray([...activity.steps]).forEach(step => {
    availableList.appendChild(createOrderItem(step, index));
  });

  availablePanel.appendChild(availableList);

  const controls = document.createElement("div");
  controls.className = "orderControls";
  controls.innerHTML = `
    <button type="button" class="orderControlBtn" title="Move selected right" data-action="right">➜</button>
    <button type="button" class="orderControlBtn" title="Move selected left" data-action="left">⬅</button>
  `;

  const answerPanel = document.createElement("div");
  answerPanel.className = "orderPanel";
  answerPanel.innerHTML = `<h3 class="orderPanelTitle">Answer Area</h3>`;

  const answerList = document.createElement("div");
  answerList.className = "orderList orderDropzone";
  answerList.dataset.zone = "answer";
  answerList.dataset.activityIndex = index;
  setupDropzone(answerList);

  answerPanel.appendChild(answerList);

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
    const siblings = item.parentElement.querySelectorAll(".orderItem");
    siblings.forEach(sib => sib.classList.remove("isSelected"));
    item.classList.add("isSelected");
  });

  item.addEventListener("dragstart", () => {
    draggedOrderItem = item;
    item.classList.add("dragging");
  });

  item.addEventListener("dragend", () => {
    item.classList.remove("dragging");
    draggedOrderItem = null;
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
}

function renderMultiSelect(activity, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "multiGrid";

  activity.options.forEach((option, optionIndex) => {
    const label = document.createElement("label");
    label.className = "multiOption";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.activityIndex = index;
    input.dataset.optionIndex = optionIndex;
    input.value = option;

    const text = document.createElement("span");
    text.textContent = option;

    label.appendChild(input);
    label.appendChild(text);
    wrapper.appendChild(label);
  });

  return wrapper;
}

function bindSubmit() {
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.addEventListener("click", handleSubmit);
}

function handleSubmit() {
  activityResults = assessment.activities.map((activity, index) => evaluateActivity(activity, index));

  const score = activityResults.filter(result => result.correct).length;
  renderResults(score);
  document.getElementById("resultsSection").hidden = false;
  scrollToSection("resultsSection");
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
  const userAnswer = select ? select.value : "";
  const correct = userAnswer === activity.answer;
  markActivityCard(index, correct);
  return {
    correct,
    userAnswer,
    correctAnswer: activity.answer
  };
}

function evaluateScriptDropdown(activity, index) {
  const selects = [...document.querySelectorAll(`select[data-activity-index="${index}"][data-script-blank-id]`)];
  const userAnswerMap = {};
  let correct = true;

  selects.forEach(select => {
    userAnswerMap[select.dataset.scriptBlankId] = select.value;
  });

  const answers = activity.answers || {};
  Object.keys(answers).forEach(key => {
    if (userAnswerMap[key] !== answers[key]) {
      correct = false;
    }
  });

  markActivityCard(index, correct);

  return {
    correct,
    userAnswer: userAnswerMap,
    correctAnswer: answers
  };
}

function evaluateMatching(activity, index) {
  const selects = [...document.querySelectorAll(`select[data-activity-index="${index}"][data-pair-index]`)];
  let correct = true;
  const userAnswer = [];

  selects.forEach(select => {
    const pairIndex = Number(select.dataset.pairIndex);
    const value = select.value;
    userAnswer[pairIndex] = value;
    if (value !== activity.pairs[pairIndex].right) {
      correct = false;
    }
  });

  markActivityCard(index, correct);

  return {
    correct,
    userAnswer,
    correctAnswer: activity.pairs.map(pair => pair.right)
  };
}

function evaluateOrder(activity, index) {
  const answerList = document.querySelector(`.orderLayout[data-activity-index="${index}"] [data-zone="answer"]`);
  const userAnswer = [...answerList.querySelectorAll(".orderItem")].map(item => item.textContent.trim());
  const correct = arraysEqual(userAnswer, activity.answer);

  markActivityCard(index, correct);

  return {
    correct,
    userAnswer,
    correctAnswer: activity.answer
  };
}

function evaluateMultiSelect(activity, index) {
  const checked = [...document.querySelectorAll(`input[data-activity-index="${index}"][type="checkbox"]:checked`)]
    .map(input => input.value);

  const correctAnswer = [...activity.answer].sort();
  const userAnswer = [...checked].sort();
  const correct = arraysEqual(userAnswer, correctAnswer);

  markActivityCard(index, correct);

  return {
    correct,
    userAnswer,
    correctAnswer
  };
}

function markActivityCard(index, correct) {
  const card = document.getElementById(`activity-${index + 1}`);
  if (!card) return;

  card.classList.remove("isCorrect", "isIncorrect");
  card.classList.add(correct ? "isCorrect" : "isIncorrect");
}

function renderResults(score) {
  const total = assessment.activities.length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= assessment.passScore;
  const finalAttempt = currentAttempt >= assessment.attemptsAllowed;
  const resultsContent = document.getElementById("resultsContent");

  resultsContent.innerHTML = "";

  const summary = document.createElement("div");
  summary.className = "resultsSummary";
  summary.innerHTML = `
    <div class="resultsText"><strong>Score:</strong> ${score} / ${total}</div>
    <div class="resultsText"><strong>Percentage:</strong> ${percentage}%</div>
    <div class="resultsText"><strong>Attempt:</strong> ${currentAttempt} of ${assessment.attemptsAllowed}</div>
    <div class="resultsText"><strong>Status:</strong> ${passed ? "Pass" : (finalAttempt ? "Retry Not Available" : "Retry Available")}</div>
  `;
  resultsContent.appendChild(summary);

  const resultList = document.createElement("div");
  resultList.className = "resultList";

  activityResults.forEach((result, index) => {
    const item = document.createElement("div");
    item.className = `resultItem ${result.correct ? "isCorrect" : "isIncorrect"}`;
    item.textContent = `${result.correct ? "✓" : "✗"} Activity ${index + 1} — ${assessment.activities[index].title || `Task ${index + 1}`}`;
    resultList.appendChild(item);
  });

  resultsContent.appendChild(resultList);

  if (!passed && !finalAttempt && assessment.retryEnabled !== false) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "assessmentBtn assessmentBtnSecondary";
    retryBtn.textContent = "Retry Assessment";
    retryBtn.addEventListener("click", handleRetry);
    resultsContent.appendChild(retryBtn);
  }

  if (finalAttempt && assessment.revealAnswersAfterFinalAttempt) {
    resultsContent.appendChild(renderReviewSection());
  }

  if (passed || finalAttempt) {
    resultsContent.appendChild(renderReportSection(score, total, percentage, passed));
  }
}

function renderReviewSection() {
  const wrapper = document.createElement("div");
  wrapper.className = "reviewBlock";
  wrapper.innerHTML = `<h3 class="cardTitle" style="font-size:1.05rem; margin-top:1.2rem;">Answer Review</h3>`;

  const list = document.createElement("div");
  list.className = "reviewList";

  assessment.activities.forEach((activity, index) => {
    const result = activityResults[index];
    const item = document.createElement("div");
    item.className = "reviewItem";

    const title = document.createElement("div");
    title.innerHTML = `<strong>Activity ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)}`;

    const correctAnswer = document.createElement("div");
    correctAnswer.style.marginTop = "0.45rem";
    correctAnswer.innerHTML = `<strong>Correct Answer:</strong> ${formatCorrectAnswer(activity, result.correctAnswer)}`;

    item.appendChild(title);
    item.appendChild(correctAnswer);

    if (activity.explanation) {
      const explanation = document.createElement("div");
      explanation.style.marginTop = "0.45rem";
      explanation.innerHTML = `<strong>Explanation:</strong> ${escapeHtml(activity.explanation)}`;
      item.appendChild(explanation);
    }

    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function renderReportSection(score, total, percentage, passed) {
  const wrapper = document.createElement("div");
  wrapper.className = "reportBox";

  const heading = document.createElement("h3");
  heading.className = "cardTitle";
  heading.style.fontSize = "1.05rem";
  heading.style.margin = "0";
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
  button.addEventListener("click", () => {
    generateReport(score, total, percentage, passed);
  });

  row.appendChild(input);
  row.appendChild(button);

  wrapper.appendChild(heading);
  wrapper.appendChild(text);
  wrapper.appendChild(row);

  return wrapper;
}

function handleRetry() {
  currentAttempt += 1;
  activityResults = [];
  document.getElementById("resultsContent").innerHTML = "";
  document.getElementById("resultsSection").hidden = true;

  renderActivities();

  document.querySelectorAll(".activityCard").forEach(card => {
    card.classList.remove("isCorrect", "isIncorrect");
  });

  scrollToSection("scenarioSection");
}

function generateReport(score, total, percentage, passed) {
  const studentName = document.getElementById("studentName")?.value.trim() || "Not Provided";
  const reportWindow = window.open("", "_blank", "width=900,height=800");

  if (!reportWindow) return;

  const attemptId = `SAA-${Date.now()}`;

  reportWindow.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Assessment Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #111827;
          line-height: 1.55;
        }
        h1, h2 {
          margin-bottom: 0.35rem;
        }
        .meta {
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .meta p {
          margin: 0.35rem 0;
        }
        .section {
          margin-top: 1.5rem;
        }
        .row {
          margin-bottom: 0.55rem;
        }
        .status-pass {
          color: #166534;
          font-weight: 700;
        }
        .status-fail {
          color: #991b1b;
          font-weight: 700;
        }
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
        <p><strong>Status:</strong> <span class="${passed ? "status-pass" : "status-fail"}">${passed ? "Pass" : "Retry Required / Final Attempt Used"}</span></p>
        <p><strong>Attempts Used:</strong> ${currentAttempt}</p>
        <p><strong>Completion Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Assessment ID:</strong> ${attemptId}</p>
      </div>

      <div class="section">
        <h3>Activity Results</h3>
        ${assessment.activities.map((activity, index) => {
          const result = activityResults[index];
          return `
            <div class="row">
              <strong>Activity ${index + 1}:</strong> ${escapeHtml(activity.title || `Task ${index + 1}`)} —
              ${result.correct ? "Correct" : "Incorrect"}
            </div>
          `;
        }).join("")}
      </div>

      <script>
        window.onload = function () { window.print(); };
      </script>
    </body>
    </html>
  `);

  reportWindow.document.close();
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

  if (activity.type === "order") {
    return (correctAnswer || [])
      .map((item, index) => `${index + 1}. ${escapeHtml(item)}`)
      .join("<br>");
  }

  if (activity.type === "multiSelect") {
    return (correctAnswer || []).map(item => escapeHtml(item)).join("<br>");
  }

  return "";
}

function addPlaceholderOption(select, text) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = text;
  placeholder.selected = true;
  placeholder.disabled = true;
  select.appendChild(placeholder);
}

function createTextBlock(text) {
  const div = document.createElement("div");
  div.className = "resultsText";
  div.textContent = text;
  return div;
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
