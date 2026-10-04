(function () {
  /* Decision widget: questions as chips -> recommendation card.
     cfg = { questions: [{ id, q, opts: [[value, label]], when?(ans) }], decide(ans) -> { pick, why, cost, alt } }
     The cfg is also attached to the block (block.cfg) so a node script can walk every path. */
  const decider = (el, cfg) => {
    const ans = {};
    el.innerHTML = '<div class="dz-qs"></div><div class="dz-out" aria-live="polite"></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn small ghost dz-reset">Start over</button></div>';
    const qs = el.querySelector('.dz-qs'), out = el.querySelector('.dz-out');
    const draw = () => {
      const live = [];
      cfg.questions.forEach(q => { if (q.when && !q.when(ans)) delete ans[q.id]; else live.push(q); });
      qs.innerHTML = '';
      let done = true;
      for (let i = 0; i < live.length; i++) {
        const q = live[i], box = document.createElement('div');
        box.style.margin = '0 0 14px';
        box.innerHTML = `<div style="font-weight:600;color:var(--ink);margin-bottom:6px">${i + 1}. ${q.q}</div><div style="display:flex;flex-wrap:wrap;gap:6px"></div>`;
        q.opts.forEach(([v, t]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip' + (ans[q.id] === v ? ' on' : '');
          b.style.borderRadius = '14px'; b.style.textAlign = 'left';
          b.setAttribute('aria-pressed', String(ans[q.id] === v));
          b.innerHTML = t;
          b.onclick = () => { ans[q.id] = v; draw(); };
          box.lastChild.appendChild(b);
        });
        qs.appendChild(box);
        if (ans[q.id] == null) { done = false; break; }
      }
      if (!done) { out.innerHTML = '<div class="calc-note">Pick an answer to the question above. When all questions are answered, the recommendation appears here.</div>'; return; }
      const r = cfg.decide(ans);
      out.innerHTML = `<div style="border:1px solid var(--line-2);border-left:4px solid var(--accent);border-radius:var(--r);background:var(--surface-2);padding:12px 14px">
        <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">Recommendation</div>
        <div style="font:700 20px/1.3 var(--f-display);color:var(--ink);margin:2px 0 8px">${r.pick}</div>
        <p style="margin:6px 0"><strong>Why:</strong> ${r.why}</p>
        <p style="margin:6px 0"><strong>What you give up:</strong> ${r.cost}</p>
        <p style="margin:6px 0"><strong>Runner-up:</strong> ${r.alt}</p></div>`;
    };
    el.querySelector('.dz-reset').onclick = () => { Object.keys(ans).forEach(k => delete ans[k]); draw(); };
    draw();
  };

  /* Practice cards: one case at a time; "signal" hint and "answer" reveal, prev/next. */
  const practice = (el, cases, T) => {
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
  };
  const CASES = [
    { q: 'A "Comments (1,234)" count on the video page. It shows on every page view; new comments arrive now and then.', signal: 'Read-heavy, repeated, a slightly old count is fine, display only.', pick: 'Cache-aside + TTL (~30-60 s)', why: 'The count is for showing, not for a decision. A COUNT(*) query on every view is costly; from the cache it takes 1 ms.', trap: 'The person who commented does not see their own comment in the list: delete the list key on write; the count can be a little late.' },
    { q: 'Each user\'s "Watch history" page, seen only by that user, 1-2 times a month.', signal: 'Each key has one owner, and very few reads. Almost no repeats.', pick: 'No cache; read straight from the DB (index on user_id, time)', why: 'The hit rate would be very low. With the right index, this query takes milliseconds.', trap: 'Filling Redis with every user\'s history: a RAM bill with no benefit.' },
    { q: 'A creator\'s ad earnings balance: it shows on the dashboard, and the "Withdraw" button sends money to the bank.', signal: 'One value used both for display and for a decision (withdraw).', pick: 'Display from the cache (short TTL); withdraw inside a DB transaction', why: 'A balance a few seconds old is fine for the dashboard. At withdraw time, an atomic "balance >= amount" check in the DB.', trap: 'Withdraw also uses the cached balance: two withdraws from two tabs = a double payout.' },
    { q: 'A "Trending in India" list: a job builds it every 5 minutes, and it shows on every homepage (the same for everyone).', signal: 'Computed, the same for everyone, 5 minutes old is fine.', pick: 'Precompute → cache (TTL ~10 min) + CDN', why: 'The job writes its result straight into the cache; the public response goes on the CDN. Users never wait on a miss.', trap: 'With cache-aside, every expiry makes thousands of requests rebuild the list at once (a stampede).' },
    { q: '"Hearts" (likes) on a live stream: 1 lakh taps/sec, and the total must show on screen.', signal: 'A very write-heavy counter; it does not need to be exact at every instant.', pick: 'Write-back: Redis INCR, flushed to the DB every few seconds', why: 'A DB write per tap is impossible. Redis counts in RAM; the total goes to the DB every few seconds.', trap: 'If 1 lakh/sec on one counter key is too heavy for one Redis node, split the key into several keys (hearts:v1:0..9) and add them up when reading.' },
    { q: 'An admin panel report that runs with different filters every time (date range, region, category).', signal: 'Every query is a different combination: long tail.', pick: 'No cache; run it on a warehouse or a read replica', why: 'The same report will rarely run twice. Move the heavy query off the live DB, not into a cache.', trap: 'Caching every report result: RAM fills up, hit rate ~0.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'use', q: 'Will this value be used for a decision (taking money, booking a seat)?', opts: [
        ['strict', 'Yes: a wrong/old value = a real loss'],
        ['display', 'No, it is only shown; slightly old is fine'],
      ]},
      { id: 'pattern', q: 'What is the pattern of reads and writes?', when: a => a.use === 'display', opts: [
        ['reads', 'Many more reads (10:1 or more)'],
        ['counter', 'Very many writes, like a counter (views, likes)'],
        ['balanced', 'Reads and writes about equal'],
      ]},
      { id: 'reuse', q: 'Are the same keys asked for again and again?', when: a => a.pattern === 'reads', opts: [
        ['hot1', 'Lakhs of hits on one or two keys (celebrity post, match score)'],
        ['repeat', 'Yes, popular items repeat'],
        ['longtail', 'No, almost every key only once'],
      ]},
      { id: 'aud', q: 'What is that hot data like?', when: a => a.reuse === 'hot1', opts: [
        ['public', 'Public, the same response for everyone (score JSON)'],
        ['app', 'An object inside the app (post, profile) that comes from the API/Redis'],
      ]},
      { id: 'cost', q: 'What does one cache miss cost?', when: a => a.reuse === 'repeat', opts: [
        ['cheap', 'A simple DB lookup (one row, one index)'],
        ['expensive', 'A costly computation (feed, recommendations, search results)'],
      ]},
      { id: 'own', q: 'Must users see their own update right away?', when: a => a.reuse === 'repeat', opts: [
        ['yes', 'Yes (changed my name, must show now)'],
        ['no', 'No, a few seconds/minutes old is fine'],
      ]},
    ],
    decide(a) {
      if (a.use === 'strict') return R('Read from the source of truth; cache only for display', 'The balance before a debit, the seat at checkout: these decisions cannot be made on an old copy from the cache. You can show the balance on screen from the cache, but check again inside a DB transaction at debit time.', 'Every critical read goes to the DB, so the DB must carry this load (index, from the primary, not from replicas).', 'Display from the cache + a conditional write in the DB (WHERE bal >= x) that catches mistakes.');
      if (a.pattern === 'counter') return R('Write-back: count in Redis, batch-flush to the DB', 'A DB write per view = lakhs of writes/sec. Redis INCR takes microseconds in memory; every few seconds, the total goes to the DB in one write. 1000 views = 1 DB write.', 'If Redis crashes, the counts since the last flush may be lost (accept a small loss). The count shows a little late.', 'Events in Kafka, aggregated by a stream job, if losing even one count is not allowed.');
      if (a.pattern === 'balanced') return R('Probably no cache (or only a hot subset)', 'You write as often as you read, so every write invalidates the cache and the hit rate drops. Little benefit from the cache, but the full risk of stale data.', 'The DB has to carry the reads itself.', 'Read replicas / better indexes; or cache only the keys that really are read-heavy.');
      if (a.reuse === 'longtail') return R('Probably not: the hit rate will stay low', 'Each key is asked for once, so whatever sits in the cache is never read again. RAM costs, zero benefit.', 'The DB load stays the same.', 'Cache only the popular "head" (top queries), or speed up the DB with indexes/replicas.');
      if (a.reuse === 'hot1') return a.aud === 'public'
        ? R('Put it on the CDN (short TTL)', 'The response is the same for everyone, so CDN edges cache it for 1-2 seconds and absorb lakhs of hits themselves. Your Redis and origin stay safe.', 'Data 1-2 seconds old; personalised things do not go on the CDN.', 'A local in-process cache in the app servers.')
        : R('Replicate the hot key + a local in-process cache', 'One key lives on one Redis node, so lakhs of hits melt that one node. Keep N copies of the key (post:9#1 ... #N) on different nodes and read a random copy; also let every app server keep a 1-2 second copy in its own memory.', 'The copies can differ for a short while; invalidation in N + servers places.', 'The CDN, if the response can be made public.');
      if (a.cost === 'expensive') return a.own === 'yes'
        ? R('Cache the computed result + delete that user\'s key on write', 'Building a feed/recommendations is costly, so cache the result. But if the user posts something themselves, delete their own feed key (or add their post to it), so they see it right away.', 'Invalidation logic on every write path; others see the update a little later.', 'A background job that builds results in advance (precompute), plus a direct DB read for the author.')
        : R('Cache the computed result (with a TTL)', 'Search results, feed, recommendations: build once, serve many times. A miss is costly, so every hit saves a lot.', 'An old result until the TTL; to stop many requests rebuilding at once on expiry (stampede), use a lock / early refresh.', 'Precompute with a background job, so no user ever waits on a miss.');
      return a.own === 'yes'
        ? R('Cache-aside + delete the key on write (or write-through)', 'Read-heavy and repeated, so cache-aside. Users must see their own update right away, so delete the cache key along with the write (the next read is fresh from the DB), or use write-through to update both cache and DB.', 'Invalidation code on every write path; forget one and you get a stale bug. Write-through makes every write a little slower.', 'Read from the DB for a few seconds only for the author (read-your-writes), everyone else from the cache.')
        : R('Cache-aside + TTL', 'The classic case: reads 10:1+, the same items repeat, slightly stale is fine. On a miss, fetch from the DB and keep it in the cache with a TTL. A 90%+ hit rate = 10 times less DB load.', 'Stale data until the TTL; one more system (Redis) that can fail; misses on a cold start.', 'Read replicas, if the data is small and the DB load is still low.');
    },
  };

  Lesson.register({
    id: 'decide-cache',
    title: 'Do you need a cache? Which strategy?',
    minutes: 26,
    summary: `"Add Redis" is not the answer to every slow page. When a cache helps, when it only brings bugs, and which strategy fits which situation: a question-and-answer widget, a hit-rate simulator and traps.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `A cache is a fast "memory" that sits in front of the database. Anything asked for again and again comes from here right away.<br>But a cache does not help everywhere. If every item is asked for only once, the cache is useless. If a money decision is made on an old copy from the cache, you lose money.<br>This lesson has three simple questions that tell you whether to add a cache, and which method to use. There is also a simulator where you see for yourself when a cache wins.` },
      { type: 'h2', text: 'The problem: "it is slow? add a cache"' },
      { type: 'p', html: `At every xyz.com standup someone says: "the page is slow, add Redis". Sometimes that is right (10 times less DB load), sometimes totally useless (a 2% hit rate), and sometimes dangerous (money taken after showing an old wallet balance). You learned the parts of a cache in the <a href="#/caching">caching</a> and <a href="#/caching-strategies">caching strategies</a> lessons. Here there is only one job: <strong>deciding</strong>.` },
      { type: 'h3', text: 'Words from earlier lessons, one line each' },
      { type: 'table', head: ['Word', 'In one line', 'Details'], rows: [
        ['Hit rate', 'What % of reads were answered by the cache. 90% = only 1 in 10 reads reaches the DB.', '<a href="#/caching">Caching</a>'],
        ['Cache-aside', 'The app checks the cache first; on a miss it fetches from the DB and puts it in the cache.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['Write-through', 'Every write goes to both the cache and the DB, at the same time.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['Write-back', 'A write goes only to the cache first; to the DB later, in a batch.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['TTL', 'How long until the cached copy expires by itself.', '<a href="#/caching">Caching</a>'],
        ['Stale', 'A cached copy that has become older than the real data in the DB.', '<a href="#/caching">Caching</a>'],
        ['Hot key', 'One key with so much traffic that a single cache node cannot handle it.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['Stampede', 'The moment a popular key expires, thousands of requests hit the DB together.', '<a href="#/caching-strategies">Cache strategies</a>'],
      ]},
      { type: 'callout', tone: 'term', title: 'New word: Long tail', html: `<strong>What it is:</strong> when there are very many keys and each one is asked for very rarely. Like the search "blue running shoes size 9 under 2000 for flat feet": there are crores of queries like this, and each one maybe comes only once. Draw a graph and you see a long, thin tail, hence the name.<br><strong>Why it matters:</strong> a cache works only when the same key is asked for again. In a long tail that just does not happen.<br><strong>Without it (if you do not spot it):</strong> you add a cache, fill RAM, and get a 1-2% hit rate.` },
      { type: 'callout', tone: 'tip', title: 'Decide: three questions first', html: `1) Is this value used for a <strong>decision</strong> (money, a seat)? Yes → the source of truth. 2) Are there <strong>many more reads than writes</strong> (10:1+)? 3) Do the <strong>same keys repeat</strong>? A cache works only when all three answers are right. Default: <strong>cache-aside + TTL</strong>, delete the key on write.` },

      { type: 'h2', text: 'Decision helper' },
      { type: 'p', html: `Think of some data (profile, feed, view count, wallet balance, match score) and answer. The result shows the strategy, the reason, the cost and the runner-up.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },

      { type: 'h2', text: 'The whole table' },
      { type: 'table', head: ['Situation', 'Answer'], caption: 'Roadmap phase 5: "Do I need a cache? Which strategy?"', rows: [
        ['Read-heavy (10:1 or more), the same items requested often, slight staleness is fine', 'Yes: cache-aside + TTL'],
        ['A costly computation that is reused (feed, recommendations, search results)', 'Yes: cache the computed result'],
        ['Users must see their own write right away', 'Write-through, or delete the cache key on write'],
        ['Extremely write-heavy counters (views, likes)', 'Write-back: count in Redis, flush to the DB in batches (accept a small risk of loss)'],
        ['Long-tail access, every key requested only once', 'Probably not; the hit rate will be low'],
        ['Strictly correct values (balance before a debit, seat at checkout)', 'Read from the source of truth; cache only for display'],
        ['One key gets lakhs of hits (celebrity post, match score)', 'Replicate the hot key, add a local in-process cache, or push it to a CDN'],
      ]},
      { type: 'h2', text: 'Each row, one by one: signal, scenario, reason, trap' },
      { type: 'h3', text: 'Read-heavy, repeated, slightly stale is fine → cache-aside + TTL' },
      { type: 'p', html: `<strong>Signal:</strong> 10 or more reads per write, the same items again and again, and data a few seconds/minutes old is fine.<br><strong>xyz.com:</strong> the creator profile, the title/description on the video page.<br><strong>Why:</strong> the simplest pattern. Only items that were asked for go into the cache. The TTL limits how long a mistake can live. A 90% hit rate = 10 times fewer reads on the DB.<br><strong>Trap:</strong> forgetting the TTL, or giving every key the same TTL (all expire together = a stampede). Add a little random jitter to the TTL.` },
      { type: 'h3', text: 'A costly computation, reused → cache the computed result' },
      { type: 'p', html: `<strong>Signal:</strong> building the answer is a lot of work (many queries, ranking), and the same answer is needed many times.<br><strong>xyz.com:</strong> the home feed, "you may also like", popular search results.<br><strong>Why:</strong> a miss is costly (300 ms), a hit is cheap (1 ms). Every hit saves 300 ms of work.<br><strong>Trap:</strong> on expiry, thousands of users rebuild it at the same time (a stampede). Use a lock / single-flight, or refresh in the background before it expires.` },
      { type: 'h3', text: 'Users must see their own write right away → write-through or delete the key' },
      { type: 'p', html: `<strong>Signal:</strong> "I changed my name, I must see it now" (read-your-own-writes).<br><strong>xyz.com:</strong> a creator edits their bio and refreshes the page.<br><strong>Why:</strong> delete the cache key along with the write (the next read is fresh from the DB), or use write-through to update the cache too. It is fine if others see it a few seconds later.<br><strong>Trap:</strong> <em>updating</em> the cache instead of deleting the key. If two writes happen together, the old value can stay in the cache. Deleting is safer.` },
      { type: 'h3', text: 'Very write-heavy counters → write-back' },
      { type: 'p', html: `<strong>Signal:</strong> constant +1s on one value (views, likes), and a slightly low count is acceptable.<br><strong>xyz.com:</strong> 50,000 views/sec on a viral video.<br><strong>Why:</strong> Redis <code>INCR</code> in RAM; one DB write every 5 seconds. 2.5 lakh views in 5 seconds = 1 DB write.<br><strong>Trap:</strong> using this for money. If Redis goes down before a flush, the last 5 seconds of counts are gone.` },
      { type: 'h3', text: 'Long tail → probably no cache' },
      { type: 'p', html: `<strong>Signal:</strong> almost every request is a new key.<br><strong>xyz.com:</strong> long, unique search queries; each user\'s own filter combination.<br><strong>Why not:</strong> a stored result is never read again. RAM costs, one extra hop, and a ~1% hit rate.<br><strong>Trap:</strong> "a cache makes everything faster". On a miss, the request goes to the cache <em>and</em> the DB. Cache only the "head" (top popular queries); improve the index for the rest.` },
      { type: 'h3', text: 'Strictly correct values → read from the source of truth' },
      { type: 'p', html: `<strong>Signal:</strong> the value drives a decision: taking money, giving a seat, lowering stock.<br><strong>xyz.com:</strong> the last seat in a paid workshop; a tip from the wallet.<br><strong>Why:</strong> the cached copy can be old at any moment. The cache is fine for showing; the decision is made in the DB with one atomic conditional update (<code>WHERE seats_left > 0</code>).<br><strong>Trap:</strong> checkout also checks the cache. In the flow below: 101 tickets for 100 seats.` },
      { type: 'h3', text: 'Lakhs of hits on one key → replicate, local cache, CDN' },
      { type: 'p', html: `<strong>Signal:</strong> so much traffic on one key that one Redis node\'s CPU hits 100%.<br><strong>xyz.com:</strong> a superstar\'s post, the IPL final score.<br><strong>Why:</strong> in a Redis cluster one key lives on one node. Keep copies of it (<code>post:9#1..#8</code>) on different nodes, let every app server keep a local 1-2 second copy, and put it on the CDN if the response is public.<br><strong>Trap:</strong> "just get a bigger Redis node". One node has a limit; the problem is one key, not the size.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"Cache = speed, so put it everywhere" <strong>is wrong</strong>. A cache is fast only on a <em>hit</em>. On a miss the request goes to the cache <em>and</em> the DB, so it is even a little slower than without a cache. With a 5% hit rate you took on a new system, new bugs (stale data) and a new bill for just 5% of requests. A second mistake: "if it is in the cache, it is the truth". The truth is always in the DB (the source of truth); the cache is only a copy that can be old.` },
      { type: 'h2', text: 'Simulator: long tail vs popular keys' },
      { type: 'p', html: `The hit rate depends on two things: how big the cache is, and how much the traffic leans towards "popular keys". Real traffic is often <strong>Zipf</strong>-like: the most popular key gets the most hits, the second gets fewer, and then there is a long tail. Below there are 10 lakh keys. Change the shape of the traffic and the cache size, and watch.` },
      { type: 'callout', tone: 'term', title: 'New word: Zipf distribution', html: `<strong>What it is:</strong> a pattern where the item at rank #1 gets the most hits, rank #2 gets about half, rank #3 about a third... (hits ∝ 1/rank<sup>s</sup>). The bigger <strong>s</strong> is, the more the traffic leans on just a few keys. s = 0 means every key is equal, which is a pure long tail.<br><strong>Why it matters:</strong> web traffic is often like this (in research traces, s is roughly 0.6-0.9). Because of this lean, even a small cache catches a lot of hits.<br><strong>Without it (if you do not understand it):</strong> you cannot guess whether caching 1% of keys will give 1% of hits or 68%.` },
      { type: 'custom', render(el) {
        const SHAPES = [['Long tail (s = 0)', 0], ['Light repeat (s = 0.5)', 0.5], ['Normal web (s = 0.8)', 0.8], ['Popular-heavy (s = 1.0)', 1.0], ['Very skewed (s = 1.2)', 1.2]];
        const SIZES = [0.1, 0.5, 1, 2, 5, 10, 20], N = 1000000;
        let si = 3;
        el.innerHTML = `<div class="dc-sh" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
          <label>Cache size: <strong class="dc-szv"></strong> keys in the cache</label><input class="dc-sz" type="range" min="0" max="6" step="1" value="2" aria-label="Cache size">
          <div class="stats"><div class="stat"><span>Hit rate</span><strong class="dc-hr"></strong></div>
            <div class="stat"><span>Out of every 10,000 requests, reaching the DB</span><strong class="dc-db"></strong></div>
            <div class="stat"><span>Verdict</span><strong class="dc-v" style="font-size:17px"></strong></div></div>
          <div class="calc-note">This assumes an ideal cache that always holds the most popular keys. A real LRU cache gets a slightly lower hit rate, but the trend stays the same.</div>`;
        const sh = el.querySelector('.dc-sh'), sz = el.querySelector('.dc-sz');
        const hit = (C, s) => { let a = 0, b = 0; for (let i = 1; i <= N; i++) { const v = Math.pow(i, -s); b += v; if (i <= C) a += v; } return a / b; };
        const upd = () => {
          sh.querySelectorAll('button').forEach((b, k) => { b.className = 'chip' + (k === si ? ' on' : ''); b.setAttribute('aria-pressed', String(k === si)); });
          const pct = SIZES[Number(sz.value)], C = Math.round(N * pct / 100), h = hit(C, SHAPES[si][1]);
          el.querySelector('.dc-szv').textContent = pct + '% (' + C.toLocaleString('en-IN') + ')';
          el.querySelector('.dc-hr').textContent = (h * 100).toFixed(1) + '%';
          el.querySelector('.dc-db').textContent = Math.round(10000 * (1 - h)).toLocaleString('en-IN');
          el.querySelector('.dc-v').textContent = h < 0.3 ? 'Little benefit: maybe skip the cache' : h < 0.8 ? 'Okay: a cache will help' : 'Very good: add a cache';
        };
        SHAPES.forEach(([t], k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => { si = k; upd(); }; sh.appendChild(b); });
        sz.addEventListener('input', upd); upd();
      }},
      { type: 'p', html: `See? On a <strong>long tail</strong>, caching 1% of keys gives a hit rate of only <strong>1%</strong>: 9,900 out of 10,000 requests still reach the DB. The same 1% cache on <strong>popular-heavy</strong> traffic (s = 1.0) gives <strong>~68%</strong> hits, and ~91% at s = 1.2. That is why "do the same keys repeat?" is the most important cache question.` },
      { type: 'h2', text: 'Worked scenarios' },
      { type: 'h3', text: '1. The creator profile page' },
      { type: 'p', html: `Lakhs of people view a profile every day, and the creator edits it once or twice a month. Reads ≫ writes, the same keys repeat, a few seconds old is fine. <strong>Decision: cache-aside + TTL</strong> (say, 10 min), and when the creator edits, <code>DEL profile:42</code> so they see their new bio right away.` },
      { type: 'h3', text: '2. The home feed' },
      { type: 'p', html: `Building a feed means fetching 200 posts, ranking, filtering: ~300 ms of work. A user opens the app 20 times a day. <strong>Decision: cache the computed result</strong> (feed:user_id, TTL ~1-2 min). A miss is costly, so every hit saves a lot. Use a lock / early refresh to stop a stampede on expiry.` },
      { type: 'h3', text: '3. The video view counter' },
      { type: 'p', html: `50,000 views/sec on one viral video. <code>UPDATE videos SET views = views + 1</code> on every view = 50,000 writes/sec on one single row, and the DB will collapse. <strong>Decision: write-back</strong>: <code>INCR views:v1</code> in Redis, and the total to the DB every 5 seconds. If Redis crashes, a few seconds of views may be lost; for a view count that is fine.` },
      { type: 'h3', text: '4. Trap: "search is slow, cache the results"' },
      { type: 'p', html: `A big share of search queries are long tail: "yesterday\'s video where the cat plays the piano". Every query is a different key, so a cached result will hardly ever be read again. <strong>Decision: do not cache all of search</strong>; cache only the top popular queries ("ipl highlights"), and handle the rest by making the search index fast. Pick "Long tail" in the simulator above and see.` },
      { type: 'h3', text: '5. Trap: a paid live workshop, "only 1 seat left"' },
      { type: 'p', html: `xyz.com has a paid workshop with 100 seats. "Seats left" shows on every page view, so the team cached it with a 60-second TTL. That is fine for showing. The mistake came when <strong>checkout also checked the cache</strong>. Run the diagram below. <strong>Decision:</strong> show from the cache, but make the decision (giving a seat) from the source of truth, with an atomic conditional update.` },
      { type: 'h3', text: '6. A celebrity\'s post' },
      { type: 'p', html: `A superstar posted, and one key <code>post:9</code> gets 20 lakh reads/minute. This key is on one node of the Redis cluster, and that node is at 100% CPU. <strong>Decision:</strong> copies of the key (<code>post:9#1..#8</code>) on different nodes, read a random copy, and every app server keeps a local in-process copy for 1-2 seconds.` },
      { type: 'h2', text: 'Practice: 6 short cases' },
      { type: 'p', html: `Remember the three questions: is it a decision or a display? more reads or writes? do the same keys repeat? Then press "Show signal" and "Show answer".` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' }); } },

      { type: 'h2', text: 'Deciding from the cache: run it and see' },
      { type: 'flow', height: 330,
        nodes: [
          { id: 'u1', label: 'Riya', sub: 'Buy seat', x: 90, y: 80, w: 130, kind: 'client', info: 'What it is: Riya, the first buyer. She saw "1 seat left" and pressed Buy.' },
          { id: 'u2', label: 'Aman', sub: 'Buy seat', x: 90, y: 250, w: 130, kind: 'client', info: 'What it is: Aman, the second buyer, in the same second. The setup for a race.' },
          { id: 'app', label: 'Checkout service', x: 330, y: 165, w: 170, kind: 'server', info: 'What it is: the checkout service, the code that sells seats. Wrong design: it reads seats_left from the cache and decides. Right design: the cache for page display, but a conditional update in the DB to give a seat.' },
          { id: 'cache', label: 'Redis cache', sub: 'seats_left = 1', x: 590, y: 70, w: 160, kind: 'cache', info: 'What it is: a copy of seats_left in the Redis cache, TTL 60 s. Perfectly fine for display. Not for decisions: the copy can be old at any moment.' },
          { id: 'db', label: 'Database', sub: 'seats_left = 1', x: 590, y: 260, w: 160, kind: 'data', info: 'What it is: the database, meaning the source of truth. Here one atomic statement, "give a seat if one is left", stops the race.' },
        ],
        edges: [{ a: 'u1', b: 'app' }, { a: 'u2', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
        scenarios: [
          { name: 'Deciding from the cache (wrong)', steps: [
            { title: 'Both press Buy together', text: 'Both checkouts read seats_left from the cache. Both see 1.', parallel: true, go: ['u1>app>cache', 'u2>app>cache'], after: { cache: { state: 'hit', sub: 'seats_left = 1' } }, msg: 'GET seats:w7 → 1   (both times)' },
            { title: 'Both get a ticket', text: '"1 > 0, fine": a ticket row is inserted for both.', go: ['app>db', 'app>db'], after: { db: { state: 'warn', sub: '101 tickets / 100!' } }, msg: 'INSERT INTO tickets ... (2 times)' },
            { title: 'Oversold', text: '101 tickets were sold for a 100-seat workshop. The cache did nothing wrong; the mistake was making a decision from <strong>a copy that can be old</strong>.', parallel: true, go: ['res:app>u1', 'res:app>u2'], after: { cache: { state: 'warn', sub: 'still 1 (stale)' } } },
          ]},
          { name: 'Display from cache, decide in DB (correct)', steps: [
            { title: 'The page from the cache', text: 'Lakhs of page views read "1 seat left" from the cache. The DB does not even notice.', set: { cache: { state: 'hit', sub: 'seats_left = 1' }, db: { state: '', sub: 'seats_left = 1' } }, go: ['u1>app>cache', 'res:cache>app>u1'] },
            { title: 'Riya\'s Buy: atomic in the DB', text: 'Check and decrement in one statement, on the source of truth.', go: ['u1>app>db', 'res:db>app>u1'], after: { db: { state: 'ok', sub: 'seats_left = 0' } }, msg: 'UPDATE workshops SET seats_left = seats_left - 1\nWHERE id = 7 AND seats_left > 0;   -- 1 row' },
            { title: 'Aman\'s Buy: 0 rows', text: 'The condition fails, no ticket. Aman gets "Sold out".', go: ['u2>app>db', 'bad:db>app>u2'], msg: '0 rows → "Sold out"' },
            { title: 'Delete the cache key', text: 'After the write, delete the cache key, so the page shows "Sold out" soon.', go: 'app>cache', after: { cache: { state: '', sub: 'deleted' } }, msg: 'DEL seats:w7' },
          ]},
          { name: 'Long-tail cache (useless)', intro: 'Now imagine a Search service instead of the Checkout service, with every user sending a different query.', steps: [
            { title: 'Miss', text: 'Every query is a new key. Not in the cache.', set: { app: { label: 'Search service' }, cache: { sub: '', state: '' }, db: { sub: '', state: '' } }, go: ['u1>app>cache', 'bad:cache>app', 'app>db'], after: { cache: { state: 'miss', sub: 'MISS' } } },
            { title: 'Another miss', text: 'The second user\'s query is new too. The DB again.', go: ['u2>app>cache', 'bad:cache>app', 'app>db'] },
            { title: 'The result', text: 'The cache RAM filled up with one-time keys, the hit rate is ~1%, the DB load is the same, and every request has one extra hop. Here, tune the search index and the DB instead of adding a cache.', after: { cache: { state: 'warn', sub: 'hit rate ~1%' }, db: { state: 'hot', sub: 'load same' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'How to say it in an interview' },
      { type: 'list', items: [
        '"The profile is read-heavy (~100:1) and repeats, so cache-aside + a 10 min TTL with jitter; delete the key on edit."',
        '"Building the feed takes ~300 ms, so we cache the computed feed, with a single-flight lock on expiry to avoid a stampede."',
        '"Views use write-back: Redis INCR, flushed every 5 s. Counts tied to money go through Kafka, because no loss is allowed there."',
        '"Decisions on seats and balances always use a conditional update in the DB; the cache is only for display."',
      ]},
      { type: 'diagram', title: 'Caching at xyz.com: the whole picture', height: 490,
        groups: [
          { label: 'Users', x: 20, y: 14, w: 680, h: 74 },
          { label: 'Edge + app', x: 4, y: 108, w: 712, h: 96 },
          { label: 'Cache + data', x: 4, y: 236, w: 712, h: 100 },
          { label: 'Background jobs', x: 4, y: 370, w: 712, h: 106 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'app + browser', x: 360, y: 50, w: 170, kind: 'client', info: 'What it is: xyz.com\'s users. They view profiles, buy seats, watch videos (views), and use trending and search. Each one has a different cache decision.' },
          { id: 'cdn', label: 'CDN edges', sub: 'trending, score', x: 110, y: 165, w: 160, kind: 'edge', info: 'What it is: cache servers near the users. Only public responses that are the same for everyone (trending list, live score), with a short TTL. No personal data here.' },
          { id: 'app', label: 'App servers', sub: 'local: hot keys', x: 400, y: 165, w: 190, kind: 'server', info: 'What it is: xyz.com\'s code. The cache-aside logic lives here; a 1-2 s local in-process copy of hot keys like a celebrity post; and seat/balance decisions go straight to the DB.' },
          { id: 'redis', label: 'Redis cluster', sub: 'profile, feed, views', x: 150, y: 300, w: 170, kind: 'cache', info: 'What it is: the shared cache. Profiles (cache-aside + TTL), computed feeds, view counters (INCR), and copies of hot keys on different nodes.' },
          { id: 'db', label: 'Database', sub: 'source of truth', x: 430, y: 300, w: 160, kind: 'data', info: 'What it is: the real data. Cache misses come here, and decisions like seats/balances are always made here with an atomic conditional update.' },
          { id: 'search', label: 'Search index', sub: 'long tail: no cache', x: 620, y: 300, w: 150, kind: 'data', info: 'What it is: the search engine. Most queries are long tail, so results are not cached; only a small cache for the top popular queries.' },
          { id: 'trend', label: 'Trending job', sub: 'precompute', x: 150, y: 430, w: 160, kind: 'queue', info: 'What it is: a job that runs every 5 minutes. It builds the trending list and writes it straight into the cache, so no user waits on a miss.' },
          { id: 'flush', label: 'Flush job', sub: 'write-back, 5 s', x: 430, y: 430, w: 150, kind: 'queue', info: 'What it is: every 5 seconds it writes Redis\'s view counters to the DB in one batch write. If Redis goes down, at most ~5 s of views can be lost.' },
        ],
        edges: [
          { a: 'users', b: 'cdn', label: 'public' },
          { a: 'users', b: 'app', n: 1 },
          { a: 'cdn', b: 'app', dashed: true, label: 'miss' },
          { a: 'app', b: 'redis', n: 2, label: 'GET / SET' },
          { a: 'app', b: 'db', n: 3, label: 'decisions' },
          { a: 'app', b: 'search', label: 'search' },
          { a: 'trend', b: 'redis', kind: 'evt' },
          { a: 'redis', b: 'flush', kind: 'evt', label: 'views' },
          { a: 'flush', b: 'db', kind: 'evt', label: 'batch' },
        ],
        paths: [
          { name: 'Profile (cache-aside)', text: 'Check Redis; on a miss, fetch from the DB and SET it with a TTL. Delete the key on edit.', go: ['users>app>redis', 'app>db'] },
          { name: 'Buy seat (DB decides)', text: 'The page shows "1 seat left" from the cache, but the decision to give a seat is an atomic update in the DB.', go: ['users>app>db'] },
          { name: 'Views (write-back)', text: 'Every view is a Redis INCR; the flush job does one batch write to the DB every 5 s.', go: ['users>app>redis', 'redis>flush>db'] },
          { name: 'Trending + search', text: 'Trending is precomputed into the cache and onto the CDN. Search is long tail, straight from the index.', go: ['trend>redis', 'users>cdn>app', 'app>search'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Three questions: <strong>decision or display?</strong> <strong>reads ≫ writes?</strong> <strong>do the same keys repeat?</strong></li>
        <li>Default: <strong>cache-aside + TTL</strong> (with jitter), delete the key on write.</li>
        <li>A costly result (feed, recommendations) = cache the computed result, and guard against a stampede.</li>
        <li>Counters (views, likes) = write-back: Redis INCR + batch flush; not for money.</li>
        <li>Long tail = a low hit rate; skip the cache, cache only the "head".</li>
        <li>Decisions on money, seats and stock always come from the source of truth; the cache is display only.</li>
        <li>Hot key = copies on different nodes + a local in-process cache + a CDN (if public).</li>
        <li>The hit rate depends on how much the traffic leans (Zipf s): at s = 1, a 1% cache ≈ 68% hits.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'A cache in the right place: reads 10x+ faster, up to 10 times less DB load',
        'Caching computed results: a costly computation done once, used many times',
        'Write-back: lakhs of counter writes become a few thousand on the DB',
        'CDN / local cache / replicated keys: even hot keys are handled',
      ], costs: [
        'Every cache = some window of stale data; invalidation on every write path',
        'On a long tail: RAM costs, almost zero benefit, and one extra hop',
        'With write-back, a crash = losing some acknowledged writes',
        'Deciding from the cache (money, seats) = bugs like overselling / double spending',
        'One more system that can fail; if it fails, all the load suddenly hits the DB',
      ]},
      { type: 'think', questions: [
        { q: 'xyz.com\'s "Trending today" list is built by a batch job every 10 minutes and shows on every homepage. Which strategy?', a: 'It is a computed result, the same for everyone, and 10 minutes old is fine. Let the batch job write the result straight into the cache (precompute), TTL ~15 min. If the response is public, put it on the CDN too. You do not even need cache-aside, because the result is already built.' },
        { q: 'A user changed their profile photo, but kept seeing the old photo for 10 minutes. You had set up cache-aside + a 10 min TTL. Give two fixes.', a: '1) Delete the cache key along with the write (the next read is fresh from the DB). 2) Or write-through: update the cache along with the DB. And if the photo comes from a CDN, give the new photo a new URL (a version/hash), so the old cached copy is never a problem.' },
        { q: 'You count views in Redis and flush every 5 seconds. Redis crashed. How much is lost, and when is that not acceptable?', a: 'At most ~5 seconds of views (the count in that window) can be lost. Fine for a view count. Not acceptable when money is tied to the count (a creator\'s ad revenue per view): then write events to a durable log (Kafka) and aggregate from there, or use Redis persistence (AOF) + a replica.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'In which case does adding a cache help the least?', options: ['A product page that lakhs of people view every day', 'The result of each user\'s unique, one-time search query', 'The homepage trending list'], answer: 1, explain: 'Long tail: every key is used once, so the hit rate is very low. The cache eats RAM and adds complexity, with no benefit.' },
        { q: '1 lakh writes/sec on a likes count. Strategy?', options: ['A DB UPDATE on every like', 'Write-back: Redis INCR + batch flush', 'Cache-aside + TTL'], answer: 1, explain: 'A write-heavy counter: count in Redis, write to the DB in batches. Accept a small risk of loss.' },
        { q: 'At checkout, where do you read whether a seat is available?', options: ['The Redis cache', 'The CDN', 'An atomic conditional update in the source of truth (DB)'], answer: 2, explain: 'Never make a decision on a copy that can be old. The cache is only for display.' },
        { q: 'Lakhs of reads on one celebrity post, and one Redis node is at 100% CPU. What do you do?', options: ['Raise the TTL', 'Copies of the hot key on different nodes + a local in-process cache', 'Remove the cache'], answer: 1, explain: 'One key lives on one node; copies and a local cache spread the load. If it is public, a CDN too.' },
      ]},
      { type: 'sources', note: 'The decision table comes from roadmap phase 5. The simulator\'s maths: the hit rate of an ideal "top-C keys" cache on a Zipf distribution, verified in node.', items: [
        { title: 'Caching patterns (cache-aside, write-through, write-behind)', publisher: 'AWS whitepaper: Database Caching Strategies Using Redis', official: true, url: 'https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html', used: 'Definitions and trade-offs of cache-aside (lazy loading) and write-through.' },
        { title: 'Web Caching and Zipf-like Distributions: Evidence and Implications', publisher: 'Breslau et al., IEEE INFOCOM 1999', url: 'https://pages.cs.wisc.edu/~cao/papers/zipf-implications.html', used: 'Web requests are Zipf-like (exponent ~0.6-0.9 in the traces), hence "Normal web" s = 0.8 in the simulator; the hit rate grows slowly (roughly like a log) with cache size.' },
      ]},
    ],
  });
})();
