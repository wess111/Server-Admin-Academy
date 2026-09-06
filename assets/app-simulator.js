// Compatibility entry point for PC Simulator v2.7.
// The page keeps this stable filename while the scenario engine is versioned separately.
(() => {
  document.addEventListener('DOMContentLoaded',()=>{
    const version=document.querySelector('.simVersionFooter strong');
    if(version)version.textContent='v2.7.0';
  });
  const script=document.createElement('script');
  script.src='./assets/app-simulator-v2.7.js?v=2.7.0';
  script.async=false;
  document.head.appendChild(script);
})();
