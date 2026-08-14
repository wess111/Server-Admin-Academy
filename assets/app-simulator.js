(() => {
  const requiredParts = ["motherboard","cpu","cooler","ram","ssd","gpu","psu","casefan"];
  const labels = {motherboard:"ATX Motherboard",cpu:"Intel Core CPU",cooler:"CPU Cooler",ram:"16 GB DDR5",ssd:"1 TB NVMe SSD",gpu:"Graphics Card",psu:"650 W PSU",casefan:"Case Fan"};
  const state = {selected:null, installed:Object.fromEntries(requiredParts.map(k=>[k,false])), cables:{atx:false,eps:false,gpu:false,cpuFan:false}, powered:false, post:null};

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const consoleMessage = $("#consoleMessage");
  const consoleCode = $("#consoleCode");

  const checklistRules = [
    ["motherboard","Motherboard installed","Secure the motherboard to the case tray."],
    ["cpu","CPU installed","Seat the processor in the CPU socket."],
    ["cooler","CPU cooler installed","Install cooling before attempting startup."],
    ["ram","Memory installed","Install a compatible DDR5 DIMM."],
    ["ssd","Storage installed","Install the NVMe drive in the M.2 slot."],
    ["gpu","Graphics installed","Seat the graphics card in PCIe x16."],
    ["psu","Power supply installed","Install the ATX power supply."],
    ["casefan","Case airflow installed","Install the rear case fan."],
    ["atx","24-pin ATX connected","Connect motherboard main power."],
    ["eps","CPU EPS connected","Connect dedicated CPU power."],
    ["gpuCable","GPU power connected","Connect PCIe power to the graphics card."],
    ["cpuFan","CPU_FAN connected","Connect the cooler fan to CPU_FAN."],
  ];

  function setConsole(message, code="INFO") { consoleMessage.textContent = message; consoleCode.textContent = code; }
  function canInstall(part) {
    if (part !== "motherboard" && !state.installed.motherboard) return "Install the motherboard before adding components to it.";
    if (part === "cooler" && !state.installed.cpu) return "The CPU cooler cannot be installed until the CPU is seated.";
    return null;
  }
  function getIssues() {
    const issues=[];
    requiredParts.forEach(p=>{ if(!state.installed[p]) issues.push(`${labels[p]} is not installed`); });
    if(state.installed.psu && !state.cables.atx) issues.push("24-pin ATX motherboard power is disconnected");
    if(state.installed.psu && state.installed.cpu && !state.cables.eps) issues.push("8-pin EPS CPU power is disconnected");
    if(state.installed.psu && state.installed.gpu && !state.cables.gpu) issues.push("PCIe graphics power is disconnected");
    if(state.installed.cooler && !state.cables.cpuFan) issues.push("CPU cooler is not connected to CPU_FAN");
    return issues;
  }
  function getPostBlockingIssues() {
    const issues=[];
    if(!state.installed.motherboard) issues.push("motherboard missing");
    if(!state.installed.cpu) issues.push("CPU missing");
    if(!state.installed.ram) issues.push("memory missing");
    if(!state.installed.psu) issues.push("power supply missing");
    if(state.installed.psu && state.installed.motherboard && !state.cables.atx) issues.push("24-pin ATX power disconnected");
    if(state.installed.psu && state.installed.cpu && !state.cables.eps) issues.push("8-pin EPS CPU power disconnected");
    if(state.installed.cpu && !state.installed.cooler) issues.push("CPU cooling missing");
    if(state.installed.cooler && !state.cables.cpuFan) issues.push("CPU_FAN disconnected");
    // This training CPU is modeled without integrated graphics, so a GPU is required for video output.
    if(!state.installed.gpu) issues.push("graphics adapter missing");
    if(state.installed.gpu && state.installed.psu && !state.cables.gpu) issues.push("GPU power disconnected");
    return issues;
  }
  function ruleDone(key){
    if(requiredParts.includes(key)) return state.installed[key];
    if(key==="atx") return state.cables.atx;
    if(key==="eps") return state.cables.eps;
    if(key==="gpuCable") return state.cables.gpu;
    if(key==="cpuFan") return state.cables.cpuFan;
    return false;
  }
  function render(){
    const installedCount=requiredParts.filter(p=>state.installed[p]).length;
    const completeCount=checklistRules.filter(r=>ruleDone(r[0])).length;
    const pct=Math.round(completeCount/checklistRules.length*100);
    const issues=getIssues();

    $("#selectedPart").textContent=state.selected ? labels[state.selected] : "None";
    $("#inventoryCount").textContent=`${requiredParts.length-installedCount} available`;
    $("#installedStatus").textContent=`${installedCount}/${requiredParts.length}`;
    $("#powerStatus").textContent=state.powered?"ON":"OFF";
    $("#postStatus").textContent=state.post===true?"PASS":state.post===false?"FAIL":"—";
    $("#issueStatus").textContent=issues.length;
    $("#progressPercent").textContent=`${pct}%`;
    $("#progressBar").style.width=`${pct}%`;

    $$(".simPart").forEach(btn=>{ const p=btn.dataset.part; btn.classList.toggle("isSelected",state.selected===p); btn.classList.toggle("isInstalled",state.installed[p]); btn.disabled=state.installed[p]; });
    $$(".simSlot").forEach(slot=>{ const p=slot.dataset.slot; slot.classList.toggle("isInstalled",!!state.installed[p]); const stateEl=$("#state-"+p); if(stateEl) stateEl.textContent=state.installed[p]?"Installed":"Empty"; });

    const cableMap={cableAtx:"atx",cableEps:"eps",cableGpu:"gpu",cableCpuFan:"cpuFan"};
    Object.entries(cableMap).forEach(([id,key])=>{ const el=$("#"+id); el.checked=state.cables[key]; if(key==="atx") el.disabled=!state.installed.psu||!state.installed.motherboard; if(key==="eps") el.disabled=!state.installed.psu||!state.installed.cpu; if(key==="gpu") el.disabled=!state.installed.psu||!state.installed.gpu; if(key==="cpuFan") el.disabled=!state.installed.cooler||!state.installed.motherboard; });

    $("#checklist").innerHTML=checklistRules.map(([key,title,help])=>`<div class="simCheck ${ruleDone(key)?"done":""}"><span class="simCheckIcon">${ruleDone(key)?"✓":""}</span><span><strong>${title}</strong><small>${help}</small></span></div>`).join("");
  }

  $$(".simPart").forEach(btn=>btn.addEventListener("click",()=>{ state.selected=btn.dataset.part; state.powered=false; state.post=null; setConsole(`${labels[state.selected]} selected. Click its correct installation area.`,"SELECT"); render(); }));

  $$(".simSlot").forEach(slot=>slot.addEventListener("click",e=>{
    e.stopPropagation(); const target=slot.dataset.slot;
    if(state.installed[target]) { state.installed[target]=false; if(target==="motherboard"){ ["cpu","cooler","ram","ssd","gpu"].forEach(p=>state.installed[p]=false); state.cables={atx:false,eps:false,gpu:false,cpuFan:false}; } if(target==="psu") state.cables={...state.cables,atx:false,eps:false,gpu:false}; if(target==="cooler") state.cables.cpuFan=false; if(target==="gpu") state.cables.gpu=false; state.powered=false;state.post=null;setConsole(`${labels[target]} removed from the build.`,"REMOVE");render();return; }
    if(!state.selected){ setConsole("Select a component from the inventory before choosing an installation area.","WAIT");return; }
    if(state.selected!==target){ setConsole(`${labels[state.selected]} does not belong in this installation area.`,"INVALID");return; }
    const block=canInstall(target); if(block){setConsole(block,"ORDER");return;}
    state.installed[target]=true; state.selected=null; state.powered=false; state.post=null; setConsole(`${labels[target]} installed successfully.`,"INSTALL"); render();
  }));

  [["cableAtx","atx","24-pin ATX"],["cableEps","eps","8-pin EPS"],["cableGpu","gpu","PCIe GPU power"],["cableCpuFan","cpuFan","CPU_FAN"]].forEach(([id,key,label])=>$("#"+id).addEventListener("change",e=>{state.cables[key]=e.target.checked;state.powered=false;state.post=null;setConsole(`${label} ${e.target.checked?"connected":"disconnected"}.`,"CABLE");render();}));

  $("#powerBtn").addEventListener("click",()=>{
    state.powered=true;
    const blockers=getPostBlockingIssues();
    state.post=blockers.length===0;
    if(state.post){
      const buildIssues=getIssues();
      if(!state.installed.ssd) setConsole("POST SUCCESSFUL. Firmware hardware checks passed, but no boot storage is installed. The system cannot load an operating system yet.","POST PASS");
      else if(buildIssues.length) setConsole("POST SUCCESSFUL. Core hardware checks passed. The system can start, but the assigned build still has incomplete requirements; inspect the checklist.","POST PASS");
      else setConsole("POST SUCCESSFUL. Core hardware checks passed and the assigned PC build is complete. The system is ready to boot from the NVMe drive.","POST PASS");
    } else {
      setConsole("Power applied. POST FAILED. A core hardware, cooling, graphics, or power requirement is preventing startup. Run diagnostics.","POST FAIL");
    }
    render();
  });
  $("#diagnoseBtn").addEventListener("click",()=>{
    const blockers=getPostBlockingIssues();
    const issues=getIssues();
    if(state.powered && blockers.length) setConsole(`POST diagnostics: ${blockers.slice(0,3).join("; ")}${blockers.length>3?`; plus ${blockers.length-3} additional blocking issue(s)`:""}.`,"DIAG");
    else if(!issues.length) setConsole("Diagnostics complete: no hardware faults or incomplete build requirements detected.","HEALTHY");
    else setConsole(`Build diagnostics: ${issues.slice(0,3).join("; ")}${issues.length>3?`; plus ${issues.length-3} additional issue(s)`:""}.`,"DIAG");
  });
  $("#inspectBtn").addEventListener("click",()=>{const installed=requiredParts.filter(p=>state.installed[p]).map(p=>labels[p]);setConsole(installed.length?`Installed hardware: ${installed.join(", ")}. Review the validation checklist for remaining requirements.`:"The case is empty. Begin by installing the ATX motherboard.","INSPECT");});
  $("#resetBtn").addEventListener("click",()=>{state.selected=null;requiredParts.forEach(p=>state.installed[p]=false);state.cables={atx:false,eps:false,gpu:false,cpuFan:false};state.powered=false;state.post=null;setConsole("Workbench reset. Select the motherboard from the inventory to begin.","READY");render();});

  render();
})();
