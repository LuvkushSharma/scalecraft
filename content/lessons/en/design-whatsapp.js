Lesson.register({
  id: 'design-whatsapp',
  title: 'WhatsApp / chat',
  minutes: 45,
  summary: `Riya's "hi" should reach Aman's phone in less than a second. It does not matter which of a thousand servers Aman is connected to, or if his phone is switched off. We will build a chat app from zero: an always-open connection, a list of "who is connected where", a safe store for messages, ticks (sent / delivered / read), group messages, offline users, photos and end-to-end encryption. Each part appears only when a problem makes it necessary.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You type "hi" on your phone, and "hi" appears on another phone right away. WhatsApp's servers sit in the middle. The hard part: crores of people are online at the same time, they are connected to thousands of different servers, some phones are switched off, and the network breaks again and again. In this lesson we build a "digital postman". It knows which server each person is connected to. It first keeps every message safe, then delivers it, and shows ticks so you know how far the message has gone. And it does all this without reading the message, because the message is locked.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: Riya sent "hi". Aman's phone is online, but it is connected to a different server. How will the message get there? And what if Aman's phone is switched off? Then compare with this lesson.` },
    { type: 'p', html: `This lesson continues from the "gateways and registry" part of the <a href="#/realtime">Polling, SSE, WebSockets</a> lesson. There we saw how a message is routed from one gateway to another. Now we build the whole product: storage, ordering, ticks, groups, media and encryption. Wherever possible, we will look at what WhatsApp, Discord and Slack really did (from their engineering posts and WhatsApp's security whitepaper).` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• 1:1 chat: send a text message, it arrives at once<br>• Group chat (from a hundred to a thousand members)<br>• Ticks: sent ✓, delivered ✓✓, read (blue) ✓✓<br>• An offline user gets the message later, plus a notification on the phone<br>• Photos, videos, voice notes (media)<br>• Online / last seen (nice to have)<br><br><strong>Out of scope:</strong> voice and video calls (that is a <a href="#/realtime">WebRTC</a> topic), payments, stories` },
      right: { title: 'Non-functional', html: `• Low latency: under 1 second for an online user<br>• No message is ever lost (durability)<br>• The order inside one chat stays correct<br>• No duplicates (even after a retry)<br>• Very high availability: when a chat app is down, people panic<br>• Privacy: end-to-end encryption, the server cannot read messages` },
    },
    { type: 'callout', tone: 'term', title: 'New word: end-to-end encryption (E2EE)', html: `<strong>What it is:</strong> the message is locked (encrypted) on the sender's phone, and it is unlocked (decrypted) only on the receiver's phone. A locked message is called <em>ciphertext</em>: without the key it is just random-looking characters.<br><strong>Why we need it:</strong> privacy. All the servers in the middle, even WhatsApp's own, only see a locked box, not the text inside.<br><strong>Without it:</strong> if a server is hacked, or someone inside does something wrong, everyone's chats can be read.<br><strong>Effect on the design:</strong> the server cannot read the message to do anything with it (search, spam filter). It is only a <em>postman</em>. Details in Deep dive 5.` },

    { type: 'h2', text: 'Step 2: chat basics, from zero' },
    { type: 'p', html: `Before we draw any diagram, let us understand the parts one by one. Each part will come from a problem.` },
    { type: 'h3', text: '2a. How does a phone learn about a new message?' },
    { type: 'p', html: `On a normal website, the phone asks, the server answers, and that is the end of it (<a href="#/how-the-web-works">HTTP request</a>). But in chat, a message can arrive <strong>at any time</strong>. If Aman's phone asked "any new message?" every second, the answer would be "no" 99% of the time. Crores of phones × every second = a useless storm on the servers, and a dead battery. So a chat app keeps an <strong>always-open connection</strong>, so the server itself can say "here, a new message".` },
    { type: 'callout', tone: 'term', title: 'New word: WebSocket', html: `<strong>What it is:</strong> a long-lived line between the phone and the server that is open in both directions. You connect once, then both sides can send small messages (frames) at any time. Like a phone call that never hangs up.<br><strong>Why we need it:</strong> when a message arrives, the server can "push" it to the phone at once, without the phone asking.<br><strong>Without it:</strong> the phone must keep asking again and again (polling). Either messages arrive late, or the servers and the battery carry a heavy load. Details in the <a href="#/realtime">Polling, SSE, WebSockets</a> lesson.` },
    { type: 'h3', text: '2b. Crores of connections: gateway servers' },
    { type: 'p', html: `Every online phone has one open WebSocket. 10 crore phones online = 10 crore open connections. No single server can hold that many. So we need many servers whose <strong>only job</strong> is to hold connections.` },
    { type: 'callout', tone: 'term', title: 'New word: connection gateway', html: `<strong>What it is:</strong> a server that holds the open WebSockets of lakhs of phones. It is the phone's "front door". It checks the login token, listens for heartbeats, and passes frames back and forth. It makes no decisions about messages.<br><strong>Why we need it:</strong> holding connections is a different kind of work (lots of memory, little CPU). Keeping it separate lets the other services change and scale easily.<br><strong>Without it:</strong> every service would have to handle connections itself. When one service restarted, lakhs of phones would lose their connection.<br><strong>Example:</strong> in 2012 WhatsApp showed more than 20 lakh connections on a single server.` },
    { type: 'callout', tone: 'term', title: 'New word: L4 load balancer', html: `<strong>What it is:</strong> a "traffic police officer" in front of the gateways. When a new phone wants to connect, it sends it to one of the gateways. "L4" means it only looks at the TCP connection (IP and port). It does not look inside messages. That is why it is very fast.<br><strong>Why we need it:</strong> the phone should not need to know which of 1,000 gateways is free.<br><strong>Without it:</strong> all phones would go to one gateway, or each phone would need its own list of gateways. Details in the <a href="#/load-balancer">Load balancer</a> lesson.` },
    { type: 'h3', text: '2c. A new problem: which gateway is Aman on?' },
    { type: 'p', html: `Riya is connected to Gateway 3. Aman is on Gateway 812. Riya's message arrived at Gateway 3. How does Gateway 3 know that Aman is on 812? Asking all 1,000 gateways ("do you have Aman?") is far too expensive. We need a <strong>phone book</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: session registry', html: `<strong>What it is:</strong> a fast in-memory table (like Redis): "Aman → Gateway 812", "Riya → Gateway 3". When a phone connects, the gateway writes here. When it disconnects, the gateway removes the entry.<br><strong>Why we need it:</strong> before routing a message, one lookup tells us where the receiver is, or that the receiver is not online at all.<br><strong>Without it:</strong> for every message we would have to ask all gateways (broadcast), or the message would go to the wrong place.` },
    { type: 'callout', tone: 'term', title: 'New words: heartbeat and TTL', html: `<strong>Heartbeat:</strong> <strong>What it is:</strong> every ~30 seconds the phone sends a tiny "I am alive" frame. <strong>Why we need it:</strong> a mobile connection can die silently (in a lift, in a tunnel). Without a heartbeat, the gateway would never notice.<br><strong>TTL (time to live):</strong> <strong>What it is:</strong> an expiry time on a registry entry, for example 60 seconds. Every heartbeat pushes the expiry forward. <strong>Why we need it:</strong> if the gateway itself crashes, it cannot remove its entries. The TTL deletes them automatically.<br><strong>Without it:</strong> old (stale) entries would stay in the registry: "Aman → Gateway 812", even though 812 died long ago.` },
    { type: 'p', html: `Try it yourself. There are 3 gateways and 6 people. Connect or disconnect someone, send a message from Riya, crash a gateway, and watch the registry. Notice one thing: after a crash, a <strong>stale</strong> entry stays in the registry until its TTL runs out (here, press "30 s later" twice).` },
    { type: 'custom', render(el) {
      const N = ['Riya', 'Aman', 'Zoya', 'Kabir', 'Meera', 'Dev'];
      let t, U, reg, alive, log, seed, broken;
      const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const load = g => N.filter(n => U[n] === g).length;
      const connect = n => {
        const ok = [0, 1, 2].filter(g => alive[g]);
        if (!ok.length) { log.push(`${n}: no gateway is alive, could not connect.`); return; }
        const g = ok.reduce((b, x) => load(x) < load(b) ? x : b, ok[0]);
        U[n] = g; reg[n] = { g, exp: t + 60 }; broken.delete(n);
        log.push(`${n} connects: the L4 LB picked the least busy one, G${g + 1}. Registry: ${n} → G${g + 1} (TTL 60 s).`);
      };
      const reset = () => {
        t = 0; seed = 12345; U = {}; reg = {}; alive = [true, true, true]; log = []; broken = new Set();
        N.forEach(n => U[n] = null);
        ['Riya', 'Aman', 'Zoya', 'Kabir'].forEach(connect);
        log = ['Start: Riya, Aman, Zoya, Kabir are online. Meera and Dev are offline.'];
      };
      el.innerHTML = `<div class="wgr-gws" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px">
          <div><div style="font-weight:600;margin-bottom:4px">People and their phones</div><div class="wgr-users" style="display:grid;gap:4px"></div></div>
          <div><div style="font-weight:600;margin-bottom:4px">Session registry <span class="wgr-t" style="color:var(--ink-3);font-weight:400"></span></div><div class="wgr-reg" style="font-family:var(--f-mono);font-size:13px;display:grid;gap:3px"></div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">
          <label style="display:flex;gap:6px;align-items:center">Riya → <select class="wgr-to"></select></label>
          <button type="button" class="btn small primary wgr-send">Send message</button>
          <button type="button" class="btn small wgr-tick">30 s later (heartbeat)</button>
          <button type="button" class="btn small wgr-rec">Reconnect broken phones</button>
          <button type="button" class="btn small ghost wgr-reset">Reset</button>
        </div>
        <div class="calc-note wgr-log" style="max-height:150px;overflow:auto"></div>`;
      const q = s => el.querySelector(s);
      q('.wgr-to').innerHTML = N.slice(1).map(n => `<option>${n}</option>`).join('');
      const draw = () => {
        q('.wgr-gws').innerHTML = [0, 1, 2].map(g => `<div style="border:1px solid ${alive[g] ? 'var(--line)' : 'var(--red)'};border-radius:var(--r-sm);padding:8px;background:var(--surface-2)">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><strong>Gateway G${g + 1}</strong><span style="color:${alive[g] ? 'var(--green)' : 'var(--red)'};font-size:13px">${alive[g] ? 'alive' : 'DOWN'}</span></div>
          <div style="min-height:24px;margin:6px 0;font-size:13px">${N.filter(n => U[n] === g).join(', ') || '<span style="color:var(--ink-3)">nobody</span>'}</div>
          <button type="button" class="btn small ghost" data-g="${g}">${alive[g] ? 'Crash it' : 'Start again'}</button></div>`).join('');
        q('.wgr-users').innerHTML = N.map(n => {
          const st = U[n] != null ? `online (G${U[n] + 1})` : broken.has(n) ? 'connection broken' : 'offline';
          return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><strong style="min-width:52px">${n}</strong><span style="color:var(--ink-2);font-size:13px;min-width:110px">${st}</span>
            <button type="button" class="btn small ghost" data-u="${n}">${U[n] != null ? 'Close app' : 'Open app'}</button></div>`;
        }).join('');
        q('.wgr-t').textContent = `(time: ${t} s)`;
        const rows = Object.entries(reg);
        q('.wgr-reg').innerHTML = rows.length ? rows.map(([n, r]) => {
          const stale = !alive[r.g];
          return `<div style="color:${stale ? 'var(--red)' : 'var(--ink)'}">${n} → G${r.g + 1}  (${r.exp - t} s left)${stale ? '  STALE' : ''}</div>`;
        }).join('') : '<div style="color:var(--ink-3)">empty</div>';
        q('.wgr-log').innerHTML = log.slice(-6).map(x => '• ' + x).join('<br>');
        el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
          const g = +b.dataset.g;
          if (alive[g]) {
            alive[g] = false;
            const lost = N.filter(n => U[n] === g); lost.forEach(n => { U[n] = null; broken.add(n); });
            log.push(`G${g + 1} crashed! Connection lost for: ${lost.join(', ') || 'nobody'}. Their registry entries are still there (the gateway could not delete them): STALE.`);
          } else { alive[g] = true; log.push(`G${g + 1} is running again (empty). New connections can come here.`); }
          draw();
        });
        el.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
          const n = b.dataset.u;
          if (U[n] != null) { U[n] = null; delete reg[n]; log.push(`${n} closed the app: the gateway saw a clean disconnect and removed the registry entry.`); }
          else connect(n);
          draw();
        });
      };
      q('.wgr-send').onclick = () => {
        const to = q('.wgr-to').value, r = reg[to];
        if (U.Riya == null) log.push('Riya herself is not online: the message waits on her phone (clock icon). Open Riya\'s app first.');
        else if (!r) log.push(`Riya → ${to}: ${to} is not in the registry = offline. The message is safe in the store (✓), and a push notification is sent.`);
        else if (!alive[r.g]) log.push(`Riya → ${to}: the registry says G${r.g + 1}, but G${r.g + 1} is DOWN. Sending fails. The message is safe in the store (✓); ${to} will reconnect and catch up.`);
        else log.push(`Riya → ${to}: G${U.Riya + 1} → chat service → registry: ${to} → G${r.g + 1} → ${to}'s phone. One lookup, instant delivery (✓✓).`);
        draw();
      };
      q('.wgr-tick').onclick = () => {
        t += 30;
        N.forEach(n => { if (U[n] != null) reg[n].exp = t + 60; });
        const gone = Object.keys(reg).filter(n => reg[n].exp <= t);
        gone.forEach(n => delete reg[n]);
        log.push(`+30 s: online phones sent a heartbeat, their TTL is back to 60 s.${gone.length ? ' TTL ran out, entries removed: ' + gone.join(', ') + '.' : ''}`);
        draw();
      };
      q('.wgr-rec').onclick = () => {
        const uniq = N.filter(n => broken.has(n));
        if (!uniq.length) { log.push('No broken connections.'); draw(); return; }
        uniq.forEach(n => { const d = (rnd() * 10).toFixed(1); log.push(`${n}'s app reconnects after a random wait (jitter) of ${d} s.`); connect(n); });
        draw();
      };
      q('.wgr-reset').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"There is an entry in the registry, so the user is online." Not always! If a gateway crashes, its entries stay <strong>stale</strong> until the TTL runs out. So the rule is: <strong>save the message in the store first</strong>, then try to deliver it. If delivery fails, nothing is lost; the user reconnects and fetches whatever was missed.` },
    { type: 'h3', text: '2d. Keep the message somewhere safe first' },
    { type: 'p', html: `The gateway is only a front door. The real work on a message (giving it an ID, saving it, finding the right gateway) is done by a separate service. And the message is saved in a database, so it is not lost even if a server falls over.` },
    { type: 'callout', tone: 'term', title: 'New word: chat service', html: `<strong>What it is:</strong> the "brain" of the chat. It gives each message an ID, saves it in the store, finds the receiver's gateway in the registry, and sends it there.<br><strong>Why we need it:</strong> it is <em>stateless</em> (it keeps no connections or data of its own), so we can run 10 or 100 copies of it.<br><strong>Without it:</strong> this work would happen on the gateway; a gateway crash would lose both the connections and half-done work.` },
    { type: 'callout', tone: 'term', title: 'New word: message store', html: `<strong>What it is:</strong> the database where messages are written durably (on disk, in several copies).<br><strong>Why we need it:</strong> if the receiver is offline, or a gateway crashes, the message waits here.<br><strong>Without it:</strong> the message would live only in some server's memory; when the server fell over, the message would be gone. How to design it: Deep dive 1.` },
    { type: 'callout', tone: 'term', title: 'New words: ack and ticks', html: `<strong>Ack (acknowledgement):</strong> a short "got it" reply. <strong>Ticks:</strong> WhatsApp's ✓ (safe on the server), grey ✓✓ (reached Aman's phone), blue ✓✓ (Aman has read it).<br><strong>Why we need them:</strong> Riya learns how far her message has gone, and the phone learns whether it must send again.<br><strong>Without them:</strong> the phone would have to guess: either it keeps resending (duplicates), or it stays quiet (the message may be lost). The full story of ticks is in Deep dive 2.` },
    { type: 'h2', text: 'Step 3: napkin maths' },
    { type: 'p', html: `The roadmap's worked example: 100M users online at peak, each with one WebSocket. If one gateway server handles ~100k connections, we need ~1,000 gateways. Now change the numbers yourself for a chat app on xyz.com (these are all assumed numbers, not any company's real numbers):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="wa-dau">Daily active users (millions)</label><input id="wa-dau" type="number" value="500" min="1" step="1"></div>
          <div><label for="wa-on">Online at the same time at peak (millions)</label><input id="wa-on" type="number" value="100" min="1" step="1"></div>
          <div><label for="wa-mpd">Messages per user per day</label><input id="wa-mpd" type="number" value="40" min="1" step="1"></div>
          <div><label for="wa-cpg">Connections per gateway (thousands)</label><input id="wa-cpg" type="number" value="100" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Gateway servers</span><strong class="o-gw"></strong></div>
          <div class="stat"><span>Messages/sec (avg)</span><strong class="o-avg"></strong></div>
          <div class="stat"><span>Messages/sec (peak ×3)</span><strong class="o-pk"></strong></div>
          <div class="stat"><span>Registry memory</span><strong class="o-reg"></strong></div>
          <div class="stat"><span>Message data per day</span><strong class="o-st"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const v = id => Math.max(1, Number(el.querySelector('#' + id).value) || 1);
      const f = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : Math.round(n).toString();
      const upd = () => {
        const dau = v('wa-dau') * 1e6, on = v('wa-on') * 1e6, mpd = v('wa-mpd'), cpg = v('wa-cpg') * 1e3;
        const gw = Math.ceil(on / cpg), perDay = dau * mpd, avg = perDay / 1e5;
        const regGB = on * 100 / 1e9, tb = perDay * 200 / 1e12;
        el.querySelector('.o-gw').textContent = gw.toLocaleString('en-IN');
        el.querySelector('.o-avg').textContent = f(avg) + '/s';
        el.querySelector('.o-pk').textContent = f(avg * 3) + '/s';
        el.querySelector('.o-reg').textContent = regGB.toFixed(1) + ' GB';
        el.querySelector('.o-st').textContent = tb.toFixed(1) + ' TB';
        el.querySelector('.o-note').textContent = `${f(perDay)} messages in one day. Assumptions: one day ≈ 10^5 seconds, a registry entry ≈ 100 bytes (user → gateway + TTL), one message ≈ 200 bytes (encrypted text + IDs). Conclusion: we need a big fleet of gateways, the registry fits in memory (Redis), and there are so many message writes that a single SQL database will not cope.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Compare with real numbers: in 2014 (at the time Facebook bought it), WhatsApp handled ~50 billion messages a day. In its own blog post from January 2012, it showed <strong>more than 20 lakh TCP connections</strong> on a single FreeBSD server. These numbers are old (10+ years), but the lesson is the same today: holding connections is an engineering problem of its own.` },

    { type: 'h2', text: 'Step 4: API and data model' },
    { type: 'p', html: `A chat has two roads. Text and ticks travel on a <strong>long-lived open WebSocket</strong> (in both directions). Each small message is called a <em>frame</em>; they are shown below as JSON. Media (photos, videos) goes through a normal HTTPS upload, because sending big files on the chat connection would block it (Deep dive 4). The <code>body</code> holds no text, only <em>ciphertext</em> (the locked message).` },
    { type: 'code', text: `
WebSocket frames (client <-> gateway):
  → { "type": "send",    "client_msg_id": "c-77", "conv": "riya:aman", "body": <ciphertext> }
  ← { "type": "ack",     "client_msg_id": "c-77", "msg_id": 7291840011, "ts": ... }   // ✓ sent
  ← { "type": "message", "msg_id": 7291840011, "conv": "riya:aman", "from": "riya", "body": <ciphertext> }
  → { "type": "receipt", "msg_id": 7291840011, "status": "delivered" }            // ✓✓
  → { "type": "receipt", "msg_id": 7291840011, "status": "read" }                 // blue ✓✓
  → { "type": "resume",  "last_msg_id": 7291840000 }                              // on reconnect

HTTPS (media):
  POST /media/upload-url          →  { "upload_url": "https://blob.../signed...", "media_id": "m-55" }
  PUT  <upload_url>  (encrypted bytes)` },
    { type: 'p', html: `Now, what data do we keep? The new names in the "Where" column (wide-column store, Redis) are explained one by one in the sections below. For now, just notice that each thing goes into a different kind of storage, because each has a different job.` },
    { type: 'table', head: ['Entity', 'Fields', 'Where'], rows: [
      ['User / Device', 'user_id, device_id, public keys, push token', 'Sharded DB (by user_id)'],
      ['Conversation', 'conv_id, type (1:1 / group), members', 'Sharded DB; group members in a cache'],
      ['Message', 'conv_id, msg_id (time-ordered), sender, ciphertext, media pointer', 'Wide-column store, partition = conversation'],
      ['Receipt', 'msg_id, user/device, status, ts', 'With the message, or a separate small table'],
      ['Session', 'user/device → gateway', 'Registry (Redis), with a TTL'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: client_msg_id', html: `<strong>What it is:</strong> a random ID that the phone itself gives to each message before sending it to the server (like "c-77").<br><strong>Why we need it:</strong> if the network gives no answer, the phone sends the same message again (a retry). The server sees "c-77 has already arrived" and does not create a new message.<br><strong>Without it:</strong> Aman would see one more "hi" for every retry. It is a form of <a href="#/pagination-idempotency">idempotency key</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: msg_id (time-ordered ID)', html: `<strong>What it is:</strong> an ID given by the server (like 7291840011). The first part of it hides the time, so a bigger ID = a later message.<br><strong>Why we need it:</strong> to show messages in the right order, and to make questions like "give me the ones after 7291840000" easy.<br><strong>Without it:</strong> we would have to sort by a separate timestamp, and a phone with a wrong clock would mess up the order. Details in the <a href="#/unique-ids">Unique IDs</a> (Snowflake) lesson.` },

    { type: 'h2', text: 'Step 5: high-level design, 1:1 message' },
    { type: 'p', html: `Now let us join all the parts. Riya is connected to Gateway A, Aman to Gateway B. The L4 load balancer sits in front of the gateways; in the diagram, imagine it inside the gateway box. Click any box to read what it does, then run each scenario. The "Ack lost" and "Gateway B crash" scenarios matter most: in the real world, networks and servers fail again and again.` },
    { type: 'flow', title: 'Riya → Aman (both online)', height: 330,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 70, w: 120, kind: 'client', info: 'What it is: Riya\'s phone, running the chat app. While the app is open, it keeps one WebSocket open. Before sending a message, it locks (encrypts) it and gives it a client_msg_id, so a retry does not create a duplicate.' },
        { id: 'ga', label: 'Gateway A', sub: 'WebSockets', x: 255, y: 70, w: 140, kind: 'server', meter: true, load: 50, info: 'What it is: a connection gateway, the front door for phones. It holds lakhs of open WebSockets, checks the login token and the heartbeat, and passes frames on. It makes no decisions about messages. The L4 load balancer is in front of it (imagine it inside this box). In 2012 WhatsApp showed 20 lakh+ connections on one server (Erlang + FreeBSD).' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 460, y: 55, w: 130, kind: 'cache', info: 'What it is: the session registry, a fast in-memory phone book (like Redis): which user or device is on which gateway right now. Why: one lookup is enough to route a message. Every entry has a TTL that heartbeats extend; if a gateway dies, its entries expire by themselves.' },
        { id: 'chat', label: 'Chat service', sub: 'store + route', x: 460, y: 170, w: 150, kind: 'server', info: 'What it is: the chat service, the brain of the chat. It gives the message a time-ordered msg_id, saves it in the store first (so nothing is lost), then finds the receiver\'s gateway in the registry and sends it there. It is stateless, so we can run many copies and scale easily.' },
        { id: 'store', label: 'Message store', sub: 'by conversation', x: 640, y: 170, w: 130, kind: 'data', info: 'What it is: the message store, the database where messages are written safely to disk, in several copies. WhatsApp-style design: keep each message (encrypted) only until it is delivered. Discord/Slack-style design: keep the whole history forever, split by conversation. Details in Deep dive 1.' },
        { id: 'gb', label: 'Gateway B', sub: 'WebSockets', x: 255, y: 270, w: 140, kind: 'server', meter: true, load: 50, info: 'What it is: another connection gateway, the one Aman is connected to. Why a different one: with 1,000 gateways, Riya and Aman are usually on different ones. If it crashes, all its users reconnect at the same moment, so apps wait a small random time (jitter) before coming back.' },
        { id: 'a', label: 'Aman (app)', x: 75, y: 270, w: 120, kind: 'client', info: 'What it is: Aman\'s phone (the receiver). As soon as a message arrives, it quietly sends a "delivered" receipt, and when Aman opens the chat, a "read" receipt. These change Riya\'s ticks.' },
      ],
      edges: [{ a: 'r', b: 'ga' }, { a: 'ga', b: 'chat' }, { a: 'ga', b: 'reg' }, { a: 'chat', b: 'reg' }, { a: 'chat', b: 'store' }, { a: 'chat', b: 'gb' }, { a: 'gb', b: 'reg' }, { a: 'gb', b: 'a' }, { a: 'a', b: 'ga', id: 'aga', hidden: true }],
      scenarios: [
        { name: 'Connect', steps: [
          { title: 'Riya connects', go: ['r>ga', 'ga>reg'], text: 'The WebSocket opens. The gateway checks the token and writes in the registry: riya → gwA (TTL 60 s).', after: { reg: { sub: 'riya→A' } }, msg: 'SET conn:riya gwA EX 60' },
          { title: 'Aman connects', go: ['a>gb', 'gb>reg'], text: 'Aman arrives on Gateway B. Registry: aman → gwB. Every heartbeat (~30 s) refreshes the TTL.', after: { reg: { sub: 'riya→A, aman→B' } } },
        ]},
        { name: 'Happy path', steps: [
          { title: 'Riya sends', go: 'r>ga>chat', text: 'Encrypted body + client_msg_id. The gateway only passes it on.', msg: '{ "type":"send", "client_msg_id":"c-77", "conv":"riya:aman", "body":"<ciphertext>" }' },
          { title: 'Save first, then anything else', go: ['chat>store', 'res:store>chat'], text: 'The chat service gives a time-ordered msg_id and writes it to the store. Now even if a server crashes, the message is not lost.', msg: 'msg_id = 7291840011' },
          { title: 'Riya gets ✓ (sent)', go: 'res:chat>ga>r', text: 'One grey tick means: it has arrived safely at the server. It has not reached Aman yet.', after: { r: { sub: '✓ sent' } } },
          { title: 'Where is Aman?', go: ['chat>reg', 'res:reg>chat'], text: 'Registry: aman → gwB.', after: { reg: { state: 'hit' } } },
          { title: 'Push via Gateway B', go: 'chat>gb>a', text: 'Gateway B writes the frame onto Aman\'s open WebSocket.', after: { a: { state: 'ok', sub: 'got 7291840011' }, reg: { state: '' } } },
          { title: 'Delivered receipt: ✓✓', go: 'evt:a>gb>chat>ga>r', text: 'Aman\'s phone sends a "delivered" receipt. It is also a small message, and it travels the opposite way.', after: { r: { sub: '✓✓ delivered' } }, msg: '{ "type":"receipt", "msg_id":7291840011, "status":"delivered" }' },
        ]},
        { name: 'Ack lost (retry)', intro: 'The mobile network breaks in the middle. How do we stop duplicates?', steps: [
          { title: 'The message reached the server', go: 'r>ga>chat>store', text: 'It is saved, msg_id 7291840011.' },
          { title: 'The ack is lost on the way', go: 'lost:chat>ga>r', text: 'Riya\'s phone went into a tunnel. It did not get the ✓ (ack), so it thinks the message may never have been sent. The screen shows a clock icon.', set: { r: { state: 'warn', sub: 'clock (pending)' } } },
          { title: 'Retry, same client_msg_id', go: 'r>ga>chat', text: 'The phone sends the same message again, with the <strong>same c-77</strong>. The chat service sees that c-77 is already saved. It does not create a new message; it returns the old msg_id.', msg: 'dedupe: (riya, c-77) → already 7291840011' },
          { title: 'Now ✓, and Aman gets only one copy', go: 'res:chat>ga>r', text: 'Without client_msg_id, Aman would see two "hi" messages. This is called <strong>at-least-once delivery + an idempotent receiver</strong>. At-least-once: keep sending until you get an ack (it may arrive more than once). Idempotent: if the same thing arrives twice, the result is the same as once.', after: { r: { state: 'ok', sub: '✓ sent' } } },
        ]},
        { name: 'Gateway B crash', intro: 'Aman\'s gateway suddenly falls over, at the same moment Riya sends a message.', steps: [
          { title: 'Crash', set: { gb: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'lost:gb>a', text: 'All of Gateway B\'s connections are gone in one go.' },
          { title: 'Message arrives, delivery fails', go: ['r>ga>chat>store', 'chat>reg', 'res:reg>chat', 'lost:chat>gb'], text: 'The registry still has the old entry aman → gwB (its TTL has not run out). Sending fails, but the message is safe in the store. Riya sees only ✓, not ✓✓.', after: { reg: { state: 'warn', sub: 'aman→B (stale)' }, r: { sub: '✓ sent' } } },
          { title: 'Aman reconnects (with jitter)', show: ['aga'], go: ['a>ga', 'ga>reg'], text: 'Aman\'s app noticed from the failed heartbeat that the connection is dead. After a small random wait (so 1 lakh apps do not come back at the same moment), it connects to Gateway A. Registry: aman → gwA.', after: { reg: { state: '', sub: 'aman→A' }, ga: { load: 75 } } },
          { title: 'Resume: fetch what was missed', go: ['a>ga>chat', 'chat>store', 'res:store>chat', 'res:chat>ga>a'], text: 'The app says "I have everything up to 7291840000". The chat service sends the newer messages. Nothing was lost, just a delay of a second or two.', after: { a: { state: 'ok', sub: 'resumed' } }, msg: '{ "type":"resume", "last_msg_id":7291840000 }' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Just save the message on the gateway, it will be fast." No! If the gateway dies, the messages in its memory die too. The rule: <strong>write to the durable store first, then give ✓, then deliver</strong>. The gateway is only a pipe; when it falls over, only connections should be lost, never data.` },

    { type: 'h2', text: 'Step 6: what if Aman is offline?' },
    { type: 'p', html: `The phone is switched off, or the app is in the background and the OS has cut the WebSocket (iPhone and Android do this to save battery). Aman has no entry in the registry. Now there are two jobs: <strong>keep the message safe</strong>, and <strong>wake up</strong> Aman's phone.` },
    { type: 'callout', tone: 'term', title: 'New word: push notification (APNs / FCM)', html: `<strong>What it is:</strong> a short message that appears at the top of the phone screen, even when the app is closed. Every phone OS has its own always-open channel: <strong>APNs</strong> (Apple Push Notification service) on iPhone, <strong>FCM</strong> (Firebase Cloud Messaging) on Android. Our server tells Apple or Google: "give this notification to the phone with this <em>device token</em> (the phone's address)".<br><strong>Why we need it:</strong> our server cannot talk to a closed app by itself. This is the only way to wake the phone.<br><strong>Without it:</strong> Aman would not know anything until he opened the app himself.<br><strong>Careful:</strong> this is not our system, so its delay and reliability are not in our hands. Details in the <a href="#/design-notifications">Notification system</a> lesson.` },
    { type: 'callout', tone: 'term', title: 'New word: offline inbox (pending store)', html: `<strong>What it is:</strong> a "waiting box" on the server for every user or device. It holds the messages that have not reached that phone yet.<br><strong>Why we need it:</strong> Aman is offline, but Riya's message must not be lost. Whenever Aman comes back, the app takes everything from this box (this is called <em>sync</em>).<br><strong>Without it:</strong> all messages for an offline user would vanish, or Riya would have to send them again and again.<br><strong>Example:</strong> WhatsApp's privacy policy says an undelivered message is kept in encrypted form for up to ~30 days, and deleted from the server as soon as it is delivered.` },
    { type: 'flow', title: 'Offline delivery', height: 330,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 60, w: 120, kind: 'client', info: 'What it is: Riya\'s phone (the sender). She gets ✓ at once, because the message is safe on the server. She will get ✓✓ when Aman\'s phone takes the message.' },
        { id: 'gw', label: 'Gateways', sub: 'WebSockets', x: 255, y: 160, w: 130, kind: 'server', info: 'What it is: the connection gateways (front doors for phones). Riya and Aman may be on different gateways; to keep the diagram simple, they are one box. The chat service does the registry lookup (we saw it in the previous diagram).' },
        { id: 'chat', label: 'Chat service', sub: 'route', x: 455, y: 160, w: 140, kind: 'server', info: 'What it is: the chat service, the brain of the chat. Aman is not in the registry (so he is offline), so it puts the message in his offline inbox and tells the push service "wake Aman up".' },
        { id: 'store', label: 'Pending store', sub: 'per recipient', x: 640, y: 60, w: 130, kind: 'data', info: 'What it is: the offline inbox, a box of undelivered messages for each receiving device. Why: an offline user\'s message must not be lost. According to WhatsApp\'s privacy policy, undelivered messages are kept encrypted for up to ~30 days and deleted from the server as soon as they are delivered.' },
        { id: 'push', label: 'Push service', sub: 'device tokens', x: 640, y: 270, w: 130, kind: 'queue', info: 'What it is: the push service. It keeps every phone\'s device token (the address given by Apple or Google) and sends requests to APNs/FCM. It sits behind a queue, so a slow APNs does not block the chat service. When many messages arrive together, it can turn them into one notification (collapse).' },
        { id: 'apns', label: 'APNs / FCM', sub: 'Apple / Google', x: 455, y: 280, w: 140, kind: 'net', info: 'What it is: the push services of Apple (APNs) and Google (FCM), which carry notifications to the phone. They are not under our control: sometimes late, sometimes dropped. So a notification is only a "wake up" signal; the real delivery happens through sync when the app opens.' },
        { id: 'a', label: 'Aman (phone)', sub: 'offline', x: 75, y: 270, w: 120, kind: 'client', info: 'What it is: Aman\'s phone, with the app closed (no WebSocket). When a notification arrives, or when Aman opens the app himself, the app connects and takes the pending messages from the offline inbox (sync).' },
      ],
      edges: [{ a: 'r', b: 'gw' }, { a: 'a', b: 'gw' }, { a: 'gw', b: 'chat' }, { a: 'chat', b: 'store' }, { a: 'chat', b: 'push' }, { a: 'push', b: 'apns' }, { a: 'apns', b: 'a' }],
      scenarios: [
        { name: 'Offline → push → sync', steps: [
          { title: 'Riya sends', go: ['r>gw>chat>store', 'res:chat>gw>r'], text: 'The message is saved in the pending store, and Riya gets ✓. Aman was not found in the registry.', set: { a: { state: 'dim' } }, after: { store: { sub: 'aman: 1 pending' }, r: { sub: '✓ sent' } } },
          { title: 'Tell the push service', go: 'evt:chat>push>apns', text: 'The chat service drops an event; the push service finds the device token and sends a request to APNs/FCM.', msg: 'push(token=..., "New message")' },
          { title: 'Notification on the phone', go: 'evt:apns>a', text: 'The phone wakes up. Because of E2EE, the server does not have the message text. The notification carries either just a "new message" signal, or an encrypted payload that the phone unlocks itself.', after: { a: { state: 'warn', sub: 'notification' } } },
          { title: 'App connects + pulls pending', go: ['a>gw>chat', 'chat>store', 'res:store>chat', 'res:chat>gw>a'], text: 'The app opens a WebSocket and takes the pending messages.', after: { a: { state: 'ok', sub: 'got 1 msg' } } },
          { title: '✓✓ and delete', go: ['evt:a>gw>chat', 'res:chat>gw>r', 'chat>store'], text: 'The delivered receipt reaches Riya (✓✓). In a store-and-forward design, the message is now removed from the server: the job is done, and it lives only on the two phones.', after: { r: { sub: '✓✓ delivered' }, store: { sub: 'aman: 0 pending' } } },
        ]},
        { name: 'Push lost', intro: 'APNs/FCM delivered the notification late, or dropped it.', steps: [
          { title: 'Message is safe', go: 'r>gw>chat>store', text: 'It is in the pending store.', set: { a: { state: 'dim' } } },
          { title: 'Notification dropped', go: ['evt:chat>push>apns', 'lost:apns>a'], text: 'The notification never arrived from Apple/Google. This is not in our hands.', after: { apns: { state: 'warn', sub: 'dropped' } } },
          { title: 'No problem: sync saves us', go: ['a>gw>chat', 'chat>store', 'res:store>chat', 'res:chat>gw>a'], text: 'Whenever Aman opens the app himself, the app connects and asks for pending messages. So the design rule is: <strong>push is only a hint; sync is what guarantees delivery</strong>.', after: { a: { state: 'ok', sub: 'synced' } } },
        ]},
        { name: 'Phone off for 40 days', steps: [
          { title: 'Messages are waiting', go: 'r>gw>chat>store', text: 'Aman lost his phone; it has been off for 40 days.', set: { a: { state: 'down', sub: 'off' } }, after: { store: { state: 'warn', sub: 'waiting...' } } },
          { title: 'Expiry', text: 'WhatsApp\'s privacy policy says an undelivered message is kept (encrypted) for up to ~30 days, then deleted. Every system needs such a limit, or storage would keep growing for switched-off phones. Riya keeps seeing only ✓.', focus: ['store'], after: { store: { state: 'dim', sub: 'expired' } } },
        ]},
      ],
    },
    { type: 'h3', text: 'Try it: Aman\'s offline inbox' },
    { type: 'p', html: `Keep Aman's app closed, send 3-4 messages from Riya, and see what piles up in the inbox and how the notifications "collapse" into one. Then turn on "Push dropped": no notification arrives, but everything comes as soon as the app opens. Finally, keep the app closed and press "10 days later" three times: at 30 days the message expires.` },
    { type: 'custom', render(el) {
      let on, day, inbox, sent, notif, drop, log, next;
      const reset = () => { on = false; day = 0; inbox = []; sent = []; notif = 0; drop = false; log = ['Aman\'s app is closed (offline).']; next = 1; };
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Messages Riya sent</strong><div class="wof-sent" style="font-size:14px;margin-top:6px;display:grid;gap:2px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><strong>Server: Aman's offline inbox</strong><div class="wof-inbox" style="font-family:var(--f-mono);font-size:13px;margin-top:6px;display:grid;gap:2px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Aman's phone</strong> <span class="wof-st"></span><div class="wof-ph" style="font-size:14px;margin-top:6px"></div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">
          <button type="button" class="btn small primary wof-send">Riya: send a message</button>
          <button type="button" class="btn small wof-tog"></button>
          <button type="button" class="btn small wof-day">10 days later</button>
          <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="wof-drop"> Push dropped (by Apple/Google)</label>
          <button type="button" class="btn small ghost wof-reset">Reset</button>
        </div>
        <div class="calc-note wof-log" style="max-height:140px;overflow:auto"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        q('.wof-sent').innerHTML = sent.length ? sent.map(m => `<div>"msg ${m.id}" <span style="color:${m.st === 2 ? 'var(--accent)' : 'var(--ink-3)'};font-family:var(--f-mono)">${m.st === 2 ? '✓✓' : '✓'}</span>${m.exp ? ' <span style="color:var(--red)">(expired, will never be delivered)</span>' : ''}</div>`).join('') : '<span style="color:var(--ink-3)">nothing yet</span>';
        q('.wof-inbox').innerHTML = inbox.length ? inbox.map(m => `<div>msg ${m.id}  (age ${day - m.day} days)</div>`).join('') : '<span style="color:var(--ink-3)">empty</span>';
        q('.wof-st').innerHTML = on ? '<span style="color:var(--green)">online</span>' : '<span style="color:var(--ink-3)">offline</span>';
        q('.wof-ph').innerHTML = on ? 'The chat is open; new messages arrive at once.' : notif ? `Notification: <strong>${notif === 1 ? 'Riya: 1 new message' : 'Riya: ' + notif + ' new messages'}</strong>` : '<span style="color:var(--ink-3)">no notification</span>';
        q('.wof-tog').textContent = on ? 'Aman: close the app' : 'Aman: open the app (sync)';
        q('.wof-log').innerHTML = log.slice(-6).map(x => '• ' + x).join('<br>');
      };
      q('.wof-send').onclick = () => {
        const m = { id: next++, day, st: 1, exp: false }; sent.push(m);
        if (on) { m.st = 2; log.push(`msg ${m.id}: Aman is online, so it goes straight over the WebSocket. Riya gets ✓✓.`); }
        else {
          inbox.push(m);
          if (drop) log.push(`msg ${m.id}: safe in the inbox (✓). A push was sent, but it was dropped on the way.`);
          else { notif = inbox.length; log.push(`msg ${m.id}: safe in the inbox (✓). Push: ${notif === 1 ? 'a new notification.' : 'the old notification is updated (collapse), now "' + notif + ' new messages".'}`); }
        }
        draw();
      };
      q('.wof-tog').onclick = () => {
        on = !on;
        if (on) {
          const n = inbox.length;
          inbox.forEach(m => m.st = 2); inbox = []; notif = 0;
          log.push(n ? `Aman opened the app: sync brought ${n} message(s). Riya gets ✓✓, and they are deleted from the server inbox.` : 'Aman opened the app: the inbox was empty.');
        } else log.push('Aman closed the app: the WebSocket is closed and the registry entry is removed.');
        draw();
      };
      q('.wof-day').onclick = () => {
        day += 10;
        const gone = inbox.filter(m => day - m.day >= 30);
        gone.forEach(m => m.exp = true);
        inbox = inbox.filter(m => day - m.day < 30);
        if (notif > inbox.length) notif = inbox.length;
        log.push(`Day ${day}.` + (gone.length ? ` 30 days are up: msg ${gone.map(m => m.id).join(', ')} deleted from the server. Riya will always see only ✓.` : on ? '' : ' The messages are still waiting in the inbox.'));
        draw();
      };
      q('.wof-drop').onchange = e => { drop = e.target.checked; draw(); };
      q('.wof-reset').onclick = () => { reset(); q('.wof-drop').checked = false; draw(); };
      reset(); draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"The push notification is the message." No. A push is only a <strong>bell</strong> that wakes the phone. The message itself is in the server's offline inbox, and it arrives through sync when the app opens. If the push is lost, the message is not lost; Aman just finds out a little later.` },

    { type: 'h2', text: 'Deep dive 1: where and how should messages be stored?' },
    { type: 'p', html: `Here there are two completely different product decisions, and both are real:` },
    { type: 'compare',
      left: { title: 'Store-and-forward (WhatsApp style)', html: `The server is only a <strong>postman</strong>. Keep a message until it is delivered, then delete it. The history lives on the phone (and in the user's own backup).<br><br>According to a summary of WhatsApp's 2014 Erlang Factory talk, messages waited in a queue on the server until the client reconnected, and were removed as soon as they were accepted. Today's privacy policy says the same (undelivered: up to ~30 days).<br><br>Gain: small storage, more privacy. Cost: a new phone cannot get the history from the server.` },
      right: { title: 'Permanent history (Discord / Slack style)', html: `The server keeps the <strong>whole history</strong> forever. Log in on a new device, scroll through all old chats, search them.<br><br>In posts from 2017 and 2023, Discord explained that its messages sit in a wide-column database, <strong>partitioned by channel</strong>, with time-ordered IDs.<br><br>Gain: multi-device and search are easy. Cost: petabytes of storage, and server-side search is hard with E2EE.` },
    },
    { type: 'p', html: `In an interview, describe both and let the product decide. Now let us design the "permanent history" store, because it is harder. Look at the access pattern: almost always <em>"give me the latest 50 messages of this conversation"</em>, and on scrolling up, <em>"the 50 before these"</em>. Never "all messages of all users".` },
    { type: 'callout', tone: 'term', title: 'New word: wide-column store (Cassandra / ScyllaDB)', html: `<strong>What it is:</strong> a database built for a very large number of writes (inside it uses an LSM tree, seen in <a href="#/db-internals">DB internals</a>). It splits data across servers by a <strong>partition key</strong> (like conversation_id), and inside one partition the rows stay sorted by a <strong>clustering key</strong> (like message_id).<br><strong>Why we need it:</strong> a chat writes lakhs of messages every second, and reads always ask the same kind of question: "the latest 50 of this chat". That comes from one partition, already sorted, in one simple read.<br><strong>Without it:</strong> a normal SQL database would struggle with so many writes, and every read would need sorting in a huge table.<br><strong>What you do not get:</strong> joins and complex queries.` },
    { type: 'code', text: `
-- Discord's schema (2017 post), in simple form
CREATE TABLE messages (
  channel_id  bigint,
  bucket      int,        -- time window: one bucket ≈ 10 days
  message_id  bigint,     -- Snowflake: time-ordered
  author_id   bigint,
  content     text,
  PRIMARY KEY ((channel_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- "Latest 50": one partition, already sorted
SELECT * FROM messages WHERE channel_id = ? AND bucket = ? LIMIT 50;` },
    { type: 'list', items: [
      `<strong>Partition key = conversation</strong>: the history of one chat sits in one place. The roadmap rule says the same: shard chat messages by conversation_id (<a href="#/sharding">sharding</a>).`,
      `<strong>message_id is time-ordered</strong>: in an ID like Snowflake, the first bits are the time, so sorting by ID = sorting by time. No separate table or separate sort is needed. Details in the <a href="#/unique-ids">Unique IDs</a> lesson.`,
      `<strong>Why a bucket?</strong> Without a bucket, the partition of an old, busy chat would keep growing forever. Discord wrote in 2017 that it chose ~10-day buckets to keep partitions under ~100 MB.`,
    ]},
    { type: 'p', html: `See for yourself how the bucket size changes a partition:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="wa-mpd2">Messages per day in this chat</label><input id="wa-mpd2" type="number" value="20000" min="1" step="1"></div>
          <div><label for="wa-bytes">One message (bytes)</label><input id="wa-bytes" type="number" value="400" min="50" step="50"></div>
          <div><label for="wa-bd">Bucket size (days): <strong class="o-bdv"></strong></label><input id="wa-bd" type="range" min="1" max="60" step="1" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Size of one partition</span><strong class="o-ps"></strong></div>
          <div class="stat"><span>Partitions read for "latest 50"</span><strong class="o-np"></strong></div>
          <div class="stat"><span>Verdict</span><strong class="o-vd"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const g = s => el.querySelector(s);
      const upd = () => {
        const mpd = Math.max(1, Number(g('#wa-mpd2').value) || 1), b = Math.max(50, Number(g('#wa-bytes').value) || 50), d = Number(g('#wa-bd').value);
        g('.o-bdv').textContent = d;
        const mb = mpd * b * d / 1e6, perBucket = mpd * d;
        g('.o-ps').textContent = mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : mb.toFixed(1) + ' MB';
        g('.o-np').textContent = perBucket >= 50 ? '1' : Math.ceil(50 / perBucket) + ' (not counting empty buckets)';
        g('.o-vd').textContent = mb > 100 ? 'Too big' : perBucket < 50 ? 'Too small' : 'Good';
        g('.o-note').textContent = mb > 100
          ? 'The partition is over 100 MB: the database works hard to handle this one big piece (background cleanup and memory pressure), and this busy chat will overheat a single server. Make the bucket smaller.'
          : perBucket < 50
            ? 'Fewer than 50 messages in a bucket: "latest 50" must read several buckets. Discord also wrote that for small, quiet servers these random reads were expensive.'
            : 'The partition is small, and one read gives the latest 50. This is the balance we want.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'warn', title: 'Real world: hot partitions (Discord, 2022-23)', html: `According to Discord's 2023 post, by early 2022 its Cassandra cluster had grown to 177 nodes and trillions of messages. The channel of one very big, busy Discord server put heavy load on a single partition. This is called a <strong>hot partition</strong>: one piece gets so hot that its server (node) slows down, and that slows the whole cluster. On top of that came Java GC pauses (the database stopped for a moment to clean its memory). They did 3 things: (1) moved to ScyllaDB (72 ScyllaDB nodes instead of 177 Cassandra nodes), (2) put "data services" written in Rust in front of the database that do <strong>request coalescing</strong>: if a thousand requests for the same data arrive together, send only one query to the DB and share the answer with all of them, (3) used consistent hashing on channel_id so requests for the same channel go to the same data-service instance, which makes coalescing work better. They report that the p99 of history fetches (the time of the slowest 1 request in 100) went from 40-125 ms to ~15 ms, and the p99 of inserts from 5-70 ms to ~5 ms.` },
    { type: 'h3', text: 'Order: who came first?' },
    { type: 'p', html: `Two people write in a group in the same second. Everyone must see the <strong>same order</strong>. We cannot trust the phone's clock (it may be set wrong). So the <strong>server</strong> decides the order: the chat service gives a time-ordered msg_id when it accepts a message. If you need a strict order inside one conversation, send all writes of that conversation through one place (for example, consistent hashing on conversation_id). Nobody cares about the order between different conversations, so this does not become a global bottleneck.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Snowflake IDs are time-ordered, so the order is perfect." Almost. The clocks of two different servers can differ by a few milliseconds, so two messages sent within about the same millisecond can swap places. For chat this is fine; where you need a strict order, use a per-conversation sequence number (given by a single owner).` },
    { type: 'h2', text: 'Deep dive 2: ticks, a state machine' },
    { type: 'p', html: `According to WhatsApp's FAQ: one grey tick = it reached the server, two grey ticks = it reached the receiver's phone, two blue ticks = the receiver has read it. In a group, two ticks appear when it has reached the phones of <strong>all</strong> members, and blue when <strong>all</strong> have read it.` },
    { type: 'callout', tone: 'term', title: 'New word: state machine', html: `<strong>What it is:</strong> a thing that can only be in a few fixed "states", and can move from one state to another only along a few fixed paths. A message's path: <code>pending → sent → delivered → read</code>.<br><strong>Why we need it:</strong> receipts can arrive over the network in the wrong order, or twice. We need a simple rule for what to do.<br><strong>Rule:</strong> the state only moves forward, never back. If "delivered" arrives after "read", ignore it.<br><strong>Without it:</strong> a blue tick could turn grey again, or a duplicate receipt could cause a mess.` },
    { type: 'p', html: `Try it. Press the events in any order, and press duplicates too:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips wa-mode" style="padding:0"><button type="button" class="chip on" data-m="1">1:1 chat</button><button type="button" class="chip" data-m="3">Group (3 members)</button></div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:12px 0">
          <div style="font-family:var(--f-mono);font-size:30px;min-width:70px" class="wa-tick"></div>
          <div class="wa-tl" style="font-weight:600"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <button type="button" class="btn small primary wa-ack">Server saved it (ack)</button>
          <label class="wa-rrw" style="display:flex;align-items:center;gap:6px"><input type="checkbox" class="wa-rr"> Aman turned read receipts OFF</label>
          <button type="button" class="btn small ghost wa-reset">Reset</button>
        </div>
        <div class="wa-rows" style="display:grid;gap:6px"></div>
        <div class="calc-note wa-log" style="max-height:140px;overflow:auto"></div>`;
      const names = ['Aman', 'Zoya', 'Kabir'];
      const R = { none: 0, delivered: 1, read: 2 };
      let n = 1, ack = false, st = [], log = [], rrOff = false;
      const reset = () => { ack = false; st = names.slice(0, n).map(() => 0); log = ['Message typed, sending started. Waiting for the network (clock icon).']; };
      const tick = () => {
        if (!ack) return { s: '◷', c: 'var(--ink-3)', t: 'Pending: it has not reached the server yet' };
        const min = Math.min(...st);
        if (min >= 2 && !(n === 1 && rrOff)) return { s: '✓✓', c: 'var(--accent)', t: n === 1 ? 'Read: Aman has read it (blue)' : 'Read: all members have read it (blue)' };
        if (min >= 1) return { s: '✓✓', c: 'var(--ink-3)', t: n === 1 ? 'Delivered: reached Aman\'s phone (grey)' : 'Delivered: reached everyone\'s phone (grey)' };
        return { s: '✓', c: 'var(--ink-3)', t: 'Sent: safe on the server' };
      };
      const ev = (i, to) => {
        if (!ack) { log.push(`${names[i]}: a receipt arrived, but the server has not even accepted the message yet. That cannot happen: the ack comes first.`); return; }
        if (to === 2 && n === 1 && rrOff) { if (st[i] < 1) st[i] = 1; log.push(`${names[i]}: opened the chat and read it, but read receipts are OFF, so no "read" receipt was sent (only delivered, if it had not been sent before).`); return; }
        const was = st[i];
        if (to <= was) log.push(`${names[i]}: a "${to === 1 ? 'delivered' : 'read'}" receipt arrived, but the state is already "${['sent', 'delivered', 'read'][was]}". Ignored (the state never goes back, and duplicates are safe).`);
        else { st[i] = to; log.push(`${names[i]}: ${['', 'delivered', 'read'][to]}${to === 2 && was === 0 ? ' (read came first; read also means delivered, so go straight to read)' : ''}.`); }
      };
      const draw = () => {
        const tk = tick(), q = s => el.querySelector(s);
        q('.wa-tick').textContent = tk.s; q('.wa-tick').style.color = tk.c; q('.wa-tl').textContent = tk.t;
        q('.wa-rrw').style.display = n === 1 ? 'flex' : 'none';
        q('.wa-rows').innerHTML = names.slice(0, n).map((nm, i) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 8px;border:1px solid var(--line);border-radius:var(--r-sm)">
          <strong style="min-width:60px">${nm}</strong><span style="color:var(--ink-2);min-width:80px">${ack ? ['sent', 'delivered', 'read'][st[i]] : '-'}</span>
          <button type="button" class="btn small ghost" data-i="${i}" data-to="1">Phone online (delivered)</button>
          <button type="button" class="btn small ghost" data-i="${i}" data-to="2">Opened chat (read)</button></div>`).join('');
        q('.wa-log').innerHTML = log.slice(-6).map(x => '• ' + x).join('<br>') + (n === 1 && rrOff ? '<br>Note: read receipts are off, so Riya will not see a blue tick (and Aman will not see other people\'s blue ticks either). This setting does not apply in groups.' : '');
        q('.wa-rows').querySelectorAll('button').forEach(b => b.onclick = () => { ev(+b.dataset.i, +b.dataset.to); draw(); });
      };
      el.querySelectorAll('.wa-mode .chip').forEach(c => c.onclick = () => {
        el.querySelectorAll('.wa-mode .chip').forEach(x => x.classList.toggle('on', x === c)); n = +c.dataset.m; reset(); draw();
      });
      el.querySelector('.wa-ack').onclick = () => { if (ack) log.push('The server ack arrived again: ignored.'); else { ack = true; log.push('The server saved it and gave a msg_id: ✓'); } draw(); };
      el.querySelector('.wa-rr').onchange = e => { rrOff = e.target.checked; draw(); };
      el.querySelector('.wa-reset').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `What happens inside: every receipt is itself a small message that travels the opposite way (Aman → gateway → chat service → Riya). For each (msg_id, receiver), the server keeps the furthest state reached, and updates it only when it moves forward. In a group, Riya's overall tick = the state of the member who is furthest behind (the minimum). That is why, in a group of 1,000 members, you rarely see a blue tick.` },
    { type: 'callout', tone: 'warn', title: 'Receipts are traffic too', html: `Every message brings 2 receipts from every receiver (delivered + read). In a 1:1 chat, 1 message = 3 small messages. In a group of 500 members, 1 message = 500 deliveries + ~1,000 receipts. So real systems <strong>batch</strong> receipts (for example, one receipt saying "I have read everything up to 7291840011") and put a limit on group size.` },

    { type: 'h2', text: 'Deep dive 3: groups, one message → many phones' },
    { type: 'p', html: `In a group, Riya sends one message, and it must reach 100 people (and their laptops and tablets). The question: who makes the copies, Riya's phone or the server?` },
    { type: 'callout', tone: 'term', title: 'New word: fan-out', html: `<strong>What it is:</strong> taking one message to many people or devices. Like a fan that blows air in all directions.<br><strong>Why we need it:</strong> every group message must reach every member's device.<br><strong>Cost:</strong> one message = N deliveries + receipts from N. A bigger group means more work. That is why groups have a size limit.<br><strong>Server-side fan-out:</strong> the phone gives one copy to the server, and the server shares it out. <strong>Client fan-out:</strong> the phone itself sends a separate copy for each device.` },
    { type: 'p', html: `If Riya's phone sent a separate copy for each member, 100 members × 2 devices = 200 uploads, on mobile data. Better: the phone gives the server <strong>one</strong> copy, and the server shares it to 200 places (<strong>server-side fan-out</strong>). But with E2EE the server cannot open the message, so how can it send one single encrypted copy to everyone? The answer from WhatsApp's whitepaper: <strong>Sender Keys</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Sender Key', html: `<strong>What it is:</strong> Riya's own key for the group. The first time she sends a message in the group, Riya's phone creates a random Sender Key and sends it to every member device <em>separately</em>, through their private (pairwise) encrypted channel. This is a one-time job.<br><strong>Why we need it:</strong> after that, every group message is locked <strong>only once</strong> with this Sender Key. The server shares that one ciphertext with all members, and every member has the key, so they can open it.<br><strong>Without it:</strong> Riya's phone would have to upload 200 separate copies of every message, on mobile data.<br><strong>When a member leaves:</strong> according to the whitepaper, everyone deletes their Sender Key and creates a new one, so the person who left cannot read future messages.` },
    { type: 'flow', title: 'Group message fan-out', height: 330,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 165, w: 120, kind: 'client', info: 'What it is: Riya\'s phone (the sender). It locks the group message only once with her Sender Key and uploads one copy.' },
        { id: 'gw', label: 'Gateway A', x: 245, y: 165, w: 120, kind: 'server', info: 'What it is: Riya\'s connection gateway (front door). It passes the message on to the group service without opening it.' },
        { id: 'grp', label: 'Group service', sub: 'members + fan-out', x: 430, y: 165, w: 150, kind: 'server', info: 'What it is: the group service. It keeps the list of group members (in a cache, because every message needs it) and gets the message delivered to every member device (fan-out). For big groups, this work is split across a queue + workers.' },
        { id: 'reg', label: 'Registry', sub: 'who is where', x: 430, y: 50, w: 130, kind: 'cache', info: 'What it is: the session registry (phone book): which gateway each member device is on. For one group message, do one batch lookup (Redis MGET = read many keys at once), not 100 separate calls.' },
        { id: 'gws', label: 'Gateways', sub: 'online members', x: 630, y: 90, w: 140, kind: 'server', info: 'What it is: the gateways that online members are connected to. If 10 group members are on one gateway, send that gateway one batch, not 10 separate messages.' },
        { id: 'push', label: 'Push', sub: 'offline members', x: 630, y: 250, w: 140, kind: 'queue', info: 'What it is: the push service, which sends notifications to offline members through APNs/FCM. In a busy group, a notification for every message would feel like spam, so many messages become one notification (collapse).' },
        { id: 'store', label: 'Pending store', x: 430, y: 285, w: 130, kind: 'data', info: 'What it is: the offline inbox. For offline member devices, the message waits here (a reference to the same single ciphertext) until they sync.' },
      ],
      edges: [{ a: 'r', b: 'gw' }, { a: 'gw', b: 'grp' }, { a: 'grp', b: 'reg' }, { a: 'grp', b: 'gws' }, { a: 'grp', b: 'push' }, { a: 'grp', b: 'store' }],
      scenarios: [
        { name: 'Normal group message', steps: [
          { title: 'Upload just one ciphertext', go: 'r>gw>grp', text: 'Riya\'s phone locked it once with the Sender Key. Only one upload.', msg: '{ "type":"send", "conv":"group:xyz-friends", "body":"<ciphertext, Sender Key>" }' },
          { title: 'Members + who is where', go: ['grp>reg', 'res:reg>grp'], text: 'One batch lookup for all devices of 100 members: 60 are online (on 12 gateways), the rest are offline.', msg: 'MGET conn:dev1 conn:dev2 ... (200 devices)' },
          { title: 'Push to online, store + notify offline', parallel: true, go: ['grp>gws', 'grp>store', 'evt:grp>push'], text: 'Server-side fan-out. One batch per gateway. For offline devices: pending + a notification.', after: { gws: { state: 'ok', sub: '120 devices' }, store: { sub: '80 pending' } } },
          { title: 'Receipts come back', go: 'evt:gws>grp>gw>r', text: 'Members\' delivered/read receipts arrive. Riya gets two ticks only when the message has reached everyone\'s phone.' },
        ]},
        { name: 'First message (Sender Key)', intro: 'E2EE setup: Riya is writing in this group for the first time.', steps: [
          { title: 'Send the Sender Key separately', go: 'r>gw>grp>gws', text: 'Riya\'s phone locks the Sender Key for each member device using its pairwise session, and sends it. This is a costly one-time job (N copies).', set: { gws: { sub: 'key → each device' } } },
          { title: 'Now one copy per message', go: ['r>gw>grp', 'grp>gws'], text: 'After this, every message is one single ciphertext. The server shares it with everyone without reading it.', after: { gws: { state: 'ok', sub: 'decrypt with key' } } },
        ]},
        { name: 'A member left the group', steps: [
          { title: 'Kabir left', text: 'According to the whitepaper: when a member leaves, all members delete their Sender Key and create a new one.', focus: ['grp'], set: { grp: { sub: 'member left' } } },
          { title: 'New keys, sent again', go: 'r>gw>grp>gws', text: 'Before the next message, Riya\'s phone sends the new Sender Key to the remaining members, pairwise. Kabir has the old key, not the new one: he cannot read future messages, even if the server sends them to him by mistake.', after: { grp: { state: 'ok', sub: 'keys rotated' } } },
        ]},
        { name: 'Hot group', intro: 'A cricket group with 1,000 members, in the last over of a match.', steps: [
          { title: 'A flood of messages', flood: { paths: ['r>gw>grp'], n: 8 }, text: 'Dozens of messages every second, each fanned out to 1,000+ devices, and each bringing 2 receipts per member.', after: { grp: { state: 'hot', sub: 'fan-out backlog' } } },
          { title: 'What do we do?', go: ['grp>gws', 'evt:grp>push'], text: 'Split the fan-out across a queue + workers, send to gateways in batches, collapse notifications, batch receipts, and limit the group size. The load of one group should not land on one machine, so split (partition) the group\'s work too.', after: { grp: { state: 'warn', sub: 'queued, batched' } } },
        ]},
      ],
    },
    { type: 'p', html: `Feel the cost of a group yourself:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="wa-gm">Group members: <strong class="o-gmv"></strong></label><input id="wa-gm" type="range" min="2" max="1024" step="1" value="100"></div>
          <div><label for="wa-go">Online right now: <strong class="o-gov"></strong></label><input id="wa-go" type="range" min="0" max="100" step="5" value="60"></div>
          <div><label for="wa-gd">Devices per member (phone + laptop...)</label><input id="wa-gd" type="number" value="2" min="1" max="5" step="1"></div>
          <div><label for="wa-gr">Messages per minute in group</label><input id="wa-gr" type="number" value="10" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Deliveries per message</span><strong class="o-dl"></strong></div>
          <div class="stat"><span>Right away (online devices)</span><strong class="o-on"></strong></div>
          <div class="stat"><span>Pending (offline devices)</span><strong class="o-pd"></strong></div>
          <div class="stat"><span>Receipts per message</span><strong class="o-rc"></strong></div>
          <div class="stat"><span>Server work per minute</span><strong class="o-pm"></strong></div>
          <div class="stat"><span>Phone uploads: Sender Key vs without</span><strong class="o-up"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const g = s => el.querySelector(s);
      const upd = () => {
        const m = Number(g('#wa-gm').value), on = Number(g('#wa-go').value) / 100;
        const d = Math.min(5, Math.max(1, Number(g('#wa-gd').value) || 1)), rate = Math.max(1, Number(g('#wa-gr').value) || 1);
        g('.o-gmv').textContent = m; g('.o-gov').textContent = Math.round(on * 100) + '%';
        const dl = (m - 1) * d, onl = Math.round(dl * on), pend = dl - onl, rc = 2 * (m - 1), per = dl + rc;
        g('.o-dl').textContent = dl.toLocaleString('en-IN');
        g('.o-on').textContent = onl.toLocaleString('en-IN');
        g('.o-pd').textContent = pend.toLocaleString('en-IN');
        g('.o-rc').textContent = rc.toLocaleString('en-IN');
        g('.o-pm').textContent = (per * rate).toLocaleString('en-IN');
        g('.o-up').textContent = '1 vs ' + dl.toLocaleString('en-IN');
        g('.o-note').textContent = `One message = ${dl} deliveries + ${rc} receipts (delivered + read from each member; receipts are counted per member). Without Sender Keys, Riya's phone would have to upload a separate ciphertext for every device (${dl}). Double the members, and the server's work roughly doubles too. That is why groups have a size limit, and "channels" with lakhs of followers are designed differently (like a feed, the next lesson).`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h2', text: 'Deep dive 4: photos, videos, voice notes' },
    { type: 'p', html: `The problem: if we sent a 20 MB video on the chat WebSocket, that pipe would be blocked for about a minute, and text messages would be stuck in the meantime. The gateway's memory would fill up too. So <strong>media takes a separate road</strong>: the phone uploads the file straight into a separate storage, and the chat message carries only its <em>pointer</em> (address). First, three new parts:` },
    { type: 'callout', tone: 'term', title: 'New word: object storage (blob store)', html: `<strong>What it is:</strong> a cheap, very durable "cupboard" for big files (photos, videos, audio), like Amazon S3. Each file is an <em>object</em> or <em>blob</em>, with a name or ID. Details in the <a href="#/object-storage">Object storage</a> lesson.<br><strong>Why we need it:</strong> a database is made for small records; for crores of videos, object storage is cheap and simple.<br><strong>Without it:</strong> videos would go into the chat database, which would become very expensive and slow.` },
    { type: 'callout', tone: 'term', title: 'New word: pre-signed upload URL', html: `<strong>What it is:</strong> a special link that the server gives for a few minutes: "with this link you can upload only this one file, and only now".<br><strong>Why we need it:</strong> the phone puts the file straight into object storage, not through our servers. Our servers stay light.<br><strong>Without it:</strong> all the bytes of every video would pass through our servers: a big cost in bandwidth and memory.` },
    { type: 'callout', tone: 'term', title: 'New word: CDN', html: `<strong>What it is:</strong> cache servers (edges) placed near users all over the world. Once a file has come to an edge, the edge keeps it and serves the next users from there. Details in the <a href="#/cdn">CDN</a> lesson.<br><strong>Why we need it:</strong> 500 people in a group open the same photo; they do not all need to go to the faraway storage.<br><strong>Without it:</strong> every download would go to the storage: slow and expensive.` },
    { type: 'p', html: `WhatsApp's whitepaper describes exactly this way of sending media, with encryption. A few new words: <em>AES-256</em> is a lock (a method of encryption); a <em>hash</em> (SHA-256) is a file's "fingerprint": if even one bit of the file changes, the fingerprint changes; <em>HMAC</em> is a fingerprint made with a key, which proves the file was not changed on the way.` },
    { type: 'steps', items: [
      { t: 'Make a random key', d: 'For every attachment, the sender\'s phone creates a new random AES-256 key (the key to the lock) and an HMAC-SHA256 key.' },
      { t: 'Lock it and upload', d: 'The file is encrypted on the phone itself (AES-256-CBC + MAC), and the encrypted blob is uploaded to the blob store. The server only has a locked box.' },
      { t: 'The key goes in the chat message', d: 'A normal E2EE chat message carries: the decryption key, the HMAC key, the SHA-256 hash (fingerprint) of the encrypted blob, and the blob\'s pointer.' },
      { t: 'Receiver downloads + checks', d: 'The receiver downloads the blob, checks the fingerprint (was it changed on the way?), and unlocks it with the key.' },
    ]},
    { type: 'p', html: `See for yourself why sending media through the chat pipe is bad, and how much a CDN saves (these are assumed numbers):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>File size (MB): <strong class="wmd-sv"></strong></label><input class="wmd-s" type="range" min="1" max="100" step="1" value="20"></div>
          <div><label>Phone upload speed (Mbps): <strong class="wmd-uv"></strong></label><input class="wmd-u" type="range" min="1" max="50" step="1" value="2"></div>
          <div><label>How many people in the group open it: <strong class="wmd-nv"></strong></label><input class="wmd-n" type="range" min="1" max="1000" step="1" value="500"></div>
          <div><label>How many different cities (CDN edges) they are in: <strong class="wmd-cv"></strong></label><input class="wmd-c" type="range" min="1" max="50" step="1" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Blocked if sent on the chat pipe (seconds)</span><strong class="wmd-b"></strong></div>
          <div class="stat"><span>Separate road: chat carries only</span><strong class="wmd-p"></strong></div>
          <div class="stat"><span>Downloads from storage: no CDN</span><strong class="wmd-o1"></strong></div>
          <div class="stat"><span>Downloads from storage: with CDN</span><strong class="wmd-o2"></strong></div>
          <div class="stat"><span>Data from storage: no CDN / CDN</span><strong class="wmd-d"></strong></div>
        </div>
        <div class="calc-note wmd-note"></div>`;
      const g = s => el.querySelector(s);
      const upd = () => {
        const mb = +g('.wmd-s').value, up = +g('.wmd-u').value, n = +g('.wmd-n').value, c = +g('.wmd-c').value;
        g('.wmd-sv').textContent = mb; g('.wmd-uv').textContent = up; g('.wmd-nv').textContent = n; g('.wmd-cv').textContent = c;
        const blocked = mb * 8 / up, o2 = Math.min(n, c);
        const fmt = x => x >= 1000 ? (x / 1000).toFixed(1) + ' GB' : x + ' MB';
        g('.wmd-b').textContent = blocked.toFixed(0) + ' s';
        g('.wmd-p').textContent = '~200 bytes';
        g('.wmd-o1').textContent = n.toLocaleString('en-IN');
        g('.wmd-o2').textContent = o2.toLocaleString('en-IN');
        g('.wmd-d').textContent = fmt(n * mb) + ' / ' + fmt(o2 * mb);
        g('.wmd-note').textContent = `Sending ${mb} MB at ${up} Mbps takes ~${blocked.toFixed(0)} seconds. If it went on the chat WebSocket, all of Riya's text messages and ticks would wait in line behind it for that long. With a separate road, the chat carries only the pointer + key. Download: the CDN brings the file once to the edge in each city, so storage serves only ${o2} downloads instead of ${n}. This works because everyone in the group gets the same single encrypted file.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'flow', title: 'Sending a photo', height: 320,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 150, w: 120, kind: 'client', info: 'What it is: Riya\'s phone (the sender). It makes the photo smaller (compresses it) and locks it (encrypts it) on the phone itself, then uploads it.' },
        { id: 'media', label: 'Media service', sub: 'upload URLs', x: 255, y: 50, w: 140, kind: 'server', info: 'What it is: the media service. It checks the login and gives a pre-signed upload URL that is valid for a few minutes. The file\'s bytes do not pass through it, so it stays light. The whitepaper only says "blob store"; the upload URL method is the general industry approach.' },
        { id: 'blob', label: 'Blob store', sub: 'object storage', x: 470, y: 150, w: 140, kind: 'data', info: 'What it is: the blob store, object storage like S3. It holds only encrypted bytes. Cheap, durable, and built for big files. Old media that has already been delivered can be removed with an expiry (TTL).' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 640, y: 150, w: 110, kind: 'edge', info: 'What it is: the CDN, cache servers near users. If 500 people in a group open the same photo, each edge fetches it from storage only once, because everyone gets the same encrypted file. WhatsApp\'s public sources give no CDN details; a CDN for media is the general industry approach (the roadmap says the same).' },
        { id: 'chat', label: 'Chat service', x: 255, y: 260, w: 140, kind: 'server', info: 'What it is: the chat service (together with the gateway). It carries a normal chat message: the blob\'s pointer + keys + fingerprint (hash), all inside E2EE, so the server never sees the keys.' },
        { id: 'a', label: 'Aman (app)', x: 470, y: 275, w: 120, kind: 'client', info: 'What it is: Aman\'s phone (the receiver). First it gets a small pointer/thumbnail, then downloads the blob from the CDN, checks the fingerprint, and decrypts it with the key.' },
      ],
      edges: [{ a: 'r', b: 'media' }, { a: 'r', b: 'blob' }, { a: 'blob', b: 'cdn' }, { a: 'r', b: 'chat' }, { a: 'chat', b: 'a' }, { a: 'cdn', b: 'a' }],
      scenarios: [
        { name: 'Send a photo', steps: [
          { title: 'Get an upload URL', go: ['r>media', 'res:media>r'], text: 'The phone says "I want to upload 2 MB". The media service gives a pre-signed URL, valid for a few minutes.', msg: 'POST /media/upload-url  →  { upload_url, media_id: "m-55" }' },
          { title: 'Encrypt + upload', go: 'r>blob', text: 'The phone encrypted the photo with a random key and put it straight into the blob store. Big videos are sent in chunks (resumable).', after: { blob: { sub: 'm-55 (encrypted)' } } },
          { title: 'Chat message: pointer + key', go: 'r>chat>a', text: 'A message of only ~200 bytes: pointer, key, hash. As fast as text.', msg: '{ media: "m-55", key: <inside E2EE>, sha256: "9f2c..." }' },
          { title: 'Aman downloads (CDN miss)', go: ['a>cdn>blob', 'res:blob>cdn>a'], text: 'The first time, the CDN did not have it, so it fetched it from the origin and kept a copy. Aman checked the hash and opened the photo.', after: { a: { state: 'ok', sub: 'photo decrypted' }, cdn: { state: 'miss' } } },
        ]},
        { name: 'Upload broke halfway', steps: [
          { title: 'Network gone', go: 'lost:r>blob', text: 'A 20 MB video; the network dropped at 60%.', set: { r: { state: 'warn', sub: 'upload 60%' } } },
          { title: 'Resume, not restart', go: 'r>blob', text: 'Chunked/resumable upload: the phone asks "how much has arrived?" and sends only the remaining 40%.', after: { r: { state: 'ok', sub: 'upload 100%' } } },
          { title: 'Now the message goes', go: 'r>chat>a', text: 'Send the chat message only when the upload is complete. Otherwise Aman gets a broken pointer. Order: first the blob, then the pointer.' },
        ]},
        { name: '500 people in a group open it', steps: [
          { title: 'Everyone asks for the same file', flood: { paths: ['a>cdn'], n: 8 }, text: 'A group message is one single Sender Key ciphertext, so the photo is also one single encrypted blob for everyone.', after: { cdn: { state: 'hit', sub: 'HIT' } } },
          { title: 'Only once at the origin', go: 'res:cdn>a', text: 'The CDN cannot see the content inside, and it does not need to: it only caches bytes.' },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 5: end-to-end encryption and its effect on the design' },
    { type: 'p', html: `Learning all of cryptography is not the job of this lesson, but a system designer must know how E2EE changes the architecture. WhatsApp uses the <strong>Signal Protocol</strong> (whitepaper, latest version February 2026). First the very basic idea, then WhatsApp's details.` },
    { type: 'callout', tone: 'term', title: 'New words: public key and private key', html: `<strong>What it is:</strong> a pair of keys. The <em>public key</em> is an open padlock that Aman can give to everyone: anyone can use it to lock a box. The <em>private key</em> is the only key for that padlock, and it stays only on Aman's phone. A box locked with Aman's public padlock opens only with Aman's private key.<br><strong>Why we need it:</strong> Riya can lock a message for Aman without sharing any secret first, and nobody in the middle (not even WhatsApp's server) can open it.<br><strong>Without it:</strong> the server would hold the key, and a hacked server = all chats can be read.` },
    { type: 'image', src: 'assets/img/design-whatsapp/public-key-encryption.png', maxWidth: 420, alt: 'Diagram: Bob\'s message "Hello Alice!" is encrypted with Alice\'s public key, becomes meaningless text like 6EB69570 in the middle, and only Alice\'s private key decrypts it back to "Hello Alice!"', caption: 'The basic idea of public key encryption: a message locked with Alice\'s public key (green) becomes meaningless characters in the middle, and only Alice\'s private key (red) can open it. The server only sees the middle part. (WhatsApp actually uses these keys to create a shared secret, but the idea is the same.)', credit: { text: 'David Göthberg, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Public_key_encryption.svg', license: 'Public domain' } },
    { type: 'p', html: `See for yourself what the server sees. This is a <strong>toy lock</strong> (not real AES), only to feel the idea:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Riya's message</label><input class="wee-m" type="text" value="See you tomorrow at 5" maxlength="60" style="width:100%">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><span class="chips wee-mode" style="padding:0"><button type="button" class="chip on" data-e="1">E2EE ON</button><button type="button" class="chip" data-e="0">E2EE OFF</button></span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Riya's phone</strong><div class="wee-a" style="margin-top:6px;word-break:break-all"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><strong>What the server (and a hacker) sees</strong><div class="wee-s" style="margin-top:6px;font-family:var(--f-mono);font-size:13px;word-break:break-all"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Aman's phone</strong><div class="wee-b" style="margin-top:6px;word-break:break-all"></div></div>
        </div>
        <div class="wee-cap" style="display:grid;gap:4px;margin-top:10px;font-size:14px"></div>
        <div class="calc-note wee-note"></div>`;
      let e2ee = true;
      const q = s => el.querySelector(s);
      const lock = t => { let seed = 7, out = ''; for (const ch of new TextEncoder().encode(t)) { seed = seed * 16807 % 2147483647; out += ((ch ^ (seed & 255)) & 255).toString(16).padStart(2, '0').toUpperCase(); } return out; };
      const draw = () => {
        const m = q('.wee-m').value || ' ';
        q('.wee-a').textContent = m;
        q('.wee-s').textContent = e2ee ? lock(m) : m;
        q('.wee-b').textContent = m;
        const caps = [['Route the message (who to send it to)', true], ['Search messages on the server', !e2ee], ['Read the content to filter spam', !e2ee], ['Make link previews on the server', !e2ee], ['Chats stay safe if the server is hacked', e2ee]];
        q('.wee-cap').innerHTML = caps.map(([t, ok]) => `<div><span style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:700">${ok ? '✓' : '✗'}</span> ${t}</div>`).join('');
        q('.wee-note').textContent = e2ee ? 'E2EE ON: the server sees only meaningless characters. It can still deliver the message (it knows to whom, when and how big), but it cannot read it.' : 'E2EE OFF: the server can read the text. Search and spam filters are easy, but if the server or its logs leak, everything is exposed. Products like Slack and Discord choose this road.';
      };
      el.querySelectorAll('.wee-mode .chip').forEach(c => c.onclick = () => { e2ee = c.dataset.e === '1'; el.querySelectorAll('.wee-mode .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); });
      q('.wee-m').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Now WhatsApp's real details, in simple words:` },
    { type: 'list', items: [
      `<strong>A phone book of public keys</strong>: when the app is installed, the phone creates keys: one long-lived <em>Identity Key</em>, one <em>Signed Pre Key</em> (changed from time to time), and many <em>One-Time Pre Keys</em>. The public parts are uploaded to the server. Private keys never leave the phone. So the server is also a "phone book of public keys".`,
      `<strong>A session even when offline</strong>: Riya can take Aman's public keys from the server and set up a session, even if Aman is offline. That is why one-time pre keys are uploaded in advance.`,
      `<strong>A new key for every message</strong>: after every message the key moves one step forward, like a ratchet (a wheel that only turns forward). This is called the Double Ratchet. The gain: even if today's key is stolen, old messages cannot be opened. This is called <em>forward secrecy</em>.`,
      `<strong>Multi-device = client fan-out</strong>: according to Meta's 2021 post, every device has its own identity key, and for a 1:1 message the sender's phone encrypts a separate copy for every device (the receiver's devices and the sender's own other devices). Aman's phone + 4 linked devices = 5 copies, plus copies for Riya's own other devices.`,
      `<strong>The road is encrypted too</strong>: the connection between the phone and WhatsApp's server is also encrypted separately (the Noise Pipes protocol, whitepaper). So there are two locks: one on the message (only Aman can open it), and one on the pipe (the network in between sees nothing).`,
    ]},
    { type: 'table', head: ['What the server knows', 'What the server does not know'], rows: [
      ['Who sent to whom and when (needed for routing)', 'The text of the message'],
      ['The size of the message, the pointer to the encrypted blob', 'The content of the photo or video, and its key'],
      ['The members of a group (needed for fan-out)', 'What is being said in the group'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Effect on the design', html: `With E2EE the server <strong>cannot do anything with the content</strong>: no server-side search, no spam filter that reads content, no link previews on the server (the phone makes them itself), and server backups of history are only encrypted. This is a product trade-off. Products like Slack and Discord, which offer search and history on the server, keep messages readable on the server.` },

    { type: 'h2', text: 'Online / last seen' },
    { type: 'callout', tone: 'term', title: 'New word: presence', html: `<strong>What it is:</strong> information such as "online" / "last seen" / "typing..." that tells whether someone is in the app right now.<br><strong>Why we need it:</strong> users learn whether a reply will come soon.<br><strong>Without it:</strong> chat still works; it is "nice to have", so let it be cheap and even slightly out of date (stale).` },
    { type: 'p', html: `Showing "online" looks cheap, but telling every contact of every user about every status change is a huge fan-out. What the industry usually does: take presence from the registry heartbeat (an entry exists = online), and send the status only to people who have that chat open <em>right now</em> (subscribe on open), not to everyone. Slack's 2023 post also mentions separate "Presence Servers". Presence that is a little out of date is fine, so this is a good example of <a href="#/cap">eventual consistency</a>.` },

    { type: 'h2', text: 'What real companies did' },
    { type: 'table', head: ['Company', 'What is known (and from when)'], rows: [
      ['WhatsApp (2012-2014)', 'The server was almost entirely in Erlang, on FreeBSD; it started from ejabberd (an open-source XMPP server), then moved to its own protocol. January 2012: 20 lakh+ TCP connections on one server. 2014 (Erlang Factory talk, Rick Reed): ~50 billion messages/day, messages kept on the server only until the client took them. This information is 10+ years old; today\'s stack inside Meta is not public.'],
      ['WhatsApp (2016-2026)', 'Security whitepaper: Signal Protocol, group fan-out with Sender Keys (server-side), client fan-out for multi-device (2021), media in an encrypted blob store, transport with Noise Pipes.'],
      ['Discord (2017, 2023)', 'Messages in a wide-column DB, key ((channel_id, bucket), message_id), Snowflake IDs. 2017: MongoDB to Cassandra (12 nodes). 2022: from 177 Cassandra nodes to 72 ScyllaDB nodes, Rust data services with request coalescing.'],
      ['Slack (2023)', 'Gateway Servers (WebSockets, in many regions), Channel Servers (channel → host by consistent hashing, stateful, in memory), Admin Servers, Presence Servers. A message is first saved through the web app API, then sent by the channel server to the subscribed gateways, around the world in ~500 ms.'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Slack\'s idea: one owner per "channel"', html: `In Slack, every channel "lives" on one Channel Server, chosen by consistent hashing. When a message arrives, that channel's server sends it to all the gateways whose users have subscribed to the channel. This is another form of the registry: instead of "where is the user", it is "who is listening to this channel". This pattern is very useful for big group chats. (See <a href="#/consistent-hashing">Consistent hashing</a>.)` },

    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'table', head: ['What broke', 'What happens', 'Protection'], rows: [
      ['Gateway crash', 'Lakhs of its users disconnect and reconnect at the same time', 'Detect with heartbeats, reconnect with backoff + jitter, registry TTL, resume from last_msg_id'],
      ['Registry stale / down', 'Sending to the wrong gateway, delivery fails', 'The message is in the store first, so it is only delayed; replicated registry; on a miss, treat the user as "offline" and push'],
      ['Ack lost, client retries', 'Duplicate message', 'Dedupe with client_msg_id (idempotent)'],
      ['Receipts in the wrong order', '"Delivered" arrives later', 'Monotonic state machine: the state only moves forward'],
      ['Hot group / hot channel', 'One partition and one fan-out worker overheat', 'Fan-out queue + workers, batching, request coalescing (Discord), group size limit'],
      ['APNs/FCM slow or dropped', 'The notification did not arrive', 'Push is only a hint; sync as soon as the app opens'],
      ['Message store node down', 'Writes fail', 'Replication factor 3, quorum writes (<a href="#/replication">replication</a>)'],
      ['Phone offline forever', 'Pending storage keeps growing', 'TTL (WhatsApp: ~30 days)'],
    ]},

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• <strong>Two-way, frequent, low-latency</strong> (chat) → WebSockets on gateways + a registry. If it is only a server → client stream, SSE is enough.<br>• <strong>Do you need history on the server?</strong> Yes (multi-device, search) → a permanent store, partitioned by conversation, with time-ordered IDs. No (privacy first) → store-and-forward + TTL.<br>• <strong>Group fan-out</strong>: small groups → server-side fan-out per message. Lakhs of followers → that is not chat, it is a feed/broadcast problem (fan-out on read, the next lesson).<br>• <strong>Offline</strong>: always "store, then push as a hint, then sync on connect".` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Requirements + maths', d: '1:1, groups, ticks, offline, media. 100M online ÷ 100k = ~1,000 gateways. Lakhs of messages/sec, so a write-heavy store.' },
      { t: 'Connection layer', d: 'L4 LB → WebSocket gateways (no business logic, only connections) → registry (user → gateway, TTL + heartbeat).' },
      { t: 'Message path', d: 'client_msg_id → chat service → store first (✓) → registry lookup → recipient gateway → delivered receipt (✓✓) → read (blue).' },
      { t: 'Storage', d: 'Partition by conversation, Snowflake-style IDs, bucket by time; Discord\'s hot partition story.' },
      { t: 'Groups, offline, media, E2EE', d: 'Server-side fan-out with Sender Keys; store + push + sync; blob store + pointer; the server sees only ciphertext.' },
      { t: 'Failures', d: 'Gateway crash + thundering herd, duplicates, out-of-order receipts, hot groups, push drop.' },
    ]},

    { type: 'diagram', title: 'The whole design at a glance', height: 650,
      groups: [
        { label: 'Media', x: 12, y: 160, w: 156, h: 350 },
        { label: 'Data', x: 550, y: 50, w: 160, h: 340 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya (app)', sub: 'sender', x: 90, y: 80, w: 130, kind: 'client', info: 'What it is: the sender\'s phone. It locks the message on the phone itself (E2EE), adds a client_msg_id, and sends it on an open WebSocket.' },
        { id: 'lb', label: 'L4 LB', sub: 'new connections', x: 270, y: 80, w: 130, kind: 'edge', info: 'What it is: the L4 load balancer. It sends new WebSocket connections to a free gateway. It does not look inside messages, so it is very fast.' },
        { id: 'gwa', label: 'Gateway A', sub: 'WebSockets', x: 450, y: 80, w: 130, kind: 'server', info: 'What it is: Riya\'s connection gateway. It holds lakhs of open connections, checks the token and heartbeat, and writes to the registry on connect. It makes no decisions about messages.' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 630, y: 100, w: 130, kind: 'cache', info: 'What it is: the session registry (like Redis): which device is on which gateway, with TTL + heartbeat. No entry = offline.' },
        { id: 'media', label: 'Media service', sub: 'upload URL', x: 90, y: 210, w: 130, kind: 'server', info: 'What it is: the media service. It gives a pre-signed upload URL valid for a few minutes, so the phone puts the encrypted file straight into the blob store.' },
        { id: 'grp', label: 'Group service', sub: 'members, fan-out', x: 270, y: 210, w: 130, kind: 'server', info: 'What it is: the group service. It keeps the member list and shares one Sender Key ciphertext with every member device (server-side fan-out), in batches.' },
        { id: 'chat', label: 'Chat service', sub: 'ID, save, route', x: 450, y: 210, w: 130, kind: 'server', info: 'What it is: the brain of the chat. Dedupe (client_msg_id), a time-ordered msg_id, save in the store first (✓), then a registry lookup and sending to the receiver\'s gateway. Stateless.' },
        { id: 'store', label: 'Message store', sub: 'by conversation', x: 630, y: 220, w: 130, kind: 'data', info: 'What it is: the durable message store (wide-column, like Cassandra/ScyllaDB). Partition = conversation (+ time bucket), sorted by msg_id. In the WhatsApp style, kept only until delivery.' },
        { id: 'inbox', label: 'Offline inbox', sub: 'pending/device', x: 630, y: 340, w: 130, kind: 'data', info: 'What it is: undelivered messages for offline devices. Synced when the app opens, deleted once delivered; WhatsApp expires them after ~30 days.' },
        { id: 'blob', label: 'Blob store', sub: 'encrypted files', x: 90, y: 340, w: 130, kind: 'data', info: 'What it is: object storage (like S3). Only encrypted photos and videos. The chat message carries only the pointer + key.' },
        { id: 'push', label: 'Push service', sub: 'device tokens', x: 270, y: 340, w: 130, kind: 'queue', info: 'What it is: the push service, behind a queue. It sends "wake up" to APNs/FCM for offline devices; many messages become one notification (collapse).' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 90, y: 460, w: 130, kind: 'edge', info: 'What it is: cache servers near users. Everyone in a group opens the same encrypted file, so it comes from storage only once per city. (General industry approach; WhatsApp has not published details.)' },
        { id: 'apns', label: 'APNs / FCM', sub: 'Apple / Google', x: 270, y: 460, w: 130, kind: 'net', info: 'What it is: the push services of Apple and Google. Not under our control; a notification is only a hint, sync gives the guarantee.' },
        { id: 'gwb', label: 'Gateway B', sub: 'WebSockets', x: 450, y: 460, w: 130, kind: 'server', info: 'What it is: Aman\'s connection gateway. It writes frames from the chat/group service onto Aman\'s open WebSocket, and sends Aman\'s receipts back.' },
        { id: 'aman', label: 'Aman (app)', sub: 'receiver', x: 270, y: 590, w: 130, kind: 'client', info: 'What it is: the receiver\'s phone. It opens the message and sends delivered and read receipts; if it was offline, it syncs from the inbox as soon as the app opens.' },
      ],
      edges: [
        { a: 'riya', b: 'lb', n: 1 },
        { a: 'lb', b: 'gwa' },
        { a: 'gwa', b: 'chat', n: 2 },
        { a: 'gwa', b: 'grp' },
        { a: 'chat', b: 'store', n: 3 },
        { a: 'chat', b: 'reg', label: 'lookup' },
        { a: 'grp', b: 'reg', dashed: true },
        { a: 'chat', b: 'gwb', n: 4 },
        { a: 'grp', b: 'gwb' },
        { a: 'gwb', b: 'aman', n: 5 },
        { a: 'aman', b: 'gwb', kind: 'evt', via: [[400, 560]], label: 'receipts' },
        { a: 'chat', b: 'inbox', label: 'offline' },
        { a: 'chat', b: 'push', kind: 'evt' },
        { a: 'grp', b: 'push', kind: 'evt' },
        { a: 'push', b: 'apns', kind: 'evt' },
        { a: 'apns', b: 'aman', kind: 'evt' },
        { a: 'riya', b: 'media' },
        { a: 'media', b: 'blob', label: 'signed URL' },
        { a: 'blob', b: 'cdn' },
        { a: 'cdn', b: 'aman' },
      ],
      paths: [
        { name: '1:1 message', text: 'Riya → LB → Gateway A → chat service → saved in the store (✓) → Aman\'s gateway from the registry → Gateway B → Aman (✓✓), then a read receipt (blue).', go: ['riya>lb>gwa>chat>store', 'chat>reg', 'chat>gwb>aman'] },
        { name: 'Offline user', text: 'Aman is not in the registry: the message goes to the offline inbox (✓), push service → APNs/FCM → notification. When the app opens: sync, ✓✓, and delete from the inbox.', go: ['riya>lb>gwa>chat>inbox', 'chat>push>apns>aman'] },
        { name: 'Group message', text: 'One Sender Key ciphertext → group service → members\' gateways from the registry → every online device; offline members get a push. ✓✓ when receipts from everyone have arrived.', go: ['riya>lb>gwa>grp>reg', 'grp>gwb>aman', 'grp>push>apns>aman'] },
        { name: 'Media', text: 'The phone encrypts the file, gets a signed URL from the media service and uploads to the blob store; the chat carries only the pointer + key. Aman fetches the file from the CDN.', go: ['riya>media>blob>cdn>aman'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Phones stay connected to <strong>gateways</strong> through a <strong>WebSocket</strong>; the gateways' only job is to hold connections.</li>
      <li>The <strong>registry</strong> tells who is on which gateway; TTL + heartbeat remove stale entries.</li>
      <li>The rule: <strong>save first, then ✓, then deliver</strong>. client_msg_id stops duplicates on retry.</li>
      <li>Messages are <strong>partitioned by conversation</strong>, with time-ordered IDs and time buckets (Discord).</li>
      <li>Ticks are a <strong>state machine</strong>: they only move forward; in a group, the member furthest behind decides.</li>
      <li>Offline: <strong>keep it in the inbox, push is only a bell, sync is the real delivery</strong>; it expires at ~30 days.</li>
      <li>Groups: one ciphertext with a <strong>Sender Key</strong>, server-side fan-out; a size limit is necessary.</li>
      <li>Media takes a separate road: <strong>blob store + CDN</strong>, the chat carries only a pointer. E2EE: the server is a postman and cannot read.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Persistent WebSockets: delivery in under a second, server push', 'Save first, deliver later: no message is lost', 'Partition by conversation: chat history in one read', 'Server-side fan-out + Sender Keys: saves the phone\'s data', 'Media on a separate road: the chat pipe never blocks', 'E2EE: messages stay safe even if the server is breached'], costs: ['Gateways hold state: a crash causes a reconnect storm', 'The registry is one more part that can go stale', 'Receipts make traffic 2-3 times bigger', 'Big groups are expensive: a size limit is needed', 'E2EE: server-side search, spam filtering and backups are hard', 'Push notifications are in Apple\'s and Google\'s hands'] },

    { type: 'think', questions: [
      { q: 'Riya has 3 devices (phone, laptop, tablet), Aman has 2. Riya sends a 1:1 message. With multi-device client fan-out, how many encrypted copies are made, and why?', a: 'Aman\'s 2 devices + Riya\'s own 2 other devices = 4 copies (the sending phone does not need its own copy). Every device has its own identity key, so each one gets a copy encrypted with a separate pairwise session. That is why there is a limit on linked devices.' },
      { q: 'In a group of 1,000 members, one member sends 5 messages every second (spam). What will overheat, and what will you do?', a: 'Each message means ~1,000 × devices deliveries and ~2,000 receipts. The group service, registry lookups, gateways and push are all under pressure. Use a per-user rate limit (<a href="#/rate-limiting">rate limiting</a>), send fan-out through a queue, collapse notifications, and add admin controls (only admins can post).' },
      { q: 'You need a "message search" feature, but the chat is E2EE. What are the options?', a: 'The server cannot read the content, so search on the phone with a local index (like WhatsApp). If you need server-side search, you must give up E2EE (like Slack/Discord). This is a product decision, not only an engineering one.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'When should Riya get one grey tick (✓)?', options: ['When Aman\'s phone takes the message', 'When the server saves the message in the durable store', 'When Riya presses send'], answer: 1, explain: 'Grey ✓ = safe on the server. That is why we save first, then ack. Delivered (✓✓) comes from the receipt of the receiver\'s phone.' },
      { q: 'The best partition key for chat messages?', options: ['user_id of sender', 'conversation / channel id (+ time bucket)', 'Random hash of message_id'], answer: 1, explain: 'The most common query is "the latest 50 of this chat". With partition = conversation, it is a sorted read from one partition. The bucket stops the partition from growing forever (Discord).' },
      { q: 'Aman\'s phone is off. The push notification was dropped. What happens to the message?', options: ['It is lost', 'It is in the pending store; it arrives by sync as soon as the app opens', 'Riya has to send it again'], answer: 1, explain: 'A push is only a "wake up" hint. The store + sync give the guarantee.' },
      { q: 'What is the benefit of Sender Keys in a WhatsApp group?', options: ['The server can read the message', 'The sender uploads one single ciphertext, and the server fans it out to everyone', 'Encryption is switched off in the group'], answer: 1, explain: 'Send the Sender Key to each member once, pairwise; after that, every message is one copy, fanned out by the server, and E2EE still holds.' },
      { q: 'The "read" receipt arrived before "delivered". What is the correct behaviour?', options: ['Ignore the read', 'Set the state to read; ignore the delivered that comes later', 'Return an error'], answer: 1, explain: 'The state machine is monotonic: read also means delivered. Receipts that would move backwards, or duplicates, are ignored.' },
    ]},
    { type: 'sources', note: 'WhatsApp\'s architecture numbers come from old talks and posts (2012-2014); the year is given wherever possible. Security details come from the latest whitepaper.', items: [
      { title: 'WhatsApp Encryption Overview (Technical white paper, version 9)', publisher: 'WhatsApp / Meta', official: true, year: 2026, url: 'https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf', used: 'Identity/Signed/One-Time Pre Keys, client-fanout per device, Sender Keys with server-side fan-out, member leave → keys reset, media encryption (AES-256-CBC + HMAC, blob store, pointer + hash), Noise Pipes transport.' },
      { title: 'How WhatsApp enables multi-device capability', publisher: 'Engineering at Meta', official: true, year: 2021, url: 'https://engineering.fb.com/2021/07/14/security/whatsapp-multi-device/', used: 'Up to 4 companion devices, per-device identity keys, client-fanout N copies, history sync to new device.' },
      { title: '1 million is so 2011', publisher: 'WhatsApp blog', official: true, year: 2012, url: 'https://blog.whatsapp.com/1-million-is-so-2011', used: '2M+ TCP connections on one FreeBSD server running Erlang.' },
      { title: 'The WhatsApp Architecture Facebook Bought For $19 Billion', publisher: 'High Scalability (summary of Rick Reed, Erlang Factory 2014)', year: 2014, url: 'https://highscalability.com/the-whatsapp-architecture-facebook-bought-for-19-billion/', used: 'Erlang + FreeBSD, ejabberd origin, ~50B messages/day, messages queued until client accepts then removed, media via separate HTTP servers.' },
      { title: 'WhatsApp Privacy Policy', publisher: 'WhatsApp', official: true, url: 'https://www.whatsapp.com/legal/privacy-policy', used: 'Delivered messages removed from servers; undelivered kept encrypted up to 30 days.' },
      { title: 'About read receipts (Help Center)', publisher: 'WhatsApp', official: true, url: 'https://faq.whatsapp.com/665923838265756', used: 'Meaning of ✓, ✓✓, blue ✓✓; group rules (all participants); turning off read receipts is mutual and not applied to groups.' },
      { title: 'How Discord Stores Billions of Messages', publisher: 'Discord blog', official: true, year: 2017, url: 'https://discord.com/blog/how-discord-stores-billions-of-messages', used: 'MongoDB → Cassandra, ((channel_id, bucket), message_id) key, Snowflake IDs, ~10-day buckets to keep partitions < 100 MB, random reads for small servers.' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord blog', official: true, year: 2023, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: '177 Cassandra nodes → 72 ScyllaDB nodes (2022), hot partitions, GC pauses, Rust data services, request coalescing, consistent-hash routing by channel, p99 improvements.' },
      { title: 'Real-time Messaging', publisher: 'Slack Engineering', official: true, year: 2023, url: 'https://slack.engineering/real-time-messaging/', used: 'Gateway, Channel (consistent hashing), Admin and Presence servers; persist via API then broadcast; ~500 ms global delivery.' },
    ]},
  ],
});
