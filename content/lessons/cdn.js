Lesson.register({
  id: 'cdn',
  title: 'CDN (Content Delivery Network)',
  minutes: 40,
  summary: `CDN duniya bhar mein faile hue caching servers ka network hai. Chennai ka user image Chennai ke paas wale server se leta hai, America se nahi. Isse speed bhi milti hai aur tumhare servers ka bojh bhi kam hota hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ke servers America mein hain. Chennai ka user jab bhi koi photo kholta hai, request aadhi duniya ghoom ke jaati hai aur wapas aati hai. Har baar.<br>Socho agar xyz.com ki photos, videos aur CSS ki <strong>copies</strong> Chennai, Delhi, Mumbai jaise shehron mein pehle se rakhi hon. User ko paas wali copy mil jaaye: tez. Aur America wala server aaraam kare.<br>Yahi <strong>CDN</strong> hai: duniya bhar mein faile cache servers. Is lesson mein dekhenge ye kaise kaam karta hai, kya isme rakhna chahiye, purani copy kaise hataate hain, aur private video ko chori se kaise bachaate hain.` },

    { type: 'h2', text: 'Problem: doori' },
    { type: 'p', html: `xyz.com ke servers US (Virginia) mein hain. Chennai ka user ek 2 MB ki image maangta hai. Do problems hain: <strong>latency</strong> (jawab aane mein kitna time) aur <strong>load</strong> (crores users ka saara image/video traffic tumhare servers aur unke internet bill pe).` },
    { type: 'callout', tone: 'term', title: 'Yaad karo: round trip (RTT)', html: `<strong>Ye kya hai:</strong> ek message ka user se server tak jaana aur jawab ka wapas aana. Is poore chakkar ka time = <strong>RTT</strong> (round-trip time).<br><strong>Kyun zaroori:</strong> roshni bhi fiber cable mein ~2 lakh km per second chalti hai, usse tez kuch nahi. Chennai se Virginia ~14,000 km hai, aur cable seedhi nahi jaati. Isliye ek RTT ~200-250 ms.<br><strong>Aur:</strong> naya HTTPS connection banane mein hi kai RTT lagte hain (TCP handshake 1, TLS 1.3 handshake 1, phir asli request 1). "How the web works" lesson mein ye dekha tha.<br><strong>Matlab:</strong> server kitna bhi tez ho, doori ka time code se kam nahi hota. Sirf server ko <em>paas</em> laake kam hota hai.` },
    { type: 'p', html: `Khud hisaab lagao. Shehar chuno aur dekho: seedha US origin se, paas wale CDN edge se (HIT), aur edge pe na mile to (MISS) kitna time lagta hai:` },
    { type: 'custom', render(el) {
      const T = { city: 'User ka shehar', tls: 'Connection', direct: 'Seedha US origin se', hit: 'Paas ke edge se (HIT)', miss: 'Edge pe MISS (edge → origin)', rtt: 'RTT',
        cities: { chn: ['Chennai', 14100], del: ['Delhi', 12050], mum: ['Mumbai', 13050], ldn: ['London', 5900] },
        tlsOpt: { t13: 'Naya HTTPS, TLS 1.3 (3 RTT)', t12: 'Naya HTTPS, TLS 1.2 (4 RTT)', warm: 'Pehle se khula connection (1 RTT)' },
        note: 'Model: RTT ≈ 10 ms (ghar ka WiFi/mobile network) + doori × 0.015 ms per km (fiber mein roshni ~2 lakh km/s, aur raasta seedha nahi, isliye ~1.5 guna). Edge user se ~30 km door. MISS pe edge ka origin se connection pehle se khula (warm) hota hai, to bas 1 lamba RTT judta hai. Download ka time alag hai, yahan sirf intezaar ka time.' };
      let city = 'chn', mode = 't13';
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">${T.city}</div><div class="cdl-c" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"></div>
        <div style="font-size:14px;color:var(--ink-3);margin-top:12px">${T.tls}</div><div class="cdl-t" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"></div>
        <div class="cdl-bars" style="margin-top:14px;display:grid;gap:10px"></div>
        <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s);
      const chips = (box, map, get, set) => { box.innerHTML = ''; Object.keys(map).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = Array.isArray(map[k]) ? map[k][0] : map[k]; b.setAttribute('aria-pressed', get() === k); b.onclick = () => { set(k); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.cdl-c'), T.cities, () => city, k => city = k);
        chips(q('.cdl-t'), T.tlsOpt, () => mode, k => mode = k);
        const d = T.cities[city][1], n = mode === 't13' ? 3 : mode === 't12' ? 4 : 1;
        const far = d * 0.015, rttO = 10 + far, rttE = 10 + 30 * 0.015;
        const rows = [[T.direct, n * rttO, `${n} × ${Math.round(rttO)} ms`], [T.hit, n * rttE, `${n} × ${Math.round(rttE)} ms`], [T.miss, n * rttE + far, `${n} × ${Math.round(rttE)} + ${Math.round(far)} ms`]];
        const max = rows[0][1];
        q('.cdl-bars').innerHTML = rows.map(([a, v, f], i) => `<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;flex-wrap:wrap"><span>${a}</span><strong style="font-family:var(--f-mono)">${Math.round(v)} ms</strong></div><div style="height:12px;border-radius:6px;background:var(--line);margin-top:4px"><div style="height:12px;border-radius:6px;width:${Math.max(2, 100 * v / max).toFixed(1)}%;background:${i === 0 ? 'var(--red)' : i === 1 ? 'var(--green)' : 'var(--amber)'}"></div></div><div style="font-size:12px;color:var(--ink-3);font-family:var(--f-mono)">${f}</div></div>`).join('');
      };
      draw();
    }},
    { type: 'p', html: `Chennai, TLS 1.3: seedha US se ~665 ms sirf intezaar mein. Paas ke edge se HIT: ~31 ms, yaani ~20 guna tez. Aur MISS pe bhi ~243 ms, kyunki edge aur origin ke beech ka connection pehle se khula hai: user ke teen chhote RTT, aur bas ek lamba.` },
    { type: 'h2', text: 'CDN kya hai?' },
    { type: 'p', html: `Cache lesson mein humne RAM mein data rakh ke database bachaya tha. CDN wahi idea hai, bas duniya ke level pe: content ki copies users ke shehar ke paas rakho.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDN (Content Delivery Network)', html: `<strong>Ye kya hai:</strong> ek company (jaise Cloudflare, Akamai, Amazon CloudFront) ke hazaaron cache servers, duniya ke sainkdon shehron mein. Tum unhe kiraye pe lete ho.<br><strong>Kyun chahiye:</strong> user ko paas ki copy milti hai (tez), aur tumhare servers tak sirf wo requests aati hain jo CDN ke paas nahi hain (sasta, kam load).<br><strong>Iske bina:</strong> har image, video, CSS file ke liye har user aadhi duniya door tumhare server tak, aur saara bandwidth ka bill tumhara.<br><strong>Example:</strong> xyz.com ka logo 1 crore baar dekha gaya. CDN ke saath tumhare server se shayad sirf kuch sau baar nikla (har edge ki pehli request), baaki sab edges se.` },
    { type: 'callout', tone: 'term', title: 'Naya word: edge server aur PoP', html: `<strong>Ye kya hai:</strong> <strong>PoP (Point of Presence)</strong> = kisi shehar mein CDN ka ek chhota data center. Uske andar ke cache servers ko <strong>edge servers</strong> kehte hain, kyunki wo network ke "kinaare" pe, users ke sabse paas baithe hain.<br><strong>Kyun chahiye:</strong> jitna paas, utna kam RTT.<br><strong>Iske bina:</strong> CDN bhi bas ek aur door ka server hota.<br><strong>Example:</strong> Chennai ka user Chennai PoP se, Delhi ka Delhi PoP se. Har PoP ka apna alag cache hota hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: origin', html: `<strong>Ye kya hai:</strong> tumhara asli server (ya storage), jahan original content rakha hai. CDN ke liye "source of truth".<br><strong>Kyun chahiye:</strong> edge ke paas koi file na ho (miss) to wo origin se laata hai.<br><strong>Iske bina:</strong> CDN ke paas laane ko kuch hota hi nahi. CDN origin ki jagah nahi leta, uske aage baithta hai.` },
    { type: 'image', src: 'assets/img/cdn/single-server-vs-cdn.jpg', alt: 'Do chitra: baayein ek akela server jisse saare computers tak lambi dotted lines jaati hain; daayein kai naarangi servers ek network mein faile hain, aur har computer ko paas wala server data deta hai', caption: 'Baayein: bina CDN, ek hi server sab users ko door se data bhejta hai. Daayein: CDN mein kai edge servers faile hain, aur har user ko paas wala server jawab deta hai.', credit: { text: 'Kanoha (original), vectorised by Д.Ильин, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NCDN_-_CDN.svg', license: 'CC0' } },

    { type: 'h2', text: 'User sabse paas wale edge tak kaise pahunchta hai?' },
    { type: 'p', html: `User ne bas <code>cdn.xyz.com</code> type kiya (ya page ne us address se image maangi). Usse kaise pata ki Chennai wala edge sabse paas hai? Do tareeke hain, aur bade CDN dono milake use karte hain:` },
    { type: 'table', head: ['Tareeka', 'Kaise kaam karta hai', 'Faayda', 'Kamzori'], rows: [
      ['<strong>DNS-based (GeoDNS)</strong>', 'CDN ka DNS server dekhta hai ki sawaal kahan se aaya, aur jawab mein us shehar ke edge ka IP deta hai. Chennai ko Chennai ka IP, Delhi ko Delhi ka.', 'Har user ko alag edge; load aur health ke hisaab se bhi jawab badal sakte hain', 'DNS answers cache hote hain (TTL), to badlaav dheere; user ka DNS resolver door ho to galat edge'],
      ['<strong>Anycast</strong>', 'Saare edges <em>ek hi IP</em> announce karte hain. Internet ke routers packet ko network ke hisaab se sabse paas wale edge tak le jaate hain (LB algorithms lesson mein dekha tha).', 'Ek IP, DNS ka jhanjhat nahi; ek PoP gira to traffic apne aap agle pe; DDoS baadh kai PoPs mein bant jaati hai', 'Routing "network mein paas" dekhti hai, hamesha "sabse tez" nahi'],
    ]},
    { type: 'p', html: `Example: Cloudflare apne network ke liye anycast use karta hai. CloudFront jaise CDN DNS se user ko paas wali edge location pe bhejte hain. Tumhe ye khud nahi banana; CDN ye sab sambhalta hai. Tumhara kaam bas DNS mein <code>cdn.xyz.com</code> ko CDN ki taraf point karna hai.` },

    { type: 'h2', text: 'Chala ke dekho' },
    { type: 'p', html: `Har scenario CDN ka ek kaam dikhata hai. Kisi bhi box pe click karo. "Origin shield" wale scenario mein ek naya box aata hai; uska poora explanation neeche hai, abhi bas itna samjho ki wo edges aur origin ke beech ek aur cache layer hai.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'uc', label: 'User, Chennai', x: 85, y: 90, w: 140, kind: 'client', info: 'Ye kya hai: Chennai ka ek xyz.com user. DNS (ya anycast) iski request sabse paas wale edge, yaani Chennai PoP, pe bhejta hai.' },
        { id: 'ud', label: 'User, Delhi', x: 85, y: 250, w: 140, kind: 'client', info: 'Ye kya hai: Delhi ka ek xyz.com user. Iski request Delhi PoP pe jaati hai. Chennai PoP ke cache se iska koi lena dena nahi.' },
        { id: 'ec', label: 'Edge: Chennai', sub: 'CDN PoP', x: 300, y: 90, w: 140, kind: 'net', info: 'Ye kya hai: Chennai mein CDN ka cache server (edge). Isme jo cached hai wo ~10-20 ms mein mil jaata hai. Nahi hai to origin (ya shield) se laata hai aur rakh leta hai.' },
        { id: 'ed', label: 'Edge: Delhi', sub: 'CDN PoP', x: 300, y: 250, w: 140, kind: 'net', info: 'Ye kya hai: Delhi mein CDN ka cache server. Iska cache Chennai se alag hai, isliye yahan ki pehli request alag se miss hoti hai.' },
        { id: 'sh', label: 'Origin shield', sub: 'ek beech ki layer', x: 480, y: 170, w: 140, kind: 'net', hidden: true, info: 'Ye kya hai: edges aur origin ke beech ek badi cache layer. Edges seedha origin pe jaane ki jagah pehle isse poochhte hain. Isse origin pe requests aur kam ho jaati hain.' },
        { id: 'o', label: 'Origin', sub: 'xyz.com, US', x: 650, y: 170, w: 120, kind: 'server', meter: true, load: 5, info: 'Ye kya hai: xyz.com ka asli server, US mein. Original files yahin hain. CDN ka kaam iska bojh aur bandwidth bill kam karna hai. Meter dikhata hai ye kitna busy hai.' },
      ],
      edges: [
        { a: 'uc', b: 'ec' }, { a: 'ud', b: 'ed' },
        { a: 'ec', b: 'o', id: 'co' }, { a: 'ed', b: 'o', id: 'do' },
        { a: 'ec', b: 'sh' }, { a: 'ed', b: 'sh' }, { a: 'sh', b: 'o' },
      ],
      scenarios: [
        { name: 'Pehli request (miss)', steps: [
          { title: 'Chennai user logo maangta hai', go: 'uc>ec', text: 'Request paas wale edge pe gayi, US nahi.', msg: 'GET https://cdn.xyz.com/logo.png' },
          { title: 'Edge ke paas nahi hai: MISS', text: 'Ye file Chennai edge pe pehli baar maangi gayi. Edge origin se laata hai (ek baar ki lambi yatra).', set: { ec: { state: 'miss', sub: 'MISS' } }, go: ['ec>o', 'res:o>ec'], after: { o: { load: 15 } } },
          { title: 'Edge copy rakh leta hai', text: 'Origin ne response ke saath ek header bheja jo batata hai ki copy kitni der rakhni hai (1 din). Headers ka poora khel neeche hai.', set: { ec: { state: '', sub: 'logo.png cached' } }, go: 'res:ec>uc', msg: 'Cache-Control: public, max-age=86400   (1 din)' },
        ]},
        { name: 'Agli requests (hit)', steps: [
          { title: 'Chennai ke 1000 aur users', text: 'Sab edge se hi. Origin ko pata bhi nahi chala.', flood: { paths: ['uc>ec'], n: 10 }, after: { ec: { state: 'hit', sub: 'HIT' } } },
          { title: 'Tez jawab', go: 'res:ec>uc', text: '~200+ ms ki jagah ~10-20 ms. Aur origin ka load wahi ka wahi.', set: { o: { state: 'ok' } } },
          { title: 'Delhi ka pehla user', text: 'Har edge ka cache alag hai. Delhi edge pe pehli baar, to wahan ek miss hoga, phir sab hits.', go: ['ud>ed', 'ed>o', 'res:o>ed', 'res:ed>ud'], set: { ed: { sub: 'MISS, phir cached' } } },
        ]},
        { name: 'Live score, crores users', intro: 'xyz.com pe live cricket score page hai. Score JSON sabke liye same hai. App har 5 second mein poll karti hai (dobara poochhti hai).', steps: [
          { title: 'Lakhon polls', text: 'Score file ko 2 second ka TTL diya hai. Saare polls edges pe khatam.', flood: { paths: ['uc>ec', 'ud>ed'], n: 18 }, after: { ec: { state: 'hit', sub: 'score.json (TTL 2s)' }, ed: { state: 'hit', sub: 'score.json (TTL 2s)' } }, msg: 'Cache-Control: public, max-age=2' },
          { title: 'TTL khatam: har edge sirf ek baar origin se', text: 'Har 2 second mein har edge se ~1 request origin pe. 100 edges = ~50 requests/sec origin pe, jabki users bhej rahe hain lakhon/sec.', parallel: true, go: ['ec>o', 'ed>o'], after: { o: { load: 20 } } },
          { title: 'Naya score sab tak', parallel: true, go: ['res:o>ec>uc', 'res:o>ed>ud'], text: 'Users ko score zyada se zyada ~2-5 second purana dikhta hai. Live score ke liye ye chalta hai, aur bachat zabardast.' },
        ]},
        { name: 'Origin shield', intro: '200 edges hain. Naya video aaya. Har edge ka pehla miss origin pe jaayega: 200 requests ek saath.', steps: [
          { title: 'Shield layer lagao', text: 'Edges ab seedha origin nahi, ek shield (ya regional cache) se poochhte hain.', show: ['sh'], hide: ['co', 'do'], focus: ['sh'] },
          { title: 'Dono edges miss', parallel: true, go: ['uc>ec>sh', 'ud>ed>sh'], text: 'Dono edges ne shield se maanga.' },
          { title: 'Shield sirf ek baar origin jaata hai', go: ['sh>o', 'res:o>sh'], text: 'Origin pe 200 ki jagah 1 request.', after: { o: { load: 8 } } },
          { title: 'Dono edges ko copy', parallel: true, go: ['res:sh>ec>uc', 'res:sh>ed>ud'], text: 'Bade video/live events mein ye layer origin ko girne se bachati hai.' },
        ]},
        { name: 'Origin down', steps: [
          { title: 'Origin crash', set: { o: { state: 'down', sub: 'DOWN', load: 0 } }, text: 'US server gir gaya.', focus: ['o'] },
          { title: 'Jo cached hai wo chalta rehta hai', text: 'Edge ke paas logo, CSS, images ki copies hain. Users ko site ka static hissa dikhta rehta hai.', go: ['uc>ec', 'res:ec>uc'], after: { ec: { state: 'hit' } } },
          { title: 'Expired content bhi?', text: 'CDN ko bata sakte ho: "origin error de to purani copy de do" (<code>stale-if-error</code>). Thoda purana content error page se behtar hai.', go: ['ud>ed', 'lost:ed>o', 'res:ed>ud'], msg: 'Cache-Control: max-age=60, stale-if-error=86400' },
        ]},
      ],
    },
    { type: 'h2', text: 'Pull CDN vs push CDN' },
    { type: 'p', html: `File edge tak pahunchti kaise hai? Do tareeke:` },
    { type: 'callout', tone: 'term', title: 'Naye words: pull CDN aur push CDN', html: `<strong>Pull CDN:</strong> tum kuch upload nahi karte. Edge pe file na mile to edge <em>khud</em> origin se kheench (pull) laata hai aur cache kar leta hai. Upar ka flow pull hi tha. Sabse common.<br><strong>Push CDN:</strong> tum file pehle se CDN ki storage mein daal (push) dete ho. CDN wahan se edges ko deta hai. Origin server ki zaroorat hi nahi, ya kam.<br><strong>Kyun dono:</strong> pull aasaan hai aur sirf wahi cache hota hai jo maanga gaya. Push tab kaam ka hai jab file badi ho, kam badle, aur tumhe pakka chahiye ki launch ke pehle second se sab jagah ho.` },
    { type: 'table', head: ['', 'Pull', 'Push'], rows: [
      ['Pehli request', 'Har edge pe pehli request miss (thodi slow)', 'Pehle se maujood, miss nahi'],
      ['Tumhara kaam', 'Bas DNS point karo aur headers sahi rakho', 'Har nayi/badli file upload karo, purani hatao'],
      ['Storage', 'Sirf maangi gayi files edges pe', 'Tum jo bhi push karo, uska kharcha'],
      ['Kab', 'Websites, images, APIs: almost hamesha', 'Game updates, bade app downloads, ek bada launch'],
    ]},
    { type: 'p', html: `<strong>Chhota sa hisaab:</strong> 300 PoPs, ek naya 50 MB game update. Pull mein har PoP ki pehli request origin tak: 300 × 50 MB = 15 GB origin se, aur pehle users ko thoda intezaar. Push mein tumne ek baar CDN storage mein 50 MB daala, CDN ne andar hi andar baant diya. (Agle hisse ka "origin shield" pull wali problem ko bhi kaafi kam kar deta hai.)` },

    { type: 'h2', text: 'Cache key: "ye wahi file hai" kaise pehchaanein?' },
    { type: 'callout', tone: 'term', title: 'Naya word: cache key', html: `<strong>Ye kya hai:</strong> wo naam jisse edge apne cache mein file dhoondhta hai. Aam taur pe host + path + query string, jaise <code>cdn.xyz.com/app.js?v=3</code>.<br><strong>Kyun zaroori:</strong> do requests ki key same hai to doosri HIT. Key alag to MISS, chahe file bilkul same ho.<br><strong>Iske bina samjhe:</strong> key mein faltu cheezein (har user ki cookie, tracking parameters) aa gayin to har request "nayi" lagti hai aur hit rate gir jaata hai. Aur ulta: zaroori cheez key mein na ho (jaise language), to ek user ka page doosre ko mil jaata hai.<br><strong>Example:</strong> <code>logo.png?utm_source=whatsapp</code> aur <code>logo.png?utm_source=insta</code> ek hi image hai. Query string key mein rahi to do alag copies, do misses.` },
    { type: 'p', html: `Neeche ek edge pe <code>app.js</code> ki 2,000 requests aati hain (seeded random, har baar same). 40% requests mein ek tracking parameter (<code>?utm_source=...</code>, 20 alag values) laga hai, users 500 alag hain (har ek ki alag cookie), aur browsers do tarah ka compression maangte hain (<code>gzip</code> ya <code>br</code>). Chuno ki cache key mein kya kya shaamil ho, aur hit rate dekho:` },
    { type: 'custom', render(el) {
      const T = { parts: { q: 'Query string', c: 'Cookie (user)', e: 'Accept-Encoding' }, keys: 'Alag cache keys', hit: 'Hit rate', origin: 'Origin tak requests', on: 'key mein', off: 'key se bahar',
        warnC: 'Cookie key mein hai: har user ki apni copy. Static file ke liye bekaar, hit rate gira.', warnE: 'Encoding key mein hai: gzip aur br ki do alag copies. Ye sahi hai, kyunki dono files ke bytes alag hain (CDN ise Vary: Accept-Encoding se karte hain).', base: 'Sirf path: sab requests ek hi key. Ek miss, baaki sab hits.' };
      const N = 2000;
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const reqs = [];
      for (let i = 0; i < N; i++) reqs.push({ q: rnd() < 0.4 ? 'utm' + Math.floor(rnd() * 20) : '', c: 'u' + Math.floor(rnd() * 500), e: rnd() < 0.5 ? 'gzip' : 'br' });
      const on = { q: true, c: false, e: false };
      el.innerHTML = `<div class="cck-p" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="calc-note cck-key" style="font-family:var(--f-mono)"></div>
        <div class="stats"><div class="stat"><span>${T.keys}</span><strong class="cck-k"></strong></div><div class="stat"><span>${T.hit}</span><strong class="cck-h"></strong></div><div class="stat"><span>${T.origin}</span><strong class="cck-o"></strong></div></div>
        <div class="calc-note cck-n"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        const box = q('.cck-p'); box.innerHTML = '';
        Object.keys(T.parts).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on[k] ? ' on' : ''); b.textContent = T.parts[k] + ': ' + (on[k] ? T.on : T.off); b.setAttribute('aria-pressed', on[k]); b.onclick = () => { on[k] = !on[k]; draw(); }; box.appendChild(b); });
        const set = new Set(reqs.map(r => ['app.js', on.q ? r.q : '', on.c ? r.c : '', on.e ? r.e : ''].join('|')));
        const k = set.size;
        q('.cck-key').textContent = 'key = cdn.xyz.com/app.js' + (on.q ? ' + ?query' : '') + (on.c ? ' + cookie' : '') + (on.e ? ' + encoding' : '');
        q('.cck-k').textContent = k.toLocaleString('en-IN');
        q('.cck-h').textContent = (100 * (N - k) / N).toFixed(1) + '%';
        q('.cck-o').textContent = k.toLocaleString('en-IN');
        q('.cck-n').textContent = on.c ? T.warnC : on.e ? T.warnE : (on.q ? '' : T.base);
      };
      draw();
    }},
    { type: 'p', html: `Nateeja: sirf path pe key = 1 key, hit rate ~100%. Query string bhi = 21 keys (99%). Cookie daali = 492 keys, hit rate <strong>75%</strong> pe gira. Query + cookie = 1,209 keys, sirf <strong>40%</strong>. Seekh: static files ki key se cookies aur tracking parameters hatao (CDN settings mein "ignore query string" ya allow-list). Lekin jo cheez sach mein response badalti hai (version <code>?v=3</code>, language, encoding), wo key mein rakho.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "CDN pe daala to sab cache ho gaya"', html: `CDN pe daalna kaafi nahi. Agar origin <code>Set-Cookie</code> bhejta hai, ya <code>Cache-Control</code> header hi nahi bhejta, ya cache key mein har user ki cookie hai, to CDN bas ek mehnga proxy ban jaata hai: har request origin tak. Hamesha CDN ke dashboard mein <strong>cache hit ratio</strong> dekho, aur response ke headers mein <code>Age</code> ya <code>X-Cache: HIT</code> jaisa header check karo.` },
    { type: 'h2', text: 'TTL aur Cache-Control headers: kitni der rakhein?' },
    { type: 'p', html: `Edge ko kaise pata ki logo 1 din rakhna hai aur live score sirf 2 second? <strong>Origin batata hai</strong>, har response ke saath ek header bhej ke.` },
    { type: 'callout', tone: 'term', title: 'Naya word: HTTP header aur Cache-Control', html: `<strong>Ye kya hai:</strong> <strong>header</strong> = response ke saath chipki chhoti "naam: value" lines, jo asli content nahi, uske baare mein jaankari hoti hain. <strong>Cache-Control</strong> wo header hai jo batata hai ki is response ko kaun (browser, CDN) aur kitni der cache kar sakta hai.<br><strong>Kyun chahiye:</strong> har file ki zaroorat alag hai. Ek header se tum file-by-file control karte ho.<br><strong>Iske bina:</strong> CDN apne hisaab se andaza lagata hai (ya cache hi nahi karta), aur private data galti se cache ho sakta hai.` },
    { type: 'table', head: ['Directive', 'Matlab', 'Kab'], rows: [
      ['<code>max-age=N</code>', 'N second tak copy "fresh" hai, server se poochhne ki zaroorat nahi (browser aur CDN dono ke liye)', 'Lagbhag har cacheable response'],
      ['<code>s-maxage=N</code>', 'Sirf <em>shared</em> caches (CDN) ke liye max-age; browser ise ignore karta hai', 'CDN pe lamba, browser pe chhota rakhna ho'],
      ['<code>public</code> / <code>private</code>', 'public = CDN bhi rakh sakta hai. private = sirf user ka browser, CDN nahi', 'private: user-specific pages'],
      ['<code>no-cache</code>', 'Copy rakh sakte ho, lekin har baar use karne se pehle origin se poochho "badla to nahi?"', 'Jahan hamesha taaza chahiye par bytes bachane hain'],
      ['<code>no-store</code>', 'Kahin bhi store mat karo', 'Bank details, OTP, payment pages'],
      ['<code>stale-while-revalidate=N</code>', 'Expire hone ke baad N second tak purani copy <em>turant</em> de do, aur peeche se taaza le aao', 'Live score, feeds: speed > ekdum taaza'],
      ['<code>stale-if-error=N</code>', 'Origin error de to N second tak purani copy chalao', 'Origin down hone pe bhi site chale'],
      ['<code>immutable</code>', 'Ye file kabhi nahi badlegi, dobara poochhna hi mat', 'Versioned files: <code>app.3f9a1c.js</code>'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: revalidation (ETag aur 304)', html: `<strong>Ye kya hai:</strong> copy expire ho gayi, lekin shayad file badli hi nahi. To poori file dobara mangaane ki jagah cache poochhta hai: "mere paas version <code>\"abc123\"</code> hai, badla?" Ye version-tag <strong>ETag</strong> header hai. File nahi badli to origin chhota sa jawab deta hai: <strong>304 Not Modified</strong> (bina body ke).<br><strong>Kyun chahiye:</strong> 2 MB ki jagah kuch bytes. Taaza hone ka bharosa bhi, bandwidth bhi bachi.<br><strong>Iske bina:</strong> har expiry pe poori file dobara download.` },
    { type: 'p', html: `Ab khelo. Ek header chuno, phir time chuno (pehli request ke kitni der baad agli request aayi), aur dekho CDN aur browser kya karte hain:` },
    { type: 'custom', render(el) {
      const T = { hdr: 'Header', time: 'Agli request kab', cdn: 'CDN edge kya karega', br: 'Browser kya karega',
        P: [
          { h: 'public, max-age=86400', what: 'logo.png', ma: 86400 },
          { h: 'public, max-age=60, s-maxage=600', what: 'trending.json', ma: 60, sma: 600 },
          { h: 'public, max-age=2, stale-while-revalidate=30', what: 'score.json', ma: 2, swr: 30 },
          { h: 'private, max-age=300', what: '/my-profile', ma: 300, priv: 1 },
          { h: 'no-cache', what: 'news.html', nc: 1 },
          { h: 'no-store', what: '/bank/balance', ns: 1 },
          { h: 'public, max-age=31536000, immutable', what: 'app.3f9a1c.js', ma: 31536000, imm: 1 },
        ],
        times: [[1, '1 s baad'], [10, '10 s baad'], [45, '45 s baad'], [300, '5 min baad'], [7200, '2 ghante baad'], [172800, '2 din baad']],
        r: { origin: 'Store hi nahi kiya: request seedha origin tak (MISS).', priv: 'private hai: CDN copy nahi rakhta. Request origin tak jaati hai.', nc: 'Copy hai, lekin pehle origin se poochhta hai (ETag). Nahi badli to 304, chhota sa jawab.', fresh: s => `HIT: copy fresh hai (abhi ${s} aur).`, swr: 'Expire ho gayi, lekin stale-while-revalidate: purani copy turant di, peeche se origin se taaza mangwa li.', exp: 'Expire ho gayi: origin se dobara (ETag ho to 304, warna poori file).', imm: s => `HIT: immutable aur fresh (abhi ${s} aur). Kabhi poochhta bhi nahi.`,
          bFresh: s => `Apni copy use karta hai, network pe request hi nahi jaati (abhi ${s} aur).`, bNs: 'Kuch store nahi karta. Har baar network se.', bNc: 'Copy rakhta hai, lekin har baar server se confirm karta hai (304).', bExp: 'Uski copy expire: CDN se dobara maangta hai.', bSwr: 'Purani copy turant dikhata hai aur peeche se nayi mangwa leta hai.' } };
      const dur = s => s >= 86400 ? Math.round(s / 86400) + ' din' : s >= 3600 ? Math.round(s / 3600) + ' ghante' : s >= 60 ? Math.round(s / 60) + ' min' : s + ' s';
      let pi = 0, ti = 0;
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-3)">${T.hdr}</div><div class="cch-h" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <div style="font-size:14px;color:var(--ink-3);margin-top:12px">${T.time}</div><div class="cch-t" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <pre class="ascii cch-x" style="margin-top:12px;white-space:pre-wrap"></pre>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:4px">
          <div style="padding:10px 12px;border-radius:var(--r);border:1px solid var(--net-s);background:var(--net-f);color:var(--net-t)"><div style="font-size:13px;font-weight:600">${T.cdn}</div><div class="cch-c" style="font-size:14px;margin-top:4px"></div></div>
          <div style="padding:10px 12px;border-radius:var(--r);border:1px solid var(--client-s);background:var(--client-f);color:var(--client-t)"><div style="font-size:13px;font-weight:600">${T.br}</div><div class="cch-b" style="font-size:14px;margin-top:4px"></div></div>
        </div>`;
      const q = s => el.querySelector(s);
      const cdnSays = (p, t) => {
        if (p.ns) return T.r.origin; if (p.priv) return T.r.priv; if (p.nc) return T.r.nc;
        const f = p.sma != null ? p.sma : p.ma;
        if (t < f) return p.imm ? T.r.imm(dur(f - t)) : T.r.fresh(dur(f - t));
        if (p.swr && t < f + p.swr) return T.r.swr;
        return T.r.exp;
      };
      const brSays = (p, t) => {
        if (p.ns) return T.r.bNs; if (p.nc) return T.r.bNc;
        if (t < p.ma) return T.r.bFresh(dur(p.ma - t));
        if (p.swr && t < p.ma + p.swr) return T.r.bSwr;
        return T.r.bExp;
      };
      const draw = () => {
        const hb = q('.cch-h'); hb.innerHTML = '';
        T.P.forEach((p, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === pi ? ' on' : ''); b.textContent = p.what; b.setAttribute('aria-pressed', i === pi); b.onclick = () => { pi = i; draw(); }; hb.appendChild(b); });
        const tb = q('.cch-t'); tb.innerHTML = '';
        T.times.forEach(([s, l], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === ti ? ' on' : ''); b.textContent = l; b.setAttribute('aria-pressed', i === ti); b.onclick = () => { ti = i; draw(); }; tb.appendChild(b); });
        const p = T.P[pi], t = T.times[ti][0];
        q('.cch-x').textContent = 'GET ' + p.what + '\n← 200 OK\n   Cache-Control: ' + p.h;
        q('.cch-c').textContent = cdnSays(p, t);
        q('.cch-b').textContent = brSays(p, t);
      };
      draw();
    }},
    { type: 'p', html: `Do cheezein zaroor try karo. (1) <code>trending.json</code> "5 min baad": browser ki copy (60 s) expire, lekin CDN ki (s-maxage 600 s) abhi fresh. Browser CDN se maangta hai aur CDN se hi mil jaata hai, origin tak kuch nahi. (2) <code>score.json</code> "10 s baad": copy 2 s pe expire ho chuki, lekin stale-while-revalidate ke 30 s ke andar: user ko purani copy turant, aur peeche se taaza. "45 s baad" (2 + 30 s ke bhi baad): ab origin se dobara.` },
    { type: 'h2', text: 'Purana content kaise hataayein: purge aur versioned URLs' },
    { type: 'p', html: `Galti se galat banner image upload ho gayi, aur uska TTL 1 din hai. Duniya ke sainkdon edges pe purani copy padi hai. TTL ka intezaar karoge to poora din galat image dikhegi. Do raaste hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: purge (invalidation)', html: `<strong>Ye kya hai:</strong> CDN ko order dena ki "is URL (ya is tag/prefix wali saari files) ki copy har edge se abhi hata do". Agli request miss hogi aur origin se taaza aayega.<br><strong>Kyun chahiye:</strong> TTL se pehle galti theek karni ho.<br><strong>Iske bina:</strong> TTL khatam hone tak galat content.<br><strong>Dhyaan:</strong> purge ke baad saare edges ek saath miss karte hain, to origin pe ek chhoti si baadh aati hai. Aur purge sab jagah pahunchne mein thoda time lagta hai; Cloudflare ne 2024 ki ek post mein apna global purge average 150 ms se kam bataya, doosre CDNs mein ye seconds se minutes tak ho sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: versioned URL (cache busting)', html: `<strong>Ye kya hai:</strong> file badle to uska <em>naam</em> badal do. Naam mein content ka hash daalo: <code>app.3f9a1c.js</code>. Naya deploy = naya naam, jaise <code>app.8b27e0.js</code>.<br><strong>Kyun chahiye:</strong> purana naam kabhi badlega hi nahi, to use 1 saal ke TTL + <code>immutable</code> de sakte ho. Naya HTML naye naam ko maangta hai, jo CDN pe miss hoke turant aa jaata hai.<br><strong>Iske bina:</strong> har deploy pe purge, aur kuch users ke browser mein purani JS + naya HTML ka gadbad mel.<br><strong>Example:</strong> modern build tools (Vite, webpack) ye apne aap karte hain. HTML khud ko chhota TTL (ya <code>no-cache</code>) do, kyunki naye naam usi mein likhe hain.` },
    { type: 'table', head: ['', 'Purge', 'Versioned URL'], rows: [
      ['Kaise', 'CDN ke API/dashboard se "hatao" ka order', 'File ka naam hi badal do'],
      ['Speed', 'CDN pe depend: ms se minutes tak', 'Turant: naya naam kabhi cache mein tha hi nahi'],
      ['Origin pe asar', 'Purge ke baad sab edges ek saath miss', 'Sirf naya naam, dheere dheere'],
      ['Kab', 'Galti, legal takedown, URL badal nahi sakte (jaise /profile-photo/42)', 'JS, CSS, images jo build se banti hain: hamesha'],
    ]},

    { type: 'h2', text: 'Origin shield: edges ki bheed se origin ko bachao' },
    { type: 'callout', tone: 'term', title: 'Naya word: origin shield (tiered cache)', html: `<strong>Ye kya hai:</strong> edges aur origin ke beech ek badi, beech wali cache layer. Edge pe miss ho to edge seedha origin nahi jaata, pehle shield se poochhta hai. Kai CDN ise "tiered cache" ya "regional edge cache" bhi kehte hain.<br><strong>Kyun chahiye:</strong> 300 edges pe ek nayi file ke 300 misses ab origin pe 300 nahi, shield pe jaate hain, aur shield origin se sirf <strong>ek</strong> baar laata hai.<br><strong>Iske bina:</strong> naya video/episode aate hi har edge ki pehli request origin pe: origin pe baadh, aur bandwidth bill.<br><strong>Example:</strong> AWS CloudFront ke Origin Shield ke docs kehte hain ki ye requests ko "collapse" karke ek object ke liye origin tak kam se kam ek request tak le aata hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: request collapsing', html: `<strong>Ye kya hai:</strong> ek hi edge pe ek hi file ke liye 20 users ek saath miss karein, to edge origin se 20 baar nahi, <strong>ek</strong> baar maangta hai aur baaki 19 ko wahi jawab de deta hai. (Caching strategies lesson ka "single-flight / lock" yaad karo: same idea.)<br><strong>Iske bina:</strong> har edge pe har miss alag request, aur live events mein origin pe stampede.` },
    { type: 'p', html: `Ek naya episode release hua. Hisaab khud lagao: kitne PoPs pe log ek saath pehli baar maang rahe hain, aur origin pe kitni requests pahunchti hain:` },
    { type: 'custom', render(el) {
      const T = { n: 'PoPs (edges) jahan pehli request aayi', k: 'Har edge pe ek saath users', col: 'Edge pe request collapsing', sh: 'Origin shield', on: 'on', off: 'off', o: 'Origin pe requests', s: 'Shield pe requests', note: 'Har cheez ek naye object (jaise episode ka pehla video segment) ke liye. Shield khud bhi collapse karta hai, isliye wahan se origin tak 1.' };
      let col = false, sh = false;
      el.innerHTML = `<div class="row2">
          <div><label>${T.n}: <strong class="csh-nv"></strong><input class="csh-n" type="range" min="10" max="600" step="10" value="300"></label></div>
          <div><label>${T.k}: <strong class="csh-kv"></strong><input class="csh-k" type="range" min="1" max="100" step="1" value="20"></label></div>
        </div>
        <div class="csh-t" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="stats"><div class="stat"><span>${T.o}</span><strong class="csh-o"></strong></div><div class="stat"><span>${T.s}</span><strong class="csh-s"></strong></div></div>
        <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s), f = n => n.toLocaleString('en-IN');
      const draw = () => {
        const N = Number(q('.csh-n').value), K = Number(q('.csh-k').value);
        q('.csh-nv').textContent = N; q('.csh-kv').textContent = K;
        const box = q('.csh-t'); box.innerHTML = '';
        [[T.col, () => col, v => col = v], [T.sh, () => sh, v => sh = v]].forEach(([l, g, s]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (g() ? ' on' : ''); b.textContent = l + ': ' + (g() ? T.on : T.off); b.setAttribute('aria-pressed', g()); b.onclick = () => { s(!g()); draw(); }; box.appendChild(b); });
        const up = col ? N : N * K;
        q('.csh-o').textContent = f(sh ? 1 : up);
        q('.csh-s').textContent = sh ? f(up) : '-';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', draw));
      draw();
    }},
    { type: 'p', html: `300 PoPs, har ek pe 20 users: bina kisi bachaav ke origin pe <strong>6,000</strong> requests ek saath. Collapsing on: 300. Shield bhi on: origin pe sirf <strong>1</strong>. Keemat: miss pe ek aur hop (edge → shield → origin), aur shield ka apna kharcha.` },

    { type: 'h2', text: 'Dynamic content acceleration: jo cache nahi ho sakta, wo bhi tez' },
    { type: 'p', html: `Feed, cart, payment: har user ka alag, cache nahi kar sakte. Phir bhi CDN ke peeche rakhne se tez hota hai. Kaise? Upar wale pehle widget mein "MISS" wali line yaad karo.` },
    { type: 'callout', tone: 'term', title: 'Naya word: dynamic content acceleration', html: `<strong>Ye kya hai:</strong> CDN un requests ko bhi tez karta hai jo cache nahi hoti. Teen tareekon se: (1) user ka TCP + TLS handshake paas ke edge pe khatam hota hai (chhote RTT), (2) edge aur origin ke beech connections pehle se khule (warm) rehte hain, to har request pe naya handshake nahi, (3) CDN apne network pe tez raasta chunta hai (jaise Cloudflare Argo Smart Routing ya Akamai ke route optimisation products).<br><strong>Kyun chahiye:</strong> API calls bhi har baar aadhi duniya ke 3-4 RTT nahi lagatin.<br><strong>Iske bina:</strong> har naye connection pe user se origin tak poore handshake.<br><strong>Real example:</strong> Disney+ Hotstar ne 2024 ki apni engineering post mein bataya ki 2023 World Cup ke liye unke client apps ki saari calls pehle CDN pe aati hain, jo unka "external API gateway" hai: security checks aur routing wahi hote hain. Jo APIs cacheable thin (jaise scorecard) unhe CDN pe cache kiya, baaki ko andar bheja.` },

    { type: 'h2', text: 'Signed URLs: private video sirf sahi user ke liye' },
    { type: 'p', html: `Premium movie CDN pe hai. CDN ka kaam hai sabko file dena. To jisne paise nahi diye, wo link copy karke WhatsApp pe bhej de, to sab dekh lenge? Isse bachaane ka tareeka:` },
    { type: 'callout', tone: 'term', title: 'Naya word: signed URL', html: `<strong>Ye kya hai:</strong> ek URL jisme expiry time aur ek <strong>signature</strong> laga hota hai: <code>/movie.mp4?expires=1700000300&amp;sig=9f2c...</code>. Signature ek secret key se banta hai jo sirf tumhare server aur CDN ke paas hai.<br><strong>Kaise kaam karta hai:</strong> user login karke "play" dabata hai. Tumhara server check karta hai ki usne paise diye hain, phir 5 minute ka signed URL bana ke deta hai. Edge har request pe signature dobara banake match karta hai aur time dekhta hai. Match aur time baaki: file milti hai. Warna <code>403 Forbidden</code>.<br><strong>Kyun chahiye:</strong> CDN ko tumhare login system ka pata nahi; signature se bina tumhare server se poochhe edge khud faisla kar leta hai.<br><strong>Iske bina:</strong> link leak = content leak.<br><strong>Dhyaan:</strong> link ka koi bhi hissa (path ya expiry) badla, to signature match nahi karega. Cookie wala version (signed cookies) bhi hota hai, jab ek saath bahut saari files (jaise video ke saare segments) kholni hon.` },
    { type: 'p', html: `Khud try karo. Server ne 5 minute ka link diya hai. Ghadi aage badhao, ya link mein chhed-chhaad karo, aur dekho edge kya kehta hai. (Yahan signature ek chhota toy hash hai; asli CDN HMAC ya RSA jaise mazboot tareeke use karte hain.)` },
    { type: 'custom', render(el) {
      const T = { fresh: 'Naya link lo (5 min)', t1: 'Ghadi +1 min', t5: 'Ghadi +5 min', path: 'Link mein doosri movie daalo', exp: 'Expiry +1 din kar do', clock: 'Ghadi', left: 'Link ki umar', play: 'Edge pe bhejo',
        ok: 'Signature match, time baaki: <strong>200 OK</strong>, video chala.', badSig: 'Signature match nahi hua: kisi ne link badla hai. <strong>403 Forbidden</strong>.', expired: 'Signature sahi, lekin time khatam. <strong>403 Forbidden</strong>. User ko app se naya link lena hoga.',
        steps: (a, b) => `Edge ne khud hisaab lagaya: sig(path + expires + secret) = ${a}. Link mein sig = ${b}.` };
      const SECRET = 'xyz-cdn-secret';
      const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16).padStart(8, '0'); };
      let now, url, verdict;
      const issue = () => { const path = '/movies/final-match.mp4', exp = now + 300; url = { path, exp, sig: h(path + exp + SECRET) }; verdict = ''; };
      const reset = () => { now = 0; issue(); draw(); };
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-a="fresh">${T.fresh}</button>
          <button type="button" class="btn small" data-a="t1">${T.t1}</button>
          <button type="button" class="btn small" data-a="t5">${T.t5}</button>
          <button type="button" class="btn small" data-a="path">${T.path}</button>
          <button type="button" class="btn small" data-a="exp">${T.exp}</button>
          <button type="button" class="btn small primary" data-a="play">${T.play}</button>
        </div>
        <pre class="ascii csu-u" style="margin-top:12px;white-space:pre-wrap;word-break:break-all"></pre>
        <div class="stats"><div class="stat"><span>${T.clock}</span><strong class="csu-c"></strong></div><div class="stat"><span>${T.left}</span><strong class="csu-l"></strong></div></div>
        <div class="calc-note csu-v" style="min-height:2.6em"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        q('.csu-u').textContent = 'https://cdn.xyz.com' + url.path + '?expires=' + url.exp + '&sig=' + url.sig;
        q('.csu-c').textContent = now + ' s';
        q('.csu-l').textContent = Math.max(0, url.exp - now) + ' s';
        q('.csu-v').innerHTML = verdict;
      };
      const play = () => {
        const want = h(url.path + url.exp + SECRET);
        verdict = T.steps(want, url.sig) + ' ' + (want !== url.sig ? T.badSig : now >= url.exp ? T.expired : T.ok);
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'fresh') issue(); else if (a === 't1') now += 60; else if (a === 't5') now += 300;
        else if (a === 'path') url.path = '/movies/premium-film.mp4'; else if (a === 'exp') url.exp += 86400; else play();
        if (a !== 'play') verdict = '';
        draw();
      });
      reset();
    }},
    { type: 'p', html: `Ab purge, signed URL aur dynamic requests ko ek saath chala ke dekho. Is diagram mein ek nayi cheez hai: <strong>object storage</strong> (jaise Amazon S3), yaani files rakhne ki ek bahut badi, sasti jagah. Iska poora lesson aage aayega; abhi bas itna ki private videos wahan rakhi hain aur sirf CDN unhe padh sakta hai.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'xyz.com app', x: 75, y: 170, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ka user. Uski har request (image, video, API) pehle CDN edge pe aati hai.' },
        { id: 'e', label: 'CDN edge', sub: 'cache + checks', x: 262, y: 170, w: 150, kind: 'edge', info: 'Ye kya hai: user ke paas ka CDN server. Static files cache karta hai, signed URL ka signature aur expiry check karta hai, aur dynamic API calls ko warm connection se origin tak bhejta hai.' },
        { id: 'app', label: 'App server', sub: 'login, signs URLs', x: 480, y: 75, w: 160, kind: 'server', info: 'Ye kya hai: xyz.com ka asli code (origin). Login check karta hai, feed jaisi dynamic cheezein banata hai, aur jisne paise diye hain use signed URL banake deta hai.' },
        { id: 's', label: 'Object storage', sub: 'private videos', x: 480, y: 265, w: 160, kind: 'data', info: 'Ye kya hai: badi files rakhne ki sasti jagah (jaise Amazon S3). Bucket private hai: sirf CDN padh sakta hai, seedhe link se koi nahi.' },
        { id: 'ci', label: 'Deploy / admin', sub: 'purge API', x: 650, y: 170, w: 120, kind: 'queue', info: 'Ye kya hai: xyz.com ki deploy pipeline ya admin panel. Galti theek karni ho to CDN ke purge API ko order bhejta hai.' },
      ],
      edges: [{ a: 'u', b: 'e' }, { a: 'e', b: 'app' }, { a: 'e', b: 's' }, { a: 'ci', b: 'e' }],
      scenarios: [
        { name: 'Purge', intro: 'Galat banner.jpg upload ho gaya, TTL 1 din. Har edge pe galat copy.', steps: [
          { title: 'Edge pe galat copy', text: 'Users ko galat banner dikh raha hai.', go: ['u>e', 'res:e>u'], set: { e: { state: 'warn', sub: 'banner.jpg (galat)' } } },
          { title: 'Admin purge bhejta hai', text: 'CDN ke API ko order: is URL ki copy har edge se hatao. Asal mein ye order saare PoPs tak jaata hai.', go: 'evt:ci>e', after: { e: { state: '', sub: 'banner.jpg purged' } }, msg: 'POST /purge  {"files": ["https://cdn.xyz.com/banner.jpg"]}' },
          { title: 'Agli request: miss, taaza file', text: 'Edge ke paas copy nahi, to storage se nayi file laaya aur cache kiya.', go: ['u>e', 'e>s', 'res:s>e', 'res:e>u'], after: { e: { state: 'hit', sub: 'banner.jpg (sahi)' } } },
        ]},
        { name: 'Signed URL', intro: 'Riya ne premium plan liya hai aur movie chalana chahti hai.', steps: [
          { title: 'Play dabaya: app se link maango', text: 'Ye API call dynamic hai (Riya ka login check), cache nahi hoti. Edge use warm connection se app tak bhejta hai.', go: ['u>e>app'], msg: 'POST /play  {"movie": "final-match"}' },
          { title: 'App signed URL deta hai', text: 'App ne check kiya: plan active. 5 minute ka signed URL bana ke diya.', go: 'res:app>e>u', msg: '{"url": "/movie.mp4?expires=...&sig=9f2c..."}' },
          { title: 'Edge signature check karta hai', text: 'Signature match, time baaki. Edge ke paas file nahi thi, to private storage se laaya.', go: ['u>e', 'e>s', 'res:s>e', 'res:e>u'], after: { e: { state: 'hit', sub: 'sig OK' } } },
        ]},
        { name: 'Link leak (403)', intro: 'Riya ke link ko kisi ne copy karke group mein bhej diya. 1 ghante baad koi use kholta hai.', steps: [
          { title: 'Purana link edge pe', text: 'Edge ne signature check kiya: sahi hai, lekin expiry 55 minute pehle nikal chuki.', go: 'u>e', msg: 'GET /movie.mp4?expires=...&sig=9f2c...' },
          { title: '403 Forbidden', text: 'Edge ne wahin rok diya. Storage aur app ko pata bhi nahi chala. Link mein expiry badal ke try karo to signature match nahi karega: phir bhi 403.', go: 'bad:e>u', set: { e: { state: 'down', sub: '403: expired' } } },
        ]},
        { name: 'Dynamic API (no cache)', intro: 'Riya apni feed kholti hai. Har user ki alag, isliye cache nahi hogi.', steps: [
          { title: 'Request paas ke edge pe', text: 'TCP + TLS handshake Chennai edge pe khatam: chhote RTT.', go: 'u>e', msg: 'GET /api/feed   Cookie: session=...' },
          { title: 'Warm connection se origin', text: 'Edge ka app server se connection pehle se khula hai, to naya handshake nahi. Bas ek lamba RTT.', go: ['e>app', 'res:app>e'], msg: 'Cache-Control: private, no-store' },
          { title: 'Jawab, cache nahi kiya', text: 'Header ne kaha private, no-store: edge ne copy nahi rakhi. Agle user ko Riya ki feed kabhi nahi milegi.', go: 'res:e>u', set: { e: { state: 'ok', sub: 'not cached' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Video ke tukde (segments) CDN se' },
    { type: 'p', html: `Online video ek lambi file ki tarah nahi bheja jaata. Use 2-6 second ke chhote <strong>segments</strong> (alag alag files) mein kaata jaata hai, har quality (360p, 720p, 1080p) ke liye alag. Ek chhoti playlist file (<strong>manifest</strong>) batati hai ki kaunse tukde hain. Player ek ek tukda maangta hai.` },
    { type: 'list', items: [
      '<strong>CDN ke liye perfect:</strong> har tukda ek normal, chhoti file hai jo lakhon log same maangte hain. Pehle viewer ke baad sab edge se.',
      '<strong>Live match:</strong> naye tukde har kuch second mein bante hain, to manifest ka TTL bahut chhota (1-2 s), lekin tukde kabhi nahi badalte, to unka TTL lamba.',
      '<strong>Shield yahan sabse zaroori:</strong> naya tukda bante hi hazaaron edges ek saath maangte hain. Shield + collapsing ke bina origin doob jaaye.',
      'Hotstar jaise platform ka poora design (encoder, packager, ABR) "Design Hotstar" lesson mein hai.',
    ]},

    { type: 'h2', text: 'Multi-CDN: ek CDN kaafi nahi' },
    { type: 'callout', tone: 'term', title: 'Naya word: multi-CDN', html: `<strong>Ye kya hai:</strong> ek se zyada CDN companies (CDN A, CDN B) saath mein. Ek "steering" layer (aksar DNS) har user ko tay karti hai ki kaunsa CDN use kare.<br><strong>Kyun chahiye:</strong> (1) ek CDN gire ya kisi shehar mein slow ho, to traffic doosre pe, (2) bade live events mein ek CDN ki capacity bhi kam pad sakti hai, (3) daam pe mol-bhaav.<br><strong>Iske bina:</strong> CDN ka outage = tumhara outage.<br><strong>Keemat:</strong> do baar config, do bill, cache do jagah bant ta hai (hit rate thoda kam), aur purge dono pe karna padta hai.` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'v', label: 'Viewers', sub: 'poora India', x: 80, y: 160, w: 130, kind: 'client', info: 'Ye kya hai: live match dekh rahe crores users. Har ek ka player DNS se poochhta hai ki video kis CDN se lena hai.' },
        { id: 'st', label: 'DNS steering', sub: 'kaunsa CDN?', x: 262, y: 160, w: 150, kind: 'net', info: 'Ye kya hai: ek smart DNS (ya steering service) jo har user ko CDN A ya CDN B ka address deta hai, unki speed, errors aur capacity dekh ke.' },
        { id: 'a', label: 'CDN A', sub: 'edges', x: 470, y: 70, w: 140, kind: 'edge', info: 'Ye kya hai: pehli CDN company ke edges. Normal din mein traffic ka bada hissa.' },
        { id: 'b', label: 'CDN B', sub: 'edges', x: 470, y: 250, w: 140, kind: 'edge', info: 'Ye kya hai: doosri CDN company. Kuch traffic hamesha isse bhi jaata hai, taaki zaroorat pe ye "garam" aur tayyar ho.' },
        { id: 'sh', label: 'Origin shield', sub: 'aapka', x: 645, y: 160, w: 120, kind: 'server', info: 'Ye kya hai: tumhara shield + origin. Dono CDNs yahin se tukde laate hain, aur shield un dono ki requests collapse karta hai.' },
      ],
      edges: [{ a: 'v', b: 'st' }, { a: 'st', b: 'a' }, { a: 'st', b: 'b' }, { a: 'a', b: 'sh' }, { a: 'b', b: 'sh' }],
      scenarios: [
        { name: 'Normal din', steps: [
          { title: 'Steering traffic baant-ta hai', text: 'Maan lo 70% CDN A, 30% CDN B. Dono garam rehte hain.', flood: { paths: ['v>st>a', 'v>st>b'], n: 14 }, after: { a: { state: 'hit', sub: '70% traffic' }, b: { state: 'hit', sub: '30% traffic' } } },
          { title: 'Dono shield se', parallel: true, go: ['a>sh', 'b>sh'], text: 'Naye tukde ke liye dono CDNs shield se maangte hain. Origin pe sirf shield ki requests.' },
        ]},
        { name: 'CDN A slow', intro: 'Ek shehar mein CDN A ke edges pe errors badh gaye.', steps: [
          { title: 'Errors dikhe', text: 'Players aur monitoring batate hain ki CDN A slow hai.', set: { a: { state: 'down', sub: 'errors!' } }, go: 'lost:st>a' },
          { title: 'Steering ne raasta badla', text: 'Naye DNS jawab ab CDN B ka address dete hain. Player agla tukda CDN B se leta hai; video chalta rehta hai.', flood: { paths: ['v>st>b'], n: 14 }, after: { b: { state: 'hot', sub: '100% traffic' } } },
          { title: 'Headroom zaroori', text: 'CDN B ko achanak poora traffic jhelna pada. Agar uske paas itni capacity (headroom) nahi thi, to wo bhi girega. Isliye bade events se pehle har CDN ke saath capacity pehle se tay karte hain.', focus: ['b'] },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Real duniya:</strong> Hotstar 2015 se Akamai ko CDN ki tarah use karta aaya. Akamai ki May 2019 ki press release ke mutabik IPL 2019 final ke 1.86 crore (18.6 million) concurrent viewers Akamai ke platform se pahunche. Bade live platforms aam taur pe ek se zyada CDN rakhte hain, ye industry ka general tareeka hai; Hotstar ka poora design "Design Hotstar" lesson mein hai.` },
    { type: 'h2', text: 'Asli CDN companies' },
    { type: 'table', head: ['CDN', 'Kya khaas', 'Size (company ke apne page ke mutabik, 2026)'], rows: [
      ['<strong>Cloudflare</strong>', 'Anycast network; CDN ke saath DDoS protection, WAF, edge pe code (Workers); free plan bhi', '340+ shehar, 100+ desh'],
      ['<strong>Akamai</strong>', 'Sabse purane CDNs mein (1998); bade media aur live sports, jaise Hotstar', '4,400+ edge PoPs, 130+ desh'],
      ['<strong>Amazon CloudFront</strong>', 'AWS ke saath (S3, load balancers) aasaan; Origin Shield, signed URLs/cookies', '750+ PoPs, 1,140+ embedded PoPs (ISPs ke andar), 15 regional edge caches'],
      ['<strong>Fastly, Google Cloud CDN, Azure Front Door</strong>', 'Fastly: bahut tez purge aur edge pe config; Google/Azure: apne cloud ke saath', '(numbers yahan nahi diye)'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: embedded PoP', html: `<strong>Ye kya hai:</strong> CDN ka server jo kisi internet company (ISP, jaise Jio ya Airtel) ke <em>apne</em> network ke andar rakha ho.<br><strong>Kyun chahiye:</strong> user ka data ISP ke network se bahar jaata hi nahi: aur bhi kam RTT, aur ISP ka bahar ka bandwidth bachta hai.<br><strong>Example:</strong> Netflix aur bade CDNs ISPs ke andar aise servers lagate hain, khaas kar video ke liye.` },

    { type: 'h2', text: 'Kya CDN pe daalein, kya nahi' },
    { type: 'compare',
      left: { title: 'CDN se cache karo', html: `• Images, videos, CSS, JS, fonts<br>• Downloads (apps, PDFs)<br>• Sabke liye same API responses (live score, trending list) chhote TTL ke saath<br>• Video streaming ke chhote segments` },
      right: { title: 'CDN se guzaro, cache mat karo', html: `• Har user ke liye alag (feed, profile settings, cart)<br>• Private data (bank balance)<br>• Writes (POST, payment)<br>• In sab ke liye bhi CDN acceleration aur DDoS protection ka faayda milta hai` },
    },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Jo cheez <strong>bahut users ke liye same</strong> hai, wo CDN pe: images, JS/CSS, video segments, aur API responses bhi, jaise live cricket score JSON 1-2 second ke TTL ke saath. Build se bani files ko versioned naam + 1 saal TTL. Har user ka alag data CDN se <em>guzar</em> sakta hai (tez handshake, DDoS bachaav), lekin <code>private</code>/<code>no-store</code> ke saath. Bahut bade events ke liye origin shield + multi-CDN.` },
    { type: 'callout', tone: 'warn', html: `Sabse khatarnak galti: user-specific response ko <code>Cache-Control: public</code> ke saath bhej dena. CDN use cache kar lega aur agle user ko kisi aur ka data dikh jaayega. Private responses pe <code>private</code> ya <code>no-store</code> lagao, aur login wale pages pe CDN ki cache settings do baar check karo.` },

    { type: 'diagram', title: 'CDN: poori picture', height: 600,
      groups: [
        { label: 'Users', x: 20, y: 14, w: 680, h: 92 },
        { label: 'DNS + CDN edges', x: 20, y: 124, w: 680, h: 190 },
        { label: 'Origin side (xyz.com)', x: 20, y: 346, w: 680, h: 230 },
      ],
      nodes: [
        { id: 'uc', label: 'User, Chennai', x: 150, y: 60, w: 150, kind: 'client', info: 'Ye kya hai: Chennai ka user. DNS/anycast use Chennai PoP pe bhejta hai. Uske browser ka cache bhi pehli layer hai.' },
        { id: 'ud', label: 'User, Delhi', x: 570, y: 60, w: 150, kind: 'client', info: 'Ye kya hai: Delhi ka user. Is example mein steering ne ise CDN B ke Delhi PoP pe bheja (multi-CDN).' },
        { id: 'dns', label: 'DNS / anycast', sub: 'paas ka edge', x: 360, y: 165, w: 150, kind: 'net', info: 'Ye kya hai: wo system jo user ko sabse paas (aur healthy) edge tak bhejta hai: GeoDNS jawab ya anycast routing. Multi-CDN mein yahi steering bhi karta hai.' },
        { id: 'ea', label: 'CDN A edge', sub: 'Chennai PoP', x: 150, y: 270, w: 150, kind: 'edge', info: 'Ye kya hai: CDN A ka Chennai wala cache server. Cache key + Cache-Control ke hisaab se files rakhta hai, signed URLs check karta hai, aur dynamic API ko warm connection se origin bhejta hai.' },
        { id: 'eb', label: 'CDN B edge', sub: 'Delhi PoP', x: 570, y: 270, w: 150, kind: 'edge', info: 'Ye kya hai: doosri CDN company ka Delhi edge. Multi-CDN: ek CDN gire ya slow ho to traffic yahan.' },
        { id: 'ci', label: 'Deploy', sub: 'purge API', x: 360, y: 270, w: 130, kind: 'queue', info: 'Ye kya hai: xyz.com ki deploy pipeline / admin. Build files ko naye (versioned) naam deti hai, aur galti pe dono CDNs ko purge bhejti hai.' },
        { id: 'sh', label: 'Origin shield', sub: 'collapses misses', x: 360, y: 395, w: 170, kind: 'net', info: 'Ye kya hai: edges aur origin ke beech badi cache layer. Saare edges (dono CDNs ke) ke misses yahan collapse hote hain, to origin pe ek object ke liye ~1 request.' },
        { id: 'app', label: 'App servers', sub: 'APIs, signs URLs', x: 170, y: 520, w: 170, kind: 'server', info: 'Ye kya hai: xyz.com ka dynamic origin. Feed, login, payment yahan. Premium video ke liye signed URL yahi banata hai.' },
        { id: 'store', label: 'Object storage', sub: 'images, video', x: 550, y: 520, w: 170, kind: 'data', info: 'Ye kya hai: static files ka origin (jaise S3): images, JS/CSS, video segments. Private bucket, sirf CDN/shield padh sakte hain.' },
      ],
      edges: [
        { a: 'uc', b: 'dns', label: 'kahan jaaun?' },
        { a: 'ud', b: 'dns' },
        { a: 'uc', b: 'ea', n: 1 },
        { a: 'ud', b: 'eb' },
        { a: 'ea', b: 'sh', n: 2, label: 'miss' },
        { a: 'eb', b: 'sh', label: 'miss' },
        { a: 'sh', b: 'store', n: 3, label: 'ek baar' },
        { a: 'ea', b: 'app', dashed: true, label: 'dynamic API' },
        { a: 'ci', b: 'ea', kind: 'evt', label: 'purge' },
        { a: 'ci', b: 'eb', kind: 'evt', label: 'purge' },
      ],
      paths: [
        { name: 'Image HIT', text: 'DNS ne Chennai edge bataya. Edge ke paas copy thi: ~10-20 ms, origin ko pata bhi nahi.', go: ['uc>dns', 'uc>ea'] },
        { name: 'Naya video (MISS)', text: 'Edge pe miss, shield pe bhi miss: shield ne storage se ek baar laaya. Baaki saare edges ko shield se mila.', go: ['uc>ea>sh>store'] },
        { name: 'Feed API', text: 'Cache nahi hota, lekin edge pe handshake aur warm connection se tez. Response private, no-store.', go: ['uc>ea>app'] },
        { name: 'Purge + multi-CDN', text: 'Deploy ne dono CDNs ko purge bheja. Delhi ka user CDN B pe hai; uska miss bhi usi shield pe collapse hota hai.', go: ['ci>ea', 'ci>eb', 'ud>dns', 'ud>eb>sh'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>CDN = duniya bhar mein cache servers (edges, PoPs). User ko paas ki copy: kam RTT, origin pe kam load aur kam bandwidth bill.</li>
      <li>User paas ke edge tak DNS (GeoDNS) ya anycast se pahunchta hai.</li>
      <li>Pull CDN miss pe khud origin se laata hai (default). Push CDN mein tum pehle se upload karte ho.</li>
      <li>Cache key mein sirf wahi rakho jo response badalta hai. Cookies/tracking params = hit rate barbaad.</li>
      <li>Origin <code>Cache-Control</code> se batata hai kaun kitni der rakhe: max-age, s-maxage, private, no-store, stale-while-revalidate.</li>
      <li>Galti pe purge; build files ke liye versioned naam + lamba TTL (purge ki zaroorat hi nahi).</li>
      <li>Origin shield + request collapsing: hazaaron misses → origin pe ~1 request.</li>
      <li>Dynamic content bhi CDN se tez (paas handshake, warm connections); private content ke liye signed URLs; bade events ke liye multi-CDN.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Users ke liye bahut kam latency', 'Origin ka load aur bandwidth bill bahut kam', 'Traffic spikes aur DDoS ka bojh CDN jhel leta hai', 'Origin gire to bhi cached content chalta rehta hai', 'Dynamic APIs bhi tez (edge pe handshake)'], costs: ['Stale content ka risk (TTL/purge sambhalna padta hai)', 'Personalised data cache nahi hota', 'Ek aur vendor aur bill (multi-CDN mein do)', 'Galat cache config se private data leak ho sakta hai', 'Debugging mushkil: problem browser, edge, shield ya origin, kahan?'] },
    { type: 'think', questions: [
      { q: 'Live score 3 crore users dekh rahe hain, har app 5 second mein poll karti hai. Origin pe kitna load bina CDN, aur CDN (TTL 2 s, 100 edges) ke saath?', a: 'Bina CDN: 3,00,00,000 ÷ 5 = 60 lakh requests/sec origin pe. CDN ke saath: har edge har 2 s mein ~1 request = ~50 req/s origin pe (shield ho to aur kam). Users ko score zyada se zyada kuch second purana dikhega.' },
      { q: 'Galti se ek galat image upload ho gayi aur TTL 1 din hai. Kya karoge? Aur aage se aisa na ho, iske liye?', a: 'Abhi: CDN pe us URL ka purge bhejo. Aage ke liye: images ke URL mein version/hash rakho; nayi image = naya URL, purani ki fikar hi nahi. Aur browser ka cache bhi yaad rakho: purge sirf CDN saaf karta hai, users ke browser mein copy max-age tak reh sakti hai.' },
      { q: 'xyz.com ka CDN hit ratio sirf 30% hai, jabki zyada tar traffic images ka hai. Kya kya check karoge?', a: 'Cache key mein cookie ya tracking query params to nahi? Origin Cache-Control bhej raha hai ya no-store/private? Set-Cookie header images pe to nahi aa raha (kai CDNs aise response cache nahi karte)? TTL bahut chhota to nahi? Origin shield on hai? Har image ke size/format ke alag URL bahut zyada to nahi?' },
    ]},
    { type: 'quiz', questions: [
      { q: 'CDN edge pe file nahi hai to (pull CDN mein) kya hota hai?', options: ['Error 404', 'Edge origin (ya shield) se laata hai aur cache kar leta hai', 'User ko origin pe redirect'], answer: 1, explain: 'Pull CDN: miss pe upar se fetch, phir cache.' },
      { q: 'Kaunsa CDN pe cache karna galat hai?', options: ['Company logo', 'User ka shopping cart', 'Video segment'], answer: 1, explain: 'Har user ka alag aur private. CDN se guzar sakta hai, lekin private/no-store ke saath.' },
      { q: 'Origin shield ka kaam?', options: ['Origin ko DDoS se encrypt karna', 'Kai edges ke misses ko jod ke origin pe kam requests bhejna', 'TLS certificate dena'], answer: 1, explain: 'Edges aur origin ke beech ek collapsing cache layer.' },
      { q: '<code>Cache-Control: public, max-age=60, s-maxage=600</code>. 5 minute baad kya hoga?', options: ['Browser aur CDN dono origin se laayenge', 'Browser ki copy expire, lekin CDN ki fresh: CDN se HIT', 'Dono ki copy fresh'], answer: 1, explain: 's-maxage sirf shared caches (CDN) pe lagta hai. Browser 60 s, CDN 600 s.' },
      { q: 'Signed URL mein kisi ne expiry ko 1 din aage kar diya. Edge kya karega?', options: ['Naye expiry tak chala dega', '403: signature ab match nahi karega', 'Origin se poochhega'], answer: 1, explain: 'Signature path + expiry + secret se bana tha. Koi bhi hissa badla to edge ka banaya signature alag aata hai.' },
    ]},
    { type: 'sources', note: 'Numbers aur facts inse check kiye gaye (company ke size waale numbers 2026 mein unke apne pages se).', items: [
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control', used: 'max-age, s-maxage, public/private, no-cache, no-store, stale-while-revalidate, stale-if-error, immutable ka matlab.' },
      { title: 'Use Amazon CloudFront Origin Shield', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html', used: 'Origin shield ka idea: regions ke requests collapse, ek object ke liye kam se kam ek origin request.' },
      { title: 'Amazon CloudFront key features', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/cloudfront/features/', used: '750+ PoPs, 1,140+ embedded PoPs, 15 regional edge caches.' },
      { title: 'Serve private content with signed URLs and signed cookies', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html', used: 'Signed URL vs signed cookies, expiry, private origin.' },
      { title: 'Cloudflare global network', publisher: 'Cloudflare', official: true, url: 'https://www.cloudflare.com/network/', used: '348 shehar, 100+ desh (lesson mein "340+").' },
      { title: 'What is Anycast?', publisher: 'Cloudflare Learning Center', official: true, url: 'https://www.cloudflare.com/learning/cdn/glossary/anycast-network/', used: 'Anycast: ek IP kai data centers se.' },
      { title: 'Instant Purge: invalidating cached content in under 150ms', publisher: 'Cloudflare blog', official: true, url: 'https://blog.cloudflare.com/instant-purge/', used: '2024 ki post: global purge average 150 ms se kam.' },
      { title: 'Akamai global infrastructure', publisher: 'Akamai', official: true, url: 'https://www.akamai.com/why-akamai/global-infrastructure', used: '4,400+ edge PoPs, 130+ desh.' },
      { title: 'With 18.6 Million Simultaneous Viewers Streaming VIVO IPL, Hotstar Shatters Viewership Record Again', publisher: 'Akamai press release (via Streaming Media)', url: 'https://www.streamingmediaglobal.com/PressRelease/With-18.6-Million-Simultaneous-Viewers-Streaming-VIVO-IPL-Hotstar-Shatters-Viewership-Record-Again_49306.aspx', used: 'May 2019: IPL final 18.6M concurrent, Akamai ka platform.' },
      { title: 'Scaling Infrastructure for Millions: From Challenges to Triumphs (Part 1)', publisher: 'Disney+ Hotstar engineering blog', official: true, url: 'https://blog.hotstar.com/scaling-infrastructure-for-millions-from-challenges-to-triumphs-part-1-6099141a99ef', used: '2024 post: CDN ko external API gateway ki tarah use karna, cacheable APIs (scorecard) CDN pe.' },
      { title: 'File:NCDN - CDN.svg', publisher: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NCDN_-_CDN.svg', used: 'Single server vs CDN ka chitra (CC0).' },
    ]},
  ],
});
