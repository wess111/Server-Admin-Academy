(() => {
  const $ = (s) => document.querySelector(s);
  const uniq = (arr) => Array.from(new Set(arr)).sort((a,b)=>a.localeCompare(b));
  const esc = (s) => String(s??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

  const els = {
    tracksGrid: $("#tracksGrid"),
    labsGrid: $("#labsGrid"),
    checksGrid: $("#checksGrid"),
    metricTracks: $("#metricTracks"),
    metricLabs: $("#metricLabs"),
    metricChecks: $("#metricChecks"),
    labTrackFilter: $("#labTrackFilter"),
    labSubjectFilter: $("#labSubjectFilter"),
    labSearch: $("#labSearch"),
    checkTrackFilter: $("#checkTrackFilter"),
    checkSubjectFilter: $("#checkSubjectFilter"),
    checkSearch: $("#checkSearch"),
  };

  const debounce=(fn,ms)=>{let t=null;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};

  async function loadCatalog(){
    const r = await fetch("./data/catalog.json", { cache: "no-store" });
    if(!r.ok) throw new Error("catalog.json not found");
    return r.json();
  }

  function setOptions(sel, options){
    const first = sel.querySelector("option")?.outerHTML || "";
    sel.innerHTML = first;
    for(const o of options){
      const opt = document.createElement("option");
      opt.value = o; opt.textContent = o;
      sel.appendChild(opt);
    }
  }

  function tile({title, description, badges, href}){
    const badgeHtml = (badges||[]).map(b => `<span class="badge ${esc(b.class||"")}">${esc(b.text)}</span>`).join("");
    const inner = `
      <div class="tile-title">${esc(title)}</div>
      <div class="tile-desc">${esc(description)}</div>
      <div class="tile-meta">${badgeHtml}</div>
    `;
    return href ? `<a class="tile" href="${href}">${inner}</a>` : `<div class="tile">${inner}</div>`;
  }

  function filterList(list, trackSel, subjSel, q){
    const t = trackSel.value;
    const s = subjSel.value;
    const needle = (q.value||"").trim().toLowerCase();
    return list.filter(x => {
      const okT = t==="all" ? true : x.track===t;
      const okS = s==="all" ? true : x.subject===s;
      const hay = `${x.title} ${x.description} ${x.track} ${x.subject} ${(x.tags||[]).join(" ")}`.toLowerCase();
      const okQ = needle ? hay.includes(needle) : true;
      return okT && okS && okQ;
    });
  }

  function render(catalog){
    els.metricTracks.textContent = String((catalog.tracks||[]).length);
    els.metricLabs.textContent = String((catalog.labs||[]).length);
    els.metricChecks.textContent = String((catalog.knowledgeChecks||[]).length);

    els.tracksGrid.innerHTML = (catalog.tracks||[]).map(t => tile({
      title: t.title,
      description: t.description,
      badges: [{text:t.id, class:"track"}, {text:t.level||"All levels"}]
    })).join("");

    setOptions(els.labTrackFilter, uniq((catalog.labs||[]).map(l=>l.track)));
    setOptions(els.labSubjectFilter, uniq((catalog.labs||[]).map(l=>l.subject)));
    setOptions(els.checkTrackFilter, uniq((catalog.knowledgeChecks||[]).map(k=>k.track)));
    setOptions(els.checkSubjectFilter, uniq((catalog.knowledgeChecks||[]).map(k=>k.subject)));

    const renderLabs = () => {
      const labs = filterList(catalog.labs||[], els.labTrackFilter, els.labSubjectFilter, els.labSearch);
      els.labsGrid.innerHTML = labs.map(l => tile({
        title: l.title,
        description: l.description,
        href: l.status==="active" ? `./activity.html?lab=${encodeURIComponent(l.id)}` : "#checks",
        badges: [
          {text: l.status==="active" ? "Active" : "Coming soon", class: l.status==="active" ? "active" : "soon"},
          {text: l.track, class:"track"},
          {text: l.subject}
        ]
      })).join("") || `<div class="tile"><div class="tile-title">No labs match.</div></div>`;
    };

    const renderChecks = () => {
      const checks = filterList(catalog.knowledgeChecks||[], els.checkTrackFilter, els.checkSubjectFilter, els.checkSearch);
      els.checksGrid.innerHTML = checks.map(k => tile({
        title: k.title,
        description: k.description,
        href: "#checks",
        badges: [
          {text: k.status==="active" ? "Active" : "Coming soon", class: k.status==="active" ? "active" : "soon"},
          {text: k.track, class:"track"},
          {text: k.subject}
        ]
      })).join("") || `<div class="tile"><div class="tile-title">No checks match.</div></div>`;
    };

    els.labTrackFilter.addEventListener("change", renderLabs);
    els.labSubjectFilter.addEventListener("change", renderLabs);
    els.labSearch.addEventListener("input", debounce(renderLabs, 120));
    els.checkTrackFilter.addEventListener("change", renderChecks);
    els.checkSubjectFilter.addEventListener("change", renderChecks);
    els.checkSearch.addEventListener("input", debounce(renderChecks, 120));

    renderLabs();
    renderChecks();
  }

  loadCatalog().then(render).catch(() => {
    document.body.insertAdjacentHTML("afterbegin",
      `<div style="padding:12px 18px;background:#111827;color:#fff">Missing <code>data/catalog.json</code>.</div>`);
  });
})();