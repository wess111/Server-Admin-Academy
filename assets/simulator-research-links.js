(() => {
  const link = document.getElementById('researchPartLink');
  if (!link) return;

  function setResearchLink(button) {
    if (!button) return;
    const name = button.querySelector('strong')?.textContent?.trim();
    if (!name) return;

    // Use a resilient web research query so every real component in every scenario
    // has a working research path even when a manufacturer changes product URLs.
    const query = `${name} official specifications manufacturer`;
    link.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    link.textContent = 'Research specifications ↗';
    link.hidden = false;
    link.setAttribute('aria-label', `Research official specifications for ${name} in a new tab`);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.simPart[data-component]');
    if (!button) return;
    // Run after the simulator's own selection handler so this fallback cannot be
    // hidden by a missing researchUrl in scenario data.
    setTimeout(() => setResearchLink(button), 0);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const button = event.target.closest('.simPart[data-component]');
    if (!button) return;
    setTimeout(() => setResearchLink(button), 0);
  });
})();
