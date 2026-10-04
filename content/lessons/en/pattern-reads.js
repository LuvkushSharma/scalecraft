Lesson.register({
  id: 'pattern-reads',
  title: 'Scaling reads',
  minutes: 28,
  summary: `Every big system is read-heavy: people look at things far more often than they change them. When reads grow, there is a ladder to climb: index → cache → read replicas → CDN → precomputed views. For each rung you learn when to climb it, what it costs, and where it also fails.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `On xyz.com a video is uploaded once, but millions of people watch it.<br>Every "look" is a <strong>read</strong>: the server has to fetch data and send it.<br>When reads grow a lot, the database gets tired and pages become slow.<br>This lesson is a ladder with 5 fixes, from cheap to expensive. Each time, climb only as high as you need.` },
    { type: 'h2', text: 'The story so far' },
    { type: 'p', html: `In earlier phases we learned the tools one by one: <a href="#/db-internals">index</a>, <a href="#/caching">cache</a>, <a href="#/replication">replication</a>, <a href="#/cdn">CDN</a>. In phase 5 we saw which tool answers which question. Now phase 6: <strong>patterns</strong>.` },
    { type: 'callout', tone: 'term', title: 'Pattern', html: `<strong>What it is:</strong> a problem that shows up again and again in every big design, plus a tested fix for it.<br><strong>Why we need it:</strong> in an interview or at work you do not have to think from zero every time. Spot the problem, apply the pattern.<br><strong>Without it:</strong> you repeat the same mistakes in every system, and you apply fixes in the wrong order.` },
    { type: 'p', html: `The first pattern is the most common one: <strong>growing reads</strong>. xyz.com has a video page: title, channel name, views, comments. A video is uploaded once (1 write). But millions of people look at it (millions of reads). The Instagram feed, product pages and YouTube video details all have this same shape.` },
    { type: 'callout', tone: 'term', title: 'Read, write and the read:write ratio', html: `<strong>What it is:</strong> a <strong>read</strong> = looking at data (opening a page). A <strong>write</strong> = changing data (uploading a video, posting a comment). The <strong>read:write ratio</strong> = how many reads happen for every one write. In the URL shortener it was about 100:1. Social feeds are often 100:1 to 1000:1.<br><strong>Why we need it:</strong> this ratio tells you where to spend effort. If the ratio is big, the system is <strong>read-heavy</strong>, and all the focus goes to making the read path cheap.<br><strong>Without it:</strong> you optimise the wrong thing, like making writes faster when the pain is in reads.` },
    { type: 'callout', tone: 'term', title: 'Escalation ladder', html: `<strong>What it is:</strong> a ladder where each step (<strong>rung</strong>) adds a new tool. The lower rungs are cheap and simple. The higher ones are expensive and complex.<br><strong>Why we need it:</strong> it makes the rule simple: <strong>do not climb higher until the rung below has really failed</strong>. Each rung is triggered by a symptom you can see in your metrics (graphs).<br><strong>Without it:</strong> people jump straight to the most expensive tool, and the real small problem (like a missing index) stays hidden.` },

    { type: 'h2', text: 'The ladder at a glance' },
    { type: 'p', html: `First, all five rungs in one line each. The full card and story for each one is below in "Each rung, a bit deeper". For now just see the shape: <strong>symptom</strong> (what you see) → <strong>fix</strong> → <strong>cost</strong>.` },
    { type: 'steps', items: [
      { t: 'Index', d: 'Index = like the index page at the back of a book: it takes the database straight to the right row. Symptom: one query is slow because the database reads the whole table. Fix: an index on the right column. Cost: a bit of disk, and every write gets a bit slower.' },
      { t: 'Cache (Redis)', d: 'Cache = a copy of answers that are asked for again and again, kept in RAM (Redis is one such RAM store). Symptom: queries are fast, but the database CPU is full from answering the same questions. Fix: keep hot data in RAM. Cost: old (stale) data, invalidation, one more component.' },
      { t: 'Read replicas', d: 'Replica = a full copy of the database that is used only for reading. Symptom: there are so many cache misses that one database machine cannot handle them, or the database would die if the cache fell over. Fix: copies of the database, with reads sent to them. Cost: the copy is slightly behind (replication lag), more machines.' },
      { t: 'CDN', d: 'CDN = servers spread around the world that keep copies close to users. Symptom: content that is the same for everyone (images, video, public pages) still reaches our main servers, and far-away users wait a long time. Fix: copies on edge servers. Cost: the CDN bill, and care with purges (deleting copies).' },
      { t: 'Precomputed / materialized views', d: 'Precomputed view = an answer prepared in advance, like a formula sheet made before an exam. Symptom: pages that are different for every user (feed, dashboard) do joins and counting on every read. Fix: keep the answer ready, so a read is one lookup. Cost: extra work on the write path, and the data is a bit old.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Why this order?', html: `Each rung is <strong>more complex</strong> than the one before and brings new ways to fail. An index is one line of SQL. A cache brings stale data. Replicas bring lag. A CDN brings purges. Precomputed views bring a whole new write pipeline. So use the cheapest fix first. Many people add Redis straight away when the real problem was a missing index.` },

    { type: 'h2', text: 'Each rung, a bit deeper' },
    { type: 'p', html: `Each rung follows the same format: the xyz.com story with numbers → the technique in plain words → when to stop → a link to the deep lesson.` },
    { type: 'h3', text: 'Rung 1: index (always check this first)' },
    { type: 'p', html: `<strong>Story:</strong> the xyz.com channel page shows "the latest 20 videos of this channel". The <code>videos</code> table has 1 crore (10 million) rows. Traffic is only 20 requests per second, yet the page takes 0.5 seconds. Why? Because the database has no idea where the videos of channel 77 are. It reads every row and checks it.` },
    { type: 'callout', tone: 'term', title: 'Full table scan', html: `<strong>What it is:</strong> the database reading <em>every</em> row of a table one by one. It is like searching for a word in a book with no index by turning every page.<br><strong>Why it happens:</strong> the column you filter on (<code>channel_id</code>) has no index.<br><strong>Without an index:</strong> 1 crore rows × every request. As the table grows, the query gets slower, even when traffic is low.` },
    { type: 'callout', tone: 'term', title: 'Index', html: `<strong>What it is:</strong> a separate sorted list inside the database (often a tree called a B-tree) that says "the rows of channel 77 are here". Like the index page at the back of a book.<br><strong>Why we need it:</strong> the database goes straight to the right place. Instead of 1 crore rows, it reads about 4 tree levels and 20 rows.<br><strong>Without it:</strong> a full scan. Even with a cache or replicas, every miss still takes 500 ms.<br><strong>Example:</strong> <code>CREATE INDEX ON videos (channel_id, created_at DESC)</code>: 500 ms → about 5 ms.` },
    { type: 'callout', tone: 'term', title: 'EXPLAIN', html: `<strong>What it is:</strong> an SQL command that tells you, before running a query, <em>how</em> the database will run it: a full scan ("Seq Scan") or an index ("Index Scan").<br><strong>Why we need it:</strong> you find the real reason for a slow query in 10 seconds.<br><strong>Without it:</strong> you fix things by guessing, like putting Redis on top of a missing index.` },
    { type: 'p', html: `<strong>Index lab.</strong> Change the size of the table. See how many rows a full scan reads, and how many levels the index has. Assumptions: a full scan reads about 2 crore (20 million) rows per second, and each index level takes about 1 ms (worst case, when the page comes from disk).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Rows in the videos table: <strong class="ix-v"></strong></label><input class="ix-s" type="range" min="3" max="9" step="1" value="7"></div>
        <div class="stats">
          <div class="stat"><span>Full scan: rows read</span><strong class="ix-fr"></strong></div>
          <div class="stat"><span>Full scan: time</span><strong class="ix-ft"></strong></div>
          <div class="stat"><span>Index: tree levels</span><strong class="ix-h"></strong></div>
          <div class="stat"><span>Index: time</span><strong class="ix-it"></strong></div>
        </div>
        <div class="ix-bars" style="display:grid;gap:6px;margin-top:10px"></div>
        <div class="calc-note ix-note"></div>`;
      const $ = c => el.querySelector(c);
      const f = n => n >= 1e9 ? n / 1e9 + ' billion' : n >= 1e7 ? n / 1e7 + ' crore' : n >= 1e5 ? n / 1e5 + ' lakh' : n.toLocaleString('en-IN');
      const ms = x => x >= 1000 ? (x / 1000).toFixed(x >= 1e4 ? 0 : 1) + ' s' : (x < 10 ? x.toFixed(1) : Math.round(x)) + ' ms';
      const upd = () => {
        const n = Math.pow(10, +$('.ix-s').value);
        const full = n / 2e7 * 1000;
        const h = Math.ceil(Math.log(n) / Math.log(200));
        const idx = h * 1 + 1;
        $('.ix-v').textContent = f(n);
        $('.ix-fr').textContent = f(n);
        $('.ix-ft').textContent = ms(full);
        $('.ix-h').textContent = h + ' (+20 rows)';
        $('.ix-it').textContent = '~' + ms(idx);
        const mx = Math.max(full, idx);
        const bar = (t, v, col) => `<div><div style="font-size:13px;color:var(--ink-2)">${t}: ${ms(v)}</div><div style="height:10px;background:var(--surface-2);border-radius:5px"><div style="height:10px;width:${Math.max(1, v / mx * 100)}%;background:${col};border-radius:5px"></div></div></div>`;
        $('.ix-bars').innerHTML = bar('Full scan', full, 'var(--red)') + bar('Index', idx, 'var(--green)');
        $('.ix-note').innerHTML = (full < idx ? `On a small table a full scan is already very fast (it is all in RAM). An index makes no difference here; the database picks a full scan by itself. ` : `The index is ${Math.round(full / idx).toLocaleString('en-IN')}× faster. `) + `If the table gets 10 times bigger, the full scan gets 10 times slower. But the index barely gains one level (each level handles about 200 times more rows).`;
      };
      $('.ix-s').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Cost:</strong> every index takes disk space. Every INSERT/UPDATE gets a bit slower, because the index must be updated too. In a composite index (an index on two columns), the column order must match the query's WHERE and ORDER BY (the leftmost prefix rule, in the <a href="#/db-internals">DB internals</a> lesson).` },
    { type: 'callout', tone: 'tip', title: 'When to stop (index)', html: `Stop when <code>EXPLAIN</code> shows that every important query uses an index, and the database CPU stays under about 60% on a normal day. Climb to the next rung when <strong>queries are fast but there are too many of them</strong>. An index makes a query faster. It does not reduce <em>how many</em> queries arrive. One database machine fills up at about 10k simple reads per second (the roadmap's napkin number).` },
    { type: 'h3', text: 'Rung 2: cache' },
    { type: 'p', html: `<strong>Story:</strong> the index is in place, and each query takes about 5 ms. Then a video goes viral: 1 lakh (100k) reads per second. One database machine already hits 100% CPU at about 10k per second. But look closely: most people are watching the <em>same</em> 50 popular videos. The database is building the answer to the same question thousands of times.` },
    { type: 'callout', tone: 'term', title: 'Cache and Redis', html: `<strong>What it is:</strong> a cache = a copy of popular answers kept in fast memory (RAM). <strong>Redis</strong> = a popular separate server that keeps key → value pairs in RAM and returns them in about 1 ms.<br><strong>Why we need it:</strong> instead of building the same answer again in the database, take it from RAM. The database only sees new or forgotten questions.<br><strong>Without it:</strong> every viewer's request reaches the database. 1 lakh per second = 10 database machines just to read the same data again and again.<br><strong>Example:</strong> the key <code>ch:77:latest</code> → a list of 20 videos, kept for 60 seconds.` },
    { type: 'callout', tone: 'term', title: 'Cache hit, miss, hit rate, TTL', html: `<strong>What it is:</strong> a <strong>hit</strong> = the answer was found in the cache. A <strong>miss</strong> = it was not, so it had to come from the database. The <strong>hit rate</strong> = how many out of 100 requests are hits. <strong>TTL</strong> (time to live) = how long a copy lives before it is deleted by itself.<br><strong>Why we need it:</strong> load on the database = reads × (1 − hit rate). This one formula tells you how much the cache is saving.<br><strong>Without it:</strong> you will be happy that you "added a cache", while the misses are still knocking the database over.` },
    { type: 'callout', tone: 'term', title: 'Cache-aside', html: `<strong>What it is:</strong> the most common way to use a cache: the app checks the cache first. On a miss it reads from the database, then stores the answer in the cache with a TTL.<br><strong>Why we need it:</strong> it is simple, and if the cache falls over the app can still work from the database (if the database can take the load).<br><strong>Without it:</strong> different logic in every place, and by mistake old data can stay in the cache forever. Details: <a href="#/caching-strategies">caching strategies</a>.` },
    { type: 'p', html: `<strong>Miss calculator.</strong> Change the reads and the hit rate. See how many misses reach the database, and how many database machines you need (about 10k reads per second each). Then press "Redis crashes".` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Reads per second: <strong class="mc-rv"></strong></label><input class="mc-r" type="range" min="3" max="6.5" step="0.1" value="5"></div>
        <div><label>Cache hit rate: <strong class="mc-hv"></strong></label><input class="mc-h" type="range" min="50" max="99" step="1" value="90"></div></div>
        <div style="margin:8px 0"><button type="button" class="btn small mc-k">Redis crashes</button></div>
        <div class="stats">
          <div class="stat"><span>From cache (hits)</span><strong class="mc-hit"></strong></div>
          <div class="stat"><span>Reach the DB (misses)</span><strong class="mc-miss"></strong></div>
          <div class="stat"><span>DB machines needed</span><strong class="mc-db"></strong></div>
        </div>
        <div style="height:14px;background:var(--surface-2);border-radius:7px;margin-top:10px;display:flex;overflow:hidden"><div class="mc-b1" style="background:var(--green)"></div><div class="mc-b2" style="background:var(--red)"></div></div>
        <div class="calc-note mc-note"></div>`;
      const $ = c => el.querySelector(c);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n) + '';
      let down = false;
      $('.mc-k').onclick = () => { down = !down; $('.mc-k').classList.toggle('primary', down); $('.mc-k').textContent = down ? 'Bring Redis back' : 'Redis crashes'; upd(); };
      const upd = () => {
        const r = Math.round(Math.pow(10, +$('.mc-r').value)), h = +$('.mc-h').value / 100;
        const hit = down ? 0 : Math.round(r * h), miss = r - hit, db = Math.max(1, Math.ceil(miss / 1e4));
        const normal = Math.max(1, Math.ceil(Math.round(r * (1 - h)) / 1e4));
        $('.mc-rv').textContent = f(r) + '/s'; $('.mc-hv').textContent = Math.round(h * 100) + '%';
        $('.mc-hit').textContent = f(hit) + '/s'; $('.mc-miss').textContent = f(miss) + '/s'; $('.mc-db').textContent = db;
        $('.mc-b1').style.width = (hit / r * 100) + '%'; $('.mc-b2').style.width = (miss / r * 100) + '%';
        $('.mc-note').innerHTML = down
          ? `<strong>Redis down:</strong> all ${f(r)}/s go to the DB. That is about ${Math.round(1 / (1 - h))} times the ${f(r * (1 - h))}/s of a normal day. If you only have ${normal} DB machine${normal > 1 ? 's' : ''}, the site will go down. So you need some protection behind the cache too (replicas, request collapsing).`
          : `DB load = ${f(r)} × (1 − ${h.toFixed(2)}) = ${f(miss)}/s. Raise the hit rate from 90% to 99%: 10 times fewer misses. But at 1M reads/s, a 90% hit rate = 100k misses/s, which is 10 times what one DB machine can take. There you need the next rung.`;
      };
      $('.mc-r').addEventListener('input', upd); $('.mc-h').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Cost:</strong> stale data (you must handle TTL and invalidation), running Redis servers, and one dangerous dependency: if the cache falls over, the database gets the full load. <strong>Limit:</strong> misses. Also, long-tail data (every user's different search) almost never hits the cache, because every question is new.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (cache)', html: `Stop when the hit rate is 90% or more, the misses fit comfortably in one database machine (about 60% CPU), and the database can survive for a few minutes even if Redis crashes. Climb to the next rung when <strong>the misses alone fill the database</strong>, or when a cache crash could take the site down.` },
    { type: 'h3', text: 'Rung 3: read replicas' },
    { type: 'p', html: `<strong>Story:</strong> xyz.com is now at 5 lakh (500k) reads per second. The cache gives 90% hits. Even so, 10% misses = 50k per second on the database. One database machine takes about 10k per second. So the database is 5 times overloaded. And if Redis ever crashes, all 500k per second land on the database.` },
    { type: 'callout', tone: 'term', title: 'Leader and read replica', html: `<strong>What it is:</strong> the <strong>leader</strong> (primary) = the real database where all writes go. A <strong>read replica</strong> = a full copy of the leader that keeps copying every change from the leader, and is used only for reads.<br><strong>Why we need it:</strong> 1 leader + 5 replicas = 6 machines for reads. And if the leader fails, a replica can become the new leader.<br><strong>Without it:</strong> all misses go to one machine. Its CPU limit becomes the limit of the whole site.<br><strong>Example:</strong> 50k misses/s ÷ 10k = 5 machines → 1 leader + 4-5 replicas.` },
    { type: 'callout', tone: 'term', title: 'Replication lag', html: `<strong>What it is:</strong> the time between a change on the leader and that change reaching a replica. Usually milliseconds, under heavy load even seconds.<br><strong>Why it matters:</strong> if you read from a replica, the user may sometimes see old data, even a change they just made.<br><strong>Without handling it:</strong> bug reports like "I changed the title and it did not save!". The fix: <strong>read-your-writes</strong>, which means the person who just wrote reads from the leader for a few seconds.` },
    { type: 'p', html: `<strong>Cost:</strong> each replica is a full machine with the full data. <strong>Limit:</strong> replicas <strong>do nothing for writes</strong>. Every replica must apply every write. Too many replicas = more work for the leader to send changes, and more lag. So teams usually keep only a few replicas. Details: <a href="#/replication">replication</a>.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (replicas)', html: `Stop when both the misses and the "cache down" load fit in the replicas under about 60% CPU. Climb to the next rung when: (a) a lot of traffic is for <strong>public content that is the same for everyone</strong>, or far-away users are slow → CDN; (b) the read itself is <strong>expensive</strong> (joins) → precomputed views. If the pain is in writes, leave this ladder and see <a href="#/pattern-writes">Scaling writes</a>.` },
    { type: 'h3', text: 'Rung 4: CDN' },
    { type: 'p', html: `<strong>Story:</strong> 10 lakh (1M) reads per second. 80% of these requests are <strong>the same for every user</strong>: thumbnails, the public data of a video page, channel pages. Our servers are in Mumbai. A user in the US waits about 200 ms for every round trip. And the origin gets 1M per second, while 80% of the answers are identical for everyone.` },
    { type: 'callout', tone: 'term', title: 'CDN, edge and origin', html: `<strong>What it is:</strong> a <strong>CDN</strong> (Content Delivery Network) = a network of servers placed in cities around the world (<strong>edges</strong>). They take a copy of the answer from our own servers (the <strong>origin</strong>) and keep it close to users.<br><strong>Why we need it:</strong> the nearby edge answers the user in about 15 ms, and 80% of requests never reach the origin.<br><strong>Without it:</strong> every user, every time, travels around the world, and the origin carries everyone's load. The bandwidth bill is also bigger.` },
    { type: 'callout', tone: 'term', title: 'Cache-Control header and purge', html: `<strong>What it is:</strong> <code>Cache-Control</code> = a line sent with the response that tells the CDN "what to cache and for how long". <code>public, max-age=60</code> = keep it for everyone for 60 seconds. <code>private</code> = the CDN must not cache it. A <strong>purge</strong> = telling the CDN "delete this copy now".<br><strong>Why we need it:</strong> this is how you control what stays on the edge and what does not.<br><strong>Without it:</strong> either someone's private data is shown to another person, or the CDN caches nothing.` },
    { type: 'p', html: `<strong>Cost:</strong> the CDN bill (per GB), care with purges, and it only helps with <strong>public, same-for-everyone</strong> responses. <strong>Limit:</strong> personalised responses (feed, cart, notifications) are not cached on a CDN. Details: <a href="#/cdn">CDN</a>.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (CDN)', html: `Stop when a large share of public traffic (80-95%) is a hit on the edge and the origin is relaxed. Climb to the next rung when the remaining <strong>personalised</strong> traffic also becomes expensive, because every request does joins and sorting.` },
    { type: 'h3', text: 'Rung 5: denormalised and precomputed views' },
    { type: 'p', html: `<strong>Story:</strong> the "My subscriptions" feed is different for every user. Riya follows 200 channels. Every time she opens the feed, the database has to join the latest videos of 200 channels and sort them by time. This read is not just <em>frequent</em>, it is <em>expensive</em>. 2 lakh feed reads per second × a heavy join = the replicas are hot again. And the CDN cannot cache it.` },
    { type: 'callout', tone: 'term', title: 'Denormalisation', html: `<strong>What it is:</strong> keeping a copy of data in a second place on purpose, to make reading faster. For example, writing <code>channel_name</code> inside each video row, so you do not have to join with the channels table.<br><strong>Why we need it:</strong> remove the join, and a read becomes a simple lookup.<br><strong>Without it:</strong> a join on every read. Joins on big data eat CPU.<br><strong>Cost:</strong> if a channel changes its name, every video row must be updated.` },
    { type: 'callout', tone: 'term', title: 'Materialized view and precomputed view', html: `<strong>What it is:</strong> a <strong>materialized view</strong> = the result of a query, saved inside the database like a table. In Postgres: <code>CREATE MATERIALIZED VIEW</code>. It does not refresh by itself; you run <code>REFRESH MATERIALIZED VIEW</code>. A <strong>precomputed view</strong> (the general name) = any answer built in advance, in the database, in Redis or in a search index, which a background job keeps updated.<br><strong>Why we need it:</strong> the expensive work happens once at <strong>write time</strong>, and at read time there is just one lookup.<br><strong>Without it:</strong> the same join and counting on every read, millions of times.` },
    { type: 'p', html: `<strong>How it works:</strong> a new video arrives → a background job (reading the database's change stream or a <a href="#/kafka">Kafka</a> event) updates the ready feeds of the subscribers. Every hour → a job refreshes the "top 10 videos this month" table. This is a form of <a href="#/architecture-styles">CQRS</a>: the model for writing is separate, and the model for reading is separate and ready-made.` },
    { type: 'p', html: `<strong>Cost:</strong> (1) extra work on the write path, and a new pipeline (change stream, workers) that can fail; (2) the view is a bit <strong>old</strong> (seconds to hours); (3) storage, because the same data is kept in several shapes. <strong>Limit:</strong> if the data changes every second and every user needs a different combination, precomputing can cost more than reading. In feed design this same question becomes "fan-out on write vs read", which is in the <a href="#/pattern-fanout">fan-out lesson</a>.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (precomputed views)', html: `This is the top rung of the ladder. After this, for reads you just add machines (Redis shards, replicas, edges). Precompute <strong>only the pages</strong> that are both expensive and read a lot. If a view is updated more often than it is read (written a lot, read little), precomputing it is a losing deal.` },
    { type: 'h2', text: 'The escalation ladder: move the slider' },
    { type: 'p', html: `The slider = reads per second on xyz.com at peak time. The widget tells you the <strong>lowest</strong> rung you must climb to, what the architecture looks like, the latency for the user, how many machines you need, and what will force the next rung. Press a rung's chip to get "stuck" on that rung and see where the overload happens.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Peak reads per second: <strong class="pr-v"></strong></label><input class="pr-s" type="range" min="1" max="7" step="0.05" value="4.5"></div>
        <div class="chips pr-chips" style="margin:10px 0;display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="pr-ladder" style="display:grid;gap:6px"></div>
        <svg class="pr-svg" viewBox="0 0 360 122" style="width:100%;max-width:520px;height:auto;margin-top:12px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Rung needed</span><strong class="pr-need"></strong></div>
          <div class="stat"><span>User latency (avg)</span><strong class="pr-lat"></strong></div>
          <div class="stat"><span>Machines (approx)</span><strong class="pr-mach"></strong></div>
          <div class="stat"><span>Bottleneck load</span><strong class="pr-util"></strong></div>
        </div>
        <div class="calc-note pr-note"></div>`;
      const $ = c => el.querySelector(c);
      const R = [
        { n: 'Only the DB, no index', cap: 50, data: 500, why: 'Every query scans a table of 1 crore rows (~0.5 s). At only ~50 reads/s the DB CPU and disk are full.' },
        { n: '+ Index', cap: 1e4, data: 5, why: 'A query now takes ~5 ms, but one DB node hits 100% CPU at ~10k reads/s. And most of the questions are the same ones again and again.' },
        { n: '+ Cache (Redis, 90% hit)', cap: 1e5, data: 1.5, why: '90% of reads come from RAM, but the 10% misses (~10k/s) fill the DB node again. And if Redis crashes, 100% of the load hits the DB.' },
        { n: '+ Read replicas (1 leader + 5)', cap: 6e5, data: 1.5, why: '6 DB nodes × 10k = 60k misses/s. Beyond that: every replica copies every write, lag grows, the origin needs 100+ app servers, and far-away users pay a full round trip every time.' },
        { n: '+ CDN (80% traffic public)', cap: 3e6, data: 1.5, why: 'The public 80% comes from the edge. The CDN cannot cache the other 20%, which is personalised (feed, "for me"), and every miss does joins. The origin is full again at ~600k/s.' },
        { n: '+ Precomputed views', cap: Infinity, data: 1, why: 'Even a personalised read is now one key lookup. Add Redis shards and reads scale horizontally. Now the pain is on the write side: updating views for every new post (Scaling writes and Fan-out lessons).' },
      ];
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n).toString();
      const model = (load, r) => {
        const origin = r >= 4 ? load * 0.2 : load;
        const misses = r >= 2 ? origin * 0.1 : origin;
        const db = r <= 2 ? 1 : r === 5 ? 3 : 1 + Math.min(5, Math.max(1, Math.ceil(misses / 1e4) - 1));
        const app = Math.max(2, Math.ceil(origin / 5000));
        const redis = r >= 2 ? Math.max(1, Math.ceil(origin / 1e5)) : 0;
        const oLat = 60 + 2 + R[r].data;
        const lat = r >= 4 ? 0.8 * 15 + 0.2 * oLat : oLat;
        return { origin, misses, db, app, redis, lat, util: load / R[r].cap };
      };
      let forced = -1;
      const chips = $('.pr-chips');
      ['Auto'].concat(R.map((x, i) => 'Rung ' + i)).forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.onclick = () => { forced = i - 1; upd(); }; chips.appendChild(b);
      });
      const boxes = [['User', 10, 20, 90], ['CDN', 135, 20, 90], ['App', 260, 20, 90], ['Redis', 5, 82, 80], ['Views', 95, 82, 80], ['DB', 185, 82, 80], ['Replicas', 275, 82, 80]];
      const activeAt = r => ['User', 'App', 'DB'].concat(r >= 2 ? ['Redis'] : [], r >= 3 ? ['Replicas'] : [], r >= 4 ? ['CDN'] : [], r >= 5 ? ['Views'] : []);
      const upd = () => {
        const load = Math.round(Math.pow(10, +$('.pr-s').value));
        const need = R.findIndex(x => load <= x.cap);
        const r = forced < 0 ? need : forced;
        const m = model(load, r);
        $('.pr-v').textContent = f(load) + '/s';
        chips.querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i - 1 === forced));
        $('.pr-ladder').innerHTML = R.map((x, i) => {
          const u = load / x.cap, pct = Math.min(100, u * 100);
          const col = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
          const tag = i < need ? 'not enough' : i === need ? 'climb up to here' : 'not needed yet';
          return `<div style="border:1px solid ${i === r ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 10px;background:${i === r ? 'var(--accent-soft)' : 'var(--surface)'};opacity:${i > need && i !== r ? 0.6 : 1}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:14px"><strong>${i}. ${x.n}</strong><span style="color:var(--ink-3);font-size:12px">max ~${x.cap === Infinity ? '∞ (add shards)' : f(x.cap) + '/s'} · ${tag}</span></div>
            <div style="height:6px;background:var(--surface-2);border-radius:3px;margin-top:4px"><div style="height:6px;width:${x.cap === Infinity ? 2 : pct}%;background:${col};border-radius:3px"></div></div></div>`;
        }).join('');
        const act = activeAt(r);
        const pos = Object.fromEntries(boxes.map(b => [b[0], b]));
        const line = (a, b2) => { const A = pos[a], B = pos[b2]; const on = act.includes(a) && act.includes(b2);
          const ax = A[1] + A[3] / 2, ay = A[2] + 34, bx = B[1] + B[3] / 2, by = B[2];
          const same = A[2] === B[2];
          return `<line x1="${same ? A[1] + A[3] : ax}" y1="${same ? A[2] + 17 : ay}" x2="${same ? B[1] : bx}" y2="${same ? B[2] + 17 : by}" stroke="var(--ink-3)" stroke-width="1.2" opacity="${on ? 1 : 0.2}"/>`; };
        $('.pr-svg').innerHTML = line('User', 'CDN') + line('CDN', 'App') + line('App', 'Redis') + line('App', 'Views') + line('App', 'DB') + line('App', 'Replicas') +
          (act.includes('CDN') ? '' : `<path d="M100 37 C 160 -8, 200 -8, 260 37" fill="none" stroke="var(--ink-3)" stroke-width="1.2"/>`) +
          boxes.map(([t, x, y, w]) => { const on = act.includes(t);
            return `<g opacity="${on ? 1 : 0.3}"><rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" ${on ? '' : 'stroke-dasharray="4 3"'}/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="var(--f-body)">${t}${t === 'DB' && r >= 1 ? ' + idx' : ''}</text></g>`; }).join('');
        $('.pr-need').textContent = need + '. ' + R[need].n.replace('+ ', '');
        $('.pr-lat').textContent = m.util > 1 ? 'timeouts' : Math.round(m.lat) + ' ms';
        $('.pr-mach').textContent = (m.app + m.db + m.redis) + (r >= 4 ? ' + CDN' : '');
        $('.pr-util').textContent = r === 5 ? 'scale-out' : Math.round(m.util * 100) + '%';
        $('.pr-note').innerHTML = (m.util > 1 ? `<strong>Stuck at rung ${r}: ${Math.round(m.util * 10) / 10}× overload.</strong> ` : '') +
          `At rung ${r}: origin ${f(m.origin)}/s, reaching the DB ${f(r === 5 ? 0 : m.misses)}/s; ${m.app} app servers (~5k req/s each), ${m.db} DB node${m.db > 1 ? "s" : ""}, ${m.redis} Redis node${m.redis === 1 ? "" : "s"}. <strong>Why the next rung:</strong> ${R[r].why} ` +
          `<br>Assumptions (roadmap phase 4): indexed query ~5 ms, DB node ~10k reads/s, Redis ~100k ops/s, cache hit 90%, app server ~5k req/s, user→origin ~60 ms, user→CDN edge ~15 ms.`;
      };
      $('.pr-s').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'What to learn from the widget', html: `At the default 31,623 reads/s (slider 4.5), rung 2 is enough: index + Redis, about 64 ms. Press the "Rung 1" chip: one database machine is 3.2× overloaded. At 1M/s you need rung 4, and latency drops from about 63 ms to about 25 ms, because 80% of reads come from a nearby CDN edge. Notice: rungs 2 and 3 do not change latency, they increase <strong>capacity</strong>; a CDN improves both.` },

    { type: 'h2', text: 'Watch the architecture grow, rung by rung' },
    { type: 'callout', tone: 'term', title: 'Cache stampede (thundering herd)', html: `<strong>What it is:</strong> when many requests miss the cache at the same moment and all rush to the database together. Like all the children running for one door when the school bell rings.<br><strong>When it happens:</strong> the TTL of a popular key runs out, the cache restarts, or the whole CDN is purged.<br><strong>Without a fix:</strong> a database that handled 10% of the load on a normal day suddenly gets 100% in one second, and it falls over.` },
    { type: 'callout', tone: 'term', title: 'Request collapsing and stale-while-revalidate', html: `<strong>What it is:</strong> <strong>request collapsing</strong> (single-flight, coalescing) = if 1,000 requests arrive for the same key, only <em>one</em> goes to the database or origin, and the other 999 wait for its answer. <strong>Stale-while-revalidate</strong> = show the old copy right away, and fetch the new copy in the background.<br><strong>Why we need it:</strong> it is the direct cure for a stampede.<br><strong>Without it:</strong> every miss is a separate database query, thousands of times for the same answer.` },
    { type: 'p', html: `One diagram that adds a new box at each step. The first two scenarios climb the ladder. The other two show what can still break even at the very top.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: 'video page', x: 65, y: 175, w: 110, kind: 'client', info: 'What it is: xyz.com viewers (browser or app). Most of them only read: video page, channel page, feed. Their reads are the reason we climb the whole ladder.' },
        { id: 'cdn', label: 'CDN edge', sub: 'nearby server', x: 215, y: 70, w: 130, kind: 'edge', hidden: true, info: 'What it is: the nearby CDN server (edge), rung 4. Why it is here: it keeps copies of public responses (thumbnails, the public JSON of a video page) in the user\'s city. It does not cache personalised requests; it sends them straight to the origin. Details: CDN lesson.' },
        { id: 'app', label: 'App servers', x: 365, y: 175, w: 130, kind: 'server', meter: true, load: 30, info: 'What it is: the servers that run xyz.com\'s code (the origin). Stateless, with a Load Balancer in front (not shown here). Why it is here: the logic of every rung lives here: check the cache first, then the precomputed view, then a replica.' },
        { id: 'redis', label: 'Redis cache', sub: 'RAM, ~1 ms', x: 595, y: 45, w: 160, kind: 'cache', hidden: true, info: 'What it is: the RAM cache server, rung 2. Why it is here: it returns popular answers in about 1 ms (cache-aside). A 90% hit rate = only 10% of reads reach the database.' },
        { id: 'views', label: 'Precomputed', sub: 'ready-made answers', x: 595, y: 130, w: 160, kind: 'data', hidden: true, info: 'What it is: a store of answers built in advance, rung 5. Why it is here: a background job watches the database changes and builds expensive answers early (each user\'s feed, top videos, dashboard numbers). A read = one key lookup.' },
        { id: 'db', label: 'DB leader', sub: 'source of truth', x: 595, y: 215, w: 160, kind: 'data', meter: true, load: 20, info: 'What it is: the real database (Postgres/MySQL leader), the source of truth. Why it is here: all writes go here. One machine handles roughly 10k simple indexed reads/s (the roadmap\'s napkin number).' },
        { id: 'rep', label: 'Read replicas', sub: 'copies, a bit late', x: 595, y: 300, w: 160, kind: 'data', hidden: true, info: 'What it is: copies of the leader used only for reads, rung 3. Why it is here: they share the load of the misses. They copy asynchronously (a little lag). Every replica applies every write, so the write load does not go down.' },
      ],
      edges: [{ a: 'u', b: 'app', id: 'direct' }, { a: 'u', b: 'cdn' }, { a: 'cdn', b: 'app' }, { a: 'app', b: 'redis' }, { a: 'app', b: 'views' }, { a: 'app', b: 'db' }, { a: 'app', b: 'rep' }, { a: 'db', b: 'rep' }, { a: 'db', b: 'views', dashed: true }],
      scenarios: [
        { name: 'Rung 0-2: index, cache', steps: [
          { title: 'Rung 0: no index', text: 'On the channel page: "the latest 20 videos of this channel". The <code>videos</code> table has 1 crore rows and no index on <code>channel_id</code>. On every request the database reads the whole table (full scan).', go: ['u>app>db', 'res:db>app>u'], after: { db: { state: 'hot', sub: 'full scan ~500 ms', load: 90 } }, msg: 'SELECT * FROM videos WHERE channel_id = 77\nORDER BY created_at DESC LIMIT 20;   -- Seq Scan, 1 cr rows' },
          { title: 'Rung 1: add an index', text: 'A composite index <code>(channel_id, created_at)</code>. Now the database goes straight to the right place and reads 20 rows. From 500 ms to about 5 ms. One line of SQL, no new server. <strong>Always check this first</strong> (run EXPLAIN).', go: ['u>app>db', 'res:db>app>u'], set: { db: { state: 'ok', sub: 'index: ~5 ms', load: 15 } }, msg: 'CREATE INDEX idx_videos_ch_time ON videos (channel_id, created_at DESC);' },
          { title: 'Traffic passes 10k/s', text: 'A video goes viral. The queries are fast, but there are very many of them, and most are the <em>same</em> question. One database machine hits full CPU at about 10k reads/s. Symptom: DB CPU at 100%, p99 latency goes up, even though each query alone is fast.', flood: { paths: ['u>app>db'], n: 12 }, after: { db: { state: 'hot', sub: 'CPU 100%', load: 97 } } },
          { title: 'Rung 2: cache', text: 'Redis arrives. The first request is a miss: fetch from the database, then store it in Redis with a TTL.', show: ['redis'], go: ['u>app', 'app>redis', 'bad:redis>app', 'app>db', 'res:db>app', 'app>redis'], after: { redis: { sub: 'ch:77:latest saved' } }, msg: 'GET ch:77:latest → (nil)\nSET ch:77:latest [...] EX 60' },
          { title: 'Now 90% hits', text: 'The other requests come from RAM in about 1 ms. The database only sees misses and writes. Even at 100k reads/s, the database only sees about 10k/s.', go: ['u>app>redis', 'res:redis>app>u'], after: { redis: { state: 'hit', sub: 'HIT 90%' }, db: { state: 'ok', sub: '~10% misses', load: 35 } } },
        ]},
        { name: 'Rung 3-5: replicas, CDN, views', intro: 'Now xyz.com is heading to 10 lakh reads/s. The cache is already there.', steps: [
          { title: 'Even the misses are too many', text: '500k reads/s × 10% misses = 50k/s on the database. One leader cannot handle it. And if Redis falls over, all 500k/s hit the database.', show: ['redis'], flood: { paths: ['u>app>redis', 'u>app>db'], n: 12 }, after: { db: { state: 'hot', sub: 'misses: 50k/s', load: 98 } } },
          { title: 'Rung 3: read replicas', text: '5 copies of the leader. Misses go to the replicas, writes only to the leader. The leader keeps sending its change log to the replicas (async). Now the database side has room for about 60k misses/s. Details: <a href="#/replication">replication</a>.', show: ['rep'], go: ['u>app>rep', 'res:rep>app>u', 'evt:db>rep'], after: { db: { state: 'ok', sub: 'writes + few reads', load: 40 }, rep: { sub: '5 replicas' } } },
          { title: 'Rung 4: CDN', text: 'Thumbnails, the public JSON of the video page, the channel page: the same for everyone. Keep them on the CDN edge (<code>Cache-Control: public, max-age=60</code>). 80% of requests never reach the origin, and the nearby server answers the user in about 15 ms.', show: ['cdn'], hide: ['direct'], go: ['u>cdn', 'res:cdn>u'], after: { cdn: { state: 'hit', sub: 'HIT ~80%' }, app: { load: 15 } }, msg: 'GET /v/abc123.json  →  HIT (edge Mumbai), Age: 23' },
          { title: 'Personalised page: the CDN cannot help', text: '"My subscriptions feed" is different for every user. The CDN cannot cache it (<code>Cache-Control: private</code>). On every miss the app must combine the latest videos of 200 channels: a join + a sort. The replicas get hot again.', go: ['u>cdn>app>rep', 'res:rep>app>cdn>u'], after: { rep: { state: 'hot', sub: 'feed joins: heavy', load: 90 } }, msg: 'GET /feed  (private)  →  JOIN subscriptions × videos, ORDER BY time, LIMIT 50' },
          { title: 'Rung 5: precomputed views', text: 'Keep every user\'s feed ready in advance. When a new video arrives, a background job (reading the database change stream / <a href="#/kafka">Kafka</a>) updates the ready feeds of the subscribers. A read = one key GET. The expensive work has moved from read time to write time.', show: ['views'], go: ['evt:db>views', 'u>cdn>app>views', 'res:views>app>cdn>u'], after: { views: { state: 'hit', sub: 'feed:42 ready' }, rep: { state: 'ok', sub: 'light', load: 30 } }, msg: 'GET feed:42  →  [v91, v88, v87, ...]   (~1 ms)' },
        ]},
        { name: 'Failure: CDN purge stampede', intro: 'All rungs are in place. At 2 am a new page design is deployed, and an engineer presses "purge everything".', steps: [
          { title: 'Everything purged at once', text: 'Every edge server throws away its copies. At the same time the deploy changed the version of the Redis keys (a <code>v2:</code> prefix), so the cache is empty too. Now every request is a miss.', show: ['cdn', 'redis', 'views', 'rep'], hide: ['direct'], set: { cdn: { state: 'miss', sub: 'purged: 0% hit' }, redis: { state: 'miss', sub: 'v2 keys: empty' } } },
          { title: 'A stampede on the origin', text: 'The 80% of traffic that used to stop at the edge, and the 90% that stopped at Redis, all reach the origin and the database in the same second. For one popular video, thousands of edges and thousands of app threads ask the database for the <em>same</em> answer. This is called a <strong>cache stampede</strong> (thundering herd).', flood: { paths: ['u>cdn>app>rep', 'u>cdn>app>db'], n: 16 }, after: { app: { state: 'hot', load: 99, sub: 'queue full' }, rep: { state: 'down', sub: 'timeouts' }, db: { state: 'hot', load: 99, sub: 'overloaded' } } },
          { title: 'Fix 1: request collapsing', text: '<strong>Request collapsing</strong> and an origin shield on the CDN: for one key, only one request per edge goes to the origin, and the rest wait for it. In the app, <strong>single-flight / a lock</strong>: one database query per key. Facebook\'s memcache paper did this with "leases". Details: <a href="#/caching-strategies">cache stampede</a>.', go: ['u>cdn>app>db', 'res:db>app>cdn>u'], after: { rep: { state: 'warn', sub: 'recovering' }, db: { state: 'warn', load: 60, sub: '1 query/key' } } },
          { title: 'Fix 2: the way you purge', text: 'Do not purge everything at once. <strong>Soft purge / stale-while-revalidate</strong>: keep showing the old copy while the new one is fetched. Purge only the URLs that changed, and change cache keys with versioned file names (<code>app.v2.js</code>) so that you do not need a purge at all. Warm the cache slowly.', go: ['u>cdn', 'res:cdn>u'], after: { cdn: { state: 'hit', sub: 'stale served' }, redis: { state: 'ok', sub: 'warming' }, app: { state: 'ok', load: 25, sub: '' }, rep: { state: 'ok', sub: 'normal' }, db: { state: 'ok', load: 30, sub: 'normal' } } },
        ]},
        { name: 'Failure: replica lag', intro: 'Riya changed the title of her video.', steps: [
          { title: 'The write goes to the leader', text: 'The title update went to the leader and was committed.', show: ['rep', 'redis'], go: ['u>app>db', 'res:db>app>u'], after: { db: { sub: 'title = "Goa vlog 2"' } }, msg: 'UPDATE videos SET title = \'Goa vlog 2\' WHERE id = 91' },
          { title: 'Read from a replica, old title', text: 'She refreshed the page. The read went to a replica that is 2 seconds behind. Riya saw the old title: "my change did not save!"', go: ['u>app>rep', 'res:rep>app>u'], after: { rep: { state: 'warn', sub: 'lag 2 s: old' } } },
          { title: 'Fix: read-your-writes', text: 'For a few seconds, the reads of the user who just wrote go to the leader (or update the cache together with the write). The rest of the world can see slightly old data from a replica. Details: <a href="#/replication">replication lag</a>.', go: ['u>app>db', 'res:db>app>u'], after: { u: { state: 'ok', sub: 'new title' } } },
        ]},
      ],
    },
    { type: 'table', head: ['Rung', 'Symptom that forces it', 'What grows', 'Cost', 'Where it fails'], rows: [
      ['Index', 'One query is slow, EXPLAIN shows a full scan', 'The speed of each query', 'Disk, slightly slower writes', 'Number of queries; ~10k/s per node'],
      ['Cache', 'High DB CPU, the same keys again and again', 'Capacity (depends on hit rate)', 'Stale data, invalidation, running Redis', 'Misses, long tail, cache down'],
      ['Read replicas', 'The misses alone fill the DB', 'Read capacity, availability', 'Machines, replication lag', 'Writes; lag; only a few replicas'],
      ['CDN', 'Public content hits the origin, far users are slow', 'Capacity + latency', 'CDN bill, purges', 'Personalised responses'],
      ['Precomputed views', 'The read itself is expensive (joins, aggregation)', 'Turns expensive reads into lookups', 'Write pipeline, staleness, storage', 'Data that changes very fast and is unique'],
    ], caption: 'Roadmap: "Apply in that order; each step is more complex than the last."' },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>1. "It is slow, add Redis."</strong> Run EXPLAIN first. If you hide a missing index behind a cache, every miss still takes 500 ms, and if the cache goes down, the site goes down.<br><strong>2. "Read replicas will scale writes too."</strong> No. Every replica applies every write. For writes there is the <a href="#/pattern-writes">Scaling writes</a> ladder.<br><strong>3. "A CDN is only for images."</strong> Public JSON/HTML can also be cached on a CDN with a short TTL (1-60 s): a live score, a trending list, the public part of a video page.<br><strong>4. "Once we climb, remove the lower rungs."</strong> No. The ladder <em>adds</em>. Even at the top, the index, cache and replicas are all still working.` },

    { type: 'h2', text: 'In the real world' },
    { type: 'p', html: `In its 2013 NSDI paper "Scaling Memcache at Facebook", Facebook explained that memcache was a big cache layer in front of the database for its read-heavy workload. To stop stampedes it used "leases": for each key, only one client every 10 seconds gets a token to fetch from the database. According to the paper, in one test this cut the peak database query rate from about 17k/s to about 1.3k/s. The paper is old, but this cure for cache stampedes is still the same today. In 2023 Discord explained that its data services combine requests for the same row that arrive at the same time into one database query (request coalescing), the same idea as in the stampede fix above.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Start at the bottom and climb one rung <strong>based on the symptom</strong>. Slow query? <strong>Index</strong>. High DB CPU, the same keys? <strong>Cache</strong>. Too many misses, or fear of the cache failing? <strong>Read replicas</strong>. Public content that is the same for everyone, or far-away users? <strong>CDN</strong>. The read itself is expensive (joins/aggregation) and different for each user? <strong>Precompute</strong> (denormalise, materialized/precomputed view). In an interview, say the ladder, then show which rung your numbers need: "200k reads/s, 90% hit → 20k misses → one DB node is not enough → 2-3 replicas."` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'p', html: `All five rungs together, inside xyz.com. Each rung's number is written under its box. Press the buttons to see one path at a time.` },
    { type: 'diagram', title: 'Scaling reads: the whole ladder inside xyz.com', height: 540,
      groups: [
        { label: 'Origin: xyz.com\'s own servers', x: 30, y: 200, w: 660, h: 120 },
        { label: 'Data', x: 30, y: 336, w: 660, h: 190 },
      ],
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'browser / app', x: 360, y: 50, kind: 'client', info: 'What it is: xyz.com\'s users. Why it is here: their millions of reads are the reason for this whole ladder. For every write there are 100-1000 reads.' },
        { id: 'cdn', label: 'CDN edge', sub: 'rung 4: public', x: 360, y: 150, w: 150, kind: 'edge', info: 'What it is: the CDN server in the user\'s city. Why it is here: public answers that are the same for everyone (thumbnails, video page) come from here in about 15 ms. 80% of requests never reach the origin. Personalised requests (Cache-Control: private) go straight through.' },
        { id: 'app', label: 'App servers', sub: 'behind the LB', x: 360, y: 260, kind: 'server', info: 'What it is: xyz.com\'s code (the origin). Stateless servers behind a Load Balancer. Why it is here: it decides where the answer comes from: Redis first, then the precomputed view, then a replica. It sends writes to the leader.' },
        { id: 'redis', label: 'Redis cache', sub: 'rung 2: ~1 ms', x: 130, y: 260, w: 150, kind: 'cache', info: 'What it is: the RAM cache. Why it is here: popular answers in about 1 ms, with cache-aside. A 90% hit rate = only 10% reach the DB. Request collapsing protects against stampedes.' },
        { id: 'views', label: 'Precomputed', sub: 'rung 5: ready feeds', x: 590, y: 260, w: 160, kind: 'data', info: 'What it is: answers built in advance (each user\'s feed, top 10, dashboard totals). Why it is here: the expensive join happens once at write time, not at read time. A read = one key lookup.' },
        { id: 'db', label: 'DB leader', sub: 'rung 1: indexes', x: 170, y: 400, w: 160, kind: 'data', info: 'What it is: the real database, the source of truth. All writes go here. Why it is here: rung 1 (the right indexes) is applied on it. Check every important query\'s index with EXPLAIN.' },
        { id: 'rep', label: 'Read replicas', sub: 'rung 3: copies', x: 395, y: 400, w: 150, kind: 'data', info: 'What it is: read-only copies of the leader. Why it is here: they share the load of cache misses, and they are a backup if the leader fails. Watch out: replication lag; the person who just wrote reads from the leader (read-your-writes).' },
        { id: 'job', label: 'View builder', sub: 'change events', x: 600, y: 400, w: 150, kind: 'queue', info: 'What it is: a background job that listens to database changes (a change stream or Kafka events). Why it is here: when a new video arrives, it updates the subscribers\' ready feeds and the top-10 tables. If it fails, the views become old, so it needs retries and monitoring.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', n: 1 },
        { a: 'cdn', b: 'app', n: 2, label: 'miss / private' },
        { a: 'app', b: 'redis', n: 3 },
        { a: 'app', b: 'views' },
        { a: 'app', b: 'rep', n: 4, label: 'miss' },
        { a: 'app', b: 'db', label: 'writes' },
        { a: 'db', b: 'rep', kind: 'evt' },
        { a: 'db', b: 'job', kind: 'evt', via: [[170, 490], [600, 490]], label: 'changes' },
        { a: 'job', b: 'views', kind: 'evt', label: 'update' },
      ],
      paths: [
        { name: 'CDN hit', text: 'A public video page: the nearby edge answers in about 15 ms. The origin does not even notice.', go: ['users>cdn', 'res:cdn>users'] },
        { name: 'Cache hit / miss', text: 'Not found on the edge: the app checks Redis first (about 1 ms). On a miss it reads from a replica and stores the answer in Redis.', go: ['users>cdn>app>redis', 'app>rep', 'res:rep>app>cdn>users'] },
        { name: 'Ready feed', text: 'The "My subscriptions" feed: no join, just one key lookup in the precomputed store.', go: ['users>cdn>app>views', 'res:views>app>cdn>users'] },
        { name: 'Write → copies', text: 'A new video is written on the leader. The replicas copy it, and the view builder updates the ready feeds.', go: ['app>db', 'evt:db>rep', 'evt:db>job>views'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>The read ladder: index → cache → read replicas → CDN → precomputed views. From cheap to expensive, in this order.</li>
      <li>Climb one rung per symptom: slow query = index; the same question again and again = cache; too many misses = replicas; public content / far users = CDN; the read itself is expensive = precompute.</li>
      <li>An index makes a query faster; it does not reduce the number of queries. Always run EXPLAIN first.</li>
      <li>DB load = reads × (1 − hit rate). At 1M/s, even a 90% hit rate means 100k misses/s.</li>
      <li>Replicas add read capacity, not write capacity. They bring replication lag (fixed with read-your-writes).</li>
      <li>A CDN should cache only public content that is the same for everyone. Personalised = private.</li>
      <li>Every copy can be old. Purging everything at once = a stampede; the cure is request collapsing + stale-while-revalidate.</li>
      <li>When you climb higher, the lower rungs stay. They all work together.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Reads scale from 10× to 1000×, mostly with cheap machines (RAM, replicas, edges)', 'Lower latency: RAM in about 1 ms, the CDN edge close to the user', 'The DB stays the source of truth, just under less pressure', 'Each rung can be measured and tuned on its own'],
      costs: ['Every copy = staleness: cache TTL, replica lag, CDN max-age, view refresh', 'Invalidation and purges are hard; a wrong purge = a stampede', 'More moving parts: Redis cluster, replicas, CDN config, view pipelines', 'The upper layers protect the lower ones so well that when they fail, the lower ones cannot survive', 'Nothing for writes; that is a separate ladder'] },

    { type: 'think', questions: [
      { q: 'The search page on xyz.com is slow. Every user types a different query. Will you add a cache?', a: 'First an index (here a search index like Elasticsearch, because LIKE \'%x%\' cannot use a B-tree index). Every query is different, so the cache hit rate will be low; cache only the most popular queries. See the Search lesson. Here the first rung of the ladder is "the right index", not Redis.' },
      { q: 'Creator dashboard: "views per day for the last 30 days". Every time the dashboard opens, it runs a GROUP BY over 3 crore view events. Which rung?', a: 'A precomputed view. A job writes daily totals into a small table every day (or every hour): (video_id, date, views). The dashboard reads only 30 rows. Data that is one hour old is fine. A cache will not help, because the very first miss is already too expensive.' },
      { q: 'The cache is at 95% hits, the DB at 30% CPU. The boss says "add replicas, traffic will grow". Is that right?', a: 'Not needed right now, but think about what happens if the cache goes down: 100% of the load hits the DB = about 20 times today\'s load (5% → 100%). If the DB cannot take that, adding one replica for availability (and for failover) is wise. The trigger to climb a rung is not only capacity, it is also surviving failures.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'EXPLAIN shows "Seq Scan on videos (rows=10,000,000)". What is the first step?', options: ['A Redis cache', 'The right index', 'A read replica'], answer: 1, explain: 'The cure for a full scan is an index. If you hide it behind a cache, every miss is still slow.' },
      { q: 'Writes are the bottleneck. Will read replicas help?', options: ['Yes, they will share the load', 'No, every replica has to apply every write', 'Only async replicas'], answer: 1, explain: 'Replication adds read capacity, not write capacity. For writes there is the batching, LSM, sharding ladder.' },
      { q: 'Which response is NOT okay to cache on a CDN?', options: ['A video thumbnail', 'A live match score JSON (TTL 2 s)', 'A user\'s personal feed'], answer: 2, explain: 'The feed is different for each user (private). If it is cached on a CDN, one person could see someone else\'s feed. For this, use a precomputed per-user feed at the origin.' },
      { q: 'After a deploy the whole CDN was purged and the DB went down. What is the best fix?', options: ['Double the size of the DB', 'Request collapsing + soft purge (stale-while-revalidate) + versioned URLs', 'Remove the CDN'], answer: 1, explain: 'A stampede = many misses at once. Collapsing sends one origin request per key, a soft purge keeps showing the old copy, and versioned URLs remove the need to purge at all.' },
      { q: 'What is the main cost of a precomputed view?', options: ['Reads become slow', 'Extra work at write time, and the data is a bit old', 'You cannot add an index'], answer: 1, explain: 'The work moves from reads to writes. The view must be updated on every change, and it can be a little behind.' },
    ]},
    { type: 'sources', note: 'The capacity numbers are napkin-maths ballparks from roadmap phase 4 (DB node ~10k reads/s, Redis ~100k ops/s, app server 1k-10k req/s), not benchmarks.', items: [
      { title: 'Scaling Memcache at Facebook (NSDI 2013)', publisher: 'USENIX / Facebook', official: true, url: 'https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala', year: 2013, used: 'Cache layer in front of DB for a read-heavy workload; leases (one token per key per 10 s) against thundering herds; reported peak DB query drop from ~17k/s to ~1.3k/s.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', year: 2023, used: 'Request coalescing in data services: concurrent requests for the same row become one DB query.' },
      { title: 'PostgreSQL docs: Materialized Views and REFRESH MATERIALIZED VIEW', publisher: 'PostgreSQL', official: true, url: 'https://www.postgresql.org/docs/current/rules-materializedviews.html', used: 'A materialized view stores a query result; it is refreshed explicitly, not automatically.' },
      { title: 'RFC 5861: HTTP Cache-Control Extensions for Stale Content', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc5861', used: 'stale-while-revalidate: serve a stale copy while revalidating in the background.' },
    ]},
  ],
});
