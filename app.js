// gandhi-taha.github.io: theme, scroll effects, live bits and the quick menu.
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store = {get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }};

  // The 2020 site registered a service worker at the root. Remove it so nobody gets stuck on a cached old page.
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (new URL(r.scope).pathname === '/') r.unregister(); })).catch(() => {});

  // Local time in Luxembourg, the year, time at the current company
  const clock = $('#clock');
  const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Luxembourg', hour:'2-digit', minute:'2-digit'}).format(new Date()); };
  tick(); setInterval(tick, 15000);
  $('#year').textContent = new Date().getFullYear();
  $$('[data-since]').forEach(el => {
    const [y, m] = el.dataset.since.split('-').map(Number), n = new Date();
    const months = (n.getFullYear() - y) * 12 + n.getMonth() + 1 - m, yrs = Math.floor(months / 12), mo = months % 12;
    el.textContent = ' · ' + [yrs ? `${yrs} yr${yrs > 1 ? 's' : ''}` : '', mo ? `${mo} mo` : ''].filter(Boolean).join(' ');
  });

  // Theme: white by default, dark when you ask for it. The new theme grows out of the button as a circle.
  const themeBtn = $('#theme');
  const isDark = () => root.dataset.theme === 'dark';
  const paint = () => { $('meta[name="theme-color"]').content = isDark() ? '#09090b' : '#ffffff'; themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'); };
  const setTheme = dark => { if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme; store.set('site-theme', dark ? 'dark' : 'light'); paint(); };
  themeBtn.addEventListener('click', () => {
    const next = !isDark();
    if (!document.startViewTransition || calm) return setTheme(next);
    const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() => {
      root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`]}, {duration:600, easing:'cubic-bezier(.4,0,.2,1)', pseudoElement:'::view-transition-new(root)'});
    }).catch(() => {});
  });
  paint();

  // Header turns to glass once you scroll; the nav follows the section you're reading
  const bar = $('#top');
  const onScroll = () => bar.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  const links = $$('.nav a');
  const io = 'IntersectionObserver' in window;
  if (io) {
    const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), {rootMargin:'-45% 0px -50% 0px'});
    $$('main section[id]').forEach(s => spy.observe(s));
  }

  // Little visuals for the numbers
  const fill = (sel, n, f) => { const el = $(sel); if (el) el.innerHTML = Array.from({length:n}, (_, i) => f(i)).join(''); };
  const heights = [.42,.55,.38,.62,.5,.71,.46,.66,.58,.8,.52,.74,.61,.86,.57,.69,.92,.64,.78,.88,.7,.95,.83,1];
  fill('.bars', 24, i => `<i style="--s:${heights[i]};--i:${i}"${i > 20 ? ' class="top"' : ''}></i>`);
  fill('.dots', 21, i => `<i style="--i:${i}"${i % 4 === 0 || i > 16 ? ' class="hot"' : ''}></i>`);
  const ring = $('.ring'); if (ring) ring.insertAdjacentHTML('afterbegin', Array.from({length:12}, (_, i) => `<i style="--i:${i}"></i>`).join(''));
  fill('.cal', 12, i => `<i${i <= new Date().getMonth() ? ' class="on"' : ''}></i>`);
  fill('.wave', 44, i => `<i style="--i:${i};--s:${(.25 + .75 * Math.abs(Math.sin(i * .55) * Math.cos(i * .21))).toFixed(2)}"></i>`);

  // Count numbers up the first time they come into view
  const countUp = el => {
    const to = +el.dataset.count; if (calm) return;
    const t0 = performance.now(), dur = 1300;
    const step = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  };

  // Things slide in as you reach them
  const reveal = el => { el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(countUp); };
  if (io && !calm) {
    const ro = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { reveal(e.target); ro.unobserve(e.target); } }), {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    $$('[data-reveal]').forEach(el => ro.observe(el));
  } else $$('[data-reveal]').forEach(el => el.classList.add('in'));

  // The console types out this year's work
  const lines = $$('#console .ln');
  if (calm || !lines.length) lines.forEach(l => l.classList.add('on'));
  else {
    let i = 0;
    const next = () => {
      const l = lines[i++]; if (!l) return;
      const cmd = !l.classList.contains('out');
      l.classList.add('on'); if (cmd && l.querySelector('.cm')) l.classList.add('typing');
      setTimeout(next, cmd ? 620 : 240);
    };
    setTimeout(next, 700);
  }

  // A soft light follows the pointer over cards and the hero
  if (matchMedia('(hover: hover)').matches && !calm) {
    addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.card');
      if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    }, {passive:true});
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--hx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--hy', (e.clientY - r.top) + 'px'); }, {passive:true});
  }

  // The timeline line fills as you read down it
  const tl = $('#timeline');
  if (tl) {
    let ticking = false;
    const prog = () => { ticking = false; const r = tl.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height)); tl.style.setProperty('--p', p.toFixed(3)); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(prog); } }, {passive:true}); prog();
  }

  // Save as PDF uses the print stylesheet (a plain resume, no contact details)
  const earlier = $('.earlier'); let wasOpen = false;
  addEventListener('beforeprint', () => { $$('[data-reveal]').forEach(el => el.classList.add('in')); if (earlier) { wasOpen = earlier.open; earlier.open = true; } });
  addEventListener('afterprint', () => { if (earlier) earlier.open = wasOpen; });
  $$('[data-print]').forEach(b => b.addEventListener('click', () => print()));

  // Picked repositories get their language from the GitHub API (cached for an hour)
  const COLORS = {Python:'#3572A5', 'Jupyter Notebook':'#DA5B0B', JavaScript:'#f1e05a', TypeScript:'#3178c6', HTML:'#e34c26', CSS:'#563d7c', Svelte:'#ff3e00', C:'#555555', Shell:'#89e051'};
  const rel = d => { const s = (new Date(d) - Date.now()) / 1000, f = new Intl.RelativeTimeFormat('en', {numeric:'auto'}); for (const [u, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= n) return f.format(Math.round(s / n), u); return 'just now'; };
  const paintRepos = repos => {
    const by = Object.fromEntries(repos.map(r => [r.name, r]));
    const site = by['gandhi-taha.github.io'];
    if (site) $('#updated').textContent = 'Updated ' + rel(site.pushed_at);
    $$('#repos [data-repo]').forEach(li => {
      const r = by[li.dataset.repo]; if (!r) return;
      if (r.language) li.querySelector('.rm').innerHTML = `<span class="lang" style="background:${COLORS[r.language] || '#999'}"></span>${esc(r.language)}`;
      if (r.description) li.querySelector('.rd').textContent = r.description;
    });
  };
  const KEY = 'gh-repos-v2';
  let cached = null; try { cached = JSON.parse(store.get(KEY)); } catch (e) {}
  if (cached && Date.now() - cached.t < 36e5) paintRepos(cached.d);
  else fetch('https://api.github.com/users/gandhi-taha/repos?sort=pushed&per_page=100', {headers:{Accept:'application/vnd.github+json'}})
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => { const slim = d.map(({name, html_url, description, language, pushed_at, fork, archived}) => ({name, html_url, description, language, pushed_at, fork, archived})); store.set(KEY, JSON.stringify({t:Date.now(), d:slim})); paintRepos(slim); })
    .catch(() => { if (cached) paintRepos(cached.d); });

  // Quick menu: Ctrl/Cmd K or "/" on desktop, the search button anywhere
  const items = [
    {t:'Impact in 2026', h:'Section', go:'#impact'},
    {t:'Experience', h:'Section', go:'#experience'},
    {t:'Projects', h:'Section', go:'#projects'},
    {t:'Notes on AI security', h:'Section', go:'#notes'},
    {t:'Education and certificates', h:'Section', go:'#about'},
    {t:'Skills', h:'Section', go:'#skills'},
    {t:'Contact', h:'Section', go:'#contact'},
    {t:'Download résumé (PDF)', h:'Print', go:() => print()},
    {t:'Switch light / dark', h:'Theme', go:() => themeBtn.click()},
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
  const run = i => { const it = shown[i]; if (!it) return; close(); if (typeof it.go === 'function') return it.go(); if (it.go.startsWith('#')) { const el = $(it.go); if (el) { el.scrollIntoView({behavior:calm ? 'auto' : 'smooth'}); history.replaceState(null, '', it.go); } return; } location.href = it.go; };
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
