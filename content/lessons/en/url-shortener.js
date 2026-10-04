Lesson.register({
  id: 'url-shortener',
  title: 'URL shortener (Bitly)',
  minutes: 35,
  summary: `The first real design. Make a short link like xyz.co/aZ3k9Qx, and the moment someone clicks it, send them to the real page within milliseconds. One core idea (a unique short code) plus the blocks we have learned so far: Load Balancer, Cache, Database, Queue. Based on what Bitly has shared publicly (a 2014 talk and a 2023 post about moving its database).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Have you seen a long link on WhatsApp that fills two whole lines? A URL shortener turns it into something short like <code>xyz.co/aZ3k9Qx</code>. When someone clicks the short link, our server instantly says "the real page is over there, go there", and the browser goes there. The job sounds simple, but when crores of people click every day, three questions become hard: how to give every link its own code, how to answer each click within milliseconds, and how to count every click without slowing down the redirect.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Before reading on, think on paper for 10 minutes: a user gives a long URL, and you must give back a short code. How will you make the code? What happens on a click? Then compare with this lesson.` },

    { type: 'p', html: `Bitly's engineers have shared some things about their system publicly, and this lesson is based on them. Inside Bitly, making a short link is called <strong>encode</strong>, and a click is called <strong>decode</strong>. When a post on Bitly's engineering blog was written (around 2014), the system handled ~6 billion decodes per month, and a talk by Bitly's lead application developer in the same year mentioned ~600 million shortens per month. In 2023, a Bitly engineer wrote on Google Cloud's blog that on a typical day there are ~36 crore (360 million) clicks and QR scans, and 60-70 lakh new links or QR codes are created.` },
    { type: 'callout', tone: 'term', title: 'Encode and decode', html: `<strong>What it is:</strong> <em>Encode</em> = take a long URL, make a short code for it, and save it. <em>Decode</em> = take a short code, find the real URL, and send the user there. Bitly uses these names internally.<br><strong>Why we need it:</strong> the system has only two jobs, and their needs are completely different: encode happens now and then, decode happens a lot.<br><strong>Without it:</strong> you would treat both the same and put effort in the wrong place.` },
    { type: 'callout', tone: 'term', title: 'HTTP redirect', html: `<strong>What it is:</strong> a server reply that sends no page, and only says "what you are looking for is at this other address". The reply has a status code (like 301 or 302) and a <code>Location</code> header with the new address. The browser goes to that address by itself.<br><strong>Why we need it:</strong> this is the real job of a shortener. We do not show the real page; we only point the way.<br><strong>Without it:</strong> we would have to fetch and show the whole page ourselves: slow, costly, and the other site's cookies/login would break.<br><strong>Example:</strong> <code>GET xyz.co/2TX</code> → <code>301</code>, <code>Location: https://example.com/very/long/page</code>.` },
    { type: 'p', html: `A sense of scale: 6 billion per month = 6,000,000,000 / (30 × 86,400 seconds) ≈ <strong>2,300 redirects per second</strong> on average (2014). The 2023 figure of 36 crore per day means ≈ <strong>4,200 per second</strong> on average, and many times more at peak. Now think about what this scale needs.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• A user gives a long URL and gets a short link: <code>xyz.co/aZ3k9Qx</code><br>• Opening the short link redirects to the real URL<br>• (Optional) custom alias (a name you pick, like <code>xyz.co/diwali-sale</code>), expiry, click count<br><br><strong>Out of scope:</strong> user accounts, the design of dashboards` },
      right: { title: 'Non-functional', html: `• Very fast redirect: &lt; 50 ms<br>• Very high availability (a broken link = someone else's website is broken)<br>• Short codes are unique and never clash<br>• Codes are hard to guess (nice to have)<br>• The click count may be a little late (eventual)` },
    },
    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `We work out numbers only to reach design decisions. There are two presets: a big "let us assume" interview number (100M links/day), and Bitly's public numbers from 2023 (60-70 lakh links/day, ~36 crore clicks/day, so read:write ≈ 55). Change the values and watch:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips us-pre" style="padding:0">
          <button type="button" class="chip on" data-n="100" data-r="100">Interview (assumed)</button>
          <button type="button" class="chip" data-n="6.5" data-r="55">Bitly 2023 (public numbers)</button></div>
        <div class="row2" style="margin-top:10px">
          <div><label>New links per day (millions)</label><input class="us-nu" type="number" value="100" min="0.1" step="0.1"></div>
          <div><label>How many times each link is opened (read:write)</label><input class="us-rr" type="number" value="100" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Write QPS (avg)</span><strong class="us-wq"></strong></div>
          <div class="stat"><span>Read QPS (avg)</span><strong class="us-rq"></strong></div>
          <div class="stat"><span>Read QPS (peak ×3)</span><strong class="us-pq"></strong></div>
          <div class="stat"><span>Storage, 5 years</span><strong class="us-st"></strong></div>
        </div>
        <div class="calc-note us-cn"></div>`;
      const $ = c => el.querySelector(c);
      const a = $('.us-nu'), b = $('.us-rr');
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString();
      const upd = () => {
        const perDay = Math.max(0, Number(a.value) || 0) * 1e6, ratio = Math.max(1, Number(b.value) || 1);
        const w = perDay / 1e5, r = w * ratio;
        const tb = perDay * 365 * 5 * 500 / 1e12;
        $('.us-wq').textContent = f(w) + '/s';
        $('.us-rq').textContent = f(r) + '/s';
        $('.us-pq').textContent = f(r * 3) + '/s';
        $('.us-st').textContent = (tb < 10 ? tb.toFixed(1) : tb.toFixed(0)) + ' TB';
        $('.us-cn').textContent = `Conclusion: reads are ${ratio}x more than writes, so this is a read-heavy system → a cache is essential. Writes are only ${f(w)}/s, so making codes is not the hard part; answering every click fast is. We assumed ~500 bytes per link (URL + metadata). One day ≈ 10^5 seconds.`;
      };
      a.addEventListener('input', upd); b.addEventListener('input', upd);
      $('.us-pre').querySelectorAll('.chip').forEach(c => c.onclick = () => { a.value = c.dataset.n; b.value = c.dataset.r; $('.us-pre').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); upd(); });
      upd();
    }},
    { type: 'p', html: `Interview preset: ~1k writes/s, ~100k reads/s, ~91 TB in 5 years. Bitly preset: only ~65 writes/s (taking a day ≈ 10<sup>5</sup> s), ~3.6k reads/s, ~6 TB. Bitly's real data is different: in 2023 they said the dataset of ~40 billion active links was ~26 TB in Bigtable (without replication). In both cases the conclusion is the same: <strong>read-heavy, the cache matters most, and the data is bigger than one machine</strong>.` },

    { type: 'h2', text: 'Step 3: API' },
    { type: 'code', text: `
POST /api/links
  body:  { "url": "https://example.com/very/long/page?id=123" }
  →  201 Created  { "short": "https://xyz.co/2TX" }

GET /2TX
  →  301 Moved Permanently   (or 302 Found, see the deep dive below)
     Location: https://example.com/very/long/page?id=123` },
    { type: 'list', items: [
      `<strong>POST</strong> creates a new link (encode). <code>201 Created</code> means "a new thing was made".`,
      `<strong>GET /{code}</strong> gives the redirect (decode). This URL is opened straight from the browser's address bar, so there is no JSON in it, only a redirect.`,
      `According to the summary of Bitly's 2014 talk, the shorten request was kept <strong>synchronous</strong> on purpose: the user needs the link right away, and giving an error is better than giving a link that does not work. Counting clicks, on the other hand, is fully async.`,
    ]},
    { type: 'h2', text: 'Step 4: the core idea, how do we make the short code?' },
    { type: 'p', html: `This is the most important question in this design. There are three ways. Let us look at each one, because all three should come up in an interview.` },
    { type: 'h3', text: 'Way 1: a hash of the URL' },
    { type: 'callout', tone: 'term', title: 'Hash function', html: `<strong>What it is:</strong> a formula that turns any text into a fixed-size "fingerprint". The same text always gives the same fingerprint. MD5 is an old hash that gives 128 bits (32 hex characters).<br><strong>Why we need it (here):</strong> take the hash of the long URL and keep the first 7 characters: a code without any counter. Bonus: the same URL = the same code.<br><strong>Without it:</strong> to make a code, you need to get a number from somewhere (way 3).` },
    { type: 'callout', tone: 'term', title: 'Collision', html: `<strong>What it is:</strong> two different URLs getting the same short code. A full hash almost never clashes, but we keep only 7 characters, so the space becomes small.<br><strong>Why it matters:</strong> if a collision is not caught, user A's link will take people to user B's page. That is the worst possible bug.<br><strong>Without a check:</strong> wrong redirects. So with the hash way, every new code needs a DB check: "does this code exist already?" If yes, add a salt (a bit of extra text) and hash again.` },
    { type: 'h3', text: 'Way 2: a random code' },
    { type: 'p', html: `Pick 7 random characters. Like the hash: no counter, and the code is hard to guess. But the collision risk is the same, so every time you must ask the DB "is this code free?" The calculator below shows how fast this risk grows. It uses the "birthday problem" formula: the more codes already exist, the easier it is for a new code to clash with an old one.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Code length (characters)</label><input class="us-k" type="range" min="5" max="9" step="1" value="7"><div class="us-kv" style="font:600 15px var(--f-mono);color:var(--ink)"></div></div>
          <div><label>Links already created</label><input class="us-n" type="range" min="0" max="5" step="1" value="1"><div class="us-nv" style="font:600 15px var(--f-mono);color:var(--ink)"></div></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Total possible codes (62^k)</span><strong class="us-N"></strong></div>
          <div class="stat"><span>A new random code clashes</span><strong class="us-p1"></strong></div>
          <div class="stat"><span>At least one collision so far</span><strong class="us-pa"></strong></div>
          <div class="stat"><span>Clashing pairs (estimate)</span><strong class="us-ex"></strong></div>
        </div>
        <div class="calc-note us-cc"></div>`;
      const $ = c => el.querySelector(c);
      const NS = [1e4, 1e6, 1e8, 1e9, 1e10, 4e10];
      const NL = ['10 thousand', '10 lakh (1 million)', '10 crore (100 million)', '100 crore (1 billion)', '1,000 crore (10 billion)', '4,000 crore (Bitly ~40B, 2023)'];
      const fmt = x => x >= 1e12 ? (x / 1e12).toFixed(2) + ' trillion' : x >= 1e9 ? (x / 1e9).toFixed(1) + ' billion' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? Math.round(x).toLocaleString('en-IN') : x < 0.01 ? x.toExponential(1) : x.toFixed(2);
      const pc = p => p >= 0.9995 ? '~100%' : p < 0.0001 ? (p * 100).toExponential(1) + '%' : (p * 100).toFixed(p < 0.01 ? 3 : 1) + '%';
      const upd = () => {
        const k = +$('.us-k').value, n = NS[+$('.us-n').value], N = Math.pow(62, k);
        const p1 = n / N, pa = 1 - Math.exp(-n * (n - 1) / (2 * N)), ex = n * n / (2 * N);
        $('.us-kv').textContent = k + ' chars'; $('.us-nv').textContent = NL[+$('.us-n').value];
        $('.us-N').textContent = fmt(N); $('.us-p1').textContent = pc(p1); $('.us-pa').textContent = pc(pa); $('.us-ex').textContent = fmt(ex);
        $('.us-cc').textContent = pa > 0.5
          ? `A collision is almost certain. So with the hash or random way, every new code needs an "already exists?" check. With counter + base62, this check is not needed at all.`
          : `The chance of a collision is small for now, but it grows fast as links grow (with the square of n). You still need the check.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `What the calculator teaches: with 7 characters, after only <strong>10 lakh (1 million)</strong> links there is already a ~13% chance that a collision has happened somewhere. At 10 crore links, ~1,400 clashing pairs. At ~40 billion links like Bitly, each new random code clashes with an old one ~1.1% of the time. So collisions are not a "once in a while" thing; they are <strong>certain</strong>, and the check + retry is needed every time.` },
    { type: 'h3', text: 'Way 3: counter + base62' },
    { type: 'callout', tone: 'term', title: 'Base62', html: `<strong>What it is:</strong> a way of writing numbers with 62 symbols: <code>0-9</code> (10), <code>a-z</code> (26), <code>A-Z</code> (26). In decimal there are 10 symbols and a new digit starts after 10; here a new digit starts after 62.<br><strong>Why we need it:</strong> a big number fits into short text, and all the symbols are safe in a URL (no <code>/</code>, <code>?</code> or <code>+</code>). 7 base62 characters give 62<sup>7</sup> ≈ 3.5 trillion different codes.<br><strong>Without it:</strong> in decimal the same number would have 13 digits (3,521,614,606,207), and the link would get long.<br><strong>Example:</strong> 11157 ÷ 62 = 179, remainder 59 → <code>X</code>. 179 ÷ 62 = 2, remainder 55 → <code>T</code>. 2 ÷ 62 = 0, remainder 2 → <code>2</code>. Read from bottom to top: <strong>11157 = "2TX"</strong>.` },
    { type: 'p', html: `The idea: give every new link a unique <strong>number</strong> (1, 2, 3 ... 11157 ...), and write that number in base62. Unique number = unique code, so collisions cannot happen, and there is no "already exists?" check in the DB. Try it yourself:` },
    { type: 'custom', render(el) {
      const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      el.innerHTML = `<label>Type an ID number</label>
        <input class="us-b62" type="text" inputmode="numeric" value="11157">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <button type="button" class="btn small ghost" data-v="125">125</button>
          <button type="button" class="btn small ghost" data-v="11157">11157</button>
          <button type="button" class="btn small ghost" data-v="1000000">1 million</button>
          <button type="button" class="btn small ghost" data-v="3521614606207">62^7 − 1</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Short code</span><strong class="us-bo"></strong></div>
          <div class="stat"><span>Short link</span><strong class="us-bl" style="font-size:18px"></strong></div>
        </div>
        <pre class="ascii us-bs" style="margin-top:10px"></pre>
        <div class="calc-note us-bn"></div>`;
      const $ = c => el.querySelector(c), inp = $('.us-b62');
      const upd = () => {
        const raw = inp.value.replace(/[^0-9]/g, '');
        if (!raw) { $('.us-bo').textContent = '-'; $('.us-bl').textContent = '-'; $('.us-bs').textContent = ''; $('.us-bn').textContent = 'Enter a number (digits only).'; return; }
        let n = BigInt(raw), s = '';
        const rows = [];
        if (n === 0n) s = '0';
        while (n > 0n) { const q = n / 62n, r = n % 62n; rows.push(`${n} ÷ 62 = ${q}, remainder ${r} → '${A[Number(r)]}'`); s = A[Number(r)] + s; n = q; }
        $('.us-bo').textContent = s;
        $('.us-bl').textContent = 'xyz.co/' + s;
        $('.us-bs').textContent = rows.slice(0, 9).join('\n') + (rows.length > 9 ? '\n...' : '') + `\nRead from bottom to top → "${s}"`;
        $('.us-bn').textContent = `${s.length} characters. Up to 7 characters give 62^7 ≈ 3.5 trillion codes: at 100M links/day that lasts ~96 years.`;
      };
      inp.addEventListener('input', upd);
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { inp.value = b.dataset.v; upd(); });
      upd();
    }},
    { type: 'table', head: ['', 'Hash + 7 chars', 'Random 7 chars', 'Counter + base62'], rows: [
      ['Collision', 'Possible, check + retry', 'Possible, check + retry', '<strong>Never</strong> (every number is different)'],
      ['DB check on every create', 'Yes', 'Yes', 'No'],
      ['Guessing', 'Hard', 'Hard', 'Easy (next number = next code), needs scrambling'],
      ['Same URL = same code', 'Yes, automatically', 'No', 'No (needs a separate index if wanted)'],
      ['Coordination', 'Not needed', 'Not needed', 'Needs an ID generator that hands out unique numbers'],
      ['Code length', 'Fixed 7', 'Fixed 7', 'Short at first, grows slowly'],
    ]},
    { type: 'callout', tone: 'warn', html: `One downside of sequential IDs: after <code>xyz.co/2TX</code> it is easy to guess <code>xyz.co/2TY</code>, so someone could scan all links (even someone's private document link). Fix: scramble the number before encoding (a reversible shuffle, so the codes for 11157 and 11158 look completely different), or take IDs from a very big random range.` },
    { type: 'h3', text: 'Where does the unique number come from? The ID generator' },
    { type: 'callout', tone: 'term', title: 'ID generator and ID range', html: `<strong>What it is:</strong> a small service that gives out a new number every time, never repeated. The smart way: each app server takes a whole <em>range</em> at once, like 5001-6000, and uses the numbers one by one from its own memory.<br><strong>Why we need it:</strong> counter + base62 needs a unique number. With ranges, servers talk to the ID generator once per 1,000 links, not on every link.<br><strong>Without it:</strong> one central counter would be asked on every link: a bottleneck (everyone waits for it) and a SPOF (if it falls, no links can be made).<br><strong>Cost:</strong> if a server crashes, the unused numbers in its range are wasted. With 3.5 trillion codes, that is fine.` },
    { type: 'p', html: `Even if the generator is down for a while, servers keep working from their ranges. The generator itself is built on a strongly consistent store (like etcd/ZooKeeper, or one DB row increased inside a transaction), so two servers never get the same range. This range approach is the common industry approach; Bitly has not shared its exact code-generation method publicly in detail.` },
    { type: 'h2', text: 'Step 5: high-level design' },
    { type: 'p', html: `Before the diagram, understand two new boxes that will appear in this design.` },
    { type: 'callout', tone: 'term', title: 'Key-value database', html: `<strong>What it is:</strong> a database that works like a giant dictionary: give a key (the short code), get a value (the long URL). No joins, no complex queries.<br><strong>Why we need it:</strong> our access pattern is exactly this: "give the code, get the URL". It is easy to spread over many machines (sharding), and lookups take milliseconds.<br><strong>Without it:</strong> billions of rows on a single SQL server, and you would have to shard it by hand (Bitly did this for years; see the deep dive).` },
    { type: 'callout', tone: 'term', title: 'Redis cache (cache-aside)', html: `<strong>What it is:</strong> Redis = a fast key-value store kept in RAM (~1 ms). <em>Cache-aside</em> = the app looks in the cache first; if it finds the entry (a hit), it answers from there; if not (a miss), it fetches from the DB and puts it in the cache for next time. Each entry has a TTL (expiry time).<br><strong>Why we need it:</strong> reads are 55-100 times the writes. Some links (viral ones) are opened crores of times; all of that comes from RAM.<br><strong>Without it:</strong> every click goes to the DB, the DB gets a heavy load and redirects get slow. Details in the <a href="#/caching">caching lesson</a>.` },
    { type: 'p', html: `There are two flows: <strong>creating</strong> a link (rare) and <strong>opening</strong> a link (very common). Run all the scenarios; the last one is a failure:` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Client', sub: 'browser / app', x: 80, y: 170, w: 130, kind: 'client', info: 'What it is: the user\'s browser or app. The user who creates a link or clicks one.' },
        { id: 'app', label: 'App servers', sub: 'behind LB', x: 270, y: 170, w: 140, kind: 'server', info: 'What it is: a fleet of stateless servers running our code, behind a Load Balancer. Both encode (creating links) and decode (redirects) happen here. To keep the diagram simple, the LB is counted inside this box. According to Bitly\'s 2014 talk, only ~30 of ~400 servers handled all outside traffic (shortens, redirects, API, web).' },
        { id: 'id', label: 'ID generator', sub: 'unique numbers', x: 490, y: 45, w: 160, kind: 'server', info: 'What it is: a service that hands out unique, increasing numbers. Each app server takes a range of 1,000 IDs at once (like 5001-6000), so it does not have to ask for every link.' },
        { id: 'cache', label: 'Redis cache', sub: 'code → URL', x: 490, y: 170, w: 160, kind: 'cache', info: 'What it is: a fast key-value store in RAM. The code → URL mapping of hot links lives here. A viral link may be opened crores of times, all served from here in ~1 ms.' },
        { id: 'db', label: 'URL database', sub: 'key-value', x: 490, y: 280, w: 160, kind: 'data', info: 'What it is: the source of truth, the permanent code → long URL record. No joins, only lookups by key. Bitly ran a hand-sharded MySQL for years and moved to Google Cloud Bigtable (NoSQL) in 2023.' },
        { id: 'k', label: 'NSQ', sub: 'click events', x: 655, y: 60, w: 100, kind: 'queue', hidden: true, info: 'What it is: a message queue, which means a line of jobs. Bitly built NSQ itself and open-sourced it. As soon as a redirect happens, a click (decode) event is dropped here, and different services process it at their own speed.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 'id' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'app', b: 'k', id: 'ak', hidden: true }],
      scenarios: [
        { name: 'Create a link', steps: [
          { title: 'The user sends a long URL', go: 'c>app', text: 'A POST request.', msg: 'POST /api/links  { "url": "https://example.com/very/long/page" }' },
          { title: 'Get a unique number', text: 'The app server already holds an ID range and takes the next number from it: 11157. (Only when the range runs out does it ask the ID generator for a new range.)', go: ['app>id', 'res:id>app'], msg: 'next id = 11157' },
          { title: 'Convert to base62', text: '11157 → "2TX". This happens inside the server in a few microseconds. (In production: scramble first, then base62.)', focus: ['app'], msg: 'base62(11157) = "2TX"' },
          { title: 'Save in the database', text: 'The code → URL mapping is saved permanently. This is synchronous: the user gets the link only after the save is confirmed.', go: ['app>db', 'res:db>app'], msg: 'PUT 2TX → https://example.com/very/long/page' },
          { title: 'Return the short link', go: 'res:app>c', text: 'The user has the short link.', msg: '201 Created  { "short": "https://xyz.co/2TX" }' },
        ]},
        { name: 'Open a link (cache hit)', intro: 'Most traffic is this flow. This is the one that must be fast.', steps: [
          { title: 'Click', go: 'c>app', text: 'Someone clicked xyz.co/2TX.', msg: 'GET /2TX' },
          { title: 'Look in the cache: HIT', text: 'It is a popular link, and it is in Redis. ~1 ms.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit' } } },
          { title: 'Redirect', text: 'The server sends no page; it just says "go there". The browser opens the real URL by itself.', go: 'res:app>c', msg: '301 Moved Permanently\nLocation: https://example.com/very/long/page' },
        ]},
        { name: 'Open a link (cache miss)', steps: [
          { title: 'Click', go: 'c>app', text: 'An old link, opened by someone after a long time.', msg: 'GET /2TX' },
          { title: 'Cache: MISS', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss' } }, text: 'It is not in Redis.' },
          { title: 'Fetch from the database, put it in the cache', go: ['app>db', 'res:db>app', 'app>cache'], text: 'Found in the DB, and kept in the cache for next time (cache-aside).', after: { cache: { state: '' } } },
          { title: 'Redirect', go: 'res:app>c', text: 'This time it took ~10 ms more, but the next thousand clicks are fast.', msg: '301 → https://example.com/very/long/page' },
        ]},
        { name: 'Click analytics', intro: 'The business wants to know: how many times each link was opened, and from where. This analytics is Bitly\'s real business.', steps: [
          { title: 'A click arrives', go: 'c>app', text: 'GET /2TX' },
          { title: 'Redirect right away, event separately', text: 'The server sends the redirect to the user right away, and at the same time drops a "click happened" (decode) event into the NSQ queue. The user does not wait for any analytics.', show: ['k', 'ak'], parallel: true, go: ['res:app>c', 'evt:app>k'], msg: 'event: { code: "2TX", time, country: "IN" }' },
          { title: 'Why separate?', text: 'If we did count++ in the DB on every click, a viral link would cause crores of writes on one row (a hot key). Processing events separately through a queue is far cheaper and safer. This pattern is called <strong>async processing</strong>. See what happens after the queue in the next diagram.', focus: ['k'] },
        ]},
        { name: 'Failure: cache down', intro: 'A Redis node fell over. Will redirects fall over too?', steps: [
          { title: 'Redis down', set: { cache: { state: 'down', sub: 'DOWN' } }, focus: ['cache'], text: 'The cache is only an optional speed-up; the DB is the source of truth. So on a cache error the app must not crash; it must go straight to the DB (fail-open).' },
          { title: 'Every click hits the DB', flood: { paths: ['c>app>db'], n: 12 }, after: { db: { state: 'hot', sub: '100% reads' } }, text: 'Before, 90-99% of reads came from the cache. Now all of them go to the DB: 10-100 times the load. Latency goes up, and timeouts may start.' },
          { title: 'Protection', set: { db: { state: 'warn', sub: 'protected' } }, text: 'Three protections: (1) Redis replicas + automatic failover, so the cache comes back quickly. (2) A small cache of the hottest links in the app servers\' own memory. (3) Enough DB capacity to survive a while without the cache, and when the cache returns, fill it slowly (warm up), so all the misses do not hit the DB at once.' },
        ]},
      ],
    },
    { type: 'h3', text: 'How much does the cache help? Hit ratio' },
    { type: 'callout', tone: 'term', title: 'Cache hit ratio', html: `<strong>What it is:</strong> out of 100 reads, how many were found in the cache. A 95% hit ratio = 95 out of 100 come from RAM, only 5 reach the DB.<br><strong>Why we need it:</strong> this one number tells you how much load the DB gets and how fast the redirect is.<br><strong>Without it (if you ignore it):</strong> you think "we added a cache, done", while at a 50% hit ratio the DB still carries half the load.` },
    { type: 'p', html: `Below we assume: cache ~1 ms, DB ~10 ms, and on a miss the cache is checked first and then the DB (1 + 10 ms). Move the slider and see how much the DB load drops going from 90% to 99%.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Redirects per second (peak)</label><input class="us-q" type="number" value="12500" min="100" step="100"></div>
          <div><label>Cache hit ratio: <strong class="us-hv"></strong></label><input class="us-h" type="range" min="0" max="99" step="1" value="90"></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label>Hot links in the cache (millions)</label><input class="us-hot" type="number" value="10" min="0" step="1"></div>
          <div></div>
        </div>
        <div class="stats">
          <div class="stat"><span>From the cache (reads/s)</span><strong class="us-cr"></strong></div>
          <div class="stat"><span>Reaching the DB (reads/s)</span><strong class="us-dr"></strong></div>
          <div class="stat"><span>Average redirect lookup</span><strong class="us-lat"></strong></div>
          <div class="stat"><span>Cache RAM (~500 B/link)</span><strong class="us-ram"></strong></div>
        </div>
        <div class="calc-note us-hn"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const q = Math.max(0, +$('.us-q').value || 0), h = +$('.us-h').value / 100, hot = Math.max(0, +$('.us-hot').value || 0);
        const cr = q * h, dr = q * (1 - h), lat = h * 1 + (1 - h) * (1 + 10);
        $('.us-hv').textContent = Math.round(h * 100) + '%';
        $('.us-cr').textContent = Math.round(cr).toLocaleString('en-IN') + '/s';
        $('.us-dr').textContent = Math.round(dr).toLocaleString('en-IN') + '/s';
        $('.us-lat').textContent = lat.toFixed(1) + ' ms';
        $('.us-ram').textContent = (hot * 1e6 * 500 / 1e9).toFixed(1) + ' GB';
        $('.us-hn').textContent = `Without a cache: ${Math.round(q).toLocaleString('en-IN')}/s on the DB at ~10 ms. At this hit ratio the DB load is ${h > 0 ? Math.round(1 / (1 - h)) + ' times' : 'not at all'} lower. Hot links are few, so caching them is cheap: ${hot}M links ≈ ${(hot * 0.5).toFixed(1)} GB of RAM.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `At 12,500/s (~3 times Bitly's 2023 average): a 90% hit ratio → 1,250/s reach the DB, ~2 ms on average. 99% → only 125/s reach the DB, ~1.1 ms. So the last 9% of hit ratio cuts the DB load another 10 times. And a cache of 1 crore (10 million) hot links needs only ~5 GB of RAM. (These numbers are assumptions; Bitly has not published its hit ratio.)` },

    { type: 'h2', text: 'After the click: Bitly\'s stream pipeline' },
    { type: 'p', html: `Bitly does not earn money from shortening; it earns from <strong>analytics</strong>: which link got how many clicks, when, and from where. So the part after the click is the most important part for them. First, three new words.` },
    { type: 'callout', tone: 'term', title: 'Message queue (NSQ)', html: `<strong>What it is:</strong> a line of jobs. One service drops a message ("a click happened"), and other services pick it up and process it at their own speed. NSQ is an open-source message queue built by Bitly; other companies often use Kafka for the same job (<a href="#/kafka">Kafka lesson</a>).<br><strong>Why we need it:</strong> the redirect does not wait for any analytics. Drop the click message, and redirect the user right away.<br><strong>Without it:</strong> on every click the redirect server would call every analytics system itself: slow, and if one analytics system fell, the redirect would get stuck too.` },
    { type: 'callout', tone: 'term', title: 'Consumer, fan-out and backlog', html: `<strong>What it is:</strong> a <em>consumer</em> = a service that takes messages out of the queue and processes them. <em>Fan-out</em> = a copy of the same message going to many consumers (one click → archive, live counts, history, spam check). <em>Backlog</em> = messages piled up in the queue that are not processed yet.<br><strong>Why we need it:</strong> adding a new consumer is easy: the redirect code is not touched at all. And if a consumer is slow, messages just wait in the backlog.<br><strong>Without it:</strong> every new analytics feature would need a change in the redirect code.` },
    { type: 'callout', tone: 'term', title: 'Event vs command', html: `<strong>What it is:</strong> a <em>command</em> = "do X" (the sender must know who will do it). An <em>event</em> = "X happened" (the sender does not care who listens).<br><strong>Why we need it:</strong> Bitly's lead developer said in the 2014 talk that events turned out to be more useful for them: the redirect service only says "a click happened", and any number of consumers can listen.<br><strong>Without it:</strong> the redirect service would need to know the name and job of every consumer, and everything would get tied together.` },
    { type: 'p', html: `Now the pipeline. This part is based on Bitly's publicly shared material. According to the summary of the 2014 talk, as soon as a redirect happens, the click message goes to several services: an archive service (which saves it in HDFS and S3; both are stores for big files), real-time analytics, long-term history analytics, and an annotation service. According to Bitly's blog, some steps also detect spam and abuse, and processed data is often put back into the queue for the next step.` },
    { type: 'flow', title: 'After one decode (click)', height: 340,
      nodes: [
        { id: 'u', label: 'Click', sub: 'user', x: 70, y: 170, w: 110, kind: 'client', info: 'What it is: the user who clicked a bit.ly link. They just want a quick redirect.' },
        { id: 'r', label: 'Redirect', sub: 'decode', x: 220, y: 170, w: 130, kind: 'server', info: 'What it is: the server that decodes. It turns the link into the real URL, sends an HTTP redirect, and drops an event into the queue. The user does not wait for any analytics.' },
        { id: 'q', label: 'NSQ', sub: 'message queue', x: 395, y: 170, w: 120, kind: 'queue', info: 'What it is: the open-source message queue built by Bitly. Every consumer gets its own copy, and a message waits in the queue until its consumer is ready.' },
        { id: 'a', label: 'Archive', sub: 'HDFS + S3', x: 595, y: 45, w: 170, kind: 'data', info: 'What it is: the service that saves the raw record of every click permanently (HDFS and S3, both stores for big files). Any kind of analysis can be run again later.' },
        { id: 'rt', label: 'Real-time analytics', sub: 'live counts', x: 595, y: 128, w: 170, kind: 'server', info: 'What it is: the service that counts how many clicks came in just now. For dashboards.' },
        { id: 'hi', label: 'History analytics', sub: 'long-term', x: 595, y: 211, w: 170, kind: 'server', info: 'What it is: the service that keeps long-term totals: which day, which country, which referrer (the site the click came from).' },
        { id: 'sp', label: 'Spam / abuse', sub: 'detection', x: 595, y: 294, w: 170, kind: 'threat', info: 'What it is: the steps that catch bad links (spam, phishing, malware). According to Bitly\'s blog, some steps of the processing chain do exactly this.' },
      ],
      edges: [{ a: 'u', b: 'r' }, { a: 'r', b: 'q' }, { a: 'q', b: 'a' }, { a: 'q', b: 'rt' }, { a: 'q', b: 'hi' }, { a: 'q', b: 'sp' }],
      scenarios: [
        { name: 'Normal click', steps: [
          { title: 'Click and an instant redirect', text: 'The user gets the redirect first. The event goes to the queue separately.', parallel: true, go: ['u>r', 'evt:r>q'] },
          { title: 'The redirect reaches the user', go: 'res:r>u', text: 'The user has reached the real page. No analytics has run yet.' },
          { title: 'The queue gives each consumer a copy', text: 'One event for four different jobs. Each service works at its own speed. This is called <strong>fan-out</strong>.', parallel: true, go: ['evt:q>a', 'evt:q>rt', 'evt:q>hi', 'evt:q>sp'] },
          { title: 'The chain moves on', text: 'According to Bitly\'s blog, processed data is often put back into the queue for the next step. So this is not a straight line, but a pipeline shaped like a graph.', go: 'evt:rt>q' },
        ]},
        { name: 'One consumer down', intro: 'Bitly\'s blog points out this resilience on purpose.', steps: [
          { title: 'History analytics crashes', set: { hi: { state: 'down', sub: 'DOWN' } }, focus: ['hi'], text: 'One processing step fell over.' },
          { title: 'Clicks keep coming', text: 'Redirects are completely normal. The other consumers are normal too. The history messages are piling up in the queue (a backlog).', flood: { paths: ['evt:u>r>q'], n: 6 }, after: { q: { state: 'warn', sub: 'history backlog' } } },
          { title: 'Recovered, the backlog is cleared', text: 'The service came back and processed the piled-up messages at its own speed. A problem in one part did not bring down the whole system. Another lesson from Bitly\'s 2014 talk is linked to this: <strong>backpressure</strong>, which means a busy service signals other services to "send more slowly".', set: { hi: { state: 'ok', sub: 'catching up' } }, flood: { paths: ['evt:q>hi'], n: 6 }, after: { q: { state: '', sub: 'message queue' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Step 6: deep dives' },
    { type: 'h3', text: '301 or 302 redirect?' },
    { type: 'callout', tone: 'term', title: '301 and 302', html: `<strong>What it is:</strong> both are status codes for a redirect. <strong>301 Moved Permanently</strong> = "this has moved there for good". <strong>302 Found</strong> = "look over there for now".<br><strong>Why the difference matters:</strong> under the HTTP rules (RFC 9110, 2022), browsers and proxies in between may cache (remember) a 301 by themselves. Then next time the browser does not even ask our server. A 302 is not cached by default.<br><strong>Without thinking about it:</strong> with 301, repeat clicks quietly vanish from the count; with 302, the server carries extra load for nothing.` },
    { type: 'table', head: ['', '301 Permanent', '302 Temporary'], rows: [
      ['What the browser does', 'May remember it, and next time not come to our server at all', 'Asks our server every time'],
      ['Server load', 'Low', 'High'],
      ['Analytics', 'Repeat clicks can be missed', 'Every click is counted'],
      ['Search engines', 'Treat the real page as "permanent" (good for SEO)', 'Treat the short link as temporary'],
      ['When', 'You need speed + SEO', 'Every click must be counted, or the destination may change'],
    ]},
    { type: 'p', html: `What does Bitly actually do? According to Bitly's support page, its links give a <strong>301</strong> redirect, because a link, once made, is never changed or reused. But clicks are still counted. How? We checked the response of two public bit.ly links ourselves in October 2026: the reply was <code>301</code> with <code>Cache-Control: private, max-age=90</code>. This means the browser may remember the redirect for only <strong>90 seconds</strong>, and "private" means shared proxies in between will not cache it. It is a middle path: the SEO benefit of 301, and every click after 90 seconds reaches the server again.` },
    { type: 'callout', tone: 'mistake', title: '301 or 302? A tiny status code, a big difference', html: `Beginners often think "a redirect is a redirect". But if you send a 301 without any <code>Cache-Control</code> header, the browser may remember it for a long time: when the user opens the link a second time, the browser goes straight to the real URL and our server never finds out. The redirect is fast and the server load is low, but <strong>that click's analytics is gone</strong>. And if the destination must change later (a wrong link), old browsers will not listen.<br><br>In an interview, say all three: "If every click must be counted, 302. If we also want speed and SEO, 301 with a short <code>max-age</code>, like the 90 seconds Bitly uses. If we only want speed and no counting, a plain 301."` },

    { type: 'h3', text: 'Which database? Bitly\'s story' },
    { type: 'p', html: `Look at the access pattern: only "give the code, get the URL". No joins, no complex queries, and the data is in TBs. This is a perfect <strong>key-value</strong> use case. This much data does not fit on one machine, so we need sharding; shard key = the short code (hashed, so the data spreads evenly).` },
    { type: 'p', html: `Bitly's real journey teaches exactly this. In a July 2023 Google Cloud blog post, a Bitly engineer wrote that for years the link data lived in a <strong>MySQL database sharded by hand</strong>. The problems: keeping it 100% available during upgrades was hard, the daily backup took almost a whole day, changing the sharding config was so risky that they avoided touching it, and going multi-region was very hard. So they chose <strong>Cloud Bigtable</strong> (Google's managed NoSQL wide-column database), because their data is read by a single primary key and does not need relational features.` },
    { type: 'list', items: [
      `<strong>How they migrated:</strong> first "dual writes" (write new data to both places), then copy the old data with Go scripts, then validate by comparing the data in both, then move reads to the new DB slowly, in percentages. They kept writing to MySQL for a while so they could roll back.`,
      `<strong>Numbers (2023):</strong> they walked through 80 billion MySQL rows; the data of an old feature was left out, so only ~40 billion records moved; ~26 TB in Bigtable (without replication); the whole migration took 6 days.`,
      `<strong>The lesson:</strong> data that is "looked up by one primary key" works in SQL at first too, but at a big scale a managed key-value / wide-column store makes operations (sharding, replication, backups) much easier.`,
    ]},

    { type: 'h3', text: 'What else can break?' },
    { type: 'table', head: ['What fell / what happened', 'What happens', 'Protection'], rows: [
      ['ID generator down', 'New links are still made as long as the servers\' ranges last. Redirects are not affected.', 'Big ranges, replicas of the generator (on a consensus store), an alert.'],
      ['One DB shard down', 'Cache misses for codes on that shard fail. Everything else keeps running.', 'Replicas + failover for every shard; Bitly chose Bigtable\'s multi-region replication and backups.'],
      ['Queue (NSQ/Kafka) down', 'Redirects must keep working! Only analytics stops.', 'Keep sending events fire-and-forget; a small buffer in the app\'s memory/disk; the redirect never waits for the queue.'],
      ['Viral link (hot key)', 'Lakhs of reads per second on one cache key.', 'A cache in the app servers\' local memory too, Redis replicas, caching the redirect at the CDN/edge.'],
      ['Spam / phishing links', 'Our whole domain can land on a block list.', 'Check the URL on create, spam detection on clicks (a step in Bitly\'s pipeline), a report/disable button.'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Encode + decode, custom alias, expiry. NFR: redirect < 50 ms, very high availability, unique codes, eventual analytics.' },
      { t: 'Napkin maths', d: 'Writes are small (~100-1k/s), reads are 50-100 times more. So read-heavy: the cache matters most. Storage in TBs: a sharded key-value store.' },
      { t: 'API', d: 'POST /api/links → 201; GET /{code} → 301/302 + Location.' },
      { t: 'Code generation', d: 'Hash/random = a collision check; counter + base62 = zero collisions, no SPOF thanks to ID ranges, not guessable thanks to scrambling.' },
      { t: 'High-level design', d: 'Client → LB → stateless app → Redis (cache-aside) → key-value DB; ID generator; click events → queue.' },
      { t: 'Deep dives', d: '301 vs 302 (Bitly: 301 + max-age=90); hit ratio; async analytics fan-out (NSQ); DB choice (Bitly MySQL → Bigtable, 2023); failures.' },
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 640,
      caption: 'Top to bottom: users, the front door (LB), two services (encode, decode), data, and the analytics after a click. Use the buttons to see one path at a time.',
      groups: [
        { label: 'Users', x: 10, y: 10, w: 700, h: 84 },
        { label: 'Edge', x: 10, y: 108, w: 700, h: 84 },
        { label: 'Services', x: 10, y: 206, w: 700, h: 100 },
        { label: 'Data + queue', x: 10, y: 324, w: 700, h: 92 },
        { label: 'Analytics', x: 10, y: 432, w: 700, h: 198 },
      ],
      nodes: [
        { id: 'client', label: 'Users', sub: 'browser / app', x: 360, y: 50, w: 200, kind: 'client', info: 'What it is: the people who create links or click a short link. Clicks are 50-100 times more common than creates.' },
        { id: 'lb', label: 'Load balancer', sub: 'DNS → LB', x: 360, y: 150, w: 200, kind: 'net', info: 'What it is: the public front door of the system. DNS points xyz.co to its address, and it spreads requests across healthy servers. Without it, one server falling means everything falls.' },
        { id: 'create', label: 'Link API', sub: 'encode', x: 170, y: 256, w: 150, kind: 'server', info: 'What it is: the stateless service that creates links. It takes a number from its ID range, scrambles it + converts it to base62, saves it in the DB, then returns 201. Synchronous, because the user needs a working link right away.' },
        { id: 'redir', label: 'Redirect svc', sub: 'decode', x: 550, y: 256, w: 150, kind: 'server', info: 'What it is: the stateless service that handles clicks. Cache, then the DB if needed, then 301/302 + Location. Along with it, a click event goes into the queue. Most traffic lands here.' },
        { id: 'idg', label: 'ID generator', sub: 'ranges', x: 85, y: 370, w: 130, kind: 'server', info: 'What it is: a small service that hands out ranges of unique numbers, built on a strongly consistent store. Thanks to ranges, it is not a bottleneck or a SPOF.' },
        { id: 'db', label: 'Link DB', sub: 'sharded KV', x: 290, y: 370, w: 150, kind: 'data', info: 'What it is: the permanent code → URL record (the source of truth). Key-value, sharded by code. Bitly: a hand-sharded MySQL at first, Cloud Bigtable since 2023.' },
        { id: 'cache', label: 'Redis cache', sub: 'code → URL', x: 470, y: 370, w: 150, kind: 'cache', info: 'What it is: hot links kept in RAM. Cache-aside: look here first; on a miss, fetch from the DB and keep it here. The higher the hit ratio, the calmer the DB.' },
        { id: 'q', label: 'Queue', sub: 'NSQ / Kafka', x: 640, y: 370, w: 120, kind: 'queue', info: 'What it is: the line of click events. Bitly uses NSQ (built in-house, open source); many companies use Kafka. The redirect never waits for it.' },
        { id: 'arch', label: 'Archive', sub: 'HDFS + S3', x: 110, y: 490, w: 150, kind: 'data', info: 'What it is: the raw record of every click, kept forever. Any new analysis can be run again later.' },
        { id: 'rt', label: 'Real-time stats', sub: 'live counts', x: 290, y: 490, w: 150, kind: 'server', info: 'What it is: the consumer that counts how many clicks are coming in right now. The live numbers on dashboards come from it.' },
        { id: 'hist', label: 'History stats', sub: 'days, countries', x: 470, y: 490, w: 150, kind: 'server', info: 'What it is: the consumer that keeps long-term totals: how many clicks on which day, from which country, from which referrer.' },
        { id: 'spam', label: 'Spam check', sub: 'abuse', x: 640, y: 490, w: 120, kind: 'threat', info: 'What it is: the step that catches bad links (spam, phishing). Some steps in Bitly\'s pipeline do this.' },
        { id: 'stats', label: 'Stats API', sub: 'customer dashboards', x: 380, y: 590, w: 200, kind: 'server', info: 'What it is: the API that brings the processed data to customers. According to Bitly\'s blog, processed data reaches dashboards and reports through a service-oriented API.' },
      ],
      edges: [
        { a: 'client', b: 'lb', n: 1 },
        { a: 'lb', b: 'create', label: 'POST /links' },
        { a: 'lb', b: 'redir', label: 'GET /2TX' },
        { a: 'create', b: 'idg', label: 'ID range' },
        { a: 'create', b: 'db', label: 'save' },
        { a: 'redir', b: 'cache', label: 'cache?' },
        { a: 'redir', b: 'db', label: 'on miss', dashed: true },
        { a: 'redir', b: 'q', kind: 'evt', label: 'click event' },
        { a: 'redir', b: 'client', kind: 'res', label: '301/302', via: [[680, 256], [680, 50]] },
        { a: 'q', b: 'spam', kind: 'evt' },
        { a: 'q', b: 'hist', kind: 'evt', via: [[640, 440], [470, 440]] },
        { a: 'q', b: 'rt', kind: 'evt', via: [[640, 440], [290, 440]] },
        { a: 'q', b: 'arch', kind: 'evt', via: [[640, 440], [110, 440]] },
        { a: 'rt', b: 'stats' },
        { a: 'hist', b: 'stats' },
      ],
      paths: [
        { name: 'Create a link', text: 'User → LB → Link API → next number from its range (ID generator) → scramble + base62 → save in the Link DB → 201 + short link.', go: ['client>lb>create>idg', 'create>db'] },
        { name: 'Redirect', text: 'Click → LB → Redirect service → Redis (hit: ~1 ms) → on a miss, the Link DB → 301/302 + Location back to the browser.', go: ['client>lb>redir>cache', 'redir>db', 'redir>client'] },
        { name: 'Analytics', text: 'Along with the redirect, a click event goes into the queue → fan-out: archive, real-time, history, spam → dashboards through the Stats API. The redirect never waits for it.', go: ['redir>q>rt>stats', 'q>hist>stats', 'q>arch', 'q>spam'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Two jobs: <strong>encode</strong> (creating links, rare) and <strong>decode</strong> (redirects, very common). The system is read-heavy, so the <strong>cache</strong> matters most.</li>
      <li>Codes: with hash/random, collisions are certain (the birthday problem), so you check every time. <strong>Counter + base62</strong> = zero collisions; 7 chars ≈ 3.5 trillion codes.</li>
      <li>For the counter, use <strong>ID ranges</strong>: the generator does not become a bottleneck/SPOF; a few IDs are wasted on a crash, which is fine. <strong>Scramble</strong> sequential codes.</li>
      <li>Redirect = status code + <code>Location</code>. A <strong>301</strong> gets cached (fast, SEO), a <strong>302</strong> sends every click to the server. Bitly: 301 + <code>max-age=90</code>.</li>
      <li>The data is "lookup by code": a <strong>sharded key-value</strong> store. Bitly 2023: hand-sharded MySQL → Cloud Bigtable, using dual writes.</li>
      <li>Count clicks <strong>async</strong>: an event in a queue (Bitly: NSQ), fan-out to archive, live stats, history, spam. If a consumer falls, there is only a backlog.</li>
      <li>If the cache falls, the DB gets a heavy load: replicas, a local cache, warm-up. Even if the queue falls, redirects must keep working.</li>
    </ul>` },

    { type: 'h2', text: 'The trade-offs we made' },
    { type: 'tradeoffs', gains: ['Counter + base62: zero collisions, short codes, no DB check on create', 'Cache: most redirects in ~1 ms, a calm DB', 'Async analytics: the redirect is never slow, and adding new consumers is easy', 'Stateless servers: easy to scale', 'Key-value store: simple sharding and replication'], costs: ['Sequential codes are guessable (we must scramble them)', 'ID ranges: some IDs are wasted when a server crashes (fine)', 'Analytics updates a little late (eventual)', 'Choosing 302 means more server load; choosing 301 means some repeat clicks are missed', 'If the cache goes down, the DB suddenly gets a heavy load'] },

    { type: 'think', questions: [
      { q: 'A link went viral: 1 lakh clicks per second. What could break?', a: 'All the clicks land on one cache key (a hot key). One Redis node may handle it, but if not: also cache that key in the app servers\' local memory, or spread reads across Redis replicas. The queue absorbs the click events. A 301 with a short max-age also helps: repeat clicks from the same browser do not reach the server for 90 seconds.' },
      { q: 'If two users shorten the same long URL, should they get the same code or different ones?', a: 'It is a product decision. To give the same code you need another "URL → code" index (an extra lookup + storage), or the hash way. Giving different codes is simpler, and each user\'s analytics stays separate. Most services give different codes.' },
      { q: 'How does a custom alias (xyz.co/diwali-sale) work with counter + base62?', a: 'The user picks the alias, so it can clash: a DB "already exists?" check is a must (insert with a unique key; if it fails, "this name is taken"). Also make sure an alias can never clash with a base62 code: for example, make aliases at least 8 characters long, or use a separate namespace/prefix.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Is a URL shortener read-heavy or write-heavy?', options: ['Write-heavy', 'Read-heavy (~50-100:1)', 'Equal'], answer: 1, explain: 'A link is created once and opened many times. In Bitly\'s 2023 numbers too, clicks were ~55 times the new links. That is why the cache is the most important component.' },
      { q: 'Why counter + base62 instead of the first 7 characters of a hash?', options: ['Base62 is more secure', 'A unique number can never collide, so there is no DB check on every create', 'Hashing is slow'], answer: 1, explain: 'Every number is unique, so every code is unique. Cutting a hash short makes collisions certain (a ~13% chance with just 1 million links), so a check + retry is needed.' },
      { q: 'Why put click events in a queue instead of doing count++ on a DB row for every click?', options: ['A queue is cheaper', 'So the redirect stays fast and a viral link does not cause a storm of writes on one row', 'A DB cannot store a count'], answer: 1, explain: 'Async processing: the user gets an instant response, and separate consumers do the counting at their own speed. Bitly\'s stream pipeline is built on this idea.' },
      { q: 'Bitly sends a 301, so how does it still count clicks?', options: ['A 301 is never cached', 'The 301 comes with Cache-Control: private, max-age=90, so the browser remembers it for only 90 seconds', 'Bitly runs JavaScript', 'Bitly only counts the first click'], answer: 1, explain: 'The header limits how long the browser remembers the redirect to 90 seconds, and "private" stops shared proxies from caching it. Clicks after that reach the server again.' },
      { q: 'The ID generator went down. What happens right away?', options: ['All redirects stop', 'Servers keep creating links from their remaining ranges; redirects are not affected', 'The DB data is wiped', 'The cache gets emptied'], answer: 1, explain: 'This is exactly why ranges exist: the generator is not on the path of every link. Redirects do not need the generator at all.' },
    ]},
    { type: 'sources', note: 'The Bitly-specific parts of this lesson come from these sources. Where there is no source for a number (QPS, hit ratio), the lesson says it is an assumption.', items: [
      { title: 'Joining Bitly Engineering', publisher: 'Bitly engineering blog (word.bitly.com)', official: true, year: 2014, url: 'https://word.bitly.com/post/77292911854', used: 'Encode/decode terms, ~6B decodes/month, stream-based processing chain, NSQ, spam/abuse steps, processed data put back in the queue, backlog resilience, service API for dashboards.' },
      { title: 'Bitly: Lessons Learned Building a Distributed System that Handles 6 Billion Clicks a Month', publisher: 'High Scalability, summary of a talk by Bitly\'s lead application developer', year: 2014, url: 'https://highscalability.com/bitly-lessons-learned-building-a-distributed-system-that-han/', used: 'Click fan-out to archive (HDFS, S3), real-time, history, annotation; ~600M shortens/month; ~30 of ~400 servers take outside traffic; shortening kept synchronous; events vs commands; backpressure.' },
      { title: 'Lessons Learned Building Distributed Systems at Bitly (Sean O\'Connor talk)', publisher: 'InfoQ news summary', year: 2014, url: 'https://www.infoq.com/news/2014/07/bitly-lessons-learned', used: 'Talk date and context (May 2014), stream-based processing and queue use, a cross-check of the High Scalability summary.' },
      { title: 'From MySQL to NoSQL: Bitly\'s big move to Bigtable', publisher: 'Google Cloud blog (written by a Bitly senior software engineer)', official: true, year: 2023, url: 'https://cloud.google.com/blog/products/databases/bitly-migrates-link-data-from-mysql-to-bigtable-for-scalability/', used: '~360M clicks/day and 6-7M links/day, ~40B active links, problems with hand-sharded MySQL, why Bigtable, dual writes + validation + gradual cutover, 80B rows → ~40B records, ~26 TB, 6 days, backups.' },
      { title: 'Bitly support: Bitly links use 301 redirects', publisher: 'Bitly support', official: true, url: 'https://support.bitly.com/hc/en-us/articles/230897368', used: 'Bitly links are 301 (permanent) redirects because links are never reused or changed. Cross-checked by looking at two public bit.ly responses in October 2026 (301 with Cache-Control: private, max-age=90).' },
      { title: 'RFC 9110: HTTP Semantics, sections 15.4.2 (301) and 15.4.3 (302)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110#name-301-moved-permanently', used: 'A 301 may be cached by default while a 302 is not; the basis for the 301 vs 302 analytics trade-off.' },
      { title: 'NSQ: a realtime distributed messaging platform', publisher: 'nsq.io (open source project started at Bitly)', official: true, url: 'https://nsq.io/overview/design.html', used: 'What NSQ is and its design goals (distributed, no single broker), for the click-event queue.' },
    ]},
  ],
});
