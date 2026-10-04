/*
  app.js: routing (#/lesson-id), sidebar, progress, listen mode, offline save, table of contents.
  Lessons live in content/lessons/<id>.js and call Lesson.register({...}).
*/
(function () {
  const { h, render } = window.Components;
  const CACHE = 'ztu-v16';
  const $ = id => document.getElementById(id);
  const main = $('main'), nav = $('nav'), toc = $('toc'), side = $('side');

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off: progress just won't persist */ } },
  };

  /* Language: 'hi' = Hinglish (default), 'en' = simple English. English lessons live in content/lessons/en/<id>.js */
  let lang = store.get('ztu-lang', 'hi') === 'en' ? 'en' : 'hi';
  window.APP_LANG = lang;
  const U = {
    hi: { loading: 'Lesson load ho raha hai…', notFound: 'Lesson file nahi mili', notFoundP: id => `Expected <code>content/lessons/${id}.js</code>. Agar tum offline ho, pehle online aakar "Save offline" dabao.`,
      phase: 'Phase', min: 'min', listen: 'Listen', stop: 'Stop listening', noListen: 'Listen not supported here', markDone: 'Mark as complete', undo: 'Completed. Undo?',
      prev: 'Previous', next: 'Next', soon: 'soon', onPage: 'On this page', progress: 'Your progress', lessons: 'lessons', search: 'Topic dhoondho: cache, kafka, uber',
      soonBox: note => `<p><strong>Ye lesson abhi likha ja raha hai.</strong> Roadmap mein ye station hai, aur iski lesson file jald hi yahan add ho jayegi.</p>${note ? `<p>Isme kya hoga: ${note}</p>` : ''}`,
      prevReady: 'Pichhla ready lesson', nextReady: 'Agla ready lesson', langBtn: 'English', langLabel: 'Switch to simple English',
      enMissing: '', track: 'Course track' },
    en: { loading: 'Loading the lesson…', notFound: 'Lesson file not found', notFoundP: id => `Expected <code>content/lessons/en/${id}.js</code>. If you are offline, come online once and press "Save offline".`,
      phase: 'Phase', min: 'min', listen: 'Listen', stop: 'Stop listening', noListen: 'Listening is not supported here', markDone: 'Mark as complete', undo: 'Completed. Undo?',
      prev: 'Previous', next: 'Next', soon: 'soon', onPage: 'On this page', progress: 'Your progress', lessons: 'lessons', search: 'Search topics: cache, kafka, uber',
      soonBox: () => '<p><strong>This lesson is still being written.</strong> It is on the roadmap and will appear here soon.</p>',
      prevReady: 'Previous ready lesson', nextReady: 'Next ready lesson', langBtn: 'Hinglish', langLabel: 'Switch to Hinglish',
      enMissing: 'The English version of this lesson is not ready yet, so it is shown in Hinglish for now.', track: 'Course track' },
  };
  const u = k => U[lang][k];
  const tTitle = l => (lang === 'en' && window.TITLES_EN && window.TITLES_EN[l.id]) || l.title;
  const tPhase = ph => (lang === 'en' && ph.title_en) || ph.title;

  /* Flatten the curriculum into an ordered list */
  const ALL = [];
  window.CURRICULUM.forEach(ph => ph.groups.forEach(g => g.lessons.forEach(([id, title, ready]) =>
    ALL.push({ id, title, ready: !!ready, phase: ph, group: g.title }))));
  const byId = {};
  ALL.forEach((l, i) => { l.i = i; byId[l.id] = l; });
  const READY = ALL.filter(l => l.ready);

  /* Two tracks: system design ('sd', the default) and AI Agents ('ai'), chosen with the tabs above the nav */
  const trackOf = id => byId[id].phase.track || 'sd';
  let track = store.get('ztu-track', 'sd');

  let done = new Set(store.get('ztu-done', []));
  let waiting = null, loadingLang = 'hi';

  window.Lesson = {
    store: {},
    register(l) {
      this.store[loadingLang + ':' + l.id] = l;
      if (waiting === l.id) { waiting = null; renderLesson(l); }
    },
  };

  /* ------------------------------------------------------------- SIDEBAR */
  function buildNav() {
    nav.innerHTML = '';
    window.CURRICULUM.forEach(ph => {
      const sec = h('section', 'ph');
      sec.dataset.ph = ph.id;
      sec.dataset.track = ph.track || 'sd';
      const ids = ph.groups.flatMap(g => g.lessons.map(l => l[0]));
      const head = h('button', 'ph-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', 'false');
      head.innerHTML = `<span class="ph-num">${ph.num}</span><span class="ph-title">${tPhase(ph)}</span><span class="ph-count" data-count="${ph.id}"></span>`;
      head.onclick = () => togglePhase(sec);
      const body = h('div', 'ph-body');
      ph.groups.forEach(g => {
        if (g.title) body.appendChild(h('div', 'grp', g.title));
        g.lessons.forEach(([id, title0, ready]) => {
          const title = tTitle({ id, title: title0 });
          const a = h('a', 'lk' + (ready ? '' : ' soon'));
          a.href = '#/' + id;
          a.dataset.id = id;
          a.innerHTML = `<span class="tick" aria-hidden="true"></span><span class="lk-t">${title}</span>${ready ? '' : `<span class="soon-tag">${u('soon')}</span>`}`;
          body.appendChild(a);
        });
      });
      sec.append(head, body);
      sec._ids = ids;
      nav.appendChild(sec);
    });
    applyTrack();
  }

  function buildTabs() {
    const tabs = h('div', 'tracks');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Course track');
    [['sd', 'System Design'], ['ai', 'AI Agents']].forEach(([k, label]) => {
      const b = h('button', 'track-tab', label);
      b.type = 'button';
      b.dataset.track = k;
      b.setAttribute('role', 'tab');
      b.onclick = () => setTrack(k, true);
      tabs.appendChild(b);
    });
    side.querySelector('.side-head').prepend(tabs);
  }

  function setTrack(k, jump) {
    if (k === track && !jump) return;
    track = k;
    store.set('ztu-track', k);
    applyTrack();
    // Tapping the other tab opens that track's first lesson, unless we are already inside it
    if (jump && current && trackOf(current) !== k) {
      const first = READY.find(l => trackOf(l.id) === k) || ALL.find(l => trackOf(l.id) === k);
      if (first) location.hash = '#/' + first.id;
    }
  }

  function applyTrack() {
    side.querySelectorAll('.track-tab').forEach(b => {
      const on = b.dataset.track === track;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
    });
    const q = $('search').value.trim();
    nav.querySelectorAll('.ph').forEach(sec => { if (!q) sec.style.display = sec.dataset.track === track ? '' : 'none'; });
    updateProgress();
  }

  function togglePhase(sec, force) {
    const open = force != null ? force : !sec.classList.contains('open');
    sec.classList.toggle('open', open);
    sec.querySelector('.ph-head').setAttribute('aria-expanded', open);
  }

  function updateProgress() {
    const inTrack = READY.filter(l => trackOf(l.id) === track);
    const doneReady = inTrack.filter(l => done.has(l.id)).length;
    $('progText').textContent = `${doneReady} / ${inTrack.length} ${u('lessons')}`;
    $('progBar').style.width = (inTrack.length ? (doneReady / inTrack.length) * 100 : 0) + '%';
    nav.querySelectorAll('.lk').forEach(a => a.classList.toggle('done', done.has(a.dataset.id)));
    nav.querySelectorAll('.ph').forEach(sec => {
      const ready = sec._ids.filter(id => byId[id].ready);
      const c = sec.querySelector('.ph-count');
      c.textContent = ready.length ? `${ready.filter(id => done.has(id)).length}/${ready.length}` : '';
    });
  }

  $('search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    nav.querySelectorAll('.ph').forEach(sec => {
      let any = false;
      sec.querySelectorAll('.lk').forEach(a => {
        const hit = !q || a.textContent.toLowerCase().includes(q) || a.dataset.id.includes(q);
        a.style.display = hit ? '' : 'none';
        if (hit) any = true;
      });
      sec.querySelectorAll('.grp').forEach(g => { g.style.display = q ? 'none' : ''; });
      sec.style.display = any ? '' : 'none';
      if (q) togglePhase(sec, any);
    });
    if (!q) { applyTrack(); markActive(current); }
  });

  /* ---------------------------------------------------------------- ROUTER */
  let current = null;
  function route() {
    stopListen();
    let id = location.hash.replace(/^#\/?/, '') || 'welcome';
    if (!byId[id]) id = 'welcome';
    current = id;
    setTrack(trackOf(id));
    markActive(id);
    closeSide();
    const meta = byId[id];
    document.title = tTitle(meta) + ' | Scalecraft';
    if (!meta.ready) return renderSoon(meta);
    load(id, lang);
  }

  // Load a lesson file in the chosen language. English falls back to Hinglish (with a note) if missing.
  function load(id, lg) {
    if (Lesson.store[lg + ':' + id]) return renderLesson(Lesson.store[lg + ':' + id]);
    main.innerHTML = `<div class="loading">${u('loading')}</div>`;
    toc.innerHTML = '';
    waiting = id;
    loadingLang = lg;
    const s = document.createElement('script');
    s.src = (lg === 'en' ? `content/lessons/en/${id}.js` : `content/lessons/${id}.js`) + `?v=${CACHE}`;
    s.onerror = () => {
      if (lg === 'en') { if (current === id) load(id, 'hi'); return; }
      waiting = null;
      main.innerHTML = '';
      main.appendChild(h('div', 'empty', `<h1>${u('notFound')}</h1><p>${u('notFoundP')(id)}</p>`));
    };
    document.body.appendChild(s);
  }

  function markActive(id) {
    nav.querySelectorAll('.lk').forEach(a => {
      const on = a.dataset.id === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const ph = byId[id] && byId[id].phase.id;
    nav.querySelectorAll('.ph').forEach(sec => { if (sec.dataset.ph === ph) togglePhase(sec, true); });
    const act = nav.querySelector('.lk.active');
    if (act) act.scrollIntoView({ block: 'nearest' });
  }

  /* ---------------------------------------------------------- LESSON PAGE */
  function header(meta, l) {
    const head = h('header', 'lesson-head');
    const crumb = [meta.phase.num !== '0' && meta.phase.num !== '+' ? `${u('phase')} ${meta.phase.num}: ${tPhase(meta.phase)}` : tPhase(meta.phase), meta.group].filter(Boolean).join(' / ');
    head.appendChild(h('div', 'crumb', crumb));
    const t = h('h1', null, l ? l.title : tTitle(meta));
    head.appendChild(t);
    if (l && l.summary) { const p = h('p', 'lede', l.summary); p.dataset.speak = ''; head.appendChild(p); }
    if (l) {
      const row = h('div', 'meta-row');
      row.appendChild(h('span', 'meta', `${l.minutes || 8} ${u('min')}`));
      const lb = h('button', 'btn ghost small', u('listen'));
      lb.type = 'button';
      lb.id = 'listenBtn';
      lb.onclick = () => toggleListen(lb);
      row.appendChild(lb);
      head.appendChild(row);
    }
    return head;
  }

  function renderLesson(l) {
    const meta = byId[l.id];
    main.innerHTML = '';
    const art = h('article', 'lesson');
    art.appendChild(header(meta, l));
    if (lang === 'en' && !Lesson.store['en:' + l.id]) art.appendChild(h('div', 'callout c-warn en-missing', `<div class="callout-label">Note</div><div class="callout-body">${u('enMissing')}</div>`));
    l.blocks.forEach(b => {
      try { art.appendChild(render(b)); }
      catch (err) { console.error('Block failed', b, err); }
    });
    art.appendChild(footer(meta));
    main.appendChild(art);
    buildToc(art);
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  function renderSoon(meta) {
    main.innerHTML = '';
    const art = h('article', 'lesson');
    art.appendChild(header(meta, null));
    const note = (window.COMING_SOON_NOTES || {})[meta.id];
    const box = h('div', 'soon-box');
    box.innerHTML = u('soonBox')(lang === 'en' ? '' : note);
    art.appendChild(box);
    const nextReady = READY.find(l => l.i > meta.i) || READY[0];
    const prevReady = [...READY].reverse().find(l => l.i < meta.i);
    const row = h('div', 'soon-actions');
    if (prevReady) row.appendChild(Object.assign(h('a', 'btn ghost', `${u('prevReady')}: ${tTitle(prevReady)}`), { href: '#/' + prevReady.id }));
    if (nextReady) row.appendChild(Object.assign(h('a', 'btn primary', `${u('nextReady')}: ${tTitle(nextReady)}`), { href: '#/' + nextReady.id }));
    art.appendChild(row);
    main.appendChild(art);
    toc.innerHTML = '';
    window.scrollTo(0, 0);
  }

  function footer(meta) {
    const f = h('footer', 'lesson-foot');
    const cb = h('button', 'btn ' + (done.has(meta.id) ? 'ghost' : 'primary'));
    cb.type = 'button';
    const paint = () => { cb.textContent = done.has(meta.id) ? u('undo') : u('markDone'); cb.className = 'btn ' + (done.has(meta.id) ? 'ghost' : 'primary'); };
    paint();
    cb.onclick = () => {
      if (done.has(meta.id)) done.delete(meta.id); else done.add(meta.id);
      store.set('ztu-done', [...done]);
      paint(); updateProgress();
    };
    f.appendChild(cb);
    const pn = h('nav', 'pn');
    pn.setAttribute('aria-label', 'Previous and next lesson');
    const prev = ALL[meta.i - 1], next = ALL[meta.i + 1];
    if (prev) pn.appendChild(Object.assign(h('a', 'pn-card', `<span>${u('prev')}</span><strong>${tTitle(prev)}</strong>`), { href: '#/' + prev.id }));
    else pn.appendChild(h('span'));
    if (next) pn.appendChild(Object.assign(h('a', 'pn-card next', `<span>${u('next')}${next.ready ? '' : ` (${u('soon')})`}</span><strong>${tTitle(next)}</strong>`), { href: '#/' + next.id }));
    f.appendChild(pn);
    return f;
  }

  let tocObs = null;
  function buildToc(art) {
    toc.innerHTML = '';
    if (tocObs) tocObs.disconnect();
    const hs = [...art.querySelectorAll('h2')];
    if (!hs.length) return;
    toc.appendChild(h('div', 'toc-title', u('onPage')));
    const links = hs.map(hd => {
      const a = h('a', null, hd.textContent);
      a.href = '#/' + current;
      a.onclick = e => { e.preventDefault(); hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      toc.appendChild(a);
      return a;
    });
    tocObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const k = hs.indexOf(en.target);
          links.forEach((l, j) => l.classList.toggle('on', j === k));
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    hs.forEach(x => tocObs.observe(x));
  }

  /* ------------------------------------------------------- ROADMAP BLOCK */
  function roadmapBlock(tr) {
    const w = h('div', 'roadmap');
    window.CURRICULUM.filter(p => p.num !== '0' && p.num !== '+' && (p.track || 'sd') === (tr || 'sd')).forEach(ph => {
      const ids = ph.groups.flatMap(g => g.lessons.map(l => l[0]));
      const ready = ids.filter(id => byId[id].ready);
      const first = byId[ready[0] || ids[0]];
      const a = h('a', 'rm-stop');
      a.href = '#/' + first.id;
      a.innerHTML = `<span class="rm-num">${ph.num}</span><span class="rm-body"><strong>${tPhase(ph)}</strong><span>${ph.weeks} &nbsp; ${ids.length} lessons${ready.length ? `, ${ready.length} ready` : ''}</span></span>`;
      w.appendChild(a);
    });
    return w;
  }
  window.App = { roadmapBlock };

  /* ------------------------------------------------------------ LISTEN */
  let speaking = false;
  function pickVoice() {
    const v = speechSynthesis.getVoices();
    return (lang === 'en' && v.find(x => x.lang === 'en-US' || x.lang === 'en-GB')) || v.find(x => x.lang === 'en-IN') || v.find(x => x.lang && x.lang.startsWith('hi')) || v.find(x => x.lang && x.lang.startsWith('en')) || null;
  }
  function toggleListen(btn) {
    if (!('speechSynthesis' in window)) { btn.textContent = u('noListen'); return; }
    if (speaking) { stopListen(); return; }
    const parts = [...main.querySelectorAll('[data-speak]')];
    if (!parts.length) return;
    speaking = true;
    btn.textContent = u('stop');
    const voice = pickVoice();
    let k = 0;
    const next = () => {
      main.querySelectorAll('.speaking').forEach(e => e.classList.remove('speaking'));
      if (!speaking || k >= parts.length) { stopListen(); return; }
      const el = parts[k++];
      el.classList.add('speaking');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const u = new SpeechSynthesisUtterance(el.innerText);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-IN';
      u.rate = 0.98;
      u.onend = next;
      u.onerror = next;
      speechSynthesis.speak(u);
    };
    next();
  }
  function stopListen() {
    speaking = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    main.querySelectorAll('.speaking').forEach(e => e.classList.remove('speaking'));
    const b = $('listenBtn');
    if (b) b.textContent = u('listen');
  }

  /* ------------------------------------------------------------- OFFLINE */
  $('offlineBtn').addEventListener('click', async () => {
    const btn = $('offlineBtn');
    if (!('caches' in window)) { btn.textContent = 'Offline not supported'; return; }
    btn.textContent = 'Saving…';
    try {
      const files = ['./', 'index.html', 'assets/css/style.css', 'assets/js/curriculum.js', 'assets/js/components.js',
        'assets/js/app.js', 'assets/icon.svg', 'manifest.webmanifest', ...READY.map(l => `content/lessons/${l.id}.js`)];
      const c = await caches.open(CACHE);
      await c.addAll(files);
      await Promise.all(READY.map(l => c.add(`content/lessons/en/${l.id}.js`).catch(() => {})));
      btn.textContent = `Saved ${READY.length} lessons`;
    } catch (e) {
      btn.textContent = 'Save failed, retry';
    }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  } else {
    $('offlineBtn').hidden = true;
  }

  /* ------------------------------------------------------- THEME & MENU */
  $('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ztu-theme', root.dataset.theme); } catch (e) {}
  });
  function openSide() { side.classList.add('open'); document.body.classList.add('side-open'); $('menuBtn').setAttribute('aria-expanded', 'true'); }
  function closeSide() { side.classList.remove('open'); document.body.classList.remove('side-open'); $('menuBtn').setAttribute('aria-expanded', 'false'); }
  $('menuBtn').addEventListener('click', () => side.classList.contains('open') ? closeSide() : openSide());
  $('scrim').addEventListener('click', closeSide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSide(); });

  /* reading progress bar under the top bar */
  const readbar = h('div', 'readbar');
  document.querySelector('.top').appendChild(readbar);
  let rbTick = false;
  const paintRead = () => {
    rbTick = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    readbar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => { if (!rbTick) { rbTick = true; requestAnimationFrame(paintRead); } }, { passive: true });
  addEventListener('hashchange', () => setTimeout(paintRead, 50));

  function applyLangUI() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'hi-Latn';
    const sw = $('langSwitch');
    if (sw) {
      sw.setAttribute('aria-checked', lang === 'en');
      sw.querySelectorAll('.ls-opt').forEach(o => o.classList.toggle('on', o.dataset.lang === lang));
    }
    $('search').placeholder = u('search');
    const pl = document.querySelector('.progress-row span');
    if (pl) pl.textContent = u('progress');
  }
  if ($('langSwitch')) $('langSwitch').addEventListener('click', () => {
    lang = lang === 'en' ? 'hi' : 'en';
    window.APP_LANG = lang;
    store.set('ztu-lang', lang);
    applyLangUI();
    buildNav();
    route();
  });
  applyLangUI();
  buildTabs();
  buildNav();
  window.addEventListener('hashchange', route);
  route();
})();
