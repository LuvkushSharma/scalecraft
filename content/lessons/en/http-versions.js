Lesson.register({
  id: 'http-versions',
  title: 'HTTP/1.1, HTTP/2, HTTP/3',
  minutes: 22,
  summary: `To show one web page, the browser needs 50-100 files. Each new version of HTTP solved the same problem better: more files, less waiting. HTTP/1.1 gave us connection reuse, HTTP/2 sends all files together on one connection, and HTTP/3 left TCP for QUIC (on UDP) to fix packet loss and network switching.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `To open the xyz.com homepage, the browser has to fetch not one but 60 separate files: the page, the design, the code, photos, fonts.<br>Imagine you had to stand in line at one single window for every file, and each trip to the window and back took 0.2 seconds. 60 files = a lot of waiting.<br>The three versions of HTTP are three attempts to make this line shorter: <strong>1.1</strong> = keep the window open, do not close it every time. <strong>2</strong> = ask for all the files together at one window. <strong>3</strong> = if one file gets stuck, do not stop the others, and keep talking even when you move from WiFi to 4G.` },

    { type: 'h2', text: 'The problem: one page, lots of files' },
    { type: 'p', html: `The xyz.com homepage is not just one HTML file. It has CSS (design), JavaScript (code), a logo, 20 thumbnails and fonts. Each file needs one <strong>HTTP request</strong>. And each request has to go to the server and the answer has to come back (one <strong>round trip</strong>). One round trip from India to a US server is about 200 ms. If files come one after another, the page takes seconds to open.` },
    { type: 'callout', tone: 'term', title: 'Remember: RTT', html: `<strong>RTT (Round Trip Time)</strong>: the time it takes to send a message and get the answer back. The biggest enemy of web speed is often not bandwidth but RTT, because the speed of light is fixed. So the real game of every HTTP version is: <strong>cut down the round trips</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: HTTP and headers', html: `<strong>What it is:</strong> HTTP is the question-and-answer language between the browser and the server (layer 7). Every request has one line ("GET /logo.png") and several <strong>headers</strong>: extra information like the browser's name, cookies (your login identity), and which language you want.<br><strong>Why remember it:</strong> headers go with every request, and they are often 500-800 bytes, while the real request is small. 60 requests = the same headers 60 times. HTTP/2 made exactly this smaller.<br><strong>Without it:</strong> the server would not know who you are or what you are asking for.` },
    { type: 'code', text: `GET /images/logo.png HTTP/1.1
Host: xyz.com
User-Agent: Mozilla/5.0 (Linux; Android 14) Chrome/124...
Accept: image/avif,image/webp,*/*
Accept-Language: hi-IN,en;q=0.8
Cookie: session=8f3a...c91; theme=dark; ab_test=v2

HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 18342
Cache-Control: max-age=86400` },

    { type: 'h2', text: 'HTTP/1.0 and HTTP/1.1: keep the connection open' },
    { type: 'p', html: `In <strong>HTTP/1.0</strong> (1996), every file got a new TCP connection: handshake, one file, connection closed. The next file? Handshake again. With HTTPS, every file cost 2-3 RTTs just for "hello".` },
    { type: 'callout', tone: 'term', title: 'New word: keep-alive (persistent connection)', html: `<strong>What it is:</strong> do not close a TCP (+TLS) connection once it is made. Send the next request on the same one.<br><strong>Why we need it:</strong> the handshake cost (1-3 RTTs) is paid only once, not for every file. And the connection's congestion window (the cwnd from the last lesson) stays warm, so data moves fast.<br><strong>Without it:</strong> 60 files = 60 handshakes.<br><strong>Example:</strong> in <strong>HTTP/1.1</strong> (1997, today's standard is RFC 9112), keep-alive is on by default.` },
    { type: 'p', html: `But one big weakness was left in HTTP/1.1: on one connection, <strong>only one request-response at a time</strong>. The next request cannot go until the previous answer has fully arrived.` },
    { type: 'callout', tone: 'term', title: 'New word: head-of-line (HoL) blocking', html: `<strong>What it is:</strong> the one at the front of the line is slow, so everyone behind is stuck, even if their job takes 1 second.<br><strong>In HTTP/1.1:</strong> a big photo is coming, so a small CSS file waits behind it, and the page design arrives late.<br><strong>Why remember it:</strong> HTTP/2 removed the HTTP-level HoL, but the TCP-level HoL stayed. HTTP/3 removed that too. You will run this whole story below.` },
    { type: 'list', items: [
      `<strong>Pipelining (an idea that failed):</strong> HTTP/1.1 allowed sending several requests without waiting. But the answers still had to come back in <em>the same order</em>, so the HoL stayed the same, and many proxies did not handle it correctly. Browsers never turned it on.`,
      `<strong>6 connections (the workaround):</strong> browsers open about 6 parallel connections per domain. 6 lines = 6 files at a time. The price: 6 handshakes, 6 slow starts, and 6 times the connections on the server.`,
      `<strong>More workarounds:</strong> domain sharding (spread images over <code>img1.xyz.com</code> and <code>img2.xyz.com</code> to get 12 connections), sprites (many icons in one image), bundling (all the JS in one file). These were all ways to hide the weakness of HTTP/1.1.`,
    ]},

    { type: 'h2', text: 'Simulator: 12 files, five ways' },
    { type: 'p', html: `Below, the browser is loading 12 files (we assume an RTT of 100 ms). Switch the version. Then turn on "packet loss" and see which one suffers how much. Grey = connection setup (TCP + TLS), light = waiting in line, dark = the file is arriving, red = waiting for a lost packet.` },
    { type: 'custom', render(el) {
      const MODES = [['10', 'HTTP/1.0'], ['11', 'HTTP/1.1'], ['116', 'HTTP/1.1 × 6'], ['2', 'HTTP/2'], ['3', 'HTTP/3']];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${MODES.map(([k, n]) => `<button class="btn small" data-v="${k}">${n}</button>`).join('')}</div>
        <label style="display:flex;gap:6px;align-items:center;margin-top:10px"><input type="checkbox" class="hv-loss"> Packet loss (one packet of file 2 is lost)</label>
        <div class="hv-bars" style="margin-top:12px"></div>
        <div class="stats"><div class="stat"><span>Page ready</span><strong class="hv-t"></strong></div><div class="stat"><span>Connections</span><strong class="hv-c"></strong></div><div class="stat"><span>Files stuck by the loss</span><strong class="hv-h"></strong></div></div>
        <div class="calc-note hv-n"></div>`;
      const files = ['index.html', 'style.css', 'app.js', 'logo.png', 'font.woff2', 'photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg', 'photo6.jpg', 'photo7.jpg'];
      const RTT = 100, X = 20, F = 10;
      let v = '11';
      const model = (ver, loss) => {
        const rows = []; const L = i => loss && i === 1;
        if (ver === '10' || ver === '11') {
          let t = ver === '11' ? 2 * RTT : 0; let late = false;
          files.forEach((f, i) => {
            const g0 = ver === '10' ? t : 0, g1 = ver === '10' ? t + 2 * RTT : 2 * RTT, s = ver === '10' ? g1 : t;
            const ex = L(i) ? 2 * RTT : 0; const e = s + RTT + X + ex;
            if (loss && i > 1) late = true;
            rows.push({ f, g0, g1, s, e, lossAt: ex ? s + RTT : null, hit: ex > 0 || late }); t = e;
          });
          return { rows, conns: ver === '10' ? '12 (a new one per file)' : '1' };
        }
        if (ver === '116') {
          const ct = [0, 0, 0, 0, 0, 0].map(() => 2 * RTT); const hitc = new Set();
          files.forEach((f, i) => {
            const c = i % 6, s = ct[c], ex = L(i) ? 2 * RTT : 0, e = s + RTT + X + ex;
            if (ex) hitc.add(c);
            rows.push({ f, g0: 0, g1: 2 * RTT, s, e, lossAt: ex ? s + RTT : null, hit: ex > 0 || (hitc.has(c) && i > 1) }); ct[c] = e;
          });
          return { rows, conns: '6 (6 handshakes)' };
        }
        const setup = ver === '2' ? 2 * RTT : RTT, base = setup + RTT;
        files.forEach((f, i) => {
          let e = base + F * (i + 1), lossAt = null, hit = false;
          if (loss && ((ver === '2' && i >= 1) || (ver === '3' && i === 1))) { e += 2 * RTT; lossAt = base + F; hit = true; }
          rows.push({ f, g0: 0, g1: setup, s: setup, e, lossAt, hit });
        });
        return { rows, conns: '1' };
      };
      const NOTE = {
        '10': ['A new connection for every file: TCP + TLS handshake, then the request. 12 files = saying "hello" 12 times. The slowest.', 'A new connection for every file, and the lost packet of file 2 made all the files after it even later (they all go one after another).'],
        '11': ['One connection, keep-alive: the handshake happens only once. But only one file at a time. The other files wait in line (the light part): this is HTTP-level head-of-line blocking.', 'A packet of file 2 was lost: TCP sends it again, and all the files standing behind it in line arrive even later.'],
        '116': ['The browser workaround: 6 connections, 6 lines. The 12 files arrived in 2 rounds. The price: 6 handshakes and 6 times the connections on the server.', 'The loss stops only the line of that one connection (file 2, and file 8 behind it). The other 5 connections kept going.'],
        '2': ['HTTP/2: one connection, all 12 files together in separate streams (multiplexing). No line. One handshake.', 'The weakness of HTTP/2: all streams are on one TCP connection. TCP promises order, so when one packet is lost, ALL the other files on that connection stop, even if their data has already arrived. TCP-level head-of-line blocking.'],
        '3': ['HTTP/3 runs on QUIC: the connection and TLS handshakes happen together, so setup is one RTT shorter. Multiplexing is the same as in HTTP/2.', 'In HTTP/3, loss is handled separately for each stream: only file 2 stops, the other 11 keep going.'],
      };
      const draw = () => {
        el.querySelectorAll('[data-v]').forEach(b => b.className = 'btn small' + (b.dataset.v === v ? ' primary' : ''));
        const loss = el.querySelector('.hv-loss').checked, m = model(v, loss);
        const tot = Math.max(...m.rows.map(r => r.e)), max = Math.max(tot, 700);
        const pct = x => (x / max * 100).toFixed(2) + '%';
        el.querySelector('.hv-bars').innerHTML = m.rows.map(r => `
          <div style="display:grid;grid-template-columns:84px 1fr;gap:8px;align-items:center;margin:3px 0">
            <code style="font-size:11.5px">${r.f}</code>
            <div style="position:relative;height:13px;background:var(--surface-2);border-radius:4px;overflow:hidden">
              <div style="position:absolute;left:${pct(r.g0)};width:${pct(r.g1 - r.g0)};top:0;bottom:0;background:var(--line-2)"></div>
              ${r.s > r.g1 ? `<div style="position:absolute;left:${pct(r.g1)};width:${pct(r.s - r.g1)};top:0;bottom:0;background:var(--accent-soft)"></div>` : ''}
              <div style="position:absolute;left:${pct(r.s)};width:${pct(r.e - r.s)};top:0;bottom:0;background:var(--accent);border-radius:3px"></div>
              ${r.lossAt != null ? `<div style="position:absolute;left:${pct(r.lossAt)};width:${pct(2 * RTT)};top:0;bottom:0;background:var(--red)"></div>` : ''}
            </div></div>`).join('');
        el.querySelector('.hv-t').textContent = tot + ' ms';
        el.querySelector('.hv-c').textContent = m.conns;
        el.querySelector('.hv-h').textContent = loss ? String(m.rows.filter(r => r.hit).length) : '0';
        el.querySelector('.hv-n').textContent = NOTE[v][loss ? 1 : 0];
      };
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { v = b.dataset.v; draw(); });
      el.querySelector('.hv-loss').onchange = draw;
      draw();
    }},
    { type: 'p', html: `<strong>What you saw (no loss):</strong> HTTP/1.0 <strong>3840 ms</strong>, HTTP/1.1 with one connection <strong>1640 ms</strong>, 6 connections <strong>440 ms</strong>, HTTP/2 <strong>420 ms</strong> (only 1 connection), HTTP/3 <strong>320 ms</strong>. <strong>With loss:</strong> in HTTP/2, 11 files got stuck (620 ms); in HTTP/3, only 1 (420 ms). This is a simplified model. Real numbers depend on the network, but the pattern is exactly this.` },

    { type: 'h2', text: 'HTTP/2 (2015): one connection, many streams' },
    { type: 'callout', tone: 'term', title: 'New word: multiplexing, stream, frame', html: `<strong>What it is:</strong> HTTP/2 turns every request-response into a <strong>stream</strong> (a separate, numbered conversation), and cuts the data of each stream into small <strong>frames</strong>. Frames of many streams travel mixed together (interleaved) on one connection. Each frame has its stream number on it, so the other side puts them back together correctly. This is called <strong>multiplexing</strong>.<br><strong>Why we need it:</strong> 60 files at the same time, on one connection. No line, no 6-connection workaround.<br><strong>Without it (HTTP/1.1):</strong> one file at a time per connection.<br><strong>Example:</strong> a big photo (stream 5) is arriving, and frames of a small CSS file (stream 3) slip in between. The CSS does not wait for the photo.` },
    { type: 'list', items: [
      `<strong>Binary format:</strong> HTTP/1.1 was text (a person could read it). HTTP/2 sends binary frames: faster for machines and with fewer mistakes. The meaning stays the same: GET, headers and status codes are all the same.`,
      `<strong>Priorities:</strong> the browser can say "CSS first, photos later".`,
      `<strong>Server push (failed):</strong> the server could send files without being asked. It was hard to use well, and often sent useless data. Chrome turned it off in 2022 (version 106). Now "103 Early Hints" is used instead (the server only gives a hint about what will be needed).`,
      `<strong>Old workarounds now hurt:</strong> domain sharding breaks the one HTTP/2 connection into several. Very big bundles mean that even a small change breaks the cache of the whole file. With HTTP/2, it is fine to keep files small and separate.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: HPACK (header compression)', html: `<strong>What it is:</strong> HTTP/2's way of making headers smaller. Both sides build a <strong>table</strong> (a list to remember things). In the first request, headers like the cookie and the browser name are sent in full and written into the table. In later requests, only their small number (index) is sent: "the same cookie as #62".<br><strong>Why we need it:</strong> headers are almost the same in every request. Sending 700 bytes 60 times is wasteful, especially on a slow mobile upload.<br><strong>Without it:</strong> sometimes more bytes went into headers than into the page's real data.<br><strong>Example:</strong> in HTTP/3 its sibling is <strong>QPACK</strong>, which works with QUIC's separate streams.` },
    { type: 'p', html: `Move the sliders: how many requests, and how big the headers of each request are. The model is simple: in HPACK, the first request sends the headers in full, and each later request takes ~30 bytes (only table numbers and what changed, like the file path).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Requests: <strong class="hp-nv"></strong></label><input type="range" class="hp-n" aria-label="Requests" min="1" max="100" step="1" value="60"></div>
        <div><label>Headers per request: <strong class="hp-hv"></strong> bytes</label><input type="range" class="hp-h" aria-label="Header bytes" min="200" max="1500" step="50" value="700"></div></div>
        <div class="stats"><div class="stat"><span>HTTP/1.1 (full every time)</span><strong class="hp-a"></strong></div><div class="stat"><span>HTTP/2 HPACK (about)</span><strong class="hp-b"></strong></div><div class="stat"><span>Saved</span><strong class="hp-s"></strong></div></div>
        <div class="calc-note hp-x"></div>`;
      const REP = 30;
      const kb = b => b >= 1000 ? (b / 1000).toFixed(1) + ' KB' : b + ' B';
      const draw = () => {
        const n = +el.querySelector('.hp-n').value, h = +el.querySelector('.hp-h').value;
        const a = n * h, b = h + (n - 1) * REP, s = Math.round((1 - b / a) * 100);
        el.querySelector('.hp-nv').textContent = n; el.querySelector('.hp-hv').textContent = h;
        el.querySelector('.hp-a').textContent = kb(a); el.querySelector('.hp-b').textContent = kb(b); el.querySelector('.hp-s').textContent = s + '%';
        el.querySelector('.hp-x').textContent = `HTTP/1.1: ${n} × ${h} = ${a} bytes. HPACK: ${h} + ${n - 1} × ${REP} = ${b} bytes. ` + (n === 1 ? 'With only one request there is no saving: the table is being built for the first time.' : 'The more requests, the bigger the saving, because repeated headers become just a number.');
      };
      el.querySelector('.hp-n').oninput = draw; el.querySelector('.hp-h').oninput = draw; draw();
    }},
    { type: 'callout', tone: 'warn', title: 'The weakness HTTP/2 kept: TCP-level head-of-line blocking', html: `HTTP/2 removed the HTTP-level line, but underneath there is still <strong>one TCP connection</strong>. TCP does not even know about streams: it just delivers bytes in order. When one packet is lost, TCP holds back all the bytes behind it, even if they belong to another stream. On a bad mobile network (2% loss), HTTP/2 can sometimes do even worse than HTTP/1.1 with 6 connections, because there one loss stopped only one connection. "HTTP/2 + packet loss" in the simulator shows exactly this.` },
    { type: 'h2', text: 'HTTP/3 (2022): drop TCP, bring in QUIC' },
    { type: 'p', html: `The HoL of TCP lives inside TCP itself. And TCP is built into the operating system (kernel) of every computer, so changing it takes years. So Google built a new transport that runs <strong>on top of UDP</strong>, inside the app. Later the IETF made it a standard: <strong>QUIC</strong> (RFC 9000, 2021), and on top of it <strong>HTTP/3</strong> (RFC 9114, June 2022).` },
    { type: 'callout', tone: 'term', title: 'New word: QUIC', html: `<strong>What it is:</strong> a transport protocol built on top of UDP that does all of TCP's jobs itself (delivering every byte, order, resending, speed control) and has TLS 1.3 encryption built in. Just one difference: <strong>it keeps separate accounts for each stream</strong>.<br><strong>Why we need it:</strong> if a packet of stream 5 is lost, only stream 5 stops, and the CSS of stream 3 reaches the browser right away.<br><strong>Without it:</strong> with HTTP/2 + TCP, one lost packet stops all streams.<br><strong>Why on UDP:</strong> UDP is a blank canvas that every router and OS already understands. If you invented a brand new protocol, old routers and firewalls on the way would drop it. Hidden inside UDP, it reaches everywhere.` },
    { type: 'list', items: [
      `<strong>Faster handshake:</strong> QUIC does the connection and TLS 1.3 handshakes together: 1 RTT on a new connection (TCP + TLS 1.3 needs 2 RTTs). For a returning user, <strong>0-RTT</strong>: the request goes in the very first packet (with the replay risk, so only for safe requests).`,
      `<strong>Connection migration:</strong> a TCP connection is identified by its 4-tuple (IPs + ports). The phone moved from WiFi to 4G, the IP changed, the connection broke: a new handshake. QUIC gives each connection a <strong>connection ID</strong>. Even if the IP changes, the ID stays the same and the connection keeps going.`,
      `<strong>Everything encrypted:</strong> even most of QUIC's headers are encrypted, so boxes on the way cannot peek inside or tamper with it.`,
      `<strong>Weaknesses:</strong> some office networks block UDP; then the browser quietly falls back to HTTP/2. QUIC runs inside the app (user space), so on very fast links it uses more CPU. Load balancers and firewalls have to be prepared for UDP 443.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: connection ID', html: `<strong>What it is:</strong> a random number name for a QUIC connection, written on every packet.<br><strong>Why we need it:</strong> the server must know "which conversation is this packet from", without relying on the IP and port, because on mobile the IP keeps changing.<br><strong>Without it (TCP):</strong> IP changed = connection dead = handshake again, and the running download or video gets stuck.` },
    { type: 'p', html: `Now run it on a phone: the HTTP/2 happy path, HTTP/2 vs HTTP/3 under packet loss, and switching from WiFi to 4G while leaving home:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'ph', label: 'Phone', sub: 'browser / app', x: 90, y: 150, w: 130, kind: 'client', info: 'What it is: Riya\'s phone, opening the xyz.com page and a video. The browser itself decides whether to speak HTTP/2 or HTTP/3.' },
        { id: 'wifi', label: 'Home WiFi', sub: 'IP: 49.36.10.20', x: 290, y: 70, w: 150, kind: 'net', info: 'What it is: the home WiFi network. Through it, the phone has one outside IP. As soon as she leaves home, this network is gone.' },
        { id: 'fw', label: 'Office firewall', sub: 'UDP blocked', x: 290, y: 150, w: 150, kind: 'threat', hidden: true, info: 'What it is: the firewall of some offices, which blocks UDP traffic (port 443 too). QUIC is on UDP, so HTTP/3 will not work here.' },
        { id: 'tower', label: '4G tower', sub: 'IP: 100.72.5.9', x: 290, y: 230, w: 150, kind: 'net', info: 'What it is: the mobile network. Here the phone gets a completely different IP. For TCP this is a new connection, for QUIC it is not.' },
        { id: 'edge', label: 'CDN edge', sub: 'HTTP/2 + HTTP/3', x: 510, y: 150, w: 160, kind: 'edge', info: 'What it is: an xyz.com server sitting close to the user (CDN). It speaks all three versions: HTTP/3 (UDP 443), and HTTP/2 / HTTP/1.1 (TCP 443). In its response, the Alt-Svc header says "I also have HTTP/3".' },
      ],
      edges: [{ a: 'ph', b: 'wifi' }, { a: 'ph', b: 'tower' }, { a: 'ph', b: 'fw' }, { a: 'wifi', b: 'edge' }, { a: 'tower', b: 'edge' }, { a: 'fw', b: 'edge' }],
      scenarios: [
        { name: 'HTTP/2: one connection', intro: 'One TCP + TLS connection, with three files on it at the same time.', steps: [
          { title: 'Three requests together', text: 'Stream 1 = the page, stream 3 = CSS, stream 5 = a photo. All three on one connection, with no waiting. Headers are made small by HPACK.', go: 'ph>wifi>edge', msg: 'HEADERS s1: GET /   s3: GET /style.css   s5: GET /photo.jpg' },
          { title: 'Frames come back mixed', text: 'The server sends the frames of all three interleaved. The small CSS does not wait for the big photo.', go: 'res:edge>wifi>ph', msg: 'DATA s3 | DATA s1 | DATA s5 | DATA s3 (end) | DATA s5 ...', after: { ph: { state: 'ok' } } },
          { title: 'Next time: HTTP/3', text: 'The response had a header: <code>Alt-Svc: h3=":443"</code>. The browser remembers that this server also has HTTP/3, and will try QUIC next time.', focus: ['edge'], msg: 'Alt-Svc: h3=":443"; ma=86400' },
        ]},
        { name: 'Loss: HTTP/2', intro: 'Failure: one packet was lost on the WiFi. HTTP/2 has TCP underneath.', steps: [
          { title: 'Data of three streams is arriving', text: 'Frames of the CSS (s3), the page (s1) and the photo (s5), all in one TCP line of bytes.', go: 'res:edge>wifi', msg: 's1 | s3 | s5 | s3 | s5' },
          { title: 'A photo packet is lost', text: 'Only one packet of stream 5 (the photo) was dropped.', go: 'lost:wifi>ph', set: { wifi: { state: 'warn' } }, msg: 's5 packet ✗' },
          { title: 'Everything stops', text: 'The CSS and page data have reached the phone, but TCP does not give them to the browser, because a piece in the middle of the byte line is missing. All three streams wait: TCP-level head-of-line blocking.', focus: ['ph'], set: { ph: { state: 'warn', sub: 's1 s3 s5 stuck' } } },
          { title: 'Retransmit, then everything moves', text: 'After about one RTT, the lost packet arrives again, and only then do all three streams move forward.', go: 'res:edge>wifi>ph', set: { wifi: { state: '' } }, after: { ph: { state: 'ok', sub: 'browser / app' } } },
        ]},
        { name: 'Loss: HTTP/3', intro: 'The same loss, but this time on QUIC.', steps: [
          { title: 'Data of three streams is arriving', text: 'The same three streams, but QUIC keeps separate accounts for each stream.', go: 'res:edge>wifi', msg: 's1 | s3 | s5 | s3 | s5' },
          { title: 'A photo packet is lost', text: 'Again, only one packet of stream 5 was dropped.', go: 'lost:wifi>ph', set: { wifi: { state: 'warn' } }, msg: 's5 packet ✗' },
          { title: 'Only the photo waits', text: 'The CSS and the page reached the browser right away, and the page design appeared. Only the photo waited one RTT, and its packet came again.', focus: ['ph'], set: { ph: { state: 'ok', sub: 's1 ✓ s3 ✓ s5 wait' } } },
          { title: 'The photo arrives too', text: 'After the retransmit, stream 5 is complete too. The other streams did not even notice.', go: 'res:edge>wifi>ph', set: { wifi: { state: '' } }, after: { ph: { sub: 'all ✓' } } },
        ]},
        { name: 'WiFi → 4G', intro: 'Riya left home while watching a video. WiFi is gone, 4G is here. The phone\'s IP changed.', steps: [
          { title: 'The video plays on WiFi', text: 'An HTTP/3 connection, connection ID = 7f3c. The phone\'s IP is 49.36.10.20.', go: 'res:edge>wifi>ph', msg: 'QUIC conn-id 7f3c, video chunks' },
          { title: 'WiFi is gone', text: 'Out of the house. The WiFi path is over. With TCP, the connection would die right here (its identity was IP + port), and a new TCP + TLS handshake would be needed: a 2 RTT freeze.', set: { wifi: { state: 'down', sub: 'no signal' } }, focus: ['ph'] },
          { title: 'Same connection, new IP', text: 'The phone sends the next packet over 4G, from the new IP 100.72.5.9, but with the same connection ID 7f3c. The edge recognises it (and verifies the new path with a small check).', go: 'ph>tower>edge', msg: 'from 100.72.5.9  conn-id 7f3c' },
          { title: 'The video kept playing', text: 'No new handshake. This is called <strong>connection migration</strong>. It helps mobile users a lot in trains, autos and the metro.', go: 'res:edge>tower>ph', after: { ph: { state: 'ok' } } },
        ]},
        { name: 'Office: UDP blocked', intro: 'Failure: Riya is at the office, where the firewall blocks UDP.', steps: [
          { title: 'Tried HTTP/3', text: 'The browser remembers that xyz.com has HTTP/3, so it sends the first QUIC (UDP 443) packet.', show: ['fw'], go: 'lost:ph>fw', msg: 'QUIC Initial (UDP 443)' },
          { title: 'No answer', text: 'The firewall dropped the UDP. The browser does not wait long: at the same time, or a moment later, it also tries a TCP connection.', focus: ['fw'], set: { fw: { state: 'warn' } } },
          { title: 'Back to HTTP/2', text: 'TCP 443 is allowed. The page opened over HTTP/2. The user did not even notice. That is why servers always keep HTTP/2 (and 1.1) running: HTTP/3 is a bonus, not the only road.', go: ['ph>fw>edge', 'res:edge>fw>ph'], after: { ph: { state: 'ok', sub: 'ran on HTTP/2' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTP/3 is on UDP, so it is unreliable"', html: `Wrong. UDP is only the box underneath. On top of it, QUIC does retransmission, ordering, congestion control and encryption itself, just as reliable as TCP + TLS. The only difference: this work is done <strong>separately for each stream</strong>.` },
    { type: 'h2', text: 'All three in one table' },
    { type: 'table', head: ['', 'HTTP/1.1 (1997)', 'HTTP/2 (2015)', 'HTTP/3 (2022)'], rows: [
      ['Transport underneath', 'TCP (+TLS)', 'TCP + TLS', 'QUIC (UDP), TLS 1.3 built in'],
      ['Format', 'Text', 'Binary frames', 'Binary frames'],
      ['On one connection', 'One request at a time', 'Many streams (multiplexing)', 'Many streams, each one separate'],
      ['Header compression', 'No', 'HPACK', 'QPACK'],
      ['Head-of-line blocking', 'HTTP level + TCP level', 'Only TCP level', 'No (only inside a stream)'],
      ['New connection (HTTPS)', 'TCP 1 + TLS 1-2 RTT', 'TCP 1 + TLS 1-2 RTT', '1 RTT (0-RTT for a returning user)'],
      ['Network changed (WiFi → 4G)', 'Connection breaks', 'Connection breaks', 'Connection migration: keeps going'],
      ['Usage today (Cloudflare Radar, around 2025-26)', '~25-30% of requests', '~50% of requests', '~20% of requests'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Public website / app (from browsers and mobiles):</strong> turn on both HTTP/2 and HTTP/3 at the CDN or load balancer, with HTTP/1.1 as a fallback. Mobile users and bad networks (common in India) gain the most from HTTP/3.<br><strong>Service-to-service calls inside:</strong> HTTP/2 (gRPC, a way for services to make fast, typed calls to each other, runs on it; it comes in the Phase 1 API lessons): multiplexing + streaming, and the data center network is clean, so TCP HoL shows up less.<br><strong>Old clients, simple tools, debugging:</strong> HTTP/1.1 is enough.<br>One rule: <strong>never make HTTP/3 the only road</strong>, because UDP is blocked in some places.` },

    { type: 'h2', text: 'What it means in system design' },
    { type: 'table', head: ['Situation', 'What to think about'], rows: [
      ['Mobile users, bad networks (common in India)', 'HTTP/3 helps the most: less freezing on loss, and the connection survives a network switch. Big CDNs and browsers support it.'],
      ['Internal service-to-service calls', 'gRPC runs on HTTP/2: multiplexing + streaming. In later lessons.'],
      ['Lots of very small files', 'After HTTP/2, there is less need to join them into one file (bundling) or to use domain sharding; sharding actually hurts.'],
      ['Load Balancer / CDN', 'Often speaks HTTP/2 or 3 outside, and HTTP/1.1 or 2 to the servers inside. This is the job of a reverse proxy (next lesson).'],
      ['Turning on HTTP/3', 'Open UDP 443 in the firewall / security group, make sure the LB supports UDP, and tell browsers with the Alt-Svc header or a DNS HTTPS record.'],
      ['Long-lived connections (chat, live)', 'Many streams on one HTTP/2 connection: fewer connections, less memory on the server.'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTP/2 = HTTPS"', html: `No. HTTPS only means "HTTP + TLS (the lock)". HTTP/1.1 can run over HTTPS too. It is true that in practice browsers speak HTTP/2 only over HTTPS, and in HTTP/3, TLS 1.3 is built in. So the version (1.1/2/3) and the lock (the S) are two separate questions.` },
    { type: 'diagram', title: 'HTTP versions: who uses which in xyz.com', height: 510,
      groups: [
        { label: 'Clients', x: 16, y: 40, w: 172, h: 332 },
        { label: 'CDN (close to the user)', x: 255, y: 150, w: 180, h: 100 },
        { label: 'Inside (private network)', x: 255, y: 282, w: 455, h: 218 },
      ],
      nodes: [
        { id: 'br', label: 'Chrome', sub: 'HTTP/3 (QUIC)', x: 100, y: 100, w: 150, kind: 'client', info: 'What it is: a new browser. It sees Alt-Svc and moves to HTTP/3: 1 RTT setup, only one stream stops on loss, and the connection survives WiFi → 4G.' },
        { id: 'app', label: 'Mobile app', sub: 'HTTP/2 or 3', x: 100, y: 210, w: 150, kind: 'client', info: 'What it is: the xyz.com Android/iPhone app. All API calls are multiplexed on one connection. If UDP is blocked, it uses HTTP/2.' },
        { id: 'old', label: 'Old client', sub: 'HTTP/1.1', x: 100, y: 320, w: 150, kind: 'client', info: 'What it is: an old device, script or tool (like curl) that only speaks HTTP/1.1. That is why the CDN does not turn HTTP/1.1 off.' },
        { id: 'cdn', label: 'CDN edge', sub: 'TLS + h1 / h2 / h3', x: 345, y: 200, w: 170, kind: 'edge', info: 'What it is: an xyz.com server in the user\'s city. It speaks all three versions, TLS ends here (the handshake is close by, so the RTT is short), and it reuses a warm HTTP/2 connection to the inside.' },
        { id: 'lb', label: 'Load Balancer', sub: 'L7, HTTP/2', x: 565, y: 200, w: 150, kind: 'edge', info: 'What it is: the front door of the data center. Only a few long, reused connections come from the CDN. It looks at the path and sends each request to the right service.' },
        { id: 'api', label: 'API service', x: 565, y: 340, w: 150, kind: 'server', info: 'What it is: the main API of xyz.com. It calls other services with gRPC (HTTP/2), and one old service with HTTP/1.1.' },
        { id: 'pay', label: 'Payment service', sub: 'gRPC', x: 565, y: 450, w: 150, kind: 'server', info: 'What it is: a service inside. gRPC runs on HTTP/2: thousands of calls multiplexed on one connection, binary and fast.' },
        { id: 'leg', label: 'Old service', sub: 'HTTP/1.1 only', x: 345, y: 450, w: 150, kind: 'server', info: 'What it is: an old system that only understands HTTP/1.1. We keep a keep-alive connection pool to it, so there is no handshake on every call.' },
      ],
      edges: [
        { a: 'br', b: 'cdn', n: 1, label: 'QUIC' },
        { a: 'app', b: 'cdn', label: 'HTTP/2' },
        { a: 'old', b: 'cdn', label: 'HTTP/1.1' },
        { a: 'cdn', b: 'lb', n: 2 },
        { a: 'lb', b: 'api', n: 3 },
        { a: 'api', b: 'pay', n: 4, label: 'gRPC' },
        { a: 'api', b: 'leg', label: 'HTTP/1.1 pool' },
      ],
      paths: [
        { name: 'New browser (HTTP/3)', text: 'Chrome uses QUIC to reach the CDN (1 RTT). Inside, the CDN reaches the LB and the API over an open HTTP/2 connection.', go: ['br>cdn>lb>api'] },
        { name: 'Mobile app (HTTP/2)', text: 'All the app\'s API calls are multiplexed on one connection. For payments, the API calls a service inside with gRPC.', go: ['app>cdn>lb>api>pay'] },
        { name: 'Old client', text: 'An HTTP/1.1 client works too: the CDN speaks its language, and everything inside stays the same.', go: ['old>cdn>lb>api'] },
        { name: 'Old service', text: 'The API calls an old service with HTTP/1.1, using a keep-alive pool.', go: ['api>leg'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>One page = dozens of files. The real enemy is RTT, so every version cuts round trips and waiting.</li>
      <li>HTTP/1.0: a new connection for every file. HTTP/1.1: keep-alive (connection reuse), but only one request at a time on a connection: HoL blocking. Browsers open about 6 connections.</li>
      <li>HTTP/2: binary frames, many streams on one connection (multiplexing), HPACK header compression. Server push failed (turned off in Chrome 106).</li>
      <li>The weakness of HTTP/2: TCP underneath, so one lost packet stops all streams.</li>
      <li>HTTP/3 = HTTP over QUIC (UDP): loss is handled per stream, the connection + TLS 1.3 handshake takes 1 RTT (0-RTT on resume), and the connection ID allows WiFi → 4G migration.</li>
      <li>If UDP is blocked somewhere, the browser falls back to HTTP/2: always keep HTTP/2 + 1.1 running.</li>
      <li>Decide: outside (CDN/LB) h2 + h3, inside gRPC (HTTP/2), 1.1 for old clients.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['HTTP/1.1 keep-alive: no new handshake for every file', 'HTTP/2: all files on one connection, fewer connections, smaller headers', 'HTTP/3: only one stream stops on loss, faster setup, the connection survives a network change', 'The meaning (GET, headers, status codes) is the same in all three: app code does not need to change'], costs: ['HTTP/1.1: HoL blocking, the 6-connection workaround', 'HTTP/2: TCP HoL remains, and on bad networks it can be worse than 1.1', 'HTTP/3: UDP is blocked in some places, more CPU, the LB/firewall must be prepared for UDP 443', 'Replay risk with 0-RTT'] },
    { type: 'think', questions: [
      { q: 'A user is on a train, the network drops for 1-2 seconds again and again, and the towers keep changing. Will HTTP/2 or HTTP/3 give a better experience, and why?', a: 'HTTP/3. On packet loss, only the affected stream stops, and when the network changes (a tower, or WiFi → 4G), connection migration happens thanks to the connection ID: no new handshake.' },
      { q: 'How did HTTP/2 solve the "too many connections" problem?', a: 'With multiplexing: all requests go together on one connection in separate streams, and the frames are interleaved. No new connection and handshake for every new file, and HPACK makes the headers small too.' },
      { q: 'An old team spread the xyz.com images over 4 domains (img1-img4.xyz.com) (domain sharding). What should be done after turning on HTTP/2?', a: 'Remove the sharding (or let all domains share one connection, for example with the same certificate and IP). Because of sharding, the one HTTP/2 connection breaks into 4: 4 handshakes, 4 slow starts, and the benefit of priorities is lost.' },
      { q: 'You turned on HTTP/3 at the CDN. Some corporate users did not complain, but their logs show only HTTP/2. What is happening?', a: 'Their office firewalls block UDP 443. The browser tries QUIC, gets no answer, and quietly falls back to HTTP/2 (TCP). This is exactly why HTTP/2 must always stay on.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What was the biggest improvement of HTTP/1.1 (compared with HTTP/1.0)?', options: ['Using UDP', 'Keep-alive: many requests on one connection', 'Binary frames'], answer: 1, explain: 'HTTP/1.0 opened a new connection for every file. In HTTP/1.1, the connection stays open by default.' },
      { q: 'The biggest new feature of HTTP/2?', options: ['Using UDP', 'Multiplexing on one connection', 'JSON format'], answer: 1, explain: 'Multiple streams on one TCP connection, with interleaved frames.' },
      { q: 'What does HPACK do?', options: ['Compresses images', 'Sends repeated headers as small numbers from a table', 'Does encryption'], answer: 1, explain: 'Both sides build a table. The first time the full header is sent, later only its index.' },
      { q: 'What does HTTP/3 run on?', options: ['TCP', 'QUIC (on top of UDP)', 'WebSocket'], answer: 1, explain: 'QUIC, which does reliability, congestion control and TLS 1.3 encryption itself, on top of UDP.' },
      { q: 'What happens in HTTP/2 on packet loss?', options: ['Only one file stops', 'All streams on that connection stop', 'Nothing'], answer: 1, explain: 'TCP guarantees order, so everything stops until the missing packet arrives.' },
      { q: 'The phone moved from WiFi to 4G. In which version does the connection keep going without a new handshake?', options: ['HTTP/1.1', 'HTTP/2', 'HTTP/3'], answer: 2, explain: 'QUIC identifies the connection by its connection ID, not by IP + port. This is called connection migration.' },
    ]},
    { type: 'sources', note: 'Versions, years and features were checked against these specs and posts.', items: [
      { title: 'RFC 9112: HTTP/1.1', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9112.html', used: 'Persistent connections by default, pipelining rules (responses in request order).' },
      { title: 'RFC 9113: HTTP/2', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9113.html', used: 'Streams, frames, multiplexing; replaces RFC 7540 (2015).' },
      { title: 'RFC 7541: HPACK, Header Compression for HTTP/2', publisher: 'IETF', official: true, year: 2015, url: 'https://www.rfc-editor.org/rfc/rfc7541.html', used: 'Static and dynamic tables, indexed header fields.' },
      { title: 'RFC 9000: QUIC, A UDP-Based Multiplexed and Secure Transport', publisher: 'IETF', official: true, year: 2021, url: 'https://www.rfc-editor.org/rfc/rfc9000.html', used: 'Per-stream delivery, connection IDs, connection migration with path validation.' },
      { title: 'RFC 9114: HTTP/3', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9114.html', used: 'HTTP over QUIC, Alt-Svc discovery, QPACK (RFC 9204) instead of HPACK.' },
      { title: 'Removing HTTP/2 Server Push from Chrome', publisher: 'Chrome for Developers', official: true, year: 2022, url: 'https://developer.chrome.com/blog/removing-push', used: 'Push disabled by default from Chrome 106; 103 Early Hints and preload as alternatives.' },
      { title: 'Adoption and Usage', publisher: 'Cloudflare Radar', official: true, url: 'https://radar.cloudflare.com/adoption-and-usage', used: 'Approximate share of requests by HTTP version (roughly half HTTP/2, about a fifth HTTP/3 in 2025-26).' },
    ]},
  ],
});
