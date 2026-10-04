Lesson.register({
  id: 'design-whatsapp',
  title: 'WhatsApp / chat',
  minutes: 45,
  summary: `Riya ka "hi" Aman ke phone pe ek second se kam mein pahunchna chahiye, chahe Aman hazaar servers mein se kisi se bhi juda ho, ya uska phone band ho. Hum chat app zero se banayenge: hamesha khula connection, "kaun kahan juda hai" ki list, messages ka safe store, ticks (sent / delivered / read), group messages, offline users, photos aur end-to-end encryption. Har hissa tab aayega jab koi problem use zaroori banaye.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum phone pe "hi" likhte ho aur doosre phone pe turant "hi" aa jaata hai. Beech mein WhatsApp ke server hain. Mushkil ye hai ki crore log ek saath online hain, hazaaron alag servers se jude hain, kuch ke phone band hain, aur network baar baar toot-ta hai. Is lesson mein hum ek "digital dakiya" banayenge jo jaanta hai ki kaun kis server se juda hai, har message pehle safe rakhta hai, phir pahunchaata hai, aur ticks se batata hai ki message kahan tak pahuncha. Aur ye sab bina message padhe, kyunki message taale mein band hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: Riya ne "hi" bheja. Aman ka phone online hai, lekin kisi aur server se juda hai. Message wahan kaise pahunchega? Aur agar Aman ka phone band ho to? Phir yahan compare karo.` },
    { type: 'p', html: `Ye lesson <a href="#/realtime">Polling, SSE, WebSockets</a> wale lesson ke "gateways aur registry" hisse se aage badhta hai. Wahan humne dekha ki message ek gateway se doosre tak kaise route hota hai. Ab poora product banayenge: storage, ordering, ticks, groups, media, encryption. Aur jahan ho sake, dekhenge ki WhatsApp, Discord aur Slack ne asal mein kya kiya (unke engineering posts aur WhatsApp ke security whitepaper se).` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• 1:1 chat: text message bhejo, turant pahunche<br>• Group chat (sau se hazaar members tak)<br>• Ticks: sent ✓, delivered ✓✓, read (blue) ✓✓<br>• Offline user ko baad mein mile + phone pe notification<br>• Photos, videos, voice notes (media)<br>• Online / last seen (nice to have)<br><br><strong>Out of scope:</strong> voice/video calls (wo <a href="#/realtime">WebRTC</a> ka topic hai), payments, stories` },
      right: { title: 'Non-functional', html: `• Low latency: online user ko &lt; 1 second<br>• Koi message khoye nahi (durability)<br>• Ek chat ke andar order sahi rahe<br>• Duplicate na dikhe (retry pe bhi)<br>• Bahut high availability: chat app down = log ghabra jaate hain<br>• Privacy: end-to-end encryption, server message padh na sake` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: end-to-end encryption (E2EE)', html: `<strong>Ye kya hai:</strong> message sender ke phone pe hi taale mein band (encrypt) hota hai, aur sirf receiver ke phone pe khulta (decrypt) hai. Taala lage message ko <em>ciphertext</em> kehte hain: bina chaabi ke wo bas bekaar ke akshar hain.<br><strong>Kyun chahiye:</strong> privacy. Beech ke saare servers, WhatsApp ke apne bhi, sirf taala laga dabba dekhte hain, andar ka text nahi.<br><strong>Iske bina:</strong> server hack ho, ya koi andar ka insaan galat kaam kare, to sabki chats padhi ja sakti hain.<br><strong>Design pe asar:</strong> server message padh ke kuch nahi kar sakta (search, spam filter). Wo sirf <em>dakiya</em> hai. Deep dive 5 mein detail.` },

    { type: 'h2', text: 'Step 2: chat ke basics, bilkul zero se' },
    { type: 'p', html: `Koi diagram banane se pehle, ek ek hissa samjhte hain. Har hissa ek problem se aayega.` },
    { type: 'h3', text: '2a. Phone ko naya message kaise pata chale?' },
    { type: 'p', html: `Normal website mein phone poochhta hai, server jawab deta hai, aur baat khatam (<a href="#/how-the-web-works">HTTP request</a>). Lekin chat mein message <strong>kabhi bhi</strong> aa sakta hai. Agar Aman ka phone har second poochhe "koi naya message?", to 99% baar jawab "nahi" hoga. Crore phones × har second = server pe bekaar ka toofan, aur battery khatam. Isliye chat app ek <strong>hamesha khula connection</strong> rakhta hai, jisse server khud bol sake "ye lo, naya message".` },
    { type: 'callout', tone: 'term', title: 'Naya word: WebSocket', html: `<strong>Ye kya hai:</strong> phone aur server ke beech ek lambi chalne wali, dono taraf khuli line. Ek baar connect karo, phir dono taraf se kabhi bhi chhote messages (frames) bhejo. Jaise phone call jo kaata hi nahi gaya.<br><strong>Kyun chahiye:</strong> server ko jab message aaye, turant phone tak "push" kar sake, bina phone ke poochhe.<br><strong>Iske bina:</strong> phone ko baar baar poochhna padega (polling): ya to der se message milega, ya server aur battery pe bhaari load. Detail <a href="#/realtime">Polling, SSE, WebSockets</a> lesson mein.` },
    { type: 'h3', text: '2b. Crore connections: gateway servers' },
    { type: 'p', html: `Har online phone ka ek khula WebSocket hai. 10 crore phones online = 10 crore khule connections. Koi ek server itne nahi pakad sakta. To humein bahut saare servers chahiye jinka <strong>sirf ek kaam</strong> ho: connections pakad ke rakhna.` },
    { type: 'callout', tone: 'term', title: 'Naya word: connection gateway', html: `<strong>Ye kya hai:</strong> ek server jo lakhon phones ke khule WebSockets pakad ke rakhta hai. Phone ka "darwaza" hai. Ye login token check karta hai, heartbeat sunta hai, aur frames aage-peeche pass karta hai. Message ka koi faisla ye nahi karta.<br><strong>Kyun chahiye:</strong> connections pakadna ek alag tarah ka kaam hai (bahut RAM, kam CPU). Ise alag rakhne se baaki services aaram se badal aur scale ho sakti hain.<br><strong>Iske bina:</strong> har service ko khud connections sambhalne padte; ek service restart hoti to lakhon phones ka connection toot-ta.<br><strong>Example:</strong> WhatsApp ne 2012 mein ek hi server pe 20 lakh se zyada connections dikhaye the.` },
    { type: 'callout', tone: 'term', title: 'Naya word: L4 load balancer', html: `<strong>Ye kya hai:</strong> gateways ke aage baitha ek "traffic police". Naya phone connect karne aaye to use kisi ek gateway pe bhej deta hai. "L4" ka matlab: ye sirf TCP connection dekhta hai (IP aur port), message ke andar nahi jhaankta. Isliye bahut tez hai.<br><strong>Kyun chahiye:</strong> phone ko pata nahi hona chahiye ki 1,000 gateways mein se kaunsa khaali hai.<br><strong>Iske bina:</strong> sab phones ek hi gateway pe jaate, ya phone ko khud gateways ki list rakhni padti. Detail <a href="#/load-balancer">Load balancer</a> lesson mein.` },
    { type: 'h3', text: '2c. Naya problem: Aman kis gateway pe hai?' },
    { type: 'p', html: `Riya Gateway 3 pe judi hai. Aman Gateway 812 pe. Riya ka message Gateway 3 pe aaya. Ab Gateway 3 ko kaise pata chale ki Aman 812 pe hai? Saare 1,000 gateways se poochhna ("Aman tumhare paas hai?") bahut mehenga hai. Humein ek <strong>phone book</strong> chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: session registry', html: `<strong>Ye kya hai:</strong> ek tez in-memory table (jaise Redis): "Aman → Gateway 812", "Riya → Gateway 3". Phone connect hota hai to gateway yahan likhta hai; disconnect pe hata deta hai.<br><strong>Kyun chahiye:</strong> message route karne se pehle ek hi lookup mein pata chal jaaye ki recipient kahan hai, ya online hi nahi hai.<br><strong>Iske bina:</strong> har message pe saare gateways se poochhna padta (broadcast), ya message galat jagah jaata.` },
    { type: 'callout', tone: 'term', title: 'Naye words: heartbeat aur TTL', html: `<strong>Heartbeat:</strong> <strong>Ye kya hai:</strong> phone har ~30 second ek chhota "main zinda hoon" frame bhejta hai. <strong>Kyun chahiye:</strong> mobile connection chupchaap mar sakta hai (lift, tunnel); bina heartbeat ke gateway ko pata hi nahi chalega.<br><strong>TTL (time to live):</strong> <strong>Ye kya hai:</strong> registry ki entry ki expiry, jaise 60 second. Har heartbeat pe expiry aage badhti hai. <strong>Kyun chahiye:</strong> agar gateway hi crash ho jaaye to wo entries hata nahi payega; TTL unhe apne aap mita deta hai.<br><strong>Iske bina:</strong> registry mein purani (stale) entries reh jaati: "Aman → Gateway 812", jabki 812 kab ka mar chuka.` },
    { type: 'p', html: `Khud chala ke dekho. 3 gateways hain, 6 log. Kisi ko connect/disconnect karo, Riya se message bhejo, ek gateway crash karo, aur registry ko dekho. Ek baat note karo: crash ke baad registry mein <strong>stale</strong> entry tab tak rehti hai jab tak TTL khatam na ho (yahan "30 s aage" do baar).` },
    { type: 'custom', render(el) {
      const N = ['Riya', 'Aman', 'Zoya', 'Kabir', 'Meera', 'Dev'];
      let t, U, reg, alive, log, seed, broken;
      const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const load = g => N.filter(n => U[n] === g).length;
      const connect = n => {
        const ok = [0, 1, 2].filter(g => alive[g]);
        if (!ok.length) { log.push(`${n}: koi gateway zinda nahi, connect nahi ho paaya.`); return; }
        const g = ok.reduce((b, x) => load(x) < load(b) ? x : b, ok[0]);
        U[n] = g; reg[n] = { g, exp: t + 60 }; broken.delete(n);
        log.push(`${n} connect: L4 LB ne sabse khaali G${g + 1} diya. Registry: ${n} → G${g + 1} (TTL 60 s).`);
      };
      const reset = () => {
        t = 0; seed = 12345; U = {}; reg = {}; alive = [true, true, true]; log = []; broken = new Set();
        N.forEach(n => U[n] = null);
        ['Riya', 'Aman', 'Zoya', 'Kabir'].forEach(connect);
        log = ['Shuru: Riya, Aman, Zoya, Kabir online. Meera aur Dev offline.'];
      };
      el.innerHTML = `<div class="wgr-gws" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px">
          <div><div style="font-weight:600;margin-bottom:4px">Log aur unke phone</div><div class="wgr-users" style="display:grid;gap:4px"></div></div>
          <div><div style="font-weight:600;margin-bottom:4px">Session registry <span class="wgr-t" style="color:var(--ink-3);font-weight:400"></span></div><div class="wgr-reg" style="font-family:var(--f-mono);font-size:13px;display:grid;gap:3px"></div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">
          <label style="display:flex;gap:6px;align-items:center">Riya → <select class="wgr-to"></select></label>
          <button type="button" class="btn small primary wgr-send">Message bhejo</button>
          <button type="button" class="btn small wgr-tick">30 s aage (heartbeat)</button>
          <button type="button" class="btn small wgr-rec">Toote phones reconnect</button>
          <button type="button" class="btn small ghost wgr-reset">Reset</button>
        </div>
        <div class="calc-note wgr-log" style="max-height:150px;overflow:auto"></div>`;
      const q = s => el.querySelector(s);
      q('.wgr-to').innerHTML = N.slice(1).map(n => `<option>${n}</option>`).join('');
      const draw = () => {
        q('.wgr-gws').innerHTML = [0, 1, 2].map(g => `<div style="border:1px solid ${alive[g] ? 'var(--line)' : 'var(--red)'};border-radius:var(--r-sm);padding:8px;background:var(--surface-2)">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><strong>Gateway G${g + 1}</strong><span style="color:${alive[g] ? 'var(--green)' : 'var(--red)'};font-size:13px">${alive[g] ? 'zinda' : 'DOWN'}</span></div>
          <div style="min-height:24px;margin:6px 0;font-size:13px">${N.filter(n => U[n] === g).join(', ') || '<span style="color:var(--ink-3)">koi nahi</span>'}</div>
          <button type="button" class="btn small ghost" data-g="${g}">${alive[g] ? 'Crash karo' : 'Wapas chalu'}</button></div>`).join('');
        q('.wgr-users').innerHTML = N.map(n => {
          const st = U[n] != null ? `online (G${U[n] + 1})` : broken.has(n) ? 'connection toota' : 'offline';
          return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><strong style="min-width:52px">${n}</strong><span style="color:var(--ink-2);font-size:13px;min-width:110px">${st}</span>
            <button type="button" class="btn small ghost" data-u="${n}">${U[n] != null ? 'App band' : 'App kholo'}</button></div>`;
        }).join('');
        q('.wgr-t').textContent = `(time: ${t} s)`;
        const rows = Object.entries(reg);
        q('.wgr-reg').innerHTML = rows.length ? rows.map(([n, r]) => {
          const stale = !alive[r.g];
          return `<div style="color:${stale ? 'var(--red)' : 'var(--ink)'}">${n} → G${r.g + 1}  (${r.exp - t} s baaki)${stale ? '  STALE' : ''}</div>`;
        }).join('') : '<div style="color:var(--ink-3)">khaali</div>';
        q('.wgr-log').innerHTML = log.slice(-6).map(x => '• ' + x).join('<br>');
        el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
          const g = +b.dataset.g;
          if (alive[g]) {
            alive[g] = false;
            const lost = N.filter(n => U[n] === g); lost.forEach(n => { U[n] = null; broken.add(n); });
            log.push(`G${g + 1} crash! ${lost.join(', ') || 'koi nahi'} ka connection toota. Registry entries abhi bhi hain (gateway mita hi nahi paaya): STALE.`);
          } else { alive[g] = true; log.push(`G${g + 1} wapas chalu (khaali). Naye connections yahan aa sakte hain.`); }
          draw();
        });
        el.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
          const n = b.dataset.u;
          if (U[n] != null) { U[n] = null; delete reg[n]; log.push(`${n} ne app band kiya: gateway ne saaf disconnect dekha aur registry se entry hata di.`); }
          else connect(n);
          draw();
        });
      };
      q('.wgr-send').onclick = () => {
        const to = q('.wgr-to').value, r = reg[to];
        if (U.Riya == null) log.push('Riya khud online nahi hai: message uske phone pe ruka hai (clock icon). Pehle Riya ka app kholo.');
        else if (!r) log.push(`Riya → ${to}: registry mein ${to} nahi mila = offline. Message store mein safe (✓), aur push notification bhejo.`);
        else if (!alive[r.g]) log.push(`Riya → ${to}: registry kehti hai G${r.g + 1}, lekin G${r.g + 1} DOWN hai. Bhejna fail. Message store mein safe hai (✓); ${to} reconnect karke resume karega.`);
        else log.push(`Riya → ${to}: G${U.Riya + 1} → chat service → registry: ${to} → G${r.g + 1} → ${to} ke phone tak. Ek hi lookup, turant delivery (✓✓).`);
        draw();
      };
      q('.wgr-tick').onclick = () => {
        t += 30;
        N.forEach(n => { if (U[n] != null) reg[n].exp = t + 60; });
        const gone = Object.keys(reg).filter(n => reg[n].exp <= t);
        gone.forEach(n => delete reg[n]);
        log.push(`+30 s: online phones ne heartbeat bheja, unka TTL wapas 60 s.${gone.length ? ' TTL khatam, entries hatin: ' + gone.join(', ') + '.' : ''}`);
        draw();
      };
      q('.wgr-rec').onclick = () => {
        const uniq = N.filter(n => broken.has(n));
        if (!uniq.length) { log.push('Koi toota hua connection nahi.'); draw(); return; }
        uniq.forEach(n => { const d = (rnd() * 10).toFixed(1); log.push(`${n} ka app ${d} s random wait (jitter) ke baad reconnect karta hai.`); connect(n); });
        draw();
      };
      q('.wgr-reset').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Registry mein entry hai, matlab user online hai." Hamesha nahi! Gateway crash ho to entry TTL khatam hone tak <strong>stale</strong> rehti hai. Isliye rule: message <strong>pehle store mein save</strong>, phir bhejne ki koshish. Bhejna fail ho jaaye to kuch nahi khota; user reconnect karke jo miss hua wo le leta hai.` },
    { type: 'h3', text: '2d. Message ko pehle safe jagah rakho' },
    { type: 'p', html: `Gateway sirf darwaza hai. Message ka asli kaam (ID dena, save karna, sahi gateway dhoondhna) ek alag service karti hai. Aur message ek database mein save hota hai, taaki koi server gire to bhi message na khoye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: chat service', html: `<strong>Ye kya hai:</strong> chat ka "dimaag". Har message ko ek ID deta hai, use store mein save karta hai, registry se recipient ka gateway dhoondhta hai aur wahan bhejta hai.<br><strong>Kyun chahiye:</strong> ye <em>stateless</em> hai (apne paas koi connection ya data nahi rakhta), isliye iski 10 ya 100 copies chala sakte hain.<br><strong>Iske bina:</strong> ye kaam gateway pe hota; gateway crash = connections bhi gaye aur adhe kaam bhi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: message store', html: `<strong>Ye kya hai:</strong> wo database jahan messages durable (disk pe, kai copies mein) likhe jaate hain.<br><strong>Kyun chahiye:</strong> recipient offline ho, ya gateway crash ho, to message yahan intezaar karta hai.<br><strong>Iske bina:</strong> message sirf kisi server ki RAM mein hota; server gira, message gaya. Ise kaise design karein, Deep dive 1 mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: ack aur ticks', html: `<strong>Ack (acknowledgement):</strong> "mil gaya" ka chhota jawab. <strong>Ticks:</strong> WhatsApp ke ✓ (server ke paas safe), ✓✓ grey (Aman ke phone tak pahuncha), ✓✓ blue (Aman ne padh liya).<br><strong>Kyun chahiye:</strong> Riya ko pata chale message kahan tak pahuncha, aur phone ko pata chale ki dobara bhejna hai ya nahi.<br><strong>Iske bina:</strong> phone andaaza lagata: ya baar baar bhejta (duplicates), ya chup baith jaata (message kho sakta). Deep dive 2 mein ticks ka poora khel.` },

    { type: 'h2', text: 'Step 3: napkin maths' },
    { type: 'p', html: `Roadmap ka worked example: peak pe 100M users online, har ek ka ek WebSocket. Ek gateway server ~100k connections sambhale to ~1,000 gateways. Ab xyz.com chat ke liye khud numbers badal ke dekho (ye sab "maan lo" wale numbers hain, kisi company ke nahi):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="wa-dau">Daily active users (millions)</label><input id="wa-dau" type="number" value="500" min="1" step="1"></div>
          <div><label for="wa-on">Peak pe online, ek saath (millions)</label><input id="wa-on" type="number" value="100" min="1" step="1"></div>
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
        el.querySelector('.o-note').textContent = `Ek din me ${f(perDay)} messages. Assumptions: ek din ≈ 10^5 seconds, registry entry ≈ 100 bytes (user → gateway + TTL), ek message ≈ 200 bytes (encrypted text + IDs). Conclusion: gateways ka bada fleet chahiye, registry RAM mein fit ho jaati hai (Redis), aur message writes itne zyada hain ki ek SQL database nahi chalega.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Asli numbers se compare karo: 2014 mein (Facebook acquisition ke time) WhatsApp roz ~50 billion messages handle karta tha, aur jan 2012 ke apne blog post mein unhone ek hi FreeBSD server pe <strong>20 lakh+ TCP connections</strong> dikhaye the. Ye purane numbers hain (10+ saal), lekin sabak aaj bhi wahi hai: connections sambhalna apne aap mein ek alag engineering problem hai.` },

    { type: 'h2', text: 'Step 4: API aur data model' },
    { type: 'p', html: `Chat mein do raaste hain. Text aur ticks ek <strong>lambe khule WebSocket</strong> pe chalte hain (dono taraf se). Har chhota message ek <em>frame</em> kehlata hai, neeche JSON mein dikhaya hai. Media (photo, video) normal HTTPS upload se jaata hai, kyunki badi files ko chat connection pe bhejna us connection ko jam kar dega (Deep dive 4). <code>body</code> mein text nahi, <em>ciphertext</em> (taala laga message) hai.` },
    { type: 'code', text: `
WebSocket frames (client <-> gateway):
  → { "type": "send",    "client_msg_id": "c-77", "conv": "riya:aman", "body": <ciphertext> }
  ← { "type": "ack",     "client_msg_id": "c-77", "msg_id": 7291840011, "ts": ... }   // ✓ sent
  ← { "type": "message", "msg_id": 7291840011, "conv": "riya:aman", "from": "riya", "body": <ciphertext> }
  → { "type": "receipt", "msg_id": 7291840011, "status": "delivered" }            // ✓✓
  → { "type": "receipt", "msg_id": 7291840011, "status": "read" }                 // blue ✓✓
  → { "type": "resume",  "last_msg_id": 7291840000 }                              // reconnect pe

HTTPS (media):
  POST /media/upload-url          →  { "upload_url": "https://blob.../signed...", "media_id": "m-55" }
  PUT  <upload_url>  (encrypted bytes)` },
    { type: 'p', html: `Ab data kya kya rakhna hai. "Kahan" wale column ke naye naam (wide-column store, Redis) neeche ke sections mein ek ek karke samjhaaye gaye hain; abhi bas itna dekho ki har cheez alag tarah ki storage mein jaati hai, kyunki har ek ka kaam alag hai.` },
    { type: 'table', head: ['Entity', 'Fields', 'Kahan'], rows: [
      ['User / Device', 'user_id, device_id, public keys, push token', 'Sharded DB (by user_id)'],
      ['Conversation', 'conv_id, type (1:1 / group), members', 'Sharded DB; group members cache mein'],
      ['Message', 'conv_id, msg_id (time-ordered), sender, ciphertext, media pointer', 'Wide-column store, partition = conversation'],
      ['Receipt', 'msg_id, user/device, status, ts', 'Message ke saath, ya alag chhota table'],
      ['Session', 'user/device → gateway', 'Registry (Redis), TTL ke saath'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: client_msg_id', html: `<strong>Ye kya hai:</strong> ek random ID jo phone khud har message ko deta hai, server pe bhejne se pehle (jaise "c-77").<br><strong>Kyun chahiye:</strong> network ne jawab nahi diya to phone wahi message dobara bhejta hai (retry). Server dekhta hai "c-77 to pehle hi aa chuka" aur naya message nahi banata.<br><strong>Iske bina:</strong> har retry pe Aman ko ek aur "hi" dikhta. Ye <a href="#/pagination-idempotency">idempotency key</a> ka hi ek roop hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: msg_id (time-ordered ID)', html: `<strong>Ye kya hai:</strong> server ka diya hua ID (jaise 7291840011). Iske shuru ke hisse mein time chhupa hota hai, isliye bada ID = baad ka message.<br><strong>Kyun chahiye:</strong> messages ko sahi order mein dikhana, aur "7291840000 ke baad wale do" jaisa sawaal poochhna aasaan.<br><strong>Iske bina:</strong> alag se timestamp pe sort karna padta, aur phone ki galat ghadi order bigaad deti. Detail <a href="#/unique-ids">Unique IDs</a> (Snowflake) lesson mein.` },

    { type: 'h2', text: 'Step 5: high-level design, 1:1 message' },
    { type: 'p', html: `Ab saare hisse jod ke dekhte hain. Riya Gateway A pe judi hai, Aman Gateway B pe. Gateways ke saamne L4 load balancer hai, diagram mein use gateway box ke andar hi maan lo. Kisi bhi box pe click karke uska kaam padho, phir har scenario chalao. "Ack kho gaya" aur "Gateway B crash" wale scenarios sabse zaroori hain: asli duniya mein network aur servers baar baar girte hain.` },
    { type: 'flow', title: 'Riya → Aman (dono online)', height: 330,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 70, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka phone, jis pe chat app chal raha hai. App khula ho tab ek WebSocket hamesha khula rakhta hai. Message bhejne se pehle use taale mein band (encrypt) karta hai aur ek client_msg_id deta hai, taaki retry pe duplicate na bane.' },
        { id: 'ga', label: 'Gateway A', sub: 'WebSockets', x: 255, y: 70, w: 140, kind: 'server', meter: true, load: 50, info: 'Ye kya hai: connection gateway, phones ka darwaza. Lakhon khule WebSockets pakad ke rakhta hai, login token aur heartbeat check karta hai, aur frames aage pass karta hai. Message ka koi faisla nahi karta. Iske aage L4 load balancer hai (yahan box ke andar maan lo). WhatsApp ne 2012 mein ek server pe 20 lakh+ connections dikhaye the (Erlang + FreeBSD).' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 460, y: 55, w: 130, kind: 'cache', info: 'Ye kya hai: session registry, ek tez in-memory phone book (jaise Redis): kaunsa user/device abhi kis gateway pe hai. Kyun: message route karne ke liye ek lookup kaafi. Har entry ka TTL hai jo heartbeat se badhta hai; gateway mare to uski entries apne aap expire.' },
        { id: 'chat', label: 'Chat service', sub: 'store + route', x: 460, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: chat service, chat ka dimaag. Message ko time-ordered msg_id deta hai, pehle store mein save karta hai (taaki kuch na khoye), phir registry se recipient ka gateway dhoondh ke wahan bhejta hai. Stateless hai, isliye iski kai copies chala ke aaram se scale.' },
        { id: 'store', label: 'Message store', sub: 'by conversation', x: 640, y: 170, w: 130, kind: 'data', info: 'Ye kya hai: message store, wo database jahan messages disk pe, kai copies mein, safe likhe jaate hain. WhatsApp jaisa design: jab tak deliver na ho tab tak (encrypted) rakho. Discord/Slack jaisa design: poori history hamesha ke liye, conversation ke hisaab se baant ke. Deep dive 1 mein detail.' },
        { id: 'gb', label: 'Gateway B', sub: 'WebSockets', x: 255, y: 270, w: 140, kind: 'server', meter: true, load: 50, info: 'Ye kya hai: ek aur connection gateway, jis pe Aman juda hai. Kyun alag: 1,000 gateways mein se Riya aur Aman aksar alag pe honge. Iske crash hone pe iske saare users ek saath reconnect karenge, isliye apps thoda random wait (jitter) karke wapas aate hain.' },
        { id: 'a', label: 'Aman (app)', x: 75, y: 270, w: 120, kind: 'client', info: 'Ye kya hai: Aman ka phone (receiver). Message milte hi chupchaap "delivered" receipt bhejta hai, aur jab Aman chat kholta hai to "read" receipt. Inhi se Riya ke ticks badalte hain.' },
      ],
      edges: [{ a: 'r', b: 'ga' }, { a: 'ga', b: 'chat' }, { a: 'ga', b: 'reg' }, { a: 'chat', b: 'reg' }, { a: 'chat', b: 'store' }, { a: 'chat', b: 'gb' }, { a: 'gb', b: 'reg' }, { a: 'gb', b: 'a' }, { a: 'a', b: 'ga', id: 'aga', hidden: true }],
      scenarios: [
        { name: 'Connect', steps: [
          { title: 'Riya connect', go: ['r>ga', 'ga>reg'], text: 'WebSocket khula, gateway ne token check kiya aur registry mein likha: riya → gwA (TTL 60 s).', after: { reg: { sub: 'riya→A' } }, msg: 'SET conn:riya gwA EX 60' },
          { title: 'Aman connect', go: ['a>gb', 'gb>reg'], text: 'Aman Gateway B pe aaya. Registry: aman → gwB. Har heartbeat (~30 s) pe TTL refresh.', after: { reg: { sub: 'riya→A, aman→B' } } },
        ]},
        { name: 'Happy path', steps: [
          { title: 'Riya bhejti hai', go: 'r>ga>chat', text: 'Encrypted body + client_msg_id. Gateway sirf aage pass karta hai.', msg: '{ "type":"send", "client_msg_id":"c-77", "conv":"riya:aman", "body":"<ciphertext>" }' },
          { title: 'Pehle save, phir kuch aur', go: ['chat>store', 'res:store>chat'], text: 'Chat service time-ordered msg_id deta hai aur store mein likhta hai. Ab server crash bhi ho jaaye, message khoya nahi.', msg: 'msg_id = 7291840011' },
          { title: 'Riya ko ✓ (sent)', go: 'res:chat>ga>r', text: 'Ek grey tick ka matlab: server ke paas safe pahunch gaya. Abhi Aman tak nahi.', after: { r: { sub: '✓ sent' } } },
          { title: 'Aman kahan hai?', go: ['chat>reg', 'res:reg>chat'], text: 'Registry: aman → gwB.', after: { reg: { state: 'hit' } } },
          { title: 'Push via Gateway B', go: 'chat>gb>a', text: 'Gateway B ne Aman ke khule WebSocket pe frame likh diya.', after: { a: { state: 'ok', sub: 'got 7291840011' }, reg: { state: '' } } },
          { title: 'Delivered receipt: ✓✓', go: 'evt:a>gb>chat>ga>r', text: 'Aman ke phone ne "delivered" receipt bheja; wo bhi ek chhota message hai jo ulta raasta leta hai.', after: { r: { sub: '✓✓ delivered' } }, msg: '{ "type":"receipt", "msg_id":7291840011, "status":"delivered" }' },
        ]},
        { name: 'Ack kho gaya (retry)', intro: 'Mobile network beech mein toot jaata hai. Duplicate kaise rokein?', steps: [
          { title: 'Message server tak gaya', go: 'r>ga>chat>store', text: 'Save ho gaya, msg_id 7291840011.' },
          { title: 'Ack raaste mein gum', go: 'lost:chat>ga>r', text: 'Riya ka phone tunnel mein gaya. Use ✓ (ack) nahi mila, to wo maanta hai shayad bheja hi nahi. Screen pe clock icon.', set: { r: { state: 'warn', sub: 'clock (pending)' } } },
          { title: 'Retry, same client_msg_id', go: 'r>ga>chat', text: 'Phone wahi message dobara bhejta hai, <strong>same c-77</strong> ke saath. Chat service dekhti hai: c-77 pehle se save hai. Naya message nahi banata, purana msg_id hi lauta deta hai.', msg: 'dedupe: (riya, c-77) → already 7291840011' },
          { title: 'Ab ✓, aur Aman ko sirf ek copy', go: 'res:chat>ga>r', text: 'Bina client_msg_id ke Aman ko do "hi" dikhte. Isi ko <strong>at-least-once delivery + idempotent receiver</strong> kehte hain. At-least-once: jab tak ack na mile, bhejte raho (ek se zyada baar pahunch sakta hai). Idempotent: same cheez do baar aaye to bhi nateeja ek hi baar wala.', after: { r: { state: 'ok', sub: '✓ sent' } } },
        ]},
        { name: 'Gateway B crash', intro: 'Aman ka gateway achanak gir gaya, usi waqt Riya ne message bheja.', steps: [
          { title: 'Crash', set: { gb: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'lost:gb>a', text: 'Gateway B ke saare connections ek jhatke mein gaye.' },
          { title: 'Message aaya, delivery fail', go: ['r>ga>chat>store', 'chat>reg', 'res:reg>chat', 'lost:chat>gb'], text: 'Registry mein abhi purani entry aman → gwB (TTL baaki). Bhejna fail, lekin message store mein safe hai. Riya ko ✓ hi dikhega, ✓✓ nahi.', after: { reg: { state: 'warn', sub: 'aman→B (stale)' }, r: { sub: '✓ sent' } } },
          { title: 'Aman reconnect (jitter ke saath)', show: ['aga'], go: ['a>ga', 'ga>reg'], text: 'Aman ka app heartbeat fail se samjha connection mara hua hai. Thoda random wait karke (taaki 1 lakh apps ek saath na aayein) Gateway A pe connect hua. Registry: aman → gwA.', after: { reg: { state: '', sub: 'aman→A' }, ga: { load: 75 } } },
          { title: 'Resume: jo miss hua wo lo', go: ['a>ga>chat', 'chat>store', 'res:store>chat', 'res:chat>ga>a'], text: 'App bolta hai "mere paas 7291840000 tak hai". Chat service usse naye messages bhej deti hai. Kuch nahi khoya, bas ek-do second der.', after: { a: { state: 'ok', sub: 'resumed' } }, msg: '{ "type":"resume", "last_msg_id":7291840000 }' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Gateway pe hi message save kar lo, fast rahega." Nahi! Gateway mar gaya to us RAM ke messages bhi gaye. Rule: <strong>pehle durable store mein likho, phir ✓ do, phir deliver karo</strong>. Gateway sirf ek pipe hai; uske girne se sirf connections jaane chahiye, data nahi.` },

    { type: 'h2', text: 'Step 6: Aman offline hai to?' },
    { type: 'p', html: `Phone band hai, ya app background mein hai aur OS ne WebSocket kaat diya (iPhone/Android battery bachane ke liye ye karte hain). Registry mein Aman ki koi entry nahi. Ab do kaam: message ko <strong>safe rakhna</strong>, aur Aman ke phone ko <strong>jagaana</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: push notification (APNs / FCM)', html: `<strong>Ye kya hai:</strong> phone ki screen pe upar aane wala chhota sandesh, app band ho tab bhi. Har phone OS ka apna ek hamesha-khula channel hota hai: iPhone pe <strong>APNs</strong> (Apple Push Notification service), Android pe <strong>FCM</strong> (Firebase Cloud Messaging). Hamara server Apple/Google ko bolta hai "is <em>device token</em> (phone ka pata) wale phone ko ye notification de do".<br><strong>Kyun chahiye:</strong> band app se hamara server khud baat nahi kar sakta. Phone ko jagaane ka yahi raasta hai.<br><strong>Iske bina:</strong> Aman ko tab tak pata hi nahi chalta jab tak wo khud app na khole.<br><strong>Dhyaan do:</strong> ye hamara system nahi, isliye iska delay aur reliability hamare haath mein nahi. Detail <a href="#/design-notifications">Notification system</a> lesson mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: offline inbox (pending store)', html: `<strong>Ye kya hai:</strong> har user/device ka ek "intezaar wala dabba" server pe, jisme wo messages rakhe jaate hain jo abhi us phone tak nahi pahunche.<br><strong>Kyun chahiye:</strong> Aman offline hai, lekin Riya ka message khona nahi chahiye. Aman jab bhi wapas aaye, app is dabbe se sab le leta hai (isko <em>sync</em> kehte hain).<br><strong>Iske bina:</strong> offline user ke saare messages gayab, ya Riya ko baar baar bhejna padta.<br><strong>Example:</strong> WhatsApp ki privacy policy kehti hai ki undelivered message encrypted form mein ~30 din tak rakha jaata hai, deliver hote hi server se delete.` },
    { type: 'flow', title: 'Offline delivery', height: 330,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 60, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka phone (sender). Use ✓ turant milta hai, kyunki message server ke paas safe hai. ✓✓ tab milega jab Aman ka phone message le le.' },
        { id: 'gw', label: 'Gateways', sub: 'WebSockets', x: 255, y: 160, w: 130, kind: 'server', info: 'Ye kya hai: connection gateways (phones ke darwaze). Riya aur Aman alag gateways pe ho sakte hain; diagram simple rakhne ke liye ek box. Registry lookup chat service karti hai (pichhle diagram mein dekha).' },
        { id: 'chat', label: 'Chat service', sub: 'route', x: 455, y: 160, w: 140, kind: 'server', info: 'Ye kya hai: chat service, chat ka dimaag. Registry mein Aman nahi mila (matlab offline), to message ko uske offline inbox mein rakhti hai aur push service ko bolti hai "Aman ko jagao".' },
        { id: 'store', label: 'Pending store', sub: 'per recipient', x: 640, y: 60, w: 130, kind: 'data', info: 'Ye kya hai: offline inbox, har recipient device ke undelivered messages ka dabba. Kyun: offline user ka message khoye nahi. WhatsApp ki privacy policy ke mutabik undelivered messages encrypted form mein ~30 din tak rakhe jaate hain, deliver hote hi server se delete.' },
        { id: 'push', label: 'Push service', sub: 'device tokens', x: 640, y: 270, w: 130, kind: 'queue', info: 'Ye kya hai: push service, jo har phone ka device token (Apple/Google ka diya pata) rakhti hai aur APNs/FCM ko request bhejti hai. Queue ke peeche hai, taaki APNs slow ho to chat service atke nahi. Bahut messages ek saath aayein to sabka ek hi notification (collapse) bhi kar sakti hai.' },
        { id: 'apns', label: 'APNs / FCM', sub: 'Apple / Google', x: 455, y: 280, w: 140, kind: 'net', info: 'Ye kya hai: Apple (APNs) aur Google (FCM) ki push services, jo phone tak notification pahunchaati hain. Hamare control mein nahi: kabhi der se, kabhi drop. Isliye notification sirf "jaago" ka ishara hai; asli delivery app khulne pe sync se hoti hai.' },
        { id: 'a', label: 'Aman (phone)', sub: 'offline', x: 75, y: 270, w: 120, kind: 'client', info: 'Ye kya hai: Aman ka phone, jis pe app band hai (koi WebSocket nahi). Notification aane pe, ya Aman ke khud kholne pe, app connect karta hai aur offline inbox se pending messages le leta hai (sync).' },
      ],
      edges: [{ a: 'r', b: 'gw' }, { a: 'a', b: 'gw' }, { a: 'gw', b: 'chat' }, { a: 'chat', b: 'store' }, { a: 'chat', b: 'push' }, { a: 'push', b: 'apns' }, { a: 'apns', b: 'a' }],
      scenarios: [
        { name: 'Offline → push → sync', steps: [
          { title: 'Riya bhejti hai', go: ['r>gw>chat>store', 'res:chat>gw>r'], text: 'Message pending store mein save, Riya ko ✓. Registry mein Aman nahi mila.', set: { a: { state: 'dim' } }, after: { store: { sub: 'aman: 1 pending' }, r: { sub: '✓ sent' } } },
          { title: 'Push service ko bolo', go: 'evt:chat>push>apns', text: 'Chat service ek event daalti hai; push service device token dhoondh ke APNs/FCM ko request bhejti hai.', msg: 'push(token=..., "New message")' },
          { title: 'Phone pe notification', go: 'evt:apns>a', text: 'Phone jaaga. E2EE ki wajah se server ke paas message ka text nahi hai; notification mein ya to bas "naya message" ka ishara hota hai, ya encrypted payload jo phone khud kholta hai.', after: { a: { state: 'warn', sub: 'notification' } } },
          { title: 'App connect + pending kheencho', go: ['a>gw>chat', 'chat>store', 'res:store>chat', 'res:chat>gw>a'], text: 'App ne WebSocket khola aur pending messages le liye.', after: { a: { state: 'ok', sub: 'got 1 msg' } } },
          { title: '✓✓ aur delete', go: ['evt:a>gw>chat', 'res:chat>gw>r', 'chat>store'], text: 'Delivered receipt Riya tak (✓✓). Store-and-forward design mein message ab server se hata diya jaata hai: kaam khatam, wo ab sirf dono phones pe hai.', after: { r: { sub: '✓✓ delivered' }, store: { sub: 'aman: 0 pending' } } },
        ]},
        { name: 'Push kho gaya', intro: 'APNs/FCM ne notification der se diya ya drop kar diya.', steps: [
          { title: 'Message safe', go: 'r>gw>chat>store', text: 'Pending store mein hai.', set: { a: { state: 'dim' } } },
          { title: 'Notification drop', go: ['evt:chat>push>apns', 'lost:apns>a'], text: 'Apple/Google ki taraf se notification nahi pahuncha. Ye hamare haath mein nahi.', after: { apns: { state: 'warn', sub: 'dropped' } } },
          { title: 'Koi baat nahi: sync bachata hai', go: ['a>gw>chat', 'chat>store', 'res:store>chat', 'res:chat>gw>a'], text: 'Jab bhi Aman khud app kholega, app connect karke pending maangegi. Isliye design rule: <strong>push sirf hint hai, delivery ki guarantee sync deta hai</strong>.', after: { a: { state: 'ok', sub: 'synced' } } },
        ]},
        { name: 'Phone 40 din band', steps: [
          { title: 'Pending pada hai', go: 'r>gw>chat>store', text: 'Aman ka phone kho gaya, 40 din se band.', set: { a: { state: 'down', sub: 'off' } }, after: { store: { state: 'warn', sub: 'waiting...' } } },
          { title: 'Expiry', text: 'WhatsApp ki privacy policy kehti hai: undelivered message ~30 din tak (encrypted) rakha jaata hai, phir delete. Har system ko ye limit chahiye, warna band phones ke liye storage hamesha badhta rahega. Riya ko sirf ✓ dikhta rahega.', focus: ['store'], after: { store: { state: 'dim', sub: 'expired' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Khud chalao: Aman ka offline inbox' },
    { type: 'p', html: `Aman ka app band karo, Riya se 3-4 messages bhejo, dekho inbox mein kya jama hota hai aur notification kaise ek mein "collapse" hota hai. Phir "Push drop" on karke dekho: notification nahi aaya, lekin app kholte hi sab mil gaya. Aakhir mein app band rakh ke teen baar "10 din aage" dabao: 30 din pe message expire.` },
    { type: 'custom', render(el) {
      let on, day, inbox, sent, notif, drop, log, next;
      const reset = () => { on = false; day = 0; inbox = []; sent = []; notif = 0; drop = false; log = ['Aman ka app band hai (offline).']; next = 1; };
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Riya ke bheje messages</strong><div class="wof-sent" style="font-size:14px;margin-top:6px;display:grid;gap:2px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><strong>Server: Aman ka offline inbox</strong><div class="wof-inbox" style="font-family:var(--f-mono);font-size:13px;margin-top:6px;display:grid;gap:2px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Aman ka phone</strong> <span class="wof-st"></span><div class="wof-ph" style="font-size:14px;margin-top:6px"></div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">
          <button type="button" class="btn small primary wof-send">Riya: message bhejo</button>
          <button type="button" class="btn small wof-tog"></button>
          <button type="button" class="btn small wof-day">10 din aage</button>
          <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="wof-drop"> Push drop ho (Apple/Google ki taraf se)</label>
          <button type="button" class="btn small ghost wof-reset">Reset</button>
        </div>
        <div class="calc-note wof-log" style="max-height:140px;overflow:auto"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        q('.wof-sent').innerHTML = sent.length ? sent.map(m => `<div>"msg ${m.id}" <span style="color:${m.st === 2 ? 'var(--accent)' : 'var(--ink-3)'};font-family:var(--f-mono)">${m.st === 2 ? '✓✓' : '✓'}</span>${m.exp ? ' <span style="color:var(--red)">(expired, kabhi deliver nahi hoga)</span>' : ''}</div>`).join('') : '<span style="color:var(--ink-3)">abhi kuch nahi</span>';
        q('.wof-inbox').innerHTML = inbox.length ? inbox.map(m => `<div>msg ${m.id}  (umar ${day - m.day} din)</div>`).join('') : '<span style="color:var(--ink-3)">khaali</span>';
        q('.wof-st').innerHTML = on ? '<span style="color:var(--green)">online</span>' : '<span style="color:var(--ink-3)">offline</span>';
        q('.wof-ph').innerHTML = on ? 'Chat khuli hai, naye messages turant aate hain.' : notif ? `Notification: <strong>${notif === 1 ? 'Riya: 1 naya message' : 'Riya: ' + notif + ' naye messages'}</strong>` : '<span style="color:var(--ink-3)">koi notification nahi</span>';
        q('.wof-tog').textContent = on ? 'Aman: app band karo' : 'Aman: app kholo (sync)';
        q('.wof-log').innerHTML = log.slice(-6).map(x => '• ' + x).join('<br>');
      };
      q('.wof-send').onclick = () => {
        const m = { id: next++, day, st: 1, exp: false }; sent.push(m);
        if (on) { m.st = 2; log.push(`msg ${m.id}: Aman online hai, seedha WebSocket pe. Riya ko ✓✓.`); }
        else {
          inbox.push(m);
          if (drop) log.push(`msg ${m.id}: inbox mein safe (✓). Push bheja, lekin raaste mein drop ho gaya.`);
          else { notif = inbox.length; log.push(`msg ${m.id}: inbox mein safe (✓). Push: ${notif === 1 ? 'naya notification.' : 'purana notification update (collapse), ab "' + notif + ' naye messages".'}`); }
        }
        draw();
      };
      q('.wof-tog').onclick = () => {
        on = !on;
        if (on) {
          const n = inbox.length;
          inbox.forEach(m => m.st = 2); inbox = []; notif = 0;
          log.push(n ? `Aman ne app khola: sync se ${n} message(s) mile. Riya ko ✓✓, aur server ke inbox se delete.` : 'Aman ne app khola: inbox khaali tha.');
        } else log.push('Aman ne app band kiya: WebSocket band, registry se entry hati.');
        draw();
      };
      q('.wof-day').onclick = () => {
        day += 10;
        const gone = inbox.filter(m => day - m.day >= 30);
        gone.forEach(m => m.exp = true);
        inbox = inbox.filter(m => day - m.day < 30);
        if (notif > inbox.length) notif = inbox.length;
        log.push(`Din ${day}.` + (gone.length ? ` 30 din poore: msg ${gone.map(m => m.id).join(', ')} server se delete. Riya ko hamesha ✓ hi dikhega.` : on ? '' : ' Messages abhi bhi inbox mein intezaar kar rahe hain.'));
        draw();
      };
      q('.wof-drop').onchange = e => { drop = e.target.checked; draw(); };
      q('.wof-reset').onclick = () => { reset(); q('.wof-drop').checked = false; draw(); };
      reset(); draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Push notification hi message hai." Nahi. Push sirf ek <strong>ghanti</strong> hai jo phone ko jagaati hai. Message to server ke offline inbox mein hai, aur app khulne pe sync se aata hai. Push kho jaaye to message nahi khota; bas Aman ko thodi der se pata chalega.` },

    { type: 'h2', text: 'Deep dive 1: messages kahan aur kaise store hon?' },
    { type: 'p', html: `Yahan do bilkul alag product decisions hain, aur dono real hain:` },
    { type: 'compare',
      left: { title: 'Store-and-forward (WhatsApp style)', html: `Server sirf <strong>postman</strong>. Message tab tak rakho jab tak deliver na ho, phir delete. History phone pe rehti hai (aur user ke apne backup mein).<br><br>WhatsApp ke 2014 ke Erlang Factory talk ke summary ke mutabik messages server pe tab tak queue mein rehte the jab tak client reconnect na kare, aur accept hote hi hata diye jaate the. Aaj ki privacy policy bhi yahi kehti hai (undelivered: ~30 din).<br><br>Faayda: storage chhota, privacy zyada. Nuksaan: naye phone pe history server se nahi milti.` },
      right: { title: 'Permanent history (Discord / Slack style)', html: `Server pe <strong>poori history</strong> hamesha ke liye. Naye device pe login karo, saari purani chat scroll karo, search karo.<br><br>Discord ne 2017 aur 2023 ke posts mein bataya ki unke messages ek wide-column database mein <strong>channel ke hisaab se partition</strong> hote hain, time-ordered IDs ke saath.<br><br>Faayda: multi-device aur search aasaan. Nuksaan: petabytes storage, aur E2EE ke saath server-side search mushkil.` },
    },
    { type: 'p', html: `Interview mein dono batao aur product se decide karo. Ab "permanent history" wala store design karte hain, kyunki wo zyada mushkil hai. Access pattern dekho: lagbhag hamesha <em>"is conversation ke latest 50 messages do"</em>, aur scroll up pe <em>"isse purane 50"</em>. Kabhi "saare users ke saare messages" nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: wide-column store (Cassandra / ScyllaDB)', html: `<strong>Ye kya hai:</strong> ek database jo bahut zyada writes ke liye bana hai (andar LSM tree, <a href="#/db-internals">DB internals</a> mein dekha). Data ek <strong>partition key</strong> se alag alag servers mein baant-ta hai (jaise conversation_id), aur ek partition ke andar rows ek <strong>clustering key</strong> se sorted rehti hain (jaise message_id).<br><strong>Kyun chahiye:</strong> chat mein har second lakhon messages likhe jaate hain, aur padhte waqt sawaal hamesha ek hi type ka: "is chat ke latest 50". Ye ek partition se, already sorted, ek seedhi read mein mil jaata hai.<br><strong>Iske bina:</strong> ek normal SQL database itne writes pe hafne lagta, aur har read pe bade table mein sort karna padta.<br><strong>Kya nahi milta:</strong> joins aur complex queries.` },
    { type: 'code', text: `
-- Discord ka schema (2017 post), simple shabdon mein
CREATE TABLE messages (
  channel_id  bigint,
  bucket      int,        -- time window: ~10 din ka ek bucket
  message_id  bigint,     -- Snowflake: time-ordered
  author_id   bigint,
  content     text,
  PRIMARY KEY ((channel_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- "Latest 50": ek partition, already sorted
SELECT * FROM messages WHERE channel_id = ? AND bucket = ? LIMIT 50;` },
    { type: 'list', items: [
      `<strong>Partition key = conversation</strong>: ek chat ki history ek jagah. Roadmap ka rule bhi yahi: chat messages ko conversation_id se shard karo (<a href="#/sharding">sharding</a>).`,
      `<strong>message_id time-ordered</strong>: Snowflake jaise ID mein shuru ke bits time hote hain, to ID se sort = time se sort. Alag table ya alag sort ki zaroorat nahi. Detail <a href="#/unique-ids">Unique IDs</a> lesson mein.`,
      `<strong>bucket kyun?</strong> Bina bucket ke ek purani, busy chat ka partition hamesha badhta rahega. Discord ne 2017 mein likha ki unhone ~10 din ke bucket chune taaki partitions ~100 MB se chhote rahein.`,
    ]},
    { type: 'p', html: `Khud dekho bucket size ka partition pe kya asar hota hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="wa-mpd2">Is chat mein messages per day</label><input id="wa-mpd2" type="number" value="20000" min="1" step="1"></div>
          <div><label for="wa-bytes">Ek message (bytes)</label><input id="wa-bytes" type="number" value="400" min="50" step="50"></div>
          <div><label for="wa-bd">Bucket size (din): <strong class="o-bdv"></strong></label><input id="wa-bd" type="range" min="1" max="60" step="1" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Ek partition ka size</span><strong class="o-ps"></strong></div>
          <div class="stat"><span>"Latest 50" ke liye partitions</span><strong class="o-np"></strong></div>
          <div class="stat"><span>Verdict</span><strong class="o-vd"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const g = s => el.querySelector(s);
      const upd = () => {
        const mpd = Math.max(1, Number(g('#wa-mpd2').value) || 1), b = Math.max(50, Number(g('#wa-bytes').value) || 50), d = Number(g('#wa-bd').value);
        g('.o-bdv').textContent = d;
        const mb = mpd * b * d / 1e6, perBucket = mpd * d;
        g('.o-ps').textContent = mb >= 1000 ? (mb / 1000).toFixed(1) + ' GB' : mb.toFixed(1) + ' MB';
        g('.o-np').textContent = perBucket >= 50 ? '1' : Math.ceil(50 / perBucket) + ' (khaali buckets ke alawa)';
        g('.o-vd').textContent = mb > 100 ? 'Bahut bada' : perBucket < 50 ? 'Bahut chhota' : 'Theek';
        g('.o-note').textContent = mb > 100
          ? 'Partition 100 MB se bada: database ko is ek bade tukde ko sambhalne mein mehnat (background cleanup aur memory pe dabaav), aur ye busy chat ek hi server ko garam karegi. Bucket chhota karo.'
          : perBucket < 50
            ? 'Ek bucket mein 50 se kam messages: "latest 50" ke liye kai buckets padhne padenge. Discord ne bhi likha ki chhote, kam-active servers ke liye ye random reads mehnge padte the.'
            : 'Partition chhota bhi hai aur ek read mein latest 50 mil jaate hain. Yahi balance chahiye.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'warn', title: 'Asli duniya: hot partitions (Discord, 2022-23)', html: `Discord ke 2023 post ke mutabik early 2022 tak unka Cassandra cluster 177 nodes aur trillions of messages tak pahunch gaya tha. Ek bahut bade, busy Discord server ka channel ek hi partition pe bhaari padta tha. Isko <strong>hot partition</strong> kehte hain: ek tukda itna garam ki uska server (node) slow ho jaaye, aur wo poore cluster ko slow kar de. Upar se Java ke GC pauses (memory saaf karne ke liye database thodi der ruk jaata tha). Unhone 3 kaam kiye: (1) ScyllaDB pe migrate (177 Cassandra nodes ki jagah 72 ScyllaDB nodes), (2) database ke aage Rust mein "data services" jo <strong>request coalescing</strong> karti hain: ek hi data ke liye ek saath hazaar requests aayein to DB se sirf ek query, aur jawab sabko baant do, (3) channel_id pe consistent hashing se same channel ki requests same data-service instance pe, taaki coalescing zyada kaam kare. Unke mutabik history fetch ka p99 (100 mein se sabse slow 1 request ka time) 40-125 ms se ~15 ms, aur insert ka p99 5-70 ms se ~5 ms ho gaya.` },
    { type: 'h3', text: 'Order: kaun pehle?' },
    { type: 'p', html: `Do log ek hi second mein group mein likhte hain. Sabko <strong>same order</strong> dikhna chahiye. Phone ki ghadi pe bharosa nahi (galat set ho sakti hai). Isliye order <strong>server</strong> tay karta hai: chat service message ko accept karte waqt time-ordered msg_id deta hai. Ek conversation ke andar strict order chahiye to us conversation ke writes ek hi jagah se guzaro (jaise conversation_id pe consistent hashing). Alag alag conversations ka aapas mein order kisi ko farak nahi padta, isliye ye global bottleneck nahi banta.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Snowflake ID time-ordered hai, to perfect order mil gaya." Lagbhag. Do alag servers ki ghadiyon mein kuch milliseconds ka farak ho sakta hai, to ek hi millisecond ke aas-paas ke do messages ulte ho sakte hain. Chat ke liye ye chalta hai; jahan strict order chahiye wahan per-conversation sequence number (ek hi owner se) use karo.` },

    { type: 'h2', text: 'Deep dive 2: ticks, ek state machine' },
    { type: 'p', html: `WhatsApp ki FAQ ke mutabik: ek grey tick = server tak pahunch gaya, do grey ticks = recipient ke phone tak pahunch gaya, do blue ticks = recipient ne padh liya. Group mein do ticks tab aate hain jab <strong>sab</strong> members ke phone tak pahunch jaaye, aur blue tab jab <strong>sab</strong> padh lein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: state machine', html: `<strong>Ye kya hai:</strong> ek cheez jo kuch fixed "states" mein hi ho sakti hai, aur sirf kuch fixed raaston se ek state se doosri mein jaati hai. Message ka raasta: <code>pending → sent → delivered → read</code>.<br><strong>Kyun chahiye:</strong> receipts network pe ulte order mein ya do baar aa sakte hain. Ek seedha rule chahiye ki kya karna hai.<br><strong>Rule:</strong> state sirf aage jaati hai, peeche kabhi nahi. "Delivered" agar "read" ke baad aaye to use ignore karo.<br><strong>Iske bina:</strong> blue tick wapas grey ho jaata, ya duplicate receipt se gadbad hoti.` },
    { type: 'p', html: `Chala ke dekho. Events kisi bhi order mein dabao, duplicate bhi dabao:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips wa-mode" style="padding:0"><button type="button" class="chip on" data-m="1">1:1 chat</button><button type="button" class="chip" data-m="3">Group (3 members)</button></div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:12px 0">
          <div style="font-family:var(--f-mono);font-size:30px;min-width:70px" class="wa-tick"></div>
          <div class="wa-tl" style="font-weight:600"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <button type="button" class="btn small primary wa-ack">Server ne save kiya (ack)</button>
          <label class="wa-rrw" style="display:flex;align-items:center;gap:6px"><input type="checkbox" class="wa-rr"> Aman ne read receipts OFF kiye</label>
          <button type="button" class="btn small ghost wa-reset">Reset</button>
        </div>
        <div class="wa-rows" style="display:grid;gap:6px"></div>
        <div class="calc-note wa-log" style="max-height:140px;overflow:auto"></div>`;
      const names = ['Aman', 'Zoya', 'Kabir'];
      const R = { none: 0, delivered: 1, read: 2 };
      let n = 1, ack = false, st = [], log = [], rrOff = false;
      const reset = () => { ack = false; st = names.slice(0, n).map(() => 0); log = ['Message type kiya, bhejna shuru. Network ka wait (clock icon).']; };
      const tick = () => {
        if (!ack) return { s: '◷', c: 'var(--ink-3)', t: 'Pending: abhi server tak nahi pahuncha' };
        const min = Math.min(...st);
        if (min >= 2 && !(n === 1 && rrOff)) return { s: '✓✓', c: 'var(--accent)', t: n === 1 ? 'Read: Aman ne padh liya (blue)' : 'Read: sab members ne padh liya (blue)' };
        if (min >= 1) return { s: '✓✓', c: 'var(--ink-3)', t: n === 1 ? 'Delivered: Aman ke phone tak (grey)' : 'Delivered: sab ke phone tak (grey)' };
        return { s: '✓', c: 'var(--ink-3)', t: 'Sent: server ke paas safe' };
      };
      const ev = (i, to) => {
        if (!ack) { log.push(`${names[i]}: receipt aaya, lekin server ne abhi message accept hi nahi kiya. Ye ho hi nahi sakta: pehle ack.`); return; }
        if (to === 2 && n === 1 && rrOff) { if (st[i] < 1) st[i] = 1; log.push(`${names[i]}: chat khola aur padha, lekin read receipts OFF hain, to "read" receipt bheja hi nahi gaya (sirf delivered, agar pehle nahi gaya tha).`); return; }
        const was = st[i];
        if (to <= was) log.push(`${names[i]}: "${to === 1 ? 'delivered' : 'read'}" receipt aaya, lekin state pehle se "${['sent', 'delivered', 'read'][was]}" hai. Ignore (state peeche nahi jaati, duplicate bhi safe).`);
        else { st[i] = to; log.push(`${names[i]}: ${['', 'delivered', 'read'][to]}${to === 2 && was === 0 ? ' (read aaya pehle; read ka matlab delivered bhi, to seedha read)' : ''}.`); }
      };
      const draw = () => {
        const tk = tick(), q = s => el.querySelector(s);
        q('.wa-tick').textContent = tk.s; q('.wa-tick').style.color = tk.c; q('.wa-tl').textContent = tk.t;
        q('.wa-rrw').style.display = n === 1 ? 'flex' : 'none';
        q('.wa-rows').innerHTML = names.slice(0, n).map((nm, i) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 8px;border:1px solid var(--line);border-radius:var(--r-sm)">
          <strong style="min-width:60px">${nm}</strong><span style="color:var(--ink-2);min-width:80px">${ack ? ['sent', 'delivered', 'read'][st[i]] : '-'}</span>
          <button type="button" class="btn small ghost" data-i="${i}" data-to="1">Phone online (delivered)</button>
          <button type="button" class="btn small ghost" data-i="${i}" data-to="2">Chat khola (read)</button></div>`).join('');
        q('.wa-log').innerHTML = log.slice(-6).map(x => '• ' + x).join('<br>') + (n === 1 && rrOff ? '<br>Note: read receipts off hain, to Riya ko blue tick nahi dikhega (Aman ko bhi doosron ke blue ticks nahi dikhenge). Group mein ye setting kaam nahi karti.' : '');
        q('.wa-rows').querySelectorAll('button').forEach(b => b.onclick = () => { ev(+b.dataset.i, +b.dataset.to); draw(); });
      };
      el.querySelectorAll('.wa-mode .chip').forEach(c => c.onclick = () => {
        el.querySelectorAll('.wa-mode .chip').forEach(x => x.classList.toggle('on', x === c)); n = +c.dataset.m; reset(); draw();
      });
      el.querySelector('.wa-ack').onclick = () => { if (ack) log.push('Server ack dobara aaya: ignore.'); else { ack = true; log.push('Server ne save karke msg_id diya: ✓'); } draw(); };
      el.querySelector('.wa-rr').onchange = e => { rrOff = e.target.checked; draw(); };
      el.querySelector('.wa-reset').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `Andar kya ho raha hai: har receipt khud ek chhota message hai jo ulta raasta leta hai (Aman → gateway → chat service → Riya). Server har (msg_id, recipient) ka sabse aage wala state rakhta hai, aur sirf aage badhne pe update karta hai. Group mein Riya ka overall tick = sabse peeche wale member ka state (minimum). Isi liye 1,000 members wale group mein blue tick kabhi kabhi hi dikhta hai.` },
    { type: 'callout', tone: 'warn', title: 'Receipts bhi traffic hain', html: `Har message ke saath har recipient se 2 receipts (delivered + read). 1:1 mein 1 message = 3 chhote messages. 500 members ke group mein 1 message = 500 deliveries + ~1,000 receipts. Isliye real systems receipts ko <strong>batch</strong> karte hain (jaise "maine 7291840011 tak sab padh liya" ek hi receipt) aur group size pe limit rakhte hain.` },

    { type: 'h2', text: 'Deep dive 3: groups, ek message → bahut saare phones' },
    { type: 'p', html: `Group mein Riya ek message bhejti hai, aur wo 100 logon ke (aur unke laptops/tablets ke) paas jaana chahiye. Sawaal: copies kaun banaye, Riya ka phone ya server?` },
    { type: 'callout', tone: 'term', title: 'Naya word: fan-out', html: `<strong>Ye kya hai:</strong> ek message ko bahut saare logon/devices tak pahunchaana. Jaise ek pankha jiski hawa sab taraf jaati hai.<br><strong>Kyun chahiye:</strong> group ka har message har member device tak jaana hai.<br><strong>Kharcha:</strong> ek message = N deliveries + N ke receipts. Group bada, kaam bada. Isi wajah se groups pe size limit hoti hai.<br><strong>Server-side fan-out:</strong> phone server ko ek copy de, server baante. <strong>Client fan-out:</strong> phone khud har device ke liye alag copy bheje.` },
    { type: 'p', html: `Agar Riya ka phone har member ke liye alag copy bheje, to 100 members × 2 devices = 200 uploads, mobile data pe. Behtar: phone <strong>ek</strong> copy server ko de, aur server 200 jagah baante (<strong>server-side fan-out</strong>). Lekin E2EE ke saath server message khol nahi sakta, to wo sabke liye ek hi encrypted copy kaise bhejega? WhatsApp ke whitepaper ka jawab: <strong>Sender Keys</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Sender Key', html: `<strong>Ye kya hai:</strong> group ke liye Riya ki ek apni chaabi. Pehli baar group mein message bhejne pe Riya ka phone ek random Sender Key banata hai aur use har member device ko <em>alag alag</em>, unke private (pairwise) encrypted raaste se bhejta hai. Ye ek baar ka kaam hai.<br><strong>Kyun chahiye:</strong> uske baad har group message is Sender Key se <strong>ek hi baar</strong> taale mein band hota hai. Server wahi ek ciphertext saare members ko baant deta hai, aur har member ke paas chaabi hai, to wo khol leta hai.<br><strong>Iske bina:</strong> Riya ke phone ko har message ki 200 alag copies upload karni padtin, mobile data pe.<br><strong>Member chhode to:</strong> whitepaper ke mutabik sab apni Sender Key mita ke nayi banate hain, taaki gaya hua member aage ke messages na padh sake.` },
    { type: 'flow', title: 'Group message fan-out', height: 330,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 165, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka phone (sender). Group message ko apni Sender Key se ek hi baar taale mein band karke ek copy upload karti hai.' },
        { id: 'gw', label: 'Gateway A', x: 245, y: 165, w: 120, kind: 'server', info: 'Ye kya hai: Riya ka connection gateway (darwaza). Message ko bina khole aage group service tak pass karta hai.' },
        { id: 'grp', label: 'Group service', sub: 'members + fan-out', x: 430, y: 165, w: 150, kind: 'server', info: 'Ye kya hai: group service, jo group ke members ki list rakhti hai (cache mein, kyunki har message pe chahiye) aur har member device tak delivery karwati hai (fan-out). Bade groups ke liye ye kaam queue + workers mein baant diya jaata hai.' },
        { id: 'reg', label: 'Registry', sub: 'who is where', x: 430, y: 50, w: 130, kind: 'cache', info: 'Ye kya hai: session registry (phone book): har member device kis gateway pe hai. Ek group message pe ek hi batch lookup (Redis MGET = ek saath kai keys padho) karo, 100 alag calls nahi.' },
        { id: 'gws', label: 'Gateways', sub: 'online members', x: 630, y: 90, w: 140, kind: 'server', info: 'Ye kya hai: wo gateways jin pe online members jude hain. Ek gateway pe group ke 10 members hain to us gateway ko ek batch bhejo, 10 alag nahi.' },
        { id: 'push', label: 'Push', sub: 'offline members', x: 630, y: 250, w: 140, kind: 'queue', info: 'Ye kya hai: push service, jo offline members ko APNs/FCM se notification bhejti hai. Busy group mein har message pe notification spam lagta, isliye kai messages ka ek notification (collapse).' },
        { id: 'store', label: 'Pending store', x: 430, y: 285, w: 130, kind: 'data', info: 'Ye kya hai: offline inbox. Offline member devices ke liye message yahan intezaar karta hai (wahi ek ciphertext ka reference), jab tak wo sync na karein.' },
      ],
      edges: [{ a: 'r', b: 'gw' }, { a: 'gw', b: 'grp' }, { a: 'grp', b: 'reg' }, { a: 'grp', b: 'gws' }, { a: 'grp', b: 'push' }, { a: 'grp', b: 'store' }],
      scenarios: [
        { name: 'Normal group message', steps: [
          { title: 'Ek hi ciphertext upload', go: 'r>gw>grp', text: 'Riya ke phone ne Sender Key se ek baar encrypt kiya. Upload sirf ek.', msg: '{ "type":"send", "conv":"group:xyz-friends", "body":"<ciphertext, Sender Key>" }' },
          { title: 'Members + kaun kahan', go: ['grp>reg', 'res:reg>grp'], text: '100 members ke saare devices ki batch lookup: 60 online (12 gateways pe), baaki offline.', msg: 'MGET conn:dev1 conn:dev2 ... (200 devices)' },
          { title: 'Online ko push, offline ko store + notification', parallel: true, go: ['grp>gws', 'grp>store', 'evt:grp>push'], text: 'Server-side fan-out. Har gateway ko ek batch. Offline devices ke liye pending + notification.', after: { gws: { state: 'ok', sub: '120 devices' }, store: { sub: '80 pending' } } },
          { title: 'Receipts wapas', go: 'evt:gws>grp>gw>r', text: 'Members ke delivered/read receipts aate hain. Riya ka do-tick tab, jab sab ke phone tak pahunch jaaye.' },
        ]},
        { name: 'Pehla message (Sender Key)', intro: 'E2EE setup: Riya pehli baar is group mein likh rahi hai.', steps: [
          { title: 'Sender Key alag alag bhejo', go: 'r>gw>grp>gws', text: 'Riya ka phone Sender Key ko har member device ke liye uske pairwise session se encrypt karke bhejta hai. Ye ek baar ka mehnga kaam hai (N copies).', set: { gws: { sub: 'key → each device' } } },
          { title: 'Ab har message ek copy', go: ['r>gw>grp', 'grp>gws'], text: 'Iske baad har message ek hi ciphertext. Server use bina padhe sabko baant deta hai.', after: { gws: { state: 'ok', sub: 'decrypt with key' } } },
        ]},
        { name: 'Member ne group chhoda', steps: [
          { title: 'Kabir left', text: 'Whitepaper ke mutabik: koi member chhode to sab members apni Sender Key mita dete hain aur nayi banate hain.', focus: ['grp'], set: { grp: { sub: 'member left' } } },
          { title: 'Nayi keys, nayi distribution', go: 'r>gw>grp>gws', text: 'Agla message bhejne se pehle Riya ka phone nayi Sender Key baaki members ko pairwise bhejta hai. Kabir ke paas purani key hai, nayi nahi: aage ke messages wo nahi padh sakta, chahe server galti se use bhej bhi de.', after: { grp: { state: 'ok', sub: 'keys rotated' } } },
        ]},
        { name: 'Hot group', intro: 'Ek 1,000 member ka cricket group, match ke last over mein.', steps: [
          { title: 'Messages ki baarish', flood: { paths: ['r>gw>grp'], n: 8 }, text: 'Har second dasiyon messages, har ek ka 1,000+ devices pe fan-out, aur har ek ke 2 receipts per member.', after: { grp: { state: 'hot', sub: 'fan-out backlog' } } },
          { title: 'Kya karein?', go: ['grp>gws', 'evt:grp>push'], text: 'Fan-out ko queue + workers mein todo, gateways ko batch mein bhejo, notifications collapse karo, receipts batch karo, aur group size pe limit rakho. Ek group ka load ek hi machine pe na pade, isliye group ka kaam bhi partition karo.', after: { grp: { state: 'warn', sub: 'queued, batched' } } },
        ]},
      ],
    },
    { type: 'p', html: `Group ka kharcha khud mehsoos karo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="wa-gm">Group members: <strong class="o-gmv"></strong></label><input id="wa-gm" type="range" min="2" max="1024" step="1" value="100"></div>
          <div><label for="wa-go">Online abhi: <strong class="o-gov"></strong></label><input id="wa-go" type="range" min="0" max="100" step="5" value="60"></div>
          <div><label for="wa-gd">Devices per member (phone + laptop...)</label><input id="wa-gd" type="number" value="2" min="1" max="5" step="1"></div>
          <div><label for="wa-gr">Messages per minute in group</label><input id="wa-gr" type="number" value="10" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Deliveries per message</span><strong class="o-dl"></strong></div>
          <div class="stat"><span>Turant (online devices)</span><strong class="o-on"></strong></div>
          <div class="stat"><span>Pending (offline devices)</span><strong class="o-pd"></strong></div>
          <div class="stat"><span>Receipts per message</span><strong class="o-rc"></strong></div>
          <div class="stat"><span>Server kaam per minute</span><strong class="o-pm"></strong></div>
          <div class="stat"><span>Phone uploads: Sender Key vs bina</span><strong class="o-up"></strong></div>
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
        g('.o-note').textContent = `Ek message = ${dl} deliveries + ${rc} receipts (har member ka delivered + read; receipts ko per member gina hai). Sender Keys ke bina Riya ke phone ko har device ke liye alag ciphertext upload karna padta (${dl}). Members double karo: server ka kaam bhi lagbhag double. Isliye groups pe size limit hoti hai, aur lakhon followers wale "channels" alag tarah se design hote hain (feed jaisa, agla lesson).`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Deep dive 4: photos, videos, voice notes' },
    { type: 'p', html: `Problem: 20 MB ka video agar chat WebSocket pe bhejein, to wo pipe minute bhar jam rahega, aur us beech text messages atak jaayenge. Gateway ki RAM bhi bharegi. Isliye <strong>media alag raaste se</strong> jaata hai: phone file seedha ek alag storage mein upload karta hai, aur chat message mein sirf uska <em>pointer</em> (pata) jaata hai. Pehle teen naye hisse:` },
    { type: 'callout', tone: 'term', title: 'Naya word: object storage (blob store)', html: `<strong>Ye kya hai:</strong> badi files (photo, video, audio) rakhne ki ek sasti, bahut durable "almaari", jaise Amazon S3. Har file ek <em>object</em> ya <em>blob</em> hai, ek naam/ID ke saath. Detail <a href="#/object-storage">Object storage</a> lesson mein.<br><strong>Kyun chahiye:</strong> database chhote records ke liye hai; crore videos ke liye object storage sasta aur aasaan hai.<br><strong>Iske bina:</strong> videos chat database mein, jo bahut mehenga aur slow ho jaata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: pre-signed upload URL', html: `<strong>Ye kya hai:</strong> ek khaas link jo server kuch minute ke liye deta hai: "is link pe sirf ye ek file, sirf abhi, upload kar sakte ho".<br><strong>Kyun chahiye:</strong> phone file seedha object storage mein daal de, hamare servers ke beech se nahi. Servers halke rehte hain.<br><strong>Iske bina:</strong> har video ke saare bytes hamare servers se guzarte: bandwidth aur RAM ka bada kharcha.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDN', html: `<strong>Ye kya hai:</strong> duniya bhar mein users ke paas rakhe cache servers (edges). Ek baar file aayi to edge use rakh leta hai aur agle users ko wahin se deta hai. Detail <a href="#/cdn">CDN</a> lesson mein.<br><strong>Kyun chahiye:</strong> group mein 500 log wahi photo kholte hain; sabko door ke storage tak jaana nahi padta.<br><strong>Iske bina:</strong> har download storage tak jaata: slow aur mehenga.` },
    { type: 'p', html: `WhatsApp ka whitepaper media bhejne ka tareeka yahi batata hai, encryption ke saath. Kuch naye shabd: <em>AES-256</em> ek taala (encryption ka tareeka) hai; <em>hash</em> (SHA-256) ek file ka "fingerprint" hai, file mein ek bhi bit badla to fingerprint badal jaata hai; <em>HMAC</em> ek chaabi wala fingerprint hai jo saabit karta hai ki file raaste mein badli nahi.` },
    { type: 'steps', items: [
      { t: 'Random chaabi banao', d: 'Sender ka phone har attachment ke liye ek nayi random AES-256 key (taale ki chaabi) aur ek HMAC-SHA256 key banata hai.' },
      { t: 'Taala lagao aur upload', d: 'File phone pe hi encrypt hoti hai (AES-256-CBC + MAC), aur encrypted blob, blob store mein upload. Server ke paas sirf taala laga dabba.' },
      { t: 'Chat message mein chaabi', d: 'Normal E2EE chat message mein jaata hai: decrypt key, HMAC key, encrypted blob ka SHA-256 hash (fingerprint), aur blob ka pointer.' },
      { t: 'Receiver download + check', d: 'Receiver blob download karta hai, fingerprint match karta hai (beech mein badla to nahi?), aur chaabi se kholta hai.' },
    ]},
    { type: 'p', html: `Khud dekho ki media ko chat pipe se bhejna kyun bura hai, aur CDN kitna bachaata hai (ye "maan lo" wale numbers hain):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>File size (MB): <strong class="wmd-sv"></strong></label><input class="wmd-s" type="range" min="1" max="100" step="1" value="20"></div>
          <div><label>Phone ki upload speed (Mbps): <strong class="wmd-uv"></strong></label><input class="wmd-u" type="range" min="1" max="50" step="1" value="2"></div>
          <div><label>Group mein kitne log kholenge: <strong class="wmd-nv"></strong></label><input class="wmd-n" type="range" min="1" max="1000" step="1" value="500"></div>
          <div><label>Wo kitne alag shehron (CDN edges) mein hain: <strong class="wmd-cv"></strong></label><input class="wmd-c" type="range" min="1" max="50" step="1" value="10"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Chat pipe pe bhejte to jam (seconds)</span><strong class="wmd-b"></strong></div>
          <div class="stat"><span>Alag raaste se: chat pe sirf</span><strong class="wmd-p"></strong></div>
          <div class="stat"><span>Storage se downloads: bina CDN</span><strong class="wmd-o1"></strong></div>
          <div class="stat"><span>Storage se downloads: CDN ke saath</span><strong class="wmd-o2"></strong></div>
          <div class="stat"><span>Storage ka data: bina CDN / CDN</span><strong class="wmd-d"></strong></div>
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
        g('.wmd-note').textContent = `${mb} MB ko ${up} Mbps pe bhejne mein ~${blocked.toFixed(0)} second lagte hain. Agar ye chat WebSocket pe jaata, to itni der Riya ke saare text messages aur ticks iske peeche line mein khade rehte. Alag raaste se chat pe sirf pointer + chaabi jaati hai. Download: CDN har shehar ke edge pe file ek baar laata hai, to storage se ${n} ki jagah sirf ${o2} downloads. Ye isliye kaam karta hai kyunki group mein sabke liye wahi ek encrypted file hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'flow', title: 'Photo bhejna', height: 320,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 150, w: 120, kind: 'client', info: 'Ye kya hai: Riya ka phone (sender). Photo ko phone pe hi chhota (compress) karti hai aur taale mein band (encrypt) karti hai, phir upload.' },
        { id: 'media', label: 'Media service', sub: 'upload URLs', x: 255, y: 50, w: 140, kind: 'server', info: 'Ye kya hai: media service, jo login check karke kuch minute ke liye ek pre-signed upload URL deti hai. File ke bytes isse nahi guzarte, isliye ye halki rehti hai. Whitepaper sirf "blob store" kehta hai; upload URL wala tareeka general industry approach hai.' },
        { id: 'blob', label: 'Blob store', sub: 'object storage', x: 470, y: 150, w: 140, kind: 'data', info: 'Ye kya hai: blob store, S3 jaisa object storage. Isme sirf encrypted bytes hain. Sasta, durable, aur badi files ke liye bana. Purane, deliver ho chuke media ko expiry (TTL) se hata sakte hain.' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 640, y: 150, w: 110, kind: 'edge', info: 'Ye kya hai: CDN, users ke paas ke cache servers. Group mein 500 log same photo kholein to har edge storage se ek hi baar laata hai, kyunki sabke liye wahi encrypted file hai. WhatsApp ke public sources CDN ki detail nahi dete; media ke liye CDN general industry approach hai (roadmap bhi yahi kehta hai).' },
        { id: 'chat', label: 'Chat service', x: 255, y: 260, w: 140, kind: 'server', info: 'Ye kya hai: chat service (gateway ke saath). Normal chat message le jaati hai: blob ka pointer + chaabiyan + fingerprint (hash), sab E2EE ke andar, isliye server ko chaabiyan nahi dikhtin.' },
        { id: 'a', label: 'Aman (app)', x: 470, y: 275, w: 120, kind: 'client', info: 'Ye kya hai: Aman ka phone (receiver). Pehle chhota pointer/thumbnail milta hai, phir CDN se blob download, fingerprint check, aur chaabi se decrypt.' },
      ],
      edges: [{ a: 'r', b: 'media' }, { a: 'r', b: 'blob' }, { a: 'blob', b: 'cdn' }, { a: 'r', b: 'chat' }, { a: 'chat', b: 'a' }, { a: 'cdn', b: 'a' }],
      scenarios: [
        { name: 'Photo bhejo', steps: [
          { title: 'Upload URL lo', go: ['r>media', 'res:media>r'], text: 'Phone bolta hai "mujhe 2 MB upload karna hai". Media service ek pre-signed URL deta hai, kuch minute ke liye valid.', msg: 'POST /media/upload-url  →  { upload_url, media_id: "m-55" }' },
          { title: 'Encrypt + upload', go: 'r>blob', text: 'Phone ne random key se photo encrypt ki aur seedha blob store mein daal di. Bade video ko chunks mein (resumable) bhejte hain.', after: { blob: { sub: 'm-55 (encrypted)' } } },
          { title: 'Chat message: pointer + key', go: 'r>chat>a', text: 'Sirf ~200 bytes ka message: pointer, key, hash. Text jitna hi tez.', msg: '{ media: "m-55", key: <inside E2EE>, sha256: "9f2c..." }' },
          { title: 'Aman download (CDN miss)', go: ['a>cdn>blob', 'res:blob>cdn>a'], text: 'Pehli baar CDN ke paas nahi tha, origin se laaya aur rakh liya. Aman ne hash match kiya aur photo kholi.', after: { a: { state: 'ok', sub: 'photo decrypted' }, cdn: { state: 'miss' } } },
        ]},
        { name: 'Upload beech mein toota', steps: [
          { title: 'Network gaya', go: 'lost:r>blob', text: '20 MB video, 60% pe network gaya.', set: { r: { state: 'warn', sub: 'upload 60%' } } },
          { title: 'Resume, shuru se nahi', go: 'r>blob', text: 'Chunked/resumable upload: phone poochhta hai "kitna pahunch gaya?" aur baaki 40% hi bhejta hai.', after: { r: { state: 'ok', sub: 'upload 100%' } } },
          { title: 'Message ab jaata hai', go: 'r>chat>a', text: 'Chat message tab hi bhejo jab upload poora ho. Warna Aman ko toota pointer milega. Order: pehle blob, phir pointer.' },
        ]},
        { name: 'Group mein 500 log kholte hain', steps: [
          { title: 'Sab ek hi file maangte hain', flood: { paths: ['a>cdn'], n: 8 }, text: 'Group message ek hi Sender Key ciphertext hai, to photo bhi sabke liye ek hi encrypted blob.', after: { cdn: { state: 'hit', sub: 'HIT' } } },
          { title: 'Origin pe ek hi baar', go: 'res:cdn>a', text: 'CDN ko andar ka content dikhta nahi, use farak bhi nahi padta: bytes hi to cache karne hain.' },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 5: end-to-end encryption, design pe asar' },
    { type: 'p', html: `Poora crypto seekhna is lesson ka kaam nahi, lekin system designer ko pata hona chahiye ki E2EE se architecture kaise badalta hai. WhatsApp <strong>Signal Protocol</strong> use karta hai (whitepaper, latest version Feb 2026). Pehle bilkul basic idea, phir WhatsApp ke details.` },
    { type: 'callout', tone: 'term', title: 'Naye words: public key aur private key', html: `<strong>Ye kya hai:</strong> chaabiyon ki ek jodi. <em>Public key</em> ek khula taala hai jo Aman sabko de sakta hai: koi bhi isse dabba band kar sakta hai. <em>Private key</em> us taale ki ekmatra chaabi hai, jo sirf Aman ke phone mein rehti hai. Jo dabba Aman ke public taale se band hua, wo sirf Aman ki private chaabi se khulega.<br><strong>Kyun chahiye:</strong> Riya bina kisi secret share kiye Aman ke liye message band kar sakti hai, aur beech mein koi (WhatsApp ka server bhi) use khol nahi sakta.<br><strong>Iske bina:</strong> server ke paas chaabi hoti, aur server hack = saari chats padhi ja sakti.` },
    { type: 'image', src: 'assets/img/design-whatsapp/public-key-encryption.png', maxWidth: 420, alt: 'Diagram: Bob ka message "Hello Alice!" Alice ki public key se encrypt hota hai, beech mein 6EB69570 jaisa bekaar text banta hai, aur sirf Alice ki private key se decrypt hoke wapas "Hello Alice!" banta hai', caption: 'Public key encryption ka seedha idea: Alice ki public key (hari) se band kiya message beech mein bekaar akshar ban jaata hai, aur sirf Alice ki private key (laal) use khol sakti hai. Server sirf beech wala hissa dekhta hai. (WhatsApp asal mein in keys se ek shared secret banata hai, idea wahi hai.)', credit: { text: 'David Göthberg, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Public_key_encryption.svg', license: 'Public domain' } },
    { type: 'p', html: `Khud dekho ki server ko kya dikhta hai. Ye ek <strong>khilona taala</strong> hai (asli AES nahi), bas idea mehsoos karne ke liye:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Riya ka message</label><input class="wee-m" type="text" value="Kal 5 baje milte hain" maxlength="60" style="width:100%">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><span class="chips wee-mode" style="padding:0"><button type="button" class="chip on" data-e="1">E2EE ON</button><button type="button" class="chip" data-e="0">E2EE OFF</button></span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Riya ka phone</strong><div class="wee-a" style="margin-top:6px;word-break:break-all"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><strong>Server (aur hacker) ko dikhta hai</strong><div class="wee-s" style="margin-top:6px;font-family:var(--f-mono);font-size:13px;word-break:break-all"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Aman ka phone</strong><div class="wee-b" style="margin-top:6px;word-break:break-all"></div></div>
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
        const caps = [['Message ko route karna (kisko bhejna hai)', true], ['Server pe message search', !e2ee], ['Content padh ke spam filter', !e2ee], ['Server pe link preview banana', !e2ee], ['Server hack ho to chats safe', e2ee]];
        q('.wee-cap').innerHTML = caps.map(([t, ok]) => `<div><span style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:700">${ok ? '✓' : '✗'}</span> ${t}</div>`).join('');
        q('.wee-note').textContent = e2ee ? 'E2EE ON: server ko sirf bekaar akshar dikhte hain. Wo phir bhi message pahuncha sakta hai (kisko, kab, kitna bada pata hai), lekin padh nahi sakta.' : 'E2EE OFF: server text padh sakta hai. Search aur spam filter aasaan, lekin server ya uske logs leak hue to sab kuch khula. Slack/Discord jaise products ye raasta chunte hain.';
      };
      el.querySelectorAll('.wee-mode .chip').forEach(c => c.onclick = () => { e2ee = c.dataset.e === '1'; el.querySelectorAll('.wee-mode .chip').forEach(x => x.classList.toggle('on', x === c)); draw(); });
      q('.wee-m').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `Ab WhatsApp ke asli details, simple shabdon mein:` },
    { type: 'list', items: [
      `<strong>Public keys ki phone book</strong>: install pe phone keys banata hai: ek lambi chalne wali <em>Identity Key</em>, ek <em>Signed Pre Key</em> (time time pe badalti hai), aur kai <em>One-Time Pre Keys</em>. Public hisse server pe upload hote hain. Private keys phone se kabhi bahar nahi jaati. To server ek "public keys ki phone book" bhi hai.`,
      `<strong>Offline mein bhi session</strong>: Riya, Aman ke public keys server se le ke session bana sakti hai, chahe Aman offline ho. Isi liye one-time pre keys pehle se upload rakhe jaate hain.`,
      `<strong>Har message nayi chaabi</strong>: har message ke baad chaabi ek kadam aage badal jaati hai, jaise ek ratchet (aage hi ghoomne wala pahiya). Isko Double Ratchet kehte hain. Faayda: aaj ki chaabi chori ho jaaye to bhi purane messages nahi khulte. Isko <em>forward secrecy</em> kehte hain.`,
      `<strong>Multi-device = client fan-out</strong>: Meta ke 2021 post ke mutabik har device ki apni identity key hai, aur 1:1 message sender ka phone har device (recipient ke aur apne doosre devices) ke liye alag encrypt karke bhejta hai. Aman ka phone + 4 linked devices = 5 copies, upar se Riya ke apne doosre devices ki copies.`,
      `<strong>Raasta bhi encrypted</strong>: phone aur WhatsApp server ke beech ka connection alag se bhi encrypted hota hai (Noise Pipes protocol, whitepaper). Matlab do taale: ek message pe (sirf Aman khol sake), ek pipe pe (beech ka network kuch na dekh sake).`,
    ]},
    { type: 'table', head: ['Server ko kya pata hai', 'Server ko kya nahi pata'], rows: [
      ['Kisne kisko kab bheja (routing ke liye zaroori)', 'Message ka text'],
      ['Message ka size, encrypted blob ka pointer', 'Photo/video ka content, uski key'],
      ['Group ke members (fan-out ke liye)', 'Group mein kya baat ho rahi hai'],
    ]},
    { type: 'callout', tone: 'warn', title: 'Design pe asar', html: `E2EE ke saath server <strong>content pe kuch nahi kar sakta</strong>: server-side search nahi, content padh ke spam filter nahi, server pe link preview nahi (phone khud banata hai), history ka server backup sirf encrypted. Ye product trade-off hai. Slack/Discord jaise products jo server pe search aur history dete hain, wahan messages server pe padhne layak rakhe jaate hain.` },

    { type: 'h2', text: 'Online / last seen' },
    { type: 'callout', tone: 'term', title: 'Naya word: presence', html: `<strong>Ye kya hai:</strong> "online" / "last seen" / "typing..." jaisi jaankari ki koi abhi app pe hai ya nahi.<br><strong>Kyun chahiye:</strong> users ko pata chale ki jawab jaldi aayega ya nahi.<br><strong>Iske bina:</strong> chat chalti rahegi; ye "nice to have" hai, isliye ise sasta aur thoda purana (stale) bhi chalne do.` },
    { type: 'p', html: `"Online" dikhana sasta lagta hai, lekin har user ke har contact ko har status change batana bahut bada fan-out hai. Aam taur pe industry mein ye karte hain: presence ko registry ke heartbeat se nikaalo (entry hai = online), aur status sirf unko bhejo jo <em>abhi</em> wo chat khol ke baithe hain (subscribe on open), sabko nahi. Slack ke 2023 post mein bhi presence ke liye alag "Presence Servers" ka zikr hai. Presence thoda purana ho to chalta hai, isliye ye <a href="#/cap">eventual consistency</a> ka achha example hai.` },

    { type: 'h2', text: 'Asli companies ne kya kiya' },
    { type: 'table', head: ['Company', 'Kya pata hai (aur kab ka)'], rows: [
      ['WhatsApp (2012-2014)', 'Server lagbhag poora Erlang mein, FreeBSD pe; shuruaat ejabberd (open-source XMPP server) se, phir apna protocol. Jan 2012: ek server pe 20 lakh+ TCP connections. 2014 (Erlang Factory talk, Rick Reed): ~50 billion messages/day, messages server pe tab tak jab tak client le na le. Ye 10+ saal purani jaankari hai; Meta ke andar aaj ka stack public nahi.'],
      ['WhatsApp (2016-2026)', 'Security whitepaper: Signal Protocol, Sender Keys se group fan-out (server-side), multi-device mein client fan-out (2021), media encrypted blob store mein, transport Noise Pipes.'],
      ['Discord (2017, 2023)', 'Messages wide-column DB mein, key ((channel_id, bucket), message_id), Snowflake IDs. 2017: MongoDB se Cassandra (12 nodes). 2022: 177 Cassandra nodes se 72 ScyllaDB nodes, Rust data services with request coalescing.'],
      ['Slack (2023)', 'Gateway Servers (WebSockets, kai regions mein), Channel Servers (consistent hashing se channel → host, stateful, in-memory), Admin Servers, Presence Servers. Message pehle web app API se save hota hai, phir channel server se subscribed gateways tak, duniya bhar mein ~500 ms mein.'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Slack ka idea: "channel" ka ek malik', html: `Slack mein har channel consistent hashing se ek Channel Server pe "rehta" hai. Message aaya to us channel ka server use un saare gateways ko bhejta hai jinke users ne us channel ko subscribe kiya hai. Ye registry ka doosra roop hai: "user kahan hai" ki jagah "is channel ko kaun kaun sun raha hai". Bade group chats ke liye ye pattern bahut kaam ka hai. (<a href="#/consistent-hashing">Consistent hashing</a> dekho.)` },

    { type: 'h2', text: 'Failure scenarios aur bottlenecks' },
    { type: 'table', head: ['Kya toota', 'Kya hota hai', 'Bachaav'], rows: [
      ['Gateway crash', 'Uske lakhon users disconnect, ek saath reconnect', 'Heartbeat se detect, reconnect with backoff + jitter, registry TTL, resume from last_msg_id'],
      ['Registry stale / down', 'Galat gateway pe bhejna, delivery fail', 'Message pehle store mein, isliye sirf der; registry replicated; miss ho to "offline" maan ke push'],
      ['Ack lost, client retry', 'Duplicate message', 'client_msg_id se dedupe (idempotent)'],
      ['Receipts ulte order mein', '"Delivered" baad mein aaya', 'Monotonic state machine: state sirf aage'],
      ['Hot group / hot channel', 'Ek partition aur ek fan-out worker garam', 'Fan-out queue + workers, batching, request coalescing (Discord), group size limit'],
      ['APNs/FCM slow ya drop', 'Notification nahi aaya', 'Push sirf hint; app khulte hi sync'],
      ['Message store node down', 'Writes fail', 'Replication factor 3, quorum writes (<a href="#/replication">replication</a>)'],
      ['Phone hamesha ke liye offline', 'Pending storage badhta rahe', 'TTL (WhatsApp: ~30 din)'],
    ]},

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• <strong>Two-way, frequent, low-latency</strong> (chat) → WebSockets on gateways + registry. Sirf server → client stream ho to SSE kaafi.<br>• <strong>History server pe chahiye?</strong> Haan (multi-device, search) → permanent store, partition by conversation, time-ordered IDs. Nahi (privacy first) → store-and-forward + TTL.<br>• <strong>Group fan-out</strong>: chhote groups → server-side fan-out per message. Lakhon followers → ye chat nahi, feed/broadcast problem hai (fan-out on read, agla lesson).<br>• <strong>Offline</strong>: hamesha "store, then push as a hint, then sync on connect".` },

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Requirements + maths', d: '1:1, groups, ticks, offline, media. 100M online ÷ 100k = ~1,000 gateways. Messages/sec lakhon mein, isliye write-heavy store.' },
      { t: 'Connection layer', d: 'L4 LB → WebSocket gateways (stateless logic, sirf connections) → registry (user → gateway, TTL + heartbeat).' },
      { t: 'Message path', d: 'client_msg_id → chat service → store pehle (✓) → registry lookup → recipient gateway → delivered receipt (✓✓) → read (blue).' },
      { t: 'Storage', d: 'Partition by conversation, Snowflake-style IDs, bucket by time; Discord ki hot partition story.' },
      { t: 'Groups, offline, media, E2EE', d: 'Server-side fan-out with Sender Keys; store + push + sync; blob store + pointer; server sirf ciphertext dekhta hai.' },
      { t: 'Failures', d: 'Gateway crash + thundering herd, duplicates, out-of-order receipts, hot groups, push drop.' },
    ]},

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 650,
      groups: [
        { label: 'Media', x: 12, y: 160, w: 156, h: 350 },
        { label: 'Data', x: 550, y: 50, w: 160, h: 340 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya (app)', sub: 'sender', x: 90, y: 80, w: 130, kind: 'client', info: 'Ye kya hai: sender ka phone. Message ko phone pe hi taale mein band (E2EE) karta hai, client_msg_id lagata hai, aur ek khule WebSocket pe bhejta hai.' },
        { id: 'lb', label: 'L4 LB', sub: 'naye connections', x: 270, y: 80, w: 130, kind: 'edge', info: 'Ye kya hai: L4 load balancer. Naye WebSocket connections ko kisi khaali gateway pe bhejta hai. Message ke andar nahi jhaankta, isliye bahut tez.' },
        { id: 'gwa', label: 'Gateway A', sub: 'WebSockets', x: 450, y: 80, w: 130, kind: 'server', info: 'Ye kya hai: Riya ka connection gateway. Lakhon khule connections pakadta hai, token aur heartbeat check karta hai, connect pe registry mein likhta hai. Message ka faisla nahi karta.' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 630, y: 100, w: 130, kind: 'cache', info: 'Ye kya hai: session registry (Redis jaisi): kaun sa device kis gateway pe hai, TTL + heartbeat ke saath. Entry nahi = offline.' },
        { id: 'media', label: 'Media service', sub: 'upload URL', x: 90, y: 210, w: 130, kind: 'server', info: 'Ye kya hai: media service. Kuch minute ka pre-signed upload URL deti hai, taaki phone encrypted file seedha blob store mein daale.' },
        { id: 'grp', label: 'Group service', sub: 'members, fan-out', x: 270, y: 210, w: 130, kind: 'server', info: 'Ye kya hai: group service. Members ki list rakhti hai aur ek Sender Key ciphertext ko har member device tak baant-ti hai (server-side fan-out), batches mein.' },
        { id: 'chat', label: 'Chat service', sub: 'ID, save, route', x: 450, y: 210, w: 130, kind: 'server', info: 'Ye kya hai: chat ka dimaag. Dedupe (client_msg_id), time-ordered msg_id, pehle store mein save (✓), phir registry lookup aur recipient ke gateway pe bhejna. Stateless.' },
        { id: 'store', label: 'Message store', sub: 'by conversation', x: 630, y: 220, w: 130, kind: 'data', info: 'Ye kya hai: durable message store (wide-column, jaise Cassandra/ScyllaDB). Partition = conversation (+ time bucket), sorted by msg_id. WhatsApp-style mein sirf deliver hone tak.' },
        { id: 'inbox', label: 'Offline inbox', sub: 'pending/device', x: 630, y: 340, w: 130, kind: 'data', info: 'Ye kya hai: offline devices ke undelivered messages. App khulne pe sync, deliver hote hi delete; WhatsApp ~30 din baad expire karta hai.' },
        { id: 'blob', label: 'Blob store', sub: 'encrypted files', x: 90, y: 340, w: 130, kind: 'data', info: 'Ye kya hai: object storage (S3 jaisa). Sirf encrypted photos/videos. Chat message mein sirf iska pointer + chaabi jaati hai.' },
        { id: 'push', label: 'Push service', sub: 'device tokens', x: 270, y: 340, w: 130, kind: 'queue', info: 'Ye kya hai: push service, queue ke peeche. Offline devices ke liye APNs/FCM ko "jaago" bhejti hai; kai messages ka ek notification (collapse).' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 90, y: 460, w: 130, kind: 'edge', info: 'Ye kya hai: users ke paas ke cache servers. Group mein sab log wahi encrypted file kholte hain, to storage se har shehar mein ek hi baar aati hai. (General industry approach; WhatsApp ne detail public nahi ki.)' },
        { id: 'apns', label: 'APNs / FCM', sub: 'Apple / Google', x: 270, y: 460, w: 130, kind: 'net', info: 'Ye kya hai: Apple aur Google ki push services. Hamare control mein nahi; notification sirf hint hai, guarantee sync deta hai.' },
        { id: 'gwb', label: 'Gateway B', sub: 'WebSockets', x: 450, y: 460, w: 130, kind: 'server', info: 'Ye kya hai: Aman ka connection gateway. Chat/group service se aaya frame Aman ke khule WebSocket pe likhta hai, aur Aman ke receipts wapas bhejta hai.' },
        { id: 'aman', label: 'Aman (app)', sub: 'receiver', x: 270, y: 590, w: 130, kind: 'client', info: 'Ye kya hai: receiver ka phone. Message kholta hai, delivered aur read receipts bhejta hai; offline tha to app khulte hi inbox se sync karta hai.' },
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
        { name: '1:1 message', text: 'Riya → LB → Gateway A → chat service → store mein save (✓) → registry se Aman ka gateway → Gateway B → Aman (✓✓), phir read receipt (blue).', go: ['riya>lb>gwa>chat>store', 'chat>reg', 'chat>gwb>aman'] },
        { name: 'Offline user', text: 'Registry mein Aman nahi: message offline inbox mein (✓), push service → APNs/FCM → notification. App khulte hi sync, ✓✓, aur inbox se delete.', go: ['riya>lb>gwa>chat>inbox', 'chat>push>apns>aman'] },
        { name: 'Group message', text: 'Ek Sender Key ciphertext → group service → registry se members ke gateways → har online device; offline walon ko push. Receipts sab ke aane pe ✓✓.', go: ['riya>lb>gwa>grp>reg', 'grp>gwb>aman', 'grp>push>apns>aman'] },
        { name: 'Media', text: 'Phone file encrypt karta hai, media service se signed URL leke blob store mein upload; chat pe sirf pointer + chaabi. Aman CDN se file laata hai.', go: ['riya>media>blob>cdn>aman'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Phones <strong>WebSocket</strong> se <strong>gateways</strong> pe jude rehte hain; gateways ka kaam sirf connections pakadna hai.</li>
      <li><strong>Registry</strong> batati hai kaun kis gateway pe hai; TTL + heartbeat se stale entries mit-ti hain.</li>
      <li>Rule: <strong>pehle save, phir ✓, phir deliver</strong>. Retry pe duplicate rokne ke liye client_msg_id.</li>
      <li>Messages <strong>conversation ke hisaab se partition</strong>, time-ordered IDs, time buckets (Discord).</li>
      <li>Ticks ek <strong>state machine</strong> hain: sirf aage; group mein sabse peeche wala member decide karta hai.</li>
      <li>Offline: <strong>inbox mein rakho, push sirf ghanti, sync asli delivery</strong>; ~30 din pe expire.</li>
      <li>Groups: <strong>Sender Key</strong> se ek ciphertext, server-side fan-out; size limit zaroori.</li>
      <li>Media alag raaste se: <strong>blob store + CDN</strong>, chat pe sirf pointer. E2EE: server dakiya hai, padh nahi sakta.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Persistent WebSockets: sub-second delivery, server push', 'Store pehle, deliver baad: koi message nahi khota', 'Partition by conversation: chat history ek read mein', 'Server-side fan-out + Sender Keys: phone ka data bachta hai', 'Media alag raaste se: chat pipe kabhi jam nahi', 'E2EE: server breach pe bhi messages safe'], costs: ['Gateways stateful: crash pe reconnect storm', 'Registry ek aur component jo stale ho sakta hai', 'Receipts traffic ko 2-3 guna kar dete hain', 'Bade groups mehnge: size limit lagani padti hai', 'E2EE: server-side search, spam filtering, backups mushkil', 'Push notifications Apple/Google ke haath mein'] },

    { type: 'think', questions: [
      { q: 'Riya ke 3 devices hain (phone, laptop, tablet), Aman ke 2. Riya ek 1:1 message bhejti hai. Multi-device client fan-out mein kitni encrypted copies banti hain, aur kyun?', a: 'Aman ke 2 devices + Riya ke apne 2 doosre devices = 4 copies (sending phone ko khud ki copy nahi chahiye). Har device ki apni identity key hai, to har ek ke liye alag pairwise session se encrypt hota hai. Isi liye linked devices ki limit hai.' },
      { q: 'Ek 1,000 member group mein ek member har second 5 messages bhej raha hai (spam). Kya kya garam hoga, aur kya karoge?', a: 'Har message pe ~1,000 × devices deliveries aur ~2,000 receipts. Group service, registry lookups, gateways aur push sab pe dabaav. Per-user rate limit (<a href="#/rate-limiting">rate limiting</a>), fan-out queue ke through, notifications collapse, aur admin controls (sirf admins bhej sakein).' },
      { q: 'Aapko "message search" feature chahiye, lekin chat E2EE hai. Kya option hain?', a: 'Server content nahi padh sakta, to search phone pe local index se karo (WhatsApp jaisa). Server-side search chahiye to E2EE chhodna padega (Slack/Discord jaisa). Ye product decision hai, sirf engineering nahi.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Riya ko ek grey tick (✓) kab milna chahiye?', options: ['Jab Aman ka phone message le le', 'Jab server message ko durable store mein save kar de', 'Jab Riya send dabaaye'], answer: 1, explain: 'Grey ✓ = server ke paas safe. Isiliye pehle save, phir ack. Delivered (✓✓) recipient ke phone ke receipt se aata hai.' },
      { q: 'Chat messages ke liye sabse achhi partition key?', options: ['user_id of sender', 'conversation / channel id (+ time bucket)', 'Random hash of message_id'], answer: 1, explain: 'Sabse common query "is chat ke latest 50" hai. Partition = conversation se ye ek hi partition ki sorted read hai. Bucket se partition hamesha nahi badhta (Discord).' },
      { q: 'Aman ka phone band hai. Push notification drop ho gaya. Message ka kya hoga?', options: ['Kho gaya', 'Pending store mein hai; app khulte hi sync se mil jaayega', 'Riya ko dobara bhejna padega'], answer: 1, explain: 'Push sirf "jaago" ka hint hai. Guarantee store + sync deti hai.' },
      { q: 'WhatsApp group mein Sender Keys ka faayda kya hai?', options: ['Server message padh sakta hai', 'Sender ek hi ciphertext upload karta hai, server use sabko fan-out karta hai', 'Group mein encryption band ho jaata hai'], answer: 1, explain: 'Sender Key ek baar har member ko pairwise bhejo; uske baad har message ek copy, server-side fan-out, aur E2EE bhi bana rehta hai.' },
      { q: '"Read" receipt "delivered" se pehle aa gaya. Sahi behaviour?', options: ['Read ignore karo', 'State read kar do; baad mein aaya delivered ignore', 'Error do'], answer: 1, explain: 'State machine monotonic hai: read ka matlab delivered bhi. Peeche jaane wale ya duplicate receipts ignore.' },
    ]},
    { type: 'sources', note: 'WhatsApp ke architecture numbers purane talks/posts se hain (2012-2014); jahan ho saka saal likha hai. Security details latest whitepaper se.', items: [
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
