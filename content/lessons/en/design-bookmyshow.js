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
    if (!ok) { st.stats.conflicts++; st.log.push({ m: st.m, t: 'bad', s: `${user}: ${ids.join(',')} hold FAIL (a seat is already held/booked) → 409` }); return null; }
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
    st.log.push({ m: st.m, t: 'bad', s: `${h.user}: payment came but the hold had expired → refund` });
    return false;
  }
  function bmsProcess(st) {
    // 1. expiry
    st.holds.forEach(h => { if (h.state === 'HELD' && h.exp <= st.m) { h.state = 'EXPIRED'; st.stats.expired++; st.log.push({ m: st.m, t: 'warn', s: `${h.user}: hold expired, ${h.seats.join(',')} free again` }); } });
    // 2. bot payments due
    st.bots.forEach(b => { if (b.h && b.pay != null && b.h.at + b.pay === st.m && b.h.state !== 'BOOKED') payHold(st, b.h); });
    // 3. arrivals / retries: all of them see the same snapshot
    const snapFree = {}; BMS_SEATS.forEach(s => { snapFree[s.id] = seatFree(st, s.id); }); st.snap = snapFree;
    st.bots.filter(b => b.next === st.m && !b.h).forEach(b => {
      const ids = pick(st, b.k, id => snapFree[id]);
      if (!ids) { b.next = null; st.log.push({ m: st.m, t: 'warn', s: `${b.u}: no ${b.k} seats together left, gave up` }); return; }
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

  // Race widget: Riya and Aman ask for A4 in the same millisecond. Steps per mode (R = Riya, A = Aman).
  // seat = A4's database state after that step. res = that user's final reply (if it came at this step).
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
      add('R', 2, "UPDATE status='HELD'; COMMIT (lock released)", 'HELD (Riya)');
      add('A', 3, 'got lock → status = HELD → ROLLBACK', 'HELD (Riya)');
      add('R', 4, '201 Created', 'HELD (Riya)', 201);
      add('A', 5, '409 Conflict', 'HELD (Riya)', 409);
    } else {
      add('R', 0, 'SET hold:9001:A4 h_R NX PX 480000 → OK', 'Redis: h_R (8 min)');
      add('A', 1, 'SET hold:9001:A4 h_A NX PX 480000 → nil', 'Redis: h_R (8 min)');
      add('R', 2, '201 Created', 'Redis: h_R (8 min)', 201);
      add('A', 3, '409 Conflict (database not touched)', 'Redis: h_R (8 min)', 409);
    }
    const ok = S.filter(x => x.res === 201).length;
    return { steps: S, winners: ok, double: ok > 1 };
  }

  Lesson.register({
    id: 'design-bookmyshow',
    title: 'BookMyShow (ticket booking)',
    minutes: 36,
    summary: `Booking opens for a blockbuster or a big concert, and lakhs of people click the same seats in the same second. One seat must never be sold to two people. We build it from zero: the seat map, cached browsing, the double-booking race (watch it live), atomic seat holds with a TTL, payment timeout and release, idempotency, and a virtual waiting room.`,
    _test: { bmsRace, bmsInit, bmsStep, bmsView, bmsDouble, tryHold, payHold, seatFree, wrCalc, BMS_SEATS },
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You open the app, pick a movie, look at the map of the hall (the seat map), and click A5.<br>In that same second, thousands of other people also click A5. There is only <strong>one</strong> seat.<br>The system has three jobs: (1) A5 goes to exactly one person, never two; (2) for the person who picked a seat and went to pay, keep the seat for a few minutes, but not forever; (3) when 1 crore people arrive at once, the site must not crash; put them in a line.<br>This lesson builds all three from zero.` },
      { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper: one hall, 200 seats, and 1 lakh people click "A5" at the same time. Who wins, and what do the others see? What about the seat of someone who picked it but sat on the payment page for 20 minutes? Then compare with this lesson.` },
      { type: 'p', html: `On 22 September 2024, booking opened on BookMyShow for Coldplay's Mumbai concerts. According to a Pollstar report, a BookMyShow representative said ~1.3 crore (13 million) fans were logged in. Around the start of the sale the site and app stalled for a while, and then people saw a long online queue; many shared screenshots saying lakhs of people were ahead of them. BookMyShow said it ran a <strong>queueing system</strong> to handle the demand and dealt with suspicious and malicious traffic within minutes. The tickets were gone soon after.` },
      { type: 'p', html: `This lesson is about exactly this problem: <strong>contention</strong>, meaning many people, one thing, one moment. But first, to be honest: BookMyShow has not shared its seat-booking architecture publicly in detail. We will tell you what is public (Cloudflare edge, a data pipeline through Kafka, analytics on AWS). For seat locking and the waiting room design, we use the common industry approach, Ticketmaster's public posts, and the Cloudflare and AWS waiting room docs.` },
      { type: 'callout', tone: 'term', title: 'New word: Contention', html: `<strong>What it is:</strong> when many people (or programs) want to change <strong>the same thing</strong> (here, one seat) at the same time. Like ten people trying to sit on one chair at once.<br><strong>Why it matters:</strong> in normal traffic, requests touch different data and everything runs smoothly. With contention, everyone piles onto the same row.<br><strong>If not handled:</strong> double booking (one seat, two tickets), or requests stuck on database locks and a slow site.<br>Details: <a href="#/pattern-contention">contention pattern lesson</a>.` },

      { type: 'h2', text: 'Step 1: requirements' },
      { type: 'compare',
        left: { title: 'Functional', html: `• See and search movies and events by city<br>• Pick a show, see the seat map (which seats are free)<br>• Pick seats → <strong>hold</strong> for a few minutes → payment → confirm<br>• Ticket (QR) and notification<br>• A queue for big events<br><br><strong>Out of scope:</strong> the reviews system, food add-ons, the full refunds flow` },
        right: { title: 'Non-functional', html: `• <strong>Never double booking</strong> (strong consistency, for seats)<br>• Browsing very fast and cheap (read-heavy)<br>• Survive flash spikes: hundreds of times normal traffic within minutes<br>• Fair: protect against bots, a line order people can understand<br>• A seat must not get stuck when payment fails or times out` },
      },
      { type: 'callout', tone: 'term', title: 'New words: strong consistency, read-heavy, flash spike', html: `<strong>Strong consistency:</strong> everyone always sees the same, latest truth. Once seat A5 is "booked", every next request knows it at once. Seats need this.<br><strong>Read-heavy:</strong> people look (read) much more than they buy (write). Thousands look at the movie list; only a few buy tickets.<br><strong>Flash spike:</strong> sudden traffic, hundreds of times the normal level, for just a few minutes. Like the moment a sale opens.` },
      { type: 'h3', text: 'Napkin maths: not the average, the spike' },
      { type: 'p', html: `According to a 2023 AWS blog, BookMyShow was at a run rate of ~20 crore (200 million) tickets a year. Take the average: 200M / 365 ≈ 5.5 lakh tickets per day ≈ <strong>~6 tickets per second</strong>. One database could handle that easily! The problem is not the average. In a sale like Coldplay, 1.3 crore people arrive in the same minute, and they all want a few of the <em>same</em> seats. Design not for the average but for the <strong>spike and the contention</strong>. And browsing (looking at movies and showtimes) happens many times more than booking.` },
      { type: 'h2', text: 'Step 2: API and data model' },
      { type: 'p', html: `First think of one user's journey: pick a city → pick a movie → pick a showtime → look at the <strong>seat map</strong> → pick seats → the seats are kept in your name for a few minutes (a <strong>hold</strong>) → payment → ticket. Each step is an API call:` },
      { type: 'image', src: 'assets/img/design-bookmyshow/cinema-hall-seats.jpg', alt: 'Inside a cinema hall: many straight rows of red seats facing the screen', caption: 'A real hall: seats in rows (A, B, C...) and numbers in each row. The seat map is a small drawing of this, on screen. (Columbia City Cinema, Seattle.)', credit: { text: 'Joe Mabel, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Columbia_City_Cinema_main_hall.jpg', license: 'CC BY-SA 3.0' } },
      { type: 'callout', tone: 'term', title: 'New word: Seat map', html: `<strong>What it is:</strong> a map of the hall on screen: every seat is a small box (A1, A2... B1...), and the colour of each box tells you whether the seat is <em>free</em>, <em>kept by someone (held)</em>, or <em>sold (booked)</em>.<br><strong>Why we need it:</strong> the user must see which seats are left, and where seats next to each other are.<br><strong>Without it:</strong> the user would blindly say "give me any 2 seats", or click seat after seat and hear "already booked".<br><strong>Careful:</strong> the seat map is only for <em>display</em>. The real decision (is this seat yours or not) happens at the hold. The whole lesson rests on this difference.` },
      { type: 'code', text: `
GET  /cities/mumbai/movies                 → list (CDN + cache)
GET  /shows?movie=123&date=2026-10-04      → showtimes (cache)
GET  /shows/9001/seats                     → seat map: FREE / HELD / BOOKED

POST /shows/9001/holds   { "seats": ["A4","A5"] }
     → 201 { "holdId": "h_77", "expiresAt": "10:15:00" }
     → 409 Conflict  (a seat is already held/booked)

POST /bookings   { "holdId": "h_77" }
     Idempotency-Key: 6f1c-...           → 201 { "bookingId": "b_501", "status": "PENDING_PAYMENT" }

POST /payments/webhook  (from the payment gateway)  → booking CONFIRMED or refund` },
      { type: 'callout', tone: 'term', title: 'New words: 409 Conflict, Idempotency-Key, webhook', html: `<strong>409 Conflict:</strong> the server's answer "what you want is not possible right now, because someone else got it first". Here: someone else holds the seat.<br><strong>Idempotency-Key:</strong> the app sends a random ID with every booking request. If the same request (same ID) arrives again, the server does not create a new booking; it returns the first reply. So a double click or a network retry never makes two bookings.<br><strong>Webhook:</strong> a URL that another company's server (here, the payment gateway) <em>calls by itself</em> when something happens, like "payment done". We do not keep asking; it tells us.` },
      { type: 'p', html: `Which things (entities) are in the data, and how often each one changes:` },
      { type: 'table', head: ['Entity', 'What it is', 'How often it changes'], rows: [
        ['Movie / Event, Venue, Screen', 'Catalog: name, poster, hall layout', 'Rarely (cache it)'],
        ['Show', 'One time slot on one screen', 'A few times a day'],
        ['<strong>ShowSeat</strong>', 'One row for every seat of every show: status, holdId, holdExpiresAt, version', '<strong>Every second during booking</strong> (this is the centre of contention)'],
        ['Booking', 'User, seats, amount, status (PENDING → CONFIRMED / EXPIRED / CANCELLED)', 'On every booking'],
        ['Payment', 'Gateway reference, amount, status, idempotency key', 'On every payment attempt'],
      ]},
      { type: 'ascii', text: `
ShowSeat state machine

   FREE ──hold (atomic)──> HELD ──payment success──> BOOKED
    ^                        │
    └──TTL over / cancel─────┘

  HELD always comes with "expiresAt". Payment after the hold expires → refund.`, caption: 'A seat has only three states, and every change is atomic' },
      { type: 'callout', tone: 'term', title: 'New word: Hold (temporary reservation) and TTL', html: `<strong>What it is:</strong> keeping a seat "in your name" for a few minutes. Every hold has an <strong>expiry</strong>, called a <strong>TTL</strong> (time to live, meaning "how long it stays alive"). If time runs out and payment has not happened, the seat becomes FREE again by itself.<br><strong>Why we need it:</strong> payment takes minutes (opening the UPI app, an OTP). In the meantime, nobody else should take the seat you picked.<br><strong>Without it:</strong> either the seat is snatched in the middle of payment, or (with a lock that never expires) the seat of a user who closed the tab and left stays stuck forever.<br><strong>Example:</strong> Ticketmaster's 2025 post says that after you leave the queue, your spot is held for up to 10 minutes to start shopping; each platform sets its own timing.` },

      { type: 'h2', text: 'Step 3: high-level design, browsing' },
      { type: 'p', html: `Browsing happens many times more than booking, and the data changes very rarely (a movie poster may not change even once a day). Make it cheap, so the database keeps all its power for booking. Let us build it from zero:` },
      { type: 'steps', items: [
        { t: 'v0: app → one server → SQL database', d: 'Every movie list, every showtime, every seat map straight from the database. Fine for a small site. On sale day the database gets tired from browsing alone, with no power left for booking.' },
        { t: 'v1: CDN edge', d: 'Posters and lists like "movies in Mumbai today" are the same for everyone. Keep them on a CDN near the user\'s city. Bad bots and DDoS (a flood of fake traffic sent on purpose) are also stopped here.' },
        { t: 'v2: Redis cache', d: 'Keep showtimes and the seat map in an in-memory cache, with a short TTL. If lakhs of people ask for the same seat map, ask the database only once.' },
        { t: 'v3: Elasticsearch', d: 'A search like "coldplay" is heavy for the database. Give search to a separate search engine.' },
      ]},
      { type: 'callout', tone: 'term', title: 'New words: CDN, Redis cache, Elasticsearch', html: `<strong>CDN:</strong> cache servers placed in cities across the country. They serve things that are the same for everyone (posters, lists) from near the user (<a href="#/cdn">CDN lesson</a>).<br><strong>Redis cache:</strong> a very fast key-value store that runs in memory (RAM). Things like "the seat map of show 9001" in milliseconds (<a href="#/caching">Caching lesson</a>).<br><strong>Elasticsearch:</strong> a database made for search: find by name, venue and date, even with typos (<a href="#/search">Search lesson</a>).<br><strong>Without them:</strong> every click goes to the database, and the database has no power left for the real work of booking.` },
      { type: 'p', html: `This layering is the common industry approach; for its own case, BookMyShow has only made public that it uses Cloudflare as its first line of defence (the Cloudflare case study mentioned 60M+ registered users and 5 billion+ monthly pageviews at the time it was written; the case study is old and has no date on the page). Now run it:` },
      { type: 'flow', title: 'Browsing: movies, shows, seat map', height: 330,
        nodes: [
          { id: 'u', label: 'User app', sub: 'web / mobile', x: 76, y: 165, w: 124, kind: 'client', info: 'What it is: an app or website like BookMyShow, on the user\'s phone or laptop. The user picks a city, looks at movies, picks a showtime, then opens the seat map.' },
          { id: 'cdn', label: 'CDN / edge', sub: 'posters, lists', x: 236, y: 165, w: 128, kind: 'edge', info: 'What it is: the cache server near the user\'s city. Posters, trailers, and lists like "movies in Mumbai today" that are the same for everyone. DDoS and bad bots are stopped right here at the edge (BookMyShow\'s Cloudflare case study talks about exactly this).' },
          { id: 'api', label: 'Catalog API', sub: 'stateless', x: 410, y: 165, w: 132, kind: 'server', info: 'What it is: stateless servers (they keep no memory of the user) that serve the catalog, shows and seat map. They have no data of their own; they read from the cache, search and the database.' },
          { id: 'rc', label: 'Redis cache', sub: 'shows, seat map', x: 610, y: 55, w: 140, kind: 'cache', info: 'What it is: a fast in-memory cache. A cache of showtimes and the catalog (TTL of minutes). Also a short cache of the seat map (a few seconds), because in a big sale lakhs of people ask for the same seat map again and again.' },
          { id: 'es', label: 'Elasticsearch', sub: 'event search', x: 610, y: 165, w: 140, kind: 'data', info: 'What it is: an engine made for search. Search movies, events and venues by name, with filters (language, genre, date). Kept in sync with the database (CDC, which turns every database change into an event, or app events). Search details are in the <a href="#/search">Search lesson</a>.' },
          { id: 'db', label: 'SQL database', sub: 'source of truth', x: 610, y: 275, w: 140, kind: 'data', info: 'What it is: the home of the real data (source of truth = the place whose data counts as the truth). Shows, ShowSeat, Bookings. Strong consistency for seats comes from here. Most browsing load should never reach it.' },
        ],
        edges: [{ a: 'u', b: 'cdn' }, { a: 'cdn', b: 'api' }, { a: 'api', b: 'rc' }, { a: 'api', b: 'es' }, { a: 'api', b: 'db' }],
        scenarios: [
          { name: 'Movies list (CDN hit)', steps: [
            { title: 'Movies in Mumbai', text: 'This list is the same for every user in Mumbai.', go: 'u>cdn', msg: 'GET /cities/mumbai/movies' },
            { title: 'Answer from the edge', text: 'The CDN has a copy. Our servers did not even notice.', go: 'res:cdn>u', set: { api: { state: 'dim' }, db: { state: 'dim' } }, after: { cdn: { state: 'hit', sub: 'HIT' } } },
          ]},
          { name: 'Search', steps: [
            { title: 'The user typed "coldplay"', go: ['u>cdn', 'cdn>api'], text: 'Search is not personal, but queries are all very different, so it goes straight to the API.', msg: 'GET /search?q=coldplay&city=mumbai' },
            { title: 'Elasticsearch', text: 'Search by name, venue and date. The SQL database is not touched at all.', go: ['api>es', 'res:es>api', 'res:api>cdn>u'], after: { es: { state: 'hit' } } },
          ]},
          { name: 'Seat map', intro: 'The seat map is the "freshest" data: which seat is free right now.', steps: [
            { title: 'Seat map requested', go: ['u>cdn', 'cdn>api'], text: 'It cannot be cached long on the CDN; seats change within seconds.', msg: 'GET /shows/9001/seats' },
            { title: 'Short cache, then the database', text: 'If Redis has a snapshot that is 2-3 seconds old, return it. Otherwise read from the database and cache it. A slightly old map is fine, because the real decision happens at the hold, not while looking at the map.', go: ['api>rc', 'bad:rc>api', 'api>db', 'res:db>api', 'api>rc', 'res:api>cdn>u'], after: { rc: { state: '', sub: 'map, 3 s TTL' } } },
          ]},
        ],
      },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"The seat map can be stale, so we will get double booking!" No. The seat map is only for <em>display</em>. The job of stopping double booking belongs to the atomic step of the <strong>hold</strong>, which always runs on the source of truth. If the map was old, the only result is that you get "this seat was just taken" (409), and the map refreshes.` },
      { type: 'h2', text: 'Deep dive 1: one seat, two people, the same millisecond' },
      { type: 'p', html: `The simplest code that every beginner writes:` },
      { type: 'code', text: `seat = db.query("SELECT status FROM show_seats WHERE show=9001 AND seat='A4'")
if seat.status == 'FREE':                      # check
    db.exec("UPDATE show_seats SET status='HELD', hold_id=... WHERE ...")   # act
    return 201
return 409` },
      { type: 'p', html: `Riya's and Aman's requests arrived in the same millisecond. Both ran SELECT, both saw FREE, both ran UPDATE, both got 201. One seat, two tickets. This is called a <strong>check-then-act race</strong>: the small gap between the check and the act is the bug. There are three solid ways to close this gap.` },
      { type: 'callout', tone: 'term', title: 'New word: race condition (check-then-act)', html: `<strong>What it is:</strong> when two jobs run at the same time and the result depends on who arrives at which moment. In "first look (check), then do (act)" code there is a small gap between looking and doing. Another request slips into that gap.<br><strong>Why it matters:</strong> on a normal day this gap is rarely hit. On sale day thousands of people are on the same seat, so it happens every second.<br><strong>If not handled:</strong> two people get "success" for the same seat, both pay, and two people turn up for one seat in the hall.` },
      { type: 'p', html: `Watch it <strong>live</strong>. Riya and Aman both ask for A4; Aman's request is one millisecond behind Riya's. Pick a method and keep pressing "Next step". Run "Naive" first, then the other three (we explain each of them below):` },
      { type: 'custom', render(el) {
        const MODES = [['naive', 'Naive (check, then act)'], ['cond', 'Conditional update'], ['lock', 'FOR UPDATE lock'], ['redis', 'Redis SET NX']];
        el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">${MODES.map((m, i) => `<button type="button" class="chip bms-r-m${i ? '' : ' on'}" data-m="${m[0]}">${m[1]}</button>`).join('')}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary bms-r-n">Next step</button><button type="button" class="btn small ghost bms-r-a">All steps</button><button type="button" class="btn small ghost bms-r-z">Reset</button></div>
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
          q('.bms-r-note').innerHTML = n < r.steps.length ? 'Step ' + n + ' / ' + r.steps.length + '. Press "Next step".' :
            r.double ? '<strong style="color:var(--red)">Both got 201!</strong> Riya thinks the seat is hers, but in the database Aman overwrote her hold. Both will pay: one seat, two tickets (or Riya pays and gets no seat).' :
            '<strong style="color:var(--green)">Only one winner.</strong> Riya gets 201, Aman gets 409 and a fresh seat map. Check and act became one atomic step, so there is no gap left.';
        };
        el.querySelectorAll('.bms-r-m').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; k = 0; el.querySelectorAll('.bms-r-m').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
        q('.bms-r-n').addEventListener('click', () => { k++; draw(); });
        q('.bms-r-a').addEventListener('click', () => { k = 99; draw(); });
        q('.bms-r-z').addEventListener('click', () => { k = 0; draw(); });
        draw();
      }},
      { type: 'p', html: `In Naive there are 6 steps and both get 201. In the other three only Riya wins; the only difference is <strong>how the loser loses</strong>: with the conditional update and Redis, an instant 409; with the lock, Aman first <em>waits</em>, then gets 409. Now let us look at the three one by one.` },
      { type: 'callout', tone: 'term', title: 'New words: transaction, row-level lock', html: `<strong>Transaction:</strong> several database operations in one packet: either all of them happen (COMMIT), or none (ROLLBACK). Half-done work never stays behind.<br><strong>Row-level lock:</strong> while one request is changing a row, the database puts a "do not touch right now" lock on that row. Another request must wait for that row; other rows keep working normally.<br><strong>Why we need them:</strong> these two things turn check and act into one atomic step (a step that cannot be split).` },
      { type: 'h3', text: 'Option 1: conditional update (simplest and most popular)' },
      { type: 'code', text: `UPDATE show_seats
   SET status = 'HELD', hold_id = 'h_77', hold_expires_at = now() + interval '8 minutes'
 WHERE show_id = 9001
   AND seat_id IN ('A4', 'A5')
   AND (status = 'FREE' OR (status = 'HELD' AND hold_expires_at < now()));

-- rows updated == 2 ?  → hold placed (COMMIT)
-- fewer rows?          → ROLLBACK, 409 Conflict` },
      { type: 'p', html: `Check and act are now in <strong>one statement</strong>, and the database runs it atomically with a row-level lock. Two people cannot change the same row at the same time: the first wins, the second's condition fails, 0 rows. For a multi-seat hold, do it in a transaction and check "did as many rows change as seats I asked for?", so a hold with only half the seats is never created. Expired holds do not need a separate cleanup job: the condition itself treats them as FREE.` },
      { type: 'h3', text: 'Option 2: pessimistic lock (SELECT ... FOR UPDATE)' },
      { type: 'p', html: `Inside a transaction, first lock the rows with <code>SELECT ... FOR UPDATE</code>, check, update, commit. The other request waits until the lock is released. This is correct, but on hot seats people stand in line and connections get stuck. Always take locks in the same order (for example by seat ID), or two multi-seat holds can wait for each other forever in a <strong>deadlock</strong>.` },
      { type: 'h3', text: 'Option 3: hold in Redis, final booking in the database' },
      { type: 'code', text: `SET hold:9001:A4 h_77 NX PX 480000     # NX = set only if the key does not exist
                                       # PX = delete by itself after 8 minutes
# multi-seat: one Lua script that checks all keys and sets all or nothing` },
      { type: 'p', html: `First, some words: <strong>Lua script</strong> = a small program that runs inside Redis; it runs all at once, and no other command can slip in between. <strong>Single-threaded</strong> = Redis runs one command at a time, in order. <strong>Failover</strong> = when the main machine dies, its copy (replica) takes over. Now: Redis is single-threaded, so <code>SET NX</code> is atomic, and <code>PX</code> gives the TTL automatically: no cleanup for expired holds. Very fast, so it protects the database during a flash-sale spike. But now state lives in two places: Redis (holds) and the database (bookings). When writing the final BOOKED, the database also needs a conditional update, and holds can be lost on a Redis restart or failover (so there too, the database is the final truth). This is exactly the roadmap's building block: <em>SQL row locks or conditional updates for seats, Redis TTL holds while the user pays</em>.` },
      { type: 'table', head: ['', 'Conditional update', 'FOR UPDATE lock', 'Redis SET NX PX'], rows: [
        ['Stops double booking?', 'Yes', 'Yes', 'Yes (if the final write is also conditional)'],
        ['Behaviour on a hot seat', 'The loser gets 409 at once', 'The loser waits', 'The loser fails at once'],
        ['TTL / expiry', 'Column + condition', 'Column + cleanup', 'Built in'],
        ['Complexity', 'Low', 'Medium (deadlocks)', 'High (keeping two systems in sync)'],
        ['When', 'Default choice', 'When there is complex logic after the read', 'A very big spike, when the database must be protected'],
      ]},
      { type: 'callout', tone: 'tip', title: 'Optimistic concurrency (version number)', html: `Another variant: a <code>version</code> column in every row. Remember the version when you read, add <code>WHERE version = 7</code> when you write, and set the version to 8. If someone changed it in between, 0 rows → try again. This is the general form of Option 1, and it works well when clashes are rare. In a flash sale clashes are very common, so there it is better to return 409 + a new seat map directly instead of retrying.` },
      { type: 'h2', text: 'Try it: seat holds, expiry, confirm vs timeout' },
      { type: 'p', html: `A tiny hall: 2 rows × 8 seats. 8 people (U1-U8) arrive at different minutes, and all want the middle (best) seats. Some pay quickly, U3 leaves without paying, U4 pays very late. You are in the game too: click free seats, press "Hold", then move time forward and press "Pay". Switch the mode and see what naive code does.` },
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
            <button type="button" class="btn small ghost bms-run">Run to minute 15</button>
            <button type="button" class="btn small ghost bms-reset">Reset</button>
          </div>
          <div style="text-align:center;font-size:12px;color:var(--ink-3);letter-spacing:.2em;margin:4px 0">SCREEN THIS WAY</div>
          <div class="bms-grid" style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:5px;max-width:520px;margin:0 auto"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0">
            <span class="bms-you" style="font-size:14px"></span>
            <button type="button" class="btn small primary bms-hold">Hold</button>
            <button type="button" class="btn small ghost bms-pay">Pay</button>
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
          q('.bms-tv').textContent = st.ttl + ' minutes';
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
          const yh = you ? `Your hold: ${you.seats.join(',')} (${you.state === 'HELD' && you.exp <= st.m ? 'EXPIRED' : you.state}${you.state === 'HELD' ? ', expiry minute ' + you.exp : ''})` : 'Picked seats: ' + (sel.join(', ') || 'none (click a free seat)');
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
          if (you && you.state === 'HELD' && you.exp > st.m) { msg = 'you already have a hold'; return draw(); }
          if (!sel.length) { msg = 'pick seats first'; return draw(); }
          const h = tryHold(st, 'You', sel.slice(), st.snap); sel = [];
          if (h) { you = h; msg = 'hold placed, now pay'; } else msg = '409: someone else took it';
          draw();
        };
        q('.bms-pay').onclick = () => {
          if (!you || you.state === 'BOOKED') { msg = you ? 'already booked' : 'get a hold first'; return draw(); }
          msg = payHold(st, you) ? 'ticket confirmed!' : 'late: refund'; draw();
        };
        reset();
      }},
      { type: 'p', html: `With the default (atomic, TTL 5 min), press "Run to minute 15" and read the log: at minute 0, U1 and U2 saw the same snapshot and both asked for A4,A5; U1 won, U2 got 409 and took A2,A3 the next minute. U3 held B3-B5 and never paid: the hold expired at minute 6, and in that same minute U6 took B4,B5. U4 paid at minute 8, after the hold had ended at minute 7: <strong>refund</strong>. Double-booked seats: <strong>0</strong>.` },
      { type: 'p', html: `Now <strong>Naive</strong> mode: U1 and U2 both get a hold on A4,A5 and both pay: 2 seats double-booked (red). Set the TTL to 3 (atomic): even genuine payers are pushed out too early, 3 refunds. Set it to 8: 0 refunds, but the seats U3 abandoned stay blocked until minute 9, so U6 cannot get them. The TTL is a <strong>business trade-off</strong>: short = abandoned seats come back fast, but slow payers (OTP, switching to the UPI app) lose out; long = the opposite.` },
      { type: 'h2', text: 'Deep dive 2: hold → payment → confirm' },
      { type: 'callout', tone: 'term', title: 'New word: payment gateway (PSP)', html: `<strong>What it is:</strong> an outside company (like Razorpay or PayU) that collects money through UPI, cards and netbanking. PSP = Payment Service Provider.<br><strong>Why we need it:</strong> connecting directly to banks and UPI, fraud checks, refunds: building all this yourself is very hard and regulated work.<br><strong>Without it:</strong> a separate integration with every bank. And note: the gateway's answer can arrive late, arrive twice, or sometimes be "unknown". Our design must be ready for all of these.` },
      { type: 'p', html: `Payment is not in our hands: the user goes to a UPI app or a bank page, types an OTP, and sometimes the network drops. This can take minutes, and sometimes the result is "unknown". So the seat decision happens in two steps: first a <strong>hold</strong> (the seat is safe with us), then, when the payment result arrives, <strong>confirm</strong> (or release). The flow below is a common design, not any company's exact internal design:` },
      { type: 'flow', title: 'Booking: hold, pay, confirm', height: 340,
        nodes: [
          { id: 'u', label: 'User app', sub: 'seats picked', x: 80, y: 170, w: 124, kind: 'client', info: 'What it is: the user\'s app. The user picked A4 and A5 and pressed "Book". With every booking request the app sends an Idempotency-Key (a random ID), so a retry never creates a second booking.' },
          { id: 'bk', label: 'Booking service', sub: 'holds + orders', x: 280, y: 170, w: 150, kind: 'server', info: 'What it is: the brain of booking, a stateless service. Seat hold, booking record, starting payment, and confirm or release when the payment result arrives. Stateless; all state lives in Redis and the database. It also stores idempotency keys (key → first reply).' },
          { id: 'rd', label: 'Redis holds', sub: 'SET NX PX', x: 500, y: 58, w: 140, kind: 'cache', info: 'What it is: holds kept in Redis, each with a TTL. A fast gate during a spike: keys like hold:9001:A4, with a TTL. Whoever loses here never needs to reach the database (409 at once). The database load drops a lot.' },
          { id: 'db', label: 'Seat DB (SQL)', sub: 'source of truth', x: 500, y: 170, w: 140, kind: 'data', info: 'What it is: the SQL database, the source of truth for seats. ShowSeat and Booking tables. The final BOOKED is always written here, with a conditional update: only if the seat still belongs to this hold. Even if Redis forgets something, double booking is stopped here.' },
          { id: 'pg', label: 'Payment gateway', sub: 'UPI / cards', x: 500, y: 282, w: 140, kind: 'net', info: 'What it is: an outside payment company (PSP). It sends the user to a payment page or UPI, and tells us the result through a webhook (a server-to-server call). Sometimes the webhook is late, sometimes it comes twice: so the handler must be idempotent.' },
        ],
        edges: [{ a: 'u', b: 'bk' }, { a: 'bk', b: 'rd' }, { a: 'bk', b: 'db' }, { a: 'bk', b: 'pg' }],
        scenarios: [
          { name: 'Happy path', steps: [
            { title: 'Ask for a hold', text: 'The user picked A4 and A5.', go: 'u>bk', msg: 'POST /shows/9001/holds  { "seats": ["A4","A5"] }' },
            { title: 'Redis gate: got it', text: 'A Lua script checked both keys and set them together, with an 8-minute TTL.', go: ['bk>rd', 'res:rd>bk'], after: { rd: { state: 'ok', sub: 'A4,A5 → h_77' } }, msg: 'SET hold:9001:A4 h_77 NX PX 480000  → OK (x2)' },
            { title: 'Hold + booking in the database', text: 'A conditional update makes ShowSeat HELD (with expiry), and a Booking row is PENDING_PAYMENT.', go: ['bk>db', 'res:db>bk'], after: { db: { sub: 'A4,A5 HELD' } } },
            { title: 'Payment', text: 'The user is sent to the gateway. The timer is running (the user sees a countdown).', go: ['res:bk>u', 'bk>pg'], msg: '{ holdId: "h_77", expiresAt: "10:15", payUrl: ... }' },
            { title: 'Webhook: success', text: 'The gateway says the payment went through.', go: 'res:pg>bk', msg: 'POST /payments/webhook  { ref: "pay_9x", status: "SUCCESS" }' },
            { title: 'Confirm (conditional)', text: 'BOOKED only if the seat still belongs to h_77 and the hold has not expired. 2 rows changed: confirmed. A ticket event goes on the queue (email/SMS/QR).', go: ['bk>db', 'res:db>bk', 'res:bk>u'], after: { db: { state: 'ok', sub: 'A4,A5 BOOKED' } }, msg: "UPDATE show_seats SET status='BOOKED'\n WHERE hold_id='h_77' AND hold_expires_at > now()   → 2 rows" },
          ]},
          { name: 'Two people, one seat', steps: [
            { title: 'Aman also wants A4', text: 'Riya\'s hold was placed one millisecond earlier.', go: 'u>bk', msg: 'POST /shows/9001/holds  { "seats": ["A4"] }' },
            { title: 'Redis: NX fails', text: 'The key already exists, so SET NX did nothing. The database was never touched.', go: ['bk>rd', 'bad:rd>bk'], after: { rd: { state: 'hot', sub: 'A4 taken' } } },
            { title: '409 + new map', text: 'Aman gets "this seat was just taken" at once, plus a fresh seat map. No waiting, no hanging.', go: 'bad:bk>u', msg: '409 Conflict  { "taken": ["A4"] }' },
          ]},
          { name: 'Payment late', intro: 'The user took 12 minutes in the UPI app. The hold was for 8 minutes.', steps: [
            { title: 'Hold expires', text: 'The Redis key disappeared by itself; the database condition now also treats the seat as FREE. Someone else may already have taken A4.', set: { rd: { state: 'dim', sub: 'key expired' } }, focus: ['rd', 'db'] },
            { title: 'Late webhook: success', text: 'The money was taken, but...', go: 'res:pg>bk', msg: '{ ref: "pay_9x", status: "SUCCESS" }' },
            { title: 'Confirm fails → refund', text: 'The conditional update changed 0 rows. Never write BOOKED without the check. Booking EXPIRED, refund started, a clear message to the user.', go: ['bk>db', 'bad:db>bk', 'bk>pg'], after: { db: { state: 'warn', sub: '0 rows' }, pg: { sub: 'refund started' } }, msg: '0 rows updated → refund(pay_9x)' },
          ]},
          { name: 'Payment fails → release', intro: 'Riya\'s UPI payment failed (wrong PIN, or she pressed Cancel). The hold still has 6 minutes left.', steps: [
            { title: 'Webhook: failed', text: 'The gateway says the payment failed.', go: 'res:pg>bk', msg: '{ ref: "pay_9x", status: "FAILED" }' },
            { title: 'Release at once', text: 'Why wait for the TTL? The booking service makes the seats FREE right now: delete the Redis keys, and a conditional update in the database (only if the seat still belongs to h_77). Other fans can get the seat 6 minutes earlier.', go: ['bk>rd', 'bk>db', 'res:db>bk'], after: { rd: { state: 'dim', sub: 'keys deleted' }, db: { state: 'ok', sub: 'A4,A5 FREE' } }, msg: "DEL hold:9001:A4 hold:9001:A5\nUPDATE show_seats SET status='FREE'\n WHERE hold_id='h_77'   → 2 rows" },
            { title: 'Tell the user', text: 'Booking FAILED. Riya sees "payment did not go through, the seats were released" and an option to try again. The TTL is only a <strong>backup</strong>, for users who vanish without telling us.', go: 'res:bk>u', after: { bk: { sub: 'booking FAILED' } } },
          ]},
          { name: 'Double click / retry', steps: [
            { title: 'The user pressed "Pay" twice', text: 'Or the network dropped the first response and the app retried. Both requests carry the same Idempotency-Key.', parallel: true, go: ['u>bk', 'u>bk'], msg: 'POST /bookings  Idempotency-Key: 6f1c-...' },
            { title: 'Second time: the old reply', text: 'The booking service recognised the key and returned the reply of the first booking. No second booking, no second charge. (Details: <a href="#/pagination-idempotency">idempotency lesson</a>.)', go: 'res:bk>u', after: { bk: { state: 'ok', sub: 'same key → same reply' } }, msg: '201 { "bookingId": "b_501" }   (not created again)' },
          ]},
        ],
      },
      { type: 'callout', tone: 'warn', title: 'An "unknown" payment result', html: `The call to the gateway timed out: was the money taken or not? <strong>Do not treat this as a failure</strong>. Keep the booking PENDING, keep asking the gateway's status API (reconciliation), and confirm or refund when the final answer arrives. If payment success arrives after the hold expired, take the "late" path above: refund. The full payment state machine and reconciliation are topics of the <a href="#/distributed-tx">Sagas</a> and <a href="#/design-payments">Payments</a> lessons.` },
      { type: 'h2', text: 'Deep dive 3: virtual waiting room' },
      { type: 'p', html: `Seat locking stops double booking, but if 1.3 crore people hit the seat map, login and hold APIs at the same time, the servers and the database fall over first. And all the seats will go to only a few thousand people anyway. Think: <strong>why let everyone else in at all?</strong>` },
      { type: 'callout', tone: 'term', title: 'New word: Virtual waiting room', html: `<strong>What it is:</strong> an online "line" in front of the website. Only as many people get in as the site can handle; the rest wait on a light page that refreshes by itself and shows their position and estimated wait.<br><strong>Why we need it:</strong> if everyone rushes in at once (this is called a <strong>thundering herd</strong>), login, seat map and database all fall over, and nobody gets a ticket. The waiting room turns that crowd into a controlled stream.<br><strong>Without it:</strong> site crashes, error pages, and the winners are just lucky or bots.<br>This page is served from the edge (CDN), so lakhs of people can stand here without touching our servers.` },
      { type: 'callout', tone: 'term', title: 'New words: queue number, serving counter, signed token (JWT)', html: `<strong>Queue number:</strong> a growing number you get as soon as you join the line (like a token slip at a bank).<br><strong>Serving counter:</strong> "up to which number people may go in now". It grows slowly, based on the site's capacity.<br><strong>Signed token (like a JWT):</strong> a small digital pass with the waiting room's "signature" and an expiry time on it. The booking site checks this pass on every request; a fake pass does not match the signature.<br><strong>Why we need it:</strong> without the pass, anyone could skip the waiting room and hit the booking API directly.` },
      { type: 'flow', title: 'Waiting room: line, turn, token', height: 340,
        nodes: [
          { id: 'u', label: 'Fans', sub: 'lakhs, at once', x: 80, y: 170, w: 124, kind: 'client', info: 'What it is: the browsers and apps of lakhs of fans. When the sale starts, they all arrive at once. Each browser gets a cookie that holds its position and entry time.' },
          { id: 'bot', label: 'Bot', sub: 'scalper script', x: 80, y: 292, w: 124, kind: 'threat', hidden: true, info: 'What it is: a bot (an automatic script) that tries to grab tickets with thousands of requests (to resell them at a higher price later). It tries to hit the booking API directly.' },
          { id: 'wr', label: 'Waiting room', sub: 'at the edge', x: 280, y: 170, w: 140, kind: 'edge', info: 'What it is: a gate running on the CDN edge that decides who goes in. In Cloudflare Waiting Room the admin sets two numbers: total active users (how many people inside at once) and new users per minute. The queue can be FIFO or Random, and the waiting page refreshes every ~20 seconds.' },
          { id: 'qs', label: 'Queue service', sub: 'counters', x: 500, y: 60, w: 140, kind: 'cache', info: 'What it is: the service that keeps track of the line. A game of two numbers. In the AWS Virtual Waiting Room solution: every new person gets a growing queue number (a Redis/ElastiCache counter), and a "serving counter" that an operator or automation moves forward based on the site\'s capacity. Your number less than or equal to the serving counter = your turn.' },
          { id: 'site', label: 'Booking site', sub: 'token check', x: 500, y: 282, w: 140, kind: 'server', info: 'What it is: the real booking site (the hold → pay → confirm above). Seat map, holds, payment. Every request is checked for the signed, short-lived token (like a JWT) from the waiting room. No token = no entry, even if someone skips the waiting room and hits the API directly.' },
        ],
        edges: [{ a: 'u', b: 'wr' }, { a: 'bot', b: 'site', id: 'bs', hidden: true }, { a: 'wr', b: 'qs' }, { a: 'wr', b: 'site' }],
        scenarios: [
          { name: 'Sale starts', steps: [
            { title: 'Everyone at once', text: 'Lakhs of requests at 12:00:00.', flood: { paths: ['u>wr'], n: 12 }, after: { wr: { state: 'hot', sub: 'line forms' } } },
            { title: 'Give positions', text: 'Each browser got a queue number, saved in a cookie. The site takes in only as many people as it can handle; the rest see a light waiting page.', go: ['wr>qs', 'res:qs>wr', 'res:wr>u'], msg: 'Your number: 4,18,233   Estimated wait: ~40 min' },
            { title: 'The site stays calm', text: 'Only a controlled stream reaches the booking site. The database and seat locks work at normal speed.', set: { site: { state: 'ok', sub: 'steady load' } }, focus: ['site'] },
          ]},
          { name: 'Your turn', steps: [
            { title: 'The serving counter moves', text: 'Some people inside left (they booked, or their time ran out), so the serving counter went up.', go: ['wr>qs', 'res:qs>wr'], msg: 'serving: 4,18,300 ≥ yours 4,18,233 → go in' },
            { title: 'You get a token', text: 'The waiting room gave you a signed token, valid for a few minutes, and sent you to the site.', go: ['res:wr>u', 'wr>site'], after: { u: { state: 'ok', sub: 'got token' } }, msg: 'Set-Cookie: entry_token=eyJhbGciOi... (exp 10 min)' },
            { title: 'Pick seats', text: 'Now the hold → pay → confirm flow from above. According to Ticketmaster\'s post, when your turn comes your spot is held for 10 minutes to start shopping.', go: ['res:site>wr', 'res:wr>u'] },
          ]},
          { name: 'Bots and refresh', steps: [
            { title: 'Do not refresh', text: 'Your position is in the cookie, so refreshing does not lose your place. Ticketmaster\'s 2025 post even warns that refreshing by hand again and again can make you look like a bot.', go: ['u>wr', 'res:wr>u'], msg: 'same cookie → same position' },
            { title: 'A bot goes straight to the API', text: 'The script skips the waiting room and hits the booking API.', show: ['bot', 'bs'], go: ['bot>site', 'bad:site>bot'], after: { bot: { state: 'down', sub: 'blocked' } }, msg: 'POST /holds  (no entry token)  → 403' },
            { title: 'Layers of defence', text: 'Token check, per-account and per-IP rate limits, bot detection at the edge, and pre-registration for big events (like Ticketmaster Verified Fan). After the Coldplay sale, BookMyShow said suspicious traffic was handled within minutes.', focus: ['wr', 'site'] },
          ]},
        ],
      },
      { type: 'h3', text: 'The maths of the line: who gets in, and by when?' },
      { type: 'p', html: `These numbers are made up (only the 1.3 crore figure comes from BookMyShow's statement). Change them and see how the line behaves:` },
      { type: 'custom', render(el) {
        el.innerHTML = `<div class="row2">
            <div><label>People in line (lakhs)</label><input class="wr-q" type="number" value="130" min="1" step="1"></div>
            <div><label>Total tickets</label><input class="wr-t" type="number" value="150000" min="100" step="1000"></div>
            <div><label>Average tickets per order</label><input class="wr-a" type="number" value="3" min="1" max="10" step="1"></div>
            <div><label>Of the people let in, how many buy (%)</label><input class="wr-c" type="number" value="80" min="1" max="100" step="5"></div>
            <div><label>Admit rate (people per minute)</label><input class="wr-r" type="number" value="10000" min="100" step="500"></div>
            <div><label>Your queue number</label><input class="wr-p" type="number" value="418233" min="1" step="1"></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Orders possible</span><strong class="wr-o1"></strong></div>
            <div class="stat"><span>People we must let in</span><strong class="wr-o2"></strong></div>
            <div class="stat"><span>Sold out in</span><strong class="wr-o3"></strong></div>
            <div class="stat"><span>Chance for anyone in line</span><strong class="wr-o4"></strong></div>
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
            ? `Number ${fmt(pos)}: your turn comes in ~${wait.toFixed(1)} minutes, and tickets will still be left.`
            : `Number ${fmt(pos)}: your turn would come in ~${wait.toFixed(1)} minutes, but tickets run out in ~${r.minutes.toFixed(1)} minutes. A good system tells you this early ("not enough tickets") instead of keeping you in line for an hour.`;
        };
        el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
      }},
      { type: 'p', html: `With the default numbers: 50,000 orders, admitting ~62,500 people is enough, tickets sell out in ~6 minutes, and any one person in a line of 1.3 crore has a ~0.5% chance. Raise the admit rate and tickets sell out even faster, but the site carries more load. Lower it and the site is safe, but people wait longer. <strong>Admit rate = the site's capacity</strong>, and it is set by load testing, not by guessing.` },
      { type: 'table', head: ['Who', 'What is public'], rows: [
        ['Cloudflare Waiting Room (docs)', 'Decisions at the edge through Workers; the admin sets "total active users" and "new users per minute"; FIFO or Random queueing (Random = no guarantee even for early arrivals, a fairer chance); the waiting page refreshes every ~20 s; position kept in a cookie.'],
        ['AWS Virtual Waiting Room (solution)', 'Queue counter + serving counter (ElastiCache Redis), an API for your position, and a signed JWT when your turn comes; the target site\'s authorizer checks the token on every request.'],
        ['Ticketmaster Smart Queue (2025 post)', 'The waiting room usually opens 15-30 minutes before the sale; arrive after the sale starts and you go to the back of the line; do not refresh by hand; a 10-minute held spot when your turn comes.'],
        ['Ticketmaster, Eras Tour presale (Nov 2022)', 'According to their statement, bots and fans without invite codes caused 3.5 billion system requests, 4 times their previous peak; the site stalled many times and the public sale had to be cancelled.'],
        ['BookMyShow, Coldplay (Sep 2024)', '1.3 crore (13 million) fans logged in, a queueing system, suspicious traffic handled (Pollstar report). Which vendor or tool was used is not in their primary sources.'],
      ]},
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Once we have a waiting room, we do not need seat locking." Wrong. The waiting room only controls <em>how many people</em> get in; the 10,000 people inside still click on the same seats. You need both: waiting room = load control, atomic hold = correctness.` },
      { type: 'h2', text: 'What is public about BookMyShow' },
      { type: 'table', head: ['Source (year)', 'What it said', 'Where it fits in the design'], rows: [
        ['Cloudflare case study (old, no date on the page)', 'India\'s largest ticketing company, 60M+ registered users, 5 billion+ monthly pageviews; Cloudflare as the first line of defence (DDoS); attack bursts up to 50 Gbps with no downtime; some business logic at the edge.', 'CDN / edge layer, bot and DDoS protection'],
        ['PingCAP (TiDB) case study (undated)', 'Moved to microservices; transactional data streams from MS SQL through Kafka into TiDB (their big data platform); earlier they used Galera, which had scaling problems.', 'The booking database is SQL; events go through Kafka to analytics'],
        ['AWS Big Data blog (2023)', 'A run rate of ~200 million tickets a year; moved a 15-year-old analytics stack to AWS (S3, EMR, Redshift, Glue); 100+ Kafka consumers from transaction systems.', 'Analytics in a separate pipeline, not on the booking path'],
        ['Pollstar report (2024)', 'Coldplay sale: 13 million fans logged in, a queueing system, suspicious traffic handled.', 'Waiting room deep dive'],
      ]},
      { type: 'p', html: `One more thing that is common in this industry, though BookMyShow has not described it publicly for its own case: cinema seats often live in the cinema's own ticketing software (box office / POS system), and the aggregator app checks seat availability and books through those systems\' APIs. So in movie booking, the "source of truth for a seat" is sometimes the cinema\'s system rather than our database, and the hold/confirm decision also comes from there. For big concerts (where the platform itself is the primary ticket seller), the inventory lives with the platform. Mention this difference in an interview and the interviewer will be happy.` },

      { type: 'h2', text: 'One app, two choices: CP and AP' },
      { type: 'p', html: `The Decide rule from the <a href="#/cap">CAP lesson</a> fits perfectly here: "what is worse, showing wrong data or showing an error?" A double-booked seat is the worst kind of wrong data, so for seats choose <strong>consistency (CP)</strong>: if there is a network partition (the connection between machines breaks) or the database primary is down, stop booking; never hand out a wrong hold. But for movie reviews, ratings and counters like "how many people are interested", choose <strong>availability (AP)</strong>: a review that shows up 30 seconds late hurts no one, and an error for that feature is worse.` },
      { type: 'table', head: ['Feature', 'Choice', 'Why'], rows: [
        ['Seat hold / booking', 'CP (single primary, atomic updates)', 'Double booking = money and trust both lost'],
        ['Payment status', 'CP + reconciliation', 'An "unknown" result cannot be treated as a failure'],
        ['Seat map display', 'A little stale is OK (seconds)', 'The real decision happens at the hold'],
        ['Movie list, showtimes', 'Cache/CDN, minutes stale is OK', 'Read-heavy, changes rarely'],
        ['Reviews, ratings, likes', 'AP', 'Delay is fine, errors are not'],
      ]},

      { type: 'h2', text: 'What can break' },
      { type: 'table', head: ['Failure', 'What happens', 'Protection'], rows: [
        ['Check-then-act code', 'Double booking', 'Conditional update / row lock / SET NX; the confirm is conditional too'],
        ['User left without paying', 'The seat stays stuck forever', 'Hold TTL; after expiry the seat becomes FREE by itself'],
        ['Payment arrived after the hold expired', 'Money taken, no seat', 'Confirm updates 0 rows → automatic refund + clear message'],
        ['Double click / retry', 'Two bookings / two charges', 'Idempotency-Key; idempotent webhook handler'],
        ['Traffic spike at the sale', 'Login, seat map and database all fall over', 'Waiting room, pre-scaling (add machines before the sale), CDN, short cache for the seat map'],
        ['Bots / scalpers', 'Real fans get no tickets', 'Bot detection at the edge, token check, per-account limits, pre-registration'],
        ['Holds lost during a Redis failover', 'Two people reach payment for the same seat', 'The database\'s conditional confirm is the final gate; refund the loser'],
        ['Lock contention on a hot show\'s rows', 'Slow database, timeouts', 'Redis gate first (losers never reach the database), short transactions, an instant 409 for losers'],
      ]},
      { type: 'h2', text: 'How to say it in an interview' },
      { type: 'steps', items: [
        { t: 'Requirements', d: 'Browse (read-heavy, cache) vs book (contention, no double booking). Average ~6 tickets/sec, but crores of people at a sale: design for the spike.' },
        { t: 'Data model', d: 'One ShowSeat row per show per seat: FREE → HELD (with expiry) → BOOKED. Booking and Payment are separate tables.' },
        { t: 'Seat locking', d: 'Atomic hold: conditional UPDATE (rows == seats asked for) or a Redis SET NX PX gate; the final confirm is always conditional in the database.' },
        { t: 'Payment', d: 'Hold → pay → webhook → conditional confirm; late = refund; failed = release now; Idempotency-Key; unknown = PENDING + reconcile.' },
        { t: 'Spike', d: 'Waiting room at the edge (queue number + serving counter + signed token), bot defence, CDN for browsing, Elasticsearch for search.' },
        { t: 'CAP', d: 'Seats CP, reviews and counters AP.' },
      ]},
      { type: 'callout', tone: 'why', title: 'Decide', html: `When many people want <strong>the same thing</strong> at the same time: (1) for correctness, make check and act one atomic step (conditional update, row lock, or SET NX); (2) for "keep it for a while", use a hold with a TTL, never a lock without expiry; (3) for load, use a waiting room that lets in only as many people as the system can handle; (4) where showing wrong data is worse than an error (seats, money), choose CP; elsewhere (reviews, counts), AP.` },

      { type: 'diagram', title: 'The whole design at a glance', height: 590,
        caption: 'Top: browsing, which comes mostly from caches. Middle: booking, where the contention is (waiting room, holds, source-of-truth database, payment). Bottom right: async work after booking. Use the buttons to see one path at a time.',
        groups: [
          { label: 'Users', x: 10, y: 140, w: 160, h: 106 },
          { label: 'Browsing (read-heavy, cached)', x: 190, y: 30, w: 522, h: 100 },
          { label: 'Booking (contention here)', x: 190, y: 246, w: 350, h: 206 },
          { label: 'Outside', x: 556, y: 246, w: 156, h: 96 },
        ],
        nodes: [
          { id: 'fans', label: 'Fans', sub: 'app / web', x: 90, y: 195, kind: 'client', info: 'What it is: an app like BookMyShow on users\' phones and laptops. They browse, look at the seat map, hold seats and pay.' },
          { id: 'cdn', label: 'CDN edge', sub: 'posters, lists', x: 270, y: 90, kind: 'edge', info: 'What it is: cache servers near each city. Posters and movie lists are the same for everyone, so they come from here. Also the first block against DDoS and bad bots (BookMyShow\'s Cloudflare case study, which is old).' },
          { id: 'cat', label: 'Catalog API', sub: 'stateless', x: 450, y: 90, kind: 'server', info: 'What it is: stateless servers that serve movies, shows and the seat map. They read from the cache and search engine, and touch the database as little as possible.' },
          { id: 'es', label: 'Elasticsearch', sub: 'event search', x: 630, y: 90, kind: 'data', info: 'What it is: a search engine. Searches like "coldplay mumbai", with filters. Kept in sync with the database.' },
          { id: 'db', label: 'Seat DB (SQL)', sub: 'source of truth', x: 450, y: 195, kind: 'data', info: 'What it is: the ShowSeat, Booking and Payment tables. Every FREE → HELD → BOOKED change happens here through conditional updates. CP for seats: an error is better than a wrong hold.' },
          { id: 'rc', label: 'Redis cache', sub: 'shows, seat map', x: 630, y: 195, kind: 'cache', info: 'What it is: an in-memory cache. Showtimes (TTL of minutes) and the seat map (TTL of 2-3 seconds). If lakhs of people ask for the same seat map, the database is asked only once.' },
          { id: 'wr', label: 'Waiting room', sub: 'edge, queue', x: 270, y: 300, kind: 'edge', info: 'What it is: an online line in front of the site, at the edge. Only as many people get in as the site can handle (admit rate); when your turn comes you get a signed token.' },
          { id: 'bk', label: 'Booking service', sub: 'hold, pay, confirm', x: 450, y: 300, kind: 'server', info: 'What it is: the brain of booking. Token check, atomic hold, Idempotency-Key, starting payment, conditional confirm or release on the webhook, refund for late payments.' },
          { id: 'pg', label: 'Payment gateway', sub: 'UPI / cards', x: 630, y: 300, kind: 'net', info: 'What it is: an outside payment company (PSP). It reports the result through a webhook, which can arrive late, twice, or even as "unknown".' },
          { id: 'qs', label: 'Queue service', sub: 'number + counter', x: 270, y: 410, kind: 'cache', info: 'What it is: the bookkeeping of the line. Every new fan gets a queue number, and a serving counter moves forward based on capacity (like the AWS waiting room solution).' },
          { id: 'rh', label: 'Redis holds', sub: 'SET NX, TTL 8 min', x: 450, y: 410, kind: 'cache', info: 'What it is: the fast gate. hold:show:seat keys with NX (the first one wins) and a PX TTL (they expire by themselves). Losers never reach the database.' },
          { id: 'k', label: 'Kafka events', sub: 'booking events', x: 630, y: 410, kind: 'queue', info: 'What it is: a line of events. Events like "booking confirmed" go here, and then tickets, notifications and analytics follow at their own speed. BookMyShow\'s public case studies mention transaction data flowing through Kafka to analytics.' },
          { id: 'nt', label: 'Ticket + notify', sub: 'QR, SMS, email', x: 630, y: 520, kind: 'server', info: 'What it is: making the ticket (QR) and sending SMS, email and push. Kept apart from the booking path so a slow SMS never slows booking. Common industry approach.' },
        ],
        edges: [
          { a: 'fans', b: 'cdn', label: 'browse' }, { a: 'cdn', b: 'cat' }, { a: 'cat', b: 'es' }, { a: 'cat', b: 'rc' }, { a: 'cat', b: 'db' },
          { a: 'fans', b: 'wr', n: 1, label: 'book' }, { a: 'wr', b: 'qs', dashed: true }, { a: 'wr', b: 'bk', n: 2 },
          { a: 'bk', b: 'rh', n: 3 }, { a: 'bk', b: 'db', n: 4 }, { a: 'bk', b: 'pg', n: 5, both: true },
          { a: 'bk', b: 'k', kind: 'evt', label: 'booked' }, { a: 'k', b: 'nt', kind: 'evt' },
        ],
        paths: [
          { name: 'Browse', text: 'The movie list comes from the CDN, search from Elasticsearch, the seat map from the Redis cache (2-3 s). The database is reached only on a cache miss. The seat map may be a little old: the real decision happens at the hold.', go: ['fans>cdn>cat>es', 'cat>rc', 'cat>db'] },
          { name: 'Hold seats', text: 'The waiting room gives a number in the line, and a token when it is your turn. Booking service: Redis SET NX (first one wins, others get 409) → database conditional update (FREE → HELD, with expiry).', go: ['fans>wr>qs', 'wr>bk>rh', 'bk>db'] },
          { name: 'Pay', text: 'Payment at the gateway → success webhook → conditional confirm (only if the hold is still yours) → BOOKED → event on Kafka → ticket and SMS. The Idempotency-Key makes a double click safe.', go: ['bk>pg', 'bk>db', 'bk>k>nt'] },
          { name: 'Hold expires', text: 'TTL over: the Redis key disappears by itself, the database condition treats the seat as FREE, and the seat goes to another fan. If payment fails, release at once. If payment arrives late, the confirm updates 0 rows → refund.', go: ['pg>bk>rh', 'bk>db'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
        <li>The average load is small (~6 tickets/sec), but at a sale crores of people want the same seats: design for the spike and the contention.</li>
        <li>Browsing is read-heavy: CDN, Redis cache, Elasticsearch. Save the database's power for booking.</li>
        <li>The seat map is only for display (a little old is fine); the real decision happens at the atomic hold.</li>
        <li>Check-then-act race = double booking. Fix: conditional UPDATE, FOR UPDATE lock, or Redis SET NX; the final confirm is always conditional in the database.</li>
        <li>A hold always has a TTL: abandoned seats come back by themselves. Payment failed = release at once; payment late = refund.</li>
        <li>Idempotency-Key and an idempotent webhook: a double click never makes two bookings or two charges.</li>
        <li>Waiting room = load control (queue number, serving counter, signed token). Seat locking = correctness. You need both.</li>
        <li>Seats CP, reviews and counters AP. BookMyShow's internal design is not public; this is the common industry approach.</li>
      </ul>` },
      { type: 'tradeoffs',
        gains: ['Atomic hold: double booking practically impossible', 'TTL holds: abandoned seats come back by themselves', 'Waiting room: the site does not fall over in a spike, and the order of the line is clear', 'Redis gate: losing requests never reach the database', 'Cached browsing: database power is saved for booking'],
        costs: ['Hold TTL is a compromise: short = refunds for slow payers, long = seats stay stuck', 'Redis + DB = state in two places; you must care about sync and failover', 'People may wait in the waiting room for hours; fairness gets questioned', 'Operational work for refunds and reconciliation', 'CP for seats: database primary down = booking stops'],
      },

      { type: 'think', questions: [
        { q: 'The product team says: "Remove the hold TTL; the seat belongs to the user as long as they are on the payment page." What goes wrong?', a: 'A user who closed the tab and left keeps the seat stuck forever (or for a very long time); bots can hold seats to block them (inventory hoarding). The TTL is the guarantee that the seat comes back. Better: keep the TTL, show a countdown, and if needed extend it once a little when payment starts.' },
        { q: 'The Redis primary crashed, and some of the latest holds had not reached the replica. Riya and Aman both reached payment for A4. What happens?', a: 'The final confirm is a conditional update in the database: whoever\'s webhook arrives first, and whose hold_id the seat still matches, gets BOOKED. The other confirm updates 0 rows, so an automatic refund and a message follow. That is why Redis is only a fast gate; the database is the source of truth.' },
        { q: 'For the waiting room, would you choose FIFO or Random?', a: 'FIFO: first come, first served, but at the moment the sale starts it becomes a millisecond race and bots benefit. Random (a Cloudflare option): less advantage for fast internet or bots, a fairer chance. A good pattern: open the waiting room before the sale, put everyone already inside in random order when the sale starts, and put later arrivals at the back in FIFO order.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Why does "SELECT status; if FREE then UPDATE" code cause double booking?', options: ['SELECT is slow', 'Between the check and the act, another request also reads FREE', 'UPDATE fails'], answer: 1, explain: 'Check-then-act race. Fix: put the condition inside the UPDATE (WHERE status = FREE) and check the row count, or use a lock.' },
        { q: 'The payment success webhook arrived after the hold expired. What is the right behaviour?', options: ['Mark the seat BOOKED, the money has arrived', 'The conditional confirm fails; refund and tell the user', 'Ignore the webhook'], answer: 1, explain: 'After the hold expires the seat may belong to someone else. Writing BOOKED without a condition is double booking. Refund + a clear message.' },
        { q: 'In the race widget, how did the loser (Aman) differ between "FOR UPDATE lock" and "Conditional update"?', options: ['With the lock, Aman also won', 'With the lock, Aman first waits and then gets 409; with the conditional update, 409 at once', 'No difference'], answer: 1, explain: 'Both stop double booking. With a lock, the second request waits until the lock is released (connections pile up on a hot seat); with a conditional update its condition fails at once: 0 rows, 409.' },
        { q: 'Riya\'s UPI payment failed and her hold still has 6 minutes left. What does a good design do?', options: ['Wait for the TTL to run out', 'Release the seats at once (delete Redis keys + DB conditional update) and tell Riya', 'Mark the seat BOOKED and sort it out later'], answer: 1, explain: 'The TTL is only a backup for users who vanish without telling us. When we know for sure the payment failed, the seat goes back to other fans right away.' },
        { q: 'What is the main job of a virtual waiting room?', options: ['Stopping double booking', 'Limiting the flow of people into the site to its capacity', 'Making payments faster'], answer: 1, explain: 'The waiting room controls load; correctness still comes from the atomic hold. You need both.' },
        { q: 'In an app like BookMyShow, what CAP choice for seats and for reviews?', options: ['Both AP', 'Seats CP, reviews AP', 'Both CP'], answer: 1, explain: 'A double-booked seat is worse than an error (CP). A review that shows up late is fine, an error is worse (AP). One app, a different choice per feature.' },
      ]},
      { type: 'sources', note: 'BookMyShow has not publicly shared its internal seat-booking design in detail; the seat-locking and waiting-room parts of this lesson are based on the common industry approach and the official docs below.', items: [
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
