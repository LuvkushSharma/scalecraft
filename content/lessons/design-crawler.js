(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */
  // Frontier simulator: 4 main hosts (A bada site), optional 8 chhote hosts. Fetch time ms per host.
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
  // SimHash (Charikar), 64 bits = do 32-bit hashes. Feature = word, weight = kitni baar aaya.
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
    summary: `xyz.com ab poore web ka search banana chahta hai, aur uske liye pehle web ke pages chahiye. Crawler billions pages download karta hai, bina kisi website ko pareshaan kiye aur bina ek hi page do baar laaye. URL frontier, politeness, robots.txt, DNS caching, Bloom filter aur SimHash: sab ek pipeline mein.`,
    _test: { crSim, simhash, hamming, exactFp, SH_DOCS },
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Google pe kuch bhi search karo, jawab second mein aata hai. Kyunki Google ke paas web ke arabon pages ki copy pehle se rakhi hai.<br>Wo copy ek program banata hai jise <strong>crawler</strong> kehte hain. Ye ek page kholta hai, usme ke links padhta hai, phir un links wale pages kholta hai, aur aise hi chalta rehta hai.<br>Mushkil ye hai ki kisi website ko itni tezi se na kholo ki wo gir jaaye, ek hi page do baar na laao, aur kabhi na khatam hone wale jaal (traps) mein na phaso.<br>Ye lesson yahi sikhata hai: poore web ko tameez se, bina dohraaye, kaise padhein.` },
      { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Kaagaz pe socho: tumhare paas 10 URLs hain. Har page download karo, usme se naye links nikaalo, unhe bhi download karo... Ye kab rukega? Ek hi website pe 1,000 links mile to kya sab ek saath maar doge? Ek page do baar aa gaya to kaise pata chalega? Phir yahan compare karo.` },
      { type: 'p', html: `Ab tak xyz.com ka search sirf apne videos dhoondhta tha. Naya plan: poore web pe search (Google Search lesson mein index aur ranking dekhenge). Pehla kadam: web ke pages <strong>apne paas laana</strong>. Ye kaam crawler karta hai.` },
      { type: 'h2', text: 'Step 0: bilkul zero se, web aur crawler' },
      { type: 'p', html: `Pehle chaar chhote words, kyunki poora lesson inhi pe chalega:` },
      { type: 'list', items: [
        '<strong>Web page</strong>: ek file jo browser dikhata hai. Iske andar text aur <strong>HTML</strong> hota hai (wo code jo batata hai ki heading kya hai, image kahan hai, link kahan hai).',
        '<strong>URL</strong>: page ka poora pata, jaise <code>https://news.example.in/cricket/final</code>. Isme teen hisse: scheme (<code>https</code>), <strong>host</strong> (<code>news.example.in</code>, yaani kaunsi website/server), aur path (<code>/cricket/final</code>, yaani site ke andar kaunsa page).',
        '<strong>Link</strong>: ek page ke andar likha kisi doosre page ka URL (HTML mein <code>&lt;a href="..."&gt;</code>). Web isi se juda hua jaal hai.',
        '<strong>Download (fetch)</strong>: server se HTTP request bhej ke page ki copy lena. Server jawab mein ek status code bhejta hai: <code>200</code> = mil gaya, <code>404</code> = page nahi hai, <code>429</code> = "bahut requests, dheere", <code>503</code> = server mushkil mein.',
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: Web crawler', html: `<strong>Ye kya hai:</strong> ek program jo kuch shuruaati URLs (<strong>seed URLs</strong>) se shuru karta hai, har page download karta hai, usme ke links nikaalta hai, aur un links ko bhi download karne ki list mein daal deta hai. Isse <em>spider</em> ya <em>bot</em> bhi kehte hain. Googlebot, Bingbot, aur Common Crawl ka CCBot iske famous examples hain.<br><strong>Kyun chahiye:</strong> search engine sirf unhi pages mein dhoondh sakta hai jo uske paas pehle se hain. Web ka koi central register nahi jahan saare pages likhe hon; links pakad pakad ke hi pages milte hain.<br><strong>Iske bina:</strong> xyz.com ka web search khaali. Har search pe live jaake arabon sites kholna namumkin.` },
      { type: 'p', html: `Haath se ek chhota crawl karke dekho. Seed: <code>xyz.com/</code>. Is page pe do links hain: <code>/videos</code> aur <code>/about</code>. Dono ko "baad mein laana hai" wali list ke peeche lagao. Ab list se agla nikaalo (<code>/videos</code>), download karo, usme 3 naye links mile, unhe bhi list ke peeche lagao. Ye list ek <strong>queue</strong> hai (jo pehle aaya, wo pehle nikla), aur "pehle paas wale, phir door wale" pages ka ye kram graph ka <strong>BFS</strong> (breadth-first search) kehlata hai.` },
      { type: 'p', html: `Basic algorithm ek line ka hai: <strong>queue se URL nikaalo → download → links nikaalo → naye links queue mein</strong>. Ye graph ka BFS (breadth-first search) hai. Lekin web pe ye seedha-saada loop chaar jagah toot-ta hai, aur yahi chaar jagah is lesson ke deep dives hain:` },
      { type: 'list', items: [
        '<strong>Politeness:</strong> ek site ke 1,000 links mile, to BFS unhe lagataar maarega. Chhoti site ke liye ye DDoS jaisa hai (DDoS = itni requests bhejna ki site gir jaaye).',
        '<strong>Duplicates:</strong> wahi URL kai pages pe linked hai; wahi content alag URLs pe (mirrors, tracking params). Bina dedupe ke crawler aadha time kachra laata hai.',
        '<strong>Traps:</strong> kuch sites ke infinite URLs hote hain (calendar ka "agla mahina" hamesha). BFS kabhi khatam nahi hoga.',
        '<strong>Freshness:</strong> web badalta rehta hai. Kaun sa page kab dobara laana hai?',
      ]},

      { type: 'h2', text: 'Step 1: requirements' },
      { type: 'compare',
        left: { title: 'Functional', html: `• Seed URLs se shuru karke HTML pages download karna<br>• Links nikaal ke naye URLs dhoondhna<br>• Pages ko storage mein save karna (index banane wale ke liye)<br>• robots.txt ka paalan<br>• Pages ko samay samay pe dobara crawl karna (recrawl)<br><br><strong>Out of scope:</strong> indexing, ranking, JavaScript-heavy pages render karna` },
        right: { title: 'Non-functional', html: `• Scale: billions pages, hazaaron pages per second<br>• <strong>Politeness</strong>: kisi ek site pe zyada load nahi<br>• Robust: tooti HTML, dheeme servers, traps, malicious pages<br>• Extensible: naye content types (PDF, images) baad mein add ho sakein<br>• Restartable: crash ke baad wahin se chalu (checkpoints)` },
      },

      { type: 'h2', text: 'Step 2: napkin maths' },
      { type: 'p', html: `Reference ke liye ek asli number: Common Crawl (ek non-profit jo web ki free copy researchers ko deta hai) ka December 2025 ka crawl ~2 hafte mein chala aur usme 2.16 billion pages the, ~364 TiB uncompressed. Matlab average page ~185 KB (364 TiB ≈ 400 TB). Ek word: <strong>fetcher</strong> = crawler ka wo hissa (ya machine) jo sach mein pages download karta hai. In numbers se shuru karo aur badal ke dekho:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Pages (billions)</label><input class="cr-n-p" type="number" value="2" min="0.1" step="0.1"></div>
            <div><label>Kitne din mein</label><input class="cr-n-d" type="number" value="14" min="1" step="1"></div>
            <div><label>Average page size (KB)</label><input class="cr-n-s" type="number" value="185" min="1" step="10"></div>
            <div><label>Ek fetcher machine kitne pages/sec</label><input class="cr-n-m" type="number" value="100" min="1" step="10"></div>
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
          q('.cr-n-note').textContent = 'Ek din = 86,400 seconds. Storage compress karke kaafi kam ho jaata hai (HTML bahut compress hota hai). "100 pages/sec per machine" ek maan-li value hai: 1999 mein Mercator crawler ne ek hi machine pe ~112 documents/sec average kiya tha, aaj ki machines kahin tez hain lekin politeness ki wajah se asli rate aksar network aur sites ki speed se tay hota hai.';
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Default values pe ~1,650 pages/sec, ~2.4 Gbps lagataar download, aur ~370 TB raw data. Teen conclusions: (1) ek machine kaafi nahi, fetchers ka fleet chahiye; (2) pages <a href="#/object-storage">object storage</a> mein jaayenge, database mein nahi; (3) "ye URL pehle dekha?" wala sawaal billions URLs pe, har second hazaaron baar poochha jaayega, to wo memory-efficient hona chahiye.` },
      { type: 'h2', text: 'Step 3: high-level design, ek page ka safar' },
      { type: 'p', html: `Ye design 1999 ke <strong>Mercator</strong> paper (Heydon aur Najork, Compaq) pe based hai, jo crawler design ka classic reference hai. Paper purana hai, lekin uske components (frontier, DNS resolver, fetcher, content-seen test, link extractor, URL-seen test) aaj bhi har crawler mein kisi na kisi roop mein milte hain. Diagram se pehle, is loop ke har hisse ka chhota card. Kahani ek URL ki hai: wo line mein lagta hai, download hota hai, check hota hai, aur naye URLs ko janm deta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: URL frontier', html: `<strong>Ye kya hai:</strong> un saare URLs ki line jo abhi download hone baaki hain. "Frontier" matlab seema: crawler ne yahan tak dekha, aage ye pages hain.<br><strong>Kyun chahiye:</strong> crawler ko hamesha pata hona chahiye ki agla kaunsa page laana hai, aur kab (politeness, priority).<br><strong>Iske bina:</strong> naye links kahin rakhne ki jagah nahi; ya to kho jaayenge, ya ek site pe toot padenge. Deep dive 1 mein iska andar ka design.` },
      { type: 'callout', tone: 'term', title: 'Naya word: DNS cache', html: `<strong>Ye kya hai:</strong> DNS wo system hai jo <code>news.example.in</code> jaise naam ko IP address (server ka number, jaise <code>203.0.113.7</code>) mein badalta hai. DNS cache = in jawabon ki apni copy, taaki baar baar na poochhna pade.<br><strong>Kyun chahiye:</strong> har download se pehle IP chahiye, aur ek site ke hazaaron pages hote hain. Har baar DNS server se poochhna slow hai.<br><strong>Iske bina:</strong> fetchers zyadatar time DNS ke jawab ka intezaar karte (Mercator mein 87% time, neeche dekho).` },
      { type: 'callout', tone: 'term', title: 'Naya word: Fetcher', html: `<strong>Ye kya hai:</strong> wo hissa jo HTTP request bhej ke page download karta hai. Pehle us site ka robots.txt (site owner ke niyam, deep dive 2) check karta hai.<br><strong>Kyun chahiye:</strong> yahi asli "download" hai; baaki sab iske aage-peeche ka intezaam.<br><strong>Iske bina:</strong> kuch nahi aata. Aur agar ye timeout ke bina chale, to ek dheema ya bura server ise hamesha ke liye atka sakta hai.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Page store (object storage, WARC)', html: `<strong>Ye kya hai:</strong> downloaded pages rakhne ki badi, sasti jagah. <a href="#/object-storage">Object storage</a> (jaise S3) mein bahut saare pages ek badi file mein jode jaate hain; Common Crawl is file format ko <strong>WARC</strong> kehta hai (page + uski HTTP details).<br><strong>Kyun chahiye:</strong> sainkdon TB data hai, aur search index banane wala baad mein yahin se padhega.<br><strong>Iske bina:</strong> database itna data sasta nahi rakh sakta, aur crawl dobara karna padta.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Fingerprint (content seen?)', html: `<strong>Ye kya hai:</strong> poore page ke content se nikla ek chhota number (hash), jaise 64 bits. Same content = same fingerprint.<br><strong>Kyun chahiye:</strong> ek hi article kai URLs pe hota hai. Fingerprint pehle dekha ho to page duplicate hai; uske links dobara nahi nikaalte.<br><strong>Iske bina:</strong> wahi content baar baar store hota aur uske links baar baar frontier mein aate.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Link extractor (parse + normalize)', html: `<strong>Ye kya hai:</strong> wo hissa jo HTML ko padh ke (parse) saare links nikaalta hai, aur har link ko ek standard roop mein likhta hai (<strong>normalize</strong>), taaki ek hi page ke alag spelling wale URLs ek hi ginen.<br><strong>Kyun chahiye:</strong> naye pages yahin se milte hain.<br><strong>Iske bina:</strong> crawl pehle page pe hi ruk jaata, ya ek page ko 5 alag spelling se 5 baar laata.` },
      { type: 'callout', tone: 'term', title: 'Naya word: URL seen? (Bloom filter)', html: `<strong>Ye kya hai:</strong> ek test: "ye URL pehle kabhi frontier mein aaya tha?" Billions URLs ke liye ye ek <strong>Bloom filter</strong> se hota hai: bits ki ek lambi line jo bahut kam memory mein "pakka nahi dekha" ya "shayad dekha" bata deti hai (deep dive 3 mein khud chala ke dekhoge).<br><strong>Kyun chahiye:</strong> homepage jaisa link lakhon pages pe hota hai.<br><strong>Iske bina:</strong> ek URL lakhon baar line mein lagta, aur crawler ka loop kabhi khatam na hota.` },
      { type: 'p', html: `Ab poora loop ek saath. Har box pe click karo, phir scenarios chalao:` },
      { type: 'flow', title: 'Crawler ka main loop', height: 340,
        nodes: [
          { id: 'fr', label: 'URL frontier', sub: 'kya laana hai', x: 80, y: 170, w: 132, kind: 'queue', info: 'Ye kya hai: un saare URLs ki line jo abhi download karne hain. Simple FIFO queue nahi: andar priority aur har host ki alag queue hoti hai (deep dive 1). Billions URLs, to zyadatar disk pe, sirf aage wala hissa memory mein.' },
          { id: 'dns', label: 'DNS cache', sub: 'host → IP', x: 262, y: 55, w: 124, kind: 'net', info: 'Ye kya hai: host name → IP address ke jawabon ki copy. Har fetch se pehle hostname ko IP mein badalna padta hai. Mercator team ne paaya ki DNS lookups ek thread ke 87% time kha rahe the; apna multi-threaded resolver + cache lagane pe ye 25% reh gaya. DNS kya hai, ye <a href="#/how-the-web-works">pehle lesson</a> mein dekha tha.' },
          { id: 'fe', label: 'Fetcher', sub: 'HTTP + robots', x: 262, y: 170, w: 124, kind: 'server', info: 'Ye kya hai: page download karne wala hissa. Pehle us host ka robots.txt (cache se) check karta hai. Timeouts zaroori: Mercator ne apna HTTP module isliye likha kyunki purani Java library mein timeout set nahi hota tha aur ek malicious server thread ko hamesha ke liye latka sakta tha. Unke requests 1 minute pe time out hote the.' },
          { id: 'st', label: 'Page store', sub: 'object storage', x: 262, y: 290, w: 124, kind: 'data', info: 'Ye kya hai: downloaded raw pages ki badi, sasti jagah. Common Crawl inhe WARC files mein S3 pe rakhta hai (WARC = raw HTTP response + metadata; WAT = nikaala hua metadata aur links; WET = sirf plain text). Indexer baad mein yahin se padhta hai.' },
          { id: 'cs', label: 'Content seen?', sub: 'fingerprint', x: 440, y: 170, w: 132, kind: 'cache', info: 'Ye kya hai: content ka duplicate-check. Ye content pehle kisi aur URL pe dekha? Exact copy ke liye page ka 64-bit fingerprint (Mercator: Rabin fingerprint). Near-duplicate (sirf timestamp/ads alag) ke liye SimHash (deep dive 3). Duplicate hai to iske links dobara nahi nikaalte.' },
          { id: 'lx', label: 'Link extractor', sub: 'parse + normalize', x: 625, y: 170, w: 132, kind: 'server', info: 'Ye kya hai: HTML padh ke links nikaalne wala hissa. Saare links nikaalta hai, relative links ko absolute banata hai, aur URL normalize karta hai (lowercase host, default port hatao, #fragment hatao, tracking params jaise utm_source hatao). Phir URL filter: sirf http/https, kuch domains block, bahut lambe URLs reject (traps).' },
          { id: 'us', label: 'URL seen?', sub: 'Bloom filter', x: 520, y: 292, w: 132, kind: 'cache', info: 'Ye kya hai: URL ka duplicate-check. Ye URL pehle frontier mein aa chuka? Billions URLs ke liye har ek ko set mein rakhna mehenga. Bloom filter thodi memory mein "pakka nahi dekha" ya "shayad dekha" bata deta hai. Mercator ne isi kaam ke liye URL fingerprints ka set (memory cache + disk pe sorted file) use kiya tha.' },
        ],
        edges: [{ a: 'fr', b: 'fe' }, { a: 'fe', b: 'dns' }, { a: 'fe', b: 'st' }, { a: 'fe', b: 'cs' }, { a: 'cs', b: 'lx' }, { a: 'lx', b: 'us' }, { a: 'us', b: 'fr' }],
        scenarios: [
          { name: 'Naya page', steps: [
            { title: 'Frontier se URL', text: 'Frontier ne agla URL diya, us host ki politeness wait poori ho chuki hai.', go: 'fr>fe', msg: 'https://news.example.in/cricket/final' },
            { title: 'DNS: cache hit', text: 'news.example.in ka IP cache mein hai. Network round trip bach gaya.', go: ['fe>dns', 'res:dns>fe'], after: { dns: { state: 'hit', sub: 'HIT' } }, msg: 'news.example.in → 203.0.113.7' },
            { title: 'robots.txt OK, download', text: 'Host ka robots.txt (24 ghante tak cached) kehta hai /cricket/ allowed. Page download hua aur raw copy store mein gayi.', go: 'fe>st', msg: 'GET /cricket/final  →  200 OK, 182 KB\nPUT warc/2026-10/part-00412' },
            { title: 'Content naya hai', text: 'Fingerprint pehle kabhi nahi dekha. Aage badho.', go: 'fe>cs', after: { cs: { state: 'ok', sub: 'new' } } },
            { title: 'Links nikaalo', text: 'Page mein 48 links mile. Normalize kiye: relative se absolute, #fragment aur utm params hataye.', go: 'cs>lx', msg: '/cricket/live → https://news.example.in/cricket/live\n?utm_source=x hata diya' },
            { title: 'Sirf naye URLs frontier mein', text: 'Bloom filter ne bataya: 48 mein se 9 "pakka nahi dekhe". Sirf ye 9 frontier mein gaye. Loop chalta rahega.', go: ['lx>us', 'us>fr'], msg: '9 new URLs → frontier' },
          ]},
          { name: 'URL pehle dekha', steps: [
            { title: 'Popular link', text: 'Homepage ka link har page pe hai. Lakhon baar milega.', go: 'lx>us', msg: 'https://news.example.in/' },
            { title: 'Bloom: "shayad dekha"', text: 'Saare bits 1 hain, to drop. Isi test ki wajah se crawler ek URL ko baar baar frontier mein nahi daalta.', set: { fr: { state: 'dim' } }, after: { us: { state: 'hit', sub: 'seen → drop' } } },
            { title: 'Keemat: false positive', text: 'Bloom filter kabhi "shayad dekha" galti se bhi bol deta hai (jaise 1%). Matlab kuch naye URLs kabhi crawl nahi honge. Web crawler ke liye ye chalta hai: thode pages miss karna, har URL ke liye disk lookup se sasta hai.', focus: ['us'] },
          ]},
          { name: 'Duplicate content', intro: 'Ek hi article do URLs pe: /story?id=7 aur /amp/story/7.', steps: [
            { title: 'Doosra URL download', go: ['fr>fe', 'fe>cs'], text: 'URL alag tha, to URL-seen test ne roka nahi.' },
            { title: 'Fingerprint match', text: 'Content ka fingerprint pehle dekha hua hai. Links dobara nahi nikaalte (wo pehle hi nikal chuke). Mercator ki 8 din ki crawl mein 8.5% downloaded documents duplicates the.', set: { lx: { state: 'dim' } }, after: { cs: { state: 'hit', sub: 'duplicate' } } },
          ]},
          { name: 'DNS bottleneck', steps: [
            { title: 'Naya host: cache miss', text: 'Har naya host = remote DNS server se poochho. Kuch DNS servers seconds lete hain.', go: ['fe>dns'], after: { dns: { state: 'miss', sub: 'MISS, slow' } } },
            { title: 'Fetcher atka', text: 'Mercator team ne paaya ki Java aur Unix ka standard DNS call synchronized tha: ek waqt pe ek hi uncached lookup. Threads DNS ka wait karte rahe, 87% time.', set: { fe: { state: 'warn', sub: 'waiting on DNS' } }, focus: ['dns', 'fe'] },
            { title: 'Fix: async resolver + cache', text: 'Apna multi-threaded resolver jo kai lookups parallel karta hai, plus cache. DNS ka hissa 25% pe aa gaya. Aaj ka sabak: crawler mein DNS ko pehle se resolve karo (prefetch) aur cache karo.', go: 'res:dns>fe', after: { dns: { state: 'ok', sub: 'parallel + cache' }, fe: { state: '', sub: 'HTTP + robots' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Deep dive 1: URL frontier aur politeness' },
      { type: 'h3', text: 'Problem: BFS ek site pe toot padta hai' },
      { type: 'p', html: `Ek page pe aksar zyadatar links <em>usi site</em> ke hote hain. Simple FIFO queue mein ek site ke 50 URLs lagaataar aayenge, aur 20 fetcher threads unhe ek saath maarenge. Tumhare liye ye "fast crawl" hai; us chhoti site ke server ke liye ye attack jaisa hai. Site down, owner gussa, aur crawler ka IP block.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Politeness', html: `<strong>Ye kya hai:</strong> crawler ka niyam ki kisi ek host pe <strong>ek waqt mein ek hi connection</strong> ho, aur do requests ke beech kuch seconds ka gap ho.<br><strong>Kyun chahiye:</strong> chhoti site ka server ek saath 20 requests nahi jhel sakta. Site owner gussa hoke crawler ka IP block kar dega.<br><strong>Iske bina:</strong> sites girengi, aur crawler ko koi andar nahi aane dega.<br><strong>Source:</strong> Stanford ke IR textbook (Manning, Raghavan, Schütze, 2008) mein Mercator-style frontier ke yahi goals likhe hain: ek host pe ek connection, requests ke beech kuch seconds, aur high-priority pages pehle.` },
      { type: 'h3', text: 'Mercator ka jawab: har host ki apni queue' },
      { type: 'p', html: `1999 ke Mercator paper mein frontier asal mein bahut saari FIFO sub-queues thi: har worker thread ki ek, aur naya URL kis sub-queue mein jaayega ye uske <strong>host name</strong> se tay hota tha. Natija: ek server se zyada se zyada ek hi thread download karta tha. Baad mein Najork aur Heydon ne frontier ko do hisson mein baanta, aur yahi design IR textbook mein samjhaya gaya hai. Pehle teen words:` },
      { type: 'callout', tone: 'term', title: 'Naye words: priority, front queue, back queue, heap', html: `<strong>Ye kya hai:</strong> <strong>Priority</strong> = kaunsa page kitna zaroori hai (badi news site ka naya page > kisi purane blog ka page). <strong>Front queues</strong> = priority ke hisaab se alag lines (F1 kam zaroori ... F-high bahut zaroori). <strong>Back queues</strong> = har line mein sirf <em>ek host</em> ke URLs. <strong>Heap</strong> = ek data structure jo hamesha sabse chhota number turant de deta hai; yahan har back queue ka "is host pe agla request kab allowed hai" time rakhta hai.<br><strong>Kyun chahiye:</strong> front queues "pehle kya" ka jawab deti hain, back queues "ek host pe ek hi request" pakka karti hain, aur heap batata hai ki abhi kaunsa host free hai.<br><strong>Iske bina:</strong> ya zaroori pages der se aate, ya ek site pe ek saath kai requests jaati.` },
      { type: 'ascii', text: `
   naye URLs
       │
   Prioritizer  (page kitna important / kitni baar badalta hai → priority 1..F)
       │
 ┌─────┼─────────────┐        FRONT QUEUES  = priority
 F1   F2   ...   F(high)       (selector high priority ko zyada baar chunta hai)
 └─────┼─────────────┘
       │  router: host → back queue  (table: news.example.in → B7)
 ┌─────┼──────────────────┐   BACK QUEUES  = politeness
 B1   B2   ...  B7  ...  Bn     har back queue mein SIRF ek host ke URLs
 └─────┼──────────────────┘
       │
   Heap: har back queue ka "agla allowed time"
       │  fetcher: heap ka sabse chhota time lo, tab tak ruko, fetch karo,
       │           naya time = ab + 10 × (pichhli fetch ka time)
   Fetcher threads`, caption: 'Front queues priority sambhalti hain, back queues politeness' },
      { type: 'p', html: `Do details yaad rakhne layak hain. (1) Wait ka heuristic: agla request us host pe kam se kam <strong>pichhle fetch ke time ka ~10 guna</strong> baad. Dheema server (jo pehle se thaka hai) apne aap kam requests paata hai. (2) Designers ne suggest kiya ki <strong>threads se ~3 guna back queues</strong> rakho, taaki koi thread khaali na baithe jab uske host ka wait chal raha ho. Neeche ke simulator mein khud dekho ye kyun zaroori hai.` },
      { type: 'custom', render(el) {
        const COL = { A: 'var(--accent)', B: 'var(--amber)', C: 'var(--green)', D: 'var(--violet)' };
        el.innerHTML = `<div class="row2">
            <div><label>Fetcher threads: <strong class="cr-f-nv"></strong></label><input class="cr-f-n" type="range" min="1" max="4" step="1" value="4"></div>
            <div><label>Same host pe gap (politeness delay): <strong class="cr-f-dv"></strong></label><input class="cr-f-d" type="range" min="0" max="4000" step="500" value="2000"></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
            <button type="button" class="chip cr-f-m0">Naive FIFO</button>
            <button type="button" class="chip on cr-f-m1">Per-host queues (polite)</button>
            <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="cr-f-x" style="width:auto"> 8 aur chhote hosts (E-L) frontier mein</label>
          </div>
          <svg class="cr-f-svg" viewBox="0 0 480 190" style="width:100%;height:auto;display:block"></svg>
          <div class="stats">
            <div class="stat"><span>Kul time</span><strong class="cr-f-t"></strong></div>
            <div class="stat"><span>Host A pe ek saath max</span><strong class="cr-f-c"></strong></div>
            <div class="stat"><span>Host A pe min gap</span><strong class="cr-f-g"></strong></div>
            <div class="stat"><span>Fetchers idle</span><strong class="cr-f-i"></strong></div>
          </div>
          <div class="calc-note cr-f-note"></div>`;
        const q = c => el.querySelector(c);
        let polite = true;
        const NS = 'http://www.w3.org/2000/svg';
        const draw = () => {
          const n = Number(q('.cr-f-n').value), d = Number(q('.cr-f-d').value), x = q('.cr-f-x').checked;
          q('.cr-f-nv').textContent = n; q('.cr-f-dv').textContent = polite ? (d / 1000) + ' s' : '(naive mein koi niyam nahi)';
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
          q('.cr-f-note').textContent = 'Host A (neela) bada site hai: 8 URLs, har fetch 0.5 s. B: 3 URLs (1 s), C: 3 (0.5 s), D: 2 (1.5 s). Grey boxes = chhote hosts E-L. F1-F4 = fetcher threads. ' + (polite ? 'Polite mode: free fetcher woh host chunta hai jiska "agla allowed time" sabse pehle aata hai.' : 'Naive mode: jo URL queue mein aage hai wahi, chahe us host pe pehle se request chal rahi ho.');
        };
        q('.cr-f-m0').onclick = () => { polite = false; draw(); };
        q('.cr-f-m1').onclick = () => { polite = true; draw(); };
        ['.cr-f-n', '.cr-f-d'].forEach(c => q(c).addEventListener('input', draw));
        q('.cr-f-x').addEventListener('change', draw);
        draw();
      }},
      { type: 'p', html: `Jo dikhna chahiye: <strong>Naive FIFO</strong> 4 fetchers ke saath 3.5 s mein khatam, lekin host A pe ek saath 3 requests chal rahi hain. <strong>Polite</strong> mode (4 fetchers, 2 s gap): host A pe hamesha ek hi request aur beech mein 2 s, lekin kul time 18 s ho gaya aur fetchers ~84% time khaali baithe hain, kyunki host A ke 8 URLs ki line hi sabse lambi hai. Ab "8 aur chhote hosts" on karo: kaam dugna (32 URLs), lekin kul time wahi 18 s, aur idle ~67%. Sabak: polite crawler ki speed <strong>ek saath kitne alag hosts</strong> chal rahe hain us pe tikti hai. Isliye real crawlers lakhon hosts ki back queues ek saath active rakhte hain.` },
      { type: 'h2', text: 'Deep dive 2: robots.txt, site ka "yahan mat aana" board' },
      { type: 'p', html: `Politeness sirf speed ki baat nahi; site owner ye bhi bata sakta hai ki <em>kaunse</em> pages crawl na hon. Iske liye ek file hoti hai: <code>https://site.com/robots.txt</code>. Ye 1994 se chal raha tha, lekin official standard sirf 2022 mein bana: <strong>RFC 9309</strong> (Robots Exclusion Protocol).` },
      { type: 'callout', tone: 'term', title: 'Naya word: robots.txt', html: `<strong>Ye kya hai:</strong> site ke root pe rakhi ek simple text file, jisme site owner crawlers ke liye niyam likhta hai: "ye folders mat kholo", "ye khol sakte ho". Har niyam ek <strong>User-agent</strong> (crawler ka naam) ke group mein hota hai.<br><strong>Kyun chahiye:</strong> site owner ke kuch pages (search results, admin, drafts) crawl ke layak nahi; unhe khulwana unka bojh badhata hai.<br><strong>Iske bina:</strong> crawler unwanted pages pe time aur unka server dono barbaad karta, aur achha crawler kehlaane ka haq kho deta.` },
      { type: 'code', text: `# https://news.example.in/robots.txt
User-agent: *
Disallow: /admin/
Disallow: /search
Allow: /search/about

User-agent: xyzbot
Disallow: /drafts/

Sitemap: https://news.example.in/sitemap.xml` },
      { type: 'table', head: ['Niyam (RFC 9309)', 'Matlab'], rows: [
        ['File hamesha host ke top pe <code>/robots.txt</code>', 'Har host (aur har scheme/port) ki alag file. Crawler ko pehle ye laani hai.'],
        ['User-agent groups', 'Crawler apne naam (jaise "xyzbot") wala group dhoondhta hai; na mile to <code>*</code> wala.'],
        ['Sabse lamba match jeetta hai', '<code>/search/about</code> pe dono rules lagte hain; Allow wala lamba hai, to allowed. <code>/search?q=x</code> disallowed.'],
        ['24 ghante se zyada cache nahi (SHOULD NOT)', 'Har request pe robots.txt mat laao, lekin din mein ek baar refresh karo. Google bhi aam taur pe 24 ghante tak cache karta hai.'],
        ['4xx (jaise 404)', 'File nahi hai, to crawler sab kuch crawl kar sakta hai.'],
        ['5xx / site unreachable', 'Maan lo poori site disallowed. Bahut lamba chale (~30 din), to "file nahi hai" jaisa treat kar sakte ho.'],
        ['Kam se kam 500 KiB parse karo', 'Usse badi file ka baaki hissa ignore ho sakta hai.'],
      ]},
      { type: 'p', html: `Khud check karo. Upar wali robots.txt ke rules is widget mein hain. Path badlo, crawler ka naam badlo, aur robots.txt laane ka jawab (200/404/503) badal ke dekho.` },
      { type: 'custom', render(el) {
        // Upar wali robots.txt ke rules. Sirf prefix match (wildcards * aur $ is khilone mein nahi).
        const G = { '*': [['Disallow', '/admin/'], ['Disallow', '/search'], ['Allow', '/search/about']], xyzbot: [['Disallow', '/drafts/']] };
        const PATHS = ['/cricket/final', '/admin/users', '/search?q=kohli', '/search/about', '/drafts/new-post'];
        el.innerHTML = `<div class="row2">
            <div><label>Crawler ka naam (User-agent)</label><select class="cr-r-ua"><option value="otherbot">otherbot (koi aur)</option><option value="xyzbot">xyzbot (hamara)</option></select></div>
            <div><label>robots.txt laane pe jawab</label><select class="cr-r-st"><option value="200">200 OK (file mili)</option><option value="404">404 (file nahi)</option><option value="503">503 (server error)</option></select></div>
          </div>
          <div style="margin-top:8px"><label>Path</label><input class="cr-r-p" type="text" value="/search?q=kohli" style="width:100%;font-family:var(--f-mono)"></div>
          <div class="chips" style="margin-top:6px">${PATHS.map(p => `<button type="button" class="chip" data-p="${p}">${p}</button>`).join('')}</div>
          <div class="stats"><div class="stat"><span>Group</span><strong class="cr-r-g"></strong></div><div class="stat"><span>Match hua rule</span><strong class="cr-r-m"></strong></div><div class="stat"><span>Faisla</span><strong class="cr-r-v"></strong></div></div>
          <div class="calc-note cr-r-n"></div>`;
        const q = c => el.querySelector(c);
        const upd = () => {
          const ua = q('.cr-r-ua').value, st = q('.cr-r-st').value, path = q('.cr-r-p').value || '/';
          const gname = G[ua] ? ua : '*', rules = G[gname];
          let ok, rule = '-', note;
          if (st === '404') { ok = true; note = '4xx = file nahi hai, to sab kuch allowed (RFC 9309).'; }
          else if (st === '503') { ok = false; note = '5xx = server mushkil mein hai, to poori site disallowed maano jab tak error chale (RFC 9309).'; }
          else {
            let best = null;
            rules.forEach(([t, p]) => { if (path.startsWith(p) && (!best || p.length > best[1].length || (p.length === best[1].length && t === 'Allow'))) best = [t, p]; });
            ok = !best || best[0] === 'Allow'; rule = best ? `${best[0]}: ${best[1]}` : 'koi nahi';
            note = !best ? `Group "${gname}" ka koi rule is path pe nahi lagta, to allowed.` : `Group "${gname}" mein jo rules lagte hain unme sabse lamba "${best[1]}" (${best[1].length} characters) jeeta.`;
            if (ua === 'xyzbot') note += ' Dhyan do: xyzbot ka apna group hai, to "*" wale rules (jaise /admin/) iske liye lagte hi nahi.';
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
      { type: 'p', html: `Teen cheezein dikhni chahiye. (1) otherbot ke liye <code>/search?q=kohli</code> disallowed hai, lekin <code>/search/about</code> allowed, kyunki Allow wala rule lamba hai. (2) xyzbot ke liye <code>/admin/users</code> bhi allowed hai: RFC 9309 ke hisaab se crawler sirf apne naam wala group maanta hai, "*" wala nahi. Site owner ko xyzbot ke group mein bhi /admin/ likhna chahiye tha. (3) 404 = sab allowed, 503 = sab disallowed.` },
      { type: 'callout', tone: 'warn', title: 'Crawl-delay standard ka hissa nahi', html: `Kai robots.txt files mein <code>Crawl-delay: 10</code> likha milta hai. RFC 9309 ise define nahi karta. Google ki docs saaf kehti hain ki Google ise support nahi karta, jabki Common Crawl ka CCBot ise maanta hai aur 429 ya 5xx milne pe apne aap dheema bhi ho jaata hai. Matlab tumhara crawler apni politeness policy khud tay kare, aur server ke signals (429, 503, dheemi responses) pe back-off kare.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"robots.txt security hai." Nahi. Ye ek <em>request</em> hai jo achhe crawlers maante hain; bura bot ise ignore kar sakta hai. Private pages ko password/auth se bachao, robots.txt se nahi. Ulta, robots.txt mein <code>/secret-admin/</code> likhna duniya ko bata deta hai ki wo path exist karta hai.` },
      { type: 'p', html: `Mercator ne robots rules ka ek fixed-size LRU cache rakha tha (host → rules, default 2<sup>18</sup> entries), taaki har page pe robots.txt dobara na laana pade. Aaj ke crawler mein bhi yahi: robots rules ek cache mein, aur back queue banate waqt hi check, taaki disallowed URL frontier mein jagah hi na ghere.` },

      { type: 'h2', text: 'Deep dive 3: duplicates, URL ke aur content ke' },
      { type: 'h3', text: 'Same URL, alag spelling: normalization' },
      { type: 'p', html: `<code>HTTP://News.Example.in:80/a/../cricket#top</code> aur <code>http://news.example.in/cricket</code> ek hi page hain. Seen-test se pehle URL ko ek <strong>canonical</strong> roop mein badlo: scheme aur host lowercase, default port hatao, <code>..</code> resolve karo, #fragment hatao, aur jaane-pehchaane tracking params (<code>utm_*</code>) hatao. Mercator ne host names ko DNS ke CNAME se bhi canonical banaya, taaki ek server ke do naam do alag hosts na ginen.` },
      { type: 'callout', tone: 'term', title: 'Naya word: canonical URL', html: `<strong>Ye kya hai:</strong> ek page ke saare alag likhe hue URLs ka ek "asli", standard roop.<br><strong>Kyun chahiye:</strong> URL-seen test sirf exact text match karta hai. "News.Example.in" aur "news.example.in" use alag lagenge.<br><strong>Iske bina:</strong> ek hi page kai baar download, aur traps (har visit pe naya session ID) mein phasna aasaan.` },
      { type: 'p', html: `Khud try karo. Examples dabao ya apna URL likho:` },
      { type: 'custom', render(el) {
        // URL normalizer: har step alag dikhata hai. Tracking params ki list chhoti rakhi hai.
        const TRACK = /^(utm_.*|sid|sessionid|fbclid|gclid)$/i;
        const PRE = ['HTTP://News.Example.in:80/a/../cricket#top', 'https://news.example.in/cricket/final?utm_source=wa&id=7&sid=a8f3', 'https://NEWS.example.in:443/./video/9/?b=2&a=1'];
        const norm = raw => {
          const m = raw.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/);
          if (!m) return null;
          const steps = [];
          let [, sc, host, path, qs, frag] = m;
          if (sc !== sc.toLowerCase() || host !== host.toLowerCase()) steps.push('scheme aur host lowercase');
          sc = sc.toLowerCase(); host = host.toLowerCase();
          if ((sc === 'http' && /:80$/.test(host)) || (sc === 'https' && /:443$/.test(host))) { host = host.replace(/:\d+$/, ''); steps.push('default port hataya'); }
          const out = [];
          (path || '/').split('/').forEach((s, i, a) => { if (s === '..') out.pop(); else if (s !== '.' && (s !== '' || i === 0 || i === a.length - 1)) out.push(s); });
          let np = out.join('/'); if (!np.startsWith('/')) np = '/' + np;
          if (np !== (path || '/')) steps.push('"." aur ".." resolve kiye');
          let params = qs ? qs.slice(1).split('&').filter(Boolean) : [];
          const kept = params.filter(p => !TRACK.test(p.split('=')[0]));
          if (kept.length !== params.length) steps.push('tracking/session params hataye');
          const sorted = kept.slice().sort();
          if (sorted.join('&') !== kept.join('&')) steps.push('params ko sort kiya');
          if (frag) steps.push('#fragment hataya (server tak jaata hi nahi)');
          return { url: `${sc}://${host}${np}${sorted.length ? '?' + sorted.join('&') : ''}`, steps };
        };
        el.innerHTML = `<label>URL jaisa page pe mila</label><input class="cr-u-in" type="text" style="width:100%;font-family:var(--f-mono)">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${PRE.map((p, i) => `<button type="button" class="btn small ghost" data-i="${i}">Example ${i + 1}</button>`).join('')}</div>
          <div class="stats"><div class="stat"><span>Canonical URL</span><strong class="cr-u-out" style="font:600 14px var(--f-mono);overflow-wrap:anywhere"></strong></div></div>
          <div class="calc-note cr-u-st"></div>`;
        const q = c => el.querySelector(c);
        const upd = () => { const r = norm(q('.cr-u-in').value); q('.cr-u-out').textContent = r ? r.url : '(ye poora URL nahi lagta)'; q('.cr-u-st').textContent = r ? (r.steps.length ? 'Steps: ' + r.steps.join(' → ') : 'Pehle se canonical hai.') : ''; };
        el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { q('.cr-u-in').value = PRE[b.dataset.i]; upd(); }));
        q('.cr-u-in').addEventListener('input', upd); q('.cr-u-in').value = PRE[0]; upd();
      }},
      { type: 'h3', text: 'URL seen? Bloom filter' },
      { type: 'p', html: `Har naye link pe sawaal: "ye pehle frontier mein aaya?" Billions URLs ka exact set RAM mein nahi aata, aur har baar disk lookup bahut dheema. <a href="#/ds-for-scale">Bloom filter</a> lesson yaad karo: chhoti memory, "pakka nahi dekha" ya "shayad dekha". Maan lo 5 billion URLs aur 1% false positive: Bloom filter ko ~9.6 bits per URL chahiye, matlab ~6 GB. Exact set mein ek URL hi ~80 bytes ka hota.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Bloom filter', html: `<strong>Ye kya hai:</strong> bits ki ek line (shuru mein sab 0) aur k alag hash functions. URL add karna = uske k hash positions pe bit 1 karna. Check karna = un k positions ko dekhna: koi bhi 0 hai to URL <strong>pakka nahi</strong> aaya; sab 1 hain to <strong>shayad</strong> aaya (doosre URLs ne milke wahi bits 1 kar diye ho sakte hain).<br><strong>Kyun chahiye:</strong> billions URLs ka seen-test kuch GB memory mein, bina disk ke.<br><strong>Iske bina:</strong> ya sainkdon GB RAM, ya har link pe dheema disk lookup.<br><strong>Keemat:</strong> false positive: kabhi naya URL "shayad dekha" bolke chhoot jaata hai. Ulta galti (dekha hua URL "nahi dekha") kabhi nahi hoti.` },
      { type: 'p', html: `Neeche ek khilona Bloom filter hai: sirf 32 bits aur 3 hash functions (asli mein arabon bits). URLs ek ek karke add karo, phir list se URLs check karo. Neeche wala calculator asli size batata hai.` },
      { type: 'custom', render(el) {
        // Chhota Bloom filter: m = 32 bits, k = 3 hash functions (h32 alag seeds ke saath).
        const M = 32, SEEDS = [11, 23, 37], H = 'news.example.in';
        const ADD = ['/', '/cricket', '/cricket/live', '/about', '/video/9', '/news/1', '/news/2', '/search'];
        const CHECK = ['/cricket', '/about', '/cricket/final', '/contact', '/news/3', '/live', '/video/11'];
        const pos = u => SEEDS.map(s => h32(H + u, s) % M);
        let bits, added, last;
        el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
            <button type="button" class="btn small primary cr-b-add"></button>
            <select class="cr-b-sel" aria-label="URL check">${CHECK.map(u => `<option value="${u}">${H}${u}</option>`).join('')}</select>
            <button type="button" class="btn small cr-b-chk">Check karo</button>
            <button type="button" class="btn small ghost cr-b-rst">Reset</button>
          </div>
          <div class="cr-b-grid" style="display:grid;grid-template-columns:repeat(16,1fr);gap:3px;max-width:520px"></div>
          <div class="cr-b-added" style="font:12px/1.6 var(--f-mono);color:var(--ink-2);margin-top:8px;overflow-wrap:anywhere"></div>
          <div class="calc-note cr-b-res"></div>
          <div class="row2" style="margin-top:12px">
            <div><label>Kitne URLs (billions)</label><input class="cr-b-n" type="number" value="5" min="0.1" step="0.5"></div>
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
          q('.cr-b-add').textContent = added < ADD.length ? `Agla URL add karo (${added}/${ADD.length})` : 'Saare add ho gaye';
          q('.cr-b-added').textContent = added ? 'Added: ' + ADD.slice(0, added).join('  ') : 'Abhi filter khaali hai: saare 32 bits 0.';
        };
        const reset = () => { bits = new Array(M).fill(0); added = 0; last = null; q('.cr-b-res').textContent = 'URLs add karo, phir koi URL check karo. Peela = abhi wale URL ke 3 bit positions.'; draw(); };
        q('.cr-b-add').onclick = () => { if (added >= ADD.length) return; const u = ADD[added++], p = pos(u); p.forEach(i => { bits[i] = 1; }); last = p; q('.cr-b-res').textContent = `${u} → bits ${p.join(', ')} ko 1 kiya.`; draw(); };
        q('.cr-b-chk').onclick = () => {
          const u = q('.cr-b-sel').value, p = pos(u), all = p.every(i => bits[i]), real = ADD.slice(0, added).includes(u); last = p; draw();
          q('.cr-b-res').textContent = `${u} → bits ${p.join(', ')}: ` + (!all ? 'koi bit 0 hai, to PAKKA NAHI DEKHA. Frontier mein daalo.' : real ? 'saare 1 hain: SHAYAD DEKHA (aur sach mein dekha tha). Drop.' : 'saare 1 hain: SHAYAD DEKHA, lekin ye URL kabhi add nahi hua! Ye false positive hai: ye naya page crawl nahi hoga.');
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
      { type: 'p', html: `Kya dikhna chahiye: saare 8 URLs add karne ke baad 32 mein se 17 bits 1 ho jaate hain. <code>/cricket/final</code>, <code>/contact</code>, <code>/news/3</code> ko filter sahi bolta hai "pakka nahi dekha". Lekin <code>/live</code> (4 URLs add hone ke baad) aur <code>/video/11</code> (5 ke baad) ke teeno bits pehle se 1 hain, jabki ye kabhi add nahi hue: false positive. Itne chhote filter mein ye aam hai; asli filter mein bits zyada rakh ke rate 1% ya kam karte hain. Calculator: 5 billion URLs, 1% → ~9.6 bits per URL, k = 7, ~6 GB.` },
      { type: 'p', html: `Mercator ne 1999 mein Bloom filter ki jagah ek alag trick lagaayi: har URL ka 64-bit fingerprint, ek chhota in-memory cache + disk pe sorted file. Aur ek smart detail: fingerprint ke upar wale bits host ke hash se bane, taaki ek hi site ke URLs disk pe paas paas rahein aur ek disk read se kaam chal jaaye. Unki crawl mein memory caches ne ~75% lookups ko disk tak jaane hi nahi diya.` },
      { type: 'h3', text: 'Content seen? Exact aur near-duplicate' },
      { type: 'p', html: `URL alag, content same: mirrors, AMP versions, print versions, session-ID wale URLs. Exact copy pakadna aasaan hai: poore page ka ek fingerprint (hash), aur fingerprints ka set. Mercator ne yahi kiya, aur unki 8 din ki crawl mein 8.5% documents exact duplicates nikle.` },
      { type: 'p', html: `Lekin web pe zyadatar duplicates <em>exact</em> nahi hote: wahi article, bas "Views: 10,231" ki jagah "Views: 10,245", ya alag ad, ya naya timestamp. Ek character badla aur normal hash poora badal jaata hai. Humein aisa fingerprint chahiye jo <strong>milte-julte pages ke liye milta-julta</strong> ho.` },
      { type: 'callout', tone: 'term', title: 'Naya word: SimHash', html: `<strong>Ye kya hai:</strong> aisa fingerprint jo milte-julte pages ko milta-julta (lagbhag same bits wala) number deta hai<br><strong>Kyun chahiye:</strong> web ke zyadatar duplicates exact nahi hote.<br><strong>Iske bina:</strong> sirf timestamp alag hone se har copy "naya page" ginti.<br><strong>Andar kaise:</strong> Moses Charikar ki technique jise Google ke Manku, Jain aur Das Sarma ne 2007 ke paper "Detecting Near-Duplicates for Web Crawling" mein crawler ke liye use kiya. Tareeka: page ke har word (feature) ka 64-bit hash lo. 64 counters rakho. Har word ke hash mein bit i = 1 ho to counter i mein word ka weight jodo, 0 ho to ghatao. Aakhir mein har counter positive to bit 1, warna 0. Thode words badalne se thode hi counters ka sign palat-ta hai, to fingerprint ke thode hi bits badalte hain.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Hamming distance', html: `<strong>Ye kya hai:</strong> do bit-strings mein kitni positions pe bits alag hain. <code>1011</code> aur <code>1001</code> ka distance 1. Paper mein 8 billion pages ke liye niyam tha: 64-bit SimHash mein <strong>3 ya kam bits</strong> ka farak = near-duplicate.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Page 1 (original)</label><textarea class="cr-s-a" rows="6" style="width:100%;font:13px/1.5 var(--f-body)"></textarea></div>
            <div><label>Page 2 (edit karke dekho)</label><textarea class="cr-s-b" rows="6" style="width:100%;font:13px/1.5 var(--f-body)"></textarea></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
            <button type="button" class="btn small ghost cr-s-p1">Near-duplicate (views + time badle)</button>
            <button type="button" class="btn small ghost cr-s-p2">Bilkul alag page</button>
            <button type="button" class="btn small ghost cr-s-p3">Exact copy</button>
          </div>
          <div class="cr-s-bits" style="font:12px/1.6 var(--f-mono);overflow-wrap:anywhere"></div>
          <div class="stats">
            <div class="stat"><span>Exact hash same?</span><strong class="cr-s-e"></strong></div>
            <div class="stat"><span>SimHash Hamming distance</span><strong class="cr-s-h"></strong></div>
            <div class="stat"><span>Faisla (k = 3)</span><strong class="cr-s-v"></strong></div>
          </div>
          <div class="calc-note">Har word ek feature, weight = page mein kitni baar aaya. Real systems shingles (lagaataar words ke tukde) aur behtar weights use karte hain; idea wahi hai.</div>`;
        const q = c => el.querySelector(c);
        const bitRow = (bits, other) => bits.map((b, i) => other && b !== other[i] ? `<span style="background:var(--amber);color:var(--bg);border-radius:2px">${b}</span>` : b).join('');
        const upd = () => {
          const ta = q('.cr-s-a').value, tb = q('.cr-s-b').value;
          const A = simhash(ta), B = simhash(tb), d = hamming(A, B), ex = exactFp(ta) === exactFp(tb);
          q('.cr-s-bits').innerHTML = `<div>P1: ${bitRow(A)}</div><div>P2: ${bitRow(B, A)}</div>`;
          q('.cr-s-e').textContent = ex ? 'haan' : 'nahi';
          q('.cr-s-h').textContent = d + ' / 64 bits';
          q('.cr-s-v').textContent = ex ? 'exact duplicate' : d <= 3 ? 'near-duplicate' : 'alag page';
        };
        const setB = t => { q('.cr-s-b').value = t; upd(); };
        q('.cr-s-a').value = SH_DOCS.a; q('.cr-s-b').value = SH_DOCS.b;
        q('.cr-s-p1').onclick = () => setB(SH_DOCS.b);
        q('.cr-s-p2').onclick = () => setB(SH_DOCS.c);
        q('.cr-s-p3').onclick = () => setB(q('.cr-s-a').value);
        q('.cr-s-a').addEventListener('input', upd); q('.cr-s-b').addEventListener('input', upd);
        upd();
      }},
      { type: 'p', html: `Default pages mein sirf view count aur time badla hai: exact hash bilkul alag, lekin SimHash mein sirf <strong>2 bits</strong> ka farak, to near-duplicate. "Bilkul alag page" dabao: 19 bits alag. Page 2 mein ek-do words badal ke dekho, distance thoda hi badhta hai.` },
      { type: 'p', html: `Asli mushkil: billions fingerprints mein "kaunse 3 bits ke andar hain" kaise dhoondhein? Paper ki trick: fingerprints ki kai copies, har copy mein bits ko alag tarah permute karke sort karo. Agar do fingerprints max 3 bits alag hain, to kisi na kisi permutation mein unke shuru ke kai bits bilkul same honge, to sorted table mein ek chhota range dekhna kaafi hai. Interview mein itna kehna kaafi hai: "SimHash + permuted sorted tables, k = 3 on 64 bits".` },
      { type: 'h2', text: 'Deep dive 4: crawler traps' },
      { type: 'p', html: `Mercator paper ki definition: crawler trap ek URL (ya URLs ka set) jo crawler ko hamesha ke liye crawl karwata rahe. Kuch galti se bante hain, kuch jaan boojh ke (spammers ko pakadne ke liye, ya search ranking ke saath khilwaad ke liye).` },
      { type: 'callout', tone: 'term', title: 'Naya word: crawler trap', html: `<strong>Ye kya hai:</strong> URLs ka aisa jaal jo kabhi khatam nahi hota, jaise calendar jisme "agla mahina" ka link hamesha hota hai.<br><strong>Kyun samajhna zaroori:</strong> BFS ko lagta hai har naya URL naya page hai, to wo isme hamesha ghoomta rahega.<br><strong>Iske bina (bachav ke bina):</strong> ek hi site poora crawl budget (time, bandwidth, storage) kha jaayegi, aur baaki web chhoot jaayega.` },
      { type: 'table', head: ['Trap', 'Kaisa dikhta hai', 'Bachav'], rows: [
        ['Infinite calendar', '<code>/calendar?month=2026-11</code> → "agla mahina" → 2026-12 → ... hamesha', 'Per-host page budget; ek path pattern ke bahut saare variations pe rok'],
        ['Session IDs URL mein', 'Har visit pe naya <code>?sid=a8f3...</code>, same page', 'Normalization mein jaane-pehchaane session params hatao; content fingerprint duplicates pakad leta hai'],
        ['Gehre nakli paths', '<code>/a/b/a/b/a/b/...</code> (relative link ki galti)', 'Max URL length, max path depth, repeat hote segments pe filter'],
        ['Auto-generated pages', 'Lakhon kam-value pages, sab ek doosre se linked', 'Host ki quality/priority neeche; per-host budget'],
      ]},
      { type: 'p', html: `Mercator team ne imaandari se likha tha ki unhe traps se bachne ki koi automatic technique nahi pata; trap wali sites bahut zyada documents ki wajah se nazar aa jaati hain, aur ek insaan URL filter mein us site ko block kar deta hai. Aaj bhi asli tareeka wahi hai: <strong>per-host limits + monitoring + manual block list</strong>. Koi ek trick sab nahi pakadti.` },

      { type: 'h2', text: 'Deep dive 5: recrawl, page kab dobara laayein?' },
      { type: 'p', html: `Crawl ek baar ka kaam nahi. News homepage har kuch minute badalta hai; kisi ki 2009 ki blog post shayad kabhi nahi. Sab pages ko roz laana bandwidth ki barbaadi, aur sab ko mahine mein ek baar laana matlab news hamesha purani.` },
      { type: 'callout', tone: 'term', title: 'Naye words: freshness, recrawl, conditional GET', html: `<strong>Ye kya hai:</strong> <strong>Freshness</strong> = hamari stored copy kitne time tak asli page jaisi hai. <strong>Recrawl</strong> = page ko dobara laana taaki copy taaza ho. <strong>Conditional GET</strong> = server se poochhna "pichhli baar ke baad badla kya?"; nahi badla to server sirf <code>304 Not Modified</code> bhejta hai, poora page nahi.<br><strong>Kyun chahiye:</strong> search results purane pages pe based hon to user ko galat jawab milta hai.<br><strong>Iske bina:</strong> ya purani copies, ya har page roz download karke bandwidth ka bura haal.` },
      { type: 'list', items: [
        '<strong>Change rate se priority:</strong> IR textbook ke Mercator-style frontier mein prioritizer page ki fetch history dekhta hai: jo page pichhli crawls ke beech zyada badla, use upar wali front queue. News sites jaise kuch hosts ko seedha high priority.',
        '<strong>Sasta "badla kya?" check:</strong> HTTP conditional request (<code>If-Modified-Since</code> ya <code>If-None-Match</code> ETag ke saath). Page nahi badla to server <code>304 Not Modified</code> bhejta hai, body nahi. Bandwidth bachi.',
        '<strong>Sitemaps:</strong> robots.txt mein diya sitemap URL batata hai site ke pages aur unka last-modified time.',
        '<strong>Ek ulta lagne wala sach:</strong> Cho aur Garcia-Molina ke research (2003) mein paaya gaya ki average freshness ke hisaab se "sabko barabar baar crawl karo" policy ne "jo jitna badle utna crawl karo" wali proportional policy ko hara diya. Wajah: bahut tez badalne wale page ko kitna bhi laao, wo fresh nahi rehta, aur unpe kharch kiya effort doosre pages se chhin jaata hai.',
      ]},
      { type: 'p', html: `Is ulte sach ko khud mehsoos karo. Do pages, ek din mein 10 crawls ka budget. Page A (news homepage) din mein 9 baar badalta hai, page B (article) 1 baar. Model wahi jo Cho aur Garcia-Molina ne use kiya: page randomly badalta hai, aur hum use barabar gap pe crawl karte hain.` },
      { type: 'custom', render(el) {
        // Freshness (Cho aur Garcia-Molina ka model): page Poisson rate λ se badalta hai, har 1/f din pe crawl.
        // Average freshness = (1 - e^(-λ/f)) × f / λ
        const F = (l, f) => f <= 0 ? 0 : (1 - Math.exp(-l / f)) * f / l;
        el.innerHTML = `<div class="row2">
            <div><label>Page A (news homepage) din mein kitni baar badalta: <b class="cr-fr-av"></b></label><input class="cr-fr-a" type="range" min="1" max="20" step="1" value="9"></div>
            <div><label>Page B (article) din mein kitni baar badalta: <b class="cr-fr-bv"></b></label><input class="cr-fr-b" type="range" min="1" max="5" step="1" value="1"></div>
            <div><label>Crawl budget (dono ke liye, per din): <b class="cr-fr-nv"></b></label><input class="cr-fr-n" type="range" min="2" max="30" step="1" value="10"></div>
            <div><label>Tumhara split, A ko: <b class="cr-fr-sv"></b> crawls</label><input class="cr-fr-s" type="range" min="1" max="9" step="1" value="5"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Barabar (uniform)</span><strong class="cr-fr-u"></strong></div>
            <div class="stat"><span>Badlaav ke hisaab se (proportional)</span><strong class="cr-fr-p"></strong></div>
            <div class="stat"><span>Tumhara split</span><strong class="cr-fr-y"></strong></div>
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
          q('.cr-fr-note').textContent = `Freshness = din ke kitne hisse mein hamari copy asli page jaisi hai (dono pages ka average). Proportional policy A ko ${pa.toFixed(1)} crawls deti hai, phir bhi A zyadatar purana hi rehta hai; best split A ko ${best} deta hai aur bache crawls B ko, jo unse sach mein fresh rehta hai.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Default pe: barabar (5 + 5) = 68.5% freshness, badlaav ke hisaab se (9 + 1) = 63.2%, yaani "zyada badalne wale ko zyada" wali policy haar gayi. Best split A ko 7 aur B ko 3 deta hai: 70.7%. Page A ko 20 baar badalne wala karo: proportional 41.8% pe gir jaata hai, best phir bhi A ko sirf 7 deta hai. Sabak: jo page itni tezi se badalta hai ki pakad mein hi na aaye, us pe extra crawls barbaad hain.` },

      { type: 'h2', text: 'Step 4: bahut saari machines pe crawler' },
      { type: 'p', html: `Napkin maths ne ~17 fetcher machines bataayi. Sawaal: URL kis machine pe jaaye? Agar random bhejo, to ek host ke URLs 17 machines pe bikhar jaayenge aur politeness (ek host pe ek connection) ke liye machines ko aapas mein coordinate karna padega. Simple jawab: <strong>host ke hash se machine chuno</strong>. Ek host ki poori back queue, robots cache aur DNS cache ek hi machine pe. Politeness local ho gayi.` },
      { type: 'callout', tone: 'term', title: 'Naye words: partition by host, consistent hashing, checkpoint', html: `<strong>Ye kya hai:</strong> <strong>Partition by host</strong> = hash(host name) se tay karna ki kaunsi machine us host ki maalik hai. <strong>Consistent hashing</strong> = aisa hashing tareeka jisme machine add/remove hone pe sirf thode hosts ki machine badalti hai (<a href="#/consistent-hashing">Consistent hashing</a> lesson). <strong>Checkpoint</strong> = har kuch minute frontier aur seen-sets ki copy disk/object storage pe save karna.<br><strong>Kyun chahiye:</strong> politeness bina machines ke beech baat-cheet ke; aur crash ke baad wahin se shuru.<br><strong>Iske bina:</strong> ek host ke URLs kai machines pe, sab ek saath us site pe; aur crash pe saara frontier gayab.` },
      { type: 'flow', title: 'Distributed crawler: host se partition', height: 340,
        nodes: [
          { id: 'lx', label: 'Link extractor', sub: 'kisi bhi node pe', x: 82, y: 170, w: 136, kind: 'server', info: 'Kisi bhi machine pe nikla naya URL. Use ab sahi machine tak pahunchana hai.' },
          { id: 'rt', label: 'Host router', sub: 'hash(host)', x: 262, y: 170, w: 124, kind: 'net', info: 'hash(hostname) se machine chunta hai. Consistent hashing use karo, taaki machine add/remove hone pe sirf thode hosts idhar-udhar hon (<a href="#/consistent-hashing">Consistent hashing</a> lesson). Ek host hamesha ek hi machine pe.' },
          { id: 'n1', label: 'Crawler node 1', sub: 'frontier + fetch', x: 462, y: 60, w: 140, kind: 'server', info: 'Apne hosts ka frontier (front + back queues), robots cache, DNS cache, URL-seen ka apna hissa. Frontier ko samay samay pe disk/object storage pe checkpoint karta hai.' },
          { id: 'n2', label: 'Crawler node 2', sub: 'frontier + fetch', x: 462, y: 170, w: 140, kind: 'server', info: 'Same kaam, alag hosts. news.example.in isi node ke paas hai.' },
          { id: 'n3', label: 'Crawler node 3', sub: 'frontier + fetch', x: 462, y: 280, w: 140, kind: 'server', info: 'Node 1 jaisa hi kaam (apna frontier, fetchers, DNS cache), bas hash(host) ke hisaab se alag hosts iske hisse aate hain. Is node pe mila koi link agar kisi aur node ke host ka ho, to wo URL us node ko bhej diya jaata hai. Node mare to uske hosts checkpoint se kisi aur node pe chale jaate hain.' },
          { id: 'st', label: 'Page store', sub: 'S3 / WARC', x: 648, y: 170, w: 120, kind: 'data', info: 'Saare nodes apne downloaded pages yahin likhte hain. Object storage mein bade files (WARC) achhe se fit hote hain; indexer yahin se padhta hai.' },
        ],
        edges: [{ a: 'lx', b: 'rt' }, { a: 'rt', b: 'n1' }, { a: 'rt', b: 'n2' }, { a: 'rt', b: 'n3' }, { a: 'n1', b: 'st' }, { a: 'n2', b: 'st' }, { a: 'n3', b: 'st' }],
        scenarios: [
          { name: 'URL sahi node pe', steps: [
            { title: 'Naya URL', text: 'Node 1 pe parse hue page mein news.example.in ka link mila.', go: 'lx>rt', msg: 'https://news.example.in/cricket/live' },
            { title: 'Host ka hash', text: 'hash("news.example.in") → node 2. Is host ke saare URLs hamesha node 2 pe jaate hain.', go: 'rt>n2', after: { n2: { state: 'ok', sub: 'news.example.in queue' } }, msg: 'hash(news.example.in) mod ring → node 2' },
            { title: 'Local politeness', text: 'Node 2 apni back queue aur heap se tay karta hai kab fetch karna hai. Kisi aur machine se poochhna nahi padta. Download hua page store mein.', go: 'n2>st' },
          ]},
          { name: 'Node crash', steps: [
            { title: 'Node 3 gir gaya', text: 'Uske hosts ka frontier memory mein tha.', set: { n3: { state: 'down', sub: 'DOWN' } }, focus: ['n3'] },
            { title: 'Checkpoint se wapas', text: 'Mercator ki tarah frontier aur seen-sets ka periodic checkpoint tha. Consistent hashing ne node 3 ke hosts baaki nodes mein baante, aur unhone checkpoint se uske queues load kiye. Kuch minute ka kaam dobara hoga (kuch pages do baar), lekin crawl ruka nahi.', parallel: true, go: ['rt>n1', 'rt>n2'], after: { n1: { state: 'warn', sub: '+ node 3 hosts' }, n2: { state: 'warn', sub: '+ node 3 hosts' } } },
          ]},
          { name: 'Ek host bahut bada', steps: [
            { title: 'Giant site', text: 'Ek bahut badi site ke crores URLs. Politeness ki wajah se us host pe ek waqt ek hi request, to ye host "lambi line" hai, theek simulator ke host A jaisa.', go: ['lx>rt', 'rt>n1'], after: { n1: { state: 'hot', sub: 'giant host' } } },
            { title: 'Phir bhi node 1 khaali nahi', text: 'Node 1 ke paas hazaaron aur hosts bhi hain; uske fetchers unhe chalate rehte hain. Badi sites ke saath aksar alag samjhauta hota hai (unki permission se zyada rate, ya unke sitemaps/feeds se).', go: 'n1>st' },
          ]},
        ],
      },
      { type: 'h2', text: 'Kya kya toot sakta hai' },
      { type: 'table', head: ['Failure', 'Kya hota hai', 'Bachav'], rows: [
        ['Dheema / latka hua server', 'Fetcher thread hamesha ke liye atak jaaye', 'Connect + read timeouts (Mercator: 1 minute), async I/O, max page size'],
        ['Site 429 / 503 bhej rahi', 'Hum use aur thaka rahe hain', 'Back-off: us host ka delay badhao (CCBot yahi karta hai)'],
        ['DNS dheema', 'Fetchers khaali baithe (Mercator: 87% time)', 'Async resolver, DNS cache, aage ke hosts ka prefetch'],
        ['Crawler trap', 'Ek site crawl budget kha jaaye', 'Per-host budget, URL length/depth limits, manual block list'],
        ['Crawler node crash', 'Uske hosts ka frontier gaya', 'Checkpoints + consistent hashing se hosts dobara baanto'],
        ['Bloom filter false positive', 'Kuch naye URLs kabhi crawl nahi', 'FP rate chhota rakho (size badhao); zaroori sites ke sitemaps se URLs seedhe lo'],
        ['Malicious content', 'Bahut bada page, galat HTML, parser crash', 'Size limits, tolerant parser, parsing ko alag process/sandbox mein'],
      ]},

      { type: 'h2', text: 'Interview mein kaise bolein' },
      { type: 'steps', items: [
        { t: 'Requirements + numbers', d: 'Billions pages, ~2k pages/sec, ~2-3 Gbps, sainkdon TB object storage mein. Politeness aur robustness sabse upar.' },
        { t: 'Main loop', d: 'Frontier → DNS (cached) → robots check → fetch → store → content-seen → link extract + normalize → URL-seen (Bloom) → frontier.' },
        { t: 'Frontier', d: 'Front queues = priority, back queues = ek host per queue, heap = agla allowed time (~10× pichhla fetch time). Threads se kai guna back queues.' },
        { t: 'Dedupe', d: 'URL normalization + Bloom filter; exact fingerprint + SimHash (64-bit, k = 3) for near-duplicates.' },
        { t: 'Scale + failures', d: 'Hash(host) se partition taaki politeness local rahe; checkpoints; traps ke liye budgets; recrawl conditional GET se.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `"Is cheez ko pehle dekha hai kya?" ka sawaal jab <strong>billions items</strong> pe aur har second hazaaron baar ho, aur kabhi kabhi galat "haan" chal jaaye (ek page miss), to <strong>Bloom filter</strong> lo. Galat "haan" bilkul nahi chal sakta (payments, unique usernames ka final check) to Bloom sirf pehla filter rahe, asli jawab exact store se. Aur jab "same" ka matlab "lagbhag same" ho, to normal hash nahi, <strong>SimHash</strong> jaisa similarity-preserving fingerprint.` },

      { type: 'diagram', title: 'Poora design, ek nazar mein', height: 480,
        caption: 'Ek loop: frontier se URL → fetch (DNS, robots ke saath) → duplicate checks → naye links wapas frontier mein. Recrawl planner purane pages ko dobara line mein lagata hai. Upar ke buttons se ek-ek raasta dekho.',
        groups: [
          { label: 'Frontier', x: 196, y: 18, w: 338, h: 96 },
          { label: 'Duplicate checks', x: 14, y: 258, w: 520, h: 94 },
        ],
        nodes: [
          { id: 'seeds', label: 'Seed URLs', sub: 'shuruaati list', x: 90, y: 70, kind: 'client', info: 'Ye kya hai: crawl shuru karne ke liye pehle se di gayi URLs ki list (bade, bharosemand sites, sitemaps). Yahin se pehle links milte hain.' },
          { id: 'prio', label: 'Prioritizer', sub: 'front queues', x: 270, y: 70, kind: 'queue', info: 'Ye kya hai: frontier ka pehla hissa. Har URL ko priority deta hai (site kitni zaroori, page kitni baar badalta hai) aur priority wali front queue mein daalta hai.' },
          { id: 'back', label: 'Back queues', sub: '1 host/queue + heap', x: 450, y: 70, kind: 'queue', info: 'Ye kya hai: har queue mein sirf ek host ke URLs, aur heap mein har host ka "agla allowed time" (~10× pichhla fetch time). Politeness yahin pakki hoti hai.' },
          { id: 'dns', label: 'DNS cache', sub: 'host → IP', x: 630, y: 70, kind: 'cache', info: 'Ye kya hai: host name → IP ke jawabon ki copy, async resolver ke saath. Mercator mein DNS fetch thread ka 87% time kha raha tha; cache + parallel lookups se 25%.' },
          { id: 'sched', label: 'Recrawl planner', sub: 'change history', x: 90, y: 190, kind: 'server', info: 'Ye kya hai: kaunsa purana page kab dobara laana hai, ye tay karne wala hissa. Page kitni baar badla (fingerprint compare se) dekhta hai, aur conditional GET se sasta check karwata hai.' },
          { id: 'router', label: 'Host router', sub: 'hash(host)', x: 270, y: 190, kind: 'net', info: 'Ye kya hai: naya URL kis crawler machine (aur kis back queue) ka hai, ye hash(host) se tay karta hai. Consistent hashing se machines add/remove hone pe kam hosts hilte hain.' },
          { id: 'robots', label: 'robots.txt cache', sub: 'host ke niyam', x: 450, y: 190, kind: 'cache', info: 'Ye kya hai: har host ki robots.txt ke rules ki copy (24 ghante tak). Fetch se pehle path allowed hai ya nahi, yahin se. 503 = sab disallowed, 404 = sab allowed.' },
          { id: 'fetch', label: 'Fetchers', sub: 'HTTP, timeouts', x: 630, y: 190, kind: 'server', info: 'Ye kya hai: pages download karne wale threads/machines. Timeouts, max page size, aur 429/503 pe us host ka delay badhana (back-off).' },
          { id: 'us', label: 'URL seen?', sub: 'Bloom filter', x: 90, y: 310, kind: 'cache', info: 'Ye kya hai: "ye URL pehle aaya?" ka test, bits ki line mein. 5 billion URLs, 1% false positive ≈ 6 GB. Shayad dekha → drop.' },
          { id: 'lx', label: 'Link extractor', sub: 'parse + normalize', x: 270, y: 310, kind: 'server', info: 'Ye kya hai: HTML se links nikaal ke canonical URL banata hai (lowercase, port, .., #fragment, utm_* hatao), aur traps ke filters (max length/depth, per-host budget) lagata hai.' },
          { id: 'cs', label: 'Content seen?', sub: 'hash + SimHash', x: 450, y: 310, kind: 'cache', info: 'Ye kya hai: content ka duplicate test. Exact copy ke liye 64-bit fingerprint, near-duplicate ke liye SimHash (64 bits mein ≤ 3 ka farak). Duplicate ho to links nahi nikaalte.' },
          { id: 'web', label: 'Websites', sub: 'bahar ke servers', x: 630, y: 310, kind: 'net', info: 'Ye kya hai: arabon pages wale lakhon servers. Hamare control mein nahi: dheeme, down, traps, galat HTML. Isliye politeness aur timeouts.' },
          { id: 'store', label: 'Page store', sub: 'WARC on S3', x: 450, y: 430, kind: 'data', info: 'Ye kya hai: naye pages object storage mein badi WARC files mein. Common Crawl yahi format use karta hai. Sainkdon TB.' },
          { id: 'index', label: 'Indexer', sub: 'search ke liye', x: 630, y: 430, kind: 'server', info: 'Ye kya hai: crawler ka grahak. Page store se padh ke search index banata hai (Google Search lesson). Crawler ka kaam yahan khatam.' },
        ],
        edges: [
          { a: 'seeds', b: 'prio', n: 1 }, { a: 'prio', b: 'back', n: 2 }, { a: 'back', b: 'fetch', n: 3, label: 'agla URL' },
          { a: 'fetch', b: 'dns', dashed: true }, { a: 'fetch', b: 'robots', dashed: true },
          { a: 'fetch', b: 'web', both: true, label: 'HTTP GET' },
          { a: 'fetch', b: 'cs', n: 4 }, { a: 'cs', b: 'store', label: 'naya content' }, { a: 'store', b: 'index', kind: 'evt' },
          { a: 'cs', b: 'lx', n: 5 }, { a: 'lx', b: 'us', n: 6 }, { a: 'us', b: 'router', label: 'naye URLs' }, { a: 'router', b: 'prio' },
          { a: 'cs', b: 'sched', dashed: true, label: 'badla?' }, { a: 'sched', b: 'prio', kind: 'evt' },
        ],
        paths: [
          { name: 'Pick next URL', text: 'Seeds aur naye URLs prioritizer mein → front queue (priority) → back queue (ek host ki line) → heap batata hai kaunsa host abhi free hai → fetcher ko agla URL. DNS aur robots cache se.', go: ['seeds>prio>back>fetch', 'fetch>dns', 'fetch>robots'] },
          { name: 'Fetch + parse', text: 'Fetcher page laata hai → content check (naya) → store → indexer. Link extractor links nikaal ke normalize karta hai → Bloom filter → sirf naye URLs router se frontier mein.', go: ['back>fetch>web', 'fetch>cs>store>index', 'cs>lx>us>router>prio'] },
          { name: 'Duplicate found', text: 'Do jagah rokte hain: content seen (fingerprint/SimHash match) pe page store nahi aur links nahi; URL seen (Bloom "shayad dekha") pe URL frontier mein nahi jaata.', go: ['fetch>cs', 'lx>us'] },
          { name: 'Recrawl', text: 'Fingerprint compare se pata chala page kitni baar badalta hai → recrawl planner use sahi priority pe dobara frontier mein daalta hai → fetch conditional GET se (304 = nahi badla, bandwidth bachi).', go: ['cs>sched>prio>back>fetch>web'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Crawler = loop: frontier se URL → download → links nikaalo → naye links frontier mein. Web pe ye chaar jagah toot-ta hai: politeness, duplicates, traps, freshness.</li>
        <li>Frontier: front queues = priority, back queues = ek host per queue, heap = har host ka agla allowed time (~10× pichhla fetch time).</li>
        <li>robots.txt: apne naam wala group, sabse lamba match jeetta hai, 24 ghante cache, 404 = sab allowed, 503 = sab disallowed. Ye security nahi, request hai.</li>
        <li>DNS cache + async resolver, warna fetchers DNS ka intezaar karte rehte (Mercator: 87%).</li>
        <li>URL dedupe: normalize karo, phir Bloom filter (~9.6 bits per URL pe 1% false positive).</li>
        <li>Content dedupe: exact fingerprint + SimHash (64 bits, ≤ 3 bits ka farak = near-duplicate).</li>
        <li>Traps: per-host budget, URL length/depth limits, monitoring + manual block list.</li>
        <li>Recrawl: conditional GET, sitemaps; bahut tez badalne wale page pe extra crawls barbaad (Cho aur Garcia-Molina).</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Per-host back queues: koi site overload nahi, crawler block nahi hota', 'Bloom filter: billions URLs ka seen-test kuch GB mein', 'SimHash: timestamp/ad wale near-duplicates bhi pakde jaate hain', 'Host-hash partitioning: politeness bina machines ke beech coordination ke', 'Checkpoints: crash ke baad crawl wahin se'],
        costs: ['Politeness se crawl dheema; bade hosts "lambi line" bante hain', 'Bloom false positives: kuch naye pages kabhi nahi aate', 'SimHash k = 3 pe kuch galat match aur kuch miss (paper mein precision aur recall dono ~0.75 ke aas paas)', 'Traps ke liye ab bhi insaan aur manual block list chahiye', 'Recrawl policy ek samjhauta: bandwidth vs freshness'],
      },

      { type: 'think', questions: [
        { q: 'Tumhare crawler mein 100 fetcher threads hain lekin frontier mein abhi sirf 10 hosts ke URLs hain. Kya hoga, aur kya karoge?', a: 'Politeness ki wajah se ek host pe ek hi request, to max 10 threads busy, 90 khaali (simulator ka host A wala effect). Frontier mein aur hosts laao: seed list badi karo, priority mein naye hosts ke URLs ko thoda boost do, aur back queues threads se kai guna rakho (Mercator designers ka ~3× rule).' },
        { q: 'Ek news site ka homepage roz 100 baar badalta hai. Kya use har minute crawl karna chahiye?', a: 'Zaroori nahi. Cho aur Garcia-Molina ka result yaad karo: bahut tez badalne wale page pe zyada effort average freshness nahi badhata. Sasta tareeka: conditional GET (304 pe bandwidth nahi), RSS/sitemap se naye article URLs lo, aur homepage ki jagah naye article pages ko priority do jo ek baar ban ke kam badalte hain.' },
        { q: 'Bloom filter ki jagah exact hash set (Redis jaisa) kyun nahi?', a: 'Billions URLs × ~80+ bytes = sainkdon GB, aur network hop har lookup pe. Bloom filter ~10 bits per URL (1% FP) mein local memory mein. Crawler ke liye kuch pages miss hona sasta hai. Agar exactness zaroori ho to Bloom ko pehle filter ki tarah rakho aur "shayad dekha" pe hi disk/exact store check karo.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Mercator-style frontier mein "back queues" kis kaam ke liye hain?', options: ['Page priority', 'Politeness: har back queue mein sirf ek host ke URLs', 'Duplicate URLs hatane ke liye'], answer: 1, explain: 'Front queues priority sambhalti hain, back queues politeness. Ek host = ek back queue, aur heap batata hai us host pe agla request kab allowed hai.' },
        { q: 'Ek site ka robots.txt 503 error de raha hai. RFC 9309 ke hisaab se crawler kya maane?', options: ['Sab allowed', 'Poori site disallowed (jab tak error chale)', 'Robots.txt ignore karo'], answer: 1, explain: '5xx ya unreachable = complete disallow maano. 4xx (jaise 404) = file nahi hai, to sab allowed. Bahut lambe outage (~30 din) ke baad niyam dheela ho sakta hai.' },
        { q: 'Do pages mein sirf "Views: 10,231" vs "Views: 10,245" ka farak hai. Kaunsa fingerprint unhe same batayega?', options: ['MD5 / normal hash', 'SimHash (chhoti Hamming distance)', 'URL ka hash'], answer: 1, explain: 'Normal hash ek character badalne pe poora badal jaata hai. SimHash milte-julte content ke liye milte-julte bits deta hai; 64 bits mein ≤ 3 ka farak = near-duplicate.' },
        { q: 'Distributed crawler mein URLs ko machines pe kis basis pe baantna sabse achha hai?', options: ['Random', 'URL ke poore hash se', 'Host name ke hash se'], answer: 2, explain: 'Host se baantne pe ek host ke saare URLs, uska robots cache aur politeness timer ek hi machine pe. Poore URL ke hash se ek host kai machines pe bikhar jaata aur politeness ke liye coordination chahiye hota.' },
      ]},
      { type: 'sources', note: 'Mercator paper 1999 ka hai aur SimHash paper 2007 ka; ideas aaj bhi standard hain, lekin aaj ke crawlers ke exact internals public nahi.', items: [
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
