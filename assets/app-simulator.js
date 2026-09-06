(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const scenarioId = qs.get("id") || "pc-hardware";
  const categoryLabels = {motherboard:"Motherboards",cpu:"Processors",paste:"Thermal Compound",cooler:"CPU Coolers",ram:"Memory",storage:"Storage",gpu:"Graphics",psu:"Power Supplies",casefan:"Case Cooling"};
  const categoryIcons = {motherboard:"MB",cpu:"CPU",paste:"TIM",cooler:"FAN",ram:"RAM",storage:"SSD",gpu:"GPU",psu:"PSU",casefan:"FAN"};
  const slotTypes = ["motherboard","cpu","paste","cooler","ram","storage","gpu","psu","casefan"];

  let scenario = null;
  let catalog = [];
  let attemptCounter = 0;
  const storageKey = `saa-simulator-${scenarioId}`;
  const state = {
    active:false,
    selectedId:null,
    installed:Object.fromEntries(slotTypes.map(k=>[k,null])),
    ramSlots:{A1:null,A2:null,B1:null,B2:null},
    cables:{atx:false,eps:false,gpu:false,cpuFan:false},
    powered:false,
    post:null,
    validated:false,
    validationSnapshot:null,
    diagnostics:0,
    changes:0
  };

  function todayValue(){const d=new Date();const off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)}
  function money(n){return `$${Number(n||0).toFixed(0)}`}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
  function comp(id){return catalog.find(x=>x.id===id)||null}
  function installed(type){return comp(state.installed[type])}
  function setConsole(message,code="INFO"){$("#consoleMessage").textContent=message;$("#consoleCode").textContent=code}
  function installedRams(){return Object.entries(state.ramSlots).map(([slot,id])=>({slot,component:comp(id)})).filter(x=>x.component)}
  function totalMemoryGB(){return installedRams().reduce((sum,x)=>sum+(x.component.capacityGB||0),0)}
  function memoryMode(){
    const used=installedRams().map(x=>x.slot);
    const hasA=used.some(x=>x[0]==="A"), hasB=used.some(x=>x[0]==="B");
    return used.length>=2&&hasA&&hasB?"Dual Channel":used.length?"Single Channel":"None";
  }
  function totalCost(){return slotTypes.filter(t=>t!=="ram").reduce((sum,t)=>sum+(installed(t)?.price||0),0)+installedRams().reduce((sum,x)=>sum+(x.component.price||0),0)}
  function installedCount(){return slotTypes.filter(t=>t!=="ram"&&state.installed[t]).length+installedRams().length}
  function resetRunState(){state.selectedId=null;slotTypes.forEach(t=>state.installed[t]=null);Object.keys(state.ramSlots).forEach(k=>state.ramSlots[k]=null);state.cables={atx:false,eps:false,gpu:false,cpuFan:false};state.powered=false;state.post=null;state.validated=false;state.validationSnapshot=null;state.diagnostics=0;state.changes=0}

  function compatibilityIssues(){
    const issues=[]; const mb=installed("motherboard"), cpu=installed("cpu"), cooler=installed("cooler"), rams=installedRams(), gpu=installed("gpu"), psu=installed("psu");
    if(mb&&cpu&&mb.socket!==cpu.socket) issues.push(`CPU socket ${cpu.socket} does not match motherboard socket ${mb.socket}`);
    if(mb)rams.forEach(({slot,component:ram})=>{if(mb.memoryType!==ram.memoryType)issues.push(`${ram.memoryType} memory in DIMM ${slot} is incompatible with a ${mb.memoryType} motherboard`)});
    if(cpu&&cooler&&!(cooler.sockets||[]).includes(cpu.socket)) issues.push(`CPU cooler does not support ${cpu.socket}`);
    if(gpu&&gpu.requiresPower&&psu&&!psu.hasGpuPower) issues.push("Power supply does not provide the required GPU power connector");
    return issues;
  }

  function requiredWattage(){const gpu=installed("gpu");return 250+(gpu?.wattage||0)}
  function assemblyIssues(){
    const issues=[];
    ["motherboard","cpu","paste","cooler","storage","psu","casefan"].forEach(t=>{if(!state.installed[t])issues.push(`${categoryLabels[t]} not installed`)});
    if(!installedRams().length)issues.push("Memory not installed");
    if(!state.cables.atx)issues.push("24-pin ATX power disconnected");
    if(!state.cables.eps)issues.push("8-pin EPS CPU power disconnected");
    if(!state.cables.cpuFan)issues.push("CPU_FAN header disconnected");
    const gpu=installed("gpu"); if(gpu?.requiresPower&&!state.cables.gpu)issues.push("GPU power disconnected");
    return issues;
  }

  function postBlockingIssues(){
    const issues=[];const mb=installed("motherboard"),cpu=installed("cpu"),rams=installedRams(),psu=installed("psu"),gpu=installed("gpu"),cooler=installed("cooler");
    if(!mb)issues.push("motherboard missing"); if(!cpu)issues.push("CPU missing"); if(!rams.length)issues.push("memory missing"); if(!psu)issues.push("power supply missing");
    issues.push(...compatibilityIssues());
    if(mb&&!state.cables.atx)issues.push("24-pin ATX power disconnected"); if(cpu&&!state.cables.eps)issues.push("8-pin EPS CPU power disconnected");
    if(cpu&&!state.installed.paste)issues.push("thermal compound missing"); if(cpu&&!cooler)issues.push("CPU cooler missing"); if(cooler&&!state.cables.cpuFan)issues.push("CPU_FAN disconnected");
    if(psu&&psu.wattage<requiredWattage())issues.push(`power supply capacity is below the estimated ${requiredWattage()} W requirement`);
    const videoAvailable=(cpu?.integratedGraphics&&mb?.displayOutputs>0)||!!gpu; if(!videoAvailable)issues.push("no graphics output available");
    if(gpu?.requiresPower&&!state.cables.gpu)issues.push("GPU power disconnected");
    return [...new Set(issues)];
  }

  function requirementResults(){
    if(!scenario)return[];
    const r=scenario.requirements, mb=installed("motherboard"),cpu=installed("cpu"),rams=installedRams(),storage=installed("storage"),gpu=installed("gpu"),psu=installed("psu");
    const ramGB=totalMemoryGB();
    const videoOutputs=gpu?.displayOutputs || ((cpu?.integratedGraphics&&mb)?mb.displayOutputs:0);
    const compat=compatibilityIssues();
    const assemblySafe=!!mb&&!!cpu&&!!state.installed.paste&&!!installed("cooler")&&rams.length>0&&!!storage&&!!psu&&!!installed("casefan")&&state.cables.atx&&state.cables.eps&&state.cables.cpuFan&&(!gpu?.requiresPower||state.cables.gpu)&&(!psu||psu.wattage>=requiredWattage());
    return [
      {key:"memory",label:`Memory: at least ${r.memoryGB} GB`,detail:rams.length?`${ramGB} GB installed • ${memoryMode()} • ${rams.map(x=>x.slot).join(", ")}`:"No memory installed",pass:ramGB>=r.memoryGB},
      {key:"storage",label:`Storage: at least ${r.storageGB>=1000?r.storageGB/1000+" TB":r.storageGB+" GB"} SSD`,detail:storage?`${storage.name} installed`:"No storage installed",pass:!!storage&&storage.capacityGB>=r.storageGB&&storage.storageType===r.storageType},
      {key:"display",label:`Display support: ${r.displayOutputs} outputs`,detail:`${videoOutputs||0} usable display output(s)`,pass:videoOutputs>=r.displayOutputs},
      {key:"budget",label:`Budget: ${money(r.budget)} maximum`,detail:`Current component cost: ${money(totalCost())}`,pass:totalCost()>0&&totalCost()<=r.budget},
      {key:"compat",label:"Hardware compatibility",detail:compat.length?compat[0]:"Installed platform components are compatible",pass:compat.length===0&&!!mb&&!!cpu&&!!ram&&!!installed("cooler")},
      {key:"assembly",label:"Complete and safe assembly",detail:assemblySafe?"Required hardware, cooling, and power connections complete":"Build or required connections are incomplete",pass:assemblySafe},
      {key:"post",label:"Successful POST",detail:state.post===true?"POST completed successfully":state.post===false?"POST failed":"POST not yet tested",pass:state.post===true}
    ];
  }

  function buildComplete(){const results=requirementResults();return state.validated&&results.length>0&&results.every(x=>x.pass)}
  function canInstall(type){
    if(!state.active)return"Start an attempt before installing components.";
    if(type!=="motherboard"&&!installed("motherboard"))return"Install a motherboard before adding components to the board or case.";
    if(type==="paste"&&!installed("cpu"))return"Thermal compound is applied only after the CPU is seated.";
    if(type==="cooler"&&!installed("cpu"))return"Install the CPU before installing its cooler.";
    if(type==="cooler"&&!installed("paste"))return"Apply thermal compound before mounting the CPU cooler.";
    return null;
  }

  function populateCategories(){
    const categories=[...new Set(catalog.map(c=>c.type))];
    $("#componentCategory").innerHTML=categories.map(t=>`<option value="${esc(t)}">${esc(categoryLabels[t]||t)}</option>`).join("");
    renderInventory();
  }
  function renderInventory(){
    const type=$("#componentCategory").value||catalog[0]?.type; const items=catalog.filter(c=>c.type===type);
    $("#inventoryCount").textContent=`${items.length} option${items.length===1?"":"s"}`;
    $("#inventoryList").innerHTML=items.map(c=>{
      const isInstalled=state.installed[c.type]===c.id; const selected=state.selectedId===c.id;
      return `<button class="simPart ${selected?"isSelected":""} ${isInstalled?"isInstalled":""}" data-component="${esc(c.id)}" type="button" ${!state.active?"disabled":""}><span class="simPartIcon">${esc(categoryIcons[c.type]||"PC")}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.detail)}</small></span><span class="simPartPrice">${money(c.price)}</span></button>`
    }).join("");
    $$(".simPart").forEach(btn=>btn.addEventListener("click",()=>{state.selectedId=btn.dataset.component;const c=comp(state.selectedId);$("#selectedPart").textContent=c.name;$("#selectedPartHelp").textContent=`${c.detail} • ${money(c.price)}. Click the ${categoryLabels[c.type].toLowerCase()} installation area.`;setConsole(`${c.name} selected. Install it in the correct workbench location.`,"SELECT");renderInventory()}));
  }

  function updateSlot(type){
    const c=installed(type); const el=$("#state-"+type); if(!el)return;
    if(type==="paste")el.textContent=c?"Applied":"Not applied"; else if(type==="gpu")el.textContent=c?c.name:"Optional"; else el.textContent=c?c.name:"Empty";
    const slot=$(`[data-slot="${type}"]`); if(slot){slot.classList.toggle("isInstalled",!!c);slot.classList.remove("isIncompatible")}
  }

  function render(){
    slotTypes.forEach(updateSlot);
    const results=requirementResults(), passed=results.filter(x=>x.pass).length, pct=results.length?Math.round(passed/results.length*100):0;
    $("#attemptNumber").textContent=attemptCounter; $("#installedStatus").textContent=installedCount(); $("#costStatus").textContent=money(totalCost()); $("#powerStatus").textContent=state.powered?"ON":"OFF"; $("#postStatus").textContent=state.post===true?"PASS":state.post===false?"FAIL":"—"; $("#requirementsStatus").textContent=`${passed}/${results.length}`; $("#progressPercent").textContent=`${pct}%`; $("#progressBar").style.width=`${pct}%`;
    $("#checklist").innerHTML=results.map(x=>`<div class="simCheck ${x.pass?"done":state.validated?"fail":""}"><span class="simCheckIcon">${x.pass?"✓":state.validated?"!":""}</span><span><strong>${esc(x.label)}</strong><small>${esc(x.detail)}</small></span></div>`).join("");
    const active=state.active; ["resetBtn","powerBtn","diagnoseBtn","inspectBtn","validateBtn"].forEach(id=>$("#"+id).disabled=!active);
    const gpu=installed("gpu"); $("#cableAtx").disabled=!active||!installed("psu")||!installed("motherboard"); $("#cableEps").disabled=!active||!installed("psu")||!installed("cpu"); $("#cableCpuFan").disabled=!active||!installed("cooler"); $("#cableGpu").disabled=!active||!installed("psu")||!gpu||!gpu.requiresPower;
    $("#cableAtx").checked=state.cables.atx; $("#cableEps").checked=state.cables.eps; $("#cableCpuFan").checked=state.cables.cpuFan; $("#cableGpu").checked=state.cables.gpu;
    $("#completionBox").hidden=!buildComplete(); $("#startAttemptBtn").textContent=attemptCounter?"Start New Attempt":"Start Attempt";
    renderRamSlots();
    renderInventory();
  }

  function installSelected(target){
    if(!state.active){setConsole("Start an attempt before using the workbench.","WAIT");return}
    const current=installed(target);
    if(current){state.installed[target]=null;if(target==="motherboard"){["cpu","paste","cooler","ram","storage","gpu"].forEach(t=>state.installed[t]=null);Object.keys(state.ramSlots).forEach(k=>state.ramSlots[k]=null);state.cables={atx:false,eps:false,gpu:false,cpuFan:false}}if(target==="cpu"){state.installed.paste=null;state.installed.cooler=null;state.cables.eps=false;state.cables.cpuFan=false}if(target==="cooler")state.cables.cpuFan=false;if(target==="gpu")state.cables.gpu=false;if(target==="psu")state.cables={...state.cables,atx:false,eps:false,gpu:false};state.powered=false;state.post=null;state.validated=false;state.changes++;setConsole(`${current.name} removed from the build.`,"REMOVE");render();return}
    if(!state.selectedId){setConsole(`Choose a ${categoryLabels[target].toLowerCase()} option from the component catalog first.`,"WAIT");return}
    const c=comp(state.selectedId); if(c.type!==target){setConsole(`${c.name} cannot be installed in the ${categoryLabels[target].toLowerCase()} area.`,"INVALID");return}
    const block=canInstall(target);if(block){setConsole(block,"ORDER");return}
    state.installed[target]=c.id;state.selectedId=null;state.powered=false;state.post=null;state.validated=false;state.changes++;setConsole(`${c.name} installed. Compatibility will be evaluated as part of build validation.`,"INSTALL");render();
  }

  function renderRamSlots(){
    Object.keys(state.ramSlots).forEach(slot=>{
      const c=comp(state.ramSlots[slot]);
      const el=document.querySelector(`[data-ram-slot="${slot}"]`);
      const label=document.getElementById(`state-ram-${slot}`);
      if(el)el.classList.toggle("isInstalled",!!c);
      if(label)label.textContent=c?`${c.capacityGB} GB ${c.memoryType}`:"Empty";
    });
  }

  function installRam(slot){
    if(!state.active){setConsole("Start an attempt before using the workbench.","WAIT");return}
    const current=comp(state.ramSlots[slot]);
    if(current){state.ramSlots[slot]=null;state.powered=false;state.post=null;state.validated=false;state.changes++;setConsole(`${current.name} removed from DIMM ${slot}. Memory mode is now ${memoryMode()}.`,"REMOVE");render();return}
    if(!state.selectedId){setConsole(`Choose a memory module from the component catalog, then select DIMM ${slot}.`,"WAIT");return}
    const c=comp(state.selectedId);
    if(c.type!=="ram"){setConsole(`${c.name} cannot be installed in DIMM ${slot}. Select a memory module.`,"INVALID");return}
    if(!installed("motherboard")){setConsole("Install a motherboard before adding memory.","ORDER");return}
    state.ramSlots[slot]=c.id;state.selectedId=null;state.powered=false;state.post=null;state.validated=false;state.changes++;
    setConsole(`${c.name} installed in DIMM ${slot}. Total memory: ${totalMemoryGB()} GB • ${memoryMode()}.`,"INSTALL");render();
  }

  function saveRecord(){try{localStorage.setItem(storageKey,JSON.stringify({attemptCounter,technician:$("#technicianName").value.trim(),date:$("#activityDate").value}))}catch(e){}}
  function loadRecord(){try{const raw=localStorage.getItem(storageKey);if(!raw)return;const saved=JSON.parse(raw);attemptCounter=Number(saved.attemptCounter)||0;if(saved.technician)$("#technicianName").value=saved.technician;if(saved.date)$("#activityDate").value=saved.date}catch(e){}}

  function startAttempt(){
    const name=$("#technicianName").value.trim(); if(!name){setConsole("Enter the technician name before starting an attempt.","IDENTITY");$("#technicianName").focus();return}
    if(!$("#activityDate").value)$("#activityDate").value=todayValue();
    attemptCounter++;resetRunState();state.active=true;saveRecord();setConsole(`Attempt ${attemptCounter} started for ${name}. Review the scenario requirements and select your first component.`,"ATTEMPT");render();
  }

  function validate(){state.validated=true;const results=requirementResults(), failed=results.filter(x=>!x.pass);state.validationSnapshot=results;if(!failed.length){setConsole("VALIDATION PASSED. The workstation meets all business requirements and is ready for the completion report.","COMPLETE")}else{setConsole(`Validation found ${failed.length} unmet requirement${failed.length===1?"":"s"}: ${failed.slice(0,2).map(x=>x.label).join("; ")}${failed.length>2?`; plus ${failed.length-2} more`:""}.`,"VALIDATE")}render()}

  function generateReport(){
    if(!buildComplete())return;
    const name=$("#technicianName").value.trim(), date=$("#activityDate").value, results=requirementResults(), components=[...slotTypes.filter(t=>t!=="ram").map(t=>installed(t)).filter(Boolean),...installedRams().map(x=>({...x.component,name:`${x.component.name} (DIMM ${x.slot})`}))], id=`SAA-SIM-${Date.now()}`;
    const rows=components.map(c=>`<tr><td>${esc(categoryLabels[c.type])}</td><td>${esc(c.name)}</td><td>${esc(c.detail)}</td><td>${money(c.price)}</td></tr>`).join("");
    const reqRows=results.map(r=>`<tr><td>${esc(r.label)}</td><td>${esc(r.detail)}</td><td class="pass">PASS</td></tr>`).join("");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(scenario.title)} — Completion Report</title><style>body{font-family:Arial,sans-serif;color:#171923;margin:36px;line-height:1.45}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin-top:26px;border-bottom:1px solid #ccd;padding-bottom:6px}.sub{color:#555;margin-bottom:22px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;padding:14px;background:#f5f5fa;border:1px solid #ddd;border-radius:8px}.meta p{margin:0}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #d7d7df;padding:7px;text-align:left;vertical-align:top}th{background:#f2f2f7}.pass{font-weight:bold}.story{padding:12px 14px;border-left:4px solid #7651c9;background:#f8f7fc}.footer{margin-top:28px;font-size:11px;color:#666}@media print{body{margin:18mm}}</style></head><body><h1>PC Hardware Simulation Completion Report</h1><div class="sub">Server Admin Academy • Support Operations</div><div class="meta"><p><b>Technician:</b> ${esc(name)}</p><p><b>Date:</b> ${esc(date)}</p><p><b>Scenario:</b> ${esc(scenario.title)}</p><p><b>Attempt:</b> ${attemptCounter}</p><p><b>Result:</b> Successful</p><p><b>POST:</b> PASS</p><p><b>Total Cost:</b> ${money(totalCost())}</p><p><b>Report ID:</b> ${esc(id)}</p></div><h2>Scenario</h2><div class="story">${esc(scenario.story)}</div><h2>Final Component Selection</h2><table><thead><tr><th>Category</th><th>Component</th><th>Specification</th><th>Cost</th></tr></thead><tbody>${rows}</tbody></table><h2>Requirement Validation</h2><table><thead><tr><th>Requirement</th><th>Final Evidence</th><th>Status</th></tr></thead><tbody>${reqRows}</tbody></table><h2>Activity Metrics</h2><table><tbody><tr><th>Attempts Used</th><td>${attemptCounter}</td><th>Diagnostic Runs</th><td>${state.diagnostics}</td></tr><tr><th>Build Changes</th><td>${state.changes}</td><th>Completion Status</th><td>Validated</td></tr></tbody></table><div class="footer">This report reflects the final validated state recorded by the Server Admin Academy PC Hardware Simulator. Use the browser print dialog and choose Save as PDF for submission.</div><script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`;
    const w=window.open("","_blank");if(!w){setConsole("The report window was blocked. Allow pop-ups for this site and try again.","REPORT");return}w.document.open();w.document.write(html);w.document.close();
  }

  async function init(){
    $("#activityDate").value=todayValue();loadRecord();
    try{const res=await fetch("./data/simulations.json",{cache:"no-store"});if(!res.ok)throw new Error("simulation data unavailable");const all=await res.json();scenario=all.find(s=>s.id===scenarioId)||all[0];catalog=scenario.components||[]}
    catch(err){setConsole("Simulation data could not be loaded. Refresh the page or verify data/simulations.json is deployed.","ERROR");console.error(err);return}
    $("#scenarioTitle").textContent=scenario.title;$("#scenarioSummary").textContent=scenario.summary;$("#scenarioStory").textContent=scenario.story;$("#requirementChips").innerHTML=(scenario.requirementLabels||[]).map(x=>`<span class="simRequirementChip">${esc(x)}</span>`).join("");document.title=`${scenario.shortTitle||scenario.title} • Server Admin Academy`;
    populateCategories();render();
  }

  $("#componentCategory").addEventListener("change",()=>{state.selectedId=null;$("#selectedPart").textContent="None";$("#selectedPartHelp").textContent="Choose a component, then click its installation area.";renderInventory()});
  $$("[data-slot]").forEach(slot=>slot.addEventListener("click",e=>{e.stopPropagation();installSelected(slot.dataset.slot)}));
  $$("[data-ram-slot]").forEach(slot=>slot.addEventListener("click",e=>{e.stopPropagation();installRam(slot.dataset.ramSlot)}));
  [["cableAtx","atx","24-pin ATX"],["cableEps","eps","8-pin EPS"],["cableGpu","gpu","PCIe GPU power"],["cableCpuFan","cpuFan","CPU_FAN"]].forEach(([id,key,label])=>$("#"+id).addEventListener("change",e=>{state.cables[key]=e.target.checked;state.powered=false;state.post=null;state.validated=false;state.changes++;setConsole(`${label} ${e.target.checked?"connected":"disconnected"}.`,"CABLE");render()}));
  $("#technicianName").addEventListener("change",saveRecord);$("#activityDate").addEventListener("change",saveRecord);
  $("#startAttemptBtn").addEventListener("click",startAttempt);
  $("#resetBtn").addEventListener("click",()=>{resetRunState();state.active=true;setConsole(`Attempt ${attemptCounter} build reset. This remains the same attempt.`,"RESET");render()});
  $("#powerBtn").addEventListener("click",()=>{state.powered=true;const blockers=postBlockingIssues();state.post=blockers.length===0;state.validated=false;if(state.post)setConsole("POST SUCCESSFUL. Firmware hardware checks passed. Validate the business requirements to determine whether the workstation satisfies the scenario.","POST PASS");else setConsole("POST FAILED. The system has a hardware, compatibility, cooling, graphics, or power issue. Run diagnostics to investigate.","POST FAIL");render()});
  $("#diagnoseBtn").addEventListener("click",()=>{state.diagnostics++;const blockers=postBlockingIssues();const compat=compatibilityIssues();if(blockers.length)setConsole(`Diagnostics: ${blockers.slice(0,3).join("; ")}${blockers.length>3?`; plus ${blockers.length-3} additional issue(s)`:""}.`,"DIAG");else if(compat.length)setConsole(`Compatibility issue: ${compat.join("; ")}.`,"DIAG");else setConsole("Diagnostics complete: no POST-blocking hardware faults detected.","HEALTHY")});
  $("#inspectBtn").addEventListener("click",()=>{const names=[...slotTypes.filter(t=>t!=="ram").map(t=>installed(t)?.name).filter(Boolean),...installedRams().map(x=>`${x.component.name} in ${x.slot}`)];setConsole(names.length?`Installed hardware: ${names.join(", ")}. Current cost: ${money(totalCost())}.`:"The workbench is empty. Choose a motherboard platform to begin.","INSPECT")});
  $("#validateBtn").addEventListener("click",validate);$("#reportBtn").addEventListener("click",generateReport);
  init();
})();
