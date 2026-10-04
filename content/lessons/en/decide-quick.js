Lesson.register({
  id: 'decide-quick',
  title: 'Quick decisions',
  minutes: 28,
  summary: `In interviews and in real work, eight "A or B?" questions come up again and again: replication or sharding, strong or eventual, push or pull feed, LB or API gateway, monolith or microservices, Sentinel or Cluster, CDN or direct, optimistic or pessimistic locking. Learn the signals for each one, use the decision deck, and watch the wrong choice fall over.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In earlier lessons we learned many tools: replicas, shards, CDN, gateway, locks...<br>Now the real question is: <strong>which tool, when?</strong><br>Eight questions come up again and again, and each one has two options: A or B.<br>Inside each question hides a small "signal", like "is there money here?" or "does the data fit on one machine?".<br>In this lesson you will learn how to spot the signal, and how to use it to pick the right option.` },
    { type: 'h2', text: 'The problem: the same eight questions in every design review' },
    { type: 'p', html: `xyz.com has grown big: videos, feed, chat, ticket booking, everything. Every week, in the design review, someone asks "should we add a replica here or shard?", "should the feed be push or pull?". These questions are not new, and their answers are not random either. Each question has some <strong>signals</strong> hidden inside the requirements. Spot the signal, and the answer follows.` },
    { type: 'p', html: `How each concept works inside was covered in earlier lessons (the links are in each section). This lesson is only about the <strong>decision</strong>: when A, when B, and when both.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "there is one right answer"', html: `For most of these questions the real answer is <strong>"both, in different places"</strong>. Each shard of a sharded database also has replicas. An LB and an API gateway run together. Feeds are often hybrid. In an interview, saying "A, because of this signal; but B for this part" is far better than just saying "A".` },
    { type: 'callout', tone: 'term', title: 'New word: Signal', html: `<strong>What it is:</strong> the one fact in a requirement that changes the decision. For example "the user's money is involved" or "this account has 5 crore followers".<br><strong>Why we need it:</strong> it turns "it depends" into a clear reason. Find the signal first, then pick the tool.<br><strong>Without it:</strong> people pick tools because they are popular ("Cluster sounds bigger"), and regret it later.` },
    { type: 'h3', text: 'Words from earlier lessons, one line each' },
    { type: 'p', html: `Before reading the table, recall all the words once. The full lesson for each word is in the link.` },
    { type: 'table', head: ['Word', 'In one line', 'Details'], rows: [
      ['Replication', 'Full copies of the same data on several machines. If one fails, another keeps working.', '<a href="#/replication">Replication</a>'],
      ['Sharding', 'Splitting data into pieces and keeping each piece on a different machine.', '<a href="#/sharding">Sharding</a>'],
      ['HA (high availability)', 'The site keeps running even if one machine fails.', '<a href="#/availability-spof">Availability</a>'],
      ['Strong / eventual consistency', 'Strong: everyone always sees the latest value. Eventual: you may see a value a few seconds old, then everyone matches.', '<a href="#/cap">CAP</a>'],
      ['Fan-out', 'Delivering one post to a large number of followers.', '<a href="#/pattern-fanout">Fan-out</a>'],
      ['Load balancer (LB)', 'Spreads traffic across several copies of the same app.', '<a href="#/load-balancer">Load balancer</a>'],
      ['API gateway', 'One front door for all requests: login check, rate limit, sending to the right service.', '<a href="#/resilience">Resilience</a>'],
      ['Monolith / microservices', 'Monolith: the whole app is one program. Microservices: the app is many small programs, one per team.', '<a href="#/architecture-styles">Architecture styles</a>'],
      ['Redis Sentinel / Cluster', 'Sentinel: watches one Redis machine and, if it fails, makes a copy the new boss. Cluster: splits data across many Redis machines.', '<a href="#/coordination">Coordination</a>'],
      ['CDN', 'Cache servers spread around the world that serve files from near the user.', '<a href="#/cdn">CDN</a>'],
      ['Locking', 'A way to make sure two people do not change the same thing at the same time.', '<a href="#/sql-vs-nosql">SQL vs NoSQL</a>'],
    ]},

    { type: 'h2', text: 'The roadmap table: all eight questions' },
    { type: 'table', head: ['Question', 'Pick A when…', 'Pick B when…'], rows: [
      ['Replication or sharding?', 'Replicate: you need HA or more read capacity', 'Shard: writes or data size exceed one node'],
      ['Strong or eventual consistency?', 'Strong: money, inventory, bookings, unique usernames', 'Eventual: likes, views, feeds, search, recommendations'],
      ['Push or pull for feeds?', 'Push (fan-out on write): normal users with few followers', 'Pull (fan-out on read): celebrities with millions of followers; most systems do a hybrid'],
      ['Load balancer or API gateway?', 'LB: spread traffic across identical servers', 'Gateway: auth, rate limiting, routing to many services; usually you have both'],
      ['Monolith or microservices?', 'Monolith: small team, early product', 'Microservices: many teams, very different scaling needs'],
      ['Redis Sentinel or Redis Cluster?', 'Sentinel: data fits on one node, you need automatic failover', 'Cluster: you need to shard data across nodes'],
      ['CDN or direct from server?', 'CDN: static or shared content, global users, big files', 'Direct: personalised, private, rapidly changing responses'],
      ['Optimistic or pessimistic locking?', 'Optimistic (version check): conflicts are rare', 'Pessimistic / reservation hold: many users fight for the same item (seats, flash sale)'],
    ], caption: 'Source: roadmap phase 5, "More quick decisions"' },

    { type: 'h2', text: 'Decision deck: pick a question, fill in the signals' },
    { type: 'p', html: `Each card is one question. Search (for example "seat", "redis", "feed") or pick a category, then answer the card's questions. The recommendation and its reason below change at once.` },
    { type: 'custom',
      D: [
        { id: 'rs', cat: 'Data', q: 'Replication or sharding?', kw: 'replica shard database read write ha failover size tb', link: 'replication',
          ask: [
            { k: 'ha', q: 'Do you need HA (keeps running if a node fails) or more reads?', o: ['Yes', 'No'] },
            { k: 'wr', q: 'Are the writes more than one leader node can handle?', o: ['No', 'Yes'] },
            { k: 'sz', q: 'Is the data more than one node holds comfortably (~1-5 TB)?', o: ['No', 'Yes'] },
          ],
          dec(a) {
            if (a.wr === 1 || a.sz === 1) return { p: 'B', t: 'Sharding (and replicas for each shard)', w: (a.wr === 1 ? 'The writes are more than one leader can take: replicas do not share writes, because every write must be written on every replica. ' : '') + (a.sz === 1 ? 'The data does not fit on one node: a replica also holds all the data, so it does not help. ' : '') + 'Split the data into shards. Still keep 1-2 replicas of each shard for HA.' };
            if (a.ha === 0) return { p: 'A', t: 'Replication', w: 'Writes and size fit on one node; the problem is availability or read load. Leader + followers: reads go to followers, and if the leader fails a follower is promoted. The complexity of sharding is not worth it yet.' };
            return { p: '-', t: 'Neither for now', w: 'No signal: one node + backups is enough. Try indexes and a cache first. (In production, one replica for HA is still common.)' };
          } },
        { id: 'se', cat: 'Data', q: 'Strong or eventual consistency?', kw: 'consistency money balance inventory booking username likes views feed stale', link: 'cap',
          ask: [
            { k: 'harm', q: 'Does reading a wrong/old value cause harm (money, double booking, duplicate username)?', o: ['Yes', 'No'] },
            { k: 'own', q: 'Must the writing user see their own change at once?', o: ['Yes', 'No'] },
          ],
          dec(a) {
            if (a.harm === 0) return { p: 'A', t: 'Strong consistency', w: 'Reading an old value causes real harm: two people get the same seat or the same username, or more is spent than the balance. Read and write from one source of truth (the leader / a transaction), even if latency goes up a little.' };
            if (a.own === 0) return { p: 'B', t: 'Eventual + read-your-own-writes', w: 'The rest of the world can see a value 1-2 seconds old, but the writer must see their own comment/post at once. Send that user\'s reads to the leader for a short while (or just show it on the client at once), and everything else from replicas/cache.' };
            return { p: 'B', t: 'Eventual consistency', w: 'Whether the like count is 1,02,345 or 1,02,351 harms nobody. Eventual keeps replicas, caches and regions all available and fast.' };
          } },
        { id: 'pp', cat: 'Data', q: 'Feed: push or pull?', kw: 'feed timeline fan-out fanout celebrity follower instagram twitter', link: 'pattern-fanout',
          ask: [
            { k: 'norm', q: 'Do most users have few followers (up to thousands)?', o: ['Yes', 'No'] },
            { k: 'celeb', q: 'Do some accounts have millions of followers (celebrities)?', o: ['No', 'Yes'] },
          ],
          dec(a) {
            if (a.norm === 0 && a.celeb === 1) return { p: 'both', t: 'Hybrid: push for normal users, pull for celebrities', w: 'When a normal user posts, put the post in their followers\' timelines (reading the feed is super fast). Writing a celebrity\'s post into 50M timelines takes minutes, so fetch their posts at read time and merge. Big social apps use exactly this kind of hybrid.' };
            if (a.celeb === 1) return { p: 'B', t: 'Pull (fan-out on read)', w: 'For authors with huge follower counts, millions of writes per post is costly and slow. At read time, fetch the recent posts of the people you follow and merge them; cache the hot posts.' };
            if (a.norm === 0) return { p: 'A', t: 'Push (fan-out on write)', w: 'Writing each post into a few hundred/thousand timelines is cheap, and reading the feed (which happens far more often than writing) is just one read of a precomputed list.' };
            return { p: 'B', t: 'Pull, keep it simple', w: 'Neither many users with few followers nor celebrities: the feed scale is probably still small. Query at read time; bring in the complexity of push when the read load demands it.' };
          } },
        { id: 'lg', cat: 'Traffic', q: 'Load balancer or API gateway?', kw: 'lb gateway auth rate limit routing microservices nginx kong envoy', link: 'resilience',
          ask: [
            { k: 'many', q: 'Are there many different services that must be routed by URL?', o: ['No', 'Yes'] },
            { k: 'edge', q: 'Must auth, rate limiting and API keys be applied in one place?', o: ['No', 'Yes'] },
          ],
          dec(a) {
            if (a.many === 1 || a.edge === 1) return { p: 'both', t: 'API gateway + LB (both)', w: 'At the entry point the gateway does auth, rate limiting and routing (/videos → video service, /pay → payment service). Each service still has many identical copies inside, and an LB spreads traffic among them. Often the gateway itself also runs as many copies behind an LB.' };
            return { p: 'A', t: 'Load balancer', w: 'There are only identical servers of one app, and the job is just to spread traffic and remove dead servers. A gateway would be one extra hop and one extra thing to run.' };
          } },
        { id: 'mm', cat: 'Architecture', q: 'Monolith or microservices?', kw: 'monolith microservices team deploy scaling modular', link: 'architecture-styles',
          ask: [
            { k: 'teams', q: 'How many teams work on the same codebase?', o: ['1-2 teams', 'Many teams'] },
            { k: 'stage', q: 'What stage is the product at?', o: ['Early, still changing', 'Mature, clear boundaries'] },
            { k: 'scale', q: 'Do some parts have very different scaling needs?', o: ['No', 'Yes'] },
          ],
          dec(a) {
            if (a.teams === 1 && a.stage === 1) return { p: 'B', t: 'Microservices', w: 'Many teams are waiting on each other\'s deploys and the boundaries are clear: each team gets its own service, its own deploy, its own database.' + (a.scale === 1 ? ' Different scaling needs (like transcoding vs profile) make this decision even stronger.' : '') };
            if (a.teams === 1) return { p: 'both', t: 'Modular monolith (the middle path)', w: 'There are many teams, but the product is still changing: cutting services along the wrong boundaries is expensive. One deploy, but clean modules and ownership inside; split them out once the boundaries are settled.' };
            if (a.scale === 1) return { p: 'A', t: 'Monolith + one separate service', w: 'A monolith for a small team. Only the one part that scales completely differently (like video transcoding workers) becomes a separate service. A full microservices setup would sink a small team.' };
            return { p: 'A', t: 'Monolith', w: 'Small team, early product: one codebase, one deploy, function calls (not network calls), easy debugging. Speed matters most.' };
          } },
        { id: 'rc', cat: 'Data', q: 'Redis Sentinel or Redis Cluster?', kw: 'redis sentinel cluster failover shard memory ram cache session', link: 'coordination',
          ask: [
            { k: 'fit', q: 'Does all the data fit in one node\'s RAM (comfortably, with headroom)?', o: ['Yes', 'No'] },
            { k: 'ops', q: 'Are the ops/sec more than one node can handle (~100k+)?', o: ['No', 'Yes'] },
            { k: 'fo', q: 'Do you need automatic failover if the primary fails?', o: ['Yes', 'No'] },
          ],
          dec(a) {
            if (a.fit === 1 || a.ops === 1) return { p: 'B', t: 'Redis Cluster', w: (a.fit === 1 ? 'The data does not fit on one node. ' : '') + (a.ops === 1 ? 'One node\'s throughput is not enough. ' : '') + 'Cluster splits keys into 16,384 hash slots and shards them across several primaries, and it also promotes a replica when a primary fails. The cost: multi-key commands only work on keys in the same slot (using hash tags).' };
            if (a.fo === 0) return { p: 'A', t: 'Redis Sentinel', w: 'The data fits on one node, so there is no need to shard. Sentinel processes keep watching the primary; if it fails, a majority agrees and they make a replica the new primary. Simple, and every command works.' };
            return { p: '-', t: 'Single Redis (+ replica, manual)', w: 'The data fits and a few minutes of downtime is fine (for example, a pure cache that can be refilled from the DB). One node + a replica is enough. The day downtime becomes costly, add Sentinel.' };
          } },
        { id: 'cd', cat: 'Traffic', q: 'CDN or direct from server?', kw: 'cdn edge static image video personalised private live score cache', link: 'cdn',
          ask: [
            { k: 'shared', q: 'Is the response the same for all users (not personalised or private)?', o: ['Yes', 'No'] },
            { k: 'fast', q: 'Does the content change every second?', o: ['No', 'Yes'] },
            { k: 'heavy', q: 'Are users all over the world, files big, or traffic very high?', o: ['Yes', 'No'] },
          ],
          dec(a) {
            if (a.shared === 1) return { p: 'B', t: 'Direct from server', w: 'Each user\'s response is different (feed, cart, bank statement) or private: caching it on a CDN is either useless (hit rate ~0) or dangerous (someone else\'s data may show up). The static parts of the page (JS, CSS, images) still come from the CDN.' + (a.heavy === 0 ? ' Big private files (like a paid course video) can still be served from a CDN with signed, expiring URLs.' : '') };
            if (a.fast === 1) return { p: 'A', t: 'CDN, with a very short TTL (1-2 s)', w: 'Data like a live score changes every second but is the same for everyone. Even a 1-2 second TTL saves the origin from lakhs of requests: each edge server asks the origin only once or twice per second.' };
            if (a.heavy === 0) return { p: 'A', t: 'CDN', w: 'The same content, far-away users, big files: the CDN keeps a copy at the edge, so latency goes down and the origin bandwidth bill goes down.' };
            return { p: 'A', t: 'CDN optional', w: 'The content is shared, but users are nearby and traffic is small. Browser caching headers may be enough; if a CDN is cheap, add it, but it is not urgent.' };
          } },
        { id: 'ol', cat: 'Data', q: 'Optimistic or pessimistic locking?', kw: 'lock optimistic pessimistic version seat booking flash sale conflict hold', link: 'sql-vs-nosql',
          ask: [
            { k: 'conf', q: 'How many people try to change the same row/item at the same time?', o: ['Now and then (rare)', 'A lot (hot item)'] },
            { k: 'hold', q: 'Must the user "hold" the item for a few minutes (until payment)?', o: ['No', 'Yes'] },
          ],
          dec(a) {
            if (a.hold === 1) return { p: 'B', t: 'Reservation hold (with expiry)', w: 'Selecting a seat and paying takes minutes. Mark the seat HELD (by user X, for 10 minutes); if payment succeeds, BOOKED, otherwise free again on expiry. Holding a DB lock for minutes would be wrong.' };
            if (a.conf === 1) return { p: 'B', t: 'Pessimistic locking', w: 'With an optimistic check on a hot item, 999 out of 1,000 people hear "conflict, try again", and a retry storm builds up. Move them forward one at a time with a row lock (SELECT ... FOR UPDATE) or an atomic decrement.' };
            return { p: 'A', t: 'Optimistic locking (version check)', w: 'Conflicts are rare: do not take any lock. Keep a version number in the row; update only if the version is still the one you read (UPDATE ... WHERE version = 7). If it fails, tell the user "someone changed this, please refresh".' };
          } },
      ],
      render(el) {
        const D = this.D, ans = {}, cats = ['All', 'Data', 'Traffic', 'Architecture'];
        D.forEach(d => { ans[d.id] = {}; d.ask.forEach(q => { ans[d.id][q.k] = 0; }); });
        let cat = 'All', term = '';
        el.innerHTML = `<input type="text" class="dq-s" placeholder="Search: seat, redis, feed, gateway..." aria-label="Search decisions" style="width:100%;box-sizing:border-box">
          <div class="dq-c" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>
          <div class="dq-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px"></div>
          <div class="calc-note dq-n"></div>`;
        const cc = el.querySelector('.dq-c'), cards = el.querySelector('.dq-cards');
        const col = { A: 'var(--green)', B: 'var(--violet)', both: 'var(--amber)', '-': 'var(--ink-2)' };
        const drawCats = () => { cc.innerHTML = ''; cats.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (c === cat ? ' on' : ''); b.textContent = c; b.onclick = () => { cat = c; drawCats(); draw(); }; cc.appendChild(b); }); };
        const draw = () => {
          cards.innerHTML = '';
          const t = term.trim().toLowerCase();
          const vis = D.filter(d => (cat === 'All' || d.cat === cat) && (!t || (d.q + ' ' + d.kw).toLowerCase().includes(t)));
          vis.forEach(d => {
            const r = d.dec(ans[d.id]);
            const c = document.createElement('div');
            c.style.cssText = 'border:1px solid var(--line-2);border-radius:var(--r);padding:12px;background:var(--surface)';
            c.innerHTML = `<div style="font:12px var(--f-mono);color:var(--ink-3)">${d.cat}</div><div style="font:700 17px var(--f-display);margin:2px 0 8px">${d.q}</div>`;
            d.ask.forEach(q => {
              const row = document.createElement('div'); row.style.margin = '0 0 8px';
              row.innerHTML = `<div style="font-size:14px;margin-bottom:4px">${q.q}</div>`;
              const ch = document.createElement('div'); ch.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
              q.o.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (ans[d.id][q.k] === i ? ' on' : ''); b.textContent = o; b.onclick = () => { ans[d.id][q.k] = i; draw(); }; ch.appendChild(b); });
              row.appendChild(ch); c.appendChild(row);
            });
            const out = document.createElement('div');
            out.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px dashed var(--line-2)';
            out.innerHTML = `<div style="font:700 16px var(--f-display);color:${col[r.p]}">→ ${r.t}</div><div style="font-size:14px;color:var(--ink-2);margin-top:4px">${r.w}</div><div style="font-size:13px;margin-top:6px"><a href="#/${d.link}">Read it in depth</a></div>`;
            c.appendChild(out); cards.appendChild(c);
          });
          el.querySelector('.dq-n').textContent = vis.length ? `Showing ${vis.length} / ${D.length} cards.` : 'No card matched. Try another word (like "lock", "cdn", "team").';
        };
        el.querySelector('.dq-s').addEventListener('input', e => { term = e.target.value; draw(); });
        drawCats(); draw();
      },
    },

    { type: 'h2', text: 'All eight questions, one by one' },
    { type: 'h3', text: '1. Replication or sharding?' },
    { type: 'p', html: `<a href="#/replication">Replication</a> = full copies of the same data on several machines. <a href="#/sharding">Sharding</a> = splitting the data into pieces and putting each piece on a different machine. The signal is <em>what</em> has become too much for one node. Too many reads, or the site must not go down when a node fails → replicas (each replica can serve reads, and can be promoted if the leader fails). But if writes or data size are too much → replicas do not help, because every write must also be written on every replica, and every replica holds all the data. Then shard. Real systems do both: 2-3 replicas for each shard.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the comments table is 800 GB and 90% of the traffic is just reading. The database CPU is at 80%, but there are few writes.<br><strong>Reason:</strong> the problem is reads. Add 2 read replicas: the reads are shared across three machines, and if the leader fails, a replica takes its place.<br><strong>Trap:</strong> "it is a big system, so shard it". After sharding, every query must know which shard holds the data, and joins become hard. As long as writes and size fit on one node, sharding is only pain.` },
    { type: 'h3', text: '2. Strong or eventual consistency?' },
    { type: 'p', html: `Ask: "what breaks if someone reads a value that is 2 seconds old?" Bank balance, seats, inventory, unique usernames: if two people read "available" at the same time, you get a double booking or lose money. There you need <strong>strong</strong> (one source of truth, transactions). Likes, views, feed, search, recommendations: if they are a little old, nobody will even notice. There you use <strong>eventual</strong>, which is faster and more available. The theory is in <a href="#/cap">CAP and PACELC</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: read-your-own-writes', html: `<strong>What it is:</strong> a small guarantee even in an eventual system: <strong>the user who writes sees their own change at once</strong>, even if others see it a little later.<br><strong>Why we need it:</strong> if you post a comment and it disappears when you refresh, it looks like a bug.<br><strong>Without it:</strong> the user comments again, and now there are two comments.<br><strong>How:</strong> send that user's reads to the leader for a few seconds, or have the app show the change at once by itself.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the xyz.com wallet balance (strong) and a video's like count (eventual), both on the same page.<br><strong>Reason:</strong> if the wallet shows a wrong value, the user's money can be spent twice, so read it from the leader/a transaction. If the like count is 2 seconds old, there is no harm, so read it from a cache or a replica.<br><strong>Trap:</strong> "keep the whole app strong, it is safer". Every read goes to the leader, replicas and caches become useless, and the site gets slow. Consistency is chosen <em>separately for each kind of data</em>, not once for the whole app.` },
    { type: 'h3', text: '3. Feed: push or pull?' },
    { type: 'callout', tone: 'term', title: 'New words: fan-out on write (push) and fan-out on read (pull)', html: `<strong>What it is:</strong> <strong>Fan-out</strong> = delivering one thing to many places. <strong>Push / fan-out on write</strong>: when someone posts, at that moment put the post ID into the precomputed timeline (a Redis list) of every follower. Reading is very cheap. <strong>Pull / fan-out on read</strong>: the post stays only with the author; when someone opens their feed, fetch the recent posts of everyone they follow and merge them. Writing is cheap, reading is costly.<br><strong>Why we need it (the choice):</strong> opening the feed is the most frequent action. Whether the work happens at write time or read time decides the speed and the cost.<br><strong>Without it (the wrong model):</strong> either a storm of crores of writes on a celebrity post, or heavy queries every time a feed opens.` },
    { type: 'p', html: `A normal user with 300 followers: push = 300 small writes, easy. A celebrity with 5 crore followers: push = 5 crore writes for one post, a backlog of minutes. So big apps go <strong>hybrid</strong>: push for normal authors, pull for celebrities, and both are merged when the feed opens. A real example: in a 2012-13 talk, Twitter engineers explained that tweets were pushed into followers' Redis timelines, but tweets from accounts with very many followers were added at read time. The talk is quite old now, but the idea is still standard. Watch this break and get fixed in the flow below.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> on xyz.com Riya has 300 followers, and a cricket star has 5 crore.<br><strong>Reason:</strong> writing Riya's post into 300 timelines is cheap. Writing the star's post into 5 crore places takes minutes, so the star's posts are added at read time.<br><strong>Trap:</strong> using one model for everyone. Push only = a write storm on every celebrity post. Pull only = searching the posts of hundreds of people every time a feed opens, which is very costly at crores of reads.` },
    { type: 'h3', text: '4. Load balancer or API gateway?' },
    { type: 'p', html: `A <a href="#/load-balancer">load balancer</a> spreads traffic across identical copies of one service and removes dead servers. An <a href="#/resilience">API gateway</a> is the single front door for everything: checking tokens, rate limiting, API keys, and sending each request to the right service by looking at the URL (<code>/videos</code> → video service). They are not competitors; they are different layers: client → gateway → (inside each service) LB → servers. If there is only one app and the app does auth itself, an LB alone is enough.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com has video, payments and chat services. Each service runs 4-10 copies.<br><strong>Reason:</strong> one gateway for outside clients (login check, rate limit, <code>/pay</code> to the payment service). Behind the gateway, an LB in front of each service spreads traffic across that service's copies.<br><strong>Trap:</strong> "we have a gateway now, remove the LB". Traffic still has to be spread across 10 copies somehow, and the gateway itself also runs as several copies. The two do different jobs.` },

    { type: 'h3', text: '5. Monolith or microservices?' },
    { type: 'p', html: `This is more a question about the <strong>team</strong> than about technology. 5 people, a new product, features changing every day: a <a href="#/architecture-styles">monolith</a> is the fastest (one deploy, function calls, one database). Microservices pay off when 20 teams are waiting on each other's deploys, or when one part (like video transcoding) scales completely differently from the rest of the app. The middle path: a <strong>modular monolith</strong>, one deploy but clean boundaries inside. If a small team adopts microservices, every feature brings the pain of network calls, distributed debugging and <a href="#/distributed-tx">distributed transactions</a>.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com started as a team of 4 engineers. Now there are 15 teams, and video transcoding needs 200 machines while the profile page needs 4.<br><strong>Reason:</strong> when there were 4 people, the monolith was the fastest. Now teams wait on each other's deploys, and transcoding scales completely differently. So transcoding became a separate service first, and the rest followed slowly.<br><strong>Trap:</strong> "Netflix uses microservices, so we will too", from day one. A team of 4 running 20 services spends half its time on network bugs and deploys.` },
    { type: 'h3', text: '6. Redis Sentinel or Redis Cluster?' },
    { type: 'p', html: `Both give Redis HA; the difference is sharding. <a href="#/coordination">Sentinel</a> watches one primary + replicas and promotes a replica if the primary fails; the data stays on one node. <strong>Redis Cluster</strong> splits keys into 16,384 hash slots and shards them across several primaries, and also handles failover itself. The signal: do the data (and the ops/sec) fit on one node? → Sentinel. They do not fit → Cluster. The cost of Cluster: one command can use several keys only if they are in the same slot.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com login sessions: 3 GB of data. Feed timelines: 400 GB of data.<br><strong>Reason:</strong> sessions fit easily in one node's RAM; we only need sessions not to be lost if the machine fails: Sentinel. 400 GB of timelines does not fit on one node: Cluster, which spreads the data across many machines.<br><strong>Trap:</strong> in Cluster, all the keys of one command must be in the same slot. <code>MGET user:1 user:2</code> will fail if they are in different slots. The code must be written for this from the start (hash tags).` },
    { type: 'h3', text: '7. CDN or direct from server?' },
    { type: 'p', html: `A <a href="#/cdn">CDN</a> shines when the same response goes to a great many people: images, videos, JS/CSS, live score JSON. Caching personalised responses (your feed, your cart), private ones (a bank statement), or responses that differ on every request is either useless (no two users ask for the same thing) or dangerous (someone else's data might show up). Shared data that changes very fast (a live score) still goes on the CDN with a 1-2 second TTL; this is a classic napkin maths example.` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the xyz.com homepage JS bundle (the same for everyone) and the "Continue watching" list (different for each user).<br><strong>Reason:</strong> the JS bundle goes on the CDN: crores of users, one file, from a nearby edge. Continue watching comes directly from the server, because no two users have the same list.<br><strong>Trap:</strong> if a personalised response gets cached on the CDN by mistake, one user's list can show up for another user. Put <code>Cache-Control: private</code> on personal responses.` },
    { type: 'h3', text: '8. Optimistic or pessimistic locking?' },
    { type: 'callout', tone: 'term', title: 'New words: optimistic and pessimistic locking', html: `<strong>What it is:</strong> three ways to handle two people changing the same row at the same time.<br><strong>Optimistic</strong>: "a conflict probably will not happen". No lock; each row has a <code>version</code>. When updating, check it: <code>UPDATE ... SET ..., version = 8 WHERE id = 5 AND version = 7</code>. If someone else changed it first, 0 rows are updated, and you retry. <strong>Pessimistic</strong>: "a conflict will surely happen". Take a lock first (<code>SELECT ... FOR UPDATE</code>), and the others wait. <strong>Reservation hold</strong>: for long tasks (payment), mark the row "HELD till 10:15" instead of holding a lock.<br><strong>Why we need it:</strong> so two updates do not silently wipe each other out, and one seat is not sold to two people.<br><strong>Without it:</strong> a "lost update": A and B both read version 7, both write, and A's change is gone. In the seat case, a double booking.` },
    { type: 'p', html: `Profile edit, a wiki page, settings: two people rarely change them at the same time → optimistic, cheap and with no waiting. A concert seat or the last iPhone in a flash sale: thousands of people on the same row → with optimistic, 999 people fail and retry, causing a retry storm on the DB. There, use a pessimistic lock or a reservation hold (with expiry).` },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> a profile bio edit (optimistic) and concert seat A1 (reservation hold).<br><strong>Reason:</strong> two people rarely write the same bio at the same time, so a version check is enough. For seat A1, 1,000 people at the same time, and 10 minutes for payment: mark the seat HELD.<br><strong>Trap:</strong> holding a DB lock (<code>SELECT ... FOR UPDATE</code>) for the 10 minutes of payment. All other requests get stuck on that row, and the connections run out.` },

    { type: 'h2', text: 'Watch the wrong choice fall: a celebrity and a push feed' },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'au', label: 'Author', sub: 'posts', x: 80, y: 70, w: 130, kind: 'client', info: 'What it is: the user who posts. A normal user has ~300 followers, a celebrity has 5 crore.' },
        { id: 'ps', label: 'Post service', sub: 'posts table', x: 280, y: 70, w: 150, kind: 'server', info: 'What it is: the posts service. It saves the post (the source of truth) and puts a fan-out event in the queue. In the pull model, the feed service asks it for a celebrity\'s recent posts.' },
        { id: 'fq', label: 'Fan-out queue', x: 480, y: 70, w: 140, kind: 'queue', info: 'What it is: a line of work. Every post\'s "put this in the followers\' timelines" task arrives here. One celebrity post = crores of small tasks.' },
        { id: 'fw', label: 'Fan-out workers', x: 640, y: 190, w: 140, kind: 'server', info: 'What it is: background programs. They read the follower list and write the post ID into each follower\'s timeline.' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis lists', x: 460, y: 270, w: 150, kind: 'cache', info: 'What it is: a ready-made (precomputed) feed for each user in Redis: a list of post IDs. Opening the feed = one list read, very fast.' },
        { id: 'fs', label: 'Feed service', x: 280, y: 270, w: 140, kind: 'server', info: 'What it is: the service that answers when a feed is opened. It takes the precomputed list from the timeline cache, and in the hybrid model also the recent posts of followed celebrities from the post service, and merges both.' },
        { id: 'rd', label: 'Reader', sub: 'opens feed', x: 80, y: 270, w: 130, kind: 'client', info: 'What it is: a follower opening their feed. Reads happen many times more often than writes.' },
      ],
      edges: [{ a: 'au', b: 'ps' }, { a: 'ps', b: 'fq' }, { a: 'fq', b: 'fw' }, { a: 'fw', b: 'tl' }, { a: 'rd', b: 'fs' }, { a: 'fs', b: 'tl' }, { a: 'fs', b: 'ps', id: 'pull', dashed: true }],
      scenarios: [
        { name: 'Normal user: push', steps: [
          { title: 'Post', text: 'Riya (300 followers) posted.', go: 'au>ps>fq', msg: 'POST /posts  { author: riya }' },
          { title: 'Fan-out on write', text: 'The workers put the post ID into 300 timelines: a few milliseconds of work.', go: 'fq>fw>tl', after: { tl: { state: 'ok', sub: '+300 entries' } }, msg: 'LPUSH timeline:<follower> post_991   × 300' },
          { title: 'Reading the feed is cheap', text: 'A follower opens the feed: just one precomputed list. Reads are fast, because the work was already done at write time.', go: ['rd>fs>tl', 'res:tl>fs>rd'], msg: 'LRANGE timeline:aman 0 49' },
        ]},
        { name: 'Wrong: celebrity push', intro: 'A celebrity (5 crore followers) also uses push.', steps: [
          { title: 'Celebrity post', text: 'One post, but the fan-out work covers 5 crore timelines.', set: { au: { sub: '5 crore followers' } }, go: 'au>ps>fq', after: { fq: { state: 'hot', sub: '5 crore jobs!' } } },
          { title: 'Workers buried', text: 'Even if the workers manage ~1 lakh writes/sec, 5 crore writes take ~8 minutes. Meanwhile normal users\' posts are stuck behind them in the same queue.', flood: { paths: ['fq>fw>tl'], n: 14 }, after: { fw: { state: 'hot', sub: 'backlog' }, tl: { state: 'warn', sub: 'write storm' } } },
          { title: 'Followers see the post late', text: 'Half the followers see the post minutes later, and posts from normal users like Riya are late too. One author made everyone\'s feed slow.', go: ['rd>fs>tl', 'bad:tl>fs>rd'], msg: 'feed: celebrity post missing, 8 min late' },
        ]},
        { name: 'Fix: hybrid', intro: 'Normal authors push, celebrities pull.', steps: [
          { title: 'Celebrity post: no fan-out', text: 'The post service only saves the post. The queue is empty, the workers are relaxed.', set: { au: { sub: '5 crore followers' }, fq: { state: 'dim' }, fw: { state: 'dim' } }, go: 'au>ps', after: { ps: { state: 'ok', sub: 'celebrity post saved' } } },
          { title: 'Merge when the feed opens', text: 'The feed service fetches from two places: the precomputed timeline (posts from normal friends) + the recent posts of followed celebrities (pull). Merge, sort, done.', parallel: true, go: ['rd>fs', 'fs>tl', 'fs>ps'] },
          { title: 'Response', text: 'A celebrity\'s recent posts are requested by very many people, so they stay hot in the cache. The extra read of pull turns out cheap.', go: ['res:ps>fs', 'res:fs>rd'], after: { fs: { state: 'ok', sub: 'merged feed' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'A second wrong choice: optimistic locking on a hot seat' },
    { type: 'p', html: `xyz.com now sells concert tickets too. For front-row seat A1, 1,000 people click at the same moment at 10 o'clock. See how optimistic locking breaks here, and how a reservation hold saves the day.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'ua', label: 'User A', x: 90, y: 55, w: 120, kind: 'client', info: 'What it is: the first user. In the profile scenario they edit their own bio; in the seat scenarios they want A1.' },
        { id: 'ub', label: 'User B', x: 90, y: 150, w: 120, kind: 'client', info: 'What it is: a second user, at the same moment, for the same seat.' },
        { id: 'cr', label: 'Other 998', sub: 'want same seat', x: 90, y: 245, w: 140, kind: 'client', info: 'What it is: the flash-sale crowd. All of them after the same row.' },
        { id: 'api', label: 'Booking API', x: 330, y: 150, w: 140, kind: 'server', info: 'What it is: the booking service. The logic for selecting and booking seats. This is where we decide how to handle conflicts.' },
        { id: 'db', label: 'Seats DB', sub: 'row: A1', x: 560, y: 150, w: 140, kind: 'data', meter: true, load: 20, info: 'What it is: the seats database. Each seat is one row: status (AVAILABLE / HELD / BOOKED), held_by, hold_until, version. The source of truth; it needs strong consistency.' },
      ],
      edges: [{ a: 'ua', b: 'api' }, { a: 'ub', b: 'api' }, { a: 'cr', b: 'api' }, { a: 'api', b: 'db' }],
      scenarios: [
        { name: 'Optimistic: rare conflict', intro: 'A profile bio edit: two people rarely change the same profile at the same time.', steps: [
          { title: 'Read, with the version', text: 'User A reads their profile: version 7.', set: { ub: { state: 'dim' }, cr: { state: 'dim' }, db: { sub: 'profile v7' } }, go: ['ua>api>db', 'res:db>api>ua'], msg: 'SELECT bio, version FROM profiles WHERE id = 5   → v7' },
          { title: 'Update only if the version is unchanged', text: 'No lock was taken. The update checks the version. Nobody changed it in between, so 1 row is updated.', go: ['ua>api>db', 'res:db>api>ua'], after: { db: { state: 'ok', sub: 'profile v8' } }, msg: 'UPDATE profiles SET bio = ?, version = 8\n WHERE id = 5 AND version = 7      → 1 row' },
          { title: 'Why this is good', text: 'No waiting, no lock. If there had been a conflict, it would return 0 rows and we would tell the user "please refresh". For rare conflicts, this is the cheapest.', focus: ['db'] },
        ]},
        { name: 'Wrong: optimistic on hot seat', steps: [
          { title: '1,000 people read at once', text: 'Everyone sees A1 as AVAILABLE, version 3.', parallel: true, go: ['ua>api', 'ub>api', 'cr>api'], after: { api: { state: 'warn', sub: '1,000 requests' } } },
          { title: 'Everyone sends an update', text: 'All with <code>WHERE version = 3</code>. Only one wins.', flood: { paths: ['ua>api>db', 'ub>api>db', 'cr>api>db'], n: 12 }, after: { db: { load: 85, state: 'hot', sub: '1 win, 999 fail' } }, msg: 'UPDATE seats ... WHERE id = A1 AND version = 3   → 0 rows (×999)' },
          { title: 'Retry storm', text: '999 people hear "conflict" and retry, fail again, retry again. Thousands of useless queries on the DB for one row. Users see error after error. The optimistic assumption ("conflicts are rare") was false here.', go: ['bad:api>ub', 'bad:api>cr'], parallel: true, flood: { paths: ['cr>api>db'], n: 10 }, after: { db: { load: 99, state: 'down', sub: 'hot row overload' } } },
        ]},
        { name: 'Fix: reservation hold', steps: [
          { title: 'Atomic hold', text: 'One atomic statement: the seat becomes HELD only if it is AVAILABLE right now. The database runs this by locking the row for one request at a time.', go: ['ua>api>db', 'res:db>api>ua'], after: { db: { state: 'warn', sub: 'A1 HELD by A, 10 min' } }, msg: "UPDATE seats SET status='HELD', held_by='A', hold_until=now()+10min\n WHERE id='A1' AND status='AVAILABLE'      → 1 row" },
          { title: 'A clear answer for the rest, at once', text: '0 rows: the seat is taken. Retrying is pointless, so show the user another seat right away. For hot seats, a queue / waiting room is also put in front.', parallel: true, go: ['ub>api>db', 'res:db>api', 'bad:api>ub'], msg: '→ 0 rows   "Someone else is holding A1 right now"' },
          { title: 'Paid: BOOKED, otherwise free', text: 'User A paid within 10 minutes → BOOKED. If not → a background job makes the seat AVAILABLE after hold_until. No lock had to be held for minutes.', go: ['ua>api>db'], after: { db: { state: 'ok', sub: 'A1 BOOKED' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Worked scenarios' },
    { type: 'h3', text: 'IRCTC Tatkal / BookMyShow seat' },
    { type: 'p', html: `Signals: money + a seat (a double booking = real harm), thousands of people on one item, minutes for payment. Decisions: <strong>strong consistency</strong> (card 2), <strong>reservation hold with expiry</strong> (card 8), the seat map page not on the CDN (it changes every second, and wrongly showing "available" is bad UX), but posters, JS and images from the CDN (card 7).` },
    { type: 'h3', text: 'YouTube video views and likes' },
    { type: 'p', html: `Whether views show 10,23,456 or 10,23,470 makes no difference. <strong>Eventual</strong> (card 2). No DB row update for every view; counters live in Redis and are flushed in batches. The video file and thumbnails come from the <strong>CDN</strong> (card 7). But the "Watch later" list is personalised → direct.` },
    { type: 'h3', text: 'A startup: 4 engineers, a new app' },
    { type: 'p', html: `One team, the product changing every week. <strong>Monolith</strong> (card 5), one database with one replica for HA (card 1: replication, not sharding), and just an <strong>LB</strong> (card 4). A few years later, with 10 teams and different scaling needs → then a modular monolith, then services.` },
    { type: 'h3', text: 'Trap 1: "Writes are slow, add read replicas"' },
    { type: 'p', html: `The xyz.com chat DB is at 95% CPU from writes. Someone says "add 2 more replicas". Trap! Every write must also be written on each replica, and only the leader takes writes. Replicas only help with reads and HA; the cure for a write problem is <strong>sharding</strong> (card 1). Worse, synchronous replicas can make writes even slower.` },
    { type: 'h3', text: 'Trap 2: "Use Redis Cluster, it sounds bigger"' },
    { type: 'p', html: `The session data is 3 GB, which fits easily on one node. Taking Cluster brings limits on multi-key commands, more nodes, more ops work, and zero benefit. The data fits and you need failover → <strong>Sentinel</strong> (or a managed Redis with built-in failover). Cluster is for when the data or the ops/sec go beyond one node (card 6).` },

    { type: 'h2', text: 'Practice: 8 small cases' },
    { type: 'p', html: `For each case, first think for yourself: which question is it, and A or B? Then look at the signal, then the answer.` },
    { type: 'custom',
      cases: [
        { q: 'The xyz.com "watch history" table has grown to 30 TB, and 2 lakh new rows arrive every second.', signal: 'Both size and writes are beyond one node.', pick: 'Sharding (with replicas for each shard)', why: 'A replica also holds all 30 TB and every write. Only sharding can split the size and the writes. Shard by user_id, so one user\'s history stays in one place.', trap: '"Just add more replicas." Replicas share reads, not writes.' },
        { q: 'The coupon "FIRST50" on xyz.com is only for the first 1,000 users.', signal: 'A count that must never be wrong: the 1,001st coupon = lost money.', pick: 'Strong consistency (an atomic counter or a transaction)', why: 'Reduce the counter atomically on one source of truth (a DB transaction or Redis DECR). At zero, "sold out".', trap: 'Each region reads "how many are left" from its own copy. With eventual copies, more than 1,000 coupons will go out.' },
        { q: 'A new "Shorts" feed on xyz.com. Most creators have 200-5,000 followers; a few have more than 1 crore.', signal: 'Normal authors with few followers, plus some celebrities.', pick: 'Hybrid: push for normal, pull for celebrities', why: 'Normal posts go into timelines at write time. Celebrity posts are added when the feed opens. Pick the threshold (for example 1 lakh followers) with napkin maths.', trap: 'Push for everyone: one celebrity post = 1 crore writes, and everyone else\'s posts get stuck behind it.' },
        { q: 'xyz.com now offers its API to outside developers: each developer has an API key, and each key is limited to 100 requests/minute.', signal: 'API keys and rate limiting, in one place.', pick: 'API gateway (with an LB behind it)', why: 'Writing the key check and rate limit separately in every service is wrong. The gateway does it at one front door, then an LB spreads traffic across the service\'s copies.', trap: 'Keeping the rate limit separately on each server: 10 servers = really 1,000/minute.' },
        { q: '3 engineers, a 2-month-old app "xyz notes". Features change every day.', signal: 'A small team, an early product.', pick: 'Monolith', why: 'One codebase, one deploy, function calls. The fastest way to learn and change.', trap: '12 microservices on day one. Change 4 services for every feature, and hunt for network bugs.' },
        { q: 'Rate limiter counters in Redis: 2 GB of data, but if Redis goes down, all the limits stop working.', signal: 'The data fits on one node; failover is needed.', pick: 'Redis Sentinel (or a managed Redis with failover)', why: 'There is no need to shard. Sentinel watches the primary and, if it fails, makes a replica the new primary.', trap: 'Taking Cluster "for the future". Limits on multi-key commands and more machines, with no benefit right now.' },
        { q: 'Each user\'s "Your 2025 on xyz.com" recap page: their top videos, their hours watched.', signal: 'Personalised: different for each user.', pick: 'Direct from server (static assets from the CDN)', why: 'This response is for one user only. The CDN hit rate is zero, and it might show up for someone else by mistake. JS, CSS and images still come from the CDN.', trap: 'Caching the whole page on the CDN without a private header.' },
        { q: '500 VIP passes for an xyz.com live event, sale at 10:00, 2 lakh people ready.', signal: 'A hot item: thousands of people on one thing, and minutes for payment.', pick: 'Reservation hold (with expiry), with a waiting room in front', why: 'One atomic UPDATE makes the pass HELD only if it is AVAILABLE. If payment does not happen in 10 minutes, it becomes free again. Let the crowd in slowly through a waiting room.', trap: 'An optimistic version check: almost all of the 2 lakh people will hear "conflict", and the retry storm will bring the DB down.' },
      ],
      render(el) {
        const cases = this.cases, T = { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' };
        let i = 0, hint = false, ans = false;
        const draw = () => {
          const c = cases[i];
          el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
            <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn small" data-a="hint">${T.hint}</button>
              <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
              <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
              <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
            <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
            <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
              <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
              <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
          el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
            else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
            draw();
          });
        };
        draw();
      },
    },

    { type: 'callout', tone: 'tip', title: 'Decide (roadmap rules, one line each)', html: `Reads/HA → replicate; writes/size → shard. Money/inventory/bookings/usernames → strong; likes/views/feed/search → eventual. Few followers → push; celebrity → pull; in practice hybrid. Identical servers → LB; auth/rate-limit/routing → gateway; usually both. Small team → monolith; many teams + different scaling → microservices. Fits on one node → Sentinel; need to shard → Cluster. Shared/static/global → CDN; personalised/private → direct. Rare conflict → optimistic; hot item → pessimistic / hold.` },

    { type: 'h2', text: 'How to say this in an interview' },
    { type: 'steps', items: [
      { t: 'Say the signal first', d: '"There is money here", "the data is 12 TB", "one author has 5 crore followers". Let the interviewer see that the choice came from the requirement.' },
      { t: 'Start with the simple option', d: 'Replica, monolith, LB, Sentinel, optimistic: A, until a signal asks for B. Fewer moving parts.' },
      { t: 'Do not be afraid to say "both, in different places"', d: 'Replicas of shards, gateway + LB, a hybrid feed. A different choice for each part.' },
      { t: 'Also say when it will change', d: '"If writes triple, we will shard", "when we have 10 teams, we will split out services". Every decision comes with its expiry.' },
    ]},
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com: where all eight choices landed', height: 630,
      nodes: [
        { id: 'users', label: 'Users', sub: 'app + browser', x: 90, y: 60, w: 120, kind: 'client', info: 'What it is: the users of xyz.com. Some requests end at the CDN (videos, JS); the rest go in through the gateway.' },
        { id: 'cdn', label: 'CDN', sub: 'videos, JS, images', x: 300, y: 60, w: 150, kind: 'edge', info: 'What it is: cache servers near the user. Choice 7: shared and big files come from the CDN. Personal things (continue watching) do not.' },
        { id: 'gw', label: 'API gateway', sub: 'auth, rate limit', x: 300, y: 180, w: 150, kind: 'net', info: 'What it is: one front door for all API requests. Choice 4: the login check, the rate limit, and sending each request to the right service by URL happen here.' },
        { id: 'sess', label: 'Redis Sentinel', sub: 'sessions, 3 GB', x: 560, y: 180, w: 150, kind: 'cache', info: 'What it is: the Redis for login sessions. Choice 6: the data fits on one node and only needs failover, so Sentinel, not Cluster.' },
        { id: 'lb', label: 'Load balancers', sub: 'between copies', x: 300, y: 300, w: 150, kind: 'net', info: 'What it is: an LB in front of each service that spreads traffic across that service\'s identical copies. Choice 4: an LB as well as the gateway, both.' },
        { id: 'feed', label: 'Feed service', sub: 'hybrid feed', x: 110, y: 430, w: 140, kind: 'server', info: 'What it is: the service that builds feeds. Choice 3: posts from normal authors are already in timelines (push), celebrity posts are added at read time (pull). Choice 5: its own team, its own service.' },
        { id: 'booking', label: 'Booking service', sub: 'tickets', x: 360, y: 430, w: 140, kind: 'server', info: 'What it is: the service that sells event tickets. Choice 8: a reservation hold on hot seats, because thousands of people want one seat.' },
        { id: 'profile', label: 'Profile service', sub: 'bio, settings', x: 560, y: 430, w: 140, kind: 'server', info: 'What it is: the service for editing profiles. Choice 8: conflicts are rare, so an optimistic version check, no lock.' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis Cluster', x: 95, y: 570, w: 150, kind: 'cache', info: 'What it is: a ready-made feed list for each user. 400 GB does not fit on one node: the Cluster of choice 6. Choice 2: eventual, a post arriving a few seconds late is fine.' },
        { id: 'seats', label: 'Seats DB', sub: 'strong + hold', x: 410, y: 570, w: 140, kind: 'data', info: 'What it is: the SQL database of seats. Choice 2: strong consistency, one seat never goes to two people. Status AVAILABLE → HELD → BOOKED.' },
        { id: 'usersdb', label: 'Users DB', sub: 'leader + replicas', x: 590, y: 570, w: 150, kind: 'data', info: 'What it is: the users database. Choice 1: the data fits on one node and reads are many, so replicas (not sharding). The user who edits reads their own change from the leader.' },
        { id: 'posts', label: 'Posts DB', sub: 'sharded', x: 255, y: 570, w: 130, kind: 'data', info: 'What it is: all the posts. Choice 1: size and writes are beyond one node, so it is sharded by author_id, with replicas for each shard.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', label: 'files' },
        { a: 'users', b: 'gw', label: 'API' },
        { a: 'gw', b: 'sess', label: 'session' },
        { a: 'gw', b: 'lb' },
        { a: 'lb', b: 'feed' },
        { a: 'lb', b: 'booking' },
        { a: 'lb', b: 'profile' },
        { a: 'feed', b: 'tl', label: 'push' },
        { a: 'feed', b: 'posts', label: 'celeb pull' },
        { a: 'booking', b: 'seats', label: 'hold' },
        { a: 'profile', b: 'usersdb', label: 'version' },
      ],
      paths: [
        { name: 'Watch a video', text: 'The video and JS are the same for everyone, so they came from a nearby CDN server. The request never reached the origin.', go: ['users>cdn', 'res:cdn>users'] },
        { name: 'Open the feed', text: 'The gateway checked the session, and the LB picked one copy of the feed service. The list came from the timeline cache, celebrity posts from the posts DB, and both were merged.', go: ['users>gw>sess', 'gw>lb>feed>tl', 'feed>posts', 'res:feed>lb>gw>users'] },
        { name: 'Book a seat', text: 'The booking service made the seat HELD with one atomic UPDATE (strong). Payment within 10 minutes, otherwise the seat is free again.', go: ['users>gw>lb>booking>seats', 'res:seats>booking>lb>gw>users'] },
        { name: 'Edit profile', text: 'The profile service updated with a version check (optimistic). It wrote to the Users DB leader, and the change reached the replicas later.', go: ['users>gw>lb>profile>usersdb', 'res:usersdb>profile>lb>gw>users'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A read or HA problem → replication. A write or size problem → sharding. In practice, both.</li>
      <li>Money, stock, seats, unique usernames → strong. Likes, views, feed, search → eventual.</li>
      <li>Few followers → push. Celebrity → pull. Big apps → hybrid.</li>
      <li>LB = spreading traffic across copies of one service. Gateway = the front door for everything (auth, rate limit, routing). Usually both.</li>
      <li>Small team, new product → monolith. Many teams + different scaling → microservices. In between, a modular monolith.</li>
      <li>Data fits on one Redis node → Sentinel. Need to shard → Cluster (16,384 slots).</li>
      <li>Shared/static/big files → CDN. Personal/private → straight from the server.</li>
      <li>Rare conflict → optimistic (version). Hot item → pessimistic or a reservation hold with expiry.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['The answer to every "A or B" now comes from signals in the requirements, not from a guess', 'The simple option (replica, monolith, LB, Sentinel, optimistic) first: fewer moving parts', 'Hybrid answers (feed, LB + gateway) give the benefit of both worlds'],
      costs: ['The B-side options (sharding, microservices, Cluster, pessimistic) are more complex and more costly', 'Hybrid designs mean maintaining two paths (push + pull merge)', 'Signals change over time: today\'s right answer can be wrong in 2 years'],
    },
    { type: 'think', questions: [
      { q: 'Username signup on xyz.com. Two people ask for "riya" at the same time. Answer both card 2 and card 8.', a: 'Strong consistency: a unique username must never be duplicated. Locking: for most usernames conflicts are rare, so the simplest is the DB\'s UNIQUE constraint (if the insert fails, "taken"). This is a kind of optimistic approach: no lock, fail on conflict. A hold is needed only if signup has many steps and the username must be reserved for minutes.' },
      { q: 'In a hybrid feed, who counts as a "celebrity"? How would you choose the threshold?', a: 'Authors above a follower limit (for example 10k-1 lakh) use pull. Pick the threshold with napkin maths: how many writes/sec the fan-out workers can do, and how soon a post must reach everyone. As soon as an author crosses the limit, put them on the pull list.' },
      { q: 'Live cricket score JSON: the same for everyone, changes every 2 seconds, 3 crore viewers. CDN or direct?', a: 'CDN, with a 1-2 second TTL. Each edge fetches from the origin once or twice per second, and the remaining crores of requests are served from the edge. Going direct would put ~1.5 crore requests/sec on the origin (3 crore ÷ 2 s). "It changes" does not mean "no CDN"; "it is personalised" does.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'The DB data has reached 12 TB and keeps growing. What do we do?', options: ['More read replicas', 'Sharding', 'A bigger cache'], answer: 1, explain: 'Each replica holds the full 12 TB. Size beyond one node → shard (and replicas for each shard).' },
      { q: 'A celebrity has 5 crore followers. What is best for their posts?', options: ['Push to all followers', 'Pull at read time (part of the hybrid)', 'Email every follower'], answer: 1, explain: '5 crore writes for one post = a backlog of minutes. Merge celebrity posts at read time.' },
      { q: 'Which locking for profile settings updates?', options: ['Optimistic version check', 'SELECT FOR UPDATE on every read', 'A global lock'], answer: 0, explain: 'Conflicts are rare. A version check is cheap and needs no waiting.' },
      { q: 'Once there is an API gateway, can we remove the LB?', options: ['Yes, the gateway does everything', 'No, usually you have both: the gateway at the entry, an LB between each service\'s copies', 'The LB is the gateway'], answer: 1, explain: 'The gateway does auth/routing; an LB spreads traffic across the identical copies of each service.' },
    ]},
    { type: 'sources', items: [
      { title: 'Redis Cluster specification (hash slots)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/', used: '16,384 hash slots, multi-key operations limited to keys in the same slot, hash tags.' },
      { title: 'High availability with Redis Sentinel', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/', used: 'How Sentinel monitoring and automatic failover work.' },
      { title: 'Timelines at Scale (Raffi Krikorian, QCon 2012)', publisher: 'InfoQ', url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/', used: 'Twitter\'s fan-out on write into Redis timelines, and merging tweets from high-follower accounts at read time. The talk is from 2012-13, so it is old.' },
      { title: 'PostgreSQL: Explicit locking (row-level locks, SELECT FOR UPDATE)', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/explicit-locking.html', used: 'How a pessimistic row lock behaves.' },
    ]},
  ],
});
