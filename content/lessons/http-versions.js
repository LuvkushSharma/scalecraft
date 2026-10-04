Lesson.register({
  id: 'http-versions',
  title: 'HTTP/1.1, HTTP/2, HTTP/3',
  minutes: 22,
  summary: `Ek webpage ke liye browser ko 50-100 files chahiye hoti hain. HTTP ke har naye version ne ek hi problem ko behtar solve kiya: zyada files, kam intezaar. HTTP/1.1 ne connection reuse diya, HTTP/2 ne ek connection pe sab files ek saath, aur HTTP/3 ne TCP chhod ke QUIC (UDP) pe packet loss aur network badalne ki problem sulajhayi.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `xyz.com ka homepage kholne ke liye browser ko ek nahi, 60 alag files laani padti hain: page, design, code, photos, fonts.<br>Socho har file ke liye tumhe ek hi khidki pe line mein lagna pade, aur har baar khidki tak jaane-aane mein 0.2 second lagein. 60 files = bahut intezaar.<br>HTTP ke teen versions is line ko chhota karne ki teen koshishein hain: <strong>1.1</strong> = khidki khuli rakho, baar baar band mat karo. <strong>2</strong> = ek hi khidki pe saari files ek saath maango. <strong>3</strong> = ek file atak jaaye to baaki mat roko, aur WiFi se 4G pe jaao to bhi baat chalti rahe.` },

    { type: 'h2', text: 'Problem: ek page, bahut saari files' },
    { type: 'p', html: `xyz.com ka homepage sirf ek HTML file nahi hai. Usme CSS (design), JavaScript (code), logo, 20 thumbnails, fonts sab hain. Har file ke liye ek <strong>HTTP request</strong>. Aur har request ko server tak jaana aur jawab wapas aana padta hai (ek <strong>round trip</strong>). India se US server ka ek round trip ~200 ms. Agar files ek ke baad ek aayein to page khulne mein seconds lag jaayenge.` },
    { type: 'callout', tone: 'term', title: 'Yaad karo: RTT', html: `<strong>RTT (Round Trip Time)</strong>: ek message bhejne aur jawab wapas aane mein laga time. Web speed ka sabse bada dushman aksar bandwidth nahi, RTT hai, kyunki roshni ki speed fix hai. Isliye har HTTP version ka asli khel hai: <strong>round trips kam karo</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: HTTP aur headers', html: `<strong>Ye kya hai:</strong> HTTP browser aur server ke beech sawaal-jawab ki bhasha (layer 7). Har request mein ek line ("GET /logo.png") aur kai <strong>headers</strong> hote hain: extra jaankari jaise browser ka naam, cookies (login pehchaan), kaunsi language chahiye.<br><strong>Kyun yaad rakhna:</strong> headers har request ke saath jaate hain, aur aksar 500-800 bytes ke hote hain, jabki asli request chhoti. 60 requests = 60 baar wahi headers. HTTP/2 ne isi ko chhota kiya.<br><strong>Iske bina:</strong> server ko pata hi nahi chalta tum kaun ho ya kya maang rahe ho.` },
    { type: 'code', text: `GET /images/logo.png HTTP/1.1
Host: xyz.com
User-Agent: Mozilla/5.0 (Linux; Android 14) Chrome/124...
Accept: image/avif,image/webp,*/*
Accept-Language: hi-IN,en;q=0.8
Cookie: session=8f3a...c91; theme=dark; ab_test=v2

HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 18342
Cache-Control: max-age=86400` },

    { type: 'h2', text: 'HTTP/1.0 aur HTTP/1.1: connection khula rakho' },
    { type: 'p', html: `<strong>HTTP/1.0</strong> (1996) mein har file ke liye naya TCP connection: handshake, ek file, connection band. Agli file? Phir se handshake. HTTPS ke saath har file pe 2-3 RTT sirf "hello" mein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: keep-alive (persistent connection)', html: `<strong>Ye kya hai:</strong> ek baar bana TCP (+TLS) connection band mat karo. Usi pe agli request bhejo.<br><strong>Kyun chahiye:</strong> handshake ka kharcha (1-3 RTT) har file pe nahi, sirf ek baar. Aur connection ka congestion window (pichhle lesson ka cwnd) garam rehta hai, to data tez jaata hai.<br><strong>Iske bina:</strong> 60 files = 60 handshakes.<br><strong>Example:</strong> <strong>HTTP/1.1</strong> (1997, aaj ka standard RFC 9112) mein keep-alive by default hai.` },
    { type: 'p', html: `Lekin HTTP/1.1 mein ek badi kamzori bachi: ek connection pe <strong>ek waqt mein ek hi request-response</strong>. Agli request tab tak nahi ja sakti jab tak pichhla jawab poora na aa jaaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: head-of-line (HoL) blocking', html: `<strong>Ye kya hai:</strong> line mein sabse aage wala dheema hai, to peeche wale sab atke hain, chahe unka kaam 1 second ka ho.<br><strong>HTTP/1.1 mein:</strong> ek badi photo aa rahi hai, to uske peeche chhoti CSS file intezaar karti hai, aur page ka design der se aata hai.<br><strong>Kyun yaad rakhna:</strong> HTTP/2 ne HTTP wala HoL hataya, lekin TCP wala HoL bacha raha. HTTP/3 ne wo bhi hataya. Isi kahani ko neeche chala ke dekhoge.` },
    { type: 'list', items: [
      `<strong>Pipelining (fail hua idea):</strong> HTTP/1.1 ne allow kiya ki kai requests bina ruke bhej do. Lekin jawab phir bhi <em>usi order</em> mein aane zaroori the, to HoL waisa hi raha, aur kai proxies ise sahi handle nahi karte the. Browsers ne ise kabhi on hi nahi kiya.`,
      `<strong>6 connections (jugaad):</strong> browsers ek domain ke liye ~6 parallel connections kholte hain. 6 lines = 6 files ek saath. Kimat: 6 handshakes, 6 slow starts, server pe 6 guna connections.`,
      `<strong>Aur jugaad:</strong> domain sharding (images ko <code>img1.xyz.com</code>, <code>img2.xyz.com</code> pe baanto taaki 12 connections mil jaayein), sprites (bahut saare icons ek photo mein), bundling (saari JS ek file). Ye sab HTTP/1.1 ki kamzori chhupane ke tareeke the.`,
    ]},

    { type: 'h2', text: 'Simulator: 12 files, paanch tareeke' },
    { type: 'p', html: `Neeche browser 12 files load kar raha hai (RTT 100 ms maana). Version badlo. Phir "packet loss" on karke dekho ki kaun kitna pareshan hota hai. Grey = connection setup (TCP + TLS), halka = line mein intezaar, gaadha = file aa rahi hai, laal = khoye packet ka intezaar.` },
    { type: 'custom', render(el) {
      const MODES = [['10', 'HTTP/1.0'], ['11', 'HTTP/1.1'], ['116', 'HTTP/1.1 × 6'], ['2', 'HTTP/2'], ['3', 'HTTP/3']];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${MODES.map(([k, n]) => `<button class="btn small" data-v="${k}">${n}</button>`).join('')}</div>
        <label style="display:flex;gap:6px;align-items:center;margin-top:10px"><input type="checkbox" class="hv-loss"> Packet loss (file 2 ka ek packet kho jaaye)</label>
        <div class="hv-bars" style="margin-top:12px"></div>
        <div class="stats"><div class="stat"><span>Page ready</span><strong class="hv-t"></strong></div><div class="stat"><span>Connections</span><strong class="hv-c"></strong></div><div class="stat"><span>Loss se atki files</span><strong class="hv-h"></strong></div></div>
        <div class="calc-note hv-n"></div>`;
      const files = ['index.html', 'style.css', 'app.js', 'logo.png', 'font.woff2', 'photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg', 'photo6.jpg', 'photo7.jpg'];
      const RTT = 100, X = 20, F = 10;
      let v = '11';
      const model = (ver, loss) => {
        const rows = []; const L = i => loss && i === 1;
        if (ver === '10' || ver === '11') {
          let t = ver === '11' ? 2 * RTT : 0; let late = false;
          files.forEach((f, i) => {
            const g0 = ver === '10' ? t : 0, g1 = ver === '10' ? t + 2 * RTT : 2 * RTT, s = ver === '10' ? g1 : t;
            const ex = L(i) ? 2 * RTT : 0; const e = s + RTT + X + ex;
            if (loss && i > 1) late = true;
            rows.push({ f, g0, g1, s, e, lossAt: ex ? s + RTT : null, hit: ex > 0 || late }); t = e;
          });
          return { rows, conns: ver === '10' ? '12 (har file ka naya)' : '1' };
        }
        if (ver === '116') {
          const ct = [0, 0, 0, 0, 0, 0].map(() => 2 * RTT); const hitc = new Set();
          files.forEach((f, i) => {
            const c = i % 6, s = ct[c], ex = L(i) ? 2 * RTT : 0, e = s + RTT + X + ex;
            if (ex) hitc.add(c);
            rows.push({ f, g0: 0, g1: 2 * RTT, s, e, lossAt: ex ? s + RTT : null, hit: ex > 0 || (hitc.has(c) && i > 1) }); ct[c] = e;
          });
          return { rows, conns: '6 (6 handshakes)' };
        }
        const setup = ver === '2' ? 2 * RTT : RTT, base = setup + RTT;
        files.forEach((f, i) => {
          let e = base + F * (i + 1), lossAt = null, hit = false;
          if (loss && ((ver === '2' && i >= 1) || (ver === '3' && i === 1))) { e += 2 * RTT; lossAt = base + F; hit = true; }
          rows.push({ f, g0: 0, g1: setup, s: setup, e, lossAt, hit });
        });
        return { rows, conns: '1' };
      };
      const NOTE = {
        '10': ['Har file ka naya connection: TCP + TLS handshake, phir request. 12 files = 12 baar "hello". Sabse dheema.', 'Har file ka naya connection, aur file 2 ke khoye packet ne peeche ki saari files aur late kar di (sab ek ke baad ek hain).'],
        '11': ['Ek connection, keep-alive: handshake sirf ek baar. Lekin ek waqt mein ek hi file. Baaki files line mein (halka hissa): yahi HTTP wala head-of-line blocking hai.', 'File 2 ka packet khoya: TCP use dobara bhejta hai, aur line mein peeche khadi saari files aur der se aati hain.'],
        '116': ['Browser ka jugaad: 6 connections, 6 lines. 12 files 2 round mein aa gayin. Kimat: 6 handshakes aur server pe 6 guna connections.', 'Loss sirf us ek connection ki line ko rokta hai (file 2 aur uske peeche file 8). Baaki 5 connections chalte rahe.'],
        '2': ['HTTP/2: ek connection, saari 12 files ek saath alag streams mein (multiplexing). Koi line nahi. Ek handshake.', 'HTTP/2 ki kamzori: saari streams ek hi TCP connection pe hain. TCP order ka vaada karta hai, to ek packet khoya to us connection ki SAARI baaki files ruk jaati hain, chahe unka data pahunch chuka ho. TCP wala head-of-line blocking.'],
        '3': ['HTTP/3 QUIC pe chalta hai: connection aur TLS ka handshake ek saath, to setup ek RTT kam. Multiplexing HTTP/2 jaisa hi.', 'HTTP/3 mein har stream ka loss alag sambhala jaata hai: sirf file 2 rukti hai, baaki 11 chalti rehti hain.'],
      };
      const draw = () => {
        el.querySelectorAll('[data-v]').forEach(b => b.className = 'btn small' + (b.dataset.v === v ? ' primary' : ''));
        const loss = el.querySelector('.hv-loss').checked, m = model(v, loss);
        const tot = Math.max(...m.rows.map(r => r.e)), max = Math.max(tot, 700);
        const pct = x => (x / max * 100).toFixed(2) + '%';
        el.querySelector('.hv-bars').innerHTML = m.rows.map(r => `
          <div style="display:grid;grid-template-columns:84px 1fr;gap:8px;align-items:center;margin:3px 0">
            <code style="font-size:11.5px">${r.f}</code>
            <div style="position:relative;height:13px;background:var(--surface-2);border-radius:4px;overflow:hidden">
              <div style="position:absolute;left:${pct(r.g0)};width:${pct(r.g1 - r.g0)};top:0;bottom:0;background:var(--line-2)"></div>
              ${r.s > r.g1 ? `<div style="position:absolute;left:${pct(r.g1)};width:${pct(r.s - r.g1)};top:0;bottom:0;background:var(--accent-soft)"></div>` : ''}
              <div style="position:absolute;left:${pct(r.s)};width:${pct(r.e - r.s)};top:0;bottom:0;background:var(--accent);border-radius:3px"></div>
              ${r.lossAt != null ? `<div style="position:absolute;left:${pct(r.lossAt)};width:${pct(2 * RTT)};top:0;bottom:0;background:var(--red)"></div>` : ''}
            </div></div>`).join('');
        el.querySelector('.hv-t').textContent = tot + ' ms';
        el.querySelector('.hv-c').textContent = m.conns;
        el.querySelector('.hv-h').textContent = loss ? String(m.rows.filter(r => r.hit).length) : '0';
        el.querySelector('.hv-n').textContent = NOTE[v][loss ? 1 : 0];
      };
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { v = b.dataset.v; draw(); });
      el.querySelector('.hv-loss').onchange = draw;
      draw();
    }},
    { type: 'p', html: `<strong>Kya dikha (bina loss):</strong> HTTP/1.0 <strong>3840 ms</strong>, HTTP/1.1 ek connection <strong>1640 ms</strong>, 6 connections <strong>440 ms</strong>, HTTP/2 <strong>420 ms</strong> (sirf 1 connection), HTTP/3 <strong>320 ms</strong>. <strong>Loss ke saath:</strong> HTTP/2 mein 11 files atak gayin (620 ms), HTTP/3 mein sirf 1 (420 ms). Ye simplified model hai, asli numbers network pe depend karte hain, lekin pattern yahi hai.` },

    { type: 'h2', text: 'HTTP/2 (2015): ek connection, bahut saari streams' },
    { type: 'callout', tone: 'term', title: 'Naya word: multiplexing, stream, frame', html: `<strong>Ye kya hai:</strong> HTTP/2 har request-response ko ek <strong>stream</strong> (number wali alag baatcheet) banata hai, aur har stream ke data ko chhote <strong>frames</strong> mein kaat deta hai. Kai streams ke frames ek hi connection pe mile-jule (interleave) chalte hain. Har frame pe stream number likha hai, to doosri taraf sahi jod liye jaate hain. Isi ko <strong>multiplexing</strong> kehte hain.<br><strong>Kyun chahiye:</strong> 60 files ek saath, ek connection pe. Koi line nahi, 6 connections ka jugaad nahi.<br><strong>Iske bina (HTTP/1.1):</strong> ek waqt mein ek file per connection.<br><strong>Example:</strong> badi photo (stream 5) aa rahi hai aur beech mein chhoti CSS (stream 3) ke frames bhi ghus ke aa jaate hain. CSS photo ka intezaar nahi karti.` },
    { type: 'list', items: [
      `<strong>Binary format:</strong> HTTP/1.1 text tha (insaan padh sakta tha). HTTP/2 binary frames bhejta hai: machine ke liye tez aur kam galti wala. Matlab wahi rehta hai: GET, headers, status codes sab same.`,
      `<strong>Priorities:</strong> browser bata sakta hai "CSS pehle, photos baad mein".`,
      `<strong>Server push (fail hua):</strong> server bina maange files bhej sakta tha. Achhe se chalana mushkil tha, aksar faltu data jaata tha. Chrome ne 2022 (version 106) mein ise band kar diya. Ab iski jagah "103 Early Hints" (server sirf ishaara deta hai ki kya chahiye hoga) use hota hai.`,
      `<strong>Purane jugaad ab nuksaan:</strong> domain sharding se HTTP/2 ka ek connection toot ke kai ban jaata hai. Bahut badi bundling se chhota badlav bhi poori file ka cache tod deta hai. HTTP/2 ke saath files chhoti aur alag rakhna theek hai.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: HPACK (header compression)', html: `<strong>Ye kya hai:</strong> HTTP/2 ka headers chhota karne ka tareeka. Dono taraf ek <strong>table</strong> (yaad rakhne ki list) banti hai. Pehli request mein cookie, browser ka naam jaise headers poore jaate hain aur table mein likh liye jaate hain. Agli requests mein sirf unka chhota number (index) jaata hai: "wahi #62 wala cookie".<br><strong>Kyun chahiye:</strong> headers har request mein lagbhag same hote hain. 60 baar 700 bytes bhejna bekaar hai, khaaskar mobile ke dheeme upload pe.<br><strong>Iske bina:</strong> page ke asli data se zyada bytes kabhi kabhi sirf headers mein chale jaate.<br><strong>Example:</strong> HTTP/3 mein iska bhai <strong>QPACK</strong> hai, jo QUIC ki alag-alag streams ke saath kaam karta hai.` },
    { type: 'p', html: `Slider ghumao: kitni requests, aur har request ke headers kitne bade. Model simple hai: HPACK mein pehli request ke headers poore, baaki har request ~30 bytes (sirf table ke numbers aur jo badla, jaise file ka path).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Requests: <strong class="hp-nv"></strong></label><input type="range" class="hp-n" aria-label="Requests" min="1" max="100" step="1" value="60"></div>
        <div><label>Headers per request: <strong class="hp-hv"></strong> bytes</label><input type="range" class="hp-h" aria-label="Header bytes" min="200" max="1500" step="50" value="700"></div></div>
        <div class="stats"><div class="stat"><span>HTTP/1.1 (har baar poore)</span><strong class="hp-a"></strong></div><div class="stat"><span>HTTP/2 HPACK (lagbhag)</span><strong class="hp-b"></strong></div><div class="stat"><span>Bachat</span><strong class="hp-s"></strong></div></div>
        <div class="calc-note hp-x"></div>`;
      const REP = 30;
      const kb = b => b >= 1000 ? (b / 1000).toFixed(1) + ' KB' : b + ' B';
      const draw = () => {
        const n = +el.querySelector('.hp-n').value, h = +el.querySelector('.hp-h').value;
        const a = n * h, b = h + (n - 1) * REP, s = Math.round((1 - b / a) * 100);
        el.querySelector('.hp-nv').textContent = n; el.querySelector('.hp-hv').textContent = h;
        el.querySelector('.hp-a').textContent = kb(a); el.querySelector('.hp-b').textContent = kb(b); el.querySelector('.hp-s').textContent = s + '%';
        el.querySelector('.hp-x').textContent = `HTTP/1.1: ${n} × ${h} = ${a} bytes. HPACK: ${h} + ${n - 1} × ${REP} = ${b} bytes. ` + (n === 1 ? 'Ek hi request ho to koi bachat nahi: table pehli baar hi ban rahi hai.' : 'Jitni zyada requests, utni zyada bachat, kyunki repeat hone wale headers sirf number ban jaate hain.');
      };
      el.querySelector('.hp-n').oninput = draw; el.querySelector('.hp-h').oninput = draw; draw();
    }},
    { type: 'callout', tone: 'warn', title: 'HTTP/2 ki bachi kamzori: TCP wala head-of-line blocking', html: `HTTP/2 ne HTTP wali line hataayi, lekin neeche ab bhi <strong>ek TCP connection</strong> hai. TCP ko streams ka pata hi nahi: wo bas bytes ko order mein deta hai. Ek packet khoya, to TCP uske peeche ke saare bytes rok leta hai, chahe wo kisi aur stream ke hon. Kharab mobile network pe (2% loss) HTTP/2 kabhi kabhi 6 connections wale HTTP/1.1 se bhi bura chal sakta hai, kyunki wahan ek loss sirf ek connection rokta tha. Simulator mein "HTTP/2 + packet loss" yahi dikhata hai.` },
    { type: 'h2', text: 'HTTP/3 (2022): TCP chhodo, QUIC lao' },
    { type: 'p', html: `TCP ka HoL TCP ke andar hi baitha hai. Aur TCP har computer ke operating system (kernel) mein bana hai, use badalne mein saalon lagte hain. Isliye Google ne ek naya transport banaya jo <strong>UDP ke upar</strong>, app ke andar chalta hai. Baad mein IETF ne ise standard banaya: <strong>QUIC</strong> (RFC 9000, 2021) aur uske upar <strong>HTTP/3</strong> (RFC 9114, June 2022).` },
    { type: 'callout', tone: 'term', title: 'Naya word: QUIC', html: `<strong>Ye kya hai:</strong> UDP ke upar bana ek transport protocol jo TCP ke saare kaam khud karta hai (har byte pahunchana, order, dobara bhejna, speed control) aur TLS 1.3 encryption andar hi rakhta hai. Bas ek fark: <strong>har stream ka hisaab alag</strong>.<br><strong>Kyun chahiye:</strong> stream 5 ka packet khoya to sirf stream 5 rukti hai, stream 3 ki CSS turant browser ko mil jaati hai.<br><strong>Iske bina:</strong> HTTP/2 + TCP mein ek khoya packet sab streams rok deta.<br><strong>Kyun UDP pe:</strong> UDP ek khaali canvas hai jo har router aur OS pehle se samajhta hai. Naya protocol banaoge to raaste ke purane routers aur firewalls use gira denge. UDP ke andar chhupa ke chalao to sab jagah pahunchta hai.` },
    { type: 'list', items: [
      `<strong>Tez handshake:</strong> QUIC connection aur TLS 1.3 ka handshake ek saath karta hai: naye connection pe 1 RTT (TCP + TLS 1.3 mein 2 RTT). Pehle aa chuke user ke liye <strong>0-RTT</strong>: pehle hi packet mein request (replay ke khatre ke saath, sirf safe requests ke liye).`,
      `<strong>Connection migration:</strong> TCP connection 4-tuple (IPs + ports) se pehchana jaata hai. Phone WiFi se 4G pe gaya, IP badla, connection toota: naya handshake. QUIC har connection ko ek <strong>connection ID</strong> deta hai. IP badle to bhi ID wahi, connection chalta rehta hai.`,
      `<strong>Sab encrypted:</strong> QUIC ke headers ka bhi zyada tar hissa encrypted hai, to raaste ke boxes andar jhaank ya chhed-chhaad nahi kar sakte.`,
      `<strong>Kamzoriyan:</strong> kuch office networks UDP block karte hain, tab browser chupchaap HTTP/2 pe aa jaata hai. QUIC app (user space) mein chalta hai, to bahut tez links pe CPU zyada khaata hai. Load balancers aur firewalls ko UDP 443 ke liye taiyaar karna padta hai.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: connection ID', html: `<strong>Ye kya hai:</strong> QUIC connection ka ek random number wala naam, jo har packet pe likha hota hai.<br><strong>Kyun chahiye:</strong> server ko pehchanna hai ki "ye packet kis baatcheet ka hai", bina IP aur port pe bharose ke, kyunki mobile pe IP badalta rehta hai.<br><strong>Iske bina (TCP):</strong> IP badla = connection mara = phir se handshake, aur chal rahi download/video atak jaati hai.` },
    { type: 'p', html: `Ab ek phone pe chala ke dekho: HTTP/2 ka happy path, packet loss pe HTTP/2 vs HTTP/3, aur ghar se nikalte waqt WiFi se 4G pe switch:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'ph', label: 'Phone', sub: 'browser / app', x: 90, y: 150, w: 130, kind: 'client', info: 'Ye kya hai: Riya ka phone, jo xyz.com ka page aur video khol raha hai. Browser khud decide karta hai ki HTTP/2 bole ya HTTP/3.' },
        { id: 'wifi', label: 'Ghar ka WiFi', sub: 'IP: 49.36.10.20', x: 290, y: 70, w: 150, kind: 'net', info: 'Ye kya hai: ghar ka WiFi network. Iske through phone ka bahar wala IP ek hai. Ghar se nikalte hi ye network chala jaayega.' },
        { id: 'fw', label: 'Office firewall', sub: 'UDP blocked', x: 290, y: 150, w: 150, kind: 'threat', hidden: true, info: 'Ye kya hai: kuch offices ka firewall jo UDP traffic (port 443 bhi) rok deta hai. QUIC UDP pe hai, to yahan HTTP/3 nahi chalega.' },
        { id: 'tower', label: '4G tower', sub: 'IP: 100.72.5.9', x: 290, y: 230, w: 150, kind: 'net', info: 'Ye kya hai: mobile network. Yahan phone ko bilkul alag IP milta hai. TCP ke liye ye naya connection hai, QUIC ke liye nahi.' },
        { id: 'edge', label: 'CDN edge', sub: 'HTTP/2 + HTTP/3', x: 510, y: 150, w: 160, kind: 'edge', info: 'Ye kya hai: xyz.com ka server jo user ke paas (CDN) baitha hai. Teeno versions bolta hai: HTTP/3 (UDP 443), aur HTTP/2 / HTTP/1.1 (TCP 443). Response mein Alt-Svc header se batata hai "mere paas HTTP/3 bhi hai".' },
      ],
      edges: [{ a: 'ph', b: 'wifi' }, { a: 'ph', b: 'tower' }, { a: 'ph', b: 'fw' }, { a: 'wifi', b: 'edge' }, { a: 'tower', b: 'edge' }, { a: 'fw', b: 'edge' }],
      scenarios: [
        { name: 'HTTP/2: ek connection', intro: 'Ek TCP + TLS connection, uspe teen files ek saath.', steps: [
          { title: 'Teen requests ek saath', text: 'Stream 1 = page, stream 3 = CSS, stream 5 = photo. Teeno ek hi connection pe, bina intezaar ke. Headers HPACK se chhote.', go: 'ph>wifi>edge', msg: 'HEADERS s1: GET /   s3: GET /style.css   s5: GET /photo.jpg' },
          { title: 'Frames mile-jule wapas', text: 'Server teeno ke frames interleave karke bhejta hai. Chhoti CSS badi photo ka intezaar nahi karti.', go: 'res:edge>wifi>ph', msg: 'DATA s3 | DATA s1 | DATA s5 | DATA s3 (end) | DATA s5 ...', after: { ph: { state: 'ok' } } },
          { title: 'Agli baar: HTTP/3', text: 'Response mein header tha: <code>Alt-Svc: h3=":443"</code>. Browser yaad rakh leta hai ki is server pe HTTP/3 bhi hai, aur agli baar QUIC try karega.', focus: ['edge'], msg: 'Alt-Svc: h3=":443"; ma=86400' },
        ]},
        { name: 'Loss: HTTP/2', intro: 'Failure: WiFi pe ek packet kho gaya. HTTP/2 ke neeche TCP hai.', steps: [
          { title: 'Teen streams ka data aa raha hai', text: 'CSS (s3), page (s1), photo (s5) ke frames ek hi TCP byte-line mein.', go: 'res:edge>wifi', msg: 's1 | s3 | s5 | s3 | s5' },
          { title: 'Photo wala packet kho gaya', text: 'Sirf stream 5 (photo) ka ek packet gira.', go: 'lost:wifi>ph', set: { wifi: { state: 'warn' } }, msg: 's5 packet ✗' },
          { title: 'Sab ruk gaye', text: 'CSS aur page ka data phone pe pahunch chuka hai, lekin TCP use browser ko nahi deta, kyunki byte-line mein beech ka tukda missing hai. Teeno streams intezaar karti hain: TCP wala head-of-line blocking.', focus: ['ph'], set: { ph: { state: 'warn', sub: 's1 s3 s5 ruke' } } },
          { title: 'Retransmit, phir sab chale', text: 'Lagbhag ek RTT baad khoya packet dobara aata hai, aur tab jaake teeno streams aage badhti hain.', go: 'res:edge>wifi>ph', set: { wifi: { state: '' } }, after: { ph: { state: 'ok', sub: 'browser / app' } } },
        ]},
        { name: 'Loss: HTTP/3', intro: 'Same loss, lekin is baar QUIC pe.', steps: [
          { title: 'Teen streams ka data aa raha hai', text: 'Wahi teen streams, lekin QUIC har stream ka hisaab alag rakhta hai.', go: 'res:edge>wifi', msg: 's1 | s3 | s5 | s3 | s5' },
          { title: 'Photo wala packet kho gaya', text: 'Phir se sirf stream 5 ka packet gira.', go: 'lost:wifi>ph', set: { wifi: { state: 'warn' } }, msg: 's5 packet ✗' },
          { title: 'Sirf photo rukti hai', text: 'CSS aur page turant browser ko mil gaye, page ka design aa gaya. Sirf photo ek RTT ruki, aur uska packet dobara aaya.', focus: ['ph'], set: { ph: { state: 'ok', sub: 's1 ✓ s3 ✓ s5 ruka' } } },
          { title: 'Photo bhi aa gayi', text: 'Retransmit ke baad stream 5 bhi poori. Baaki streams ko pata bhi nahi chala.', go: 'res:edge>wifi>ph', set: { wifi: { state: '' } }, after: { ph: { sub: 'sab ✓' } } },
        ]},
        { name: 'WiFi → 4G', intro: 'Riya video dekhte hue ghar se nikli. WiFi gaya, 4G aaya. Phone ka IP badal gaya.', steps: [
          { title: 'Video WiFi pe chal raha hai', text: 'HTTP/3 connection, connection ID = 7f3c. Phone ka IP 49.36.10.20.', go: 'res:edge>wifi>ph', msg: 'QUIC conn-id 7f3c, video chunks' },
          { title: 'WiFi gaya', text: 'Ghar se bahar. WiFi ka raasta khatam. TCP hota to connection yahin mar jaata (uski pehchaan IP + port thi), aur naya TCP + TLS handshake karna padta: 2 RTT ka atkaav.', set: { wifi: { state: 'down', sub: 'signal gaya' } }, focus: ['ph'] },
          { title: 'Same connection, naya IP', text: 'Phone 4G se agla packet bhejta hai, naye IP 100.72.5.9 se, lekin connection ID wahi 7f3c. Edge pehchaan leta hai (aur naye raaste ko ek chhote check se verify karta hai).', go: 'ph>tower>edge', msg: 'from 100.72.5.9  conn-id 7f3c' },
          { title: 'Video bina ruke chalta raha', text: 'Koi naya handshake nahi. Isko <strong>connection migration</strong> kehte hain. Train, auto, metro mein mobile users ke liye ye bahut kaam ka hai.', go: 'res:edge>tower>ph', after: { ph: { state: 'ok' } } },
        ]},
        { name: 'Office: UDP band', intro: 'Failure: Riya office mein hai, jahan firewall UDP rok deta hai.', steps: [
          { title: 'HTTP/3 try kiya', text: 'Browser ko yaad hai ki xyz.com pe HTTP/3 hai, to QUIC (UDP 443) ka pehla packet bhejta hai.', show: ['fw'], go: 'lost:ph>fw', msg: 'QUIC Initial (UDP 443)' },
          { title: 'Koi jawab nahi', text: 'Firewall ne UDP gira diya. Browser zyada der intezaar nahi karta: wo saath saath ya thodi der mein TCP connection bhi try karta hai.', focus: ['fw'], set: { fw: { state: 'warn' } } },
          { title: 'HTTP/2 pe wapas', text: 'TCP 443 allowed hai. Page HTTP/2 pe khul gaya. User ko pata bhi nahi chala. Isliye server pe HTTP/2 (aur 1.1) hamesha chalu rakhte hain: HTTP/3 ek bonus hai, akela raasta nahi.', go: ['ph>fw>edge', 'res:edge>fw>ph'], after: { ph: { state: 'ok', sub: 'HTTP/2 se chala' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTP/3 UDP pe hai, to unreliable hai"', html: `Galat. UDP sirf neeche ka dibba hai. QUIC uske upar khud retransmission, ordering, congestion control aur encryption karta hai, bilkul TCP + TLS jitna reliable. Fark sirf itna: ye kaam <strong>har stream ke liye alag</strong> hota hai.` },
    { type: 'h2', text: 'Teeno ek table mein' },
    { type: 'table', head: ['', 'HTTP/1.1 (1997)', 'HTTP/2 (2015)', 'HTTP/3 (2022)'], rows: [
      ['Neeche transport', 'TCP (+TLS)', 'TCP + TLS', 'QUIC (UDP), TLS 1.3 andar'],
      ['Format', 'Text', 'Binary frames', 'Binary frames'],
      ['Ek connection pe', 'Ek waqt mein ek request', 'Bahut saari streams (multiplexing)', 'Bahut saari streams, har ek alag'],
      ['Header compression', 'Nahi', 'HPACK', 'QPACK'],
      ['Head-of-line blocking', 'HTTP level + TCP level', 'Sirf TCP level', 'Nahi (stream ke andar hi)'],
      ['Naya connection (HTTPS)', 'TCP 1 + TLS 1-2 RTT', 'TCP 1 + TLS 1-2 RTT', '1 RTT (wapas aaye user ko 0-RTT)'],
      ['Network badla (WiFi → 4G)', 'Connection toota', 'Connection toota', 'Connection migration: chalta rehta hai'],
      ['Aaj kitna (Cloudflare Radar, 2025-26 ke aas paas)', '~25-30% requests', '~50% requests', '~20% requests'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Public website / app (browser aur mobile se):</strong> CDN ya load balancer pe HTTP/2 aur HTTP/3 dono on karo, HTTP/1.1 fallback ke liye. Mobile users aur kharab network (India mein common) ko HTTP/3 se sabse zyada faayda.<br><strong>Andar ki service-to-service calls:</strong> HTTP/2 (gRPC, yaani services ke beech tez, typed calls ka tareeka, isi pe chalta hai; Phase 1 ke API lessons mein aayega): multiplexing + streaming, aur data center ka network saaf hai to TCP ka HoL kam dikhta hai.<br><strong>Purane clients, simple tools, debugging:</strong> HTTP/1.1 kaafi hai.<br>Ek rule: <strong>HTTP/3 kabhi akela raasta mat banao</strong>, kyunki UDP kahin kahin block hota hai.` },

    { type: 'h2', text: 'System design mein kya matlab' },
    { type: 'table', head: ['Situation', 'Kya sochna hai'], rows: [
      ['Mobile users, kharab network (India mein common)', 'HTTP/3 ka faayda sabse zyada: loss pe kam atkaav, network switch pe connection zinda. Bade CDNs aur browsers support karte hain.'],
      ['Internal service-to-service calls', 'gRPC HTTP/2 pe chalta hai: multiplexing + streaming. Agle lessons mein.'],
      ['Bahut chhoti chhoti files', 'HTTP/2 ke baad unhe ek file mein jodne (bundling) ya domain sharding ki zarurat kam, balki sharding nuksaan karta hai.'],
      ['Load Balancer / CDN', 'Aksar bahar HTTP/2 ya 3 bolta hai aur andar servers se HTTP/1.1 ya 2. Ye reverse proxy ka kaam hai (agla lesson).'],
      ['HTTP/3 enable karna', 'Firewall / security group mein UDP 443 kholna, LB ka UDP support, aur Alt-Svc header ya DNS HTTPS record se browsers ko batana.'],
      ['Long-lived connections (chat, live)', 'Ek HTTP/2 connection pe kai streams: kam connections, server pe kam memory.'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTP/2 = HTTPS"', html: `Nahi. HTTPS ka matlab sirf "HTTP + TLS (taala)". HTTP/1.1 bhi HTTPS pe chal sakta hai. Haan, practically browsers HTTP/2 sirf HTTPS pe hi bolte hain, aur HTTP/3 mein TLS 1.3 andar hi bana hai. To version (1.1/2/3) aur taala (S) do alag sawaal hain.` },
    { type: 'diagram', title: 'HTTP versions: xyz.com mein kaun kahan', height: 510,
      groups: [
        { label: 'Clients', x: 16, y: 40, w: 172, h: 332 },
        { label: 'CDN (user ke paas)', x: 255, y: 150, w: 180, h: 100 },
        { label: 'Andar (private network)', x: 255, y: 282, w: 455, h: 218 },
      ],
      nodes: [
        { id: 'br', label: 'Chrome', sub: 'HTTP/3 (QUIC)', x: 100, y: 100, w: 150, kind: 'client', info: 'Ye kya hai: naya browser. Alt-Svc dekh ke HTTP/3 pe aa jaata hai: 1 RTT setup, loss pe sirf ek stream rukti hai, WiFi se 4G pe connection zinda.' },
        { id: 'app', label: 'Mobile app', sub: 'HTTP/2 ya 3', x: 100, y: 210, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com ka Android/iPhone app. Ek connection pe saari API calls multiplexed. UDP block ho to HTTP/2 pe.' },
        { id: 'old', label: 'Purana client', sub: 'HTTP/1.1', x: 100, y: 320, w: 150, kind: 'client', info: 'Ye kya hai: purana device, script ya tool (jaise curl) jo sirf HTTP/1.1 bolta hai. Isliye CDN pe HTTP/1.1 band nahi karte.' },
        { id: 'cdn', label: 'CDN edge', sub: 'TLS + h1 / h2 / h3', x: 345, y: 200, w: 170, kind: 'edge', info: 'Ye kya hai: user ke shehar mein xyz.com ka server. Teeno versions bolta hai, TLS yahin khatam hota hai (handshake paas mein, chhota RTT), aur andar ek garam HTTP/2 connection reuse karta hai.' },
        { id: 'lb', label: 'Load Balancer', sub: 'L7, HTTP/2', x: 565, y: 200, w: 150, kind: 'edge', info: 'Ye kya hai: data center ka darwaza. CDN se kuch hi lambe, reuse hone wale connections aate hain. Request ko path dekh ke sahi service ko bhejta hai.' },
        { id: 'api', label: 'API service', x: 565, y: 340, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ki main API. Doosri services ko gRPC (HTTP/2) se bulati hai, aur ek purani service ko HTTP/1.1 se.' },
        { id: 'pay', label: 'Payment service', sub: 'gRPC', x: 565, y: 450, w: 150, kind: 'server', info: 'Ye kya hai: andar ki service. gRPC HTTP/2 pe chalta hai: ek connection pe hazaaron calls multiplexed, binary aur tez.' },
        { id: 'leg', label: 'Purani service', sub: 'sirf HTTP/1.1', x: 345, y: 450, w: 150, kind: 'server', info: 'Ye kya hai: ek purana system jo sirf HTTP/1.1 samajhta hai. Usse keep-alive connection pool rakhte hain, taaki har call pe handshake na ho.' },
      ],
      edges: [
        { a: 'br', b: 'cdn', n: 1, label: 'QUIC' },
        { a: 'app', b: 'cdn', label: 'HTTP/2' },
        { a: 'old', b: 'cdn', label: 'HTTP/1.1' },
        { a: 'cdn', b: 'lb', n: 2 },
        { a: 'lb', b: 'api', n: 3 },
        { a: 'api', b: 'pay', n: 4, label: 'gRPC' },
        { a: 'api', b: 'leg', label: 'HTTP/1.1 pool' },
      ],
      paths: [
        { name: 'Naya browser (HTTP/3)', text: 'Chrome QUIC se CDN tak (1 RTT). CDN andar ek khule HTTP/2 connection pe LB aur API tak.', go: ['br>cdn>lb>api'] },
        { name: 'Mobile app (HTTP/2)', text: 'App ki saari API calls ek connection pe multiplexed. Payment ke liye API andar gRPC bulati hai.', go: ['app>cdn>lb>api>pay'] },
        { name: 'Purana client', text: 'HTTP/1.1 client bhi chalta hai: CDN uski bhasha bolta hai aur andar baaki sab same.', go: ['old>cdn>lb>api'] },
        { name: 'Purani service', text: 'API ek purani service ko HTTP/1.1 se bulati hai, keep-alive pool ke saath.', go: ['api>leg'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Ek page = darjanon files. Asli dushman RTT hai, to har version round trips aur intezaar kam karta hai.</li>
      <li>HTTP/1.0: har file naya connection. HTTP/1.1: keep-alive (connection reuse), lekin ek connection pe ek waqt mein ek request: HoL blocking. Browsers ~6 connections kholte hain.</li>
      <li>HTTP/2: binary frames, ek connection pe kai streams (multiplexing), HPACK header compression. Server push fail hua (Chrome 106 mein band).</li>
      <li>HTTP/2 ki kamzori: neeche TCP, to ek khoya packet saari streams rokta hai.</li>
      <li>HTTP/3 = HTTP over QUIC (UDP): har stream ka loss alag, connection + TLS 1.3 handshake 1 RTT (0-RTT resume), connection ID se WiFi → 4G migration.</li>
      <li>UDP kahin block ho to browser HTTP/2 pe aa jaata hai: HTTP/2 + 1.1 hamesha chalu rakho.</li>
      <li>Decide: bahar (CDN/LB) h2 + h3, andar gRPC (HTTP/2), purane clients ke liye 1.1.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['HTTP/1.1 keep-alive: har file pe naya handshake nahi', 'HTTP/2: ek connection pe sab files, kam connections, chhote headers', 'HTTP/3: loss pe sirf ek stream rukti hai, tez setup, network badalne pe connection zinda', 'Teeno ka matlab (GET, headers, status codes) same: app code badalna nahi padta'], costs: ['HTTP/1.1: HoL blocking, 6 connections ka jugaad', 'HTTP/2: TCP ka HoL bacha, kharab network pe kabhi 1.1 se bhi bura', 'HTTP/3: UDP kahin block, CPU zyada, LB/firewall ko UDP 443 ke liye taiyaar karna', '0-RTT mein replay ka khatra'] },
    { type: 'think', questions: [
      { q: 'Ek user train mein hai, network baar baar 1-2 second ke liye drop hota hai aur tower badalte rehte hain. HTTP/2 ya HTTP/3 se use behtar experience milega, aur kyun?', a: 'HTTP/3. Packet loss pe sirf affected stream rukti hai, aur network badalne (tower ya WiFi → 4G) pe connection ID ki wajah se connection migration hota hai: naya handshake nahi.' },
      { q: 'HTTP/2 ne "bahut saare connections" waali problem kaise solve ki?', a: 'Multiplexing se: ek hi connection pe saari requests alag streams mein ek saath, frames interleave hote hain. Har nayi file ke liye naya connection aur handshake nahi, aur HPACK se headers bhi chhote.' },
      { q: 'Purani team ne xyz.com ki images 4 domains (img1-img4.xyz.com) pe baant rakhi hain (domain sharding). HTTP/2 on karne ke baad kya karna chahiye?', a: 'Sharding hata do (ya sab domains ek hi connection share kar sakein, jaise same certificate aur IP). Sharding ki wajah se HTTP/2 ka ek connection 4 mein toot jaata hai: 4 handshakes, 4 slow starts, aur priorities ka faayda khatam.' },
      { q: 'Tumne CDN pe HTTP/3 on kiya, lekin kuch corporate users ki shikayat nahi aayi aur unke logs mein sirf HTTP/2 dikh raha hai. Kya ho raha hai?', a: 'Unke office firewall UDP 443 block karte hain. Browser QUIC try karta hai, jawab nahi aata, to chupchaap HTTP/2 (TCP) pe aa jaata hai. Isi wajah se HTTP/2 hamesha chalu rehna chahiye.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'HTTP/1.1 ka sabse bada sudhaar (HTTP/1.0 ke mukable)?', options: ['UDP use karna', 'Keep-alive: ek connection pe kai requests', 'Binary frames'], answer: 1, explain: 'HTTP/1.0 har file pe naya connection kholta tha. HTTP/1.1 mein connection by default khula rehta hai.' },
      { q: 'HTTP/2 ka sabse bada naya feature?', options: ['UDP use karna', 'Ek connection pe multiplexing', 'JSON format'], answer: 1, explain: 'Multiple streams ek TCP connection pe, frames interleave hote hain.' },
      { q: 'HPACK kya karta hai?', options: ['Images compress karta hai', 'Repeat hone wale headers ko table ke chhote numbers se bhejta hai', 'Encryption karta hai'], answer: 1, explain: 'Dono taraf ek table banti hai. Pehli baar poora header, baad mein sirf index.' },
      { q: 'HTTP/3 kis pe chalta hai?', options: ['TCP', 'QUIC (UDP ke upar)', 'WebSocket'], answer: 1, explain: 'QUIC, jo UDP ke upar reliability, congestion control aur TLS 1.3 encryption khud karta hai.' },
      { q: 'HTTP/2 mein packet loss pe kya hota hai?', options: ['Sirf ek file rukti hai', 'Us connection ki saari streams rukti hain', 'Kuch nahi'], answer: 1, explain: 'TCP order guarantee karta hai, isliye sab ruk jaata hai jab tak missing packet na aaye.' },
      { q: 'Phone WiFi se 4G pe gaya. Kis version mein connection bina naye handshake ke chalta rehta hai?', options: ['HTTP/1.1', 'HTTP/2', 'HTTP/3'], answer: 2, explain: 'QUIC connection ko connection ID se pehchanta hai, IP + port se nahi. Isko connection migration kehte hain.' },
    ]},
    { type: 'sources', note: 'Versions, years aur features inhi specs aur posts se check kiye.', items: [
      { title: 'RFC 9112: HTTP/1.1', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9112.html', used: 'Persistent connections by default, pipelining rules (responses in request order).' },
      { title: 'RFC 9113: HTTP/2', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9113.html', used: 'Streams, frames, multiplexing; replaces RFC 7540 (2015).' },
      { title: 'RFC 7541: HPACK, Header Compression for HTTP/2', publisher: 'IETF', official: true, year: 2015, url: 'https://www.rfc-editor.org/rfc/rfc7541.html', used: 'Static and dynamic tables, indexed header fields.' },
      { title: 'RFC 9000: QUIC, A UDP-Based Multiplexed and Secure Transport', publisher: 'IETF', official: true, year: 2021, url: 'https://www.rfc-editor.org/rfc/rfc9000.html', used: 'Per-stream delivery, connection IDs, connection migration with path validation.' },
      { title: 'RFC 9114: HTTP/3', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9114.html', used: 'HTTP over QUIC, Alt-Svc discovery, QPACK (RFC 9204) instead of HPACK.' },
      { title: 'Removing HTTP/2 Server Push from Chrome', publisher: 'Chrome for Developers', official: true, year: 2022, url: 'https://developer.chrome.com/blog/removing-push', used: 'Push disabled by default from Chrome 106; 103 Early Hints and preload as alternatives.' },
      { title: 'Adoption and Usage', publisher: 'Cloudflare Radar', official: true, url: 'https://radar.cloudflare.com/adoption-and-usage', used: 'Approximate share of requests by HTTP version (roughly half HTTP/2, about a fifth HTTP/3 in 2025-26).' },
    ]},
  ],
});
