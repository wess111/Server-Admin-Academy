function $(sel, root=document){ return root.querySelector(sel); }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function escapeHtml(s){ return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

const params = new URLSearchParams(window.location.search);
const lab = params.get('lab');
let assessment = null;
let attempt = 1;
let lastScore = null;
let lastIncorrect = [];

async function loadAssessment(){
  const res = await fetch(`./data/assessments/${lab}.json`, { cache:'no-store' });
  if(!res.ok) throw new Error('Assessment could not be loaded.');
  assessment = await res.json();
  $('#assessmentTitle').textContent = assessment.title;
  $('#assessmentScenario').textContent = assessment.scenario;
  $('#assessmentDomain').textContent = (assessment.domainLabel || 'Systems Engineering').toUpperCase();
  $('#assessmentDifficulty').textContent = (assessment.difficulty || 'standard').toUpperCase();
  $('#attemptsAllowed').textContent = assessment.attemptsAllowed;
  $('#passScore').textContent = assessment.passScore;
  renderActivities();
}

function renderActivities(){
  const host = $('#activities');
  host.innerHTML = '';
  assessment.activities.forEach((activity, index) => {
    const card = document.createElement('article');
    card.className = 'card activityCard';
    card.dataset.type = activity.type;
    card.dataset.index = index;

    const header = document.createElement('div');
    header.className = 'activityHeader';
    header.innerHTML = `<p class="activityPrompt"><strong>Activity ${index+1}.</strong> ${escapeHtml(activity.prompt)}</p><span class="activityType">${escapeHtml(activity.typeLabel || activity.type)}</span>`;
    card.appendChild(header);

    if(activity.type === 'dropdown'){
      const select = document.createElement('select');
      select.className = 'optionSelect';
      select.innerHTML = `<option value="">Select an answer</option>` + shuffle(activity.options).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
      card.appendChild(select);
    }

    if(activity.type === 'scriptDropdown'){
      const pre = document.createElement('pre');
      pre.className = 'scriptBlock';
      pre.textContent = activity.script;
      card.appendChild(pre);
      const select = document.createElement('select');
      select.className = 'optionSelect';
      select.innerHTML = `<option value="">Select an answer</option>` + shuffle(activity.options).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
      card.appendChild(select);
    }

    if(activity.type === 'matching'){
      const right = shuffle(activity.right);
      activity.left.forEach((leftItem, rowIndex) => {
        const row = document.createElement('div');
        row.className = 'matchRow';
        const label = document.createElement('div');
        label.textContent = leftItem;
        const select = document.createElement('select');
        select.className = 'matchSelect';
        select.dataset.rowIndex = rowIndex;
        select.innerHTML = `<option value="">Select a match</option>` + right.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
        row.append(label, select);
        card.appendChild(row);
      });
    }

    if(activity.type === 'order'){
      const list = document.createElement('div');
      list.className = 'orderList';
      shuffle(activity.steps).forEach(step => {
        const row = document.createElement('div');
        row.className = 'orderItem';
        row.dataset.value = step;
        row.innerHTML = `<span>${escapeHtml(step)}</span><span class="orderControls"><button class="orderBtn" type="button" data-dir="up">▲</button><button class="orderBtn" type="button" data-dir="down">▼</button></span>`;
        list.appendChild(row);
      });
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('.orderBtn');
        if(!btn) return;
        const item = btn.closest('.orderItem');
        const dir = btn.dataset.dir;
        if(dir === 'up' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
        if(dir === 'down' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
      });
      card.appendChild(list);
    }

    if(activity.type === 'multiSelect'){
      const grid = document.createElement('div');
      grid.className = 'checkGrid';
      shuffle(activity.options).forEach(option => {
        const row = document.createElement('label');
        row.className = 'checkRow';
        row.innerHTML = `<input type="checkbox" value="${escapeHtml(option)}"> <span>${escapeHtml(option)}</span>`;
        grid.appendChild(row);
      });
      card.appendChild(grid);
    }

    host.appendChild(card);
  });
}

function gradeActivity(activity, card){
  if(activity.type === 'dropdown' || activity.type === 'scriptDropdown'){
    const value = $('select', card)?.value || '';
    return { correct: value === activity.answer, userAnswer: value || '(no answer)' };
  }
  if(activity.type === 'matching'){
    const picks = [...card.querySelectorAll('select')].map(s => s.value);
    const correct = activity.left.every((_, i) => picks[i] === activity.answers[i]);
    return { correct, userAnswer: picks };
  }
  if(activity.type === 'order'){
    const picks = [...card.querySelectorAll('.orderItem')].map(x => x.dataset.value);
    const correct = JSON.stringify(picks) === JSON.stringify(activity.answer);
    return { correct, userAnswer: picks };
  }
  if(activity.type === 'multiSelect'){
    const picks = [...card.querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value).sort();
    const expected = [...activity.answer].sort();
    const correct = JSON.stringify(picks) === JSON.stringify(expected);
    return { correct, userAnswer: picks };
  }
  return { correct:false, userAnswer:null };
}

function renderAttemptOneReview(incorrectIndexes){
  const listItems = incorrectIndexes.map(i => `<li>Activity ${i+1}: ${escapeHtml(assessment.activities[i].prompt)}</li>`).join('');
  return `<p class="resultBad"><strong>Retry available.</strong> Review the activities below and try again.</p><ul class="inlineList">${listItems}</ul>`;
}

function renderFinalReview(){
  return assessment.activities.map((activity, i) => {
    let answerHtml = '';
    if(activity.type === 'dropdown' || activity.type === 'scriptDropdown'){
      answerHtml = `<div><strong>Correct Answer:</strong> ${escapeHtml(activity.answer)}</div>`;
    }
    if(activity.type === 'matching'){
      answerHtml = `<div><strong>Correct Matches:</strong><ul class="inlineList">${activity.left.map((left, idx)=>`<li>${escapeHtml(left)} → ${escapeHtml(activity.answers[idx])}</li>`).join('')}</ul></div>`;
    }
    if(activity.type === 'order'){
      answerHtml = `<div><strong>Correct Order:</strong><ol class="inlineList">${activity.answer.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></div>`;
    }
    if(activity.type === 'multiSelect'){
      answerHtml = `<div><strong>Required Selections:</strong><ul class="inlineList">${activity.answer.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`;
    }
    const exp = activity.explanation ? `<div><strong>Explanation:</strong> ${escapeHtml(activity.explanation)}</div>` : '';
    return `<div class="reviewItem"><div><strong>Activity ${i+1}.</strong> ${escapeHtml(activity.prompt)}</div>${answerHtml}${exp}</div>`;
  }).join('');
}

function showResults(score, incorrectIndexes){
  const total = assessment.activities.length;
  const percent = Math.round((score / total) * 100);
  const passed = percent >= assessment.passScore;
  const panel = $('#resultsPanel');
  const body = $('#resultsBody');
  panel.hidden = false;

  let html = `
    <p><strong>Score:</strong> ${score} / ${total} (${percent}%)</p>
    <p><strong>Attempt:</strong> ${attempt} of ${assessment.attemptsAllowed}</p>
    <p class="${passed ? 'resultGood' : 'resultBad'}"><strong>Status:</strong> ${passed ? 'Pass' : (attempt < assessment.attemptsAllowed ? 'Retry Available' : 'Final Attempt Complete')}</p>
  `;

  if(!passed && attempt < assessment.attemptsAllowed){
    html += renderAttemptOneReview(incorrectIndexes);
    html += `<div class="reportActions"><button class="btn btnPill" id="retryBtn" type="button">Retry Assessment</button></div>`;
  }

  if(attempt >= assessment.attemptsAllowed){
    html += `<div class="reviewBlock"><h3 class="h2">Answer Review</h3>${renderFinalReview()}</div>`;
  }

  html += `
    <div class="reviewBlock">
      <h3 class="h2">Generate Report</h3>
      <p>Enter the student name, then generate a printable report for Canvas submission.</p>
      <input class="studentInput" id="studentName" type="text" placeholder="Student name" />
      <div class="reportActions">
        <button class="btn btnPill" id="reportBtn" type="button">Generate Report</button>
      </div>
    </div>
  `;

  body.innerHTML = html;
  $('#retryBtn')?.addEventListener('click', () => {
    attempt += 1;
    lastScore = null;
    lastIncorrect = [];
    renderActivities();
    panel.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#reportBtn')?.addEventListener('click', generateReport);
}

function submitAssessment(){
  const cards = [...document.querySelectorAll('.activityCard')];
  let score = 0;
  const incorrectIndexes = [];
  assessment.activities.forEach((activity, i) => {
    const result = gradeActivity(activity, cards[i]);
    cards[i].classList.remove('isCorrect','isIncorrect');
    if(result.correct){
      score += 1;
      cards[i].classList.add('isCorrect');
    } else {
      incorrectIndexes.push(i);
      cards[i].classList.add('isIncorrect');
    }
  });
  lastScore = score;
  lastIncorrect = incorrectIndexes;
  showResults(score, incorrectIndexes);
}

function generateReport(){
  const studentName = ($('#studentName')?.value || '').trim() || 'Student Name Not Provided';
  const total = assessment.activities.length;
  const percent = Math.round((lastScore / total) * 100);
  const status = percent >= assessment.passScore ? 'Pass' : 'Retry Required';
  const reviewVisible = attempt >= assessment.attemptsAllowed;
  const reviewBlock = reviewVisible ? `<h3>Answer Review</h3>${renderFinalReview()}` : '';
  const win = window.open('', '_blank', 'width=900,height=1100');
  win.document.write(`<!doctype html><html><head><title>Assessment Report</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#111}h1,h2,h3{margin-bottom:8px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #999;padding:8px;text-align:left}.meta p{margin:6px 0}ul,ol{margin-top:6px}</style></head><body>`);
  win.document.write(`<h1>Server Admin Academy</h1><h2>Assessment Completion Report</h2><div class="meta"><p><strong>Student:</strong> ${escapeHtml(studentName)}</p><p><strong>Assessment:</strong> ${escapeHtml(assessment.title)}</p><p><strong>Score:</strong> ${lastScore} / ${total} (${percent}%)</p><p><strong>Status:</strong> ${status}</p><p><strong>Attempts Used:</strong> ${attempt}</p><p><strong>Completion Date:</strong> ${new Date().toLocaleString()}</p><p><strong>Assessment ID:</strong> ${escapeHtml(lab || 'assessment')}</p></div>${reviewBlock}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAssessment();
    $('#submitBtn').addEventListener('click', submitAssessment);
  } catch (err) {
    $('#assessmentTitle').textContent = 'Assessment unavailable';
    $('#assessmentScenario').textContent = err.message;
    $('#submitBtn').disabled = true;
  }
});
