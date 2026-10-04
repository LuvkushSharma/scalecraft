Lesson.register({
  id: 'db-internals',
  title: 'Indexes, B-trees and LSM trees',
  minutes: 34,
  summary: `How a database works inside, just as much as you need for design. What an index is, and how a B+ tree finds one row among 100 million rows in 3-4 page reads; composite indexes and the leftmost prefix; the write cost of every index; the LSM tree (how Cassandra writes so fast); and the write-ahead log, which keeps data safe even if the server crashes right after COMMIT.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `A database holds millions of rows. You need to find one row among them, fast.<br>If the database read every row one by one, it would take too long. So it builds a sorted list, like the "index" at the back of a book.<br>Some databases read little but write a lot (chat, location). For them there is a different method: collect writes in memory first, then write them to disk all at once.<br>And databases keep a "diary" (a log), so that data you were told is saved is not lost even when the power goes out. This lesson covers all three.` },
    { type: 'h2', text: 'The problem: the login query got slow' },
    { type: 'p', html: `The <code>users</code> table of xyz.com now has 10 million users. On login, this query runs:` },
    { type: 'code', text: `SELECT * FROM users WHERE email = 'riya@example.com';` },
    { type: 'p', html: `It used to take 2 ms. Now it takes about 1 second, and a few hundred of these queries arrive every second at login. A cache will not help here: each user logs in with their email only once or twice, so the hit rate would be low. The problem is not the cache; it is <em>how the database searches</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: Page', html: `<strong>What it is:</strong> a database does not read one row at a time from disk. It stores data in fixed-size blocks called <strong>pages</strong> (8 KB in PostgreSQL, 16 KB by default in MySQL InnoDB). One page holds many rows, like many lines on one sheet of a book.<br><strong>Why we need it:</strong> reading a tiny piece from disk and reading a whole page take about the same time. So the database always reads and writes a whole page at once.<br><strong>Without it (reading row by row):</strong> a separate disk trip for every row. Very slow.<br>So remember: how costly a database job is depends mostly on <strong>how many pages</strong> it has to read.` },
    { type: 'p', html: `Without any help, the database does not know which page holds Riya's row. So it reads <strong>every page</strong> and checks the email of every row.` },
    { type: 'callout', tone: 'term', title: 'New word: Full table scan', html: `<strong>What it is:</strong> reading all pages of a table from start to end and checking every row. In Postgres <code>EXPLAIN</code> this shows up as "Seq Scan".<br><strong>When it is fine:</strong> a small table, or when the query needs half the table anyway.<br><strong>The problem:</strong> 10 million rows, ~100 rows per page = 100,000 pages, just to find one user. And since the database was never told that email is unique, it cannot stop at the first match: there might be another row with the same email further on.` },
    { type: 'callout', tone: 'analogy', title: 'The index of a book', html: `You need to find "hashing" in a 1,000-page computer science book. One way: read from page 1 to 1,000 (a full scan). The other way: open the <strong>index</strong> at the back. There, words are sorted alphabetically: "hashing → page 412". Because it is sorted, you jump straight to "h". A database index is exactly this.` },
    { type: 'image', src: 'assets/img/db-internals/book-index.jpg', alt: 'The index page of an old encyclopedia: words in alphabetical order, each followed by a volume and page number', caption: 'A real book index (an encyclopedia from 1919): every word sorted, followed by its page number. A database index does the same: values sorted, followed by where the row is.', maxWidth: 420, credit: { text: 'Randal Oulton, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Book_of_Knowledge_1919_Vol_20,_General_Index_Start.jpg', license: 'CC0' } },
    { type: 'callout', tone: 'term', title: 'New word: Index (database)', html: `<strong>What it is:</strong> a separate, <strong>sorted</strong> copy of one (or more) columns of a table. Each entry holds the value and the address of its row: "riya@example.com → page 52,018, row 7".<br><strong>Why we need it:</strong> searching a sorted list is very fast. One row among millions is found by reading just a few pages.<br><strong>Without it:</strong> a full table scan on every login. The more users, the slower the login.<br><strong>The cost:</strong> an index is an extra copy. Every insert or update must change it too (you will see this below).` },
    { type: 'h2', text: 'B-tree and B+ tree: an index from the inside' },
    { type: 'p', html: `The default index in Postgres and MySQL is the <strong>B-tree</strong> (really its variant, the <strong>B+ tree</strong>). Think of it as an upside-down tree: one <em>root</em> page at the top, <em>internal</em> pages in the middle, and <em>leaf</em> pages at the bottom. Every page is sorted.` },
    { type: 'callout', tone: 'term', title: 'New word: B+ tree', html: `<strong>What it is:</strong> a sorted, balanced tree where every node is one <strong>page</strong>. The upper (internal) pages hold only "signposts", like "below 50: go left, 50-94: middle, 95+: right". The real entries are only in the bottom <strong>leaf</strong> pages. The leaves are linked to each other from left to right, so range queries (<code>WHERE age BETWEEN 18 AND 25</code>) can walk from one leaf to the next. "Balanced" means every leaf is the same distance from the root, so every lookup costs the same.<br><strong>Why we need it:</strong> by following the signposts you reach any value in 3-4 pages, even if the table has billions of rows.<br><strong>Without it:</strong> keeping a plain sorted list on disk is hard: to put a new name in the middle, you would have to shift half the list. A B+ tree keeps a little free space in each page, and when a page fills up, it splits it in two.` },
    { type: 'callout', tone: 'term', title: 'New word: Fanout', html: `<strong>What it is:</strong> how many children (child pages) come out of one internal page. An 8-16 KB page holds more than a hundred signposts, so the fanout is over a hundred.<br><strong>Why it matters:</strong> at each level, the search area gets a hundred times smaller. 100 × 100 × 100 = 1 million. Three or four levels cover millions or billions of rows.<br><strong>If the fanout were small (like 2, a binary tree):</strong> 10 million rows would need ~24 levels, which means 24 disk reads. That is why databases use "wide" B+ trees, not binary trees.` },
    { type: 'p', html: `Below is a tiny tree (only 3 keys per page, so it fits on screen). Look up a user ID, first with the index, then without it:` },
    { type: 'custom', render(el) {
      const KEYS = []; for (let v = 2; v <= 54; v += 2) KEYS.push(v);
      const leaf = j => KEYS.slice(3 * j, 3 * j + 3);
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const sh = KEYS.slice(); for (let k = sh.length - 1; k > 0; k--) { const r = Math.floor(rnd() * (k + 1)); [sh[k], sh[r]] = [sh[r], sh[k]]; }
      const heap = j => sh.slice(3 * j, 3 * j + 3);
      let mode = 'idx', key = 30, step = 0;
      const path = k => { const a = k < 20 ? 0 : k < 38 ? 1 : 2; const f = j => leaf(j)[0]; const j = 3 * a + (k < f(3 * a + 1) ? 0 : k < f(3 * a + 2) ? 1 : 2); return { a, j }; };
      el.innerHTML = `<div class="bt-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-top:10px">
          <label style="max-width:200px">Find a user ID (2-54)<input class="bt-k" type="number" min="1" max="56" value="30"></label>
          <button type="button" class="btn small primary bt-next">Read the next page</button>
          <button type="button" class="btn small ghost bt-all">Run it all</button>
        </div>
        <div class="stage" style="margin:12px 0 0"><svg class="bt-svg" viewBox="0 0 720 230" style="display:block;width:100%;min-width:560px;height:auto" role="img" aria-label="B+ tree lookup"></svg></div><div style="font-size:12px;color:var(--ink-3);margin-top:4px">On a phone the tree is wide: swipe sideways.</div>
        <div class="stats"><div class="stat"><span>Pages read</span><strong class="bt-p"></strong></div><div class="stat"><span>Result</span><strong class="bt-r"></strong></div></div>
        <div class="bt-n calc-note"></div>`;
      const q = s => el.querySelector(s);
      const box = (x, y, w, txt, st) => {
        const f = st === 'now' ? 'var(--accent-soft)' : st === 'done' ? 'var(--surface-2)' : 'var(--surface)';
        const s = st === 'now' ? 'var(--accent)' : st === 'found' ? 'var(--green)' : 'var(--line-2)';
        return `<rect x="${x}" y="${y}" width="${w}" height="36" rx="6" fill="${st === 'found' ? 'var(--accent-soft)' : f}" stroke="${s}" stroke-width="${st ? 2.5 : 1}"></rect><text x="${x + w / 2}" y="${y + 23}" text-anchor="middle" font-size="15" font-family="var(--f-mono)" fill="var(--ink)">${txt}</text>`;
      };
      const draw = () => {
        q('.bt-m').innerHTML = '';
        [['idx', 'With the index (B+ tree)'], ['scan', 'Without an index (full scan)']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (mode === k ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = k; step = 0; draw(); }; q('.bt-m').appendChild(b); });
        let s = '', total, found = KEYS.includes(key), res = '-';
        const lx = j => 5 + j * 80;
        if (mode === 'idx') {
          const { a, j } = path(key); total = 3;
          const st = lvl => step > lvl ? (step === lvl + 1 ? 'now' : 'done') : '';
          for (let k = 0; k < 3; k++) { const cx = lx(3 * k + 1) + 35; s += `<line x1="360" y1="56" x2="${cx}" y2="100" stroke="var(--line-2)"></line>`; for (let m = 0; m < 3; m++) s += `<line x1="${cx}" y1="136" x2="${lx(3 * k + m) + 35}" y2="180" stroke="var(--line-2)"></line>`; }
          s += box(285, 20, 150, '20 | 38', st(0));
          for (let k = 0; k < 3; k++) { const cx = lx(3 * k + 1) + 35; s += box(cx - 75, 100, 150, leaf(3 * k + 1)[0] + ' | ' + leaf(3 * k + 2)[0], k === a ? st(1) : ''); }
          for (let m = 0; m < 9; m++) s += box(lx(m), 180, 70, leaf(m).join(' '), m === j ? (step >= 3 ? (found ? 'found' : 'now') : '') : '');
          s += `<text x="8" y="14" font-size="12" fill="var(--ink-3)">root</text><text x="8" y="94" font-size="12" fill="var(--ink-3)">internal</text><text x="8" y="174" font-size="12" fill="var(--ink-3)">leaf (rows)</text>`;
          const msgs = ['Start at the root.', `Root: ${key} ${key < 20 ? '< 20 → left' : key < 38 ? 'is between 20 and 37 → middle' : '≥ 38 → right'} child.`, `The internal page sent us to leaf ${j + 1}.`, found ? `Found ${key} in the leaf. Only 3 pages!` : `${key} is not in the leaf. In 3 pages we know for sure the row does not exist.`];
          q('.bt-n').textContent = msgs[Math.min(step, 3)];
          if (step >= 3) res = found ? 'found' : 'not there';
        } else {
          total = 9;
          for (let m = 0; m < 9; m++) s += box(lx(m), 100, 70, heap(m).join(' '), step > m ? (heap(m).includes(key) ? 'found' : step === m + 1 ? 'now' : 'done') : '');
          s += `<text x="8" y="90" font-size="12" fill="var(--ink-3)">table pages (insert order, not sorted)</text>`;
          const hitAt = sh.indexOf(key) >= 0 ? Math.floor(sh.indexOf(key) / 3) + 1 : 0;
          q('.bt-n').textContent = step === 0 ? 'The table pages are in insert order. The database has to read every page.' : step < 9 ? `Read page ${step}.` + (hitAt && step >= hitAt ? ` A match was found on page ${hitAt}, but there could be more matches, so the scan goes on.` : '') : `Read all 9 pages. That is 3 times more than with the index. In a real table the gap is hundreds of thousands of times (see the calculator below).`;
          if (step >= 9) res = found ? 'found' : 'not there';
        }
        q('.bt-svg').innerHTML = s;
        q('.bt-p').textContent = Math.min(step, total) + ' / ' + total;
        q('.bt-r').textContent = res;
        q('.bt-next').disabled = step >= total; q('.bt-all').disabled = step >= total;
        q('.bt-next').onclick = () => { step++; draw(); };
        q('.bt-all').onclick = () => { step = total; draw(); };
      };
      q('.bt-k').addEventListener('input', e => { const v = Math.round(Number(e.target.value)); if (v >= 1 && v <= 56) { key = v; step = 0; draw(); } });
      draw();
    }},
    { type: 'p', html: `Now the real numbers. Change the number of rows and see how many pages each method has to read:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Rows in the table: <strong class="bs-nv"></strong><input class="bs-n" type="range" min="3" max="10" step="1" value="7"></label>
        <div class="stats">
          <div class="stat"><span>Full scan: pages</span><strong class="bs-sp"></strong></div>
          <div class="stat"><span>Full scan: time</span><strong class="bs-st"></strong></div>
          <div class="stat"><span>B+ tree: levels (pages)</span><strong class="bs-ip"></strong></div>
          <div class="stat"><span>B+ tree: time</span><strong class="bs-it"></strong></div>
        </div>
        <div class="calc-note">Assumptions: 100 rows per leaf page, 300 signposts in each internal page (fanout), 8 KB pages. A full scan reads the disk sequentially at ~1 GB/s. Each page of an index lookup is counted as one random SSD read (~0.1 ms), which is the worst case: in practice the upper levels always stay cached in memory.</div>`;
      const q = s => el.querySelector(s);
      const names = { 3: '1 thousand', 4: '10 thousand', 5: '100 thousand', 6: '1 million', 7: '10 million', 8: '100 million', 9: '1 billion', 10: '10 billion' };
      const ft = ms => ms >= 1000 ? (ms / 1000).toFixed(ms >= 10000 ? 0 : 1) + ' s' : ms >= 1 ? ms.toFixed(1) + ' ms' : (ms * 1000).toFixed(0) + ' µs';
      const upd = () => {
        const e = Number(q('.bs-n').value), N = Math.pow(10, e);
        const leaves = Math.ceil(N / 100);
        let lv = 0, n = leaves; while (n > 1) { n = Math.ceil(n / 300); lv++; }
        const pages = lv + 1;
        q('.bs-nv').textContent = names[e];
        q('.bs-sp').textContent = leaves.toLocaleString('en-IN');
        q('.bs-st').textContent = ft(leaves * 8192 / 1e9 * 1000);
        q('.bs-ip').textContent = pages;
        q('.bs-it').textContent = ft(pages * 0.1);
      };
      q('.bs-n').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `With 10 million rows, a full scan reads ~100,000 pages (about one second); the index reads 4 pages (less than half a millisecond). Even with 1,000 times more data, the index grows by only one level. That is why <strong>the first step of "scaling reads" is always an index</strong>; cache and replicas come later.` },
    { type: 'code', text: `CREATE UNIQUE INDEX users_email_idx ON users (email);

EXPLAIN SELECT * FROM users WHERE email = 'riya@example.com';
--  Index Scan using users_email_idx on users   (before: Seq Scan on users)` },
    { type: 'callout', tone: 'tip', html: `<code>EXPLAIN</code> (and <code>EXPLAIN ANALYZE</code>) shows how the database will run a query. If you see "Seq Scan" (Postgres) or "type: ALL" (MySQL) on a big table, check your indexes.` },
    { type: 'callout', tone: 'term', title: 'Clustered vs secondary index', html: `<strong>What it is:</strong> in MySQL InnoDB, the table itself lives inside the B+ tree of the primary key. This is called a <strong>clustered index</strong>: the leaf holds the whole row. Other indexes (<strong>secondary</strong>) hold only the primary key in their leaves. So the email index first gives you the id, then you find the row in the primary tree (one extra lookup). In Postgres, rows live in a separate file called the <strong>heap</strong> (an unordered pile), and every index keeps the physical address of the row.<br><strong>For design:</strong> the difference is small. In both, a lookup takes only a few pages (~log N).` },

    { type: 'h3', text: 'Composite index and the leftmost prefix' },
    { type: 'p', html: `An index can cover several columns too: <code>CREATE INDEX ON users (country, city, age)</code>. It sorts entries first by country, then by city within the same country, then by age within the same city. Like a phone directory: surname first, then first name. The directory helps you search by surname, but not by first name alone. This is called the <strong>leftmost prefix rule</strong>. Pick columns and see how much the index helps:` },
    { type: 'custom', render(el) {
      const COLS = ['country', 'city', 'age'];
      const COND = { country: "country = 'IN'", city: "city = 'Pune'", age: 'age = 21', ager: 'age > 18' };
      let on = { country: true, city: true, age: false }, ageRange = false;
      el.innerHTML = `<div class="ci-c" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input class="ci-r" type="checkbox"> equality for age (age = 21). Untick it for a range (age &gt; 18)</label>
        <pre class="ci-q" style="white-space:pre-wrap;font:13px var(--f-mono);background:var(--surface-2);color:var(--ink);padding:10px;border-radius:var(--r-sm);margin-top:10px"></pre>
        <div class="ci-o calc-note" style="font-weight:600"></div>`;
      const q = s => el.querySelector(s);
      q('.ci-r').checked = true;
      const draw = () => {
        const box = q('.ci-c'); box.innerHTML = '';
        COLS.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on[c] ? ' on' : ''); b.setAttribute('aria-pressed', on[c]); b.textContent = 'WHERE ' + c; b.onclick = () => { on[c] = !on[c]; draw(); }; box.appendChild(b); });
        ageRange = !q('.ci-r').checked;
        const conds = COLS.filter(c => on[c]).map(c => c === 'age' && ageRange ? COND.ager : COND[c]);
        q('.ci-q').textContent = 'INDEX ON users (country, city, age)\n\nSELECT * FROM users' + (conds.length ? '\nWHERE ' + conds.join(' AND ') : '') + ';';
        let used = [];
        for (const c of COLS) { if (!on[c]) break; used.push(c); if (c === 'age' && ageRange) break; }
        let msg;
        if (!conds.length) msg = 'No condition: the whole table is needed, so the index does not help.';
        else if (!used.length) msg = 'The index will not help (directly). It is sorted by country first; without the country, the city/age entries are scattered all over the index. This query needs a different index, like (city) or (city, age).';
        else if (used.length === conds.length) msg = `The index fully helped: the (${used.join(', ')}) prefix led straight to the right range.`;
        else msg = `The index helped only up to (${used.join(', ')}). The other condition is applied by checking the entries of that range one by one.` + (on.city === false && on.age ? ' The middle column (city) was skipped, so there is no sorted order left for age.' : '');
        q('.ci-o').textContent = msg;
      };
      q('.ci-r').addEventListener('change', draw);
      draw();
    }},
    { type: 'p', html: `Two more points: put equality columns first and the range column (<code>&gt;</code>, <code>BETWEEN</code>) last, because the sorted order of columns after a range cannot be used. And if the index holds <em>all</em> the columns the query needs (a <strong>covering index</strong>), the database never touches the table; it answers from the index alone.` },
    { type: 'h3', text: 'An index is not free: the write cost' },
    { type: 'p', html: `Every index is a separate sorted copy that the database must maintain <em>on every write</em>. If the <code>users</code> table has 5 indexes, inserting one new user really means writing in 6 places: the table + 5 B-trees. On an update, if an indexed column changed, the old entry is removed and a new one is added. If a page is full, there is a <strong>page split</strong>: half the entries move to a new page. On top of that, every index takes space on disk and in memory (cache).` },
    { type: 'callout', tone: 'term', title: 'New word: Page split', html: `<strong>What it is:</strong> when a leaf page has no room left, the database breaks it into two pages: half the entries stay in the old page, half go to a new one. The "signpost" of the new page (its first key) is added to the page above. If the page above fills up too, it also splits. If the root splits, the tree becomes one level taller.<br><strong>Why we need it:</strong> this keeps the tree always sorted and balanced, no matter how many inserts happen.<br><strong>The cost:</strong> an insert that normally writes 1 page writes 3 or more pages during a split.` },
    { type: 'p', html: `Build a B+ tree yourself. In this tiny tree each page holds at most 3 keys. Keep pressing "Next insert" and watch the splits. You can also search for any number:` },
    { type: 'custom', render(el) {
      const T = { next: 'Next insert', ins: 'Insert', find: 'Search', reset: 'Reset', num: 'Number (1-99)', levels: 'Levels', pages: 'Total pages', wrote: 'Pages written this time', read: 'Pages read this time',
        start: 'The tree is empty. Press "Next insert".', dup: k => `${k} is already in the tree. A duplicate was not added to the index.`, full: 'This demo goes up to 16 keys. Press Reset.',
        plain: (k, p) => `Inserted ${k}. The leaf had room: only 1 page written. On the way: ${p} pages read.`,
        split: (k, s, r) => `Inserted ${k}. The leaf now had 4 keys (max 3), so a <strong>page split</strong> happened: ${s} split(s).` + (r ? ' The root split too, so the tree became one <strong>level taller</strong>.' : '') + ' That is why more pages were written.',
        hit: (k, p) => `Found ${k}. Read ${p} pages (one per level).`, miss: (k, p) => `${k} is not in the tree. Reading ${p} pages was enough to be sure.`, seq: 'Next number', hint: 'On a phone the tree can be wide: swipe sideways. Blue border = pages touched this time.' };
      const SEQ = [10, 20, 30, 40, 25, 50, 60, 35, 70, 15, 5, 45, 80, 55, 65, 75];
      const MAX = 3;
      let root, si, hl, msg, wrote, read;
      const mk = leaf => ({ leaf, keys: [], kids: [] });
      const reset = () => { root = mk(true); si = 0; hl = new Set(); msg = T.start; wrote = 0; read = 0; };
      const count = n => n.leaf ? 1 : 1 + n.kids.reduce((a, c) => a + count(c), 0);
      const height = n => n.leaf ? 1 : 1 + height(n.kids[0]);
      const all = n => n.leaf ? n.keys.slice() : n.kids.flatMap(all);
      const pick = (n, k) => n.keys.filter(x => x <= k).length;
      const insert = k => {
        if (all(root).includes(k)) { msg = T.dup(k); hl = new Set(); wrote = 0; read = 0; return; }
        if (all(root).length >= 16) { msg = T.full; return; }
        const path = []; let n = root;
        while (!n.leaf) { path.push(n); n = n.kids[pick(n, k)]; }
        path.push(n); read = path.length;
        n.keys.push(k); n.keys.sort((a, b) => a - b);
        hl = new Set([n]); wrote = 1; let splits = 0, grew = false;
        let cur = n, d = path.length - 1;
        while (cur.keys.length > MAX) {
          const R = mk(cur.leaf); let up;
          if (cur.leaf) { R.keys = cur.keys.splice(2); up = R.keys[0]; }
          else { R.keys = cur.keys.splice(3); up = cur.keys.pop(); R.kids = cur.kids.splice(3); }
          splits++; wrote += 2; hl.add(R);
          if (d === 0) { const nr = mk(false); nr.keys = [up]; nr.kids = [cur, R]; root = nr; hl.add(nr); grew = true; break; }
          const P = path[d - 1], i = P.kids.indexOf(cur);
          P.keys.splice(i, 0, up); P.kids.splice(i + 1, 0, R); hl.add(P);
          cur = P; d--;
        }
        msg = splits ? T.split(k, splits, grew) : T.plain(k, read);
      };
      const find = k => {
        let n = root; hl = new Set(); read = 0; wrote = 0;
        while (true) { hl.add(n); read++; if (n.leaf) break; n = n.kids[pick(n, k)]; }
        msg = n.keys.includes(k) ? T.hit(k, read) : T.miss(k, read);
      };
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">
          <button type="button" class="btn small primary bi-next"></button>
          <label style="max-width:150px">${T.num}<input class="bi-k" type="number" min="1" max="99" value="42"></label>
          <button type="button" class="btn small bi-ins">${T.ins}</button>
          <button type="button" class="btn small bi-find">${T.find}</button>
          <button type="button" class="btn small ghost bi-reset">${T.reset}</button>
        </div>
        <div class="stage" style="margin:12px 0 0;overflow-x:auto"><svg class="bi-svg" style="display:block;width:100%;height:auto" role="img" aria-label="B+ tree"></svg></div><div style="font-size:12px;color:var(--ink-3);margin-top:4px">${T.hint}</div>
        <div class="stats"><div class="stat"><span>${T.levels}</span><strong class="bi-h"></strong></div><div class="stat"><span>${T.pages}</span><strong class="bi-p"></strong></div><div class="stat"><span>${T.wrote}</span><strong class="bi-w"></strong></div><div class="stat"><span>${T.read}</span><strong class="bi-r"></strong></div></div>
        <div class="bi-n calc-note"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const H = height(root), lv = [];
        const walk = (n, d) => { (lv[d] = lv[d] || []).push(n); n.kids.forEach(c => walk(c, d + 1)); };
        walk(root, 0);
        const leaves = lv[H - 1], W = Math.max(720, leaves.length * 80 + 10), pos = new Map();
        const off = (W - leaves.length * 80) / 2; leaves.forEach((n, j) => pos.set(n, off + j * 80 + 40));
        for (let d = H - 2; d >= 0; d--) lv[d].forEach(n => pos.set(n, (pos.get(n.kids[0]) + pos.get(n.kids[n.kids.length - 1])) / 2));
        let s = '';
        lv.forEach((row, d) => row.forEach(n => n.kids.forEach(c => { s += `<line x1="${pos.get(n)}" y1="${d * 80 + 50}" x2="${pos.get(c)}" y2="${(d + 1) * 80 + 14}" stroke="var(--line-2)"></line>`; })));
        lv.forEach((row, d) => row.forEach(n => {
          const x = pos.get(n) - 36, y = d * 80 + 14, on = hl.has(n);
          s += `<rect x="${x}" y="${y}" width="72" height="36" rx="6" fill="${on ? 'var(--accent-soft)' : n.leaf ? 'var(--surface)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${on ? 2.5 : 1}"></rect><text x="${x + 36}" y="${y + 23}" text-anchor="middle" font-size="14" font-family="var(--f-mono)" fill="var(--ink)">${n.keys.join(' ') || '·'}</text>`;
        }));
        const svg = q('.bi-svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H * 80 + 10}`); svg.style.minWidth = W > 720 ? (W * 0.75) + 'px' : '520px'; svg.innerHTML = s;
        q('.bi-h').textContent = H; q('.bi-p').textContent = count(root); q('.bi-w').textContent = wrote; q('.bi-r').textContent = read;
        q('.bi-n').innerHTML = msg;
        q('.bi-next').textContent = si < SEQ.length ? `${T.next}: ${SEQ[si]}` : T.next; q('.bi-next').disabled = si >= SEQ.length;
      };
      q('.bi-next').onclick = () => { if (si < SEQ.length) { insert(SEQ[si++]); draw(); } };
      const val = () => { const v = Math.round(Number(q('.bi-k').value)); return v >= 1 && v <= 99 ? v : null; };
      q('.bi-ins').onclick = () => { const v = val(); if (v) { insert(v); draw(); } };
      q('.bi-find').onclick = () => { const v = val(); if (v) { find(v); draw(); } };
      q('.bi-reset').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `Notice: most inserts write just 1 page. Sometimes a split happens and 3-5 pages must be written. The tree grows from the <em>top</em>, not the bottom (the root splits), which is why all leaves always stay on the same level.` },
    { type: 'table', head: ['Add an index when', 'Do not add an index when'], rows: [
      ['The column appears again and again in WHERE, JOIN or ORDER BY', 'No query ever filters by that column'],
      ['The table is big, and the query wants only a few rows', 'The table is small (a few thousand rows): a scan is fast anyway'],
      ['You need a uniqueness guarantee (UNIQUE index)', 'The column has very few distinct values (like is_active true/false) and the query asks for half the table'],
      ['The table is read-heavy', 'The table is very write-heavy, and every extra index will slow writes'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Put an index on every column and everything gets fast." Reads maybe, but every write gets slower, and memory fills up with indexes. The second mistake: the index exists, but it is not used. With <code>WHERE LOWER(email) = ...</code> a normal email index does not work (you put a function on the column); you need an expression index for that. And <code>LIKE '%riya'</code> (a wildcard at the start) cannot use the sorted order of a B-tree.` },

    { type: 'h2', text: 'LSM tree: when it is writes, writes, writes' },
    { type: 'p', html: `New feature: live location sharing and chat on xyz.com. <strong>Hundreds of thousands of small writes</strong> every second. A B-tree puts each write into the right leaf page <em>in that very spot</em> (in place). Hundreds of thousands of writes = small updates at hundreds of thousands of different places on disk, page splits, and the same again for every index.` },
    { type: 'callout', tone: 'term', title: 'New words: Sequential vs random write', html: `<strong>What it is:</strong> <strong>sequential</strong> = writing on disk one after another, without gaps (like writing on the next line of a notebook). <strong>Random</strong> = going to a different spot on the disk each time to make a small change (like changing one word on 500 different pages).<br><strong>Why it matters:</strong> an old hard disk has a spinning platter and a moving "head" (photo below). For a random write, the head must move to the right spot and wait for the platter to spin around, which takes milliseconds. In a sequential write, the head just keeps writing. An SSD has no moving parts, but even there, big sequential writes are cheaper than small random ones.<br><strong>What this means:</strong> if you turn hundreds of thousands of small random writes into one big sequential write, the same disk can handle far more writes. That is what an LSM tree does.` },
    { type: 'image', src: 'assets/img/db-internals/hdd-inside.jpg', alt: 'An opened hard disk: a shiny round platter and a thin arm above it with the read/write head at its tip', caption: 'Inside a hard disk: the spinning platter and the head on the arm. A random write = moving the arm to a new spot every time. That is why disks like continuous (sequential) writes.', credit: { text: 'Eric Gaba (Sting), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Seagate_ST33232A_hard_disk_inner_view.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'callout', tone: 'term', title: 'New word: LSM tree (Log-Structured Merge tree)', html: `<strong>What it is:</strong> a storage design that never edits a file once it is written to disk. New writes first go into a sorted table in memory, called the <strong>memtable</strong>. When the memtable is full, all of it becomes one new, sorted file on disk. That file never changes again (it is <strong>immutable</strong>). This file is called an <strong>SSTable</strong> (Sorted String Table). In the background, <strong>compaction</strong> merges small SSTables into bigger ones.<br><strong>Why we need it:</strong> instead of hundreds of thousands of small random writes, one big sequential write once in a while. Writes become very cheap.<br><strong>Without it:</strong> write-heavy data (chat, location, events) drowns a B-tree disk in random writes.<br><strong>Real products:</strong> Cassandra, ScyllaDB, RocksDB, LevelDB, HBase and Bigtable belong to this family.` },
    { type: 'steps', items: [
      { t: 'Append to the commit log', d: 'For durability, the write first goes into an append-only log (sequential, cheap). After a crash, the memtable is rebuilt from it.' },
      { t: 'Put it in the memtable', d: 'A sorted structure in memory. The write ends here: OK to the client. No disk seek, no page split.' },
      { t: 'Flush', d: 'Memtable full → write one new SSTable file sequentially, in one go. Do not touch the old files.' },
      { t: 'Read', d: 'First the memtable, then the SSTables from newest to oldest. The first match is the latest. Each SSTable has a Bloom filter that says "this key is definitely NOT here", so useless files are not read.' },
      { t: 'Compaction', d: 'Merge several SSTables into one. Remove old versions and deleted keys (tombstones). This keeps reads fast and frees disk space.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Tombstone', html: `<strong>What it is:</strong> in an LSM tree you cannot change an old file, so even a delete is a new write: a marker saying "key c is deleted". This is called a <strong>tombstone</strong> (a grave stone). Key c is still lying in an old SSTable, but the tombstone is newer, so it wins.<br><strong>Why we need it:</strong> you can delete without touching old files.<br><strong>The cost:</strong> until compaction, both the tombstone and the old data stay on disk, and reads have to step over them. Cassandra removes them only after a grace period, so that the delete also reaches the other copies (replicas).` },
    { type: 'callout', tone: 'term', title: 'New word: Bloom filter', html: `<strong>What it is:</strong> a small bit array (a row of 0s and 1s) kept in memory next to each SSTable. It answers one question: "is key X in this file?" There are only two kinds of answers: <strong>"definitely not"</strong> or <strong>"maybe"</strong>. "No" is never wrong. "Maybe" is sometimes wrong (a <strong>false positive</strong>).<br><strong>Why we need it:</strong> a GET may have to look at 10 SSTables. The Bloom filter tells you, from memory, that the key is definitely not in 9 of them. Only 1 file has to be read from disk.<br><strong>Without it:</strong> every GET would have to open every SSTable on disk. The more files, the slower the reads.` },
    { type: 'p', html: `See for yourself how a Bloom filter works inside. This SSTable has 4 keys. For each key, 2 hash functions set 2 of the 16 bits to 1 (a hash function = a formula that turns a key into a number). When searching, the same 2 bits are checked: if any of them is 0, the answer is "definitely not".` },
    { type: 'custom', render(el) {
      const T = { set: 'Keys in SSTable-1', ask: 'GET', bits: 'Bloom filter (16 bits)', skipped: 'Files skipped', wasted: 'Wasted file reads', found: 'Found', own: 'Your own key', go: 'Check',
        no: (k, b) => `"${k}": bit ${b} = 0. So the key is <strong>definitely not</strong> here. The file on disk was not even opened. One read saved.`,
        yes: k => `"${k}": both bits are 1 → "maybe". The file was read → <strong>found it</strong>.`,
        fp: k => `"${k}": both bits are 1 → "maybe". The file was read → the key was not there! This is a <strong>false positive</strong>: other keys had set these bits to 1. One wasted read, but never a wrong answer.`,
        start: 'Pick a key above.', real: 'Real filter: bits per key', fpr: 'False positive chance', hk: 'Hash functions', mem: 'Memory for 100 million keys',
        note: 'Formula: (1 − e^(−k/b))^k, b = bits per key, k = hash functions. The Cassandra default target is 1% (10% with LeveledCompaction).' };
      const M = 16, KEYS = ['aman', 'riya', 'kabir', 'zoya'];
      const h1 = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h % M; };
      const h2 = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 17 + s.charCodeAt(i) * 3) % 8191; return h % M; };
      const on = new Set(); KEYS.forEach(k => { on.add(h1(k)); on.add(h2(k)); });
      let cur = null, skipped = 0, wasted = 0, found = 0, msg = T.start;
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">${T.set}: <code>${KEYS.join(', ')}</code></div>
        <div class="bf-q" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-top:8px"><label style="max-width:180px">${T.own}<input class="bf-k" type="text" maxlength="12" value="meera"></label><button type="button" class="btn small bf-go">${T.go}</button></div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:12px">${T.bits}</div>
        <div class="bf-bits" style="display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:3px;max-width:560px;margin-top:4px"></div>
        <div class="bf-n calc-note"></div>
        <div class="stats"><div class="stat"><span>${T.skipped}</span><strong class="bf-s"></strong></div><div class="stat"><span>${T.wasted}</span><strong class="bf-w"></strong></div><div class="stat"><span>${T.found}</span><strong class="bf-f"></strong></div></div>
        <div style="margin-top:16px"><label>${T.real}: <strong class="bf-bv"></strong><input class="bf-b" type="range" min="4" max="16" step="2" value="10"></label></div>
        <div class="stats"><div class="stat"><span>${T.hk}</span><strong class="bf-hk"></strong></div><div class="stat"><span>${T.fpr}</span><strong class="bf-p"></strong></div><div class="stat"><span>${T.mem}</span><strong class="bf-m"></strong></div></div>
        <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s);
      const check = k => {
        k = String(k).trim().toLowerCase(); if (!k) return;
        const a = h1(k), b = h2(k); cur = [a, b];
        const miss = [a, b].find(x => !on.has(x));
        if (miss !== undefined) { skipped++; msg = T.no(k, miss); }
        else if (KEYS.includes(k)) { found++; msg = T.yes(k); }
        else { wasted++; msg = T.fp(k); }
        draw();
      };
      const draw = () => {
        q('.bf-bits').innerHTML = Array.from({ length: M }, (_, i) => { const hit = cur && cur.includes(i); return `<div style="text-align:center;font:600 13px var(--f-mono);padding:6px 0;border-radius:4px;border:${hit ? '2px solid var(--accent)' : '1px solid var(--line)'};background:${on.has(i) ? 'var(--accent-soft)' : 'var(--surface)'};color:var(--ink)">${on.has(i) ? 1 : 0}<div style="font:10px var(--f-mono);color:var(--ink-3)">${i}</div></div>`; }).join('');
        q('.bf-n').innerHTML = msg; q('.bf-s').textContent = skipped; q('.bf-w').textContent = wasted; q('.bf-f').textContent = found;
        const bv = Number(q('.bf-b').value), k = Math.max(1, Math.round(bv * Math.LN2)), p = Math.pow(1 - Math.exp(-k / bv), k);
        q('.bf-bv').textContent = bv; q('.bf-hk').textContent = k; q('.bf-p').textContent = (p * 100).toFixed(2) + '%'; q('.bf-m').textContent = Math.round(1e8 * bv / 8 / 1e6) + ' MB';
      };
      ['riya', 'neha', 'dev', 'nina'].forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = `${T.ask} ${k}`; b.onclick = () => check(k); q('.bf-q').appendChild(b); });
      q('.bf-go').onclick = () => check(q('.bf-k').value);
      q('.bf-b').addEventListener('input', draw);
      draw();
    }},
    { type: 'p', html: `Did you try "nina"? Both of its bits had been set to 1 by other keys, so the filter said "maybe" and one read was wasted. But the opposite never happens: for a key that is in the file, its bits are always 1. In a real Bloom filter, ~10 bits per key bring false positives down to about 1%. The full story of Bloom filters is in the "Data structures for scale" lesson.` },
    { type: 'p', html: `Run it step by step. Each press runs one operation: writes, flush, reads and compaction:` },
    { type: 'custom', render(el) {
      const OPS = [['put', 'a', 1], ['put', 'c', 3], ['put', 'b', 2], ['flush'], ['put', 'a', 9], ['put', 'd', 4], ['del', 'c'], ['flush'], ['get', 'a'], ['get', 'b'], ['get', 'c'], ['get', 'z'], ['compact'], ['get', 'b']];
      const lbl = o => o[0] === 'put' ? `PUT ${o[1]}=${o[2]}` : o[0] === 'del' ? `DELETE ${o[1]}` : o[0] === 'get' ? `GET ${o[1]}` : o[0].toUpperCase();
      let i = 0;
      const run = n => {
        let mem = {}, ss = [], uw = 0, dw = 0, msg = 'Start: the memtable and the disk are both empty.', reads = '-', nm = 0;
        for (let k = 0; k < n; k++) {
          const o = OPS[k];
          if (o[0] === 'put' || o[0] === 'del') { mem[o[1]] = o[0] === 'del' ? '†' : o[2]; uw++; msg = `${lbl(o)}: appended to the commit log + put in the memtable. No random write on disk. OK to the client at once.`; }
          else if (o[0] === 'flush') { const e = Object.keys(mem).sort().map(x => [x, mem[x]]); ss.unshift({ name: 'SSTable-' + (++nm), e }); dw += e.length; mem = {}; msg = `The memtable is full → ${e.length} entries written in one go into a new sorted file (SSTable-${nm}). The old files were not touched.`; }
          else if (o[0] === 'compact') { const m = {}; ss.slice().reverse().forEach(s => s.e.forEach(([x, v]) => m[x] = v)); const e = Object.keys(m).sort().filter(x => m[x] !== '†').map(x => [x, m[x]]); dw += e.length; ss = [{ name: 'SSTable-' + (++nm), e }]; msg = `Compaction: all SSTables merged. Only the latest version of each key is kept; the old a=1 and the tombstoned c are both removed. ${e.length} entries written to a new file (this is also a disk write: write amplification).`; }
          else if (o[0] === 'get') {
            const key = o[1];
            if (key in mem) { reads = 0; msg = `GET ${key}: found in the memtable.`; continue; }
            let r = 0, res = null, skipped = [];
            for (const s of ss) { const has = s.e.find(x => x[0] === key); if (!has) { skipped.push(s.name); continue; } r++; res = has[1]; break; }
            reads = r;
            msg = `GET ${key}: not in the memtable. ` + (skipped.length ? `The Bloom filter let us skip ${skipped.join(', ')} ("definitely not here"). ` : '') + (res === null ? `Not found anywhere → not found, ${r} file reads.` : res === '†' ? `Found a tombstone in a newer SSTable → the key is deleted, no need to look at older files. Not found.` : `Found: ${key}=${res} (${r} file read). We searched from newest to oldest, so the first match is the latest.`);
          }
        }
        return { mem, ss, uw, dw, msg, reads };
      };
      el.innerHTML = `<div class="lsm-ops" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:14px">
          <div><div style="font-size:13px;color:var(--ink-3)">Memory: memtable</div><div class="lsm-mem"></div></div>
          <div><div style="font-size:13px;color:var(--ink-3)">Disk: SSTables (newest on top)</div><div class="lsm-ss" style="display:grid;gap:8px"></div></div>
        </div>
        <div class="lsm-msg calc-note" style="min-height:3em"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small primary lsm-next">Next operation</button><button type="button" class="btn small ghost lsm-reset">Reset</button></div>
        <div class="stats"><div class="stat"><span>User writes</span><strong class="lsm-uw"></strong></div><div class="stat"><span>Entries written to disk</span><strong class="lsm-dw"></strong></div><div class="stat"><span>Last GET: files read</span><strong class="lsm-r"></strong></div></div>
        <div class="calc-note">In this demo the Bloom filter is exact. A real Bloom filter sometimes says a wrong "maybe" (one wasted file read), but its "no" is never wrong. Commit log writes are not counted.</div>`;
      const q = s => el.querySelector(s);
      const card = (title, entries) => `<div style="border:1px solid var(--data-s);background:var(--data-f);border-radius:var(--r-sm);padding:6px 8px"><div style="font:600 12px var(--f-mono);color:var(--data-t)">${title}</div><div style="font:14px var(--f-mono);color:var(--ink)">${entries.length ? entries.map(([k, v]) => `${k}=${v}`).join('  ') : '(empty)'}</div></div>`;
      const draw = () => {
        q('.lsm-ops').innerHTML = OPS.map((o, k) => `<span style="font:12px var(--f-mono);padding:3px 7px;border-radius:var(--r-sm);border:1px solid ${k === i - 1 ? 'var(--accent)' : 'var(--line)'};background:${k === i - 1 ? 'var(--accent-soft)' : 'transparent'};color:${k < i ? 'var(--ink)' : 'var(--ink-3)'}">${lbl(o)}</span>`).join('');
        const r = run(i);
        q('.lsm-mem').innerHTML = card('memtable', Object.keys(r.mem).sort().map(x => [x, r.mem[x]]));
        q('.lsm-ss').innerHTML = r.ss.length ? r.ss.map(s => card(s.name, s.e)).join('') : '<div style="font-size:13px;color:var(--ink-3)">no files yet</div>';
        q('.lsm-msg').textContent = r.msg;
        q('.lsm-uw').textContent = r.uw; q('.lsm-dw').textContent = r.dw; q('.lsm-r').textContent = r.reads;
        q('.lsm-next').disabled = i >= OPS.length;
      };
      q('.lsm-next').onclick = () => { i++; draw(); };
      q('.lsm-reset').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'p', html: `Look at the end: 6 user writes, but 9 entries were written to disk (3 + 3 during flushes, 3 during compaction). This extra writing is <strong>write amplification</strong>. In real systems data is compacted many times, so this number is even bigger, but all the writes are sequential, so it is still cheap.` },
    { type: 'callout', tone: 'term', title: 'New words: The three amplifications', html: `<strong>What it is:</strong> "amplification" = the work growing bigger. There are three kinds:<br><strong>Write amplification</strong>: you wrote 1 thing; how much more was written to disk.<br><strong>Read amplification</strong>: how many files or pages had to be checked to read 1 thing.<br><strong>Space amplification</strong>: how much more disk is used than the real data (old versions, tombstones, half-empty pages).<br><strong>Why it matters:</strong> no storage engine can make all three small at once. Lower one, and another goes up. This decides which engine fits which job.<br>In an LSM tree, the compaction strategy is the balance between them: more compaction = better reads and space, costlier writes. The Unified Compaction Strategy (UCS) that came in Cassandra 5.0 turns this balance into one tunable setting.` },
    { type: 'table', head: ['', 'B-tree (Postgres, MySQL)', 'LSM tree (Cassandra, RocksDB)'], caption: 'For a rough idea. Real numbers depend on the workload and the settings.', rows: [
      ['<strong>Write amp</strong>', 'Change one 100-byte row, and the whole page (8-16 KB) is written again, plus the WAL. Very high for small random writes', 'Each entry is written several times (flush, then every compaction). But all sequential, so cheap'],
      ['<strong>Read amp</strong>', 'Low and steady: 3-4 pages (upper levels are usually in memory)', 'Higher: memtable + several SSTables. Bloom filters and compaction bring it down'],
      ['<strong>Space amp</strong>', 'Pages are often not completely full (half empty after a split)', 'Old versions and tombstones stay on disk until compaction'],
    ]},
    { type: 'h3', text: 'How does Cassandra write so fast?' },
    { type: 'list', items: [
      'A write does only two cheap things: an <strong>append</strong> to the commit log (sequential) and an insert into the memtable in memory. No read-before-write, no searching for a page.',
      'Never an in-place update on disk; flush and compaction write big sequential files, which is the most efficient thing for disks.',
      'One more twist: by default Cassandra\'s commit log runs in <strong>periodic</strong> mode and is fsynced every 10 seconds (fsync = really making data safe on disk; details in the WAL section below), and the write is acknowledged before that. If a node crashes, its last few seconds of writes can be lost on that node; the protection is that data is written to several replicas (replication lesson). If you need an fsync on every write, there is a "batch" mode, but it is slower.',
    ]},
    { type: 'table', head: ['', 'B-tree (Postgres, MySQL)', 'LSM tree (Cassandra, RocksDB)'], rows: [
      ['Write', 'In-place, random page updates; every index updated', 'Append + memtable; very fast, sequential'],
      ['Read (one key)', 'Predictable: 3-4 pages', 'Memtable + several SSTables (Bloom filters help)'],
      ['Range scan', 'Very good (sorted leaves)', 'Good, but several files must be merged'],
      ['Background work', 'Little (in Postgres, vacuum: cleaning up old row versions)', 'Compaction keeps using CPU and disk I/O'],
      ['Best for', 'Read-heavy, mixed workloads, transactions', 'Write-heavy: logs, events, chat, metrics, location'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"LSM is fast, B-tree is old." They are for different jobs. LSM makes writes cheap, and in return makes reads and background compaction costly. If your app reads more and needs transactions (most apps do), a B-tree database like Postgres or MySQL is the right choice. Also remember: a big part of "Cassandra is fast" is its data model (the partition key goes straight to one node), not just the LSM tree.` },

    { type: 'h2', text: 'Write-ahead log: a crash after COMMIT' },
    { type: 'callout', tone: 'term', title: 'New word: Buffer pool', html: `<strong>What it is:</strong> a big part of the database's memory where it keeps copies of disk pages. Reads and changes happen here first.<br><strong>Why we need it:</strong> memory is thousands of times faster than disk. Pages that are needed again and again (the upper levels of a B-tree) always stay here.<br><strong>Without it:</strong> every query goes to disk. The database is very slow.<br><strong>The danger:</strong> memory is wiped the moment the power goes out. Changes that were only here are gone.` },
    { type: 'p', html: `One more hidden problem. For speed, the database changes pages in memory (the buffer pool) and writes them to disk <em>later</em>. What if the power goes out after COMMIT returned "OK" but before the pages reached disk? Riya's coin transfer, which the app was told is done, would vanish. This is the <strong>D</strong> (Durability) question of ACID.` },
    { type: 'callout', tone: 'term', title: 'New word: Write-ahead log (WAL)', html: `<strong>What it is:</strong> a "diary" file where the database writes a record of every change, one after another, only adding at the end (<strong>append-only</strong>). The rule: <strong>before changing a data page, write a record of the change into this log and make it safe on disk</strong>. COMMIT returns OK only after the log has reached the disk.<br><strong>Why we need it:</strong> after a crash, on restart the database reads the log and applies all the committed changes again (<strong>redo</strong>). The data pages can be written later, at leisure.<br><strong>Without it:</strong> either write all the scattered pages to disk on every commit (very slow), or lose committed changes in a crash.<br>In Postgres it is called the WAL; in MySQL InnoDB, the <strong>redo log</strong>. The LSM commit log is the same idea.` },
    { type: 'callout', tone: 'term', title: 'New word: fsync', html: `<strong>What it is:</strong> when a program "writes" to a file, the operating system (OS) often first keeps it in a buffer in memory and sends it to disk later. <code>fsync</code> is an order (a system call) given to the OS: "do not come back until this data has really reached the disk."<br><strong>Why we need it:</strong> only after fsync can you be sure the data will survive a power cut.<br><strong>The cost:</strong> it is slow (up to milliseconds). So databases make the logs of many transactions safe together in one fsync. This is called <strong>group commit</strong>.` },
    { type: 'p', html: `Why is the WAL so cheap? The log is <em>sequential</em>: appends at the end of one file. Even if a transaction changed 10 different pages, at commit only a small piece of the log is fsynced, not 10 scattered pages. Every now and then, the database writes the changed pages to disk together: this is called a <strong>checkpoint</strong>. A checkpoint means: "all changes up to here have reached the data files". So after a crash, only the log after the checkpoint has to be replayed, and the restart is quick.` },
    { type: 'p', html: `Now crash it and see. In each scenario, think: did the app get "OK" or not, and is the data there after the restart?` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'app', label: 'App', sub: 'wallet service', x: 80, y: 165, w: 130, kind: 'client', info: 'What it is: the wallet service of xyz.com. It sends COMMIT and waits for OK. Getting OK = the app assumes the data is safe (it shows the user "Tip sent").' },
        { id: 'db', label: 'DB process', sub: 'buffer pool (RAM)', x: 300, y: 165, w: 160, kind: 'server', info: 'What it is: the running database program and its memory (the buffer pool). Pages change here (fast). Memory is wiped in a crash, so without the WAL these changes could be lost.' },
        { id: 'wal', label: 'WAL file', sub: 'disk, append-only', x: 560, y: 70, w: 170, kind: 'data', info: 'What it is: an append-only diary on disk. A record of every change, in order. fsync on COMMIT. Crash recovery is done from it. Replication and CDC also read this log.' },
        { id: 'data', label: 'Data files', sub: 'disk, pages', x: 560, y: 265, w: 170, kind: 'data', info: 'What it is: the real pages of tables and indexes on disk (the B-tree lives here). They are written at checkpoint time, not at commit.' },
      ],
      edges: [{ a: 'app', b: 'db' }, { a: 'db', b: 'wal' }, { a: 'db', b: 'data' }],
      scenarios: [
        { name: 'Commit (happy path)', steps: [
          { title: 'Transaction', go: 'app>db', text: 'Riya → Aman 100 coins. Two pages changed in memory. These are called <strong>dirty pages</strong>: changed in memory, not yet on disk.', set: { db: { sub: '2 pages dirty' } }, msg: 'BEGIN; UPDATE ...; UPDATE ...; COMMIT;' },
          { title: 'Append to WAL + fsync', go: ['db>wal', 'res:wal>db'], text: 'The change records go to the end of the log, then fsync. One sequential write, ~1 ms or less.', after: { wal: { state: 'ok', sub: 'commit record safe' } }, msg: 'WAL: [txn 881: riya -100][txn 881: aman +100][txn 881: COMMIT]  fsync ✓' },
          { title: 'Then OK', go: 'res:db>app', text: 'The data files have not even been touched yet, but the transaction is already durable.', after: { app: { state: 'ok', sub: 'got OK' } } },
          { title: 'Later: checkpoint', go: 'db>data', text: 'A while later, the database writes all dirty pages into the data files together. The WAL from before the checkpoint is no longer needed for recovery (it can be kept for archives or replication).', after: { data: { state: 'ok', sub: 'pages updated' }, db: { sub: 'clean' } } },
        ]},
        { name: 'Crash after COMMIT', intro: 'OK was received, no checkpoint yet, and the server lost power.', steps: [
          { title: 'Commit is safe', go: ['app>db', 'db>wal', 'res:wal>db', 'res:db>app'], text: 'The WAL was fsynced, and the app got OK.', after: { wal: { state: 'ok', sub: 'txn 881 COMMIT' }, app: { state: 'ok', sub: 'got OK' } } },
          { title: 'Crash', set: { db: { state: 'down', sub: 'memory wiped' }, data: { state: 'warn', sub: 'old pages' } }, go: 'lost:db>data', text: 'The changed pages were only in memory. The data files still have the old balance.' },
          { title: 'Restart: WAL replay (redo)', go: ['wal>db', 'db>data'], set: { db: { state: '', sub: 'recovery' } }, text: 'The database reads the WAL from the last checkpoint onward and applies every committed change again. Riya −100, Aman +100 are back.', after: { data: { state: 'ok', sub: 'txn 881 restored' }, db: { state: 'ok', sub: 'ready' } } },
          { title: 'Result', text: 'What got OK survived. This is Durability.', focus: ['data'] },
        ]},
        { name: 'Crash before COMMIT', intro: 'The transaction was running; the COMMIT fsync had not happened.', steps: [
          { title: 'Changes in memory', go: 'app>db', text: 'The pages are dirty, but the COMMIT record is not safe in the WAL.', set: { db: { sub: 'txn 882 half-done' } } },
          { title: 'Crash', set: { db: { state: 'down', sub: 'CRASH' } }, go: 'lost:db>wal', text: 'The app did not get OK (the connection broke or timed out).', after: { app: { state: 'warn', sub: 'no OK' } } },
          { title: 'Restart', go: ['wal>db'], set: { db: { state: 'ok', sub: 'ready' } }, text: 'Recovery did not find a COMMIT record for txn 882, so its changes are not applied (or are undone). The data is as before. The app never got OK, so it can retry (with an idempotency key, so nothing happens twice).' },
        ]},
        { name: 'Async commit (risky)', intro: 'For speed, synchronous_commit = off in Postgres (or innodb_flush_log_at_trx_commit = 2 in InnoDB).', steps: [
          { title: 'OK before fsync', go: ['app>db', 'res:db>app'], text: 'The database gave OK without waiting for the WAL fsync. Writes are very fast.', after: { app: { state: 'ok', sub: 'got OK' }, wal: { state: 'warn', sub: 'still in OS buffer' } } },
          { title: 'Crash before the flush', set: { db: { state: 'down', sub: 'CRASH' } }, go: 'lost:db>wal', text: 'The background writer was just about to write the log to disk.' },
          { title: 'The last ~sub-second of commits is gone', go: 'wal>db', set: { db: { state: 'ok', sub: 'ready' } }, text: 'On restart the database is consistent (no corruption), but the last few transactions that had already got OK are gone. According to the Postgres docs, this window is at most ~3 × wal_writer_delay (default 200 ms). Fine for likes or analytics, not for coins. (fsync = off is completely different and dangerous: the database can get corrupted.)', after: { wal: { state: 'down', sub: 'last commits lost' } } },
        ]},
      ],
    },
    { type: 'list', items: [
      '<strong>MySQL InnoDB</strong>: <code>innodb_flush_log_at_trx_commit = 1</code> (the default) fsyncs the redo log on every commit. With 0 or 2, up to ~1 second of commits can be lost.',
      '<strong>Even a disk can lie</strong>: some disks or controllers say "done" to an fsync while the data is still in their volatile cache. That is why production hardware and cloud volumes come with power-loss protection.',
      '<strong>The second job of the WAL</strong>: replicas replay this same log to stay copies, and CDC tools (Debezium) read it to create events. It will come back in the next lessons (replication, Kafka).',
    ]},
    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Default rule', html: `<strong>Start with PostgreSQL or MySQL (B-tree)</strong>, and for a slow query, first <code>EXPLAIN</code> + the right index; cache and replicas later. Use an LSM store (Cassandra, ScyllaDB, RocksDB-based) when writes are very heavy, access is by key, and you do not need ad-hoc queries or transactions. Leave durability settings (fsync, synchronous_commit) at their defaults, unless the data is truly fine to lose.` },
    { type: 'table', head: ['Signal', 'What to do'], rows: [
      ['WHERE/JOIN/ORDER BY is slow on a big table', 'An index on that query\'s columns (equality first, range last); confirm with EXPLAIN'],
      ['Several filters together', 'A composite index, ordered by the leftmost prefix rule'],
      ['Writes are getting slow, lots of indexes', 'Drop useless indexes; every index costs you on writes'],
      ['Hundreds of thousands of writes/sec, append-like data, reads by key', 'An LSM-based store (Cassandra/ScyllaDB), or batching + Kafka (pattern-writes)'],
      ['Data must never be lost', 'Default durable commit (fsync on commit) + replication'],
      ['A little loss is fine, speed matters (analytics events)', 'Async commit / batching, carefully'],
    ]},

    { type: 'diagram', title: 'Inside the database: the whole picture', height: 545,
      groups: [
        { label: 'PostgreSQL (B-tree)', x: 10, y: 96, w: 345, h: 434 },
        { label: 'Cassandra (LSM)', x: 365, y: 96, w: 345, h: 434 },
      ],
      nodes: [
        { id: 'app', label: 'xyz.com app', sub: 'queries + writes', x: 360, y: 50, w: 160, kind: 'server', info: 'What it is: the services of xyz.com. Login (find a user by email) and coins go to Postgres; huge numbers of writes like chat and location go to Cassandra.' },
        { id: 'planner', label: 'Query planner', sub: 'EXPLAIN: index?', x: 180, y: 150, w: 150, kind: 'server', info: 'What it is: the part of the database that decides how a query will run: with an index, or with a full table scan. EXPLAIN shows its plan.' },
        { id: 'buffer', label: 'Buffer pool', sub: 'pages in RAM', x: 180, y: 260, w: 150, kind: 'cache', info: 'What it is: the database memory that holds copies of pages. The upper levels of the B-tree always stay here, which makes lookups even faster. Wiped in a crash.' },
        { id: 'idx', label: 'B-tree index', sub: 'sorted pages', x: 90, y: 380, kind: 'data', info: 'What it is: a sorted copy of a column like email, in the shape of a B+ tree. Root → internal → leaf: the row address in 3-4 pages. It must also be updated on every write.' },
        { id: 'heap', label: 'Table pages', sub: 'heap / data files', x: 270, y: 380, kind: 'data', info: 'What it is: the pages on disk that hold the real rows. The index gave the address, and the row comes from here. Changed pages are written here at checkpoint time.' },
        { id: 'wal', label: 'WAL', sub: 'append + fsync', x: 180, y: 490, w: 150, kind: 'queue', info: 'What it is: the write-ahead log, an append-only diary on disk. COMMIT returns OK only after the record is fsynced here. After a crash, redo comes from it. Replicas and CDC read it too.' },
        { id: 'cl', label: 'Commit log', sub: 'append-only', x: 610, y: 150, kind: 'queue', info: 'What it is: Cassandra\'s WAL. Every write is first appended here (sequential, cheap). If a node crashes, the memtable is rebuilt from it. By default it is fsynced every 10 seconds (periodic mode).' },
        { id: 'mem', label: 'Memtable', sub: 'sorted, in RAM', x: 540, y: 260, kind: 'cache', info: 'What it is: a sorted table in memory. The write ends here, with OK to the client. When it is full, it is flushed to disk as one whole SSTable.' },
        { id: 'ss', label: 'SSTables', sub: 'immutable files', x: 450, y: 380, kind: 'data', info: 'What it is: sorted files on disk that never change. They are read from newest to oldest; the first match is the latest. Delete = tombstone.' },
        { id: 'bf', label: 'Bloom filters', sub: 'skip files', x: 630, y: 380, kind: 'cache', info: 'What it is: a small bit array per SSTable, in memory. By saying "definitely not here", it saves useless file reads. ~1% false positives at ~10 bits per key.' },
        { id: 'comp', label: 'Compaction', sub: 'merge + cleanup', x: 540, y: 490, kind: 'server', info: 'What it is: background work that merges several SSTables into one and removes old versions and tombstones. Better reads and disk space, at the cost of CPU and extra disk writes (write amplification).' },
      ],
      edges: [
        { a: 'app', b: 'planner', n: 1 },
        { a: 'planner', b: 'buffer', n: 2 },
        { a: 'buffer', b: 'idx', n: 3, label: 'lookup' },
        { a: 'buffer', b: 'heap', n: 4, label: 'pages' },
        { a: 'buffer', b: 'wal' },
        { a: 'wal', b: 'heap', kind: 'res', dashed: true, label: 'redo' },
        { a: 'app', b: 'cl' },
        { a: 'cl', b: 'mem' },
        { a: 'mem', b: 'ss', label: 'flush' },
        { a: 'app', b: 'mem', dashed: true, label: 'read', via: [[490, 105]] },
        { a: 'mem', b: 'bf', label: 'check' },
        { a: 'bf', b: 'ss' },
        { a: 'ss', b: 'comp', both: true, label: 'merge' },
      ],
      paths: [
        { name: 'Read via index', text: 'The login query: the planner chose the index, 3-4 B-tree pages from the buffer pool, then the row from a table page. No full scan.', go: ['app>planner>buffer>idx', 'buffer>heap'] },
        { name: 'Commit + crash', text: 'COMMIT: the change is appended to the WAL + fsynced, then OK. After a crash, on restart, redo from the WAL puts the data files right again.', go: ['app>planner>buffer>wal', 'wal>heap'] },
        { name: 'LSM write', text: 'Append to the commit log, insert into the memtable, OK. Later a flush makes an SSTable, and compaction merges files.', go: ['app>cl>mem>ss>comp'] },
        { name: 'LSM read', text: 'First the memtable. If not found, the Bloom filters tell which SSTables "maybe" have the key; only those are read.', go: ['app>mem>bf>ss'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A database reads and writes in pages. The cost of a job = how many pages.</li>
      <li>An index = a sorted copy (like a book index). Without an index, a full table scan: ~100,000 pages for 10 million rows; with an index, 3-4.</li>
      <li>B+ tree: wide (fanout 100+) and balanced; the leaves are linked, so range queries are fast too. When a page fills up it splits, and the tree grows from the top.</li>
      <li>A composite index (a, b, c) works through the leftmost prefix. Equality columns first, range last.</li>
      <li>Every index makes every write costlier. Only the indexes you need.</li>
      <li>LSM tree: commit log + memtable → SSTables → compaction. Writes are sequential and fast; Bloom filters help reads.</li>
      <li>B-tree vs LSM = a trade between read, write and space amplification. Read-heavy/transactions: B-tree. Write-heavy, access by key: LSM.</li>
      <li>WAL + fsync = Durability. OK only after the log is safe on disk. Async commit gives speed, but the last commits can be lost.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Index: a lookup reads ~log(N) pages instead of N rows; for 10 million rows, from a second down to under a millisecond',
      'Composite and covering indexes make multi-filter queries fast too',
      'LSM: very fast, sequential writes; perfect for write-heavy data',
      'WAL: data stays safe even in a crash after commit, and it is the base of replication and CDC',
    ], costs: [
      'Every index slows every write and uses memory and disk',
      'A composite index in the wrong order, or a query with a function on the column = a useless index',
      'LSM: reads touch several files, background compaction costs CPU and disk, tombstones',
      'Durability costs fsync latency; async commit gives speed, but risks losing data that was acknowledged',
    ]},
    { type: 'think', questions: [
      { q: 'An xyz.com query: WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20 (a user\'s latest posts). Which index?', a: 'A composite index (user_id, created_at). The user_id equality finds the right range, and inside it created_at is already sorted, so the database just reads 20 entries from the end, with no separate sort. Only (created_at) or only (user_id) would do half the job.' },
      { q: 'In Cassandra, a table has hundreds of thousands of rows deleted every day, and reads are slowly getting slower. Why?', a: 'Every delete is a tombstone. Tombstones stay in SSTables until compaction (and the grace period), and reads have to scan over them and skip them. Fix: change the data model (for example time-bucketed partitions that expire as a whole with a TTL), tune the compaction strategy, or avoid delete-heavy patterns.' },
      { q: 'A developer says: "Turn off synchronous_commit in Postgres, writes get 3 times faster." When yes, when no?', a: 'Yes: where losing the last ~sub-second of writes is fine (clickstream, view events, logs). No: money, orders, bookings, or anything whose OK the user has already seen. The good news: in Postgres this setting can be applied per transaction, so turn it off only for non-critical writes.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A table with 10 million rows, no index on email. What will WHERE email = ... do?', options: ['Binary search', 'Full table scan: it will read almost every page', 'Answer from the cache'], answer: 1, explain: 'Without an index, the database does not know where the row is, and uniqueness is not guaranteed either, so it reads all pages.' },
      { q: 'Index (country, city, age). For which query will this index NOT help directly?', options: ["WHERE country = 'IN'", "WHERE country = 'IN' AND city = 'Pune'", "WHERE city = 'Pune' AND age = 21"], answer: 2, explain: 'Leftmost prefix: without the country, the sorted order of the index cannot be used.' },
      { q: 'What is the main reason Cassandra writes are fast?', options: ['A B-tree page update on every write', 'Commit log append + memtable; only sequential flushes and compactions on disk', 'Writes never go to disk'], answer: 1, explain: 'LSM: no in-place random writes. (Durability comes from the commit log + replicas.)' },
      { q: 'What does the Bloom filter do during a GET in an LSM tree?', options: ['Compress the data', 'Tell that the key is definitely not in this SSTable, so the file is skipped', 'Remove tombstones'], answer: 1, explain: 'Its "no" is never wrong, so useless file reads are saved.' },
      { q: 'The server crashes right after COMMIT returned OK; the data pages were not written to disk yet. After the restart?', options: ['The transaction is lost', 'The transaction is back through WAL replay', 'The database is corrupted'], answer: 1, explain: 'OK was given only after the WAL fsync. Recovery redoes it.' },
      { q: 'In a B+ tree, a leaf page is full and a new insert arrives. What happens?', options: ['The new insert is rejected', 'The page breaks in two (a split), and the first key of the new page goes up to the page above', 'The whole tree is rebuilt'], answer: 1, explain: 'A page split. If the page above fills up, it splits too; if the root splits, the tree gets one level taller. That is why all leaves stay on the same level.' },
      { q: 'The Bloom filter said "the key may be here". The file was read and the key was not there. What is this called?', options: ['A false negative: it is a bug', 'A false positive: one wasted read, but not a wrong answer', 'A tombstone'], answer: 1, explain: 'A Bloom filter can be wrong on "maybe", never on "definitely not". Other keys had set those bits to 1.' },
      { q: 'In an LSM tree, one user write is written to disk several times (flush, then compactions). What is this called?', options: ['Read amplification', 'Write amplification', 'Space amplification'], answer: 1, explain: 'Write amplification. LSM is still fast because all these writes are big and sequential.' },
    ]},
    { type: 'sources', note: 'Version-specific facts were checked against these.', items: [
      { title: 'Write-Ahead Logging (WAL)', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/wal-intro.html', used: 'Log before data pages, redo/roll-forward recovery, sequential WAL fsync, group commit.' },
      { title: 'Asynchronous Commit', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/wal-async-commit.html', used: 'Risk window up to 3 × wal_writer_delay; data loss but not corruption; fsync=off is different and dangerous.' },
      { title: 'Storage Engine', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html', used: 'Commit log → memtable → SSTable write path; periodic commitlog sync (10 s default) vs batch; SSTable components incl. Bloom filter.' },
      { title: 'Bloom Filters', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/managing/operating/bloom_filters.html', used: 'Bloom filters say a partition is definitely not, or probably, in an SSTable; default bloom_filter_fp_chance 0.01 (0.1 for LeveledCompaction).' },
      { title: 'B-Tree Indexes', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/btree.html', used: 'B-tree is the default index type in Postgres; supports equality and range queries on sortable data.' },
      { title: 'innodb_flush_log_at_trx_commit and innodb_page_size', publisher: 'MySQL Reference Manual', official: true, url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html', used: 'Default 1 = fsync redo log at every commit; 0/2 can lose ~1 s; default 16 KB page size.' },
      { title: 'The Log-Structured Merge-Tree (LSM-Tree)', publisher: "O'Neil, Cheng, Gawlick, O'Neil, Acta Informatica (1996)", url: 'https://www.cs.umb.edu/~poneil/lsmtree.pdf', used: 'Original LSM idea: buffer writes in memory, merge into sorted disk components.' },
    ]},
  ],
});
