Lesson.register({
  id: 'url-shortener',
  title: 'Design: URL shortener (Bitly)',
  minutes: 35,
  summary: `Pehla real design. xyz.co/aZ3k9Qx jaisa chhota link banana, aur us pe click hote hi milliseconds mein asli page pe bhejna. Ek hi core idea (unique short code) aur jo blocks ab tak seekhe: Load Balancer, Cache, Database, Queue. Bitly ne jo publicly bataya (2014 ka talk aur 2023 ka database migration post), usi pe based.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Kabhi WhatsApp pe lamba sa link dekha hai, jo do line bhar deta hai? URL shortener usko <code>xyz.co/aZ3k9Qx</code> jaisa chhota bana deta hai. Koi us chhote link pe click kare, to hamara server ek pal mein bolta hai "asli page wahan hai, wahan jao", aur browser wahan chala jaata hai. Kaam simple lagta hai, lekin jab roz crore log click karein, to teen sawaal mushkil ho jaate hain: har link ka code alag kaise ho, click ka jawab milliseconds mein kaise ho, aur har click ki ginti bina redirect ko slow kiye kaise ho.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Neeche padhne se pehle 10 minute kaagaz pe socho: user lamba URL deta hai, tumhe chhota code dena hai. Code kaise banaoge? Click hone pe kya hoga? Phir yahan compare karo.` },

    { type: 'p', html: `Bitly ke engineers ne apne system ke baare mein kuch baatein publicly share ki hain, aur ye lesson unhi pe based hai. Unke yahan short link banana <strong>encode</strong> kehlata hai aur click ko <strong>decode</strong>. Bitly ke engineering blog ki ek post (2014 ke aas paas) ke time ye system ~6 billion decodes per month handle karta tha, aur usi saal Bitly ke lead application developer ke talk mein ~600 million shortens per month bataye gaye. 2023 mein ek Bitly engineer ne Google Cloud ke blog pe likha ki aam din mein ~36 crore (360 million) clicks aur QR scans hote hain, aur 60-70 lakh naye links ya QR codes bante hain.` },
    { type: 'callout', tone: 'term', title: 'Encode aur decode', html: `<strong>Ye kya hai:</strong> <em>Encode</em> = lamba URL lo, uska chhota code banao aur save karo. <em>Decode</em> = chhota code lo, asli URL dhoondho aur user ko wahan bhejo. Bitly andar yahi naam use karta hai.<br><strong>Kyun chahiye:</strong> system ke do hi kaam hain, aur dono ki zaroorat bilkul alag hai: encode kabhi kabhi hota hai, decode bahut zyada.<br><strong>Iske bina:</strong> dono ko ek jaisa treat karoge, aur galat jagah mehnat lagaoge.` },
    { type: 'callout', tone: 'term', title: 'HTTP redirect', html: `<strong>Ye kya hai:</strong> server ka aisa jawab jo page nahi bhejta, sirf bolta hai "jo tum dhoondh rahe ho wo is doosre address pe hai". Jawab mein ek status code (jaise 301 ya 302) aur ek <code>Location</code> header hota hai jisme naya address likha hai. Browser khud us address pe chala jaata hai.<br><strong>Kyun chahiye:</strong> yahi shortener ka asli kaam hai. Hum asli page nahi dikhate, bas raasta batate hain.<br><strong>Iske bina:</strong> hamein poora page khud laake dikhana padta: slow, mehenga, aur doosri site ke cookies/login toot jaate.<br><strong>Example:</strong> <code>GET xyz.co/2TX</code> → <code>301</code>, <code>Location: https://example.com/very/long/page</code>.` },
    { type: 'p', html: `Scale ka andaaza: 6 billion per month = 6,000,000,000 / (30 × 86,400 seconds) ≈ <strong>2,300 redirects per second</strong> average (2014). 2023 ke 36 crore per day ka matlab ≈ <strong>4,200 per second</strong> average, aur peak pe kai guna zyada. Ab socho is scale ke liye kya chahiye.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• User lamba URL de, use short link mile: <code>xyz.co/aZ3k9Qx</code><br>• Short link khole to asli URL pe redirect<br>• (Optional) custom alias (apna chuna hua naam, jaise <code>xyz.co/diwali-sale</code>), expiry, click count<br><br><strong>Out of scope:</strong> user accounts, dashboards ka design` },
      right: { title: 'Non-functional', html: `• Redirect bahut fast: &lt; 50 ms<br>• Bahut high availability (link toota = kisi aur ki website tooti)<br>• Short codes unique, kabhi takraayein nahi<br>• Codes guess karne mushkil hon (nice to have)<br>• Click ki ginti thodi late ho to chalega (eventual)` },
    },
    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Numbers sirf isliye nikaalte hain taaki design decisions mil sakein. Do presets hain: ek "maan lo" wala bada interview number (100M links/day), aur ek Bitly ke 2023 wale public numbers (60-70 lakh links/day, ~36 crore clicks/day, yaani read:write ≈ 55). Values badal ke dekho:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips us-pre" style="padding:0">
          <button type="button" class="chip on" data-n="100" data-r="100">Interview (maan lo)</button>
          <button type="button" class="chip" data-n="6.5" data-r="55">Bitly 2023 (public numbers)</button></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Naye links per day (millions)</label><input class="us-nu" type="number" value="100" min="0.1" step="0.1"></div>
          <div><label>Har link kitni baar khulta hai (read:write)</label><input class="us-rr" type="number" value="100" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Write QPS (avg)</span><strong class="us-wq"></strong></div>
          <div class="stat"><span>Read QPS (avg)</span><strong class="us-rq"></strong></div>
          <div class="stat"><span>Read QPS (peak ×3)</span><strong class="us-pq"></strong></div>
          <div class="stat"><span>Storage, 5 years</span><strong class="us-st"></strong></div>
        </div>
        <div class="calc-note us-cn"></div>`;
      const $ = c => el.querySelector(c);
      const a = $('.us-nu'), b = $('.us-rr');
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString();
      const upd = () => {
        const perDay = Math.max(0, Number(a.value) || 0) * 1e6, ratio = Math.max(1, Number(b.value) || 1);
        const w = perDay / 1e5, r = w * ratio;
        const tb = perDay * 365 * 5 * 500 / 1e12;
        $('.us-wq').textContent = f(w) + '/s';
        $('.us-rq').textContent = f(r) + '/s';
        $('.us-pq').textContent = f(r * 3) + '/s';
        $('.us-st').textContent = (tb < 10 ? tb.toFixed(1) : tb.toFixed(0)) + ' TB';
        $('.us-cn').textContent = `Conclusion: reads writes se ${ratio}x zyada hain, to ye read-heavy system hai → cache bahut zaroori. Writes sirf ${f(w)}/s hain, to code banana mushkil nahi; mushkil hai har click ka jawab tez dena. ~500 bytes per link maana (URL + metadata). Ek din ≈ 10^5 seconds.`;
      };
      a.addEventListener('input', upd); b.addEventListener('input', upd);
      $('.us-pre').querySelectorAll('.chip').forEach(c => c.onclick = () => { a.value = c.dataset.n; b.value = c.dataset.r; $('.us-pre').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); upd(); });
      upd();
    }},
    { type: 'p', html: `Interview preset: ~1k writes/s, ~100k reads/s, ~91 TB in 5 years. Bitly preset: sirf ~65 writes/s (din ≈ 10<sup>5</sup> s maan ke), ~3.6k reads/s, ~6 TB. Asli Bitly data alag hai: 2023 mein unhone bataya ki ~40 billion active links ka dataset Bigtable mein ~26 TB ka tha (replication ke bina). Dono cases mein conclusion same: <strong>read-heavy, cache sabse important, aur data ek machine se bada</strong>.` },

    { type: 'h2', text: 'Step 3: API' },
    { type: 'code', text: `
