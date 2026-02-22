const SCENARIOS = {
    dns: [
        { id: "DNS-01", title: "AD Discovery Failure", category: "Domain Join", problem: "New server SRV-FS02 cannot locate the domain controller 'corp.local'.", evidence: "C:\\> nslookup -type=SRV _ldap._tcp.dc._msdcs.corp.local\n*** corp.local can't find _ldap._tcp.dc._msdcs.corp.local: Non-existent domain", triage: { q: "Why is the SRV record lookup failing?", opts: ["The DC is offline", "Client is using an external DNS (8.8.8.8)", "Firewall is blocking Port 80"], correct: 1 }, fix: { q: "Which GUI action resolves this for the client?", opts: ["Reinstall Windows", "Set IPv4 Preferred DNS to the Domain Controller IP", "Create a new CNAME"], correct: 1 } },
        { id: "DNS-02", title: "Alias Resolution Error", category: "Resource Records", problem: "Users cannot reach 'portal.corp.local' after a server migration.", evidence: "C:\\> ping portal.corp.local\nPing request could not find host portal.corp.local.", triage: { q: "What record type maps a friendly name to a server's FQDN?", opts: ["A Record", "MX Record", "CNAME Record"], correct: 2 }, fix: { q: "How do you fix this in DNS Manager?", opts: ["Create a New Alias (CNAME) pointing to the new server", "Delete the zone", "Restart DNS service"], correct: 0 } }
    ],
    dhcp: [
        { id: "DHCP-01", title: "Unauthorized Device", category: "Security", problem: "Unknown personal devices are pulling IP addresses in the Server VLAN.", evidence: "DHCP Console > Address Leases > 'Android-Device-88' detected with active lease.", triage: { q: "Which feature restricts leases to corporate-only MACs?", opts: ["Reservations", "DHCP Filters", "Relay Agents"], correct: 1 }, fix: { q: "Administrative Fix?", opts: ["Enable 'Allow' Filter and add corporate MAC addresses", "Disable the Scope", "Lower the lease duration"], correct: 0 } }
    ]
};

let currentMod = null;
let solved = {};

function enterModule(mod) {
    currentMod = mod;
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('lab-view').style.display = 'block';
    document.getElementById('active-mod-name').innerText = mod.toUpperCase() + " Challenges";
    renderList();
}

function exitToHub() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('lab-view').style.display = 'none';
}

function renderList() {
    const list = document.getElementById('ticket-list');
    list.innerHTML = SCENARIOS[currentMod].map(s => `
        <div class="list-item" onclick="loadTicket('${s.id}')">
            <strong>${s.id}</strong>: ${s.title}
        </div>
    `).join('');
}

function loadTicket(id) {
    const ticket = SCENARIOS[currentMod].find(x => x.id === id);
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="ticket-header">
            <h2>${ticket.title}</h2>
            <span class="pill">${ticket.category}</span>
        </div>
        <div class="step-card">
            <h3>Symptom & Evidence</h3>
            <p>${ticket.problem}</p>
            <div class="evidence-box">${ticket.evidence}</div>
        </div>
        <div class="step-card">
            <h3>Administrative Action</h3>
            <p>${ticket.fix.q}</p>
            <div class="opt-grid">
                ${ticket.fix.opts.map((o,i) => `<button class="btn ghost" onclick="checkFix('${id}', ${i})">${o}</button>`).join(' ')}
            </div>
        </div>
        <div class="step-card">
            <h3>Change Note</h3>
            <textarea id="note-${id}" class="note-box" placeholder="Explain your reasoning..."></textarea>
        </div>
    `;
}

function checkFix(id, idx) {
    const ticket = SCENARIOS[currentMod].find(x => x.id === id);
    if (idx === ticket.fix.correct) {
        alert("Action successful! Documentation required.");
        solved[id] = document.getElementById(`note-${id}`).value;
        updateProgress();
    } else {
        alert("Incorrect action. System health declining.");
    }
}

function updateProgress() {
    const count = Object.keys(solved).length;
    document.getElementById('progress-val').innerText = `${count}/30`;
}

function exportPdf() {
    const root = document.getElementById('print-root');
    let html = `<h1>Admin Academy Report</h1><hr/>`;
    Object.keys(solved).forEach(id => {
        html += `<div class="report-ticket"><h3>Ticket ${id}</h3><p><strong>Note:</strong> ${solved[id]}</p></div>`;
    });
    root.innerHTML = html;
    window.print();
}
