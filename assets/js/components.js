/*
  components.js
  - Flow: interactive architecture diagram with animated request packets
  - Quiz, Think, Compare, Tradeoffs and the other lesson blocks
  - Components.render(block) turns one lesson block into DOM
*/
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const h = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;

  /* UI strings in both languages. window.APP_LANG is 'hi' (Hinglish, default) or 'en' (simple English). */
  const STR = {
    hi: { restart: 'Restart', prev: 'Pichhla step', play: 'Auto play', pause: 'Pause', next: 'Next step', start: 'Start', done: 'Done',
      hint: 'Kisi bhi box par click karo, uska role samjho.', intro: '"Next step" dabao aur request ko chalte hue dekho.',
      complete: 'Scenario complete', completeText: 'Koi doosra scenario try karo, ya "Restart" se isi ko dobara chalao.',
      noInfo: 'Is component ka role upar lesson mein explain kiya gaya hai.', clickInfo: ': click for explanation',
      quiz: 'Quick quiz', right: 'Sahi! ', almost: 'Almost. ', scoreAll: '. Ek dum solid.', scoreSome: '. Galat wale explanation dobara padh lo.',
      gain: 'Kya milta hai', cost: 'Kya chukana padta hai', think: 'Socho, phir answer kholo', sources: 'Sources',
      callout: { why: 'Kyun?', warn: 'Dhyaan do', tip: 'Pro tip', term: 'Naya word', analogy: 'Simple tareeke se', mistake: 'Common beginner confusion', recap: 'Yaad rakho' },
      diagram: 'Poora design, ek nazar mein', allPaths: 'Sab dikhao', diagramHint: 'Kisi bhi box pe click karo. Upar ke buttons se ek-ek raasta highlight karo.',
      stageHint: 'Diagram chauda hai: side mein swipe karo. Active box apne aap screen pe aa jayega.', imgOpen: 'Bada karke dekho', expand: 'Bada karo', close: 'Band karo' },
    en: { restart: 'Restart', prev: 'Previous step', play: 'Auto play', pause: 'Pause', next: 'Next step', start: 'Start', done: 'Done',
      hint: 'Click any box to learn what it does.', intro: 'Press "Next step" and watch the request move.',
      complete: 'Scenario complete', completeText: 'Try another scenario, or press "Restart" to run this one again.',
      noInfo: 'The role of this part is explained in the lesson above.', clickInfo: ': click for explanation',
      quiz: 'Quick quiz', right: 'Correct! ', almost: 'Not quite. ', scoreAll: '. Perfect score.', scoreSome: '. Read the explanations of the ones you missed.',
      gain: 'What we get', cost: 'What we pay', think: 'Think first, then open the answer', sources: 'Sources',
      callout: { why: 'Why?', warn: 'Careful', tip: 'Pro tip', term: 'New word', analogy: 'In simple words', mistake: 'Common beginner mistake', recap: 'Remember' },
      diagram: 'The whole design at a glance', allPaths: 'Show all', diagramHint: 'Click any box. Use the buttons above to highlight one path at a time.',
      stageHint: 'The diagram is wide: swipe sideways. The active box scrolls into view by itself.', imgOpen: 'Open full size', expand: 'Expand', close: 'Close' },
  };
  const T = k => { const d = STR[window.APP_LANG] || STR.hi; return d[k] != null ? d[k] : STR.hi[k]; };

  /* ------------------------------------------------------------------
     FLOW DIAGRAM
     config = {
       title, height, alt,
       nodes: [{ id, label, sub, x, y, w, h, kind, hidden, meter, load, info }],
         x,y = centre of the box. kind = client | net | edge | server | cache | data | queue | threat
       edges: [{ a, b, id, both, dashed, hidden }],
       scenarios: [{ name, intro, steps: [step] }]
     }
     step = {
       title, text (html), msg (monospace message),
       go: 'a>b>c' or ['a>b', 'res:b>a']   prefixes: req: res: bad: evt: lost:
       parallel: true  (run the go paths at the same time)
       flood: { paths: ['users>lb>s1', 'users>lb>s2'], n: 12, kind }
       show: [ids], hide: [ids]   (node or edge ids)
       set:   { nodeId: { state, sub, label, load } }  applied before animation
       after: { ... }                                   applied after animation
       focus: [ids]
     }
     states: down | hit | miss | hot | ok | dim | warn
  ------------------------------------------------------------------- */
  class Flow {
    constructor(root, cfg) {
      this.cfg = cfg;
      this.root = root;
      this.W = cfg.width || 720;
      this.H = cfg.height || 320;
      this.id = 'flow' + (++uid);
      this.scenarios = cfg.scenarios || [{ name: 'Flow', steps: cfg.steps || [] }];
      this.si = 0;
      this.i = -1;
      this.busy = false;
      this.playing = false;
      this.build();
      this.select(0);
    }

    build() {
      const r = this.root;
      r.classList.add('flow');
      if (this.cfg.title) r.appendChild(h('div', 'flow-title', this.cfg.title));

      if (this.scenarios.length > 1) {
        const chips = h('div', 'chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Scenarios');
        this.chipEls = this.scenarios.map((s, k) => {
          const b = h('button', 'chip', s.name);
          b.type = 'button';
          b.onclick = () => this.select(k);
          chips.appendChild(b);
          return b;
        });
        r.appendChild(chips);
      }

      const stage = h('div', 'stage');
      r.appendChild(stage);
      this.stage = stage;
      const hint = h('div', 'stage-hint', T('stageHint'));
      r.appendChild(hint);
      const checkOverflow = () => r.classList.toggle('overflow', stage.scrollWidth > stage.clientWidth + 4);
      if (window.ResizeObserver) new ResizeObserver(checkOverflow).observe(stage);
      setTimeout(checkOverflow, 0);
      const svg = svgEl('svg', { viewBox: `0 0 ${this.W} ${this.H}`, class: 'fsvg', role: 'img',
        'aria-label': this.cfg.alt || 'Interactive architecture diagram' }, stage);
      const defs = svgEl('defs', {}, svg);
      const pat = svgEl('pattern', { id: this.id + 'g', width: 22, height: 22, patternUnits: 'userSpaceOnUse' }, defs);
      svgEl('circle', { cx: 1.5, cy: 1.5, r: 1.1, class: 'griddot' }, pat);
      const mk = svgEl('marker', { id: this.id + 'a', viewBox: '0 0 10 10', refX: 8, refY: 5,
        markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      svgEl('path', { d: 'M1.5 1.5L8.5 5L1.5 8.5', class: 'mk' }, mk);
      svgEl('rect', { x: 0, y: 0, width: this.W, height: this.H, fill: `url(#${this.id}g)` }, svg);

      this.gE = svgEl('g', {}, svg);
      this.gN = svgEl('g', {}, svg);
      this.gP = svgEl('g', {}, svg);

      this.N = {};
      (this.cfg.nodes || []).forEach(n => this.addNode(n));
      this.E = {};
      (this.cfg.edges || []).forEach(e => this.addEdge(e));
      this.refreshEdges();

      this.info = h('div', 'finfo');
      this.info.hidden = true;
      r.appendChild(this.info);

      const panel = h('div', 'fpanel');
      panel.setAttribute('aria-live', 'polite');
      r.appendChild(panel);
      this.dots = h('div', 'fdots');
      this.pt = h('div', 'fstep-title');
      this.pd = h('div', 'fstep-text');
      this.pm = h('pre', 'fmsg');
      panel.append(this.dots, this.pt, this.pd, this.pm);

      const ctrl = h('div', 'fctrl');
      const mkBtn = (txt, cls, fn) => { const b = h('button', 'btn small ' + (cls || ''), txt); b.type = 'button'; b.onclick = fn; ctrl.appendChild(b); return b; };
      this.bRestart = mkBtn(T('restart'), 'ghost', () => this.restart());
      this.bPrev = mkBtn(T('prev'), 'ghost', () => this.prev());
      this.bPlay = mkBtn(T('play'), 'ghost', () => this.togglePlay());
      this.bNext = mkBtn(T('next'), 'primary', () => this.next());
      panel.appendChild(ctrl);
      panel.appendChild(h('div', 'fhint', T('hint')));
    }

    addNode(n) {
      const node = Object.assign({ w: 132, h: 56, kind: 'server' }, n);
      const g = svgEl('g', { class: 'fnode k-' + node.kind, tabindex: 0, role: 'button',
        'aria-label': node.label + (node.info ? T('clickInfo') : '') }, this.gN);
      svgEl('rect', { x: node.x - node.w / 2, y: node.y - node.h / 2, width: node.w, height: node.h, rx: 10, class: 'nb' }, g);
      const hasSub = node.sub != null;
      node.lt = svgEl('text', { x: node.x, y: node.y - (hasSub ? 8 : 0) - (node.meter ? 4 : 0), class: 'nl', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      node.lt.textContent = node.label;
      node.st = svgEl('text', { x: node.x, y: node.y + 11 - (node.meter ? 4 : 0), class: 'ns', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      node.st.textContent = node.sub || '';
      if (node.meter) {
        const mw = node.w - 28, my = node.y + node.h / 2 - 11;
        svgEl('rect', { x: node.x - mw / 2, y: my, width: mw, height: 5, rx: 2.5, class: 'mt' }, g);
        node.mf = svgEl('rect', { x: node.x - mw / 2, y: my, width: 0, height: 5, rx: 2.5, class: 'mf' }, g);
        node.mw = mw;
      }
      node.g = g;
      node.init = { label: node.label, sub: node.sub || '', hidden: !!node.hidden, load: node.load || 0 };
      const open = () => this.showInfo(node);
      g.addEventListener('click', open);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      this.N[node.id] = node;
      this.setLoad(node, node.init.load);
      this.setVisible(node.id, !node.hidden);
    }

    layoutText(n) {
      const hasSub = n.st.textContent !== '';
      n.lt.setAttribute('y', n.y - (hasSub ? 8 : 0) - (n.meter ? 4 : 0));
    }

    addEdge(e) {
      const id = e.id || e.a + '-' + e.b;
      const line = svgEl('line', { class: 'edge' + (e.dashed ? ' dashed' : '') }, this.gE);
      line.setAttribute('marker-end', `url(#${this.id}a)`);
      if (e.both !== false) line.setAttribute('marker-start', `url(#${this.id}a)`);
      this.E[id] = { cfg: e, line, hidden: !!e.hidden, initHidden: !!e.hidden };
    }

    clip(n, tx, ty, pad = 7) {
      const dx = tx - n.x, dy = ty - n.y;
      if (!dx && !dy) return [n.x, n.y];
      const sx = dx ? (n.w / 2 + pad) / Math.abs(dx) : Infinity;
      const sy = dy ? (n.h / 2 + pad) / Math.abs(dy) : Infinity;
      const s = Math.min(sx, sy);
      return [n.x + dx * s, n.y + dy * s];
    }

    refreshEdges() {
      for (const id in this.E) {
        const e = this.E[id], A = this.N[e.cfg.a], B = this.N[e.cfg.b];
        if (!A || !B) continue;
        const [x1, y1] = this.clip(A, B.x, B.y), [x2, y2] = this.clip(B, A.x, A.y);
        e.line.setAttribute('x1', x1); e.line.setAttribute('y1', y1);
        e.line.setAttribute('x2', x2); e.line.setAttribute('y2', y2);
        e.line.style.display = (e.hidden || A.hiddenNow || B.hiddenNow) ? 'none' : '';
      }
    }

    setVisible(id, on) {
      if (this.N[id]) {
        this.N[id].hiddenNow = !on;
        this.N[id].g.style.display = on ? '' : 'none';
        if (on) { this.N[id].g.classList.remove('pop'); void this.N[id].g.getBoundingClientRect(); this.N[id].g.classList.add('pop'); }
      } else if (this.E[id]) {
        this.E[id].hidden = !on;
      }
      this.refreshEdges();
    }

    setLoad(n, pct) {
      if (!n.mf) return;
      const p = Math.max(0, Math.min(100, pct));
      n.mf.setAttribute('width', (n.mw * p) / 100);
      n.mf.setAttribute('class', 'mf' + (p >= 85 ? ' high' : p >= 60 ? ' mid' : ''));
    }

    applySet(set) {
      if (!set) return;
      for (const id in set) {
        const n = this.N[id], o = set[id];
        if (!n) continue;
        if ('state' in o) { if (o.state) n.g.dataset.state = o.state; else delete n.g.dataset.state; }
        if ('sub' in o) { n.st.textContent = o.sub; this.layoutText(n); }
        if ('label' in o) n.lt.textContent = o.label;
        if ('load' in o) this.setLoad(n, o.load);
      }
    }

    applyStatic(s) {
      (s.show || []).forEach(id => this.setVisible(id, true));
      (s.hide || []).forEach(id => this.setVisible(id, false));
      this.applySet(s.set);
      this.applySet(s.after);
    }

    reset() {
      this.gP.innerHTML = '';
      for (const id in this.N) {
        const n = this.N[id];
        n.lt.textContent = n.init.label;
        n.st.textContent = n.init.sub;
        this.layoutText(n);
        delete n.g.dataset.state;
        n.g.classList.remove('focus');
        this.setLoad(n, n.init.load);
        n.hiddenNow = n.init.hidden;
        n.g.style.display = n.init.hidden ? 'none' : '';
      }
      for (const id in this.E) this.E[id].hidden = this.E[id].initHidden;
      this.refreshEdges();
    }

    panTo(id) {
      const st = this.stage, n = id && this.N[id];
      if (!n || st.scrollWidth <= st.clientWidth + 4) return;
      const scale = st.scrollWidth / this.W;
      const left = n.x * scale - st.clientWidth / 2;
      st.scrollTo({ left: Math.max(0, left), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    focus(ids) {
      for (const id in this.N) this.N[id].g.classList.toggle('focus', !!ids && ids.includes(id));
    }

    move(a, b, kind, dur) {
      const A = this.N[a], B = this.N[b];
      if (!A || !B) return Promise.resolve();
      const lose = kind === 'lost';
      const [x0, y0] = this.clip(A, B.x, B.y, 2), [x1, y1] = this.clip(B, A.x, A.y, 2);
      const c = svgEl('circle', { r: 7, cx: x0, cy: y0, class: 'pk pk-' + (lose ? 'req' : kind) }, this.gP);
      const total = reducedMotion() ? 1 : (dur || 650);
      const end = lose ? 0.55 : 1;
      return new Promise(res => {
        const t0 = performance.now();
        const step = now => {
          let p = Math.min((now - t0) / total, 1) * end;
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const q = lose ? p : ease;
          c.setAttribute('cx', x0 + (x1 - x0) * q);
          c.setAttribute('cy', y0 + (y1 - y0) * q);
          if (p < end) requestAnimationFrame(step);
          else if (lose) {
            c.setAttribute('class', 'pk pk-bad fade');
            setTimeout(() => { c.remove(); res(); }, 450);
          } else { c.remove(); res(); }
        };
        requestAnimationFrame(step);
      });
    }

    async hop(path, defKind, dur) {
      let kind = defKind, p = path;
      const m = /^(req|res|bad|evt|lost):(.*)$/.exec(path);
      if (m) { kind = m[1]; p = m[2]; }
      const ids = p.split('>').map(s => s.trim());
      for (let k = 0; k < ids.length - 1; k++) {
        const last = k === ids.length - 2;
        await this.move(ids[k], ids[k + 1], kind === 'lost' && !last ? 'req' : kind, dur);
      }
    }

    async flood(f, kind) {
      const n = f.n || 12, jobs = [];
      for (let k = 0; k < n; k++) {
        const path = f.paths[k % f.paths.length];
        jobs.push(wait(k * (f.gap || 110)).then(() => this.hop(path, f.kind || kind, 520)));
      }
      await Promise.all(jobs);
    }

    renderPanel(s) {
      const steps = this.steps;
      this.dots.innerHTML = '';
      steps.forEach((_, k) => {
        const d = h('span', 'fdot' + (k < this.i ? ' done' : k === this.i ? ' now' : ''), String(k + 1));
        this.dots.appendChild(d);
      });
      this.pt.textContent = s ? `${this.i + 1}. ${s.title}` : (this.scenario.name);
      this.pd.innerHTML = s ? (s.text || '') : (this.scenario.intro || T('intro'));
      if (s && s.msg) { this.pm.hidden = false; this.pm.textContent = s.msg; } else this.pm.hidden = true;
      this.updateCtrl();
    }

    updateCtrl() {
      const last = this.i >= this.steps.length - 1;
      this.bPrev.disabled = this.i <= 0 || this.busy;
      this.bNext.textContent = this.i < 0 ? T('start') : last ? T('done') : T('next');
      this.bPlay.textContent = this.playing ? T('pause') : T('play');
    }

    async playStep(k) {
      this.busy = true;
      this.i = k;
      const s = this.steps[k];
      this.renderPanel(s);
      (s.show || []).forEach(id => this.setVisible(id, true));
      (s.hide || []).forEach(id => this.setVisible(id, false));
      this.applySet(s.set);
      let foc = s.focus;
      if (!foc && s.go) {
        const first = Array.isArray(s.go) ? s.go[s.go.length - 1] : s.go;
        const ids = first.replace(/^\w+:/, '').split('>');
        foc = [ids[ids.length - 1].trim()];
      }
      this.focus(foc || []);
      this.panTo(foc && foc[0]);
      const kind = s.kind || 'req';
      if (s.go) {
        const arr = Array.isArray(s.go) ? s.go : [s.go];
        if (s.parallel) await Promise.all(arr.map(p => this.hop(p, kind)));
        else for (const p of arr) await this.hop(p, kind);
      }
      if (s.flood) await this.flood(s.flood, kind);
      this.applySet(s.after);
      this.busy = false;
      this.updateCtrl();
    }

    next() {
      if (this.busy) return;
      if (this.i >= this.steps.length - 1) {
        this.pt.textContent = T('complete');
        this.pd.innerHTML = T('completeText');
        this.pm.hidden = true;
        this.stopPlay();
        return;
      }
      this.playStep(this.i + 1);
    }

    prev() {
      if (this.busy || this.i <= 0) return;
      const target = this.i - 1;
      this.reset();
      for (let k = 0; k < target; k++) this.applyStatic(this.steps[k]);
      this.playStep(target);
    }

    restart() {
      this.stopPlay();
      if (this.busy) return;
      this.reset();
      this.i = -1;
      this.renderPanel(null);
      this.focus([]);
    }

    select(k) {
      this.stopPlay();
      this.si = k;
      this.scenario = this.scenarios[k];
      this.steps = this.scenario.steps;
      (this.chipEls || []).forEach((c, j) => { c.classList.toggle('on', j === k); c.setAttribute('aria-pressed', j === k); });
      this.info.hidden = true;
      this.busy = false;
      this.reset();
      this.i = -1;
      this.renderPanel(null);
      this.focus([]);
    }

    async togglePlay() {
      if (this.playing) { this.stopPlay(); return; }
      this.playing = true;
      this.updateCtrl();
      if (this.i >= this.steps.length - 1) { this.reset(); this.i = -1; }
      while (this.playing && this.i < this.steps.length - 1) {
        while (this.busy) await wait(50);
        if (!this.playing) break;
        await this.playStep(this.i + 1);
        await wait(1900);
      }
      this.stopPlay();
    }

    stopPlay() { this.playing = false; if (this.bPlay && this.steps) this.updateCtrl(); }

    showInfo(n) {
      this.info.hidden = false;
      this.info.innerHTML = '';
      const head = h('div', 'finfo-head');
      head.appendChild(h('strong', null, n.label));
      const x = h('button', 'icon-btn tiny', '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close explanation');
      x.onclick = () => { this.info.hidden = true; };
      head.appendChild(x);
      this.info.appendChild(head);
      this.info.appendChild(h('div', null, n.info || T('noInfo')));
    }
  }

  /* ------------------------------------------------------------------
     DIAGRAM: a big static "whole design" picture (summary at the end of a lesson)
     config = {
       title, caption, width (default 720, same as flow), height (tall is fine, e.g. 560-760),
       groups: [{ label, x, y, w, h }]                        dashed zones, x,y = TOP-LEFT corner
       nodes:  [{ id, label, sub, x, y, w, h, kind, info }]   like flow nodes (x,y = centre), up to ~16
       edges:  [{ a, b, label, n, dashed, both, kind, via }]  n = step number badge, kind = req|res|evt|bad,
                                                              via = [[x,y], ...] bend points to route around boxes
       paths:  [{ name, text, go: ['a>b>c', ...] }]           buttons that highlight one request path
     }
  ------------------------------------------------------------------- */
  class Diagram {
    constructor(root, cfg) {
      this.cfg = cfg;
      this.W = cfg.width || 720;
      this.H = cfg.height || 520;
      this.id = 'dg' + (++uid);
      root.classList.add('flow', 'diagram');
      const head = h('div', 'dhead');
      head.appendChild(h('div', 'flow-title', cfg.title || T('diagram')));
      const ex = h('button', 'btn small ghost', T('expand'));
      ex.type = 'button';
      ex.onclick = () => {
        const on = !root.classList.contains('full');
        root.classList.toggle('full', on);
        document.body.classList.toggle('no-scroll', on);
        ex.textContent = on ? T('close') : T('expand');
      };
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('full')) ex.click(); });
      head.appendChild(ex);
      root.appendChild(head);
      const paths = cfg.paths || [];
      if (paths.length) {
        const chips = h('div', 'chips');
        this.chipEls = [T('allPaths'), ...paths.map(p => p.name)].map((name, k) => {
          const b = h('button', 'chip' + (k === 0 ? ' on' : ''), name);
          b.type = 'button';
          b.onclick = () => this.pick(k - 1);
          chips.appendChild(b);
          return b;
        });
        root.appendChild(chips);
      }
      const stage = h('div', 'stage');
      root.appendChild(stage);
      const svg = svgEl('svg', { viewBox: `0 0 ${this.W} ${this.H}`, class: 'fsvg dsvg', role: 'img',
        'aria-label': cfg.alt || cfg.title || 'Architecture diagram' }, stage);
      this.svg = svg;
      const defs = svgEl('defs', {}, svg);
      const pat = svgEl('pattern', { id: this.id + 'g', width: 22, height: 22, patternUnits: 'userSpaceOnUse' }, defs);
      svgEl('circle', { cx: 1.5, cy: 1.5, r: 1.1, class: 'griddot' }, pat);
      ['', 'res', 'evt', 'bad', 'on'].forEach(k => {
        const mk = svgEl('marker', { id: this.id + 'a' + k, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        svgEl('path', { d: 'M1.5 1.5L8.5 5L1.5 8.5', class: 'mk' + (k ? ' mk-' + k : '') }, mk);
      });
      svgEl('rect', { x: 0, y: 0, width: this.W, height: this.H, fill: `url(#${this.id}g)` }, svg);
      const gG = svgEl('g', {}, svg), gE = svgEl('g', {}, svg), gL = svgEl('g', {}, svg), gN = svgEl('g', {}, svg);
      (cfg.groups || []).forEach(g => {
        svgEl('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: 14, class: 'dgroup' }, gG);
        const t = svgEl('text', { x: g.x + 12, y: g.y + 18, class: 'dgroup-l' }, gG);
        t.textContent = g.label;
      });
      this.N = {};
      (cfg.nodes || []).forEach(n0 => {
        const n = Object.assign({ w: 140, h: 56, kind: 'server' }, n0);
        const g = svgEl('g', { class: 'fnode k-' + n.kind, tabindex: 0, role: 'button', 'aria-label': n.label + (n.info ? T('clickInfo') : '') }, gN);
        svgEl('rect', { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 10, class: 'nb' }, g);
        const lt = svgEl('text', { x: n.x, y: n.y - (n.sub ? 8 : 0), class: 'nl', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
        lt.textContent = n.label;
        if (n.sub) { const st = svgEl('text', { x: n.x, y: n.y + 11, class: 'ns', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g); st.textContent = n.sub; }
        const open = () => this.showInfo(n);
        g.addEventListener('click', open);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        n.g = g;
        this.N[n.id] = n;
      });
      this.E = (cfg.edges || []).map(e => {
        const A = this.N[e.a], B = this.N[e.b];
        if (!A || !B) return null;
        const pts = [[A.x, A.y], ...(e.via || []), [B.x, B.y]];
        pts[0] = this.clip(A, pts[1][0], pts[1][1]);
        pts[pts.length - 1] = this.clip(B, pts[pts.length - 2][0], pts[pts.length - 2][1]);
        const k = e.kind && e.kind !== 'req' ? e.kind : '';
        const line = svgEl('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', class: 'edge dedge' + (e.dashed ? ' dashed' : '') + (k ? ' de-' + k : '') }, gE);
        line.setAttribute('marker-end', `url(#${this.id}a${k})`);
        if (e.both) line.setAttribute('marker-start', `url(#${this.id}a${k})`);
        // label / step badge at the middle of the middle segment
        const m = Math.floor((pts.length - 1) / 2), p1 = pts[m], p2 = pts[m + 1];
        const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
        const lab = svgEl('g', { class: 'delabel' }, gL);
        if (e.n != null) {
          svgEl('circle', { cx: e.label ? mx - this.textW(e.label) / 2 - 12 : mx, cy: my, r: 10, class: 'dbadge' }, lab);
          const t = svgEl('text', { x: e.label ? mx - this.textW(e.label) / 2 - 12 : mx, y: my, class: 'dbadge-t', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, lab);
          t.textContent = e.n;
        }
        if (e.label) {
          const w = this.textW(e.label) + 10;
          svgEl('rect', { x: mx - w / 2, y: my - 10, width: w, height: 20, rx: 6, class: 'dlabel-bg' }, lab);
          const t = svgEl('text', { x: mx, y: my, class: 'dlabel', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, lab);
          t.textContent = e.label;
        }
        return { cfg: e, line, lab, k };
      }).filter(Boolean);
      this.info = h('div', 'finfo');
      this.info.hidden = true;
      root.appendChild(this.info);
      this.pathText = h('div', 'fstep-text dpath-text');
      this.pathText.hidden = true;
      root.appendChild(this.pathText);
      root.appendChild(h('div', 'fhint', T('diagramHint')));
      if (cfg.caption) root.appendChild(h('div', 'caption', cfg.caption));
    }

    textW(s) { return String(s).length * 6.4; }

    clip(n, tx, ty, pad = 6) {
      const dx = tx - n.x, dy = ty - n.y;
      if (!dx && !dy) return [n.x, n.y];
      const sx = dx ? (n.w / 2 + pad) / Math.abs(dx) : Infinity;
      const sy = dy ? (n.h / 2 + pad) / Math.abs(dy) : Infinity;
      const s = Math.min(sx, sy);
      return [n.x + dx * s, n.y + dy * s];
    }

    pick(k) {
      (this.chipEls || []).forEach((c, j) => c.classList.toggle('on', j === k + 1));
      const p = (this.cfg.paths || [])[k];
      this.svg.classList.toggle('has-path', !!p);
      const onE = new Set(), onN = new Set();
      if (p) (Array.isArray(p.go) ? p.go : [p.go]).forEach(path => {
        const ids = path.replace(/^\w+:/, '').split('>').map(x => x.trim());
        ids.forEach(id => onN.add(id));
        for (let i = 0; i + 1 < ids.length; i++) {
          this.E.forEach((e, j) => { if ((e.cfg.a === ids[i] && e.cfg.b === ids[i + 1]) || (e.cfg.b === ids[i] && e.cfg.a === ids[i + 1])) onE.add(j); });
        }
      });
      this.E.forEach((e, j) => { const on = onE.has(j); e.line.classList.toggle('on', on); e.lab.classList.toggle('on', on); e.line.setAttribute('marker-end', `url(#${this.id}a${on ? 'on' : e.k})`); if (e.cfg.both) e.line.setAttribute('marker-start', `url(#${this.id}a${on ? 'on' : e.k})`); });
      Object.values(this.N).forEach(n => n.g.classList.toggle('on', onN.has(n.id)));
      this.pathText.hidden = !(p && p.text);
      this.pathText.innerHTML = p && p.text ? p.text : '';
    }

    showInfo(n) {
      this.info.hidden = false;
      this.info.innerHTML = '';
      const head = h('div', 'finfo-head');
      head.appendChild(h('strong', null, n.label));
      const x = h('button', 'icon-btn tiny', '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close explanation');
      x.onclick = () => { this.info.hidden = true; };
      head.appendChild(x);
      this.info.appendChild(head);
      this.info.appendChild(h('div', null, n.info || T('noInfo')));
    }
  }

  /* ------------------------------------------------------------------ IMAGE
     { type: 'image', src: 'assets/img/<lesson-id>/<file>', alt, caption, maxWidth,
       credit: { text, url, license } }  credit is required for anything not drawn by us */
  function Figure(b) {
    const f = h('figure', 'fig');
    const a = h('a');
    a.href = b.src; a.target = '_blank'; a.rel = 'noopener';
    a.title = T('imgOpen');
    const img = h('img');
    img.src = b.src; img.alt = b.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
    if (b.maxWidth) img.style.maxWidth = b.maxWidth + 'px';
    a.appendChild(img);
    f.appendChild(a);
    if (b.caption || b.credit) {
      const fc = h('figcaption', null, b.caption || '');
      if (b.credit) {
        const c = h('span', 'fig-credit');
        c.innerHTML = (b.caption ? ' ' : '') + (b.credit.url ? `<a href="${b.credit.url}" target="_blank" rel="noopener">${b.credit.text}</a>` : b.credit.text) + (b.credit.license ? `, ${b.credit.license}` : '');
        fc.appendChild(c);
      }
      f.appendChild(fc);
    }
    return f;
  }

  /* ------------------------------------------------------------------ QUIZ */
  function Quiz(root, b) {
    root.classList.add('quiz');
    root.appendChild(h('div', 'quiz-head', b.title || T('quiz')));
    let score = 0, answered = 0;
    const total = b.questions.length;
    const scoreEl = h('div', 'quiz-score');
    b.questions.forEach((q, qi) => {
      const card = h('div', 'qcard');
      card.appendChild(h('p', 'qq', `${qi + 1}. ${q.q}`));
      const opts = h('div', 'qopts');
      const exp = h('div', 'qexp', q.explain || '');
      exp.hidden = true;
      let locked = false;
      q.options.forEach((o, oi) => {
        const btn = h('button', 'qopt', o);
        btn.type = 'button';
        btn.onclick = () => {
          if (locked) return;
          locked = true;
          answered++;
          if (oi === q.answer) { btn.classList.add('right'); score++; exp.prepend(h('strong', null, T('right'))); }
          else { btn.classList.add('wrong'); opts.children[q.answer].classList.add('right'); exp.prepend(h('strong', null, T('almost'))); }
          exp.hidden = false;
          if (answered === total) scoreEl.textContent = `Score: ${score} / ${total}` + (score === total ? T('scoreAll') : T('scoreSome'));
        };
        opts.appendChild(btn);
      });
      card.append(opts, exp);
      root.appendChild(card);
    });
    root.appendChild(scoreEl);
  }

  /* ------------------------------------------------------------- RENDERER */
  const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function render(b) {
    switch (b.type) {
      case 'h2': { const e = h('h2', null, b.text); e.id = b.id || slug(b.text); return e; }
      case 'h3': return h('h3', null, b.text);
      case 'p': { const e = h('p', null, b.html); e.dataset.speak = ''; return e; }
      case 'ascii': { const w = h('div', 'ascii-wrap'); const pre = h('pre', 'ascii'); pre.textContent = b.text.replace(/^\n/, ''); w.appendChild(pre); if (b.caption) w.appendChild(h('div', 'caption', b.caption)); return w; }
      case 'code': { const pre = h('pre', 'code'); pre.textContent = b.text.replace(/^\n/, ''); return pre; }
      case 'callout': {
        const labels = T('callout');
        const e = h('div', 'callout c-' + (b.tone || 'tip'));
        e.appendChild(h('div', 'callout-label', b.title || labels[b.tone] || 'Note'));
        const body = h('div', 'callout-body', b.html);
        body.dataset.speak = '';
        e.appendChild(body);
        return e;
      }
      case 'list': { const e = h(b.ordered ? 'ol' : 'ul', 'list'); b.items.forEach(i => { const li = h('li', null, i); li.dataset.speak = ''; e.appendChild(li); }); return e; }
      case 'steps': {
        const e = h('ol', 'steps');
        b.items.forEach(s => { const li = h('li'); li.appendChild(h('div', 'steps-t', s.t)); if (s.d) { const d = h('div', 'steps-d', s.d); d.dataset.speak = ''; li.appendChild(d); } e.appendChild(li); });
        return e;
      }
      case 'table': {
        const w = h('div', 'table-wrap');
        const t = h('table');
        const thead = h('thead'); const tr = h('tr');
        b.head.forEach(c => tr.appendChild(h('th', null, c)));
        thead.appendChild(tr); t.appendChild(thead);
        const tb = h('tbody');
        b.rows.forEach(r => { const row = h('tr'); r.forEach(c => row.appendChild(h('td', null, c))); tb.appendChild(row); });
        t.appendChild(tb); w.appendChild(t);
        if (b.caption) w.appendChild(h('div', 'caption', b.caption));
        return w;
      }
      case 'compare': {
        const w = h('div', 'compare');
        [b.left, b.right].forEach((side, k) => {
          const col = h('div', 'cmp ' + (k ? 'cmp-r' : 'cmp-l'));
          col.appendChild(h('div', 'cmp-title', side.title));
          if (side.ascii) { const pre = h('pre', 'ascii'); pre.textContent = side.ascii.replace(/^\n/, ''); col.appendChild(pre); }
          if (side.html) col.appendChild(h('div', 'cmp-body', side.html));
          w.appendChild(col);
        });
        return w;
      }
      case 'tradeoffs': {
        const w = h('div', 'trade');
        const g = h('div', 'trade-col gain'); g.appendChild(h('div', 'trade-title', T('gain')));
        const ul1 = h('ul'); b.gains.forEach(x => ul1.appendChild(h('li', null, x))); g.appendChild(ul1);
        const c = h('div', 'trade-col cost'); c.appendChild(h('div', 'trade-title', T('cost')));
        const ul2 = h('ul'); b.costs.forEach(x => ul2.appendChild(h('li', null, x))); c.appendChild(ul2);
        w.append(g, c);
        return w;
      }
      case 'think': {
        const w = h('div', 'think');
        w.appendChild(h('div', 'think-head', b.title || T('think')));
        b.questions.forEach(q => {
          const d = h('details');
          d.appendChild(h('summary', null, q.q));
          d.appendChild(h('div', 'think-a', q.a));
          w.appendChild(d);
        });
        return w;
      }
      case 'flow': { const w = h('div'); new Flow(w, b); return w; }
      case 'diagram': { const w = h('div'); new Diagram(w, b); return w; }
      case 'image': return Figure(b);
      case 'quiz': { const w = h('div'); Quiz(w, b); return w; }
      case 'custom': { const w = h('div', 'custom'); b.render(w, { h }); return w; }
      case 'roadmap': return window.App ? window.App.roadmapBlock(b.track) : h('div');
      case 'sources': {
        const w = h('div', 'sources');
        w.appendChild(h('div', 'sources-head', b.title || T('sources')));
        if (b.note) w.appendChild(h('p', 'sources-note', b.note));
        const ol = h('ol');
        b.items.forEach(it => {
          const li = h('li');
          const a = h('a', null, it.title);
          a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
          li.appendChild(a);
          li.appendChild(h('span', 'src-meta', ` (${it.publisher}${it.year ? ', ' + it.year : ''}${it.official ? ', official' : ''})`));
          if (it.used) li.appendChild(h('div', 'src-used', it.used));
          ol.appendChild(li);
        });
        w.appendChild(ol);
        return w;
      }
      case 'links': {
        const w = h('div', 'links');
        b.items.forEach(([name, why, url]) => {
          const a = h('a', 'link-row');
          a.href = url; a.target = '_blank'; a.rel = 'noopener';
          a.append(h('span', 'link-name', name), h('span', 'link-why', why));
          w.appendChild(a);
        });
        return w;
      }
      default: return h('div', null, '');
    }
  }

  window.Components = { Flow, Diagram, Quiz, render, h, T };
})();
