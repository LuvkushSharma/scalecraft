Lesson.register({
  id: 'load-balancer',
  title: 'Load Balancer',
  minutes: 24,
  summary: `Load Balancer ka sirf ek sawaal hai: "ye request kaunse server ko doon?" Ye traffic ko kai servers mein baantta hai, bimaar server ko chupchaap line se hata deta hai, aur deploy ke time bhi website chalu rakhta hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ab itna popular hai ki ek computer (server) akele saare users ko jawab nahi de pata. Humne 3 server laga diye.<br>Ab naya sawaal: user kaunse server pe jaaye? Aur agar ek server bimaar pad gaya to?<br>Iska jawab ek "traffic police" jaisa component hai jo har request ko ek theek-thaak, khaali server ki taraf bhejta hai. Isi ko <strong>Load Balancer</strong> kehte hain.` },

    { type: 'h2', text: 'Problem: ek server se kaam nahi chalega' },
    { type: 'p', html: `Shuru mein xyz.com ek hi server pe chalta tha. Do problems aayin:` },
    { type: 'list', items: [
      `<strong>Overload:</strong> raat 9 baje ek viral post aayi. Ek server ek second mein maan lo 500 requests sambhal sakta hai, aur aa rahi hain 2,000. Requests line mein lag gayin, page 5 second mein khulne laga.`,
      `<strong>Crash:</strong> server ki memory khatam hui aur process mar gaya. Ab poori website band. Ek hi server tha, to wo <strong>SPOF</strong> (single point of failure) tha: wo gira to sab gira.`,
    ]},
    { type: 'p', html: `Scalability lesson mein humne iska ilaaj dekha: aur servers lagao (horizontal scaling) aur unhe <strong>stateless</strong> rakho, yaani kisi server ki memory mein user ki koi zaroori cheez na rahe. Lekin DNS ke paas xyz.com ka ek hi address hai. To user ki request teen mein se kis server pe jaaye? Aur bimaar server ko request kaun na bheje?` },
    { type: 'callout', tone: 'term', title: 'Load Balancer (LB)', html: `<strong>Ye kya hai:</strong> ek program (ya machine) jo servers ke aage khada hota hai. Users ki saari requests pehle isi ke paas aati hain, aur ye har request ko kisi ek healthy server ko de deta hai.<br><strong>Kyun chahiye:</strong> taaki kaam saare servers mein barabar bate, aur bimaar server ko request na jaaye.<br><strong>Iske bina:</strong> ya to ek server pe saara bojh (baaki khaali baithe), ya ek server gira to uske users ko error.<br><strong>Example:</strong> xyz.com pe 2,000 requests/second aur 4 servers, har ek 500 sambhal sakta hai. LB har server ko ~500 deta hai, sab khush.` },
    { type: 'compare',
      left: { title: 'Bina Load Balancer', ascii: `
 Users ──> Server 1  (overloaded)
           Server 2  (khaali)
           Server 3  (khaali)` },
      right: { title: 'Load Balancer ke saath', ascii: `
            ┌──> Server 1
 Users ─> LB ──> Server 2
            └──> Server 3` },
    },

    { type: 'h2', text: 'LB kahan baithta hai?' },
    { type: 'p', html: `Request ka raasta ab aisa hai: user <strong>DNS</strong> se poochta hai "xyz.com kahan hai?". DNS ab kisi server ka address nahi, <strong>LB ka address</strong> deta hai. User LB se baat karta hai. LB peeche kisi server ko request deta hai, server database se data laata hai, aur jawab usi raaste wapas jaata hai.` },
    { type: 'p', html: `User ko kabhi pata nahi chalta ki peeche 3 server hain ya 300. Use bas ek address dikhta hai. Is tarah server ke aage khade hoke requests lene wale component ko <strong>reverse proxy</strong> bhi kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Reverse proxy', html: `<strong>Ye kya hai:</strong> ek beech wala program jo <em>servers ki taraf se</em> requests leta hai. User sochta hai wo website se baat kar raha hai, asal mein wo proxy se baat kar raha hai, aur proxy andar servers se.<br><strong>Kyun chahiye:</strong> servers ko chhupa ke rakhna, ek jagah se traffic control karna.<br><strong>Iske bina:</strong> har server ka address public karna padta, aur server badalna mushkil hota.<br>Har LB ek tarah ka reverse proxy hai. NGINX aur HAProxy jaise tools dono kaam karte hain.` },
    { type: 'image', src: 'assets/img/load-balancer/wmf-servers.jpg', alt: 'Data center mein racks ki lambi line, har rack mein upar se neeche tak dozens of servers lage hue', caption: 'Asli servers aise dikhte hain: racks mein upar neeche lage hue. Ye Wikipedia (Wikimedia Foundation) ke servers hain. Itni saari machines ke aage bhi load balancers lage hote hain, taaki har request kisi ek healthy machine tak pahunche.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_35.jpg', license: 'CC BY-SA 3.0' } },

    { type: 'h2', text: 'Khud chala ke dekho' },
    { type: 'p', html: `Har scenario LB ka ek alag kaam dikhata hai. Server boxes ke meters dikhate hain ki server kitna busy hai. Kisi bhi box pe click karo, wo kya hai ye pata chalega.` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'u', label: 'Users', sub: 'xyz.com', x: 80, y: 180, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com kholne wale log (browser ya app). Inhe sirf ek address pata hai: xyz.com. DNS us naam ka address batata hai, jo asal mein LB ka IP hai. Peeche kitne servers hain, users ko nahi pata.' },
        { id: 'lb', label: 'Load Balancer', sub: 'round robin', x: 270, y: 180, w: 150, kind: 'edge', info: 'Ye kya hai: traffic baantne wala. Har request ke liye ek healthy server chunta hai, aur har kuch second mein servers ki health check karta hai. Popular LBs: NGINX, HAProxy, Envoy, AWS ALB/NLB.' },
        { id: 's1', label: 'Server 1', x: 480, y: 70, w: 130, kind: 'server', meter: true, load: 15, info: 'Ye kya hai: application server, jo xyz.com ka code chalata hai. Stateless hai (user ki koi zaroori cheez apni memory mein nahi rakhta), isliye koi bhi request handle kar sakta hai.' },
        { id: 's2', label: 'Server 2', x: 480, y: 180, w: 130, kind: 'server', meter: true, load: 15, info: 'Ye kya hai: Server 1 jaisa hi doosra server, same code. Do servers hone se ek gire to doosra kaam sambhal leta hai.' },
        { id: 's3', label: 'Server 3', x: 480, y: 290, w: 130, kind: 'server', meter: true, hidden: true, info: 'Ye kya hai: naya server jo bheed badhne pe start hua. LB ko bataya, health check pass hua, aur ye turant traffic lene laga.' },
        { id: 'db', label: 'Database', x: 660, y: 180, w: 110, kind: 'data', info: 'Ye kya hai: jahan xyz.com ka saara data (users, posts) pakka save hota hai. Saare servers isi ek database se baat karte hain, isliye servers stateless reh sakte hain.' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' }, { a: 'lb', b: 's3' },
        { a: 's1', b: 'db' }, { a: 's2', b: 'db' }, { a: 's3', b: 'db' },
      ],
      scenarios: [
        { name: 'Ek request', steps: [
          { title: 'User request bhejta hai', text: 'DNS ne xyz.com ka address diya, jo asal mein LB ka address hai.', go: 'u>lb', msg: 'GET /profile/42  →  LB (203.0.113.10)' },
          { title: 'LB server chunta hai', text: 'LB: "Server 1 healthy hai aur uski baari hai." Request aage forward.', go: 'lb>s1' },
          { title: 'Server kaam karta hai', text: 'Server 1 database se data laata hai.', go: ['s1>db', 'res:db>s1'] },
          { title: 'Response wapas', text: 'Response usi raaste LB se hote hue user tak. User ko kabhi pata nahi chalta ki Server 1 ne jawab diya.', go: 'res:s1>lb>u' },
        ]},
        { name: 'Round robin', intro: 'Round robin sabse simple tareeka hai: baari baari. 1, 2, 1, 2... (Agle lesson mein aur tareeke.)', steps: [
          { title: 'Request 1 → Server 1', go: 'u>lb>s1', text: 'Pehli request Server 1 ko.', after: { s1: { load: 30 } } },
          { title: 'Request 2 → Server 2', go: 'u>lb>s2', text: 'Agli Server 2 ko.', after: { s2: { load: 30 } } },
          { title: 'Request 3 → Server 1', go: 'u>lb>s1', text: 'Phir wapas Server 1. Load barabar bant raha hai.', after: { s1: { load: 45 } } },
          { title: 'Request 4 → Server 2', go: 'u>lb>s2', text: 'Simple aur fair, jab saari requests lagbhag same size ki hon.', after: { s2: { load: 45 } } },
        ]},
        { name: 'Server 2 down', intro: 'LB har kuch second mein har server se poochta hai: "zinda ho?" Isko health check kehte hain (neeche detail mein).', steps: [
          { title: 'Health check: sab theek', text: 'LB har 5 second mein /health address call karta hai. Dono "200 OK" bolte hain.', parallel: true, go: ['lb>s1', 'lb>s2'], after: { s1: { state: 'ok' }, s2: { state: 'ok' } }, msg: 'GET /health → 200 OK' },
          { title: 'Server 2 crash', text: 'Server 2 ki memory khatam, process mar gaya.', set: { s2: { state: 'down', sub: 'DOWN', load: 0 } }, focus: ['s2'] },
          { title: 'Health check fail', text: 'Server 2 ne jawab nahi diya. Lagatar 3 baar fail hone pe LB use "unhealthy" mark kar deta hai aur rotation se hata deta hai.', go: 'lost:lb>s2', msg: 'GET /health → timeout (3 baar)  →  Server 2 removed' },
          { title: 'Saara traffic Server 1 pe', text: 'User ko kuch pata nahi chala. Website chalu. Jab Server 2 theek hoke health check pass karega, LB use wapas le lega.', flood: { paths: ['u>lb>s1'], n: 6 }, after: { s1: { load: 70 } } },
        ]},
        { name: 'Traffic spike', intro: 'Raat 9 baje xyz.com pe ek viral post aayi.', steps: [
          { title: 'Traffic 10 guna', text: 'Dono servers laal. Response time 50 ms se 3 second.', flood: { paths: ['u>lb>s1', 'u>lb>s2'], n: 16 }, after: { s1: { load: 95, state: 'hot' }, s2: { load: 95, state: 'hot' } } },
          { title: 'Server 3 add', text: 'Naya server start hua (cloud mein ye apne aap ho sakta hai, isko <strong>autoscaling</strong> kehte hain). Health check pass karte hi LB use traffic dene lagta hai.', show: ['s3'], set: { s1: { load: 64, state: '' }, s2: { load: 64, state: '' }, s3: { load: 64 } }, flood: { paths: ['u>lb>s1', 'u>lb>s2', 'u>lb>s3'], n: 15 } },
          { title: 'Dhyaan do: database pe kya hua?', text: 'Servers 3 ho gaye, lekin database abhi bhi ek hai aur ab use 3 servers se requests aa rahi hain. LB servers ki problem solve karta hai, database ki nahi. Agla bottleneck wahi hoga, aur wahan Cache aayega.', go: ['s1>db', 's2>db', 's3>db'], parallel: true, set: { db: { state: 'warn', sub: 'pressure ↑' } } },
        ]},
        { name: 'LB khud gira?', steps: [
          { title: 'LB crash', text: 'Saari traffic isi se guzarti thi.', set: { lb: { state: 'down', sub: 'DOWN' } }, go: 'lost:u>lb' },
          { title: 'Servers healthy, site down', text: 'Akela LB khud ek SPOF hai. Iska ilaaj neeche "LB khud SPOF na bane" section mein hai: LB ki do copies aur ek floating IP.', set: { s1: { state: 'ok', sub: 'healthy, khaali' }, s2: { state: 'ok', sub: 'healthy, khaali' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Health checks: LB ko kaise pata chalta hai ki server bimaar hai?' },
    { type: 'callout', tone: 'term', title: 'Health check', html: `<strong>Ye kya hai:</strong> LB ka har server se baar baar poochna: "tum theek ho?" Aksar ye ek chhota sa address hota hai, jaise <code>GET /health</code>, jo theek hone pe <code>200 OK</code> lauta deta hai.<br><strong>Kyun chahiye:</strong> taaki LB mare hue ya atke hue server ko requests bhejna band kare.<br><strong>Iske bina:</strong> LB aankh band karke baari baari bhejta rahega. 3 mein se 1 server mara hai to har 3 mein se 1 user ko error milega.` },
    { type: 'p', html: `Health check do tarah ke hote hain:` },
    { type: 'compare',
      left: { title: 'Active health check', html: `LB <strong>khud</strong> har few second mein har server ko ek test request bhejta hai.<br><br>• Server pe koi user traffic na ho tab bhi pata chal jaata hai<br>• Thoda extra traffic (har server pe har interval ek request)<br>• Example: HAProxy <code>check</code>, AWS ALB health checks, NGINX Plus <code>health_check</code>` },
      right: { title: 'Passive health check', html: `LB <strong>asli user requests</strong> ko dekhta hai. Request fail hui (connection refused, timeout, 5xx) to us server ke against ek "fail" gin leta hai.<br><br>• Koi extra traffic nahi<br>• Pata tab chalta hai jab kisi asli request ko takleef ho chuki<br>• Example: open-source NGINX (<code>max_fails</code>, <code>fail_timeout</code>), Envoy "outlier detection"` },
    },
    { type: 'p', html: `Achha setup dono use karta hai: active check se mara hua server pakdo, passive check se wo server pakdo jo "zinda" to hai lekin har doosri request pe error de raha hai.` },
    { type: 'h3', text: 'Thresholds: kitni baar fail ho tab hataayein?' },
    { type: 'p', html: `Ek baar jawab na aaye to server ko turant hata dena galat hoga. Network ka ek chhota jhatka bhi ho sakta hai. Isliye chaar settings hoti hain:` },
    { type: 'table', head: ['Setting', 'Matlab', 'Example values'], rows: [
      ['Interval', 'Kitne second baad agla check', 'HAProxy: 2 s (default). AWS ALB: 30 s (default)'],
      ['Timeout', 'Kitni der jawab ka wait, phir "fail" maano', 'AWS ALB: 5 s (default)'],
      ['Unhealthy threshold (fall)', 'Lagatar kitne fail ke baad server hatao', 'HAProxy: 3. AWS ALB: 2'],
      ['Healthy threshold (rise)', 'Wapas aane ke liye lagatar kitne pass', 'HAProxy: 2. AWS ALB: 5'],
    ], caption: 'Open-source NGINX mein passive check hota hai: default max_fails=1 aur fail_timeout=10s, yaani ek fail hone pe server 10 second ke liye side mein.' },
    { type: 'p', html: `Neeche khelo. xyz.com pe 300 requests/second aa rahi hain, 3 servers pe barabar bati hui (100 har ek pe). Server 2 time 10 s pe crash hota hai aur 60 s pe wapas theek hota hai. Dekho settings badalne se kitne users ko error milta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
        <label>Interval: <strong class="v-i"></strong> s<input type="range" class="r-i" min="1" max="30" value="5"></label>
        <label>Timeout: <strong class="v-t"></strong> s<input type="range" class="r-t" min="1" max="10" value="2"></label>
        <label>Unhealthy threshold (fall): <strong class="v-f"></strong><input type="range" class="r-f" min="1" max="5" value="3"></label>
        <label>Healthy threshold (rise): <strong class="v-r"></strong><input type="range" class="r-r" min="1" max="5" value="2"></label>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" class="c-p"> Passive check + retry bhi on (fail hui request doosre server pe dobara bhejo)</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0"><button type="button" class="btn small ghost p-h">HAProxy jaisa (2s, fall 3, rise 2)</button><button type="button" class="btn small ghost p-a">AWS ALB default (30s, 5s, 2, 5)</button></div>
        <svg class="tl" viewBox="0 0 640 96" style="width:100%;height:auto;display:block;margin:10px 0"></svg>
        <div class="stats"><div class="stat"><span>Pata chalne mein</span><strong class="o-d"></strong></div><div class="stat"><span>Users ko error</span><strong class="o-e"></strong></div><div class="stat"><span>Wapas aane mein</span><strong class="o-r"></strong></div><div class="stat"><span>Health check traffic</span><strong class="o-c"></strong></div></div>
        <div class="calc-note o-n"></div>`;
      const q = s => el.querySelector(s);
      const CRASH = 10, BACK = 60, END = 120, RPS = 100;
      const run = () => {
        const I = +q('.r-i').value, T = +q('.r-t').value, F = +q('.r-f').value, R = +q('.r-r').value, pas = q('.c-p').checked;
        q('.v-i').textContent = I; q('.v-t').textContent = T; q('.v-f').textContent = F; q('.v-r').textContent = R;
        const c1 = Math.ceil(CRASH / I) * I;
        const detect = c1 + (F - 1) * I + T;
        const blind = detect - CRASH;
        const b1 = Math.ceil(BACK / I) * I, backAt = b1 + (R - 1) * I;
        const errors = pas ? 0 : Math.round(blind * RPS);
        const x = t => 20 + Math.min(t, END) / END * 600;
        let s = `<line x1="20" y1="50" x2="620" y2="50" stroke="var(--line-2)" stroke-width="2"/>`;
        s += `<rect x="${x(CRASH)}" y="38" width="${Math.max(2, x(Math.min(detect, END)) - x(CRASH))}" height="24" fill="var(--red)" opacity=".25"/>`;
        s += `<rect x="${x(Math.min(detect, END))}" y="38" width="${Math.max(0, x(Math.min(backAt, END)) - x(Math.min(detect, END)))}" height="24" fill="var(--ink-3)" opacity=".15"/>`;
        for (let t = 0; t <= END; t += I) {
          const st = t < CRASH ? 'var(--green)' : t < BACK ? 'var(--red)' : 'var(--green)';
          s += `<circle cx="${x(t)}" cy="50" r="${I < 3 ? 2.2 : 3.5}" fill="${st}"/>`;
        }
        const mark = (t, label, y, col) => t <= END ? `<line x1="${x(t)}" y1="30" x2="${x(t)}" y2="70" stroke="${col}" stroke-width="2"/><text x="${x(t)}" y="${y}" text-anchor="middle" font-size="13" fill="var(--ink-2)" font-family="var(--f-mono)">${label}</text>` : '';
        s += mark(CRASH, 'crash 10s', 22, 'var(--red)') + mark(detect, 'LB ne hataya ' + detect + 's', 86, 'var(--amber)') + mark(BACK, 'theek 60s', 22, 'var(--green)') + mark(backAt, 'wapas ' + backAt + 's', 86, 'var(--accent)');
        q('.tl').innerHTML = s;
        q('.o-d').textContent = blind + ' s';
        q('.o-e').textContent = errors.toLocaleString('en-IN');
        q('.o-r').textContent = (backAt - BACK) + ' s';
        q('.o-c').textContent = Math.round(3 * 60 / I) + ' / min';
        q('.o-n').textContent = pas
          ? 'Passive check on: jo request mare server pe gayi, wo fail hote hi doosre server pe dobara bheji gayi (retry). User ko error nahi, bas wo request thodi slow. Active check phir bhi chahiye, taaki bina traffic ke bhi pata chale aur server ko wapas laaya ja sake.'
          : `Crash ke baad pehla check ${c1}s pe, aur ${F} lagatar fail + ${T}s timeout ke baad LB ne server hataya. Itne der har 3 mein se 1 request mare server pe gayi: ${blind}s × 100 = ${errors.toLocaleString('en-IN')} errors. ` + (F === 1 ? 'Dhyaan: fall = 1 matlab ek chhota network jhatka bhi server ko hata dega (flapping).' : I <= 2 ? 'Chhota interval = jaldi pata, lekin har LB har server ko zyada baar ping karega.' : 'Interval ya fall kam karo to ye number girega.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', run));
      q('.p-h').onclick = () => { q('.r-i').value = 2; q('.r-t').value = 2; q('.r-f').value = 3; q('.r-r').value = 2; run(); };
      q('.p-a').onclick = () => { q('.r-i').value = 30; q('.r-t').value = 5; q('.r-f').value = 2; q('.r-r').value = 5; run(); };
      run();
    }},
    { type: 'callout', tone: 'mistake', title: 'Deep health check ka jaal', html: `Socho <code>/health</code> andar database bhi check karta hai. Database 5 second ke liye slow hua. Ab <em>saare</em> servers ka health check fail, aur LB saare servers hata deta hai. Database ki chhoti si dikkat poori website ka outage ban gayi.<br>Isliye LB wala health check aksar <strong>shallow</strong> rakhte hain: "kya mera process chal raha hai aur request le sakta hai?" Database jaisi dependencies alag se monitor karte hain. (AWS ALB is khatre ke liye "fail open" karta hai: agar saare targets unhealthy hon, to wo sab ko traffic bhejta rehta hai.)` },
    { type: 'h2', text: 'LB khud SPOF na bane' },
    { type: 'p', html: `Upar ke flow ka aakhri scenario yaad karo: servers bilkul theek the, lekin LB gira aur poori site band. Humne servers ka SPOF hataya aur ek naya SPOF (LB) bana diya. Iska ilaaj: LB ki bhi do copies.` },
    { type: 'callout', tone: 'term', title: 'Floating IP (Virtual IP, VIP)', html: `<strong>Ye kya hai:</strong> ek IP address jo kisi ek machine se chipka nahi hota. Jo machine "abhi main hoon incharge" bolti hai, ye address uske paas chala jaata hai. Jaise ek helpline number jo shift badalne pe doosre operator ke phone pe forward ho jaata hai.<br><strong>Kyun chahiye:</strong> DNS mein xyz.com ka ek hi address hai. LB badle to bhi address nahi badalna chahiye, warna DNS update aur caching mein minute lag jaayenge.<br><strong>Iske bina:</strong> active LB gira to users purane address pe khatkhatate rahenge.` },
    { type: 'callout', tone: 'term', title: 'Heartbeat', html: `<strong>Ye kya hai:</strong> do machines ka ek doosre ko har second chhota sa "main zinda hoon" message bhejna.<br><strong>Kyun chahiye:</strong> standby ko pata chale ki active mar gaya, taaki wo kaam sambhal le.<br><strong>Iske bina:</strong> standby ko kabhi pata nahi chalega ki use aage aana hai. Linux pe ye kaam aksar <strong>keepalived</strong> naam ka tool <strong>VRRP</strong> protocol se karta hai.` },
    { type: 'p', html: `Do tareeke hain:` },
    { type: 'list', items: [
      `<strong>Active-passive:</strong> LB-A saara kaam karta hai, LB-B khaali baith ke heartbeat sunta hai. LB-A ka heartbeat band hua to LB-B floating IP le leta hai aur 1-3 second mein traffic sambhal leta hai. Simple hai, lekin LB-B ka paisa "bas intezaar" mein jaata hai.`,
      `<strong>Active-active:</strong> dono LB ek saath traffic lete hain (DNS mein dono ke address, ya network routers dono mein baantte hain). Ek gira to doosra poora le leta hai. Shart: har LB 50% se kam bhara ho, warna akela bacha LB doob jaayega.`,
      `<strong>Cloud LB:</strong> AWS ALB/NLB, Google Cloud Load Balancing andar se already kai machines pe chalte hain. Ye redundancy cloud company sambhalti hai, tum sirf ek naam (ya IP) use karte ho.`,
    ]},
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: 'xyz.com', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ke users. DNS se inhe ek hi address milta hai: floating IP 203.0.113.10. Kaunsa LB uske peeche hai, inhe nahi pata.' },
        { id: 'lba', label: 'LB-A', sub: 'active · VIP', x: 300, y: 80, w: 150, kind: 'edge', info: 'Ye kya hai: abhi ka incharge load balancer. Floating IP iske paas hai, isliye saari requests yahin aati hain. Har second LB-B ko heartbeat bhejta hai.' },
        { id: 'lbb', label: 'LB-B', sub: 'standby', x: 300, y: 260, w: 150, kind: 'edge', info: 'Ye kya hai: backup load balancer, same config. Heartbeat sunta rehta hai. Heartbeat band hua to floating IP apne paas le leta hai aur incharge ban jaata hai.' },
        { id: 's1', label: 'Server 1', x: 570, y: 80, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: application server. Dono LB ise jaante hain, isliye kisi bhi LB se request aaye, ye jawab de sakta hai.' },
        { id: 's2', label: 'Server 2', x: 570, y: 260, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: doosra application server, same code. Dono LB iski health check karte hain.' },
      ],
      edges: [
        { a: 'u', b: 'lba' }, { a: 'u', b: 'lbb', id: 'ub', hidden: true }, { a: 'lba', b: 'lbb', dashed: true },
        { a: 'lba', b: 's1' }, { a: 'lba', b: 's2' }, { a: 'lbb', b: 's1' }, { a: 'lbb', b: 's2' },
      ],
      scenarios: [
        { name: 'Normal din', steps: [
          { title: 'Heartbeat', text: 'LB-A har second LB-B ko bolta hai "main zinda hoon". LB-B sunta hai aur chupchaap baitha rehta hai.', go: ['evt:lba>lbb'], msg: 'VRRP heartbeat: LB-A alive, priority 200' },
          { title: 'Request LB-A pe', text: 'Floating IP LB-A ke paas hai, to user ki request wahin aati hai. LB-A Server 1 chunta hai.', go: ['u>lba>s1', 'res:s1>lba>u'], msg: 'GET /feed → 203.0.113.10 (LB-A)' },
        ]},
        { name: 'LB-A crash (failover)', intro: 'Active-passive ka asli imtihaan.', steps: [
          { title: 'LB-A mar gaya', text: 'LB-A ki machine ki power supply jal gayi. Requests gum ho rahi hain.', set: { lba: { state: 'down', sub: 'DOWN' } }, go: 'lost:u>lba' },
          { title: 'Heartbeat band', text: 'LB-B ko lagatar 3 heartbeat nahi mile (~3 second). Wo samajh gaya: active gaya.', go: 'lost:lba>lbb', focus: ['lbb'] },
          { title: 'LB-B floating IP le leta hai', text: 'LB-B network ko announce karta hai "203.0.113.10 ab mere paas hai". DNS ko kuch nahi badalna pada.', show: ['ub'], set: { lbb: { state: 'ok', sub: 'ACTIVE · VIP' } }, msg: 'gratuitous ARP: 203.0.113.10 is-at LB-B' },
          { title: 'Site wapas', text: 'Nayi requests LB-B se servers tak. Jo connections LB-A pe beech mein the wo toot gaye, unhe browser/app dobara try karega. Kul rukawat: kuch second.', go: ['u>lbb>s2', 'res:s2>lbb>u'] },
        ]},
        { name: 'Active-active', intro: 'Dono LB ek saath kaam karte hain.', steps: [
          { title: 'Dono LB traffic lete hain', text: 'DNS ya network dono LB mein traffic baant deta hai. Dono 40% bhare hain.', show: ['ub'], set: { lbb: { sub: 'active' } }, parallel: true, go: ['u>lba>s1', 'u>lbb>s2'] },
          { title: 'LB-A gira', text: 'Uska saara traffic LB-B pe. 40% + 40% = 80%. Bach gaye, kyunki har LB aadhe se kam bhara tha.', set: { lba: { state: 'down', sub: 'DOWN' } }, flood: { paths: ['u>lbb>s1', 'u>lbb>s2'], n: 10 }, after: { lbb: { state: 'hot', sub: '80% busy' } } },
        ]},
        { name: 'Split brain', intro: 'Failure ka ek chalaak roop.', steps: [
          { title: 'Sirf heartbeat ka link toota', text: 'Dono LB zinda hain, lekin unke beech ka network cable nikal gaya.', go: 'lost:lba>lbb' },
          { title: 'Dono bolte hain "main incharge"', text: 'LB-B ko laga LB-A mar gaya, to usne bhi floating IP le liya. Ab ek address ke do maalik: kabhi packet A pe, kabhi B pe, connections toot rahe hain. Isko <strong>split brain</strong> kehte hain.', show: ['ub'], set: { lba: { state: 'warn', sub: 'main VIP!' }, lbb: { state: 'warn', sub: 'nahi, main VIP!' } } },
          { title: 'Bachav', text: 'Heartbeat ke liye do alag network link rakho, ya ek teesra "referee" rakho jiski haan ke bina koi incharge na bane. (Ye idea Coordination lesson mein detail mein aayega.)' },
        ]},
      ],
    },
    { type: 'h2', text: 'DNS se load balancing (aur uski seemaayein)' },
    { type: 'p', html: `Ek sasta tareeka bhi hai jismein alag LB machine hi nahi chahiye: DNS mein xyz.com ke <strong>kai addresses</strong> daal do. DNS har poochne wale ko list alag order mein deta hai, aur browser aksar pehla address use karta hai. Isko <strong>round-robin DNS</strong> kehte hain.` },
    { type: 'code', text: `$ dig xyz.com
xyz.com.   300   IN   A   203.0.113.10
xyz.com.   300   IN   A   203.0.113.11
xyz.com.   300   IN   A   203.0.113.12
           ^^^ TTL: 300 second tak ye jawab yaad rakho` },
    { type: 'callout', tone: 'term', title: 'TTL (Time To Live)', html: `<strong>Ye kya hai:</strong> DNS jawab ke saath aane wala number: "is jawab ko kitne second tak yaad rakh sakte ho".<br><strong>Kyun chahiye:</strong> har page load pe DNS se poochna slow hota. Jawab yaad rakhne (cache) se internet tez chalta hai.<br><strong>Iske bina:</strong> DNS servers pe bahut bojh aur har website thodi slow.<br><strong>Ulta asar:</strong> agar koi address mar gaya, to jinke paas purana jawab yaad hai wo TTL khatam hone tak usi mare address pe jaate rahenge.` },
    { type: 'p', html: `Isliye DNS load balancing ki seemaayein hain:` },
    { type: 'list', items: [
      `<strong>Caching:</strong> server mara, tumne DNS se uska address hataya, lekin log TTL tak (aur kuch purane resolvers aur apps usse bhi zyada der) purana address use karte rahenge.`,
      `<strong>Health nahi dekhta:</strong> simple DNS ko pata hi nahi ki koi server mara hai. (Kuch managed DNS, jaise AWS Route 53, health check karke mare address ko jawab se hata dete hain, lekin caching phir bhi rehti hai.)`,
      `<strong>Load nahi dekhta:</strong> ek bade internet provider ka DNS resolver ek hi jawab lakhon users ko de deta hai. Wo saare ek hi server pe gir sakte hain.`,
    ]},
    { type: 'p', html: `Isliye DNS ko aksar <em>pehli, moti</em> baant ke liye use karte hain (jaise "Mumbai jaao ya Virginia", ya do LB ke beech), aur asli, tez faisla LB karta hai. Location dekh ke jawab dena (GeoDNS) agle lesson mein hai.` },
    { type: 'p', html: `Khud dekho: ek address time 0 pe mara aur turant DNS se hata diya. Kitne users abhi bhi us mare address pe ja rahe hain?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
        <label>TTL: <strong class="v-t"></strong><input type="range" class="r-t" min="0" max="5" value="2"></label>
        <label>TTL ignore karne wale clients: <strong class="v-g"></strong>%<input type="range" class="r-g" min="0" max="20" value="5"></label>
        </div><div class="bars" style="margin-top:12px"></div><div class="calc-note o-n"></div>`;
      const TTLS = [30, 60, 300, 900, 3600, 86400];
      const NAMES = ['30 s', '1 min', '5 min', '15 min', '1 ghanta', '1 din'];
      const AT = [[60, '1 min baad'], [300, '5 min baad'], [900, '15 min baad'], [3600, '1 ghante baad']];
      const STUCK = 1800;
      const q = s => el.querySelector(s);
      const run = () => {
        const ttl = TTLS[+q('.r-t').value], g = +q('.r-g').value / 100;
        q('.v-t').textContent = NAMES[+q('.r-t').value]; q('.v-g').textContent = Math.round(g * 100);
        const stale = t => (1 - g) * Math.max(0, 1 - t / ttl) + g * Math.max(0, 1 - t / Math.max(ttl, STUCK));
        q('.bars').innerHTML = AT.map(([t, lab]) => { const v = stale(t) * 100; return `<div style="display:grid;grid-template-columns:110px 1fr 56px;gap:10px;align-items:center;margin:6px 0"><span style="font-size:14px">${lab}</span><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${v.toFixed(1)}%;background:var(--red)"></div></div><span style="font:13px var(--f-mono)">${v.toFixed(1)}%</span></div>`; }).join('');
        q('.o-n').textContent = `Lal bar = abhi bhi mare address pe jaane wale users. TTL ${NAMES[+q('.r-t').value]} hai: jinke paas jawab cache tha, unka cache 0 se TTL ke beech kabhi bhi khatam hoga. ` + (ttl >= 3600 ? 'Lamba TTL = DNS servers pe kam bojh, lekin failover ghanton ka.' : ttl <= 60 ? 'Chhota TTL = jaldi failover, lekin DNS lookups zyada (thodi latency aur DNS ka kharcha).' : 'Beech ka raasta. Ziddi clients (jo TTL nahi maante) ki wajah se poonchh lambi rehti hai.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', run));
      run();
    }},

    { type: 'h2', text: 'TLS termination: taala kahan khule?' },
    { type: 'callout', tone: 'term', title: 'TLS (HTTPS ka "S")', html: `<strong>Ye kya hai:</strong> browser aur website ke beech ka encryption. Data ek taale wale dibbe mein jaata hai jise beech mein koi padh nahi sakta. Taala kholne ke liye website ke paas ek <strong>certificate</strong> aur secret key hoti hai.<br><strong>Kyun chahiye:</strong> password, messages, payment details raaste mein koi chura na sake.<br><strong>Iske bina:</strong> cafe ke Wi-Fi pe baitha koi bhi tumhara password padh sakta hai.` },
    { type: 'p', html: `Taala kholna (decrypt) CPU ka kaam hai. Sawaal: ye kaam kaun kare, LB ya har server? <strong>TLS termination</strong> matlab LB pe hi taala khol dena. Teen options:` },
    { type: 'table', head: ['Option', 'Kya hota hai', 'Kab'], rows: [
      ['Terminate at LB', 'LB decrypt karta hai, andar servers ko plain HTTP. Certificate sirf LB pe.', 'Sabse common. LB request padh sakta hai (URL, cookie), servers ka CPU bachta hai.'],
      ['Re-encrypt', 'LB kholta hai, padhta hai, phir naye TLS se server ko bhejta hai.', 'Andar ka network bhi bharosemand nahi (banking, compliance rules).'],
      ['Passthrough', 'LB taala kholta hi nahi, bytes as-it-is server ko. Server khud kholta hai.', 'LB ko content nahi dekhna (L4), ya key server se bahar nahi jaani chahiye.'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Server ko user ka IP kaise pata chale?', html: `LB ke peeche server ko har request LB ke IP se aati dikhti hai. Isliye L7 LB ek header jod deta hai: <code>X-Forwarded-For: 49.36.x.x</code> (user ka asli IP). Rate limiting aur logs isi header se user ko pehchaante hain.` },
    { type: 'h2', text: 'Sticky sessions, aur deploy ke time connection draining' },
    { type: 'callout', tone: 'term', title: 'Session', html: `<strong>Ye kya hai:</strong> server ki "yaaddasht" ki tum kaun ho. Login ke baad server ek chhoti ID (session ID) cookie mein bhejta hai, aur apne paas likh leta hai: "session abc = Riya, logged in".<br><strong>Kyun chahiye:</strong> taaki har page pe dobara password na maangna pade.<br><strong>Iske bina:</strong> har click pe login.` },
    { type: 'callout', tone: 'term', title: 'Sticky session (session affinity)', html: `<strong>Ye kya hai:</strong> LB ka niyam ki ek user hamesha <em>same</em> server pe jaaye. LB ek cookie lagata hai (jaise AWS ALB ki <code>AWSALB</code> cookie) ya user ke IP se server chunta hai.<br><strong>Kyun chahiye:</strong> jab server session ko apni memory mein rakhta hai, to user ko wapas usi server pe aana padega, warna "tum kaun?"<br><strong>Iske bina (aur memory wale session ke saath):</strong> har doosri request pe user logged out dikhega.` },
    { type: 'p', html: `Sticky session ek jugaad hai jo kaam to karta hai, lekin teen jagah dukhta hai: (1) wo server gira to uske saare users ka session gaya, (2) load barabar nahi bantta kyunki kuch users bahut active hote hain aur wo ek hi server pe chipke hain, (3) naya server add karo to purane users uspe nahi jaate, wo khaali baitha rehta hai.` },
    { type: 'p', html: `<strong>Fix:</strong> session ko server ki memory se nikaal ke ek <strong>shared session store</strong> (jaise Redis) mein rakho. Ab har server stateless hai, koi bhi server kisi bhi user ko pehchaan leta hai, aur LB ko chipkaane ki zaroorat nahi.` },
    { type: 'callout', tone: 'term', title: 'Connection draining (deregistration delay)', html: `<strong>Ye kya hai:</strong> server ko band karne se pehle LB use "draining" mark karta hai: nayi requests nahi milengi, lekin jo requests chal rahi hain unhe poora hone diya jaata hai. Phir server band.<br><strong>Kyun chahiye:</strong> deploy (naya code daalna) ke time servers ek ek karke restart hote hain. Bina draining ke beech mein chal rahi upload ya payment toot jaayegi.<br><strong>Iske bina:</strong> har deploy pe kuch users ko error.<br><strong>Example:</strong> AWS ALB default mein 300 second tak wait karta hai (ye setting badal sakte ho).` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Riya', sub: 'logged in', x: 80, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ki ek user. Login kar chuki hai. Browser har request ke saath session cookie bhejta hai.' },
        { id: 'lb', label: 'Load Balancer', x: 270, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: traffic baantne wala. Sticky mode mein cookie dekh ke hamesha same server chunta hai. Deploy ke time server ko "draining" mark kar sakta hai.' },
        { id: 's1', label: 'Server 1', x: 470, y: 80, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: application server. Sticky setup mein Riya ka session isi ki memory mein hai.' },
        { id: 's2', label: 'Server 2', x: 470, y: 260, w: 130, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: doosra application server, same code. Lekin iski memory mein Riya ka session nahi hai (sticky setup mein).' },
        { id: 'ss', label: 'Session store', sub: 'Redis', x: 640, y: 170, w: 130, kind: 'cache', hidden: true, info: 'Ye kya hai: ek shared, tez memory wala store jahan saare sessions rakhe hain. Kyun: koi bhi server kisi bhi user ka session padh sake. Iske bina servers ko sticky banana padta.' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' },
        { a: 's1', b: 'ss', id: 'e1', hidden: true }, { a: 's2', b: 'ss', id: 'e2', hidden: true },
      ],
      scenarios: [
        { name: 'Sticky session', steps: [
          { title: 'Login Server 1 pe', text: 'Server 1 apni memory mein likhta hai "abc = Riya". LB response mein cookie jod deta hai: "is user ko Server 1 pe bhejna".', go: ['u>lb>s1', 'res:s1>lb>u'], after: { s1: { sub: 'memory: Riya' } }, msg: 'Set-Cookie: session=abc; LBSTICKY=s1' },
          { title: 'Har agli request Server 1 pe', text: 'Cookie dekh ke LB hamesha Server 1 chunta hai, chahe wo kitna bhi busy ho.', flood: { paths: ['u>lb>s1'], n: 8 }, after: { s1: { load: 85, state: 'hot' }, s2: { load: 10 } } },
          { title: 'Load tedha', text: 'Server 1 laal, Server 2 khaali. Jitne heavy users Server 1 pe chipke, utna tedha.', focus: ['s1', 's2'] },
        ]},
        { name: 'Sticky + crash', steps: [
          { title: 'Server 1 gira', text: 'Riya ka session Server 1 ki memory mein tha. Memory ke saath session bhi gaya.', set: { s1: { state: 'down', sub: 'DOWN', load: 0 } } },
          { title: 'LB Server 2 pe bhejta hai', text: 'Server 2 ke paas "abc" ka koi record nahi.', go: ['u>lb>s2', 'bad:s2>lb>u'], msg: '302 → /login   (session abc not found)' },
          { title: 'Riya logged out', text: 'Cart, form mein bhara data, sab gaya. Server 1 ke saare users ke saath yahi hua.', set: { u: { state: 'warn', sub: 'logged out!' } } },
        ]},
        { name: 'Shared session store', intro: 'Fix: session server ki memory ki jagah Redis mein.', steps: [
          { title: 'Session Redis mein', text: 'Login pe server session ko Redis mein likhta hai. Ab servers stateless hain, LB koi bhi server chun sakta hai.', show: ['ss', 'e1', 'e2'], go: ['u>lb>s1>ss'], after: { ss: { state: 'hit', sub: 'abc = Riya' } } },
          { title: 'Server 1 gira', set: { s1: { state: 'down', sub: 'DOWN', load: 0 } }, text: 'Server 1 gaya, lekin session uski memory mein tha hi nahi.' },
          { title: 'Server 2 pehchaan leta hai', text: 'Server 2 Redis se "abc" padhta hai: Riya hai, logged in. Riya ko kuch pata hi nahi chala.', go: ['u>lb>s2>ss', 'res:ss>s2>lb>u'], msg: 'GET session:abc → Riya ✓' },
        ]},
        { name: 'Deploy bina draining', steps: [
          { title: 'Riya video upload kar rahi hai', text: 'Server 1 pe 40 second ki upload chal rahi hai.', go: 'u>lb>s1', after: { s1: { load: 60, sub: 'upload 50%' } } },
          { title: 'Deploy script Server 1 ko seedha band karti hai', text: 'Naya code daalne ke liye process kill. Beech wali upload ka connection toot gaya.', set: { s1: { state: 'down', sub: 'restarting', load: 0 } }, go: 'bad:s1>lb>u', msg: '502 Bad Gateway  (upload failed at 50%)' },
        ]},
        { name: 'Deploy with draining', steps: [
          { title: 'Upload chal rahi hai', text: 'Server 1 pe Riya ki 40 second ki upload chal rahi hai.', go: 'u>lb>s1', after: { s1: { load: 60, sub: 'upload 50%' } } },
          { title: 'LB: Server 1 draining', text: 'Deploy pehle LB ko bolta hai: Server 1 ko nayi requests mat do. Purani chalti rahengi.', set: { s1: { state: 'warn', sub: 'draining' } } },
          { title: 'Nayi requests Server 2 pe', text: 'Baaki users ko kuch pata nahi chalta.', flood: { paths: ['u>lb>s2'], n: 6 }, after: { s2: { load: 55 } } },
          { title: 'Upload poori, phir restart', text: 'Upload khatam (ya draining ka time khatam). Ab Server 1 band hoke naye code ke saath uthta hai. Health check pass, wapas rotation mein.', go: 'res:s1>lb>u', after: { s1: { state: 'ok', sub: 'v2 ✓', load: 15 } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Hardware, software ya cloud LB?' },
    { type: 'p', html: `LB koi jaadui dabba nahi, ye bhi ek program hai jo kisi machine pe chalta hai. Teen tarah ke milte hain:` },
    { type: 'table', head: ['Type', 'Examples', 'Achha', 'Bura'], rows: [
      ['Hardware appliance', 'F5 BIG-IP, Citrix ADC (NetScaler)', 'Bahut tez, special chips, vendor support', 'Mehenga, scale karne ke liye naya dabba khareedna, data center mein hi'],
      ['Software (khud chalao)', 'NGINX, HAProxy, Envoy, Linux ka LVS', 'Free/open-source, kisi bhi machine pe, poora control', 'Install, update, redundancy (floating IP) sab tumhara kaam'],
      ['Cloud managed', 'AWS ALB (L7) aur NLB (L4), Google Cloud Load Balancing, Azure Load Balancer', 'Click se ready, andar se redundant, apne aap scale', 'Har GB/request ka bill, cloud se bandhe, kam control'],
    ]},
    { type: 'list', items: [
      `<strong>NGINX:</strong> web server bhi, reverse proxy bhi. L7 aur L4 dono. Bahut common pehla LB.`,
      `<strong>HAProxy:</strong> sirf load balancing ke liye bana, bahut tez, detailed health checks aur stats.`,
      `<strong>Envoy:</strong> naye zamane ka proxy, microservices ke liye. Aksar har service ke bagal mein ek chhote helper ("sidecar") ki tarah chalta hai, aur iski settings bina restart ke API se badal sakti hain.`,
      `<strong>Real example:</strong> Wikipedia ne apne servers ke aage saalon tak LVS (Linux ka L4 load balancer) chalaya. 2023 ke aas paas se wo Katran (Meta ka open-source L4 LB) pe shift ho raha hai.`,
    ]},

    { type: 'h2', text: 'L4 vs L7: chhota sa intro' },
    { type: 'p', html: `LB request ko kitna "padhta" hai, uske hisaab se do type hain. Number internet ke layers se aate hain: layer 4 = TCP/UDP (sirf address aur port), layer 7 = HTTP (poori request).` },
    { type: 'compare',
      left: { title: 'L4 (transport level)', html: `Sirf IP aur port dekhta hai, andar ka content nahi.<br><br>• Bahut fast, halka<br>• Koi bhi traffic (WebSockets, games, database)<br>• Example: AWS NLB, LVS<br><br>Jaise courier wala jo sirf address dekhta hai, parcel nahi kholta.` },
      right: { title: 'L7 (application level)', html: `HTTP request padhta hai: URL, headers, cookies.<br><br>• <code>/api/payments</code> → payment servers<br>• <code>/images</code> → image servers<br>• Example: NGINX, Envoy, AWS ALB<br><br>Jaise office ka receptionist jo letter padh ke sahi department bhejta hai.` },
    },
    { type: 'p', html: `Iska detail (TLS, cost, kab kaunsa) aur saare algorithms agle lesson mein hain: <a href="#/lb-algorithms">LB algorithms, L4 vs L7</a>. Ek jhalak:` },
    { type: 'table', head: ['Algorithm', 'Kaise kaam karta hai', 'Kab use karein'], rows: [
      ['Round robin', 'Baari baari: 1, 2, 3, 1, 2, 3', 'Servers same size, requests same size. Aksar default.'],
      ['Weighted round robin', 'Bade server ko zyada baari (jaise 3:1)', 'Servers alag alag size ke hain'],
      ['Least connections', 'Jis server pe abhi sabse kam chalti requests hain', 'Requests ka time bahut alag alag (kuch 10 ms, kuch 10 s)'],
      ['IP hash', 'User ke IP se hamesha same server', 'Jab user ko same server pe chipkana ho. Aam taur pe avoid karo.'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide kaise karein', html: `• URL, header ya cookie ke hisaab se alag services pe bhejna hai (jaise <code>/api/payments</code>) → <strong>L7</strong>.<br>• Raw speed chahiye ya non-HTTP traffic hai (jaise lakhon WebSocket connections) → <strong>L4</strong>.<br>• Requests ka time bahut alag alag hai → <strong>least connections</strong>, warna round robin.<br>• Sirf ek jaise servers mein traffic baantna → <strong>LB</strong>. Auth, rate limiting, kai services pe routing → <strong>API gateway</strong> (aksar dono hote hain: gateway bhi peeche LB ke saath chalta hai).<br>• LB hamesha jodi mein (ya cloud managed), kabhi akela nahi.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: LB vs DNS', html: `LB DNS ka replacement nahi hai. DNS naam ko address mein badalta hai (aur wo address aksar LB ka hota hai). LB us address pe aayi requests ko servers mein baantta hai. Pehle DNS, phir LB. DNS bhi thoda baant sakta hai, lekin caching ki wajah se dheere aur andha.` },
    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com ka load balancing, ek nazar mein', height: 600,
      groups: [
        { label: 'Users aur DNS', x: 20, y: 8, w: 680, h: 100 },
        { label: 'LB jodi (floating IP)', x: 20, y: 140, w: 680, h: 110 },
        { label: 'App servers (stateless)', x: 20, y: 290, w: 680, h: 120 },
        { label: 'Data', x: 20, y: 450, w: 680, h: 130 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser / app', x: 200, y: 62, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Inhe sirf ek naam pata hai. DNS se ek address (floating IP) milta hai aur saari requests wahin jaati hain.' },
        { id: 'dns', label: 'DNS', sub: 'xyz.com → VIP', x: 520, y: 62, kind: 'net', info: 'Ye kya hai: internet ki phone directory. xyz.com ka address batata hai, jo LB jodi ka floating IP hai. TTL ki wajah se iske jawab cache hote hain, isliye ise tez failover ke liye use nahi karte.' },
        { id: 'lba', label: 'LB-A', sub: 'active · TLS', x: 200, y: 200, kind: 'edge', info: 'Ye kya hai: abhi ka incharge load balancer. TLS kholta hai, health checks chalata hai, aur har request ko ek healthy server deta hai. Deploy ke time servers ko drain karta hai.' },
        { id: 'lbb', label: 'LB-B', sub: 'standby', x: 520, y: 200, kind: 'edge', info: 'Ye kya hai: backup LB. Heartbeat sunta hai. LB-A gira to floating IP le leta hai, taaki LB khud SPOF na rahe.' },
        { id: 's1', label: 'Server 1', sub: 'stateless', x: 110, y: 360, kind: 'server', info: 'Ye kya hai: application server. Memory mein user ki koi zaroori cheez nahi rakhta, isliye koi bhi request le sakta hai aur bina dikkat hataya ja sakta hai.' },
        { id: 's2', label: 'Server 2', sub: 'stateless', x: 360, y: 360, kind: 'server', info: 'Ye kya hai: same code wala doosra server. LB ise har 2-5 second health check karta hai.' },
        { id: 's3', label: 'Server 3', sub: 'autoscaled', x: 610, y: 360, kind: 'server', info: 'Ye kya hai: bheed badhne pe apne aap start hua server. Health check pass hote hi LB ise traffic dene lagta hai.' },
        { id: 'sess', label: 'Session store', sub: 'Redis', x: 200, y: 520, kind: 'cache', info: 'Ye kya hai: shared jagah jahan login sessions rakhe hain. Iski wajah se sticky sessions ki zaroorat nahi: koi bhi server kisi bhi user ko pehchaan leta hai.' },
        { id: 'db', label: 'Database', x: 520, y: 520, kind: 'data', info: 'Ye kya hai: xyz.com ka pakka data. Saare servers yahin se padhte hain. LB servers ko scale karta hai, database ko nahi: agla bottleneck yahi hoga.' },
      ],
      edges: [
        { a: 'users', b: 'dns', n: 1, label: 'naam → IP' },
        { a: 'users', b: 'lba', n: 2, label: 'HTTPS' },
        { a: 'users', b: 'lbb', dashed: true, label: 'failover pe' },
        { a: 'lba', b: 'lbb', dashed: true, kind: 'evt', label: 'heartbeat', both: true },
        { a: 'lba', b: 's1' },
        { a: 'lba', b: 's2', n: 3, label: 'chuna' },
        { a: 'lba', b: 's3' },
        { a: 'lbb', b: 's3', dashed: true },
        { a: 's1', b: 'sess' },
        { a: 's2', b: 'sess', n: 4, label: 'session' },
        { a: 's2', b: 'db', n: 5, label: 'data' },
        { a: 's3', b: 'db' },
      ],
      paths: [
        { name: 'Normal request', text: 'DNS se floating IP, LB-A pe TLS khula, healthy Server 2 chuna gaya, session Redis se aur data database se.', go: ['users>dns', 'users>lba>s2>sess', 's2>db'] },
        { name: 'Health checks', text: 'LB-A har few second har server ko /health bhejta hai. Lagatar fail (fall) pe server rotation se bahar, lagatar pass (rise) pe wapas.', go: ['lba>s1', 'lba>s2', 'lba>s3'] },
        { name: 'LB failover', text: 'LB-A gira: heartbeat band, LB-B ne floating IP le liya. Users ka address wahi, DNS badalna nahi pada.', go: ['lba>lbb', 'users>lbb>s3>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>LB servers ke aage baithta hai, har request ko ek healthy server deta hai. DNS LB ka address deta hai.</li>
      <li>Health checks: active (LB khud poochta hai) + passive (asli requests ke failures ginta hai). Interval, timeout, fall, rise decide karte hain ki kitni jaldi pata chale.</li>
      <li>LB khud SPOF na ho: active-passive jodi + floating IP (keepalived/VRRP), ya active-active, ya cloud LB.</li>
      <li>DNS load balancing sasta hai lekin TTL caching ki wajah se failover dheema aur health/load se andha.</li>
      <li>TLS aksar LB pe khulta hai (termination): certificate ek jagah, LB request padh sakta hai.</li>
      <li>Sticky sessions avoid karo: session Redis jaise shared store mein, servers stateless.</li>
      <li>Deploy pe connection draining: pehle nayi requests band, chalti poori, phir restart.</li>
      <li>L7 = URL/header padh ke routing, L4 = sirf IP/port, bahut tez. Detail agle lesson mein.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Traffic servers mein barabar bantta hai', 'Bimaar server apne aap hat jaata hai (health checks)', 'Server add/remove aur deploy bina downtime (draining)', 'Users ko ek hi address dikhta hai, peeche kuch bhi badlo', 'TLS ek jagah khulta hai, certificate ek jagah'], costs: ['Har request mein ek extra hop (thodi latency, aksar 1 ms se kam)', 'LB khud SPOF ban sakta hai: jodi ya cloud LB chahiye', 'Ek aur component: config, monitoring, bill', 'Servers ko stateless banana padta hai (session bahar)', 'Galat health check poori site gira sakta hai'] },
    { type: 'think', questions: [
      { q: 'Health check har 10 second, fall = 3. Server 2 achanak mar gaya. Kitni der tak requests uspe jaa sakti hain, aur users ko bachane ke liye kya karoge?', a: 'Lagbhag 20-30 second (pehla failed check 10 s ke andar, phir 2 aur checks, plus timeout). Is beech har 3 mein se 1 request fail. Bachav: interval chhota (2-5 s), passive check + retry on (fail hui request doosre server pe), aur client side retry. Zero failure mushkil hai, "bahut kam" target hai.' },
      { q: 'xyz.com pe kuch requests 20 ms ki hain, kuch video export 30 second ki. Round robin ya least connections?', a: 'Least connections. Round robin ginti barabar baantega, lekin ek server pe 3 lambi export requests aa gayin to wo atak jaayega jabki baaki khaali hain. Least connections dekhta hai ki abhi kaun kitna busy hai. Aur behtar: exports ko alag job queue pe bhejo.' },
      { q: 'Tumne LB-A aur LB-B active-active lagaye, dono 70% busy rehte hain. Isme kya khatra hai?', a: 'Ek gira to doosre pe 140% load aayega aur wo bhi doobega. Active-active mein har LB ko 50% se neeche rakhna chahiye (ya teesra LB jodo, N+1).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'LB ko kaise pata chalta hai ki server down hai?', options: ['User complain karta hai', 'Health checks se', 'DNS batata hai'], answer: 1, explain: 'LB baar baar /health jaisa endpoint check karta hai (active) aur asli requests ke failures ginta hai (passive). Fail hone pe server ko rotation se hata deta hai.' },
      { q: '/api/payments ko alag servers pe aur baaki ko alag pe bhejna hai. Kaunsa LB?', options: ['L4', 'L7', 'Koi bhi'], answer: 1, explain: 'URL path padhna padega, jo sirf L7 (HTTP level) LB kar sakta hai.' },
      { q: 'Active LB gira. Users ka address (DNS) badle bina standby LB kaise kaam sambhalta hai?', options: ['DNS TTL 0 kar ke', 'Floating IP le ke (VRRP/keepalived)', 'Users ko naya link email karke'], answer: 1, explain: 'Floating (virtual) IP ek machine se chipka nahi hota. Heartbeat band hote hi standby wo IP apne paas le leta hai.' },
      { q: 'Login ke baad users ko baar baar "logged out" dikhta hai jab request doosre server pe jaati hai. Sabse achha fix?', options: ['Sticky sessions on karo', 'Session Redis jaise shared store mein rakho', 'Servers kam karo'], answer: 1, explain: 'Sticky sessions jugaad hai (server gira to session gaya, load tedha). Shared session store se servers stateless ho jaate hain.' },
      { q: 'Deploy ke time beech wali uploads toot rahi hain. Kaunsa feature chahiye?', options: ['Connection draining', 'GeoDNS', 'IP hash'], answer: 0, explain: 'Draining mein server ko pehle nayi requests milna band hota hai, chalti requests poori hoti hain, phir restart.' },
      { q: 'LB lagaya, servers 3 se 10 kar diye. Ab agla bottleneck kya hone ki sambhavna hai?', options: ['DNS', 'Database', 'Browser'], answer: 1, explain: 'Saare servers ek hi database se baat karte hain. LB servers ko scale karta hai, database ko nahi.' },
    ]},
    { type: 'sources', items: [
      { title: 'Module ngx_http_upstream_module', publisher: 'nginx.org', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_upstream_module.html', used: 'Default weighted round robin, max_fails=1 aur fail_timeout=10s defaults, active health_check sirf commercial (NGINX Plus) mein.' },
      { title: 'Health checks for Application Load Balancer target groups', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html', used: 'ALB defaults: interval 30 s, timeout 5 s, healthy threshold 5, unhealthy 2, aur saare targets unhealthy hone pe fail open.' },
      { title: 'Edit target group attributes (deregistration delay, sticky sessions)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html', used: 'Deregistration delay default 300 s (draining), AWSALB sticky cookie.' },
      { title: 'HAProxy configuration manual (server check options)', publisher: 'HAProxy', official: true, url: 'https://docs.haproxy.org/2.8/configuration.html', used: 'Health check options inter (2 s), fall (3), rise (2).' },
      { title: 'LVS', publisher: 'Wikitech (Wikimedia)', official: true, url: 'https://wikitech.wikimedia.org/wiki/LVS', used: 'Wikipedia ka L4 load balancer (LVS + PyBal health checks) aur Katran ki taraf migration.' },
      { title: 'Keepalived: introduction', publisher: 'Keepalived project docs', official: true, url: 'https://keepalived.readthedocs.io/en/latest/introduction.html', used: 'VRRP se floating IP failover ka tareeka.' },
    ]},
  ],
});
