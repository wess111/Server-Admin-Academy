const params = new URLSearchParams(window.location.search);
const lab = params.get("lab");

let assessment;
let attempt = 1;
let answers = [];

async function loadAssessment(){

const res = await fetch(`data/assessments/${lab}.json`);
assessment = await res.json();

document.getElementById("title").innerText = assessment.title;
document.getElementById("scenario").innerText = assessment.scenario;

renderActivities();

}

function renderActivities(){

const container = document.getElementById("activities");
container.innerHTML = "";

assessment.activities.forEach((a,i)=>{

const div = document.createElement("div");
div.className="activity";

const q = document.createElement("p");
q.innerText = `${i+1}. ${a.prompt}`;
div.appendChild(q);

if(a.type==="dropdown"){

const select = document.createElement("select");

a.options.forEach(o=>{
const opt=document.createElement("option");
opt.text=o;
opt.value=o;
select.appendChild(opt);
});

select.dataset.index=i;
div.appendChild(select);

}

if(a.type==="matching"){

a.left.forEach((item,j)=>{

const row=document.createElement("div");

const label=document.createElement("span");
label.innerText=item+" ";

const select=document.createElement("select");

a.right.forEach(r=>{
const opt=document.createElement("option");
opt.text=r;
opt.value=r;
select.appendChild(opt);
});

select.dataset.index=i+"-"+j;

row.appendChild(label);
row.appendChild(select);
div.appendChild(row);

});

}

container.appendChild(div);

});

}

function grade(){

let score=0;
const activities=document.querySelectorAll(".activity");

assessment.activities.forEach((a,i)=>{

if(a.type==="dropdown"){

const select=activities[i].querySelector("select");

if(select.value===a.answer){
score++;
activities[i].classList.add("correct");
}else{
activities[i].classList.add("incorrect");
}

}

if(a.type==="matching"){

let correct=true;

const selects=activities[i].querySelectorAll("select");

selects.forEach((s,j)=>{
if(s.value!==a.answers[j]) correct=false;
});

if(correct){
score++;
activities[i].classList.add("correct");
}else{
activities[i].classList.add("incorrect");
}

}

});

return score;

}

function showResults(score){

const results=document.getElementById("results");

const total=assessment.activities.length;
const percent=Math.round(score/total*100);

results.innerHTML=`
<h2>Assessment Results</h2>
<p>Score: ${score} / ${total}</p>
<p>Attempt: ${attempt} of ${assessment.attemptsAllowed}</p>
`;

if(percent>=assessment.passScore){

results.innerHTML+=`<p>Status: PASS</p>`;
showReport(score,total);

}

else{

if(attempt<assessment.attemptsAllowed){

results.innerHTML+=`<button onclick="retry()">Retry</button>`;

}

else{

results.innerHTML+=`<p>Status: FAIL</p>`;
revealAnswers();
showReport(score,total);

}

}

}

function retry(){

attempt++;
renderActivities();
document.getElementById("results").innerHTML="";

}

function revealAnswers(){

const container=document.getElementById("results");

container.innerHTML+="<h3>Correct Answers</h3>";

assessment.activities.forEach((a,i)=>{

if(a.type==="dropdown"){

container.innerHTML+=`<p>${i+1}. ${a.answer}</p>`;

}

});

}

function showReport(score,total){

const container=document.getElementById("results");

container.innerHTML+=`
<h3>Generate Report</h3>

<p>Student Name: <input id="studentName"></p>

<button onclick="generateReport(${score},${total})">Generate</button>
`;

}

function generateReport(score,total){

const name=document.getElementById("studentName").value;

const win=window.open("","report");

win.document.write(`
<h1>Server Admin Academy</h1>
<h2>Assessment Completion Report</h2>

<p>Student: ${name}</p>
<p>Assessment: ${assessment.title}</p>
<p>Score: ${score}/${total}</p>
<p>Attempts Used: ${attempt}</p>
<p>Date: ${new Date().toLocaleString()}</p>
`);

win.print();

}

document.getElementById("submitBtn").onclick=()=>{

const score=grade();
showResults(score);

}

loadAssessment();
