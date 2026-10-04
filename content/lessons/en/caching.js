Lesson.register({
  id: 'caching',
  title: 'Cache: hit, miss and Redis',
  minutes: 22,
  summary: `The database is getting tired from every request. A cache is a fast "memory" that keeps the things people ask for again and again in RAM, so we do not have to ask the database every time.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine someone asks you "what is 13 × 17?" The first time, you work it out on paper. If 1000 people ask the same question, you will not do the maths every time. You will remember the answer (221) once and say it right away.<br>Websites work the same way. Lakhs of people ask for the <em>same</em> thing. Getting it from the database again every time is slow and costly.<br>A <strong>cache</strong> is a small, very fast "memory" of answers. In this lesson we will see how it works, when it can give a wrong answer, and when you should not use it at all.` },

    { type: 'h2', text: 'The problem: the database is the bottleneck' },
    { type: 'p', html: `At the end of the Load Balancer lesson we saw this: we now have 10 servers, but still only one database. All 10 servers ask that one database for data.` },
    { type: 'p', html: `The xyz.com home page shows "trending posts". 1 lakh users open the home page, so the database gets <em>the same question</em> 1 lakh times. The answer is the same every time, but the database still does all the work every time.` },
    { type: 'callout', tone: 'term', title: 'New word: bottleneck', html: `<strong>What it is:</strong> the one part of a system that fills up first and slows everything else down. Think of the narrow neck of a bottle: however big the bottle is, water only comes out as fast as the neck allows.<br><strong>Here:</strong> we have 10 servers, but one database. The database is the narrow neck.<br><strong>Without knowing this:</strong> people keep adding servers and the site stays slow, because the real blockage is somewhere else.` },

    { type: 'h2', text: 'Disk is slow, RAM is fast' },
    { type: 'p', html: `A computer can keep data in two places: on a <strong>disk</strong> (an SSD or a hard disk) or in <strong>RAM</strong>. You need to understand the difference, because the whole idea of a cache stands on it.` },
    { type: 'callout', tone: 'term', title: 'New word: RAM and disk', html: `<strong>What it is:</strong> <strong>RAM</strong> is the computer's "working" memory: very fast, but small, costly, and empty again when the power goes off. A <strong>disk</strong> (SSD) is big and cheap, and keeps data when the power goes off, but it is much slower than RAM.<br><strong>Why we need it:</strong> the database keeps its real data on disk so that it is never lost. We will keep a copy of popular data in RAM so that it comes back fast.<br><strong>Without it:</strong> every request goes to the disk, plus all the database work (searching, sorting, joining) every time.<br><strong>Example:</strong> reading a small value from RAM takes about 100 nanoseconds. One random read from an SSD takes about 100-150 microseconds, which is about 1000 times longer.` },
    { type: 'image', src: 'assets/img/caching/ram-ddr4.jpg', alt: 'A RAM stick (DDR4 memory module): a long thin circuit board with a red heat spreader and gold-coloured pins at the bottom', caption: 'This is a stick of RAM (DDR4). A server holds many sticks like this. A cache like Redis keeps all its data in this kind of memory. That is why it is so fast, and also why its space is limited and costly.', credit: { text: 'ElooKoN, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:RAM_Module_(SDRAM-DDR4).jpg', license: 'CC BY-SA 4.0' } },
    { type: 'p', html: `A database query adds network time and the database's own work on top of the disk. So a normal query takes about 5-10 ms. If the same answer is already sitting in RAM, it comes back in about 0.5-1 ms (most of that is network time). So why not work out the answer once and keep it in RAM?` },
    { type: 'callout', tone: 'term', title: 'New word: Cache', html: `<strong>What it is:</strong> a temporary, fast store where we keep a <em>copy</em> of things that are asked for again and again.<br><strong>Why we need it:</strong> so that the answer to the same question comes from RAM instead of the database. The user gets it faster, and the database gets a rest.<br><strong>Without it:</strong> every request goes to the database. When traffic grows, the database fills up first and the whole site becomes slow.<br><strong>Example:</strong> the xyz.com trending list was asked for 1 lakh times. With a cache, we got it from the database only once. The other 99,999 times it came from RAM.` },
    { type: 'callout', tone: 'term', title: 'New word: source of truth', html: `<strong>What it is:</strong> the place where the <em>real, correct</em> version of the data lives. In our case, the database.<br><strong>Why we need it:</strong> the cache is only a copy. If the copy and the real data disagree, the real data wins.<br><strong>Without it:</strong> nobody would know which value is correct.` },
    { type: 'compare',
      left: { title: 'Without cache', ascii: `
User
 ↓
Server
 ↓
Database   (~10 ms every time)
 ↓
Response` },
      right: { title: 'With cache', ascii: `
User
 ↓
Server
 ↓
Cache ─── HIT (~1 ms) ──> Response
 ↓
MISS
 ↓
Database
 ↓
Save in cache
 ↓
Response` },
    },

    { type: 'h2', text: 'What is inside a cache: key, value, TTL' },
    { type: 'p', html: `A cache is a very simple thing: one big <strong>table</strong> where each line has a name (the key) and its data (the value). Learn three words, and everything else is built from them.` },
    { type: 'callout', tone: 'term', title: 'New word: key-value', html: `<strong>What it is:</strong> the simplest way to store data. A <strong>key</strong> = a unique name, like <code>user:42</code>. A <strong>value</strong> = the data stored under that name, like <code>{"name":"Riya"}</code>. It is like the contact list on a phone: the name gives you the number.<br><strong>Why we need it:</strong> if you know the key, you get the value right away. No search, no join.<br><strong>Without it:</strong> the cache would also have to "search" like a database, and the speed would be gone.` },
    { type: 'callout', tone: 'term', title: 'New word: TTL (Time To Live)', html: `<strong>What it is:</strong> a timer put on each key. A TTL of 300 seconds means the key deletes itself after 5 minutes.<br><strong>Why we need it:</strong> a copy in the cache slowly becomes old. TTL makes sure no copy stays old forever. It also frees up RAM over time.<br><strong>Without it:</strong> if someone forgets to update a copy, the old data is shown forever.<br><strong>Example:</strong> the trending list has a TTL of 60 s, so the list shown is at most 1 minute old.` },
    { type: 'callout', tone: 'term', title: 'New word: Redis', html: `<strong>What it is:</strong> a separate server (a program) that keeps key-value data <strong>in RAM</strong>. It is the most popular choice for a cache.<br><strong>Why we need it:</strong> xyz.com has 10 app servers. They all talk to one Redis, so what one server puts in the cache, the other 9 can also use.<br><strong>Without it:</strong> each server would keep its own small copy, and there would be 10 different old copies in 10 places.<br><strong>Example:</strong> because it works in RAM, one Redis server can handle up to lakhs of simple GET/SET operations per second (it depends on the machine and the setup).` },
    { type: 'p', html: `You talk to Redis with short commands. The five most useful ones:` },
    { type: 'table', head: ['Command', 'What it does', 'Example reply'], rows: [
      ['<code>SET user:42 Riya EX 300</code>', 'Store a value in the key, with a TTL of 300 s', '<code>OK</code>'],
      ['<code>GET user:42</code>', 'Give the value of the key', '<code>"Riya"</code>, or <code>(nil)</code> if the key does not exist'],
      ['<code>DEL user:42</code>', 'Remove the key', '<code>(integer) 1</code> (how many keys were removed)'],
      ['<code>TTL user:42</code>', 'How many seconds are left?', '<code>287</code>; <code>-1</code> = no timer; <code>-2</code> = the key does not exist'],
      ['<code>INCR views:7</code>', 'Add 1 to a number (atomic: even if two people add at the same moment, the count stays correct)', '<code>(integer) 1</code>, then 2, 3...'],
    ]},
    { type: 'p', html: `Try it yourself. Below is a tiny pretend Redis. Run commands with the buttons, or type your own. Use "Clock +60 s" to move time forward and watch keys with a TTL disappear:` },
    { type: 'custom', render(el) {
      const PRE = ['SET user:42 Riya EX 120', 'GET user:42', 'TTL user:42', 'GET user:7', 'INCR views:7', 'SET config dark-mode', 'TTL config', 'DEL user:42'];
      el.innerHTML = `<div class="crd-pre" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center">
          <input class="crd-in" type="text" aria-label="Redis command" value="GET user:42" style="flex:1 1 200px;min-width:0;font-family:var(--f-mono)">
          <button type="button" class="btn small primary crd-run">Run</button>
          <button type="button" class="btn small crd-t">Clock +60 s</button>
          <button type="button" class="btn small ghost crd-reset">Reset</button>
        </div>
        <div class="stats"><div class="stat"><span>Clock</span><strong class="crd-clock"></strong></div><div class="stat"><span>Keys</span><strong class="crd-n"></strong></div></div>
        <div class="crd-keys" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <pre class="ascii crd-log" style="min-height:7em;margin-top:10px;white-space:pre-wrap"></pre>
        <div class="calc-note">Commands: SET key value [EX seconds], GET key, DEL key, TTL key, EXPIRE key seconds, INCR key. This is not the real Redis, only a small model of it.</div>`;
      const q = s => el.querySelector(s);
      let db, now, log;
      const alive = k => db[k] && (db[k].exp === null || db[k].exp > now);
      const sweep = () => Object.keys(db).forEach(k => { if (!alive(k)) delete db[k]; });
      const run = line => {
        const a = line.trim().split(/\s+/); const c = (a[0] || '').toUpperCase(); const k = a[1]; let r;
        sweep();
        if (c === 'SET' && k && a[2] !== undefined) {
          let exp = null;
          if (a[3] && a[3].toUpperCase() === 'EX') { const n = parseInt(a[4], 10); if (!(n > 0)) r = '(error) ERR invalid expire time'; else exp = now + n; }
          if (!r) { db[k] = { v: a[2], exp }; r = 'OK'; }
        } else if (c === 'GET' && k) r = alive(k) ? '"' + db[k].v + '"' : '(nil)';
        else if (c === 'DEL' && k) { r = '(integer) ' + (alive(k) ? 1 : 0); delete db[k]; }
        else if (c === 'TTL' && k) r = '(integer) ' + (!alive(k) ? -2 : db[k].exp === null ? -1 : db[k].exp - now);
        else if (c === 'EXPIRE' && k && a[2]) { if (alive(k)) { db[k].exp = now + parseInt(a[2], 10); r = '(integer) 1'; } else r = '(integer) 0'; }
        else if (c === 'INCR' && k) {
          if (!alive(k)) { db[k] = { v: '1', exp: null }; r = '(integer) 1'; }
          else if (!/^-?\d+$/.test(db[k].v)) r = '(error) ERR value is not an integer or out of range';
          else { db[k].v = String(Number(db[k].v) + 1); r = '(integer) ' + db[k].v; }
        } else r = '(error) This command is not in this model';
        sweep();
        log.push('> ' + line.trim() + '\n' + r);
        draw();
      };
      const draw = () => {
        q('.crd-clock').textContent = now + ' s';
        const ks = Object.keys(db);
        q('.crd-n').textContent = ks.length;
        q('.crd-keys').innerHTML = ks.length ? ks.map(k => `<div style="padding:6px 10px;border-radius:var(--r-sm);border:1px solid var(--cache-s);background:var(--cache-f);color:var(--cache-t);font:13px var(--f-mono)"><strong>${k}</strong> = ${db[k].v}<br><span style="color:var(--ink-3)">${db[k].exp === null ? 'TTL: no timer' : 'TTL: ' + (db[k].exp - now) + ' s left'}</span></div>`).join('') : '<span style="color:var(--ink-3);font-size:14px">The cache is empty.</span>';
        q('.crd-log').textContent = log.slice(-6).join('\n') || 'Press any button above.';
      };
      const reset = () => { db = {}; now = 0; log = []; draw(); };
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = p; b.onclick = () => { q('.crd-in').value = p; run(p); }; q('.crd-pre').appendChild(b); });
      q('.crd-run').onclick = () => run(q('.crd-in').value);
      q('.crd-in').addEventListener('keydown', e => { if (e.key === 'Enter') run(q('.crd-in').value); });
      q('.crd-t').onclick = () => { now += 60; const before = Object.keys(db).length; sweep(); const gone = before - Object.keys(db).length; log.push('(clock ' + now + ' s' + (gone ? ': ' + gone + ' key expired' : '') + ')'); draw(); };
      q('.crd-reset').onclick = reset;
      reset();
    }},
    { type: 'p', html: `Try this: <code>SET user:42 Riya EX 120</code>, then press "Clock +60 s" twice. <code>TTL</code> first shows 120, then 60, and at 120 s the key is gone: <code>GET</code> now gives <code>(nil)</code>. We did not put a TTL on <code>config</code>, so it never expires (<code>TTL</code> = -1). The real Redis removes expired keys in two ways: it checks a key when someone tries to read it (lazy), and it checks random keys in the background (active).` },
    { type: 'h2', text: 'Cache hit and cache miss: run it and see' },
    { type: 'callout', tone: 'term', title: 'New words: cache hit and cache miss', html: `<strong>Cache hit:</strong> what we asked for was found in the cache. The fast road (~1 ms).<br><strong>Cache miss:</strong> it was not in the cache. Now we must go to the database (the slow road, ~10 ms), and we keep the answer in the cache for next time.<br>Everything is a miss the first time. A cache helps only when the same thing is asked for again and again.` },
    { type: 'callout', tone: 'term', title: 'New word: cache-aside', html: `<strong>What it is:</strong> the most common way to use a cache. The app server does three jobs itself: (1) look in the cache first, (2) if it is not there, get it from the database, (3) put it in the cache with a TTL.<br><strong>Why we need it:</strong> it is simple, and only things that were really asked for go into the cache.<br><strong>Without it:</strong> either we fill the cache with everything in advance (a waste of RAM), or the cache never fills up.<br>It is called "aside" because the cache sits on the side and the app fills it. In the next lesson we will see its relatives (write-through, write-back...).` },
    { type: 'p', html: `Run each scenario. Click any box to see what it is. The third and fourth scenarios show when the cache makes a <em>mistake</em> and when it <em>falls over</em>.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'opens profile', x: 80, y: 170, w: 130, kind: 'client', info: 'What it is: an xyz.com user, in a browser or the app. They are opening xyz.com/profile/42. They do not know if the answer came from the cache or the database; they only feel the speed.' },
        { id: 'app', label: 'App server', x: 280, y: 170, w: 140, kind: 'server', info: 'What it is: the server that runs the xyz.com code. The cache-aside logic lives here: look in Redis first; if found, return it; if not, get it from the database, store it in Redis with a TTL, then return it.' },
        { id: 'cache', label: 'Redis cache', sub: 'RAM, ~1 ms', x: 520, y: 75, w: 160, kind: 'cache', info: 'What it is: a separate server that keeps key-value data in RAM. Fast but small and temporary. Each key has a TTL (an expiry timer). It does not replace the database; it only takes load off it.' },
        { id: 'db', label: 'Database', sub: 'disk, ~10 ms', x: 520, y: 265, w: 160, kind: 'data', meter: true, load: 40, info: 'What it is: the source of truth. The real, permanent data lives here on disk. The whole job of the cache is to protect it. The meter shows how busy it is.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'First time (miss)', steps: [
          { title: 'A request arrives', text: 'The user opened profile 42.', go: 'u>app', msg: 'GET /profile/42' },
          { title: 'Cache check: MISS', text: 'The server asks Redis "do you have user:42?" It is the first time, so no. This is a <strong>cache miss</strong>.', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } }, msg: 'GET user:42  →  (nil)' },
          { title: 'Get it from the database', text: 'Now the slow road: a database query.', go: ['app>db', 'res:db>app'], msg: 'SELECT * FROM users WHERE id = 42   (~10 ms)' },
          { title: 'Save it in the cache', text: 'Keep the result in Redis for next time, with a TTL of 5 minutes.', go: 'app>cache', after: { cache: { state: '', sub: 'user:42 saved' } }, msg: 'SET user:42 {...} EX 300' },
          { title: 'Response', text: 'The user got the data. This time it took about 12 ms in total (cache check + database + save).', go: 'res:app>u' },
        ]},
        { name: 'Second time (hit)', steps: [
          { title: 'A request arrives', text: 'Someone opened profile 42 again.', go: 'u>app', msg: 'GET /profile/42' },
          { title: 'Cache check: HIT', text: 'Redis has it! This is a <strong>cache hit</strong>. The database did not even notice.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit', sub: 'HIT' } }, msg: 'GET user:42  →  {"name":"Riya"}   (~1 ms)' },
          { title: 'Response, 10 times faster', text: 'If 90% of requests are hits like this, the database load drops 10 times.', go: 'res:app>u' },
        ]},
        { name: 'Stale data', intro: 'Riya changed her name to "Riya S". Watch what can go wrong.', steps: [
          { title: 'The update goes to the database', text: 'The new name is written in the database.', go: ['u>app>db', 'res:db>app'], after: { db: { sub: 'name = Riya S' } }, msg: 'UPDATE users SET name = "Riya S" WHERE id = 42' },
          { title: 'But the cache has the old name', text: 'Nobody told Redis. It still has "Riya", and it will keep it until the TTL ends (5 minutes).', focus: ['cache'], set: { cache: { state: 'warn', sub: 'Riya (old!)' } } },
          { title: 'Other users see the old name', text: 'This is called <strong>stale data</strong>: the cache and the database have different values.', go: ['u>app>cache', 'res:cache>app>u'] },
          { title: 'Fix: delete the cache key with the update', text: 'As soon as the database is updated, remove <code>user:42</code> from the cache. The next request will be a miss, the new name comes from the database, and the cache is refreshed. This is <strong>cache invalidation</strong>.', go: 'app>cache', after: { cache: { state: '', sub: 'user:42 deleted' } }, msg: 'DEL user:42' },
        ]},
        { name: 'Redis down', steps: [
          { title: 'Redis crashes', text: 'The cache server fell over.', set: { cache: { state: 'down', sub: 'DOWN' } }, go: 'lost:app>cache' },
          { title: 'All traffic goes to the database', text: 'In a good design, when the cache fails, the server goes straight to the database, so the site keeps working. But the 90% of load that the cache was carrying suddenly lands on the database.', flood: { paths: ['u>app>db'], n: 14 }, after: { db: { load: 98, state: 'hot', sub: 'overloaded!' } } },
          { title: 'Lesson', text: 'The cache protected the database so well that the database can no longer survive without it. That is why we also keep a copy of Redis (a replica) that can take over at once, and we give the database enough capacity to survive for a short while.', focus: ['db'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New words: stale data and cache invalidation', html: `<strong>Stale data:</strong> an old copy sitting in the cache after the value in the database has already changed. The user sees wrong (old) data.<br><strong>Cache invalidation:</strong> removing (or changing) the copy in the cache when the real data changes, so the next read gets fresh data.<br><strong>Why it matters:</strong> without it, the cache is fast but tells lies.<br>This is known as one of the trickiest things in system design. In the next lesson we will see five ways to do it and one hidden race condition.` },
    { type: 'callout', tone: 'term', title: 'New word: replica', html: `<strong>What it is:</strong> a live copy of a server that receives every change as it happens.<br><strong>Why we need it:</strong> if the main (primary) Redis falls over, the replica takes its place at once. In Redis, a helper called <strong>Sentinel</strong> does this automatically (failover).<br><strong>Without it:</strong> if Redis falls over, the cache is fully empty and all traffic hits the database (the "Redis down" scenario above).` },
    { type: 'h2', text: 'The magic of hit rate' },
    { type: 'callout', tone: 'term', title: 'New word: hit rate', html: `<strong>What it is:</strong> out of 100 requests, how many were answered from the cache. 90 hits = a 90% hit rate.<br><strong>Why it matters:</strong> this one number tells you how useful the cache is. Database load = total requests × (1 − hit rate).<br><strong>Without it:</strong> you will not know if the cache is really helping, or if it is just the cost of one more server.` },
    { type: 'p', html: `<strong>A small calculation:</strong> xyz.com gets 10,000 requests per second. A hit takes ~1 ms, a miss ~11 ms (1 ms cache check + 10 ms database).` },
    { type: 'table', head: ['Hit rate', 'Database queries/sec', 'Average time'], rows: [
      ['0% (cache is useless)', '10,000', '11 ms'],
      ['90%', '10,000 × 0.10 = 1,000', '0.9 × 1 + 0.1 × 11 = 2 ms'],
      ['99%', '10,000 × 0.01 = 100', '0.99 × 1 + 0.01 × 11 = 1.1 ms'],
    ]},
    { type: 'p', html: `Going from 90% to 99% looks like "only 9 more", but the database load falls <strong>another 10 times</strong> (from 1,000 to 100). Move the slider and see for yourself:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="ca-qps">Requests per second</label><input id="ca-qps" class="ca-qps" type="number" value="10000" min="1" step="1"></div>
          <div><label for="ca-hr">Cache hit rate: <strong class="ca-hrv">90%</strong></label><input id="ca-hr" class="ca-hr" type="range" min="0" max="99" step="1" value="90"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Database queries/sec</span><strong class="ca-dbq"></strong></div>
          <div class="stat"><span>Average latency</span><strong class="ca-lat"></strong></div>
          <div class="stat"><span>DB load vs no cache</span><strong class="ca-red"></strong></div>
        </div>
        <div class="calc-note">We assume: a cache hit takes ~1 ms, the database ~10 ms (a miss needs both: ~11 ms). A normal SQL database server handles ~5,000-10,000 simple queries/sec comfortably.</div>`;
      const q = el.querySelector('.ca-qps'), r = el.querySelector('.ca-hr');
      const upd = () => {
        const qps = Math.max(0, Number(q.value) || 0), hr = Number(r.value) / 100;
        el.querySelector('.ca-hrv').textContent = Math.round(hr * 100) + '%';
        el.querySelector('.ca-dbq').textContent = Math.round(qps * (1 - hr)).toLocaleString('en-IN');
        el.querySelector('.ca-lat').textContent = (hr * 1 + (1 - hr) * 11).toFixed(1) + ' ms';
        el.querySelector('.ca-red').textContent = Math.round((1 - hr) * 100) + '%';
      };
      q.addEventListener('input', upd); r.addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'Where do caches live?' },
    { type: 'p', html: `Redis is not the only cache. On its way from the user to the database, a request passes through many places, and each place can have a cache. The closer to the user, the faster.` },
    { type: 'table', head: ['Place', 'What is cached', 'Example'], rows: [
      ['Browser', 'Images, CSS, JS', 'The xyz.com logo is not downloaded again'],
      ['CDN (cache servers spread around the world, two lessons from now)', 'Things that are the same for everyone', 'Videos, images, live score JSON'],
      ['The app server\'s own memory', 'Small, very popular data', 'Config, feature flags'],
      ['Distributed cache (Redis)', 'Shared data, one copy for all servers', 'User profiles, sessions, trending list'],
    ]},

    { type: 'h2', text: 'When to add a cache, and when not to' },
    { type: 'compare',
      left: { title: 'Do not cache', html: `• A bank balance you are about to debit (an old balance = wrong money)<br>• Seat availability at checkout time<br>• Data that is asked for with a different key every time (low hit rate)<br>• Small traffic that the database handles easily` },
      right: { title: 'Do cache', html: `• Reads are much more than writes (10:1 or more)<br>• Slightly old data is fine (a few seconds)<br>• The same items are asked for again and again<br>• Examples: profiles, product pages, trending posts, feeds` },
    },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Add a cache when <strong>all three</strong> are true: (1) reads are much more than writes (10:1 or more), (2) the data can be a few seconds old, (3) the same things are asked for again and again. Start with <strong>cache-aside + TTL</strong>, and delete the key on update. Things like money or seats that must be "correct right now" should always be read from the database.` },
    { type: 'callout', tone: 'mistake', html: `A cache is <strong>not a replacement</strong> for the database. Data in a cache is temporary: the TTL ends, memory fills up, or it restarts, and the data is gone. Always keep the real data in the database. A second mistake: letting the site fail when the cache fails. If Redis cannot be reached, the code should go to the database (after a short timeout), not return an error.` },
    { type: 'diagram', title: 'Cache: the whole picture', height: 600,
      groups: [
        { label: 'Users', x: 20, y: 14, w: 680, h: 92 },
        { label: 'Servers', x: 20, y: 124, w: 680, h: 214 },
        { label: 'Data', x: 20, y: 356, w: 680, h: 230 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser cache', x: 360, y: 60, w: 170, kind: 'client', info: 'What it is: the people opening xyz.com. Their browser is also a small cache: the logo, CSS and JS are not downloaded again.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 170, w: 160, kind: 'net', info: 'What it is: the part that spreads requests over the 10 app servers (previous lesson). Because of it, we keep the cache in one shared Redis, not in each server\'s own memory.' },
        { id: 'app', label: 'App servers', sub: 'cache-aside code', x: 360, y: 280, w: 180, kind: 'server', info: 'What it is: the xyz.com code. On each read: Redis first, the database on a miss, then SET in Redis with a TTL. On each write: update the database first, then DEL the Redis key.' },
        { id: 'redis', label: 'Redis', sub: 'RAM, ~1 ms', x: 170, y: 420, w: 170, kind: 'cache', info: 'What it is: the shared key-value cache in RAM. 90%+ of reads end here, so the database gets a rest. Every key has a TTL.' },
        { id: 'rep', label: 'Redis replica', sub: 'Sentinel failover', x: 170, y: 535, w: 170, kind: 'cache', info: 'What it is: a live copy of Redis. If the primary falls over, Sentinel makes this the new primary, so the cache does not go empty and the database does not suddenly get the full load.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 550, y: 420, w: 170, kind: 'data', info: 'What it is: the real, permanent data, on disk. Only misses and writes come here. If the cache falls over, it must carry the full load for a while.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1 },
        { a: 'lb', b: 'app', n: 2 },
        { a: 'app', b: 'redis', n: 3, both: true, label: 'GET / SET' },
        { a: 'app', b: 'db', n: 4, label: 'miss / write' },
        { a: 'redis', b: 'rep', dashed: true, label: 'copy' },
        { a: 'app', b: 'users', kind: 'res', label: 'response', via: [[640, 280], [640, 60]] },
      ],
      paths: [
        { name: 'Cache hit', text: 'The request reached Redis and the value was there (~1 ms). The database did not even notice.', go: ['users>lb>app>redis', 'app>users'] },
        { name: 'Cache miss', text: 'Not in Redis: we got it from the database (~10 ms), stored it in Redis with a TTL, then answered.', go: ['users>lb>app>redis', 'app>db', 'app>redis', 'app>users'] },
        { name: 'Write', text: 'New data goes to the database first, then the old key is DELETED from Redis. The next read will miss and bring fresh data.', go: ['users>lb>app>db', 'app>redis'] },
        { name: 'Redis falls over', text: 'The replica becomes the new primary. Until then the app reads straight from the database (the site keeps working, only slower).', go: ['redis>rep', 'app>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A cache = a copy in RAM of things that are asked for again and again. The real data lives in the database (the source of truth).</li>
      <li>RAM is much faster than disk, but small, costly and temporary. So cache only popular data.</li>
      <li>Cache hit = the fast road. Cache miss = get it from the database and keep it in the cache (cache-aside).</li>
      <li>Put a TTL on every key: an old copy will not stay forever.</li>
      <li>Update the database, then delete the cache key (invalidation), or stale data will be shown.</li>
      <li>Hit rate is the most important number: DB load = requests × (1 − hit rate).</li>
      <li>The site must work even if Redis falls over: fall back to the database, and keep a Redis replica.</li>
      <li>Default: cache-aside + TTL. Read "must be correct now" values like money and seats from the database.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Reads 10x+ faster', 'Much less load on the database', 'Cheap: a little RAM costs less than making the database bigger'], costs: ['Risk of stale data (invalidation is hard)', 'One more part that can fall over', 'RAM is limited, so not everything can be cached', 'If the cache falls over, the database suddenly gets the load'] },
    { type: 'think', questions: [
      { q: 'On xyz.com every user\'s search query is different ("blue shoes size 9 under 2000"). Is it worth caching search results?', a: 'Probably very little. Every query is a different key, so the hit rate will be low. Caching popular queries ("iphone", "cricket") is worth it; the long tail (queries that come very rarely) is not. A cache works when the same thing is asked for again and again.' },
      { q: 'Should the TTL be 1 second or 1 hour? For profile data.', a: 'It is a trade-off. A long TTL = more hits and a rested database, but more risk of stale data. A short TTL = fresh data, but more misses. For profiles, a few minutes + deleting the key on update is a good balance.' },
      { q: 'The hit rate is 90% and the database is fine at 1,000 queries/sec. Traffic becomes 5 times bigger. The hit rate stays at 90%. Will the database survive?', a: 'The database will now get 5,000 queries/sec (50,000 × 0.10). If it cannot handle that, it will not survive. Options: raise the hit rate (longer TTL, more RAM), or scale the database (read replicas, in later lessons). Remember: a cache reduces the load, it does not remove it.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In the cache-aside pattern, what does the server do after a cache miss?', options: ['Returns an error', 'Gets it from the database, saves it in the cache, then returns it', 'Restarts the cache'], answer: 1, explain: 'Cache-aside: check the cache → miss → database → save in the cache (with a TTL) → return.' },
      { q: 'A user changed their name, but others still see the old name. What is this?', options: ['Cache stampede', 'Stale data', 'Cache hit'], answer: 1, explain: 'The cache and the database have different values. Fix: delete the cache key on update.' },
      { q: 'Which is the least safe thing to cache?', options: ['Trending posts', 'User profile photo', 'A bank balance just before a payment'], answer: 2, explain: 'Before debiting money, always read from the source of truth (the database). An old balance = real loss.' },
      { q: 'In Redis, <code>TTL user:42</code> returned <code>-2</code>. What does it mean?', options: ['The key will expire in 2 seconds', 'The key does not exist (or has already expired)', 'The key has no timer'], answer: 1, explain: '-2 = the key does not exist. -1 = the key exists but has no TTL. A positive number = that many seconds are left.' },
    ]},
    { type: 'sources', note: 'Redis commands and latency numbers were checked with these.', items: [
      { title: 'EXPIRE command (Appendix: Redis expires)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/expire/', used: 'What TTL means, SET removing the TTL, lazy (passive) and active expiry.' },
      { title: 'TTL command', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/ttl/', used: 'The TTL replies -2 (no key) and -1 (no expiry).' },
      { title: 'Latency numbers every programmer should know', publisher: 'Jeff Dean / Peter Norvig (GitHub gist by jboner)', url: 'https://gist.github.com/jboner/2841832', used: 'RAM read ~100 ns vs SSD random read ~150 µs: rough orders of magnitude. The numbers are a few years old, but the size of the gap is still right.' },
    ]},
  ],
});
