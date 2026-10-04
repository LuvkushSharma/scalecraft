Lesson.register({
  id: 'proxies',
  title: 'Forward proxy vs reverse proxy',
  minutes: 22,
  summary: `Proxy ek beech ka computer hai jo kisi aur ki taraf se request bhejta hai. Forward proxy clients ki taraf se kaam karta hai (office ka filter, cache, privacy). Reverse proxy servers ki taraf se (TLS, load balancing, caching, routing, suraksha). Load Balancer, NGINX, CDN, API Gateway: ye sab asal mein reverse proxies hain.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Kabhi kabhi do computers seedhe baat nahi karte. Beech mein ek teesra computer baithta hai jo message leta hai, check karta hai, aage bhejta hai, aur jawab wapas laata hai. Ise <strong>proxy</strong> kehte hain.<br>Bas ek sawaal yaad rakho: <strong>ye beech wala kiski taraf hai?</strong> Agar tumhari (users ki) taraf hai, to <strong>forward proxy</strong>. Agar website ki taraf hai, to <strong>reverse proxy</strong>.<br>Is lesson mein dono ko chala ke dekhoge, aur samjhoge ki xyz.com ke aage NGINX ya Cloudflare kyun lagate hain.` },

    { type: 'h2', text: 'Proxy kya hai?' },
    { type: 'callout', tone: 'term', title: 'Naya word: proxy', html: `<strong>Ye kya hai:</strong> ek server jo client aur server ke beech baithta hai. Request pehle proxy ke paas jaati hai, proxy apni taraf se use aage bhejta hai, aur jawab bhi proxy ke through wapas aata hai. Dono taraf ko lagta hai wo proxy se baat kar rahe hain.<br><strong>Kyun chahiye:</strong> beech mein ek jagah mil jaati hai jahan check, cache, badlav aur hisaab ho sake, bina client ya server ka code badle.<br><strong>Iske bina:</strong> har client ya har server ko ye sab kaam khud karna padta.<br><strong>Example:</strong> office ka web filter (forward), xyz.com ke aage NGINX (reverse).` },
    { type: 'p', html: `Normally browser seedha server se baat karta hai. Proxy ke saath beech mein ek aur "hop" (ek aur padaav) aa jaata hai. Sawaal sirf ye hai: <strong>proxy kiski taraf hai, kise chhupata hai, kiske niyam lagata hai?</strong>` },
    { type: 'compare',
      left: { title: 'Forward proxy: clients ki taraf', ascii: `
Laptop 1 ─┐
Laptop 2 ─┼─> PROXY ──> Internet sites
Laptop 3 ─┘
(office ke andar)` , html: 'Websites ko sirf proxy dikhta hai, andar ke laptops nahi. Niyam <strong>office</strong> ke (kya khol sakte ho).' },
      right: { title: 'Reverse proxy: servers ki taraf', ascii: `
                ┌─> Server 1
Users ──> PROXY ┼─> Server 2
                └─> Server 3
                (xyz.com ke andar)` , html: 'Users ko sirf proxy dikhta hai, peeche ke servers nahi. Niyam <strong>website</strong> ke (kaun andar aa sakta hai, kahan jaayega).' },
    },
    { type: 'callout', tone: 'tip', title: 'Pehchanne ki trick', html: `Dekho proxy ko <strong>kisne lagaya</strong> aur <strong>kaun use configure karta hai</strong>. Office ke IT ne laptops mein proxy ka address daala: forward. xyz.com ki team ne apne servers ke aage lagaya aur users ko pata bhi nahi: reverse. Software same ho sakta hai (NGINX dono ban sakta hai), kaam ki disha alag hai.` },

    { type: 'h2', text: 'Forward proxy: clients ki taraf' },
    { type: 'p', html: `<strong>Problem:</strong> ek company ke office mein 500 employees hain. Company chahti hai: (1) kuch sites block hon, (2) saara internet traffic ek jagah se guzre taaki hisaab rahe, (3) 500 log ek hi 300 MB update download karein to internet ka bill 500 guna na ho, (4) bahar ki duniya ko andar ke laptops na dikhein. Har laptop pe alag alag ye sab lagana mushkil hai. Isliye office network ke darwaze pe ek <strong>forward proxy</strong> lagta hai, aur saare laptops usi ke through bahar jaate hain.` },
    { type: 'list', items: [
      `<strong>Filtering:</strong> niyam: "gaming aur malware wali sites block". Proxy request dekh ke wahin <code>403</code> de deta hai.`,
      `<strong>Privacy / chhupana (anonymity):</strong> websites ko proxy ka IP dikhta hai, user ka nahi. Kai log isi liye public proxies use karte hain. (Lekin proxy khud sab dekh sakta hai: bharosa proxy pe shift ho jaata hai.)`,
      `<strong>Caching:</strong> 500 log same software update maangein to proxy ek baar internet se laaye, baaki 499 ko apni disk se de de.`,
      `<strong>Logging aur control:</strong> company dekh sakti hai kya access hua. Servers ke liye bhi: production servers ko bahar sirf ek "egress proxy" se jaane do, jo sirf allowed domains (jaise payment gateway) khulne de. Hack hua server data bahar nahi bhej paayega.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Squid', html: `<strong>Ye kya hai:</strong> ek purana, open-source forward proxy software jo caching aur filtering ke liye mashhoor hai. Schools, offices, ISPs isse use karte aaye hain.<br><strong>Kyun yahan:</strong> jab koi kahe "office mein Squid laga hai", matlab ek forward proxy jo web traffic cache aur filter karta hai.<br><strong>Example:</strong> Squid ko ulta (reverse, "accelerator" mode) bhi chala sakte hain, lekin aaj reverse proxy ke liye NGINX, HAProxy ya Envoy zyada common hain.` },
    { type: 'p', html: `Ek sawaal: aaj zyada tar sites HTTPS hain. Encrypted traffic ko proxy kaise filter ya cache karega? Jawab: aam taur pe <strong>nahi kar sakta</strong>. Browser proxy ko sirf bolta hai "mujhe xyz.com:443 se jod do" (HTTP ka <code>CONNECT</code> method). Proxy ek <strong>tunnel</strong> bana deta hai, aur andar ka TLS seedha browser aur xyz.com ke beech hota hai. Proxy ko sirf domain ka naam dikhta hai, page ya password nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CONNECT tunnel aur TLS inspection', html: `<strong>CONNECT tunnel:</strong> proxy sirf bytes idhar se udhar karta hai, bina padhe. Isse domain-level filter ho sakta hai ("facebook.com band"), lekin URL-level nahi, aur cache bhi nahi.<br><strong>TLS inspection (MITM proxy):</strong> kuch companies har laptop mein apna ek "root certificate" daal deti hain. Tab proxy beech mein TLS tod ke padh sakta hai, phir naya TLS bana ke aage bhejta hai. Malware scan ke liye kaam ka, lekin privacy ka bada sawaal, aur banks jaise apps (certificate pinning) aksar ise mana kar dete hain.<br><strong>Kyun yaad rakhna:</strong> "proxy sab dekh leta hai" aadha sach hai. HTTPS ke saath sirf domain, jab tak device pe company ka certificate na ho.` },
    { type: 'p', html: `Office ka forward proxy chala ke dekho: normal HTTPS site, cache se update, block hui site, aur jab proxy khud gir jaaye:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'l1', label: 'Riya ka laptop', sub: '10.1.0.21', x: 95, y: 80, w: 150, kind: 'client', info: 'Ye kya hai: office ka ek laptop. IT ne iski settings mein proxy ka address daala hai, to iska saara web traffic proxy se jaata hai.' },
        { id: 'l2', label: 'Aman ka laptop', sub: '10.1.0.37', x: 95, y: 220, w: 150, kind: 'client', info: 'Ye kya hai: doosra office laptop, same proxy ke peeche. Bahar ki sites ko Riya aur Aman dono ek hi IP (proxy ka) se dikhte hain.' },
        { id: 'fp', label: 'Office proxy', sub: 'Squid: filter + cache', x: 310, y: 150, w: 170, kind: 'edge', info: 'Ye kya hai: forward proxy, office ki taraf khada. Niyam lagata hai (kaunsi site band), common files cache karta hai, sab log karta hai, aur andar ke laptops ko bahar se chhupata hai.' },
        { id: 'site', label: 'xyz.com', sub: 'allowed', x: 580, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: ek normal website. Use request proxy ke public IP se aati dikhti hai, Riya ke laptop se nahi.' },
        { id: 'game', label: 'game-site.com', sub: 'office mein band', x: 580, y: 150, w: 150, kind: 'threat', info: 'Ye kya hai: ek site jo office ke niyam mein block hai. Proxy request ko bahar jaane hi nahi deta.' },
        { id: 'upd', label: 'Update server', sub: '300 MB OS update', x: 580, y: 240, w: 150, kind: 'server', info: 'Ye kya hai: OS ya software update ka server. 500 laptops ek hi file maangte hain: proxy cache ka sabse bada faayda yahin.' },
      ],
      edges: [{ a: 'l1', b: 'fp' }, { a: 'l2', b: 'fp' }, { a: 'fp', b: 'site' }, { a: 'fp', b: 'game', dashed: true }, { a: 'fp', b: 'upd' }],
      scenarios: [
        { name: 'HTTPS site (tunnel)', steps: [
          { title: 'Laptop proxy se kehta hai: jod do', text: 'HTTPS hai, to browser proxy ko sirf domain batata hai: CONNECT method.', go: 'l1>fp', msg: 'CONNECT xyz.com:443' },
          { title: 'Proxy tunnel banata hai', text: 'Niyam check: xyz.com allowed. Proxy xyz.com se TCP connection khol ke bytes idhar-udhar karta hai. Andar ka TLS browser aur xyz.com ke beech hai, proxy page nahi padh sakta.', go: ['fp>site', 'res:site>fp>l1'], set: { fp: { sub: 'dikha: sirf xyz.com' } } },
          { title: 'Website ko kya dikha', text: 'xyz.com ko request office proxy ke public IP se aayi. Riya ka laptop (10.1.0.21) bahar kabhi nahi dikha.', focus: ['site'], set: { site: { sub: 'from: office IP' } } },
        ]},
        { name: 'Update cache se', steps: [
          { title: 'Riya update maangti hai', text: 'Proxy ke cache mein nahi hai (miss). Proxy internet se 300 MB laata hai, Riya ko deta hai, aur disk pe rakh leta hai. (Updates aksar aise URLs pe hote hain jinhe cache karne ki ijaazat hoti hai.)', go: ['l1>fp>upd', 'res:upd>fp>l1'], after: { fp: { state: 'miss', sub: 'cache: miss → saved' } } },
          { title: 'Aman wahi update maangta hai', text: 'Cache hit! Proxy apni disk se deta hai. Internet pe ek byte nahi gaya. 500 laptops = 1 baar download.', go: ['l2>fp', 'res:fp>l2'], set: { upd: { state: 'dim' } }, after: { fp: { state: 'hit', sub: 'cache: hit' } } },
        ]},
        { name: 'Block hui site', steps: [
          { title: 'Aman game-site.com kholta hai', text: 'Request proxy tak aati hai.', go: 'l2>fp', msg: 'CONNECT game-site.com:443' },
          { title: 'Proxy pe hi 403', text: 'Niyam: ye site office mein band. Proxy turant mana kar deta hai. game-site.com tak ek packet bhi nahi gaya, aur ye koshish log mein likh li gayi.', go: 'bad:fp>l2', set: { game: { state: 'dim' } }, after: { l2: { state: 'warn' } }, msg: '403 Forbidden (company policy)' },
        ]},
        { name: 'Proxy gir gaya', intro: 'Failure: office proxy ki machine crash ho gayi.', steps: [
          { title: 'Sab ka internet band', text: 'Saare laptops sirf proxy ke through bahar jaate the. Proxy gaya to poore office ka web gaya. Proxy ek <strong>single point of failure (SPOF)</strong> ban gaya.', set: { fp: { state: 'down', sub: 'crash' } }, go: ['lost:l1>fp', 'lost:l2>fp'] },
          { title: 'Ilaaj', text: 'Do ya zyada proxies rakho, aur laptops ko ek list do ("pehla na chale to doosra"), jaise PAC file ya load balancer ke peeche proxies. Har beech wale box ke liye yahi sawaal poochho: ye gira to kya hoga?', focus: ['fp'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naya word: SPOF (single point of failure)', html: `<strong>Ye kya hai:</strong> system ka wo ek hissa jiske girne se poora system gir jaata hai.<br><strong>Kyun yahan:</strong> proxy ko beech mein daalte hi saara traffic usi pe nirbhar. Ek proxy = ek SPOF.<br><strong>Iske bina (yaani redundancy ke saath):</strong> do proxies, ek gire to doosra sambhal le. Ye Phase 1 ke availability lesson mein detail mein hai.` },
    { type: 'h2', text: 'Kaun kya dekh sakta hai?' },
    { type: 'p', html: `Proxy "chhupata" hai, lekin kisse, aur kya? Ye sabse zyada confuse karne wala hissa hai. Setup badal ke dekho ki Riya xyz.com pe login kare to kis ko kya dikhta hai:` },
    { type: 'custom', render(el) {
      const S = [
        ['direct', 'Seedha (bina proxy)'], ['fwd', 'Forward proxy (HTTPS tunnel)'], ['mitm', 'Forward proxy + TLS inspection'], ['vpn', 'VPN'], ['rev', 'Reverse proxy (xyz.com ka NGINX)'],
      ];
      const WHO = ['xyz.com ke servers', 'Beech wala box', 'Cafe WiFi / ISP'];
      const D = {
        direct: [['Riya ka IP', 'Poora login (TLS yahin khulta hai)'], ['Koi box nahi', '—'], ['Riya ka IP, domain xyz.com', 'Content nahi (encrypted)']],
        fwd: [['Proxy ka IP (Riya chhupi)', 'Poora login (TLS end-to-end)'], ['Riya ka IP, domain xyz.com', 'Content nahi (sirf tunnel)'], ['Proxy se baat ho rahi hai', 'Content nahi']],
        mitm: [['Proxy ka IP', 'Poora login'], ['Riya ka IP, poora URL', 'SAB KUCH, password bhi (TLS proxy pe toot ke dobara bana)'], ['Proxy se baat ho rahi hai', 'Content nahi']],
        vpn: [['VPN server ka IP', 'Poora login'], ['Riya ka IP, domains', 'Content nahi (HTTPS ki wajah se)'], ['Sirf "VPN se encrypted baat"', 'Domain bhi nahi']],
        rev: [['NGINX ka IP (Riya ka IP X-Forwarded-For header mein)', 'Poora login (NGINX se aage)'], ['NGINX: Riya ka IP, poora request', 'Sab kuch (TLS yahin khatam hota hai)'], ['Riya ka IP, domain xyz.com', 'Content nahi (encrypted)']],
      };
      const NOTE = {
        direct: 'Koi beech wala nahi. Website ko tumhara asli (ya NAT wala) IP dikhta hai.',
        fwd: 'Website se tumhara IP chhupa, lekin proxy ko pata hai tum kaun ho aur kaunsi sites khol rahe ho. Bharosa website se hat ke proxy pe gaya.',
        mitm: 'Company ka certificate laptop mein hai, to proxy sab padh sakta hai. Malware scan ke liye kaam ka, privacy ke liye sabse bura.',
        vpn: 'VPN poore device ka saara traffic encrypt karke ek tunnel mein bhejta hai. Cafe WiFi ko kuch nahi dikhta. Lekin VPN company ab wahi dekhti hai jo pehle ISP dekhta tha.',
        rev: 'Reverse proxy users ko nahi, servers ko chhupata hai. Users ko servers ke asli IP kabhi nahi dikhte. Servers ko user ka IP sirf ek header (X-Forwarded-For, jisme proxy asli IP likh deta hai; neeche detail) se pata chalta hai.',
      };
      let k = 'fwd';
      el.innerHTML = `<div class="pv-b" style="display:flex;flex-wrap:wrap;gap:6px">${S.map(([id, n]) => `<button class="chip" data-s="${id}">${n}</button>`).join('')}</div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;font-size:13px"><thead><tr><th>Kaun</th><th>Kis IP se aaya dikhta hai</th><th>Andar ka data</th></tr></thead><tbody class="pv-rows"></tbody></table></div>
        <div class="calc-note pv-n"></div>`;
      const draw = () => {
        el.querySelectorAll('[data-s]').forEach(b => b.className = 'chip' + (b.dataset.s === k ? ' on' : ''));
        el.querySelector('.pv-rows').innerHTML = D[k].map((r, i) => `<tr><td><strong>${WHO[i]}</strong></td><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
        el.querySelector('.pv-n').textContent = NOTE[k];
      };
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { k = b.dataset.s; draw(); });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "VPN aur forward proxy same hain"', html: `Dono tumhari taraf se baat karte hain, isliye similar lagte hain. Farak: <strong>VPN</strong> poore device ka <em>saara</em> traffic (har app, har protocol) encrypt karke ek tunnel mein bhejta hai, to local WiFi ko kuch nahi dikhta. <strong>Forward proxy</strong> aam taur pe sirf configure ki hui apps (aksar browser, web traffic) ke liye hota hai, aur proxy tak ka raasta khud encrypted ho, ye zaroori nahi. Aur dono mein, beech wale ko tum pe bharosa nahi, tumhe us pe bharosa karna padta hai.` },
    { type: 'h2', text: 'Reverse proxy: servers ki taraf' },
    { type: 'p', html: `Ab xyz.com ki taraf socho. Abhi 10 app servers hain aur har ek ka public IP internet pe khula hai. Problems: har server pe TLS certificate rakhna aur renew karna, har server pe suraksha ke niyam, koi server gire to users ka connection toota, aur static files (CSS, images) bhi mehenge app servers se jaati hain. Ilaaj: sabke aage ek <strong>reverse proxy</strong> (jaise NGINX), aur servers private network mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: reverse proxy', html: `<strong>Ye kya hai:</strong> website ke servers ke aage khada server. Users ko lagta hai wahi website hai. Wo request leta hai, kaam karta hai (TLS, check, cache), aur peeche ke sahi server ko aage bhej deta hai.<br><strong>Kyun chahiye:</strong> saare "aam" kaam ek jagah: encryption, suraksha, caching, routing. Servers sirf business logic karein.<br><strong>Iske bina:</strong> har server internet ke saamne, har server pe yahi sab dobara, aur server badalna users ko dikhta.<br><strong>Example:</strong> NGINX, HAProxy, Envoy, AWS ALB, Cloudflare. Load Balancer, CDN aur API Gateway bhi isi ke roop hain.` },
    { type: 'steps', items: [
      { t: 'TLS termination', d: 'HTTPS ka handshake aur encryption proxy pe hota hai. Certificate aur private key ek hi jagah. Andar ke servers ko crypto ka bojh nahi uthana padta (sensitive systems mein andar bhi TLS rakhte hain).' },
      { t: 'Load balancing', d: 'Requests ko kai servers mein baantna, aur health check se mare hue server ko line se hatana. Load Balancer ek tarah ka reverse proxy hi hai.' },
      { t: 'Caching', d: 'Static files (CSS, JS, images) aur kuch pages proxy khud yaad rakh ke deta hai. App servers tak request jaati hi nahi.' },
      { t: 'Compression', d: 'Text files (HTML, CSS, JS, JSON) ko gzip ya brotli se chhota karke bhejna. 100 KB ka JS aksar 25-30 KB ban jaata hai. Kam bytes = mobile pe tez.' },
      { t: 'Routing', d: '/api ko API servers, /images ko image servers, /admin sirf office IP se. URL, header ya cookie dekh ke faisla (layer 7).' },
      { t: 'Security', d: 'Servers ke asli IP chhupe. Bahut badi ya ajeeb requests, bure IPs, ya ek client ki baadh (rate limiting) proxy pe hi rok di jaati hain. WAF (neeche) yahin lagta hai.' },
      { t: 'Slow clients ko sambhalna (buffering)', d: '2G pe koi user dheere dheere request bhej raha hai. Proxy poori request jama karke hi app server ko deta hai, aur jawab bhi jaldi le ke khud dheere user ko deta hai. App server ka thread ek dheeme user pe atka nahi rehta.' },
      { t: 'Protocol badalna', d: 'Bahar HTTP/2 aur HTTP/3, andar purana HTTP/1.1. Users ko naye protocol ka faayda, servers badalne nahi pade.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: WAF (Web Application Firewall)', html: `<strong>Ye kya hai:</strong> ek layer 7 firewall jo HTTP request ka andar ka content padhta hai aur jaane-maane hamle pakadta hai, jaise URL mein SQL injection (<code>' OR 1=1 --</code>) ya script ghusana.<br><strong>Kyun chahiye:</strong> normal firewall sirf IP aur port dekhta hai (pichhla lesson). Hamla port 443 pe hi aata hai, normal request jaisa dikhta hai.<br><strong>Iske bina:</strong> app ke har bug pe seedha hamla.<br><strong>Example:</strong> Cloudflare, AWS WAF, ya NGINX ke saath ModSecurity.` },
    { type: 'callout', tone: 'term', title: 'Naya word: X-Forwarded-For (asli client IP)', html: `<strong>Ye kya hai:</strong> reverse proxy ke peeche server ko har request proxy ke IP se aati dikhti hai. Isliye proxy ek header jod deta hai: <code>X-Forwarded-For: 49.36.10.20</code> (ya standard <code>Forwarded</code> header), jisme user ka asli IP likha hai.<br><strong>Kyun chahiye:</strong> logs, rate limiting, fraud check, sabko asli user IP chahiye.<br><strong>Dhyaan:</strong> ye header koi bhi client khud bhi bhej sakta hai (jhootha). Server ko sirf apne bharosemand proxy ka joda hua hissa maanna chahiye.` },
    { type: 'p', html: `Ab xyz.com ke NGINX ko chala ke dekho: URL se routing, cache se file, bahar se admin, aur jab ek server mar jaaye:` },
    { type: 'flow', height: 350,
      nodes: [
        { id: 'u', label: 'Users', x: 80, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unhe sirf xyz.com ka ek address pata hai, jo asal mein reverse proxy ka hai. Peeche kitne servers hain, unhe nahi pata.' },
        { id: 'rp', label: 'Reverse proxy', sub: 'NGINX', x: 270, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: xyz.com ka darwaza. Saari requests yahan aati hain. Ye TLS kholta hai, static files cache se deta hai, niyam lagata hai, aur baaki ko URL ke hisaab se sahi servers ko bhejta hai.' },
        { id: 'st', label: 'Static cache', sub: 'CSS, JS, images', x: 270, y: 300, w: 150, kind: 'cache', info: 'Ye kya hai: proxy ki apni disk/memory cache. Sabke liye same files yahin se: app server tak jaane ki zarurat nahi.' },
        { id: 'api', label: 'API servers', sub: '/api/*', x: 520, y: 80, w: 140, kind: 'server', info: 'Ye kya hai: API ka kaam karne wale servers, private IPs pe. Sirf /api wali requests yahan aati hain.' },
        { id: 'web', label: 'Web servers', sub: '/*', x: 520, y: 200, w: 140, kind: 'server', info: 'Ye kya hai: baaki pages banane wale servers. Proxy inki health check karta rehta hai.' },
        { id: 'adm', label: 'Admin panel', sub: '/admin', x: 520, y: 310, w: 140, kind: 'server', info: 'Ye kya hai: andar ka admin tool. Niyam: sirf office ke IP se allowed.' },
      ],
      edges: [{ a: 'u', b: 'rp' }, { a: 'rp', b: 'st' }, { a: 'rp', b: 'api' }, { a: 'rp', b: 'web' }, { a: 'rp', b: 'adm', dashed: true }],
      scenarios: [
        { name: 'Routing by URL', steps: [
          { title: 'Request: /api/users/42', text: 'Proxy HTTPS kholta hai (TLS termination) aur URL padhta hai.', go: 'u>rp', msg: 'GET https://xyz.com/api/users/42' },
          { title: 'API servers ko forward', text: 'Niyam: /api/* → API servers. Proxy <code>X-Forwarded-For</code> header jod deta hai. Andar wali call plain HTTP ya internal TLS pe ho sakti hai.', go: ['rp>api', 'res:api>rp>u'] },
          { title: 'Request: /about', text: 'Ye page hai, web servers ko. Users ko dono baar ek hi address dikha.', go: ['u>rp>web', 'res:web>rp>u'] },
        ]},
        { name: 'Static file cache se', steps: [
          { title: 'Request: /style.css', text: 'Ye file sabke liye same hai.', go: 'u>rp' },
          { title: 'Proxy khud de deta hai', text: 'App servers ko pata bhi nahi chala. Unka CPU asli kaam ke liye bacha. Saath mein gzip/brotli se file chhoti karke bheji.', go: ['rp>st', 'res:st>rp>u'], set: { api: { state: 'dim' }, web: { state: 'dim' }, adm: { state: 'dim' } }, after: { st: { state: 'hit' } } },
        ]},
        { name: 'Admin bahar se', steps: [
          { title: 'Koi bahar se /admin kholta hai', text: 'Niyam: /admin sirf office IP se.', go: 'u>rp', msg: 'GET /admin  from 185.x.x.x' },
          { title: 'Proxy pe hi 403', text: 'Request admin server tak pahunchi hi nahi. Suraksha ki pehli deewar proxy hai.', go: 'bad:rp>u', set: { adm: { state: 'ok', sub: 'safe' } }, msg: '403 Forbidden' },
        ]},
        { name: 'Ek server mar gaya', intro: 'Failure: web servers mein se ek crash ho gaya.', steps: [
          { title: 'Health check fail', text: 'Proxy har kuch second mein har server se poochhta hai "zinda ho?" (health check). Ek web server ne jawab nahi diya. Proxy use line se hata deta hai.', focus: ['web'], set: { web: { state: 'warn', sub: '1 of 3 down' } } },
          { title: 'Users ko pata nahi chala', text: 'Nayi requests baaki zinda servers pe. Agar ek request beech mein fail hui, aur wo dobara chalane mein safe hai (jaise GET), to proxy use doosre server pe try kar leta hai.', go: ['u>rp>web', 'res:web>rp>u'] },
          { title: 'Agar saare mar jaayein', text: 'Proxy khud zinda hai, to wo saaf error deta hai: <code>502 Bad Gateway</code> (peeche wale ne galat/koi jawab nahi diya) ya <code>504 Gateway Timeout</code> (der tak jawab nahi). Ye error codes dekhte hi samajh jaao: problem proxy ke peeche hai.', set: { web: { state: 'down', sub: 'sab down' } }, go: 'bad:rp>u', msg: '502 Bad Gateway' },
        ]},
      ],
    },
    { type: 'p', html: `NGINX mein ye sab kuch lines ki config hai. Isko padhne ki koshish karo, har line ka matlab comment mein hai:` },
    { type: 'code', text: `upstream web_servers {              # peeche ke servers ka group
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
server {
    listen 443 ssl;                    # bahar HTTPS
    server_name xyz.com;
    ssl_certificate     /etc/ssl/xyz.crt;   # TLS termination yahin
    ssl_certificate_key /etc/ssl/xyz.key;
    gzip on;                           # compression

    location /api/ { proxy_pass http://10.0.2.20:9000; }  # routing
    location /admin/ { allow 203.0.113.0/24; deny all; proxy_pass http://10.0.3.5:8000; }
    location / {
        proxy_pass http://web_servers;                       # load balancing
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}` },
    { type: 'h2', text: 'Reverse proxy cache: servers pe kitna bojh bachta hai?' },
    { type: 'p', html: `Sliders ghumao. Maan lo ek app server 1,000 requests per second (rps) sambhal leta hai. Proxy ka cache static files ka kitna hissa khud de deta hai, us hisaab se peeche kitne servers chahiye:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Kul requests: <strong class="rc-rv"></strong> rps</label><input type="range" class="rc-r" aria-label="Requests per second" min="1000" max="50000" step="1000" value="10000"></div>
          <div><label>Static files ka hissa: <strong class="rc-sv"></strong>%</label><input type="range" class="rc-s" aria-label="Static share" min="0" max="95" step="5" value="70"></div>
          <div><label>Static pe cache hit rate: <strong class="rc-hv"></strong>%</label><input type="range" class="rc-h" aria-label="Hit rate" min="0" max="100" step="5" value="95"></div>
        </div>
        <div class="stats"><div class="stat"><span>Proxy cache ne diye</span><strong class="rc-c"></strong></div><div class="stat"><span>App servers tak gaye</span><strong class="rc-o"></strong></div><div class="stat"><span>Servers (bina proxy → saath)</span><strong class="rc-n"></strong></div></div>
        <div class="calc-note rc-x"></div>`;
      const PER = 1000;
      const draw = () => {
        const r = +el.querySelector('.rc-r').value, s = +el.querySelector('.rc-s').value, h = +el.querySelector('.rc-h').value;
        const cached = Math.round(r * s / 100 * h / 100), origin = r - cached;
        const n0 = Math.ceil(r / PER), n1 = Math.max(1, Math.ceil(origin / PER));
        el.querySelector('.rc-rv').textContent = r.toLocaleString('en-IN'); el.querySelector('.rc-sv').textContent = s; el.querySelector('.rc-hv').textContent = h;
        el.querySelector('.rc-c').textContent = cached.toLocaleString('en-IN') + ' rps';
        el.querySelector('.rc-o').textContent = origin.toLocaleString('en-IN') + ' rps';
        el.querySelector('.rc-n').textContent = `${n0} → ${n1}`;
        el.querySelector('.rc-x').textContent = `${r} × ${s}% static × ${h}% hit = ${cached} rps proxy pe hi khatam. Bache ${origin} rps ÷ ${PER} per server = ${n1} server (bina proxy ${n0}). Dynamic requests (login, feed) cache nahi hoti, isliye static hissa jitna bada, faayda utna bada.`;
      };
      ['.rc-r', '.rc-s', '.rc-h'].forEach(c => el.querySelector(c).oninput = draw); draw();
    }},
    { type: 'p', html: `Default mein 10,000 rps mein se <strong>6,650</strong> proxy ke cache ne hi de diye. App servers tak sirf <strong>3,350</strong> gaye: 10 ki jagah <strong>4</strong> servers. Hit rate 95 se 50% kar ke dekho: kitna farak padta hai.` },

    { type: 'h2', text: 'Ye sab reverse proxy ke roop hain' },
    { type: 'table', head: ['Naam', 'Asal mein', 'Khaas kaam'], rows: [
      ['Load Balancer (AWS ALB, HAProxy)', 'Reverse proxy', 'Servers mein traffic baantna, health checks'],
      ['CDN (Cloudflare, Akamai, CloudFront)', 'Duniya bhar mein faile reverse proxies', 'Content users ke paas cache karna, DDoS sokhna, WAF'],
      ['API Gateway', 'Reverse proxy', 'Auth, rate limiting, alag services ko routing'],
      ['NGINX', 'Web server + reverse proxy (forward bhi ban sakta hai)', 'TLS, static files, caching, routing; bahut tez aur halka'],
      ['HAProxy', 'L4/L7 load balancer + reverse proxy', 'Bahut zyada connections, detailed health checks'],
      ['Envoy', 'Reverse proxy, aksar har service ke saath "sidecar"', 'Service mesh, retries, observability (Phase 2 resilience lesson)'],
      ['Squid', 'Mainly forward proxy (reverse mode bhi)', 'Office/ISP caching aur filtering'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "Load balancer aur reverse proxy alag cheezein hain"', html: `Load balancer ek <strong>kaam</strong> hai (traffic baantna), reverse proxy ek <strong>jagah</strong> hai (servers ke aage). Aaj zyada tar software dono karta hai: NGINX reverse proxy hai jo load balancing bhi karta hai. Fark sirf tab hai jab L4 load balancer (sirf TCP packets aage karta hai, HTTP padhta hi nahi): wo poora "reverse proxy" wala kaam (caching, URL routing) nahi kar sakta.` },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Forward proxy</strong> tab, jab tumhe <em>apne users ya servers ke bahar jaate</em> traffic pe control chahiye: office filtering, caching, auditing, ya production servers ka egress (sirf allowed domains).<br><strong>Reverse proxy</strong> lagbhag hamesha, jab tumhari site public hai: TLS ek jagah, servers private, load balancing, caching, rate limiting. Chhoti site: ek NGINX. Badi: CDN (Cloudflare) → load balancer → NGINX/Envoy → services.<br>Har proxy ek extra hop aur ek SPOF hai: kam se kam do rakho, aur latency naapo.` },
    { type: 'diagram', title: 'Forward aur reverse proxy: poori picture', height: 510,
      groups: [
        { label: 'Office', x: 10, y: 20, w: 190, h: 215 },
        { label: 'xyz.com (private network)', x: 468, y: 150, w: 244, h: 345 },
      ],
      nodes: [
        { id: 'lap', label: 'Office laptops', x: 105, y: 75, w: 150, kind: 'client', info: 'Ye kya hai: office ke 500 laptops. Inka saara web traffic forward proxy se bahar jaata hai.' },
        { id: 'fp', label: 'Forward proxy', sub: 'Squid: filter, cache', x: 105, y: 190, w: 170, kind: 'edge', info: 'Ye kya hai: office ki taraf khada proxy. Sites block karta hai, updates cache karta hai, log rakhta hai, aur laptops ke IP bahar se chhupata hai. HTTPS mein sirf domain dekhta hai (CONNECT tunnel).' },
        { id: 'ext', label: 'Bahar ki sites', sub: 'internet', x: 335, y: 105, w: 150, kind: 'server', info: 'Ye kya hai: internet ki koi bhi site. Unhe office ke 500 log ek hi IP (proxy ka) se aate dikhte hain.' },
        { id: 'usr', label: 'Mobile users', x: 105, y: 330, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com ke aam users. Unhe sirf xyz.com ka naam pata hai, jo asal mein Cloudflare ke reverse proxies pe point karta hai.' },
        { id: 'bot', label: 'Bot', sub: 'attack / flood', x: 105, y: 450, w: 150, kind: 'threat', info: 'Ye kya hai: hamla karne wala program: requests ki baadh ya SQL injection. Reverse proxy (CDN + WAF) ise sabse bahar rok deta hai.' },
        { id: 'cf', label: 'Cloudflare', sub: 'CDN + WAF', x: 335, y: 330, w: 150, kind: 'edge', info: 'Ye kya hai: duniya bhar mein faile reverse proxies (CDN). Users ke paas TLS kholta hai, static files cache se deta hai, WAF aur DDoS se bachata hai. Sirf zaroori requests xyz.com tak bhejta hai.' },
        { id: 'ng', label: 'NGINX', sub: 'TLS, route, cache', x: 570, y: 330, w: 170, kind: 'edge', info: 'Ye kya hai: xyz.com ke data center ka reverse proxy. URL dekh ke /api ko API servers, baaki ko web servers. Health checks karta hai, X-Forwarded-For jodta hai.' },
        { id: 'api', label: 'API servers', sub: 'private IPs', x: 570, y: 200, w: 150, kind: 'server', info: 'Ye kya hai: /api ka kaam karne wale servers. Internet inhe seedha nahi dekh sakta. Sirf NGINX se requests aati hain.' },
        { id: 'web', label: 'Web servers', sub: 'private IPs', x: 570, y: 460, w: 150, kind: 'server', info: 'Ye kya hai: pages banane wale servers. Ek mare to NGINX use line se hata deta hai, sab mare to 502.' },
      ],
      edges: [
        { a: 'lap', b: 'fp', n: 1 },
        { a: 'fp', b: 'ext', label: 'CONNECT tunnel' },
        { a: 'fp', b: 'cf', dashed: true },
        { a: 'usr', b: 'cf', n: 2 },
        { a: 'cf', b: 'bot', kind: 'bad', label: 'blocked' },
        { a: 'cf', b: 'ng', n: 3 },
        { a: 'ng', b: 'api', n: 4, label: '/api' },
        { a: 'ng', b: 'web', label: '/' },
      ],
      paths: [
        { name: 'Office se bahar (forward)', text: 'Laptop ki request office proxy se: niyam check, cache, phir tunnel se bahar ki site tak. Site ko sirf proxy ka IP dikha.', go: ['lap>fp>ext'] },
        { name: 'User se xyz.com (reverse)', text: 'User Cloudflare tak (TLS paas mein), phir NGINX, phir URL ke hisaab se API servers. User ko servers kabhi nahi dikhe.', go: ['usr>cf>ng>api'] },
        { name: 'Bot roka gaya', text: 'Bot ki baadh ya hamla Cloudflare ke WAF / rate limit pe hi ruk gaya. xyz.com ke servers tak kuch nahi pahuncha.', go: ['cf>bot'] },
        { name: 'Dono proxy ek raaste mein', text: 'Office ka employee xyz.com khole to request pehle forward proxy (office ka), phir reverse proxies (xyz.com ke) se guzarti hai.', go: ['lap>fp>cf>ng>web'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Proxy = beech ka server jo kisi aur ki taraf se request bhejta hai. Sawaal: kiski taraf hai?</li>
      <li>Forward proxy = clients ki taraf (office, school, egress): filtering, caching, logging, client IP chhupana. Example: Squid.</li>
      <li>HTTPS ke saath forward proxy aam taur pe sirf domain dekhta hai (CONNECT tunnel), jab tak TLS inspection (company ka certificate) na ho.</li>
      <li>Reverse proxy = servers ki taraf: TLS termination, load balancing, caching, compression, URL routing, WAF/rate limiting, slow clients ki buffering, servers chhupana. Example: NGINX, HAProxy, Envoy, Cloudflare.</li>
      <li>Load Balancer, CDN, API Gateway: sab reverse proxy ke roop hain.</li>
      <li>Peeche ke server ko user ka asli IP X-Forwarded-For / Forwarded header se milta hai: sirf apne proxy ka joda hua maano.</li>
      <li>502/504 = proxy zinda hai, peeche wala nahi. Har proxy ek extra hop aur SPOF: do rakho.</li>
      <li>VPN ≠ forward proxy: VPN poore device ka saara traffic encrypt karke tunnel karta hai.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Servers chhupe aur safe, sirf proxy internet pe', 'TLS, caching, compression ek jagah', 'URL ke hisaab se routing, servers add/remove karna users ko pata nahi chalta', 'Cache se app servers pe bojh bahut kam', 'Office mein filtering, caching aur hisaab ek jagah (forward)'], costs: ['Ek extra hop, thodi latency', 'Proxy khud SPOF ban sakta hai (redundancy chahiye)', 'Config galat hua to poori site pe asar', 'Proxy sab dekh sakta hai: bharosa us pe shift hota hai', 'Asli client IP ke liye headers pe nirbharta (aur unka spoof hona)'] },
    { type: 'think', questions: [
      { q: 'xyz.com ke peeche 10 servers hain. Ek user ke browser ko kitne IP addresses dikhte hain?', a: 'Sirf ek (ya CDN ke kuch): reverse proxy/load balancer ka. Peeche ke servers ke private IPs user kabhi nahi dekhta.' },
      { q: 'TLS termination proxy pe karne ka ek faayda aur ek risk batao.', a: 'Faayda: servers ka CPU bacha, certificates ek jagah manage, aur proxy request padh ke routing/caching/WAF kar sakta hai. Risk: proxy aur servers ke beech traffic agar unencrypted hai to andar ke network pe bharosa karna padta hai; sensitive systems mein andar bhi TLS (re-encryption ya mTLS) rakhte hain.' },
      { q: 'Tumhare app ke logs mein har user ka IP 10.0.0.5 aa raha hai, aur IP-based rate limit sab users ko ek saath block kar raha hai. Kya galti hai?', a: '10.0.0.5 reverse proxy (NGINX/LB) ka IP hai. App ko asli IP X-Forwarded-For se lena chahiye, aur sirf apne bharosemand proxy ka joda hua hissa maanna chahiye (client khud bhi ye header bhej ke jhooth bol sakta hai).' },
      { q: 'Production servers hack ho jaayein to wo data bahar bhej sakte hain. Proxy se ise kaise mushkil banaoge?', a: 'Egress forward proxy: servers ko internet tak seedha raasta mat do (firewall se band), sirf ek proxy ke through, jo sirf allowed domains (payment gateway, SMS provider) khulne de aur sab log kare. Hack hua server anjaan jagah data nahi bhej paayega.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Office ka proxy jo employees ke liye kuch sites block karta hai:', options: ['Forward proxy', 'Reverse proxy', 'CDN'], answer: 0, explain: 'Clients ki taraf se kaam kar raha hai.' },
      { q: 'NGINX jo xyz.com ke servers ke aage TLS aur routing karta hai:', options: ['Forward proxy', 'Reverse proxy', 'DNS'], answer: 1, explain: 'Servers ki taraf se kaam kar raha hai.' },
      { q: 'Load Balancer kis type ka proxy hai?', options: ['Forward', 'Reverse', 'Proxy hai hi nahi'], answer: 1, explain: 'Users ki requests lekar servers ko deta hai, servers ki taraf khada hai.' },
      { q: 'HTTPS site kholte waqt normal forward proxy (bina TLS inspection) ko kya dikhta hai?', options: ['Poora page aur password', 'Sirf domain ka naam (CONNECT xyz.com:443)', 'Kuch bhi nahi, IP bhi nahi'], answer: 1, explain: 'Proxy sirf tunnel banata hai. TLS browser aur site ke beech hai, to content proxy nahi padh sakta.' },
      { q: 'User ko "502 Bad Gateway" dikha. Iska sabse sambhav matlab?', options: ['User ka internet band', 'Reverse proxy zinda hai, lekin peeche ke server ne sahi jawab nahi diya', 'DNS galat hai'], answer: 1, explain: '502/504 proxy deta hai jab upstream (peeche wala server) fail ho ya timeout ho.' },
      { q: 'Reverse proxy ke peeche app ko user ka asli IP kaise milta hai?', options: ['TCP connection ke source IP se', 'X-Forwarded-For / Forwarded header se, jo proxy jodta hai', 'Nahi mil sakta'], answer: 1, explain: 'TCP source IP proxy ka hota hai. Proxy asli IP header mein likh deta hai.' },
    ]},
    { type: 'sources', note: 'Proxy ke features aur headers inhi docs se check kiye.', items: [
      { title: 'What is a reverse proxy? Proxy servers explained', publisher: 'Cloudflare Learning Center', official: true, url: 'https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/', used: 'Forward proxy sits in front of clients, reverse proxy in front of origin servers; load balancing, security, caching benefits.' },
      { title: 'Module ngx_http_proxy_module', publisher: 'NGINX documentation', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html', used: 'proxy_pass, proxy_set_header with $proxy_add_x_forwarded_for, response buffering, proxy_cache.' },
      { title: 'Squid Web Proxy Cache', publisher: 'Squid project', official: true, url: 'https://www.squid-cache.org/', used: 'Caching forward proxy, also usable as a reverse proxy (accelerator).' },
      { title: 'RFC 9110: HTTP Semantics (CONNECT, 502, 504)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110.html', used: 'CONNECT method creates a tunnel; 502 Bad Gateway and 504 Gateway Timeout come from a gateway or proxy.' },
      { title: 'RFC 7239: Forwarded HTTP Extension', publisher: 'IETF', official: true, year: 2014, url: 'https://www.rfc-editor.org/rfc/rfc7239.html', used: 'Standard Forwarded header for the original client IP; X-Forwarded-For as the older de facto version.' },
      { title: 'What is Envoy', publisher: 'Envoy documentation', official: true, url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy', used: 'L4/L7 proxy designed to run as a sidecar next to each service.' },
    ]},
  ],
});
