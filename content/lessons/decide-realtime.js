(function () {
  /* Decision widget: questions as chips -> recommendation card.
     cfg = { questions: [{ id, q, opts: [[value, label]], when?(ans) }], decide(ans) -> { pick, why, cost, alt } }
     The cfg is also attached to the block (block.cfg) so a node script can walk every path. */
  const decider = (el, cfg) => {
    const ans = {};
    el.innerHTML = '<div class="dz-qs"></div><div class="dz-out" aria-live="polite"></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn small ghost dz-reset">Shuru se</button></div>';
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
      if (!done) { out.innerHTML = '<div class="calc-note">Upar wale sawaal ka jawab chuno. Saare jawab milte hi recommendation yahan aayega.</div>'; return; }
      const r = cfg.decide(ans);
      out.innerHTML = `<div style="border:1px solid var(--line-2);border-left:4px solid var(--accent);border-radius:var(--r);background:var(--surface-2);padding:12px 14px">
        <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">Recommendation</div>
        <div style="font:700 20px/1.3 var(--f-display);color:var(--ink);margin:2px 0 8px">${r.pick}</div>
        <p style="margin:6px 0"><strong>Kyun:</strong> ${r.why}</p>
        <p style="margin:6px 0"><strong>Kya chhodte ho:</strong> ${r.cost}</p>
        <p style="margin:6px 0"><strong>Runner-up:</strong> ${r.alt}</p></div>`;
    };
    el.querySelector('.dz-reset').onclick = () => { Object.keys(ans).forEach(k => delete ans[k]); draw(); };
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
  const CASES = [
    { q: 'xyz.com pe "Live poll": match ke beech sawaal "agla wicket kab?" aur sabko live percentage dikhna hai (har 2-3 second update). 50 lakh viewers.', signal: 'Ek-tarfa (dikhana), sabko same numbers, 2-3 second deri theek. Vote dena ek normal POST.', pick: 'Vote: POST. Results: short polling behind a CDN (TTL ~2 s)', why: 'Same data sabke liye, to CDN edge pe hi jawab. Origin pe sirf har edge se ek request per TTL.', trap: 'Har viewer ko WebSocket pe percentage push karna: 50 lakh connections sirf ek number ke liye.' },
    { q: 'Creator dashboard pe "naya comment aaya" ki ghanti, sirf us creator ke comments. Creator dashboard ghanton khula rakhta hai.', signal: 'Server → user, har user ka alag data, turant chahiye, user kuch nahi bhejta.', pick: 'SSE', why: 'Ek-tarfa personal stream. Plain HTTP, browser khud reconnect karta hai. Har creator ko poll karwana bekaar requests hain.', trap: 'WebSocket lena "kyunki live hai": do-tarfa ki zaroorat hi nahi.' },
    { q: 'Ek brand partner ka system chahta hai ki jab bhi uska sponsored video publish ho, use turant pata chale.', signal: 'Server → doosri company ka server.', pick: 'Webhook (signed POST to the partner URL, retries with backoff)', why: 'Partner ka server tumhare saath connection nahi rakhega. Event pe POST karo; fail ho to backoff ke saath retry; har event ka ID bhejo taaki wo duplicate pehchaan sake.', trap: 'Partner ko kehna "hamari API har minute poll karo": slow aur dono taraf bekaar load.' },
    { q: 'Live "watch party": 5 dost saath video dekhte hain, koi pause/seek kare to sabke liye turant, aur saath mein chat.', signal: 'Dono taraf, frequent, milliseconds mein, chhota group.', pick: 'WebSockets', why: 'Har member commands bhejta bhi hai aur paata bhi hai. Ek persistent do-tarfa connection sabse simple aur tez.', trap: 'SSE + POST bhi chal jaata, lekin har pause pe naya POST aur alag stream; do-tarfa frequent ke liye WebSocket seedha hai.' },
    { q: 'Ek bank ka office network jahan WebSocket aur SSE beech mein kat jaate hain. Wahan ke employees xyz.com chat use karte hain.', signal: 'Persistent connections allowed nahi.', pick: 'Long polling fallback (jaise Socket.IO ka polling transport)', why: 'Long polling normal request-response dikhta hai, to proxy kam kaat-ta hai. Message thoda late, lekin chalta hai.', trap: 'Sabke liye long polling kar dena "kyunki ek network pe dikkat thi". Pehle WebSocket try karo, fail ho to gir jao.' },
    { q: 'Creator apne 2 lakh fans ke saath live video stream karta hai (ek-tarfa), fans sirf dekhte hain.', signal: 'Ek se lakhon, ek-tarfa media, kuch second deri chalegi.', pick: 'HLS/DASH via CDN (WebRTC nahi)', why: 'Video ke chhote tukde CDN se lakhon tak sasta jaata hai. WebRTC calls ke liye hai, jahan har koi bolta bhi hai.', trap: 'WebRTC se 2 lakh peers: media servers ka bahut bada bill aur complexity.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'who', q: 'Update kisko pahunchana hai?', opts: [
        ['user', 'User ke app / browser ko'],
        ['server', 'Kisi doosri company ke server ko (merchant, partner)'],
        ['media', 'Live audio / video call'],
      ]},
      { id: 'dir', q: 'Direction kya hai?', when: a => a.who === 'user', opts: [
        ['down', 'Sirf server → user (user sirf dekhta hai)'],
        ['both', 'Dono taraf, user bhi lagataar bhejta hai'],
      ]},
      { id: 'freq', q: 'Updates kitni baar aate hain?', when: a => a.who === 'user', opts: [
        ['rare', 'Kabhi kabhi; kuch second ki deri chalegi'],
        ['often', 'Lagataar; har second ya usse tez, deri nahi chalegi'],
      ]},
      { id: 'same', q: 'Kya sab users ko same data dikhta hai?', when: a => a.who === 'user' && a.dir === 'down', opts: [
        ['same', 'Haan, sabko same (live score, trending)'],
        ['personal', 'Nahi, har user ka alag (uska order, uska AI answer)'],
      ]},
      { id: 'conn', q: 'Kya users lambe (persistent) connections rakh sakte hain?', when: a => a.who === 'user' && a.freq === 'often' && (a.dir === 'both' || a.same === 'personal'), opts: [
        ['yes', 'Haan, normal internet'],
        ['no', 'Nahi: purane proxies / strict corporate firewall kaat dete hain'],
      ]},
    ],
    decide(a) {
      if (a.who === 'server') return R('Webhooks', 'Partner ka server tumhare saath connection khula nahi rakhega. Kaam khatam hote hi tum uske URL pe ek HTTP POST bhejo ("payment succeeded"). Razorpay/Stripe isi tarah merchants ko batate hain.', 'Partner ko public endpoint banana padta hai, signature verify karni padti hai, aur duplicate / out-of-order events sambhalne padte hain. Tumhe retries (backoff ke saath) chalani padti hain.', 'Partner tumhari status API ko poll kare: simple, lekin slow aur bekaar requests.');
      if (a.who === 'media') return R('WebRTC', 'Audio/video ke liye browsers ke andar bana peer-to-peer system: media seedha users ke beech, kam latency. Server sirf call setup (signaling) karta hai.', 'Signaling server (aksar WebSocket), STUN/TURN servers chahiye; strict firewalls pe TURN relay ka bandwidth bill. Group calls ke liye media server (SFU).', 'Ek se lakhon ko live stream (ek-tarfa) ho to WebRTC nahi: HLS/DASH via CDN, kuch second ki deri ke saath.');
      if (a.dir === 'both') {
        if (a.freq === 'rare') return R('Normal HTTP requests + short polling', 'User kabhi kabhi bhejta hai (normal POST), aur naye updates kabhi kabhi aate hain (har kuch second poll). Kisi persistent connection ki zaroorat nahi; har server stateless rehta hai.', 'Update aane aur dikhne mein poll interval jitni deri; kai polls khaali.', 'SSE (server → user) + POST (user → server), agar updates turant dikhane hon.');
        return a.conn === 'no'
          ? R('Long polling + POST (fallback)', 'Persistent connections kat jaate hain, to client request bhejta hai aur server news aane tak use rok ke rakhta hai; jawab milte hi client nayi request bhejta hai. User ke messages normal POST se.', 'Har message ke baad nayi request ka overhead; server pe bahut saari khuli requests; WebSocket se zyada latency.', 'WebSockets with fallback (jaise Socket.IO jo zaroorat pe long polling pe gir jaata hai).')
          : R('WebSockets', 'Dono taraf frequent, low-latency messages (chat, multiplayer game, Google Docs cursors, driver app). Ek persistent connection pe dono taraf frames, har baar HTTP headers ka bojh nahi.', 'Stateful servers: har connected user ki memory, connection gateways, user→server registry, heartbeats, reconnection storms sambhalna.', 'SSE + POST, agar user ka bhejna kam ho aur sirf server ki taraf se stream zyada ho.');
      }
      if (a.freq === 'rare') return a.same === 'same'
        ? R('Short polling, CDN cached', 'Updates kam hain aur sabko same data. Client har kuch second poll kare; CDN wo JSON thodi der cache kare, origin ko bahut kam requests.', 'Poll interval + CDN TTL jitni deri.', 'SSE, agar deri bilkul nahi chalti.')
        : R('Short polling', 'Kabhi kabhi badalne wala status ("report ban gayi?"). Har 5-10 second ek simple GET. Koi naya infra nahi, servers stateless.', 'Zyada tar polls ka jawab "abhi nahi" (bekaar requests); interval jitni deri.', 'SSE, jab users bahut hon aur bekaar polls ka load dikhne lage.');
      if (a.same === 'same') return R('Short polling behind a CDN', 'Lagataar update, lekin <em>sabko same</em> data (live score). Lakhs users har second poll karein to bhi CDN edges score JSON ko 1-2 second cache karte hain; origin ko har edge se sirf kuch requests/sec. Lakhs persistent connections ka jhanjhat nahi.', '1-2 second ki deri; CDN TTL aur poll interval tune karna.', 'SSE/WebSocket fan-out service, agar sub-second updates chahiye (betting jaise).');
      return a.conn === 'no'
        ? R('Long polling', 'Har user ka apna stream (uska AI answer, uske notifications), lekin persistent connections allowed nahi. Long polling plain request-response hai, to proxies isse kam kaat-te hain.', 'Har update ke baad nayi request; latency SSE se zyada; server pe kai khuli requests.', 'SSE, agar network baad mein allow kare.')
        : R('SSE (Server-Sent Events)', 'Ek-tarfa stream server → user, plain HTTP pe, browser ka EventSource automatic reconnect bhi karta hai. ChatGPT/Claude ke streaming tokens, notifications, live commentary.', 'Sirf ek taraf; user ko bhejna ho to alag POST. Connection open rehta hai, to server pe connections ki ginti sambhalni padti hai.', 'WebSockets, agar baad mein do-tarfa frequent messages chahiye.');
    },
  };

  Lesson.register({
    id: 'decide-realtime',
    title: 'Polling, SSE ya WebSockets?',
    minutes: 26,
    summary: `Server ko user tak (ya doosre server tak) "kuch naya hua" kaise pahunchaayein? Chhe tareeke, aur chaar sawaal jo sahi tareeka chun dete hain. Saath mein trap: har live cheez ko WebSocket ki zaroorat nahi.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Jab server pe kuch naya hota hai (wicket gira, naya message aaya, payment ho gaya), to wo khabar user tak kaise pahunche?<br>Ek tareeka: user baar baar poochhe "kuch naya?". Doosra: ek line hamesha khuli rakho taaki server khud bata de. Teesra: ek server doosre server ko khud phone kare.<br>Har tareeke ki keemat alag hai. Galat chuna to ya to khabar late aayegi, ya hazaaron servers bekaar mein chalenge.<br>Is lesson mein chaar seedhe sawaal hain jo sahi tareeka chun dete hain, aur ek calculator jisse tum khud keemat dekh sakte ho.` },
      { type: 'h2', text: 'Problem: har feature "live" chahiye' },
      { type: 'p', html: `xyz.com pe ab live cricket match ki commentary hai, creators ke liye AI assistant jo jawab word-by-word likhta hai, DM chat, "video processing done" ka status, aur brand payments. Product manager har jagah ek hi shabd bolta hai: <em>"real-time"</em>. Engineer ka kaam hai poochhna: <strong>kitna real-time, kis direction mein, aur kisko?</strong>` },
      { type: 'p', html: `Tareeke tum <a href="#/realtime">real-time lesson</a> mein seekh chuke ho. Yahan jaldi se yaad karo, phir decide karna seekho.` },
      { type: 'h3', text: 'Chhe tareeke, ek line mein' },
      { type: 'table', head: ['Tareeka', 'Ek line mein', 'Direction'], rows: [
        ['<strong>Short polling</strong>', 'Client har kuch second poochhta hai: "kuch naya?"', 'Client poochhta hai'],
        ['<strong>Long polling</strong>', 'Client poochhta hai, aur server tab tak jawab rok ke rakhta hai jab tak kuch naya na ho.', 'Client poochhta hai, server rukta hai'],
        ['<strong>SSE</strong> (Server-Sent Events)', 'Ek khula HTTP response jisme server lagataar naye events likhta rehta hai.', 'Sirf server → client'],
        ['<strong>WebSocket</strong>', 'Ek connection jo khula rehta hai, aur dono taraf messages chalte hain.', 'Dono taraf'],
        ['<strong>Webhook</strong>', 'Ek server doosre server ke URL pe POST karke batata hai "kaam ho gaya".', 'Server → doosra server'],
        ['<strong>WebRTC</strong>', 'Do browsers/phones ke beech seedha audio/video.', 'Peer → peer'],
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: Persistent connection', html: `<strong>Ye kya hai:</strong> ek connection jo request ke baad band nahi hota; minutes ya ghanton khula rehta hai (SSE, WebSocket). Jaise phone call jo kaata nahi gaya, vs. SMS jo bhej ke khatam.<br><strong>Kyun chahiye:</strong> server jab chaahe turant bhej sakta hai; user ko baar baar poochhna nahi padta.<br><strong>Iske bina:</strong> har update ke liye client ko naya request bhejna padega (polling), aur deri hogi.<br><strong>Keemat:</strong> server ko har khula connection yaad rakhna padta hai (memory). 1 crore users = 1 crore khule connections. Aur kuch purane proxies/firewalls lambe connections ko beech mein kaat dete hain.` },
      { type: 'callout', tone: 'tip', title: 'Decide', html: `Updates sirf <strong>server → client</strong>? <strong>SSE</strong>. <strong>Dono taraf, frequent, low latency</strong>? <strong>WebSockets</strong>. <strong>Server → doosra server</strong>? <strong>Webhook</strong>. Updates kam, ya sabko same data jo CDN cache kar sake? <strong>Short polling</strong>. Persistent connection allowed nahi? <strong>Long polling</strong>. Audio/video call? <strong>WebRTC</strong>.` },

      { type: 'h2', text: 'Decision helper' },
      { type: 'p', html: `Ek feature chuno (live score, AI answer streaming, chat, payment status...) aur jawab do. Kuch sawaal tabhi aate hain jab unka jawab decision badal sakta hai.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },

      { type: 'h2', text: 'Keemat ka calculator: polling vs push' },
      { type: 'p', html: `Decision ko numbers mein dekho. Users kitne, kitni der mein poll, data kitni baar badalta hai, aur sabko same data ya har user ka alag. Upar ki stats <strong>polling</strong> ki keemat hain, neeche ki <strong>push</strong> (SSE/WebSocket) ki. Maan liya hai: ~300 CDN edges, edge cache TTL 1 second, aur ek gateway ~1 lakh connections (rough thumb rule, benchmark nahi).` },
      { type: 'custom', render(el) { costLab(el, { q: { users: 'Kitne users ek saath?', iv: 'Poll interval', u: 'Data kitni baar badalta hai?', same: 'Data kaisa hai?' }, n: ['10 hazaar', '1 lakh', '10 lakh', '1 crore'], u: ['1 baar/min', '6 baar/min', '30 baar/min', '60 baar/min'], same: 'Sabko same (score)', personal: 'Har user ka alag', s: ['Polls: CDN/servers pe', 'Polls: origin pe', 'Bekaar polls', 'Polling: avg deri', 'Push: khule connections', 'Push: gateways', 'Push: messages'], vSame: (o, g) => `Same data: CDN poll ko edge pe hi khatam kar deta hai, origin pe sirf ~${o} requests/sec. Push ke liye ${g} gateways chalane padte. <strong>Polling + CDN jeet-ta hai.</strong>`, vWaste: w => `${w}% polls ka jawab "kuch naya nahi". Har user ka alag data hai, to CDN madad nahi karega. Agar users bahut hain to <strong>push (SSE/WebSocket) ya kam poll interval</strong> socho; agar ye sirf ek status hai, polling phir bhi chalega.`, vPush: o => `Data almost har poll pe badal raha hai aur har user ka alag hai: origin pe ${o} requests/sec. Yahan ek khula <strong>SSE/WebSocket</strong> connection har baar naye request se sasta aur tez hai.` }); } },
      { type: 'p', html: `Try karo: <strong>1 crore, 2 s, 30 baar/min, sabko same</strong> = CDN pe 50 lakh req/s, lekin origin pe sirf 300. Ab "har user ka alag" chuno: origin pe bhi 50 lakh. Phir <strong>1 lakh, 5 s, 1 baar/min, alag</strong> (video processing status): 92% polls bekaar, lekin total sirf 20,000 req/s, jo ek chhota cluster sambhal leta hai.` },

      { type: 'h2', text: 'Poori table' },
      { type: 'table', head: ['Technique', 'Direction', 'Use when', 'Real example'], caption: 'Roadmap phase 5: "Polling, SSE, WebSockets or webhooks?"', rows: [
        ['Short polling', 'Client baar baar poochhta hai', 'Updates kam, kuch second deri chalegi, ya response CDN-cache ho sakta hai', 'Report ka status check; CDN ke peeche live score JSON'],
        ['Long polling', 'Client poochhta hai, server news aane tak rokta hai', 'Fallback jab persistent connections nahi rakh sakte', 'Purane chat systems, kuch sync clients'],
        ['SSE', 'Server → client only', 'Ek-tarfa updates plain HTTP pe, automatic reconnect ke saath', 'ChatGPT / Claude streaming tokens; notifications; live commentary'],
        ['WebSockets', 'Dono taraf, persistent', 'Frequent do-tarfa messages, low latency', 'WhatsApp chat, multiplayer games, Google Docs cursors, Uber driver app'],
        ['Webhooks', 'Server → doosra server', 'Third party ko batana ki kuch khatam hua', 'Razorpay ya Stripe merchant ko batata hai ki payment ho gaya'],
        ['WebRTC', 'Peer to peer media', 'Audio aur video calls', 'Google Meet, WhatsApp calls'],
      ]},
      { type: 'h2', text: 'Har tareeka, ek ek karke: kaise, kab, jaal' },
      { type: 'h3', text: 'Short polling' },
      { type: 'p', html: `<strong>Kaise:</strong> client har N second ek normal GET bhejta hai. Server turant jawab deta hai, chahe kuch naya ho ya na ho.<br><strong>xyz.com:</strong> "video processing: 40%..." status, aur live score JSON jo CDN ke peeche hai.<br><strong>Kyun:</strong> sabse simple. Har request alag, server ko kuch yaad nahi rakhna (stateless), aur jawab CDN cache kar sakta hai.<br><strong>Jaal:</strong> har user ka alag data + har second poll + lakhs users. Zyada tar jawab "kuch naya nahi", aur sab seedha tumhare servers pe. Calculator mein "har user ka alag" chuno aur dekho.` },
      { type: 'h3', text: 'Long polling' },
      { type: 'p', html: `<strong>Kaise:</strong> client request bhejta hai. Server turant jawab nahi deta; wo request ko rok ke rakhta hai (jaise 30 second tak) jab tak kuch naya na aaye. Jawab milte hi client agli request bhej deta hai.<br><strong>xyz.com:</strong> office network wale users jinke firewall WebSocket kaat dete hain; chat unke liye long polling pe chalti hai.<br><strong>Kyun:</strong> khabar lagbhag turant pahunchti hai, aur ye plain request-response hai, to purane proxies isse kam kaat-te hain.<br><strong>Jaal:</strong> isko pehli choice banana. Har message ke baad nayi request ka overhead aur server pe hazaaron rukhi hui requests. Ye <em>fallback</em> hai; Socket.IO jaisi libraries WebSocket na chale to isi pe girti hain.` },
      { type: 'h3', text: 'SSE (Server-Sent Events)' },
      { type: 'p', html: `<strong>Kaise:</strong> client ek normal HTTP request bhejta hai; server response band nahi karta, aur <code>text/event-stream</code> format mein event pe event likhta rehta hai. Browser ka <code>EventSource</code> connection tootne pe khud reconnect karta hai, aur <code>Last-Event-ID</code> bhej ke wahin se resume kar sakta hai.<br><strong>xyz.com:</strong> creator ka AI assistant jawab word-by-word likhta hai; live commentary; notifications ki ghanti.<br><strong>Kyun:</strong> server → user stream, plain HTTP pe, reconnect free mein.<br><strong>Jaal:</strong> user ko bhi lagataar bhejna ho (chat, game). SSE ek-tarfa hai; tab WebSocket. Doosra jaal: beech ke proxy idle connection kaat dete hain, to har ~15 second ek keep-alive comment line bhejo.` },
      { type: 'h3', text: 'WebSocket' },
      { type: 'p', html: `<strong>Kaise:</strong> ek HTTP request "upgrade" maangti hai, aur wahi TCP connection ek do-tarfa channel ban jaata hai. Dono taraf chhote messages (frames), har baar HTTP headers ka bojh nahi.<br><strong>xyz.com:</strong> DMs, "typing...", read receipts; aur creator-brand call ke setup messages (signaling).<br><strong>Kyun:</strong> dono taraf milliseconds mein, lagataar.<br><strong>Jaal:</strong> har "live" cheez ke liye. Har user ka connection ek server se chipka rehta hai (stateful): gateways, ek registry (kaun user kis gateway pe), heartbeats, aur deploy pe <strong>reconnection storm</strong> (lakhs phones ek saath reconnect). Detail: <a href="#/realtime">Real-time lesson</a>.` },
      { type: 'h3', text: 'Webhook' },
      { type: 'p', html: `<strong>Kaise:</strong> kaam khatam hone pe ek company ka server doosri company ke diye hue URL pe HTTP POST karta hai.<br><strong>xyz.com:</strong> Razorpay xyz.com ke <code>/webhooks/payments</code> pe batata hai "brand ka payment ho gaya".<br><strong>Kyun:</strong> partner ka server tumse connection khula nahi rakhega, aur baar baar poochhna (polling) bekaar hai.<br><strong>Jaal:</strong> webhook ko "ek baar, order mein" maan lena. Same event do baar aa sakta hai (retry), ulte order mein aa sakta hai, aur koi bhi tumhare URL pe nakli POST bhej sakta hai. Isliye: signature verify karo, event ID se duplicate hataao (idempotency), jaldi 2xx do aur bhaari kaam queue mein daalo.` },
      { type: 'h3', text: 'WebRTC' },
      { type: 'p', html: `<strong>Kaise:</strong> do browsers/phones ke beech seedha audio/video. Pehle dono ko ek doosre ka pata chahiye: ye setup messages (<strong>signaling</strong>) tumhare server se jaate hain, aksar WebSocket pe. <strong>STUN</strong> server batata hai ki internet pe tumhara public address kya hai; seedha raasta na mile to <strong>TURN</strong> server media ko beech mein relay karta hai.<br><strong>xyz.com:</strong> creator aur brand ki video call.<br><strong>Kyun:</strong> media seedha users ke beech, sabse kam latency, server ki bandwidth bachti hai.<br><strong>Jaal:</strong> ek se lakhon ko live stream ke liye WebRTC. Wo ek-tarfa broadcast hai: HLS/DASH via CDN behtar (kuch second deri ke saath). Aur group calls mein har koi har kisi ko bheje to bandwidth phat jaati hai; tab media server (SFU) chahiye.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Real-time = WebSocket" <strong>galat hai</strong>. WebSocket sabse taakatwar hai, lekin sabse mehnga bhi: har user ka connection kisi ek server se chipka rehta hai (stateful), deploy pe lakhs reconnect karte hain, aur load balancer/gateway/registry ka poora system chahiye. Agar data ek-tarfa hai to SSE wahi kaam plain HTTP pe karta hai. Aur agar sabko same data hai, to polling + CDN aksar sabse sasta aur sabse mazboot hai. Doosri galti: "polling purani aur buri hai". Polling stateless hai, cache hoti hai, aur kabhi toot-ti nahi; galat sirf tab hai jab har user ka alag data har second chahiye.` },
      { type: 'h2', text: 'Worked scenarios' },
      { type: 'h3', text: '1. Trap: IPL final ka live score, 1 crore fans' },
      { type: 'p', html: `Pehli soch: "live hai, to WebSocket". Lekin signals dekho: direction sirf server → fans, aur <strong>sabko bilkul same data</strong>. Napkin maths: 1 crore fans har 2 second poll karein = 50 lakh requests/sec. Tumhare servers ke liye daravna, lekin <a href="#/cdn">CDN</a> ke liye aasaan: score JSON sabke liye ek hi hai, to edges use 1-2 second cache karte hain. Agar ~300 edges hain aur har edge har second ek baar origin se poochhe, origin ko sirf ~300 requests/sec. <strong>Decision: short polling behind a CDN.</strong> 1-2 second ki deri cricket ke liye bilkul theek.` },
      { type: 'h3', text: '2. AI assistant ka jawab, word by word' },
      { type: 'p', html: `Creator sawaal poochhta hai, model tokens bana bana ke bhejta hai. Direction: server → user, aur har user ka alag jawab. User ka sawaal ek normal POST hai. <strong>Decision: SSE</strong>. ChatGPT aur Claude jaise products streaming ke liye yahi pattern use karte hain: response <code>text/event-stream</code> hota hai aur tokens ek ek event ki tarah aate hain.` },
      { type: 'h3', text: '3. DMs aur "typing..."' },
      { type: 'p', html: `Dono taraf lagataar messages, typing indicator, read receipts, sab milliseconds mein. <strong>Decision: WebSockets</strong>, connection gateways ke saath aur ek registry jo yaad rakhe kaun user kis gateway pe hai.` },
      { type: 'h3', text: '4. "Tumhara video process ho raha hai..."' },
      { type: 'p', html: `Transcode 5-10 minute leta hai, status 3-4 baar badalta hai. Iske liye ghanton khula connection? Bekaar. <strong>Decision: short polling</strong> har 5-10 second <code>GET /videos/v1/status</code>. (Aur app band ho to mobile push notification.)` },
      { type: 'h3', text: '5. Brand ne payment kiya' },
      { type: 'p', html: `Payment gateway (Razorpay/Stripe) ko xyz.com ke server ko batana hai ki payment ho gaya. Ye server se server hai. <strong>Decision: webhook</strong>: gateway hamare <code>/webhooks/payments</code> pe POST karega. Hum signature verify karenge, event ID se duplicate hataayenge, aur turant 2xx denge.` },
      { type: 'h3', text: '6. Creator aur brand ki video call' },
      { type: 'p', html: `<strong>Decision: WebRTC</strong>. Media seedha dono browsers ke beech; hamara server sirf call setup ke messages (signaling) pahunchata hai, aksar WebSocket se.` },

      { type: 'h2', text: 'Practice: 6 chhote cases' },
      { type: 'p', html: `Har case mein chaar sawaal poochho: kisko? kis direction mein? kitni baar? sabko same ya alag? Phir "Signal dikhao" aur "Jawab dikhao".` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' }); } },

      { type: 'h2', text: 'Live score: sahi aur galat choice, chala ke dekho' },
      { type: 'flow', height: 340,
        nodes: [
          { id: 'fans', label: '1 crore fans', sub: 'phone, browser', x: 90, y: 170, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com pe match dekh rahe fans, phone aur browser pe. Sab ek hi match dekh rahe hain. Sabko same score chahiye.' },
          { id: 'cdn', label: 'CDN edges', sub: 'TTL 1 s', x: 330, y: 75, w: 150, kind: 'edge', info: 'Ye kya hai: CDN edges, yaani users ke shehar ke paas rakhe cache servers. Score JSON sabke liye same hai, to ek edge 1 second ke liye cache karke lakhs requests khud answer karta hai.' },
          { id: 'gw', label: 'WS gateways', sub: '~100k conn each', x: 330, y: 265, w: 150, kind: 'server', meter: true, load: 10, info: 'Ye kya hai: WebSocket gateway servers, jinse users ke khule connections jude rehte hain. Har khula connection memory leta hai; ek gateway roughly lakh ke aas paas connections sambhalta hai (rough thumb rule). 1 crore fans = ~100 gateways.' },
          { id: 'org', label: 'Score service', sub: 'origin', x: 590, y: 150, w: 150, kind: 'server', meter: true, load: 5, info: 'Ye kya hai: score service (origin), yaani wo server jahan asli score rehta hai. Iski safety hi poore design ka maqsad hai.' },
          { id: 'sc', label: 'Scorer app', x: 590, y: 290, w: 150, kind: 'client', info: 'Ye kya hai: scorer ka app. Stadium mein baitha scorer har ball ke baad score update karta hai.' },
        ],
        edges: [{ a: 'fans', b: 'cdn', id: 'fc' }, { a: 'fans', b: 'gw', id: 'fg' }, { a: 'cdn', b: 'org', id: 'co' }, { a: 'gw', b: 'org', id: 'go' }, { a: 'sc', b: 'org' }],
        scenarios: [
          { name: 'Polling + CDN (sahi)', steps: [
            { title: 'Setup', text: 'Fans har 2 second <code>GET /match/42/score.json</code> karte hain. Beech mein CDN.', hide: ['gw', 'fg', 'go'], show: ['cdn', 'fc', 'co'], focus: ['cdn'] },
            { title: 'Lakhs polls, edge pe hi khatam', text: 'Har second lakhs requests aati hain, lekin edge ke paas 1 second purani copy hai: <strong>cache hit</strong>.', flood: { paths: ['fans>cdn'], n: 14 }, after: { cdn: { state: 'hit', sub: 'HIT 99.99%' } } },
            { title: 'Origin pe sirf ek request per edge per second', text: 'TTL khatam hone pe edge origin se ek baar poochhta hai.', go: ['cdn>org', 'res:org>cdn'], after: { org: { load: 8, state: 'ok', sub: '~300 req/s' } }, msg: 'GET /match/42/score.json   (edge → origin, 1/s)' },
            { title: 'Wicket!', text: 'Scorer ne update kiya. Agle 1-2 second mein saare edges naya score le lete hain, fans ke agle poll pe dikh jaata hai.', go: ['sc>org', 'res:org>cdn', 'res:cdn>fans'], msg: '{"score":"182/5","over":"18.3"}' },
          ]},
          { name: 'WebSockets (galat)', steps: [
            { title: 'Setup', text: '1 crore khule WebSocket connections, ~100 gateways pe.', show: ['gw', 'fg', 'go'], hide: ['cdn', 'fc', 'co'], set: { gw: { load: 85, state: 'hot', sub: '1 crore conn' } }, focus: ['gw'] },
            { title: 'Wicket! 1 crore pushes', text: 'Ek update ko 1 crore alag connections pe likhna hai. Ye fan-out ka kaam ab tumhare servers ka hai, CDN ka nahi.', go: ['sc>org', 'org>gw'], flood: { paths: ['res:gw>fans'], n: 14 }, msg: 'push × 10,000,000' },
            { title: 'Deploy / ek gateway crash', text: 'Gateways restart hue. Lakhs phones <em>ek saath</em> reconnect karte hain: <strong>reconnection storm</strong>.', set: { gw: { state: 'down', sub: 'restarting' } }, flood: { paths: ['fans>gw'], n: 16 }, after: { gw: { state: 'hot', load: 100, sub: 'overloaded!' } } },
            { title: 'Nateeja', text: 'Zyada servers, zyada code (gateways, heartbeats, backoff + jitter), zyada failure modes, aur fans ko koi extra faayda nahi kyunki score har kuch second hi badalta hai. Ek-tarfa + same data = polling + CDN.', focus: ['gw'] },
          ]},
        ],
      },
      { type: 'h2', text: 'Ek feature, kai tareeke' },
      { type: 'p', html: `Asli apps mein ek hi feature mein 2-3 tareeke saath chalte hain. Chat app: messages ke liye WebSocket, app band ho to mobile push notification, aur WebSocket na chal paaye to long polling fallback. AI assistant: sawaal POST se, jawab SSE se, aur "kaam khatam" ka email webhook/queue se. Decision har <em>direction aur zaroorat</em> ke liye alag lo, poori app ke liye ek nahi.` },
      { type: 'h2', text: 'Interview mein kaise bolein' },
      { type: 'list', items: [
        '"Live score ek-tarfa hai aur sabke liye same, to 2 second polling, CDN TTL 1 s. Origin pe ~300 req/s, koi persistent connection nahi."',
        '"AI ka jawab SSE pe stream hota hai; sawaal ek normal POST. Proxy timeouts ke liye keep-alive comments."',
        '"DMs ke liye WebSocket gateways, Redis mein user→gateway registry, heartbeats, aur reconnect pe backoff + jitter."',
        '"Payment gateway hamein webhook se batata hai; signature check, event ID se dedupe, turant 2xx."',
      ]},
      { type: 'diagram', title: 'xyz.com ka real-time: poori picture', height: 490,
        groups: [
          { label: 'Users', x: 4, y: 14, w: 712, h: 74 },
          { label: 'Edge', x: 4, y: 108, w: 712, h: 104 },
          { label: 'Services', x: 4, y: 236, w: 712, h: 100 },
          { label: 'Data + outside', x: 4, y: 366, w: 712, h: 108 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'phone + browser', x: 250, y: 50, w: 170, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Ek hi app mein score dekhte hain (polling), chat karte hain (WebSocket), AI se poochhte hain (SSE), aur brand se video call (WebRTC).' },
          { id: 'brand', label: 'Brand', sub: 'video call peer', x: 560, y: 50, w: 150, kind: 'client', info: 'Ye kya hai: call ke doosre taraf brand ka browser. Audio/video seedha users ke beech (WebRTC); setup messages WebSocket gateway se.' },
          { id: 'cdn', label: 'CDN edges', sub: 'score JSON, 1 s', x: 90, y: 170, w: 140, kind: 'edge', info: 'Ye kya hai: users ke paas ke cache servers. Live score sabke liye same, to har poll edge pe hi khatam; origin ko har edge se ~1 request/sec.' },
          { id: 'gw', label: 'WS gateways', sub: 'chat, signaling', x: 330, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: WebSocket servers jinse users ke khule connections jude hain. DMs, typing, read receipts, aur video call ki signaling yahin se.' },
          { id: 'ai', label: 'AI service', sub: 'SSE stream', x: 560, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: creator ka AI assistant. Sawaal POST se aata hai, jawab text/event-stream pe token by token jaata hai.' },
          { id: 'score', label: 'Score service', sub: 'origin', x: 90, y: 300, w: 140, kind: 'server', info: 'Ye kya hai: asli score ka server. CDN ki wajah se lakhs fans ke bawajood isko sirf kuch sau requests/sec.' },
          { id: 'chat', label: 'Chat service', sub: 'saves messages', x: 330, y: 300, w: 150, kind: 'server', info: 'Ye kya hai: chat ka backend. Message DB mein save karta hai, phir Redis pe publish taaki sahi gateway push kare.' },
          { id: 'pay', label: 'Payments', sub: 'webhook endpoint', x: 560, y: 300, w: 150, kind: 'server', info: 'Ye kya hai: payments service ka /webhooks/payments endpoint. Signature verify, event ID se dedupe, turant 2xx, bhaari kaam queue mein.' },
          { id: 'scorer', label: 'Scorer app', sub: 'stadium', x: 90, y: 430, w: 140, kind: 'client', info: 'Ye kya hai: stadium mein scorer ka app. Har ball ke baad score service ko update bhejta hai.' },
          { id: 'redis', label: 'Redis', sub: 'registry + pub/sub', x: 330, y: 430, w: 170, kind: 'data', info: 'Ye kya hai: yaad rakhta hai kaun user kis gateway pe hai (registry), aur pub/sub se message us gateway tak pahunchata hai.' },
          { id: 'rzp', label: 'Razorpay', sub: 'payment gateway', x: 560, y: 430, w: 150, kind: 'net', info: 'Ye kya hai: bahar ki payment company. Payment hote hi hamare webhook URL pe signed POST bhejti hai, fail ho to retry karti hai.' },
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
          { name: 'Live score', text: 'Scorer update bhejta hai; fans har 2 s poll karte hain; CDN edge jawab deta hai, origin ko sirf ~1 request/sec per edge.', go: ['scorer>score', 'users>cdn>score'] },
          { name: 'Chat message', text: 'WebSocket se gateway, chat service save karke Redis pe publish, sahi gateway push karta hai.', go: ['users>gw>chat>redis>gw', 'res:gw>users'] },
          { name: 'AI answer (SSE)', text: 'Jawab token by token ek khule HTTP response pe.', go: ['res:ai>users'] },
          { name: 'Payment + call', text: 'Razorpay webhook se batata hai. Video call ka media seedha peers ke beech, signaling gateway se.', go: ['rzp>pay', 'users>brand', 'brand>gw'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Chaar sawaal: <strong>kisko</strong> (user, doosra server, call)? <strong>Direction</strong>? <strong>Kitni baar</strong>? <strong>Sabko same ya alag</strong>?</li>
        <li>Server → user only = <strong>SSE</strong>. Dono taraf, frequent = <strong>WebSocket</strong>. Server → server = <strong>webhook</strong>. Audio/video call = <strong>WebRTC</strong>.</li>
        <li>Kam updates, ya sabko same data = <strong>short polling</strong>, aur same data ho to CDN ke peeche.</li>
        <li>Persistent connection kat-ta ho = <strong>long polling</strong> fallback.</li>
        <li>"Real-time = WebSocket" galat hai: WebSocket stateful hai (gateways, registry, heartbeats, reconnection storms).</li>
        <li>Webhooks: signature verify, event ID se dedupe, jaldi 2xx.</li>
        <li>Ek app mein kai tareeke saath chalte hain; har direction ke liye alag decision.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'Polling: stateless, CDN-cacheable, sabse simple aur sabse mazboot',
        'SSE: plain HTTP pe instant ek-tarfa stream, browser khud reconnect karta hai',
        'WebSockets: dono taraf milliseconds mein; chat, games, collaboration possible',
        'Webhooks: partners ko bina polling ke turant khabar',
        'WebRTC: media seedha users ke beech, server bandwidth bachti hai',
      ], costs: [
        'Polling: interval jitni deri; personal data pe bekaar requests ka load',
        'SSE/WebSocket: persistent connections = stateful servers, gateways, reconnection storms',
        'WebSockets: L4 load balancing, heartbeats, registry, aur zyada failure modes',
        'Webhooks: public endpoint, signatures, duplicates, out-of-order events',
        'WebRTC: signaling + STUN/TURN infra, TURN relay ka bandwidth bill',
      ]},
      { type: 'think', questions: [
        { q: 'xyz.com pe "kitne log abhi ye live stream dekh rahe hain: 12,345" counter. Har 5 second update. Kaunsa tareeka?', a: 'Ek-tarfa, sabko same number, 5 second deri theek. Short polling behind CDN (TTL ~5 s). Agar page pe already ek SSE/WebSocket connection khula hai (jaise live chat ke liye), to usi pe ye number bhi bhej do; naya connection sirf iske liye mat kholo.' },
        { q: 'Tumhara SSE stream company ke office network mein har 30 second pe kat jaata hai. Kyun ho sakta hai aur kya karoge?', a: 'Beech ka proxy idle connections ko kaat raha hai. Har ~15 second ek SSE comment line (keep-alive) bhejo, aur event IDs bhejo taaki browser reconnect pe Last-Event-ID se wahin se resume kare. Phir bhi na chale to us network ke liye long polling fallback.' },
        { q: 'Uber jaisa driver app: driver har 4 second location bhejta hai aur server use naye ride requests bhejta hai. Kya chunoge?', a: 'Dono taraf, frequent, low latency: WebSockets. Location bhejna aur ride offer milna ek hi persistent connection pe. Roadmap ki table mein bhi Uber driver app WebSockets ka example hai.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'AI chatbot ka jawab word by word dikhana hai. Sabse simple sahi tareeka?', options: ['WebSockets', 'SSE', 'Webhooks'], answer: 1, explain: 'Ek-tarfa stream server → user. SSE plain HTTP pe hai aur reconnect browser khud karta hai. WebSocket chalega, par zarurat se zyada.' },
        { q: '1 crore users ko same live score har 2 second. Sabse sasta mazboot design?', options: ['1 crore WebSockets', 'Short polling behind a CDN', 'Har user ke liye webhook'], answer: 1, explain: 'Same data = CDN cache. Origin ko har edge se second mein ek request; lakhs persistent connections ka jhanjhat nahi.' },
        { q: 'Payment gateway ko tumhare server ko batana hai ki payment ho gaya. Kya?', options: ['Webhook', 'SSE', 'WebRTC'], answer: 0, explain: 'Server se server notification = webhook. Signature verify karo, event ID se dedupe karo, jaldi 2xx do.' },
        { q: 'Corporate network persistent connections kaat deta hai, lekin chat chahiye. Fallback?', options: ['Long polling', 'WebRTC', 'Kuch nahi ho sakta'], answer: 0, explain: 'Long polling normal request-response hai, to proxies isse kam kaat-te hain. Libraries jaise Socket.IO isi pe fallback karti hain.' },
      ]},
      { type: 'sources', note: 'Protocol behaviour official specs se; decision table roadmap phase 5 se. Gateway ~100k connections ek rough thumb rule hai, benchmark nahi.', items: [
        { title: 'HTML Living Standard: Server-sent events', publisher: 'WHATWG', official: true, url: 'https://html.spec.whatwg.org/multipage/server-sent-events.html', used: 'text/event-stream, automatic reconnect, Last-Event-ID, keep-alive comment lines.' },
        { title: 'RFC 6455: The WebSocket Protocol', publisher: 'IETF', official: true, url: 'https://www.rfc-editor.org/rfc/rfc6455', used: 'Persistent two-way connection over an HTTP upgrade.' },
        { title: 'Introduction to WebRTC protocols (ICE, STUN, TURN)', publisher: 'MDN Web Docs', official: true, url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols', used: 'STUN public address batata hai; TURN relay jab seedha raasta na mile.' },
        { title: 'Razorpay Webhooks', publisher: 'Razorpay documentation', official: true, url: 'https://razorpay.com/docs/webhooks/', used: 'Signed webhook POSTs, signature validation, retries aur duplicate events.' },
        { title: 'Socket.IO: How it works', publisher: 'Socket.IO documentation', official: true, url: 'https://socket.io/docs/v4/how-it-works/', used: 'HTTP long-polling transport as fallback alongside WebSocket.' },
      ]},
    ],
  });
})();
