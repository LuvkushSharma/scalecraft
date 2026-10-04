Lesson.register({
  id: 'design-topk',
  title: 'Top-K and leaderboards',
  minutes: 38,
  summary: `"Top 10 videos of the last hour", "trending hashtags", a live fantasy cricket leaderboard, and an advertiser's bill: they are all the same question, find "who has the most" among billions of events, quickly. Kafka → Flink windows → count-min sketch + heap → serving store, Redis sorted sets for leaderboards, and exact accounting with batch jobs wherever money is involved (Lambda).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine your school's annual sports day, where after every race the scoreboard must show the names of the 10 children who are ahead.<br>With 10 children, you can count on paper. But what if there are 10 crore people, thousands of new points arrive every second, and the scoreboard must change every minute?<br>Keeping everyone's score on one sheet of paper becomes impossible.<br>This lesson shows how to quickly find "who has the most" (top 10 videos, trending hashtags, a live leaderboard) at this huge scale, where a small error is fine, and where (like in a money bill) it is not fine at all.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think for 10 minutes: thousands of people are watching videos on xyz.com every second. The homepage needs "Trending now": the 10 most watched videos of the last 1 hour, updated every minute. Do <code>count++</code> in the DB for every view? Run <code>GROUP BY ... ORDER BY ... LIMIT 10</code> every minute? What will break? Then compare with this lesson.` },

    { type: 'p', html: `This problem shows up in many places: trending videos on a site like YouTube, trending hashtags on X (Twitter), live leaderboards in fantasy apps like Dream11, and "how many clicks did this ad get" in ad networks (the advertiser's bill is based on it). They all share the same core: <strong>lots of events, lots of different things, and we only want the few at the top, quickly</strong>.` },
    { type: 'callout', tone: 'term', title: 'New words: top-K, heavy hitters, event, stream', html: `<strong>Top-K</strong><br><strong>What it is:</strong> the K things with the highest counts. K = 10 means the top 10.<br><strong>Why we need it:</strong> "Trending" on the homepage, "Top 100" on a leaderboard: the user does not want the full list, only the ones at the top.<br><strong>Without it:</strong> you would have to build a full sorted list of crores of items, which is useless and expensive.<br><br><strong>Heavy hitters</strong><br><strong>What it is:</strong> items that take a large share of the stream by themselves (like one viral video getting 5% of all views).<br><strong>Why it matters:</strong> top-K and heavy hitters are almost two forms of the same question: "who has the most?" And the thing that is very popular is also the thing that puts the most load on the system.<br><br><strong>Event / stream</strong>: an <strong>event</strong> = a small piece of news that something happened ("Riya watched video v9 at 12:04"). A <strong>stream</strong> = a never-ending line of events that keeps arriving.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Trending: top K videos/hashtags of the last 1 hour, updated about every 1 minute<br>• Filters: country, category (trending in India, trending in music)<br>• Leaderboard: top 100, "what is my rank", show ranks 500-520<br>• Ad clicks: clicks per ad, bill the advertiser` },
      right: { title: 'Non-functional', html: `• Billions of events per day, many times more at peak<br>• Trending: a little approximation is fine, but it must be fresh (seconds to minutes)<br>• Billing: must be <strong>exact</strong>, delay is fine (hours)<br>• Leaderboard: rank is right immediately after every update<br>• One viral item must not bring the system down (hot key)` },
    },
    { type: 'callout', tone: 'why', title: 'The real difficulty of this system', html: `Three different levels of "correct" in one system: trending needs <strong>fast + approximate</strong>, the leaderboard needs <strong>fast + exact</strong> (but on small data), and billing needs <strong>slow + perfectly exact</strong>. No single tool does all three, so the design will have three paths.` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `The most direct way: every item gets its own counter, in one big <strong>hash map</strong> <code>{video: count}</code>. This is <strong>exact counting</strong>. Problem: the memory grows with the number of different items. If 1 crore different videos were watched in an hour, that is 1 crore counters. There is a cheap trick that fixes the memory size in exchange for a small error:` },
    { type: 'callout', tone: 'term', title: 'New word: count-min sketch (first look)', html: `<strong>What it is:</strong> a small table of counters: a few rows (d), and a few columns (w) in each row. Each row has its own <strong>hash function</strong> (a formula that turns a name into a column number; the same name always gives the same number). When an event arrives: in every row, add +1 to that item's column counter. When you ask for a count: take the <strong>smallest</strong> of those d counters (that is why it is called "min").<br><strong>Why we need it:</strong> the table has a fixed size, whether there are 1 lakh different items or 50 crore.<br><strong>Without it:</strong> a separate counter for every item, which means GBs of memory, and a separate one for every filter (country, category).<br><strong>Cost:</strong> two items can share a cell (a collision), so the count is sometimes <em>higher</em> than the real one, never lower. You will run it step by step yourself in the Deep dive below.` },
    { type: 'p', html: `Now two questions: how many events per second, and how much memory for an exact map vs a sketch? Change the values (ε = how much error is acceptable, as a share of N):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Events per day (crore): <strong class="tn-ev"></strong></label><input class="tn-e" type="range" min="10" max="1000" step="10" value="100"></div>
          <div><label>Different items in one hour (lakh): <strong class="tn-dv"></strong></label><input class="tn-d" type="range" min="1" max="500" step="1" value="100"></div>
        </div>
        <div class="chips tn-eps" role="group" aria-label="Error">
          <button type="button" class="chip" data-e="0.01">error ≤ 1% of N</button>
          <button type="button" class="chip on" data-e="0.001">≤ 0.1%</button>
          <button type="button" class="chip" data-e="0.0001">≤ 0.01%</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Events/s (avg)</span><strong class="tn-a"></strong></div>
          <div class="stat"><span>Events/s (peak, suppose ×5)</span><strong class="tn-p"></strong></div>
          <div class="stat"><span>Exact map, 1 hour (~64 B/item)</span><strong class="tn-x"></strong></div>
          <div class="stat"><span>Count-min sketch (99% confidence)</span><strong class="tn-c"></strong></div>
        </div>
        <div class="calc-note tn-note"></div>`;
      const q = s => el.querySelector(s);
      let eps = 0.001;
      const fmtB = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
      const fmtN = n => n >= 1e7 ? (n / 1e7).toFixed(2) + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const E = +q('.tn-e').value * 1e7, D = +q('.tn-d').value * 1e5;
        q('.tn-ev').textContent = q('.tn-e').value; q('.tn-dv').textContent = q('.tn-d').value;
        const avg = E / 86400, hourN = E / 24;
        const w = Math.ceil(Math.E / eps), d = Math.ceil(Math.log(1 / 0.01));
        q('.tn-a').textContent = fmtN(avg) + '/s'; q('.tn-p').textContent = fmtN(avg * 5) + '/s';
        q('.tn-x').textContent = fmtB(D * 64);
        q('.tn-c').textContent = fmtB(w * d * 4);
        q('.tn-note').textContent = `Sketch: w = ⌈e/ε⌉ = ${w.toLocaleString('en-IN')} columns, d = ⌈ln(1/0.01)⌉ = ${d} rows, 4-byte counters. In one hour N ≈ ${fmtN(hourN)} events, so any item's estimate is at most ~${fmtN(eps * hourN)} above the real count (99% of the time). The sketch's memory does not depend on the number of different items at all; the exact map's memory does. And this is for only one window and one filter (country × category): every combination needs its own.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      el.querySelectorAll('.tn-eps .chip').forEach(b => b.addEventListener('click', () => { eps = +b.dataset.e; el.querySelectorAll('.tn-eps .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      upd();
    }},
    { type: 'p', html: `With the defaults (100 crore events/day): an average of ~11.6 thousand events/s, and an exact map of 1 crore different items for one hour is ~640 MB. One map would fit on one machine, but 50 countries × 20 categories × several windows = a thousand maps, and every event updates all of them. The sketch is ~54 KB, whether there are 1 lakh items or 50 crore. You will run the count-min sketch's insides yourself in Deep dive 1 below (it is also in the <a href="#/ds-for-scale">data structures for scale</a> lesson).` },

    { type: 'h2', text: 'Step 3: why the direct ways break' },
    { type: 'table', head: ['Way', 'How', 'Where it breaks'], rows: [
      ['DB counter', '<code>UPDATE videos SET views = views + 1</code> on every view', 'Thousands of writes/s on one row of a viral video: row lock, hot row (<a href="#/pattern-contention">contention lesson</a>). And it does not know "the last 1 hour", only all-time.'],
      ['GROUP BY every minute', '<code>GROUP BY video ORDER BY count DESC LIMIT 10</code> on the raw events table', 'Every minute, scan crores of rows from the last hour. Analytics on the production DB = everything gets slow (<a href="#/big-data">big data lesson</a>).'],
      ['A hash map on one server', '<code>{video: count}</code> in memory', 'One machine\'s memory and CPU, a single SPOF, and removing old events from the window is hard.'],
    ]},
    { type: 'p', html: `The common cure for all three: process events as a <strong>stream</strong>, <strong>split them by key</strong> so many machines count together, count inside <strong>time windows</strong>, and keep only the <strong>small result</strong> (top-K) in a serving store.` },

    { type: 'h2', text: 'Step 4: high-level design, the trending pipeline' },
    { type: 'p', html: `This design is a common industry pattern (like the roadmap's "Kafka → Flink → OLAP"). Before the diagram, here is each part in plain words:` },
    { type: 'callout', tone: 'term', title: 'Reminder: Kafka, topic, partition', html: `<strong>What it is:</strong> <a href="#/kafka">Kafka</a> is a long, durable list (log) where events are written, and many programs read them at their own speed. A <strong>topic</strong> = a list of one kind of event ("views"). A topic is split into many <strong>partitions</strong> (pieces), so many machines can read it together. An event's <strong>key</strong> (here, videoId) decides which partition it goes to: the same key → always the same partition.<br><strong>Why we need it:</strong> to keep the flood of views durable in one place, so that if the counting machines stop, no events are lost, and they can be read again later (replay).<br><strong>Without it:</strong> the ingest server would send directly to the counter; if the counter were slow or down, the events would be gone.` },
    { type: 'callout', tone: 'term', title: 'New word: stream processor (Flink)', html: `<strong>What it is:</strong> a program that processes events continuously, as soon as they arrive (here: counting). Apache Flink is a popular stream processor. It runs on many machines (workers); each worker reads some partitions and keeps its counts (its <strong>state</strong>) in memory.<br><strong>Why we need it:</strong> for "top 10 every minute", the counting must happen as the events come in, not hours later.<br><strong>Without it:</strong> a GROUP BY over crores of raw rows every minute, which we saw breaking in the table above.` },
    { type: 'callout', tone: 'term', title: 'New words: window, pane, checkpoint', html: `<strong>Window</strong>: <strong>What it is:</strong> a slice of time whose events are counted together, like "12:00 to 12:59". <strong>Why:</strong> trending means "now", not all-time. <strong>Without it:</strong> a video that went viral 3 years ago would be #1 forever.<br><strong>Pane</strong>: a small counter box for one minute. A big window = the sum of many panes (details in Deep dive 2).<br><strong>Checkpoint</strong>: <strong>What it is:</strong> every few seconds, Flink saves a copy of all its counts (state) and "how far it has read in Kafka" (the offset) to durable storage. <strong>Why:</strong> if a worker crashes, it starts again from there. <strong>Without it:</strong> a crash = all counts start from zero, or events get counted twice.` },
    { type: 'callout', tone: 'term', title: 'New words: serving store, OLAP', html: `<strong>Serving store</strong>: <strong>What it is:</strong> a fast database that holds only the <em>small final result</em> ("India's top 10 at 12:05"), like Redis. <strong>Why:</strong> the homepage needs an answer in 1 millisecond, and crores of users read the same list. <strong>Without it:</strong> counting again on every page load.<br><strong>OLAP store</strong>: <strong>What it is:</strong> a database built for analytics (ClickHouse, Druid, Pinot) that stores data column by column and runs GROUP BY over billions of rows in seconds (<a href="#/big-data">OLTP vs OLAP</a>). <strong>Why:</strong> new questions like "Mumbai, Android, last 6 hours", for which no list was prepared in advance. <strong>Without it:</strong> a new pipeline for every new filter.` },
    { type: 'p', html: `Now the full pipeline. Click each box to read what it does, then run the scenarios:` },
    { type: 'flow', title: 'Trending videos pipeline', height: 350,
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'app / web', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: xyz.com\'s users (app and web). Every view (or like, share, hashtag use) creates a small event: { videoId, userId, country, time }.' },
        { id: 'ingest', label: 'Ingest API', sub: 'view events', x: 240, y: 170, w: 130, kind: 'server', info: 'What it is: stateless servers that take events, check them a little, and put them into Kafka without waiting. The user gets a 202 right away.' },
        { id: 'kafka', label: 'Kafka', sub: 'key = videoId', x: 400, y: 170, w: 130, kind: 'queue', info: 'What it is: a durable event log (<a href="#/kafka">Kafka lesson</a>). Key = videoId, so all events of one video go into the same partition. Because of retention, events can be replayed after a crash.' },
        { id: 'flink', label: 'Flink job', sub: 'window + top-K', x: 580, y: 170, w: 150, kind: 'server', meter: true, load: 30, info: 'What it is: the stream processor (the counting machines). It counts each partition\'s events in 1-minute panes (exact counts or a count-min sketch), adds up the last 60 panes to make a 1-hour sliding window, and finds the top-K of every window. Its state is checkpointed to durable storage regularly.' },
        { id: 'store', label: 'Serving store', sub: 'Redis / OLAP', x: 580, y: 290, w: 150, kind: 'cache', info: 'What it is: the place that holds the final result. The small result of each window: "trending:IN:music:12:05 → [v9, v2, ...]". In Redis for fast reads, and in an OLAP store like ClickHouse/Druid for slicing (country, category, time).' },
        { id: 'api', label: 'Trending API', sub: 'cached', x: 380, y: 290, w: 140, kind: 'server', info: 'What it is: the API that gives the top-K to the homepage. The result is the same for everyone (per country/category), so a 30-60 s TTL on a CDN/cache works.' },
      ],
      edges: [{ a: 'users', b: 'ingest' }, { a: 'ingest', b: 'kafka' }, { a: 'kafka', b: 'flink' }, { a: 'flink', b: 'store' }, { a: 'store', b: 'api' }, { a: 'api', b: 'users' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Views are coming in', text: 'Thousands of view events per second. Ingest puts them into Kafka right away.', flood: { paths: ['evt:users>ingest>kafka'], n: 12 }, msg: '{ videoId: "v9", country: "IN", ts: 12:04:31 }' },
          { title: 'Flink counts', text: 'Each Flink worker counts the videos of its own partitions, in a bucket (pane) for the minute. The same video always goes to the same worker, so its full count is in one place.', flood: { paths: ['evt:kafka>flink'], n: 8 }, after: { flink: { load: 55 } } },
          { title: 'Minute over: publish top-K', text: 'When the window closes, every worker gives its local top-K, and a final step merges them all into the global top-K. The result goes into the serving store.', go: 'flink>store', msg: 'SET trending:IN:all:12:05 [v9, v2, v41, v7, v3 ...]' },
          { title: 'The homepage reads', text: 'The API reads the small result from the serving store (with a cache). No query ever touches the raw events.', go: ['users>api>store', 'res:store>api>users'] },
        ]},
        { name: 'Flink worker crash', steps: [
          { title: 'A worker went down', text: 'One Flink worker crashed. Counting for its partitions stopped.', set: { flink: { state: 'down', sub: 'restarting' } }, go: 'bad:kafka>flink' },
          { title: 'Events are safe in Kafka', text: 'No events are lost; they are piling up in Kafka (a backlog). The homepage shows the old top-K: a little stale, but working.', flood: { paths: ['evt:users>ingest>kafka'], n: 8 }, after: { kafka: { state: 'warn', sub: 'backlog' } } },
          { title: 'Back from the checkpoint', text: 'Flink restores its state (counts) and each Kafka partition\'s offset from the last checkpoint, and reads the events again from there. In exactly-once mode, every event affects the state only once. If the sink that writes outside is idempotent (overwrite on the same key), writing again does no harm.', set: { flink: { state: 'ok', sub: 'replaying' } }, flood: { paths: ['evt:kafka>flink'], n: 10 }, after: { kafka: { state: '', sub: 'key = videoId' }, flink: { state: '', sub: 'window + top-K' } } },
        ]},
        { name: 'Viral video (hot key)', steps: [
          { title: 'Half the traffic on one video', text: 'One video goes viral. key = videoId, so all its events go to one partition and one Flink worker. The other workers sit idle while this one is hot.', flood: { paths: ['evt:ingest>kafka>flink'], n: 12 }, after: { kafka: { state: 'hot', sub: '1 partition hot' }, flink: { state: 'hot', load: 95 } } },
          { title: 'Cure: two-step counting', text: 'Step one: add a random salt to the key (v9#0 ... v9#7), or pre-aggregate locally at ingest ("v9: +500 this second"). Step two: add up all the pieces of v9. This way one hot key\'s work is spread over 8 workers. Cost: an extra step and a little latency.', set: { kafka: { state: '', sub: 'key = videoId#salt' }, flink: { state: 'ok', load: 50 } } },
        ]},
        { name: 'Late events', steps: [
          { title: 'A phone offline in the metro', text: 'A user watched a video at 12:04, but the phone was offline. The event arrived at 12:09.', go: 'evt:users>ingest>kafka>flink', msg: '{ videoId: "v2", ts: 12:04:10 }  arrived 12:09' },
          { title: 'Event time + watermark', text: 'Flink picks the window from the event\'s own time (event time), and the watermark says "events this old will probably not come any more". If the event is within the allowed lateness, the window fires again and the top-K is updated. Even later: drop it, or send it to a side output (and a batch job fixes it later). Details in the <a href="#/big-data">big data lesson</a>.', focus: ['flink'] },
        ]},
      ],
    },

    { type: 'callout', tone: 'term', title: 'New words from the scenarios', html: `<strong>Hot key</strong>: a key (like viral video v9) with so many events that its partition, worker or Redis node gets hot by itself, while the others sit idle.<br><strong>Salting</strong>: <strong>What it is:</strong> add a small random number after the hot key (v9#0 ... v9#7), so its events are spread over 8 places; later, a second step adds the 8 pieces together. <strong>Why:</strong> one machine's work is split over 8. <strong>Without it:</strong> one viral video slows down the whole pipeline.<br><strong>Event time vs processing time</strong>: event time = when the thing <em>happened</em> (12:04 on the phone). Processing time = when it <em>reached</em> the server (12:09). Counting must use event time, otherwise the offline phone's view gets counted in the wrong minute.<br><strong>Watermark</strong>: Flink's estimate that "events older than this will probably not come any more", so it can close the window and give a result.<br><strong>Idempotent sink</strong>: write the result in a way that writing it twice still gives the same result (like overwriting the same key: <code>SET trending:12:05 [...]</code>). Writing again after a crash does no harm.` },
    { type: 'h2', text: 'Deep dive 1: count-min sketch + heap, from the inside' },
    { type: 'p', html: `Take a small version of trending hashtags: 8 hashtags, and a stream where <code>#ipl</code> appears many times. We want the top 3, but without a separate counter for every hashtag. Two things do this together: a count-min sketch (an <em>estimated</em> count for every item) and a small <strong>min-heap</strong> (a list of only the top K <em>candidates</em>).` },
    { type: 'callout', tone: 'term', title: 'New word: min-heap (size K)', html: `<strong>What it is:</strong> a small list of K items that always tells you which of them is the <strong>smallest</strong> (the heap's "min"). If a new item arrives with a count bigger than this min, take the min out and put the new one in. One operation is O(log K).<br><strong>Why we need it:</strong> the sketch can only answer "what is this item's count?". It does not know <em>which</em> items are inside. The heap remembers who the top K candidates are.<br><strong>Without it:</strong> to find the top-K you would need a list of all items, which is the same big hash map we wanted to avoid.` },
    { type: 'p', html: `Run it yourself. "Next event" sends one hashtag from the stream. Watch: (1) one cell in every row gets +1 (highlighted), (2) estimate = the minimum of those 3 cells, (3) what the heap does. Then set the columns (w) to 2: <code>#exam</code> (really only 2 times) gets into the heap and <code>#rain</code> (really 4) is pushed out. That is the effect of collisions.` },
    { type: 'custom', render(el) {
      const D = 3, K = 3, TAGS = ['#ipl', '#budget', '#rain', '#exam', '#movie', '#metro', '#diwali', '#chess'];
      const STREAM = 'ipl budget ipl rain ipl exam budget ipl movie rain ipl metro budget ipl diwali chess ipl rain budget exam ipl movie rain ipl'.split(' ').map(x => '#' + x);
      const hash = (s, i, w) => { let h = 2166136261 ^ (i * 0x9e3779b1); for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) % w; };
      el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary cmh-next">Next event</button><button type="button" class="btn small cmh-five">+5 events</button><button type="button" class="btn small ghost cmh-reset">Reset</button></div>
        <div class="chips cmh-w" style="padding:0;margin-top:8px"><span style="align-self:center;color:var(--ink-3);font-size:13px">Columns (w), d = 3:</span><button type="button" class="chip" data-v="2">2</button><button type="button" class="chip" data-v="4">4</button><button type="button" class="chip on" data-v="8">8</button><button type="button" class="chip" data-v="16">16</button></div>
        <div class="chips cmh-own" style="padding:0;margin-top:6px"><span style="align-self:center;color:var(--ink-3);font-size:13px">Send your own event:</span>${TAGS.map(x => `<button type="button" class="chip" data-v="${x}">${x}</button>`).join('')}</div>
        <div class="cmh-grid table-wrap" style="margin-top:8px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:8px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Min-heap (top ${K} candidates)</div><div class="cmh-heap" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Real counts (only for comparison)</div><div class="cmh-ex" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
        </div>
        <div class="calc-note cmh-note"></div>`;
      const q = s => el.querySelector(s);
      let w = 8, evs = [], pos = 0;
      const run = () => {
        const sk = Array.from({ length: D }, () => new Array(w).fill(0)), ex = {}, heap = {}; let last = null;
        evs.forEach(x => { ex[x] = (ex[x] || 0) + 1; for (let i = 0; i < D; i++) sk[i][hash(x, i, w)]++;
          const est = Math.min(...sk.map((r, i) => r[hash(x, i, w)])); let act;
          if (x in heap) { heap[x] = est; act = 'up'; } else if (Object.keys(heap).length < K) { heap[x] = est; act = 'add'; }
          else { const mn = Object.entries(heap).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? 1 : -1))[0];
            if (est > mn[1]) { delete heap[mn[0]]; heap[x] = est; act = 'evict:' + mn[0] + ':' + mn[1]; } else act = 'ign:' + mn[1]; }
          last = { x, est, act, cells: [0, 1, 2].map(i => [i, hash(x, i, w)]), vals: [0, 1, 2].map(i => sk[i][hash(x, i, w)]) }; });
        return { sk, ex, heap, last }; };
      const upd = () => {
        const { sk, ex, heap, last } = run();
        const on = (i, j) => last && last.cells.some(([a, b]) => a === i && b === j);
        q('.cmh-grid').innerHTML = `<table><thead><tr><th></th>${sk[0].map((_, j) => `<th>${j}</th>`).join('')}</tr></thead><tbody>` + sk.map((r, i) => `<tr><td style="white-space:nowrap">r${i + 1}</td>${r.map((v, j) => `<td style="text-align:center;${on(i, j) ? 'background:var(--accent-soft);font-weight:700' : ''}">${v}</td>`).join('')}</tr>`).join('') + `</tbody></table>`;
        const hs = Object.entries(heap).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? 1 : -1));
        q('.cmh-heap').innerHTML = hs.length ? hs.map(([k, v], i) => `${k} ≈ ${v}${i === 0 ? ' <span style="color:var(--ink-3)">← min</span>' : ''}`).join('<br>') : '(empty)';
        q('.cmh-ex').innerHTML = Object.entries(ex).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}: ${v}${heap[k] !== undefined ? ' ✓' : ''}`).join('<br>') || '(no events yet)';
        let n = `Events: ${evs.length}. `;
        if (last) { const L = last;
          n += `"${L.x}" arrived: +1 in cells ${L.cells.map(([, j]) => j).join(', ')} of the three rows, values are now ${L.vals.join(', ')}. Estimate = min = ${L.est} (real ${ex[L.x]}${L.est > ex[L.x] ? ', +' + (L.est - ex[L.x]) + ' from collisions' : ''}). Heap: `;
          n += L.act === 'up' ? 'it was already inside, count updated.' : L.act === 'add' ? 'there was free space, so it was added.' : L.act.startsWith('evict') ? `the estimate is bigger than the heap's min (${L.act.split(':')[1]} ≈ ${L.act.split(':')[2]}), so that one was taken out and "${L.x}" was put in.` : `the estimate is not bigger than the heap's min (${L.act.split(':')[1]}), so it is ignored.`;
        } else n += 'Start: press "Next event".';
        const top = Object.entries(ex).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K).map(([k]) => k), wrong = Object.keys(heap).filter(k => !top.includes(k));
        if (evs.length >= 8 && wrong.length) n += ` Note: the heap contains ${wrong.join(', ')}, which is not in the real top ${K}; in the small table it shared cells with popular hashtags.`;
        q('.cmh-note').textContent = n; };
      const push = x => { evs.push(x); upd(); };
      q('.cmh-next').addEventListener('click', () => { if (pos < STREAM.length) push(STREAM[pos++]); });
      q('.cmh-five').addEventListener('click', () => { for (let k = 0; k < 5 && pos < STREAM.length; k++) evs.push(STREAM[pos++]); upd(); });
      q('.cmh-reset').addEventListener('click', () => { evs = []; pos = 0; upd(); });
      el.querySelectorAll('.cmh-w .chip').forEach(b => b.addEventListener('click', () => { w = +b.dataset.v; el.querySelectorAll('.cmh-w .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      el.querySelectorAll('.cmh-own .chip').forEach(b => b.addEventListener('click', () => push(b.dataset.v)));
      upd();
    }},
    { type: 'p', html: `What did you see? With w = 8 (24 counters), the heap's top 3 matches the real top 3 (<code>#ipl</code>, <code>#budget</code>, <code>#rain</code>); only <code>#budget</code>'s estimate is 1 too high. With w = 2 (6 counters), after all 24 events <code>#exam</code>'s estimate becomes 10 (real 2), and it pushes <code>#rain</code> out of the heap. Remember three things: (1) the sketch never counts <em>less</em>, only more; (2) increase w and the error goes down (the paper's guarantee: error ≤ (e/w) × N, most of the time); (3) the count in the heap is from the moment of that item's last event, so for the final answer, read the candidates' estimates from the sketch again.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: will the sketch alone give the top-K?', html: `No. A count-min sketch answers only one question: "what is this item's count?" It does not know <em>which</em> items are inside. That is why you need a small <strong>min-heap</strong> (size K) next to it: for every event, look at the item's estimate, and if it is bigger than the smallest one in the heap, put it in the heap. Heap = the list of candidates, sketch = their counts.` },
    { type: 'h2', text: 'Deep dive 2: windows, what does "the last 1 hour" mean?' },
    { type: 'p', html: `"Trending" does not mean all-time; it means <em>now</em>. There are three window types (the <a href="#/big-data">big data lesson</a> has a simulator): <strong>tumbling</strong> (12:00-13:00, 13:00-14:00, no overlap), <strong>sliding</strong> (a 1-hour window that moves forward every 1 minute, so windows overlap), and <strong>session</strong> (based on a user's activity). Trending needs a sliding window: every minute, "the last 60 minutes".` },
    { type: 'callout', tone: 'warn', title: 'Why a sliding window is expensive', html: `According to the Flink docs, when the slide is smaller than the window size, every event goes into several windows: a 60-minute window with a 1-minute slide = every event in 60 windows. Written without thinking, that is 60x the state. The common trick: <strong>panes</strong>. Keep a small tumbling count (a pane) for every minute, and window = the sum of the last 60 panes. When a new minute arrives: add the new pane, subtract the oldest. Flink's incremental aggregation (ReduceFunction/AggregateFunction) also keeps only one running value per window, not all the events.` },
    { type: 'p', html: `Panes work even better with count-min sketches: you can <strong>add</strong> two sketches (same size, same hash functions) cell by cell, and the result is the same as if both streams had gone into one sketch. So keep one sketch per minute, and window = the sum of the last W sketches. Play with it below: a fake 30-minute stream, 10 named videos and 300 "long tail" videos that appear once or twice a minute.` },
    { type: 'custom', render(el) {
      const M = 30, TAIL = 300, D = 3, K = 5;
      const NAMED = [
        ['final-highlights', m => 10 + (m >= 18 ? 70 * Math.exp(-(m - 18) / 6) : 0)],
        ['new-song', m => 30 + m * 1.2], ['cat-video', m => 45 - m * 1.2], ['js-tutorial', () => 22],
        ['trailer-x', m => (m >= 8 ? 55 * Math.exp(-(m - 8) / 5) : 3)], ['news-live', m => 18 + 8 * Math.sin(m / 3)],
        ['gaming-live', m => 15 + m * 0.6], ['comedy-clip', m => 26 - m * 0.4], ['science-shorts', () => 12],
        ['travel-vlog', m => 9 + (m >= 24 ? 30 : 0)],
      ];
      let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const per = [];
      for (let m = 0; m < M; m++) { const c = {};
        NAMED.forEach(([n, f]) => { c[n] = Math.max(0, Math.round(f(m) * (0.85 + 0.3 * rnd()))); });
        for (let i = 0; i < TAIL; i++) { const r = rnd(); const k = r < 0.55 ? 0 : r < 0.9 ? 1 : 2; if (k) c['v' + i] = k; }
        per.push(c); }
      const hash = (s, i, w) => { let h = 2166136261 ^ (i * 0x9e3779b1); for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) % w; };
      el.innerHTML = `<div class="row2">
          <div><label>Current minute (end of window): <strong class="tk-tv"></strong></label><input class="tk-t" type="range" min="4" max="29" step="1" value="9"></div>
          <div><label>&nbsp;</label><button type="button" class="btn small primary tk-play">Play</button></div>
        </div>
        <div class="chips tk-w" role="group" aria-label="Window"><span style="align-self:center;color:var(--ink-3);font-size:13px">Window:</span>
          <button type="button" class="chip on" data-v="5">5 min</button><button type="button" class="chip" data-v="10">10 min</button><button type="button" class="chip" data-v="15">15 min</button></div>
        <div class="chips tk-c" role="group" aria-label="Sketch width"><span style="align-self:center;color:var(--ink-3);font-size:13px">Sketch columns (w), d = 3:</span>
          <button type="button" class="chip" data-v="16">16</button><button type="button" class="chip" data-v="32">32</button><button type="button" class="chip" data-v="64">64</button><button type="button" class="chip on" data-v="128">128</button></div>
        <svg class="tk-svg" viewBox="0 0 720 150" style="width:100%;height:auto;display:block" role="img" aria-label="Events per minute with sliding window"></svg>
        <div class="tk-tab table-wrap"></div>
        <div class="stats">
          <div class="stat"><span>Events in window (N)</span><strong class="tk-n"></strong></div>
          <div class="stat"><span>Different videos</span><strong class="tk-d"></strong></div>
          <div class="stat"><span>Top-5 caught correctly</span><strong class="tk-h"></strong></div>
          <div class="stat"><span>Sketch memory</span><strong class="tk-m"></strong></div>
        </div>
        <div class="calc-note tk-note"></div>`;
      const q = s => el.querySelector(s);
      let W = 5, w = 128, timer = null;
      const upd = () => {
        const t = +q('.tk-t').value; q('.tk-tv').textContent = t;
        const exact = {}, sk = Array.from({ length: D }, () => new Array(w).fill(0)); let N = 0;
        const s0 = Math.max(0, t - W + 1);
        for (let m = s0; m <= t; m++) for (const k in per[m]) { const v = per[m][k]; exact[k] = (exact[k] || 0) + v; N += v; for (let i = 0; i < D; i++) sk[i][hash(k, i, w)] += v; }
        const est = k => Math.min(...sk.map((r, i) => r[hash(k, i, w)]));
        const ord = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
        const ex = Object.entries(exact).sort(ord).slice(0, K);
        const es = Object.keys(exact).map(k => [k, est(k)]).sort(ord).slice(0, K);
        const inEx = k => ex.some(([e]) => e === k);
        const hit = es.filter(([k]) => inEx(k)).length;
        let rows = '';
        for (let r = 0; r < K; r++) { const [ek, ev] = ex[r], [sk2, sv] = es[r];
          rows += `<tr><td>${r + 1}</td><td>${ek} <span style="color:var(--ink-3)">${ev}</span></td><td style="color:${inEx(sk2) ? 'var(--ink)' : 'var(--red)'}">${sk2} <strong>${sv}</strong> <span style="color:var(--ink-3)">(real ${exact[sk2]}, +${sv - exact[sk2]})</span></td></tr>`; }
        q('.tk-tab').innerHTML = `<table><thead><tr><th>#</th><th>Exact top-5</th><th>Sketch top-5 (estimate)</th></tr></thead><tbody>${rows}</tbody></table>`;
        const tot = per.map(c => Object.values(c).reduce((a, b) => a + b, 0)), mx = Math.max(...tot);
        let bars = '';
        tot.forEach((v, m) => { const x = 30 + m * 22, h = v / mx * 100, inW = m >= s0 && m <= t;
          bars += `<rect x="${x}" y="${115 - h}" width="16" height="${h}" rx="2" style="fill:${inW ? 'var(--accent)' : 'var(--line-2)'}"/>`;
          if (m % 5 === 0) bars += `<text x="${x + 8}" y="132" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--f-mono)">${m}</text>`; });
        bars += `<rect x="${30 + s0 * 22 - 3}" y="8" width="${(t - s0 + 1) * 22 + 0}" height="110" rx="6" style="fill:none;stroke:var(--accent);stroke-width:1.5;stroke-dasharray:4 3"/><text x="360" y="147" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--f-body)">each bar = all events of one minute · dashed box = sliding window</text>`;
        q('.tk-svg').innerHTML = bars;
        q('.tk-n').textContent = N.toLocaleString('en-IN'); q('.tk-d').textContent = Object.keys(exact).length;
        q('.tk-h').textContent = hit + ' / 5'; q('.tk-m').textContent = (w * D) + ' counters';
        const wrong = es.filter(([k]) => !inEx(k)).map(([k]) => k);
        const kth = ex[K - 1][1], close = wrong.filter(k => exact[k] >= 0.9 * kth), far = wrong.filter(k => exact[k] < 0.9 * kth);
        q('.tk-note').textContent = (far.length ? `Red = the sketch pushed a wrong video into the top-5 (${far.join(', ')}): its counters got mixed with the counts of popular videos (collision). ` : '') +
          (close.length ? `${close.join(', ')} was really close to rank 5 anyway (a tie); the sketch's small error flipped the order. ` : '') + (wrong.length ? '' : `The sketch's top-5 is the same as the exact one. `) +
          `The estimate is never lower than the real count, only higher. Guarantee: error ≲ (e/w) × N = ${Math.round(Math.E / w * N)} (most of the time much less than this). With the window at 5 min, move the minute forward: trailer-x (launched at minute 8) is, around 10-14, inside the top-5 and then drops out, final-highlights (18) enters and at 22 becomes #1, travel-vlog (24) climbs. That is trending. The exact map needs ${Object.keys(exact).length} entries; in the real world these would be crores.`;
      };
      const chip = (sel, fn) => el.querySelectorAll(sel + ' .chip').forEach(b => b.addEventListener('click', () => { fn(+b.dataset.v); el.querySelectorAll(sel + ' .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      chip('.tk-w', v => { W = v; }); chip('.tk-c', v => { w = v; });
      q('.tk-t').addEventListener('input', upd);
      q('.tk-play').addEventListener('click', () => {
        if (timer) { clearInterval(timer); timer = null; q('.tk-play').textContent = 'Play'; return; }
        if (+q('.tk-t').value >= 29) q('.tk-t').value = 4;
        q('.tk-play').textContent = 'Pause';
        timer = setInterval(() => { const s = q('.tk-t'); if (!el.isConnected || +s.value >= 29) { clearInterval(timer); timer = null; q('.tk-play').textContent = 'Play'; return; } s.value = +s.value + 1; upd(); }, 700);
      });
      upd();
    }},
    { type: 'p', html: `What did you see? With the defaults (minute 9, window 5, w = 128, only 384 counters), the sketch's top-5 is exactly the same as the real one. Set w = 16 (48 counters): videos like <strong>v18</strong> and <strong>v298</strong>, which were really watched only 3 and 7 times, get into the top-5, because their counters were shared with popular videos. That is the nature of count-min: <strong>good for heavy hitters, useless for rare items</strong>. And in a tie near rank K (two videos almost equal), even a small error can flip the order.` },

    { type: 'h2', text: 'Deep dive 3: merging the top-K of many machines' },
    { type: 'p', html: `One machine cannot count the whole stream, so 10 workers count. Each worker finds its own top-10. If we merge those 10 lists, do we get the right global top-10? <strong>It depends on how the events were split</strong>:` },
    { type: 'compare',
      left: { title: 'Split by key (videoId → worker)', html: `<em>All</em> events of one video go to one worker. Each video's full count is in one place. So the global top-10 is always inside some worker's local top-10.<br><br><strong>The merge is exact.</strong> That is why the Kafka key = videoId.` },
      right: { title: 'Split any way (time / round-robin)', html: `Video X is 9th on every worker (100 on each), 1,000 in total. Video Y is #1 on one worker (500) and nowhere else. Every worker sends only its top-5: X reached nowhere, Y did.<br><br><strong>The merge can be wrong.</strong>` },
    },
    { type: 'p', html: `The second case exists in real databases too. According to the Apache Druid docs, its TopN query is approximate: each data segment sends its top <code>max(1000, threshold)</code> to the broker, and on a column with more than ~1,000 different values both the rank and the count can be wrong; for exact results use GroupBy (expensive). ClickHouse's <code>topK</code> function is also approximate according to its docs (based on the Filtered Space-Saving algorithm). So when you ask an OLAP store for the "top 10", this trade-off is hidden there too.` },
    { type: 'callout', tone: 'term', title: 'New word: Space-Saving', html: `<strong>What it is:</strong> another algorithm for finding heavy hitters (Metwally, Agrawal, El Abbadi, 2005). Keep only <strong>m counters</strong>, each with an item's name on it. When a new item arrives and there is no free counter: remove the item with the smallest counter, and give the new one <em>that same count + 1</em>.<br><strong>Example:</strong> m = 3, counters {ipl: 9, budget: 4, rain: 2}. #exam arrives: rain (2) is removed, exam = 3. Exam's real count is 1, so its count can be "at most 2 too high", and this margin is stored alongside it.<br><strong>Why we need it:</strong> candidates and counts live together in one small structure; popular items never get pushed out.<br><strong>Without it:</strong> you would have to manage two structures, like count-min + heap. That is why this one is often used (ClickHouse's topK is based on it too).` },

    { type: 'h2', text: 'Deep dive 4: leaderboards, Redis sorted sets' },
    { type: 'p', html: `A different problem from trending. A fantasy cricket contest: 1 lakh players, after every ball the points of many players change, and every player wants <strong>their exact rank</strong> ("you are at #4,218"), plus the top 100. Approximate will not do here, but the data is small (the players of one contest) and fits in memory.` },
    { type: 'callout', tone: 'term', title: 'New word: Redis sorted set (ZSET)', html: `<strong>What it is:</strong> a data type in Redis (a fast database that runs in memory): a list of members where each member has a <strong>score</strong>, and the list always stays in score order. Like a scoreboard that sorts itself after every change.<br><strong>Why we need it:</strong> "what is my rank" and "top 100", both right away after every update, exact, without sorting the whole list again.<br><strong>Without it:</strong> counting lakhs of rows in SQL for every rank request.<br><strong>Skip list</strong> (the part inside): a sorted linked list with "express lanes" on top that skip over the items in between, so that finding something is O(log N) (<a href="#/ds-for-scale">details</a>).` },
    { type: 'p', html: `In SQL, <code>SELECT COUNT(*) FROM scores WHERE points &gt; :mine</code> on every request = lakhs of rows every time. The <strong>Redis sorted set</strong> is built exactly for this. According to the Redis docs, it is a set of unique members where each member has a score, and members always stay in score order (if the scores are equal, in lexicographic order of the member name). Inside, it is a <strong>skip list + hash table</strong> (the <a href="#/ds-for-scale">skip list</a> for rank and range, the hash table for "what is riya's score").` },
    { type: 'table', head: ['Command', 'What it does', 'Cost (Redis docs)'], rows: [
      ['<code>ZADD lb 120 riya</code>', 'Add a member / set the score', 'O(log N)'],
      ['<code>ZINCRBY lb 6 riya</code>', 'Add to the score (the points of each ball)', 'O(log N)'],
      ['<code>ZRANGE lb 0 9 REV WITHSCORES</code>', 'Top 10, highest score first', 'O(log N + M), M = how many returned'],
      ['<code>ZREVRANK lb riya</code>', 'Riya\'s rank (0 = top)', 'O(log N)'],
      ['<code>ZSCORE lb riya</code>', 'Riya\'s score', 'O(1)'],
    ], caption: 'Older tutorials use ZREVRANGE; the Redis docs say it is deprecated since 6.2, use ZRANGE ... REV instead.' },
    { type: 'p', html: `Now run a small contest yourself. "Next ball" sends the points of the match's next ball (ZINCRBY). Or give points to any player yourself from below. After every command, watch: the order fixes itself, and ZREVRANK tells the rank right away. Make two players' scores equal and see what Redis does on a tie.` },
    { type: 'custom', render(el) {
      const balls = [
        ['riya', 6, 'six'], ['aman', 4, 'four'], ['zoya', 25, 'wicket (bowler in their team)'], ['kabir', 1, 'single'], ['aman', 10, 'captain hits a four (2x)'],
        ['riya', 25, 'wicket'], ['kabir', 12, 'captain hits a six (2x)'], ['zoya', 4, 'four'], ['meera', 30, 'catch + run out'], ['kabir', 16, 'four (2x)'],
      ];
      el.innerHTML = `<div class="row2"><div><button type="button" class="btn small primary lbz-next">Next ball</button> <button type="button" class="btn small ghost lbz-reset">Reset</button></div>
          <div><label for="lbz-me">See my rank</label><select id="lbz-me" class="lbz-me"><option>riya</option><option>aman</option><option>zoya</option><option>kabir</option><option>meera</option></select></div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px"><label for="lbz-who">Your own ZINCRBY:</label><select id="lbz-who" class="lbz-who"><option>riya</option><option>aman</option><option>zoya</option><option>kabir</option><option>meera</option></select><button type="button" class="btn small lbz-p" data-v="1">+1</button><button type="button" class="btn small lbz-p" data-v="4">+4</button><button type="button" class="btn small lbz-p" data-v="6">+6</button><button type="button" class="btn small lbz-p" data-v="25">+25</button></div>
        <pre class="ascii lbz-cmd" style="margin-top:10px"></pre>
        <div class="lbz-tab table-wrap"></div>
        <div class="calc-note lbz-note"></div>`;
      const q = s => el.querySelector(s);
      let z = {}, i = 0, log = [];
      const init = () => { z = { riya: 50, aman: 50, zoya: 40, kabir: 45, meera: 20 }; i = 0; log = ['ZADD lb 50 riya 50 aman 40 zoya 45 kabir 20 meera']; };
      const rev = () => Object.entries(z).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
      const draw = () => {
        const r = rev(), me = q('.lbz-me').value, rk = r.findIndex(([m]) => m === me);
        q('.lbz-cmd').textContent = log.slice(-3).join('\n') + `\n> ZRANGE lb 0 4 REV WITHSCORES\n> ZREVRANK lb ${me}   → ${rk}`;
        q('.lbz-tab').innerHTML = `<table><thead><tr><th>Rank</th><th>Member</th><th>Score</th></tr></thead><tbody>` + r.map(([m, s], k) => `<tr${m === me ? ' style="background:var(--accent-soft)"' : ''}><td>#${k + 1}</td><td>${m}</td><td>${s}</td></tr>`).join('') + `</tbody></table>`;
        const tie = r.some(([, s], k) => k && r[k - 1][1] === s);
        q('.lbz-note').textContent = (i >= balls.length ? 'All balls are done. ' : `Ball ${i}/${balls.length}. `) + `${me}'s rank is #${rk + 1} (ZREVRANK counts from 0, so ${rk}). ` + (tie ? 'Two members have the same score: in REV order, Redis puts them in reverse lexicographic order of their names, not "who got there first". If you want that, you have to encode time into the score.' : 'After every ZINCRBY the order is right by itself: no sort had to run.');
      };
      q('.lbz-next').addEventListener('click', () => { if (i >= balls.length) return; const [m, p, why] = balls[i++]; z[m] += p; log.push(`ZINCRBY lb ${p} ${m}   # ${why}`); draw(); });
      q('.lbz-reset').addEventListener('click', () => { init(); draw(); });
      q('.lbz-me').addEventListener('change', draw);
      el.querySelectorAll('.lbz-p').forEach(btn => btn.addEventListener('click', () => { const m = q('.lbz-who').value, p = +btn.dataset.v; z[m] += p; log.push(`ZINCRBY lb ${p} ${m}   # sent by you`); draw(); }));
      init(); draw();
    }},
    { type: 'p', html: `Now the full leaderboard system. This is a general design (not any one company's):` },
    { type: 'flow', title: 'Live contest leaderboard', height: 280,
      nodes: [
        { id: 'ev', label: 'Ball events', sub: 'Kafka topic', x: 95, y: 70, w: 150, kind: 'queue', info: 'What it is: a Kafka topic where the result of every ball (run, wicket, catch) is one event. The points calculators of all contests read from it.' },
        { id: 'calc', label: 'Points worker', sub: 'per contest', x: 310, y: 70, w: 150, kind: 'server', info: 'What it is: the worker that counts points. From a ball event it works out the points of every affected player (which cricketer is in whose team, captain 2x) and sends ZINCRBY. Partitioned by contest id, so one contest is on one worker.' },
        { id: 'redis', label: 'Redis ZSET', sub: 'lb:contest:42', x: 540, y: 70, w: 160, kind: 'cache', info: 'What it is: a Redis sorted set, the contest\'s live scoreboard. One contest = one sorted set. Member = userId, score = points. Rank and top-N in O(log N). In Redis Cluster, one key lives on one slot/node, so one contest\'s leaderboard is on one node.' },
        { id: 'db', label: 'Teams DB', sub: 'source of truth', x: 540, y: 210, w: 160, kind: 'data', info: 'What it is: the database of real records (the source of truth). Every user\'s team and every ball\'s record, in a durable DB. If Redis is lost, the leaderboard can be rebuilt from here (recompute points, then ZADD).' },
        { id: 'api', label: 'Leaderboard API', sub: 'top 100 + my rank', x: 310, y: 210, w: 160, kind: 'server', info: 'What it is: the API that gives the leaderboard to the app. The top 100 is the same for everyone: cached with a short TTL. "My rank" is different for every user: ZREVRANK directly from Redis.' },
        { id: 'players', label: 'Players', sub: 'app', x: 95, y: 210, w: 130, kind: 'client', info: 'What it is: the users playing on the fantasy app, who joined the contest. During the match they refresh the leaderboard again and again.' },
      ],
      edges: [{ a: 'ev', b: 'calc' }, { a: 'calc', b: 'redis' }, { a: 'redis', b: 'db' }, { a: 'api', b: 'redis' }, { a: 'players', b: 'api' }],
      scenarios: [
        { name: 'Ball and rank', steps: [
          { title: 'A wicket fell', text: 'A ball event arrived.', go: 'evt:ev>calc', msg: '{ ball: "14.2", wicket: "batter X", bowler: "Y" }' },
          { title: 'Points update', text: 'ZINCRBY for every player who has bowler Y in their team. Thousands of updates for one ball, each one O(log N).', go: 'calc>redis', msg: 'ZINCRBY lb:contest:42 25 user:881\nZINCRBY lb:contest:42 25 user:1203 ...' },
          { title: 'My rank', text: 'A player opened the leaderboard: the top 100 (cached) and their own rank.', go: ['players>api>redis', 'res:redis>api>players'], msg: 'ZRANGE lb:contest:42 0 99 REV WITHSCORES\nZREVRANK lb:contest:42 user:881  → 4217' },
        ]},
        { name: 'Redis node down', steps: [
          { title: 'Primary down', text: 'The Redis node holding the leaderboard crashed.', set: { redis: { state: 'down', sub: 'DOWN' } }, go: 'bad:api>redis' },
          { title: 'Replica or rebuild', text: 'A replica is promoted (replication is async, so the last few updates may be lost). Or rebuild the leaderboard from the DB: recompute every user\'s points, then ZADD. That is why Redis should not be the source of truth, only a fast index.', go: ['db>redis'], after: { redis: { state: 'ok', sub: 'rebuilt' } } },
        ]},
        { name: 'A very big contest', steps: [
          { title: 'Crores of players, one key', text: 'One mega contest has crores of members. One sorted set lives on one node, so that node\'s memory and CPU are the limit. Lakhs of ZINCRBY on the same key for every ball: a hot key.', flood: { paths: ['calc>redis', 'api>redis'], n: 12 }, after: { redis: { state: 'hot', sub: 'one huge key' } } },
          { title: 'Cure', text: 'Keep the top 1,000 in a small exact sorted set. For everyone else, an approximate rank: a histogram of score buckets ("~42 lakh people are above you"). Or batch the ZINCRBYs for a few seconds before sending. Only the people at the top really need an exact rank.', set: { redis: { state: '', sub: 'top-1000 + buckets' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Tie-break: who got there first?', html: `With equal points, Redis orders by name. If you want "whoever got there first goes higher", add time into the score: <code>score = points × 10^7 + (10^7 − seconds_since_contest_start)</code>. Careful: a Redis score is a double, which keeps integers exact only up to ~2^53, so both the points and the time must fit in that range.` },

    { type: 'h2', text: 'Deep dive 5: when money is involved, exact counts and batch reconciliation' },
    { type: 'p', html: `<strong>A new problem:</strong> xyz.com shows ads, and the advertiser pays per click. The dashboard needs a live "12,430 clicks so far", but on the <strong>bill</strong> even a 1-click error means a dispute. The ways a streaming pipeline can be wrong: count-min over-counting, duplicates from replay after a crash (at-least-once), late events that arrive after the window closed, and bot clicks that are caught later.` },
    { type: 'p', html: `Twitter's engineers wrote exactly this in the 2014 Summingbird paper (VLDB): for most analytics, a ~1% error is fine (whether a retweet count is 141 or 142), but for work like <strong>billing advertisers</strong> there is no room for error, and probabilistic structures are not right there. In their setup at that time, online processing (Storm) was at-least-once, so batch processing (Hadoop) ran to "back it up", and Summingbird ran both from the same logic and combined their results. That is a 2014 setup; today Flink/Spark often replace Storm/Hadoop, but the idea is the same.` },
    { type: 'callout', tone: 'term', title: 'New words: data lake, batch job, reconciliation', html: `<strong>Data lake</strong>: <strong>What it is:</strong> cheap, very large storage (like S3) where raw events are kept as they are, forever. <strong>Why:</strong> if anything was counted wrong, you can count again from the real data. <strong>Without it:</strong> a stream's mistake stays forever.<br><strong>Batch job</strong>: <strong>What it is:</strong> a program that processes a whole day's data together, calmly (for example at night), on Spark or Hadoop. <strong>Why:</strong> with all the data in front of you, removing duplicates and bots and adding late events is easy and exact. <strong>Without it:</strong> only the stream's hurried estimate.<br><strong>Reconciliation</strong>: matching the stream's number with the batch's exact number, and taking the final number (the one on the bill) from the batch.` },
    { type: 'flow', title: 'Ad clicks: Lambda style', height: 320,
      nodes: [
        { id: 'clk', label: 'Ad clicks', sub: 'events', x: 80, y: 160, w: 120, kind: 'client', info: 'What it is: the events of clicks on ads. Every click: { adId, userId, ts, clickId }. The clickId is unique, so duplicates can be removed later.' },
        { id: 'kq', label: 'Kafka', sub: 'raw clicks', x: 245, y: 160, w: 130, kind: 'queue', info: 'What it is: the Kafka topic of raw clicks. All clicks come here. Two consumers: the speed layer (Flink) and an archiver that writes raw events to the data lake.' },
        { id: 'fl', label: 'Flink', sub: 'speed layer', x: 430, y: 60, w: 140, kind: 'server', info: 'What it is: the speed layer, a stream processor that gives counts per minute within seconds. For the dashboard. It can be approximate (late events, duplicates).' },
        { id: 'lake', label: 'Data lake', sub: 'raw, S3/HDFS', x: 430, y: 260, w: 140, kind: 'data', info: 'What it is: cheap, big storage (S3/HDFS) where every raw click is kept permanently. If anything goes wrong, you can count again from here.' },
        { id: 'batch', label: 'Batch job', sub: 'daily, exact', x: 625, y: 260, w: 140, kind: 'server', info: 'What it is: a Spark/Hadoop job that runs at night and reads all clicks of one day: dedupe by clickId, remove bots, include late events, and count exactly. It takes hours, but it is correct.' },
        { id: 'srv', label: 'Serving', sub: 'dashboard + bill', x: 625, y: 60, w: 140, kind: 'data', info: 'What it is: the data for the dashboard and billing. The dashboard first shows the speed layer\'s number. When the batch number arrives, it overwrites that day. The bill is made only from the batch number.' },
      ],
      edges: [{ a: 'clk', b: 'kq' }, { a: 'kq', b: 'fl' }, { a: 'kq', b: 'lake' }, { a: 'fl', b: 'srv' }, { a: 'lake', b: 'batch' }, { a: 'batch', b: 'srv' }],
      scenarios: [
        { name: 'A normal day', steps: [
          { title: 'Clicks arrive', text: 'Every click goes into Kafka, and from there onto two paths.', flood: { paths: ['evt:clk>kq>fl', 'evt:clk>kq>lake'], n: 10 } },
          { title: 'Live dashboard', text: 'The speed layer writes the count of every minute to serving. The advertiser sees it within seconds.', go: 'fl>srv', msg: 'ad:77  12:05  clicks ≈ 412' },
          { title: 'Exact at night', text: 'The batch job read the whole day\'s raw clicks, removed duplicates, and wrote the exact number. Now that day\'s dashboard and bill come from it.', go: ['lake>batch', 'batch>srv'], msg: 'ad:77  2026-10-03  clicks = 9,871 (exact, final)' },
        ]},
        { name: 'Duplicates after a crash', steps: [
          { title: 'Flink restart, replay', text: 'The speed layer was running at-least-once. After the crash, a few minutes of events were counted again. The dashboard count is a little too high.', set: { fl: { state: 'warn', sub: 'replayed' } }, flood: { paths: ['evt:kq>fl'], n: 8 }, after: { srv: { state: 'warn', sub: 'over-counted' } } },
          { title: 'The batch fixes it', text: 'In the raw data lake every click is there once (clickId). The batch counted exactly and overwrote that day\'s number. Duplicates have no effect on the bill.', go: ['lake>batch', 'batch>srv'], after: { srv: { state: 'ok', sub: 'dashboard + bill' }, fl: { state: '' } } },
        ]},
      ],
    },
    { type: 'p', html: `Reconciliation means: match the stream's quick number with the batch's exact number, and always bill from the exact one. See for yourself how far the stream's number can drift (suppose one ad gets 10,000 real clicks in a day, at ₹5 per click):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="rc-dup">Duplicates from replay after a crash: <strong class="rc-dv"></strong></label><input id="rc-dup" class="rc-dup" type="range" min="0" max="5" step="0.5" value="2"></div>
          <div><label for="rc-late">Late clicks (arrived after the window closed): <strong class="rc-lv"></strong></label><input id="rc-late" class="rc-late" type="range" min="0" max="600" step="50" value="300"></div>
          <div><label for="rc-bot">Bot clicks (caught later): <strong class="rc-bv"></strong></label><input id="rc-bot" class="rc-bot" type="range" min="0" max="1000" step="50" value="400"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Stream count (live)</span><strong class="rc-s"></strong></div>
          <div class="stat"><span>Batch count (exact)</span><strong class="rc-b"></strong></div>
          <div class="stat"><span>Difference</span><strong class="rc-d"></strong></div>
          <div class="stat"><span>Bill if made from the stream</span><strong class="rc-m"></strong></div>
        </div>
        <div class="calc-note rc-note"></div>`;
      const G = 10000, PRICE = 5, q = s => el.querySelector(s);
      const upd = () => {
        const dp = +q('.rc-dup').value, L = +q('.rc-late').value, B = +q('.rc-bot').value;
        q('.rc-dv').textContent = dp + '%'; q('.rc-lv').textContent = L; q('.rc-bv').textContent = B;
        const seen = G + B - L, dups = Math.round(seen * dp / 100), S = seen + dups, diff = S - G;
        q('.rc-s').textContent = S.toLocaleString('en-IN'); q('.rc-b').textContent = G.toLocaleString('en-IN');
        q('.rc-d').textContent = (diff > 0 ? '+' : '') + diff.toLocaleString('en-IN');
        q('.rc-m').textContent = '₹' + (S * PRICE).toLocaleString('en-IN') + ' (correct: ₹' + (G * PRICE).toLocaleString('en-IN') + ')';
        q('.rc-note').textContent = `Out of ${(G + B).toLocaleString('en-IN')} raw clicks, the stream saw ${seen.toLocaleString('en-IN')} (${L} late ones were missed), and because of the replay it counted ${dups} twice. The bot clicks (${B}) are also inside. The batch dedupes the raw archive by clickId, includes the late clicks, and removes the bots: exactly ${G.toLocaleString('en-IN')}. ${diff === 0 ? 'This time the errors cancelled each other out, but that is only luck.' : 'If the bill came from the stream, the advertiser would be charged ₹' + Math.abs(diff * PRICE).toLocaleString('en-IN') + ' ' + (diff > 0 ? 'too much' : 'too little') + '.'} The dashboard uses the stream's number; the bill uses only the batch.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Lambda vs Kappa (reminder)', html: `<strong>Lambda</strong>: stream (fast, approximate) + batch (slow, exact), with the logic in two places. <strong>Kappa</strong>: stream only; to fix a mistake, replay from Kafka from the start. According to the Flink docs, a checkpoint holds the Kafka offsets along with the state, in exactly-once mode every event affects the state only once, and end-to-end exactly-once needs a replayable source + a transactional or idempotent sink. That is why some teams do billing from the stream too, but usually they still keep an archive of raw events and a reconciliation job. Details in the <a href="#/big-data">big data lesson</a>.` },

    { type: 'h2', text: 'OLAP store: "in India, in music, in the last 6 hours"' },
    { type: 'p', html: `Tomorrow the product team will say: "trending for Android users in Mumbai over the last 6 hours". Preparing a top-K in advance for every combination is impossible. For this, Flink sends per-minute <em>counts</em> (video × country × category × minute) to a column-store OLAP database (ClickHouse, Druid, Pinot), which runs a <code>GROUP BY</code> over billions of rows in seconds (<a href="#/big-data">OLTP vs OLAP</a>). Still keep the results of popular combinations (country-level trending) precomputed in Redis; OLAP is for ad-hoc, low-traffic questions. And remember: the "top 10" functions there can be approximate too (Druid TopN, ClickHouse topK).` },

    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'table', head: ['What happened', 'Effect', 'Protection'], rows: [
      ['Viral item (hot key)', 'One partition / worker / Redis key gets hot', 'Salt + two-step aggregation, local pre-aggregation, ZINCRBY batching'],
      ['Stream worker crash', 'Trending stops and looks stale', 'Replay from Kafka retention + Flink checkpoint; idempotent sink'],
      ['Duplicates (at-least-once)', 'Counts too high', 'Fine for trending; for billing, clickId dedupe + batch'],
      ['Late events', 'An old window\'s count is too low', 'Event time + watermark + allowed lateness; the rest in batch'],
      ['Sketch too small', 'Rare items in the top-K', 'Increase w (e/ε), or Space-Saving; use it only for heavy hitters'],
      ['Arbitrary partitioning + merging local top-Ks', 'Wrong global top-K', 'Partition by key, or send more than K candidates from every node (Druid\'s 1000)'],
      ['Redis leaderboard node down', 'Ranks are gone', 'Replica; rebuild from the DB; do not make Redis the source of truth'],
      ['Spam / bots manipulating trending', 'The wrong thing trends', 'Filters at ingest, per-user weight/limit, remove them later with batch'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• One scoreboard, exact rank after every update, data fits in memory → <strong>Redis sorted set</strong>.<br>• A continuous "who has the most" over crores of different items, a little error is fine → <strong>stream + windows + count-min/Space-Saving + heap</strong>.<br>• Ad-hoc slices (country, category, any time range) → per-minute counts in an <strong>OLAP store</strong>.<br>• Money or legal numbers → <strong>raw event archive + batch reconciliation</strong> (or an exactly-once stream + reconciliation), never approximate structures.` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Ask about accuracy first', d: 'Trending (approximate, fresh), leaderboard (exact, small), billing (exact, delay is fine). A separate path for each of the three.' },
      { t: 'Pipeline', d: 'Ingest → Kafka (key = itemId) → Flink windowed counts → top-K → Redis/OLAP → cached API. Raw events are never on the query path.' },
      { t: 'Windows', d: 'Sliding windows from panes: 1-minute tumbling counts, window = sum of the last N panes. Event time + watermark.' },
      { t: 'Memory', d: 'Very many keys: count-min sketch + heap, or Space-Saving. Sketches can be merged, so you can add up panes and workers.' },
      { t: 'Edge cases', d: 'Hot key (salting), distributed merge (partition by key), crash (checkpoint + replay), billing (batch reconciliation).' },
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 420,
      caption: 'One Kafka stream feeds three paths: fast trending through Flink (a little approximate), an exact leaderboard through the points worker (Redis ZSET), and an exact bill through the archive + the nightly batch. Use the buttons above to see one path at a time.',
      groups: [
        { label: 'Collect', x: 10, y: 30, w: 530, h: 108 },
        { label: 'Stream', x: 190, y: 160, w: 350, h: 108 },
        { label: 'Serve', x: 10, y: 290, w: 530, h: 108 },
        { label: 'Batch (exact)', x: 550, y: 30, w: 160, h: 368 },
      ],
      nodes: [
        { id: 'users', label: 'Users / apps', sub: 'views, clicks', x: 90, y: 84, w: 140, kind: 'client', info: 'What it is: xyz.com\'s viewers, fantasy players and people who see ads. Every view/click/ball creates a small event, and the same people also read trending and leaderboards on the homepage.' },
        { id: 'ingest', label: 'Ingest API', sub: 'validate, 202', x: 270, y: 84, kind: 'server', info: 'What it is: stateless servers that take events, check them a little, and put them into Kafka without stopping. The user gets an answer right away.' },
        { id: 'kafka', label: 'Kafka', sub: 'key = itemId', x: 450, y: 84, kind: 'queue', info: 'What it is: a durable event log, split into partitions. All events of the same item go into the same partition, so one item\'s full count is on one worker. Replay after a crash also comes from here.' },
        { id: 'lake', label: 'Data lake', sub: 'raw archive', x: 630, y: 84, kind: 'data', info: 'What it is: a permanent copy of every raw event (cheap storage like S3). The exact billing count and the fix for any mistake come from here.' },
        { id: 'points', label: 'Points worker', sub: 'per contest', x: 270, y: 214, kind: 'server', info: 'What it is: works out each player\'s points from ball events and sends ZINCRBY. Partitioned by contest id, so one contest is on one worker.' },
        { id: 'flink', label: 'Flink', sub: 'panes + sketch', x: 450, y: 214, kind: 'server', info: 'What it is: the stream processor. Counts in 1-minute panes (exact or count-min), sliding window = sum of the last panes, top-K with a heap/Space-Saving. Crash recovery from checkpoints.' },
        { id: 'batch', label: 'Nightly batch', sub: 'dedupe, exact', x: 630, y: 214, kind: 'server', info: 'What it is: the night-time Spark job. The whole day\'s raw events: dedupe by clickId, remove bots, add late events, exact count. The stream\'s mistakes get fixed here.' },
        { id: 'api', label: 'Top-K API', sub: 'cached', x: 90, y: 344, kind: 'server', info: 'What it is: gives the trending list to the homepage and the leaderboard to the app. Trending is the same for everyone, so it is cached with a short TTL; "my rank" comes straight from Redis.' },
        { id: 'redis', label: 'Redis', sub: 'top-K lists, ZSETs', x: 270, y: 344, kind: 'cache', info: 'What it is: a fast in-memory store. The small top-K list of every window ("trending:IN:12:05") and the sorted set of every contest. Not the source of truth; if it is lost, it can be rebuilt.' },
        { id: 'olap', label: 'OLAP store', sub: 'ClickHouse/Druid', x: 450, y: 344, kind: 'data', info: 'What it is: an analytics database. It keeps per-minute counts (item × country × category), so new questions like "Mumbai, Android, last 6 hours" run in seconds.' },
        { id: 'bill', label: 'Dashboard + bill', sub: 'live vs final', x: 630, y: 344, w: 150, kind: 'data', info: 'What it is: the advertiser\'s dashboard and bill. During the day, the stream\'s live number; at night, the batch\'s exact number overwrites it. The bill uses only the exact number.' },
      ],
      edges: [
        { a: 'users', b: 'ingest', n: 1 }, { a: 'ingest', b: 'kafka', n: 2 }, { a: 'kafka', b: 'flink', n: 3 },
        { a: 'flink', b: 'redis', n: 4, label: 'top-K' }, { a: 'users', b: 'api', n: 5, label: 'GET top 10' }, { a: 'api', b: 'redis' },
        { a: 'kafka', b: 'points', kind: 'evt' }, { a: 'points', b: 'redis', label: 'ZINCRBY' },
        { a: 'flink', b: 'olap', label: 'counts' }, { a: 'olap', b: 'bill' },
        { a: 'kafka', b: 'lake' }, { a: 'lake', b: 'batch' }, { a: 'batch', b: 'bill', label: 'exact' }, { a: 'batch', b: 'olap', dashed: true },
      ],
      paths: [
        { name: 'Event arrives', text: 'View/click → ingest (202 right away) → Kafka (key = itemId, so one item stays in one partition) → Flink counts it in that minute\'s pane. At the same time a raw copy goes to the data lake.', go: ['users>ingest>kafka>flink', 'kafka>lake'] },
        { name: 'Window closes', text: 'The minute is over: Flink adds up the last panes into a sliding window, finds the top-K with a heap/Space-Saving and writes it to Redis (overwriting the same key), and sends per-minute counts to OLAP.', go: ['flink>redis', 'flink>olap'] },
        { name: 'Read top 10', text: 'The homepage asks the API; the API brings the small list from its cache or Redis. No read ever touches the raw events.', go: ['users>api>redis'] },
        { name: 'Leaderboard update', text: 'Ball event → points worker → ZINCRBY on the contest\'s sorted set. A player\'s "my rank" = ZREVRANK, O(log N), exact.', go: ['kafka>points>redis', 'users>api>redis'] },
        { name: 'Nightly fix', text: 'At night the batch job reads the whole day from the data lake: dedupe, remove bots, add late events. The exact number overwrites the dashboard and the bill, and that day\'s counts in OLAP are fixed too.', go: ['lake>batch>bill', 'batch>olap'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>First ask how exact the count must be: trending (approximate, fresh), leaderboard (exact, small data), bill (exact, delay is fine).</li>
      <li>An exact hash map's memory grows with the number of different items; a count-min sketch's stays fixed, but it only over-counts (never under-counts).</li>
      <li>A sketch gives counts, not candidates: pair it with a size-K min-heap (or use Space-Saving).</li>
      <li>Pipeline: ingest → Kafka (key = itemId) → Flink windows → top-K into Redis + counts into OLAP → cached API.</li>
      <li>Sliding window = the sum of 1-minute panes; late events with event time + watermark; crash recovery with checkpoint + replay.</li>
      <li>Partition by key and merging local top-Ks is exact; otherwise send more candidates from every node.</li>
      <li>Leaderboard = Redis sorted set: ZINCRBY, ZRANGE ... REV, ZREVRANK, all O(log N). Redis is not the source of truth.</li>
      <li>When money is involved: raw archive + batch reconciliation; the bill always uses the exact number.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Stream + windows: trending is fresh within seconds to minutes', 'Count-min / Space-Saving: crores of keys in KBs of memory', 'Partition by key: many machines, and the merge is still exact', 'Redis sorted set: rank and top-N in O(log N)', 'Batch reconciliation: exact bills, the stream\'s mistakes are forgiven'],
      costs: ['The sketch over-counts and is useless for rare items', 'Two pipelines (Lambda): the same logic maintained in two places', 'Dashboard and bill numbers can differ for a few hours', 'An extra aggregation step for hot keys', 'Redis memory is expensive, and one key is limited to one node'],
    },
    { type: 'think', questions: [
      { q: 'One video has been stuck at #1 on the trending list for 3 hours, because it went viral in the morning. The product team wants new videos to get a chance. What would you change?', a: 'Make the window smaller (1 hour → 15 minutes), or add time decay: give older panes less weight (for example, half every 10 minutes). Or rank by "growth": this window\'s count ÷ the previous window\'s count, so fast-rising items move up. Panes make all of this cheap: the weights are applied only when adding them up.' },
      { q: 'You find the top-K with a count-min sketch. The window is sliding. How do you "remove" the events of an old minute from the sketch?', a: 'Subtracting is technically possible (decrease the counters), but the easy way is panes: a separate sketch for every minute, window = the cell-wise sum of the last N sketches. When a new minute arrives, throw away the oldest sketch. Also rebuild the heap from candidates for every window.' },
      { q: 'Fantasy app: one mega contest with 2 crore users. Every user wants their exact rank. Is one Redis sorted set enough?', a: 'The memory might fit, but one key lives on one node: lakhs of ZINCRBYs per ball and crores of rank reads all on one CPU. Keep the exact ranking of the top few thousand in a small set, give everyone else an approximate rank from a score-bucket histogram ("top 12%"), and batch the updates for a few seconds. If everyone truly needs an exact rank, compute the ranks in a batch after every ball and cache them per user.' },
    ]},

    { type: 'quiz', questions: [
      { q: 'Compared with the real count, a count-min sketch\'s estimate is...', options: ['Never lower, but it can be higher', 'Never higher', 'Always exact'], answer: 0, explain: 'Collisions only increase counters. Taking the minimum gives the least mixed-up counter, but even that is never lower than the real count.' },
      { q: '10 workers send their local top-10 and they are merged. When is this global top-10 exact?', options: ['Always', 'When events are partitioned by the item\'s key (all events of one item on one worker)', 'When there are more than 10 workers'], answer: 1, explain: 'Partition by key = each item\'s full count is in one place. Otherwise an item can be a little on every worker and miss every local top-10, while still being near the top in total.' },
      { q: 'What is the best tool for "my exact rank" on a live leaderboard?', options: ['Count-min sketch', 'Redis sorted set (ZINCRBY + ZREVRANK)', 'SQL COUNT(*) on every request'], answer: 1, explain: 'Skip list + hash table: update and rank are both O(log N), exact. A sketch does not give exact ranks, and SQL counts lakhs of rows every time.' },
      { q: 'Why run a batch job next to the streaming count for ad billing?', options: ['Batch is faster', 'The stream can have duplicates, late events and approximation; the batch, from the raw archive, removes duplicates and gives the exact final number', 'Kafka does not support billing'], answer: 1, explain: 'Twitter\'s Summingbird paper said the same: there is no room for error in billing. The stream is a fast estimate, the batch is the final truth.' },
      { q: 'Why keep a min-heap next to a count-min sketch?', options: ['To make the sketch faster', 'The sketch only says "what is this item\'s count", not which items exist; the heap remembers the top-K candidates', 'The heap removes collisions'], answer: 1, explain: 'The sketch gives estimated counts, not a list of items. The heap\'s min is compared with every new estimate: if the new one is bigger, the min goes out and the new one goes in.' },
      { q: 'The stream counted 10,302 clicks for an ad, the batch counted 10,000. Which number is the bill made from, and why?', options: ['10,302, because it is live', '10,000, because the batch deduped the raw archive, removed bots and added late clicks', 'The average of both'], answer: 1, explain: 'The stream\'s number is a fast estimate (replay duplicates, bots, late events). Money comes only from the reconciled exact number.' },
      { q: 'A 1-hour sliding window that slides every 1 minute. What is the cheap way?', options: ['Every minute, count the raw events of the last 1 hour again', 'A pane for every minute (a count or a sketch), window = sum of the last 60 panes', 'Just use a tumbling window'], answer: 1, explain: 'Every event goes into only one pane. Add the new pane, remove the oldest. Sketches can be merged, so this works with them too.' },
    ]},
    { type: 'sources', note: 'Top-K is a common industry pattern; the specific claims come from these docs and papers.', items: [
      { title: 'An Improved Data Stream Summary: The Count-Min Sketch and its Applications (Cormode, Muthukrishnan)', publisher: 'Journal of Algorithms', year: 2005, url: 'https://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf', used: 'w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉, error ≤ εN with probability 1 − δ, never underestimates.' },
      { title: 'Efficient Computation of Frequent and Top-k Elements in Data Streams (Metwally, Agrawal, El Abbadi)', publisher: 'ICDT 2005 / UCSB tech report', year: 2005, url: 'https://old.cs.ucsb.edu/research/tech_reports/reports/2005-23.pdf', used: 'Space-Saving algorithm for top-k and frequent elements with error guarantees.' },
      { title: 'Summingbird: A Framework for Integrating Batch and Online MapReduce Computations (Boykin, Ritchie, O\'Connell, Lin)', publisher: 'VLDB (Twitter)', year: 2014, url: 'http://www.vldb.org/pvldb/vol7/p1441-boykin.pdf', used: 'Batch (Hadoop) + online (Storm) hybrid at Twitter, Storm at-least-once needs batch backup, ~1% error fine for counts but billing advertisers needs exact counts, count-min sketches in production queries.' },
      { title: 'Redis sorted sets', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/develop/data-types/sorted-sets/', used: 'Score ordering, lexicographic tie-break, leaderboards use case, skip list + hash table, O(log N) ZADD/ZINCRBY/ZRANK.' },
      { title: 'ZREVRANGE', publisher: 'Redis docs', official: true, url: 'https://redis.io/docs/latest/commands/zrevrange/', used: 'Deprecated as of 6.2.0 (use ZRANGE ... REV); descending lexicographic order for equal scores.' },
      { title: 'Windows (DataStream API)', publisher: 'Apache Flink docs', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/', used: 'Tumbling/sliding/session windows, elements in multiple sliding windows, allowed lateness, incremental aggregation keeps one value per window.' },
      { title: 'Fault Tolerance via State Snapshots', publisher: 'Apache Flink docs', official: true, url: 'https://nightlies.apache.org/flink/flink-docs-stable/docs/learn-flink/fault_tolerance/', used: 'Checkpoint = state + source offsets, restore and rewind, exactly-once vs at-least-once, end-to-end needs replayable source + transactional/idempotent sink.' },
      { title: 'TopN queries', publisher: 'Apache Druid docs', official: true, url: 'https://druid.apache.org/docs/latest/querying/topnquery/', used: 'TopN is approximate: each segment returns top max(1000, threshold); accurate under ~1000 unique values; GroupBy for exact.' },
      { title: 'topK aggregate function', publisher: 'ClickHouse docs', official: true, url: 'https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/topk', used: 'Approximate top-K using Filtered Space-Saving; results not guaranteed exact.' },
    ]},
  ],
});
