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
      log.push(`${cur.name} (fp ${cur.fp.toString(16)}) bucket ${i} se nikla → bucket ${ni}`);
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
    summary: `Jab data arabon mein ho, to "poori list rakh lo" kaam nahi karta. Ye lesson un chaalaak data structures ke baare mein hai jo thodi si galti (error) ke badle memory mein hazaar guna bachat dete hain (Bloom filter, cuckoo filter, HyperLogLog, count-min sketch), jo "mere paas kya hai?" ko fast banate hain (geohash, quadtree, S2, H3), jo sorted data sambhalte hain (skip list), aur jo do copies ko jaldi compare karte hain (Merkle tree).`,
    _test: T,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Jab users kam the, hum har sawaal ka jawab poori list padh ke de dete the.<br>Ab xyz.com pe crores users hain. Poori list rakhna aur har baar padhna bahut mehenga ho gaya.<br>Is lesson mein kuch chaalaak tareeke hain. Kuch thodi si galti maan lete hain, aur badle mein memory hazaar guna kam lete hain. Kuch "mere paas kya hai?" jaldi dhoondhte hain. Kuch do copies ko jaldi compare karte hain.<br>Har tareeke ko tum khud chala ke dekhoge.` },
      { type: 'h2', text: 'Problem: exact jawab bahut mehenga hai' },
      { type: 'p', html: `xyz.com ab bahut bada hai: 50 crore users, arabon video views roz. Ab kuch sawaal jo pehle aasaan the, achanak bhaari ho gaye:` },
      { type: 'table', head: ['Sawaal', 'Seedha tareeka', 'Kyun toot-ta hai', 'Chaalaak structure'], rows: [
        ['Ye username already liya hua hai?', 'Har baar DB query', 'Signup page pe har keystroke = DB hit', 'Bloom filter, cuckoo filter'],
        ['Is video ko aaj kitne <em>unique</em> logon ne dekha?', 'Saare user IDs ek Set mein', 'Har video ke liye MBs, crores videos', 'HyperLogLog'],
        ['Abhi kaunse hashtags sabse zyada chal rahe?', 'Har tag ka counter', 'Crores alag tags, memory khatam', 'Count-min sketch + heap'],
        ['Mere paas 2 km mein kaun se drivers/creators?', 'Har point se doori nikaalo', 'Har request pe lakhon points scan', 'Geohash, quadtree, S2, H3'],
        ['Leaderboard: rank aur range jaldi', 'Har baar sort', 'Sort O(n log n) har request pe', 'Skip list (Redis sorted set)'],
        ['Do replicas mein kya alag hai?', 'Har key compare', 'Arabon keys network pe bhejna', 'Merkle tree'],
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: Probabilistic data structure', html: `<strong>Ye kya hai:</strong> aisa structure jo <strong>kabhi kabhi thoda galat</strong> jawab deta hai. Lekin galti kitni hogi, ye pehle se pata hota hai, aur tum use control kar sakte ho.<br><strong>Kyun chahiye:</strong> "1% galti chalegi" bol do, to memory 10-100 guna kam aur jawab bahut tez.<br><strong>Iske bina:</strong> har sawaal ke liye poori list RAM mein rakho, ya har baar database se poochho. Crores users pe dono bahut mehenge.<br><strong>Example:</strong> "ye username liya hua hai?" ke liye 50 crore naam rakhne ki jagah sirf ~600 MB bits.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Hash function', html: `<strong>Ye kya hai:</strong> ek formula jo kisi bhi text ko (jaise <code>riya_42</code>) ek bada number bana deta hai. Same text = hamesha same number. Alag text = number random jaisa bikhra hua.<br><strong>Kyun chahiye:</strong> is lesson ka lagbhag har structure hash pe chalta hai. Hash se hum kisi bhi naam ko "kis box mein jaaye" ka number bana lete hain.<br><strong>Iske bina:</strong> naam ko seedha number mein badalne ka koi saaf, barabar bikhra hua tareeka nahi.<br><strong>Example:</strong> hash("riya_42") mod 256 = 205 → bit number 205. "k hash functions" ka matlab bas k alag formule, jo k alag numbers dete hain.` },

      { type: 'h2', text: 'Bloom filter: "pakka nahi" ya "shayad haan"' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com ke signup form pe user username type karta hai, aur har keystroke pe hum batana chahte hain "ye naam le liya gaya hai". 50 crore usernames. Har keystroke pe database query = signup ke peak pe DB pe bekaar ka bojh. Saare usernames RAM mein rakhein? 50 crore × ~15 bytes = ~7.5 GB sirf strings, overhead ke saath kai guna zyada, aur har app server pe.` },
      { type: 'p', html: `Zyadatar naye usernames free hote hain. Agar ek sasta check "ye naam pakka nahi hai" bata de, to DB tak jaana hi nahi padega. Yahi <strong>Bloom filter</strong> karta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Bloom filter', html: `<strong>Ye kya hai:</strong> ek chhota sa "chowkidaar" jo kisi naam ke liye do mein se ek jawab deta hai: <strong>"pakka nahi hai"</strong> ya <strong>"shayad hai"</strong>.<br><strong>Kyun chahiye:</strong> zyadatar naye usernames free hote hain. "Pakka nahi" wale case mein database tak jaana hi nahi padta.<br><strong>Iske bina:</strong> har keystroke pe DB query, ya har server pe 7.5 GB+ ki naamon ki list.<br><strong>Example:</strong> 50 crore naam, 1% galti → ~600 MB. Neeche andar ka kaam dekho.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Bit array', html: `<strong>Ye kya hai:</strong> switches ki ek lambi line. Har switch ya to 0 (off) ya 1 (on). 256 bits = 256 switches = sirf 32 bytes.<br><strong>Kyun chahiye:</strong> Bloom filter naam store nahi karta, bas kuch switches on karta hai. Isliye itna chhota.<br><strong>Iske bina:</strong> poore naam (har ek ~15 bytes) rakhne padte.` },
      { type: 'p', html: `<strong>Andar kaise kaam karta hai:</strong> ek lambi <strong>bit array</strong> (m bits, sab 0 se shuru) aur <strong>k hash functions</strong>.` },
      { type: 'callout', tone: 'tip', title: 'Bloom filter ka kaam, kadam se kadam', html: `• <strong>Insert "riya_42":</strong> k hash functions k positions dete hain, un sab bits ko 1 kar do.<br>• <strong>Check "kabir_7":</strong> uski k positions dekho. Koi bhi bit 0 hai → <strong>pakka nahi hai</strong> (agar hota to wo bit 1 hoti). Saari 1 hain → <strong>shayad hai</strong> (ho sakta hai doosre words ne milke wo bits 1 kar di hon).<br>Isme asli username store hi nahi hota, sirf bits. Isliye itna chhota.` },
      { type: 'ascii', text: `Chhota example: m = 12 bits, k = 2 hash functions

Shuru:               0 0 0 0 0 0 0 0 0 0 0 0      (bit 0 se bit 11)
Insert "riya":  h1=2, h2=7   → bits 2 aur 7 ko 1
Insert "aman":  h1=7, h2=10  → bits 7 aur 10 ko 1 (7 pehle se 1 tha)
Ab:                  0 0 1 0 0 0 0 1 0 0 1 0

Check "neha":   h1=4, h2=7   → bit 4 = 0  → PAKKA NAHI HAI (DB mat jao)
Check "aman":   h1=7, h2=10  → dono 1     → SHAYAD HAI (DB se confirm)
Check "zoya":   h1=2, h2=10  → dono 1     → SHAYAD HAI, lekin zoya kabhi daali hi nahi!
                 (bit 2 riya ne, bit 10 aman ne on kiya tha) = FALSE POSITIVE` },
      { type: 'callout', tone: 'term', title: 'Naya word: False positive', html: `<strong>Ye kya hai:</strong> filter ne kaha "shayad hai", lekin asal mein nahi tha (upar "zoya" jaisa). Ulta galti, <strong>false negative</strong> (tha, lekin filter ne kaha "nahi"), Bloom filter mein <strong>kabhi nahi hoti</strong>, jab tak filter mein se kuch delete na kiya jaaye ya wo purana na ho.<br><strong>Kyun zaroori samajhna:</strong> false positive ka nuksaan bas ek extra DB call hai. False negative hota to galat jawab user tak jaata.<br><strong>Iske bina (agar ye guarantee na hoti):</strong> filter ke "nahi" pe bharosa hi nahi kar paate, aur filter bekaar ho jaata.` },
      { type: 'p', html: `False positive ki probability ka formula (n items daale, m bits, k hashes):` },
      { type: 'code', text: `P(false positive) ≈ (1 − e^(−k·n/m))^k

Best k  = (m / n) × ln 2  ≈ 0.69 × (bits per item)
1% ke liye ≈ 9.6 bits per item (k ≈ 7),  0.1% ke liye ≈ 14.4 bits per item (k ≈ 10)` },
      { type: 'p', html: `Khud chala ke dekho. m aur k badlo, usernames daalo, aur check karo. Widget 20,000 aise naam check karta hai jo kabhi daale hi nahi gaye, aur ginta hai kitno pe filter ne galti se "shayad hai" bola (measured), phir formula se compare karta hai:` },
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
            <div class="stat"><span>Bits jo 1 hain</span><strong class="bf-fill"></strong></div>
            <div class="stat"><span>False positive, measured</span><strong class="bf-meas"></strong></div>
            <div class="stat"><span>False positive, formula</span><strong class="bf-th"></strong></div>
            <div class="stat"><span>Is m, n ke liye best k</span><strong class="bf-bk"></strong></div>
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
          } else grid.innerHTML = `<div style="color:var(--ink-3);font-size:14px">Grid sirf 512 bits tak dikhaate hain. Numbers neeche hain.</div>`;
          const n = items.length, ones = bits.reduce((s, b) => s + b, 0);
          const meas = T.bloomMeasured(bits, k, 20000), th = T.bloomTheory(k, n, m);
          el.querySelector('.bf-n').textContent = n;
          el.querySelector('.bf-fill').textContent = pct(ones / m, 1);
          el.querySelector('.bf-meas').textContent = pct(meas);
          el.querySelector('.bf-th').textContent = pct(th);
          el.querySelector('.bf-bk').textContent = n ? Math.max(1, Math.round(m / n * Math.LN2)) : '-';
          el.querySelector('.bf-note').textContent = `${n ? (m / n).toFixed(1) : '-'} bits per item. Items badhao: bits bharti jaati hain aur false positives tezi se badhte hain. k bahut kam ya bahut zyada, dono bure hain; best k ke paas sabse kam galti. Measured aur formula wale numbers lagbhag barabar rehne chahiye (chhote m pe thoda upar-neeche).`;
        };
        const check = () => {
          const s = inE.value.trim(); if (!s) return;
          hl = T.bloomPos(s, k, m);
          const maybe = hl.every(p => bits[p]), real = items.includes(s);
          draw();
          resE.innerHTML = maybe
            ? (real ? `<strong style="color:var(--amber)">SHAYAD HAI</strong>: saari ${k} bits 1 hain (positions ${hl.join(', ')}). Aur sach mein daala gaya tha.`
              : `<strong style="color:var(--red)">SHAYAD HAI, lekin galat!</strong> Ye kabhi daala nahi gaya. Ye <strong>false positive</strong> hai (positions ${hl.join(', ')}).`)
            : `<strong style="color:var(--green)">PAKKA NAHI HAI</strong>: kam se kam ek bit 0 hai (positions ${hl.join(', ')}). DB tak jaane ki zaroorat nahi.`;
        };
        mE.addEventListener('input', () => { m = +mE.value; hl = []; resE.textContent = ''; draw(); });
        kE.addEventListener('input', () => { k = +kE.value; hl = []; resE.textContent = ''; draw(); });
        el.querySelector('.bf-chk').onclick = check;
        el.querySelector('.bf-ins').onclick = () => { const s = inE.value.trim(); if (s && !items.includes(s)) items.push(s); check(); };
        el.querySelector('.bf-add').onclick = () => { const st = items.length; for (let i = st; i < st + 10; i++) items.push(T.userName(i)); hl = []; resE.textContent = ''; draw(); };
        el.querySelector('.bf-rst').onclick = () => { items = []; for (let i = 0; i < 20; i++) items.push(T.userName(i)); m = 256; k = 3; mE.value = 256; kE.value = 3; hl = []; resE.textContent = ''; draw(); };
        draw();
      }},
      { type: 'callout', tone: 'tip', title: 'Ye try karo', html: `Default (m = 256 bits, k = 3, 20 usernames) pe false positive ~1% ke aas paas hai. "+10 usernames" 4-5 baar dabao: n = 60-70 pe ye 10%+ ho jaata hai, kyunki aadhi se zyada bits 1 ho chuki hain. Ab m ko 1024 karo, wapas neeche. Ab m = 256, n = 20 pe k badlo: k = 1 pe ~7.5% galti, "best k" (~9) ke paas ~0.2%. Lekin n badhne ke baad bada k nuksaan karta hai (zyada bits bharta hai), isliye best k = (m/n) × 0.69 har baar badalta hai.` },
      { type: 'p', html: `Asli size ka andaza: 50 crore usernames, 1% galti. Formula se ~9.6 bits per username = 50 crore × 9.6 / 8 ≈ <strong>600 MB</strong>. Ek server ki RAM mein aaraam se, aur strings rakhne se kai guna kam. Aur 99% "free" naamon ke liye DB tak koi call nahi.` },
      { type: 'flow', title: 'Signup pe username check, Bloom filter ke saath', height: 320,
        nodes: [
          { id: 'u', label: 'User', sub: 'naam type kiya', x: 80, y: 160, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ka signup form, user ke phone/browser mein. Har keystroke (debounce ke baad) pe "naam available hai?" poochha jaata hai.' },
          { id: 'app', label: 'App server', x: 280, y: 160, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka backend server jo "naam available hai?" ka jawab deta hai. Pehle Bloom filter se poochhta hai. "Pakka nahi" = turant jawab. "Shayad" = tab hi database tak jaata hai.' },
          { id: 'bf', label: 'Bloom filter', sub: 'RAM, ~600 MB bits', x: 520, y: 70, w: 180, kind: 'cache', info: 'Ye kya hai: saare usernames ka bit array, jo "pakka nahi / shayad hai" batata hai. Kyun: zyadatar checks DB tak pahunchte hi nahi. App server ki memory mein (ya Redis mein, RedisBloom ke BF.ADD/BF.EXISTS commands se). Har naya username isme bhi add hota hai.' },
          { id: 'db', label: 'Users DB', sub: 'UNIQUE(username)', x: 520, y: 250, w: 180, kind: 'data', info: 'Ye kya hai: users ka asli database, source of truth (aakhri sach). Username column pe UNIQUE constraint hai: do log same naam kabhi nahi le sakte, chahe filter kuch bhi kahe.' },
        ],
        edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'bf' }, { a: 'app', b: 'db' }],
        scenarios: [
          { name: 'Pakka free', steps: [
            { title: 'User ne naam likha', text: 'Naya, unique sa naam.', go: 'u>app', msg: 'GET /username-available?name=zoya_sky_99' },
            { title: 'Filter: ek bit 0', text: 'Bloom filter ki ek position pe 0 mila. Matlab ye naam kabhi insert hua hi nahi. <strong>Pakka free</strong>.', go: ['app>bf', 'res:bf>app'], set: { db: { state: 'dim' } }, after: { bf: { state: 'hit', sub: 'PAKKA NAHI' } }, msg: 'bits[812], bits[40551], bits[9902...]: 1, 0, 1  → definitely not' },
            { title: 'Turant jawab', text: 'Database ko chhua bhi nahi. Zyadatar checks yahi raasta lete hain.', go: 'res:app>u', msg: '{ "available": true }' },
          ]},
          { name: 'Naam liya hua', steps: [
            { title: 'Popular naam', text: 'User ne "riya" likha.', go: 'u>app', msg: 'name=riya' },
            { title: 'Filter: shayad hai', text: 'Saari k bits 1 hain. Filter pakka "haan" nahi bol sakta, to DB se confirm karo.', go: ['app>bf', 'res:bf>app'], after: { bf: { state: 'warn', sub: 'SHAYAD' } } },
            { title: 'DB confirm karta hai', text: 'Haan, liya hua hai.', go: ['app>db', 'res:db>app', 'res:app>u'], msg: '{ "available": false }' },
          ]},
          { name: 'False positive', steps: [
            { title: 'Naya naam, lekin...', text: 'User ne "kabir_77x" likha, jo kisi ke paas nahi.', go: 'u>app' },
            { title: 'Filter: shayad hai (galat)', text: 'Doosre naamon ne milke wahi saari bits 1 kar rakhi hain. False positive.', go: ['app>bf', 'res:bf>app'], after: { bf: { state: 'warn', sub: 'SHAYAD (galat)' } } },
            { title: 'DB sach batata hai', text: 'DB ne kaha "nahi hai". Jawab sahi gaya, bas ek extra DB call laga. ~1% checks pe ye hota hai, aur theek hai.', go: ['app>db', 'res:db>app', 'res:app>u'], msg: '{ "available": true }' },
          ]},
          { name: 'Stale filter (failure)', intro: 'Filter ek din purane snapshot se dobara bana, aur aaj ke naye usernames usme nahi hain.', steps: [
            { title: 'Filter purana', text: 'Server restart pe filter kal raat ke backup se load hua. Aaj subah "neha_dev" register hua tha, wo filter mein nahi.', set: { bf: { state: 'warn', sub: 'kal ka snapshot' } }, focus: ['bf'] },
            { title: 'Galat "pakka free"', text: 'Filter ne kaha "pakka nahi hai". Ye <strong>false negative</strong> hai, jo Bloom filter khud kabhi nahi karta, lekin purana data kar deta hai.', go: ['u>app', 'app>bf', 'res:bf>app', 'res:app>u'], msg: '{ "available": true }   ← galat!' },
            { title: 'DB constraint bachata hai', text: 'User "Sign up" dabata hai. Insert pe UNIQUE constraint fail. User ko "naam liya hua hai" dikhta hai. Seekh: <strong>filter sirf shortcut hai, aakhri faisla source of truth ka</strong>. Aur filter ko naye writes ke saath update rakho (ya restart pe DB/log se dobara bharo).', go: ['app>db', 'bad:db>app'], after: { db: { state: 'ok', sub: 'UNIQUE ne roka' } } },
          ]},
        ],
      },
      { type: 'h3', text: 'Bloom filter kahan kahan hai?' },
      { type: 'list', items: [
        `<strong>Databases (LSM trees):</strong> Cassandra, RocksDB, HBase jaise stores data ko kai disk files (SSTables) mein rakhte hain. Har file ke saath ek Bloom filter: "ye key is file mein pakka nahi hai" to us file ko disk se padhna hi nahi. Cassandra mein default false-positive chance 1% hai (leveled compaction mein 10%).`,
        `<strong>Web crawler:</strong> "Ye URL pehle crawl kiya?" Arabon URLs, aur galti se ek-aadh naya URL skip ho jaaye (false positive) to chalta hai.`,
        `<strong>Cache ke aage:</strong> jo keys DB mein hain hi nahi, unke liye baar baar DB tak jaana (cache penetration attack) Bloom filter se roka ja sakta hai.`,
        `<strong>Recommendations:</strong> "ye video user ko pehle dikha chuke?" har user ke liye chhota filter.`,
      ]},
      { type: 'callout', tone: 'mistake', title: 'Bloom filter se delete', html: `Normal Bloom filter se item <strong>delete nahi</strong> kar sakte. Kisi item ki bits 0 karoge to wahi bits doosre items ki bhi ho sakti hain, aur un items ke liye filter "pakka nahi" bolne lagega (false negative, sabse bura). Delete chahiye to counting Bloom filter (bit ki jagah chhota counter) ya cuckoo filter. Aur filter bhar jaaye (n badh gaya) to size badha nahi sakte: naya bada filter banao.` },

      { type: 'h3', text: 'Cuckoo filter: delete bhi chahiye' },
      { type: 'p', html: `Maan lo xyz.com pe user account delete karta hai, aur uska username dobara free hona chahiye. Bloom filter ye nahi kar sakta. <strong>Cuckoo filter</strong> (2014 ka paper, "Practically Better Than Bloom") kar sakta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Fingerprint', html: `<strong>Ye kya hai:</strong> kisi naam ka bahut chhota "angootha nishaan": uske hash ke bas kuch bits (jaise 8-12 bits). "riya_42" (8 bytes) ki jagah sirf ek chhota number.<br><strong>Kyun chahiye:</strong> cuckoo filter poora naam nahi rakhta, bas fingerprint rakhta hai. Isliye chhota rehta hai.<br><strong>Iske bina:</strong> poore naam rakhne padte, memory kai guna.<br><strong>Dhyan:</strong> do alag naamon ka fingerprint kabhi kabhi same nikal sakta hai. Yahi cuckoo filter ka false positive hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Cuckoo filter', html: `<strong>Ye kya hai:</strong> Bloom filter jaisa "pakka nahi / shayad hai" wala chowkidaar, jo <strong>delete bhi</strong> kar sakta hai. Andar ek table hai: buckets (dabbe), har bucket mein kuch slots (aam taur pe 4). Har slot mein ek fingerprint.<br><strong>Kyun chahiye:</strong> account delete hua to username dobara free hona chahiye. Bloom filter ye nahi kar sakta.<br><strong>Iske bina:</strong> deleted naam hamesha "shayad liya hua" dikhte, ya har kuch din poora filter dobara banana padta.<br><strong>Naam kyun "cuckoo":</strong> cuckoo pakshi doosre ke ghosle mein ghus ke purane ande ko bahar dhakel deta hai. Ye filter bhi bhari jagah pe purane fingerprint ko uske doosre ghar mein dhakel deta hai.` },
      { type: 'p', html: `<strong>Andar ka kaam:</strong> har item ke liye <strong>do possible buckets</strong> hote hain: i1 = hash(item), aur i2 = i1 XOR hash(fingerprint). Dono mein se kisi mein khaali slot ho to fingerprint wahan rakh do. Dono bhare hain? Kisi purane fingerprint ko uske doosre bucket mein dhakel do. Wahan bhi jagah na mile to wo kisi aur ko dhakelta hai. Ye chain tab tak chalti hai jab tak koi khaali slot mile (ya hum haar maan lein).` },
      { type: 'callout', tone: 'term', title: 'Naya word: XOR', html: `<strong>Ye kya hai:</strong> bits ka ek chhota khel: do bits same hon to 0, alag hon to 1. 3 XOR 5: 011 aur 101 → 110 = 6.<br><strong>Kyun chahiye:</strong> XOR ki ek jaadu wali baat: 6 XOR 5 = 3 wapas. To bucket aur fingerprint pata ho, to doosra bucket nikal aata hai, <em>asli naam ke bina</em>. Dhakelte waqt filter ke paas sirf fingerprint hota hai, naam nahi.<br><strong>Iske bina:</strong> dhakelne ke liye asli naam chahiye hota, jo filter rakhta hi nahi.` },
      { type: 'ascii', text: `Chhota example (8 buckets, 2 slots each; numbers samjhane ke liye chune hain):

"riya": fingerprint = a,  i1 = 3,  hash(a) = 5  → i2 = 3 XOR 5 = 6
        bucket 3 mein jagah hai → wahan "a" rakho.

Baad mein bucket 3 aur 6 dono bhar gaye, aur "neha" ko bucket 3 chahiye:
   "a" ko bucket 3 se nikaalo → uska doosra ghar = 3 XOR hash(a) = 3 XOR 5 = 6
   bucket 6 bhara → wahan ke kisi fingerprint ko uske doosre ghar bhejo ... jab tak jagah mile

Lookup "riya":  sirf bucket 3 aur 6 dekho. "a" mila → SHAYAD HAI
Delete "riya":  bucket 3 ya 6 se ek "a" hata do. Ho gaya.` },
      { type: 'list', items: [
        `<strong>Lookup:</strong> sirf do buckets dekho: fingerprint mila to "shayad hai". False positive tab jab kisi aur item ka fingerprint same nikle.`,
        `<strong>Delete:</strong> fingerprint ko us bucket se hata do. Isliye delete possible (lekin sirf un items ka jo sach mein daale gaye the).`,
        `<strong>Size:</strong> chhoti false-positive rates (~3% se kam) pe aksar Bloom filter se kam space leta hai, aur lookup fast hai (sirf 2 jagah dekhna).`,
        `<strong>Keemat:</strong> table bahut bhar jaaye (~95% with 4-slot buckets) to insert fail hone lagte hain; tab bada table banana padta hai. Redis (RedisBloom module, ab Redis Stack/Redis 8 mein) <code>CF.ADD</code>, <code>CF.EXISTS</code>, <code>CF.DEL</code> deta hai.`,
      ]},
      { type: 'p', html: `Khud chala ke dekho. Ye ek <strong>khilona size</strong> ka cuckoo filter hai: 8 buckets × 2 slots, aur fingerprint sirf 4 bits (1 se f tak ek hex akshar), taaki sab kuch screen pe dikhe. Naam insert karo, dhakka-mukki (kicks) dekho, lookup aur delete karo:` },
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
            <button type="button" class="btn small primary ck-more">+1 naya naam</button>
            <button type="button" class="btn small ghost ck-rst">Reset</button>
          </div>
          <div class="ck-res" style="margin-top:10px;min-height:1.6em;font-size:15px"></div>
          <div class="ck-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px;margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Items</span><strong class="ck-n"></strong></div>
            <div class="stat"><span>Table kitni bhari (load)</span><strong class="ck-load"></strong></div>
            <div class="stat"><span>Pichhle insert ke kicks</span><strong class="ck-k"></strong></div>
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
        const where = r => `fingerprint <code>${r.fp.toString(16)}</code>, ghar: bucket ${r.i1} ya ${r.i2}`;
        const ins = s => {
          const bak = tab.map(b => b.slice()), r = T.ckInsert(tab, s, rnd); last = r.kicks;
          if (r.ok) { names.push(s); resE.innerHTML = `<strong style="color:var(--green)">Daal diya</strong>: ${where(r)}. ${r.kicks ? r.kicks + ' baar dhakka-mukki hui.' : 'Seedha khaali slot mila.'}`; }
          else { resE.innerHTML = `<strong style="color:var(--red)">Insert fail!</strong> ${r.kicks} kicks ke baad bhi jagah nahi mili. Table bhar gaya: asli system ab bada table banata hai. (Yahan table pehle jaisa wapas rakh diya, taaki koi purana fingerprint kho na jaaye.)`; tab = bak; }
          el.querySelector('.ck-log').innerHTML = r.log.length ? r.log.map(esc).join('<br>') : 'Koi dhakka nahi laga.';
          draw([r.i1, r.i2]);
        };
        el.querySelector('.ck-ins').onclick = () => { const s = inE.value.trim().toLowerCase(); if (s) ins(s); };
        el.querySelector('.ck-more').onclick = () => { const s = MORE.find(x => !names.includes(x)); if (s) { inE.value = s; ins(s); } else resE.textContent = 'Saare example naam daal diye. Reset dabao.'; };
        el.querySelector('.ck-look').onclick = () => {
          const s = inE.value.trim().toLowerCase(); if (!s) return; const r = T.ckLookup(tab, s), real = names.includes(s);
          resE.innerHTML = r.hit < 0 ? `<strong style="color:var(--green)">PAKKA NAHI HAI</strong>: ${where(r)}, dono mein ye fingerprint nahi.`
            : real ? `<strong style="color:var(--amber)">SHAYAD HAI</strong>: bucket ${r.hit} mein fingerprint <code>${r.fp.toString(16)}</code> mila. Sach mein daala gaya tha.`
            : `<strong style="color:var(--red)">SHAYAD HAI, lekin galat!</strong> Bucket ${r.hit} mein kisi aur ka same fingerprint <code>${r.fp.toString(16)}</code> hai. False positive. 4-bit fingerprint pe ye aksar hota hai; asli filters 8-12 bits rakhte hain.`;
          draw([r.i1, r.i2]);
        };
        el.querySelector('.ck-del').onclick = () => {
          const s = inE.value.trim().toLowerCase(); if (!s) return; const real = names.includes(s);
          if (!real) { const r = T.ckLookup(tab, s); resE.innerHTML = `<strong style="color:var(--red)">Ruko!</strong> "${esc(s)}" kabhi daala hi nahi gaya. ${r.hit >= 0 ? `Bucket ${r.hit} mein same fingerprint kisi aur ka hai: delete karte to uska nishaan mit jaata (false negative). ` : ''}Isliye sirf wahi delete karo jo pakka daala tha.`; draw([r.i1, r.i2]); return; }
          const r = T.ckDelete(tab, s); names = names.filter(x => x !== s);
          resE.innerHTML = `<strong style="color:var(--green)">Hata diya</strong>: bucket ${r.hit} se fingerprint <code>${r.fp.toString(16)}</code>. Ab "${esc(s)}" dobara free.`;
          draw([r.i1, r.i2]);
        };
        el.querySelector('.ck-rst').onclick = () => { reset(); resE.textContent = ''; el.querySelector('.ck-log').textContent = ''; draw(); };
        reset(); draw();
      }},
      { type: 'callout', tone: 'tip', title: 'Ye try karo', html: `Shuru mein 6 naam hain. "+1 naya naam" baar baar dabao: pehle seedhe khaali slot milte hain, phir table bharne lagta hai aur kicks (dhakke) badhte hain. 10 naye naamon ke baad table 100% bhar jaata hai (16 slots). Agla insert 40 kicks ke baad fail hoga: yahi wo "table bhar gaya" wala pal hai. (Asli 4-slot filters ~95% load ke paas hi fail hone lagte hain.) Phir Reset karo, "riya" ko Delete karo aur Lookup karo: "pakka nahi". Aur koi aisa naam Lookup karo jo daala hi nahi (jaise "kavya"): chhote fingerprint ki wajah se kabhi kabhi "shayad hai" aa jaata hai.` },

      { type: 'h2', text: 'HyperLogLog: unique visitors ~12 KB mein' },
      { type: 'p', html: `<strong>Problem:</strong> creator dashboard pe dikhana hai "is video ko aaj kitne <em>unique</em> logon ne dekha". Ek hi user 10 baar dekhe to 1 gina jaaye. Seedha tareeka: har video ke liye ek Set of user IDs. Ek viral video ke 1 crore viewers × 8 bytes = 80 MB (sirf raw IDs, Redis Set ka overhead alag), aur aise crores videos, har din. Ye nahi chalega.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Cardinality', html: `<strong>Ye kya hai:</strong> kisi collection mein <strong>alag alag (unique) cheezon ki ginti</strong>. [riya, aman, riya, neha] ki cardinality 3 hai (riya do baar, lekin ek hi insaan).<br><strong>Kyun chahiye:</strong> "unique viewers" yahi number hai. Views (4) aur unique viewers (3) alag cheezein hain.<br><strong>Iske bina:</strong> ek hi user ke 10 refresh 10 "log" gine jaate, creator ko galat number dikhta.` },
      { type: 'callout', tone: 'term', title: 'Naya word: HyperLogLog (HLL)', html: `<strong>Ye kya hai:</strong> ek chhota counter jo bata deta hai "lagbhag kitne unique log aaye", bina unki list yaad rakhe.<br><strong>Kyun chahiye:</strong> har video ke liye users ki poori list rakhna crores videos pe namumkin.<br><strong>Iske bina:</strong> har video ka ek bada Set (viral video pe 80 MB+), ya raat bhar chalne wala bhaari batch job.<br><strong>Example:</strong> Redis mein ek HLL hamesha ~12 KB ka, chahe 1,000 viewers hon ya 100 crore, aur galti lagbhag 0.81%.` },
      { type: 'p', html: `Idea ek sikka uchhaalne jaisa hai. Agar koi bataye "maine sikka uchhaala aur lagatar 10 baar heads aaya", to tum andaza lagaoge ki usne <em>bahut</em> baar try kiya hoga (2^10 ≈ 1000 ke aas paas), kyunki 10 heads lagatar bahut rare hai. HyperLogLog har user ID ko hash karta hai (random dikhne wale bits), aur dekhta hai ki hash shuru mein kitne lagatar zero se shuru hua. Sabse lamba zero-run jitna lamba, utne zyada unique users.` },
      { type: 'ascii', text: `Chhota example (hash ke pehle 8 bits dikhaye hain):

user_981 → 1 0 1 1 0 1 0 0    shuru mein 0 zero  → run = 1  (pehla 1 position 1 pe)
user_12  → 0 0 1 0 1 1 1 0    shuru mein 2 zero  → run = 3
user_77  → 0 0 0 0 1 0 1 1    shuru mein 4 zero  → run = 5
user_981 → 1 0 1 1 0 1 0 0    dobara aaya: same hash, kuch nahi badla

Sabse bada run = 5. "Shuru mein lagatar 4 zero" lagbhag 16 (2^4) alag users mein
1 baar aata hai. To akela ye counter kahega "~16 users". Asal mein sirf 3 hain!
Ek counter = bahut luck. Isliye HLL hazaaron buckets ka average leta hai (neeche).` },
      { type: 'list', items: [
        `Ek akela "sabse lamba run" bahut luck pe depend karta hai. Isliye hash ke pehle kuch bits se user ko <strong>m buckets (registers)</strong> mein se ek mein bhejo, har bucket apna sabse lamba run yaad rakhe, aur end mein sabka ek khaas average (harmonic mean) lo.`,
        `Galti (standard error) ≈ <strong>1.04 / √m</strong>. Redis 16,384 registers use karta hai, har ek 6 bits: 16,384 × 6 / 8 = 12,288 bytes ≈ <strong>12 KB</strong>, aur error 1.04/128 ≈ <strong>0.81%</strong>. Chahe 1,000 users hon ya 100 crore, memory utni hi.`,
        `Same user dobara aaye to same hash, same bucket, same run: ginti nahi badhti. Duplicates apne aap ignore.`,
        `Do HLLs <strong>merge</strong> ho sakte hain (har register ka max lo): Monday + Tuesday + ... = poore hafte ke unique users, bina dobara data padhe. Ye Set se bhi nahi hota sasta.`,
      ]},
      { type: 'code', text: `PFADD   views:video42:2026-10-04  user_981 user_12 user_981   → duplicates ignore
PFCOUNT views:video42:2026-10-04                           → ~2
PFMERGE views:video42:week  views:video42:2026-10-04 views:video42:2026-10-05 ...` },
      { type: 'p', html: `Simulator: n unique users banao (seeded, har baar same), registers ki ginti chuno, aur dekho andaza kitna sahi hai:` },
      { type: 'custom', render(el) {
        let p = 14, seed = 0;
        el.innerHTML = `<div><label>Asli unique users (n): <strong class="hl-nv"></strong></label><input class="hl-n" type="range" min="2" max="6" step="0.25" value="5"></div>
          <div style="margin-top:10px"><label>Registers (m)</label><div class="hl-p" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          <div style="margin-top:10px"><label>Users ka set (seed)</label><div class="hl-s" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          <div class="stats">
            <div class="stat"><span>HLL ka andaza</span><strong class="hl-est"></strong></div>
            <div class="stat"><span>Asli galti</span><strong class="hl-err"></strong></div>
            <div class="stat"><span>Expected galti (1.04/√m)</span><strong class="hl-se"></strong></div>
            <div class="stat"><span>HLL memory</span><strong class="hl-mem"></strong></div>
            <div class="stat"><span>Exact Set (sirf 8-byte IDs)</span><strong class="hl-set"></strong></div>
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
          el.querySelector('.hl-note').textContent = `Asli galti zyadatar expected galti ke 2 guna ke andar rehti hai. Alag "Set" chuno: galti har baar thodi alag, lekin size wahi. m ko 4 guna karo to galti aadhi (√4 = 2). n badhao: HLL ki memory ${fmtBytes(r.bytes)} hi rehti hai.`;
        };
        nE.addEventListener('input', upd); upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'HLL se list nahi milti', html: `HyperLogLog sirf <strong>ginti</strong> deta hai. "Kaun kaun se users the?" ya "kya riya ne dekha?" ka jawab nahi deta (iske liye Set ya Bloom filter). Aur jahan exact number zaroori hai (billing, payout per unique view), wahan HLL mat use karo, ya final hisaab exact pipeline se karo.` },

      { type: 'h2', text: 'Count-min sketch: kaun sabse zyada?' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com ke "Trending" section ke liye har minute pata karna hai ki kaunse hashtags sabse zyada use ho rahe hain. Crores alag hashtags hain (zyadatar ek-do baar use hote hain). Har tag ka exact counter = bahut badi hash map. Humein sirf <strong>heavy hitters</strong> (sabse zyada wale) chahiye, aur unke count ka achha andaza.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Heavy hitter', html: `<strong>Ye kya hai:</strong> stream mein wo cheez jo baaki sab se bahut zyada baar aaye. Jaise IPL final ki raat <code>#ipl</code>.<br><strong>Kyun chahiye:</strong> "Trending" section ko bas top 10-20 chahiye, baaki crores rare tags se matlab nahi.<br><strong>Iske bina:</strong> har tag ka exact counter rakhna padta, jo memory kha jaata.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Count-min sketch', html: `<strong>Ye kya hai:</strong> counters ki ek chhoti table: <strong>d rows × w columns</strong>, har row ka apna hash function. Ye har cheez ki ginti ka "upar se andaza" deta hai.<br><strong>Kyun chahiye:</strong> crores alag tags ke bawajood memory fixed aur chhoti (jaise 4 × 2,000 counters).<br><strong>Iske bina:</strong> har tag ka apna counter, crores entries ki hash map.<br><strong>Kaam:</strong> <strong>Add "#ipl"</strong>: har row mein hash se ek column chuno, us counter ko +1. <strong>Count "#ipl"</strong>: har row mein wahi column dekho, un d numbers ka <strong>minimum</strong> lo. Doosre tags kabhi kabhi same counter mein gir jaate hain (collision), to counter sirf <em>badh</em> sakta hai. Isliye andaza kabhi asli se kam nahi hota, sirf zyada. Minimum lene se sabse kam "milawat" wala counter chuna jaata hai.` },
      { type: 'ascii', text: `Chhota example: d = 2 rows, w = 4 columns. Stream: #ipl ×5, #art ×1, #pets ×2

            col0  col1  col2  col3
row A:        0     5     3     0     #ipl→col1, #art→col2, #pets→col2  (art+pets takraaye)
row B:        1     0     2     5     #ipl→col3, #art→col0, #pets→col2

Count #ipl  = min(A[1]=5, B[3]=5) = 5   ✓ sahi
Count #art  = min(A[2]=3, B[0]=1) = 1   ✓ row A mein milawat thi, row B ne bachaya
Count #pets = min(A[2]=3, B[2]=2) = 2   ✓
Agar ek hi row hoti (d = 1): #art = 3, galat. Zyada rows = milawat se bachne ke zyada mauke.` },
      { type: 'p', html: `Top-k ke liye: sketch ke saath ek chhota <strong>min-heap</strong> (size k) rakho. (Min-heap = ek chhoti list jo hamesha apna sabse chhota number turant bata de.) Har naye event pe tag ka estimate dekho; heap ke sabse chhote se bada ho to heap mein daal do. Ye stream processing (Flink, Kafka Streams) mein common pattern hai. Neeche 500 alag hashtags ka stream hai (20 popular + 480 rare):` },
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
            <div class="stat"><span>Top 5 sahi pakde?</span><strong class="cm-top"></strong></div>
          </div>
          <div class="calc-note cm-note"></div>`;
        const wE = el.querySelector('.cm-w'), dE = el.querySelector('.cm-d');
        const upd = () => {
          const w = 1 << +wE.value, d = +dE.value;
          el.querySelector('.cm-wv').textContent = w; el.querySelector('.cm-dv').textContent = d;
          const { est, total } = T.cmsRun(items, w, d);
          const show = ['#cricket', '#ipl', '#music', '#coding', '#memes', '#nature', '#tag7', '#tag300'];
          el.querySelector('.cm-tab').innerHTML = `<table><thead><tr><th>Tag</th><th>Asli count</th><th>Sketch estimate</th><th>Zyada gina</th></tr></thead><tbody>` +
            show.map(t => { const e = est(t), tr = truth[t]; return `<tr><td>${t}</td><td>${tr}</td><td><strong>${e}</strong></td><td style="color:${e - tr > tr ? 'var(--red)' : 'var(--ink-2)'}">+${e - tr}</td></tr>`; }).join('') + `</tbody></table>`;
          const byTrue = items.slice().sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
          const byEst = items.map(([t]) => [t, est(t)]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
          const hit = byEst.filter(t => byTrue.includes(t)).length;
          el.querySelector('.cm-n').textContent = total.toLocaleString('en-IN');
          el.querySelector('.cm-mem').textContent = (w * d) + ' counters = ' + fmtBytes(w * d * 4);
          el.querySelector('.cm-top').textContent = hit + ' / 5';
          el.querySelector('.cm-note').textContent = `Guarantee: zyada se zyada ~(e / w) × N = ${Math.round(Math.E / w * total).toLocaleString('en-IN')} ki galti, probability ≥ ${pct(1 - Math.exp(-d), 0)} (1 − e^−d). Popular tags ka estimate kaafi sahi, rare tags (#tag7) ka estimate bahut fool jaata hai: count-min sketch heavy hitters ke liye hai, rare cheezon ke liye nahi.`;
        };
        wE.addEventListener('input', upd); dE.addEventListener('input', upd); upd();
      }},

      { type: 'h2', text: '"Mere paas kya hai?": geo indexes' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com ne "Nearby" feature launch kiya: tumhare 2 km mein live stream kar rahe creators. (Yahi problem Uber/Ola ke "paas ke drivers" mein hai.) Har creator ka latitude/longitude DB mein hai. Seedha tareeka: har creator se doori nikaalo, sort karo. 10 lakh live points × har second hazaaron requests = bekaar.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Latitude aur longitude', html: `<strong>Ye kya hai:</strong> dharti pe kisi jagah ka "pata" do numbers mein. <strong>Latitude</strong> = equator se kitna upar ya neeche (−90 se +90). <strong>Longitude</strong> = London ke paas wali line se kitna east ya west (−180 se +180). MG Road, Bengaluru ≈ (12.9756, 77.6067).<br><strong>Kyun chahiye:</strong> har phone GPS se yahi do numbers deta hai.<br><strong>Dikkat:</strong> ye do alag numbers hain (2D). Normal database index ek baar mein ek hi number sort karta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Geo index (spatial index)', html: `<strong>Ye kya hai:</strong> ek index jo "is jagah ke paas kya hai?" jaldi bata de. Trick: naksha chhote cells (khaanon) mein baanto, har cell ko ek ID do, aur har point ko uske cell ki ID ke saath rakho.<br><strong>Kyun chahiye:</strong> phir "paas ke creators" = "mere cell aur padosi cells ke creators". Lakhon points scan karne ki jagah kuch cells padho.<br><strong>Iske bina:</strong> har request pe lakhon doori ke hisaab.` },
      { type: 'p', html: `Normal index ek hi dimension sort karta hai. <code>lat BETWEEN ... AND lng BETWEEN ...</code> pe lat ka index ek patli patti (poori duniya ke us latitude band) deta hai, lng ka index doosri patti; dono ka intersection mehenga. Chahiye: <strong>2D jagah ko 1D key mein badalna</strong>, jahan paas wali jagahon ki keys bhi milti-julti hon. Iske chaar popular tareeke hain: geohash, quadtree, S2 aur H3.` },

      { type: 'h3', text: 'Geohash: prefix = area' },
      { type: 'callout', tone: 'term', title: 'Naya word: Geohash', html: `<strong>Ye kya hai:</strong> kisi jagah ka chhota sa text code, jaise <code>tdr1v</code> (MG Road, Bengaluru). Jitna lamba code, utna chhota area.<br><strong>Kyun chahiye:</strong> jo jagahein paas hain, unke code aksar same shuruaat (prefix) se shuru hote hain. "Paas ke log" = "jinka code <code>tdr1v</code> se shuru". Ye kisi bhi normal database mein fast hai.<br><strong>Iske bina:</strong> 2D doori ka hisaab har point pe.<br><strong>Kaise banta hai:</strong> duniya ko baar baar aadha karo: pehle longitude (east half? 1, west? 0), phir latitude (north? 1, south? 0), phir longitude... Har 5 bits ko ek character mein likho (base32: 0-9 aur b-z, kuch letters chhod ke). <strong>Har extra character cell ko 32 chhote cells mein todta hai.</strong> Jo do jagah ek hi prefix share karti hain (<code>tdr1…</code>), wo ek hi bade cell ke andar hain.` },
      { type: 'ascii', text: `Pehle 5 bits, MG Road (lat 12.98, lng 77.61):

bit 1 (lng): −180..180, beech 0.     77.6 ≥ 0     → 1, ab 0..180
bit 2 (lat): −90..90,   beech 0.     12.98 ≥ 0    → 1, ab 0..90
bit 3 (lng): 0..180,    beech 90.    77.6 < 90    → 0, ab 0..90
bit 4 (lat): 0..90,     beech 45.    12.98 < 45   → 0, ab 0..45
bit 5 (lng): 0..90,     beech 45.    77.6 ≥ 45    → 1, ab 45..90
bits 11001 = 25 → base32 list mein number 25 (0 se ginti) = "t"   (0123456789bcdefghjkmnpqrstuvwxyz)
Aage ke 5-5 bits se "d", "r", "1", "v" ... = tdr1v` },
      { type: 'p', html: `Isliye "nearby" query ek simple string prefix query ban jaati hai, jo koi bhi sorted index (B-tree, Redis sorted set, Cassandra clustering key) fast karta hai. Neeche location aur precision badlo: dikhega parent cell ke 32 tukde, aur tumhara point kis tukde mein hai.` },
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
            <div class="stat"><span>Cell ka size (equator pe, worst case)</span><strong class="gh-sz" style="font-size:17px"></strong></div>
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
          el.querySelector('.gh-note').innerHTML = `Upar ka box parent cell <code>${esc(parent || '(poori duniya)')}</code> hai, uske 32 tukde (${p % 2 ? '8 columns × 4 rows' : '4 columns × 8 rows'}, kyunki bits baari baari longitude aur latitude ko jaate hain). Box scale pe nahi, khinch ke dikhaya hai. Prefixes: ${[...hash].map((_, i) => '<code>' + esc(hash.slice(0, i + 1)) + '</code>').join(' ⊃ ')}`;
        };
        [latE, lonE, pE].forEach(x => x.addEventListener('input', upd)); upd();
      }},
      { type: 'callout', tone: 'warn', title: 'Geohash ki kamzori: border', html: `Do jagah 10 meter door ho sakti hain lekin cell border ke do taraf, aur unke geohash ka prefix bilkul alag (sabse bura: equator ya 0° longitude ke paas, jahan pehla character hi alag). Isliye "nearby" query hamesha <strong>apna cell + 8 padosi cells</strong> mein dhoondhti hai, phir asli doori se filter karti hai. Redis ka <code>GEOSEARCH</code> bhi yahi karta hai: geohash ko 52-bit number bana ke sorted set mein rakhta hai, aur radius query ke liye 9 areas (1 + 8) ki score ranges padhta hai.` },

      { type: 'h3', text: 'Quadtree: ghani jagah, chhote cells' },
      { type: 'p', html: `Geohash ka har cell same size ka hai. Lekin Mumbai ke ek block mein 5,000 creators aur Rajasthan ke registaan ke same size ke cell mein 2. Mumbai wale cell mein search phir bhi bhaari, registaan wale mein bekaar khaali.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Quadtree', html: `<strong>Ye kya hai:</strong> naksha ek bada square. Jis square mein bahut zyada points ho jaayein (jaise 100 se zyada), use <strong>4 chhote squares</strong> mein tod do ("quad" = chaar). Chhote squares mein bhi zyada ho to phir todo. Ye ek tree banata hai: har box ke 4 bachche.<br><strong>Kyun chahiye:</strong> ghani jagah pe chhote cells, khaali jagah pe bade. Har cell mein lagbhag barabar points, chahe shehar ho ya registaan.<br><strong>Iske bina (fixed grid):</strong> ghane cells mein hazaaron points, khaali cells bekaar.<br><strong>Example:</strong> neeche ke ascii mein upar-daayein ka hissa baar baar tuta, kyunki wahan bahut points the. Khaali hissa bada hi raha.` },
      { type: 'ascii', text: `
+-----------------+-----------------+
|                 |    |    |       |
|   2 points      +----+----+  12   |
|  (tod-ne ki     |  80|  95|       |
|   zaroorat nahi)+----+----+-------+
|                 |  60 | 40 |  7   |
+-----------------+-----+----+------+
|                 |                 |
|        5        |        0        |
|                 |                 |
+-----------------+-----------------+
  Ghana area (upar daayein) baar baar tuta, khaali area bada hi raha.` },
      { type: 'list', items: [
        `<strong>Search:</strong> root se chalo, sirf un squares mein jao jo tumhare search circle ko chhoote hain. Ghani jagah mein bhi har leaf mein ~100 points hi.`,
        `<strong>Achha kab:</strong> points zyada hilte nahi (shops, places, static listings), aur poora tree ek machine ki memory mein aa jaaye. Aam taur pe offline banake servers pe load karte hain.`,
        `<strong>Mushkil kab:</strong> points har kuch second mein hilte hain (drivers). Har move pe tree update aur split/merge, concurrency ke saath, mehenga. Wahan fixed grid (geohash/H3) + Redis zyada simple hai.`,
      ]},
      { type: 'p', html: `Khud dekho. Naksha 256 × 256 ka hai, 120 creators: upar daayein ek ghana "shehar" (90) aur baaki jagah bikhre hue (30). "Cell capacity" = ek cell mein kitne points ke baad wo 4 mein tootega. Phir search circle ki jagah aur size chuno, aur dekho ki quadtree kitne points check karta hai:` },
      { type: 'custom', render(el) {
        const P = T.qtPoints(), SPOTS = [['Shehar ke beech', 180, 70], ['Shehar ka kinara', 140, 110], ['Khaali ilaaka', 60, 190]];
        let cap = 8, spot = 0;
        el.innerHTML = `<div class="row2">
            <div><label>Cell capacity: <strong class="qt-cv"></strong></label><input class="qt-c" type="range" min="2" max="24" step="1" value="8"></div>
            <div><label>Search radius: <strong class="qt-rv"></strong></label><input class="qt-r" type="range" min="8" max="60" step="2" value="20"></div>
          </div>
          <div class="qt-sp" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <svg class="qt-svg" viewBox="0 0 260 260" style="width:100%;max-width:340px;display:block;margin:12px auto 0"></svg>
          <div class="stats">
            <div class="stat"><span>Leaf cells</span><strong class="qt-l"></strong></div>
            <div class="stat"><span>Cells (boxes) visit kiye</span><strong class="qt-v"></strong></div>
            <div class="stat"><span>Points check kiye</span><strong class="qt-ch"></strong></div>
            <div class="stat"><span>Circle ke andar mile</span><strong class="qt-f"></strong></div>
            <div class="stat"><span>Bina index: check</span><strong>120</strong></div>
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
          el.querySelector('.qt-note').textContent = `Ghane shehar mein cells chhote ho gaye, khaali jagah mein bade hi rahe. Search sirf un boxes mein gaya jo circle ko chhoote hain: ${q.checked} points check kiye, 120 nahi. Capacity kam karo: cells zyada aur chhote, har box mein kam points, lekin tree gehra (zyada boxes visit). Capacity badhao: ulta.`;
        };
        cE.addEventListener('input', upd); rE.addEventListener('input', upd); upd();
      }},

      { type: 'h3', text: 'Google S2: sphere pe cells' },
      { type: 'callout', tone: 'term', title: 'Naya word: S2', html: `<strong>Ye kya hai:</strong> Google ki open-source library jo poori dharti (gol!) ko cells mein baant-ti hai, aur har cell ko ek 64-bit number deti hai.<br><strong>Kyun chahiye:</strong> geohash dharti ko flat kaagaz maanta hai, isliye poles ke paas cells khinch jaate hain. S2 gol dharti ke hisaab se lagbhag barabar cells banata hai, aur kisi bhi shape (circle, shehar ki seema) ko cells se dhak sakta hai.<br><strong>Iske bina:</strong> bade areas aur poles ke paas galat size ke cells, aur polygon queries mushkil.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Hilbert curve', html: `<strong>Ye kya hai:</strong> ek tedhi-medhi line jo grid ke har cell se ek baar guzarti hai, aur kabhi lamba kood nahi maarti. Is line pe cells ko 0, 1, 2, 3... number do.<br><strong>Kyun chahiye:</strong> line pe paas ke numbers = naqshe pe paas ke cells. To "is area ke cells" aksar ek ya kuch lagaataar number ranges ban jaate hain, jo database jaldi padh leta hai.<br><strong>Iske bina:</strong> line-by-line numbering mein upar-neeche ke padosi ke number bahut door (jaise 5 aur 21), aur ek area = bahut saari chhoti ranges.` },
      { type: 'p', html: `Geohash dharti ko ek flat rectangle maanta hai, isliye poles ke paas cells patle aur ajeeb ho jaate hain. <strong>S2</strong> (Google ki open-source library) dharti ko ek <strong>cube</strong> ke andar rakh ke uske 6 faces pe project karta hai. Har face ko baar baar 4 hisson mein toda jaata hai: <strong>31 levels</strong> (0 se 30), level 30 ka cell ~1 cm ka. Cells ko <strong>Hilbert curve</strong> ke order mein number kiya jaata hai (ek zig-zag line jo har cell se ek baar guzarti hai aur paas ke cells ko paas ke numbers deti hai). Har cell ki ID ek <strong>64-bit number</strong> hai.` },
      { type: 'list', items: [
        `<strong>Region covering:</strong> "is circle/polygon ko kaunse cells dhakte hain?" S2 bade aur chhote cells ka mix deta hai. Har cell = ID ki ek continuous range. To geo query = kuch range scans, kisi bhi sorted key-value store pe.`,
        `<strong>Kahan:</strong> Google ke geo systems, aur MongoDB ka 2dsphere index andar S2 library use karta hai.`,
      ]},
      { type: 'p', html: `Hilbert curve ka faayda khud dekho. Grid ka level chuno (har level pe har cell 4 mein tootta hai), phir ek area chuno. Widget ginta hai ki us area ke cells ki IDs kitne <strong>lagaataar tukdon (ranges)</strong> mein aati hain: Hilbert numbering mein, aur normal "line by line" numbering mein. Kam ranges = database mein kam alag reads.` },
      { type: 'custom', render(el) {
        const BOX = [['Ek quarter (neeche daayein)', [0.5, 0, 1, 0.5]], ['Beech ka square', [0.25, 0.25, 0.75, 0.75]], ['Ajeeb sa area', [0.1, 0.55, 0.45, 0.9]]];
        let L = 3, bi = 0;
        el.innerHTML = `<label>Level (grid)</label><div class="hb-l" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div style="margin-top:10px"><label>Area</label><div class="hb-b" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          <svg class="hb-svg" viewBox="0 0 260 260" style="width:100%;max-width:340px;display:block;margin:12px auto 0"></svg>
          <div class="stats">
            <div class="stat"><span>Area mein cells</span><strong class="hb-c"></strong></div>
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
          el.querySelector('.hb-note').textContent = `Laal line Hilbert curve hai: har cell se ek baar, aur kabhi lamba kood nahi. Isliye curve pe paas wale numbers naqshe pe bhi paas. Neeche-daayein quarter Hilbert mein hamesha 1 hi range hai, line-by-line mein uski har row alag range (16 × 16 pe 8 ranges). "Ajeeb sa area" jo cell ki seemaon se match nahi karta, wahan dono barabar ho sakte hain: isliye S2 coverer bade aur chhote cells mila ke area dhakta hai.`;
        };
        upd();
      }},

      { type: 'h3', text: 'Uber H3: hexagons' },
      { type: 'callout', tone: 'term', title: 'Naya word: H3', html: `<strong>Ye kya hai:</strong> Uber ka open-source grid system. Duniya ko <strong>hexagons</strong> (6 kone wale cells, madhumakhi ke chhatte jaise) mein baant-ta hai, kai sizes mein (resolutions). Har cell ki ek 64-bit ID.<br><strong>Kyun chahiye:</strong> "paas ke drivers", surge pricing, demand ka naksha: sab "is hexagon mein kitne" jaise saaf sawaal ban jaate hain.<br><strong>Iske bina:</strong> square cells mein kone wale padosi door, side wale paas: doori ka hisaab tedha.<br><strong>Example:</strong> resolution 9 ka ek hexagon ~0.1 km², lagbhag ek bada mohalla.` },
      { type: 'callout', tone: 'term', title: 'Naya word: k-ring (gridDisk)', html: `<strong>Ye kya hai:</strong> ek cell aur uske aas paas ke k "chhalle" (rings). k = 1 = apna cell + 6 padosi = 7 cells.<br><strong>Kyun chahiye:</strong> "mere paas" ka matlab "mera cell + padosi cells". Border ke us paar wala driver bhi mil jaata hai.<br><strong>Iske bina:</strong> sirf apna cell dekha to 60 m door wala driver bhi chhoot sakta hai (neeche flow mein dekhoge).` },
      { type: 'p', html: `Uber ne 2018 mein apna grid system <strong>H3</strong> open source kiya (Uber Engineering blog post, kuch saal purani, lekin library aaj bhi active hai, h3geo.org). H3 duniya ko <strong>hexagons</strong> (6 kone wale cells) mein baant-ta hai. Uber ke marketplace (surge pricing, dispatch) mein events ko hexagon cells mein bucket karke poore shehar ka analysis hota hai.` },
      { type: 'p', html: `Hexagon hi kyun? Neeche dekho. Square grid mein padosi do tarah ke hain: side wale (doori 1) aur kone wale (doori ≈ 1.41). Hexagon mein saare 6 padosi <strong>ek hi doori</strong> pe:` },
      { type: 'custom', render(el) {
        const sq = [], hx = [];
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) sq.push([dx, dy]);
        const hexPts = (cx, cy, r) => [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1); }).join(' ');
        hx.push([0, 0]); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; hx.push([Math.cos(a), Math.sin(a)]); }
        const S = 44, R = 26, D = R * Math.sqrt(3);
        let sv = '';
        sq.forEach(([x, y]) => { sv += `<rect x="${(80 + x * S - S / 2).toFixed(1)}" y="${(80 + y * S - S / 2).toFixed(1)}" width="${S}" height="${S}" fill="${x || y ? 'var(--surface)' : 'var(--accent-soft)'}" stroke="var(--line-2)"/>`; });
        sq.forEach(([x, y]) => { if (x || y) sv += `<line x1="80" y1="80" x2="${80 + x * S}" y2="${80 + y * S}" stroke="${x && y ? 'var(--red)' : 'var(--green)'}" stroke-width="2"/>`; });
        sv += `<text x="80" y="170" font-size="12" text-anchor="middle" fill="var(--ink-2)">side: 1, kona: 1.41</text>`;
        let hv = '';
        hx.forEach(([x, y]) => { hv += `<polygon points="${hexPts(250 + x * D, 80 + y * D, R)}" fill="${x || y ? 'var(--surface)' : 'var(--accent-soft)'}" stroke="var(--line-2)"/>`; });
        hx.slice(1).forEach(([x, y]) => { hv += `<line x1="250" y1="80" x2="${(250 + x * D).toFixed(1)}" y2="${(80 + y * D).toFixed(1)}" stroke="var(--green)" stroke-width="2"/>`; });
        hv += `<text x="250" y="170" font-size="12" text-anchor="middle" fill="var(--ink-2)">saare 6 padosi: 1</text>`;
        el.innerHTML = `<svg viewBox="0 0 330 180" style="width:100%;max-width:460px;display:block">${sv}${hv}</svg>
          <div class="calc-note">Hara = ek hi doori, laal = lambi doori. Hexagon grid mein "1 ring door" ka matlab har disha mein lagbhag same doori hai, isliye smoothing, gradients aur "paas ke cells" ka hisaab saaf rehta hai. Square ke kone wale padosi ~41% zyada door hain.</div>`;
      }},
      { type: 'list', items: [
        `<strong>16 resolutions</strong> (0 se 15). Har agla resolution cells ko ~7 guna chhota karta hai (aperture 7). Kuch numbers: resolution 7 ka hexagon ~5.2 km², resolution 8 ~0.74 km², resolution 9 ~0.11 km² (edge ~200 m).`,
        `<strong>Base:</strong> 122 base cells (110 hexagons + 12 pentagons). Poori sphere sirf hexagons se dhak nahi sakti, isliye 12 pentagons; H3 unhe samundar mein rakhta hai taaki zameen pe kam asar ho.`,
        `<strong>Parent-child approximate:</strong> 7 chhote hexagons ek bade hexagon mein bilkul fit nahi hote, to child cells parent ke andar "lagbhag" hain. Squares (geohash, S2) mein ye exact hota hai. Ye H3 ki ek keemat hai.`,
        `<strong>k-ring (gridDisk):</strong> apna cell + 1 ring = 7 cells, 2 rings = 19 cells. "Paas ke drivers" = rider ke cell ka 1-2 ring.`,
      ]},
      { type: 'p', html: `k-ring khud banao. Resolution aur k chuno: widget batata hai kitne cells padhne padenge aur wo kitna area dhakte hain (h3geo.org ke average numbers se):` },
      { type: 'custom', render(el) {
        const RES = { 7: [5.161, 1.406], 8: [0.7373, 0.5314], 9: [0.1053, 0.2008], 10: [0.01505, 0.07586] };
        let res = 9;
        el.innerHTML = `<div class="row2">
            <div><label>Rings (k): <strong class="kr-kv"></strong></label><input class="kr-k" type="range" min="0" max="4" step="1" value="1"></div>
            <div><label>Resolution</label><div class="kr-r" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
          </div>
          <svg class="kr-svg" viewBox="0 0 300 260" style="width:100%;max-width:380px;display:block;margin:12px auto 0"></svg>
          <div class="stats">
            <div class="stat"><span>Cells padhne hain (1 + 3k(k+1))</span><strong class="kr-n"></strong></div>
            <div class="stat"><span>Kul area, lagbhag</span><strong class="kr-a"></strong></div>
            <div class="stat"><span>Har disha mein pahunch, lagbhag</span><strong class="kr-d"></strong></div>
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
          el.querySelector('.kr-d').textContent = k ? '~' + (k * gap).toFixed(2) + ' km' : 'sirf apna cell';
          el.querySelector('.kr-note').textContent = `Beech wala gaadha cell rider ka hai. Har ring ka number us cell ki "doori" hai. k = 1 pe 7 cells, k = 2 pe 19, k = 3 pe 37. Resolution 9 pe ek hexagon ~0.105 km² (edge ~200 m), aur do padosi centres ke beech ~${(Math.sqrt(3) * 0.2008).toFixed(2)} km. Pahunch sirf andaza hai (centre se centre); asli doori se baad mein filter karte hain.`;
        };
        kE.addEventListener('input', upd); upd();
      }},
      { type: 'flow', title: 'Paas ke drivers / creators: H3 cells ke saath', height: 330,
        nodes: [
          { id: 'drv', label: 'Driver app', sub: 'location bhejta hai', x: 100, y: 70, w: 150, kind: 'client', info: 'Ye kya hai: driver (ya live creator) ke phone ki app. Har kuch second mein apni lat/lng (location) bhejti hai, taaki naksha taaza rahe.' },
          { id: 'loc', label: 'Location service', sub: 'lat/lng → H3 cell', x: 340, y: 70, w: 170, kind: 'server', info: 'Ye kya hai: ek chhoti service jo location updates leti hai. Location ko H3 cell ID mein badalta hai (jaise resolution 9) aur geo index mein driver ko purane cell se hata ke naye cell mein daalta hai.' },
          { id: 'geo', label: 'Geo index', sub: 'cell → drivers (Redis)', x: 580, y: 170, w: 180, kind: 'cache', info: 'Ye kya hai: RAM mein rakha naksha (aksar Redis). Kyun: har second hazaaron reads/writes, disk wala DB itna tez nahi. Andar: H3 cell ID → us cell ke drivers (aur unki last location, TTL ke saath, taaki band app wale driver apne aap hat jaayein).' },
          { id: 'rid', label: 'Rider app', sub: 'paas ke drivers?', x: 100, y: 270, w: 150, kind: 'client', info: 'Ye kya hai: rider (ya viewer) ki app. User paas ki gaadiyan (ya paas ke creators) dekhna chahta hai.' },
          { id: 'mt', label: 'Matching', sub: 'nearby + rank', x: 340, y: 270, w: 170, kind: 'server', info: 'Ye kya hai: wo service jo "kaun paas hai" ka jawab banati hai. Rider ke cell aur uske padosi cells ke drivers laata hai, asli doori/ETA se sort karta hai.' },
        ],
        edges: [{ a: 'drv', b: 'loc' }, { a: 'loc', b: 'geo' }, { a: 'rid', b: 'mt' }, { a: 'mt', b: 'geo' }],
        scenarios: [
          { name: 'Driver update', steps: [
            { title: 'Location aayi', text: 'Driver ne apni location bheji.', go: 'drv>loc', msg: '{ driver: "d17", lat: 12.9756, lng: 77.6067 }' },
            { title: 'Cell nikaalo', text: 'latLngToCell(lat, lng, 9) → ek H3 cell ID. Ye pure maths hai, koi DB call nahi.', focus: ['loc'], msg: 'cell = 8961xxxxxxxxxxx (res 9, ~0.1 km²)' },
            { title: 'Index update', text: 'Driver ko purane cell ki list se hatao, naye mein daalo. Cell nahi badla to sirf last-location refresh.', go: 'loc>geo', after: { geo: { state: 'ok', sub: 'd17 → naya cell' } } },
          ]},
          { name: 'Rider search', steps: [
            { title: 'Request', text: 'Rider ne app khola.', go: 'rid>mt', msg: 'GET /nearby?lat=12.9760&lng=77.6071' },
            { title: 'Apna cell + 1 ring', text: 'Rider ka cell aur uske 6 padosi: 7 cells. Inhi ke drivers laao.', go: ['mt>geo', 'res:geo>mt'], msg: 'gridDisk(riderCell, 1) → 7 cells → 23 drivers' },
            { title: 'Doori se filter aur rank', text: 'Cells sirf "kahan dekhna hai" batate hain. Asli doori/ETA se sort karke top results bhejo.', go: 'res:mt>rid', msg: '[d17: 250 m, d4: 410 m, d88: 900 m]' },
          ]},
          { name: 'Border miss (failure)', steps: [
            { title: 'Sirf apna cell dekha', text: 'Ek naya developer sirf rider ke cell mein dhoondhta hai, ring nahi.', go: ['rid>mt', 'mt>geo', 'res:geo>mt'], msg: 'cell(rider) → 0 drivers' },
            { title: '"Koi driver nahi"', text: 'Rider ko "no cars" dikha, jabki ek driver 60 m door tha, bas border ke us paar wale cell mein.', go: 'bad:mt>rid', set: { mt: { state: 'warn', sub: 'border miss' } } },
            { title: 'Fix', text: 'Hamesha padosi cells bhi (H3 mein k-ring, geohash mein 8 neighbours), aur khaali aaye to ring badhao (k = 2, 3).', focus: ['mt'] },
          ]},
          { name: 'Hot cell (failure)', steps: [
            { title: 'Match khatam, stadium khaali', text: '50,000 log ek saath ek hi area se ride maangte hain, aur saikdon drivers wahi cell mein.', flood: { paths: ['rid>mt>geo'], n: 14 }, after: { geo: { state: 'hot', sub: 'ek key pe toofan' } } },
            { title: 'Ek Redis key garam', text: 'Saari reads aur writes ek hi cell key pe: us shard ka CPU full. Baaki shards aaram mein.', set: { mt: { state: 'warn' } }, focus: ['geo'] },
            { title: 'Fix', text: 'Ghani jagah ke liye finer resolution (res 10), hot cells ki reads ke liye replicas/local cache, aur matching ko batch mein (har 1-2 second ek saath) chalao.', set: { geo: { state: 'ok', sub: 'finer cells' }, mt: { state: '' } } },
          ]},
        ],
      },
      { type: 'table', head: ['', 'Geohash', 'Quadtree', 'S2', 'H3'], rows: [
        ['Shape', 'Rectangles', 'Squares (alag size)', 'Quads on a cube → sphere', 'Hexagons (+12 pentagons)'],
        ['Cell size', 'Fixed per length', 'Data ke hisaab se', 'Fixed per level', 'Fixed per resolution'],
        ['Key', 'String prefix', 'Tree path (memory mein)', '64-bit ID (Hilbert order)', '64-bit ID'],
        ['Badhiya kab', 'Simple, kisi bhi DB/Redis mein', 'Static points, ghanaapan bahut alag', 'Polygons, accurate coverage', 'Equal-distance neighbours, analytics, surge'],
        ['Kamzori', 'Border pe prefix toot-ta, poles pe distort', 'Moving points pe update mehenga', 'Thoda complex', 'Parent-child exact nahi'],
      ]},

      { type: 'h2', text: 'Skip list: Redis sorted set ke andar' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com pe creators ka live leaderboard: "top 100 creators by views", "riya ki rank kya hai", "rank 500-520 dikhao". Har update pe score badalta hai. Sorted array mein insert O(n) (sab ko khiskaana), linked list mein dhoondhna O(n). Balanced tree (red-black) kaam karta hai lekin code complex. <strong>Skip list</strong> simple hai aur average O(log n).` },
      { type: 'callout', tone: 'term', title: 'Naya word: Linked list', html: `<strong>Ye kya hai:</strong> items ki ek chain, jahan har item bas apne agle item ka pata (pointer) rakhta hai. Beech mein naya item jodna aasaan: bas do pointers badlo.<br><strong>Dikkat:</strong> kisi item tak pahunchne ke liye shuru se ek ek karke chalna padta hai. 1 crore items = 1 crore kadam tak.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Skip list', html: `<strong>Ye kya hai:</strong> ek sorted linked list, jiske upar "express lanes" hain, jaise local train ke upar fast train jo kuch stations chhod deti hai. Har item sikka uchhaal ke decide karta hai ki wo upar ki lane mein bhi jaayega ya nahi (aadhe items level 2 pe, chauthai level 3 pe...).<br><strong>Kyun chahiye:</strong> dhoondhte waqt upar ki lane mein tez aage badho, jahan aage wala bada ho jaaye wahan neeche utro. Search, insert, rank: sab average O(log n), aur code simple.<br><strong>Iske bina:</strong> sorted array mein har insert pe sab ko khiskaana, linked list mein har search pe poora chalna.<br><strong>Example:</strong> 1 crore scores mein kisi ka rank ~25-30 kadam mein.` },
      { type: 'ascii', text: `
Level 3:  HEAD ─────────────────────────────> 50 ──────────────────> NIL
Level 2:  HEAD ──────────> 20 ──────────────> 50 ──────> 80 ───────> NIL
Level 1:  HEAD ──> 10 ──> 20 ──> 30 ──> 40 ──> 50 ──> 70 ──> 80 ──> 90 ──> NIL

Search 70:  L3: 50 (70 se chhota, aage) → NIL (ruk, neeche)
            L2: 80 (bada, neeche)
            L1: 70 mil gaya.   9 items mein ~4 kadam; 1 crore mein ~25-30.` },
      { type: 'list', items: [
        `<strong>Redis sorted sets</strong> (ZADD, ZRANGE, ZRANK) bade hone pe <strong>skip list + hash table</strong> use karte hain: skip list score order aur rank ke liye (har node pe "span" yaad rakha jaata hai, isliye rank bhi O(log n)), hash table "member → score" O(1) lookup ke liye. Chhote sets (default 128 entries tak) ek compact listpack mein rehte hain.`,
        `Concurrent versions (lock-free skip lists) bhi aasaan hain, isliye Java ka <code>ConcurrentSkipListMap</code> aur kai databases ke in-memory tables (LSM ka memtable, jaise LevelDB/RocksDB) skip list use karte hain.`,
        `<strong>Keemat:</strong> extra pointers ki memory, aur randomness: worst case slow ho sakta hai (lekin bahut kam probability).`,
      ]},
      { type: 'p', html: `Khud chala ke dekho. Items ki ginti chuno, ek number dhoondho, aur dekho kitne kadam lage. Levels sikke (seeded) se tay hote hain, isliye har baar same picture:` },
      { type: 'custom', render(el) {
        let n = 16;
        el.innerHTML = `<label>Items</label><div class="sl-n" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center">
            <input type="number" class="sl-x" value="75" style="max-width:120px">
            <button type="button" class="btn small primary sl-go">Dhoondho</button>
          </div>
          <div class="sl-pic table-wrap" style="margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Is search ke kadam</span><strong class="sl-s"></strong></div>
            <div class="stat"><span>Skip list: average kadam</span><strong class="sl-a"></strong></div>
            <div class="stat"><span>Normal list: average kadam</span><strong class="sl-l"></strong></div>
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
          } else el.querySelector('.sl-pic').innerHTML = `<div style="color:var(--ink-3);font-size:14px">${n} items ki picture badi hai; numbers neeche hain.</div>`;
          el.querySelector('.sl-s').textContent = `${r.steps} (${r.found ? 'mil gaya' : 'nahi mila'})`;
          el.querySelector('.sl-a').textContent = (tot / n).toFixed(1);
          el.querySelector('.sl-l').textContent = ((n + 1) / 2).toFixed(1);
          el.querySelector('.sl-note').textContent = `Gaadhe boxes = jahan search ruka (har level pe jitna aage ja sakta tha). Items 8 guna (16 → 128) karne pe skip list ke average kadam sirf ~8 se ~10 hue, normal list ke 8.5 se 64.5. Yahi O(log n) ka matlab hai.`;
        };
        el.querySelector('.sl-go').onclick = upd; xE.addEventListener('change', upd); upd();
      }},
      { type: 'callout', tone: 'mistake', title: 'Skip list probabilistic hai, lekin galat nahi', html: `Bloom filter aur HLL ke jawab galat ho sakte hain. Skip list ka jawab <strong>hamesha sahi</strong> hai; randomness sirf uski <em>speed</em> mein hai (levels sikke se tay hote hain). Dono tarah ke "probabilistic" alag cheezein hain.` },

      { type: 'h2', text: 'Merkle tree: do copies jaldi compare karo' },
      { type: 'p', html: `<strong>Problem:</strong> xyz.com ka user data ek Dynamo-style database mein 3 replicas pe hai. Ek replica 10 minute ke liye network se kat gaya, kuch writes miss ho gaye. Ab kaunsi keys alag hain? 1 crore keys ek ek karke network pe compare karna = bahut bandwidth aur time.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Merkle tree (hash tree)', html: `<strong>Ye kya hai:</strong> hashes ka ek ulta ped. Har key-value ka hash ek patta (leaf). Do patton ke hash milake upar ka hash, aise karte karte sabse upar ek <strong>root hash</strong>, jo poore data ka "fingerprint" hai.<br><strong>Kyun chahiye:</strong> do replicas ke root hash same → saara data same, kaam khatam (ek hi compare!). Alag → dono bachche compare karo, sirf alag wali side mein neeche jao.<br><strong>Iske bina:</strong> 1 crore keys ek ek karke network pe compare.<br><strong>Example:</strong> 8 keys mein 1 key alag → root, phir 2, phir 2, phir 2 = 7 hashes compare, aur sirf wahi 1 key bhejo.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Anti-entropy', html: `<strong>Ye kya hai:</strong> background mein replicas ko chupchaap aapas mein milaate rehna, taaki jo writes kisi replica tak nahi pahunche, wo baad mein pahunch jaayein. ("Entropy" = bikharne ki aadat; "anti" = uske khilaaf.)<br><strong>Kyun chahiye:</strong> network kabhi kabhi kat-ta hai. Bina sync ke replicas dheere dheere alag ho jaate.<br><strong>Iske bina:</strong> ek replica pe purana data hamesha ke liye reh jaata.` },
      { type: 'p', html: `Replica B pe ek-do keys badlo aur dekho comparison sirf alag raaste pe kaise jaata hai:` },
      { type: 'custom', render(el) {
        const keys = [...Array(8)].map((_, i) => 'k' + (i + 1));
        const changed = new Set([2]);
        el.innerHTML = `<label>Replica B pe kaunsi keys alag hain (click)</label><div class="mrk-ch" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          <svg class="mrk-svg" viewBox="0 0 360 215" style="width:100%;max-width:560px;display:block;margin-top:12px"></svg>
          <div class="stats">
            <div class="stat"><span>Hashes compare kiye</span><strong class="mrk-c"></strong></div>
            <div class="stat"><span>Keys jinhe sync karna hai</span><strong class="mrk-k"></strong></div>
            <div class="stat"><span>Bina tree: compare</span><strong>8 keys</strong></div>
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
          el.querySelector('.mrk-k').textContent = r.diffLeaves.length ? r.diffLeaves.map(i => keys[i]).join(', ') : 'koi nahi';
          el.querySelector('.mrk-note').textContent = `Har box mein upar replica A ka hash, neeche B ka. Laal = alag. ${changed.size ? 'Comparison sirf laal raaste pe neeche gaya.' : 'Root same hai: ek hi compare mein pata chal gaya ki dono replicas same hain.'} Asli scale pe: 1 crore keys ka tree ~24 levels gehra; ek key alag ho to ~2 × 24 ≈ 48 hashes compare, 1 crore ki jagah.`;
        };
        upd();
      }},
      { type: 'list', items: [
        `<strong>Kahan:</strong> Amazon ke Dynamo paper (2007) mein har node apni har key range ke liye alag Merkle tree rakhta hai, aur replicas root se shuru karke sirf alag hisse sync karte hain. Cassandra ka "repair" bhi Merkle trees banake replicas compare karta hai.`,
        `Git (commits aur folders ke hashes), BitTorrent/IPFS (file ke tukde verify), aur blockchains bhi isi idea pe hain.`,
        `<strong>Keemat:</strong> tree banana aur keys badalne pe hashes update karna CPU aur disk ka kaam hai. Bahut zyada writes wale system mein tree baar baar purana ho jaata hai, isliye aksar ise repair ke time pe banate hain.`,
      ]},

      { type: 'h2', text: 'Decide' },
      { type: 'callout', tone: 'why', title: 'Decide', html: `• Mehenga lookup skip karna hai ("is URL ko crawler ne dekha?", "ye username liya hua hai?") → <strong>Bloom filter</strong> (delete bhi chahiye → <strong>cuckoo filter</strong>). Aakhri faisla hamesha source of truth se.<br>• "Kitne unique visitors/viewers?" → <strong>HyperLogLog</strong> (Redis PFADD/PFCOUNT, ~12 KB, ~0.81% galti).<br>• "Sabse zyada kaun?" stream mein → <strong>count-min sketch + heap</strong>.<br>• "Mere paas ke drivers/creators" → <strong>geohash ya H3</strong> cells (+ padosi cells), moving points ke liye Redis; static places ke liye quadtree/Elasticsearch/PostGIS bhi theek.<br>• Leaderboard / rank → <strong>Redis sorted set</strong> (skip list).<br>• Replicas ka background sync → <strong>Merkle tree</strong>.<br>• Exact jawab zaroori (paisa, billing, permissions) → in shortcuts ke bharose mat raho.` },

      { type: 'h2', text: 'Poori picture' },
      { type: 'diagram', title: 'xyz.com mein ye structures kahan baithe hain', height: 500,
        groups: [
          { label: 'Users', x: 10, y: 8, w: 700, h: 92 },
          { label: 'Services', x: 10, y: 124, w: 700, h: 92 },
          { label: 'Memory (RAM)', x: 10, y: 260, w: 700, h: 92 },
          { label: 'Storage', x: 10, y: 396, w: 700, h: 92 },
        ],
        nodes: [
          { id: 'users', label: 'Users / apps', sub: 'signup · views · nearby', x: 360, y: 58, w: 190, kind: 'client', info: 'Ye kya hai: xyz.com ke users ke phone aur browsers. Yahin se signup, video views, hashtags aur "paas kaun hai" ke sawaal aate hain.' },
          { id: 'api', label: 'App servers', sub: 'signup · views', x: 160, y: 180, kind: 'server', info: 'Ye kya hai: xyz.com ka main backend. Username check ke liye pehle Bloom filter, views ke liye Redis HLL, leaderboard ke liye sorted set.' },
          { id: 'loc', label: 'Location svc', sub: 'lat/lng → cell', x: 400, y: 180, kind: 'server', info: 'Ye kya hai: wo service jo location ko geohash/H3 cell mein badalti hai aur "paas kaun hai" ka jawab deti hai (cell + padosi cells).' },
          { id: 'trend', label: 'Trending job', sub: 'count-min + heap', x: 610, y: 180, kind: 'queue', info: 'Ye kya hai: stream padhne wala job (jaise Flink). Har hashtag count-min sketch mein jodta hai, aur ek chhote heap mein top-k rakhta hai.' },
          { id: 'bloom', label: 'Bloom filter', sub: 'ya cuckoo', x: 80, y: 316, w: 120, kind: 'cache', info: 'Ye kya hai: saare usernames ka bit array RAM mein. "Pakka nahi" = DB tak jaana hi nahi. Delete chahiye to cuckoo filter.' },
          { id: 'redis', label: 'Redis', sub: 'HLL · sorted set', x: 330, y: 316, kind: 'cache', info: 'Ye kya hai: in-memory store. HyperLogLog (~12 KB) se unique viewers, sorted set (skip list) se leaderboard aur rank, aur trending top-k.' },
          { id: 'geo', label: 'Geo index', sub: 'H3 / geohash cells', x: 540, y: 316, w: 150, kind: 'cache', info: 'Ye kya hai: cell ID → us cell ke drivers/creators. RAM mein, kyunki locations har kuch second badalti hain.' },
          { id: 'db', label: 'Users DB', sub: 'UNIQUE name', x: 80, y: 452, w: 120, kind: 'data', info: 'Ye kya hai: source of truth. Bloom filter "shayad hai" bole, ya filter purana ho, to aakhri faisla yahi UNIQUE constraint karta hai.' },
          { id: 'cass', label: 'Views store A', sub: 'Bloom per SSTable', x: 330, y: 452, w: 150, kind: 'data', info: 'Ye kya hai: views ka history store (Cassandra jaisa). Har disk file ke saath Bloom filter, taaki bekaar files padhni na padein.' },
          { id: 'rep', label: 'Replica B', sub: 'Merkle repair', x: 580, y: 452, w: 150, kind: 'data', info: 'Ye kya hai: same data ki doosri copy. Merkle tree se sirf alag hisse sync hote hain (anti-entropy).' },
        ],
        edges: [
          { a: 'users', b: 'api', n: 1, label: 'request' },
          { a: 'api', b: 'bloom', n: 2, label: 'naam check' },
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
          { name: 'Username check', text: 'App server pehle Bloom filter se poochhta hai. "Pakka nahi" = turant "available". "Shayad" pe hi Users DB se confirm.', go: ['users>api>bloom', 'api>db'] },
          { name: 'Unique views', text: 'Har view pe Redis HyperLogLog mein PFADD (duplicates apne aap ignore), aur event views store mein bhi.', go: ['users>api>redis', 'api>cass'] },
          { name: 'Nearby', text: 'Location cell ID ban ke geo index mein jaati hai. "Paas kaun?" = apna cell + padosi cells, phir asli doori se filter.', go: ['users>loc>geo'] },
          { name: 'Trending', text: 'Hashtags stream se count-min sketch + heap, top-k Redis mein, jahan se Trending page padhta hai.', go: ['users>trend>redis'] },
          { name: 'Replica sync', text: 'Replicas Merkle root compare karte hain, aur sirf alag shaakhaon mein neeche jaake wahi keys bhejte hain.', go: ['cass>rep'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Bloom filter: "pakka nahi" ya "shayad hai". False positive ho sakta hai, false negative nahi. ~9.6 bits per item pe 1% galti.</li>
        <li>Cuckoo filter: fingerprints + do possible buckets. Delete kar sakta hai, lekin table bharne pe insert fail.</li>
        <li>HyperLogLog: unique ginti ~12 KB mein, ~0.81% galti, merge ho sakta hai. List nahi deta.</li>
        <li>Count-min sketch: ginti ka "upar se" andaza, heavy hitters (trending) ke liye. Rare cheezon pe bharosa mat karo.</li>
        <li>Geo: 2D ko cell ID banao. Geohash (prefix), quadtree (ghanaapan ke hisaab se), S2 (sphere + Hilbert), H3 (hexagons). Hamesha padosi cells bhi dekho.</li>
        <li>Skip list: express lanes wali sorted list, O(log n). Redis sorted set ke andar.</li>
        <li>Merkle tree: root same = data same. Alag ho to sirf alag shaakha mein neeche jao.</li>
        <li>Aakhri faisla (paisa, unique naam, permissions) hamesha source of truth se.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Bloom/cuckoo: arabon items ka membership check ~10 bits per item mein', 'HLL: kisi bhi size ki unique ginti ~12 KB mein, merge bhi', 'Count-min: crores keys mein heavy hitters, fixed chhoti memory', 'Geo cells: 2D "nearby" query ek simple key/range lookup ban jaati hai', 'Skip list: sorted data + rank O(log n), simple code', 'Merkle: replicas ka diff, data ke size ke log jitne compares mein'],
        costs: ['Galti ka risk: false positives, ~1% count error, over-counting', 'Bloom filter se delete nahi, bhar jaaye to rebuild', 'HLL/count-min se asli items wapas nahi milte', 'Geo cells: border cases, hot cells, resolution chunna padta hai', 'Skip list: extra pointers ki memory', 'Merkle tree: banana/update karna mehenga, writes ke saath purana'],
      },
      { type: 'think', questions: [
        { q: 'Web crawler ke liye 1,000 crore (10 billion) URLs ka Bloom filter, 1% false positive. Kitni memory? Aur false positive ka asli nuksaan kya hai?', a: '~9.6 bits per URL × 10^10 = ~9.6 × 10^10 bits ≈ 12 GB. Ek bade server ki RAM mein aa jaata hai (ya kuch machines mein shard karo). False positive = ek naya URL galti se "dekha hua" maan ke skip ho gaya. Crawler ke liye ye chalta hai (1% naye pages miss), isliye Bloom filter yahan perfect hai. Username check jaise case mein DB se confirm karna padta hai.' },
        { q: 'Creator dashboard pe "is mahine ke unique viewers" chahiye, aur roz ke HLL pehle se hain. Kya poore mahine ka data dobara padhna padega?', a: 'Nahi. 30 daily HLLs ko PFMERGE karo (har register ka max). Result mahine ke unique viewers ka andaza hai, same ~0.81% galti ke saath. Lekin do HLLs ka intersection (dono din aane wale users) seedha accurate nahi nikalta; inclusion-exclusion se nikaalo to galti bahut badh jaati hai.' },
        { q: 'Geohash ke saath "2 km ke andar" query ke liye kaunsi precision?', a: 'Aisi precision chuno jiska cell search radius se thoda bada ho, phir apna cell + 8 padosi lo. 5 characters ≈ 4.9 km × 4.9 km, to 2 km radius ke liye 5 characters ke 9 cells kaafi hain, phir asli doori se filter. 6 characters (1.2 km × 0.6 km) pe 9 cells 2 km ko poora nahi dhakenge.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Bloom filter ne kaha "pakka nahi hai". Iska matlab?', options: ['Shayad nahi hai, DB check karo', 'Item sach mein nahi daala gaya (filter updated ho to)', 'Filter bhar gaya'], answer: 1, explain: 'Koi bit 0 hai, to item kabhi insert nahi hua. Bloom filter false negative nahi deta. "Shayad hai" pe hi confirm karna padta hai.' },
        { q: 'Bloom filter mein m bits fixed, n badhta ja raha hai. Kya hoga?', options: ['False positive rate badhega', 'False negatives aane lagenge', 'Kuch nahi badlega'], answer: 0, explain: '(1 − e^(−kn/m))^k: n badha to zyada bits 1, zyada false positives. Bada filter dobara banana padta hai.' },
        { q: 'Redis HyperLogLog ki memory aur standard error?', options: ['~12 KB, ~0.81%', 'n ke saath badhti hai, 0%', '1 MB, 5%'], answer: 0, explain: '16,384 registers × 6 bits = 12 KB, error 1.04/√16384 ≈ 0.81%.' },
        { q: 'Count-min sketch ka estimate asli count se...', options: ['Kabhi kam nahi hota, zyada ho sakta hai', 'Kabhi zyada nahi hota', 'Hamesha exact'], answer: 0, explain: 'Collisions counters ko sirf badhaate hain. Minimum lene se overcount kam hota hai, lekin khatam nahi.' },
        { q: 'H3 hexagons kyun use karta hai?', options: ['Hexagons mein exact parent-child fit hota hai', 'Har padosi centre se same doori pe hota hai', 'Hexagons kam memory lete hain'], answer: 1, explain: 'Square mein do tarah ke padosi (1 aur 1.41), hexagon mein saare 6 same doori pe. Parent-child exact nahi hota, wo H3 ki keemat hai.' },
        { q: 'Do replicas ke Merkle root hash same hain. Matlab?', options: ['Data same hai, sync ki zaroorat nahi', 'Leaves check karni padengi', 'Sirf aadha data same hai'], answer: 0, explain: 'Root saare leaves ke hashes se bana hai. Root same = (hash collision ko chhod ke) saara data same.' },
        { q: 'Cuckoo filter Bloom filter se kya extra kar sakta hai?', options: ['Exact count deta hai', 'Item delete kar sakta hai', 'Kabhi false positive nahi deta'], answer: 1, explain: 'Har item ka fingerprint do mein se ek bucket mein hota hai, to use dhoondh ke hata sakte hain. False positive phir bhi ho sakta hai (same fingerprint).' },
        { q: 'Quadtree geohash se kab behtar hai?', options: ['Jab points bahut tezi se hilte hon', 'Jab kuch jagah bahut ghani aur kuch khaali ho, aur points zyada na hilein', 'Jab data string prefix mein chahiye'], answer: 1, explain: 'Quadtree ghani jagah pe chhote cells banata hai. Lekin har move pe tree badalna mehenga, isliye moving drivers ke liye fixed grid (geohash/H3) aasaan.' },
        { q: 'S2 cells ko Hilbert curve ke order mein number kyun karta hai?', options: ['Paas ke cells ko paas ke numbers milein, area = kam ranges', 'Hexagon banane ke liye', 'Memory bachaane ke liye'], answer: 0, explain: 'Hilbert curve kabhi lamba kood nahi maarti. Isliye ek area ke cells kuch hi lagaataar ID ranges mein aa jaate hain.' },
        { q: 'Skip list mein search average kitne kadam leta hai?', options: ['O(n)', 'O(log n)', 'Hamesha 1'], answer: 1, explain: 'Upar ki lanes har level pe lagbhag aadhe items chhod deti hain. Widget mein 16 se 128 items pe kadam ~8 se ~10 hi hue.' },
      ]},
      { type: 'sources', note: 'Numbers aur defaults inhi sources se check kiye. H3 ka Uber post 2018 ka hai; library tab se aage badhi hai.', items: [
        { title: 'H3: Uber\'s Hexagonal Hierarchical Spatial Index', publisher: 'Uber Engineering blog', year: 2018, official: true, url: 'https://www.uber.com/blog/h3/', used: 'Hexagons kyun (ek hi neighbour distance), 16 resolutions, aperture 7, 122 base cells, 12 pentagons, surge pricing aur dispatch mein use.' },
        { title: 'H3 resolution table', publisher: 'h3geo.org docs', official: true, url: 'https://h3geo.org/docs/core-library/restable/', used: 'Resolution 7 se 10 tak ke average area aur edge length; 110 hexagons + 12 pentagons.' },
        { title: 'S2 cell hierarchy', publisher: 's2geometry.io', official: true, url: 'http://s2geometry.io/devguide/s2cell_hierarchy', used: 'Cube projection, 31 levels, Hilbert curve, 64-bit cell IDs, level 30 ≈ 1 cm.' },
        { title: 'HyperLogLog', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/', used: '12 KB memory, 0.81% standard error, PFADD/PFCOUNT/PFMERGE.' },
        { title: 'GEOADD (how it works)', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/commands/geoadd/', used: 'Geo data sorted set mein 52-bit geohash score, radius query ke liye 1 + 8 areas.' },
        { title: 'Geohash grid aggregation (cell dimensions table)', publisher: 'Elastic docs', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html', used: 'Geohash length vs cell size.' },
        { title: 'Bloom filters', publisher: 'Apache Cassandra docs', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/managing/operating/bloom_filters.html', used: 'SSTable read path mein Bloom filter, default fp chance 0.01 (LCS mein 0.1).' },
        { title: 'Cuckoo Filter: Practically Better Than Bloom (Fan, Andersen, Kaminsky, Mitzenmacher)', publisher: 'ACM CoNEXT paper', year: 2014, url: 'https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf', used: 'Fingerprints, do candidate buckets, delete support, ~3% se kam fp pe Bloom se kam space, ~95% load.' },
        { title: 'An Improved Data Stream Summary: The Count-Min Sketch (Cormode, Muthukrishnan)', publisher: 'Journal of Algorithms paper', year: 2005, url: 'https://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf', used: 'w = e/ε, d = ln(1/δ), estimate kabhi kam nahi.' },
        { title: 'Skip Lists: A Probabilistic Alternative to Balanced Trees (William Pugh)', publisher: 'Communications of the ACM paper', year: 1990, url: 'https://dl.acm.org/doi/10.1145/78973.78977', used: 'Sikke se levels, average O(log n) search/insert.' },
        { title: 'Redis sorted sets', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/sorted-sets/', used: 'Sorted set = skip list + hash table, ZADD/ZRANGE/ZRANK O(log n).' },
        { title: 'Cuckoo filter', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/probabilistic/cuckoo-filter/', used: 'CF.ADD, CF.EXISTS, CF.DEL aur delete support.' },
        { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP paper (Amazon)', year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Har key range ka Merkle tree aur anti-entropy sync.' },
      ]},
    ],
  });
})();
