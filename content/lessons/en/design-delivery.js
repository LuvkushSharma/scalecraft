Lesson.register({
  id: 'design-delivery',
  title: 'Zomato / Swiggy',
  minutes: 40,
  summary: `A marketplace with three sides: the customer, the restaurant or store, and the delivery partner. A heavy peak at 8-10 pm, and one order that moves through many states across many services. Serviceability (who can deliver here), the order state machine, payments, Kafka events, delivery partner assignment and batching, and live tracking: based on what the engineers of Swiggy and Zomato wrote themselves.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You open Swiggy or Zomato on your phone. The app must tell you right away which shops can deliver to your home, and in how many minutes.<br>When you order, money must be taken (only once!), the shop must get the news, and a partner on a bike must be sent at the right moment.<br>Then you watch the partner move towards your home on a map.<br>All of this must keep working at 8-10 pm, when the whole city orders at the same time. This lesson teaches exactly that, one piece at a time, from zero.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think for 10 minutes. When a customer opens the app, which of 2,000 restaurants should you show, and how do you write "32 min" on each one? After the order, <em>when</em> should you send the delivery partner? What do you do if the payment gives no answer? Then compare with this lesson.` },
    { type: 'p', html: `This is a <strong>case study</strong>. Engineers at Swiggy (the Swiggy Bytes blog) and Zomato (the Zomato engineering blog) have written a lot about serviceability, delivery time prediction, assignment, batching, payment routing and tracking. This lesson is based on those posts, and the year of each post is written everywhere (many posts are from 2018-2023, so things have probably changed since). Where a part is not public (like the exact database of their order service, or their Kafka topics), the lesson clearly says that it is the common industry approach.` },
    { type: 'p', html: `It uses building blocks from earlier lessons: <a href="#/ds-for-scale">geohash</a>, <a href="#/kafka">Kafka</a>, <a href="#/distributed-tx">sagas</a>, <a href="#/pagination-idempotency">idempotency</a>, <a href="#/realtime">real-time push</a>, and the matching from <a href="#/design-uber">Uber</a>. The biggest difference from Uber: here there is a <strong>third party</strong> in the middle (the restaurant or store). Its work (cooking, packing) takes time and is not in our control. Do not worry: we will explain each of these words again, from zero, the first time we need it.` },

    { type: 'h2', text: 'Step 0: from zero, the simplest version' },
    { type: 'p', html: `Before any diagram, a story. Riya lives in Bengaluru. She opens the app, picks a shop, places an order, and the items arrive in 30 minutes. This story has four characters: <strong>Riya's app</strong>, <strong>the shop's (restaurant or store) app</strong>, <strong>the delivery partner's app</strong>, and <strong>our system</strong> in the middle (servers and databases).` },
    { type: 'p', html: `The simplest design is one server and one database. A server is a computer that listens to questions from apps and answers them. A database is the place where all shops, orders and partners are written down. Now give this simple design four jobs and see where it breaks:` },
    { type: 'steps', items: [
      { t: 'Job 1: "who is near me?"', d: 'Every time the app opens, the server reads the list of all shops and works out the distance to each one. Lakhs of shops, lakhs of visits every minute: the database will be worn out. <strong>The fix:</strong> split the map into small boxes (geohash, clusters) so that we only look at nearby shops, and remember repeated calculations (cache). In Step 4.' },
      { t: 'Job 2: the order and the money', d: 'Create the order, take the money, tell the shop: what if one step fails in the middle? What if money was taken but no order was created? <strong>The fix:</strong> write down every condition (state) of the order clearly (state machine), give each request a unique token (idempotency key), and send news to everyone else through an event stream (Kafka). In Step 5.' },
      { t: 'Job 3: which partner?', d: 'Send the closest one? He will stand at the shop for 10 minutes while the food is cooked, and nobody will be left for the next order. <strong>The fix:</strong> predictions + sending at the right moment (JIT) + two orders together (batching). In Deep dive 1.' },
      { t: 'Job 4: the partner live on the map', d: 'If every customer app asks the server "where is the partner?" every 2 seconds, the server carries a useless load. <strong>The fix:</strong> the server tells the app by itself (push) over an open connection (MQTT). In Deep dive 3.' },
    ]},
    { type: 'p', html: `And on top of all this: everything happens during the evening peak, when the load is many times higher than in the day (Deep dive 4). One single server cannot do all this, so we split the system into many small services. First, two basic words:` },
    { type: 'callout', tone: 'term', title: 'New word: Microservice', html: `<strong>What it is:</strong> a small, separate program that does only one job (like only payments, or only finding partners) and talks to other services over the network.<br><strong>Why we need it:</strong> each part can grow as much as it needs. Listing has crores of calculations, payments has few; each can get its own machines. Different teams can work on different services.<br><strong>Without it:</strong> one big program (a monolith), where one small bug can bring down the whole app, and to grow listing you must also grow payments.<br><strong>Example:</strong> Swiggy's 2021 post says they have "hundreds of microservices".` },
    { type: 'callout', tone: 'term', title: 'New word: Cache', html: `<strong>What it is:</strong> a copy kept in fast memory of an answer that was expensive to work out. Like writing the answer to a question you are asked again and again on a slip of paper and keeping it in your pocket.<br><strong>Why we need it:</strong> working out "how many km by road from shop X to home Y?" every time is slow and expensive. Work it out once and remember it.<br><strong>Without it:</strong> thousands of expensive calculations on every app visit, a slow app, and a big bill. Details in the <a href="#/caching">Caching lesson</a>.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'callout', tone: 'term', title: 'New word: Three-sided marketplace', html: `<strong>What it is:</strong> a platform that connects <strong>three</strong> different groups: the customer (places the order), the merchant (restaurant or store, prepares the order), and the delivery partner (delivers it).<br><strong>Why it matters:</strong> every design decision affects all three. The customer wants a correct time, the merchant wants orders, the partner wants income (more orders, less empty waiting).<br><strong>Without it (if you think only about the customer):</strong> you send the closest partner, he waits at the shop, his income drops, and partners leave the app. Then nobody is left for customers either.` },
    { type: 'compare',
      left: { title: 'Functional', html: `• Show the restaurants/stores that can deliver to this location, with a delivery time on each<br>• Menu, cart, checkout, payment<br>• Place order → restaurant accepts → ready → pickup → deliver<br>• Cancel (by customer or restaurant), refund<br>• Assign a delivery partner, live tracking<br><br><strong>Out of scope:</strong> reviews, ads, restaurant onboarding` },
      right: { title: 'Non-functional', html: `• Home page/listing is fast: a few hundred ms (hundreds of restaurants calculated on every request)<br>• Handle the dinner peak, scale down at night (save money)<br>• The delivery time promise is correct: not too high, not too low<br>• An order or payment is never lost or doubled<br>• If one service falls, the whole app does not fall` },
    },

    { type: 'h2', text: 'Step 2: napkin maths, where is the real load?' },
    { type: 'p', html: `Napkin maths means rough estimates on paper: how much load, and where. One word first: a <strong>serviceability check</strong> = one question, "can this shop deliver to this customer in a reasonable time?" (we will understand it fully in Step 4). On every app visit, this question is asked for every nearby shop.` },
    { type: 'callout', tone: 'term', title: 'New word: P99 latency', html: `<strong>What it is:</strong> out of 100 requests, leave out the slowest 1; the time in which the other 99 finish is the P99. "P99 200 ms" = 99% of requests finish within 200 ms (0.2 seconds).<br><strong>Why we need it:</strong> the average can fool you. The average can be 50 ms while several people in every 100 wait 2 seconds. P99 tells you what the unhappiest users feel.<br><strong>Without it:</strong> we would think "everything is fast" while lakhs of users get a slow app.` },
    { type: 'p', html: `The most surprising thing: the heaviest work happens <strong>before the order</strong>. Swiggy's 2021 post says: assume ~1 lakh app visits per minute at peak (1 lakh = 100,000) and ~2,000 restaurants/stores around each location. That is ~20 crore serviceability evaluations every minute (1 crore = 10 million), within P99 200 ms. The number of orders is small next to this: news reports say Zomato saw a peak of ~4,100 orders per minute on 31 Dec 2020. The other values are assumptions. Change them and see:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="dl-v">Peak app visits per minute (thousands)</label><input id="dl-v" type="number" value="100" min="1" step="10"></div>
          <div><label for="dl-r">Nearby restaurants/stores per visit</label><input id="dl-r" type="number" value="2000" min="10" step="100"></div>
          <div><label for="dl-o">Peak orders per minute</label><input id="dl-o" type="number" value="4000" min="10" step="100"></div>
          <div><label for="dl-e">Events per order (state changes, not pings)</label><input id="dl-e" type="number" value="10" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Serviceability evals/s</span><strong class="dl-o1"></strong></div>
          <div class="stat"><span>Orders/s</span><strong class="dl-o2"></strong></div>
          <div class="stat"><span>Order events/s (Kafka)</span><strong class="dl-o3"></strong></div>
          <div class="stat"><span>Evals per order</span><strong class="dl-o4"></strong></div>
        </div>
        <div class="calc-note dl-n"></div>`;
      const v = id => Math.max(0, Number(el.querySelector('#' + id).value) || 0);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(n < 10 ? 1 : 0);
      const upd = () => {
        const evals = v('dl-v') * 1e3 * v('dl-r') / 60, ops = v('dl-o') / 60, eps = ops * v('dl-e');
        el.querySelector('.dl-o1').textContent = f(evals) + '/s';
        el.querySelector('.dl-o2').textContent = f(ops) + '/s';
        el.querySelector('.dl-o3').textContent = f(eps) + '/s';
        el.querySelector('.dl-o4').textContent = f(evals / Math.max(ops, 0.001));
        el.querySelector('.dl-n').textContent = `Behind every order there are ~${f(evals / Math.max(ops, 0.001))} serviceability calculations. So the work of showing shops (only reading: the read path) is many thousand times heavier than the work of creating orders (writing: the write path). That is why listing uses speed tricks (cache, indexes kept in memory), and orders use correctness tricks.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 3: API and core entities' },
    { type: 'p', html: `An <strong>API</strong> = the fixed questions an app can ask the server (like "give me the shops near me"). <strong>Entities</strong> = the things whose data we keep (shop, order, payment...). Below, each line is one API: <code>GET</code> = read something, <code>POST</code> = do or change something. Some new words (Idempotency-Key, MQTT) are only names for now; we will explain them fully when we need them.` },
    { type: 'code', text: `
GET  /v1/listing?lat=12.97&lng=77.60          → [{ restaurant, eta: "32 min", fee, serviceable: true }, ...]
POST /v1/cart/checkout                        → { total, eta, deliveryFee }       # check serviceability again
POST /v1/orders   Idempotency-Key: 1b9e...    → 201 { orderId: "o42", state: "PAYMENT_PENDING" }
POST /v1/orders/o42/cancel                    → { state: "CANCELLED", refund: "initiated" }
# Restaurant tablet / app
POST /v1/merchant/orders/o42/accept | /ready
# Delivery partner app
POST /v1/dp/orders/o42/arrived | /picked-up | /delivered
# Customer tracking: persistent connection (MQTT / WebSocket), server push
SUB  orders/o42/track  → { state, dpLat, dpLng, eta }` },
    { type: 'table', head: ['Entity', 'What it holds', 'Where (common approach)'], rows: [
      ['Restaurant / Store', 'location, cluster, menu, open hours', 'SQL + search index + heavy cache (the menu is read a lot and changes little)'],
      ['Cart', 'items, customer', 'Fast KV (like a session)'],
      ['Order', 'items, amounts, state, restaurant, customer, DP', 'Transactional store (SQL); state machine'],
      ['Payment', 'order, amount, gateway, status, idempotency key', 'Transactional store, ledger'],
      ['Delivery partner (DP / DE)', 'status, current orders, latest location', 'Location in an in-memory/geo store; status transactional'],
      ['Assignment', 'order ↔ DP, earmarked/dispatched', 'Transactional (one DP must not get the same order twice)'],
    ]},
    { type: 'p', html: `Words in the third column: a <strong>SQL / transactional store</strong> = a database that makes several changes together as "all or nothing" (needed for money and orders). <strong>Fast KV</strong> (key-value) = a very fast, simple store where one key gives one value (for small, temporary things like a cart). <strong>Ledger</strong> = an account book for money where entries are only added, never deleted. <strong>Search index</strong> = a separate copy built for fast searching by name or place.` },
    { type: 'callout', tone: 'term', title: 'New word: DE / DP', html: `<strong>What it is:</strong> Swiggy calls its delivery partners <strong>Delivery Executives (DE)</strong>, Zomato calls them <strong>Delivery Partners (DP)</strong>. Both are the same thing: the person who delivers the order on a bike. In this lesson we say "partner".<br><strong>Why we need it:</strong> if you read both companies' blogs you will see both words; they mean the same thing.` },

    { type: 'h2', text: 'Step 4: discovery, "who can deliver here?"' },
    { type: 'p', html: `The idea of the first line of Swiggy's 2018 post: delivery work does not start with the order, it starts <strong>the moment the app opens</strong>. The first call goes to the delivery system: which restaurants can deliver to this customer, and what will each one's delivery time be? Swiggy calls this <strong>serviceability</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Serviceability', html: `<strong>What it is:</strong> the answer to one question: "can this shop deliver to this customer's location in a reasonable time?"<br><strong>Why we need it:</strong> the app must show only the shops that can really deliver, each with a correct time ("32 min").<br><strong>Without it:</strong> the customer picks a far-away shop, and the order arrives in 70 minutes, or gets cancelled.<br><strong>What is inside:</strong> Swiggy's Dec 2020 post says this check includes: a geo filter (who is near), the real road distance, the pressure on nearby partners (stress), a prediction of the delivery time, a surge fee, and finally the decision "show it or not".` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Just show all restaurants inside a 5 km circle." Swiggy's post explains that a plain circle (radial filter) has no <strong>direction</strong>. A restaurant 3 km away but across a river, a highway or a one-way road can really be 25 minutes away. And 4 km on an empty road in Ahmedabad is not like 4 km in Bengaluru traffic. So Swiggy splits the city into <strong>clusters</strong> (polygons) and defines which customer cluster can connect to which restaurant clusters.` },
    { type: 'callout', tone: 'term', title: 'New words: cluster (polygon) and point-in-polygon', html: `<strong>What it is:</strong> a <strong>polygon</strong> = a closed shape with many corners on the map (like the boundary of a neighbourhood). Swiggy splits the city into such polygons and calls them <strong>clusters</strong>. <strong>Point-in-polygon (PIP)</strong> = a maths check: "is this point (the customer) inside this shape or outside?"<br><strong>Why we need it:</strong> the people who draw clusters look at rivers, flyovers and traffic and decide "delivery from this neighbourhood to those neighbourhoods is fine". A circle cannot understand that.<br><strong>Without it:</strong> shops across the river are shown and arrive late, and shops that are close by road are left out.` },
    { type: 'callout', tone: 'term', title: 'New word: Geohash', html: `<strong>What it is:</strong> split the world map into a grid of small boxes (cells), and give each box a short name, like <code>tdr1v</code>. The longer the name, the smaller the box. A level 7 box is about 150 m wide, a level 8 box about 40 m × 20 m. Places close to each other usually have names that start the same way.<br><strong>Why we need it:</strong> running PIP on every polygon to find "which cluster is the customer in?" is expensive. First find the customer's geohash, then run PIP only on the 2-3 clusters that touch that box. Swiggy did exactly this (2021 post).<br><strong>Without it:</strong> every request would check hundreds of polygons in the city, and the P99 200 ms target would break. Details in the <a href="#/ds-for-scale">Data structures for scale</a> lesson.` },
    { type: 'p', html: `See the difference between a circle and clusters yourself. This is a toy city (each box is 1 km). A river runs through the middle, and you can cross it only by the bridge at the bottom. Above each shop is its road time (5 min + 3 min per km, an assumption). Promise: 35 min.` },
    { type: 'custom', render(el) {
      // Toy city map: 1 cell = 1 km. River at x = 6 km, the only bridge at the bottom, y = 5.8 km.
      const C = { x: 3.5, y: 2.5 }, RX = 6, BR = { x: 6, y: 5.8 }, PROMISE = 35, K = 40;
      const R = [[1.2, 0.8], [2.6, 4.1], [4.4, 1.6], [5.3, 3.4], [6.4, 1.6], [7.2, 1.2], [6.6, 5.2], [0.6, 5.4], [8.4, 4.8], [3.9, 5.5], [5.6, 0.5], [8.2, 2.6]];
      const road = (x, y) => x > RX ? Math.abs(C.x - BR.x) + Math.abs(C.y - BR.y) + Math.abs(BR.x - x) + Math.abs(BR.y - y) : Math.abs(C.x - x) + Math.abs(C.y - y);
      const mins = (x, y) => Math.round(5 + 3 * road(x, y));
      const air = (x, y) => Math.hypot(C.x - x, C.y - y);
      let mode = 'radial';
      el.innerHTML = `<div class="chips"><button type="button" class="chip on" data-m="radial">Circle (radial)</button><button type="button" class="chip" data-m="cluster">Clusters (road time)</button></div>
        <div class="dl-gr"><label for="dl-gr">Circle radius: <b class="dl-grv"></b> km</label><input id="dl-gr" type="range" min="2" max="5" step="0.5" value="4"></div>
        <svg viewBox="-6 -6 372 252" style="width:100%;max-width:520px;display:block;margin:10px 0" class="dl-gmap" role="img" aria-label="Toy city map"></svg>
        <div class="stats">
          <div class="stat"><span>Shops shown</span><strong class="dl-g1"></strong></div>
          <div class="stat"><span>Shown, but later than ${PROMISE} min</span><strong class="dl-g2"></strong></div>
          <div class="stat"><span>Could deliver, but left out</span><strong class="dl-g3"></strong></div>
        </div>
        <div class="calc-note dl-gn"></div>`;
      const svg = el.querySelector('.dl-gmap');
      const draw = () => {
        const rad = Number(el.querySelector('#dl-gr').value);
        el.querySelector('.dl-grv').textContent = rad;
        el.querySelector('.dl-gr').style.display = mode === 'radial' ? '' : 'none';
        let s = '';
        for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
          const ok = mode === 'cluster' && mins(i + 0.5, j + 0.5) <= PROMISE;
          const me = i === 3 && j === 2;
          s += `<rect x="${i * K}" y="${j * K}" width="${K}" height="${K}" fill="${me ? 'var(--accent-soft)' : ok ? 'var(--surface-2)' : 'none'}" stroke="var(--line)" stroke-width="1"/>`;
        }
        s += `<rect x="${RX * K - 5}" y="0" width="10" height="240" fill="var(--accent)" opacity="0.35"/><rect x="${RX * K - 9}" y="${BR.y * K - 5}" width="18" height="10" fill="var(--ink-3)"/>`;
        s += `<text x="${RX * K + 8}" y="14" font-size="11" fill="var(--ink-2)">river</text><text x="${RX * K + 12}" y="${BR.y * K - 8}" font-size="11" fill="var(--ink-2)">bridge</text>`;
        if (mode === 'radial') s += `<circle cx="${C.x * K}" cy="${C.y * K}" r="${rad * K}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>`;
        let shown = 0, late = 0, missed = 0;
        R.forEach(([x, y], k) => {
          const m = mins(x, y), vis = mode === 'radial' ? air(x, y) <= rad : m <= PROMISE;
          if (vis) { shown++; if (m > PROMISE) late++; } else if (m <= PROMISE) missed++;
          const col = !vis ? 'var(--ink-3)' : m > PROMISE ? 'var(--red)' : 'var(--green)';
          s += `<circle cx="${x * K}" cy="${y * K}" r="${vis ? 8 : 5}" fill="${col}" opacity="${vis ? 1 : 0.5}"/><text x="${x * K}" y="${y * K - 11}" font-size="10" text-anchor="middle" fill="var(--ink-2)">${m}m</text>`;
        });
        s += `<circle cx="${C.x * K}" cy="${C.y * K}" r="7" fill="var(--ink)"/><text x="${C.x * K}" y="${C.y * K + 20}" font-size="11" text-anchor="middle" fill="var(--ink)">Riya</text>`;
        svg.innerHTML = s;
        el.querySelector('.dl-g1').textContent = shown;
        el.querySelector('.dl-g2').textContent = late;
        el.querySelector('.dl-g3').textContent = missed;
        el.querySelector('.dl-gn').textContent = mode === 'radial'
          ? `The circle only looks at straight-line distance. ${late} shop(s) are across the river: inside the circle, but going round by the bridge takes more than ${PROMISE} min. And ${missed} shop(s) are outside the circle, even though they could arrive quickly by road.`
          : `Now only the boxes (clusters) where the road time is within ${PROMISE} min are connected (the lightly coloured ones). ${shown} shops shown, ${late} late, ${missed} left out. Direction (river, bridge) is counted automatically.`;
      };
      el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); draw(); }));
      el.querySelector('#dl-gr').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `With the default (4 km circle): 8 shops are shown. 2 of them are across the river and will take 36-40 min. And 3 shops that could deliver in 22-33 min are left out because they are outside the circle. In clusters mode, 9 shops are shown and not one is late. This is Swiggy's lesson: what matters is not distance, but <strong>road time</strong>.` },
    { type: 'callout', tone: 'term', title: 'New words: road distance, OpenStreetMap, A*', html: `<strong>What it is:</strong> not the straight-line distance, but the distance when you travel on real roads. For this you need a road map: <strong>Google Directions</strong> (a paid service) or <strong>OpenStreetMap (OSM)</strong> (a free world map made by volunteers). <strong>A*</strong> ("A-star") is an algorithm that finds the shortest route on this road map. Swiggy runs the search from both ends at the same time (bidirectional), so it finishes faster.<br><strong>Why we need it:</strong> you saw it in the widget: straight-line distance lies.<br><strong>Without it:</strong> wrong ETAs, wrong shops. But this calculation is expensive, so we <strong>cache</strong> the answer (see the diagram below).` },
    { type: 'callout', tone: 'term', title: 'New word: Stress (and its state machine)', html: `<strong>What it is:</strong> a measure of how many orders and how many free partners an area (zone) has. Swiggy keeps it in a few levels (normal, high...), and the level changes only by fixed rules. A model with "a few fixed conditions and rules for moving between them" is called a <strong>finite state machine (FSM)</strong>; the same idea comes back for orders in Step 5.<br><strong>Why we need it:</strong> in rain or during a festival, orders jump suddenly but partners do not. The stress system tells the other systems: "slow down, do not show far-away shops for now".<br><strong>Without it:</strong> every order would be accepted and all orders would be late.` },
    { type: 'flow', title: 'Listing: serviceability check', height: 330,
      nodes: [
        { id: 'app', label: 'Customer app', sub: 'home / listing', x: 85, y: 170, w: 130, kind: 'client', info: 'What it is: the app on the customer\'s phone. In this design: the home page, listing, search, menu and checkout all ask for this serviceability check (Swiggy 2021 post).' },
        { id: 'list', label: 'Listing API', sub: 'rank + promos', x: 255, y: 170, w: 140, kind: 'server', info: 'What it is: the service that builds the home page list. It takes the serviceable shops, puts them in order (ranking), and adds offers and collections. Swiggy\'s 2021 post says each service may get a P99 budget of only ~50 ms, because many services run together for one page.' },
        { id: 'svc', label: 'Serviceability', sub: 'filter, ETA, fee', x: 440, y: 170, w: 150, kind: 'server', info: 'What it is: the service that answers "who can deliver, and in how much time". It combines the geo filter, distance, time prediction, stress and surge fee into a decision for every shop. For ~2,000 shops on every request.' },
        { id: 'geo', label: 'Geo filter', sub: 'geohash → clusters', x: 630, y: 60, w: 150, kind: 'cache', info: 'What it is: the answer to "which cluster is the customer in, and which shop clusters are connected to it?". A point-in-polygon check on every polygon is expensive, so Swiggy built an index of clusters by geohash, kept in memory: first 2-3 candidate clusters from the geohash, then a PIP check only on those.' },
        { id: 'dist', label: 'Distance svc', sub: 'cached road dist', x: 630, y: 170, w: 150, kind: 'cache', info: 'What it is: the service that gives the road distance from a shop to a customer. Source: Google Directions or OpenStreetMap (bidirectional A* search on OSM). Both are expensive, so it caches the answer with the pair (shop geohash, customer geohash) as the key.' },
        { id: 'stress', label: 'Stress system', sub: 'zone FSM', x: 630, y: 280, w: 150, kind: 'server', info: 'What it is: the system that tells how much pressure the partners of each zone are under (orders vs free partners, rain, festivals). Swiggy runs it as a finite state machine: stress levels = states. When stress rises, it tells other systems to lighten their work (degrade).' },
      ],
      edges: [{ a: 'app', b: 'list' }, { a: 'list', b: 'svc' }, { a: 'svc', b: 'geo' }, { a: 'svc', b: 'dist' }, { a: 'svc', b: 'stress' }],
      scenarios: [
        { name: 'Listing (happy)', steps: [
          { title: 'App opened', text: 'A listing request with the customer\'s location.', go: 'app>list>svc', msg: 'GET /v1/listing?lat=12.97&lng=77.60' },
          { title: 'Geo filter', text: 'The geohash gives the customer\'s cluster, then the restaurant clusters connected to it, then their restaurants. ~2,000 candidates.', go: ['svc>geo', 'res:geo>svc'], msg: 'geohash → cluster C17 → 2,140 restaurants' },
          { title: 'Distance + time', text: 'Road distance for each candidate from the cache, then a delivery time prediction. Those too far or too late are removed.', go: ['svc>dist', 'res:dist>svc'], msg: 'r12: 3.1 km, 31 min | r40: 7.9 km, 58 min ✗' },
          { title: 'Stress check', text: 'The zone is normal, no extra fee.', go: ['svc>stress', 'res:stress>svc'], after: { stress: { state: 'ok', sub: 'level: normal' } } },
          { title: 'Listing', text: 'The serviceable list is ranked and sent to the app. All this in a few hundred ms.', go: 'res:svc>list>app', msg: '[{ r12, "31 min" }, { r7, "24 min" }, ...]' },
        ]},
        { name: 'Rain: high stress', steps: [
          { title: 'Rain starts', text: 'Orders went up, many partners stopped. The stress system put the zone in the high stress state.', set: { stress: { state: 'hot', sub: 'level: high' } }, focus: ['stress'] },
          { title: 'Graceful degradation', text: 'Swiggy\'s 2020 post says that under stress, serviceability stops taking orders with a long last mile or a long delivery time, and a surge fee may apply. The customer sees fewer restaurants, but the ones shown arrive on time.', go: ['app>list>svc', 'svc>stress', 'res:stress>svc'], set: { svc: { state: 'warn', sub: 'smaller radius' } } },
          { title: 'Why?', text: 'The fleet cannot grow in a minute, but demand can. If every order is accepted, all are late. Taking a little less is better than overbooking.', go: 'res:svc>list>app', msg: 'fewer restaurants + "rain fee"' },
        ]},
        { name: 'Geo index fails', steps: [
          { title: 'Index broken', text: 'Something is wrong in the geohash index / in-memory cache, or the customer\'s location is not in any defined cluster.', set: { geo: { state: 'down', sub: 'index error' } }, go: ['svc>geo', 'bad:geo>svc'] },
          { title: 'Radial fallback', text: 'Swiggy 2021 post: in this case the system falls back to the plain circle (radial) geo filter. Less accurate, but the app does not look empty.', set: { svc: { state: 'warn', sub: 'radial mode' } }, go: ['svc>dist', 'res:dist>svc'] },
          { title: 'Listing still came', text: 'Degraded, but working. This is a "fail soft" design.', go: 'res:svc>list>app' },
        ]},
        { name: 'Distance cache miss', steps: [
          { title: 'New pair', text: 'A customer in a new area; their geohash pair is not in the cache.', go: ['svc>dist'], set: { dist: { state: 'miss', sub: 'miss' } } },
          { title: 'Expensive calculation', text: 'An A* search on the OSM graph or a Google API call: both are slow or expensive. We cannot do this for thousands of pairs on every request.', focus: ['dist'], msg: 'A* on India road graph …' },
          { title: 'Cache design', text: 'Swiggy found geohash level 8 accurate enough, but all L8 pairs would be hundreds of billions of keys. So only pairs with many orders use L8, the rest use level 7 (cheaper, a little less accurate). With TTLs and memory limits.', go: 'res:dist>svc', after: { dist: { state: 'ok', sub: 'L7/L8 cache' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Where does "32 min" come from? The delivery time equation' },
    { type: 'callout', tone: 'term', title: 'New words: ETA and prediction model', html: `<strong>What it is:</strong> <strong>ETA</strong> (Estimated Time of Arrival) = a guess of "how long until it arrives". A <strong>prediction model</strong> (ML model) = a program that learns from the data of lakhs of past orders and makes a guess for a new order, like "these 3 items take ~14 min at this shop".<br><strong>Why we need it:</strong> the app must show "32 min", and the time to send the partner is also decided from it.<br><strong>Without it:</strong> either a fixed "40 min" on everything (sometimes a lie, sometimes far too much), or the partner arrives at the wrong moment.` },
    { type: 'p', html: `Swiggy's 2018 post wrote delivery time as a simple formula. As soon as the order is placed, two jobs run <strong>at the same time</strong>: the restaurant cooks, and the system finds a partner and sends him to the restaurant. So whichever of the two is longer is the one that counts:` },
    { type: 'code', text: `Delivery time = max( assignment delay + first mile ,  prep time ) + last mile

assignment delay : from the order until a partner is assigned
first mile       : the partner reaching the restaurant
prep time        : the restaurant preparing the food
last mile        : from the restaurant to the customer's door` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="dl-ad">Assignment delay: <b class="dl-adv"></b> min</label><input id="dl-ad" type="range" min="0" max="15" step="1" value="0"></div>
          <div><label for="dl-fm">First mile: <b class="dl-fmv"></b> min</label><input id="dl-fm" type="range" min="1" max="20" step="1" value="5"></div>
          <div><label for="dl-pt">Prep time: <b class="dl-ptv"></b> min</label><input id="dl-pt" type="range" min="2" max="40" step="1" value="15"></div>
          <div><label for="dl-lm">Last mile: <b class="dl-lmv"></b> min</label><input id="dl-lm" type="range" min="3" max="30" step="1" value="12"></div>
        </div>
        <div class="dl-bar" style="margin:12px 0"></div>
        <div class="stats">
          <div class="stat"><span>Delivery time</span><strong class="dl-t"></strong></div>
          <div class="stat"><span>Partner wait at restaurant</span><strong class="dl-w"></strong></div>
          <div class="stat"><span>Bottleneck</span><strong class="dl-b"></strong></div>
        </div>
        <div class="calc-note dl-tn"></div>`;
      const g = id => Number(el.querySelector('#' + id).value);
      const seg = (w, total, color, label) => !w ? '' : `<div style="flex:0 0 ${(100 * w / total).toFixed(2)}%;background:${color};color:var(--ink);font-size:12px;padding:4px 2px;text-align:center;overflow:hidden;white-space:nowrap;border-right:1px solid var(--bg)">${w ? label : ''}</div>`;
      const upd = () => {
        const ad = g('dl-ad'), fm = g('dl-fm'), pt = g('dl-pt'), lm = g('dl-lm');
        ['ad', 'fm', 'pt', 'lm'].forEach(k => { el.querySelector('.dl-' + k + 'v').textContent = g('dl-' + k); });
        const reach = ad + fm, pick = Math.max(reach, pt), total = pick + lm, wait = Math.max(0, pt - reach), late = Math.max(0, reach - pt);
        const T = Math.max(total, 1);
        el.querySelector('.dl-bar').innerHTML = `<div style="font-size:12px;color:var(--ink-2);margin-bottom:4px">Partner's timeline</div><div style="display:flex;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden">${seg(ad, T, 'var(--surface-2)', 'assign')}${seg(fm, T, 'var(--accent-soft)', 'first mile')}${seg(wait, T, 'var(--amber)', 'wait')}${seg(lm, T, 'var(--accent-soft)', 'last mile')}</div>
          <div style="font-size:12px;color:var(--ink-2);margin:8px 0 4px">Restaurant's timeline</div><div style="display:flex;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden">${seg(pt, T, 'var(--surface-2)', 'prep')}${seg(late, T, 'var(--red)', 'food going cold')}${seg(lm, T, 'transparent', '')}</div>`;
        el.querySelector('.dl-t').textContent = total + ' min';
        el.querySelector('.dl-w').textContent = wait + ' min';
        el.querySelector('.dl-b').textContent = pt > reach ? 'Kitchen' : pt < reach ? 'Partner' : 'Equal';
        el.querySelector('.dl-tn').textContent = wait > 0
          ? `The partner will stand at the restaurant for ${wait} min. If we assign ${wait} min later (or earmark the partner and send him later), the delivery time is still ${total} min, and the partner can do other work in those ${wait} min. This is the idea of "Just-in-time" assignment.`
          : late > 0 ? `The food is ready ${late} min early and is waiting for the partner: the food goes cold, and the customer gets it late. Here, finding a partner quickly (a smaller assignment delay) matters most.`
          : `The partner and the food are ready at the same moment: perfect timing, no waste.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `The default values are the example from Swiggy's 2019 post: the food is ready in 15 min, the partner arrives in 5 min, so the partner stands there for 10 min. Over a whole day these 10-minute gaps add up and reduce each partner's orders per day. Every term is a prediction, and each one being wrong causes a different harm: guess the prep time too high and the food sits and goes cold; guess the first mile too low and the order is late.` },

    { type: 'h2', text: 'Step 5: an order is a state machine' },
    { type: 'callout', tone: 'term', title: 'New word: State machine', html: `<strong>What it is:</strong> a few fixed conditions (states) of a thing, and a list of which state can move to which state (transitions). Like a traffic light: red → green → yellow → red. Never straight from red to yellow.<br><strong>Why we need it:</strong> 5 different people/systems touch an order. With clear rules, a request in the wrong order (like "delivered" before payment) is simply rejected.<br><strong>Without it:</strong> an order that is "delivered" and "cancelled" at the same time. The refund went out and the partner was paid too. A headache for the support team.` },
    { type: 'p', html: `The customer, the restaurant, the partner, payments and support all touch the order. So the order's state changes only through a <strong>state machine</strong> (we saw this idea with a widget in the <a href="#/design-uber">Uber lesson</a>). Swiggy's 2019 delivery partner app post says the partner app also treats every delivery flow as a finite state machine.` },
    { type: 'ascii', text: `
PAYMENT_PENDING ──paid──> PLACED ──accept──> ACCEPTED ──> PREPARING ──ready──> READY ──pickup──> PICKED_UP ──> DELIVERED
      │                     │                  │             │                   │
      │ fail/timeout        │ reject           │             │                   │   (partner side, in parallel:
      v                     v                  v             v                   v    assigned → arrived → picked up)
   FAILED            CANCELLED + refund   CANCELLED + refund (policy/fee depends on the stage of the cancel)` },
    { type: 'p', html: `Try it yourself. Each button is an event (someone did something). Buttons in a darker colour are allowed right now. Every valid transition sends one "event" to Kafka (Kafka = the line that gives news to everyone, fully explained below). Press them in the wrong order and the machine refuses. "Same event again" is like a network retry: the same event ID arrived again.` },
    { type: 'custom', render(el) {
      // Order state machine: only allowed transitions run. Every valid transition = one event (on Kafka).
      const ST = ['PAYMENT_PENDING', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED'];
      const TR = {
        PAYMENT_PENDING: { pay_ok: 'PLACED', pay_fail: 'FAILED', cancel: 'CANCELLED' },
        PLACED: { accept: 'ACCEPTED', reject: 'CANCELLED', cancel: 'CANCELLED' },
        ACCEPTED: { prep: 'PREPARING', cancel: 'CANCELLED' },
        PREPARING: { ready: 'READY', cancel: 'CANCELLED' },
        READY: { pickup: 'PICKED_UP' },
        PICKED_UP: { deliver: 'DELIVERED' },
      };
      const EV = [['pay_ok', 'Payment success'], ['pay_fail', 'Payment fail'], ['accept', 'Shop: accept'], ['reject', 'Shop: reject'], ['prep', 'Start preparing'], ['ready', 'Ready'], ['pickup', 'Partner: picked up'], ['deliver', 'Partner: delivered'], ['cancel', 'Customer: cancel']];
      const NOTE = { reject: 'refund started (the saga undo step)', cancel: 'refund/fee as per policy', pay_fail: 'customer can try again' };
      let state, seen, last, log, pub;
      const reset = () => { state = 'PAYMENT_PENDING'; seen = new Set(); last = null; log = []; pub = 0; draw(); };
      el.innerHTML = `<div class="dl-sm-st" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
        <div class="dl-sm-btn" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button type="button" class="btn small ghost dl-sm-dup">Same event again (retry)</button><button type="button" class="btn small ghost dl-sm-rst">Reset</button></div>
        <div class="stats"><div class="stat"><span>Current state</span><strong class="dl-sm-cur" style="font-size:15px;word-break:break-all"></strong></div><div class="stat"><span>Events on Kafka</span><strong class="dl-sm-pub"></strong></div></div>
        <div class="calc-note dl-sm-log" style="font-family:var(--f-mono);font-size:12px"></div>`;
      const fire = (ev, id) => {
        if (seen.has(id)) { log.unshift(`↺ ${ev} (id ${id}) already done: ignored. Nothing happened twice.`); return draw(); }
        const nx = (TR[state] || {})[ev];
        if (!nx) { log.unshift(`✗ ${ev}: not allowed from ${state}. Rejected, state unchanged.`); return draw(); }
        seen.add(id); last = [ev, id]; pub++;
        log.unshift(`✓ ${state} → ${nx}  | event "order.${nx.toLowerCase()}" on Kafka${NOTE[ev] ? ' | ' + NOTE[ev] : ''}`);
        state = nx; draw();
      };
      let n = 0;
      const draw = () => {
        el.querySelector('.dl-sm-st').innerHTML = ST.map(s => `<span class="chip${s === state ? ' on' : ''}" style="cursor:default">${s}</span>`).join('');
        el.querySelector('.dl-sm-cur').textContent = state;
        el.querySelector('.dl-sm-pub').textContent = pub;
        el.querySelector('.dl-sm-log').innerHTML = log.slice(0, 6).join('<br>') || 'Press any event. Also try the wrong order (like "Partner: delivered" first).';
        el.querySelectorAll('.dl-sm-btn button').forEach(b => { b.classList.toggle('primary', !!(TR[state] || {})[b.dataset.e]); });
      };
      el.querySelector('.dl-sm-btn').innerHTML = EV.map(([e, l]) => `<button type="button" class="btn small" data-e="${e}">${l}</button>`).join('');
      el.querySelectorAll('.dl-sm-btn button').forEach(b => b.addEventListener('click', () => fire(b.dataset.e, 'e' + (++n))));
      el.querySelector('.dl-sm-dup').addEventListener('click', () => { if (last) fire(last[0], last[1]); });
      el.querySelector('.dl-sm-rst').addEventListener('click', reset);
      reset();
    }},
    { type: 'p', html: `In the right order (Payment success → accept → start preparing → Ready → picked up → delivered), 6 events go to Kafka and the order becomes DELIVERED. Press "Partner: delivered" at the very start and it is rejected. Press the retry button as many times as you like; the event count does not grow. This is an <strong>idempotent</strong> transition (explained below).` },
    { type: 'table', head: ['Stage / leg', 'Who changes it', 'What the public source says'], rows: [
      ['Ordered → Assigned (O2A)', 'Assignment engine', 'Swiggy 2023 tracking ETA post: 4 separate models for the 4 legs of the order journey: O2A, First Mile, Wait Time, Last Mile.'],
      ['Assigned → Arrived (First Mile)', 'Partner app (location pings)', 'Same post: the model for the assigned stage uses the partner\'s live pings.'],
      ['Arrived → Picked up (Wait Time)', 'Restaurant + partner', 'Features include the restaurant\'s stress, live orders, and item count.'],
      ['Preparing → Ready', 'Restaurant app', 'Zomato (2020): added a "Food Order Ready" button to the restaurant partner app, to learn the real prep time.'],
      ['Picked up → Delivered (Last Mile)', 'Partner app', 'Zomato DP-ETA (2022): predicts separately from pickup to the drop-zone geofence, and from the geofence to the handover.'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Geofence', html: `<strong>What it is:</strong> an invisible boundary on the map (a circle or polygon). When the partner enters the boundary, the app/server gets an event, like "reached near the customer's building".<br><strong>Why we need it:</strong> states like "arrived" get marked automatically, and the ETA knows when the last part (finding the building, the lift, the gate) started.<br><strong>Without it:</strong> the partner would have to press a button every time (if he forgets, the data is wrong), and the guess for the last minutes would be weak.` },

    { type: 'h3', text: 'Placing an order: payments and events' },
    { type: 'p', html: `The order, the payment, and the news to the restaurant, partner and customer: all this cannot happen in one database transaction (the payment gateway is an outside company). The common industry approach: the order service writes its own state in a transaction and emits an event; the other services read it from Kafka. Swiggy's 2022 incident post says their order fulfilment journey connects more than 50 services on one Kafka cluster (the exact topics are not public). First, four new words on this path:` },
    { type: 'callout', tone: 'term', title: 'New word: Idempotency key', html: `<strong>What it is:</strong> with every "Place order" request, the app sends a unique random token (like <code>1b9e…</code>). The server remembers it: if an order was already created for this token, it does not create another one, it returns the first one.<br><strong>Why we need it:</strong> the customer tapped twice, or the network lost the answer and the app retried. The server gets the same request twice.<br><strong>Without it:</strong> two orders, money taken twice. Details in the <a href="#/pagination-idempotency">Idempotency lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'New words: event, Kafka, topic', html: `<strong>What it is:</strong> an <strong>event</strong> = a short message "this happened" (like "order o42 PLACED"). <strong>Kafka</strong> = a very large, durable register where services write events and other services read them at their own speed. Events go into <strong>topics</strong> (separate registers, like "order-events"); each topic is split into many <strong>partitions</strong> (parts) so that many machines can work together.<br><strong>Why we need it:</strong> the order service does not have to call the shop, assignment, notifications and analytics one by one. It writes one event, and everyone reads it. If a service is slow or down, it reads later.<br><strong>Without it:</strong> the order service calls 10 services; if even one is slow, the customer's "Place order" gets stuck. Details in the <a href="#/kafka">Kafka lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: Outbox pattern', html: `<strong>What it is:</strong> the order service writes the order's new state and the event "to be sent" together in one database transaction in its own DB (the event goes into an "outbox" table). A separate small process picks events from the outbox and puts them on Kafka.<br><strong>Why we need it:</strong> if the server crashes after writing to the DB but before sending to Kafka, the event is lost. In the outbox, the event is safe together with the DB.<br><strong>Without it:</strong> the order is PLACED but the shop never hears about it. The customer just keeps waiting.` },
    { type: 'callout', tone: 'term', title: 'New word: Saga (compensation)', html: `<strong>What it is:</strong> doing work that is spread over many services in small steps, where each step has a fixed "undo step" (compensation). If the order is cancelled, the undo step = a refund.<br><strong>Why we need it:</strong> the payment gateway and the shop are not part of our database, so one transaction cannot "undo everything".<br><strong>Without it:</strong> the order is cancelled, but the money is still taken. Details in the <a href="#/distributed-tx">Distributed transactions</a> lesson.` },
    { type: 'callout', tone: 'term', title: 'New word: Payment gateway (PG)', html: `<strong>What it is:</strong> an outside company (payment service provider) that moves money between the app and the bank, card network or UPI.<br><strong>Why we need it:</strong> we cannot connect to every bank ourselves; the PG does this job.<br><strong>Without it:</strong> no online payment at all.<br><strong>Extra:</strong> Swiggy's 2022 post says each payment method (card, UPI, net banking, wallet) has several PGs. An ML model (a program that learns from past data to make guesses) sends each transaction to the PG with the best success rate right now. When a PG answers late, it tells our server by itself later; this "call back to us" is called a <strong>webhook</strong>.` },

    { type: 'flow', title: 'Place order → payment → events', height: 340,
      nodes: [
        { id: 'app', label: 'Customer app', sub: 'Place order', x: 85, y: 170, w: 130, kind: 'client', info: 'What it is: the customer\'s app. At checkout it sends "Place order" with an Idempotency-Key, so that a double tap or a network retry does not create two orders.' },
        { id: 'ord', label: 'Order service', sub: 'state machine', x: 265, y: 170, w: 140, kind: 'server', info: 'What it is: the owner of the order. It creates the order, runs the state machine, and emits an event (through the outbox) for every state change. Usually a SQL-like transactional store (Swiggy/Zomato have not made their exact order DB public).' },
        { id: 'pay', label: 'Payments', sub: 'PG router (ML)', x: 265, y: 55, w: 140, kind: 'server', info: 'What it is: our payments service. It creates the payment record (with the idempotency key) and sends the transaction to the best PG. Swiggy 2022 post: a separate model per method; for UPI, a choice made with a probability formula (Beta distribution) from recent success/fail counts; for cards, trying other PGs on 5% of transactions (exploration) to learn who has improved.' },
        { id: 'pg', label: 'Payment gateway', sub: 'outside company', x: 465, y: 55, w: 140, kind: 'net', info: 'What it is: the outside payment company (PSP / PG) that talks to the bank, card network or UPI. Not in our control: it can be slow, or down. So a timeout = "we do not know".' },
        { id: 'kf', label: 'Kafka', sub: 'order events', x: 465, y: 250, w: 130, kind: 'queue', info: 'What it is: the register (stream) of order events. News to the shop, assignment, customer updates, analytics: all read from here. Swiggy\'s 2022 post says one cluster for the fulfilment journey connects 50+ services.' },
        { id: 'rest', label: 'Restaurant app', sub: 'new order!', x: 640, y: 165, w: 130, kind: 'client', info: 'What it is: the app on the shop\'s tablet/phone. A new order arrives: accept or reject. After accept, prep starts, and pressing "Food Order Ready" (Zomato) makes it READY.' },
        { id: 'asg', label: 'Assignment', sub: 'find a partner', x: 640, y: 290, w: 130, kind: 'server', info: 'What it is: the service that picks a partner. As soon as the order event arrives, the search for a partner starts (next deep dive). When to send him depends on the prep time guess.' },
      ],
      edges: [{ a: 'app', b: 'ord' }, { a: 'ord', b: 'pay' }, { a: 'pay', b: 'pg' }, { a: 'ord', b: 'kf' }, { a: 'kf', b: 'rest' }, { a: 'kf', b: 'asg' }],
      scenarios: [
        { name: 'Order (happy)', steps: [
          { title: 'Place order', text: 'The order is created in the PAYMENT_PENDING state.', go: 'app>ord', msg: 'POST /v1/orders  Idempotency-Key: 1b9e…' },
          { title: 'Payment', text: 'Payments picks the best PG and charges (for UPI, the customer approves in their UPI app).', go: ['ord>pay>pg', 'res:pg>pay>ord'], msg: 'route → PG-2 (best success rate now) → SUCCESS' },
          { title: 'PLACED + event', text: 'In one transaction: state PLACED, and the "order placed" event in the outbox. The customer gets a confirmation at once.', parallel: true, go: ['res:ord>app', 'evt:ord>kf'], after: { ord: { state: 'ok', sub: 'PLACED' } } },
          { title: 'Fan-out', text: 'The restaurant gets a new order, assignment gets work. Each at its own speed.', parallel: true, go: ['evt:kf>rest', 'evt:kf>asg'], after: { rest: { state: 'ok', sub: 'accept?' } } },
        ]},
        { name: 'No payment answer', intro: 'The most dangerous case: we do not know if the money was taken or not.', steps: [
          { title: 'PG slow', text: 'The request went out, the answer timed out. Maybe the money was taken, maybe not.', go: ['app>ord', 'ord>pay>pg', 'lost:pg>pay'], set: { pg: { state: 'warn', sub: 'timeout' } } },
          { title: 'Treat it as "unknown", not failed', text: 'The order stays PAYMENT_PENDING. Show the customer "confirming". Never send a new charge; ask the PG for the status with the same payment ID, or wait for the PG\'s webhook.', set: { pay: { state: 'warn', sub: 'status: unknown' } }, focus: ['pay'] },
          { title: 'Status received', text: 'The PG said: SUCCESS. Now the order is PLACED and the event goes out. If FAILED had come, the order becomes FAILED and the customer can retry. In every case: one order, one charge. Details in the <a href="#/design-payments">Payments lesson</a>.', go: ['pay>pg', 'res:pg>pay>ord', 'evt:ord>kf'], set: { pg: { state: '' }, pay: { state: 'ok', sub: 'SUCCESS' } } },
        ]},
        { name: 'Restaurant rejected', steps: [
          { title: 'Reject', text: 'An item ran out / the kitchen is closed. The restaurant pressed reject.', go: 'evt:rest>kf>ord', set: { rest: { state: 'warn', sub: 'rejected' } } },
          { title: 'Compensation', text: 'Order CANCELLED and money returned: this is a compensating step of a saga. The refund also has an idempotency key, so it never happens twice.', go: ['ord>pay>pg', 'res:pg>pay>ord'], msg: 'refund(order o42, key: refund-o42)' },
          { title: 'Tell everyone', text: '"Cancelled" event: assignment releases the partner, the customer gets a notification.', parallel: true, go: ['evt:ord>kf', 'evt:kf>asg'], after: { ord: { state: 'ok', sub: 'CANCELLED' } } },
        ]},
        { name: 'Kafka partitions offline', intro: 'A real Swiggy incident (2022 #BehindTheBug post).', steps: [
          { title: 'Some partitions gone', text: 'Some partitions of one cluster were offline for 4 minutes. Producers could not publish: the post says 18 services were affected, with confirm-order errors at checkout.', set: { kf: { state: 'down', sub: 'partitions offline' } }, go: ['app>ord', 'bad:ord>kf'] },
          { title: 'Retry storm', text: 'Every client kept retrying. The post says that for 10 minutes, despite a linear backoff of 100 ms, incoming traffic on the cluster grew ~100x. Some Java clients got stuck on old metadata because of a library bug and did not recover until restarted.', flood: { paths: ['bad:ord>kf'], n: 12 }, set: { ord: { state: 'hot', sub: 'retry storm' } } },
          { title: 'Lesson', text: 'After a restart the clients were fine; fully normal in ~2 hours. The post\'s lesson: the retry policy must not add more load to the cluster during a problem, and keep client libraries updated. (The common method: exponential backoff + jitter, which means double the wait after every retry, and add a little random time so thousands of clients do not rush back at the same moment.) With the outbox pattern, the event stays safe in the order DB and goes out when Kafka is back.', set: { kf: { state: 'ok', sub: 'recovered' }, ord: { state: '' } }, go: 'evt:ord>kf' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"The payment timed out, so send the charge again." If the first charge had really gone through, the customer pays twice. A timeout means <strong>"we do not know"</strong>, not "failed". Always ask for the status with the same payment ID/idempotency key.` },

    { type: 'h2', text: 'Deep dive 1: partner assignment, when and to whom' },
    { type: 'p', html: `The most useful sentence of Swiggy's 2019 post (paraphrased): the closest partner is good for that one order, but often bad for the whole system, because delivery times grow and efficiency drops. This is the same lesson we saw in <a href="#/design-uber">Uber's batched matching</a>, with one more variable here: <strong>when the food will be ready</strong>.` },
    { type: 'p', html: `First, see the problem with "closest" yourself. Three orders came one after another, and three partners are free. The table shows how many minutes each partner needs to reach each order's shop. The "closest" method gives each order, in the order it came, its closest free partner. The other method looks at all orders and partners <strong>together</strong> and picks the pairs with the smallest total minutes.` },
    { type: 'custom', render(el) {
      // 3 orders, 3 free partners. Cell = minutes for the partner to reach that order's shop (first mile).
      const P = ['A', 'B', 'C'], O = ['O1', 'O2', 'O3'];
      const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      let M = [[3, 5, 12], [4, 14, 15], [10, 6, 7]], seed = 7;
      const greedy = m => { const used = new Set(), a = []; m.forEach(row => { let best = -1; row.forEach((v, j) => { if (!used.has(j) && (best < 0 || v < row[best])) best = j; }); used.add(best); a.push(best); }); return a; };
      const optimal = m => PERMS.reduce((b, p) => { const s = p.reduce((x, j, i) => x + m[i][j], 0); return s < b.s ? { p, s } : b; }, { p: null, s: Infinity }).p;
      const score = (m, a) => ({ total: a.reduce((x, j, i) => x + m[i][j], 0), worst: Math.max(...a.map((j, i) => m[i][j])) });
      el.innerHTML = `<div class="dl-mt" style="overflow-x:auto"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"><button type="button" class="btn small dl-m1">Example (like Swiggy)</button><button type="button" class="btn small ghost dl-mr">New numbers (seeded)</button></div>
        <div class="stats">
          <div class="stat"><span>Closest first, in order of arrival</span><strong class="dl-mg" style="font-size:16px"></strong></div>
          <div class="stat"><span>Looking at all together (best)</span><strong class="dl-mo" style="font-size:16px"></strong></div>
        </div>
        <div class="calc-note dl-mn"></div>`;
      const draw = () => {
        const g = greedy(M), o = optimal(M), sg = score(M, g), so = score(M, o);
        const cell = (i, j) => { const tg = g[i] === j, to = o[i] === j; return `<td style="padding:6px 10px;text-align:center;border:1px solid var(--line);${to ? 'background:var(--accent-soft);font-weight:700;' : ''}${tg ? 'outline:2px dashed var(--red);outline-offset:-4px;' : ''}">${M[i][j]}</td>`; };
        el.querySelector('.dl-mt').innerHTML = `<table style="border-collapse:collapse;font-size:14px"><tr><th style="padding:6px 10px"></th>${P.map(p => `<th style="padding:6px 10px">Partner ${p}</th>`).join('')}</tr>${O.map((r, i) => `<tr><th style="padding:6px 10px">${r}</th>${P.map((_, j) => cell(i, j)).join('')}</tr>`).join('')}</table><div style="font-size:12px;color:var(--ink-2);margin-top:4px">Red dashed = the "closest" method. Filled = the best pair. Numbers = minutes to the shop.</div>`;
        el.querySelector('.dl-mg').textContent = `total ${sg.total} min, worst ${sg.worst} min`;
        el.querySelector('.dl-mo').textContent = `total ${so.total} min, worst ${so.worst} min`;
        el.querySelector('.dl-mn').textContent = sg.total === so.total
          ? `This time both methods are equal (total ${so.total} min). That happens, but not always: keep pressing "New numbers".`
          : `O1 took its closest partner, so later orders got far-away ones. Looking at all together saved ${sg.total - so.total} min in total${sg.worst !== so.worst ? ` and the worst order went from ${sg.worst} to ${so.worst} min` : ''}.`;
      };
      el.querySelector('.dl-m1').addEventListener('click', () => { M = [[3, 5, 12], [4, 14, 15], [10, 6, 7]]; draw(); });
      el.querySelector('.dl-mr').addEventListener('click', () => { M = O.map(() => P.map(() => { seed = seed * 16807 % 2147483647; return 2 + seed % 14; })); draw(); });
      draw();
    }},
    { type: 'p', html: `In the example: the closest method gives 24 min in total (O2 got partner B, 14 min away); looking at all together gives 16 min in total (O1 gets B, O2 gets A). In computer science, this "who goes with whom" question is called <strong>bipartite matching</strong> (pairs between two groups, orders and partners). For big numbers, the industry uses methods like the Hungarian algorithm or min-cost flow, and decides in a batch every few seconds. Swiggy's exact solver is not public; this is the common approach.` },
    { type: 'p', html: `On top of this, Swiggy's post described three strategies:` },
    { type: 'steps', items: [
      { t: 'Just-in-time (JIT) assignment', d: 'Do not keep the partner standing at the restaurant. The naive way: delay the assignment by (prep time − average first mile). But averages are often wrong, and if no partner is found after the delay, the order is late. Better: <strong>earmark</strong> a partner now (he is no longer eligible for other orders), but <strong>dispatch</strong> him only when he will arrive at the right moment. An earmarked partner can also be <strong>swapped</strong> with another order if needed.' },
      { t: 'Next-order assignment', d: 'A partner who is delivering an order now but will be free in 10 min and is 5 min from the restaurant is perfect for an order with 20 min prep. Considering "busy" partners too makes the candidate pool bigger. Risk: if he becomes free late, the new order is late.' },
      { t: 'Batching', d: 'Two orders from the same restaurant (or nearby ones), with customers close to each other: one partner takes both. Orders per partner go up. But each order\'s promise must be kept, and how long the window should be (5 min? 10 min?) changes with the time (pre-dinner vs dinner) and the place (dense city vs suburb). Swiggy\'s 2021 paper says their ML system for the delivery time of batched orders increased deliveries within the promise by ~6%.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Earmark vs dispatch', html: `<strong>What it is:</strong> <strong>Earmark</strong> = the system has decided in its mind that this partner is for this order ("reserved" from other orders), but has not sent him yet. <strong>Dispatch</strong> = the order went to the partner's app and he has set off.<br><strong>Why we need it:</strong> the time in between gives the system freedom to change its decision (swap), and the partner does not stand waiting at the shop.<br><strong>Without it:</strong> either send the partner early and make him wait at the shop, or search late and find nobody.` },
    { type: 'flow', title: 'Assignment: JIT, swap, batch', height: 340,
      nodes: [
        { id: 'ord', label: 'Order event', sub: 'from Kafka', x: 85, y: 170, w: 130, kind: 'queue', info: 'What it is: the "order placed / accepted" event that came from Kafka. This is what starts the assignment work.' },
        { id: 'asg', label: 'Assignment', sub: 'earmark / dispatch', x: 295, y: 170, w: 150, kind: 'server', info: 'What it is: the engine that picks partners. It looks at thousands of pending orders and partners and makes pairs, earmarks, dispatches at the right moment, and swaps or batches when needed. In Swiggy\'s words, unlike e-commerce it does not get days, only a few minutes.' },
        { id: 'time', label: 'Time models', sub: 'prep, travel ETA', x: 295, y: 55, w: 150, kind: 'server', info: 'What it is: ML models that make guesses. Prep time (Zomato\'s FPT model), first mile and last mile travel time, when a partner will be free: all predictions. Every assignment strategy depends on their accuracy.' },
        { id: 'dei', label: 'Partner index', sub: 'location + status', x: 295, y: 290, w: 150, kind: 'cache', info: 'What it is: a fast list of each partner\'s latest location and status (free, busy, when free). A geo index kept in memory (map boxes like geohash or H3), so "who is within 2 km of this shop" is found instantly. The exact store is not public; Zomato\'s 2023 MongoDB case study says partner locations and order assignment also run on MongoDB.' },
        { id: 'pa', label: 'Partner A', sub: '5 min from shop', x: 610, y: 100, w: 140, kind: 'client', info: 'What it is: one delivery partner\'s phone app. When dispatched, the order shows up; the partner can accept or reject.' },
        { id: 'pb', label: 'Partner B', sub: 'on a delivery now', x: 610, y: 245, w: 140, kind: 'client', info: 'What it is: another partner\'s app. Maybe on another order, and free in a little while.' },
      ],
      edges: [{ a: 'ord', b: 'asg' }, { a: 'asg', b: 'time' }, { a: 'asg', b: 'dei' }, { a: 'asg', b: 'pa' }, { a: 'asg', b: 'pb' }],
      scenarios: [
        { name: 'JIT: earmark, then dispatch', steps: [
          { title: 'Order O1 arrives', text: 'The restaurant accepted, prep started.', go: 'evt:ord>asg' },
          { title: 'Predictions', text: 'Prep ~15 min. Nearby partners: A is 5 min away.', go: ['asg>time', 'res:time>asg', 'asg>dei', 'res:dei>asg'], msg: 'prep(O1)=15m | A: first mile 5m' },
          { title: 'Earmark', text: 'A is earmarked for O1, not sent. If sent now, A would stand at the restaurant for 10 min.', set: { pa: { state: 'warn', sub: 'earmarked: O1' } }, focus: ['asg'] },
          { title: 'Dispatch at the right moment', text: 'A is dispatched ~10 min later. A arrives, the food is ready. Wait ~0, same delivery time.', go: 'asg>pa', set: { pa: { state: 'ok', sub: 'dispatched: O1' } } },
        ]},
        { name: 'Swap (O2 arrives)', intro: 'The example from Swiggy\'s 2019 post.', steps: [
          { title: 'A earmarked for O1', text: 'A is earmarked for O1 (B was a bit farther).', set: { pa: { state: 'warn', sub: 'earmarked: O1' } }, go: 'evt:ord>asg' },
          { title: 'O2 arrives', text: 'A minute later O2 arrives, from a restaurant where B is very far and A is close.', go: ['evt:ord>asg', 'asg>dei', 'res:dei>asg'], msg: 'O2: A 4 min, B 18 min' },
          { title: 'Swap', text: 'A was not dispatched yet, so make it A → O2 and B → O1. Both orders are delivered well. If A had already been dispatched, O2 would have gone badly.', parallel: true, go: ['asg>pa', 'asg>pb'], set: { pa: { state: 'ok', sub: 'O2' }, pb: { state: 'ok', sub: 'O1' } } },
        ]},
        { name: 'Busy partner (next order)', steps: [
          { title: 'O3: 20 min prep', text: 'A big order, prep ~20 min.', go: 'evt:ord>asg' },
          { title: 'B is busy, but', text: 'B is on a delivery now: free in ~10 min, then ~5 min to the restaurant. Total 15 < 20.', go: ['asg>time', 'res:time>asg'], msg: 'B: free in 10m + 5m first mile = 15m ≤ prep 20m' },
          { title: 'Next order to B', text: 'O3 is assigned to B. A bigger pool, and less waiting for B. Risk: if B is free late, O3 is late, so the "when will he be free" prediction must be accurate.', go: 'asg>pb', set: { pb: { state: 'ok', sub: 'next: O3' } } },
        ]},
        { name: 'Partner rejected', steps: [
          { title: 'Dispatch', text: 'O1 is dispatched to A.', go: 'asg>pa' },
          { title: 'Reject', text: 'A rejected it (bike puncture, shift over). The JIT risk: we dispatched late, so now there is less buffer.', go: 'bad:pa>asg', set: { pa: { state: 'down', sub: 'rejected' } } },
          { title: 'Reassign at once', text: 'The next best (B). The order may be a little late; the tracking ETA updates and the customer sees the true time. That is why in JIT the probability of rejection is also counted in the model.', go: ['asg>dei', 'res:dei>asg', 'asg>pb'], set: { pb: { state: 'ok', sub: 'O1' } } },
        ]},
        { name: 'Batching', steps: [
          { title: 'Two orders, one restaurant', text: 'O1 and O2 from the same restaurant, 3 min apart, customers close to each other.', go: ['evt:ord>asg', 'evt:ord>asg'], msg: 'O1 + O2: same restaurant, drops 4 min apart' },
          { title: 'Promise check', text: 'If one partner takes both, will both arrive within their promised time? Check it yourself in the widget below.', go: ['asg>time', 'res:time>asg'] },
          { title: 'One partner, two orders', text: 'Yes, so A gets both. One partner is saved and can take another order.', go: 'asg>pa', set: { pa: { state: 'ok', sub: 'batch: O1+O2' } } },
        ]},
      ],
    },

    { type: 'p', html: `Batch or not? Two orders O1 and O2 from the same restaurant, with the same promise. O1's food is ready at 15 min, O2's is ready "gap" minutes later. One partner waits until both are ready, then picks the drop order in which the latest order is least late. (Simplified model: the partner is already at the restaurant.)` },
    { type: 'custom', render(el) {
      const PREP = 15;
      const calc = (gap, lm1, lm2, d12, P) => {
        const solo1 = PREP + lm1, solo2 = PREP + gap + lm2, pick = PREP + gap;
        const a = { first: 'O1', t1: pick + lm1, t2: pick + lm1 + d12 }, b = { first: 'O2', t2: pick + lm2, t1: pick + lm2 + d12 };
        const best = Math.max(a.t1, a.t2) <= Math.max(b.t1, b.t2) ? a : b;
        const soloDE = lm1 + lm2, batchDE = gap + (best.first === 'O1' ? lm1 : lm2) + d12;
        return { solo1, solo2, best, ok: best.t1 <= P && best.t2 <= P, soloDE, batchDE, saved: soloDE - batchDE };
      };
      el.innerHTML = `<div class="row2">
          <div><label for="dl-g">O2 ready how much later: <b class="dl-gv"></b> min</label><input id="dl-g" type="range" min="0" max="15" step="1" value="3"></div>
          <div><label for="dl-d">Between the two customers: <b class="dl-dv"></b> min</label><input id="dl-d" type="range" min="1" max="15" step="1" value="4"></div>
          <div><label for="dl-l1">Restaurant → customer 1: <b class="dl-l1v"></b> min</label><input id="dl-l1" type="range" min="3" max="25" step="1" value="10"></div>
          <div><label for="dl-l2">Restaurant → customer 2: <b class="dl-l2v"></b> min</label><input id="dl-l2" type="range" min="3" max="25" step="1" value="12"></div>
          <div><label for="dl-p">Promise (for both): <b class="dl-pv"></b> min</label><input id="dl-p" type="range" min="20" max="50" step="1" value="35"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Separately (O1 / O2)</span><strong class="dl-s"></strong></div>
          <div class="stat"><span>Batch (O1 / O2)</span><strong class="dl-bt"></strong></div>
          <div class="stat"><span>Partner-minutes saved</span><strong class="dl-sv"></strong></div>
          <div class="stat"><span>Decision</span><strong class="dl-v"></strong></div>
        </div>
        <div class="calc-note dl-bn"></div>`;
      const g = id => Number(el.querySelector('#' + id).value);
      const upd = () => {
        [['g', 'dl-g'], ['d', 'dl-d'], ['l1', 'dl-l1'], ['l2', 'dl-l2'], ['p', 'dl-p']].forEach(([k, id]) => { el.querySelector('.dl-' + k + 'v').textContent = g(id); });
        const r = calc(g('dl-g'), g('dl-l1'), g('dl-l2'), g('dl-d'), g('dl-p')), P = g('dl-p');
        el.querySelector('.dl-s').textContent = `${r.solo1} / ${r.solo2} min`;
        el.querySelector('.dl-bt').textContent = `${r.best.t1} / ${r.best.t2} min`;
        el.querySelector('.dl-sv').textContent = r.saved + ' min';
        const v = r.ok && r.saved > 0;
        el.querySelector('.dl-v').textContent = v ? 'Batch them' : 'Do not batch';
        el.querySelector('.dl-v').style.color = v ? 'var(--green)' : 'var(--red)';
        el.querySelector('.dl-bn').textContent = !r.ok
          ? `In the batch, one order would break the ${P} min promise (${Math.max(r.best.t1, r.best.t2)} min). The promise to the customer comes first; do not make this batch.`
          : r.saved <= 0 ? `The promise is kept, but no partner time is saved (customers too far apart or the wait too long). No benefit.`
          : `Drop ${r.best.first} first. Both are within the promise, and ${r.saved} partner-minutes are saved: the other partner can take another order. The cost: one customer waits a little longer than with a separate delivery.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults, the batch gives 28 / 32 min (separately 25 / 30), and the partner saves 5 min. Set "O2 ready how much later" to 8: O2 arrives at 37 min, and the promise is broken. Set the distance between customers to 12 min: same result. This is the dilemma from Swiggy's post: a bigger window = more batching, but the first order waits longer.` },

    { type: 'h2', text: 'Deep dive 2: predictions everywhere' },
    { type: 'p', html: `Every strategy above rests on a prediction. Both companies have written about their models:` },
    { type: 'table', head: ['What is predicted', 'Who, when', 'What they did (paraphrased)'], rows: [
      ['Food Preparation Time (FPT)', 'Zomato, 2020', 'Dish names turned into embeddings (lakhs of different dishes, so not one-hot), an entity embedding for the restaurant, and a sequence of the restaurant\'s last 5 completed + currently running orders. Mean absolute error went from 4.64 to 4.13 min. Earlier, FPT was taken as accept-to-pickup, which also included the partner\'s delay; hence the "Food Order Ready" button in the restaurant app.'],
      ['Partner travel time (DP-ETA)', 'Zomato, 2022', 'In smaller cities, map data is weak and partners take their own routes; so they moved from a map-graph model to a tree model (LightGBM), a separate model per city. Thousands of QPS, milliseconds on CPU. FastAPI serving ~2-3 ms vs MLflow ~7-8 ms; serving cost of the base model under ~$10/day.'],
      ['Road distance', 'Swiggy, 2021', 'OSM (A*) or Google Directions, cached on geohash L7/L8 pairs (the diagram above).'],
      ['Tracking screen ETA', 'Swiggy, 2023', '4 separate models for the order\'s 4 legs (O2A, First Mile, Wait Time, Last Mile); the prediction refreshes at fixed intervals, with features like live partner pings, restaurant stress and rain.'],
      ['Batched order delivery time', 'Swiggy, 2021 paper', 'A separate ML system for orders that get batched; ~6% more deliveries within the promise.'],
    ]},
    { type: 'p', html: `Some words from the table in plain language: an <strong>embedding</strong> = turning something (like the dish name "paneer tikka") into a short list of numbers, so that similar things get similar lists. <strong>One-hot</strong> = a separate slot for every dish (lakhs of dishes = lakhs of slots), so it is useless here. <strong>Mean absolute error (MAE)</strong> = how many minutes the guess was wrong on average. <strong>LightGBM</strong> = a fast, popular ML method that combines many small "if-then" decision trees. <strong>FastAPI / MLflow</strong> = two tools for running a model like an API.` },
    { type: 'callout', tone: 'warn', title: 'A human detail', html: `Zomato's 2022 ETA post says they do <strong>not</strong> show the ETA or a countdown to their delivery partners, so that they do not hurry or drive rashly on the road. System design is not only servers; incentives are design too.` },

    { type: 'h2', text: 'Deep dive 3: live tracking' },
    { type: 'p', html: `Swiggy's 2018 post says customers come back to the tracking screen again and again during the 20-45 min wait. If every customer polls every few seconds, the API carries a useless load (Uber's RAMEN post says 80% of requests at peak were polling). So the server <strong>pushes</strong>. In 2026 Zomato open-sourced its Android library <strong>Pulse</strong>: persistent connections over <strong>MQTT</strong> that carry live location and order lifecycle events in the delivery partner app, the consumer app and the Hyperpure app. Their post says that with HTTP polling, the overhead of headers was often bigger than the real data.` },
    { type: 'callout', tone: 'term', title: 'New word: MQTT', html: `<strong>What it is:</strong> <strong>MQTT</strong> is a light "publish-subscribe" protocol (a set of rules for talking) built for weak mobile networks. The phone keeps one connection open to a <strong>broker</strong> (a middle server that acts like a postman) and subscribes to topics (like <code>orders/o42/track</code>). Whenever anyone publishes on that topic, the broker delivers it to that phone at once.<br><strong>Why we need it:</strong> the customer should see the partner in a new place every few seconds, without asking again and again. MQTT headers are small and the reconnect rules are part of the protocol.<br><strong>Without it:</strong> polling (below), or building all these rules ourselves on WebSocket.` },
    { type: 'callout', tone: 'term', title: 'New words: polling vs push', html: `<strong>What it is:</strong> <strong>Polling</strong> = the app asks the server every 2 seconds "anything new?" (mostly the answer is "no"). <strong>Push</strong> = the connection stays open, and the server sends only when there really is something new.<br><strong>Why we need it (push):</strong> say 5 lakh people are on the tracking screen and poll every 2 seconds = 2.5 lakh requests per second, most of them useless. With push, requests are only as many as the new pings.<br><strong>Without it:</strong> useless load on the server and on the battery. Details in the <a href="#/realtime">Real-time lesson</a>.` },

    { type: 'flow', title: 'Live tracking: from the partner to the customer\'s map', height: 330,
      nodes: [
        { id: 'cust', label: 'Customer app', sub: 'tracking screen', x: 85, y: 70, w: 130, kind: 'client', info: 'What it is: the tracking screen of the customer\'s app. It is subscribed to the order\'s topic; when a new update arrives, the map and ETA change. Between two updates, the app animates the partner smoothly.' },
        { id: 'dp', label: 'Partner app', sub: 'pings + status', x: 85, y: 260, w: 130, kind: 'client', info: 'What it is: the partner\'s app. Every few seconds it sends the location (a ping) and status (arrived, picked up, delivered). Swiggy\'s 2019 partner app post says the app works even on weak networks: local storage as the source of truth, a lazy sync module and a retry framework (exponential/linear backoff).' },
        { id: 'br', label: 'MQTT broker', sub: 'pub-sub, push', x: 300, y: 165, w: 150, kind: 'net', info: 'What it is: the MQTT middle server (the postman) that handles lakhs of open connections. The partner app publishes, the customer app subscribes. On the client side, Zomato Pulse does automatic reconnect and subscription recovery. (Zomato has not made the server-side broker details public.)' },
        { id: 'trk', label: 'Tracking svc', sub: 'state + location', x: 510, y: 165, w: 140, kind: 'server', info: 'What it is: the brain of tracking. It checks pings (sudden GPS jumps, fake locations), saves the order\'s latest location/state, asks for an ETA refresh, and publishes the update on the customer\'s topic.' },
        { id: 'eta', label: 'ETA models', sub: '4 legs (Swiggy)', x: 648, y: 55, w: 132, kind: 'server', info: 'What it is: ML models that tell "how much longer". The model depends on which leg the order is in now: O2A, First Mile, Wait Time or Last Mile (Swiggy 2023). Refreshed at fixed intervals.' },
        { id: 'db', label: 'Tracking store', sub: 'MongoDB (Zomato)', x: 648, y: 285, w: 132, kind: 'data', info: 'What it is: the database of the latest location and status. MongoDB\'s 2023 customer case study says Zomato\'s order tracking (live statuses and partner locations) runs on MongoDB. This case study was written by the vendor, not a Zomato engineering post.' },
      ],
      edges: [{ a: 'dp', b: 'br' }, { a: 'cust', b: 'br' }, { a: 'br', b: 'trk' }, { a: 'trk', b: 'db' }, { a: 'trk', b: 'eta' }],
      scenarios: [
        { name: 'Ping → map (happy)', steps: [
          { title: 'Ping', text: 'The partner app published its location.', go: 'dp>br>trk', msg: 'pub dp/d88/loc { lat, lng, ts }' },
          { title: 'Save + ETA', text: 'Save the latest location, and refresh the ETA for the current leg (last mile).', go: ['trk>db', 'trk>eta', 'res:eta>trk'], msg: 'leg=LM → eta 9 min' },
          { title: 'Push', text: 'Publish on the customer\'s topic; the broker delivers to the phone at once. No polling.', go: 'evt:trk>br>cust', msg: 'orders/o42/track { lat, lng, eta: "9 min" }', after: { cust: { state: 'ok', sub: '9 min' } } },
        ]},
        { name: 'Status: picked up', steps: [
          { title: 'Picked up', text: 'The partner pressed "picked up".', go: 'dp>br>trk', msg: 'POST picked-up (order o42)' },
          { title: 'State machine', text: 'The tracking/order service checks the transition (READY → PICKED_UP) and saves it. The event also goes to Kafka (previous diagram).', go: ['trk>db', 'res:db>trk'], after: { trk: { state: 'ok', sub: 'PICKED_UP' } } },
          { title: 'To the customer', text: '"Your order is on the way" at once.', go: 'evt:trk>br>cust' },
        ]},
        { name: 'Partner lost network', steps: [
          { title: 'Basement / lift', text: 'The partner is in the lift of the customer\'s building; the network is gone. Pings stopped.', go: 'lost:dp>br', set: { dp: { state: 'warn', sub: 'offline' } } },
          { title: 'What should the customer see?', text: 'The last known location and "updated 1 min ago". The ETA model adjusts for the time that has passed. Showing the truth is better than animating in the wrong place.', focus: ['cust'], set: { cust: { state: 'warn', sub: 'last seen 1m' } } },
          { title: 'Back online', text: 'The partner had pressed "delivered" while offline; the app kept it locally and synced it with retries when the network came back. The transition on the server is idempotent, so a retry does not double anything.', set: { dp: { state: '' } }, go: ['dp>br>trk', 'trk>db', 'evt:trk>br>cust'], after: { cust: { state: 'ok', sub: 'DELIVERED' } } },
        ]},
        { name: 'Customer app in background', steps: [
          { title: 'App closed', text: 'The customer opened another app; the OS cut the connection.', go: 'lost:br>cust', set: { cust: { state: 'dim', sub: 'background' } } },
          { title: 'Important updates', text: 'Big status changes (picked up, delivered) also go as push notifications (the common industry approach).', go: 'evt:trk>br', msg: 'notification: "Order picked up"' },
          { title: 'App back', text: 'When the app opens, the client reconnects and subscribes to its topics again (Pulse\'s "subscription recovery"), then gets the fresh state.', set: { cust: { state: 'ok', sub: 'live' } }, go: ['cust>br', 'evt:br>cust'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 4: the dinner peak and failures' },
    { type: 'p', html: `Swiggy's Mar 2021 post says one of their storefront services went from ~1 lakh to ~3 lakh requests per minute at lunch, and ~5 lakh rpm at dinner; 4-6 hours of peak a day and 6-8 hours of almost zero. Running machines 24 hours for the peak burns money, so compute and storage <strong>autoscale</strong> with demand (when load rises, machines are added automatically; when it falls, they are removed). The same post talks about "hundreds of microservices" and an average fan-out of 3-5x, which leaves many services with a P99 budget of only ~50 ms.` },
    { type: 'list', items: [
      `<strong>Diamond call graph:</strong> S1 → S2, S3 → if both call S5, S5 gets double load. Swiggy's post: if S5 slows down, stop the fault at S2/S3 (timeout = stop waiting after a limit; circuit breaker = stop calling a service that keeps failing for a while; fallback = give some old/default answer), and do not let it reach S1. Details in the <a href="#/resilience">Resilience</a> lesson.`,
      `<strong>A falling cache:</strong> caching is needed for the latency budget, but on a big cache miss the database cannot answer within the budget, and failures cascade. So the cache must also be highly available, with protection against a stampede on the DB.`,
      `<strong>Demand-supply equilibrium:</strong> the fleet does not grow in a minute. Reduce serviceability with the stress state machine, add a surge/rain fee, stop long last-mile orders. Better than overbooking and making everyone late.`,
      `<strong>Pre-planned events (New Year's Eve):</strong> a summary of Zomato's NYE 2023 post says they did capacity planning from a demand forecast, load tests of hundreds of microservices with their in-house benchmarking tool, and chaos testing (injecting failures on purpose). (This point is based on a secondary summary, so it has fewer details.)`,
    ]},
    { type: 'h3', text: 'Simulator: a rainy evening, stress and degradation' },
    { type: 'p', html: `Servers can autoscale, but <strong>partners do not autoscale</strong>. Swiggy's stress system (Step 4) exists for exactly this. Below is a toy model: one zone, the next 30 minutes. Stress = orders ÷ free partners. Depending on the level, the system lightens its work (graceful degradation). The thresholds and percents are assumptions; Swiggy has not made its real numbers public.` },
    { type: 'custom', render(el) {
      // Toy stress model. All thresholds and percents are assumptions; Swiggy's real numbers are not public.
      const LV = [
        { name: 'Normal', max: 1.0, cut: 0, cap: 1, act: 'Nothing. All serviceable shops, no extra fee.' },
        { name: 'High', max: 1.4, cut: 0.15, cap: 1, act: 'Orders with a long last mile stopped, ₹20 surge fee.' },
        { name: 'Very high', max: 2.0, cut: 0.3, cap: 1.2, act: 'Smaller radius, ₹35 fee, bigger batching window (one partner, two orders).' },
        { name: 'Extreme', max: Infinity, cut: 0.5, cap: 1.2, act: 'Only very close shops; the rest show "delivery not possible right now".' },
      ];
      el.innerHTML = `<div class="row2">
          <div><label for="dl-so">Orders in the next 30 min (zone): <b class="dl-sov"></b></label><input id="dl-so" type="range" min="50" max="600" step="10" value="300"></div>
          <div><label for="dl-sp">Free partners: <b class="dl-spv"></b></label><input id="dl-sp" type="range" min="50" max="400" step="10" value="200"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" class="dl-sr"> Rain starts (orders +40%, partners −20%)</label>
        <div class="stats">
          <div class="stat"><span>Stress level</span><strong class="dl-s1" style="font-size:16px"></strong></div>
          <div class="stat"><span>Late orders, without degradation</span><strong class="dl-s2"></strong></div>
          <div class="stat"><span>Late orders, with degradation</span><strong class="dl-s3"></strong></div>
          <div class="stat"><span>Orders not taken today</span><strong class="dl-s4"></strong></div>
        </div>
        <div class="calc-note dl-sn"></div>`;
      const g = id => Number(el.querySelector('#' + id).value);
      const upd = () => {
        const rain = el.querySelector('.dl-sr').checked;
        el.querySelector('.dl-sov').textContent = g('dl-so'); el.querySelector('.dl-spv').textContent = g('dl-sp');
        const orders = Math.round(g('dl-so') * (rain ? 1.4 : 1)), partners = Math.round(g('dl-sp') * (rain ? 0.8 : 1));
        const r = orders / partners, L = LV.find(l => r <= l.max);
        const accepted = Math.round(orders * (1 - L.cut)), cap = Math.round(partners * L.cap);
        const lateNo = Math.max(0, orders - partners), lateYes = Math.max(0, accepted - cap);
        el.querySelector('.dl-s1').textContent = `${L.name} (${r.toFixed(2)})`;
        el.querySelector('.dl-s2').textContent = lateNo;
        el.querySelector('.dl-s3').textContent = lateYes;
        el.querySelector('.dl-s4').textContent = orders - accepted;
        el.querySelector('.dl-sn').textContent = `${orders} orders, ${partners} partners (assume each partner needs 30 min for ~1 order). Action: ${L.act} Without degradation ${lateNo} orders are late; with degradation ${lateYes} are late, and ${orders - accepted} orders were not taken at all.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the defaults (300 orders, 200 partners), stress is 1.50 = "Very high". If all orders were taken, 100 would be late. With degradation, 90 orders were never taken (those customers did not see far-away shops), and not one is late. Now switch the rain on: 420 orders, 160 partners, "Extreme". Without degradation 260 are late; with degradation 18 are late and 210 orders are not taken today. This is a bitter deal: saying "no" to some customers, so that the promise to the others is not broken.` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Three sides', d: 'Customer, merchant, partner. The merchant\'s prep time is not in our control, and everything is tied to it.' },
      { t: 'The read path is heavy', d: 'Every listing visit means serviceability checks for ~2,000 restaurants. Geo clusters in memory, a distance cache, fast ETA models. Fallbacks (radial filter).' },
      { t: 'Delivery time equation', d: 'max(assignment + first mile, prep) + last mile. Every term is a model.' },
      { t: 'Order state machine', d: 'PAYMENT_PENDING → PLACED → ACCEPTED → READY → PICKED_UP → DELIVERED, cancel/refund branches, idempotent transitions, outbox → Kafka.' },
      { t: 'Payments', d: 'Idempotency key, timeout = unknown, status check/webhook, refund as compensation, PG routing.' },
      { t: 'Assignment', d: 'Not the closest, but the global best: JIT (earmark/dispatch), next-order, batching with a promise check.' },
      { t: 'Tracking', d: 'Push (MQTT/WebSocket), a partner app that works offline, ETA per leg.' },
      { t: 'Peak', d: 'Autoscale, stress-based degradation, disciplined retries, load tests before NYE.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• "Who can deliver to this location?" → for fixed places, <strong>polygons/clusters + a geohash index</strong> (or Elasticsearch/PostGIS geo filters), and a <strong>cache</strong> for road distance; a plain circle only as a fallback.<br>• A multi-step lifecycle like an order → <strong>state machine</strong> + idempotent transitions + <strong>outbox → Kafka</strong> events; a rollback across services → <strong>saga compensation</strong> (refund).<br>• Payment timeout → treat it as <strong>unknown</strong>, ask for the status, never retry blindly.<br>• Moving partners → an in-memory geo index; matching → global optimisation (batch/JIT), not the closest one.<br>• Live updates → <strong>push</strong> (MQTT/WebSocket/SSE), not polling.` },

    { type: 'diagram', title: 'The whole design at a glance', height: 580,
      caption: 'Three apps, one gateway, and services behind it. Showing shops (read) is the heaviest; the order and the money (write) are the most delicate; push for the partner and the map. Use the buttons above to see one path at a time.',
      groups: [
        { label: 'Apps (three sides)', x: 10, y: 12, w: 700, h: 104 },
        { label: 'Front door + push', x: 10, y: 135, w: 700, h: 100 },
        { label: 'Services', x: 10, y: 250, w: 700, h: 214 },
        { label: 'Pressure + outside companies', x: 10, y: 480, w: 700, h: 92 },
      ],
      nodes: [
        { id: 'cust', label: 'Customer app', sub: 'browse, order, map', x: 90, y: 70, kind: 'client', info: 'What it is: the app on the customer\'s phone. It shows shops, places orders (with an Idempotency-Key), and gets live updates on the tracking screen over MQTT.' },
        { id: 'merch', label: 'Shop app', sub: 'accept, ready', x: 450, y: 70, kind: 'client', info: 'What it is: the app on the restaurant/store tablet. A new order arrives from a Kafka event; it presses accept/reject and "ready". Zomato added the "Food Order Ready" button to learn the real prep time.' },
        { id: 'dp', label: 'Partner app', sub: 'pings, status', x: 630, y: 70, kind: 'client', info: 'What it is: the delivery partner\'s app. It sends its location every few seconds, takes the order on dispatch, and on a weak network keeps the status locally and syncs later (Swiggy 2019).' },
        { id: 'gw', label: 'API gateway', sub: 'login, routing', x: 90, y: 185, kind: 'net', info: 'What it is: the single front door for all normal (HTTP) requests. It checks the login and sends the request to the right service. The common industry approach; the exact gateway of Swiggy/Zomato is not public.' },
        { id: 'br', label: 'MQTT broker', sub: 'push, pub-sub', x: 270, y: 185, kind: 'net', info: 'What it is: the postman for lakhs of open connections. The partner app publishes its location, the customer app subscribes; dispatch can also reach the partner this way. Zomato\'s Pulse library (2026) is built on MQTT.' },
        { id: 'trk', label: 'Tracking svc', sub: 'location + state', x: 630, y: 185, kind: 'server', info: 'What it is: it checks pings and saves the latest location, asks for an ETA refresh, and sends the update on the customer\'s topic. When the status changes (picked up), an event goes to Kafka.' },
        { id: 'svc', label: 'Serviceability', sub: 'who, how long', x: 90, y: 300, kind: 'server', info: 'What it is: the brain behind the listing. On every visit, for ~2,000 shops: cluster filter, road distance, ETA, stress, fee, and "show it or not". Swiggy: ~20 crore evaluations/min at peak, P99 < 200 ms.' },
        { id: 'ord', label: 'Order service', sub: 'state machine', x: 270, y: 300, kind: 'server', info: 'What it is: the owner of the order. Only allowed transitions (PLACED → ACCEPTED ...), idempotent, and an event for every change through the outbox to Kafka. On cancel/reject, the saga undo step: refund.' },
        { id: 'kf', label: 'Kafka', sub: 'order events', x: 450, y: 300, kind: 'queue', info: 'What it is: the durable register of events. The shop, assignment, notifications and analytics all read from here. Swiggy 2022: 50+ services on one cluster; thoughtless retries can put 100x load on the cluster.' },
        { id: 'asg', label: 'Assignment', sub: 'JIT, batch, swap', x: 630, y: 300, kind: 'server', info: 'What it is: the engine that picks partners. Not the closest one, but pairs chosen by looking at all together. Earmark and dispatch at the right moment, swap when needed, and batch when the promise is safe.' },
        { id: 'geo', label: 'Geo + distance', sub: 'geohash, cache', x: 90, y: 415, kind: 'cache', info: 'What it is: an in-memory geohash → clusters index, and cached road distances (OSM/Google) per (geohash, geohash) pair. If the index fails, fall back to a plain circle (radial).' },
        { id: 'pay', label: 'Payments', sub: 'PG router', x: 270, y: 415, kind: 'server', info: 'What it is: our payment service. One charge thanks to the idempotency key, picking the best PG (ML), timeout = "we do not know" (ask the status or wait for the webhook), and refunds with their own key.' },
        { id: 'models', label: 'ETA models', sub: 'prep, travel', x: 450, y: 415, kind: 'server', info: 'What it is: the ML models that make guesses: prep time (Zomato FPT), partner travel (Zomato DP-ETA), and the 4 legs of tracking (Swiggy). Listing, assignment and tracking all use them.' },
        { id: 'pidx', label: 'Partner index', sub: 'location, status', x: 630, y: 415, kind: 'cache', info: 'What it is: each partner\'s latest location and condition (free, busy, when free) in memory, organised by map boxes (cells). Assignment asks "who is near this shop" here.' },
        { id: 'stress', label: 'Stress FSM', sub: 'zone pressure', x: 90, y: 530, kind: 'server', info: 'What it is: the level of orders vs free partners in each zone (a state machine). Under high stress: smaller radius, a fee, long orders stopped: graceful degradation.' },
        { id: 'pg', label: 'PG companies', sub: 'outside companies', x: 270, y: 530, kind: 'net', info: 'What it is: outside companies that talk to banks/UPI/cards. Not in our control, so we use several PGs and routing.' },
      ],
      edges: [
        { a: 'cust', b: 'gw', n: 1, label: 'listing, order' },
        { a: 'gw', b: 'svc' }, { a: 'svc', b: 'geo' }, { a: 'svc', b: 'stress', dashed: true, via: [[180, 360], [180, 530]] },
        { a: 'svc', b: 'models', dashed: true },
        { a: 'gw', b: 'ord', n: 2 }, { a: 'ord', b: 'pay', n: 3 }, { a: 'pay', b: 'pg' },
        { a: 'ord', b: 'kf', n: 4, kind: 'evt' }, { a: 'kf', b: 'merch', kind: 'evt' },
        { a: 'kf', b: 'asg', n: 5, kind: 'evt' }, { a: 'asg', b: 'pidx' }, { a: 'asg', b: 'models', dashed: true },
        { a: 'asg', b: 'br', n: 6, label: 'dispatch' },
        { a: 'dp', b: 'br' }, { a: 'br', b: 'trk' }, { a: 'trk', b: 'kf', kind: 'evt' },
        { a: 'br', b: 'cust', kind: 'res', label: 'live map' },
      ],
      paths: [
        { name: 'Browse', text: 'App → gateway → serviceability: cluster from the geohash, road distance from the cache, time from the ETA models, fee/radius from stress. ~2,000 shops, within 200 ms.', go: ['cust>gw>svc>geo', 'svc>stress', 'svc>models'] },
        { name: 'Place order', text: 'The order with an Idempotency-Key → payments → PG. Money confirmed, state PLACED, the event goes from the outbox to Kafka, and from Kafka to the shop app.', go: ['cust>gw>ord>pay>pg', 'ord>kf>merch'] },
        { name: 'Assign rider', text: 'Kafka event → assignment: nearby partners from the partner index, prep/travel from the ETA models, pairs chosen by looking at all together, dispatch at the right moment by push to the partner app.', go: ['kf>asg>pidx', 'asg>models', 'asg>br>dp'] },
        { name: 'Track', text: 'Partner app ping → broker → tracking svc (save, ETA refresh) → broker → the customer\'s map. A status change also sends an event to Kafka.', go: ['dp>br>trk', 'trk>br>cust', 'trk>kf'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Three sides: customer, shop, partner. The shop's prep time is not in our control, and everything is tied to it.</li>
      <li>The heaviest work is the listing: ~2,000 serviceability checks per visit. Clusters + a geohash index, a road distance cache, and a fallback (circle).</li>
      <li>Delivery time = max(assignment + first mile, prep) + last mile. Every term is an ML guess.</li>
      <li>An order is a state machine: only allowed transitions, idempotent, and an event for every change through the outbox to Kafka. Cancel = the saga undo step (refund).</li>
      <li>Payment timeout = "we do not know", not failed. Ask the status with the same ID; never retry blindly.</li>
      <li>Partner: not the closest, but by looking at all together. JIT (earmark → dispatch), swap, next-order, batching with a promise check.</li>
      <li>Tracking: push (MQTT), not polling; the partner app keeps working offline.</li>
      <li>Peak: servers autoscale, partners do not. Degradation by stress level, backoff + jitter in retries, load tests before NYE.</li>
    </ul>` },
    { type: 'h2', text: 'The trade-offs we made' },
    { type: 'tradeoffs',
      gains: ['Clusters + geohash index: serviceability that understands direction, and is fast', 'Distance cache (L7/L8): crores of evaluations become cheap', 'Outbox + Kafka: the order service is decoupled, services work at their own speed', 'JIT + batching: less partner waiting, more orders per partner', 'Push tracking: the polling load is gone, updates arrive at once', 'Stress-based degradation: promises are kept even at peak'],
      costs: ['Clusters must be maintained by hand or semi-automatically', 'L7 cache pairs are a little less accurate', 'Events are eventually consistent: the customer sees the status a few seconds late', 'If JIT/batch predictions are wrong, orders are late and food goes cold', 'Persistent connections: running lakhs of sockets/brokers', 'Degradation: fewer restaurants and an extra fee at peak (unhappy customers)'] },

    { type: 'think', questions: [
      { q: 'The customer saw "28 min" on the listing, and "41 min" at checkout. What went wrong, and what should we do?', a: 'Between listing and checkout, the zone\'s stress probably went up (rain, fewer partners), or heavy items in the cart increased the prep time. That is why serviceability and the ETA are calculated again at checkout (Swiggy\'s post says this check also happens at checkout). Show the customer the new, true time; keeping the old promise and arriving late does more harm.' },
      { q: 'The restaurant accepted the order, a partner was assigned, then the customer cancelled. Which compensating steps are needed?', a: 'Order state CANCELLED (if the state machine allows it, with a fee as per policy), a refund (with its own idempotency key), a cancel event to the restaurant (stop the prep), an event to assignment (free/reassign the partner), and a notification to the customer. Every step through events, idempotent, so retries are safe. This is a saga.' },
      { q: 'The batching window was raised from 5 min to 10 min. What goes up, and what goes down?', a: 'More orders get batched, orders per partner go up, cost goes down. But the first order waits longer for the second, so its delivery time grows and the risk of breaking the promise rises. Swiggy\'s post says the right window changes with the time (dinner vs pre-dinner) and the area (dense vs suburb), so it is not one fixed number.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In an app like Zomato/Swiggy, where does the most computation happen?', options: ['When placing an order', 'Serviceability evaluations on the listing/home page', 'In payment'], answer: 1, explain: 'A check of ~2,000 restaurants on every visit: by Swiggy\'s numbers, ~20 crore evaluations per minute at peak. Orders are very few next to this.' },
      { q: 'Delivery time = max(assignment delay + first mile, prep time) + last mile. Why max?', options: ['By mistake', 'The partner arriving and the food being cooked happen at the same time; the longer one is what counts', 'The last mile is always the biggest'], answer: 1, explain: 'Two parallel jobs. If the partner arrives early, he waits; if the food is ready early, it goes cold.' },
      { q: 'In JIT assignment, why do we "earmark" a partner and "dispatch" him later?', options: ['So the partner does not stand waiting at the restaurant, and we keep the option to swap if a new order comes', 'To wait for payment confirmation', 'To reduce server load'], answer: 0, explain: 'The example from Swiggy\'s 2019 post: swapping an earmarked partner from O1 to O2 let both orders be delivered well.' },
      { q: 'The payment gateway\'s answer timed out. What is the right step?', options: ['Charge again at once', 'Mark the order FAILED and tell the customer to try again', 'Treat the status as unknown, ask for the status with the same payment ID / wait for the webhook'], answer: 2, explain: 'The money may already be taken. A blind retry = the risk of a double charge.' },
      { q: 'What does Swiggy\'s Kafka incident (2022) teach?', options: ['Do not use Kafka', 'Thoughtless retries can raise the load on the cluster up to 100x; design the retry policy and client versions carefully', 'Partitions never go offline'], answer: 1, explain: 'Partitions were gone for 4 min, but the retry storm and a client bug made the impact last much longer.' },
    ]},
    { type: 'sources', note: 'The Swiggy/Zomato-specific parts come from these sources; the year of each post is written, and several are a few years old. The order store, Kafka topics and broker internals are not public; there the lesson describes the common industry approach. The other napkin-maths numbers are assumptions.', items: [
      { title: 'The Swiggy Delivery Challenge (Part One)', publisher: 'Swiggy Bytes (Swiggy engineering blog)', year: 2018, official: true, url: 'https://bytes.swiggy.com/the-swiggy-delivery-challenge-part-one-6a2abb4f82f6', used: 'Delivery starts at app open; serviceability; delivery time equation; prep-time and first-mile prediction challenges; 300-500 restaurants shown.' },
      { title: 'The Swiggy Delivery Challenge (Part Two)', publisher: 'Swiggy Bytes', year: 2019, official: true, url: 'https://bytes.swiggy.com/the-swiggy-delivery-challenge-part-two-f095930816e3', used: 'Closest DE is globally bad; JIT (earmark vs dispatch, swap example, 15 vs 5 min example); next-order assignment; batching window trade-offs.' },
      { title: 'What Serviceability means at Swiggy?', publisher: 'Swiggy Bytes', year: 2020, official: true, url: 'https://bytes.swiggy.com/what-serviceability-means-at-swiggy-c94c1aad352a', used: 'Serviceability responsibilities, radial vs directional (cluster) filtering, OSM distances, stress FSM and graceful degradation, surge fee.' },
      { title: 'Designing the Serviceability Platform at Swiggy for High Scale, Part 1', publisher: 'Swiggy Bytes', year: 2021, official: true, url: 'https://bytes.swiggy.com/designing-the-serviceability-platform-at-swiggy-for-high-scale-part-1-751a631f0379', used: '100k visits/min × 2000 = ~200M evaluations/min, P99 < 200 ms; geohash-indexed clusters + PIP; radial fallback; Google/OSM distances cached by geohash L7/L8 pairs.' },
      { title: 'A brief introduction to Engineering challenges at Swiggy', publisher: 'Swiggy Bytes', year: 2021, official: true, url: 'https://bytes.swiggy.com/engineering-challenges-at-swiggy-430dea6c86a3', used: 'Lunch 100K→300K rpm, dinner ~500K rpm; autoscaling; fan-out 3-5x, ~50 ms P99 budgets; diamond call graph; cache failure risk.' },
      { title: 'Where is my order? (Part I): ML-powered ETA', publisher: 'Swiggy Bytes', year: 2023, official: true, url: 'https://bytes.swiggy.com/how-ml-powers-when-is-my-order-coming-part-i-4ef24eae70da', used: 'Four legs (O2A, FM, WT, LM), four models, periodic refresh, real-time features.' },
      { title: '#BehindTheBug: Kafka Under The Water', publisher: 'Swiggy Bytes', year: 2022, official: true, url: 'https://bytes.swiggy.com/behindthebug-kafka-under-the-water-288c3d05b202', used: 'Kafka used for orchestration/choreography; 50+ services on one fulfilment cluster; 4-min partition outage, 18 services, ~100x ingress from retries, client bug, recovery.' },
      { title: 'An ML approach for routing payment transactions', publisher: 'Swiggy Bytes', year: 2022, official: true, url: 'https://bytes.swiggy.com/an-ml-approach-for-routing-payment-transactions-5a14efb643a8', used: 'Multiple PGs per method; per-method routing models; Beta sampling for UPI; 5% exploration for cards.' },
      { title: 'Architecture and Design Principles Behind Swiggy\'s Delivery Partners App', publisher: 'Swiggy Bytes', year: 2019, official: true, url: 'https://bytes.swiggy.com/architecture-and-design-principles-behind-the-swiggys-delivery-partners-app-4db1d87a048a', used: 'FSM per delivery flow, native storage as source of truth, lazy sync and retry framework for flaky networks.' },
      { title: 'Paper on ML based batching prediction published', publisher: 'Swiggy Bytes (CODS-COMAD 2021 paper)', year: 2021, official: true, url: 'https://bytes.swiggy.com/paper-on-ml-based-batching-prediction-published-ba3f16d060c1', used: '~6% more deliveries within estimate for batched orders.' },
      { title: 'Making Swiggy\'s order tracking a magical experience', publisher: 'Swiggy Bytes', year: 2018, official: true, url: 'https://bytes.swiggy.com/making-swiggys-order-tracking-a-magical-experience-37464b878fc7', used: 'Customers return to tracking screen repeatedly during 20-45 min wait.' },
      { title: 'The Deep Tech Behind Estimating Food Preparation Time', publisher: 'Zomato blog', year: 2020, official: true, url: 'https://www.zomato.com/blog/food-preparation-time', used: 'FPT components, dish embeddings, restaurant embeddings, sequence of last 5 orders, MAE 4.64→4.13 min, Food Order Ready button.' },
      { title: 'The accurate ETA to customer satisfaction (Parts One and Two)', publisher: 'Zomato blog', year: 2022, official: true, url: 'https://www.zomato.com/blog/the-accurate-eta-to-customer-satisfaction-part-two', used: 'ETA used in browsing, assignment, tracking; map-graph → LightGBM tree model; per-city models; FastAPI vs MLflow latency; <$10/day; no ETA countdown shown to DPs.' },
      { title: 'Pulse: resilient MQTT infrastructure for Android', publisher: 'Zomato / Eternal engineering blog', year: 2026, official: true, url: 'https://www.eternal.com/blog/pulse', used: 'MQTT for live location and order lifecycle events across DP, consumer and Hyperpure apps; polling overhead; reconnect and subscription recovery.' },
      { title: 'Zomato case study', publisher: 'MongoDB blog (vendor-written customer story)', year: 2023, url: 'https://mongodb.com/company/blog/innovation/zomato-manages-high-volume-data-delivers-high-speed-success', used: 'Order tracking (live statuses, DP locations) and order assignment on MongoDB.' },
      { title: 'Zomato receives record 4,100 orders per minute on New Year\'s Eve', publisher: 'Business Today (news report)', year: 2021, url: 'https://www.businesstoday.in/latest/trends/story/zomato-receives-record-4100-orders-per-minute-on-new-years-eve-283215-2021-01-01', used: 'Peak orders per minute for napkin maths.' },
      { title: 'Zomato\'s NYE: behind the scenes (summary of Zomato\'s "A Tale of Scale" post)', publisher: 'Biweekly Engineering (secondary summary)', year: 2024, url: 'https://biweekly-engineering.beehiiv.com/p/zomatos-nye-behind-scenes-biweekly-engineering-episode-28', used: 'Capacity planning, in-house benchmarking across microservices, chaos testing before NYE.' },
    ]},
  ],
});
