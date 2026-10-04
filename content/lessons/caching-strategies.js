Lesson.register({
  id: 'caching-strategies',
  title: 'Cache strategies aur eviction',
  minutes: 38,
  summary: `Cache lagana aasaan hai, cache ko sahi chalana mushkil. Is lesson mein: cache kahan kahan rakhein, write kaise karein (cache-aside, read-through, write-through, write-back, write-around), memory full hone pe kaun nikle (LRU, LFU, TTL), stale data kaise hataayein, aur jab ek key expire hote hi lakhon requests database pe toot padein (stampede) ya ek hi key pe poori duniya aa jaaye (hot key) tab kya karein.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichhle lesson mein humne database ke saamne ek tez "yaad-daasht" (cache) lagayi. Ab asli sawaal aate hain.<br>Jab koi data <strong>badle</strong>, to pehle cache badlein ya database? Jab cache <strong>bhar jaaye</strong>, to kise nikaalein? Jab ek bahut popular cheez cache se <strong>gayab</strong> ho jaaye, to hazaaron log ek saath database pe na toot padein, iske liye kya karein?<br>Is lesson mein har sawaal ka jawab ek chhote khel (simulator) ke saath hai. Har tareeke ko khud chala ke dekho ki wo kab jeet-ta hai aur kab haarta hai.` },
    { type: 'h2', text: 'Ab tak ki kahani' },
    { type: 'p', html: `Pichhle lesson mein xyz.com ne apne database ke saamne ek <strong>Redis cache</strong> lagaya. Pattern simple tha: pehle cache dekho, nahi mila to database se lao aur cache mein rakh do (TTL ke saath). Database ka load 10 guna gir gaya. Party.` },
    { type: 'p', html: `Lekin traffic badha, aur naye sawaal aaye jo pehle wale simple pattern se solve nahi hote:` },
    { type: 'list', items: [
      '<strong>Write kaise karein?</strong> Riya ne post edit ki. Pehle DB update karein ya cache? Cache update karein ya delete? Galat order = purana data ghanton tak dikhega.',
      '<strong>Memory full.</strong> Redis mein 16 GB RAM hai, data 200 GB. Naya item rakhne ke liye kisko nikaalein?',
      '<strong>Stampede.</strong> Homepage ki "trending" key har 5 minute pe expire hoti hai. Expire hote hi 2,000 requests ek saath database pe gayin aur DB hil gaya.',
      '<strong>Hot key.</strong> Ek cricketer ne xyz.com pe post daali. Ek hi key pe 5 lakh reads per second. Redis ka ek node itna nahi jhel pa raha.',
    ]},
    { type: 'p', html: `Har problem ka apna tool hai. Ek ek karke chalte hain.` },

    { type: 'h2', text: 'Cache kahan kahan rakh sakte hain?' },
    { type: 'p', html: `Cache sirf Redis nahi hai. Request user se database tak jaate hue kai jagah se guzarti hai, aur har jagah ek cache ho sakta hai. Jitna user ke paas, utna fast, lekin utna hi kam control.` },
    { type: 'callout', tone: 'term', title: 'Naya word: In-process (local) cache', html: `<strong>Ye kya hai:</strong> app server ke <strong>apne RAM mein</strong>, usi program ke andar ek chhota sa map (key → value), expiry ke saath. Jaise Java mein Caffeine library, ya Python mein ek dict.<br><strong>Kyun chahiye:</strong> network call hi nahi, to sabse tez (microseconds se bhi kam). Bahut hot, kam badalne wale data ke liye best.<br><strong>Iske bina:</strong> har chhoti cheez (config, feature flag) ke liye bhi Redis tak network hop.<br><strong>Dikkat:</strong> har server ki apni alag copy. 50 servers = 50 copies, aur unhe ek saath update karna mushkil.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Distributed cache', html: `<strong>Ye kya hai:</strong> ek alag cache server (ya kai servers ka group, yaani cluster) jise <strong>saare</strong> app servers share karte hain. Jaise Redis ya Memcached.<br><strong>Kyun chahiye:</strong> ek server ne value rakhi, to doosre server ko bhi mil jaati hai. Data ek jagah, ek hi copy.<br><strong>Iske bina:</strong> har app server apni copy bharta, hit rate kam, aur sab copies alag alag.<br><strong>Keemat:</strong> har baar ek network hop (~0.5-1 ms), aur ek aur system jo gir sakta hai.` },
    { type: 'ascii', text: `
User ka phone/browser   ──>   CDN edge   ──>   App server   ──>   Redis   ──>   Database
 [browser cache]            [edge cache]     [in-process]     [distributed]   (source of truth)
   ~0 ms                     ~5-20 ms          ~0.001 ms        ~0.5-1 ms        ~5-10 ms
   sirf us user ka           sabke liye same   sirf us server   saare servers    asli data
                                               ka               ka shared` , caption: 'Har layer pe ek cache. Numbers rough orders of magnitude hain.' },
    { type: 'table', head: ['Layer', 'Kya rakhte hain', 'Faayda', 'Dikkat'], rows: [
      ['Browser / app', 'Images, JS/CSS, kabhi kabhi API responses (Cache-Control header se)', 'Request network pe jaati hi nahi', 'Server se invalidate nahi kar sakte; TTL hi sahara'],
      ['CDN', 'Jo sabke liye same hai: images, video, public JSON', 'Duniya bhar mein user ke paas', 'Personal data nahi; purge mein time lagta hai'],
      ['App memory (local)', 'Chhota, bahut hot, kam badalne wala data: config, feature flags, hot keys', 'Nanoseconds; network nahi', 'Har server ki alag copy; inconsistent ho sakti hai; restart pe khaali'],
      ['Distributed (Redis)', 'Profiles, sessions, feeds, counters', 'Sab servers ke liye ek copy; bada size', 'Network hop; ek aur system jo gir sakta hai'],
    ]},
    { type: 'callout', tone: 'tip', html: `Real systems layers <strong>combine</strong> karte hain: CDN static cheezon ke liye, Redis shared data ke liye, aur sirf 2-3 super-hot keys ke liye 1-5 second ka local cache. Agla lesson (CDN) pehli layer ko detail mein dekhega.` },

    { type: 'h2', text: 'Read aur write strategies' },
    { type: 'p', html: `Cache aur database dono mein data hai. Sawaal ye hai: <em>kaun kisko kab update karta hai?</em> Paanch famous patterns hain. Naam yaad rakhne se zyada zaroori hai ye samajhna ki har ek mein data kahan pehle jaata hai aur crash hone pe kya bachta hai.` },
    { type: 'table', head: ['Strategy', 'Read pe', 'Write pe', 'Ek line mein'], rows: [
      ['<strong>Cache-aside</strong> (lazy loading)', 'App cache dekhe; miss pe app DB se laaye aur cache bhare', 'App DB update kare, phir cache key <strong>delete</strong> kare', 'App boss hai. Sabse common default.'],
      ['<strong>Read-through</strong>', 'App sirf cache se maange; miss pe <em>cache khud</em> DB se laaye', '(Aksar write-through ke saath)', 'Cache-aside jaisa, bas loading ka code cache layer mein'],
      ['<strong>Write-through</strong>', 'Cache se', 'Cache aur DB dono mein, <em>saath saath</em>, phir OK', 'Cache hamesha fresh, writes slow'],
      ['<strong>Write-back</strong> (write-behind)', 'Cache se', 'Sirf cache mein, turant OK; DB mein baad mein batch mein', 'Writes super fast, crash pe data loss ka risk'],
      ['<strong>Write-around</strong>', 'Cache-aside jaisa', 'Seedha DB mein, cache ko chhuo hi mat', 'Jo data likhne ke baad shayad hi padha jaaye'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naye words: read path, write path, "OK" (acknowledge)', html: `<strong>Read path:</strong> data padhte waqt request kin kin jagah se guzarti hai. <strong>Write path:</strong> data likhte/badalte waqt kin jagah se.<br><strong>"OK" dena (acknowledge):</strong> server ka user ko bolna "ho gaya, save ho gaya". Asli sawaal ye hai: OK dene ke waqt data <em>kahan</em> tak pahuncha tha? Sirf RAM mein, ya database (disk) mein bhi?<br><strong>Kyun zaroori:</strong> agar OK dene ke baad crash ho aur data sirf RAM mein tha, to user ka "saved" data gayab. Isi ek sawaal se paanchon strategies alag hoti hain.` },
    { type: 'p', html: `Ab paanchon ko ek ek karke dekhte hain. Har ek ke liye ek hi example: xyz.com pe post 7 ke <strong>likes</strong>. Maan lo cache ka ek operation ~1 ms aur database ka ~10 ms leta hai.` },
    { type: 'h3', text: '1. Cache-aside (lazy loading)' },
    { type: 'p', html: `<strong>Kaise:</strong> app khud cache aur database dono se baat karta hai. Read: cache dekho, miss pe DB se lao aur cache bharo. Write: DB update karo, phir cache key <strong>delete</strong>.<br><strong>Hisaab:</strong> read hit 1 ms; read miss 1 + 10 + 1 = 12 ms; write 10 + 1 = 11 ms. 1,000 likes = 1,000 DB writes, aur har like ke baad agli read ek miss.<br><strong>Faayda:</strong> simple; cache gire to bhi app DB se chal jaata hai; sirf maangi gayi cheezein cache mein.<br><strong>Nuksaan:</strong> har naye/delete hue item ki pehli read slow (miss); ek rare race condition (neeche flow mein).<br><strong>Kab:</strong> default, zyada tar read-heavy cheezon ke liye (profiles, posts, product pages).` },
    { type: 'h3', text: '2. Read-through' },
    { type: 'p', html: `<strong>Kaise:</strong> app sirf cache layer se maangta hai. Miss pe <em>cache layer khud</em> DB se laati hai (ek "loader" function se), rakhti hai, aur lauta deti hai. App ko DB ka pata hi nahi.<br><strong>Hisaab:</strong> read hit 1 ms; read miss ~11 ms. Reads ki ginti cache-aside jaisi hi; farak sirf is baat ka hai ki loading ka code <em>kahan</em> likha hai.<br><strong>Faayda:</strong> loading ka logic ek jagah; 20 services ho to 20 jagah same code nahi.<br><strong>Nuksaan:</strong> cache layer zyada smart aur complex; plain Redis ye khud nahi karta, library ya managed service chahiye (jaise Java ki Caffeine LoadingCache, ya DynamoDB ke saamne AWS DAX).<br><strong>Kab:</strong> jab kai services ek hi data padhti hain aur tum loading ek jagah rakhna chahte ho.` },
    { type: 'h3', text: '3. Write-through' },
    { type: 'p', html: `<strong>Kaise:</strong> har write cache layer ko jaata hai, aur cache layer <em>usi waqt</em> DB mein bhi likhti hai. Dono ho jaayein, tab OK.<br><strong>Hisaab:</strong> write 1 + 10 = 11 ms; 1,000 likes = 1,000 DB writes. Lekin reads hamesha hit (1 ms), kyunki cache mein hamesha taaza value hai.<br><strong>Faayda:</strong> cache kabhi purana nahi (read-after-write turant sahi); crash pe kuch nahi khota, DB mein sab hai.<br><strong>Nuksaan:</strong> har write slow (do jagah likhna); jo data kabhi padha nahi jaayega wo bhi cache mein jagah gherta hai.<br><strong>Kab:</strong> jab user ko apna likha turant dikhna chahiye aur writes bahut zyada nahi (profile settings, cart).` },
    { type: 'h3', text: '4. Write-back (write-behind)' },
    { type: 'p', html: `<strong>Kaise:</strong> write sirf cache mein, turant OK. Ek background job har kuch second mein jama hue badlaav <em>ek saath</em> (batch mein) DB mein likhta hai.<br><strong>Hisaab:</strong> write 1 ms. 10 second mein 5,000 likes = 5,000 Redis ops lekin sirf <strong>1</strong> DB write (flush). Agar flush se pehle Redis gira: jitne likes flush nahi hue, sab gayab.<br><strong>Faayda:</strong> writes bahut tez; DB pe writes hazaar guna kam.<br><strong>Nuksaan:</strong> crash = OK mil chuke data ka nuksaan; DB thodi der purana rehta hai.<br><strong>Kab:</strong> views, likes, counters, analytics, jahan thoda kam ginti chal jaaye. <strong>Paise, orders, bookings ke liye kabhi nahi.</strong>` },
    { type: 'h3', text: '5. Write-around' },
    { type: 'p', html: `<strong>Kaise:</strong> write seedha DB mein, cache ko <em>bilkul nahi</em> bharna. Read pe cache-aside ki tarah.<br><strong>Hisaab:</strong> write 10 ms; naya data cache mein nahi aata, to uski pehli read miss (12 ms).<br><strong>Faayda:</strong> cache un cheezon se nahi bharta jo likhi to gayin lekin shayad kabhi padhi nahi jaayengi (isko <strong>cache pollution</strong> kehte hain: bekaar data se cache ki jagah bharna).<br><strong>Nuksaan:</strong> taaza likha data padhne pe pehli baar slow. Aur agar is key ki <em>purani</em> copy cache mein pehle se thi, to use delete karna padega, warna stale. (Isliye cache-aside ka write asal mein "write-around + delete" hi hai.)<br><strong>Kab:</strong> logs, backups, bade uploads, purane archive: likho zyada, padho kam.` },
    { type: 'p', html: `<strong>Khud chala ke dekho.</strong> Neeche ek chhota sa lab hai. Upar se strategy chuno, phir "Read" aur "Write (+1 like)" dabao. Cache aur database ke andar kya value hai, har operation kitne ms ka, aur DB pe kitne writes gaye, sab dikhega. "Redis crash" dabake dekho kis strategy mein data khota hai:` },
    { type: 'custom', render(el) {
      const T = { modes: { aside: 'Cache-aside', rt: 'Read-through', wt: 'Write-through', wb: 'Write-back', wa: 'Write-around' },
        read: 'Read', write: 'Write (+1 like)', flush: 'Flush (background job)', crash: 'Redis crash', reset: 'Reset',
        app: 'App server', cache: 'Redis cache', db: 'Database', empty: 'khaali', unflushed: n => `${n} likes abhi DB mein nahi gaye`,
        stats: ['Pichhla operation', 'DB writes', 'DB reads', 'Hit / miss', 'Kho gaye likes'],
        start: 'Strategy chuno, phir Read / Write dabao.',
        hit: (v, ms) => `Read: cache HIT, likes = ${v} (${ms} ms).`, stale: ' <strong>Dhyaan: ye value database se alag hai (STALE)!</strong>',
        missApp: (v, ms) => `Read: cache MISS. App ne DB se laaya (${v}) aur cache mein SET kiya (${ms} ms).`,
        missLayer: (v, ms) => `Read: cache MISS. Cache layer ne khud DB se laaya (${v}) aur rakh liya. App ko DB ka pata bhi nahi (${ms} ms).`,
        wAside: (v, ms) => `Write: DB mein likes = ${v}, phir cache key DELETE (${ms} ms). Agli read miss hogi.`,
        wThrough: (v, ms) => `Write: cache aur DB dono mein ${v}, dono ho gaye tab OK (${ms} ms).`,
        wBack: (v, ms) => `Write: sirf cache mein ${v}, turant OK (${ms} ms). DB ko abhi pata nahi.`,
        wLoad: ' (pehle cache khaali tha, to DB se value laani padi)',
        wAround: (v, ms, st) => `Write: seedha DB mein ${v} (${ms} ms). Cache ko chhua nahi.` + (st ? ' <strong>Cache mein purani copy padi hai: ab wo STALE hai. Isliye write-around ke saath purani key delete karni padti hai.</strong>' : ''),
        flushed: (n, v) => n ? `Flush: ${n} likes ka badlaav DB mein <strong>ek</strong> write mein gaya (DB = ${v}).` : 'Flush: kuch pending nahi tha.',
        crashed: n => n ? `Redis crash! RAM khaali. <strong>${n} likes kho gaye</strong>: users ko OK mil chuka tha, lekin DB tak nahi pahunche.` : 'Redis crash! RAM khaali. Lekin DB mein sab kuch tha, kuch nahi khoya. Agli read bas miss hogi.',
        notes: { aside: 'Try: Read, Read (hit), Write, Read. Write ke baad key delete hui, to agli read miss (12 ms) aur taaza value.',
          rt: 'Try: Read (miss). Ginti cache-aside jaisi hi hai, farak ye hai ki DB se laane ka kaam cache layer karti hai. Yahan write, write-through ki tarah hota hai.',
          wt: 'Try: Read, Write, Read. Write 11 ms ka hai, lekin uske baad wali read bhi HIT hai aur value taaza hai.',
          wb: 'Try: pehle Read (cache bhar jaaye). Phir Write 5 baar: har ek 1 ms, DB writes 0. Phir Flush: 1 DB write. Phir 3 Write aur "Redis crash": 3 likes kho gaye.',
          wa: 'Try: Read (cache bhar gaya), Write, Read. Write ne cache ko nahi chhua, to read purani value deti hai: STALE.' } };
      el.innerHTML = `<div class="cwl-m" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="cwl-boxes" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary" data-a="read">${T.read}</button>
          <button type="button" class="btn small primary" data-a="write">${T.write}</button>
          <button type="button" class="btn small cwl-flush" data-a="flush">${T.flush}</button>
          <button type="button" class="btn small" data-a="crash">${T.crash}</button>
          <button type="button" class="btn small ghost" data-a="reset">${T.reset}</button>
        </div>
        <div class="stats cwl-st"></div>
        <div class="calc-note cwl-log" style="min-height:2.6em"></div>
        <div class="calc-note cwl-note"></div>`;
      const q = s => el.querySelector(s);
      let mode = 'aside', S;
      const reset = () => { S = { db: 100, c: null, dirty: 0, ms: 0, w: 0, r: 0, hit: 0, miss: 0, lost: 0, log: T.start }; draw(); };
      const act = a => {
        if (a === 'reset') return reset();
        if (a === 'read') {
          if (S.c !== null) { S.hit++; S.ms = 1; S.log = T.hit(S.c, 1) + (mode !== 'wb' && S.c !== S.db ? T.stale : ''); }
          else { S.miss++; S.r++; S.c = S.db; const app = mode === 'aside' || mode === 'wa'; S.ms = app ? 12 : 11; S.log = app ? T.missApp(S.c, S.ms) : T.missLayer(S.c, S.ms); }
        } else if (a === 'write') {
          if (mode === 'aside') { S.db++; S.w++; S.c = null; S.ms = 11; S.log = T.wAside(S.db, 11); }
          else if (mode === 'wt' || mode === 'rt') { S.db++; S.w++; S.c = S.db; S.ms = 11; S.log = T.wThrough(S.db, 11); }
          else if (mode === 'wb') { let extra = 0; if (S.c === null) { S.c = S.db; S.r++; extra = 11; } S.c++; S.dirty++; S.ms = 1 + extra; S.log = T.wBack(S.c, S.ms) + (extra ? T.wLoad : ''); }
          else { S.db++; S.w++; S.ms = 10; S.log = T.wAround(S.db, 10, S.c !== null); }
        } else if (a === 'flush') { const n = S.dirty; if (n) { S.db = S.c; S.w++; S.dirty = 0; } S.ms = null; S.log = T.flushed(n, S.db); }
        else if (a === 'crash') { const n = S.dirty; S.lost += n; S.c = null; S.dirty = 0; S.ms = null; S.log = T.crashed(n); }
        draw();
      };
      const box = (title, val, sub, kind, warn) => `<div style="padding:10px 12px;border-radius:var(--r);border:${warn ? '2px solid var(--red)' : '1px solid var(--' + kind + '-s)'};background:var(--${kind}-f);color:var(--${kind}-t)"><div style="font-size:13px">${title}</div><div style="font:700 22px var(--f-mono)">${val}</div><div style="font-size:12px;color:var(--ink-3);min-height:1.2em">${sub}</div></div>`;
      const draw = () => {
        const mb = q('.cwl-m'); mb.innerHTML = '';
        Object.keys(T.modes).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = T.modes[k]; b.setAttribute('aria-pressed', k === mode); b.onclick = () => { mode = k; reset(); }; mb.appendChild(b); });
        const stale = mode !== 'wb' && S.c !== null && S.c !== S.db;
        q('.cwl-boxes').innerHTML = box(T.app, T.modes[mode], '', 'server') + box(T.cache, S.c === null ? '·' : 'likes ' + S.c, S.c === null ? T.empty : (S.dirty ? T.unflushed(S.dirty) : (stale ? 'STALE' : '')), 'cache', stale) + box(T.db, 'likes ' + S.db, '', 'data');
        q('.cwl-st').innerHTML = [[T.stats[0], S.ms === null ? '-' : S.ms + ' ms'], [T.stats[1], S.w], [T.stats[2], S.r], [T.stats[3], S.hit + ' / ' + S.miss], [T.stats[4], S.lost]].map(([a, b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');
        q('.cwl-log').innerHTML = S.log;
        q('.cwl-note').textContent = T.notes[mode];
        q('.cwl-flush').style.display = mode === 'wb' ? '' : 'none';
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
      reset();
    }},
    { type: 'callout', tone: 'term', title: 'Naya word: race condition', html: `<strong>Ye kya hai:</strong> jab do kaam lagbhag ek saath chalein aur nateeja is baat pe depend kare ki kaun pehle khatam hua. Kabhi sahi, kabhi galat, aur galti dobara banana mushkil.<br><strong>Yahan kyun:</strong> ek reader aur ek writer ek hi key pe ek saath kaam karein to cache mein galat (purani) value reh sakti hai. Neeche "Cache-aside: write" ke aakhri step mein dekho.<br><strong>Bachaav:</strong> TTL hamesha (galti ki umar limited), write pe update ki jagah delete, aur bade systems mein leases.` },
    { type: 'p', html: `Ab har strategy ko diagram mein bhi chala ke dekho. Har scenario ek strategy hai, aur kuch mein jaan-boojh ke cheezein toot-ti hain:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'User', sub: 'xyz.com app', x: 80, y: 165, w: 120, kind: 'client', info: 'Ye kya hai: xyz.com ka user (browser ya app). Post padhta hai, like karta hai, profile edit karta hai. Har strategy mein iski request ka raasta alag hai.' },
        { id: 'app', label: 'App server', x: 270, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: xyz.com ka code chalane wala server (business logic). Cache-aside aur write-around mein yahi decide karta hai ki cache aur DB se kab baat karni hai. Read-through/write-through mein ye sirf cache layer se baat karta hai.' },
        { id: 'cache', label: 'Redis cache', sub: 'RAM, ~1 ms', x: 530, y: 70, w: 170, kind: 'cache', info: 'Ye kya hai: RAM wala tez cache (Redis), data ki temporary copy. Write-back mein ye kuch der ke liye data ka EKLAUTA ghar ban jaata hai, isliye wahan iska crash data loss hai.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 530, y: 270, w: 170, kind: 'data', meter: true, load: 35, info: 'Ye kya hai: source of truth, asli aur permanent data disk pe. Har strategy ka maqsad isko bachaana hai, lekin sach yahin rehna chahiye.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'cache', b: 'db', id: 'cd', dashed: true }],
      scenarios: [
        { name: 'Cache-aside: read', intro: 'Ye wahi pattern hai jo pichhle lesson mein dekha. Yaad taaza kar lo.', steps: [
          { title: 'Request', text: 'User post 7 kholta hai.', go: 'u>app', msg: 'GET /posts/7' },
          { title: 'App cache dekhta hai: MISS', text: 'App khud Redis se poochhta hai. Nahi mila.', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } }, msg: 'GET post:7  →  (nil)' },
          { title: 'App khud DB se laata hai', text: 'Cache ko DB ke baare mein kuch pata nahi. Saara logic app mein hai.', go: ['app>db', 'res:db>app'], msg: 'SELECT * FROM posts WHERE id = 7' },
          { title: 'App cache bharta hai (TTL ke saath)', text: 'Isliye naam "cache-aside": cache side mein baitha hai, app use bharta hai. Sirf wahi data cache mein aata hai jo sach mein maanga gaya (lazy loading).', go: 'app>cache', after: { cache: { state: '', sub: 'post:7 (TTL 300s)' } }, msg: 'SET post:7 {...} EX 300' },
          { title: 'Response', text: 'Agli requests cache hit hongi.', go: 'res:app>u' },
        ]},
        { name: 'Cache-aside: write', intro: 'Riya ne post 7 edit ki. Sahi order kya hai?', steps: [
          { title: 'Pehle database update', text: 'Sach hamesha pehle source of truth mein likho.', go: ['u>app>db', 'res:db>app'], after: { db: { sub: 'post 7 = v2' } }, msg: 'UPDATE posts SET body = "v2" WHERE id = 7' },
          { title: 'Phir cache key DELETE (update nahi)', text: 'Cache mein nayi value likhne ki jagah key hata do. Agli read pe miss hoga aur DB se taaza value aayegi. Delete karna safe hai kyunki do writers ek doosre ki value overwrite nahi kar sakte.', go: 'app>cache', after: { cache: { sub: 'post:7 deleted' } }, msg: 'DEL post:7' },
          { title: 'Agli read: miss, fresh value', text: 'Miss → DB → v2 cache mein. Sab sahi.', go: ['u>app>cache', 'bad:cache>app', 'app>db', 'res:db>app', 'app>cache', 'res:app>u'], after: { cache: { state: 'hit', sub: 'post:7 = v2' } } },
          { title: 'Lekin ek chhupi race condition', text: 'Bahut kam hota hai, lekin hota hai: Reader A ko miss mila, usne DB se <strong>purana v1</strong> padha, aur slow ho gaya. Beech mein writer ne v2 likha aur key delete ki. Ab A jaag ke v1 cache mein SET kar deta hai. Cache mein v1 TTL tak atka. Isliye TTL hamesha rakho (safety net). Facebook ne apne memcache paper mein is "stale set" ko <strong>leases</strong> se roka: miss pe cache ek token deta hai, aur beech mein delete hua to wo token invalid ho jaata hai, SET reject.', focus: ['cache'], set: { cache: { state: 'warn', sub: 'v1 wapas aa gaya!' } } },
        ]},
        { name: 'Read-through', intro: 'App ko DB ka pata hi nahi. Wo sirf cache layer se baat karta hai.', steps: [
          { title: 'App sirf cache se maangta hai', text: 'App ke code mein bas <code>cache.get(7)</code>.', hide: ['app-db'], go: 'u>app>cache', msg: 'cache.get("post:7")' },
          { title: 'Miss: cache layer khud DB se laati hai', text: 'Cache layer (ek library ya ek special caching service) ko pata hai ki miss pe kaunsa loader chalana hai. Plain Redis ye nahi karta; iske liye library chahiye (jaise Java ki Caffeine LoadingCache) ya managed layer (jaise DynamoDB ke saamne AWS DAX).', go: ['cache>db', 'res:db>cache'], after: { cache: { sub: 'loaded post:7' } }, msg: 'loader("post:7") → SELECT ...' },
          { title: 'Value app ko', text: 'Faayda: loading ka logic ek jagah, har service ko duplicate nahi karna. Nuksaan: cache layer zyada smart (aur complex) ho gayi.', go: 'res:cache>app>u' },
        ]},
        { name: 'Write-through', intro: 'Har write cache se guzar ke DB tak jaata hai.', steps: [
          { title: 'Write cache layer ko', go: 'u>app>cache', text: 'User ne profile ka naam badla.', msg: 'cache.put("user:42", {name: "Riya S"})' },
          { title: 'Cache layer synchronously DB mein likhti hai', text: 'DB mein likhna successful hone tak user wait karta hai.', go: ['cache>db', 'res:db>cache'], after: { db: { sub: 'name = Riya S' }, cache: { state: 'hit', sub: 'name = Riya S' } } },
          { title: 'Tab OK', text: 'Faayda: cache aur DB dono turant fresh, user ko apna naya naam turant dikhta hai. Nuksaan: har write ko do jagah likhna (slow), aur jo data kabhi padha nahi jaayega wo bhi cache mein jagah gherta hai. Isliye aksar TTL ke saath milaate hain.', go: 'res:cache>app>u' },
        ]},
        { name: 'Write-back (sahi chala)', intro: 'Video ke views aur likes: har second hazaaron +1. Har +1 pe DB write = DB ka dum ghut jaayega.', steps: [
          { title: 'Likes sirf Redis mein', text: 'Har like Redis mein ek atomic counter badhata hai. User ko turant OK. DB ko pata hi nahi.', go: ['u>app>cache', 'res:cache>app>u'], after: { cache: { sub: 'likes:7 = +1,000' } }, msg: 'INCR likes:7' },
          { title: 'Hazaaron aur likes', text: '1,000 likes, 1,000 Redis ops, 0 DB writes.', flood: { paths: ['u>app>cache'], n: 10 }, after: { cache: { state: 'hot', sub: 'likes:7 = +5,000' } } },
          { title: 'Har 10 second mein batch flush', text: 'Ek background job Redis se total uthata hai aur DB mein <strong>ek</strong> write karta hai. 5,000 writes → 1 write.', go: 'evt:cache>db', after: { cache: { state: '', sub: 'likes:7 flushed' }, db: { sub: 'likes = 85,000' } }, msg: 'UPDATE posts SET likes = likes + 5000 WHERE id = 7' },
        ]},
        { name: 'Write-back crash', intro: 'Ab wahi setup, lekin flush se pehle Redis gir gaya.', steps: [
          { title: 'Likes Redis mein jama ho rahe', go: ['u>app>cache', 'res:cache>app>u'], text: 'Users ko OK mil chuka hai.', after: { cache: { sub: 'likes:7 +4,200 pending' } } },
          { title: 'Redis crash', text: 'Process mar gaya, ya machine restart. RAM khaali.', set: { cache: { state: 'down', sub: 'DOWN' } }, go: 'lost:cache>db' },
          { title: '4,200 likes gayab', text: 'DB mein purana number hai. Users ko OK bola tha, lekin data kahin likha hi nahi gaya tha. Ye write-back ki keemat hai. Likes/views ke liye chalta hai (thoda kam ginti), <strong>paise, orders, bookings ke liye kabhi nahi</strong>. Risk kam karne ke liye: chhota flush interval, Redis persistence (AOF), aur replica.', focus: ['db'], set: { db: { state: 'warn', sub: 'likes = 80,800 (purana)' } } },
        ]},
        { name: 'Write-around', intro: 'User ne 2 GB ka log/backup upload kiya. Shayad hi koi use dobara padhe.', steps: [
          { title: 'Write seedha DB mein', text: 'Cache ko chhua hi nahi. Isse cache un cheezon se nahi bharta jo kabhi padhi nahi jaayengi (cache pollution).', go: ['u>app>db', 'res:db>app>u'], set: { cache: { state: 'dim' } } },
          { title: 'Pehli read: miss', text: 'Agar kabhi padha gaya to pehli read miss hogi, phir cache-aside ki tarah bhar jaayega. Dhyaan: agar is key ki koi purani value cache mein pehle se thi, to use delete karna mat bhoolna, warna stale.', go: ['u>app>cache', 'bad:cache>app', 'app>db', 'res:db>app'], set: { cache: { state: 'miss', sub: 'MISS' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: write pe cache UPDATE kar do', html: `Lagta hai "DB mein likha, cache mein bhi nayi value SET kar do, miss bhi nahi hoga". Problem: do writers ek saath. Writer 1 DB mein A likhta hai, writer 2 DB mein B. Lekin cache mein SET ulte order mein pahunche: pehle B, phir A. Ab DB mein B, cache mein A, aur ye galti TTL tak rahegi. <strong>Delete</strong> karne mein order matter nahi karta: dono delete karte hain, agli read DB se sahi value laati hai.` },
    { type: 'callout', tone: 'why', title: 'Pehle DB, phir cache delete. Ulta kyun nahi?', html: `Agar pehle cache delete karo aur phir DB update: beech ke chhote se gap mein koi reader miss karega, DB se <em>purani</em> value padhega aur cache mein bhar dega. DB update ke baad bhi cache mein purana data. Pehle DB, phir delete: gap chhota ho jaata hai (sirf upar wali rare race bachti hai). Kuch teams "delete, update DB, thodi der baad phir delete" (delayed double delete) bhi karti hain.` },

    { type: 'h2', text: 'Memory full: eviction' },
    { type: 'p', html: `Redis RAM mein hai, aur RAM mehngi hai. Jab memory limit (Redis mein <code>maxmemory</code>) aa jaaye aur naya item aaye, kisi purane ko nikaalna padega. Kisko? Ye faisla <strong>eviction policy</strong> karti hai. Achhi policy un items ko rakhti hai jo jaldi phir maange jaayenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: eviction', html: `<strong>Ye kya hai:</strong> cache bhar gaya ho aur naya item aaye, to kisi purane item ko <em>nikaal dena</em> taaki jagah bane.<br><strong>Kyun chahiye:</strong> RAM limited hai. 16 GB mein 200 GB data nahi samata.<br><strong>Iske bina:</strong> cache bharte hi ya to naye items rakh hi nahi paoge (writes pe error), ya memory khatam hoke server crash.<br><strong>Achhi policy kaun si:</strong> jo un items ko bachaaye jo jaldi phir maange jaayenge, aur unhe nikaale jo shayad kabhi nahi maange jaayenge.` },
    { type: 'p', html: `Chaar policies samjhenge. Sabke liye ek hi chhota example: cache mein <strong>3 slots</strong> hain. Requests is order mein aati hain: <code>A B C A D</code> (A, B, C... alag alag posts ki keys hain). Pehle chaar ke baad cache mein A, B, C hain, aur A do baar use ho chuka hai. Ab D aaya, cache full. Kaun niklega?` },
    { type: 'h3', text: 'LRU (Least Recently Used)' },
    { type: 'p', html: `<strong>Niyam:</strong> jo sabse <em>lambe time se</em> use nahi hua, use nikaalo. Soch: "jo haal hi mein dekha, wo phir dekhoge."<br><strong>Example:</strong> aakhri use: A = request 4, B = request 2, C = request 3. Sabse purana use B ka. <strong>B niklega.</strong><br><strong>Andar se:</strong> ek list jisme har use pe item aage aa jaata hai; nikaalna peeche se. Har operation tez (O(1)).<br><strong>Faayda:</strong> zyada tar websites pe sahi chalta hai, trend badle to turant adjust.<br><strong>Nuksaan:</strong> ek bada "scan" (koi job saare purane items ek ek baar padhe) hot items ko bhi nikaal deta hai.` },
    { type: 'h3', text: 'LFU (Least Frequently Used)' },
    { type: 'p', html: `<strong>Niyam:</strong> jo sabse <em>kam baar</em> use hua, use nikaalo. Soch: "jo popular hai, wo popular rahega."<br><strong>Example:</strong> ginti: A = 2, B = 1, C = 1. B aur C barabar; barabari pe jo zyada purana use hua (B). <strong>B niklega.</strong> (Yahan LRU jaisa hi, lekin neeche ke simulator mein farak dikhega.)<br><strong>Faayda:</strong> ek-baar wale scans se popular items bache rehte hain.<br><strong>Nuksaan:</strong> kal ka viral item, jiski ginti bahut badi hai, aaj koi na maange to bhi atka rehta hai. Isliye asli LFU ginti ko time ke saath ghatata (decay) hai.` },
    { type: 'h3', text: 'FIFO (First In, First Out)' },
    { type: 'p', html: `<strong>Niyam:</strong> jo sabse <em>pehle aaya</em> tha, wo pehle jaaye. Use kitna hua, isse farak nahi.<br><strong>Example:</strong> aane ka order: A (1), B (2), C (3). <strong>A niklega</strong>, jabki A abhi abhi use hua tha aur sabse popular hai.<br><strong>Faayda:</strong> sabse simple: bas ek line (queue), koi ginti ya update nahi.<br><strong>Nuksaan:</strong> popular items ko bhi bina soche nikaal deta hai, to hit rate aksar kam.` },
    { type: 'h3', text: 'TTL-based (expiry, aur volatile-ttl)' },
    { type: 'p', html: `TTL do tarah se kaam aata hai. (1) <strong>Expiry:</strong> har key ka timer khatam hote hi key apne aap delete, chahe memory khaali ho. Ye <em>freshness</em> ke liye hai, jagah ke liye nahi. (2) <strong>TTL-based eviction</strong> (Redis mein <code>volatile-ttl</code>): memory full ho to un keys mein se jinpe TTL laga hai, wo nikaalo jiska timer <em>sabse jaldi</em> khatam hone wala hai. Soch: "ye waise bhi jaane wali thi."<br><strong>Example:</strong> A ka TTL 200 s bacha, B ka 30 s, C ka 90 s. D aaya: <strong>B niklega</strong> (sabse kam time bacha).<br><strong>Faayda:</strong> tum TTL se khud batate ho ki kaun kitna zaroori hai.<br><strong>Nuksaan:</strong> popularity nahi dekhta; jin keys pe TTL nahi hai wo kabhi nahi niklengi.` },
    { type: 'callout', tone: 'tip', title: 'Aur bhi policies (ek line mein)', html: `<strong>Random:</strong> koi bhi random key nikaalo; sasta, aur kabhi kabhi hairaan karne layak theek. <strong>ARC</strong> (Adaptive Replacement Cache): recent aur frequent dono lists rakhta hai aur khud tay karta hai kise kitni jagah de. <strong>W-TinyLFU</strong> (Java ki Caffeine library mein): ek chhote "door-keeper" se naye item ki popularity ka andaza lagata hai, aur use tabhi andar aane deta hai jab wo nikalne wale se zyada popular ho. Ye scan aur trend badalne dono ko achhe se sambhalta hai.` },
    { type: 'p', html: `Padhne se zyada chala ke samjho. Neeche ek chhota cache hai (2-4 slots). Requests ek fixed sequence mein aati hain (A, B, C... alag alag posts ki keys hain). Policy badlo, capacity badlo, aur dekho kaun nikalta hai aur hit rate kitna banta hai:` },
    { type: 'custom', render(el) {
      const PRESETS = {
        mix: { name: 'Ek popular post + naye posts', seq: 'A B A C A D A B E A F B A G A B', note: 'A sabse popular hai, B thoda kam, baaki ek-do baar. Capacity 3 pe FIFO peeche reh jaata hai: wo A ko bhi bas isliye nikaal deta hai ki A "pehle aaya tha", chahe abhi abhi use hua ho. LRU aur LFU dono A ko bachaate hain.' },
        scan: { name: 'Beech mein ek scan', seq: 'A B A B A C A B D E F G A B A B', note: 'A aur B hot hain. Beech mein D, E, F, G ek-ek baar aaye (jaise koi report job saare purane posts padh raha ho). Capacity 3 pe LRU in ek-baar wale keys ke liye A aur B ko bhi nikaal deta hai (scan pollution). LFU ko yaad hai ki A, B baar baar aate hain, wo unhe bachaata hai aur jeet-ta hai.' },
        shift: { name: 'Trend badal gaya', seq: 'A A A A B A A C D E D E C D E C', note: 'Pehle A viral tha, phir sab C, D, E dekhne lage. Capacity 3 pe LFU ka A ka count itna bada hai ki A jaata hi nahi, jabki ab koi use nahi maangta. Ek slot bekaar atka rehta hai. LRU turant naye trend ke saath badal jaata hai. Isliye real LFU (jaise Redis ka) purane counts ko time ke saath ghatata (decay) hai.' },
      };
      const POL = { LRU: 'LRU', LFU: 'LFU', FIFO: 'FIFO' };
      let preset = 'mix', pol = 'LRU', cap = 3, i = 0;
      const sim = (seq, n, c, p) => {
        let cache = [], hits = 0, last = null;
        for (let t = 0; t < n; t++) {
          const k = seq[t], e = cache.find(x => x.k === k);
          if (e) { hits++; e.t = t; e.f++; last = { k, hit: true }; continue; }
          let victim = null;
          if (cache.length >= c) {
            let v;
            if (p === 'LRU') v = cache.reduce((a, b) => b.t < a.t ? b : a);
            else if (p === 'FIFO') v = cache.reduce((a, b) => b.ins < a.ins ? b : a);
            else v = cache.reduce((a, b) => (b.f < a.f || (b.f === a.f && b.t < a.t)) ? b : a);
            victim = v; cache = cache.filter(x => x !== v);
          }
          cache.push({ k, t, f: 1, ins: t });
          last = { k, hit: false, victim };
        }
        return { cache, hits, last };
      };
      el.innerHTML = `<div class="csx-row" data-r="preset" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center"><span style="font-size:14px;color:var(--ink-3)">Policy:</span><span class="csx-pol" style="display:flex;gap:8px;flex-wrap:wrap"></span><span style="font-size:14px;color:var(--ink-3);margin-left:6px">Capacity:</span><span class="csx-cap" style="display:flex;gap:8px"></span></div>
        <div class="csx-seq" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px"></div>
        <div style="margin-top:14px;font-size:14px;color:var(--ink-3)">Cache ke slots:</div>
        <div class="csx-slots" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px"></div>
        <div class="csx-log calc-note" style="min-height:2.6em"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary csx-next">Agli request</button>
          <button type="button" class="btn small ghost csx-all">Saari chala do</button>
          <button type="button" class="btn small ghost csx-reset">Reset</button>
        </div>
        <div class="stats"><div class="stat"><span>Hits</span><strong class="csx-h"></strong></div><div class="stat"><span>Misses</span><strong class="csx-m"></strong></div><div class="stat"><span>Hit rate</span><strong class="csx-hr"></strong></div></div>
        <div class="csx-cmp calc-note"></div>
        <div class="csx-note calc-note"></div>`;
      const q = s => el.querySelector(s);
      const chipRow = (box, map, get, set) => {
        box.innerHTML = '';
        Object.keys(map).forEach(k => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = map[k];
          b.setAttribute('aria-pressed', get() === k);
          b.onclick = () => { set(k); i = 0; draw(); };
          box.appendChild(b);
        });
      };
      const draw = () => {
        const P = PRESETS[preset], seq = P.seq.split(' ');
        chipRow(q('[data-r="preset"]'), Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.name])), () => preset, k => preset = k);
        chipRow(q('.csx-pol'), POL, () => pol, k => pol = k);
        chipRow(q('.csx-cap'), { 2: '2', 3: '3', 4: '4' }, () => String(cap), k => cap = Number(k));
        const r = sim(seq, i, cap, pol);
        q('.csx-seq').innerHTML = seq.map((k, t) => {
          let st = 'border:1px solid var(--line);color:var(--ink-3)';
          if (t < i) { const hit = sim(seq, t + 1, cap, pol).last.hit; st = hit ? 'border:2px solid var(--green);color:var(--ink)' : 'border:2px solid var(--red);color:var(--ink)'; }
          if (t === i) st = 'border:2px solid var(--accent);background:var(--accent-soft);color:var(--ink)';
          return `<span style="font:600 14px var(--f-mono);padding:4px 8px;border-radius:var(--r-sm);${st}">${k}</span>`;
        }).join('');
        const meta = c => pol === 'LRU' ? `last use: #${c.t + 1}` : pol === 'LFU' ? `count: ${c.f}` : `aaya: #${c.ins + 1}`;
        const slots = [];
        for (let s = 0; s < cap; s++) {
          const c = r.cache[s];
          slots.push(`<div style="min-width:76px;padding:8px 10px;border-radius:var(--r);border:1px solid var(--cache-s);background:var(--cache-f);text-align:center"><div style="font:700 20px var(--f-mono);color:var(--cache-t)">${c ? c.k : '·'}</div><div style="font-size:12px;color:var(--ink-3)">${c ? meta(c) : 'khaali'}</div></div>`);
        }
        q('.csx-slots').innerHTML = slots.join('');
        const L = r.last;
        q('.csx-log').innerHTML = i === 0 ? '"Agli request" dabao. Hara border = hit, laal = miss.' :
          L.hit ? `Request #${i}: <strong>${L.k}</strong> cache mein mila. <strong>HIT</strong>.` :
          `Request #${i}: <strong>${L.k}</strong> nahi mila. <strong>MISS</strong>, DB se laaya.` + (L.victim ? ` Cache full tha, ${pol} ne <strong>${L.victim.k}</strong> ko nikaala (${pol === 'LRU' ? 'sabse lambe time se use nahi hua tha' : pol === 'LFU' ? 'sabse kam baar use hua tha' : 'sabse pehle aaya tha'}).` : ' Jagah khaali thi, kisi ko nikaalna nahi pada.');
        q('.csx-h').textContent = r.hits;
        q('.csx-m').textContent = i - r.hits;
        q('.csx-hr').textContent = i ? Math.round(100 * r.hits / i) + '%' : '-';
        const all = Object.keys(POL).map(p => ({ p, h: sim(seq, seq.length, cap, p).hits }));
        const best = Math.max(...all.map(a => a.h));
        q('.csx-cmp').innerHTML = `Poora sequence (${seq.length} requests), capacity ${cap}: ` + all.map(a => `${a.p} <strong>${a.h}/${seq.length}</strong>${a.h === best ? ' (best)' : ''}`).join(' · ');
        q('.csx-note').textContent = P.note;
        q('.csx-next').disabled = i >= seq.length;
        q('.csx-all').disabled = i >= seq.length;
      };
      q('.csx-next').onclick = () => { i++; draw(); };
      q('.csx-all').onclick = () => { i = PRESETS[preset].seq.split(' ').length; draw(); };
      q('.csx-reset').onclick = () => { i = 0; draw(); };
      draw();
    }},
    { type: 'p', html: `Seekh: koi policy hamesha nahi jeet-ti. Sab access pattern pe depend karta hai. Zyada tar websites pe "jo abhi dekha, wo phir dekhenge" sach hota hai, isliye <strong>LRU</strong> sabse common default hai. Jahan beech beech mein bade scans aate hain, wahan LFU behtar hai.` },
    { type: 'p', html: `Upar wala simulator LRU, LFU aur FIFO ka tha. TTL ka apna khel neeche hai. Cache mein phir 3 slots. Keys rakho (har ek ka alag TTL), "Ghadi +20 s" se time badhao, aur dekho: (1) timer khatam hote hi key apne aap gayab, (2) cache full hone pe <code>noeviction</code> (Redis ka default) naye write ko <em>error</em> deta hai, jabki <code>volatile-ttl</code> sabse jaldi expire hone wali key nikaal deta hai:` },
    { type: 'custom', render(el) {
      const T = { pol: { noev: 'noeviction (default)', vttl: 'volatile-ttl' }, tick: 'Ghadi +20 s', reset: 'Reset', clock: 'Ghadi', used: 'Slots bhare', none: 'koi TTL nahi', left: 'bache', empty: 'khaali',
        set: (k, t) => `SET ${k}` + (t ? ` (TTL ${t} s)` : ' (TTL nahi)'),
        ok: (k, t) => `${k} rakh di` + (t ? `, ${t} s mein expire hogi.` : `, kabhi expire nahi hogi.`),
        oom: k => `Cache full! <strong>(error) OOM command not allowed when used memory > 'maxmemory'</strong>. ${k} rakhi hi nahi gayi. Redis ka default yahi karta hai, isliye cache ke liye policy badalni padti hai.`,
        oomNoTtl: k => `Cache full, aur kisi bhi key pe TTL nahi hai. volatile-ttl ke paas nikaalne ko kuch nahi: <strong>OOM error</strong>, ${k} nahi rakhi gayi.`,
        ev: (k, v, r) => `Cache full tha. volatile-ttl ne <strong>${v}</strong> nikaali (sirf ${r} s bache the, sabse kam). Phir ${k} rakh di.`,
        exp: l => l.length ? `Ghadi aage badhi: ${l.join(', ')} ka timer khatam, apne aap delete.` : 'Ghadi aage badhi. Koi key expire nahi hui.',
        start: 'Shuru karo: SET A, SET B, SET C. Phir SET D dabao.' };
      const KEYS = [['A', 200], ['B', 30], ['C', 90], ['D', 120], ['E', 0]];
      const CAP = 3;
      el.innerHTML = `<div class="cttl-p" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="cttl-k" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary cttl-t">${T.tick}</button><button type="button" class="btn small ghost cttl-r">${T.reset}</button></div>
        <div class="cttl-slots" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px"></div>
        <div class="stats cttl-st"></div>
        <div class="calc-note cttl-log" style="min-height:2.6em"></div>`;
      const q = s => el.querySelector(s);
      let pol = 'vttl', now, keys, log;
      const reset = () => { now = 0; keys = []; log = T.start; draw(); };
      const sweep = () => { const gone = keys.filter(k => k.exp !== null && k.exp <= now).map(k => k.k); keys = keys.filter(k => k.exp === null || k.exp > now); return gone; };
      const set = (k, t) => {
        sweep();
        const ex = keys.find(x => x.k === k);
        if (ex) { ex.exp = t ? now + t : null; ex.ttl = t; log = T.ok(k, t); return draw(); }
        if (keys.length >= CAP) {
          if (pol === 'noev') { log = T.oom(k); return draw(); }
          const vol = keys.filter(x => x.exp !== null);
          if (!vol.length) { log = T.oomNoTtl(k); return draw(); }
          const v = vol.reduce((a, b) => b.exp < a.exp ? b : a);
          keys = keys.filter(x => x !== v);
          keys.push({ k, exp: t ? now + t : null, ttl: t }); log = T.ev(k, v.k, v.exp - now); return draw();
        }
        keys.push({ k, exp: t ? now + t : null, ttl: t }); log = T.ok(k, t); draw();
      };
      const draw = () => {
        const pb = q('.cttl-p'); pb.innerHTML = '';
        Object.keys(T.pol).forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (p === pol ? ' on' : ''); b.textContent = T.pol[p]; b.setAttribute('aria-pressed', p === pol); b.onclick = () => { pol = p; reset(); }; pb.appendChild(b); });
        const kb = q('.cttl-k'); kb.innerHTML = '';
        KEYS.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = T.set(k, t); b.onclick = () => set(k, t); kb.appendChild(b); });
        let h = '';
        for (let i = 0; i < CAP; i++) {
          const x = keys[i];
          if (!x) { h += `<div style="padding:10px;border-radius:var(--r);border:1px dashed var(--line-2);color:var(--ink-3);text-align:center;font-size:13px">${T.empty}</div>`; continue; }
          const rem = x.exp === null ? null : x.exp - now, pct = rem === null ? 100 : Math.round(100 * rem / x.ttl);
          h += `<div style="padding:10px;border-radius:var(--r);border:1px solid var(--cache-s);background:var(--cache-f);color:var(--cache-t)"><div style="font:700 20px var(--f-mono)">${x.k}</div><div style="font-size:12px;color:var(--ink-3)">${rem === null ? T.none : rem + ' s ' + T.left}</div><div style="height:6px;border-radius:3px;background:var(--line);margin-top:6px"><div style="height:6px;border-radius:3px;width:${pct}%;background:${rem !== null && rem <= 30 ? 'var(--red)' : 'var(--accent)'}"></div></div></div>`;
        }
        q('.cttl-slots').innerHTML = h;
        q('.cttl-st').innerHTML = `<div class="stat"><span>${T.clock}</span><strong>${now} s</strong></div><div class="stat"><span>${T.used}</span><strong>${keys.length} / ${CAP}</strong></div>`;
        q('.cttl-log').innerHTML = log;
      };
      q('.cttl-t').onclick = () => { now += 20; log = T.exp(sweep()); draw(); };
      q('.cttl-r').onclick = reset;
      reset();
    }},
    { type: 'h3', text: 'Asli Redis mein eviction' },
    { type: 'list', items: [
      'Redis ka default <code>maxmemory-policy</code> <strong>noeviction</strong> hai: memory full hone pe naye writes pe error. Cache ke liye isse badal ke <code>allkeys-lru</code> ya <code>allkeys-lfu</code> karna padta hai. Ye bahut log bhool jaate hain.',
      'Redis exact LRU nahi chalata (har key ki linked list memory khaati). Wo kuch random keys ka <strong>sample</strong> (default 5) leta hai aur unme se sabse purani nikaalta hai. Docs ke hisaab se ye real LRU ke kaafi kareeb hai.',
      'Redis ka LFU (version 4.0 se) har key ke liye ek chhota probabilistic counter rakhta hai jo time ke saath <strong>decay</strong> hota hai, taaki "Trend badal gaya" wali problem na ho.',
      '<code>volatile-*</code> policies sirf un keys ko nikaalti hain jin pe TTL laga hai. <code>volatile-ttl</code> sabse jaldi expire hone wali ko pehle nikaalti hai.',
    ]},

    { type: 'h2', text: 'Invalidation: purana data kaise hataayein' },
    { type: 'p', html: `Cache mein copy hai, asli DB mein. Jab asli badle, copy ko "invalid" karna padta hai. Isko <strong>cache invalidation</strong> kehte hain. Iske paanch tareeke hain, aksar milake use hote hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDC (Change Data Capture)', html: `<strong>Ye kya hai:</strong> database har badlaav ek log (diary) mein likhta hai. CDC us diary ko padh ke har badlaav ko ek event bana deta hai: "user 42 badla".<br><strong>Kyun chahiye:</strong> ek alag service in events ko sun ke cache keys delete kar sakti hai. Ab har write path pe delete likhna yaad nahi rakhna padta.<br><strong>Iske bina:</strong> admin panel, background job, doosri service, koi bhi ek jagah delete bhoola, to stale data.<br><strong>Example:</strong> Debezium jaisa tool MySQL/Postgres ka log padh ke Kafka mein events daalta hai.` },
    { type: 'table', head: ['Tareeka', 'Kaise', 'Kab achha', 'Kamzori'], rows: [
      ['TTL expiry', 'Har key pe timer, apne aap expire', 'Hamesha, safety net ke roop mein', 'TTL tak stale; chhota TTL = zyada misses'],
      ['Delete on write', 'Write ke baad app key delete kare', 'Default, cache-aside ke saath', 'Har write path pe yaad rakhna padta hai; ek jagah bhoole = bug'],
      ['Write-through update', 'Write ke saath cache bhi update', 'Jab read-after-write turant chahiye', 'Writes slow; concurrent writes ka order dhyaan se'],
      ['Event-driven (CDC)', 'DB ke change log ko padh ke ek service keys delete kare', 'Bade systems, kai services ek hi data cache karti hon', 'Thoda delay; ek aur pipeline'],
      ['Versioned keys', 'Key mein version: <code>user:42:v8</code>; update pe version badhao', 'Static assets, config, bulk badlav', 'Purane versions TTL/eviction tak memory khaate hain'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Real example', html: `Facebook ne 2013 ke paper "Scaling Memcache at Facebook" mein bataya ki wo look-aside (cache-aside) cache use karte the, write pe key <strong>delete</strong> karte the, aur database ke commit log ko padhne wala ek daemon (mcsqueal) baaki regions/clusters ke caches mein deletes bhejta tha. Ye event-driven invalidation ka classic example hai. Paper purana hai, lekin ideas aaj bhi standard hain.` },

    { type: 'h2', text: 'Cache stampede (thundering herd)' },
    { type: 'p', html: `xyz.com ke homepage ki <code>trending</code> key ko banana mehenga hai: DB pe ek bhaari query, ~300 ms. Isko 2,000 log per second padhte hain. Cache mein hai to sab badhiya. Ab TTL khatam hua. Agle 300 ms mein jo bhi aaya (2,000 × 0.3 = <strong>600 requests</strong>), sabko miss mila, aur <em>sab ke sab</em> wahi bhaari query DB pe chala dete hain. DB slow hua, to query aur lambi chali, to aur requests miss hui. Ek chhota sa expiry DB ko gira sakta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Cache stampede / thundering herd', html: `<strong>Ye kya hai:</strong> ek popular key expire (ya delete) hui, aur usi pal bahut saari requests ko miss mila. Sab ki sab <strong>same cheez</strong> dobara banane database pe daud padti hain. Jaise school ki chhutti ki ghanti pe sab bachche ek hi gate pe.<br><strong>Kyun khatarnak:</strong> database pe ek hi bhaari query sainkdon baar ek saath. DB slow hota hai, query aur lambi, aur zyada requests miss. Ek chhota sa expiry poore DB ko gira sakta hai.<br><strong>Doosra roop:</strong> bahut saari keys ek saath expire hon (jaise sab ek hi time pe cache hui thin).<br><strong>Example:</strong> neeche ka hisaab: 2,000 reads/sec, value banne mein 300 ms = 600 same queries ek saath.` },
    { type: 'p', html: `Teen fixes:` },
    { type: 'list', items: [
      '<strong>Lock / single-flight / request coalescing</strong>: miss hone pe sirf <em>ek</em> request ko DB jaane do. Wo cache mein ek chhota lock lagati hai (<code>SET lock:trending 1 NX PX 5000</code>). Baaki ya to thoda wait karke cache dobara dekhti hain, ya purani (stale) value le leti hain. Facebook ke leases bhi yahi karte the: per key har 10 second mein ek hi token. Paper ke ek test mein peak DB query rate 17K/s se ghat ke 1.3K/s hua.',
      '<strong>Early refresh (refresh-ahead)</strong>: expire hone ka intezaar mat karo. TTL khatam hone se thoda pehle koi ek request (ya background job) value refresh kar de. Probabilistic version (XFetch, VLDB 2015 paper): jitna expiry paas, utni zyada probability ki ye request refresh kare. Ek hi aadmi refresh karta hai, kisi ko wait nahi.',
      '<strong>Jittered TTL</strong>: sab keys ko exactly 300 s TTL mat do. 300 ± 10% random do. Isse 10,000 keys ek saath expire nahi hongi, time mein phail jaayengi.',
    ]},
    { type: 'p', html: `Simulator mein dekho. Upar wala hissa ek hot key ka hai, neeche wala bahut saari keys ka:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Hot key pe requests/sec <input class="cst-q" type="number" value="2000" min="1" step="100"></label></div>
          <div><label>Value banane mein time (ms) <input class="cst-t" type="number" value="300" min="1" step="50"></label></div>
        </div>
        <div class="cst-fix" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>DB pe same query (ek expiry pe)</span><strong class="cst-db"></strong></div>
          <div class="stat"><span>Users jinhe wait karna pada</span><strong class="cst-w"></strong></div>
        </div>
        <div class="cst-note calc-note"></div>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <div class="row2">
          <div><label>Ek saath cache hui keys <input class="cst-n" type="number" value="10000" min="1" step="1000"></label></div>
          <div><label>TTL jitter: <strong class="cst-jv">0%</strong> <input class="cst-j" type="range" min="0" max="20" step="1" value="0"></label></div>
        </div>
        <svg class="cst-svg" viewBox="0 0 360 130" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="Har second kitni keys expire hoti hain"></svg>
        <div class="stats">
          <div class="stat"><span>Ek second mein max expiries (= DB misses)</span><strong class="cst-pk"></strong></div>
          <div class="stat"><span>Expiries kitne seconds mein phaili</span><strong class="cst-sp"></strong></div>
        </div>
        <div class="calc-note">Saari keys t = 0 pe cache hui (jaise deploy ke baad warm-up), base TTL 300 s. Graph 240 s se 360 s tak har second ki expiries dikhata hai.</div>`;
      const q = s => el.querySelector(s);
      let fix = 'none';
      const FIX = { none: 'Koi fix nahi', lock: 'Lock / single-flight', early: 'Early refresh' };
      const box = q('.cst-fix');
      const drawFix = () => {
        box.innerHTML = '';
        Object.keys(FIX).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (fix === k ? ' on' : ''); b.textContent = FIX[k]; b.onclick = () => { fix = k; drawFix(); one(); }; box.appendChild(b); });
      };
      const one = () => {
        const Q = Math.max(1, Number(q('.cst-q').value) || 1), T = Math.max(1, Number(q('.cst-t').value) || 1);
        const inWindow = Math.max(1, Math.round(Q * T / 1000));
        const f = n => n.toLocaleString('en-IN');
        if (fix === 'none') {
          q('.cst-db').textContent = f(inWindow);
          q('.cst-w').textContent = f(inWindow) + ' (har ek ~' + T + ' ms+)';
          q('.cst-note').textContent = `Value banne ke ${T} ms mein ${f(inWindow)} requests aayin, sabko miss, sab DB pe. Asal mein isse bhi bura: itni queries se DB slow hota hai, banane ka time badhta hai, aur window mein aur requests girti hain.`;
        } else if (fix === 'lock') {
          q('.cst-db').textContent = '1';
          q('.cst-w').textContent = f(inWindow) + ' (max ~' + T + ' ms)';
          q('.cst-note').textContent = `Sirf lock jeetne wali request DB gayi. Baaki ${f(inWindow - 1)} ne thoda wait karke cache se value li (ya purani stale value turant le li, agar wo allowed hai). DB bach gaya. Dhyaan: lock pe expiry (PX) zaroori, warna lock lene wala server mar gaya to sab atak jaayenge.`;
        } else {
          q('.cst-db').textContent = '1';
          q('.cst-w').textContent = '0';
          q('.cst-note').textContent = `Expiry se pehle hi ek request ne value refresh kar di. Key kabhi khaali hui hi nahi, to kisi ko miss nahi mila. Keemat: kabhi kabhi aisi keys bhi refresh hoti hain jo shayad dobara maangi hi na jaati.`;
        }
      };
      const many = () => {
        const N = Math.max(1, Math.min(1000000, Math.round(Number(q('.cst-n').value) || 1))), J = Number(q('.cst-j').value) / 100;
        q('.cst-jv').textContent = Math.round(J * 100) + '%';
        let seed = 42;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const bins = new Array(121).fill(0);
        for (let k = 0; k < N; k++) {
          const t = Math.floor(300 * (1 + J * (2 * rnd() - 1)));
          const b = t - 240;
          if (b >= 0 && b <= 120) bins[b]++;
        }
        const peak = Math.max(...bins);
        const used = bins.filter(x => x > 0).length;
        let s = '';
        bins.forEach((v, b) => { const hgt = peak ? (v / peak) * 100 : 0; s += `<rect x="${b * 3}" y="${110 - hgt}" width="2.4" height="${hgt}" fill="var(--accent)"></rect>`; });
        s += `<line x1="0" y1="110.5" x2="363" y2="110.5" stroke="var(--line-2)"></line><text x="0" y="126" font-size="10" fill="var(--ink-3)">240 s</text><text x="180" y="126" font-size="10" fill="var(--ink-3)" text-anchor="middle">300 s</text><text x="360" y="126" font-size="10" fill="var(--ink-3)" text-anchor="end">360 s</text>`;
        q('.cst-svg').innerHTML = s;
        q('.cst-pk').textContent = peak.toLocaleString('en-IN');
        q('.cst-sp').textContent = used + ' s';
      };
      ['.cst-q', '.cst-t'].forEach(c => q(c).addEventListener('input', one));
      ['.cst-n', '.cst-j'].forEach(c => q(c).addEventListener('input', many));
      drawFix(); one(); many();
    }},
    { type: 'p', html: `Jitter 0% pe saari 10,000 keys <strong>ek hi second</strong> mein expire hoti hain: DB pe 10,000 misses ek saath. Jitter 10% karo: expiries ~60 seconds mein phail jaati hain aur peak ~200 per second ke aas paas aa jaata hai. Ek line ka code, 50 guna kam peak.` },

    { type: 'h2', text: 'Hot keys aur stampede, diagram mein' },
    { type: 'callout', tone: 'term', title: 'Naya word: shard (Redis Cluster)', html: `<strong>Ye kya hai:</strong> jab data ek machine mein na samaaye, to use kai machines mein baant dete hain. Har hissa ek <strong>shard</strong>. Redis Cluster key ke naam se ek number (hash) nikaalta hai, aur wahi number tay karta hai ki key kis shard pe rahegi.<br><strong>Kyun chahiye:</strong> zyada data aur zyada traffic ke liye zyada machines.<br><strong>Iske bina:</strong> ek hi Redis machine ki RAM aur CPU hi limit.<br><strong>Dhyaan:</strong> ek key hamesha <em>ek hi</em> shard pe rehti hai. (Sharding ka poora lesson aage aayega.)` },
    { type: 'p', html: `Redis bhi ek machine hai. Redis Cluster mein har key <em>ek</em> shard pe rehti hai. Agar ek key pe poori duniya aa jaaye (cricketer ki post, match ka live score), to wo ek shard 100% CPU pe aur baaki shards khaali. Shard badhane se kuch nahi hoga, key to ek hi jagah hai. Isko <strong>hot key</strong> problem kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Hot key', html: `<strong>Ye kya hai:</strong> ek single key jispe itna traffic aaye ki jis shard pe wo rehti hai, wahi bottleneck ban jaaye.<br><strong>Kyun mushkil:</strong> sharding keys ko baant-ti hai, ek key ke traffic ko nahi. 3 shards ko 30 karne se bhi wo key ek hi shard pe rahegi.<br><strong>Iske bina samjhe:</strong> log shards badhaate rehte hain aur ek shard phir bhi 100% pe.<br><strong>Example:</strong> cricketer ki post <code>post:99</code> pe 5 lakh reads/sec, jabki ek Redis node lagbhag 1 lakh simple ops/sec ke aas paas sambhalta hai.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'users', label: 'Lakhon users', sub: 'same post', x: 80, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com ke lakhon users jo ek hi waqt pe ek hi cheez maang rahe hain: ek celebrity ki post ya trending list.' },
        { id: 'a1', label: 'App server 1', sub: 'local cache', x: 270, y: 75, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka ek app server. Iske andar ek chhota in-process (local) cache hai, 1-5 s TTL ke saath, sirf hot keys ke liye. Local hit pe network hop zero.' },
        { id: 'a2', label: 'App server 2', sub: 'local cache', x: 270, y: 265, w: 150, kind: 'server', info: 'Ye kya hai: doosra app server, bilkul pehle jaisa. Real mein ye 50-500 servers ho sakte hain, aur har ek ka apna local cache.' },
        { id: 'r', label: 'Redis shard', sub: 'post:99 yahin', x: 490, y: 70, w: 140, kind: 'cache', meter: true, load: 30, info: 'Ye kya hai: Redis Cluster ka ek shard (cluster ka ek hissa, ek alag server). Key ke naam ka hash decide karta hai ki key kis shard pe rahegi. post:99 sirf isi shard pe hai, isliye hot key ka saara traffic yahin aata hai.' },
        { id: 'db', label: 'Database', x: 490, y: 270, w: 140, kind: 'data', meter: true, load: 30, info: 'Ye kya hai: source of truth, asli data. Cache miss hone pe sab yahin aate hain, isliye stampede mein yahi girta hai.' },
        { id: 'rep', label: 'Redis replica', sub: 'copy', x: 650, y: 170, w: 120, kind: 'cache', hidden: true, info: 'Ye kya hai: shard ki live copy (read replica). Hot key ke reads replicas mein baante ja sakte hain (thoda replication lag accept karke).' },
      ],
      edges: [{ a: 'users', b: 'a1' }, { a: 'users', b: 'a2' }, { a: 'a1', b: 'r' }, { a: 'a2', b: 'r' }, { a: 'a1', b: 'db' }, { a: 'a2', b: 'db' }, { a: 'r', b: 'rep', id: 'rr', hidden: true, dashed: true }, { a: 'a2', b: 'rep', id: 'a2rep', hidden: true }],
      scenarios: [
        { name: 'Stampede', intro: 'trending key ki TTL abhi abhi khatam hui.', steps: [
          { title: 'Key expire', text: 'Redis mein ab trending nahi hai.', set: { r: { state: 'miss', sub: 'trending: expired' } }, focus: ['r'] },
          { title: 'Sab miss, sab DB pe', text: 'Dono servers ki saari in-flight requests ko miss mila, aur har ek wahi bhaari query chala rahi hai.', flood: { paths: ['users>a1>db', 'users>a2>db'], n: 16 }, after: { db: { state: 'hot', load: 99, sub: '600 same queries!' } } },
          { title: 'Domino', text: 'DB slow, query lambi, window lambi, aur requests miss. Kabhi kabhi DB timeout karta hai aur value kabhi cache mein pahunchti hi nahi. Ye loop khud se nahi tootta.', focus: ['db'] },
        ]},
        { name: 'Fix: lock (single-flight)', steps: [
          { title: 'Key expire', set: { r: { state: 'miss', sub: 'trending: expired' } }, text: 'Same situation.', focus: ['r'] },
          { title: 'Server 1 lock jeet-ta hai', text: 'Sirf ek request ko lock mila. Wahi DB jaayegi.', go: ['a1>r', 'res:r>a1'], msg: 'SET lock:trending 1 NX PX 5000  →  OK', after: { a1: { state: 'ok', sub: 'lock mila' } } },
          { title: 'Baaki ruk jaate hain', text: 'Server 2 ko lock nahi mila. Wo 50 ms baad cache phir dekhega (ya stale copy de dega).', go: ['a2>r', 'bad:r>a2'], msg: 'SET lock:trending 1 NX PX 5000  →  (nil)', after: { a2: { state: 'warn', sub: 'wait / stale' } } },
          { title: 'Sirf EK DB query', go: ['a1>db', 'res:db>a1', 'a1>r'], text: 'Value bani aur cache mein rakh di. DB pe 600 ki jagah 1 query.', after: { r: { state: 'hit', sub: 'trending: fresh' }, db: { load: 32 } } },
          { title: 'Sab ko cache se', parallel: true, go: ['a2>r', 'res:r>a2'], text: 'Waiting requests ab hit pe.', after: { a2: { state: '', sub: 'hit' }, a1: { state: '', sub: 'local cache' } } },
        ]},
        { name: 'Hot key', intro: 'Ek cricketer ki post (post:99) viral. 5 lakh reads/sec ek key pe.', steps: [
          { title: 'Saare reads ek shard pe', text: 'Dono app servers post:99 ek hi Redis shard se maang rahe hain.', flood: { paths: ['users>a1>r', 'users>a2>r'], n: 16 }, after: { r: { state: 'hot', load: 100, sub: 'CPU 100%' } } },
          { title: 'Shard choke', text: 'Ek Redis node roughly 1 lakh+ simple ops/sec karta hai. 5 lakh nahi. Latency badhi, timeouts shuru. Baaki shards pe CPU 10%.', go: 'lost:a2>r' },
        ]},
        { name: 'Fix: local cache + replicas', steps: [
          { title: 'Local cache (2 second TTL)', text: 'Har app server post:99 ko apni memory mein 2 second ke liye rakh leta hai. 500 servers ho to Redis pe max ~250 reads/sec (500 ÷ 2 s), 5 lakh nahi. Keemat: max 2 second stale.', set: { a1: { state: 'hit', sub: 'local hit' }, a2: { state: 'hit', sub: 'local hit' } }, flood: { paths: ['users>a1', 'users>a2'], n: 12 }, after: { r: { state: '', load: 25, sub: 'aaram' } } },
          { title: 'Replicas / key splitting', text: 'Doosra tareeka: key ki copies. Ya to shard ke read replicas se padho, ya key ko <code>post:99#1 ... post:99#8</code> naam se 8 copies mein rakho (alag shards pe), aur har read random copy pe bhejo. Write pe saari copies update karni padti hain.', show: ['rep', 'rr', 'a2rep'], go: ['a2>rep', 'res:rep>a2'], after: { rep: { state: 'hit' } } },
          { title: 'Hot key pehchaanein kaise?', text: 'Redis mein <code>redis-cli --hotkeys</code> (sirf LFU policy pe chalta hai), client-side metrics, ya proxy-level sampling. Bade platforms detection ko automatic karte hain: key hot hui to apne aap local cache mein daal do.', focus: ['r'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', html: `Jo cheez sabke liye same hai aur thodi der stale chal sakti hai (live score JSON, trending list), use <strong>CDN</strong> pe 1-2 second ke TTL ke saath rakh do. Phir hot key ka traffic tumhare servers tak pahunchta hi nahi. Ye agle lesson ka topic hai.` },
    { type: 'p', html: `<strong>Hot key ka hisaab khud lagao.</strong> Local cache ka TTL aur key ki copies badlo, aur dekho shard pe kitna load bachta hai aur keemat (kitna purana data) kya hai:` },
    { type: 'custom', render(el) {
      const T = { r: 'Hot key pe reads/sec', n: 'App servers', l: 'Local cache TTL (s), 0 = band', k: 'Key ki copies (splitting)',
        redis: 'Redis pe us key ke reads/sec', shard: 'Har shard pe load', stale: 'Max kitna purana', ok: 'Shard theek hai', bad: 'Shard overload!',
        none: '0 s', note: (cap) => `Maan ke chale: ek Redis shard ~${cap.toLocaleString('en-IN')} simple ops/sec sambhalta hai. Local cache ke saath har app server har TTL mein sirf ek baar Redis se poochhta hai, to Redis pe reads = servers ÷ TTL.` };
      const CAP = 100000;
      el.innerHTML = `<div class="row2">
        <div><label>${T.r} <input class="chk-r" type="number" value="500000" min="1" step="10000"></label></div>
        <div><label>${T.n} <input class="chk-n" type="number" value="500" min="1" step="10"></label></div>
        <div><label>${T.l}: <strong class="chk-lv"></strong><input class="chk-l" type="range" min="0" max="10" step="1" value="0"></label></div>
        <div><label>${T.k}: <strong class="chk-kv"></strong><input class="chk-k" type="range" min="1" max="8" step="1" value="1"></label></div>
      </div>
      <div class="stats"><div class="stat"><span>${T.redis}</span><strong class="chk-o1"></strong></div><div class="stat"><span>${T.shard}</span><strong class="chk-o2"></strong></div><div class="stat"><span>${T.stale}</span><strong class="chk-o3"></strong></div></div>
      <div class="calc-note chk-st" style="font-weight:600"></div>
      <div class="calc-note">${T.note(CAP)}</div>`;
      const q = s => el.querySelector(s), f = n => Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const R = Math.max(1, Number(q('.chk-r').value) || 1), N = Math.max(1, Number(q('.chk-n').value) || 1), Lt = Number(q('.chk-l').value), K = Number(q('.chk-k').value);
        q('.chk-lv').textContent = Lt; q('.chk-kv').textContent = K;
        const toRedis = Lt > 0 ? Math.min(R, N / Lt) : R, per = toRedis / K;
        q('.chk-o1').textContent = f(toRedis); q('.chk-o2').textContent = f(per); q('.chk-o3').textContent = Lt ? Lt + ' s' : T.none;
        const st = q('.chk-st'); st.textContent = per > CAP ? T.bad : T.ok; st.style.color = per > CAP ? 'var(--red)' : 'var(--green)';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default pe (koi fix nahi) 5,00,000 reads ek shard pe: overload. Sirf key ki 8 copies: har shard pe 62,500, theek. Sirf local cache 2 s: 500 servers ÷ 2 = <strong>250</strong> reads/sec Redis pe, aur keemat bas 2 second purana data.` },

    { type: 'h2', text: 'Cache warming' },
    { type: 'p', html: `Naya Redis cluster laga, ya restart hua, ya ek naya region khula: cache <strong>khaali</strong> (cold) hai. Pehle kuch minute har request miss hogi, aur DB pe poora traffic. Agar DB itna jhel nahi sakta, to cache ke bina site gir jaayegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Cache warming', html: `<strong>Ye kya hai:</strong> traffic aane se <em>pehle</em> cache ko sabse zaroori keys se bhar dena. Khaali cache ko "cold" aur bhare hue ko "warm" kehte hain.<br><strong>Kyun chahiye:</strong> cold cache = har request miss = poora traffic database pe.<br><strong>Iske bina:</strong> restart ya naya cluster aate hi pehle kuch minute DB pe baadh, aur shayad DB gir jaaye.<br><strong>Example:</strong> IPL match shuru hone se pehle match page, score aur team pages cache mein daal dena.` },
    { type: 'list', items: [
      '<strong>Top keys ka replay</strong>: kal ke logs se top 1 lakh keys nikaalo aur ek script se unhe pehle hi load kar do.',
      '<strong>Dheere dheere traffic shift</strong>: naye cluster pe pehle 1% traffic, phir 10%, phir 100%. Har step pe cache garam hota jaata hai.',
      '<strong>Persistence</strong>: Redis apna data disk pe bhi likh sakta hai: RDB (har kuch der ka poora snapshot) ya AOF (har write ki diary). Restart ke baad wo data wapas load ho jaata hai, to restart pe cold start nahi.',
      '<strong>Dhyaan</strong>: warm karte waqt sab keys ko same TTL mat do (stampede wala simulator yaad karo). Aur sab kuch warm mat karo, sirf jo sach mein hot hai.',
    ]},
    { type: 'p', html: `<strong>Cold start ko mehsoos karo.</strong> Neeche ek chhota model hai: cache restart hua. Bina warming ke hit rate 0 se shuru hota hai aur dheere dheere upar jaata hai. Warming slider se batao ki shuru mein kitna cache pehle se bhara tha:` },
    { type: 'custom', render(el) {
      const T = { q: 'Requests/sec', c: 'DB capacity (queries/sec)', w: 'Pehle se warm', over: 'DB overload kitni der', peak: 'DB pe peak load', ax: ['0 s', '150 s', '300 s'], cap: 'DB capacity',
        note: 'Toy model: steady hit rate 95%, cache ~30 s ke time-constant se bharta hai: hit(t) = 95% × (1 − (1 − warm) × e^(−t/30)). Asli numbers tumhare traffic pe depend karenge, lekin shape yahi hoti hai.' };
      el.innerHTML = `<div class="row2">
        <div><label>${T.q} <input class="cw-q" type="number" value="50000" min="1" step="1000"></label></div>
        <div><label>${T.c} <input class="cw-c" type="number" value="5000" min="1" step="500"></label></div>
        <div><label>${T.w}: <strong class="cw-wv"></strong><input class="cw-w" type="range" min="0" max="100" step="5" value="0"></label></div>
      </div>
      <svg class="cw-svg" viewBox="0 0 360 140" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="DB load over time"></svg>
      <div class="stats"><div class="stat"><span>${T.over}</span><strong class="cw-o"></strong></div><div class="stat"><span>${T.peak}</span><strong class="cw-p"></strong></div></div>
      <div class="calc-note">${T.note}</div>`;
      const q = s => el.querySelector(s), H = 0.95, TAU = 30;
      const upd = () => {
        const Q = Math.max(1, Number(q('.cw-q').value) || 1), C = Math.max(1, Number(q('.cw-c').value) || 1), w = Number(q('.cw-w').value) / 100;
        q('.cw-wv').textContent = Math.round(w * 100) + '%';
        const load = []; let over = 0;
        for (let t = 0; t <= 300; t++) { const l = Q * (1 - H * (1 - (1 - w) * Math.exp(-t / TAU))); load.push(l); if (t < 300 && l > C) over++; }
        const peak = load[0], top = Math.max(peak, C) * 1.1, Y = v => 110 - 100 * v / top;
        let s = `<line x1="0" y1="${Y(C).toFixed(1)}" x2="360" y2="${Y(C).toFixed(1)}" stroke="var(--red)" stroke-dasharray="4 3"></line><text x="356" y="${(Y(C) - 4).toFixed(1)}" font-size="10" text-anchor="end" fill="var(--red)">${T.cap}</text>`;
        s += `<polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${load.map((v, t) => (t * 1.2).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"></polyline>`;
        s += `<line x1="0" y1="110.5" x2="360" y2="110.5" stroke="var(--line-2)"></line><text x="0" y="126" font-size="10" fill="var(--ink-3)">${T.ax[0]}</text><text x="180" y="126" font-size="10" text-anchor="middle" fill="var(--ink-3)">${T.ax[1]}</text><text x="360" y="126" font-size="10" text-anchor="end" fill="var(--ink-3)">${T.ax[2]}</text>`;
        q('.cw-svg').innerHTML = s;
        q('.cw-o').textContent = over + ' s';
        q('.cw-p').textContent = Math.round(peak).toLocaleString('en-IN') + '/s';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Bina warming (0%): DB pe shuru mein poore 50,000/s, aur ~89 second tak capacity (5,000/s) se upar. 80% warm: peak 12,000/s, ~41 second. 95% warm: peak ~4,875/s, DB kabhi capacity ke upar nahi jaata.` },

    { type: 'h2', text: 'Redis vs Memcached' },
    { type: 'p', html: `Dono in-memory key-value stores hain, dono bahut fast. Farak features mein hai:` },
    { type: 'table', head: ['', 'Redis', 'Memcached'], rows: [
      ['Data types', 'Strings, hashes, lists, sets, sorted sets, streams, geo, HyperLogLog...', 'Sirf key → bytes (blob)'],
      ['Threads', 'Commands ek main thread pe chalte hain (isliye har command atomic). Version 6 se network I/O ke liye extra threads.', 'Poori tarah multithreaded; bade multi-core machine pe ek process se zyada throughput'],
      ['Persistence', 'Haan: RDB snapshots aur AOF log', 'Nahi. Restart = khaali cache'],
      ['Replication / HA', 'Replicas, Sentinel (auto failover), Redis Cluster (16,384 hash slots mein sharding)', 'Built-in nahi. Client library consistent hashing se keys servers mein baant-ti hai'],
      ['Value size', 'String 512 MB tak', 'Default max item 1 MB (config se badha sakte hain)'],
      ['Extra', 'Lua scripts, transactions, pub/sub, atomic counters, rate limiting, leaderboards', 'Simple get/set/delete, TTL, CAS'],
      ['Eviction', 'Configurable policies (default noeviction, cache ke liye badlo)', 'LRU based (cache hi uska kaam hai)'],
      ['License', 'Redis 7.4 (2024) se source-available licenses; Redis 8 (2025) mein AGPLv3 option bhi. Valkey: Linux Foundation ka BSD-licensed fork', 'BSD, open source'],
    ]},
    { type: 'callout', tone: 'why', title: 'To kaunsa?', html: `Aaj zyada tar teams <strong>Redis (ya Valkey)</strong> chunti hain, kyunki cache ke saath saath sessions, counters, leaderboards, rate limiting, locks sab ek hi tool se ho jaate hain. <strong>Memcached</strong> tab achha hai jab sirf simple blob caching chahiye, bahut bade multi-core machines pe, aur persistence/data types ki zaroorat nahi. Facebook ne bade scale pe Memcached chalaya; isliye wo "purana" nahi, bas focused hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Redis mein persistence hai, to Redis ko database bana lete hain." Redis by default asynchronously disk pe likhta hai, to crash pe last kuch second ka data ja sakta hai. Cache ke liye ye bilkul theek hai. Lekin orders ya paise ka source of truth Redis ko banana ek alag, soch-samajh ke liya gaya faisla hona chahiye, default nahi.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Default rule', html: `Default: <strong>cache-aside + TTL</strong>, write pe key delete. Cache tab lagao jab reads writes se kaafi zyada hon (10:1 ya zyada), data kuch second stale chal sake, aur same items baar baar maange jaayein. Bank balance jo abhi debit karna hai, use cache mat karo. Product pages, profiles, trending lists, haan.` },
    { type: 'table', head: ['Situation', 'Answer'], caption: 'Roadmap ki "Do I need a cache? Which strategy?" table', rows: [
      ['Read-heavy (10:1 ya zyada), same items baar baar, thoda stale chalega', 'Haan: cache-aside + TTL'],
      ['Mehngi computation jo reuse hoti hai (feed, recommendations, search results)', 'Haan: computed result cache karo'],
      ['User ko apna write turant dikhna chahiye', 'Write-through, ya write pe cache key delete'],
      ['Bahut write-heavy counters (views, likes)', 'Write-back: Redis mein gino, DB mein batch flush (thoda loss risk accept)'],
      ['Long-tail access, har key ek hi baar maangi jaati hai', 'Shayad nahi; hit rate kam rahega'],
      ['Strictly sahi values (debit se pehle balance, checkout pe seat)', 'Source of truth se padho; cache sirf display ke liye'],
      ['Ek key pe lakhon hits (celebrity post, match score)', 'Hot key replicate karo, local in-process cache, ya CDN pe daalo'],
    ]},

    { type: 'diagram', title: 'Cache strategies: poori picture', height: 610,
      groups: [
        { label: 'Users + edge', x: 20, y: 14, w: 680, h: 216 },
        { label: 'App', x: 230, y: 244, w: 260, h: 80 },
        { label: 'Cache + data', x: 20, y: 356, w: 680, h: 96 },
        { label: 'Background jobs', x: 20, y: 492, w: 690, h: 106 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'xyz.com app', x: 360, y: 60, w: 160, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Unki reads (post, profile, score) aur writes (like, edit) alag alag strategies se chalti hain.' },
        { id: 'cdn', label: 'CDN edge', sub: 'score JSON, 2 s', x: 140, y: 175, w: 160, kind: 'edge', info: 'Ye kya hai: user ke shehar ke paas ka cache server (agla lesson). Jo sabke liye same hai (live score, trending) wo 1-2 s TTL ke saath yahin se. Hot key ka traffic tumhare servers tak aata hi nahi.' },
        { id: 'app', label: 'App servers', sub: 'local cache: hot keys', x: 360, y: 284, w: 190, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Cache-aside logic yahan: read pe Redis, miss pe DB. Write pe DB update + key delete. Hot keys ke liye 1-2 s ka local (in-process) cache. Stampede se bachne ke liye lock / early refresh.' },
        { id: 'redis', label: 'Redis cluster', sub: 'LRU/LFU + TTL', x: 150, y: 414, w: 170, kind: 'cache', info: 'Ye kya hai: shared distributed cache, kai shards mein. maxmemory pe eviction policy (allkeys-lru ya allkeys-lfu), har key pe jitter wala TTL. Likes jaise counters yahan write-back style mein INCR hote hain.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 570, y: 414, w: 170, kind: 'data', info: 'Ye kya hai: asli data. Misses aur writes yahan aate hain. Har strategy ka maqsad iska load kam rakhna hai, lekin sach yahin rehta hai.' },
        { id: 'rep', label: 'Redis replica', sub: 'failover, reads', x: 100, y: 548, w: 150, kind: 'cache', info: 'Ye kya hai: Redis shard ki live copy. Primary gire to jagah leti hai; hot key ke reads bhi isme baante ja sakte hain (thoda lag accept karke).' },
        { id: 'warm', label: 'Warm-up job', sub: 'top keys', x: 272, y: 548, w: 150, kind: 'queue', info: 'Ye kya hai: ek script jo restart ya bade event (IPL final) se pehle top keys Redis mein bhar deti hai, jitter wale TTL ke saath. Cold start pe DB nahi doobta.' },
        { id: 'flush', label: 'Flush job', sub: 'write-back', x: 448, y: 548, w: 150, kind: 'queue', info: 'Ye kya hai: background job jo har ~10 s Redis ke jama counters (likes, views) DB mein ek batch write mein daalta hai. Flush se pehle Redis gira to wo hissa kho sakta hai.' },
        { id: 'cdc', label: 'CDC invalidator', sub: 'DB log → DEL', x: 622, y: 548, w: 150, kind: 'queue', info: 'Ye kya hai: database ke change log ko padhne wali service. Har badlaav pe Redis se us key ko delete karti hai, taaki koi write path delete karna bhool bhi jaaye to stale data na rahe.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', label: 'live score' },
        { a: 'cdn', b: 'app', dashed: true, label: 'miss' },
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'redis', n: 2, label: 'GET / SET' },
        { a: 'app', b: 'db', n: 3, label: 'miss / write' },
        { a: 'redis', b: 'rep', dashed: true },
        { a: 'warm', b: 'redis', kind: 'evt' },
        { a: 'redis', b: 'flush', kind: 'evt' },
        { a: 'flush', b: 'db', kind: 'evt' },
        { a: 'db', b: 'cdc', kind: 'evt' },
        { a: 'cdc', b: 'redis', kind: 'evt', label: 'DEL key', via: [[680, 478], [250, 478]] },
      ],
      paths: [
        { name: 'Read (cache-aside)', text: 'Redis mein dekha; miss pe DB se laaye aur TTL ke saath SET kiya.', go: ['users>app>redis', 'app>db'] },
        { name: 'Write + invalidate', text: 'DB update hua. App ne key delete ki, aur CDC ne bhi DB log dekh ke delete bheja (safety net).', go: ['users>app>db', 'db>cdc>redis'] },
        { name: 'Like (write-back)', text: 'Like sirf Redis mein INCR, turant OK. Flush job har 10 s ek batch write DB mein.', go: ['users>app>redis', 'redis>flush>db'] },
        { name: 'Live score + restart', text: 'Score CDN se (2 s TTL). Redis restart pe warm-up job top keys pehle hi bhar deta hai.', go: ['users>cdn', 'warm>redis>rep'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Cache kai layers mein: browser, CDN, app ki local memory, Redis. Jitna paas, utna tez, utna kam control.</li>
      <li>Default: cache-aside + TTL. Write pe pehle DB, phir key <strong>delete</strong> (update nahi).</li>
      <li>Write-through = cache hamesha taaza, writes slow. Write-back = writes super tez, crash pe data loss (sirf counters ke liye). Write-around = jo likha wo cache mein nahi.</li>
      <li>Eviction: LRU (sabse purana use), LFU (sabse kam use), FIFO (sabse pehle aaya), volatile-ttl (sabse jaldi expire). Redis ka default noeviction hai: cache ke liye badlo.</li>
      <li>TTL hamesha lagao: freshness ka safety net. Jitter lagao taaki sab keys ek saath expire na hon.</li>
      <li>Stampede: lock / single-flight, early refresh, jitter. Hot key: local cache, replicas, key splitting, CDN.</li>
      <li>Restart se pehle warming; invalidation ke liye CDC ek jagah se.</li>
      <li>Redis = features (data types, persistence, replication). Memcached = simple, multithreaded blob cache.</li>
    </ul>` },
    { type: 'tradeoffs', gains: [
      'Sahi strategy se reads 10x+ fast aur DB pe load bahut kam',
      'Write-back se counters jaisi heavy writes 1000 guna kam',
      'Lock / early refresh / jitter se expiry pe DB surakshit',
      'Local cache + replicas se hot keys bhi sambhal jaati hain',
    ], costs: [
      'Har strategy ke saath stale data ka koi na koi window',
      'Write-back mein crash = acknowledged data loss',
      'Invalidation code har write path pe; ek jagah bhoole to bug',
      'Local caches = kai copies, sab thodi alag ho sakti hain',
      'Ek aur system jise monitor, scale aur fail-over karna hai',
    ]},
    { type: 'think', questions: [
      { q: 'xyz.com ka "comments count" har comment pe badalta hai, aur har page view pe dikhta hai. Kaunsi strategy?', a: 'Display ke liye exact count zaroori nahi. Redis mein INCR (write-back style) aur periodic DB flush, ya DB mein count rakho aur cache-aside chhote TTL (jaise 30 s) ke saath. Agar count se koi paisa ya limit tay hoti hai (jaise "100 comments ke baad band"), tab DB se hi check karo.' },
      { q: 'Tumne TTL 1 ghanta rakha aur write pe delete bhi karte ho. Phir bhi kabhi kabhi stale data ghanta bhar dikhta hai. Kya ho sakta hai?', a: 'Shayad cache-aside wali race: ek slow reader ne delete ke baad purani value SET kar di. Ya koi write path (admin panel, background job, doosri service) delete karna bhool gaya. Fix: TTL chhota karo, saare write paths se invalidation ek jagah (CDC) se karo, ya leases/versioned values use karo.' },
      { q: 'IPL final 7:30 pe shuru hoga. Cache ke hisaab se 7:00 se pehle kya karoge?', a: 'Match page, score JSON aur team pages ko cache mein warm karo (jitter wali TTLs ke saath), score ko CDN pe 1-2 s TTL pe daalo, hot keys ke liye local cache on karo, aur in keys pe lock/early refresh lagao taaki expiry pe stampede na ho.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Cache-aside mein write ka sahi order?', options: ['Cache update, phir DB update', 'DB update, phir cache key delete', 'Cache delete, kuch mat karo DB mein'], answer: 1, explain: 'Pehle source of truth. Phir delete (update nahi), taaki concurrent writes cache mein ulta order na bana sakein.' },
      { q: 'Kis strategy mein crash pe "OK" mil chuke writes kho sakte hain?', options: ['Write-through', 'Write-around', 'Write-back'], answer: 2, explain: 'Write-back mein data kuch der sirf cache mein hota hai. Flush se pehle crash = loss.' },
      { q: 'Ek report job saare purane posts ek baar padhta hai, aur uske baad cache ka hit rate gir jaata hai. Kaunsi policy isse behtar bachaati hai?', options: ['LRU', 'LFU', 'FIFO'], answer: 1, explain: 'Scan ke ek-baar wale keys recent hain, isliye LRU unke liye hot keys nikaal deta hai. LFU frequency dekhta hai aur hot keys bachata hai.' },
      { q: '10,000 keys ek saath 300 s TTL ke saath cache hui. 300 s pe DB pe spike. Sabse simple fix?', options: ['TTL ko 3000 s karo', 'TTL mein random jitter', 'Redis ka size double'], answer: 1, explain: 'Lambi TTL bas spike ko aage khiskaati hai. Jitter expiries ko time mein phaila deta hai.' },
      { q: 'Redis cache bhar gaya aur policy badli hi nahi (default). Naya SET aaya. Kya hoga?', options: ['Sabse purani key apne aap niklegi', 'Write pe OOM error aayega', 'Redis disk pe likhne lagega'], answer: 1, explain: 'Default maxmemory-policy noeviction hai: memory full pe naye writes error dete hain. Cache ke liye allkeys-lru ya allkeys-lfu set karo.' },
      { q: 'Ek key pe 5 lakh reads/sec. Redis Cluster mein shards 3 se 30 kar diye. Kya hoga?', options: ['Load 10 guna kam', 'Kuch khaas nahi, key abhi bhi ek shard pe hai', 'Key apne aap split ho jaayegi'], answer: 1, explain: 'Sharding keys baant-ta hai, ek key ka traffic nahi. Local cache, replicas ya key splitting chahiye.' },
    ]},
    { type: 'sources', note: 'Facts aur numbers inse check kiye gaye.', items: [
      { title: 'Key eviction', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/reference/eviction/', used: 'Eviction policies, noeviction default, sampled approximate LRU (maxmemory-samples 5), LFU since 4.0 with decay.' },
      { title: 'Scaling Memcache at Facebook (NSDI 2013)', publisher: 'USENIX / Meta', official: true, url: 'https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf', used: 'Look-aside cache, delete on write, leases for stale sets and thundering herds (one token per key per 10 s, peak 17K/s → 1.3K/s), mcsqueal invalidation.' },
      { title: 'Optimal Probabilistic Cache Stampede Prevention (VLDB 2015)', publisher: 'Vattani, Chierichetti, Lowenstein', url: 'https://www.vldb.org/pvldb/vol8/p886-vattani.pdf', used: 'Probabilistic early expiration (XFetch) idea.' },
      { title: 'Efficiency (W-TinyLFU)', publisher: 'Caffeine wiki (Ben Manes)', url: 'https://github.com/ben-manes/caffeine/wiki/Efficiency', used: 'Caffeine W-TinyLFU policy use karti hai: admission filter jo naye item ki popularity ka andaza lagata hai.' },
      { title: 'EXPIRE command: how Redis expires keys', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/expire/', used: 'Lazy aur active expiry; volatile keys ka matlab.' },
      { title: 'memcached(1) manual page', publisher: 'memcached', url: 'https://manpages.ubuntu.com/manpages/focal/man1/memcached.1.html', used: 'Default 1 MB max item size (-I), threads option.' },
      { title: 'Redis 8.0 released, now tri-licensed with AGPLv3', publisher: 'Phoronix', url: 'https://www.phoronix.com/news/Redis-8.0-Goes-AGPLv3', used: 'Redis license history (2024 source-available, 2025 AGPLv3 option) and Valkey fork context.' },
    ]},
  ],
});
