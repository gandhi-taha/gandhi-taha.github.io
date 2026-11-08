// Small bits of life for the page: local time, theme, live GitHub list, section highlight, quick menu.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store = {get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }};

  // The 2020 site registered a service worker at the root. Remove it so nobody gets stuck on a cached old page.
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (new URL(r.scope).pathname === '/') r.unregister(); })).catch(() => {});

  // Local time in Luxembourg
  const clock = $('#clock');
  const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Luxembourg', hour:'2-digit', minute:'2-digit'}).format(new Date()); };
  tick(); setInterval(tick, 15000);
  $('#year').textContent = new Date().getFullYear();

  // How long at the current company
  document.querySelectorAll('[data-since]').forEach(el => {
    const [y, m] = el.dataset.since.split('-').map(Number), n = new Date();
    const months = (n.getFullYear() - y) * 12 + n.getMonth() + 1 - m, yrs = Math.floor(months / 12), mo = months % 12;
    el.textContent = ' · ' + [yrs ? `${yrs} yr${yrs > 1 ? 's' : ''}` : '', mo ? `${mo} mo` : ''].filter(Boolean).join(' ');
  });

  // Theme: follows the system until you pick one
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const paintMeta = () => document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = isDark() ? '#0c0d0f' : '#f8f7f4');
  $('#theme').addEventListener('click', () => { root.dataset.theme = isDark() ? 'light' : 'dark'; store.set('theme', root.dataset.theme); paintMeta(); });
  if (root.dataset.theme) paintMeta();

  // Highlight the section you're reading in the side menu
  const links = [...document.querySelectorAll('.nav a')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), {rootMargin:'-40% 0px -55% 0px'});
    document.querySelectorAll('main section[id]').forEach(s => io.observe(s));
  }

  // Save as PDF uses the print stylesheet (a plain resume, no contact details)
  const earlier = document.querySelector('.earlier'); let wasOpen = false;
  addEventListener('beforeprint', () => { if (earlier) { wasOpen = earlier.open; earlier.open = true; } });
  addEventListener('afterprint', () => { if (earlier) earlier.open = wasOpen; });
  document.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => print()));

  // Picked repositories get their language, last update and description from the GitHub API (cached for an hour)
  const COLORS = {Python:'#3572A5', 'Jupyter Notebook':'#DA5B0B', JavaScript:'#f1e05a', TypeScript:'#3178c6', HTML:'#e34c26', CSS:'#563d7c', Svelte:'#ff3e00', C:'#555555', Shell:'#89e051'};
  const rel = d => { const s = (new Date(d) - Date.now()) / 1000, f = new Intl.RelativeTimeFormat('en', {numeric:'auto'}); for (const [u, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= n) return f.format(Math.round(s / n), u); return 'just now'; };
  const paint = repos => {
    const by = Object.fromEntries(repos.map(r => [r.name, r]));
    const site = by['gandhi-taha.github.io'];
    if (site) $('#updated').textContent = 'Updated ' + rel(site.pushed_at);
    document.querySelectorAll('#repos [data-repo]').forEach(li => {
      const r = by[li.dataset.repo]; if (!r) return;
      if (r.language) li.querySelector('.rm').innerHTML = `<span class="lang" style="background:${COLORS[r.language] || '#999'}"></span>${esc(r.language)}`;
      if (r.description) li.querySelector('.rd').textContent = r.description;
    });
  };
  const KEY = 'gh-repos-v2';
  let cached = null; try { cached = JSON.parse(store.get(KEY)); } catch (e) {}
  if (cached && Date.now() - cached.t < 36e5) paint(cached.d);
  else fetch('https://api.github.com/users/gandhi-taha/repos?sort=pushed&per_page=100', {headers:{Accept:'application/vnd.github+json'}})
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => { const slim = d.map(({name, html_url, description, language, pushed_at, fork, archived}) => ({name, html_url, description, language, pushed_at, fork, archived})); store.set(KEY, JSON.stringify({t:Date.now(), d:slim})); paint(slim); })
    .catch(() => { if (cached) paint(cached.d); });

  // Quick menu: Ctrl/Cmd K or "/" on desktop, the search button on phones
  const items = [
    {t:'About', h:'Section', go:'#about'},
    {t:'Experience', h:'Section', go:'#experience'},
    {t:'Projects', h:'Section', go:'#projects'},
    {t:'Notes on AI security', h:'Section', go:'#notes'},
    {t:'Education', h:'Section', go:'#education'},
    {t:'Skills and languages', h:'Section', go:'#skills'},
    {t:'Contact', h:'Section', go:'#contact'},
    {t:'Save resume as PDF', h:'Print', go:() => document.querySelector('[data-print]').click()},
    {t:'Switch theme', h:'Light / dark', go:() => $('#theme').click()},
    {t:'Planner', h:'/plan · sign-in', go:'plan/'},
    {t:'French course', h:'/french', go:'french/'},
    {t:'Security notes', h:'/security', go:'security/'},
    {t:'OWASP Top 10 for LLMs', h:'Note', go:'security/ai_security/owasp_llm_top_10/'},
    {t:'Prompt injection', h:'Note', go:'security/ai_security/prompt_injection/'},
    {t:'Agents and MCP', h:'Note', go:'security/ai_security/agents_and_mcp/'},
    {t:'LinkedIn', h:'Profile', go:'https://www.linkedin.com/in/t4gandhi'},
    {t:'GitHub', h:'Profile', go:'https://github.com/gandhi-taha'},
    {t:'Source of this site', h:'GitHub', go:'https://github.com/gandhi-taha/gandhi-taha.github.io'}
  ];
  const box = $('#cmd'), input = $('#cmd-input'), ul = $('#cmd-list');
  let shown = items, sel = 0, lastFocus = null;
  const draw = () => { ul.innerHTML = shown.length ? shown.map((it, i) => `<li role="option" id="o${i}" data-i="${i}" class="${i === sel ? 'on' : ''}" aria-selected="${i === sel}">${esc(it.t)}<span>${esc(it.h)}</span></li>`).join('') : '<li class="empty">Nothing found</li>'; input.setAttribute('aria-activedescendant', shown.length ? 'o' + sel : ''); const on = ul.querySelector('.on'); if (on) on.scrollIntoView({block:'nearest'}); };
  const open = () => { lastFocus = document.activeElement; box.classList.remove('hide'); input.value = ''; shown = items; sel = 0; draw(); requestAnimationFrame(() => input.focus()); };
  const close = () => { box.classList.add('hide'); if (lastFocus) lastFocus.focus(); };
  const run = i => { const it = shown[i]; if (!it) return; close(); if (typeof it.go === 'function') return it.go(); if (it.go.startsWith('#')) { const el = document.querySelector(it.go); if (el) { el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); history.replaceState(null, '', it.go); } return; } location.href = it.go; };
  $('#cmd-open').addEventListener('click', open);
  box.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) run(+li.dataset.i); else if (e.target === box) close(); });
  input.addEventListener('input', () => { const q = input.value.trim().toLowerCase(); shown = items.filter(it => (it.t + ' ' + it.h).toLowerCase().includes(q)); sel = 0; draw(); });
  document.addEventListener('keydown', e => {
    const hidden = box.classList.contains('hide');
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement !== input;
    if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && hidden)) { e.preventDefault(); return hidden ? open() : close(); }
    if (hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    else if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
  });
})();
