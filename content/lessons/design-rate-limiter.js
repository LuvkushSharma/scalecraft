Lesson.register({
  id: 'design-rate-limiter',
  title: 'Rate limiter',
  minutes: 32,
  summary: `Algorithms tum <a href="#/rate-limiting">Rate limiting</a> lesson mein seekh chuke ho. Ab poori service design karte hain: rules kahan likhe jaayein, limiter kahan baithe, Redis + Lua se 50 servers ek hi ginti kaise rakhein, Redis gire to kya karein (fail-open vs fail-closed), aur kai regions mein kya hota hai. Stripe, Cloudflare aur Lyft/Envoy ne jo publicly bataya hai, usi pe based.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ki API ko bahut saare apps call karte hain. Ek din kisi app ke code mein bug aaya aur wo har second 5,000 requests bhejne laga. Hamare servers us ek app mein uljhe rahe, aur baaki sab users ke liye site slow ho gayi. Hamein ek "darwaze ka chowkidaar" chahiye jo har aane wale ko ginta rahe: "tum is second 100 baar aa chuke ho, thoda ruk ke aana". Mushkil ye hai ki darwaze 50 hain, aur sab chowkidaaron ko <strong>ek hi ginti</strong> dikhni chahiye, wo bhi bina kisi ko line mein khada kiye. Ye lesson wahi chowkidaar system banata hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: xyz.com ki public API hai, 50 API servers hain. Har API key ko 100 requests/second tak allow karna hai. Ginti kahan rakhoge? Ginti wala system gir jaaye to kya karoge? Phir yahan compare karo.` },

    { type: 'p', html: `Ye "building block khud banao" wala interview sawaal hai. Ginti ke tareeke (algorithms) tum <a href="#/rate-limiting">Rate limiting</a> lesson mein khel ke seekh chuke ho. Yahan asli sawaal ye hai: <strong>bahut saare servers ke beech sahi ginti, bina har request ko slow kiye</strong>. Pehle kuch shabd saaf kar lete hain.` },

    { type: 'h2', text: 'Pehle kuch shabd' },
    { type: 'callout', tone: 'term', title: 'Rate limiter', html: `<strong>Ye kya hai:</strong> ek component jo har request pe bas ek sawaal ka jawab deta hai: "is client ko abhi aane doon ya nahi?" Ek ginti rakhta hai, jaise "is API key ne is second 57 requests bheji".<br><strong>Kyun chahiye:</strong> ek galat ya bure client se baaki sab users ko bachane ke liye, aur mehngi cheezon (SMS, payments, login) ka misuse rokne ke liye.<br><strong>Iske bina:</strong> ek bhaaga hua script ya bot poori site slow kar deta hai, aur sabko nuksaan hota hai.` },
    { type: 'callout', tone: 'term', title: 'API key', html: `<strong>Ye kya hai:</strong> ek lamba secret string (jaise <code>key_abc</code>) jo xyz.com har developer ko deta hai. Developer ka app har request ke saath ise bhejta hai.<br><strong>Kyun chahiye:</strong> isse pata chalta hai request <em>kiski</em> hai, taaki ginti us developer ke naam pe ho.<br><strong>Iske bina:</strong> hum sirf IP address se gin paate, jo bahut log share karte hain (aage dekhenge kyun ye problem hai).` },
    { type: 'callout', tone: 'term', title: 'API gateway', html: `<strong>Ye kya hai:</strong> wo server jisse xyz.com ki har request sabse pehle guzarti hai, jaise building ka main gate. Wo login check, routing aur rate limit jaise common kaam karta hai, phir request asli service tak bhejta hai.<br><strong>Kyun chahiye:</strong> common kaam ek jagah ho jaate hain. Har service ko apna chowkidaar nahi likhna padta.<br><strong>Iske bina:</strong> har team apna alag limiter likhegi, alag bugs ke saath.` },
    { type: 'callout', tone: 'term', title: 'Redis', html: `<strong>Ye kya hai:</strong> ek bahut tez database jo data RAM (memory) mein rakhta hai. Ek chhoti ginti padhna ya badhana usme lagbhag ek millisecond se bhi kam leta hai.<br><strong>Kyun chahiye:</strong> 50 gateways ko ek hi ginti dekhni hai. Ginti kisi ek gateway ki memory mein rahi to baaki 49 ko pata hi nahi chalega. Redis wo "shared kaapi" hai jisme sab likhte aur padhte hain.<br><strong>Iske bina:</strong> har gateway alag ginega. Hadd 100 ho to client 50 × 100 = 5,000 requests nikaal lega.` },
    { type: 'callout', tone: 'term', title: '429 Too Many Requests', html: `<strong>Ye kya hai:</strong> HTTP ka ek status code jiska matlab hai "tum bahut zyada aa rahe ho, thoda ruko". Saath mein aksar <code>Retry-After: 1</code> header hota hai: "1 second baad aana".<br><strong>Kyun chahiye:</strong> client ka program samajh jaata hai ki galti uski speed ki hai, server ki nahi, aur wo ruk ke dobara try karta hai.<br><strong>Iske bina:</strong> client ko 500 (server error) jaisa kuch milta aur wo turant baar baar retry karta, jo load aur badhata.` },
    { type: 'p', html: `Ginti kaise karte hain, uske paanch tareeke hain. Har ek ka andar ka haal (bucket ka level, window ke counters) tumne <a href="#/rate-limiting">Rate limiting</a> lesson ke widgets mein chala ke dekha tha. Yahan sirf ek line ki yaad dila dete hain:` },
    { type: 'table', head: ['Algorithm', 'Ek line mein', 'Per key kya yaad rakhna padta hai'], rows: [
      ['Token bucket', 'Ek baalti mein tokens ek fixed speed se bharte hain; har request ek token leti hai; baalti khaali = 429. Thoda burst allowed.', '2 numbers: tokens, aakhri refill ka time'],
      ['Leaky bucket', 'Requests ek line mein lagti hain aur fixed speed se aage jaati hain; line bhar gayi to nayi request drop.', 'Ek queue (ya ek level number)'],
      ['Fixed window counter', 'Har minute ek naya counter; hadd paar to 429. Minute ke kinaare pe 2× burst ho sakta hai.', '1 counter per window'],
      ['Sliding window log', 'Har request ka time yaad rakho; pichhle 60 second ki ginti exact.', 'Har request ka timestamp (mehnga)'],
      ['Sliding window counter', 'Pichhli aur abhi ki window ke counters se andaza; smooth aur sasta.', '2 numbers'],
    ]},
    { type: 'p', html: `Teen real systems is lesson ki reedh ki haddi hain. Teeno ne publicly bataya ki unhone ye kaise banaya:` },
    { type: 'list', items: [
      `<strong>Stripe</strong> (online payments ki company, developers unki API call karte hain): 2017 ki engineering post mein unhone apne chaar limiters, token bucket aur Redis ka use bataya. Post purani hai (2017), lekin ideas aaj bhi standard hain.`,
      `<strong>Cloudflare</strong> (ek CDN jo lakhon websites ke aage baithta hai): 2017 mein likha ki unhone sliding window ka andaza (approximation) kyun chuna aur ginti har data center mein alag kyun rakhi.`,
      `<strong>Lyft ka ratelimit service</strong>: Lyft (US ki ride app) ne Envoy naam ke proxy ke liye ek alag rate limit service banayi aur open source ki (ab envoyproxy/ratelimit). Rules ek config file mein, ginti Redis mein.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Envoy (proxy)', html: `<strong>Ye kya hai:</strong> ek open-source <em>proxy</em>: ek program jo client aur asli server ke beech baithta hai aur har request ko aage bhejta hai. API gateway aksar Envoy jaise proxy se hi banta hai. (Proxy ki poori kahani <a href="#/proxies">Proxies</a> lesson mein.)<br><strong>Kyun chahiye:</strong> wo har request dekhta hai, to wahi sahi jagah hai "isko aane doon?" poochhne ki.<br><strong>Iske bina:</strong> har app ko khud limiter ko call karna padta.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Rules: per user, per IP, per API key, per endpoint (aur inke combinations)<br>• Hadd paar ho to <code>429 Too Many Requests</code> + <code>Retry-After</code><br>• Rules bina code deploy ke badal sakein<br>• "Sirf dekho, roko mat" mode (naye rule ko test karne ke liye)<br><br><strong>Out of scope:</strong> billing, monthly quotas ka invoice` },
      right: { title: 'Non-functional', html: `• Har request pe bahut kam latency jode (~1 ms)<br>• Limiter khud SPOF (single point of failure: wo ek hissa jo gire to sab gire) na bane<br>• 50+ servers ke beech ginti lagbhag sahi (thoda sa galat chalega, bahut galat nahi)<br>• Lakhon keys, lakhon requests/second tak scale` },
    },
    { type: 'callout', tone: 'term', title: 'Rate limiter service', html: `<strong>Ye kya hai:</strong> rate limiter ko ek <em>alag chhoti service</em> bana do. Gateway har request pe isse poochhta hai "allow?" aur ye "OK" ya "OVER_LIMIT" bolti hai. Ye khud koi business kaam nahi karti, aur ginti apne paas nahi, Redis mein rakhti hai.<br><strong>Kyun chahiye:</strong> rules aur ginti ka saara logic ek jagah. Saari services (videos, payments, search) ek hi chowkidaar use karti hain.<br><strong>Iske bina:</strong> har service ke andar limiter ki copy, har ek thoda alag, aur ek bug fix ke liye sab services dobara deploy.` },
    { type: 'callout', tone: 'why', title: 'Thoda galat chalega?', html: `Haan, aur ye design ka bada faisla hai. Agar hadd 100/s hai aur kabhi 103 nikal gayi, kisi ka nuksaan nahi. Lekin har request pe "bilkul exact" ginti ke liye har server ko har baar ek central jagah se lock lena padega: slow aur fragile. Isliye real systems <strong>approximately correct, lekin bahut fast</strong> chunte hain. Cloudflare ne apne approximation ki galti naap ke bataayi (aage dekhenge).` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Ye numbers "maan lo" wale hain, kisi company ke nahi. Inse pata chalta hai Redis kitna bada chahiye. Widget mein do naye shabd aayenge, pehle unhe samajh lo:` },
    { type: 'callout', tone: 'term', title: 'Shard aur replica (Redis ke)', html: `<strong>Ye kya hai:</strong> <em>Shard</em> = data ka ek hissa, ek alag Redis machine pe. 4 shards matlab keys 4 machines mein bati hain, har machine sirf apne hisse ki ginti rakhti hai. <em>Replica</em> = kisi shard ki ek backup copy, doosri machine pe.<br><strong>Kyun chahiye:</strong> ek Redis machine ek second mein limited kaam kar sakti hai. Traffic us se zyada ho to kaam baantna padta hai (shards). Aur machine gire to backup chahiye (replica).<br><strong>Iske bina:</strong> ek machine pe saara load, wo bhar ke slow ho jaayegi; aur gire to saari ginti gayab.` },
    { type: 'p', html: `"Lua call" ka matlab yahan bas itna hai: Redis ko ek chhota sa program bhejna jo ginti padhe, check kare aur badhaaye (detail Deep dive 2 mein). Har request ke liye har rule pe ek aisa call. Values badal ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Peak requests/second (hazaar): <strong class="rln-qv"></strong></label><input class="rln-q" type="range" min="5" max="500" step="5" value="50"></div>
          <div><label>Active keys (millions): <strong class="rln-kv"></strong></label><input class="rln-k" type="range" min="1" max="100" step="1" value="10"></div>
          <div><label>Har request pe kitne rules check: <strong class="rln-rv"></strong></label><input class="rln-r" type="range" min="1" max="4" step="1" value="2"></div>
          <div><label>Ek Redis shard kitni Lua calls/s (maan lo): <strong class="rln-sv"></strong></label><input class="rln-s" type="range" min="20" max="150" step="10" value="50"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Redis script calls/s</span><strong class="rln-ops"></strong></div>
          <div class="stat"><span>Counters ki memory</span><strong class="rln-mem"></strong></div>
          <div class="stat"><span>Primary shards chahiye</span><strong class="rln-sh"></strong></div>
          <div class="stat"><span>Replica ke saath nodes</span><strong class="rln-nodes"></strong></div>
        </div>
        <div class="calc-note rln-note"></div>`;
      const q = s => el.querySelector(s);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(Math.round(n));
      const upd = () => {
        const rps = +q('.rln-q').value * 1000, keys = +q('.rln-k').value * 1e6, rules = +q('.rln-r').value, shardCap = +q('.rln-s').value * 1000;
        q('.rln-qv').textContent = f(rps); q('.rln-kv').textContent = q('.rln-k').value + 'M'; q('.rln-rv').textContent = rules; q('.rln-sv').textContent = f(shardCap);
        const ops = rps * rules;
        const memGB = keys * rules * 100 / 1e9;
        const shards = Math.max(1, Math.ceil(ops / (shardCap * 0.6)));
        q('.rln-ops').textContent = f(ops) + '/s';
        q('.rln-mem').textContent = memGB < 1 ? (memGB * 1000).toFixed(0) + ' MB' : memGB.toFixed(1) + ' GB';
        q('.rln-sh').textContent = shards;
        q('.rln-nodes').textContent = shards * 2;
        q('.rln-note').textContent = `Har counter ~100 bytes maana (key ka naam + do numbers + Redis ka overhead). Shard ko sirf 60% tak bharne ka plan, taaki spike aur failover ke liye jagah rahe. Memory ${memGB.toFixed(1)} GB` + (memGB < 10 ? ': chhoti hai. Asli limit ops/second hai, isliye Redis ko shard karte hain, memory ki wajah se nahi.' : ': ab memory bhi dhyaan dene laayak hai, lekin shards ki ginti phir bhi ops/second se tay ho rahi hai.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default values pe: 50k requests/s × 2 rules = 100k Redis calls/s, ~2 GB memory, aur 4 primary shards (har ek pe 60% target). Conclusion: <strong>data chhota hai, traffic bada hai</strong>. Aur har request pe Redis tak ek round trip lagega (same data center mein ~0.5 se 1 ms), jo hamara latency budget kha jaata hai. Ye do baatein poore design ko chalaati hain.` },

    { type: 'h2', text: 'Step 3: API aur rules' },
    { type: 'p', html: `Do API hain. Ek <strong>andar wali</strong>: gateway limiter se poochhta hai. Ek <strong>bahar wali</strong>: client ko kya dikhta hai. Andar wali API Lyft ke ratelimit service jaisi hai: Envoy <strong>gRPC</strong> pe <code>ShouldRateLimit</code> call karta hai, jawab <code>OK</code> ya <code>OVER_LIMIT</code>. (gRPC = servers ke aapas mein baat karne ka ek tez tareeka, jisme ek server doosre ka function call karta hai jaise apna ho. Detail <a href="#/graphql-grpc">GraphQL aur gRPC</a> lesson mein.)` },
    { type: 'code', text: `
// Andar: gateway → rate limit service (gRPC). Fields simplified.
ShouldRateLimit({
  domain: "xyz_api",
  descriptors: [ { api_key: "key_abc", path: "/v1/payments" },
                 { ip: "49.36.1.7" } ]
})
→ { overall: "OVER_LIMIT",
    statuses: [ { code: "OVER_LIMIT", limit: "100/second", remaining: 0, reset_in: 1 },
                { code: "OK", limit: "1000/minute", remaining: 870 } ] }

// Bahar: client ko jo dikhta hai
HTTP/1.1 429 Too Many Requests
Retry-After: 1
{ "error": "rate_limited", "message": "Max 100 requests/second per API key" }` },
    { type: 'callout', tone: 'term', title: 'Descriptor', html: `<strong>Ye kya hai:</strong> Envoy/Lyft ki bhasha mein request pe laga ek "label": key aur value ka jodaa, jaise <code>api_key = key_abc</code> ya <code>path = /v1/payments</code>. Descriptors <strong>nested</strong> bhi ho sakte hain: "api_key X ke liye, path Y pe".<br><strong>Kyun chahiye:</strong> rule ko batana hai ki wo kis cheez ko gine. Rule kehta hai "jis request pe ye label ho, us pe ye hadd", aur ginti usi label ke naam pe hoti hai.<br><strong>Iske bina:</strong> sirf ek hi tarah ki hadd laga paate ("har request 100/s"), per user ya per endpoint alag nahi.` },
    { type: 'p', html: `Rules code mein hard-coded nahi, ek config file mein. File <strong>YAML</strong> format mein hai (YAML = settings likhne ka ek simple text format, jisme space se andar-baahar (indentation) dikhaate hain ki kaun kiske andar hai). Ye format envoyproxy/ratelimit ke README ke style mein hai (example xyz.com ka hai):` },
    { type: 'code', text: `
domain: xyz_api
descriptors:
  # Har API key: 1000 requests/minute (sab endpoints milaa ke)
  - key: api_key
    rate_limit: { unit: minute, requests_per_unit: 1000 }

  # Payments endpoint mehnga hai: har API key ko 100/second
  - key: api_key
    descriptors:
      - key: path
        value: /v1/payments
        rate_limit: { unit: second, requests_per_unit: 100 }

  # Login: har IP 10/minute (password guess karne wale bots)
  - key: path
    value: /login
    descriptors:
      - key: ip
        rate_limit: { unit: minute, requests_per_unit: 10 }

  # Naya rule: pehle sirf dekho, roko mat
  - key: user_agent
    value: old-sdk-1.2
    shadow_mode: true
    rate_limit: { unit: second, requests_per_unit: 5 }` },
    { type: 'callout', tone: 'term', title: 'Shadow mode / dark launch', html: `<strong>Ye kya hai:</strong> rule chal raha hai, ginti ho rahi hai, "ye request rok di jaati" log mein likha ja raha hai, lekin <strong>request roki nahi jaati</strong>. Lyft ke service mein ise <code>shadow_mode</code> kehte hain; Stripe ne 2017 mein ise "dark launch" kaha.<br><strong>Kyun chahiye:</strong> naye rule ki hadd sahi hai ya nahi, ye asli traffic pe dekh lo. Ek hafte ke logs se pata chalta hai kaun kaun rukta.<br><strong>Iske bina:</strong> galat hadd seedhe lag jaati, aur tumhara sabse bada customer ek subah 429 dekhta.` },
    { type: 'p', html: `Config file badalne pe service bina restart ke naye rules utha leti hai. Lyft ka service file pe nazar rakhta hai aur badalte hi nayi padh leta hai; ise <strong>hot reload</strong> kehte hain. Badi companies mein ye file Git (code rakhne ki jagah) mein rehti hai aur review ke baad hi badalti hai.` },
    { type: 'h3', text: 'Ginti kis cheez pe? User, IP, API key, endpoint' },
    { type: 'p', html: `Rule likhne se pehle sabse bada sawaal: <strong>"ek client" kise maanein?</strong> Har choice ki apni problem hai:` },
    { type: 'table', head: ['Kis pe gino', 'Kab achha', 'Problem'], rows: [
      ['API key', 'Developers ki public API (xyz.com API)', 'Ek key chori ho jaaye to chor bhi usi hadd mein; ek company ki saari teams ek key share karein to sab ek hi hadd mein'],
      ['User ID', 'Login ke baad wale kaam (post likhna, like)', 'Login se <em>pehle</em> user pata hi nahi (login page, signup)'],
      ['IP address', 'Login, signup, OTP: jab user ID abhi nahi pata', 'Ek college Wi-Fi ya mobile network ke peeche hazaaron log ek hi public IP share karte hain (NAT). IP pe kadi hadd = poora college blocked'],
      ['Endpoint (path)', 'Mehnge kaam: payments, search, file upload', 'Akela kaafi nahi; aksar API key ya IP ke saath jodo ("har key, /payments pe 100/s")'],
    ]},
    { type: 'p', html: `Isliye real systems <strong>kai rules ek saath</strong> lagaate hain, aur request tabhi aage jaati hai jab <em>saare</em> rules "OK" bolein. Neeche khud request bhej ke dekho kaunsa rule kab rokta hai:` },
    { type: 'custom', render(el) {
      // Rules playground: fixed-window counters per rule (Lyft/envoy ratelimit style). Small limits so clicks can reach them.
      const CLIENTS = [
        { id: 'riya', name: 'Riya ka app', key: 'key_abc', ip: '49.36.1.7' },
        { id: 'aman', name: 'Aman ka app (same college Wi-Fi)', key: 'key_xyz', ip: '49.36.1.7' },
        { id: 'neha', name: 'Neha ka app (ghar se)', key: 'key_neha', ip: '103.5.2.9' },
      ];
      const PATHS = ['/v1/videos', '/v1/payments', '/login'];
      const RULES = [
        { id: 'R1', label: 'har API key: 20 / minute', unit: 60, limit: 20, match: (c, p) => p !== '/login', key: (c) => 'api_key=' + c.key },
        { id: 'R2', label: 'API key + /v1/payments: 3 / second', unit: 1, limit: 3, match: (c, p) => p === '/v1/payments', key: (c) => 'api_key=' + c.key + ', path=/v1/payments' },
        { id: 'R3', label: '/login + IP: 5 / minute', unit: 60, limit: 5, match: (c, p) => p === '/login', key: (c) => 'path=/login, ip=' + c.ip },
      ];
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2)">Client aur endpoint chuno, phir request bhejo. Numbers chhote rakhe hain taaki click karke hadd tak pahunch sako. Ghadi khud aage badhao.</div>
        <div class="rr-cl" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
        <div class="rr-pa" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <button type="button" class="btn small primary rr-s1">1 request bhejo</button>
          <button type="button" class="btn small rr-s5">5 bhejo</button>
          <button type="button" class="btn small ghost rr-t1">+1 second</button>
          <button type="button" class="btn small ghost rr-t60">+1 minute</button>
          <button type="button" class="btn small ghost rr-rs">Reset</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Ghadi</span><strong class="rr-clock"></strong></div>
          <div class="stat"><span>Aakhri jawab</span><strong class="rr-last"></strong></div>
          <div class="stat"><span>Allowed / blocked</span><strong class="rr-tot"></strong></div>
        </div>
        <div class="rr-tab" style="overflow-x:auto"></div>
        <div class="calc-note rr-note"></div>`;
      const q = s => el.querySelector(s);
      let cl = CLIENTS[0], path = PATHS[0], t = 0, counters = {}, ok = 0, blocked = 0, last = null;
      const winKey = (r, cKey) => r.id + '|' + cKey + '|' + Math.floor(t / r.unit);
      const send = () => {
        const matched = RULES.filter(r => r.match(cl, path));
        const res = matched.map(r => { const k = winKey(r, r.key(cl)); counters[k] = (counters[k] || 0) + 1; return { r, n: counters[k], over: counters[k] > r.limit, retry: r.unit - (t % r.unit) }; });
        const bad = res.filter(x => x.over);
        if (bad.length) { blocked++; last = { code: 429, by: bad.map(x => x.r.id).join(' + '), retry: Math.max(...bad.map(x => x.retry)) }; }
        else { ok++; last = { code: 200 }; }
      };
      const chips = (box, list, cur, lab, set) => { box.innerHTML = ''; list.forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (x === cur ? ' on' : ''); b.textContent = lab(x); b.onclick = () => { set(x); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.rr-cl'), CLIENTS, cl, c => c.name + ' · ' + c.ip, c => { cl = c; });
        chips(q('.rr-pa'), PATHS, path, p => p, p => { path = p; });
        q('.rr-clock').textContent = 't = ' + t + 's';
        const L = q('.rr-last');
        L.textContent = !last ? '-' : last.code === 200 ? '200 OK' : '429 (' + last.by + '), Retry-After: ' + last.retry;
        L.style.color = !last ? '' : last.code === 200 ? 'var(--green)' : 'var(--red)';
        q('.rr-tot').textContent = ok + ' / ' + blocked;
        let rows = ''; const seen = new Set();
        CLIENTS.forEach(c => PATHS.forEach(p => RULES.filter(r => r.match(c, p)).forEach(r => {
          const k = winKey(r, r.key(c));
          if (seen.has(k)) return;
          const n = counters[k] || 0;
          if (!n && !(c === cl && p === path)) return;
          seen.add(k);
          rows += `<tr data-k="${k}"><td>${r.id}</td><td style="font-family:var(--f-mono);font-size:12px">${r.key(c)}</td><td>${r.label}</td><td style="color:${n > r.limit ? 'var(--red)' : 'var(--ink)'}"><strong>${n}</strong> / ${r.limit}</td></tr>`;
        })));
        q('.rr-tab').innerHTML = rows ? `<table class="table" style="width:100%;font-size:13px;margin-top:8px"><thead><tr><th>Rule</th><th>Counter kiska</th><th>Hadd</th><th>Is window mein</th></tr></thead><tbody>${rows}</tbody></table>` : '';
        q('.rr-note').textContent = last && last.code === 429 && last.by.indexOf('R3') >= 0 && cl.ip === '49.36.1.7'
          ? 'Login ki ginti IP pe hai. Riya aur Aman ek hi college Wi-Fi (ek public IP) se aate hain, isliye dono ki logins ek hi counter mein gin rahi hain. Ek ki galti se doosra bhi ruk gaya: IP limits ki yahi problem hai.'
          : last && last.code === 429 ? 'Ek bhi matching rule ki hadd paar hui, to request ruk gayi (429). Retry-After batata hai window kitne second mein khatam hogi. Ghadi aage badhao: nayi window, counter phir 0 se.'
          : 'Har request pe sirf wahi rules check hote hain jo uske labels (API key, path, IP) se match karein. Fixed window: har rule ka counter har nayi second/minute pe 0 se shuru.';
      };
      q('.rr-s1').onclick = () => { send(); draw(); };
      q('.rr-s5').onclick = () => { for (let i = 0; i < 5; i++) send(); draw(); };
      q('.rr-t1').onclick = () => { t += 1; draw(); };
      q('.rr-t60').onclick = () => { t += 60; draw(); };
      q('.rr-rs').onclick = () => { t = 0; counters = {}; ok = 0; blocked = 0; last = null; cl = CLIENTS[0]; path = PATHS[0]; draw(); };
      draw();
    }},
    { type: 'p', html: `Try karo: Riya chuno, <code>/v1/payments</code>, "5 bhejo". Pehli 3 OK, baaki 2 pe 429 (R2). "+1 second" dabao aur phir bhejo: nayi window, phir chalta hai. Ab <code>/login</code> pe Riya se 5 bhejo, phir Aman pe switch karke ek bhejo: Aman ne ek bhi galti nahi ki, phir bhi 429, kyunki dono ka IP ek hai. Isliye login jaisi jagah pe IP ki hadd dheeli rakho, aur saath mein per-account hadd (jaise "is username pe 5 galat password / 15 minute") bhi lagao.` },
    { type: 'h2', text: 'Step 4: limiter kahan baithe?' },
    { type: 'p', html: `Teen jagah ho sakti hai. Table mein do naye shabd hain: <strong>sidecar</strong> = ek chhota helper program jo har app server ke bilkul bagal mein (same machine pe) chalta hai aur uski saari requests sambhalta hai, jaise bike ke saath judi sidecar. <strong>Edge / CDN</strong> = duniya bhar mein phaile data centers jo user ke sabse paas hote hain (detail <a href="#/cdn">CDN</a> lesson mein). Har jagah ka apna daam hai:` },
    { type: 'table', head: ['Jagah', 'Kaise', 'Achha', 'Bura'], rows: [
      ['App ke andar library', 'Har API server ke code mein ek function jo Redis se baat karta hai', 'Koi extra hop nahi; business info (plan, user tier) aasaani se milti hai', 'Har language/service mein dobara likhna; bug fix = sab services deploy'],
      ['Gateway / sidecar + alag service', 'Gateway (jaise Envoy) har request pe limiter service ko poochhta hai', 'Ek jagah rules, saari services ke liye; app code saaf', 'Ek extra network hop; limiter service ko bhi scale aur monitor karna'],
      ['Edge / CDN', 'User ke sabse paas wale data center pe (Cloudflare ka tareeka)', 'Kachra traffic tumhare servers tak aata hi nahi', 'User ka business context (plan, account) wahan kam pata hota hai'],
    ]},
    { type: 'p', html: `Lyft ka design beech wala hai: Envoy proxy har request pe limiter service ko gRPC call karta hai. Stripe ne 2017 mein apne limiters ko API ke request path mein, Redis ke saath, chalaaya. xyz.com ke liye hum gateway + alag service lete hain, kyunki xyz.com ki kai services hain aur rules ek jagah chahiye. Chala ke dekho:` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'c', label: 'Client', sub: 'API key_abc', x: 80, y: 160, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ki API use karne wala kisi developer ka app. Har request ke saath apni API key bhejta hai, taaki ginti uske naam pe ho.' },
        { id: 'gw', label: 'API gateway', sub: 'Envoy jaisa', x: 250, y: 160, w: 140, kind: 'edge', info: 'Ye kya hai: xyz.com ka main gate, jisse har request guzarti hai. Yahan kyun: request se labels (descriptors: api_key, path, ip) banata hai aur limiter se poochhta hai. Jawab OVER_LIMIT ho to wahin 429 de deta hai, API servers tak request jaati hi nahi.' },
        { id: 'rl', label: 'Rate limit svc', sub: 'stateless', x: 450, y: 60, w: 160, kind: 'server', info: 'Ye kya hai: chhoti service jo bas "allow ya nahi" ka jawab deti hai. Stateless (apne paas koi ginti yaad nahi rakhti), isliye iski kai copies Load Balancer ke peeche chal sakti hain; ek gire to doosri sambhal le. Rules memory mein, ginti Redis mein.' },
        { id: 'rd', label: 'Redis', sub: 'counters', x: 640, y: 60, w: 130, kind: 'cache', info: 'Ye kya hai: RAM mein data rakhne wala tez database. Yahan kyun: saare limiters ki shared ginti yahin hai. Har (rule, key, window) ka ek counter. Lua script se padhna + check + badhana ek hi atomic step mein. Data chhota hai, isliye memory mein rakhna sasta.' },
        { id: 'cfg', label: 'Rules config', sub: 'YAML, reviewed', x: 640, y: 160, w: 130, kind: 'data', info: 'Ye kya hai: rules ki YAML file (kis label pe kitni hadd). Yahan kyun: rules code se alag rahein. Badalne pe limiter bina restart ke naye rules le leta hai (hot reload). Git mein, review ke baad.' },
        { id: 'api', label: 'API servers', sub: 'asli kaam', x: 450, y: 260, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ke asli kaam wale servers (payments, videos). Rate limiter ki wajah se inpe sirf utna traffic aata hai jitna inhe sambhalna hai.' },
      ],
      edges: [{ a: 'c', b: 'gw' }, { a: 'gw', b: 'rl' }, { a: 'rl', b: 'rd' }, { a: 'rl', b: 'cfg', dashed: true }, { a: 'gw', b: 'api' }],
      scenarios: [
        { name: 'Allowed', steps: [
          { title: 'Request aayi', go: 'c>gw', text: 'Client ne payment API call ki.', msg: 'POST /v1/payments   Authorization: key_abc' },
          { title: 'Gateway poochhta hai', go: 'gw>rl', text: 'Gateway ne descriptors banaye aur limiter se poochha. Ye call ~1 ms ki honi chahiye, isliye limiter same data center mein.', msg: 'ShouldRateLimit(api_key=key_abc, path=/v1/payments)' },
          { title: 'Ek atomic Lua call', go: ['rl>rd', 'res:rd>rl'], text: 'Limiter ne rule dhoondha (100/second) aur Redis mein ek chhota program (Lua script) chalaaya: tokens bharo, ek token kaato, bache hue lautao. Sab ek hi step mein. (EVALSHA = pehle se Redis mein rakhi script ko uske naam-number se chalane ka command; detail Deep dive 2 mein.)', msg: 'EVALSHA <sha> 1 rl:{key_abc}:payments 100 100 1   →  [1, 57]' },
          { title: 'OK', go: 'res:rl>gw', text: '57 tokens bache hain. Allow.', msg: 'OK  remaining=57' },
          { title: 'Asli kaam', go: ['gw>api', 'res:api>gw', 'res:gw>c'], text: 'Request API servers tak gayi aur jawab wapas aaya. Limiter ne bas ~1 ms joda.' },
        ]},
        { name: 'Hadd paar: 429', steps: [
          { title: 'Script bug: loop mein requests', go: 'c>gw', text: 'Client ke code mein bug, ek loop har second 500 requests bhej raha hai.', set: { c: { state: 'hot', sub: '500 req/s' } } },
          { title: 'Bucket khaali', go: ['gw>rl', 'rl>rd', 'res:rd>rl'], text: 'Redis ne bataya: 0 tokens. Ye request allow nahi.', after: { rd: { state: 'warn', sub: 'tokens = 0' } }, msg: '→ [0, 0]' },
          { title: '429, API servers bache', go: ['bad:rl>gw', 'bad:gw>c'], set: { api: { state: 'dim' } }, text: 'Gateway ne wahin 429 lauta diya. API servers ko pata bhi nahi chala. Stripe ke mutabik unka request rate limiter sabse zyada isi tarah ke bhaage hue scripts ko rokta tha.', msg: '429 Too Many Requests\nRetry-After: 1' },
        ]},
        { name: 'Bot: local cache', intro: 'Ek bot 10,000 requests/s bhej raha hai. Har request pe Redis ko poochhna bhi mehnga hai.', steps: [
          { title: 'Pehli baar Redis se', go: ['c>gw', 'gw>rl', 'rl>rd', 'res:rd>rl'], set: { c: { state: 'hot', sub: 'bot, 10k/s' } }, text: 'Redis ne bataya: over limit, aur window 1 second mein reset hogi.', msg: '→ OVER_LIMIT, reset_in = 1s' },
          { title: 'Limiter yaad rakh leta hai', focus: ['rl'], after: { rl: { state: 'hit', sub: 'local: key over' } }, text: 'Limiter apni memory mein note karta hai: "key_bot window khatam hone tak over hai". Lyft ke service mein over-limit keys ka ek optional local cache hai; Cloudflare har server pe "is source ko roko" ka flag local cache karta hai.' },
          { title: 'Baaki requests Redis tak nahi', flood: { paths: ['c>gw>rl', 'bad:rl>gw>c'], n: 6 }, set: { rd: { state: 'dim' } }, text: 'Agle hazaaron requests ka jawab memory se: Redis pe zero load. Bot ka attack hamari ginti wali machine ko nahi gira paata.' },
        ]},
        { name: 'Rule badla', steps: [
          { title: 'Naya rule, shadow mode', go: 'evt:cfg>rl', after: { cfg: { state: 'ok', sub: 'v42 deployed' } }, text: 'Team ne naya rule joda shadow mode mein. Limiter ne file badalte hi naya config utha liya, restart nahi.', msg: 'user_agent=old-sdk-1.2 → 5/s   shadow_mode: true' },
          { title: 'Ginti hoti hai, roka nahi jaata', go: ['c>gw', 'gw>rl', 'rl>rd', 'res:rd>rl', 'res:rl>gw', 'gw>api'], text: 'Rule ke hisaab se request over limit thi, lekin shadow mode mein sirf log hua. Request aage gayi. Ek hafte ke logs dekh ke team tay karegi ki hadd sahi hai ya nahi.', msg: 'log: WOULD_LIMIT key_abc user_agent=old-sdk-1.2' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "limiter = Redis"', html: `Redis sirf ginti rakhta hai. Rules padhna, request ko descriptors mein todna, sahi counter chunna, 429 aur headers banana, local cache, shadow mode, metrics: ye sab limiter service (ya library) ka kaam hai. Interview mein "Redis laga do" bolna aadha jawab hai.` },
    { type: 'h2', text: 'Deep dive 1: kaunsa algorithm?' },
    { type: 'p', html: `Algorithms ki andar ki kahani <a href="#/rate-limiting">Rate limiting</a> lesson mein hai. Yahan sawaal sirf ye: <strong>service ke liye kaunsa</strong>? Teeno real systems ne alag chuna, aur teeno ki wajah samajhne laayak hai:` },
    { type: 'table', head: ['', 'Stripe (2017)', 'Cloudflare (2017)', 'Lyft / envoyproxy ratelimit'], rows: [
      ['Algorithm', 'Token bucket', 'Sliding window counter (approximation)', 'Fixed window counter'],
      ['Har key pe state', '2 numbers: tokens, last refill time', '2 numbers: pichhli window ki ginti, abhi ki ginti', '1 counter per window'],
      ['Burst', 'Bucket size tak burst allowed (jaan-boojh ke)', 'Smooth; window ke kinaare pe double burst nahi', 'Window ke kinaare pe 2× burst possible'],
      ['Kyun chuna', 'API clients ko thoda burst chahiye, average control mein rahe', 'Lakhon domains, bahut kam memory, kam memcache (memcached: Redis jaisa RAM wala cache) operations', 'Simple, sasta; Redis mein ek INCR (ginti +1) + EXPIRE (time ke baad key mita do)'],
    ]},
    { type: 'p', html: `Cloudflare ka trick dekhne laayak hai. Poori sliding window ke liye har request ka time yaad rakhna padta (mehnga). Unhone sirf do counters rakhe: pichhla minute aur abhi ka minute. Phir maana ki pichhle minute ki requests poore minute mein barabar faili thi, aur andaza lagaya:` },
    { type: 'code', text: `rate ≈ pichhli_ginti × (window mein se kitna hissa abhi bhi "sliding window" ke andar hai) + abhi_ki_ginti

Cloudflare ka example (hadd 50/minute):
pichhle minute 42, is minute ab tak 18, minute shuru hue 15 second hue
rate ≈ 42 × (45/60) + 18 = 31.5 + 18 = 49.5   → abhi allow (50 se kam)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Hadd (requests/minute): <strong class="rsw-lv"></strong></label><input class="rsw-l" type="range" min="10" max="200" step="5" value="50"></div>
          <div><label>Pichhle minute ki ginti: <strong class="rsw-pv"></strong></label><input class="rsw-p" type="range" min="0" max="200" step="1" value="42"></div>
          <div><label>Is minute ab tak: <strong class="rsw-cv"></strong></label><input class="rsw-c" type="range" min="0" max="200" step="1" value="18"></div>
          <div><label>Minute shuru hue kitne second: <strong class="rsw-tv"></strong></label><input class="rsw-t" type="range" min="0" max="59" step="1" value="15"></div>
        </div>
        <svg class="rsw-svg" viewBox="0 0 320 70" style="width:100%;max-width:520px;height:auto;margin-top:10px" role="img" aria-label="Pichhli aur abhi ki window, sliding window ka hissa"></svg>
        <div class="stats">
          <div class="stat"><span>Pichhli window ka hissa</span><strong class="rsw-w"></strong></div>
          <div class="stat"><span>Andazan rate</span><strong class="rsw-r"></strong></div>
          <div class="stat"><span>Fixed window kya kehta</span><strong class="rsw-f"></strong></div>
          <div class="stat"><span>Sliding window faisla</span><strong class="rsw-d"></strong></div>
        </div>
        <div class="calc-note rsw-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const L = +q('.rsw-l').value, P = +q('.rsw-p').value, C = +q('.rsw-c').value, t = +q('.rsw-t').value;
        q('.rsw-lv').textContent = L; q('.rsw-pv').textContent = P; q('.rsw-cv').textContent = C; q('.rsw-tv').textContent = t + 's';
        const w = (60 - t) / 60, rate = P * w + C;
        q('.rsw-w').textContent = (60 - t) + '/60';
        q('.rsw-r').textContent = (Math.round(rate * 10) / 10).toString();
        q('.rsw-f').textContent = C < L ? 'allow (' + C + ' < ' + L + ')' : 'block';
        const ok = rate < L;
        const d = q('.rsw-d'); d.textContent = ok ? 'allow' : 'block (429)'; d.style.color = ok ? 'var(--green)' : 'var(--red)';
        const x0 = 10, ww = 150, sx = x0 + ww * t / 60;
        q('.rsw-svg').innerHTML = `<rect x="${x0}" y="20" width="${ww}" height="26" rx="4" fill="var(--surface-2)" stroke="var(--line-2)"/>
          <rect x="${x0 + ww}" y="20" width="${ww}" height="26" rx="4" fill="var(--surface-2)" stroke="var(--line-2)"/>
          <rect x="${sx}" y="16" width="${ww}" height="34" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" opacity="0.85"/>
          <text x="${x0 + ww / 2}" y="64" text-anchor="middle" font-size="10" fill="var(--ink-2)" font-family="var(--f-mono)">pichhla min: ${P}</text>
          <text x="${x0 + ww * 1.5}" y="64" text-anchor="middle" font-size="10" fill="var(--ink-2)" font-family="var(--f-mono)">abhi: ${C}</text>
          <text x="${sx + ww / 2}" y="12" text-anchor="middle" font-size="10" fill="var(--accent-ink)" font-family="var(--f-mono)">sliding window (60s)</text>`;
        q('.rsw-note').textContent = `${P} × ${(60 - t)}/60 + ${C} = ${(Math.round(rate * 10) / 10)}. ` + (C < L && !ok ? 'Fixed window yahan allow kar deta, kyunki naya minute "saaf" shuru hua. Sliding window yaad rakhta hai ki pichhle 60 second mein asal mein kitna traffic aaya. ' : '') + 'Sirf do numbers per key: isliye ye lakhon keys tak sasta hai.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `"Andaza" kitna galat hai? Cloudflare ne 2017 mein 270,000 sources ki 40 crore (400 million) requests pe naapa: sirf <strong>0.003%</strong> requests galat allow ya galat block hui, aur andazan rate asli rate se average ~6% door tha. Itni galti ke badle har key pe bas do numbers. Ye wahi "approximately correct, bahut sasta" wala trade-off hai.` },
    { type: 'callout', tone: 'tip', title: 'Interview default', html: `Public API ke liye <strong>token bucket</strong> bolo (burst allow, average control, do numbers per key). Agar interviewer "window ke kinaare pe double burst" ki baat kare to sliding window counter. Fixed window tab, jab simplicity sabse zaroori ho aur thoda burst chalta ho.` },
    { type: 'h2', text: 'Deep dive 2: Redis + Lua, sahi tareeke se' },
    { type: 'p', html: `Pehle problem. Do gateways ek hi pal mein ek hi counter padhte hain: dono ko 99 dikhta hai (hadd 100). Dono sochte hain "abhi jagah hai", dono allow karte hain, dono 100 likhte hain. Asal mein 101 requests nikal gayi. Ise <strong>race condition</strong> kehte hain (do log ek hi cheez pe daud rahe hain, aur jo baad mein likhta hai wo pehle wale ka kaam mita deta hai). Ye <a href="#/rate-limiting">Rate limiting</a> lesson mein chala ke dekha tha.` },
    { type: 'callout', tone: 'term', title: 'Atomic operation aur Lua script', html: `<strong>Ye kya hai:</strong> <em>Atomic</em> = kai chhote kaam jo ek hi jhatke mein hote hain; beech mein koi aur ghus nahi sakta. <em>Lua</em> ek chhoti programming language hai jo Redis ke andar chal sakti hai. Hum "padho, check karo, likho" ek Lua script mein likh ke Redis ko bhejte hain. Redis docs ke mutabik jab tak script chal rahi hai, Redis koi doosra command nahi chalata.<br><strong>Kyun chahiye:</strong> race condition khatam. 50 gateways ek saath bhi poochhein, Redis unhe ek ek karke, poori script ke saath, chalayega.<br><strong>Iske bina:</strong> alag alag GET aur SET ke beech doosre gateway ka kaam ghus jaata hai, aur hadd se zyada requests nikal jaati hain.` },
    { type: 'p', html: `Ye rahi token bucket ki poori script. Comments padh ke chalo; har line ek chhota kaam hai:` },
    { type: 'code', text: `
-- KEYS[1] = "rl:{key_abc}:payments"      (counter ka naam)
-- ARGV[1] = rate  (tokens per second)   ARGV[2] = capacity (burst)   ARGV[3] = cost
local rate, cap, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])

local t   = redis.call('TIME')                 -- Redis ki apni ghadi, gateways ki nahi
local now = tonumber(t[1]) + tonumber(t[2]) / 1000000

local b      = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or cap           -- pehli baar: bucket bhara hua
local ts     = tonumber(b[2]) or now

tokens = math.min(cap, tokens + (now - ts) * rate)   -- beete time ke tokens jodo
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(cap / rate) + 1)  -- bekaar key khud mit jaaye
return { allowed, math.floor(tokens) }` },
    { type: 'list', items: [
      `<strong>EVALSHA, EVAL nahi:</strong> script ek baar <code>SCRIPT LOAD</code> karo, phir har request pe sirf uska SHA1 (script ka ek chhota fingerprint, jaise uska ID number) bhejo. Redis docs warn karte hain ki script cache volatile hai: restart ya failover ke baad script gayab ho sakti hai, to client ko <code>NOSCRIPT</code> error pe dobara load karna aana chahiye (zyaadatar Redis libraries ye khud karti hain).`,
      `<strong>Ghadi Redis ki:</strong> 50 gateways ki ghadiyan thodi alag hoti hain (clock skew). Agar har gateway apna "now" bheje, bucket galat bharega. <code>TIME</code> Redis ke andar padhne se sab ek hi ghadi dekhte hain. (Redis 5 se scripts ka "effects replication" default hai: replica pe script dobara nahi chalti, sirf uska nateeja (kya likha gaya) bheja jaata hai. Isliye script mein TIME use karke likhna safe hai.)`,
      `<strong>EXPIRE zaroori:</strong> lakhon API keys mein se zyaadatar thodi der baad chup ho jaati hain. TTL (time to live: kitni der baad key apne aap mit jaaye) na lagao to Redis bekaar counters se bhar jaayega.`,
      `<strong>Script chhoti rakho:</strong> jab tak script chal rahi hai, poora Redis ruka hai. Ye script kuch microseconds ki hai; isme loop ya bada kaam daala to har client slow.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Hash tag (Redis Cluster)', html: `<strong>Ye kya hai:</strong> <em>Redis Cluster</em> = Redis ka wo setup jo keys ko apne aap shards mein baant deta hai. Wo keys ko 16,384 "slots" (khaane) mein daalta hai, aur har shard kuch slots ka maalik hota hai. Key ka slot uske naam ke hash se tay hota hai. <em>Hash tag</em> = key ke naam mein <code>{...}</code> ke andar wala hissa; sirf wahi hash hota hai. Jaise <code>rl:{key_abc}:payments</code> aur <code>rl:{key_abc}:minute</code> dono ka slot sirf <code>key_abc</code> se tay hoga.<br><strong>Kyun chahiye:</strong> ek script ki saari keys <strong>ek hi slot</strong> mein honi chahiye (Redis docs: script jo keys chhuye, wo KEYS mein naam se di jaayein). Hash tag se ek API key ke saare counters ek hi shard pe aate hain, aur ek script dono rules ek saath check kar sakti hai.<br><strong>Iske bina:</strong> do counters alag shards pe ho sakte hain, aur script error deti hai (CROSSSLOT).` },

    { type: 'h3', text: 'GitHub ne Redis pe jaate waqt kya seekha (2021)' },
    { type: 'p', html: `GitHub ki 2021 ki engineering post (kuch saal purani) ek achha real example hai. Pehle unka API rate limiter memcached (ek RAM wala cache) pe tha. Do dikkatein aayi: (1) memcached ek shared cache tha. Bhar jaane pe wo jagah banane ke liye purani keys nikaal deta hai (ise <strong>evict</strong> karna kehte hain), aur kabhi kabhi rate limit ki keys hi nikal jaati. Client ko achanak "nayi, khaali" window mil jaati. (2) Wo data centers ke hisaab se alag caches ki taraf ja rahe the, aur alag data centers pe jaane wala client alag ginti dekhta. Unhone ek <strong>alag, sharded Redis</strong> lagaya: application khud key dekh ke shard chunti hai (client-side sharding), har shard ka ek primary (yahan writes) aur replicas (yahan se reads), aur logic Lua scripts mein.` },
    { type: 'p', html: `Do bugs jo unhone publicly bataye, aur dono interview-laayak hain:` },
    { type: 'list', items: [
      `<strong>Hilta hua reset time:</strong> <code>X-RateLimit-Reset</code> header har request pe kuch second aage peeche ho raha tha, kyunki wo Redis ke TTL aur app server ki ghadi ko mila ke nikaala jaa raha tha. Fix: reset ka time seedha Redis mein store karo, andaza mat lagao.`,
      `<strong>Reject hui request pe "remaining: 5000":</strong> replica pe purana data padha gaya (replication lag), jab primary pe window khatam ho chuki thi. Fix: window ka expiry time khud store karo aur script mein khud check karo, Redis ke apne expiry ke bharose mat raho; aur Redis ki expiry window khatam hone ke thoda baad rakho.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "Redis replica se ginti padh lo, load kam hoga"', html: `Rate limiting mein "padhna aur likhna" ek hi kaam hai (har request ginti badhati hai). Replica thoda peeche hota hai, to replica se padha number galat ho sakta hai, jaisa GitHub ke saath hua. Faisla primary pe, ek atomic script mein. Replicas sirf failover ke liye, ya sirf "headers dikhane" jaise kaam ke liye jahan thoda purana chalega.` },
    { type: 'h2', text: 'Deep dive 3: har request pe latency mat jodo' },
    { type: 'p', html: `Napkin maths ne bataya tha: har request pe Redis tak ek round trip. 100k requests/s pe ye Redis ka sabse bada kaam bhi hai. Real systems ye chaar tricks lagaate hain:` },
    { type: 'steps', items: [
      { t: 'Over-limit keys ka local cache', d: 'Jo key abhi over limit hai, uska jawab window khatam hone tak memory se do. Bot jitni bhi requests bheje, Redis tak ek hi baar. Lyft ke service mein ye optional local cache hai; Cloudflare har server pe "is source ko roko" flag cache karta hai.' },
      { t: 'Ginti async badhao', d: 'Cloudflare ne 2017 mein likha ki counter badhane ka kaam request ke saath intezaar nahi karta: request turant aage, increment background mein. Keemat: kuch requests hadd ke upar nikal sakti hain. Unke liye ye sasta sauda tha.' },
      { t: 'Do stage: pehle local, phir global', d: 'Envoy docs suggest karte hain ki har proxy ka apna local token bucket bade bursts ko pehle hi sokh le, taaki global rate limit service tak sirf bacha hua traffic jaaye. Local = mota filter, global = sahi ginti.' },
      { t: 'Pipelining aur batch', d: 'Lyft ka service Redis commands ko chhoti si time window mein jama karke ek saath bhej sakta hai (pipelining, neeche samjhaaya hai), aur per-second limits ke liye alag Redis bhi rakh sakta hai, kyunki un keys ki churn (har second nayi keys banna aur purani mitna) bahut zyada hoti hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Pipelining', html: `<strong>Ye kya hai:</strong> normally Redis ko ek command bhejo, jawab ka wait karo, phir agla: har command pe ek network round trip (jaana + aana). <strong>Pipelining</strong> mein kai commands ek saath bhej do aur saare jawab ek saath lo.<br><strong>Kyun chahiye:</strong> round trips kam, ek second mein zyada kaam (throughput zyada).<br><strong>Iske bina:</strong> 100 commands = 100 baar network ka intezaar.<br><strong>Dhyaan:</strong> pipeline ke commands ke beech doosre clients ke commands aa sakte hain. Atomic kaam ke liye phir bhi Lua script.` },

    { type: 'h2', text: 'Deep dive 4: Redis gir gaya. Ab?' },
    { type: 'p', html: `Ye is design ka sabse important sawaal hai. Limiter har request ke raaste mein hai. Agar Redis (ya limiter service) jawab na de, to gateway ke paas do hi raaste hain:` },
    { type: 'callout', tone: 'term', title: 'Fail-open vs fail-closed', html: `<strong>Ye kya hai:</strong> limiter khud kharab ho jaaye to gateway kya kare, uski policy. <em>Fail-open</em> = jawab nahi aaya to request <em>allow</em> kar do (darwaza khula chhod do). <em>Fail-closed</em> = jawab nahi aaya to request <em>reject</em> kar do (darwaza band).<br><strong>Kyun chahiye:</strong> limiter har request ke raaste mein hai. Uske gire hone pe kya hoga, ye pehle se tay hona chahiye, warna har request latki rahegi.<br><strong>Iske bina (yaani bina soche):</strong> gateway limiter ke jawab ka intezaar karta rahega, aur ek chhote helper ki outage poori site ko rok degi.<br><strong>Keemat:</strong> fail-open mein site chalti hai lekin kuch der koi ginti nahi; fail-closed mein safety rehti hai lekin limiter ki problem poori site ki problem ban jaati hai.` },
    { type: 'p', html: `Stripe ki 2017 ki salah saaf thi: har level pe exceptions pakdo taaki limiter ka koi bhi bug ya outage <strong>fail open</strong> ho aur API chalti rahe. Envoy mein bhi default yahi hai: <code>failure_mode_deny</code> ka default <code>false</code> hai, yaani limiter se error aaye to request allow, aur ek counter (<code>failure_mode_allowed</code>) badh jaata hai taaki tumhe pata chale. <code>true</code> karo to error pe 500 milta hai. Chala ke dekho:` },
    { type: 'flow', height: 330, title: 'Redis down: teen policies',
      nodes: [
        { id: 'u', label: 'Normal user', sub: '5 req/s', x: 80, y: 90, w: 130, kind: 'client', info: 'Ye kya hai: ek seedha-saadha client (jaise kisi ka app), jo apni hadd ke andar requests bhejta hai. Hum chahte hain ise kabhi pareshani na ho.' },
        { id: 'bot', label: 'Bot', sub: '20,000 req/s', x: 80, y: 250, w: 130, kind: 'threat', info: 'Ye kya hai: ek scraper/bot (program jo apne aap bahut saari requests bhejta hai), hadd se 200 guna zyada. Normal din pe limiter ise 100 req/s pe rok deta hai.' },
        { id: 'gw', label: 'API gateway', sub: 'timeout 5 ms', x: 280, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: xyz.com ka main gate. Yahan kyun: limiter ki call pe chhota sa timeout (maan lo 5 ms) lagata hai. Limiter ka jawab na aaye to request ko latka ke nahi rakhta; policy (fail-open ya fail-closed) ke hisaab se faisla karta hai.' },
        { id: 'rl', label: 'Limiter svc', x: 490, y: 60, w: 140, kind: 'server', info: 'Ye kya hai: rate limit service, jo allow/deny bolti hai. Is scenario mein khud zinda hai, lekin Redis ke bina ginti nahi kar sakti.' },
        { id: 'rd', label: 'Redis', sub: 'counters', x: 650, y: 170, w: 110, kind: 'cache', info: 'Ye kya hai: shared counters wala Redis. Is scenario mein ye down hai (failover chal raha hai, yaani backup ko primary banaya ja raha hai, ya network toota).' },
        { id: 'api', label: 'API servers', sub: 'capacity 10k/s', x: 490, y: 280, w: 150, kind: 'server', meter: true, load: 40, info: 'Ye kya hai: xyz.com ke asli kaam wale servers. Ye maximum ~10,000 requests/s sambhal sakte hain (maan lo). Isse zyada aaya to sab slow, phir timeouts.' },
      ],
      edges: [{ a: 'u', b: 'gw' }, { a: 'bot', b: 'gw' }, { a: 'gw', b: 'rl' }, { a: 'rl', b: 'rd' }, { a: 'gw', b: 'api' }],
      scenarios: [
        { name: 'Fail-open', steps: [
          { title: 'Redis down', set: { rd: { state: 'down', sub: 'DOWN' } }, go: ['u>gw', 'gw>rl', 'bad:rl>gw'], text: 'Limiter Redis tak nahi pahunch paaya, error lautaya. Gateway ne 5 ms se zyada wait nahi kiya.', msg: 'ShouldRateLimit → error: redis connection refused' },
          { title: 'Policy: allow', go: ['gw>api', 'res:api>gw', 'res:gw>u'], text: 'Fail-open: normal user ki request bina rukawat chali gayi. Site chal rahi hai. Metric "failure_mode_allowed" badh raha hai, on-call ko alert gaya.', msg: 'allowed (limiter unavailable)' },
          { title: 'Lekin bot bhi khula', flood: { paths: ['bot>gw>api'], n: 10 }, after: { api: { state: 'hot', load: 95, sub: 'overloaded' } }, text: 'Bot ke 20,000 req/s bhi seedhe API servers pe. Agar Redis lamba down raha aur bot active hai, to API servers overload. Fail-open ka khatra yahi hai: chhoti outage ke liye theek, lambi ke liye nahi.' },
        ]},
        { name: 'Fail-closed', steps: [
          { title: 'Redis down', set: { rd: { state: 'down', sub: 'DOWN' } }, go: ['u>gw', 'gw>rl', 'bad:rl>gw'], text: 'Wahi situation.' },
          { title: 'Policy: reject', go: 'bad:gw>u', set: { api: { state: 'dim', load: 0 } }, text: 'Fail-closed: normal user ko bhi error. Bot bhi ruka, lekin saath mein poori site ruk gayi. Ginti wala ek chhota helper system poore product ka SPOF ban gaya.', msg: '500 / 503  (limiter unavailable)' },
          { title: 'Kahan sahi hai?', focus: ['gw'], text: 'Kuch endpoints pe ye sahi faisla hai: login, OTP bhejna, password reset, paise bhejna. Wahan "bina ginti ke chhod dena" matlab brute-force ya SMS bill ka dhamaka. Isliye policy <strong>har rule ki alag</strong> ho sakti hai.' },
        ]},
        { name: 'Hybrid: local fallback', steps: [
          { title: 'Redis down', set: { rd: { state: 'down', sub: 'DOWN' } }, go: ['u>gw', 'gw>rl', 'bad:rl>gw'], text: 'Wahi situation.' },
          { title: 'Gateway apna local bucket use karta hai', after: { gw: { state: 'warn', sub: 'local limits' } }, go: ['gw>api', 'res:api>gw', 'res:gw>u'], text: 'Har gateway ke paas memory mein ek mota local limit hai (jaise global hadd ÷ gateways ki ginti). Normal user ko farak nahi pada.' },
          { title: 'Bot phir bhi lagbhag ruka', flood: { paths: ['bot>gw', 'bad:gw>bot'], n: 8 }, after: { api: { state: 'ok', load: 45 } }, text: 'Bot ke zyaadatar requests local bucket ne rok diye. Ginti exact nahi (traffic gateways mein barabar na bata ho to thoda zyada ya kam), lekin site bhi chali aur bot bhi ruka. Redis wapas aate hi normal global limiting.' },
        ]},
      ],
    },
    { type: 'h3', text: 'Simulator: Redis down hai, bot aaya hua hai' },
    { type: 'p', html: `Numbers ke saath feel karo. Bot ki hadd 100 req/s per client hai. Local fallback mein har gateway apne paas wahi 100/s ka mota bucket rakhta hai (simple config), isliye bot ko max "gateways × 100" mil sakta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rfm-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Normal traffic (req/s): <strong class="rfm-lv"></strong></label><input class="rfm-l" type="range" min="1000" max="15000" step="500" value="8000"></div>
          <div><label>Bot traffic (req/s): <strong class="rfm-bv"></strong></label><input class="rfm-b" type="range" min="0" max="50000" step="1000" value="20000"></div>
          <div><label>Gateways: <strong class="rfm-gv"></strong></label><input class="rfm-g" type="range" min="2" max="50" step="1" value="10"></div>
          <div><label>API capacity (req/s): <strong class="rfm-cv"></strong></label><input class="rfm-c" type="range" min="5000" max="30000" step="1000" value="10000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Bot ki requests jo andar gayi</span><strong class="rfm-bp"></strong></div>
          <div class="stat"><span>API servers pe load</span><strong class="rfm-ld"></strong></div>
          <div class="stat"><span>Normal users ko jawab mila</span><strong class="rfm-ok"></strong></div>
        </div>
        <div class="calc-note rfm-note"></div>`;
      const q = s => el.querySelector(s);
      const MODES = [['normal', 'Redis up (normal)'], ['open', 'Redis down: fail-open'], ['closed', 'Redis down: fail-closed'], ['local', 'Redis down: local fallback']];
      const LIMIT = 100;
      let mode = 'open';
      const fmt = n => n.toLocaleString('en-IN');
      const calc = (m, L, B, G, C) => {
        let bot, legitPct;
        if (m === 'normal') bot = Math.min(B, LIMIT);
        else if (m === 'open') bot = B;
        else if (m === 'closed') bot = 0;
        else bot = Math.min(B, G * LIMIT);
        const load = m === 'closed' ? 0 : L + bot;
        legitPct = m === 'closed' ? 0 : load <= C ? 100 : C / load * 100;
        return { bot, load, legitPct };
      };
      const upd = () => {
        const L = +q('.rfm-l').value, B = +q('.rfm-b').value, G = +q('.rfm-g').value, C = +q('.rfm-c').value;
        q('.rfm-lv').textContent = fmt(L); q('.rfm-bv').textContent = fmt(B); q('.rfm-gv').textContent = G; q('.rfm-cv').textContent = fmt(C);
        const chips = q('.rfm-chips'); chips.innerHTML = '';
        MODES.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = k; upd(); }; chips.appendChild(b); });
        const r = calc(mode, L, B, G, C);
        q('.rfm-bp').textContent = fmt(r.bot) + '/s';
        const ld = q('.rfm-ld'); ld.textContent = (r.load / C * 100).toFixed(0) + '%'; ld.style.color = r.load > C ? 'var(--red)' : 'var(--green)';
        const ok = q('.rfm-ok'); ok.textContent = r.legitPct.toFixed(1) + '%'; ok.style.color = r.legitPct >= 99.9 ? 'var(--green)' : r.legitPct > 0 ? 'var(--amber)' : 'var(--red)';
        const notes = {
          normal: 'Normal din: bot 100/s pe ruka, API servers aaram se.',
          open: r.load > C ? 'Fail-open: site "khuli" hai, lekin bot ka poora traffic andar aaya aur API servers capacity se upar. Overload mein sabki requests slow/fail hoti hain, to normal users ko bhi sirf ' + r.legitPct.toFixed(1) + '% jawab mile (maan ke chalo ki overload mein capacity sab mein barabar bant-ti hai).' : 'Fail-open: bot ka traffic andar aaya, lekin capacity abhi kaafi hai. Chhoti outage ke liye fail-open bilkul theek hai.',
          closed: 'Fail-closed: bot ruka, lekin normal users ko bhi 0%. Limiter ki outage = poori API ki outage.',
          local: 'Local fallback: har gateway ka 100/s ka mota bucket, to bot ' + fmt(r.bot) + '/s tak nikal paaya (' + G + ' × 100). Exact nahi, lekin site bhi chali aur bot bhi lagbhag ruka.',
        };
        q('.rfm-note').textContent = notes[mode];
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default numbers pe: fail-open mein API pe 280% load aur normal users ko sirf ~36% jawab; fail-closed mein 0%; local fallback mein bot sirf 1,000/s nikal paata hai aur normal users ko 100%. Isliye mature setups mein <strong>default fail-open + local fallback</strong>, aur sirf kuch sensitive endpoints (login, OTP, payouts) pe fail-closed.` },
    { type: 'callout', tone: 'warn', title: 'Kill switch', html: `Stripe ne ek aur baat kahi thi: har limiter ke liye feature flag (ek on/off setting jo bina code deploy ke badli ja sake) rakho taaki galti se bahut zyada log rukne lagein to ek click mein limiter band ho sake. Aur dashboards/alerts: kitni requests kis rule se ruk rahi hain. Achanak spike = ya to attack, ya tumhara naya rule galat hai.` },
    { type: 'h2', text: 'Deep dive 5: kai regions' },
    { type: 'p', html: `xyz.com ab Mumbai aur Virginia (US), do <strong>regions</strong> mein chalta hai (region = ek shehar/ilaake mein data centers ka group). Ek API key dono jagah se requests bhej sakti hai. Ginti kahan rakhein? Flow mein do naye shabd aayenge:` },
    { type: 'callout', tone: 'term', title: 'PoP aur anycast', html: `<strong>Ye kya hai:</strong> <em>PoP</em> (point of presence) = CDN ka ek data center kisi shehar mein; Cloudflare ke duniya bhar mein bahut saare hain. <em>Anycast</em> = duniya bhar ke saare PoPs ek hi IP address bolte hain, aur internet ki routing user ko apne aap sabse paas wale PoP pe bhej deti hai.<br><strong>Kyun chahiye (yahan):</strong> ek jagah se aane wala traffic aam taur pe hamesha usi PoP pe pahunchta hai. To ek attacker ki saari ginti ek hi PoP mein hoti hai, aur global counter ki zaroorat kam padti hai.<br><strong>Iske bina:</strong> ek user ki requests kai data centers mein bikhar jaati, aur har data center ko baaki se ginti poochhni padti.` },
    { type: 'p', html: `Teen options, teeno chala ke dekho:` },
    { type: 'flow', height: 300, title: 'Do regions, ek API key',
      nodes: [
        { id: 'cin', label: 'Client', sub: 'India se', x: 80, y: 80, w: 120, kind: 'client', info: 'Ye kya hai: ek customer ka app jo India mein chalta hai. Is API key ka traffic Mumbai region pe aata hai.' },
        { id: 'cus', label: 'Client', sub: 'US se, same key', x: 80, y: 230, w: 130, kind: 'client', info: 'Ye kya hai: same customer, same API key, lekin requests US ke servers se (customer ke US mein bhi servers hain). Ye Virginia region pe aati hain.' },
        { id: 'la', label: 'Mumbai limiter', x: 310, y: 80, w: 160, kind: 'server', info: 'Ye kya hai: Mumbai region ki apni rate limit service. Mumbai aane wali requests ka faisla yahin hota hai.' },
        { id: 'lb', label: 'Virginia limiter', x: 310, y: 230, w: 160, kind: 'server', info: 'Ye kya hai: Virginia (US) region ki apni rate limit service. US wali requests ka faisla yahin hota hai.' },
        { id: 'ra', label: 'Redis Mumbai', x: 570, y: 80, w: 150, kind: 'cache', info: 'Ye kya hai: Mumbai region ka Redis, jisme Mumbai ki ginti hai. Same region mein, ~1 ms door.' },
        { id: 'rb', label: 'Redis Virginia', x: 570, y: 230, w: 150, kind: 'cache', info: 'Ye kya hai: Virginia region ka Redis, jisme US ki ginti hai. Mumbai se bahut door: ek round trip lagbhag 200 ms ke aas paas (desh ke beech ki doori ki wajah se).' },
      ],
      edges: [{ a: 'cin', b: 'la' }, { a: 'cus', b: 'lb' }, { a: 'la', b: 'ra' }, { a: 'lb', b: 'rb' }, { a: 'lb', b: 'ra', id: 'far', hidden: true, dashed: true }, { a: 'ra', b: 'rb', id: 'sync', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Har region alag', steps: [
          { title: 'Apni apni ginti', parallel: true, go: ['cin>la>ra', 'cus>lb>rb'], text: 'Har region apne Redis mein ginta hai. Fast (~1 ms), aur ek region gire to doosra apna kaam karta rahe. Cloudflare ne 2017 mein yahi kiya: har PoP (data center) ka apna memcache cluster, global ginti nahi.' },
          { title: 'Kaam kyun karta hai (Cloudflare ke liye)', focus: ['la', 'ra'], text: 'Cloudflare <strong>anycast</strong> use karta hai: ek IP se aane wala traffic aam taur pe hamesha usi PoP pe pahunchta hai. To ek attacker ki ginti ek hi jagah hoti hai. Unke liye per-PoP ginti kaafi accurate thi.' },
        ]},
        { name: 'Problem: ek key, do regions', steps: [
          { title: 'Hadd 100/s, dono taraf', parallel: true, go: ['cin>la>ra', 'cus>lb>rb'], after: { ra: { sub: '100/100' }, rb: { sub: '100/100' } }, text: 'Har region ne apne hisaab se 100 allow kiye.' },
          { title: 'Asli total: 200/s', set: { ra: { state: 'warn' }, rb: { state: 'warn' } }, focus: ['ra', 'rb'], text: 'Customer ko 100 ki jagah 200 mil gaye. Fix ke tareeke: hadd baant do (Mumbai 60, Virginia 40, pichhle hafte ke traffic ke hisaab se), ya API key ko ek "home region" do jahan uski ginti hoti hai.' },
        ]},
        { name: 'Ek global counter', steps: [
          { title: 'Saari ginti Mumbai mein', show: ['far'], go: ['cus>lb>ra', 'res:ra>lb'], set: { rb: { state: 'dim' } }, text: 'Ab ginti bilkul sahi hai. Lekin Virginia ki har request ek doosre continent tak round trip karti hai.', msg: 'Virginia request + ~200 ms (cross-region round trip)' },
          { title: 'Aur Mumbai gira to?', set: { ra: { state: 'down', sub: 'DOWN' } }, go: ['cus>lb', 'lb>ra', 'bad:ra>lb'], text: 'Virginia ka bhi rate limiting gaya (fail-open ya fail-closed, dono bure). Global strict counter = latency + region ke beech SPOF. Is use case ke liye galat.' },
        ]},
        { name: 'Local + async sync', steps: [
          { title: 'Local ginti, turant faisla', parallel: true, go: ['cin>la>ra', 'cus>lb>rb'], text: 'Har region local ginta hai (fast).' },
          { title: 'Har second ginti share', show: ['sync'], parallel: true, go: ['evt:ra>rb', 'evt:rb>ra'], after: { ra: { sub: 'local + remote' }, rb: { sub: 'local + remote' } }, text: 'Background mein regions ek doosre ko apni ginti bhejte hain. Faisla "local + doosre region ki pichhli ginti" pe. Thoda overshoot ho sakta hai (sync ke beech ke time mein), lekin bounded. Ye general industry approach hai; Stripe, Cloudflare ya Lyft ki posts mein iska detail nahi hai.' },
        ]},
      ],
    },
    { type: 'p', html: `GitHub ki 2021 post bhi isi problem se shuru hui thi: data center ke hisaab se alag caches ka matlab tha ki ek client ki ginti alag data centers mein alag dikhti. Unhone rate limiting ke liye ek alag Redis setup banaya taaki saare data centers ek hi ginti dekhein. Jitna strict accuracy chahiye, utni door ki ginti; jitni speed chahiye, utni paas ki.` },

    { type: 'h2', text: 'Ek limiter kaafi nahi: Stripe ke chaar' },
    { type: 'p', html: `Stripe ki 2017 post ka sabse kaam ka hissa: "rate limiter" ek cheez nahi, ek <strong>parivaar</strong> hai. Table mein ek naya shabd hai, pehle wo:` },
    { type: 'callout', tone: 'term', title: 'Load shedding', html: `<strong>Ye kya hai:</strong> jab poora system (saare servers, jise <em>fleet</em> kehte hain) bhar jaaye, to kam zaroori requests ko jaan-boojh ke mana kar dena (503), taaki zaroori kaam chalta rahe. Rate limiting "ek client" ko rokti hai; load shedding "sabke total" ko dekhti hai.<br><strong>Kyun chahiye:</strong> kabhi koi ek client galat nahi hota, bas sab milke zyada ho jaate hain (jaise sale ka din). Tab bhi payment jaisa critical kaam nahi rukna chahiye.<br><strong>Iske bina:</strong> overload mein sab requests slow hoti hain, phir timeouts, aur critical kaam bhi fail.` },
    { type: 'p', html: `Ab chaaron limiters. Har ek alag problem rokta hai:` },
    { type: 'table', head: ['Limiter', 'Kya karta hai', 'Kya rokta hai'], rows: [
      ['Request rate limiter', 'Har user N requests/second (token bucket)', 'Bhaage hue scripts, ek user ka flood. Stripe ke mutabik sabse zyada yahi trigger hota tha.'],
      ['Concurrent requests limiter', 'Ek user ke ek saath chal rahe requests ki hadd (jaise 20)', 'Mehnge, slow endpoints pe CPU ki ladai. Slow endpoint pe client retry karta hai, aur load badhta hai.'],
      ['Fleet usage load shedder', 'Fleet ka ek hissa (Stripe ~20%) critical requests (jaise charge banana) ke liye reserved; non-critical ko 503', 'Non-critical traffic critical kaam ko bhookha na rakhe'],
      ['Worker utilization load shedder', 'Workers bhare hon to priority ke hisaab se traffic giraana: pehle test-mode, phir GET, phir POST, critical sabse last', 'Bade incident mein poora system na gire'],
    ]},
    { type: 'p', html: `Pehle do <strong>per-user</strong> hain (fairness), aakhri do <strong>poore system</strong> ke liye hain (load shedding, jiski kahani <a href="#/rate-limiting">Rate limiting</a> aur <a href="#/resilience">Resilience</a> lessons mein hai). Stripe ki salah: pehle request rate limiter, baaki dheere dheere jab zaroorat ho.` },
    { type: 'h2', text: 'Kya kya toot sakta hai' },
    { type: 'table', head: ['Failure', 'Kya hota hai', 'Bachaav'], rows: [
      ['Redis down / slow', 'Har request limiter pe atakti hai', 'Chhota timeout, fail-open + local fallback, sensitive rules pe fail-closed'],
      ['Redis failover', 'Naya primary purani ginti ke bina (async replication); kuch clients ko "nayi" window; script cache khaali', 'Thoda over-allow chalta hai; NOSCRIPT pe script dobara load'],
      ['Hot key', 'Ek bahut bada customer, saara traffic ek hi Redis shard pe', 'Over-limit local cache; us customer ke liye local pre-filter; zarurat ho to uski hadd shards mein baanto'],
      ['Clock skew', 'Gateways ki ghadi alag, bucket galat bharta hai; reset headers hilte hain (GitHub)', 'Time Redis se (TIME), reset time store karo'],
      ['Galat rule deploy', 'Achha traffic 429 khane lagta hai', 'Shadow mode pehle, kill switch, dashboards'],
      ['Memory bhar gayi', 'Shared cache ne rate-limit keys evict kar di (GitHub ka memcached anubhav)', 'Rate limiting ka alag Redis; har key pe TTL'],
    ]},

    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Ek server?</strong> Memory mein token bucket, bas. <strong>Kai servers?</strong> Shared Redis + atomic Lua, gateway pe. <strong>Default policy:</strong> fail-open + local fallback; login/OTP/paise wale endpoints fail-closed. <strong>Kai regions?</strong> Har region apni ginti; strict global ginti sirf tab jab business sach mein maange aur latency chal jaaye.` },

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Kis cheez pe limit (user, IP, API key, endpoint), kitni accuracy chahiye, latency budget (~1 ms), aur Redis gire to kya.' },
      { t: 'Kahan', d: 'Gateway + alag stateless limiter service + Redis. Rules config mein, hot reload, shadow mode.' },
      { t: 'Algorithm', d: 'Token bucket, do numbers per key, ek atomic Lua script. Sliding window counter agar smooth chahiye (Cloudflare).' },
      { t: 'Scale', d: 'Redis Cluster, hash tags, TTL; over-limit local cache; local + global do stage.' },
      { t: 'Failure', d: 'Fail-open by default (Stripe, Envoy default), local fallback, sensitive endpoints pe fail-closed. Kill switch, metrics.' },
      { t: 'Multi-region', d: 'Region-local ginti, hadd baanto ya home region; strict global counter latency aur SPOF ki wajah se nahi.' },
    ]},

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 590,
      groups: [
        { label: 'Clients', x: 10, y: 6, w: 480, h: 96 },
        { label: 'Edge', x: 10, y: 118, w: 480, h: 212 },
        { label: 'Services', x: 10, y: 345, w: 480, h: 112 },
        { label: 'Data + ops', x: 510, y: 118, w: 202, h: 462 },
      ],
      nodes: [
        { id: 'u', label: 'Normal client', sub: 'API key, 5 req/s', x: 130, y: 55, w: 160, kind: 'client', info: 'Ye kya hai: kisi developer ka app jo xyz.com ki API call karta hai, apni API key ke saath, hadd ke andar.' },
        { id: 'bot', label: 'Bot', sub: '20,000 req/s', x: 360, y: 55, w: 160, kind: 'threat', info: 'Ye kya hai: ek bhaaga hua script ya scraper jo hadd se kai guna zyada requests bhejta hai. Limiter isi se baaki sabko bachata hai.' },
        { id: 'cdn', label: 'CDN / edge', sub: 'mota IP limit', x: 245, y: 170, w: 220, kind: 'edge', info: 'Ye kya hai: user ke paas wala data center (PoP). Yahan kyun: bahut mote, IP-level limits yahin lag jaate hain (Cloudflare ka tareeka), to kachra traffic hamare servers tak aata hi nahi.' },
        { id: 'gw', label: 'API gateway', sub: 'local bucket + cache', x: 245, y: 285, w: 220, kind: 'edge', info: 'Ye kya hai: xyz.com ka main gate (Envoy jaisa). Request se labels banata hai aur limiter se poochhta hai. Apne paas ek mota local token bucket (pehla filter) aur over-limit keys ka local cache rakhta hai. Chhota timeout; limiter na mile to fail-open + local fallback, login/OTP/payouts pe fail-closed.' },
        { id: 'api', label: 'API servers', sub: 'asli kaam', x: 130, y: 405, w: 170, kind: 'server', info: 'Ye kya hai: xyz.com ke asli kaam wale servers. Inpe sirf allowed traffic aata hai.' },
        { id: 'rl', label: 'Rate limit svc', sub: 'stateless, kai copies', x: 360, y: 405, w: 170, kind: 'server', info: 'Ye kya hai: chhoti stateless service jo "OK" ya "OVER_LIMIT" bolti hai. Rules memory mein (YAML se, hot reload, shadow mode), ginti Redis mein.' },
        { id: 'mon', label: 'Metrics + alerts', sub: '429s, fail-open', x: 600, y: 180, w: 150, kind: 'data', info: 'Ye kya hai: dashboards aur alerts. Kaunsa rule kitni requests rok raha hai, kitni baar fail-open hua. Achanak spike = attack ya galat rule. Kill switch yahin se.' },
        { id: 'cfg', label: 'Rules config', sub: 'YAML in Git', x: 600, y: 285, w: 150, kind: 'data', info: 'Ye kya hai: rules ki file: kis label (API key, IP, path) pe kitni hadd. Review ke baad badalti hai; limiter bina restart ke utha leta hai.' },
        { id: 'rd', label: 'Redis Cluster', sub: 'counters + Lua', x: 600, y: 405, w: 150, kind: 'cache', info: 'Ye kya hai: sharded Redis jisme saari ginti hai. Keys jaise rl:{api_key}:rule, har key pe TTL. Token bucket ek atomic Lua script se: race condition nahi.' },
        { id: 'rdr', label: 'Redis replica', sub: 'failover copy', x: 600, y: 525, w: 150, kind: 'cache', info: 'Ye kya hai: har shard ki backup copy. Primary gire to ye primary ban jaati hai. Async copy hai, to thodi ginti kho sakti hai; isliye faisle primary pe, replica sirf failover ke liye.' },
      ],
      edges: [
        { a: 'u', b: 'cdn', n: 1 },
        { a: 'bot', b: 'cdn' },
        { a: 'cdn', b: 'gw', n: 2 },
        { a: 'gw', b: 'rl', n: 3, label: 'allow?' },
        { a: 'rl', b: 'rd', n: 4 },
        { a: 'gw', b: 'api', n: 5, label: 'allowed' },
        { a: 'rl', b: 'cfg', dashed: true, label: 'rules' },
        { a: 'gw', b: 'mon', kind: 'evt', label: 'metrics' },
        { a: 'rd', b: 'rdr', kind: 'evt', dashed: true, label: 'async copy' },
      ],
      paths: [
        { name: 'Allowed', text: 'Client → CDN → gateway → limiter → Redis (Lua: token kaato, 57 bache) → "OK" → gateway request API servers ko bhejta hai. Limiter ne ~1 ms joda.', go: ['u>cdn>gw>rl>rd', 'gw>api'] },
        { name: 'Blocked (429)', text: 'Bot ki request → limiter → Redis: 0 tokens → OVER_LIMIT → gateway wahin 429 + Retry-After lautata hai. API servers ko pata bhi nahi chalta. Agli requests ka jawab gateway ke local cache se, Redis tak nahi jaati.', go: ['bot>cdn>gw>rl>rd'] },
        { name: 'Redis down', text: 'Redis jawab nahi deta → limiter error → gateway 5 ms se zyada wait nahi karta: fail-open + local bucket se faisla, request API servers tak. Login/OTP pe fail-closed. Metrics mein alert; replica primary banti hai.', go: ['gw>rl>rd>rdr', 'gw>api', 'gw>mon'] },
        { name: 'Rule change', text: 'Naya rule Git mein review ke baad → limiter hot reload karta hai, pehle shadow mode mein. Metrics dekh ke hadd theek karo, phir enforce.', go: ['cfg>rl', 'gw>mon'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Rate limiter ek sawaal ka jawab deta hai: "is client ko abhi aane doon?" Ginti <strong>shared Redis</strong> mein, taaki saare gateways ek hi hisaab dekhein.</li>
      <li>Limiter <strong>gateway</strong> pe (ya alag service ke roop mein); rules config file mein, hot reload, naye rule pehle <strong>shadow mode</strong> mein.</li>
      <li>Ginti kis pe: API key, user, IP, endpoint. Kai rules ek saath; IP limits shared Wi-Fi (NAT) wale logon ko saath mein rok dete hain.</li>
      <li>Algorithm: default <strong>token bucket</strong> (2 numbers per key); smooth chahiye to sliding window counter. Detail <a href="#/rate-limiting">Rate limiting</a> lesson mein.</li>
      <li>"Padho, check, likho" ek <strong>atomic Lua script</strong> mein; time Redis se; har key pe TTL; Redis Cluster mein hash tags.</li>
      <li>Latency bachao: over-limit keys ka local cache, local bucket pehle, global baad mein.</li>
      <li>Redis gire to default <strong>fail-open + local fallback</strong>; login/OTP/paise pe fail-closed. Kill switch aur metrics.</li>
      <li>Kai regions: har region apni ginti (hadd baanto ya home region); strict global counter latency aur SPOF laata hai.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Ek jagah rules, saari services ke liye; app code saaf', 'Token bucket + Lua: do numbers per key, race-free', 'Local cache aur local bucket: bots Redis tak nahi pahunchte', 'Fail-open: limiter ki outage site ki outage nahi banti', 'Region-local ginti: fast aur region failure se alag'], costs: ['Har request pe ek extra hop (~1 ms)', 'Approximate ginti: thoda over-allow possible', 'Fail-open mein outage ke dauran bots khule', 'Ek aur system (Redis Cluster + service) chalana, monitor karna', 'Multi-region mein ya to hadd baanto ya overshoot sahiye'] },

    { type: 'think', questions: [
      { q: 'xyz.com ka OTP endpoint har SMS pe paise kharch karta hai. Redis down hai. Fail-open ya fail-closed? Kya koi beech ka raasta hai?', a: 'Fail-closed zyada sahi hai, kyunki fail-open mein bot lakhon SMS bhejwa sakta hai (bill + spam). Beech ka raasta: gateway ka local bucket (per phone number / per IP, mota limit) chalao, taaki asli users ko OTP milta rahe aur bot ruk jaaye. Saath mein alert.' },
      { q: 'Ek enterprise customer ki hadd 50,000 req/s hai. Uska saara traffic ek hi Redis key pe jaata hai. Kya problem hogi aur kaise suljhaoge?', a: 'Hot key: ek shard pe 50k Lua calls/s, wo shard bottleneck. Options: hadd ko kai sub-keys mein baanto (jaise 10 keys, har ek 5,000/s, request ko random sub-key pe bhejo, thoda inaccurate); ya har gateway ko periodically "quota" do (jaise 500 tokens ka batch) taaki har request pe Redis na jaana pade; local pre-filter.' },
      { q: 'Stripe ne "concurrent requests limiter" kyun banaya jab request rate limiter pehle se tha?', a: 'Rate limiter sirf "kitni requests per second" ginta hai. Lekin ek mehnga endpoint 10 second leta ho to 10 req/s bhi 100 requests ek saath chalwa deta hai, aur CPU bhar jaata hai. Concurrent limiter "ek saath kitni chal rahi hain" ginta hai, jo resource usage se seedha juda hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Lua script kyun, alag alag GET aur SET kyun nahi?', options: ['Lua fast language hai', 'Script Redis mein atomic chalti hai, beech mein doosre gateway ka command nahi ghus sakta', 'Redis mein SET nahi hota'], answer: 1, explain: 'Padhna, check aur likhna ek hi step mein. Alag commands ke beech race condition se hadd ke upar requests nikal jaati hain.' },
      { q: 'Envoy ke HTTP rate limit filter ka default kya hai jab rate limit service error de?', options: ['Request reject (fail-closed)', 'Request allow (fail-open), failure_mode_deny = false', 'Request queue mein'], answer: 1, explain: 'Default fail-open hai aur failure_mode_allowed counter badhta hai. failure_mode_deny: true karne pe error ke case mein 500 milta hai.' },
      { q: 'Cloudflare ne global counter ki jagah per-PoP counters kyun rakhe?', options: ['Global counter bahut mehnga hai aur latency badhata; anycast se ek source ka traffic aam taur pe ek hi PoP pe aata hai', 'Memcache global nahi chal sakta', 'Rules har PoP ke alag hain'], answer: 0, explain: 'Har request pe door ke counter se poochhna latency badhata. Anycast ki wajah se per-PoP ginti kaafi accurate thi.' },
      { q: 'GitHub ko replica se padhi ginti ki wajah se kya bug mila?', options: ['Requests double count hui', 'Reject hui request ke headers mein poora quota bacha dikha', 'Redis crash hua'], answer: 1, explain: 'Replica peeche tha. Fix: window expiry khud store aur check karna, aur faisla primary pe atomic script se.' },
      { q: 'xyz.com ne login pe "har IP 5 / minute" lagaya. Ek college ke 300 students ko 429 aane laga. Kyun?', options: ['Redis down hai', 'Saare students ek hi public IP (NAT) ke peeche hain, to sabki logins ek hi counter mein gin rahi hain', 'Students ka password galat hai'], answer: 1, explain: 'IP shared hota hai. IP ki hadd dheeli rakho aur saath mein per-account hadd lagao. Rules widget mein Riya aur Aman ke saath yahi hua.' },
      { q: 'Naya rule pehle shadow mode mein kyun?', options: ['Shadow mode sasta hai', 'Asli traffic pe dekh lo kaun rukta, bina kisi ko roke; phir hadd theek karke enforce', 'Shadow mode mein Redis nahi chahiye'], answer: 1, explain: 'Stripe ise dark launch kehta hai. Galat hadd se apne hi achhe customers ko rokne ka khatra khatam.' },
    ]},
    { type: 'sources', note: 'Stripe, Cloudflare aur GitHub ki posts kuch saal purani hain (2017, 2017, 2021); unke systems aaj badal chuke ho sakte hain. Ideas aaj bhi standard hain.', items: [
      { title: 'Scaling your API with rate limiters', publisher: 'Stripe blog', official: true, year: 2017, url: 'https://stripe.com/blog/rate-limiters', used: 'Four limiter types, token bucket, Redis, ~20% fleet reserved for critical requests, traffic tiers for worker shedder, fail-open advice, dark launch, kill switches, 429/503.' },
      { title: 'How we built rate limiting capable of scaling to millions of domains', publisher: 'Cloudflare blog', official: true, year: 2017, url: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/', used: 'Sliding window approximation formula and 42/18/15s example, 0.003% error over 400M requests from 270k sources, ~6% average difference, per-PoP memcache, anycast, async increments, locally cached mitigation flag.' },
      { title: 'envoyproxy/ratelimit (README)', publisher: 'Envoy project on GitHub (originally Lyft)', official: true, url: 'https://github.com/envoyproxy/ratelimit', used: 'Domain/descriptor YAML rules, nested descriptors, shadow_mode, unit + requests_per_unit, ShouldRateLimit OK/OVER_LIMIT, Redis backend, fixed windows, local cache of over-limit keys, pipelining, separate per-second Redis, hot reload.' },
      { title: 'HTTP rate limit filter and Global rate limiting overview', publisher: 'Envoy documentation', official: true, url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting', used: 'failure_mode_deny default false (fail-open), 500 when true, failure_mode_allowed stat; local token bucket in front of global service to absorb bursts.' },
      { title: 'How we scaled the GitHub API with a sharded, replicated rate limiter in Redis', publisher: 'GitHub blog', official: true, year: 2021, url: 'https://github.blog/engineering/infrastructure/how-we-scaled-github-api-sharded-replicated-rate-limiter-redis/', used: 'Memcached eviction and per-datacenter problems, client-side sharded Redis with primary/replicas, Lua scripts, reset-time and replica-staleness bugs and fixes.' },
      { title: 'Scripting with Lua', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/programmability/eval-intro/', used: 'Atomic script execution blocking the server, keys passed via KEYS, EVALSHA and volatile script cache (NOSCRIPT), effects replication default from Redis 5.' },
    ]},
  ],
});
