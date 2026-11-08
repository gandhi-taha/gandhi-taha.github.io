// Small bits of life for the page: local time, live GitHub list, progress meters, quick menu.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // The old site registered a service worker at the root. Remove it so nobody gets stuck on a cached 2020 page.
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => { if (new URL(r.scope).pathname === '/') r.unregister(); })).catch(() => {});

  // Local time in Luxembourg
  const clock = $('#clock');
  const tick = () => {
    const t = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Luxembourg', weekday:'short', hour:'2-digit', minute:'2-digit'}).format(new Date());
    clock.textContent = `Luxembourg · ${t}`;
  };
  tick(); setInterval(tick, 20000);

  // Reveal sections as they scroll in
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold:.12}) : null;
  document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  // Count the numbers up once
  const nums = document.querySelectorAll('[data-count]');
  const countUp = el => { const n = +el.dataset.count, t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  if (io) { const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { countUp(e.target); io2.unobserve(e.target); } }), {threshold:.6}); nums.forEach(n => io2.observe(n)); }

  // Recently updated repositories, straight from the GitHub API (cached for an hour)
  const COLORS = {Python:'#3572A5', 'Jupyter Notebook':'#DA5B0B', JavaScript:'#f1e05a', TypeScript:'#3178c6', HTML:'#e34c26', CSS:'#563d7c', Svelte:'#ff3e00', C:'#555555', Shell:'#89e051'};
  const SKIP = new Set(['gandhi-taha', 'gandhi-taha.github.io', 'plan', 'security', 'temp']);
  const rel = d => { const s = (new Date(d) - Date.now()) / 1000, f = new Intl.RelativeTimeFormat('en', {numeric:'auto'}); for (const [u, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600]]) if (Math.abs(s) >= n) return f.format(Math.round(s / n), u); return 'just now'; };
  const paint = repos => {
    const list = repos.filter(r => !r.fork && !r.archived && !SKIP.has(r.name) && r.description).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 5);
    $('#repos').innerHTML = list.length ? list.map(r => `<li><a href="${esc(r.html_url)}">${esc(r.name)}</a><span class="meta">${r.language ? `<span class="lang" style="background:${COLORS[r.language] || '#999'}"></span>${esc(r.language)} · ` : ''}${rel(r.pushed_at)}</span><span class="desc">${esc(r.description)}</span></li>`).join('') : '<li><span class="desc">See everything on <a href="https://github.com/gandhi-taha">GitHub</a>.</span></li>';
  };
  const KEY = 'gh-repos-v1';
  let cached = null; try { cached = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (cached && Date.now() - cached.t < 36e5) paint(cached.d);
  else fetch('https://api.github.com/users/gandhi-taha/repos?sort=pushed&per_page=100', {headers:{Accept:'application/vnd.github+json'}})
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => { const slim = d.map(({name, html_url, description, language, pushed_at, fork, archived}) => ({name, html_url, description, language, pushed_at, fork, archived})); try { localStorage.setItem(KEY, JSON.stringify({t:Date.now(), d:slim})); } catch (e) {} paint(slim); })
    .catch(() => cached ? paint(cached.d) : paint([]));

  // Quick menu (Cmd/Ctrl+K or /)
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  $('#cmd-key').textContent = isMac ? '⌘K' : 'Ctrl K';
  const items = [
    {t:'What I work on', h:'Section', go:() => location.hash = '#work'},
    {t:'Projects', h:'Section', go:() => location.hash = '#projects'},
    {t:'Contact', h:'Section', go:() => location.hash = '#contact'},
    {t:'Security notes', h:'/security', go:() => location.href = 'security/'},
    {t:'Sign in to my planner', h:'/plan', go:() => location.href = 'plan/'},
    {t:'LinkedIn', h:'Profile', go:() => location.href = 'https://www.linkedin.com/in/t4gandhi'},
    {t:'GitHub', h:'Profile', go:() => location.href = 'https://github.com/gandhi-taha'},
    {t:'Source of this site', h:'GitHub', go:() => location.href = 'https://github.com/gandhi-taha/gandhi-taha.github.io'}
  ];
  const box = $('#cmd'), input = $('#cmd-input'), ul = $('#cmd-list');
  let shown = items, sel = 0;
  const draw = () => { ul.innerHTML = shown.map((it, i) => `<li role="option" data-i="${i}" class="${i === sel ? 'on' : ''}" aria-selected="${i === sel}">${esc(it.t)}<span>${esc(it.h)}</span></li>`).join('') || '<li>Nothing found</li>'; };
  const open = () => { box.classList.remove('hide'); input.value = ''; shown = items; sel = 0; draw(); setTimeout(() => input.focus(), 10); };
  const close = () => box.classList.add('hide');
  const run = i => { const it = shown[i]; if (!it) return; close(); it.go(); };
  $('#cmd-open').addEventListener('click', open);
  box.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) run(+li.dataset.i); else if (e.target === box) close(); });
  input.addEventListener('input', () => { const q = input.value.trim().toLowerCase(); shown = items.filter(it => (it.t + ' ' + it.h).toLowerCase().includes(q)); sel = 0; draw(); });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement !== input;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && box.classList.contains('hide'))) { e.preventDefault(); return box.classList.contains('hide') ? open() : close(); }
    if (box.classList.contains('hide')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); draw(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); draw(); }
    if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  });
})();
