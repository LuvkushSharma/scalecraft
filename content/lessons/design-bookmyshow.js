(function () {
  /* ---------- pure helpers (exported as _test for the verification script) ---------- */
  // Seat-hold simulator. Time unit = 1 minute. 2 rows x 8 seats, 8 bots + 'You'.
  const BMS_SEATS = [];
  ['A', 'B'].forEach((r, ri) => { for (let c = 1; c <= 8; c++) BMS_SEATS.push({ id: r + c, row: r, col: c, score: ri * 1.5 + Math.abs(c - 4.5) }); });
  const BMS_BOTS = [
    { u: 'U1', at: 0, k: 2, pay: 3 },
    { u: 'U2', at: 0, k: 2, pay: 2 },
    { u: 'U3', at: 1, k: 3, pay: null },
    { u: 'U4', at: 2, k: 2, pay: 6 },
    { u: 'U5', at: 3, k: 2, pay: 1 },
    { u: 'U6', at: 6, k: 2, pay: 2 },
    { u: 'U7', at: 7, k: 4, pay: 4 },
    { u: 'U8', at: 8, k: 2, pay: 1 },
  ];
  function bmsInit(ttl, naive) {
    const st = { m: 0, ttl, naive, seats: {}, holds: [], log: [], stats: { conflicts: 0, expired: 0, refunds: 0, booked: 0 }, bots: BMS_BOTS.map(b => Object.assign({ next: b.at, tries: 0 }, b)) };
    BMS_SEATS.forEach(s => { st.seats[s.id] = { holds: [], booked: [] }; });
    bmsProcess(st);
    return st;
  }
  const live = (st, h) => h.state === 'HELD' && h.exp > st.m;
  function seatFree(st, id) { const s = st.seats[id]; return !s.booked.length && !st.holds.some(h => live(st, h) && h.seats.includes(id)); }
  function pick(st, k, freeFn) {
    let best = null;
    ['A', 'B'].forEach(r => { for (let c = 1; c + k - 1 <= 8; c++) {
      const ids = []; let sc = 0, ok = true;
      for (let j = c; j < c + k; j++) { const s = BMS_SEATS.find(x => x.id === r + j); ids.push(s.id); sc += s.score; if (!freeFn(s.id)) ok = false; }
      if (ok && (!best || sc < best.sc)) best = { ids, sc };
    } });
    return best && best.ids;
  }
  function tryHold(st, user, ids, snapFree) {
    const ok = ids.every(id => st.naive ? snapFree[id] : seatFree(st, id));
    if (!ok) { st.stats.conflicts++; st.log.push({ m: st.m, t: 'bad', s: `${user}: ${ids.join(',')} hold FAIL (koi seat pehle hi held/booked) → 409` }); return null; }
    const h = { user, seats: ids, at: st.m, exp: st.m + st.ttl, state: 'HELD' };
    st.holds.push(h);
    st.log.push({ m: st.m, t: 'ok', s: `${user}: ${ids.join(',')} HELD, expiry minute ${h.exp}` });
    return h;
  }
  function payHold(st, h) {
    if (st.naive || live(st, h)) {
      h.state = 'BOOKED'; h.seats.forEach(id => st.seats[id].booked.push(h.user)); st.stats.booked += h.seats.length;
      st.log.push({ m: st.m, t: 'ok', s: `${h.user}: payment OK → ${h.seats.join(',')} BOOKED` });
      return true;
    }
    st.stats.refunds++;
    st.log.push({ m: st.m, t: 'bad', s: `${h.user}: payment aaya lekin hold expire ho chuka → refund` });
    return false;
  }
  function bmsProcess(st) {
    // 1. expiry
    st.holds.forEach(h => { if (h.state === 'HELD' && h.exp <= st.m) { h.state = 'EXPIRED'; st.stats.expired++; st.log.push({ m: st.m, t: 'warn', s: `${h.user}: hold expire, ${h.seats.join(',')} wapas free` }); } });
    // 2. bot payments due
    st.bots.forEach(b => { if (b.h && b.pay != null && b.h.at + b.pay === st.m && b.h.state !== 'BOOKED') payHold(st, b.h); });
    // 3. arrivals / retries: sab ek hi snapshot dekhte hain
    const snapFree = {}; BMS_SEATS.forEach(s => { snapFree[s.id] = seatFree(st, s.id); }); st.snap = snapFree;
    st.bots.filter(b => b.next === st.m && !b.h).forEach(b => {
      const ids = pick(st, b.k, id => snapFree[id]);
      if (!ids) { b.next = null; st.log.push({ m: st.m, t: 'warn', s: `${b.u}: ${b.k} saath wali seats nahi bachi, chala gaya` }); return; }
      const h = tryHold(st, b.u, ids, snapFree);
      if (h) b.h = h; else if (++b.tries < 3) b.next = st.m + 1; else b.next = null;
    });
  }
  function bmsStep(st) { st.m++; bmsProcess(st); return st; }
  function bmsView(st) {
    const out = {};
    BMS_SEATS.forEach(s => {
      const x = st.seats[s.id];
      const hs = st.holds.filter(h => live(st, h) && h.seats.includes(s.id)).map(h => h.user);
      out[s.id] = x.booked.length ? { st: 'BOOKED', who: x.booked } : hs.length ? { st: 'HELD', who: hs } : { st: 'FREE', who: [] };
    });
    return out;
  }
  function bmsDouble(st) { return BMS_SEATS.filter(s => st.seats[s.id].booked.length > 1).length; }
  // Waiting room maths
  function wrCalc(queue, tickets, perOrder, conv, rate) {
    const orders = tickets / perOrder, admitNeeded = orders / conv;
    return { orders, admitNeeded, minutes: admitNeeded / rate, chance: Math.min(1, admitNeeded / queue) };
  }

  // Race widget: Riya aur Aman same millisecond pe A4 maangte hain. Har mode ke kadam (R = Riya, A = Aman).
  // seat = A4 ka DB state us kadam ke baad. res = us user ka final jawab (agar is kadam pe aaya).
  function bmsRace(mode) {
    const S = [];
    const add = (who, t, code, seat, res) => S.push({ who, t, code, seat, res: res || null });
    if (mode === 'naive') {
      add('R', 0, "SELECT status → 'FREE'", 'FREE');
      add('A', 1, "SELECT status → 'FREE'", 'FREE');
      add('R', 2, "UPDATE status='HELD', hold=h_R", 'HELD (Riya)');
      add('A', 3, "UPDATE status='HELD', hold=h_A", 'HELD (Aman)');
      add('R', 4, '201 Created', 'HELD (Aman)', 201);
      add('A', 5, '201 Created', 'HELD (Aman)', 201);
    } else if (mode === 'cond') {
      add('R', 0, "UPDATE ... WHERE status='FREE' → 1 row", 'HELD (Riya)');
      add('A', 1, "UPDATE ... WHERE status='FREE' → 0 rows", 'HELD (Riya)');
      add('R', 2, '201 Created', 'HELD (Riya)', 201);
      add('A', 3, '409 Conflict', 'HELD (Riya)', 409);
    } else if (mode === 'lock') {
      add('R', 0, 'BEGIN; SELECT ... FOR UPDATE → FREE (row locked)', 'FREE, locked by Riya');
      add('A', 1, 'BEGIN; SELECT ... FOR UPDATE → WAIT...', 'FREE, locked by Riya');
      add('R', 2, "UPDATE status='HELD'; COMMIT (lock khula)", 'HELD (Riya)');
      add('A', 3, 'lock mila → status = HELD → ROLLBACK', 'HELD (Riya)');
      add('R', 4, '201 Created', 'HELD (Riya)', 201);
      add('A', 5, '409 Conflict', 'HELD (Riya)', 409);
    } else {
      add('R', 0, 'SET hold:9001:A4 h_R NX PX 480000 → OK', 'Redis: h_R (8 min)');
      add('A', 1, 'SET hold:9001:A4 h_A NX PX 480000 → nil', 'Redis: h_R (8 min)');
      add('R', 2, '201 Created', 'Redis: h_R (8 min)', 201);
      add('A', 3, '409 Conflict (DB ko chhua bhi nahi)', 'Redis: h_R (8 min)', 409);
    }
    const ok = S.filter(x => x.res === 201).length;
    return { steps: S, winners: ok, double: ok > 1 };
  }

  Lesson.register({
    id: 'design-bookmyshow',
    title: 'BookMyShow',
    minutes: 36,
    summary: `Blockbuster ya bade concert ki booking khulti hai aur lakhon log ek hi second mein wahi seats click karte hain. Ek seat do logon ko kabhi nahi bikni chahiye. Zero se banayenge: seat map, cached browsing, double-booking race (live dekho), atomic seat holds with TTL, payment timeout aur release, idempotency, aur virtual waiting room.`,
    _test: { bmsRace, bmsInit, bmsStep, bmsView, bmsDouble, tryHold, payHold, seatFree, wrCalc, BMS_SEATS },
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum app kholte ho, movie chunte ho, hall ka naksha (seat map) dekhte ho, aur A5 pe click karte ho.<br>Usi second mein hazaaron aur log bhi A5 pe click kar rahe hain. Seat sirf <strong>ek</strong> hai.<br>System ko teen kaam karne hain: (1) A5 sirf ek insaan ko mile, kabhi do ko nahi; (2) jo seat chun ke payment karne gaya, uske liye seat kuch minute rok ke rakho, lekin hamesha ke liye nahi; (3) jab 1 crore log ek saath aa jaayein, to site gire nahi, unhe line mein lagao.<br>Ye lesson in teeno ko zero se banata hai.` },
      { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Kaagaz pe socho: ek hall, 200 seats, aur 1 lakh log ek saath "A5" pe click karte hain. Kaun jeetega, aur baaki ko kya dikhega? Jisne seat chuni lekin payment page pe 20 minute baith gaya, uski seat ka kya? Phir yahan compare karo.` },
      { type: 'p', html: `22 September 2024 ko BookMyShow pe Coldplay ke Mumbai concerts ki booking khuli. Pollstar ki report ke mutabik BookMyShow ke ek representative ne kaha ki ~1.3 crore (13 million) fans log in the. Booking shuru hone ke aas paas site aur app kuch der ruk gaye, aur phir logon ko lambi online queue dikhi; kai logon ne aise screenshots share kiye jinme likha tha ki unke aage lakhon log hain. BookMyShow ne bataya ki unhone demand sambhalne ke liye ek <strong>queueing system</strong> chalaya aur suspicious/malicious traffic ko minutes mein handle kiya. Tickets thodi hi der mein khatam.` },
      { type: 'p', html: `Ye lesson isi problem ke baare mein hai: <strong>contention</strong>, yaani bahut log, ek hi cheez, ek hi pal. Lekin pehle imaandari: BookMyShow ne apna seat-booking architecture publicly detail mein share nahi kiya hai. Jo public hai wo hum aage batayenge (Cloudflare edge, Kafka se data pipeline, AWS pe analytics). Seat locking aur waiting room ke design ke liye hum industry ka aam tareeka, Ticketmaster ke public posts, aur Cloudflare/AWS ke waiting room docs use karenge.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Contention', html: `<strong>Ye kya hai:</strong> jab bahut saare log (ya programs) <strong>ek hi cheez</strong> (yahan ek seat) ko ek hi waqt badalna chahte hain. Jaise ek hi chair pe das log ek saath baithne ki koshish karein.<br><strong>Kyun maayne rakhta hai:</strong> normal traffic mein requests alag alag data chhooti hain, sab aaram se chalta hai. Contention mein sab ek hi row pe toot padte hain.<br><strong>Iske bina sambhale:</strong> double booking (ek seat, do tickets), ya database locks mein phansi hui requests aur slow site.<br>Detail: <a href="#/pattern-contention">contention pattern lesson</a>.` },

      { type: 'h2', text: 'Step 1: requirements' },
      { type: 'compare',
        left: { title: 'Functional', html: `• Shehar ke hisaab se movies/events dekhna, search karna<br>• Show chuno, seat map dekho (kaun si seat khaali)<br>• Seats chuno → kuch minute ke liye <strong>hold</strong> → payment → confirm<br>• Ticket (QR) aur notification<br>• Bade events ke liye queue<br><br><strong>Out of scope:</strong> reviews ka system, food add-ons, refunds ka poora flow` },
        right: { title: 'Non-functional', html: `• <strong>Kabhi double booking nahi</strong> (strong consistency, seats ke liye)<br>• Browsing bahut fast aur sasta (read-heavy)<br>• Flash spike jhelna: normal se sainkdon guna traffic minutes mein<br>• Fair: bots se bachao, line ka order samajh aaye<br>• Payment fail / timeout pe seat atki na rahe` },
      },
      { type: 'callout', tone: 'term', title: 'Naye words: strong consistency, read-heavy, flash spike', html: `<strong>Strong consistency:</strong> sabko hamesha ek hi, sabse taaza sach dikhe. Seat A5 "booked" ho gayi to agla har request turant ye jaane. Seats ke liye ye zaroori hai.<br><strong>Read-heavy:</strong> log dekhte (read) zyada hain, kharidte (write) kam. Hazaar log movie list dekhte hain, kuch hi ticket lete hain.<br><strong>Flash spike:</strong> achanak, kuch hi minute ke liye, normal se sainkdon guna traffic. Jaise sale khulne ka pal.` },
      { type: 'h3', text: 'Napkin maths: average nahi, spike' },
      { type: 'p', html: `AWS ke ek 2023 blog ke mutabik BookMyShow saal mein ~20 crore (200 million) tickets ke run-rate pe tha. Average nikaalo: 200M / 365 ≈ 5.5 lakh tickets per din ≈ <strong>~6 tickets per second</strong>. Ek database aaram se sambhal le! Problem average mein nahi hai. Coldplay jaise sale mein 1.3 crore log ek hi minute mein aate hain, aur sab gine-chune <em>same</em> seats chahte hain. Design average ke liye nahi, <strong>spike aur contention</strong> ke liye karna hai. Aur browsing (movies, showtimes dekhna) bookings se kai guna zyada hoti hai.` },
      { type: 'h2', text: 'Step 2: API aur data model' },
      { type: 'p', html: `Pehle ek user ki journey socho: shehar chuno → movie chuno → showtime chuno → <strong>seat map</strong> dekho → seats chuno → kuch minute ke liye seats tumhare naam pe ruk jaati hain (<strong>hold</strong>) → payment → ticket. Har kadam ek API call hai:` },
      { type: 'image', src: 'assets/img/design-bookmyshow/cinema-hall-seats.jpg', alt: 'Ek cinema hall ke andar laal seats ki kai seedhi rows, screen ki taraf', caption: 'Asli hall: seats rows mein (A, B, C...) aur har row mein numbers. Seat map isi ka chhota naksha hai, screen pe. (Seattle ka Columbia City Cinema.)', credit: { text: 'Joe Mabel, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Columbia_City_Cinema_main_hall.jpg', license: 'CC BY-SA 3.0' } },
      { type: 'callout', tone: 'term', title: 'Naya word: Seat map', html: `<strong>Ye kya hai:</strong> hall ka naksha screen pe: har seat ek chhota box (A1, A2... B1...), aur har box ka rang batata hai ki seat <em>free</em>, <em>kisi ne rok rakhi (held)</em>, ya <em>bik chuki (booked)</em> hai.<br><strong>Kyun chahiye:</strong> user ko dikhna chahiye ki kaun si seats bachi hain, aur saath wali seats kahan hain.<br><strong>Iske bina:</strong> user andhe mein "koi bhi 2 seats do" bolega; ya har seat pe click karke "already booked" sunega.<br><strong>Dhyaan:</strong> seat map sirf <em>dikhane</em> ke liye hai. Asli faisla (ye seat tumhari ya nahi) hold ke time hota hai. Is farak pe poora lesson tika hai.` },
      { type: 'code', text: `
GET  /cities/mumbai/movies                 → list (CDN + cache)
GET  /shows?movie=123&date=2026-10-04      → showtimes (cache)
GET  /shows/9001/seats                     → seat map: FREE / HELD / BOOKED

POST /shows/9001/holds   { "seats": ["A4","A5"] }
     → 201 { "holdId": "h_77", "expiresAt": "10:15:00" }
     → 409 Conflict  (koi seat pehle hi held/booked)

POST /bookings   { "holdId": "h_77" }
     Idempotency-Key: 6f1c-...           → 201 { "bookingId": "b_501", "status": "PENDING_PAYMENT" }

POST /payments/webhook  (payment gateway se)  → booking CONFIRMED ya refund` },
      { type: 'callout', tone: 'term', title: 'Naye words: 409 Conflict, Idempotency-Key, webhook', html: `<strong>409 Conflict:</strong> server ka jawab "jo tum chahte ho wo abhi possible nahi, kyunki kisi aur ne pehle le liya". Yahan: seat kisi aur ne hold kar li.<br><strong>Idempotency-Key:</strong> app har booking request ke saath ek random ID bhejta hai. Wahi request (same ID) dobara aaye, to server nayi booking nahi banata, pehla jawab hi lauta deta hai. Double click ya network retry se do bookings nahi banti.<br><strong>Webhook:</strong> ek URL jise doosri company ka server (yahan payment gateway) <em>khud call karta hai</em> jab kuch ho jaaye, jaise "payment ho gaya". Hum baar baar poochhte nahi; wo humein batata hai.` },
      { type: 'p', html: `Data mein kaun kaun si cheezein (entities) hain, aur kaun kitni baar badalti hai:` },
      { type: 'table', head: ['Entity', 'Kya hai', 'Kitni baar badalta hai'], rows: [
        ['Movie / Event, Venue, Screen', 'Catalog: naam, poster, hall ka layout', 'Kabhi kabhi (cache karo)'],
        ['Show', 'Ek screen pe ek time slot', 'Din mein kuch baar'],
        ['<strong>ShowSeat</strong>', 'Har show ki har seat ki ek row: status, holdId, holdExpiresAt, version', '<strong>Booking ke time har second</strong> (yahi contention ka centre)'],
        ['Booking', 'User, seats, amount, status (PENDING → CONFIRMED / EXPIRED / CANCELLED)', 'Har booking pe'],
        ['Payment', 'Gateway ka reference, amount, status, idempotency key', 'Har payment attempt pe'],
      ]},
      { type: 'ascii', text: `
ShowSeat ka state machine

   FREE ──hold (atomic)──> HELD ──payment success──> BOOKED
    ^                        │
    └──TTL khatam / cancel───┘

  HELD hamesha "expiresAt" ke saath. Payment hold expire hone ke baad aaye → refund.`, caption: 'Seat ke sirf teen states, aur har transition atomic' },
      { type: 'callout', tone: 'term', title: 'Naya word: Hold (temporary reservation) aur TTL', html: `<strong>Ye kya hai:</strong> seat ko kuch minute ke liye "tumhare naam pe rok dena". Har hold ki ek <strong>expiry</strong> hoti hai, jise <strong>TTL</strong> (time to live, yaani "kitni der zinda rahe") kehte hain. Time khatam aur payment nahi hua, to seat apne aap wapas FREE.<br><strong>Kyun chahiye:</strong> payment mein minutes lagte hain (UPI app kholna, OTP). Is beech koi aur tumhari chuni seat na le le.<br><strong>Iske bina:</strong> ya to payment ke beech seat chhin jaayegi, ya (bina expiry ke lock mein) jo user tab band karke chala gaya uski seat hamesha ke liye atki rahegi.<br><strong>Example:</strong> Ticketmaster ki 2025 ki post batati hai ki queue se nikalne ke baad tumhara spot shopping shuru karne ke liye 10 minute tak held rehta hai; har platform apni timing khud rakhta hai.` },

      { type: 'h2', text: 'Step 3: high-level design, browsing' },
      { type: 'p', html: `Browsing booking se kai guna zyada hoti hai aur data bahut kam badalta hai (movie ka poster din mein ek baar bhi nahi badalta). Ise sasta banao, taaki database ki saari taakat booking ke liye bache. Zero se banate hain:` },
      { type: 'steps', items: [
        { t: 'v0: app → ek server → SQL database', d: 'Har movie list, har showtime, har seat map seedha database se. Chhoti site pe theek. Sale ke din database browsing mein hi thak jaata hai, booking ke liye taakat nahi bachti.' },
        { t: 'v1: CDN edge', d: 'Posters aur "Mumbai mein aaj ki movies" jaisi lists sabke liye same hain. Inhe user ke shehar ke paas CDN pe rakh do. Bad bots aur DDoS (jaan-boojh ke bheja gaya fake traffic ka toofan) bhi yahin ruk jaata hai.' },
        { t: 'v2: Redis cache', d: 'Showtimes aur seat map ko memory wale cache mein rakho, chhote TTL ke saath. Ek hi seat map lakhon log maangein to database ko ek baar hi poochho.' },
        { t: 'v3: Elasticsearch', d: '"coldplay" jaisi search database pe bhaari hai. Ek alag search engine ko search ka kaam do.' },
      ]},
      { type: 'callout', tone: 'term', title: 'Naye words: CDN, Redis cache, Elasticsearch', html: `<strong>CDN:</strong> desh bhar ke shehron mein rakhe cache servers. Sabke liye same cheez (poster, list) user ke paas se de dete hain (<a href="#/cdn">CDN lesson</a>).<br><strong>Redis cache:</strong> ek bahut tez, memory (RAM) mein chalne wala key-value store. "show 9001 ka seat map" jaisi cheez milliseconds mein (<a href="#/caching">Caching lesson</a>).<br><strong>Elasticsearch:</strong> search ke liye bana database: naam, venue, date se dhoondhna, typo ke saath bhi (<a href="#/search">Search lesson</a>).<br><strong>Inke bina:</strong> har click database tak, aur booking wale asli kaam ke liye database ke paas taakat nahi.` },
      { type: 'p', html: `Ye layering industry ka aam tareeka hai; BookMyShow ne apne case mein bas itna public kiya hai ki wo Cloudflare ko pehli defence line ki tarah use karte hain (Cloudflare ki case study mein 6 crore+ registered users aur 5 billion+ monthly pageviews ka zikr tha, jab wo likhi gayi thi; case study purani hai aur page pe date nahi). Ab chala ke dekho:` },
      { type: 'flow', title: 'Browsing: movies, shows, seat map', height: 330,
        nodes: [
          { id: 'u', label: 'User app', sub: 'web / mobile', x: 76, y: 165, w: 124, kind: 'client', info: 'Ye kya hai: BookMyShow jaisa app ya website, user ke phone/laptop pe. User shehar chunta hai, movies dekhta hai, showtime chunta hai, phir seat map kholta hai.' },
          { id: 'cdn', label: 'CDN / edge', sub: 'posters, lists', x: 236, y: 165, w: 128, kind: 'edge', info: 'Ye kya hai: user ke shehar ke paas ka cache server. Posters, trailers, aur "Mumbai mein aaj ki movies" jaise lists jo sabke liye same hain. Edge pe hi DDoS aur bad bots ko roka jaata hai (BookMyShow ki Cloudflare case study isi ki baat karti hai).' },
          { id: 'api', label: 'Catalog API', sub: 'stateless', x: 410, y: 165, w: 132, kind: 'server', info: 'Ye kya hai: stateless servers (jo apne paas user ki koi yaad nahi rakhte) jo catalog, shows aur seat map serve karte hain. Inke paas apna koi data nahi; cache, search aur DB se padhte hain.' },
          { id: 'rc', label: 'Redis cache', sub: 'shows, seat map', x: 610, y: 55, w: 140, kind: 'cache', info: 'Ye kya hai: memory mein tez cache. Showtimes aur catalog ka cache (minutes ki TTL). Seat map ka bhi chhota cache (kuch seconds), kyunki bade sale mein lakhon log ek hi seat map baar baar maangte hain.' },
          { id: 'es', label: 'Elasticsearch', sub: 'event search', x: 610, y: 165, w: 140, kind: 'data', info: 'Ye kya hai: search ke liye bana engine. Movie/event/venue ka naam se search, filters (language, genre, date). DB se sync hota hai (CDC, yaani database ke har badlaav ko event bana ke bhejna, ya app events se). Search ke details <a href="#/search">Search lesson</a> mein.' },
          { id: 'db', label: 'SQL database', sub: 'source of truth', x: 610, y: 275, w: 140, kind: 'data', info: 'Ye kya hai: asli data ka ghar (source of truth = jahan ka data hi sach maana jaata hai). Shows, ShowSeat, Bookings. Seats ke liye strong consistency yahin se aati hai. Browsing ka zyadatar load is tak pahunchna hi nahi chahiye.' },
        ],
        edges: [{ a: 'u', b: 'cdn' }, { a: 'cdn', b: 'api' }, { a: 'api', b: 'rc' }, { a: 'api', b: 'es' }, { a: 'api', b: 'db' }],
        scenarios: [
          { name: 'Movies list (CDN hit)', steps: [
            { title: 'Mumbai ki movies', text: 'Ye list Mumbai ke har user ke liye same hai.', go: 'u>cdn', msg: 'GET /cities/mumbai/movies' },
            { title: 'Edge se jawab', text: 'CDN ke paas copy hai. Hamare servers ko pata bhi nahi chala.', go: 'res:cdn>u', set: { api: { state: 'dim' }, db: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } } },
          ]},
          { name: 'Search', steps: [
            { title: 'User ne "coldplay" likha', go: ['u>cdn', 'cdn>api'], text: 'Search personal nahi, lekin queries bahut alag alag hain, isliye seedha API tak.', msg: 'GET /search?q=coldplay&city=mumbai' },
            { title: 'Elasticsearch', text: 'Naam, venue, date pe search. SQL DB ko chhua bhi nahi.', go: ['api>es', 'res:es>api', 'res:api>cdn>u'], after: { es: { state: 'hit' } } },
          ]},
          { name: 'Seat map', intro: 'Seat map sabse "taaza" data hai: kaun si seat abhi free hai.', steps: [
            { title: 'Seat map maanga', go: ['u>cdn', 'cdn>api'], text: 'CDN pe lamba cache nahi kar sakte; seats seconds mein badalti hain.', msg: 'GET /shows/9001/seats' },
            { title: 'Chhota cache, phir DB', text: 'Redis mein 2-3 second purana snapshot hai to wahi do. Nahi to DB se padh ke cache karo. Thoda purana map chalta hai, kyunki asli faisla hold ke time hota hai, map dekhte waqt nahi.', go: ['api>rc', 'bad:rc>api', 'api>db', 'res:db>api', 'api>rc', 'res:api>cdn>u'], after: { rc: { state: '', sub: 'map, 3 s TTL' } } },
          ]},
        ],
      },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Seat map stale ho sakta hai, to double booking ho jaayegi!" Nahi. Seat map sirf <em>dikhane</em> ke liye hai. Double booking ko rokne ka kaam <strong>hold</strong> ka atomic step karta hai, jo hamesha source of truth pe chalta hai. Map purana tha to bas itna hoga ki tumhe "ye seat abhi gayi" (409) milega, aur map refresh ho jaayega.` },
      { type: 'h2', text: 'Deep dive 1: ek seat, do log, ek hi millisecond' },
      { type: 'p', html: `Sabse seedha code jo har beginner likhta hai:` },
      { type: 'code', text: `seat = db.query("SELECT status FROM show_seats WHERE show=9001 AND seat='A4'")
if seat.status == 'FREE':                      # check
    db.exec("UPDATE show_seats SET status='HELD', hold_id=... WHERE ...")   # act
    return 201
return 409` },
      { type: 'p', html: `Riya aur Aman dono ka request same millisecond pe aaya. Dono ne SELECT kiya, dono ko FREE dikha, dono ne UPDATE kiya, dono ko 201 mila. Ek seat, do tickets. Isse <strong>check-then-act race</strong> kehte hain: check aur act ke beech ka chhota sa gap hi bug hai. Teen pakke tareeke hain is gap ko band karne ke.` },
      { type: 'callout', tone: 'term', title: 'Naya word: race condition (check-then-act)', html: `<strong>Ye kya hai:</strong> jab do kaam ek saath chalte hain aur result is pe nirbhar karta hai ki kaun kis pal pe pahuncha. "Pehle dekho (check), phir karo (act)" wale code mein dekhne aur karne ke beech ek chhota gap hota hai. Doosra request usi gap mein ghus jaata hai.<br><strong>Kyun maayne rakhta hai:</strong> normal din pe ye gap shayad hi kabhi pakda jaaye. Sale ke din hazaaron log same seat pe hain, to ye har second hoga.<br><strong>Iske bina sambhale:</strong> do logon ko same seat ka "success", dono pay karte hain, hall mein ek seat pe do log.` },
      { type: 'p', html: `Ise <strong>live</strong> dekho. Riya aur Aman dono A4 maangte hain, Aman ka request Riya se ek millisecond peeche. Tareeka chuno aur "Agla kadam" dabate jao. Pehle "Naive" chalao, phir baaki teeno (inhe neeche ek-ek karke samjhenge):` },
      { type: 'custom', render(el) {
        const MODES = [['naive', 'Naive (check, phir act)'], ['cond', 'Conditional update'], ['lock', 'FOR UPDATE lock'], ['redis', 'Redis SET NX']];
        el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">${MODES.map((m, i) => `<button type="button" class="chip bms-r-m${i ? '' : ' on'}" data-m="${m[0]}">${m[1]}</button>`).join('')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary bms-r-n">Agla kadam</button><button type="button" class="btn small ghost bms-r-a">Saare kadam</button><button type="button" class="btn small ghost bms-r-z">Reset</button></div>
          <div class="bms-r-g" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,0.8fr);gap:4px;font:12.5px/1.4 var(--f-mono)"></div>
          <div class="calc-note bms-r-note"></div>`;
        const q = c => el.querySelector(c);
        let mode = 'naive', k = 0;
        const cell = (t, st) => `<div style="padding:6px;border-radius:6px;background:${st || 'var(--surface-2)'};min-height:20px;overflow-wrap:anywhere">${t}</div>`;
        const draw = () => {
          const r = bmsRace(mode), n = Math.min(k, r.steps.length);
          let h = cell('<strong>Riya</strong>') + cell('<strong>Aman</strong>') + cell('<strong>Seat A4 (DB)</strong>');
          r.steps.slice(0, n).forEach(x => {
            const c = x.res === 201 ? 'var(--accent-soft)' : x.res === 409 ? 'var(--surface)' : '';
            const t = 't=' + x.t + ' ms: ' + x.code;
            h += x.who === 'R' ? cell(t, c) + cell('') : cell('') + cell(t, c);
            h += cell(x.seat);
          });
          q('.bms-r-g').innerHTML = h;
          q('.bms-r-note').innerHTML = n < r.steps.length ? 'Kadam ' + n + ' / ' + r.steps.length + '. "Agla kadam" dabao.' :
            r.double ? '<strong style="color:var(--red)">Dono ko 201!</strong> Riya ko lagta hai seat uski hai, lekin DB mein Aman ne uska hold overwrite kar diya. Dono pay karenge: ek seat, do tickets (ya Riya ke paise, seat nahi).' :
            '<strong style="color:var(--green)">Sirf ek jeeta.</strong> Riya ko 201, Aman ko 409 aur taaza seat map. Check aur act ek atomic kadam ban gaye, to beech ka gap hi nahi bacha.';
        };
        el.querySelectorAll('.bms-r-m').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; k = 0; el.querySelectorAll('.bms-r-m').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
        q('.bms-r-n').addEventListener('click', () => { k++; draw(); });
        q('.bms-r-a').addEventListener('click', () => { k = 99; draw(); });
        q('.bms-r-z').addEventListener('click', () => { k = 0; draw(); });
        draw();
      }},
      { type: 'p', html: `Naive mein 6 kadam aur dono ko 201. Baaki teeno mein sirf Riya jeetti hai; farak bas itna ki <strong>haarne wala kaise haarta hai</strong>: conditional update aur Redis mein turant 409, lock mein Aman pehle <em>wait</em> karta hai, phir 409. Ab teeno ko ek-ek karke samjho.` },
      { type: 'callout', tone: 'term', title: 'Naye words: transaction, row-level lock', html: `<strong>Transaction:</strong> database ke kai kaam ek packet mein: ya to sab hote hain (COMMIT), ya ek bhi nahi (ROLLBACK). Aadha kaam kabhi nahi bachta.<br><strong>Row-level lock:</strong> jab koi request ek row badal rahi hai, database us row pe "abhi mat chhuo" ka taala laga deta hai. Doosri request ko us row ke liye rukna padta hai, baaki rows aaram se chalti hain.<br><strong>Kyun chahiye:</strong> yahi do cheezein check aur act ko ek atomic (tod na sakne wala) kadam banati hain.` },
      { type: 'h3', text: 'Option 1: conditional update (sabse simple aur popular)' },
      { type: 'code', text: `UPDATE show_seats
   SET status = 'HELD', hold_id = 'h_77', hold_expires_at = now() + interval '8 minutes'
 WHERE show_id = 9001
   AND seat_id IN ('A4', 'A5')
   AND (status = 'FREE' OR (status = 'HELD' AND hold_expires_at < now()));

-- rows updated == 2 ?  → hold mila (COMMIT)
-- kam rows?            → ROLLBACK, 409 Conflict` },
      { type: 'p', html: `Check aur act ab <strong>ek hi statement</strong> mein hain, aur database row-level lock ke saath ise atomic chalata hai. Do log same row ko ek saath nahi badal sakte: pehla jeeta, doosre ki condition fail, 0 rows. Multi-seat hold ke liye transaction mein karo aur "jitni maangi utni rows badli?" check karo, taaki aadhi seats wala hold kabhi na bane. Expired holds ko alag cleanup job ka wait nahi: condition hi unhe FREE maan leti hai.` },
      { type: 'h3', text: 'Option 2: pessimistic lock (SELECT ... FOR UPDATE)' },
      { type: 'p', html: `Transaction mein pehle <code>SELECT ... FOR UPDATE</code> se rows lock karo, check karo, update karo, commit. Doosra request lock khulne tak wait karta hai. Sahi hai, lekin hot seats pe log line mein khade rehte hain aur connections atak-te hain. Locks ko hamesha same order mein lo (jaise seat ID ke order mein), warna do multi-seat holds ek doosre ka wait karte hue <strong>deadlock</strong> mein phans sakte hain.` },
      { type: 'h3', text: 'Option 3: Redis mein hold, DB mein final booking' },
      { type: 'code', text: `SET hold:9001:A4 h_77 NX PX 480000     # NX = sirf tab set karo jab key na ho
                                       # PX = 8 minute baad apne aap delete
# multi-seat: ek Lua script jo saari keys check kare aur sab ya kuch nahi set kare` },
      { type: 'p', html: `Pehle words: <strong>Lua script</strong> = Redis ke andar chalne wala chhota program; poora ek saath chalta hai, beech mein koi aur command nahi ghus sakti. <strong>Single-threaded</strong> = Redis ek waqt mein ek hi command chalata hai, line se. <strong>Failover</strong> = main machine gire to uski copy (replica) kaam sambhal le. Ab: Redis single-threaded hai, to <code>SET NX</code> atomic hai, aur <code>PX</code> se TTL apne aap: expired hold ke liye koi cleanup nahi. Bahut fast, isliye flash sale ke spike mein DB ko bachata hai. Lekin ab do jagah state hai: Redis (holds) aur DB (bookings). Final BOOKED likhte waqt DB mein bhi conditional update chahiye, aur Redis restart/failover pe holds kho sakte hain (to wahan bhi DB hi aakhri sach hai). Roadmap ka building block yahi kehta hai: <em>SQL row locks ya conditional updates seats ke liye, Redis TTL holds payment ke dauraan</em>.` },
      { type: 'table', head: ['', 'Conditional update', 'FOR UPDATE lock', 'Redis SET NX PX'], rows: [
        ['Double booking rokta hai?', 'Haan', 'Haan', 'Haan (agar final write bhi conditional ho)'],
        ['Hot seat pe behaviour', 'Haarne wala turant 409', 'Haarne wala wait karta hai', 'Haarne wala turant fail'],
        ['TTL / expiry', 'Column + condition', 'Column + cleanup', 'Built-in'],
        ['Complexity', 'Kam', 'Medium (deadlocks)', 'Zyada (do systems sync)'],
        ['Kab', 'Default choice', 'Jab read ke baad complex logic ho', 'Bahut bada spike, DB ko bachana ho'],
      ]},
      { type: 'callout', tone: 'tip', title: 'Optimistic concurrency (version number)', html: `Ek aur variant: har row mein <code>version</code> column. Padhte waqt version yaad rakho, likhte waqt <code>WHERE version = 7</code> lagao aur version 8 karo. Koi beech mein badal gaya to 0 rows → dobara try. Ye Option 1 ka hi general roop hai, aur tab achha hai jab clash kam hote hain. Flash sale mein clash bahut hote hain, to wahan retry ki jagah seedha 409 + naya seat map dena behtar.` },
      { type: 'h2', text: 'Khud chalao: seat holds, expiry, confirm vs timeout' },
      { type: 'p', html: `Chhota sa hall: 2 rows × 8 seats. 8 log (U1-U8) alag alag minute pe aate hain, sab beech wali (best) seats chahte hain. Kuch jaldi pay karte hain, U3 bina pay kiye chala jaata hai, U4 bahut der se pay karta hai. Tum bhi khel mein ho: free seats pe click karo, "Hold" dabao, phir time aage badhao aur "Pay" karo. Mode badal ke dekho naive code kya karta hai.` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <button type="button" class="chip on bms-m1">Atomic hold (conditional update)</button>
            <button type="button" class="chip bms-m0">Naive check-then-act</button>
          </div>
          <label>Hold TTL: <strong class="bms-tv"></strong></label>
          <input class="bms-ttl" type="range" min="2" max="8" step="1" value="5">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0">
            <strong class="bms-clock" style="font-family:var(--f-mono);min-width:96px"></strong>
            <button type="button" class="btn small primary bms-next">+1 minute</button>
            <button type="button" class="btn small ghost bms-run">Minute 15 tak</button>
            <button type="button" class="btn small ghost bms-reset">Reset</button>
          </div>
          <div style="text-align:center;font-size:12px;color:var(--ink-3);letter-spacing:.2em;margin:4px 0">SCREEN THIS WAY</div>
          <div class="bms-grid" style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:5px;max-width:520px;margin:0 auto"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0">
            <span class="bms-you" style="font-size:14px"></span>
            <button type="button" class="btn small primary bms-hold">Hold karo</button>
            <button type="button" class="btn small ghost bms-pay">Pay karo</button>
          </div>
          <div class="stats">
            <div class="stat"><span>Booked</span><strong class="bms-s-b"></strong></div>
            <div class="stat"><span>Held</span><strong class="bms-s-h"></strong></div>
            <div class="stat"><span>409 conflicts</span><strong class="bms-s-c"></strong></div>
            <div class="stat"><span>Holds expired</span><strong class="bms-s-e"></strong></div>
            <div class="stat"><span>Refunds</span><strong class="bms-s-r"></strong></div>
            <div class="stat"><span>Double-booked seats</span><strong class="bms-s-d"></strong></div>
          </div>
          <div class="bms-log" style="font:12.5px/1.6 var(--f-mono);max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:8px"></div>`;
        const q = c => el.querySelector(c);
        let naive = false, st, sel = [], you = null, msg = '';
        const reset = () => { st = bmsInit(Number(q('.bms-ttl').value), naive); sel = []; you = null; msg = ''; draw(); };
        const draw = () => {
          q('.bms-tv').textContent = st.ttl + ' minute';
          q('.bms-m0').classList.toggle('on', naive); q('.bms-m1').classList.toggle('on', !naive);
          q('.bms-clock').textContent = 'Minute ' + st.m;
          const v = bmsView(st), g = q('.bms-grid'); g.innerHTML = '';
          BMS_SEATS.forEach(s => {
            const x = v[s.id], dbl = x.st === 'BOOKED' && x.who.length > 1, mine = sel.includes(s.id);
            const bg = dbl ? 'var(--red)' : x.st === 'BOOKED' ? 'var(--green)' : x.st === 'HELD' ? 'var(--amber)' : 'var(--surface-2)';
            const b = document.createElement('button'); b.type = 'button';
            b.style.cssText = `padding:6px 2px;border-radius:6px;border:2px solid ${mine ? 'var(--accent)' : 'var(--line)'};background:${bg};color:${x.st === 'FREE' ? 'var(--ink)' : 'var(--bg)'};font:600 12px/1.2 var(--f-mono);cursor:pointer;min-width:0`;
            b.innerHTML = s.id + '<br><span style="font-weight:400;font-size:10px">' + (dbl ? 'DOUBLE' : x.who.join('+') || 'free') + '</span>';
            b.onclick = () => { if (x.st !== 'FREE' && !mine) return; sel = mine ? sel.filter(i => i !== s.id) : sel.concat(s.id).slice(-4); draw(); };
            g.appendChild(b);
          });
          const yh = you ? `Tumhara hold: ${you.seats.join(',')} (${you.state === 'HELD' && you.exp <= st.m ? 'EXPIRED' : you.state}${you.state === 'HELD' ? ', expiry minute ' + you.exp : ''})` : 'Chuni seats: ' + (sel.join(', ') || 'koi nahi (free seat pe click karo)');
          q('.bms-you').textContent = yh + (msg ? '  ·  ' + msg : '');
          const cnt = s => Object.values(v).filter(x => x.st === s).length;
          q('.bms-s-b').textContent = cnt('BOOKED'); q('.bms-s-h').textContent = cnt('HELD');
          q('.bms-s-c').textContent = st.stats.conflicts; q('.bms-s-e').textContent = st.stats.expired;
          q('.bms-s-r').textContent = st.stats.refunds; q('.bms-s-d').textContent = bmsDouble(st);
          const col = { ok: 'var(--green)', bad: 'var(--red)', warn: 'var(--amber)' };
          q('.bms-log').innerHTML = st.log.slice().reverse().map(l => `<div><span style="color:var(--ink-3)">m${l.m}</span> <span style="color:${col[l.t]}">●</span> ${l.s}</div>`).join('');
        };
        q('.bms-next').onclick = () => { msg = ''; bmsStep(st); draw(); };
        q('.bms-run').onclick = () => { msg = ''; while (st.m < 15) bmsStep(st); draw(); };
        q('.bms-reset').onclick = reset;
        q('.bms-ttl').addEventListener('input', reset);
        q('.bms-m0').onclick = () => { naive = true; reset(); };
        q('.bms-m1').onclick = () => { naive = false; reset(); };
        q('.bms-hold').onclick = () => {
          if (you && you.state === 'HELD' && you.exp > st.m) { msg = 'pehle se hold hai'; return draw(); }
          if (!sel.length) { msg = 'pehle seats chuno'; return draw(); }
          const h = tryHold(st, 'You', sel.slice(), st.snap); sel = [];
          if (h) { you = h; msg = 'hold mil gaya, ab pay karo'; } else msg = '409: koi aur le gaya';
          draw();
        };
        q('.bms-pay').onclick = () => {
          if (!you || you.state === 'BOOKED') { msg = you ? 'already booked' : 'pehle hold lo'; return draw(); }
          msg = payHold(st, you) ? 'ticket confirm!' : 'late: refund'; draw();
        };
        reset();
      }},
      { type: 'p', html: `Default (atomic, TTL 5 min) mein "Minute 15 tak" chalao aur log padho: minute 0 pe U1 aur U2 ne ek hi snapshot dekh ke dono ne A4,A5 maangi; U1 jeeta, U2 ko 409 mila aur agle minute usne A2,A3 le li. U3 ne B3-B5 hold karke kabhi pay nahi kiya: minute 6 pe hold expire, aur usi minute U6 ne B4,B5 le li. U4 ne minute 8 pe pay kiya jab hold minute 7 pe khatam ho chuka tha: <strong>refund</strong>. Double-booked seats: <strong>0</strong>.` },
      { type: 'p', html: `Ab <strong>Naive</strong> mode: U1 aur U2 dono ko A4,A5 ka hold mil jaata hai aur dono pay kar dete hain: 2 seats double-booked (laal). TTL ko 3 karo (atomic mein): genuine payers bhi time se pehle bahar, 3 refunds. TTL 8 karo: refunds 0, lekin U3 ki chhodi hui seats minute 9 tak bandh rehti hain, to U6 ko wo nahi milti. TTL ek <strong>business trade-off</strong> hai: chhota = abandoned seats jaldi wapas, lekin dheeme payers (OTP, UPI app switch) ka nuksaan; bada = ulta.` },
      { type: 'h2', text: 'Deep dive 2: hold → payment → confirm' },
      { type: 'callout', tone: 'term', title: 'Naya word: payment gateway (PSP)', html: `<strong>Ye kya hai:</strong> bahar ki company (Razorpay, PayU jaisi) jo UPI, card, netbanking se paise lene ka kaam karti hai. PSP = Payment Service Provider.<br><strong>Kyun chahiye:</strong> bank aur UPI se seedha jud-na, fraud checks, refunds: ye sab khud banana bahut mushkil aur regulated kaam hai.<br><strong>Iske bina:</strong> har bank se alag integration. Aur dhyaan: gateway ka jawab der se aa sakta hai, dobara aa sakta hai, ya kabhi "pata nahi" bhi ho sakta hai. Hamara design in sab ke liye taiyaar hona chahiye.` },
      { type: 'p', html: `Payment hamare haath mein nahi: user UPI app ya bank page pe jaata hai, OTP daalta hai, kabhi network gir jaata hai. Ye minutes le sakta hai aur iska result kabhi kabhi "pata nahi" hota hai. Isliye seat ka faisla do kadam mein: pehle <strong>hold</strong> (seat hamare paas surakshit), phir payment ka result aane pe <strong>confirm</strong> (ya release). Neeche ka flow ek aam design hai, kisi company ka exact internal design nahi:` },
      { type: 'flow', title: 'Booking: hold, pay, confirm', height: 340,
        nodes: [
          { id: 'u', label: 'User app', sub: 'seat chuni', x: 80, y: 170, w: 124, kind: 'client', info: 'Ye kya hai: user ka app. User ne A4, A5 chuni aur "Book" dabaya. Har booking request ke saath app ek Idempotency-Key bhejta hai (ek random ID), taaki retry pe dobara booking na bane.' },
          { id: 'bk', label: 'Booking service', sub: 'holds + orders', x: 280, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: booking ka dimaag, ek stateless service. Seat hold, booking record, payment start, aur payment result pe confirm/release. Stateless; saara state Redis aur DB mein. Idempotency keys ko bhi store karta hai (key → pehla jawab).' },
          { id: 'rd', label: 'Redis holds', sub: 'SET NX PX', x: 500, y: 58, w: 140, kind: 'cache', info: 'Ye kya hai: Redis mein rakhe holds, har ek TTL ke saath. Spike ke time fast gate: hold:9001:A4 jaisi keys, TTL ke saath. Jo yahan haara, use DB tak jaane ki zarurat hi nahi (409 turant). DB ka load bahut kam ho jaata hai.' },
          { id: 'db', label: 'Seat DB (SQL)', sub: 'source of truth', x: 500, y: 170, w: 140, kind: 'data', info: 'Ye kya hai: SQL database, seats ka source of truth. ShowSeat aur Booking tables. Final BOOKED hamesha yahin, conditional update se: sirf tab jab seat abhi bhi isi hold ke paas ho. Redis kuch bhool bhi jaaye, double booking yahan ruk jaati hai.' },
          { id: 'pg', label: 'Payment gateway', sub: 'UPI / cards', x: 500, y: 282, w: 140, kind: 'net', info: 'Ye kya hai: bahar ki payment company (PSP). User ko payment page/UPI pe bhejti hai, aur result hamein webhook (server-to-server call) se batati hai. Kabhi webhook der se aata hai, kabhi dobara aata hai: isliye handler idempotent hona chahiye.' },
        ],
        edges: [{ a: 'u', b: 'bk' }, { a: 'bk', b: 'rd' }, { a: 'bk', b: 'db' }, { a: 'bk', b: 'pg' }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Hold maango', text: 'User ne A4, A5 chuni.', go: 'u>bk', msg: 'POST /shows/9001/holds  { "seats": ["A4","A5"] }' },
            { title: 'Redis gate: mil gaya', text: 'Lua script ne dono keys check karke ek saath set ki, 8 minute TTL.', go: ['bk>rd', 'res:rd>bk'], after: { rd: { state: 'ok', sub: 'A4,A5 → h_77' } }, msg: 'SET hold:9001:A4 h_77 NX PX 480000  → OK (x2)' },
            { title: 'DB mein hold + booking', text: 'Conditional update se ShowSeat HELD (expiry ke saath), aur Booking row PENDING_PAYMENT.', go: ['bk>db', 'res:db>bk'], after: { db: { sub: 'A4,A5 HELD' } } },
            { title: 'Payment', text: 'User ko gateway pe bheja. Timer chal raha hai (user ko countdown dikhta hai).', go: ['res:bk>u', 'bk>pg'], msg: '{ holdId: "h_77", expiresAt: "10:15", payUrl: ... }' },
            { title: 'Webhook: success', text: 'Gateway ne bataya payment ho gaya.', go: 'res:pg>bk', msg: 'POST /payments/webhook  { ref: "pay_9x", status: "SUCCESS" }' },
            { title: 'Confirm (conditional)', text: 'Sirf tab BOOKED jab seat abhi bhi h_77 ke paas ho aur hold expire na hua ho. 2 rows badli: confirmed. Ticket event queue mein (email/SMS/QR).', go: ['bk>db', 'res:db>bk', 'res:bk>u'], after: { db: { state: 'ok', sub: 'A4,A5 BOOKED' } }, msg: "UPDATE show_seats SET status='BOOKED'\n WHERE hold_id='h_77' AND hold_expires_at > now()   → 2 rows" },
          ]},
          { name: 'Do log, ek seat', steps: [
            { title: 'Aman bhi A4 chahta hai', text: 'Riya ka hold ek millisecond pehle lag chuka hai.', go: 'u>bk', msg: 'POST /shows/9001/holds  { "seats": ["A4"] }' },
            { title: 'Redis: NX fail', text: 'Key pehle se hai, SET NX ne kuch nahi kiya. DB ko chhuna hi nahi pada.', go: ['bk>rd', 'bad:rd>bk'], after: { rd: { state: 'hot', sub: 'A4 taken' } } },
            { title: '409 + naya map', text: 'Aman ko turant "ye seat abhi gayi" aur taaza seat map. Wait nahi, hang nahi.', go: 'bad:bk>u', msg: '409 Conflict  { "taken": ["A4"] }' },
          ]},
          { name: 'Payment late', intro: 'User ne UPI app mein 12 minute laga diye. Hold 8 minute ka tha.', steps: [
            { title: 'Hold expire', text: 'Redis key apne aap gayi; DB ki condition bhi ab seat ko FREE maanti hai. Kisi aur ne A4 le bhi li ho sakti hai.', set: { rd: { state: 'dim', sub: 'key expired' } }, focus: ['rd', 'db'] },
            { title: 'Webhook der se: success', text: 'Paise kat gaye, lekin...', go: 'res:pg>bk', msg: '{ ref: "pay_9x", status: "SUCCESS" }' },
            { title: 'Confirm fail → refund', text: 'Conditional update ne 0 rows badli. Kabhi bhi bina check BOOKED mat likho. Booking EXPIRED, refund shuru, user ko saaf message.', go: ['bk>db', 'bad:db>bk', 'bk>pg'], after: { db: { state: 'warn', sub: '0 rows' }, pg: { sub: 'refund started' } }, msg: '0 rows updated → refund(pay_9x)' },
          ]},
          { name: 'Payment fail → release', intro: 'Riya ka UPI payment fail ho gaya (galat PIN, ya usne Cancel daba diya). Hold mein abhi 6 minute baaki hain.', steps: [
            { title: 'Webhook: failed', text: 'Gateway ne bataya payment fail hua.', go: 'res:pg>bk', msg: '{ ref: "pay_9x", status: "FAILED" }' },
            { title: 'Turant release', text: 'TTL ka wait kyun karein? Booking service seats abhi wapas FREE karti hai: Redis keys delete, DB mein conditional update (sirf agar seat abhi bhi h_77 ki hai). 6 minute pehle hi seat doosre fans ko mil sakti hai.', go: ['bk>rd', 'bk>db', 'res:db>bk'], after: { rd: { state: 'dim', sub: 'keys deleted' }, db: { state: 'ok', sub: 'A4,A5 FREE' } }, msg: "DEL hold:9001:A4 hold:9001:A5\nUPDATE show_seats SET status='FREE'\n WHERE hold_id='h_77'   → 2 rows" },
            { title: 'User ko batao', text: 'Booking FAILED. Riya ko "payment nahi hua, seats chhod di gayi" aur dobara try ka option. TTL sirf <strong>backup</strong> hai, un users ke liye jo bina bataye gayab ho jaate hain.', go: 'res:bk>u', after: { bk: { sub: 'booking FAILED' } } },
          ]},
          { name: 'Double click / retry', steps: [
            { title: 'User ne do baar "Pay" dabaya', text: 'Ya network ne pehla response gira diya aur app ne retry kiya. Dono requests mein same Idempotency-Key.', parallel: true, go: ['u>bk', 'u>bk'], msg: 'POST /bookings  Idempotency-Key: 6f1c-...' },
            { title: 'Doosri baar: purana jawab', text: 'Booking service ne key pehchaani aur pehli booking ka hi jawab lauta diya. Na doosri booking, na doosra charge. (Detail: <a href="#/pagination-idempotency">idempotency lesson</a>.)', go: 'res:bk>u', after: { bk: { state: 'ok', sub: 'same key → same reply' } }, msg: '201 { "bookingId": "b_501" }   (dobara bana nahi)' },
          ]},
        ],
      },
      { type: 'callout', tone: 'warn', title: 'Payment ka "pata nahi" result', html: `Gateway ko call timeout ho gaya: paise kate ya nahi? Ise <strong>failure mat maano</strong>. Booking ko PENDING rakho, gateway ke status API se poochhte raho (reconciliation), aur aakhri jawab aane pe confirm ya refund. Hold ki expiry ke baad payment success aaye to upar wala "late" raasta: refund. Poora payment state machine aur reconciliation <a href="#/distributed-tx">Sagas</a> aur <a href="#/design-payments">Payments</a> lesson ka topic hai.` },
      { type: 'h2', text: 'Deep dive 3: virtual waiting room' },
      { type: 'p', html: `Seat locking double booking rokta hai, lekin 1.3 crore log ek saath seat map, login aur hold APIs maarenge to servers aur DB pehle hi gir jaayenge. Saari seats bhi to sirf kuch hazaar logon ko milni hain. Socho: <strong>baaki sabko andar aane hi kyun dena?</strong>` },
      { type: 'callout', tone: 'term', title: 'Naya word: Virtual waiting room', html: `<strong>Ye kya hai:</strong> website ke aage ek online "line". Jitne log site sambhal sakti hai, utne hi andar; baaki ek halke page pe intezaar karte hain jo khud refresh hota hai aur position/estimated wait dikhata hai.<br><strong>Kyun chahiye:</strong> sab ek saath toot padein (ise <strong>thundering herd</strong> kehte hain) to login, seat map, DB sab gir jaate hain, aur kisi ko ticket nahi milta. Waiting room us bheed ko ek controlled dhaar mein badal deta hai.<br><strong>Iske bina:</strong> site crash, error pages, aur jo jeete wo bas kismat ya bots se.<br>Ye page edge (CDN) se serve hota hai, to lakhon log yahan khade ho sakte hain bina hamare servers ko chhooe.` },
      { type: 'callout', tone: 'term', title: 'Naye words: queue number, serving counter, signed token (JWT)', html: `<strong>Queue number:</strong> line mein aate hi milne wala badhta hua number (jaise bank mein token slip).<br><strong>Serving counter:</strong> "ab tak kaunse number tak ke log andar ja sakte hain". Site ki capacity ke hisaab se dheere dheere badhta hai.<br><strong>Signed token (jaise JWT):</strong> ek chhota digital pass jis pe waiting room ka "sign" hai aur expiry likhi hai. Booking site har request pe ye pass check karti hai; nakli pass ka sign match nahi hota.<br><strong>Kyun chahiye:</strong> pass ke bina koi bhi waiting room ko bypass karke seedha booking API maar sakta.` },
      { type: 'flow', title: 'Waiting room: line, turn, token', height: 340,
        nodes: [
          { id: 'u', label: 'Fans', sub: 'lakhs, ek saath', x: 80, y: 170, w: 124, kind: 'client', info: 'Ye kya hai: lakhon fans ke browsers/apps. Sale shuru hone pe sab ek saath aate hain. Har browser ko ek cookie milti hai jisme uski position/entry time hai.' },
          { id: 'bot', label: 'Bot', sub: 'scalper script', x: 80, y: 292, w: 124, kind: 'threat', hidden: true, info: 'Ye kya hai: ek bot (automatic script) jo hazaaron requests se tickets uthana chahti hai (baad mein mehenge bechne ke liye). Seedha booking API ko maarne ki koshish karti hai.' },
          { id: 'wr', label: 'Waiting room', sub: 'at the edge', x: 280, y: 170, w: 140, kind: 'edge', info: 'Ye kya hai: CDN edge pe chalne wala gate, jo tay karta hai kaun andar jaaye. Cloudflare ke Waiting Room mein admin do numbers set karta hai: total active users (andar kitne log ek saath) aur new users per minute. Queue ka tareeka FIFO ya Random ho sakta hai, aur intezaar wala page har ~20 second mein refresh hota hai.' },
          { id: 'qs', label: 'Queue service', sub: 'counters', x: 500, y: 60, w: 140, kind: 'cache', info: 'Ye kya hai: line ka hisaab rakhne wali service. Do numbers ka khel. AWS ke Virtual Waiting Room solution mein: har naye aadmi ko badhta hua queue number (Redis/ElastiCache counter), aur ek "serving counter" jo operator/automation site ki capacity ke hisaab se aage badhata hai. Tumhara number serving counter se chhota/barabar = tumhari baari.' },
          { id: 'site', label: 'Booking site', sub: 'token check', x: 500, y: 282, w: 140, kind: 'server', info: 'Ye kya hai: asli booking site (upar wala hold → pay → confirm). Seat map, holds, payment. Har request pe waiting room ka diya signed, short-lived token (jaise JWT) check hota hai. Token nahi = andar nahi, chahe koi waiting room ko bypass karke seedha API maare.' },
        ],
        edges: [{ a: 'u', b: 'wr' }, { a: 'bot', b: 'site', id: 'bs', hidden: true }, { a: 'wr', b: 'qs' }, { a: 'wr', b: 'site' }],
        scenarios: [
          { name: 'Sale shuru', steps: [
            { title: 'Sab ek saath', text: '12:00:00 pe lakhon requests.', flood: { paths: ['u>wr'], n: 12 }, after: { wr: { state: 'hot', sub: 'queue banti hai' } } },
            { title: 'Position do', text: 'Har browser ko queue number mila aur cookie mein save. Site sirf utne logon ko le rahi hai jitne wo sambhal sakti hai; baaki halka sa waiting page dekhte hain.', go: ['wr>qs', 'res:qs>wr', 'res:wr>u'], msg: 'Aapka number: 4,18,233   Estimated wait: ~40 min' },
            { title: 'Site shaant', text: 'Booking site pe sirf controlled dhaar. DB aur seat locks normal speed pe kaam karte hain.', set: { site: { state: 'ok', sub: 'steady load' } }, focus: ['site'] },
          ]},
          { name: 'Tumhari baari', steps: [
            { title: 'Serving counter aage badha', text: 'Andar se kuch log nikle (book kar liya ya time khatam), to serving counter badha.', go: ['wr>qs', 'res:qs>wr'], msg: 'serving: 4,18,300 ≥ tumhara 4,18,233 → andar' },
            { title: 'Token mila', text: 'Waiting room ne ek signed token diya jo kuch minute valid hai, aur site pe bhej diya.', go: ['res:wr>u', 'wr>site'], after: { u: { state: 'ok', sub: 'token mila' } }, msg: 'Set-Cookie: entry_token=eyJhbGciOi... (exp 10 min)' },
            { title: 'Seat chuno', text: 'Ab upar wala hold → pay → confirm flow. Ticketmaster ki post ke mutabik unke yahan baari aane pe spot shopping shuru karne ke liye 10 minute held rehta hai.', go: ['res:site>wr', 'res:wr>u'] },
          ]},
          { name: 'Bot aur refresh', steps: [
            { title: 'Refresh mat karo', text: 'Position cookie mein hai, to refresh se line mein jagah nahi jaati. Ticketmaster ki 2025 post ulta warn karti hai: baar baar manually refresh karoge to bot samjhe ja sakte ho.', go: ['u>wr', 'res:wr>u'], msg: 'same cookie → same position' },
            { title: 'Bot seedha API pe', text: 'Script waiting room ko bypass karke booking API maarti hai.', show: ['bot', 'bs'], go: ['bot>site', 'bad:site>bot'], after: { bot: { state: 'down', sub: 'blocked' } }, msg: 'POST /holds  (no entry token)  → 403' },
            { title: 'Teh-dar-teh bachav', text: 'Token check, per-account/IP rate limits, bot detection at the edge, aur bade events ke liye pre-registration (Ticketmaster Verified Fan jaisa). BookMyShow ne Coldplay sale ke baad kaha tha ki suspicious traffic ko minutes mein handle kiya gaya.', focus: ['wr', 'site'] },
          ]},
        ],
      },
      { type: 'h3', text: 'Line ki maths: kaun andar, kab tak?' },
      { type: 'p', html: `Numbers "maan lo" wale hain (sirf 1.3 crore wala number BookMyShow ke statement se). Badal ke dekho line kaise behave karti hai:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>Line mein log (lakhs)</label><input class="wr-q" type="number" value="130" min="1" step="1"></div>
            <div><label>Kul tickets</label><input class="wr-t" type="number" value="150000" min="100" step="1000"></div>
            <div><label>Average tickets per order</label><input class="wr-a" type="number" value="3" min="1" max="10" step="1"></div>
            <div><label>Andar aaye logon mein se kitne kharidte hain (%)</label><input class="wr-c" type="number" value="80" min="1" max="100" step="5"></div>
            <div><label>Admit rate (log per minute)</label><input class="wr-r" type="number" value="10000" min="100" step="500"></div>
            <div><label>Tumhara queue number</label><input class="wr-p" type="number" value="418233" min="1" step="1"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Orders possible</span><strong class="wr-o1"></strong></div>
            <div class="stat"><span>Kitne logon ko andar lena padega</span><strong class="wr-o2"></strong></div>
            <div class="stat"><span>Sold out in</span><strong class="wr-o3"></strong></div>
            <div class="stat"><span>Line mein kisi ka chance</span><strong class="wr-o4"></strong></div>
          </div>
          <div class="calc-note wr-note"></div>`;
        const q = c => el.querySelector(c);
        const fmt = n => Math.round(n).toLocaleString('en-IN');
        const upd = () => {
          const v = c => Math.max(1, Number(q(c).value) || 1);
          const r = wrCalc(v('.wr-q') * 1e5, v('.wr-t'), v('.wr-a'), Math.min(100, v('.wr-c')) / 100, v('.wr-r'));
          const pos = v('.wr-p'), wait = pos / v('.wr-r');
          q('.wr-o1').textContent = fmt(r.orders);
          q('.wr-o2').textContent = fmt(r.admitNeeded);
          q('.wr-o3').textContent = r.minutes.toFixed(1) + ' min';
          q('.wr-o4').textContent = (r.chance * 100).toFixed(2) + '%';
          q('.wr-note').textContent = pos <= r.admitNeeded
            ? `Number ${fmt(pos)}: tumhari baari ~${wait.toFixed(1)} minute mein, aur tickets bache honge.`
            : `Number ${fmt(pos)}: tumhari baari ~${wait.toFixed(1)} minute mein aati, lekin tickets ~${r.minutes.toFixed(1)} minute mein khatam. Achha system tumhe ye jaldi bata deta hai ("not enough tickets"), ghante bhar line mein khada nahi rakhta.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `Default numbers pe: 50,000 orders, ~62,500 logon ko andar lena kaafi, tickets ~6 minute mein khatam, aur 1.3 crore ki line mein kisi ek ka chance ~0.5%. Admit rate badhao to tickets aur jaldi khatam, lekin site pe load zyada. Admit rate kam karo to site safe, lekin log zyada der line mein. <strong>Admit rate = site ki capacity</strong>, ye load testing se tay hota hai, andaaze se nahi.` },
      { type: 'table', head: ['Kaun', 'Kya public hai'], rows: [
        ['Cloudflare Waiting Room (docs)', 'Edge pe Workers ke through faisla; admin "total active users" aur "new users per minute" set karta hai; FIFO ya Random queueing (Random = jo pehle aaye unhe bhi koi guarantee nahi, zyada barabar mauka); waiting page ~20 s pe refresh; cookie se position.'],
        ['AWS Virtual Waiting Room (solution)', 'Queue counter + serving counter (ElastiCache Redis), position ka API, aur baari aane pe signed JWT; target site ka authorizer har request pe token check karta hai.'],
        ['Ticketmaster Smart Queue (2025 post)', 'Waiting room sale se aam taur pe 15-30 minute pehle khulta hai; sale shuru hone ke baad aaye to line ke peeche; manual refresh mat karo; baari aane pe 10 minute ka held spot.'],
        ['Ticketmaster, Eras Tour presale (Nov 2022)', 'Unke statement ke mutabik bots aur bina invite code wale fans ki wajah se 3.5 billion system requests aaye, pichhle peak ke 4 guna; site kai baar atki aur public sale cancel karni padi.'],
        ['BookMyShow, Coldplay (Sep 2024)', '1.3 crore fans logged in, queueing system, suspicious traffic handle kiya (Pollstar report). Kaunsa vendor/tool, ye unke primary sources mein nahi mila.'],
      ]},
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Waiting room ho gaya to seat locking ki zarurat nahi." Galat. Waiting room sirf <em>kitne log</em> andar aayein ye control karta hai; andar aaye 10,000 log phir bhi same seats pe click karenge. Dono chahiye: waiting room = load control, atomic hold = correctness.` },
      { type: 'h2', text: 'BookMyShow ke baare mein kya public hai' },
      { type: 'table', head: ['Source (saal)', 'Kya bataya', 'Design mein kahan'], rows: [
        ['Cloudflare case study (purani, date page pe nahi)', 'India ki sabse badi ticketing company, 6 crore+ registered users, 5 billion+ monthly pageviews; Cloudflare pehli defence line (DDoS); 50 Gbps tak ke attack bursts bina downtime; kuch business logic edge pe.', 'CDN / edge layer, bot aur DDoS bachav'],
        ['PingCAP (TiDB) case study (undated)', 'Microservices apnaaye; transactional data MS SQL se Kafka ke through TiDB (unka big data platform) mein stream hota hai; pehle Galera use karte the jisme scaling dikkatein thi.', 'Booking DB SQL hai; events Kafka se analytics tak'],
        ['AWS Big Data blog (2023)', '~20 crore tickets/saal run-rate; 15 saal purana analytics stack AWS pe (S3, EMR, Redshift, Glue) le gaye; transaction systems se 100+ Kafka consumers.', 'Analytics alag pipeline mein, booking path pe nahi'],
        ['Pollstar report (2024)', 'Coldplay sale: 1.3 crore fans logged in, queueing system, suspicious traffic handle kiya.', 'Waiting room deep dive'],
      ]},
      { type: 'p', html: `Ek aur cheez jo is industry mein aam hai lekin BookMyShow ne apne case ke liye publicly detail mein nahi bataya: cinema halls ki seats aksar hall ke apne ticketing software (box office / POS system) mein hoti hain, aur aggregator app un systems se API ke through seat availability aur booking karta hai. Matlab movie booking mein "seat ka source of truth" kabhi kabhi hamare DB ke bajaye cinema ka system hota hai, aur hold/confirm ka faisla bhi wahan se aata hai. Bade concerts mein (jahan platform khud primary ticketing karta hai) inventory platform ke paas hoti hai. Interview mein ye farak bata do, to interviewer khush.` },

      { type: 'h2', text: 'Ek app, do faisle: CP aur AP' },
      { type: 'p', html: `<a href="#/cap">CAP lesson</a> ka Decide rule yahan bilkul fit baithta hai: "kya buraa hai, galat data dikhana ya error dikhana?" Double-booked seat galat data ka sabse buraa roop hai, to seats ke liye <strong>consistency (CP)</strong>: network partition (machines ke beech connection toot jaana) ya DB primary down ho to booking band karo, galat hold mat do. Lekin movie reviews, ratings, "kitne log interested hain" jaise counters ke liye <strong>availability (AP)</strong>: ek review 30 second der se dikhe to koi nuksaan nahi, aur us feature ka error dikhana zyada bura hai.` },
      { type: 'table', head: ['Feature', 'Choice', 'Kyun'], rows: [
        ['Seat hold / booking', 'CP (single primary, atomic updates)', 'Double booking = paise aur bharosa dono gaye'],
        ['Payment status', 'CP + reconciliation', '"Pata nahi" ko failure nahi maan sakte'],
        ['Seat map display', 'Thoda stale OK (seconds)', 'Asli faisla hold pe hota hai'],
        ['Movies list, showtimes', 'Cache/CDN, minutes stale OK', 'Read-heavy, kam badalta hai'],
        ['Reviews, ratings, likes', 'AP', 'Der chalegi, error nahi'],
      ]},

      { type: 'h2', text: 'Kya kya toot sakta hai' },
      { type: 'table', head: ['Failure', 'Kya hota hai', 'Bachav'], rows: [
        ['Check-then-act code', 'Double booking', 'Conditional update / row lock / SET NX; confirm bhi conditional'],
        ['User pay kiye bina chala gaya', 'Seat hamesha atki', 'Hold TTL; expiry ke baad seat apne aap FREE'],
        ['Payment hold expire ke baad aaya', 'Paise kate, seat nahi', 'Confirm 0 rows → auto refund + saaf message'],
        ['Double click / retry', 'Do bookings / do charges', 'Idempotency-Key; webhook handler idempotent'],
        ['Sale pe traffic spike', 'Login, seat map, DB sab gir jaayein', 'Waiting room, pre-scaling (sale se pehle hi machines badha lo), CDN, seat map ka chhota cache'],
        ['Bots / scalpers', 'Asli fans ko tickets nahi', 'Edge bot detection, token check, per-account limits, pre-registration'],
        ['Redis failover pe holds gaye', 'Do log same seat ke liye payment tak pahunche', 'DB ka conditional confirm aakhri gate; haarne wale ko refund'],
        ['Hot show ki rows pe lock contention', 'DB slow, timeouts', 'Redis gate pehle (haarne wale DB tak nahi), chhote transactions, haarne wale ko turant 409'],
      ]},
      { type: 'h2', text: 'Interview mein kaise bolein' },
      { type: 'steps', items: [
        { t: 'Requirements', d: 'Browse (read-heavy, cache) vs book (contention, no double booking). Average ~6 tickets/sec, lekin sale pe crores log: design spike ke liye.' },
        { t: 'Data model', d: 'ShowSeat row per show per seat: FREE → HELD (expiry ke saath) → BOOKED. Booking + Payment alag tables.' },
        { t: 'Seat locking', d: 'Atomic hold: conditional UPDATE (rows == maangi seats) ya Redis SET NX PX gate; final confirm hamesha DB mein conditional.' },
        { t: 'Payment', d: 'Hold → pay → webhook → conditional confirm; late = refund; fail = turant release; Idempotency-Key; unknown = PENDING + reconcile.' },
        { t: 'Spike', d: 'Edge waiting room (queue number + serving counter + signed token), bot defence, CDN for browsing, Elasticsearch for search.' },
        { t: 'CAP', d: 'Seats CP, reviews/counters AP.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `Jab bahut log <strong>ek hi cheez</strong> ek saath chahte hain: (1) correctness ke liye check aur act ko ek atomic step banao (conditional update, row lock, ya SET NX); (2) "kuch der ke liye rakh lo" ke liye TTL wala hold, kabhi bina expiry ka lock nahi; (3) load ke liye waiting room jo sirf utne log andar aane de jitne system sambhal sake; (4) jo cheez galat dikhna error se bura hai (seat, paisa) wahan CP, baaki (reviews, counts) AP.` },

      { type: 'diagram', title: 'Poora design, ek nazar mein', height: 590,
        caption: 'Upar: browsing, jo zyadatar cache se aati hai. Beech: booking, jahan contention hai (waiting room, holds, source of truth DB, payment). Neeche-daayein: booking ke baad ke async kaam. Buttons se ek-ek raasta dekho.',
        groups: [
          { label: 'Users', x: 10, y: 140, w: 160, h: 106 },
          { label: 'Browsing (read-heavy, cached)', x: 190, y: 30, w: 522, h: 100 },
          { label: 'Booking (contention yahin)', x: 190, y: 246, w: 350, h: 206 },
          { label: 'Bahar', x: 556, y: 246, w: 156, h: 96 },
        ],
        nodes: [
          { id: 'fans', label: 'Fans', sub: 'app / web', x: 90, y: 195, kind: 'client', info: 'Ye kya hai: users ke phone/laptop pe BookMyShow jaisa app. Browse karte hain, seat map dekhte hain, seats hold karke pay karte hain.' },
          { id: 'cdn', label: 'CDN edge', sub: 'posters, lists', x: 270, y: 90, kind: 'edge', info: 'Ye kya hai: shehar ke paas cache servers. Posters aur movie lists sabke liye same, to yahin se. DDoS aur bad bots ki pehli rok (BookMyShow ki Cloudflare case study, purani).' },
          { id: 'cat', label: 'Catalog API', sub: 'stateless', x: 450, y: 90, kind: 'server', info: 'Ye kya hai: movies, shows, seat map serve karne wale stateless servers. Cache aur search se padhte hain, DB tak kam se kam.' },
          { id: 'es', label: 'Elasticsearch', sub: 'event search', x: 630, y: 90, kind: 'data', info: 'Ye kya hai: search engine. "coldplay mumbai" jaisi search, filters ke saath. DB se sync hota hai.' },
          { id: 'db', label: 'Seat DB (SQL)', sub: 'source of truth', x: 450, y: 195, kind: 'data', info: 'Ye kya hai: ShowSeat, Booking, Payment tables. FREE → HELD → BOOKED ke saare badlaav yahin conditional updates se. Seats ke liye CP: galat hold dene se behtar error.' },
          { id: 'rc', label: 'Redis cache', sub: 'shows, seat map', x: 630, y: 195, kind: 'cache', info: 'Ye kya hai: memory cache. Showtimes (minutes TTL) aur seat map (2-3 second TTL). Lakhon log ek hi seat map maangein to DB ko ek hi baar.' },
          { id: 'wr', label: 'Waiting room', sub: 'edge, queue', x: 270, y: 300, kind: 'edge', info: 'Ye kya hai: site ke aage online line, edge pe. Sirf utne log andar jitne site sambhal sake (admit rate); baari aane pe signed token.' },
          { id: 'bk', label: 'Booking service', sub: 'hold, pay, confirm', x: 450, y: 300, kind: 'server', info: 'Ye kya hai: booking ka dimaag. Token check, atomic hold, Idempotency-Key, payment start, webhook pe conditional confirm ya release, late payment pe refund.' },
          { id: 'pg', label: 'Payment gateway', sub: 'UPI / cards', x: 630, y: 300, kind: 'net', info: 'Ye kya hai: bahar ki payment company (PSP). Result webhook se batati hai; der se, dobara, ya "pata nahi" bhi ho sakta hai.' },
          { id: 'qs', label: 'Queue service', sub: 'number + counter', x: 270, y: 410, kind: 'cache', info: 'Ye kya hai: line ka hisaab. Har naye fan ko queue number, aur ek serving counter jo capacity ke hisaab se aage badhta hai (AWS waiting room solution jaisa).' },
          { id: 'rh', label: 'Redis holds', sub: 'SET NX, TTL 8 min', x: 450, y: 410, kind: 'cache', info: 'Ye kya hai: fast gate. hold:show:seat keys, NX ke saath (pehla jeeta) aur PX TTL ke saath (apne aap expire). Haarne wale DB tak jaate hi nahi.' },
          { id: 'k', label: 'Kafka events', sub: 'booking events', x: 630, y: 410, kind: 'queue', info: 'Ye kya hai: events ki line. "Booking confirmed" jaise events yahan, phir ticket, notifications aur analytics apni speed se. BookMyShow ke public case studies mein transaction data Kafka se analytics tak jaane ka zikr hai.' },
          { id: 'nt', label: 'Ticket + notify', sub: 'QR, SMS, email', x: 630, y: 520, kind: 'server', info: 'Ye kya hai: ticket (QR) banana aur SMS/email/push bhejna. Booking path se alag, taaki slow SMS se booking slow na ho. Aam industry tareeka.' },
        ],
        edges: [
          { a: 'fans', b: 'cdn', label: 'browse' }, { a: 'cdn', b: 'cat' }, { a: 'cat', b: 'es' }, { a: 'cat', b: 'rc' }, { a: 'cat', b: 'db' },
          { a: 'fans', b: 'wr', n: 1, label: 'book' }, { a: 'wr', b: 'qs', dashed: true }, { a: 'wr', b: 'bk', n: 2 },
          { a: 'bk', b: 'rh', n: 3 }, { a: 'bk', b: 'db', n: 4 }, { a: 'bk', b: 'pg', n: 5, both: true },
          { a: 'bk', b: 'k', kind: 'evt', label: 'booked' }, { a: 'k', b: 'nt', kind: 'evt' },
        ],
        paths: [
          { name: 'Browse', text: 'Movie list CDN se, search Elasticsearch se, seat map Redis cache (2-3 s) se. DB tak sirf cache miss pe. Seat map thoda purana ho sakta hai: asli faisla hold pe.', go: ['fans>cdn>cat>es', 'cat>rc', 'cat>db'] },
          { name: 'Hold seats', text: 'Waiting room line mein number deta hai, baari pe token. Booking service: Redis SET NX (pehla jeeta, baaki 409) → DB conditional update (FREE → HELD, expiry ke saath).', go: ['fans>wr>qs', 'wr>bk>rh', 'bk>db'] },
          { name: 'Pay', text: 'Gateway pe payment → webhook success → conditional confirm (sirf agar hold abhi bhi tumhara) → BOOKED → event Kafka pe → ticket aur SMS. Idempotency-Key se double click safe.', go: ['bk>pg', 'bk>db', 'bk>k>nt'] },
          { name: 'Hold expires', text: 'TTL khatam: Redis key apne aap gayi, DB condition seat ko FREE maanti hai, seat doosre fan ko. Payment fail ho to turant release. Payment late aaye to confirm 0 rows → refund.', go: ['pg>bk>rh', 'bk>db'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Average load chhota (~6 tickets/sec), lekin sale pe crores log ek hi seats pe: design spike aur contention ke liye.</li>
        <li>Browsing read-heavy hai: CDN, Redis cache, Elasticsearch. DB ki taakat booking ke liye bachao.</li>
        <li>Seat map sirf dikhane ke liye (thoda purana chalega); asli faisla atomic hold pe.</li>
        <li>Check-then-act race = double booking. Fix: conditional UPDATE, FOR UPDATE lock, ya Redis SET NX; final confirm hamesha DB mein conditional.</li>
        <li>Hold hamesha TTL ke saath: abandoned seats apne aap wapas. Payment fail = turant release; payment late = refund.</li>
        <li>Idempotency-Key aur idempotent webhook: double click se do bookings ya do charges nahi.</li>
        <li>Waiting room = load control (queue number, serving counter, signed token). Seat locking = correctness. Dono chahiye.</li>
        <li>Seats CP, reviews/counters AP. BookMyShow ka internal design public nahi; ye industry ka aam tareeka hai.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Atomic hold: double booking practically impossible', 'TTL holds: abandoned seats apne aap wapas', 'Waiting room: spike se site nahi girti, line ka order saaf', 'Redis gate: haarne wale requests DB tak nahi pahunchte', 'Cached browsing: DB ki taakat booking ke liye bachti hai'],
        costs: ['Hold TTL ka samjhauta: chhota = dheeme payers ko refund, bada = seats atki', 'Redis + DB = do jagah state, sync aur failover ka dhyaan', 'Waiting room mein log ghanton intezaar kar sakte hain; fairness pe sawaal uthte hain', 'Refunds aur reconciliation ka operational kaam', 'Seats ke liye CP: DB primary down = booking band'],
      },

      { type: 'think', questions: [
        { q: 'Product team kehti hai: "Hold TTL hata do, jab tak user payment page pe hai seat uski." Kya problem hogi?', a: 'Jo user tab band karke chala gaya, uski seat hamesha (ya bahut der tak) atki rahegi; bots seats hold karke rok sakte hain (inventory hoarding). TTL hi guarantee hai ki seat wapas aayegi. Behtar: TTL rakho, countdown dikhao, aur payment shuru hone pe zarurat ho to ek baar thoda extend karo.' },
        { q: 'Redis primary crash hua aur replica pe kuch latest holds nahi pahunche the. Riya aur Aman dono A4 ke liye payment tak pahunch gaye. Kya hoga?', a: 'Final confirm DB mein conditional update hai: jiska webhook pehle aaya aur jiske hold_id se seat abhi bhi match karti hai, wahi BOOKED. Doosre ka confirm 0 rows update karega, to auto refund aur message. Isliye Redis sirf fast gate hai, source of truth DB.' },
        { q: 'Waiting room mein FIFO aur Random mein se kya chunoge?', a: 'FIFO: jo pehle aaya wo pehle, lekin sale shuru hone ke pal pe millisecond ka khel aur bots ko fayda. Random (Cloudflare ka ek option): fast internet ya bots ka fayda kam, zyada barabar mauka. Ek achha pattern: sale se pehle waiting room kholo, sale-start pe jo bhi andar hain unhe random order, uske baad aane walon ko FIFO mein peeche.' },
      ]},
      { type: 'quiz', questions: [
        { q: '"SELECT status; if FREE then UPDATE" code mein double booking kyun hoti hai?', options: ['SELECT slow hai', 'Check aur act ke beech doosra request bhi FREE padh leta hai', 'UPDATE fail hota hai'], answer: 1, explain: 'Check-then-act race. Fix: condition UPDATE ke andar (WHERE status = FREE), rows count check, ya lock.' },
        { q: 'Payment success ka webhook hold expire hone ke baad aaya. Sahi behaviour?', options: ['Seat BOOKED kar do, paise to aa gaye', 'Conditional confirm fail hoga; refund karo aur user ko batao', 'Webhook ignore karo'], answer: 1, explain: 'Expired hold ke baad seat kisi aur ki ho sakti hai. Bina condition BOOKED likhna double booking hai. Refund + saaf message.' },
        { q: 'Race widget mein "FOR UPDATE lock" aur "Conditional update" mein haarne wale (Aman) ka farak kya tha?', options: ['Lock mein Aman bhi jeet gaya', 'Lock mein Aman pehle wait karta hai phir 409; conditional update mein turant 409', 'Koi farak nahi'], answer: 1, explain: 'Dono double booking rokte hain. Lock mein doosra request lock khulne tak rukta hai (hot seat pe connections atakte hain); conditional update mein uski condition turant fail, 0 rows, 409.' },
        { q: 'Riya ka UPI payment fail ho gaya, hold mein abhi 6 minute baaki hain. Achha design kya karega?', options: ['TTL khatam hone ka wait', 'Turant seats release (Redis keys delete + DB conditional update) aur Riya ko batao', 'Seat BOOKED kar do, baad mein dekhenge'], answer: 1, explain: 'TTL sirf backup hai un users ke liye jo bina bataye gayab ho jaate hain. Fail ka pakka pata hai to seat turant doosre fans ke liye wapas.' },
        { q: 'Virtual waiting room ka main kaam kya hai?', options: ['Double booking rokna', 'Site pe aane wale logon ki dhaar ko capacity tak limit karna', 'Payments tez karna'], answer: 1, explain: 'Waiting room load control hai; correctness abhi bhi atomic hold se aati hai. Dono chahiye.' },
        { q: 'BookMyShow jaisi app mein seats aur reviews ke liye CAP choice?', options: ['Dono AP', 'Seats CP, reviews AP', 'Dono CP'], answer: 1, explain: 'Double-booked seat error se bura hai (CP). Review der se dikhe to chalta hai, error bura (AP). Ek app, feature ke hisaab se faisle.' },
      ]},
      { type: 'sources', note: 'BookMyShow ne apna seat-booking internal design publicly detail mein nahi bataya; lesson ke seat locking aur waiting room hisse industry ke aam tareeke aur neeche diye official docs pe based hain.', items: [
        { title: 'BookMyShow Buckles Under Coldplay Onsale In India As 13 Million Try To Secure Tickets', publisher: 'Pollstar', year: 2024, url: 'https://news.pollstar.com/2024/09/26/bookmyshow-buckles-under-coldplay-onsale-in-india-as-13-million-try-to-secure-tickets/', used: 'Sale date, 13M fans logged in (BookMyShow representative), queueing system, suspicious traffic handled, stadium capacity.' },
        { title: 'How BookMyShow uses Cloudflare to mitigate massive DDoS attacks', publisher: 'Cloudflare case study', official: true, url: 'https://www.cloudflare.com/case-studies/how-bookmyshow-uses-cloudflare-to-mitigate-massive-ddos-attacks', used: '60M+ registered users, 5B+ monthly pageviews, 50 Gbps bursts, Cloudflare as first line of defence, logic at the edge (read via search snippets; the page now returns 404).' },
        { title: 'How BookMyShow saved 80% in costs by migrating to an AWS modern data architecture', publisher: 'AWS Big Data Blog', official: true, year: 2023, url: 'https://aws.amazon.com/blogs/big-data/how-bookmyshow-saved-80-in-costs-by-migrating-to-an-aws-modern-data-architecture/', used: '~200M tickets/year run rate, analytics on S3/EMR/Redshift/Glue, 100+ Kafka consumers from transaction systems.' },
        { title: 'TiDB in BookMyShow', publisher: 'PingCAP case study', official: true, url: 'https://www.pingcap.com/case-study/tidb-in-bookmyshow/', used: 'Microservices, transactional data from MS SQL streamed via Kafka to TiDB, earlier Galera limits.' },
        { title: 'How A Ticketmaster Queue Works', publisher: 'Ticketmaster blog', official: true, year: 2025, url: 'https://blog.ticketmaster.com/how-ticketmaster-queue-works/', used: 'Waiting room opens 15-30 min early, late arrivals at back, do not refresh, 10-minute held spot when it is your turn.' },
        { title: 'Ticketmaster cancels public sale for Taylor Swift tour (statement quoted)', publisher: 'NBC News', year: 2022, url: 'https://www.nbcnews.com/pop-culture/pop-culture-news/ticketmaster-cancels-public-sale-taylor-swift-tour-citing-high-demand-rcna57758', used: '3.5B system requests, 4x previous peak, bots and fans without codes, Verified Fan registrations.' },
        { title: 'Cloudflare Waiting Room: About, and Queueing methods', publisher: 'Cloudflare docs', official: true, url: 'https://developers.cloudflare.com/waiting-room/about/', used: 'Total active users, new users per minute, session duration, cookie, FIFO/Random/Passthrough/Reject, ~20 s refresh, decisions at the edge.' },
        { title: 'Virtual Waiting Room on AWS: solution components', publisher: 'AWS Solutions docs', official: true, url: 'https://docs.aws.amazon.com/solutions/latest/virtual-waiting-room-on-aws/solution-components.html', used: 'Queue counter and serving counter in ElastiCache Redis, position API, JWT issued when admitted, authorizer on the target site.' },
      ]},
    ],
  });
})();
