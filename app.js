// app.js
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------------------------
  // Lab tiles (add more later)
  // ---------------------------
  const LABS = [
    {
      id: "dns-dhcp",
      title: "DNS & DHCP Troubleshooting",
      desc: "30 enterprise tickets (15 DNS, 15 DHCP) using the 4-step triage workflow.",
      status: "active",
      hash: "#dns-dhcp"
    },
    {
      id: "active-directory",
      title: "Active Directory Troubleshooting",
      desc: "Domain join, replication, GPO processing, authentication flows (coming soon).",
      status: "soon",
      hash: "#home"
    },
    {
      id: "file-services",
      title: "File Services (NTFS/Share/FSRM/DFS)",
      desc: "Permissions, quotas, screening, namespaces, replication (coming soon).",
      status: "soon",
      hash: "#home"
    },
    {
      id: "gpo",
      title: "Group Policy Troubleshooting",
      desc: "Link order, security filtering, WMI filters, gpresult analysis (coming soon).",
      status: "soon",
      hash: "#home"
    },
    {
      id: "ha-dr",
      title: "High Availability & DR",
      desc: "Failover, backups, recovery testing and documentation (coming soon).",
      status: "soon",
      hash: "#home"
    }
  ];

  // ---------------------------
  // Tickets (15 DNS + 15 DHCP)
  // Requirements included:
  // DHCP: MAC Filters (Allow/Deny), Failover, Scopes, Relay Agents
  // DNS: SRV records, Secure Dynamic Updates, CNAME Aliases, Scavenging
  // ---------------------------
  const TICKETS = [
    // DNS (15)
    {
      id: "DNS-001",
      category: "DNS",
      title: "Domain join fails intermittently at one site",
      tags: ["SRV records", "Domain Join", "AD"],
      summary:
        "A newly imaged workstation cannot join the domain at the REMOTE-DEPOT site. Internet works, but domain join cannot locate a domain controller.",
      env: {
        Client: "IMG-WS07 (Windows 11)",
        Domain: "corp.example.local",
        "DNS Servers": "SRV-DNS1, SRV-DNS2"
      },
      triage: "Domain join wizard fails with DC locator error. Basic name resolution for the domain name succeeds.",
      diagnosis:
        "Client cannot resolve required AD SRV records (e.g., _ldap._tcp.dc._msdcs), or it is using a DNS server that does not host AD-integrated data.",
      fix:
        "DNS Manager → Forward Lookup Zones → corp.example.local and _msdcs.corp.example.local: verify SRV records exist. Ensure clients point only to internal AD DNS (DHCP option 006). If SRV records are missing, trigger DC re-registration (Netlogon restart) and validate zone replication.",
      validations: [
        "nslookup -type=SRV _ldap._tcp.dc._msdcs.corp.example.local",
        "ipconfig /all (confirm DNS server list)",
        "Retry domain join after ipconfig /flushdns"
      ]
    },
    {
      id: "DNS-002",
      category: "DNS",
      title: "CNAME alias resolves but users reach wrong backend",
      tags: ["CNAME Aliases", "Legacy", "Migration"],
      summary:
        "Users access ERP via erp.global-logistics.local. After migration, they still hit the retired server intermittently.",
      env: {
        Alias: "erp.global-logistics.local",
        "Expected Target": "SRV-PROD-APP07",
        "Actual Target": "SRV-PROD-APP03"
      },
      triage: "Name resolves, but the application opens the old environment for some users.",
      diagnosis:
        "A CNAME chain or duplicate record set still points to the legacy host (erp → erp-old → old target) or clients are caching the older answer.",
      fix:
        "DNS Manager → locate all records for 'erp' (A/CNAME). Update the CNAME to point directly to the new host FQDN and remove outdated aliases. Incrementally validate and clear caches where required.",
      validations: [
        "nslookup erp.global-logistics.local (confirm new target)",
        "Confirm DNS cache cleared on test client",
        "Validate app logs show traffic hitting new server"
      ]
    },
    {
      id: "DNS-003",
      category: "DNS",
      title: "Secure dynamic updates failing for a subset of clients",
      tags: ["Secure Dynamic Updates", "DHCP", "Permissions"],
      summary:
        "Some laptops receive DHCP leases but never appear in DNS. Other devices update correctly in the same VLAN.",
      env: {
        Zone: "corp.global-logistics.local",
        "Dynamic Updates": "Secure only",
        DHCP: "SRV-DHCP1"
      },
      triage: "Clients can communicate by IP but hostname lookups fail; their A/PTR records are missing or stale.",
      diagnosis:
        "With secure updates, updates must be performed by the correct security principal. DHCP updates may be misconfigured (no credentials), or stale records exist with ownership that blocks overwrites.",
      fix:
        "DHCP Manager → Server → Properties → DNS: enable dynamic updates and configure DNS update credentials. In DNS Manager, remove conflicting stale records so the proper principal can register, or correct record ACL/ownership where appropriate.",
      validations: [
        "ipconfig /registerdns on an affected client",
        "DNS record ownership/security review",
        "Check DHCP/DNS event logs for update failures"
      ]
    },
    {
      id: "DNS-004",
      category: "DNS",
      title: "Scavenging removes critical records unexpectedly",
      tags: ["Scavenging", "Aging", "Static Records"],
      summary:
        "After enabling scavenging, several critical hostnames disappeared, causing service outages until records were recreated.",
      env: {
        Zone: "prod.example.local",
        "No-Refresh/Refresh": "7/7 days",
        Scavenging: "Enabled"
      },
      triage: "Critical names begin returning NXDOMAIN; services fail until DNS records are manually recreated.",
      diagnosis:
        "Aging/scavenging settings made important records eligible for scavenging (timestamps present), or the policy is too aggressive for the environment.",
      fix:
        "DNS Manager → Zone → Aging/Scavenging: review settings. Recreate critical records as true static (no timestamp) where appropriate, and adjust scavenging intervals to match lifecycle needs.",
      validations: [
        "Verify timestamps (View → Advanced)",
        "Confirm records persist after eligibility window",
        "Review scavenging logs/events"
      ]
    },
    {
      id: "DNS-005",
      category: "DNS",
      title: "Reverse lookups fail for DHCP clients",
      tags: ["PTR", "Reverse Zone", "DHCP"],
      summary:
        "Security tooling relies on reverse DNS, but many IPs show unknown because PTR records are missing.",
      env: {
        "Reverse Zone": "10.20.0.0/16",
        DHCP: "SRV-DHCP1",
        "Dynamic Updates": "Secure only"
      },
      triage: "Forward lookups may work, but nslookup <IP> returns NXDOMAIN for many client addresses.",
      diagnosis:
        "Reverse zone is missing/not AD-integrated, or DHCP is not configured to update PTR records (or lacks credentials in secure update mode).",
      fix:
        "DNS Manager → create reverse zone(s) for the network(s). DHCP Manager → Properties → DNS: enable A and PTR updates and set update credentials if secure updates are enforced.",
      validations: [
        "nslookup <IP> returns expected PTR",
        "DHCP logs show successful registrations",
        "Spot-check multiple subnets"
      ]
    },
    // Keep remaining DNS concise but compliant with required topics
    {
      id: "DNS-006",
      category: "DNS",
      title: "SRV lookup includes a decommissioned DC",
      tags: ["SRV records", "Cleanup", "AD"],
      summary: "Clients sometimes try to contact a retired domain controller name during domain operations.",
      env: { Domain: "corp.example.local", "Retired DC": "SRV-DC04" },
      triage: "Intermittent domain operations time out as clients attempt the retired DC.",
      diagnosis: "Stale SRV records still advertise the retired DC due to incomplete metadata/DNS cleanup.",
      fix: "DNS Manager → _msdcs zone: remove SRV entries for retired DC. Complete AD metadata cleanup and validate replication.",
      validations: ["SRV queries return only active DCs", "Repeat domain join test"]
    },
    {
      id: "DNS-007",
      category: "DNS",
      title: "Forwarder outage causes slow external resolution",
      tags: ["Forwarders", "Timeouts"],
      summary: "Internal names resolve fine, but external lookups are slow or fail intermittently.",
      env: { "DNS Server": "SRV-DNS1", "Forwarders": "Unreachable" },
      triage: "Users report slow browsing; DNS queries to public names take several seconds.",
      diagnosis: "Configured forwarders are down/unreachable, causing timeouts before fallback.",
      fix: "DNS Manager → Server Properties → Forwarders: remove/replace bad forwarders; confirm fallback behavior.",
      validations: ["Measure lookup latency before/after", "DNS event logs show fewer timeouts"]
    },
    {
      id: "DNS-008",
      category: "DNS",
      title: "Duplicate authoritative zones cause inconsistent answers",
      tags: ["Zones", "Authoritative", "Replication"],
      summary: "api.prod.global-logistics.local resolves to different IPs depending on subnet.",
      env: { "DNS Servers": "SRV-DNS1 (prod), SRV-DNS3 (test)", Zone: "prod.global-logistics.local" },
      triage: "Different clients get different answers; behavior is inconsistent and hard to reproduce.",
      diagnosis: "Multiple DNS servers host separate authoritative zones with the same name but different records.",
      fix: "Remove/disable the conflicting zone or correct replication scope so only the intended authoritative zone is served to clients.",
      validations: ["nslookup from multiple subnets returns same IP", "Verify DHCP option 006 server list"]
    },
    {
      id: "DNS-009",
      category: "DNS",
      title: "Secure updates blocked by stale record ownership",
      tags: ["Secure Dynamic Updates", "Ownership"],
      summary: "A replaced device cannot update an existing hostname; DNS keeps pointing to the old IP.",
      env: { Hostname: "PRN-FLOOR3", Zone: "corp.global-logistics.local" },
      triage: "Clients resolve name to old address; new device cannot register the name.",
      diagnosis: "Existing record is owned by another principal; secure updates prevent overwrite.",
      fix: "Delete stale A/PTR record (or correct ACL/ownership) and allow DHCP/client to re-register using correct credentials.",
      validations: ["Record reappears with correct IP", "Ownership reflects correct updater"]
    },
    {
      id: "DNS-010",
      category: "DNS",
      title: "Scavenging not removing stale records (zone aging not enabled)",
      tags: ["Scavenging", "Aging"],
      summary: "Zone grows with stale records; scavenging enabled on server but nothing is cleaned up.",
      env: { Zone: "corp.example.local", "Server Scavenging": "Enabled" },
      triage: "Stale workstation names persist for weeks; collisions occur after re-imaging.",
      diagnosis: "Zone-level aging is not enabled, so records never become eligible for scavenging.",
      fix: "DNS Manager → Zone Properties → Aging: enable aging and set appropriate no-refresh/refresh intervals.",
      validations: ["Confirm timestamps and stale eligibility", "Watch scavenging events over time"]
    },
    {
      id: "DNS-011",
      category: "DNS",
      title: "Conditional forwarder points to old partner DNS",
      tags: ["Conditional Forwarder", "Timeouts"],
      summary: "Partner domain names stopped resolving after vendor DNS changes.",
      env: { Domain: "vendor.example.local", "Old DNS": "10.50.2.10", "New DNS": "10.50.2.20" },
      triage: "Lookups for vendor domain time out; other domains resolve normally.",
      diagnosis: "Conditional forwarder targets a decommissioned DNS server.",
      fix: "DNS Manager → Conditional Forwarders: update forwarder IPs and verify TCP/UDP 53 reachability.",
      validations: ["nslookup vendor host resolves quickly", "Integration job succeeds"]
    },
    {
      id: "DNS-012",
      category: "DNS",
      title: "Domain join fails because clients are using public DNS",
      tags: ["SRV records", "DHCP Options"],
      summary: "New laptops can browse the internet but cannot join the domain.",
      env: { Scope: "10.30.40.0/24", "Option 006": "Public DNS", "AD DNS": "10.30.40.10" },
      triage: "Domain join fails; client DNS servers are public resolvers.",
      diagnosis: "Public DNS does not host AD SRV records needed for DC location.",
      fix: "DHCP Manager → Scope Options: set option 006 to internal AD DNS; renew lease and retry join.",
      validations: ["ipconfig /all shows internal DNS", "SRV query returns DCs"]
    },
    {
      id: "DNS-013",
      category: "DNS",
      title: "DNS registrations fail after DHCP server rebuild",
      tags: ["Secure Dynamic Updates", "DHCP Credentials"],
      summary: "Leases work but DNS records stop registering after DHCP server was rebuilt.",
      env: { DHCP: "SRV-DHCP1 (rebuilt)", Zone: "Secure only" },
      triage: "Clients can communicate by IP but not by hostname; no new A/PTR records appear.",
      diagnosis: "DHCP DNS update credentials were not reconfigured after rebuild.",
      fix: "DHCP Manager → Properties → DNS: configure dedicated credentials for secure DNS updates.",
      validations: ["New lease produces A/PTR", "Event logs show successful updates"]
    },
    {
      id: "DNS-014",
      category: "DNS",
      title: "CNAME exists but application team reports 'wrong name'",
      tags: ["CNAME Aliases", "Naming"],
      summary: "App works by server name, but fails when using the alias name (certificate/service binding mismatch).",
      env: { Alias: "portal.global-logistics.local", Target: "SRV-PROD-APP01" },
      triage: "Alias resolves, but app layer rejects connections when accessed via alias.",
      diagnosis: "Service binding/certificate does not include alias name (DNS is correct, app config is not).",
      fix: "Confirm CNAME in DNS; then update application/service binding or certificate to include alias name.",
      validations: ["DNS resolves correctly", "App works via alias after binding update"]
    },
    {
      id: "DNS-015",
      category: "DNS",
      title: "Secure updates: duplicate name exists after re-image",
      tags: ["Secure Dynamic Updates", "Stale Records"],
      summary: "A re-imaged workstation cannot register its name; DNS keeps old record.",
      env: { Hostname: "ENG-WS22", Zone: "corp.example.local" },
      triage: "Hostname points to old IP; new client cannot update.",
      diagnosis: "Stale record ownership blocks overwrite in secure mode.",
      fix: "Delete stale record and allow client/DHCP to re-register; verify update credentials and record ACL behavior.",
      validations: ["Record updates to new IP", "Repeat re-image simulation"]
    },

    // DHCP (15)
    {
      id: "DHCP-001",
      category: "DHCP",
      title: "Scope exhaustion causes intermittent DHCP failures",
      tags: ["Scopes", "Utilization"],
      summary: "Warehouse devices fail to obtain addresses during shift changes; scope utilization is near 100%.",
      env: { "DHCP Server": "SRV-DHCP1", Scope: "10.20.50.0/24" },
      triage: "Clients show APIPA or long DHCP delays; scope shows almost no free addresses.",
      diagnosis: "Address pool is too small, lease time too long for transient devices, or reservations consume space.",
      fix: "DHCP Manager → Scope: review Address Pool/Exclusions/Reservations; expand scope or redesign subnet, shorten lease duration if appropriate.",
      validations: ["Scope free addresses increase", "New clients get leases immediately"]
    },
    {
      id: "DHCP-002",
      category: "DHCP",
      title: "MAC Allow filter blocks new printers",
      tags: ["MAC Filters", "Allow List"],
      summary: "Print VLAN uses allow filtering; newly deployed printers cannot obtain DHCP leases.",
      env: { DHCP: "SRV-DHCP1", Policy: "Allow filter enabled" },
      triage: "New printers remain unaddressed; existing printers are fine.",
      diagnosis: "Printer MACs are not in the allow list; DHCP denies them.",
      fix: "DHCP Manager → IPv4 → Filters → Allow: add printer MACs and confirm filtering is enabled intentionally.",
      validations: ["Printer gets lease after renew", "Audit log shows lease issued"]
    },
    {
      id: "DHCP-003",
      category: "DHCP",
      title: "MAC Deny filter blocks a VIP laptop",
      tags: ["MAC Filters", "Deny List"],
      summary: "One laptop cannot get an IP on HQ Wi-Fi; others are fine.",
      env: { DHCP: "SRV-DHCP1", Filters: "Deny enabled" },
      triage: "Laptop shows APIPA; Wi-Fi association is successful.",
      diagnosis: "Laptop MAC was mistakenly added to deny list.",
      fix: "DHCP Manager → Filters → Deny: remove incorrect MAC entry and document the correction.",
      validations: ["Device obtains lease after change", "Deny list still blocks intended MACs"]
    },
    {
      id: "DHCP-004",
      category: "DHCP",
      title: "DHCP failover partner mismatch prevents synchronization",
      tags: ["Failover", "Load Balance"],
      summary: "After maintenance, failover relationship shows warnings and renewals fail for some clients.",
      env: { Servers: "SRV-DHCP1/SRV-DHCP2", Mode: "Load balance" },
      triage: "Relationship state is unhealthy; some leases don’t update/renew properly.",
      diagnosis: "Failover configuration mismatch (shared secret, relationship config) or time skew disrupts sync.",
      fix: "DHCP Manager → Scope → Properties → Failover: validate partner and shared secret; correct/recreate relationship if needed. Ensure time sync.",
      validations: ["Relationship state becomes Normal", "Renewals succeed consistently"]
    },
    {
      id: "DHCP-005",
      category: "DHCP",
      title: "Hot standby failover doesn’t activate during outage",
      tags: ["Failover", "Hot Standby"],
      summary: "During planned downtime of primary DHCP server, standby does not begin leasing quickly.",
      env: { Mode: "Hot standby", Primary: "SRV-DHCP1", Standby: "SRV-DHCP2" },
      triage: "Clients cannot renew/new leases during primary outage for longer than expected.",
      diagnosis: "Hot standby settings/state switchover or authorization/activation is misconfigured.",
      fix: "Verify hot standby role and switchover settings; confirm standby is authorized in AD and relationship applies to the scope.",
      validations: ["Standby leases within expected window when primary is down"]
    },
    {
      id: "DHCP-006",
      category: "DHCP",
      title: "Clients across router cannot obtain leases (relay missing)",
      tags: ["Relay Agents", "IP Helper"],
      summary: "New VLAN cannot reach centralized DHCP server; clients remain on APIPA.",
      env: { VLAN: "IOT-70 (10.70.0.0/24)", DHCP: "SRV-DHCP1" },
      triage: "DHCP server never logs DISCOVER from the subnet.",
      diagnosis: "No DHCP relay/IP helper on the gateway; broadcasts don’t cross subnets.",
      fix: "Configure DHCP relay/IP helper on the router/L3 gateway to forward to SRV-DHCP1. Ensure scope exists and is activated.",
      validations: ["DHCP server logs show traffic from subnet", "Clients obtain correct options"]
    },
    {
      id: "DHCP-007",
      category: "DHCP",
      title: "Scope options misconfigured: wrong DNS servers distributed",
      tags: ["Scopes", "Option 006"],
      summary: "Clients get IP and gateway but internal names do not resolve.",
      env: { Scope: "10.30.10.0/24", "Option 006": "Public DNS" },
      triage: "Internal lookups fail; ipconfig shows public DNS servers.",
      diagnosis: "Scope option 006 incorrectly set to public resolvers.",
      fix: "DHCP Manager → Scope Options: set option 006 to internal DNS servers; renew leases.",
      validations: ["ipconfig shows internal DNS", "Internal names resolve"]
    },
    {
      id: "DHCP-008",
      category: "DHCP",
      title: "Reservation not applying due to wrong identifier",
      tags: ["Scopes", "Reservations"],
      summary: "A camera must keep a fixed IP via reservation but keeps receiving random addresses.",
      env: { Scope: "10.20.60.0/24", Reservation: "10.20.60.50" },
      triage: "Reservation exists; device receives different IP after reboot.",
      diagnosis: "Reservation was created with wrong MAC/client identifier (wrong interface or formatting).",
      fix: "DHCP Manager → Address Leases: find the device identifier; recreate reservation using correct identifier.",
      validations: ["Device receives reserved IP after renew", "Lease shows reserved assignment"]
    },
    {
      id: "DHCP-009",
      category: "DHCP",
      title: "Rogue DHCP provides incorrect gateway and DNS",
      tags: ["Scopes", "Conflicts", "Rogue DHCP"],
      summary: "Some clients receive incorrect settings and lose connectivity intermittently.",
      env: { VLAN: "OFFICE-20", Expected: "SRV-DHCP1" },
      triage: "Leases vary between clients; wrong gateway/DNS appears.",
      diagnosis: "A rogue DHCP server is answering requests on the VLAN.",
      fix: "Identify and remove rogue server; enforce DHCP snooping on switches; ensure only authorized DHCP is active.",
      validations: ["All clients receive leases from SRV-DHCP1", "Packet capture shows single DHCP source"]
    },
    {
      id: "DHCP-010",
      category: "DHCP",
      title: "Failover load balance skew: one server issues most leases",
      tags: ["Failover", "Load Balance"],
      summary: "After enabling failover, one partner issues far more leases than expected.",
      env: { Servers: "SRV-DHCP1/SRV-DHCP2", Mode: "Load balance" },
      triage: "Lease distribution is uneven; scope utilization seems off.",
      diagnosis: "Partner availability/connectivity is inconsistent or split ratio is misconfigured.",
      fix: "Validate partner health and relationship configuration; confirm load balance percentage and connectivity.",
      validations: ["Failover state Normal", "Lease distribution stabilizes over time"]
    },
    {
      id: "DHCP-011",
      category: "DHCP",
      title: "Relay works but no offers: scope missing or inactive",
      tags: ["Relay Agents", "Scopes"],
      summary: "Gateway forwards DHCP requests, but clients still can’t obtain IPs.",
      env: { Subnet: "10.80.0.0/24", DHCP: "SRV-DHCP1" },
      triage: "DHCP server sees DISCOVER from subnet but does not offer an address.",
      diagnosis: "No matching active scope exists (or scope is deactivated).",
      fix: "Create/activate the scope for 10.80.0.0/24 and confirm address pool and options.",
      validations: ["DHCPOFFER/DHCPACK observed", "Scope shows active leases"]
    },
    {
      id: "DHCP-012",
      category: "DHCP",
      title: "Server-level MAC allow filtering blocks an entire branch",
      tags: ["MAC Filters", "Allow/Deny"],
      summary: "All devices at BRANCH-03 fail DHCP after a central MAC filtering pilot change.",
      env: { Site: "BRANCH-03", DHCP: "SRV-DHCP1" },
      triage: "Entire branch shows APIPA; relay and scopes are present.",
      diagnosis: "Allow list enabled globally, but branch devices not included so all are denied.",
      fix: "Adjust filtering strategy (scope/policy-based), add approved branch MACs, or disable pilot filtering with approval and documentation.",
      validations: ["Branch devices obtain leases", "Filtering policy still meets requirements"]
    },
    {
      id: "DHCP-013",
      category: "DHCP",
      title: "DHCP server becomes unauthorized after directory changes",
      tags: ["Authorization", "AD"],
      summary: "DHCP service runs but stops issuing leases after AD maintenance.",
      env: { DHCP: "SRV-DHCP1", AD: "Recently modified" },
      triage: "No new leases; DHCP console shows unauthorized state or event logs indicate authorization failure.",
      diagnosis: "DHCP server authorization in AD was removed or broken.",
      fix: "DHCP Manager → right-click server → Authorize. Restart DHCP service if needed.",
      validations: ["Server shows authorized", "New leases are issued normally"]
    },
    {
      id: "DHCP-014",
      category: "DHCP",
      title: "Superscope option inheritance applies wrong gateway",
      tags: ["Scopes", "Options", "Inheritance"],
      summary: "Clients in one subnet receive the gateway for another subnet within a superscope design.",
      env: { Subnets: "10.90.1.0/24 + 10.90.2.0/24", Option: "003 Router" },
      triage: "Clients get IP but cannot route correctly; default gateway is wrong.",
      diagnosis: "Option 003 is set at server level or wrong scope level, overriding per-scope gateway settings.",
      fix: "Remove conflicting server-level option and set option 003 correctly at each scope.",
      validations: ["Each subnet receives correct gateway", "Connectivity restored"]
    },
    {
      id: "DHCP-015",
      category: "DHCP",
      title: "Relay configured but blocked by firewall/ACL",
      tags: ["Relay Agents", "Firewall", "UDP 67/68"],
      summary: "IP helper is configured and scope exists, but DHCP is unreliable after new firewall rules.",
      env: { Subnet: "10.75.0.0/24", DHCP: "SRV-DHCP1" },
      triage: "DHCP server logs are inconsistent; some requests never arrive.",
      diagnosis: "Firewall/ACL blocks DHCP relay traffic (UDP 67/68) between relay and DHCP server.",
      fix: "Update ACL/firewall to allow DHCP relay traffic; confirm routing and no NAT issues affecting relay.",
      validations: ["Consistent DISCOVER/OFFER/ACK", "Firewall logs show no drops"]
    }
  ];

  // ---------------------------
  // Local persistence
  // ---------------------------
  const LS_PREFIX = "sa_academy_ticket_";
  const LS_STUDENT = "sa_academy_student_profile";

  const state = {
    view: "home",
    tab: "DNS",
    selectedId: null,
    ticketsFiltered: [],
    search: ""
  };

  function lsKey(ticketId) { return `${LS_PREFIX}${ticketId}`; }

  function readJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function defaultTicketState() {
    return {
      doneTriage: false,
      doneDiagnosis: false,
      doneFix: false,
      doneNote: false,
      changeNote: "",
      lastSavedAt: null
    };
  }

  function loadTicketState(ticketId) {
    return readJSON(lsKey(ticketId), null) || defaultTicketState();
  }
  function saveTicketState(ticketId, ticketState) {
    writeJSON(lsKey(ticketId), ticketState);
  }
  function clearTicketState(ticketId) {
    try { localStorage.removeItem(lsKey(ticketId)); } catch {}
  }

  // ---------------------------
  // Elements
  // ---------------------------
  const el = {
    // views
    viewHome: $("#view-home"),
    viewLab: $("#view-lab"),

    // top buttons
    btnHome: $("#btn-home"),
    btnReset: $("#btn-reset"),

    // home
    tileGrid: $("#tileGrid"),
    studentName: $("#studentName"),
    courseCode: $("#courseCode"),
    activityDate: $("#activityDate"),
    courseTitle: $("#courseTitle"),

    // lab controls
    tabs: $$(".tab"),
    searchInput: $("#searchInput"),
    btnRandom: $("#btn-random"),
    ticketList: $("#ticketList"),
    ticketDetail: $("#ticketDetail"),

    // health/progress
    overallHealth: $("#overallHealth"),
    dnsHealth: $("#dnsHealth"),
    dhcpHealth: $("#dhcpHealth"),
    progress: $("#progress")
  };

  // ---------------------------
  // Routing (hash-based)
  // ---------------------------
  function setView(view) {
    state.view = view;
    if (view === "home") {
      el.viewHome.classList.remove("hidden");
      el.viewLab.classList.add("hidden");
      location.hash = "#home";
    } else {
      el.viewHome.classList.add("hidden");
      el.viewLab.classList.remove("hidden");
      location.hash = "#dns-dhcp";
    }
  }

  function syncRouteFromHash() {
    const h = (location.hash || "#home").toLowerCase();
    if (h === "#dns-dhcp") setView("lab");
    else setView("home");
  }

  // ---------------------------
  // Home rendering
  // ---------------------------
  function renderTiles() {
    el.tileGrid.innerHTML = "";

    for (const lab of LABS) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");

      const pill =
        lab.status === "active"
          ? `<span class="pill small active">Active</span>`
          : `<span class="pill small soon">Coming soon</span>`;

      tile.innerHTML = `
        <div class="tile-title">${escapeHtml(lab.title)}</div>
        <div class="tile-sub">${escapeHtml(lab.desc)}</div>
        <div class="tile-foot">
          ${pill}
          <span class="pill small">GitHub Pages</span>
          ${lab.id === "dns-dhcp" ? `<span class="pill small">30 tickets</span>` : ``}
        </div>
      `;

      const open = () => {
        if (lab.status !== "active") {
          // keep them on home for now
          location.hash = "#home";
          return;
        }
        location.hash = lab.hash;
        syncRouteFromHash();
        // select first ticket
        applyFiltersAndRender();
        if (!state.selectedId && state.ticketsFiltered[0]) {
          selectTicket(state.ticketsFiltered[0].id);
        }
      };

      tile.addEventListener("click", open);
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });

      el.tileGrid.appendChild(tile);
    }
  }

  function loadStudentProfile() {
    const profile = readJSON(LS_STUDENT, null);
    if (!profile) return;
    el.studentName.value = profile.studentName || "";
    el.courseCode.value = profile.courseCode || "IT 236";
    el.courseTitle.value = profile.courseTitle || "Server Administration";
    if (profile.activityDate) el.activityDate.value = profile.activityDate;
  }

  function saveStudentProfile() {
    writeJSON(LS_STUDENT, {
      studentName: el.studentName.value || "",
      courseCode: el.courseCode.value || "",
      courseTitle: el.courseTitle.value || "",
      activityDate: el.activityDate.value || ""
    });
  }

  // ---------------------------
  // Lab filtering + list
  // ---------------------------
  function ticketMatches(t, q) {
    if (!q) return true;
    const hay = [
      t.id, t.category, t.title, t.summary,
      (t.tags || []).join(" "),
      t.triage, t.diagnosis, t.fix,
      ...(t.validations || [])
    ].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function applyFiltersAndRender() {
    const q = (el.searchInput.value || "").trim();
    state.search = q;

    state.ticketsFiltered = TICKETS.filter((t) => {
      const tabOk = state.tab === "ALL" ? true : t.category === state.tab;
      const qOk = ticketMatches(t, q);
      return tabOk && qOk;
    });

    renderTicketList();
    updateProgressAndHealth();
  }

  function renderTicketList() {
    el.ticketList.innerHTML = "";

    if (!state.ticketsFiltered.length) {
      const empty = document.createElement("div");
      empty.className = "card";
      empty.innerHTML = `
        <div class="card-title">No tickets match your filters</div>
        <div class="card-desc">Try clearing search or switching tabs.</div>
      `;
      el.ticketList.appendChild(empty);
      return;
    }

    for (const t of state.ticketsFiltered) {
      const card = document.createElement("div");
      card.className = "card" + (t.id === state.selectedId ? " selected" : "");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");

      const badgeClass = t.category === "DNS" ? "dns" : "dhcp";
      const tags = (t.tags || []).slice(0, 4).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join("");

      card.innerHTML = `
        <div class="card-top">
          <div>
            <div class="card-title">${escapeHtml(t.title)}</div>
            <div class="card-desc">${escapeHtml(truncate(t.summary, 120))}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <div class="card-meta">${escapeHtml(t.id)}</div>
            <span class="badge ${badgeClass}">${escapeHtml(t.category)}</span>
          </div>
        </div>
        <div class="tags">${tags}</div>
      `;

      const open = () => selectTicket(t.id);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });

      el.ticketList.appendChild(card);
    }
  }

  // ---------------------------
  // Ticket detail + workflow
  // ---------------------------
  function selectTicket(ticketId) {
    const t = TICKETS.find(x => x.id === ticketId);
    if (!t) return;

    state.selectedId = ticketId;
    renderTicketList();

    const s = loadTicketState(ticketId);

    el.ticketDetail.innerHTML = `
      <div class="detail-head">
        <div class="detail-hgroup">
          <div class="detail-id">${escapeHtml(t.id)} • ${escapeHtml(t.category)}</div>
          <div class="detail-title">${escapeHtml(t.title)}</div>
          <div class="card-desc" style="margin-top:8px;max-width:95ch;">${escapeHtml(t.summary)}</div>

          <div class="env-grid">
            ${Object.entries(t.env || {}).map(([k,v]) => `
              <div class="env">
                <div class="env-k">${escapeHtml(k)}</div>
                <div class="env-v">${escapeHtml(v)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="steps">
        ${stepTemplate(1, "Triage (Symptom)", "What the user/system reports or what monitoring shows.", "doneTriage", t.triage, s.doneTriage)}
        ${stepTemplate(2, "Diagnosis (Root Cause)", "What is actually wrong (most likely cause).", "doneDiagnosis", t.diagnosis, s.doneDiagnosis)}
        ${stepTemplate(3, "Fix (GUI Action)", "What you would click/configure in Windows tools (DNS/DHCP MMC).", "doneFix", t.fix, s.doneFix)}
        ${noteStepTemplate(4, "Change Note (Text Entry)", "Write a short change record (what/why/impact/validation).", s)}
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="card-title">Suggested Validation Checks</div>
        <div class="card-desc" style="margin-top:6px;">Use these to confirm your fix worked.</div>
        <div style="margin-top:10px;color:rgba(238,245,255,.88);font-weight:650;line-height:1.7;">
          <ul style="margin:0;padding-left:18px;">
            ${(t.validations || ["No validations provided."]).map(v => `<li>${escapeHtml(v)}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    wireTicketDetailHandlers(ticketId);
    updateProgressAndHealth();
  }

  function stepTemplate(num, title, hint, key, text, checked) {
    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">${num}</div>
            <div>
              <div class="step-title">${escapeHtml(title)}</div>
              <div class="step-hint">${escapeHtml(hint)}</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-step="${key}" ${checked ? "checked" : ""}/>
            Done
          </label>
        </div>
        <div class="step-body">${escapeHtml(text)}</div>
      </div>
    `;
  }

  function noteStepTemplate(num, title, hint, s) {
    return `
      <div class="step">
        <div class="step-head">
          <div class="step-left">
            <div class="step-num">${num}</div>
            <div>
              <div class="step-title">${escapeHtml(title)}</div>
              <div class="step-hint">${escapeHtml(hint)}</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-step="doneNote" ${s.doneNote ? "checked" : ""}/>
            Done
          </label>
        </div>
        <div class="step-body">
          <textarea id="changeNote" rows="7" placeholder="Document your change: what you changed, why, impact, and how you validated...">${escapeHtml(s.changeNote || "")}</textarea>
          <div class="note-actions">
            <button id="btn-save" class="btn" type="button">Save Note</button>
            <button id="btn-copy" class="btn" type="button">Copy Note</button>
            <span class="mini-muted" id="savedHint">${s.lastSavedAt ? "Saved locally." : "Not saved yet."}</span>
          </div>
        </div>
      </div>
    `;
  }

  function wireTicketDetailHandlers(ticketId) {
    const s = loadTicketState(ticketId);

    // step checkboxes
    $$("#ticketDetail input[type='checkbox'][data-step]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-step");
        const next = loadTicketState(ticketId);
        next[key] = cb.checked;
        // note: change note saved separately
        saveTicketState(ticketId, next);
        updateProgressAndHealth();
      });
    });

    const note = $("#changeNote");
    const btnSave = $("#btn-save");
    const btnCopy = $("#btn-copy");
    const savedHint = $("#savedHint");

    if (note) {
      note.addEventListener("input", () => {
        const next = loadTicketState(ticketId);
        next.changeNote = note.value;
        saveTicketState(ticketId, next);
      });
    }

    if (btnSave) {
      btnSave.addEventListener("click", () => {
        const next = loadTicketState(ticketId);
        next.changeNote = note ? note.value : next.changeNote;
        next.lastSavedAt = Date.now();
        saveTicketState(ticketId, next);
        if (savedHint) savedHint.textContent = "Saved locally.";
        updateProgressAndHealth();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener("click", async () => {
        const txt = (note && note.value) ? note.value : "";
        if (!txt.trim()) return;
        try {
          await navigator.clipboard.writeText(txt);
        } catch {
          // fallback
          if (note) { note.select(); document.execCommand("copy"); }
        }
      });
    }
  }

  // ---------------------------
  // Progress + health
  // ---------------------------
  function computeProgress() {
    let done = 0;
    let dnsDone = 0;
    let dhcpDone = 0;
    let dnsTotal = 0;
    let dhcpTotal = 0;

    for (const t of TICKETS) {
      const s = loadTicketState(t.id);
      const complete = s.doneTriage && s.doneDiagnosis && s.doneFix && s.doneNote;
      if (t.category === "DNS") dnsTotal++;
      else dhcpTotal++;

      if (complete) {
        done++;
        if (t.category === "DNS") dnsDone++;
        else dhcpDone++;
      }
    }
    return { done, total: TICKETS.length, dnsDone, dnsTotal, dhcpDone, dhcpTotal };
  }

  function percent(x, y) {
    if (!y) return 100;
    return Math.round((x / y) * 100);
  }

  function setHealthPill(node, label, pct) {
    node.textContent = `${label}: ${pct}%`;
    node.classList.remove("good", "warn", "bad");
    if (pct >= 85) node.classList.add("good");
    else if (pct >= 60) node.classList.add("warn");
    else node.classList.add("bad");
  }

  function updateProgressAndHealth() {
    const p = computeProgress();
    el.progress.textContent = `Progress: ${p.done}/${p.total}`;

    // only meaningful in lab view
    if (state.view === "lab") {
      const overall = percent(p.done, p.total);
      const dnsPct = percent(p.dnsDone, p.dnsTotal);
      const dhcpPct = percent(p.dhcpDone, p.dhcpTotal);

      setHealthPill(el.overallHealth, "Overall Health", overall);
      setHealthPill(el.dnsHealth, "DNS Health", dnsPct);
      setHealthPill(el.dhcpHealth, "DHCP Health", dhcpPct);
    }
  }

  // ---------------------------
  // Lab reset
  // ---------------------------
  function resetLab() {
    for (const t of TICKETS) clearTicketState(t.id);
    state.selectedId = null;
    applyFiltersAndRender();
    el.ticketDetail.innerHTML = `
      <div class="card">
        <div class="card-title">Select a ticket</div>
        <div class="card-desc">Your workflow steps and notes were reset for this lab.</div>
      </div>
    `;
    updateProgressAndHealth();
  }

  // ---------------------------
  // Tabs
  // ---------------------------
  function setTab(tab) {
    state.tab = tab;
    el.tabs.forEach(btn => {
      const isActive = btn.getAttribute("data-tab") === tab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    applyFiltersAndRender();

    // maintain selection if filtered out
    if (state.selectedId) {
      const still = state.ticketsFiltered.some(t => t.id === state.selectedId);
      if (!still) {
        state.selectedId = null;
        el.ticketDetail.innerHTML = `
          <div class="card">
            <div class="card-title">Select a ticket</div>
            <div class="card-desc">Your previous ticket is hidden by the current filter/tab.</div>
          </div>
        `;
      }
    }
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  function truncate(s, n) {
    const str = String(s || "");
    return str.length <= n ? str : str.slice(0, n - 1) + "…";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // Wire events + init
  // ---------------------------
  function init() {
    // date default
    if (el.activityDate && !el.activityDate.value) {
      const d = new Date();
      const pad = (x) => String(x).padStart(2, "0");
      el.activityDate.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    renderTiles();
    loadStudentProfile();

    // persist student fields
    [el.studentName, el.courseCode, el.courseTitle, el.activityDate].forEach(inp => {
      if (!inp) return;
      inp.addEventListener("input", saveStudentProfile);
      inp.addEventListener("change", saveStudentProfile);
    });

    // routing
    window.addEventListener("hashchange", syncRouteFromHash);
    syncRouteFromHash();

    // top buttons
    el.btnHome.addEventListener("click", () => { location.hash = "#home"; syncRouteFromHash(); });
    el.btnReset.addEventListener("click", () => {
      if (state.view !== "lab") return;
      resetLab();
    });

    // tabs
    el.tabs.forEach(btn => {
      btn.addEventListener("click", () => setTab(btn.getAttribute("data-tab")));
    });

    // search
    el.searchInput.addEventListener("input", () => applyFiltersAndRender());

    // random
    el.btnRandom.addEventListener("click", () => {
      if (!state.ticketsFiltered.length) return;
      const pick = state.ticketsFiltered[Math.floor(Math.random() * state.ticketsFiltered.length)];
      selectTicket(pick.id);
    });

    // initial lab detail placeholder
    el.ticketDetail.innerHTML = `
      <div class="card">
        <div class="card-title">Select a ticket</div>
        <div class="card-desc">Choose a ticket from the queue to start the 4-step workflow.</div>
      </div>
    `;

    // default tab
    setTab("DNS");
    applyFiltersAndRender();
    updateProgressAndHealth();
  }

  // Ensure the correct view is displayed after route sync
  const _origSetView = setView;
  function setView(view) {
    _origSetView(view);
    updateProgressAndHealth();
    if (view === "lab") {
      // refresh list/detail when entering lab
      applyFiltersAndRender();
      if (!state.selectedId && state.ticketsFiltered[0]) selectTicket(state.ticketsFiltered[0].id);
    }
  }

  // override the earlier reference (function hoisting aside)
  // eslint-disable-next-line no-global-assign
  window.__setView = setView; // harmless debug hook

  // patch syncRouteFromHash to use updated setView
  function syncRouteFromHashPatched() {
    const h = (location.hash || "#home").toLowerCase();
    if (h === "#dns-dhcp") setView("lab");
    else setView("home");
  }
  // replace listener call targets
  // (safe: init() binds hashchange after this assignment)
  // eslint-disable-next-line no-func-assign
  syncRouteFromHash = syncRouteFromHashPatched;

  init();
})();
