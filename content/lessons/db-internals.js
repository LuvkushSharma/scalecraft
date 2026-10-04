Lesson.register({
  id: 'db-internals',
  title: 'Indexes, B-tree aur LSM tree',
  minutes: 34,
  summary: `Database andar se kaise kaam karta hai, sirf utna jitna design ke liye zaroori hai. Index kya hai aur B+ tree kaise 10 crore rows mein se ek row 3-4 page reads mein dhoondh leta hai; composite index aur leftmost prefix; har index ki write cost; LSM tree (Cassandra itni tez writes kaise karta hai); aur write-ahead log, jisse COMMIT ke baad crash hone pe bhi data bachta hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Database ke andar crore rows hain. Usme se ek row dhoondhni hai, jaldi.<br>Agar database har row ek ek karke padhe, to bahut der lagegi. Isliye wo kitaab ke peeche wale "index" jaisa ek sorted list banata hai.<br>Kuch databases ko padhna kam, likhna bahut hota hai (chat, location). Unke liye ek alag tareeka hai: pehle RAM mein jama karo, phir ek saath disk pe likho.<br>Aur ek "diary" (log) rakhte hain, taaki bijli jaane pe bhi pakka kiya hua data na khoye. Ye teeno cheezein is lesson mein.` },
    { type: 'h2', text: 'Problem: login query slow ho gayi' },
    { type: 'p', html: `xyz.com ki <code>users</code> table mein ab 1 crore (10 million) users hain. Login pe ye query chalti hai:` },
    { type: 'code', text: `SELECT * FROM users WHERE email = 'riya@example.com';` },
    { type: 'p', html: `Pehle ye 2 ms mein hoti thi. Ab lagbhag 1 second, aur login pe har second sau-do sau aisi queries aati hain. Cache yahan madad nahi karega: har user apne email se ek-do baar hi login karta hai, hit rate kam rahega. Problem cache ki nahi, database ke <em>dhoondhne ke tareeke</em> ki hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Page', html: `<strong>Ye kya hai:</strong> database disk se ek-ek row nahi padhta. Wo data ko fixed size ke blocks mein rakhta hai, jinhe <strong>page</strong> kehte hain (PostgreSQL mein 8 KB, MySQL InnoDB mein default 16 KB). Ek page mein kai rows hoti hain, jaise kitaab ke ek panne pe kai lines.<br><strong>Kyun chahiye:</strong> disk se ek chhota tukda padhna aur ek poora page padhna lagbhag ek jitna time leta hai. To database hamesha poora page ek saath padhta aur likhta hai.<br><strong>Iske bina (ek ek row padhna):</strong> har row ke liye alag disk trip. Bahut slow.<br>Isliye yaad rakho: database ka kaam kitna mehenga hai, ye mostly is baat se tay hota hai ki <strong>kitne pages</strong> padhne pade.` },
    { type: 'p', html: `Bina kisi madad ke database ko nahi pata ki Riya ki row kis page mein hai. To wo <strong>har page</strong> padhta hai aur har row ka email check karta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Full table scan', html: `<strong>Ye kya hai:</strong> table ke saare pages shuru se aakhir tak padhna, har row check karna. Postgres ke <code>EXPLAIN</code> mein ye "Seq Scan" dikhta hai.<br><strong>Kab theek hai:</strong> chhoti table, ya jab query ko waise bhi aadhi table chahiye.<br><strong>Problem:</strong> 1 crore rows, ~100 rows per page = 1 lakh pages, sirf ek user dhoondhne ke liye. Aur email unique hone ki guarantee database ko nahi di gayi, to wo pehla match milne pe bhi ruk nahi sakta: shayad aage doosri row bhi isi email ki ho.` },
    { type: 'callout', tone: 'analogy', title: 'Kitaab ka index', html: `Ek 1,000 page ki computer science ki kitaab mein "hashing" dhoondhna hai. Ek tareeka: page 1 se 1,000 tak padho (full scan). Doosra: peeche ka <strong>index</strong> kholo. Wahan shabd alphabetically sorted hain: "hashing → page 412". Sorted hai, isliye "h" tak seedha pahunch jaate ho. Database index bilkul yahi hai.` },
    { type: 'image', src: 'assets/img/db-internals/book-index.jpg', alt: 'Ek purani encyclopedia ka index page: shabd alphabetical order mein, har shabd ke aage volume aur page number', caption: 'Asli kitaab ka index (1919 ki ek encyclopedia): har shabd sorted, aage page number. Database index bhi yahi karta hai: value sorted, aage row ka pata.', maxWidth: 420, credit: { text: 'Randal Oulton, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Book_of_Knowledge_1919_Vol_20,_General_Index_Start.jpg', license: 'CC0' } },
    { type: 'callout', tone: 'term', title: 'Naya word: Index (database)', html: `<strong>Ye kya hai:</strong> table ke ek (ya zyada) column ki ek alag, <strong>sorted</strong> copy. Har entry mein value aur us row ka pata: "riya@example.com → page 52,018, row 7".<br><strong>Kyun chahiye:</strong> sorted list mein dhoondhna bahut tez hai. Crore rows mein se ek row kuch hi pages padh ke mil jaati hai.<br><strong>Iske bina:</strong> har login pe full table scan. Users badhenge, login utna hi slow.<br><strong>Keemat:</strong> index ek extra copy hai. Har insert/update pe use bhi badalna padta hai (neeche dekhoge).` },
    { type: 'h2', text: 'B-tree aur B+ tree: index andar se' },
    { type: 'p', html: `Postgres aur MySQL ka default index <strong>B-tree</strong> hai (asal mein uska variant <strong>B+ tree</strong>). Ise ek ulta ped samjho: upar ek <em>root</em> page, beech mein <em>internal</em> pages, neeche <em>leaf</em> pages. Har page sorted hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: B+ tree', html: `<strong>Ye kya hai:</strong> ek sorted, balanced tree jahan har node ek <strong>page</strong> hai. Upar ke (internal) pages mein sirf "signboards" hote hain, jaise "50 se kam: left jao, 50-94: beech, 95+: right". Asli entries sirf neeche ke <strong>leaf</strong> pages mein. Leaves aapas mein left-to-right jude hote hain, taaki range queries (<code>WHERE age BETWEEN 18 AND 25</code>) ek leaf se agle leaf pe chalti jaayein. "Balanced" matlab har leaf root se same doori pe, to har lookup ka cost same.<br><strong>Kyun chahiye:</strong> signboards follow karke 3-4 pages mein kisi bhi value tak pahunch jaate ho, chahe table mein arabon rows hon.<br><strong>Iske bina:</strong> ek simple sorted list ko disk pe rakhna mushkil hai: beech mein naya naam daalne ke liye aadhi list khiskaani padti. B+ tree har page mein thodi khaali jagah rakhta hai, aur bhar jaaye to page ko do mein tod deta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Fanout', html: `<strong>Ye kya hai:</strong> ek internal page se kitne bachche (child pages) nikalte hain. Ek 8-16 KB page mein sau se zyada signboards aa jaate hain, to fanout sau se zyada.<br><strong>Kyun zaroori:</strong> har level pe search ka area sau guna chhota ho jaata hai. 100 × 100 × 100 = 10 lakh. Teen-chaar levels mein crore-arab rows.<br><strong>Agar fanout chhota hota (jaise 2, binary tree):</strong> 1 crore rows ke liye ~24 levels, yaani 24 disk reads. Isliye databases binary tree nahi, "chaude" B+ trees use karte hain.` },
    { type: 'p', html: `Neeche chhota sa tree hai (har page mein sirf 3 keys, taaki screen pe dikhe). Ek user ID dhoondho, pehle index se, phir bina index ke:` },
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
          <label style="max-width:200px">User ID dhoondho (2-54)<input class="bt-k" type="number" min="1" max="56" value="30"></label>
          <button type="button" class="btn small primary bt-next">Agla page padho</button>
          <button type="button" class="btn small ghost bt-all">Poora chalao</button>
        </div>
        <div class="stage" style="margin:12px 0 0"><svg class="bt-svg" viewBox="0 0 720 230" style="display:block;width:100%;min-width:560px;height:auto" role="img" aria-label="B+ tree lookup"></svg></div><div style="font-size:12px;color:var(--ink-3);margin-top:4px">Phone pe tree chauda hai: side mein swipe karo.</div>
        <div class="stats"><div class="stat"><span>Pages padhe</span><strong class="bt-p"></strong></div><div class="stat"><span>Result</span><strong class="bt-r"></strong></div></div>
        <div class="bt-n calc-note"></div>`;
      const q = s => el.querySelector(s);
      const box = (x, y, w, txt, st) => {
        const f = st === 'now' ? 'var(--accent-soft)' : st === 'done' ? 'var(--surface-2)' : 'var(--surface)';
        const s = st === 'now' ? 'var(--accent)' : st === 'found' ? 'var(--green)' : 'var(--line-2)';
        return `<rect x="${x}" y="${y}" width="${w}" height="36" rx="6" fill="${st === 'found' ? 'var(--accent-soft)' : f}" stroke="${s}" stroke-width="${st ? 2.5 : 1}"></rect><text x="${x + w / 2}" y="${y + 23}" text-anchor="middle" font-size="15" font-family="var(--f-mono)" fill="var(--ink)">${txt}</text>`;
      };
      const draw = () => {
        q('.bt-m').innerHTML = '';
        [['idx', 'Index se (B+ tree)'], ['scan', 'Bina index (full scan)']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (mode === k ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = k; step = 0; draw(); }; q('.bt-m').appendChild(b); });
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
          const msgs = ['Root se shuru.', `Root: ${key} ${key < 20 ? '< 20 → left' : key < 38 ? '20 se 37 ke beech → beech wala' : '≥ 38 → right'} child.`, `Internal page ne leaf ${j + 1} ki taraf bheja.`, found ? `Leaf mein ${key} mil gaya. Sirf 3 pages!` : `Leaf mein ${key} nahi hai. 3 pages mein pakka pata chal gaya ki row exist nahi karti.`];
          q('.bt-n').textContent = msgs[Math.min(step, 3)];
          if (step >= 3) res = found ? 'mila' : 'nahi hai';
        } else {
          total = 9;
          for (let m = 0; m < 9; m++) s += box(lx(m), 100, 70, heap(m).join(' '), step > m ? (heap(m).includes(key) ? 'found' : step === m + 1 ? 'now' : 'done') : '');
          s += `<text x="8" y="90" font-size="12" fill="var(--ink-3)">table pages (insert order, sorted nahi)</text>`;
          const hitAt = sh.indexOf(key) >= 0 ? Math.floor(sh.indexOf(key) / 3) + 1 : 0;
          q('.bt-n').textContent = step === 0 ? 'Table ke pages insert order mein hain. Database ko har page padhna padega.' : step < 9 ? `Page ${step} padha.` + (hitAt && step >= hitAt ? ` Match page ${hitAt} pe mila, lekin aur matches ho sakte hain, isliye scan jaari.` : '') : `Saare 9 pages padhe. Index wale tareeke se 3 guna zyada. Asli table mein ye farak lakhon guna hota hai (neeche calculator).`;
          if (step >= 9) res = found ? 'mila' : 'nahi hai';
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
    { type: 'p', html: `Ab asli numbers. Rows ki ginti badlo aur dekho dono tareekon mein kitne pages padhne padte hain:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Table mein rows: <strong class="bs-nv"></strong><input class="bs-n" type="range" min="3" max="10" step="1" value="7"></label>
        <div class="stats">
          <div class="stat"><span>Full scan: pages</span><strong class="bs-sp"></strong></div>
          <div class="stat"><span>Full scan: time</span><strong class="bs-st"></strong></div>
          <div class="stat"><span>B+ tree: levels (pages)</span><strong class="bs-ip"></strong></div>
          <div class="stat"><span>B+ tree: time</span><strong class="bs-it"></strong></div>
        </div>
        <div class="calc-note">Assumptions: 100 rows per leaf page, har internal page mein 300 signboards (fanout), 8 KB pages. Full scan disk se ~1 GB/s sequential padhta hai. Index lookup ka har page ek random SSD read (~0.1 ms) maana, jo worst case hai: asal mein upar ke levels hamesha RAM mein cached rehte hain.</div>`;
      const q = s => el.querySelector(s);
      const names = { 3: '1 hazaar', 4: '10 hazaar', 5: '1 lakh', 6: '10 lakh', 7: '1 crore', 8: '10 crore', 9: '100 crore (1 billion)', 10: '1,000 crore' };
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
    { type: 'p', html: `1 crore rows pe full scan ~1 lakh pages (lagbhag ek second), index se 4 pages (half millisecond se kam). 1,000 guna zyada data pe bhi index sirf ek level badhta hai. Isliye <strong>"Scaling reads" ka pehla kadam hamesha index hai</strong>, cache aur replicas baad mein.` },
    { type: 'code', text: `CREATE UNIQUE INDEX users_email_idx ON users (email);

EXPLAIN SELECT * FROM users WHERE email = 'riya@example.com';
--  Index Scan using users_email_idx on users   (pehle: Seq Scan on users)` },
    { type: 'callout', tone: 'tip', html: `<code>EXPLAIN</code> (aur <code>EXPLAIN ANALYZE</code>) batata hai ki database query kaise chalayega. "Seq Scan" (Postgres) ya "type: ALL" (MySQL) ek badi table pe dikhe to index check karo.` },
    { type: 'callout', tone: 'term', title: 'Clustered vs secondary index', html: `<strong>Ye kya hai:</strong> MySQL InnoDB mein table khud primary key ke B+ tree mein rehti hai. Isko <strong>clustered index</strong> kehte hain: leaf mein poori row. Baaki indexes (<strong>secondary</strong>) ke leaf mein sirf primary key hoti hai. To email index se pehle id milti hai, phir primary tree mein row (ek extra lookup). Postgres mein rows ek alag file mein rehti hain jise <strong>heap</strong> kehte hain (bina order ka dher), aur har index row ka physical pata rakhta hai.<br><strong>Design ke liye:</strong> farak chhota hai. Dono mein lookup kuch hi pages ka (~log N).` },

    { type: 'h3', text: 'Composite index aur leftmost prefix' },
    { type: 'p', html: `Index kai columns pe bhi ban sakta hai: <code>CREATE INDEX ON users (country, city, age)</code>. Ye entries ko pehle country se sort karta hai, same country mein city se, same city mein age se. Jaise phone directory: surname, phir first name. Directory surname se dhoondhne mein kaam aati hai, sirf first name se nahi. Isko <strong>leftmost prefix rule</strong> kehte hain. Columns chuno aur dekho index kitna kaam aata hai:` },
    { type: 'custom', render(el) {
      const COLS = ['country', 'city', 'age'];
      const COND = { country: "country = 'IN'", city: "city = 'Pune'", age: 'age = 21', ager: 'age > 18' };
      let on = { country: true, city: true, age: false }, ageRange = false;
      el.innerHTML = `<div class="ci-c" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input class="ci-r" type="checkbox"> age ke liye equality (age = 21). Untick karo to range (age &gt; 18)</label>
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
        if (!conds.length) msg = 'Koi condition nahi: poori table chahiye, index ka koi faayda nahi.';
        else if (!used.length) msg = 'Index kaam nahi aayega (seedha). Index pehle country se sorted hai; country diye bina city/age wali entries poore index mein bikhri hain. Is query ke liye alag index chahiye, jaise (city) ya (city, age).';
        else if (used.length === conds.length) msg = `Index poora kaam aaya: (${used.join(', ')}) prefix se seedha sahi range mil gayi.`;
        else msg = `Index sirf (${used.join(', ')}) tak kaam aaya. Baaki condition us range ki entries ko ek ek check karke filter hogi.` + (on.city === false && on.age ? ' Beech ka column (city) chhoot gaya, to age ke liye sorted order nahi bacha.' : '');
        q('.ci-o').textContent = msg;
      };
      q('.ci-r').addEventListener('change', draw);
      draw();
    }},
    { type: 'p', html: `Do aur baatein: equality wale columns pehle, range wala (<code>&gt;</code>, <code>BETWEEN</code>) baad mein rakho, kyunki range ke baad wale columns ka sorted order kaam nahi aata. Aur agar index mein query ke <em>saare</em> columns hain (<strong>covering index</strong>), to database table ko chhoota hi nahi, sirf index se jawab de deta hai.` },
    { type: 'h3', text: 'Index free nahi hai: write cost' },
    { type: 'p', html: `Har index ek alag sorted copy hai jise database ko <em>har write pe</em> sambhaalna padta hai. <code>users</code> table pe 5 indexes hain to ek naye user ka INSERT asal mein 6 jagah likhna hai: table + 5 B-trees. Update mein agar indexed column badla, to purani entry hatao, nayi daalo. Page full ho gaya to <strong>page split</strong>: aadhi entries naye page mein. Upar se, har index disk aur RAM (cache) mein jagah leta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Page split', html: `<strong>Ye kya hai:</strong> jab kisi leaf page mein aur jagah nahi bachti, database use do pages mein tod deta hai: aadhi entries purane page mein, aadhi naye mein. Naye page ka "signboard" (pehli key) upar wale page mein jod diya jaata hai. Upar wala bhi bhar jaaye to wo bhi toot-ta hai. Root toota to tree ek level ooncha ho jaata hai.<br><strong>Kyun chahiye:</strong> isi se tree hamesha sorted aur balanced rehta hai, chahe kitne bhi inserts hon.<br><strong>Keemat:</strong> ek insert jo aam taur pe 1 page likhta hai, split pe 3 ya zyada pages likhta hai.` },
    { type: 'p', html: `Khud B+ tree banao. Is chhote tree mein har page mein max 3 keys aati hain. "Agla insert" dabate jao aur splits dekho. Kisi bhi number ko dhoondh bhi sakte ho:` },
    { type: 'custom', render(el) {
      const T = { next: 'Agla insert', ins: 'Insert karo', find: 'Dhoondho', reset: 'Reset', num: 'Number (1-99)', levels: 'Levels', pages: 'Kul pages', wrote: 'Is baar pages likhe', read: 'Is baar pages padhe',
        start: 'Tree khaali hai. "Agla insert" dabao.', dup: k => `${k} pehle se tree mein hai. Index mein duplicate nahi daala.`, full: 'Demo ke liye 16 keys tak. Reset karo.',
        plain: (k, p) => `${k} daala. Leaf mein jagah thi: sirf 1 page likha. Raasta: ${p} pages padhe.`,
        split: (k, s, r) => `${k} daala. Leaf mein 4 keys ho gayin (max 3), to <strong>page split</strong>: ${s} split hue.` + (r ? ' Root bhi toota, to tree ek <strong>level ooncha</strong> ho gaya.' : '') + ' Isliye zyada pages likhne pade.',
        hit: (k, p) => `${k} mila. ${p} pages padhe (har level pe ek).`, miss: (k, p) => `${k} tree mein nahi hai. ${p} pages padh ke pakka pata chal gaya.`, seq: 'Agla number', hint: 'Phone pe tree chauda ho sakta hai: side mein swipe karo. Neela border = is baar chhue gaye pages.' };
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
    { type: 'p', html: `Dhyaan do: zyada tar inserts sirf 1 page likhte hain. Kabhi kabhi split hota hai aur 3-5 pages likhne padte hain. Tree <em>neeche</em> nahi, <em>upar</em> se badhta hai (root toot-ta hai), isliye saari leaves hamesha ek hi level pe rehti hain.` },
    { type: 'table', head: ['Index lagao jab', 'Index mat lagao jab'], rows: [
      ['Column WHERE, JOIN ya ORDER BY mein baar baar aata hai', 'Koi query us column se filter hi nahi karti'],
      ['Badi table, aur query thodi si rows chahti hai', 'Chhoti table (kuch hazaar rows): scan hi fast hai'],
      ['Uniqueness ki guarantee chahiye (UNIQUE index)', 'Column mein bahut kam alag values (jaise is_active true/false) aur query aadhi table maangti hai'],
      ['Read-heavy table', 'Bahut write-heavy table jahan har extra index writes ko dheema karega'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Har column pe index laga do, sab fast ho jaayega." Reads shayad, lekin har write dheema, aur RAM indexes se bhar jaati hai. Doosri galti: index hai, phir bhi use nahi hota. <code>WHERE LOWER(email) = ...</code> pe normal email index kaam nahi karta (column pe function laga diya); uske liye expression index chahiye. Aur <code>LIKE '%riya'</code> (shuru mein wildcard) B-tree ke sorted order ka faayda nahi le sakta.` },

    { type: 'h2', text: 'LSM tree: jab writes hi writes hon' },
    { type: 'p', html: `Naya feature: xyz.com pe live location sharing aur chat. Har second <strong>lakhon chhote writes</strong>. B-tree har write ko sahi leaf page mein <em>usi jagah</em> (in place) daalta hai. Lakhon writes = disk pe lakhon alag alag jagah chhote updates, page splits, aur har index ka bhi yahi haal.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Sequential vs random write', html: `<strong>Ye kya hai:</strong> <strong>sequential</strong> = disk pe ek ke baad ek, lagataar likhna (jaise notebook mein agli line pe likhte jaana). <strong>Random</strong> = har baar disk ki kisi alag jagah jaa ke chhota sa badlav (jaise 500 alag panno pe ek ek shabd badalna).<br><strong>Kyun farak padta hai:</strong> purani hard disk mein ek ghoomti plate aur ek hilne wala "head" hota hai (neeche photo). Random write ke liye head ko har baar sahi jagah tak khisakna aur plate ke ghoomne ka wait karna padta hai, milliseconds. Sequential mein head bas likhta jaata hai. SSD mein koi hilne wala hissa nahi, phir bhi wahan bhi bade sequential writes chhote random writes se sasta padte hain.<br><strong>Iska matlab:</strong> agar lakhon chhote random writes ko ek bade sequential write mein badal do, to wahi disk kahin zyada writes sambhaal legi. LSM tree yahi karta hai.` },
    { type: 'image', src: 'assets/img/db-internals/hdd-inside.jpg', alt: 'Khuli hui hard disk: chamakti gol plate (platter) aur uske upar ek patli arm jiske sire pe read/write head hai', caption: 'Hard disk ke andar: ghoomti plate aur arm pe laga head. Random write = har baar arm ko nayi jagah le jaana. Isliye disks ko lagataar (sequential) likhna pasand hai.', credit: { text: 'Eric Gaba (Sting), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Seagate_ST33232A_hard_disk_inner_view.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'callout', tone: 'term', title: 'Naya word: LSM tree (Log-Structured Merge tree)', html: `<strong>Ye kya hai:</strong> ek storage design jo disk pe likhi file ko kabhi edit nahi karta. Naye writes pehle RAM mein ek sorted table mein jaate hain, jise <strong>memtable</strong> kehte hain. Memtable bhar gayi to poori ki poori disk pe ek nayi, sorted file ban jaati hai. Ye file phir kabhi badalti nahi (<strong>immutable</strong>). Is file ko <strong>SSTable</strong> (Sorted String Table) kehte hain. Background mein <strong>compaction</strong> chhoti SSTables ko jod (merge) ke badi banata hai.<br><strong>Kyun chahiye:</strong> lakhon chhote random writes ki jagah, kabhi kabhi ek bada sequential write. Writes bahut sasti ho jaati hain.<br><strong>Iske bina:</strong> write-heavy data (chat, location, events) B-tree pe disk ko random writes mein dubo deta hai.<br><strong>Real products:</strong> Cassandra, ScyllaDB, RocksDB, LevelDB, HBase aur Bigtable is family mein hain.` },
    { type: 'steps', items: [
      { t: 'Commit log mein append', d: 'Durability ke liye write pehle ek append-only log mein (sequential, sasta). Crash hua to memtable isi se wapas banegi.' },
      { t: 'Memtable mein daalo', d: 'RAM mein sorted structure. Write yahin khatam: client ko OK. Koi disk seek nahi, koi page split nahi.' },
      { t: 'Flush', d: 'Memtable full → ek nayi SSTable file ek baar mein sequentially likh do. Purani files ko chhuo mat.' },
      { t: 'Read', d: 'Pehle memtable, phir SSTables naye se purane. Jo pehle mile wahi latest. Har SSTable ke saath ek Bloom filter hota hai jo bata deta hai "ye key yahan pakka NAHI hai", taaki bekaar files padhni na padein.' },
      { t: 'Compaction', d: 'Kai SSTables ko merge karke ek. Purane versions aur deleted keys (tombstones) hata do. Isse reads fast rehte hain aur disk jagah wapas milti hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Tombstone', html: `<strong>Ye kya hai:</strong> LSM mein purani file badal nahi sakte, to delete bhi ek naya write hai: "key c deleted" ka ek marker. Isko <strong>tombstone</strong> (kabr ka patthar) kehte hain. Purani SSTable mein c abhi bhi pada hai, lekin tombstone naya hai, isliye wo jeet-ta hai.<br><strong>Kyun chahiye:</strong> bina purani file chhuye delete ho jaata hai.<br><strong>Keemat:</strong> compaction tak tombstone aur purana data dono disk pe pade rehte hain, aur reads ko unhe paar karna padta hai. Cassandra unhe ek grace period ke baad hi hatata hai, taaki delete doosri copies (replicas) tak bhi pahunch jaaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Bloom filter', html: `<strong>Ye kya hai:</strong> har SSTable ke saath RAM mein rakha ek chhota bit-array (0 aur 1 ki line). Ye ek sawaal ka jawab deta hai: "kya key X is file mein hai?" Jawab do hi tarah ka: <strong>"pakka nahi hai"</strong> ya <strong>"shayad hai"</strong>. "Nahi" kabhi galat nahi hota. "Shayad" kabhi kabhi galat hota hai (<strong>false positive</strong>).<br><strong>Kyun chahiye:</strong> ek GET ko shayad 10 SSTables dekhni padein. Bloom filter RAM mein hi bata deta hai ki 9 mein key pakka nahi hai. Disk se sirf 1 file padhni padti hai.<br><strong>Iske bina:</strong> har GET pe har SSTable disk se kholni padti. Jitni zyada files, utne slow reads.` },
    { type: 'p', html: `Bloom filter andar se kaise kaam karta hai, khud dekho. Is SSTable mein 4 keys hain. Har key ke liye 2 hash functions 16 mein se 2 bits ko 1 kar dete hain (hash function = ek formula jo key ko ek number mein badal deta hai). Dhoondhte waqt wahi 2 bits check hote hain: koi bhi 0 mila to "pakka nahi".` },
    { type: 'custom', render(el) {
      const T = { set: 'SSTable-1 mein keys', ask: 'GET', bits: 'Bloom filter (16 bits)', skipped: 'Files skip hui', wasted: 'Bekaar file reads', found: 'Mili', own: 'Apni key', go: 'Check karo',
        no: (k, b) => `"${k}": bit ${b} = 0. Matlab key yahan <strong>pakka nahi</strong> hai. Disk pe file kholi hi nahi. Ek read bacha.`,
        yes: k => `"${k}": dono bits 1 hain → "shayad hai". File padhi → <strong>mil gayi</strong>.`,
        fp: k => `"${k}": dono bits 1 hain → "shayad hai". File padhi → key nahi mili! Ye <strong>false positive</strong> hai: in bits ko doosri keys ne 1 kiya tha. Ek bekaar read, lekin galat answer kabhi nahi.`,
        start: 'Upar se koi key chuno.', real: 'Asli filter: bits per key', fpr: 'False positive chance', hk: 'Hash functions', mem: 'RAM, 10 crore keys ke liye',
        note: 'Formula: (1 − e^(−k/b))^k, b = bits per key, k = hash functions. Cassandra ka default target 1% hai (LeveledCompaction mein 10%).' };
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
    { type: 'p', html: `"nina" try kiya? Uske dono bits doosri keys ne 1 kar diye the, to filter ne "shayad" bola aur ek bekaar read hua. Lekin ulta kabhi nahi hota: jo key file mein hai, uske bits hamesha 1 honge. Asli Bloom filter mein ~10 bits per key se false positive lagbhag 1% reh jaata hai. Bloom filters ka poora gyaan "Data structures for scale" lesson mein.` },
    { type: 'p', html: `Step by step chala ke dekho. Har button dabane pe ek operation chalega: writes, flush, reads aur compaction:` },
    { type: 'custom', render(el) {
      const OPS = [['put', 'a', 1], ['put', 'c', 3], ['put', 'b', 2], ['flush'], ['put', 'a', 9], ['put', 'd', 4], ['del', 'c'], ['flush'], ['get', 'a'], ['get', 'b'], ['get', 'c'], ['get', 'z'], ['compact'], ['get', 'b']];
      const lbl = o => o[0] === 'put' ? `PUT ${o[1]}=${o[2]}` : o[0] === 'del' ? `DELETE ${o[1]}` : o[0] === 'get' ? `GET ${o[1]}` : o[0].toUpperCase();
      let i = 0;
      const run = n => {
        let mem = {}, ss = [], uw = 0, dw = 0, msg = 'Shuru: memtable aur disk dono khaali.', reads = '-', nm = 0;
        for (let k = 0; k < n; k++) {
          const o = OPS[k];
          if (o[0] === 'put' || o[0] === 'del') { mem[o[1]] = o[0] === 'del' ? '†' : o[2]; uw++; msg = `${lbl(o)}: commit log mein append + memtable mein. Disk pe koi random write nahi. Client ko turant OK.`; }
          else if (o[0] === 'flush') { const e = Object.keys(mem).sort().map(x => [x, mem[x]]); ss.unshift({ name: 'SSTable-' + (++nm), e }); dw += e.length; mem = {}; msg = `Memtable bhar gayi → ${e.length} entries ek nayi sorted file (SSTable-${nm}) mein ek baar mein likhi. Purani files ko chhuha bhi nahi.`; }
          else if (o[0] === 'compact') { const m = {}; ss.slice().reverse().forEach(s => s.e.forEach(([x, v]) => m[x] = v)); const e = Object.keys(m).sort().filter(x => m[x] !== '†').map(x => [x, m[x]]); dw += e.length; ss = [{ name: 'SSTable-' + (++nm), e }]; msg = `Compaction: saari SSTables merge. Har key ka sirf latest version bacha; purana a=1 aur tombstone wala c dono hata diye. ${e.length} entries nayi file mein likhi (ye bhi disk write hai: write amplification).`; }
          else if (o[0] === 'get') {
            const key = o[1];
            if (key in mem) { reads = 0; msg = `GET ${key}: memtable mein mila.`; continue; }
            let r = 0, res = null, skipped = [];
            for (const s of ss) { const has = s.e.find(x => x[0] === key); if (!has) { skipped.push(s.name); continue; } r++; res = has[1]; break; }
            reads = r;
            msg = `GET ${key}: memtable mein nahi. ` + (skipped.length ? `Bloom filter ne ${skipped.join(', ')} ko skip karwa diya ("pakka nahi hai"). ` : '') + (res === null ? `Kahin nahi mila → not found, ${r} file reads.` : res === '†' ? `Naye SSTable mein tombstone mila → key deleted hai, purani file dekhne ki zaroorat nahi. Not found.` : `Mila: ${key}=${res} (${r} file read). Naye se purane ki taraf dhoondha, pehla match hi latest.`);
          }
        }
        return { mem, ss, uw, dw, msg, reads };
      };
      el.innerHTML = `<div class="lsm-ops" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:14px">
          <div><div style="font-size:13px;color:var(--ink-3)">RAM: memtable</div><div class="lsm-mem"></div></div>
          <div><div style="font-size:13px;color:var(--ink-3)">Disk: SSTables (naya upar)</div><div class="lsm-ss" style="display:grid;gap:8px"></div></div>
        </div>
        <div class="lsm-msg calc-note" style="min-height:3em"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small primary lsm-next">Agla operation</button><button type="button" class="btn small ghost lsm-reset">Reset</button></div>
        <div class="stats"><div class="stat"><span>User writes</span><strong class="lsm-uw"></strong></div><div class="stat"><span>Entries disk pe likhi</span><strong class="lsm-dw"></strong></div><div class="stat"><span>Last GET: files padhi</span><strong class="lsm-r"></strong></div></div>
        <div class="calc-note">Demo mein Bloom filter exact hai. Asli Bloom filter kabhi kabhi "shayad" galat bolta hai (ek bekaar file read), lekin "nahi" kabhi galat nahi. Commit log ke writes ginti mein nahi liye.</div>`;
      const q = s => el.querySelector(s);
      const card = (title, entries) => `<div style="border:1px solid var(--data-s);background:var(--data-f);border-radius:var(--r-sm);padding:6px 8px"><div style="font:600 12px var(--f-mono);color:var(--data-t)">${title}</div><div style="font:14px var(--f-mono);color:var(--ink)">${entries.length ? entries.map(([k, v]) => `${k}=${v}`).join('  ') : '(khaali)'}</div></div>`;
      const draw = () => {
        q('.lsm-ops').innerHTML = OPS.map((o, k) => `<span style="font:12px var(--f-mono);padding:3px 7px;border-radius:var(--r-sm);border:1px solid ${k === i - 1 ? 'var(--accent)' : 'var(--line)'};background:${k === i - 1 ? 'var(--accent-soft)' : 'transparent'};color:${k < i ? 'var(--ink)' : 'var(--ink-3)'}">${lbl(o)}</span>`).join('');
        const r = run(i);
        q('.lsm-mem').innerHTML = card('memtable', Object.keys(r.mem).sort().map(x => [x, r.mem[x]]));
        q('.lsm-ss').innerHTML = r.ss.length ? r.ss.map(s => card(s.name, s.e)).join('') : '<div style="font-size:13px;color:var(--ink-3)">abhi koi file nahi</div>';
        q('.lsm-msg').textContent = r.msg;
        q('.lsm-uw').textContent = r.uw; q('.lsm-dw').textContent = r.dw; q('.lsm-r').textContent = r.reads;
        q('.lsm-next').disabled = i >= OPS.length;
      };
      q('.lsm-next').onclick = () => { i++; draw(); };
      q('.lsm-reset').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'p', html: `End mein dekho: 6 user writes, lekin disk pe 9 entries likhi gayi (3 + 3 flush mein, 3 compaction mein). Ye extra likhna <strong>write amplification</strong> hai. Asli systems mein data kai baar compact hota hai, to ye number aur bada hota hai, lekin saare writes sequential hain, isliye phir bhi sasta.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Teen amplifications', html: `<strong>Ye kya hai:</strong> "amplification" = kaam ka badh jaana. Teen tarah ka hota hai:<br><strong>Write amplification</strong>: tumne 1 cheez likhi, disk pe usse kitna zyada likha gaya.<br><strong>Read amplification</strong>: 1 cheez padhne ke liye kitni files/pages dekhni padin.<br><strong>Space amplification</strong>: asli data se kitni zyada disk bhari (purane versions, tombstones, aadhe khaali pages).<br><strong>Kyun zaroori:</strong> koi bhi storage engine teeno ko ek saath kam nahi kar sakta. Ek ghatao, to doosra badhta hai. Isi se tay hota hai ki kaunsa engine kis kaam ke liye.<br>LSM mein compaction strategy inke beech ka balance hai: zyada compaction = reads aur space behtar, writes mehenge. Cassandra 5.0 mein aayi Unified Compaction Strategy (UCS) isi balance ko ek tunable setting bana deti hai.` },
    { type: 'table', head: ['', 'B-tree (Postgres, MySQL)', 'LSM tree (Cassandra, RocksDB)'], caption: 'Andaaze ke liye. Asli numbers workload aur settings pe depend karte hain.', rows: [
      ['<strong>Write amp</strong>', 'Ek 100 byte ki row badli, to bhi poora page (8-16 KB) dobara likha jaata hai, upar se WAL. Chhote random writes pe ye bahut zyada', 'Har entry kai baar likhi jaati hai (flush, phir har compaction mein). Lekin sab sequential, isliye sasta'],
      ['<strong>Read amp</strong>', 'Kam aur pakka: 3-4 pages (upar ke levels aksar RAM mein)', 'Zyada: memtable + kai SSTables. Bloom filters aur compaction ise kam karte hain'],
      ['<strong>Space amp</strong>', 'Pages aksar poore bhare nahi hote (split ke baad aadhe khaali)', 'Compaction tak purane versions aur tombstones disk pe pade rehte hain'],
    ]},
    { type: 'h3', text: 'Cassandra itni tez writes kaise karta hai?' },
    { type: 'list', items: [
      'Write ka kaam sirf do sasti cheezein: commit log mein <strong>append</strong> (sequential) aur RAM ki memtable mein insert. Koi read-before-write nahi, koi page dhoondhna nahi.',
      'Disk pe kabhi in-place update nahi; flush aur compaction badi sequential files likhte hain, jo disks ke liye sabse efficient hai.',
      'Ek aur twist: Cassandra ka commit log default <strong>periodic</strong> mode mein har 10 second pe fsync hota hai (fsync = data ko sach mein disk pe pakka karna; neeche WAL section mein detail), aur write us se pehle hi acknowledge ho jaata hai. Ek node crash ho to uske last kuch second ke writes us node pe ja sakte hain; bachaav ye hai ki data kai replicas pe likha jaata hai (replication lesson). Har write pe fsync chahiye to "batch" mode hai, lekin dheema.',
    ]},
    { type: 'table', head: ['', 'B-tree (Postgres, MySQL)', 'LSM tree (Cassandra, RocksDB)'], rows: [
      ['Write', 'In-place, random page updates; har index update', 'Append + memtable; bahut tez, sequential'],
      ['Read (ek key)', 'Predictable: 3-4 pages', 'Memtable + kai SSTables (Bloom filters madad karte hain)'],
      ['Range scan', 'Bahut achha (sorted leaves)', 'Achha, lekin kai files merge karni padti hain'],
      ['Background kaam', 'Kam (Postgres mein vacuum: purane row versions ki safai)', 'Compaction lagatar CPU aur disk I/O khaata hai'],
      ['Best kab', 'Read-heavy, mixed workloads, transactions', 'Write-heavy: logs, events, chat, metrics, location'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"LSM fast hai, B-tree purana hai." Dono alag kaam ke liye hain. LSM writes sasti karta hai aur badle mein reads aur background compaction mehenge karta hai. Agar tumhara app zyada padhta hai aur transactions chahiye (zyada tar apps), B-tree wala Postgres/MySQL hi sahi hai. Ye bhi yaad rakho: "Cassandra fast hai" ka ek bada hissa uska data model hai (partition key se seedha ek node), sirf LSM nahi.` },

    { type: 'h2', text: 'Write-ahead log: COMMIT ke baad crash' },
    { type: 'callout', tone: 'term', title: 'Naya word: Buffer pool', html: `<strong>Ye kya hai:</strong> database ki RAM ka ek bada hissa, jisme wo disk ke pages ki copies rakhta hai. Padhna aur badalna pehle yahin hota hai.<br><strong>Kyun chahiye:</strong> RAM disk se hazaaron guna tez hai. Jo pages baar baar chahiye (B-tree ke upar ke levels), wo hamesha yahin rehte hain.<br><strong>Iske bina:</strong> har query pe disk. Database bahut slow.<br><strong>Khatra:</strong> RAM bijli jaate hi saaf ho jaati hai. Jo badlav sirf yahan the, wo gaye.` },
    { type: 'p', html: `Ek aur chhupi problem. Database speed ke liye pages ko RAM mein (buffer pool) badalta hai aur disk pe <em>baad mein</em> likhta hai. Agar COMMIT ka "OK" dene ke baad, disk pe likhne se pehle, bijli chali gayi? Riya ke coins ka transfer, jiska OK app ko mil chuka tha, gayab. Ye ACID ke <strong>D</strong> (Durability) ka sawaal hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Write-ahead log (WAL)', html: `<strong>Ye kya hai:</strong> ek "diary" file jisme database har badlav ka record likhta hai, ek ke baad ek, sirf end mein jodte hue (<strong>append-only</strong>). Rule: <strong>data page badalne se pehle, badlav ka record is log mein likho aur use disk pe pakka karo</strong>. COMMIT ka OK tabhi milta hai jab log disk pe pahunch jaaye.<br><strong>Kyun chahiye:</strong> crash ke baad restart pe database log padh ke saare pakke badlav dobara laga deta hai (<strong>redo</strong>). Data pages baad mein aaram se likhe ja sakte hain.<br><strong>Iske bina:</strong> ya to har commit pe saare bikhre pages disk pe likho (bahut slow), ya crash pe pakke kiye hue badlav kho do.<br>Postgres mein naam WAL hai, MySQL InnoDB mein <strong>redo log</strong>. LSM ka commit log bhi yahi idea hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: fsync', html: `<strong>Ye kya hai:</strong> program jab file mein "likhta" hai, operating system (OS) aksar use pehle RAM ke ek buffer mein rakh leta hai, aur disk pe baad mein bhejta hai. <code>fsync</code> OS ko diya gaya ek hukum (system call) hai: "jab tak ye data sach mein disk pe na pahunche, wapas mat aana."<br><strong>Kyun chahiye:</strong> fsync ke baad hi pakka kaha ja sakta hai ki bijli jaane pe bhi data bachega.<br><strong>Keemat:</strong> ye slow hai (milliseconds tak). Isliye databases kai transactions ke log ek saath ek fsync mein pakke karte hain. Isko <strong>group commit</strong> kehte hain.` },
    { type: 'p', html: `WAL itna sasta kyun? Log <em>sequential</em> hai: ek file ke end mein append. Ek transaction ne 10 alag pages badle to bhi commit pe sirf log ka chhota sa hissa fsync hota hai, 10 bikhre pages nahi. Badle hue pages ko database thodi thodi der mein ek saath disk pe likhta hai: isko <strong>checkpoint</strong> kehte hain. Checkpoint ka matlab: "yahan tak ke saare badlav data files mein pahunch gaye". Isliye crash ke baad sirf checkpoint ke baad wala log replay karna padta hai, aur restart jaldi hota hai.` },
    { type: 'p', html: `Ab crash karke dekho. Har scenario mein socho: app ko "OK" mila tha ya nahi, aur restart ke baad data hai ya nahi:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'app', label: 'App', sub: 'wallet service', x: 80, y: 165, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ki wallet service. COMMIT bhejti hai aur OK ka wait karti hai. OK mila = app maan leta hai ki data pakka hai (user ko "Tip bhej di" dikha deta hai).' },
        { id: 'db', label: 'DB process', sub: 'buffer pool (RAM)', x: 300, y: 165, w: 160, kind: 'server', info: 'Ye kya hai: database ka chalta hua program, aur uski RAM (buffer pool). Pages yahin badalte hain (fast). RAM crash pe khaali ho jaati hai, isliye WAL ke bina ye badlav kho sakte hain.' },
        { id: 'wal', label: 'WAL file', sub: 'disk, append-only', x: 560, y: 70, w: 170, kind: 'data', info: 'Ye kya hai: disk pe append-only diary. Har badlav ka record, order mein. COMMIT pe fsync. Crash recovery isi se hoti hai. Replication aur CDC bhi isi log ko padhte hain.' },
        { id: 'data', label: 'Data files', sub: 'disk, pages', x: 560, y: 265, w: 170, kind: 'data', info: 'Ye kya hai: disk pe tables aur indexes ke asli pages (B-tree yahin). Checkpoint pe yahan likha jaata hai, commit pe nahi.' },
      ],
      edges: [{ a: 'app', b: 'db' }, { a: 'db', b: 'wal' }, { a: 'db', b: 'data' }],
      scenarios: [
        { name: 'Commit (happy path)', steps: [
          { title: 'Transaction', go: 'app>db', text: 'Riya → Aman 100 coins. Do pages RAM mein badle. Inhe <strong>dirty pages</strong> kehte hain: RAM mein badle, disk pe abhi nahi.', set: { db: { sub: '2 pages dirty' } }, msg: 'BEGIN; UPDATE ...; UPDATE ...; COMMIT;' },
          { title: 'WAL mein append + fsync', go: ['db>wal', 'res:wal>db'], text: 'Badlav ke records log ke end mein, phir fsync. Ek sequential write, ~1 ms ya kam.', after: { wal: { state: 'ok', sub: 'commit record pakka' } }, msg: 'WAL: [txn 881: riya -100][txn 881: aman +100][txn 881: COMMIT]  fsync ✓' },
          { title: 'Tab OK', go: 'res:db>app', text: 'Data files ko abhi chhua bhi nahi, phir bhi transaction durable hai.', after: { app: { state: 'ok', sub: 'OK mila' } } },
          { title: 'Baad mein: checkpoint', go: 'db>data', text: 'Kuch der baad database saare dirty pages ek saath data files mein likh deta hai. Checkpoint se pehle ka WAL ab recovery ke liye zaroori nahi (archive/replication ke liye rakha ja sakta hai).', after: { data: { state: 'ok', sub: 'pages updated' }, db: { sub: 'clean' } } },
        ]},
        { name: 'Crash after COMMIT', intro: 'OK mil gaya, checkpoint abhi nahi hua, aur server ki bijli chali gayi.', steps: [
          { title: 'Commit pakka', go: ['app>db', 'db>wal', 'res:wal>db', 'res:db>app'], text: 'WAL fsync hua, app ko OK.', after: { wal: { state: 'ok', sub: 'txn 881 COMMIT' }, app: { state: 'ok', sub: 'OK mila' } } },
          { title: 'Crash', set: { db: { state: 'down', sub: 'RAM gayi' }, data: { state: 'warn', sub: 'purane pages' } }, go: 'lost:db>data', text: 'Badle hue pages sirf RAM mein the. Data files mein purana balance.' },
          { title: 'Restart: WAL replay (redo)', go: ['wal>db', 'db>data'], set: { db: { state: '', sub: 'recovery' } }, text: 'Database last checkpoint se aage ka WAL padhta hai aur har committed badlav dobara lagata hai. Riya −100, Aman +100 wapas.', after: { data: { state: 'ok', sub: 'txn 881 restored' }, db: { state: 'ok', sub: 'ready' } } },
          { title: 'Nateeja', text: 'Jo OK hua tha, wo bacha. Yahi Durability hai.', focus: ['data'] },
        ]},
        { name: 'Crash before COMMIT', intro: 'Transaction chal rahi thi, COMMIT ka fsync nahi hua tha.', steps: [
          { title: 'Badlav RAM mein', go: 'app>db', text: 'Pages dirty, lekin COMMIT record WAL mein pakka nahi.', set: { db: { sub: 'txn 882 adhoori' } } },
          { title: 'Crash', set: { db: { state: 'down', sub: 'CRASH' } }, go: 'lost:db>wal', text: 'App ko OK nahi mila (connection toota ya timeout).', after: { app: { state: 'warn', sub: 'no OK' } } },
          { title: 'Restart', go: ['wal>db'], set: { db: { state: 'ok', sub: 'ready' } }, text: 'Recovery ko txn 882 ka COMMIT record nahi mila, to uske badlav lagaye hi nahi jaate (ya undo). Data pehle jaisa. App ko OK mila hi nahi tha, to wo retry kar sakta hai (idempotency key ke saath, taaki double na ho).' },
        ]},
        { name: 'Async commit (risky)', intro: 'Speed ke liye Postgres mein synchronous_commit = off (ya InnoDB mein innodb_flush_log_at_trx_commit = 2).', steps: [
          { title: 'OK, fsync se pehle', go: ['app>db', 'res:db>app'], text: 'Database ne WAL ka fsync ka intezaar kiye bina OK de diya. Writes bahut fast.', after: { app: { state: 'ok', sub: 'OK mila' }, wal: { state: 'warn', sub: 'abhi OS buffer mein' } } },
          { title: 'Crash, flush se pehle', set: { db: { state: 'down', sub: 'CRASH' } }, go: 'lost:db>wal', text: 'Background writer log ko disk pe likhne hi wala tha.' },
          { title: 'Last ~sub-second ke commits gaye', go: 'wal>db', set: { db: { state: 'ok', sub: 'ready' } }, text: 'Restart pe database consistent hai (koi corruption nahi), lekin aakhri kuch transactions jinka OK mil chuka tha, gayab. Postgres docs ke hisaab se ye window max ~3 × wal_writer_delay (default 200 ms) hai. Likes/analytics ke liye chal sakta hai, coins ke liye nahi. (fsync = off isse bilkul alag aur khatarnaak hai: database corrupt ho sakta hai.)', after: { wal: { state: 'down', sub: 'last commits lost' } } },
        ]},
      ],
    },
    { type: 'list', items: [
      '<strong>MySQL InnoDB</strong>: <code>innodb_flush_log_at_trx_commit = 1</code> (default) har commit pe redo log fsync karta hai. 0 ya 2 pe ~1 second tak ke commits ja sakte hain.',
      '<strong>Disk bhi jhooth bol sakti hai</strong>: kuch disks/controllers fsync ko "ho gaya" bol dete hain jabki data unke volatile cache mein hai. Production hardware/cloud volumes is liye power-loss protection dete hain.',
      '<strong>WAL ka doosra kaam</strong>: replicas isi log ko apne paas replay karke copy bane rehte hain, aur CDC tools (Debezium) isi ko padh ke events banate hain. Agle lessons (replication, Kafka) mein ye phir aayega.',
    ]},
    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Default rule', html: `<strong>PostgreSQL ya MySQL (B-tree) se shuru karo</strong>, aur slow query pe sabse pehle <code>EXPLAIN</code> + sahi index, cache aur replicas baad mein. LSM wala store (Cassandra, ScyllaDB, RocksDB-based) tab, jab writes bahut zyada hon, access key se ho, aur ad-hoc queries/transactions ki zaroorat na ho. Durability settings (fsync, synchronous_commit) default pe chhodo, jab tak data sach mein khone layak na ho.` },
    { type: 'table', head: ['Signal', 'Kya karo'], rows: [
      ['Badi table pe WHERE/JOIN/ORDER BY slow', 'Us query ke columns pe index (equality pehle, range baad mein); EXPLAIN se confirm'],
      ['Kai filters ek saath', 'Composite index, leftmost prefix ke hisaab se order'],
      ['Writes slow ho rahe, bahut saare indexes', 'Bekaar indexes hatao; har index ki keemat writes pe hai'],
      ['Lakhon writes/sec, append-jaisa data, key se padhna', 'LSM-based store (Cassandra/ScyllaDB), ya batching + Kafka (pattern-writes)'],
      ['Data kabhi khona nahi chahiye', 'Default durable commit (fsync on commit) + replication'],
      ['Thoda loss chalega, speed chahiye (analytics events)', 'Async commit / batching, soch samajh ke'],
    ]},

    { type: 'diagram', title: 'Database ke andar: poori picture', height: 545,
      groups: [
        { label: 'PostgreSQL (B-tree)', x: 10, y: 96, w: 345, h: 434 },
        { label: 'Cassandra (LSM)', x: 365, y: 96, w: 345, h: 434 },
      ],
      nodes: [
        { id: 'app', label: 'xyz.com app', sub: 'queries + writes', x: 360, y: 50, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ki services. Login (email se user dhoondho) aur coins Postgres mein; chat aur location jaise bahut saare writes Cassandra mein.' },
        { id: 'planner', label: 'Query planner', sub: 'EXPLAIN: index?', x: 180, y: 150, w: 150, kind: 'server', info: 'Ye kya hai: database ka wo hissa jo tay karta hai query kaise chalegi: index se, ya full table scan. EXPLAIN isi ka plan dikhata hai.' },
        { id: 'buffer', label: 'Buffer pool', sub: 'pages in RAM', x: 180, y: 260, w: 150, kind: 'cache', info: 'Ye kya hai: database ki RAM jisme pages ki copies rehti hain. B-tree ke upar ke levels hamesha yahin, isliye lookup aur bhi tez. Crash pe saaf ho jaata hai.' },
        { id: 'idx', label: 'B-tree index', sub: 'sorted pages', x: 90, y: 380, kind: 'data', info: 'Ye kya hai: email jaise column ki sorted copy, B+ tree ke roop mein. Root → internal → leaf, 3-4 pages mein row ka pata. Har write pe ise bhi update karna padta hai.' },
        { id: 'heap', label: 'Table pages', sub: 'heap / data files', x: 270, y: 380, kind: 'data', info: 'Ye kya hai: disk pe asli rows wale pages. Index ne pata diya, yahan se row aayi. Badle hue pages checkpoint pe yahan likhe jaate hain.' },
        { id: 'wal', label: 'WAL', sub: 'append + fsync', x: 180, y: 490, w: 150, kind: 'queue', info: 'Ye kya hai: write-ahead log, disk pe append-only diary. COMMIT ka OK tabhi jab record yahan fsync ho gaya. Crash ke baad isi se redo. Replicas aur CDC bhi ise padhte hain.' },
        { id: 'cl', label: 'Commit log', sub: 'append-only', x: 610, y: 150, kind: 'queue', info: 'Ye kya hai: Cassandra ka WAL. Har write pehle yahan append (sequential, sasta). Node crash ho to memtable isi se dobara banti hai. Default mein har 10 second pe fsync (periodic mode).' },
        { id: 'mem', label: 'Memtable', sub: 'sorted, in RAM', x: 540, y: 260, kind: 'cache', info: 'Ye kya hai: RAM mein sorted table. Write yahin khatam, client ko OK. Bhar jaaye to poori ek SSTable ban ke disk pe flush.' },
        { id: 'ss', label: 'SSTables', sub: 'immutable files', x: 450, y: 380, kind: 'data', info: 'Ye kya hai: disk pe sorted files jo kabhi badalti nahi. Naye se purane ki taraf padhte hain; pehla match latest. Delete = tombstone.' },
        { id: 'bf', label: 'Bloom filters', sub: 'skip files', x: 630, y: 380, kind: 'cache', info: 'Ye kya hai: har SSTable ka chhota bit-array, RAM mein. "Pakka nahi hai" bol ke bekaar file reads bachata hai. ~10 bits per key pe ~1% false positives.' },
        { id: 'comp', label: 'Compaction', sub: 'merge + cleanup', x: 540, y: 490, kind: 'server', info: 'Ye kya hai: background kaam jo kai SSTables ko merge karke ek banata hai, purane versions aur tombstones hata deta hai. Reads aur disk space behtar, lekin CPU aur disk writes (write amplification) ki keemat pe.' },
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
        { name: 'Index se read', text: 'Login query: planner ne index chuna, buffer pool se B-tree ke 3-4 pages, phir table page se row. Full scan nahi.', go: ['app>planner>buffer>idx', 'buffer>heap'] },
        { name: 'Commit + crash', text: 'COMMIT: badlav WAL mein append + fsync, tab OK. Crash hua to restart pe WAL se redo, data files wapas sahi.', go: ['app>planner>buffer>wal', 'wal>heap'] },
        { name: 'LSM write', text: 'Commit log mein append, memtable mein insert, OK. Baad mein flush se SSTable, aur compaction se merge.', go: ['app>cl>mem>ss>comp'] },
        { name: 'LSM read', text: 'Pehle memtable. Nahi mila to Bloom filters se pata karo kaunsi SSTables mein key "shayad" hai, sirf wahi padho.', go: ['app>mem>bf>ss'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Database pages mein padhta/likhta hai. Kaam ki keemat = kitne pages.</li>
      <li>Index = sorted copy (kitaab ka index). Bina index full table scan: 1 crore rows pe ~1 lakh pages; index se 3-4.</li>
      <li>B+ tree: chauda (fanout 100+), balanced; leaves jude hue, isliye range queries bhi tez. Page bhar gaya to split, tree upar se badhta hai.</li>
      <li>Composite index (a, b, c) leftmost prefix se kaam karta hai. Equality columns pehle, range baad mein.</li>
      <li>Har index har write ko mehenga karta hai. Sirf zaroori indexes.</li>
      <li>LSM tree: commit log + memtable → SSTables → compaction. Writes sequential aur tez; reads ke liye Bloom filters.</li>
      <li>B-tree vs LSM = read, write aur space amplification ka sauda. Read-heavy/transactions: B-tree. Write-heavy, key se access: LSM.</li>
      <li>WAL + fsync = Durability. OK tabhi jab log disk pe pakka. Async commit speed deta hai, lekin last commits kho sakte hain.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Index: lookup N rows ki jagah ~log(N) pages; 1 crore rows pe second se sub-millisecond',
      'Composite/covering indexes se multi-filter queries bhi tez',
      'LSM: bahut tez, sequential writes; write-heavy data ke liye perfect',
      'WAL: commit ke baad crash pe bhi data safe, aur replication/CDC ki neev',
    ], costs: [
      'Har index har write ko dheema karta hai aur RAM/disk khaata hai',
      'Galat order ka composite index ya function wali query = index bekaar',
      'LSM: reads mein kai files, background compaction ka CPU/disk kharcha, tombstones',
      'Durability ki keemat fsync latency; async commit se speed, lekin acknowledged data loss ka risk',
    ]},
    { type: 'think', questions: [
      { q: 'xyz.com ki query: WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20 (user ke latest posts). Kaunsa index?', a: 'Composite index (user_id, created_at). user_id equality se sahi range milti hai, aur andar created_at pehle se sorted hai, to database bas end se 20 entries padh leta hai, alag se sort nahi karna padta. Sirf (created_at) ya sirf (user_id) se kaam adhoora hoga.' },
      { q: 'Cassandra pe ek table mein lakhon rows roz delete hoti hain, aur reads dheere dheere slow ho rahe hain. Kyun?', a: 'Har delete ek tombstone hai. Compaction (aur grace period) tak tombstones SSTables mein pade rehte hain, aur reads ko unhe scan karke skip karna padta hai. Fix: data model badlo (jaise time-bucketed partitions jinhe TTL ke saath poora expire hone do), compaction strategy tune karo, ya delete-heavy pattern avoid karo.' },
      { q: 'Ek developer kehta hai "Postgres ka synchronous_commit off kar do, writes 3 guna fast." Kab haan, kab na?', a: 'Haan: jahan last ~sub-second ke writes khona chal jaaye (clickstream, view events, logs). Na: paise, orders, bookings, ya koi bhi cheez jiska OK user ko dikh chuka ho. Achhi baat ye ki Postgres mein ye setting per-transaction bhi lag sakti hai, to sirf non-critical writes ke liye off karo.' },
    ]},
    { type: 'quiz', questions: [
      { q: '1 crore rows ki table, email pe index nahi. WHERE email = ... kya karega?', options: ['Binary search', 'Full table scan: lagbhag har page padhega', 'Cache se answer'], answer: 1, explain: 'Bina index database ko pata nahi row kahan hai, aur unique ki guarantee bhi nahi, to saare pages.' },
      { q: 'Index (country, city, age). Kis query pe ye index seedha kaam NAHI aayega?', options: ["WHERE country = 'IN'", "WHERE country = 'IN' AND city = 'Pune'", "WHERE city = 'Pune' AND age = 21"], answer: 2, explain: 'Leftmost prefix: country diye bina index ka sorted order kaam nahi aata.' },
      { q: 'Cassandra ke writes tez hone ki mukhya wajah?', options: ['Har write pe B-tree page update', 'Commit log append + memtable; disk pe sirf sequential flush/compaction', 'Writes disk pe jaate hi nahi'], answer: 1, explain: 'LSM: in-place random writes nahi. (Durability commit log + replicas se.)' },
      { q: 'LSM mein GET ke time Bloom filter ka kaam?', options: ['Data compress karna', 'Batana ki key is SSTable mein pakka nahi hai, taaki file skip ho', 'Tombstones hatana'], answer: 1, explain: '"Nahi" ka jawab kabhi galat nahi, to bekaar file reads bachte hain.' },
      { q: 'COMMIT ka OK milne ke turant baad server crash, data pages abhi disk pe nahi likhe the. Restart ke baad?', options: ['Transaction kho gayi', 'WAL replay se transaction wapas', 'Database corrupt'], answer: 1, explain: 'OK tabhi diya gaya jab WAL fsync ho gaya tha. Recovery use redo karti hai.' },
      { q: 'B+ tree mein ek leaf page bhar gaya aur naya insert aaya. Kya hota hai?', options: ['Naya insert reject', 'Page do mein toot-ta hai (split), aur naye page ki pehli key upar wale page mein jaati hai', 'Poora tree dobara banta hai'], answer: 1, explain: 'Page split. Upar wala bhi bhar jaaye to wo bhi toot-ta hai; root toote to tree ek level ooncha. Isliye saari leaves ek hi level pe rehti hain.' },
      { q: 'Bloom filter ne kaha "key shayad hai". File padhi, key nahi mili. Isko kya kehte hain?', options: ['False negative: bug hai', 'False positive: ek bekaar read, lekin answer galat nahi', 'Tombstone'], answer: 1, explain: 'Bloom filter "shayad" mein galat ho sakta hai, "pakka nahi" mein kabhi nahi. Bits doosri keys ne 1 kar diye the.' },
      { q: 'LSM tree mein ek hi user write disk pe kai baar likha jaata hai (flush, phir compactions). Isko kya kehte hain?', options: ['Read amplification', 'Write amplification', 'Space amplification'], answer: 1, explain: 'Write amplification. Phir bhi LSM tez hai kyunki ye saare writes bade aur sequential hain.' },
    ]},
    { type: 'sources', note: 'Version-specific facts inse check kiye gaye.', items: [
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
