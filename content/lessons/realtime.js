Lesson.register({
  id: 'realtime',
  title: 'Polling, SSE, WebSockets, webhooks',
  minutes: 35,
  summary: `HTTP mein client poochhta hai, server jawab deta hai. Server khud se bol hi nahi sakta. To chat message, live score, AI ka word-by-word answer, ya "payment ho gaya" user tak turant kaise pahunche? Short polling, long polling, SSE, WebSockets, webhooks aur WebRTC, aur lakhon connections ko sambhalne ke liye gateways, registry, heartbeats aur reconnection.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Web ka normal niyam: browser poochhta hai, server jawab deta hai. Server khud se kuch nahi bol sakta.<br>Lekin chat, live score, ya AI ka jawab turant dikhna chahiye, bina refresh dabaye.<br>Iske chhe tareeke hain: baar baar poochho, poochh ke ruko, ek line khuli rakho jisme server bolta rahe, dono taraf ki line khuli rakho, server doosre server ko khud bataye, ya do users seedha ek doosre se baat karein.<br>Is lesson mein har tareeka timeline pe chala ke dekhoge, aur lakhon khuli lines ko sambhalna bhi seekhoge.` },
    { type: 'h2', text: 'Problem: server pehle nahi bol sakta' },
    { type: 'p', html: `xyz.com pe ab chat feature aa raha hai. Aman ne Riya ko message bheja. Message server tak pahunch gaya, database mein save bhi ho gaya. Ab Riya ki screen pe kaise aaye?` },
    { type: 'p', html: `Normal HTTP ka niyam: <strong>client request bhejta hai, server response deta hai, baat khatam</strong>. Server ke paas Riya ke browser ko "khud se" kuch bhejne ka koi raasta nahi, kyunki Riya ne kuch poocha hi nahi. Pichhle lesson mein video processing ke baad "video ready" batane ka bhi yahi sawaal tha. Is lesson mein iske chhe jawab hain, sasta se mehnga.` },
    { type: 'callout', tone: 'term', title: 'Real-time', html: `<strong>Ye kya hai:</strong> update hote hi (kuch sau milliseconds mein) user ko dikhe, bina page refresh ke. Chat, live cricket score, driver ki location, notifications, ChatGPT/Claude ka word-by-word jawab.<br><strong>Kyun chahiye:</strong> 5 second der se aaya chat message "live" nahi lagta.<br><strong>Iske bina:</strong> user baar baar refresh dabata hai.<br>Har jagah sawaal same: <em>server → client update kaise pahunchaye?</em>` },
    { type: 'callout', tone: 'term', title: 'Persistent connection', html: `<strong>Ye kya hai:</strong> ek network connection jo kaam ke baad band nahi hota, khula rehta hai (minutes ya ghante). Jaise phone call jo kaata nahi, chup chaap chalu hai.<br><strong>Kyun chahiye:</strong> line pehle se khuli ho to server jab chahe bol sakta hai, har baar naya connection banane ka kharcha nahi.<br><strong>Iske bina:</strong> har update ke liye client ko naya sawaal bhejna padta hai.<br><strong>Keemat:</strong> har khuli line server ki thodi memory leti hai. 10 lakh users = 10 lakh khuli lines.` },

    { type: 'h2', text: 'Pehle chaar tareeke, ek ek card' },
    { type: 'callout', tone: 'term', title: 'Short polling', html: `<strong>Ye kya hai:</strong> client har kuch second (maan lo har 5 s) normal request bhejta hai: "kuch naya?" Zyadatar jawab: "nahi".<br><strong>Kyun chahiye:</strong> sabse simple. Koi khaas server nahi, normal HTTP, CDN se cache bhi ho sakta hai.<br><strong>Iske bina (yaani dikkat):</strong> zyadatar requests bekaar, aur update average aadha interval der se dikhta hai (5 s poll = ~2.5 s der).<br><strong>Example:</strong> "report ready hui?" har 10 s check karna.` },
    { type: 'callout', tone: 'term', title: 'Long polling', html: `<strong>Ye kya hai:</strong> client poochhta hai, aur server <strong>jawab rok ke</strong> rakhta hai jab tak kuch naya na aaye (ya ~30 s ka timeout). Jawab milte hi client turant agla sawaal bhejta hai.<br><strong>Kyun chahiye:</strong> update aate hi turant pahunchta hai, aur khaali jawab bahut kam. Phir bhi plain HTTP hai, purane proxies mein bhi chalta hai.<br><strong>Iske bina (yaani dikkat):</strong> har update ke baad ek nayi request, aur server pe har user ki ek ruki hui request.` },
    { type: 'callout', tone: 'term', title: 'SSE (Server-Sent Events)', html: `<strong>Ye kya hai:</strong> ek HTTP response jo khatam hi nahi hota. Server usme events likhta jaata hai: <code>id:</code>, <code>event:</code>, <code>data:</code> lines. Sirf <strong>server → client</strong>. Browser ka built-in <code>EventSource</code> toot-ne pe khud reconnect karta hai aur <code>Last-Event-ID</code> bhej ke "yahan se aage do" bolta hai.<br><strong>Kyun chahiye:</strong> ek-tarfa stream ke liye sabse aasaan persistent raasta, plain HTTP pe. ChatGPT/Claude jaise apps jawab ke tokens aise hi stream karte hain.<br><strong>Iske bina:</strong> ek-tarfa updates ke liye bhi WebSocket ka poora jhanjhat.` },
    { type: 'callout', tone: 'term', title: 'WebSocket', html: `<strong>Ye kya hai:</strong> HTTP request se shuru hoke (<code>Upgrade</code> → <code>101 Switching Protocols</code>) ek persistent TCP connection jisme <strong>dono</strong> taraf se kabhi bhi chhote <strong>frames</strong> (data ke tukde) ja sakte hain (RFC 6455). Heartbeat ke liye ping/pong frames built-in.<br><strong>Kyun chahiye:</strong> chat, games, live cursors: dono taraf se baar baar, kam der mein.<br><strong>Iske bina:</strong> client ko har bhejne pe naya HTTP request, aur server push ke liye alag raasta.<br><strong>Dhyaan:</strong> reconnect aur "kahan se resume karein" tumhe khud likhna padta hai.` },
    { type: 'h2', text: 'Chaar tareeke, chala ke dekho' },
    { type: 'p', html: `Aman message bhejta hai, Riya ko chahiye. Har chip ek technique hai. Dhyaan do: kitni requests bekaar gayin, aur message kitni der baad pahuncha.` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'a', label: 'Riya ka browser', sub: 'receiver', x: 100, y: 165, w: 150, kind: 'client', info: 'Ye kya hai: Riya ka browser, yahan receiver. Riya ko naye messages chahiye. Technique ke hisaab se ye ya to baar baar poochhta hai (polling) ya ek connection khula rakhta hai (SSE, WebSocket).' },
        { id: 'srv', label: 'xyz.com server', sub: 'chat API', x: 360, y: 165, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ka chat server. Persistent connections (SSE/WebSocket) mein har connected user ka ek khula connection is server pe rehta hai. Isliye ye ab "stateless" nahi raha: isse aage gateways wale hisse mein dekhenge.' },
        { id: 'aman', label: 'Aman', sub: 'sender', x: 610, y: 60, w: 140, kind: 'client', info: 'Ye kya hai: Aman ka app, message bhejne wala. Uska message server pe aata hai aur DB mein save hota hai.' },
        { id: 'db', label: 'Messages DB', x: 610, y: 265, w: 150, kind: 'data', info: 'Ye kya hai: messages ka database. Har message permanently yahan. Real-time delivery sirf "jaldi dikhane" ka raasta hai; asli record DB mein hai. Isliye connection toote to bhi message kho nahi jaata.' },
      ],
      edges: [{ a: 'a', b: 'srv' }, { a: 'srv', b: 'aman' }, { a: 'srv', b: 'db' }],
      scenarios: [
        { name: 'Short polling', intro: 'Riya ka browser har 3 second poochhta hai: "kuch naya?"', steps: [
          { title: 'Poll 1: kuch nahi', go: ['a>srv', 'res:srv>a'], text: 'Normal HTTP request. Jawab khaali. Ek bekaar request.', msg: 'GET /messages?after=5011   →  200 []' },
          { title: 'Poll 2: phir kuch nahi', go: ['a>srv', 'res:srv>a'], text: 'Phir bekaar. Har request mein headers, auth check, DB query: sab ka kharcha.', msg: 'GET /messages?after=5011   →  200 []' },
          { title: 'Aman ne message bheja', go: ['aman>srv>db', 'res:srv>aman'], text: 'Message save ho gaya. Lekin Riya ko abhi pata nahi; agla poll aane tak wait.', after: { db: { sub: 'msg 5012 saved' } } },
          { title: 'Poll 3: mil gaya', go: ['a>srv>db', 'res:db>srv>a'], text: 'Agle poll pe message aaya. Average delay = poll interval ka aadha (yahan ~1.5 s). Delay kam karna hai to zyada polls = zyada bekaar requests.', after: { a: { state: 'ok', sub: 'got 5012 (late)' } }, msg: 'GET /messages?after=5011   →  200 [{ id: 5012, text: "hi" }]' },
        ]},
        { name: 'Long polling', intro: 'Riya poochhti hai, aur server tab tak jawab rokta hai jab tak kuch naya na aaye (ya timeout).', steps: [
          { title: 'Request aayi, server ruk gaya', go: 'a>srv', set: { srv: { state: 'hot', sub: 'holding request...' } }, text: 'Server turant khaali jawab nahi deta. Request ko khula rakhta hai, maan lo 30 second tak.', msg: 'GET /messages/poll?after=5011   (server holds)' },
          { title: 'Aman ka message', go: ['aman>srv>db'], text: 'Message aate hi server ke paas Riya ki ruki hui request ka jawab tayyar hai.' },
          { title: 'Turant jawab', go: 'res:srv>a', after: { a: { state: 'ok', sub: 'got 5012 (fast)' }, srv: { state: '' } }, text: 'Delay lagbhag zero, aur koi bekaar request nahi.', msg: '200 [{ id: 5012, text: "hi" }]' },
          { title: 'Turant nayi request', go: 'a>srv', set: { srv: { state: 'hot', sub: 'holding again' } }, text: 'Jawab milte hi browser agla long poll bhej deta hai. Kuch naya na aaye to 30 s baad server khaali jawab (jaise 204) deta hai aur client phir poochhta hai. Kamzori: har message ke baad ek nayi HTTP request, aur server pe har user ki ek request khuli.' },
        ]},
        { name: 'SSE', intro: 'Server-Sent Events: ek HTTP response jo khatam hi nahi hota. Server usme events likhta jaata hai.', steps: [
          { title: 'Stream kholo', go: ['a>srv', 'res:srv>a'], text: 'Browser ka built-in <code>EventSource</code> ek normal GET bhejta hai. Server <code>text/event-stream</code> ke saath jawab shuru karta hai aur connection khula chhod deta hai.', msg: 'GET /stream   Accept: text/event-stream\n←  200 OK\n   Content-Type: text/event-stream' },
          { title: 'Aman ka message, server push', go: ['aman>srv>db', 'res:srv>a'], text: 'Server usi khule response mein ek event likh deta hai. Har event ka <code>id</code> hota hai.', after: { a: { state: 'ok', sub: 'event 5012' } }, msg: 'id: 5012\nevent: message\ndata: {"from":"aman","text":"hi"}\n' },
          { title: 'Connection toota', go: 'lost:srv>a', set: { a: { state: 'warn', sub: 'disconnected' } }, text: 'Riya ki train tunnel mein gayi. Is beech messages 5013, 5014 aaye.', after: { db: { sub: '5013, 5014 saved' } } },
          { title: 'Auto reconnect + resume', go: ['a>srv>db', 'res:db>srv>a'], text: 'EventSource <strong>khud reconnect</strong> karta hai aur <code>Last-Event-ID: 5012</code> header bhejta hai. Server DB se 5012 ke baad wale messages bhej deta hai. Kuch nahi chhoota. (Server <code>retry:</code> field se reconnect delay bhi bata sakta hai.)', after: { a: { state: 'ok', sub: 'caught up 5013-14' } }, msg: 'GET /stream   Last-Event-ID: 5012\n←  id: 5013 ...   id: 5014 ...' },
        ]},
        { name: 'WebSocket', intro: 'Ek persistent, do-tarfa (full-duplex) connection.', steps: [
          { title: 'HTTP se upgrade', go: ['a>srv', 'res:srv>a'], text: 'Shuruaat ek HTTP request se hoti hai jo "protocol badlo" maangti hai. Server <code>101 Switching Protocols</code> deta hai. Ab ye TCP connection HTTP nahi, WebSocket frames ke liye hai.', msg: 'GET /chat  Upgrade: websocket\n          Sec-WebSocket-Key: dGhlIHNhbXBsZQ==\n←  101 Switching Protocols\n   Sec-WebSocket-Accept: s3pPLMBiTxaQ9k...' },
          { title: 'Riya bhi bhejti hai', go: 'a>srv', text: 'Same connection pe client se server bhi message. Har baar naye headers/HTTP request ka kharcha nahi, bas chhota sa frame.', msg: 'frame → { "type": "typing", "to": "aman" }' },
          { title: 'Server push', go: ['aman>srv>db', 'res:srv>a'], text: 'Aman ka message usi connection pe Riya tak, ~ek network trip mein.', after: { a: { state: 'ok', sub: 'got 5012 instantly' } }, msg: 'frame ← { "id": 5012, "from": "aman", "text": "hi" }' },
          { title: 'Heartbeat: ping / pong', go: ['srv>a', 'res:a>srv'], text: 'Kuch der chup rahe to beech ke proxies aur routers idle connection kaat dete hain, aur dead connection ka pata bhi nahi chalta. Isliye periodic <strong>ping</strong>, jawab mein <strong>pong</strong>. Pong na aaye = connection mara hua, band karo.', msg: 'PING →   ← PONG' },
        ]},
      ],
    },

    { type: 'h2', text: 'Simulator: kaunsa tareeka kitna mehnga?' },
    { type: 'p', html: `N users hain. Har user ke liye server ke paas har X second mein ek naya update aata hai. Short polling har P second poll karta hai. Long polling ka timeout 30 second. Dekho requests per second, bekaar requests, average delay, aur khule connections.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Users online (N)</label><input class="rt-n" type="number" value="1000000" min="1" step="1000"></div>
          <div><label>Naya update har X sec: <strong class="rt-vx"></strong></label><input class="rt-x" type="range" min="1" max="300" step="1" value="30"></div>
          <div><label>Short poll interval P sec: <strong class="rt-vp"></strong></label><input class="rt-p" type="range" min="1" max="60" step="1" value="5"></div>
        </div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;font:14px var(--f-body);color:var(--ink)">
          <thead><tr style="text-align:left;color:var(--ink-3);font-size:12px"><th style="padding:6px">Tareeka</th><th style="padding:6px">HTTP requests/s</th><th style="padding:6px">Bekaar</th><th style="padding:6px">Avg delay</th><th style="padding:6px">Khule connections</th></tr></thead>
          <tbody class="rt-body"></tbody></table></div>
        <div class="stats">
          <div class="stat"><span>Gateways (100k conn each)</span><strong class="rt-gw"></strong></div>
          <div class="stat"><span>Short polling ka bekaar hissa</span><strong class="rt-waste"></strong></div>
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
          ['Short polling', f(shortReq), f(shortWaste), sec(P / 2), '— (har poll alag)'],
          ['Long polling', f(lpReq), f(lpWaste), sec(LAT), f(N) + ' (ruki requests)'],
          ['SSE', '≈ 0 (sirf connect pe)', '0 (+' + f(N / 15) + ' tiny keep-alive/s)', sec(LAT), f(N)],
          ['WebSocket', '≈ 0 (sirf connect pe)', '0 (+' + f(N / 30) + ' ping/s)', sec(LAT), f(N)],
        ];
        $('.rt-body').innerHTML = rows.map(r => '<tr style="border-top:1px solid var(--line)">' + r.map((c, i) => `<td style="padding:6px;${i ? 'font-family:var(--f-mono);font-size:13px' : 'font-weight:600'}">${c}</td>`).join('') + '</tr>').join('');
        $('.rt-gw').textContent = Math.ceil(N / PER_GW).toLocaleString('en-IN');
        $('.rt-waste').textContent = Math.round((1 - useful) * 100) + '%';
        $('.rt-note').textContent = `SSE/WebSocket pe server ${f(push)} updates/s push karta hai, bina kisi poll ke, ~${LAT} s delay ke saath. Short polling same updates ke liye ${f(shortReq)} requests/s karta hai, jinme ${Math.round((1 - useful) * 100)}% khaali, aur update average ${(P / 2).toFixed(1)} s der se dikhta hai. Persistent connections ki keemat: ${f(N)} connections hamesha khule, yaani ~${Math.ceil(N / PER_GW)} gateway servers (roadmap ka thumb rule: 100k connections per gateway). Model simple hai: delay mein sirf ek network trip (~${LAT} s) maana, long poll timeout ${T} s.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', html: `Default pe (10 lakh users, update har 30 s, poll har 5 s): short polling <strong>200k requests/s</strong>, jinme ~83% khaali, aur delay ~2.5 s. Long polling ~33k requests/s, koi khaali nahi. SSE/WebSocket: polling zero, sirf ~33k pushes/s, lekin 10 lakh khule connections = ~10 gateways. Ab X ko 1 second karo (multiplayer game jaisa): long polling bhi 10 lakh requests/s pe pahunch jaata hai, aur WebSocket saaf jeet-ta hai. X ko 300 karo (din mein kuch updates): polling ka zyada hissa bekaar, lekin agar wo CDN se cache ho sake to short polling sabse sasta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"WebSocket hamesha best hai." Nahi. Persistent connection ka matlab hai har user ki server pe memory, load balancer pe lambe connections, deploy pe saare connections ka tootna, aur reconnect logic. Agar update har kuch minute mein aata hai, ya sab users ko <em>same</em> data dikhna hai (live score), to CDN ke peeche short polling sasta aur simple hai. Aur agar data sirf server se client jaata hai, SSE kaafi hai.` },

    { type: 'h2', text: 'Webhooks: server se server' },
    { type: 'p', html: `Abhi tak updates server se user tak ja rahe the. Lekin kabhi update ek <strong>doosri company ke server</strong> se aata hai. xyz.com pe creators ka premium subscription hai. Payment Razorpay/Stripe jaisa payment provider karta hai, aur payment pura hone mein seconds se minutes lag sakte hain (bank OTP, UPI approval). Hum provider ko har second poll nahi karna chahte. Isliye hum provider ko ek URL dete hain: "jab kuch ho, is pe POST kar dena".` },
    { type: 'callout', tone: 'term', title: 'Webhook', html: `<strong>Ye kya hai:</strong> ek HTTP callback. Tum kisi service ke paas apna URL register karte ho, aur event hone pe <strong>wo service us URL pe HTTP POST</strong> karti hai. "Reverse API" jaisa: tum unhe call nahi karte, wo tumhe call karte hain.<br><strong>Kyun chahiye:</strong> payment kab poora hoga pata nahi (seconds ya minutes). Har second provider se poochhna (polling) bekaar hai.<br><strong>Iske bina:</strong> ya to lagataar polling, ya user ko "payment hua?" pata hi nahi chalta.<br><strong>Dhyaan:</strong> ye <em>server se server</em> hai. Browser ya phone ka koi public URL nahi hota, to webhook seedha user tak nahi ja sakta.` },
    { type: 'callout', tone: 'term', title: 'Signature (HMAC)', html: `<strong>Ye kya hai:</strong> provider aur hum ek secret share karte hain. Har webhook ke saath provider us secret + body + timestamp se ek code (HMAC-SHA256) banata hai. Hum wahi code khud bana ke milaate hain.<br><strong>Kyun chahiye:</strong> webhook URL public hai; koi bhi nakli "payment ho gaya" bhej sakta hai.<br><strong>Iske bina:</strong> koi bhi muft premium le lega.` },
    { type: 'flow', title: 'Payment webhook', height: 330,
      nodes: [
        { id: 'psp', label: 'Payment provider', sub: 'Stripe / Razorpay', x: 110, y: 150, w: 170, kind: 'server', info: 'Ye kya hai: payment karwane wali company (teesri party). Event hone pe hamare registered URL pe signed POST bhejta hai, aur fail hone pe retry karta hai. Stripe live mode mein exponential backoff ke saath 3 din tak retry karta hai.' },
        { id: 'wh', label: 'Webhook endpoint', sub: 'xyz.com', x: 370, y: 150, w: 170, kind: 'server', info: 'Ye kya hai: hamara public HTTPS URL jo webhooks leta hai. Teen kaam: signature verify, event ID se duplicate check, aur kaam queue mein daal ke turant 2xx. Bhaari kaam yahan nahi.' },
        { id: 'q', label: 'Queue', sub: 'jobs', x: 610, y: 70, w: 130, kind: 'queue', info: 'Ye kya hai: kaam ki queue (Message queues lesson). Asli kaam (subscription activate, email, invoice) queue ke worker karte hain. Webhook endpoint fast rehta hai aur spikes (mahine ki 1 tareekh, saare renewals) absorb ho jaate hain.' },
        { id: 'db', label: 'Orders DB', sub: 'processed events', x: 610, y: 235, w: 150, kind: 'data', info: 'Ye kya hai: orders ka database. Order status aur "kaunsa event ID process ho chuka" ka record. Isi se duplicate deliveries pehchaani jaati hain.' },
        { id: 'att', label: 'Attacker', sub: 'fake POST', x: 370, y: 285, w: 140, kind: 'threat', hidden: true, info: 'Ye kya hai: nakli request bhejne wala hamlavar. URL public hai, to koi bhi us pe POST kar sakta hai. Isliye har webhook ka signature check karna zaroori hai.' },
      ],
      edges: [{ a: 'psp', b: 'wh' }, { a: 'wh', b: 'q' }, { a: 'wh', b: 'db' }, { a: 'q', b: 'db' }, { a: 'att', b: 'wh', id: 'aw', hidden: true }],
      scenarios: [
        { name: 'Payment success', steps: [
          { title: 'Provider POST karta hai', go: 'psp>wh', text: 'Signed request: header mein timestamp + HMAC-SHA256 signature, jo sirf provider aur hum (shared secret) bana sakte hain.', msg: 'POST /webhooks/payments\nStripe-Signature: t=1791090000,v1=5257a8...\n{ "id": "evt_123", "type": "payment_intent.succeeded", ... }' },
          { title: 'Verify + dedupe', go: ['wh>db', 'res:db>wh'], text: 'Signature sahi? Timestamp 5 minute se purana to nahi (replay attack se bachaav)? <code>evt_123</code> pehle process hua? Nahi.', focus: ['wh'] },
          { title: 'Queue mein, turant 200', parallel: true, go: ['wh>q', 'res:wh>psp'], text: 'Kaam queue mein daala aur provider ko turant 200. Agar hum yahin 10 second ka kaam karte, provider timeout maan ke retry karta.', msg: '200 OK' },
          { title: 'Worker kaam karta hai', go: 'evt:q>db', text: 'Subscription ACTIVE, aur evt_123 "processed" mark.', after: { db: { state: 'ok', sub: 'ACTIVE, evt_123 done' } } },
        ]},
        { name: 'Endpoint down: retries', steps: [
          { title: 'Hamara server down', set: { wh: { state: 'down', sub: 'DOWN (deploy)' } }, go: 'lost:psp>wh', text: 'Deploy ke time endpoint ne 503 diya ya connect hi nahi hua.' },
          { title: 'Provider baad mein retry karta hai', text: 'Webhooks at-least-once hote hain. Provider backoff ke saath retry karta hai (Stripe: live mode mein 3 din tak). Isliye thodi der ka downtime chalta hai.', set: { wh: { state: 'ok', sub: 'back up' } }, go: ['psp>wh', 'res:wh>psp'] },
          { title: 'Duplicate delivery', go: ['psp>wh', 'wh>db', 'res:db>wh', 'res:wh>psp'], text: 'Kabhi same event do baar aa jaata hai (pehli baar humne process kar liya tha lekin 200 provider tak nahi pahuncha). Event ID <code>evt_123</code> DB mein "done" hai, to skip, bas 200. Ordering ki bhi guarantee nahi: <code>invoice.paid</code> <code>invoice.created</code> se pehle aa sakta hai.', after: { db: { sub: 'evt_123 seen: skip' } } },
        ]},
        { name: 'Fake webhook', steps: [
          { title: 'Attacker POST karta hai', show: ['att', 'aw'], go: 'att>wh', text: 'Kisi ne hamara webhook URL dhoondh liya aur "payment succeeded" ka nakli event bheja, taaki muft premium mil jaaye.', msg: 'POST /webhooks/payments\n{ "type": "payment_intent.succeeded", "amount": 999 }' },
          { title: 'Signature fail: reject', go: 'bad:wh>att', text: 'Signature secret ke bina ban hi nahi sakta. Mismatch = 400, kuch process nahi. Bina signature check ke ye seedha muft subscription hota.', after: { att: { state: 'down', sub: 'rejected' } }, msg: '400 Bad Request (signature mismatch)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Webhook receiver checklist', html: `• Signature verify (HMAC) + timestamp tolerance (replay attack)<br>• Event ID se dedupe: same event do baar aa sakta hai<br>• Order pe bharosa mat karo; zaroorat ho to provider ki API se latest state fetch karo<br>• Turant 2xx, bhaari kaam queue mein<br>• Webhook miss ho jaaye to bhi system theek ho jaaye: periodic <strong>reconciliation</strong> job jo provider se "pichhle din ke saare payments" milaata hai<br>• Agar <em>tum</em> webhooks bhej rahe ho: retries with backoff, signatures, delivery logs, aur customer ko "resend" ka button.` },

    { type: 'h2', text: 'WebRTC: browser se browser' },
    { type: 'p', html: `Ab xyz.com pe creators apne fans se video call karna chahte hain. Agar har video frame hamare server se hoke jaaye to bandwidth ka bill bhaari aur latency zyada. Behtar: Riya ka browser seedha Aman ke browser ko media bheje. Iske liye <strong>WebRTC</strong> hai.` },
    { type: 'callout', tone: 'term', title: 'WebRTC', html: `<strong>Ye kya hai:</strong> browsers/apps ke beech <strong>seedha</strong> (peer-to-peer) audio, video aur data bhejne ki technology, aam taur pe UDP pe (live video mein late packet ka koi kaam nahi; TCP vs UDP lesson yaad karo).<br><strong>Kyun chahiye:</strong> video bahut bhaari hai. Har frame server se hoke jaaye to bandwidth ka bill bada aur der zyada.<br><strong>Iske bina:</strong> har call ka saara video hamare servers se, mehenga aur dheema.` },
    { type: 'callout', tone: 'term', title: 'NAT', html: `<strong>Ye kya hai:</strong> ghar ya office ka router ek hi public IP ke peeche kai devices chhupa deta hai (Network Address Translation). Tumhare laptop ko apna "bahar wala" address khud nahi pata.<br><strong>Kyun dikkat:</strong> do laptops ek doosre ko seedha packet bhejna chahein, to pehle ye pata hona chahiye ki bahar se wo kaise dikhte hain, aur router un packets ko andar aane de.<br><strong>Isliye:</strong> STUN, TURN aur ICE bane.` },
    { type: 'callout', tone: 'term', title: 'Signaling, STUN, TURN, ICE', html: `<strong>Ye kya hai:</strong> call jodne ke chaar madadgaar. <strong>Signaling</strong>: call se pehle dono peers apni details (codecs, addresses) ek doosre ko bhejte hain; WebRTC nahi batata kaise, aam taur pe ek WebSocket server. <strong>STUN</strong>: chhota server jo batata hai "bahar se tumhara public IP:port ye dikhta hai". <strong>TURN</strong>: jab seedha raasta bilkul na bane (strict firewall), to relay server jiske through poora media jaata hai. <strong>ICE</strong>: wo process jo saare possible raaste try karke best chunta hai.<br><strong>Kyun chahiye:</strong> NAT aur firewalls ke peeche bhi call lag sake.<br><strong>Iske bina:</strong> zyadatar office/mobile networks pe call hi nahi judegi.` },
    { type: 'flow', title: 'Ek 1:1 video call', height: 330,
      nodes: [
        { id: 'a', label: 'Riya (call)', sub: 'browser', x: 100, y: 170, w: 140, kind: 'client', info: 'Ye kya hai: Riya ka browser, call karne wali. Apna camera/mic stream aur network candidates signaling se bhejti hai.' },
        { id: 'b', label: 'Aman (call)', sub: 'browser', x: 620, y: 170, w: 140, kind: 'client', info: 'Ye kya hai: Aman ka browser, jise call aayi. Riya ke offer ka answer deta hai.' },
        { id: 'sig', label: 'Signaling server', sub: 'WebSocket', x: 360, y: 55, w: 170, kind: 'server', info: 'Ye kya hai: hamara chhota server, sirf "milwaane" ka kaam: offer/answer (SDP) aur ICE candidates idhar se udhar. Media isse hoke nahi jaata.' },
        { id: 'turn', label: 'STUN / TURN', sub: 'NAT helper / relay', x: 360, y: 285, w: 160, kind: 'net', info: 'Ye kya hai: NAT ke madadgaar servers. STUN public address batata hai (sasta, tiny requests). TURN poora media relay karta hai jab direct raasta na mile; ye bandwidth ka asli kharcha hai.' },
      ],
      edges: [{ a: 'a', b: 'sig' }, { a: 'b', b: 'sig' }, { a: 'a', b: 'turn' }, { a: 'b', b: 'turn' }, { a: 'a', b: 'b', id: 'ab', dashed: true }],
      scenarios: [
        { name: 'Direct P2P', steps: [
          { title: 'Public address pata karo (STUN)', go: ['a>turn', 'res:turn>a'], text: 'Riya ka laptop router ke peeche hai. STUN batata hai ki bahar se wo kaisa dikhta hai.', msg: 'STUN: your public address is 49.36.x.x:52100' },
          { title: 'Offer → Answer (signaling)', go: ['a>sig>b', 'res:b>sig>a'], text: 'Riya ka offer (kaunse codecs, kaunse addresses) signaling server se Aman tak, Aman ka answer wapas.', msg: 'offer (SDP) →\n← answer (SDP)\n+ ICE candidates dono taraf' },
          { title: 'Seedha media', parallel: true, go: ['evt:a>b', 'evt:b>a'], text: 'ICE ne direct raasta dhoondh liya. Video ab browser se browser, hamare server pe zero media bandwidth.', after: { a: { state: 'ok', sub: 'in call' }, b: { state: 'ok', sub: 'in call' } } },
        ]},
        { name: 'NAT blocks: TURN relay', steps: [
          { title: 'Signaling ho gaya', go: ['a>sig>b', 'res:b>sig>a'], text: 'Offer/answer normal.' },
          { title: 'Direct raasta fail', go: 'lost:a>b', text: 'Aman ek strict corporate firewall ke peeche hai. Direct UDP packets nahi pahunchte.' },
          { title: 'TURN se relay', parallel: true, go: ['evt:a>turn>b', 'evt:b>turn>a'], text: 'Media TURN server se hoke jaata hai. Call chalti hai, lekin ab har byte hamare (ya hamare provider ke) server se: bandwidth ka bill. Isliye TURN capacity plan karni padti hai.', after: { turn: { state: 'hot', sub: 'relaying media' }, a: { state: 'ok' }, b: { state: 'ok' } } },
        ]},
        { name: 'Signaling server down', steps: [
          { title: 'Signaling gira', set: { sig: { state: 'down', sub: 'DOWN' } }, focus: ['sig'], text: 'Signaling server crash.' },
          { title: 'Chalti call chalti rahegi', parallel: true, go: ['evt:a>b', 'evt:b>a'], text: 'Media signaling se hoke jaata hi nahi tha, to jo call chal rahi hai wo chalti rahi.' },
          { title: 'Nayi call nahi lagegi', go: 'lost:a>sig', text: 'Lekin nayi call shuru karne ke liye offer/answer exchange nahi ho sakta. Signaling bhi redundant chahiye. (Group calls mein aam taur pe ek server SFU hota hai jo streams forward karta hai; wo is lesson ke scope se bahar hai.)' },
        ]},
      ],
    },

    { type: 'h2', text: 'Timeline lab: chhe tareeke, ek kahani' },
    { type: 'p', html: `Ek hi kahani har tareeke pe: 60 second mein server ke paas 4 updates aate hain (7 s, 9 s, 31 s, 52 s pe, laal diamond). Hara gola = update user tak pahuncha. Upar wali line client, neeche server. Neeli line = request, hari = data wala jawab, dhoosar dashed = khaali jawab, peela = server pe ruki request, halka band = khula connection. Network ka ek taraf ka safar 0.1 s maana hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rl-modes" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="rl-pbox" style="margin-top:10px"><label>Poll interval P: <strong class="rl-vp"></strong></label><input class="rl-p" type="range" min="1" max="15" step="1" value="5"></div>
        <label class="rl-tbox" style="display:block;margin-top:10px;font:14px var(--f-body);color:var(--ink-2)"><input class="rl-turn" type="checkbox"> Strict firewall: TURN relay se jaana pada</label>
        <svg class="rl-svg" viewBox="0 0 600 200" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Timeline"></svg>
        <div class="stats">
          <div class="stat"><span>HTTP requests (60 s)</span><strong class="rl-o-req"></strong></div>
          <div class="stat"><span>Khaali jawab / fail</span><strong class="rl-o-emp"></strong></div>
          <div class="stat"><span>Avg delay (update → user)</span><strong class="rl-o-lat"></strong></div>
          <div class="stat"><span>Server pe khula connection</span><strong class="rl-o-con"></strong></div>
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
        const lab = rtc ? ['Riya (peer A)', 'Server: signaling / TURN', 'Aman (peer B)'] : hook ? ['Payment provider', 'xyz.com webhook endpoint'] : ['Client (Riya ka app)', 'xyz.com server'];
        let g = `<text x="70" y="${yC - 8}" font-size="12" fill="var(--ink-2)" font-family="var(--f-mono)">${lab[0]}</text><line x1="70" x2="590" y1="${yC}" y2="${yC}" stroke="var(--line-2)"/>
          <text x="70" y="${yS + 22}" font-size="12" fill="var(--ink-2)" font-family="var(--f-mono)">${lab[1]}</text><line x1="70" x2="590" y1="${yS}" y2="${yS}" stroke="var(--line-2)"/>
          <text x="590" y="196" text-anchor="end" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">60 s</text><text x="70" y="196" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">0</text>`;
        if (rtc) g = g.replace(`<text x="70" y="${yS + 22}"`, `<text x="300" y="${yS - 6}"`) + `<text x="70" y="${yB + 16}" font-size="12" fill="var(--ink-2)" font-family="var(--f-mono)">${lab[2]}</text><line x1="70" x2="590" y1="${yB}" y2="${yB}" stroke="var(--line-2)"/>`;
        if (hook) g += `<rect x="${X(DOWN[0])}" y="${yS - 10}" width="${X(DOWN[1]) - X(DOWN[0])}" height="20" fill="var(--red)" opacity="0.15"/><text x="${X(DOWN[0])}" y="${yS + 22}" font-size="11" fill="var(--red)" font-family="var(--f-mono)" dx="60">down (deploy)</text>`;
        if (R.conn) g += `<rect x="${X(R.conn.a)}" y="${yC + 6}" width="${X(R.conn.b) - X(R.conn.a)}" height="${yS - yC - 12}" fill="var(--accent-soft)" opacity="0.7"/><text x="330" y="${(yC + yS) / 2 + 4}" text-anchor="middle" font-size="12" fill="var(--accent-ink)" font-family="var(--f-mono)">${rtc ? 'signaling ka 1 WebSocket' : '1 connection, poore 60 s khula'}</text>`;
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
        el.querySelector('.rl-o-con').textContent = { short: 'nahi', long: '1 ruki request', sse: '1 (ek-tarfa)', ws: '1 (do-tarfa)', hook: 'nahi', rtc: turn ? '1 + media relay' : '1 (sirf signaling)' }[mode];
        const N = {
          short: `${R.nreq} requests, jinme ${R.empty} khaali. Update average ${fmt(R.avg)} der se (sabse bura ${fmt(R.max)}). P chhota karo: delay ghatega, khaali requests badhengi. Bada karo: ulta.`,
          long: `Sirf ${R.nreq} requests, delay ~${fmt(R.avg)}. Server har waqt Riya ki ek request pakad ke baitha hai (peela). ${R.empty} baar ${LPT} s ka timeout hua aur khaali jawab gaya (9 → 31 aur 31 → 52 ke beech lamba sannata).`,
          sse: `1 request se ek lamba response khula, aur chaaron updates ~${fmt(R.avg)} mein. Har 15 s ek chhoti keep-alive line taaki beech ke proxies "ye connection mara hua hai" samajh ke kaat na dein. Client yahan se kuch bhej nahi sakta.`,
          ws: `1 upgrade request, phir ek hi connection pe dono taraf: server ke 4 push (~${fmt(R.avg)}) aur Riya ke 2 "typing" frames (baingani). Ping/pong heartbeat batata hai ki line zinda hai.`,
          hook: `Koi khula connection nahi: har event pe provider ek POST karta hai. 31 s wala event endpoint down hone ki wajah se ${R.fails.length} baar fail hua, phir backoff (1, 2, 4 s) ke baad 38 s pe pahuncha. Isliye webhooks at-least-once hote hain aur receiver ko dedupe karna padta hai.`,
          rtc: turn ? `Firewall ne seedha raasta rok diya, to media TURN server se hoke gaya (peela): delay ~${fmt(R.avg)} aur saara video hamare server ki bandwidth se. Signaling server sirf shuru mein (0-2 s) kaam aaya.` : `Signaling server ne sirf shuru mein offer/answer pahunchaya (0-2 s). Uske baad media seedha Riya → Aman (hare dashed), server ko chhoota bhi nahi. Delay ~${fmt(R.avg)}. "Strict firewall" on karke TURN ka kharcha dekho.`,
        };
        el.querySelector('.rl-note').textContent = N[mode];
      };
      el.querySelectorAll('input').forEach(i => { i.addEventListener('input', run); i.addEventListener('change', run); }); run();
    }},
    { type: 'callout', tone: 'tip', html: `Saar (is 60 s ki kahani mein): short polling P = 5 s pe 13 requests, 10 khaali, delay ~3 s. Long polling 7 requests, 2 khaali (timeouts), delay ~100 ms. SSE aur WebSocket 1 request, delay ~100 ms, lekin connection poore time khula. Webhook mein endpoint down tha to ek event 7 s der se aaya. WebRTC mein media server ko chhoota hi nahi (~50 ms), jab tak TURN na lagana pade.` },

    { type: 'h2', text: 'Har tareeka, ek nazar mein' },
    { type: 'table', head: ['', 'Wire pe kya', 'Kharcha', 'Kab', 'Kab nahi'], rows: [
      ['Short polling', 'Har P sec normal GET', 'Bahut requests, zyada khaali; delay ≈ P/2', 'Updates kam, thoda delay chalta hai, ya response CDN-cacheable (live score JSON)', 'Chat, games: low latency chahiye'],
      ['Long polling', 'GET jo server tab tak rokta hai jab tak data na ho (ya timeout)', 'Har update pe ek nayi request; har user ki ek ruki request', 'Fallback jab persistent connections possible nahi (purane proxies)', 'Bahut frequent updates'],
      ['SSE', 'Ek lamba HTTP response, <code>text/event-stream</code>', 'Ek connection per user; server → client hi', 'Ek-tarfa stream: AI tokens, notifications, live commentary', 'Client ko bhi frequently bhejna ho; binary data'],
      ['WebSocket', '101 upgrade ke baad full-duplex frames', 'Ek connection per user; stateful servers; reconnect khud likho', 'Do-tarfa, frequent, low latency: chat, games, Docs cursors, driver app', 'Kabhi kabhi ke updates (overkill)'],
      ['Webhook', 'Ek server doosre server ko HTTP POST', 'Receiver ko public endpoint, signature check, dedupe', 'Third party ko batana ki kuch hua: payment success', 'Browser/app ko update dena (unka public URL nahi hota)'],
      ['WebRTC', 'Browser se browser, seedha (UDP pe media)', 'Signaling server + STUN/TURN; group calls mein SFU', 'Audio/video calls, screen share', 'Server ko data chahiye ya store karna ho'],
    ]},
    { type: 'callout', tone: 'warn', title: 'SSE aur HTTP/1.1 ki connection limit', html: `HTTP/1.1 pe browser ek domain ke liye sirf thode se (aam taur pe ~6) connections kholta hai. Har tab ka ek SSE stream ek connection kha jaata hai, to bahut saare tabs khulne pe baaki requests atak sakti hain. HTTP/2 mein ek hi connection pe kai streams chalti hain, to ye problem kaafi had tak chali jaati hai. SSE ke saath HTTP/2 use karo.` },

    { type: 'h2', text: 'Lakhon connections: gateways aur registry' },
    { type: 'p', html: `Ab asli scale ki baat. xyz.com chat pe peak pe 10 lakh users online, har ek ka ek WebSocket. Roadmap ka thumb rule: ek gateway ~100k connections, to ~10 gateway servers. Nayi problem: Riya Gateway 1 pe connected hai, Aman Gateway 2 pe. Riya ka message Gateway 1 pe aaya. <strong>Gateway 1 ko kaise pata ki Aman kahan hai?</strong>` },
    { type: 'callout', tone: 'term', title: 'Connection gateway', html: `<strong>Ye kya hai:</strong> servers ka ek alag fleet jinka kaam sirf lakhon persistent connections (WebSocket/SSE) pakad ke rakhna hai: login check (auth), heartbeats, frames padhna/likhna. Business logic inme nahi; wo chat service mein hai.<br><strong>Kyun chahiye:</strong> gateways halke rehte hain, aur chat logic ka naya version deploy karne se users ke connections nahi toot-te.<br><strong>Iske bina:</strong> har chat code deploy pe 10 lakh users ek saath disconnect.` },
    { type: 'callout', tone: 'term', title: 'Registry (user → gateway)', html: `<strong>Ye kya hai:</strong> ek tez shared store (aksar Redis) jisme likha hai "kaun user kis gateway pe hai", jaise <code>aman → gw2</code>. Gateway connect pe entry likhta hai (TTL ke saath), heartbeat pe TTL badhata hai, disconnect pe hatata hai. (<strong>TTL</strong> = entry ki expiry, Caching lesson mein dekha.)<br><strong>Kyun chahiye:</strong> message Riya ke gateway pe aaya, Aman kisi aur gateway pe hai. Kisko bhejein?<br><strong>Iske bina:</strong> har message har gateway ko broadcast: 1,000 gateways pe bahut mehenga.` },
    { type: 'callout', tone: 'term', title: 'Heartbeat', html: `<strong>Ye kya hai:</strong> har kuch second ek chhota "zinda ho?" signal (WebSocket ping/pong, SSE keep-alive line). Kuch heartbeats miss = connection mara hua maano.<br><strong>Kyun chahiye:</strong> network beech se kat jaaye (train tunnel, wifi gaya) to aksar koi "connection band" signal nahi aata. Bina heartbeat ke dono taraf maante rehte hain ki line zinda hai ("zombie" connection). Aur beech ke proxies chup connections ko kaat dete hain.<br><strong>Iske bina:</strong> messages ek mare connection mein daale jaate rahenge, aur registry galat gateway batayegi.` },
    { type: 'callout', tone: 'term', title: 'Reconnect with backoff + jitter', html: `<strong>Ye kya hai:</strong> connection toote to dobara jodo, lekin har fail ke baad wait double karo (1 s, 2 s, 4 s...) aur us wait mein random farak (jitter) daalo. Phir server ko batao "maine message X tak dekha" (resume).<br><strong>Kyun chahiye:</strong> ek gateway gira to uske 100k users ek saath reconnect karenge. Sab ek hi pal pe aaye to baaki gateways bhi gir sakte hain (<strong>thundering herd</strong>).<br><strong>Iske bina:</strong> ek gateway ka girna poore system ka girna ban jaata hai.` },
    { type: 'flow', title: 'Message Riya → Aman, alag gateways', height: 330,
      nodes: [
        { id: 'a', label: 'Riya (app)', x: 80, y: 80, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka chat app. Gateway 1 se WebSocket pe connected.' },
        { id: 'b', label: 'Aman (app)', x: 80, y: 260, w: 120, kind: 'client', info: 'Ye kya hai: Aman ka chat app. Gateway 2 se connected. Har 30 s ping bhejta hai (heartbeat).' },
        { id: 'lb', label: 'L4 LB', sub: 'TCP', x: 250, y: 170, w: 110, kind: 'net', info: 'Ye kya hai: L4 load balancer (LB lesson). Naye connections gateways mein baant-ta hai. Lambe-lambe connections ke liye least-connections achha hai. Ek baar connection bana to wo usi gateway se juda rehta hai.' },
        { id: 'g1', label: 'Gateway 1', sub: 'WebSockets', x: 430, y: 80, w: 140, kind: 'server', meter: true, load: 55, info: 'Ye kya hai: connection gateway server, ~100k connections. Sirf connections sambhalta hai; message aate hi chat service ko de deta hai.' },
        { id: 'g2', label: 'Gateway 2', sub: 'WebSockets', x: 430, y: 260, w: 140, kind: 'server', meter: true, load: 55, info: 'Ye kya hai: doosra gateway server. Iske girne pe iske saare users ek saath reconnect karenge: isliye backoff + jitter.' },
        { id: 'reg', label: 'Registry', sub: 'Redis: user→gw', x: 640, y: 80, w: 140, kind: 'cache', info: 'Ye kya hai: Redis mein user → gateway mapping, TTL ke saath. Heartbeat se TTL refresh. Gateway mar jaaye to uski entries TTL ke baad apne aap expire.' },
        { id: 'msg', label: 'Chat service', sub: 'store + route', x: 640, y: 260, w: 140, kind: 'server', info: 'Ye kya hai: chat ka business logic. Message ko pehle DB mein save karta hai (durability), phir registry se recipient ka gateway dhoondh ke wahan bhejta hai. Bade systems mein ye "bhejna" aksar pub/sub se hota hai: har gateway apna channel subscribe karta hai.' },
      ],
      edges: [{ a: 'a', b: 'lb' }, { a: 'b', b: 'lb' }, { a: 'lb', b: 'g1' }, { a: 'lb', b: 'g2' }, { a: 'g1', b: 'reg' }, { a: 'g2', b: 'reg' }, { a: 'g1', b: 'msg' }, { a: 'g2', b: 'msg' }, { a: 'msg', b: 'reg' }],
      scenarios: [
        { name: 'Connect + register', steps: [
          { title: 'Aman connect karta hai', go: 'b>lb>g2', text: 'WebSocket upgrade, LB ne Gateway 2 diya. Gateway token check karta hai (auth).', msg: 'GET /ws  Upgrade: websocket  Authorization: Bearer ...' },
          { title: 'Registry mein entry', go: 'g2>reg', text: 'Gateway 2 likhta hai: aman → gw2, 60 s TTL. Har heartbeat pe TTL refresh.', after: { reg: { sub: 'aman → gw2' } }, msg: 'SET conn:aman gw2 EX 60' },
          { title: 'Riya bhi', go: ['a>lb>g1', 'g1>reg'], text: 'Riya Gateway 1 pe, entry riya → gw1.', after: { reg: { sub: 'aman→gw2, riya→gw1' } } },
        ]},
        { name: 'Message route', steps: [
          { title: 'Riya bhejti hai', go: 'a>lb>g1', text: 'Message Gateway 1 pe aaya.', msg: '{ "to": "aman", "text": "hi", "client_msg_id": "c-77" }' },
          { title: 'Chat service: save', go: 'g1>msg', text: 'Pehle DB mein save (message ID 5012 mila). Ab agar delivery fail bhi ho, message khoya nahi. client_msg_id se retry pe duplicate nahi banega.' },
          { title: 'Aman kahan hai?', go: ['msg>reg', 'res:reg>msg'], text: 'Registry: aman → gw2.', after: { reg: { state: 'hit' } }, msg: 'GET conn:aman  →  gw2' },
          { title: 'Gateway 2 ke through push', go: 'msg>g2>lb>b', text: 'Gateway 2 ne Aman ke khule WebSocket pe frame likh diya. Aman ka app "delivered" ack bhejta hai, jisse Riya ko double tick.', after: { b: { state: 'ok', sub: 'got 5012' } } },
        ]},
        { name: 'Aman offline', steps: [
          { title: 'Registry mein entry nahi', go: ['a>lb>g1', 'g1>msg', 'msg>reg', 'bad:reg>msg'], text: 'Aman ka app band hai, uski entry TTL se expire ho chuki. Koi gateway nahi.', after: { reg: { state: 'miss', sub: 'aman: (none)' } } },
          { title: 'Store + mobile push', text: 'Message DB mein safe hai. Chat service push notification service (APNs/FCM: Apple aur Google ki phone notification services) ko bolti hai: Aman ke phone pe notification. Ye hamare WebSocket se alag raasta hai.', focus: ['msg'], msg: 'push → APNs/FCM: "Riya: hi"' },
          { title: 'App khulte hi sync', go: ['b>lb>g2', 'g2>msg'], text: 'Aman ne app khola, connect hua, aur bola "mere paas 5011 tak hai". Chat service 5012 aur aage ke messages bhej deti hai.', after: { b: { state: 'ok', sub: 'synced from 5011' } }, msg: '{ "type": "resume", "last_msg_id": 5011 }' },
        ]},
        { name: 'Gateway 2 dies', intro: 'Gateway 2 ka machine achanak gir gaya. Uske 100k users ka kya?', steps: [
          { title: 'Crash', set: { g2: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'lost:g2>lb', text: 'Gateway 2 ke saare connections ek jhatke mein toote.' },
          { title: 'Heartbeat se pata chala', go: 'lost:b>lb', text: 'Aman ke app ka ping ka pong nahi aaya (ya TCP close mila). App maan leti hai: connection mara hua. Heartbeat ke bina "zombie" connection minutes tak zinda lagta.', set: { b: { state: 'warn', sub: 'disconnected' } } },
          { title: 'Is beech ek message aaya', go: ['a>lb>g1', 'g1>msg', 'msg>reg', 'res:reg>msg', 'lost:msg>g2'], text: 'Registry mein abhi bhi purani entry aman → gw2 (TTL baaki). Delivery fail, lekin message DB mein save hai. Kuch nahi khoya, bas der.', after: { reg: { state: 'warn', sub: 'aman → gw2 (stale)' } } },
          { title: 'Reconnect: backoff + jitter', go: 'b>lb>g1', text: '100k apps agar ek hi millisecond pe reconnect karein to Gateway 1 bhi gir jaayega (thundering herd). Isliye har app <strong>random jitter</strong> ke saath, aur fail pe <strong>badhte hue wait</strong> (1 s, 2 s, 4 s...) se reconnect karta hai. Aman Gateway 1 pe aaya.', after: { g1: { load: 85, state: 'hot' } } },
          { title: 'Registry update + resume', go: ['g1>reg', 'b>lb>g1', 'g1>msg', 'res:msg>g1', 'res:g1>lb>b'], text: 'Entry aman → gw1. App bolti hai "last message 5012". Chat service 5013 (jo miss hua tha) bhej deti hai. User ko bas ek second ka "connecting..." dikha.', after: { reg: { state: '', sub: 'aman → gw1' }, b: { state: 'ok', sub: 'resumed from 5012' } }, msg: '{ "type": "resume", "last_msg_id": 5012 }  →  [5013]' },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Reconnect storm lab.</strong> Ek gateway ke 100,000 users ka connection toota. Baaki gateways (aur login check) milke 10,000 naye connections per second hi le sakte hain; usse zyada aaye to handshake fail aur client ko phir try karna padta hai. Do tarah ki failure: gateway process crash (TCP turant band, sab ko usi pal pata) ya network kat gaya (koi signal nahi, sirf heartbeat se pata: 2 ping miss).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rs-f" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="rs-s" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        <div class="rs-hbox" style="margin-top:10px"><label>Heartbeat interval: <strong class="rs-vh"></strong></label><input class="rs-h" type="range" min="5" max="60" step="5" value="30"></div>
        <svg class="rs-svg" viewBox="0 0 600 170" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Reconnect attempts per second"></svg>
        <div class="stats">
          <div class="stat"><span>Pata chalne mein</span><strong class="rs-o-d"></strong></div>
          <div class="stat"><span>Sab wapas connected</span><strong class="rs-o-f"></strong></div>
          <div class="stat"><span>Fail hue handshakes</span><strong class="rs-o-x"></strong></div>
          <div class="stat"><span>Peak attempts / s</span><strong class="rs-o-p"></strong></div>
        </div>
        <div class="calc-note rs-note"></div>`;
      let fail = 'crash', strat = 'now';
      const F = { crash: 'Gateway crash (turant pata)', cut: 'Network cut (heartbeat se pata)' };
      const ST = { now: 'Turant retry (har 0.5 s)', backoff: 'Backoff (1, 2, 4... s)', jitter: 'Backoff + jitter' };
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
        el.querySelector('.rs-o-f').textContent = r.finish === null ? '300 s mein bhi nahi' : r.finish.toFixed(0) + ' s';
        el.querySelector('.rs-o-x').textContent = r.fails.toLocaleString('en-IN');
        el.querySelector('.rs-o-p').textContent = r.peak.toLocaleString('en-IN');
        let n;
        if (fail === 'cut') n = `Network cut mein koi "band" signal nahi aaya. Har app ko 2 ping miss hone pe (${hb} se ${2 * hb} s ke beech) pata chala, to reconnects apne aap bikhar gaye aur koi storm nahi. Lekin keemat: users ${2 * hb} s tak ek mare connection ko dekhte rahe. Heartbeat chhota karo: jaldi pata, lekin har connection pe zyada pings (lakhon connections × har ${hb} s).`;
        else if (strat === 'now') n = `Sab 100,000 ek saath aaye, capacity sirf 10,000/s. Baaki har 0.5 s pe phir try karte rahe: peak ${r.peak.toLocaleString('en-IN')} attempts/s aur ${r.fails.toLocaleString('en-IN')} fail handshakes. Asli duniya mein ye fail handshakes bhi CPU khaate hain aur baaki gateways gira sakte hain.`;
        else if (strat === 'backoff') n = `Backoff hai, lekin jitter nahi: sab clients ek hi pal pe fail hue, to sab ek hi pal pe retry karte hain (1 s, 3 s, 7 s... laal lehrein). Har lehar mein sirf 1,000 andar aa paate hain. Sab ka wait double hota gaya aur 300 s mein bhi sab nahi jude.`;
        else n = `Jitter ne retries ko time mein bikhra diya: lehrein ghul gayin, ${r.finish.toFixed(0)} s mein sab wapas, peak ${r.peak.toLocaleString('en-IN')}/s. Sabse aasaan aur sabse zaroori fix. (Kai apps pehli koshish se pehle bhi 0-2 s ka random wait karti hain.)`;
        el.querySelector('.rs-note').textContent = n;
      };
      el.querySelector('.rs-h').addEventListener('input', run); run();
    }},
    { type: 'callout', tone: 'tip', html: `Saar (gateway crash, 100k users, capacity 10k/s): turant retry = ~50 s aur ~49.5 lakh fail handshakes. Backoff bina jitter = synchronized lehrein, 300 s mein bhi poora nahi. Backoff + jitter = ~36 s, fail handshakes ~2.7 lakh. Network cut mein heartbeat (2 miss) hi detection hai: 30 s heartbeat = 30-60 s tak user ko pata nahi.` },
    { type: 'h3', text: 'Heartbeats aur reconnection, niyam' },
    { type: 'list', items: [
      `<strong>Heartbeat:</strong> WebSocket mein ping/pong frames; SSE mein server har ~15 s ek comment line (<code>:</code> se shuru) bhejta hai, taaki proxies idle connection na kaatein. Kuch heartbeats miss = connection dead, cleanup karo aur registry entry hatao.`,
      `<strong>Registry entries pe TTL:</strong> gateway crash ho to woh apni entries delete nahi kar paayega. TTL + heartbeat refresh se stale entries apne aap mitti hain.`,
      `<strong>Reconnect with exponential backoff + jitter:</strong> warna ek gateway ka girna baaki gateways pe reconnection storm bana deta hai.`,
      `<strong>Resume from last ID:</strong> client hamesha "maine X tak dekha" bataye (SSE ka Last-Event-ID, chat ka last_msg_id). Server DB se gap bhar de. Isliye pehle store, phir deliver.`,
      `<strong>Deploys:</strong> gateway restart = uske saare users reconnect. Gateways ko dheere dheere drain karo (naye connections band, purane ko "please reconnect" signal), sab ek saath nahi.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Gateway pe state mat chhupao', html: `"Aman ke unread messages Gateway 2 ki memory mein rakh lete hain." Gateway gira, sab gaya. Gateway ke paas sirf connection hona chahiye; messages DB mein, mapping registry mein. Tab koi bhi gateway gire, user kisi aur gateway pe aake wahi state paata hai.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Updates sirf <strong>server → client</strong>? <strong>SSE</strong>. <strong>Dono taraf</strong>, frequent, low latency? <strong>WebSockets</strong>. <strong>Server → doosra server</strong> ko batana? <strong>Webhook</strong>. Audio/video call? <strong>WebRTC</strong>. Updates kam hain, ya sabko same data (CDN se cache ho sake)? <strong>Short polling</strong>. Persistent connections allowed hi nahi? <strong>Long polling</strong> fallback.` },
    { type: 'table', head: ['Technique', 'Direction', 'Use when', 'Real example'], rows: [
      ['Short polling', 'Client baar baar poochhta hai', 'Updates kam, kuch seconds delay chalta hai, ya response CDN-cache ho sakta hai', 'Report ka status check; CDN ke peeche live score JSON'],
      ['Long polling', 'Client poochhta hai, server news aane tak rokta hai', 'Fallback jab persistent connections nahi rakh sakte', 'Purane chat systems, kuch sync clients'],
      ['SSE', 'Server → client only', 'Ek-tarfa updates plain HTTP pe, automatic reconnect ke saath', 'ChatGPT / Claude streaming tokens; notifications; live commentary'],
      ['WebSockets', 'Dono taraf, persistent', 'Frequent do-tarfa messages, low latency', 'WhatsApp chat, multiplayer games, Google Docs cursors, Uber driver app'],
      ['Webhooks', 'Server → doosra server', 'Third party ko batana ki kuch khatam hua', 'Razorpay ya Stripe merchant ko batata hai ki payment ho gaya'],
      ['WebRTC', 'Peer to peer media', 'Audio aur video calls', 'Google Meet, WhatsApp calls'],
    ], caption: 'Roadmap phase 5: "Polling, SSE, WebSockets or webhooks?"' },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com real-time: poori picture', height: 600,
      nodes: [
        { id: 'riya', label: 'Riya ka app', sub: 'WebSocket', x: 100, y: 60, kind: 'client', info: 'Ye kya hai: Riya ka chat app. Ek WebSocket khula rakhta hai, har 30 s ping. Toote to backoff + jitter se reconnect aur last message ID se resume.' },
        { id: 'aman', label: 'Aman ka app', sub: 'WebSocket', x: 280, y: 60, kind: 'client', info: 'Ye kya hai: Aman ka chat app. Video call ke time Riya se WebRTC pe seedha media (dashed line); setup signaling se.' },
        { id: 'web', label: 'Browser', sub: 'AI jawab (SSE)', x: 455, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ka AI helper kholne wala browser. Prompt normal POST se, jawab SSE stream se word-by-word.' },
        { id: 'psp', label: 'Payment provider', sub: 'Stripe / Razorpay', x: 630, y: 60, w: 150, kind: 'net', info: 'Ye kya hai: bahar ki payment company. Payment poora hone pe hamare webhook URL pe signed POST bhejti hai, fail pe retry karti hai.' },
        { id: 'lb', label: 'L4 LB', sub: 'least conn', x: 190, y: 180, w: 120, kind: 'net', info: 'Ye kya hai: load balancer jo naye WebSocket connections gateways mein baant-ta hai. Lambe connections ke liye least connections.' },
        { id: 'ai', label: 'AI API', sub: 'SSE stream', x: 455, y: 180, kind: 'server', info: 'Ye kya hai: AI jawab banane wali service. Ek-tarfa stream ke liye SSE: plain HTTP, Last-Event-ID se resume.' },
        { id: 'wh', label: 'Webhook endpoint', sub: 'verify + dedupe', x: 630, y: 180, w: 150, kind: 'server', info: 'Ye kya hai: hamara public URL. Signature check, event ID se dedupe, kaam queue mein, turant 200.' },
        { id: 'g1', label: 'Gateway 1', sub: '~100k conns', x: 100, y: 300, kind: 'server', info: 'Ye kya hai: connection gateway. Sirf connections, auth aur heartbeats. Koi state nahi: messages DB mein, mapping registry mein.' },
        { id: 'g2', label: 'Gateway 2', sub: '~100k conns', x: 280, y: 300, kind: 'server', info: 'Ye kya hai: doosra gateway. Gire to uske users jitter ke saath baaki gateways pe reconnect karte hain.' },
        { id: 'orders', label: 'Orders DB', sub: 'events seen', x: 630, y: 300, w: 150, kind: 'data', info: 'Ye kya hai: orders/subscriptions ka DB, saath mein "kaunse webhook event ID process ho chuke" ka record (duplicates pakadne ke liye).' },
        { id: 'reg', label: 'Registry', sub: 'Redis: user→gw', x: 100, y: 430, kind: 'cache', info: 'Ye kya hai: kaun user kis gateway pe, TTL ke saath. Heartbeat TTL badhata hai; gateway mare to entries apne aap expire.' },
        { id: 'chat', label: 'Chat service', sub: 'store, then route', x: 280, y: 430, kind: 'server', info: 'Ye kya hai: chat ka dimaag. Pehle message DB mein save, phir registry se recipient ka gateway dhoondh ke bhejna. Offline ho to phone push.' },
        { id: 'push', label: 'APNs / FCM', sub: 'offline push', x: 455, y: 430, kind: 'net', info: 'Ye kya hai: Apple/Google ki phone notification services. Jab user ka app band ho aur koi WebSocket na ho.' },
        { id: 'db', label: 'Messages DB', sub: 'source of truth', x: 280, y: 555, kind: 'data', info: 'Ye kya hai: har message ka permanent record. Real-time sirf jaldi dikhane ka raasta hai; reconnect pe gap yahin se bharta hai.' },
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
        { name: 'Chat message', text: 'Riya → LB → Gateway 1 → chat service: pehle DB mein save, phir registry se pata "Aman gw2 pe", Gateway 2 ne Aman ke WebSocket pe bheja.', go: ['riya>lb>g1>chat>db', 'chat>reg', 'chat>g2>lb>aman'] },
        { name: 'Aman offline', text: 'Registry mein Aman nahi mila. Message DB mein safe, phone pe APNs/FCM push. App khulte hi last ID se sync.', go: ['riya>lb>g1>chat>db', 'chat>reg', 'chat>push'] },
        { name: 'AI streaming', text: 'Browser ne prompt bheja, jawab SSE stream pe word-by-word aaya. Ek-tarfa, plain HTTP.', go: ['web>ai', 'res:ai>web'] },
        { name: 'Payment webhook', text: 'Provider ne signed POST bheja. Endpoint ne signature check kiya, event ID dekha, kaam karke turant 200.', go: ['psp>wh>orders', 'res:wh>psp'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>HTTP mein server khud nahi bol sakta. Chhe jawab: short polling, long polling, SSE, WebSocket, webhook, WebRTC.</li>
      <li>Short polling: simple, CDN-friendly, lekin bekaar requests aur ~P/2 der. Long polling: server jawab rokta hai, kam der, har user ki ek ruki request.</li>
      <li>SSE: server → client stream plain HTTP pe, auto reconnect + Last-Event-ID. WebSocket: dono taraf frames, ping/pong, reconnect khud likho.</li>
      <li>Webhook: server se server POST. Signature verify, event ID se dedupe, turant 2xx, order pe bharosa nahi. WebRTC: peer-to-peer media; signaling + STUN/TURN chahiye.</li>
      <li>Lakhon connections: gateways (sirf connections) + registry (user → gateway, TTL) + chat service (pehle store, phir route).</li>
      <li>Heartbeats zombie connections pakadte hain. Reconnect hamesha backoff + jitter ke saath, aur last ID se resume.</li>
      <li>Decide: ek-tarfa → SSE, do-tarfa frequent → WebSocket, server-to-server → webhook, call → WebRTC, kam updates / sabko same data → short polling.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Users ko updates turant (SSE/WebSocket ~ek network trip)', 'Polling ke bekaar requests khatam', 'Do-tarfa features possible: typing, presence, games', 'Webhooks se third parties ke saath bina polling integration', 'WebRTC se media server bandwidth bachti hai'],
      costs: ['Persistent connections = stateful servers: memory per user, gateways, registry', 'Deploy/crash pe reconnection storms; backoff + jitter + resume logic chahiye', 'L4 LB, proxies, firewalls ke saath lambe connections ki dikkatein; heartbeats zaroori', 'Webhooks: public endpoint, signatures, duplicates, out-of-order events', 'WebRTC: signaling + STUN/TURN infra, TURN bandwidth ka bill'] },

    { type: 'think', questions: [
      { q: 'India vs Pakistan match, 3 crore log live score dekh rahe hain. WebSocket se har ball ka update push karoge?', a: 'Shayad nahi. 3 crore persistent connections = ~300 gateways sirf score ke liye, aur har ball pe 3 crore pushes. Score JSON sabke liye same hai, to CDN pe 1-2 s ke TTL ke saath rakho aur apps har kuch second short poll karein. Origin pe har edge se sirf kuch requests. Roadmap ka worked example yahi kehta hai: maths architecture batata hai.' },
      { q: 'Claude/ChatGPT jaisa AI answer word-by-word dikhana hai. SSE ya WebSocket?', a: 'SSE kaafi hai: user ek prompt bhejta hai (normal POST), jawab server se ek-tarfa stream hota hai. SSE plain HTTP hai, proxies/CDNs ke saath aasaan, aur reconnect built-in. WebSocket tab jab client ko bhi lagataar bhejna ho (jaise voice mode ya collaborative editing).' },
      { q: 'Gateway pe deploy karte hi har baar 2 minute ke liye error rate badh jaata hai. Kyun, aur kya karoge?', a: 'Restart pe us gateway ke saare users ek saath reconnect karte hain aur baaki gateways/auth/registry pe spike. Fix: rolling deploy, gateway ko drain karo (naye connections band, purane users ko dheere dheere reconnect signal), clients mein exponential backoff + jitter, aur reconnect pe resume from last ID taaki bulk re-sync na ho.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Server se client ki ek-tarfa stream, automatic reconnect ke saath, plain HTTP pe. Kaunsa?', options: ['WebSocket', 'SSE', 'Webhook'], answer: 1, explain: 'SSE ka EventSource reconnect aur Last-Event-ID khud sambhalta hai.' },
      { q: 'Message Riya ke gateway pe aaya, Aman doosre gateway pe hai. Kaise route hoga?', options: ['Har gateway ko broadcast', 'Registry (user → gateway) mein dekh ke us gateway ko bhejo', 'Aman ka app har second poll kare'], answer: 1, explain: 'Registry batata hai kaun kahan connected hai. Broadcast 1,000 gateways pe bahut mehenga hai.' },
      { q: 'Webhook endpoint ko sabse pehle kya karna chahiye?', options: ['Saara business logic chalana, phir 200', 'Signature verify, event ID se dedupe, queue mein daal ke turant 2xx', 'Provider ko wapas call karna'], answer: 1, explain: 'Slow handler = provider timeout aur retries. Unsigned handler = koi bhi nakli event bhej sakta hai.' },
      { q: 'Gateway crash ke baad 100k clients ko reconnect kaise karna chahiye?', options: ['Turant, sab ek saath', 'Exponential backoff + random jitter, phir last ID se resume', 'User ko app restart karne bolo'], answer: 1, explain: 'Jitter reconnection storm (thundering herd) rokta hai; resume se miss hue messages mil jaate hain.' },
      { q: 'WebRTC call mein dono users strict firewalls ke peeche hain. Media kaise jaayega?', options: ['Signaling server se', 'TURN relay server se', 'Nahi ja sakta'], answer: 1, explain: 'Direct raasta na mile to TURN media relay karta hai. Signaling sirf setup ke liye hai.' },
      { q: 'Short polling har 10 s. Update kisi bhi random pal pe aata hai. User tak average kitni der mein dikhega?', options: ['~0 s', '~5 s (interval ka aadha)', '~10 s hamesha'], answer: 1, explain: 'Update poll ke beech kahin bhi aa sakta hai, to agla poll average aadha interval baad. Timeline lab mein P = 5 s pe delay ~3 s tha (4 updates ka chhota sample).' },
      { q: 'Riya ki train tunnel mein gayi, network kat gaya, koi TCP close nahi aaya. Server ko kaise pata chalega ki connection mara hua hai?', options: ['Turant, TCP batata hai', 'Heartbeat (ping/pong) miss hone se', 'Kabhi nahi'], answer: 1, explain: 'Silent network cut mein koi signal nahi aata. Kuch pings ka pong na aaye to connection mara maano, cleanup karo aur registry entry hatao.' },
    ]},
    { type: 'sources', note: 'Protocol aur webhook behaviour official specs/docs se. Gateway capacity (~100k connections) roadmap ka napkin-maths thumb rule hai, benchmark nahi.', items: [
      { title: 'HTML Living Standard: Server-sent events', publisher: 'WHATWG', official: true, url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html', used: 'text/event-stream, fields (event, data, id, retry), automatic reconnection with Last-Event-ID, ~15 s comment keep-alive, HTTP/1 per-server connection limit note.' },
      { title: 'RFC 6455: The WebSocket Protocol', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc6455', used: 'HTTP Upgrade handshake with 101 and Sec-WebSocket-Key/Accept, ping/pong as keepalive, close frames.' },
      { title: 'Receive Stripe events in your webhook endpoint', publisher: 'Stripe documentation', official: true, url: 'https://docs.stripe.com/webhooks', used: 'Retries with exponential backoff up to 3 days in live mode, Stripe-Signature HMAC-SHA256 with timestamp and 5-minute default tolerance, duplicates, no ordering guarantee, quick 2xx and async processing.' },
      { title: 'TURN server', publisher: 'webrtc.org', official: true, url: 'https://webrtc.org/getting-started/turn-server', used: 'TURN relays traffic when a direct connection between peers is not possible; ICE server configuration.' },
    ]},
  ],
});
