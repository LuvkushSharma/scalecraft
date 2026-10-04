Lesson.register({
  id: 'tcp-udp-https',
  title: 'TCP, UDP and HTTPS',
  minutes: 24,
  summary: `On the internet, data travels in small pieces (packets), and some pieces get lost on the way. TCP makes sure every piece arrives, in the right order. UDP gives up that promise to be fast. HTTPS (TLS) makes sure nobody on the way can read or change your data.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine you are sending a long story to a friend, but you can only send one small postcard at a time. Some postcards will get lost on the way. Some will arrive in the wrong order.<br>This lesson has three questions: (1) <strong>How do we make sure every postcard arrives, in the right order?</strong> Answer: TCP. (2) <strong>When is it fine to lose a few postcards, as long as the rest arrive fast?</strong> Answer: UDP. (3) <strong>What if someone on the way reads a postcard?</strong> Answer: HTTPS.<br>You will run each one yourself: the handshake, a lost packet, the checksum, speed control, and the lock (encryption).` },

    { type: 'h2', text: 'First: what is a packet?' },
    { type: 'callout', tone: 'term', title: 'Remember: packet', html: `<strong>What it is:</strong> a small piece of data, usually up to about 1,500 bytes. Each packet has a label on top (the header): where it came from, where it is going, and some extra bookkeeping.<br><strong>Why we need it:</strong> we cannot send big data (a 2 MB page) in one go. The network handles small pieces easily, and if one piece is lost, only that piece has to be sent again.<br><strong>Without it:</strong> one mistake would mean sending the whole 2 MB again, and one big transfer would block the whole network.` },
    { type: 'p', html: `When the 2 MB page of xyz.com arrives, it is broken into about 1,400 packets. Each packet can take a different route. Some arrive late. Some arrive in the wrong order. And some get lost (weak WiFi, a very busy router).` },
    { type: 'p', html: `So the question is: <strong>if packet 47 is lost, what do we do?</strong> There are two answers to this question: <strong>TCP</strong> and <strong>UDP</strong>. Both follow fixed rules. A set of fixed rules like this is called a protocol.` },
    { type: 'callout', tone: 'term', title: 'New word: protocol', html: `<strong>What it is:</strong> fixed rules for how two computers talk. Who speaks first, what a message looks like, and what to do when something goes wrong.<br><strong>Why we need it:</strong> so that very different computers around the world (Android, iPhone, Linux servers) can understand each other.<br><strong>Without it:</strong> every company would speak its own language, and nobody could talk to anybody.<br><strong>Example:</strong> IP, TCP, UDP, TLS and HTTP are all protocols.` },

    { type: 'h2', text: 'Layers: who does which job' },
    { type: 'p', html: `Many protocols work together to make the internet work. Each one has a small job, and they sit on top of each other like "layers". An upper layer uses the layer below it, without knowing its inside details. The table has a few new words (port, sequence number, checksum, encryption). Do not worry: we will explain each of them in this lesson, one by one.` },
    { type: 'callout', tone: 'term', title: 'New word: OSI model (layers)', html: `<strong>What it is:</strong> a map that splits networking into 7 layers (floors). For system design you only need to remember three: <strong>layer 3</strong> (IP), <strong>layer 4</strong> (TCP/UDP) and <strong>layer 7</strong> (HTTP, the app's own conversation).<br><strong>Why we need it:</strong> when someone says "L4 load balancer" or "L7 firewall", you know at once how deep into the packet it reads.<br><strong>Without it:</strong> these words in design discussions will sound like a riddle.` },
    { type: 'table', head: ['Layer', 'Protocol', 'What it does', 'What it writes on the packet label'], rows: [
      ['7: Application', 'HTTP, DNS, gRPC', 'The app\'s real message: "give me the /videos page"', 'URL, headers, cookies'],
      ['(job of 6/5)', 'TLS', 'The lock: encryption, proof of the server\'s identity', 'Encrypted data'],
      ['4: Transport', 'TCP, UDP', 'Carries data from a program on one computer to a program on another', 'Port number, sequence number, checksum'],
      ['3: Network', 'IP', 'From one computer to another, through routers', 'Source IP, destination IP'],
      ['1-2: Physical / Link', 'WiFi, Ethernet, fiber', 'Bits on real wires or radio waves', 'Hardware address'],
    ]},
    { type: 'p', html: `Think of it like this: the HTTP message is a letter. TLS locks that letter inside a box. TCP cuts the box into numbered pieces and keeps track of every piece. IP writes the home address on every piece. WiFi actually sends it through the air.` },
    { type: 'callout', tone: 'tip', title: 'Where this helps in system design', html: `A <strong>load balancer</strong> is a machine that spreads incoming requests across many servers. An <strong>L4 load balancer</strong> only looks at IP and port: very fast, but it does not understand URLs. An <strong>L7 load balancer</strong> reads HTTP: it can send <code>/api</code> to one place and <code>/images</code> to another, but it does a bit more work. This comes in Phase 2, in the load balancer lesson.` },

    { type: 'h2', text: 'TCP: "every packet will arrive, in the right order"' },
    { type: 'callout', tone: 'term', title: 'New word: TCP', html: `<strong>What it is:</strong> Transmission Control Protocol. A layer 4 protocol that makes sure all data arrives, in the right order, with no copies.<br><strong>Why we need it:</strong> a web page, the JSON of an API, a payment amount, a chat message: if even one byte is missing or in the wrong place, the thing breaks.<br><strong>Without it:</strong> every app would have to write its own code for "which piece came, which did not, ask again". Bugs in every app.<br><strong>Example:</strong> every page and every API call of xyz.com runs on TCP (both HTTP/1.1 and HTTP/2).` },
    { type: 'p', html: `TCP does three jobs: (1) before sending data, it makes both sides "ready" (the <strong>handshake</strong>), (2) it gives every byte a number to keep count (the <strong>sequence number</strong>), (3) it sends again whatever did not arrive (<strong>retransmission</strong>).` },
    { type: 'callout', tone: 'term', title: 'New words: SYN, ACK, sequence number', html: `<strong>Sequence number (seq):</strong> a serial number for every byte. Like page numbers in a book. The receiver uses them to put data together and to find out what is missing in between.<br><strong>ACK (acknowledgement):</strong> the receiver's reply "I got everything up to here, now send from this number". <code>ack=101</code> means "I got up to 100, send 101".<br><strong>SYN (synchronize):</strong> the first packet, which says "shall we talk? my starting number is this". The starting number is random, so an outsider cannot guess it and sneak in fake packets.` },
    { type: 'callout', tone: 'term', title: 'New word: RTT (round trip time)', html: `<strong>What it is:</strong> the time it takes to send a message and get its reply back.<br><strong>Why it matters:</strong> every "ask and wait for the answer" step costs one RTT. Mumbai to a server in Mumbai: about 5-10 ms. India to the US: about 200 ms. The speed of light is fixed, so this cannot shrink. The only way to cut it is to bring the server closer.` },
    { type: 'p', html: `Now see how a connection is made, what happens when a packet is lost, what happens when the server is down, and how UDP is different. Click any box to read what it does:` },
    { type: 'flow', height: 260,
      nodes: [
        { id: 'c', label: 'Browser', sub: 'your phone', x: 90, y: 130, w: 140, kind: 'client', info: 'What it is: the program that starts the conversation (the client). Here, the browser on your phone that wants to open xyz.com. It also keeps the TCP bookkeeping (what was sent, what arrived).' },
        { id: 'r', label: 'WiFi router', sub: 'at home', x: 270, y: 130, w: 130, kind: 'net', info: 'What it is: the small box at home that connects your phone to the internet. It passes packets along. If too many packets come at once or the signal is weak, packets can be dropped right here.' },
        { id: 'i', label: 'Internet', sub: 'ISP routers', x: 450, y: 130, w: 130, kind: 'net', info: 'What it is: the chain of routers of your internet company (ISP) and of the whole world. Each router only looks at the destination IP and hands the packet to the next router. They do not keep TCP bookkeeping, so packets can get lost here too.' },
        { id: 's', label: 'xyz.com server', sub: '203.0.113.10', x: 625, y: 130, w: 150, kind: 'server', info: 'What it is: the computer where xyz.com runs. It is "listening" on port 443, which means it is waiting for new connections. (A port is the number of one program inside a computer. More in the next lesson.)' },
      ],
      edges: [{ a: 'c', b: 'r' }, { a: 'r', b: 'i' }, { a: 'i', b: 's' }],
      scenarios: [
        { name: 'TCP handshake', intro: 'Before sending data, both sides confirm they are "ready". This is called the 3-way handshake, because three messages are sent.', steps: [
          { title: 'SYN: "Shall we talk?"', text: 'The browser sends a SYN packet with its random starting number (seq=100).', go: 'c>r>i>s', msg: 'SYN  seq=100' },
          { title: 'SYN-ACK: "Yes, I am ready"', text: 'The server says yes, sends its own starting number (500), and with ack=101 it says that it got the browser\'s SYN.', go: 'res:s>i>r>c', msg: 'SYN-ACK  seq=500 ack=101' },
          { title: 'ACK: "Let\'s start"', text: 'The browser confirms. The connection is ready. This whole job took one RTT, and not a single byte of real data has been sent yet.', go: 'c>r>i>s', msg: 'ACK  ack=501', after: { c: { state: 'ok' }, s: { state: 'ok' } } },
          { title: 'Now the real data', text: 'Now the HTTP request goes. Every packet has a number, so the server always knows what arrived and what did not. Practical tip: the browser sends the request together with the ACK, so the handshake is counted as costing 1 RTT.', go: ['c>r>i>s', 'res:s>i>r>c'], msg: 'GET / HTTP/1.1  →  200 OK' },
        ]},
        { name: 'Packet lost', intro: 'The server is sending 3 packets of the page. One gets lost on the way.', steps: [
          { title: 'Packet 1 arrived', text: 'All good. The browser sends an ACK: "got up to 1".', go: 'res:s>i>r>c', msg: 'packet #1 ✓' },
          { title: 'Packet 2 lost', text: 'The router was busy and dropped the packet. Neither the server nor the browser knows. Not yet.', go: 'lost:s>i>r', msg: 'packet #2 ✗ (lost)', after: { r: { state: 'warn' } } },
          { title: 'Packet 3 arrived', text: 'The browser has 1 and 3, but not 2. TCP holds 3 back and does not give it to the app, because order matters.', go: 'res:s>i>r>c', msg: 'packet #3 ✓ (waiting for 2)' },
          { title: 'Browser: "still only up to 1"', text: 'The browser sends ACK 1 again. The server gets the same ACK again and again (a duplicate ACK). Or a timer runs out. Either way the server understands: 2 was lost.', go: 'c>r>i>s', msg: 'ACK 1 (again)  → 2 missing' },
          { title: 'The server sends 2 again', text: 'Retransmission. Now 1, 2 and 3 are all there, in the right order, and the app gets them together. The price: a delay of about one RTT.', go: 'res:s>i>r>c', msg: 'packet #2 (retransmit) ✓', set: { r: { state: '' } }, after: { c: { state: 'ok' } } },
        ]},
        { name: 'Server is down', intro: 'Failure: the server crashed, or you are going to the wrong IP.', steps: [
          { title: 'SYN sent', text: 'The browser sends a SYN and starts a timer.', go: 'c>r>i>s', msg: 'SYN', set: { s: { state: 'down', sub: 'crashed' } } },
          { title: 'No reply', text: 'The timer runs out. TCP sends the SYN again, each time waiting twice as long as before (1 s, 2 s, 4 s...). This is called exponential backoff.', go: 'lost:c>r>i>s', msg: 'SYN (retry, 2x wait)' },
          { title: 'Giving up', text: 'After several tries, the browser shows "connection timed out". This is why real systems give the client its own short timeout (like 2-3 s) and then try another server. A load balancer does exactly this.', go: 'bad:r>c', msg: 'ERR_CONNECTION_TIMED_OUT', after: { c: { state: 'warn' } } },
        ]},
        { name: 'Video call (UDP)', intro: 'In a video call, about 30 frames are sent every second. UDP is used here.', steps: [
          { title: 'Frame 1', text: 'UDP has no handshake. It starts sending right away.', go: 'res:s>i>r>c', msg: 'frame 1 ✓' },
          { title: 'Frame 2 lost', text: 'Lost is lost. No ACK, no resending.', go: 'lost:s>i>r', msg: 'frame 2 ✗' },
          { title: 'Frame 3, the call goes on', text: 'One missing frame = a tiny glitch on the screen for a moment. If we waited for frame 2, the whole video would freeze, and a frame that is 200 ms old is useless to show anyway. <strong>In live content, freshness matters more than completeness.</strong>', go: 'res:s>i>r>c', msg: 'frame 3 ✓ (no waiting)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "the handshake happens on every request"', html: `No. The handshake happens once, when the <strong>connection</strong> is made. After that, a hundred requests can go over the same connection (this is called <strong>keep-alive</strong> or connection reuse). That is why servers and browsers keep connections open, and app servers keep a <strong>connection pool</strong> (a set of already open connections) to the database.` },
    { type: 'h2', text: 'Reliability from the inside: how a lost packet is caught' },
    { type: 'p', html: `How does TCP know that a packet was lost? The network does not tell anyone. TCP works from two signals:` },
    { type: 'list', items: [
      `<strong>Duplicate ACK (fast retransmit):</strong> packet 2 was lost, but 3, 4 and 5 arrived. Each time, the receiver sends the same old ACK: "I still only have up to 1". When the server gets <strong>3 duplicate ACKs</strong>, it sends 2 again right away, without waiting for a timer. Fast: a delay of about 1 RTT.`,
      `<strong>Timeout:</strong> if very few packets came after the lost one (for example, the very last packet was lost), duplicate ACKs never come. Then the server waits for a timer (RTO, the retransmission timeout). This is slow.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: head-of-line blocking', html: `<strong>What it is:</strong> if the first one in a line is stuck, everyone behind it is stuck too, even if they are ready.<br><strong>In TCP:</strong> packets 3, 4 and 5 have arrived, but the app does not get them until 2 arrives, because TCP promises order.<br><strong>Why remember it:</strong> this is the reason HTTP/3 left TCP and built QUIC (on top of UDP). It comes in a later lesson.` },
    { type: 'p', html: `Try it yourself. 6 packets leave at the same time (we assume an RTT of 100 ms, so a packet arrives in 50 ms). Click a packet to "lose" it. Then switch between TCP and UDP and see when the app gets the data.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button class="btn small" data-m="tcp">TCP</button><button class="btn small" data-m="udp">UDP</button>
          <span style="color:var(--ink-3);font-size:13px;margin-left:6px">Lose:</span>
          <span class="tu-chips" style="display:flex;flex-wrap:wrap;gap:6px"></span>
        </div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;font-size:13.5px"><thead><tr><th>Packet</th><th>Arrived</th><th>App got it</th><th>What happened</th></tr></thead><tbody class="tu-rows"></tbody></table></div>
        <div class="stats"><div class="stat"><span>All data to the app</span><strong class="tu-t"></strong></div><div class="stat"><span>Held back (HoL)</span><strong class="tu-h"></strong></div><div class="stat"><span>Sent again</span><strong class="tu-r"></strong></div></div>
        <div class="calc-note tu-n"></div>`;
      const N = 6, RTT = 100, RTO = 3;
      let mode = 'tcp'; const lost = new Set([1]);
      const model = () => {
        const arr = [], how = [];
        for (let k = 0; k < N; k++) {
          if (!lost.has(k)) { arr.push(0.5); how.push('arrived directly'); continue; }
          if (mode === 'udp') { arr.push(null); how.push('lost, never sent again'); continue; }
          let after = 0; for (let j = k + 1; j < N; j++) if (!lost.has(j)) after++;
          if (after >= 3) { arr.push(1.5); how.push(`lost → ${after} dup ACKs → fast retransmit`); }
          else { arr.push(RTO + 0.5); how.push(`lost → only ${after} dup ACKs → timer (${RTO} RTT) → retransmit`); }
        }
        const del = []; let m = 0;
        for (let k = 0; k < N; k++) {
          if (mode === 'udp') { del.push(arr[k]); continue; }
          m = Math.max(m, arr[k]); del.push(m);
        }
        return { arr, del, how };
      };
      const ms = x => x == null ? '—' : Math.round(x * RTT) + ' ms';
      const draw = () => {
        el.querySelectorAll('[data-m]').forEach(b => b.className = 'btn small' + (b.dataset.m === mode ? ' primary' : ''));
        el.querySelector('.tu-chips').innerHTML = Array.from({ length: N }, (_, k) => `<button class="chip${lost.has(k) ? ' on' : ''}" data-k="${k}">${k + 1}${lost.has(k) ? ' ✗' : ''}</button>`).join('');
        el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = +b.dataset.k; lost.has(k) ? lost.delete(k) : lost.add(k); draw(); });
        const r = model();
        let held = 0, re = 0;
        el.querySelector('.tu-rows').innerHTML = r.arr.map((a, k) => {
          const wait = mode === 'tcp' && r.del[k] > a; if (wait) held++; if (mode === 'tcp' && lost.has(k)) re++;
          const col = a == null ? 'var(--red)' : (lost.has(k) || wait) ? 'var(--amber)' : 'var(--green)';
          return `<tr><td><strong style="color:${col}">#${k + 1}</strong></td><td>${ms(a)}</td><td>${ms(r.del[k])}</td><td>${wait && !lost.has(k) ? 'arrived, but held (HoL)' : r.how[k]}</td></tr>`;
        }).join('');
        const got = r.del.filter(x => x != null);
        el.querySelector('.tu-t').textContent = mode === 'udp' && got.length < N ? `${ms(Math.max(...got))}, ${N - got.length} missing` : ms(Math.max(...got));
        el.querySelector('.tu-h').textContent = String(held);
        el.querySelector('.tu-r').textContent = String(re);
        el.querySelector('.tu-n').textContent = mode === 'tcp'
          ? 'TCP: everything arrives, in the right order. The price: packets behind a lost packet are held back. If the last packet is lost, no duplicate ACKs come, and there is a long wait for the timer.'
          : 'UDP: whatever arrives goes to the app right away. Whatever is lost is gone. Fine for a video call or a game, never for a payment or a web page.';
      };
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      draw();
    }},
    { type: 'p', html: `In the default setting packet 2 is lost: 4 packets arrived after it, 4 duplicate ACKs came back, fast retransmit happened, and all the data arrived at <strong>150 ms</strong> (50 ms without the loss). Packets 3-6 had already arrived, but they were still held back for 100 ms: that is head-of-line blocking. Now lose only packet 6: no duplicate ACKs come, the timer runs, and the data arrives at <strong>350 ms</strong>.` },
    { type: 'callout', tone: 'tip', title: 'In the real world', html: `Each connection sets its timer (RTO) from the RTT it has measured. The simulator assumes 3 RTT. Catching damage <em>inside</em> one packet is the job of the <strong>checksum</strong>, in the next section.` },
    { type: 'h2', text: 'Checksum: was the packet damaged on the way?' },
    { type: 'p', html: `The packet arrived, but what if electrical noise or bad hardware flipped one of its bits (a 0 or a 1) on the way? "PAY 500" could become "PAY 400". The <strong>checksum</strong> is there to catch this.` },
    { type: 'callout', tone: 'term', title: 'New word: checksum', html: `<strong>What it is:</strong> a small number calculated from the data and sent along with it. The receiver does the same calculation again. If the numbers do not match, the data is damaged.<br><strong>Why we need it:</strong> so that wrong data does not quietly reach the app.<br><strong>Without it:</strong> one flipped bit could change an amount, a password or a file, and nobody would notice.<br><strong>Example:</strong> the IP header, TCP and UDP all have a 16-bit checksum. In TCP, a failed checksum means the packet is quietly thrown away, and the sender treats it as a "lost packet" and sends it again.` },
    { type: 'p', html: `<strong>A small example (simple version):</strong> the numbers in a message are 12, 7 and 30. The sender adds them: 12 + 7 + 30 = <strong>49</strong>, and sends 49 along. On the way, 7 becomes 6. The receiver adds: 12 + 6 + 30 = 48. 48 ≠ 49, so the packet is damaged and thrown away. The real Internet checksum does almost the same: it adds the data in 16-bit pieces and turns the sum into one 16-bit number in a special way (one's complement).` },
    { type: 'p', html: `Below, the real Internet checksum (from RFC 1071) is running. First press "Flip one bit". Then press Reset, press "Swap two pieces", and see when the checksum gets fooled:` },
    { type: 'custom', render(el) {
      const ORIG = 'PAY 500 TO RIYA';
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn small" data-a="flip">Flip one bit</button>
          <button class="btn small" data-a="swap">Swap two pieces</button>
          <button class="btn small ghost" data-a="reset">Reset</button></div>
        <div class="row2" style="margin-top:12px">
          <div><div style="font-size:13px;color:var(--ink-3)">Sender sent</div><code class="ck-a" style="font-size:15px"></code></div>
          <div><div style="font-size:13px;color:var(--ink-3)">Receiver got</div><code class="ck-b" style="font-size:15px"></code></div></div>
        <div class="stats"><div class="stat"><span>Checksum that came along</span><strong class="ck-s"></strong></div><div class="stat"><span>Receiver's calculation</span><strong class="ck-r"></strong></div><div class="stat"><span>Decision</span><strong class="ck-v"></strong></div></div>
        <div class="calc-note ck-n"></div>`;
      const csum = s => {
        const b = [...s].map(c => c.charCodeAt(0)); if (b.length % 2) b.push(0);
        let sum = 0; for (let i = 0; i < b.length; i += 2) { sum += (b[i] << 8) + b[i + 1]; sum = (sum & 0xffff) + (sum >>> 16); }
        return (~sum) & 0xffff;
      };
      const hex = n => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
      let got = ORIG, act = 'reset';
      const draw = () => {
        const s = csum(ORIG), r = csum(got), same = got === ORIG, ok = s === r;
        el.querySelector('.ck-a').textContent = ORIG;
        el.querySelector('.ck-b').textContent = got;
        el.querySelector('.ck-s').textContent = hex(s);
        el.querySelector('.ck-r').textContent = hex(r);
        el.querySelector('.ck-v').textContent = ok ? (same ? 'Correct ✓' : 'Passed (error missed!)') : 'Damaged ✗ throw away';
        el.querySelector('.ck-v').style.color = ok && same ? 'var(--green)' : ok ? 'var(--amber)' : 'var(--red)';
        el.querySelector('.ck-n').textContent = act === 'flip' ? 'Flipping one bit turned "5" into "4" (the amount went from 500 to 400). The checksum came out different, so the packet was thrown away and asked for again. The checksum always catches a one-bit error.'
          : act === 'swap' ? 'Two 16-bit pieces ("50" and "0 ") swapped places. Order does not matter when you add numbers, so the checksum came out the same and the wrong message passed! So the checksum is only for light, random errors. To catch changes made on purpose, you need the strong calculation (MAC) of TLS.'
          : 'The sender sent the message together with its checksum. The receiver does the same calculation again.';
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        act = b.dataset.a;
        if (act === 'flip') got = ORIG.slice(0, 4) + String.fromCharCode(ORIG.charCodeAt(4) ^ 1) + ORIG.slice(5);
        else if (act === 'swap') got = ORIG.slice(0, 4) + ORIG.slice(6, 8) + ORIG.slice(4, 6) + ORIG.slice(8);
        else got = ORIG;
        draw();
      });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "checksum = security"', html: `No. A checksum only catches damage that happens <strong>by accident</strong>. A hacker can change the message and also make a new checksum, because everyone knows the formula. To protect against changes made on purpose, TLS (below) uses a calculation with a secret key (a MAC), which nobody can make without the key.` },
    { type: 'h2', text: 'How fast to send? Flow control vs congestion control' },
    { type: 'p', html: `The server has 2 MB to send. Should it throw all 1,400 packets out in one go? No. Two things can break, and TCP uses a separate brake for each.` },
    { type: 'compare',
      left: { title: 'Flow control: do not flood the receiver', html: `<strong>Problem:</strong> your old phone reads slowly. If the server sends too fast, the phone's memory (buffer) fills up and packets are dropped.<br><strong>Fix:</strong> in every ACK, the receiver says "I have this much free space right now". This is called the <strong>receive window (rwnd)</strong>. The sender never has more than this out without an ACK.<br><strong>Who it protects:</strong> the receiver.` },
      right: { title: 'Congestion control: do not flood the network', html: `<strong>Problem:</strong> the phone is fast, but a router or road in the middle is full (everyone is watching video at the same time). If everyone sends fast, the router drops packets, everyone sends again, and the jam gets worse.<br><strong>Fix:</strong> the sender keeps its own estimate: the <strong>congestion window (cwnd)</strong>. Start slow, grow if things go well, and cut it at once if a packet is lost.<br><strong>Who it protects:</strong> the network, which means everyone.` },
    },
    { type: 'callout', tone: 'term', title: 'New words: window, slow start', html: `<strong>Window:</strong> how many packets can be "on the road" without waiting for an ACK. In each RTT, about one window of data is sent.<br><strong>The real limit:</strong> in one RTT the sender sends <code>min(cwnd, rwnd)</code> packets. Whichever of the two is smaller wins.<br><strong>Slow start:</strong> the name is misleading, it grows fast. cwnd <strong>doubles</strong> every RTT (1, 2, 4, 8...) until it reaches a limit (ssthresh). After that it grows by only +1 per RTT (congestion avoidance).<br><strong>Packet lost:</strong> this means the road is filling up. cwnd is cut in half. This is called "additive increase, multiplicative decrease" (AIMD): grow slowly, shrink sharply.` },
    { type: 'p', html: `Try it. Each bar is one RTT, and its height = how many packets went in that RTT. Use the rwnd slider to change the receiver's space. Turn on "loss" to see how cwnd is cut in half.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Receiver window (rwnd): <strong class="cc-wv"></strong> packets</label><input type="range" aria-label="rwnd" class="cc-w" min="8" max="64" step="4" value="64"></div>
          <div><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="cc-l" checked> Packet loss in RTT 7</label></div></div>
        <div class="cc-bars" style="display:flex;align-items:flex-end;gap:4px;height:150px;margin-top:14px;border-bottom:1px solid var(--line)"></div>
        <div class="cc-x" style="display:flex;gap:4px;font-size:11px;color:var(--ink-3)"></div>
        <div class="stats"><div class="stat"><span>Total packets in 12 RTTs</span><strong class="cc-t"></strong></div><div class="stat"><span>Most in one RTT</span><strong class="cc-m"></strong></div><div class="stat"><span>Who braked (RTT 6)</span><strong class="cc-b"></strong></div></div>
        <div class="calc-note">Green = cwnd was the limit (the network's brake). Yellow = rwnd was the limit (the receiver's brake). Red = a loss happened in this RTT. The model is simple: cwnd starts at 1, ssthresh is 64.</div>`;
      const model = (rwnd, loss) => {
        let cwnd = 1, ss = 64; const rows = [];
        for (let r = 1; r <= 12; r++) {
          const send = Math.min(cwnd, rwnd), by = cwnd <= rwnd ? 'cwnd' : 'rwnd', lost = loss && r === 7;
          rows.push({ r, cwnd, send, by, lost });
          if (lost) { ss = Math.max(Math.floor(cwnd / 2), 2); cwnd = ss; }
          else if (by === 'rwnd') { /* receiver is the limit: cwnd does not grow */ }
          else if (cwnd < ss) cwnd = Math.min(cwnd * 2, ss); else cwnd += 1;
        }
        return rows;
      };
      const draw = () => {
        const rw = +el.querySelector('.cc-w').value, rows = model(rw, el.querySelector('.cc-l').checked);
        el.querySelector('.cc-wv').textContent = rw;
        const mx = 64;
        el.querySelector('.cc-bars').innerHTML = rows.map(o => `<div title="RTT ${o.r}: ${o.send} packets" style="flex:1;height:${(o.send / mx * 100).toFixed(1)}%;min-height:2px;border-radius:3px 3px 0 0;background:${o.lost ? 'var(--red)' : o.by === 'rwnd' ? 'var(--amber)' : 'var(--green)'}"></div>`).join('');
        el.querySelector('.cc-x').innerHTML = rows.map(o => `<div style="flex:1;text-align:center">${o.send}</div>`).join('');
        el.querySelector('.cc-t').textContent = rows.reduce((a, o) => a + o.send, 0);
        el.querySelector('.cc-m').textContent = Math.max(...rows.map(o => o.send));
        el.querySelector('.cc-b').textContent = rows[5].by === 'rwnd' ? 'rwnd (receiver)' : 'cwnd (network)';
      };
      el.querySelector('.cc-w').oninput = draw; el.querySelector('.cc-l').onchange = draw;
      draw();
    }},
    { type: 'p', html: `<strong>What you saw:</strong> in the default setting (rwnd 64, loss on), cwnd grew 1, 2, 4, 8, 16, 32, 64. A loss happened in RTT 7, so in the next RTT it dropped to 32, then grew slowly: 33, 34, 35, 36. In total, <strong>297</strong> packets in 12 RTTs. Turn the loss off and you get <strong>447</strong>. Now set rwnd to 24: however big cwnd gets, no more than 24 go per RTT (yellow bars). Then the receiver is braking, not the network.` },
    { type: 'list', items: [
      `<strong>Real numbers:</strong> today's systems do not start cwnd at 1, but at about 10 packets. The default algorithm in Linux is <strong>CUBIC</strong>, and Google built <strong>BBR</strong>, which does not wait for loss but measures speed and RTT to make its estimate. The idea is the same for all: estimate the network's capacity, and back off when there is a crowd.`,
      `<strong>System design lesson 1:</strong> a new connection is "cold": slow for the first few RTTs. So reuse connections (keep-alive, connection pool).`,
      `<strong>Lesson 2:</strong> the longer the RTT, the more slow start costs (each doubling is one RTT). If the server is close to the user (a CDN), the RTT is 20 ms and the window grows quickly.`,
      `<strong>Lesson 3:</strong> mobile networks lose more packets, so cwnd is cut in half again and again. This is why a big file downloads slowly on a bad network, even when there is bandwidth.`,
    ]},

    { type: 'h2', text: 'UDP: "sent it, the rest is up to luck"' },
    { type: 'callout', tone: 'term', title: 'New word: UDP', html: `<strong>What it is:</strong> User Datagram Protocol. The other layer 4 protocol. It does only two jobs: it adds a port number (so the data reaches the right program) and a checksum. No handshake, no ACK, no resending, no order, no speed control.<br><strong>Why we need it:</strong> when old data is useless and waiting is the worst thing: video calls, online games, live streams. And when the question and answer are so small that a handshake feels expensive: a DNS lookup.<br><strong>Without it:</strong> in a video call, the whole call would freeze on every lost packet.<br><strong>Example:</strong> DNS (one packet question, one packet answer), WhatsApp/Zoom calls (RTP over UDP), games like PUBG, and QUIC (HTTP/3).` },
    { type: 'p', html: `Understand one thing carefully: an app running on UDP can build <strong>its own</strong> reliability if it wants, exactly as much as it needs. A game resends only "important" packets (like "the player died"), not position updates. QUIC builds full reliability itself, but separately for each stream. UDP is a blank canvas.` },
    { type: 'h2', text: 'TCP vs UDP' },
    { type: 'table', head: ['', 'TCP', 'UDP'], rows: [
      ['Connection', 'First a 3-way handshake (1 RTT)', 'Just send, 0 RTT'],
      ['Packet lost?', 'Sends it again', 'Ignored (the app can handle it if it wants)'],
      ['Order', 'Guaranteed', 'No guarantee'],
      ['Error check (checksum)', 'Yes', 'Yes (optional in IPv4, required in IPv6)'],
      ['Speed control', 'Flow + congestion control', 'None, it is the app\'s job'],
      ['Header size', '20+ bytes', '8 bytes'],
      ['Where it is used', 'Websites, APIs, payments, chat messages, file downloads, database connections', 'Video/voice calls, online games, live streaming, DNS lookups, QUIC/HTTP/3'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `Ask one question: <strong>"Is it OK if even one byte is missing?"</strong><br>A payment amount, a chat message, HTML, the JSON of an API: not OK → <strong>TCP</strong> (every byte, in the right order).<br>One frame of a video call, a player position that is 1/30 of a second old in a game, a small DNS question: OK, speed and freshness matter more → <strong>UDP</strong>.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "UDP is always faster than TCP"', html: `For one packet, UDP is lighter, yes. But for a big file, if you write your own reliability on top of UDP, you often end up with something like TCP (or worse). And UDP without congestion control can jam the network. "Fast" here means: <strong>it does not wait</strong>.` },
    { type: 'h2', text: 'HTTPS: nobody in the middle can read it' },
    { type: 'p', html: `TCP makes sure the data arrives. But can someone on the way <em>read</em> it? Yes, if you are using plain <strong>HTTP</strong>. Your packet passes through your home router, the ISP's routers, and many other machines. With plain HTTP, anyone can read it like a postcard. There are three dangers:` },
    { type: 'list', items: [
      `<strong>Reading:</strong> stealing your password, OTP or chat.`,
      `<strong>Changing:</strong> putting a fake ad or a link to a virus into the page, or turning "PAY 500" into "PAY 5000".`,
      `<strong>Pretending:</strong> someone says they are xyz.com and takes your login.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: encryption and key', html: `<strong>What it is:</strong> scrambling data with a secret <strong>key</strong> (a very long random number) so that without the key it looks like garbage. Only someone with the key can turn it back (decrypt it).<br><strong>Why we need it:</strong> so that people on the way only see garbage.<br><strong>Without it:</strong> every password on public WiFi is out in the open.` },
    { type: 'callout', tone: 'term', title: 'New word: TLS and HTTPS', html: `<strong>What it is:</strong> <strong>TLS</strong> (Transport Layer Security) is the protocol that puts a lock on top of TCP. Its old name was SSL. <strong>HTTPS = HTTP + TLS</strong>. The lock icon in the address bar means exactly this.<br><strong>Why we need it:</strong> TLS stops all three dangers: encryption (nobody can read), MAC (if someone changes data, it is caught), certificate (the server is real).<br><strong>Without it:</strong> login, payments, nothing is safe. Today, browsers mark HTTP sites as "Not secure".` },
    { type: 'callout', tone: 'term', title: 'New word: certificate and CA', html: `<strong>What it is:</strong> a <strong>certificate</strong> is the server's digital ID card. It says "this is xyz.com" and contains the server's <strong>public key</strong>. A <strong>CA (Certificate Authority)</strong>, which is a trusted company (like Let's Encrypt or DigiCert), signs it. Browsers and phones come with a list of these CAs already built in.<br><strong>Why we need it:</strong> encryption alone is not enough. If you are having an encrypted talk with the attacker himself, what is the point? The certificate proves that the other side is the real xyz.com.<br><strong>Without it:</strong> anyone on the WiFi could say they are xyz.com.<br><strong>Example:</strong> certificates also expire. By a 2025 decision of the CA/Browser Forum, the maximum life of a public certificate is 200 days from 15 March 2026, 100 days from 2027 and 47 days from 2029. So renewal has to be automatic, or the site shows a big red warning.` },
    { type: 'callout', tone: 'term', title: 'New word: public key and private key', html: `<strong>What it is:</strong> a pair of keys. You can give the <strong>public key</strong> to everyone. The <strong>private key</strong> stays only with the server and never leaves it. A "signature" made with the private key can be checked with the public key, but the private key cannot be worked out from the public key.<br><strong>Why we need it:</strong> the server proves "I have the private key for the public key in this certificate", without showing the private key.<br><strong>Without it:</strong> anyone could copy the certificate and pretend to be xyz.com.` },
    { type: 'p', html: `Now a puzzle: the browser and the server need a <strong>shared secret key</strong>, but everyone in the middle is watching. If you send the key over the network, it gets stolen. The answer is the <strong>Diffie-Hellman key exchange</strong>: each side picks its own secret number, they only send a "mixed" number, and both end up with the same final key. See the maths with small numbers:` },
    { type: 'table', head: ['Step', 'Browser', 'Everyone on the network can see', 'Server'], rows: [
      ['Public rules', '', 'p = 23, g = 5', ''],
      ['Pick your secret', 'a = 6 (tells nobody)', '', 'b = 15 (tells nobody)'],
      ['Mix and send', 'A = 5<sup>6</sup> mod 23 = <strong>8</strong>', 'A = 8, B = 19', 'B = 5<sup>15</sup> mod 23 = <strong>19</strong>'],
      ['Final key', '19<sup>6</sup> mod 23 = <strong>2</strong>', '?? (very hard to get from 8 and 19)', '8<sup>15</sup> mod 23 = <strong>2</strong>'],
    ]},
    { type: 'p', html: `Both now have the key 2, and 2 never travelled on the network. In real life the numbers are hundreds of digits long (or elliptic curves are used), so for an attacker, getting the key from 8 and 19 is practically impossible. <code>mod</code> means: divide and keep only the remainder.` },
    { type: 'p', html: `Now run the full TLS handshake. It is a cafe's public WiFi, and an attacker is sitting on the same WiFi. Run all four scenarios, especially the last two (failures):` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'b', label: 'Browser', sub: 'logging in', x: 100, y: 110, w: 150, kind: 'client', info: 'What it is: your browser, logging in to xyz.com with a password. It holds the list of CAs, and it is the one that checks the certificate.' },
        { id: 'w', label: 'Public WiFi', sub: 'cafe router', x: 360, y: 110, w: 140, kind: 'net', info: 'What it is: the cafe\'s router. Every packet of yours passes through it. The router (or anyone who has taken it over) can see, stop or change every packet.' },
        { id: 's', label: 'xyz.com server', sub: 'the real one', x: 620, y: 110, w: 150, kind: 'server', info: 'What it is: the real server. It has the certificate (signed by a CA) and its private key, which never leaves the server.' },
        { id: 'hk', label: 'Attacker', sub: 'on same WiFi', x: 360, y: 240, w: 140, kind: 'threat', info: 'What it is: someone on the same WiFi who tries to read or change the traffic. This is called a man-in-the-middle attack.' },
      ],
      edges: [{ a: 'b', b: 'w' }, { a: 'w', b: 's' }, { a: 'w', b: 'hk', dashed: true }],
      scenarios: [
        { name: 'HTTP (no lock)', steps: [
          { title: 'You send your password', text: 'In plain HTTP, data goes exactly as it is, like a postcard.', go: 'b>w', msg: 'POST /login\nemail=me@x.com&password=hunter2' },
          { title: 'The attacker reads everything', text: 'While it passed the router, the attacker copied it. Your password is now with him, and you do not even know.', parallel: true, go: ['w>s', 'bad:w>hk'], after: { hk: { sub: 'got the password!' } }, msg: 'Attacker saw: password=hunter2' },
        ]},
        { name: 'HTTPS (TLS 1.3)', intro: 'The TCP handshake (1 RTT) is done. Now the TLS 1.3 handshake, in only 1 RTT.', steps: [
          { title: 'ClientHello', text: 'The browser says: "I know TLS 1.3, these are my encryption options", and also sends its Diffie-Hellman mixed number (key share) along, to save one RTT.', go: 'b>w>s', msg: 'ClientHello + key share (A)' },
          { title: 'ServerHello + certificate', text: 'The server sends its key share (B), its certificate, a signature (made with the private key, to prove the certificate is its own) and "Finished". From this point, data from the server is encrypted.', go: 'res:s>w>b', msg: 'ServerHello (B) + Certificate + Signature + Finished' },
          { title: 'The browser checks the certificate', text: 'Three questions: (1) did a trusted CA sign it? (2) does it say xyz.com? (3) has it expired? All three are fine. Then, from A, B and its own secret, it makes the same key that the server made.', focus: ['b'], set: { b: { state: 'ok', sub: 'certificate OK ✓' } } },
          { title: 'Finished + first request, encrypted', text: 'The browser sends its login request together with "Finished". The attacker sees only garbage. The lock icon appears.', parallel: true, go: ['b>w>s', 'bad:w>hk'], after: { hk: { sub: 'understood nothing' }, s: { state: 'ok' } }, msg: 'Attacker saw: 9f2a!x#Qm@7Lz...  (encrypted)' },
        ]},
        { name: 'Fake server', intro: 'Failure: on the WiFi, the attacker turns your request towards himself and tries to pretend he is xyz.com.', steps: [
          { title: 'The request reaches the attacker', text: 'By taking over the WiFi, the attacker sent the xyz.com traffic to his own machine.', go: 'b>w>hk', msg: 'ClientHello (xyz.com)' },
          { title: 'The attacker sends his own certificate', text: 'He does not have the private key of xyz.com. So he sends either a certificate he made himself (self-signed), or one for another domain.', go: 'res:hk>w>b', msg: 'Certificate: "xyz.com" (signed by: the attacker)' },
          { title: 'The browser stops it', text: 'No trusted CA signed it. The browser shows a big red page: "Your connection is not private". The password never left. This is why you should never "ignore" this warning.', focus: ['b'], set: { b: { state: 'warn', sub: 'fake certificate!' }, hk: { sub: 'got nothing' } } },
        ]},
        { name: 'Tampering on the way', intro: 'Failure: the attacker cannot read the encrypted data, but he tries to change it.', steps: [
          { title: 'The server\'s encrypted reply', text: 'The server sent an encrypted page. Each record comes with a MAC (a checksum made with the secret key).', go: 'res:s>w', msg: 'encrypted record + MAC' },
          { title: 'The attacker changes some bytes', text: 'He does not know the meaning, but he flips some bytes anyway, hoping something breaks.', go: 'res:w>b', set: { hk: { sub: 'changed bytes' } }, msg: 'encrypted record (changed) + old MAC' },
          { title: 'MAC fails, connection closed', text: 'The browser works out the MAC again: no match. The attacker did not have the key, so he could never make a correct MAC. The browser never shows this data on the page and closes the connection. Changed data never quietly gets in.', focus: ['b'], set: { b: { state: 'warn', sub: 'MAC failed: closed' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTPS = the data is always safe"', html: `HTTPS keeps data safe <strong>on the way</strong>. After it reaches the server, it is decrypted. Whether the data is safe inside the database (encryption at rest), and what if the server itself gets hacked? Those are separate topics, in the Phase 3 security lesson. Also, the lock icon does not mean "this site is honest": a phishing site can have a valid certificate too. It only means: you are talking to <em>the site with this name</em>, and nobody in the middle is reading.` },
    { type: 'h2', text: 'The cost of handshakes: TLS 1.2 vs TLS 1.3' },
    { type: 'p', html: `Every handshake costs round trips, and the first byte does not arrive until they are done. In <strong>TLS 1.2</strong> (2008), the TLS handshake took <strong>2 RTTs</strong>: first agree on options, then on keys. <strong>TLS 1.3</strong> (2018, RFC 8446) lets the browser send its key share in the very first message, so it takes only <strong>1 RTT</strong>. It also removed old, weak methods.` },
    { type: 'callout', tone: 'term', title: 'New word: 0-RTT (resumption)', html: `<strong>What it is:</strong> if the browser talked to this server a little while ago, both still have an old shared secret (a ticket). Using it, the browser sends an encrypted request <strong>in the very first message</strong>: zero waiting for TLS.<br><strong>Why we need it:</strong> pages load even faster for returning users.<br><strong>Danger:</strong> this early data can be <strong>replayed</strong>: an attacker can send the same packet again, and the server may run it twice. So 0-RTT is fine only for safe requests (like GET a page), not for a request like "send money".` },
    { type: 'p', html: `Move the RTT slider and see how long the first byte takes to arrive. Grey = TCP handshake, yellow = TLS handshake, green = the real request and reply.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>RTT: <strong class="hs-v"></strong> ms <span style="color:var(--ink-3)">(Mumbai to Mumbai ~10, India to the US ~200)</span></label>
        <input type="range" aria-label="RTT" class="hs-r" min="10" max="300" step="10" value="200">
        <div class="hs-rows" style="margin-top:12px"></div>
        <div class="calc-note hs-n"></div>`;
      const ROWS = [
        ['HTTP (no TLS)', 1, 0, 'Cheap, but no lock'],
        ['HTTPS, TLS 1.2', 1, 2, 'Old: 2 RTTs for TLS'],
        ['HTTPS, TLS 1.3', 1, 1, 'Today\'s default'],
        ['TLS 1.3, 0-RTT (returning user)', 1, 0, 'Request goes with ClientHello'],
        ['HTTP/3 (QUIC)', 0, 1, 'Connection + TLS together'],
        ['HTTP/3, 0-RTT', 0, 0, 'Request in the very first packet'],
        ['Reuse an open connection', 0, 0, 'No handshake at all'],
      ];
      const draw = () => {
        const R = +el.querySelector('.hs-r').value; el.querySelector('.hs-v').textContent = R;
        const max = 4;
        el.querySelector('.hs-rows').innerHTML = ROWS.map(([n, tcp, tls, note]) => {
          const tot = tcp + tls + 1, seg = (k, c) => k ? `<div style="width:${(k / max * 100).toFixed(1)}%;background:${c};height:100%;border-right:2px solid var(--surface)"></div>` : '';
          return `<div style="display:grid;grid-template-columns:minmax(120px,1.1fr) 2fr auto;gap:8px;align-items:center;margin:6px 0">
            <div style="font-size:13px">${n}<div style="font-size:11.5px;color:var(--ink-3)">${note}</div></div>
            <div style="display:flex;height:16px;background:var(--surface-2);border-radius:4px;overflow:hidden">${seg(tcp, 'var(--line-2)')}${seg(tls, 'var(--amber)')}${seg(1, 'var(--green)')}</div>
            <strong style="font-family:var(--f-mono);font-size:13px">${tot * R} ms</strong></div>`;
        }).join('');
        el.querySelector('.hs-n').textContent = `At an RTT of ${R} ms, going from TLS 1.2 to TLS 1.3 saves ${R} ms on every new connection. HTTP/3 with 0-RTT takes only ${R} ms, while TLS 1.2 takes ${4 * R} ms. Bringing the server close to the user (RTT from 200 to 20) gives the biggest win of all: that is why we use a CDN.`;
      };
      el.querySelector('.hs-r').oninput = draw; draw();
    }},
    { type: 'p', html: `From India to the US (RTT 200 ms), a new connection with TLS 1.2 gives the first byte after <strong>800 ms</strong>, TLS 1.3 after <strong>600 ms</strong>, and an already open connection after only <strong>200 ms</strong>. So two rules: <strong>reuse connections</strong>, and <strong>finish the handshake close to the user</strong> (at a CDN or a load balancer; this is called TLS termination, covered in the proxies lesson).` },
    { type: 'h2', text: 'Why this matters in system design' },
    { type: 'list', items: [
      `<strong>Latency:</strong> TCP (1 RTT) + TLS (1-2 RTT) = 2-3 round trips before the request even starts. India to the US has an RTT of about 200 ms, so the first byte comes after 600-800 ms. That is why servers and CDNs are placed close to users.`,
      `<strong>Connection reuse:</strong> a new handshake on every request is expensive, and a new connection is slow at first because of slow start. So browsers use keep-alive, and app servers keep a connection pool to the database and Redis.`,
      `<strong>TLS termination:</strong> the encryption work (handshakes, certificates) is often done at the load balancer or CDN, not on the servers inside. More in later lessons.`,
      `<strong>A lock inside too (mTLS):</strong> in big systems, services also talk to each other over TLS, and both sides show a certificate (mutual TLS). Assuming "the inside network is safe" is old thinking.`,
      `<strong>Protocol choice:</strong> Uber driver location, a WhatsApp call, Hotstar live: in all of these, choosing TCP or UDP is part of the design. One app can use both: chat messages on TCP, video calls on UDP.`,
      `<strong>Timeouts:</strong> if a server is down, TCP itself keeps retrying for several seconds. So put your own short timeout on every network call, or one dead server will block all your threads.`,
    ]},
    { type: 'diagram', title: 'TCP, UDP and TLS: the full picture', height: 560,
      groups: [
        { label: 'Home / cafe', x: 20, y: 20, w: 180, h: 460 },
        { label: 'Internet', x: 270, y: 20, w: 180, h: 460 },
        { label: 'xyz.com data center', x: 505, y: 192, w: 195, h: 353 },
      ],
      nodes: [
        { id: 'ph', label: 'Phone', sub: 'browser + app', x: 110, y: 90, kind: 'client', info: 'What it is: your phone. For a web page it makes a TCP + TLS connection, for a video call it uses UDP. It holds the list of CAs used to check certificates.' },
        { id: 'rt', label: 'WiFi router', x: 110, y: 250, kind: 'net', info: 'What it is: the router at home or in the cafe. Packets can be dropped here (TCP will resend them), and someone can try to read them here (TLS stops that).' },
        { id: 'hk', label: 'Attacker', sub: 'same WiFi', x: 110, y: 420, kind: 'threat', info: 'What it is: the man in the middle. With HTTP he reads everything. With HTTPS he sees only garbage, a fake certificate is caught, and changed data fails the MAC check.' },
        { id: 'ca', label: 'CA', sub: 'gives certificate', x: 360, y: 90, kind: 'edge', info: 'What it is: a Certificate Authority, a trusted company that gives xyz.com a signed certificate in advance (long before any handshake). It is not in the middle of each request.' },
        { id: 'isp', label: 'Internet', sub: 'ISP routers', x: 360, y: 250, w: 150, kind: 'net', info: 'What it is: a chain of routers that only reads the IP and passes the packet along (layer 3). Loss and crowding happen here too, and TCP congestion control handles it.' },
        { id: 'media', label: 'Call server', sub: 'UDP, video', x: 360, y: 420, kind: 'server', info: 'What it is: the video call server. Frames come over UDP: a lost frame is not asked for again, because in a live call an old frame is useless.' },
        { id: 'lb', label: 'Load Balancer', sub: 'TLS ends here', x: 600, y: 250, w: 160, kind: 'edge', info: 'What it is: the front door of xyz.com. It holds the certificate and the private key. The TLS handshake ends here (TLS termination), then the request goes to the servers inside.' },
        { id: 'app', label: 'App servers', x: 600, y: 375, kind: 'server', info: 'What it is: the servers that do the real work. They talk to the load balancer over the inside network (with TLS there too, if needed). They keep connections to the database open in a pool.' },
        { id: 'db', label: 'Database', x: 600, y: 495, kind: 'data', info: 'What it is: the data of xyz.com. It runs on TCP, because not even one byte can be wrong. No new connection for each query: an old connection from the pool is used.' },
      ],
      edges: [
        { a: 'ph', b: 'rt', n: 1, label: 'TCP + TLS' },
        { a: 'rt', b: 'isp', n: 2 },
        { a: 'isp', b: 'lb', n: 3 },
        { a: 'lb', b: 'app', n: 4, label: 'inside' },
        { a: 'app', b: 'db', n: 5, label: 'pool' },
        { a: 'ca', b: 'lb', dashed: true, label: 'certificate' },
        { a: 'isp', b: 'media', kind: 'evt', label: 'UDP' },
        { a: 'rt', b: 'hk', dashed: true, kind: 'bad', label: 'sniff' },
      ],
      paths: [
        { name: 'Web page (TCP + TLS)', text: 'The phone does the TCP handshake, then TLS 1.3 (the load balancer shows its certificate), then the encrypted request goes inside to the app and the database.', go: ['ph>rt>isp>lb>app>db'] },
        { name: 'Video call (UDP)', text: 'Frames go over UDP: no handshake, no resending. One lost frame is only a glitch for a moment.', go: ['ph>rt>isp>media'] },
        { name: 'Attacker on WiFi', text: 'The attacker sees packets at the router, but because of TLS he sees only garbage. The browser catches a fake certificate.', go: ['rt>hk'] },
        { name: 'Where the certificate comes from', text: 'The CA gives the load balancer a signed certificate in advance. The browser checks that signature against its own list of CAs.', go: ['ca>lb'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Data travels in packets. Packets can get lost, arrive late, or arrive in the wrong order.</li>
      <li>Layers: L3 = IP (which computer), L4 = TCP/UDP (which program, how much trust), L7 = HTTP (the app's conversation).</li>
      <li>TCP: 3-way handshake (1 RTT), sequence numbers + ACKs, a lost packet is sent again (duplicate ACK or timeout). The price: head-of-line blocking.</li>
      <li>Flow control (rwnd) protects the receiver. Congestion control (cwnd: slow start, cut in half on loss) protects the network.</li>
      <li>A checksum catches accidental damage, not a hacker. For that, TLS uses a MAC.</li>
      <li>UDP: no handshake, no resending. Live video, games, DNS, QUIC. Decide: "is it OK if even one byte is missing?"</li>
      <li>HTTPS = HTTP + TLS: encryption + certificate (signed by a CA) + MAC. TLS 1.2 = 2 RTTs, TLS 1.3 = 1 RTT, 0-RTT on resumption (with a replay risk).</li>
      <li>Design lessons: reuse connections, finish the handshake close to the user (CDN/LB), put a timeout on every call.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['TCP: every byte arrives, in the right order, without any app code', 'Congestion control keeps the network working for everyone', 'UDP: zero setup, no waiting, perfect for live things', 'TLS: privacy, catching changes, and a sure identity of the server'], costs: ['TCP: 1 RTT for the handshake, slow start, and everything stops on one lost packet (HoL)', 'UDP: loss, order and speed control are all the app\'s job', 'TLS: 1-2 extra RTTs, some CPU work, and the trouble of renewing certificates', '0-RTT is fast but has a replay risk'] },
    { type: 'think', questions: [
      { q: 'In an online multiplayer game, a player\'s position is sent every 30 ms. TCP or UDP?', a: 'UDP. If one position update is lost, the next one is coming in 30 ms anyway. With TCP, everything else would stop for one lost packet (head-of-line blocking), and the game would lag. But an important event like "match won" will be resent by the game itself (its own small reliability on top of UDP).' },
      { q: 'Why not UDP for a payment API?', a: 'Because if even one byte is missing or in the wrong order, the amount or details could be wrong. Money = no compromise. TCP, with HTTPS on top (encryption + MAC), so nobody can read or change it.' },
      { q: 'Your app server makes a new TCP + TLS connection to the database for every request. The database is in another region (RTT 50 ms). What is the problem, and the fix?', a: 'Every request spends 2-3 RTTs (100-150 ms) only on handshakes, plus slow start, plus the load of thousands of new connections on the database. The fix: a connection pool (reuse connections that are already open), and keep the database close to the app (same region).' },
      { q: 'Someone said "our inside servers are on a private network, so they do not need TLS between them". What would you say?', a: 'If one inside server gets hacked, it can read all the other traffic. So sensitive systems use TLS inside too (often mTLS). The trade-off: a little CPU and managing certificates, which tools like a service mesh do automatically.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What happens in TCP when a packet is lost?', options: ['It is ignored', 'It is sent again', 'The connection closes'], answer: 1, explain: 'The whole point of TCP is reliability: a lost packet is retransmitted (found out through duplicate ACKs or a timeout), and the order is kept.' },
      { q: 'Packet 2 was lost, but 3, 4 and 5 arrived. When does the app get 3, 4 and 5 (TCP)?', options: ['Right away', 'When 2 arrives again', 'Never'], answer: 1, explain: 'TCP promises order, so 3-5 are held back until 2 arrives. This is called head-of-line blocking.' },
      { q: 'What is the difference between flow control and congestion control?', options: ['They are the same', 'Flow control protects the receiver (rwnd), congestion control protects the network (cwnd)', 'Flow control exists only in UDP'], answer: 1, explain: 'rwnd = how much space the receiver has. cwnd = the sender\'s estimate of how crowded the network is. The sender sends min(cwnd, rwnd).' },
      { q: 'What does HTTPS protect on public WiFi?', options: ['Data from being read or changed on the way', 'The server from crashing', 'Against slow internet'], answer: 0, explain: 'TLS encrypts (the person in the middle sees only garbage), catches changes with a MAC, and proves the server\'s identity with a certificate.' },
      { q: 'On a new connection with an RTT of 100 ms, TCP + TLS 1.3, when does the first byte arrive?', options: ['100 ms', '300 ms', '400 ms'], answer: 1, explain: 'TCP 1 RTT + TLS 1.3 1 RTT + request/reply 1 RTT = 3 × 100 = 300 ms. With TLS 1.2 it is 400 ms.' },
      { q: 'How does the browser know a certificate is real?', options: ['The server says so', 'A trusted CA signed it, the name matches, and it has not expired', 'The certificate has a picture of a lock'], answer: 1, explain: 'The browser has a list of trusted CAs. Signature check, name check, expiry check. Only if all three pass does the lock icon appear.' },
      { q: 'Which is a correct use of UDP?', options: ['A bank transfer', 'A file download', 'A live video call'], answer: 2, explain: 'In live content, old data is useless. Speed and freshness matter more, and a little loss is fine.' },
    ]},
    { type: 'sources', note: 'Version-specific facts (RTTs, certificate lifetimes, checksum rules) were checked against these sources.', items: [
      { title: 'RFC 9293: Transmission Control Protocol (TCP)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9293.html', used: 'Three-way handshake, sequence and acknowledgement numbers, receive window, checksum.' },
      { title: 'RFC 5681: TCP Congestion Control', publisher: 'IETF', official: true, year: 2009, url: 'https://www.rfc-editor.org/rfc/rfc5681.html', used: 'Slow start, congestion avoidance, ssthresh, fast retransmit after three duplicate ACKs.' },
      { title: 'RFC 768: User Datagram Protocol', publisher: 'IETF', official: true, year: 1980, url: 'https://www.rfc-editor.org/rfc/rfc768.html', used: 'UDP has only ports, length and checksum; 8 byte header; no delivery guarantee.' },
      { title: 'RFC 1071: Computing the Internet Checksum', publisher: 'IETF', official: true, year: 1988, url: 'https://www.rfc-editor.org/rfc/rfc1071.html', used: '16-bit one\'s complement sum used by the checksum widget; the order of words does not change the sum.' },
      { title: 'RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3', publisher: 'IETF', official: true, year: 2018, url: 'https://www.rfc-editor.org/rfc/rfc8446.html', used: '1-RTT handshake, 0-RTT early data and its replay risk, removal of static RSA key exchange.' },
      { title: 'A Detailed Look at RFC 8446 (a.k.a. TLS 1.3)', publisher: 'Cloudflare blog', official: true, year: 2018, url: 'https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/', used: 'TLS 1.2 needs two extra round trips, TLS 1.3 one; 0-RTT resumption trade-offs.' },
      { title: 'SSL/TLS certificate validity changes (Ballot SC-081)', publisher: 'SSL.com', url: 'https://www.ssl.com/article/ssl-certificate-validity-changes-what-you-need-to-know/', used: 'Maximum public certificate validity: 200 days from 15 March 2026, 100 days from 2027, 47 days from 2029.' },
    ]},
  ],
});
