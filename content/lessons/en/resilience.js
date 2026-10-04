Lesson.register({
  id: 'resilience',
  title: 'API gateway, retries, circuit breaker',
  minutes: 35,
  summary: `xyz.com is no longer one big app, but ten small services. Network calls now fail in new ways: one slow service can bring down the whole site. This lesson covers the API gateway, BFF, service discovery, timeouts, retries + backoff + jitter, circuit breaker, bulkhead, service mesh and graceful degradation, and you run all of them yourself.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com is no longer one big program. It has become ten small programs (services) that talk to each other over the network.<br>Talking over the network is like a phone call: sometimes the line is busy, sometimes the voice is late, sometimes the call just drops.<br>If one service gets slow and all the others keep waiting for it, the whole site stops.<br>This lesson has the rules that stop this "one sick service makes everyone sick" problem: how long to wait, how many times to try again, when to stop trying, and how the site keeps running even when something breaks.` },
    { type: 'h2', text: 'Problem: one app, ten services' },
    { type: 'p', html: `xyz.com\'s team grew from 8 to 80 people. One big codebase was hard to manage, so the app was split into separate <strong>services</strong>: User service, Feed service, Recommendations service, Comments, Payments, Notifications... Each team deploys its own service.` },
    { type: 'callout', tone: 'term', title: 'New word: Microservices', html: `<strong>What it is:</strong> splitting one big app into small services that are deployed separately and talk to each other over the network (HTTP/gRPC).<br><strong>Why we need it:</strong> if 80 people work on one codebase, every deploy is a fight. Separate services = each team at its own speed.<br><strong>Without it:</strong> even a small bug fix needs a deploy of the whole app.<br><strong>The price:</strong> what used to be a function call (<code>getRecommendations()</code>) is now a network call. And network calls can be slow, can fail, or sometimes never get an answer. This whole lesson is about that price.` },
    { type: 'p', html: `This raised two new questions. First: which services should the mobile app talk to now? Second, and more dangerous: if one service gets slow, what happens to the rest? Let us start with the first question.` },

    { type: 'h2', text: 'API gateway: one door, many rooms inside' },
    { type: 'p', html: `To show the mobile app\'s home screen, we need user info, the feed, recommendations and the notifications count. If the app called all four services directly: four separate addresses hard-coded in the app, a separate login check in every service, every service open to the internet, and four network round trips on mobile.` },
    { type: 'callout', tone: 'term', title: 'New word: API Gateway', html: `<strong>What it is:</strong> a "main gate" that sits in front of all the services. One single address for the outside world (<code>api.xyz.com</code>). Every request comes here, the gateway checks it (login, limits) and decides which service to send it to. The technical name: a <strong>reverse proxy</strong> (a server that takes requests on behalf of the servers, not the clients, and forwards them).<br><strong>Why we need it:</strong> the app has to remember only one address, login is checked in one place, and the services stay hidden from the internet.<br><strong>Without it:</strong> four addresses hard-coded in the app, a separate login check in every service, all services open on the internet.<br><strong>Example:</strong> Kong, AWS API Gateway, Apigee, or setups based on Envoy/Nginx.` },
    { type: 'table', head: ['Gateway job', 'What it means'], rows: [
      ['Authentication', 'The JWT/token is checked in one place. Services trust that the user of an incoming request is already verified.'],
      ['Rate limiting', 'How many requests a user/IP/API key may send; it stops them right here (429 Too Many Requests).'],
      ['Routing', '<code>/feed/*</code> to the Feed service, <code>/pay/*</code> to Payments. Nobody outside knows the services\' inside addresses.'],
      ['Aggregation', 'For one request it can call several services and build one combined response, so mobile needs only one round trip.'],
      ['Other common jobs', 'TLS termination, request logging, metrics, adding a request ID, response compression.'],
    ]},
    { type: 'p', html: `Walk a request through the gateway yourself. Pick the path, the token, and "how many requests this user sent this minute". The gateway runs each check in turn, and stops at the first check that fails and sends back an error:` },
    { type: 'custom', render(el) {
      const PATHS = [['/feed/42', 'Feed service'], ['/pay/charge', 'Payments service'], ['/comments/9', 'Comments service'], ['/internal/admin', null]];
      const TOK = [['valid', 'Valid token'], ['missing', 'No token'], ['expired', 'Expired token']];
      let pi = 0, ti = 0;
      el.innerHTML = `<label>Path</label><div class="re-g-p" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div style="margin-top:10px"><label>Token</label><div class="re-g-t" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>
        <div style="margin-top:10px"><label>This user's requests this minute: <strong class="re-g-nv"></strong> (limit 100/min)</label><input class="re-g-n" type="range" min="1" max="150" step="1" value="12"></div>
        <div class="re-g-steps" style="margin-top:12px;font:14px/1.8 var(--f-mono)"></div>
        <div class="stats"><div class="stat"><span>Answer</span><strong class="re-g-res"></strong></div></div>`;
      const chips = (sel, list, get, set) => { const b0 = el.querySelector(sel); b0.innerHTML = ''; list.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === i ? ' on' : ''); b.textContent = x[0] === 'valid' || x[0] === 'missing' || x[0] === 'expired' ? x[1] : x[0]; b.onclick = () => { set(i); upd(); }; b0.appendChild(b); }); };
      const nE = el.querySelector('.re-g-n');
      const upd = () => {
        chips('.re-g-p', PATHS, () => pi, i => { pi = i; });
        chips('.re-g-t', TOK, () => ti, i => { ti = i; });
        const n = +nE.value, [path, svc] = PATHS[pi], tok = TOK[ti][0], steps = [];
        let res, col = 'var(--red)';
        el.querySelector('.re-g-nv').textContent = n;
        if (!svc) { steps.push(['✗', `Routing: "${path}" matches no public route`]); res = '404 Not Found'; }
        else {
          steps.push(['✓', `Routing: ${path} → ${svc}`]);
          if (tok !== 'valid') { steps.push(['✗', `Auth: ${tok === 'missing' ? 'no token was sent' : 'the token has expired'}`]); res = '401 Unauthorized'; }
          else {
            steps.push(['✓', 'Auth: token valid, user = riya']);
            if (n > 100) { steps.push(['✗', `Rate limit: ${n} > 100 this minute`]); res = '429 Too Many Requests'; }
            else { steps.push(['✓', `Rate limit: ${n} / 100`], ['→', `sent to ${svc} (with request ID and user ID headers)`]); res = '200 (the service\'s answer)'; col = 'var(--green)'; }
          }
        }
        el.querySelector('.re-g-steps').innerHTML = steps.map(([m, t]) => `<div><span style="color:${m === '✗' ? 'var(--red)' : m === '✓' ? 'var(--green)' : 'var(--accent)'}">${m}</span> ${esc(t)}</div>`).join('');
        const r = el.querySelector('.re-g-res'); r.textContent = res; r.style.color = col;
      };
      const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      nE.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Notice: only the requests that pass all three checks <strong>ever reach a service</strong>. Useless or wrong requests stop at the gate, and the services never even hear about them.` },
    { type: 'compare',
      left: { title: 'Load Balancer', html: `Spreads traffic over copies of the same server. "Which of the Feed service\'s 10 servers?"<br><br>It does not care much about what is inside the request.` },
      right: { title: 'API Gateway', html: `One front door for many different services: auth, rate limiting, routing, aggregation.<br><br>Usually <strong>both exist</strong>: an LB in front of the gateway (for the gateway\'s copies), and each service\'s own LB behind the gateway.` },
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `Do not stuff business logic into the gateway ("if the user is premium, put this in the feed"). The gateway sits on the path of every request: if it gets fat, every team has to depend on it, and it becomes a bottleneck and a SPOF itself. Keep the gateway thin, and run many copies of it too.` },

    { type: 'h2', text: 'BFF: Backend for Frontend' },
    { type: 'p', html: `A new problem: the web site needs 50 videos with full details on the home page, while the mobile app, because of its small screen and slow network, needs only 10 videos with small thumbnails. The TV app needs something else. One general API that tries to please everyone sends either far too much data or far too little.` },
    { type: 'callout', tone: 'term', title: 'New word: BFF (Backend for Frontend)', html: `<strong>What it is:</strong> <strong>its own small backend</strong> for each kind of client: Mobile BFF, Web BFF. The BFF calls the services below, and adds or trims the data to fit that client.<br><strong>Why we need it:</strong> mobile needs less data and fewer round trips, web needs full details. One general API cannot please both.<br><strong>Without it:</strong> useless big data on mobile (slow, the data pack runs out), or separate calls for everything on web.<br><strong>Example:</strong> Sam Newman\'s rule: "one experience, one BFF", and the BFF should be built by the same team that builds that frontend. This pattern came out of the work of companies like SoundCloud and REA.` },
    { type: 'list', items: [
      '<strong>When to use it</strong>: the clients really need different things (mobile vs web vs partners), and different teams build them.',
      '<strong>When not</strong>: there is only one web app. Then a BFF is just an extra hop and an extra service.',
      '<strong>The risk</strong>: the same logic starts getting copied across BFFs. Keep common logic in the services below; the BFF only handles "what does this screen need".',
    ]},
    { type: 'p', html: `See the difference in numbers. Say one round trip on the mobile network is 150 ms and the speed is 1 MB/s. With the general API, the home screen needs 3 calls (feed, user, notifications), and the feed gives full details of 50 videos. The BFF makes the same 3 calls inside the data center (~2 ms each) and sends only the data that is needed:` },
    { type: 'custom', render(el) {
      const C = { mobile: ['Mobile', 10, 1.5], web: ['Web', 50, 4], tv: ['TV', 24, 2.5] };
      let c = 'mobile';
      el.innerHTML = `<div class="re-b-c" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="re-b-tab table-wrap" style="margin-top:12px"></div>
        <div class="calc-note re-b-note"></div>`;
      const upd = () => {
        const box = el.querySelector('.re-b-c'); box.innerHTML = '';
        Object.entries(C).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === c ? ' on' : ''); b.textContent = v[0]; b.onclick = () => { c = k; upd(); }; box.appendChild(b); });
        const [name, n, kb] = C[c], RTT = 150, MBPS = 1;
        const genKB = 50 * 6 + 2 + 1, genMs = 3 * RTT + genKB / 1000 / MBPS * 1000;
        const bffKB = n * kb + 1, bffMs = RTT + 2 + bffKB / 1000 / MBPS * 1000;
        el.querySelector('.re-b-tab').innerHTML = `<table><thead><tr><th></th><th>General API</th><th>${name} BFF</th></tr></thead><tbody>
          <tr><td>Round trips (from the phone)</td><td>3</td><td>1</td></tr>
          <tr><td>Videos</td><td>50 (full details)</td><td>${n}</td></tr>
          <tr><td>Data</td><td>${genKB} KB</td><td>${bffKB.toFixed(0)} KB</td></tr>
          <tr><td>Home screen time (roughly)</td><td>${Math.round(genMs)} ms</td><td><strong>${Math.round(bffMs)} ms</strong></td></tr></tbody></table>`;
        el.querySelector('.re-b-note').textContent = `Time = round trips × 150 ms + data ÷ 1 MB/s (the 2 ms inside the BFF is added too). For ${name}, the BFF is ~${(genMs / bffMs).toFixed(1)} times faster. On web the difference is smaller, because web needs more data anyway. So build a BFF when the clients really need different things.`;
      };
      upd();
    }},
    { type: 'p', html: `The "Home BFF" in the next diagram is exactly this: it calls Feed and Recommendations for the mobile home screen and builds one response.` },

    { type: 'h2', text: 'Service discovery: what is the service\'s address?' },
    { type: 'p', html: `Earlier, servers were fixed, and their IP addresses were written in a config file. Now the Feed service runs in containers: at night autoscaling took it from 3 copies to 12, one crashed and came back on a new IP. How does the Home BFF know where the live copies of the Feed service are <em>right now</em>?` },
    { type: 'callout', tone: 'term', title: 'New word: Service discovery and service registry', html: `<strong>What it is:</strong> service discovery = finding the answer to "where is service X running right now?". For this there is a <strong>registry</strong>: a database like a phone book, "feed-service → 10.0.3.7:8080, 10.0.3.9:8080, ...". Each <strong>instance</strong> (one running copy of a service) registers itself as soon as it starts, and keeps proving it is alive with heartbeats/health checks. When it stops, or a health check fails, it is removed from the list.<br><strong>Why we need it:</strong> with containers and autoscaling, IPs change every day. IPs written in a config file go stale.<br><strong>Without it:</strong> new instances get no traffic, and dead instances keep getting it.<br><strong>Example:</strong> Consul, Netflix Eureka, etcd/ZooKeeper, and Kubernetes\' built-in system.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'home', label: 'Home BFF', sub: 'needs feed-service', x: 100, y: 170, w: 140, kind: 'server', info: 'What it is: the backend of the mobile home screen (BFF). With client-side discovery it gets the list from the registry itself, caches it, and picks an instance itself (round robin or least requests).' },
        { id: 'reg', label: 'Registry', sub: 'Consul / Eureka', x: 360, y: 60, w: 150, kind: 'data', info: 'What it is: the service registry, the list of live instances of every service. Instances register and keep passing health checks. It must itself run on 3+ nodes, or it becomes the SPOF.' },
        { id: 'f1', label: 'Feed #1', sub: '10.0.3.7', x: 620, y: 70, w: 130, kind: 'server', info: 'What it is: one copy (instance) of the Feed service. As soon as it starts, it registers its IP and port in the registry and keeps sending heartbeats. If the heartbeat stops, the registry removes it from the list, and callers stop sending it requests.' },
        { id: 'f2', label: 'Feed #2', sub: '10.0.3.9', x: 620, y: 170, w: 130, kind: 'server', info: 'What it is: the second copy of the Feed service. It is also registered in the registry and sends heartbeats.' },
        { id: 'f3', label: 'Feed #3', sub: '10.0.4.2 (new)', x: 620, y: 280, w: 130, kind: 'server', hidden: true, info: 'What it is: a third, new copy. Autoscaling made a new copy. It registers in the registry as soon as it starts.' },
      ],
      edges: [
        { a: 'home', b: 'reg' }, { a: 'home', b: 'f1' }, { a: 'home', b: 'f2' }, { a: 'home', b: 'f3' },
        { a: 'reg', b: 'f1', dashed: true }, { a: 'reg', b: 'f2', dashed: true }, { a: 'reg', b: 'f3', dashed: true },
      ],
      scenarios: [
        { name: 'Lookup (happy path)', steps: [
          { title: 'Instances register', text: 'As soon as they start, both Feed copies tell the registry: "I am here, this is my health endpoint."', parallel: true, go: ['evt:f1>reg', 'evt:f2>reg'], msg: 'PUT /v1/agent/service/register  {name: "feed", addr: "10.0.3.7", port: 8080}' },
          { title: 'The BFF asks for the list', text: 'The Home BFF asks "healthy instances of feed?" It gets the list and caches it for a few seconds.', go: ['home>reg', 'res:reg>home'], msg: 'GET /v1/health/service/feed?passing\n→ [10.0.3.7:8080, 10.0.3.9:8080]' },
          { title: 'The BFF picks an instance itself', text: 'Client-side load balancing: the BFF picks one from the list and calls it directly. No extra hop in between.', go: ['home>f2', 'res:f2>home'] },
        ]},
        { name: 'An instance died', steps: [
          { title: 'Feed #1 crashes', text: 'One copy fell.', set: { f1: { state: 'down', sub: 'DOWN' } }, focus: ['f1'] },
          { title: 'Health check fails', text: 'The registry\'s health checks fail. In a few seconds Feed #1 is removed from the list.', go: 'lost:reg>f1', after: { reg: { sub: 'feed: 1 healthy' } } },
          { title: 'Updated list', text: 'The BFF\'s cache refreshes (or the registry pushes through a watch). Now only Feed #2.', go: ['home>reg', 'res:reg>home', 'home>f2', 'res:f2>home'], msg: '→ [10.0.3.9:8080]' },
          { title: 'The gap in between', text: 'Between the crash and the list update, some requests may go to the dead instance. So discovery alone is not enough: every call also needs a timeout and one safe retry (we will see this later).', focus: ['home'] },
        ]},
        { name: 'Autoscale: a new copy', steps: [
          { title: 'Traffic grew, a new copy', text: 'The autoscaler started Feed #3. A new IP, not written in any config file.', show: ['f3'], set: { f3: { state: 'ok' } }, focus: ['f3'] },
          { title: 'Register', text: 'Feed #3 registers itself. It joins the list only after its health check passes, so a half-started instance does not take traffic.', go: 'evt:f3>reg', after: { reg: { sub: 'feed: 3 healthy' } } },
          { title: 'Traffic starts arriving', text: 'All three are in the BFF\'s next list. Nobody changed a config, nobody deployed.', go: ['home>reg', 'res:reg>home', 'home>f3', 'res:f3>home'] },
        ]},
      ],
    },
    { type: 'compare',
      left: { title: 'Client-side discovery', html: `The caller itself gets the list from the registry and picks an instance itself. (This was the classic way with Netflix Eureka.)<br><br>+ One hop less, smart load balancing<br>− You need a discovery library in every language` },
      right: { title: 'Server-side discovery', html: `The caller calls a fixed address (a load balancer/router), and that looks at the registry and forwards. (AWS load balancer, Kubernetes Service.)<br><br>+ The caller stays simple<br>− One extra hop, and the router must be kept HA` },
    },
    { type: 'p', html: `<strong>DNS-based discovery</strong> is the third common way: resolve <code>feed.internal</code>, and you get the IPs of healthy instances (Kubernetes DNS, Consul DNS). The simplest, it works in every language. Weakness: DNS answers are cached (TTL), so a dead instance\'s IP may keep coming for a while, and DNS cannot make a smart choice like "which instance is less busy".` },

    { type: 'h2', text: 'The real danger: one slow service brings everything down' },
    { type: 'p', html: `Now the most important story. One day the Recommendations service became <strong>slow</strong> (its database got stuck). Not down, just every answer in 30 seconds. Recommendations are a small part of the home page. What should happen? The home page should work without recommendations. What happens without safeguards? Run the first two scenarios:` },
    { type: 'callout', tone: 'term', title: 'New word: Thread pool (and connection pool)', html: `<strong>What it is:</strong> the server\'s "hands". A server can handle only a limited number of requests at once, like 200 <strong>threads</strong> (or 200 connections). Each request holds a thread until its work, and the network calls inside it, are done.<br><strong>Why it matters:</strong> if a call is stuck for 30 seconds, that thread is blocked for 30 seconds. All 200 blocked = the server cannot take any new request, even if the CPU is idle.<br><strong>Example:</strong> in the diagram below, the Home BFF has 200 threads. The meter shows how many are busy.` },
    { type: 'callout', tone: 'term', title: 'New word: Fallback and cascading failure', html: `<strong>Fallback</strong> = plan B: what to show if the real answer does not come (like an old cached list). <strong>Cascading failure</strong> = one service\'s problem knocks down the services above it, like dominoes.<br><strong>Why we need it:</strong> the fallback is the last piece that stops a cascading failure.<br><strong>Without it:</strong> the whole site goes down because of one non-essential feature.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'app', label: 'Mobile app', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: the xyz.com app on the user\'s phone. It sends one request for the home screen.' },
        { id: 'gw', label: 'API Gateway', sub: 'auth, limits', x: 260, y: 170, w: 140, kind: 'edge', meter: true, load: 15, info: 'What it is: the main gate. Token check, rate limit, and routing /home to the Home BFF. It also has limited connections: if the one behind it gets stuck, it can fill up too.' },
        { id: 'home', label: 'Home BFF', sub: '200 threads', x: 460, y: 170, w: 140, kind: 'server', meter: true, load: 10, info: 'What it is: the backend of the mobile home screen. It calls Feed and Recommendations to build the home screen response. Meter = how many threads are busy. Timeouts, the circuit breaker and the bulkhead live inside it (from a library or a sidecar).' },
        { id: 'feed', label: 'Feed service', x: 640, y: 60, w: 130, kind: 'server', info: 'What it is: the service that gives the list of videos. The main (critical) part of the home screen. It is healthy for the whole story.' },
        { id: 'recs', label: 'Recommendations', x: 630, y: 280, w: 150, kind: 'server', info: 'What it is: the service that makes "videos for you". A nice feature, but not essential. Its database is the one that gets stuck.' },
        { id: 'fb', label: 'Fallback', sub: 'cached popular list', x: 450, y: 300, w: 150, kind: 'cache', info: 'What it is: plan B. If recommendations do not come, what do we show? A cached "popular videos" list, or hide that section. This is called a fallback.' },
      ],
      edges: [{ a: 'app', b: 'gw' }, { a: 'gw', b: 'home' }, { a: 'home', b: 'feed' }, { a: 'home', b: 'recs' }, { a: 'home', b: 'fb' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Request at the gateway', text: 'The app asks for the home screen. The gateway verifies the token, checks the rate limit, then routes.', go: 'app>gw', msg: 'GET /home   Authorization: Bearer eyJ...' },
          { title: 'Gateway → Home BFF', text: 'Route match: <code>/home</code> → Home BFF.', go: 'gw>home' },
          { title: 'Parallel calls', text: 'The BFF calls Feed and Recommendations at the same time. Both answer in ~50 ms.', parallel: true, go: ['home>feed', 'home>recs'] },
          { title: 'Answer', text: 'The BFF joins both into one response. Total ~80 ms. Threads are freed right away.', parallel: true, go: ['res:feed>home', 'res:recs>home'], after: { home: { load: 10 } } },
          { title: 'Response to the user', text: 'One round trip, the whole home screen.', go: 'res:home>gw>app' },
        ]},
        { name: 'Slow dependency, no timeout', intro: 'Recommendations takes 30 seconds on every call. The BFF code has no timeout.', steps: [
          { title: 'Recs got slow', text: 'Its database got stuck. Now every call takes 30 s.', set: { recs: { state: 'warn', sub: '30 s per call' } }, focus: ['recs'] },
          { title: 'Threads start getting stuck', text: 'Every home request\'s thread is waiting for Recs\' answer. 100 requests/second are coming, and each one is stuck for 30 s. Little\'s law: 100 × 30 = 3,000 threads needed, there are only 200.', flood: { paths: ['app>gw>home>recs'], n: 14 }, after: { home: { load: 100, state: 'hot', sub: '200/200 busy' } } },
          { title: 'Feed cannot be reached either', text: 'Feed is perfectly healthy, but the BFF does not have a single free thread to talk to it. New requests wait in a queue.', go: 'lost:gw>home', set: { feed: { state: 'dim', sub: 'healthy, but idle' } } },
          { title: 'The gateway fills up too', text: 'The gateway\'s connections are waiting for the BFF\'s answer. It is full too. Now other routes like /profile are slow as well.', set: { gw: { load: 100, state: 'hot', sub: 'connections full' } }, go: 'bad:gw>app', msg: '504 Gateway Timeout' },
          { title: 'Cascading failure', text: 'The slowness of one small, non-essential service brought the whole site down. This is called a <strong>cascading failure</strong>. And ironically, a "slow" service is more dangerous than a "down" one: a down one gives an error right away, a slow one sits holding resources.', focus: ['recs', 'home', 'gw'] },
        ]},
        { name: 'Timeout + circuit breaker + fallback', intro: 'Now the BFF puts a 300 ms timeout on every Recs call, and there is also a circuit breaker: it "opens" after 5 failures in a row.', steps: [
          { title: 'Recs is slow, but there is a timeout', text: 'The call is cut at 300 ms. The thread is busy for only 300 ms, not 30 s.', set: { recs: { state: 'warn', sub: '30 s per call' } }, go: ['app>gw>home>recs', 'bad:recs>home'], after: { home: { load: 25, sub: 'breaker: 1/5 fail' } }, msg: 'GET recs/for-user/42  → timeout after 300 ms' },
          { title: 'Failures are counted', text: 'Timeouts in a row. The breaker counts: 2, 3, 4, 5.', flood: { paths: ['home>recs'], n: 5, kind: 'bad' }, after: { home: { sub: 'breaker: 5/5 fail' } } },
          { title: 'Breaker OPEN', text: 'The threshold is reached. The circuit breaker is <strong>open</strong>: for the next 10 seconds we will not call Recs at all. It also gets time to breathe.', set: { home: { state: 'warn', sub: 'breaker: OPEN' }, recs: { state: 'dim', sub: 'no traffic (rest)' } }, focus: ['home'] },
          { title: 'Instant fallback', text: 'New home requests: Feed as normal, and instead of Recs a cached "popular videos" list (or the section is hidden). No waiting.', go: ['app>gw>home', 'home>feed', 'res:feed>home', 'home>fb', 'res:fb>home', 'res:home>gw>app'], after: { home: { load: 12 } } },
          { title: 'Graceful degradation', text: 'The user got the home page; the recommendations are just generic. 95% of the site is working. That is the goal: <strong>a bit less feature, but the site stays alive</strong>.', focus: ['app'] },
        ]},
        { name: 'Recovery: half-open', intro: 'Recs\' database got fixed. How will the breaker find out?', steps: [
          { title: 'Cool-down over', text: 'The breaker has been open for 10 seconds. Now it goes <strong>half-open</strong>: "let one or two test requests through".', set: { home: { state: 'warn', sub: 'breaker: HALF-OPEN' }, recs: { state: '', sub: 'recovered?' } }, focus: ['home'] },
          { title: 'Trial request', text: 'Only one request goes to Recs. The rest still use the fallback.', go: ['home>recs', 'res:recs>home'], msg: 'GET recs/for-user/42  → 200 OK (45 ms)' },
          { title: 'Breaker CLOSED', text: 'The trial passed. The breaker closes, the counter resets. Now all requests are normal.', set: { home: { state: 'ok', sub: 'breaker: CLOSED' }, recs: { state: 'ok', sub: 'healthy' } } },
          { title: 'Normal traffic', text: 'Personal recommendations are back. No engineer did anything. (If the trial had failed, the breaker would open again and the next cool-down would start.)', parallel: true, go: ['app>gw>home', 'home>feed', 'home>recs'] },
        ]},
        { name: 'Bulkhead', intro: 'One more protection, besides the timeout: a separate, small thread pool for Recs.', steps: [
          { title: 'Separate pools', text: 'The BFF\'s 200 threads are split: max 20 for Recs calls, Feed calls have their own pool. One full pool does not touch the other.', set: { home: { sub: 'recs pool: 20 max' } }, focus: ['home'] },
          { title: 'Recs slow, only its pool fills', text: 'Recs is stuck. Its 20 threads filled up, and extra Recs calls are rejected right away (fallback).', set: { recs: { state: 'warn', sub: '30 s per call' } }, flood: { paths: ['home>recs'], n: 6 }, after: { home: { load: 20, sub: 'recs pool: 20/20' } } },
          { title: 'Feed is completely normal', text: 'Feed calls run from their own pool. The home screen is being built (without personal recs).', go: ['app>gw>home>feed', 'res:feed>home>gw>app'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Timeouts: the first rule of every network call' },
    { type: 'p', html: `Many HTTP libraries have a very long default timeout, or none at all (meaning wait forever). So the rule: <strong>set a timeout yourself on every network call</strong>. See how much difference a timeout makes. Recs is slow (30 s), and the BFF has 200 threads:` },
    { type: 'callout', tone: 'term', title: 'New word: Timeout', html: `<strong>What it is:</strong> "if no answer comes within this time, stop waiting and move on". Like "if the phone is not picked up in 2 minutes, hang up".<br><strong>Why we need it:</strong> a thread that is waiting is useless for any other work. A timeout frees it quickly.<br><strong>Without it:</strong> one slow dependency grabs all the threads (the cascading failure above).` },
    { type: 'callout', tone: 'term', title: 'New word: Little\'s law', html: `<strong>What it is:</strong> a simple formula: how many requests are "inside" at once = arrival rate × how long each request stays.<br><strong>Why we need it:</strong> it tells you how fast slowness eats the pool.<br><strong>Example:</strong> 100 requests/s × 0.05 s = only 5 threads busy. 100 requests/s × 30 s = 3,000 threads busy, and the pool is only 200.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Home requests per second</label><input class="re-t-rps" type="number" value="100" min="1" step="10"></div>
          <div><label>BFF thread pool size</label><input class="re-t-pool" type="number" value="200" min="1" step="10"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px"><span style="font-size:14px;color:var(--ink-2)">Timeout for the Recs call:</span><span class="re-t-to" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="height:16px;background:var(--surface-2);border-radius:8px;overflow:hidden;margin:14px 0 4px"><div class="re-t-bar" style="height:100%;transition:width .3s"></div></div>
        <div class="stats">
          <div class="stat"><span>Threads needed (Recs slow)</span><strong class="re-t-need"></strong></div>
          <div class="stat"><span>Pool</span><strong class="re-t-p"></strong></div>
          <div class="stat"><span>State</span><strong class="re-t-st"></strong></div>
        </div>
        <div class="calc-note re-t-note"></div>`;
      const opts = [['None', Infinity], ['5 s', 5], ['2 s', 2], ['1 s', 1], ['300 ms', 0.3]];
      let to = 0;
      const SLOW = 30, NORMAL = 0.05;
      const rpsI = el.querySelector('.re-t-rps'), poolI = el.querySelector('.re-t-pool');
      const upd = () => {
        const box = el.querySelector('.re-t-to'); box.innerHTML = '';
        opts.forEach(([n], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === to ? ' on' : ''); b.textContent = n; b.onclick = () => { to = i; upd(); }; box.appendChild(b); });
        const rps = Math.max(1, Number(rpsI.value) || 1), pool = Math.max(1, Number(poolI.value) || 1);
        const hold = Math.min(SLOW, opts[to][1]);
        const need = rps * hold;
        const pct = need / pool;
        el.querySelector('.re-t-need').textContent = Math.round(need).toLocaleString('en-IN');
        el.querySelector('.re-t-p').textContent = pool.toLocaleString('en-IN');
        const st = el.querySelector('.re-t-st');
        st.textContent = pct >= 1 ? 'POOL FULL' : pct >= 0.7 ? 'in danger' : 'fine';
        st.style.color = pct >= 1 ? 'var(--red)' : pct >= 0.7 ? 'var(--amber)' : 'var(--green)';
        const bar = el.querySelector('.re-t-bar');
        bar.style.width = Math.min(100, pct * 100).toFixed(1) + '%';
        bar.style.background = pct >= 1 ? 'var(--red)' : pct >= 0.7 ? 'var(--amber)' : 'var(--green)';
        el.querySelector('.re-t-note').textContent = pct >= 1
          ? `Every request holds a thread for ${hold} s. The pool fills up in ~${(pool / rps).toFixed(1)} s, and then Feed will not work either. (On a normal day: ${Math.round(rps * NORMAL)} threads.)`
          : `Even with slow Recs, only ${Math.round(need)} threads are busy. There is room for other requests and Feed calls. The shorter the timeout, the smaller the effect of slowness, but do not make it so short that a normal day\'s slow requests (p99.9) get cut too.`;
      };
      rpsI.addEventListener('input', upd); poolI.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `With the default numbers: with no timeout you need 3,000 threads (the pool is full in 2 s), with a 5 s timeout 500 (still full), with 2 s 200 (right at the edge), with 1 s 100, and with 300 ms just 30. The timeout value matters.` },
    { type: 'list', items: [
      '<strong>How to choose the value</strong>: look at the dependency\'s normal latency, like its p99 or p99.9 (p99.9 = the time that 999 out of 1,000 requests are faster than), and add a little margin. The AWS Builders\' Library suggests the same. Recs is normally 50 ms; say its p99.9 is 250 ms, so a 300 ms timeout.',
      '<strong>Connect timeout and read timeout are separate</strong>: one for making the connection (short, like 100 ms) and one for the answer.',
      '<strong>Deadline propagation</strong>: if the user has 1 s in total, give each call below only the time that is left. gRPC passes deadlines along, so a service below does not work hard on something whose answer nobody will listen to any more.',
    ]},

    { type: 'h2', text: 'Retries, exponential backoff and jitter' },
    { type: 'p', html: `What comes after a timeout? Many failures last only a moment (a packet dropped, an instance was restarting). One more try often works. But a retry is a weapon that can backfire. Three rules:` },
    { type: 'list', ordered: true, items: [
      '<strong>Retry only on transient (short-lived) errors</strong>: timeout, connection reset, 503, 429 (with Retry-After). Never on 400/401/404: the request itself is wrong.',
      '<strong>The operation must be idempotent</strong> (idempotent = doing it twice or once gives the same result): GET is safe. Retry a POST like "Pay ₹500" only when there is an idempotency key (the Pagination and idempotency lesson). Otherwise a retry after a timeout = paying twice.',
      '<strong>Wait before retrying, and everyone at different times</strong>: that is backoff and jitter.',
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Exponential backoff', html: `<strong>What it is:</strong> after every failure, the wait doubles: 0.5 s, 1 s, 2 s, 4 s... up to a cap (like 16 s). Formula: <code>wait = min(cap, base × 2^attempt)</code>.<br><strong>Why we need it:</strong> it gives the sick service time to breathe. The more times it fails, the longer you wait.<br><strong>Without it:</strong> a retry every 100 ms = a hammer on the sick service.` },
    { type: 'callout', tone: 'term', title: 'New word: Jitter', html: `<strong>What it is:</strong> a little randomness in the wait. With "full jitter", <code>wait = random(0, min(cap, base × 2^attempt))</code>.<br><strong>Why we need it:</strong> thousands of clients that failed together will, without jitter, retry together too (just later). Jitter spreads them out over time.<br><strong>Without it:</strong> waves of retries, each wave bigger than the capacity.<br><strong>Example (base 0.5 s, cap 16 s):</strong> after the third failure the backoff = 0.5 × 2² = 2 s; with full jitter, any random time between 0 and 2 s, like 0.7 s or 1.6 s. These formulas became famous from a 2015 post by AWS\'s Marc Brooker.` },
    { type: 'p', html: `Why does it matter? Imagine xyz.com\'s Feed service went down for 10 seconds. The requests of 1,000 app clients fail, and all of them retry. The service comes back and can handle 200 requests/second. Run all three strategies:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Strategy:</span><span class="re-r-m" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px"><span style="font-size:14px;color:var(--ink-2)">Clients:</span><span class="re-r-n" style="display:flex;flex-wrap:wrap;gap:6px"></span><span style="font-size:14px;color:var(--ink-2);margin-left:6px">Outage:</span><span class="re-r-o" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <svg class="re-r-svg" viewBox="0 0 640 230" style="width:100%;height:auto;margin-top:12px;display:block" role="img" aria-label="Requests per second over 60 seconds"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--ink-2)"><span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px"></span> served</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--red);border-radius:2px"></span> fail / reject</span><span><span style="display:inline-block;width:14px;border-top:2px dashed var(--ink-2)"></span> capacity 200/s</span></div>
        <div class="stats">
          <div class="stat"><span>Total requests</span><strong class="re-r-tot"></strong></div>
          <div class="stat"><span>Peak req/s</span><strong class="re-r-pk"></strong></div>
          <div class="stat"><span>All clients served</span><strong class="re-r-fin"></strong></div>
          <div class="stat"><span>Still waiting at 60 s</span><strong class="re-r-left"></strong></div>
        </div>
        <div class="calc-note re-r-note"></div>`;
      const MODES = { none: 'No backoff (every 100 ms)', exp: 'Exponential backoff', jitter: 'Exponential + full jitter' };
      let mode = 'none', N = 1000, OUT = 10;
      const CAP = 200, DUR = 60, TICK = 0.1, BASE = 0.5, MAXW = 16, REJ = 0.1;
      const sim = () => {
        let seed = 99;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const ticks = Math.round(DUR / TICK), perTick = CAP * TICK;
        const next = [], att = [], done = new Array(N).fill(false);
        for (let i = 0; i < N; i++) { next.push(Math.floor(rnd() * 10)); att.push(0); }
        const perSec = new Array(DUR).fill(0), okSec = new Array(DUR).fill(0);
        let total = 0, finish = null;
        for (let t = 0; t < ticks; t++) {
          const now = t * TICK, who = [];
          for (let i = 0; i < N; i++) if (!done[i] && next[i] === t) who.push(i);
          for (let i = who.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = who[i]; who[i] = who[j]; who[j] = x; }
          const n = who.length;
          let serve = 0;
          if (now >= OUT && n > 0) serve = Math.min(n, n <= perTick ? n : Math.max(0, Math.floor((perTick - REJ * n) / (1 - REJ))));
          who.forEach((i, idx) => {
            total++; perSec[Math.floor(now)]++;
            if (idx < serve) { done[i] = true; okSec[Math.floor(now)]++; return; }
            att[i]++;
            let w;
            if (mode === 'none') w = 0.1;
            else { const e = Math.min(MAXW, BASE * Math.pow(2, att[i] - 1)); w = mode === 'exp' ? e : rnd() * e; }
            next[i] = t + Math.max(1, Math.round(w / TICK));
          });
          if (finish === null && done.every(x => x)) finish = now + TICK;
        }
        return { total, finish, perSec, okSec, left: done.filter(x => !x).length };
      };
      const chips = (sel, map, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (String(get()) === k ? ' on' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); });
      };
      const run = () => {
        chips('.re-r-m', MODES, () => mode, k => mode = k);
        chips('.re-r-n', { 500: '500', 1000: '1,000', 3000: '3,000' }, () => N, k => N = Number(k));
        chips('.re-r-o', { 5: '5 s', 10: '10 s', 20: '20 s' }, () => OUT, k => OUT = Number(k));
        const r = sim();
        const peak = Math.max(...r.perSec);
        const ymax = Math.max(peak, CAP * 1.5);
        const X0 = 44, X1 = 632, Y0 = 10, Y1 = 196, bw = (X1 - X0) / DUR;
        const y = v => Y1 - (v / ymax) * (Y1 - Y0);
        let s = `<line x1="${X0}" y1="${Y1}" x2="${X1}" y2="${Y1}" stroke="var(--line-2)"/>`;
        s += `<rect x="${X0}" y="${Y0}" width="${OUT * bw}" height="${Y1 - Y0}" fill="var(--surface-2)"/>`;
        s += `<text x="${X0 + 4}" y="${Y0 + 14}" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">outage</text>`;
        r.perSec.forEach((v, i) => {
          const ok = r.okSec[i], badv = v - ok, x = X0 + i * bw + 1, w = Math.max(1, bw - 2);
          if (ok) s += `<rect x="${x}" y="${y(ok)}" width="${w}" height="${Y1 - y(ok)}" fill="var(--green)"/>`;
          if (badv) s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${y(ok) - y(v)}" fill="var(--red)" opacity="0.85"/>`;
        });
        s += `<line x1="${X0}" y1="${y(CAP)}" x2="${X1}" y2="${y(CAP)}" stroke="var(--ink-2)" stroke-dasharray="5 4"/>`;
        [0, ymax / 2, ymax].forEach(v => { s += `<text x="${X0 - 6}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="var(--ink-3)" font-family="var(--f-mono)">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</text>`; });
        [0, 10, 20, 30, 40, 50, 60].forEach(t => { s += `<text x="${X0 + t * bw}" y="${Y1 + 16}" font-size="11" text-anchor="middle" fill="var(--ink-3)" font-family="var(--f-mono)">${t}s</text>`; });
        el.querySelector('.re-r-svg').innerHTML = s;
        el.querySelector('.re-r-tot').textContent = r.total.toLocaleString('en-IN');
        el.querySelector('.re-r-pk').textContent = peak.toLocaleString('en-IN') + '/s';
        el.querySelector('.re-r-fin').textContent = r.finish === null ? 'not within 60 s' : r.finish.toFixed(1) + ' s';
        el.querySelector('.re-r-left').textContent = r.left.toLocaleString('en-IN');
        const notes = {
          none: 'Retry storm. Clients send many times more requests than the capacity, the server spends all its time rejecting, and even after coming back the service cannot serve anyone. The outage is over, but the site is still "down".',
          exp: 'The load dropped, but all clients retry to the same rhythm: waves come. Each wave is bigger than the capacity, so most fail, and the next wave is even further away. Many people are still waiting.',
          jitter: 'Randomness spread the retries out over time. After recovery the load stays near capacity, no waves, and everyone is done fastest and with the fewest requests.',
        };
        el.querySelector('.re-r-note').textContent = notes[mode] + ' (Model: the server serves 200 req/s; every reject also eats a little CPU, 1/10 of a serve. Seeded, the same result every time.)';
      };
      run();
    }},
    { type: 'p', html: `With the default setting (1,000 clients, 10 s outage): <strong>no backoff</strong> sends 10,000 req/s, and even after 60 s the server cannot serve a single client, because all its capacity goes into rejections. <strong>Exponential</strong> sends ~7,700 requests, but because of the synchronised waves ~650 clients are still stuck at 60 s. <strong>Full jitter</strong> serves everyone by ~26 s, with ~6,900 requests. With 3,000 clients the difference looks even bigger.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion', html: `"We added exponential backoff, job done." Without jitter, clients that failed together will retry together, just further apart. Jitter is the part that separates them. And after an outage, the worst moment is exactly when the service comes back.` },

    { type: 'h3', text: 'Retry storms and retry budgets' },
    { type: 'p', html: `Retries multiply across layers. App → Gateway → BFF → Recs, and every layer does 3 retries (that is, 4 attempts). At the bottom, one user request can reach Recs as 4 × 4 × 4 = <strong>64 attempts</strong>, right when Recs is already sick. This is called a <strong>retry storm</strong>.` },
    { type: 'list', items: [
      '<strong>Only one layer retries</strong>: the Google SRE book\'s advice, usually the layer right above the failing service. The other layers pass the error up.',
      '<strong>A per-request limit</strong>: in the SRE book\'s example, at most 3 attempts; if you hit an overloaded server three times, the fourth time will probably be the same.',
      '<strong>Retry budget</strong>: the client tracks what % of its requests are retries, and stops retrying above a ratio (10% in the SRE book). Then even on a bad day the load grows only to ~1.1x, not ~3x. AWS SDKs also limit retries with a token bucket.',
    ]},

    { type: 'h2', text: 'Circuit breaker' },
    { type: 'p', html: `A timeout makes every call short, but if Recs is sick for a full 10 minutes, every call still wastes 300 ms and adds load to the sick service. Better: after some failures, <strong>stop calling it at all</strong>, for a while.` },
    { type: 'callout', tone: 'term', title: 'New word: Circuit breaker', html: `<strong>What it is:</strong> like the electric breaker (MCB) in a house: when something goes very wrong, the switch trips by itself. In software, a wrapper that watches the calls to a dependency, and after many failures stops the calls for a while.<br><strong>Why we need it:</strong> to keep calling a sick service = a wasted timeout on every call + more load on it.<br><strong>Without it:</strong> every request keeps eating a 300 ms (or 1 s) timeout, for the whole outage.<br><strong>Three states:</strong><br><strong>Closed</strong>: normal, calls go through, failures are counted.<br><strong>Open</strong>: failures crossed the threshold. Calls fail at once without being sent (fallback). A cool-down timer runs.<br><strong>Half-open</strong>: after the cool-down, let a few trial calls through. Pass = closed. Fail = open again.<br>It became famous from Michael Nygard\'s book <em>Release It!</em>, and Martin Fowler\'s article explains it simply.` },
    { type: 'p', html: `Run it yourself. Each request = 1 second. Make the dependency healthy/failing, send requests, or run the scripted outage (8 s healthy, 14 s failing, then healthy):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Failure threshold: <strong class="re-c-thv"></strong> failures in a row</label><input class="re-c-th" type="range" min="2" max="10" step="1" value="5"></div>
          <div><label>Open cool-down: <strong class="re-c-cdv"></strong></label><input class="re-c-cd" type="range" min="2" max="15" step="1" value="5"></div>
        </div>
        <div class="re-c-states" style="display:flex;flex-wrap:wrap;gap:8px;margin:14px 0"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span style="font-size:14px;color:var(--ink-2)">Recs service:</span><span class="re-c-dep" style="display:flex;flex-wrap:wrap;gap:6px"></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary re-c-one">Send 1 request</button>
          <button type="button" class="btn small ghost re-c-five">5 requests</button>
          <button type="button" class="btn small ghost re-c-script">Scripted outage</button>
          <button type="button" class="btn small ghost re-c-reset">Reset</button>
        </div>
        <div class="re-c-log" style="font:12.5px var(--f-mono);margin-top:12px;max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface-2);padding:8px"></div>
        <div class="stats">
          <div class="stat"><span>Calls to Recs</span><strong class="re-c-calls"></strong></div>
          <div class="stat"><span>Fast fail → fallback</span><strong class="re-c-fast"></strong></div>
          <div class="stat"><span>Wasted on timeouts</span><strong class="re-c-waste"></strong></div>
          <div class="stat"><span>Waste without a breaker</span><strong class="re-c-nob"></strong></div>
        </div>
        <div class="calc-note">Each failing call is cut at a 1 s timeout. In half-open, 1 trial call goes through. In open, no call is sent at all: instant fallback (0 ms).</div>`;
      const th = el.querySelector('.re-c-th'), cd = el.querySelector('.re-c-cd');
      let S;
      const reset = () => { S = { t: 0, state: 'closed', fails: 0, openedAt: 0, healthy: true, calls: 0, fast: 0, waste: 0, nob: 0, log: [] }; draw(); };
      const send = () => {
        S.t++;
        const thr = Number(th.value), cool = Number(cd.value);
        let line;
        if (S.state === 'open' && S.t - S.openedAt >= cool) S.state = 'half';
        if (!S.healthy) S.nob++;
        if (S.state === 'open') { S.fast++; line = ['open', 'OPEN → call not sent, fallback (0 ms)']; }
        else {
          S.calls++;
          const wasHalf = S.state === 'half';
          if (S.healthy) {
            S.fails = 0;
            if (wasHalf) { S.state = 'closed'; line = ['ok', 'HALF-OPEN trial → OK (45 ms) → CLOSED']; }
            else line = ['ok', 'CLOSED → OK (45 ms)'];
          } else {
            S.waste++;
            if (wasHalf) { S.state = 'open'; S.openedAt = S.t; line = ['bad', 'HALF-OPEN trial → TIMEOUT (1 s) → OPEN again']; }
            else {
              S.fails++;
              if (S.fails >= thr) { S.state = 'open'; S.openedAt = S.t; line = ['bad', `CLOSED → TIMEOUT (1 s), ${S.fails}/${thr} → OPEN`]; S.fails = 0; }
              else line = ['bad', `CLOSED → TIMEOUT (1 s), ${S.fails}/${thr}`];
            }
          }
        }
        S.log.push([S.t, S.healthy, line]);
      };
      const draw = () => {
        el.querySelector('.re-c-thv').textContent = th.value;
        el.querySelector('.re-c-cdv').textContent = cd.value + ' s';
        const names = { closed: ['Closed', 'calls go through'], open: ['Open', 'instant fallback'], half: ['Half-open', 'one trial call'] };
        el.querySelector('.re-c-states').innerHTML = Object.entries(names).map(([k, [n, d]]) => {
          const on = S.state === k;
          const col = k === 'closed' ? 'var(--green)' : k === 'open' ? 'var(--red)' : 'var(--amber)';
          return `<div style="flex:1 1 90px;padding:10px;border-radius:var(--r);border:2px solid ${on ? col : 'var(--line)'};background:${on ? 'var(--surface)' : 'var(--surface-2)'};opacity:${on ? 1 : 0.6}"><strong style="font-family:var(--f-display);color:${on ? col : 'var(--ink-2)'}">${n}</strong><div style="font-size:12.5px;color:var(--ink-3)">${d}</div></div>`;
        }).join('');
        const dep = el.querySelector('.re-c-dep'); dep.innerHTML = '';
        [[true, 'Healthy'], [false, 'Failing (timeouts)']].forEach(([v, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.healthy === v ? ' on' : ''); b.textContent = n; b.onclick = () => { S.healthy = v; draw(); }; dep.appendChild(b); });
        el.querySelector('.re-c-log').innerHTML = S.log.length ? S.log.slice().reverse().map(([t, h, [k, txt]]) => `<div style="padding:2px 0;color:${k === 'ok' ? 'var(--green)' : k === 'bad' ? 'var(--red)' : 'var(--amber)'}">t=${String(t).padStart(2, ' ')}s  [Recs ${h ? 'healthy' : 'failing'}]  ${txt}</div>`).join('') : '<div style="color:var(--ink-3)">No requests yet. Press "Send 1 request" or "Scripted outage".</div>';
        el.querySelector('.re-c-calls').textContent = String(S.calls);
        el.querySelector('.re-c-fast').textContent = String(S.fast);
        el.querySelector('.re-c-waste').textContent = S.waste + ' s';
        el.querySelector('.re-c-nob').textContent = S.nob + ' s';
      };
      el.querySelector('.re-c-one').onclick = () => { send(); draw(); };
      el.querySelector('.re-c-five').onclick = () => { for (let i = 0; i < 5; i++) send(); draw(); };
      el.querySelector('.re-c-script').onclick = () => {
        reset();
        for (let i = 1; i <= 30; i++) { S.healthy = !(i >= 9 && i <= 22); send(); }
        draw();
      };
      el.querySelector('.re-c-reset').onclick = reset;
      th.addEventListener('input', draw); cd.addEventListener('input', draw);
      reset();
    }},
    { type: 'p', html: `With the default settings (threshold 5, cool-down 5 s), the scripted outage: in 14 failing seconds, without a breaker, 14 s would be wasted on timeouts. With the breaker, only 6 s: first 5 failures, then one failed trial (t=18). The 8 requests in between got the fallback right away, and at t=23 the trial passed and the breaker closed. Change the threshold and cool-down: a small threshold protects sooner, but can also open on one or two random errors.` },
    { type: 'list', items: [
      '<strong>The threshold</strong> in real libraries is often not "N failures in a row" but "failure rate > 50% in the last X calls or last 10 s", with a minimum number of calls (libraries like resilience4j). Netflix\'s Hystrix library made this pattern popular; it is now in maintenance mode, and alternatives like resilience4j are used.',
      '<strong>One breaker per dependency</strong> (or per dependency + endpoint), not one for the whole app.',
      '<strong>Monitor the breaker\'s state</strong>: a breaker opening is an alarm that something is wrong.',
    ]},

    { type: 'h2', text: 'Bulkhead' },
    { type: 'callout', tone: 'term', title: 'New word: Bulkhead', html: `<strong>What it is:</strong> the walls inside a ship that split it into separate compartments: if water fills one part, the rest of the ship does not sink. In software: <strong>separate, limited resources for each dependency</strong> (a thread pool, a connection pool, or a semaphore).<br><strong>Why we need it:</strong> even with a timeout, a slow dependency under heavy traffic can still hold many threads. A bulkhead puts a limit on it.<br><strong>Without it:</strong> one dependency\'s problem fills the whole shared pool.<br><strong>Example:</strong> max 20 concurrent calls for Recs, its own 30 for Payments. One dependency\'s problem fills only its own compartment.` },
    { type: 'p', html: `See for yourself. The BFF has 200 threads, 100 home requests/second, and each request calls both Feed (50 ms) and Recs. Make Recs slower, and turn the bulkhead on/off:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Recs answer time: <strong class="re-k-sv"></strong></label><input class="re-k-s" type="range" min="0" max="6" step="1" value="5"></div>
          <div><label>Recs bulkhead (max threads): <strong class="re-k-cv"></strong></label><input class="re-k-c" type="range" min="0" max="60" step="5" value="20"></div>
        </div>
        <div class="re-k-bars" style="margin-top:12px;display:grid;gap:8px"></div>
        <div class="stats">
          <div class="stat"><span>Threads left for Feed</span><strong class="re-k-free"></strong></div>
          <div class="stat"><span>Home page</span><strong class="re-k-st"></strong></div>
        </div>
        <div class="calc-note re-k-note"></div>`;
      const LAT = [0.05, 0.3, 1, 2, 5, 10, 30], POOL = 200, RPS = 100, FEED = 0.05;
      const sE = el.querySelector('.re-k-s'), cE = el.querySelector('.re-k-c');
      const bar = (label, used, max, col) => `<div><div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-2)"><span>${label}</span><span>${Math.round(used)} / ${max}</span></div><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100, used / max * 100).toFixed(1)}%;background:${col}"></div></div></div>`;
      const upd = () => {
        const lat = LAT[+sE.value], cap = +cE.value, wantRecs = RPS * lat, feedNeed = RPS * FEED;
        const recsUsed = cap > 0 ? Math.min(cap, wantRecs) : Math.min(POOL, wantRecs);
        const free = POOL - recsUsed, ok = free >= feedNeed;
        el.querySelector('.re-k-sv').textContent = lat < 1 ? Math.round(lat * 1000) + ' ms' : lat + ' s';
        el.querySelector('.re-k-cv').textContent = cap > 0 ? cap : 'off (shared pool)';
        el.querySelector('.re-k-bars').innerHTML = bar('Threads held by Recs', recsUsed, cap > 0 ? cap : POOL, wantRecs > (cap || POOL) ? 'var(--red)' : 'var(--amber)') + bar('Busy in the whole pool (200)', recsUsed + Math.min(free, feedNeed), POOL, ok ? 'var(--green)' : 'var(--red)');
        el.querySelector('.re-k-free').textContent = Math.round(free) + ' (Feed needs ' + feedNeed + ')';
        const st = el.querySelector('.re-k-st');
        st.textContent = ok ? (wantRecs > recsUsed ? 'working (recs = fallback)' : 'normal') : 'STUCK (pool full)';
        st.style.color = ok ? 'var(--green)' : 'var(--red)';
        el.querySelector('.re-k-note').textContent = `Recs wants: 100/s × ${lat} s = ${Math.round(wantRecs)} threads (Little's law). ${cap > 0 ? `The bulkhead stopped it at ${cap}; the other Recs calls get the fallback right away.` : 'No bulkhead: Recs can take as many threads as it wants.'} Feed needs only ${feedNeed} threads, and it ${ok ? 'got them' : 'did not get them'}.`;
      };
      sE.addEventListener('input', upd); cE.addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `The "Bulkhead" scenario in the diagram shows exactly this. Bulkheads also exist at a bigger level: separate servers for premium users, or a separate "cell" for each big customer (cell-based architecture), so one customer\'s problem does not spread to everyone. The price: once resources are split, sometimes one pool sits empty while another is full, so total utilization is a bit lower.` },

    { type: 'h2', text: 'Sidecar and service mesh' },
    { type: 'p', html: `All the patterns so far (timeouts, retries, breaker, discovery, mTLS, metrics) are needed in the code of every service. xyz.com's services are in Java, Go, Python and Node. The same logic, the same bugs, in every language? There is another way.` },
    { type: 'callout', tone: 'term', title: 'New word: Sidecar', html: `<strong>What it is:</strong> a small proxy that runs next to each service instance (in Kubernetes, in the same pod), usually <strong>Envoy</strong>. All the service\'s incoming and outgoing network calls pass through this proxy. Like a sidecar attached to a motorcycle: it rides along, but it is separate.<br><strong>Why we need it:</strong> the proxy does retries, timeouts, circuit breaking, load balancing, mTLS encryption and metrics, and the app code does not even know. No need to write this logic again in every language.<br><strong>Without it:</strong> Java, Go, Python, Node: every service with its own library, its own bugs, different settings.` },
    { type: 'callout', tone: 'term', title: 'New word: Service mesh and control plane', html: `<strong>What it is:</strong> a service mesh = the network of all the sidecars + a <strong>control plane</strong> that sends config to all of them from one place ("timeout 300 ms for Recs, 2 retries").<br><strong>Why we need it:</strong> the platform team changes a policy in one place, and it applies to 200 services.<br><strong>Without it:</strong> every team would have to change the setting in its service and deploy.<br><strong>Example:</strong> <strong>Istio</strong> (based on Envoy), Linkerd. <strong>mTLS</strong> = an encrypted connection with certificates on both sides, so services also check each other\'s identity.` },
    { type: 'ascii', text: `
   ┌──────── Pod: Home BFF ────────┐        ┌──────── Pod: Recs ─────────┐
   │  app code  ──localhost──> Envoy ───mTLS───> Envoy ──> app code        │
   └───────────────────────────────┘        └────────────────────────────┘
                     ^  config (timeouts, retries, routes, certs)  ^
                     └──────────── Istio control plane ────────────┘`, caption: 'Sidecar proxies, configured by the control plane' },
    { type: 'compare',
      left: { title: 'When it helps', html: `• Many services, many languages<br>• You need mTLS and the same observability everywhere<br>• The platform team wants to keep policies central` },
      right: { title: 'When not / the price', html: `• 5-10 services, one language: one good library is enough<br>• Two extra proxy hops on every call (latency, CPU, memory)<br>• The mesh itself is hard to learn and run<br>• Istio\'s newer "ambient" mode also runs without a per-pod sidecar, to lower this very cost` },
    },
    { type: 'p', html: `A mesh is not free. Every call passes through two proxies (the sender\'s and the receiver\'s). The longer the call chain, the higher the price. Measure the proxy overhead in your own setup and put it in; the number below is only an example. And see what happens when there are retries both in the app and in the mesh:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Services in the call chain: <strong class="re-m-dv"></strong></label><input class="re-m-d" type="range" min="1" max="6" step="1" value="3"></div>
          <div><label>Overhead of one proxy hop: <strong class="re-m-ov"></strong></label><input class="re-m-o" type="range" min="1" max="30" step="1" value="5"></div>
          <div><label>Retries in app code: <strong class="re-m-av"></strong></label><input class="re-m-a" type="range" min="0" max="3" step="1" value="2"></div>
          <div><label>Retries in the mesh: <strong class="re-m-mv"></strong></label><input class="re-m-m" type="range" min="0" max="3" step="1" value="2"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Proxy hops (one request)</span><strong class="re-m-h"></strong></div>
          <div class="stat"><span>Extra latency</span><strong class="re-m-l"></strong></div>
          <div class="stat"><span>Attempts for one failing call</span><strong class="re-m-x"></strong></div>
        </div>
        <div class="calc-note re-m-note"></div>`;
      const q = c => el.querySelector(c);
      const upd = () => {
        const d = +q('.re-m-d').value, o = +q('.re-m-o').value / 10, a = +q('.re-m-a').value, m = +q('.re-m-m').value;
        const hops = 2 * d, att = (1 + a) * (1 + m);
        q('.re-m-dv').textContent = d; q('.re-m-ov').textContent = o.toFixed(1) + ' ms'; q('.re-m-av').textContent = a; q('.re-m-mv').textContent = m;
        q('.re-m-h').textContent = hops;
        q('.re-m-l').textContent = '+' + (hops * o).toFixed(1) + ' ms';
        const x = q('.re-m-x'); x.textContent = att; x.style.color = att > 3 ? 'var(--red)' : 'var(--ink)';
        q('.re-m-note').textContent = `A chain of ${d} services = ${hops} proxy hops (2 per call). Retries: the app's ${a} and the mesh's ${m} multiply: (1 + ${a}) × (1 + ${m}) = ${att} attempts for one single failing call. ${att > 3 ? 'Keep retries in one place (usually in the mesh or in the app, not both).' : 'Fine: retries come from only one place.'}`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', html: `Retries are turned on in the mesh <em>and</em> the app code has retries too? Now every layer retries: the same retry storm. Configure retries in one place only, and make sure that place understands idempotency.` },

    { type: 'h2', text: 'Graceful degradation and fallbacks' },
    { type: 'p', html: `The breaker stopped the call. Now what do we show the user? That is the <strong>fallback</strong>, and this behaviour of the whole system, where the site runs "a bit less" but still runs when something breaks, is <strong>graceful degradation</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Graceful degradation', html: `<strong>What it is:</strong> when something breaks, the site runs "a bit less", but it runs. Like when power is low, only the important lights stay on and the fan goes off.<br><strong>Why we need it:</strong> out of 10 services, some service will be sick now and then. Showing the user an error page every time is bad.<br><strong>Without it:</strong> comments service down = the whole video page down.<br><strong>Example:</strong> use the toggles below to break services and see how the page changes.` },
    { type: 'custom', render(el) {
      const DEPS = [['video', 'Video player / CDN', true, 'The video cannot play: this is critical, there is no fallback'], ['recs', 'Recommendations', false, 'Generic "popular videos" (cached)'], ['comments', 'Comments', false, '"Comments did not load right now, please try later"'], ['likes', 'Like counter', false, 'Count hidden, the Like button still works (queued)'], ['notif', 'Notifications', false, 'No count on the bell; events wait in a queue for later'], ['upload', 'Upload (DB primary)', false, 'Read-only mode: watching works, upload is off for a while']];
      const down = new Set();
      el.innerHTML = `<label>Which service is down? (click)</label><div class="re-d-t" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="re-d-page" style="margin-top:12px;border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface);display:grid;gap:6px"></div>
        <div class="stats"><div class="stat"><span>State of the site</span><strong class="re-d-st"></strong></div></div>`;
      const upd = () => {
        const t = el.querySelector('.re-d-t'); t.innerHTML = '';
        DEPS.forEach(([k, n, crit]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (down.has(k) ? ' on' : ''); b.textContent = (down.has(k) ? '✗ ' : '') + n + (crit ? ' (critical)' : ''); b.onclick = () => { if (down.has(k)) down.delete(k); else down.add(k); upd(); }; t.appendChild(b); });
        el.querySelector('.re-d-page').innerHTML = DEPS.map(([k, n, crit, fb]) => `<div style="padding:6px 8px;border-radius:var(--r-sm);background:${down.has(k) ? (crit ? 'color-mix(in srgb, var(--red) 14%, var(--surface))' : 'var(--surface-2)') : 'var(--surface-2)'};font-size:14px"><strong style="color:${down.has(k) ? (crit ? 'var(--red)' : 'var(--amber)') : 'var(--green)'}">${down.has(k) ? (crit ? '✗' : '~') : '✓'} ${n}</strong>${down.has(k) ? ' : ' + fb : ' : normal'}</div>`).join('');
        const st = el.querySelector('.re-d-st');
        const critDown = DEPS.some(([k, , c]) => c && down.has(k));
        st.textContent = critDown ? 'Real outage (critical broke)' : down.size ? `Running, ${down.size} feature(s) less (degraded)` : 'All normal';
        st.style.color = critDown ? 'var(--red)' : down.size ? 'var(--amber)' : 'var(--green)';
      };
      upd();
    }},
    { type: 'table', head: ['Fallback', 'Example on xyz.com'], rows: [
      ['Cached / slightly old data', 'If personal recs are missing, show yesterday\'s cached list or "popular videos"'],
      ['Default value', 'If the like count did not come, hide the count and let the button work'],
      ['Hide the feature', 'Comments service down: the video plays, the comments section says "try later"'],
      ['Read-only mode', 'Database primary down: browsing and watching work, upload is off for a while'],
      ['Queue for later', 'Notification service down: put the event in a queue, send it later'],
      ['Load shedding', 'Under overload, answer 503 to non-essential requests (analytics, prefetch) so the essential ones work'],
    ]},
    { type: 'callout', tone: 'tip', html: `Decide up front which features are <strong>critical</strong> (video play, login, payment) and which are <strong>nice-to-have</strong> (recommendations, comment counts, "who is watching"). Always put timeout + breaker + fallback on nice-to-have dependencies. And test your fallbacks too: a fallback that has never run will be found broken on the day of the outage.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Every network call gets a timeout.</strong> Every retry needs <strong>backoff + jitter</strong>, and the operation must be <strong>idempotent</strong>. If a dependency keeps failing, a <strong>circuit breaker</strong> stops calling it and serves a fallback, like hiding recommendations instead of failing the whole page.` },
    { type: 'table', head: ['Situation', 'Pattern'], rows: [
      ['Outside clients, many services', 'API gateway (auth, rate limit, routing), with an LB in front'],
      ['Mobile and web need very different things', 'A BFF per client type'],
      ['Instance IPs keep changing', 'Service discovery (registry or DNS) + health checks'],
      ['Any remote call', 'Timeout (normal p99.9 + margin)'],
      ['Transient failure, idempotent call', 'Retry: max 2-3, exponential backoff + full jitter, at one layer only, with a retry budget'],
      ['A dependency fails again and again', 'Circuit breaker + fallback'],
      ['One dependency eats all resources', 'Bulkhead (separate pools)'],
      ['Many services, many languages', 'Sidecar / service mesh'],
    ]},

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'xyz.com\'s resilience setup: the whole picture', height: 440,
      groups: [
        { label: 'Clients', x: 10, y: 8, w: 700, h: 90 },
        { label: 'Edge', x: 10, y: 110, w: 700, h: 98 },
        { label: 'BFFs and discovery', x: 10, y: 218, w: 700, h: 104 },
        { label: 'Services', x: 10, y: 326, w: 700, h: 106 },
      ],
      nodes: [
        { id: 'mob', label: 'Mobile app', x: 200, y: 52, kind: 'client', info: 'What it is: xyz.com\'s phone app. It knows only one address: api.xyz.com (the gateway). It also uses backoff + jitter for its own retries.' },
        { id: 'web', label: 'Web app', x: 520, y: 52, kind: 'client', info: 'What it is: the site in the browser. It needs more data, so it has its own Web BFF.' },
        { id: 'gw', label: 'API Gateway', sub: 'auth · rate limit', x: 360, y: 163, w: 160, kind: 'edge', info: 'What it is: the main gate. Token check, rate limit (429), routing. Kept thin, with many copies behind an LB.' },
        { id: 'mbff', label: 'Mobile BFF', sub: 'timeout · breaker', x: 150, y: 273, w: 150, kind: 'server', info: 'What it is: the backend of the mobile home screen. A timeout on every call, a circuit breaker + bulkhead (20 threads) on Recs. A sidecar proxy (Envoy) can take these settings from the mesh.' },
        { id: 'reg', label: 'Registry', sub: 'Consul / K8s', x: 360, y: 273, w: 140, kind: 'data', info: 'What it is: the phone book of service discovery. It gives the list of healthy instances; a dead instance drops out through health checks.' },
        { id: 'wbff', label: 'Web BFF', sub: 'full details', x: 570, y: 273, w: 140, kind: 'server', info: 'What it is: the web backend. The same services, but full data shaped for the web.' },
        { id: 'feed', label: 'Feed service', sub: 'critical', x: 150, y: 383, w: 150, kind: 'server', info: 'What it is: the list of videos. Critical: no home page without it. It has its own replicas and a separate thread pool.' },
        { id: 'recs', label: 'Recs service', sub: 'nice-to-have', x: 360, y: 383, w: 150, kind: 'server', info: 'What it is: personal recommendations. Nice-to-have: if slow, the timeout cuts it; if it keeps failing, the breaker opens.' },
        { id: 'fb', label: 'Fallback', sub: 'cached popular', x: 570, y: 383, w: 150, kind: 'cache', info: 'What it is: plan B: a cached "popular videos" list. When the breaker is open, this is used right away (graceful degradation).' },
      ],
      edges: [
        { a: 'mob', b: 'gw', n: 1, label: 'GET /home' },
        { a: 'web', b: 'gw' },
        { a: 'gw', b: 'mbff', n: 2, label: 'route' },
        { a: 'gw', b: 'wbff' },
        { a: 'mbff', b: 'reg', dashed: true, label: 'lookup' },
        { a: 'wbff', b: 'reg', dashed: true },
        { a: 'mbff', b: 'feed', n: 3 },
        { a: 'mbff', b: 'recs', label: 'timeout 300 ms' },
        { a: 'mbff', b: 'fb', kind: 'bad', dashed: true, label: 'fallback' },
        { a: 'wbff', b: 'feed' },
      ],
      paths: [
        { name: 'Normal home', text: 'The gateway checked the token and the limit, and sent it to the Mobile BFF. The BFF called Feed and Recs in parallel, both within the timeout.', go: ['mob>gw>mbff>feed', 'mbff>recs'] },
        { name: 'Recs slow', text: 'Recs is cut at the timeout; after 5 failures the breaker is OPEN. Now the fallback is used instantly instead of Recs; Feed is normal. The site is alive, the recommendations are just generic.', go: ['mob>gw>mbff>feed', 'mbff>fb'] },
        { name: 'Discovery', text: 'The BFF gets the list of healthy instances from the registry (and caches it), and picks an instance itself.', go: ['mbff>reg', 'wbff>reg'] },
        { name: 'Web', text: 'The web app\'s path: the same gateway, its own Web BFF, the same Feed service.', go: ['web>gw>wbff>feed'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Microservices = function calls are now network calls: slow, failing, or no answer at all. A slow service is more dangerous than a down one (it holds threads).</li>
      <li>API gateway = one main gate: auth, rate limit, routing. Keep it thin. BFF = each client type\'s own backend.</li>
      <li>Service discovery = the address of live instances from a registry/DNS, with health checks.</li>
      <li>A timeout on every network call (p99.9 + margin). Little\'s law: threads = rate × wait.</li>
      <li>Retry only on transient errors and idempotent calls, with exponential backoff + full jitter, at one layer only, with a retry budget.</li>
      <li>Circuit breaker: closed → (failures) → open → (cool-down) → half-open → trial passes to closed, fails to open.</li>
      <li>Bulkhead = separate limited resources for each dependency. Sidecar/mesh = all this outside the app, configured in one place, but with a proxy cost on every call.</li>
      <li>Graceful degradation: decide critical vs nice-to-have up front; always have a fallback for nice-to-have, and test the fallback.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['One slow service does not bring down the whole site', 'Users never even see transient errors (safe retries)', 'After an outage the service comes back faster (jitter, rest from the breaker)', 'One clean entry point for clients, with central auth/rate limits', 'Instances can come and go, and callers do not care'],
      costs: ['Every pattern is one more config that can be set wrong (a timeout too short = your own outage)', 'Gateway, registry, mesh: all new components that need HA themselves', 'A fallback sometimes means old or generic data', 'A sidecar adds latency and resource cost on every call', 'Retries force you to think about idempotency everywhere'] },

    { type: 'think', questions: [
      { q: 'The Payments service calls a bank API. It timed out. Should it retry?', a: 'Only with an idempotency key. A timeout means "we do not know": the bank may already have taken the money. Retry or check the status with the same key. And on a critical path like payments, never use a "fake success" fallback: show the user "processing" and reconcile.' },
      { q: 'The Recs circuit breaker opens and closes every 2-3 minutes (flapping), while Recs looks fine. What will you check?', a: 'Maybe the threshold is too sensitive (with few calls, 2-3 random errors open it), or the timeout is shorter than Recs\' normal p99.9 latency, so normal slow requests are counted as failures. Use a failure-rate threshold + a minimum number of calls, and set the timeout from latency data.' },
      { q: 'The gateway, the BFF and Recs all do 3 retries each. Recs went down for 1 minute, and then did not recover for 5 more minutes. Why?', a: 'Retry amplification: one user request can become 64 attempts at the bottom. During recovery the load was so high that Recs fell again. Fix: only one layer retries, use a retry budget, backoff + jitter, and let the breaker give the sick service a rest.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why can a slow dependency be more dangerous than a down one?', options: ['A slow service sends more data', 'Slow calls hold on to threads/connections and fill up the caller\'s pool', 'A down service restarts automatically'], answer: 1, explain: 'A down service gives an error right away. A slow one holds resources if there is no timeout, and a cascading failure starts.' },
      { q: 'How is the wait computed with full jitter?', options: ['base × 2^attempt', 'random(0, min(cap, base × 2^attempt))', 'Always 1 second'], answer: 1, explain: 'A random wait within the exponential range, so all clients do not retry at the same time.' },
      { q: 'What does a circuit breaker do in the half-open state?', options: ['Blocks all calls', 'Sends a few trial calls; pass means closed, fail means open again', 'Restarts the dependency'], answer: 1, explain: 'Half-open is a recovery check. After the cool-down it tests a little traffic.' },
      { q: 'Which request is the most dangerous to retry without an idempotency key?', options: ['GET /videos/42', 'POST /payments (₹500)', 'GET /health'], answer: 1, explain: 'A timeout means "we do not know". A retry without a key can charge twice.' },
      { q: 'What is the job of a bulkhead?', options: ['To limit retries', 'To give each dependency its own limited resources, so one problem does not eat everything', 'To encrypt requests'], answer: 1, explain: 'Like a ship\'s compartments: water in one, the rest are safe.' },
      { q: 'The API gateway returned 401 for a request. What does it mean?', options: ['The service is down', 'The token is missing or expired: the user was not verified', 'The rate limit was crossed'], answer: 1, explain: '401 = authentication failed. 429 = rate limit, 404 = no route matched. The gateway did not let the request reach the service at all.' },
      { q: 'When should you build a BFF?', options: ['Always, for every app', 'When different clients (mobile, web, TV) really need different things', 'Only when there is just one web app'], answer: 1, explain: 'With only one web app, a BFF is just an extra hop. In the widget, the BFF was ~4.5 times faster for mobile, and only ~2 times for web.' },
      { q: 'The app code does 2 retries and the mesh also does 2 retries. How many attempts for one failing call?', options: ['4', '5', '9'], answer: 2, explain: '(1 + 2) × (1 + 2) = 9. Keep retries in one place.' },
    ]},
    { type: 'sources', note: 'Formulas, numbers and pattern definitions were checked with these sources. The widgets are our own simple, seeded models.', items: [
      { title: 'Exponential Backoff And Jitter', publisher: 'AWS Architecture Blog (Marc Brooker)', year: 2015, official: true, url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/', used: 'Backoff formula, Full Jitter formula, finding that jittered backoff greatly reduces total calls versus plain exponential.' },
      { title: 'Timeouts, retries, and backoff with jitter', publisher: 'Amazon Builders\' Library', official: true, url: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/', used: 'Choosing timeouts from downstream latency percentiles, retrying at a single layer, limiting retries with a token bucket, idempotency for safe retries.' },
      { title: 'CircuitBreaker', publisher: 'Martin Fowler (martinfowler.com)', year: 2014, url: 'https://martinfowler.com/bliki/CircuitBreaker.html', used: 'Closed/open/half-open behaviour, trial call after a timeout, monitoring breaker state, origin in Nygard\'s Release It!.' },
      { title: 'Handling Overload (Site Reliability Engineering book)', publisher: 'Google', official: true, url: 'https://sre.google/sre-book/handling-overload/', used: 'Per-request retry limit of 3 attempts, per-client retry budget of 10%, retrying only at the layer above the failing service, ~3x vs ~1.1x growth.' },
      { title: 'Backends For Frontends', publisher: 'Sam Newman', url: 'https://samnewman.io/patterns/architectural/bff/', used: 'One experience one BFF, owned by the UI team, aggregation, duplication risk, SoundCloud/REA origins.' },
      { title: 'Hystrix (README: status)', publisher: 'Netflix (GitHub)', official: true, url: 'https://github.com/Netflix/Hystrix', used: 'Hystrix is in maintenance mode; alternatives like resilience4j for new projects.' },
      { title: 'CircuitBreaker (resilience4j docs)', publisher: 'resilience4j', official: true, url: 'https://resilience4j.readme.io/docs/circuitbreaker', used: 'Count/time based sliding window, failure rate threshold, minimum number of calls, half-open permitted calls.' },
      { title: 'Ambient mode overview', publisher: 'Istio documentation', official: true, url: 'https://istio.io/latest/docs/ambient/overview/', used: 'A data plane without sidecars (ztunnel + waypoint), to lower the cost of sidecars.' },
    ]},
  ],
});
