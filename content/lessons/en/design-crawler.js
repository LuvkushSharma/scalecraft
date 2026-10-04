(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */
  // Frontier simulator: 4 main hosts (A is a big site), optional 8 small hosts. Fetch time ms per host.
  const CR_HOSTS = { A: 500, B: 1000, C: 500, D: 1500, E: 500, F: 1000, G: 500, H: 1000, I: 500, J: 1000, K: 500, L: 1000 }; // fetch time ms
  const CR_BASE = 'A1 A2 A3 B1 A4 A5 C1 A6 B2 A7 C2 D1 A8 B3 C3 D2'.split(' ');
  const CR_EXTRA = 'E1 F1 G1 H1 I1 J1 K1 L1 E2 F2 G2 H2 I2 J2 K2 L2'.split(' ');
  function crSim(nF, delay, polite, extra) {
    const CR_URLS = extra ? CR_BASE.flatMap((u, i) => [u, CR_EXTRA[i]]) : CR_BASE;
    const free = Array(nF).fill(0), jobs = [];
    if (!polite) {
      CR_URLS.forEach(u => {
        let f = 0; for (let i = 1; i < nF; i++) if (free[i] < free[f]) f = i;
        const s = free[f], e = s + CR_HOSTS[u[0]];
        jobs.push({ u, h: u[0], f, s, e }); free[f] = e;
      });
    } else {
      const q = {}; CR_URLS.forEach((u, i) => { (q[u[0]] = q[u[0]] || []).push(i); });
      const allowed = {}; Object.keys(q).forEach(h => { allowed[h] = 0; });
      let left = CR_URLS.length;
      while (left > 0) {
        let f = 0; for (let i = 1; i < nF; i++) if (free[i] < free[f]) f = i;
        let best = null;
        for (const h of Object.keys(q)) {
          if (!q[h].length) continue;
          const st = Math.max(free[f], allowed[h]);
          if (!best || st < best.st || (st === best.st && q[h][0] < q[best.h][0])) best = { h, st };
        }
        const idx = q[best.h].shift(), u = CR_URLS[idx], e = best.st + CR_HOSTS[best.h];
        jobs.push({ u, h: best.h, f, s: best.st, e });
        free[f] = e; allowed[best.h] = e + delay; left--;
      }
    }
    const total = Math.max(...jobs.map(j => j.e));
    const stats = {};
    for (const h of Object.keys(CR_HOSTS)) { if (!jobs.some(j => j.h === h)) continue;
      const js = jobs.filter(j => j.h === h).sort((a, b) => a.s - b.s);
      let gap = Infinity, conc = 0;
      for (let i = 1; i < js.length; i++) gap = Math.min(gap, js[i].s - js[i - 1].e);
      js.forEach(a => { const c = js.filter(b => b.s < a.e && b.e > a.s).length; conc = Math.max(conc, c); });
      stats[h] = { n: js.length, gap: js.length > 1 ? gap : null, conc };
    }
    const busy = jobs.reduce((a, j) => a + j.e - j.s, 0);
    return { jobs, total, stats, idle: 1 - busy / (total * nF) };
  }
  // SimHash (Charikar), 64 bits = two 32-bit hashes. Feature = word, weight = how many times it appears.
  function h32(s, seed) { let h = (2166136261 ^ seed) >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15; return h >>> 0; }
  function crWords(t) { return (t.toLowerCase().match(/[a-z0-9ऀ-ॿ]+/g) || []); }
  function simhash(t) {
    const w = {}; crWords(t).forEach(x => { w[x] = (w[x] || 0) + 1; });
    const v = new Array(64).fill(0);
    for (const f in w) {
      const a = h32(f, 1), b = h32(f, 7);
      for (let i = 0; i < 64; i++) { const bit = i < 32 ? (a >>> i) & 1 : (b >>> (i - 32)) & 1; v[i] += bit ? w[f] : -w[f]; }
    }
    return v.map(x => (x > 0 ? 1 : 0));
  }
  function exactFp(t) { return (h32(t, 3).toString(16).padStart(8, '0') + h32(t, 9).toString(16).padStart(8, '0')); }
  const hamming = (a, b) => a.reduce((n, x, i) => n + (x !== b[i] ? 1 : 0), 0);
  const SH_DOCS = {
    a: 'Watch the full video of Virat Kohli\'s century on xyz.com. In this match India beat Australia by six wickets. Kohli scored 104 runs from 120 balls and won the game for his team. Clips of the highlights, interviews and press conference are also below. Share the video and subscribe to the channel. Views: 10,231. Updated: 4 Oct 2026, 10:15',
    b: 'Watch the full video of Virat Kohli\'s century on xyz.com. In this match India beat Australia by six wickets. Kohli scored 104 runs from 120 balls and won the game for his team. Clips of the highlights, interviews and press conference are also below. Share the video and subscribe to the channel. Views: 10,245. Updated: 4 Oct 2026, 10:17',
    c: 'Learn Python: this tutorial video explains lists, loops and functions from the very basics. First variables, then if-else, and at the end we build a small number guessing game. The full code is in the description below. Views: 3,120. Updated: 2 Oct 2026, 18:40',
  };

  Lesson.register({
    id: 'design-crawler',
    title: 'Web crawler',
    minutes: 35,
    summary: `xyz.com now wants to build search over the whole web, and for that it first needs the pages of the web. A crawler downloads billions of pages, without troubling any website and without fetching the same page twice. URL frontier, politeness, robots.txt, DNS caching, Bloom filter and SimHash: all in one pipeline.`,
    _test: { crSim, simhash, hamming, exactFp, SH_DOCS },
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Search anything on Google and the answer comes in a second. That is because Google already keeps a copy of billions of web pages.<br>That copy is made by a program called a <strong>crawler</strong>. It opens a page, reads the links in it, then opens the pages behind those links, and keeps going like this.<br>The hard part: do not open any website so fast that it falls over, do not fetch the same page twice, and do not get stuck in never-ending webs of links (traps).<br>This lesson teaches exactly that: how to read the whole web politely, without repeating yourself.` },
      { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper: you have 10 URLs. Download each page, take the new links from it, download those too... When will this stop? If you find 1,000 links on one website, will you hit them all at once? If the same page arrives twice, how will you know? Then compare with this lesson.` },
      { type: 'p', html: `Until now, xyz.com search only looked through its own videos. The new plan: search over the whole web (we will see the index and ranking in the Google Search lesson). Step one: <strong>bring the pages of the web to us</strong>. A crawler does this job.` },
      { type: 'h2', text: 'Step 0: from zero, the web and the crawler' },
      { type: 'p', html: `First, four small words, because the whole lesson runs on them:` },
      { type: 'list', items: [
        '<strong>Web page</strong>: a file that the browser shows. Inside it there is text and <strong>HTML</strong> (the code that says what is a heading, where an image goes, where a link is).',
        '<strong>URL</strong>: the full address of a page, like <code>https://news.example.in/cricket/final</code>. It has three parts: the scheme (<code>https</code>), the <strong>host</strong> (<code>news.example.in</code>, which website/server), and the path (<code>/cricket/final</code>, which page inside the site).',
        '<strong>Link</strong>: the URL of another page written inside a page (in HTML, <code>&lt;a href="..."&gt;</code>). The web is a net joined together by these.',
        '<strong>Download (fetch)</strong>: sending an HTTP request to the server and getting a copy of the page. The server answers with a status code: <code>200</code> = found, <code>404</code> = no such page, <code>429</code> = "too many requests, slow down", <code>503</code> = the server is in trouble.',
      ]},
      { type: 'callout', tone: 'term', title: 'New word: Web crawler', html: `<strong>What it is:</strong> a program that starts from a few starting URLs (<strong>seed URLs</strong>), downloads each page, takes out the links in it, and adds those links to the list of pages to download. It is also called a <em>spider</em> or a <em>bot</em>. Googlebot, Bingbot, and Common Crawl's CCBot are famous examples.<br><strong>Why we need it:</strong> a search engine can only search the pages it already has. The web has no central register listing all pages; pages are found only by following links.<br><strong>Without it:</strong> xyz.com's web search is empty. Opening billions of sites live on every search is impossible.` },
      { type: 'p', html: `Do a small crawl by hand. Seed: <code>xyz.com/</code>. This page has two links: <code>/videos</code> and <code>/about</code>. Add both to the back of a "fetch later" list. Now take the next one from the list (<code>/videos</code>), download it, find 3 new links in it, and add those to the back of the list too. This list is a <strong>queue</strong> (first in, first out), and this order of "near pages first, far pages later" is called <strong>BFS</strong> (breadth-first search) on a graph.` },
      { type: 'p', html: `The basic algorithm is one line: <strong>take a URL from the queue → download → take out links → new links into the queue</strong>. This is BFS (breadth-first search) on a graph. But on the web, this simple loop breaks in four places, and these four places are the deep dives of this lesson:` },
      { type: 'list', items: [
        '<strong>Politeness:</strong> if you find 1,000 links of one site, BFS will hit them one after another. For a small site this is like a DDoS (DDoS = sending so many requests that the site falls over).',
        '<strong>Duplicates:</strong> the same URL is linked from many pages; the same content sits at different URLs (mirrors, tracking params). Without dedupe, the crawler spends half its time fetching junk.',
        '<strong>Traps:</strong> some sites have infinite URLs (a calendar\'s "next month", forever). BFS will never finish.',
        '<strong>Freshness:</strong> the web keeps changing. Which page should be fetched again, and when?',
      ]},

      { type: 'h2', text: 'Step 1: requirements' },
      { type: 'compare',
        left: { title: 'Functional', html: `• Start from seed URLs and download HTML pages<br>• Take out links and find new URLs<br>• Save pages in storage (for the indexer)<br>• Obey robots.txt<br>• Crawl pages again from time to time (recrawl)<br><br><strong>Out of scope:</strong> indexing, ranking, rendering JavaScript-heavy pages` },
        right: { title: 'Non-functional', html: `• Scale: billions of pages, thousands of pages per second<br>• <strong>Politeness</strong>: no heavy load on any one site<br>• Robust: broken HTML, slow servers, traps, malicious pages<br>• Extensible: new content types (PDF, images) can be added later<br>• Restartable: after a crash, continue from where it stopped (checkpoints)` },
      },

      { type: 'h2', text: 'Step 2: napkin maths' },
      { type: 'p', html: `A real number for reference: the December 2025 crawl of Common Crawl (a non-profit that gives researchers a free copy of the web) ran for ~2 weeks and had 2.16 billion pages, ~364 TiB uncompressed. So the average page is ~185 KB (364 TiB ≈ 400 TB). One word: a <strong>fetcher</strong> = the part of the crawler (or machine) that really downloads pages. Start from these numbers and change them:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Pages (billions)</label><input class="cr-n-p" type="number" value="2" min="0.1" step="0.1"></div>
            <div><label>In how many days</label><input class="cr-n-d" type="number" value="14" min="1" step="1"></div>
            <div><label>Average page size (KB)</label><input class="cr-n-s" type="number" value="185" min="1" step="10"></div>
            <div><label>Pages/sec for one fetcher machine</label><input class="cr-n-m" type="number" value="100" min="1" step="10"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Pages/sec</span><strong class="cr-n-o1"></strong></div>
            <div class="stat"><span>Download bandwidth</span><strong class="cr-n-o2"></strong></div>
            <div class="stat"><span>Raw storage</span><strong class="cr-n-o3"></strong></div>
            <div class="stat"><span>Fetcher machines</span><strong class="cr-n-o4"></strong></div>
          </div>
          <div class="calc-note cr-n-note"></div>`;
        const q = c => el.querySelector(c);
        const upd = () => {
          const v = c => Math.max(0.0001, Number(q(c).value) || 0);
          const pps = v('.cr-n-p') * 1e9 / (v('.cr-n-d') * 86400);
          const gbps = pps * v('.cr-n-s') * 1000 * 8 / 1e9;
          const tb = v('.cr-n-p') * 1e9 * v('.cr-n-s') * 1000 / 1e12;
          q('.cr-n-o1').textContent = Math.round(pps).toLocaleString('en-IN') + '/s';
          q('.cr-n-o2').textContent = gbps.toFixed(1) + ' Gbps';
          q('.cr-n-o3').textContent = Math.round(tb).toLocaleString('en-IN') + ' TB';
          q('.cr-n-o4').textContent = Math.ceil(pps / v('.cr-n-m'));
          q('.cr-n-note').textContent = 'One day = 86,400 seconds. Storage becomes much smaller after compression (HTML compresses very well). "100 pages/sec per machine" is an assumed value: in 1999 the Mercator crawler averaged ~112 documents/sec on a single machine. Today\'s machines are much faster, but because of politeness the real rate is often decided by the network and the speed of the sites.';
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `With the default values: ~1,650 pages/sec, ~2.4 Gbps of non-stop download, and ~370 TB of raw data. Three conclusions: (1) one machine is not enough, we need a fleet of fetchers; (2) pages will go into <a href="#/object-storage">object storage</a>, not a database; (3) the question "have we seen this URL before?" will be asked thousands of times a second over billions of URLs, so it must use memory efficiently.` },
      { type: 'h2', text: 'Step 3: high-level design, the journey of one page' },
      { type: 'p', html: `This design is based on the 1999 <strong>Mercator</strong> paper (Heydon and Najork, Compaq), the classic reference for crawler design. The paper is old, but its components (frontier, DNS resolver, fetcher, content-seen test, link extractor, URL-seen test) are still found in some form in every crawler today. Before the diagram, a small card for each part of this loop. The story is about one URL: it waits in line, gets downloaded, gets checked, and gives birth to new URLs.` },
      { type: 'callout', tone: 'term', title: 'New word: URL frontier', html: `<strong>What it is:</strong> the line of all URLs that are still waiting to be downloaded. "Frontier" means border: the crawler has seen up to here, and these pages lie beyond.<br><strong>Why we need it:</strong> the crawler must always know which page to fetch next, and when (politeness, priority).<br><strong>Without it:</strong> there is no place to keep new links; they get lost, or the crawler crashes into one site. Its inside design is in Deep dive 1.` },
      { type: 'callout', tone: 'term', title: 'New word: DNS cache', html: `<strong>What it is:</strong> DNS is the system that turns a name like <code>news.example.in</code> into an IP address (the server's number, like <code>203.0.113.7</code>). A DNS cache = our own copy of these answers, so we do not have to ask again and again.<br><strong>Why we need it:</strong> every download needs the IP first, and one site has thousands of pages. Asking the DNS server every time is slow.<br><strong>Without it:</strong> fetchers would spend most of their time waiting for DNS answers (87% of the time in Mercator, see below).` },
      { type: 'callout', tone: 'term', title: 'New word: Fetcher', html: `<strong>What it is:</strong> the part that sends an HTTP request and downloads the page. First it checks that site's robots.txt (the site owner's rules, Deep dive 2).<br><strong>Why we need it:</strong> this is the real "download"; everything else is arrangement around it.<br><strong>Without it:</strong> nothing arrives. And if it runs without timeouts, one slow or bad server can keep it stuck forever.` },
      { type: 'callout', tone: 'term', title: 'New word: Page store (object storage, WARC)', html: `<strong>What it is:</strong> a big, cheap place to keep downloaded pages. In <a href="#/object-storage">object storage</a> (like S3), many pages are joined into one big file; Common Crawl calls this file format <strong>WARC</strong> (the page + its HTTP details).<br><strong>Why we need it:</strong> there are hundreds of TB of data, and the search indexer will read from here later.<br><strong>Without it:</strong> a database cannot keep this much data cheaply, and the crawl would have to be done again.` },
      { type: 'callout', tone: 'term', title: 'New word: Fingerprint (content seen?)', html: `<strong>What it is:</strong> a short number (a hash) made from the whole content of a page, like 64 bits. Same content = same fingerprint.<br><strong>Why we need it:</strong> one article lives at many URLs. If the fingerprint was seen before, the page is a duplicate; we do not take its links again.<br><strong>Without it:</strong> the same content is stored again and again, and its links enter the frontier again and again.` },
      { type: 'callout', tone: 'term', title: 'New word: Link extractor (parse + normalize)', html: `<strong>What it is:</strong> the part that reads the HTML (parses it), takes out all links, and writes each link in one standard form (<strong>normalize</strong>), so that differently spelled URLs of the same page count as one.<br><strong>Why we need it:</strong> this is where new pages are found.<br><strong>Without it:</strong> the crawl would stop at the first page, or fetch one page 5 times under 5 spellings.` },
      { type: 'callout', tone: 'term', title: 'New word: URL seen? (Bloom filter)', html: `<strong>What it is:</strong> a test: "has this URL ever entered the frontier before?" For billions of URLs this is done with a <strong>Bloom filter</strong>: a long line of bits that, in very little memory, says "definitely not seen" or "maybe seen" (you will play with one in Deep dive 3).<br><strong>Why we need it:</strong> a link like the homepage appears on lakhs of pages.<br><strong>Without it:</strong> one URL would join the line lakhs of times, and the crawler's loop would never end.` },
      { type: 'p', html: `Now the whole loop together. Click on each box, then run the scenarios:` },
      { type: 'flow', title: 'The crawler\'s main loop', height: 340,
        nodes: [
          { id: 'fr', label: 'URL frontier', sub: 'what to fetch', x: 80, y: 170, w: 132, kind: 'queue', info: 'What it is: the line of all URLs still to be downloaded. Not a simple FIFO queue: inside there is priority and a separate queue per host (Deep dive 1). Billions of URLs, so mostly on disk, with only the front part in memory.' },
          { id: 'dns', label: 'DNS cache', sub: 'host → IP', x: 262, y: 55, w: 124, kind: 'net', info: 'What it is: a copy of host name → IP address answers. Before every fetch the hostname must become an IP. The Mercator team found that DNS lookups were eating 87% of a thread\'s time; with their own multi-threaded resolver + cache it fell to 25%. We saw what DNS is in an <a href="#/how-the-web-works">earlier lesson</a>.' },
          { id: 'fe', label: 'Fetcher', sub: 'HTTP + robots', x: 262, y: 170, w: 124, kind: 'server', info: 'What it is: the part that downloads pages. First it checks that host\'s robots.txt (from the cache). Timeouts are a must: Mercator wrote its own HTTP module because the old Java library could not set a timeout, and a malicious server could hang a thread forever. Their requests timed out at 1 minute.' },
          { id: 'st', label: 'Page store', sub: 'object storage', x: 262, y: 290, w: 124, kind: 'data', info: 'What it is: a big, cheap place for downloaded raw pages. Common Crawl keeps them in WARC files on S3 (WARC = raw HTTP response + metadata; WAT = extracted metadata and links; WET = plain text only). The indexer later reads from here.' },
          { id: 'cs', label: 'Content seen?', sub: 'fingerprint', x: 440, y: 170, w: 132, kind: 'cache', info: 'What it is: the duplicate check for content. Was this content seen before at another URL? For an exact copy, a 64-bit fingerprint of the page (Mercator: Rabin fingerprint). For a near-duplicate (only timestamp/ads differ), SimHash (Deep dive 3). If it is a duplicate, its links are not taken out again.' },
          { id: 'lx', label: 'Link extractor', sub: 'parse + normalize', x: 625, y: 170, w: 132, kind: 'server', info: 'What it is: the part that reads HTML and takes out links. It takes out all links, makes relative links absolute, and normalizes the URL (lowercase host, remove the default port, remove the #fragment, remove tracking params like utm_source). Then the URL filter: only http/https, some domains blocked, very long URLs rejected (traps).' },
          { id: 'us', label: 'URL seen?', sub: 'Bloom filter', x: 520, y: 292, w: 132, kind: 'cache', info: 'What it is: the duplicate check for URLs. Has this URL already entered the frontier? Keeping each of billions of URLs in a set is expensive. A Bloom filter, in little memory, says "definitely not seen" or "maybe seen". For this same job Mercator used a set of URL fingerprints (memory cache + sorted file on disk).' },
        ],
        edges: [{ a: 'fr', b: 'fe' }, { a: 'fe', b: 'dns' }, { a: 'fe', b: 'st' }, { a: 'fe', b: 'cs' }, { a: 'cs', b: 'lx' }, { a: 'lx', b: 'us' }, { a: 'us', b: 'fr' }],
        scenarios: [
          { name: 'New page', steps: [
            { title: 'URL from the frontier', text: 'The frontier gave the next URL; the politeness wait for that host is over.', go: 'fr>fe', msg: 'https://news.example.in/cricket/final' },
            { title: 'DNS: cache hit', text: 'The IP of news.example.in is in the cache. A network round trip was saved.', go: ['fe>dns', 'res:dns>fe'], after: { dns: { state: 'hit', sub: 'HIT' } }, msg: 'news.example.in → 203.0.113.7' },
            { title: 'robots.txt OK, download', text: 'The host\'s robots.txt (cached for up to 24 hours) says /cricket/ is allowed. The page was downloaded and the raw copy went to the store.', go: 'fe>st', msg: 'GET /cricket/final  →  200 OK, 182 KB\nPUT warc/2026-10/part-00412' },
            { title: 'The content is new', text: 'This fingerprint was never seen before. Move on.', go: 'fe>cs', after: { cs: { state: 'ok', sub: 'new' } } },
            { title: 'Take out the links', text: 'The page has 48 links. Normalized them: relative to absolute, #fragment and utm params removed.', go: 'cs>lx', msg: '/cricket/live → https://news.example.in/cricket/live\n?utm_source=x removed' },
            { title: 'Only new URLs into the frontier', text: 'The Bloom filter said: 9 of the 48 are "definitely not seen". Only these 9 went into the frontier. The loop keeps running.', go: ['lx>us', 'us>fr'], msg: '9 new URLs → frontier' },
          ]},
          { name: 'URL seen before', steps: [
            { title: 'A popular link', text: 'The homepage link is on every page. It will be found lakhs of times.', go: 'lx>us', msg: 'https://news.example.in/' },
            { title: 'Bloom: "maybe seen"', text: 'All the bits are 1, so drop it. Thanks to this test, the crawler does not put one URL into the frontier again and again.', set: { fr: { state: 'dim' } }, after: { us: { state: 'hit', sub: 'seen → drop' } } },
            { title: 'The price: false positives', text: 'A Bloom filter sometimes says "maybe seen" by mistake (say 1% of the time). So some new URLs will never be crawled. For a web crawler this is fine: missing a few pages is cheaper than a disk lookup for every URL.', focus: ['us'] },
          ]},
          { name: 'Duplicate content', intro: 'One article at two URLs: /story?id=7 and /amp/story/7.', steps: [
            { title: 'Second URL downloaded', go: ['fr>fe', 'fe>cs'], text: 'The URL was different, so the URL-seen test did not stop it.' },
            { title: 'Fingerprint match', text: 'The content\'s fingerprint was seen before. Do not take out the links again (they were already taken). In Mercator\'s 8-day crawl, 8.5% of downloaded documents were duplicates.', set: { lx: { state: 'dim' } }, after: { cs: { state: 'hit', sub: 'duplicate' } } },
          ]},
          { name: 'DNS bottleneck', steps: [
            { title: 'New host: cache miss', text: 'Every new host = ask a remote DNS server. Some DNS servers take seconds.', go: ['fe>dns'], after: { dns: { state: 'miss', sub: 'MISS, slow' } } },
            { title: 'Fetcher stuck', text: 'The Mercator team found that the standard DNS call in Java and Unix was synchronized: only one uncached lookup at a time. Threads kept waiting for DNS, 87% of the time.', set: { fe: { state: 'warn', sub: 'waiting on DNS' } }, focus: ['dns', 'fe'] },
            { title: 'Fix: async resolver + cache', text: 'Their own multi-threaded resolver that does many lookups in parallel, plus a cache. The DNS share fell to 25%. Today\'s lesson: in a crawler, resolve DNS in advance (prefetch) and cache it.', go: 'res:dns>fe', after: { dns: { state: 'ok', sub: 'parallel + cache' }, fe: { state: '', sub: 'HTTP + robots' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Deep dive 1: the URL frontier and politeness' },
      { type: 'h3', text: 'Problem: BFS crashes into one site' },
      { type: 'p', html: `Most links on a page usually point to <em>the same site</em>. In a simple FIFO queue, 50 URLs of one site will come one after another, and 20 fetcher threads will hit them all together. For you this is a "fast crawl"; for that small site's server it is like an attack. The site goes down, the owner gets angry, and the crawler's IP gets blocked.` },
      { type: 'callout', tone: 'term', title: 'New word: Politeness', html: `<strong>What it is:</strong> the crawler's rule that any one host gets <strong>only one connection at a time</strong>, with a gap of a few seconds between two requests.<br><strong>Why we need it:</strong> a small site's server cannot handle 20 requests at once. The site owner will get angry and block the crawler's IP.<br><strong>Without it:</strong> sites fall over, and nobody lets the crawler in.<br><strong>Source:</strong> Stanford's IR textbook (Manning, Raghavan, Schütze, 2008) lists exactly these goals for a Mercator-style frontier: one connection per host, a few seconds between requests, and high-priority pages first.` },
      { type: 'h3', text: 'Mercator\'s answer: each host gets its own queue' },
      { type: 'p', html: `In the 1999 Mercator paper, the frontier was really many FIFO sub-queues: one per worker thread, and which sub-queue a new URL went into was decided by its <strong>host name</strong>. Result: at most one thread downloaded from any one server. Later, Najork and Heydon split the frontier into two parts, and this design is explained in the IR textbook. First, three words:` },
      { type: 'callout', tone: 'term', title: 'New words: priority, front queue, back queue, heap', html: `<strong>What it is:</strong> <strong>Priority</strong> = how important a page is (a new page on a big news site > a page on some old blog). <strong>Front queues</strong> = separate lines by priority (F1 less important ... F-high very important). <strong>Back queues</strong> = each line holds URLs of <em>only one host</em>. <strong>Heap</strong> = a data structure that always gives the smallest number instantly; here it keeps, for each back queue, the time "when the next request to this host is allowed".<br><strong>Why we need it:</strong> front queues answer "what first", back queues make sure of "one request per host", and the heap tells which host is free right now.<br><strong>Without it:</strong> either important pages arrive late, or many requests go to one site at once.` },
      { type: 'ascii', text: `
   new URLs
       │
   Prioritizer  (how important is the page / how often does it change → priority 1..F)
       │
 ┌─────┼─────────────┐        FRONT QUEUES  = priority
 F1   F2   ...   F(high)       (the selector picks high priority more often)
 └─────┼─────────────┘
       │  router: host → back queue  (table: news.example.in → B7)
 ┌─────┼──────────────────┐   BACK QUEUES  = politeness
 B1   B2   ...  B7  ...  Bn     each back queue holds URLs of ONLY one host
 └─────┼──────────────────┘
       │
   Heap: the "next allowed time" of each back queue
       │  fetcher: take the smallest time from the heap, wait until then, fetch,
       │           new time = now + 10 × (time of the last fetch)
   Fetcher threads`, caption: 'Front queues handle priority, back queues handle politeness' },
      { type: 'p', html: `Two details are worth remembering. (1) The wait heuristic: the next request to a host comes at least <strong>~10 times the time of the last fetch</strong> later. A slow server (which is already tired) automatically gets fewer requests. (2) The designers suggested keeping <strong>~3 times as many back queues as threads</strong>, so no thread sits idle while its host's wait is running. See for yourself in the simulator below why this matters.` },
      { type: 'custom', render(el) {
        const COL = { A: 'var(--accent)', B: 'var(--amber)', C: 'var(--green)', D: 'var(--violet)' };
        el.innerHTML = `<div class="row2">
            <div><label>Fetcher threads: <strong class="cr-f-nv"></strong></label><input class="cr-f-n" type="range" min="1" max="4" step="1" value="4"></div>
            <div><label>Gap on the same host (politeness delay): <strong class="cr-f-dv"></strong></label><input class="cr-f-d" type="range" min="0" max="4000" step="500" value="2000"></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
            <button type="button" class="chip cr-f-m0">Naive FIFO</button>
            <button type="button" class="chip on cr-f-m1">Per-host queues (polite)</button>
            <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="cr-f-x" style="width:auto"> 8 more small hosts (E-L) in the frontier</label>
          </div>
          <svg class="cr-f-svg" viewBox="0 0 480 190" style="width:100%;height:auto;display:block"></svg>
          <div class="stats">
            <div class="stat"><span>Total time</span><strong class="cr-f-t"></strong></div>
            <div class="stat"><span>Max at once on host A</span><strong class="cr-f-c"></strong></div>
            <div class="stat"><span>Min gap on host A</span><strong class="cr-f-g"></strong></div>
            <div class="stat"><span>Fetchers idle</span><strong class="cr-f-i"></strong></div>
          </div>
          <div class="calc-note cr-f-note"></div>`;
        const q = c => el.querySelector(c);
        let polite = true;
        const NS = 'http://www.w3.org/2000/svg';
        const draw = () => {
          const n = Number(q('.cr-f-n').value), d = Number(q('.cr-f-d').value), x = q('.cr-f-x').checked;
          q('.cr-f-nv').textContent = n; q('.cr-f-dv').textContent = polite ? (d / 1000) + ' s' : '(no rule in naive mode)';
          q('.cr-f-m0').classList.toggle('on', !polite); q('.cr-f-m1').classList.toggle('on', polite);
          const r = crSim(n, d, polite, x), span = Math.max(r.total, 4000), X = t => 30 + t / span * 442;
          const svg = q('.cr-f-svg'); svg.innerHTML = '';
          const mk = (tag, a, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
          for (let f = 0; f < n; f++) mk('text', { x: 2, y: 31 + f * 40, 'font-size': 13, fill: 'var(--ink-2)' }, 'F' + (f + 1));
          r.jobs.forEach(j => {
            mk('rect', { x: X(j.s), y: 14 + j.f * 40, width: Math.max(2, X(j.e) - X(j.s) - 1), height: 26, rx: 4, fill: COL[j.h] || 'var(--line-2)', opacity: COL[j.h] ? 0.85 : 1 });
            if (X(j.e) - X(j.s) > 17) mk('text', { x: (X(j.s) + X(j.e)) / 2, y: 31 + j.f * 40, 'font-size': 11, 'text-anchor': 'middle', fill: COL[j.h] ? 'var(--bg)' : 'var(--ink)', 'font-family': 'var(--f-mono)' }, j.u);
          });
          mk('text', { x: 476, y: 184, 'font-size': 12, 'text-anchor': 'end', fill: 'var(--ink-3)' }, 'time → ' + (span / 1000) + ' s');
          const A = r.stats.A;
          q('.cr-f-t').textContent = (r.total / 1000).toFixed(1) + ' s';
          q('.cr-f-c').textContent = A.conc + (A.conc > 1 ? ' (overload!)' : '');
          q('.cr-f-g').textContent = A.gap < 0 ? 'overlap' : (A.gap / 1000).toFixed(1) + ' s';
          q('.cr-f-i').textContent = Math.round(r.idle * 100) + '%';
          q('.cr-f-note').textContent = 'Host A (blue) is a big site: 8 URLs, each fetch 0.5 s. B: 3 URLs (1 s), C: 3 (0.5 s), D: 2 (1.5 s). Grey boxes = small hosts E-L. F1-F4 = fetcher threads. ' + (polite ? 'Polite mode: a free fetcher picks the host whose "next allowed time" comes first.' : 'Naive mode: whichever URL is at the front of the queue, even if a request is already running on that host.');
        };
        q('.cr-f-m0').onclick = () => { polite = false; draw(); };
        q('.cr-f-m1').onclick = () => { polite = true; draw(); };
        ['.cr-f-n', '.cr-f-d'].forEach(c => q(c).addEventListener('input', draw));
        q('.cr-f-x').addEventListener('change', draw);
        draw();
      }},
      { type: 'p', html: `What you should see: <strong>Naive FIFO</strong> with 4 fetchers finishes in 3.5 s, but 3 requests run on host A at the same time. <strong>Polite</strong> mode (4 fetchers, 2 s gap): host A always gets only one request with 2 s in between, but the total time becomes 18 s and the fetchers sit idle ~84% of the time, because host A's line of 8 URLs is the longest. Now switch on "8 more small hosts": the work doubles (32 URLs), but the total time stays 18 s, and idle is ~67%. The lesson: a polite crawler's speed depends on <strong>how many different hosts</strong> are running at the same time. That is why real crawlers keep back queues of lakhs of hosts active together.` },
      { type: 'h2', text: 'Deep dive 2: robots.txt, the site\'s "do not enter here" board' },
      { type: 'p', html: `Politeness is not only about speed; the site owner can also say <em>which</em> pages must not be crawled. There is a file for this: <code>https://site.com/robots.txt</code>. It has been in use since 1994, but it became an official standard only in 2022: <strong>RFC 9309</strong> (Robots Exclusion Protocol).` },
      { type: 'callout', tone: 'term', title: 'New word: robots.txt', html: `<strong>What it is:</strong> a simple text file at the root of a site, where the site owner writes rules for crawlers: "do not open these folders", "you may open these". Each rule sits in a group for a <strong>User-agent</strong> (the crawler's name).<br><strong>Why we need it:</strong> some of the owner's pages (search results, admin, drafts) are not worth crawling; opening them only adds load on the owner.<br><strong>Without it:</strong> the crawler would waste its time and the owner's server on unwanted pages, and lose the right to be called a good crawler.` },
      { type: 'code', text: `# https://news.example.in/robots.txt
User-agent: *
Disallow: /admin/
Disallow: /search
Allow: /search/about

User-agent: xyzbot
Disallow: /drafts/

Sitemap: https://news.example.in/sitemap.xml` },
      { type: 'table', head: ['Rule (RFC 9309)', 'Meaning'], rows: [
        ['The file is always at the top of the host, <code>/robots.txt</code>', 'Each host (and each scheme/port) has its own file. The crawler must fetch it first.'],
        ['User-agent groups', 'The crawler looks for the group with its own name (like "xyzbot"); if none, the <code>*</code> group.'],
        ['The longest match wins', 'On <code>/search/about</code> both rules apply; the Allow rule is longer, so it is allowed. <code>/search?q=x</code> is disallowed.'],
        ['Do not cache for more than 24 hours (SHOULD NOT)', 'Do not fetch robots.txt on every request, but refresh it once a day. Google also usually caches it for up to 24 hours.'],
        ['4xx (like 404)', 'There is no file, so the crawler may crawl everything.'],
        ['5xx / site unreachable', 'Assume the whole site is disallowed. If it lasts very long (~30 days), you may treat it like "no file".'],
        ['Parse at least 500 KiB', 'The rest of a bigger file may be ignored.'],
      ]},
      { type: 'p', html: `Check it yourself. The rules of the robots.txt above are in this widget. Change the path, change the crawler's name, and change the answer when fetching robots.txt (200/404/503).` },
      { type: 'custom', render(el) {
        // Rules of the robots.txt above. Prefix match only (no wildcards * and $ in this toy).
        const G = { '*': [['Disallow', '/admin/'], ['Disallow', '/search'], ['Allow', '/search/about']], xyzbot: [['Disallow', '/drafts/']] };
        const PATHS = ['/cricket/final', '/admin/users', '/search?q=kohli', '/search/about', '/drafts/new-post'];
        el.innerHTML = `<div class="row2">
            <div><label>Crawler name (User-agent)</label><select class="cr-r-ua"><option value="otherbot">otherbot (someone else)</option><option value="xyzbot">xyzbot (ours)</option></select></div>
            <div><label>Answer when fetching robots.txt</label><select class="cr-r-st"><option value="200">200 OK (file found)</option><option value="404">404 (no file)</option><option value="503">503 (server error)</option></select></div>
          </div>
          <div style="margin-top:8px"><label>Path</label><input class="cr-r-p" type="text" value="/search?q=kohli" style="width:100%;font-family:var(--f-mono)"></div>
          <div class="chips" style="margin-top:6px">${PATHS.map(p => `<button type="button" class="chip" data-p="${p}">${p}</button>`).join('')}</div>
          <div class="stats"><div class="stat"><span>Group</span><strong class="cr-r-g"></strong></div><div class="stat"><span>Matched rule</span><strong class="cr-r-m"></strong></div><div class="stat"><span>Decision</span><strong class="cr-r-v"></strong></div></div>
          <div class="calc-note cr-r-n"></div>`;
        const q = c => el.querySelector(c);
        const upd = () => {
          const ua = q('.cr-r-ua').value, st = q('.cr-r-st').value, path = q('.cr-r-p').value || '/';
          const gname = G[ua] ? ua : '*', rules = G[gname];
          let ok, rule = '-', note;
          if (st === '404') { ok = true; note = '4xx = there is no file, so everything is allowed (RFC 9309).'; }
          else if (st === '503') { ok = false; note = '5xx = the server is in trouble, so treat the whole site as disallowed while the error lasts (RFC 9309).'; }
          else {
            let best = null;
            rules.forEach(([t, p]) => { if (path.startsWith(p) && (!best || p.length > best[1].length || (p.length === best[1].length && t === 'Allow'))) best = [t, p]; });
            ok = !best || best[0] === 'Allow'; rule = best ? `${best[0]}: ${best[1]}` : 'none';
            note = !best ? `No rule of group "${gname}" applies to this path, so it is allowed.` : `Of the rules in group "${gname}" that apply, the longest one, "${best[1]}" (${best[1].length} characters), wins.`;
            if (ua === 'xyzbot') note += ' Note: xyzbot has its own group, so the "*" rules (like /admin/) do not apply to it at all.';
          }
          q('.cr-r-g').textContent = st === '200' ? gname : '-';
          q('.cr-r-m').textContent = rule;
          q('.cr-r-v').textContent = ok ? 'Allowed' : 'Disallowed';
          q('.cr-r-v').style.color = ok ? 'var(--green)' : 'var(--red)';
          q('.cr-r-n').textContent = note;
        };
        el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { q('.cr-r-p').value = b.dataset.p; upd(); }));
        ['.cr-r-ua', '.cr-r-st'].forEach(c => q(c).addEventListener('change', upd)); q('.cr-r-p').addEventListener('input', upd);
        upd();
      }},
      { type: 'p', html: `Three things should show. (1) For otherbot, <code>/search?q=kohli</code> is disallowed, but <code>/search/about</code> is allowed, because the Allow rule is longer. (2) For xyzbot, even <code>/admin/users</code> is allowed: under RFC 9309 a crawler follows only the group with its own name, not the "*" group. The site owner should have written /admin/ in the xyzbot group too. (3) 404 = everything allowed, 503 = everything disallowed.` },
      { type: 'callout', tone: 'warn', title: 'Crawl-delay is not part of the standard', html: `Many robots.txt files contain <code>Crawl-delay: 10</code>. RFC 9309 does not define it. Google's docs clearly say Google does not support it, while Common Crawl's CCBot follows it and also slows down by itself when it gets 429 or 5xx. So your crawler must decide its own politeness policy, and back off on server signals (429, 503, slow responses).` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"robots.txt is security." No. It is a <em>request</em> that good crawlers follow; a bad bot can ignore it. Protect private pages with passwords/auth, not with robots.txt. In fact, writing <code>/secret-admin/</code> in robots.txt tells the whole world that the path exists.` },
      { type: 'p', html: `Mercator kept a fixed-size LRU cache of robots rules (host → rules, 2<sup>18</sup> entries by default), so robots.txt did not have to be fetched again for every page. Today's crawlers do the same: robots rules in a cache, checked already when building the back queue, so a disallowed URL never takes up space in the frontier.` },

      { type: 'h2', text: 'Deep dive 3: duplicates, of URLs and of content' },
      { type: 'h3', text: 'Same URL, different spelling: normalization' },
      { type: 'p', html: `<code>HTTP://News.Example.in:80/a/../cricket#top</code> and <code>http://news.example.in/cricket</code> are the same page. Before the seen-test, turn the URL into one <strong>canonical</strong> form: lowercase the scheme and host, remove the default port, resolve <code>..</code>, remove the #fragment, and remove well-known tracking params (<code>utm_*</code>). Mercator also made host names canonical using DNS CNAMEs, so that two names of one server do not count as two different hosts.` },
      { type: 'callout', tone: 'term', title: 'New word: canonical URL', html: `<strong>What it is:</strong> one "real", standard form for all the differently written URLs of one page.<br><strong>Why we need it:</strong> the URL-seen test only matches exact text. "News.Example.in" and "news.example.in" would look different to it.<br><strong>Without it:</strong> one page is downloaded many times, and it is easy to get caught in traps (a new session ID on every visit).` },
      { type: 'p', html: `Try it yourself. Press the examples or type your own URL:` },
      { type: 'custom', render(el) {
        // URL normalizer: shows each step separately. The list of tracking params is kept short.
        const TRACK = /^(utm_.*|sid|sessionid|fbclid|gclid)$/i;
        const PRE = ['HTTP://News.Example.in:80/a/../cricket#top', 'https://news.example.in/cricket/final?utm_source=wa&id=7&sid=a8f3', 'https://NEWS.example.in:443/./video/9/?b=2&a=1'];
        const norm = raw => {
          const m = raw.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/);
          if (!m) return null;
          const steps = [];
          let [, sc, host, path, qs, frag] = m;
          if (sc !== sc.toLowerCase() || host !== host.toLowerCase()) steps.push('lowercase scheme and host');
          sc = sc.toLowerCase(); host = host.toLowerCase();
          if ((sc === 'http' && /:80$/.test(host)) || (sc === 'https' && /:443$/.test(host))) { host = host.replace(/:\d+$/, ''); steps.push('removed the default port'); }
          const out = [];
          (path || '/').split('/').forEach((s, i, a) => { if (s === '..') out.pop(); else if (s !== '.' && (s !== '' || i === 0 || i === a.length - 1)) out.push(s); });
          let np = out.join('/'); if (!np.startsWith('/')) np = '/' + np;
          if (np !== (path || '/')) steps.push('resolved "." and ".."');
          let params = qs ? qs.slice(1).split('&').filter(Boolean) : [];
          const kept = params.filter(p => !TRACK.test(p.split('=')[0]));
          if (kept.length !== params.length) steps.push('removed tracking/session params');
          const sorted = kept.slice().sort();
          if (sorted.join('&') !== kept.join('&')) steps.push('sorted the params');
          if (frag) steps.push('removed the #fragment (it never reaches the server)');
          return { url: `${sc}://${host}${np}${sorted.length ? '?' + sorted.join('&') : ''}`, steps };
        };
        el.innerHTML = `<label>URL as found on the page</label><input class="cr-u-in" type="text" style="width:100%;font-family:var(--f-mono)">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${PRE.map((p, i) => `<button type="button" class="btn small ghost" data-i="${i}">Example ${i + 1}</button>`).join('')}</div>
          <div class="stats"><div class="stat"><span>Canonical URL</span><strong class="cr-u-out" style="font:600 14px var(--f-mono);overflow-wrap:anywhere"></strong></div></div>
          <div class="calc-note cr-u-st"></div>`;
        const q = c => el.querySelector(c);
        const upd = () => { const r = norm(q('.cr-u-in').value); q('.cr-u-out').textContent = r ? r.url : '(this does not look like a full URL)'; q('.cr-u-st').textContent = r ? (r.steps.length ? 'Steps: ' + r.steps.join(' → ') : 'Already canonical.') : ''; };
        el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { q('.cr-u-in').value = PRE[b.dataset.i]; upd(); }));
        q('.cr-u-in').addEventListener('input', upd); q('.cr-u-in').value = PRE[0]; upd();
      }},
      { type: 'h3', text: 'URL seen? Bloom filter' },
      { type: 'p', html: `For every new link, the question: "has this entered the frontier before?" An exact set of billions of URLs does not fit in RAM, and a disk lookup every time is very slow. Remember the <a href="#/ds-for-scale">Bloom filter</a> lesson: small memory, "definitely not seen" or "maybe seen". Say 5 billion URLs and a 1% false positive rate: the Bloom filter needs ~9.6 bits per URL, so ~6 GB. In an exact set, a single URL alone would be ~80 bytes.` },
      { type: 'callout', tone: 'term', title: 'New word: Bloom filter', html: `<strong>What it is:</strong> a line of bits (all 0 at the start) and k different hash functions. Adding a URL = setting the bits at its k hash positions to 1. Checking = looking at those k positions: if any is 0, the URL has <strong>definitely not</strong> come; if all are 1, it has <strong>maybe</strong> come (other URLs together may have set those same bits to 1).<br><strong>Why we need it:</strong> a seen-test for billions of URLs in a few GB of memory, without disk.<br><strong>Without it:</strong> either hundreds of GB of RAM, or a slow disk lookup on every link.<br><strong>The price:</strong> false positives: sometimes a new URL is called "maybe seen" and gets skipped. The opposite mistake (calling a seen URL "not seen") never happens.` },
      { type: 'p', html: `Below is a toy Bloom filter: only 32 bits and 3 hash functions (a real one has billions of bits). Add URLs one by one, then check URLs from the list. The calculator below gives the real size.` },
      { type: 'custom', render(el) {
        // Small Bloom filter: m = 32 bits, k = 3 hash functions (h32 with different seeds).
        const M = 32, SEEDS = [11, 23, 37], H = 'news.example.in';
        const ADD = ['/', '/cricket', '/cricket/live', '/about', '/video/9', '/news/1', '/news/2', '/search'];
        const CHECK = ['/cricket', '/about', '/cricket/final', '/contact', '/news/3', '/live', '/video/11'];
        const pos = u => SEEDS.map(s => h32(H + u, s) % M);
        let bits, added, last;
        el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
            <button type="button" class="btn small primary cr-b-add"></button>
            <select class="cr-b-sel" aria-label="URL check">${CHECK.map(u => `<option value="${u}">${H}${u}</option>`).join('')}</select>
            <button type="button" class="btn small cr-b-chk">Check</button>
            <button type="button" class="btn small ghost cr-b-rst">Reset</button>
          </div>
          <div class="cr-b-grid" style="display:grid;grid-template-columns:repeat(16,1fr);gap:3px;max-width:520px"></div>
          <div class="cr-b-added" style="font:12px/1.6 var(--f-mono);color:var(--ink-2);margin-top:8px;overflow-wrap:anywhere"></div>
          <div class="calc-note cr-b-res"></div>
          <div class="row2" style="margin-top:12px">
            <div><label>How many URLs (billions)</label><input class="cr-b-n" type="number" value="5" min="0.1" step="0.5"></div>
            <div><label>False positive rate (%)</label><input class="cr-b-p" type="number" value="1" min="0.01" max="50" step="0.1"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Bits per URL</span><strong class="cr-b-o1"></strong></div>
            <div class="stat"><span>Hash functions (k)</span><strong class="cr-b-o2"></strong></div>
            <div class="stat"><span>Memory</span><strong class="cr-b-o3"></strong></div>
          </div>`;
        const q = c => el.querySelector(c);
        const draw = () => {
          q('.cr-b-grid').innerHTML = bits.map((b, i) => `<div style="text-align:center;font:11px var(--f-mono);padding:4px 0;border-radius:3px;border:1px solid var(--line);background:${last && last.includes(i) ? 'var(--amber)' : b ? 'var(--accent)' : 'var(--surface-2)'};color:${b || (last && last.includes(i)) ? 'var(--bg)' : 'var(--ink-3)'}">${b}</div>`).join('');
          q('.cr-b-add').textContent = added < ADD.length ? `Add the next URL (${added}/${ADD.length})` : 'All added';
          q('.cr-b-added').textContent = added ? 'Added: ' + ADD.slice(0, added).join('  ') : 'The filter is empty now: all 32 bits are 0.';
        };
        const reset = () => { bits = new Array(M).fill(0); added = 0; last = null; q('.cr-b-res').textContent = 'Add URLs, then check any URL. Yellow = the 3 bit positions of the current URL.'; draw(); };
        q('.cr-b-add').onclick = () => { if (added >= ADD.length) return; const u = ADD[added++], p = pos(u); p.forEach(i => { bits[i] = 1; }); last = p; q('.cr-b-res').textContent = `${u} → set bits ${p.join(', ')} to 1.`; draw(); };
        q('.cr-b-chk').onclick = () => {
          const u = q('.cr-b-sel').value, p = pos(u), all = p.every(i => bits[i]), real = ADD.slice(0, added).includes(u); last = p; draw();
          q('.cr-b-res').textContent = `${u} → bits ${p.join(', ')}: ` + (!all ? 'some bit is 0, so DEFINITELY NOT SEEN. Put it in the frontier.' : real ? 'all are 1: MAYBE SEEN (and it really was seen). Drop.' : 'all are 1: MAYBE SEEN, but this URL was never added! This is a false positive: this new page will not be crawled.');
        };
        q('.cr-b-rst').onclick = reset;
        const calc = () => {
          const n = Math.max(0.0001, Number(q('.cr-b-n').value) || 0), p = Math.min(0.5, Math.max(0.0001, (Number(q('.cr-b-p').value) || 0) / 100));
          const b = -Math.log(p) / (Math.LN2 * Math.LN2);
          q('.cr-b-o1').textContent = b.toFixed(1);
          q('.cr-b-o2').textContent = Math.max(1, Math.round(b * Math.LN2));
          q('.cr-b-o3').textContent = (n * 1e9 * b / 8 / 1e9).toFixed(1) + ' GB';
        };
        q('.cr-b-n').addEventListener('input', calc); q('.cr-b-p').addEventListener('input', calc);
        reset(); calc();
      }},
      { type: 'p', html: `What you should see: after adding all 8 URLs, 17 of the 32 bits are 1. For <code>/cricket/final</code>, <code>/contact</code> and <code>/news/3</code>, the filter correctly says "definitely not seen". But for <code>/live</code> (after 4 URLs are added) and <code>/video/11</code> (after 5), all three bits are already 1, even though they were never added: a false positive. In such a tiny filter this is common; a real filter uses many more bits to bring the rate to 1% or lower. Calculator: 5 billion URLs, 1% → ~9.6 bits per URL, k = 7, ~6 GB.` },
      { type: 'p', html: `In 1999, instead of a Bloom filter, Mercator used a different trick: a 64-bit fingerprint for each URL, a small in-memory cache + a sorted file on disk. And a smart detail: the top bits of the fingerprint came from the hash of the host, so URLs of one site sat close together on disk and one disk read was enough. In their crawl, the memory caches kept ~75% of lookups from going to disk at all.` },
      { type: 'h3', text: 'Content seen? Exact and near-duplicate' },
      { type: 'p', html: `Different URL, same content: mirrors, AMP versions, print versions, URLs with session IDs. Catching an exact copy is easy: one fingerprint (hash) of the whole page, and a set of fingerprints. Mercator did this, and in their 8-day crawl 8.5% of documents turned out to be exact duplicates.` },
      { type: 'p', html: `But most duplicates on the web are not <em>exact</em>: the same article, with only "Views: 10,231" changed to "Views: 10,245", or a different ad, or a new timestamp. Change one character and a normal hash changes completely. We need a fingerprint that is <strong>similar for similar pages</strong>.` },
      { type: 'callout', tone: 'term', title: 'New word: SimHash', html: `<strong>What it is:</strong> a fingerprint that gives similar pages similar numbers (with almost the same bits).<br><strong>Why we need it:</strong> most duplicates on the web are not exact.<br><strong>Without it:</strong> every copy that differs only in a timestamp would count as a "new page".<br><strong>How it works inside:</strong> a technique by Moses Charikar that Google's Manku, Jain and Das Sarma used for crawling in the 2007 paper "Detecting Near-Duplicates for Web Crawling". The method: take a 64-bit hash of every word (feature) of the page. Keep 64 counters. If bit i of a word's hash is 1, add the word's weight to counter i; if it is 0, subtract it. At the end, every positive counter gives bit 1, otherwise 0. Changing a few words flips the sign of only a few counters, so only a few bits of the fingerprint change.` },
      { type: 'callout', tone: 'term', title: 'New word: Hamming distance', html: `<strong>What it is:</strong> in how many positions two bit-strings differ. The distance between <code>1011</code> and <code>1001</code> is 1. The paper's rule for 8 billion pages: in a 64-bit SimHash, a difference of <strong>3 bits or less</strong> = near-duplicate.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Page 1 (original)</label><textarea class="cr-s-a" rows="6" style="width:100%;font:13px/1.5 var(--f-body)"></textarea></div>
            <div><label>Page 2 (try editing it)</label><textarea class="cr-s-b" rows="6" style="width:100%;font:13px/1.5 var(--f-body)"></textarea></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
            <button type="button" class="btn small ghost cr-s-p1">Near-duplicate (views + time changed)</button>
            <button type="button" class="btn small ghost cr-s-p2">Completely different page</button>
            <button type="button" class="btn small ghost cr-s-p3">Exact copy</button>
          </div>
          <div class="cr-s-bits" style="font:12px/1.6 var(--f-mono);overflow-wrap:anywhere"></div>
          <div class="stats">
            <div class="stat"><span>Exact hash same?</span><strong class="cr-s-e"></strong></div>
            <div class="stat"><span>SimHash Hamming distance</span><strong class="cr-s-h"></strong></div>
            <div class="stat"><span>Decision (k = 3)</span><strong class="cr-s-v"></strong></div>
          </div>
          <div class="calc-note">Every word is a feature, weight = how many times it appears in the page. Real systems use shingles (runs of consecutive words) and better weights; the idea is the same.</div>`;
        const q = c => el.querySelector(c);
        const bitRow = (bits, other) => bits.map((b, i) => other && b !== other[i] ? `<span style="background:var(--amber);color:var(--bg);border-radius:2px">${b}</span>` : b).join('');
        const upd = () => {
          const ta = q('.cr-s-a').value, tb = q('.cr-s-b').value;
          const A = simhash(ta), B = simhash(tb), d = hamming(A, B), ex = exactFp(ta) === exactFp(tb);
          q('.cr-s-bits').innerHTML = `<div>P1: ${bitRow(A)}</div><div>P2: ${bitRow(B, A)}</div>`;
          q('.cr-s-e').textContent = ex ? 'yes' : 'no';
          q('.cr-s-h').textContent = d + ' / 64 bits';
          q('.cr-s-v').textContent = ex ? 'exact duplicate' : d <= 3 ? 'near-duplicate' : 'different page';
        };
        const setB = t => { q('.cr-s-b').value = t; upd(); };
        q('.cr-s-a').value = SH_DOCS.a; q('.cr-s-b').value = SH_DOCS.b;
        q('.cr-s-p1').onclick = () => setB(SH_DOCS.b);
        q('.cr-s-p2').onclick = () => setB(SH_DOCS.c);
        q('.cr-s-p3').onclick = () => setB(q('.cr-s-a').value);
        q('.cr-s-a').addEventListener('input', upd); q('.cr-s-b').addEventListener('input', upd);
        upd();
      }},
      { type: 'p', html: `In the default pages only the view count and time changed: the exact hash is completely different, but SimHash differs by only <strong>2 bits</strong>, so it is a near-duplicate. Press "Completely different page": 19 bits differ. Change a word or two in Page 2 and the distance grows only a little.` },
      { type: 'p', html: `The real difficulty: among billions of fingerprints, how do we find "which ones are within 3 bits"? The paper's trick: keep several copies of the fingerprints, permute the bits differently in each copy, and sort. If two fingerprints differ by at most 3 bits, then in some permutation their first many bits are exactly the same, so looking at a small range in the sorted table is enough. In an interview it is enough to say: "SimHash + permuted sorted tables, k = 3 on 64 bits".` },
      { type: 'h2', text: 'Deep dive 4: crawler traps' },
      { type: 'p', html: `The Mercator paper's definition: a crawler trap is a URL (or a set of URLs) that keeps the crawler crawling forever. Some are created by mistake, some on purpose (to catch spammers, or to play games with search ranking).` },
      { type: 'callout', tone: 'term', title: 'New word: crawler trap', html: `<strong>What it is:</strong> a web of URLs that never ends, like a calendar that always has a "next month" link.<br><strong>Why it matters:</strong> BFS thinks every new URL is a new page, so it will keep going round in it forever.<br><strong>Without protection:</strong> one site eats the whole crawl budget (time, bandwidth, storage), and the rest of the web is left out.` },
      { type: 'table', head: ['Trap', 'What it looks like', 'Protection'], rows: [
        ['Infinite calendar', '<code>/calendar?month=2026-11</code> → "next month" → 2026-12 → ... forever', 'A page budget per host; stop on too many variations of one path pattern'],
        ['Session IDs in the URL', 'A new <code>?sid=a8f3...</code> on every visit, same page', 'Remove well-known session params during normalization; the content fingerprint catches the duplicates'],
        ['Deep fake paths', '<code>/a/b/a/b/a/b/...</code> (a mistake in a relative link)', 'Max URL length, max path depth, filter on repeating segments'],
        ['Auto-generated pages', 'Lakhs of low-value pages, all linked to each other', 'Lower quality/priority for the host; a budget per host'],
      ]},
      { type: 'p', html: `The Mercator team honestly wrote that they knew no automatic technique to avoid traps; sites with traps stand out because of their very large number of documents, and a person blocks that site in the URL filter. Even today the real method is the same: <strong>per-host limits + monitoring + a manual block list</strong>. No single trick catches them all.` },

      { type: 'h2', text: 'Deep dive 5: recrawl, when to fetch a page again?' },
      { type: 'p', html: `A crawl is not a one-time job. A news homepage changes every few minutes; someone's 2009 blog post maybe never. Fetching every page every day wastes bandwidth, and fetching every page once a month means the news is always old.` },
      { type: 'callout', tone: 'term', title: 'New words: freshness, recrawl, conditional GET', html: `<strong>What it is:</strong> <strong>Freshness</strong> = for how much of the time our stored copy matches the real page. <strong>Recrawl</strong> = fetching a page again so the copy is fresh. <strong>Conditional GET</strong> = asking the server "has it changed since last time?"; if not, the server sends only <code>304 Not Modified</code>, not the whole page.<br><strong>Why we need it:</strong> if search results are based on old pages, the user gets wrong answers.<br><strong>Without it:</strong> either old copies, or downloading every page every day and wrecking the bandwidth.` },
      { type: 'list', items: [
        '<strong>Priority from the change rate:</strong> in the IR textbook\'s Mercator-style frontier, the prioritizer looks at a page\'s fetch history: a page that changed more between past crawls goes to a higher front queue. Some hosts, like news sites, get high priority directly.',
        '<strong>A cheap "did it change?" check:</strong> an HTTP conditional request (<code>If-Modified-Since</code>, or <code>If-None-Match</code> with an ETag). If the page did not change, the server sends <code>304 Not Modified</code>, with no body. Bandwidth saved.',
        '<strong>Sitemaps:</strong> the sitemap URL given in robots.txt lists the site\'s pages and their last-modified time.',
        '<strong>A truth that sounds backwards:</strong> research by Cho and Garcia-Molina (2003) found that, for average freshness, the policy "crawl everyone equally often" beat the proportional policy "crawl each page as often as it changes". The reason: a page that changes very fast never stays fresh however often you fetch it, and the effort spent on it is taken away from other pages.',
      ]},
      { type: 'p', html: `Feel this backwards truth yourself. Two pages, a budget of 10 crawls a day. Page A (news homepage) changes 9 times a day, page B (article) once. The model is the one Cho and Garcia-Molina used: the page changes at random moments, and we crawl it at equal gaps.` },
      { type: 'custom', render(el) {
        // Freshness (the Cho and Garcia-Molina model): the page changes at Poisson rate λ, crawled every 1/f days.
        // Average freshness = (1 - e^(-λ/f)) × f / λ
        const F = (l, f) => f <= 0 ? 0 : (1 - Math.exp(-l / f)) * f / l;
        el.innerHTML = `<div class="row2">
            <div><label>Page A (news homepage) changes per day: <b class="cr-fr-av"></b></label><input class="cr-fr-a" type="range" min="1" max="20" step="1" value="9"></div>
            <div><label>Page B (article) changes per day: <b class="cr-fr-bv"></b></label><input class="cr-fr-b" type="range" min="1" max="5" step="1" value="1"></div>
            <div><label>Crawl budget (for both, per day): <b class="cr-fr-nv"></b></label><input class="cr-fr-n" type="range" min="2" max="30" step="1" value="10"></div>
            <div><label>Your split, to A: <b class="cr-fr-sv"></b> crawls</label><input class="cr-fr-s" type="range" min="1" max="9" step="1" value="5"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Equal (uniform)</span><strong class="cr-fr-u"></strong></div>
            <div class="stat"><span>By change rate (proportional)</span><strong class="cr-fr-p"></strong></div>
            <div class="stat"><span>Your split</span><strong class="cr-fr-y"></strong></div>
            <div class="stat"><span>Best split</span><strong class="cr-fr-o"></strong></div>
          </div>
          <div class="calc-note cr-fr-note"></div>`;
        const q = c => el.querySelector(c), g = c => Number(q(c).value);
        const pct = v => Math.round(v * 1000) / 10 + '%';
        const upd = () => {
          const la = g('.cr-fr-a'), lb = g('.cr-fr-b'), n = g('.cr-fr-n'), s = q('.cr-fr-s');
          s.max = n - 1; if (g('.cr-fr-s') > n - 1) s.value = n - 1;
          const sa = g('.cr-fr-s');
          ['a', 'b', 'n', 's'].forEach(k => { q('.cr-fr-' + k + 'v').textContent = g('.cr-fr-' + k); });
          const avg = (fa, fb) => (F(la, fa) + F(lb, fb)) / 2;
          const u = avg(n / 2, n / 2), pa = n * la / (la + lb), p = avg(pa, n - pa);
          let best = 1; for (let a = 1; a < n; a++) if (avg(a, n - a) > avg(best, n - best)) best = a;
          q('.cr-fr-u').textContent = pct(u); q('.cr-fr-p').textContent = pct(p);
          q('.cr-fr-y').textContent = pct(avg(sa, n - sa)); q('.cr-fr-o').textContent = `A ${best}, B ${n - best}: ${pct(avg(best, n - best))}`;
          q('.cr-fr-note').textContent = `Freshness = for what part of the day our copy matches the real page (average of both pages). The proportional policy gives A ${pa.toFixed(1)} crawls, yet A stays old most of the time; the best split gives A ${best} and the remaining crawls to B, which really stays fresh with them.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `With the defaults: equal (5 + 5) = 68.5% freshness, by change rate (9 + 1) = 63.2%, so the "more to the one that changes more" policy lost. The best split gives A 7 and B 3: 70.7%. Make page A change 20 times: proportional drops to 41.8%, and the best split still gives A only 7. The lesson: on a page that changes so fast that you never catch up, extra crawls are wasted.` },

      { type: 'h2', text: 'Step 4: the crawler on many machines' },
      { type: 'p', html: `The napkin maths gave ~17 fetcher machines. The question: which machine should a URL go to? If you send it at random, the URLs of one host get scattered over 17 machines, and for politeness (one connection per host) the machines would have to coordinate with each other. The simple answer: <strong>choose the machine by the hash of the host</strong>. A host's whole back queue, robots cache and DNS cache are on one machine. Politeness becomes local.` },
      { type: 'callout', tone: 'term', title: 'New words: partition by host, consistent hashing, checkpoint', html: `<strong>What it is:</strong> <strong>Partition by host</strong> = deciding from hash(host name) which machine owns that host. <strong>Consistent hashing</strong> = a hashing method where adding/removing a machine changes the machine of only a few hosts (<a href="#/consistent-hashing">Consistent hashing</a> lesson). <strong>Checkpoint</strong> = saving a copy of the frontier and the seen-sets to disk/object storage every few minutes.<br><strong>Why we need it:</strong> politeness without machines talking to each other; and after a crash, continue from where it stopped.<br><strong>Without it:</strong> one host's URLs on many machines, all hitting that site at once; and on a crash, the whole frontier is gone.` },
      { type: 'flow', title: 'Distributed crawler: partition by host', height: 340,
        nodes: [
          { id: 'lx', label: 'Link extractor', sub: 'on any node', x: 82, y: 170, w: 136, kind: 'server', info: 'What it is: a new URL found on any machine. Now it must reach the right machine.' },
          { id: 'rt', label: 'Host router', sub: 'hash(host)', x: 262, y: 170, w: 124, kind: 'net', info: 'What it is: picks the machine from hash(hostname). Use consistent hashing, so that when a machine is added/removed only a few hosts move (<a href="#/consistent-hashing">Consistent hashing</a> lesson). A host always lives on one machine.' },
          { id: 'n1', label: 'Crawler node 1', sub: 'frontier + fetch', x: 462, y: 60, w: 140, kind: 'server', info: 'What it is: one crawler machine. It has the frontier of its hosts (front + back queues), a robots cache, a DNS cache, and its own part of URL-seen. It checkpoints the frontier to disk/object storage from time to time.' },
          { id: 'n2', label: 'Crawler node 2', sub: 'frontier + fetch', x: 462, y: 170, w: 140, kind: 'server', info: 'What it is: another crawler machine. Same work, different hosts. news.example.in belongs to this node.' },
          { id: 'n3', label: 'Crawler node 3', sub: 'frontier + fetch', x: 462, y: 280, w: 140, kind: 'server', info: 'What it is: the same work as node 1 (its own frontier, fetchers, DNS cache), only the hosts given to it by hash(host) are different. If a link found on this node belongs to another node\'s host, that URL is sent to that node. If a node dies, its hosts move to another node from the checkpoint.' },
          { id: 'st', label: 'Page store', sub: 'S3 / WARC', x: 648, y: 170, w: 120, kind: 'data', info: 'What it is: the shared store. All nodes write their downloaded pages here. Big files (WARC) fit well in object storage; the indexer reads from here.' },
        ],
        edges: [{ a: 'lx', b: 'rt' }, { a: 'rt', b: 'n1' }, { a: 'rt', b: 'n2' }, { a: 'rt', b: 'n3' }, { a: 'n1', b: 'st' }, { a: 'n2', b: 'st' }, { a: 'n3', b: 'st' }],
        scenarios: [
          { name: 'URL to the right node', steps: [
            { title: 'New URL', text: 'A page parsed on node 1 had a link to news.example.in.', go: 'lx>rt', msg: 'https://news.example.in/cricket/live' },
            { title: 'Hash of the host', text: 'hash("news.example.in") → node 2. All URLs of this host always go to node 2.', go: 'rt>n2', after: { n2: { state: 'ok', sub: 'news.example.in queue' } }, msg: 'hash(news.example.in) mod ring → node 2' },
            { title: 'Local politeness', text: 'Node 2 decides from its own back queue and heap when to fetch. No need to ask any other machine. The downloaded page went to the store.', go: 'n2>st' },
          ]},
          { name: 'Node crash', steps: [
            { title: 'Node 3 went down', text: 'The frontier of its hosts was in memory.', set: { n3: { state: 'down', sub: 'DOWN' } }, focus: ['n3'] },
            { title: 'Back from the checkpoint', text: 'Like Mercator, there was a periodic checkpoint of the frontier and seen-sets. Consistent hashing spread node 3\'s hosts over the other nodes, and they loaded its queues from the checkpoint. A few minutes of work will be repeated (some pages twice), but the crawl did not stop.', parallel: true, go: ['rt>n1', 'rt>n2'], after: { n1: { state: 'warn', sub: '+ node 3 hosts' }, n2: { state: 'warn', sub: '+ node 3 hosts' } } },
          ]},
          { name: 'One very big host', steps: [
            { title: 'Giant site', text: 'One very big site with crores of URLs. Politeness allows only one request at a time on that host, so this host is a "long line", just like host A in the simulator.', go: ['lx>rt', 'rt>n1'], after: { n1: { state: 'hot', sub: 'giant host' } } },
            { title: 'Node 1 is still not idle', text: 'Node 1 also has thousands of other hosts; its fetchers keep working on them. With big sites there is often a separate agreement (a higher rate with their permission, or using their sitemaps/feeds).', go: 'n1>st' },
          ]},
        ],
      },
      { type: 'h2', text: 'What can break' },
      { type: 'table', head: ['Failure', 'What happens', 'Protection'], rows: [
        ['Slow / hanging server', 'A fetcher thread gets stuck forever', 'Connect + read timeouts (Mercator: 1 minute), async I/O, max page size'],
        ['Site sends 429 / 503', 'We are tiring it out even more', 'Back-off: increase the delay for that host (CCBot does this)'],
        ['Slow DNS', 'Fetchers sit idle (Mercator: 87% of the time)', 'Async resolver, DNS cache, prefetch for upcoming hosts'],
        ['Crawler trap', 'One site eats the crawl budget', 'Per-host budget, URL length/depth limits, manual block list'],
        ['Crawler node crash', 'The frontier of its hosts is gone', 'Checkpoints + spread the hosts again with consistent hashing'],
        ['Bloom filter false positive', 'Some new URLs are never crawled', 'Keep the FP rate small (bigger size); take URLs of important sites directly from their sitemaps'],
        ['Malicious content', 'A huge page, broken HTML, a parser crash', 'Size limits, a tolerant parser, parsing in a separate process/sandbox'],
      ]},

      { type: 'h2', text: 'How to say it in an interview' },
      { type: 'steps', items: [
        { t: 'Requirements + numbers', d: 'Billions of pages, ~2k pages/sec, ~2-3 Gbps, hundreds of TB in object storage. Politeness and robustness on top.' },
        { t: 'Main loop', d: 'Frontier → DNS (cached) → robots check → fetch → store → content-seen → link extract + normalize → URL-seen (Bloom) → frontier.' },
        { t: 'Frontier', d: 'Front queues = priority, back queues = one queue per host, heap = next allowed time (~10× the last fetch time). Many times more back queues than threads.' },
        { t: 'Dedupe', d: 'URL normalization + Bloom filter; exact fingerprint + SimHash (64-bit, k = 3) for near-duplicates.' },
        { t: 'Scale + failures', d: 'Partition by hash(host) so politeness stays local; checkpoints; budgets for traps; recrawl with conditional GET.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `When the question "have we seen this before?" is asked over <strong>billions of items</strong> thousands of times a second, and a wrong "yes" now and then is acceptable (one page missed), use a <strong>Bloom filter</strong>. If a wrong "yes" is never acceptable (payments, the final check of unique usernames), keep Bloom only as the first filter, and get the real answer from an exact store. And when "same" means "almost the same", do not use a normal hash; use a similarity-preserving fingerprint like <strong>SimHash</strong>.` },

      { type: 'diagram', title: 'The whole design at a glance', height: 480,
        caption: 'One loop: URL from the frontier → fetch (with DNS and robots) → duplicate checks → new links back into the frontier. The recrawl planner puts old pages back in line. Use the buttons above to see one path at a time.',
        groups: [
          { label: 'Frontier', x: 196, y: 18, w: 338, h: 96 },
          { label: 'Duplicate checks', x: 14, y: 258, w: 520, h: 94 },
        ],
        nodes: [
          { id: 'seeds', label: 'Seed URLs', sub: 'starting list', x: 90, y: 70, kind: 'client', info: 'What it is: a list of URLs given in advance to start the crawl (big, trusted sites, sitemaps). The first links come from here.' },
          { id: 'prio', label: 'Prioritizer', sub: 'front queues', x: 270, y: 70, kind: 'queue', info: 'What it is: the first part of the frontier. It gives each URL a priority (how important the site is, how often the page changes) and puts it in the front queue for that priority.' },
          { id: 'back', label: 'Back queues', sub: '1 host/queue + heap', x: 450, y: 70, kind: 'queue', info: 'What it is: each queue holds URLs of only one host, and the heap holds each host\'s "next allowed time" (~10× the last fetch time). This is where politeness is guaranteed.' },
          { id: 'dns', label: 'DNS cache', sub: 'host → IP', x: 630, y: 70, kind: 'cache', info: 'What it is: a copy of host name → IP answers, with an async resolver. In Mercator, DNS was eating 87% of a fetch thread\'s time; with a cache + parallel lookups, 25%.' },
          { id: 'sched', label: 'Recrawl planner', sub: 'change history', x: 90, y: 190, kind: 'server', info: 'What it is: the part that decides when an old page should be fetched again. It looks at how often the page changed (by comparing fingerprints), and uses conditional GET for a cheap check.' },
          { id: 'router', label: 'Host router', sub: 'hash(host)', x: 270, y: 190, kind: 'net', info: 'What it is: decides from hash(host) which crawler machine (and which back queue) a new URL belongs to. With consistent hashing, few hosts move when machines are added/removed.' },
          { id: 'robots', label: 'robots.txt cache', sub: 'rules per host', x: 450, y: 190, kind: 'cache', info: 'What it is: a copy of each host\'s robots.txt rules (for up to 24 hours). Whether a path is allowed is checked here before the fetch. 503 = everything disallowed, 404 = everything allowed.' },
          { id: 'fetch', label: 'Fetchers', sub: 'HTTP, timeouts', x: 630, y: 190, kind: 'server', info: 'What it is: the threads/machines that download pages. Timeouts, a max page size, and a bigger delay for a host on 429/503 (back-off).' },
          { id: 'us', label: 'URL seen?', sub: 'Bloom filter', x: 90, y: 310, kind: 'cache', info: 'What it is: the test "has this URL come before?", in a line of bits. 5 billion URLs, 1% false positives ≈ 6 GB. Maybe seen → drop.' },
          { id: 'lx', label: 'Link extractor', sub: 'parse + normalize', x: 270, y: 310, kind: 'server', info: 'What it is: takes links out of the HTML and makes canonical URLs (lowercase, port, .., remove #fragment and utm_*), and applies trap filters (max length/depth, per-host budget).' },
          { id: 'cs', label: 'Content seen?', sub: 'hash + SimHash', x: 450, y: 310, kind: 'cache', info: 'What it is: the duplicate test for content. A 64-bit fingerprint for exact copies, SimHash for near-duplicates (a difference of ≤ 3 in 64 bits). If it is a duplicate, the links are not taken out.' },
          { id: 'web', label: 'Websites', sub: 'outside servers', x: 630, y: 310, kind: 'net', info: 'What it is: lakhs of servers with billions of pages. Not in our control: slow, down, traps, broken HTML. Hence politeness and timeouts.' },
          { id: 'store', label: 'Page store', sub: 'WARC on S3', x: 450, y: 430, kind: 'data', info: 'What it is: new pages in big WARC files in object storage. Common Crawl uses this same format. Hundreds of TB.' },
          { id: 'index', label: 'Indexer', sub: 'for search', x: 630, y: 430, kind: 'server', info: 'What it is: the crawler\'s customer. It reads from the page store and builds the search index (Google Search lesson). The crawler\'s work ends here.' },
        ],
        edges: [
          { a: 'seeds', b: 'prio', n: 1 }, { a: 'prio', b: 'back', n: 2 }, { a: 'back', b: 'fetch', n: 3, label: 'next URL' },
          { a: 'fetch', b: 'dns', dashed: true }, { a: 'fetch', b: 'robots', dashed: true },
          { a: 'fetch', b: 'web', both: true, label: 'HTTP GET' },
          { a: 'fetch', b: 'cs', n: 4 }, { a: 'cs', b: 'store', label: 'new content' }, { a: 'store', b: 'index', kind: 'evt' },
          { a: 'cs', b: 'lx', n: 5 }, { a: 'lx', b: 'us', n: 6 }, { a: 'us', b: 'router', label: 'new URLs' }, { a: 'router', b: 'prio' },
          { a: 'cs', b: 'sched', dashed: true, label: 'changed?' }, { a: 'sched', b: 'prio', kind: 'evt' },
        ],
        paths: [
          { name: 'Pick next URL', text: 'Seeds and new URLs go to the prioritizer → front queue (priority) → back queue (one host\'s line) → the heap tells which host is free now → the fetcher gets the next URL. DNS and robots from the cache.', go: ['seeds>prio>back>fetch', 'fetch>dns', 'fetch>robots'] },
          { name: 'Fetch + parse', text: 'The fetcher brings the page → content check (new) → store → indexer. The link extractor takes out links and normalizes them → Bloom filter → only new URLs go through the router into the frontier.', go: ['back>fetch>web', 'fetch>cs>store>index', 'cs>lx>us>router>prio'] },
          { name: 'Duplicate found', text: 'We stop in two places: at content seen (fingerprint/SimHash match) the page is not stored and its links are not taken; at URL seen (Bloom says "maybe seen") the URL does not go into the frontier.', go: ['fetch>cs', 'lx>us'] },
          { name: 'Recrawl', text: 'Comparing fingerprints showed how often a page changes → the recrawl planner puts it back into the frontier with the right priority → fetch with a conditional GET (304 = not changed, bandwidth saved).', go: ['cs>sched>prio>back>fetch>web'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Crawler = a loop: URL from the frontier → download → take out links → new links into the frontier. On the web it breaks in four places: politeness, duplicates, traps, freshness.</li>
        <li>Frontier: front queues = priority, back queues = one queue per host, heap = each host's next allowed time (~10× the last fetch time).</li>
        <li>robots.txt: the group with your own name, the longest match wins, cache for 24 hours, 404 = everything allowed, 503 = everything disallowed. It is a request, not security.</li>
        <li>DNS cache + async resolver, or the fetchers keep waiting for DNS (Mercator: 87%).</li>
        <li>URL dedupe: normalize, then a Bloom filter (~9.6 bits per URL for 1% false positives).</li>
        <li>Content dedupe: exact fingerprint + SimHash (64 bits, a difference of ≤ 3 bits = near-duplicate).</li>
        <li>Traps: per-host budget, URL length/depth limits, monitoring + a manual block list.</li>
        <li>Recrawl: conditional GET, sitemaps; extra crawls on a page that changes very fast are wasted (Cho and Garcia-Molina).</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Per-host back queues: no site gets overloaded, the crawler does not get blocked', 'Bloom filter: a seen-test for billions of URLs in a few GB', 'SimHash: near-duplicates with timestamps/ads are caught too', 'Host-hash partitioning: politeness without coordination between machines', 'Checkpoints: after a crash the crawl continues from where it stopped'],
        costs: ['Politeness makes the crawl slower; big hosts become "long lines"', 'Bloom false positives: some new pages never arrive', 'SimHash at k = 3 gives some wrong matches and some misses (in the paper both precision and recall are around 0.75)', 'Traps still need people and a manual block list', 'The recrawl policy is a compromise: bandwidth vs freshness'],
      },

      { type: 'think', questions: [
        { q: 'Your crawler has 100 fetcher threads, but right now the frontier holds URLs of only 10 hosts. What will happen, and what will you do?', a: 'Because of politeness, one request per host, so at most 10 threads are busy and 90 are idle (the host A effect from the simulator). Bring more hosts into the frontier: grow the seed list, give a small priority boost to URLs of new hosts, and keep many times more back queues than threads (the Mercator designers\' ~3× rule).' },
        { q: 'A news site\'s homepage changes 100 times a day. Should it be crawled every minute?', a: 'Not necessarily. Remember the Cho and Garcia-Molina result: more effort on a page that changes very fast does not raise average freshness. The cheap way: conditional GET (no bandwidth on 304), get new article URLs from RSS/sitemaps, and give priority to the new article pages (which change little once made) instead of the homepage.' },
        { q: 'Why not use an exact hash set (like Redis) instead of a Bloom filter?', a: 'Billions of URLs × ~80+ bytes = hundreds of GB, plus a network hop on every lookup. A Bloom filter fits in local memory at ~10 bits per URL (1% FP). For a crawler, missing a few pages is cheap. If exactness is needed, keep the Bloom filter as the first filter and check the disk/exact store only on "maybe seen".' },
      ]},
      { type: 'quiz', questions: [
        { q: 'In a Mercator-style frontier, what are the "back queues" for?', options: ['Page priority', 'Politeness: each back queue holds URLs of only one host', 'Removing duplicate URLs'], answer: 1, explain: 'Front queues handle priority, back queues handle politeness. One host = one back queue, and the heap tells when the next request to that host is allowed.' },
        { q: 'A site\'s robots.txt gives a 503 error. Under RFC 9309, what should the crawler assume?', options: ['Everything allowed', 'The whole site disallowed (while the error lasts)', 'Ignore robots.txt'], answer: 1, explain: '5xx or unreachable = treat as a complete disallow. 4xx (like 404) = there is no file, so everything is allowed. After a very long outage (~30 days) the rule may be relaxed.' },
        { q: 'Two pages differ only in "Views: 10,231" vs "Views: 10,245". Which fingerprint will call them the same?', options: ['MD5 / a normal hash', 'SimHash (a small Hamming distance)', 'A hash of the URL'], answer: 1, explain: 'A normal hash changes completely when one character changes. SimHash gives similar bits for similar content; a difference of ≤ 3 in 64 bits = near-duplicate.' },
        { q: 'In a distributed crawler, what is the best basis for splitting URLs across machines?', options: ['Random', 'The hash of the full URL', 'The hash of the host name'], answer: 2, explain: 'Splitting by host puts all URLs of a host, its robots cache and its politeness timer on one machine. With the hash of the full URL, one host would be spread over many machines and politeness would need coordination.' },
      ]},
      { type: 'sources', note: 'The Mercator paper is from 1999 and the SimHash paper from 2007; the ideas are still standard today, but the exact internals of today\'s crawlers are not public.', items: [
        { title: 'Mercator: A Scalable, Extensible Web Crawler (Heydon, Najork)', publisher: 'Compaq Systems Research Center / World Wide Web journal', official: true, year: 1999, url: 'https://www.cs.ucr.edu/~vagelis/classes/CS242/publications/scalable-crawler.pdf', used: 'Main loop components, per-host FIFO sub-queues, robots cache (2^18 LRU), 1-minute HTTP timeouts, DNS 87% → 25%, content fingerprints and 8.5% duplicates, URL-seen fingerprints with host-based high bits and ~75% cache hit, traps, checkpointing, 112 docs/sec.' },
        { title: 'Introduction to Information Retrieval, section 20.2.3 "The URL frontier"', publisher: 'Manning, Raghavan, Schütze (Cambridge University Press), Stanford NLP', official: true, year: 2008, url: 'https://nlp.stanford.edu/IR-book/html/htmledition/the-url-frontier-1.html', used: 'Front/back queue design, heap of earliest contact times, 10× last fetch heuristic, ~3 back queues per thread, priority by change rate.' },
        { title: 'Detecting Near-Duplicates for Web Crawling (Manku, Jain, Das Sarma)', publisher: 'Google, WWW 2007', official: true, year: 2007, url: 'https://www.www2007.cpsc.ucalgary.ca/papers/paper215.pdf', used: 'SimHash construction, 64-bit fingerprints with k = 3 for 8B pages, permuted sorted tables, precision/recall ~0.75.' },
        { title: 'RFC 9309: Robots Exclusion Protocol', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9309.html', used: 'Location, groups, longest match, 24h caching, 4xx/5xx handling, 500 KiB minimum, no crawl-delay.' },
        { title: 'How Google interprets the robots.txt specification', publisher: 'Google Search Central', official: true, url: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt', used: 'Crawl-delay unsupported, ~24h caching, 4xx/5xx behaviour.' },
        { title: 'Common Crawl FAQ, Get Started, and December 2025 crawl announcement', publisher: 'Common Crawl', official: true, year: 2025, url: 'https://commoncrawl.org/faq', used: 'CCBot on Apache Nutch, obeys robots.txt and Crawl-delay, back-off on 429/5xx, WARC/WAT/WET, S3 storage, 2.16B pages / 364 TiB in Dec 2025.' },
        { title: 'Effective Page Refresh Policies for Web Crawlers (Cho, Garcia-Molina)', publisher: 'ACM Transactions on Database Systems', official: true, year: 2003, url: 'https://dl.acm.org/doi/10.1145/958942.958945', used: 'Uniform refresh beats proportional on average freshness (read via summaries).' },
      ]},
    ],
  });
})();
