// Sample Scenarios - You will expand this to all 30
const SCENARIOS = [
    {
        id: "DNS_JOIN_01",
        module: "dns",
        title: "The AD Discovery Failure",
        category: "Domain Services",
        problem: "New server SRV-FS02 cannot locate the domain controller 'corp.local'.",
        evidence: "C:\\> nslookup -type=SRV _ldap._tcp.dc._msdcs.corp.local\n*** corp.local can't find _ldap._tcp.dc._msdcs.corp.local: Non-existent domain",
        triage: { q: "Why is the SRV record lookup failing?", options: ["The DC is offline", "Client is using an external DNS (8.8.8.8)", "Firewall is blocking Port 80"], correct: 1 },
        fix: { q: "Which GUI action resolves this for the client?", options: ["Reinstall Windows", "Set IPv4 Preferred DNS to the Domain Controller IP", "Create a new CNAME"], correct: 1 }
    },
    {
        id: "DHCP_FILT_01",
        module: "dhcp",
        title: "The Unauthorized Asset",
        category: "Security",
        problem: "Unknown personal devices are pulling IP addresses in the Server VLAN.",
        evidence: "DHCP Console > Address Leases > 'Android-Device-88' detected with active lease.",
        triage: { q: "Which feature restricts leases to corporate-only MACs?", options: ["Reservations", "DHCP Filters", "Relay Agents"], correct: 1 },
        fix: { q: "Administrative Fix?", options: ["Enable 'Allow' Filter and add corporate MAC addresses", "Disable the Scope", "Lower the lease duration"], correct: 0 }
    }
];

let gameState = { solved: {}, currentModule: null };

function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('lab-view').style.display = 'none';
}

function enterModule(mod) {
    gameState.currentModule = mod;
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('lab-view').style.display = 'block';
    document.getElementById('module-display').innerText = mod.toUpperCase() + " Challenges";
    renderList();
}

function renderList() {
    const list = document.getElementById('ticket-list');
    const filtered = SCENARIOS.filter(s => s.module === gameState.currentModule);
    list.innerHTML = filtered.map(s => `
        <div class="list-item" onclick="loadScenario('${s.id}')">
            ${s.title}
        </div>
    `).join('');
}

function exportPdf() {
    const root = document.getElementById('print-root');
    let html = `<div class="print-header"><h1>Server Admin Academy: Resolution Report</h1></div>`;
    
    SCENARIOS.forEach(s => {
        const note = document.getElementById(`note-${s.id}`)?.value || "No note provided.";
        html += `
            <div class="print-ticket">
                <h3>${s.id}: ${s.title}</h3>
                <p><strong>Result:</strong> Resolved Successfully</p>
                <p><strong>Admin Change Note:</strong> ${note}</p>
            </div>`;
    });
    
    root.innerHTML = html;
    window.print();
}

// Additional logic for loading scenarios and checking answers goes here...
