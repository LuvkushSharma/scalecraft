Lesson.register({
  id: 'pattern-writes',
  title: 'Scaling writes',
  minutes: 30,
  summary: `Reads can be made cheap with caches and copies. Writes cannot: every write must reach a durable place. When writes grow, the ladder is: batching → write-optimised (LSM) DB → sharding → Kafka buffer → add things up in memory before writing. For each rung: when, at what cost, and where it fails.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Reading can be made cheap by making copies. Writing cannot.<br>Every write must reach a safe, permanent place, or the data will be lost.<br>When xyz.com gets lakhs of views, likes and location updates every second, the database gets tired of writing.<br>This lesson is the ladder for writes: 5 fixes, from cheap to expensive, and the price of each one.` },
    { type: 'h2', text: 'The story so far' },
    { type: 'p', html: `In <a href="#/pattern-reads">Scaling reads</a> we handled reads with indexes, caches, replicas, a CDN and precomputed views. They all used one trick: <strong>make a copy and read from the copy</strong>.` },
    { type: 'p', html: `For writes this trick backfires. Every copy also needs the write. A cache cannot "soak up" a write. A replica repeats every write. So writes need their own ladder.` },
    { type: 'p', html: `xyz.com now has two write-heavy features. (1) The <strong>view counter</strong>: "+1 view" on every video play, and every 10 seconds "the user watched up to here" (watch progress). (2) A new <strong>live location</strong> feature: a delivery partner or driver sends their location every few seconds, like Uber. In both, writes outnumber reads. And on a day like the IPL final, there is a 10× spike.` },
    { type: 'callout', tone: 'term', title: 'Write-heavy', html: `<strong>What it is:</strong> a system where writes are equal to or more than reads: metrics, logs, location pings, clicks, views, chat messages.<br><strong>Why it matters to spot it:</strong> the read fixes (cache, replicas) do not help here. Examples from the roadmap: Uber location updates, ad click aggregation, view counters, metrics.<br><strong>Without spotting it:</strong> you keep adding replicas and the writes stay stuck.` },
    { type: 'callout', tone: 'term', title: 'Durable write and fsync', html: `<strong>What it is:</strong> <strong>durable</strong> = once the server says "OK", the data survives even a crash. For this, the database makes the data permanent on disk. <strong>fsync</strong> = telling the operating system "write this to disk now, do not keep it in your buffer (temporary memory)".<br><strong>Why we need it:</strong> without fsync, if the power goes off, even "saved" data is gone.<br><strong>Without it:</strong> users see "saved", but the data has vanished.<br><strong>Cost:</strong> fsync is slow (about 0.1-1 ms or more, even on an SSD). This is the real fixed cost of every write. Details: WAL, in the <a href="#/db-internals">DB internals</a> lesson.` },

    { type: 'h2', text: 'The ladder at a glance' },
    { type: 'steps', items: [
      { t: 'Batch writes', d: 'Batching = collecting many small writes and writing them together. Symptom: the database does a commit and an fsync for every tiny INSERT, and the CPU/disk is full. Fix: write 500 rows at once. Cost: a little delay (waiting for the batch to fill), and the risk of losing the buffer in a crash.' },
      { t: 'Write-optimised DB (LSM)', d: 'LSM DB = a database that always adds new data at the end of a file (append), instead of finding a spot in the middle. Symptom: even after batching, B-tree indexes write to random places on disk. Fix: an LSM database like Cassandra, ScyllaDB or RocksDB. Cost: reads are a bit more expensive, background cleanup (compaction), less flexible queries.' },
      { t: 'Shard by a well-spread key', d: 'Sharding = splitting the data across many machines (shards), each writing its own part. Symptom: one machine (or its set of copies) has hit its limit. Fix: split into many shards using the hash of a key. Cost: queries that span many shards, rebalancing, hot keys.' },
      { t: 'Buffer through Kafka', d: 'Kafka = a fast, durable "log" where events wait in a line, and the database reads them later at its own speed. Symptom: at spikes the DB is slow, the ingest API times out, events are lost. Fix: add to Kafka first, the DB later. Cost: data shows up late (consumer lag), one more system.' },
      { t: 'Aggregate in memory', d: 'Aggregation = adding events up in RAM and writing only the total, instead of writing each event. Symptom: every event is a DB write, and a viral video\'s counter makes one row hot. Fix: count in RAM for 5 seconds, then one write: "+1,000". Cost: the count is a bit old, and you need a plan to recount after a crash.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Why this order?', html: `Batching is just a code change. LSM is a new database, but still one cluster. With sharding, every query must know the shard. With Kafka the whole system becomes async: "OK" no longer means "it is in the DB". With aggregation the meaning of the data changes: you keep the sum, not each event. Each rung changes the <strong>meaning</strong> (semantics) more than the one before.` },

    { type: 'h2', text: 'Each rung, a bit deeper' },
    { type: 'p', html: `Each rung has the same format: the xyz.com story with numbers → the technique in plain words → when to stop → a link to the deep lesson. After that, the whole ladder in one widget and one diagram.` },
    { type: 'h3', text: 'Rung 1: batching' },
    { type: 'p', html: `<strong>Story:</strong> xyz.com's view counter was simple at first: one <code>INSERT</code> into Postgres for every play. Up to 1k events per second everything was fine. At 5k per second the database disk and CPU were full. Strange: each INSERT is tiny (about 200 bytes). Still the database got tired. Why? Because most of the work is not writing the data. It is the "commit + fsync" every single time.` },
    { type: 'callout', tone: 'term', title: 'Batching', html: `<strong>What it is:</strong> collecting many small jobs and doing them as one big job. Like sending 500 letters in one mail bag, instead of one trip for each letter.<br><strong>Why we need it:</strong> every write has a <strong>fixed cost</strong> (network round trip, transaction, commit, fsync) and a <strong>per-row cost</strong>. Batching shares the fixed cost across 500 rows.<br><strong>Without it:</strong> 500 rows = 500 commits = 500 fsyncs. The database spends most of its time "making things permanent".<br><strong>Example:</strong> this happens at every level: the client sends 10 events in one request, the server writes 500 rows in one INSERT (or <code>COPY</code>), the database puts many transactions in one fsync (in Postgres this is called group commit), and the Kafka producer sends many messages in one request.` },
    { type: 'p', html: `<strong>Batching lab.</strong> An ingest server collects events, and writes to the database when the <em>batch size</em> is reached or 50 ms have passed (whichever comes first). Model: each commit has a fixed cost of about 0.15 ms of DB time, and each row about 0.05 ms. Change "When to send OK" and compare speed with crash risk.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Incoming events/s: <strong class="bt-lv"></strong></label><input class="bt-l" type="range" min="1000" max="30000" step="1000" value="15000"></div>
        <div><label>Batch size: <strong class="bt-bv"></strong></label><input class="bt-b" type="range" min="0" max="5" step="1" value="0"></div></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="chip on bt-m1">OK after the flush</button><button type="button" class="chip bt-m2">OK at once (in RAM)</button></div>
        <div style="font-size:13px;color:var(--ink-2)">DB load meter</div>
        <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div class="bt-bar" style="height:14px"></div></div>
        <div class="stats">
          <div class="stat"><span>DB capacity</span><strong class="bt-cap"></strong></div>
          <div class="stat"><span>DB load</span><strong class="bt-u"></strong></div>
          <div class="stat"><span>Time to get "OK"</span><strong class="bt-lat"></strong></div>
          <div class="stat"><span>Risk in a crash</span><strong class="bt-risk"></strong></div>
        </div>
        <div class="calc-note bt-note"></div>`;
      const $ = c => el.querySelector(c);
      const SIZES = [1, 10, 50, 100, 500, 1000];
      let after = true;
      $('.bt-m1').onclick = () => { after = true; upd(); }; $('.bt-m2').onclick = () => { after = false; upd(); };
      const f = n => n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '';
      const upd = () => {
        const lam = +$('.bt-l').value, B = SIZES[+$('.bt-b').value];
        const eff = Math.max(1, Math.min(B, lam * 0.05));
        const cap = 1000 * eff / (0.15 + 0.05 * eff);
        const u = lam / cap;
        const wait = B === 1 ? 0 : Math.min(B / lam * 1000, 50);
        $('.bt-m1').classList.toggle('on', after); $('.bt-m2').classList.toggle('on', !after);
        $('.bt-lv').textContent = f(lam); $('.bt-bv').textContent = B + (eff < B ? ' (only ' + Math.round(eff) + ' arrive in 50 ms)' : '');
        $('.bt-cap').textContent = f(cap) + ' rows/s';
        $('.bt-u').textContent = Math.round(u * 100) + '%';
        const bar = $('.bt-bar'); bar.style.width = Math.min(100, u * 100) + '%'; bar.style.background = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
        $('.bt-lat').textContent = u > 1 ? 'timeouts' : after ? '~' + Math.round(wait + 2) + ' ms' : '~1 ms';
        $('.bt-risk').textContent = after || B === 1 ? '0 events' : 'up to ' + Math.round(eff) + ' events';
        $('.bt-note').innerHTML = (u > 1 ? `<strong>Overload: you are asking the DB for ${(u).toFixed(1)}× its capacity.</strong> ` + (B >= 500 ? 'Batching has reached its limit (~20k rows/s per machine). Now you need the next rung. ' : 'Increase the batch size. ') : '') +
          `Batch ${Math.round(eff)} rows: DB time per row = ${(0.15 / eff + 0.05).toFixed(3)} ms. Batch 1 gives ~5k rows/s, batch 500 gives ~20k rows/s: 4× faster, not 500×, because the per-row work (index updates) stays the same. ` +
          (after ? 'OK after the flush: no data is lost, the user just waits until the batch fills.' : 'OK at once: a fast answer for the user, but if the server dies before the flush, the whole batch in RAM is lost.');
      };
      $('.bt-l').addEventListener('input', upd); $('.bt-b').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Cost:</strong> (1) <strong>delay</strong>: an event waits until the batch fills; (2) <strong>crash risk</strong>: the batch was in RAM, and if the server dies, those events are gone. So send OK to the client after the flush, or keep the buffer in a durable place like Kafka. <strong>Limit:</strong> batching does not reduce the per-row work (index updates, random writes on disk).` },
    { type: 'callout', tone: 'tip', title: 'When to stop (batching)', html: `Stop when the number of commits has dropped and the DB load is under about 60% on a normal day. Climb to the next rung when, even after batching, the disk is full of random writes (per-row work), and one machine is stuck at about 20k rows/s.` },
    { type: 'h3', text: 'Rung 2: write-optimised DB (LSM)' },
    { type: 'p', html: `<strong>Story:</strong> after batching, Postgres reached about 20k rows/s. Now 40k events/s are arriving. Look at the disk graph: it is full of "random writes". The <code>views</code> table has 3 indexes. For every new row, a different page on disk must change in every index.` },
    { type: 'callout', tone: 'term', title: 'B-tree (the Postgres/MySQL way)', html: `<strong>What it is:</strong> a sorted tree that lives on disk in pages. When a new row arrives, it is <em>updated</em> into its correct sorted place, like pushing a book into its right spot on a shelf.<br><strong>Why it is good:</strong> reads and range queries are very fast.<br><strong>The problem for writes:</strong> every row = small updates at different places on disk (random writes). With many writes, the disk gets tired.` },
    { type: 'callout', tone: 'term', title: 'LSM tree (memtable, SSTable, compaction)', html: `<strong>What it is:</strong> an LSM (Log-Structured Merge) tree is a different approach. New data first goes into a sorted list in RAM (the <strong>memtable</strong>), and into an append-only log for crash safety. When the memtable is full, it is written to disk in one go as a sorted file (an <strong>SSTable</strong>). Later, small files are merged in the background (<strong>compaction</strong>). Like writing daily notes at the end of a notebook, and making a clean copy at the weekend.<br><strong>Why we need it:</strong> only sequential (in-a-line) writes on disk. These are many times cheaper than random writes.<br><strong>Without it:</strong> the random writes of a B-tree stop one machine at about 20k rows/s.<br><strong>Example:</strong> Cassandra, ScyllaDB, RocksDB and HBase are built on this. Details: <a href="#/db-internals">LSM tree</a>.` },
    { type: 'p', html: `<strong>Cost:</strong> reads have to check several files (Bloom filters help). Compaction uses CPU and disk in the background. In 2023 Discord wrote that when compaction fell behind on Cassandra, reads became more expensive and latency got worse. And databases like Cassandra give less freedom in queries: you design each table <em>for its query</em>, with no joins.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (LSM)', html: `Stop when one replica set (in Cassandra usually 3 copies, RF 3) handles the writes comfortably. Climb to the next rung when one replica set reaches its limit (napkin: about 50k writes/s), or the data grows to several TB. Bonus: Cassandra/ScyllaDB already split data across nodes by hash, so the next rung (sharding) is almost built in.` },
    { type: 'h3', text: 'Rung 3: shard by a well-spread key' },
    { type: 'p', html: `<strong>Story:</strong> xyz.com is now at 5 lakh (500k) view events/s. One replica set takes about 50k/s. That is 10 times too little. Replicas will not help here: every replica does every write.` },
    { type: 'callout', tone: 'term', title: 'Shard and shard key', html: `<strong>What it is:</strong> a <strong>shard</strong> = one part of the data, on its own machine(s). The <strong>shard key</strong> = the column that decides which shard a row goes to, usually with <code>hash(key) % shards</code> or consistent hashing.<br><strong>Why we need it:</strong> 10 shards = each shard gets 1/10 of the writes. Capacity grows roughly with the number of shards.<br><strong>Without it:</strong> the disk and CPU of one machine are the write limit of the whole site.<br><strong>Example:</strong> 500k/s ÷ 50k = 10 shards × 3 replicas = 30 nodes.` },
    { type: 'callout', tone: 'term', title: 'Hot shard and hot key', html: `<strong>What it is:</strong> when one shard (or one key) gets far more writes than the others. A <strong>hot key</strong> = very many writes on one key, like the counter of viral video 91.<br><strong>Why it happens:</strong> a bad shard key. With <code>timestamp</code> or <code>date</code>, all new writes go to one shard. With <code>country</code>, the India shard is always hot. A viral item always sits on one shard.<br><strong>If you ignore it:</strong> you have 10 shards, but one is hot and nine are idle. Capacity is not 10×, it stays 1×.` },
    { type: 'p', html: `<strong>Well-spread key</strong> is the most important phrase: a hash of <code>video_id</code> or <code>user_id</code> spreads well. <strong>Cost:</strong> queries that span many shards (scatter-gather), resharding, and celebrity keys. Full details: <a href="#/sharding">sharding</a> and <a href="#/consistent-hashing">consistent hashing</a>.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (sharding)', html: `Stop when both average and peak load fit in the shards under about 60%, and no shard is much hotter than the others. Climb to the next rung when the average is fine but at <strong>peak</strong> (IPL final, a 10× spike) there are timeouts, and keeping machines for the peak is very expensive. Or when a single key is hot, which sharding cannot split.` },
    { type: 'h3', text: 'Rung 4: buffer through Kafka' },
    { type: 'p', html: `<strong>Story:</strong> on a normal day xyz.com gets 3 lakh events/s. In the last over of the IPL final, 30 lakh/s. Sizing the database for 30 lakh = 10 times the machines, which are useful for 20 days a year. And if the database is slow at the peak, the ingest API threads get stuck, apps retry, the load grows even more, and events are lost.` },
    { type: 'callout', tone: 'term', title: 'Kafka (topic, partition, offset)', html: `<strong>What it is:</strong> Kafka is a very fast, durable <strong>log</strong>: events are added to the end of a long line, on disk and copied to several machines. A <strong>topic</strong> = a named line (like <code>views</code>). A <strong>partition</strong> = a piece of a topic, so that many machines can work together. An <strong>offset</strong> = the number of an event in the line, which a reader uses to remember how far it has read.<br><strong>Why we need it:</strong> the ingest API only appends to Kafka (a sequential write, very fast) and says "OK" at once. The database reads and writes later at its own speed. Kafka is a <strong>shock absorber</strong>: the spike piles up in the log and is emptied later.<br><strong>Without it:</strong> size the database for the peak, or lose events in a spike.<br>Details: <a href="#/kafka">Kafka</a>; this is <a href="#/queues">queue-based load levelling</a>.` },
    { type: 'callout', tone: 'term', title: 'Consumer and consumer lag', html: `<strong>What it is:</strong> a <strong>consumer</strong> = the program that reads events from Kafka and writes them to the database. <strong>Consumer lag</strong> = the gap between events written to the log and events read, like "6 minutes behind".<br><strong>Why it matters:</strong> the lag = how old the data in the database is.<br><strong>If you do not monitor it:</strong> everything looks "green", but the counter is stuck 6 minutes in the past and nobody notices.` },
    { type: 'p', html: `<strong>Cost:</strong> (1) "OK" now means "safe in Kafka", not "visible in the DB": what the user just wrote may not show up on the next read; (2) you must monitor <strong>consumer lag</strong>; (3) consumers must be idempotent (if they run twice, the effect happens once), because Kafka gives at-least-once delivery: a retry can create a duplicate; (4) one more cluster to run. <strong>Limit:</strong> Kafka <em>spreads the load over time</em>; it does not reduce it. Every event is still a DB write sooner or later.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Kafka)', html: `Stop when the database is sized only for the <strong>average</strong>, Kafka absorbs the peak, and the lag clears within a few minutes after a spike. Climb to the next rung when the data <strong>can be added up</strong> (counts, sums) and the number of DB writes itself is too high, or one row is hot.` },
    { type: 'h3', text: 'Rung 5: aggregate in memory before writing' },
    { type: 'p', html: `<strong>Story:</strong> video 91 goes viral. That one video gets about 10k views/s. Every view is a <code>count = count + 1</code>, and all on the same row. One row lives on one shard, and only one update can change that row at a time (a row lock). Sharding cannot help here. But we do not need each view separately. We only need the <strong>total</strong>.` },
    { type: 'callout', tone: 'term', title: 'In-memory aggregation and window', html: `<strong>What it is:</strong> adding events up in RAM, and after a fixed time (a <strong>window</strong>, like 5 seconds) writing only the total to the database. In the roadmap's words: "count 1,000 likes, write once".<br><strong>Why we need it:</strong> 1 write instead of 50,000. The most direct cure for a hot key.<br><strong>Without it:</strong> one viral video's counter heats up a whole shard.<br><strong>Where it does not work:</strong> chat messages, payments, orders. Each of these must be saved separately.` },
    { type: 'callout', tone: 'term', title: 'Aggregator and write-behind', html: `<strong>What it is:</strong> an <strong>aggregator</strong> = the consumer that does the adding up. In Kafka the partition key = <code>video_id</code>, so all events of one video reach the same aggregator. <strong>Write-behind</strong> (write-back) = write to a fast place first (RAM or Redis <code>INCR</code>), and to the database later, all together. This is also a form of this rung.<br><strong>Why we need it:</strong> the live counter grows right away, and the database is not burdened.<br><strong>Without it:</strong> every +1 goes straight to the database.<br><strong>Danger:</strong> a crash before the flush = the count in RAM is gone, unless you planned a replay.` },
    { type: 'p', html: `<strong>Aggregation lab.</strong> Pick the views/s on one viral video and a window. Model: one DB row can take about 1,000 updates/s (because of the row lock, updates happen one after another; this is a napkin number). Then change the crash order and compare.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Views/s on one video: <strong class="ag-rv"></strong></label><input class="ag-r" type="range" min="2" max="5" step="0.1" value="4"></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px" class="ag-w"></div>
        <div style="margin:4px 0 8px;display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="chip on ag-c1">Flush, then commit offset</button><button type="button" class="chip ag-c2">Commit offset, then flush</button></div>
        <div style="font-size:13px;color:var(--ink-2)">Load meter of row 91</div>
        <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div class="ag-bar" style="height:14px"></div></div>
        <div class="stats">
          <div class="stat"><span>Events per window</span><strong class="ag-e"></strong></div>
          <div class="stat"><span>DB writes/s (this video)</span><strong class="ag-db"></strong></div>
          <div class="stat"><span>How old the count is</span><strong class="ag-st"></strong></div>
          <div class="stat"><span>On a crash</span><strong class="ag-cr"></strong></div>
        </div>
        <div class="calc-note ag-note"></div>`;
      const $ = c => el.querySelector(c);
      const WS = [0, 1, 5, 10, 60];
      let wi = 2, safe = true;
      WS.forEach((w, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = w === 0 ? 'Write every event' : w + ' s window'; b.onclick = () => { wi = i; upd(); }; $('.ag-w').appendChild(b); });
      $('.ag-c1').onclick = () => { safe = true; upd(); }; $('.ag-c2').onclick = () => { safe = false; upd(); };
      const f = n => n >= 1e3 ? Math.round(n).toLocaleString('en-IN') : (n < 1 ? n.toFixed(2) : Math.round(n) + '');
      const upd = () => {
        const r = Math.round(Math.pow(10, +$('.ag-r').value) / 10) * 10, W = WS[wi];
        const ev = W === 0 ? 1 : r * W, db = W === 0 ? r : 1 / W, u = db / 1000;
        $('.ag-w').querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === wi));
        $('.ag-c1').classList.toggle('on', safe); $('.ag-c2').classList.toggle('on', !safe);
        $('.ag-rv').textContent = f(r);
        $('.ag-e').textContent = W === 0 ? '1 (every event)' : f(ev);
        $('.ag-db').textContent = f(db);
        $('.ag-st').textContent = W === 0 ? '~0 s' : '~' + W + ' s';
        $('.ag-cr').textContent = W === 0 ? '0 lost' : safe ? 'replay, 0 lost' : f(ev) + ' views lost';
        const bar = $('.ag-bar'); bar.style.width = Math.max(1, Math.min(100, u * 100)) + '%'; bar.style.background = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
        $('.ag-note').innerHTML = (W === 0 ? (u > 1 ? `<strong>Row ${u.toFixed(1)}× overloaded.</strong> Every view is one UPDATE, all on the same row. ` : `The row can still cope (${Math.round(u * 100)}%). `) :
          `${f(ev)} views → 1 write. Row load ${(u * 100).toFixed(u * 100 < 1 ? 3 : 0)}%. `) +
          (W === 0 ? 'Pick a window and watch the writes drop.' : safe ? 'After a crash, the aggregator reads again from the last committed offset and counts the same window again. Write the last offset together with the flush, so nothing is counted twice.' : `Wrong order: Kafka thinks these events are done. On a crash, the ${f(ev)} views in RAM are lost forever (undercount).`);
      };
      $('.ag-r').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Cost:</strong> the count is as old as the window (5 s), you need recounting after a crash (commit offsets after the flush, and an idempotent flush), and it works only for data that <strong>can be added up</strong> (counts, sums, min/max, latest value). Bigger versions of this idea are stream processors (Flink, Kafka Streams), which handle windows, late events and state checkpoints; details: <a href="#/big-data">batch vs stream processing</a>.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (aggregation)', html: `This is the top rung of the ladder. After this, just add Kafka partitions and aggregator workers; both scale horizontally. Keep the window only as big as the staleness users can accept (5-10 s is fine for views, not for billing).` },
    { type: 'h2', text: 'The escalation ladder: move the slider' },
    { type: 'p', html: `The slider = <strong>view events per second</strong> at peak (each event is about 200 bytes). The widget shows the lowest rung you need, the architecture, the latency until "OK", how old the data will look, the machines, and why the next rung is needed. Press a chip to get stuck on a lower rung and see what happens.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Peak writes (events) per second: <strong class="pw-v"></strong></label><input class="pw-s" type="range" min="2" max="7" step="0.05" value="4.6"></div>
        <div class="pw-chips" style="margin:10px 0;display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="pw-ladder" style="display:grid;gap:6px"></div>
        <svg class="pw-svg" viewBox="0 0 360 122" style="width:100%;max-width:520px;height:auto;margin-top:12px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Rung needed</span><strong class="pw-need"></strong></div>
          <div class="stat"><span>"OK" latency</span><strong class="pw-ack"></strong></div>
          <div class="stat"><span>Until visible in DB</span><strong class="pw-stale"></strong></div>
          <div class="stat"><span>Machines (approx)</span><strong class="pw-mach"></strong></div>
        </div>
        <div class="calc-note pw-note"></div>`;
      const $ = c => el.querySelector(c);
      const R = [
        { n: 'One INSERT at a time, one Postgres', cap: 5e3, ack: 5, st: 'at once', why: 'Every INSERT has its own transaction, its own fsync, and an update of every index. At ~5k/s the disk and CPU are full.' },
        { n: '+ Batching (500 rows together)', cap: 2e4, ack: 30, st: '~50 ms', why: 'The commit cost is shared across 500 rows (~20k rows/s), but the B-tree indexes are still updated at random places on disk. The limit of one node.' },
        { n: '+ LSM DB (Cassandra/ScyllaDB, 3 nodes RF 3)', cap: 5e4, ack: 30, st: '~50 ms', why: 'Sequential appends: ~50k/s per node. But every write goes to all three replicas, so 3 nodes = 50k/s. The limit of one replica set.' },
        { n: '+ Sharding (key: video_id hash)', cap: 1e6, ack: 30, st: '~50 ms', why: 'Add shards to add capacity: ~60 nodes at 1M/s. But the DB had to be sized for the <em>peak</em> (about 2/3 idle the rest of the time), and if the DB is slow, the ingest API fails directly.' },
        { n: '+ Kafka buffer (DB sized for average)', cap: 3e6, ack: 10, st: '~1 s (minutes in a spike)', why: 'Kafka absorbs the spike, and the DB is sized only for the average (peak/3). But every event is still one DB write, and all writes of a viral video land on one row (hot key).' },
        { n: '+ In-memory aggregation (5 s window)', cap: Infinity, ack: 10, st: '~5 s', why: 'For counters, ~100 events → 1 write. Now the limit is Kafka partitions and aggregator workers, and both grow horizontally. Cost: the count is ~5 s old, and you need a plan to recount after a crash.' },
      ];
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n).toString();
      const model = (w, r) => {
        const dbW = r === 5 ? w / 100 : r === 4 ? w / 3 : w;
        const db = r <= 1 ? 1 : r === 2 ? 3 : Math.max(3, Math.ceil(dbW / 5e4) * 3);
        const brokers = r >= 4 ? Math.max(3, Math.ceil(3 * w / 5e5)) : 0;
        const agg = r >= 4 ? Math.max(2, Math.ceil(w / 2e5)) : 0;
        const app = Math.max(2, Math.ceil(w / 1e4));
        return { dbW, db, brokers, agg, app, util: w / R[r].cap };
      };
      let forced = -1;
      const chips = $('.pw-chips');
      ['Auto'].concat(R.map((x, i) => 'Rung ' + i)).forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.onclick = () => { forced = i - 1; upd(); }; chips.appendChild(b);
      });
      const box = (t, x, y, w, on) => `<g opacity="${on ? 1 : 0.3}"><rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" ${on ? '' : 'stroke-dasharray="4 3"'}/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="var(--f-body)">${t}</text></g>`;
      const ln = (x1, y1, x2, y2, on) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink-3)" stroke-width="1.2" opacity="${on ? 1 : 0.2}"/>`;
      const upd = () => {
        const w = Math.round(Math.pow(10, +$('.pw-s').value));
        const need = R.findIndex(x => w <= x.cap);
        const r = forced < 0 ? need : forced;
        const m = model(w, r);
        $('.pw-v').textContent = f(w) + '/s';
        chips.querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i - 1 === forced));
        $('.pw-ladder').innerHTML = R.map((x, i) => {
          const u = w / x.cap, pct = Math.min(100, u * 100);
          const col = u > 1 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
          const tag = i < need ? 'not enough' : i === need ? 'climb up to here' : 'not needed yet';
          return `<div style="border:1px solid ${i === r ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 10px;background:${i === r ? 'var(--accent-soft)' : 'var(--surface)'};opacity:${i > need && i !== r ? 0.6 : 1}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:14px"><strong>${i}. ${x.n}</strong><span style="color:var(--ink-3);font-size:12px">max ~${x.cap === Infinity ? '∞ (add workers)' : f(x.cap) + '/s'} · ${tag}</span></div>
            <div style="height:6px;background:var(--surface-2);border-radius:3px;margin-top:4px"><div style="height:6px;width:${x.cap === Infinity ? 2 : pct}%;background:${col};border-radius:3px"></div></div></div>`;
        }).join('');
        const k = r >= 4;
        const dbTxt = r === 0 ? 'Postgres (1 node)' : r === 1 ? 'Postgres, batched inserts' : r === 2 ? 'LSM DB: 3 nodes, RF 3' : `LSM DB: ${m.db} nodes, ${m.db / 3} shards × RF 3`;
        $('.pw-svg').innerHTML = ln(85, 37, 95, 37, true) + ln(175, 37, 185, 37, k) + ln(260, 37, 270, 37, k) +
          ln(135, 54, 135, 82, !k) + ln(312, 54, 312, 82, k) +
          box('Clients', 10, 20, 75, true) + box(r >= 1 ? 'Ingest+batch' : 'Ingest', 95, 20, 80, true) + box('Kafka', 185, 20, 75, k) + box(r === 5 ? 'Aggregator' : 'Consumer', 270, 20, 85, k) +
          box(dbTxt, 60, 82, 290, true);
        $('.pw-need').textContent = need + '. ' + R[need].n.replace('+ ', '').replace(/ \(.*/, '');
        $('.pw-ack').textContent = m.util > 1 ? 'timeouts' : '~' + R[r].ack + ' ms';
        $('.pw-stale').textContent = m.util > 1 ? 'events lost' : R[r].st;
        $('.pw-mach').textContent = String(m.app + m.db + m.brokers + m.agg);
        $('.pw-note').innerHTML = (m.util > 1 ? `<strong>Stuck at rung ${r}: ${Math.round(m.util * 10) / 10}× overload.</strong> ` : '') +
          `At rung ${r}: ${f(m.dbW)} writes/s reach the DB; ${m.app} ingest servers, ${m.db} DB node${m.db > 1 ? 's' : ''}${k ? `, ${m.brokers} Kafka brokers, ${m.agg} ${r === 5 ? 'aggregators' : 'consumers'}` : ''}. Data ingress ~${w * 200 >= 1e9 ? (w * 200 / 1e9).toFixed(1) + " GB/s" : f(w * 200 / 1e6) + " MB/s"}. <strong>Why the next rung:</strong> ${R[r].why}` +
          `<br>Assumptions (roadmap phase 4): Postgres ~5k-20k simple writes/s, LSM node ~50k writes/s, replication factor 3, Kafka broker ~500k small msgs/s, ingest server ~10k events/s, peak = 3× average, aggregation 100:1 (counters only).`;
      };
      $('.pw-s').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'What to learn from the widget', html: `At the default of about 40k events/s, rung 2 (LSM, 3 nodes) is enough. Press the "Rung 1" chip: even batched Postgres is 2× overloaded. At 2M/s you need rung 4: just because of Kafka, the DB is sized for about 667k/s instead of 2M. At 10M/s you need rung 5: with aggregation the DB gets only about 100k writes/s. Notice: after Kafka and aggregation, "OK" is fast, but the data shows up <strong>later</strong>. This is the real deal of write scaling: <strong>give up freshness to gain throughput</strong>.` },
    { type: 'callout', tone: 'warn', title: 'Aggregation does not work for every kind of data', html: `View counts, likes, clicks, metrics: for these you only need the <em>sum</em>, so you can turn 1,000 events into "+1,000". Chat messages, payments, orders: each one must be saved separately. There the ladder stops at rung 4: Kafka + more shards. Location updates are in between: if you need only the <em>latest</em> location, throw away each driver's older pings (last-write-wins), and keep the history in separate cheap storage.` },

    { type: 'h2', text: 'Watch the architecture grow, rung by rung' },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Viewers', sub: 'view events', x: 75, y: 160, w: 120, kind: 'client', info: 'What it is: the apps of xyz.com viewers. Why it is here: on every video play the app sends a small event: { video_id, user_id, ts }. On the IPL final this grows 10 times.' },
        { id: 'app', label: 'Ingest API', x: 240, y: 160, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: the servers that receive events (ingest = take in). Stateless. Why it is here: from rung 1 they collect events in memory for a short time and send them in batches; from rung 4 they write only to Kafka.' },
        { id: 's1', label: 'Postgres', sub: 'views table', x: 630, y: 90, w: 140, kind: 'data', meter: true, load: 20, info: 'What it is: the database where views are stored permanently. At first one Postgres. At rung 2 an LSM-based database (Cassandra/ScyllaDB). At rung 3 it becomes shard A: one half of the video_id hash range.' },
        { id: 's2', label: 'Shard B', sub: 'hash half 2', x: 630, y: 240, w: 140, kind: 'data', hidden: true, meter: true, load: 40, info: 'What it is: the second shard (the second part of the data, on its own machines), rung 3. Why it is here: writes are split across two places. The hash of the key decides which shard a row goes to. Details: Sharding lesson.' },
        { id: 'k', label: 'Kafka', sub: 'topic: views', x: 300, y: 290, w: 120, kind: 'queue', hidden: true, info: 'What it is: Kafka, a durable append-only log (events added to the end of a line), rung 4. Why it is here: the ingest API appends the event here and says OK at once, and the spike piles up here. Partition key = video_id, so one video\'s events stay in order in one partition.' },
        { id: 'agg', label: 'Aggregator', sub: 'RAM counts', x: 470, y: 290, w: 140, kind: 'server', hidden: true, meter: true, load: 30, info: 'What it is: the program that reads from Kafka. At rung 4 a simple consumer (one write per event). At rung 5 an aggregator: it adds up each video\'s count in RAM for 5 s, then does one write. It commits offsets AFTER the flush.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 's1', id: 'a1' }, { a: 'app', b: 's2', id: 'a2' }, { a: 'app', b: 'k' }, { a: 'k', b: 'agg' }, { a: 'agg', b: 's1' }, { a: 'agg', b: 's2' }],
      scenarios: [
        { name: 'Rung 0-3: batch, LSM, shard', steps: [
          { title: 'Rung 0: one INSERT at a time', text: 'For every event: one INSERT, one transaction, one fsync, and an update of the three indexes of the <code>views</code> table. Up to 1k/s everything is fine.', go: ['c>app>s1', 'res:s1>app>c'], msg: 'INSERT INTO views (video_id, user_id, ts) VALUES (91, 7, now());  -- ×1, COMMIT, fsync' },
          { title: 'Past 5k/s: the disk is full', text: 'Symptom: the database disk I/O and CPU are full and commit latency goes up, even though each INSERT is simple. Most of the work is "commit + fsync", not the data.', flood: { paths: ['c>app>s1'], n: 12 }, after: { s1: { state: 'hot', load: 97, sub: 'fsync per row' } } },
          { title: 'Rung 1: batching', text: 'The ingest API collects 50 ms or 500 events (whichever comes first), then does one multi-row INSERT (or <code>COPY</code>). One commit, one fsync, 500 rows. Cost: an event reaches the DB about 50 ms later, and a server crash before the flush = the buffer is lost (so send OK to the client after the flush, or go up to rung 4).', go: 'app>s1', set: { app: { sub: 'buffer 500 / 50 ms' } }, after: { s1: { state: 'ok', load: 35, sub: 'batched' } }, msg: 'INSERT INTO views VALUES (91,7,..), (91,8,..), ... ×500;  -- 1 COMMIT' },
          { title: 'Rung 2: LSM DB', text: 'Postgres\'s B-tree indexes touch random places on disk for every row. An LSM database first writes to RAM (memtable) + a sequential log, and later merges sorted files in the background (compaction). Writes are cheap, reads a bit expensive. Details: <a href="#/db-internals">LSM tree</a>.', go: 'app>s1', set: { s1: { label: 'Cassandra A', sub: 'memtable + log', state: 'ok', load: 30 } } },
          { title: 'Rung 3: shard', text: 'One replica set takes about 50k/s. Beyond that: split the data into shards with <code>hash(video_id)</code>. Choose a key that spreads well; with a key like <code>date</code>, all of today\'s writes would go to one shard. Details: <a href="#/sharding">sharding</a>.', show: ['s2'], set: { s2: { label: 'Cassandra B' } }, parallel: true, go: ['c>app>s1', 'c>app>s2'], after: { s1: { load: 45 }, s2: { load: 45 } } },
        ]},
        { name: 'Rung 4-5: Kafka, aggregation', intro: 'There are two shards. Now the IPL final: a 10× spike.', steps: [
          { title: 'Spike: DB slow, API timeouts', text: 'The database was not sized for the peak. Writes are slow, the ingest API threads are stuck, timeouts. Phone apps retry, and the load grows. Events are lost.', show: ['s2'], set: { s1: { label: 'Cassandra A' }, s2: { label: 'Cassandra B' } }, flood: { paths: ['c>app>s1', 'c>app>s2'], n: 16 }, after: { s1: { state: 'hot', load: 99 }, s2: { state: 'hot', load: 99 }, app: { state: 'warn', load: 95, sub: 'timeouts' } } },
          { title: 'Rung 4: Kafka in the middle', text: 'The ingest API now only appends to Kafka (a sequential disk write, replicated) and says OK at once. Nobody touches the database directly. The spike piles up in Kafka\'s log. Details: <a href="#/kafka">Kafka</a>.', show: ['k'], hide: ['a1', 'a2'], go: ['c>app>k', 'res:app>c'], after: { app: { state: 'ok', load: 30, sub: '' }, k: { sub: 'lag: 2 min' } }, msg: 'produce views  key=91  {"video":91,"user":7}  acks=all' },
          { title: 'The consumer at its own speed', text: 'The consumer reads from Kafka and writes to the database at <em>the database\'s</em> speed. When the spike ends, the lag clears by itself. The database is now sized for the average, not the peak.', show: ['agg'], set: { agg: { label: 'Consumer', sub: '1 event = 1 write' } }, go: ['k>agg', 'agg>s1', 'agg>s2'], after: { s1: { state: 'ok', load: 60 }, s2: { state: 'ok', load: 60 } } },
          { title: 'Hot key: a viral video', text: 'Video 91 goes viral. All its events go to one partition, and to one row: <code>count = count + 1</code>, thousands of times per second. One row = one shard = one hot spot.', go: ['k>agg>s1', 'k>agg>s1'], after: { s1: { state: 'hot', load: 95, sub: 'row 91 hot' } } },
          { title: 'Rung 5: add up in memory', text: 'The aggregator counts in RAM for 5 seconds: <code>{91: 48,210, 77: 312, ...}</code>. Then <em>one</em> write per video. 48,210 writes → 1. Roadmap: "count 1,000 likes, write once". Kafka offsets are committed after the flush.', set: { agg: { label: 'Aggregator', sub: 'v91: +48,210' } }, go: ['k>agg', 'agg>s1'], after: { s1: { state: 'ok', load: 15, sub: '1 write / 5 s / video' } }, msg: 'UPDATE video_views SET count = count + 48210 WHERE video_id = 91;' },
        ]},
        { name: 'Failure: consumer lag', intro: 'You are on the top rung. The last over of the match: 20 times more events.', steps: [
          { title: 'Kafka handles it all...', text: 'The ingest API is happy and Kafka keeps appending. No event is lost.', show: ['s2', 'k', 'agg'], hide: ['a1', 'a2'], set: { agg: { label: 'Aggregator', sub: 'RAM counts' }, s1: { label: 'Cassandra A', sub: '' }, s2: { label: 'Cassandra B' } }, flood: { paths: ['c>app>k'], n: 14 }, after: { k: { state: 'warn', sub: 'lag: 6 min' } } },
          { title: '...but the aggregator falls behind', text: 'The aggregators\' CPU is full; they cannot read as fast as events arrive. <strong>Consumer lag</strong> = the gap between what was written to the log and what was read. 6 minutes of lag = the database count is 6 minutes old.', go: 'k>agg', after: { agg: { state: 'hot', load: 99, sub: 'CPU 100%' } } },
          { title: 'The user sees a stuck counter', text: 'The video page is stuck at "1.2M views" while everyone is watching. No data is lost, it is just late. But if something else is decided from this count (the trending list, ads billing), that is also 6 minutes old.', show: ['a1'], go: ['c>app>s1', 'res:s1>app>c'], after: { s1: { state: 'warn', sub: 'count: 6 min old' } } },
          { title: 'Fix', text: 'Alert on lag (not only on CPU). Add aggregators, but in one consumer group, more consumers than partitions do not help, so keep enough partitions before known events. Make the window bigger (10 s) so there are even fewer DB writes. An approximate count like "~1.2M" is fine in the UI.', hide: ['a1'], go: ['k>agg', 'agg>s1', 'agg>s2'], after: { k: { state: 'ok', sub: 'lag: 3 s' }, agg: { state: 'ok', load: 60, sub: '8 workers' }, s1: { state: 'ok', sub: 'fresh' } } },
        ]},
        { name: 'Failure: aggregator crash', intro: 'The aggregator holds 4 seconds of counts in RAM that have not been flushed yet.', steps: [
          { title: 'Crash', text: 'The process died. The counts in RAM are gone.', show: ['s2', 'k', 'agg'], hide: ['a1', 'a2'], set: { s1: { label: 'Cassandra A', sub: '' }, s2: { label: 'Cassandra B' }, agg: { label: 'Aggregator', state: 'down', sub: 'DOWN: RAM lost', load: 0 } }, go: 'lost:k>agg' },
          { title: 'If offsets were committed first', text: 'The wrong way: commit the offset as soon as the event is read. Kafka thinks these events are done. After the restart they will not come again: 4 seconds of views are lost forever (undercount).', focus: ['k'], set: { k: { state: 'warn', sub: 'offset ahead: lost' } } },
          { title: 'The right way: commit after the flush', text: 'Commit offsets only after the flush to the database. After the restart, the aggregator reads again from the last committed offset and counts the same 4 seconds again. Kafka\'s retention makes this replay possible.', set: { agg: { state: 'ok', sub: 'replay from offset', load: 40 }, k: { state: 'ok', sub: 'replay' } }, go: ['k>agg', 'agg>s1'] },
          { title: 'The risk of double counting', text: 'If the flush happened and the crash came before the commit, the replay adds the same count again (overcount). The fix: write the "last applied offset" into the database together with the flush (in one write), and on replay skip offsets that were already applied. This is an idempotent write. For counters like views, a small overcount is often fine; for billing it is not.', go: 'agg>s1', after: { s1: { sub: 'count + last_offset' } }, msg: 'UPDATE video_views SET count = count + 48210, last_offset = 99812\nWHERE video_id = 91 AND last_offset < 99812;' },
        ]},
      ],
    },
    { type: 'table', head: ['Rung', 'Symptom that forces it', 'What grows', 'Cost', 'Where it fails'], rows: [
      ['Batching', 'Very small transactions, bound by commit/fsync', 'Rows per second per node', 'A little delay, risk of losing the buffer in a crash', 'Per-row index work, one node'],
      ['LSM DB', 'B-tree random writes, disk IOPS full', 'Writes per node (sequential)', 'Expensive reads, compaction, query limits', 'One replica set'],
      ['Sharding', 'Limit of one node/replica set, data in TBs', 'Total write capacity (roughly linear)', 'Cross-shard queries, resharding', 'Hot keys; sizing for peak'],
      ['Kafka buffer', 'Timeouts in spikes, events lost', 'Absorbs the peak; DB sized for average', 'Async, consumer lag, one more cluster', 'Every event is still one write'],
      ['Aggregation', 'Counters, thousands of writes on one row', 'Up to 100× fewer writes', 'Staleness, recount logic', 'Only data that can be added up'],
    ], caption: 'Roadmap: "Batch writes → write-optimised DB (LSM) → shard by a well-spread key → buffer through Kafka → aggregate in memory before writing."' },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>1. "Writes are slow, add read replicas."</strong> Replicas repeat every write. Write capacity stays the same, and the cost goes up.<br><strong>2. "Just write to a Redis cache and you are done."</strong> Redis is RAM. Without persistence, a restart = data gone. Doing <code>INCR</code> in Redis and flushing to the DB later is a form of rung 5, and the same crash rules apply.<br><strong>3. "We added Kafka, so the DB load went down."</strong> Kafka <em>spreads the load over time</em>; it does not reduce it. The DB still has to carry the average load. To reduce it, use batching or aggregation.<br><strong>4. "Sharding fixes everything."</strong> All writes of a viral video are on one key, and one key is always on one shard. The cure for a hot key is aggregation or key splitting (<code>video91#0..#9</code>).` },

    { type: 'h2', text: 'In the real world' },
    { type: 'p', html: `In a March 2023 post, Discord explained that its trillions of messages were on Cassandra (177 nodes), which is LSM-based, and that hot partitions (one very busy channel) hurt the latency of the whole cluster. They moved to ScyllaDB (the same LSM model, written in C++) and came down to 72 nodes, together with Rust "data services" that combine requests for the same data arriving at the same time into one query. Kafka itself was built at LinkedIn to handle the big write stream of activity events (page views, clicks): <a href="#/kafka">Kafka lesson</a>. In ad-click and metrics systems, window-based aggregation (a count per minute) is the standard industry approach.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `First ask: <strong>do you need every event separately, or only its sum/latest value?</strong> Then climb from the bottom. Many tiny commits? <strong>Batch</strong>. One node's disk full of random writes? <strong>LSM DB</strong>. One replica set not enough, or data in TBs? <strong>Shard</strong> with a well-spread key. Timeouts during spikes? <strong>Kafka buffer</strong>, with the DB sized for the average. Counters/metrics, or thousands of writes on one key? <strong>Aggregate in memory</strong> and then write. At each rung, say how much freshness you gave up: that is what the interviewer wants to hear.` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'p', html: `All five rungs together, in xyz.com's view counter. The upper part runs until the user gets "OK" (fast). Everything in the lower part happens later, at its own speed. Press the buttons to see one path at a time.` },
    { type: 'diagram', title: 'Scaling writes: the whole ladder inside xyz.com', height: 480,
      groups: [
        { label: 'Sync: until the user gets OK', x: 20, y: 30, w: 680, h: 120 },
        { label: 'Async: at its own speed', x: 20, y: 172, w: 680, h: 292 },
      ],
      nodes: [
        { id: 'cl', label: 'Viewer apps', sub: 'client batching', x: 95, y: 90, kind: 'client', info: 'What it is: the xyz.com apps that send a view event on every play. Why it is here: the app itself can send 10 events in one request (client batching), so there are fewer network round trips.' },
        { id: 'ing', label: 'Ingest API', sub: 'rung 1: batch', x: 280, y: 90, kind: 'server', info: 'What it is: the stateless servers that receive events. Why it is here: they collect events for up to 50 ms / 500 rows and send them together (rung 1), and after rung 4 they only append to Kafka and say OK at once.' },
        { id: 'kf', label: 'Kafka', sub: 'rung 4: topic views', x: 530, y: 90, w: 150, kind: 'queue', info: 'What it is: a durable, append-only log. Why it is here: the shock absorber for spikes. Partition key = video_id, so one video\'s events reach one aggregator. An alert on consumer lag is a must.' },
        { id: 'arc', label: 'Archiver', sub: 'raw → files', x: 230, y: 240, kind: 'server', info: 'What it is: a second consumer group that writes every raw event into files in big batches. Why it is here: analytics and history need every event, but not in the DB; in cheap storage.' },
        { id: 'agg', label: 'Aggregator', sub: 'rung 5: 5 s window', x: 470, y: 240, w: 150, kind: 'server', info: 'What it is: the consumer that adds up each video\'s count in RAM for 5 seconds, then does one write. Why it is here: 50,000 writes → 1, the cure for hot keys. It commits the offset only after the flush, and writes the last offset to the DB.' },
        { id: 'pg', label: 'Video page', sub: 'reads count', x: 640, y: 240, w: 120, kind: 'client', info: 'What it is: the read path of the video page. Why it is here: it shows how fresh the count is: as old as the window (5 s) + the consumer lag. That is why the UI shows an approximate count like "~1.2M".' },
        { id: 's3', label: 'Object storage', sub: 'raw history', x: 230, y: 390, w: 150, kind: 'data', info: 'What it is: cheap file storage like S3. Why it is here: the history of every raw event (billing audit, analytics) in big files. Details: object storage lesson.' },
        { id: 'sa', label: 'Cassandra A', sub: 'rung 2+3: LSM', x: 430, y: 390, w: 150, kind: 'data', info: 'What it is: one shard of the LSM database (rungs 2 + 3). Why it is here: sequential writes are cheap, and hash(video_id) spreads data across shards. Each shard has 3 copies (RF 3).' },
        { id: 'sb', label: 'Cassandra B', sub: 'second shard', x: 620, y: 390, w: 150, kind: 'data', info: 'What it is: the second shard. Why it is here: write capacity grows with the number of shards. With a well-spread key (hash of video_id), no single shard gets hot.' },
      ],
      edges: [
        { a: 'cl', b: 'ing', n: 1 },
        { a: 'ing', b: 'kf', n: 2, label: 'append' },
        { a: 'kf', b: 'agg', n: 3 },
        { a: 'agg', b: 'sa', n: 4, label: '+50,000' },
        { a: 'agg', b: 'sb' },
        { a: 'kf', b: 'arc', kind: 'evt' },
        { a: 'arc', b: 's3', label: 'batch files' },
        { a: 'pg', b: 'sb', kind: 'res', label: 'read' },
      ],
      paths: [
        { name: 'View → OK', text: 'The app sent an event, the ingest API appended it to Kafka and said OK in about 10 ms. Nobody has touched the DB yet.', go: ['cl>ing>kf', 'res:ing>cl'] },
        { name: 'Count update', text: 'The aggregator added up 5 seconds of views in RAM, then did one write on each video\'s shard.', go: ['kf>agg>sa', 'agg>sb'] },
        { name: 'Raw history', text: 'A second consumer writes every raw event into cheap storage in big batches.', go: ['kf>arc>s3'] },
        { name: 'Read count', text: 'The video page reads the count from the shard. It can be as old as the window + the lag.', go: ['pg>sb', 'res:sb>pg'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Writes cannot be made cheap with copies: every copy also needs the write. So they have their own ladder.</li>
      <li>The ladder: batching → LSM DB → sharding (a well-spread key) → Kafka buffer → aggregation in memory.</li>
      <li>Batching shares the fixed cost of each write (commit, fsync); it does not cut per-row work.</li>
      <li>LSM appends sequentially: cheap writes, but a cost in reads and compaction.</li>
      <li>The shard key must spread well (a hash of an id), not time or country. Sharding cannot split one hot key.</li>
      <li>Kafka spreads load over time; it does not reduce it. "OK" = safe in Kafka. Monitor consumer lag.</li>
      <li>Aggregation works only for data that can be added up (counts, sums, latest). Commit offsets after the flush.</li>
      <li>At every rung you give up freshness to gain throughput. Say this trade-off in the interview.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Write throughput up to 1,000× (batching, LSM, shards, aggregation)', 'The API stays fast and events stay safe even during spikes (Kafka)', 'A cure for hot keys (aggregation, key splitting)', 'The DB is sized for the average load, not the peak: cheaper'],
      costs: ['Freshness: data shows up milliseconds to seconds/minutes later', 'The meaning of "OK" changes: safe in Kafka, not in the DB', 'Duplicates and crash recovery: idempotent consumers, offset discipline', 'LSM and sharding reduce query freedom (joins, ad-hoc queries)', 'More systems: Kafka, aggregators, lag monitoring'] },

    { type: 'think', questions: [
      { q: 'xyz.com chat: 2 lakh messages/s at peak. Can you use aggregation?', a: 'No. Every message must be stored separately; "+1,000 messages" means nothing. The ladder: client/server batching, an LSM DB (Cassandra/ScyllaDB, like Discord), shard by channel_id (or channel + time bucket so one big channel does not swell one partition), and a Kafka buffer if there are spikes. That is it.' },
      { q: 'The driver app sends its location every 4 seconds, with 10 lakh drivers online. How many writes/s, and where will you write them?', a: '10 lakh / 4 = 2.5 lakh writes/s. But matching needs only the latest location: overwrite it in an in-memory store (Redis GEO or a sharded in-memory service), not every ping in the DB. The history (the trip route) goes from Kafka in batches to cheap storage (S3/Cassandra). This is the "latest value only" kind of aggregation.' },
      { q: 'An aggregator commits offsets first, then flushes to the DB. What can go wrong?', a: 'A crash after the commit and before the flush = in Kafka\'s eyes those events are done, so they will not come again after the restart: undercount, data lost. The right order: flush, then commit. And write the last offset with the flush, so a crash before the commit does not double count on replay.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Which cost does batching reduce?', options: ['Per-row index updates', 'The fixed cost of each write: round trip, commit, fsync', 'The size of the disk'], answer: 1, explain: 'The fixed cost is shared across 500 rows. The per-row work stays the same, which is why the next rung is LSM.' },
      { q: 'Why is an LSM tree fast for writes?', options: ['It compresses data', 'It writes to RAM + an append-only log, and writes sorted files to disk later in one go', 'It keeps no indexes'], answer: 1, explain: 'Sequential writes instead of random in-place updates. The cost moves to reads and compaction.' },
      { q: 'After adding a Kafka buffer, the DB\'s average load...', options: ['Goes down', 'Stays the same, it is just spread over time', 'Becomes zero'], answer: 1, explain: 'Kafka smooths the peak. To reduce the load, use batching or aggregation.' },
      { q: 'What is the worst shard key choice for a write-heavy events table?', options: ['hash(user_id)', 'hash(video_id)', 'created_at (time)'], answer: 2, explain: 'All new writes have the time "now", so one shard gets hot. Hashed keys spread the writes.' },
      { q: 'A viral video gets 1 lakh likes/s, all on one row. What is the most direct fix?', options: ['More shards', 'Add up in memory and write once every few seconds (or split the counter into sub-keys)', 'Read replicas'], answer: 1, explain: 'One key is always on one shard. You have to reduce the number of writes: aggregation or key splitting.' },
    ]},
    { type: 'sources', note: 'The capacity numbers are napkin-maths ballparks from roadmap phase 4 (Postgres ~5k-20k writes/s, Cassandra node ~10k-50k writes/s, Kafka 100s of MB/s per broker), not benchmarks.', items: [
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord engineering blog', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', year: 2023, used: '177 Cassandra nodes → 72 ScyllaDB nodes, hot partitions hurting cluster latency, LSM compaction overhead, request coalescing in Rust data services.' },
      { title: 'PostgreSQL docs: Populating a Database (COPY, batching inserts)', publisher: 'PostgreSQL', official: true, url: 'https://www.postgresql.org/docs/current/populate.html', used: 'Many inserts in one transaction / COPY are much faster than single-row commits.' },
      { title: 'Apache Kafka documentation: consumer offsets and delivery semantics', publisher: 'Apache Kafka', official: true, url: 'https://kafka.apache.org/documentation/#semantics', used: 'Committing offsets before vs after processing gives at-most-once vs at-least-once; replay from committed offset.' },
    ]},
  ],
});
