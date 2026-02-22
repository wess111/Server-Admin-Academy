const SCENARIOS = {
    dns: [
        {
            id: 'DNS-01', title: 'Domain Join Failure', category: 'Connectivity',
            problem: 'Global-Logistics workstation fails to join the domain. Error: DNS name does not exist.',
            triage: { q: 'What is the first thing to check on the client?', options: ['Firewall settings', 'Preferred DNS Server IP', 'Browser Cache', 'Windows Update'], correct: 1 },
            diagnosis: { q: 'The client is pointing to 8.8.8.8. Why is this a problem?', options: ['Google is down', 'Public DNS cannot resolve internal AD SRV records', 'It is too slow', 'IPv6 is required'], correct: 1 },
            fix: { q: 'What is the fix?', options: ['Restart PC', 'Set DNS to the Domain Controller IP', 'Reinstall DNS Role', 'Enable DHCP'], correct: 1 }
        },
        {
            id: 'DNS-02', title: 'Service Decoupling', category: 'Architecture',
            problem: 'An internal web app breaks every time the backend server is renamed.',
            triage: { q: 'How can we provide a permanent name for the service?', options: ['A Record', 'CNAME (Alias)', 'PTR Record', 'MX Record'], correct: 1 },
            diagnosis: { q: 'What does a CNAME do?', options: ['Maps IP to Name', 'Maps Name to Name', 'Handles Email', 'Secures the zone'], correct: 1 },
            fix: { q: 'Correct GUI Action?', options: ['New Host (A)', 'New Alias (CNAME)', 'New Mail Exchanger', 'Enable Scavenging'], correct: 1 }
        }
        // ... (Remaining DNS scenarios follow this pattern)
    ],
    dhcp: [
        {
            id: 'DHCP-01', title: 'Rogue Device on LAN', category: 'Security',
            problem: 'Unknown devices are stealing IP addresses in the Finance subnet.',
            triage: { q: 'Which feature blocks unauthorized MAC addresses?', options: ['Scope Options', 'DHCP Filters', 'Reservations', 'Superscopes'], correct: 1 },
            diagnosis: { q: 'You want to ONLY allow corporate devices. Which list do you use?', options: ['Deny List', 'Allow List', 'Exclusion List', 'Vendor List'], correct: 1 },
            fix: { q: 'Windows GUI Action?', options: ['IPv4 > Filters > Enable Allow', 'New Scope', 'Restart Service', 'Authorize Server'], correct: 0 }
        }
        // ... (Remaining DHCP scenarios follow this pattern)
    ]
};

let activeScenario = null;

function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('lab-view').style.display = 'none';
}

function enterModule(module) {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('lab-view').style.display = 'flex';
    document.getElementById('module-title').innerText = module.toUpperCase() + " Tickets";
    loadTickets(module);
}

function loadTickets(module) {
    const list = document.getElementById('ticket-list');
    list.innerHTML = SCENARIOS[module].map(s => `
        <div class="ticket-card" onclick="selectTicket('${module}', '${s.id}')">
            <h4>${s.title}</h4>
        </div>
    `).join('');
}

function selectTicket(module, id) {
    activeScenario = SCENARIOS[module].find(s => s.id === id);
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('ticket-workspace').style.display = 'block';
    document.getElementById('active-title').innerText = activeScenario.title;
    document.getElementById('problem-desc').innerText = activeScenario.problem;
    
    renderOptions('triage-options', activeScenario.triage);
}

function renderOptions(containerId, stepData) {
    const container = document.getElementById(containerId);
    container.innerHTML = stepData.options.map((opt, i) => `
        <button onclick="checkStep('${containerId}', ${i})">${opt}</button>
    `).join('');
}

function checkStep(containerId, index) {
    // Basic logic to reveal the next section if correct
    if (containerId === 'triage-options' && index === activeScenario.triage.correct) {
        document.getElementById('diagnosis-section').classList.remove('hidden');
        renderOptions('diagnosis-options', activeScenario.diagnosis);
    } else if (containerId === 'diagnosis-options' && index === activeScenario.diagnosis.correct) {
        document.getElementById('fix-section').classList.remove('hidden');
        renderOptions('fix-options', activeScenario.fix);
    } else if (containerId === 'fix-options' && index === activeScenario.fix.correct) {
        document.getElementById('note-section').classList.remove('hidden');
    } else {
        alert("Incorrect. Review your server administration notes.");
    }
}