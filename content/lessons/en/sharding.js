Lesson.register({
  id: 'sharding',
  title: 'Partitioning and sharding',
  minutes: 34,
  summary: `Replicas took care of reads and availability, but every write still goes to a single leader, and the data is growing bigger than one machine's disk. Sharding means splitting the data into pieces and keeping them on different machines, so both writes and storage can scale. The biggest decision: the shard key.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com's data has become so big that it no longer fits in one computer. And new changes (writes) arrive so fast that one computer gets tired.<br>Making copies (replicas) will not help, because every copy also has to write every change.<br>The fix: <strong>split the data into parts</strong>. Like the books of a library spread over many shelves: A-F on the first shelf, G-M on the second. Each shelf is a separate computer.<br>The real question of this lesson: <strong>which thing goes on which shelf</strong>, so that no single shelf overflows, and you do not have to open every shelf to find something.` },
    { type: 'h2', text: 'Problem: the leader can no longer handle the writes' },
    { type: 'p', html: `In the last lesson xyz.com got a leader + replicas. Reads were spread out, and failover arrived. But now orders, chats and posts on xyz.com have grown so much that:` },
    { type: 'list', items: [
      `<strong>Writes:</strong> about 40,000 writes per second. One SQL leader comfortably handles a few thousand up to about 10,000 writes per second. Replicas do not help here, because every replica also has to apply every write.`,
      `<strong>Storage:</strong> the data is now 20 TB. According to the roadmap, one database machine is comfortable up to about 1-5 TB. Beyond that, backups, index rebuilds and making a new replica all take hours or days.`,
      `<strong>A bigger machine?</strong> Already done. Even the biggest machine stops at some limit.`,
    ]},
    { type: 'p', html: `The answer: split the data into <strong>pieces</strong>. Each piece lives on a separate machine, with its own writes and its own storage. 4 pieces = roughly 4 times the writes and 4 times the storage.` },
    { type: 'callout', tone: 'term', title: 'New word: Partition and Shard', html: `<strong>What it is:</strong> <strong>partitioning</strong> = breaking a big dataset into smaller parts. When these parts are kept on <strong>different machines</strong>, each part is called a <strong>shard</strong> and the process is called <strong>sharding</strong>. (Cassandra, Kafka and DynamoDB say "partition"; MongoDB and Vitess say "shard". Same idea.)<br><strong>Why we need it:</strong> each shard handles the writes for its own part and stores its own data. 4 shards = about 4 times the writes and 4 times the storage.<br><strong>Without it:</strong> all writes go to one leader, all data sits on one disk, and one day that limit arrives.<br><strong>Example:</strong> 20 TB of orders, 4 shards: about 5 TB and about 10,000 writes per second on each shard.` },
    { type: 'callout', tone: 'term', title: 'New word: Shard key', html: `<strong>What it is:</strong> the column whose value decides which shard a row goes to, for example <code>user_id</code>. In the library, the book title (A-F, G-M) is like the shard key.<br><strong>Why we need it:</strong> it tells us where to store the data and later where to find it.<br><strong>Without it:</strong> data could be anywhere, and every query would have to open every shard.<br><strong>Careful:</strong> this is the biggest decision in this lesson, and changing it later is very expensive.` },

    { type: 'h2', text: 'Vertical vs horizontal partitioning' },
    { type: 'p', html: `There are two completely different ways to split data. The names sound alike, so people get confused.` },
    { type: 'compare',
      left: { title: 'Vertical: split columns/tables', ascii: `
users table
┌────┬──────┬───────┬──────────┐
│ id │ name │ email │ bio, pic │
└────┴──────┴───────┴──────────┘
        ↓ split
┌────┬──────┬───────┐ ┌────┬──────────┐
│ id │ name │ email │ │ id │ bio, pic │
└────┴──────┴───────┘ └────┴──────────┘
  hot, small             big, rarely read`, html: `Split the columns of one table, or put the tables of different features in different databases (users DB, orders DB, chat DB). This is also called <em>functional partitioning</em>. An easy first step, but each part still lives on one machine: if the users table itself grows to 10 TB, this will not save you.` },
      right: { title: 'Horizontal: split rows', ascii: `
orders table (1 billion rows)
        ↓ split by user_id
┌─────────────┐ ┌─────────────┐
│ Shard 1     │ │ Shard 2     │
│ users A...  │ │ users B...  │
│ same columns│ │ same columns│
└─────────────┘ └─────────────┘`, html: `Every shard has the <strong>same schema</strong> (schema = the shape of a table: which columns, of which type), but different rows. This is real <strong>sharding</strong>. With it, writes and storage can both scale without a limit, but queries, joins and transactions become hard.` },
    },
    { type: 'callout', tone: 'mistake', title: 'Try these first', html: `Sharding is <strong>expensive</strong>: every query must think about the shard key, cross-shard joins are hard, and operations get heavy. Remember the roadmap's order: indexes → cache → read replicas → a bigger machine → vertical/functional split → <strong>then</strong> sharding. Many companies run for years on one good Postgres/MySQL.` },

    { type: 'h2', text: 'How does a request find its shard?' },
    { type: 'p', html: `The data is now on 3 machines. Whatever query comes in, someone has to say "user 42's data is on Shard 2". A <strong>router</strong> does this job. The router can live in three places: a library inside the app, a proxy in the middle (Vitess's VTGate), or a coordinator node of the database (Citus). All three do the same work: look at the shard key, find the shard, send the query there.` },
    { type: 'callout', tone: 'term', title: 'New word: Shard router', html: `<strong>What it is:</strong> a small "direction giver". A query comes in, it looks at the shard key value and says "this is on Shard 2".<br><strong>Why we need it:</strong> so the app does not have to work it out every time, and the map of shards stays in one place. If a shard changes, you only change the router's map.<br><strong>Without it:</strong> every app server keeps its own copy of the map, and if even one is out of date, queries go to the wrong shard.` },
    { type: 'callout', tone: 'term', title: 'New word: Scatter-gather', html: `<strong>What it is:</strong> when a query has no shard key, the router sends it to <strong>all</strong> shards (scatter = spread out) and joins their answers (gather = collect).<br><strong>When it is fine:</strong> for rare queries, like an admin report.<br><strong>Problem:</strong> every shard has to do work, and the whole query is as slow as the <strong>slowest shard</strong>. If your most common query is turning into scatter-gather, you picked the wrong shard key.<br><strong>Example:</strong> 4 shards, three answer in 20 ms, one in 900 ms: the query takes 900 ms.` },
    { type: 'flow', title: 'Orders, sharded by user_id', height: 340,
      nodes: [
        { id: 'app', label: 'App server', x: 80, y: 170, w: 120, kind: 'server', info: 'What it is: xyz.com\'s API server. It only needs to send the query; the router decides which shard.' },
        { id: 'rt', label: 'Shard router', sub: 'key → shard', x: 260, y: 170, w: 150, kind: 'net', info: 'What it is: the direction giver (router). It finds the shard from the shard key value, for example from hash(user_id). If the query has no shard key, it has to ask every shard (scatter-gather) and join the results. It can be an app library, a proxy (VTGate) or a coordinator (Citus).' },
        { id: 's1', label: 'Shard 1', sub: '1/3 of users', x: 500, y: 55, w: 150, kind: 'data', meter: true, load: 40, info: 'What it is: the first part of the data, a separate database machine (really a leader + replicas, from the last lesson). It holds the orders only of the users whose hash maps to it.' },
        { id: 's2', label: 'Shard 2', sub: '1/3 of users', x: 500, y: 170, w: 150, kind: 'data', meter: true, load: 40, info: 'What it is: the second part. Same schema (same columns), different users. Shards know nothing about each other.' },
        { id: 's3', label: 'Shard 3', sub: '1/3 of users', x: 500, y: 285, w: 150, kind: 'data', meter: true, load: 40, info: 'What it is: the third part. Each shard takes its own writes, so the total write capacity is roughly 3 times bigger.' },
      ],
      edges: [{ a: 'app', b: 'rt' }, { a: 'rt', b: 's1' }, { a: 'rt', b: 's2' }, { a: 'rt', b: 's3' }],
      scenarios: [
        { name: 'One shard (happy)', steps: [
          { title: 'Riya opens her orders', text: 'The query has the shard key (user_id). Great.', go: 'app>rt', msg: 'SELECT * FROM orders WHERE user_id = 42' },
          { title: 'The router finds the shard', text: 'hash(42) gives Shard 2. Only that machine will work; the other two do not even notice.', set: { s1: { state: 'dim' }, s3: { state: 'dim' } }, go: 'rt>s2', msg: 'hash(42) → Shard 2' },
          { title: 'The answer', text: 'One machine, one index lookup, fast. That is why you choose the shard key that appears in your <strong>most common query</strong>.', go: 'res:s2>rt>app', after: { s2: { state: 'hit' } } },
          { title: 'Writes are spread too', text: 'Every new order goes to its user\'s shard. All three machines are taking writes: 3 times the write capacity.', flood: { paths: ['app>rt>s1', 'app>rt>s2', 'app>rt>s3'], n: 12 }, set: { s1: { state: '' }, s3: { state: '' } } },
        ]},
        { name: 'Scatter-gather', intro: 'Admin dashboard: "all of today\'s orders above ₹5,000". There is no user_id in it.', steps: [
          { title: 'A query without the shard key', text: 'The router does not know where these orders are. They could be on any shard.', go: 'app>rt', msg: 'SELECT * FROM orders WHERE created_at >= today AND amount > 5000\nORDER BY amount DESC LIMIT 20' },
          { title: 'Scatter: ask everyone', text: 'The router sends the query to all three shards. This is called <strong>scatter</strong>.', parallel: true, go: ['rt>s1', 'rt>s2', 'rt>s3'] },
          { title: 'One shard is slow', text: 'A backup is running on Shard 3 right now. It takes 900 ms. The router needs <strong>everyone\'s</strong> answer, so the whole query takes 900 ms.', set: { s3: { state: 'warn', sub: 'slow: 900 ms' } }, parallel: true, go: ['res:s1>rt', 'res:s2>rt'] },
          { title: 'Gather: join and sort', text: 'Each shard sent its top 20. The router merges the 60 rows and picks the final top 20. This is called <strong>gather</strong>. The more shards, the more work, and the bigger the chance that one of them is slow (tail latency).', go: ['res:s3>rt', 'res:rt>app'], msg: '3 × top 20 → merge → top 20' },
        ]},
        { name: 'Hot shard', intro: 'A celebrity seller started a sale. All their orders use a single user_id.', steps: [
          { title: 'A storm on one key', text: 'The seller\'s user_id = 7. hash(7) → Shard 1. All the sale\'s writes go to that one key.', flood: { paths: ['app>rt>s1'], n: 16 }, after: { s1: { load: 99, state: 'hot', sub: 'HOT: seller 7' }, s2: { load: 25 }, s3: { load: 25 } } },
          { title: 'The other shards are idle', text: 'Shards 2 and 3 are relaxing. The total capacity is plenty, but one shard hit its limit. This is called a <strong>hot shard</strong> or <strong>hot partition</strong>, and when one key causes it, a <strong>celebrity key</strong>.', focus: ['s1', 's2', 's3'] },
          { title: 'Other users on Shard 1 suffer too', text: 'Normal users who live on Shard 1 also get slow queries. One user\'s problem becomes everyone\'s problem. Fixes are in the "Hot shards" section below.', go: ['app>rt>s1', 'bad:s1>rt>app'], msg: 'timeout: Shard 1 overloaded' },
        ]},
        { name: 'One shard down', steps: [
          { title: 'Shard 3 crashes', text: 'Shard 3\'s machine is gone (and a failover is still running).', set: { s3: { state: 'down', sub: 'DOWN' } }, go: 'lost:rt>s3' },
          { title: 'Users on Shards 1 and 2: all normal', text: 'Their orders are perfectly fine. This is a hidden benefit of sharding: the <strong>blast radius</strong> of a failure (how much it damages) is small. Not the whole site, only 1/3 of users are affected.', go: ['app>rt>s1', 'res:s1>rt>app'] },
          { title: 'Users on Shard 3: error', text: 'For them, "orders are not loading". That is why each shard is itself replicated (leader + replicas + failover). Sharding gives scale, replication gives availability: real systems use both together.', go: ['app>rt>s3', 'bad:s3>rt>app'], msg: '503: shard 3 unavailable' },
        ]},
      ],
    },

    { type: 'h2', text: 'How to choose the shard: 4 strategies' },
    { type: 'h3', text: '1. Range-based sharding' },
    { type: 'p', html: `By <strong>range</strong> of the key: user_id 1 to 10 million on Shard 1, 10 to 20 million on Shard 2... or names A-F, G-M... or dates: Jan-Mar on Shard 1, Apr-Jun on Shard 2. Like the volumes of an encyclopedia.<br><strong>Worked example:</strong> 4 shards: user_id 1 to 2.5 million on Shard 1, 2.5 to 5 million on Shard 2, 5 to 7.5 million on Shard 3, above 7.5 million on Shard 4. Today 10,000 new users joined. Their ids are around 8 million (auto-increment, which means each new user gets the next number). So <strong>all 10,000 land on Shard 4</strong>, and new users are usually the most active.` },
    { type: 'list', items: [
      `<strong>Good:</strong> range queries hit one or two shards ("orders from 1 to 7 March", "user_id 500 to 600"). The sorted order is kept.`,
      `<strong>Bad:</strong> if the key keeps growing (a timestamp, an auto-increment id), <strong>all new writes go to the last shard</strong>. The other shards just sit with old data. A classic hot shard.`,
      `<strong>Where:</strong> Bigtable/HBase (row-key ranges that split when they grow), MongoDB range sharding, time-series data.`,
    ]},
    { type: 'h3', text: '2. Hash-based sharding' },
    { type: 'p', html: `Compute a <strong>hash</strong> of the key (a function that turns any value into a random-looking number), then pick the shard from that number. User 41 and user 42 can land on completely different shards. Data and load spread out evenly.<br><strong>Worked example:</strong> 4 shards, shard = hash(user_id) % 4. The same 10,000 new users land about 2,500 on each of the four shards. But a query like "user_id from 500 to 600" now goes to all four shards.` },
    { type: 'callout', tone: 'term', title: 'New word: Hash function', html: `<strong>What it is:</strong> a formula that turns an input (like <code>"user:42"</code>) into a big number. The same input = always the same number. But a tiny change in the input (42 → 43) = a completely different number. Examples: MurmurHash, xxHash, MD5.<br><strong>Why we need it:</strong> it spreads keys over shards in a "random-looking" way, but always to the same place. Later the router runs the same formula to find the shard.<br><strong>Without it:</strong> either ranges (new users pile up in one place), or writing down every key's location in a table.<br><strong>% (modulo):</strong> the remainder after division. 10 % 4 = 2. So <code>hash % 4</code> always gives 0, 1, 2 or 3: one of four shards.` },
    { type: 'list', items: [
      `<strong>Good:</strong> an even spread; even sequential keys get scattered.`,
      `<strong>Bad:</strong> range queries are now scatter-gather ("user_id 500-600" goes to every shard). And if you used <code>hash % N</code>, changing N moves almost all the data around (the next lesson, Consistent hashing, is the fix for this).`,
      `<strong>Where:</strong> Cassandra, DynamoDB (hash of the partition key), Citus, Vitess's hash vindex, Redis Cluster.`,
    ]},
    { type: 'h3', text: '3. Directory / lookup-based sharding' },
    { type: 'p', html: `Keep a separate small table (a <strong>directory</strong>): "tenant 7 → Shard 3", "tenant 8 → Shard 1" (tenant = one customer company with its own separate data). The router checks the directory first. No formula, full control.<br><strong>Worked example:</strong> xyz.com Business has 1,000 small customers (companies) and 1 very big customer, "MegaCorp", which alone brings 30% of the traffic. Write in the directory: "MegaCorp → Shard 4 (only them)", and spread the other 1,000 evenly over Shards 1-3. MegaCorp grew even bigger tomorrow? Just change its entry and move it to a new shard.` },
    { type: 'list', items: [
      `<strong>Good:</strong> you can put any key anywhere. A big customer (company) on its own shard; one hot tenant can be moved alone without touching the others.`,
      `<strong>Bad:</strong> an extra lookup before every query (that is why the directory is cached), and the directory itself must be highly available, or it becomes the SPOF.`,
      `<strong>Where:</strong> multi-tenant SaaS (each company is one tenant). Vitess's <em>lookup vindexes</em> are built on this idea too.`,
    ]},
    { type: 'h3', text: '4. Geo sharding' },
    { type: 'p', html: `By the user's <strong>country or region</strong>: Indian users' data on a Mumbai shard, Europe's on Frankfurt.<br><strong>Worked example:</strong> 55% of xyz.com's users are in India, 15% in the US, 15% in Europe, 15% elsewhere. With 4 geo shards, the India shard is 2.2 times heavier than the average (25%): 55 ÷ 25 = 2.2.` },
    { type: 'list', items: [
      `<strong>Good:</strong> data is close to the user (lower latency), and it is easier to follow <strong>data residency</strong> laws (some countries want their citizens' data to stay inside the country).`,
      `<strong>Bad:</strong> countries are not equal. Half of xyz.com's users are in India, so the India shard is many times heavier than the rest. In the roadmap's words: India would melt that shard. So inside each geo region you shard again by hash.`,
    ]},
    { type: 'table', head: ['Strategy', 'Spread', 'Range query', 'Resharding', 'Best when'], rows: [
      ['Range', 'Depends on the key; a sequential key = hot', 'Good', 'Splitting a range is easy', 'Time-series, sorted scans'],
      ['Hash', 'Even', 'Scatter-gather', 'mod N is bad; fixed partitions / consistent hashing are good', 'The default for user/entity data'],
      ['Directory', 'Whatever you choose', 'Depends', 'The most flexible (change an entry)', 'Multi-tenant, big customers'],
      ['Geo', 'Follows country size (uneven)', 'Inside a region', 'Hard', 'Latency + data residency'],
    ]},

    { type: 'h3', text: 'Strategy lab: which key goes where' },
    { type: 'p', html: `Each small box is a user (number = user_id). The colour shows which shard it is on. Change the strategy, then press "10 new users" and see where the new users land. Turn on "Celebrity": user 7 alone brings 30% of the traffic.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="sl-st" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary sl-add">+ 10 new users</button>
          <button type="button" class="btn small sl-cel"></button>
          <button type="button" class="btn small ghost sl-reset">Reset</button>
        </div>
        <div class="sl-rule calc-note" style="margin-top:10px"></div>
        <div class="sl-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:6px;margin-top:12px"></div>
        <div class="sl-bars" style="margin-top:14px"></div>
        <div class="calc-note sl-note"></div>`;
      const q = s => el.querySelector(s);
      const COL = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--violet)'];
      const ST = { range: 'Range', hash: 'Hash', dir: 'Directory', geo: 'Geo' };
      const RULE = {
        range: 'Rule: user_id 1-10 → Shard 1, 11-20 → Shard 2, 21-30 → Shard 3, 31 and above → Shard 4.',
        hash: 'Rule: shard = hash("id:" + id) % 4. Each id gets a "random-looking" but fixed shard. (With small numbers it goes a little up and down; with millions of keys it is almost even.)',
        dir: 'Rule: a lookup table. When a new user comes, write them on the emptiest shard. If Celebrity is on, user 7 gets Shard 4 all alone.',
        geo: 'Rule: by country. India → Shard 1, US → Shard 2, Europe → Shard 3, others → Shard 4. (55% of users are from India.)',
      };
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
      const country = id => { const r = hash('c:' + id) % 100; return r < 55 ? 0 : r < 70 ? 1 : r < 85 ? 2 : 3; };
      const CN = ['IN', 'US', 'EU', '..'];
      let st = 'range', n = 40, cel = false;
      function place(st, n, cel) {
        const shard = [], cnt = [0, 0, 0, 0];
        for (let id = 1; id <= n; id++) {
          let s;
          if (st === 'range') s = id <= 10 ? 0 : id <= 20 ? 1 : id <= 30 ? 2 : 3;
          else if (st === 'hash') s = hash('id:' + id) % 4;
          else if (st === 'geo') s = country(id);
          else if (cel && id === 7) s = 3;
          else { const pool = cel ? [0, 1, 2] : [0, 1, 2, 3]; s = pool.reduce((b, x) => cnt[x] < cnt[b] ? x : b, pool[0]); }
          shard[id] = s; cnt[s]++;
        }
        const w = id => cel && id === 7 ? 0.3 * (n - 1) / 0.7 : 1;
        const tr = [0, 0, 0, 0]; let tot = 0;
        for (let id = 1; id <= n; id++) { tr[shard[id]] += w(id); tot += w(id); }
        return { shard, cnt, traffic: tr.map(t => t / tot) };
      }
      const upd = () => {
        const sb = q('.sl-st'); sb.innerHTML = '';
        Object.entries(ST).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === st ? ' on' : ''); b.textContent = v; b.onclick = () => { st = k; upd(); }; sb.appendChild(b); });
        q('.sl-cel').textContent = 'Celebrity (user 7): ' + (cel ? 'ON' : 'OFF');
        q('.sl-add').disabled = n >= 80;
        q('.sl-rule').textContent = RULE[st];
        const r = place(st, n, cel);
        let g = '';
        for (let id = 1; id <= n; id++) {
          const isNew = id > 40, star = cel && id === 7;
          g += `<div title="user ${id}" style="border:2px solid ${COL[r.shard[id]]};border-radius:6px;background:${star ? 'var(--surface)' : 'var(--surface-2)'};text-align:center;padding:3px 0;font:${isNew || star ? 700 : 400} 12px var(--f-mono);color:var(--ink)${isNew ? ';box-shadow:0 0 0 2px var(--line-2)' : ''}">${star ? '★' : ''}${id}${st === 'geo' ? `<div style="font-size:10px;color:var(--ink-3)">${CN[country(id)]}</div>` : ''}</div>`;
        }
        q('.sl-grid').innerHTML = g;
        q('.sl-bars').innerHTML = r.cnt.map((c, i) => {
          const p = r.traffic[i] * 100;
          return `<div style="display:grid;grid-template-columns:72px 1fr 104px;gap:8px;align-items:center;margin:5px 0">
            <strong style="color:${COL[i]};font-family:var(--f-display);white-space:nowrap">Shard ${i + 1}</strong>
            <div style="height:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;overflow:hidden"><div style="height:100%;width:${p.toFixed(1)}%;background:${COL[i]}"></div></div>
            <span style="font:12px var(--f-mono);color:var(--ink-2)">${c} user${c === 1 ? '' : 's'}, ${p.toFixed(0)}%</span></div>`;
        }).join('') + '<div style="font-size:12px;color:var(--ink-3)">Bar = the share of the traffic on that shard. If even, each shard gets ~25%.</div>';
        const mx = Math.max(...r.traffic), hot = r.traffic.indexOf(mx) + 1;
        let note;
        if (st === 'range') note = n > 40 ? `The ${n - 40} new users (thick border) ALL went to Shard 4, because new ids are always the biggest. Shard 4: ${r.cnt[3]} users, the others 10 each. A growing key + range = one hot shard.` + (cel ? ` And user 7 (the celebrity) is on Shard 1: ${(r.traffic[0] * 100).toFixed(0)}% of the traffic is there.` : '') : 'Right now all are even (10 each). Now press "+ 10 new users".' + (cel ? ` Celebrity user 7 is on Shard 1: ${(r.traffic[0] * 100).toFixed(0)}% of the traffic is there.` : '');
        else if (st === 'hash') note = cel ? `The users are spread evenly, but all of user 7's traffic goes to one shard: Shard ${hot} gets ${(mx * 100).toFixed(0)}% of the traffic. Hash spreads keys, not the traffic of one key.` : `The new users also spread over all four shards (${r.cnt.join(', ')}). But a range query like "user_id 11 to 20" now has to go to all four shards.`;
        else if (st === 'dir') note = cel ? `The directory gave user 7 Shard 4 all alone (${(r.traffic[3] * 100).toFixed(0)}% of the traffic, but only 1 user). The other ${n - 1} users are even on Shards 1-3. Full control, but every query must check the table first.` : `Every new user goes to the emptiest shard (${r.cnt.join(', ')}). The table has ${n} entries: one line per user. This table itself must be fast and highly available.`;
        else note = `The India shard, Shard 1: ${r.cnt[0]} users (${(r.traffic[0] * 100).toFixed(0)}% of the traffic). Countries are not equal, so inside a geo shard you hash again.` + (cel ? ` Celebrity user 7 is from Europe (${CN[country(7)]}), so Shard ${country(7) + 1} also gets ${(r.traffic[country(7)] * 100).toFixed(0)}% of the traffic.` : '');
        q('.sl-note').textContent = note;
      };
      q('.sl-add').onclick = () => { n = Math.min(80, n + 10); upd(); };
      q('.sl-cel').onclick = () => { cel = !cel; upd(); };
      q('.sl-reset').onclick = () => { n = 40; cel = false; upd(); };
      upd();
    }},
    { type: 'h2', text: 'Choose it yourself: shard key playground' },
    { type: 'p', html: `xyz.com has 4 shards. Pick a dataset, pick a shard key, and see how today's 20,000 writes are spread over the shards, which shard gets hot, and which queries run on one shard vs on all shards (scatter-gather). Then turn on the "celebrity" toggle.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="sk-ds" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="sk-keys" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="sk-celeb" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="sk-bars" style="margin-top:14px"></div>
        <div class="stats">
          <div class="stat"><span>Heaviest shard</span><strong class="sk-max"></strong></div>
          <div class="stat"><span>Ideal (even)</span><strong>25%</strong></div>
          <div class="stat"><span>Imbalance (max ÷ avg)</span><strong class="sk-imb"></strong></div>
        </div>
        <div class="sk-q" style="margin-top:14px"></div>
        <div class="calc-note sk-note"></div>`;
      const DS = {
        orders: { name: 'Orders', celeb: 'Flash-sale reseller: 15% of orders from one user', keys: {
          user_id: 'user_id (hash)', order_id: 'order_id (hash)', created_at: 'created_at (range)', country: 'country (geo)' },
          queries: [['user_id', 'All of Riya\'s orders ("My orders")', true], ['order_id', 'Details of order #9912', false], ['created_at', 'All of today\'s orders (report)', false], ['country', 'All orders from India', false]] },
        chat: { name: 'Chat messages', celeb: 'Giant group chat: 20% of messages in one group', keys: {
          conversation_id: 'conversation_id (hash)', sender_id: 'sender_id (hash)', created_at: 'created_at (range)', country: 'country (geo)' },
          queries: [['conversation_id', 'Opening one chat\'s history', true], ['sender_id', 'Everything Riya sent', false], ['created_at', 'Messages from the last hour', false], ['country', 'All messages from India', false]] },
      };
      let ds = 'orders', key = 'user_id', celeb = false;
      const q = s => el.querySelector(s);
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const COUNTRY = [['IN', 0.55, 0], ['US', 0.15, 1], ['EU', 0.15, 2], ['OTHER', 0.15, 3]];
      function distribute(dsName, k, cel) {
        let seed = 12345;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const cnt = [0, 0, 0, 0], N = 20000;
        for (let i = 0; i < N; i++) {
          const r = rnd(); let ctry = 'OTHER', geo = 3, acc = 0;
          for (const [c, p, g] of COUNTRY) { acc += p; if (r < acc) { ctry = c; geo = g; break; } }
          const isCeleb = cel && rnd() < (dsName === 'orders' ? 0.15 : 0.20);
          const row = {
            user_id: isCeleb && dsName === 'orders' ? 7 : 1 + Math.floor(rnd() * 50000),
            order_id: 1000000 + i,
            conversation_id: isCeleb && dsName === 'chat' ? 1 : 1 + Math.floor(rnd() * 30000),
            sender_id: 1 + Math.floor(rnd() * 50000),
          };
          let s;
          if (k === 'created_at') s = 3; // shards = quarters; today's writes go to Shard 4, the current quarter
          else if (k === 'country') s = geo;
          else s = hash(k + ':' + row[k]) % 4;
          cnt[s]++;
        }
        return cnt.map(c => c / N);
      }
      const chips = (box, map, get, set) => { box.innerHTML = ''; Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = v; b.onclick = () => { set(k); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        const D = DS[ds];
        chips(q('.sk-ds'), { orders: 'Orders', chat: 'Chat messages' }, () => ds, v => { ds = v; key = Object.keys(DS[v].keys)[0]; });
        chips(q('.sk-keys'), D.keys, () => key, v => key = v);
        chips(q('.sk-celeb'), { off: 'Celebrity: off', on: D.celeb }, () => celeb ? 'on' : 'off', v => celeb = v === 'on');
        const sh = distribute(ds, key, celeb);
        const mx = Math.max(...sh), imb = mx / 0.25;
        q('.sk-bars').innerHTML = sh.map((p, i) => {
          const col = p >= 0.38 ? 'var(--red)' : p >= 0.32 ? 'var(--amber)' : 'var(--green)';
          return `<div style="display:grid;grid-template-columns:70px 1fr 56px;gap:10px;align-items:center;margin:6px 0">
            <strong style="font-family:var(--f-display)">Shard ${i + 1}</strong>
            <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div style="height:100%;width:${(p * 100).toFixed(1)}%;background:${col};transition:width .4s"></div></div>
            <span style="font:13px var(--f-mono)">${(p * 100).toFixed(1)}%</span></div>`;
        }).join('');
        q('.sk-max').textContent = (mx * 100).toFixed(1) + '%';
        q('.sk-imb').textContent = imb.toFixed(2) + 'x';
        q('.sk-q').innerHTML = D.queries.map(([f, label, main]) => {
          const one = f === key;
          return `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;padding:6px 0;border-bottom:1px solid var(--line)">
            <span>${main ? '★ ' : ''}${label}${main ? ' <em style="color:var(--ink-3)">(most common)</em>' : ''}</span>
            <strong style="color:${one ? 'var(--green)' : 'var(--amber)'}">${one ? '1 shard' : 'scatter-gather: 4 shards'}</strong></div>`;
        }).join('');
        let note;
        if (key === 'created_at') note = 'Range by time: old data is spread over the quarters, but ALL of today\'s writes go to Shard 4, the current quarter. The other 3 shards are useless for writes. The roadmap\'s warning: do not make a timestamp the shard key.';
        else if (key === 'country') note = 'Geo: India\'s 55% of users sit on one shard. Celebrity or not, this shard is always hot. Use geo only for latency/data residency, with hash sharding inside it.';
        else if (mx >= 0.38) note = 'Hash spread everything else evenly, but all the traffic of one celebrity key lands on one shard (one key always goes to one shard). Fix: split that key (key + bucket/suffix), cache its reads, or give it its own shard.';
        else if (D.queries[0][0] !== key) note = 'The load is even, but the most common query has become scatter-gather: every "open chat"/"my orders" asks 4 shards. Choose the shard key from the most common query.';
        else note = 'Great: the load is even and the most common query hits a single shard. This is the roadmap\'s Decide rule.' + (celeb ? ' (The celebrity made it a bit uneven; keep an eye on it.)' : '');
        q('.sk-note').textContent = note;
      };
      upd();
    }},

    { type: 'h2', text: 'Hot shards and celebrity keys' },
    { type: 'p', html: `Hash sharding spreads <em>keys</em> evenly, not <em>traffic</em>. All the data of one key always goes to one shard. So if one key (a celebrity's post, a giant group chat, a big enterprise customer) brings 1,000 times more traffic than the rest, its shard will get hot no matter what.` },
    { type: 'callout', tone: 'term', title: 'New word: Hot shard and celebrity key', html: `<strong>What it is:</strong> a <strong>hot shard</strong> = a shard that gets far more traffic than all the others. When the cause is a single key (a celebrity's account, a viral post, a giant group chat), that key is called a <strong>celebrity key</strong> (or hot key).<br><strong>Why it matters:</strong> the system's capacity is only as big as its hottest shard. One of 4 shards at 100% = the system is stuck, even if the other 3 are empty.<br><strong>Without it (if you ignore it):</strong> one viral post makes every normal user on that shard slow or timed out too.<br><strong>Example:</strong> 4 shards, each can handle 10,000 writes per second. A celebrity's live sale brings 15,000 writes per second to one key: that shard gets 15,000, even though the total capacity was 40,000.` },
    { type: 'table', head: ['Fix', 'How', 'When'], rows: [
      ['A better shard key', 'A key whose traffic is naturally spread out', 'At design time, the cheapest'],
      ['Key splitting / salting', 'Add a suffix to the hot key: <code>post_99#0</code> ... <code>post_99#9</code>. Writes spread over 10 shards; on read, combine the 10 places', 'Write-hot keys (counters, likes)'],
      ['Time bucket', 'Key = <code>conversation_id + week</code>: a very long chat\'s data is spread over many partitions, each of limited size', 'Chats with long history, logs'],
      ['Cache / request coalescing', 'Put a read-hot key in the cache; turn identical requests that arrive together into one DB query', 'Read-hot keys (a viral post)'],
      ['Give it its own shard', 'Use the directory to give a big customer a dedicated shard', 'Multi-tenant, enterprise customers'],
    ]},
    { type: 'callout', tone: 'why', title: 'Real world: Discord and Slack', html: `<strong>Discord</strong> (engineering blog, 2023): messages are partitioned by <code>channel_id</code> + a fixed time window (a "bucket"). Busy channels in big servers still created <em>hot partitions</em>, and one hot node could hurt the latency of the whole cluster. They built "data services" in Rust in front of the database that combine identical requests arriving together into one query (request coalescing), and route requests to the same instance by channel.<br><br><strong>Slack</strong> (engineering blog, 2020): at first all the data of one workspace was on one shard. Big enterprise customers' shards hit hardware limits while other shards sat empty. By moving to Vitess they could shard some data by keys like <code>channel_id</code>, which spread the load much more evenly.` },

    { type: 'h2', text: 'Cross-shard queries and joins' },
    { type: 'p', html: `On one machine a <code>JOIN</code> felt free. After sharding, if the orders are on Shard 2 and their products on Shard 4, the database cannot join them by itself. Options:` },
    { type: 'list', items: [
      `<strong>Co-location:</strong> shard related tables by the <em>same key</em>. A user's orders, cart and addresses: all by <code>user_id</code>, so all on one shard and the join is local. Citus calls this idea "co-location".`,
      `<strong>Reference tables:</strong> keep a full copy of small, rarely changing tables (countries, categories) on <em>every</em> shard. Citus calls them "reference tables".`,
      `<strong>Denormalize:</strong> copy the product's name and price into the order row itself. No join needed (cost: on update you have to change it in many places).`,
      `<strong>App-level join:</strong> run two queries and join them in code. It works, but the number of network hops grows.`,
    ]},
    { type: 'p', html: `<strong>Cross-shard transactions</strong> are the hardest: "take 100 from Riya's wallet (Shard 1), put it in Aman's (Shard 3)" now spans two machines. This needs two-phase commit or sagas (the "Sagas and distributed transactions" lesson). So choose a shard key that keeps most transactions inside one shard. In the same way, a <strong>globally unique</strong> constraint (like a unique username) cannot be checked by each shard alone.` },

    { type: 'h2', text: 'Secondary indexes on sharded data' },
    { type: 'p', html: `Orders are sharded by <code>user_id</code>. Now the support team needs "orders with phone number 98xxx" or "status = pending". That is not the shard key. Where should the index live? Two ways:` },
    { type: 'callout', tone: 'term', title: 'New word: Secondary index', html: `<strong>What it is:</strong> an index = the list at the back of a book ("status pending → pages 12, 40, 77"), which finds rows without reading the whole table (remember the Indexes lesson). A <strong>secondary</strong> index = an index on a column <em>other than</em> the shard key (status, phone).<br><strong>Why we need it:</strong> support, admin and search need to find things by something other than the shard key.<br><strong>Without it:</strong> a full table scan on every shard, every time.<br><strong>The question with sharding:</strong> should each shard keep its own list (local), or should there be one separate sharded list for everyone (global)?` },
    { type: 'compare',
      left: { title: 'Local index (each shard its own)', ascii: `
Shard 1: orders + index(status)
Shard 2: orders + index(status)
Shard 3: orders + index(status)

query status=pending → all shards`, html: `Each shard keeps an index of only its own rows. <strong>Writes are easy</strong> (the row and the index are on the same machine, in the same transaction). But a query by status = <strong>scatter-gather</strong>. MongoDB, Cassandra secondary indexes and DynamoDB's <em>local</em> secondary index belong to this family.` },
      right: { title: 'Global index (sharded itself)', ascii: `
Index shard A: status a..m → order ids
Index shard B: status n..z → order ids

query status=pending → only index shard B
               → then fetch those orders`, html: `Shard the index separately, by the <em>indexed value</em>. A <strong>read</strong> goes to one index shard only. But every write now has to be written in <strong>two places</strong> (the row on one shard, the index entry on another), and the index is often updated async, so it can be a little out of date. DynamoDB's <em>global</em> secondary indexes and Vitess's lookup vindexes work like this.` },
    },
    { type: 'p', html: `Count it yourself. Choose how many shards there are, and how many orders match the query "status = pending". The lab shows how many shards have to work for one read and for one write:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="ix-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label>Data shards: <strong class="ix-nv"></strong></label><input class="ix-n" type="range" min="4" max="64" step="4" value="8"></div>
          <div><label>Orders matching "status = pending": <strong class="ix-kv"></strong></label><input class="ix-k" type="range" min="1" max="20" step="1" value="5"></div>
        </div>
        <div class="ix-viz" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>One read: calls to shards</span><strong class="ix-r"></strong></div>
          <div class="stat"><span>One new order: places written</span><strong class="ix-w"></strong></div>
          <div class="stat"><span>Is the index always fresh?</span><strong class="ix-f"></strong></div>
        </div>
        <div class="calc-note ix-note"></div>`;
      const q = s => el.querySelector(s);
      let mode = 'local';
      function sim(mode, N, K) {
        let seed = 42;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const hit = new Set();
        for (let i = 0; i < K; i++) hit.add(Math.floor(rnd() * N));
        if (mode === 'local') return { asked: N, data: hit, reads: N, writes: 1 };
        return { asked: hit.size, data: hit, reads: 1 + hit.size, writes: 2 };
      }
      const upd = () => {
        const mb = q('.ix-m'); mb.innerHTML = '';
        [['local', 'Local index (each shard its own)'], ['global', 'Global index (sharded separately)']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = v; b.onclick = () => { mode = k; upd(); }; mb.appendChild(b); });
        const N = +q('.ix-n').value, K = +q('.ix-k').value;
        q('.ix-nv').textContent = N; q('.ix-kv').textContent = K;
        const r = sim(mode, N, K);
        let h = '<div style="font-size:12px;color:var(--ink-3);margin-bottom:4px">Data shards (blue = this read asked it, ● = it has a match)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:4px">';
        for (let i = 0; i < N; i++) {
          const asked = mode === 'local' || r.data.has(i), has = r.data.has(i);
          h += `<div style="height:26px;border-radius:5px;border:1px solid ${asked ? 'var(--accent)' : 'var(--line)'};background:${asked ? 'var(--accent-soft)' : 'var(--surface-2)'};display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--ink)">${has ? '●' : ''}</div>`;
        }
        h += '</div>';
        if (mode === 'global') h += '<div style="margin-top:8px;display:inline-block;padding:4px 10px;border-radius:6px;border:2px solid var(--violet);font-size:12px;color:var(--ink)">Index shard: "pending" → ' + K + ' order ids</div>';
        q('.ix-viz').innerHTML = h;
        q('.ix-r').textContent = r.reads + (mode === 'local' ? ' (all shards)' : ' (1 index + ' + r.asked + ' data)');
        q('.ix-w').textContent = r.writes === 1 ? '1 shard' : '2 shards';
        q('.ix-f').textContent = mode === 'local' ? 'Yes' : 'Often a little late';
        q('.ix-note').textContent = mode === 'local'
          ? `Each shard has its own index, so a new order and its index entry are on the same machine, in one transaction. But the "pending orders" read asks ${N} shards, even though matches exist on only ${r.data.size} shards. Make it ${N * 4} shards and every read makes ${N * 4} calls.`
          : `First the index shard gave the ${K} "pending" order ids, then the orders were fetched from only those ${r.asked} data shards: ${r.reads} calls in total, even with ${N} shards. The price: every new order is written in 2 places (data shard + index shard), and the index is often updated async, so for a moment a new order may not show in the list.`;
      };
      ['.ix-n', '.ix-k'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"I added an index, so the query is fast" is only half true in a sharded world. With a local index the query is fast on each shard, but you still have to ask <strong>every</strong> shard. That is fine with 4 shards; with 400 shards every query becomes 400 calls. For frequent queries, think of a global index or a separate store (like Elasticsearch for search).` },

    { type: 'h2', text: 'Resharding / rebalancing' },
    { type: 'p', html: `The 4 shards are full too. Now we need one more machine (say 5). Moving data to new shards is called <strong>resharding</strong> (or rebalancing), and it has to be done while the site keeps running. How you chose shards decides how painful this will be.` },
    { type: 'list', items: [
      `<strong>The bad way, <code>hash % N</code>:</strong> as soon as N goes from 4 to 5, every key's <code>hash % 5</code> comes out different, so about 80% of the data has to move. In the next lesson (Consistent hashing) you will see this yourself with a slider.`,
      `<strong>A fixed number of many partitions:</strong> from the start, create many small <em>logical</em> shards (for example 1,024), and keep them on a few machines (256 on each machine). The key → logical shard formula <strong>never changes</strong>. When a new machine arrives, just move some whole logical shards onto it. Instagram described exactly this in its 2012 post: thousands of logical shards, mapped at first onto just a few physical database servers. Citus also breaks a table into a fixed number of shards (32 by default) that can be moved between workers. In Redis Cluster these are the 16,384 "hash slots".`,
      `<strong>Splitting:</strong> when range or hash-range shards get big or hot, cut them in two. HBase/Bigtable regions and DynamoDB partitions split like this. According to DynamoDB's 2022 paper, it splits a partition based on its traffic, not only down the middle.`,
    ]},
    { type: 'p', html: `See the difference yourself: grow the machines from 4, and see how much data has to move and how long it will take:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Machines: from 4 to <strong class="rs-mv"></strong></label><input class="rs-m" type="range" min="5" max="16" step="1" value="5"></div>
          <div><label>Total data: <strong class="rs-dv"></strong></label><input class="rs-d" type="range" min="1" max="100" step="1" value="20"></div>
        </div>
        <div class="rs-bars" style="margin-top:14px"></div>
        <div class="calc-note rs-note"></div>`;
      const q = s => el.querySelector(s);
      const N = 4, P = 1024, SPEED = 1000; // MB/s total copy speed
      const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
      const KEYS = []; for (let i = 0; i < 20000; i++) KEYS.push(hash('order:' + i));
      function movedMod(M) { let m = 0; for (const h of KEYS) if (h % N !== h % M) m++; return m / KEYS.length; }
      function movedLogical(M) {
        const base = Math.floor(P / M), extra = P % M;
        const target = []; for (let i = 0; i < M; i++) target.push(base + (i < extra ? 1 : 0));
        let keep = 0; for (let i = 0; i < N; i++) keep += Math.min(P / N, target[i]);
        return (P - keep) / P;
      }
      const hrs = tb => tb * 1e6 / SPEED / 3600;
      const upd = () => {
        const M = +q('.rs-m').value, D = +q('.rs-d').value;
        q('.rs-mv').textContent = M; q('.rs-dv').textContent = D + ' TB';
        const a = movedMod(M), b = movedLogical(M), ideal = (M - N) / M;
        const row = (name, f, col) => `<div style="margin:8px 0"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;font-size:14px"><strong>${name}</strong><span style="font:13px var(--f-mono)">${(f * 100).toFixed(1)}% = ${(f * D).toFixed(1)} TB, ~${hrs(f * D).toFixed(1)} hours</span></div>
          <div style="height:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin-top:4px"><div style="height:100%;width:${(f * 100).toFixed(1)}%;background:${col}"></div></div></div>`;
        q('.rs-bars').innerHTML = row('hash % N', a, 'var(--red)') + row('1,024 logical shards', b, 'var(--green)') + `<div style="font-size:12px;color:var(--ink-3)">The minimum that must move anyway: (${M} − 4) ÷ ${M} = ${(ideal * 100).toFixed(1)}%. Copy speed assumed: 1 GB/s.</div>`;
        q('.rs-note').textContent = M % N === 0
          ? `${M} is an exact multiple of 4, so hash % N also moves only ${(a * 100).toFixed(0)}% (the minimum): each old shard splits into equal parts. That is why some teams always double (4 → 8 → 16). But doubling every time is expensive, and for numbers like 5, 6 or 7, hash % N moves far too much.`
          : `With hash % N, ${(a * 100).toFixed(0)}% of keys changed shard, because the formula itself changed. With logical shards the formula (key → one of 1,024) never changes; only ${Math.round(b * P)} whole logical shards moved to the new machines: ${(b * 100).toFixed(1)}%, which is about the minimum.`;
      };
      ['.rs-m', '.rs-d'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `The steps to move data without taking the site down:` },
    { type: 'steps', items: [
      { t: 'Copy', d: 'Copy a snapshot of the data to be moved onto the new shard. The old shard is still taking all reads and writes.' },
      { t: 'Catch up', d: 'Keep replaying the new writes that arrived during the copy onto the new shard, from the replication log (binlog/WAL), until it is only milliseconds behind. Vitess does this with VReplication.' },
      { t: 'Verify', d: 'Compare the data on both sides (row counts, checksums).' },
      { t: 'Cutover', d: 'For a moment, stop writes to that data, apply the last changes, change the router\'s map, and open writes on the new shard. This pause should last seconds.' },
      { t: 'Cleanup', d: 'A few days later, if everything looks fine, delete that data from the old shard.' },
    ]},

    { type: 'h2', text: 'Vitess and Citus: sharding ready-made' },
    { type: 'p', html: `Writing your own sharding router, resharding and failover is a lot of work. Two popular open-source systems do this job on top of SQL databases:` },
    { type: 'table', head: ['', 'Vitess', 'Citus'], rows: [
      ['Runs on', 'MySQL', 'PostgreSQL (extension)'],
      ['Where it came from', 'Built by YouTube to scale MySQL; now a CNCF project', 'Built by Citus Data, now owned by Microsoft; also managed on Azure'],
      ['Router', '<strong>VTGate</strong>: a stateless proxy; the app talks to it like a normal MySQL', 'A <strong>coordinator</strong> node takes the query and sends it to the workers'],
      ['Each shard', 'MySQL + <strong>VTTablet</strong> (a sidecar in front of it that handles connection pooling, health and replication)', 'Normal Postgres tables (shards) on <strong>worker</strong> nodes'],
      ['Shard key', '<strong>Vindex</strong>: column value → keyspace ID; shards are ranges of keyspace IDs (<code>-80</code>, <code>80-</code>)', 'A <strong>distribution column</strong>, hashed to a shard'],
      ['Secondary lookups', 'Lookup vindex (like a global index)', 'Co-location + reference tables'],
      ['Resharding', 'Online with VReplication, by splitting ranges', 'Move/rebalance shards between workers'],
      ['Real use', 'Slack (by 2020, ~99% of MySQL traffic on Vitess), YouTube, many more', 'Multi-tenant SaaS, real-time analytics'],
    ]},
    { type: 'p', html: `The core idea of both is what we saw in the flow: a router that finds the shard from the shard key, scatter-gather when there is no shard key, and every shard replicated on its own. Vitess keeps the topology information (which shard is where, who is the leader) in a separate <em>topology service</em> (like etcd/ZooKeeper), and Citus keeps it in the coordinator's metadata tables.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: how to choose the shard key', html: `Choose the shard key from your <strong>most common query</strong>.<br>• <strong>Chat messages:</strong> shard by <code>conversation_id</code>, so a chat's whole history sits on one shard.<br>• <strong>Orders:</strong> by <code>user_id</code>, for "my orders".<br>• <strong>Avoid</strong> keys that pile traffic up in one place: <strong>timestamp</strong> (all new writes on one shard) or <strong>country</strong> (India would melt its shard).` },
    { type: 'table', head: ['Question', 'Good answer'], rows: [
      ['Are the writes or the data bigger than one node?', 'If yes, shard. If only reads/HA are the problem, use replicas first'],
      ['What does the most common query filter by?', 'That is the shard key'],
      ['Does that key have many values, with traffic spread out?', 'Yes = a good key. Only a few values (country, status) or a growing one (time) = bad'],
      ['Related tables?', 'Shard them by the same key (co-location)'],
      ['Will the machines grow later?', 'Many logical shards from the start, or consistent hashing'],
    ]},

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Sharding: xyz.com\'s full setup', height: 620,
      groups: [
        { label: 'Users + app', x: 270, y: 4, w: 420, h: 210 },
        { label: 'Routing', x: 30, y: 234, w: 660, h: 104 },
        { label: 'Shards', x: 20, y: 384, w: 680, h: 222 },
      ],
      nodes: [
        { id: 'users', label: 'xyz.com users', sub: 'Riya, Aman...', x: 360, y: 60, kind: 'client', info: 'What it is: the people of xyz.com. Each user\'s data lives on the shard picked from their user_id.' },
        { id: 'app', label: 'App servers', x: 360, y: 170, w: 160, kind: 'server', info: 'What it is: xyz.com\'s code. It does not know the shards directly; it hands every query to the router.' },
        { id: 'cache', label: 'Hot-key cache', sub: 'viral post', x: 600, y: 170, w: 150, kind: 'cache', info: 'What it is: an in-memory cache (like Redis). Reads of a celebrity/viral key are served from here, so its shard does not get hot.' },
        { id: 'rt', label: 'Shard router', sub: 'VTGate / Citus', x: 360, y: 290, w: 170, kind: 'net', info: 'What it is: the direction giver. It looks at the shard key and picks the shard. With no key, it asks every shard (scatter-gather) and joins the answers.' },
        { id: 'map', label: 'Shard map', sub: 'directory / etcd', x: 120, y: 290, w: 150, kind: 'data', info: 'What it is: the map of which key or range lives on which shard (plus special directory entries, like MegaCorp → Shard 4). The router caches it. This is what changes during resharding.' },
        { id: 'gidx', label: 'Global index', sub: 'status → ids', x: 600, y: 290, w: 150, kind: 'data', info: 'What it is: a separate sharded index for finding rows by a column other than the shard key (status, phone). Reads go to one place, but every write goes to 2 places and the index can be a little late.' },
        { id: 's1', label: 'Shard 1', sub: 'hash range A', x: 100, y: 430, w: 140, kind: 'data', info: 'What it is: one part of the data. Inside it is a leader + replicas (last lesson), and it takes its own writes.' },
        { id: 's2', label: 'Shard 2', sub: 'Riya\'s data', x: 270, y: 430, w: 140, kind: 'data', info: 'What it is: the second part. All of Riya\'s orders, cart and addresses live here (co-location), so "my orders" hits one shard.' },
        { id: 's3', label: 'Shard 3', sub: 'filling up', x: 440, y: 430, w: 140, kind: 'data', info: 'What it is: the third part, which has grown big. Some of its logical shards are being moved to a new shard.' },
        { id: 's4', label: 'Shard 4', sub: 'MegaCorp (dir)', x: 610, y: 430, w: 140, kind: 'data', info: 'What it is: a shard given to one big customer through the directory, so their traffic does not slow down other users.' },
        { id: 'nw', label: 'New shard', sub: 'resharding', x: 440, y: 560, w: 140, kind: 'data', info: 'What it is: a new machine. After copy → catch up → verify → cutover, the router\'s map changes and traffic starts coming here.' },
      ],
      edges: [
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'rt', n: 2 },
        { a: 'rt', b: 's2', n: 3, label: 'hash(user_id)' },
        { a: 'rt', b: 's1', dashed: true },
        { a: 'rt', b: 's3', dashed: true },
        { a: 'rt', b: 's4', dashed: true },
        { a: 'rt', b: 'map', label: 'where?' },
        { a: 'rt', b: 'gidx', label: 'status' },
        { a: 'app', b: 'cache', label: 'hot key' },
        { a: 's3', b: 'nw', kind: 'evt', dashed: true, label: 'copy + catch up' },
      ],
      paths: [
        { name: 'My orders', text: 'The query has user_id: the router used the hash to pick Shard 2. One shard, fast.', go: ['users>app>rt>s2'] },
        { name: 'Admin report', text: 'No shard key: the router asked all four shards and joined the answers (scatter-gather).', go: ['app>rt>s1', 'rt>s2', 'rt>s3', 'rt>s4'] },
        { name: 'Find by status', text: 'The global index gave the pending order ids, then the orders came from only their shard.', go: ['app>rt>gidx', 'rt>s3'] },
        { name: 'Viral post', text: 'Reads of the celebrity key come from the cache: they never reach the shard.', go: ['users>app>cache'] },
        { name: 'Resharding', text: 'Part of Shard 3 is being copied to the new shard; at cutover the shard map changes.', go: ['s3>nw', 'rt>map'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Sharding = splitting data into parts on different machines. Writes and storage scale; replication only helps reads and availability.</li>
      <li>The shard key is the biggest decision: choose it from the most common query (chat → conversation_id, orders → user_id).</li>
      <li>Range: good range queries, but a growing key (time, auto-increment) = all new writes on one shard. Hash: even spread, range queries scatter. Directory: full control, an extra lookup. Geo: closeness and laws, but countries are not equal.</li>
      <li>Hash spreads keys, not traffic: for a celebrity key use splitting, a cache, or its own shard.</li>
      <li>A query without the shard key = scatter-gather, as slow as the slowest shard.</li>
      <li>Keep joins/transactions inside one shard: co-location, reference tables, denormalize.</li>
      <li>Local index: easy writes, reads hit every shard. Global index: reads hit one place, writes go to two places and can be a little late.</li>
      <li>Resharding: do not use hash % N; start with many logical shards (or consistent hashing), and move with copy → catch up → verify → cutover.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Writes and storage grow with the machines', 'Each shard is small: backups, indexes and new replicas are fast', 'A failure\'s blast radius is small (one shard = some users)', 'Geo sharding keeps data near users and follows residency laws'], costs: ['A wrong shard key = hot shards, or every query is scatter-gather', 'Cross-shard joins, transactions and unique constraints are hard', 'Secondary indexes: either scatter-gather or writes in two places', 'Resharding is a big, risky operation', 'The operations load: N shards × (leader + replicas)'] },

    { type: 'think', questions: [
      { q: 'xyz.com has a "likes" table: (post_id, user_id, time). The most common queries: "how many likes on this post" and "did I like this post". What shard key would you use? What happens with a viral post?', a: 'post_id: both queries hit one shard. But all the likes of a viral post land on one shard (a celebrity key). Fix: keep the count in a separate counter that is written with key splitting (post_99#0..#9) and read from a cache, or batch likes in a queue and update the count. The "did I like it" lookup by (post_id, user_id) stays on the same shard.' },
      { q: 'A B2B app has 10,000 small companies and 3 very big companies. What problem will hash(company_id) sharding have, and what would you do?', a: 'The shard where the three big companies land will get hot, and one big company may even be bigger than a whole shard. Directory-based sharding: give the big companies dedicated shards, and spread the small ones over the rest by hash. And if even one company is bigger than one machine, shard inside it by another key (like channel_id/project_id), as Slack did.' },
      { q: 'You used hash % 4 with 4 shards. Two years later you need 6. What are your options now?', a: 'Switching to hash % 6 means moving about two thirds of the data (~66% in the lab, while the minimum is ~33%). Better: migrate once to a fixed, large number of logical shards (like 1,024) that you map onto machines, or to consistent hashing. From then on, only whole logical shards move. Do the migration live with the copy → catch up → verify → cutover steps.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the best shard key for messages in a WhatsApp-like chat?', options: ['created_at', 'conversation_id', 'country'], answer: 1, explain: 'The most common query is "this chat\'s history". With conversation_id the whole chat is on one shard. With created_at all new writes go to one shard; with country the India shard melts.' },
      { q: 'Orders are sharded by created_at (range). What is the biggest problem?', options: ['Range queries are slow', 'All of today\'s writes go to one (the latest) shard', 'Data is not spread evenly in the old shards'], answer: 1, explain: 'Time only moves forward, so every new order goes to the shard with the latest range. The other shards are useless for writes.' },
      { q: 'A query has no shard key. What will the router do?', options: ['Error', 'Scatter-gather: send it to all shards and join the results', 'Pick one random shard'], answer: 1, explain: 'The router does not know where the data is, so it has to ask everyone. The query is as slow as the slowest shard.' },
      { q: 'What is the downside of a global secondary index?', options: ['The query goes to every shard', 'Every write must also be written to the index\'s shard, and the index is often a little out of date', 'The index can only live on one shard'], answer: 1, explain: 'A global index makes reads fast (one index shard); the price is paid on writes and consistency. A local index has the opposite trade-off.' },
      { q: 'What is the biggest benefit of directory-based sharding?', options: ['No lookup is needed', 'You can place or move any key (like one big customer) alone on any shard', 'Range queries always hit one shard'], answer: 1, explain: 'The directory is a table: "key → shard". There is no formula, so you can change any entry and move that key. The price: a lookup before every query, and the table itself must be highly available.' },
      { q: 'With hash % N, you go from 4 to 5 machines. About how much data moves?', options: ['~20%', '~50%', '~80%'], answer: 2, explain: 'As soon as the formula changes, every key\'s hash % 5 is new. The lab showed 79.7%. With logical shards only ~20% (the minimum) would move.' },
      { q: 'Which one increases write capacity: replication or sharding?', options: ['Replication', 'Sharding', 'Both equally'], answer: 1, explain: 'Replicas copy all the writes. Shards split the writes between them. Real systems use both together: replicas for each shard.' },
    ]},
    { type: 'sources', note: 'Product-specific facts and real-world examples come from these sources.', items: [
      { title: 'Vitess docs: Architecture and Vindexes', publisher: 'Vitess (CNCF)', official: true, url: 'https://vitess.io/docs/reference/features/vindexes/', used: 'VTGate, VTTablet, the topology service, vindex → keyspace ID, shard ranges (-80, 80-), lookup vindexes, scatter queries.' },
      { title: 'Citus docs: Concepts and configuration (citus.shard_count)', publisher: 'Citus Data / Microsoft', official: true, url: 'https://docs.citusdata.com/en/stable/get_started/concepts.html', used: 'Coordinator + workers, distribution column, hash shards, the default shard count of 32, reference tables, co-location.' },
      { title: 'Scaling Datastores at Slack with Vitess', publisher: 'Slack Engineering (2020)', official: true, url: 'https://slack.engineering/scaling-datastores-at-slack-with-vitess/', used: 'Hot spots from workspace-based sharding, channel-based sharding, ~99% of MySQL traffic on Vitess.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord blog (2023)', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'channel_id + time bucket partitioning, hot partitions, request-coalescing data services.' },
      { title: 'Sharding & IDs at Instagram', publisher: 'Instagram Engineering (2012)', official: true, url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c', used: 'Thousands of logical shards on a few physical servers, scaling by moving logical shards.' },
      { title: 'Designing Data-Intensive Applications, chapter 6 (Partitioning)', publisher: "Martin Kleppmann, O'Reilly (2017)", url: 'https://dataintensive.net/', used: 'Key-range vs hash partitioning, skew and hot spots, local (document-partitioned) vs global (term-partitioned) secondary indexes, rebalancing with a fixed number of partitions, the problem with hash mod N.' },
      { title: 'Amazon DynamoDB (USENIX ATC 2022)', publisher: 'USENIX / Amazon', official: true, url: 'https://www.usenix.org/system/files/atc22-elhemali.pdf', used: 'Partition key hashing, key-range partitions, traffic-based partition splitting.' },
    ]},
  ],
});
