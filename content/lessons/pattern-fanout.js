Lesson.register({
  id: 'pattern-fanout',
  title: 'Real-time updates aur fan-out',
  minutes: 32,
  summary: `Ek event, bahut saare receivers: ek message group ke 500 logon tak, ek live comment 10 lakh viewers tak, ek post 1 crore followers ke feed tak. Iske liye ek seedhi hai: gateways → registry → pub/sub → fan-out on write (push) → celebrity ke liye hybrid (pull). Har rung kab aur kyun.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Kabhi ek cheez bahut saare logon tak pahunchani hoti hai: ek group message 500 logon tak, ek live comment 10 lakh viewers tak, ek post 1 crore followers tak.<br>Ek ek ko alag se bhejna bahut slow aur mehenga hai.<br>Is lesson mein seedhi hai: kaise connections sambhaalein, kaise pata karein kaun kahan hai, kaise ek message ko sabmein baantein, aur bade stars ke posts ke saath kya karein.` },
    { type: 'h2', text: 'Ab tak ki kahani' },
    { type: 'p', html: `<a href="#/realtime">Realtime lesson</a> mein humne dekha ki server se client tak turant baat kaise pahunchti hai (WebSocket/SSE). Wahan ek message ek insaan tak jaata tha: Riya se Aman. Is lesson ka sawaal bada hai: <strong>ek event, bahut saare log</strong>.` },
    { type: 'callout', tone: 'term', title: 'Fan-out', html: `<strong>Ye kya hai:</strong> ek input ko bahut saare outputs mein copy karna, jaise haath ka pankha (fan) ek point se phailta hai. 1 post × 10,000 followers = fan-out 10,000.<br><strong>Kyun samajhna zaroori:</strong> system design mein do jagah fan-out hota hai: (1) <strong>live delivery</strong>: jo abhi online hain unki screen pe turant; (2) <strong>feed delivery</strong>: har follower ki timeline mein post daalna, taaki baad mein app khole to dikhe.<br><strong>Iske bina (dhyaan na do):</strong> ek bade account ka ek post poore system ko minutes ke liye jam kar sakta hai.` },
    { type: 'p', html: `xyz.com pe ab teen naye features hain: (1) group chat (500 members tak), (2) live stream pe live comments (ek match pe 10 lakh viewers), (3) "following" feed: creator post kare to followers ke feed mein aaye, aur jo online hain unhe "naya post" ka badge turant. Teeno mein sawaal same: <strong>ek event ko N logon tak, kitne kaam mein, kitni der mein?</strong>` },

    { type: 'h2', text: 'Seedhi ek nazar mein' },
    { type: 'steps', items: [
      { t: 'Persistent connection gateways', d: 'Gateway = aisa server jiska kaam sirf users ke khule connections (WebSocket) sambhaalna hai. Symptom: ek server ke connections (~100k) bhar gaye. Ilaaj: sirf connections sambhaalne wale servers ka fleet. Kharcha: stateful servers, deploy pe reconnects.' },
      { t: 'Registry: kaun kahan connected hai', d: 'Registry = ek chhoti list "Aman → Gateway 2". Symptom: event Gateway 1 pe aaya, receiver Gateway 7 pe hai. Ilaaj: user → gateway mapping (Redis, TTL ke saath). Kharcha: har delivery pe lookup, purani entries.' },
      { t: 'Pub/sub between services and gateways', d: 'Pub/sub = ek "radio channel": bhejne wala ek baar bolta hai, jo bhi channel sun raha hai sabko milta hai. Symptom: ek event ke hazaaron online receivers, har ek ke liye alag lookup aur alag send. Ilaaj: topic pe ek publish, har gateway apne local users ko de. Kharcha: ek aur system; Redis pub/sub jaise systems message store nahi karte.' },
      { t: 'Fan-out on write (push) via workers', d: 'Push = post karte hi har follower ki ready list mein post daal dena. Symptom: post karte hi followers ki timelines bharni hain, aur ek loop post API ko slow karta hai. Ilaaj: queue + workers jo har follower ki timeline mein post ID daalein. Kharcha: writes = followers ki ginti.' },
      { t: 'Hybrid: celebrities ke liye pull', d: 'Pull = feed kholte waqt post laana. Symptom: 1 crore followers wala post minutes leta hai aur workers ko jam kar deta hai. Ilaaj: celebrity posts fan-out mat karo; follower ka feed padhte waqt unhe jodo. Kharcha: read path complex.' },
    ]},

    { type: 'h2', text: 'Har rung, thoda gehrai mein' },
    { type: 'p', html: `Pehle teen rung <strong>live delivery</strong> ke hain (online logon ki screen tak). Baaki do <strong>feed delivery</strong> ke (stored timeline tak). Har rung: kahani numbers ke saath → tareeka → kab rukna hai → gehri lesson ka link.` },
    { type: 'h3', text: 'Rung 1: persistent connection gateways' },
    { type: 'p', html: `<strong>Kahani:</strong> IPL final pe xyz.com ke live stream pe 10 lakh log ek saath online hain. Har ek ka phone server se ek khula connection rakhta hai, taaki comment aate hi dikhe. Ek server lagbhag 1 lakh (100k) aise connections sambhaal sakta hai (roadmap ka napkin number). 10 lakh ÷ 1 lakh = kam se kam 10 servers. Aur agar inhi servers pe app ka baaki code bhi chale, to har deploy pe 10 lakh connections toot-te hain.` },
    { type: 'callout', tone: 'term', title: 'Persistent connection (WebSocket)', html: `<strong>Ye kya hai:</strong> phone aur server ke beech ek connection jo khula rehta hai, band nahi hota. Jaise phone call jo chalu hai, baar baar number milane ki jagah. WebSocket iska common tareeka hai.<br><strong>Kyun chahiye:</strong> server jab chahe user ko turant message bhej sake.<br><strong>Iske bina:</strong> phone har kuch second "kuch naya hai?" poochhe (polling): der bhi, aur bekaar requests bhi. Detail: <a href="#/realtime">realtime</a>.` },
    { type: 'callout', tone: 'term', title: 'Connection gateway', html: `<strong>Ye kya hai:</strong> servers ka ek alag group jiska <em>sirf</em> kaam hai khule connections sambhaalna aur messages unpe likhna. Business logic (save karna, check karna) doosri services mein.<br><strong>Kyun chahiye:</strong> connections bahut aur lambe hote hain. Unhe alag rakhne se app code deploy karne pe connections nahi toot-te, aur gateways alag se badhaye ja sakte hain.<br><strong>Iske bina:</strong> ek server ki connection limit hi poori site ki limit, aur har deploy pe lakhon users ek saath reconnect karte hain.<br><strong>Example:</strong> 10 lakh online ÷ (1 lakh × 60% bhara) = 17 gateways.` },
    { type: 'callout', tone: 'term', title: 'Heartbeat aur reconnect storm', html: `<strong>Ye kya hai:</strong> <strong>heartbeat</strong> = har ~30 second ek chhota "main zinda hoon" ping, taaki mare hue connections pakde jaayein. <strong>Reconnect storm</strong> = ek gateway gira, uske saare users ek hi second mein wapas connect karne aaye.<br><strong>Kyun zaroori:</strong> storm baaki gateways aur registry ko gira sakta hai. Ilaaj: <strong>jitter</strong> (har app thoda alag random time ruk ke reconnect kare).<br><strong>Iske bina:</strong> ek gateway ka girna chain reaction ban jaata hai.` },
    { type: 'p', html: `<strong>Gateway sizing lab.</strong> Online users aur ek gateway ki capacity chuno. Gateways ~60% tak hi bhare jaate hain, taaki ek gire to baaki uske users le sakein. Phir "ek gateway gira" ka asar dekho, jitter ke saath aur bina.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Online users (ek saath): <strong class="gz-nv"></strong></label><input class="gz-n" type="range" min="4" max="7.7" step="0.1" value="6"></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px" class="gz-c"></div>
        <div style="margin:4px 0 8px;display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="chip on gz-j1">Reconnect jitter ke saath (30 s)</button><button type="button" class="chip gz-j2">Bina jitter (2 s mein sab)</button></div>
        <div class="gz-grid" style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0"></div>
        <div class="stats">
          <div class="stat"><span>Gateways</span><strong class="gz-g"></strong></div>
          <div class="stat"><span>Users per gateway</span><strong class="gz-u"></strong></div>
          <div class="stat"><span>Heartbeats/s</span><strong class="gz-h"></strong></div>
          <div class="stat"><span>Ek gira: reconnects/s</span><strong class="gz-r"></strong></div>
        </div>
        <div class="calc-note gz-note"></div>`;
      const $ = c => el.querySelector(c);
      const CAPS = [5e4, 1e5, 2e5];
      let ci = 1, jit = true;
      CAPS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = (c / 1e3) + 'k conn / gateway'; b.onclick = () => { ci = i; upd(); }; $('.gz-c').appendChild(b); });
      $('.gz-j1').onclick = () => { jit = true; upd(); }; $('.gz-j2').onclick = () => { jit = false; upd(); };
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '';
      const upd = () => {
        const N = Math.round(Math.pow(10, +$('.gz-n').value)), C = CAPS[ci];
        const g = Math.max(2, Math.ceil(N / (C * 0.6))), per = N / g, hb = N / 30, rc = per / (jit ? 30 : 2);
        $('.gz-c').querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === ci));
        $('.gz-j1').classList.toggle('on', jit); $('.gz-j2').classList.toggle('on', !jit);
        $('.gz-nv').textContent = f(N);
        $('.gz-g').textContent = g; $('.gz-u').textContent = f(per); $('.gz-h').textContent = f(hb); $('.gz-r').textContent = f(rc);
        const show = Math.min(g, 60);
        $('.gz-grid').innerHTML = Array.from({ length: show }, (_, i) => `<span style="width:16px;height:16px;border-radius:4px;background:${i === 0 ? 'var(--red)' : 'var(--accent-soft)'};border:1px solid ${i === 0 ? 'var(--red)' : 'var(--accent)'}"></span>`).join('') + (g > show ? `<span style="font-size:12px;color:var(--ink-3)">+${g - show}</span>` : '');
        $('.gz-note').innerHTML = `${f(N)} ÷ (${C / 1e3}k × 60%) = ${g} gateways (kam se kam 2, taaki ek gire to site chale). Laal wala gira: uske ${f(per)} users baaki ${g - 1} gateways pe jaayenge, har ek pe ~${f(per / Math.max(1, g - 1))} extra. ` +
          (jit ? `Jitter se ye ${f(rc)} reconnects/s mein phail jaata hai. Registry aur gateways aaram se jhel lete hain.` : `Bina jitter ${f(rc)} reconnects/s ek saath: har reconnect pe TLS handshake + registry write. Yahi storm doosre gateways ko bhi gira sakta hai.`);
      };
      $('.gz-n').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (gateways)', html: `Ek hi server saare connections ~60% se neeche jhel le (jaise 50k online), to alag gateway fleet ki zaroorat nahi. Fleet tab banao jab connections ek server se zyada hon, ya deploys pe connections tootna problem ho. Agla rung (registry) tab, jab gateways ek se zyada ho gaye: message kisi aur gateway pe aaya aur receiver kisi aur pe.` },
    { type: 'h3', text: 'Rung 2: registry (kaun kahan connected hai)' },
    { type: 'p', html: `<strong>Kahani:</strong> 17 gateways hain. Riya Gateway 3 pe hai, Aman Gateway 11 pe. Riya ne Aman ko message bheja. Chat service ko kaise pata ki Aman kis gateway pe hai? Saare 17 ko bhejna (broadcast) bekaar kaam hai: 16 gateways ke paas Aman hai hi nahi.` },
    { type: 'callout', tone: 'term', title: 'Registry', html: `<strong>Ye kya hai:</strong> ek tez key-value list (aksar Redis): <code>conn:aman → gw11</code>. Jab Aman connect karta hai, Gateway 11 ye entry likhta hai, TTL ke saath (jaise 60 s, heartbeat pe renew). Disconnect pe hata deta hai.<br><strong>Kyun chahiye:</strong> ek lookup mein pata, message kahan bhejna hai.<br><strong>Iske bina:</strong> har message har gateway ko, ya receiver tak pahunchne ka koi raasta hi nahi.<br><strong>Example:</strong> group ke 3 members: <code>MGET conn:aman conn:kabir conn:zoya → [gw11, gw11, gw2]</code>.` },
    { type: 'p', html: `<strong>Kharcha:</strong> har delivery pe ek lookup. Purani (stale) entries: gateway mara aur entry abhi bhi hai, to TTL ke baad hi hategi. <strong>Limit:</strong> kaam = receivers ki ginti. 3 ya 500 receivers theek. 10 lakh receivers = 10 lakh lookups + 10 lakh sends har comment pe.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (registry)', html: `1:1 chat aur chhote groups (sau-paanch sau tak) ke liye registry hi kaafi hai. Agla rung (pub/sub) tab, jab ek event ke <strong>hazaaron online receivers</strong> hon, jaise live stream ke comments ya bade channels.` },
    { type: 'h3', text: 'Rung 3: pub/sub between services and gateways' },
    { type: 'p', html: `<strong>Kahani:</strong> live stream pe 10 lakh viewers, 17 gateways. Har second ~1,000 comments. Registry tareeke se: 1,000 × 10 lakh = 100 crore lookups aur sends har second. Koi system ye nahi jhel sakta. Lekin dhyaan do: 10 lakh viewers sirf 17 gateways pe baithe hain.` },
    { type: 'callout', tone: 'term', title: 'Pub/sub aur topic', html: `<strong>Ye kya hai:</strong> publish/subscribe. Bhejne wala ek <strong>topic</strong> (naam wala channel, jaise <code>live:ipl</code>) pe ek baar message daalta hai. Jo bhi us topic ko subscribe kiye baitha hai, use copy milti hai. Bhejne wale ko pata hi nahi ki kaun sun raha hai. Jaise radio station: ek baar bolo, jo bhi us frequency pe hai sab sunein.<br><strong>Kyun chahiye:</strong> yahan subscribers <em>gateways</em> hain, users nahi. Viewer stream join kare to uska gateway topic subscribe karta hai. Service 1 publish karti hai, pub/sub 17 gateways ko 17 copies deta hai, aur har gateway apne ~60k local viewers ko.<br><strong>Iske bina:</strong> service ko har viewer ka alag lookup aur send.<br><strong>Example:</strong> Redis Pub/Sub, NATS, ya Kafka. Idea wahi jo <a href="#/queues">queues lesson ka pub/sub</a>, bas yahan speed aur fan-out zyada zaroori, durability kam.` },
    { type: 'p', html: `<strong>Kharcha:</strong> ek aur system. Redis Pub/Sub <strong>message store nahi karta</strong>: jo gateway us pal connected nahi tha, uska message gaya (at-most-once). Isliye har message ka sequence number, aur gap dikhe to DB se maang lo. <strong>Limit:</strong> ye sirf <em>online</em> logon ke liye hai. Jo abhi offline hai, use baad mein app kholne pe post feed mein chahiye. Wo feed delivery hai: agle do rung.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (pub/sub)', html: `Live delivery ki seedhi yahin khatam. Bas topics aur gateways badhao; bahut zyada gateways hon to regional relays (pub/sub ka tree). Agar tumhe online logon ke saath <strong>offline followers ke stored feed</strong> bhi bharne hain, to feed delivery ka sawaal: push ya pull.` },
    { type: 'h3', text: 'Rung 4: fan-out on write (push) via queue + workers' },
    { type: 'p', html: `<strong>Kahani:</strong> Aman ke 200 followers hain. Wo post karta hai. Followers jab bhi app kholein, post unke feed mein hona chahiye. Aur feed kholna, post karne se 50-100 guna zyada hota hai (Twitter ke 2013 talk mein ~300k timeline reads/s vs ~5k tweets/s). To feed padhna <em>sasta</em> hona chahiye.` },
    { type: 'callout', tone: 'term', title: 'Push (fan-out on write) aur timeline', html: `<strong>Ye kya hai:</strong> har user ki ek ready list (<strong>timeline</strong>), aksar Redis mein: latest ~800 post IDs. Post likhte waqt hi har follower ki timeline ke aage post ID daal do. Feed padhna = apni list padhna.<br><strong>Kyun chahiye:</strong> read bahut sasta (ek list), aur reads hi zyada hain. Ye <a href="#/pattern-reads">precomputed view</a> ka hi roop hai.<br><strong>Iske bina:</strong> har feed open pe saare followed logon ke posts dhoondo aur jodo.<br><strong>Kaise:</strong> post API ek job queue mein daalta hai aur turant OK. Workers followers ki list padh ke har timeline mein ID daalte hain. 200 followers = 200 chhote writes, milliseconds mein.` },
    { type: 'callout', tone: 'term', title: 'Pull (fan-out on read)', html: `<strong>Ye kya hai:</strong> post sirf author ke paas save. Follower feed khole tab uske follow kiye sab logon ke latest posts laao, jodo, sort karo.<br><strong>Kyun kabhi achha:</strong> likhna sabse sasta (1 row). Inactive users ke liye bekaar kaam nahi hota.<br><strong>Kharab:</strong> har feed open pe ~300 authors se posts laana (kai shards pe), aur feed opens bahut zyada hain. Read mehnga.` },
    { type: 'callout', tone: 'term', title: 'Celebrity problem', html: `<strong>Ye kya hai:</strong> push mein ek post ka kharcha = author ke followers. Normal user ke 200 followers: 200 writes. Ek star ke 5 crore followers: <strong>ek post = 5 crore writes</strong>.<br><strong>Kyun problem:</strong> ~300k writes/s pe bhi ~2.8 minute. Workers busy, baaki sabke posts unke peeche line mein. Aur unme se zyada followers mahino se aaye hi nahi: bekaar kaam aur bekaar RAM.<br><strong>Iske bina (pehchaano nahi):</strong> ek star ka post poore feed system ko jam kar deta hai. <a href="#/sharding">Sharding</a> wali "celebrity key" yahi hai, write ke roop mein.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (push)', html: `Jab sabse bade author ka post bhi kuch second mein sab timelines tak pahunch jaaye (napkin: ~1M followers tak ~3 s), push hi kaafi hai. Agla rung tab, jab bade accounts ke posts minutes lein ya workers ka bada hissa kha jaayein.` },
    { type: 'h3', text: 'Rung 5: hybrid (celebrities ke liye pull)' },
    { type: 'p', html: `<strong>Kahani:</strong> star Meera (5 crore followers) din mein 10 post karti hai = 50 crore timeline writes roz, sirf ek insaan ke liye. Ilaaj: <strong>hybrid</strong>. Normal authors push. Celebrity authors (followers ek threshold, jaise 10 lakh, se zyada) ka post sirf save, kisi timeline mein nahi. Follower feed khole to: apni ready timeline + jin ~5 celebrities ko follow karta hai unke latest posts (ek garam cache se) → merge. Online followers ko "naya post" badge pub/sub se (rung 3).` },
    { type: 'p', html: `<strong>Push vs pull vs hybrid lab.</strong> Ek author ke followers aur roz ke posts chuno. Model: 20% followers roz active, har active follower din mein 10 baar feed kholta hai, workers milke ~300k timeline writes/s, celebrity threshold 10 lakh.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Author ke followers: <strong class="pp-fv"></strong></label><input class="pp-f" type="range" min="3" max="8" step="0.1" value="7.7"></div>
        <div><label>Posts per day: <strong class="pp-pv"></strong></label><input class="pp-p" type="range" min="1" max="50" step="1" value="10"></div></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px" class="pp-m"></div>
        <div class="pp-bars" style="display:grid;gap:8px"></div>
        <div class="stats">
          <div class="stat"><span>Timeline writes / day</span><strong class="pp-w"></strong></div>
          <div class="stat"><span>Inactive pe bekaar writes</span><strong class="pp-x"></strong></div>
          <div class="stat"><span>Extra feed reads / day</span><strong class="pp-r"></strong></div>
          <div class="stat"><span>Ek post sab tak</span><strong class="pp-t"></strong></div>
        </div>
        <div class="calc-note pp-note"></div>`;
      const $ = c => el.querySelector(c);
      const MODES = ['Push', 'Pull', 'Hybrid'], T = 1e6, W = 3e5, ACT = 0.2, OPENS = 10;
      let mi = 0;
      MODES.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = m; b.onclick = () => { mi = i; upd(); }; $('.pp-m').appendChild(b); });
      const f = n => n >= 1e7 ? (n / 1e7).toFixed(1) + ' cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '';
      const tm = s => s < 1 ? Math.round(s * 1000) + ' ms' : s < 120 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
      const upd = () => {
        const F = Math.round(Math.pow(10, +$('.pp-f').value)), P = +$('.pp-p').value;
        const push = mi === 0 || (mi === 2 && F < T);
        const w = push ? F * P : 0, x = push ? F * P * (1 - ACT) : 0, r = push ? 0 : F * ACT * OPENS, t = F / W;
        const busy = F * P / W / 864;
        $('.pp-m').querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === mi));
        $('.pp-fv').textContent = f(F); $('.pp-pv').textContent = P;
        $('.pp-w').textContent = f(w); $('.pp-x').textContent = f(x); $('.pp-r').textContent = f(r);
        $('.pp-t').textContent = push ? tm(t) : 'feed khulte hi';
        const bar = (lbl, v, col) => `<div><div style="font-size:13px;color:var(--ink-2)">${lbl}</div><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:12px;width:${Math.max(push || lbl[0] !== 'W' ? 1 : 0, Math.min(100, v))}%;background:${col}"></div></div></div>`;
        $('.pp-bars').innerHTML = bar('Workers ka din (push writes) ' + (push ? busy.toFixed(busy < 1 ? 3 : 1) + '%' : '0%'), push ? busy : 0, busy > 1 ? 'var(--red)' : 'var(--green)');
        $('.pp-note').innerHTML = (mi === 2 ? (F >= T ? `<strong>Hybrid: ${f(F)} ≥ 10 lakh, isliye pull.</strong> ` : `<strong>Hybrid: ${f(F)} < 10 lakh, isliye push.</strong> `) : '') +
          (push ? `Har post ${f(F)} timelines mein, ${tm(t)} mein. Roz ${f(w)} writes, jinme ${f(x)} un followers ke liye jo aaj aayenge hi nahi. Ye ek author roz workers ka ${busy.toFixed(busy < 1 ? 3 : 1)}% time leta hai.` :
          `Koi timeline write nahi. Har active follower ke har feed open pe is author ke latest posts ek garam cache key se: roz ${f(r)} chhote reads. Ek hi key baar baar, isliye cache mein hit.`);
      };
      $('.pp-f').addEventListener('input', upd); $('.pp-p').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Kharcha (hybrid):</strong> read path complex: do raaste, merge, ranking, aur threshold tune karna. Kuch systems ulta bhi karte hain: <em>inactive followers</em> ke liye push skip, unka feed login pe pull se bana do. Poora feed design: Phase 8 ka <a href="#/design-feed">Instagram / Twitter feed</a> lesson.` },
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (hybrid)', html: `Ye feed seedhi ka sabse upar ka rung hai. Iske baad bas workers, timeline cache shards aur celebrity posts ka hot cache badhao. Threshold ko sirf followers pe mat rakho: <strong>followers × posts per day</strong> (push ka asli kharcha) dekho.` },

    { type: 'h2', text: 'Escalation ladder: do slider ghumao' },
    { type: 'p', html: `Yahan load do cheezon se banta hai: <strong>kitne log online hain</strong> (connections, gateways) aur <strong>ek post ke kitne followers hain</strong> (fan-out). Dono badlo aur dekho kaunse rungs zaroori hote hain, ek post kitna kaam banata hai, aur kitni der mein sab tak pahunchta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Online users (concurrent): <strong class="pf-vn"></strong></label><input class="pf-n" type="range" min="3" max="8" step="0.05" value="6"></div>
          <div><label>Is post ke author ke followers: <strong class="pf-vf"></strong></label><input class="pf-f" type="range" min="1" max="8" step="0.05" value="4"></div>
        </div>
        <div class="pf-ladder" style="display:grid;gap:6px;margin-top:10px"></div>
        <svg class="pf-svg" viewBox="0 0 360 132" style="width:100%;max-width:520px;height:auto;margin-top:12px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Gateways (100k conn each)</span><strong class="pf-gw"></strong></div>
          <div class="stat"><span>Timeline writes / post</span><strong class="pf-w"></strong></div>
          <div class="stat"><span>Sab feeds tak pahunchne mein</span><strong class="pf-t"></strong></div>
          <div class="stat"><span>Live msgs / post (registry → pub/sub)</span><strong class="pf-live"></strong></div>
        </div>
        <div class="calc-note pf-note"></div>`;
      const $ = c => el.querySelector(c);
      const GW = 1e5, ONLINE = 0.1, WORKERS = 3e5, SYNC_MS = 0.5, CELEB = 1e6;
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n).toString();
      const tm = s => s < 1 ? Math.round(s * 1000) + ' ms' : s < 120 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
      const box = (t, x, y, w, on) => `<g opacity="${on ? 1 : 0.3}"><rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" ${on ? '' : 'stroke-dasharray="4 3"'}/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="11.5" fill="var(--ink)" font-family="var(--f-body)">${t}</text></g>`;
      const ln = (d, on) => `<path d="${d}" fill="none" stroke="var(--ink-3)" stroke-width="1.2" opacity="${on ? 1 : 0.2}"/>`;
      const upd = () => {
        const N = Math.round(Math.pow(10, +$('.pf-n').value)), F = Math.round(Math.pow(10, +$('.pf-f').value));
        $('.pf-vn').textContent = f(N); $('.pf-vf').textContent = f(F);
        const gws = Math.ceil(N / GW), live = Math.min(N, Math.round(F * ONLINE));
        const celeb = F >= CELEB;
        const pushT = F / WORKERS, syncT = F * SYNC_MS / 1000;
        const need = [true, gws > 1, gws > 1 && live >= 1000, syncT > 0.5, celeb];
        const why = [
          `${f(N)} connections ÷ 100k = ${gws} server${gws > 1 ? 's' : ''}. ${gws > 1 ? 'Ek server kaafi nahi.' : 'Ek server kaafi hai.'}`,
          gws > 1 ? `${gws} gateways: event kisi bhi gateway pe aaye, receiver kisi aur pe ho sakta hai. Registry chahiye.` : 'Sab ek hi server pe: local map kaafi hai.',
          need[2] ? `${f(live)} online followers ${Math.min(gws, live)} gateways pe phaile. Per-user ${f(live)} lookups+sends ki jagah ${Math.min(gws, live)} pub/sub messages.` : gws > 1 ? `Sirf ${f(live)} online followers: registry se har ek ko seedha bhejna theek.` : 'Sab ek hi server pe: local loop kaafi.',
          need[3] ? `Post API ke andar loop: ${f(F)} × 0.5 ms = ${tm(syncT)}. Post button itni der atka nahi reh sakta: queue + workers.` : `Sync loop sirf ${tm(syncT)}: post API mein hi chal jaayega.`,
          celeb ? `Push mein ${f(F)} writes, workers ko ${tm(pushT)}. Baaki sabke posts line mein. Celebrity posts ko pull pe daalo.` : `Push ${tm(pushT)} mein khatam (< ~3 s): celebrity rung ki zaroorat nahi.`,
        ];
        const names = ['Persistent connections (WebSocket/SSE)', 'Gateway fleet + registry', 'Pub/sub: services → gateways', 'Fan-out on write via queue + workers', 'Hybrid: celebrity posts pull pe'];
        const top = need.lastIndexOf(true);
        $('.pf-ladder').innerHTML = names.map((n, i) => `<div style="border:1px solid ${need[i] ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 10px;background:${i === top ? 'var(--accent-soft)' : 'var(--surface)'};opacity:${need[i] ? 1 : 0.6}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:14px"><strong>${i + 1}. ${n}</strong><span style="font-size:12px;color:${need[i] ? 'var(--accent-ink)' : 'var(--ink-3)'}">${need[i] ? 'zaroori' : 'abhi nahi'}</span></div>
            <div style="font-size:13px;color:var(--ink-2);margin-top:2px">${why[i]}</div></div>`).join('');
        $('.pf-svg').innerHTML = ln('M75 37 H85', true) + ln('M165 37 H175', need[3]) + ln('M260 37 H270', need[3]) +
          ln(need[2] ? 'M125 54 L217 82' : 'M125 54 V82', true) + ln('M175 99 H165', need[2]) + ln('M85 99 H75', true) + ln('M125 116 C125 130, 312 130, 312 116', need[1] && !need[2]) +
          box('Poster', 5, 20, 70, true) + box('Post svc', 85, 20, 80, true) + box('Workers', 175, 20, 85, need[3]) + box(celeb ? 'Timeline+pull' : 'Timelines', 270, 20, 85, true) +
          box('Followers', 5, 82, 70, true) + box(gws > 1 ? 'Gateways ×' + gws : 'WS server', 85, 82, 80, true) + box('Pub/sub', 175, 82, 85, need[2]) + box('Registry', 270, 82, 85, need[1]);
        $('.pf-gw').textContent = String(gws);
        $('.pf-w').textContent = celeb ? '0 (pull)' : f(F);
        $('.pf-t').textContent = celeb ? 'read pe (~0)' : need[3] ? tm(pushT) : tm(syncT);
        $('.pf-live').textContent = f(live) + ' → ' + (need[2] ? Math.min(gws, live) : f(live));
        $('.pf-note').innerHTML = `Sabse upar zaroori rung: <strong>${top + 1}. ${names[top]}</strong>. ` + (celeb ? `Hybrid mein ye post kisi ki timeline mein nahi likha jaata; har follower feed kholte waqt apne followed celebrities (maan lo ~5) ke latest posts alag se laata hai: feed read = 1 timeline read + ~5 chhote reads. Online followers ko "naya post" badge pub/sub se. ` : '') +
          `<br>Assumptions: ek gateway ~100k connections (roadmap), followers ka ~10% online, fan-out workers milke ~300k timeline writes/s (Twitter ke 2013 talk mein ~1M followers tak ~3.5 s p50 se mel khaata hai), sync loop ~0.5 ms per follower write, celebrity threshold 1M followers (asal systems ye knob cost dekh ke set karte hain).`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Widget se kya seekhna hai', html: `Default (10 lakh online, 10k followers): 10 gateways, registry, pub/sub (1k online followers, 10 gateway messages), aur workers (sync loop 5 s hota). Push ~33 ms mein khatam. Followers 8-9 lakh karo: push ~3 s. 1M paar karte hi widget hybrid pe chala jaata hai. 10 crore followers pe push ~5.6 minute leta, isliye hybrid. Online users 50k karo: ek hi server, registry aur pub/sub dono "abhi nahi".` },

    { type: 'h2', text: 'Part 1: live delivery, registry se pub/sub tak' },
    { type: 'p', html: `Pehle online logon tak turant pahunchana. Group chat mein receivers kam hain, live stream mein bahut. Dekho registry kab tak chalti hai aur pub/sub kab aata hai.` },
    { type: 'flow', height: 370,
      nodes: [
        { id: 'cm', label: 'Commenter', sub: 'Riya', x: 75, y: 70, w: 120, kind: 'client', info: 'Ye kya hai: comment ya message bhejne wali user (Riya). Riya ne live stream pe comment kiya, ya group mein message bheja. Uska apna WebSocket kisi ek gateway pe hai (diagram mein seedha service tak dikhaya).' },
        { id: 'cs', label: 'Comment svc', sub: 'save + route', x: 260, y: 70, w: 140, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: comments ki business logic wali service. Kaam: comment validate karo, DB mein save karo (sequence number ke saath), phir receivers tak bhejo: chhote group ke liye registry se, bade audience ke liye pub/sub se.' },
        { id: 'ps', label: 'Pub/sub', sub: 'topic: live:ipl', x: 460, y: 70, w: 150, kind: 'queue', hidden: true, info: 'Ye kya hai: topic wala pub/sub system (jaise Redis Pub/Sub), rung 3. Service ek baar publish karti hai; har subscribed gateway ko ek copy. Redis Pub/Sub message store nahi karta: jo us waqt connected nahi tha, uske liye message gaya.' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 130, y: 220, w: 140, kind: 'cache', info: 'Ye kya hai: user → gateway ki list, rung 2. Redis mein aman → gw2 jaisi entries, TTL ke saath. 1:1 aur chhote group ke liye perfect. Har receiver ka ek lookup.' },
        { id: 'g1', label: 'Gateway 1', sub: '100k sockets', x: 360, y: 220, w: 130, kind: 'server', meter: true, load: 50, info: 'Ye kya hai: connection gateway, rung 1. Sirf connections sambhaalta hai. Apne local users ka map rakhta hai: kaun kaunse topic/room mein hai. Pub/sub se ek message aaya to apne local subscribers ko loop karke bhejta hai.' },
        { id: 'g2', label: 'Gateway 2', sub: '100k sockets', x: 560, y: 220, w: 130, kind: 'server', meter: true, load: 50, info: 'Ye kya hai: doosra connection gateway. Kyun yahan: users kai gateways pe bante hain. Asli system mein aise das-sau gateways.' },
        { id: 'v', label: 'Viewers', sub: 'online receivers', x: 460, y: 330, w: 150, kind: 'client', info: 'Ye kya hai: online receivers, alag alag gateways pe. Group mein 3, live stream mein 10 lakh.' },
      ],
      edges: [{ a: 'cm', b: 'cs' }, { a: 'cs', b: 'reg' }, { a: 'cs', b: 'g1', id: 'd1' }, { a: 'cs', b: 'g2', id: 'd2' }, { a: 'cs', b: 'ps' }, { a: 'ps', b: 'g1' }, { a: 'ps', b: 'g2' }, { a: 'g1', b: 'reg', dashed: true }, { a: 'g1', b: 'v' }, { a: 'g2', b: 'v' }],
      scenarios: [
        { name: 'Group chat: registry', intro: 'Group mein 3 log online: do Gateway 1 pe, ek Gateway 2 pe.', steps: [
          { title: 'Message aaya', text: 'Riya ne group mein likha. Service pehle DB mein save karti hai (seq 812), taaki delivery fail ho to bhi message bacha rahe.', go: 'cm>cs', msg: '{ "group": "g-55", "text": "kal milte hain", "client_msg_id": "c-9" }  → seq 812' },
          { title: 'Har member ka gateway', text: 'Registry se 3 lookups: aman → gw1, kabir → gw1, zoya → gw2. (Ek MGET mein bhi ho sakta hai.)', go: ['cs>reg', 'res:reg>cs'], after: { reg: { state: 'hit', sub: '3 lookups' } }, msg: 'MGET conn:aman conn:kabir conn:zoya  →  [gw1, gw1, gw2]' },
          { title: 'Seedha gateways ko', text: 'Gateway 1 ko ek call (2 users), Gateway 2 ko ek. Gateways sockets pe likh dete hain. Kaam = receivers ke barabar. 3 ya 500 tak ye bilkul theek hai.', parallel: true, go: ['cs>g1>v', 'cs>g2>v'], after: { v: { state: 'ok', sub: 'teeno ko mila' } } },
        ]},
        { name: 'Live stream: pub/sub', intro: 'IPL final ka live stream, 10 lakh viewers, 10 gateways. Har comment sabko dikhana hai.', steps: [
          { title: 'Registry tareeka phat jaata hai', text: 'Har comment pe 10 lakh registry lookups aur 10 lakh alag sends. 1,000 comments/s × 10 lakh = 1 arab operations/s. Registry aur service dono gaye.', flood: { paths: ['cs>reg', 'cs>g1', 'cs>g2'], n: 15 }, after: { reg: { state: 'hot', sub: '10 lakh lookups!' }, cs: { state: 'hot', load: 99 } } },
          { title: 'Gateways subscribe karte hain', text: 'Ab ulta socho. Jab koi viewer stream join karta hai, uska gateway <code>live:ipl</code> topic subscribe karta hai (agar pehle se nahi kiya) aur local list mein viewer jod leta hai. Pub/sub ko sirf "kaunse gateways" pata hai, users nahi.', show: ['ps'], hide: ['d1', 'd2'], parallel: true, go: ['g1>ps', 'g2>ps'], set: { reg: { state: '', sub: 'sirf 1:1 ke liye' }, cs: { state: '', load: 20 } }, msg: 'SUBSCRIBE live:ipl     (har gateway ek baar)' },
          { title: 'Ek publish', text: 'Comment aaya: service save karke <strong>ek</strong> publish karti hai. Pub/sub 10 gateways ko 10 copies deta hai.', go: ['cm>cs', 'cs>ps'], after: { ps: { state: 'hit', sub: '1 → 10 gateways' } }, msg: 'PUBLISH live:ipl {"seq": 40012, "user": "riya", "text": "SIXER!"}' },
          { title: 'Gateway local fan-out', text: 'Har gateway apne ~1 lakh local viewers ko loop karke bhejta hai. Kaam ab gateways mein baraabar bant gaya. Service ka kaam: 1 publish. Ek aur trick: 1,000 comments/s koi padh nahi sakta, to gateway har viewer ko sirf ek sample (jaise 20/s) ya batch bhejta hai.', parallel: true, go: ['ps>g1>v', 'ps>g2>v'], after: { v: { state: 'ok', sub: '10 lakh ko mila' }, g1: { load: 70 }, g2: { load: 70 } } },
        ]},
        { name: 'Failure: pub/sub message miss', intro: 'Pub/sub sabse upar ka rung hai. Ab ek network blip.', steps: [
          { title: 'Gateway 2 ka pub/sub link toota', text: 'Gateway 2 ka pub/sub connection 2 second ke liye toota. Is beech comment 40013 publish hua.', show: ['ps'], hide: ['d1', 'd2'], set: { g2: { state: 'warn', sub: 'resubscribing' } }, parallel: true, go: ['cm>cs>ps', 'ps>g1>v', 'lost:ps>g2'] },
          { title: 'Message gaya', text: 'Redis Pub/Sub <strong>at-most-once</strong> hai: jo subscriber us pal connected nahi tha, uske liye message kahin store nahi hua. Gateway 2 ke 1 lakh viewers ko 40013 kabhi nahi milega.', focus: ['ps', 'g2'], after: { ps: { state: 'warn', sub: 'no storage' } } },
          { title: 'Fix: seq + catch-up', text: 'Har message ka sequence number hai aur wo DB mein saved hai. Gateway 2 wapas subscribe karke dekhta hai: aakhri mila 40012, ab aaya 40014. Gap! Wo service se 40013 maang leta hai. Jahan ye bhi zaroori nahi (live comments), wahan chhota loss chalta hai. Jahan har message zaroori hai (chat), wahan durable log (Redis Streams, Kafka) ya client ka "last seq se resume".', show: ['d2'], go: ['g2>ps', 'g2>cs', 'res:cs>g2>v'], after: { g2: { state: 'ok', sub: 'gap filled: 40013' }, ps: { state: '', sub: 'topic: live:ipl' } }, msg: 'last_seen=40012, got=40014 → fetch 40013' },
        ]},
      ],
    },

    { type: 'h2', text: 'Part 2: feed fan-out, push vs pull' },
    { type: 'p', html: `Live delivery sirf online logon ke liye hai. Baaki followers jab bhi app kholein, post unke feed mein hona chahiye. Yahan asli sawaal: kaam <strong>post karte waqt</strong> karein (push) ya <strong>feed padhte waqt</strong> (pull)?` },
    { type: 'flow', height: 350,
      nodes: [
        { id: 'p', label: 'Poster', sub: '200 followers', x: 75, y: 70, w: 120, kind: 'client', info: 'Ye kya hai: post karne wala user. Normal user ke ~200 followers; celebrity ke crores.' },
        { id: 'post', label: 'Post service', x: 260, y: 70, w: 140, kind: 'server', info: 'Ye kya hai: posts lene wali service. Post ko Posts DB mein save karti hai, phir fan-out job queue mein daalti hai (push) ya kuch nahi karti (pull / celebrity).' },
        { id: 'q', label: 'Fan-out workers', sub: 'queue + workers', x: 470, y: 70, w: 160, kind: 'queue', meter: true, load: 15, info: 'Ye kya hai: fan-out ka kaam karne wali queue (Kafka/SQS) + workers. Har job: author ke followers ki list nikaalo, har follower ki timeline mein post ID daalo. Post API ko iska intezaar nahi karna padta.' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis: list/user', x: 630, y: 200, w: 140, kind: 'cache', meter: true, load: 20, info: 'Ye kya hai: har user ki ready timeline list (Redis). Latest ~800 post IDs (Twitter 2013 mein bhi ~800 ki limit thi). Sirf IDs, poora post nahi; post ka content alag cache/DB se. Precomputed view ka hi roop.' },
        { id: 'pdb', label: 'Posts DB', sub: 'by author', x: 260, y: 200, w: 140, kind: 'data', meter: true, load: 20, info: 'Ye kya hai: posts ka database, har post ka asli ghar, author_id + time se sharded/indexed. Pull aur hybrid mein feed service yahan se author ke latest posts padhti hai.' },
        { id: 'feed', label: 'Feed service', x: 420, y: 300, w: 140, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: feed banane wali service. Kaam: timeline cache padho, (hybrid mein) followed celebrities ke latest posts Posts DB/cache se laao, time ya ranking se merge karo, post content bharo, page karo.' },
        { id: 'f', label: 'Follower', sub: 'app khola', x: 75, y: 300, w: 120, kind: 'client', info: 'Ye kya hai: follower ki app. Follower ne app khola: GET /feed. Reads posts se kahin zyada hote hain (Twitter 2013: ~300k timeline reads/s vs ~5-6k tweets/s).' },
      ],
      edges: [{ a: 'p', b: 'post' }, { a: 'post', b: 'q' }, { a: 'q', b: 'tl' }, { a: 'post', b: 'pdb' }, { a: 'f', b: 'feed' }, { a: 'feed', b: 'tl' }, { a: 'feed', b: 'pdb' }],
      scenarios: [
        { name: 'Push (fan-out on write)', steps: [
          { title: 'Post save', text: 'Aman (200 followers) ne post kiya. Post service Posts DB mein save karti hai.', go: ['p>post>pdb', 'res:pdb>post>p'], msg: 'INSERT post 9001 by aman' },
          { title: 'Fan-out job', text: 'Ek job queue mein: "9001 ko aman ke followers tak". Post API ne user ko turant OK de diya.', go: 'evt:post>q', after: { q: { sub: 'job: 9001 → 200' } } },
          { title: '200 timelines mein', text: 'Worker followers list padhta hai aur har ek ki list ke aage 9001 daalta hai (pipeline mein, milliseconds). Write = followers ki ginti.', go: 'q>tl', after: { tl: { state: 'hit', sub: '+200 entries' } }, msg: 'LPUSH timeline:riya 9001; LTRIM timeline:riya 0 799   (×200)' },
          { title: 'Feed padhna: ek list', text: 'Riya ne app khola. Feed service ek list padhti hai, post content cache se bharti hai. Sasta aur fast, aur reads hi zyada hain. Isliye default push.', go: ['f>feed>tl', 'res:tl>feed>f'], after: { f: { state: 'ok', sub: 'feed ~10 ms' } }, msg: 'LRANGE timeline:riya 0 49' },
        ]},
        { name: 'Pull (fan-out on read)', steps: [
          { title: 'Post sirf save', text: 'Post hua, sirf Posts DB mein. Koi fan-out nahi. Likhna sabse sasta.', go: ['p>post>pdb'], set: { q: { state: 'dim' }, tl: { state: 'dim' } } },
          { title: 'Feed padhte waqt sab jodo', text: 'Riya 300 logon ko follow karti hai. Har feed open pe: 300 authors ke latest posts laao (scatter, kai shards pe), merge, sort, top 50. Har read mehnga, aur feed opens posts se 50-100 guna zyada.', go: ['f>feed>pdb', 'res:pdb>feed>f'], after: { pdb: { state: 'hot', load: 95, sub: '300 queries/open' }, feed: { state: 'hot', load: 90 } }, msg: 'for author in following(riya): latest_posts(author, 20)   -- ×300, then merge' },
          { title: 'Kab achha?', text: 'Pull tab theek jab reads kam hon, ya follow kam logon ko karte hon, ya inactive users ke liye (jo mahine mein ek baar aate hain, unki timeline har post pe bharna bekaar). Aur celebrities ke posts ke liye: ek baar likho, sab padh lo.', focus: ['pdb'] },
        ]},
        { name: 'Failure: celebrity push', intro: 'Push sabse upar ka default hai. Ab ek star (5 crore followers) post karti hai.', steps: [
          { title: 'Ek post, 5 crore writes', text: 'Fan-out job: 5 crore timelines. ~300k writes/s pe bhi ~2.8 minute. Twitter ke 2013 ke talk mein bhi bataya gaya tha ki bade accounts ke tweets ko sab tak pahunchne mein kabhi minutes lag jaate the.', set: { p: { label: 'Star', sub: '5 cr followers' } }, go: ['p>post>pdb', 'evt:post>q'], after: { q: { state: 'hot', load: 99, sub: 'backlog: 5 cr' } } },
          { title: 'Workers jam, timelines garam', text: 'Workers aur Redis is ek post mein busy. Aman ka normal post iske peeche line mein, uske followers ko minutes baad. Kuch followers ko reply (jo turant aaya) original se pehle dikhta hai.', flood: { paths: ['q>tl'], n: 16 }, after: { tl: { state: 'hot', load: 98, sub: 'writes flood' } } },
          { title: 'Aur zyada barbaadi', text: '5 crore mein se bahut log mahino se aaye hi nahi. Unki timelines bharna bekaar kaam aur bekaar RAM. Aur star ek din mein 10 post kare to 50 crore writes.', focus: ['q', 'tl'] },
        ]},
        { name: 'Hybrid: celebrity pull', intro: 'Rule: author ke followers ek threshold (maan lo 1M) se zyada, to push mat karo.', steps: [
          { title: 'Star ka post: sirf save', text: 'Post service dekhti hai: author celebrity hai. Sirf Posts DB (aur ek hot cache) mein. Koi fan-out job nahi. Online followers ko "naya post" badge pub/sub topic se (Part 1).', set: { p: { label: 'Star', sub: '5 cr followers' } }, go: ['p>post>pdb'], after: { q: { state: 'ok', load: 15, sub: 'celeb skip' } } },
          { title: 'Normal posts: push jaari', text: 'Aman jaise normal users ke posts pehle ki tarah push. Workers ab aaram se.', go: ['evt:post>q', 'q>tl'], after: { tl: { state: 'ok', load: 25, sub: 'normal posts' } } },
          { title: 'Feed: ready list + celeb merge', text: 'Riya feed kholti hai: (1) apni ready timeline list, (2) wo jin ~5 celebrities ko follow karti hai unke latest posts (bahut garam, isliye cache mein), (3) time/rank se merge. Thoda zyada read kaam, lekin 5 crore writes bache.', parallel: true, go: ['f>feed>tl', 'f>feed>pdb'], after: { feed: { state: 'ok', sub: 'merge: list + 5 celebs' } } },
          { title: 'Response', text: 'Merged feed wapas. Read cost ~1 list + ~5 chhote reads; write cost celebrity ke liye zero. Push aur pull dono ki achhi baat.', go: 'res:feed>f', after: { f: { state: 'ok', sub: 'feed + star post' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Har rung, symptom, kharcha, limit' },
    { type: 'table', head: ['Rung', 'Symptom jo isse force karta hai', 'Kharcha', 'Kahan haarta hai'], rows: [
      ['1. Gateways', 'Ek server ke ~100k connections bhar gaye; deploys pe app logic aur sockets saath girte hain', 'Stateful fleet, L4 LB, heartbeats, reconnect storms', 'Event kis gateway pe jaaye, pata nahi'],
      ['2. Registry', 'Receiver doosre gateway pe hai', 'Har delivery pe lookup; TTL, stale entries', 'Bade audience: har receiver ka alag lookup + send'],
      ['3. Pub/sub', 'Ek event ke hazaaron online receivers, kai gateways pe', 'Ek aur system; Redis Pub/Sub at-most-once; hot topic', 'Sirf online logon ke liye; offline ke liye store chahiye'],
      ['4. Fan-out on write', 'Feeds padhna mehnga (pull), reads bahut zyada', 'Writes = followers; RAM har timeline ke liye', 'Celebrity: ek post = crores writes'],
      ['5. Hybrid', 'Bade accounts ke posts minutes lete, workers jam', 'Read path complex: merge, do raaste, threshold tuning', 'Ranking/merge latency; celeb posts ka hot cache'],
    ], caption: 'Roadmap: "Persistent connection gateways, a registry of who is connected where, pub/sub between services and gateways, and push vs pull fan-out for large audiences."' },
    { type: 'compare',
      left: { title: 'Push (fan-out on write)', html: `• Write: followers jitna kaam<br>• Read: ek list, bahut sasta<br>• Feed taaza (seconds mein)<br>• Kharab: celebrities, inactive followers pe bekaar kaam, RAM<br>• Best: normal users, read-heavy app` },
      right: { title: 'Pull (fan-out on read)', html: `• Write: ek row<br>• Read: har followee se laao + merge, mehnga<br>• Feed hamesha latest (padhte waqt bana)<br>• Kharab: bahut zyada feed opens, bahut followees<br>• Best: celebrities ke posts, inactive users, kam reads` },
    },
    { type: 'p', html: `<strong>Hybrid</strong> dono ko jodta hai: normal authors push, celebrity authors pull, aur follower ka feed padhte waqt dono merge. Threshold ek knob hai: followers count, ya "push ki keemat vs pull ki keemat" ka hisaab. Kuch systems ulta bhi karte hain: <em>inactive followers</em> ke liye push skip, unka feed login pe pull se bana do.` },

    { type: 'h3', text: 'Pub/sub ke andar ki teen baatein' },
    { type: 'list', items: [
      `<strong>Topic granularity:</strong> topic per gateway (<code>gw:7</code>, service registry dekh ke wahan publish kare) ya topic per room/stream (<code>live:ipl</code>, gateways subscribe karein). Pehla 1:1 chat ke liye, doosra bade rooms ke liye. Bahut saare chhote rooms hon to per-room topics ka hisaab-kitaab (subscribe/unsubscribe churn) bhi kharcha hai.`,
      `<strong>Hot topic:</strong> ek topic ek hi pub/sub node pe (Redis Cluster mein sharded pub/sub, version 7 se, channel ko slot ke hisaab se ek shard pe rakhta hai). 10 lakh viewers ka topic bhi sirf ~10 gateways ko jaata hai, isliye ye zyada-tar theek hai. Lekin 1,000 gateways ho jaayein to ek layer aur: regional relays (pub/sub ka tree).`,
      `<strong>Ordering aur durability:</strong> live comments mein thoda loss/reorder chalta hai. Chat aur notifications mein nahi: wahan pehle durable store (DB/Kafka), phir push, aur client "last seq se resume" kare (Realtime lesson wala niyam: pehle store, phir deliver).`,
    ]},

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>1. "WebSocket push = fan-out on write."</strong> Nahi. WebSocket push online logon ki <em>screen</em> tak pahunchata hai (live delivery). Fan-out on write followers ki <em>stored timeline</em> bharta hai. Ek post dono kar sakta hai: timeline mein bhi, aur online logon ko badge bhi.<br><strong>2. "Pub/sub message queue hai, kuch nahi khoyega."</strong> Redis Pub/Sub kuch store nahi karta. Jo us pal nahi sun raha tha, uska message gaya. Zaroori data ke liye durable log + resume.<br><strong>3. "Push hamesha behtar, reads sasti."</strong> Celebrity aur inactive users pe push bekaar kaam hai. Interview mein push bolo, phir khud celebrity problem uthao aur hybrid batao.<br><strong>4. "Gateway pe user ka data rakh lo."</strong> Gateway sirf connection rakhe. Messages DB mein, mapping registry mein, warna gateway gira to sab gaya.` },

    { type: 'h2', text: 'Real duniya mein: Twitter ka timeline (2013)' },
    { type: 'p', html: `Twitter ke engineering VP Raffi Krikorian ke 2012-13 ke "Timelines at Scale" talk (QCon; HighScalability ne July 2013 mein summary likhi) ke hisaab se us waqt: ~150M active users, timeline reads ~300k/s, tweets ~5k/s average (bade events pe 12k+/s). Home timeline <strong>fan-out on write</strong> se banti thi: har tweet followers ki Redis timeline list mein (har list ~800 entries, Redis mein 3 copies). Lady Gaga (~3.1 crore followers) jaise accounts ke tweets ka fan-out minutes le sakta tha, aur replies kabhi original se pehle dikh jaate the. Talk mein bataya gaya ki aise bahut bade accounts ke liye fan-out chhod kar unke tweets <strong>padhte waqt merge</strong> karne ki taraf ja rahe hain: wahi hybrid. Ye 10+ saal purani jaankari hai; aaj ka X ka system badal chuka hai, lekin pattern aaj bhi feed design ki textbook baat hai. Poora feed design: Phase 8 ka <a href="#/design-feed">Instagram / Twitter feed</a> lesson.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Do sawaal alag alag poochho. <strong>Live delivery:</strong> ek server ke connections se zyada log? <strong>Gateways</strong>. Receiver doosre gateway pe? <strong>Registry</strong> (1:1, chhote groups). Ek event ke bahut saare online receivers? <strong>Pub/sub</strong> topic, gateways local fan-out karein; zaroori messages ke liye durable store + resume. <strong>Feed delivery:</strong> reads zyada aur authors normal? <strong>Push</strong> via queue + workers. Celebrity authors ya bahut inactive followers? <strong>Hybrid</strong>: unke posts pull pe, read pe merge. Sabke liye same data (live score)? Fan-out ki zaroorat hi nahi: <strong>CDN + polling</strong> (Realtime lesson).` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'p', html: `Saare paanch rung ek saath. Baayein: live delivery (online logon ki screen tak). Daayein: feed delivery (stored timeline tak). Buttons daba ke ek ek raasta dekho.` },
    { type: 'diagram', title: 'Fan-out: poori seedhi xyz.com mein', height: 510,
      groups: [
        { label: 'Live delivery (online)', x: 15, y: 135, w: 350, h: 355 },
        { label: 'Feed delivery (stored)', x: 372, y: 135, w: 343, h: 355 },
      ],
      nodes: [
        { id: 'poster', label: 'Poster app', sub: 'Aman / star', x: 90, y: 60, kind: 'client', info: 'Ye kya hai: post ya comment karne wala user. Kyun yahan: yahin se ek event shuru hota hai jo N logon tak jaana hai.' },
        { id: 'post', label: 'Post service', sub: 'save + route', x: 450, y: 60, kind: 'server', info: 'Ye kya hai: post lene wali service. Kyun yahan: post save karti hai, online logon ke liye pub/sub pe publish karti hai, aur normal authors ke liye fan-out job queue mein daalti hai. Celebrity ho to job skip.' },
        { id: 'q', label: 'Fan-out workers', sub: 'rung 4: push', x: 630, y: 60, w: 150, kind: 'queue', info: 'Ye kya hai: queue + workers. Kyun yahan: har follower ki timeline mein post ID daalte hain, post API ko rukna nahi padta. ~300k writes/s milke.' },
        { id: 'reg', label: 'Registry', sub: 'rung 2: user → gw', x: 90, y: 190, w: 140, kind: 'cache', info: 'Ye kya hai: Redis mein conn:aman → gw11 jaisi entries, TTL ke saath. Kyun yahan: 1:1 aur chhote groups ke liye receiver ka gateway dhoondhna. Gateway connect pe likhta hai.' },
        { id: 'ps', label: 'Pub/sub', sub: 'rung 3: topics', x: 270, y: 190, w: 150, kind: 'queue', info: 'Ye kya hai: topic wala pub/sub (Redis Pub/Sub, NATS). Kyun yahan: service 1 publish, har subscribed gateway ko ek copy. Message store nahi karta, isliye seq number + catch-up.' },
        { id: 'pdb', label: 'Posts DB', sub: '+ hot celeb cache', x: 450, y: 190, w: 150, kind: 'data', info: 'Ye kya hai: har post ka asli ghar, author + time se. Kyun yahan: celebrity posts yahin (aur ek garam cache mein) rehte hain; hybrid mein feed read pe yahin se aate hain (rung 5).' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis list/user', x: 630, y: 190, w: 150, kind: 'cache', info: 'Ye kya hai: har user ki ready list, latest ~800 post IDs. Kyun yahan: push ka nateeja; feed padhna = ek list padhna.' },
        { id: 'gw', label: 'Gateway fleet', sub: 'rung 1: WebSockets', x: 180, y: 320, w: 160, kind: 'server', info: 'Ye kya hai: sirf connections sambhaalne wale servers (~100k each, ~60% tak bhare). Kyun yahan: lakhon khule connections; topic subscribe karke apne local users ko message dete hain.' },
        { id: 'feed', label: 'Feed service', sub: 'rung 5: merge', x: 540, y: 320, w: 150, kind: 'server', info: 'Ye kya hai: feed banane wali service. Kyun yahan: ready timeline + followed celebrities ke latest posts merge karti hai (hybrid), content bharti hai, page karti hai.' },
        { id: 'online', label: 'Online users', sub: 'screen pe turant', x: 180, y: 450, w: 150, kind: 'client', info: 'Ye kya hai: abhi app khole hue log. Kyun yahan: inhe live comment ya "naya post" badge seconds mein milta hai, gateway ke through.' },
        { id: 'fol', label: 'Follower app', sub: 'GET /feed', x: 540, y: 450, w: 150, kind: 'client', info: 'Ye kya hai: follower jo baad mein app kholta hai. Kyun yahan: feed read path; reads posts se 50-100 guna zyada, isliye ye sasta hona chahiye.' },
      ],
      edges: [
        { a: 'poster', b: 'post', n: 1 },
        { a: 'post', b: 'pdb', n: 2, label: 'save' },
        { a: 'post', b: 'q', n: 3, kind: 'evt' },
        { a: 'q', b: 'tl', label: 'push IDs' },
        { a: 'post', b: 'ps', kind: 'evt', label: 'publish' },
        { a: 'ps', b: 'gw', kind: 'evt' },
        { a: 'gw', b: 'reg', dashed: true, label: 'register' },
        { a: 'gw', b: 'online', kind: 'res' },
        { a: 'fol', b: 'feed' },
        { a: 'feed', b: 'tl' },
        { a: 'feed', b: 'pdb', label: 'celeb posts' },
      ],
      paths: [
        { name: 'Live comment', text: 'Post service 1 baar publish karti hai. Pub/sub har gateway ko ek copy, gateway apne local users ko.', go: ['poster>post>ps>gw>online'] },
        { name: 'Connect', text: 'User ka app gateway se WebSocket kholta hai. Gateway registry mein likhta hai: ye user yahan hai.', go: ['online>gw>reg'] },
        { name: 'Push to timelines', text: 'Normal author: post save, phir workers har follower ki timeline mein ID daalte hain.', go: ['poster>post>pdb', 'post>q>tl'] },
        { name: 'Hybrid feed read', text: 'Follower ki ready timeline + celebrity posts Posts DB/cache se, merge karke wapas.', go: ['fol>feed>tl', 'feed>pdb', 'res:feed>fol'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Fan-out = ek event, N receivers. Do tarah: live delivery (online screen) aur feed delivery (stored timeline).</li>
      <li>Gateways sirf connections sambhaalte hain (~100k each, ~60% tak bhare). Reconnects mein jitter.</li>
      <li>Registry (user → gateway) 1:1 aur chhote groups ke liye. Kaam = receivers ki ginti.</li>
      <li>Pub/sub: service 1 publish, gateways local fan-out. Redis Pub/Sub store nahi karta: seq + catch-up.</li>
      <li>Push (fan-out on write): reads saste, writes = followers. Default jab reads zyada hon.</li>
      <li>Pull (fan-out on read): write sasta, har read mehnga. Celebrities aur inactive users ke liye.</li>
      <li>Hybrid: normal authors push, celebrity authors pull, feed read pe merge. Threshold = followers × posts/day.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Ek event lakhon tak seconds mein (gateways + pub/sub)', 'Service ka kaam audience size se alag: 1 publish, gateways baant lete hain', 'Push se feed reads bahut saste (ek list)', 'Hybrid se celebrity posts ka write toofan khatam', 'Har rung alag scale hota hai: gateways, pub/sub, workers, timeline cache'],
      costs: ['Stateful gateways: reconnect storms, drain on deploy', 'Registry/pub/sub ek aur system; Redis Pub/Sub messages store nahi karta', 'Push: writes = followers, timelines ki RAM, inactive users pe bekaar kaam', 'Hybrid: read path complex (merge, ranking), threshold tune karna', 'Ordering/duplicates/gaps: seq numbers aur resume logic chahiye'] },

    { type: 'think', questions: [
      { q: 'xyz.com group chat mein limit 500 members hai. Push karoge ya pull? Pub/sub chahiye?', a: 'Push (har member ke inbox/sync stream mein, ya message ek baar store karke har member ka "unread pointer" badhao). 500 chhota fan-out hai, celebrity problem nahi. Online members ke liye registry se gateways tak (ya per-gateway topic). Limit hone ki wajah se hi ye simple rehta hai: WhatsApp jaisi apps groups ka size isi liye cap karti hain.' },
      { q: 'Uber jaisa app: rider apne driver ki live location dekh raha hai. Fan-out kitna hai, aur kaunsa rung?', a: 'Fan-out chhota: ek driver → ek rider (ya share-trip ke 2-3 log). Driver har kuch second location bhejta hai; trip ka topic (trip:123) ya registry se rider ke gateway tak push. Celebrity problem nahi. Asli chunauti writes ki hai (lakhon drivers × har kuch second), jo Scaling writes lesson wala sauda hai: sirf latest location memory mein.' },
      { q: 'Celebrity threshold 1M rakha. Ek user 9.9 lakh followers pe hai aur roz 50 post karta hai. Problem?', a: 'Haan, threshold sirf followers pe nahi, kaam pe hona chahiye: followers × posts per day. 9.9 lakh × 50 = ~5 crore writes/day, ek bade celebrity ke ek post se zyada. Behtar rule: push ka cost (followers × post rate) ek budget se upar ho to pull. Aur inactive followers ko push se nikaal do.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Message Gateway 1 pe aaya, receiver Gateway 2 pe hai. 1:1 chat ke liye seedha tareeka?', options: ['Saare gateways ko broadcast', 'Registry se receiver ka gateway dhoondho aur wahan bhejo', 'Receiver ko poll karne bolo'], answer: 1, explain: 'Registry (user → gateway) 1:1 aur chhote groups ke liye sahi. Broadcast sab gateways ko bekaar kaam deta hai.' },
      { q: 'Live stream pe 10 lakh viewers, 10 gateways. Ek comment ke liye service kitne messages bhejti hai pub/sub ke saath?', options: ['10 lakh', '1 publish (pub/sub 10 gateways ko deta hai)', '0'], answer: 1, explain: 'Service ek publish karti hai. Pub/sub har subscribed gateway ko ek copy, aur gateway apne local viewers ko.' },
      { q: 'Fan-out on write ka sabse bada nuksaan?', options: ['Feed padhna slow', 'Ek post ka write kaam followers ke barabar: celebrities pe crores writes', 'Post save nahi hota'], answer: 1, explain: 'Push mein reads saste, writes = followers. Celebrity problem isi se aati hai.' },
      { q: 'Hybrid feed mein follower ka feed kaise banta hai?', options: ['Sirf uski timeline list se', 'Timeline list (normal authors, push) + followed celebrities ke latest posts (pull), merge', 'Saare followees se pull'], answer: 1, explain: 'Normal authors push se list mein, celebrities ke posts read time pe, dono merge.' },
      { q: 'Redis Pub/Sub se gateway ka connection 2 s toota. Us beech ke messages?', options: ['Redis queue mein rakh ke baad mein deta hai', 'Kho gaye; seq number + DB se catch-up chahiye', 'Gateway ko apne aap mil jaate hain'], answer: 1, explain: 'Redis Pub/Sub at-most-once hai, store nahi karta. Zaroori data ke liye durable store aur gap fill.' },
    ]},
    { type: 'sources', note: 'Twitter ke numbers 2012-13 ke hain aur aaj ke X system ko describe nahi karte. Gateway capacity (~100k) aur worker throughput widget ke assumptions hain.', items: [
      { title: 'The Architecture Twitter Uses To Deal With 150M Active Users, 300K QPS, A 22 MB/S Firehose, And Send Tweets In Under 5 Seconds', publisher: 'High Scalability (summary of Raffi Krikorian, "Timelines at Scale", QCon 2012)', url: 'http://highscalability.com/blog/2013/7/8/the-architecture-twitter-uses-to-deal-with-150m-active-users.html', year: 2013, used: 'Fan-out on write into Redis timelines (~800 entries, 3 replicas), 300k timeline reads/s vs ~5k tweets/s, 3.5 s p50 to deliver to 1M followers, slow fan-out for accounts with tens of millions of followers, replies before originals, plan to merge such accounts at read time.' },
      { title: 'Timelines at Scale (talk)', publisher: 'InfoQ / QCon San Francisco 2012', official: true, url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/', year: 2012, used: 'Original talk behind the summary above.' },
      { title: 'Redis Pub/Sub', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/pubsub/', used: 'At-most-once delivery semantics; sharded Pub/Sub (Redis 7.0) assigns channels to slots/shards.' },
    ]},
  ],
});