POST /api/links
  body:  { "url": "https://example.com/very/long/page?id=123" }
  →  201 Created  { "short": "https://xyz.co/2TX" }

GET /2TX
  →  301 Moved Permanently   (ya 302 Found, neeche deep dive)
     Location: https://example.com/very/long/page?id=123` },
    { type: 'list', items: [
      `<strong>POST</strong> naya link banata hai (encode). <code>201 Created</code> matlab "nayi cheez ban gayi".`,
      `<strong>GET /{code}</strong> redirect deta hai (decode). Ye URL seedha browser ke address bar se khulta hai, isliye ismein koi JSON nahi, sirf redirect.`,
      `Bitly ke 2014 talk ke summary ke mutabik, shorten request ko jaan-boojh ke <strong>synchronous</strong> rakha gaya: user ko turant link chahiye, aur ek kaam na karne wala link dene se behtar hai error de dena. Clicks ki ginti, iske ulat, poori tarah async hai.`,
    ]},
    { type: 'h2', text: 'Step 4: core idea, short code kaise banayein?' },
    { type: 'p', html: `Ye is design ka sabse important sawaal hai. Teen raaste hain. Teeno ko ek-ek karke dekhte hain, kyunki interview mein teeno ka zikr hona chahiye.` },
    { type: 'h3', text: 'Raasta 1: URL ka hash' },
    { type: 'callout', tone: 'term', title: 'Hash function', html: `<strong>Ye kya hai:</strong> ek formula jo kisi bhi text ko ek fixed-size "fingerprint" mein badal deta hai. Same text = hamesha same fingerprint. MD5 ek purana hash hai jo 128 bit (32 hex characters) deta hai.<br><strong>Kyun chahiye (yahan):</strong> lambe URL ka hash nikaalo, pehle 7 characters le lo: bina kisi counter ke code ban gaya. Bonus: same URL = same code.<br><strong>Iske bina:</strong> code banane ke liye kahin se ek number lana padega (raasta 3).` },
    { type: 'callout', tone: 'term', title: 'Collision', html: `<strong>Ye kya hai:</strong> do alag URLs ko ek hi short code mil jaana. Poora hash shayad hi kabhi takraata hai, lekin hum sirf 7 characters rakh rahe hain, to jagah chhoti ho gayi.<br><strong>Kyun dhyaan dena hai:</strong> agar collision ko pakda nahi, to user A ka link user B ke page pe le jaayega. Ye sabse bura bug hai.<br><strong>Iske bina (check ke bina):</strong> galat redirect. Isliye hash wale raaste mein har naye code ke liye DB check karna padta hai: "ye code pehle se hai?" Hai to salt (thoda extra text) jod ke dobara hash.` },
    { type: 'h3', text: 'Raasta 2: random code' },
    { type: 'p', html: `7 random characters chuno. Hash jaisa hi: koi counter nahi, aur code guess karna mushkil. Lekin collision ka khatra wahi hai, to har baar DB se poochhna padta hai "ye code free hai?" Neeche ka calculator dikhata hai ki ye khatra kitna jaldi badhta hai. Isme "birthday problem" ka formula hai: jitne zyada codes ho chuke, utna hi naye code ka kisi purane se takraana aasaan.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Code ki length (characters)</label><input class="us-k" type="range" min="5" max="9" step="1" value="7"><div class="us-kv" style="font:600 15px var(--f-mono);color:var(--ink)"></div></div>
          <div><label>Kitne links ban chuke</label><input class="us-n" type="range" min="0" max="5" step="1" value="1"><div class="us-nv" style="font:600 15px var(--f-mono);color:var(--ink)"></div></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Kul possible codes (62^k)</span><strong class="us-N"></strong></div>
          <div class="stat"><span>Naya random code takraaye</span><strong class="us-p1"></strong></div>
          <div class="stat"><span>Kam se kam ek collision ho chuka</span><strong class="us-pa"></strong></div>
          <div class="stat"><span>Takraate jode (andaaza)</span><strong class="us-ex"></strong></div>
        </div>
        <div class="calc-note us-cc"></div>`;
      const $ = c => el.querySelector(c);
      const NS = [1e4, 1e6, 1e8, 1e9, 1e10, 4e10];
      const NL = ['10 hazaar', '10 lakh', '10 crore', '100 crore', '1,000 crore', '4,000 crore (Bitly ~40B, 2023)'];
      const fmt = x => x >= 1e12 ? (x / 1e12).toFixed(2) + ' trillion' : x >= 1e9 ? (x / 1e9).toFixed(1) + ' billion' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? Math.round(x).toLocaleString('en-IN') : x < 0.01 ? x.toExponential(1) : x.toFixed(2);
      const pc = p => p >= 0.9995 ? '~100%' : p < 0.0001 ? (p * 100).toExponential(1) + '%' : (p * 100).toFixed(p < 0.01 ? 3 : 1) + '%';
      const upd = () => {
        const k = +$('.us-k').value, n = NS[+$('.us-n').value], N = Math.pow(62, k);
        const p1 = n / N, pa = 1 - Math.exp(-n * (n - 1) / (2 * N)), ex = n * n / (2 * N);
        $('.us-kv').textContent = k + ' chars'; $('.us-nv').textContent = NL[+$('.us-n').value];
        $('.us-N').textContent = fmt(N); $('.us-p1').textContent = pc(p1); $('.us-pa').textContent = pc(pa); $('.us-ex').textContent = fmt(ex);
        $('.us-cc').textContent = pa > 0.5
          ? `Collision lagbhag pakka hai. Isliye hash ya random raaste mein har naye code pe "pehle se hai?" check zaroori hai. Counter + base62 mein ye check hi nahi chahiye.`
          : `Abhi collision ka chance kam hai, lekin links badhte hi ye tezi se badhega (n ke square se). Check phir bhi lagana padega.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Calculator se seekh: 7 characters pe sirf <strong>10 lakh</strong> links hote hi ~13% chance hai ki kahin na kahin ek collision ho chuka. 10 crore links pe ~1,400 takraate jode. Bitly jaise ~40 billion links pe har naya random code ~1.1% baar kisi purane se takraayega. Matlab collision "kabhi kabhi" wali cheez nahi, <strong>pakki</strong> hai, aur check + retry har baar lagana padega.` },
    { type: 'h3', text: 'Raasta 3: counter + base62' },
    { type: 'callout', tone: 'term', title: 'Base62', html: `<strong>Ye kya hai:</strong> number likhne ka ek tareeka jisme 62 symbols hain: <code>0-9</code> (10), <code>a-z</code> (26), <code>A-Z</code> (26). Jaise decimal mein 10 symbols hote hain aur 10 ke baad ek naya digit lagta hai, waise hi yahan 62 ke baad.<br><strong>Kyun chahiye:</strong> bada number chhote text mein fit ho jaata hai, aur saare symbols URL mein safe hain (koi <code>/</code>, <code>?</code> ya <code>+</code> nahi). 7 base62 characters mein 62<sup>7</sup> ≈ 3.5 trillion alag codes aate hain.<br><strong>Iske bina:</strong> decimal mein wahi number 13 digits ka hota (3,521,614,606,207), link lamba ho jaata.<br><strong>Example:</strong> 11157 ÷ 62 = 179, baaki 59 → <code>X</code>. 179 ÷ 62 = 2, baaki 55 → <code>T</code>. 2 ÷ 62 = 0, baaki 2 → <code>2</code>. Neeche se upar padho: <strong>11157 = "2TX"</strong>.` },
    { type: 'p', html: `Idea: har naye link ko ek unique <strong>number</strong> do (1, 2, 3 ... 11157 ...), aur us number ko base62 mein likho. Unique number = unique code, to collision ka sawaal hi nahi, aur DB mein "pehle se hai?" check bhi nahi. Khud chala ke dekho:` },
    { type: 'custom', render(el) {
      const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      el.innerHTML = `<label>ID number type karo</label>
        <input class="us-b62" type="text" inputmode="numeric" value="11157">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <button type="button" class="btn small ghost" data-v="125">125</button>
          <button type="button" class="btn small ghost" data-v="11157">11157</button>
          <button type="button" class="btn small ghost" data-v="1000000">10 lakh</button>
          <button type="button" class="btn small ghost" data-v="3521614606207">62^7 − 1</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Short code</span><strong class="us-bo"></strong></div>
          <div class="stat"><span>Short link</span><strong class="us-bl" style="font-size:18px"></strong></div>
        </div>
        <pre class="ascii us-bs" style="margin-top:10px"></pre>
        <div class="calc-note us-bn"></div>`;
      const $ = c => el.querySelector(c), inp = $('.us-b62');
      const upd = () => {
        const raw = inp.value.replace(/[^0-9]/g, '');
        if (!raw) { $('.us-bo').textContent = '-'; $('.us-bl').textContent = '-'; $('.us-bs').textContent = ''; $('.us-bn').textContent = 'Ek number daalo (sirf digits).'; return; }
        let n = BigInt(raw), s = '';
        const rows = [];
        if (n === 0n) s = '0';
        while (n > 0n) { const q = n / 62n, r = n % 62n; rows.push(`${n} ÷ 62 = ${q}, baaki ${r} → '${A[Number(r)]}'`); s = A[Number(r)] + s; n = q; }
        $('.us-bo').textContent = s;
        $('.us-bl').textContent = 'xyz.co/' + s;
        $('.us-bs').textContent = rows.slice(0, 9).join('\n') + (rows.length > 9 ? '\n...' : '') + `\nNeeche se upar padho → "${s}"`;
        $('.us-bn').textContent = `${s.length} characters. 7 characters tak 62^7 ≈ 3.5 trillion codes bante hain: 100M links/day ke hisaab se ~96 saal.`;
      };
      inp.addEventListener('input', upd);
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { inp.value = b.dataset.v; upd(); });
      upd();
    }},
    { type: 'table', head: ['', 'Hash + 7 chars', 'Random 7 chars', 'Counter + base62'], rows: [
      ['Collision', 'Ho sakta hai, check + retry', 'Ho sakta hai, check + retry', '<strong>Kabhi nahi</strong> (har number alag)'],
      ['Har create pe DB check', 'Haan', 'Haan', 'Nahi'],
      ['Guess karna', 'Mushkil', 'Mushkil', 'Aasaan (agla number = agla code), scramble chahiye'],
      ['Same URL = same code', 'Haan, apne aap', 'Nahi', 'Nahi (chahiye to alag index)'],
      ['Coordination', 'Nahi chahiye', 'Nahi chahiye', 'Unique numbers dene wala ID generator chahiye'],
      ['Code length', 'Fixed 7', 'Fixed 7', 'Shuru mein chhota, dheere badhta'],
    ]},
    { type: 'callout', tone: 'warn', html: `Sequential IDs ka ek nuksaan: <code>xyz.co/2TX</code> ke baad <code>xyz.co/2TY</code> guess karna aasaan hai, to koi saare links scan kar sakta hai (kisi ka private document link bhi). Fix: number ko encode karne se pehle shuffle/scramble kar do (ek ulti ja sakne wali gadbad, taaki 11157 aur 11158 ke codes bilkul alag dikhein), ya bahut bade random range se IDs lo.` },
    { type: 'h3', text: 'Unique number aayega kahan se? ID generator' },
    { type: 'callout', tone: 'term', title: 'ID generator aur ID range', html: `<strong>Ye kya hai:</strong> ek chhoti service jo har baar ek naya, kabhi na dohraaya gaya number deti hai. Smart tareeka: har app server ek baar mein poori <em>range</em> le leta hai, jaise 5001-6000, aur apni memory se ek-ek number use karta hai.<br><strong>Kyun chahiye:</strong> counter + base62 ko unique number chahiye. Range se ID generator se har link pe nahi, 1,000 links mein ek baar baat hoti hai.<br><strong>Iske bina:</strong> ek central counter har link pe poochha jaata: bottleneck (sab uska wait karte) aur SPOF (wo gira to koi link nahi banta).<br><strong>Keemat:</strong> server crash ho to uski range ke bache numbers waste. 3.5 trillion mein ye chalta hai.` },
    { type: 'p', html: `Generator thodi der down bhi ho, servers apni range se kaam chalate rahenge. Generator khud ek strongly consistent store (jaise etcd/ZooKeeper, ya ek DB row jise transaction se badhaate hain) pe banta hai, taaki do servers ko kabhi same range na mile. Ye range wala tareeka aam industry approach hai; Bitly ne apna exact code-generation tareeka publicly detail mein nahi bataya.` },
    { type: 'h2', text: 'Step 5: high-level design' },
    { type: 'p', html: `Diagram se pehle do naye boxes samajh lo, jo is design mein aayenge.` },
    { type: 'callout', tone: 'term', title: 'Key-value database', html: `<strong>Ye kya hai:</strong> ek database jo ek badi dictionary ki tarah hai: ek key do (short code), ek value lo (lamba URL). Na joins, na complex queries.<br><strong>Kyun chahiye:</strong> hamara access pattern bas yahi hai: "code do, URL lo". Ise bahut saari machines pe baantna (sharding) aasaan hai, aur lookup milliseconds mein.<br><strong>Iske bina:</strong> ek single SQL server pe billions rows, aur use haath se shard karna padta (Bitly ne saalon yahi kiya, deep dive mein dekhenge).` },
    { type: 'callout', tone: 'term', title: 'Redis cache (cache-aside)', html: `<strong>Ye kya hai:</strong> Redis = RAM mein rakha tez key-value store (~1 ms). <em>Cache-aside</em> = app pehle cache mein dekhta hai; mila (hit) to wahin se jawab; nahi mila (miss) to DB se laata hai aur agli baar ke liye cache mein rakh deta hai. Har entry ka ek TTL (expiry time) hota hai.<br><strong>Kyun chahiye:</strong> reads writes se 55-100 guna. Kuch links (viral) crores baar khulte hain; wo sab RAM se.<br><strong>Iske bina:</strong> har click DB tak, DB pe bhaari load aur redirect slow. Detail <a href="#/caching">caching lesson</a> mein.` },
    { type: 'p', html: `Do flows hain: link <strong>banana</strong> (rare) aur link <strong>kholna</strong> (bahut zyada). Saare scenarios chalao, aakhri wala failure hai:` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'c', label: 'Client', sub: 'browser / app', x: 80, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: user ka browser ya app. Link banane wala ya link pe click karne wala user.' },
        { id: 'app', label: 'App servers', sub: 'behind LB', x: 270, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: hamara code chalane wale stateless servers ka fleet, Load Balancer ke peeche. Encode (link banana) aur decode (redirect) dono yahin. Diagram simple rakhne ke liye LB isi box mein shaamil maana hai. Bitly ke 2014 talk ke mutabik ~400 servers mein se sirf ~30 bahar ka saara traffic (shorten, redirect, API, web) sambhalte the.' },
        { id: 'id', label: 'ID generator', sub: 'unique numbers', x: 490, y: 45, w: 160, kind: 'server', info: 'Ye kya hai: unique, badhte hue numbers dene wali service. Har app server ek baar mein 1,000 IDs ki range le leta hai (jaise 5001-6000), to har link ke liye isse poochhna nahi padta.' },
        { id: 'cache', label: 'Redis cache', sub: 'code → URL', x: 490, y: 170, w: 160, kind: 'cache', info: 'Ye kya hai: RAM mein tez key-value store. Hot links ka code → URL mapping yahan. Ek viral link crores baar khul sakta hai, wo sab yahin se, ~1 ms mein.' },
        { id: 'db', label: 'URL database', sub: 'key-value', x: 490, y: 280, w: 160, kind: 'data', info: 'Ye kya hai: source of truth, code → long URL ka permanent record. Koi joins nahi, sirf key se lookup. Bitly ne saalon haath se shard kiya MySQL chalaya aur 2023 mein Google Cloud Bigtable (NoSQL) pe shift kiya.' },
        { id: 'k', label: 'NSQ', sub: 'click events', x: 655, y: 60, w: 100, kind: 'queue', hidden: true, info: 'Ye kya hai: message queue, yaani kaam ki line. Bitly ne NSQ khud banaya aur open source kiya. Redirect hote hi click (decode) ka event yahan daal diya jaata hai, aur alag alag services use apni speed se process karti hain.' },
      ],
      edges: [{ a: 'c', b: 'app' }, { a: 'app', b: 'id' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'app', b: 'k', id: 'ak', hidden: true }],
      scenarios: [
        { name: 'Link banao', steps: [
          { title: 'User lamba URL bhejta hai', go: 'c>app', text: 'POST request.', msg: 'POST /api/links  { "url": "https://example.com/very/long/page" }' },
          { title: 'Unique number lo', text: 'App server ke paas pehle se ek ID range hai, usme se agla number liya: 11157. (Range khatam hone pe hi ID generator se nayi range maangta hai.)', go: ['app>id', 'res:id>app'], msg: 'next id = 11157' },
          { title: 'Base62 mein badlo', text: '11157 → "2TX". Ye kaam server ke andar hi, kuch microseconds mein. (Production mein pehle scramble, phir base62.)', focus: ['app'], msg: 'base62(11157) = "2TX"' },
          { title: 'Database mein save', text: 'code → URL mapping permanently save. Ye synchronous hai: save pakka hone ke baad hi user ko link milega.', go: ['app>db', 'res:db>app'], msg: 'PUT 2TX → https://example.com/very/long/page' },
          { title: 'Short link wapas', go: 'res:app>c', text: 'User ko short link mil gaya.', msg: '201 Created  { "short": "https://xyz.co/2TX" }' },
        ]},
        { name: 'Link kholo (cache hit)', intro: 'Zyaadatar traffic yahi flow hai. Yahi fast hona chahiye.', steps: [
          { title: 'Click', go: 'c>app', text: 'Kisi ne xyz.co/2TX pe click kiya.', msg: 'GET /2TX' },
          { title: 'Cache mein dekho: HIT', text: 'Popular link hai, Redis mein hai. ~1 ms.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit' } } },
          { title: 'Redirect', text: 'Server koi page nahi bhejta, bas bolta hai "wahan jao". Browser khud asli URL khol leta hai.', go: 'res:app>c', msg: '301 Moved Permanently\nLocation: https://example.com/very/long/page' },
        ]},
        { name: 'Link kholo (cache miss)', steps: [
          { title: 'Click', go: 'c>app', text: 'Purana link, kisi ne kaafi time baad khola.', msg: 'GET /2TX' },
          { title: 'Cache: MISS', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss' } }, text: 'Redis mein nahi hai.' },
          { title: 'Database se lao, cache mein daalo', go: ['app>db', 'res:db>app', 'app>cache'], text: 'DB se mila, agli baar ke liye cache mein rakh diya (cache-aside).', after: { cache: { state: '' } } },
          { title: 'Redirect', go: 'res:app>c', text: 'Is baar ~10 ms zyada laga, lekin agle hazaar clicks fast.', msg: '301 → https://example.com/very/long/page' },
        ]},
        { name: 'Click analytics', intro: 'Business ko chahiye: har link kitni baar khula, kahan se. Bitly ka asli business yahi analytics hai.', steps: [
          { title: 'Click aaya', go: 'c>app', text: 'GET /2TX' },
          { title: 'Redirect turant, event alag se', text: 'Server user ko turant redirect bhejta hai, aur saath mein ek "click hua" (decode) event NSQ queue mein daal deta hai. User ko analytics ka wait nahi karna padta.', show: ['k', 'ak'], parallel: true, go: ['res:app>c', 'evt:app>k'], msg: 'event: { code: "2TX", time, country: "IN" }' },
          { title: 'Kyun alag?', text: 'Agar har click pe DB mein count++ karte, to viral link ek hi row pe crores writes karta (hot key). Events ko queue ke through alag process karna kahin sasta aur safe hai. Is pattern ko <strong>async processing</strong> kehte hain. Agle diagram mein dekho queue ke baad kya hota hai.', focus: ['k'] },
        ]},
        { name: 'Failure: cache down', intro: 'Redis ka node gir gaya. Kya redirects bhi gir jaayenge?', steps: [
          { title: 'Redis down', set: { cache: { state: 'down', sub: 'DOWN' } }, focus: ['cache'], text: 'Cache ek optional speed-up hai, source of truth DB hai. Isliye app ko cache error pe crash nahi karna, seedha DB pe jaana hai (fail-open).' },
          { title: 'Saare clicks DB pe', flood: { paths: ['c>app>db'], n: 12 }, after: { db: { state: 'hot', sub: '100% reads' } }, text: 'Pehle 90-99% reads cache se aate the. Ab saare DB pe: DB ka load 10-100 guna. Latency badhi, timeouts shuru ho sakte hain.' },
          { title: 'Bachav', set: { db: { state: 'warn', sub: 'protected' } }, text: 'Teen bachav: (1) Redis replicas + automatic failover, taaki cache jaldi wapas aaye. (2) App servers ki apni memory mein bahut hot links ka chhota cache. (3) DB ko itni capacity ki cache ke bina bhi kuch der tik jaaye, aur cache wapas aane pe dheere dheere bharo (warm up), taaki ek saath saare misses DB pe na giren.' },
        ]},
      ],
    },
    { type: 'h3', text: 'Cache kitna kaam karta hai? Hit ratio' },
    { type: 'callout', tone: 'term', title: 'Cache hit ratio', html: `<strong>Ye kya hai:</strong> 100 reads mein se kitne cache mein mil gaye. 95% hit ratio = 100 mein 95 RAM se, sirf 5 DB tak.<br><strong>Kyun chahiye:</strong> yahi ek number batata hai ki DB pe kitna load aayega aur redirect kitna fast hoga.<br><strong>Iske bina (dhyaan na do to):</strong> lagta hai "cache laga diya, ho gaya", jabki 50% hit ratio pe DB ab bhi aadha load uthata hai.` },
    { type: 'p', html: `Neeche maan liya hai: cache ~1 ms, DB ~10 ms, aur miss pe pehle cache check hota hai phir DB (1 + 10 ms). Slider badal ke dekho ki 90% se 99% jaane pe DB ka load kitna girta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Redirects per second (peak)</label><input class="us-q" type="number" value="12500" min="100" step="100"></div>
          <div><label>Cache hit ratio: <strong class="us-hv"></strong></label><input class="us-h" type="range" min="0" max="99" step="1" value="90"></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label>Cache mein kitne hot links (millions)</label><input class="us-hot" type="number" value="10" min="0" step="1"></div>
          <div></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Cache se (reads/s)</span><strong class="us-cr"></strong></div>
          <div class="stat"><span>DB tak (reads/s)</span><strong class="us-dr"></strong></div>
          <div class="stat"><span>Average redirect lookup</span><strong class="us-lat"></strong></div>
          <div class="stat"><span>Cache RAM (~500 B/link)</span><strong class="us-ram"></strong></div>
        </div>
        <div class="calc-note us-hn"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const q = Math.max(0, +$('.us-q').value || 0), h = +$('.us-h').value / 100, hot = Math.max(0, +$('.us-hot').value || 0);
        const cr = q * h, dr = q * (1 - h), lat = h * 1 + (1 - h) * (1 + 10);
        $('.us-hv').textContent = Math.round(h * 100) + '%';
        $('.us-cr').textContent = Math.round(cr).toLocaleString('en-IN') + '/s';
        $('.us-dr').textContent = Math.round(dr).toLocaleString('en-IN') + '/s';
        $('.us-lat').textContent = lat.toFixed(1) + ' ms';
        $('.us-ram').textContent = (hot * 1e6 * 500 / 1e9).toFixed(1) + ' GB';
        $('.us-hn').textContent = `Bina cache: DB pe ${Math.round(q).toLocaleString('en-IN')}/s aur ~10 ms. Is hit ratio pe DB ka load ${h > 0 ? Math.round(1 / (1 - h)) + ' guna' : 'bilkul nahi'} kam. Hot links thode hote hain, to unka cache sasta hai: ${hot}M links ≈ ${(hot * 0.5).toFixed(1)} GB RAM.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `12,500/s (Bitly 2023 ke average ka ~3 guna) pe: 90% hit ratio → DB tak 1,250/s, average ~2 ms. 99% → DB tak sirf 125/s, ~1.1 ms. Yaani hit ratio ka aakhri 9% DB ka load aur 10 guna gira deta hai. Aur 1 crore hot links ka cache sirf ~5 GB RAM. (Ye numbers "maan lo" wale hain; Bitly ne apna hit ratio publicly nahi bataya.)` },

    { type: 'h2', text: 'Click ke baad: Bitly ka stream pipeline' },
    { type: 'p', html: `Bitly paise shortening se nahi, <strong>analytics</strong> se kamaata hai: kis link pe kab, kahan se kitne click aaye. Isliye click ke baad ka hissa unke liye sabse important hai. Pehle teen naye words.` },
    { type: 'callout', tone: 'term', title: 'Message queue (NSQ)', html: `<strong>Ye kya hai:</strong> kaam ki ek line. Ek service message daalti hai ("click hua"), doosri services use nikaal ke apni speed se process karti hain. NSQ Bitly ka banaya open-source message queue hai; doosri companies isi kaam ke liye aksar Kafka use karti hain (<a href="#/kafka">Kafka lesson</a>).<br><strong>Kyun chahiye:</strong> redirect ko kisi analytics ka wait nahi karna padta. Click ka message daala aur user ko turant redirect.<br><strong>Iske bina:</strong> har click pe redirect server khud saare analytics systems ko call karta: slow, aur ek analytics system gira to redirect bhi atak jaata.` },
    { type: 'callout', tone: 'term', title: 'Consumer, fan-out aur backlog', html: `<strong>Ye kya hai:</strong> <em>Consumer</em> = wo service jo queue se messages nikaal ke process karti hai. <em>Fan-out</em> = ek hi message ki copy kai consumers ko jaana (ek click → archive, live counts, history, spam check). <em>Backlog</em> = queue mein jama messages jo abhi process nahi hue.<br><strong>Kyun chahiye:</strong> naya consumer jodna aasaan: redirect wale code ko chhuna hi nahi padta. Aur consumer slow ho to messages bas backlog mein wait karte hain.<br><strong>Iske bina:</strong> har naye analytics feature ke liye redirect code badalna padta.` },
    { type: 'callout', tone: 'term', title: 'Event vs command', html: `<strong>Ye kya hai:</strong> <em>Command</em> = "X karo" (bhejne wale ko pata hona chahiye kaun karega). <em>Event</em> = "X ho gaya" (bhejne wale ko parwah nahi kaun sunega).<br><strong>Kyun chahiye:</strong> Bitly ke lead developer ne 2014 ke talk mein bataya ki unke liye events zyada kaam ke nikle: redirect service sirf "click hua" bolti hai, aur jitne chaaho consumers sun sakte hain.<br><strong>Iske bina:</strong> redirect service ko har consumer ka naam aur kaam pata hona chahiye, aur sab ek doosre se bandh jaate.` },
    { type: 'p', html: `Ab pipeline. Ye hissa Bitly ke publicly shared material pe based hai. 2014 ke talk ke summary ke mutabik, redirect hote hi click ka message kai services ko jaata hai: ek archive service (jo HDFS aur S3 mein save karti hai; dono badi files rakhne ke store hain), real-time analytics, long-term history analytics, aur ek annotation service. Bitly ke blog ke mutabik kuch steps spam aur abuse detection bhi karte hain, aur processed data aksar wapas queue mein agle step ke liye daal diya jaata hai.` },
    { type: 'flow', title: 'Ek decode (click) ke baad', height: 340,
      nodes: [
        { id: 'u', label: 'Click', sub: 'user', x: 70, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: wo user jisne bit.ly link pe click kiya. Use bas jaldi redirect chahiye.' },
        { id: 'r', label: 'Redirect', sub: 'decode', x: 220, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: decode karne wala server. Link ko asli URL mein badal ke HTTP redirect bhejta hai, aur ek event queue mein daal deta hai. User ko kisi analytics ka wait nahi karna padta.' },
        { id: 'q', label: 'NSQ', sub: 'message queue', x: 395, y: 170, w: 120, kind: 'queue', info: 'Ye kya hai: Bitly ka banaya open-source message queue. Har consumer ko apni copy milti hai, aur jab tak consumer ready na ho, message queue mein wait karta hai.' },
        { id: 'a', label: 'Archive', sub: 'HDFS + S3', x: 595, y: 45, w: 170, kind: 'data', info: 'Ye kya hai: har click ka raw record permanently save karne wali service (HDFS aur S3, dono badi files ke store). Baad mein kisi bhi tarah ka analysis dobara chalaya ja sakta hai.' },
        { id: 'rt', label: 'Real-time analytics', sub: 'live counts', x: 595, y: 128, w: 170, kind: 'server', info: 'Ye kya hai: abhi abhi kitne clicks aaye, ye ginne wali service. Dashboards ke liye.' },
        { id: 'hi', label: 'History analytics', sub: 'long-term', x: 595, y: 211, w: 170, kind: 'server', info: 'Ye kya hai: lambe time ka hisaab rakhne wali service: kis din, kis desh se, kis referrer (kis site se aaya) se.' },
        { id: 'sp', label: 'Spam / abuse', sub: 'detection', x: 595, y: 294, w: 170, kind: 'threat', info: 'Ye kya hai: kharab links (spam, phishing, malware) pakadne wale steps. Bitly ke blog ke mutabik processing chain ke kuch steps yahi karte hain.' },
      ],
      edges: [{ a: 'u', b: 'r' }, { a: 'r', b: 'q' }, { a: 'q', b: 'a' }, { a: 'q', b: 'rt' }, { a: 'q', b: 'hi' }, { a: 'q', b: 'sp' }],
      scenarios: [
        { name: 'Normal click', steps: [
          { title: 'Click aur turant redirect', text: 'User ko redirect pehle milta hai. Event alag se queue mein jaata hai.', parallel: true, go: ['u>r', 'evt:r>q'] },
          { title: 'Redirect user tak', go: 'res:r>u', text: 'User apne asli page pe pahunch gaya. Ab tak koi analytics nahi chali.' },
          { title: 'Queue har consumer ko copy deta hai', text: 'Ek hi event chaar alag kaamon ke liye. Har service apni speed se kaam karti hai. Ise <strong>fan-out</strong> kehte hain.', parallel: true, go: ['evt:q>a', 'evt:q>rt', 'evt:q>hi', 'evt:q>sp'] },
          { title: 'Chain aage badhti hai', text: 'Bitly ke blog ke mutabik processed data aksar wapas queue mein daal diya jaata hai, agle step ke liye. Isliye ye seedhi line nahi, ek graph jaisa pipeline hai.', go: 'evt:rt>q' },
        ]},
        { name: 'Ek consumer down', intro: 'Bitly ke blog mein ye resilience khas taur pe bataya gaya hai.', steps: [
          { title: 'History analytics crash', set: { hi: { state: 'down', sub: 'DOWN' } }, focus: ['hi'], text: 'Ek processing step gir gaya.' },
          { title: 'Clicks aate rehte hain', text: 'Redirect bilkul normal. Baaki consumers bhi normal. History wale messages queue mein jama ho rahe hain (backlog).', flood: { paths: ['evt:u>r>q'], n: 6 }, after: { q: { state: 'warn', sub: 'history backlog' } } },
          { title: 'Theek hone pe backlog khatam', text: 'Service wapas aayi aur jama messages apni speed se process kar liye. Ek hisse ki problem ne poore system ko nahi giraya. Bitly ke 2014 talk ka ek aur sabak isi se juda tha: <strong>backpressure</strong>, yaani busy service doosri services ko ishaara de ki "dheere bhejo".', set: { hi: { state: 'ok', sub: 'catching up' } }, flood: { paths: ['evt:q>hi'], n: 6 }, after: { q: { state: '', sub: 'message queue' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Step 6: deep dives' },
    { type: 'h3', text: '301 ya 302 redirect?' },
    { type: 'callout', tone: 'term', title: '301 aur 302', html: `<strong>Ye kya hai:</strong> dono redirect ke status codes hain. <strong>301 Moved Permanently</strong> = "ye hamesha ke liye wahan chala gaya". <strong>302 Found</strong> = "abhi ke liye wahan dekho".<br><strong>Kyun farak padta hai:</strong> HTTP rules (RFC 9110, 2022) ke hisaab se 301 ko browser aur beech ke proxies apne aap cache (yaad) kar sakte hain. Phir agli baar browser hamare server se poochhta hi nahi. 302 ko by default cache nahi karte.<br><strong>Iske bina (soche bina chuna to):</strong> 301 se repeat clicks ki ginti chupke se gayab, ya 302 se server pe bekaar load.` },
    { type: 'table', head: ['', '301 Permanent', '302 Temporary'], rows: [
      ['Browser kya karta hai', 'Yaad rakh sakta hai, agli baar hamare server pe aata hi nahi', 'Har baar hamare server se poochhta hai'],
      ['Server load', 'Kam', 'Zyada'],
      ['Analytics', 'Repeat clicks miss ho sakte hain', 'Har click count hota hai'],
      ['Search engines', 'Asli page ko "permanent" maante hain (SEO ke liye achha)', 'Short link ko temporary maante hain'],
      ['Kab', 'Speed + SEO chahiye', 'Har click ki ginti zaroori, ya destination badal sakta hai'],
    ]},
    { type: 'p', html: `Bitly asal mein kya karta hai? Bitly ke support page ke mutabik unke links <strong>301</strong> redirect dete hain, kyunki ek baar bana link kabhi badla ya dobara use nahi kiya jaata. Lekin clicks phir bhi gine jaate hain. Kaise? Humne October 2026 mein do public bit.ly links ka response khud check kiya: jawab tha <code>301</code> ke saath <code>Cache-Control: private, max-age=90</code>. Matlab browser is redirect ko sirf <strong>90 second</strong> yaad rakh sakta hai, aur "private" ka matlab beech ke shared proxies ise cache nahi karenge. Ye beech ka raasta hai: 301 ka SEO fayda, aur 90 second ke baad ka har click phir server tak aata hai.` },
    { type: 'callout', tone: 'mistake', title: '301 ya 302? Chhota sa status code, bada farak', html: `Beginner aksar sochte hain "redirect to redirect hai". Lekin 301 bina kisi <code>Cache-Control</code> header ke bheja, to browser use lambe time tak yaad rakh sakta hai: user ne link doosri baar khola to browser seedha asli URL pe, hamare server ko pata hi nahi. Redirect fast, server ka load kam, lekin <strong>us click ki analytics gayab</strong>. Aur agar baad mein destination badalna pada (galat link), to purane browsers maanenge hi nahi.<br><br>Interview mein teeno bolo: "Har click ginna hai to 302. Speed aur SEO bhi chahiye to 301 ke saath chhota <code>max-age</code>, jaise Bitly 90 second rakhta hai. Sirf speed chahiye, ginti nahi, to plain 301."` },

    { type: 'h3', text: 'Database kaunsa? Bitly ki kahani' },
    { type: 'p', html: `Access pattern dekho: sirf "code do, URL lo". Na joins, na complex queries, aur data TBs mein. Ye perfect <strong>key-value</strong> use case hai. Itna data ek machine pe nahi aata, to sharding chahiye; shard key = short code (hash karke, taaki data barabar faile).` },
    { type: 'p', html: `Bitly ka asli safar yahi sikhata hai. July 2023 ke Google Cloud blog post mein ek Bitly engineer ne likha ki saalon tak link data ek <strong>haath se shard kiye MySQL</strong> mein tha. Dikkatein: upgrades ke waqt 100% available rakhna mushkil, roz ka backup lagbhag poora din leta tha, sharding config chhoona itna risky tha ki wo use chhoote hi nahi the, aur multi-region jaana bahut mushkil tha. Isliye unhone <strong>Cloud Bigtable</strong> (Google ka managed NoSQL wide-column database) chuna, kyunki unka data ek hi primary key se padha jaata hai aur relational features ki zaroorat nahi thi.` },
    { type: 'list', items: [
      `<strong>Migration ka tareeka:</strong> pehle "dual writes" (naya data dono jagah likho), phir Go scripts se purana data copy, phir dono ka data compare karke validate, phir reads ko percentage mein dheere dheere naye DB pe shift. Rollback ke liye MySQL mein likhna kuch der chalu rakha.`,
      `<strong>Numbers (2023):</strong> 80 billion MySQL rows walk kiye; ek purane feature ka data chhod diya, to ~40 billion records hi gaye; Bigtable mein ~26 TB (replication ke bina); poora migration 6 din mein.`,
      `<strong>Sabak:</strong> "ek primary key se lookup" wala data shuru mein SQL mein bhi chal jaata hai, lekin bade scale pe managed key-value / wide-column store ka operations (sharding, replication, backups) bahut aasaan ho jaata hai.`,
    ]},

    { type: 'h3', text: 'Aur kya toot sakta hai?' },
    { type: 'table', head: ['Kya gira / kya hua', 'Kya hoga', 'Bachav'], rows: [
      ['ID generator down', 'Naye links tab tak bante hain jab tak servers ki range bachi hai. Redirects pe koi asar nahi.', 'Badi ranges, generator ki replicas (consensus store pe), alert.'],
      ['Ek DB shard down', 'Us shard ke codes ke cache miss fail. Baaki sab chalu.', 'Har shard ki replicas + failover; Bitly ne Bigtable ki multi-region replication aur backups chune.'],
      ['Queue (NSQ/Kafka) down', 'Redirect chalna chahiye! Sirf analytics ruke.', 'Event bhejna fire-and-forget rakho; app ki memory/disk pe chhota buffer; redirect kabhi queue ka wait na kare.'],
      ['Viral link (hot key)', 'Ek hi cache key pe lakhon reads/s.', 'App servers ki local memory mein bhi cache, Redis replicas, CDN/edge pe redirect cache.'],
      ['Spam / phishing links', 'Hamara domain hi block list mein aa sakta hai.', 'Create pe URL check, clicks pe spam detection (Bitly ke pipeline ka ek step), report/disable button.'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'Encode + decode, custom alias, expiry. NFR: redirect < 50 ms, bahut high availability, codes unique, analytics eventual.' },
      { t: 'Napkin maths', d: 'Writes chhote (~100-1k/s), reads 50-100 guna. Matlab read-heavy: cache sabse zaroori. Storage TBs mein: sharded key-value.' },
      { t: 'API', d: 'POST /api/links → 201; GET /{code} → 301/302 + Location.' },
      { t: 'Code generation', d: 'Hash/random = collision check; counter + base62 = zero collisions, ID ranges se SPOF nahi, scramble se guessable nahi.' },
      { t: 'High-level design', d: 'Client → LB → stateless app → Redis (cache-aside) → key-value DB; ID generator; click events → queue.' },
      { t: 'Deep dives', d: '301 vs 302 (Bitly: 301 + max-age=90); hit ratio; async analytics fan-out (NSQ); DB choice (Bitly MySQL → Bigtable, 2023); failures.' },
    ]},
    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 640,
      caption: 'Upar se neeche: users, darwaza (LB), do services (encode, decode), data, aur click ke baad ka analytics. Buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Users', x: 10, y: 10, w: 700, h: 84 },
        { label: 'Edge', x: 10, y: 108, w: 700, h: 84 },
        { label: 'Services', x: 10, y: 206, w: 700, h: 100 },
        { label: 'Data + queue', x: 10, y: 324, w: 700, h: 92 },
        { label: 'Analytics', x: 10, y: 432, w: 700, h: 198 },
      ],
      nodes: [
        { id: 'client', label: 'Users', sub: 'browser / app', x: 360, y: 50, w: 200, kind: 'client', info: 'Ye kya hai: log jo link banate hain ya kisi short link pe click karte hain. Clicks banane se 50-100 guna zyada hote hain.' },
        { id: 'lb', label: 'Load balancer', sub: 'DNS → LB', x: 360, y: 150, w: 200, kind: 'net', info: 'Ye kya hai: system ka public darwaza. DNS xyz.co ko iske address pe le aata hai, aur ye requests ko healthy servers mein baant-ta hai. Iske bina ek server gira to sab gira.' },
        { id: 'create', label: 'Link API', sub: 'encode', x: 170, y: 256, w: 150, kind: 'server', info: 'Ye kya hai: link banane wali stateless service. ID range se number leti hai, scramble + base62 karti hai, DB mein save karti hai, phir 201. Synchronous, kyunki user ko turant kaam karne wala link chahiye.' },
        { id: 'redir', label: 'Redirect svc', sub: 'decode', x: 550, y: 256, w: 150, kind: 'server', info: 'Ye kya hai: click sambhalne wali stateless service. Cache, phir zaroorat ho to DB, phir 301/302 + Location. Saath mein click event queue mein. Sabse zyada traffic yahin.' },
        { id: 'idg', label: 'ID generator', sub: 'ranges', x: 85, y: 370, w: 130, kind: 'server', info: 'Ye kya hai: unique numbers ki ranges dene wali chhoti service, ek strongly consistent store pe. Range ki wajah se bottleneck/SPOF nahi.' },
        { id: 'db', label: 'Link DB', sub: 'sharded KV', x: 290, y: 370, w: 150, kind: 'data', info: 'Ye kya hai: code → URL ka permanent record (source of truth). Key-value, code se shard. Bitly: pehle haath se shard kiya MySQL, 2023 se Cloud Bigtable.' },
        { id: 'cache', label: 'Redis cache', sub: 'code → URL', x: 470, y: 370, w: 150, kind: 'cache', info: 'Ye kya hai: RAM mein hot links. Cache-aside: pehle yahan dekho, miss pe DB se laao aur yahan rakho. Hit ratio jitna ooncha, DB utna shaant.' },
        { id: 'q', label: 'Queue', sub: 'NSQ / Kafka', x: 640, y: 370, w: 120, kind: 'queue', info: 'Ye kya hai: click events ki line. Bitly NSQ use karta hai (khud banaya, open source); kai companies Kafka. Redirect kabhi iska wait nahi karta.' },
        { id: 'arch', label: 'Archive', sub: 'HDFS + S3', x: 110, y: 490, w: 150, kind: 'data', info: 'Ye kya hai: har click ka raw record, permanently. Baad mein koi bhi naya analysis dobara chalaya ja sake.' },
        { id: 'rt', label: 'Real-time stats', sub: 'live counts', x: 290, y: 490, w: 150, kind: 'server', info: 'Ye kya hai: abhi kitne clicks aa rahe hain, ye ginne wala consumer. Dashboards ke live numbers isi se.' },
        { id: 'hist', label: 'History stats', sub: 'days, countries', x: 470, y: 490, w: 150, kind: 'server', info: 'Ye kya hai: lambe time ka hisaab rakhne wala consumer: kis din, kis desh, kis referrer se kitne clicks.' },
        { id: 'spam', label: 'Spam check', sub: 'abuse', x: 640, y: 490, w: 120, kind: 'threat', info: 'Ye kya hai: kharab links (spam, phishing) pakadne wala step. Bitly ke pipeline mein kuch steps yahi karte hain.' },
        { id: 'stats', label: 'Stats API', sub: 'customer dashboards', x: 380, y: 590, w: 200, kind: 'server', info: 'Ye kya hai: processed data ko customers tak pahunchaane wali API. Bitly ke blog ke mutabik processed data ek service-oriented API se dashboards aur reports ko milta hai.' },
      ],
      edges: [
        { a: 'client', b: 'lb', n: 1 },
        { a: 'lb', b: 'create', label: 'POST /links' },
        { a: 'lb', b: 'redir', label: 'GET /2TX' },
        { a: 'create', b: 'idg', label: 'ID range' },
        { a: 'create', b: 'db', label: 'save' },
        { a: 'redir', b: 'cache', label: 'cache?' },
        { a: 'redir', b: 'db', label: 'on miss', dashed: true },
        { a: 'redir', b: 'q', kind: 'evt', label: 'click event' },
        { a: 'redir', b: 'client', kind: 'res', label: '301/302', via: [[680, 256], [680, 50]] },
        { a: 'q', b: 'spam', kind: 'evt' },
        { a: 'q', b: 'hist', kind: 'evt', via: [[640, 440], [470, 440]] },
        { a: 'q', b: 'rt', kind: 'evt', via: [[640, 440], [290, 440]] },
        { a: 'q', b: 'arch', kind: 'evt', via: [[640, 440], [110, 440]] },
        { a: 'rt', b: 'stats' },
        { a: 'hist', b: 'stats' },
      ],
      paths: [
        { name: 'Link banao', text: 'User → LB → Link API → ID generator se range ka agla number → scramble + base62 → Link DB mein save → 201 + short link.', go: ['client>lb>create>idg', 'create>db'] },
        { name: 'Redirect', text: 'Click → LB → Redirect service → Redis (hit: ~1 ms) → miss ho to Link DB → 301/302 + Location wapas browser ko.', go: ['client>lb>redir>cache', 'redir>db', 'redir>client'] },
        { name: 'Analytics', text: 'Redirect ke saath click event queue mein → fan-out: archive, real-time, history, spam → Stats API se dashboards. Redirect kabhi iska wait nahi karta.', go: ['redir>q>rt>stats', 'q>hist>stats', 'q>arch', 'q>spam'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Do kaam: <strong>encode</strong> (link banana, kam) aur <strong>decode</strong> (redirect, bahut zyada). System read-heavy hai, isliye <strong>cache</strong> sabse important.</li>
      <li>Code: hash/random mein collision pakka (birthday problem), har baar check. <strong>Counter + base62</strong> = zero collision; 7 chars ≈ 3.5 trillion codes.</li>
      <li>Counter ke liye <strong>ID ranges</strong>: generator bottleneck/SPOF nahi banta; crash pe kuch IDs waste, chalta hai. Sequential codes ko <strong>scramble</strong> karo.</li>
      <li>Redirect = status code + <code>Location</code>. <strong>301</strong> cache hota hai (fast, SEO), <strong>302</strong> har click server tak. Bitly: 301 + <code>max-age=90</code>.</li>
      <li>Data = "code se lookup": <strong>sharded key-value</strong>. Bitly 2023: haath se shard kiya MySQL → Cloud Bigtable, dual writes ke saath.</li>
      <li>Clicks ki ginti <strong>async</strong>: event queue (Bitly: NSQ) mein, fan-out to archive, live stats, history, spam. Consumer gire to sirf backlog.</li>
      <li>Cache gire to DB pe bhaari load: replicas, local cache, warm-up. Queue gire to bhi redirect chalta rahe.</li>
    </ul>` },

    { type: 'h2', text: 'Trade-offs jo humne liye' },
    { type: 'tradeoffs', gains: ['Counter + base62: zero collisions, chhote codes, create pe DB check nahi', 'Cache: zyaadatar redirects ~1 ms mein, DB shaant', 'Async analytics: redirect kabhi slow nahi, naye consumers jodna aasaan', 'Stateless servers: aaram se scale', 'Key-value store: sharding aur replication simple'], costs: ['Sequential codes guessable (scramble karna padega)', 'ID ranges: server crash pe kuch IDs waste (chalta hai)', 'Analytics thoda der se update (eventual)', '302 chuna to server load zyada; 301 chuna to kuch repeat clicks miss', 'Cache down hua to DB pe achanak bhaari load'] },

    { type: 'think', questions: [
      { q: 'Ek link viral ho gaya: 1 lakh clicks per second. Kya toot sakta hai?', a: 'Saare clicks ek hi cache key pe (hot key). Ek Redis node shayad sambhal le, lekin agar nahi: us key ko app servers ki local memory mein bhi cache karo, ya Redis replicas pe reads baanto. Click events queue absorb kar leti hai. 301 + chhota max-age bhi madad karta hai: ek hi browser ke repeat clicks 90 second tak server tak aate hi nahi.' },
      { q: 'Do users same lamba URL shorten karein to same code dena chahiye ya alag?', a: 'Product decision hai. Same dena ho to "URL → code" ka ek aur index chahiye (extra lookup + storage), ya hash wala raasta. Alag dena simple hai aur har user ki analytics alag rehti hai. Zyada services alag dete hain.' },
      { q: 'Custom alias (xyz.co/diwali-sale) counter + base62 ke saath kaise chalega?', a: 'Alias user chunta hai, to collision ho sakta hai: DB mein "pehle se hai?" check zaroori (unique key ke saath insert, fail ho to "naam le liya gaya"). Aur dhyaan rakho ki alias kabhi kisi base62 code se na takraaye: jaise alias ki minimum length 8+ rakho ya ek alag namespace/prefix.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'URL shortener read-heavy hai ya write-heavy?', options: ['Write-heavy', 'Read-heavy (~50-100:1)', 'Barabar'], answer: 1, explain: 'Link ek baar banta hai, bahut baar khulta hai. Bitly ke 2023 numbers mein bhi clicks naye links se ~55 guna the. Isliye cache sabse important component hai.' },
      { q: 'Hash ke pehle 7 characters ki jagah counter + base62 kyun?', options: ['Base62 zyada secure hai', 'Unique number se collision hota hi nahi, to har create pe DB check nahi', 'Hash slow hai'], answer: 1, explain: 'Har number unique, to har code unique. Hash ke truncate karne pe collisions pakke hain (10 lakh links pe hi ~13% chance), isliye check + retry lagta.' },
      { q: 'Har click ki ginti ke liye DB row mein count++ ki jagah queue mein events kyun?', options: ['Queue sasta hai', 'Redirect fast rahe aur viral link pe ek row pe writes ka toofan na aaye', 'DB mein count store nahi ho sakta'], answer: 1, explain: 'Async processing: user ko turant response, aur ginti alag consumers apni speed se karte hain. Bitly ka stream pipeline isi idea pe hai.' },
      { q: 'Bitly 301 bhejta hai, phir bhi clicks kaise ginta hai?', options: ['301 kabhi cache nahi hota', '301 ke saath Cache-Control: private, max-age=90, to browser sirf 90 second yaad rakhta hai', 'Bitly JavaScript chalata hai', 'Bitly sirf pehla click ginta hai'], answer: 1, explain: 'Header browser ki yaad ko 90 second tak seemit karta hai, aur "private" shared proxies ko cache karne se rokta hai. Uske baad ka click phir server tak aata hai.' },
      { q: 'ID generator down ho gaya. Turant kya hoga?', options: ['Saare redirects band', 'Servers apni bachi range se links banate rahenge; redirects pe koi asar nahi', 'DB ka data ud jaayega', 'Cache khaali ho jaayega'], answer: 1, explain: 'Ranges isi liye hain: generator har link ke raaste mein nahi hai. Redirect ko generator ki zaroorat hi nahi.' },
    ]},
    { type: 'sources', note: 'Is lesson ke Bitly-specific hisse inhi sources se liye gaye hain. Numbers (QPS, hit ratio) jahan source nahi, wahan "maan lo" likha hai.', items: [
      { title: 'Joining Bitly Engineering', publisher: 'Bitly engineering blog (word.bitly.com)', official: true, year: 2014, url: 'https://word.bitly.com/post/77292911854', used: 'Encode/decode terms, ~6B decodes/month, stream-based processing chain, NSQ, spam/abuse steps, processed data re-queued, backlog resilience, service API for dashboards.' },
      { title: 'Bitly: Lessons Learned Building a Distributed System that Handles 6 Billion Clicks a Month', publisher: 'High Scalability, summary of a talk by Bitly\'s lead application developer', year: 2014, url: 'https://highscalability.com/bitly-lessons-learned-building-a-distributed-system-that-han/', used: 'Click fan-out to archive (HDFS, S3), real-time, history, annotation; ~600M shortens/month; ~30 of ~400 servers take outside traffic; shortening kept synchronous; events vs commands; backpressure.' },
      { title: 'Lessons Learned Building Distributed Systems at Bitly (Sean O\'Connor talk)', publisher: 'InfoQ news summary', year: 2014, url: 'https://www.infoq.com/news/2014/07/bitly-lessons-learned', used: 'Talk date and context (May 2014), stream-based processing and queue usage, cross-check of the High Scalability summary.' },
      { title: 'From MySQL to NoSQL: Bitly\'s big move to Bigtable', publisher: 'Google Cloud blog (written by a Bitly senior software engineer)', official: true, year: 2023, url: 'https://cloud.google.com/blog/products/databases/bitly-migrates-link-data-from-mysql-to-bigtable-for-scalability/', used: '~360M clicks/day and 6-7M links/day, ~40B active links, manually sharded MySQL problems, why Bigtable, dual writes + validation + gradual cutover, 80B rows → ~40B records, ~26 TB, 6 days, backups.' },
      { title: 'Bitly support: Bitly links use 301 redirects', publisher: 'Bitly support', official: true, url: 'https://support.bitly.com/hc/en-us/articles/230897368', used: 'Bitly links are 301 (permanent) redirects because links are never reused or modified. Cross-checked by inspecting two public bit.ly responses in October 2026 (301 with Cache-Control: private, max-age=90).' },
      { title: 'RFC 9110: HTTP Semantics, sections 15.4.2 (301) and 15.4.3 (302)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110#name-301-moved-permanently', used: '301 is heuristically cacheable by default while 302 is not; basis for the 301 vs 302 analytics trade-off.' },
      { title: 'NSQ: a realtime distributed messaging platform', publisher: 'nsq.io (open source project started at Bitly)', official: true, url: 'https://nsq.io/overview/design.html', used: 'What NSQ is and its design goals (distributed, no single broker), for the click-event queue.' },
    ]},
  ],
});
