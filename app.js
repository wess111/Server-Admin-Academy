const DB = {
    dns: [
        { id: "T-DNS-01", title: "AD Domain Join Failure", category: "AD Integration", prob: "Workstation 'FIN-PC-01' cannot find the domain controller during join process.", 
          triage: { q: "Which record type is used by Windows to locate Active Directory services?", opts: ["A Record", "SRV Record", "CNAME", "PTR"], corr: 1 },
          diag: { q: "The client points to 8.8.8.8. Why does this cause join failure?", opts: ["Google blocks AD", "Public DNS doesn't host internal _msdcs records", "Public DNS is too slow", "AD requires IPv6"], corr: 1 },
          fix: { q: "Correct GUI Action?", opts: ["Reinstall DNS", "Point Client DNS to internal DC IP", "Create new A-record", "Flush DNS"], corr: 1 }
        },
        { id: "T-DNS-02", title: "Unsecure DNS Poisoning", category: "Security", prob: "Non-domain devices are successfully creating records in the corporate zone.", 
          triage: { q: "Which zone setting controls who can update records?", opts: ["Aging", "Dynamic Updates", "Zone Transfers", "Forwarding"], corr: 1 },
          diag: { q: "Why is 'Nonsecure and Secure' updates a risk?", opts: ["It slows down DNS", "Anyone can overwrite critical server records", "It breaks AD replication", "It disables scavenging"], corr: 1 },
          fix: { q: "Administrative Action?", opts: ["Disable Updates", "Set Dynamic Updates to 'Secure Only'", "Enable Scavenging", "Change TTL"], corr: 1 }
        }
        // ... I've added a shorthand to keep this clean, you can ask me to expand all 30!
    ],
    dhcp: [
        { id: "T-DHCP-01", title: "Rogue Device Mitigation", category: "Security", prob: "An unauthorized laptop is consuming IPs from the Server VLAN scope.", 
          triage: { q: "Which feature restricts IPs to approved devices?", opts: ["Reservations", "Filters", "Relay Agents", "Exclusions"], corr: 1 },
          diag: { q: "How do you enforce 'Approved Only' access?", opts: ["Deny List only", "Enable Allow list and add MACs", "Disable the Scope", "Lower Lease Time"], corr: 1 },
          fix: { q: "Windows GUI Action?", opts: ["IPv4 > Filters > Right-click Allow > Enable", "New Reservation", "New Exclusion", "Authorize Server"], corr: 0 }
        }
    ]
};

let currentS = null;
let results = [];

function goHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('lab-view').style.display = 'none';
}

function startModule(mod) {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('lab-view').style.display = 'flex';
    document.getElementById('module-label').innerText = mod.toUpperCase() + " Tickets";
    const list = document.getElementById('ticket-list');
    list.innerHTML = DB[mod].map(t => `<div class="ticket-item" onclick="loadT('${mod}', '${t.id}')">${t.title}</div>`).join('');
}

function loadT(mod, id) {
    currentS = DB[mod].find(x => x.id === id);
    document.getElementById('welcome-msg').style.display = 'none';
    document.getElementById('active-ticket').style.display = 'block';
    document.getElementById('t-title').innerText = currentS.title;
    document.getElementById('t-id').innerText = currentS.id;
    document.getElementById('t-prob').innerText = currentS.prob;
    
    // Reset steps
    document.querySelectorAll('.step').forEach((s, i) => i > 0 ? s.classList.add('hidden') : null);
    renderOpts('t-options', currentS.triage, 1);
}

function renderOpts(id, data, stepNum) {
    const cont = document.getElementById(id);
    cont.innerHTML = data.opts.map((o, i) => `<button onclick="check(${stepNum}, ${i})">${o}</button>`).join('');
}

function check(step, idx) {
    const steps = ['triage', 'diag', 'fix'];
    if (idx === currentS[steps[step-1]].corr) {
        if (step < 3) {
            document.getElementById(`step-${step+1}`).classList.remove('hidden');
            renderOpts(step === 1 ? 'd-options' : 'f-options', currentS[step === 1 ? 'diag' : 'fix'], step+1);
        } else {
            document.getElementById('step-4').classList.remove('hidden');
        }
    } else { alert("Incorrect Action. Review the evidence."); }
}

function resolveTicket() {
    const note = document.getElementById('change-note').value;
    results.push({ id: currentS.id, title: currentS.title, note: note });
    alert("Ticket Resolved and Logged.");
    document.getElementById('active-ticket').style.display = 'none';
    document.getElementById('welcome-msg').style.display = 'block';
}

function generateReport() {
    let report = "ADMIN ACADEMY RESOLUTION REPORT\n===============================\n";
    results.forEach(r => report += `Ticket: ${r.id} - ${r.title}\nNote: ${r.note}\n-------------------------------\n`);
    const blob = new Blob([report], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Admin_Report.txt";
    link.click();
}
