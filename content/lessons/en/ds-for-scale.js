(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */
  const fmix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
  const hs = (s, seed) => { let h = (0x811c9dc5 ^ Math.imul(seed, 0x9e3779b1)) >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return fmix(h >>> 0); };

  // Bloom filter: k independent seeded hashes
  const bloomPos = (s, k, m) => { const out = []; for (let i = 0; i < k; i++) out.push(hs(s, i + 11) % m); return out; };
  const bloomBuild = (items, k, m) => { const bits = new Uint8Array(m); items.forEach(s => bloomPos(s, k, m).forEach(p => { bits[p] = 1; })); return bits; };
  const bloomHas = (bits, s, k) => bloomPos(s, k, bits.length).every(p => bits[p]);
  const bloomTheory = (k, n, m) => Math.pow(1 - Math.exp(-k * n / m), k);
  const bloomMeasured = (bits, k, probes) => { let fp = 0; for (let i = 0; i < probes; i++) if (bloomHas(bits, 'probe#' + i, k)) fp++; return fp / probes; };
  const NAMES = ['riya', 'aman', 'neha', 'kabir', 'zoya', 'arjun', 'meera', 'dev', 'isha', 'rohan', 'sara', 'vihaan'];
  const userName = i => NAMES[i % NAMES.length] + '_' + ((i * 7919 + 13) % 997);
  const bloomSize = (n, p) => { const m = Math.ceil(-n * Math.log(p) / (Math.LN2 * Math.LN2)); return { m, k: Math.max(1, Math.round(m / n * Math.LN2)), bitsPerItem: m / n }; };

  // Cuckoo filter: 8 buckets x 2 slots, 4-bit fingerprints (1..15), partial-key cuckoo hashing
  const CK_B = 8, CK_S = 2;
  const ckFp = s => (hs(s, 31) % 15) + 1;
  const ckI1 = s => hs(s, 32) % CK_B;
  const ckAlt = (i, fp) => i ^ ((hs('fp' + fp, 33) % (CK_B - 1)) + 1);
  const ckNew = () => Array.from({ length: CK_B }, () => []);
  const ckInsert = (tab, s, rnd, maxKicks = 40) => {
    const fp = ckFp(s), i1 = ckI1(s), i2 = ckAlt(i1, fp), log = [];
    for (const i of [i1, i2]) if (tab[i].length < CK_S) { tab[i].push({ fp, name: s }); return { ok: true, fp, i1, i2, at: i, kicks: 0, log }; }
    let i = rnd() < 0.5 ? i1 : i2, cur = { fp, name: s };
    for (let n = 1; n <= maxKicks; n++) {
      const j = Math.floor(rnd() * CK_S), out = tab[i][j];
      tab[i][j] = cur; cur = out;
      const ni = ckAlt(i, cur.fp);
      log.push(`${cur.name} (fp ${cur.fp.toString(16)}) pushed out of bucket ${i} → bucket ${ni}`);
      if (tab[ni].length < CK_S) { tab[ni].push(cur); return { ok: true, fp, i1, i2, at: ni, kicks: n, log }; }
      i = ni;
    }
    return { ok: false, fp, i1, i2, kicks: maxKicks, log, homeless: cur };
  };
  const ckLookup = (tab, s) => { const fp = ckFp(s), i1 = ckI1(s), i2 = ckAlt(i1, fp); const hit = [i1, i2].find(i => tab[i].some(e => e.fp === fp)); return { fp, i1, i2, hit: hit === undefined ? -1 : hit }; };
  const ckDelete = (tab, s) => { const r = ckLookup(tab, s); if (r.hit < 0) return r; const k = tab[r.hit].findIndex(e => e.fp === r.fp); r.removed = tab[r.hit].splice(k, 1)[0]; return r; };

  // Quadtree over a 256 x 256 map: one dense "city" cluster + sparse points (seeded)
  const qtPoints = () => {
    let seed = 2024; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pts = [];
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 1.2) * 52; pts.push([180 + Math.cos(a) * d, 70 + Math.sin(a) * d]); }
    for (let i = 0; i < 30; i++) pts.push([4 + r() * 248, 4 + r() * 248]);
    return pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  };
  const qtBuild = (pts, cap, x = 0, y = 0, size = 256, depth = 0) => {
    const node = { x, y, size, depth, pts, kids: null };
    if (pts.length > cap && depth < 7) {
      const h = size / 2;
      node.kids = [[x, y], [x + h, y], [x, y + h], [x + h, y + h]].map(([qx, qy]) => qtBuild(pts.filter(([px, py]) => px >= qx && px < qx + h && py >= qy && py < qy + h), cap, qx, qy, h, depth + 1));
      node.pts = [];
    }
    return node;
  };
  const qtLeaves = n => n.kids ? n.kids.reduce((a, k) => a.concat(qtLeaves(k)), []) : [n];
  const qtQuery = (n, cx, cy, r) => {
    const nx = Math.max(n.x, Math.min(cx, n.x + n.size)), ny = Math.max(n.y, Math.min(cy, n.y + n.size));
    if ((nx - cx) ** 2 + (ny - cy) ** 2 > r * r) return { visited: 0, checked: 0, found: 0 };
    if (!n.kids) return { visited: 1, checked: n.pts.length, found: n.pts.filter(([px, py]) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r).length };
    return n.kids.map(k => qtQuery(k, cx, cy, r)).reduce((a, b) => ({ visited: a.visited + b.visited, checked: a.checked + b.checked, found: a.found + b.found }), { visited: 1, checked: 0, found: 0 });
  };

  // Skip list: levels from seeded coin flips (max 6), search path
  const slBuild = (vals, seed) => {
    const coin = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 < 0.5; };
    return vals.slice().sort((a, b) => a - b).map(v => { let lv = 1; while (lv < 6 && coin()) lv++; return { v, lv }; });
  };
  const slSearch = (nodes, x) => {
    const top = Math.max(1, ...nodes.map(n => n.lv)), path = []; let i = -1, steps = 0;
    for (let L = top; L >= 1; L--) {
      for (;;) {
        let j = i + 1; while (j < nodes.length && nodes[j].lv < L) j++;
        steps++;
        if (j < nodes.length && nodes[j].v <= x) { i = j; path.push([L, j]); if (nodes[j].v === x) return { found: true, steps, path, top }; } else break;
      }
    }
    return { found: false, steps, path, top };
  };
  const h3Disk = k => 1 + 3 * k * (k + 1);

  // Hilbert curve (S2 numbers its cells along this curve) vs row-by-row numbering
  const hilD2xy = (n, d) => { let x = 0, y = 0, t = d; for (let s = 1; s < n; s *= 2) { const rx = 1 & (t >> 1), ry = 1 & (t ^ rx); if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const tmp = x; x = y; y = tmp; } x += s * rx; y += s * ry; t >>= 2; } return [x, y]; };
  const runs = ids => { const a = ids.slice().sort((p, q) => p - q); let r = 0; a.forEach((v, i) => { if (i === 0 || v !== a[i - 1] + 1) r++; }); return r; };
  const hilRegion = (n, box) => {
    const hil = [], row = [];
    for (let d = 0; d < n * n; d++) { const [x, y] = hilD2xy(n, d), cx = (x + 0.5) / n, cy = (y + 0.5) / n; if (cx >= box[0] && cx <= box[2] && cy >= box[1] && cy <= box[3]) { hil.push(d); row.push(y * n + x); } }
    return { cells: hil.length, hilRuns: runs(hil), rowRuns: runs(row) };
  };

  // HyperLogLog (32-bit hashes, small-range correction)
  const hll = (n, p, seed) => {
    const m = 1 << p, R = new Uint8Array(m);
    for (let i = 0; i < n; i++) {
      const h = fmix((Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(seed + 1, 0x7feb352d)) >>> 0);
      const idx = h >>> (32 - p), w = (h << p) >>> 0;
      const rho = w === 0 ? 32 - p + 1 : Math.clz32(w) + 1;
      if (rho > R[idx]) R[idx] = rho;
    }
    let sum = 0, zeros = 0;
    for (let j = 0; j < m; j++) { sum += Math.pow(2, -R[j]); if (!R[j]) zeros++; }
    const alpha = m === 16 ? 0.673 : m === 32 ? 0.697 : m === 64 ? 0.709 : 0.7213 / (1 + 1.079 / m);
    let E = alpha * m * m / sum;
    if (E <= 2.5 * m && zeros > 0) E = m * Math.log(m / zeros);
    return { est: E, m, bytes: m * 6 / 8, stdErr: 1.04 / Math.sqrt(m) };
  };

  // Count-min sketch over a fixed seeded hashtag stream
  const TAGS = ['#cricket', '#ipl', '#music', '#coding', '#memes', '#gaming', '#news', '#travel', '#fitness', '#movies', '#tech', '#art', '#study', '#comedy', '#pets', '#football', '#science', '#books', '#dance', '#nature'];
  const cmsStream = () => {
    const items = TAGS.map((t, i) => [t, Math.round(3000 / Math.pow(i + 1, 1.1))]);
    let seed = 42; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 480; i++) items.push(['#tag' + i, 1 + Math.floor(rnd() * 5)]);
    return items;
  };
  const cmsRun = (items, w, d) => {
    const C = Array.from({ length: d }, () => new Float64Array(w));
    items.forEach(([t, c]) => { for (let j = 0; j < d; j++) C[j][hs(t, 100 + j) % w] += c; });
    const est = t => { let mn = Infinity; for (let j = 0; j < d; j++) mn = Math.min(mn, C[j][hs(t, 100 + j) % w]); return mn; };
    return { est, total: items.reduce((s, x) => s + x[1], 0) };
  };

  // Geohash
  const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  const geohash = (lat, lon, prec) => {
    const la = [-90, 90], lo = [-180, 180]; let even = true, bit = 0, ch = 0, out = '';
    while (out.length < prec) {
      const r = even ? lo : la, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
      if (v >= mid) { ch = ch * 2 + 1; r[0] = mid; } else { ch = ch * 2; r[1] = mid; }
      even = !even;
      if (++bit === 5) { out += B32[ch]; bit = 0; ch = 0; }
    }
    return out;
  };
  const ghBounds = hash => {
    const la = [-90, 90], lo = [-180, 180]; let even = true;
    for (const c of hash) { const v = B32.indexOf(c); for (let b = 4; b >= 0; b--) { const r = even ? lo : la, mid = (r[0] + r[1]) / 2; if ((v >> b) & 1) r[0] = mid; else r[1] = mid; even = !even; } }
    return { la, lo };
  };

  // Merkle tree over 8 leaves
  const h4 = s => hs(s, 7).toString(16).padStart(8, '0').slice(0, 4);
  const merkle = leaves => { const lv = [leaves.map(h4)]; while (lv[lv.length - 1].length > 1) { const p = lv[lv.length - 1], n = []; for (let i = 0; i < p.length; i += 2) n.push(h4(p[i] + p[i + 1])); lv.push(n); } return lv.reverse(); };
  const merkleDiff = (A, B) => {
    let compares = 0; const diffLeaves = [], diffNodes = new Set(); const q = [[0, 0]];
    while (q.length) {
      const [l, i] = q.shift(); compares++;
      if (A[l][i] === B[l][i]) continue;
      diffNodes.add(l + ':' + i);
      if (l === A.length - 1) diffLeaves.push(i); else q.push([l + 1, 2 * i], [l + 1, 2 * i + 1]);
    }
    return { compares, diffLeaves, diffNodes };
  };
  const T = { slBuild, slSearch, h3Disk, hilD2xy, hilRegion, qtPoints, qtBuild, qtLeaves, qtQuery, ckFp, ckI1, ckAlt, ckNew, ckInsert, ckLookup, ckDelete, CK_B, CK_S, hs, bloomPos, bloomBuild, bloomHas, bloomTheory, bloomMeasured, userName, bloomSize, hll, cmsStream, cmsRun, TAGS, geohash, ghBounds, merkle, merkleDiff };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (x, d) => (x * 100).toFixed(d === undefined ? 2 : d) + '%';
  const fmtBytes = b => b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : Math.round(b) + ' B';
  const chipRow = (box, list, get, set) => {
    box.innerHTML = '';
    list.forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = label; b.onclick = () => set(k); box.appendChild(b); });
  };

  Lesson.register({
    id: 'ds-for-scale',
    title: 'Bloom filter, HyperLogLog, Geohash',
    minutes: 35,
    summary: `When data runs into billions, "just keep the whole list" stops working. This lesson is about clever data structures that accept a tiny error in return for saving memory a thousand times over (Bloom filter, cuckoo filter, HyperLogLog, count-min sketch), that make "what is near me?" fast (geohash, quadtree, S2, H3), that handle sorted data (skip list), and that compare two copies quickly (Merkle tree).`,
    _test: T,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `When there were few users, we answered every question by reading the whole list.<br>Now xyz.com has crores of users. Keeping the whole list and reading it every time has become very costly.<br>This lesson has some clever tricks. Some accept a tiny error and use a thousand times less memory in return. Some quickly find "what is near me?". Some quickly compare two copies.<br>You will run every trick yourself.` },
      { type: 'h2', text: 'Problem: exact answers are too costly' },
      { type: 'p', html: `xyz.com is very big now: 50 crore users, billions of video views every day. Some questions that used to be easy have suddenly become heavy:` },
      { type: 'table', head: ['Question', 'Direct way', 'Why it breaks', 'Clever structure'], rows: [
        ['Is this username already taken?', 'A DB query every time', 'Every keystroke on the signup page = a DB hit', 'Bloom filter, cuckoo filter'],
        ['How many <em>unique</em> people watched this video today?', 'All user IDs in a Set', 'MBs for each video, crores of videos', 'HyperLogLog'],
        ['Which hashtags are trending right now?', 'A counter per tag', 'Crores of different tags, memory runs out', 'Count-min sketch + heap'],
        ['Which drivers/creators are within 2 km of me?', 'Compute the distance to every point', 'Scan lakhs of points on every request', 'Geohash, quadtree, S2, H3'],
        ['Leaderboard: rank and ranges, fast', 'Sort every time', 'An O(n log n) sort on every request', 'Skip list (Redis sorted set)'],
        ['What is different between two replicas?', 'Compare every key', 'Send billions of keys over the network', 'Merkle tree'],
      ]},
      { type: 'callout', tone: 'term', title: 'New word: Probabilistic data structure', html: `<strong>What it is:</strong> a structure that is <strong>sometimes a little wrong</strong>. But you know in advance how big the error can be, and you can control it.<br><strong>Why we need it:</strong> say "a 1% error is fine", and you get 10-100 times less memory and very fast answers.<br><strong>Without it:</strong> keep the full list in RAM for every question, or ask the database every time. With crores of users both are very costly.<br><strong>Example:</strong> for "is this username taken?", only ~600 MB of bits instead of storing 50 crore names.` },
      { type: 'callout', tone: 'term', title: 'New word: Hash function', html: `<strong>What it is:</strong> a formula that turns any text (like <code>riya_42</code>) into a big number. The same text always gives the same number. Different texts give numbers that look randomly spread out.<br><strong>Why we need it:</strong> almost every structure in this lesson runs on hashes. A hash turns any name into a number that says "which box it goes in".<br><strong>Without it:</strong> there is no clean, evenly spread way to turn a name straight into a number.<br><strong>Example:</strong> hash("riya_42") mod 256 = 205 → bit number 205. "k hash functions" just means k different formulas that give k different numbers.` },
      { type: 'h2', text: 'Bloom filter: "definitely not" or "maybe yes"' },
      { type: 'p', html: `<strong>Problem:</strong> on xyz.com's signup form a user types a username, and on every keystroke we want to say "this name is already taken". There are 50 crore usernames. A database query on every keystroke = useless load on the DB at the signup peak. Keep all usernames in RAM? 50 crore × ~15 bytes = ~7.5 GB just for the strings, many times more with overhead, and on every app server.` },
      { type: 'p', html: `Most new usernames are free. If a cheap check can say "this name is definitely not taken", we never need to go to the DB. That is what a <strong>Bloom filter</strong> does.` },
      { type: 'callout', tone: 'term', title: 'New word: Bloom filter', html: `<strong>What it is:</strong> a small "guard" that gives one of two answers for a name: <strong>"definitely not"</strong> or <strong>"maybe yes"</strong>.<br><strong>Why we need it:</strong> most new usernames are free. In the "definitely not" case we never need to go to the database.<br><strong>Without it:</strong> a DB query on every keystroke, or a 7.5 GB+ list of names on every server.<br><strong>Example:</strong> 50 crore names, 1% error → ~600 MB. See how it works inside below.` },
      { type: 'callout', tone: 'term', title: 'New word: Bit array', html: `<strong>What it is:</strong> a long row of switches. Each switch is either 0 (off) or 1 (on). 256 bits = 256 switches = only 32 bytes.<br><strong>Why we need it:</strong> a Bloom filter does not store names, it only turns on a few switches. That is why it is so small.<br><strong>Without it:</strong> you would have to store full names (~15 bytes each).` },
      { type: 'p', html: `<strong>How it works inside:</strong> a long <strong>bit array</strong> (m bits, all starting at 0) and <strong>k hash functions</strong>.` },
      { type: 'callout', tone: 'tip', title: 'How a Bloom filter works, step by step', html: `• <strong>Insert "riya_42":</strong> the k hash functions give k positions; set all those bits to 1.<br>• <strong>Check "kabir_7":</strong> look at its k positions. If any bit is 0 → <strong>definitely not</strong> (if it were there, that bit would be 1). If all are 1 → <strong>maybe yes</strong> (other words together may have set those bits to 1).<br>The real username is never stored, only bits. That is why it is so small.` },
      { type: 'ascii', text: `Small example: m = 12 bits, k = 2 hash functions

Start:               0 0 0 0 0 0 0 0 0 0 0 0      (bit 0 to bit 11)
Insert "riya":  h1=2, h2=7   → set bits 2 and 7 to 1
Insert "aman":  h1=7, h2=10  → set bits 7 and 10 to 1 (7 was already 1)
Now:                 0 0 1 0 0 0 0 1 0 0 1 0

Check "neha":   h1=4, h2=7   → bit 4 = 0  → DEFINITELY NOT (skip the DB)
Check "aman":   h1=7, h2=10  → both 1     → MAYBE YES (confirm with the DB)
Check "zoya":   h1=2, h2=10  → both 1     → MAYBE YES, but zoya was never added!
                 (riya turned on bit 2, aman turned on bit 10) = FALSE POSITIVE` },
      { type: 'callout', tone: 'term', title: 'New word: False positive', html: `<strong>What it is:</strong> the filter said "maybe yes", but the item was really not there (like "zoya" above). The opposite mistake, a <strong>false negative</strong> (it was there, but the filter said "no"), <strong>never happens</strong> in a Bloom filter, unless something is deleted from the filter or the filter is old.<br><strong>Why it matters:</strong> the harm of a false positive is just one extra DB call. If false negatives happened, a wrong answer would reach the user.<br><strong>Without this guarantee:</strong> you could not trust the filter's "no", and the filter would be useless.` },
      { type: 'p', html: `The formula for the probability of a false positive (n items added, m bits, k hashes):` },
      { type: 'code', text: `P(false positive) ≈ (1 − e^(−k·n/m))^k

Best k  = (m / n) × ln 2  ≈ 0.69 × (bits per item)
For 1% ≈ 9.6 bits per item (k ≈ 7),  for 0.1% ≈ 14.4 bits per item (k ≈ 10)` },
      { type: 'p', html: `Try it yourself. Change m and k, add usernames, and check names. The widget checks 20,000 names that were never added, and counts how many times the filter wrongly said "maybe yes" (measured), then compares that with the formula:` },
      { type: 'custom', render(el) {
        let m = 256, k = 3, items = [];
        for (let i = 0; i < 20; i++) items.push(T.userName(i));
        el.innerHTML = `<div class="row2">
            <div><label>Bits (m): <strong class="bf-mv"></strong></label><input class="bf-m" type="range" min="64" max="2048" step="32" value="256"></div>
            <div><label>Hash functions (k): <strong class="bf-kv"></strong></label><input class="bf-k" type="range" min="1" max="10" step="1" value="3"></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center">
            <input type="text" class="bf-in" value="kabir_7" style="max-width:180px">
            <button type="button" class="btn small bf-chk">Check</button>
            <button type="button" class="btn small bf-ins">Insert</button>
            <button type="button" class="btn small primary bf-add">+10 usernames</button>
            <button type="button" class="btn small ghost bf-rst">Reset</button>
          </div>
          <div class="bf-res" style="margin-top:10px;min-height:1.6em;font-size:15px"></div>
          <div class="bf-grid" style="display:flex;flex-wrap:wrap;gap:2px;margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Items (n)</span><strong class="bf-n"></strong></div>
            <div class="stat"><span>Bits that are 1</span><strong class="bf-fill"></strong></div>
            <div class="stat"><span>False positive, measured</span><strong class="bf-meas"></strong></div>
            <div class="stat"><span>False positive, formula</span><strong class="bf-th"></strong></div>
            <div class="stat"><span>Best k for this m, n</span><strong class="bf-bk"></strong></div>
          </div>
          <div class="calc-note bf-note"></div>`;
        const mE = el.querySelector('.bf-m'), kE = el.querySelector('.bf-k'), inE = el.querySelector('.bf-in'), resE = el.querySelector('.bf-res');
        let bits, hl = [];
        const draw = () => {
          bits = T.bloomBuild(items, k, m);
          el.querySelector('.bf-mv').textContent = m; el.querySelector('.bf-kv').textContent = k;
          const grid = el.querySelector('.bf-grid');
          if (m <= 512) {
            let html = '';
            for (let i = 0; i < m; i++) {
              const on = bits[i], h = hl.includes(i);
              html += `<span title="bit ${i}" style="width:9px;height:9px;border-radius:2px;background:${on ? 'var(--accent)' : 'var(--surface-2)'};${h ? 'outline:2px solid ' + (on ? 'var(--green)' : 'var(--red)') + ';outline-offset:1px;' : ''}border:1px solid var(--line)"></span>`;
            }
            grid.innerHTML = html;
          } else grid.innerHTML = `<div style="color:var(--ink-3);font-size:14px">The grid is shown only up to 512 bits. The numbers are below.</div>`;
          const n = items.length, ones = bits.reduce((s, b) => s + b, 0);
          const meas = T.bloomMeasured(bits, k, 20000), th = T.bloomTheory(k, n, m);
          el.querySelector('.bf-n').textContent = n;
          el.querySelector('.bf-fill').textContent = pct(ones / m, 1);
          el.querySelector('.bf-meas').textContent = pct(meas);
          el.querySelector('.bf-th').textContent = pct(th);
          el.querySelector('.bf-bk').textContent = n ? Math.max(1, Math.round(m / n * Math.LN2)) : '-';
          el.querySelector('.bf-note').textContent = `${n ? (m / n).toFixed(1) : '-'} bits per item. Add items: the bits fill up and false positives grow fast. k too small or too big are both bad; the fewest mistakes are near the best k. The measured and formula numbers should stay about equal (a bit up and down for a small m).`;
        };
        const check = () => {
          const s = inE.value.trim(); if (!s) return;
          hl = T.bloomPos(s, k, m);
          const maybe = hl.every(p => bits[p]), real = items.includes(s);
          draw();
          resE.innerHTML = maybe
            ? (real ? `<strong style="color:var(--amber)">MAYBE YES</strong>: all ${k} bits are 1 (positions ${hl.join(', ')}). And it really was added.`
              : `<strong style="color:var(--red)">MAYBE YES, but wrong!</strong> This was never added. This is a <strong>false positive</strong> (positions ${hl.join(', ')}).`)
            : `<strong style="color:var(--green)">DEFINITELY NOT</strong>: at least one bit is 0 (positions ${hl.join(', ')}). No need to go to the DB.`;
        };
        mE.addEventListener('input', () => { m = +mE.value; hl = []; resE.textContent = ''; draw(); });
        kE.addEventListener('input', () => { k = +kE.value; hl = []; resE.textContent = ''; draw(); });
        el.querySelector('.bf-chk').onclick = check;
        el.querySelector('.bf-ins').onclick = () => { const s = inE.value.trim(); if (s && !items.includes(s)) items.push(s); check(); };
        el.querySelector('.bf-add').onclick = () => { const st = items.length; for (let i = st; i < st + 10; i++) items.push(T.userName(i)); hl = []; resE.textContent = ''; draw(); };
        el.querySelector('.bf-rst').onclick = () => { items = []; for (let i = 0; i < 20; i++) items.push(T.userName(i)); m = 256; k = 3; mE.value = 256; kE.value = 3; hl = []; resE.textContent = ''; draw(); };
        draw();
      }},
      { type: 'callout', tone: 'tip', title: 'Try this', html: `At the default (m = 256 bits, k = 3, 20 usernames) the false positive rate is around 1%. Press "+10 usernames" 4-5 times: at n = 60-70 it becomes 10%+, because more than half the bits are now 1. Now set m to 1024, and it goes back down. Now at m = 256, n = 20, change k: at k = 1 the error is ~7.5%, near the "best k" (~9) it is ~0.2%. But once n grows, a big k hurts (it fills more bits), so the best k = (m/n) × 0.69 changes every time.` },
      { type: 'p', html: `The real size: 50 crore usernames, 1% error. The formula gives ~9.6 bits per username = 50 crore × 9.6 / 8 ≈ <strong>600 MB</strong>. It fits easily in one server's RAM, and is many times smaller than storing the strings. And for the 99% of "free" names there is no DB call at all.` },
      { type: 'flow', title: 'Username check at signup, with a Bloom filter', height: 320,
        nodes: [
          { id: 'u', label: 'User', sub: 'typed a name', x: 80, y: 160, w: 120, kind: 'client', info: 'What it is: xyz.com\'s signup form, on the user\'s phone/browser. On every keystroke (after a debounce) it asks "is this name available?".' },
          { id: 'app', label: 'App server', x: 280, y: 160, w: 140, kind: 'server', info: 'What it is: xyz.com\'s backend server that answers "is this name available?". It asks the Bloom filter first. "Definitely not" = answer right away. "Maybe" = only then does it go to the database.' },
          { id: 'bf', label: 'Bloom filter', sub: 'RAM, ~600 MB bits', x: 520, y: 70, w: 180, kind: 'cache', info: 'What it is: a bit array of all usernames that says "definitely not / maybe yes". Why: most checks never reach the DB. It lives in the app server\'s memory (or in Redis, with RedisBloom\'s BF.ADD/BF.EXISTS commands). Every new username is added here too.' },
          { id: 'db', label: 'Users DB', sub: 'UNIQUE(username)', x: 520, y: 250, w: 180, kind: 'data', info: 'What it is: the real users database, the source of truth (the final truth). The username column has a UNIQUE constraint: two people can never take the same name, whatever the filter says.' },
        ],
        edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'bf' }, { a: 'app', b: 'db' }],
        scenarios: [
          { name: 'Definitely free', steps: [
            { title: 'The user typed a name', text: 'A new, fairly unique name.', go: 'u>app', msg: 'GET /username-available?name=zoya_sky_99' },
            { title: 'Filter: one bit is 0', text: 'One position in the Bloom filter is 0. So this name was never inserted. <strong>Definitely free</strong>.', go: ['app>bf', 'res:bf>app'], set: { db: { state: 'dim' } }, after: { bf: { state: 'hit', sub: 'DEFINITELY NOT' } }, msg: 'bits[812], bits[40551], bits[9902...]: 1, 0, 1  → definitely not' },
            { title: 'Instant answer', text: 'The database was not even touched. Most checks take this path.', go: 'res:app>u', msg: '{ "available": true }' },
          ]},
          { name: 'Name is taken', steps: [
            { title: 'A popular name', text: 'The user typed "riya".', go: 'u>app', msg: 'name=riya' },
            { title: 'Filter: maybe yes', text: 'All k bits are 1. The filter cannot say a sure "yes", so confirm with the DB.', go: ['app>bf', 'res:bf>app'], after: { bf: { state: 'warn', sub: 'MAYBE' } } },
            { title: 'The DB confirms', text: 'Yes, it is taken.', go: ['app>db', 'res:db>app', 'res:app>u'], msg: '{ "available": false }' },
          ]},
          { name: 'False positive', steps: [
            { title: 'A new name, but...', text: 'The user typed "kabir_77x", which nobody has.', go: 'u>app' },
            { title: 'Filter: maybe yes (wrong)', text: 'Other names together have set all the same bits to 1. A false positive.', go: ['app>bf', 'res:bf>app'], after: { bf: { state: 'warn', sub: 'MAYBE (wrong)' } } },
            { title: 'The DB tells the truth', text: 'The DB said "not there". The right answer went out, it just cost one extra DB call. This happens on ~1% of checks, and that is fine.', go: ['app>db', 'res:db>app', 'res:app>u'], msg: '{ "available": true }' },
          ]},
          { name: 'Stale filter (failure)', intro: 'The filter was rebuilt from a one-day-old snapshot, and today\'s new usernames are not in it.', steps: [
            { title: 'An old filter', text: 'On a server restart, the filter was loaded from last night\'s backup. "neha_dev" registered this morning, and is not in the filter.', set: { bf: { state: 'warn', sub: 'yesterday\'s snapshot' } }, focus: ['bf'] },
            { title: 'A wrong "definitely free"', text: 'The filter said "definitely not". This is a <strong>false negative</strong>, which a Bloom filter never makes on its own, but old data does.', go: ['u>app', 'app>bf', 'res:bf>app', 'res:app>u'], msg: '{ "available": true }   ← wrong!' },
            { title: 'The DB constraint saves us', text: 'The user presses "Sign up". The insert fails on the UNIQUE constraint. The user sees "name is taken". Lesson: <strong>the filter is only a shortcut; the final decision belongs to the source of truth</strong>. And keep the filter updated with new writes (or refill it from the DB/log on restart).', go: ['app>db', 'bad:db>app'], after: { db: { state: 'ok', sub: 'UNIQUE stopped it' } } },
          ]},
        ],
      },
      { type: 'h3', text: 'Where are Bloom filters used?' },
      { type: 'list', items: [
        `<strong>Databases (LSM trees):</strong> stores like Cassandra, RocksDB and HBase keep data in many disk files (SSTables). Each file has a Bloom filter: if "this key is definitely not in this file", the file is not read from disk at all. In Cassandra the default false-positive chance is 1% (10% with leveled compaction).`,
        `<strong>Web crawler:</strong> "have we crawled this URL before?" Billions of URLs, and if one or two new URLs get skipped by mistake (a false positive), that is fine.`,
        `<strong>In front of a cache:</strong> going to the DB again and again for keys that do not exist (a cache penetration attack) can be stopped with a Bloom filter.`,
        `<strong>Recommendations:</strong> "have we already shown this video to the user?" A small filter per user.`,
      ]},
      { type: 'callout', tone: 'mistake', title: 'Deleting from a Bloom filter', html: `You <strong>cannot delete</strong> an item from a normal Bloom filter. If you set an item's bits to 0, those same bits may belong to other items too, and the filter would start saying "definitely not" for those items (a false negative, the worst kind). If you need delete, use a counting Bloom filter (a small counter instead of a bit) or a cuckoo filter. And when the filter gets full (n has grown), you cannot make it bigger: build a new, bigger filter.` },

      { type: 'h3', text: 'Cuckoo filter: when you also need delete' },
      { type: 'p', html: `Say a user deletes their account on xyz.com, and their username should become free again. A Bloom filter cannot do this. A <strong>cuckoo filter</strong> (a 2014 paper, "Practically Better Than Bloom") can.` },
      { type: 'callout', tone: 'term', title: 'New word: Fingerprint', html: `<strong>What it is:</strong> a tiny "thumbprint" of a name: just a few bits of its hash (like 8-12 bits). Instead of "riya_42" (8 bytes), just a small number.<br><strong>Why we need it:</strong> a cuckoo filter does not store the full name, only the fingerprint. That keeps it small.<br><strong>Without it:</strong> you would store full names, many times the memory.<br><strong>Careful:</strong> two different names can sometimes get the same fingerprint. That is the cuckoo filter's false positive.` },
      { type: 'callout', tone: 'term', title: 'New word: Cuckoo filter', html: `<strong>What it is:</strong> a "definitely not / maybe yes" guard like the Bloom filter, that can <strong>also delete</strong>. Inside is a table: buckets (boxes), each with a few slots (usually 4). Each slot holds one fingerprint.<br><strong>Why we need it:</strong> when an account is deleted, the username should be free again. A Bloom filter cannot do that.<br><strong>Without it:</strong> deleted names would always show as "maybe taken", or you would rebuild the whole filter every few days.<br><strong>Why "cuckoo":</strong> the cuckoo bird lays its egg in another bird's nest and pushes the old egg out. This filter also pushes an old fingerprint to its other home when a place is full.` },
      { type: 'p', html: `<strong>How it works inside:</strong> each item has <strong>two possible buckets</strong>: i1 = hash(item), and i2 = i1 XOR hash(fingerprint). If either has an empty slot, put the fingerprint there. Both full? Push some old fingerprint to its other bucket. If that one is also full, it pushes someone else. The chain goes on until an empty slot is found (or we give up).` },
      { type: 'callout', tone: 'term', title: 'New word: XOR', html: `<strong>What it is:</strong> a small game with bits: if two bits are the same, the result is 0; if different, 1. 3 XOR 5: 011 and 101 → 110 = 6.<br><strong>Why we need it:</strong> XOR has a magic property: 6 XOR 5 = 3 again. So if you know a bucket and the fingerprint, you can find the other bucket <em>without the real name</em>. When pushing, the filter has only the fingerprint, not the name.<br><strong>Without it:</strong> pushing would need the real name, which the filter does not keep.` },
      { type: 'ascii', text: `Small example (8 buckets, 2 slots each; numbers chosen to explain):

"riya": fingerprint = a,  i1 = 3,  hash(a) = 5  → i2 = 3 XOR 5 = 6
        bucket 3 has space → put "a" there.

Later buckets 3 and 6 are both full, and "neha" needs bucket 3:
   take "a" out of bucket 3 → its other home = 3 XOR hash(a) = 3 XOR 5 = 6
   bucket 6 is full → send some fingerprint there to its other home ... until a space is found

Lookup "riya":  look only at buckets 3 and 6. Found "a" → MAYBE YES
Delete "riya":  remove one "a" from bucket 3 or 6. Done.` },
      { type: 'list', items: [
        `<strong>Lookup:</strong> look at only two buckets: if the fingerprint is there, "maybe yes". A false positive happens when another item's fingerprint turns out the same.`,
        `<strong>Delete:</strong> remove the fingerprint from that bucket. So delete is possible (but only for items that were really added).`,
        `<strong>Size:</strong> at small false-positive rates (below ~3%) it often takes less space than a Bloom filter, and lookups are fast (only 2 places to look).`,
        `<strong>The price:</strong> when the table gets very full (~95% with 4-slot buckets), inserts start to fail; then you must build a bigger table. Redis (the RedisBloom module, now in Redis Stack/Redis 8) gives <code>CF.ADD</code>, <code>CF.EXISTS</code>, <code>CF.DEL</code>.`,
      ]},
      { type: 'p', html: `Try it yourself. This is a <strong>toy-sized</strong> cuckoo filter: 8 buckets × 2 slots, and the fingerprint is only 4 bits (one hex character from 1 to f), so everything fits on the screen. Insert names, watch the pushing around (kicks), and try lookup and delete:` },
      { type: 'custom', render(el) {
        let tab, seed, names, last = '';
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const START = ['riya', 'aman', 'neha', 'kabir', 'zoya', 'arjun'];
        const MORE = ['meera', 'dev', 'isha', 'rohan', 'sara', 'vihaan', 'tara', 'yash', 'anya', 'kiran', 'nisha', 'om'];
        el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <input type="text" class="ck-in" value="kabir" style="max-width:160px">
            <button type="button" class="btn small ck-ins">Insert</button>
            <button type="button" class="btn small ck-look">Lookup</button>
            <button type="button" class="btn small ck-del">Delete</button>
            <button type="button" class="btn small primary ck-more">+1 new name</button>
            <button type="button" class="btn small ghost ck-rst">Reset</button>
          </div>
          <div class="ck-res" style="margin-top:10px;min-height:1.6em;font-size:15px"></div>
          <div class="ck-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px;margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Items</span><strong class="ck-n"></strong></div>
            <div class="stat"><span>How full the table is (load)</span><strong class="ck-load"></strong></div>
            <div class="stat"><span>Kicks in the last insert</span><strong class="ck-k"></strong></div>
          </div>
          <div class="calc-note ck-log"></div>`;
        const inE = el.querySelector('.ck-in'), resE = el.querySelector('.ck-res');
        const reset = () => { tab = T.ckNew(); seed = 12345; names = []; last = '-'; START.forEach(n => { T.ckInsert(tab, n, rnd); names.push(n); }); };
        const draw = (hl = []) => {
          el.querySelector('.ck-grid').innerHTML = tab.map((b, i) => `<div style="border:1px solid ${hl.includes(i) ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px;background:${hl.includes(i) ? 'var(--accent-soft)' : 'var(--surface)'}"><div style="font-size:12px;color:var(--ink-3)">bucket ${i}</div>` +
            [0, 1].map(j => b[j] ? `<div style="font-family:var(--f-mono);font-size:14px">${b[j].fp.toString(16)} <span style="font-size:11px;color:var(--ink-3)">${esc(b[j].name)}</span></div>` : `<div style="font-family:var(--f-mono);font-size:14px;color:var(--ink-3)">·</div>`).join('') + `</div>`).join('');
          const n = tab.reduce((s, b) => s + b.length, 0);
          el.querySelector('.ck-n').textContent = n;
          el.querySelector('.ck-load').textContent = pct(n / (T.CK_B * T.CK_S), 0);
          el.querySelector('.ck-k').textContent = last;
        };
        const where = r => `fingerprint <code>${r.fp.toString(16)}</code>, homes: bucket ${r.i1} or ${r.i2}`;
        const ins = s => {
          const bak = tab.map(b => b.slice()), r = T.ckInsert(tab, s, rnd); last = r.kicks;
          if (r.ok) { names.push(s); resE.innerHTML = `<strong style="color:var(--green)">Added</strong>: ${where(r)}. ${r.kicks ? r.kicks + ' kick(s) needed.' : 'Found an empty slot straight away.'}`; }
          else { resE.innerHTML = `<strong style="color:var(--red)">Insert fail!</strong> No space found even after ${r.kicks} kicks. The table is full: a real system now builds a bigger table. (Here the table was put back as it was, so no old fingerprint gets lost.)`; tab = bak; }
          el.querySelector('.ck-log').innerHTML = r.log.length ? r.log.map(esc).join('<br>') : 'No kicks needed.';
          draw([r.i1, r.i2]);
        };
        el.querySelector('.ck-ins').onclick = () => { const s = inE.value.trim().toLowerCase(); if (s) ins(s); };
        el.querySelector('.ck-more').onclick = () => { const s = MORE.find(x => !names.includes(x)); if (s) { inE.value = s; ins(s); } else resE.textContent = 'All example names are added. Press Reset.'; };
        el.querySelector('.ck-look').onclick = () => {
          const s = inE.value.trim().toLowerCase(); if (!s) return; const r = T.ckLookup(tab, s), real = names.includes(s);
          resE.innerHTML = r.hit < 0 ? `<strong style="color:var(--green)">DEFINITELY NOT</strong>: ${where(r)}, and neither has this fingerprint.`
            : real ? `<strong style="color:var(--amber)">MAYBE YES</strong>: found fingerprint <code>${r.fp.toString(16)}</code> in bucket ${r.hit}. It really was added.`
            : `<strong style="color:var(--red)">MAYBE YES, but wrong!</strong> Bucket ${r.hit} holds someone else's identical fingerprint <code>${r.fp.toString(16)}</code>. A false positive. With a 4-bit fingerprint this happens often; real filters use 8-12 bits.`;
          draw([r.i1, r.i2]);
        };
        el.querySelector('.ck-del').onclick = () => {
          const s = inE.value.trim().toLowerCase(); if (!s) return; const real = names.includes(s);
          if (!real) { const r = T.ckLookup(tab, s); resE.innerHTML = `<strong style="color:var(--red)">Stop!</strong> "${esc(s)}" was never added. ${r.hit >= 0 ? `Bucket ${r.hit} has the same fingerprint, but it belongs to someone else: deleting it would erase their mark (a false negative). ` : ''}So only delete what was surely added.`; draw([r.i1, r.i2]); return; }
          const r = T.ckDelete(tab, s); names = names.filter(x => x !== s);
          resE.innerHTML = `<strong style="color:var(--green)">Removed</strong>: fingerprint <code>${r.fp.toString(16)}</code> from bucket ${r.hit}. Now "${esc(s)}" is free again.`;
          draw([r.i1, r.i2]);
        };
        el.querySelector('.ck-rst').onclick = () => { reset(); resE.textContent = ''; el.querySelector('.ck-log').textContent = ''; draw(); };
        reset(); draw();
      }},
      { type: 'callout', tone: 'tip', title: 'Try this', html: `There are 6 names at the start. Press "+1 new name" again and again: at first names find empty slots straight away, then the table starts to fill and the kicks grow. After 10 new names the table is 100% full (16 slots). The next insert fails after 40 kicks: that is the "table is full" moment. (Real 4-slot filters start to fail near ~95% load.) Then press Reset, Delete "riya" and Lookup it: "definitely not". Also Lookup a name that was never added (like "kavya"): because the fingerprint is tiny, it sometimes says "maybe yes".` },

      { type: 'h2', text: 'HyperLogLog: unique visitors in ~12 KB' },
      { type: 'p', html: `<strong>Problem:</strong> the creator dashboard must show "how many <em>unique</em> people watched this video today". If one user watches 10 times, count 1. The direct way: one Set of user IDs per video. A viral video with 1 crore viewers × 8 bytes = 80 MB (raw IDs only, Redis Set overhead is extra), and there are crores of such videos, every day. This will not work.` },
      { type: 'callout', tone: 'term', title: 'New word: Cardinality', html: `<strong>What it is:</strong> the <strong>count of different (unique) things</strong> in a collection. [riya, aman, riya, neha] has a cardinality of 3 (riya appears twice, but she is one person).<br><strong>Why we need it:</strong> "unique viewers" is exactly this number. Views (4) and unique viewers (3) are different things.<br><strong>Without it:</strong> 10 refreshes by one user would be counted as 10 "people", and the creator would see a wrong number.` },
      { type: 'callout', tone: 'term', title: 'New word: HyperLogLog (HLL)', html: `<strong>What it is:</strong> a small counter that tells you "roughly how many unique people came", without remembering their list.<br><strong>Why we need it:</strong> keeping the full list of users for every video is impossible across crores of videos.<br><strong>Without it:</strong> a big Set per video (80 MB+ for a viral video), or a heavy batch job that runs all night.<br><strong>Example:</strong> in Redis one HLL is always ~12 KB, for 1,000 viewers or 100 crore, with an error of about 0.81%.` },
      { type: 'p', html: `The idea is like tossing a coin. If someone says "I tossed a coin and got 10 heads in a row", you would guess they tried <em>many</em> times (around 2^10 ≈ 1000), because 10 heads in a row is very rare. HyperLogLog hashes every user ID (bits that look random), and looks at how many zeros in a row the hash starts with. The longer the longest zero-run, the more unique users there were.` },
      { type: 'ascii', text: `Small example (showing the first 8 bits of each hash):

user_981 → 1 0 1 1 0 1 0 0    0 zeros at the start → run = 1  (first 1 at position 1)
user_12  → 0 0 1 0 1 1 1 0    2 zeros at the start → run = 3
user_77  → 0 0 0 0 1 0 1 1    4 zeros at the start → run = 5
user_981 → 1 0 1 1 0 1 0 0    came again: same hash, nothing changes

Biggest run = 5. "4 zeros in a row at the start" shows up about once in 16 (2^4)
different users. So this single counter would say "~16 users". There are only 3!
One counter = a lot of luck. So HLL averages thousands of buckets (below).` },
      { type: 'list', items: [
        `A single "longest run" depends a lot on luck. So the first few bits of the hash send each user into one of <strong>m buckets (registers)</strong>, each bucket remembers its own longest run, and at the end we take a special average of all of them (the harmonic mean).`,
        `Error (standard error) ≈ <strong>1.04 / √m</strong>. Redis uses 16,384 registers of 6 bits each: 16,384 × 6 / 8 = 12,288 bytes ≈ <strong>12 KB</strong>, and the error is 1.04/128 ≈ <strong>0.81%</strong>. With 1,000 users or 100 crore, the memory is the same.`,
        `If the same user comes again: same hash, same bucket, same run, so the count does not grow. Duplicates are ignored on their own.`,
        `Two HLLs can be <strong>merged</strong> (take the max of each register): Monday + Tuesday + ... = unique users for the whole week, without reading the data again. Doing this with Sets is far more costly.`,
      ]},
      { type: 'code', text: `PFADD   views:video42:2026-10-04  user_981 user_12 user_981   → duplicates ignored
PFCOUNT views:video42:2026-10-04                           → ~2
PFMERGE views:video42:week  views:video42:2026-10-04 views:video42:2026-10-05 ...` },
      { type: 'p', html: `Simulator: create n unique users (seeded, the same every time), pick the number of registers, and see how good the estimate is:` },
      { type: 'custom', render(el) {
        let p = 14, seed = 0;
        el.innerHTML = `<div><label>Real unique users (n): <strong class="hl-nv"></strong></label><input class="hl-n" type="range" min="2" max="6" step="0.25" value="5"></div>
          <div style="margin-top:10px"><label>Registers (m)</label><div class="hl-p" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          <div style="margin-top:10px"><label>Set of users (seed)</label><div class="hl-s" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          <div class="stats">
            <div class="stat"><span>HLL estimate</span><strong class="hl-est"></strong></div>
            <div class="stat"><span>Real error</span><strong class="hl-err"></strong></div>
            <div class="stat"><span>Expected error (1.04/√m)</span><strong class="hl-se"></strong></div>
            <div class="stat"><span>HLL memory</span><strong class="hl-mem"></strong></div>
            <div class="stat"><span>Exact Set (8-byte IDs only)</span><strong class="hl-set"></strong></div>
          </div>
          <div class="calc-note hl-note"></div>`;
        const nE = el.querySelector('.hl-n');
        const upd = () => {
          const n = Math.round(Math.pow(10, +nE.value));
          chipRow(el.querySelector('.hl-p'), [[4, '16'], [6, '64'], [8, '256'], [10, '1,024'], [12, '4,096'], [14, '16,384 (Redis)']], () => p, v => { p = v; upd(); });
          chipRow(el.querySelector('.hl-s'), [[0, 'Set A'], [1, 'Set B'], [2, 'Set C'], [3, 'Set D'], [4, 'Set E']], () => seed, v => { seed = v; upd(); });
          const r = T.hll(n, p, seed);
          el.querySelector('.hl-nv').textContent = n.toLocaleString('en-IN');
          el.querySelector('.hl-est').textContent = Math.round(r.est).toLocaleString('en-IN');
          const e = (r.est - n) / n;
          el.querySelector('.hl-err').textContent = (e >= 0 ? '+' : '') + pct(e);
          el.querySelector('.hl-se').textContent = '±' + pct(r.stdErr);
          el.querySelector('.hl-mem').textContent = fmtBytes(r.bytes);
          el.querySelector('.hl-set').textContent = fmtBytes(n * 8);
          el.querySelector('.hl-note').textContent = `The real error usually stays within 2 times the expected error. Pick a different "Set": the error is a little different each time, but the size stays the same. Make m 4 times bigger and the error halves (√4 = 2). Raise n: the HLL memory stays ${fmtBytes(r.bytes)}.`;
        };
        nE.addEventListener('input', upd); upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'HLL does not give a list', html: `HyperLogLog gives only a <strong>count</strong>. It cannot answer "which users were they?" or "did riya watch?" (use a Set or a Bloom filter for that). And where an exact number is a must (billing, payout per unique view), do not use HLL, or do the final numbers with an exact pipeline.` },

      { type: 'h2', text: 'Count-min sketch: who is the most popular?' },
      { type: 'p', html: `<strong>Problem:</strong> for xyz.com's "Trending" section we need to know, every minute, which hashtags are used the most. There are crores of different hashtags (most are used once or twice). An exact counter for every tag = a very big hash map. We only need the <strong>heavy hitters</strong> (the most used ones), and a good estimate of their counts.` },
      { type: 'callout', tone: 'term', title: 'New word: Heavy hitter', html: `<strong>What it is:</strong> a thing in a stream that comes far more often than everything else. Like <code>#ipl</code> on the night of the IPL final.<br><strong>Why we need it:</strong> the "Trending" section needs only the top 10-20; the crores of rare tags do not matter.<br><strong>Without it:</strong> you would keep an exact counter for every tag, which eats memory.` },
      { type: 'callout', tone: 'term', title: 'New word: Count-min sketch', html: `<strong>What it is:</strong> a small table of counters: <strong>d rows × w columns</strong>, each row with its own hash function. It gives an "estimate from above" of how often each thing came.<br><strong>Why we need it:</strong> even with crores of different tags, the memory is fixed and small (like 4 × 2,000 counters).<br><strong>Without it:</strong> a counter per tag, a hash map with crores of entries.<br><strong>How it works:</strong> <strong>Add "#ipl"</strong>: in each row, the hash picks one column; add +1 to that counter. <strong>Count "#ipl"</strong>: look at the same column in each row, and take the <strong>minimum</strong> of those d numbers. Other tags sometimes fall into the same counter (a collision), so a counter can only go <em>up</em>. That is why the estimate is never lower than the truth, only higher. Taking the minimum picks the counter with the least "mixing".` },
      { type: 'ascii', text: `Small example: d = 2 rows, w = 4 columns. Stream: #ipl ×5, #art ×1, #pets ×2

            col0  col1  col2  col3
row A:        0     5     3     0     #ipl→col1, #art→col2, #pets→col2  (art+pets collided)
row B:        1     0     2     5     #ipl→col3, #art→col0, #pets→col2

Count #ipl  = min(A[1]=5, B[3]=5) = 5   ✓ right
Count #art  = min(A[2]=3, B[0]=1) = 1   ✓ row A was mixed, row B saved us
Count #pets = min(A[2]=3, B[2]=2) = 2   ✓
With only one row (d = 1): #art = 3, wrong. More rows = more chances to escape mixing.` },
      { type: 'p', html: `For top-k: keep a small <strong>min-heap</strong> (size k) next to the sketch. (A min-heap = a small list that can always tell its smallest number right away.) On every new event, look at the tag's estimate; if it is bigger than the smallest in the heap, put it in the heap. This is a common pattern in stream processing (Flink, Kafka Streams). Below is a stream of 500 different hashtags (20 popular + 480 rare):` },
      { type: 'custom', render(el) {
        const items = T.cmsStream();
        const truth = Object.fromEntries(items);
        el.innerHTML = `<div class="row2">
            <div><label>Columns (w): <strong class="cm-wv"></strong></label><input class="cm-w" type="range" min="3" max="9" step="1" value="6"></div>
            <div><label>Rows / hash functions (d): <strong class="cm-dv"></strong></label><input class="cm-d" type="range" min="1" max="6" step="1" value="3"></div>
          </div>
          <div class="cm-tab table-wrap" style="margin-top:12px"></div>
          <div class="stats">
            <div class="stat"><span>Total events (N)</span><strong class="cm-n"></strong></div>
            <div class="stat"><span>Memory (4-byte counters)</span><strong class="cm-mem"></strong></div>
            <div class="stat"><span>Exact map (500 tags)</span><strong>500 entries</strong></div>
            <div class="stat"><span>Top 5 caught right?</span><strong class="cm-top"></strong></div>
          </div>
          <div class="calc-note cm-note"></div>`;
        const wE = el.querySelector('.cm-w'), dE = el.querySelector('.cm-d');
        const upd = () => {
          const w = 1 << +wE.value, d = +dE.value;
          el.querySelector('.cm-wv').textContent = w; el.querySelector('.cm-dv').textContent = d;
          const { est, total } = T.cmsRun(items, w, d);
          const show = ['#cricket', '#ipl', '#music', '#coding', '#memes', '#nature', '#tag7', '#tag300'];
          el.querySelector('.cm-tab').innerHTML = `<table><thead><tr><th>Tag</th><th>Real count</th><th>Sketch estimate</th><th>Over-counted</th></tr></thead><tbody>` +
            show.map(t => { const e = est(t), tr = truth[t]; return `<tr><td>${t}</td><td>${tr}</td><td><strong>${e}</strong></td><td style="color:${e - tr > tr ? 'var(--red)' : 'var(--ink-2)'}">+${e - tr}</td></tr>`; }).join('') + `</tbody></table>`;
          const byTrue = items.slice().sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
          const byEst = items.map(([t]) => [t, est(t)]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
          const hit = byEst.filter(t => byTrue.includes(t)).length;
          el.querySelector('.cm-n').textContent = total.toLocaleString('en-IN');
          el.querySelector('.cm-mem').textContent = (w * d) + ' counters = ' + fmtBytes(w * d * 4);
          el.querySelector('.cm-top').textContent = hit + ' / 5';
          el.querySelector('.cm-note').textContent = `Guarantee: an error of at most ~(e / w) × N = ${Math.round(Math.E / w * total).toLocaleString('en-IN')}, with probability ≥ ${pct(1 - Math.exp(-d), 0)} (1 − e^−d). The estimate for popular tags is quite good, while the estimate for rare tags (#tag7) gets badly inflated: a count-min sketch is for heavy hitters, not for rare things.`;
        };
        wE.addEventListener('input', upd); dE.addEventListener('input', upd); upd();
      }},

      { type: 'h2', text: '"What is near me?": geo indexes' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com launched a "Nearby" feature: creators streaming live within 2 km of you. (Uber/Ola have the same problem with "nearby drivers".) Each creator's latitude/longitude is in the DB. The direct way: compute the distance to every creator and sort. 10 lakh live points × thousands of requests every second = useless.` },
      { type: 'callout', tone: 'term', title: 'New word: Latitude and longitude', html: `<strong>What it is:</strong> the "address" of a place on Earth, as two numbers. <strong>Latitude</strong> = how far up or down from the equator (−90 to +90). <strong>Longitude</strong> = how far east or west from a line near London (−180 to +180). MG Road, Bengaluru ≈ (12.9756, 77.6067).<br><strong>Why we need it:</strong> every phone's GPS gives exactly these two numbers.<br><strong>The problem:</strong> these are two separate numbers (2D). A normal database index sorts only one number at a time.` },
      { type: 'callout', tone: 'term', title: 'New word: Geo index (spatial index)', html: `<strong>What it is:</strong> an index that quickly tells "what is near this place?". The trick: split the map into small cells (boxes), give each cell an ID, and store each point with its cell ID.<br><strong>Why we need it:</strong> then "nearby creators" = "creators in my cell and the neighbour cells". Read a few cells instead of scanning lakhs of points.<br><strong>Without it:</strong> lakhs of distance calculations on every request.` },
      { type: 'p', html: `A normal index sorts only one dimension. For <code>lat BETWEEN ... AND lng BETWEEN ...</code>, the lat index gives one thin strip (that latitude band across the whole world), the lng index gives another strip; joining the two is costly. We need to <strong>turn a 2D place into a 1D key</strong>, where nearby places also get similar keys. There are four popular ways: geohash, quadtree, S2 and H3.` },

      { type: 'h3', text: 'Geohash: prefix = area' },
      { type: 'callout', tone: 'term', title: 'New word: Geohash', html: `<strong>What it is:</strong> a short text code for a place, like <code>tdr1v</code> (MG Road, Bengaluru). The longer the code, the smaller the area.<br><strong>Why we need it:</strong> places that are near each other usually have codes that start the same way (the same prefix). "Nearby people" = "people whose code starts with <code>tdr1v</code>". That is fast in any normal database.<br><strong>Without it:</strong> 2D distance maths on every point.<br><strong>How it is made:</strong> cut the world in half again and again: first longitude (east half? 1, west? 0), then latitude (north? 1, south? 0), then longitude... Write every 5 bits as one character (base32: 0-9 and b-z, skipping a few letters). <strong>Each extra character splits the cell into 32 smaller cells.</strong> Two places that share a prefix (<code>tdr1…</code>) are inside the same bigger cell.` },
      { type: 'ascii', text: `First 5 bits, MG Road (lat 12.98, lng 77.61):

bit 1 (lng): −180..180, middle 0.    77.6 ≥ 0     → 1, now 0..180
bit 2 (lat): −90..90,   middle 0.    12.98 ≥ 0    → 1, now 0..90
bit 3 (lng): 0..180,    middle 90.   77.6 < 90    → 0, now 0..90
bit 4 (lat): 0..90,     middle 45.   12.98 < 45   → 0, now 0..45
bit 5 (lng): 0..90,     middle 45.   77.6 ≥ 45    → 1, now 45..90
bits 11001 = 25 → number 25 in the base32 list (counting from 0) = "t"   (0123456789bcdefghjkmnpqrstuvwxyz)
The next groups of 5 bits give "d", "r", "1", "v" ... = tdr1v` },
      { type: 'p', html: `So a "nearby" query becomes a simple string prefix query, which any sorted index (B-tree, Redis sorted set, Cassandra clustering key) does fast. Change the location and precision below: you will see the 32 pieces of the parent cell, and which piece your point is in.` },
      { type: 'custom', render(el) {
        const SIZES = ['5,009 km × 4,993 km', '1,252 km × 624 km', '156 km × 156 km', '39 km × 19.5 km', '4.9 km × 4.9 km', '1.2 km × 609 m', '153 m × 152 m', '38 m × 19 m', '4.8 m × 4.8 m'];
        const PRE = [['MG Road, Bengaluru', 12.9756, 77.6067], ['CST, Mumbai', 18.9398, 72.8355], ['India Gate, Delhi', 28.6129, 77.2295]];
        let pi = 0;
        el.innerHTML = `<div class="gh-pre" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div class="row2" style="margin-top:10px">
            <div><label>Latitude</label><input class="gh-lat" type="number" step="0.0001" value="12.9756"></div>
            <div><label>Longitude</label><input class="gh-lon" type="number" step="0.0001" value="77.6067"></div>
          </div>
          <div style="margin-top:10px"><label>Precision (characters): <strong class="gh-pv"></strong></label><input class="gh-p" type="range" min="1" max="9" step="1" value="5"></div>
          <svg class="gh-svg" viewBox="0 0 330 210" style="width:100%;max-width:460px;display:block;margin-top:12px"></svg>
          <div class="stats">
            <div class="stat"><span>Geohash</span><strong class="gh-h" style="font-family:var(--f-mono)"></strong></div>
            <div class="stat"><span>Cell size (at the equator, worst case)</span><strong class="gh-sz" style="font-size:17px"></strong></div>
          </div>
          <div class="calc-note gh-note"></div>`;
        const latE = el.querySelector('.gh-lat'), lonE = el.querySelector('.gh-lon'), pE = el.querySelector('.gh-p');
        const upd = () => {
          chipRow(el.querySelector('.gh-pre'), PRE.map((x, i) => [i, x[0]]), () => pi, i => { pi = i; latE.value = PRE[i][1]; lonE.value = PRE[i][2]; upd(); });
          const lat = Math.max(-89.9999, Math.min(89.9999, +latE.value || 0)), lon = Math.max(-179.9999, Math.min(179.9999, +lonE.value || 0)), p = +pE.value;
          const hash = T.geohash(lat, lon, p), parent = hash.slice(0, -1), pb = T.ghBounds(parent);
          const X = v => 10 + (v - pb.lo[0]) / (pb.lo[1] - pb.lo[0]) * 310, Y = v => 200 - (v - pb.la[0]) / (pb.la[1] - pb.la[0]) * 190;
          let s = '';
          for (const c of '0123456789bcdefghjkmnpqrstuvwxyz') {
            const b = T.ghBounds(parent + c), x0 = X(b.lo[0]), x1 = X(b.lo[1]), y0 = Y(b.la[1]), y1 = Y(b.la[0]);
            const me = parent + c === hash;
            s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" fill="${me ? 'var(--accent-soft)' : 'var(--surface)'}" stroke="${me ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${me ? 2 : 1}"/>` +
              `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${((y0 + y1) / 2 + 4).toFixed(1)}" font-size="11" text-anchor="middle" fill="${me ? 'var(--accent-ink)' : 'var(--ink-3)'}" font-family="var(--f-mono)">${c}</text>`;
          }
          s += `<circle cx="${X(lon).toFixed(1)}" cy="${Y(lat).toFixed(1)}" r="4" fill="var(--red)"/>`;
          el.querySelector('.gh-svg').innerHTML = s;
          el.querySelector('.gh-pv').textContent = p;
          el.querySelector('.gh-h').innerHTML = `<span style="color:var(--ink-3)">${esc(parent)}</span>${esc(hash.slice(-1))}`;
          el.querySelector('.gh-sz').textContent = SIZES[p - 1];
          el.querySelector('.gh-note').innerHTML = `The box above is the parent cell <code>${esc(parent || '(the whole world)')}</code>, cut into its 32 pieces (${p % 2 ? '8 columns × 4 rows' : '4 columns × 8 rows'}, because the bits go to longitude and latitude in turns). The box is not to scale; it is stretched to fit. Prefixes: ${[...hash].map((_, i) => '<code>' + esc(hash.slice(0, i + 1)) + '</code>').join(' ⊃ ')}`;
        };
        [latE, lonE, pE].forEach(x => x.addEventListener('input', upd)); upd();
      }},
      { type: 'callout', tone: 'warn', title: 'Weakness of geohash: borders', html: `Two places can be 10 metres apart but on two sides of a cell border, and then their geohash prefixes are totally different (worst case: near the equator or 0° longitude, where even the first character differs). So a "nearby" query always searches <strong>your cell + the 8 neighbour cells</strong>, then filters by real distance. Redis <code>GEOSEARCH</code> does the same: it turns the geohash into a 52-bit number kept in a sorted set, and for a radius query it reads the score ranges of 9 areas (1 + 8).` },

      { type: 'h3', text: 'Quadtree: crowded place, small cells' },
      { type: 'p', html: `Every geohash cell has the same size. But one block of Mumbai may have 5,000 creators, while a cell of the same size in the Rajasthan desert has 2. The search in the Mumbai cell is still heavy, and the desert cell is uselessly empty.` },
      { type: 'callout', tone: 'term', title: 'New word: Quadtree', html: `<strong>What it is:</strong> the map is one big square. When a square gets too many points (say more than 100), split it into <strong>4 smaller squares</strong> ("quad" = four). If a small square still has too many, split it again. This builds a tree: every box has 4 children.<br><strong>Why we need it:</strong> small cells in crowded places, big cells in empty places. Every cell holds roughly the same number of points, in a city or in a desert.<br><strong>Without it (a fixed grid):</strong> thousands of points in crowded cells, and useless empty cells.<br><strong>Example:</strong> in the ascii below, the top-right part was split again and again because it had many points. The empty part stayed big.` },
      { type: 'ascii', text: `
+-----------------+-----------------+
|                 |    |    |       |
|   2 points      +----+----+  12   |
|  (no need       |  80|  95|       |
|   to split)     +----+----+-------+
|                 |  60 | 40 |  7   |
+-----------------+-----+----+------+
|                 |                 |
|        5        |        0        |
|                 |                 |
+-----------------+-----------------+
  The crowded area (top right) was split again and again; the empty area stayed big.` },
      { type: 'list', items: [
        `<strong>Search:</strong> start at the root and go only into squares that touch your search circle. Even in a crowded place, each leaf has only ~100 points.`,
        `<strong>Good when:</strong> points do not move much (shops, places, static listings), and the whole tree fits in one machine's memory. It is usually built offline and loaded onto the servers.`,
        `<strong>Hard when:</strong> points move every few seconds (drivers). Updating the tree, splitting and merging on every move, with concurrency, is costly. There, a fixed grid (geohash/H3) + Redis is simpler.`,
      ]},
      { type: 'p', html: `See for yourself. The map is 256 × 256, with 120 creators: a crowded "city" at the top right (90) and the rest scattered (30). "Cell capacity" = after how many points a cell splits into 4. Then pick where the search circle is and how big it is, and see how many points the quadtree checks:` },
      { type: 'custom', render(el) {
        const P = T.qtPoints(), SPOTS = [['City centre', 180, 70], ['Edge of the city', 140, 110], ['Empty area', 60, 190]];
        let cap = 8, spot = 0;
        el.innerHTML = `<div class="row2">
            <div><label>Cell capacity: <strong class="qt-cv"></strong></label><input class="qt-c" type="range" min="2" max="24" step="1" value="8"></div>
            <div><label>Search radius: <strong class="qt-rv"></strong></label><input class="qt-r" type="range" min="8" max="60" step="2" value="20"></div>
          </div>
          <div class="qt-sp" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <svg class="qt-svg" viewBox="0 0 260 260" style="width:100%;max-width:340px;display:block;margin:12px auto 0"></svg>
          <div class="stats">
            <div class="stat"><span>Leaf cells</span><strong class="qt-l"></strong></div>
            <div class="stat"><span>Cells (boxes) visited</span><strong class="qt-v"></strong></div>
            <div class="stat"><span>Points checked</span><strong class="qt-ch"></strong></div>
            <div class="stat"><span>Found inside the circle</span><strong class="qt-f"></strong></div>
            <div class="stat"><span>Without an index: check</span><strong>120</strong></div>
          </div>
          <div class="calc-note qt-note"></div>`;
        const cE = el.querySelector('.qt-c'), rE = el.querySelector('.qt-r');
        const upd = () => {
          cap = +cE.value; const r = +rE.value, [, cx, cy] = SPOTS[spot];
          chipRow(el.querySelector('.qt-sp'), SPOTS.map((x, i) => [i, x[0]]), () => spot, i => { spot = i; upd(); });
          const tree = T.qtBuild(P, cap), leaves = T.qtLeaves(tree), q = T.qtQuery(tree, cx, cy, r);
          let s = leaves.map(l => `<rect x="${(2 + l.x).toFixed(1)}" y="${(2 + l.y).toFixed(1)}" width="${l.size}" height="${l.size}" fill="var(--surface)" stroke="var(--line-2)" stroke-width="0.8"/>`).join('');
          s += `<circle cx="${2 + cx}" cy="${2 + cy}" r="${r}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5" opacity="0.85"/>`;
          s += P.map(([x, y]) => { const inn = (x - cx) ** 2 + (y - cy) ** 2 <= r * r; return `<circle cx="${(2 + x).toFixed(1)}" cy="${(2 + y).toFixed(1)}" r="2.2" fill="${inn ? 'var(--accent)' : 'var(--ink-3)'}"/>`; }).join('');
          el.querySelector('.qt-svg').innerHTML = s;
          el.querySelector('.qt-cv').textContent = cap; el.querySelector('.qt-rv').textContent = r;
          el.querySelector('.qt-l').textContent = leaves.length;
          el.querySelector('.qt-v').textContent = q.visited;
          el.querySelector('.qt-ch').textContent = q.checked;
          el.querySelector('.qt-f').textContent = q.found;
          el.querySelector('.qt-note').textContent = `In the crowded city the cells became small; in empty places they stayed big. The search went only into boxes that touch the circle: it checked ${q.checked} points, not 120. Lower the capacity: more and smaller cells, fewer points per box, but a deeper tree (more boxes visited). Raise the capacity: the opposite.`;
        };
        cE.addEventListener('input', upd); rE.addEventListener('input', upd); upd();
      }},

      { type: 'h3', text: 'Google S2: cells on a sphere' },
      { type: 'callout', tone: 'term', title: 'New word: S2', html: `<strong>What it is:</strong> Google's open-source library that splits the whole (round!) Earth into cells and gives each cell a 64-bit number.<br><strong>Why we need it:</strong> geohash treats the Earth as flat paper, so cells near the poles get stretched. S2 makes roughly equal cells for a round Earth, and can cover any shape (a circle, a city border) with cells.<br><strong>Without it:</strong> wrongly sized cells over big areas and near the poles, and polygon queries are hard.` },
      { type: 'callout', tone: 'term', title: 'New word: Hilbert curve', html: `<strong>What it is:</strong> a twisty line that passes through every cell of a grid once and never makes a long jump. Number the cells 0, 1, 2, 3... along this line.<br><strong>Why we need it:</strong> close numbers on the line = close cells on the map. So "the cells of this area" often become one or a few continuous number ranges, which a database reads quickly.<br><strong>Without it:</strong> with line-by-line numbering, the numbers of up-and-down neighbours are far apart (like 5 and 21), and one area = many small ranges.` },
      { type: 'p', html: `Geohash treats the Earth as a flat rectangle, so near the poles its cells get thin and strange. <strong>S2</strong> (Google's open-source library) puts the Earth inside a <strong>cube</strong> and projects it onto the cube's 6 faces. Each face is split into 4 parts again and again: <strong>31 levels</strong> (0 to 30), and a level 30 cell is ~1 cm. Cells are numbered in <strong>Hilbert curve</strong> order (a zig-zag line that passes through each cell once and gives nearby cells nearby numbers). Each cell ID is a <strong>64-bit number</strong>.` },
      { type: 'list', items: [
        `<strong>Region covering:</strong> "which cells cover this circle/polygon?" S2 gives a mix of big and small cells. Each cell = one continuous range of IDs. So a geo query = a few range scans, on any sorted key-value store.`,
        `<strong>Where:</strong> Google's geo systems, and MongoDB's 2dsphere index uses the S2 library inside.`,
      ]},
      { type: 'p', html: `See the benefit of the Hilbert curve yourself. Pick a grid level (at each level every cell splits into 4), then pick an area. The widget counts how many <strong>continuous pieces (ranges)</strong> the IDs of that area's cells fall into: with Hilbert numbering, and with normal "line by line" numbering. Fewer ranges = fewer separate reads in the database.` },
      { type: 'custom', render(el) {
        const BOX = [['One quarter (bottom right)', [0.5, 0, 1, 0.5]], ['Square in the middle', [0.25, 0.25, 0.75, 0.75]], ['Odd-shaped area', [0.1, 0.55, 0.45, 0.9]]];
        let L = 3, bi = 0;
        el.innerHTML = `<label>Level (grid)</label><div class="hb-l" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div style="margin-top:10px"><label>Area</label><div class="hb-b" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          <svg class="hb-svg" viewBox="0 0 260 260" style="width:100%;max-width:340px;display:block;margin:12px auto 0"></svg>
          <div class="stats">
            <div class="stat"><span>Cells in the area</span><strong class="hb-c"></strong></div>
            <div class="stat"><span>Hilbert: ranges</span><strong class="hb-h"></strong></div>
            <div class="stat"><span>Line by line: ranges</span><strong class="hb-r"></strong></div>
          </div>
          <div class="calc-note hb-note"></div>`;
        const upd = () => {
          chipRow(el.querySelector('.hb-l'), [[1, '2 × 2'], [2, '4 × 4'], [3, '8 × 8'], [4, '16 × 16']], () => L, v => { L = v; upd(); });
          chipRow(el.querySelector('.hb-b'), BOX.map((b, i) => [i, b[0]]), () => bi, v => { bi = v; upd(); });
          const n = 1 << L, c = 256 / n, box = BOX[bi][1], r = T.hilRegion(n, box);
          let s = '', pts = [];
          for (let d = 0; d < n * n; d++) {
            const [x, y] = T.hilD2xy(n, d), cx = (x + 0.5) / n, cy = (y + 0.5) / n, inn = cx >= box[0] && cx <= box[2] && cy >= box[1] && cy <= box[3];
            const px = 2 + x * c, py = 2 + (n - 1 - y) * c;
            s += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${c.toFixed(1)}" height="${c.toFixed(1)}" fill="${inn ? 'var(--accent-soft)' : 'var(--surface)'}" stroke="var(--line-2)" stroke-width="0.6"/>`;
            if (n <= 8) s += `<text x="${(px + c / 2).toFixed(1)}" y="${(py + c / 2 + 4).toFixed(1)}" font-size="${n <= 4 ? 13 : 10}" text-anchor="middle" fill="${inn ? 'var(--accent-ink)' : 'var(--ink-3)'}" font-family="var(--f-mono)">${d}</text>`;
            pts.push((px + c / 2).toFixed(1) + ',' + (py + c / 2).toFixed(1));
          }
          s += `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--red)" stroke-width="${n <= 4 ? 2 : 1.3}" opacity="0.75"/>`;
          el.querySelector('.hb-svg').innerHTML = s;
          el.querySelector('.hb-c').textContent = r.cells;
          el.querySelector('.hb-h').textContent = r.hilRuns;
          el.querySelector('.hb-r').textContent = r.rowRuns;
          el.querySelector('.hb-note').textContent = `The red line is the Hilbert curve: it visits every cell once and never makes a long jump. So numbers that are close on the curve are also close on the map. With Hilbert numbering the bottom-right quarter is always just 1 range; with line-by-line numbering each of its rows is a separate range (8 ranges on 16 × 16). For the "odd-shaped area", which does not match cell borders, both can be equal: that is why the S2 coverer mixes big and small cells to cover an area.`;
        };
        upd();
      }},

      { type: 'h3', text: 'Uber H3: hexagons' },
      { type: 'callout', tone: 'term', title: 'New word: H3', html: `<strong>What it is:</strong> Uber's open-source grid system. It splits the world into <strong>hexagons</strong> (cells with 6 corners, like a honeycomb), in many sizes (resolutions). Each cell has a 64-bit ID.<br><strong>Why we need it:</strong> "nearby drivers", surge pricing, a map of demand: all become clean questions like "how many in this hexagon".<br><strong>Without it:</strong> in square cells the corner neighbours are far and the side neighbours are near, so distance maths gets uneven.<br><strong>Example:</strong> one resolution 9 hexagon is ~0.1 km², about one big neighbourhood.` },
      { type: 'callout', tone: 'term', title: 'New word: k-ring (gridDisk)', html: `<strong>What it is:</strong> a cell plus the k "rings" around it. k = 1 = your cell + 6 neighbours = 7 cells.<br><strong>Why we need it:</strong> "near me" means "my cell + the neighbour cells". A driver just across the border is found too.<br><strong>Without it:</strong> if you look only at your own cell, even a driver 60 m away can be missed (you will see this in the flow below).` },
      { type: 'p', html: `Uber open-sourced its grid system <strong>H3</strong> in 2018 (an Uber Engineering blog post, a few years old now, but the library is still active at h3geo.org). H3 splits the world into <strong>hexagons</strong> (cells with 6 corners). In Uber's marketplace (surge pricing, dispatch), events are put into hexagon cells to analyse a whole city.` },
      { type: 'p', html: `Why hexagons? Look below. In a square grid there are two kinds of neighbours: side ones (distance 1) and corner ones (distance ≈ 1.41). In a hexagon all 6 neighbours are at <strong>the same distance</strong>:` },
      { type: 'custom', render(el) {
        const sq = [], hx = [];
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) sq.push([dx, dy]);
        const hexPts = (cx, cy, r) => [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1); }).join(' ');
        hx.push([0, 0]); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; hx.push([Math.cos(a), Math.sin(a)]); }
        const S = 44, R = 26, D = R * Math.sqrt(3);
        let sv = '';
        sq.forEach(([x, y]) => { sv += `<rect x="${(80 + x * S - S / 2).toFixed(1)}" y="${(80 + y * S - S / 2).toFixed(1)}" width="${S}" height="${S}" fill="${x || y ? 'var(--surface)' : 'var(--accent-soft)'}" stroke="var(--line-2)"/>`; });
        sq.forEach(([x, y]) => { if (x || y) sv += `<line x1="80" y1="80" x2="${80 + x * S}" y2="${80 + y * S}" stroke="${x && y ? 'var(--red)' : 'var(--green)'}" stroke-width="2"/>`; });
        sv += `<text x="80" y="170" font-size="12" text-anchor="middle" fill="var(--ink-2)">side: 1, corner: 1.41</text>`;
        let hv = '';
        hx.forEach(([x, y]) => { hv += `<polygon points="${hexPts(250 + x * D, 80 + y * D, R)}" fill="${x || y ? 'var(--surface)' : 'var(--accent-soft)'}" stroke="var(--line-2)"/>`; });
        hx.slice(1).forEach(([x, y]) => { hv += `<line x1="250" y1="80" x2="${(250 + x * D).toFixed(1)}" y2="${(80 + y * D).toFixed(1)}" stroke="var(--green)" stroke-width="2"/>`; });
        hv += `<text x="250" y="170" font-size="12" text-anchor="middle" fill="var(--ink-2)">all 6 neighbours: 1</text>`;
        el.innerHTML = `<svg viewBox="0 0 330 180" style="width:100%;max-width:460px;display:block">${sv}${hv}</svg>
          <div class="calc-note">Green = the same distance, red = a longer distance. In a hexagon grid, "1 ring away" means about the same distance in every direction, so smoothing, gradients and "nearby cells" maths stay clean. The corner neighbours of a square are ~41% farther away.</div>`;
      }},
      { type: 'list', items: [
        `<strong>16 resolutions</strong> (0 to 15). Each next resolution makes cells ~7 times smaller (aperture 7). Some numbers: a resolution 7 hexagon is ~5.2 km², resolution 8 ~0.74 km², resolution 9 ~0.11 km² (edge ~200 m).`,
        `<strong>Base:</strong> 122 base cells (110 hexagons + 12 pentagons). A whole sphere cannot be covered with hexagons only, so there are 12 pentagons; H3 places them in the ocean so they affect land less.`,
        `<strong>Parent-child is approximate:</strong> 7 small hexagons do not fit exactly inside one big hexagon, so child cells are only "roughly" inside the parent. With squares (geohash, S2) this is exact. That is one price of H3.`,
        `<strong>k-ring (gridDisk):</strong> your cell + 1 ring = 7 cells, 2 rings = 19 cells. "Nearby drivers" = 1-2 rings around the rider's cell.`,
      ]},
      { type: 'p', html: `Build a k-ring yourself. Pick the resolution and k: the widget tells you how many cells must be read and how much area they cover (using the average numbers from h3geo.org):` },
      { type: 'custom', render(el) {
        const RES = { 7: [5.161, 1.406], 8: [0.7373, 0.5314], 9: [0.1053, 0.2008], 10: [0.01505, 0.07586] };
        let res = 9;
        el.innerHTML = `<div class="row2">
            <div><label>Rings (k): <strong class="kr-kv"></strong></label><input class="kr-k" type="range" min="0" max="4" step="1" value="1"></div>
            <div><label>Resolution</label><div class="kr-r" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          </div>
          <svg class="kr-svg" viewBox="0 0 300 260" style="width:100%;max-width:380px;display:block;margin:12px auto 0"></svg>
          <div class="stats">
            <div class="stat"><span>Cells to read (1 + 3k(k+1))</span><strong class="kr-n"></strong></div>
            <div class="stat"><span>Total area, roughly</span><strong class="kr-a"></strong></div>
            <div class="stat"><span>Reach in each direction, roughly</span><strong class="kr-d"></strong></div>
          </div>
          <div class="calc-note kr-note"></div>`;
        const kE = el.querySelector('.kr-k');
        const upd = () => {
          const k = +kE.value;
          chipRow(el.querySelector('.kr-r'), [7, 8, 9, 10].map(r => [r, 'res ' + r]), () => res, v => { res = v; upd(); });
          const R = 13, n = T.h3Disk(k), [area, edge] = RES[res], gap = Math.sqrt(3) * edge;
          let s = '';
          for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
            const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); if (d > 4) continue;
            const cx = 150 + R * Math.sqrt(3) * (q + r / 2), cy = 130 + R * 1.5 * r;
            const pts = [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (cx + R * Math.cos(a)).toFixed(1) + ',' + (cy + R * Math.sin(a)).toFixed(1); }).join(' ');
            const fill = d === 0 ? 'var(--accent)' : d <= k ? 'var(--accent-soft)' : 'var(--surface)';
            s += `<polygon points="${pts}" fill="${fill}" stroke="var(--line-2)" stroke-width="1"/>`;
            if (d <= k && d > 0) s += `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="10" text-anchor="middle" fill="var(--accent-ink)">${d}</text>`;
          }
          el.querySelector('.kr-svg').innerHTML = s;
          el.querySelector('.kr-kv').textContent = k;
          el.querySelector('.kr-n').textContent = n;
          el.querySelector('.kr-a').textContent = (n * area).toFixed(n * area < 1 ? 2 : 1) + ' km²';
          el.querySelector('.kr-d').textContent = k ? '~' + (k * gap).toFixed(2) + ' km' : 'only your own cell';
          el.querySelector('.kr-note').textContent = `The dark cell in the middle is the rider's. The number on each ring is that cell's "distance". k = 1 gives 7 cells, k = 2 gives 19, k = 3 gives 37. At resolution 9 one hexagon is ~0.105 km² (edge ~200 m), and two neighbour centres are ~${(Math.sqrt(3) * 0.2008).toFixed(2)} km apart. The reach is only a guess (centre to centre); you filter by real distance later.`;
        };
        kE.addEventListener('input', upd); upd();
      }},
      { type: 'flow', title: 'Nearby drivers / creators with H3 cells', height: 330,
        nodes: [
          { id: 'drv', label: 'Driver app', sub: 'sends location', x: 100, y: 70, w: 150, kind: 'client', info: 'What it is: the app on the driver\'s (or live creator\'s) phone. Every few seconds it sends its lat/lng (location), so the map stays fresh.' },
          { id: 'loc', label: 'Location service', sub: 'lat/lng → H3 cell', x: 340, y: 70, w: 170, kind: 'server', info: 'What it is: a small service that receives location updates. It turns a location into an H3 cell ID (for example at resolution 9) and moves the driver from the old cell to the new cell in the geo index.' },
          { id: 'geo', label: 'Geo index', sub: 'cell → drivers (Redis)', x: 580, y: 170, w: 180, kind: 'cache', info: 'What it is: a map kept in RAM (often Redis). Why: thousands of reads/writes every second, and a disk-based DB is not that fast. Inside: H3 cell ID → the drivers in that cell (with their last location and a TTL, so drivers who closed the app drop out on their own).' },
          { id: 'rid', label: 'Rider app', sub: 'drivers nearby?', x: 100, y: 270, w: 150, kind: 'client', info: 'What it is: the rider\'s (or viewer\'s) app. The user wants to see nearby cars (or nearby creators).' },
          { id: 'mt', label: 'Matching', sub: 'nearby + rank', x: 340, y: 270, w: 170, kind: 'server', info: 'What it is: the service that answers "who is near". It fetches the drivers in the rider\'s cell and its neighbour cells, and sorts them by real distance/ETA.' },
        ],
        edges: [{ a: 'drv', b: 'loc' }, { a: 'loc', b: 'geo' }, { a: 'rid', b: 'mt' }, { a: 'mt', b: 'geo' }],
        scenarios: [
          { name: 'Driver update', steps: [
            { title: 'A location arrives', text: 'The driver sent their location.', go: 'drv>loc', msg: '{ driver: "d17", lat: 12.9756, lng: 77.6067 }' },
            { title: 'Find the cell', text: 'latLngToCell(lat, lng, 9) → one H3 cell ID. This is pure maths, no DB call.', focus: ['loc'], msg: 'cell = 8961xxxxxxxxxxx (res 9, ~0.1 km²)' },
            { title: 'Update the index', text: 'Remove the driver from the old cell\'s list and add them to the new one. If the cell did not change, just refresh the last location.', go: 'loc>geo', after: { geo: { state: 'ok', sub: 'd17 → new cell' } } },
          ]},
          { name: 'Rider search', steps: [
            { title: 'Request', text: 'The rider opened the app.', go: 'rid>mt', msg: 'GET /nearby?lat=12.9760&lng=77.6071' },
            { title: 'Own cell + 1 ring', text: 'The rider\'s cell and its 6 neighbours: 7 cells. Fetch the drivers in just these.', go: ['mt>geo', 'res:geo>mt'], msg: 'gridDisk(riderCell, 1) → 7 cells → 23 drivers' },
            { title: 'Filter and rank by distance', text: 'Cells only say "where to look". Sort by real distance/ETA and send the top results.', go: 'res:mt>rid', msg: '[d17: 250 m, d4: 410 m, d88: 900 m]' },
          ]},
          { name: 'Border miss (failure)', steps: [
            { title: 'Only its own cell', text: 'A new developer searches only the rider\'s cell, with no ring.', go: ['rid>mt', 'mt>geo', 'res:geo>mt'], msg: 'cell(rider) → 0 drivers' },
            { title: '"No drivers"', text: 'The rider saw "no cars", even though a driver was 60 m away, just in the cell across the border.', go: 'bad:mt>rid', set: { mt: { state: 'warn', sub: 'border miss' } } },
            { title: 'Fix', text: 'Always include neighbour cells too (a k-ring in H3, the 8 neighbours in geohash), and if it comes back empty, grow the ring (k = 2, 3).', focus: ['mt'] },
          ]},
          { name: 'Hot cell (failure)', steps: [
            { title: 'Match over, stadium empties', text: '50,000 people ask for a ride from one area at the same time, and hundreds of drivers are in that same cell.', flood: { paths: ['rid>mt>geo'], n: 14 }, after: { geo: { state: 'hot', sub: 'storm on one key' } } },
            { title: 'One hot Redis key', text: 'All reads and writes hit one cell key: that shard\'s CPU is full. The other shards are relaxed.', set: { mt: { state: 'warn' } }, focus: ['geo'] },
            { title: 'Fix', text: 'Use a finer resolution (res 10) for crowded places, replicas/a local cache for reads of hot cells, and run matching in batches (all together every 1-2 seconds).', set: { geo: { state: 'ok', sub: 'finer cells' }, mt: { state: '' } } },
          ]},
        ],
      },
      { type: 'table', head: ['', 'Geohash', 'Quadtree', 'S2', 'H3'], rows: [
        ['Shape', 'Rectangles', 'Squares (different sizes)', 'Quads on a cube → sphere', 'Hexagons (+12 pentagons)'],
        ['Cell size', 'Fixed per length', 'Depends on the data', 'Fixed per level', 'Fixed per resolution'],
        ['Key', 'String prefix', 'Tree path (in memory)', '64-bit ID (Hilbert order)', '64-bit ID'],
        ['Great when', 'Simple, works in any DB/Redis', 'Static points, very uneven crowding', 'Polygons, accurate coverage', 'Equal-distance neighbours, analytics, surge'],
        ['Weakness', 'Prefix breaks at borders, distorts near poles', 'Costly updates for moving points', 'A bit complex', 'Parent-child not exact'],
      ]},

      { type: 'h2', text: 'Skip list: inside a Redis sorted set' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com has a live leaderboard of creators: "top 100 creators by views", "what is riya's rank", "show ranks 500-520". The score changes on every update. In a sorted array an insert is O(n) (everyone has to shift), in a linked list a search is O(n). A balanced tree (red-black) works, but the code is complex. A <strong>skip list</strong> is simple and O(log n) on average.` },
      { type: 'callout', tone: 'term', title: 'New word: Linked list', html: `<strong>What it is:</strong> a chain of items, where each item only keeps the address (pointer) of the next item. Adding a new item in the middle is easy: just change two pointers.<br><strong>The problem:</strong> to reach an item you must walk from the start, one by one. 1 crore items = up to 1 crore steps.` },
      { type: 'callout', tone: 'term', title: 'New word: Skip list', html: `<strong>What it is:</strong> a sorted linked list with "express lanes" on top, like a fast train that skips some stations while the local train stops at all of them. Each item flips a coin to decide whether it also goes into the lane above (half the items on level 2, a quarter on level 3...).<br><strong>Why we need it:</strong> when searching, move fast in the top lane, and step down where the next item gets too big. Search, insert, rank: all O(log n) on average, with simple code.<br><strong>Without it:</strong> in a sorted array every insert shifts everyone, in a linked list every search walks the whole way.<br><strong>Example:</strong> someone's rank among 1 crore scores in ~25-30 steps.` },
      { type: 'ascii', text: `
Level 3:  HEAD ─────────────────────────────> 50 ──────────────────> NIL
Level 2:  HEAD ──────────> 20 ──────────────> 50 ──────> 80 ───────> NIL
Level 1:  HEAD ──> 10 ──> 20 ──> 30 ──> 40 ──> 50 ──> 70 ──> 80 ──> 90 ──> NIL

Search 70:  L3: 50 (smaller than 70, move on) → NIL (stop, go down)
            L2: 80 (bigger, go down)
            L1: found 70.   ~4 steps for 9 items; ~25-30 for 1 crore.` },
      { type: 'list', items: [
        `<strong>Redis sorted sets</strong> (ZADD, ZRANGE, ZRANK) use a <strong>skip list + hash table</strong> once they get big: the skip list for score order and rank (each node remembers a "span", so rank is also O(log n)), and the hash table for an O(1) "member → score" lookup. Small sets (up to 128 entries by default) live in a compact listpack.`,
        `Concurrent versions (lock-free skip lists) are also easy, so Java's <code>ConcurrentSkipListMap</code> and the in-memory tables of many databases (the LSM memtable, as in LevelDB/RocksDB) use skip lists.`,
        `<strong>The price:</strong> memory for the extra pointers, and randomness: the worst case can be slow (but with a very small probability).`,
      ]},
      { type: 'p', html: `Try it yourself. Pick the number of items, search for a number, and see how many steps it takes. Coin flips (seeded) decide the levels, so you get the same picture every time:` },
      { type: 'custom', render(el) {
        let n = 16;
        el.innerHTML = `<label>Items</label><div class="sl-n" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center">
            <input type="number" class="sl-x" value="75" style="max-width:120px">
            <button type="button" class="btn small primary sl-go">Search</button>
          </div>
          <div class="sl-pic table-wrap" style="margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Steps for this search</span><strong class="sl-s"></strong></div>
            <div class="stat"><span>Skip list: average steps</span><strong class="sl-a"></strong></div>
            <div class="stat"><span>Normal list: average steps</span><strong class="sl-l"></strong></div>
          </div>
          <div class="calc-note sl-note"></div>`;
        const xE = el.querySelector('.sl-x');
        const upd = () => {
          chipRow(el.querySelector('.sl-n'), [16, 32, 64, 128].map(v => [v, String(v)]), () => n, v => { n = v; upd(); });
          const V = [...Array(n)].map((_, i) => i * 7 + 5), N = T.slBuild(V, 77), x = Math.round(+xE.value || 0), r = T.slSearch(N, x);
          let tot = 0; V.forEach(v => { tot += T.slSearch(N, v).steps; });
          const on = new Set(r.path.map(([L, j]) => L + ':' + j));
          if (n <= 32) {
            const cw = 20, W = 44 + n * cw, H = r.top * 26 + 10;
            let s = '';
            for (let L = r.top; L >= 1; L--) {
              const y = 8 + (r.top - L) * 26;
              s += `<text x="4" y="${y + 13}" font-size="10" fill="var(--ink-3)">L${L}</text>`;
              N.forEach((nd, j) => { if (nd.lv >= L) { const hit = on.has(L + ':' + j); s += `<rect x="${30 + j * cw}" y="${y}" width="${cw - 3}" height="18" rx="3" fill="${hit ? 'var(--accent)' : 'var(--surface)'}" stroke="${hit ? 'var(--accent)' : 'var(--line-2)'}"/><text x="${30 + j * cw + (cw - 3) / 2}" y="${y + 13}" font-size="9" text-anchor="middle" fill="${hit ? 'var(--bg)' : 'var(--ink-2)'}" font-family="var(--f-mono)">${nd.v}</text>`; } });
            }
            el.querySelector('.sl-pic').innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.min(W, 520)}px;display:block">${s}</svg>`;
          } else el.querySelector('.sl-pic').innerHTML = `<div style="color:var(--ink-3);font-size:14px">${n} items make a big picture; the numbers are below.</div>`;
          el.querySelector('.sl-s').textContent = `${r.steps} (${r.found ? 'found' : 'not found'})`;
          el.querySelector('.sl-a').textContent = (tot / n).toFixed(1);
          el.querySelector('.sl-l').textContent = ((n + 1) / 2).toFixed(1);
          el.querySelector('.sl-note').textContent = `Dark boxes = where the search stopped (as far forward as it could go on each level). When items grow 8 times (16 → 128), the skip list's average steps go only from ~8 to ~10, while the normal list goes from 8.5 to 64.5. That is what O(log n) means.`;
        };
        el.querySelector('.sl-go').onclick = upd; xE.addEventListener('change', upd); upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'A skip list is probabilistic, but never wrong', html: `Bloom filter and HLL answers can be wrong. A skip list's answer is <strong>always right</strong>; the randomness is only in its <em>speed</em> (coin flips decide the levels). These two kinds of "probabilistic" are different things.` },

      { type: 'h2', text: 'Merkle tree: compare two copies quickly' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com's user data sits on 3 replicas in a Dynamo-style database. One replica was cut off from the network for 10 minutes and missed some writes. Now, which keys are different? Comparing 1 crore keys one by one over the network = a lot of bandwidth and time.` },
      { type: 'callout', tone: 'term', title: 'New word: Merkle tree (hash tree)', html: `<strong>What it is:</strong> an upside-down tree of hashes. The hash of each key-value is a leaf. Two leaf hashes are combined into the hash above them, and so on, until one <strong>root hash</strong> sits at the top. It is a "fingerprint" of all the data.<br><strong>Why we need it:</strong> if two replicas have the same root hash → all data is the same, job done (one single compare!). If different → compare both children, and go down only the side that differs.<br><strong>Without it:</strong> 1 crore keys compared one by one over the network.<br><strong>Example:</strong> 8 keys, 1 key differs → the root, then 2, then 2, then 2 = 7 hash compares, and you send only that 1 key.` },
      { type: 'callout', tone: 'term', title: 'New word: Anti-entropy', html: `<strong>What it is:</strong> quietly matching replicas with each other in the background, so writes that did not reach a replica reach it later. ("Entropy" = the habit of things drifting apart; "anti" = against it.)<br><strong>Why we need it:</strong> the network sometimes breaks. Without a sync, replicas slowly drift apart.<br><strong>Without it:</strong> old data would stay on one replica forever.` },
      { type: 'p', html: `Change one or two keys on replica B and watch how the comparison goes down only the path that differs:` },
      { type: 'custom', render(el) {
        const keys = [...Array(8)].map((_, i) => 'k' + (i + 1));
        const changed = new Set([2]);
        el.innerHTML = `<label>Which keys are different on replica B (click)</label><div class="mrk-ch" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <svg class="mrk-svg" viewBox="0 0 360 215" style="width:100%;max-width:560px;display:block;margin-top:12px"></svg>
          <div class="stats">
            <div class="stat"><span>Hashes compared</span><strong class="mrk-c"></strong></div>
            <div class="stat"><span>Keys that need a sync</span><strong class="mrk-k"></strong></div>
            <div class="stat"><span>Without a tree: compare</span><strong>8 keys</strong></div>
          </div>
          <div class="calc-note mrk-note"></div>`;
        const upd = () => {
          const box = el.querySelector('.mrk-ch'); box.innerHTML = '';
          keys.forEach((k, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (changed.has(i) ? ' on' : ''); b.textContent = k; b.onclick = () => { if (changed.has(i)) changed.delete(i); else changed.add(i); upd(); }; box.appendChild(b); });
          const A = T.merkle(keys.map((k, i) => k + '=v' + i)), B = T.merkle(keys.map((k, i) => k + '=v' + i + (changed.has(i) ? '*' : '')));
          const r = T.merkleDiff(A, B);
          let s = '';
          const pos = (l, i) => { const cnt = 1 << l, gap = 360 / cnt; return [gap * i + gap / 2, 22 + l * 58]; };
          for (let l = 1; l < A.length; l++) for (let i = 0; i < A[l].length; i++) { const [x, y] = pos(l, i), [px, py] = pos(l - 1, i >> 1); s += `<line x1="${px.toFixed(1)}" y1="${py + 16}" x2="${x.toFixed(1)}" y2="${y - 16}" stroke="var(--line-2)"/>`; }
          for (let l = 0; l < A.length; l++) for (let i = 0; i < A[l].length; i++) {
            const [x, y] = pos(l, i), d = r.diffNodes.has(l + ':' + i), w = 40;
            s += `<rect x="${(x - w / 2).toFixed(1)}" y="${y - 16}" width="${w}" height="32" rx="5" fill="${d ? 'color-mix(in srgb, var(--red) 14%, var(--surface))' : 'var(--surface)'}" stroke="${d ? 'var(--red)' : 'var(--green)'}" stroke-width="1.5"/>` +
              `<text x="${x.toFixed(1)}" y="${y - 3}" font-size="8.5" text-anchor="middle" font-family="var(--f-mono)" fill="var(--ink-2)">${A[l][i]}</text>` +
              `<text x="${x.toFixed(1)}" y="${y + 10}" font-size="8.5" text-anchor="middle" font-family="var(--f-mono)" fill="${d ? 'var(--red)' : 'var(--ink-3)'}">${B[l][i]}</text>`;
            if (l === A.length - 1) s += `<text x="${x.toFixed(1)}" y="${y + 28}" font-size="9" text-anchor="middle" fill="var(--ink-3)">${keys[i]}</text>`;
          }
          el.querySelector('.mrk-svg').innerHTML = s;
          el.querySelector('.mrk-c').textContent = r.compares;
          el.querySelector('.mrk-k').textContent = r.diffLeaves.length ? r.diffLeaves.map(i => keys[i]).join(', ') : 'none';
          el.querySelector('.mrk-note').textContent = `In each box, the top line is replica A's hash and the bottom line is B's. Red = different. ${changed.size ? 'The comparison went down only the red path.' : 'The root is the same: one single compare told us both replicas are the same.'} At real scale: a tree over 1 crore keys is ~24 levels deep; if one key differs, that is ~2 × 24 ≈ 48 hash compares instead of 1 crore.`;
        };
        upd();
      }},
      { type: 'list', items: [
        `<strong>Where:</strong> in Amazon's Dynamo paper (2007), each node keeps a separate Merkle tree for each key range it holds, and replicas start at the root and sync only the parts that differ. Cassandra's "repair" also builds Merkle trees to compare replicas.`,
        `Git (hashes of commits and folders), BitTorrent/IPFS (checking the pieces of a file), and blockchains are also built on this idea.`,
        `<strong>The price:</strong> building the tree, and updating hashes when keys change, costs CPU and disk work. In a system with very many writes the tree goes stale again and again, so it is often built at repair time.`,
      ]},

      { type: 'h2', text: 'Decide' },
      { type: 'callout', tone: 'why', title: 'Decide', html: `• You want to skip a costly lookup ("has the crawler seen this URL?", "is this username taken?") → <strong>Bloom filter</strong> (need delete too → <strong>cuckoo filter</strong>). The final decision always comes from the source of truth.<br>• "How many unique visitors/viewers?" → <strong>HyperLogLog</strong> (Redis PFADD/PFCOUNT, ~12 KB, ~0.81% error).<br>• "Who is the most popular?" in a stream → <strong>count-min sketch + heap</strong>.<br>• "Drivers/creators near me" → <strong>geohash or H3</strong> cells (+ neighbour cells), Redis for moving points; for static places a quadtree, Elasticsearch or PostGIS is also fine.<br>• Leaderboard / rank → <strong>Redis sorted set</strong> (skip list).<br>• Background sync of replicas → <strong>Merkle tree</strong>.<br>• An exact answer is a must (money, billing, permissions) → do not depend on these shortcuts.` },

      { type: 'h2', text: 'The whole picture' },
      { type: 'diagram', title: 'Where these structures sit in xyz.com', height: 500,
        groups: [
          { label: 'Users', x: 10, y: 8, w: 700, h: 92 },
          { label: 'Services', x: 10, y: 124, w: 700, h: 92 },
          { label: 'Memory (RAM)', x: 10, y: 260, w: 700, h: 92 },
          { label: 'Storage', x: 10, y: 396, w: 700, h: 92 },
        ],
        nodes: [
          { id: 'users', label: 'Users / apps', sub: 'signup · views · nearby', x: 360, y: 58, w: 190, kind: 'client', info: 'What it is: the phones and browsers of xyz.com users. Signups, video views, hashtags and "who is near me" questions all start here.' },
          { id: 'api', label: 'App servers', sub: 'signup · views', x: 160, y: 180, kind: 'server', info: 'What it is: the main backend of xyz.com. For a username check it asks the Bloom filter first, for views it uses a Redis HLL, for the leaderboard a sorted set.' },
          { id: 'loc', label: 'Location svc', sub: 'lat/lng → cell', x: 400, y: 180, kind: 'server', info: 'What it is: the service that turns a location into a geohash/H3 cell and answers "who is near" (your cell + neighbour cells).' },
          { id: 'trend', label: 'Trending job', sub: 'count-min + heap', x: 610, y: 180, kind: 'queue', info: 'What it is: a job that reads the stream (like Flink). It adds every hashtag to a count-min sketch and keeps the top-k in a small heap.' },
          { id: 'bloom', label: 'Bloom filter', sub: 'or cuckoo', x: 80, y: 316, w: 120, kind: 'cache', info: 'What it is: a bit array of all usernames, in RAM. "Definitely not" = no need to go to the DB at all. If you need delete, use a cuckoo filter.' },
          { id: 'redis', label: 'Redis', sub: 'HLL · sorted set', x: 330, y: 316, kind: 'cache', info: 'What it is: an in-memory store. A HyperLogLog (~12 KB) for unique viewers, a sorted set (skip list) for the leaderboard and rank, and the trending top-k.' },
          { id: 'geo', label: 'Geo index', sub: 'H3 / geohash cells', x: 540, y: 316, w: 150, kind: 'cache', info: 'What it is: cell ID → the drivers/creators in that cell. Kept in RAM, because locations change every few seconds.' },
          { id: 'db', label: 'Users DB', sub: 'UNIQUE name', x: 80, y: 452, w: 120, kind: 'data', info: 'What it is: the source of truth. If the Bloom filter says "maybe yes", or the filter is old, this UNIQUE constraint makes the final decision.' },
          { id: 'cass', label: 'Views store A', sub: 'Bloom per SSTable', x: 330, y: 452, w: 150, kind: 'data', info: 'What it is: the history store for views (like Cassandra). Each disk file has a Bloom filter, so useless files are never read.' },
          { id: 'rep', label: 'Replica B', sub: 'Merkle repair', x: 580, y: 452, w: 150, kind: 'data', info: 'What it is: a second copy of the same data. With a Merkle tree, only the parts that differ are synced (anti-entropy).' },
        ],
        edges: [
          { a: 'users', b: 'api', n: 1, label: 'request' },
          { a: 'api', b: 'bloom', n: 2, label: 'name check' },
          { a: 'api', b: 'db', via: [[185, 380]], dashed: true },
          { a: 'api', b: 'redis', label: 'PFADD/ZADD' },
          { a: 'api', b: 'cass', via: [[235, 400]], kind: 'evt' },
          { a: 'users', b: 'loc', label: 'location' },
          { a: 'loc', b: 'geo' },
          { a: 'users', b: 'trend', kind: 'evt', label: 'hashtags' },
          { a: 'trend', b: 'redis', label: 'top-k' },
          { a: 'cass', b: 'rep', both: true, label: 'Merkle sync' },
        ],
        paths: [
          { name: 'Username check', text: 'The app server asks the Bloom filter first. "Definitely not" = "available" right away. Only on "maybe yes" does it confirm with the Users DB.', go: ['users>api>bloom', 'api>db'] },
          { name: 'Unique views', text: 'Every view does a PFADD into a Redis HyperLogLog (duplicates are ignored on their own), and the event also goes to the views store.', go: ['users>api>redis', 'api>cass'] },
          { name: 'Nearby', text: 'A location becomes a cell ID and goes into the geo index. "Who is near?" = your cell + neighbour cells, then filter by real distance.', go: ['users>loc>geo'] },
          { name: 'Trending', text: 'Hashtags from the stream go into a count-min sketch + heap. The top-k goes to Redis, where the Trending page reads it.', go: ['users>trend>redis'] },
          { name: 'Replica sync', text: 'Replicas compare their Merkle roots, then go down only the branches that differ and send just those keys.', go: ['cass>rep'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Bloom filter: "definitely not" or "maybe yes". False positives can happen, false negatives cannot. ~9.6 bits per item gives a 1% error.</li>
        <li>Cuckoo filter: fingerprints + two possible buckets. It can delete, but inserts fail when the table gets full.</li>
        <li>HyperLogLog: a unique count in ~12 KB, ~0.81% error, and it can be merged. It does not give the list.</li>
        <li>Count-min sketch: a "from above" estimate of counts, for heavy hitters (trending). Do not trust it for rare things.</li>
        <li>Geo: turn 2D into a cell ID. Geohash (prefix), quadtree (by crowding), S2 (sphere + Hilbert), H3 (hexagons). Always check neighbour cells too.</li>
        <li>Skip list: a sorted list with express lanes, O(log n). It lives inside a Redis sorted set.</li>
        <li>Merkle tree: same root = same data. If different, go down only the branch that differs.</li>
        <li>The final decision (money, unique names, permissions) always comes from the source of truth.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Bloom/cuckoo: a membership check for billions of items in ~10 bits per item', 'HLL: a unique count of any size in ~12 KB, and counts can be merged', 'Count-min: heavy hitters among crores of keys, in a small fixed memory', 'Geo cells: a 2D "nearby" query becomes a simple key or range lookup', 'Skip list: sorted data + rank in O(log n), with simple code', 'Merkle: find the difference between replicas in about log(data size) compares'],
        costs: ['Risk of error: false positives, ~1% count error, over-counting', 'A Bloom filter cannot delete, and must be rebuilt when it gets full', 'HLL and count-min cannot give back the real items', 'Geo cells: border cases, hot cells, and you must pick a resolution', 'Skip list: extra memory for the pointers', 'Merkle tree: costly to build and update, and it goes stale with writes'],
      },
      { type: 'think', questions: [
        { q: 'A web crawler needs a Bloom filter for 1,000 crore (10 billion) URLs at a 1% false positive rate. How much memory? And what is the real harm of a false positive?', a: '~9.6 bits per URL × 10^10 = ~9.6 × 10^10 bits ≈ 12 GB. It fits in the RAM of one big server (or you can shard it over a few machines). A false positive means a new URL is wrongly treated as "already seen" and skipped. For a crawler that is fine (1% of new pages missed), so a Bloom filter is perfect here. In a case like the username check, you must confirm with the DB.' },
        { q: 'The creator dashboard needs "unique viewers this month", and you already have one HLL per day. Do you need to read the whole month of data again?', a: 'No. PFMERGE the 30 daily HLLs (take the max of each register). The result is an estimate of the month\'s unique viewers, with the same ~0.81% error. But the intersection of two HLLs (users who came on both days) does not come out accurately. If you compute it with inclusion-exclusion, the error grows a lot.' },
        { q: 'For a "within 2 km" query with geohash, which precision should you use?', a: 'Pick a precision whose cell is a bit bigger than the search radius, then take your cell + its 8 neighbours. 5 characters ≈ 4.9 km × 4.9 km, so for a 2 km radius the 9 cells of length 5 are enough, then filter by real distance. With 6 characters (1.2 km × 0.6 km), 9 cells will not fully cover 2 km.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'A Bloom filter said "definitely not". What does it mean?', options: ['Maybe not, check the DB', 'The item was really never added (if the filter is up to date)', 'The filter is full'], answer: 1, explain: 'Some bit is 0, so the item was never inserted. A Bloom filter gives no false negatives. You only need to confirm on "maybe yes".' },
        { q: 'A Bloom filter has a fixed m bits, and n keeps growing. What happens?', options: ['The false positive rate goes up', 'False negatives start to appear', 'Nothing changes'], answer: 0, explain: '(1 − e^(−kn/m))^k: when n grows, more bits are 1, so more false positives. You have to build a bigger filter again.' },
        { q: 'What are the memory and standard error of a Redis HyperLogLog?', options: ['~12 KB, ~0.81%', 'Grows with n, 0%', '1 MB, 5%'], answer: 0, explain: '16,384 registers × 6 bits = 12 KB, error 1.04/√16384 ≈ 0.81%.' },
        { q: 'Compared with the real count, a count-min sketch estimate is...', options: ['Never lower, but can be higher', 'Never higher', 'Always exact'], answer: 0, explain: 'Collisions can only push counters up. Taking the minimum reduces the overcount, but does not remove it.' },
        { q: 'Why does H3 use hexagons?', options: ['Hexagons fit exactly into parent and child cells', 'Every neighbour is at the same distance from the centre', 'Hexagons take less memory'], answer: 1, explain: 'A square has two kinds of neighbours (1 and 1.41 away). A hexagon has all 6 at the same distance. Parent and child do not fit exactly; that is the price H3 pays.' },
        { q: 'The Merkle root hashes of two replicas are the same. What does it mean?', options: ['The data is the same, no sync needed', 'You must still check the leaves', 'Only half the data is the same'], answer: 0, explain: 'The root is built from the hashes of all leaves. Same root = (apart from a hash collision) all data is the same.' },
        { q: 'What extra thing can a cuckoo filter do compared with a Bloom filter?', options: ['Give an exact count', 'Delete an item', 'Never give a false positive'], answer: 1, explain: 'Each item\'s fingerprint sits in one of two buckets, so you can find it and remove it. False positives can still happen (same fingerprint).' },
        { q: 'When is a quadtree better than geohash?', options: ['When points move very fast', 'When some places are very crowded and others empty, and points do not move much', 'When you need data as a string prefix'], answer: 1, explain: 'A quadtree makes small cells in crowded places. But changing the tree on every move is costly, so for moving drivers a fixed grid (geohash/H3) is easier.' },
        { q: 'Why does S2 number its cells in Hilbert curve order?', options: ['So nearby cells get nearby numbers, and an area = few ranges', 'To make hexagons', 'To save memory'], answer: 0, explain: 'The Hilbert curve never makes a long jump. So the cells of one area fall into just a few continuous ID ranges.' },
        { q: 'On average, how many steps does a search in a skip list take?', options: ['O(n)', 'O(log n)', 'Always 1'], answer: 1, explain: 'The upper lanes skip about half the items at each level. In the widget, going from 16 to 128 items took only ~8 to ~10 steps.' },
      ]},
      { type: 'sources', note: 'Numbers and defaults were checked with these sources. Uber\'s H3 post is from 2018; the library has moved on since then.', items: [
        { title: 'H3: Uber\'s Hexagonal Hierarchical Spatial Index', publisher: 'Uber Engineering blog', year: 2018, official: true, url: 'https://www.uber.com/blog/h3/', used: 'Why hexagons (one neighbour distance), 16 resolutions, aperture 7, 122 base cells, 12 pentagons, use in surge pricing and dispatch.' },
        { title: 'H3 resolution table', publisher: 'h3geo.org docs', official: true, url: 'https://h3geo.org/docs/core-library/restable/', used: 'Average area and edge length for resolutions 7 to 10; 110 hexagons + 12 pentagons.' },
        { title: 'S2 cell hierarchy', publisher: 's2geometry.io', official: true, url: 'http://s2geometry.io/devguide/s2cell_hierarchy', used: 'Cube projection, 31 levels, Hilbert curve, 64-bit cell IDs, level 30 ≈ 1 cm.' },
        { title: 'HyperLogLog', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/', used: '12 KB memory, 0.81% standard error, PFADD/PFCOUNT/PFMERGE.' },
        { title: 'GEOADD (how it works)', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/commands/geoadd/', used: 'Geo data in a sorted set with a 52-bit geohash score; 1 + 8 areas for a radius query.' },
        { title: 'Geohash grid aggregation (cell dimensions table)', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html', used: 'Geohash length vs cell size.' },
        { title: 'Bloom filters', publisher: 'Apache Cassandra docs', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/managing/operating/bloom_filters.html', used: 'Bloom filter in the SSTable read path, default fp chance 0.01 (0.1 with LCS).' },
        { title: 'Cuckoo Filter: Practically Better Than Bloom (Fan, Andersen, Kaminsky, Mitzenmacher)', publisher: 'ACM CoNEXT paper', year: 2014, url: 'https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf', used: 'Fingerprints, two candidate buckets, delete support, less space than Bloom below ~3% fp, ~95% load.' },
        { title: 'An Improved Data Stream Summary: The Count-Min Sketch (Cormode, Muthukrishnan)', publisher: 'Journal of Algorithms paper', year: 2005, url: 'https://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf', used: 'w = e/ε, d = ln(1/δ), the estimate is never lower than the truth.' },
        { title: 'Skip Lists: A Probabilistic Alternative to Balanced Trees (William Pugh)', publisher: 'Communications of the ACM paper', year: 1990, url: 'https://dl.acm.org/doi/10.1145/78973.78977', used: 'Levels from coin flips, average O(log n) search and insert.' },
        { title: 'Redis sorted sets', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/sorted-sets/', used: 'A sorted set = skip list + hash table; ZADD/ZRANGE/ZRANK in O(log n).' },
        { title: 'Cuckoo filter', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/probabilistic/cuckoo-filter/', used: 'CF.ADD, CF.EXISTS, CF.DEL and delete support.' },
        { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP paper (Amazon)', year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'A Merkle tree per key range and anti-entropy sync.' },
      ]},
    ],
  });
})();
