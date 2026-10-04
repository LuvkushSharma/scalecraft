(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */
  // A fixed typing session: typo 'crik', two backspaces, then 'icket live score'. Seeded gaps.
  const TA_KEYS = (() => {
    const seq = 'crik<<icket live score';
    let s = 1234; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
    const out = []; let t = 0, txt = '';
    for (let i = 0; i < seq.length; i++) {
      const ch = seq[i];
      let gap = i === 0 ? 0 : 90 + Math.round(rnd() * 110);
      if (seq[i - 1] === ' ') gap += 450;
      if (ch === '<' && seq[i - 1] !== '<') gap += 350;
      t += gap;
      txt = ch === '<' ? txt.slice(0, -1) : txt + ch;
      out.push({ t, key: ch === '<' ? '⌫' : (ch === ' ' ? '␣' : ch), text: txt });
    }
    return out;
  })();
  // Debounce: a request is sent only when no new key arrives for `wait` ms.
  function taSim(wait, minLen, useCache) {
    const K = TA_KEYS, reqs = [], seen = new Set();
    let hits = 0;
    for (let i = 0; i < K.length; i++) {
      const next = K[i + 1];
      const fire = K[i].t + wait;
      if (wait > 0 && next && next.t < fire) continue;
      const q = K[i].text.trim();
      if (q.length < minLen) continue;
      if (useCache && seen.has(q)) { hits++; continue; }
      seen.add(q);
      reqs.push({ t: fire, q });
    }
    return { reqs, hits, keys: K.length, dur: K[K.length - 1].t };
  }
  // 4 queries for prefix "cr", counts for the last 7 days (index 6 = today).
  const TA_Q = [
    ['cricket', [1000, 1000, 1000, 1000, 1000, 1000, 1000]],
    ['cricket live score', [300, 300, 320, 350, 400, 1500, 2600]],
    ['crime patrol', [900, 900, 850, 850, 800, 800, 780]],
    ['crypto news', [700, 1400, 700, 650, 600, 600, 600]],
  ];
  function taScore(hl) {
    return TA_Q.map(([q, c]) => ({ q, s: c.reduce((a, n, i) => a + n * Math.pow(0.5, (6 - i) / hl), 0) }))
      .sort((a, b) => b.s - a.s);
  }

  // Live trie: queries + counts. Every node keeps the top-k of its subtree. Ties: alphabetical.
  const TA_TRIE = [['cricket', 900], ['crime patrol', 700], ['cricket live score', 650], ['car games', 600], ['cat videos', 550],
    ['crypto news', 500], ['crash course', 400], ['cricbuzz', 350], ['camera tips', 300], ['crystal maze', 200]];
  function taBuild(list, k) {
    const root = { kids: {}, end: null, top: [] }; let nodes = 1;
    list.forEach(([q, c]) => { let n = root; for (const ch of q) { if (!n.kids[ch]) { n.kids[ch] = { kids: {}, end: null, top: [] }; nodes++; } n = n.kids[ch]; } n.end = [q, c]; });
    const cmp = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
    const fill = n => { let all = n.end ? [n.end] : []; Object.values(n.kids).forEach(c => { all = all.concat(fill(c)); }); n.top = all.sort(cmp).slice(0, k); return n.top; };
    fill(root);
    return { root, nodes };
  }
  function taWalk(t, prefix) { const path = []; let n = t.root; for (const ch of prefix) { n = n.kids[ch]; if (!n) return { path, found: false }; path.push(n); } return { path, found: true }; }
  // When one query's count grows, how many of its prefix nodes get a new top-k list?
  function taChanged(list, k, q, delta) {
    const before = taBuild(list, k), after = taBuild(list.map(([x, c]) => [x, x === q ? c + delta : c]), k);
    const ch = [];
    for (let i = 1; i <= q.length; i++) { const p = q.slice(0, i); const a = taWalk(before, p).path.pop(), b = taWalk(after, p).path.pop();
      if (JSON.stringify(a.top.map(x => x[0])) !== JSON.stringify(b.top.map(x => x[0]))) ch.push(p); }
    return ch;
  }

  // Sharding: made-up traffic. Weight of the first letter (s, c, p most common), weight of the second letter.
  const TA_W1 = { a: 6, b: 6, c: 9, d: 6, e: 4, f: 4, g: 3, h: 4, i: 4, j: 1, k: 2, l: 3, m: 6, n: 2, o: 3, p: 8, q: 0.5, r: 5, s: 11, t: 6, u: 2, v: 2, w: 3, x: 0.2, y: 1, z: 0.5 };
  const TA_W2 = { a: 8, b: 1, c: 2, d: 1, e: 8, f: 1, g: 1, h: 4, i: 6, j: 0.2, k: 1, l: 4, m: 2, n: 3, o: 7, p: 2, q: 0.1, r: 5, s: 2, t: 3, u: 3, v: 1, w: 1, x: 0.2, y: 1, z: 0.2 };
  const TA_AB = 'abcdefghijklmnopqrstuvwxyz'.split('');
  function taHash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // mode: 'range' = alphabet split into pieces with equal letter counts; 'hash' = hash of the first 2 letters
  function taShard(n, mode) {
    const load = new Array(n).fill(0); let tot = 0;
    TA_AB.forEach((a, i) => TA_AB.forEach(b => {
      const t = TA_W1[a] * TA_W2[b]; tot += t;
      const sh = mode === 'range' ? Math.min(n - 1, Math.floor(i * n / 26)) : taHash(a + b) % n;
      load[sh] += t;
    }));
    return load.map(x => x / tot);
  }
  function taRangeName(n, k) { const a = Math.ceil(k * 26 / n), b = Math.ceil((k + 1) * 26 / n) - 1; return TA_AB[a] + '-' + TA_AB[b]; }

  Lesson.register({
    id: 'design-typeahead',
    title: 'Search autocomplete',
    minutes: 32,
    summary: `Type "cri" in the xyz.com search box and "cricket live score" should appear, on every keystroke, faster than a blink. We build it from zero: what a prefix is, what a trie is, why every node stores its top-k, offline rebuilds from query logs, debouncing, browser and CDN caching, personalisation, filtering and sharding the trie.`,
    _test: { TA_KEYS, taSim, taScore, TA_TRIE, taBuild, taWalk, taChanged, taShard, taRangeName },
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You type "cri" on YouTube or Google, and "cricket live score" appears below right away.<br>On every letter, your phone asks a server: "of the questions that start with 'cri', which are the most popular?"<br>Crores of people ask this at the same time, on every letter. And the answer must come within 0.1 seconds, or you will have typed further already.<br>This lesson has two tricks: <strong>keep the answer ready in advance</strong> (so the server does not have to think), and <strong>ask as little as possible</strong> (not on every letter, only when you pause).` },
      { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: crores of users, and every user asks the server on every keystroke "what should I suggest for this prefix?" Where will the answer come from, how fast, and how will "yesterday's trending topic" show up today? Then compare with this lesson.` },
      { type: 'p', html: `In the search lesson (<a href="#/search">Search and Elasticsearch</a>) we saw the idea of a trie. Here we will learn it again from zero, then build the whole system: where the data comes from, who builds it, who serves it, and how many requests cross the network. This is one of those systems where <strong>speed is the product</strong>: a late suggestion = a useless suggestion.` },
      { type: 'callout', tone: 'term', title: 'New word: Typeahead / autocomplete', html: `<strong>What it is:</strong> while you type, <strong>suggestions</strong> for the full question keep appearing below the box. "Typeahead" and "autocomplete" are two names for the same thing.<br><strong>Why we need it:</strong> less typing, fewer spelling mistakes, and the user gets an idea of what people are looking for.<br><strong>Without it:</strong> the user must type the whole "cricket live score" by hand, which is slow and error-prone on a phone.` },
      { type: 'callout', tone: 'term', title: 'New words: prefix, keystroke, query', html: `<strong>Keystroke:</strong> pressing one key. Typing "cri" takes 3 keystrokes.<br><strong>Query:</strong> the full question the user searches for, like "cricket live score".<br><strong>Prefix:</strong> the <em>start</em> of a word. "c", "cr" and "cri" are all prefixes of "cricket". The whole job of autocomplete in one line: <em>take a prefix, return the most popular queries that start with it.</em>` },
      { type: 'callout', tone: 'term', title: 'New word: latency (and latency budget)', html: `<strong>What it is:</strong> the time from sending a request to getting the answer. <strong>Budget</strong> = the total time we have, which we split between network, server and cache.<br><strong>Why we need it:</strong> the roadmap asks for an answer in about ~50 ms on every keystroke. A user presses the next key in ~150-200 ms; a suggestion that arrives later belongs to an old prefix.<br><strong>Without it:</strong> suggestions lag, show up for the wrong prefix, and the feature feels useless.<br><strong>Example:</strong> Facebook wrote in 2010 that when their typeahead took more than 100 ms, suggestions fell behind the typing. (The post is old, but the idea of a latency budget is the same today.)` },

      { type: 'h2', text: 'Step 1: requirements' },
      { type: 'compare',
        left: { title: 'Functional', html: `• Top 5 query suggestions for every prefix (like "cri" → "cricket live score")<br>• Popular queries on top, ranked by what people really search<br>• Trending things show up quickly (the match is today, so today)<br>• Offensive or illegal suggestions never appear<br>• (Nice to have) slightly different by language, location and user<br><br><strong>Out of scope:</strong> the actual search results page, spelling correction` },
        right: { title: 'Non-functional', html: `• Keystroke to suggestion &lt; ~100 ms, ~10-20 ms inside the server (the roadmap target: ~50 ms)<br>• Very high QPS: many keystrokes per search<br>• High availability: autocomplete should never disappear completely<br>• Slightly old data is fine (eventual consistency OK): suggestions can be an hour old, trending ones minutes old` },
      },
      { type: 'callout', tone: 'term', title: 'New words: QPS, read-heavy, eventual consistency', html: `<strong>QPS</strong> (queries per second): how many requests reach the server every second.<br><strong>Read-heavy:</strong> the system reads far more than it writes. Here every keystroke is a read; new data is written once an hour.<br><strong>Eventual consistency:</strong> new data does not reach every place at once, but it gets there after a while. Here it means: a search that started trending this morning becomes a suggestion a few minutes or hours later, and that is fine.` },
      { type: 'callout', tone: 'why', title: 'The most important insight', html: `This system is <strong>read-heavy</strong>, and the reads <strong>do not need perfectly fresh data</strong>. So we do the expensive work (counting, ranking) <em>offline</em> (outside the user's request path, in the background, in advance), and the online path is left with only "look it up, send it back". The whole design stands on this one idea.` },
      { type: 'h2', text: 'Step 2: napkin maths' },
      { type: 'p', html: `We do not know the real numbers of xyz.com, so we use made-up "let us assume" numbers. Two questions: (1) how many requests will come every second? (2) how much memory do we need to keep all suggestions? "Prefix table" here means: next to every prefix, the list of its top suggestions (details in Step 4). Change the values and see how they affect the design:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Daily active users (millions)</label><input class="ta-n-u" type="number" value="50" min="1" step="1"></div>
            <div><label>Searches per user per day</label><input class="ta-n-s" type="number" value="5" min="1" step="1"></div>
            <div><label>Keystrokes per search</label><input class="ta-n-k" type="number" value="12" min="1" step="1"></div>
            <div><label>Keystrokes that become requests (%) <span class="ta-n-pv"></span></label><input class="ta-n-p" type="range" min="5" max="100" step="5" value="25"></div>
            <div><label>Distinct popular queries (millions)</label><input class="ta-n-q" type="number" value="10" min="1" step="1"></div>
            <div><label>Average query length (chars)</label><input class="ta-n-l" type="number" value="20" min="3" step="1"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Keystrokes/sec (avg)</span><strong class="ta-n-o1"></strong></div>
            <div class="stat"><span>Requests/sec (avg)</span><strong class="ta-n-o2"></strong></div>
            <div class="stat"><span>Requests/sec (peak ×3)</span><strong class="ta-n-o3"></strong></div>
            <div class="stat"><span>Prefix table, worst case</span><strong class="ta-n-o4"></strong></div>
          </div>
          <div class="calc-note ta-n-note"></div>`;
        const q = c => el.querySelector(c);
        const f = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString();
        const upd = () => {
          const v = c => Math.max(0, Number(q(c).value) || 0);
          const ks = v('.ta-n-u') * 1e6 * v('.ta-n-s') * v('.ta-n-k') / 1e5;
          const p = v('.ta-n-p') / 100;
          const prefixes = v('.ta-n-q') * 1e6 * v('.ta-n-l');
          const gb = prefixes * 100 / 1e9;
          q('.ta-n-pv').textContent = Math.round(p * 100) + '%';
          q('.ta-n-o1').textContent = f(ks) + '/s';
          q('.ta-n-o2').textContent = f(ks * p) + '/s';
          q('.ta-n-o3').textContent = f(ks * p * 3) + '/s';
          q('.ta-n-o4').textContent = gb.toFixed(0) + ' GB';
          q('.ta-n-note').textContent = `One day ≈ 10^5 seconds. Prefix table: one entry for every prefix of every query (up to ${f(prefixes)}), each entry ~100 bytes (prefix + 5 suggestion IDs + overhead). The real number is much smaller because prefixes like "cri" are shared by thousands of queries. Even so, this much data fits in the RAM of one big server: that is why "keep the whole index in memory" is practical.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `With the default values: ~30k keystrokes/sec, and if only 25% of keystrokes become requests (thanks to debouncing and caching, coming later) then ~7.5k requests/sec on average and ~22k at peak. Two conclusions: (1) a database query on every request would be expensive, so the data must be in RAM; (2) cutting requests on the client side (debounce) directly cuts the server bill.` },

      { type: 'h2', text: 'Step 3: API and data' },
      { type: 'code', text: `
GET /suggest?q=cri&lang=hi&region=IN
  →  200 OK
     Cache-Control: public, max-age=300
     { "q": "cri",
       "suggestions": ["cricket live score", "cricket", "crime patrol",
                       "cricket highlights", "crime news"] }` },
      { type: 'p', html: `This is a simple HTTP GET: the browser sends the prefix (<code>q=cri</code>) along with language and region, and 5 suggestions come back.` },
      { type: 'callout', tone: 'term', title: 'New word: Cache-Control: max-age', html: `<strong>What it is:</strong> a header (a small label) on the response that says "you may keep a copy of this answer for this many seconds". <code>public, max-age=300</code> = anyone (browser, CDN) may keep it for 5 minutes and give it out again.<br><strong>Why we need it:</strong> the answer for "cr" is the same for everyone. Build it once, then for 5 minutes thousands of people get the copy and the request never reaches the server.<br><strong>Without it:</strong> every keystroke goes straight to our servers, and the load grows many times.` },
      { type: 'p', html: `There are two kinds of data, and they do completely different jobs:` },
      { type: 'table', head: ['Data', 'What it is', 'Who writes it', 'Who reads it'], rows: [
        ['<strong>Query log</strong>', 'A record of every search: query, time, language, region (user ID usually removed)', 'Search service, one event per search', 'Only the offline build job'],
        ['<strong>Suggestion index</strong>', 'prefix → top-k queries (ranked list)', 'Only the offline build job', 'Suggest service, on every keystroke'],
      ]},
      { type: 'callout', tone: 'term', title: 'New word: Query log', html: `<strong>What it is:</strong> a long diary of everything people searched. Every search = one line (event): what was searched, when, in which language.<br><strong>Why we need it:</strong> the suggestions come from here. Google said in its 2020 post that its predictions are based on real searches, both common and trending.<br><strong>Without it:</strong> we would not know what people look for; suggestions would have to be written by hand.<br>Logs usually go into an event stream like <a href="#/kafka">Kafka</a> (a long line where events keep getting added and are not erased), and from there into object storage (cheap, large file storage like S3).` },
      { type: 'callout', tone: 'term', title: 'New word: Top-k', html: `<strong>What it is:</strong> the top <strong>k</strong> items of a list. Here k = 5.<br><strong>Why we need it:</strong> lakhs of queries start with "c", but the screen shows only 5. We need only the best 5.<br><strong>Without it:</strong> we would send all lakhs of queries and let the browser sort them: wasted network and time.` },
      { type: 'h2', text: 'Step 4: the core idea, how to get top-k for a prefix fast?' },
      { type: 'h3', text: 'First try: a database query' },
      { type: 'code', text: `SELECT query FROM query_counts
WHERE query LIKE 'cri%'
ORDER BY count DESC LIMIT 5;` },
      { type: 'p', html: `This works on small data. But with 10M queries: the index finds all rows starting with "cri" (maybe lakhs), and then they must be sorted by count. The shorter the prefix ("c"), the more rows. And this happens on every keystroke, ~20k times per second. The database CPU runs out and latency goes past 100 ms. <strong>The mistake is recalculating the ranking on every request.</strong>` },
      { type: 'h3', text: 'Second try: a trie' },
      { type: 'p', html: `Think of a thick dictionary. To find "cri" you do not read the whole book: first you open the "C" section, inside it the "Cr" pages, then "Cri". With every letter, the place to search gets smaller. A trie builds this same idea in the computer's memory.` },
      { type: 'callout', tone: 'term', title: 'New word: Trie (prefix tree)', html: `<strong>What it is:</strong> a tree (a data structure shaped like a tree) where every step is one letter. Start at the root and go "c", then "r", then "i": below the node you reach, every query starts with "cri". The "cri" part of "cricket" and "crime" is stored only once; both share it.<br><strong>Why we need it:</strong> reaching a prefix takes only as many steps as it has letters (3 letters = 3 steps), even with crores of queries.<br><strong>Without it:</strong> every time we would have to filter "cri..." out of lakhs of rows (the database try above).<br>The name comes from "re<strong>trie</strong>val". For more detail you can also play with the trie widget in the <a href="#/search">Search lesson</a>.` },
      { type: 'p', html: `Reaching the prefix is now fast. But one problem is left: we are at the "cri" node, so who are the top 5? For that we would still have to walk the whole subtree (everything below that node), look at the counts of all queries, and sort them. The subtree of "c" has crores of nodes. On every keystroke this is slow again.` },
      { type: 'h3', text: 'The real trick: store the top-k at every node in advance' },
      { type: 'p', html: `During the offline build, <strong>save</strong> the list of the top 5 queries of each node's subtree at that node. Now a lookup = walk as many steps as the prefix has characters, and pick up the list stored there. All the ranking work is already done.` },
      { type: 'ascii', text: `
            (root)
              │ c
            [c]  top: cricket, crime patrol, cricket live score, crypto news, ...
              │ r
            [cr] top: cricket, crime patrol, cricket live score, crypto news, ...
           ┌──┴───────┐
         i │          │ y
     [cri] top:     [cry] top: crypto news, crying meme, ...
     cricket,
     crime patrol,
     cricket live score, ...

  lookup("cri") = 3 steps + list read.  Same cost however many queries exist.`, caption: 'Every node already stores the top-k list of its subtree' },
      { type: 'p', html: `The cost: more memory (5 entries at every node) and expensive updates (when one query's count changes, the lists of all its prefix nodes may change). But we already decided that suggestions do not need to be fresh second by second. So do the updates in a <strong>batch</strong>, offline, once an hour or once a day. This trade fits perfectly.` },
      { type: 'p', html: `Build it and see. Below is a small trie of 10 queries (each with "how many times it was searched"; made-up numbers). Every node already stores its top 3. Type a prefix and see how many steps the lookup takes. Then add searches to a query and see <strong>how many nodes had to change their list</strong>: that is the cost of an update.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Type a prefix</label><input class="ta-t-in" type="text" value="cri" maxlength="20" autocomplete="off"></div>
            <div><label>Add searches</label><div style="display:flex;gap:6px;flex-wrap:wrap"><select class="ta-t-q" style="flex:1;min-width:140px"></select><select class="ta-t-d"><option>100</option><option selected>300</option><option>600</option></select><button class="btn small primary ta-t-go" type="button">+ searches</button><button class="btn small ghost ta-t-rs" type="button">Reset</button></div></div>
          </div>
          <div class="ta-t-path" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
          <div class="calc-note ta-t-kids"></div>
          <div class="stats">
            <div class="stat"><span>Lookup steps</span><strong class="ta-t-s1"></strong></div>
            <div class="stat"><span>Trie nodes</span><strong class="ta-t-s2"></strong></div>
            <div class="stat"><span>Lists changed by last update</span><strong class="ta-t-s3">0</strong></div>
          </div>
          <div class="calc-note ta-t-note"></div>`;
        const q = c => el.querySelector(c);
        let list = TA_TRIE.map(x => x.slice()), last = null;
        q('.ta-t-q').innerHTML = TA_TRIE.map(x => `<option>${x[0]}</option>`).join('');
        const card = (label, top, on, changed) => `<div style="border:1px solid ${on ? 'var(--accent)' : 'var(--line-2)'};background:${changed ? 'var(--accent-soft)' : 'var(--surface)'};border-radius:var(--r-sm);padding:6px 8px;min-width:130px;flex:1 1 130px;max-width:220px">
            <div style="font-family:var(--f-mono);font-weight:700">${label}</div>
            ${top.map(([x, c]) => `<div style="font-size:12px;color:var(--ink-2)">${x} <span style="color:var(--ink-3)">${c}</span></div>`).join('')}</div>`;
        const draw = () => {
          const t = taBuild(list, 3), pre = q('.ta-t-in').value.toLowerCase();
          const w = taWalk(t, pre), chg = new Set(last ? last.ch : []);
          let html = card('(root)', t.root.top, !pre, false);
          w.path.forEach((n, i) => { const pp = pre.slice(0, i + 1); html += card('"' + pp + '"', n.top, i === w.path.length - 1, chg.has(pp)); });
          if (!w.found) html += `<div style="align-self:center;color:var(--red)">"${pre.slice(0, w.path.length + 1)}": the path ends here, no suggestions</div>`;
          q('.ta-t-path').innerHTML = html;
          const end = w.found ? (w.path.length ? w.path[w.path.length - 1] : t.root) : null;
          q('.ta-t-kids').textContent = end ? 'Possible next letters: ' + (Object.keys(end.kids).map(c => c === ' ' ? '␣' : c).join(' ') || '(none, the query ends here)') : '';
          q('.ta-t-s1').textContent = w.path.length + (w.found ? '' : ' (miss)');
          q('.ta-t-s2').textContent = t.nodes;
          q('.ta-t-s3').textContent = last ? last.ch.length : 0;
          q('.ta-t-note').textContent = last ? `"${last.q}" got +${last.d} searches. Lists that changed: ${last.ch.length ? last.ch.map(x => '"' + x + '"').join(', ') : 'none (the top 3 did not change)'}. In a live system this would happen on every search, so we do it in an offline batch instead.` : 'Each node card already shows the top 3 for that prefix. Lookup = just as many steps as letters, then read the list. No sorting.';
        };
        q('.ta-t-in').addEventListener('input', () => { last = null; draw(); });
        q('.ta-t-go').addEventListener('click', () => {
          const qq = q('.ta-t-q').value, d = Number(q('.ta-t-d').value);
          last = { q: qq, d, ch: taChanged(list, 3, qq, d) };
          list = list.map(([x, c]) => [x, x === qq ? c + d : c]);
          q('.ta-t-in').value = qq.slice(0, 3); draw();
        });
        q('.ta-t-rs').addEventListener('click', () => { list = TA_TRIE.map(x => x.slice()); last = null; q('.ta-t-in').value = 'cri'; draw(); });
        draw();
      }},
      { type: 'p', html: `Try this: give "crash course" +300 (400 → 700). The lists of "c" and "cr" change, because it enters the top 3 there. Give it +100 and no list changes. And give "cricket live score" +300 (650 → 950): it overtakes "cricket" (900), so <strong>7 nodes</strong>, from "c" to "cricket", must change their lists. One search, 7 writes. That is why we do not do this live on every search.` },
      { type: 'compare',
        left: { title: 'Trie (in-memory)', html: `• Prefix sharing saves memory<br>• Prefix walk + top-k in one structure<br>• Needs a custom server that keeps the trie in RAM<br>• In production, often a compact (less memory) form: an FST (finite state transducer), which shares word <em>endings</em> as well as prefixes. The Elasticsearch completion suggester uses this kind of in-memory structure.` },
        right: { title: 'Flat prefix table (KV)', html: `• Every prefix is one key: <code>"cri" → [list]</code><br>• Redis or any KV store (key-value store: a big dictionary that returns the value for a key) can serve it directly<br>• More memory (every prefix stored as a full string)<br>• Very simple: the build job writes keys, the server just does GET. This is also a perfectly valid interview answer.` },
      },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"We will just do count++ in the trie on every search." No! Every search would have to update the top-k list of <em>every</em> prefix node of that query, at 20k writes/sec, while reads are also running. Locks and contention fights begin. Keep the serving path <strong>read-only</strong>; do the counting in a separate offline pipeline.` },
      { type: 'h2', text: 'Step 5: high-level design, serving path' },
      { type: 'p', html: `The system has two parts that never wait for each other: the <strong>serving path</strong> (answering every keystroke, in milliseconds) and the <strong>build path</strong> (building a new trie from the logs, offline, over hours). First we build the serving path from zero, one problem and one fix at a time:` },
      { type: 'steps', items: [
        { t: 'v0: one server + database', d: 'The SQL query above on every keystroke. Works on small data; with crores of queries the database CPU runs out. Problem: ranking on every request.' },
        { t: 'v1: trie in RAM', d: 'One server with the whole trie in its memory (RAM), top-k at every node. Lookup ~1 ms. Problem: one server cannot handle ~20k requests/sec, and if it dies everything is gone.' },
        { t: 'v2: many copies + load balancer', d: 'Many copies (replicas) of the trie on different machines, with a load balancer in front that spreads the requests. Problem: every keystroke still crosses the network.' },
        { t: 'v3: browser debounce + cache', d: 'The browser asks only when the user pauses, not on every letter, and remembers earlier answers. ~80% fewer requests (numbers in Deep dive 1).' },
        { t: 'v4: CDN edge', d: 'Short prefixes like "c" and "cr" are the same for everyone: keep their answers on a CDN near the user\'s city. Most traffic never reaches our servers.' },
      ]},
      { type: 'callout', tone: 'term', title: 'New word: CDN edge', html: `<strong>What it is:</strong> a CDN (Content Delivery Network) = a network of cache servers placed in cities across the country. "Edge" = the server closest to you. (<a href="#/cdn">CDN lesson</a>)<br><strong>Why we need it:</strong> the answer for "cr" is the same for 10 lakh people in Delhi. The edge gets it once from our server, then serves everyone by itself for 5 minutes.<br><strong>Without it:</strong> every request travels all the way to our data center: more latency and many more servers.` },
      { type: 'callout', tone: 'term', title: 'New words: stateless service, load balancer, replica', html: `<strong>Stateless service:</strong> a server that keeps no user-specific memory. Any request can go to any copy.<br><strong>Load balancer (LB):</strong> a traffic police officer in front that spreads requests across all servers (<a href="#/load-balancer">LB lesson</a>).<br><strong>Replica:</strong> another copy of the same data, on another machine. If one dies, the other answers. Our trie is read-only (nobody writes to it while serving), so the copies always stay the same: no sync fights.<br><strong>Shard:</strong> one part of the data. If the trie does not fit on one machine, we split it into parts, each part on a different machine (details in Deep dive 3).` },
      { type: 'p', html: `Now run the whole serving path. Play each scenario, and click any box to read what it does:` },
      { type: 'flow', title: 'Serving path: from keystroke to suggestions', height: 330,
        nodes: [
          { id: 'c', label: 'Browser / app', sub: 'debounce + cache', x: 80, y: 165, w: 136, kind: 'client', info: 'What it is: the code of the search box in your browser or app. It does not send a request on every keystroke right away: it waits a little (debounce), and keeps answers for prefixes it asked before in memory. Facebook said in 2010 that as soon as you focused the search box, their browser code fetched and cached your friends, pages and groups in advance, so many suggestions appeared without the server.' },
          { id: 'cdn', label: 'CDN edge', sub: 'short prefixes', x: 250, y: 165, w: 124, kind: 'edge', info: 'What it is: the CDN cache server near the user\'s city. Crores of people type short prefixes like "c", "cr", "cri", and everyone (with the same language and region) gets the same answer, so caching them for a few minutes is very cheap. Personal suggestions are not cached here.' },
          { id: 'api', label: 'Suggest service', sub: 'stateless, behind LB', x: 430, y: 165, w: 156, kind: 'server', info: 'What it is: stateless servers behind the load balancer that take the browser\'s request. They send it to the right trie shard, use a timeout (say 20 ms), apply a last-second blocklist filter, and if needed blend in the user\'s recent searches.' },
          { id: 't1', label: 'Trie shard', sub: 'in RAM, read-only', x: 628, y: 80, w: 136, kind: 'cache', info: 'What it is: a machine that keeps the whole trie (or one part of it, a shard) in RAM, with top-k at every node. Read-only: only lookups, no writes. A new version comes from the offline build and is swapped in at once.' },
          { id: 't2', label: 'Trie replica', sub: 'same data', x: 628, y: 250, w: 136, kind: 'cache', info: 'What it is: another copy of the same trie, on another machine. Read-only data is easy to copy (no consistency fights), so replicas share the load and keep the service running when one machine dies.' },
        ],
        edges: [{ a: 'c', b: 'cdn' }, { a: 'cdn', b: 'api' }, { a: 'api', b: 't1' }, { a: 'api', b: 't2', id: 'at2' }],
        scenarios: [
          { name: 'Short prefix (CDN hit)', intro: 'The user typed "cr". Lakhs of people have typed this prefix today.', steps: [
            { title: 'Request after debounce', text: 'The user paused for a moment on "cr", so the browser sent a request.', go: 'c>cdn', msg: 'GET /suggest?q=cr&lang=hi&region=IN' },
            { title: 'HIT at the CDN', text: 'Someone else asked for this exact URL a few seconds ago, and the CDN has a copy (max-age=300). The request never reached our servers.', go: 'res:cdn>c', set: { api: { state: 'dim' }, t1: { state: 'dim' }, t2: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } }, msg: '200 OK  (from edge, ~10 ms)\n["cricket","crime patrol","cricket live score",...]' },
          ]},
          { name: 'Long prefix (trie)', steps: [
            { title: 'Rare prefix', text: 'Few people type "cricket li", so the CDN does not have it.', go: ['c>cdn', 'cdn>api'], after: { cdn: { state: 'miss', sub: 'MISS' } }, msg: 'GET /suggest?q=cricket%20li&lang=hi&region=IN' },
            { title: 'Trie lookup', text: 'The suggest service asked the shard. The shard walked 10 characters and returned the top-5 list stored there. No sorting, no database: ~1 ms.', go: ['api>t1', 'res:t1>api'], after: { t1: { state: 'hit' } }, msg: 'walk c-r-i-c-k-e-t-␣-l-i → top5 ready' },
            { title: 'Filter and return', text: 'Blocklist check (remove any suggestion that was banned a moment ago), then the response. The CDN also keeps it for a few minutes.', go: 'res:api>cdn>c', after: { cdn: { state: '', sub: 'stored' } }, msg: '["cricket live score","cricket live today",...]' },
          ]},
          { name: 'Backspace (browser cache)', intro: 'The user typed "crik", saw the typo, and pressed backspace: back to "cri".', steps: [
            { title: 'No network needed', text: 'Suggestions for "cri" arrived 1 second ago. The browser shows them from its own memory: 0 ms of network. That is why the client cache is the cheapest cache.', focus: ['c'], set: { cdn: { state: 'dim' }, api: { state: 'dim' }, t1: { state: 'dim' }, t2: { state: 'dim' } }, after: { c: { state: 'hit', sub: 'local HIT' } }, msg: 'cache["cri"] → ["cricket","crime patrol",...]' },
          ]},
          { name: 'Trie server down', steps: [
            { title: 'A shard went down', text: 'The primary trie machine crashed.', set: { t1: { state: 'down', sub: 'DOWN' } }, go: ['c>cdn', 'cdn>api', 'bad:api>t1'], msg: 'timeout after 20 ms' },
            { title: 'Ask the replica', text: 'After a short timeout the suggest service asks the replica. The data is read-only, so the replica gives exactly the same answer.', go: ['api>t2', 'res:t2>api', 'res:api>cdn>c'], after: { t2: { state: 'ok', sub: 'serving' } } },
            { title: 'What if both are down?', text: 'Return an empty list. The search box still works; the user can type the full query and press Enter. Autocomplete is a "nice to have" feature: when it fails, search must not fail. This is called <strong>graceful degradation</strong>.', set: { t2: { state: 'down', sub: 'DOWN' } }, go: 'res:api>cdn>c', msg: '200 OK  { "suggestions": [] }' },
          ]},
        ],
      },
      { type: 'h2', text: 'Step 6: build path, a new trie from the logs' },
      { type: 'p', html: `Now the offline part. Question: where do the counts and top-k lists inside the trie come from, and how do they get refreshed every day? The answer is a pipeline (a line of steps): "query logs → counting → ranking → trie → servers". In public posts, companies do not name all their internal tools for this; what you see below is the common industry approach. First, learn its parts:` },
      { type: 'callout', tone: 'term', title: 'New words: batch job, stream job', html: `<strong>Batch job:</strong> a program that reads a lot of stored data at once (for example all logs of the last 7 days), counts, and then finishes. It runs every hour or every night. Tools like Spark are made for this.<br><strong>Stream job:</strong> a program that runs all the time and counts events as they arrive, in small time windows (for example 15 minutes).<br><strong>Why both:</strong> batch is slow but gives a complete, clean result. Stream is fast but sees only the latest minutes. Batch alone = today's trending shows up tomorrow. Stream alone = expensive, and no long history.` },
      { type: 'callout', tone: 'term', title: 'New words: snapshot, atomic swap, rollback', html: `<strong>Snapshot:</strong> one complete, built trie in a file, with a version number (like v2041). It never changes.<br><strong>Atomic swap:</strong> the server loads the new trie into memory in the background, and when it is ready, switches to "use the new one now" in a single step. There is no half-old, half-new moment.<br><strong>Rollback:</strong> going back to the old version if the new one is bad.<br><strong>Without them:</strong> we would edit the live trie piece by piece, users would see a mix of old and new suggestions for a while, and there would be no way back after a mistake.` },
      { type: 'flow', title: 'Build path: a new index from query logs', height: 330,
        nodes: [
          { id: 's', label: 'Search service', sub: 'every search', x: 80, y: 70, w: 136, kind: 'server', info: 'What it is: the real search service of xyz.com. When the user presses Enter (or clicks a suggestion), it writes an event: query, time, language, region. This is the raw material autocomplete needs.' },
          { id: 'k', label: 'Query logs', sub: 'Kafka → S3', x: 80, y: 260, w: 136, kind: 'queue', info: 'What it is: the diary of every search. A stream of events (like Kafka) that is also stored in object storage (like S3). The batch job reads many days of data from here; the stream job reads only the latest minutes.' },
          { id: 'st', label: 'Trend stream', sub: 'last 15 min', x: 290, y: 70, w: 136, kind: 'server', info: 'What it is: a stream job that runs all the time, counts in small time windows (like 15 minutes), and catches sudden spikes (like "ipl final"). Its output is a small "trending overlay", not a full trie.' },
          { id: 'b', label: 'Batch job', sub: 'count + rank', x: 290, y: 260, w: 136, kind: 'server', info: 'What it is: a batch job like Spark, every hour or every day. It normalises queries (lowercase, remove extra spaces), counts them, applies time decay, and builds the top-k list for every prefix.' },
          { id: 'f', label: 'Filter + check', sub: 'blocklist, sanity', x: 470, y: 260, w: 136, kind: 'threat', info: 'What it is: the checkpoint before publishing. Two jobs. (1) Policy filter: remove abuse, violence, personal info and illegal content. (2) Sanity check: is the new index very different from the old one (size suddenly halved? lists of top prefixes completely changed?). If it fails, do not publish.' },
          { id: 'o', label: 'Snapshots', sub: 'versioned files', x: 640, y: 260, w: 120, kind: 'data', info: 'What it is: trie files kept in object storage (like S3). Every build is one versioned file (like v2041). If something goes wrong, rolling back to an old version is just changing a pointer.' },
          { id: 't', label: 'Trie servers', sub: 'load + swap', x: 640, y: 70, w: 120, kind: 'cache', info: 'What it is: the same serving machines (trie shards and replicas). The new snapshot loads into RAM in the background while the old one keeps serving. When loading is done, an atomic pointer swap: the next request uses the new trie. Users see no downtime.' },
        ],
        edges: [{ a: 's', b: 'k' }, { a: 'k', b: 'b' }, { a: 'b', b: 'f' }, { a: 'f', b: 'o' }, { a: 'o', b: 't' }, { a: 'k', b: 'st', id: 'kst' }, { a: 'st', b: 't', id: 'stt' }],
        scenarios: [
          { name: 'Daily rebuild', steps: [
            { title: 'Searches are logged', text: 'All day long, every search becomes an event.', flood: { paths: ['evt:s>k'], n: 6 }, msg: '{ q: "cricket live score", t: 1730000000, lang: "hi", region: "IN" }' },
            { title: 'The batch job counts', text: 'It read the logs of the last few days, normalised them, and counted. Old days get less weight (time decay), so old popular queries do not stay stuck at the top.', go: 'evt:k>b', msg: 'cricket live score → score 4514\ncricket → 3885 ...' },
            { title: 'Filter and sanity check', text: 'It applied the blocklist and compared the new index size and top prefixes with the old ones. All fine.', go: 'b>f', after: { f: { state: 'ok', sub: 'passed' } } },
            { title: 'New snapshot', text: 'The versioned file is published.', go: 'f>o', after: { o: { sub: 'v2041 ready' } }, msg: 'PUT s3://xyz-suggest/v2041.trie' },
            { title: 'Load and atomic swap', text: 'The trie servers loaded v2041 in the background, then did one pointer swap. They kept the old v2040 for a while, for rollback.', go: 'o>t', after: { t: { state: 'ok', sub: 'serving v2041' } } },
          ]},
          { name: 'Bad build', intro: 'A bot searched an offensive query lakhs of times overnight, or the job got a bug.', steps: [
            { title: 'Strange counts', text: 'The batch job pushed a new query to the top of the "c" prefix.', go: ['evt:k>b', 'b>f'], after: { b: { state: 'warn', sub: 'odd spike' } } },
            { title: 'Check fails', text: 'The sanity check caught it: the lists of top prefixes changed too much, and one entry matched a blocklist pattern. Build rejected, alert sent.', set: { f: { state: 'down', sub: 'REJECTED' } }, focus: ['f'] },
            { title: 'Users notice nothing', text: 'The snapshot was never published, and the servers kept serving yesterday\'s v2041. Showing day-old suggestions is better than showing a bad one.', set: { o: { state: 'dim' } }, after: { t: { state: 'ok', sub: 'still v2041' } } },
          ]},
          { name: 'Trending spike', intro: 'The IPL final started. The daily batch ran last night, so this is not in it yet.', steps: [
            { title: 'The stream job catches the spike', text: 'In 15 minutes, searches for "ipl final live" grew 50 times.', go: 'evt:k>st', after: { st: { state: 'hot', sub: 'spike!' } } },
            { title: 'A small overlay', text: 'The stream job sends only a small list of a few thousand trending queries to the trie servers. While building a result, the servers mix this overlay with the main list. No full trie rebuild.', go: 'evt:st>t', after: { t: { state: 'hot', sub: 'main + trending' } } },
            { title: 'Back to normal at night', text: 'The next batch rebuild counts this query by itself; the overlay is no longer needed. Two paths: one slow but complete (batch), one fast but small (stream). This combination is often called the <strong>Lambda architecture</strong>.', focus: ['b', 'st'] },
          ]},
        ],
      },
      { type: 'h2', text: 'Deep dive 1: debouncing, the cheapest request is the one never sent' },
      { type: 'p', html: `Problem: a fast typist presses 5-8 keys a second. A request on every key = as many requests as characters, and the user never even sees most of those answers (they have already typed the next character). That is wasted load on the server.` },
      { type: 'callout', tone: 'term', title: 'New word: Debounce', html: `<strong>What it is:</strong> "wait until the user stops typing". Every keystroke restarts a timer (say 200 ms). If the timer runs out, the user has paused, so send the request. When you type fast, the in-between requests are never sent.<br><strong>Why we need it:</strong> the user never sees the answers for in-between prefixes ("cric", "crick"); they have already moved on.<br><strong>Without it:</strong> one request per letter: server load and the bill grow many times, for no benefit.<br><br><strong>Throttle</strong> is a little different: "at most one request every 200 ms", whether the user pauses or not. Twitter's open-source typeahead.js library (2013) offered both for remote requests, with a default wait of 300 ms.` },
      { type: 'p', html: `Try it yourself. Type anything in the box; below it is the timeline of a fixed typing session (a typo, two backspaces, then "cricket live score"):` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Debounce wait: <strong class="ta-d-wv"></strong></label><input class="ta-d-w" type="range" min="0" max="600" step="50" value="200"></div>
            <div><label style="display:flex;gap:8px;align-items:center"><input class="ta-d-c" type="checkbox" checked style="width:auto"> Browser cache (do not ask for the same prefix again)</label>
              <label style="display:flex;gap:8px;align-items:center"><input class="ta-d-m" type="checkbox" style="width:auto"> Ask only after at least 2 characters</label></div>
          </div>
          <label>Type here yourself (live count)</label>
          <input class="ta-d-in" type="text" placeholder="type here..." autocomplete="off">
          <div class="stats">
            <div class="stat"><span>Your keystrokes</span><strong class="ta-d-lk">0</strong></div>
            <div class="stat"><span>Requests without debounce</span><strong class="ta-d-l0">0</strong></div>
            <div class="stat"><span>With debounce + settings</span><strong class="ta-d-l1">0</strong></div>
          </div>
          <div style="margin-top:14px;font-weight:600">Timeline of the fixed session</div>
          <svg class="ta-d-svg" viewBox="0 0 480 130" style="width:100%;height:auto;display:block"></svg>
          <div class="stats">
            <div class="stat"><span>Keystrokes</span><strong class="ta-d-k"></strong></div>
            <div class="stat"><span>Requests</span><strong class="ta-d-r"></strong></div>
            <div class="stat"><span>Saved by cache</span><strong class="ta-d-h"></strong></div>
            <div class="stat"><span>Extra wait</span><strong class="ta-d-x"></strong></div>
          </div>
          <div class="calc-note ta-d-note" style="font-family:var(--f-mono)"></div>`;
        const q = c => el.querySelector(c);
        const NS = 'http://www.w3.org/2000/svg';
        const draw = () => {
          const wait = Number(q('.ta-d-w').value), cache = q('.ta-d-c').checked, minLen = q('.ta-d-m').checked ? 2 : 1;
          q('.ta-d-wv').textContent = wait + ' ms';
          const r = taSim(wait, minLen, cache);
          const span = r.dur + 700, X = t => 20 + t / span * 440;
          const svg = q('.ta-d-svg'); svg.innerHTML = '';
          const mk = (tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
          mk('text', { x: 20, y: 14, 'font-size': 12, fill: 'var(--ink-3)' }, 'keystrokes');
          mk('text', { x: 20, y: 84, 'font-size': 12, fill: 'var(--ink-3)' }, 'requests');
          mk('line', { x1: 20, y1: 60, x2: 460, y2: 60, stroke: 'var(--line-2)' });
          TA_KEYS.forEach(k => {
            mk('line', { x1: X(k.t), y1: 22, x2: X(k.t), y2: 46, stroke: 'var(--ink-3)' });
            mk('text', { x: X(k.t), y: 56, 'font-size': 12, 'text-anchor': 'middle', fill: 'var(--ink-2)', 'font-family': 'var(--f-mono)' }, k.key);
          });
          r.reqs.forEach(x => mk('circle', { cx: X(x.t), cy: 100, r: 6, fill: 'var(--accent)' }));
          mk('text', { x: 460, y: 124, 'font-size': 12, 'text-anchor': 'end', fill: 'var(--ink-3)' }, 'time → (' + (span / 1000).toFixed(1) + ' s)');
          q('.ta-d-k').textContent = r.keys;
          q('.ta-d-r').textContent = r.reqs.length;
          q('.ta-d-h').textContent = r.hits;
          q('.ta-d-x').textContent = '+' + wait + ' ms';
          q('.ta-d-note').textContent = 'The server was asked for these prefixes: ' + (r.reqs.map(x => '"' + x.q + '"').join(', ') || '(none)');
        };
        // live typing: real timers
        let lk = 0, l0 = 0, l1 = 0, timer = null; const seen = new Set();
        q('.ta-d-in').addEventListener('input', e => {
          lk++; l0++;
          q('.ta-d-lk').textContent = lk; q('.ta-d-l0').textContent = l0;
          clearTimeout(timer);
          const wait = Number(q('.ta-d-w').value), cache = q('.ta-d-c').checked, minLen = q('.ta-d-m').checked ? 2 : 1;
          const fire = () => { const v = e.target.value.trim(); if (v.length < minLen) return; if (cache && seen.has(v)) return; seen.add(v); l1++; q('.ta-d-l1').textContent = l1; };
          if (wait === 0) fire(); else timer = setTimeout(fire, wait);
        });
        ['.ta-d-w', '.ta-d-c', '.ta-d-m'].forEach(c => q(c).addEventListener('input', draw));
        ['.ta-d-c', '.ta-d-m'].forEach(c => q(c).addEventListener('change', draw));
        draw();
      }},
      { type: 'p', html: `The fixed session has 22 keystrokes. Debounce 0 and cache off: <strong>22 requests</strong>. Turn on only the browser cache: 17 (after the backspaces, "cri" and "cr" are not asked again). 150 ms debounce: 7. 200-300 ms debounce: only <strong>4 requests</strong>, exactly at the pauses where the user stopped ("crik", "cricket", "cricket live", "cricket live score"). That is ~80% less load.` },
      { type: 'p', html: `Look at the cost too: every suggestion now arrives at least "wait" ms later. A very long wait (500+ ms) makes the system feel slow; a very short one saves nothing. It is usually kept between 100 and 300 ms, and for short prefixes the CDN and browser cache win back the lost time.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: an old answer on top of a new one', html: `The user typed "cri" after "cr". Both requests went out, but on the network the answer for "cr" arrived <em>later</em>. If the client simply shows whatever arrives, the user sees suggestions for "cr" after typing "cri". Fix: remember the query (or a sequence number) with each request, and show only the response that matches the <strong>current text</strong>; cancel old requests that are still in flight.` },
      { type: 'h2', text: 'Deep dive 2: three layers of caching' },
      { type: 'p', html: `Short prefixes have a special property: there are very few of them (one letter = 26, two letters = 676 Latin combinations), but they get the most traffic, because every search starts with them. That makes them perfect for caching.` },
      { type: 'table', head: ['Layer', 'What is cached', 'For how long', 'Watch out'], rows: [
        ['<strong>Browser / app memory</strong>', 'Answers for prefixes asked in this session', 'The whole session or a few minutes', '0 ms on backspace and retyping. Facebook (2010) also loaded the user\'s own friends and pages into this layer in advance.'],
        ['<strong>CDN edge</strong> (<a href="#/cdn">CDN lesson</a>)', 'Non-personal answers, URL = prefix + language + region', 'Minutes (for example max-age=300)', 'Always put language and region in the cache key, or a Hindi user gets Tamil suggestions. Personal results never go on the CDN.'],
        ['<strong>Server memory</strong>', 'The whole trie or prefix table in RAM', 'Until the next build', 'This is not a "cache"; it is the real serving copy. That is why the serving path needs no database at all.'],
      ]},
      { type: 'callout', tone: 'warn', title: 'Caches and "remove it now"', html: `If a suggestion turns out wrong or harmful and must go right now, its copies in the CDN and in browsers can live until max-age runs out. So keep the TTL (how long a copy lives) short (minutes), keep a CDN purge (telling the CDN to delete a copy at once) ready, and check a small "kill list" on the serving path that does not wait for the build.` },

      { type: 'h2', text: 'Deep dive 3: what if the index gets too big?' },
      { type: 'p', html: `The napkin maths showed that the index for one language is a few GB, which fits in the RAM of one machine. So the first and simplest design: <strong>the whole index on every server</strong>, and just add replicas for more load. The data is read-only, so there is no trouble keeping replicas in sync.` },
      { type: 'p', html: `When the index grows bigger than one machine (many languages, or an index per region), use <a href="#/sharding">sharding</a>:` },
      { type: 'table', head: ['How to shard', 'Benefit', 'Problem'], rows: [
        ['By first letter (a-f, g-m, ...)', 'Easy to understand, one prefix = one shard', 'Hot shards: far more queries start with "s" and "c" than with "x". The load is uneven.'],
        ['Hash of the first 2-3 characters', 'Load is fairly even', 'Which shard answers a 1-letter prefix like "c"? Precompute it separately and keep it on every shard (or on the CDN).'],
        ['By language or region', 'A natural boundary, every index is smaller', 'If one region is very big, shard it again in one of the ways above'],
      ]},

      { type: 'p', html: `See for yourself how evenly the load is split. The traffic is made up for this example: like in English, many more words start with "s", "c" and "p" than with "x", "q" and "z". Change the number of shards and the method:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Shards: <strong class="ta-s-nv"></strong></label><input class="ta-s-n" type="range" min="2" max="8" step="1" value="4"></div>
            <div><label>Method</label><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="chip on ta-s-m" data-m="range" type="button">First letter (a-g, h-m...)</button><button class="chip ta-s-m" data-m="hash" type="button">Hash of first 2 letters</button></div></div>
          </div>
          <div class="ta-s-bars" style="margin-top:10px"></div>
          <div class="stats">
            <div class="stat"><span>Each shard if split evenly</span><strong class="ta-s-o1"></strong></div>
            <div class="stat"><span>Busiest shard</span><strong class="ta-s-o2"></strong></div>
            <div class="stat"><span>Busiest ÷ even</span><strong class="ta-s-o3"></strong></div>
          </div>
          <div class="calc-note ta-s-note"></div>`;
        const q = c => el.querySelector(c);
        let mode = 'range';
        const upd = () => {
          const n = Number(q('.ta-s-n').value), l = taShard(n, mode), mx = Math.max(...l);
          q('.ta-s-nv').textContent = n;
          q('.ta-s-bars').innerHTML = l.map((x, k) => `<div style="display:flex;gap:8px;align-items:center;margin:4px 0">
              <span style="width:92px;font-family:var(--f-mono);font-size:13px">${mode === 'range' ? 'S' + (k + 1) + ' ' + taRangeName(n, k) : 'S' + (k + 1)}</span>
              <span style="flex:1;height:14px;border-radius:7px;background:var(--surface-2);overflow:hidden"><span style="display:block;height:100%;width:${(x / mx * 100).toFixed(0)}%;background:${x === mx ? 'var(--amber)' : 'var(--accent)'}"></span></span>
              <span style="width:50px;text-align:right;font-family:var(--f-mono);font-size:13px">${(x * 100).toFixed(1)}%</span></div>`).join('');
          q('.ta-s-o1').textContent = (100 / n).toFixed(1) + '%';
          q('.ta-s-o2').textContent = (mx * 100).toFixed(1) + '%';
          q('.ta-s-o3').textContent = (mx * n).toFixed(2) + '×';
          q('.ta-s-note').textContent = mode === 'range' ? 'By first letter: the whole subtree of a prefix sits on one shard (simple). But the shards with "s" and "c" run hot, and the one with the last letters (u-z, x-z) is almost empty. You must buy machines for the busiest shard.' : 'By hash: "cr", "ca" and "sa" are spread over different shards, so the load is almost even. The cost: a 1-letter prefix ("c") is not on any single shard; build its list separately and copy it to every shard (or the CDN).';
        };
        q('.ta-s-n').addEventListener('input', upd);
        el.querySelectorAll('.ta-s-m').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.ta-s-m').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
        upd();
      }},
      { type: 'p', html: `With 4 shards and the first-letter method, the busiest shard (a-g, which holds "c" as well as "a", "b" and "d") takes ~37% of the traffic, while an even split would be 25%. That is ~1.5 times. With 8 shards it becomes ~2.1 times (a-d takes ~26% vs 12.5%). With the hash method the busiest shard is only ~1.02-1.13 times its fair share. Real systems often take a middle path: ranges, but cut by traffic (for example "c" alone on one shard, and "x-z" together on one), plus more replicas for hot shards.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "we must shard"', html: `In interviews people jump straight to "split the trie into 26 shards". First look at the napkin maths: the index for one language is a few GB and fits in one machine's RAM. Then you need no sharding, only <strong>replicas</strong> (for load). Shard only when the data does not fit on one machine.` },
      { type: 'h2', text: 'Deep dive 4: ranking, freshness, personalisation, filtering' },
      { type: 'h3', text: 'Ranking and freshness: time decay' },
      { type: 'p', html: `If you rank only by "total number of searches", old popular queries stay stuck at the top forever, and today's trending match sits below them. Google wrote in its 2020 post that its predictions look at both common and trending queries, and push fresh topics up when interest suddenly jumps. A simple method: give old days' counts less weight. <strong>Half-life</strong> = the number of days after which a search is worth half as much.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<label>Half-life: <strong class="ta-h-v"></strong></label>
          <input class="ta-h" type="range" min="0" max="6" step="1" value="3">
          <div class="ta-h-out" style="margin-top:10px"></div>
          <div class="calc-note ta-h-note"></div>`;
        const HL = [0.5, 1, 2, 3, 7, 30, 1000];
        const q = c => el.querySelector(c);
        const upd = () => {
          const hl = HL[Number(q('.ta-h').value)];
          q('.ta-h-v').textContent = hl >= 1000 ? 'no decay (plain 7-day total)' : hl + ' days';
          const r = taScore(hl), mx = r[0].s;
          q('.ta-h-out').innerHTML = r.map((x, i) => `<div style="display:flex;gap:10px;align-items:center;margin:6px 0;flex-wrap:wrap">
              <span style="width:22px;font-weight:700">${i + 1}.</span>
              <span style="min-width:150px;font-family:var(--f-mono)">${x.q}</span>
              <span style="flex:1;min-width:80px;height:12px;border-radius:6px;background:var(--surface-2);overflow:hidden"><span style="display:block;height:100%;width:${(x.s / mx * 100).toFixed(0)}%;background:${x.q === 'cricket live score' ? 'var(--amber)' : 'var(--accent)'}"></span></span>
              <span style="width:52px;text-align:right;font-family:var(--f-mono)">${Math.round(x.s)}</span></div>`).join('');
          q('.ta-h-note').textContent = 'Prefix "cr". Searches for "cricket live score" jumped in the last 2 days (a match is on). "cricket" gets a steady 1000 every day. Score = each day\'s count × 0.5^(days old / half-life).';
        };
        q('.ta-h').addEventListener('input', upd); upd();
      }},
      { type: 'p', html: `Move the slider. With a half-life of 3 days or less, the trending "cricket live score" is #1. With 7 days or more, the steady "cricket" is #1 again. And with no decay at all, even "crime patrol" moves above "cricket live score". There is no single "right" value: a news-type product wants a short half-life, a dictionary-type product a long one. It is a product decision that becomes one setting of the build job.` },
      { type: 'h3', text: 'Personalisation: not the same list for everyone' },
      { type: 'p', html: `There are two levels. <strong>Group level</strong>: language and location. An example from Google's 2020 post: the spelling "centre" in Canada and "center" in the US. This is simple: a separate index per language and region, and the same in the CDN cache key. <strong>User level</strong>: your own past searches. This cannot be cached on the CDN, and building a separate trie for every user is far too expensive.` },
      { type: 'callout', tone: 'term', title: 'New word: personalisation (blend)', html: `<strong>What it is:</strong> showing each user a slightly different list, based on their own past searches. <strong>Blend</strong> = mixing two lists into one.<br><strong>Why we need it:</strong> if you watch "crime patrol" every day, seeing it at the top for "cri" saves even more typing.<br><strong>Without it:</strong> everyone gets the same list; it works, just a bit less useful.<br><strong>Careful:</strong> the personal part cannot be cached on the CDN (it belongs only to you). So we keep it separate.` },
      { type: 'p', html: `The usual method: get the global top-k list from the server or CDN, get the user's recent searches separately (a small list in the browser or a per-user store), and <strong>blend</strong> them (for example, 1-2 of the top 5 spots for personal items). In 2012 LinkedIn wrote about its open-source library <strong>Cleo</strong>, which ran two kinds of typeahead: "generic" (same results for everyone, like companies or skills, by global popularity) and "network" (different for each member, filtered by their 1st and 2nd degree connections).` },
      { type: 'p', html: `See how the blend works. A global list (top 5, same for everyone, from the CDN) and the recent searches of a user called Riya (only in her browser). Rule: of the personal searches that match the prefix, at most 2 go on top; the rest of the spots come from the global list, with no duplicates:` },
      { type: 'custom', render(el) {
        const HIST = ['crime patrol 2024', 'cricket live score', 'camera tips night'];
        el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span>Prefix:</span>${['c', 'cr', 'cri', 'ca'].map((x, i) => `<button class="chip ta-p-c${i === 2 ? ' on' : ''}" data-p="${x}" type="button">${x}</button>`).join('')}
            <label style="display:flex;gap:6px;align-items:center;margin-left:8px"><input class="ta-p-on" type="checkbox" checked style="width:auto"> Personalisation on</label></div>
          <div class="row2" style="margin-top:10px"><div><div style="font-weight:600">Global (from CDN)</div><ol class="ta-p-g" style="margin:6px 0 0 18px;padding:0"></ol></div>
            <div><div style="font-weight:600">Riya's history (in her browser)</div><ul style="margin:6px 0 0 18px;padding:0">${HIST.map(x => `<li>${x}</li>`).join('')}</ul></div></div>
          <div style="font-weight:600;margin-top:10px">What Riya sees</div><ol class="ta-p-out" style="margin:6px 0 0 18px;padding:0"></ol>
          <div class="calc-note ta-p-note"></div>`;
        const q = c => el.querySelector(c), t = taBuild(TA_TRIE, 5);
        let pre = 'cri';
        const upd = () => {
          const w = taWalk(t, pre), g = w.found ? w.path[w.path.length - 1].top.map(x => x[0]) : [];
          const mine = q('.ta-p-on').checked ? HIST.filter(x => x.startsWith(pre)).slice(0, 2) : [];
          const out = mine.concat(g.filter(x => !mine.includes(x))).slice(0, 5);
          q('.ta-p-g').innerHTML = g.map(x => `<li>${x}</li>`).join('');
          q('.ta-p-out').innerHTML = out.map(x => `<li${mine.includes(x) ? ' style="color:var(--accent-ink);font-weight:700"' : ''}>${x}${mine.includes(x) ? ' (personal)' : ''}</li>`).join('');
          q('.ta-p-note').textContent = `${mine.length} personal + ${out.length - mine.length} global. The global part was cached on the CDN (same for everyone); the personal part came from Riya's browser and never reached the server.`;
        };
        el.querySelectorAll('.ta-p-c').forEach(b => b.addEventListener('click', () => { pre = b.dataset.p; el.querySelectorAll('.ta-p-c').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
        q('.ta-p-on').addEventListener('change', upd); upd();
      }},
      { type: 'h3', text: 'Filtering: what must never be shown' },
      { type: 'p', html: `Autocomplete "suggests" things on its own, so a bad suggestion becomes the company's own voice. According to Google's 2020 post, its automated systems block violent, sexually explicit, hateful or dangerous predictions, and enforcement teams remove by hand the ones that slip through. In system design this means filtering in three places:` },
      { type: 'steps', items: [
        { t: 'Build time', d: 'A blocklist and a classifier, so a bad query never enters the index. A query must be searched by at least a minimum number of different users (minimum threshold), so that a bot or someone\'s personal info (a phone number) cannot become a suggestion.' },
        { t: 'Serve-time kill list', d: 'A small list that can be updated in seconds. Remove a suggestion without waiting for the next rebuild.' },
        { t: 'Cache TTL', d: 'CDN and browser copies have a short TTL, so a removed item disappears quickly.' },
      ]},
      { type: 'h2', text: 'What real companies did' },
      { type: 'table', head: ['Company (year)', 'What they shared', 'Link to this lesson'], rows: [
        ['Facebook (2010)', 'The browser cached the user\'s friends, pages and groups in advance. On a cache miss: AJAX request → load balancer → web tier → an <strong>aggregator</strong> that asks many "leaf" services in parallel: a global service (pages, apps; not personal, so kept in memcached, a popular in-memory cache) and a graph service (the user\'s connections). Both did prefix matching. 100 ms budget. Before launch they ran a <em>dark test</em>: the old typeahead sent a query to the new system on every keystroke (real traffic, but users never saw the new results). They found network limits and changed the topology.', 'Browser cache, scatter-gather to leaf services, personal vs global split, latency budget'],
        ['LinkedIn Cleo (2012)', 'Many layers: browser cache, web tier, result aggregator, several typeahead backends. Inside: an inverted index of prefixes (prefix → list of documents that contain it), a small Bloom filter per document (fast reject), a forward index (to remove false positives), and a scorer. Real time: a new member or company was searchable at once.', 'Generic vs network (personal) typeahead; use of a Bloom filter (<a href="#/ds-for-scale">Bloom filter lesson</a>)'],
        ['Twitter typeahead.js (2013)', 'Open-source client library: prefetched data in the browser\'s localStorage (small permanent browser storage) with a default TTL of 1 day, and debounce/throttle on remote requests (default 300 ms).', 'Client-side debounce and browser cache'],
        ['Elasticsearch completion suggester (docs)', 'In-memory data structures for fast lookup that are costly to build; a weight with each suggestion; filter or boost by context (category, location); fuzzy (typo) support.', 'Ready-made option if you do not want to build your own trie'],
      ]},
      { type: 'p', html: `Note: the Facebook and LinkedIn posts are from 2010-2012, and the Twitter one is from 2013. These companies have probably changed their systems a lot since then. But the core ideas (browser cache, aggregator, precomputed ranking, debounce) are still the backbone of every interview answer.` },
      { type: 'h2', text: 'What can break' },
      { type: 'table', head: ['Failure', 'What happens', 'Protection'], rows: [
        ['Trie server crash', 'No suggestions for that shard\'s prefixes', 'Replicas, short timeout, empty list (graceful degradation)'],
        ['Build job fails or runs late', 'Suggestions get old', 'Keep serving the old snapshot; raise an alert. Old suggestions are fine.'],
        ['Bad build (bug or bot attack)', 'Wrong or offensive suggestions for everyone', 'Sanity checks, minimum distinct-users threshold, versioned snapshots + rollback'],
        ['Hot prefix ("c" during IPL)', 'Too much load on one shard or one key', 'CDN + browser cache, copy short prefixes to every shard'],
        ['Client without debounce (old app version)', 'Many times more requests', '<a href="#/rate-limiting">Rate limiting</a> on the server, let the CDN absorb it'],
        ['Out-of-order responses', 'Suggestions for an old prefix are shown', 'The client shows only the response that matches the current text'],
      ]},

      { type: 'h2', text: 'How to say it in an interview' },
      { type: 'steps', items: [
        { t: 'Requirements', d: 'Top 5 per prefix, ~100 ms end to end, read-heavy, slightly old data is fine, filtering is a must.' },
        { t: 'Core insight', d: 'Precompute the ranking offline; the online path only does a lookup. A trie (or a prefix → top-k table) in RAM, read-only.' },
        { t: 'Build path', d: 'Query logs (Kafka/S3) → batch job (count + decay + top-k) → filter + sanity checks → versioned snapshot → load + atomic swap. A small stream overlay for trending.' },
        { t: 'Serving path', d: 'Client debounce + cache → CDN (short prefixes, key has language and region) → stateless suggest service → trie replicas and shards.' },
        { t: 'Deep dives', d: 'Debounce numbers, hot prefixes, sharding choice, personalisation blend, kill list, empty list on failure.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `Whenever you see something like "ranking on every keystroke or every request", ask: <strong>can the answer be a little old?</strong> If yes, precompute the expensive work offline and keep only lookup + cache online (autocomplete, trending lists, recommendations). If no (like a bank balance), do not precompute; read from the source of truth. On the client, first cut the number of requests (debounce, cache), then scale the servers.` },

      { type: 'diagram', title: 'The whole design at a glance', height: 520,
        caption: 'Top: the path of every keystroke (milliseconds). Bottom: the offline path that builds a new trie from the logs (hours). Neither waits for the other. Use the buttons to see one path at a time, and click a box to read what it does.',
        groups: [
          { label: 'Serving path (every keystroke)', x: 10, y: 30, w: 700, h: 212 },
          { label: 'Build path (offline, new trie from logs)', x: 10, y: 262, w: 700, h: 240 },
        ],
        nodes: [
          { id: 'user', label: 'Browser / app', sub: 'debounce + cache', x: 90, y: 90, kind: 'client', info: 'What it is: the user\'s search box. It waits for a pause before asking (debounce), remembers earlier answers (0 ms on backspace), and blends the user\'s own recent searches with the global list.' },
          { id: 'cdn', label: 'CDN edge', sub: 'short prefixes', x: 270, y: 90, kind: 'edge', info: 'What it is: a cache server close to the user\'s city. The answer for short prefixes like "c" and "cr" is the same for everyone, so it keeps it for a few minutes (max-age) and answers by itself. Cache key = prefix + language + region.' },
          { id: 'api', label: 'Suggest service', sub: 'LB + stateless', x: 450, y: 90, kind: 'server', info: 'What it is: stateless servers behind a load balancer. They look up the right trie shard, use a short timeout, and filter with the kill list. If everything fails, they return an empty list (graceful degradation).' },
          { id: 'kill', label: 'Kill list', sub: 'remove now', x: 630, y: 90, kind: 'threat', info: 'What it is: a small list that can be updated in seconds. If a suggestion must go right now (wrong, harmful, someone\'s phone number), we do not wait for the next rebuild.' },
          { id: 'trie', label: 'Trie servers', sub: 'shards × replicas', x: 450, y: 200, w: 156, kind: 'cache', info: 'What it is: the trie kept in RAM, with top-k already stored at every node. Read-only, so replicas are easy. If the data is bigger than one machine, it is split into shards (by hash, or by traffic-based ranges). Lookup ~1 ms.' },
          { id: 'search', label: 'Search service', sub: 'on Enter', x: 90, y: 330, kind: 'server', info: 'What it is: the real search of xyz.com. On every search it writes an event: query, time, language, region. This is the raw material for autocomplete.' },
          { id: 'logs', label: 'Query logs', sub: 'Kafka → S3', x: 270, y: 330, kind: 'queue', info: 'What it is: the diary of every search, an event stream that is also saved in cheap storage. The batch job reads whole days from here; the stream job reads the latest minutes.' },
          { id: 'stream', label: 'Trend stream', sub: 'every 15 min', x: 450, y: 330, kind: 'server', info: 'What it is: a stream job that runs all the time. It catches sudden spikes ("ipl final live") and sends a small trending overlay to the trie servers.' },
          { id: 'batch', label: 'Batch job', sub: 'count + decay + top-k', x: 270, y: 460, w: 160, kind: 'server', info: 'What it is: a job that runs every night or every hour. It normalises queries, counts them, gives old days less weight (half-life), and builds the top-k list for every prefix.' },
          { id: 'check', label: 'Filter + checks', sub: 'blocklist, sanity', x: 450, y: 460, kind: 'threat', info: 'What it is: the checkpoint before publishing. It removes bad queries and queries searched by too few distinct users; if the new trie is very different from the old one, the build is rejected.' },
          { id: 'snap', label: 'Snapshots', sub: 'versioned files', x: 630, y: 460, kind: 'data', info: 'What it is: every build as a versioned trie file (v2041). Trie servers load it in the background and do an atomic swap; if something goes wrong, they roll back to the old version.' },
        ],
        edges: [
          { a: 'user', b: 'cdn', n: 1 }, { a: 'cdn', b: 'api', n: 2 },
          { a: 'api', b: 'trie', n: 3, label: 'lookup' }, { a: 'api', b: 'kill', dashed: true },
          { a: 'user', b: 'search', label: 'Enter', kind: 'evt' }, { a: 'search', b: 'logs', kind: 'evt' },
          { a: 'logs', b: 'batch', label: 'nightly', kind: 'evt' }, { a: 'logs', b: 'stream', kind: 'evt' },
          { a: 'batch', b: 'check' }, { a: 'check', b: 'snap' },
          { a: 'snap', b: 'trie', label: 'load + swap', via: [[630, 200]] }, { a: 'stream', b: 'trie', label: 'trending', kind: 'evt' },
        ],
        paths: [
          { name: 'Type a letter', text: 'The user paused on "cr" → browser cache miss → HIT at the CDN edge (someone else just asked). The request never reached our servers. About 10 ms.', go: ['user>cdn'] },
          { name: 'Long prefix', text: '"cricket li" → CDN miss → suggest service → a 10-step walk on a trie shard, top 5 already there → kill list filter → back, and the CDN keeps a copy.', go: ['user>cdn>api>trie', 'api>kill'] },
          { name: 'Rebuild index', text: 'Searches → query logs → nightly batch job (count, decay, top-k) → filter + sanity checks → new snapshot → trie servers load it and do an atomic swap.', go: ['user>search>logs>batch>check>snap>trie'] },
          { name: 'Trending spike', text: 'The match starts and searches jump 50 times. The stream job spots it within 15 minutes and sends a small overlay to the trie servers. No full rebuild.', go: ['search>logs>stream>trie'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Autocomplete = take a prefix, return the top-k most popular queries, within ~50-100 ms, on every keystroke.</li>
        <li>Do the expensive work (counting, ranking) offline. The online path only does a lookup: every trie node already stores its top-k.</li>
        <li>No live counting: one search can change the lists of many prefix nodes. So we use a batch rebuild + versioned snapshot + atomic swap.</li>
        <li>A small stream overlay handles trending searches; the nightly batch handles the rest.</li>
        <li>The cheapest request is the one never sent: debounce (~80% fewer) + browser cache + CDN (short prefixes, key includes language and region).</li>
        <li>A read-only trie makes replicas easy. Shard only when the data does not fit on one machine; first-letter ranges create hot shards.</li>
        <li>The personal part is never cached on the CDN: blend the global list with the user's own history.</li>
        <li>Filter in three places: at build time, with a serve-time kill list, and with a short cache TTL. If everything fails, return an empty list and search still works.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Lookup cost depends on prefix length, not on data size', 'Read-only index: easy replicas, no locking', 'Debounce + browser + CDN cache stop most requests before they reach a server', 'Versioned snapshots: rolling back a bad build is one pointer swap', 'If autocomplete fails, search still works (graceful degradation)'],
        costs: ['Suggestions are hours old (trending needs a separate stream path, which adds complexity)', 'Top-k on every node = more memory', 'Debounce makes every suggestion arrive a little later', 'Personalisation makes the CDN cache less useful', 'Filtering is never 100%: you still need a manual kill list and people'],
      },

      { type: 'think', questions: [
        { q: 'A new video "Dhoni retires" went up on xyz.com 10 minutes ago and people are searching for it like crazy. The daily batch ran last night. How will the suggestion appear?', a: 'The stream job (15-minute windows) will catch the spike and send a trending overlay to the trie servers. The servers blend the overlay with the main top-k list. The CDN TTL is short (minutes), so new answers reach users quickly. Tonight the batch adds it to the main index.' },
        { q: 'The product team wants suggestions to be "completely different for every user". What happens to CDN caching?', a: 'The personal part cannot be cached on the CDN. So split the response in two: a non-personal global list (CDN cacheable, key has language and region) and a small personal list (the user history, from the browser or a per-user store). The client or the suggest service blends them. This keeps the CDN benefit.' },
        { q: 'A celebrity phone number became a suggestion for some prefix. The next build is 20 hours away. What do you do?', a: 'Add it to the serve-time kill list right away (seconds). Purge the CDN or let the TTL run out. Add a pattern to the build filter (a phone-number regex) so it never comes back. A minimum distinct-users threshold blocks private things like this in the first place.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Why does every trie node store a top-k list in advance?', options: ['To save memory', 'So a lookup does not have to walk and sort the whole subtree', 'To make writes fast'], answer: 1, explain: 'With precomputed lists, a lookup = walk to the prefix + read the list. The cost: more memory and expensive updates, which is fine in an offline batch.' },
        { q: 'A user types "cricket" at 140 ms per key. With a 300 ms debounce, what happens to the middle prefixes ("cri", "cric"...)?', options: ['All of them are sent', 'Most middle requests are never sent, only one when the user pauses', 'The server rejects them'], answer: 1, explain: 'Every keystroke restarts the timer. Gaps of 140 ms are shorter than 300 ms, so a request goes out only when the user stops.' },
        { q: 'When you cache suggestions on a CDN, what must the cache key include?', options: ['The user ID', 'The prefix plus language and region', 'Only the prefix'], answer: 1, explain: 'The answer for the same prefix changes with language and region. A user ID would make the cache useless (every user is different); the personal part should not be on the CDN at all.' },
        { q: 'In a live trie, the count of "cricket live score" overtook "cricket". How many nodes need a new top-k list?', options: ['Only one, the "cricket live score" node', 'Every prefix node on its path (c, cr, cri ... cricket) where both were in the top-k', 'The whole trie'], answer: 1, explain: 'Each prefix node keeps the top-k of its subtree. When the order changes, all 7 nodes from c to cricket change. That is why counting is done offline in a batch, not live.' },
        { q: 'You split the trie into 8 shards by first letter (a-d, e-g...). What goes wrong?', options: ['Nothing', 'Hot shards: shards with letters like "s" and "c" get many times more traffic', 'Lookups become slow'], answer: 1, explain: 'Letters are not equally popular. In the widget, with 8 shards the busiest shard takes ~2.1 times its fair share. Use a hash or traffic-based ranges, and add replicas to hot shards.' },
        { q: 'A bug in the nightly build created strange suggestions. What is the best protection?', options: ['Turn off live writes on the trie servers', 'Sanity checks + versioned snapshots, and keep serving the old version if checks fail', 'Turn off the CDN'], answer: 1, explain: 'The build path and the serving path are separate. A failed check means nothing is published; servers keep running the old snapshot, and a rollback is one pointer swap if needed.' },
      ]},
      { type: 'sources', note: 'Company-specific parts come from these sources. The Facebook, LinkedIn and Twitter posts are from 2010-2013; their systems have probably changed since.', items: [
        { title: 'The Life of a Typeahead Query', publisher: 'Facebook Engineering (engineering.fb.com)', official: true, year: 2010, url: 'https://engineering.fb.com/2010/05/17/web/the-life-of-a-typeahead-query/', used: 'Browser cache with prefetched connections, aggregator + leaf services (global, graph), memcached for global results, 100 ms budget, dark testing per keystroke.' },
        { title: 'Cleo: the open source technology behind LinkedIn\'s typeahead search', publisher: 'LinkedIn Engineering', official: true, year: 2012, url: 'https://engineering.linkedin.com/open-source/cleo-open-source-technology-behind-linkedins-typeahead-search', used: 'Generic vs network typeahead, multi-layer architecture, inverted/forward index + per-document Bloom filter + scorer, real-time updates (read via search snippets and a summary; the original page now returns 404).' },
        { title: 'Designing typeahead search or autocomplete (summary of the Cleo post)', publisher: 'tianpan.co (secondary)', url: 'https://tianpan.co/notes/179-designing-typeahead-search-or-autocomplete', used: 'Cleo layer list and how the Bloom filter / forward index are used.' },
        { title: 'Bloodhound (typeahead.js suggestion engine) docs', publisher: 'Twitter, GitHub', official: true, year: 2013, url: 'https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md', used: 'Debounce/throttle option with 300 ms default, prefetch cached in localStorage with 1-day default TTL.' },
        { title: 'How Google autocomplete predictions work', publisher: 'Google (The Keyword blog)', official: true, year: 2020, url: 'https://blog.google/products/search/how-google-autocomplete-predictions-work/', used: 'Predictions from real searches, common + trending, language/location, freshness boost, automated + manual policy enforcement.' },
        { title: 'Suggesters / completion suggester', publisher: 'Elastic documentation', official: true, url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html', used: 'In-memory structures costly to build, weights, context suggester, fuzzy, skip_duplicates.' },
      ]},
    ],
  });
})();
