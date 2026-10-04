Lesson.register({
  id: 'sql-vs-nosql',
  title: 'Databases: SQL and the NoSQL family',
  minutes: 34,
  summary: `Choosing the database is the biggest decision in most designs. In this lesson: the relational model and joins, ACID transactions, isolation levels (run two transactions side by side and see the anomalies yourself), the whole NoSQL family (key-value, document, wide-column, graph, time-series, search, vector) grouped by access pattern, and normalization vs denormalization. At the end, one simple rule: start with Postgres or MySQL.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `All the data of xyz.com (users, posts, coins, chat) must be kept somewhere. That place is called a <strong>database</strong>.<br>There are many kinds of databases, just like a cupboard, a safe and a file folder are made for different jobs.<br>Some databases keep money-like data perfectly safe. Some write millions of chat messages very fast. Some find "things that are alike".<br>In this lesson you will learn which database fits which job, and why most products start with a normal SQL database.` },
    { type: 'h2', text: 'The problem: the data of xyz.com keeps growing' },
    { type: 'callout', tone: 'term', title: 'Remember: Database', html: `<strong>What it is:</strong> a program that keeps data safe on disk and lets you find it, change it and delete it.<br><strong>Why we need it:</strong> when a server restarts, or when 10 servers work together, all of them must see the same correct data.<br><strong>Without it:</strong> data would be scattered in server memory or in separate files. It would vanish on restart, and two servers would show two different "truths".` },
    { type: 'p', html: `Until now xyz.com had one database, and we put a cache and a CDN in front of it. But now the product team wants new features: sending <strong>coins</strong> (tips) to creators, <strong>chat</strong>, <strong>search</strong> over posts, "you may also like" <strong>recommendations</strong>, and server <strong>metrics</strong> (numbers like CPU use and speed). The data of each feature has a different shape. And each feature reads it in a different way.` },
    { type: 'callout', tone: 'term', title: 'New word: Access pattern', html: `<strong>What it is:</strong> <em>how</em> data is read and written. For example: "get one user by ID", "the last 50 messages of this chat", "how many views each city had yesterday".<br><strong>Why we need it:</strong> every database is very fast for some access patterns and slow for others. If you know the pattern, you can pick the right database.<br><strong>Without it:</strong> you pick a database by its brand name, and later you find out that your most important query is slow or impossible in it.` },
    { type: 'p', html: `People often ask "Is SQL better or NoSQL?" That is the wrong question. The right question is: <strong>what is the access pattern of this data?</strong> Brand names come later. First, understand what a SQL database guarantees. Then see when and why NoSQL makes sense.` },

    { type: 'h2', text: 'The relational model: tables and joins' },
    { type: 'callout', tone: 'term', title: 'New words: table, row, column, schema, SQL', html: `<strong>What it is:</strong> a relational database keeps data in <strong>tables</strong>, just like a spreadsheet. Each <strong>row</strong> is one thing (one user). Each <strong>column</strong> is one property (name, email). The structure of a table is fixed in advance: this is called the <strong>schema</strong>. You read and write the data with a language called <strong>SQL</strong> (Structured Query Language). That is why these are also called "SQL databases".<br><strong>Why we need it:</strong> the schema is a firm rule. The database does not let data of the wrong shape in (for example a number where an email should be).<br><strong>Without it:</strong> every service writes data its own way, and after a few months half the users have an "email" field and half have "Email".<br><strong>Real products:</strong> PostgreSQL, MySQL, SQL Server, Oracle, SQLite.` },
    { type: 'callout', tone: 'term', title: 'New words: primary key, foreign key', html: `<strong>What it is:</strong> a <strong>primary key</strong> is the unique ID of each row (like <code>users.id = 42</code>). A <strong>foreign key</strong> points to a row in another table (like <code>posts.user_id = 42</code>, which means "this post belongs to user 42").<br><strong>Why we need it:</strong> it links tables together. The database itself checks that a foreign key points to a real row.<br><strong>Without it:</strong> a post could have <code>user_id = 999</code> even though user 999 does not exist. The feed would show "unknown author".` },
    { type: 'ascii', text: `
users                         posts
+----+-------+                +-----+---------+--------------+
| id | name  |                | id  | user_id | title        |
+----+-------+                +-----+---------+--------------+
| 42 | Riya  | <------------- | 101 |   42    | Mumbai rains |
|  7 | Aman  | <---------.    | 102 |    7    | Cricket      |
+----+-------+            '-- | 103 |   42    | DSA notes    |
                              +-----+---------+--------------+`, caption: 'The name lives in one place only (users). Posts keep only the user_id.' },
    { type: 'p', html: `To "show the author's name next to every post in the feed", we must combine two tables.` },
    { type: 'callout', tone: 'term', title: 'New word: Join', html: `<strong>What it is:</strong> a SQL operation that combines the rows of two tables using a matching column. Here we matched <code>posts.user_id</code> with <code>users.id</code>, so each post got its author's name.<br><strong>Why we need it:</strong> the name is stored in one place only (users). With a join you can show it next to anything, whenever you want.<br><strong>Without it:</strong> either the app code runs two separate queries and matches them itself, or a copy of the name must be stored in every post (below, under "denormalization", you will see what that costs).` },
    { type: 'code', text: `SELECT posts.title, users.name
FROM posts
JOIN users ON users.id = posts.user_id
WHERE posts.id IN (101, 102, 103);

-- title         | name
-- Mumbai rains  | Riya
-- Cricket       | Aman
-- DSA notes     | Riya` },
    { type: 'p', html: `The strength of the relational model: data is stored once, in one place, and <em>any</em> question can be asked later ("all of Riya's posts", "users with the most likes", "posts by users from Mumbai"). You do not need to know today which query you will need tomorrow. For a young product this is very valuable.` },
    { type: 'h2', text: 'ACID: the guarantee for money-like work' },
    { type: 'p', html: `New feature: Riya tips the creator Aman 100 coins. There are two steps: Riya's coins −100, and Aman's +100. Imagine the first step happens, and the server crashes before the second. 100 coins vanish into thin air! That is why SQL databases give us <strong>transactions</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Transaction', html: `<strong>What it is:</strong> a group of operations that the database treats as <strong>one single job</strong>. It starts with <code>BEGIN</code> and ends with <code>COMMIT</code>. Either all operations happen, or none do. If something goes wrong in the middle, <code>ROLLBACK</code> puts everything back as it was.<br><strong>Why we need it:</strong> in a job like a coin transfer, "half done" is the most dangerous state.<br><strong>Without it:</strong> after every crash, timeout or bug, some money is lost or doubled. Then a person has to read logs and fix it by hand.` },
    { type: 'callout', tone: 'term', title: 'New word: Constraint', html: `<strong>What it is:</strong> a rule written inside the database, like <code>CHECK (coins >= 0)</code> ("a balance is never negative") or <code>UNIQUE (email)</code> ("one email, one account").<br><strong>Why we need it:</strong> the rule lives in the database, so no service or buggy script can break it.<br><strong>Without it:</strong> the rule lives only in app code. A new service that forgets the check will write bad data.` },
    { type: 'p', html: `The four guarantees that transactions give are together called <strong>ACID</strong>. Each letter protects against a different problem:` },
    { type: 'table', head: ['Letter', 'Meaning', 'In the coins example'], rows: [
      ['<strong>A</strong>tomicity', 'All or nothing', 'Never a debit without the credit'],
      ['<strong>C</strong>onsistency', 'The rules of the database (constraints) never break', '<code>CHECK (coins >= 0)</code>: a balance cannot go negative'],
      ['<strong>I</strong>solation', 'Transactions running at the same time do not see each other\'s half-done work', 'Even if two tips arrive together, the count stays right'],
      ['<strong>D</strong>urability', 'After COMMIT, data survives even a crash', 'Once you get OK, the coins are safe (next lesson: write-ahead log)'],
    ]},
    { type: 'flow', height: 330,
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'tip 100 coins', x: 75, y: 165, w: 120, kind: 'client', info: 'What it is: a user of xyz.com, on her phone app. She is sending 100 coins to the creator Aman. She wants either the tip to arrive, or her coins to stay with her.' },
        { id: 'app', label: 'Wallet service', x: 260, y: 165, w: 150, kind: 'server', info: 'What it is: the xyz.com server that handles coins. It starts the transaction, runs both UPDATEs, then COMMIT. It only has to write BEGIN/COMMIT; the database gives the "all or nothing" guarantee.' },
        { id: 'db', label: 'PostgreSQL', sub: 'transaction', x: 470, y: 165, w: 150, kind: 'data', info: 'What it is: the main SQL database of xyz.com. Changes inside a transaction are hidden from others until COMMIT. If there is a crash, a half-done transaction is rolled back.' },
        { id: 'wr', label: 'Riya: 500', sub: 'wallets row', x: 640, y: 70, w: 130, kind: 'data', info: 'What it is: Riya\'s row in the wallets table (her balance). This table has a CHECK constraint: coins >= 0.' },
        { id: 'wa', label: 'Aman: 100', sub: 'wallets row', x: 640, y: 260, w: 130, kind: 'data', info: 'What it is: the creator Aman\'s row in the wallets table (his balance). The tip money should be added here.' },
      ],
      edges: [{ a: 'riya', b: 'app' }, { a: 'app', b: 'db' }, { a: 'db', b: 'wr' }, { a: 'db', b: 'wa' }],
      scenarios: [
        { name: 'Commit (happy path)', steps: [
          { title: 'Tip request', go: 'riya>app', text: 'Riya pressed "Send 100".', msg: 'POST /tips { to: "aman", coins: 100 }' },
          { title: 'BEGIN + debit', go: 'app>db>wr', text: 'The transaction starts. 100 is taken from Riya\'s row. For now, only this transaction can see the change.', set: { wr: { label: 'Riya: 400', sub: 'uncommitted' } }, msg: 'BEGIN;\nUPDATE wallets SET coins = coins - 100 WHERE user = \'riya\';' },
          { title: 'Credit', go: 'db>wa', text: '100 is added to Aman\'s row.', set: { wa: { label: 'Aman: 200', sub: 'uncommitted' } }, msg: 'UPDATE wallets SET coins = coins + 100 WHERE user = \'aman\';' },
          { title: 'COMMIT', go: ['app>db', 'res:db>app>riya'], text: 'Both changes become final together, and everyone can see them. Total coins were 600 before, and are still 600.', after: { wr: { state: 'ok', sub: 'committed' }, wa: { state: 'ok', sub: 'committed' } }, msg: 'COMMIT;  →  200 OK' },
        ]},
        { name: 'Crash in the middle', intro: 'The debit is done. Before the credit, the wallet service server dies.', steps: [
          { title: 'BEGIN + debit', go: 'riya>app>db>wr', text: 'Riya loses 100 (uncommitted).', set: { wr: { label: 'Riya: 400', sub: 'uncommitted' } } },
          { title: 'Server crash', set: { app: { state: 'down', sub: 'CRASH' } }, go: 'lost:app>db', text: 'The credit query never arrived. COMMIT never happened either.' },
          { title: 'The database rolls back', text: 'The connection broke and the transaction was half done, so the database <strong>rolled it back</strong>. Riya has 500 again. This is <strong>Atomicity</strong>: half a job never becomes final.', focus: ['wr'], set: { wr: { label: 'Riya: 500', state: 'ok', sub: 'rolled back' } } },
        ]},
        { name: 'Without a transaction', intro: 'The developer did not write BEGIN/COMMIT. Each UPDATE commits by itself right away (autocommit).', steps: [
          { title: 'Debit (final at once)', go: 'riya>app>db>wr', text: 'Riya loses 100, committed at once.', set: { wr: { label: 'Riya: 400', sub: 'committed' } } },
          { title: 'Crash', set: { app: { state: 'down', sub: 'CRASH' } }, go: 'lost:app>db', text: 'The credit did not happen.' },
          { title: '100 coins are gone', text: 'Riya: 400, Aman: 100. The total fell from 600 to 500. No rollback, because for the database these were two separate jobs. In money work, this is the worst kind of bug.', focus: ['wr', 'wa'], set: { wr: { state: 'warn' }, wa: { state: 'warn', sub: 'never credited' } } },
        ]},
        { name: 'Rule broken (Consistency)', intro: 'Riya has 500 and tries to send 600.', steps: [
          { title: 'Debit 600', go: 'riya>app>db>wr', text: 'The database checks the CHECK constraint: coins >= 0. 500 − 600 = −100. The rule is broken.', set: { wr: { state: 'down', sub: 'CHECK failed' } }, msg: 'ERROR: new row violates check constraint "coins_non_negative"' },
          { title: 'Whole transaction rolled back', go: 'res:db>app>riya', text: 'An error came back, the transaction was cancelled, and Aman got nothing. The rule is written in the database, so no buggy service can break it.', set: { wr: { state: 'ok', sub: 'unchanged: 500' } }, msg: '400 Bad Request: insufficient coins' },
        ]},
      ],
    },

    { type: 'h3', text: 'ACID lab: remove one letter and see' },
    { type: 'p', html: `The diagram above showed A and C. Now here is a small demo of all four letters. Pick a letter, turn the guarantee <strong>ON</strong> or <strong>OFF</strong>, and press "Next step". Watch whether the total of 600 coins survives:` },
    { type: 'custom', render(el) {
      const T = { lab: { A: 'A: Atomicity', C: 'C: Consistency', I: 'I: Isolation', D: 'D: Durability' }, on: 'Guarantee ON', off: 'Guarantee OFF', next: 'Next step', reset: 'Restart', riya: 'Riya', aman: 'Aman', total: 'Total coins (Riya + Aman)', want: 'Right answer for Aman', start: 'Start', wait: 'steps done. Press "Next step".' };
      // each step: [text, riya, aman]; balances after the step
      const S = {
        A: { setup: 'Riya → Aman 100 coins. After the debit, before the credit, the server crashes.',
          on: [['BEGIN; Riya −100 (not final yet)', 400, 100], ['Server crash. COMMIT never arrived.', 400, 100], ['Restart: the database rolls back the half-done transaction.', 500, 100]],
          off: [['Riya −100, final at once (no transaction)', 400, 100], ['Server crash. The credit never ran.', 400, 100], ['Restart: no rollback. 100 coins are gone.', 400, 100]],
          v: { on: 'Atomicity: half a job never became final. Total 600.', off: 'Without atomicity: the total fell from 600 to 500. This bug can kill a money app.' } },
        C: { setup: 'Riya has 500, and by mistake she sends 600.',
          on: [['Riya −600 → −100. CHECK (coins >= 0) broken → ERROR', 500, 100], ['Whole transaction cancelled. Aman got nothing.', 500, 100]],
          off: [['Riya −600 → −100. There is no rule, so it went through.', -100, 100], ['Aman +600', -100, 700]],
          v: { on: 'Consistency: the database rule never broke. Riya got a "not enough coins" error.', off: 'The total is still 600, but Riya\'s balance is −100! The rule broke: 100 coins were created out of thin air.' } },
        I: { setup: 'Aman has 100 coins. Riya sends a +50 tip, and at the same moment Kabir sends +20. Each tip does "read, add, write" on Aman\'s coins. Right answer: Aman = 170.', exp: 170,
          on: [['Tip 1: Riya −50, Aman +50 (atomic: coins = coins + 50)', 450, 150], ['Tip 2 waits until tip 1 is finished', 450, 150], ['Tip 2: reads Aman\'s new value 150, +20', 450, 170]],
          off: [['Tip 1 reads Aman\'s coins: 100. Tip 2 also reads: 100', 500, 100], ['Tip 1: Riya −50, writes 100 + 50 = 150 for Aman', 450, 150], ['Tip 2 writes 100 + 20 = 120 (based on the old 100!)', 450, 120]],
          v: { on: 'Isolation: neither tip saw the other\'s half-done work. Aman: 170, correct.', off: 'Lost update: Aman should have 170, but has 120. Riya\'s +50 tip was lost.' } },
        D: { setup: 'Riya → Aman 100 coins. The app showed "Tip sent". Right then, the power went out.',
          on: [['The change is first made safe on disk in a log file (fsync)', 400, 200], ['Then OK to the app. Power goes out, memory is wiped.', 400, 200], ['Restart: the database reads the log and restores everything', 400, 200]],
          off: [['The change is only in memory. OK to the app at once', 400, 200], ['Power goes out, memory is wiped. The disk has old data', 500, 100], ['Restart: the database does not know about the tip at all', 500, 100]],
          v: { on: 'Durability: what got an OK survived the crash. (How? Next lesson: write-ahead log.)', off: 'Riya saw "Tip sent", but Aman never got it. Something that got an OK was lost.' } },
      };
      let L = 'A', on = true, i = 0;
      el.innerHTML = `<div class="acid-l" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="acid-o" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="acid-s calc-note"></div>
        <ol class="acid-steps" style="margin:10px 0 0;padding-left:22px;display:grid;gap:6px"></ol>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary acid-n">${T.next}</button><button type="button" class="btn small ghost acid-r">${T.reset}</button></div>
        <div class="stats acid-st"></div>
        <div class="acid-v calc-note" style="font-weight:600"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, items, cur, set) => { box.innerHTML = ''; items.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === k ? ' on' : ''); b.setAttribute('aria-pressed', cur === k); b.textContent = t; b.onclick = () => { set(k); i = 0; draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.acid-l'), Object.entries(T.lab), L, k => L = k);
        chips(q('.acid-o'), [[true, T.on], [false, T.off]], on, k => on = k);
        const sc = S[L], st = sc[on ? 'on' : 'off'];
        q('.acid-s').innerHTML = `<strong>${T.start}:</strong> ${sc.setup}`;
        q('.acid-steps').innerHTML = st.map((s, k) => `<li style="opacity:${k < i ? 1 : 0.35};${k === i - 1 ? 'font-weight:600;color:var(--accent-ink)' : 'color:var(--ink)'}">${k < i ? s[0] : '...'}</li>`).join('');
        const cur = i ? st[i - 1] : [0, 500, 100], tot = cur[1] + cur[2], end = i >= st.length;
        const red = c => c ? 'color:var(--red)' : '';
        const third = sc.exp ? `<div class="stat"><span>${T.want}</span><strong>${sc.exp}</strong></div>` : `<div class="stat"><span>${T.total}</span><strong style="${red(tot !== 600)}">${tot}</strong></div>`;
        q('.acid-st').innerHTML = `<div class="stat"><span>${T.riya}</span><strong style="${red(cur[1] < 0)}">${cur[1]}</strong></div><div class="stat"><span>${T.aman}</span><strong style="${red(sc.exp && end && cur[2] !== sc.exp)}">${cur[2]}</strong></div>` + third;
        q('.acid-v').textContent = end ? sc.v[on ? 'on' : 'off'] : `${i}/${st.length} ${T.wait}`;
        q('.acid-v').style.color = end ? (on ? 'var(--green)' : 'var(--red)') : '';
        q('.acid-n').disabled = end;
      };
      q('.acid-n').onclick = () => { i++; draw(); };
      q('.acid-r').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: the "C" in ACID and the "C" in CAP', html: `Same name, different meaning. In ACID, <strong>Consistency</strong> = "the rules of the database (constraints) never break". Later, in the CAP lesson, you will meet another "Consistency", which means "every copy shows the latest data". Do not mix them up.` },

    { type: 'h2', text: 'Isolation levels: when two transactions run at the same time' },
    { type: 'p', html: `On xyz.com, thousands of transactions run at the same time every second. If the database ran them one after another (in a line), everything would be safe but very slow. So the database lets them <em>overlap</em>, and the <strong>isolation level</strong> decides how much trouble is allowed during the overlap. More isolation = less trouble, but more waiting and retries.` },
    { type: 'callout', tone: 'term', title: 'New word: Isolation level', html: `<strong>What it is:</strong> a setting that says how much one transaction can see of the half-done work of other transactions running at the same time.<br><strong>Why we need it:</strong> full safety (everything in a line) is slow, and some jobs can live with a little trouble. With the level, you choose between speed and safety.<br><strong>Without it:</strong> either everything runs in a line (the site is slow), or there are no rules at all (money counts go wrong).` },
    { type: 'p', html: `The SQL standard has 4 levels. From bottom to top, each level is safer than the one before, and a little more costly:` },
    { type: 'table', head: ['Level', 'In plain words', 'When it is fine'], rows: [
      ['<strong>Read Uncommitted</strong>', 'You may even see other people\'s half-done (uncommitted) work', 'Almost never. Postgres does not even run it (it treats it like Read Committed)'],
      ['<strong>Read Committed</strong>', 'Each query sees only final (committed) data. But data can change between two queries', 'Most web app pages. The Postgres default'],
      ['<strong>Repeatable Read</strong>', 'The transaction gets a "photo" (snapshot) taken at its start. All reads inside use that photo', 'Reports, or several reads that must match each other. The MySQL default'],
      ['<strong>Serializable</strong>', 'The result is as if the transactions ran one after another (in a line)', 'Money, bookings, rules that depend on many rows. Together with retry logic'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: MVCC / snapshot', html: `<strong>What it is:</strong> Postgres and MySQL (InnoDB) keep several versions of each row. This is called <strong>Multi-Version Concurrency Control (MVCC)</strong>. Because of it, a transaction can get a <strong>snapshot</strong>: "the data as it was when I started", like a photo.<br><strong>Why we need it:</strong> a reader does not have to wait for a writer. Both run together.<br><strong>Without it:</strong> every read would need a lock, and one long report would block all writes.` },
    { type: 'callout', tone: 'term', title: 'New words: Lock and Deadlock', html: `<strong>What it is:</strong> a <strong>lock</strong> is a "I am using this right now" sign put on a row. Other transactions must wait. A <strong>shared lock</strong> = "I am reading; you may read too, but not change it". An <strong>exclusive lock</strong> = "I am changing it; nobody touch it". A <strong>deadlock</strong> = two transactions each wait for the other\'s lock, so neither can move. The database cancels (rolls back) one of them.<br><strong>Why we need it:</strong> with locks, two people cannot change the same row at the same time.<br><strong>Without it:</strong> two writes wipe out each other (see "lost update" below).` },
    { type: 'p', html: `Now the five classic problems (<strong>anomalies</strong>). Understand each one in one line, then run it yourself in the demo:` },
    { type: 'list', items: [
      '<strong>Dirty read</strong>: you read someone\'s <em>half-done</em> work, which was later cancelled. For example, a post shows 999 likes that were never real.',
      '<strong>Non-repeatable read</strong>: inside one transaction you read a row twice, and someone changed it in between. The first time "Riya", the second time "Riya S".',
      '<strong>Phantom read</strong>: you asked "how many posts does user 42 have?" twice. In between, someone inserted a <em>new row</em>, so the count went from 3 to 4. No old row changed; a new "ghost" row appeared.',
      '<strong>Lost update</strong>: two people read the same value, and each writes back their own sum. The second one wipes out the first one\'s work. (Aman\'s tip in the ACID lab.)',
      '<strong>Write skew</strong>: two people read the same data and change <em>different rows</em>. Each decision was right on its own, but together they break a rule.',
    ]},
    { type: 'p', html: `In the demo below, pick an anomaly, a database and an isolation level, then run both transactions (T1, T2) step by step. T1 and T2 are requests from two different users running at the same time. Each result is based on the documented behaviour of real Postgres and MySQL:` },
    { type: 'custom', render(el) {
      const OUT = {
        pg: { RU: { dirty: 'prevented', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RC: { dirty: 'prevented', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RR: { dirty: 'prevented', nonrep: 'prevented', phantom: 'prevented', lost: 'error', skew: 'happens' },
              S:  { dirty: 'prevented', nonrep: 'prevented', phantom: 'prevented', lost: 'error', skew: 'error' } },
        my: { RU: { dirty: 'happens', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RC: { dirty: 'prevented', nonrep: 'happens', phantom: 'happens', lost: 'happens', skew: 'happens' },
              RR: { dirty: 'prevented', nonrep: 'prevented', phantom: 'prevented', lost: 'happens', skew: 'happens' },
              S:  { dirty: 'block', nonrep: 'block', phantom: 'block', lost: 'deadlock', skew: 'deadlock' } },
      };
      const DB = { pg: 'PostgreSQL', my: 'MySQL (InnoDB)' };
      const LV = { RU: 'Read Uncommitted', RC: 'Read Committed', RR: 'Repeatable Read', S: 'Serializable' };
      const DEF = { pg: 'RC', my: 'RR' };
      const A = {
        dirty: { name: 'Dirty read', setup: 'post id 7 has likes = 10', steps: [
          { w: 'T2', sql: 'BEGIN;\nUPDATE posts SET likes = 999 WHERE id = 7;', r: { _: 'The row changed, but there is no COMMIT yet (a bug wrote a wrong value).' } },
          { w: 'T1', sql: 'SELECT likes FROM posts WHERE id = 7;', r: { happens: '→ <strong>999</strong>. It read an uncommitted value!', prevented: '→ <strong>10</strong>. Only committed data is visible.', block: 'Waiting. In Serializable this SELECT becomes a locking read, and T2 holds a lock on the row.' } },
          { w: 'T2', sql: 'ROLLBACK;', r: { _: 'The change is cancelled. 999 never existed.', block: 'Rolled back, the lock is released. Now T1\'s SELECT runs: → <strong>10</strong>.' } },
        ], v: { happens: 'Dirty read happened: T1 showed 999, which was never committed in the database.', prevented: 'No dirty read. T1 always saw the last committed value.', block: 'No dirty read; T1 waited for the lock. Safe, but at the cost of waiting.' } },
        nonrep: { name: 'Non-repeatable read', setup: 'user id 42 has the name "Riya"', steps: [
          { w: 'T1', sql: 'BEGIN;\nSELECT name FROM users WHERE id = 42;', r: { _: '→ "Riya"' } },
          { w: 'T2', sql: 'UPDATE users SET name = \'Riya S\' WHERE id = 42;', r: { _: 'Updated.', block: 'Waiting: T1\'s locking read put a shared lock on the row.' } },
          { w: 'T2', sql: 'COMMIT;', r: { _: 'Committed.', block: '(T2 is still waiting.)' } },
          { w: 'T1', sql: 'SELECT name FROM users WHERE id = 42;', r: { happens: '→ <strong>"Riya S"</strong>. Same transaction, same query, different answer!', prevented: '→ <strong>"Riya"</strong>. T1 reads from its snapshot.', block: '→ <strong>"Riya"</strong>. T2 can move on only after T1 commits.' } },
        ], v: { happens: 'Non-repeatable read happened: one row was read twice in one transaction, and its value changed.', prevented: 'It did not happen. Because of the snapshot, T1 saw the same data for the whole transaction.', block: 'It did not happen. Because of locks, T2 had to wait.' } },
        phantom: { name: 'Phantom read', setup: 'user 42 has 3 posts', steps: [
          { w: 'T1', sql: 'BEGIN;\nSELECT COUNT(*) FROM posts WHERE user_id = 42;', r: { _: '→ 3' } },
          { w: 'T2', sql: 'INSERT INTO posts (user_id, title) VALUES (42, \'New post\');', r: { _: 'New row added.', block: 'Waiting: T1 took next-key (gap) locks on that range, so a new row cannot get into that gap.' } },
          { w: 'T2', sql: 'COMMIT;', r: { _: 'Committed.', block: '(T2 is still waiting.)' } },
          { w: 'T1', sql: 'SELECT COUNT(*) FROM posts WHERE user_id = 42;', r: { happens: '→ <strong>4</strong>. A "phantom" row appeared!', prevented: '→ <strong>3</strong>. The new row is not in the snapshot.', block: '→ <strong>3</strong>.' } },
        ], v: { happens: 'A phantom happened: no row value changed, but a NEW row matching the condition appeared.', prevented: 'It did not happen (snapshot).', block: 'It did not happen (gap locks stopped the insert).' } },
        lost: { name: 'Lost update', setup: 'Aman has coins = 100. T1 is a +50 tip, T2 a +20 tip. Right answer: 170', steps: [
          { w: 'T1', sql: 'BEGIN;\nSELECT coins FROM wallets WHERE user = \'aman\';', r: { _: '→ 100. The app thinks: 100 + 50 = 150' } },
          { w: 'T2', sql: 'BEGIN;\nSELECT coins FROM wallets WHERE user = \'aman\';', r: { _: '→ 100. The app thinks: 100 + 20 = 120' } },
          { w: 'T1', sql: 'UPDATE wallets SET coins = 150 WHERE user = \'aman\';', r: { _: 'Updated (T1 now holds a lock on the row).', deadlock: 'Waiting: both SELECTs took shared locks, and T1 needs an exclusive lock.' } },
          { w: 'T2', sql: 'UPDATE wallets SET coins = 120 WHERE user = \'aman\';', r: { _: 'Waiting for T1\'s lock.', deadlock: '<strong>Deadlock</strong>: T1 waits for T2, and T2 waits for T1. InnoDB rolls back one of them (here T2). Now T1\'s UPDATE goes through.' } },
          { w: 'T1', sql: 'COMMIT;', r: { _: 'Committed: 150.', happens: 'Committed: 150. Now T2\'s waiting UPDATE runs and writes 120.', error: 'Committed: 150. T2 wakes up, but the row changed after its snapshot → <strong>ERROR: could not serialize access due to concurrent update</strong>.' } },
          { w: 'T2', sql: 'COMMIT;  (or retry)', r: { happens: 'Committed. Final coins = <strong>120</strong>.', error: 'T2 failed, so the app retries: new read 150, +20 = <strong>170</strong>.', deadlock: 'T2 retries: new read 150, +20 = <strong>170</strong>.' } },
        ], v: { happens: 'Lost update happened: the final value is 120, and T1\'s +50 tip is lost. Both read the old 100 and wrote their own sum.', error: 'Saved: the database gave T2 an error and the app retried. Final 170. Writing retry logic is a must.', deadlock: 'Saved: the deadlock rolled back one transaction; after the retry, 170.' } },
        skew: { name: 'Write skew', setup: 'Rule: at least 1 moderator on duty. Asha and Bilal are both on duty', steps: [
          { w: 'T1', sql: 'BEGIN;  -- Asha wants a day off\nSELECT COUNT(*) FROM mods WHERE on_duty;', r: { _: '→ 2. "Bilal is here, I can go."' } },
          { w: 'T2', sql: 'BEGIN;  -- Bilal too\nSELECT COUNT(*) FROM mods WHERE on_duty;', r: { _: '→ 2. "Asha is here, I can go."' } },
          { w: 'T1', sql: 'UPDATE mods SET on_duty = false WHERE name = \'Asha\';', r: { _: 'Done (only Asha\'s row).', deadlock: 'Waiting: Bilal\'s transaction took shared locks during its SELECT.' } },
          { w: 'T2', sql: 'UPDATE mods SET on_duty = false WHERE name = \'Bilal\';', r: { _: 'Done (a different row, no conflict was seen).', deadlock: '<strong>Deadlock</strong>. InnoDB rolls back T2, and T1 moves on.' } },
          { w: 'T1', sql: 'COMMIT;', r: { _: 'Committed.' } },
          { w: 'T2', sql: 'COMMIT;', r: { happens: 'Committed.', error: '<strong>ERROR: could not serialize access due to read/write dependencies</strong>. Retry: the count is now 1, so the app refuses the day off.', deadlock: 'T2 retries: the count is now 1, so the app refuses the day off.' } },
        ], v: { happens: 'Write skew happened: both changed different rows, each check was right, but together there are 0 moderators on duty. The rule broke.', error: 'Saved: Postgres Serializable (SSI) noticed that each one changed data the other had read, and failed one of them.', deadlock: 'Saved: locks + deadlock rolled back one transaction; on retry the rule held.' } },
      };
      let an = 'lost', db = 'pg', lv = 'RC', i = 0;
      el.innerHTML = `<div class="iso-a" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="iso-d" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="iso-l" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="iso-setup calc-note"></div>
        <div class="iso-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary iso-next">Next step</button>
          <button type="button" class="btn small ghost iso-reset">Restart</button>
        </div>
        <div class="iso-v calc-note" style="font-weight:600"></div>`;
      const q = s => el.querySelector(s);
      const chips = (box, map, get, set, extra) => {
        box.innerHTML = '';
        Object.keys(map).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.setAttribute('aria-pressed', get() === k); b.textContent = map[k] + (extra ? extra(k) : ''); b.onclick = () => { set(k); i = 0; draw(); }; box.appendChild(b); });
      };
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const draw = () => {
        chips(q('.iso-a'), Object.fromEntries(Object.entries(A).map(([k, v]) => [k, v.name])), () => an, k => an = k);
        chips(q('.iso-d'), DB, () => db, k => db = k);
        chips(q('.iso-l'), LV, () => lv, k => lv = k, k => DEF[db] === k ? ' (default)' : '');
        const S = A[an], out = OUT[db][lv][an];
        q('.iso-setup').innerHTML = `<strong>At the start:</strong> ${S.setup}.` + (db === 'pg' && lv === 'RU' ? ' (In Postgres, Read Uncommitted actually behaves just like Read Committed.)' : '');
        const col = who => S.steps.map((st, k) => {
          if (st.w !== who) return `<div style="min-height:20px"></div>`;
          const done = k < i, now = k === i - 1;
          const res = st.r[out] || (out === 'error' || out === 'deadlock' || out === 'block' ? (st.r.prevented || st.r._) : st.r._) || st.r._ || '';
          return `<div style="border:1px solid ${now ? 'var(--accent)' : 'var(--line)'};background:${now ? 'var(--accent-soft)' : 'var(--surface)'};border-radius:var(--r-sm);padding:8px;opacity:${done ? 1 : 0.35}">
            <div style="font-size:12px;color:var(--ink-3)">Step ${k + 1}</div>
            <pre style="margin:4px 0;white-space:pre-wrap;word-break:break-word;font:12px/1.4 var(--f-mono);color:var(--ink)">${esc(st.sql)}</pre>
            <div style="font-size:13px;color:var(--ink-2)">${done ? res : '...'}</div></div>`;
        }).join('');
        q('.iso-grid').innerHTML = ['T1', 'T2'].map(w => `<div><div style="font:700 15px var(--f-display);margin-bottom:6px">${w}</div><div style="display:grid;gap:6px">${col(w)}</div></div>`).join('');
        const end = i >= S.steps.length;
        q('.iso-v').innerHTML = end ? `${DB[db]}, ${LV[lv]}: ${S.v[out] || S.v.prevented}` : `${i}/${S.steps.length} steps done. Press "Next step".`;
        q('.iso-next').disabled = end;
      };
      q('.iso-next').onclick = () => { i++; draw(); };
      q('.iso-reset').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'p', html: `Two more words came up in the demo. A <strong>gap lock</strong> (MySQL): a lock on the <em>empty space between rows</em>, so that no new row can get into that range. This stops phantoms. <strong>SSI</strong> (Serializable Snapshot Isolation, the Serializable of Postgres): it does not lock things in advance. It keeps watching which transaction read what and wrote what. If it sees a dangerous pattern, it gives one transaction an error, and the app retries it.` },
    { type: 'p', html: `Here is the demo in one table. Even "safe" comes in different flavours: sometimes thanks to the snapshot, sometimes by waiting (a lock), sometimes by an error and a retry.` },
    { type: 'table', head: ['Level', 'Dirty read', 'Non-repeatable', 'Phantom', 'Lost update', 'Write skew'], caption: 'Postgres / MySQL InnoDB. "-" = can happen, "safe" = does not happen.', rows: [
      ['Read Uncommitted', 'Postgres: safe · MySQL: -', '-', '-', '-', '-'],
      ['Read Committed', 'safe', '-', '-', '-', '-'],
      ['Repeatable Read', 'safe', 'safe', 'safe (snapshot; in MySQL only for plain reads)', 'Postgres: safe (error) · MySQL: -', '-'],
      ['Serializable', 'safe', 'safe', 'safe', 'safe', 'safe'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Remember the defaults', html: `<strong>The PostgreSQL default is Read Committed. The MySQL InnoDB default is Repeatable Read.</strong> With these defaults, a <em>lost update</em> (MySQL) or a <em>lost update + write skew</em> (Postgres RC) can happen. Most apps do not need full Serializable; they need the right tool in the risky places: <code>UPDATE wallets SET coins = coins + 50</code> (atomic: the read-modify-write happens inside the database), <code>SELECT ... FOR UPDATE</code> (a row lock), or an optimistic check with a version column (each row has a version number; when you write, check that the number did not change in between, and retry if it did). And with Serializable or Repeatable Read, the app must have retry logic.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"My code uses a transaction, so there will be no race condition." (A race condition = two jobs run at the same time and spoil each other's result.) Wrong. A transaction gives <strong>atomicity</strong> (all or nothing), but depending on the isolation level, it can still race with other transactions. Look at the lost update in the demo: both transactions were fully "transactional", yet 50 coins were lost.` },

    { type: 'h2', text: 'The NoSQL family: know them by access pattern' },
    { type: 'p', html: `A SQL database is enough for every job for many years. NoSQL comes in when <em>one</em> access pattern becomes so big or so different that a general-purpose database gets costly or slow for it. "NoSQL" is the name of a family, not of one database. Each member is built for one special shape of data and query.` },
    { type: 'callout', tone: 'term', title: 'New word: NoSQL', html: `<strong>What it is:</strong> "Not only SQL". The family name for databases that store data in some shape other than tables + joins: key-value, document, wide-column, graph, and more.<br><strong>Why we need it:</strong> for some access patterns (millions of chat messages per second, "friends of friends", "similar videos"), one special shape is much faster and cheaper.<br><strong>Without it:</strong> you would do every job with one general SQL database. Most jobs would work, but a few very big or unusual patterns would get slow or costly.` },
    { type: 'p', html: `Now let us look at each family one by one. For each one: what it is, how xyz.com data looks in it, when to use it, when not to, and real products.` },

    { type: 'h3', text: '1. Relational (SQL): tables + joins' },
    { type: 'p', html: `You met this one above. <strong>What it is:</strong> tables, rows, columns, joins, transactions. <strong>In xyz.com:</strong> users, posts, wallets, follows. <strong>Use it when:</strong> money, relationships, and when you do not know which query you will need tomorrow. <strong>Do not use it when:</strong> one pattern needs millions of writes per second (chat, sensor data), or you need "similar meaning" search. <strong>Products:</strong> PostgreSQL, MySQL, SQL Server, Oracle. For big scale there are also distributed SQL databases: CockroachDB, Google Spanner, YugabyteDB.` },
    { type: 'h3', text: '2. Key-value: one name, one thing' },
    { type: 'callout', tone: 'term', title: 'New word: Key-value store', html: `<strong>What it is:</strong> a very big dictionary. Each thing has a name (<strong>key</strong>) and some data with it (<strong>value</strong>). Only two jobs: "give me the value of this key" (GET) and "store this under this key" (PUT). Like opening a locker by its number: if you know the number, it is instant; if not, you get nothing.<br><strong>Why we need it:</strong> when each request only needs one thing by its ID, this is the fastest way, and the easiest to scale. The latency is almost the same every time (predictable).<br><strong>Without it:</strong> every page load would query the main SQL database to check the session. With millions of users, that database would be busy with sessions alone.` },
    { type: 'ascii', text: `
key                       value
session:8f2a91        →   { user: 42, expires: "21:30" }
cart:42               →   [ "course-7", "ebook-12" ]
ratelimit:42:2026-10  →   37
settings:42           →   { theme: "dark", lang: "hi" }`, caption: 'Key-value data of xyz.com. The database does not care what is inside the value.' },
    { type: 'p', html: `<strong>Use it when:</strong> sessions, cache, cart, user settings, rate-limit counters, feature flags. <strong>Do not use it when:</strong> you need to search by a field <em>inside</em> the value ("all users whose theme is dark"), or you need joins. <strong>Products:</strong> Redis (in memory, very fast), Amazon DynamoDB (managed, on disk, huge scale), etcd (for configuration).` },

    { type: 'h3', text: '3. Document: a whole thing in one JSON' },
    { type: 'callout', tone: 'term', title: 'New word: Document store', html: `<strong>What it is:</strong> each thing is a <strong>document</strong>: a JSON object that can hold lists and more objects inside it (nested). Each document can have different fields.<br><strong>Why we need it:</strong> things that are always read together (all the sections of one course page) sit in one place and come back in one read. A new type of item does not need a schema change.<br><strong>Without it:</strong> one course page would need a join over 6 tables (course, sections, videos, quizzes, tags...), and every new content type would need a new table.` },
    { type: 'code', text: `// courses collection, one document
{
  "_id": "course-7",
  "title": "DSA in 30 days",
  "author": { "id": 42, "name": "Riya" },
  "sections": [
    { "title": "Arrays", "videos": ["v1", "v2"] },
    { "title": "Trees",  "videos": ["v3"], "quiz": { "questions": 10 } }
  ],
  "tags": ["dsa", "beginner"]
}` },
    { type: 'p', html: `<strong>Use it when:</strong> a course or product catalog where each item has different fields, CMS pages, user profiles that are read as one piece. <strong>Do not use it when:</strong> many documents are linked to each other and you need transactions across them (money), or the same data is copied into many places. <strong>Products:</strong> MongoDB, Google Firestore, Couchbase. (A Postgres <code>JSONB</code> column can also hold documents.)` },

    { type: 'h3', text: '4. Wide-column: many writes, read by key' },
    { type: 'callout', tone: 'term', title: 'New word: Wide-column store', html: `<strong>What it is:</strong> data is spread over many machines. Each row goes to one machine based on its <strong>partition key</strong>, and inside that partition the rows stay sorted by a <strong>clustering key</strong> (often time). Imagine each chat has its own notebook, with the messages written in time order.<br><strong>Why we need it:</strong> millions of small writes every second, and reads that always look the same ("the latest 50 messages of this chat"). This store does both very fast, and gets faster as you add machines.<br><strong>Without it:</strong> one SQL database would have to handle millions of inserts per second. It would hit the limit of one machine soon.` },
    { type: 'callout', tone: 'term', title: 'Partition key and clustering key', html: `<strong>What it is:</strong> when you create a table in Cassandra, you say: <code>PRIMARY KEY ((conversation_id), sent_at)</code>. The <strong>partition key</strong> (conversation_id) decides which machine the data goes to; all messages of one conversation stay together. The <strong>clustering key</strong> (sent_at) is the sort order inside that partition.<br><strong>Why we need it:</strong> "the last 50 messages of this chat" come from one machine, in one continuous (sequential) read.<br><strong>Without it:</strong> messages would be scattered over all machines, and opening any chat would mean asking all of them.<br><strong>Example:</strong> Discord kept its messages in this model (first Cassandra, then a move to ScyllaDB in 2023).` },
    { type: 'ascii', text: `
partition: conversation_id = c-9  (on machine 3)
  sent_at              sender   body
  2026-10-04 10:00:01  42       "did you watch the match?"
  2026-10-04 10:00:07  7        "yes, the last over!"
  2026-10-04 10:00:15  42       "see you tomorrow"

partition: conversation_id = c-12 (on machine 1)
  ...`, caption: 'xyz.com chat: one conversation = one partition, sorted by time inside.' },
    { type: 'p', html: `<strong>Use it when:</strong> chat messages, activity feeds, location history, IoT and events: many writes, and reads by key. <strong>Do not use it when:</strong> you need ad-hoc queries ("all messages that contain word X"), joins, or transactions over many rows. Here you design the query first, then the table. <strong>Products:</strong> Apache Cassandra, ScyllaDB, Google Bigtable, Apache HBase.` },

    { type: 'h3', text: '5. Graph: a web of relationships' },
    { type: 'callout', tone: 'term', title: 'New word: Graph database', html: `<strong>What it is:</strong> data stored as <strong>nodes</strong> (things: users, videos) and <strong>edges</strong> (relationships: "follows", "liked"). Each node keeps a direct list of its relationships, so "walking" from one node to the next is very cheap.<br><strong>Why we need it:</strong> <strong>multi-hop</strong> questions (a trip of several steps), like "friends of Riya's friends who are not yet her friends", are natural in a graph DB.<br><strong>Without it:</strong> in SQL, every hop is one more join. At 3-4 hops the query gets long, hard to write and slow on big tables.` },
    { type: 'ascii', text: `
 (Riya) --follows--> (Aman) --follows--> (Kabir)
   |                    |
 liked               liked
   v                    v
 (video: DSA-1)     (video: Cricket)

Query: Riya -> follows -> follows -> ?   =>  Kabir (suggest him)`, caption: 'The follow graph of xyz.com. "Suggested creators for you" in two hops.' },
    { type: 'p', html: `<strong>Use it when:</strong> friend or creator suggestions, fraud rings (many fake accounts linked to one phone or card), knowledge graphs. <strong>Do not use it when:</strong> simple CRUD (just save it and fetch it by ID), or very high write throughput. For small graphs, recursive queries in Postgres are also enough. <strong>Products:</strong> Neo4j, Amazon Neptune, TigerGraph.` },
    { type: 'h3', text: '6. Time-series: numbers that change over time' },
    { type: 'callout', tone: 'term', title: 'New word: Time-series database', html: `<strong>What it is:</strong> a database that stores "which thing, at what time, had what number". For example, the CPU of each server every 15 seconds. Data always arrives in time order, and old data becomes less important.<br><strong>Why we need it:</strong> this store compresses numbers very well (about 1-2 bytes per sample, according to the Prometheus docs), quickly finds the average or max over a time range, and deletes old data by itself.<br><strong>Without it:</strong> a SQL table with one row per server every 15 seconds. In a few months, billions of rows, a full disk, and a slow "average over the last hour".` },
    { type: 'ascii', text: `
metric: cpu_percent{server="api-3"}
  10:00:00  41
  10:00:15  44
  10:00:30  97   <- spike!
  10:00:45  95
Query: average CPU over the last 5 minutes, for each server`, caption: 'Metrics of the xyz.com servers.' },
    { type: 'p', html: `<strong>Use it when:</strong> server metrics, app latency, video watch-time per minute, sensor readings. <strong>Do not use it when:</strong> business things like users, orders, coins (use SQL for those). <strong>Products:</strong> Prometheus (keeps 15 days by default), InfluxDB, TimescaleDB (a Postgres extension).` },

    { type: 'h3', text: '7. Search engine: finding by words' },
    { type: 'callout', tone: 'term', title: 'New word: Search engine and inverted index', html: `<strong>What it is:</strong> a database that finds things by the <em>words</em> inside text. Inside it there is an <strong>inverted index</strong>: next to each word, the list of documents that contain that word, just like the index at the back of a book.<br><strong>Why we need it:</strong> type "cricket highlights" and you get all posts with these words, the most relevant first (ranking). It works even with a spelling mistake ("cricet") (fuzzy search). Filters work too ("only Hindi, only this week").<br><strong>Without it:</strong> in SQL, <code>WHERE title LIKE '%cricket%'</code>: every row must be read, there is no ranking, and a spelling mistake finds nothing.` },
    { type: 'ascii', text: `
word         ->  post IDs
"cricket"    ->  102, 205, 311
"highlights" ->  205, 311, 480
"mumbai"     ->  101, 205

"cricket highlights"  =>  205, 311 (both words)  -> ranking -> 311 first`, caption: 'Inverted index of xyz.com posts (more in the search lesson).' },
    { type: 'p', html: `<strong>Use it when:</strong> site search, autocomplete, searching logs, catalogs with filters. <strong>Do not use it when:</strong> as the source of truth (keep the real data somewhere else, and a copy here), or for transactions. <strong>Products:</strong> Elasticsearch, OpenSearch, Apache Solr (all built on the Lucene library). At small scale, the built-in full-text search of Postgres also works.` },

    { type: 'h3', text: '8. Vector: things that are alike in "meaning"' },
    { type: 'callout', tone: 'term', title: 'New word: Embedding and vector database', html: `<strong>What it is:</strong> an AI model turns a text, image or video into a long list of numbers (for example 768 numbers). This is called an <strong>embedding</strong> (or vector). The lists of things with similar meaning sit close to each other. A <strong>vector database</strong> quickly finds "the 10 lists closest to this list". It uses approximate methods (like a graph index called HNSW): it gives up a little accuracy for a lot of speed.<br><strong>Why we need it:</strong> "more videos like this", "help articles similar to this question" (for an AI chatbot), where the words can differ but the meaning is the same ("car" and "automobile").<br><strong>Without it:</strong> only keyword search. A user who searches "how to steer a car" never sees the "driving lessons" video.` },
    { type: 'ascii', text: `
video                   embedding (shortened)
"DSA arrays part 1"  -> [0.81, 0.10, 0.33, ...]
"Arrays for beginners" -> [0.79, 0.12, 0.30, ...]   <- close!
"Mumbai rain vlog"   -> [0.05, 0.92, 0.11, ...]   <- far

Query: 2 closest to "DSA arrays part 1"  =>  "Arrays for beginners", ...`, caption: 'xyz.com recommendations: close vectors = similar content.' },
    { type: 'p', html: `<strong>Use it when:</strong> recommendations, semantic search, finding your own documents for an AI chatbot (this is called RAG: first find similar documents, then the AI reads them and answers). <strong>Do not use it when:</strong> exact match ("email = x") or keyword search; a normal index or a search engine is better there. <strong>Products:</strong> pgvector (a Postgres extension; HNSW and IVFFlat indexes), Pinecone, Milvus, Weaviate, Qdrant. If you already have Postgres, starting with pgvector is often enough.` },

    { type: 'h3', text: 'One query, eight databases' },
    { type: 'p', html: `Now see for yourself how the same question runs in different databases. Pick a question:` },
    { type: 'custom', render(el) {
      const F = ['Relational', 'Key-value', 'Document', 'Wide-column', 'Graph', 'Time-series', 'Search', 'Vector'];
      const LBL = { g: 'Best fit', o: 'Will work', x: 'Wrong tool' };
      // per query: [verdict letter for each family, one-line reason]
      const Q = [
        { q: 'Riya → Aman 100 coins transfer', r: [['g', 'Transaction: both rows together, or nothing'], ['x', 'Hard to firmly guarantee changing two keys together'], ['o', 'MongoDB has multi-document transactions, but they are costly'], ['x', 'Not built for transactions over many rows'], ['x', 'Not made for money'], ['x', 'Numbers over time, not balances'], ['x', 'It is a copy, not the source of truth'], ['x', 'Made for similarity']] },
        { q: 'Find the user from a session token', r: [['o', 'Works, but adds load on the main DB on every page'], ['g', 'GET session:8f2a91: one key, under a millisecond'], ['o', 'Works, a bit heavier'], ['o', 'Can read by key, but overkill'], ['x', 'There are no relationships here'], ['x', 'Wrong shape'], ['x', 'Wrong shape'], ['x', 'Wrong shape']] },
        { q: 'Latest 50 messages of chat c-9', r: [['o', 'Fine at small scale with an index; hard at millions of writes/sec'], ['x', 'The whole list in one value? Rewrite the whole value for each message'], ['o', 'Works, but documents get very big for big chats'], ['g', 'One partition, sorted by time, one read'], ['x', 'No relationships, just a list'], ['o', 'Has time order, but not built for text messages'], ['x', 'Not the source of truth'], ['x', 'No similarity needed']] },
        { q: 'Friends of Riya\'s friends (suggestions)', r: [['o', 'Self-join twice; slow at 3-4 hops'], ['x', 'Cannot follow relationships'], ['x', 'Separate reads for each hop, joined in the app'], ['x', 'No joins'], ['g', 'Walking along edges is exactly its job'], ['x', 'Wrong shape'], ['x', 'Wrong shape'], ['o', 'Can give similar users, not relationships']] },
        { q: 'Average CPU over the last hour', r: [['o', 'Fine at small scale, too many rows at big scale'], ['x', 'No range queries'], ['x', 'Wrong shape'], ['o', 'Possible with time-sorted partitions'], ['x', 'Wrong shape'], ['g', 'Compressed, time-range aggregates, old data auto-deleted'], ['o', 'Used for logs and metrics, but costly'], ['x', 'Wrong shape']] },
        { q: 'Search "cricet highlights" (wrong spelling)', r: [['o', 'Built-in full-text at small scale; weak fuzzy search and ranking'], ['x', 'Cannot search by words'], ['o', 'Has some text search, limited'], ['x', 'No ad-hoc text search'], ['x', 'Wrong shape'], ['x', 'Wrong shape'], ['g', 'Inverted index + fuzzy + ranking'], ['o', 'Finds by meaning, weak on spelling and keywords']] },
        { q: '"More videos like this one"', r: [['o', 'Yes, with the pgvector extension'], ['x', 'No similarity'], ['x', 'No similarity'], ['x', 'No similarity'], ['o', '"People who watched this also watched" through relationships'], ['x', 'Wrong shape'], ['o', 'Keyword "more like this", not meaning'], ['g', 'Nearest neighbours: alike in meaning']] },
      ];
      let k = 0;
      el.innerHTML = `<div class="qf-q" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="qf-g" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px"></div>
        <div class="calc-note qf-n"></div>`;
      const q = s => el.querySelector(s);
      const COL = { g: 'var(--green)', o: 'var(--amber)', x: 'var(--red)' };
      const draw = () => {
        q('.qf-q').innerHTML = '';
        Q.forEach((x, j) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (j === k ? ' on' : ''); b.setAttribute('aria-pressed', j === k); b.textContent = x.q; b.onclick = () => { k = j; draw(); }; q('.qf-q').appendChild(b); });
        q('.qf-g').innerHTML = Q[k].r.map(([v, why], j) => `<div style="border:1px solid var(--line);border-left:4px solid ${COL[v]};border-radius:var(--r-sm);padding:8px;background:${v === 'g' ? 'var(--accent-soft)' : 'var(--surface)'}"><div style="font:700 14px var(--f-display);color:var(--ink)">${F[j]}</div><div style="font-size:12px;font-weight:600;color:${COL[v]}">${LBL[v]}</div><div style="font-size:13px;color:var(--ink-2);margin-top:2px">${why}</div></div>`).join('');
        const best = Q[k].r.map((x, j) => x[0] === 'g' ? F[j] : null).filter(Boolean);
        q('.qf-n').textContent = `Best for this question: ${best.join(', ')}. Notice: Relational "will work" almost everywhere. That is why products start with it.`;
      };
      draw();
    }},
    { type: 'h3', text: 'At a glance: the whole family' },
    { type: 'table', head: ['Type', 'Data shape and query', 'Real products', 'In xyz.com', 'NOT when'], rows: [
      ['<strong>Key-value</strong>', 'key → value. Get/put by key only. Very fast, predictable latency', 'Redis, DynamoDB', 'Sessions, cart, user settings, rate-limit counters', 'You need to search by a field inside the value, or joins'],
      ['<strong>Document</strong>', 'key → JSON document (nested). Read the whole document at once', 'MongoDB, Firestore', 'Content blocks of a post, CMS pages, a product catalog where each item has different fields', 'Many links and transactions between many documents'],
      ['<strong>Wide-column</strong>', 'The partition key puts data on one machine; inside, sorted by the clustering key. Very fast writes', 'Cassandra, ScyllaDB, Bigtable, HBase', 'Chat messages (partition = conversation, sort = time), location history, events', 'Ad-hoc queries, joins, "all users whose name starts with R"'],
      ['<strong>Graph</strong>', 'Nodes + edges. Multi-hop queries ("friends of friends")', 'Neo4j, Amazon Neptune', 'Friend suggestions, fraud rings', 'Simple CRUD; very high write throughput'],
      ['<strong>Time-series</strong>', '(metric, time) → value. Aggregates over time ranges; old data compressed or deleted', 'Prometheus, InfluxDB, TimescaleDB', 'Server CPU, request latency, video watch-time per minute', 'Business things like users or orders'],
      ['<strong>Search engine</strong>', 'Inverted index: word → documents. Full-text, fuzzy, filters, ranking', 'Elasticsearch, OpenSearch', 'Searching posts; typing "cricet" still finds "cricket"', 'As the source of truth; transactions'],
      ['<strong>Vector</strong>', 'Embedding (a list of numbers) → the "most similar" items (nearest neighbour)', 'pgvector, Pinecone, Milvus', '"More videos like this", finding documents for an AI chatbot', 'Exact match or keyword search (use a normal index or a search engine there)'],
    ]},
    { type: 'callout', tone: 'term', title: 'Bonus family: Columnar warehouse', html: `<strong>What it is:</strong> a database for analytics (reports) that stores data by <strong>column</strong> instead of by row: all "city" values together, all "views" values together.<br><strong>Why we need it:</strong> a question like "how many views each city had yesterday" needs only 2 columns out of billions of rows. Since each column is stored together, only those columns are read, and repeated values compress very well. The answer comes in seconds.<br><strong>Without it:</strong> this report would run on the main Postgres, read every column of every row, take minutes, and slow down user queries meanwhile.<br><strong>Products:</strong> ClickHouse, BigQuery, Snowflake, Amazon Redshift. They are only for reports, not for the small reads and writes of the app.` },

    { type: 'h3', text: 'Real systems: polyglot' },
    { type: 'p', html: `Big systems do not choose one database. They keep several, one for each kind of job. This is called <strong>polyglot persistence</strong> (polyglot = someone who speaks many languages). For this we need three new words:` },
    { type: 'callout', tone: 'term', title: 'New word: Source of truth', html: `<strong>What it is:</strong> the <em>real</em> home of some data. Every other place holds a copy. If they disagree, the source of truth wins.<br><strong>Why we need it:</strong> when one post lives in Postgres, Elasticsearch and the cache, one of them must count as "the real one".<br><strong>Without it:</strong> three places, three different values, and nobody can say which one is right.` },
    { type: 'callout', tone: 'term', title: 'New word: CDC (Change Data Capture)', html: `<strong>What it is:</strong> a tool that reads the database's own "change diary" (the Postgres WAL, in the next lesson) and turns each insert, update or delete into an <strong>event</strong> (a message) that it puts into <strong>Kafka</strong>. Kafka is a long, ordered line of messages (more in the Kafka lesson). Other systems read from there and update their own copy.<br><strong>Why we need it:</strong> the app writes only to Postgres. Copies like the search index stay in sync by themselves.<br><strong>Without it:</strong> the app must write to two places (a <strong>dual write</strong>). If one write fails, the two copies stay different forever.` },
    { type: 'callout', tone: 'term', title: 'New word: Eventual consistency', html: `<strong>What it is:</strong> a copy becomes correct <em>a little later</em>, not instantly. A new post is in Postgres now, and in search 1-2 seconds later.<br><strong>Why we need it:</strong> updating copies separately (async) keeps the main write fast, and a post still gets saved even when search is down.<br><strong>Without it:</strong> every write would wait until all copies are updated. One copy down = writes down for the whole site.` },
    { type: 'p', html: `Run it and see:` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'app', label: 'xyz.com services', x: 100, y: 180, w: 160, kind: 'server', info: 'What it is: the servers of xyz.com (posts, chat and search features). Different features use different databases, and the service code knows which data lives where.' },
        { id: 'pg', label: 'PostgreSQL', sub: 'users, posts, coins', x: 345, y: 60, w: 160, kind: 'data', info: 'What it is: the main SQL database. Source of truth for users, posts and wallets. Transactions and joins happen here. The default choice.' },
        { id: 'redis', label: 'Redis', sub: 'sessions, counters', x: 345, y: 180, w: 160, kind: 'cache', info: 'What it is: an in-memory key-value store. Sessions, cache, live counters (the unread badge). Very fast, but not the source of truth.' },
        { id: 'cass', label: 'Cassandra', sub: 'chat messages', x: 345, y: 300, w: 160, kind: 'data', info: 'What it is: a wide-column store. Lots of small writes, read by conversation_id. This is the source of truth for chat messages.' },
        { id: 'cdc', label: 'CDC + Kafka', sub: 'change stream', x: 610, y: 60, w: 150, kind: 'queue', info: 'What it is: a Change Data Capture tool + Kafka. It reads the change diary of Postgres (the WAL) and turns each insert or update into an event, so copies stay in sync by themselves. More in the Kafka lesson.' },
        { id: 'es', label: 'Elasticsearch', sub: 'search index', x: 610, y: 300, w: 150, kind: 'data', info: 'What it is: a search engine. A copy of the posts with an inverted index. Not the source of truth: if it breaks, we can rebuild it from Postgres.' },
      ],
      edges: [{ a: 'app', b: 'pg' }, { a: 'app', b: 'redis' }, { a: 'app', b: 'cass' }, { a: 'app', b: 'es' }, { a: 'pg', b: 'cdc' }, { a: 'cdc', b: 'es' }],
      scenarios: [
        { name: 'New post', steps: [
          { title: 'Post into Postgres', go: ['app>pg', 'res:pg>app'], text: 'Saved in the source of truth, inside a transaction.', msg: 'INSERT INTO posts (...) VALUES (...)' },
          { title: 'Change stream', go: 'evt:pg>cdc', text: 'CDC caught the new row from the Postgres log and made an event. The app does not need to write to Elasticsearch separately (no dual-write trouble).' },
          { title: 'Search index update', go: 'evt:cdc>es', text: 'The indexer put the post into Elasticsearch. It shows up in search a few seconds later (eventual consistency).', after: { es: { state: 'ok', sub: 'post indexed' } } },
        ]},
        { name: 'Search', steps: [
          { title: 'Search query', go: ['app>es', 'res:es>app'], text: '"cricet highlights" (wrong spelling). The search engine does a fuzzy match and returns the "cricket" posts. LIKE in Postgres would be neither this fast nor this smart.', msg: 'GET /posts/_search { "match": { "title": { "query": "cricet highlights", "fuzziness": "AUTO" } } }' },
          { title: 'Details from the source of truth', go: ['app>pg', 'res:pg>app'], text: 'Search gave the IDs; if needed, fresh details (likes, deleted?) come from Postgres or the cache.' },
        ]},
        { name: 'Chat message', steps: [
          { title: 'Message into Cassandra', go: ['app>cass', 'res:cass>app'], text: 'Thousands of messages every second. Cassandra does append-style writes very fast (next lesson: LSM tree).', msg: 'INSERT INTO messages (conversation_id, sent_at, sender, body) VALUES (...)' },
          { title: 'Unread count in Redis', go: ['app>redis', 'res:redis>app'], text: 'The badge count lives in an atomic Redis counter.', msg: 'INCR unread:user:42' },
        ]},
        { name: 'Search index behind / down', intro: 'The Elasticsearch cluster is restarting.', steps: [
          { title: 'Post is still saved', go: ['app>pg', 'res:pg>app', 'evt:pg>cdc'], text: 'The source of truth is fine, so no data is lost.' },
          { title: 'Indexing stopped', go: 'lost:cdc>es', set: { es: { state: 'down', sub: 'DOWN' } }, text: 'Events pile up in Kafka. New posts do not show in search (degraded), but the rest of the site works.', after: { cdc: { state: 'warn', sub: 'backlog growing' } } },
          { title: 'Catch-up when it is back', go: 'evt:cdc>es', set: { es: { state: '', sub: 'catching up' } }, text: 'The indexer replays the backlog and catches up. If the index is completely broken, rebuild it from Postgres. That is why a search engine is never the source of truth.', after: { cdc: { state: '', sub: 'change stream' }, es: { state: 'ok', sub: 'in sync' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "SQL does not scale"', html: `SQL databases scale a long way: indexes (next lesson), caching, read replicas (copies of the data used for reading) and sharding (splitting data over many machines; tools: Vitess, Citus). Each of these has its own lesson later. YouTube's metadata ran on sharded MySQL (Vitess was built there). The real benefit of NoSQL is not "scale"; it is built-in partitioning and predictable performance for one <em>special</em> access pattern, and the price is less flexible queries. Also, "schemaless" does not mean there is no schema: the schema now lives in your app code.` },

    { type: 'h2', text: 'Normalization vs denormalization' },
    { type: 'callout', tone: 'term', title: 'New words: Normalization and denormalization', html: `<strong>What it is:</strong> <strong>Normalization</strong> = store each fact in one place only (the author's name only in the users table, only user_id in posts). <strong>Denormalization</strong> = keep copies of data on purpose, for faster reads (author_name stored with every post too).<br><strong>Why we need it:</strong> normalization keeps writes easy and correct (a name change happens in one place). Denormalization makes reads fast (no join).<br><strong>Without it (without thinking about either):</strong> either copies everywhere (hard to change, data that does not match), or costly joins on every read at big scale.` },
    { type: 'p', html: `Normalization has some formal rules called <strong>normal forms</strong>. In plain words: <strong>1NF</strong> = one value per cell (not a comma-separated list). <strong>2NF/3NF</strong> = every column should be about the key of its own table only; the author's name is not about the post, it is about the user, so it goes into the users table. In an interview this is enough: "Normalize up to 3NF, then measure, and denormalize only where it is needed."` },
    { type: 'p', html: `Try it yourself. The same data, two designs. Do two jobs and compare:` },
    { type: 'custom', render(el) {
      const users = [[42, 'Riya'], [7, 'Aman'], [9, 'Kabir']];
      const posts = [[101, 42, 'Mumbai rains'], [102, 7, 'Cricket'], [103, 42, 'DSA notes'], [104, 9, 'Guitar'], [105, 42, 'Trip vlog'], [106, 7, 'Memes']];
      let mode = 'norm', act = null, renamed = false, failHalf = false;
      el.innerHTML = `<div class="nd-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small nd-feed">Show the feed (post + author name)</button>
          <button type="button" class="btn small nd-ren">Riya changed her name: "Riya S"</button>
          <button type="button" class="btn small ghost nd-crash">Crash in the middle of the rename</button>
          <button type="button" class="btn small ghost nd-reset">Reset</button>
        </div>
        <div class="nd-t" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px;font-size:13px"></div>
        <div class="stats"><div class="stat"><span>Tables read</span><strong class="nd-r"></strong></div><div class="stat"><span>Rows written</span><strong class="nd-w"></strong></div></div>
        <div class="nd-n calc-note"></div>`;
      const q = s => el.querySelector(s);
      const cell = (txt, hi) => `<td style="padding:3px 6px;border-top:1px solid var(--line);${hi ? 'background:var(--accent-soft);font-weight:700' : ''}">${txt}</td>`;
      const tbl = (title, head, rows) => `<div style="overflow-x:auto"><div style="font:700 14px var(--f-display);margin-bottom:4px">${title}</div><table style="border-collapse:collapse;width:100%"><tr>${head.map(h => `<th style="text-align:left;padding:3px 6px;color:var(--ink-3)">${h}</th>`).join('')}</tr>${rows.join('')}</table></div>`;
      const draw = () => {
        q('.nd-m').innerHTML = '';
        [['norm', 'Normalized'], ['denorm', 'Denormalized']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (mode === k ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = k; act = null; renamed = false; failHalf = false; draw(); }; q('.nd-m').appendChild(b); });
        const uname = id => (id === 42 && renamed) ? 'Riya S' : users.find(u => u[0] === id)[1];
        let n = 0;
        const uRows = users.map(u => `<tr>${cell(u[0])}${cell(uname(u[0]), u[0] === 42 && renamed)}</tr>`);
        let pRows;
        if (mode === 'norm') {
          pRows = posts.map(p => `<tr>${cell(p[0])}${cell(p[1])}${cell(p[2])}</tr>`);
          q('.nd-t').innerHTML = tbl('users', ['id', 'name'], uRows) + tbl('posts', ['id', 'user_id', 'title'], pRows);
        } else {
          pRows = posts.map(p => {
            let nm = users.find(u => u[0] === p[1])[1], hi = false;
            if (p[1] === 42 && renamed) { n++; const ok = !failHalf || n <= 1; if (ok) { nm = 'Riya S'; hi = true; } }
            return `<tr>${cell(p[0])}${cell(p[2])}${cell(nm, hi)}</tr>`;
          });
          q('.nd-t').innerHTML = tbl('users', ['id', 'name'], uRows) + tbl('posts', ['id', 'title', 'author_name (copy)'], pRows);
        }
        const riyaPosts = posts.filter(p => p[1] === 42).length;
        let r = '-', w = '-', note = 'Pick a job.';
        if (act === 'feed') {
          r = mode === 'norm' ? '2 (join)' : '1 (no join)'; w = '0';
          note = mode === 'norm' ? 'For the feed we had to join posts and users. At small scale this is perfectly fine; at very big scale a join on every feed load can get costly.' : 'The name sits right next to the post, so only one table was read. That is why denormalization is common in big feeds, NoSQL documents and caches.';
        } else if (act === 'ren') {
          r = '-'; w = mode === 'norm' ? '1' : String(1 + riyaPosts);
          note = mode === 'norm' ? 'Only 1 row of the users table. The new name shows up everywhere by itself, because the name lives in one place.' : `1 row of users + copies in Riya's ${riyaPosts} posts = ${1 + riyaPosts} rows. If Riya had 30,000 posts, that would be 30,001 writes. And if even one is missed, the old name shows.`;
        } else if (act === 'crash') {
          w = mode === 'norm' ? '1' : `2 of ${1 + riyaPosts}`;
          note = mode === 'norm' ? 'In the normalized design there was only one row, so there is no such thing as a "half update".' : 'Users and one post were updated, then a crash. Now some posts say "Riya" and some say "Riya S". The data is inconsistent. Fix: change the copies inside one transaction (if they are in one database), or sync them again and again with a background job or events, and accept a short period of mismatch.';
        }
        q('.nd-r').textContent = r; q('.nd-w').textContent = w; q('.nd-n').textContent = note;
      };
      q('.nd-feed').onclick = () => { act = 'feed'; draw(); };
      q('.nd-ren').onclick = () => { act = 'ren'; renamed = true; failHalf = false; draw(); };
      q('.nd-crash').onclick = () => { act = 'crash'; renamed = true; failHalf = true; draw(); };
      q('.nd-reset').onclick = () => { act = null; renamed = false; failHalf = false; draw(); };
      draw();
    }},
    { type: 'p', html: `Rule of thumb: <strong>start normalized</strong> (correct data). Only when a read path is really slow, and you have measured it, denormalize for that path alone (an extra column, a precomputed table, or a cache), and decide how the copies will stay in sync.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Default rule', html: `<strong>Start with PostgreSQL or MySQL</strong>, unless you have a <em>solid</em> reason not to. They give you transactions, joins, constraints, indexes, JSON columns and extensions (pgvector, TimescaleDB, full-text search), and they are the most flexible while access patterns are still unclear. Add a specialised database when the need for one specific access pattern is clear.` },
    { type: 'table', head: ['Signal in the requirements', 'Lean towards'], caption: 'The "SQL or NoSQL?" table from the roadmap', rows: [
      ['Money, inventory, bookings: anything that must never double-count', 'SQL (ACID transactions)'],
      ['Data has relationships and will be queried in many ways', 'SQL'],
      ['Access pattern still unclear, early product', 'SQL; the most flexible'],
      ['Huge write volume with simple access by key (chat, events, IoT, location history)', 'Wide-column: Cassandra, ScyllaDB, Bigtable'],
      ['Simple get/put by key at huge scale with predictable latency (sessions, cart, settings)', 'Key-value: DynamoDB, Redis'],
      ['Flexible, nested, varying schema, read as one blob (catalog, CMS)', 'Document: MongoDB, Firestore'],
      ['Multi-hop relationship queries (friends of friends, fraud rings)', 'Graph: Neo4j, Neptune'],
      ['Metrics and time-stamped measurements', 'Time-series: Prometheus, InfluxDB, TimescaleDB'],
      ['Full-text, fuzzy or faceted search', 'Elasticsearch / OpenSearch, alongside the main DB'],
      ['"Similar meaning" for AI and recommendations', 'Vector: pgvector, Pinecone, Milvus'],
      ['Analytics over billions of rows', 'Columnar warehouse: ClickHouse, BigQuery, Snowflake'],
      ['Files, images, video', 'Object storage (S3, GCS); metadata in a DB'],
    ]},

    { type: 'diagram', title: 'The data of xyz.com: the whole picture', height: 480,
      groups: [
        { label: 'Online stores', x: 14, y: 236, w: 692, h: 92 },
        { label: 'Async copies + analytics', x: 10, y: 362, w: 600, h: 96 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'app / browser', x: 360, y: 50, w: 150, kind: 'client', info: 'What it is: the users of xyz.com, on the phone app or in a browser. They do not care about databases; they just want tips to arrive at once, chats to open fast and search to find the right thing.' },
        { id: 'app', label: 'xyz.com services', sub: 'API servers', x: 360, y: 160, w: 180, kind: 'server', info: 'What it is: the servers of xyz.com. Each feature talks to the right database for its access pattern. The code knows which data lives where.' },
        { id: 'ts', label: 'Prometheus', sub: 'metrics', x: 100, y: 160, kind: 'data', info: 'What it is: a time-series database. Every few seconds the servers send numbers like CPU and latency here. Dashboards and alerts are built on it. Old data is removed by itself.' },
        { id: 'graph', label: 'Neo4j', sub: 'follow graph', x: 620, y: 160, kind: 'data', info: 'What it is: a graph database. Who follows whom, a web of relationships. "Suggested creators for you" (friends of friends) comes from here. At small scale, Postgres could do this job too.' },
        { id: 's3', label: 'Object storage', sub: 'videos (S3)', x: 620, y: 50, kind: 'data', info: 'What it is: the home for big files (videos, images). The database keeps only the file address (URL) and details; the file itself lives here. More in the storage lesson.' },
        { id: 'redis', label: 'Redis', sub: 'sessions, cache', x: 80, y: 290, w: 118, kind: 'cache', info: 'What it is: a key-value store in memory. Sessions, cache, unread counters, rate limits. Very fast, but not the source of truth.' },
        { id: 'pg', label: 'PostgreSQL', sub: 'source of truth', x: 220, y: 290, w: 118, kind: 'data', info: 'What it is: a relational (SQL) database. Users, posts, follows, wallets. ACID transactions and joins. The default and most important database of xyz.com.' },
        { id: 'cass', label: 'Cassandra', sub: 'chat messages', x: 360, y: 290, w: 118, kind: 'data', info: 'What it is: a wide-column store. Partition = conversation, sorted by time inside. Millions of small writes per second. The source of truth for chat.' },
        { id: 'es', label: 'Elasticsearch', sub: 'search copy', x: 500, y: 290, w: 118, kind: 'data', info: 'What it is: a search engine (inverted index). A copy of the posts that arrives through CDC. Fuzzy search and ranking. If it breaks, rebuild it from Postgres.' },
        { id: 'vec', label: 'Vector DB', sub: 'recommendations', x: 640, y: 290, w: 118, kind: 'data', info: 'What it is: a vector database (like pgvector). The embedding of every video. It finds the nearest neighbours for "more videos like this".' },
        { id: 'cdc', label: 'CDC + Kafka', sub: 'change events', x: 225, y: 420, w: 130, kind: 'queue', info: 'What it is: it reads the change diary of Postgres (the WAL) and turns each change into an event. The search, vector and analytics copies stay in sync through it. The app does not need dual writes.' },
        { id: 'wh', label: 'ClickHouse', sub: 'analytics', x: 74, y: 420, w: 120, kind: 'data', info: 'What it is: a columnar warehouse. Reports like "how many views each city had yesterday" over billions of rows in seconds, without slowing down the main Postgres.' },
      ],
      edges: [
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'pg', n: 2 },
        { a: 'app', b: 'redis' },
        { a: 'app', b: 'cass' },
        { a: 'app', b: 'es' },
        { a: 'app', b: 'vec' },
        { a: 'app', b: 'ts', dashed: true, label: 'metrics' },
        { a: 'app', b: 'graph', label: 'suggest' },
        { a: 'app', b: 's3', dashed: true, label: 'videos' },
        { a: 'pg', b: 'cdc', kind: 'evt', n: 3 },
        { a: 'cdc', b: 'es', kind: 'evt', label: 'index' },
        { a: 'cdc', b: 'vec', kind: 'evt', label: 'embeddings', via: [[560, 420]] },
        { a: 'cdc', b: 'wh', kind: 'evt' },
      ],
      paths: [
        { name: 'Tip (money)', text: 'The coin transfer runs in one ACID transaction in Postgres: debit and credit together, or nothing.', go: ['users>app>pg'] },
        { name: 'Chat message', text: 'The message goes into Cassandra (the conversation partition), the unread badge into a Redis counter.', go: ['users>app>cass', 'app>redis'] },
        { name: 'New post → search', text: 'The post is saved in Postgres. CDC caught the change and put a copy into Elasticsearch. It shows in search 1-2 seconds later (eventual consistency).', go: ['users>app>pg>cdc>es', 'app>es'] },
        { name: 'Recommendations', text: 'The embeddings of new videos reach the vector DB through the CDC pipeline. The app fetches "more like this" as nearest neighbours.', go: ['pg>cdc>vec', 'users>app>vec'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Choose a database by <strong>access pattern</strong>, not by brand: how will the data be read and written?</li>
      <li>Default: <strong>PostgreSQL or MySQL</strong>. Transactions, joins, constraints, and the most flexible.</li>
      <li><strong>ACID</strong>: Atomicity (all or nothing), Consistency (rules never break), Isolation (transactions running together do not see each other's half-done work), Durability (after OK, it survives a crash).</li>
      <li>Isolation levels: even Read Committed (the Postgres default) and Repeatable Read (the MySQL default) allow lost updates or write skew. Use an atomic UPDATE, <code>FOR UPDATE</code>, or Serializable + retry.</li>
      <li>The NoSQL family: key-value (by ID), document (nested JSON), wide-column (many writes, by key), graph (relationships), time-series (metrics), search (words), vector (meaning).</li>
      <li>Real systems are polyglot, but each piece of data has <strong>one source of truth</strong>; copies are synced by CDC, a little later (eventual consistency).</li>
      <li>Start normalized. Denormalize only after measuring, and with a plan to keep the copies in sync.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'SQL: transactions, constraints, joins, flexible queries; a default that lasts for years',
      'The right isolation + atomic updates stop races in data like money and bookings',
      'NoSQL: huge scale for one special access pattern, built-in partitioning, predictable latency',
      'Polyglot: each feature gets the tool that fits it',
    ], costs: [
      'More isolation = more locks, waits or errors, and you must write retry logic',
      'In NoSQL, ad-hoc queries and joins are hard; you must design the query in advance',
      'Keeping denormalized copies in sync is new work and a source of bugs',
      'Every extra database = extra operations, monitoring, on-call and sync pipelines',
    ]},
    { type: 'think', questions: [
      { q: 'The "like" button on xyz.com: a user may like a post only once, and the count must stay right. How do you stop lost updates and duplicates?', a: 'A UNIQUE constraint on (user_id, post_id) in the likes table: the database itself blocks a duplicate like. For the count, use UPDATE posts SET likes = likes + 1 (atomic), not read-then-write in the app. Under very heavy traffic, INCR the count in Redis and flush it in batches (write-back), and keep the likes table as the source of truth.' },
      { q: 'A teammate says: "MongoDB for chat, Cassandra for users, Postgres for search." What questions do you ask?', a: 'What is the access pattern of each? Users are relational (profiles, follows, payments) → SQL is natural. Chat is very write-heavy and read by conversation → wide-column fits. For search, Postgres full-text works at small scale, but for fuzzy search, ranking and big scale, Elasticsearch. And: which one is the source of truth, and how will the copies stay in sync?' },
      { q: 'With Postgres Read Committed, two people manage to book the same seat in a "seat booking" flow. Give three fixes.', a: '1) Lock the seat row with SELECT ... FOR UPDATE. 2) A conditional atomic update: UPDATE seats SET booked_by = 42 WHERE id = 7 AND booked_by IS NULL, then check how many rows changed (0 = someone else got it). 3) Run that transaction at Serializable and retry on a serialization error. (Bonus: a UNIQUE constraint on (show_id, seat_no) in the bookings table.)' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In a coin transfer, a crash happens after the debit and before the credit. Which property saves you?', options: ['Isolation', 'Atomicity', 'Durability'], answer: 1, explain: 'Atomicity: a transaction is either complete or not done at all. A half-done transaction is rolled back.' },
      { q: 'What are the default isolation levels of PostgreSQL and MySQL InnoDB?', options: ['Both Serializable', 'Postgres: Read Committed, MySQL: Repeatable Read', 'Postgres: Repeatable Read, MySQL: Read Committed'], answer: 1, explain: 'According to the docs, the Postgres default is Read Committed and the InnoDB default is Repeatable Read.' },
      { q: 'Two moderators updated different rows and broke the rule (0 on duty). Which anomaly is this, and which level stops it?', options: ['Dirty read; Read Committed', 'Write skew; Serializable', 'Phantom; Read Uncommitted'], answer: 1, explain: 'Write skew: both read the same data and wrote different rows. Even Repeatable Read (snapshot) does not stop it; you need Serializable (or explicit locks).' },
      { q: 'A chat app: millions of messages per second, and reads are always "the latest messages of this conversation". What is the most natural fit?', options: ['Graph DB', 'Wide-column (Cassandra/ScyllaDB)', 'Columnar warehouse'], answer: 1, explain: 'Partition = conversation, clustering = time. Write-heavy, access by key.' },
      { q: 'You use Elasticsearch for search. Where should the source of truth be?', options: ['In Elasticsearch', 'In the main database (like Postgres), with ES as its copy', 'In Redis'], answer: 1, explain: 'The search index is a derived copy synced through CDC. If it breaks, rebuild it from the source of truth.' },
      { q: 'The app showed "Tip sent", then the power went out at once. After the restart, the tip must still be there. Which ACID letter is this?', options: ['Atomicity', 'Consistency', 'Durability'], answer: 2, explain: 'Durability: once COMMIT returned OK, the data must survive a crash. The database does this with a write-ahead log (next lesson).' },
      { q: 'xyz.com wants to show "more videos like this one", even when the title words are different. Which family?', options: ['Search engine (keywords)', 'Vector database (embeddings)', 'Time-series'], answer: 1, explain: 'Things alike in meaning = nearest neighbours of embeddings. Keyword search would miss similar videos that use different words.' },
      { q: '"Friends of Riya\'s friends who are not yet her friends", at very big scale, many times a day. Which tool is most natural?', options: ['Graph database', 'Key-value store', 'Columnar warehouse'], answer: 0, explain: 'Multi-hop relationships are the real job of a graph DB. At small scale, self-joins in Postgres also work.' },
    ]},
    { type: 'sources', note: 'Isolation behaviour and defaults were checked against these.', items: [
      { title: 'Transaction Isolation', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/transaction-iso.html', used: 'Default Read Committed; Read Uncommitted behaves as Read Committed; Repeatable Read has no phantoms and raises serialization errors on concurrent update; Serializable via SSI.' },
      { title: 'Transaction Isolation Levels (InnoDB)', publisher: 'MySQL 8.4 Reference Manual', official: true, url: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html', used: 'Default Repeatable Read; consistent snapshot reads; next-key/gap locks; Serializable converts plain SELECT to FOR SHARE.' },
      { title: 'Hermitage: testing transaction isolation levels', publisher: 'Martin Kleppmann (GitHub)', url: 'https://github.com/ept/hermitage', used: 'Which anomalies (lost update P4, write skew G2-item, phantoms) each Postgres/MySQL level actually prevents.' },
      { title: 'pgvector: open-source vector similarity search for Postgres', publisher: 'pgvector (GitHub)', official: true, url: 'https://github.com/pgvector/pgvector', used: 'Vector search inside Postgres; HNSW and IVFFlat approximate indexes; L2, inner product and cosine distance.' },
      { title: 'Storage', publisher: 'Prometheus documentation', official: true, url: 'https://prometheus.io/docs/prometheus/latest/storage/', used: 'Time-series storage in two-hour blocks with a WAL, about 1-2 bytes per sample, default retention 15 days.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog (2023)', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'Messages in a wide-column store, Cassandra to ScyllaDB migration.' },
    ]},
  ],
});
