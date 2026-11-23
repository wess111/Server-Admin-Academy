(() => {
  const storageKey = "saa-windows-server-lab-path-v1";
  const groups = [...document.querySelectorAll("[data-lab]")].map(section =>
    [...section.querySelectorAll("input[type=checkbox]")]
  );
  const checks = groups.flat();
  const progress = document.querySelector("#lab-progress");

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) {
      checks.forEach(check => { check.checked = saved.includes(check.id); });
    }
  } catch {
    // The checklist remains usable when browser storage is unavailable.
  }

  function updateProgress() {
    let verified = 0;
    for (const group of groups) {
      if (!group.every(check => check.checked)) break;
      verified += 1;
    }
    progress.textContent = `${verified} of ${groups.length} labs verified in sequence`;
  }

  checks.forEach(check => check.addEventListener("change", () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(
        checks.filter(item => item.checked).map(item => item.id)
      ));
    } catch {
      // Still refresh the current session’s progress.
    }
    updateProgress();
  }));
  updateProgress();
  progress.hidden = false;
})();
