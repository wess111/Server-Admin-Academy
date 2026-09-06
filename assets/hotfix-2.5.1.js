// PC Simulator compatibility hotfix retained from v2.5.1.
// v2.5 migrated memory state from a single `ram` value to the `rams` collection,
// but one compatibility expression still references the removed global identifier.
window.ram = true;

// Keep the visible build marker synchronized with the deployed development layout.
document.addEventListener('DOMContentLoaded',()=>{
  const version=document.querySelector('.simVersionFooter strong');
  if(version) version.textContent='v2.6.0';
});
