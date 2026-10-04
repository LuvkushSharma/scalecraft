Lesson.register({
  id: 'cdn',
  title: 'CDN (Content Delivery Network)',
  minutes: 40,
  summary: `A CDN is a network of caching servers spread across the world. A user in Chennai gets an image from a server near Chennai, not from America. This gives speed, and it also takes load off your own servers.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `The xyz.com servers are in America. Every time a user in Chennai opens a photo, the request travels halfway around the world and back. Every single time.<br>Now imagine that <strong>copies</strong> of xyz.com's photos, videos and CSS were already kept in cities like Chennai, Delhi and Mumbai. The user gets the nearby copy: fast. And the server in America gets a rest.<br>That is a <strong>CDN</strong>: cache servers spread around the world. In this lesson we will see how it works, what to keep in it, how to remove an old copy, and how to protect a private video from being stolen.` },

    { type: 'h2', text: 'The problem: distance' },
    { type: 'p', html: `The xyz.com servers are in the US (Virginia). A user in Chennai asks for a 2 MB image. There are two problems: <strong>latency</strong> (how long the answer takes) and <strong>load</strong> (all the image/video traffic of crores of users lands on your servers and their internet bill).` },
    { type: 'callout', tone: 'term', title: 'Remember: round trip (RTT)', html: `<strong>What it is:</strong> a message going from the user to the server and the answer coming back. The time for this whole trip = <strong>RTT</strong> (round-trip time).<br><strong>Why it matters:</strong> even light travels only ~2 lakh km per second in a fiber cable, and nothing is faster. Chennai to Virginia is ~14,000 km, and the cable does not go in a straight line. So one RTT is ~200-250 ms.<br><strong>Also:</strong> just opening a new HTTPS connection takes several RTTs (TCP handshake 1, TLS 1.3 handshake 1, then the real request 1). We saw this in the "How the web works" lesson.<br><strong>So:</strong> however fast the server is, code cannot reduce the time of distance. Only bringing the server <em>closer</em> reduces it.` },
    { type: 'p', html: `Do the maths yourself. Pick a city and see how long it takes: straight from the US origin, from the nearby CDN edge (HIT), and when the edge does not have it (MISS):` },
    { type: 'custom', render(el) {
      const T = { city: 'User\'s city', tls: 'Connection', direct: 'Straight from the US origin', hit: 'From the nearby edge (HIT)', miss: 'MISS at the edge (edge → origin)', rtt: 'RTT',
        cities: { chn: ['Chennai', 14100], del: ['Delhi', 12050], mum: ['Mumbai', 13050], ldn: ['London', 5900] },
        tlsOpt: { t13: 'New HTTPS, TLS 1.3 (3 RTT)', t12: 'New HTTPS, TLS 1.2 (4 RTT)', warm: 'Already open connection (1 RTT)' },
        note: 'Model: RTT ≈ 10 ms (home WiFi/mobile network) + distance × 0.015 ms per km (light in fiber travels ~2 lakh km/s, and the path is not straight, so ~1.5 times longer). The edge is ~30 km from the user. On a MISS, the edge\'s connection to the origin is already open (warm), so only 1 long RTT is added. Download time is separate; this shows only the waiting time.' };
      let city = 'chn', mode = 't13';
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">${T.city}</div><div class="cdl-c" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"></div>
        <div style="font-size:14px;color:var(--ink-3);margin-top:12px">${T.tls}</div><div class="cdl-t" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"></div>
        <div class="cdl-bars" style="margin-top:14px;display:grid;gap:10px"></div>
        <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s);
      const chips = (box, map, get, set) => { box.innerHTML = ''; Object.keys(map).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = Array.isArray(map[k]) ? map[k][0] : map[k]; b.setAttribute('aria-pressed', get() === k); b.onclick = () => { set(k); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.cdl-c'), T.cities, () => city, k => city = k);
        chips(q('.cdl-t'), T.tlsOpt, () => mode, k => mode = k);
        const d = T.cities[city][1], n = mode === 't13' ? 3 : mode === 't12' ? 4 : 1;
        const far = d * 0.015, rttO = 10 + far, rttE = 10 + 30 * 0.015;
        const rows = [[T.direct, n * rttO, `${n} × ${Math.round(rttO)} ms`], [T.hit, n * rttE, `${n} × ${Math.round(rttE)} ms`], [T.miss, n * rttE + far, `${n} × ${Math.round(rttE)} + ${Math.round(far)} ms`]];
        const max = rows[0][1];
        q('.cdl-bars').innerHTML = rows.map(([a, v, f], i) => `<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;flex-wrap:wrap"><span>${a}</span><strong style="font-family:var(--f-mono)">${Math.round(v)} ms</strong></div><div style="height:12px;border-radius:6px;background:var(--line);margin-top:4px"><div style="height:12px;border-radius:6px;width:${Math.max(2, 100 * v / max).toFixed(1)}%;background:${i === 0 ? 'var(--red)' : i === 1 ? 'var(--green)' : 'var(--amber)'}"></div></div><div style="font-size:12px;color:var(--ink-3);font-family:var(--f-mono)">${f}</div></div>`).join('');
      };
      draw();
    }},
    { type: 'p', html: `Chennai, TLS 1.3: straight from the US, ~665 ms just in waiting. From the nearby edge (HIT): ~31 ms, about 20 times faster. And even a MISS is ~243 ms, because the connection between the edge and the origin is already open: the user pays three short RTTs, and only one long one.` },
    { type: 'h2', text: 'What is a CDN?' },
    { type: 'p', html: `In the cache lesson we kept data in RAM to protect the database. A CDN is the same idea at world scale: keep copies of the content close to the users' cities.` },
    { type: 'callout', tone: 'term', title: 'New word: CDN (Content Delivery Network)', html: `<strong>What it is:</strong> thousands of cache servers run by one company (like Cloudflare, Akamai, Amazon CloudFront), in hundreds of cities around the world. You rent them.<br><strong>Why we need it:</strong> the user gets a nearby copy (fast), and only requests the CDN does not have reach your servers (cheaper, less load).<br><strong>Without it:</strong> for every image, video and CSS file, every user goes to your server halfway around the world, and you pay the whole bandwidth bill.<br><strong>Example:</strong> the xyz.com logo was viewed 1 crore times. With a CDN, it probably left your server only a few hundred times (the first request at each edge); everything else came from the edges.` },
    { type: 'callout', tone: 'term', title: 'New word: edge server and PoP', html: `<strong>What it is:</strong> a <strong>PoP (Point of Presence)</strong> = a small CDN data center in some city. The cache servers inside it are called <strong>edge servers</strong>, because they sit at the "edge" of the network, closest to users.<br><strong>Why we need it:</strong> the closer, the smaller the RTT.<br><strong>Without it:</strong> the CDN would be just another far-away server.<br><strong>Example:</strong> a Chennai user uses the Chennai PoP, a Delhi user the Delhi PoP. Each PoP has its own separate cache.` },
    { type: 'callout', tone: 'term', title: 'New word: origin', html: `<strong>What it is:</strong> your real server (or storage), where the original content is kept. The "source of truth" for the CDN.<br><strong>Why we need it:</strong> if the edge does not have a file (a miss), it brings it from the origin.<br><strong>Without it:</strong> the CDN would have nothing to bring. A CDN does not replace the origin; it sits in front of it.` },
    { type: 'image', src: 'assets/img/cdn/single-server-vs-cdn.jpg', alt: 'Two pictures: on the left, one single server with long dotted lines going to all the computers; on the right, many orange servers spread across a network, and each computer gets data from a nearby server', caption: 'Left: without a CDN, one server sends data to all users from far away. Right: with a CDN, many edge servers are spread out, and each user is answered by a nearby server.', credit: { text: 'Kanoha (original), vectorised by Д.Ильин, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NCDN_-_CDN.svg', license: 'CC0' } },

    { type: 'h2', text: 'How does a user reach the nearest edge?' },
    { type: 'p', html: `The user only typed <code>cdn.xyz.com</code> (or the page asked for an image from that address). How do they know the Chennai edge is the closest? There are two ways, and big CDNs use both together:` },
    { type: 'table', head: ['Way', 'How it works', 'Benefit', 'Weakness'], rows: [
      ['<strong>DNS-based (GeoDNS)</strong>', 'The CDN\'s DNS server looks at where the question came from and answers with the IP of the edge in that city. Chennai gets the Chennai IP, Delhi gets the Delhi IP.', 'A different edge for each user; the answer can also change based on load and health', 'DNS answers are cached (TTL), so changes are slow; if the user\'s DNS resolver is far away, the wrong edge is chosen'],
      ['<strong>Anycast</strong>', 'All edges announce <em>the same IP</em>. Internet routers carry the packet to the edge that is closest on the network (we saw this in the LB algorithms lesson).', 'One IP, no DNS trouble; if a PoP falls, traffic moves to the next one by itself; a DDoS flood is split over many PoPs', 'Routing looks at "closest on the network", which is not always "fastest"'],
    ]},
    { type: 'p', html: `Example: Cloudflare uses anycast for its network. CDNs like CloudFront send the user to a nearby edge location through DNS. You do not build this yourself; the CDN handles all of it. Your only job is to point <code>cdn.xyz.com</code> at the CDN in DNS.` },

    { type: 'h2', text: 'Run it and see' },
    { type: 'p', html: `Each scenario shows one job of a CDN. Click any box. In the "Origin shield" scenario a new box appears; its full explanation is further down. For now just know that it is one more cache layer between the edges and the origin.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'uc', label: 'User, Chennai', x: 85, y: 90, w: 140, kind: 'client', info: 'What it is: an xyz.com user in Chennai. DNS (or anycast) sends their request to the nearest edge, the Chennai PoP.' },
        { id: 'ud', label: 'User, Delhi', x: 85, y: 250, w: 140, kind: 'client', info: 'What it is: an xyz.com user in Delhi. Their request goes to the Delhi PoP. The Chennai PoP\'s cache has nothing to do with it.' },
        { id: 'ec', label: 'Edge: Chennai', sub: 'CDN PoP', x: 300, y: 90, w: 140, kind: 'net', info: 'What it is: the CDN cache server (edge) in Chennai. Whatever is cached here comes back in ~10-20 ms. If not, it brings it from the origin (or the shield) and keeps it.' },
        { id: 'ed', label: 'Edge: Delhi', sub: 'CDN PoP', x: 300, y: 250, w: 140, kind: 'net', info: 'What it is: the CDN cache server in Delhi. Its cache is separate from Chennai\'s, so the first request here misses separately.' },
        { id: 'sh', label: 'Origin shield', sub: 'a middle layer', x: 480, y: 170, w: 140, kind: 'net', hidden: true, info: 'What it is: a big cache layer between the edges and the origin. Instead of going straight to the origin, edges ask it first. This cuts the requests to the origin even more.' },
        { id: 'o', label: 'Origin', sub: 'xyz.com, US', x: 650, y: 170, w: 120, kind: 'server', meter: true, load: 5, info: 'What it is: the real xyz.com server, in the US. The original files are here. The CDN\'s job is to cut its load and its bandwidth bill. The meter shows how busy it is.' },
      ],
      edges: [
        { a: 'uc', b: 'ec' }, { a: 'ud', b: 'ed' },
        { a: 'ec', b: 'o', id: 'co' }, { a: 'ed', b: 'o', id: 'do' },
        { a: 'ec', b: 'sh' }, { a: 'ed', b: 'sh' }, { a: 'sh', b: 'o' },
      ],
      scenarios: [
        { name: 'First request (miss)', steps: [
          { title: 'The Chennai user asks for the logo', go: 'uc>ec', text: 'The request went to the nearby edge, not to the US.', msg: 'GET https://cdn.xyz.com/logo.png' },
          { title: 'The edge does not have it: MISS', text: 'This file was asked for at the Chennai edge for the first time. The edge brings it from the origin (one long trip).', set: { ec: { state: 'miss', sub: 'MISS' } }, go: ['ec>o', 'res:o>ec'], after: { o: { load: 15 } } },
          { title: 'The edge keeps a copy', text: 'With the response, the origin sent a header that says how long to keep the copy (1 day). The full story of headers is below.', set: { ec: { state: '', sub: 'logo.png cached' } }, go: 'res:ec>uc', msg: 'Cache-Control: public, max-age=86400   (1 day)' },
        ]},
        { name: 'Next requests (hit)', steps: [
          { title: '1000 more users in Chennai', text: 'All from the edge. The origin did not even notice.', flood: { paths: ['uc>ec'], n: 10 }, after: { ec: { state: 'hit', sub: 'HIT' } } },
          { title: 'A fast answer', go: 'res:ec>uc', text: '~10-20 ms instead of ~200+ ms. And the origin\'s load stays the same.', set: { o: { state: 'ok' } } },
          { title: 'The first user in Delhi', text: 'Each edge has its own cache. It is the first time at the Delhi edge, so there will be one miss there, and then all hits.', go: ['ud>ed', 'ed>o', 'res:o>ed', 'res:ed>ud'], set: { ed: { sub: 'MISS, then cached' } } },
        ]},
        { name: 'Live score, crores of users', intro: 'xyz.com has a live cricket score page. The score JSON is the same for everyone. The app polls (asks again) every 5 seconds.', steps: [
          { title: 'Lakhs of polls', text: 'The score file has a 2 second TTL. All polls end at the edges.', flood: { paths: ['uc>ec', 'ud>ed'], n: 18 }, after: { ec: { state: 'hit', sub: 'score.json (TTL 2s)' }, ed: { state: 'hit', sub: 'score.json (TTL 2s)' } }, msg: 'Cache-Control: public, max-age=2' },
          { title: 'TTL ends: each edge goes to the origin only once', text: 'Every 2 seconds, ~1 request from each edge reaches the origin. 100 edges = ~50 requests/sec at the origin, while users send lakhs per second.', parallel: true, go: ['ec>o', 'ed>o'], after: { o: { load: 20 } } },
          { title: 'The new score reaches everyone', parallel: true, go: ['res:o>ec>uc', 'res:o>ed>ud'], text: 'Users see a score that is at most ~2-5 seconds old. That is fine for a live score, and the saving is huge.' },
        ]},
        { name: 'Origin shield', intro: 'There are 200 edges. A new video arrives. The first miss at each edge goes to the origin: 200 requests at once.', steps: [
          { title: 'Add the shield layer', text: 'Edges now ask a shield (or regional cache) instead of going straight to the origin.', show: ['sh'], hide: ['co', 'do'], focus: ['sh'] },
          { title: 'Both edges miss', parallel: true, go: ['uc>ec>sh', 'ud>ed>sh'], text: 'Both edges asked the shield.' },
          { title: 'The shield goes to the origin only once', go: ['sh>o', 'res:o>sh'], text: '1 request at the origin instead of 200.', after: { o: { load: 8 } } },
          { title: 'A copy for both edges', parallel: true, go: ['res:sh>ec>uc', 'res:sh>ed>ud'], text: 'For big videos and live events, this layer saves the origin from falling over.' },
        ]},
        { name: 'Origin down', steps: [
          { title: 'The origin crashes', set: { o: { state: 'down', sub: 'DOWN', load: 0 } }, text: 'The US server fell over.', focus: ['o'] },
          { title: 'What is cached keeps working', text: 'The edge has copies of the logo, CSS and images. Users still see the static part of the site.', go: ['uc>ec', 'res:ec>uc'], after: { ec: { state: 'hit' } } },
          { title: 'Expired content too?', text: 'You can tell the CDN: "if the origin gives an error, serve the old copy" (<code>stale-if-error</code>). Slightly old content is better than an error page.', go: ['ud>ed', 'lost:ed>o', 'res:ed>ud'], msg: 'Cache-Control: max-age=60, stale-if-error=86400' },
        ]},
      ],
    },
    { type: 'h2', text: 'Pull CDN vs push CDN' },
    { type: 'p', html: `How does a file reach the edge? Two ways:` },
    { type: 'callout', tone: 'term', title: 'New words: pull CDN and push CDN', html: `<strong>Pull CDN:</strong> you upload nothing. If the edge does not have a file, the edge <em>itself</em> pulls it from the origin and caches it. The flow above was pull. The most common kind.<br><strong>Push CDN:</strong> you put (push) the file into the CDN's storage in advance. The CDN serves it to the edges from there. You need no origin server, or a smaller one.<br><strong>Why both:</strong> pull is easy, and only what was asked for gets cached. Push is useful when a file is big, changes rarely, and you must be sure it is everywhere from the first second of a launch.` },
    { type: 'table', head: ['', 'Pull', 'Push'], rows: [
      ['First request', 'The first request at each edge misses (a little slow)', 'Already there, no miss'],
      ['Your work', 'Just point DNS and keep the headers right', 'Upload every new or changed file, remove old ones'],
      ['Storage', 'Only requested files on the edges', 'You pay for whatever you push'],
      ['When', 'Websites, images, APIs: almost always', 'Game updates, big app downloads, one big launch'],
    ]},
    { type: 'p', html: `<strong>A small calculation:</strong> 300 PoPs, a new 50 MB game update. With pull, the first request at each PoP goes to the origin: 300 × 50 MB = 15 GB from the origin, and the first users wait a little. With push, you put 50 MB into the CDN storage once, and the CDN spread it internally. (The "origin shield" in the next part also reduces the pull problem a lot.)` },

    { type: 'h2', text: 'Cache key: how do we know "this is the same file"?' },
    { type: 'callout', tone: 'term', title: 'New word: cache key', html: `<strong>What it is:</strong> the name the edge uses to find a file in its cache. Usually host + path + query string, like <code>cdn.xyz.com/app.js?v=3</code>.<br><strong>Why it matters:</strong> if two requests have the same key, the second is a HIT. A different key is a MISS, even if the file is exactly the same.<br><strong>Without understanding this:</strong> if useless things get into the key (each user's cookie, tracking parameters), every request looks "new" and the hit rate falls. And the opposite: if something important is missing from the key (like language), one user's page is given to another.<br><strong>Example:</strong> <code>logo.png?utm_source=whatsapp</code> and <code>logo.png?utm_source=insta</code> are the same image. If the query string stays in the key, that is two copies and two misses.` },
    { type: 'p', html: `Below, one edge gets 2,000 requests for <code>app.js</code> (seeded random, the same every time). 40% of the requests carry a tracking parameter (<code>?utm_source=...</code>, 20 different values), there are 500 different users (each with their own cookie), and browsers ask for two kinds of compression (<code>gzip</code> or <code>br</code>). Choose what goes into the cache key and watch the hit rate:` },
    { type: 'custom', render(el) {
      const T = { parts: { q: 'Query string', c: 'Cookie (user)', e: 'Accept-Encoding' }, keys: 'Different cache keys', hit: 'Hit rate', origin: 'Requests to origin', on: 'in the key', off: 'out of the key',
        warnC: 'The cookie is in the key: every user gets their own copy. Useless for a static file; the hit rate dropped.', warnE: 'Encoding is in the key: two separate copies for gzip and br. This is right, because the bytes of the two files are different (CDNs do this with Vary: Accept-Encoding).', base: 'Only the path: all requests share one key. One miss, all the rest are hits.' };
      const N = 2000;
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const reqs = [];
      for (let i = 0; i < N; i++) reqs.push({ q: rnd() < 0.4 ? 'utm' + Math.floor(rnd() * 20) : '', c: 'u' + Math.floor(rnd() * 500), e: rnd() < 0.5 ? 'gzip' : 'br' });
      const on = { q: true, c: false, e: false };
      el.innerHTML = `<div class="cck-p" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="calc-note cck-key" style="font-family:var(--f-mono)"></div>
        <div class="stats"><div class="stat"><span>${T.keys}</span><strong class="cck-k"></strong></div><div class="stat"><span>${T.hit}</span><strong class="cck-h"></strong></div><div class="stat"><span>${T.origin}</span><strong class="cck-o"></strong></div></div>
        <div class="calc-note cck-n"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const box = q('.cck-p'); box.innerHTML = '';
        Object.keys(T.parts).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on[k] ? ' on' : ''); b.textContent = T.parts[k] + ': ' + (on[k] ? T.on : T.off); b.setAttribute('aria-pressed', on[k]); b.onclick = () => { on[k] = !on[k]; draw(); }; box.appendChild(b); });
        const set = new Set(reqs.map(r => ['app.js', on.q ? r.q : '', on.c ? r.c : '', on.e ? r.e : ''].join('|')));
        const k = set.size;
        q('.cck-key').textContent = 'key = cdn.xyz.com/app.js' + (on.q ? ' + ?query' : '') + (on.c ? ' + cookie' : '') + (on.e ? ' + encoding' : '');
        q('.cck-k').textContent = k.toLocaleString('en-IN');
        q('.cck-h').textContent = (100 * (N - k) / N).toFixed(1) + '%';
        q('.cck-o').textContent = k.toLocaleString('en-IN');
        q('.cck-n').textContent = on.c ? T.warnC : on.e ? T.warnE : (on.q ? '' : T.base);
      };
      draw();
    }},
    { type: 'p', html: `The result: a key with only the path = 1 key, hit rate ~100%. With the query string too = 21 keys (99%). Add the cookie = 492 keys, and the hit rate falls to <strong>75%</strong>. Query + cookie = 1,209 keys, only <strong>40%</strong>. The lesson: remove cookies and tracking parameters from the key of static files ("ignore query string" or an allow-list in the CDN settings). But keep in the key whatever really changes the response (a version <code>?v=3</code>, language, encoding).` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "I put it on a CDN, so everything is cached"', html: `Putting it on a CDN is not enough. If the origin sends <code>Set-Cookie</code>, or sends no <code>Cache-Control</code> header at all, or the cache key holds each user's cookie, the CDN becomes just an expensive proxy: every request goes to the origin. Always look at the <strong>cache hit ratio</strong> in the CDN dashboard, and check the response headers for something like <code>Age</code> or <code>X-Cache: HIT</code>.` },

    { type: 'h2', text: 'TTL and Cache-Control headers: how long to keep it?' },
    { type: 'p', html: `How does the edge know to keep the logo for 1 day and the live score for only 2 seconds? <strong>The origin tells it</strong>, by sending a header with each response.` },
    { type: 'callout', tone: 'term', title: 'New word: HTTP header and Cache-Control', html: `<strong>What it is:</strong> a <strong>header</strong> = short "name: value" lines attached to a response. They are not the content itself but information about it. <strong>Cache-Control</strong> is the header that says who (browser, CDN) may cache this response, and for how long.<br><strong>Why we need it:</strong> each file has different needs. With one header, you control it file by file.<br><strong>Without it:</strong> the CDN guesses on its own (or does not cache at all), and private data may get cached by mistake.` },
    { type: 'table', head: ['Directive', 'Meaning', 'When'], rows: [
      ['<code>max-age=N</code>', 'The copy is "fresh" for N seconds, no need to ask the server (for both the browser and the CDN)', 'Almost every cacheable response'],
      ['<code>s-maxage=N</code>', 'A max-age only for <em>shared</em> caches (CDN); the browser ignores it', 'When you want it long on the CDN and short in the browser'],
      ['<code>public</code> / <code>private</code>', 'public = the CDN may also keep it. private = only the user\'s browser, not the CDN', 'private: user-specific pages'],
      ['<code>no-cache</code>', 'You may keep a copy, but before each use, ask the origin "has it changed?"', 'Where it must always be fresh but you want to save bytes'],
      ['<code>no-store</code>', 'Do not store it anywhere', 'Bank details, OTP, payment pages'],
      ['<code>stale-while-revalidate=N</code>', 'For N seconds after expiry, serve the old copy <em>at once</em>, and fetch a fresh one in the background', 'Live score, feeds: speed matters more than perfectly fresh'],
      ['<code>stale-if-error=N</code>', 'If the origin gives an error, keep serving the old copy for N seconds', 'So the site works even when the origin is down'],
      ['<code>immutable</code>', 'This file will never change; never ask again', 'Versioned files: <code>app.3f9a1c.js</code>'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: revalidation (ETag and 304)', html: `<strong>What it is:</strong> the copy has expired, but maybe the file has not changed at all. So instead of downloading the whole file again, the cache asks: "I have version <code>\"abc123\"</code>, has it changed?" This version tag is the <strong>ETag</strong> header. If the file has not changed, the origin sends a tiny answer: <strong>304 Not Modified</strong> (with no body).<br><strong>Why we need it:</strong> a few bytes instead of 2 MB. You know it is fresh, and you save bandwidth.<br><strong>Without it:</strong> the whole file is downloaded again at every expiry.` },
    { type: 'p', html: `Now play. Pick a header, then pick a time (how long after the first request the next request came), and see what the CDN and the browser do:` },
    { type: 'custom', render(el) {
      const T = { hdr: 'Header', time: 'When the next request comes', cdn: 'What the CDN edge does', br: 'What the browser does',
        P: [
          { h: 'public, max-age=86400', what: 'logo.png', ma: 86400 },
          { h: 'public, max-age=60, s-maxage=600', what: 'trending.json', ma: 60, sma: 600 },
          { h: 'public, max-age=2, stale-while-revalidate=30', what: 'score.json', ma: 2, swr: 30 },
          { h: 'private, max-age=300', what: '/my-profile', ma: 300, priv: 1 },
          { h: 'no-cache', what: 'news.html', nc: 1 },
          { h: 'no-store', what: '/bank/balance', ns: 1 },
          { h: 'public, max-age=31536000, immutable', what: 'app.3f9a1c.js', ma: 31536000, imm: 1 },
        ],
        times: [[1, 'after 1 s'], [10, 'after 10 s'], [45, 'after 45 s'], [300, 'after 5 min'], [7200, 'after 2 hours'], [172800, 'after 2 days']],
        r: { origin: 'Not stored at all: the request goes straight to the origin (MISS).', priv: 'It is private: the CDN keeps no copy. The request goes to the origin.', nc: 'It has a copy, but first asks the origin (ETag). If nothing changed, a 304, a tiny answer.', fresh: s => `HIT: the copy is fresh (${s} more).`, swr: 'Expired, but stale-while-revalidate: it gave the old copy at once and fetched a fresh one from the origin in the background.', exp: 'Expired: fetch again from the origin (a 304 if there is an ETag, otherwise the full file).', imm: s => `HIT: immutable and fresh (${s} more). It never even asks.`,
          bFresh: s => `Uses its own copy; no request goes over the network (${s} more).`, bNs: 'Stores nothing. Goes to the network every time.', bNc: 'Keeps a copy, but confirms with the server every time (304).', bExp: 'Its copy expired: asks the CDN again.', bSwr: 'Shows the old copy at once and fetches a new one in the background.' } };
      const dur = s => s >= 86400 ? Math.round(s / 86400) + ' days' : s >= 3600 ? Math.round(s / 3600) + ' hours' : s >= 60 ? Math.round(s / 60) + ' min' : s + ' s';
      let pi = 0, ti = 0;
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">${T.hdr}</div><div class="cch-h" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <div style="font-size:14px;color:var(--ink-3);margin-top:12px">${T.time}</div><div class="cch-t" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <pre class="ascii cch-x" style="margin-top:12px;white-space:pre-wrap"></pre>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:4px">
          <div style="padding:10px 12px;border-radius:var(--r);border:1px solid var(--net-s);background:var(--net-f);color:var(--net-t)"><div style="font-size:13px;font-weight:600">${T.cdn}</div><div class="cch-c" style="font-size:14px;margin-top:4px"></div></div>
          <div style="padding:10px 12px;border-radius:var(--r);border:1px solid var(--client-s);background:var(--client-f);color:var(--client-t)"><div style="font-size:13px;font-weight:600">${T.br}</div><div class="cch-b" style="font-size:14px;margin-top:4px"></div></div>
        </div>`;
      const q = s => el.querySelector(s);
      const cdnSays = (p, t) => {
        if (p.ns) return T.r.origin; if (p.priv) return T.r.priv; if (p.nc) return T.r.nc;
        const f = p.sma != null ? p.sma : p.ma;
        if (t < f) return p.imm ? T.r.imm(dur(f - t)) : T.r.fresh(dur(f - t));
        if (p.swr && t < f + p.swr) return T.r.swr;
        return T.r.exp;
      };
      const brSays = (p, t) => {
        if (p.ns) return T.r.bNs; if (p.nc) return T.r.bNc;
        if (t < p.ma) return T.r.bFresh(dur(p.ma - t));
        if (p.swr && t < p.ma + p.swr) return T.r.bSwr;
        return T.r.bExp;
      };
      const draw = () => {
        const hb = q('.cch-h'); hb.innerHTML = '';
        T.P.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === pi ? ' on' : ''); b.textContent = p.what; b.setAttribute('aria-pressed', i === pi); b.onclick = () => { pi = i; draw(); }; hb.appendChild(b); });
        const tb = q('.cch-t'); tb.innerHTML = '';
        T.times.forEach(([s, l], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === ti ? ' on' : ''); b.textContent = l; b.setAttribute('aria-pressed', i === ti); b.onclick = () => { ti = i; draw(); }; tb.appendChild(b); });
        const p = T.P[pi], t = T.times[ti][0];
        q('.cch-x').textContent = 'GET ' + p.what + '\n← 200 OK\n   Cache-Control: ' + p.h;
        q('.cch-c').textContent = cdnSays(p, t);
        q('.cch-b').textContent = brSays(p, t);
      };
      draw();
    }},
    { type: 'p', html: `Be sure to try two things. (1) <code>trending.json</code> "after 5 min": the browser's copy (60 s) has expired, but the CDN's (s-maxage 600 s) is still fresh. The browser asks the CDN and gets it from the CDN; nothing reaches the origin. (2) <code>score.json</code> "after 10 s": the copy expired at 2 s, but it is within the 30 s of stale-while-revalidate: the user gets the old copy at once, and a fresh one is fetched in the background. "After 45 s" (past 2 + 30 s too): now it goes to the origin again.` },
    { type: 'h2', text: 'How to remove old content: purge and versioned URLs' },
    { type: 'p', html: `A wrong banner image was uploaded by mistake, and its TTL is 1 day. Old copies sit on hundreds of edges around the world. If you wait for the TTL, the wrong image shows for a whole day. There are two ways out:` },
    { type: 'callout', tone: 'term', title: 'New word: purge (invalidation)', html: `<strong>What it is:</strong> an order to the CDN: "remove the copy of this URL (or all files with this tag/prefix) from every edge, now". The next request misses and fresh content comes from the origin.<br><strong>Why we need it:</strong> to fix a mistake before the TTL ends.<br><strong>Without it:</strong> wrong content until the TTL ends.<br><strong>Careful:</strong> after a purge, all edges miss together, so the origin gets a small flood. And a purge takes a little time to reach everywhere; in a 2024 post Cloudflare said its global purge averages under 150 ms, while on other CDNs it can take seconds to minutes.` },
    { type: 'callout', tone: 'term', title: 'New word: versioned URL (cache busting)', html: `<strong>What it is:</strong> when a file changes, change its <em>name</em>. Put a hash of the content in the name: <code>app.3f9a1c.js</code>. A new deploy = a new name, like <code>app.8b27e0.js</code>.<br><strong>Why we need it:</strong> the old name never changes, so you can give it a 1 year TTL + <code>immutable</code>. The new HTML asks for the new name, which misses on the CDN and arrives at once.<br><strong>Without it:</strong> a purge on every deploy, and some users get a bad mix of old JS + new HTML in their browser.<br><strong>Example:</strong> modern build tools (Vite, webpack) do this automatically. Give the HTML itself a short TTL (or <code>no-cache</code>), because the new names are written inside it.` },
    { type: 'table', head: ['', 'Purge', 'Versioned URL'], rows: [
      ['How', 'A "remove" order through the CDN\'s API/dashboard', 'Change the file\'s name'],
      ['Speed', 'Depends on the CDN: milliseconds to minutes', 'Instant: the new name was never in a cache'],
      ['Effect on origin', 'After a purge all edges miss together', 'Only the new name, slowly'],
      ['When', 'Mistakes, legal takedowns, URLs you cannot change (like /profile-photo/42)', 'JS, CSS, images produced by the build: always'],
    ]},

    { type: 'h2', text: 'Origin shield: protect the origin from the crowd of edges' },
    { type: 'callout', tone: 'term', title: 'New word: origin shield (tiered cache)', html: `<strong>What it is:</strong> a big middle cache layer between the edges and the origin. On a miss, the edge does not go straight to the origin; it asks the shield first. Many CDNs also call this a "tiered cache" or "regional edge cache".<br><strong>Why we need it:</strong> 300 misses for a new file at 300 edges no longer hit the origin 300 times. They go to the shield, and the shield fetches from the origin only <strong>once</strong>.<br><strong>Without it:</strong> as soon as a new video/episode arrives, the first request at every edge hits the origin: a flood at the origin, and a bandwidth bill.<br><strong>Example:</strong> AWS CloudFront's Origin Shield docs say it "collapses" requests and brings them down to as few as one origin request per object.` },
    { type: 'callout', tone: 'term', title: 'New word: request collapsing', html: `<strong>What it is:</strong> if 20 users miss the same file at the same edge at the same time, the edge asks the origin <strong>once</strong>, not 20 times, and gives the same answer to the other 19. (Remember "single-flight / lock" from the caching strategies lesson: the same idea.)<br><strong>Without it:</strong> every miss at every edge is a separate request, and live events cause a stampede at the origin.` },
    { type: 'p', html: `A new episode was released. Do the maths yourself: at how many PoPs are people asking for it for the first time, and how many requests reach the origin:` },
    { type: 'custom', render(el) {
      const T = { n: 'PoPs (edges) where the first request came', k: 'Users at the same time on each edge', col: 'Request collapsing at the edge', sh: 'Origin shield', on: 'on', off: 'off', o: 'Requests to origin', s: 'Requests to shield', note: 'Everything is for one new object (like the first video segment of an episode). The shield also collapses requests, so only 1 goes from it to the origin.' };
      let col = false, sh = false;
      el.innerHTML = `<div class="row2">
          <div><label>${T.n}: <strong class="csh-nv"></strong><input class="csh-n" type="range" min="10" max="600" step="10" value="300"></label></div>
          <div><label>${T.k}: <strong class="csh-kv"></strong><input class="csh-k" type="range" min="1" max="100" step="1" value="20"></label></div>
        </div>
        <div class="csh-t" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="stats"><div class="stat"><span>${T.o}</span><strong class="csh-o"></strong></div><div class="stat"><span>${T.s}</span><strong class="csh-s"></strong></div></div>
        <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s), f = n => n.toLocaleString('en-IN');
      const draw = () => {
        const N = Number(q('.csh-n').value), K = Number(q('.csh-k').value);
        q('.csh-nv').textContent = N; q('.csh-kv').textContent = K;
        const box = q('.csh-t'); box.innerHTML = '';
        [[T.col, () => col, v => col = v], [T.sh, () => sh, v => sh = v]].forEach(([l, g, s]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (g() ? ' on' : ''); b.textContent = l + ': ' + (g() ? T.on : T.off); b.setAttribute('aria-pressed', g()); b.onclick = () => { s(!g()); draw(); }; box.appendChild(b); });
        const up = col ? N : N * K;
        q('.csh-o').textContent = f(sh ? 1 : up);
        q('.csh-s').textContent = sh ? f(up) : '-';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', draw));
      draw();
    }},
    { type: 'p', html: `300 PoPs, 20 users at each: with no protection, <strong>6,000</strong> requests hit the origin at once. With collapsing on: 300. With the shield on too: only <strong>1</strong> at the origin. The cost: one more hop on a miss (edge → shield → origin), and the shield's own cost.` },

    { type: 'h2', text: 'Dynamic content acceleration: making uncacheable things fast too' },
    { type: 'p', html: `Feed, cart, payment: different for each user, so they cannot be cached. Still, putting them behind a CDN makes them faster. How? Remember the "MISS" line in the first widget above.` },
    { type: 'callout', tone: 'term', title: 'New word: dynamic content acceleration', html: `<strong>What it is:</strong> the CDN also speeds up requests that are not cached. In three ways: (1) the user's TCP + TLS handshake ends at the nearby edge (short RTTs), (2) connections between the edge and the origin stay open (warm), so there is no new handshake on each request, (3) the CDN picks a fast path over its own network (like Cloudflare Argo Smart Routing or Akamai's route optimisation products).<br><strong>Why we need it:</strong> API calls also do not pay 3-4 RTTs across half the world every time.<br><strong>Without it:</strong> every new connection does the full handshake from the user to the origin.<br><strong>Real example:</strong> in a 2024 engineering post, Disney+ Hotstar explained that for the 2023 World Cup, all calls from their client apps first reach the CDN, which is their "external API gateway": security checks and routing happen there. APIs that were cacheable (like the scorecard) were cached on the CDN; the rest were sent inside.` },

    { type: 'h2', text: 'Signed URLs: a private video only for the right user' },
    { type: 'p', html: `A premium movie is on the CDN. The CDN's job is to give files to everyone. So if someone who did not pay copies the link and sends it on WhatsApp, can everyone watch it? This is how we prevent that:` },
    { type: 'callout', tone: 'term', title: 'New word: signed URL', html: `<strong>What it is:</strong> a URL that carries an expiry time and a <strong>signature</strong>: <code>/movie.mp4?expires=1700000300&amp;sig=9f2c...</code>. The signature is made with a secret key that only your server and the CDN have.<br><strong>How it works:</strong> the user logs in and presses "play". Your server checks that they have paid, then makes a 5 minute signed URL and gives it to them. On every request, the edge makes the signature again and compares, and checks the time. If they match and time is left: the file is served. Otherwise: <code>403 Forbidden</code>.<br><strong>Why we need it:</strong> the CDN knows nothing about your login system; with the signature, the edge can decide by itself without asking your server.<br><strong>Without it:</strong> a leaked link = leaked content.<br><strong>Careful:</strong> if any part of the link (path or expiry) is changed, the signature will not match. There is also a cookie version (signed cookies), for when many files must be opened together (like all the segments of a video).` },
    { type: 'p', html: `Try it yourself. The server gave a 5 minute link. Move the clock forward, or tamper with the link, and see what the edge says. (Here the signature is a small toy hash; real CDNs use strong methods like HMAC or RSA.)` },
    { type: 'custom', render(el) {
      const T = { fresh: 'Get a new link (5 min)', t1: 'Clock +1 min', t5: 'Clock +5 min', path: 'Put another movie in the link', exp: 'Push expiry +1 day', clock: 'Clock', left: 'Link time left', play: 'Send to the edge',
        ok: 'Signature matches, time left: <strong>200 OK</strong>, the video plays.', badSig: 'Signature does not match: someone changed the link. <strong>403 Forbidden</strong>.', expired: 'Signature is right, but the time is over. <strong>403 Forbidden</strong>. The user must get a new link from the app.',
        steps: (a, b) => `The edge worked it out itself: sig(path + expires + secret) = ${a}. The link has sig = ${b}.` };
      const SECRET = 'xyz-cdn-secret';
      const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16).padStart(8, '0'); };
      let now, url, verdict;
      const issue = () => { const path = '/movies/final-match.mp4', exp = now + 300; url = { path, exp, sig: h(path + exp + SECRET) }; verdict = ''; };
      const reset = () => { now = 0; issue(); draw(); };
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-a="fresh">${T.fresh}</button>
          <button type="button" class="btn small" data-a="t1">${T.t1}</button>
          <button type="button" class="btn small" data-a="t5">${T.t5}</button>
          <button type="button" class="btn small" data-a="path">${T.path}</button>
          <button type="button" class="btn small" data-a="exp">${T.exp}</button>
          <button type="button" class="btn small primary" data-a="play">${T.play}</button>
        </div>
        <pre class="ascii csu-u" style="margin-top:12px;white-space:pre-wrap;word-break:break-all"></pre>
        <div class="stats"><div class="stat"><span>${T.clock}</span><strong class="csu-c"></strong></div><div class="stat"><span>${T.left}</span><strong class="csu-l"></strong></div></div>
        <div class="calc-note csu-v" style="min-height:2.6em"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        q('.csu-u').textContent = 'https://cdn.xyz.com' + url.path + '?expires=' + url.exp + '&sig=' + url.sig;
        q('.csu-c').textContent = now + ' s';
        q('.csu-l').textContent = Math.max(0, url.exp - now) + ' s';
        q('.csu-v').innerHTML = verdict;
      };
      const play = () => {
        const want = h(url.path + url.exp + SECRET);
        verdict = T.steps(want, url.sig) + ' ' + (want !== url.sig ? T.badSig : now >= url.exp ? T.expired : T.ok);
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'fresh') issue(); else if (a === 't1') now += 60; else if (a === 't5') now += 300;
        else if (a === 'path') url.path = '/movies/premium-film.mp4'; else if (a === 'exp') url.exp += 86400; else play();
        if (a !== 'play') verdict = '';
        draw();
      });
      reset();
    }},
    { type: 'p', html: `Now run purge, signed URLs and dynamic requests together. This diagram has one new thing: <strong>object storage</strong> (like Amazon S3), a very big, cheap place to keep files. It has its own lesson later; for now just know that the private videos are kept there and only the CDN can read them.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'xyz.com app', x: 75, y: 170, w: 120, kind: 'client', info: 'What it is: an xyz.com user. Every request they make (image, video, API) first reaches the CDN edge.' },
        { id: 'e', label: 'CDN edge', sub: 'cache + checks', x: 262, y: 170, w: 150, kind: 'edge', info: 'What it is: the CDN server near the user. It caches static files, checks the signature and expiry of signed URLs, and sends dynamic API calls to the origin over a warm connection.' },
        { id: 'app', label: 'App server', sub: 'login, signs URLs', x: 480, y: 75, w: 160, kind: 'server', info: 'What it is: the real xyz.com code (the origin). It checks logins, builds dynamic things like the feed, and makes a signed URL for users who have paid.' },
        { id: 's', label: 'Object storage', sub: 'private videos', x: 480, y: 265, w: 160, kind: 'data', info: 'What it is: a cheap place for big files (like Amazon S3). The bucket is private: only the CDN can read it, nobody can use a direct link.' },
        { id: 'ci', label: 'Deploy / admin', sub: 'purge API', x: 650, y: 170, w: 120, kind: 'queue', info: 'What it is: the xyz.com deploy pipeline or admin panel. To fix a mistake, it sends an order to the CDN\'s purge API.' },
      ],
      edges: [{ a: 'u', b: 'e' }, { a: 'e', b: 'app' }, { a: 'e', b: 's' }, { a: 'ci', b: 'e' }],
      scenarios: [
        { name: 'Purge', intro: 'A wrong banner.jpg was uploaded, with a 1 day TTL. Every edge has the wrong copy.', steps: [
          { title: 'The wrong copy on the edge', text: 'Users see the wrong banner.', go: ['u>e', 'res:e>u'], set: { e: { state: 'warn', sub: 'banner.jpg (wrong)' } } },
          { title: 'The admin sends a purge', text: 'An order to the CDN\'s API: remove the copy of this URL from every edge. In reality this order goes to all PoPs.', go: 'evt:ci>e', after: { e: { state: '', sub: 'banner.jpg purged' } }, msg: 'POST /purge  {"files": ["https://cdn.xyz.com/banner.jpg"]}' },
          { title: 'Next request: miss, fresh file', text: 'The edge has no copy, so it brought the new file from storage and cached it.', go: ['u>e', 'e>s', 'res:s>e', 'res:e>u'], after: { e: { state: 'hit', sub: 'banner.jpg (right)' } } },
        ]},
        { name: 'Signed URL', intro: 'Riya has a premium plan and wants to play a movie.', steps: [
          { title: 'Pressed play: ask the app for a link', text: 'This API call is dynamic (Riya\'s login is checked), so it is not cached. The edge sends it to the app over a warm connection.', go: ['u>e>app'], msg: 'POST /play  {"movie": "final-match"}' },
          { title: 'The app gives a signed URL', text: 'The app checked: the plan is active. It made a 5 minute signed URL and gave it.', go: 'res:app>e>u', msg: '{"url": "/movie.mp4?expires=...&sig=9f2c..."}' },
          { title: 'The edge checks the signature', text: 'The signature matches and time is left. The edge did not have the file, so it brought it from private storage.', go: ['u>e', 'e>s', 'res:s>e', 'res:e>u'], after: { e: { state: 'hit', sub: 'sig OK' } } },
        ]},
        { name: 'Leaked link (403)', intro: 'Someone copied Riya\'s link and sent it to a group. 1 hour later someone opens it.', steps: [
          { title: 'An old link at the edge', text: 'The edge checked the signature: it is right, but the expiry passed 55 minutes ago.', go: 'u>e', msg: 'GET /movie.mp4?expires=...&sig=9f2c...' },
          { title: '403 Forbidden', text: 'The edge stopped it right there. Storage and the app did not even notice. If you change the expiry in the link and try, the signature will not match: still 403.', go: 'bad:e>u', set: { e: { state: 'down', sub: '403: expired' } } },
        ]},
        { name: 'Dynamic API (no cache)', intro: 'Riya opens her feed. It is different for each user, so it will not be cached.', steps: [
          { title: 'The request reaches the nearby edge', text: 'The TCP + TLS handshake ends at the Chennai edge: short RTTs.', go: 'u>e', msg: 'GET /api/feed   Cookie: session=...' },
          { title: 'To the origin over a warm connection', text: 'The edge\'s connection to the app server is already open, so no new handshake. Just one long RTT.', go: ['e>app', 'res:app>e'], msg: 'Cache-Control: private, no-store' },
          { title: 'The answer, not cached', text: 'The header said private, no-store: the edge kept no copy. The next user will never get Riya\'s feed.', go: 'res:e>u', set: { e: { state: 'ok', sub: 'not cached' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Video pieces (segments) through a CDN' },
    { type: 'p', html: `Online video is not sent as one long file. It is cut into small <strong>segments</strong> of 2-6 seconds (separate files), separately for each quality (360p, 720p, 1080p). A small playlist file (the <strong>manifest</strong>) says which pieces exist. The player asks for one piece at a time.` },
    { type: 'list', items: [
      '<strong>Perfect for a CDN:</strong> each piece is a normal small file that lakhs of people ask for. After the first viewer, everyone gets it from the edge.',
      '<strong>Live match:</strong> new pieces are made every few seconds, so the manifest\'s TTL is very short (1-2 s), but pieces never change, so their TTL is long.',
      '<strong>The shield matters most here:</strong> as soon as a new piece is made, thousands of edges ask for it together. Without a shield + collapsing, the origin would drown.',
      'The full design of a platform like Hotstar (encoder, packager, ABR) is in the "Design Hotstar" lesson.',
    ]},

    { type: 'h2', text: 'Multi-CDN: one CDN is not enough' },
    { type: 'callout', tone: 'term', title: 'New word: multi-CDN', html: `<strong>What it is:</strong> more than one CDN company (CDN A, CDN B) together. A "steering" layer (often DNS) decides for each user which CDN to use.<br><strong>Why we need it:</strong> (1) if one CDN falls over or is slow in some city, traffic moves to the other, (2) at huge live events even one CDN's capacity can fall short, (3) bargaining on price.<br><strong>Without it:</strong> a CDN outage = your outage.<br><strong>The cost:</strong> configuration twice, two bills, the cache is split in two places (a slightly lower hit rate), and purges must be done on both.` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'v', label: 'Viewers', sub: 'all of India', x: 80, y: 160, w: 130, kind: 'client', info: 'What it is: crores of users watching a live match. Each player asks DNS which CDN to get the video from.' },
        { id: 'st', label: 'DNS steering', sub: 'which CDN?', x: 262, y: 160, w: 150, kind: 'net', info: 'What it is: a smart DNS (or steering service) that gives each user the address of CDN A or CDN B, based on their speed, errors and capacity.' },
        { id: 'a', label: 'CDN A', sub: 'edges', x: 470, y: 70, w: 140, kind: 'edge', info: 'What it is: the edges of the first CDN company. On a normal day, the larger share of traffic.' },
        { id: 'b', label: 'CDN B', sub: 'edges', x: 470, y: 250, w: 140, kind: 'edge', info: 'What it is: the second CDN company. Some traffic always goes here too, so that it stays "warm" and ready when needed.' },
        { id: 'sh', label: 'Origin shield', sub: 'yours', x: 645, y: 160, w: 120, kind: 'server', info: 'What it is: your shield + origin. Both CDNs fetch pieces from here, and the shield collapses the requests of both.' },
      ],
      edges: [{ a: 'v', b: 'st' }, { a: 'st', b: 'a' }, { a: 'st', b: 'b' }, { a: 'a', b: 'sh' }, { a: 'b', b: 'sh' }],
      scenarios: [
        { name: 'A normal day', steps: [
          { title: 'Steering splits the traffic', text: 'Say 70% to CDN A and 30% to CDN B. Both stay warm.', flood: { paths: ['v>st>a', 'v>st>b'], n: 14 }, after: { a: { state: 'hit', sub: '70% traffic' }, b: { state: 'hit', sub: '30% traffic' } } },
          { title: 'Both from the shield', parallel: true, go: ['a>sh', 'b>sh'], text: 'For a new piece, both CDNs ask the shield. Only the shield\'s requests reach the origin.' },
        ]},
        { name: 'CDN A is slow', intro: 'In one city, errors went up on CDN A\'s edges.', steps: [
          { title: 'Errors show up', text: 'Players and monitoring report that CDN A is slow.', set: { a: { state: 'down', sub: 'errors!' } }, go: 'lost:st>a' },
          { title: 'Steering changes the road', text: 'New DNS answers now give CDN B\'s address. The player takes the next piece from CDN B; the video keeps playing.', flood: { paths: ['v>st>b'], n: 14 }, after: { b: { state: 'hot', sub: '100% traffic' } } },
          { title: 'Headroom is a must', text: 'CDN B suddenly had to carry all the traffic. If it did not have that much spare capacity (headroom), it will fall over too. That is why capacity is agreed with each CDN in advance before big events.', focus: ['b'] },
        ]},
      ],
    },
    { type: 'p', html: `<strong>The real world:</strong> Hotstar has used Akamai as a CDN since 2015. According to Akamai's May 2019 press release, the 1.86 crore (18.6 million) concurrent viewers of the IPL 2019 final were reached through Akamai's platform. Big live platforms usually keep more than one CDN; this is the general industry approach. Hotstar's full design is in the "Design Hotstar" lesson.` },
    { type: 'h2', text: 'Real CDN companies' },
    { type: 'table', head: ['CDN', 'What is special', 'Size (from the company\'s own page, 2026)'], rows: [
      ['<strong>Cloudflare</strong>', 'Anycast network; along with the CDN, DDoS protection, WAF, code at the edge (Workers); also a free plan', '340+ cities, 100+ countries'],
      ['<strong>Akamai</strong>', 'One of the oldest CDNs (1998); big media and live sports, like Hotstar', '4,400+ edge PoPs, 130+ countries'],
      ['<strong>Amazon CloudFront</strong>', 'Easy with AWS (S3, load balancers); Origin Shield, signed URLs/cookies', '750+ PoPs, 1,140+ embedded PoPs (inside ISPs), 15 regional edge caches'],
      ['<strong>Fastly, Google Cloud CDN, Azure Front Door</strong>', 'Fastly: very fast purges and configuration at the edge; Google/Azure: together with their own cloud', '(numbers not given here)'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: embedded PoP', html: `<strong>What it is:</strong> a CDN server placed inside the <em>own</em> network of an internet company (an ISP, like Jio or Airtel).<br><strong>Why we need it:</strong> the user's data never leaves the ISP's network: an even smaller RTT, and the ISP saves outside bandwidth.<br><strong>Example:</strong> Netflix and big CDNs place servers like this inside ISPs, especially for video.` },

    { type: 'h2', text: 'What to put on a CDN, and what not' },
    { type: 'compare',
      left: { title: 'Cache it on the CDN', html: `• Images, videos, CSS, JS, fonts<br>• Downloads (apps, PDFs)<br>• API responses that are the same for everyone (live score, trending list), with a short TTL<br>• Small segments of streaming video` },
      right: { title: 'Pass it through the CDN, do not cache it', html: `• Different for each user (feed, profile settings, cart)<br>• Private data (bank balance)<br>• Writes (POST, payment)<br>• These still get the CDN\'s acceleration and DDoS protection` },
    },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Anything that is <strong>the same for many users</strong> goes on the CDN: images, JS/CSS, video segments, and even API responses, like a live cricket score JSON with a 1-2 second TTL. Give files made by the build versioned names + a 1 year TTL. Each user's own data can <em>pass through</em> the CDN (fast handshake, DDoS protection), but with <code>private</code>/<code>no-store</code>. For very big events, use an origin shield + multi-CDN.` },
    { type: 'callout', tone: 'warn', html: `The most dangerous mistake: sending a user-specific response with <code>Cache-Control: public</code>. The CDN will cache it, and the next user will see someone else's data. Put <code>private</code> or <code>no-store</code> on private responses, and double-check the CDN's cache settings on logged-in pages.` },

    { type: 'diagram', title: 'CDN: the whole picture', height: 600,
      groups: [
        { label: 'Users', x: 20, y: 14, w: 680, h: 92 },
        { label: 'DNS + CDN edges', x: 20, y: 124, w: 680, h: 190 },
        { label: 'Origin side (xyz.com)', x: 20, y: 346, w: 680, h: 230 },
      ],
      nodes: [
        { id: 'uc', label: 'User, Chennai', x: 150, y: 60, w: 150, kind: 'client', info: 'What it is: a user in Chennai. DNS/anycast sends them to the Chennai PoP. Their browser cache is also the first layer.' },
        { id: 'ud', label: 'User, Delhi', x: 570, y: 60, w: 150, kind: 'client', info: 'What it is: a user in Delhi. In this example, steering sent them to CDN B\'s Delhi PoP (multi-CDN).' },
        { id: 'dns', label: 'DNS / anycast', sub: 'nearest edge', x: 360, y: 165, w: 150, kind: 'net', info: 'What it is: the system that sends the user to the nearest (and healthy) edge: a GeoDNS answer or anycast routing. In multi-CDN it also does the steering.' },
        { id: 'ea', label: 'CDN A edge', sub: 'Chennai PoP', x: 150, y: 270, w: 150, kind: 'edge', info: 'What it is: CDN A\'s cache server in Chennai. It keeps files according to the cache key + Cache-Control, checks signed URLs, and sends dynamic API calls to the origin over a warm connection.' },
        { id: 'eb', label: 'CDN B edge', sub: 'Delhi PoP', x: 570, y: 270, w: 150, kind: 'edge', info: 'What it is: the second CDN company\'s Delhi edge. Multi-CDN: if one CDN falls over or is slow, traffic comes here.' },
        { id: 'ci', label: 'Deploy', sub: 'purge API', x: 360, y: 270, w: 130, kind: 'queue', info: 'What it is: the xyz.com deploy pipeline / admin. It gives build files new (versioned) names, and on a mistake sends a purge to both CDNs.' },
        { id: 'sh', label: 'Origin shield', sub: 'collapses misses', x: 360, y: 395, w: 170, kind: 'net', info: 'What it is: a big cache layer between the edges and the origin. The misses of all edges (of both CDNs) collapse here, so the origin gets ~1 request per object.' },
        { id: 'app', label: 'App servers', sub: 'APIs, signs URLs', x: 170, y: 520, w: 170, kind: 'server', info: 'What it is: xyz.com\'s dynamic origin. Feed, login and payment live here. It makes the signed URL for premium video.' },
        { id: 'store', label: 'Object storage', sub: 'images, video', x: 550, y: 520, w: 170, kind: 'data', info: 'What it is: the origin for static files (like S3): images, JS/CSS, video segments. A private bucket that only the CDN/shield can read.' },
      ],
      edges: [
        { a: 'uc', b: 'dns', label: 'where to go?' },
        { a: 'ud', b: 'dns' },
        { a: 'uc', b: 'ea', n: 1 },
        { a: 'ud', b: 'eb' },
        { a: 'ea', b: 'sh', n: 2, label: 'miss' },
        { a: 'eb', b: 'sh', label: 'miss' },
        { a: 'sh', b: 'store', n: 3, label: 'once' },
        { a: 'ea', b: 'app', dashed: true, label: 'dynamic API' },
        { a: 'ci', b: 'ea', kind: 'evt', label: 'purge' },
        { a: 'ci', b: 'eb', kind: 'evt', label: 'purge' },
      ],
      paths: [
        { name: 'Image HIT', text: 'DNS pointed to the Chennai edge. The edge had a copy: ~10-20 ms, and the origin did not even notice.', go: ['uc>dns', 'uc>ea'] },
        { name: 'New video (MISS)', text: 'A miss at the edge, and at the shield too: the shield fetched it from storage once. All the other edges got it from the shield.', go: ['uc>ea>sh>store'] },
        { name: 'Feed API', text: 'Not cached, but faster thanks to the handshake at the edge and a warm connection. The response is private, no-store.', go: ['uc>ea>app'] },
        { name: 'Purge + multi-CDN', text: 'Deploy sent a purge to both CDNs. The Delhi user is on CDN B; their miss also collapses at the same shield.', go: ['ci>ea', 'ci>eb', 'ud>dns', 'ud>eb>sh'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A CDN = cache servers around the world (edges, PoPs). The user gets a nearby copy: a small RTT, less load and a smaller bandwidth bill at the origin.</li>
      <li>The user reaches the nearby edge through DNS (GeoDNS) or anycast.</li>
      <li>A pull CDN fetches from the origin by itself on a miss (the default). With a push CDN you upload in advance.</li>
      <li>Put only what changes the response into the cache key. Cookies/tracking params = a ruined hit rate.</li>
      <li>The origin says through <code>Cache-Control</code> who keeps it and for how long: max-age, s-maxage, private, no-store, stale-while-revalidate.</li>
      <li>Purge for mistakes; versioned names + a long TTL for build files (no purge needed at all).</li>
      <li>Origin shield + request collapsing: thousands of misses → ~1 request at the origin.</li>
      <li>Dynamic content is also faster through a CDN (handshake nearby, warm connections); signed URLs for private content; multi-CDN for big events.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Much lower latency for users', 'Much less load and a much smaller bandwidth bill at the origin', 'The CDN carries traffic spikes and DDoS floods', 'Cached content keeps working even if the origin falls over', 'Dynamic APIs are faster too (handshake at the edge)'], costs: ['Risk of stale content (TTL/purge must be managed)', 'Personalised data is not cached', 'One more vendor and bill (two with multi-CDN)', 'A wrong cache config can leak private data', 'Harder debugging: is the problem in the browser, edge, shield or origin?'] },
    { type: 'think', questions: [
      { q: '3 crore users watch a live score, and each app polls every 5 seconds. What is the load on the origin without a CDN, and with a CDN (TTL 2 s, 100 edges)?', a: 'Without a CDN: 3,00,00,000 ÷ 5 = 60 lakh requests/sec at the origin. With the CDN: each edge sends ~1 request every 2 s = ~50 req/s at the origin (even fewer with a shield). Users see a score that is at most a few seconds old.' },
      { q: 'A wrong image was uploaded by mistake and the TTL is 1 day. What will you do? And how will you stop it from happening again?', a: 'Now: send a purge for that URL to the CDN. For the future: keep a version/hash in image URLs; a new image = a new URL, so you never worry about the old one. And remember the browser cache: a purge only cleans the CDN; users\' browsers may keep their copy until max-age ends.' },
      { q: 'The xyz.com CDN hit ratio is only 30%, even though most traffic is images. What will you check?', a: 'Are cookies or tracking query params in the cache key? Is the origin sending Cache-Control, or no-store/private? Is a Set-Cookie header coming with the images (many CDNs do not cache such responses)? Is the TTL too short? Is the origin shield on? Are there far too many different URLs for each image size/format?' },
    ]},
    { type: 'quiz', questions: [
      { q: 'If a file is not on the CDN edge (in a pull CDN), what happens?', options: ['Error 404', 'The edge fetches it from the origin (or shield) and caches it', 'The user is redirected to the origin'], answer: 1, explain: 'Pull CDN: on a miss, fetch from upstream, then cache.' },
      { q: 'Which is wrong to cache on a CDN?', options: ['The company logo', 'A user\'s shopping cart', 'A video segment'], answer: 1, explain: 'It is different for each user and private. It can pass through the CDN, but with private/no-store.' },
      { q: 'What does an origin shield do?', options: ['Encrypts the origin against DDoS', 'Combines the misses of many edges and sends fewer requests to the origin', 'Provides the TLS certificate'], answer: 1, explain: 'A collapsing cache layer between the edges and the origin.' },
      { q: '<code>Cache-Control: public, max-age=60, s-maxage=600</code>. What happens after 5 minutes?', options: ['Both the browser and the CDN fetch from the origin', 'The browser\'s copy has expired, but the CDN\'s is fresh: a HIT from the CDN', 'Both copies are fresh'], answer: 1, explain: 's-maxage applies only to shared caches (the CDN). Browser 60 s, CDN 600 s.' },
      { q: 'Someone pushed the expiry in a signed URL one day forward. What does the edge do?', options: ['Serves it until the new expiry', '403: the signature will no longer match', 'Asks the origin'], answer: 1, explain: 'The signature was made from path + expiry + secret. If any part changes, the signature the edge makes comes out different.' },
    ]},
    { type: 'sources', note: 'Numbers and facts were checked with these (company size numbers from their own pages in 2026).', items: [
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control', used: 'The meaning of max-age, s-maxage, public/private, no-cache, no-store, stale-while-revalidate, stale-if-error, immutable.' },
      { title: 'Use Amazon CloudFront Origin Shield', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html', used: 'The origin shield idea: collapsing requests across regions, as few as one origin request per object.' },
      { title: 'Amazon CloudFront key features', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/cloudfront/features/', used: '750+ PoPs, 1,140+ embedded PoPs, 15 regional edge caches.' },
      { title: 'Serve private content with signed URLs and signed cookies', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html', used: 'Signed URLs vs signed cookies, expiry, private origin.' },
      { title: 'Cloudflare global network', publisher: 'Cloudflare', official: true, url: 'https://www.cloudflare.com/network/', used: '348 cities, 100+ countries ("340+" in the lesson).' },
      { title: 'What is Anycast?', publisher: 'Cloudflare Learning Center', official: true, url: 'https://www.cloudflare.com/learning/cdn/glossary/anycast-network/', used: 'Anycast: one IP from many data centers.' },
      { title: 'Instant Purge: invalidating cached content in under 150ms', publisher: 'Cloudflare blog', official: true, url: 'https://blog.cloudflare.com/instant-purge/', used: '2024 post: global purge averages under 150 ms.' },
      { title: 'Akamai global infrastructure', publisher: 'Akamai', official: true, url: 'https://www.akamai.com/why-akamai/global-infrastructure', used: '4,400+ edge PoPs, 130+ countries.' },
      { title: 'With 18.6 Million Simultaneous Viewers Streaming VIVO IPL, Hotstar Shatters Viewership Record Again', publisher: 'Akamai press release (via Streaming Media)', url: 'https://www.streamingmediaglobal.com/PressRelease/With-18.6-Million-Simultaneous-Viewers-Streaming-VIVO-IPL-Hotstar-Shatters-Viewership-Record-Again_49306.aspx', used: 'May 2019: IPL final, 18.6M concurrent, Akamai\'s platform.' },
      { title: 'Scaling Infrastructure for Millions: From Challenges to Triumphs (Part 1)', publisher: 'Disney+ Hotstar engineering blog', official: true, url: 'https://blog.hotstar.com/scaling-infrastructure-for-millions-from-challenges-to-triumphs-part-1-6099141a99ef', used: '2024 post: using the CDN as the external API gateway, cacheable APIs (scorecard) on the CDN.' },
      { title: 'File:NCDN - CDN.svg', publisher: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NCDN_-_CDN.svg', used: 'The single server vs CDN picture (CC0).' },
    ]},
  ],
});
