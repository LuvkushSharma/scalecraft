Lesson.register({
  id: 'resilience',
  title: 'API gateway, retries, circuit breaker',
  minutes: 35,
  summary: `xyz.com ab ek bada app nahi, das chhoti services hai. Network calls ab naye tareekon se fail hoti hain: ek slow service poori site gira sakti hai. Is lesson mein API gateway, BFF, service discovery, timeouts, retries + backoff + jitter, circuit breaker, bulkhead, service mesh aur graceful degradation, sab khud chala ke.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ab ek bada program nahi raha. Wo das chhote programs (services) ban gaya hai jo aapas mein network pe baat karte hain.<br>Network pe baat karna phone call jaisa hai: kabhi line busy, kabhi aawaz late, kabhi call hi kat jaati hai.<br>Agar ek service slow ho gayi aur baaki sab uska intezaar karte rahe, to poori site ruk jaati hai.<br>Is lesson mein wo niyam hain jo is "ek ki bimaari sab mein phail gayi" wali problem ko rokte hain: kitna intezaar karo, kitni baar dobara try karo, kab try karna hi band karo, aur kuch toote to bhi site kaise chalti rahe.` },
    { type: 'h2', text: 'Problem: ek app, das services' },
    { type: 'p', html: `xyz.com ki team 8 se 80 log ho gayi. Ek bada codebase sambhalna mushkil tha, to app ko alag alag <strong>services</strong> mein tod diya: User service, Feed service, Recommendations service, Comments, Payments, Notifications... Har team apni service khud deploy karti hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Microservices', html: `<strong>Ye kya hai:</strong> ek bade app ko chhoti, alag deploy hone wali services mein todna, jo aapas mein network pe (HTTP/gRPC) baat karti hain.<br><strong>Kyun chahiye:</strong> 80 log ek hi codebase pe kaam karein to har deploy mein jhagda. Alag services = har team apni speed se.<br><strong>Iske bina:</strong> ek chhota bug fix bhi poore app ka deploy maangta hai.<br><strong>Keemat:</strong> pehle jo ek function call tha (<code>getRecommendations()</code>), ab wo network call hai. Aur network calls slow ho sakti hain, fail ho sakti hain, ya kabhi jawab hi nahi aata. Ye poora lesson isi keemat ke baare mein hai.` },
    { type: 'p', html: `Isse do naye sawaal paida hue. Pehla: mobile app ab kis kis se baat kare? Doosra, zyada khatarnaak: ek service slow hui to baaki ka kya hoga? Pehle sawaal se shuru karte hain.` },

    { type: 'h2', text: 'API gateway: ek darwaza, andar bahut kamre' },
    { type: 'p', html: `Mobile app ka home screen dikhane ke liye user info, feed, recommendations aur notifications count chahiye. Agar app khud chaaron services ko seedha call kare, to: chaar alag addresses app mein hard-code, har service ko alag se login check karna, har service ko internet pe khula rakhna, aur mobile pe chaar network round trips.` },
    { type: 'callout', tone: 'term', title: 'Naya word: API Gateway', html: `<strong>Ye kya hai:</strong> saari services ke aage baitha ek "main gate". Bahar ki duniya ke liye ek hi address (<code>api.xyz.com</code>). Har request yahan aati hai, gateway check karta hai (login, limit) aur decide karta hai kis service ko bhejni hai. Technical naam: <strong>reverse proxy</strong> (wo server jo clients ki taraf se nahi, servers ki taraf se requests leta aur aage bhejta hai).<br><strong>Kyun chahiye:</strong> app ko sirf ek address yaad rakhna hai, login ek jagah check, services internet se chhupi.<br><strong>Iske bina:</strong> app mein chaar addresses hard-code, har service mein alag login check, sab services internet pe khuli.<br><strong>Example:</strong> Kong, AWS API Gateway, Apigee, ya Envoy/Nginx based setups.` },
    { type: 'table', head: ['Gateway ka kaam', 'Matlab'], rows: [
      ['Authentication', 'JWT/token ek hi jagah check. Services ko bharosa hai ki aayi hui request ka user verify ho chuka.'],
      ['Rate limiting', 'Ek user/IP/API key kitni requests bhej sakta hai, yahin rokta hai (429 Too Many Requests).'],
      ['Routing', '<code>/feed/*</code> Feed service ko, <code>/pay/*</code> Payments ko. Services ka andar ka address bahar kisi ko nahi pata.'],
      ['Aggregation', 'Ek request pe kai services ko call karke ek combined response bana sakta hai, taaki mobile ko ek hi round trip lage.'],
      ['Baaki common kaam', 'TLS termination, request logging, metrics, request ID lagana, response compression.'],
    ]},
    { type: 'p', html: `Gateway ke andar ek request ka safar khud chala ke dekho. Path, token aur "is minute mein is user ki kitni requests" chuno. Gateway har check baari baari karta hai, aur pehle fail hone wale check pe hi ruk ke error lauta deta hai:` },
    { type: 'custom', render(el) {
      const PATHS = [['/feed/42', 'Feed service'], ['/pay/charge', 'Payments service'], ['/comments/9', 'Comments service'], ['/internal/admin', null]];
      const TOK = [['valid', 'Sahi token'], ['missing', 'Token nahi'], ['expired', 'Expired token']];
      let pi = 0, ti = 0;
      el.innerHTML = `<label>Path</label><div class="re-g-p" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="margin-top:10px"><label>Token</label><div class="re-g-t" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
        <div style="margin-top:10px"><label>Is user ki is minute ki requests: <strong class="re-g-nv"></strong> (limit 100/min)</label><input class="re-g-n" type="range" min="1" max="150" step="1" value="12"></div>
        <div class="re-g-steps" style="margin-top:12px;font:14px/1.8 var(--f-mono)"></div>
        <div class="stats"><div class="stat"><span>Jawab</span><strong class="re-g-res"></strong></div></div>`;
      const chips = (sel, list, get, set) => { const b0 = el.querySelector(sel); b0.innerHTML = ''; list.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === i ? ' on' : ''); b.textContent = x[0] === 'valid' || x[0] === 'missing' || x[0] === 'expired' ? x[1] : x[0]; b.onclick = () => { set(i); upd(); }; b0.appendChild(b); }); };
      const nE = el.querySelector('.re-g-n');
      const upd = () => {
        chips('.re-g-p', PATHS, () => pi, i => { pi = i; });
        chips('.re-g-t', TOK, () => ti, i => { ti = i; });
        const n = +nE.value, [path, svc] = PATHS[pi], tok = TOK[ti][0], steps = [];
        let res, col = 'var(--red)';
        el.querySelector('.re-g-nv').textContent = n;
        if (!svc) { steps.push(['✗', `Routing: "${path}" kisi public route se match nahi`]); res = '404 Not Found'; }
        else {
          steps.push(['✓', `Routing: ${path} → ${svc}`]);
          if (tok !== 'valid') { steps.push(['✗', `Auth: ${tok === 'missing' ? 'token hi nahi bheja' : 'token ki expiry nikal chuki'}`]); res = '401 Unauthorized'; }
          else {
            steps.push(['✓', 'Auth: token sahi, user = riya']);
            if (n > 100) { steps.push(['✗', `Rate limit: ${n} > 100 is minute`]); res = '429 Too Many Requests'; }
            else { steps.push(['✓', `Rate limit: ${n} / 100`], ['→', `${svc} ko bheja (request ID, user ID header ke saath)`]); res = '200 (service ka jawab)'; col = 'var(--green)'; }
          }
        }
        el.querySelector('.re-g-steps').innerHTML = steps.map(([m, t]) => `<div><span style="color:${m === '✗' ? 'var(--red)' : m === '✓' ? 'var(--green)' : 'var(--accent)'}">${m}</span> ${esc(t)}</div>`).join('');
        const r = el.querySelector('.re-g-res'); r.textContent = res; r.style.color = col;
      };
      const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      nE.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Dhyaan do: kisi bhi service tak <strong>sirf wahi requests pahunchti hain</strong> jo teeno checks paas kar gayin. Bekaar ya galat requests darwaze pe hi ruk gayin, services ko pata bhi nahi chala.` },
    { type: 'compare',
      left: { title: 'Load Balancer', html: `Ek jaise servers ki copies mein traffic baantna. "Feed service ke 10 servers mein se kaunsa?"<br><br>Request ke content ki zyada parwah nahi.` },
      right: { title: 'API Gateway', html: `Alag alag services ka ek front door: auth, rate limiting, routing, aggregation.<br><br>Aam taur pe <strong>dono hote hain</strong>: gateway ke aage LB (gateway ki copies ke liye), aur gateway ke peeche har service ka apna LB.` },
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `Gateway mein business logic mat bharo ("agar user premium hai to feed mein ye daalo"). Gateway har request ke raaste mein hai: wo mota hua to har team ko uspe depend hona padega, aur wo khud bottleneck aur SPOF ban jaata hai. Gateway patla rakho, aur uski bhi kai copies chalao.` },

    { type: 'h2', text: 'BFF: Backend for Frontend' },
    { type: 'p', html: `Naya problem: web site ko home page pe 50 videos ke saath poori details chahiye, mobile app ko chhoti screen aur slow network ki wajah se sirf 10 videos, chhote thumbnails. TV app ko kuch aur. Ek hi general API sabko khush karne ki koshish mein ya to bahut zyada data bhejti hai ya bahut kam.` },
    { type: 'callout', tone: 'term', title: 'Naya word: BFF (Backend for Frontend)', html: `<strong>Ye kya hai:</strong> har tarah ke client ka <strong>apna chhota backend</strong>: Mobile BFF, Web BFF. BFF neeche ki services ko call karke, data ko us client ke hisaab se jod-ghata ke deta hai.<br><strong>Kyun chahiye:</strong> mobile ko kam data aur kam round trips chahiye, web ko poori details. Ek general API dono ko khush nahi kar sakti.<br><strong>Iske bina:</strong> mobile pe bekaar ka bada data (slow, internet pack khatam), ya web pe har cheez ke liye alag alag calls.<br><strong>Example:</strong> Sam Newman ka rule: "one experience, one BFF", aur BFF wahi team banaye jo wo frontend banati hai. Ye pattern SoundCloud aur REA jaisi companies ke kaam se nikla.` },
    { type: 'list', items: [
      '<strong>Kab use karein</strong>: clients ki zaroorat sach mein alag hai (mobile vs web vs partners), aur alag teams unhe banati hain.',
      '<strong>Kab nahi</strong>: ek hi web app hai. Tab BFF bas ek extra hop aur extra service hai.',
      '<strong>Khatra</strong>: BFFs mein same logic copy hone lagta hai. Common logic neeche ki services mein rakho, BFF sirf "is screen ko kya chahiye" tak.',
    ]},
    { type: 'p', html: `Farak numbers mein dekho. Maan lo mobile network pe ek round trip 150 ms ka hai aur speed 1 MB/s. General API se home screen ke liye 3 calls lagti hain (feed, user, notifications) aur feed 50 videos ki poori details deta hai. BFF data center ke andar wahi 3 calls karta hai (har ek ~2 ms) aur sirf zaroorat ka data bhejta hai:` },
    { type: 'custom', render(el) {
      const C = { mobile: ['Mobile', 10, 1.5], web: ['Web', 50, 4], tv: ['TV', 24, 2.5] };
      let c = 'mobile';
      el.innerHTML = `<div class="re-b-c" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="re-b-tab table-wrap" style="margin-top:12px"></div>
        <div class="calc-note re-b-note"></div>`;
      const upd = () => {
        const box = el.querySelector('.re-b-c'); box.innerHTML = '';
        Object.entries(C).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === c ? ' on' : ''); b.textContent = v[0]; b.onclick = () => { c = k; upd(); }; box.appendChild(b); });
        const [name, n, kb] = C[c], RTT = 150, MBPS = 1;
        const genKB = 50 * 6 + 2 + 1, genMs = 3 * RTT + genKB / 1000 / MBPS * 1000;
        const bffKB = n * kb + 1, bffMs = RTT + 2 + bffKB / 1000 / MBPS * 1000;
        el.querySelector('.re-b-tab').innerHTML = `<table><thead><tr><th></th><th>General API</th><th>${name} BFF</th></tr></thead><tbody>
          <tr><td>Round trips (phone se)</td><td>3</td><td>1</td></tr>
          <tr><td>Videos</td><td>50 (poori details)</td><td>${n}</td></tr>
          <tr><td>Data</td><td>${genKB} KB</td><td>${bffKB.toFixed(0)} KB</td></tr>
          <tr><td>Home screen time (lagbhag)</td><td>${Math.round(genMs)} ms</td><td><strong>${Math.round(bffMs)} ms</strong></td></tr></tbody></table>`;
        el.querySelector('.re-b-note').textContent = `Time = round trips × 150 ms + data ÷ 1 MB/s (BFF ke andar ke 2 ms bhi joda). ${name} ke liye BFF ~${(genMs / bffMs).toFixed(1)} guna tez. Web pe farak kam hai, kyunki web ko waise bhi zyada data chahiye. Isliye BFF tab banao jab clients ki zaroorat sach mein alag ho.`;
      };
      upd();
    }},
    { type: 'p', html: `Agle diagram mein "Home BFF" wahi hai: mobile home screen ke liye Feed aur Recommendations ko call karke ek response banata hai.` },

    { type: 'h2', text: 'Service discovery: service ka address kya hai?' },
    { type: 'p', html: `Pehle servers fixed the, IP address config file mein likh dete the. Ab Feed service containers mein chalti hai: autoscaling ne raat ko 3 copies se 12 kar di, ek crash hui aur nayi IP pe wapas aayi. Home BFF ko kaise pata chale ki <em>abhi</em> Feed service ki zinda copies kahan hain?` },
    { type: 'callout', tone: 'term', title: 'Naya word: Service discovery aur service registry', html: `<strong>Ye kya hai:</strong> service discovery = "service X abhi kahan chal rahi hai?" ka jawab dhoondhna. Iske liye ek <strong>registry</strong>: phone book jaisa database, "feed-service → 10.0.3.7:8080, 10.0.3.9:8080, ...". Har <strong>instance</strong> (service ki ek chalti copy) start hote hi khud ko register karta hai aur heartbeat/health check se zinda hone ka saboot deta rehta hai. Band hua ya health check fail, to list se hat jaata hai.<br><strong>Kyun chahiye:</strong> containers aur autoscaling mein IP roz badalte hain. Config file mein likhe IP purane ho jaate hain.<br><strong>Iske bina:</strong> naye instances ko traffic nahi milta, mare hue instances ko milta rehta hai.<br><strong>Example:</strong> Consul, Netflix Eureka, etcd/ZooKeeper, aur Kubernetes ka built-in system.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'home', label: 'Home BFF', sub: 'needs feed-service', x: 100, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: mobile home screen ka backend (BFF). Client-side discovery mein ye khud registry se list leta hai, cache karta hai, aur khud ek instance chunta hai (round robin ya least requests).' },
        { id: 'reg', label: 'Registry', sub: 'Consul / Eureka', x: 360, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: service registry, har service ke zinda instances ki list. Instances register hote hain aur health checks pass karte rehte hain. Ye khud bhi 3+ nodes pe chalna chahiye, warna ye hi SPOF.' },
        { id: 'f1', label: 'Feed #1', sub: '10.0.3.7', x: 620, y: 70, w: 130, kind: 'server', info: 'Ye kya hai: Feed service ki ek copy (instance). Start hote hi ye apna IP aur port registry mein register karti hai aur heartbeat bhejti rehti hai. Heartbeat band hua to registry ise list se hata deti hai, aur callers ise request bhejna band kar dete hain.' },
        { id: 'f2', label: 'Feed #2', sub: '10.0.3.9', x: 620, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: Feed service ki doosri copy. Ye bhi registry mein registered hai aur heartbeat bhejti hai.' },
        { id: 'f3', label: 'Feed #3', sub: '10.0.4.2 (new)', x: 620, y: 280, w: 130, kind: 'server', hidden: true, info: 'Ye kya hai: teesri, nayi copy. Autoscaling ne nayi copy banayi. Start hote hi registry mein register hoti hai.' },
      ],
      edges: [
        { a: 'home', b: 'reg' }, { a: 'home', b: 'f1' }, { a: 'home', b: 'f2' }, { a: 'home', b: 'f3' },
        { a: 'reg', b: 'f1', dashed: true }, { a: 'reg', b: 'f2', dashed: true }, { a: 'reg', b: 'f3', dashed: true },
      ],
      scenarios: [
        { name: 'Lookup (happy path)', steps: [
          { title: 'Instances register karte hain', text: 'Start hote hi dono Feed copies registry ko batati hain: "main yahan hoon, mera health endpoint ye hai."', parallel: true, go: ['evt:f1>reg', 'evt:f2>reg'], msg: 'PUT /v1/agent/service/register  {name: "feed", addr: "10.0.3.7", port: 8080}' },
          { title: 'BFF list maangta hai', text: 'Home BFF poochhta hai "feed ke healthy instances?" List milti hai aur kuch seconds ke liye cache hoti hai.', go: ['home>reg', 'res:reg>home'], msg: 'GET /v1/health/service/feed?passing\n→ [10.0.3.7:8080, 10.0.3.9:8080]' },
          { title: 'BFF khud instance chunta hai', text: 'Client-side load balancing: BFF list mein se ek chunta hai aur seedha call karta hai. Beech mein koi extra hop nahi.', go: ['home>f2', 'res:f2>home'] },
        ]},
        { name: 'Instance mara', steps: [
          { title: 'Feed #1 crash', text: 'Ek copy gir gayi.', set: { f1: { state: 'down', sub: 'DOWN' } }, focus: ['f1'] },
          { title: 'Health check fail', text: 'Registry ke health checks fail. Kuch seconds mein Feed #1 list se hat jaata hai.', go: 'lost:reg>f1', after: { reg: { sub: 'feed: 1 healthy' } } },
          { title: 'Updated list', text: 'BFF ka cache refresh hota hai (ya registry watch se push karta hai). Ab sirf Feed #2.', go: ['home>reg', 'res:reg>home', 'home>f2', 'res:f2>home'], msg: '→ [10.0.3.9:8080]' },
          { title: 'Beech ka gap', text: 'Crash aur list update ke beech kuch requests mare hue instance pe ja sakti hain. Isliye discovery akela kaafi nahi: har call pe timeout aur ek safe retry bhi chahiye (aage dekhenge).', focus: ['home'] },
        ]},
        { name: 'Autoscale: nayi copy', steps: [
          { title: 'Traffic badha, nayi copy', text: 'Autoscaler ne Feed #3 chalaya. Nayi IP, kisi config file mein likhi nahi.', show: ['f3'], set: { f3: { state: 'ok' } }, focus: ['f3'] },
          { title: 'Register', text: 'Feed #3 khud register karta hai. Health check pass hone ke baad hi list mein aata hai, taaki aadha-start hua instance traffic na le.', go: 'evt:f3>reg', after: { reg: { sub: 'feed: 3 healthy' } } },
          { title: 'Traffic pahunchne laga', text: 'BFF ki agli list mein teeno. Kisi ne config badla nahi, deploy nahi kiya.', go: ['home>reg', 'res:reg>home', 'home>f3', 'res:f3>home'] },
        ]},
      ],
    },
    { type: 'compare',
      left: { title: 'Client-side discovery', html: `Caller khud registry se list leta hai aur khud instance chunta hai. (Netflix Eureka ke saath ye classic tareeka tha.)<br><br>+ Ek hop kam, smart load balancing<br>− Har language mein discovery library chahiye` },
      right: { title: 'Server-side discovery', html: `Caller ek fixed address (load balancer/router) ko call karta hai, aur wo registry dekh ke aage bhejta hai. (AWS load balancer, Kubernetes Service.)<br><br>+ Caller simple rehta hai<br>− Ek extra hop, aur router ko HA rakhna padta hai` },
    },
    { type: 'p', html: `<strong>DNS-based discovery</strong> teesra common tareeka hai: <code>feed.internal</code> resolve karo, healthy instances ke IP milte hain (Kubernetes DNS, Consul DNS). Sabse simple, har language mein chalta hai. Kamzori: DNS answers cache hote hain (TTL), to mare hue instance ka IP thodi der tak milta reh sakta hai, aur DNS se "kaunsa instance kam busy hai" jaisi smart choice nahi hoti.` },

    { type: 'h2', text: 'Asli khatra: ek slow service sab gira deti hai' },
    { type: 'p', html: `Ab sabse important kahani. Recommendations service ek din <strong>slow</strong> ho gayi (uska database atak gaya). Down nahi, bas har jawab 30 second mein. Recommendations home page ka chhota sa hissa hai. Kya hona chahiye? Home page bina recommendations ke chal jaana chahiye. Kya hota hai bina safeguards ke? Pehle do scenarios chalao:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Thread pool (aur connection pool)', html: `<strong>Ye kya hai:</strong> server ke "haath". Server ek saath limited requests sambhal sakta hai, jaise 200 <strong>threads</strong> (ya 200 connections). Har request ek thread pakadti hai jab tak uska kaam, aur uske andar ke network calls, khatam na hon.<br><strong>Kyun zaroori samajhna:</strong> agar call 30 second atki, to wo thread 30 second ke liye blocked. Saare 200 blocked = server nayi request le hi nahi sakta, chahe CPU khaali pada ho.<br><strong>Example:</strong> neeche ke diagram mein Home BFF ke paas 200 threads hain. Meter dikhata hai kitne busy.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Fallback aur cascading failure', html: `<strong>Fallback</strong> = plan B: asli jawab na mile to kya dikhayein (jaise purani cached list). <strong>Cascading failure</strong> = ek service ki problem domino ki tarah upar wali services ko bhi gira de.<br><strong>Kyun chahiye:</strong> fallback hi cascading failure ko rokne ka aakhri hissa hai.<br><strong>Iske bina:</strong> ek gair-zaroori feature ki wajah se poori site down.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'app', label: 'Mobile app', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: user ke phone pe xyz.com ka app. Home screen ke liye ek request bhejta hai.' },
        { id: 'gw', label: 'API Gateway', sub: 'auth, limits', x: 260, y: 170, w: 140, kind: 'edge', meter: true, load: 15, info: 'Ye kya hai: main gate. Token check, rate limit, aur /home ko Home BFF pe route. Iske bhi limited connections hain: peeche wala atka to ye bhi bhar sakta hai.' },
        { id: 'home', label: 'Home BFF', sub: '200 threads', x: 460, y: 170, w: 140, kind: 'server', meter: true, load: 10, info: 'Ye kya hai: mobile home screen ka backend. Feed aur Recommendations ko call karke home screen ka response banata hai. Meter = kitne threads busy hain. Timeouts, circuit breaker aur bulkhead isi ke andar lagte hain (library ya sidecar se).' },
        { id: 'feed', label: 'Feed service', x: 640, y: 60, w: 130, kind: 'server', info: 'Ye kya hai: videos ki list dene wali service. Home screen ka main (critical) hissa. Ye healthy hai poori kahani mein.' },
        { id: 'recs', label: 'Recommendations', x: 630, y: 280, w: 150, kind: 'server', info: 'Ye kya hai: "Aapke liye videos" banane wali service. Achha feature, lekin zaroori nahi. Isi ka database atakta hai.' },
        { id: 'fb', label: 'Fallback', sub: 'cached popular list', x: 450, y: 300, w: 150, kind: 'cache', info: 'Ye kya hai: plan B. Recommendations na milein to kya dikhayein? Ek cached "popular videos" list, ya woh section hi hide. Ise fallback kehte hain.' },
      ],
      edges: [{ a: 'app', b: 'gw' }, { a: 'gw', b: 'home' }, { a: 'home', b: 'feed' }, { a: 'home', b: 'recs' }, { a: 'home', b: 'fb' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Request gateway pe', text: 'App home screen maangta hai. Gateway token verify karta hai, rate limit check, phir route.', go: 'app>gw', msg: 'GET /home   Authorization: Bearer eyJ...' },
          { title: 'Gateway → Home BFF', text: 'Route match: <code>/home</code> → Home BFF.', go: 'gw>home' },
          { title: 'Parallel calls', text: 'BFF Feed aur Recommendations ko ek saath call karta hai. Dono ~50 ms mein jawab dete hain.', parallel: true, go: ['home>feed', 'home>recs'] },
          { title: 'Jawab', text: 'BFF dono ko jod ke ek response bhejta hai. Total ~80 ms. Threads turant free.', parallel: true, go: ['res:feed>home', 'res:recs>home'], after: { home: { load: 10 } } },
          { title: 'Response user tak', text: 'Ek round trip, poori home screen.', go: 'res:home>gw>app' },
        ]},
        { name: 'Slow dependency, bina timeout', intro: 'Recommendations har call pe 30 second le raha hai. BFF ke code mein koi timeout nahi.', steps: [
          { title: 'Recs slow ho gaya', text: 'Uska database atka. Ab har call 30 s.', set: { recs: { state: 'warn', sub: '30 s per call' } }, focus: ['recs'] },
          { title: 'Threads atakne lage', text: 'Har home request ka thread Recs ke jawab ka wait kar raha hai. 100 requests/second aa rahi hain, aur har ek 30 s atak rahi hai. Little\'s law: 100 × 30 = 3,000 threads chahiye, hain sirf 200.', flood: { paths: ['app>gw>home>recs'], n: 14 }, after: { home: { load: 100, state: 'hot', sub: '200/200 busy' } } },
          { title: 'Feed bhi nahi mil raha', text: 'Feed bilkul healthy hai, lekin BFF ke paas usse baat karne ke liye ek bhi free thread nahi. Nayi requests queue mein.', go: 'lost:gw>home', set: { feed: { state: 'dim', sub: 'healthy, but idle' } } },
          { title: 'Gateway bhi bhar gaya', text: 'Gateway ke connections BFF ke jawab ka wait kar rahe hain. Wo bhi full. Ab /profile jaise doosre routes bhi slow.', set: { gw: { load: 100, state: 'hot', sub: 'connections full' } }, go: 'bad:gw>app', msg: '504 Gateway Timeout' },
          { title: 'Cascading failure', text: 'Ek chhoti, gair-zaroori service ki slowness ne poori site gira di. Isko <strong>cascading failure</strong> kehte hain. Aur ironically, "down" service se zyada khatarnaak "slow" service hai: down wali turant error deti hai, slow wali resources pakad ke baithti hai.', focus: ['recs', 'home', 'gw'] },
        ]},
        { name: 'Timeout + circuit breaker + fallback', intro: 'Ab BFF har Recs call pe 300 ms ka timeout lagata hai, aur ek circuit breaker bhi hai: lagatar 5 failures pe "open".', steps: [
          { title: 'Recs slow, lekin timeout hai', text: 'Call 300 ms pe kaat di jaati hai. Thread sirf 300 ms ke liye busy, 30 s ke liye nahi.', set: { recs: { state: 'warn', sub: '30 s per call' } }, go: ['app>gw>home>recs', 'bad:recs>home'], after: { home: { load: 25, sub: 'breaker: 1/5 fail' } }, msg: 'GET recs/for-user/42  → timeout after 300 ms' },
          { title: 'Failures gine ja rahe', text: 'Lagatar timeouts. Breaker ginta hai: 2, 3, 4, 5.', flood: { paths: ['home>recs'], n: 5, kind: 'bad' }, after: { home: { sub: 'breaker: 5/5 fail' } } },
          { title: 'Breaker OPEN', text: 'Threshold poora. Circuit breaker <strong>open</strong> ho gaya: ab agle 10 second tak Recs ko call hi nahi karenge. Use bhi saans lene ka time mila.', set: { home: { state: 'warn', sub: 'breaker: OPEN' }, recs: { state: 'dim', sub: 'no traffic (rest)' } }, focus: ['home'] },
          { title: 'Fallback turant', text: 'Nayi home requests: Feed normal, aur Recs ki jagah cached "popular videos" list (ya section hide). Koi wait nahi.', go: ['app>gw>home', 'home>feed', 'res:feed>home', 'home>fb', 'res:fb>home', 'res:home>gw>app'], after: { home: { load: 12 } } },
          { title: 'Graceful degradation', text: 'User ko home page mila, bas recommendations generic hain. Site ka 95% kaam chal raha hai. Yahi goal hai: <strong>thoda kam feature, lekin site zinda</strong>.', focus: ['app'] },
        ]},
        { name: 'Recovery: half-open', intro: 'Recs ka database theek ho gaya. Breaker ko kaise pata chalega?', steps: [
          { title: 'Cool-down khatam', text: 'Breaker 10 second se open hai. Ab wo <strong>half-open</strong> mein jaata hai: "ek-do test requests jaane do".', set: { home: { state: 'warn', sub: 'breaker: HALF-OPEN' }, recs: { state: '', sub: 'recovered?' } }, focus: ['home'] },
          { title: 'Trial request', text: 'Sirf ek request Recs ko jaati hai. Baaki abhi bhi fallback pe.', go: ['home>recs', 'res:recs>home'], msg: 'GET recs/for-user/42  → 200 OK (45 ms)' },
          { title: 'Breaker CLOSED', text: 'Trial pass. Breaker band (closed), counter reset. Ab sab requests normal.', set: { home: { state: 'ok', sub: 'breaker: CLOSED' }, recs: { state: 'ok', sub: 'healthy' } } },
          { title: 'Normal traffic', text: 'Personal recommendations wapas. Kisi engineer ne kuch nahi kiya. (Agar trial fail hota, breaker phir se open ho jaata aur agla cool-down shuru.)', parallel: true, go: ['app>gw>home', 'home>feed', 'home>recs'] },
        ]},
        { name: 'Bulkhead', intro: 'Timeout se pehle ka ek aur bachav: Recs ke liye alag, chhota thread pool.', steps: [
          { title: 'Alag pools', text: 'BFF ke 200 threads ko baant diya: Recs calls ke liye max 20, Feed calls ke liye apna pool. Ek ka bhara pool doosre ko nahi chhoota.', set: { home: { sub: 'recs pool: 20 max' } }, focus: ['home'] },
          { title: 'Recs slow, sirf uska pool bhara', text: 'Recs atka. Uske 20 threads bhar gaye, aur extra Recs calls turant reject (fallback).', set: { recs: { state: 'warn', sub: '30 s per call' } }, flood: { paths: ['home>recs'], n: 6 }, after: { home: { load: 20, sub: 'recs pool: 20/20' } } },
          { title: 'Feed bilkul normal', text: 'Feed calls apne pool se chal rahi hain. Home screen ban rahi hai (bina personal recs ke).', go: ['app>gw>home>feed', 'res:feed>home>gw>app'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Timeouts: har network call ka pehla rule' },
    { type: 'p', html: `Kai HTTP libraries ka default timeout bahut lamba hota hai ya hota hi nahi (matlab hamesha wait). Isliye rule: <strong>har network call pe khud timeout lagao</strong>. Dekho timeout kitna farak daalta hai. Recs slow hai (30 s), BFF ke paas 200 threads hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Timeout', html: `<strong>Ye kya hai:</strong> "itni der mein jawab nahi aaya to intezaar chhod do aur aage badho". Jaise "2 minute tak phone nahi uthaya to kaat do".<br><strong>Kyun chahiye:</strong> intezaar karta hua thread kisi aur kaam nahi aata. Timeout use jaldi azaad karta hai.<br><strong>Iske bina:</strong> ek slow dependency sab threads pakad leti hai (upar wala cascading failure).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Little\'s law', html: `<strong>Ye kya hai:</strong> ek simple formula: ek saath kitni requests "andar" hongi = aane ki rate × har request kitni der rukti hai.<br><strong>Kyun chahiye:</strong> isi se pata chalta hai ki slowness kitni jaldi pool kha jaati hai.<br><strong>Example:</strong> 100 requests/s × 0.05 s = sirf 5 threads busy. 100 requests/s × 30 s = 3,000 threads busy, aur pool sirf 200 ka.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Home requests per second</label><input class="re-t-rps" type="number" value="100" min="1" step="10"></div>
          <div><label>BFF thread pool size</label><input class="re-t-pool" type="number" value="200" min="1" step="10"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><span style="font-size:14px;color:var(--ink-2)">Recs call ka timeout:</span><span class="re-t-to" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="height:16px;background:var(--surface-2);border-radius:8px;overflow:hidden;margin:14px 0 4px"><div class="re-t-bar" style="height:100%;transition:width .3s"></div></div>
        <div class="stats">
          <div class="stat"><span>Threads chahiye (Recs slow)</span><strong class="re-t-need"></strong></div>
          <div class="stat"><span>Pool</span><strong class="re-t-p"></strong></div>
          <div class="stat"><span>Haal</span><strong class="re-t-st"></strong></div>
        </div>
        <div class="calc-note re-t-note"></div>`;
      const opts = [['Koi nahi', Infinity], ['5 s', 5], ['2 s', 2], ['1 s', 1], ['300 ms', 0.3]];
      let to = 0;
      const SLOW = 30, NORMAL = 0.05;
      const rpsI = el.querySelector('.re-t-rps'), poolI = el.querySelector('.re-t-pool');
      const upd = () => {
        const box = el.querySelector('.re-t-to'); box.innerHTML = '';
        opts.forEach(([n], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === to ? ' on' : ''); b.textContent = n; b.onclick = () => { to = i; upd(); }; box.appendChild(b); });
        const rps = Math.max(1, Number(rpsI.value) || 1), pool = Math.max(1, Number(poolI.value) || 1);
        const hold = Math.min(SLOW, opts[to][1]);
        const need = rps * hold;
        const pct = need / pool;
        el.querySelector('.re-t-need').textContent = Math.round(need).toLocaleString('en-IN');
        el.querySelector('.re-t-p').textContent = pool.toLocaleString('en-IN');
        const st = el.querySelector('.re-t-st');
        st.textContent = pct >= 1 ? 'POOL FULL' : pct >= 0.7 ? 'khatre mein' : 'theek';
        st.style.color = pct >= 1 ? 'var(--red)' : pct >= 0.7 ? 'var(--amber)' : 'var(--green)';
        const bar = el.querySelector('.re-t-bar');
        bar.style.width = Math.min(100, pct * 100).toFixed(1) + '%';
        bar.style.background = pct >= 1 ? 'var(--red)' : pct >= 0.7 ? 'var(--amber)' : 'var(--green)';
        el.querySelector('.re-t-note').textContent = pct >= 1
          ? `Har request ${hold} s tak thread pakadti hai. Pool ~${(pool / rps).toFixed(1)} s mein bhar jaayega, phir Feed bhi nahi chalega. (Normal din: ${Math.round(rps * NORMAL)} threads.)`
          : `Slow Recs ke baawajood sirf ${Math.round(need)} threads busy. Baaki requests aur Feed calls ke liye jagah hai. Timeout jitna chhota, slowness ka asar utna kam, lekin itna chhota mat karo ki normal din ki slow requests (p99.9) bhi kat jaayein.`;
      };
      rpsI.addEventListener('input', upd); poolI.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Default numbers pe: bina timeout 3,000 threads chahiye (pool 2 s mein full), 5 s timeout pe 500 (phir bhi full), 2 s pe 200 (bilkul kinaare pe), 1 s pe 100, aur 300 ms pe 30. Timeout ki value matter karti hai.` },
    { type: 'list', items: [
      '<strong>Value kaise chunein</strong>: dependency ki normal latency dekho, jaise uska p99 ya p99.9 (p99.9 = wo time jisse 1,000 mein se 999 requests tez hoti hain), aur thoda margin. AWS Builders\' Library bhi yahi suggest karta hai. Recs normally 50 ms, p99.9 maan lo 250 ms, to 300 ms timeout.',
      '<strong>Connect timeout aur read timeout alag</strong>: connection banne ka (chhota, jaise 100 ms) aur jawab ka.',
      '<strong>Deadline propagation</strong>: user ke paas total 1 s hai, to neeche ki har call ko bacha hua time hi do. gRPC deadlines aage pass karta hai, taaki neeche wali service us kaam pe mehnat na kare jiska jawab ab koi sunega hi nahi.',
    ]},

    { type: 'h2', text: 'Retries, exponential backoff aur jitter' },
    { type: 'p', html: `Timeout ke baad kya? Kai failures thodi der ke hote hain (ek packet gira, ek instance restart ho raha tha). Ek aur try aksar kaam kar jaata hai. Lekin retry ek hathiyar hai jo ulta bhi pad sakta hai. Teen rules:` },
    { type: 'list', ordered: true, items: [
      '<strong>Sirf transient (thodi der wale) errors pe retry</strong>: timeout, connection reset, 503, 429 (Retry-After ke saath). 400/401/404 pe kabhi nahi: request hi galat hai.',
      '<strong>Operation idempotent hona chahiye</strong> (idempotent = do baar karo ya ek baar, nateeja same): GET safe hai. "Pay ₹500" jaisa POST tabhi retry karo jab idempotency key ho (Pagination aur idempotency lesson). Warna timeout ke baad retry = do baar payment.',
      '<strong>Ruk ke retry karo, aur sab alag alag time pe</strong>: yahi backoff aur jitter hai.',
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Exponential backoff', html: `<strong>Ye kya hai:</strong> har failure ke baad intezaar double: 0.5 s, 1 s, 2 s, 4 s... ek cap tak (jaise 16 s). Formula: <code>wait = min(cap, base × 2^attempt)</code>.<br><strong>Kyun chahiye:</strong> beemar service ko saans lene ka time. Jitni baar fail, utna zyada ruko.<br><strong>Iske bina:</strong> har 100 ms pe retry = beemar service pe hathoda.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Jitter', html: `<strong>Ye kya hai:</strong> intezaar mein thodi randomness. "Full jitter" mein <code>wait = random(0, min(cap, base × 2^attempt))</code>.<br><strong>Kyun chahiye:</strong> jo hazaaron clients ek saath fail hue, wo bina jitter ke ek saath hi retry karenge (bas der se). Jitter unhe time pe bikhra deta hai.<br><strong>Iske bina:</strong> retries ki lehrein (waves), har lehar capacity se badi.<br><strong>Example (base 0.5 s, cap 16 s):</strong> teesri baar fail hone ke baad backoff = 0.5 × 2² = 2 s; full jitter mein koi bhi random time 0 se 2 s ke beech, jaise 0.7 s ya 1.6 s. Ye formulas AWS ke Marc Brooker ki 2015 ki post se mashhoor hue.` },
    { type: 'p', html: `Kyun zaroori? Socho xyz.com ka Feed service 10 second ke liye down gaya. 1,000 app clients ki requests fail ho rahi hain aur sab retry kar rahe hain. Service wapas aati hai aur 200 requests/second sambhal sakti hai. Teeno strategies chala ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Strategy:</span><span class="re-r-m" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Clients:</span><span class="re-r-n" style="display:flex;flex-wrap:wrap;gap:6px"></span><span style="font-size:14px;color:var(--ink-2);margin-left:6px">Outage:</span><span class="re-r-o" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <svg class="re-r-svg" viewBox="0 0 640 230" style="width:100%;height:auto;margin-top:12px;display:block" role="img" aria-label="Requests per second over 60 seconds"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--ink-2)"><span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px"></span> serve hui</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--red);border-radius:2px"></span> fail / reject</span><span><span style="display:inline-block;width:14px;border-top:2px dashed var(--ink-2)"></span> capacity 200/s</span></div>
        <div class="stats">
          <div class="stat"><span>Total requests</span><strong class="re-r-tot"></strong></div>
          <div class="stat"><span>Peak req/s</span><strong class="re-r-pk"></strong></div>
          <div class="stat"><span>Sab clients served</span><strong class="re-r-fin"></strong></div>
          <div class="stat"><span>60 s pe bhi wait kar rahe</span><strong class="re-r-left"></strong></div>
        </div>
        <div class="calc-note re-r-note"></div>`;
      const MODES = { none: 'No backoff (har 100 ms)', exp: 'Exponential backoff', jitter: 'Exponential + full jitter' };
      let mode = 'none', N = 1000, OUT = 10;
      const CAP = 200, DUR = 60, TICK = 0.1, BASE = 0.5, MAXW = 16, REJ = 0.1;
      const sim = () => {
        let seed = 99;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const ticks = Math.round(DUR / TICK), perTick = CAP * TICK;
        const next = [], att = [], done = new Array(N).fill(false);
        for (let i = 0; i < N; i++) { next.push(Math.floor(rnd() * 10)); att.push(0); }
        const perSec = new Array(DUR).fill(0), okSec = new Array(DUR).fill(0);
        let total = 0, finish = null;
        for (let t = 0; t < ticks; t++) {
          const now = t * TICK, who = [];
          for (let i = 0; i < N; i++) if (!done[i] && next[i] === t) who.push(i);
          for (let i = who.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = who[i]; who[i] = who[j]; who[j] = x; }
          const n = who.length;
          let serve = 0;
          if (now >= OUT && n > 0) serve = Math.min(n, n <= perTick ? n : Math.max(0, Math.floor((perTick - REJ * n) / (1 - REJ))));
          who.forEach((i, idx) => {
            total++; perSec[Math.floor(now)]++;
            if (idx < serve) { done[i] = true; okSec[Math.floor(now)]++; return; }
            att[i]++;
            let w;
            if (mode === 'none') w = 0.1;
            else { const e = Math.min(MAXW, BASE * Math.pow(2, att[i] - 1)); w = mode === 'exp' ? e : rnd() * e; }
            next[i] = t + Math.max(1, Math.round(w / TICK));
          });
          if (finish === null && done.every(x => x)) finish = now + TICK;
        }
        return { total, finish, perSec, okSec, left: done.filter(x => !x).length };
      };
      const chips = (sel, map, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (String(get()) === k ? ' on' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); });
      };
      const run = () => {
        chips('.re-r-m', MODES, () => mode, k => mode = k);
        chips('.re-r-n', { 500: '500', 1000: '1,000', 3000: '3,000' }, () => N, k => N = Number(k));
        chips('.re-r-o', { 5: '5 s', 10: '10 s', 20: '20 s' }, () => OUT, k => OUT = Number(k));
        const r = sim();
        const peak = Math.max(...r.perSec);
        const ymax = Math.max(peak, CAP * 1.5);
        const X0 = 44, X1 = 632, Y0 = 10, Y1 = 196, bw = (X1 - X0) / DUR;
        const y = v => Y1 - (v / ymax) * (Y1 - Y0);
        let s = `<line x1="${X0}" y1="${Y1}" x2="${X1}" y2="${Y1}" stroke="var(--line-2)"/>`;
        s += `<rect x="${X0}" y="${Y0}" width="${OUT * bw}" height="${Y1 - Y0}" fill="var(--surface-2)"/>`;
        s += `<text x="${X0 + 4}" y="${Y0 + 14}" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">outage</text>`;
        r.perSec.forEach((v, i) => {
          const ok = r.okSec[i], badv = v - ok, x = X0 + i * bw + 1, w = Math.max(1, bw - 2);
          if (ok) s += `<rect x="${x}" y="${y(ok)}" width="${w}" height="${Y1 - y(ok)}" fill="var(--green)"/>`;
          if (badv) s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${y(ok) - y(v)}" fill="var(--red)" opacity="0.85"/>`;
        });
        s += `<line x1="${X0}" y1="${y(CAP)}" x2="${X1}" y2="${y(CAP)}" stroke="var(--ink-2)" stroke-dasharray="5 4"/>`;
        [0, ymax / 2, ymax].forEach(v => { s += `<text x="${X0 - 6}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="var(--ink-3)" font-family="var(--f-mono)">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</text>`; });
        [0, 10, 20, 30, 40, 50, 60].forEach(t => { s += `<text x="${X0 + t * bw}" y="${Y1 + 16}" font-size="11" text-anchor="middle" fill="var(--ink-3)" font-family="var(--f-mono)">${t}s</text>`; });
        el.querySelector('.re-r-svg').innerHTML = s;
        el.querySelector('.re-r-tot').textContent = r.total.toLocaleString('en-IN');
        el.querySelector('.re-r-pk').textContent = peak.toLocaleString('en-IN') + '/s';
        el.querySelector('.re-r-fin').textContent = r.finish === null ? '60 s mein nahi' : r.finish.toFixed(1) + ' s';
        el.querySelector('.re-r-left').textContent = r.left.toLocaleString('en-IN');
        const notes = {
          none: 'Retry storm. Clients capacity se kai guna zyada requests bhej rahe hain, server ka saara time reject karne mein ja raha hai, aur service wapas aake bhi kisi ko serve nahi kar paati. Outage khatam, lekin site phir bhi "down".',
          exp: 'Load kam hua, lekin sab clients ek hi rhythm pe retry karte hain: lehrein (waves) aati hain. Har lehar capacity se badi, to zyada tar fail, aur agli lehar aur door. Bahut log abhi bhi wait kar rahe hain.',
          jitter: 'Randomness ne retries ko time pe phaila diya. Recovery ke baad load capacity ke aas paas, lehrein nahi, aur sabka kaam sabse jaldi aur sabse kam requests mein.',
        };
        el.querySelector('.re-r-note').textContent = notes[mode] + ' (Model: server 200 req/s serve karta hai; har reject bhi thoda CPU khaata hai, serve ka 1/10. Seeded, har baar same result.)';
      };
      run();
    }},
    { type: 'p', html: `Default setting (1,000 clients, 10 s outage) pe: <strong>no backoff</strong> 10,000 req/s bhejta hai, aur server 60 s tak bhi ek bhi client ko serve nahi kar paata, kyunki saari capacity rejections mein ja rahi hai. <strong>Exponential</strong> ~7,700 requests bhejta hai lekin synchronised lehron ki wajah se 60 s pe bhi ~650 clients atke hain. <strong>Full jitter</strong> ~6,900 requests mein sabko ~26 s tak serve kar deta hai. 3,000 clients pe farak aur bada dikhta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `"Exponential backoff laga diya, kaam ho gaya." Bina jitter ke, jo clients ek saath fail hue the wo ek saath hi retry karenge, bas door door. Jitter wo hissa hai jo unhe alag karta hai. Aur outage ke baad sabse bura time wahi hota hai jab service wapas aati hai.` },

    { type: 'h3', text: 'Retry storms aur retry budgets' },
    { type: 'p', html: `Retries layers mein multiply hote hain. App → Gateway → BFF → Recs, aur har layer 3 retries karti hai (matlab 4 attempts). Sabse neeche Recs pe ek user request se 4 × 4 × 4 = <strong>64 attempts</strong> pahunch sakti hain, theek us waqt jab Recs pehle se beemar hai. Ise <strong>retry storm</strong> kehte hain.` },
    { type: 'list', items: [
      '<strong>Sirf ek layer retry kare</strong>: Google SRE book ki salaah, aam taur pe wo layer jo failing service ke theek upar hai. Baaki layers error aage pass karein.',
      '<strong>Per-request limit</strong>: SRE book ke example mein max 3 attempts; teen baar overloaded server mila to chauthi baar bhi shayad wahi milega.',
      '<strong>Retry budget</strong>: client track kare ki uski kitni % requests retries hain, aur ek ratio (SRE book mein 10%) se upar retry band. Isse bure din mein bhi load ~1.1x tak hi badhta hai, ~3x nahi. AWS SDKs bhi retries ko ek token bucket se limit karte hain.',
    ]},

    { type: 'h2', text: 'Circuit breaker' },
    { type: 'p', html: `Timeout har call ko chhota kar deta hai, lekin agar Recs poore 10 minute ke liye beemar hai, to har call phir bhi 300 ms waste kar rahi hai aur beemar service pe load daal rahi hai. Behtar: kuch failures ke baad <strong>call karna hi band</strong> kar do, kuch der ke liye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Circuit breaker', html: `<strong>Ye kya hai:</strong> ghar ke bijli wale MCB jaisa: zyada gadbad hui to switch khud gir jaata hai. Software mein ek wrapper jo dependency ki calls ko dekhta hai, aur bahut failures pe kuch der ke liye calls rok deta hai.<br><strong>Kyun chahiye:</strong> beemar service ko call karte rehna = har call pe timeout ka waste + uspe aur bojh.<br><strong>Iske bina:</strong> har request 300 ms (ya 1 s) timeout khaati rahegi, poore outage bhar.<br><strong>Teen states:</strong><br><strong>Closed</strong>: normal, calls jaati hain, failures gine jaate hain.<br><strong>Open</strong>: failures threshold ke paar. Calls bina bheje turant fail (fallback). Ek cool-down timer chalta hai.<br><strong>Half-open</strong>: cool-down ke baad kuch trial calls jaane do. Pass = closed. Fail = phir open.<br>Michael Nygard ki book <em>Release It!</em> se mashhoor hua, Martin Fowler ka article isse simple mein samjhata hai.` },
    { type: 'p', html: `Khud chalao. Har request = 1 second. Dependency ko healthy/failing karo, requests bhejo, ya scripted outage chalao (8 s healthy, 14 s failing, phir healthy):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Failure threshold: <strong class="re-c-thv"></strong> lagatar failures</label><input class="re-c-th" type="range" min="2" max="10" step="1" value="5"></div>
          <div><label>Open cool-down: <strong class="re-c-cdv"></strong></label><input class="re-c-cd" type="range" min="2" max="15" step="1" value="5"></div>
        </div>
        <div class="re-c-states" style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Recs service:</span><span class="re-c-dep" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary re-c-one">1 request bhejo</button>
          <button type="button" class="btn small ghost re-c-five">5 requests</button>
          <button type="button" class="btn small ghost re-c-script">Scripted outage</button>
          <button type="button" class="btn small ghost re-c-reset">Reset</button>
        </div>
        <div class="re-c-log" style="font:12.5px var(--f-mono);margin-top:12px;max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface-2);padding:8px"></div>
        <div class="stats">
          <div class="stat"><span>Calls to Recs</span><strong class="re-c-calls"></strong></div>
          <div class="stat"><span>Fast fail → fallback</span><strong class="re-c-fast"></strong></div>
          <div class="stat"><span>Timeouts mein waste</span><strong class="re-c-waste"></strong></div>
          <div class="stat"><span>Bina breaker waste hota</span><strong class="re-c-nob"></strong></div>
        </div>
        <div class="calc-note">Har failing call 1 s ke timeout pe kat-ti hai. Half-open mein 1 trial call jaati hai. Open mein call bheji hi nahi jaati: fallback turant (0 ms).</div>`;
      const th = el.querySelector('.re-c-th'), cd = el.querySelector('.re-c-cd');
      let S;
      const reset = () => { S = { t: 0, state: 'closed', fails: 0, openedAt: 0, healthy: true, calls: 0, fast: 0, waste: 0, nob: 0, log: [] }; draw(); };
      const send = () => {
        S.t++;
        const thr = Number(th.value), cool = Number(cd.value);
        let line;
        if (S.state === 'open' && S.t - S.openedAt >= cool) S.state = 'half';
        if (!S.healthy) S.nob++;
        if (S.state === 'open') { S.fast++; line = ['open', 'OPEN → call nahi bheji, fallback (0 ms)']; }
        else {
          S.calls++;
          const wasHalf = S.state === 'half';
          if (S.healthy) {
            S.fails = 0;
            if (wasHalf) { S.state = 'closed'; line = ['ok', 'HALF-OPEN trial → OK (45 ms) → CLOSED']; }
            else line = ['ok', 'CLOSED → OK (45 ms)'];
          } else {
            S.waste++;
            if (wasHalf) { S.state = 'open'; S.openedAt = S.t; line = ['bad', 'HALF-OPEN trial → TIMEOUT (1 s) → phir OPEN']; }
            else {
              S.fails++;
              if (S.fails >= thr) { S.state = 'open'; S.openedAt = S.t; line = ['bad', `CLOSED → TIMEOUT (1 s), ${S.fails}/${thr} → OPEN`]; S.fails = 0; }
              else line = ['bad', `CLOSED → TIMEOUT (1 s), ${S.fails}/${thr}`];
            }
          }
        }
        S.log.push([S.t, S.healthy, line]);
      };
      const draw = () => {
        el.querySelector('.re-c-thv').textContent = th.value;
        el.querySelector('.re-c-cdv').textContent = cd.value + ' s';
        const names = { closed: ['Closed', 'calls jaati hain'], open: ['Open', 'turant fallback'], half: ['Half-open', 'ek trial call'] };
        el.querySelector('.re-c-states').innerHTML = Object.entries(names).map(([k, [n, d]]) => {
          const on = S.state === k;
          const col = k === 'closed' ? 'var(--green)' : k === 'open' ? 'var(--red)' : 'var(--amber)';
          return `<div style="flex:1 1 90px;padding:10px;border-radius:var(--r);border:2px solid ${on ? col : 'var(--line)'};background:${on ? 'var(--surface)' : 'var(--surface-2)'};opacity:${on ? 1 : 0.6}"><strong style="font-family:var(--f-display);color:${on ? col : 'var(--ink-2)'}">${n}</strong><div style="font-size:12.5px;color:var(--ink-3)">${d}</div></div>`;
        }).join('');
        const dep = el.querySelector('.re-c-dep'); dep.innerHTML = '';
        [[true, 'Healthy'], [false, 'Failing (timeouts)']].forEach(([v, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.healthy === v ? ' on' : ''); b.textContent = n; b.onclick = () => { S.healthy = v; draw(); }; dep.appendChild(b); });
        el.querySelector('.re-c-log').innerHTML = S.log.length ? S.log.slice().reverse().map(([t, h, [k, txt]]) => `<div style="padding:2px 0;color:${k === 'ok' ? 'var(--green)' : k === 'bad' ? 'var(--red)' : 'var(--amber)'}">t=${String(t).padStart(2, ' ')}s  [Recs ${h ? 'healthy' : 'failing'}]  ${txt}</div>`).join('') : '<div style="color:var(--ink-3)">Abhi koi request nahi. "1 request bhejo" ya "Scripted outage" dabao.</div>';
        el.querySelector('.re-c-calls').textContent = String(S.calls);
        el.querySelector('.re-c-fast').textContent = String(S.fast);
        el.querySelector('.re-c-waste').textContent = S.waste + ' s';
        el.querySelector('.re-c-nob').textContent = S.nob + ' s';
      };
      el.querySelector('.re-c-one').onclick = () => { send(); draw(); };
      el.querySelector('.re-c-five').onclick = () => { for (let i = 0; i < 5; i++) send(); draw(); };
      el.querySelector('.re-c-script').onclick = () => {
        reset();
        for (let i = 1; i <= 30; i++) { S.healthy = !(i >= 9 && i <= 22); send(); }
        draw();
      };
      el.querySelector('.re-c-reset').onclick = reset;
      th.addEventListener('input', draw); cd.addEventListener('input', draw);
      reset();
    }},
    { type: 'p', html: `Default settings (threshold 5, cool-down 5 s) pe scripted outage: 14 failing seconds mein bina breaker 14 s timeouts mein waste hote. Breaker ke saath sirf 6 s: pehle 5 failures, phir ek failed trial (t=18). Beech ke 8 requests ko turant fallback mila, aur t=23 pe trial pass hote hi breaker closed. Threshold aur cool-down badal ke dekho: chhota threshold jaldi bachata hai lekin ek-do random errors pe bhi khul sakta hai.` },
    { type: 'list', items: [
      '<strong>Threshold</strong> real libraries mein aksar "lagatar N failures" ki jagah "last X calls ya last 10 s mein failure rate > 50%" hota hai, minimum calls ke saath (resilience4j jaisi libraries). Netflix ki Hystrix library ne ye pattern popular kiya; ab wo maintenance mode mein hai aur resilience4j jaise alternatives use hote hain.',
      '<strong>Breaker per dependency</strong> hota hai (ya per dependency + endpoint), poore app ka ek nahi.',
      '<strong>Breaker ki state monitor karo</strong>: breaker khulna ek alarm hai ki kuch gadbad hai.',
    ]},

    { type: 'h2', text: 'Bulkhead' },
    { type: 'callout', tone: 'term', title: 'Naya word: Bulkhead', html: `<strong>Ye kya hai:</strong> jahaz ke andar ki deewarein jo usse alag alag compartments mein baant-ti hain: ek hisse mein paani bhara to baaki jahaz nahi doobta. Software mein: <strong>har dependency ke liye alag, limited resources</strong> (thread pool, connection pool, ya semaphore).<br><strong>Kyun chahiye:</strong> timeout ke bawajood, bahut traffic pe slow dependency phir bhi kai threads pakad sakti hai. Bulkhead uski ek seema baandh deta hai.<br><strong>Iske bina:</strong> ek dependency ki problem saare shared pool ko bhar deti hai.<br><strong>Example:</strong> Recs ke liye max 20 concurrent calls, Payments ke liye apne 30. Ek dependency ki problem sirf apne compartment ko bharti hai.` },
    { type: 'p', html: `Khud dekho. BFF ke paas 200 threads, 100 home requests/second, har request Feed (50 ms) aur Recs dono ko call karti hai. Recs ki slowness badhao, aur bulkhead on/off karo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Recs ka jawab time: <strong class="re-k-sv"></strong></label><input class="re-k-s" type="range" min="0" max="6" step="1" value="5"></div>
          <div><label>Recs ka bulkhead (max threads): <strong class="re-k-cv"></strong></label><input class="re-k-c" type="range" min="0" max="60" step="5" value="20"></div>
        </div>
        <div class="re-k-bars" style="margin-top:12px;display:grid;gap:8px"></div>
        <div class="stats">
          <div class="stat"><span>Feed ke liye bache threads</span><strong class="re-k-free"></strong></div>
          <div class="stat"><span>Home page</span><strong class="re-k-st"></strong></div>
        </div>
        <div class="calc-note re-k-note"></div>`;
      const LAT = [0.05, 0.3, 1, 2, 5, 10, 30], POOL = 200, RPS = 100, FEED = 0.05;
      const sE = el.querySelector('.re-k-s'), cE = el.querySelector('.re-k-c');
      const bar = (label, used, max, col) => `<div><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2)"><span>${label}</span><span>${Math.round(used)} / ${max}</span></div><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100, used / max * 100).toFixed(1)}%;background:${col}"></div></div></div>`;
      const upd = () => {
        const lat = LAT[+sE.value], cap = +cE.value, wantRecs = RPS * lat, feedNeed = RPS * FEED;
        const recsUsed = cap > 0 ? Math.min(cap, wantRecs) : Math.min(POOL, wantRecs);
        const free = POOL - recsUsed, ok = free >= feedNeed;
        el.querySelector('.re-k-sv').textContent = lat < 1 ? Math.round(lat * 1000) + ' ms' : lat + ' s';
        el.querySelector('.re-k-cv').textContent = cap > 0 ? cap : 'off (shared pool)';
        el.querySelector('.re-k-bars').innerHTML = bar('Recs ne pakde threads', recsUsed, cap > 0 ? cap : POOL, wantRecs > (cap || POOL) ? 'var(--red)' : 'var(--amber)') + bar('Poora pool (200) mein se busy', recsUsed + Math.min(free, feedNeed), POOL, ok ? 'var(--green)' : 'var(--red)');
        el.querySelector('.re-k-free').textContent = Math.round(free) + ' (Feed ko chahiye ' + feedNeed + ')';
        const st = el.querySelector('.re-k-st');
        st.textContent = ok ? (wantRecs > recsUsed ? 'chal raha (recs = fallback)' : 'normal') : 'ATKA (pool full)';
        st.style.color = ok ? 'var(--green)' : 'var(--red)';
        el.querySelector('.re-k-note').textContent = `Recs ko chahiye: 100/s × ${lat} s = ${Math.round(wantRecs)} threads (Little's law). ${cap > 0 ? `Bulkhead ne ise ${cap} pe rok diya; baaki Recs calls turant fallback.` : 'Bulkhead nahi: Recs jitne chahe utne threads le sakta hai.'} Feed ko sirf ${feedNeed} threads chahiye, wo ${ok ? 'mil gaye' : 'nahi mile'}.`;
      };
      sE.addEventListener('input', upd); cE.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Diagram ka "Bulkhead" scenario yahi dikhata hai. Bulkhead bade level pe bhi hota hai: premium users ke liye alag servers, ya har bade customer ke liye alag "cell" (cell-based architecture), taaki ek ki problem sab tak na phaile. Keemat: resources baant diye to kabhi kabhi ek pool khaali pada hai aur doosra bhara, total utilization thoda kam.` },

    { type: 'h2', text: 'Sidecar aur service mesh' },
    { type: 'p', html: `Ab tak ke saare patterns (timeouts, retries, breaker, discovery, mTLS, metrics) har service ke code mein chahiye. xyz.com ki services Java, Go, Python, Node mein hain. Har language mein same logic, same bugs? Ek aur tareeka hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Sidecar', html: `<strong>Ye kya hai:</strong> har service instance ke bagal mein (Kubernetes mein usi pod mein) chalne wala ek chhota proxy, aam taur pe <strong>Envoy</strong>. Service ki saari aane-jaane wali network calls is proxy se guzarti hain. Jaise motorcycle ke saath judi sidecar: saath chalti hai, lekin alag hai.<br><strong>Kyun chahiye:</strong> retries, timeouts, circuit breaking, load balancing, mTLS encryption aur metrics proxy karta hai, app code ko pata bhi nahi. Har language mein ye logic dobara nahi likhna.<br><strong>Iske bina:</strong> Java, Go, Python, Node, har service mein apni library, apne bugs, alag alag settings.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Service mesh aur control plane', html: `<strong>Ye kya hai:</strong> service mesh = saare sidecars ka network + ek <strong>control plane</strong>, jo sabko ek jagah se config bhejta hai ("Recs ke liye timeout 300 ms, 2 retries").<br><strong>Kyun chahiye:</strong> platform team ek jagah policy badle, aur 200 services pe lagu.<br><strong>Iske bina:</strong> har team ko apni service mein setting badal ke deploy karna padta.<br><strong>Example:</strong> <strong>Istio</strong> (Envoy pe based), Linkerd. <strong>mTLS</strong> = dono taraf certificate wala encrypted connection, taaki services ek doosre ki pehchaan bhi check karein.` },
    { type: 'ascii', text: `
   ┌──────── Pod: Home BFF ────────┐        ┌──────── Pod: Recs ─────────┐
   │  app code  ──localhost──> Envoy ───mTLS───> Envoy ──> app code        │
   └───────────────────────────────┘        └────────────────────────────┘
                     ^  config (timeouts, retries, routes, certs)  ^
                     └──────────── Istio control plane ────────────┘`, caption: 'Sidecar proxies, control plane se configure' },
    { type: 'compare',
      left: { title: 'Kab faayda', html: `• Bahut saari services, kai languages<br>• Har jagah mTLS aur ek jaisi observability chahiye<br>• Platform team policies central rakhna chahti hai` },
      right: { title: 'Kab nahi / keemat', html: `• 5-10 services, ek language: ek achhi library kaafi<br>• Har call pe do extra proxy hops (latency, CPU, memory)<br>• Mesh khud seekhna aur chalana mushkil<br>• Istio ka newer "ambient" mode per-pod sidecar ke bina bhi chalta hai, isi cost ko kam karne ke liye` },
    },
    { type: 'p', html: `Mesh muft nahi hai. Har call do proxies se guzarti hai (bhejne wale ka aur lene wale ka). Call chain jitni lambi, utni zyada keemat. Proxy ka overhead apne setup mein naap ke daalo; neeche ka number sirf example hai. Aur dekho kya hota hai jab retries app mein bhi hain aur mesh mein bhi:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Call chain mein services: <strong class="re-m-dv"></strong></label><input class="re-m-d" type="range" min="1" max="6" step="1" value="3"></div>
          <div><label>Ek proxy hop ka overhead: <strong class="re-m-ov"></strong></label><input class="re-m-o" type="range" min="1" max="30" step="1" value="5"></div>
          <div><label>App code ke retries: <strong class="re-m-av"></strong></label><input class="re-m-a" type="range" min="0" max="3" step="1" value="2"></div>
          <div><label>Mesh ke retries: <strong class="re-m-mv"></strong></label><input class="re-m-m" type="range" min="0" max="3" step="1" value="2"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Proxy hops (ek request)</span><strong class="re-m-h"></strong></div>
          <div class="stat"><span>Extra latency</span><strong class="re-m-l"></strong></div>
          <div class="stat"><span>Ek failing call ke attempts</span><strong class="re-m-x"></strong></div>
        </div>
        <div class="calc-note re-m-note"></div>`;
      const q = c => el.querySelector(c);
      const upd = () => {
        const d = +q('.re-m-d').value, o = +q('.re-m-o').value / 10, a = +q('.re-m-a').value, m = +q('.re-m-m').value;
        const hops = 2 * d, att = (1 + a) * (1 + m);
        q('.re-m-dv').textContent = d; q('.re-m-ov').textContent = o.toFixed(1) + ' ms'; q('.re-m-av').textContent = a; q('.re-m-mv').textContent = m;
        q('.re-m-h').textContent = hops;
        q('.re-m-l').textContent = '+' + (hops * o).toFixed(1) + ' ms';
        const x = q('.re-m-x'); x.textContent = att; x.style.color = att > 3 ? 'var(--red)' : 'var(--ink)';
        q('.re-m-note').textContent = `${d} services ki chain = ${hops} proxy hops (har call pe 2). Retries: app ke ${a} aur mesh ke ${m} multiply hote hain: (1 + ${a}) × (1 + ${m}) = ${att} attempts ek hi failing call pe. ${att > 3 ? 'Retries ek hi jagah rakho (aam taur pe mesh mein ya app mein, dono mein nahi).' : 'Theek: retries sirf ek jagah se aa rahe hain.'}`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', html: `Mesh mein retries on kar diye <em>aur</em> app code mein bhi retries hain? Ab har layer retry kar rahi hai: wahi retry storm. Retries ek hi jagah configure karo, aur dhyaan rakho ki wo jagah idempotency samajhti ho.` },

    { type: 'h2', text: 'Graceful degradation aur fallbacks' },
    { type: 'p', html: `Breaker ne call rok di. Ab user ko kya dikhayein? Yahi <strong>fallback</strong> hai, aur poore system ka ye behaviour, ki kuch toote to site "thoda kam" chale par chale, <strong>graceful degradation</strong> hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Graceful degradation', html: `<strong>Ye kya hai:</strong> kuch toote to site "thoda kam" chale, lekin chale. Jaise bijli kam ho to sirf zaroori light jale, fan band.<br><strong>Kyun chahiye:</strong> 10 services mein se kabhi na kabhi koi na koi beemar rahegi. User ko har baar error page dikhana bura hai.<br><strong>Iske bina:</strong> comments service down = video page hi down.<br><strong>Example:</strong> neeche toggles se services girao aur dekho page kaise badalta hai.` },
    { type: 'custom', render(el) {
      const DEPS = [['video', 'Video player / CDN', true, 'Video nahi chal sakta: ye critical hai, iska fallback nahi'], ['recs', 'Recommendations', false, 'Generic "popular videos" (cached)'], ['comments', 'Comments', false, '"Comments abhi load nahi hue, baad mein try karein"'], ['likes', 'Like counter', false, 'Count chhupa diya, Like button chalta hai (queue mein)'], ['notif', 'Notifications', false, 'Ghanti pe count nahi; events queue mein, baad mein'], ['upload', 'Upload (DB primary)', false, 'Read-only mode: dekhna chalta hai, upload thodi der band']];
      const down = new Set();
      el.innerHTML = `<label>Kaunsi service giri hai? (click)</label><div class="re-d-t" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="re-d-page" style="margin-top:12px;border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface);display:grid;gap:6px"></div>
        <div class="stats"><div class="stat"><span>Site ka haal</span><strong class="re-d-st"></strong></div></div>`;
      const upd = () => {
        const t = el.querySelector('.re-d-t'); t.innerHTML = '';
        DEPS.forEach(([k, n, crit]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (down.has(k) ? ' on' : ''); b.textContent = (down.has(k) ? '✗ ' : '') + n + (crit ? ' (critical)' : ''); b.onclick = () => { if (down.has(k)) down.delete(k); else down.add(k); upd(); }; t.appendChild(b); });
        el.querySelector('.re-d-page').innerHTML = DEPS.map(([k, n, crit, fb]) => `<div style="padding:6px 8px;border-radius:var(--r-sm);background:${down.has(k) ? (crit ? 'color-mix(in srgb, var(--red) 14%, var(--surface))' : 'var(--surface-2)') : 'var(--surface-2)'};font-size:14px"><strong style="color:${down.has(k) ? (crit ? 'var(--red)' : 'var(--amber)') : 'var(--green)'}">${down.has(k) ? (crit ? '✗' : '~') : '✓'} ${n}</strong>${down.has(k) ? ' : ' + fb : ' : normal'}</div>`).join('');
        const st = el.querySelector('.re-d-st');
        const critDown = DEPS.some(([k, , c]) => c && down.has(k));
        st.textContent = critDown ? 'Asli outage (critical toota)' : down.size ? `Chal rahi, ${down.size} feature kam (degraded)` : 'Sab normal';
        st.style.color = critDown ? 'var(--red)' : down.size ? 'var(--amber)' : 'var(--green)';
      };
      upd();
    }},
    { type: 'table', head: ['Fallback', 'xyz.com pe example'], rows: [
      ['Cached / thoda purana data', 'Personal recs nahi mile, to kal ki cached list ya "popular videos"'],
      ['Default value', 'Like count nahi aaya, to count chhupa do, button chalne do'],
      ['Feature hide', 'Comments service down: video chalta hai, comments section "baad mein try karein"'],
      ['Read-only mode', 'Database primary down: browse aur watch chalta hai, upload kuch der band'],
      ['Queue for later', 'Notification service down: event queue mein daalo, baad mein bhejo'],
      ['Load shedding', 'Overload mein gair-zaroori requests (analytics, prefetch) ko 503 do taaki zaroori wali chalein'],
    ]},
    { type: 'callout', tone: 'tip', html: `Pehle se decide karo kaunsa feature <strong>critical</strong> hai (video play, login, payment) aur kaunsa <strong>nice-to-have</strong> (recommendations, comments count, "kaun dekh raha hai"). Nice-to-have dependencies pe hamesha timeout + breaker + fallback. Aur fallbacks ko test bhi karo: jo fallback kabhi chala hi nahi, wo outage ke din toota milega.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Har network call ko timeout milta hai.</strong> Har retry ko <strong>backoff + jitter</strong> chahiye, aur operation <strong>idempotent</strong> hona chahiye. Agar koi dependency lagatar fail ho rahi hai, to <strong>circuit breaker</strong> usse call karna band kare aur fallback de, jaise poora page fail karne ki jagah recommendations chhupa dena.` },
    { type: 'table', head: ['Situation', 'Pattern'], rows: [
      ['Bahar ke clients, kai services', 'API gateway (auth, rate limit, routing), uske aage LB'],
      ['Mobile aur web ki zaroorat bahut alag', 'BFF per client type'],
      ['Instances ke IP badalte rehte hain', 'Service discovery (registry ya DNS) + health checks'],
      ['Koi bhi remote call', 'Timeout (normal p99.9 + margin)'],
      ['Transient failure, idempotent call', 'Retry: max 2-3, exponential backoff + full jitter, ek hi layer pe, retry budget'],
      ['Dependency baar baar fail', 'Circuit breaker + fallback'],
      ['Ek dependency sab resources kha rahi', 'Bulkhead (alag pools)'],
      ['Bahut services, kai languages', 'Sidecar / service mesh'],
    ]},

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com ka resilience setup: poori picture', height: 440,
      groups: [
        { label: 'Clients', x: 10, y: 8, w: 700, h: 90 },
        { label: 'Edge', x: 10, y: 110, w: 700, h: 98 },
        { label: 'BFFs aur discovery', x: 10, y: 218, w: 700, h: 104 },
        { label: 'Services', x: 10, y: 326, w: 700, h: 106 },
      ],
      nodes: [
        { id: 'mob', label: 'Mobile app', x: 200, y: 52, kind: 'client', info: 'Ye kya hai: xyz.com ka phone app. Sirf ek address jaanta hai: api.xyz.com (gateway). Khud bhi retries ke liye backoff + jitter use karta hai.' },
        { id: 'web', label: 'Web app', x: 520, y: 52, kind: 'client', info: 'Ye kya hai: browser wali site. Isko zyada data chahiye, isliye iska apna Web BFF.' },
        { id: 'gw', label: 'API Gateway', sub: 'auth · rate limit', x: 360, y: 163, w: 160, kind: 'edge', info: 'Ye kya hai: main gate. Token check, rate limit (429), routing. Patla rakha hai, aur iski kai copies LB ke peeche.' },
        { id: 'mbff', label: 'Mobile BFF', sub: 'timeout · breaker', x: 150, y: 273, w: 150, kind: 'server', info: 'Ye kya hai: mobile home screen ka backend. Har call pe timeout, Recs pe circuit breaker + bulkhead (20 threads). Sidecar proxy (Envoy) ye settings mesh se le sakta hai.' },
        { id: 'reg', label: 'Registry', sub: 'Consul / K8s', x: 360, y: 273, w: 140, kind: 'data', info: 'Ye kya hai: service discovery ki phone book. Healthy instances ki list deta hai; mara hua instance health check se hat jaata hai.' },
        { id: 'wbff', label: 'Web BFF', sub: 'full details', x: 570, y: 273, w: 140, kind: 'server', info: 'Ye kya hai: web ka backend. Same services, lekin web ke hisaab se poora data.' },
        { id: 'feed', label: 'Feed service', sub: 'critical', x: 150, y: 383, w: 150, kind: 'server', info: 'Ye kya hai: videos ki list. Critical: iske bina home page nahi. Iske apne replicas aur alag thread pool.' },
        { id: 'recs', label: 'Recs service', sub: 'nice-to-have', x: 360, y: 383, w: 150, kind: 'server', info: 'Ye kya hai: personal recommendations. Nice-to-have: slow ho to timeout, baar baar fail ho to breaker open.' },
        { id: 'fb', label: 'Fallback', sub: 'cached popular', x: 570, y: 383, w: 150, kind: 'cache', info: 'Ye kya hai: plan B: cached "popular videos" list. Breaker open ho to turant yahi (graceful degradation).' },
      ],
      edges: [
        { a: 'mob', b: 'gw', n: 1, label: 'GET /home' },
        { a: 'web', b: 'gw' },
        { a: 'gw', b: 'mbff', n: 2, label: 'route' },
        { a: 'gw', b: 'wbff' },
        { a: 'mbff', b: 'reg', dashed: true, label: 'lookup' },
        { a: 'wbff', b: 'reg', dashed: true },
        { a: 'mbff', b: 'feed', n: 3 },
        { a: 'mbff', b: 'recs', label: 'timeout 300 ms' },
        { a: 'mbff', b: 'fb', kind: 'bad', dashed: true, label: 'fallback' },
        { a: 'wbff', b: 'feed' },
      ],
      paths: [
        { name: 'Normal home', text: 'Gateway ne token aur limit check kiye, Mobile BFF ko bheja. BFF ne Feed aur Recs ko parallel call kiya, dono timeout ke andar.', go: ['mob>gw>mbff>feed', 'mbff>recs'] },
        { name: 'Recs slow', text: 'Recs timeout pe kata, 5 failures pe breaker OPEN. Ab Recs ki jagah turant fallback; Feed normal. Site zinda, bas recommendations generic.', go: ['mob>gw>mbff>feed', 'mbff>fb'] },
        { name: 'Discovery', text: 'BFF registry se healthy instances ki list leta hai (cache karke), aur khud instance chunta hai.', go: ['mbff>reg', 'wbff>reg'] },
        { name: 'Web', text: 'Web app ka raasta: same gateway, apna Web BFF, same Feed service.', go: ['web>gw>wbff>feed'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Microservices = function calls ab network calls hain: slow, fail, ya jawab hi nahi. Slow service down se zyada khatarnaak (threads pakad leti hai).</li>
      <li>API gateway = ek main gate: auth, rate limit, routing. Patla rakho. BFF = har client type ka apna backend.</li>
      <li>Service discovery = registry/DNS se zinda instances ka address, health checks ke saath.</li>
      <li>Har network call pe timeout (p99.9 + margin). Little's law: threads = rate × wait.</li>
      <li>Retry sirf transient errors aur idempotent calls pe, exponential backoff + full jitter, ek hi layer pe, retry budget ke saath.</li>
      <li>Circuit breaker: closed → (failures) → open → (cool-down) → half-open → trial pass to closed, fail to open.</li>
      <li>Bulkhead = har dependency ke alag limited resources. Sidecar/mesh = ye sab app ke bahar, ek jagah se config, lekin har call pe proxy ki keemat.</li>
      <li>Graceful degradation: critical vs nice-to-have pehle tay karo; nice-to-have pe hamesha fallback, aur fallback ko test karo.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Ek slow service poori site nahi giraati', 'Transient errors users ko dikhte hi nahi (safe retries)', 'Outage ke baad service jaldi wapas (jitter, breaker se aaram)', 'Clients ke liye ek saaf entry point aur central auth/rate limit', 'Instances aate-jaate rahein, callers ko farak nahi'],
      costs: ['Har pattern ek aur config hai jo galat set ho sakti hai (timeout bahut chhota = khud ki outage)', 'Gateway, registry, mesh: sab naye components jo khud HA chahiye', 'Fallback ka matlab kabhi kabhi purana ya generic data', 'Sidecar se har call pe latency aur resource cost', 'Retries ke liye idempotency har jagah sochni padti hai'] },

    { type: 'think', questions: [
      { q: 'Payments service ko bank API call karti hai. Timeout hua. Kya retry karein?', a: 'Sirf idempotency key ke saath. Timeout ka matlab "pata nahi" hai: ho sakta hai bank ne paisa kaat liya ho. Same key ke saath retry ya status check karo. Aur payment jaise critical path pe fallback "fake success" kabhi nahi: user ko "processing" dikhao aur reconcile karo.' },
      { q: 'Recs ka circuit breaker har 2-3 minute mein khul-band ho raha hai (flapping), jabki Recs theek lagta hai. Kya check karoge?', a: 'Shayad threshold bahut sensitive hai (kam calls pe 2-3 random errors se khul jaata hai) ya timeout Recs ki normal p99.9 latency se chhota hai, to normal slow requests ko failure gina ja raha hai. Failure-rate threshold + minimum calls lagao, timeout latency data dekh ke set karo.' },
      { q: 'Gateway, BFF aur Recs teeno 3-3 retries karte hain. Recs 1 minute ke liye down hua aur uske baad bhi 5 minute tak recover nahi hua. Kyun?', a: 'Retry amplification: ek user request neeche tak 64 attempts ban sakti hai. Recovery ke waqt itna load ki Recs phir gir gaya. Fix: sirf ek layer retry kare, retry budget lagao, backoff + jitter, aur breaker se beemar service ko aaram do.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Slow dependency down dependency se zyada khatarnaak kyun ho sakti hai?', options: ['Slow service zyada data bhejti hai', 'Slow calls threads/connections pakad ke baithti hain aur caller ka pool bhar dete hain', 'Down service automatic restart ho jaati hai'], answer: 1, explain: 'Down service turant error deti hai. Slow wali bina timeout ke resources hold karti hai, aur cascading failure shuru hota hai.' },
      { q: 'Full jitter mein wait kaise nikalta hai?', options: ['base × 2^attempt', 'random(0, min(cap, base × 2^attempt))', 'Hamesha 1 second'], answer: 1, explain: 'Exponential range ke andar random wait, taaki saare clients ek saath retry na karein.' },
      { q: 'Circuit breaker half-open state mein kya karta hai?', options: ['Saari calls block', 'Kuch trial calls bhejta hai; pass to closed, fail to phir open', 'Dependency restart karta hai'], answer: 1, explain: 'Half-open recovery check hai. Cool-down ke baad thoda traffic test karta hai.' },
      { q: 'Kis request ko bina idempotency key ke retry karna sabse khatarnaak hai?', options: ['GET /videos/42', 'POST /payments (₹500)', 'GET /health'], answer: 1, explain: 'Timeout ka matlab "pata nahi" hai. Bina key ke retry do baar charge kar sakta hai.' },
      { q: 'Bulkhead ka kaam?', options: ['Retries limit karna', 'Har dependency ko alag limited resources dena taaki ek ki problem sab na kha jaaye', 'Requests encrypt karna'], answer: 1, explain: 'Jahaz ke compartments jaisa: ek mein paani, baaki safe.' },
      { q: 'API gateway ne request ko 401 lautaya. Iska matlab?', options: ['Service down hai', 'Token missing ya expired: user verify nahi hua', 'Rate limit cross hui'], answer: 1, explain: '401 = authentication fail. 429 = rate limit, 404 = koi route match nahi. Gateway ne service tak request jaane hi nahi di.' },
      { q: 'BFF kab banana chahiye?', options: ['Hamesha, har app ke liye', 'Jab alag clients (mobile, web, TV) ki zaroorat sach mein alag ho', 'Sirf jab ek hi web app ho'], answer: 1, explain: 'Ek hi web app ho to BFF bas extra hop hai. Mobile ke liye widget mein BFF ~4.5 guna tez tha, web pe sirf ~2 guna.' },
      { q: 'App code 2 retries karta hai aur mesh bhi 2 retries. Ek failing call pe kitne attempts?', options: ['4', '5', '9'], answer: 2, explain: '(1 + 2) × (1 + 2) = 9. Retries ek hi jagah rakho.' },
    ]},
    { type: 'sources', note: 'Formulas, numbers aur pattern definitions inhi sources se check kiye gaye. Widgets apne simple, seeded models hain.', items: [
      { title: 'Exponential Backoff And Jitter', publisher: 'AWS Architecture Blog (Marc Brooker)', year: 2015, official: true, url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/', used: 'Backoff formula, Full Jitter formula, finding that jittered backoff greatly reduces total calls versus plain exponential.' },
      { title: 'Timeouts, retries, and backoff with jitter', publisher: 'Amazon Builders\' Library', official: true, url: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/', used: 'Choosing timeouts from downstream latency percentiles, retrying at a single layer, limiting retries with a token bucket, idempotency for safe retries.' },
      { title: 'CircuitBreaker', publisher: 'Martin Fowler (martinfowler.com)', year: 2014, url: 'https://martinfowler.com/bliki/CircuitBreaker.html', used: 'Closed/open/half-open behaviour, trial call after a timeout, monitoring breaker state, origin in Nygard\'s Release It!.' },
      { title: 'Handling Overload (Site Reliability Engineering book)', publisher: 'Google', official: true, url: 'https://sre.google/sre-book/handling-overload/', used: 'Per-request retry limit of 3 attempts, per-client retry budget of 10%, retrying only at the layer above the failing service, ~3x vs ~1.1x growth.' },
      { title: 'Backends For Frontends', publisher: 'Sam Newman', url: 'https://samnewman.io/patterns/architectural/bff/', used: 'One experience one BFF, owned by the UI team, aggregation, duplication risk, SoundCloud/REA origins.' },
      { title: 'Hystrix (README: status)', publisher: 'Netflix (GitHub)', official: true, url: 'https://github.com/Netflix/Hystrix', used: 'Hystrix maintenance mode mein hai; naye projects ke liye resilience4j jaise alternatives.' },
      { title: 'CircuitBreaker (resilience4j docs)', publisher: 'resilience4j', official: true, url: 'https://resilience4j.readme.io/docs/circuitbreaker', used: 'Count/time based sliding window, failure rate threshold, minimum number of calls, half-open permitted calls.' },
      { title: 'Ambient mode overview', publisher: 'Istio documentation', official: true, url: 'https://istio.io/latest/docs/ambient/overview/', used: 'Sidecar ke bina data plane (ztunnel + waypoint), sidecar ki cost kam karne ke liye.' },
    ]},
  ],
});
