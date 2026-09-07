// Legacy compatibility and approved v2.6.x visual polish retained for PC Simulator v2.7.
const polish261=document.createElement('link');
polish261.rel='stylesheet';
polish261.href='./assets/motherboard-v2.6.1-polish.css?v=2.6.1';
document.head.appendChild(polish261);

const polish262=document.createElement('link');
polish262.rel='stylesheet';
polish262.href='./assets/motherboard-v2.6.2-polish.css?v=2.6.2';
document.head.appendChild(polish262);

document.addEventListener('DOMContentLoaded',()=>{
  const version=document.querySelector('.simVersionFooter strong');
  if(version)version.textContent='v2.7.0';
});
