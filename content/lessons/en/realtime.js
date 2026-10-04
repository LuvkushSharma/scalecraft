Lesson.register({
  id: 'realtime',
  title: 'Polling, SSE, WebSockets, webhooks',
  minutes: 35,
  summary: `In HTTP the client asks and the server answers. The server cannot speak on its own. So how does a chat message, a live score, an AI answer word by word, or "payment done" reach the user instantly? Short polling, long polling, SSE, WebSockets, webhooks and WebRTC, plus gateways, a registry, heartbeats and reconnection to handle millions of connections.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `The normal rule of the web: the browser asks, the server answers. The server cannot say anything by itself.<br>But chat, live scores or an AI answer must show up at once, without pressing refresh.<br>There are six ways: ask again and again, ask and wait, keep a line open where the server keeps talking, keep a two-way line open, have a server tell another server, or let two users talk to each other directly.<br>In this lesson you will run each method on a timeline, and also learn how to handle millions of open lines.` },
    { type: 'h2', text: 'The problem: the server cannot speak first' },
    { type: 'p', html: `xyz.com is adding chat. Aman sent Riya a message. It reached the server and was saved in the database. Now how does it get onto Riya's screen?` },
    { type: 'p', html: `The normal HTTP rule: <strong>the client sends a request, the server sends a response, done</strong>. The server has no way to send Riya's browser something "on its own", because Riya did not ask for anything. In the last lessons, telling the user "video ready" after processing had the same question. This lesson has six answers, from cheap to expensive.` },
    { type: 'callout', tone: 'term', title: 'Real-time', html: `<strong>What it is:</strong> as soon as something updates (within a few hundred milliseconds), the user sees it, without refreshing the page. Chat, live cricket score, a driver's location, notifications, the word-by-word answer of ChatGPT/Claude.<br><strong>Why we need it:</strong> a chat message that shows up 5 seconds late does not feel "live".<br><strong>Without it:</strong> the user keeps pressing refresh.<br>The question is always the same: <em>how does the server get an update to the client?</em>` },
    { type: 'callout', tone: 'term', title: 'Persistent connection', html: `<strong>What it is:</strong> a network connection that does not close after its work; it stays open (minutes or hours). Like a phone call that is not hung up, just quietly on.<br><strong>Why we need it:</strong> if the line is already open, the server can speak whenever it wants, with no cost of making a new connection each time.<br><strong>Without it:</strong> the client must send a new question for every update.<br><strong>Cost:</strong> each open line takes a little server memory. 10 lakh users = 10 lakh open lines.` },

    { type: 'h2', text: 'First, four methods, one card each' },
    { type: 'callout', tone: 'term', title: 'Short polling', html: `<strong>What it is:</strong> every few seconds (say every 5 s) the client sends a normal request: "anything new?" Most answers: "no".<br><strong>Why we need it:</strong> the simplest option. No special server, normal HTTP, and it can even be cached by a CDN.<br><strong>Without it (the problem):</strong> most requests are wasted, and an update shows up half an interval late on average (5 s polls = ~2.5 s late).<br><strong>Example:</strong> checking "is the report ready?" every 10 s.` },
    { type: 'callout', tone: 'term', title: 'Long polling', html: `<strong>What it is:</strong> the client asks, and the server <strong>holds the answer</strong> until something new arrives (or a ~30 s timeout). As soon as an answer comes, the client sends the next question.<br><strong>Why we need it:</strong> an update arrives at once, and empty answers are rare. It is still plain HTTP, so it works even through old proxies.<br><strong>Without it (the problem):</strong> a new request after every update, and one held request per user on the server.` },
    { type: 'callout', tone: 'term', title: 'SSE (Server-Sent Events)', html: `<strong>What it is:</strong> an HTTP response that never ends. The server keeps writing events into it: <code>id:</code>, <code>event:</code>, <code>data:</code> lines. Only <strong>server → client</strong>. The browser's built-in <code>EventSource</code> reconnects by itself when it breaks and sends <code>Last-Event-ID</code> to say "give me what comes after this".<br><strong>Why we need it:</strong> the easiest persistent path for a one-way stream, over plain HTTP. Apps like ChatGPT/Claude stream their answer tokens this way.<br><strong>Without it:</strong> even one-way updates would need all the work of WebSocket.` },
    { type: 'callout', tone: 'term', title: 'WebSocket', html: `<strong>What it is:</strong> it starts as an HTTP request (<code>Upgrade</code> → <code>101 Switching Protocols</code>) and becomes a persistent TCP connection where small <strong>frames</strong> (pieces of data) can go <strong>both</strong> ways at any time (RFC 6455). Ping/pong frames for heartbeats are built in.<br><strong>Why we need it:</strong> chat, games, live cursors: both sides send often, with little delay.<br><strong>Without it:</strong> the client needs a new HTTP request for every send, and the server needs a separate way to push.<br><strong>Careful:</strong> you must write reconnect and "where to resume" yourself.` },
    { type: 'h2', text: 'Four methods: run them' },
    { type: 'p', html: `Aman sends a message; Riya needs it. Each chip is one method. Watch how many requests were wasted, and how late the message arrived.` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'a', label: 'Riya\'s browser', sub: 'receiver', x: 100, y: 165, w: 150, kind: 'client', info: 'What it is: Riya\'s browser, the receiver here. Riya needs new messages. Depending on the method, it either asks again and again (polling) or keeps one connection open (SSE, WebSocket).' },
        { id: 'srv', label: 'xyz.com server', sub: 'chat API', x: 360, y: 165, w: 160, kind: 'server', info: 'What it is: xyz.com\'s chat server. With persistent connections (SSE/WebSocket), every connected user keeps one open connection on this server. So it is no longer "stateless": we will see what to do about this in the gateways part.' },
        { id: 'aman', label: 'Aman', sub: 'sender', x: 610, y: 60, w: 140, kind: 'client', info: 'What it is: Aman\'s app, the sender. His message reaches the server and is saved in the DB.' },
        { id: 'db', label: 'Messages DB', x: 610, y: 265, w: 150, kind: 'data', info: 'What it is: the messages database. Every message is stored here permanently. Real-time delivery is only the "show it fast" path; the real record is in the DB. So even if a connection breaks, the message is not lost.' },
      ],
      edges: [{ a: 'a', b: 'srv' }, { a: 'srv', b: 'aman' }, { a: 'srv', b: 'db' }],
      scenarios: [
        { name: 'Short polling', intro: 'Riya\'s browser asks every 3 seconds: "anything new?"', steps: [
          { title: 'Poll 1: nothing', go: ['a>srv', 'res:srv>a'], text: 'A normal HTTP request. Empty answer. One wasted request.', msg: 'GET /messages?after=5011   →  200 []' },
          { title: 'Poll 2: nothing again', go: ['a>srv', 'res:srv>a'], text: 'Wasted again. Every request costs headers, an auth check, a DB query.', msg: 'GET /messages?after=5011   →  200 []' },
          { title: 'Aman sent a message', go: ['aman>srv>db', 'res:srv>aman'], text: 'The message is saved. But Riya does not know yet; she waits for the next poll.', after: { db: { sub: 'msg 5012 saved' } } },
          { title: 'Poll 3: got it', go: ['a>srv>db', 'res:db>srv>a'], text: 'The message came on the next poll. Average delay = half the poll interval (here ~1.5 s). Less delay means more polls = more wasted requests.', after: { a: { state: 'ok', sub: 'got 5012 (late)' } }, msg: 'GET /messages?after=5011   →  200 [{ id: 5012, text: "hi" }]' },
        ]},
        { name: 'Long polling', intro: 'Riya asks, and the server holds the answer until something new arrives (or a timeout).', steps: [
          { title: 'Request arrives, the server waits', go: 'a>srv', set: { srv: { state: 'hot', sub: 'holding request...' } }, text: 'The server does not reply empty at once. It keeps the request open, say for up to 30 seconds.', msg: 'GET /messages/poll?after=5011   (server holds)' },
          { title: 'Aman\'s message', go: ['aman>srv>db'], text: 'As soon as the message arrives, the server has an answer ready for Riya\'s held request.' },
          { title: 'Instant answer', go: 'res:srv>a', after: { a: { state: 'ok', sub: 'got 5012 (fast)' }, srv: { state: '' } }, text: 'Almost zero delay, and no wasted request.', msg: '200 [{ id: 5012, text: "hi" }]' },
          { title: 'A new request at once', go: 'a>srv', set: { srv: { state: 'hot', sub: 'holding again' } }, text: 'As soon as the answer arrives, the browser sends the next long poll. If nothing new comes, the server sends an empty answer (like 204) after 30 s and the client asks again. Weakness: a new HTTP request after every message, and one open request per user on the server.' },
        ]},
        { name: 'SSE', intro: 'Server-Sent Events: an HTTP response that never ends. The server keeps writing events into it.', steps: [
          { title: 'Open the stream', go: ['a>srv', 'res:srv>a'], text: 'The browser\'s built-in <code>EventSource</code> sends a normal GET. The server starts the answer with <code>text/event-stream</code> and leaves the connection open.', msg: 'GET /stream   Accept: text/event-stream\n←  200 OK\n   Content-Type: text/event-stream' },
          { title: 'Aman\'s message, server push', go: ['aman>srv>db', 'res:srv>a'], text: 'The server writes an event into the same open response. Every event has an <code>id</code>.', after: { a: { state: 'ok', sub: 'event 5012' } }, msg: 'id: 5012\nevent: message\ndata: {"from":"aman","text":"hi"}\n' },
          { title: 'Connection broke', go: 'lost:srv>a', set: { a: { state: 'warn', sub: 'disconnected' } }, text: 'Riya\'s train went into a tunnel. Meanwhile messages 5013 and 5014 arrived.', after: { db: { sub: '5013, 5014 saved' } } },
          { title: 'Auto reconnect + resume', go: ['a>srv>db', 'res:db>srv>a'], text: 'EventSource <strong>reconnects by itself</strong> and sends the header <code>Last-Event-ID: 5012</code>. The server sends the messages after 5012 from the DB. Nothing is missed. (The server can also set the reconnect delay with the <code>retry:</code> field.)', after: { a: { state: 'ok', sub: 'caught up 5013-14' } }, msg: 'GET /stream   Last-Event-ID: 5012\n←  id: 5013 ...   id: 5014 ...' },
        ]},
        { name: 'WebSocket', intro: 'One persistent, two-way (full-duplex) connection.', steps: [
          { title: 'Upgrade from HTTP', go: ['a>srv', 'res:srv>a'], text: 'It starts with an HTTP request asking to "switch protocols". The server answers <code>101 Switching Protocols</code>. Now this TCP connection carries WebSocket frames, not HTTP.', msg: 'GET /chat  Upgrade: websocket\n          Sec-WebSocket-Key: dGhlIHNhbXBsZQ==\n←  101 Switching Protocols\n   Sec-WebSocket-Accept: s3pPLMBiTxaQ9k...' },
          { title: 'Riya sends too', go: 'a>srv', text: 'On the same connection the client can also send to the server. No new headers or HTTP request each time, just a small frame.', msg: 'frame → { "type": "typing", "to": "aman" }' },
          { title: 'Server push', go: ['aman>srv>db', 'res:srv>a'], text: 'Aman\'s message reaches Riya on the same connection, in about one network trip.', after: { a: { state: 'ok', sub: 'got 5012 instantly' } }, msg: 'frame ← { "id": 5012, "from": "aman", "text": "hi" }' },
          { title: 'Heartbeat: ping / pong', go: ['srv>a', 'res:a>srv'], text: 'If the line stays quiet for a while, proxies and routers in between cut the idle connection, and a dead connection is not even noticed. So: a periodic <strong>ping</strong>, answered by a <strong>pong</strong>. No pong = the connection is dead, close it.', msg: 'PING →   ← PONG' },
        ]},
      ],
    },

    { type: 'h2', text: 'Simulator: how expensive is each method?' },
    { type: 'p', html: `There are N users. For each user, the server gets a new update every X seconds. Short polling polls every P seconds. Long polling's timeout is 30 seconds. See requests per second, wasted requests, average delay and open connections.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Users online (N)</label><input class="rt-n" type="number" value="1000000" min="1" step="1000"></div>
          <div><label>New update every X sec: <strong class="rt-vx"></strong></label><input class="rt-x" type="range" min="1" max="300" step="1" value="30"></div>
          <div><label>Short poll interval P sec: <strong class="rt-vp"></strong></label><input class="rt-p" type="range" min="1" max="60" step="1" value="5"></div>
        </div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;font:14px var(--f-body);color:var(--ink)">
          <thead><tr style="text-align:left;color:var(--ink-3);font-size:12px"><th style="padding:6px">Method</th><th style="padding:6px">HTTP requests/s</th><th style="padding:6px">Wasted</th><th style="padding:6px">Avg delay</th><th style="padding:6px">Open connections</th></tr></thead>
          <tbody class="rt-body"></tbody></table></div>
        <div class="stats">
          <div class="stat"><span>Gateways (100k conn each)</span><strong class="rt-gw"></strong></div>
          <div class="stat"><span>Wasted share of short polling</span><strong class="rt-waste"></strong></div>
        </div>
        <div class="calc-note rt-note"></div>`;
      const $ = c => el.querySelector(c);
      const T = 30, LAT = 0.1, PER_GW = 100000;
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (n < 10 ? n.toFixed(1) : Math.round(n).toString());
      const sec = s => s < 1 ? '~' + s.toFixed(1) + ' s' : s.toFixed(1) + ' s';
      const upd = () => {
        const N = Math.max(1, Math.floor(+$('.rt-n').value || 1)), X = +$('.rt-x').value, P = +$('.rt-p').value;
        $('.rt-vx').textContent = X; $('.rt-vp').textContent = P;
        const shortReq = N / P, useful = Math.min(1, P / X), shortWaste = shortReq * (1 - useful);
        const lpPerCycle = Math.max(1, Math.ceil(X / T)), lpReq = N * lpPerCycle / X, lpWaste = N * (lpPerCycle - 1) / X;
        const push = N / X;
        const rows = [
          ['Short polling', f(shortReq), f(shortWaste), sec(P / 2), '— (each poll separate)'],
          ['Long polling', f(lpReq), f(lpWaste), sec(LAT), f(N) + ' (held requests)'],
          ['SSE', '≈ 0 (only on connect)', '0 (+' + f(N / 15) + ' tiny keep-alive/s)', sec(LAT), f(N)],
          ['WebSocket', '≈ 0 (only on connect)', '0 (+' + f(N / 30) + ' ping/s)', sec(LAT), f(N)],
        ];
        $('.rt-body').innerHTML = rows.map(r => '<tr style="border-top:1px solid var(--line)">' + r.map((c, i) => `<td style="padding:6px;${i ? 'font-family:var(--f-mono);font-size:13px' : 'font-weight:600'}">${c}</td>`).join('') + '</tr>').join('');
        $('.rt-gw').textContent = Math.ceil(N / PER_GW).toLocaleString('en-IN');
        $('.rt-waste').textContent = Math.round((1 - useful) * 100) + '%';
        $('.rt-note').textContent = `With SSE/WebSocket the server pushes ${f(push)} updates/s, with no polling, at ~${LAT} s delay. Short polling makes ${f(shortReq)} requests/s for the same updates, ${Math.round((1 - useful) * 100)}% of them empty, and an update shows up ${(P / 2).toFixed(1)} s late on average. The price of persistent connections: ${f(N)} connections always open, so ~${Math.ceil(N / PER_GW)} gateway servers (the roadmap\'s rule of thumb: 100k connections per gateway). The model is simple: delay counts only one network trip (~${LAT} s), long poll timeout ${T} s.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', html: `With the defaults (10 lakh users, an update every 30 s, a poll every 5 s): short polling makes <strong>200k requests/s</strong>, ~83% of them empty, with ~2.5 s delay. Long polling makes ~33k requests/s, none empty. SSE/WebSocket: zero polling, only ~33k pushes/s, but 10 lakh open connections = ~10 gateways. Now set X to 1 second (like a multiplayer game): long polling also reaches 10 lakh requests/s, and WebSocket clearly wins. Set X to 300 (a few updates a day): most polling is wasted, but if it can be cached by a CDN, short polling is the cheapest.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"WebSocket is always best." No. A persistent connection means server memory for every user, long connections on the load balancer, all connections breaking on a deploy, and reconnect logic. If updates come every few minutes, or all users must see the <em>same</em> data (a live score), short polling behind a CDN is cheaper and simpler. And if data only goes from server to client, SSE is enough.` },

    { type: 'h2', text: 'Webhooks: server to server' },
    { type: 'p', html: `So far, updates went from the server to the user. But sometimes an update comes from <strong>another company's server</strong>. xyz.com has a premium subscription for creators. A payment provider like Razorpay/Stripe handles the payment, and a payment can take seconds to minutes to complete (bank OTP, UPI approval). We do not want to poll the provider every second. So we give the provider a URL: "when something happens, POST to this".` },
    { type: 'callout', tone: 'term', title: 'Webhook', html: `<strong>What it is:</strong> an HTTP callback. You register your URL with a service, and when an event happens, <strong>that service sends an HTTP POST to your URL</strong>. Like a "reverse API": you do not call them, they call you.<br><strong>Why we need it:</strong> nobody knows when the payment will complete (seconds or minutes). Asking the provider every second (polling) is wasteful.<br><strong>Without it:</strong> either constant polling, or the user never learns "did the payment go through?".<br><strong>Careful:</strong> this is <em>server to server</em>. A browser or phone has no public URL, so a webhook cannot go straight to the user.` },
    { type: 'callout', tone: 'term', title: 'Signature (HMAC)', html: `<strong>What it is:</strong> the provider and we share a secret. With every webhook, the provider makes a code (HMAC-SHA256) from that secret + the body + a timestamp. We make the same code ourselves and compare.<br><strong>Why we need it:</strong> the webhook URL is public; anyone can send a fake "payment done".<br><strong>Without it:</strong> anyone could get premium for free.` },
    { type: 'flow', title: 'Payment webhook', height: 330,
      nodes: [
        { id: 'psp', label: 'Payment provider', sub: 'Stripe / Razorpay', x: 110, y: 150, w: 170, kind: 'server', info: 'What it is: the company that runs payments (a third party). When an event happens, it sends a signed POST to our registered URL, and retries if it fails. In live mode Stripe retries for up to 3 days with exponential backoff.' },
        { id: 'wh', label: 'Webhook endpoint', sub: 'xyz.com', x: 370, y: 150, w: 170, kind: 'server', info: 'What it is: our public HTTPS URL that receives webhooks. Three jobs: verify the signature, check for duplicates by event ID, and put the work in a queue and reply 2xx at once. No heavy work here.' },
        { id: 'q', label: 'Queue', sub: 'jobs', x: 610, y: 70, w: 130, kind: 'queue', info: 'What it is: a work queue (Message queues lesson). The real work (activate the subscription, email, invoice) is done by queue workers. The webhook endpoint stays fast, and spikes (the 1st of the month, when all renewals happen) are absorbed.' },
        { id: 'db', label: 'Orders DB', sub: 'processed events', x: 610, y: 235, w: 150, kind: 'data', info: 'What it is: the orders database. Order status plus a record of "which event IDs are already processed". This is how duplicate deliveries are recognised.' },
        { id: 'att', label: 'Attacker', sub: 'fake POST', x: 370, y: 285, w: 140, kind: 'threat', hidden: true, info: 'What it is: an attacker sending fake requests. The URL is public, so anyone can POST to it. That is why every webhook\'s signature must be checked.' },
      ],
      edges: [{ a: 'psp', b: 'wh' }, { a: 'wh', b: 'q' }, { a: 'wh', b: 'db' }, { a: 'q', b: 'db' }, { a: 'att', b: 'wh', id: 'aw', hidden: true }],
      scenarios: [
        { name: 'Payment success', steps: [
          { title: 'The provider POSTs', go: 'psp>wh', text: 'A signed request: the header has a timestamp + an HMAC-SHA256 signature that only the provider and we (with the shared secret) can make.', msg: 'POST /webhooks/payments\nStripe-Signature: t=1791090000,v1=5257a8...\n{ "id": "evt_123", "type": "payment_intent.succeeded", ... }' },
          { title: 'Verify + dedupe', go: ['wh>db', 'res:db>wh'], text: 'Is the signature right? Is the timestamp not older than 5 minutes (protection against replay attacks)? Was <code>evt_123</code> processed before? No.', focus: ['wh'] },
          { title: 'Into the queue, 200 at once', parallel: true, go: ['wh>q', 'res:wh>psp'], text: 'The work goes into the queue and the provider gets 200 at once. If we did 10 seconds of work right here, the provider would assume a timeout and retry.', msg: '200 OK' },
          { title: 'A worker does the work', go: 'evt:q>db', text: 'Subscription ACTIVE, and evt_123 marked "processed".', after: { db: { state: 'ok', sub: 'ACTIVE, evt_123 done' } } },
        ]},
        { name: 'Endpoint down: retries', steps: [
          { title: 'Our server is down', set: { wh: { state: 'down', sub: 'DOWN (deploy)' } }, go: 'lost:psp>wh', text: 'During a deploy the endpoint returned 503, or the connection failed.' },
          { title: 'The provider retries later', text: 'Webhooks are at-least-once. The provider retries with backoff (Stripe: up to 3 days in live mode). So a short downtime is OK.', set: { wh: { state: 'ok', sub: 'back up' } }, go: ['psp>wh', 'res:wh>psp'] },
          { title: 'Duplicate delivery', go: ['psp>wh', 'wh>db', 'res:db>wh', 'res:wh>psp'], text: 'Sometimes the same event comes twice (we processed it the first time, but our 200 never reached the provider). Event ID <code>evt_123</code> is "done" in the DB, so skip it and just reply 200. There is no ordering guarantee either: <code>invoice.paid</code> can arrive before <code>invoice.created</code>.', after: { db: { sub: 'evt_123 seen: skip' } } },
        ]},
        { name: 'Fake webhook', steps: [
          { title: 'An attacker POSTs', show: ['att', 'aw'], go: 'att>wh', text: 'Someone found our webhook URL and sent a fake "payment succeeded" event to get premium for free.', msg: 'POST /webhooks/payments\n{ "type": "payment_intent.succeeded", "amount": 999 }' },
          { title: 'Signature fails: reject', go: 'bad:wh>att', text: 'The signature cannot be made without the secret. Mismatch = 400, nothing processed. Without a signature check this would have been a free subscription.', after: { att: { state: 'down', sub: 'rejected' } }, msg: '400 Bad Request (signature mismatch)' },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Webhook receiver checklist', html: `• Verify the signature (HMAC) + a timestamp tolerance (replay attacks)<br>• Dedupe by event ID: the same event can come twice<br>• Do not trust the order; if needed, fetch the latest state from the provider's API<br>• Reply 2xx at once; heavy work goes to a queue<br>• Even if a webhook is missed, the system should heal: a periodic <strong>reconciliation</strong> job that matches "all payments from the last day" with the provider<br>• If <em>you</em> send webhooks: retries with backoff, signatures, delivery logs, and a "resend" button for customers.` },

    { type: 'h2', text: 'WebRTC: browser to browser' },
    { type: 'p', html: `Now creators on xyz.com want to video call their fans. If every video frame went through our server, the bandwidth bill would be huge and the latency higher. Better: Riya's browser sends media straight to Aman's browser. That is what <strong>WebRTC</strong> is for.` },
    { type: 'callout', tone: 'term', title: 'WebRTC', html: `<strong>What it is:</strong> a technology to send audio, video and data <strong>directly</strong> (peer-to-peer) between browsers/apps, usually over UDP (in live video a late packet is useless; remember the TCP vs UDP lesson).<br><strong>Why we need it:</strong> video is very heavy. If every frame went through the server, the bandwidth bill would be big and the delay longer.<br><strong>Without it:</strong> all the video of every call goes through our servers: expensive and slow.` },
    { type: 'callout', tone: 'term', title: 'NAT', html: `<strong>What it is:</strong> a home or office router hides many devices behind one public IP (Network Address Translation). Your laptop does not know its own "outside" address.<br><strong>Why it is a problem:</strong> for two laptops to send packets straight to each other, they first need to know how they look from outside, and the routers must let those packets in.<br><strong>So:</strong> STUN, TURN and ICE were created.` },
    { type: 'callout', tone: 'term', title: 'Signaling, STUN, TURN, ICE', html: `<strong>What it is:</strong> four helpers to connect a call. <strong>Signaling</strong>: before the call, both peers send each other their details (codecs, addresses); WebRTC does not say how, usually it is a WebSocket server. <strong>STUN</strong>: a small server that says "from outside, your public IP:port looks like this". <strong>TURN</strong>: when no direct path works at all (strict firewall), a relay server that carries all the media. <strong>ICE</strong>: the process that tries all possible paths and picks the best.<br><strong>Why we need it:</strong> so calls connect even behind NAT and firewalls.<br><strong>Without it:</strong> on most office and mobile networks, calls would not connect at all.` },
    { type: 'flow', title: 'A 1:1 video call', height: 330,
      nodes: [
        { id: 'a', label: 'Riya (call)', sub: 'browser', x: 100, y: 170, w: 140, kind: 'client', info: 'What it is: Riya\'s browser, the caller. She sends her camera/mic stream and network candidates through signaling.' },
        { id: 'b', label: 'Aman (call)', sub: 'browser', x: 620, y: 170, w: 140, kind: 'client', info: 'What it is: Aman\'s browser, receiving the call. It sends the answer to Riya\'s offer.' },
        { id: 'sig', label: 'Signaling server', sub: 'WebSocket', x: 360, y: 55, w: 170, kind: 'server', info: 'What it is: our small server whose only job is "introducing" the peers: it passes the offer/answer (SDP) and ICE candidates back and forth. Media does not go through it.' },
        { id: 'turn', label: 'STUN / TURN', sub: 'NAT helper / relay', x: 360, y: 285, w: 160, kind: 'net', info: 'What it is: helper servers for NAT. STUN tells you your public address (cheap, tiny requests). TURN relays all the media when there is no direct path; this is the real bandwidth cost.' },
      ],
      edges: [{ a: 'a', b: 'sig' }, { a: 'b', b: 'sig' }, { a: 'a', b: 'turn' }, { a: 'b', b: 'turn' }, { a: 'a', b: 'b', id: 'ab', dashed: true }],
      scenarios: [
        { name: 'Direct P2P', steps: [
          { title: 'Find the public address (STUN)', go: ['a>turn', 'res:turn>a'], text: 'Riya\'s laptop is behind a router. STUN tells her how she looks from outside.', msg: 'STUN: your public address is 49.36.x.x:52100' },
          { title: 'Offer → Answer (signaling)', go: ['a>sig>b', 'res:b>sig>a'], text: 'Riya\'s offer (which codecs, which addresses) goes through the signaling server to Aman, and Aman\'s answer comes back.', msg: 'offer (SDP) →\n← answer (SDP)\n+ ICE candidates both ways' },
          { title: 'Direct media', parallel: true, go: ['evt:a>b', 'evt:b>a'], text: 'ICE found a direct path. Video now goes browser to browser, with zero media bandwidth on our server.', after: { a: { state: 'ok', sub: 'in call' }, b: { state: 'ok', sub: 'in call' } } },
        ]},
        { name: 'NAT blocks: TURN relay', steps: [
          { title: 'Signaling done', go: ['a>sig>b', 'res:b>sig>a'], text: 'Offer/answer as normal.' },
          { title: 'Direct path fails', go: 'lost:a>b', text: 'Aman is behind a strict corporate firewall. Direct UDP packets do not get through.' },
          { title: 'Relay through TURN', parallel: true, go: ['evt:a>turn>b', 'evt:b>turn>a'], text: 'Media goes through the TURN server. The call works, but now every byte passes through our (or our provider\'s) server: a bandwidth bill. That is why TURN capacity must be planned.', after: { turn: { state: 'hot', sub: 'relaying media' }, a: { state: 'ok' }, b: { state: 'ok' } } },
        ]},
        { name: 'Signaling server down', steps: [
          { title: 'Signaling goes down', set: { sig: { state: 'down', sub: 'DOWN' } }, focus: ['sig'], text: 'The signaling server crashed.' },
          { title: 'The running call keeps going', parallel: true, go: ['evt:a>b', 'evt:b>a'], text: 'Media never went through signaling, so the call in progress keeps running.' },
          { title: 'New calls will not connect', go: 'lost:a>sig', text: 'But to start a new call, the offer/answer cannot be exchanged. Signaling must be redundant too. (Group calls usually use a server called an SFU that forwards streams; that is outside this lesson.)' },
        ]},
      ],
    },

    { type: 'h2', text: 'Timeline lab: six methods, one story' },
    { type: 'p', html: `The same story for every method: in 60 seconds the server gets 4 updates (at 7 s, 9 s, 31 s and 52 s, red diamonds). Green dot = the update reached the user. The top line is the client, the bottom line the server. Blue line = request, green = answer with data, grey dashed = empty answer, yellow = request held on the server, light band = open connection. One trip across the network is assumed to take 0.1 s.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rl-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="rl-pbox" style="margin-top:10px"><label>Poll interval P: <strong class="rl-vp"></strong></label><input class="rl-p" type="range" min="1" max="15" step="1" value="5"></div>
        <label class="rl-tbox" style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="rl-turn" type="checkbox"> Strict firewall: had to go through a TURN relay</label>
        <svg class="rl-svg" viewBox="0 0 600 200" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Timeline"></svg>
        <div class="stats">
          <div class="stat"><span>HTTP requests (60 s)</span><strong class="rl-o-req"></strong></div>
          <div class="stat"><span>Empty answers / fails</span><strong class="rl-o-emp"></strong></div>
          <div class="stat"><span>Avg delay (update → user)</span><strong class="rl-o-lat"></strong></div>
          <div class="stat"><span>Open connection on the server</span><strong class="rl-o-con"></strong></div>
        </div>
        <div class="calc-note rl-note"></div>`;
      const U = [7, 9, 31, 52], OW = 0.1, END = 60, LPT = 20, DOWN = [28, 37];
      const MODES = { short: 'Short polling', long: 'Long polling', sse: 'SSE', ws: 'WebSocket', hook: 'Webhook', rtc: 'WebRTC' };
      let mode = 'short';
      const r2 = x => Math.round(x * 100) / 100;
      const sim = (mode, P, turn) => {
        const R = { reqs: [], held: [], conn: null, deliv: [], ticks: [], fails: [], media: [], up: [], empty: 0, nreq: 0 };
        if (mode === 'short') {
          let done = 0;
          for (let t = 0; t <= END; t += P) { const got = U.filter((u, i) => i >= done && u <= t + OW); R.reqs.push({ s: t, r: t + 2 * OW, data: got.length > 0 }); if (!got.length) R.empty++; got.forEach(u => R.deliv.push({ u, d: r2(t + 2 * OW) })); done += got.length; }
          R.nreq = R.reqs.length;
        } else if (mode === 'long') {
          let s = 0, done = 0;
          while (s < END) { const arr = s + OW; let resp, got = [];
            const pend = U.filter((u, i) => i >= done && u <= arr);
            if (pend.length) { resp = arr; got = pend; }
            else { const nx = U.find((u, i) => i >= done && u > arr); if (nx !== undefined && nx <= arr + LPT) { resp = nx; got = [nx]; } else resp = arr + LPT; }
            if (resp > END) { R.held.push({ a: arr, b: END }); R.reqs.push({ s, r: null }); break; }
            R.held.push({ a: arr, b: resp }); R.reqs.push({ s, r: resp + OW, data: got.length > 0 }); if (!got.length) R.empty++;
            got.forEach(u => R.deliv.push({ u, d: r2(resp + OW) })); done += got.length; s = resp + OW; }
          R.nreq = R.reqs.length;
        } else if (mode === 'sse' || mode === 'ws') {
          R.reqs.push({ s: 0, r: 2 * OW, data: false, open: true }); R.nreq = 1; R.conn = { a: 0, b: END };
          U.forEach(u => R.deliv.push({ u, d: r2(u + OW) }));
          if (mode === 'sse') R.ticks = [15, 30, 45]; else { R.ticks = [30]; R.up = [20, 40]; }
        } else if (mode === 'hook') {
          U.forEach(u => { let t = u, k = 0; while (t >= DOWN[0] && t <= DOWN[1]) { R.fails.push(t); t += Math.pow(2, k++); } R.reqs.push({ s: t, r: t + 2 * OW, data: true }); R.deliv.push({ u, d: r2(t + OW) }); });
          R.nreq = R.reqs.length + R.fails.length; R.empty = R.fails.length;
        } else {
          R.nreq = 1; for (let t = 2; t < END; t += 3) R.media.push(t);
          const one = turn ? 2 * OW : OW / 2; U.forEach(u => R.deliv.push({ u, d: r2(u + one) }));
        }
        const lat = R.deliv.map(d => d.d - d.u); R.avg = lat.reduce((a, b) => a + b, 0) / lat.length; R.max = Math.max(...lat);
        return R;
      };
      const X = t => 70 + Math.min(t, END) * (520 / END);
      const fmt = s => s < 1 ? Math.round(s * 1000) + ' ms' : s.toFixed(1) + ' s';
      const run = () => {
        const box = el.querySelector('.rl-modes'); box.innerHTML = '';
        Object.entries(MODES).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (mode === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { mode = k; run(); }; box.appendChild(b); });
        const P = +el.querySelector('.rl-p').value, turn = el.querySelector('.rl-turn').checked;
        el.querySelector('.rl-vp').textContent = P + ' s';
        el.querySelector('.rl-pbox').style.display = mode === 'short' ? '' : 'none';
        el.querySelector('.rl-tbox').style.display = mode === 'rtc' ? '' : 'none';
        const R = sim(mode, P, turn);
        const rtc = mode === 'rtc', hook = mode === 'hook';
        const yC = rtc ? 30 : 46, yS = rtc ? 100 : 150, yB = 170;
        const lab = rtc ? ['Riya (peer A)', 'Server: signaling / TURN', 'Aman (peer B)'] : hook ? ['Payment provider', 'xyz.com webhook endpoint'] : ['Client (Riya\'s app)', 'xyz.com server'];
        let g = `<text x="70" y="${yC - 8}" font-size="12" fill="var(--ink-2)" font-family="var(--f-mono)">${lab[0]}</text><line x1="70" x2="590" y1="${yC}" y2="${yC}" stroke="var(--line-2)"/>
          <text x="70" y="${yS + 22}" font-size="12" fill="var(--ink-2)" font-family="var(--f-mono)">${lab[1]}</text><line x1="70" x2="590" y1="${yS}" y2="${yS}" stroke="var(--line-2)"/>
          <text x="590" y="196" text-anchor="end" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">60 s</text><text x="70" y="196" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">0</text>`;
        if (rtc) g = g.replace(`<text x="70" y="${yS + 22}"`, `<text x="300" y="${yS - 6}"`) + `<text x="70" y="${yB + 16}" font-size="12" fill="var(--ink-2)" font-family="var(--f-mono)">${lab[2]}</text><line x1="70" x2="590" y1="${yB}" y2="${yB}" stroke="var(--line-2)"/>`;
        if (hook) g += `<rect x="${X(DOWN[0])}" y="${yS - 10}" width="${X(DOWN[1]) - X(DOWN[0])}" height="20" fill="var(--red)" opacity="0.15"/><text x="${X(DOWN[0])}" y="${yS + 22}" font-size="11" fill="var(--red)" font-family="var(--f-mono)" dx="60">down (deploy)</text>`;
        if (R.conn) g += `<rect x="${X(R.conn.a)}" y="${yC + 6}" width="${X(R.conn.b) - X(R.conn.a)}" height="${yS - yC - 12}" fill="var(--accent-soft)" opacity="0.7"/><text x="330" y="${(yC + yS) / 2 + 4}" text-anchor="middle" font-size="12" fill="var(--accent-ink)" font-family="var(--f-mono)">${rtc ? '1 WebSocket for signaling' : '1 connection, open all 60 s'}</text>`;
        R.held.forEach(h => { g += `<rect x="${X(h.a)}" y="${yS - 6}" width="${Math.max(2, X(h.b) - X(h.a))}" height="12" rx="3" fill="var(--amber)" opacity="0.6"/>`; });
        if (!rtc) U.forEach((u, i) => { const x = X(u); g += `<path d="M${x} ${yS - 7} l6 7 l-6 7 l-6 -7z" fill="var(--red)"/>`; });
        const yFrom = hook ? yC : yC, yTo = hook ? yS : yS;
        R.reqs.forEach(q => { g += `<line x1="${X(q.s)}" y1="${yFrom}" x2="${X(q.s + OW)}" y2="${yTo}" stroke="var(--accent)" stroke-width="1.5"/>`; if (q.r != null && !q.open && !hook) g += `<line x1="${X(q.r - OW)}" y1="${yS}" x2="${X(q.r)}" y2="${yC}" stroke="${q.data ? 'var(--green)' : 'var(--ink-3)'}" stroke-width="1.5" ${q.data ? '' : 'stroke-dasharray="3 3"'}/>`; });
        R.fails.forEach(t => { g += `<line x1="${X(t)}" y1="${yC}" x2="${X(t + OW)}" y2="${yS}" stroke="var(--red)" stroke-width="1.5"/><text x="${X(t + OW)}" y="${yS + 4}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--red)">x</text>`; });
        R.ticks.forEach(t => { g += `<line x1="${X(t)}" y1="${yC + 2}" x2="${X(t)}" y2="${yS - 2}" stroke="var(--ink-3)" stroke-dasharray="2 3"/><text x="${X(t) + 3}" y="${yC + 18}" font-size="10" fill="var(--ink-3)" font-family="var(--f-mono)">${mode === 'sse' ? 'keep-alive' : 'ping'}</text>`; });
        R.up.forEach(t => { g += `<line x1="${X(t)}" y1="${yC}" x2="${X(t + OW)}" y2="${yS}" stroke="var(--violet)" stroke-width="2"/><text x="${X(t) + 4}" y="${yS - 10}" font-size="10" fill="var(--violet)" font-family="var(--f-mono)">typing</text>`; });
        if (rtc) {
          g += `<line x1="${X(0)}" y1="${yC}" x2="${X(0.4)}" y2="${yS}" stroke="var(--accent)"/><line x1="${X(0.4)}" y1="${yS}" x2="${X(0.8)}" y2="${yB}" stroke="var(--accent)"/><line x1="${X(1)}" y1="${yB}" x2="${X(1.4)}" y2="${yS}" stroke="var(--green)"/><line x1="${X(1.4)}" y1="${yS}" x2="${X(1.8)}" y2="${yC}" stroke="var(--green)"/>`;
          R.media.forEach(t => { g += turn ? `<line x1="${X(t)}" y1="${yC}" x2="${X(t + 0.4)}" y2="${yS}" stroke="var(--amber)" stroke-width="2"/><line x1="${X(t + 0.4)}" y1="${yS}" x2="${X(t + 0.8)}" y2="${yB}" stroke="var(--amber)" stroke-width="2"/>` : `<path d="M${X(t)} ${yC} Q ${X(t) - 26} ${yS} ${X(t + 0.4)} ${yB}" fill="none" stroke="var(--green)" stroke-width="2" stroke-dasharray="4 3"/>`; });
        }
        R.deliv.forEach(d => { g += `<circle cx="${X(d.d)}" cy="${rtc ? yB : yC}" r="4.5" fill="var(--green)"/>`; });
        el.querySelector('.rl-svg').innerHTML = g;
        el.querySelector('.rl-o-req').textContent = R.nreq;
        el.querySelector('.rl-o-emp').textContent = R.empty;
        el.querySelector('.rl-o-lat').textContent = fmt(R.avg);
        el.querySelector('.rl-o-con').textContent = { short: 'none', long: '1 held request', sse: '1 (one way)', ws: '1 (two way)', hook: 'none', rtc: turn ? '1 + media relay' : '1 (signaling only)' }[mode];
        const N = {
          short: `${R.nreq} requests, ${R.empty} of them empty. Updates arrive ${fmt(R.avg)} late on average (worst ${fmt(R.max)}). Make P smaller: less delay, more empty requests. Make it bigger: the opposite.`,
          long: `Only ${R.nreq} requests, delay ~${fmt(R.avg)}. The server is always holding one of Riya\'s requests (yellow). The ${LPT} s timeout fired ${R.empty} times and sent an empty answer (long silences between 9 → 31 and 31 → 52).`,
          sse: `1 request opened one long response, and all four updates arrived in ~${fmt(R.avg)}. Every 15 s a tiny keep-alive line, so proxies in between do not decide "this connection is dead" and cut it. The client cannot send anything on this stream.`,
          ws: `1 upgrade request, then both directions on one connection: 4 server pushes (~${fmt(R.avg)}) and 2 "typing" frames from Riya (purple). The ping/pong heartbeat shows the line is alive.`,
          hook: `No open connection: the provider sends one POST per event. The event at 31 s failed ${R.fails.length} times because the endpoint was down, then arrived at 38 s after backoff (1, 2, 4 s). That is why webhooks are at-least-once and the receiver must dedupe.`,
          rtc: turn ? `The firewall blocked the direct path, so media went through the TURN server (yellow): delay ~${fmt(R.avg)}, and all the video uses our server\'s bandwidth. The signaling server was only needed at the start (0-2 s).` : `The signaling server only delivered the offer/answer at the start (0-2 s). After that, media went straight Riya → Aman (green dashed) and never touched the server. Delay ~${fmt(R.avg)}. Turn on "Strict firewall" to see the cost of TURN.`,
        };
        el.querySelector('.rl-note').textContent = N[mode];
      };
      el.querySelectorAll('input').forEach(i => { i.addEventListener('input', run); i.addEventListener('change', run); }); run();
    }},
    { type: 'callout', tone: 'tip', html: `Summary (for this 60 s story): short polling with P = 5 s makes 13 requests, 10 of them empty, delay ~3 s. Long polling makes 7 requests, 2 empty (timeouts), delay ~100 ms. SSE and WebSocket make 1 request with ~100 ms delay, but the connection stays open the whole time. In the webhook, the endpoint was down, so one event arrived 7 s late. In WebRTC the media never touches the server (~50 ms), unless TURN is needed.` },

    { type: 'h2', text: 'Every method at a glance' },
    { type: 'table', head: ['', 'What goes over the wire', 'Cost', 'When', 'When not'], rows: [
      ['Short polling', 'A normal GET every P sec', 'Many requests, mostly empty; delay ≈ P/2', 'Few updates, some delay is fine, or the response is CDN-cacheable (live score JSON)', 'Chat, games: need low latency'],
      ['Long polling', 'A GET that the server holds until there is data (or a timeout)', 'A new request after every update; one held request per user', 'A fallback when persistent connections are not possible (old proxies)', 'Very frequent updates'],
      ['SSE', 'One long HTTP response, <code>text/event-stream</code>', 'One connection per user; server → client only', 'One-way streams: AI tokens, notifications, live commentary', 'The client must also send often; binary data'],
      ['WebSocket', 'Full-duplex frames after a 101 upgrade', 'One connection per user; stateful servers; you write reconnect yourself', 'Two-way, frequent, low latency: chat, games, Docs cursors, driver app', 'Occasional updates (overkill)'],
      ['Webhook', 'An HTTP POST from one server to another', 'The receiver needs a public endpoint, signature checks, dedupe', 'Telling a third party that something happened: payment success', 'Updating a browser or app (they have no public URL)'],
      ['WebRTC', 'Browser to browser, direct (media over UDP)', 'Signaling server + STUN/TURN; an SFU for group calls', 'Audio/video calls, screen share', 'When the server needs the data or must store it'],
    ]},
    { type: 'callout', tone: 'warn', title: 'SSE and the HTTP/1.1 connection limit', html: `Over HTTP/1.1 a browser opens only a few (usually ~6) connections per domain. Each tab's SSE stream uses up one connection, so with many tabs open other requests can get stuck. HTTP/2 runs many streams over one connection, which mostly removes this problem. Use HTTP/2 with SSE.` },

    { type: 'h2', text: 'Millions of connections: gateways and a registry' },
    { type: 'p', html: `Now the real scale. At peak, xyz.com chat has 10 lakh users online, each with one WebSocket. The roadmap's rule of thumb: one gateway ~100k connections, so ~10 gateway servers. A new problem: Riya is connected to Gateway 1, Aman to Gateway 2. Riya's message arrived at Gateway 1. <strong>How does Gateway 1 know where Aman is?</strong>` },
    { type: 'callout', tone: 'term', title: 'Connection gateway', html: `<strong>What it is:</strong> a separate fleet of servers whose only job is to hold millions of persistent connections (WebSocket/SSE): login check (auth), heartbeats, reading and writing frames. No business logic here; that lives in the chat service.<br><strong>Why we need it:</strong> gateways stay light, and deploying a new version of the chat logic does not break users' connections.<br><strong>Without it:</strong> every chat code deploy disconnects 10 lakh users at once.` },
    { type: 'callout', tone: 'term', title: 'Registry (user → gateway)', html: `<strong>What it is:</strong> a fast shared store (often Redis) that says "which user is on which gateway", like <code>aman → gw2</code>. The gateway writes the entry on connect (with a TTL), extends the TTL on each heartbeat, and removes it on disconnect. (<strong>TTL</strong> = an expiry time on the entry, as in the Caching lesson.)<br><strong>Why we need it:</strong> the message arrived at Riya's gateway, but Aman is on another gateway. Where do we send it?<br><strong>Without it:</strong> every message is broadcast to every gateway: very expensive with 1,000 gateways.` },
    { type: 'callout', tone: 'term', title: 'Heartbeat', html: `<strong>What it is:</strong> a small "are you alive?" signal every few seconds (WebSocket ping/pong, an SSE keep-alive line). A few missed heartbeats = treat the connection as dead.<br><strong>Why we need it:</strong> when the network is cut in the middle (a train tunnel, wifi lost), often no "connection closed" signal arrives. Without heartbeats both sides keep believing the line is alive (a "zombie" connection). Also, proxies in between cut quiet connections.<br><strong>Without it:</strong> messages keep being written into a dead connection, and the registry points to the wrong gateway.` },
    { type: 'callout', tone: 'term', title: 'Reconnect with backoff + jitter', html: `<strong>What it is:</strong> when the connection breaks, connect again, but double the wait after each failure (1 s, 2 s, 4 s...) and add a random difference (jitter) to it. Then tell the server "I have seen up to message X" (resume).<br><strong>Why we need it:</strong> if a gateway dies, its 100k users all reconnect. If they all come at the same moment, the other gateways can fall over too (a <strong>thundering herd</strong>).<br><strong>Without it:</strong> one gateway failing turns into the whole system failing.` },
    { type: 'flow', title: 'Message Riya → Aman, different gateways', height: 330,
      nodes: [
        { id: 'a', label: 'Riya (app)', x: 80, y: 80, w: 120, kind: 'client', info: 'What it is: Riya\'s chat app. Connected to Gateway 1 over WebSocket.' },
        { id: 'b', label: 'Aman (app)', x: 80, y: 260, w: 120, kind: 'client', info: 'What it is: Aman\'s chat app. Connected to Gateway 2. Sends a ping every 30 s (heartbeat).' },
        { id: 'lb', label: 'L4 LB', sub: 'TCP', x: 250, y: 170, w: 110, kind: 'net', info: 'What it is: an L4 load balancer (LB lesson). It spreads new connections across gateways. Least connections works well for long connections. Once a connection is made, it stays with that gateway.' },
        { id: 'g1', label: 'Gateway 1', sub: 'WebSockets', x: 430, y: 80, w: 140, kind: 'server', meter: true, load: 55, info: 'What it is: a connection gateway server, ~100k connections. It only handles connections; as soon as a message arrives it hands it to the chat service.' },
        { id: 'g2', label: 'Gateway 2', sub: 'WebSockets', x: 430, y: 260, w: 140, kind: 'server', meter: true, load: 55, info: 'What it is: a second gateway server. If it dies, all its users reconnect at once: hence backoff + jitter.' },
        { id: 'reg', label: 'Registry', sub: 'Redis: user→gw', x: 640, y: 80, w: 140, kind: 'cache', info: 'What it is: the user → gateway mapping in Redis, with a TTL. Heartbeats refresh the TTL. If a gateway dies, its entries expire by themselves after the TTL.' },
        { id: 'msg', label: 'Chat service', sub: 'store + route', x: 640, y: 260, w: 140, kind: 'server', info: 'What it is: the chat business logic. It first saves the message in the DB (durability), then finds the recipient\'s gateway in the registry and sends it there. In big systems this "send" often goes over pub/sub: each gateway subscribes to its own channel.' },
      ],
      edges: [{ a: 'a', b: 'lb' }, { a: 'b', b: 'lb' }, { a: 'lb', b: 'g1' }, { a: 'lb', b: 'g2' }, { a: 'g1', b: 'reg' }, { a: 'g2', b: 'reg' }, { a: 'g1', b: 'msg' }, { a: 'g2', b: 'msg' }, { a: 'msg', b: 'reg' }],
      scenarios: [
        { name: 'Connect + register', steps: [
          { title: 'Aman connects', go: 'b>lb>g2', text: 'WebSocket upgrade; the LB picked Gateway 2. The gateway checks the token (auth).', msg: 'GET /ws  Upgrade: websocket  Authorization: Bearer ...' },
          { title: 'Entry in the registry', go: 'g2>reg', text: 'Gateway 2 writes: aman → gw2, 60 s TTL. Every heartbeat refreshes the TTL.', after: { reg: { sub: 'aman → gw2' } }, msg: 'SET conn:aman gw2 EX 60' },
          { title: 'Riya too', go: ['a>lb>g1', 'g1>reg'], text: 'Riya is on Gateway 1; entry riya → gw1.', after: { reg: { sub: 'aman→gw2, riya→gw1' } } },
        ]},
        { name: 'Message route', steps: [
          { title: 'Riya sends', go: 'a>lb>g1', text: 'The message reached Gateway 1.', msg: '{ "to": "aman", "text": "hi", "client_msg_id": "c-77" }' },
          { title: 'Chat service: save', go: 'g1>msg', text: 'First saved in the DB (it got message ID 5012). Now even if delivery fails, the message is not lost. client_msg_id stops a retry from creating a duplicate.' },
          { title: 'Where is Aman?', go: ['msg>reg', 'res:reg>msg'], text: 'Registry: aman → gw2.', after: { reg: { state: 'hit' } }, msg: 'GET conn:aman  →  gw2' },
          { title: 'Push through Gateway 2', go: 'msg>g2>lb>b', text: 'Gateway 2 wrote a frame on Aman\'s open WebSocket. Aman\'s app sends a "delivered" ack, so Riya sees a double tick.', after: { b: { state: 'ok', sub: 'got 5012' } } },
        ]},
        { name: 'Aman offline', steps: [
          { title: 'No entry in the registry', go: ['a>lb>g1', 'g1>msg', 'msg>reg', 'bad:reg>msg'], text: 'Aman\'s app is closed; his entry expired via TTL. No gateway.', after: { reg: { state: 'miss', sub: 'aman: (none)' } } },
          { title: 'Store + mobile push', text: 'The message is safe in the DB. The chat service asks the push notification service (APNs/FCM: Apple\'s and Google\'s phone notification services) to notify Aman\'s phone. This is a separate path from our WebSocket.', focus: ['msg'], msg: 'push → APNs/FCM: "Riya: hi"' },
          { title: 'Sync when the app opens', go: ['b>lb>g2', 'g2>msg'], text: 'Aman opened the app, connected, and said "I have up to 5011". The chat service sends 5012 and later messages.', after: { b: { state: 'ok', sub: 'synced from 5011' } }, msg: '{ "type": "resume", "last_msg_id": 5011 }' },
        ]},
        { name: 'Gateway 2 dies', intro: 'Gateway 2\'s machine suddenly went down. What about its 100k users?', steps: [
          { title: 'Crash', set: { g2: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'lost:g2>lb', text: 'All of Gateway 2\'s connections broke in one go.' },
          { title: 'Noticed by heartbeat', go: 'lost:b>lb', text: 'Aman\'s app got no pong for its ping (or got a TCP close). The app concludes: the connection is dead. Without heartbeats, a "zombie" connection would look alive for minutes.', set: { b: { state: 'warn', sub: 'disconnected' } } },
          { title: 'A message arrives meanwhile', go: ['a>lb>g1', 'g1>msg', 'msg>reg', 'res:reg>msg', 'lost:msg>g2'], text: 'The registry still has the old entry aman → gw2 (TTL not over). Delivery fails, but the message is saved in the DB. Nothing is lost, only delayed.', after: { reg: { state: 'warn', sub: 'aman → gw2 (stale)' } } },
          { title: 'Reconnect: backoff + jitter', go: 'b>lb>g1', text: 'If 100k apps reconnect in the same millisecond, Gateway 1 falls over too (thundering herd). So every app reconnects with <strong>random jitter</strong>, and after a failure with a <strong>growing wait</strong> (1 s, 2 s, 4 s...). Aman landed on Gateway 1.', after: { g1: { load: 85, state: 'hot' } } },
          { title: 'Registry update + resume', go: ['g1>reg', 'b>lb>g1', 'g1>msg', 'res:msg>g1', 'res:g1>lb>b'], text: 'Entry aman → gw1. The app says "last message 5012". The chat service sends 5013 (the one that was missed). The user saw "connecting..." for just a second.', after: { reg: { state: '', sub: 'aman → gw1' }, b: { state: 'ok', sub: 'resumed from 5012' } }, msg: '{ "type": "resume", "last_msg_id": 5012 }  →  [5013]' },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Reconnect storm lab.</strong> 100,000 users of one gateway lost their connection. The other gateways (and the login check) together can accept only 10,000 new connections per second; above that, handshakes fail and the client must try again. Two kinds of failure: the gateway process crashed (TCP closes at once, everyone knows that moment) or the network was cut (no signal; noticed only by heartbeat: 2 missed pings).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rs-f" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="rs-s" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <div class="rs-hbox" style="margin-top:10px"><label>Heartbeat interval: <strong class="rs-vh"></strong></label><input class="rs-h" type="range" min="5" max="60" step="5" value="30"></div>
        <svg class="rs-svg" viewBox="0 0 600 170" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Reconnect attempts per second"></svg>
        <div class="stats">
          <div class="stat"><span>Time to notice</span><strong class="rs-o-d"></strong></div>
          <div class="stat"><span>All reconnected</span><strong class="rs-o-f"></strong></div>
          <div class="stat"><span>Failed handshakes</span><strong class="rs-o-x"></strong></div>
          <div class="stat"><span>Peak attempts / s</span><strong class="rs-o-p"></strong></div>
        </div>
        <div class="calc-note rs-note"></div>`;
      let fail = 'crash', strat = 'now';
      const F = { crash: 'Gateway crash (noticed at once)', cut: 'Network cut (noticed by heartbeat)' };
      const ST = { now: 'Retry at once (every 0.5 s)', backoff: 'Backoff (1, 2, 4... s)', jitter: 'Backoff + jitter' };
      const sim = (strat, fail, hb) => {
        const N = 100000, CAP = 1000, B = 10, T = 3000;
        const Q = Array.from({ length: T + 400 }, () => ({}));
        const add = (i, k, c) => { if (c <= 0) return; Q[i][k] = (Q[i][k] || 0) + c; };
        const spread = (from, len, k, c) => { for (let j = 0; j < len; j++) add(from + j, k, c / len); };
        if (fail === 'crash') { strat === 'jitter' ? spread(0, 2 * B, 0, N) : add(0, 0, N); }
        else { const a = hb * B, len = hb * B; if (strat === 'jitter') { for (let j = 0; j < len; j++) spread(a + j, 2 * B, 0, N / len); } else spread(a, len, 0, N); }
        let left = N, fails = 0, finish = null; const att = new Float64Array(T);
        for (let i = 0; i < T; i++) {
          const q = Q[i]; let n = 0; for (const k in q) n += q[k]; att[i] = n; if (!n) continue;
          const ok = Math.min(CAP, n), fr = 1 - ok / n; left -= ok;
          for (const k in q) { const c = q[k] * fr; if (c < 1e-9) continue; fails += c; const kk = +k;
            if (strat === 'now') add(i + 5, kk + 1, c);
            else { const b = Math.min(300, Math.pow(2, kk) * B); strat === 'jitter' ? spread(i + 1, b, kk + 1, c) : add(i + b, kk + 1, c); } }
          if (left < 0.5 && finish === null) { finish = (i + 1) / B; break; }
        }
        const perSec = []; for (let s = 0; s < T / B; s++) { let a = 0; for (let j = 0; j < B; j++) a += att[s * B + j]; perSec.push(Math.round(a)); }
        return { finish, fails: Math.round(fails), peak: Math.max(...perSec), perSec };
      };
      const btns = (sel, map, get, set) => { const box = el.querySelector(sel); box.innerHTML = ''; Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (get() === k ? ' primary' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); }); };
      const run = () => {
        btns('.rs-f', F, () => fail, k => fail = k); btns('.rs-s', ST, () => strat, k => strat = k);
        const hb = +el.querySelector('.rs-h').value; el.querySelector('.rs-vh').textContent = hb + ' s';
        el.querySelector('.rs-hbox').style.display = fail === 'cut' ? '' : 'none';
        const r = sim(strat, fail, hb), W = 90, top = Math.max(r.peak, 10000) * 1.1, bw = 520 / W, Y = v => 140 - v / top * 125;
        let g = `<line x1="60" x2="580" y1="140" y2="140" stroke="var(--line-2)"/><line x1="60" x2="580" y1="${Y(10000)}" y2="${Y(10000)}" stroke="var(--green)" stroke-dasharray="5 4"/>
          <text x="578" y="${Y(10000) - 4}" text-anchor="end" font-size="12" fill="var(--green)" font-family="var(--f-mono)">capacity 10k/s</text>
          <text x="54" y="${Y(top / 1.1) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">${Math.round(top / 1.1 / 1000)}k</text>
          <text x="60" y="160" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">0 s</text><text x="580" y="160" text-anchor="end" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">90 s</text>`;
        r.perSec.slice(0, W).forEach((v, i) => { if (v) g += `<rect x="${60 + i * bw}" y="${Y(v)}" width="${Math.max(1, bw - 1)}" height="${140 - Y(v)}" fill="${v > 10000 ? 'var(--red)' : 'var(--accent)'}"/>`; });
        el.querySelector('.rs-svg').innerHTML = g;
        el.querySelector('.rs-o-d').textContent = fail === 'crash' ? '~0 s' : hb + '-' + 2 * hb + ' s';
        el.querySelector('.rs-o-f').textContent = r.finish === null ? 'not even in 300 s' : r.finish.toFixed(0) + ' s';
        el.querySelector('.rs-o-x').textContent = r.fails.toLocaleString('en-IN');
        el.querySelector('.rs-o-p').textContent = r.peak.toLocaleString('en-IN');
        let n;
        if (fail === 'cut') n = `In a network cut no "closed" signal arrived. Each app noticed after 2 missed pings (between ${hb} and ${2 * hb} s), so the reconnects spread out by themselves and there was no storm. The price: users stared at a dead connection for up to ${2 * hb} s. A shorter heartbeat notices sooner, but means more pings on every connection (millions of connections × every ${hb} s).`;
        else if (strat === 'now') n = `All 100,000 came at once, but capacity is only 10,000/s. The rest kept retrying every 0.5 s: a peak of ${r.peak.toLocaleString('en-IN')} attempts/s and ${r.fails.toLocaleString('en-IN')} failed handshakes. In the real world these failed handshakes also eat CPU and can bring down the other gateways.`;
        else if (strat === 'backoff') n = `Backoff, but no jitter: all clients failed at the same moment, so they all retry at the same moment (1 s, 3 s, 7 s... red waves). Only 1,000 get in per wave. Everyone\'s wait kept doubling, and not everyone was connected even after 300 s.`;
        else n = `Jitter spread the retries out over time: the waves melted away, everyone was back in ${r.finish.toFixed(0)} s, peak ${r.peak.toLocaleString('en-IN')}/s. The easiest and most important fix. (Many apps also wait a random 0-2 s before the very first try.)`;
        el.querySelector('.rs-note').textContent = n;
      };
      el.querySelector('.rs-h').addEventListener('input', run); run();
    }},
    { type: 'callout', tone: 'tip', html: `Summary (gateway crash, 100k users, capacity 10k/s): retry at once = ~50 s and ~49.5 lakh failed handshakes. Backoff without jitter = synchronized waves, not finished even in 300 s. Backoff + jitter = ~36 s, ~2.7 lakh failed handshakes. In a network cut, the heartbeat (2 misses) is the only detection: a 30 s heartbeat = the user does not know for 30-60 s.` },
    { type: 'h3', text: 'Heartbeats and reconnection: the rules' },
    { type: 'list', items: [
      `<strong>Heartbeat:</strong> ping/pong frames in WebSocket; in SSE the server sends a comment line (starting with <code>:</code>) every ~15 s so proxies do not cut the idle connection. A few missed heartbeats = the connection is dead; clean up and remove the registry entry.`,
      `<strong>TTL on registry entries:</strong> if a gateway crashes, it cannot delete its own entries. TTL + heartbeat refresh makes stale entries disappear by themselves.`,
      `<strong>Reconnect with exponential backoff + jitter:</strong> otherwise one gateway failing creates a reconnection storm on the other gateways.`,
      `<strong>Resume from the last ID:</strong> the client always says "I have seen up to X" (SSE's Last-Event-ID, chat's last_msg_id). The server fills the gap from the DB. That is why we store first, then deliver.`,
      `<strong>Deploys:</strong> restarting a gateway = all its users reconnect. Drain gateways slowly (no new connections, send old ones a "please reconnect" signal), never all at once.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Do not hide state on the gateway', html: `"Let\'s keep Aman\'s unread messages in Gateway 2\'s memory." The gateway dies and everything is gone. A gateway should hold only the connection; messages go in the DB, the mapping in the registry. Then whichever gateway dies, the user connects to another one and finds the same state.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Updates only go <strong>server → client</strong>? <strong>SSE</strong>. <strong>Both ways</strong>, frequent, low latency? <strong>WebSockets</strong>. Telling <strong>another server</strong>? <strong>Webhook</strong>. Audio/video call? <strong>WebRTC</strong>. Few updates, or the same data for everyone (CDN-cacheable)? <strong>Short polling</strong>. Persistent connections not allowed at all? <strong>Long polling</strong> as a fallback.` },
    { type: 'table', head: ['Technique', 'Direction', 'Use when', 'Real example'], rows: [
      ['Short polling', 'The client asks again and again', 'Few updates, a few seconds of delay is fine, or the response can be CDN-cached', 'Checking a report\'s status; a live score JSON behind a CDN'],
      ['Long polling', 'The client asks; the server holds until there is news', 'A fallback when you cannot keep persistent connections', 'Older chat systems, some sync clients'],
      ['SSE', 'Server → client only', 'One-way updates over plain HTTP, with automatic reconnect', 'ChatGPT / Claude streaming tokens; notifications; live commentary'],
      ['WebSockets', 'Both ways, persistent', 'Frequent two-way messages, low latency', 'WhatsApp chat, multiplayer games, Google Docs cursors, Uber driver app'],
      ['Webhooks', 'Server → another server', 'Telling a third party that something finished', 'Razorpay or Stripe tells a merchant that a payment succeeded'],
      ['WebRTC', 'Peer-to-peer media', 'Audio and video calls', 'Google Meet, WhatsApp calls'],
    ], caption: 'Roadmap phase 5: "Polling, SSE, WebSockets or webhooks?"' },
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com real-time: the whole picture', height: 600,
      nodes: [
        { id: 'riya', label: 'Riya\'s app', sub: 'WebSocket', x: 100, y: 60, kind: 'client', info: 'What it is: Riya\'s chat app. It keeps one WebSocket open and pings every 30 s. If it breaks, it reconnects with backoff + jitter and resumes from the last message ID.' },
        { id: 'aman', label: 'Aman\'s app', sub: 'WebSocket', x: 280, y: 60, kind: 'client', info: 'What it is: Aman\'s chat app. During a video call it sends media straight to Riya over WebRTC (dashed line); the setup goes through signaling.' },
        { id: 'web', label: 'Browser', sub: 'AI answer (SSE)', x: 455, y: 60, kind: 'client', info: 'What it is: a browser using xyz.com\'s AI helper. The prompt goes as a normal POST; the answer comes word by word over an SSE stream.' },
        { id: 'psp', label: 'Payment provider', sub: 'Stripe / Razorpay', x: 630, y: 60, w: 150, kind: 'net', info: 'What it is: the outside payment company. When a payment completes, it sends a signed POST to our webhook URL and retries if it fails.' },
        { id: 'lb', label: 'L4 LB', sub: 'least conn', x: 190, y: 180, w: 120, kind: 'net', info: 'What it is: the load balancer that spreads new WebSocket connections across gateways. Least connections works well for long connections.' },
        { id: 'ai', label: 'AI API', sub: 'SSE stream', x: 455, y: 180, kind: 'server', info: 'What it is: the service that writes AI answers. SSE for a one-way stream: plain HTTP, resume with Last-Event-ID.' },
        { id: 'wh', label: 'Webhook endpoint', sub: 'verify + dedupe', x: 630, y: 180, w: 150, kind: 'server', info: 'What it is: our public URL. Signature check, dedupe by event ID, work into a queue, 200 right away.' },
        { id: 'g1', label: 'Gateway 1', sub: '~100k conns', x: 100, y: 300, kind: 'server', info: 'What it is: a connection gateway. Only connections, auth and heartbeats. No state: messages live in the DB, the mapping in the registry.' },
        { id: 'g2', label: 'Gateway 2', sub: '~100k conns', x: 280, y: 300, kind: 'server', info: 'What it is: a second gateway. If it dies, its users reconnect to the other gateways with jitter.' },
        { id: 'orders', label: 'Orders DB', sub: 'events seen', x: 630, y: 300, w: 150, kind: 'data', info: 'What it is: the orders/subscriptions DB, plus a record of which webhook event IDs are already processed (to catch duplicates).' },
        { id: 'reg', label: 'Registry', sub: 'Redis: user→gw', x: 100, y: 430, kind: 'cache', info: 'What it is: which user is on which gateway, with a TTL. Heartbeats extend the TTL; if a gateway dies, its entries expire by themselves.' },
        { id: 'chat', label: 'Chat service', sub: 'store, then route', x: 280, y: 430, kind: 'server', info: 'What it is: the brain of chat. It saves the message in the DB first, then looks up the recipient\'s gateway in the registry and sends it there. If the user is offline: phone push.' },
        { id: 'push', label: 'APNs / FCM', sub: 'offline push', x: 455, y: 430, kind: 'net', info: 'What it is: Apple\'s and Google\'s phone notification services. Used when the user\'s app is closed and there is no WebSocket.' },
        { id: 'db', label: 'Messages DB', sub: 'source of truth', x: 280, y: 555, kind: 'data', info: 'What it is: the permanent record of every message. Real-time is only the fast way to show it; on reconnect, the gap is filled from here.' },
      ],
      edges: [
        { a: 'riya', b: 'lb', n: 1, label: 'WS frame' },
        { a: 'aman', b: 'lb' },
        { a: 'riya', b: 'aman', dashed: true },
        { a: 'lb', b: 'g1', n: 2 },
        { a: 'lb', b: 'g2' },
        { a: 'g1', b: 'chat', n: 3 },
        { a: 'chat', b: 'db', n: 4, label: 'save' },
        { a: 'chat', b: 'reg', n: 5 },
        { a: 'g1', b: 'reg', dashed: true },
        { a: 'g2', b: 'chat', n: 6, label: 'push' },
        { a: 'chat', b: 'push', kind: 'evt' },
        { a: 'web', b: 'ai', label: 'SSE' },
        { a: 'psp', b: 'wh', label: 'signed POST' },
        { a: 'wh', b: 'orders', label: 'dedupe' },
      ],
      paths: [
        { name: 'Chat message', text: 'Riya → LB → Gateway 1 → chat service: first saved in the DB, then the registry says "Aman is on gw2", and Gateway 2 sends it on Aman\'s WebSocket.', go: ['riya>lb>g1>chat>db', 'chat>reg', 'chat>g2>lb>aman'] },
        { name: 'Aman offline', text: 'Aman is not in the registry. The message is safe in the DB, and his phone gets an APNs/FCM push. When the app opens, it syncs from the last ID.', go: ['riya>lb>g1>chat>db', 'chat>reg', 'chat>push'] },
        { name: 'AI streaming', text: 'The browser sent a prompt; the answer came word by word over an SSE stream. One way, plain HTTP.', go: ['web>ai', 'res:ai>web'] },
        { name: 'Payment webhook', text: 'The provider sent a signed POST. The endpoint checked the signature and the event ID, did the work and replied 200 at once.', go: ['psp>wh>orders', 'res:wh>psp'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>In HTTP the server cannot speak first. Six answers: short polling, long polling, SSE, WebSocket, webhook, WebRTC.</li>
      <li>Short polling: simple and CDN-friendly, but wasted requests and ~P/2 delay. Long polling: the server holds the answer; low delay, one held request per user.</li>
      <li>SSE: a server → client stream over plain HTTP, with auto reconnect + Last-Event-ID. WebSocket: frames both ways, ping/pong; you write reconnect yourself.</li>
      <li>Webhook: a server-to-server POST. Verify the signature, dedupe by event ID, 2xx at once, do not trust the order. WebRTC: peer-to-peer media; needs signaling + STUN/TURN.</li>
      <li>Millions of connections: gateways (only connections) + registry (user → gateway, TTL) + chat service (store first, then route).</li>
      <li>Heartbeats catch zombie connections. Always reconnect with backoff + jitter, and resume from the last ID.</li>
      <li>Decide: one way → SSE, two-way and frequent → WebSocket, server to server → webhook, calls → WebRTC, rare updates / same data for all → short polling.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Users get updates instantly (SSE/WebSocket ~one network trip)', 'No more wasted polling requests', 'Two-way features become possible: typing, presence, games', 'Webhooks let third parties integrate without polling', 'WebRTC saves server bandwidth for media'],
      costs: ['Persistent connections = stateful servers: memory per user, gateways, registry', 'Reconnection storms on deploys and crashes; you need backoff + jitter + resume logic', 'Long connections cause trouble with L4 LBs, proxies and firewalls; heartbeats are a must', 'Webhooks: a public endpoint, signatures, duplicates, out-of-order events', 'WebRTC: signaling + STUN/TURN infrastructure, and a bandwidth bill for TURN'] },

    { type: 'think', questions: [
      { q: 'India vs Pakistan match: 3 crore people are watching the live score. Will you push every ball\'s update over WebSocket?', a: 'Probably not. 3 crore persistent connections = ~300 gateways just for the score, and 3 crore pushes on every ball. The score JSON is the same for everyone, so keep it on the CDN with a 1-2 s TTL and let apps short-poll every few seconds. The origin gets only a few requests from each edge. The roadmap\'s worked example says the same: the maths decides the architecture.' },
      { q: 'You want to show an AI answer word by word, like Claude or ChatGPT. SSE or WebSocket?', a: 'SSE is enough: the user sends one prompt (a normal POST), and the answer streams one way from the server. SSE is plain HTTP, easy with proxies and CDNs, and reconnect is built in. Use WebSocket when the client must also send constantly (like voice mode or collaborative editing).' },
      { q: 'Every time you deploy the gateways, the error rate goes up for 2 minutes. Why, and what will you do?', a: 'On restart, all users of that gateway reconnect at once, causing a spike on the other gateways, auth and the registry. Fix: rolling deploys, drain the gateway (stop new connections, slowly signal old users to reconnect), exponential backoff + jitter in clients, and resume from the last ID on reconnect so there is no bulk re-sync.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A one-way stream from server to client, with automatic reconnect, over plain HTTP. Which one?', options: ['WebSocket', 'SSE', 'Webhook'], answer: 1, explain: 'SSE\'s EventSource handles reconnect and Last-Event-ID by itself.' },
      { q: 'A message reached Riya\'s gateway; Aman is on another gateway. How is it routed?', options: ['Broadcast to every gateway', 'Look up the registry (user → gateway) and send to that gateway', 'Aman\'s app polls every second'], answer: 1, explain: 'The registry says who is connected where. Broadcasting to 1,000 gateways is far too expensive.' },
      { q: 'What should a webhook endpoint do first?', options: ['Run all the business logic, then 200', 'Verify the signature, dedupe by event ID, queue the work and return 2xx at once', 'Call the provider back'], answer: 1, explain: 'A slow handler = provider timeouts and retries. An unsigned handler = anyone can send fake events.' },
      { q: 'After a gateway crash, how should 100k clients reconnect?', options: ['At once, all together', 'Exponential backoff + random jitter, then resume from the last ID', 'Ask users to restart the app'], answer: 1, explain: 'Jitter stops a reconnection storm (thundering herd); resume brings back missed messages.' },
      { q: 'In a WebRTC call both users are behind strict firewalls. How does the media travel?', options: ['Through the signaling server', 'Through a TURN relay server', 'It cannot'], answer: 1, explain: 'If no direct path works, TURN relays the media. Signaling is only for setup.' },
      { q: 'Short polling every 10 s. An update arrives at a random moment. On average, how long until the user sees it?', options: ['~0 s', '~5 s (half the interval)', 'Always ~10 s'], answer: 1, explain: 'An update can arrive anywhere between polls, so the next poll comes on average half an interval later. In the timeline lab, P = 5 s gave a delay of ~3 s (a small sample of 4 updates).' },
      { q: 'Riya\'s train went into a tunnel; the network was cut and no TCP close arrived. How will the server know the connection is dead?', options: ['At once, TCP tells it', 'From missed heartbeats (ping/pong)', 'Never'], answer: 1, explain: 'A silent network cut sends no signal. If a few pings get no pong, treat the connection as dead, clean up and remove the registry entry.' },
    ]},
    { type: 'sources', note: 'Protocol and webhook behaviour come from official specs and docs. Gateway capacity (~100k connections) is the roadmap\'s napkin-maths rule of thumb, not a benchmark.', items: [
      { title: 'HTML Living Standard: Server-sent events', publisher: 'WHATWG', official: true, url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html', used: 'text/event-stream, fields (event, data, id, retry), automatic reconnection with Last-Event-ID, ~15 s comment keep-alive, HTTP/1 per-server connection limit note.' },
      { title: 'RFC 6455: The WebSocket Protocol', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc6455', used: 'HTTP Upgrade handshake with 101 and Sec-WebSocket-Key/Accept, ping/pong as keepalive, close frames.' },
      { title: 'Receive Stripe events in your webhook endpoint', publisher: 'Stripe documentation', official: true, url: 'https://docs.stripe.com/webhooks', used: 'Retries with exponential backoff up to 3 days in live mode, Stripe-Signature HMAC-SHA256 with timestamp and 5-minute default tolerance, duplicates, no ordering guarantee, quick 2xx and async processing.' },
      { title: 'TURN server', publisher: 'webrtc.org', official: true, url: 'https://webrtc.org/getting-started/turn-server', used: 'TURN relays traffic when a direct connection between peers is not possible; ICE server configuration.' },
    ]},
  ],
});
