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
  /* Cost lab: polling vs push for N users. Numbers: ~300 CDN edges, TTL 1 s; ~1 lakh connections per gateway (rough thumb rule). */
  const costLab = (el, T) => {
    const EDGES = 300, GW_CAP = 100000;
    const st = { users: 10000000, iv: 2, u: 30, same: true };
    const OPT = { users: [[10000, T.n[0]], [100000, T.n[1]], [1000000, T.n[2]], [10000000, T.n[3]]], iv: [[1, '1 s'], [2, '2 s'], [5, '5 s'], [10, '10 s']], u: [[1, T.u[0]], [6, T.u[1]], [30, T.u[2]], [60, T.u[3]]], same: [[true, T.same], [false, T.personal]] };
    const f = n => Math.round(n).toLocaleString('en-IN');
    el.innerHTML = `<div class="rtc-q"></div><div class="stats rtc-st"></div><div class="calc-note rtc-v"></div>`;
    const draw = () => {
      const q = el.querySelector('.rtc-q'); q.innerHTML = '';
      Object.keys(OPT).forEach(k => {
        const row = document.createElement('div'); row.style.margin = '0 0 10px';
        row.innerHTML = `<div style="font-weight:600;color:var(--ink);margin-bottom:4px">${T.q[k]}</div><div style="display:flex;flex-wrap:wrap;gap:6px"></div>`;
        OPT[k].forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (st[k] === v ? ' on' : ''); b.setAttribute('aria-pressed', String(st[k] === v)); b.textContent = t; b.onclick = () => { st[k] = v; draw(); }; row.lastChild.appendChild(b); });
        q.appendChild(row);
      });
      const edgeReq = st.users / st.iv, origin = st.same ? Math.min(EDGES, edgeReq) : edgeReq;
      const ppm = 60 / st.iv, useful = Math.min(st.u, ppm), wasted = Math.round(100 * (1 - useful / ppm));
      const delay = st.iv / 2 + (st.same ? 0.5 : 0), gws = Math.ceil(st.users / GW_CAP), pushes = st.users * st.u / 60;
      el.querySelector('.rtc-st').innerHTML = [[T.s[0], f(edgeReq) + ' /s'], [T.s[1], f(origin) + ' /s'], [T.s[2], wasted + '%'], [T.s[3], '~' + delay + ' s'], [T.s[4], f(st.users)], [T.s[5], f(gws)], [T.s[6], f(pushes) + ' /s']].map(([a, b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');
      el.querySelector('.rtc-v').innerHTML = st.same ? T.vSame(f(origin), gws) : (wasted >= 50 ? T.vWaste(wasted) : T.vPush(f(origin)));
    };
    draw();
  };
  const CASES = [
    { q: 'A "Live poll" on xyz.com: during a match, the question "when will the next wicket fall?", and everyone must see the live percentages (updated every 2-3 seconds). 50 lakh viewers.', signal: 'One-way (showing), the same numbers for everyone, a 2-3 second delay is fine. Voting is a normal POST.', pick: 'Vote: POST. Results: short polling behind a CDN (TTL ~2 s)', why: 'The data is the same for everyone, so the CDN edge answers. The origin gets only one request per edge per TTL.', trap: 'Pushing the percentage to every viewer over WebSocket: 50 lakh connections just for one number.' },
    { q: 'A "new comment" bell on the creator dashboard, only for that creator\'s comments. Creators keep the dashboard open for hours.', signal: 'Server → user, different data per user, needed right away, the user sends nothing.', pick: 'SSE', why: 'A one-way personal stream. Plain HTTP, and the browser reconnects by itself. Making every creator poll is wasted requests.', trap: 'Taking WebSocket "because it is live": there is no need for two-way at all.' },
    { q: 'A brand partner\'s system wants to know right away whenever its sponsored video is published.', signal: 'Server → another company\'s server.', pick: 'Webhook (a signed POST to the partner URL, retries with backoff)', why: 'The partner\'s server will not keep a connection open to you. POST on each event; if it fails, retry with backoff; send each event\'s ID so they can spot duplicates.', trap: 'Telling the partner "poll our API every minute": slow, and wasted load on both sides.' },
    { q: 'A live "watch party": 5 friends watch a video together; when anyone pauses or seeks, it happens for everyone right away, with a chat on the side.', signal: 'Both ways, frequent, within milliseconds, a small group.', pick: 'WebSockets', why: 'Every member both sends and receives commands. One persistent two-way connection is the simplest and fastest.', trap: 'SSE + POST would also work, but every pause needs a new POST and a separate stream; for frequent two-way traffic, WebSocket is the direct fit.' },
    { q: 'A bank\'s office network where WebSocket and SSE get cut in the middle. Employees there use xyz.com chat.', signal: 'Persistent connections are not allowed.', pick: 'A long polling fallback (like Socket.IO\'s polling transport)', why: 'Long polling looks like normal request-response, so the proxy cuts it less. Messages arrive a little later, but it works.', trap: 'Switching everyone to long polling "because one network had trouble". Try WebSocket first, and fall back if it fails.' },
    { q: 'A creator streams live video to 2 lakh fans (one-way); the fans only watch.', signal: 'One to lakhs, one-way media, a few seconds of delay is fine.', pick: 'HLS/DASH through a CDN (not WebRTC)', why: 'Small pieces of the video go cheaply from the CDN to lakhs of viewers. WebRTC is for calls, where everyone also talks.', trap: 'WebRTC to 2 lakh peers: a huge media-server bill and a lot of complexity.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'who', q: 'Who must receive the update?', opts: [
        ['user', 'The user\'s app / browser'],
        ['server', 'Another company\'s server (a merchant, a partner)'],
        ['media', 'A live audio / video call'],
      ]},
      { id: 'dir', q: 'Which direction?', when: a => a.who === 'user', opts: [
        ['down', 'Only server → user (the user only watches)'],
        ['both', 'Both ways; the user also sends all the time'],
      ]},
      { id: 'freq', q: 'How often do updates come?', when: a => a.who === 'user', opts: [
        ['rare', 'Now and then; a few seconds of delay is fine'],
        ['often', 'All the time; every second or faster, no delay allowed'],
      ]},
      { id: 'same', q: 'Do all users see the same data?', when: a => a.who === 'user' && a.dir === 'down', opts: [
        ['same', 'Yes, the same for everyone (live score, trending)'],
        ['personal', 'No, different for each user (their order, their AI answer)'],
      ]},
      { id: 'conn', q: 'Can users keep long (persistent) connections?', when: a => a.who === 'user' && a.freq === 'often' && (a.dir === 'both' || a.same === 'personal'), opts: [
        ['yes', 'Yes, a normal internet connection'],
        ['no', 'No: old proxies / a strict corporate firewall cut them'],
      ]},
    ],
    decide(a) {
      if (a.who === 'server') return R('Webhooks', 'The partner\'s server will not keep a connection open with you. As soon as the job is done, send an HTTP POST to its URL ("payment succeeded"). Razorpay/Stripe tell merchants this way.', 'The partner must build a public endpoint and verify signatures, and handle duplicate / out-of-order events. You must run retries (with backoff).', 'The partner polls your status API: simple, but slow and full of wasted requests.');
      if (a.who === 'media') return R('WebRTC', 'A peer-to-peer system built into browsers for audio/video: media goes straight between users, with low latency. The server only sets up the call (signaling).', 'You need a signaling server (often WebSocket) and STUN/TURN servers; on strict firewalls, a bandwidth bill for the TURN relay. Group calls need a media server (SFU).', 'For a live stream from one to lakhs (one-way), not WebRTC: HLS/DASH through a CDN, with a few seconds of delay.');
      if (a.dir === 'both') {
        if (a.freq === 'rare') return R('Normal HTTP requests + short polling', 'The user sends now and then (a normal POST), and new updates come now and then (poll every few seconds). No persistent connection is needed; every server stays stateless.', 'A delay as long as the poll interval between an update arriving and showing; many polls come back empty.', 'SSE (server → user) + POST (user → server), if updates must show right away.');
        return a.conn === 'no'
          ? R('Long polling + POST (fallback)', 'Persistent connections get cut, so the client sends a request and the server holds it until there is news; as soon as it answers, the client sends a new request. The user\'s messages go as normal POSTs.', 'The overhead of a new request after every message; many open requests on the server; more latency than WebSocket.', 'WebSockets with a fallback (like Socket.IO, which drops to long polling when needed).')
          : R('WebSockets', 'Frequent, low-latency messages both ways (chat, multiplayer games, Google Docs cursors, a driver app). Frames flow both ways on one persistent connection, without HTTP headers every time.', 'Stateful servers: memory for every connected user, connection gateways, a user→server registry, heartbeats, and handling reconnection storms.', 'SSE + POST, if the user sends little and the stream from the server is the main traffic.');
      }
      if (a.freq === 'rare') return a.same === 'same'
        ? R('Short polling, CDN cached', 'Few updates and the same data for everyone. The client polls every few seconds; the CDN caches that JSON for a short time, so the origin gets very few requests.', 'A delay as long as the poll interval + the CDN TTL.', 'SSE, if no delay at all is acceptable.')
        : R('Short polling', 'A status that changes now and then ("is the report ready?"). One simple GET every 5-10 seconds. No new infrastructure, servers stay stateless.', 'Most polls get the answer "not yet" (wasted requests); a delay as long as the interval.', 'SSE, when there are very many users and the load from wasted polls starts to show.');
      if (a.same === 'same') return R('Short polling behind a CDN', 'Constant updates, but the <em>same</em> data for everyone (a live score). Even if lakhs of users poll every second, the CDN edges cache the score JSON for 1-2 seconds; the origin gets only a few requests/sec from each edge. No hassle of lakhs of persistent connections.', 'A delay of 1-2 seconds; you tune the CDN TTL and the poll interval.', 'An SSE/WebSocket fan-out service, if you need sub-second updates (like betting).');
      return a.conn === 'no'
        ? R('Long polling', 'Each user has their own stream (their AI answer, their notifications), but persistent connections are not allowed. Long polling is plain request-response, so proxies cut it less.', 'A new request after every update; more latency than SSE; many open requests on the server.', 'SSE, if the network allows it later.')
        : R('SSE (Server-Sent Events)', 'A one-way stream server → user, over plain HTTP, and the browser\'s EventSource also reconnects automatically. ChatGPT/Claude streaming tokens, notifications, live commentary.', 'Only one way; if the user must send, use a separate POST. The connection stays open, so you must handle the number of connections on the server.', 'WebSockets, if you later need frequent two-way messages.');
    },
  };

  Lesson.register({
    id: 'decide-realtime',
    title: 'Polling, SSE or WebSockets?',
    minutes: 26,
    summary: `How do we get "something new happened" from the server to the user (or to another server)? Six methods, and four questions that pick the right one. Plus a trap: not every live thing needs a WebSocket.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `When something new happens on the server (a wicket falls, a new message arrives, a payment goes through), how does that news reach the user?<br>One way: the user keeps asking "anything new?". Another: keep a line always open so the server can tell them itself. A third: one server calls another server by itself.<br>Each way has a different cost. Pick the wrong one, and either the news arrives late, or thousands of servers run for nothing.<br>This lesson has four simple questions that pick the right method, and a calculator so you can see the cost yourself.` },
      { type: 'h2', text: 'The problem: every feature wants to be "live"' },
      { type: 'p', html: `xyz.com now has live commentary for cricket matches, an AI assistant for creators that writes its answer word by word, DM chat, a "video processing done" status, and brand payments. The product manager uses one word for all of them: <em>"real-time"</em>. The engineer\'s job is to ask: <strong>how real-time, in which direction, and to whom?</strong>` },
      { type: 'p', html: `You learned the methods in the <a href="#/realtime">real-time lesson</a>. Here, quickly recall them, then learn to decide.` },
      { type: 'h3', text: 'Six methods, one line each' },
      { type: 'table', head: ['Method', 'In one line', 'Direction'], rows: [
        ['<strong>Short polling</strong>', 'The client asks every few seconds: "anything new?"', 'The client asks'],
        ['<strong>Long polling</strong>', 'The client asks, and the server holds back its answer until there is something new.', 'The client asks, the server waits'],
        ['<strong>SSE</strong> (Server-Sent Events)', 'An open HTTP response in which the server keeps writing new events.', 'Only server → client'],
        ['<strong>WebSocket</strong>', 'A connection that stays open, with messages flowing both ways.', 'Both ways'],
        ['<strong>Webhook</strong>', 'One server tells another by sending a POST to its URL: "the job is done".', 'Server → another server'],
        ['<strong>WebRTC</strong>', 'Audio/video straight between two browsers/phones.', 'Peer → peer'],
      ]},
      { type: 'callout', tone: 'term', title: 'New word: Persistent connection', html: `<strong>What it is:</strong> a connection that does not close after a request; it stays open for minutes or hours (SSE, WebSocket). Like a phone call that was never hung up, versus a text message that is sent and done.<br><strong>Why we need it:</strong> the server can send right away whenever it wants; the user does not have to ask again and again.<br><strong>Without it:</strong> the client must send a new request for every update (polling), and there is a delay.<br><strong>The cost:</strong> the server must remember every open connection (memory). 1 crore users = 1 crore open connections. And some old proxies/firewalls cut long connections in the middle.` },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `Updates only <strong>server → client</strong>? <strong>SSE</strong>. <strong>Both ways, frequent, low latency</strong>? <strong>WebSockets</strong>. <strong>Server → another server</strong>? <strong>Webhook</strong>. Few updates, or the same data for everyone that a CDN can cache? <strong>Short polling</strong>. Persistent connections not allowed? <strong>Long polling</strong>. An audio/video call? <strong>WebRTC</strong>.` },

      { type: 'h2', text: 'Decision helper' },
      { type: 'p', html: `Pick a feature (live score, AI answer streaming, chat, payment status...) and answer. Some questions appear only when their answer can change the decision.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },

      { type: 'h2', text: 'The cost calculator: polling vs push' },
      { type: 'p', html: `See the decision in numbers. How many users, how often they poll, how often the data changes, and whether everyone sees the same data or each user sees different data. The top stats are the cost of <strong>polling</strong>, the bottom ones the cost of <strong>push</strong> (SSE/WebSocket). Assumed: ~300 CDN edges, an edge cache TTL of 1 second, and one gateway holding ~1 lakh connections (a rough rule of thumb, not a benchmark).` },
      { type: 'custom', render(el) { costLab(el, { q: { users: 'How many users at once?', iv: 'Poll interval', u: 'How often does the data change?', same: 'What is the data like?' }, n: ['10 thousand', '1 lakh', '10 lakh', '1 crore'], u: ['1 time/min', '6 times/min', '30 times/min', '60 times/min'], same: 'Same for all (score)', personal: 'Different per user', s: ['Polls: at CDN/servers', 'Polls: at origin', 'Wasted polls', 'Polling: avg delay', 'Push: open connections', 'Push: gateways', 'Push: messages'], vSame: (o, g) => `Same data: the CDN ends each poll at the edge, so the origin gets only ~${o} requests/sec. Push would need ${g} gateways. <strong>Polling + CDN wins.</strong>`, vWaste: w => `${w}% of polls get the answer "nothing new". Each user has different data, so the CDN will not help. If there are very many users, think about <strong>push (SSE/WebSocket) or a longer poll interval</strong>; if this is just a status, polling is still fine.`, vPush: o => `The data changes on almost every poll and is different for each user: ${o} requests/sec at the origin. Here one open <strong>SSE/WebSocket</strong> connection is cheaper and faster than a new request each time.` }); } },
      { type: 'p', html: `Try it: <strong>1 crore, 2 s, 30 times/min, same for all</strong> = 50 lakh req/s at the CDN, but only 300 at the origin. Now pick "different per user": the origin also gets 50 lakh. Then <strong>1 lakh, 5 s, 1 time/min, different</strong> (video processing status): 92% of polls are wasted, but the total is only 20,000 req/s, which a small cluster can handle.` },

      { type: 'h2', text: 'The whole table' },
      { type: 'table', head: ['Technique', 'Direction', 'Use when', 'Real example'], caption: 'Roadmap phase 5: "Polling, SSE, WebSockets or webhooks?"', rows: [
        ['Short polling', 'The client asks again and again', 'Updates are rare, a few seconds of delay is fine, or the response can be cached by a CDN', 'Checking a report\'s status; live score JSON behind a CDN'],
        ['Long polling', 'The client asks, the server holds until there is news', 'A fallback when you cannot keep persistent connections', 'Older chat systems, some sync clients'],
        ['SSE', 'Server → client only', 'One-way updates over plain HTTP, with automatic reconnect', 'ChatGPT / Claude streaming tokens; notifications; live commentary'],
        ['WebSockets', 'Both ways, persistent', 'Frequent two-way messages, low latency', 'WhatsApp chat, multiplayer games, Google Docs cursors, the Uber driver app'],
        ['Webhooks', 'Server → another server', 'Telling a third party that something finished', 'Razorpay or Stripe telling a merchant that a payment succeeded'],
        ['WebRTC', 'Peer to peer media', 'Audio and video calls', 'Google Meet, WhatsApp calls'],
      ]},
      { type: 'h2', text: 'Each method, one by one: how, when, trap' },
      { type: 'h3', text: 'Short polling' },
      { type: 'p', html: `<strong>How:</strong> the client sends a normal GET every N seconds. The server answers right away, whether there is anything new or not.<br><strong>xyz.com:</strong> the "video processing: 40%..." status, and the live score JSON that sits behind a CDN.<br><strong>Why:</strong> the simplest. Every request stands alone, the server remembers nothing (stateless), and a CDN can cache the answer.<br><strong>Trap:</strong> different data per user + polling every second + lakhs of users. Most answers are "nothing new", and all of them hit your servers directly. Pick "different per user" in the calculator and see.` },
      { type: 'h3', text: 'Long polling' },
      { type: 'p', html: `<strong>How:</strong> the client sends a request. The server does not answer right away; it holds the request (say, up to 30 seconds) until something new arrives. As soon as it answers, the client sends the next request.<br><strong>xyz.com:</strong> users on office networks whose firewalls cut WebSockets; chat runs on long polling for them.<br><strong>Why:</strong> news arrives almost right away, and it is plain request-response, so old proxies cut it less.<br><strong>Trap:</strong> making it the first choice. The overhead of a new request after every message, and thousands of held requests on the server. It is a <em>fallback</em>; libraries like Socket.IO drop to it when WebSocket does not work.` },
      { type: 'h3', text: 'SSE (Server-Sent Events)' },
      { type: 'p', html: `<strong>How:</strong> the client sends a normal HTTP request; the server does not close the response, and keeps writing event after event in the <code>text/event-stream</code> format. The browser\'s <code>EventSource</code> reconnects by itself when the connection breaks, and can resume from the same point by sending <code>Last-Event-ID</code>.<br><strong>xyz.com:</strong> the creator\'s AI assistant writes its answer word by word; live commentary; the notifications bell.<br><strong>Why:</strong> a server → user stream, over plain HTTP, with reconnect for free.<br><strong>Trap:</strong> the user also needs to send all the time (chat, a game). SSE is one-way; then use WebSocket. A second trap: proxies in between cut idle connections, so send a keep-alive comment line every ~15 seconds.` },
      { type: 'h3', text: 'WebSocket' },
      { type: 'p', html: `<strong>How:</strong> an HTTP request asks for an "upgrade", and that same TCP connection becomes a two-way channel. Small messages (frames) flow both ways, without the weight of HTTP headers each time.<br><strong>xyz.com:</strong> DMs, "typing...", read receipts; and the setup messages (signaling) for the creator-brand call.<br><strong>Why:</strong> both ways, within milliseconds, all the time.<br><strong>Trap:</strong> using it for every "live" thing. Each user\'s connection is stuck to one server (stateful): gateways, a registry (which user is on which gateway), heartbeats, and a <strong>reconnection storm</strong> on deploy (lakhs of phones reconnecting at once). Details: <a href="#/realtime">Real-time lesson</a>.` },
      { type: 'h3', text: 'Webhook' },
      { type: 'p', html: `<strong>How:</strong> when a job finishes, one company\'s server sends an HTTP POST to a URL given by another company.<br><strong>xyz.com:</strong> Razorpay tells xyz.com at <code>/webhooks/payments</code> that "the brand\'s payment went through".<br><strong>Why:</strong> the partner\'s server will not keep a connection open to you, and asking again and again (polling) is wasteful.<br><strong>Trap:</strong> assuming a webhook arrives "once, in order". The same event can arrive twice (a retry), can arrive out of order, and anyone can send a fake POST to your URL. So: verify the signature, drop duplicates by event ID (idempotency), answer 2xx fast and put heavy work in a queue.` },
      { type: 'h3', text: 'WebRTC' },
      { type: 'p', html: `<strong>How:</strong> audio/video goes straight between two browsers/phones. First, both sides need to find each other: these setup messages (<strong>signaling</strong>) go through your server, often over WebSocket. A <strong>STUN</strong> server tells you your public address on the internet; if no direct path is found, a <strong>TURN</strong> server relays the media in the middle.<br><strong>xyz.com:</strong> a video call between a creator and a brand.<br><strong>Why:</strong> media goes straight between users, with the lowest latency, and saves server bandwidth.<br><strong>Trap:</strong> WebRTC for a live stream from one to lakhs. That is a one-way broadcast: HLS/DASH through a CDN is better (with a few seconds of delay). And in group calls, if everyone sends to everyone, bandwidth explodes; then you need a media server (SFU).` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"Real-time = WebSocket" <strong>is wrong</strong>. WebSocket is the most powerful, but also the most costly: each user\'s connection is stuck to one server (stateful), lakhs reconnect on every deploy, and you need a whole system of load balancer/gateways/registry. If the data is one-way, SSE does the same job over plain HTTP. And if everyone sees the same data, polling + CDN is often the cheapest and the sturdiest. A second mistake: "polling is old and bad". Polling is stateless, cacheable, and never breaks; it is wrong only when each user needs different data every second.` },
      { type: 'h2', text: 'Worked scenarios' },
      { type: 'h3', text: '1. Trap: the live score of the IPL final, 1 crore fans' },
      { type: 'p', html: `First thought: "it is live, so WebSocket". But look at the signals: the direction is only server → fans, and <strong>everyone sees exactly the same data</strong>. Napkin maths: 1 crore fans polling every 2 seconds = 50 lakh requests/sec. Scary for your servers, but easy for a <a href="#/cdn">CDN</a>: the score JSON is the same for everyone, so the edges cache it for 1-2 seconds. If there are ~300 edges and each edge asks the origin once a second, the origin gets only ~300 requests/sec. <strong>Decision: short polling behind a CDN.</strong> A 1-2 second delay is perfectly fine for cricket.` },
      { type: 'h3', text: '2. The AI assistant\'s answer, word by word' },
      { type: 'p', html: `The creator asks a question, and the model sends tokens as it makes them. Direction: server → user, and each user gets a different answer. The user\'s question is a normal POST. <strong>Decision: SSE</strong>. Products like ChatGPT and Claude use this pattern for streaming: the response is <code>text/event-stream</code> and the tokens arrive one event at a time.` },
      { type: 'h3', text: '3. DMs and "typing..."' },
      { type: 'p', html: `Constant messages both ways, a typing indicator, read receipts, all within milliseconds. <strong>Decision: WebSockets</strong>, with connection gateways and a registry that remembers which user is on which gateway.` },
      { type: 'h3', text: '4. "Your video is being processed..."' },
      { type: 'p', html: `Transcoding takes 5-10 minutes, and the status changes 3-4 times. A connection open for hours for this? Wasteful. <strong>Decision: short polling</strong> with <code>GET /videos/v1/status</code> every 5-10 seconds. (And a mobile push notification if the app is closed.)` },
      { type: 'h3', text: '5. The brand made a payment' },
      { type: 'p', html: `The payment gateway (Razorpay/Stripe) must tell xyz.com\'s server that the payment went through. This is server to server. <strong>Decision: webhook</strong>: the gateway will POST to our <code>/webhooks/payments</code>. We will verify the signature, drop duplicates by event ID, and answer 2xx right away.` },
      { type: 'h3', text: '6. A video call between a creator and a brand' },
      { type: 'p', html: `<strong>Decision: WebRTC</strong>. Media goes straight between the two browsers; our server only delivers the call setup messages (signaling), often over WebSocket.` },
      { type: 'h2', text: 'Practice: 6 short cases' },
      { type: 'p', html: `For each case, ask four questions: to whom? in which direction? how often? the same for everyone or different? Then press "Show signal" and "Show answer".` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' }); } },

      { type: 'h2', text: 'Live score: the right and the wrong choice, run it and see' },
      { type: 'flow', height: 340,
        nodes: [
          { id: 'fans', label: '1 crore fans', sub: 'phone, browser', x: 90, y: 170, w: 150, kind: 'client', info: 'What it is: the fans watching the match on xyz.com, on phones and browsers. They all watch the same match. They all need the same score.' },
          { id: 'cdn', label: 'CDN edges', sub: 'TTL 1 s', x: 330, y: 75, w: 150, kind: 'edge', info: 'What it is: CDN edges, meaning cache servers placed near the users\' cities. The score JSON is the same for everyone, so one edge caches it for 1 second and answers lakhs of requests by itself.' },
          { id: 'gw', label: 'WS gateways', sub: '~100k conn each', x: 330, y: 265, w: 150, kind: 'server', meter: true, load: 10, info: 'What it is: WebSocket gateway servers, which hold the users\' open connections. Every open connection takes memory; one gateway handles roughly a lakh connections (a rough rule of thumb). 1 crore fans = ~100 gateways.' },
          { id: 'org', label: 'Score service', sub: 'origin', x: 590, y: 150, w: 150, kind: 'server', meter: true, load: 5, info: 'What it is: the score service (origin), the server where the real score lives. Protecting it is the whole point of this design.' },
          { id: 'sc', label: 'Scorer app', x: 590, y: 290, w: 150, kind: 'client', info: 'What it is: the scorer\'s app. The scorer sitting in the stadium updates the score after every ball.' },
        ],
        edges: [{ a: 'fans', b: 'cdn', id: 'fc' }, { a: 'fans', b: 'gw', id: 'fg' }, { a: 'cdn', b: 'org', id: 'co' }, { a: 'gw', b: 'org', id: 'go' }, { a: 'sc', b: 'org' }],
        scenarios: [
          { name: 'Polling + CDN (correct)', steps: [
            { title: 'Setup', text: 'Fans send <code>GET /match/42/score.json</code> every 2 seconds. A CDN sits in the middle.', hide: ['gw', 'fg', 'go'], show: ['cdn', 'fc', 'co'], focus: ['cdn'] },
            { title: 'Lakhs of polls, ending at the edge', text: 'Lakhs of requests arrive every second, but the edge has a copy that is 1 second old: a <strong>cache hit</strong>.', flood: { paths: ['fans>cdn'], n: 14 }, after: { cdn: { state: 'hit', sub: 'HIT 99.99%' } } },
            { title: 'Only one request per edge per second at the origin', text: 'When the TTL runs out, the edge asks the origin once.', go: ['cdn>org', 'res:org>cdn'], after: { org: { load: 8, state: 'ok', sub: '~300 req/s' } }, msg: 'GET /match/42/score.json   (edge → origin, 1/s)' },
            { title: 'Wicket!', text: 'The scorer updated it. Within the next 1-2 seconds all edges pick up the new score, and fans see it on their next poll.', go: ['sc>org', 'res:org>cdn', 'res:cdn>fans'], msg: '{"score":"182/5","over":"18.3"}' },
          ]},
          { name: 'WebSockets (wrong)', steps: [
            { title: 'Setup', text: '1 crore open WebSocket connections, on ~100 gateways.', show: ['gw', 'fg', 'go'], hide: ['cdn', 'fc', 'co'], set: { gw: { load: 85, state: 'hot', sub: '1 crore conn' } }, focus: ['gw'] },
            { title: 'Wicket! 1 crore pushes', text: 'One update must be written to 1 crore separate connections. This fan-out work is now your servers\' job, not the CDN\'s.', go: ['sc>org', 'org>gw'], flood: { paths: ['res:gw>fans'], n: 14 }, msg: 'push × 10,000,000' },
            { title: 'A deploy / one gateway crashes', text: 'The gateways restarted. Lakhs of phones reconnect <em>at the same time</em>: a <strong>reconnection storm</strong>.', set: { gw: { state: 'down', sub: 'restarting' } }, flood: { paths: ['fans>gw'], n: 16 }, after: { gw: { state: 'hot', load: 100, sub: 'overloaded!' } } },
            { title: 'The result', text: 'More servers, more code (gateways, heartbeats, backoff + jitter), more failure modes, and no extra benefit for fans, because the score only changes every few seconds. One-way + same data = polling + CDN.', focus: ['gw'] },
          ]},
        ],
      },
      { type: 'h2', text: 'One feature, several methods' },
      { type: 'p', html: `In real apps, 2-3 methods run together inside one feature. A chat app: WebSocket for messages, a mobile push notification when the app is closed, and a long polling fallback when WebSocket does not work. The AI assistant: the question through POST, the answer through SSE, and the "job finished" email through a webhook/queue. Make the decision separately for each <em>direction and need</em>, not once for the whole app.` },
      { type: 'h2', text: 'How to say it in an interview' },
      { type: 'list', items: [
        '"The live score is one-way and the same for everyone, so 2-second polling with a CDN TTL of 1 s. ~300 req/s at the origin, no persistent connections."',
        '"The AI answer streams over SSE; the question is a normal POST. Keep-alive comments to survive proxy timeouts."',
        '"WebSocket gateways for DMs, a user→gateway registry in Redis, heartbeats, and backoff + jitter on reconnect."',
        '"The payment gateway tells us through a webhook; signature check, dedupe by event ID, 2xx right away."',
      ]},
      { type: 'diagram', title: 'Real-time at xyz.com: the whole picture', height: 490,
        groups: [
          { label: 'Users', x: 4, y: 14, w: 712, h: 74 },
          { label: 'Edge', x: 4, y: 108, w: 712, h: 104 },
          { label: 'Services', x: 4, y: 236, w: 712, h: 100 },
          { label: 'Data + outside', x: 4, y: 366, w: 712, h: 108 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'phone + browser', x: 250, y: 50, w: 170, kind: 'client', info: 'What it is: xyz.com\'s users. In one app they watch the score (polling), chat (WebSocket), ask the AI (SSE), and video-call a brand (WebRTC).' },
          { id: 'brand', label: 'Brand', sub: 'video call peer', x: 560, y: 50, w: 150, kind: 'client', info: 'What it is: the brand\'s browser on the other side of the call. Audio/video goes straight between users (WebRTC); setup messages go through the WebSocket gateway.' },
          { id: 'cdn', label: 'CDN edges', sub: 'score JSON, 1 s', x: 90, y: 170, w: 140, kind: 'edge', info: 'What it is: cache servers near the users. The live score is the same for everyone, so every poll ends at the edge; the origin gets ~1 request/sec from each edge.' },
          { id: 'gw', label: 'WS gateways', sub: 'chat, signaling', x: 330, y: 170, w: 150, kind: 'server', info: 'What it is: the WebSocket servers that hold the users\' open connections. DMs, typing, read receipts, and video call signaling all go through here.' },
          { id: 'ai', label: 'AI service', sub: 'SSE stream', x: 560, y: 170, w: 150, kind: 'server', info: 'What it is: the creator\'s AI assistant. The question comes in through a POST, and the answer goes out token by token over text/event-stream.' },
          { id: 'score', label: 'Score service', sub: 'origin', x: 90, y: 300, w: 140, kind: 'server', info: 'What it is: the server with the real score. Thanks to the CDN, it gets only a few hundred requests/sec despite lakhs of fans.' },
          { id: 'chat', label: 'Chat service', sub: 'saves messages', x: 330, y: 300, w: 150, kind: 'server', info: 'What it is: the chat backend. It saves the message in the DB, then publishes it on Redis so the right gateway can push it.' },
          { id: 'pay', label: 'Payments', sub: 'webhook endpoint', x: 560, y: 300, w: 150, kind: 'server', info: 'What it is: the /webhooks/payments endpoint of the payments service. Verify the signature, dedupe by event ID, answer 2xx right away, heavy work goes to a queue.' },
          { id: 'scorer', label: 'Scorer app', sub: 'stadium', x: 90, y: 430, w: 140, kind: 'client', info: 'What it is: the scorer\'s app in the stadium. After every ball it sends an update to the score service.' },
          { id: 'redis', label: 'Redis', sub: 'registry + pub/sub', x: 330, y: 430, w: 170, kind: 'data', info: 'What it is: it remembers which user is on which gateway (the registry), and uses pub/sub to get each message to that gateway.' },
          { id: 'rzp', label: 'Razorpay', sub: 'payment gateway', x: 560, y: 430, w: 150, kind: 'net', info: 'What it is: an outside payment company. As soon as a payment happens, it sends a signed POST to our webhook URL, and retries if that fails.' },
        ],
        edges: [
          { a: 'users', b: 'cdn', n: 1, label: 'poll 2 s' },
          { a: 'users', b: 'gw', both: true, label: 'WebSocket' },
          { a: 'ai', b: 'users', kind: 'res', label: 'SSE' },
          { a: 'users', b: 'brand', both: true, dashed: true, label: 'WebRTC' },
          { a: 'brand', b: 'gw', dashed: true },
          { a: 'cdn', b: 'score', label: '1/s' },
          { a: 'scorer', b: 'score' },
          { a: 'gw', b: 'chat', both: true },
          { a: 'chat', b: 'redis', kind: 'evt', label: 'publish' },
          { a: 'redis', b: 'gw', kind: 'evt', via: [[455, 430], [455, 170]] },
          { a: 'rzp', b: 'pay', kind: 'evt', label: 'webhook' },
        ],
        paths: [
          { name: 'Live score', text: 'The scorer sends an update; fans poll every 2 s; the CDN edge answers, and the origin gets only ~1 request/sec per edge.', go: ['scorer>score', 'users>cdn>score'] },
          { name: 'Chat message', text: 'Over WebSocket to a gateway; the chat service saves the message and publishes it on Redis; the right gateway pushes it.', go: ['users>gw>chat>redis>gw', 'res:gw>users'] },
          { name: 'AI answer (SSE)', text: 'The answer arrives token by token on one open HTTP response.', go: ['res:ai>users'] },
          { name: 'Payment + call', text: 'Razorpay reports through a webhook. Video call media goes straight between the peers, with signaling through the gateway.', go: ['rzp>pay', 'users>brand', 'brand>gw'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>Four questions: <strong>to whom</strong> (a user, another server, a call)? <strong>Direction</strong>? <strong>How often</strong>? <strong>The same for everyone or different</strong>?</li>
        <li>Server → user only = <strong>SSE</strong>. Both ways, frequent = <strong>WebSocket</strong>. Server → server = <strong>webhook</strong>. Audio/video call = <strong>WebRTC</strong>.</li>
        <li>Few updates, or the same data for everyone = <strong>short polling</strong>, and behind a CDN when the data is the same.</li>
        <li>Persistent connections get cut = a <strong>long polling</strong> fallback.</li>
        <li>"Real-time = WebSocket" is wrong: WebSocket is stateful (gateways, registry, heartbeats, reconnection storms).</li>
        <li>Webhooks: verify the signature, dedupe by event ID, answer 2xx fast.</li>
        <li>One app runs several methods together; decide separately for each direction.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'Polling: stateless, CDN-cacheable, the simplest and the sturdiest',
        'SSE: an instant one-way stream over plain HTTP; the browser reconnects by itself',
        'WebSockets: both ways within milliseconds; makes chat, games and collaboration possible',
        'Webhooks: partners get the news right away, without polling',
        'WebRTC: media goes straight between users, saving server bandwidth',
      ], costs: [
        'Polling: a delay as long as the interval; a load of wasted requests for personal data',
        'SSE/WebSocket: persistent connections = stateful servers, gateways, reconnection storms',
        'WebSockets: L4 load balancing, heartbeats, a registry, and more failure modes',
        'Webhooks: a public endpoint, signatures, duplicates, out-of-order events',
        'WebRTC: signaling + STUN/TURN infrastructure, a bandwidth bill for the TURN relay',
      ]},
      { type: 'think', questions: [
        { q: 'A "how many people are watching this live stream right now: 12,345" counter on xyz.com. Updated every 5 seconds. Which method?', a: 'One-way, the same number for everyone, a 5-second delay is fine. Short polling behind a CDN (TTL ~5 s). If the page already has an SSE/WebSocket connection open (say, for live chat), send this number on it too; do not open a new connection just for this.' },
        { q: 'Your SSE stream gets cut every 30 seconds on a company\'s office network. Why could that be, and what will you do?', a: 'A proxy in the middle is cutting idle connections. Send an SSE comment line (keep-alive) every ~15 seconds, and send event IDs so the browser can resume from the same point with Last-Event-ID when it reconnects. If it still fails, use a long polling fallback for that network.' },
        { q: 'A driver app like Uber\'s: the driver sends their location every 4 seconds, and the server sends them new ride requests. What do you pick?', a: 'Both ways, frequent, low latency: WebSockets. Sending the location and receiving ride offers on one persistent connection. The roadmap\'s table also lists the Uber driver app as an example of WebSockets.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'An AI chatbot\'s answer must appear word by word. The simplest correct method?', options: ['WebSockets', 'SSE', 'Webhooks'], answer: 1, explain: 'A one-way stream server → user. SSE runs over plain HTTP and the browser reconnects by itself. WebSocket would work, but it is more than needed.' },
        { q: 'The same live score to 1 crore users every 2 seconds. The cheapest sturdy design?', options: ['1 crore WebSockets', 'Short polling behind a CDN', 'A webhook for every user'], answer: 1, explain: 'Same data = CDN cache. The origin gets one request per second from each edge; no hassle of lakhs of persistent connections.' },
        { q: 'A payment gateway must tell your server that a payment went through. What?', options: ['Webhook', 'SSE', 'WebRTC'], answer: 0, explain: 'A server-to-server notification = webhook. Verify the signature, dedupe by event ID, answer 2xx fast.' },
        { q: 'A corporate network cuts persistent connections, but chat is needed. The fallback?', options: ['Long polling', 'WebRTC', 'Nothing can be done'], answer: 0, explain: 'Long polling is normal request-response, so proxies cut it less. Libraries like Socket.IO fall back to it.' },
      ]},
      { type: 'sources', note: 'Protocol behaviour from the official specs; the decision table from roadmap phase 5. ~100k connections per gateway is a rough rule of thumb, not a benchmark.', items: [
        { title: 'HTML Living Standard: Server-sent events', publisher: 'WHATWG', official: true, url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html', used: 'text/event-stream, automatic reconnect, Last-Event-ID, keep-alive comment lines.' },
        { title: 'RFC 6455: The WebSocket Protocol', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc6455', used: 'A persistent two-way connection over an HTTP upgrade.' },
        { title: 'Introduction to WebRTC protocols (ICE, STUN, TURN)', publisher: 'MDN Web Docs', official: true, url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols', used: 'STUN tells you your public address; TURN relays when there is no direct path.' },
        { title: 'Razorpay Webhooks', publisher: 'Razorpay documentation', official: true, url: 'https://razorpay.com/docs/webhooks/', used: 'Signed webhook POSTs, signature validation, retries and duplicate events.' },
        { title: 'Socket.IO: How it works', publisher: 'Socket.IO documentation', official: true, url: 'https://socket.io/docs/v4/how-it-works/', used: 'HTTP long-polling transport as a fallback alongside WebSocket.' },
      ]},
    ],
  });
})();
