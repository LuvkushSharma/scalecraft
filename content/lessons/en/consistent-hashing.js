Lesson.register({
  id: 'consistent-hashing',
  title: 'Consistent hashing',
  minutes: 28,
  summary: `The simplest way to spread keys over servers is hash(key) % N. But as soon as you add one server, almost every key changes its place. Consistent hashing puts servers and keys on a round "ring", so when a server joins or leaves, only about 1/N of the keys move.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In the last lesson we split data over many machines. But the number of machines keeps changing: traffic grows so we add a machine, one breaks so we remove it.<br>With the simplest formula (<code>hash % N</code>), adding one machine makes <strong>almost all the data change its place</strong>. Like a new student joining a class and the teacher changing everyone's seat.<br>Consistent hashing is a clever way where, when a new student comes, only a few students near them shift, and everyone else stays in their seat.<br>In this lesson you will try it yourself on a round "clock" (a ring).` },
    { type: 'h2', text: 'Problem: one server added, cache empty' },
    { type: 'p', html: `xyz.com's Redis cache no longer fits in one machine. We set up 4 cache servers and used hash sharding like in the last lesson: compute the key's hash, divide by 4, the remainder = the server number.` },
    { type: 'code', text: `
server = hash("user:42") % 4      // 0, 1, 2 or 3
hash("user:42") = 1,234,567  →  1,234,567 % 4 = 3  →  Server 3` },
    { type: 'p', html: `Everything was running fine. On the day of the IPL final, traffic grew, so we added a 5th server. Now the formula became <code>% 5</code>. What happened?` },
    { type: 'code', text: `
                     % 4   % 5
hash = 1,234,567  →   3     2     (move!)
hash = 1,000,000  →   0     0     (stayed)
hash =   999,999  →   3     4     (move!)
hash =   500,002  →   2     2     (stayed)
hash =   777,777  →   1     2     (move!)` },
    { type: 'p', html: `A key stays in its place only when <code>hash % 4</code> and <code>hash % 5</code> come out the same. That happens only about 1 time in 5. So <strong>about 80% of keys changed server</strong>. For a cache this means: 80% of requests suddenly miss, all of them fall on the database, and right when traffic is at its peak. The server we added to help is the one that brought the site down.` },
    { type: 'callout', tone: 'why', title: 'General rule', html: `Going from N to N+1 servers with <code>hash % N</code>, only about <strong>1/(N+1)</strong> of keys stay in place, and the remaining ~<strong>N/(N+1)</strong> move. 4 → 5: 80% move. 9 → 10: 90% move. The bigger the cluster, the worse it gets. Yet all we <em>needed</em> was for the new server to take its 1/(N+1) share, meaning only about 20% of keys should move for 4 → 5.` },
    { type: 'p', html: `Count it yourself. The hash of 12 keys (shortened to 6 digits) and their server, with N and N+1 servers. Keys whose server changed are red:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Servers now (N): <strong class="md-nv"></strong>, new: <strong class="md-n1"></strong></label><input class="md-n" type="range" min="2" max="9" step="1" value="4"></div>
        <div class="md-tab" style="margin-top:12px;overflow-x:auto"></div>
        <div class="stats">
          <div class="stat"><span>Moved out of these 12</span><strong class="md-12"></strong></div>
          <div class="stat"><span>Moved out of 10,000 keys</span><strong class="md-all"></strong></div>
          <div class="stat"><span>Formula N/(N+1)</span><strong class="md-f"></strong></div>
        </div>
        <div class="calc-note md-note"></div>`;
      const q = s => el.querySelector(s);
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const hv = k => h32(k) % 1000000;
      const KEYS = []; for (let i = 1; i <= 12; i++) KEYS.push('video:' + i);
      const ALL = []; for (let i = 0; i < 10000; i++) ALL.push(hv('key:' + i));
      const upd = () => {
        const n = +q('.md-n').value;
        q('.md-nv').textContent = n; q('.md-n1').textContent = n + 1;
        let moved = 0;
        const rows = KEYS.map(k => { const h = hv(k), a = h % n, b = h % (n + 1), mv = a !== b; if (mv) moved++;
          return `<tr style="color:${mv ? 'var(--red)' : 'var(--ink)'}"><td style="padding:3px 8px">${k}</td><td style="padding:3px 8px;font-family:var(--f-mono)">${h.toLocaleString('en-IN')}</td><td style="padding:3px 8px;text-align:center">${a}</td><td style="padding:3px 8px;text-align:center">${b}</td><td style="padding:3px 8px">${mv ? 'moved' : 'same'}</td></tr>`; }).join('');
        q('.md-tab').innerHTML = `<table style="border-collapse:collapse;font-size:14px;min-width:300px"><tr style="color:var(--ink-3);text-align:left"><th style="padding:3px 8px">key</th><th style="padding:3px 8px">hash</th><th style="padding:3px 8px">% ${n}</th><th style="padding:3px 8px">% ${n + 1}</th><th style="padding:3px 8px"></th></tr>${rows}</table>`;
        let mAll = 0; ALL.forEach(h => { if (h % n !== h % (n + 1)) mAll++; });
        q('.md-12').textContent = moved + ' / 12';
        q('.md-all').textContent = (mAll / 100).toFixed(1) + '%';
        q('.md-f').textContent = (n / (n + 1) * 100).toFixed(1) + '%';
        q('.md-note').textContent = `From ${n} to ${n + 1} servers: ${(mAll / 100).toFixed(1)}% of 10,000 keys changed server, close to the formula ${n}/${n + 1} = ${(n / (n + 1) * 100).toFixed(1)}%. Only ${(100 / (n + 1)).toFixed(1)}% was needed (the new server's share). The more servers, the worse it gets.`;
      };
      q('.md-n').addEventListener('input', upd);
      upd();
    }},
    { type: 'p', html: `In a cache these are "only" misses. In a storage system (like Cassandra) it is much worse: 80% of the data copied over the network, terabytes of it. The same happens when a server <em>falls</em>: going from N to N-1, everything moves again. We need a way where, when a server joins or leaves, only <strong>its share</strong> of keys moves.` },

    { type: 'h2', text: 'Idea: turn the hash into a clock (a ring)' },
    { type: 'p', html: `A hash function gives any number from 0 up to a very big number (say 0 to 2<sup>32</sup> - 1, about 4.3 billion). Bend this line into a <strong>circle</strong>, like a clock: after the biggest number, back to 0. Now:` },
    { type: 'steps', items: [
      { t: 'Servers on the ring', d: 'Compute the hash of each server\'s name (hash("Server A")). That number is its place on the ring.' },
      { t: 'Keys on the ring', d: 'Each key\'s hash is also a point on the ring. Same hash function.' },
      { t: 'Walk clockwise', d: 'From the key\'s point, walk clockwise (the direction a clock\'s hands move). The first server you meet owns the key.' },
    ]},
    { type: 'ascii', text: `
                 0 / max
                    │
         Server D ● │ ● Server A
                 ╱  │  ╲        k1 → clockwise → A
        k3 ○   ╱         ╲  ○ k1
              │   RING    │
        k4 ○  │           │
               ╲         ╱ ○ k2   k2 → clockwise → B
                 ╲     ╱
         Server C ●───● Server B` },
    { type: 'p', html: `<strong>A new server E arrived?</strong> It sits at one place on the ring, say between A and B. Now only the keys between A and E (which used to belong to B) become E's. For every other key, the "first server clockwise" is still the same. <strong>A server left?</strong> Its keys simply go to the next server clockwise. No other key moves.` },
    { type: 'callout', tone: 'term', title: 'New word: Consistent hashing', html: `<strong>What it is:</strong> putting both keys and servers on the same hash ring, and giving each key to the first server clockwise.<br><strong>Why we need it:</strong> when a server is added or removed, on average only ~1/N of keys move, exactly as many as needed.<br><strong>Without it:</strong> with <code>hash % N</code>, every change moves ~N/(N+1) of keys: an empty cache, or terabytes of data on the network.<br><strong>Example:</strong> 4 → 5 servers: about 80% of keys move with % N, about 20% on the ring.<br>This idea came from a 1997 paper by Karger and colleagues at MIT, written for exactly this web caching problem. "Consistent" here means "the mapping does not change much"; it has nothing to do with consistency in CAP.` },

    { type: 'h2', text: 'A catch: places on the ring are not equal' },
    { type: 'p', html: `The 4 servers got random places on the ring. Will all four get an equal 25% of the ring? No. Random points sometimes land close together, sometimes far apart. The gap (arc) behind one server could be 45%, another's 5%. So the load is just as uneven. And when one server falls, its <em>whole</em> load goes to just one neighbour, which now has double the load.` },
    { type: 'callout', tone: 'term', title: 'New word: Virtual nodes (vnodes)', html: `<strong>What it is:</strong> putting each physical server on the ring <strong>not once, but in many places</strong>. For Server A: hash("A#0"), hash("A#1") ... hash("A#99"): 100 points. Each point is a <strong>virtual node</strong>.<br><strong>Why we need it:</strong> (1) each server gets many small arcs, and their total is close to the average: even load. (2) If a server falls, its small pieces spread over <em>all</em> servers, not onto one neighbour. (3) Give a bigger machine more vnodes, and it takes a bigger share.<br><strong>Without it:</strong> 4 servers, 4 random points: one arc is 45%, another 5%. And when a server falls, its whole load lands on a single neighbour.<br><strong>Arc</strong> = a piece of the ring, the part between two points.` },
    { type: 'p', html: `Now play with it. Change the servers and vnodes, press "add a server", and see how many keys move: <code>% N</code> vs the ring.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Servers (N): <strong class="ch-nv"></strong></label><input class="ch-n" type="range" min="2" max="10" step="1" value="4"></div>
          <div><label>Vnodes per server: <strong class="ch-vv"></strong></label><input class="ch-v" type="range" min="1" max="200" step="1" value="1"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary ch-add"></button></div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:12px">
          <svg class="ch-svg" viewBox="0 0 320 320" style="width:100%;max-width:320px;height:auto" role="img" aria-label="Hash ring: the servers' vnodes and keys"></svg>
          <div class="ch-leg" style="flex:1;min-width:160px;font-size:14px"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>% N: keys moved</span><strong class="ch-mod"></strong></div>
          <div class="stat"><span>Ring: keys moved</span><strong class="ch-ring"></strong></div>
          <div class="stat"><span>Ideal: 1/(N+1)</span><strong class="ch-ideal"></strong></div>
          <div class="stat"><span>Load spread (std-dev ÷ avg)</span><strong class="ch-cv"></strong></div>
          <div class="stat"><span>Heaviest server</span><strong class="ch-max"></strong></div>
        </div>
        <div class="calc-note ch-note"></div>`;
      const q = s => el.querySelector(s);
      const COL = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--red)', 'var(--violet)', 'var(--net-s)', 'var(--queue-s)', 'var(--client-s)', 'var(--server-s)', 'var(--cache-t)', 'var(--ink)'];
      const NAMES = 'ABCDEFGHIJK'.split('');
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const K = 10000, SHOW = 90, keys = [];
      for (let i = 0; i < K; i++) keys.push(h32('key:' + i));
      const ring = (n, v) => { const p = []; for (let a = 0; a < n; a++) for (let j = 0; j < v; j++) p.push([h32(NAMES[a] + '#' + j), a]); return p.sort((x, y) => x[0] - y[0]); };
      const owner = (p, k) => { let lo = 0, hi = p.length; while (lo < hi) { const m = (lo + hi) >> 1; if (p[m][0] < k) lo = m + 1; else hi = m; } return p[lo === p.length ? 0 : lo][1]; };
      const pct = x => (x * 100).toFixed(1) + '%';
      let after = false;
      const ang = pos => pos / 4294967296 * 2 * Math.PI - Math.PI / 2;
      const pt = (pos, r) => [160 + r * Math.cos(ang(pos)), 160 + r * Math.sin(ang(pos))];
      const upd = () => {
        const n = Number(q('.ch-n').value), v = Number(q('.ch-v').value);
        q('.ch-nv').textContent = n; q('.ch-vv').textContent = v;
        q('.ch-add').textContent = after ? `Back to ${n} servers` : `Add a server (${n} → ${n + 1})`;
        const r1 = ring(n, v), r2 = ring(n + 1, v);
        const cnt = new Array(n + 1).fill(0);
        let movedR = 0, movedM = 0;
        const o1 = keys.map(k => owner(r1, k)), o2 = keys.map(k => owner(r2, k));
        keys.forEach((k, i) => { if (o1[i] !== o2[i]) movedR++; if (k % n !== k % (n + 1)) movedM++; cnt[after ? o2[i] : o1[i]]++; });
        const m = after ? n + 1 : n, live = cnt.slice(0, m), mean = K / m;
        const sd = Math.sqrt(live.reduce((a, c) => a + (c - mean) * (c - mean), 0) / m);
        const rr = after ? r2 : r1;
        let svg = `<circle cx="160" cy="160" r="120" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
        for (let a = 0; a < m; a++) {
          let d = '';
          rr.forEach(([pos, o]) => { if (o === a) { const [x1, y1] = pt(pos, 110), [x2, y2] = pt(pos, 132); d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`; } });
          svg += `<path d="${d}" stroke="${COL[a]}" stroke-width="${v > 30 ? 1.5 : 3}" stroke-linecap="round"/>`;
          if (v === 1) { const [lx, ly] = pt(rr.find(p => p[1] === a)[0], 146); svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="${COL[a]}">${NAMES[a]}</text>`; }
        }
        for (let i = 0; i < SHOW; i++) {
          const [x, y] = pt(keys[i], 94), o = after ? o2[i] : o1[i], mv = after && o1[i] !== o2[i];
          svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${mv ? 5 : 3.5}" fill="${COL[o]}"${mv ? ' stroke="var(--ink)" stroke-width="2"' : ''}/>`;
        }
        svg += `<text x="160" y="154" text-anchor="middle" font-size="12" fill="var(--ink-3)">${SHOW} sample keys</text><text x="160" y="172" text-anchor="middle" font-size="12" fill="var(--ink-3)">${after ? 'thick ring = moved' : 'colour = owner'}</text>`;
        q('.ch-svg').innerHTML = svg;
        q('.ch-leg').innerHTML = live.map((c, a) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:12px;height:12px;border-radius:3px;background:${COL[a]};display:inline-block"></span><strong>${NAMES[a]}</strong><span style="font-family:var(--f-mono);color:var(--ink-2)">${pct(c / K)}</span></div>`).join('');
        q('.ch-mod').textContent = pct(movedM / K);
        q('.ch-ring').textContent = pct(movedR / K);
        q('.ch-ideal').textContent = pct(1 / (n + 1));
        q('.ch-cv').textContent = pct(sd / mean);
        q('.ch-max').textContent = (Math.max(...live) / mean).toFixed(2) + '× avg';
        q('.ch-note').textContent = v <= 3
          ? `Only ${v} point per server: the arcs are random, so the load is uneven (the heaviest server has ${(Math.max(...live) / mean).toFixed(1)} times the average) and how many keys the new server takes is luck (now ${pct(movedR / K)}, ideal ${pct(1 / (n + 1))}). Try 100+ vnodes.`
          : `With % N, ${pct(movedM / K)} of keys moved. On the ring only ${pct(movedR / K)} (ideal ${pct(1 / (n + 1))}), and only towards the new server.` + (Math.abs(movedR / K - 1 / (n + 1)) > 0.03 ? ' It is a bit off the ideal because how much of the ring the new server\'s vnodes got is still a bit random; add vnodes and the gap shrinks.' : ' Very close to the ideal.') + ` Load spread: ${pct(sd / mean)}.`;
      };
      q('.ch-add').addEventListener('click', () => { after = !after; upd(); });
      ['.ch-n', '.ch-v'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},

    { type: 'callout', tone: 'tip', title: 'What the widget showed', html: `At every setting, the <code>% N</code> number stays stuck near N/(N+1) (4 servers: ~80%, 9: ~90%). On the ring with 1 vnode, both the moved % and the load are down to luck. With around 200 vnodes, the moved % comes close to 1/(N+1) (~21% for 4 → 5, ~10% for 9 → 10) and the heaviest server is close to the average (~1.05-1.2×). At values in between (like 100) it goes a little up and down, because the new server's share is still made of random points. And notice: on the ring, the keys that move go <strong>only to the new server</strong>; there is no useless shuffle between the old servers.` },

    { type: 'h2', text: 'Replication along the ring' },
    { type: 'p', html: `In storage systems, one copy of a key is not enough (Replication lesson). The ring helps here too: the <strong>first</strong> server clockwise from the key is its main home, and the <strong>next N-1 different physical servers</strong> after it hold its replicas. The Dynamo paper calls this list the <em>preference list</em>, and Cassandra's SimpleStrategy also picks replicas by walking clockwise on the ring. With vnodes there is a catch: the next point clockwise may be another vnode of the same physical server, so such points are skipped, or two "copies" would sit on one machine. Cassandra's NetworkTopologyStrategy also spreads replicas over different racks (rack = a cabinet of machines in a data center that share the same power and network switch), so losing one rack's power does not lose every copy.` },
    { type: 'callout', tone: 'term', title: 'New word: Preference list (replicas on the ring)', html: `<strong>What it is:</strong> the list of servers where a key's copies will live: the first N <em>different</em> physical servers you meet walking clockwise from the key on the ring.<br><strong>Why we need it:</strong> so there are more copies of the data even if one server falls, and every client can work out by itself where the copies are, without a central table.<br><strong>Without it:</strong> either a single copy (server gone, data gone), or a separate table saying where the copies are.<br><strong>Example:</strong> N = 3, the key's first server is B: copies on B, C, D. If B falls, read from C.` },
    { type: 'flow', title: '4 servers on the ring, N = 3 copies', height: 330,
      nodes: [
        { id: 'app', label: 'App server', sub: 'knows the ring', x: 500, y: 170, w: 130, kind: 'server', info: 'What it is: xyz.com\'s server. Its client library (or a coordinator node) has the ring map: which server is where on the ring. It computes the key\'s hash and decides by itself where to go. In Cassandra, whichever node receives the request becomes the coordinator.' },
        { id: 'A', label: 'Server A', x: 500, y: 45, w: 120, h: 50, kind: 'cache', info: 'What it is: a cache/storage server, near 12 o\'clock on the ring. The keys on the arc behind it (anticlockwise) are its keys.' },
        { id: 'B', label: 'Server B', x: 650, y: 170, w: 120, h: 50, kind: 'cache', info: 'What it is: the second server, clockwise after A. The hash of "user:42" falls between A and B, so B is its first home.' },
        { id: 'C', label: 'Server C', x: 500, y: 295, w: 120, h: 50, kind: 'cache', info: 'What it is: the third server, clockwise after B. With N = 3, the second copy of "user:42" lives here.' },
        { id: 'D', label: 'Server D', x: 350, y: 170, w: 120, h: 50, kind: 'cache', info: 'What it is: the fourth server, clockwise after C. The third copy of "user:42". After D the ring comes back to A.' },
        { id: 'E', label: 'Server E', sub: 'new', x: 650, y: 55, w: 110, h: 50, kind: 'cache', hidden: true, info: 'What it is: a new server. It got a place on the ring between A and B. Only the keys on the arc from A to E (which used to be B\'s) are now its keys.' },
      ],
      edges: [
        { a: 'app', b: 'A' }, { a: 'app', b: 'B' }, { a: 'app', b: 'C' }, { a: 'app', b: 'D' }, { a: 'app', b: 'E', id: 'appE', hidden: true },
        { a: 'A', b: 'B', id: 'AB', dashed: true }, { a: 'B', b: 'C', dashed: true }, { a: 'C', b: 'D', dashed: true }, { a: 'D', b: 'A', dashed: true },
        { a: 'A', b: 'E', id: 'AE', dashed: true, hidden: true }, { a: 'E', b: 'B', id: 'EB', dashed: true, hidden: true },
      ],
      scenarios: [
        { name: 'Write + 3 copies', steps: [
          { title: 'Find the key\'s home', text: 'The app computed hash("user:42"). It fell on the ring between A and B. The first server clockwise: B.', focus: ['app', 'B'], msg: 'hash("user:42") → between A and B → owner B' },
          { title: 'Three copies, clockwise', text: 'N = 3: B (first), then clockwise C, then D. The app sends the write to all three at once.', parallel: true, go: ['app>B', 'app>C', 'app>D'], after: { B: { sub: 'user:42 (1)' }, C: { sub: 'user:42 (2)' }, D: { sub: 'user:42 (3)' } } },
          { title: 'Read', text: 'Read from B (or, with a quorum, from 2 of B, C, D). A does not even have this key.', go: ['app>B', 'res:B>app'], set: { A: { state: 'dim' } }, after: { B: { state: 'hit' } } },
        ]},
        { name: 'Server B down', steps: [
          { title: 'B fell', text: 'Server B crashed.', set: { B: { state: 'down', sub: 'DOWN' }, C: { sub: 'user:42 (2)' }, D: { sub: 'user:42 (3)' } }, go: 'lost:app>B' },
          { title: 'Next clockwise: C', text: 'The app walks further on the ring. C has a copy. The request succeeds. No global reshuffle happened.', go: ['app>C', 'res:C>app'], after: { C: { state: 'hit' } } },
          { title: 'Only B\'s share is affected', text: 'Even if this is only a cache (no copies), only B\'s keys (~1/4) will miss, and they automatically become the next server\'s keys. A, C and D keep exactly their own keys. With % N, going from 4 to 3 here would have moved ~75% of keys.', focus: ['A', 'C', 'D'] },
        ]},
        { name: 'New server E', steps: [
          { title: 'E joins the ring', text: 'The hash of the new server\'s name fell between A and B.', show: ['E', 'appE', 'AE', 'EB'], hide: ['AB'], focus: ['E'] },
          { title: 'Only one arc moves', text: 'The keys on the arc from A to E used to be B\'s, now they are E\'s. Only this data is copied from B to E.', go: 'evt:B>E', after: { E: { state: 'ok', sub: 'A–E arc' } } },
          { title: 'Everything else stays', text: 'Not a single key of A, C or D moved. With vnodes, E would have many small arcs and would take a little from every server, not a lot from one.', set: { A: { sub: 'no change' }, C: { sub: 'no change' }, D: { sub: 'no change' } }, focus: ['A', 'C', 'D'] },
        ]},
        { name: 'Hot key', intro: 'What consistent hashing does NOT do.', steps: [
          { title: 'Viral post', text: 'One post\'s key "post:99" gets millions of reads per second. The ring always gives that key the same single home (B).', flood: { paths: ['app>B'], n: 16 }, after: { B: { state: 'hot', sub: 'post:99 HOT' } } },
          { title: 'The ring does not help here', text: 'Consistent hashing spreads <em>keys</em> evenly, not the <em>traffic</em> of one key. For a hot key: also read from its replicas (C, D), cache it in the app server\'s local memory, or split the key (Sharding lesson).', go: ['app>C', 'res:C>app'], focus: ['B'] },
        ]},
      ],
    },
    { type: 'p', html: `Now walk the ring yourself. Pick a key, pick the number of copies (N), and see which servers the clockwise walk chooses. Set vnodes to 3 and turn "same machine skip" OFF: what happens? Then take a server down. (The positions here come from real hashes, so they differ from the diagram above.)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rr-k" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="rr-o" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:12px">
          <svg class="rr-svg" viewBox="0 0 320 320" style="width:100%;max-width:320px;height:auto" role="img" aria-label="Replicas on the hash ring"></svg>
          <div class="rr-walk" style="flex:1;min-width:180px;font-size:14px"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Where the copies are</span><strong class="rr-res"></strong></div>
          <div class="stat"><span>Different machines</span><strong class="rr-dist"></strong></div>
        </div>
        <div class="calc-note rr-note"></div>`;
      const q = s => el.querySelector(s);
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const S = ['A', 'B', 'C', 'D'], COL = { A: 'var(--accent)', B: 'var(--green)', C: 'var(--amber)', D: 'var(--violet)' };
      const KEYS = ['user:42', 'video:3', 'user:1', 'user:7'];
      let key = 'user:42', rf = 3, vn = 1, skip = true, down = '';
      function walk(key, rf, vn, skip, down) {
        const pts = []; S.forEach(s => { for (let j = 0; j < vn; j++) pts.push({ pos: h32(s + '#' + j), s, j }); });
        pts.sort((a, b) => a.pos - b.pos);
        const kp = h32(key);
        let i0 = pts.findIndex(p => p.pos >= kp); if (i0 < 0) i0 = 0;
        const steps = [], chosen = [];
        for (let t = 0; t < pts.length && chosen.length < rf; t++) {
          const p = pts[(i0 + t) % pts.length];
          if (p.s === down) steps.push([p, 'down']);
          else if (skip && chosen.some(c => c.s === p.s)) steps.push([p, 'skip']);
          else { chosen.push(p); steps.push([p, 'pick']); }
        }
        return { pts, kp, steps, chosen, distinct: new Set(chosen.map(c => c.s)).size };
      }
      const ang = pos => pos / 4294967296 * 2 * Math.PI - Math.PI / 2;
      const pt = (pos, r) => [160 + r * Math.cos(ang(pos)), 160 + r * Math.sin(ang(pos))];
      const chip = (box, txt, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = txt; b.onclick = fn; box.appendChild(b); };
      const upd = () => {
        const kb = q('.rr-k'); kb.innerHTML = '';
        KEYS.forEach(k => chip(kb, k, k === key, () => { key = k; upd(); }));
        const ob = q('.rr-o'); ob.innerHTML = '';
        [1, 2, 3].forEach(v => chip(ob, 'N = ' + v, v === rf, () => { rf = v; upd(); }));
        [1, 3].forEach(v => chip(ob, v + ' vnode' + (v > 1 ? 's' : ''), v === vn, () => { vn = v; upd(); }));
        chip(ob, 'Skip same machine: ' + (skip ? 'ON' : 'OFF'), skip, () => { skip = !skip; upd(); });
        chip(ob, down ? 'Server ' + down + ' down' : 'All servers up', !!down, () => { down = down === '' ? 'B' : down === 'B' ? 'C' : ''; upd(); });
        const r = walk(key, rf, vn, skip, down);
        const last = r.steps.length ? r.steps[r.steps.length - 1][0].pos : r.kp;
        const [ax, ay] = pt(r.kp, 120), [bx, by] = pt(last, 120);
        let sweep = (last - r.kp + 4294967296) % 4294967296;
        let svg = `<circle cx="160" cy="160" r="120" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
        if (sweep > 0) svg += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} A120 120 0 ${sweep > 2147483648 ? 1 : 0} 1 ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-opacity="0.35"/>`;
        r.pts.forEach(p => {
          const st = r.steps.find(x => x[0] === p), [x1, y1] = pt(p.pos, 108), [x2, y2] = pt(p.pos, 134), [lx, ly] = pt(p.pos, 150);
          const isDown = p.s === down, picked = st && st[1] === 'pick';
          svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${isDown ? 'var(--ink-3)' : COL[p.s]}" stroke-width="${picked ? 6 : 3}" stroke-linecap="round"${isDown ? ' stroke-dasharray="3 3"' : ''}/>`;
          svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${isDown ? 'var(--ink-3)' : COL[p.s]}">${p.s}${vn > 1 ? p.j : ''}</text>`;
        });
        const [kx, ky] = pt(r.kp, 120);
        svg += `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="7" fill="var(--ink)"/><text x="160" y="156" text-anchor="middle" font-size="13" fill="var(--ink-2)">${key}</text><text x="160" y="174" text-anchor="middle" font-size="11" fill="var(--ink-3)">● = key, walk clockwise</text>`;
        q('.rr-svg').innerHTML = svg;
        const LBL = { pick: 'copy here', skip: 'skip: same machine', down: 'skip: down' };
        q('.rr-walk').innerHTML = '<strong>Clockwise walk:</strong>' + r.steps.map(([p, w], i) => `<div style="margin:3px 0;color:${w === 'pick' ? 'var(--ink)' : 'var(--ink-3)'}">${i + 1}. <strong style="color:${COL[p.s]}">${p.s}${vn > 1 ? p.j : ''}</strong>: ${LBL[w]}</div>`).join('');
        q('.rr-res').textContent = r.chosen.map(c => c.s).join(', ');
        q('.rr-dist').textContent = r.distinct + ' / ' + rf;
        let note;
        if (r.distinct < rf) note = `Trouble: ${rf} copies were needed, but they sit on only ${r.distinct} different machines. Two vnodes of the same machine took two "copies". If that machine goes, both copies go. That is why "skip same machine" is kept ON.`;
        else if (down) note = `Server ${down} is down, so the walk skipped it and went to the next server. ${key}'s copies are now on ${r.chosen.map(c => c.s).join(', ')}. When ${down} comes back, the writes that another server kept for it are handed back to it (Dynamo calls this hinted handoff).`;
        else note = `${key}'s hash fell on the ring, and the first server clockwise, ${r.chosen[0].s}, is its main home. ${rf > 1 ? 'The next ' + (rf - 1) + ' different servers (' + r.chosen.slice(1).map(c => c.s).join(', ') + ') hold replicas. Dynamo calls this list the "preference list".' : 'N = 1: only one copy.'}`;
        q('.rr-note').textContent = note;
      };
      upd();
    }},

    { type: 'h2', text: 'Where is it used?' },
    { type: 'table', head: ['System', 'How'], rows: [
      ['Amazon Dynamo (2007 paper)', 'Ring + virtual nodes + replicas on the preference list (the next N different nodes). This paper made consistent hashing famous.'],
      ['Apache Cassandra, ScyllaDB', 'A token ring: each node has many tokens (vnodes). Since Cassandra 4.0 the default <code>num_tokens</code> is 16 (it used to be 256), because the new token allocator gives an even load even with few tokens.'],
      ['Distributed caches', 'Memcached/Redis client libraries (like the old "ketama" algorithm) spread keys over cache servers with a ring, so losing one server does not empty the whole cache.'],
      ['CDNs and load balancers', 'Always send the same URL to the same cache server (the hit rate goes up). The original 1997 paper was for exactly this web caching. The "ring hash" and "Maglev" load balancers in the Envoy proxy belong to this family.'],
      ['Discord', 'According to its 2023 post, requests are routed by channel, with consistent hashing, to the same data-service instance.'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'DynamoDB and Redis Cluster: not a ring', html: `The roadmap puts DynamoDB in this list, and the link in ideas is real: DynamoDB also hashes the partition key. But according to its 2022 paper, a table is split into <strong>partitions</strong>, each partition holds one continuous range of the hash space, and hot/big partitions <strong>split</strong>. That is not the vnode ring of the Dynamo paper (DynamoDB took the name, not the architecture). In the same way, <strong>Redis Cluster</strong> is not a ring; it uses 16,384 fixed hash slots that move between nodes: the same "many fixed partitions" approach we saw in the Sharding lesson. Both have the same goal: when nodes change, little data moves.` },

    { type: 'h2', text: 'Alternative: rendezvous (HRW) hashing' },
    { type: 'callout', tone: 'term', title: 'New word: Rendezvous hashing (HRW)', html: `<strong>What it is:</strong> a way without a ring. For each key, compute a "score" for every server; the server with the biggest score wins. Like every server drawing a lottery ticket for the key, and the biggest number wins. But the ticket is not random, it comes from a hash, so it is the same every time.<br><strong>Why we need it:</strong> very simple code, no vnodes needed, and the load is even by itself.<br><strong>Without it:</strong> you would have to manage the full ring + vnodes map.<br><strong>Example:</strong> 6 servers, key "user:42": scores 71, 12, 94, 40, 55, 8 (say). Server C (94) wins. If C is removed, the next biggest (A, 71) wins, and the winners of all other keys stay the same.` },
    { type: 'p', html: `One more very simple way, without a ring. For each key, compute a score for <strong>every server</strong>: <code>score = hash(key + server)</code>. The server with the <strong>biggest</strong> score owns the key. That is why it is called <strong>Highest Random Weight</strong> (HRW), or rendezvous hashing (proposed by Thaler and Ravishankar in the 1990s).` },
    { type: 'list', items: [
      `<strong>A server is removed:</strong> only the keys it was winning move; every other key keeps its winner.`,
      `<strong>A server is added:</strong> it brings a new score for every key, and wins only ~1/(N+1) of the keys.`,
      `<strong>Bonus:</strong> no vnodes needed, the spread is even by itself. Need replicas? Take the servers with the top 3 scores.`,
      `<strong>Cost:</strong> N hashes on every lookup (one score per server). Nothing for 10-50 servers; for thousands, a ring is better, where a binary search on a sorted list (finding by cutting the list in half again and again) takes only a few steps.`,
    ]},
    { type: 'p', html: `See it yourself: the scores of 6 servers for the key <code>user:42</code>. Turn servers on and off:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="hrw-tg" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="hrw-bars" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>Winner for user:42</span><strong class="hrw-win"></strong></div>
          <div class="stat"><span>Moved out of 10,000 keys (vs all on)</span><strong class="hrw-mv"></strong></div>
          <div class="stat"><span>Expected</span><strong class="hrw-exp"></strong></div>
        </div>
        <div class="calc-note hrw-note"></div>`;
      const q = s => el.querySelector(s);
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const S = ['A', 'B', 'C', 'D', 'E', 'F'], on = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 };
      const win = (key, list) => { let best = null, bs = -1; list.forEach(s => { const sc = h32(key + '|' + s); if (sc > bs) { bs = sc; best = s; } }); return best; };
      const K = 10000, base = [];
      for (let i = 0; i < K; i++) base.push(win('key:' + i, S));
      const upd = () => {
        const tg = q('.hrw-tg'); tg.innerHTML = '';
        S.forEach(s => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on[s] ? ' on' : ''); b.textContent = 'Server ' + s + (on[s] ? ' on' : ' off'); b.onclick = () => { if (on[s] && S.filter(x => on[x]).length === 1) return; on[s] = on[s] ? 0 : 1; upd(); }; tg.appendChild(b); });
        const live = S.filter(s => on[s]);
        const w = win('user:42', live);
        q('.hrw-bars').innerHTML = S.map(s => { const sc = h32('user:42|' + s), p = sc / 4294967296 * 100;
          const col = !on[s] ? 'var(--line-2)' : s === w ? 'var(--green)' : 'var(--accent)';
          return `<div style="display:grid;grid-template-columns:70px 1fr 60px;gap:10px;align-items:center;margin:5px 0;opacity:${on[s] ? 1 : 0.45}"><strong>Server ${s}</strong><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${p.toFixed(1)}%;background:${col}"></div></div><span style="font:13px var(--f-mono)">${p.toFixed(1)}</span></div>`; }).join('');
        let mv = 0;
        for (let i = 0; i < K; i++) if (win('key:' + i, live) !== base[i]) mv++;
        const off = S.length - live.length;
        q('.hrw-win').textContent = 'Server ' + w;
        q('.hrw-mv').textContent = (mv / K * 100).toFixed(1) + '%';
        q('.hrw-exp').textContent = (off / S.length * 100).toFixed(1) + '%';
        q('.hrw-note').textContent = off === 0 ? 'All servers are on. Turn a server off: only its keys (~1/6 = 16.7%) will go to new winners.' : `${off} server(s) off: only their keys moved (expected ${off}/6 = ${(off / 6 * 100).toFixed(1)}%). Every other key kept its winner, because its scores did not change at all.`;
      };
      upd();
    }},

    { type: 'h3', text: 'Jump consistent hash (awareness)' },
    { type: 'p', html: `In 2014, Lamping and Veach at Google published <strong>jump consistent hash</strong>: a function of a few lines that takes a key and the number of buckets and returns a bucket number (bucket = a numbered shard or server: 0, 1, 2...). No ring, no memory, an almost perfectly even load, and only ~1/(N+1) of keys move from N to N+1. The condition: the buckets must be numbered <code>0 ... N-1</code>, and you can only add or remove the <strong>last</strong> bucket. So it is good for sharded storage (where shards are numbered and replicated themselves), but not for a cache cluster, where any server in the middle can die at any time.` },
    { type: 'table', head: ['', 'hash % N', 'Ring + vnodes', 'Rendezvous (HRW)', 'Jump hash'], rows: [
      ['Moved when a node is added', '~N/(N+1)', '~1/(N+1)', '~1/(N+1)', '~1/(N+1)'],
      ['Load spread', 'Even', 'Depends on vnodes', 'Even', 'Even'],
      ['Lookup cost', 'O(1)', 'O(log of total vnodes)', 'O(N)', 'O(log N), no memory'],
      ['Can you remove any node?', 'Yes (everything moves)', 'Yes', 'Yes', 'No, only the last one'],
      ['Example', 'Simple, fixed clusters', 'Dynamo, Cassandra, caches', 'Small clusters, top-k replicas', 'Numbered shards'],
    ]},
    { type: 'p', html: `(O(...) means: how much the work of one lookup grows as servers grow. O(1) = always the same. O(N) = one piece of work per server. O(log N) = grows very slowly: about 10 steps for 1,000 points.)` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: when to use consistent hashing?', html: `Use it when <strong>nodes join and leave often</strong> (cache clusters, storage nodes, autoscaling) and <strong>moving data is expensive</strong>. If the number of shards is fixed and changes only rarely, "many fixed logical partitions + a map" (like Redis Cluster's 16,384 slots) is just as good and easier to understand. If you want a small cluster and simple code, use rendezvous hashing.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistakes', html: `<strong>1.</strong> Consistent hashing is not a cure for hot keys: all the traffic of one key still goes to one server (the "Hot key" scenario above).<br><strong>2.</strong> "Consistent" does not mean data consistency, only that the mapping stays stable.<br><strong>3.</strong> The ring does not move data <em>by itself</em>. It only tells you which keys changed home; a storage system has to copy (stream) that data, and in a cache those keys simply miss and get filled again.` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Consistent hashing: xyz.com\'s cache cluster', height: 600,
      groups: [
        { label: 'Users + app', x: 30, y: 6, w: 440, h: 206 },
        { label: 'Cache cluster (ring)', x: 70, y: 222, w: 600, h: 248 },
        { label: 'Data', x: 510, y: 496, w: 200, h: 92 },
      ],
      nodes: [
        { id: 'users', label: 'xyz.com users', x: 360, y: 55, kind: 'client', info: 'What it is: the people of xyz.com. For every page, the app needs many keys (user:42, post:99) from the cache.' },
        { id: 'app', label: 'App servers', sub: 'ring client', x: 360, y: 160, w: 170, kind: 'server', info: 'What it is: xyz.com\'s code. Its client library computes the key\'s hash and picks the first server clockwise on the ring. All app servers must have the same ring map.' },
        { id: 'map', label: 'Ring map', sub: 'nodes + vnodes', x: 130, y: 160, w: 150, kind: 'data', info: 'What it is: the list of which server (and its vnodes) sits where on the ring. It reaches all app servers through a config service or gossip (nodes passing news to each other). This is what changes when a server joins or leaves.' },
        { id: 'ring', label: 'Hash ring', sub: '0 → 2³² → 0', x: 360, y: 350, w: 130, kind: 'net', info: 'What it is: the whole range of the hash, bent into a round clock. Servers and keys are both points on it; a key belongs to the first server clockwise.' },
        { id: 'cA', label: 'Cache A', x: 360, y: 265, w: 120, kind: 'cache', info: 'What it is: a cache server (like Redis/Memcached), at the top of the ring. The keys on the arc between D and A are its keys.' },
        { id: 'cE', label: 'Cache E', sub: 'new', x: 590, y: 250, w: 120, kind: 'cache', info: 'What it is: a newly added server. It sits on the ring between A and B, so only the keys on the A-E arc (which were B\'s) became its keys. No other key moved.' },
        { id: 'cB', label: 'Cache B', x: 580, y: 380, w: 120, kind: 'cache', info: 'What it is: the server on the right side of the ring. With replication, copies of its keys go to the next servers clockwise (C, D).' },
        { id: 'cC', label: 'Cache C', x: 360, y: 435, w: 120, kind: 'cache', info: 'What it is: the server at the bottom of the ring. The second copy of B\'s keys lives here (when N = 3).' },
        { id: 'cD', label: 'Cache D', x: 150, y: 350, w: 120, kind: 'cache', info: 'What it is: the server on the left side of the ring. If it falls, its keys simply go to the next server clockwise (A); with vnodes they spread over all servers.' },
        { id: 'db', label: 'Database', sub: 'on a cache miss', x: 610, y: 542, w: 160, kind: 'data', info: 'What it is: the real data. When a server is added or removed, the keys that move miss once and come from here. Thanks to the ring this is only ~1/N of the keys, not a % N style flood.' },
      ],
      edges: [
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'map', dashed: true },
        { a: 'app', b: 'cA', n: 2, label: 'hash(key)' },
        { a: 'app', b: 'cB' },
        { a: 'app', b: 'cD' },
        { a: 'cA', b: 'cE', dashed: true, both: false },
        { a: 'cE', b: 'cB', dashed: true, both: false },
        { a: 'cB', b: 'cC', dashed: true, both: false },
        { a: 'cC', b: 'cD', dashed: true, both: false },
        { a: 'cD', b: 'cA', dashed: true, both: false },
        { a: 'app', b: 'db', dashed: true, label: 'miss', via: [[690, 160], [690, 486]] },
      ],
      paths: [
        { name: 'Key lookup', text: 'The app computed the key\'s hash, checked the ring map, and the first server clockwise is A: straight there.', go: ['users>app>cA', 'app>map'] },
        { name: 'Server added', text: 'E arrived: only the keys on the A-E arc moved from B to E. A, C and D keep their keys.', go: ['cA>cE', 'cE>cB'] },
        { name: '3 copies', text: 'The key\'s home is B; with N = 3, copies go to the next different servers clockwise, C and D.', go: ['app>cB', 'cB>cC', 'cC>cD'] },
        { name: 'Server fell', text: 'D fell: its keys now belong to the next server clockwise, A, and only those keys refill once from the DB.', go: ['app>cD', 'cD>cA', 'app>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>With <code>hash % N</code>, changing N moves ~N/(N+1) of keys (4 → 5: 80%). An empty cache, or terabytes copied.</li>
      <li>Consistent hashing: servers and keys on one ring; a key belongs to the first server clockwise. When a server joins or leaves, only ~1/N of keys move.</li>
      <li>Few points = uneven arcs. Vnodes (many points per server) make the load even, and a fallen server's load spreads over everyone.</li>
      <li>Replicas: the next N different physical servers clockwise from the key (the preference list). Skip vnodes of the same machine.</li>
      <li>Rendezvous (HRW): a score per server, the biggest wins. Simple, no vnodes, but N hashes on every lookup.</li>
      <li>Jump hash: no memory, a perfect spread, but you can only add or remove the last bucket.</li>
      <li>No cure for hot keys: one key always has one home.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Adding/removing a node moves only ~1/N of keys', 'Growing the cache cluster does not cause a storm of misses', 'Vnodes give an even load and a bigger share to bigger machines', 'Replicas right on the ring: the next N different nodes'], costs: ['More complex than hash % N (ring map, vnodes, every client needs the same view)', 'Few vnodes = uneven load; many vnodes = a big map and more metadata', 'No cure for hot keys', 'The work of moving data (streaming) still has to be done'] },

    { type: 'think', questions: [
      { q: 'xyz.com has 10 Redis cache servers, and the client uses hash % 10. One server\'s memory broke and it was removed. What happens? What changes with consistent hashing?', a: 'Moving to % 9 changes the server of ~90% of keys: the cache is almost empty, and the database suddenly gets 10 times the load. With a ring, only that one server\'s keys (~10%) miss, and they spread over the other 9 (thanks to vnodes). The DB gets only 10% extra misses.' },
      { q: 'A cluster has 3 old, small servers and 2 new servers that are 3 times bigger. How would you split the load on the ring?', a: 'Vnodes by capacity: 100 vnodes for each small server, 300 for each big server. The big servers get 3 times the points on the ring, so roughly 3 times the keys. Rendezvous hashing also has a weighted variant.' },
      { q: 'What is the downside of 1,000 vnodes per server?', a: 'The ring map gets big (servers × 1,000 entries), and every client/coordinator has to keep it and send it by gossip (nodes passing news to each other); lookups get a bit slower; and a new node has to stream many small pieces from many different nodes. For reasons like this, Cassandra moved its default from 256 to 16, together with a smarter token allocator.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'You went from 4 to 5 cache servers with hash % N. About how many keys change server?', options: ['~20%', '~50%', '~80%'], answer: 2, explain: 'A key stays only when hash % 4 = hash % 5, which happens about 1 time in 5. The other ~4/5 = 80% move.' },
      { q: 'On the ring, which server owns a key?', options: ['The nearest server, in any direction', 'The first server clockwise from the key\'s point', 'A random server'], answer: 1, explain: 'The rule is clockwise. If a server is removed, its keys go to the next server clockwise.' },
      { q: 'What is the main benefit of virtual nodes?', options: ['Data gets encrypted', 'An even load, and when a node leaves its load spreads over all nodes', 'Lookups become O(1)'], answer: 1, explain: 'Each server has many small arcs, so its total share is close to the average, and the load of a failure does not land on one neighbour.' },
      { q: 'In rendezvous hashing, which server owns a key?', options: ['The one with the biggest hash(key + server) score', 'The first one clockwise on the ring', 'hash % N'], answer: 0, explain: 'Highest Random Weight: a score for every server, the biggest wins. If a server is removed, only the keys it was winning move.' },
      { q: 'Why skip points of the "same physical server" when choosing replicas on a ring with vnodes?', options: ['For speed', 'Otherwise two copies could sit on one machine, and if that machine goes, both copies go', 'Vnodes cannot accept writes'], answer: 1, explain: 'The next point clockwise may be another vnode of the same server. In the lab with skip OFF: N = 3 was asked for, but only 2 different machines were found.' },
      { q: 'One key of a viral post gets millions of reads per second. What will consistent hashing do?', options: ['Spread the traffic over all servers', 'Nothing: one key always has one home; a hot key needs replicas, a local cache, or key splitting', 'Delete the key'], answer: 1, explain: 'It spreads keys, not the traffic of one key.' },
    ]},
    { type: 'sources', note: 'Papers and docs that the specific facts come from.', items: [
      { title: 'Consistent Hashing and Random Trees (Karger et al., STOC 1997)', publisher: 'ACM STOC / MIT', official: true, url: 'https://cs.brown.edu/courses/csci2950-u/f09/papers/chash97stoc.pdf', used: 'The origin of consistent hashing, the web caching motivation.' },
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP 2007 (Amazon)', official: true, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Ring, virtual nodes, the preference list (the next N distinct nodes), hinted handoff.' },
      { title: 'Cassandra docs: Dynamo architecture and production recommendations', publisher: 'Apache Cassandra', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'Token ring, vnodes, clockwise replica selection, NetworkTopologyStrategy racks, the num_tokens default of 16 (4.0+).' },
      { title: 'Amazon DynamoDB (USENIX ATC 2022)', publisher: 'USENIX / Amazon', official: true, url: 'https://www.usenix.org/system/files/atc22-elhemali.pdf', used: 'Hash of the partition key, continuous key-range partitions, splits: not a ring.' },
      { title: 'A Fast, Minimal Memory, Consistent Hash Algorithm (Lamping, Veach 2014)', publisher: 'Google (arXiv)', official: true, url: 'https://arxiv.org/abs/1406.2294', used: 'The properties and the limitation (only the last bucket) of jump consistent hash.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord blog (2023)', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'Consistent-hash routing by channel to data services.' },
    ]},
  ],
});
