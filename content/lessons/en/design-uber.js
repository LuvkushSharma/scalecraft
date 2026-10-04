Lesson.register({
  id: 'design-uber',
  title: 'Uber / Ola',
  minutes: 45,
  summary: `The capstone of the course. Millions of drivers send their location every few seconds, and a rider wants the right driver within 2 seconds. Location firehose, H3 geo index, ETA-based matching, the trip state machine, surge pricing from stream processing, and the hand-off to payments: everything you have learned so far comes together here.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You open the app, tap "Book ride", and in 2-3 seconds you see a driver's name and car number.<br>Behind this, the phones of thousands of drivers in the city say "I am here" every few seconds.<br>The server must handle all these locations, pick the <em>right</em> driver near you, never give one driver to two people, and charge money only once at the end of the trip.<br>And when a match ends and everyone asks for a ride at the same time, it must raise the price a little and pull more drivers into that area.<br>This lesson builds all of this from zero.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Before you read on, think on paper for 10 minutes: where will you keep the live location of 1 million drivers? How will you find the "best" driver near a rider? How will you make sure one driver is not given to two riders at the same time? Then compare with this lesson.` },

    { type: 'p', html: `This lesson is based on public material from Uber's engineers: the Uber Engineering blog, Uber's official marketplace pages, a SIGMOD 2021 paper, and a 2015 talk by Uber's Chief Systems Architect. Uber's system has changed many times in 10+ years, so every fact has its year. Where Uber later replaced a component, the lesson says so. Ola has not published its internals in this much detail, so the design is built from Uber's sources. The core problems are the same for both.` },
    { type: 'p', html: `This lesson reuses building blocks from earlier lessons: <a href="#/ds-for-scale">H3 and geohash</a>, <a href="#/kafka">Kafka</a>, <a href="#/realtime">WebSockets and push</a>, <a href="#/consistent-hashing">consistent hashing</a>, <a href="#/distributed-tx">sagas</a>. We will not teach them again in full. But every new part gets a short card the first time it appears: what it is, why we need it, and what breaks without it.` },

    { type: 'h2', text: 'Step 0: the simplest version, and why it breaks' },
    { type: 'p', html: `Let us start from zero. Say xyz.com built a small ride app. There is one server and one database table called <code>drivers</code>. It stores each driver's latitude and longitude (two numbers that mark a place on Earth).` },
    { type: 'list', ordered: true, items: [
      `Every few seconds, the driver's phone tells the server: "I am here now". This is called a <strong>location ping</strong>. The server updates that driver's row in the table.`,
      `The rider taps "Book". The server measures the distance from the rider to every driver in the table and gives the ride to the closest one.`,
      `When the trip ends, the server charges the rider's card.`,
    ]},
    { type: 'p', html: `In a small town with 50 drivers, this works. Now think of 1 million drivers. This design breaks in five places:` },
    { type: 'table', head: ['Where it breaks', 'Why', 'Fixed in this lesson'], rows: [
      ['Location pings', 'Hundreds of thousands of updates every second; one database table cannot take that many writes, and the data is old after 4 seconds anyway', 'Steps 2 and 4: geo index in RAM, history in Kafka'],
      ['"Closest driver"', 'Measuring 1 million distances for every request is far too slow; and straight-line distance is not the real road distance', 'Deep dives 1 and 2: H3 cells, then ranking by road ETA'],
      ['One driver, two riders', 'If two requests arrive at the same moment, both can get the same driver', 'Step 5 and Deep dive 3: conditional write, state machine'],
      ['Money', 'If payment is slow, "End trip" gets stuck; a retry can charge twice', 'Deep dive 3 and Payments: events, idempotency, ledger'],
      ['Demand jumps 10 times', 'Everyone sees "no cars" and waits a long time', 'Deep dive 4: surge pricing, stream processing'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Latitude / longitude (lat/lng)', html: `<strong>What it is:</strong> the "address" of any place on Earth as two numbers. Latitude says how far north or south. Longitude says how far east or west. For example, MG Road in Bengaluru is about 12.9756, 77.6067.<br><strong>Why we need it:</strong> the phone's GPS gives exactly these two numbers, and the whole system works with them.<br><strong>Without it:</strong> there would be no common way to say where a driver is.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Rider enters pickup and drop, sees the fare and the pickup ETA<br>• Rider requests a ride and gets matched with a driver<br>• Driver accepts or rejects the offer<br>• Both see each other live on the map<br>• Trip start, trip end, then payment<br>• When demand is high, the price goes up (surge)<br><br><strong>Out of scope:</strong> ratings, details of pooling, driver onboarding` },
      right: { title: 'Non-functional', html: `• Fast match: within a few seconds<br>• Location intake must handle a huge number of writes per second<br>• One driver is never assigned to two riders (strong consistency here)<br>• A slightly old driver position on the map is fine (here freshness &gt; perfect consistency)<br>• High availability: a ride must not break halfway<br>• Money is charged exactly once` },
    },
    { type: 'callout', tone: 'term', title: 'New word: Strong consistency vs "a little old is fine"', html: `<strong>What it is:</strong> <strong>Strong consistency</strong> means whoever reads the data always gets the newest, correct value, and if two people write at the same time, their writes never get mixed up. The opposite: data can look a little old for a short time (<em>eventual consistency</em>), but the system stays fast and cheap.<br><strong>Why we need it:</strong> in a ride app, some data can be a little wrong (a driver shown at a spot from 4 seconds ago) and some data must never be wrong (one driver given to two riders).<br><strong>Without it:</strong> if everything is strong, the system is slow and expensive. If everything is loose, you get double bookings and double charges. Details are in the <a href="#/consistency">consistency lesson</a>.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"Make the whole system strongly consistent." No. Uber has two very different kinds of data. <strong>A driver's location</strong> changes every 4 seconds. A location that is 4 seconds old is fine, and if one ping is lost, the next one arrives soon. If <strong>trip and payment</strong> data is wrong, one driver is sent to two places or money is charged twice. The first kind needs speed. The second kind needs correctness. A good design treats them differently.` },

    { type: 'h2', text: 'Step 2: napkin maths, the location firehose' },
    { type: 'p', html: `In a 2015 talk, Uber's Chief Systems Architect Matt Ranney said the driver's phone sent its location every <strong>4 seconds</strong>, and the geo index was designed for a target of <strong>1 million writes per second</strong>. (The talk is from 2015; today's numbers will be different.) All other numbers below are made-up assumptions, not Uber's real numbers. Change the values and see:` },
    { type: 'callout', tone: 'term', title: 'New word: Firehose', html: `<strong>What it is:</strong> a firehose is the thick pipe firefighters use. In system design, it means a stream of data so fast and constant that you cannot handle each item carefully one by one (for example, by saving each one in a database).<br><strong>Why we need this idea:</strong> driver locations are a firehose: hundreds of thousands of small messages every second, and each message is old within a few seconds. So they need their own light, separate path.<br><strong>Without it:</strong> if pings are treated like normal "important data", the same database that holds trips and payments will fall over under the load of pings.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="uber-nd">Online drivers (in lakh)</label><input id="uber-nd" type="number" value="10" min="0.1" step="0.5"></div>
          <div><label for="uber-pi">Ping interval (seconds)</label><input id="uber-pi" type="number" value="4" min="1" step="1"></div>
          <div><label for="uber-pb">Bytes per ping</label><input id="uber-pb" type="number" value="100" min="20" step="10"></div>
          <div><label for="uber-rd">Rides per day (millions)</label><input id="uber-rd" type="number" value="20" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Location writes/s</span><strong class="o-w"></strong></div>
          <div class="stat"><span>Ingest bandwidth</span><strong class="o-bw"></strong></div>
          <div class="stat"><span>Raw pings per day</span><strong class="o-day"></strong></div>
          <div class="stat"><span>Geo index RAM</span><strong class="o-ram"></strong></div>
          <div class="stat"><span>Ride requests/s (peak ×3)</span><strong class="o-rq"></strong></div>
        </div>
        <div class="calc-note o-n"></div>`;
      const v = id => Math.max(0, Number(el.querySelector('#' + id).value) || 0);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : Math.round(n).toString();
      const sz = b => b >= 1e12 ? (b / 1e12).toFixed(1) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(0) + ' MB';
      const upd = () => {
        const drivers = v('uber-nd') * 1e5, iv = Math.max(1, v('uber-pi')), bytes = v('uber-pb'), rides = v('uber-rd') * 1e6;
        const w = drivers / iv, rq = rides / 1e5 * 3;
        el.querySelector('.o-w').textContent = f(w) + '/s';
        el.querySelector('.o-bw').textContent = sz(w * bytes) + '/s';
        el.querySelector('.o-day').textContent = sz(w * bytes * 86400);
        el.querySelector('.o-ram').textContent = sz(drivers * 200);
        el.querySelector('.o-rq').textContent = f(rq) + '/s';
        el.querySelector('.o-n').textContent = `Location writes are ~${Math.round(w / Math.max(rq, 1))}x more than ride requests. The geo index only needs the LATEST location of each driver (we assume ~200 bytes), which fits easily in RAM. The full history (raw pings) is a job for disk/Kafka, not the geo index. We assume one day ≈ 10^5 seconds.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Three conclusions: (1) Putting 250,000 writes per second on a normal SQL database is a waste, and that data is old after 4 seconds anyway. (2) Keep only the <em>latest</em> location of each driver in RAM (the computer's fast, temporary memory), inside a <strong>geo index</strong>. (3) If you need the full history (analytics, ETA models, disputes), send it to <a href="#/kafka">Kafka</a>, away from the geo index.` },
    { type: 'callout', tone: 'term', title: 'New word: Geo index', html: `<strong>What it is:</strong> a data structure that makes searching by place fast. Split the world into small boxes (cells), and keep a list for each box: "these drivers are in this cell right now". It is like a school keeping attendance class by class, not in one long list for the whole school.<br><strong>Why we need it:</strong> to find drivers near a rider, look only at the rider's cell and the cells next to it, not at 1 million drivers.<br><strong>Without it:</strong> every request would need the distance to every driver: hundreds of thousands of calculations, for thousands of requests every second.` },
    { type: 'callout', tone: 'term', title: 'New word: Kafka (event log)', html: `<strong>What it is:</strong> a long, append-only "register" where services write events (like "d17 was here at 18:42:03"), and other services read them at their own speed. Details are in the <a href="#/kafka">Kafka lesson</a>.<br><strong>Why we need it:</strong> the history of pings is needed by analytics, ETA models and surge, but not by matching. Kafka keeps the history without slowing matching down.<br><strong>Without it:</strong> to save history, the location service would have to wait for a database on every ping.` },

    { type: 'h2', text: 'Step 3: API and core entities' },
    { type: 'code', text: `
# Driver app: every ~4 s over one persistent connection (WebSocket)
→ { "type": "loc", "driver": "d17", "lat": 12.9756, "lng": 77.6067, "ts": 1720000000 }

# Rider: see fare + ETA
GET  /v1/estimate?from=12.97,77.60&to=12.93,77.62   →  { "fare": 212, "surge": 1.4, "pickupEta": "4 min" }

# Rider: ask for a ride (safe to retry)
POST /v1/rides   Idempotency-Key: 7f3c...
  body: { "from": {...}, "to": {...}, "product": "auto" }   →  202 { "rideId": "r9", "state": "REQUESTED" }

# Driver: answer an offer
POST /v1/offers/o55/accept   →  200 { "rideId": "r9", "state": "ACCEPTED" }

# Driver: trip steps
POST /v1/rides/r9/arrived | /start | /end` },
    { type: 'callout', tone: 'term', title: 'New word: Persistent connection (WebSocket)', html: `<strong>What it is:</strong> a connection between the phone and the server that opens once and stays open, so either side can send a message at any time. <a href="#/realtime">WebSocket</a> is the most common way to do this.<br><strong>Why we need it:</strong> the driver sends a ping every 4 seconds, and the server must send offers to the driver right away. Opening a new HTTPS connection each time (handshake, encryption setup) uses up the phone's battery and the server's CPU.<br><strong>Without it:</strong> a new connection for every ping, more delay, and the server cannot send anything to the driver on its own (it would have to wait for the driver to ask).` },
    { type: 'callout', tone: 'term', title: 'New word: Idempotency-Key', html: `<strong>What it is:</strong> a unique random ID sent with a request. The server remembers that the work for this ID is done. If the same ID comes again, it does not do the work again. It just returns the earlier answer.<br><strong>Why we need it:</strong> the network got stuck in the metro, and the app sent the "Book ride" request again. The server must know it is the same old request.<br><strong>Without it:</strong> one tap books two rides, or one trip is charged twice. Details are in the <a href="#/pagination-idempotency">idempotency lesson</a>.` },
    { type: 'table', head: ['Entity', 'What it is', 'Where it lives', 'How consistent'], rows: [
      ['DriverLocation', 'driver → latest lat/lng, cell, ts', 'In-memory geo index (+ stream to Kafka)', 'A little old is fine'],
      ['Driver (supply)', 'status: offline / available / offered / on_trip, vehicle', 'Strongly consistent store', 'Strict (must stop double assignment)'],
      ['Ride / Trip (demand)', 'rider, pickup, drop, state, driver, fare', 'Strongly consistent store', 'Strict'],
      ['Offer', 'ride → to one driver, with an expiry time', 'Strongly consistent store', 'Strict'],
      ['Surge', 'H3 cell → multiplier', 'Fast key-value store', 'A few seconds old is fine'],
    ]},

    { type: 'h2', text: 'Step 4: high-level design, part 1: the location path' },
    { type: 'p', html: `The heaviest traffic first. The driver app keeps a <strong>persistent connection</strong> (a new HTTPS handshake on every ping would be very expensive). First look at the wrong design, then the right one. Run all the scenarios:` },
    { type: 'callout', tone: 'term', title: 'New word: Gateway', html: `<strong>What it is:</strong> the layer of servers that holds the open connections (WebSockets) of millions of phones. It does no business logic itself: when a message arrives, it hands it to the right service inside, and when something must go out, it delivers it to the right phone. It is like the reception desk of a building.<br><strong>Why we need it:</strong> holding millions of open connections is heavy work by itself (memory, network). Keeping it separate lets the inner services do only their own job, and the gateways can be scaled on their own.<br><strong>Without it:</strong> every service would have to hold millions of connections itself, and deploying one service would disconnect all drivers.` },
    { type: 'callout', tone: 'term', title: 'New word: TTL (Time To Live)', html: `<strong>What it is:</strong> an expiry time on a piece of data. "This entry lives for 30 seconds. If no new update comes, it deletes itself."<br><strong>Why we need it:</strong> if a driver's phone switches off or enters a tunnel, it will not even send a "logout". The TTL removes the driver from the geo index by itself.<br><strong>Without it:</strong> the geo index fills up with "ghost" drivers who left long ago, and riders keep getting offered to them.` },
    { type: 'callout', tone: 'term', title: 'New word: H3 cell', html: `<strong>What it is:</strong> a system made by Uber that splits the whole world into small <strong>hexagons</strong> (six-sided boxes, like the cells of a honeycomb). Each hexagon has a fixed ID. The function <code>latLngToCell(lat, lng, res)</code> turns any place into the ID of its hexagon. <code>res</code> (resolution) sets how big the hexagons are.<br><strong>Why we need it:</strong> these hexagons are the "boxes" of the geo index. A ping arrives, we compute the cell ID, and the driver goes into that cell's list. It is pure maths, with no database call.<br><strong>Without it:</strong> there is no common, fast way to find each driver's cell. Details are in Deep dive 1.` },
    { type: 'flow', title: 'Location firehose', height: 330,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'ping every ~4 s', x: 85, y: 170, w: 130, kind: 'client', info: 'What it is: the app on the driver\'s phone. It reads its lat/lng from GPS and sends a ping every few seconds. According to Uber\'s 2015 talk, this interval was 4 seconds. The whole firehose starts here.' },
        { id: 'gw', label: 'WS gateway', sub: 'many connections', x: 255, y: 170, w: 140, kind: 'net', info: 'What it is: the servers that hold the open connections (WebSocket or similar) of millions of phones. Why: a new connection per ping is expensive. They forward every ping to the location service. They are stateless (they keep no important data): if one gateway dies, the phone reconnects to another.' },
        { id: 'loc', label: 'Location svc', sub: 'lat/lng → H3 cell', x: 440, y: 170, w: 150, kind: 'server', info: 'What it is: the service that handles every ping. It checks the ping (a sudden 5 km GPS jump, a fake location), turns lat/lng into an H3 cell, updates the geo index, and sends the ping to Kafka. It is split across many machines by cell (sharded), because one machine cannot handle so many pings.' },
        { id: 'geo', label: 'Geo index', sub: 'cell → drivers (RAM)', x: 630, y: 80, w: 150, kind: 'cache', info: 'What it is: a list kept in RAM: H3 cell → the available drivers in that cell and their latest location. Why: "nearby drivers" can be found in milliseconds. Every entry has a TTL, so a driver whose phone is off drops out by itself. In 2015 Uber used Google S2 cells here; in 2018 Uber open-sourced its own hexagon grid, H3.' },
        { id: 'kf', label: 'Kafka', sub: 'location stream', x: 630, y: 260, w: 150, kind: 'queue', info: 'What it is: an append-only log of the history of every ping. Analytics, ETA model training, the surge pipeline and the trip distance/fare calculation read from it. It is not on the geo index path, so even if Kafka is slow, matching does not stop.' },
        { id: 'db', label: 'SQL database', sub: 'naive design', x: 440, y: 55, w: 150, kind: 'data', hidden: true, info: 'What it is: the wrong design from Step 0: an UPDATE in a normal SQL table for every ping. 250,000 writes per second, and the data is old after 4 seconds. Shown only to see why it breaks.' },
      ],
      edges: [{ a: 'drv', b: 'gw' }, { a: 'gw', b: 'loc' }, { a: 'loc', b: 'geo' }, { a: 'loc', b: 'kf' }, { a: 'loc', b: 'db', id: 'ldb', hidden: true }],
      scenarios: [
        { name: 'Ping (happy path)', steps: [
          { title: 'Driver ping', text: 'The driver\'s phone sends its location over the connection that is already open.', go: 'drv>gw>loc', msg: '{ driver: "d17", lat: 12.9756, lng: 77.6067, ts }' },
          { title: 'Find the cell', text: 'latLngToCell(lat, lng, res) → H3 cell ID. Pure maths, no database call.', focus: ['loc'], msg: 'cell = 8961… (res 9)' },
          { title: 'Update index + stream', text: 'Put the driver in the new cell in the geo index (if the cell did not change, just refresh the location and the TTL). At the same time, send the ping to Kafka for history. The two jobs do not wait for each other.', parallel: true, go: ['loc>geo', 'evt:loc>kf'], after: { geo: { state: 'ok', sub: 'd17 updated' } } },
        ]},
        { name: 'Naive: every ping to the DB', intro: 'The first idea everyone has. See what happens.', steps: [
          { title: 'Every ping = one UPDATE', text: 'The location service updates the SQL table on every ping.', show: ['db', 'ldb'], set: { geo: { state: 'dim' }, kf: { state: 'dim' } }, go: 'drv>gw>loc>db', msg: 'UPDATE drivers SET lat=?, lng=? WHERE id=?' },
          { title: '250,000 writes per second', text: 'Hundreds of thousands of drivers, every 4 seconds. Disk, locks, indexes and replication are all overloaded. And the "nearby drivers" query must also scan lat/lng ranges on this same table.', flood: { paths: ['drv>gw>loc>db'], n: 14 }, after: { db: { state: 'hot', sub: 'overloaded' } } },
          { title: 'The DB falls over', text: 'The queue of writes kept growing, and matching reads timed out. Worst of all: all this data was useless after 4 seconds anyway. Fix: latest location in the geo index in RAM, history in Kafka.', set: { db: { state: 'down', sub: 'DOWN' } }, go: 'bad:db>loc' },
        ]},
        { name: 'Driver in a tunnel', steps: [
          { title: 'Pings stop', text: 'The driver went into an underpass, or closed the app. Pings stop coming.', go: 'lost:drv>gw', set: { drv: { state: 'warn', sub: 'no signal' } } },
          { title: 'TTL runs out', text: 'Every driver entry in the geo index has a TTL (say 30 seconds; Uber has not published the exact value). No new ping came, so the entry expires. Matching will no longer send this driver offers.', set: { geo: { state: 'miss', sub: 'd17 expired' } }, focus: ['geo'] },
          { title: 'Signal is back', text: 'The phone reconnected, the next ping arrived, and the driver is in the index again. No manual cleanup is needed.', set: { drv: { state: '' } }, go: 'drv>gw>loc>geo', after: { geo: { state: 'ok', sub: 'd17 back' } } },
        ]},
        { name: 'Location node crash', steps: [
          { title: 'One shard dies', text: 'One node of the location service (the owner of some cells) crashes.', set: { loc: { state: 'down', sub: 'node down' } }, go: 'lost:gw>loc' },
          { title: 'Ring rebalance', text: 'The other nodes learn that a teammate has died (this is called a membership protocol), and that node\'s cells are shared out to the neighbouring nodes (following a consistent hashing ring). In 2015-16 Uber built its own library, Ringpop, for this (details below).', set: { loc: { state: 'ok', sub: 'cells moved' } }, focus: ['loc'] },
          { title: 'Data comes back by itself', text: 'Location data is short-lived: the new owner had no data, but within the next 4 seconds a fresh ping came from every driver and the index filled up again. So there is no need to store this data durably on disk.', go: 'drv>gw>loc>geo', after: { geo: { state: 'ok', sub: 'refilled' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: the geo index, from S2 to H3' },
    { type: 'p', html: `The question: "which available drivers are near this rider?" Measuring the distance to every driver (hundreds of thousands of calculations per request) will not work. So we split the world into <strong>cells</strong> and keep an index: cell → the drivers in that cell. Only the drivers in the rider's cell and the cells next to it are candidates. This idea is covered in detail in the <a href="#/ds-for-scale">Bloom filter, HyperLogLog, Geohash</a> lesson.` },
    { type: 'table', head: ['When', 'What Uber used', 'What the source says'], rows: [
      ['2015', 'Google S2 cells', 'According to a summary of Matt Ranney\'s talk: S2 level 12 cells (~3.3-6.4 km²), the cell ID was the shard key, location updates were sent to replicas, and reads were scaled by adding replicas.'],
      ['2018', 'H3 (Uber\'s own hexagon grid, open source)', 'Uber blog (June 2018): marketplace events are grouped into hexagon cells; city-wide decisions such as surge pricing and dispatch are based on them.'],
      ['Today', 'The H3 library is active (h3geo.org)', 'Uber\'s current internal dispatch index is not public; the use of H3 in the marketplace is publicly documented.'],
    ]},
    { type: 'p', html: `Why hexagons? In a square grid, the neighbour on a side is 1 step away and the neighbour on a corner is ~1.41 away. All 6 neighbours of a hexagon are at the <strong>same distance</strong> from the centre. "1 ring away" means about the same distance in every direction, so both "find nearby drivers" (k-ring) and surge smoothing stay clean. H3 has 16 resolutions; at each level a cell is ~7 times smaller.` },
    { type: 'callout', tone: 'term', title: 'New word: k-ring', html: `<strong>What it is:</strong> a cell plus all the cells around it, up to k "rings" out (in H3 the function is <code>gridDisk</code>). k = 1 means 7 cells (its own + 6 neighbours), k = 2 means 19 cells.<br><strong>Why we need it:</strong> a driver standing right on the edge of the rider's cell is also nearby, so the rider's own cell is not enough. Matching reads the rider's k-ring; if it finds too few drivers, it increases k.<br><strong>Without it:</strong> either only one cell (nearby drivers on the border are missed) or the whole city (far too slow).` },
    { type: 'table', head: ['H3 resolution', 'Average area of one hexagon', 'Average edge length', 'Think of it as'], rows: [
      ['7', '~5.16 km²', '~1.41 km', 'A small neighbourhood; for city-wide trends'],
      ['8', '~0.74 km²', '~531 m', 'A few blocks; a good size for "area" decisions like surge'],
      ['9', '~0.105 km²', '~201 m', 'One or two streets; for "nearby drivers"'],
    ], caption: 'Numbers are from the official cell statistics table on h3geo.org (H3 v4). At each resolution a hexagon has 7 smaller "children", so the area is ~7 times smaller. Which resolution Uber uses where is not public; this is only a sense of size.' },
    { type: 'p', html: `Now try it yourself. The thick hexagon in the middle is the rider. The number in each hexagon = how many available drivers are in that cell right now. Increase k and see how many cells must be read and how many drivers are found:` },
    { type: 'custom', render(el) {
      const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      const make = mode => { const R = rng(mode === 'day' ? 11 : 5), c = []; for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) if (Math.abs(q + r) <= 4) { const x = R(); c.push({ q, r, n: mode === 'day' ? Math.floor(x * 3) : (x < 0.1 ? 1 : 0) }); } return c; };
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      const EDGE = { 7: 1406, 8: 531, 9: 201 };
      let mode = 'day', k = 1, C = make(mode);
      el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" class="chip on" data-m="day">6 pm (busy)</button><button type="button" class="chip" data-m="night">3 am (empty streets)</button></div>
        <svg class="ub-kr" viewBox="0 0 340 290" style="width:100%;max-width:420px;display:block;margin:0 auto"></svg>
        <div class="row2">
          <div><label>k (how many rings): <strong class="ub-kv"></strong></label><input class="ub-k" type="range" min="0" max="4" step="1" value="1"></div>
          <div><label>H3 resolution</label><select class="ub-res"><option value="9">9 (~201 m edge)</option><option value="8">8 (~531 m edge)</option><option value="7">7 (~1.41 km edge)</option></select></div>
        </div>
        <div style="margin:6px 0"><button type="button" class="btn small primary ub-auto">Auto: increase k until 5 drivers are found</button></div>
        <div class="stats">
          <div class="stat"><span>Cells read (1 + 3k(k+1))</span><strong class="ub-c"></strong></div>
          <div class="stat"><span>Drivers found</span><strong class="ub-d"></strong></div>
          <div class="stat"><span>Search radius (about)</span><strong class="ub-r"></strong></div>
        </div>
        <div class="calc-note ub-n"></div>`;
      const q = s => el.querySelector(s), svg = q('.ub-kr'), SZ = 20, cx = 170, cy = 145;
      const pos = c => [cx + SZ * Math.sqrt(3) * (c.q + c.r / 2), cy + SZ * 1.5 * c.r];
      const pts = (x, y) => [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (x + (SZ - 1.2) * Math.cos(a)).toFixed(1) + ',' + (y + (SZ - 1.2) * Math.sin(a)).toFixed(1); }).join(' ');
      const draw = () => {
        const S = C.filter(c => hd(c) <= k), drv = S.reduce((a, c) => a + c.n, 0), res = Number(q('.ub-res').value), rad = k * Math.sqrt(3) * EDGE[res];
        svg.innerHTML = C.map(c => { const [x, y] = pos(c), on = hd(c) <= k, me = c.q === 0 && c.r === 0;
          return `<polygon points="${pts(x, y)}" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${me ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${me ? 3 : 1}"/>` + (c.n ? `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-family="var(--f-mono)" fill="${on ? 'var(--accent-ink)' : 'var(--ink-3)'}">${c.n}</text>` : ''); }).join('');
        q('.ub-kv').textContent = k; q('.ub-k').value = k;
        q('.ub-c').textContent = S.length;
        q('.ub-d').textContent = drv;
        q('.ub-r').textContent = k === 0 ? 'own cell only' : (rad >= 1000 ? (rad / 1000).toFixed(1) + ' km' : Math.round(rad) + ' m');
        q('.ub-n').textContent = mode === 'day'
          ? `At a busy time, k = 1 (7 cells) already gives ${C.filter(c => hd(c) <= 1).reduce((a, c) => a + c.n, 0)} drivers: done. We did not even touch the million drivers of the whole city. These candidates now go on to the ETA step.`
          : `At night the nearby cells are empty. To find 5 drivers we had to go up to k = 4 (61 cells). The bigger k is, the farther the driver and the longer the pickup; after a limit, "no cars available" is better.`;
      };
      el.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; C = make(mode); k = 1; el.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
      q('.ub-k').addEventListener('input', () => { k = Number(q('.ub-k').value); draw(); });
      q('.ub-res').addEventListener('input', draw);
      q('.ub-auto').onclick = () => { k = 0; while (k < 4 && C.filter(c => hd(c) <= k).reduce((a, c) => a + c.n, 0) < 5) k++; draw(); };
      draw();
    }},
    { type: 'p', html: `Notice: the number of cells grows as 1, 7, 19, 37, 61 (the formula is 1 + 3k(k+1)). At resolution 9, k = 1 covers a radius of ~350 m, and at resolution 7 the same k = 1 covers ~2.4 km. Bigger cells = fewer cells to read, but each cell has more drivers who may also be far away. Smaller cells = more precise, but more cells. The right resolution depends on how crowded the city is.` },
    { type: 'h3', text: 'How do we split the index across many machines? Ringpop (2015-16)' },
    { type: 'p', html: `One machine's RAM and CPU cannot handle the pings of a whole city. In 2015 Uber open-sourced a Node.js library called <strong>Ringpop</strong> (blog post in 2016). Every location/dispatch worker sat on a <a href="#/consistent-hashing">consistent hashing</a> ring, and every cell had one owner. A request could arrive at any node; that node either handled it or forwarded it to the right owner ("handle or forward"). Which nodes were alive was found with <strong>SWIM gossip</strong>: nodes pinged each other and spread news about membership.` },
    { type: 'callout', tone: 'term', title: 'New word: Gossip protocol (SWIM)', html: `<strong>What it is:</strong> a way for a group of machines (a cluster) to find out "who is alive" without a central "attendance register". Every node pings a random node every so often. If there is no answer, it asks other nodes to ping that node too. Then it spreads the news "X may be down" along with its other messages, the way gossip spreads in a class. In a few rounds, the whole cluster knows.<br><strong>Why we need it:</strong> the ring must know which node has died, so its cells can be given to someone else.<br><strong>Without it:</strong> you would need a central register, which can itself fail (a single point of failure), or a dead node would stay the owner of its cells and the pings for those cells would be lost.` },
    { type: 'callout', tone: 'term', title: 'New word: Sharding (with a consistent hashing ring)', html: `<strong>What it is:</strong> <a href="#/sharding">Sharding</a> = splitting data across many machines, each machine holding one part. Here every cell has one "owner" node. <a href="#/consistent-hashing">Consistent hashing</a> places both nodes and cells on a round ring; a cell's owner = the first node after it on the ring.<br><strong>Why we need it:</strong> one machine's RAM and CPU cannot take the pings of a whole city. The benefit of the ring: when a node dies or a new one joins, only a few cells change owner, not all of them.<br><strong>Without it:</strong> either one machine (it fills up fast) or a simple "cell % N" split, where adding one machine moves almost all cells around.` },
    { type: 'callout', tone: 'warn', title: 'This story is old', html: `Ringpop's GitHub repos were archived in 2020. Uber's own 2021 "Fulfillment Platform re-architecture" post said that the old system (rt-demand and rt-supply services, in-memory serialization with Ringpop, Cassandra and Redis storage) put availability above consistency, that writes to many entities were not atomic, and that Ringpop's peer-to-peer design had scaling limits. The new platform moved to transactions on Google Cloud Spanner (see Deep dive 3). In an interview, describe Ringpop as a "pattern" (consistent hashing + gossip), not as "what Uber runs today".` },
    { type: 'h3', text: 'Hot cell: the match ends, the stadium empties' },
    { type: 'p', html: `The downside of using the cell ID as the shard key: when 50,000 people leave a stadium, all reads and writes land on the owner of one cell. Defences: (1) a finer resolution in crowded places (smaller cells, so the load spreads across many owners), (2) read replicas for hot cells (the 2015 talk also mentioned scaling reads by adding replicas), (3) run matching in small batches instead of separately for every request (Deep dive 2).` },

    { type: 'h2', text: 'Step 5: high-level design, part 2: ride request and dispatch' },
    { type: 'p', html: `According to the 2015 talk, Uber's dispatch had three parts: a <strong>supply</strong> service (drivers, their car, seats, state), a <strong>demand</strong> service (the rider's request and needs), and <strong>DISCO</strong> (DISpatch Optimization), which matches the two. The geo index only gives rough candidates; the real ranking is by road <strong>ETA</strong>, not by straight-line distance.` },
    { type: 'callout', tone: 'term', title: 'New word: Dispatch', html: `<strong>What it is:</strong> the decision "which car goes to which request", and sending that car an offer. This service is also called the <strong>matching</strong> service.<br><strong>Why we need it:</strong> the geo index only says who is nearby. Who is <em>best</em> (how long by road), whom to send the offer to, and what to do if the driver says no: dispatch decides all of this.<br><strong>Without it:</strong> the rider gets the wrong driver (one across the river), or one driver is sent to two places.` },
    { type: 'callout', tone: 'term', title: 'New word: ETA (Estimated Time of Arrival)', html: `<strong>What it is:</strong> a guess of how long something will take to arrive. Here: how many minutes the driver needs to reach the rider by road.<br><strong>Why we need it:</strong> a driver 400 m away on the other side of a flyover may take 9 minutes, and one 900 m away may take 3 minutes. Ranking must use minutes, not metres.<br><strong>Without it:</strong> the "closest" driver gets picked, who will actually arrive last. How ETA is computed is in Deep dive 5.` },
    { type: 'callout', tone: 'term', title: 'New word: Conditional write (compare-and-set)', html: `<strong>What it is:</strong> telling the database "change this value, <em>but only if</em> it is still the old value X". For example <code>UPDATE ... WHERE state='available' AND v=41</code>. If someone else changed it in between, your write fails and you find out.<br><strong>Why we need it:</strong> if two dispatch workers pick the same driver in the same second, only one should win.<br><strong>Without it:</strong> both read "available", both write "offered", and one driver gets two offers. Details are in the <a href="#/pattern-contention">contention</a> lesson.` },
    { type: 'flow', title: 'Ride request → driver offer', height: 330,
      nodes: [
        { id: 'rid', label: 'Rider app', sub: 'asked for a ride', x: 85, y: 80, w: 130, kind: 'client', info: 'What it is: the app on the rider\'s phone. The rider enters pickup and drop and makes a request. The request carries an Idempotency-Key, so a network retry does not create two rides.' },
        { id: 'dem', label: 'Demand svc', sub: 'ride: REQUESTED', x: 270, y: 80, w: 140, kind: 'server', info: 'What it is: the service that handles riders\' ride requests ("demand" = the people asking for rides). It creates the ride in the REQUESTED state in a strongly consistent store and tells dispatch. The 2015 talk called it the demand service.' },
        { id: 'dis', label: 'Dispatch', sub: 'DISCO', x: 470, y: 170, w: 150, kind: 'server', info: 'What it is: the brain of matching. It gets candidates (geo index), asks for each candidate\'s pickup ETA, picks the best, locks the driver and sends the offer. According to Uber\'s public page, requests today are matched in batches of a few seconds.' },
        { id: 'geo', label: 'Geo index', sub: 'k-ring candidates', x: 270, y: 260, w: 140, kind: 'cache', info: 'What it is: the same in-RAM cell → drivers index that the location path fills. Here we read the k-ring of the rider\'s H3 cell: a list of nearby available drivers. Only a rough filter; the real ranking is by ETA.' },
        { id: 'eta', label: 'ETA service', sub: 'road graph + ML', x: 640, y: 60, w: 130, kind: 'server', info: 'What it is: the service that says how many minutes the driver needs to reach the pickup by road. The real road ETA for each (driver, pickup) pair. A routing engine finds the shortest path on the road graph, and since 2022 the DeepETA model adds a correction on top (Deep dive 5).' },
        { id: 'drv', label: 'Driver app', sub: 'offer screen', x: 640, y: 280, w: 130, kind: 'client', info: 'What it is: the offer screen on the driver\'s phone. The offer is pushed to the driver (over the same open WebSocket connection): where the pickup is, how far. If the driver does not accept within a few seconds, the offer expires and the next driver gets it.' },
      ],
      edges: [{ a: 'rid', b: 'dem' }, { a: 'dem', b: 'dis' }, { a: 'dis', b: 'geo' }, { a: 'dis', b: 'eta' }, { a: 'dis', b: 'drv' }],
      scenarios: [
        { name: 'Match (happy path)', steps: [
          { title: 'Request', text: 'The rider asked for a ride. The ride is saved in the REQUESTED state.', go: 'rid>dem>dis', msg: 'POST /v1/rides  Idempotency-Key: 7f3c…' },
          { title: 'Candidates', text: 'The 1-ring of the rider\'s cell: 7 cells, with 12 available drivers in them.', go: ['dis>geo', 'res:geo>dis'], msg: 'gridDisk(cell, 1) → [d17, d4, d88, …]' },
          { title: 'Rank by ETA', text: 'By straight-line distance d4 is the closest, but d4 is on the other side of a flyover: road ETA 9 min. d17 is a bit farther, road ETA 3 min. d17 wins.', go: ['dis>eta', 'res:eta>dis'], msg: 'd4: 400 m, 9 min | d17: 900 m, 3 min' },
          { title: 'Lock + offer', text: 'Mark d17 as "offered" atomically (only if d17 is still available), then send the offer.', go: 'dis>drv', msg: 'offer o55 → d17 (with expiry)', after: { drv: { state: 'ok', sub: 'got offer' } } },
          { title: 'Accept', text: 'The driver accepted. The ride is ACCEPTED, and the rider can see the driver.', go: ['res:drv>dis', 'res:dis>dem>rid'], msg: 'ride r9: ACCEPTED, driver d17, ETA 3 min' },
        ]},
        { name: 'Driver ignored it', steps: [
          { title: 'Offer sent', text: 'The offer was sent to d17.', go: 'rid>dem>dis>drv', msg: 'offer o55 → d17' },
          { title: 'Timeout', text: 'The driver is on a tea break, so the offer expires. The lock is released (the lock had a TTL too).', set: { drv: { state: 'warn', sub: 'no response' } }, focus: ['drv'] },
          { title: 'Next candidate', text: 'Dispatch picks the next best on the list (d88) and sends the offer to d88. The rider just sees "Finding your ride" a little longer.', set: { drv: { state: '', sub: 'offer to d88' } }, go: 'dis>drv', after: { drv: { state: 'ok' } } },
        ]},
        { name: 'Double assignment race', intro: 'Two riders\' requests in the same second, and d17 is the best driver for both.', steps: [
          { title: 'Two requests', text: 'Two different dispatch workers both pick d17.', go: ['rid>dem>dis'], set: { dis: { state: 'warn', sub: '2 workers, 1 driver' } } },
          { title: 'Conditional write', text: 'Both try to write "d17: available → offered", but only with a condition (like a version check or compare-and-set). The first one wins; the second one\'s write fails.', focus: ['dis'], msg: 'UPDATE supply SET state=offered, v=v+1 WHERE id=d17 AND state=available AND v=41' },
          { title: 'The loser moves on', text: 'The second worker takes its next candidate. One driver never got two offers. This is the <a href="#/pattern-contention">contention</a> pattern.', set: { dis: { state: 'ok', sub: 'no double booking' } }, go: 'dis>drv' },
        ]},
        { name: 'No driver', steps: [
          { title: 'Empty ring', text: 'At 3 am, the 1-ring has 0 available drivers.', go: ['rid>dem>dis', 'dis>geo', 'bad:geo>dis'], msg: 'gridDisk(cell, 1) → []' },
          { title: 'Grow the ring', text: 'Search up to k = 2, 3. But a driver very far away gives a 25 min pickup ETA, which is useless for the rider; after a limit, show "no cars available".', go: ['dis>geo', 'res:geo>dis'], msg: 'gridDisk(cell, 3) → [d203: ETA 21 min]' },
          { title: 'Pass the signal on', text: 'This demand-supply imbalance reaches the surge pipeline (Deep dive 4), which raises the price and pulls nearby drivers into this area.', set: { dis: { state: 'warn', sub: 'demand > supply' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 2: matching, the "closest" is not the best' },
    { type: 'p', html: `Two wrong ideas need to be broken. <strong>First:</strong> "the driver with the shortest distance". Uber\'s official matching page says the closest driver is not always the quickest to arrive: traffic, flyovers, rivers and one-way streets get in the way. So rank by <strong>road ETA</strong>.` },
    { type: 'p', html: `<strong>Second:</strong> "match every request the moment it arrives". According to Uber\'s page, this is what happened at first (each rider got the closest driver right away). It was fine for most riders, but some riders got long waits, and across a whole city that adds up to a lot. Now, after a request, the system waits <strong>a few seconds</strong>, looks at all the riders and drivers that arrived in that time as one <strong>batch</strong>, and makes pairs so that the <em>total</em> wait of everyone is lower. The 2015 talk also had the idea that a driver who is about to finish a trip can be a better match than an idle driver far away.` },
    { type: 'callout', tone: 'term', title: 'New word: Batched matching', html: `<strong>What it is:</strong> instead of matching requests one by one, "first come, first served", you look at all requests and all free drivers in a small time window (a few seconds) together and make the best pairs. This is called an <strong>assignment problem</strong>: N riders, N drivers, each pair has a cost (ETA), make the total cost as small as possible.<br><strong>Why we need it:</strong> a driver who is "a little" better for R1 may be "much" better for R3. You only see this when you look at them together.<br><strong>Without it:</strong> each decision looks good at that moment, but the total wait in the city goes up (see the widget below).` },
    { type: 'p', html: `See for yourself. Three riders R1, R2, R3 arrived in this order, and three drivers are free. The table shows the pickup ETA (minutes) for each pair:` },
    { type: 'custom', render(el) {
      const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      const gen = k => { if (k === 0) return [[2, 3, 9], [3, 10, 12], [8, 9, 4]]; const R = rng(1000 + k * 7919); return [0, 1, 2].map(() => [0, 1, 2].map(() => 2 + Math.floor(R() * 12))); };
      const greedy = M => { const used = new Set(), p = []; for (let i = 0; i < 3; i++) { let b = -1; for (let j = 0; j < 3; j++) if (!used.has(j) && (b < 0 || M[i][j] < M[i][b])) b = j; used.add(b); p.push(b); } return p; };
      const best = M => { let bp = null, bs = 1e9; PERMS.forEach(p => { const s = p.reduce((a, j, i) => a + M[i][j], 0); if (s < bs) { bs = s; bp = p; } }); return bp; };
      const tot = (M, p) => p.reduce((a, j, i) => a + M[i][j], 0);
      let k = 0, mode = 'g';
      el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button type="button" class="btn small primary uber-bg">Right away (greedy)</button>
          <button type="button" class="btn small ghost uber-bb">Batch (wait a few seconds)</button>
          <button type="button" class="btn small ghost uber-bn">New scenario</button></div>
        <div class="uber-tbl" style="overflow-x:auto"></div>
        <div class="stats"><div class="stat"><span>Greedy total wait</span><strong class="uber-tg"></strong></div><div class="stat"><span>Batch total wait</span><strong class="uber-tb"></strong></div><div class="stat"><span>Scenario</span><strong class="uber-sc"></strong></div></div>
        <div class="calc-note uber-bnote"></div>`;
      const draw = () => {
        const M = gen(k), g = greedy(M), b = best(M), p = mode === 'g' ? g : b;
        let h = '<table style="border-collapse:collapse;font-family:var(--f-mono);font-size:14px"><tr><th style="padding:6px 10px"></th>' + ['D1', 'D2', 'D3'].map(d => `<th style="padding:6px 10px;color:var(--ink-2)">${d}</th>`).join('') + '</tr>';
        M.forEach((row, i) => { h += `<tr><th style="padding:6px 10px;color:var(--ink-2)">R${i + 1}</th>` + row.map((v, j) => { const on = p[i] === j; return `<td style="padding:6px 10px;text-align:center;border:1px solid var(--line);${on ? 'background:var(--accent-soft);color:var(--accent-ink);font-weight:700' : 'color:var(--ink-2)'}">${v}</td>`; }).join('') + '</tr>'; });
        el.querySelector('.uber-tbl').innerHTML = h + '</table>';
        const tg = tot(M, g), tb = tot(M, b);
        el.querySelector('.uber-tg').textContent = tg + ' min';
        el.querySelector('.uber-tb').textContent = tb + ' min';
        el.querySelector('.uber-sc').textContent = '#' + (k + 1);
        el.querySelector('.uber-bnote').textContent = mode === 'g'
          ? `Greedy: R1 came and took its closest driver; then R2 took the best of the rest; then R3. Each decision was good at that moment, but the total is ${tg} min.`
          : (tb < tg ? `Batch: we looked at all three together, total ${tb} min (${tg - tb} min less than greedy). Notice: one rider may wait a little longer than with greedy; batching lowers "everyone's total".` : `In this scenario the greedy answer was already the best (${tb} min). Batching never makes the total worse; it just does not help every time.`);
        el.querySelector('.uber-bg').className = 'btn small uber-bg ' + (mode === 'g' ? 'primary' : 'ghost');
        el.querySelector('.uber-bb').className = 'btn small uber-bb ' + (mode === 'b' ? 'primary' : 'ghost');
      };
      el.querySelector('.uber-bg').onclick = () => { mode = 'g'; draw(); };
      el.querySelector('.uber-bb').onclick = () => { mode = 'b'; draw(); };
      el.querySelector('.uber-bn').onclick = () => { k = (k + 1) % 8; draw(); };
      draw();
    }},
    { type: 'p', html: `In the first scenario, greedy gives 16 min and batching gives 10 min. In a real system N is in the thousands, so you cannot try every possible pairing; such problems use optimisation algorithms (like assignment/matching algorithms). Uber has not published its exact algorithm; the public page only explains the idea.` },
    { type: 'table', head: ['Approach', 'Benefit', 'Cost'], rows: [
      ['Shortest straight-line distance', 'Simple, fast', 'Ignores real roads; will pick a driver across the river'],
      ['Shortest ETA, right away', 'Good for each rider at that moment', 'Can be bad for the total wait of the city'],
      ['Batch + ETA', 'Lower total wait, less empty driving for drivers', 'Each rider waits a few extra seconds; heavy computation'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Offer to one driver at a time', html: `Send the offer to only one driver, with a timeout, and put a lock on that driver. Sending it to 5 drivers at once ("whoever accepts first") feels faster for the rider, but it wastes the time of 4 drivers and they lose trust. Put a TTL on the lock too, so a crashed dispatch worker does not leave a driver stuck in "offered" forever.` },

    { type: 'h2', text: 'Deep dive 3: a trip is a state machine' },
    { type: 'p', html: `Many parties touch a ride during its life: the rider (cancel), the driver (accept, arrived, start, end), dispatch (timeout), payments. If every service changed a "status" column in its own way, strange things would happen: "start trip" on a cancelled ride, or one trip "ended" twice. So make the ride a <strong>state machine</strong>: it is written down in advance which event can move the ride from which state to which state. Everything else is rejected.` },
    { type: 'callout', tone: 'term', title: 'New word: State machine', html: `<strong>What it is:</strong> a thing (here, a ride) is always in exactly one of a few fixed <strong>states</strong> (REQUESTED, ACCEPTED, ...), and its state changes only through allowed <strong>transitions</strong> written down in advance. Like a traffic light: it cannot go from red to "yellow and green at once".<br><strong>Why we need it:</strong> many parties touch the ride (rider, driver, dispatch, payments). When the rules are written in one place, any wrong change (like "from ON_TRIP to ACCEPTED") is rejected automatically.<br><strong>Without it:</strong> "start trip" on a cancelled ride, or one trip "ended" twice, and money charged twice.<br>According to Uber\'s 2021 fulfillment post, the new platform models its entities as <strong>statecharts</strong> (state machines that can contain smaller state machines inside them).` },
    { type: 'ascii', text: `
             accept            arrive            start             end              pay
REQUESTED ─────────> ACCEPTED ────────> ARRIVED ────────> ON_TRIP ────────> COMPLETED ──────> PAID
   │  │                 │                  │
   │  └─ timeout ──> NO_DRIVERS            │
   └──── cancel ────────┴──── cancel ──────┴──> CANCELLED   (a cancel after ARRIVED may have a fee)` },
    { type: 'p', html: `Press the events and see. Every valid transition raises the version; a wrong event is rejected; and if the same event comes twice (a network retry), nothing changes again:` },
    { type: 'custom', render(el) {
      const T = { REQUESTED: { accept: 'ACCEPTED', timeout: 'NO_DRIVERS', cancel: 'CANCELLED' }, ACCEPTED: { arrive: 'ARRIVED', cancel: 'CANCELLED' }, ARRIVED: { start: 'ON_TRIP', cancel: 'CANCELLED' }, ON_TRIP: { end: 'COMPLETED' }, COMPLETED: { pay: 'PAID' }, PAID: {}, CANCELLED: {}, NO_DRIVERS: {} };
      const S = Object.keys(T), EV = ['accept', 'arrive', 'start', 'end', 'pay', 'cancel', 'timeout'];
      let st = 'REQUESTED', v = 1, last = null, log = [];
      el.innerHTML = `<div style="color:var(--ink-2);font-size:13px;margin-bottom:4px">States:</div><div class="uber-sm-states" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="uber-sm-ev" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="stats"><div class="stat"><span>State</span><strong class="uber-sm-s"></strong></div><div class="stat"><span>Version</span><strong class="uber-sm-v"></strong></div></div>
        <div class="calc-note uber-sm-log" style="font-family:var(--f-mono);font-size:13px;white-space:pre-wrap"></div>`;
      const evBox = el.querySelector('.uber-sm-ev');
      evBox.innerHTML = '<span style="align-self:center;color:var(--ink-2);font-size:13px">Events:</span>';
      EV.forEach(e => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = e; b.onclick = () => fire(e); evBox.appendChild(b); });
      const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'btn small'; rb.textContent = 'reset'; rb.onclick = () => { st = 'REQUESTED'; v = 1; last = null; log = []; draw(); }; evBox.appendChild(rb);
      const fire = e => {
        const to = T[st][e];
        if (to) { log.unshift(`✓ ${e}: ${st} → ${to}  (UPDATE … WHERE state='${st}' AND v=${v})`); st = to; v++; last = e; }
        else if (e === last) log.unshift(`↺ ${e} came again: state is already ${st}. Nothing changed; the same answer is returned (idempotent).`);
        else log.unshift(`✗ ${e}: not allowed from ${st}. Rejected.`);
        log = log.slice(0, 6); draw();
      };
      const draw = () => {
        el.querySelector('.uber-sm-states').innerHTML = S.map(s => `<span class="chip${s === st ? ' on' : ''}">${s}</span>`).join('');
        el.querySelector('.uber-sm-s').textContent = st;
        el.querySelector('.uber-sm-v').textContent = 'v' + v;
        el.querySelector('.uber-sm-log').textContent = log.length ? log.join('\n') : 'Press any event. Try: accept, then start (it will be rejected, because arrive must come first).';
      };
      draw();
    }},
    { type: 'p', html: `Inside, every transition is a <strong>conditional write</strong>: "change the state, but only if it is still the old state and the old version". If two parties try to change it at the same moment (the rider presses cancel while the driver presses start), only one wins; the other is shown the fresh state and rejected. This is why the trip store must be <strong>strongly consistent</strong>.` },

    { type: 'h3', text: 'Where should trip data live? Uber\'s story, year by year' },
    { type: 'callout', tone: 'term', title: 'New word: CDC (Change Data Capture)', html: `<strong>What it is:</strong> automatically producing a stream of events for every row that changes in a database. "Trip became COMPLETED" turns into an event through CDC.<br><strong>Why we need it:</strong> other services (search, analytics, notifications) do not have to keep asking the database to learn about changes.<br><strong>Without it:</strong> every service would keep asking the database "did anything change?" (polling), which is useless load on the database.` },
    { type: 'table', head: ['When', 'What it was', 'Why it changed'], rows: [
      ['Until 2014', 'Trips in a single PostgreSQL database', 'According to Uber\'s Mezzanine post, in early 2014 the trips table became so big that adding a new column or index caused downtime, and the disk was running out.'],
      ['2014-16', '<strong>Schemaless</strong>: Uber\'s own append-only, sharded store on top of MySQL', 'Sharded by trip UUID, JSON cells that are never overwritten. It scaled horizontally, but the API was very limited.'],
      ['2015-2020', 'Dispatch (rt-demand, rt-supply) in memory with Ringpop, stored in Cassandra/Redis', 'According to the 2021 post: availability first, consistency "best effort"; changing two entities together was not atomic and had to be reconciled later.'],
      ['2021', '<strong>Docstore</strong> (the successor of Schemaless)', 'Feb 2021 post: on top of MySQL, each partition copied to 3-5 nodes with Raft (a consensus method where nodes vote to agree on one order), strict serializability inside a partition (everyone sees writes in one correct order), transactions, CDC.'],
      ['2021', 'Fulfillment platform on <strong>Google Cloud Spanner</strong>', 'July 2021 post: multi-table transactions (many tables change together, or none do), external consistency (commits appear in one correct time order across the whole world), entities as statecharts, and <strong>LATE</strong> for work after a commit (an Uber system that makes sure this work runs at least once: at-least-once).'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Outbox (event inside the transaction)', html: `<strong>What it is:</strong> changing the state in the database and writing the "this happened" event in <em>one single transaction</em>. The event first goes into an "outbox" table, and from there to Kafka.<br><strong>Why we need it:</strong> if trip COMPLETED is saved but the server crashes before sending the event, payments will never find out.<br><strong>Without it:</strong> sometimes the state changed but no event went out (no money charged), sometimes the event went out but the state did not change. Details are in the <a href="#/distributed-tx">sagas and outbox</a> lesson.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake', html: `"The trip ended, so the trip service should charge the card itself." If the payment gateway is slow, the driver\'s "End trip" button will hang for 10 seconds, and if the gateway is down, the trip will not end at all. Better: inside the trip transaction, only set the state to COMPLETED and leave an event; payments processes that event at its own speed, with retries. This is the <a href="#/distributed-tx">saga / outbox</a> pattern.` },
    { type: 'flow', title: 'Trip end → payment hand-off', height: 330,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: '"End trip"', x: 85, y: 165, w: 130, kind: 'client', info: 'What it is: the driver\'s app, here at the last moment of the trip. The driver reached the drop point and pressed End trip. The request carries a request ID, so a retry is safe.' },
        { id: 'trip', label: 'Trip service', sub: 'state machine', x: 275, y: 165, w: 150, kind: 'server', info: 'What it is: the service that runs the ride\'s state machine. It checks the transition (ON_TRIP → COMPLETED), computes the fare, and writes the state + a "trip completed" event in one transaction.' },
        { id: 'tdb', label: 'Trip store', sub: 'Spanner (2021+)', x: 275, y: 280, w: 150, kind: 'data', info: 'What it is: the real, reliable database of rides. Strongly consistent and transactional (many changes together, all or nothing). According to Uber\'s 2021 post, fulfillment entities now live on Google Cloud Spanner. Before that there were stores like Schemaless and Cassandra.' },
        { id: 'kf', label: 'Kafka', sub: 'trip events', x: 470, y: 165, w: 130, kind: 'queue', info: 'What it is: a log of trip events ("r9 COMPLETED"). Payments, receipts, rider app updates and analytics all read it at their own speed. According to Uber\'s 2021 paper, Uber\'s Kafka takes in trillions of messages per day.' },
        { id: 'pay', label: 'Payments', sub: 'Gulfstream', x: 640, y: 70, w: 130, kind: 'server', info: 'What it is: the system that charges riders and pays drivers. Uber\'s payments platform (called the "fifth generation" in the 2020 post): double-entry accounting, immutable orders, and deterministic unique IDs so that every order is processed exactly once.' },
        { id: 'rid', label: 'Rider app', sub: 'push: receipt', x: 640, y: 260, w: 130, kind: 'client', info: 'What it is: the rider\'s app, which keeps an open connection. The rider learns that the trip ended and gets the receipt through a push. Uber\'s push platform RAMEN (2020 post) does this job.' },
      ],
      edges: [{ a: 'drv', b: 'trip' }, { a: 'trip', b: 'tdb' }, { a: 'trip', b: 'kf' }, { a: 'kf', b: 'pay' }, { a: 'kf', b: 'rid' }],
      scenarios: [
        { name: 'Trip complete (happy)', steps: [
          { title: 'End trip', text: 'The driver pressed End trip.', go: 'drv>trip', msg: 'POST /v1/rides/r9/end  (request-id: e-771)' },
          { title: 'One transaction', text: 'ON_TRIP → COMPLETED, save the fare, and the "completed" event in the same transaction (like an outbox). Either all of it happens or none of it.', go: ['trip>tdb', 'res:tdb>trip'], msg: 'state=COMPLETED, fare=212, v=6' },
          { title: 'Instant OK to the driver', text: 'The driver does not have to wait for the payment.', go: 'res:trip>drv', after: { drv: { state: 'ok', sub: 'trip done' } } },
          { title: 'Event fan-out', text: 'The event goes to Kafka; payments and the rider app each get their own copy.', go: ['evt:trip>kf'] },
          { title: 'Money + receipt', text: 'Payments creates an order and charges; the receipt is pushed to the rider.', parallel: true, go: ['evt:kf>pay', 'evt:kf>rid'], after: { pay: { state: 'ok', sub: 'charged once' } } },
        ]},
        { name: 'End trip twice', steps: [
          { title: 'Network got stuck', text: 'The driver\'s first request arrived and was committed, but the answer was lost on the way back. The app retried.', go: ['drv>trip', 'trip>tdb', 'lost:trip>drv'] },
          { title: 'The retry arrives', text: 'The same request-id again. The trip is already COMPLETED; the conditional write (WHERE state=ON_TRIP) fails.', go: 'drv>trip', msg: 'request-id e-771 already applied', set: { trip: { state: 'warn', sub: 'duplicate' } } },
          { title: 'Same answer back', text: 'No new event, no second charge. The driver gets the same old success. This is called idempotency.', go: 'res:trip>drv', set: { trip: { state: 'ok', sub: 'idempotent' } } },
        ]},
        { name: 'Payments down', steps: [
          { title: 'Payments falls over', text: 'A bad deploy of the payments service: all pods crash.', set: { pay: { state: 'down', sub: 'DOWN' } }, focus: ['pay'] },
          { title: 'Trips still end', text: 'Trips complete normally; events pile up in Kafka (a backlog). Riders get their receipts a little late.', flood: { paths: ['drv>trip>kf'], n: 6 }, after: { kf: { state: 'warn', sub: 'backlog' } } },
          { title: 'Back up, catching up', text: 'Payments is back and reads from its old offset. Every event has a deterministic order ID, so even if an event comes twice, the charge happens only once (the exactly-once idea from the Gulfstream post).', set: { pay: { state: 'ok', sub: 'catching up' } }, flood: { paths: ['evt:kf>pay'], n: 6 }, after: { kf: { state: '', sub: 'trip events' } } },
        ]},
      ],
    },
    { type: 'p', html: `Here is an old, fun trick too. According to the 2015 talk, so that trip state would not be lost if a whole datacenter failed, Uber used the driver\'s phone itself as a "backup": the server kept sending an encrypted <strong>state digest</strong> to the phone, and after a failover the backup datacenter took that state back from the phone. Today multi-region transactional stores (like Spanner) do this at the database level, but the idea is worth remembering: a client that is constantly talking to you can be a source of recovery.` },

    { type: 'h3', text: 'Payments, at a high level: when and how money is charged' },
    { type: 'p', html: `A full payments system is a big design of its own. In an interview, a high level is usually enough: <em>when</em> the price is fixed, <em>when</em> money is held on the card, <em>when</em> the real charge happens, and how double charges are prevented. Uber\'s public pages give this picture:` },
    { type: 'steps', items: [
      { t: 'Upfront fare (before the request)', d: 'According to Uber\'s August 2016 newsroom post, the rider sees the exact price before requesting, not a range. It is based on the expected time, distance, traffic and the demand at that moment (surge). The post says this arrived in 2016 for uberX in the US and in India. If the trip changes a lot (new destination, many stops), the fare is recalculated from the actual time and distance.' },
      { t: 'Authorization hold (money "held" on the card)', d: 'According to Uber\'s help/blog page, a temporary "pending" hold for the fare may be placed on the card when the ride is requested or after. It checks that the card has money and helps stop fraud. If you cancel, the hold is removed.' },
      { t: 'Trip end → the real charge', d: 'The trip COMPLETED event reaches payments (the flow above). The hold turns into the final charge. If the final fare is lower, only that amount is charged and the rest of the hold is released.' },
      { t: 'Ledger + driver payout', d: 'According to Uber\'s 2020 post, Gulfstream is the platform for both collecting money (collection) and paying it out (disbursement), built on double-entry accounting. Every order is immutable, is saved first and processed after, and a unique order ID makes it exactly once.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Authorization hold', html: `<strong>What it is:</strong> telling the bank "hold ₹212 on this card now; we will charge it later". The rider\'s bank statement shows it as "pending".<br><strong>Why we need it:</strong> to know before the trip starts that the card works. If you only found out after the trip that the card was empty, who would pay for the driver\'s work?<br><strong>Without it:</strong> many "free" rides and fraud, or a full charge before every ride (which means refund trouble on every cancel).` },
    { type: 'callout', tone: 'term', title: 'New word: Double-entry ledger', html: `<strong>What it is:</strong> a money record where every transaction is written in two places: it left one account (debit) and went into another (credit). The two always add up to zero. Entries are never deleted; to fix a mistake, you add a new opposite entry.<br><strong>Why we need it:</strong> money is never created "out of thin air" and never disappears. At any moment the books can be checked and matched (reconciled).<br><strong>Without it:</strong> a bug could charge the rider without paying the driver, and nobody would notice.` },
    { type: 'p', html: `Try it. The rates below are only assumptions (base ₹50, ₹12 per km, ₹2 per minute, and a 25% platform fee), not Uber\'s real rates:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Estimate: distance (km)</label><input class="ubp-ek" type="number" value="8" min="1" step="1"></div>
          <div><label>Estimate: time (min)</label><input class="ubp-em" type="number" value="25" min="1" step="1"></div>
          <div><label>Actual: time (min, after traffic)</label><input class="ubp-am" type="number" value="31" min="1" step="1"></div>
          <div><label>Surge</label><select class="ubp-s"><option value="1">1.0×</option><option value="1.4">1.4×</option><option value="1.8">1.8×</option></select></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button type="button" class="chip ubp-d">Rider changed the destination midway (+5 km, +12 min)</button><button type="button" class="chip ubp-c">Rider cancelled</button></div>
        <div class="stats">
          <div class="stat"><span>Upfront fare (shown)</span><strong class="ubp-u"></strong></div>
          <div class="stat"><span>Hold on card</span><strong class="ubp-h"></strong></div>
          <div class="stat"><span>Final charge</span><strong class="ubp-f"></strong></div>
        </div>
        <div class="calc-note ubp-l" style="font-family:var(--f-mono);font-size:13px;white-space:pre-wrap"></div>`;
      const q = s => el.querySelector(s), num = s => Math.max(0, Number(q(s).value) || 0);
      let dest = false, cancel = false;
      const fare = (km, min, s) => Math.round((50 + 12 * km + 2 * min) * s);
      const upd = () => {
        const ek = num('.ubp-ek'), em = num('.ubp-em'), am = num('.ubp-am'), s = Number(q('.ubp-s').value);
        const up = fare(ek, em, s), fin = cancel ? 0 : dest ? fare(ek + 5, am + 12, s) : up, fee = Math.round(fin * 0.25);
        q('.ubp-u').textContent = '₹' + up; q('.ubp-h').textContent = '₹' + up;
        q('.ubp-f').textContent = '₹' + fin;
        q('.ubp-d').classList.toggle('on', dest); q('.ubp-c').classList.toggle('on', cancel);
        q('.ubp-l').textContent = cancel
          ? `Cancel: the ₹${up} hold was removed. No charge entry in the ledger.`
          : `${dest ? `The trip changed: the fare was rebuilt from the actual distance and time (₹${fin}).` : `Normal trip: the actual time was ${am} min, but the upfront ₹${up} was still charged.`}\nLedger (double-entry):\n  rider card        -₹${fin}\n  driver earnings   +₹${fin - fee}\n  platform fee      +₹${fee}\n  total             ₹0`;
      };
      q('.ubp-d').onclick = () => { dest = !dest; cancel = false; upd(); };
      q('.ubp-c').onclick = () => { cancel = !cancel; dest = false; upd(); };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default values, the upfront fare is ₹196 (50 + 12×8 + 2×25). Traffic made the trip 31 minutes long, but the charge is still ₹196: the platform took that risk. If the destination changes, the fare is rebuilt from the actual 13 km and 43 min: ₹292. In the ledger, every rupee that left the rider is written down somewhere, so the books always match.` },
    { type: 'h2', text: 'Deep dive 4: surge pricing, stream processing per hexagon' },
    { type: 'p', html: `The match is over, 50,000 people want a ride at the same time, and there are 200 drivers nearby. What happens if the price stays the same? Whoever taps first gets a ride; everyone else sees "no cars" and waits a long time. According to Uber\'s official surge page, surge is a "relief valve": when riders in an area outnumber the available drivers, the price goes up, so some riders wait and nearby drivers come into that area. It is hyperlocal (not one price for the whole city), and the bigger the imbalance, the bigger the change.` },
    { type: 'callout', tone: 'term', title: 'New word: Surge multiplier', html: `<strong>What it is:</strong> a number (like 1.8×) that the normal fare is multiplied by when riders outnumber free drivers in a small area. Every hexagon has its own multiplier.<br><strong>Why we need it:</strong> a few riders wait (or book later), and nearby drivers get a reason to come into this area. Demand and supply become equal again.<br><strong>Without it:</strong> whoever taps first gets a ride, and everyone else sees "no cars" and waits a very long time.` },
    { type: 'p', html: `How is the real system built? According to the SIGMOD 2021 paper "Real-time Data Infrastructure at Uber" by Uber\'s engineers, surge is a <strong>streaming pipeline</strong> that computes a <strong>pricing multiplier for each hexagon area</strong> from trip data and rider/driver status in a time window: data comes from Kafka, a complex machine-learning based algorithm runs in Flink, and the result goes into a key-value store so it can be read instantly when a fare is computed.` },
    { type: 'callout', tone: 'term', title: 'New word: Stream processing (Flink)', html: `<strong>What it is:</strong> processing every event as soon as it arrives, all the time, instead of processing data once a night (batch). <strong>Apache Flink</strong> is a stream processing engine: it reads events from Kafka, groups them into <strong>time windows</strong> ("how many requests in this hexagon in the last 1 minute"), and sends the result on. It keeps its own state (counters), which comes back from a checkpoint (a saved copy) after a crash.<br><strong>Why we need it:</strong> surge needs the demand <em>right now</em>. Last night\'s batch result is useless for a 10-minute rush at a stadium.<br><strong>Without it:</strong> a "count the requests from the last 1 minute" query on the database for every request, hundreds of thousands of times, or else old data. Details are in the <a href="#/big-data">big data lesson</a>.` },
    { type: 'callout', tone: 'warn', title: 'The widget below is a simplified model', html: `Uber\'s real surge algorithm is ML based and not public. The formula below is only to help you feel the idea: <code>ratio = demand ÷ supply</code>; with smoothing on, it is half the cell\'s ratio plus half the average ratio of its 6 neighbours; if the ratio is &lt; 1.2 it gives 1.0×, otherwise <code>1 + 0.5 × (ratio − 1)</code>, at most 3.0×. So ratio 2 → 1.5×, ratio 3 → 2.0×, ratio 5 or more → 3.0×.` },
    { type: 'p', html: `Tap any hexagon, then change its demand (requests in the last window) and supply (free drivers). The hexagon in the middle is the stadium:` },
    { type: 'custom', render(el) {
      const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; };
      const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      const mult = r => r < 1.2 ? 1 : Math.min(3, Math.round((1 + 0.5 * (r - 1)) * 10) / 10);
      const fresh = () => { const R = rng(7), c = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) { const ctr = q === 0 && r === 0; c.push({ q, r, d: ctr ? 30 : Math.round(3 + R() * 9), s: ctr ? 8 : Math.round(4 + R() * 8) }); } return c; };
      let C = fresh(), sel = C.findIndex(c => c.q === 0 && c.r === 0), smooth = true, boost = 1;
      el.innerHTML = `<svg class="uber-hx" viewBox="0 0 330 290" style="width:100%;max-width:420px;display:block;margin:0 auto;touch-action:manipulation"></svg>
        <div class="row2">
          <div><label for="uber-hd">Selected cell: demand (requests)</label><input id="uber-hd" type="range" min="0" max="60" step="1"></div>
          <div><label for="uber-hs">Selected cell: supply (free drivers)</label><input id="uber-hs" type="range" min="0" max="40" step="1"></div>
          <div><label for="uber-hb">Whole-city demand × (rain, office closing time)</label><input id="uber-hb" type="range" min="0.5" max="2" step="0.1" value="1"></div>
          <div style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap"><button type="button" class="btn small uber-hsm">Smoothing: ON</button><button type="button" class="btn small ghost uber-hr">Reset</button></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Selected: demand / supply</span><strong class="uber-o1"></strong></div>
          <div class="stat"><span>Selected: ratio → surge</span><strong class="uber-o2"></strong></div>
          <div class="stat"><span>Surging cells</span><strong class="uber-o3"></strong></div>
          <div class="stat"><span>City max</span><strong class="uber-o4"></strong></div>
        </div>
        <div class="calc-note uber-o5"></div>`;
      const svg = el.querySelector('.uber-hx'), hd = el.querySelector('#uber-hd'), hs = el.querySelector('#uber-hs'), hb = el.querySelector('#uber-hb');
      const SZ = 30, cx = 165, cy = 145;
      const pos = c => [cx + SZ * Math.sqrt(3) * (c.q + c.r / 2), cy + SZ * 1.5 * c.r];
      const pts = (x, y) => [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (x + (SZ - 1.5) * Math.cos(a)).toFixed(1) + ',' + (y + (SZ - 1.5) * Math.sin(a)).toFixed(1); }).join(' ');
      const compute = () => {
        const idx = {}; C.forEach((c, i) => idx[c.q + ',' + c.r] = i);
        const raw = C.map(c => c.d * boost / Math.max(c.s, 1));
        return C.map((c, i) => { const nb = DIRS.map(([a, b]) => idx[(c.q + a) + ',' + (c.r + b)]).filter(j => j !== undefined); const avg = nb.reduce((t, j) => t + raw[j], 0) / nb.length; const r = smooth ? 0.5 * raw[i] + 0.5 * avg : raw[i]; return { r, m: mult(r) }; });
      };
      const draw = () => {
        const out = compute();
        svg.innerHTML = C.map((c, i) => { const [x, y] = pos(c), m = out[i].m, col = m >= 2 ? 'var(--red)' : m > 1 ? 'var(--amber)' : 'var(--surface-2)', op = m > 1 ? (0.25 + 0.6 * Math.min(1, (m - 1) / 2)).toFixed(2) : 1;
          return `<g data-i="${i}" style="cursor:pointer"><polygon points="${pts(x, y)}" fill="${col}" fill-opacity="${op}" stroke="${i === sel ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${i === sel ? 3 : 1}"/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-family="var(--f-mono)" fill="var(--ink)">${m.toFixed(1)}×</text></g>`; }).join('');
        svg.querySelectorAll('g').forEach(g => g.addEventListener('click', () => { sel = Number(g.dataset.i); sync(); draw(); }));
        const o = out[sel], c = C[sel], sur = out.filter(x => x.m > 1).length, mx = Math.max(...out.map(x => x.m));
        el.querySelector('.uber-o1').textContent = `${Math.round(c.d * boost)} / ${c.s}`;
        el.querySelector('.uber-o2').textContent = `${o.r.toFixed(2)} → ${o.m.toFixed(1)}×`;
        el.querySelector('.uber-o3').textContent = `${sur} / ${C.length}`;
        el.querySelector('.uber-o4').textContent = mx.toFixed(1) + '×';
        el.querySelector('.uber-o5').textContent = smooth
          ? 'Smoothing ON: every cell also looks at its neighbours. The price does not jump suddenly when you cross one street, and nearby drivers get a slowly growing signal to "head that way". All neighbours of a hexagon are at the same distance, so this average is clean.'
          : 'Smoothing OFF: every cell looks only at its own ratio. The stadium cell is very high and its neighbours are normal: a rider on the border can walk 100 metres and pay half, and the signal for drivers is jumpy.';
        el.querySelector('.uber-hsm').textContent = 'Smoothing: ' + (smooth ? 'ON' : 'OFF');
      };
      const sync = () => { hd.value = C[sel].d; hs.value = C[sel].s; };
      hd.addEventListener('input', () => { C[sel].d = Number(hd.value); draw(); });
      hs.addEventListener('input', () => { C[sel].s = Number(hs.value); draw(); });
      hb.addEventListener('input', () => { boost = Number(hb.value); draw(); });
      el.querySelector('.uber-hsm').onclick = () => { smooth = !smooth; draw(); };
      el.querySelector('.uber-hr').onclick = () => { C = fresh(); sel = C.findIndex(c => c.q === 0 && c.r === 0); smooth = true; boost = 1; hb.value = 1; sync(); draw(); };
      sync(); draw();
    }},
    { type: 'p', html: `At the start, the stadium cell (30 requests, 8 drivers) shows 1.8× with smoothing ON and 2.4× with smoothing OFF, because with smoothing ON its calm neighbours pull the average down. Raise the stadium\'s supply to 30: the surge disappears. This is the "relief valve": drivers came, the imbalance went away, the price is normal again.` },

    { type: 'p', html: `Now the pipeline. One line in the paper is worth remembering: surge puts <strong>data freshness and availability above consistency</strong>. Messages that arrive late are not included in the surge calculation at all, because each window\'s result is needed within a strict end-to-end time limit. So the Kafka cluster for surge is set up for high throughput, not for "never lose a single message". And for disasters, it uses an <strong>active-active</strong> setup:` },
    { type: 'callout', tone: 'term', title: 'New word: Active-active', html: `<strong>What it is:</strong> the same system running in two (or more) regions (data centers in different cities) <strong>at the same time</strong>, both "warm".<br><strong>Why we need it:</strong> if one region fails, the other is already ready; no waiting minutes to "wake up a standby".<br><strong>Without it:</strong> when a region fails, surge stops until the backup starts. The cost: the work is done in two places, so double the compute.` },
    { type: 'flow', title: 'Surge pipeline (based on the SIGMOD 2021 paper)', height: 310,
      nodes: [
        { id: 'apps', label: 'Apps + services', sub: 'trip, rider, driver', x: 85, y: 150, w: 150, kind: 'client', info: 'What it is: Uber\'s apps and internal services that produce events. Rider requests, driver status and trip events. All these events go into Kafka.' },
        { id: 'rk', label: 'Regional Kafka', sub: 'per region', x: 260, y: 150, w: 140, kind: 'queue', info: 'What it is: each region (data center area) has its own Kafka. According to the paper, all trip events first go to the Kafka cluster of their own region, because the nearby cluster is faster and cheaper.' },
        { id: 'ak', label: 'Aggregate Kafka', sub: 'global view', x: 430, y: 150, w: 140, kind: 'queue', info: 'What it is: a big Kafka where the data of all regions comes together. Data from the regional clusters is copied into aggregate clusters (Uber\'s uReplicator), so every region has the same input for the whole world.' },
        { id: 'fl', label: 'Flink: region A', sub: 'per hexagon', x: 610, y: 60, w: 150, kind: 'server', info: 'What it is: a stream processing job running in region A. A big Flink job with lots of memory: for each hexagon in a time window, it computes the multiplier from demand, supply and an ML model. The primary region\'s result is used.' },
        { id: 'kv', label: 'Pricing KV', sub: 'cell → multiplier', x: 610, y: 150, w: 150, kind: 'data', info: 'What it is: a simple, fast "key → value" database (here hexagon ID → multiplier). A fast key-value store (an active/active database in the paper). The fare service reads the hexagon\'s multiplier from here instantly.' },
        { id: 'fl2', label: 'Flink: region B', sub: 'not standby, warm', x: 430, y: 262, w: 150, kind: 'server', info: 'What it is: a warm copy of the same job in region B. The same job, on the same aggregate input, running independently in the other region. Flink\'s state is so big that it is not copied between regions in real time; so each region computes on its own and reaches the same result from the same input.' },
        { id: 'fare', label: 'Fare / estimate', sub: 'GET /estimate', x: 610, y: 262, w: 150, kind: 'server', info: 'What it is: the service that shows the rider a price like "₹212". When it shows the fare, it reads the multiplier of the pickup hexagon.' },
      ],
      edges: [{ a: 'apps', b: 'rk' }, { a: 'rk', b: 'ak' }, { a: 'ak', b: 'fl' }, { a: 'fl', b: 'kv' }, { a: 'kv', b: 'fare' }, { a: 'ak', b: 'fl2' }, { a: 'fl2', b: 'kv', id: 'f2kv', dashed: true, hidden: true }],
      scenarios: [
        { name: 'Surge for each window', steps: [
          { title: 'Events arrive', text: 'A flood of requests from the stadium hexagon, and few drivers.', flood: { paths: ['evt:apps>rk>ak'], n: 8 } },
          { title: 'Window compute', text: 'The Flink jobs in both regions read the same input and compute the multiplier for every hexagon.', parallel: true, go: ['evt:ak>fl', 'evt:ak>fl2'], msg: 'window 18:42:00-18:43:00  cell 8961… → 1.8×' },
          { title: 'The primary writes', text: 'Only the update service of the primary region (A) writes to the KV store.', go: 'fl>kv', after: { kv: { state: 'ok', sub: 'stadium: 1.8×' } } },
          { title: 'Used in the fare', text: 'The rider\'s estimate uses the new multiplier. A few seconds old is fine.', go: ['fare>kv', 'res:kv>fare'], msg: 'fare = base × 1.8' },
        ]},
        { name: 'Late events', steps: [
          { title: 'One region\'s events are late', text: 'Because of a network hiccup, some events arrived after the window had closed.', go: 'lost:apps>rk', set: { rk: { state: 'warn', sub: 'late msgs' } } },
          { title: 'Drop them', text: 'According to the paper, late messages are not included in the surge calculation. A little less accurate, but on time. This would never be OK for payments; for surge it is.', go: ['evt:ak>fl', 'fl>kv'], set: { rk: { state: '' } }, after: { kv: { state: 'ok', sub: 'on time' } } },
        ]},
        { name: 'Region A down', steps: [
          { title: 'Disaster', text: 'Region A went down.', set: { fl: { state: 'down', sub: 'region down' } }, focus: ['fl'] },
          { title: 'B becomes primary', text: 'An all-active coordinating service makes region B the primary. B\'s Flink job was already warm, so its update service simply starts writing to the KV store.', set: { fl2: { state: 'ok', sub: 'PRIMARY' } }, show: ['f2kv'], go: 'fl2>kv', after: { kv: { state: 'ok', sub: 'fed by B' } } },
          { title: 'The cost', text: 'A full, redundant pipeline runs in every region: a lot of compute. The paper itself calls this compute intensive. Surge is so important for the business that this cost is paid.', go: ['fare>kv', 'res:kv>fare'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 5: ETA, routing engine + ML correction' },
    { type: 'p', html: `ETA is everywhere: in matching\'s ranking, in the pickup time the rider sees, in the fare. According to Uber\'s February 2022 DeepETA post, it is built in two parts:` },
    { type: 'steps', items: [
      { t: 'Routing engine', d: 'The road network is broken into small segments: the edges of a graph, where each edge\'s weight = the time to cross that segment (with real-time traffic). A shortest path algorithm finds the best route and adds up the segment times to give a first ETA. (Details of map routing are in the <a href="#/design-maps">Google Maps</a> lesson.)' },
      { t: 'ML residual (DeepETA)', d: 'There is a gap between the routing ETA and the real time taken (traffic signals, finding the pickup point, weather). A model predicts only this <strong>gap</strong>, from features like origin, destination, time, live traffic and the request type (ride or delivery). Final ETA = routing ETA + predicted correction.' },
    ]},
    { type: 'list', items: [
      `<strong>Before:</strong> according to the post, for many years Uber used gradient-boosted trees (XGBoost: a model made by combining many small "if-then" decision trees); the model grew so big that scaling it further became hard, so they moved to deep learning.`,
      `<strong>Model:</strong> a linear transformer (a transformer is a kind of neural network; the "linear" kind is cheaper and faster), with many millions of parameters in embedding tables (lists of learned numbers for things like each road segment), but each prediction touches only ~0.25% of the parameters.`,
      `<strong>Latency:</strong> the ETA is needed within a few milliseconds; the post calls it Uber\'s highest-QPS (queries per second) model.`,
      `<strong>Serving:</strong> on Michelangelo (Uber\'s ML platform, made public in 2017), behind the routing front end uRoute.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'Spot the pattern', html: `"A base answer from physics/graphs, and only a correction from ML" is a very useful pattern: the model stays small, accuracy improves without touching the routing engine, and if the model fails, the base answer becomes the fallback.` },

    { type: 'h2', text: 'Live tracking: the rider sees the driver moving' },
    { type: 'p', html: `The rider app needs the driver\'s location and the trip status. At first, Uber\'s apps used <strong>polling</strong> (asking again and again). According to Uber\'s December 2020 RAMEN post, at peak <strong>80% of the requests</strong> to the API gateway were polling: drained batteries, busy networks, slow apps. So they built a push platform: in 2015 on <a href="#/realtime">SSE</a>, with their own reliability layer on top; from 2019, two-way streaming based on gRPC (a fast request-response method made by Google). At the time of the post, about 1.5 million concurrent connections and 250,000+ messages per second.` },
    { type: 'p', html: `The flow: the driver\'s ping reaches the location service (the diagram above), from there it becomes an update for the rider on the push platform, which sends it over the rider\'s open connection. Not every ping needs to reach the rider; to make the map look smooth, the app animates the positions in between.` },

    { type: 'h2', text: 'Bottlenecks and failures, in one place' },
    { type: 'table', head: ['What broke', 'What happens', 'Defence'], rows: [
      ['Location intake overload', 'Geo index or location shards get hot, pings are dropped', 'Shard by cell, replicas, adaptive ping interval (parked drivers send less), keep Kafka off the critical path'],
      ['Hot cell (stadium, airport)', 'All the load on one shard', 'Finer resolution, read replicas, batched matching'],
      ['A gateway node dies', 'The phones on that node disconnect', 'Stateless gateways; the app reconnects with exponential backoff + jitter'],
      ['Driver ignored the offer', 'The rider keeps waiting', 'Offer TTL, lock TTL, next candidate'],
      ['Two workers, one driver', 'Double assignment', 'Conditional write / transaction (strongly consistent supply store)'],
      ['Payments down', 'Charges are not happening', 'Complete the trip, keep the event in Kafka; exactly once with a deterministic order ID'],
      ['Region down', 'Surge and dispatch may stop', 'Active-active (surge), multi-region transactional store (trips)'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Two kinds of data', d: 'Location: high volume, short-lived, a little old is fine → RAM geo index + Kafka. Trip/supply/payment: strongly consistent → transactional store.' },
      { t: 'Napkin maths', d: '1 million drivers / 4 s = 250,000 writes/s. So no database here, an in-memory index.' },
      { t: 'Geo index', d: 'H3 cells, sharding by cell, k-ring search, TTL. A plan for hot cells.' },
      { t: 'Matching', d: 'Candidates from cells, ranking by road ETA, a batch of a few seconds, an offer to one driver + timeout, a lock through a conditional write.' },
      { t: 'Trip state machine', d: 'Allowed transitions, versioned conditional writes, idempotent retries, outbox event → payments async.' },
      { t: 'Payments', d: 'Upfront fare, authorization hold on the card, final charge async on the trip end event, double-entry ledger, exactly once with a unique order ID.' },
      { t: 'Surge', d: 'Kafka → Flink windows per hexagon → KV; freshness > consistency; active-active.' },
      { t: 'Evolution', d: 'S2 → H3, Ringpop → Spanner-based fulfillment, Schemaless → Docstore. Show that you understand the trade-offs, not that you memorised names.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• "Who is nearby?" and things move every few seconds → <strong>H3/geohash cells + an in-memory index (Redis GEO or custom)</strong>, with a TTL. Static places → Elasticsearch/PostGIS.<br>• Two people must never get the same resource (driver, seat) → <strong>strongly consistent store + conditional write/transaction</strong>.<br>• A multi-step lifecycle (ride, order) → <strong>state machine</strong> + idempotent transitions + events.<br>• A live aggregate (surge, trending) → <strong>Kafka + stream processor windows</strong>, freshness &gt; perfect accuracy.<br>• Money → exactly-once via idempotency keys, async, off the critical path.` },

    { type: 'diagram', title: 'The whole design at a glance', height: 620,
      caption: 'Top: the location firehose (in RAM, a little old is fine). Middle: ride request, matching and the trip (strongly consistent). Bottom: work after the trip (payments, receipt), done async through events. Use the buttons to see one path at a time.',
      groups: [
        { label: 'Location path (every ~4 s)', x: 8, y: 28, w: 570, h: 92 },
        { label: 'Surge (stream processing)', x: 8, y: 146, w: 420, h: 92 },
        { label: 'Ride request, matching, trip', x: 8, y: 266, w: 708, h: 212 },
        { label: 'After the trip (async)', x: 148, y: 506, w: 424, h: 96 },
      ],
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'GPS ping', x: 75, y: 80, w: 120, kind: 'client', info: 'What it is: the app on the driver\'s phone. It sends its lat/lng every ~4 seconds (Uber\'s 2015 number), and offers arrive here. The whole firehose starts here.' },
        { id: 'wsg', label: 'WS gateway', sub: 'WebSocket', x: 215, y: 80, w: 120, kind: 'net', info: 'What it is: the servers that hold the open WebSocket connections of millions of phones. They pass pings in and offers out. Stateless: if one dies, the phone connects to another.' },
        { id: 'loc', label: 'Location svc', sub: 'lat/lng → H3', x: 360, y: 80, w: 120, kind: 'server', info: 'What it is: the service that checks every ping and computes its H3 cell. It updates the geo index and sends the ping to Kafka for history. Sharded across many machines by cell.' },
        { id: 'geo', label: 'Geo index', sub: 'cell → drivers', x: 505, y: 80, w: 120, kind: 'cache', info: 'What it is: a list in RAM of "H3 cell → available drivers", with a TTL on every entry. Why: nearby drivers in milliseconds. S2 cells in 2015, Uber\'s own H3 from 2018.' },
        { id: 'kf', label: 'Kafka', sub: 'pings + requests', x: 360, y: 200, w: 120, kind: 'queue', info: 'What it is: an append-only log of events. Location pings and ride requests come here, so surge, analytics and ETA training can read them at their own speed without holding up matching.' },
        { id: 'fl', label: 'Flink surge', sub: 'window/hexagon', x: 215, y: 200, w: 120, kind: 'server', info: 'What it is: a stream processing job. In every time window, it looks at the demand and supply of every hexagon and computes the multiplier (SIGMOD 2021 paper). It drops late events; freshness first. Active-active in two regions.' },
        { id: 'kv', label: 'Pricing KV', sub: 'cell → 1.8×', x: 75, y: 200, w: 120, kind: 'data', info: 'What it is: a fast key-value store: hexagon ID → surge multiplier. It is read instantly when a fare is computed.' },
        { id: 'rid', label: 'Rider app', sub: 'book ride', x: 75, y: 320, w: 120, kind: 'client', info: 'What it is: the app on the rider\'s phone. It shows the fare, asks for a ride (with an Idempotency-Key), and gets the driver\'s location and the receipt by push.' },
        { id: 'api', label: 'API + fare', sub: 'estimate, rides', x: 215, y: 320, w: 120, kind: 'net', info: 'What it is: the door for the rider\'s HTTP requests. For an estimate, it reads the surge multiplier of the pickup hexagon and builds the upfront fare, and it hands ride requests to the trip service.' },
        { id: 'trip', label: 'Trip svc', sub: 'state machine', x: 360, y: 320, w: 120, kind: 'server', info: 'What it is: the service that manages the life of a ride (the demand side). A ride moves from REQUESTED to PAID only through allowed transitions, each with a conditional write. It also puts requests on Kafka (demand for surge).' },
        { id: 'dis', label: 'Dispatch', sub: 'batch + ETA', x: 505, y: 320, w: 120, kind: 'server', info: 'What it is: the brain of matching (Uber\'s old name: DISCO). Candidates from the geo index, ranking by ETA, a batch of a few seconds, a lock on the driver, one offer to one driver with a timeout.' },
        { id: 'eta', label: 'ETA svc', sub: 'routing + ML', x: 650, y: 320, w: 120, kind: 'server', info: 'What it is: the service that says "how many minutes by road for the driver". A routing engine gives a base ETA on the road graph, and the DeepETA model (2022 post) adds a correction.' },
        { id: 'tdb', label: 'Trip store', sub: 'Spanner (2021+)', x: 360, y: 440, w: 120, kind: 'data', info: 'What it is: the strongly consistent, transactional database for ride and driver state. Since 2021 Uber\'s fulfillment runs on Google Cloud Spanner; before that there were stores like Schemaless, Cassandra and Redis.' },
        { id: 'evt', label: 'Trip events', sub: 'outbox → Kafka', x: 360, y: 560, w: 120, kind: 'queue', info: 'What it is: a stream of events like "ride r9 COMPLETED", written together with the state (outbox/CDC). Payments and push read it at their own speed.' },
        { id: 'pay', label: 'Payments', sub: 'Gulfstream', x: 505, y: 560, w: 120, kind: 'server', info: 'What it is: the platform that collects money and pays drivers. It turns the hold into the final charge. Double-entry ledger, immutable orders, exactly once with a unique order ID (2020 post).' },
        { id: 'push', label: 'Push', sub: 'RAMEN', x: 215, y: 560, w: 120, kind: 'net', info: 'What it is: Uber\'s push platform (2020 post). Instead of polling, the server itself sends updates to the rider\'s or driver\'s phone: where the driver is, trip status, receipt.' },
      ],
      edges: [
        { a: 'drv', b: 'wsg' }, { a: 'wsg', b: 'loc' }, { a: 'loc', b: 'geo' },
        { a: 'loc', b: 'kf', kind: 'evt' }, { a: 'kf', b: 'fl', kind: 'evt' }, { a: 'fl', b: 'kv' },
        { a: 'api', b: 'kv', label: 'surge ×' },
        { a: 'rid', b: 'api' }, { a: 'api', b: 'trip' }, { a: 'trip', b: 'kf', kind: 'evt', label: 'requests' },
        { a: 'trip', b: 'dis' }, { a: 'dis', b: 'geo', label: 'k-ring' }, { a: 'dis', b: 'eta' },
        { a: 'dis', b: 'tdb', label: 'lock driver' }, { a: 'trip', b: 'tdb' },
        { a: 'dis', b: 'wsg', label: 'offer', via: [[440, 140], [280, 140]] },
        { a: 'tdb', b: 'evt', kind: 'evt', label: 'outbox / CDC' }, { a: 'evt', b: 'pay', kind: 'evt' }, { a: 'evt', b: 'push', kind: 'evt' },
        { a: 'push', b: 'rid', kind: 'res', label: 'receipt' },
      ],
      paths: [
        { name: 'Driver location', text: 'Driver app → WS gateway → location service (computes the H3 cell) → geo index (RAM, TTL). At the same time, the ping goes to Kafka for history.', go: ['drv>wsg>loc>geo', 'loc>kf'] },
        { name: 'Request ride', text: 'Rider app → API: reads the surge of the pickup hexagon and builds the upfront fare. On "Book", the trip service writes the ride in the REQUESTED state to the trip store.', go: ['rid>api>kv', 'rid>api>trip>tdb'] },
        { name: 'Match', text: 'Dispatch: k-ring candidates from the geo index, road ETA from the ETA service, a conditional-write lock on the driver, then the offer to the driver through the WS gateway.', go: ['trip>dis>geo', 'dis>eta', 'dis>tdb', 'dis>wsg>drv'] },
        { name: 'Surge', text: 'Pings (supply) and requests (demand) into Kafka → Flink computes a multiplier for every hexagon in every window → Pricing KV → used in the fare.', go: ['loc>kf>fl>kv', 'trip>kf', 'api>kv'] },
        { name: 'Trip end + payment', text: 'Trip COMPLETED and its event in one transaction → Kafka → payments turns the hold into the final charge (exactly once) → the receipt reaches the rider by push.', go: ['trip>tdb>evt>pay', 'evt>push>rid'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Two kinds of data: location (huge volume, old quickly, a little old is fine) → RAM geo index + Kafka; trip, driver state and money → strongly consistent store.</li>
      <li>1 million drivers ÷ 4 s = 250,000 writes/s: so not a normal database, but an in-memory index with a TTL.</li>
      <li>H3 hexagons: lat/lng → cell ID, nearby drivers through the k-ring (1, 7, 19, 37... cells); sharding by cell ID, a plan for hot cells.</li>
      <li>Matching: candidates from cells, ranking by road ETA, a batch of a few seconds, one offer to one driver + timeout, a lock through a conditional write.</li>
      <li>A ride is a state machine: only allowed transitions, versioned conditional writes, idempotent retries.</li>
      <li>Payments are async: upfront fare, hold on the card, final charge on the trip end event, double-entry ledger, exactly once with a unique ID.</li>
      <li>Surge: Kafka → Flink windows per hexagon → KV; freshness &gt; perfect accuracy; active-active regions.</li>
      <li>Uber replaced components over the years (S2 → H3, Ringpop → Spanner, Schemaless → Docstore): remember the trade-offs, not the names.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['In-memory geo index: hundreds of thousands of writes/s, nearby queries in milliseconds', 'Location and trip data kept apart: each gets the right consistency', 'Batched, ETA-based matching: lower total wait in the city', 'State machine + conditional writes: no double assignment and no double charge', 'Async payments via Kafka: trip end never gets stuck on payment', 'Streaming surge: a price for every hexagon within seconds'],
      costs: ['Location in RAM: if a node dies, a few seconds of data are lost (the next ping refills it)', 'Strongly consistent store: more latency, expensive (Spanner)', 'Batching: every rider waits a few extra seconds', 'Surge drops late events: a little less accurate', 'Active-active: double the compute', 'Many moving parts: debugging and on-call are hard'] },

    { type: 'think', questions: [
      { q: 'A driver\'s phone is not moving (at a signal, or waiting for a ride). Should it still ping every 4 seconds?', a: 'Not necessarily. Use an adaptive interval: moving drivers ping more often, parked drivers less (just to refresh the TTL). This saves both the firehose load and the phone\'s battery. But the TTL must be longer than the ping interval, or parked drivers will vanish from the index.' },
      { q: 'If dropping late events is fine for surge, why not for payment events?', a: 'Surge is rebuilt from a new window every few seconds; if one window is a little wrong, the next one fixes it, and the effect of the mistake is small. A payment is a permanent, one-time record; if an event is dropped, the money is either not charged or charged wrongly. So payments use a lossless Kafka setup, retries, a DLQ (dead letter queue) and idempotency; surge uses throughput and freshness.' },
      { q: 'The rider pressed cancel and in the same second the driver pressed "arrived". What should happen?', a: 'Both are conditional writes that check the current state and version. Whichever commits first wins. If arrived came first, the cancel now happens from ARRIVED (allowed by the state machine, maybe with a fee). If cancel came first, arrived is rejected, and the driver app shows "ride cancelled". No strange in-between state is ever created.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why not UPDATE a normal SQL table for driver locations?', options: ['SQL cannot store lat/lng', 'Hundreds of thousands of writes per second and data that is old within seconds: a geo index in RAM is cheaper and faster', 'SQL has no indexes'], answer: 1, explain: '1 million drivers / 4 s = 250,000 writes/s. Only the latest location is needed, which fits in RAM; history goes to Kafka.' },
      { q: 'What should candidates be ranked by in matching?', options: ['Straight-line (aerial) distance', 'Road ETA', 'The driver\'s rating'], answer: 1, explain: 'Uber\'s matching page itself says the closest is not always the quickest: flyovers, rivers, traffic. The geo index only gives candidates; ranking is by ETA.' },
      { q: 'What is the real benefit of batched matching?', options: ['Every rider always gets the closest driver', 'Looking at a few seconds of requests together lowers the total wait in the city', 'It saves server CPU'], answer: 1, explain: 'In the first scenario of the widget, greedy gives 16 min and batching 10 min. One rider may wait a little longer, but the total goes down.' },
      { q: 'What matters most to make sure one driver is not assigned to two riders?', options: ['A very fast geo index', 'A conditional write / transaction on the supply state (available → offered)', 'Sending the driver two offers and seeing what happens'], answer: 1, explain: 'The standard fix for contention: change it only if the state is still available. The loser takes its next candidate.' },
      { q: 'In H3, how many cells are in the rider\'s k-ring for k = 2?', options: ['7', '19', '12'], answer: 1, explain: 'The formula is 1 + 3k(k+1): 7 for k = 1, 19 for k = 2, 37 for k = 3. The widget shows the same count as you increase k.' },
      { q: 'Why is a "pending" authorization hold put on the card when a ride is requested?', options: ['To take money from the rider twice', 'To know early that the card works and to stop fraud; after the trip the hold becomes the final charge', 'To pay the driver immediately'], answer: 1, explain: 'According to Uber\'s page, the hold is not a duplicate charge. After the trip it becomes the final charge, and it is removed on cancel.' },
      { q: 'According to the SIGMOD 2021 paper, what does Uber\'s surge pipeline give priority to?', options: ['Exactly-once processing of every message', 'Data freshness and availability, above consistency', 'A nightly batch job'], answer: 1, explain: 'Late messages are dropped, the Kafka cluster is set up for throughput, and redundant Flink jobs run active-active across regions.' },
    ]},

    { type: 'sources', note: 'The Uber-specific parts come from these sources. Many sources are a few years old; the year is given for each item, and where Uber later changed a component, the lesson says so. The napkin maths numbers are assumptions.', items: [
      { title: 'How Uber Scales Their Real-Time Market Platform', publisher: 'High Scalability, summary of Matt Ranney\'s (Uber Chief Systems Architect) talk "Scaling Uber\'s Real-time Market Platform"', year: 2015, url: 'https://highscalability.com/how-uber-scales-their-real-time-market-platform/', used: 'Supply/demand/DISCO split, 4-second pings, S2 level-12 cells as shard key, 1M writes/s design goal, ETA over distance, matching drivers about to finish trips, Ringpop + SWIM, state digest on driver phones for DC failover.' },
      { title: 'Ringpop: Scalable, Fault-Tolerant Application-Layer Sharding', publisher: 'Uber Engineering blog', year: 2016, official: true, url: 'https://www.uber.com/blog/ringpop-open-source-nodejs-library/', used: 'Consistent hashing ring, SWIM gossip membership, handle-or-forward, use in geospatial/dispatch.' },
      { title: 'H3: Uber\'s Hexagonal Hierarchical Spatial Index', publisher: 'Uber Engineering blog', year: 2018, official: true, url: 'https://www.uber.com/blog/h3/', used: 'Grouping marketplace events into hexagons, use in surge and dispatch, equal neighbour distance, 16 resolutions, k-ring.' },
      { title: 'How does Uber match riders with drivers?', publisher: 'Uber marketplace page', official: true, url: 'https://www.uber.com/us/en/marketplace/matching/', used: 'Closest is not always quickest; early first-come matching; batched matching after a few seconds to reduce total wait.' },
      { title: 'How surge pricing works', publisher: 'Uber marketplace page', official: true, url: 'https://www.uber.com/us/en/marketplace/pricing/surge-pricing/', used: 'Surge as a relief valve, hyperlocal, tied to the size of the imbalance, frequent updates.' },
      { title: 'Real-time Data Infrastructure at Uber (Fu, Soman)', publisher: 'SIGMOD 2021 paper by Uber engineers', year: 2021, official: true, url: 'https://arxiv.org/abs/2104.00087', used: 'Surge as Kafka → Flink (ML) → KV per hexagon per window; freshness/availability over consistency; late messages dropped; active-active regions with redundant Flink; uReplicator; trillions of Kafka messages per day (as of Oct 2020).' },
      { title: 'Uber\'s Fulfillment Platform: Ground-up Re-architecture', publisher: 'Uber Engineering blog', year: 2021, official: true, url: 'https://www.uber.com/blog/fulfillment-platform-rearchitecture/', used: 'Old rt-demand/rt-supply with Ringpop, Cassandra/Redis and best-effort consistency; move to Google Cloud Spanner, statecharts, transaction coordinator, LATE.' },
      { title: 'Evolving Schemaless into a Distributed SQL Database (Docstore)', publisher: 'Uber Engineering blog', year: 2021, official: true, url: 'https://www.uber.com/blog/schemaless-sql-database/', used: 'Schemaless limits; Docstore on MySQL with Raft per partition, strict serializability per partition, transactions, CDC.' },
      { title: 'Project Mezzanine: The Great Migration', publisher: 'Uber Engineering blog', year: 2015, official: true, url: 'https://www.uber.com/blog/mezzanine-codebase-data-migration/', used: 'Trips outgrowing a single PostgreSQL in early 2014; migration to Schemaless.' },
      { title: 'DeepETA: How Uber Predicts Arrival Times Using Deep Learning', publisher: 'Uber Engineering blog', year: 2022, official: true, url: 'https://www.uber.com/blog/deepeta-how-uber-predicts-arrival-times/', used: 'Routing engine on road graph + ML residual, XGBoost before, linear transformer, few-ms latency, highest-QPS model, served via Michelangelo.' },
      { title: 'Uber\'s Real-Time Push Platform (RAMEN)', publisher: 'Uber Engineering blog', year: 2020, official: true, url: 'https://www.uber.com/blog/real-time-push-platform/', used: '80% of gateway requests were polling; SSE (2015) then gRPC (2019+); 1.5M concurrent connections, 250k+ messages/s.' },
      { title: 'Revolutionizing Money Movements at Scale with Strong Data Consistency', publisher: 'Uber Engineering blog', year: 2020, official: true, url: 'https://www.uber.com/blog/money-scale-strong-data/', used: 'Gulfstream: double-entry, immutable orders, deterministic IDs for exactly-once, orders processed asynchronously via topics.' },
      { title: 'Tables of Cell Statistics Across Resolutions', publisher: 'H3 official docs (h3geo.org)', official: true, url: 'https://h3geo.org/docs/core-library/restable/', used: 'Average hexagon area and edge length for resolutions 7-9, 7 children per hexagon, 16 resolutions (0-15).' },
      { title: 'What is an authorization hold?', publisher: 'Uber blog / help page', official: true, url: 'https://www.uber.com/en-GB/blog/what-is-an-authorization-hold/', used: 'Temporary hold at or after request, becomes the final charge, not a duplicate charge, removed on cancel.' },
      { title: 'Upfront fares: no math and no surprises', publisher: 'Uber Newsroom', year: 2016, official: true, url: 'https://www.uber.com/newsroom/upfront-fares-no-math-and-no-surprises', used: 'Exact fare shown before request from expected time, distance, traffic and demand; rolled out for uberX in 2016 incl. India; recalculated if the trip changes a lot.' },
    ]},
  ],
});
