Lesson.register({
  id: 'how-the-web-works',
  title: 'xyz.com type kiya, page kaise aaya?',
  minutes: 25,
  summary: `Tum xyz.com type karke Enter dabate ho, aur ek second se kam mein page aa jaata hai. Beech mein DNS, IP address, TCP, TLS, HTTP, server, database aur browser ka rendering, sab ek line mein kaam karte hain. Ye lesson us poore safar ko step by step kholta hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tumhara browser ek doot (messenger) hai. Tum bolte ho "xyz.com dikhao". Doot ko pehle pata karna hai ki xyz.com rehta <em>kahan</em> hai. Phir wahan jaakar darwaza khatkhatana hai, ek secret code pe raazi hona hai, saaf saaf maangna hai, aur jo mile use sundar page bana ke dikhana hai.<br><br>Is lesson mein hum is doot ke saath har kadam chalenge. Har kadam ka ek naam hai, aur wahi naam aage poore course mein aayenge.` },

    { type: 'h2', text: 'Sabse simple architecture' },
    { type: 'ascii', text: `
Browser  ──────────>  Server
  (tum)               (xyz.com ka computer)` },
    { type: 'callout', tone: 'term', title: 'Naya word: Browser (client)', html: `<strong>Ye kya hai:</strong> wo app jisse tum websites kholte ho: Chrome, Safari, Firefox. System design mein isse <em>client</em> kehte hain, yaani "maangne wala".<br><strong>Kyun chahiye:</strong> ye tumhari baat (URL) ko computer ki bhasha mein badalta hai, server se cheezein laata hai, aur unhe page bana ke dikhata hai.<br><strong>Iske bina:</strong> tumhe khud server se raw text maangna aur padhna padta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Server', html: `<strong>Ye kya hai:</strong> bas ek computer, tumhare laptop jaisa. Farak itna hai ki ye 24x7 on rehta hai, internet se juda hai, aur iska kaam hai request aaye to response bhejna.<br><strong>Kyun chahiye:</strong> xyz.com ki files, code aur data kahin to rakhe hone chahiye jahan se sab log le sakein.<br><strong>Iske bina:</strong> website ka koi ghar nahi. Tumhara laptop band hua to site bhi band.` },
    { type: 'image', src: 'assets/img/how-the-web-works/server-rack.jpg', alt: 'Data center mein ek rack, jismein upar neeche bahut saare patle server computers lage hain, aage se neeli batti aur taar dikh rahe hain', caption: 'Asli servers aise dikhte hain: patle computers jo ek almari (rack) mein upar neeche lage hote hain. Ye Wikipedia chalane wale servers hain. Screen ya keyboard nahi, bas network ke taar.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_35.jpg', license: 'CC BY-SA 3.0' } },

    { type: 'h2', text: 'Problem: computers naam nahi, number samajhte hain' },
    { type: 'callout', tone: 'term', title: 'Naya word: IP address', html: `<strong>Ye kya hai:</strong> internet pe har computer ka ek number wala address, jaise <code>203.0.113.10</code>. Ghar ke pin code aur makaan number jaisa.<br><strong>Kyun chahiye:</strong> data bhejne ke liye pata hona chahiye ki <em>kahan</em> bhejna hai. Internet ke routers sirf ye number samajhte hain.<br><strong>Iske bina:</strong> data ko raasta hi nahi milega. Poora lesson: "IP address aur ports".` },
    { type: 'callout', tone: 'term', title: 'Naya word: Domain name', html: `<strong>Ye kya hai:</strong> IP ka insaan-friendly naam, jaise <code>xyz.com</code>.<br><strong>Kyun chahiye:</strong> <code>203.0.113.10</code> yaad rakhna mushkil hai, <code>xyz.com</code> aasaan. Aur agar server badle (naya IP), to naam same reh sakta hai.<br><strong>Iske bina:</strong> har site ke liye number yaad karne padte, jaise phone number.` },
    { type: 'callout', tone: 'term', title: 'Naya word: DNS (Domain Name System)', html: `<strong>Ye kya hai:</strong> internet ki phonebook. Tum naam do (<code>xyz.com</code>), wo number batata hai (<code>203.0.113.10</code>).<br><strong>Kyun chahiye:</strong> browser ke paas naam hai, lekin connect karne ke liye number chahiye. DNS dono ko jodta hai.<br><strong>Iske bina:</strong> naam type karne ka koi faayda nahi. Browser ko pata hi nahi chalega ki jaana kahan hai.` },

    { type: 'h2', text: 'URL ke tukde' },
    { type: 'callout', tone: 'term', title: 'Naya word: URL', html: `<strong>Ye kya hai:</strong> poora pata jo tum address bar mein likhte ho, jaise <code>https://www.xyz.com/videos?page=2</code>. Isme sirf naam nahi, aur bhi jaankari hai.<br><strong>Kyun chahiye:</strong> browser ko batana hai: kaunsa tareeka (https), kaunsa computer (www.xyz.com), us computer pe kaunsi cheez (/videos), aur kuch extra details (page=2).<br><strong>Example:</strong> neeche widget mein apna URL likh ke dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>URL likho (ya badlo)</label>
        <input type="text" class="hw-url" value="https://www.xyz.com/videos?page=2#comments" style="width:100%;font-family:var(--f-mono);font-size:14px;padding:8px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--ink)">
        <div class="hw-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>
        <div class="hw-out" style="display:flex;flex-direction:column;gap:6px"></div>
        <div class="calc-note">Port tab dikhta hai jab URL mein likha ho. Na likha ho to https ka default 443 aur http ka 80 hota hai.</div>`;
      const q = s => el.querySelector(s);
      const parts = u => {
        let x; try { x = new URL(u.trim()); } catch (e) { return null; }
        const port = x.port || (x.protocol === 'https:' ? '443' : x.protocol === 'http:' ? '80' : '?');
        return [
          ['Scheme', x.protocol.replace(':', ''), x.protocol === 'https:' ? 'Tareeka: https = data taale mein band (encrypted) jaata hai. Koi beech mein padh nahi sakta. Ye taala TLS lagata hai, neeche dekhenge.' : 'Tareeka: http = bina encryption. Aajkal browsers isko "Not secure" bolte hain.', 'var(--green)'],
          ['Host (domain)', x.hostname, 'Kaunsa computer. DNS isi naam ko IP mein badlega.', 'var(--accent)'],
          ['Port', port + (x.port ? '' : ' (default)'), 'Us computer pe kaunsa darwaza (program). Web server aksar 443 pe sunta hai.', 'var(--violet)'],
          ['Path', x.pathname, 'Server pe kaunsi cheez chahiye. "/" matlab homepage.', 'var(--amber)'],
          ['Query', x.search || '(khaali)', 'Extra details, key=value. Jaise page=2 matlab doosra page.', 'var(--ink-2)'],
          ['Fragment', x.hash || '(khaali)', '# ke baad wala hissa server tak jaata hi nahi. Browser isse page ke andar sahi jagah scroll karta hai.', 'var(--ink-3)'],
        ];
      };
      const upd = () => {
        const p = parts(q('.hw-url').value);
        if (!p) { q('.hw-chips').innerHTML = ''; q('.hw-out').innerHTML = '<div style="color:var(--red)">Ye valid URL nahi lagta. https:// se shuru karke likho.</div>'; return; }
        q('.hw-chips').innerHTML = p.map(([k, v, , c]) => `<span style="font-family:var(--f-mono);font-size:13px;padding:3px 8px;border-radius:999px;border:1.5px solid ${c};color:var(--ink)">${v.replace(/</g, '&lt;')}</span>`).join('');
        q('.hw-out').innerHTML = p.map(([k, v, why, c]) => `<div style="display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 10px;border-left:4px solid ${c};background:var(--surface-2);border-radius:var(--r-sm)"><strong style="min-width:110px">${k}</strong><code>${v.replace(/</g, '&lt;')}</code><span style="flex-basis:100%;color:var(--ink-2);font-size:14px">${why}</span></div>`).join('');
      };
      q('.hw-url').addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'Data asli mein kaise travel karta hai' },
    { type: 'callout', tone: 'term', title: 'Naya word: Packet', html: `<strong>Ye kya hai:</strong> data ka chhota tukda, lagbhag 1,500 bytes ka. Bada page ya photo hazaaron packets mein toot ke jaata hai, har packet pe bhejne wale aur paane wale ka IP likha hota hai.<br><strong>Kyun chahiye:</strong> chhote tukde alag alag raaston se ja sakte hain aur ek kho jaaye to sirf wahi dobara bhejna padta hai.<br><strong>Iske bina:</strong> ek badi file ka ek hissa kharab hota to poori file dobara bhejni padti.` },
    { type: 'p', html: `Ye packets hawa mein nahi udte. WiFi se tumhare router tak, phir taar se tumhare internet provider (ISP: Jio, Airtel jaise) tak, aur phir <strong>fiber optic cables</strong> se aage. Fiber ek patla kaanch ka dhaaga hai jisme data roshni ki chamak ban ke chalta hai. Ek desh se doosre desh tak ye cables <strong>samundar ke neeche</strong> bichhi hain.` },
    { type: 'image', src: 'assets/img/how-the-web-works/submarine-cables.jpg', alt: 'Duniya ka naksha jisme laal lines samundar ke neeche bichhi internet cables dikhati hain, India, Europe, America aur Asia ko jodti hui', caption: 'Laal lines samundar ke neeche ki internet cables hain (ye naksha 2015 ka hai; aaj aur bhi zyada cables hain). Mumbai aur Chennai jaise shehron se cables Europe, Middle East aur Singapore tak jaati hain. America wali website ka data inhi se aata hai.', credit: { text: 'Greg Mahlknecht (cable data) and OpenStreetMap contributors, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Submarine_cable_map_umap.png', license: 'CC BY-SA 2.0' } },
    { type: 'callout', tone: 'term', title: 'Naya word: Latency aur RTT', html: `<strong>Latency:</strong> data ko ek jagah se doosri jagah pahunchne mein lagne wala time.<br><strong>RTT (Round Trip Time):</strong> ek message jaakar uska jawab wapas aane tak ka time. Jaise kisi ko awaaz do aur uski "haan" sunne tak ka time.<br><strong>Kyun matter karta hai:</strong> roshni bhi fiber mein lagbhag 200 km har millisecond chalti hai. India se America aur wapas ka RTT aksar 200 ms ke aas paas hota hai. Aur page khulne mein kai round trips lagte hain, to ye time judta jaata hai.` },

    { type: 'h2', text: 'Server se baat karne ke 3 rules: TCP, TLS, HTTP' },
    { type: 'p', html: `IP mil gaya. Ab browser server se baat karega. Ye baat-cheet 3 layers mein hoti hai, ek ke upar ek. Pehle teeno ko alag alag samjho.` },
    { type: 'callout', tone: 'term', title: 'Naya word: TCP', html: `<strong>Ye kya hai:</strong> ek rule-book (protocol) jo pakka karti hai ki saare packets pahunchein, sahi order mein. Koi packet kho gaya to TCP use dobara bhejta hai.<br><strong>Kyun chahiye:</strong> internet packets ko kabhi kabhi gira deta hai ya ulte order mein pahunchata hai. Web page ka ek bhi tukda gayab ho to page toot jaata.<br><strong>Iske bina:</strong> aadhi photo, adhoora page, galat order mein text.<br><strong>Shuruaat:</strong> data bhejne se pehle TCP "haath milata" hai, jise <em>3-way handshake</em> kehte hain.` },
    { type: 'ascii', text: `
Browser                         Server
   │ ── SYN ──────────────────>   │   "Baat karein?"
   │ <──────────────── SYN-ACK ── │   "Haan, main ready hoon"
   │ ── ACK ──────────────────>   │   "Theek hai, shuru karte hain"
   │                              │
   └─ ab connection khula hai (1 round trip laga) ─┘`, caption: 'TCP handshake: teen chhote messages, ek round trip (RTT). Detail mein: "TCP, UDP aur HTTPS" lesson.' },
    { type: 'callout', tone: 'term', title: 'Naya word: TLS (aur HTTPS)', html: `<strong>Ye kya hai:</strong> TCP ke upar ek taala. Browser aur server ek secret key pe raazi hote hain, phir saara data us key se <em>encrypt</em> (taale mein band) hota hai. HTTP + TLS = <strong>HTTPS</strong>.<br><strong>Kyun chahiye:</strong> tumhara data cafe ke WiFi, ISP aur kai routers se guzarta hai. Bina taale ke koi bhi password padh sakta hai. Server ek <em>certificate</em> bhi dikhata hai, jo saabit karta hai ki ye asli xyz.com hai, nakli nahi.<br><strong>Iske bina:</strong> passwords, messages, payment sab khule mein. Browser "Not secure" dikhata hai.<br><strong>Kitna time:</strong> naya version TLS 1.3 ek round trip leta hai. Purana TLS 1.2 do leta tha.` },
    { type: 'callout', tone: 'term', title: 'Naya word: HTTP', html: `<strong>Ye kya hai:</strong> browser aur server ke beech sawaal-jawab ki bhasha. Browser ek <em>HTTP request</em> bhejta hai ("homepage do"), server ek <em>HTTP response</em> bhejta hai ("ye lo, 200 OK").<br><strong>Kyun chahiye:</strong> dono taraf ke programs alag log ne likhe hain. Ek common bhasha chahiye taaki Chrome kisi bhi server se baat kar sake.<br><strong>Iske bina:</strong> har website ka apna format hota, aur har browser har site nahi khol pata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Database (yahan)', html: `<strong>Ye kya hai:</strong> server ke peeche data ka permanent ghar: users, posts, comments.<br><strong>Kyun yahan:</strong> homepage pe "latest posts" dikhane hain. Server ke paas ye list nahi hai, wo database se maangta hai.<br><strong>Iske bina:</strong> server har restart pe sab bhool jaata (pichhla lesson yaad karo).` },

    { type: 'h2', text: 'Poori journey, step by step' },
    { type: 'p', html: `Ab sab jod ke dekho. Pehle "Pehli visit" chalao: har step pe neeche message padho. Phir "Dobara visit", aur phir teeno failure scenarios. Har scenario ek naya sabak sikhata hai.` },
    { type: 'flow', title: 'xyz.com type kiya: Enter se page tak', height: 290,
      nodes: [
        { id: 'browser', label: 'Browser', sub: 'tumhara Chrome', x: 100, y: 200, w: 150, kind: 'client', info: 'Ye kya hai: tumhara Chrome/Safari, yaani client. Ye 4 kaam karta hai: URL leta hai, DNS se IP poochhta hai, server se HTTP mein baat karta hai, aur jawab ko page bana ke dikhata hai. Iske paas apna cache bhi hai (DNS answers aur files).' },
        { id: 'dns', label: 'DNS Resolver', sub: 'naam → IP', x: 330, y: 70, w: 150, kind: 'net', info: 'Ye kya hai: internet ki phonebook ka counter. Browser naam deta hai, ye IP batata hai: xyz.com → 203.0.113.10. Ye aksar tumhare ISP ka hota hai, ya 8.8.8.8 jaisa public resolver. Andar ki poori kahani "Level 2" mein.' },
        { id: 'server', label: 'Server', sub: '203.0.113.10', x: 420, y: 200, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka computer, 24x7 on. Kyun yahan: TCP aur TLS ka haath milata hai, HTTP request padhta hai, database se data laata hai, aur HTML page banaa ke bhejta hai.' },
        { id: 'db', label: 'Database', sub: 'posts, users', x: 620, y: 200, w: 140, kind: 'data', info: 'Ye kya hai: data ka permanent ghar (disk pe). Kyun yahan: homepage ki "latest posts" yahin se aati hain. Server sawaal (query) bhejta hai, database rows wapas deta hai.' },
      ],
      edges: [{ a: 'browser', b: 'dns' }, { a: 'browser', b: 'server' }, { a: 'server', b: 'db' }],
      scenarios: [
        { name: 'Pehli visit', intro: 'Tum pehli baar xyz.com khol rahe ho. Browser ke paas kuch bhi yaad nahi.', steps: [
          { title: 'Tumne xyz.com type karke Enter dabaya', text: 'Browser ko naam mila, lekin connect karne ke liye IP chahiye. Pehle wo apni memory (cache) dekhta hai. Pehli visit hai, to wahan kuch nahi.', focus: ['browser'], msg: 'Browser cache: xyz.com? ... nahi mila' },
          { title: 'Browser DNS se poochhta hai', text: '"xyz.com ka IP kya hai?" Isko <strong>DNS query</strong> kehte hain.', go: 'browser>dns', msg: 'DNS query: xyz.com ka IP?' },
          { title: 'DNS jawab deta hai', text: 'DNS bolta hai "203.0.113.10". Saath mein ek <strong>TTL</strong> bhi: kitni der tak ye jawab yaad rakh sakte ho. Browser ise yaad kar leta hai.', go: 'res:dns>browser', msg: 'DNS answer: xyz.com = 203.0.113.10  (TTL 300 seconds)' },
          { title: 'TCP handshake: SYN', text: 'Ab browser us IP pe server ka darwaza khatkhatata hai. Pehla message: SYN, yaani "baat karein?"', go: 'browser>server', msg: 'TCP SYN  →  203.0.113.10 : 443' },
          { title: 'TCP handshake: SYN-ACK', text: 'Server jawab deta hai: "haan, main ready hoon."', go: 'res:server>browser', msg: 'TCP SYN-ACK' },
          { title: 'TCP handshake: ACK', text: 'Browser bolta hai "theek hai". Ab TCP connection khula hai. Isme ek round trip laga.', go: 'browser>server', msg: 'TCP ACK  (connection ready)' },
          { title: 'TLS: browser apni taraf se hello', text: 'Ab taala lagana hai. Browser batata hai ki wo kaunse encryption tareeke jaanta hai, aur apna aadha key-material bhejta hai.', go: 'browser>server', msg: 'TLS ClientHello: TLS 1.3, ye ciphers, mera key share' },
          { title: 'TLS: server ka hello + certificate', text: 'Server apna key-material aur <strong>certificate</strong> bhejta hai. Browser certificate check karta hai: kya ye sach mein xyz.com hai? Haan. Dono ke paas ab same secret key hai. TLS 1.3 mein ye ek round trip mein ho gaya.', go: 'res:server>browser', msg: 'TLS ServerHello + Certificate (xyz.com) + Finished' },
          { title: 'Browser HTTP request bhejta hai', text: 'Ab asli sawaal, taale mein band. <code>GET</code> ka matlab hai "kuch laake do". <code>/</code> matlab homepage.', go: 'browser>server', msg: 'GET / HTTP/1.1\nHost: xyz.com\nUser-Agent: Chrome\nAccept: text/html' },
          { title: 'Server database se data maangta hai', text: 'Homepage pe latest posts dikhane hain. Server database ko ek <strong>query</strong> bhejta hai.', go: 'server>db', msg: 'SELECT title, author FROM posts ORDER BY created_at DESC LIMIT 10' },
          { title: 'Database rows wapas deta hai', text: 'Database 10 posts deta hai. Server unhe HTML template mein bhar ke page taiyaar karta hai.', go: 'res:db>server', msg: '10 rows: "Mera pehla post", "Cricket score app"...' },
          { title: 'Server HTTP response bhejta hai', text: 'Response mein do cheezein: <strong>status code</strong> (200 OK = sab theek) aur <strong>body</strong> (asli HTML). Headers batate hain ki ye kya hai aur kitni der cache kar sakte ho.', go: 'res:server>browser', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\nCache-Control: max-age=60\n\n<html> ...xyz.com ka page... </html>' },
          { title: 'Browser HTML padhta hai, aur files maangta hai', text: 'HTML mein likha hai ki page ko <code>style.css</code>, <code>app.js</code> aur <code>logo.png</code> bhi chahiye. Browser inke liye aur requests bhejta hai, usi khule connection pe (dobara handshake nahi).', go: ['browser>server', 'res:server>browser'], msg: 'GET /style.css   GET /app.js   GET /logo.png' },
          { title: 'Page screen pe!', text: 'Browser HTML se page ka dhaancha banata hai, CSS se rang aur jagah, JS se interactive cheezein, aur screen pe paint karta hai. Poori journey: naam → DNS → IP → TCP → TLS → HTTP → server → database → response → rendering.', focus: ['browser'] },
        ]},
        { name: 'Dobara visit (cached)', intro: '2 minute baad tum phir xyz.com kholte ho.', steps: [
          { title: 'Browser ko IP yaad hai', text: 'Browser ki memory mein xyz.com ka IP abhi bhi hai (TTL 300 seconds tha, sirf 120 beete). To DNS se poochhne ki zarurat nahi. Isko <strong>DNS caching</strong> kehte hain.', focus: ['browser'], set: { dns: { state: 'dim' } }, msg: 'Cache hit: xyz.com = 203.0.113.10 (abhi 180s bache)' },
          { title: 'Connection bhi shayad khula hai', text: 'Browser connections ko kuch der khula rakhta hai. Agar khula hai to TCP aur TLS handshake bhi skip. Agar band ho gaya, to sirf handshake dobara hoga (DNS nahi).', focus: ['browser', 'server'] },
          { title: 'Sirf HTML ki request', text: 'Homepage ki HTML maangi jaati hai, kyunki uska <code>max-age=60</code> khatam ho gaya. Lekin logo, CSS, JS ka max-age lamba tha, wo browser ke cache se hi aa gaye. Koi request nahi.', go: 'browser>server', msg: 'GET / HTTP/1.1\nHost: xyz.com\n(logo.png, style.css: browser cache se)' },
          { title: 'Response aur page', text: 'Server ne naya HTML bheja. Pichhli baar se kam round trips, kam files. Page bahut jaldi.', go: 'res:server>browser', msg: 'HTTP/1.1 200 OK' },
        ]},
        { name: 'DNS down', intro: 'Is baar DNS kaam nahi kar raha, aur browser ke paas IP yaad nahi.', steps: [
          { title: 'Browser DNS se poochhta hai', text: 'Cache mein IP nahi hai, to DNS se poochhna padega...', go: 'lost:browser>dns', after: { dns: { state: 'down', sub: 'DOWN' } } },
          { title: 'Koi jawab nahi', text: 'DNS respond nahi kar raha. Browser ko server ka address hi nahi pata.', focus: ['dns'] },
          { title: 'Error: site can\'t be reached', text: 'Server bilkul theek chal raha hai, phir bhi website nahi khuli! Sabak: <strong>DNS kharab = website gayab</strong>, chahe server zinda ho. Isliye badi companies DNS ko bhi multiple providers pe rakhti hain.', focus: ['browser'], set: { server: { state: 'ok', sub: 'healthy, par akela' } }, msg: 'ERR_NAME_NOT_RESOLVED' },
        ]},
        { name: 'Server down', intro: 'DNS theek hai, lekin server crash ho gaya.', steps: [
          { title: 'DNS se IP mil gaya', text: 'DNS ne 203.0.113.10 bata diya. Yahan tak sab theek.', go: ['browser>dns', 'res:dns>browser'] },
          { title: 'TCP SYN server ki taraf...', text: 'Browser handshake shuru karta hai. Lekin us IP pe koi sun hi nahi raha.', go: 'lost:browser>server', after: { server: { state: 'down', sub: 'DOWN' } } },
          { title: 'Timeout', text: 'Browser kuch der wait karta hai, phir haar maan leta hai. Hamare paas <strong>ek hi server</strong> hai, to ye down = poori website down. Isko <strong>Single Point of Failure (SPOF)</strong> kehte hain.', focus: ['browser'], msg: 'ERR_CONNECTION_TIMED_OUT' },
        ]},
        { name: 'Database down', intro: 'DNS theek, server theek, lekin database band hai.', steps: [
          { title: 'DNS, TCP, TLS sab theek', text: 'IP mila, haath mila, taala laga. Request server tak pahunch gayi.', go: ['browser>dns', 'res:dns>browser', 'browser>server'], msg: 'GET / HTTP/1.1' },
          { title: 'Server database se poochhta hai', text: 'Server ko posts chahiye, lekin database jawab nahi deta.', go: 'bad:server>db', after: { db: { state: 'down', sub: 'DOWN' } } },
          { title: 'Server error bhejta hai', text: 'Server zinda hai, isliye wo kam se kam bata sakta hai ki gadbad hai. Wo <strong>500</strong> ya <strong>503</strong> status bhejta hai. Sabak: server aur database dono chahiye. Ek bhi gira to page nahi banta.', go: 'res:server>browser', msg: 'HTTP/1.1 503 Service Unavailable' },
        ]},
      ],
    },

    { type: 'h2', text: 'Request aur response ke andar kya hota hai' },
    { type: 'p', html: `HTTP message bas likha hua text hai. Pehli line sabse zaroori hai. Uske baad <strong>headers</strong> (extra jaankari, "naam: value" ki shakal mein), phir ek khaali line, phir <strong>body</strong> (asli content).` },
    { type: 'compare',
      left: { title: 'HTTP request (browser → server)', ascii: `
GET /profile HTTP/1.1
Host: xyz.com
Cookie: session=abc123
Accept: text/html` },
      right: { title: 'HTTP response (server → browser)', ascii: `
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: max-age=60

<html>...profile page...</html>` },
    },
    { type: 'table', head: ['Hissa', 'Matlab'], rows: [
      ['<code>GET /profile</code>', 'Method + path: "profile page laake do"'],
      ['<code>Host: xyz.com</code>', 'Kaunsi website. Ek server pe kai websites ho sakti hain'],
      ['<code>Cookie: session=abc123</code>', 'Browser ki rakhi chhoti parchi jo batati hai ki tum logged in ho'],
      ['<code>200 OK</code>', 'Status code: sab theek'],
      ['<code>Content-Type: text/html</code>', 'Body mein kya hai: HTML page (ya image, ya JSON)'],
      ['<code>Cache-Control: max-age=60</code>', 'Browser isse 60 seconds tak yaad rakh sakta hai, dobara maangne ki zarurat nahi'],
    ]},
    { type: 'table', head: ['Method', 'Matlab', 'xyz.com example'], rows: [
      ['GET', 'Kuch padhna / laana', 'Homepage kholna, profile dekhna'],
      ['POST', 'Kuch naya banana / bhejna', 'Naya post daalna, login form bhejna'],
      ['PUT / PATCH', 'Pehle se maujood cheez badalna', 'Profile ka naam badalna'],
      ['DELETE', 'Mitaana', 'Apna post delete karna'],
    ], caption: 'Methods ki poori kahani "API kya hai? REST basics" lesson mein.' },
    { type: 'table', head: ['Status code', 'Matlab', 'Kab aata hai'], rows: [
      ['200', 'OK', 'Sab theek, ye lo data'],
      ['301 / 302', 'Kahin aur jao', 'Page ka address badal gaya (redirect)'],
      ['304', 'Not modified', 'Tumhari cached copy abhi bhi sahi hai, wahi use karo'],
      ['404', 'Not found', 'Ye page exist nahi karta'],
      ['500', 'Server error', 'Server ke code mein kuch phat gaya'],
      ['503', 'Service unavailable', 'Server overloaded hai, ya uske peeche ka database band hai'],
    ], caption: 'Pehla digit yaad rakho: 2xx success, 3xx redirect, 4xx tumhari (client ki) galti, 5xx server ki galti.' },

    { type: 'h2', text: 'Browser page kaise banata hai (rendering)' },
    { type: 'callout', tone: 'term', title: 'Naya word: Rendering', html: `<strong>Ye kya hai:</strong> HTML, CSS aur JavaScript ke text ko screen pe dikhne wale page mein badalna.<br><strong>Kyun chahiye:</strong> server sirf text bhejta hai. Buttons, rang, photos ki jagah, ye sab browser ko khud banana padta hai.<br><strong>Iske bina:</strong> tumhe screen pe <code>&lt;html&gt;&lt;body&gt;...</code> jaisa kachcha code dikhta.` },
    { type: 'steps', items: [
      { t: 'HTML padho → dhaancha (DOM)', d: 'Browser HTML ko upar se neeche padhta hai aur ek ped jaisa dhaancha banata hai: page mein heading hai, uske neeche 10 posts, har post mein title aur photo. Is dhaanche ko DOM kehte hain.' },
      { t: 'Aur files maango', d: 'HTML mein likha hai ki CSS, JavaScript aur images bhi chahiye. Browser inke liye aur HTTP requests bhejta hai. Ek page ke liye 50-100 requests bhi normal hain.' },
      { t: 'CSS lagao → style', d: 'CSS batata hai ki kaunsi cheez kis rang, size aur font ki hogi.' },
      { t: 'Layout → kahan kya', d: 'Browser calculate karta hai ki screen pe har cheez kitni jagah legi aur kahan baithegi. Phone aur laptop pe ye alag hota hai.' },
      { t: 'Paint → screen pe', d: 'Pixels rang diye jaate hain. Tumhe page dikhta hai. JavaScript ab buttons ko zinda karta hai (click pe kuch hona).' },
    ]},

    { type: 'h2', text: 'Level 2: DNS ke andar kya hota hai' },
    { type: 'p', html: `Asli mein DNS ek akela computer nahi hai. Duniya mein crores domains hain, ek machine pe sab nahi aa sakte. Isliye DNS ek <strong>hierarchy</strong> (upar se neeche ki seedhi) hai. Naam ko peeche se padho: <code>xyz.com.</code> = "." (root) → "com" → "xyz".` },
    { type: 'callout', tone: 'term', title: 'Naya word: Resolver', html: `<strong>Ye kya hai:</strong> tumhara "DNS agent". Browser sirf isse ek sawaal poochhta hai. Ye tumhari taraf se baaki servers se ek ek karke poochh-taachh karta hai.<br><strong>Kahan hota hai:</strong> aksar tumhare ISP (Jio, Airtel) ka, ya public jaise Google ka 8.8.8.8 ya Cloudflare ka 1.1.1.1.<br><strong>Kyun chahiye:</strong> ye answers cache karta hai. 1 lakh log xyz.com dhoondhein, to bhi ye upar sirf ek baar poochhta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Root, TLD aur Authoritative server', html: `<strong>Root server:</strong> seedhi ka sabse upar ka danda. Ise har domain ka IP nahi pata, sirf ye pata hai ki ".com", ".in", ".org" ke servers kahan hain. Root ke 13 naam hain (A se M), jinhe 12 alag organisations chalati hain, aur inki duniya bhar mein 2,000 se zyada copies hain.<br><strong>TLD server (Top Level Domain):</strong> ".com" jaise ek extension ka register. Ise pata hai ki xyz.com ka record kaunsa server rakhta hai.<br><strong>Authoritative server:</strong> xyz.com ka asli record yahin hai (jaise Cloudflare DNS ya AWS Route 53 pe). Final answer yahin se aata hai.` },
    { type: 'flow', title: 'DNS lookup: resolver ki poochh-taachh', height: 330,
      nodes: [
        { id: 'b', label: 'Browser', x: 90, y: 165, w: 120, kind: 'client', info: 'Ye kya hai: tumhara browser. Ye resolver se sirf ek sawaal poochhta hai ("xyz.com ka IP?") aur final answer ka wait karta hai. Baaki mehnat resolver karta hai.' },
        { id: 'res', label: 'Resolver', sub: 'ISP / 8.8.8.8', x: 280, y: 165, w: 140, kind: 'net', info: 'Ye kya hai: tumhara DNS agent. Ye root, TLD aur authoritative servers se ek ek karke poochhta hai, aur answers TTL tak cache karta hai taaki agle user ko turant bata sake.' },
        { id: 'root', label: 'Root server', sub: '"." ka boss', x: 560, y: 55, w: 160, kind: 'net', info: 'Ye kya hai: DNS seedhi ka sabse upar ka server. Ise har domain ka IP nahi pata. Bas ye pata hai ki ".com", ".in", ".org" ke servers kahan hain. 13 naam, 2,000+ copies duniya bhar mein.' },
        { id: 'tld', label: '.com TLD server', sub: '.com ka register', x: 560, y: 165, w: 160, kind: 'net', info: 'Ye kya hai: TLD (Top Level Domain) server, ".com" ke saare naamon ka register. Ise pata hai ki xyz.com ka record kaunsa authoritative server rakhta hai.' },
        { id: 'auth', label: 'Authoritative', sub: 'xyz.com ka record', x: 560, y: 275, w: 160, kind: 'net', info: 'Ye kya hai: wo server jo xyz.com ka asli record rakhta hai (jaise Cloudflare ya Route 53). xyz.com ka owner yahin IP likhta hai. Final answer yahin se aata hai.' },
      ],
      edges: [{ a: 'b', b: 'res' }, { a: 'res', b: 'root' }, { a: 'res', b: 'tld' }, { a: 'res', b: 'auth' }],
      scenarios: [
        { name: 'Pehli baar (koi cache nahi)', steps: [
          { title: 'Browser resolver se poochhta hai', text: '"xyz.com ka IP?"', go: 'b>res' },
          { title: 'Resolver root se poochhta hai', text: 'Root bolta hai: "mujhe nahi pata, lekin .com wale server ka address ye raha."', go: ['res>root', 'res:root>res'] },
          { title: 'Resolver .com TLD se poochhta hai', text: 'TLD bolta hai: "xyz.com ka record authoritative server ns1.xyz-dns.com ke paas hai."', go: ['res>tld', 'res:tld>res'] },
          { title: 'Authoritative server final answer deta hai', text: '"xyz.com = 203.0.113.10, TTL 300 seconds." Is line ko <strong>A record</strong> kehte hain (A = address).', go: ['res>auth', 'res:auth>res'], msg: 'xyz.com.  300  IN  A  203.0.113.10' },
          { title: 'Resolver browser ko batata hai, aur yaad rakhta hai', text: 'Agle 300 seconds tak koi bhi user poochhe, resolver seedha bata dega. Isliye DNS itna fast lagta hai.', go: 'res:res>b', set: { res: { sub: 'cached for 300s' } } },
        ]},
        { name: 'Resolver ke cache mein hai', steps: [
          { title: 'Browser poochhta hai', text: 'Kisi aur ne 1 minute pehle xyz.com dhoonda tha.', go: 'b>res' },
          { title: 'Turant answer', text: 'Resolver ke paas cached answer hai. Root, TLD, authoritative kisi ko disturb nahi kiya. 4 round trips ki jagah 1.', go: 'res:res>b', set: { root: { state: 'dim' }, tld: { state: 'dim' }, auth: { state: 'dim' } } },
        ]},
        { name: 'Authoritative down', intro: 'xyz.com ka DNS provider band hai.', steps: [
          { title: 'Root aur TLD ne raasta bataya', text: 'Root aur .com TLD theek hain. Unhone bata diya ki xyz.com ka record kiske paas hai.', go: ['b>res', 'res>root', 'res:root>res', 'res>tld', 'res:tld>res'] },
          { title: 'Authoritative jawab nahi deta', text: 'Resolver poochhta hai, lekin xyz.com ka DNS server band hai.', go: 'lost:res>auth', after: { auth: { state: 'down', sub: 'DOWN' } } },
          { title: 'Browser ko error', text: 'Resolver haar ke error bhejta hai (SERVFAIL). Jin resolvers ke cache mein jawab abhi bacha hai, wahan site chalti rahegi, TTL khatam hone tak. Baaki sab ke liye xyz.com gayab. Isliye bade sites do alag DNS providers rakhte hain.', go: 'bad:res>b', msg: 'SERVFAIL  →  browser: ERR_NAME_NOT_RESOLVED' },
        ]},
      ],
    },
    { type: 'callout', tone: 'warn', title: 'TTL ka trade-off', html: `Lamba TTL (jaise 1 din) = kam DNS queries, fast. Lekin agar tumhe server ka IP badalna pada, to log 1 din tak purane IP pe jaate rahenge. Chhota TTL (60 seconds) = jaldi update, par zyada queries. System design mein har cheez aisa hi trade-off hai.` },
    { type: 'callout', tone: 'tip', title: 'Decide: TTL kitna rakhein?', html: `Aam din: <strong>5 minute se 1 ghanta</strong> (300-3600 seconds) theek hai. Server badalne (migration) ka plan hai: ek din pehle TTL ko <strong>60 seconds</strong> kar do, IP badlo, sab theek chale to TTL wapas bada kar do. Jo record kabhi nahi badalta, uska TTL lamba rakh sakte ho.` },

    { type: 'h2', text: 'Raaste mein caching: har jagah "yaad rakhna"' },
    { type: 'p', html: `Tumne dekha ki dobara visit kitni fast thi. Wajah: raaste mein kai jagah cheezein yaad rakhi jaati hain. Is "yaad rakhne" ko <strong>caching</strong> kehte hain. Ek request ko jitni jaldi koi cache jawab de de, utna kam safar.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDN (sirf naam, abhi ke liye)', html: `<strong>Ye kya hai:</strong> duniya bhar ke shehron mein rakhe servers jo xyz.com ki images, CSS, JS aur videos ki copies rakhte hain.<br><strong>Kyun chahiye:</strong> server America mein hai to har photo ko samundar paar karna padega. CDN Mumbai wali copy de deta hai.<br><strong>Iske bina:</strong> door ke users ke liye har file 200 ms door. Poora lesson Phase 2 mein.` },
    { type: 'table', head: ['Kahan', 'Kya yaad rakhta hai', 'Kitni der', 'Faayda'], rows: [
      ['Browser', 'DNS answers, images, CSS, JS, kabhi HTML', 'TTL / Cache-Control: max-age jitna', 'Request jaati hi nahi. 0 ms'],
      ['Operating system', 'DNS answers', 'TTL jitna', 'Doosre apps ko bhi fayda'],
      ['DNS Resolver', 'DNS answers, lakhon users ke', 'TTL jitna', 'Root/TLD tak nahi jaana padta'],
      ['CDN', 'Images, videos, CSS, JS', 'Cache-Control jitna', 'File paas ke shehar se aati hai'],
      ['Server ke paas cache (Redis)', 'Database ke jawab', 'App decide karta hai', 'Database ko aaraam, jawab jaldi'],
    ], caption: 'Server-side cache (Redis) aur CDN ke poore lessons Phase 2 mein hain.' },
    { type: 'callout', tone: 'mistake', html: `"Cache = sirf browser ka cache" nahi. Cache har level pe hai: browser, OS, resolver, CDN, server. Aur ulta bhi yaad rakho: har cache <strong>purani copy</strong> de sakta hai. Isliye har cache ke saath ek TTL ya max-age hota hai: "itni der baad dobara poochh lena".` },

    { type: 'h3', text: 'Khud try karo: page kitni der mein aayega?' },
    { type: 'p', html: `Neeche server ki doori, DNS cache, connection aur TLS version badlo. Widget har step ka time jodta hai, jab tak pehla byte (response ka shuru) wapas nahi aata.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Server kahan hai (RTT)</label><select class="hw-rtt">
            <option value="10">Usi shehar mein (~10 ms)</option><option value="40">India mein kahin (~40 ms)</option><option value="70">Singapore (~70 ms)</option><option value="220" selected>America (~220 ms)</option></select></div>
          <div><label>DNS answer kahan se</label><select class="hw-dns">
            <option value="full" selected>Poora lookup (root → TLD → auth)</option><option value="res">Resolver ke cache se</option><option value="browser">Browser ke cache se</option></select></div>
          <div><label>Connection</label><select class="hw-conn"><option value="new" selected>Naya (handshake chahiye)</option><option value="reuse">Pehle se khula (reuse)</option></select></div>
          <div><label>TLS version</label><select class="hw-tls"><option value="1.3" selected>TLS 1.3 (1 round trip)</option><option value="1.2">TLS 1.2 (2 round trips)</option></select></div>
        </div>
        <label>Server + database ka kaam: <strong class="hw-stv">50 ms</strong></label><input type="range" class="hw-st" min="5" max="500" step="5" value="50" style="width:100%">
        <div class="hw-bar" style="display:flex;height:26px;border-radius:var(--r-sm);overflow:hidden;margin:12px 0 6px;border:1px solid var(--line)"></div>
        <div class="hw-legend" style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--ink-2)"></div>
        <div class="stats"><div class="stat"><span>Pehla byte aane tak</span><strong class="hw-tot"></strong></div><div class="stat"><span>Server tak round trips</span><strong class="hw-rt"></strong></div></div>
        <div class="calc-note">Andaaza: resolver tak ~20 ms, aur resolver se root, TLD, authoritative har ek ~30 ms (poora lookup = 20 + 3 × 30 = 110 ms). Iske baad rendering aur baaki files ka time alag se judta hai.</div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const rtt = Number(q('.hw-rtt').value), d = q('.hw-dns').value, reuse = q('.hw-conn').value === 'reuse', tls12 = q('.hw-tls').value === '1.2', st = Number(q('.hw-st').value);
        const dns = d === 'browser' ? 0 : d === 'res' ? 20 : 110;
        const tcp = reuse ? 0 : rtt, tls = reuse ? 0 : rtt * (tls12 ? 2 : 1), http = rtt;
        const segs = [['DNS', dns, 'var(--accent)'], ['TCP', tcp, 'var(--violet)'], ['TLS', tls, 'var(--amber)'], ['HTTP', http, 'var(--green)'], ['Server + DB', st, 'var(--ink-3)']];
        const tot = segs.reduce((a, s) => a + s[1], 0);
        q('.hw-stv').textContent = st + ' ms';
        q('.hw-bar').innerHTML = segs.filter(s => s[1] > 0).map(s => `<div title="${s[0]}: ${s[1]} ms" style="width:${(s[1] / tot * 100).toFixed(2)}%;background:${s[2]}"></div>`).join('');
        q('.hw-legend').innerHTML = segs.map(s => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s[2]};margin-right:4px"></i>${s[0]}: <strong>${s[1]} ms</strong></span>`).join('');
        q('.hw-tot').textContent = tot + ' ms';
        q('.hw-rt').textContent = (reuse ? 0 : 1) + (reuse ? 0 : (tls12 ? 2 : 1)) + 1;
      };
      el.querySelectorAll('select, input').forEach(i => { i.addEventListener('input', upd); i.addEventListener('change', upd); });
      upd();
    }},
    { type: 'p', html: `Default setting (America, pehli visit, TLS 1.3) pe <strong>820 ms</strong> lagte hain, aur usme se sirf 50 ms server ka kaam hai. Baaki sab safar hai. Server ko India le aao (~40 ms): <strong>280 ms</strong>. America hi rakho lekin DNS browser cache se aur connection reuse: <strong>270 ms</strong>. Sabak: <em>doori aur round trips</em> sabse bada kharcha hain. Isliye CDN, caching aur connection reuse itne zaroori hain.` },

    { type: 'h2', text: 'Ye simple architecture kab kaafi hai?' },
    { type: 'p', html: `Agar xyz.com pe din mein 50 log aate hain, to ek server aur ek database kaafi hai. Load Balancer ya CDN lagana yahan bekaar complexity hogi. Lekin "Server down" scenario yaad rakhna: ek hi server = SPOF. Aur "Database down" bhi: server zinda ho to bhi page nahi banta. Iske solutions aage ke lessons mein aayenge.` },
    { type: 'callout', tone: 'mistake', html: `Teen common galatfehmiyan:<br>1) <strong>"DNS page bhejta hai."</strong> Nahi. DNS sirf address batata hai. Page server bhejta hai.<br>2) <strong>"HTTPS matlab site safe hai."</strong> HTTPS sirf ye pakka karta hai ki raaste mein koi padh na sake aur tum asli domain se baat kar rahe ho. Site khud dhokebaaz ho sakti hai.<br>3) <strong>"Internet = WiFi."</strong> WiFi sirf tumhare ghar ka aakhri hissa hai. Baaki safar taar, fiber aur samundar ki cables se hota hai.` },

    { type: 'diagram', title: 'xyz.com type karne se page tak: poori picture', height: 540,
      groups: [
        { label: 'Tumhara device', x: 12, y: 220, w: 176, h: 262 },
        { label: 'DNS (phonebook)', x: 250, y: 8, w: 455, h: 270 },
        { label: 'Raaste mein', x: 250, y: 425, w: 180, h: 100 },
        { label: 'xyz.com ke servers', x: 525, y: 300, w: 180, h: 225 },
      ],
      nodes: [
        { id: 'browser', label: 'Browser', sub: 'tum', x: 100, y: 280, w: 150, kind: 'client', info: 'Ye kya hai: tumhara Chrome/Safari. Kyun yahan: poore safar ka manager yahi hai. Cache dekhta hai, DNS se IP poochhta hai, TCP + TLS ka haath milata hai, HTTP request bhejta hai, aur page render karta hai.' },
        { id: 'bcache', label: 'Browser cache', sub: 'DNS + files', x: 100, y: 440, w: 150, kind: 'cache', info: 'Ye kya hai: browser ki apni memory. Kyun yahan: DNS answers (TTL tak) aur images/CSS/JS (max-age tak) yahin se mil jaate hain. Cache hit = koi network request nahi, 0 ms.' },
        { id: 'res', label: 'DNS Resolver', sub: 'ISP / 8.8.8.8', x: 340, y: 120, w: 150, kind: 'net', info: 'Ye kya hai: tumhara DNS agent. Kyun yahan: browser ki jagah root, TLD aur authoritative se poochhta hai, aur jawab lakhon users ke liye cache karta hai.' },
        { id: 'root', label: 'Root server', sub: '"." 13 naam', x: 610, y: 60, w: 160, kind: 'net', info: 'Ye kya hai: DNS seedhi ka sabse upar ka server. Kyun yahan: batata hai ki ".com" ka register kahan hai. 13 naam, 2,000+ copies duniya bhar mein.' },
        { id: 'tld', label: '.com TLD', sub: '.com ka register', x: 610, y: 150, w: 160, kind: 'net', info: 'Ye kya hai: ".com" naamon ka register. Kyun yahan: batata hai ki xyz.com ka record kaunsa authoritative server rakhta hai.' },
        { id: 'auth', label: 'Authoritative', sub: 'xyz.com record', x: 610, y: 240, w: 160, kind: 'net', info: 'Ye kya hai: xyz.com ka asli DNS record rakhne wala server. Kyun yahan: final answer "xyz.com = 203.0.113.10, TTL 300" yahin se aata hai.' },
        { id: 'cdn', label: 'CDN edge', sub: 'images, CSS, JS', x: 340, y: 480, w: 150, kind: 'net', info: 'Ye kya hai: tumhare shehar ke paas rakha server jo xyz.com ki files ki copy rakhta hai. Kyun yahan: bhaari files door ke server se na aayein. Copy na ho (miss) to ek baar server se laakar rakh leta hai.' },
        { id: 'server', label: 'Server', sub: '203.0.113.10', x: 610, y: 360, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka computer. Kyun yahan: TCP/TLS handshake, HTTP request padhna, database se data laana, HTML banana aur 200 OK bhejna.' },
        { id: 'db', label: 'Database', sub: 'posts, users', x: 610, y: 480, w: 140, kind: 'data', info: 'Ye kya hai: data ka permanent ghar. Kyun yahan: homepage ki latest posts yahin se aati hain. Ye band ho to server 503 bhejta hai.' },
      ],
      edges: [
        { a: 'browser', b: 'bcache', n: 1, label: 'yaad hai?' },
        { a: 'browser', b: 'res', n: 2, label: 'IP?' },
        { a: 'res', b: 'root', n: 3 },
        { a: 'res', b: 'tld', n: 4 },
        { a: 'res', b: 'auth', n: 5 },
        { a: 'browser', b: 'server', n: 6, label: 'TCP+TLS+GET' },
        { a: 'server', b: 'db', n: 7, label: 'query' },
        { a: 'browser', b: 'cdn', n: 8, label: 'files' },
        { a: 'cdn', b: 'server', label: 'miss pe', dashed: true },
      ],
      paths: [
        { name: 'DNS lookup', text: 'Browser apna cache dekhta hai (1). Nahi mila to resolver se poochhta hai (2). Resolver root (3), .com TLD (4) aur authoritative (5) se poochh ke IP laata hai, aur TTL tak yaad rakhta hai.', go: ['browser>bcache', 'browser>res>root', 'res>tld', 'res>auth'] },
        { name: 'Pehli visit', text: 'DNS se IP, phir server se TCP + TLS handshake aur GET (6). Server database se posts laata hai (7) aur HTML bhejta hai. Images, CSS, JS CDN se aate hain (8); CDN ke paas na ho to wo server se laata hai.', go: ['browser>res', 'browser>server>db', 'browser>cdn>server'] },
        { name: 'Dobara visit (cached)', text: 'IP browser cache mein hai, files bhi. Sirf HTML ke liye server tak jaana pada, aur connection khula ho to handshake bhi nahi. Bahut kam safar.', go: ['browser>bcache', 'browser>server'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Browser = client. Server = 24x7 on computer jo request ka jawab deta hai.</li>
      <li>DNS naam ko IP mein badalta hai: resolver → root → TLD → authoritative. Jawab TTL tak cache hota hai.</li>
      <li>TCP handshake (SYN, SYN-ACK, ACK) = 1 round trip. TLS 1.3 = 1 aur round trip. Phir HTTP request.</li>
      <li>HTTP request = method + path + headers. Response = status code + headers + body. 2xx theek, 4xx client ki galti, 5xx server ki.</li>
      <li>Server aksar database se data laata hai. Database band = 500/503, chahe server zinda ho.</li>
      <li>Browser HTML → DOM, phir CSS, JS, images ki aur requests, phir layout aur paint.</li>
      <li>Caching har level pe: browser, OS, resolver, CDN, server. Doori aur round trips sabse bada kharcha hain.</li>
      <li>Ek server, ek DNS provider, ek database: har ek SPOF ho sakta hai.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Bahut simple: ek server, ek database, kam cost', 'Debug karna aasaan: request ka raasta ek hi hai', 'Chhote traffic ke liye perfect', 'DNS + caching se dobara visits fast'], costs: ['Server gira to website giri (SPOF)', 'DNS provider ya database gira to bhi site gayi', 'Traffic badha to slow', 'Ek hi jagah pe hai: door ke users ke liye har round trip mehnga'] },

    { type: 'think', questions: [
      { q: 'DNS theek chal raha hai lekin server crash ho gaya. User ko kya dikhega?', a: 'DNS IP de dega, browser TCP handshake shuru karega, lekin jawab nahi aayega. Kuch der baad "connection timed out" error dikhega. DNS ka kaam sirf address batana hai, page dena nahi.' },
      { q: 'Kal xyz.com khola tha, aaj dobara khola. Kya DNS se poochhna pada?', a: 'Shayad haan! TTL aksar minutes ka hota hai, din ka nahi. TTL khatam ho gaya to browser/resolver phir se poochhega. Lekin aksar resolver ke cache mein kisi aur user ki wajah se fresh jawab hota hai, to poora root → TLD → authoritative wala safar nahi karna padta.' },
      { q: 'Server America mein hai, users India mein. Pehli visit 820 ms leti hai, server ka kaam sirf 50 ms. Teen tareeke batao jisse ye kam ho.', a: '1) Server (ya uski copy) India ke paas lao: RTT 220 se ~40 ms. 2) CDN se images/CSS/JS paas se do. 3) Connection reuse aur TLS 1.3 se round trips kam karo. (Bonus: HTTP/3 handshake aur bhi chhota karta hai, "HTTP versions" lesson mein.)' },
      { q: 'Database band hai lekin server chal raha hai. Browser ko kya milega, aur ye "timeout" se behtar kyun hai?', a: 'Server 503 Service Unavailable bhejega. Ye timeout se behtar hai kyunki user (aur app) ko turant pata chal jaata hai ki gadbad hai aur kuch der baad try karna hai. Request latki nahi rehti.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'DNS ka kaam kya hai?', options: ['Webpage bhejna', 'Domain name ko IP address mein badalna', 'Traffic ko servers mein baantna'], answer: 1, explain: 'DNS = phonebook. Page server bhejta hai, traffic Load Balancer baantta hai.' },
      { q: 'Status code 404 ka matlab?', options: ['Server crash', 'Ye page exist nahi karta', 'Sab theek'], answer: 1, explain: '4xx = client ki taraf ki problem. 404 = jo maanga wo mila nahi. Server ki problem 5xx hoti hai.' },
      { q: 'DNS TTL ko 1 din karne ka nuksaan?', options: ['Website slow ho jayegi', 'IP badalne pe log der tak purane IP pe jaayenge', 'DNS server crash hoga'], answer: 1, explain: 'Lamba TTL = cache lamba. Fast hai, lekin changes der se pahunchte hain.' },
      { q: 'TCP 3-way handshake ke teen messages ka sahi order?', options: ['ACK, SYN, SYN-ACK', 'SYN, SYN-ACK, ACK', 'HELLO, OK, GET'], answer: 1, explain: 'Browser SYN ("baat karein?"), server SYN-ACK ("haan"), browser ACK ("theek hai"). Ek round trip.' },
      { q: 'TLS kya karta hai?', options: ['Page ko fast banata hai', 'Data ko encrypt karta hai aur certificate se server ki pehchaan saabit karta hai', 'Naam ko IP mein badalta hai'], answer: 1, explain: 'TLS = taala + pehchaan. HTTP + TLS = HTTPS. Speed ke liye ye ulta ek round trip leta hai.' },
      { q: 'Dobara visit fast kyun hoti hai?', options: ['Server dobara visit pe tez chalta hai', 'DNS answer, files aur kabhi connection bhi cache/reuse ho jaate hain', 'Internet raat ko fast hota hai'], answer: 1, explain: 'Browser cache DNS answers aur files rakhta hai, aur khula connection reuse hota hai. Kam round trips = kam time.' },
    ]},
    { type: 'sources', items: [
      { title: 'Root Servers', publisher: 'root-servers.org', url: 'https://root-servers.org/', used: '13 root server naam, 12 operators, aur 2,000+ operational instances (Oct 2026 ka count).', official: true },
      { title: 'RFC 9293: Transmission Control Protocol (TCP)', publisher: 'IETF', year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9293', used: '3-way handshake (SYN, SYN-ACK, ACK) aur reliable, in-order delivery.', official: true },
      { title: 'RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3', publisher: 'IETF', year: 2018, url: 'https://www.rfc-editor.org/rfc/rfc8446', used: 'TLS 1.3 ka full handshake ek round trip mein; certificate se server ki pehchaan.', official: true },
      { title: 'An overview of HTTP', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview', used: 'Request/response ki shakal, methods, headers aur status codes.', official: true },
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control', used: 'max-age se browser aur CDN caching.', official: true },
      { title: 'Populating the page: how browsers work', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work', used: 'Rendering steps: DOM, CSS, layout, paint.', official: true },
    ]},
  ],
});
