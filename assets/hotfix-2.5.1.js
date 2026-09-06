// PC Simulator compatibility hotfix retained from v2.5.1.
// v2.5 migrated memory state from a single `ram` value to the `rams` collection,
// but one compatibility expression still references the removed global identifier.
window.ram = true;

// Load the v2.6.1 layout polish after the organized v2.6 motherboard stylesheet.
const polish261 = document.createElement('link');
polish261.rel = 'stylesheet';
polish261.href = './assets/motherboard-v2.6.1-polish.css?v=2.6.1';
document.head.appendChild(polish261);

// Keep the visible build marker synchronized with the deployed development layout.
document.addEventListener('DOMContentLoaded',()=>{
  const version=document.querySelector('.simVersionFooter strong');
  if(version) version.textContent='v2.6.1';
});
