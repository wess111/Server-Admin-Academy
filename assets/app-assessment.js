const params = new URLSearchParams(window.location.search);
const lab = params.get("lab");

let assessment;
let attempt = 1;

async function loadAssessment(){

const res = await fetch(`data/assessments/${lab}.json`);
assessment = await res.json();

document.getElementById("title").innerText = assessment.title;
document.getElementById("scenario").innerText = assessment.scenario;

renderActivities();

}

function renderActivities(){

const container=document.getElementById("activities");
container.innerHTML="";

assessment.activities.forEach((a,i)=>{

const block=document.createElement("div");
block.className="activity";

const prompt=document.createElement("p");
prompt.innerText=(i+1)+". "+a.prompt;
block.appendChild(prompt);

if(a.type==="dropdown"){

const select=document.createElement("select");

a.options.forEach(o=>{
const opt=document.createElement("option");
opt.value=o;
opt.text=o;
select.appendChild(opt);
});

select.dataset.index=i;
block.appendChild(select);

}

if(a.type==="scriptDropdown"){

const code=document.createElement("pre");
code.innerText=a.script;
block.appendChild(code);

const select=document.createElement("select");

a.options.forEach(o=>{
const opt=document.createElement("option");
opt.value=o;
opt.text=o;
select.appendChild(opt);
});

select.dataset.index=i;
block.appendChild(select);

}

if(a.type==="matching"){

a.left.forEach((item,j)=>{

const row=document.createElement("div");

const label=document.createElement("span");
label.innerText=item+" ";

const select=document.createElement("select");

a.right.forEach(r=>{
const opt=document.createElement("option");
opt.value=r;
opt.text=r;
select.appendChild(opt);
});

select.dataset.index=i+"-"+j;

row.appendChild(label);
row.appendChild(select);

block.appendChild(row);

});

}

if(a.type==="order"){

const list=document.createElement("ul");
list.id="order-"+i;

a.steps.forEach(step=>{

const li=document.createElement("li");
li.textContent=step;
li.draggable=true;

li.ondragstart=e=>{
e.dataTransfer.setData("text",step);
};

list.appendChild(li);

});

list.ondragover=e=>e.preventDefault();

list.ondrop=e=>{
e.preventDefault();
const text=e.dataTransfer.getData("text");
const item=[...list.children].find(x=>x.textContent===text);
list.appendChild(item);
};

block.appendChild(list);

}

container.appendChild(block);

});

}

function grade(){

let score=0;

assessment.activities.forEach((a,i)=>{

const block=document.querySelectorAll(".activity")[i];

if(a.type==="dropdown" || a.type==="scriptDropdown"){

const select=block.querySelector("select");

if(select.value===a.answer){
score++;
block.classList.add("correct");
}else{
block.classList.add("incorrect");
}

}

if(a.type==="matching"){

let correct=true;
const selects=block.querySelectorAll("select");

selects.forEach((s,j)=>{
if(s.value!==a.answers[j]) correct=false;
});

if(correct){
score++;
block.classList.add("correct");
}else{
block.classList.add("incorrect");
}

}

if(a.type==="order"){

const items=[...block.querySelectorAll("li")].map(li=>li.textContent);

if(JSON.stringify(items)===JSON.stringify(a.answer)){
score++;
block.classList.add("correct");
}else{
block.classList.add("incorrect");
}

}

});

return score;

}

function showResults(score){

const total=assessment.activities.length;
const percent=Math.round(score/total*100);

const results=document.getElementById("results");

results.innerHTML=`
<h2>Assessment Results</h2>
<p>Score: ${score}/${total}</p>
<p>Attempt ${attempt} of ${assessment.attemptsAllowed}</p>
`;

if(percent>=assessment.passScore){

results.innerHTML+=`<p>Status: PASS</p>`;
report(score,total);

}

else{

if(attempt<assessment.attemptsAllowed){

results.innerHTML+=`<button onclick="retry()">Retry</button>`;

}else{

results.innerHTML+=`<p>Status: FAIL</p>`;
revealAnswers();
report(score,total);

}

}

}

function retry(){

attempt++;
renderActivities();
document.getElementById("results").innerHTML="";

}

function revealAnswers(){

const r=document.getElementById("results");

r.innerHTML+="<h3>Correct Answers</h3>";

assessment.activities.forEach((a,i)=>{

if(a.answer){
r.innerHTML+=`<p>${i+1}. ${a.answer}</p>`;
}

});

}

function report(score,total){

const r=document.getElementById("results");

r.innerHTML+=`
<h3>Generate Report</h3>

<p>Student Name <input id="studentName"></p>

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
