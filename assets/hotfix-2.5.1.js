// PC Simulator compatibility hotfix retained from v2.5.1.
// v2.5 migrated memory state from a single `ram` value to the `rams` collection,
// but one compatibility expression still references the removed global identifier.
window.ram = true;

// Keep the v2.6.1 CPU/accessibility polish.
const polish261 = document.createElement('link');
polish261.rel = 'stylesheet';
polish261.href = './assets/motherboard-v2.6.1-polish.css?v=2.6.1';
document.head.appendChild(polish261);

// v2.6.2: chipset clearance + compact USB/front-panel headers.
const polish262 = document.createElement('link');
polish262.rel = 'stylesheet';
polish262.href = './assets/motherboard-v2.6.2-polish.css?v=2.6.2';
document.head.appendChild(polish262);

// Keep the visible build marker synchronized with the deployed development layout.
document.addEventListener('DOMContentLoaded',()=>{
  const version=document.querySelector('.simVersionFooter strong');
  if(version) version.textContent='v2.6.2';
});
