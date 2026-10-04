Lesson.register({
  id: 'caching-strategies',
  title: 'Cache strategies and eviction',
  minutes: 38,
  summary: `Adding a cache is easy; running it well is hard. In this lesson: where to keep caches, how to write (cache-aside, read-through, write-through, write-back, write-around), who leaves when memory is full (LRU, LFU, FIFO, TTL), how to remove old data, and what to do when lakhs of requests hit the database the moment one key expires (stampede), or when the whole world reads one single key (hot key).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In the last lesson we put a fast "memory" (a cache) in front of the database. Now the real questions come.<br>When some data <strong>changes</strong>, do we change the cache first or the database? When the cache is <strong>full</strong>, what do we throw out? When a very popular item <strong>disappears</strong> from the cache, how do we stop thousands of people from hitting the database at the same moment?<br>In this lesson every question comes with a small game (a simulator). Run each method yourself and see when it wins and when it loses.` },
    { type: 'h2', text: 'The story so far' },
    { type: 'p', html: `In the last lesson xyz.com put a <strong>Redis cache</strong> in front of its database. The pattern was simple: look in the cache first; if it is not there, get it from the database and keep it in the cache (with a TTL). The database load fell 10 times. Party.` },
    { type: 'p', html: `But traffic grew, and new questions came up that the simple pattern cannot solve:` },
    { type: 'list', items: [
      '<strong>How do we write?</strong> Riya edited a post. Do we update the DB first or the cache? Update the cache, or delete it? The wrong order = old data shown for hours.',
      '<strong>Memory is full.</strong> Redis has 16 GB of RAM, but the data is 200 GB. To store a new item, what do we throw out?',
      '<strong>Stampede.</strong> The "trending" key of the home page expires every 5 minutes. The moment it expires, 2,000 requests hit the database together and the DB shakes.',
      '<strong>Hot key.</strong> A cricketer posted on xyz.com. One single key gets 5 lakh reads per second. One Redis node cannot handle that.',
    ]},
    { type: 'p', html: `Each problem has its own tool. Let us go one by one.` },

    { type: 'h2', text: 'Where can we keep a cache?' },
    { type: 'p', html: `A cache is not only Redis. On its way from the user to the database, a request passes through many places, and each place can have a cache. The closer to the user, the faster, but also the less control we have.` },
    { type: 'callout', tone: 'term', title: 'New word: In-process (local) cache', html: `<strong>What it is:</strong> a small map (key → value) with expiry, kept <strong>in the app server's own RAM</strong>, inside the same program. For example the Caffeine library in Java, or a dict in Python.<br><strong>Why we need it:</strong> there is no network call, so it is the fastest (less than a microsecond). Best for very popular data that rarely changes.<br><strong>Without it:</strong> even tiny things (config, feature flags) need a network hop to Redis.<br><strong>The catch:</strong> each server has its own separate copy. 50 servers = 50 copies, and updating them all together is hard.` },
    { type: 'callout', tone: 'term', title: 'New word: Distributed cache', html: `<strong>What it is:</strong> a separate cache server (or a group of servers, called a cluster) that <strong>all</strong> app servers share. For example Redis or Memcached.<br><strong>Why we need it:</strong> when one server stores a value, the other servers can read it too. The data is in one place, as one copy.<br><strong>Without it:</strong> each app server fills its own copy, the hit rate is low, and all the copies differ.<br><strong>The cost:</strong> a network hop every time (~0.5-1 ms), and one more system that can fall over.` },
    { type: 'ascii', text: `
User's phone/browser    ──>   CDN edge   ──>   App server   ──>   Redis   ──>   Database
 [browser cache]            [edge cache]     [in-process]     [distributed]   (source of truth)
   ~0 ms                     ~5-20 ms          ~0.001 ms        ~0.5-1 ms        ~5-10 ms
   only that user            same for all      only that        shared by        the real data
                                               server           all servers` , caption: 'A cache at every layer. The numbers are rough orders of magnitude.' },
    { type: 'table', head: ['Layer', 'What we keep there', 'Benefit', 'Problem'], rows: [
      ['Browser / app', 'Images, JS/CSS, sometimes API responses (through the Cache-Control header)', 'The request never goes over the network', 'The server cannot invalidate it; only the TTL helps'],
      ['CDN', 'Things that are the same for everyone: images, video, public JSON', 'Close to the user, all over the world', 'No personal data; a purge takes time'],
      ['App memory (local)', 'Small, very popular, rarely changing data: config, feature flags, hot keys', 'Nanoseconds; no network', 'Each server has its own copy; copies can disagree; empty after a restart'],
      ['Distributed (Redis)', 'Profiles, sessions, feeds, counters', 'One copy for all servers; large size', 'A network hop; one more system that can fall over'],
    ]},
    { type: 'callout', tone: 'tip', html: `Real systems <strong>combine</strong> layers: a CDN for static things, Redis for shared data, and a 1-5 second local cache only for 2-3 super-hot keys. The next lesson (CDN) looks at the first layer in detail.` },

    { type: 'h2', text: 'Read and write strategies' },
    { type: 'p', html: `Data lives in both the cache and the database. The question is: <em>who updates whom, and when?</em> There are five famous patterns. Knowing the names matters less than understanding where the data goes first in each one, and what survives a crash.` },
    { type: 'table', head: ['Strategy', 'On read', 'On write', 'In one line'], rows: [
      ['<strong>Cache-aside</strong> (lazy loading)', 'The app looks in the cache; on a miss the app gets it from the DB and fills the cache', 'The app updates the DB, then <strong>deletes</strong> the cache key', 'The app is the boss. The most common default.'],
      ['<strong>Read-through</strong>', 'The app asks only the cache; on a miss <em>the cache itself</em> gets it from the DB', '(Usually together with write-through)', 'Like cache-aside, but the loading code lives in the cache layer'],
      ['<strong>Write-through</strong>', 'From the cache', 'In both the cache and the DB, <em>together</em>, then OK', 'The cache is always fresh, writes are slow'],
      ['<strong>Write-back</strong> (write-behind)', 'From the cache', 'Only in the cache, OK right away; into the DB later in a batch', 'Writes are super fast, risk of data loss on a crash'],
      ['<strong>Write-around</strong>', 'Like cache-aside', 'Straight into the DB, do not touch the cache at all', 'For data that is rarely read after it is written'],
    ]},
    { type: 'callout', tone: 'term', title: 'New words: read path, write path, "OK" (acknowledge)', html: `<strong>Read path:</strong> the places a request passes through when we read data. <strong>Write path:</strong> the places it passes through when we write or change data.<br><strong>Giving "OK" (acknowledge):</strong> the server telling the user "done, it is saved". The real question is: when we said OK, <em>how far</em> had the data got? Only into RAM, or also into the database (disk)?<br><strong>Why it matters:</strong> if there is a crash after OK and the data was only in RAM, the user's "saved" data is gone. This one question is what makes the five strategies different.` },
    { type: 'p', html: `Now let us look at all five, one by one. One example for all of them: the <strong>likes</strong> of post 7 on xyz.com. Assume one cache operation takes ~1 ms and one database operation ~10 ms.` },
    { type: 'h3', text: '1. Cache-aside (lazy loading)' },
    { type: 'p', html: `<strong>How:</strong> the app itself talks to both the cache and the database. Read: look in the cache; on a miss get it from the DB and fill the cache. Write: update the DB, then <strong>delete</strong> the cache key.<br><strong>Numbers:</strong> read hit 1 ms; read miss 1 + 10 + 1 = 12 ms; write 10 + 1 = 11 ms. 1,000 likes = 1,000 DB writes, and the read after each like is a miss.<br><strong>Benefit:</strong> simple; if the cache falls over, the app still works from the DB; only items that were asked for go into the cache.<br><strong>Cost:</strong> the first read of every new or deleted item is slow (a miss); one rare race condition (see the flow below).<br><strong>When:</strong> the default, for most read-heavy things (profiles, posts, product pages).` },
    { type: 'h3', text: '2. Read-through' },
    { type: 'p', html: `<strong>How:</strong> the app asks only the cache layer. On a miss, <em>the cache layer itself</em> gets the data from the DB (through a "loader" function), keeps it, and returns it. The app does not even know about the DB.<br><strong>Numbers:</strong> read hit 1 ms; read miss ~11 ms. The read numbers are the same as cache-aside; the only difference is <em>where</em> the loading code is written.<br><strong>Benefit:</strong> the loading logic is in one place; if you have 20 services, you do not repeat the same code 20 times.<br><strong>Cost:</strong> the cache layer becomes smarter (and more complex); plain Redis does not do this by itself, you need a library or a managed service (like Java's Caffeine LoadingCache, or AWS DAX in front of DynamoDB).<br><strong>When:</strong> when many services read the same data and you want the loading in one place.` },
    { type: 'h3', text: '3. Write-through' },
    { type: 'p', html: `<strong>How:</strong> every write goes to the cache layer, and the cache layer writes to the DB <em>at the same time</em>. Only when both are done, OK.<br><strong>Numbers:</strong> write 1 + 10 = 11 ms; 1,000 likes = 1,000 DB writes. But reads are always hits (1 ms), because the cache always has the fresh value.<br><strong>Benefit:</strong> the cache is never old (read-after-write is right at once); nothing is lost on a crash, everything is in the DB.<br><strong>Cost:</strong> every write is slow (two places to write); data that will never be read also takes space in the cache.<br><strong>When:</strong> when users must see what they wrote right away and there are not too many writes (profile settings, cart).` },
    { type: 'h3', text: '4. Write-back (write-behind)' },
    { type: 'p', html: `<strong>How:</strong> the write goes only to the cache, OK right away. A background job writes the collected changes into the DB <em>together</em> (in a batch) every few seconds.<br><strong>Numbers:</strong> write 1 ms. 5,000 likes in 10 seconds = 5,000 Redis operations but only <strong>1</strong> DB write (a flush). If Redis falls over before the flush, all likes that were not flushed are gone.<br><strong>Benefit:</strong> writes are very fast; a thousand times fewer writes on the DB.<br><strong>Cost:</strong> a crash = loss of data that already got OK; the DB is a little behind for a while.<br><strong>When:</strong> views, likes, counters, analytics, where a slightly lower count is fine. <strong>Never for money, orders or bookings.</strong>` },
    { type: 'h3', text: '5. Write-around' },
    { type: 'p', html: `<strong>How:</strong> the write goes straight into the DB, and we do <em>not</em> fill the cache at all. Reads work like cache-aside.<br><strong>Numbers:</strong> write 10 ms; the new data is not in the cache, so its first read is a miss (12 ms).<br><strong>Benefit:</strong> the cache is not filled with things that were written but may never be read (this is called <strong>cache pollution</strong>: filling the cache's space with useless data).<br><strong>Cost:</strong> the first read of freshly written data is slow. And if an <em>old</em> copy of this key was already in the cache, you must delete it, or it becomes stale. (That is why the write of cache-aside is really "write-around + delete".)<br><strong>When:</strong> logs, backups, big uploads, old archives: written a lot, read rarely.` },
    { type: 'p', html: `<strong>Try it yourself.</strong> Below is a small lab. Pick a strategy at the top, then press "Read" and "Write (+1 like)". You will see the value inside the cache and the database, how many ms each operation takes, and how many writes reached the DB. Press "Redis crash" to see which strategy loses data:` },
    { type: 'custom', render(el) {
      const T = { modes: { aside: 'Cache-aside', rt: 'Read-through', wt: 'Write-through', wb: 'Write-back', wa: 'Write-around' },
        read: 'Read', write: 'Write (+1 like)', flush: 'Flush (background job)', crash: 'Redis crash', reset: 'Reset',
        app: 'App server', cache: 'Redis cache', db: 'Database', empty: 'empty', unflushed: n => `${n} likes not in the DB yet`,
        stats: ['Last operation', 'DB writes', 'DB reads', 'Hit / miss', 'Likes lost'],
        start: 'Pick a strategy, then press Read / Write.',
        hit: (v, ms) => `Read: cache HIT, likes = ${v} (${ms} ms).`, stale: ' <strong>Careful: this value is different from the database (STALE)!</strong>',
        missApp: (v, ms) => `Read: cache MISS. The app got it from the DB (${v}) and did a SET in the cache (${ms} ms).`,
        missLayer: (v, ms) => `Read: cache MISS. The cache layer got it from the DB by itself (${v}) and kept it. The app does not even know about the DB (${ms} ms).`,
        wAside: (v, ms) => `Write: likes = ${v} in the DB, then the cache key is DELETED (${ms} ms). The next read will miss.`,
        wThrough: (v, ms) => `Write: ${v} in both the cache and the DB, OK only after both are done (${ms} ms).`,
        wBack: (v, ms) => `Write: ${v} only in the cache, OK right away (${ms} ms). The DB does not know yet.`,
        wLoad: ' (the cache was empty first, so the value had to be loaded from the DB)',
        wAround: (v, ms, st) => `Write: ${v} straight into the DB (${ms} ms). The cache was not touched.` + (st ? ' <strong>An old copy is still in the cache: it is now STALE. That is why write-around must also delete the old key.</strong>' : ''),
        flushed: (n, v) => n ? `Flush: the change of ${n} likes went to the DB in <strong>one</strong> write (DB = ${v}).` : 'Flush: nothing was pending.',
        crashed: n => n ? `Redis crash! RAM is empty. <strong>${n} likes are lost</strong>: users already got OK, but the likes never reached the DB.` : 'Redis crash! RAM is empty. But the DB had everything, so nothing was lost. The next read will just miss.',
        notes: { aside: 'Try: Read, Read (hit), Write, Read. The key was deleted after the write, so the next read misses (12 ms) and gets the fresh value.',
          rt: 'Try: Read (miss). The numbers are the same as cache-aside; the difference is that the cache layer does the loading from the DB. Here writes work like write-through.',
          wt: 'Try: Read, Write, Read. The write takes 11 ms, but the read after it is also a HIT and the value is fresh.',
          wb: 'Try: first Read (to fill the cache). Then Write 5 times: 1 ms each, DB writes 0. Then Flush: 1 DB write. Then 3 Writes and "Redis crash": 3 likes are lost.',
          wa: 'Try: Read (the cache fills up), Write, Read. The write did not touch the cache, so the read returns the old value: STALE.' } };
      el.innerHTML = `<div class="cwl-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="cwl-boxes" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary" data-a="read">${T.read}</button>
          <button type="button" class="btn small primary" data-a="write">${T.write}</button>
          <button type="button" class="btn small cwl-flush" data-a="flush">${T.flush}</button>
          <button type="button" class="btn small" data-a="crash">${T.crash}</button>
          <button type="button" class="btn small ghost" data-a="reset">${T.reset}</button>
        </div>
        <div class="stats cwl-st"></div>
        <div class="calc-note cwl-log" style="min-height:2.6em"></div>
        <div class="calc-note cwl-note"></div>`;
      const q = s => el.querySelector(s);
      let mode = 'aside', S;
      const reset = () => { S = { db: 100, c: null, dirty: 0, ms: 0, w: 0, r: 0, hit: 0, miss: 0, lost: 0, log: T.start }; draw(); };
      const act = a => {
        if (a === 'reset') return reset();
        if (a === 'read') {
          if (S.c !== null) { S.hit++; S.ms = 1; S.log = T.hit(S.c, 1) + (mode !== 'wb' && S.c !== S.db ? T.stale : ''); }
          else { S.miss++; S.r++; S.c = S.db; const app = mode === 'aside' || mode === 'wa'; S.ms = app ? 12 : 11; S.log = app ? T.missApp(S.c, S.ms) : T.missLayer(S.c, S.ms); }
        } else if (a === 'write') {
          if (mode === 'aside') { S.db++; S.w++; S.c = null; S.ms = 11; S.log = T.wAside(S.db, 11); }
          else if (mode === 'wt' || mode === 'rt') { S.db++; S.w++; S.c = S.db; S.ms = 11; S.log = T.wThrough(S.db, 11); }
          else if (mode === 'wb') { let extra = 0; if (S.c === null) { S.c = S.db; S.r++; extra = 11; } S.c++; S.dirty++; S.ms = 1 + extra; S.log = T.wBack(S.c, S.ms) + (extra ? T.wLoad : ''); }
          else { S.db++; S.w++; S.ms = 10; S.log = T.wAround(S.db, 10, S.c !== null); }
        } else if (a === 'flush') { const n = S.dirty; if (n) { S.db = S.c; S.w++; S.dirty = 0; } S.ms = null; S.log = T.flushed(n, S.db); }
        else if (a === 'crash') { const n = S.dirty; S.lost += n; S.c = null; S.dirty = 0; S.ms = null; S.log = T.crashed(n); }
        draw();
      };
      const box = (title, val, sub, kind, warn) => `<div style="padding:10px 12px;border-radius:var(--r);border:${warn ? '2px solid var(--red)' : '1px solid var(--' + kind + '-s)'};background:var(--${kind}-f);color:var(--${kind}-t)"><div style="font-size:13px">${title}</div><div style="font:700 22px var(--f-mono)">${val}</div><div style="font-size:12px;color:var(--ink-3);min-height:1.2em">${sub}</div></div>`;
      const draw = () => {
        const mb = q('.cwl-m'); mb.innerHTML = '';
        Object.keys(T.modes).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = T.modes[k]; b.setAttribute('aria-pressed', k === mode); b.onclick = () => { mode = k; reset(); }; mb.appendChild(b); });
        const stale = mode !== 'wb' && S.c !== null && S.c !== S.db;
        q('.cwl-boxes').innerHTML = box(T.app, T.modes[mode], '', 'server') + box(T.cache, S.c === null ? '·' : 'likes ' + S.c, S.c === null ? T.empty : (S.dirty ? T.unflushed(S.dirty) : (stale ? 'STALE' : '')), 'cache', stale) + box(T.db, 'likes ' + S.db, '', 'data');
        q('.cwl-st').innerHTML = [[T.stats[0], S.ms === null ? '-' : S.ms + ' ms'], [T.stats[1], S.w], [T.stats[2], S.r], [T.stats[3], S.hit + ' / ' + S.miss], [T.stats[4], S.lost]].map(([a, b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');
        q('.cwl-log').innerHTML = S.log;
        q('.cwl-note').textContent = T.notes[mode];
        q('.cwl-flush').style.display = mode === 'wb' ? '' : 'none';
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
      reset();
    }},
    { type: 'callout', tone: 'term', title: 'New word: race condition', html: `<strong>What it is:</strong> when two jobs run at almost the same time and the result depends on which one finishes first. Sometimes right, sometimes wrong, and the mistake is hard to repeat.<br><strong>Why here:</strong> if a reader and a writer work on the same key at the same time, the cache can end up with a wrong (old) value. See the last step of "Cache-aside: write" below.<br><strong>Protection:</strong> always use a TTL (it limits how long a mistake lives), delete instead of update on write, and leases in big systems.` },
    { type: 'p', html: `Now run each strategy in the diagram too. Each scenario is one strategy, and in some of them things break on purpose:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'xyz.com app', x: 80, y: 165, w: 120, kind: 'client', info: 'What it is: an xyz.com user (browser or app). Reads posts, likes them, edits the profile. In each strategy the request takes a different road.' },
        { id: 'app', label: 'App server', x: 270, y: 165, w: 140, kind: 'server', info: 'What it is: the server that runs the xyz.com code (business logic). In cache-aside and write-around it decides when to talk to the cache and when to the DB. In read-through/write-through it talks only to the cache layer.' },
        { id: 'cache', label: 'Redis cache', sub: 'RAM, ~1 ms', x: 530, y: 70, w: 170, kind: 'cache', info: 'What it is: the fast cache in RAM (Redis), a temporary copy of the data. In write-back it becomes the ONLY home of the data for a while, so a crash there means data loss.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 530, y: 270, w: 170, kind: 'data', meter: true, load: 35, info: 'What it is: the source of truth, the real and permanent data on disk. Every strategy tries to protect it, but the truth must live here.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'cache', b: 'db', id: 'cd', dashed: true }],
      scenarios: [
        { name: 'Cache-aside: read', intro: 'This is the same pattern we saw in the last lesson. A quick refresh.', steps: [
          { title: 'Request', text: 'The user opens post 7.', go: 'u>app', msg: 'GET /posts/7' },
          { title: 'The app checks the cache: MISS', text: 'The app asks Redis itself. Not found.', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } }, msg: 'GET post:7  →  (nil)' },
          { title: 'The app gets it from the DB itself', text: 'The cache knows nothing about the DB. All the logic is in the app.', go: ['app>db', 'res:db>app'], msg: 'SELECT * FROM posts WHERE id = 7' },
          { title: 'The app fills the cache (with a TTL)', text: 'That is why it is called "cache-aside": the cache sits on the side and the app fills it. Only data that was really asked for goes into the cache (lazy loading).', go: 'app>cache', after: { cache: { state: '', sub: 'post:7 (TTL 300s)' } }, msg: 'SET post:7 {...} EX 300' },
          { title: 'Response', text: 'The next requests will be cache hits.', go: 'res:app>u' },
        ]},
        { name: 'Cache-aside: write', intro: 'Riya edited post 7. What is the right order?', steps: [
          { title: 'Update the database first', text: 'Always write the truth into the source of truth first.', go: ['u>app>db', 'res:db>app'], after: { db: { sub: 'post 7 = v2' } }, msg: 'UPDATE posts SET body = "v2" WHERE id = 7' },
          { title: 'Then DELETE the cache key (do not update it)', text: 'Instead of writing the new value into the cache, remove the key. The next read will miss and bring the fresh value from the DB. Deleting is safe because two writers cannot overwrite each other\'s value.', go: 'app>cache', after: { cache: { sub: 'post:7 deleted' } }, msg: 'DEL post:7' },
          { title: 'Next read: miss, fresh value', text: 'Miss → DB → v2 into the cache. All correct.', go: ['u>app>cache', 'bad:cache>app', 'app>db', 'res:db>app', 'app>cache', 'res:app>u'], after: { cache: { state: 'hit', sub: 'post:7 = v2' } } },
          { title: 'But there is a hidden race condition', text: 'It is very rare, but it happens: reader A got a miss, read the <strong>old v1</strong> from the DB, and then became slow. Meanwhile a writer wrote v2 and deleted the key. Now A wakes up and SETs v1 into the cache. v1 stays stuck in the cache until the TTL ends. That is why you always keep a TTL (a safety net). In its memcache paper, Facebook stopped this "stale set" with <strong>leases</strong>: on a miss the cache gives a token, and if a delete happens in between, the token becomes invalid and the SET is rejected.', focus: ['cache'], set: { cache: { state: 'warn', sub: 'v1 is back!' } } },
        ]},
        { name: 'Read-through', intro: 'The app does not even know about the DB. It talks only to the cache layer.', steps: [
          { title: 'The app asks only the cache', text: 'The app code only says <code>cache.get(7)</code>.', hide: ['app-db'], go: 'u>app>cache', msg: 'cache.get("post:7")' },
          { title: 'Miss: the cache layer gets it from the DB itself', text: 'The cache layer (a library or a special caching service) knows which loader to run on a miss. Plain Redis does not do this; you need a library (like Java\'s Caffeine LoadingCache) or a managed layer (like AWS DAX in front of DynamoDB).', go: ['cache>db', 'res:db>cache'], after: { cache: { sub: 'loaded post:7' } }, msg: 'loader("post:7") → SELECT ...' },
          { title: 'The value goes to the app', text: 'Benefit: the loading logic is in one place, no need to copy it into every service. Cost: the cache layer has become smarter (and more complex).', go: 'res:cache>app>u' },
        ]},
        { name: 'Write-through', intro: 'Every write passes through the cache on its way to the DB.', steps: [
          { title: 'The write goes to the cache layer', go: 'u>app>cache', text: 'The user changed the profile name.', msg: 'cache.put("user:42", {name: "Riya S"})' },
          { title: 'The cache layer writes to the DB at the same time', text: 'The user waits until the DB write succeeds.', go: ['cache>db', 'res:db>cache'], after: { db: { sub: 'name = Riya S' }, cache: { state: 'hit', sub: 'name = Riya S' } } },
          { title: 'Then OK', text: 'Benefit: both the cache and the DB are fresh at once, and the user sees the new name right away. Cost: every write goes to two places (slow), and data that will never be read also takes space in the cache. That is why it is usually combined with a TTL.', go: 'res:cache>app>u' },
        ]},
        { name: 'Write-back (works)', intro: 'Views and likes of a video: thousands of +1 every second. A DB write on every +1 = the DB will choke.', steps: [
          { title: 'Likes only in Redis', text: 'Each like increases an atomic counter in Redis. The user gets OK at once. The DB does not even know.', go: ['u>app>cache', 'res:cache>app>u'], after: { cache: { sub: 'likes:7 = +1,000' } }, msg: 'INCR likes:7' },
          { title: 'Thousands more likes', text: '1,000 likes, 1,000 Redis operations, 0 DB writes.', flood: { paths: ['u>app>cache'], n: 10 }, after: { cache: { state: 'hot', sub: 'likes:7 = +5,000' } } },
          { title: 'A batch flush every 10 seconds', text: 'A background job takes the total from Redis and makes <strong>one</strong> write to the DB. 5,000 writes → 1 write.', go: 'evt:cache>db', after: { cache: { state: '', sub: 'likes:7 flushed' }, db: { sub: 'likes = 85,000' } }, msg: 'UPDATE posts SET likes = likes + 5000 WHERE id = 7' },
        ]},
        { name: 'Write-back crash', intro: 'The same setup, but Redis falls over before the flush.', steps: [
          { title: 'Likes are piling up in Redis', go: ['u>app>cache', 'res:cache>app>u'], text: 'The users have already got OK.', after: { cache: { sub: 'likes:7 +4,200 pending' } } },
          { title: 'Redis crash', text: 'The process died, or the machine restarted. RAM is empty.', set: { cache: { state: 'down', sub: 'DOWN' } }, go: 'lost:cache>db' },
          { title: '4,200 likes are gone', text: 'The DB has the old number. We told users OK, but the data was never written anywhere safe. This is the price of write-back. It is fine for likes/views (a slightly lower count), <strong>never for money, orders or bookings</strong>. To lower the risk: a short flush interval, Redis persistence (AOF), and a replica.', focus: ['db'], set: { db: { state: 'warn', sub: 'likes = 80,800 (old)' } } },
        ]},
        { name: 'Write-around', intro: 'A user uploaded a 2 GB log/backup. Hardly anyone will read it again.', steps: [
          { title: 'The write goes straight to the DB', text: 'The cache was not touched. So the cache does not fill up with things that will never be read (cache pollution).', go: ['u>app>db', 'res:db>app>u'], set: { cache: { state: 'dim' } } },
          { title: 'First read: miss', text: 'If it is ever read, the first read will miss, and then it fills the cache like cache-aside. Careful: if an old value of this key was already in the cache, do not forget to delete it, or it will be stale.', go: ['u>app>cache', 'bad:cache>app', 'app>db', 'res:db>app'], set: { cache: { state: 'miss', sub: 'MISS' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "just UPDATE the cache on write"', html: `It seems easy: "I wrote to the DB, so I will also SET the new value in the cache, and there will be no miss". The problem: two writers at the same time. Writer 1 writes A to the DB, writer 2 writes B. But the SETs reach the cache in the opposite order: first B, then A. Now the DB has B, the cache has A, and this mistake stays until the TTL ends. With <strong>delete</strong>, the order does not matter: both delete, and the next read brings the correct value from the DB.` },
    { type: 'callout', tone: 'why', title: 'DB first, then delete the cache. Why not the other way round?', html: `If you delete the cache first and then update the DB: in the small gap between them, a reader can miss, read the <em>old</em> value from the DB, and put it into the cache. Even after the DB update, the cache has old data. DB first, then delete: the gap becomes small (only the rare race above is left). Some teams also do "delete, update the DB, then delete again a little later" (delayed double delete).` },
    { type: 'h2', text: 'Memory is full: eviction' },
    { type: 'p', html: `Redis lives in RAM, and RAM is costly. When the memory limit (in Redis, <code>maxmemory</code>) is reached and a new item comes, some old item must go. Which one? The <strong>eviction policy</strong> decides. A good policy keeps the items that will be asked for again soon.` },
    { type: 'callout', tone: 'term', title: 'New word: eviction', html: `<strong>What it is:</strong> when the cache is full and a new item comes, <em>throwing out</em> an old item to make space.<br><strong>Why we need it:</strong> RAM is limited. 200 GB of data does not fit in 16 GB.<br><strong>Without it:</strong> once the cache is full, either you cannot store new items at all (errors on writes), or memory runs out and the server crashes.<br><strong>Which policy is good:</strong> one that keeps items that will be asked for again soon, and throws out items that will probably never be asked for.` },
    { type: 'p', html: `We will look at four policies. One small example for all of them: the cache has <strong>3 slots</strong>. Requests come in this order: <code>A B C A D</code> (A, B, C... are keys of different posts). After the first four, the cache has A, B, C, and A has been used twice. Now D comes and the cache is full. Who leaves?` },
    { type: 'h3', text: 'LRU (Least Recently Used)' },
    { type: 'p', html: `<strong>Rule:</strong> throw out the item that has not been used for the <em>longest time</em>. The idea: "what you saw recently, you will see again."<br><strong>Example:</strong> last use: A = request 4, B = request 2, C = request 3. B's use is the oldest. <strong>B leaves.</strong><br><strong>Inside:</strong> a list where each used item moves to the front; we remove from the back. Every operation is fast (O(1)).<br><strong>Benefit:</strong> works well for most websites, and adjusts at once when the trend changes.<br><strong>Cost:</strong> one big "scan" (a job reading all old items once each) throws out even the hot items.` },
    { type: 'h3', text: 'LFU (Least Frequently Used)' },
    { type: 'p', html: `<strong>Rule:</strong> throw out the item that has been used the <em>fewest times</em>. The idea: "what is popular will stay popular."<br><strong>Example:</strong> counts: A = 2, B = 1, C = 1. B and C are equal; on a tie, the one used longer ago (B). <strong>B leaves.</strong> (Same as LRU here, but the simulator below shows the difference.)<br><strong>Benefit:</strong> popular items survive one-time scans.<br><strong>Cost:</strong> yesterday's viral item, with a huge count, stays stuck even if nobody asks for it today. That is why real LFU lowers the counts over time (decay).` },
    { type: 'h3', text: 'FIFO (First In, First Out)' },
    { type: 'p', html: `<strong>Rule:</strong> the item that <em>came in first</em> leaves first. How much it is used does not matter.<br><strong>Example:</strong> order of arrival: A (1), B (2), C (3). <strong>A leaves</strong>, even though A was just used and is the most popular.<br><strong>Benefit:</strong> the simplest: just one line (a queue), no counting or updates.<br><strong>Cost:</strong> it throws out popular items without thinking, so the hit rate is often lower.` },
    { type: 'h3', text: 'TTL-based (expiry, and volatile-ttl)' },
    { type: 'p', html: `TTL is used in two ways. (1) <strong>Expiry:</strong> as soon as a key's timer ends, the key is deleted by itself, even if memory is free. This is for <em>freshness</em>, not for space. (2) <strong>TTL-based eviction</strong> (in Redis, <code>volatile-ttl</code>): when memory is full, among the keys that have a TTL, throw out the one whose timer ends <em>soonest</em>. The idea: "it was going to leave anyway."<br><strong>Example:</strong> A has 200 s left, B 30 s, C 90 s. D comes: <strong>B leaves</strong> (least time left).<br><strong>Benefit:</strong> you tell the cache through the TTL how important each key is.<br><strong>Cost:</strong> it does not look at popularity; keys without a TTL will never be removed.` },
    { type: 'callout', tone: 'tip', title: 'More policies (one line each)', html: `<strong>Random:</strong> throw out any random key; cheap, and sometimes surprisingly fine. <strong>ARC</strong> (Adaptive Replacement Cache): keeps both a recent list and a frequent list, and decides by itself how much space to give each. <strong>W-TinyLFU</strong> (in Java's Caffeine library): uses a small "door-keeper" to estimate how popular a new item is, and lets it in only if it is more popular than the item that would leave. It handles both scans and changing trends well.` },
    { type: 'p', html: `Learn by running it, not just reading. Below is a small cache (2-4 slots). Requests come in a fixed sequence (A, B, C... are keys of different posts). Change the policy, change the capacity, and see who leaves and what hit rate you get:` },
    { type: 'custom', render(el) {
      const PRESETS = {
        mix: { name: 'One popular post + new posts', seq: 'A B A C A D A B E A F B A G A B', note: 'A is the most popular, B a bit less, the rest come once or twice. At capacity 3, FIFO falls behind: it even removes A just because A "came in first", even if A was used a moment ago. LRU and LFU both protect A.' },
        scan: { name: 'A scan in the middle', seq: 'A B A B A C A B D E F G A B A B', note: 'A and B are hot. In the middle, D, E, F, G come once each (like a report job reading all old posts). At capacity 3, LRU removes even A and B to make room for these one-time keys (scan pollution). LFU remembers that A and B come again and again, so it protects them and wins.' },
        shift: { name: 'The trend changed', seq: 'A A A A B A A C D E D E C D E C', note: 'First A was viral, then everyone started watching C, D, E. At capacity 3, LFU has such a big count for A that A never leaves, even though nobody asks for it now. One slot stays stuck and wasted. LRU changes with the new trend right away. That is why real LFU (like the one in Redis) lowers old counts over time (decay).' },
      };
      const POL = { LRU: 'LRU', LFU: 'LFU', FIFO: 'FIFO' };
      let preset = 'mix', pol = 'LRU', cap = 3, i = 0;
      const sim = (seq, n, c, p) => {
        let cache = [], hits = 0, last = null;
        for (let t = 0; t < n; t++) {
          const k = seq[t], e = cache.find(x => x.k === k);
          if (e) { hits++; e.t = t; e.f++; last = { k, hit: true }; continue; }
          let victim = null;
          if (cache.length >= c) {
            let v;
            if (p === 'LRU') v = cache.reduce((a, b) => b.t < a.t ? b : a);
            else if (p === 'FIFO') v = cache.reduce((a, b) => b.ins < a.ins ? b : a);
            else v = cache.reduce((a, b) => (b.f < a.f || (b.f === a.f && b.t < a.t)) ? b : a);
            victim = v; cache = cache.filter(x => x !== v);
          }
          cache.push({ k, t, f: 1, ins: t });
          last = { k, hit: false, victim };
        }
        return { cache, hits, last };
      };
      el.innerHTML = `<div class="csx-row" data-r="preset" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center"><span style="font-size:14px;color:var(--ink-3)">Policy:</span><span class="csx-pol" style="display:flex;gap:8px;flex-wrap:wrap"></span><span style="font-size:14px;color:var(--ink-3);margin-left:6px">Capacity:</span><span class="csx-cap" style="display:flex;gap:8px"></span></div>
        <div class="csx-seq" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px"></div>
        <div style="margin-top:14px;font-size:14px;color:var(--ink-3)">Cache slots:</div>
        <div class="csx-slots" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px"></div>
        <div class="csx-log calc-note" style="min-height:2.6em"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary csx-next">Next request</button>
          <button type="button" class="btn small ghost csx-all">Run all</button>
          <button type="button" class="btn small ghost csx-reset">Reset</button>
        </div>
        <div class="stats"><div class="stat"><span>Hits</span><strong class="csx-h"></strong></div><div class="stat"><span>Misses</span><strong class="csx-m"></strong></div><div class="stat"><span>Hit rate</span><strong class="csx-hr"></strong></div></div>
        <div class="csx-cmp calc-note"></div>
        <div class="csx-note calc-note"></div>`;
      const q = s => el.querySelector(s);
      const chipRow = (box, map, get, set) => {
        box.innerHTML = '';
        Object.keys(map).forEach(k => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = map[k];
          b.setAttribute('aria-pressed', get() === k);
          b.onclick = () => { set(k); i = 0; draw(); };
          box.appendChild(b);
        });
      };
      const draw = () => {
        const P = PRESETS[preset], seq = P.seq.split(' ');
        chipRow(q('[data-r="preset"]'), Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.name])), () => preset, k => preset = k);
        chipRow(q('.csx-pol'), POL, () => pol, k => pol = k);
        chipRow(q('.csx-cap'), { 2: '2', 3: '3', 4: '4' }, () => String(cap), k => cap = Number(k));
        const r = sim(seq, i, cap, pol);
        q('.csx-seq').innerHTML = seq.map((k, t) => {
          let st = 'border:1px solid var(--line);color:var(--ink-3)';
          if (t < i) { const hit = sim(seq, t + 1, cap, pol).last.hit; st = hit ? 'border:2px solid var(--green);color:var(--ink)' : 'border:2px solid var(--red);color:var(--ink)'; }
          if (t === i) st = 'border:2px solid var(--accent);background:var(--accent-soft);color:var(--ink)';
          return `<span style="font:600 14px var(--f-mono);padding:4px 8px;border-radius:var(--r-sm);${st}">${k}</span>`;
        }).join('');
        const meta = c => pol === 'LRU' ? `last use: #${c.t + 1}` : pol === 'LFU' ? `count: ${c.f}` : `came in: #${c.ins + 1}`;
        const slots = [];
        for (let s = 0; s < cap; s++) {
          const c = r.cache[s];
          slots.push(`<div style="min-width:76px;padding:8px 10px;border-radius:var(--r);border:1px solid var(--cache-s);background:var(--cache-f);text-align:center"><div style="font:700 20px var(--f-mono);color:var(--cache-t)">${c ? c.k : '·'}</div><div style="font-size:12px;color:var(--ink-3)">${c ? meta(c) : 'empty'}</div></div>`);
        }
        q('.csx-slots').innerHTML = slots.join('');
        const L = r.last;
        q('.csx-log').innerHTML = i === 0 ? 'Press "Next request". Green border = hit, red = miss.' :
          L.hit ? `Request #${i}: <strong>${L.k}</strong> was found in the cache. <strong>HIT</strong>.` :
          `Request #${i}: <strong>${L.k}</strong> was not found. <strong>MISS</strong>, loaded from the DB.` + (L.victim ? ` The cache was full, so ${pol} removed <strong>${L.victim.k}</strong> (${pol === 'LRU' ? 'it had not been used for the longest time' : pol === 'LFU' ? 'it had been used the fewest times' : 'it came in first'}).` : ' There was free space, so nothing had to be removed.');
        q('.csx-h').textContent = r.hits;
        q('.csx-m').textContent = i - r.hits;
        q('.csx-hr').textContent = i ? Math.round(100 * r.hits / i) + '%' : '-';
        const all = Object.keys(POL).map(p => ({ p, h: sim(seq, seq.length, cap, p).hits }));
        const best = Math.max(...all.map(a => a.h));
        q('.csx-cmp').innerHTML = `Whole sequence (${seq.length} requests), capacity ${cap}: ` + all.map(a => `${a.p} <strong>${a.h}/${seq.length}</strong>${a.h === best ? ' (best)' : ''}`).join(' · ');
        q('.csx-note').textContent = P.note;
        q('.csx-next').disabled = i >= seq.length;
        q('.csx-all').disabled = i >= seq.length;
      };
      q('.csx-next').onclick = () => { i++; draw(); };
      q('.csx-all').onclick = () => { i = PRESETS[preset].seq.split(' ').length; draw(); };
      q('.csx-reset').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'p', html: `The lesson: no policy always wins. It all depends on the access pattern. On most websites "what you just saw, you will see again" is true, so <strong>LRU</strong> is the most common default. Where big scans come now and then, LFU is better.` },
    { type: 'p', html: `The simulator above was for LRU, LFU and FIFO. TTL has its own game below. Again the cache has 3 slots. Store keys (each with a different TTL), move time with "Clock +20 s", and watch: (1) a key disappears by itself when its timer ends, (2) when the cache is full, <code>noeviction</code> (the Redis default) gives an <em>error</em> for the new write, while <code>volatile-ttl</code> throws out the key that expires soonest:` },
    { type: 'custom', render(el) {
      const T = { pol: { noev: 'noeviction (default)', vttl: 'volatile-ttl' }, tick: 'Clock +20 s', reset: 'Reset', clock: 'Clock', used: 'Slots used', none: 'no TTL', left: 'left', empty: 'empty',
        set: (k, t) => `SET ${k}` + (t ? ` (TTL ${t} s)` : ' (no TTL)'),
        ok: (k, t) => `${k} stored` + (t ? `, it will expire in ${t} s.` : `, it will never expire.`),
        oom: k => `Cache full! <strong>(error) OOM command not allowed when used memory > 'maxmemory'</strong>. ${k} was not stored. This is what Redis does by default, which is why you must change the policy for a cache.`,
        oomNoTtl: k => `Cache full, and no key has a TTL. volatile-ttl has nothing to remove: <strong>OOM error</strong>, ${k} was not stored.`,
        ev: (k, v, r) => `The cache was full. volatile-ttl removed <strong>${v}</strong> (only ${r} s were left, the least). Then ${k} was stored.`,
        exp: l => l.length ? `The clock moved on: the timer of ${l.join(', ')} ended, deleted automatically.` : 'The clock moved on. No key expired.',
        start: 'Start with: SET A, SET B, SET C. Then press SET D.' };
      const KEYS = [['A', 200], ['B', 30], ['C', 90], ['D', 120], ['E', 0]];
      const CAP = 3;
      el.innerHTML = `<div class="cttl-p" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="cttl-k" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary cttl-t">${T.tick}</button><button type="button" class="btn small ghost cttl-r">${T.reset}</button></div>
        <div class="cttl-slots" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px"></div>
        <div class="stats cttl-st"></div>
        <div class="calc-note cttl-log" style="min-height:2.6em"></div>`;
      const q = s => el.querySelector(s);
      let pol = 'vttl', now, keys, log;
      const reset = () => { now = 0; keys = []; log = T.start; draw(); };
      const sweep = () => { const gone = keys.filter(k => k.exp !== null && k.exp <= now).map(k => k.k); keys = keys.filter(k => k.exp === null || k.exp > now); return gone; };
      const set = (k, t) => {
        sweep();
        const ex = keys.find(x => x.k === k);
        if (ex) { ex.exp = t ? now + t : null; ex.ttl = t; log = T.ok(k, t); return draw(); }
        if (keys.length >= CAP) {
          if (pol === 'noev') { log = T.oom(k); return draw(); }
          const vol = keys.filter(x => x.exp !== null);
          if (!vol.length) { log = T.oomNoTtl(k); return draw(); }
          const v = vol.reduce((a, b) => b.exp < a.exp ? b : a);
          keys = keys.filter(x => x !== v);
          keys.push({ k, exp: t ? now + t : null, ttl: t }); log = T.ev(k, v.k, v.exp - now); return draw();
        }
        keys.push({ k, exp: t ? now + t : null, ttl: t }); log = T.ok(k, t); draw();
      };
      const draw = () => {
        const pb = q('.cttl-p'); pb.innerHTML = '';
        Object.keys(T.pol).forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (p === pol ? ' on' : ''); b.textContent = T.pol[p]; b.setAttribute('aria-pressed', p === pol); b.onclick = () => { pol = p; reset(); }; pb.appendChild(b); });
        const kb = q('.cttl-k'); kb.innerHTML = '';
        KEYS.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = T.set(k, t); b.onclick = () => set(k, t); kb.appendChild(b); });
        let h = '';
        for (let i = 0; i < CAP; i++) {
          const x = keys[i];
          if (!x) { h += `<div style="padding:10px;border-radius:var(--r);border:1px dashed var(--line-2);color:var(--ink-3);text-align:center;font-size:13px">${T.empty}</div>`; continue; }
          const rem = x.exp === null ? null : x.exp - now, pct = rem === null ? 100 : Math.round(100 * rem / x.ttl);
          h += `<div style="padding:10px;border-radius:var(--r);border:1px solid var(--cache-s);background:var(--cache-f);color:var(--cache-t)"><div style="font:700 20px var(--f-mono)">${x.k}</div><div style="font-size:12px;color:var(--ink-3)">${rem === null ? T.none : rem + ' s ' + T.left}</div><div style="height:6px;border-radius:3px;background:var(--line);margin-top:6px"><div style="height:6px;border-radius:3px;width:${pct}%;background:${rem !== null && rem <= 30 ? 'var(--red)' : 'var(--accent)'}"></div></div></div>`;
        }
        q('.cttl-slots').innerHTML = h;
        q('.cttl-st').innerHTML = `<div class="stat"><span>${T.clock}</span><strong>${now} s</strong></div><div class="stat"><span>${T.used}</span><strong>${keys.length} / ${CAP}</strong></div>`;
        q('.cttl-log').innerHTML = log;
      };
      q('.cttl-t').onclick = () => { now += 20; log = T.exp(sweep()); draw(); };
      q('.cttl-r').onclick = reset;
      reset();
    }},
    { type: 'h3', text: 'Eviction in real Redis' },
    { type: 'list', items: [
      'The Redis default <code>maxmemory-policy</code> is <strong>noeviction</strong>: when memory is full, new writes get an error. For a cache you must change it to <code>allkeys-lru</code> or <code>allkeys-lfu</code>. Many people forget this.',
      'Redis does not run exact LRU (a linked list for every key would eat memory). It takes a <strong>sample</strong> of a few random keys (5 by default) and throws out the oldest of them. According to the docs, this is quite close to real LRU.',
      'Redis LFU (since version 4.0) keeps a small probabilistic counter for each key that <strong>decays</strong> over time, so the "trend changed" problem does not happen.',
      'The <code>volatile-*</code> policies only throw out keys that have a TTL. <code>volatile-ttl</code> throws out the key that expires soonest first.',
    ]},
    { type: 'h2', text: 'Invalidation: how to remove old data' },
    { type: 'p', html: `The cache has a copy; the DB has the real thing. When the real data changes, the copy must be made "invalid". This is called <strong>cache invalidation</strong>. There are five ways, and they are often used together:` },
    { type: 'callout', tone: 'term', title: 'New word: CDC (Change Data Capture)', html: `<strong>What it is:</strong> a database writes every change into a log (a diary). CDC reads that diary and turns every change into an event: "user 42 changed".<br><strong>Why we need it:</strong> a separate service can listen to these events and delete the cache keys. Now you do not have to remember to write a delete on every write path.<br><strong>Without it:</strong> if any one place (the admin panel, a background job, another service) forgets the delete, you get stale data.<br><strong>Example:</strong> a tool like Debezium reads the MySQL/Postgres log and puts events into Kafka.` },
    { type: 'table', head: ['Way', 'How', 'Good when', 'Weakness'], rows: [
      ['TTL expiry', 'A timer on every key, it expires by itself', 'Always, as a safety net', 'Stale until the TTL ends; a short TTL = more misses'],
      ['Delete on write', 'After a write, the app deletes the key', 'The default, with cache-aside', 'You must remember it on every write path; forget it in one place = a bug'],
      ['Write-through update', 'Update the cache together with the write', 'When read-after-write must be right at once', 'Slow writes; be careful with the order of concurrent writes'],
      ['Event-driven (CDC)', 'A service reads the DB change log and deletes keys', 'Big systems, where many services cache the same data', 'A little delay; one more pipeline'],
      ['Versioned keys', 'A version in the key: <code>user:42:v8</code>; raise the version on update', 'Static assets, config, bulk changes', 'Old versions take memory until TTL/eviction removes them'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Real example', html: `In the 2013 paper "Scaling Memcache at Facebook", Facebook explained that they used a look-aside (cache-aside) cache, <strong>deleted</strong> the key on write, and ran a daemon (mcsqueal) that read the database commit log and sent deletes to the caches in other regions/clusters. This is the classic example of event-driven invalidation. The paper is old, but the ideas are still standard today.` },

    { type: 'h2', text: 'Cache stampede (thundering herd)' },
    { type: 'p', html: `Building the <code>trending</code> key of the xyz.com home page is costly: one heavy query on the DB, ~300 ms. 2,000 people read it per second. While it is in the cache, all is well. Now the TTL ends. Everyone who arrives in the next 300 ms (2,000 × 0.3 = <strong>600 requests</strong>) gets a miss, and <em>every one of them</em> runs the same heavy query on the DB. The DB slows down, so the query runs longer, so even more requests miss. One small expiry can bring the DB down.` },
    { type: 'callout', tone: 'term', title: 'New word: Cache stampede / thundering herd', html: `<strong>What it is:</strong> a popular key expired (or was deleted), and at that very moment many requests got a miss. All of them rush to the database to build <strong>the same thing</strong> again. Like all the children running to one gate when the school bell rings.<br><strong>Why it is dangerous:</strong> the same heavy query hundreds of times at once on the database. The DB slows down, the query takes longer, and more requests miss. One small expiry can bring the whole DB down.<br><strong>Another form:</strong> many keys expire together (for example because they were all cached at the same time).<br><strong>Example:</strong> the numbers below: 2,000 reads/sec, 300 ms to build the value = 600 identical queries at once.` },
    { type: 'p', html: `Three fixes:` },
    { type: 'list', items: [
      '<strong>Lock / single-flight / request coalescing</strong>: on a miss, let only <em>one</em> request go to the DB. It puts a small lock in the cache (<code>SET lock:trending 1 NX PX 5000</code>). The others either wait a little and check the cache again, or take the old (stale) value. Facebook\'s leases did the same: only one token per key every 10 seconds. In one test in the paper, the peak DB query rate dropped from 17K/s to 1.3K/s.',
      '<strong>Early refresh (refresh-ahead)</strong>: do not wait for the expiry. A little before the TTL ends, one request (or a background job) refreshes the value. A probabilistic version (XFetch, VLDB 2015 paper): the closer the expiry, the higher the chance that this request does the refresh. Only one refreshes, nobody waits.',
      '<strong>Jittered TTL</strong>: do not give every key exactly 300 s. Give 300 ± 10% at random. Then 10,000 keys do not expire together; their expiries spread out over time.',
    ]},
    { type: 'p', html: `See it in the simulator. The top part is about one hot key, the bottom part about many keys:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Requests/sec on the hot key <input class="cst-q" type="number" value="2000" min="1" step="100"></label></div>
          <div><label>Time to build the value (ms) <input class="cst-t" type="number" value="300" min="1" step="50"></label></div>
        </div>
        <div class="cst-fix" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Same query on the DB (per expiry)</span><strong class="cst-db"></strong></div>
          <div class="stat"><span>Users who had to wait</span><strong class="cst-w"></strong></div>
        </div>
        <div class="cst-note calc-note"></div>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <div class="row2">
          <div><label>Keys cached at the same time <input class="cst-n" type="number" value="10000" min="1" step="1000"></label></div>
          <div><label>TTL jitter: <strong class="cst-jv">0%</strong> <input class="cst-j" type="range" min="0" max="20" step="1" value="0"></label></div>
        </div>
        <svg class="cst-svg" viewBox="0 0 360 130" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="How many keys expire each second"></svg>
        <div class="stats">
          <div class="stat"><span>Max expiries in one second (= DB misses)</span><strong class="cst-pk"></strong></div>
          <div class="stat"><span>Expiries spread over</span><strong class="cst-sp"></strong></div>
        </div>
        <div class="calc-note">All keys were cached at t = 0 (like a warm-up after a deploy), base TTL 300 s. The graph shows expiries per second from 240 s to 360 s.</div>`;
      const q = s => el.querySelector(s);
      let fix = 'none';
      const FIX = { none: 'No fix', lock: 'Lock / single-flight', early: 'Early refresh' };
      const box = q('.cst-fix');
      const drawFix = () => {
        box.innerHTML = '';
        Object.keys(FIX).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (fix === k ? ' on' : ''); b.textContent = FIX[k]; b.onclick = () => { fix = k; drawFix(); one(); }; box.appendChild(b); });
      };
      const one = () => {
        const Q = Math.max(1, Number(q('.cst-q').value) || 1), T = Math.max(1, Number(q('.cst-t').value) || 1);
        const inWindow = Math.max(1, Math.round(Q * T / 1000));
        const f = n => n.toLocaleString('en-IN');
        if (fix === 'none') {
          q('.cst-db').textContent = f(inWindow);
          q('.cst-w').textContent = f(inWindow) + ' (each ~' + T + ' ms+)';
          q('.cst-note').textContent = `In the ${T} ms it takes to build the value, ${f(inWindow)} requests arrived. All missed, all went to the DB. In real life it is even worse: so many queries slow the DB down, the build time grows, and even more requests fall into the window.`;
        } else if (fix === 'lock') {
          q('.cst-db').textContent = '1';
          q('.cst-w').textContent = f(inWindow) + ' (max ~' + T + ' ms)';
          q('.cst-note').textContent = `Only the request that won the lock went to the DB. The other ${f(inWindow - 1)} waited a little and then got the value from the cache (or took the old stale value right away, if that is allowed). The DB was saved. Careful: the lock needs an expiry (PX), or if the server holding the lock dies, everyone gets stuck.`;
        } else {
          q('.cst-db').textContent = '1';
          q('.cst-w').textContent = '0';
          q('.cst-note').textContent = `One request refreshed the value before it expired. The key was never empty, so nobody got a miss. The cost: sometimes we also refresh keys that would never have been asked for again.`;
        }
      };
      const many = () => {
        const N = Math.max(1, Math.min(1000000, Math.round(Number(q('.cst-n').value) || 1))), J = Number(q('.cst-j').value) / 100;
        q('.cst-jv').textContent = Math.round(J * 100) + '%';
        let seed = 42;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const bins = new Array(121).fill(0);
        for (let k = 0; k < N; k++) {
          const t = Math.floor(300 * (1 + J * (2 * rnd() - 1)));
          const b = t - 240;
          if (b >= 0 && b <= 120) bins[b]++;
        }
        const peak = Math.max(...bins);
        const used = bins.filter(x => x > 0).length;
        let s = '';
        bins.forEach((v, b) => { const hgt = peak ? (v / peak) * 100 : 0; s += `<rect x="${b * 3}" y="${110 - hgt}" width="2.4" height="${hgt}" fill="var(--accent)"></rect>`; });
        s += `<line x1="0" y1="110.5" x2="363" y2="110.5" stroke="var(--line-2)"></line><text x="0" y="126" font-size="10" fill="var(--ink-3)">240 s</text><text x="180" y="126" font-size="10" fill="var(--ink-3)" text-anchor="middle">300 s</text><text x="360" y="126" font-size="10" fill="var(--ink-3)" text-anchor="end">360 s</text>`;
        q('.cst-svg').innerHTML = s;
        q('.cst-pk').textContent = peak.toLocaleString('en-IN');
        q('.cst-sp').textContent = used + ' s';
      };
      ['.cst-q', '.cst-t'].forEach(c => q(c).addEventListener('input', one));
      ['.cst-n', '.cst-j'].forEach(c => q(c).addEventListener('input', many));
      drawFix(); one(); many();
    }},
    { type: 'p', html: `At 0% jitter, all 10,000 keys expire in <strong>the same second</strong>: 10,000 misses on the DB at once. Set jitter to 10%: the expiries spread over ~60 seconds and the peak comes down to about 200 per second. One line of code, a 50 times smaller peak.` },

    { type: 'h2', text: 'Hot keys and stampede, in a diagram' },
    { type: 'callout', tone: 'term', title: 'New word: shard (Redis Cluster)', html: `<strong>What it is:</strong> when data does not fit on one machine, we split it over many machines. Each part is a <strong>shard</strong>. Redis Cluster turns the name of a key into a number (a hash), and that number decides which shard the key lives on.<br><strong>Why we need it:</strong> more machines for more data and more traffic.<br><strong>Without it:</strong> the RAM and CPU of one Redis machine is the limit.<br><strong>Careful:</strong> one key always lives on <em>only one</em> shard. (A full lesson on sharding comes later.)` },
    { type: 'p', html: `Redis is also just a machine. In Redis Cluster each key lives on <em>one</em> shard. If the whole world reads one key (a cricketer's post, a live match score), that one shard runs at 100% CPU while the other shards sit idle. Adding shards will not help; the key is still in one place. This is called the <strong>hot key</strong> problem.` },
    { type: 'callout', tone: 'term', title: 'New word: Hot key', html: `<strong>What it is:</strong> a single key that gets so much traffic that the shard it lives on becomes the bottleneck.<br><strong>Why it is hard:</strong> sharding spreads keys, not the traffic of one key. Even going from 3 shards to 30, that key stays on one shard.<br><strong>Without knowing this:</strong> people keep adding shards and one shard is still at 100%.<br><strong>Example:</strong> a cricketer's post <code>post:99</code> gets 5 lakh reads/sec, while one Redis node handles roughly 1 lakh simple ops/sec.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'users', label: 'Lakhs of users', sub: 'same post', x: 80, y: 170, w: 130, kind: 'client', info: 'What it is: lakhs of xyz.com users asking for the same thing at the same time: a celebrity\'s post or the trending list.' },
        { id: 'a1', label: 'App server 1', sub: 'local cache', x: 270, y: 75, w: 150, kind: 'server', info: 'What it is: one xyz.com app server. Inside it is a small in-process (local) cache with a 1-5 s TTL, only for hot keys. A local hit needs no network hop.' },
        { id: 'a2', label: 'App server 2', sub: 'local cache', x: 270, y: 265, w: 150, kind: 'server', info: 'What it is: a second app server, just like the first. In real life there can be 50-500 servers, each with its own local cache.' },
        { id: 'r', label: 'Redis shard', sub: 'post:99 lives here', x: 490, y: 70, w: 140, kind: 'cache', meter: true, load: 30, info: 'What it is: one shard of Redis Cluster (one part of the cluster, a separate server). The hash of the key name decides which shard a key lives on. post:99 is only on this shard, so all the hot key traffic comes here.' },
        { id: 'db', label: 'Database', x: 490, y: 270, w: 140, kind: 'data', meter: true, load: 30, info: 'What it is: the source of truth, the real data. On a cache miss everyone comes here, so in a stampede this is what falls.' },
        { id: 'rep', label: 'Redis replica', sub: 'copy', x: 650, y: 170, w: 120, kind: 'cache', hidden: true, info: 'What it is: a live copy of the shard (a read replica). The reads of a hot key can be spread over replicas (if we accept a little replication lag).' },
      ],
      edges: [{ a: 'users', b: 'a1' }, { a: 'users', b: 'a2' }, { a: 'a1', b: 'r' }, { a: 'a2', b: 'r' }, { a: 'a1', b: 'db' }, { a: 'a2', b: 'db' }, { a: 'r', b: 'rep', id: 'rr', hidden: true, dashed: true }, { a: 'a2', b: 'rep', id: 'a2rep', hidden: true }],
      scenarios: [
        { name: 'Stampede', intro: 'The TTL of the trending key just ended.', steps: [
          { title: 'The key expires', text: 'Redis no longer has trending.', set: { r: { state: 'miss', sub: 'trending: expired' } }, focus: ['r'] },
          { title: 'All miss, all go to the DB', text: 'All in-flight requests on both servers got a miss, and each one runs the same heavy query.', flood: { paths: ['users>a1>db', 'users>a2>db'], n: 16 }, after: { db: { state: 'hot', load: 99, sub: '600 same queries!' } } },
          { title: 'Domino', text: 'The DB is slow, the query takes longer, the window gets longer, and more requests miss. Sometimes the DB times out and the value never even reaches the cache. This loop does not break by itself.', focus: ['db'] },
        ]},
        { name: 'Fix: lock (single-flight)', steps: [
          { title: 'The key expires', set: { r: { state: 'miss', sub: 'trending: expired' } }, text: 'The same situation.', focus: ['r'] },
          { title: 'Server 1 wins the lock', text: 'Only one request got the lock. Only that one will go to the DB.', go: ['a1>r', 'res:r>a1'], msg: 'SET lock:trending 1 NX PX 5000  →  OK', after: { a1: { state: 'ok', sub: 'got the lock' } } },
          { title: 'The others wait', text: 'Server 2 did not get the lock. It will check the cache again after 50 ms (or serve a stale copy).', go: ['a2>r', 'bad:r>a2'], msg: 'SET lock:trending 1 NX PX 5000  →  (nil)', after: { a2: { state: 'warn', sub: 'wait / stale' } } },
          { title: 'Only ONE DB query', go: ['a1>db', 'res:db>a1', 'a1>r'], text: 'The value was built and stored in the cache. 1 query on the DB instead of 600.', after: { r: { state: 'hit', sub: 'trending: fresh' }, db: { load: 32 } } },
          { title: 'Everyone from the cache', parallel: true, go: ['a2>r', 'res:r>a2'], text: 'The waiting requests are now hits.', after: { a2: { state: '', sub: 'hit' }, a1: { state: '', sub: 'local cache' } } },
        ]},
        { name: 'Hot key', intro: 'A cricketer\'s post (post:99) goes viral. 5 lakh reads/sec on one key.', steps: [
          { title: 'All reads on one shard', text: 'Both app servers ask the same Redis shard for post:99.', flood: { paths: ['users>a1>r', 'users>a2>r'], n: 16 }, after: { r: { state: 'hot', load: 100, sub: 'CPU 100%' } } },
          { title: 'The shard chokes', text: 'One Redis node does roughly 1 lakh+ simple ops/sec. Not 5 lakh. Latency goes up, timeouts start. The other shards are at 10% CPU.', go: 'lost:a2>r' },
        ]},
        { name: 'Fix: local cache + replicas', steps: [
          { title: 'Local cache (2 second TTL)', text: 'Each app server keeps post:99 in its own memory for 2 seconds. With 500 servers, Redis gets at most ~250 reads/sec (500 ÷ 2 s), not 5 lakh. The cost: data up to 2 seconds old.', set: { a1: { state: 'hit', sub: 'local hit' }, a2: { state: 'hit', sub: 'local hit' } }, flood: { paths: ['users>a1', 'users>a2'], n: 12 }, after: { r: { state: '', load: 25, sub: 'relaxed' } } },
          { title: 'Replicas / key splitting', text: 'Another way: copies of the key. Either read from the shard\'s read replicas, or keep the key as 8 copies named <code>post:99#1 ... post:99#8</code> (on different shards) and send each read to a random copy. On a write, all copies must be updated.', show: ['rep', 'rr', 'a2rep'], go: ['a2>rep', 'res:rep>a2'], after: { rep: { state: 'hit' } } },
          { title: 'How do we find hot keys?', text: 'In Redis, <code>redis-cli --hotkeys</code> (works only with an LFU policy), client-side metrics, or sampling at a proxy. Big platforms make detection automatic: when a key becomes hot, it is put into the local cache by itself.', focus: ['r'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', html: `Put things that are the same for everyone and can be a little stale (live score JSON, trending list) on a <strong>CDN</strong> with a 1-2 second TTL. Then the hot key traffic never even reaches your servers. That is the topic of the next lesson.` },
    { type: 'p', html: `<strong>Work out the hot key numbers yourself.</strong> Change the local cache TTL and the number of key copies, and see how much load is left on the shard and what it costs (how old the data can be):` },
    { type: 'custom', render(el) {
      const T = { r: 'Reads/sec on the hot key', n: 'App servers', l: 'Local cache TTL (s), 0 = off', k: 'Copies of the key (splitting)',
        redis: 'Reads/sec of that key on Redis', shard: 'Load on each shard', stale: 'Max age of data', ok: 'The shard is fine', bad: 'Shard overloaded!',
        none: '0 s', note: (cap) => `We assume: one Redis shard handles ~${cap.toLocaleString('en-IN')} simple ops/sec. With a local cache, each app server asks Redis only once per TTL, so reads on Redis = servers ÷ TTL.` };
      const CAP = 100000;
      el.innerHTML = `<div class="row2">
        <div><label>${T.r} <input class="chk-r" type="number" value="500000" min="1" step="10000"></label></div>
        <div><label>${T.n} <input class="chk-n" type="number" value="500" min="1" step="10"></label></div>
        <div><label>${T.l}: <strong class="chk-lv"></strong><input class="chk-l" type="range" min="0" max="10" step="1" value="0"></label></div>
        <div><label>${T.k}: <strong class="chk-kv"></strong><input class="chk-k" type="range" min="1" max="8" step="1" value="1"></label></div>
      </div>
      <div class="stats"><div class="stat"><span>${T.redis}</span><strong class="chk-o1"></strong></div><div class="stat"><span>${T.shard}</span><strong class="chk-o2"></strong></div><div class="stat"><span>${T.stale}</span><strong class="chk-o3"></strong></div></div>
      <div class="calc-note chk-st" style="font-weight:600"></div>
      <div class="calc-note">${T.note(CAP)}</div>`;
      const q = s => el.querySelector(s), f = n => Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const R = Math.max(1, Number(q('.chk-r').value) || 1), N = Math.max(1, Number(q('.chk-n').value) || 1), Lt = Number(q('.chk-l').value), K = Number(q('.chk-k').value);
        q('.chk-lv').textContent = Lt; q('.chk-kv').textContent = K;
        const toRedis = Lt > 0 ? Math.min(R, N / Lt) : R, per = toRedis / K;
        q('.chk-o1').textContent = f(toRedis); q('.chk-o2').textContent = f(per); q('.chk-o3').textContent = Lt ? Lt + ' s' : T.none;
        const st = q('.chk-st'); st.textContent = per > CAP ? T.bad : T.ok; st.style.color = per > CAP ? 'var(--red)' : 'var(--green)';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `By default (no fix), 5,00,000 reads on one shard: overloaded. Only 8 copies of the key: 62,500 on each shard, fine. Only a 2 s local cache: 500 servers ÷ 2 = <strong>250</strong> reads/sec on Redis, and the cost is just data up to 2 seconds old.` },

    { type: 'h2', text: 'Cache warming' },
    { type: 'p', html: `A new Redis cluster was added, or it restarted, or a new region opened: the cache is <strong>empty</strong> (cold). For the first few minutes every request misses, and the DB gets all the traffic. If the DB cannot handle that, the site falls over without its cache.` },
    { type: 'callout', tone: 'term', title: 'New word: Cache warming', html: `<strong>What it is:</strong> filling the cache with the most important keys <em>before</em> the traffic comes. An empty cache is called "cold" and a full one "warm".<br><strong>Why we need it:</strong> a cold cache = every request misses = all traffic on the database.<br><strong>Without it:</strong> after a restart or a new cluster, the DB is flooded for the first few minutes, and may fall over.<br><strong>Example:</strong> before an IPL match starts, put the match page, the score and the team pages into the cache.` },
    { type: 'list', items: [
      '<strong>Replay the top keys</strong>: take the top 1 lakh keys from yesterday\'s logs and load them in advance with a script.',
      '<strong>Shift traffic slowly</strong>: send 1% of traffic to the new cluster first, then 10%, then 100%. The cache warms up at each step.',
      '<strong>Persistence</strong>: Redis can also write its data to disk: RDB (a full snapshot every so often) or AOF (a diary of every write). After a restart that data is loaded back, so a restart does not start cold.',
      '<strong>Careful</strong>: when warming, do not give all keys the same TTL (remember the stampede simulator). And do not warm everything, only what is really hot.',
    ]},
    { type: 'p', html: `<strong>Feel a cold start.</strong> Below is a small model: the cache restarted. Without warming, the hit rate starts at 0 and slowly goes up. Use the warming slider to say how much of the cache was filled in advance:` },
    { type: 'custom', render(el) {
      const T = { q: 'Requests/sec', c: 'DB capacity (queries/sec)', w: 'Warmed in advance', over: 'Time the DB is overloaded', peak: 'Peak load on the DB', ax: ['0 s', '150 s', '300 s'], cap: 'DB capacity',
        note: 'Toy model: steady hit rate 95%, the cache fills with a time constant of ~30 s: hit(t) = 95% × (1 − (1 − warm) × e^(−t/30)). Real numbers depend on your traffic, but the shape is the same.' };
      el.innerHTML = `<div class="row2">
        <div><label>${T.q} <input class="cw-q" type="number" value="50000" min="1" step="1000"></label></div>
        <div><label>${T.c} <input class="cw-c" type="number" value="5000" min="1" step="500"></label></div>
        <div><label>${T.w}: <strong class="cw-wv"></strong><input class="cw-w" type="range" min="0" max="100" step="5" value="0"></label></div>
      </div>
      <svg class="cw-svg" viewBox="0 0 360 140" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="DB load over time"></svg>
      <div class="stats"><div class="stat"><span>${T.over}</span><strong class="cw-o"></strong></div><div class="stat"><span>${T.peak}</span><strong class="cw-p"></strong></div></div>
      <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s), H = 0.95, TAU = 30;
      const upd = () => {
        const Q = Math.max(1, Number(q('.cw-q').value) || 1), C = Math.max(1, Number(q('.cw-c').value) || 1), w = Number(q('.cw-w').value) / 100;
        q('.cw-wv').textContent = Math.round(w * 100) + '%';
        const load = []; let over = 0;
        for (let t = 0; t <= 300; t++) { const l = Q * (1 - H * (1 - (1 - w) * Math.exp(-t / TAU))); load.push(l); if (t < 300 && l > C) over++; }
        const peak = load[0], top = Math.max(peak, C) * 1.1, Y = v => 110 - 100 * v / top;
        let s = `<line x1="0" y1="${Y(C).toFixed(1)}" x2="360" y2="${Y(C).toFixed(1)}" stroke="var(--red)" stroke-dasharray="4 3"></line><text x="356" y="${(Y(C) - 4).toFixed(1)}" font-size="10" text-anchor="end" fill="var(--red)">${T.cap}</text>`;
        s += `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${load.map((v, t) => (t * 1.2).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"></polyline>`;
        s += `<line x1="0" y1="110.5" x2="360" y2="110.5" stroke="var(--line-2)"></line><text x="0" y="126" font-size="10" fill="var(--ink-3)">${T.ax[0]}</text><text x="180" y="126" font-size="10" text-anchor="middle" fill="var(--ink-3)">${T.ax[1]}</text><text x="360" y="126" font-size="10" text-anchor="end" fill="var(--ink-3)">${T.ax[2]}</text>`;
        q('.cw-svg').innerHTML = s;
        q('.cw-o').textContent = over + ' s';
        q('.cw-p').textContent = Math.round(peak).toLocaleString('en-IN') + '/s';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Without warming (0%): the DB gets the full 50,000/s at the start, and stays above capacity (5,000/s) for ~89 seconds. 80% warm: peak 12,000/s, ~41 seconds. 95% warm: peak ~4,875/s, the DB never goes above capacity.` },
    { type: 'h2', text: 'Redis vs Memcached' },
    { type: 'p', html: `Both are in-memory key-value stores, and both are very fast. The difference is in the features:` },
    { type: 'table', head: ['', 'Redis', 'Memcached'], rows: [
      ['Data types', 'Strings, hashes, lists, sets, sorted sets, streams, geo, HyperLogLog...', 'Only key → bytes (a blob)'],
      ['Threads', 'Commands run on one main thread (so every command is atomic). Since version 6, extra threads for network I/O.', 'Fully multithreaded; more throughput from one process on a big multi-core machine'],
      ['Persistence', 'Yes: RDB snapshots and the AOF log', 'No. A restart = an empty cache'],
      ['Replication / HA', 'Replicas, Sentinel (automatic failover), Redis Cluster (sharding over 16,384 hash slots)', 'Not built in. The client library spreads keys over servers with consistent hashing'],
      ['Value size', 'A string up to 512 MB', 'Default max item 1 MB (can be raised in the config)'],
      ['Extra', 'Lua scripts, transactions, pub/sub, atomic counters, rate limiting, leaderboards', 'Simple get/set/delete, TTL, CAS'],
      ['Eviction', 'Configurable policies (default noeviction; change it for a cache)', 'LRU based (being a cache is its whole job)'],
      ['License', 'Source-available licenses since Redis 7.4 (2024); Redis 8 (2025) also offers AGPLv3. Valkey: a BSD-licensed fork under the Linux Foundation', 'BSD, open source'],
    ]},
    { type: 'callout', tone: 'why', title: 'So which one?', html: `Most teams today choose <strong>Redis (or Valkey)</strong>, because along with caching, one tool also does sessions, counters, leaderboards, rate limiting and locks. <strong>Memcached</strong> is good when you only need simple blob caching on very big multi-core machines, and you do not need persistence or data types. Facebook ran Memcached at huge scale; so it is not "old", just focused.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"Redis has persistence, so let us use Redis as the database." By default Redis writes to disk asynchronously (in the background), so a crash can lose the last few seconds of data. For a cache that is perfectly fine. But making Redis the source of truth for orders or money must be a separate, carefully made decision, not a default.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Default rule', html: `Default: <strong>cache-aside + TTL</strong>, delete the key on write. Add a cache when reads are much more than writes (10:1 or more), the data can be a few seconds stale, and the same items are asked for again and again. Do not cache a bank balance you are about to debit. Product pages, profiles, trending lists: yes.` },
    { type: 'table', head: ['Situation', 'Answer'], caption: 'The roadmap\'s "Do I need a cache? Which strategy?" table', rows: [
      ['Read-heavy (10:1 or more), same items again and again, slightly stale is fine', 'Yes: cache-aside + TTL'],
      ['Costly computation that is reused (feed, recommendations, search results)', 'Yes: cache the computed result'],
      ['Users must see their own write right away', 'Write-through, or delete the cache key on write'],
      ['Very write-heavy counters (views, likes)', 'Write-back: count in Redis, flush to the DB in batches (accept a small risk of loss)'],
      ['Long-tail access, each key is asked for only once', 'Probably not; the hit rate will be low'],
      ['Values that must be strictly correct (balance before a debit, seat at checkout)', 'Read from the source of truth; use the cache only for display'],
      ['Lakhs of hits on one key (celebrity post, match score)', 'Replicate the hot key, use a local in-process cache, or put it on a CDN'],
    ]},
    { type: 'diagram', title: 'Cache strategies: the whole picture', height: 610,
      groups: [
        { label: 'Users + edge', x: 20, y: 14, w: 680, h: 216 },
        { label: 'App', x: 230, y: 244, w: 260, h: 80 },
        { label: 'Cache + data', x: 20, y: 356, w: 680, h: 96 },
        { label: 'Background jobs', x: 20, y: 492, w: 690, h: 106 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'xyz.com app', x: 360, y: 60, w: 160, kind: 'client', info: 'What it is: xyz.com users. Their reads (post, profile, score) and writes (like, edit) use different strategies.' },
        { id: 'cdn', label: 'CDN edge', sub: 'score JSON, 2 s', x: 140, y: 175, w: 160, kind: 'edge', info: 'What it is: a cache server near the user\'s city (next lesson). Things that are the same for everyone (live score, trending) come from here with a 1-2 s TTL. Hot key traffic never even reaches your servers.' },
        { id: 'app', label: 'App servers', sub: 'local cache: hot keys', x: 360, y: 284, w: 190, kind: 'server', info: 'What it is: the xyz.com code. The cache-aside logic is here: on read, Redis; on a miss, the DB. On write, update the DB + delete the key. A 1-2 s local (in-process) cache for hot keys. A lock / early refresh to avoid stampedes.' },
        { id: 'redis', label: 'Redis cluster', sub: 'LRU/LFU + TTL', x: 150, y: 414, w: 170, kind: 'cache', info: 'What it is: the shared distributed cache, split over many shards. An eviction policy at maxmemory (allkeys-lru or allkeys-lfu), and a jittered TTL on every key. Counters like likes are INCRed here in write-back style.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 570, y: 414, w: 170, kind: 'data', info: 'What it is: the real data. Misses and writes come here. Every strategy tries to keep its load low, but the truth lives here.' },
        { id: 'rep', label: 'Redis replica', sub: 'failover, reads', x: 100, y: 548, w: 150, kind: 'cache', info: 'What it is: a live copy of a Redis shard. It takes over if the primary falls; the reads of a hot key can also be spread onto it (accepting a little lag).' },
        { id: 'warm', label: 'Warm-up job', sub: 'top keys', x: 272, y: 548, w: 150, kind: 'queue', info: 'What it is: a script that fills Redis with the top keys before a restart or a big event (IPL final), with jittered TTLs. The DB does not drown on a cold start.' },
        { id: 'flush', label: 'Flush job', sub: 'write-back', x: 448, y: 548, w: 150, kind: 'queue', info: 'What it is: a background job that every ~10 s puts the counters collected in Redis (likes, views) into the DB in one batch write. If Redis falls before a flush, that part can be lost.' },
        { id: 'cdc', label: 'CDC invalidator', sub: 'DB log → DEL', x: 622, y: 548, w: 150, kind: 'queue', info: 'What it is: a service that reads the database change log. On every change it deletes that key from Redis, so even if some write path forgets the delete, no stale data stays.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', label: 'live score' },
        { a: 'cdn', b: 'app', dashed: true, label: 'miss' },
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'redis', n: 2, label: 'GET / SET' },
        { a: 'app', b: 'db', n: 3, label: 'miss / write' },
        { a: 'redis', b: 'rep', dashed: true },
        { a: 'warm', b: 'redis', kind: 'evt' },
        { a: 'redis', b: 'flush', kind: 'evt' },
        { a: 'flush', b: 'db', kind: 'evt' },
        { a: 'db', b: 'cdc', kind: 'evt' },
        { a: 'cdc', b: 'redis', kind: 'evt', label: 'DEL key', via: [[680, 478], [250, 478]] },
      ],
      paths: [
        { name: 'Read (cache-aside)', text: 'Looked in Redis; on a miss got it from the DB and SET it with a TTL.', go: ['users>app>redis', 'app>db'] },
        { name: 'Write + invalidate', text: 'The DB was updated. The app deleted the key, and CDC also sent a delete after seeing the DB log (a safety net).', go: ['users>app>db', 'db>cdc>redis'] },
        { name: 'Like (write-back)', text: 'The like is only an INCR in Redis, OK at once. The flush job makes one batch write to the DB every 10 s.', go: ['users>app>redis', 'redis>flush>db'] },
        { name: 'Live score + restart', text: 'The score comes from the CDN (2 s TTL). On a Redis restart, the warm-up job fills the top keys in advance.', go: ['users>cdn', 'warm>redis>rep'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Caches live in many layers: browser, CDN, the app's local memory, Redis. The closer, the faster, and the less control.</li>
      <li>Default: cache-aside + TTL. On write, DB first, then <strong>delete</strong> the key (do not update it).</li>
      <li>Write-through = the cache is always fresh, writes are slow. Write-back = writes are super fast, data loss on a crash (only for counters). Write-around = what is written does not go into the cache.</li>
      <li>Eviction: LRU (used longest ago), LFU (used fewest times), FIFO (came in first), volatile-ttl (expires soonest). The Redis default is noeviction: change it for a cache.</li>
      <li>Always set a TTL: it is the safety net for freshness. Add jitter so that all keys do not expire together.</li>
      <li>Stampede: lock / single-flight, early refresh, jitter. Hot key: local cache, replicas, key splitting, CDN.</li>
      <li>Warm the cache before a restart; do invalidation from one place with CDC.</li>
      <li>Redis = features (data types, persistence, replication). Memcached = a simple, multithreaded blob cache.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'With the right strategy, reads are 10x+ faster and the DB load is much lower',
      'Write-back makes heavy writes like counters 1000 times fewer',
      'Lock / early refresh / jitter keep the DB safe at expiry time',
      'A local cache + replicas can handle even hot keys',
    ], costs: [
      'Every strategy has some window of stale data',
      'In write-back, a crash = loss of data that already got OK',
      'Invalidation code on every write path; forget it in one place and you have a bug',
      'Local caches = many copies, which can all be slightly different',
      'One more system to monitor, scale and fail over',
    ]},
    { type: 'think', questions: [
      { q: 'The "comments count" on xyz.com changes on every comment and is shown on every page view. Which strategy?', a: 'An exact count is not needed for display. INCR in Redis (write-back style) with a periodic DB flush, or keep the count in the DB and use cache-aside with a short TTL (like 30 s). If the count decides money or a limit (like "closed after 100 comments"), check it from the DB.' },
      { q: 'You set the TTL to 1 hour and you also delete on write. Still, stale data sometimes shows for an hour. What could it be?', a: 'Probably the cache-aside race: a slow reader SET an old value after the delete. Or some write path (admin panel, background job, another service) forgot to delete. Fix: a shorter TTL, invalidation for all write paths from one place (CDC), or leases/versioned values.' },
      { q: 'The IPL final starts at 7:30. Cache-wise, what will you do before 7:00?', a: 'Warm the match page, score JSON and team pages in the cache (with jittered TTLs), put the score on the CDN with a 1-2 s TTL, turn on the local cache for hot keys, and add a lock/early refresh on these keys so there is no stampede at expiry.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the right order for a write in cache-aside?', options: ['Update the cache, then update the DB', 'Update the DB, then delete the cache key', 'Delete the cache, do nothing in the DB'], answer: 1, explain: 'The source of truth first. Then delete (do not update), so concurrent writes cannot leave the cache in the wrong order.' },
      { q: 'In which strategy can writes that already got "OK" be lost in a crash?', options: ['Write-through', 'Write-around', 'Write-back'], answer: 2, explain: 'In write-back the data lives only in the cache for a while. A crash before the flush = loss.' },
      { q: 'A report job reads all old posts once, and after it the cache hit rate drops. Which policy protects better against this?', options: ['LRU', 'LFU', 'FIFO'], answer: 1, explain: 'The one-time keys of the scan are recent, so LRU throws out hot keys for them. LFU looks at frequency and protects the hot keys.' },
      { q: '10,000 keys were cached together with a 300 s TTL. At 300 s the DB spikes. The simplest fix?', options: ['Make the TTL 3000 s', 'Random jitter in the TTL', 'Double the Redis size'], answer: 1, explain: 'A longer TTL only moves the spike later. Jitter spreads the expiries over time.' },
      { q: 'The Redis cache is full and the policy was never changed (the default). A new SET arrives. What happens?', options: ['The oldest key leaves by itself', 'The write gets an OOM error', 'Redis starts writing to disk'], answer: 1, explain: 'The default maxmemory-policy is noeviction: when memory is full, new writes get an error. For a cache, set allkeys-lru or allkeys-lfu.' },
      { q: 'One key gets 5 lakh reads/sec. In Redis Cluster you went from 3 shards to 30. What happens?', options: ['The load falls 10 times', 'Nothing much; the key is still on one shard', 'The key splits by itself'], answer: 1, explain: 'Sharding spreads keys, not the traffic of one key. You need a local cache, replicas or key splitting.' },
    ]},
    { type: 'sources', note: 'Facts and numbers were checked with these.', items: [
      { title: 'Key eviction', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/reference/eviction/', used: 'Eviction policies, the noeviction default, sampled approximate LRU (maxmemory-samples 5), LFU since 4.0 with decay.' },
      { title: 'Scaling Memcache at Facebook (NSDI 2013)', publisher: 'USENIX / Meta', official: true, url: 'https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf', used: 'Look-aside cache, delete on write, leases for stale sets and thundering herds (one token per key per 10 s, peak 17K/s → 1.3K/s), mcsqueal invalidation.' },
      { title: 'Optimal Probabilistic Cache Stampede Prevention (VLDB 2015)', publisher: 'Vattani, Chierichetti, Lowenstein', url: 'https://www.vldb.org/pvldb/vol8/p886-vattani.pdf', used: 'The probabilistic early expiration (XFetch) idea.' },
      { title: 'Efficiency (W-TinyLFU)', publisher: 'Caffeine wiki (Ben Manes)', url: 'https://github.com/ben-manes/caffeine/wiki/Efficiency', used: 'Caffeine uses the W-TinyLFU policy: an admission filter that estimates how popular a new item is.' },
      { title: 'EXPIRE command: how Redis expires keys', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/expire/', used: 'Lazy and active expiry; what volatile keys mean.' },
      { title: 'memcached(1) manual page', publisher: 'memcached', url: 'https://manpages.ubuntu.com/manpages/focal/man1/memcached.1.html', used: 'Default 1 MB max item size (-I), threads option.' },
      { title: 'Redis 8.0 released, now tri-licensed with AGPLv3', publisher: 'Phoronix', url: 'https://www.phoronix.com/news/Redis-8.0-Goes-AGPLv3', used: 'Redis license history (2024 source-available, 2025 AGPLv3 option) and the Valkey fork context.' },
    ]},
  ],
});
