Lesson.register({
  id: 'design-rate-limiter',
  title: 'Rate limiter',
  minutes: 32,
  summary: `You already learned the algorithms in the <a href="#/rate-limiting">Rate limiting</a> lesson. Now we design the full service: where the rules are written, where the limiter sits, how 50 servers keep one shared count with Redis + Lua, what to do when Redis goes down (fail-open vs fail-closed), and what happens across several regions. It is based on what Stripe, Cloudflare and Lyft/Envoy have shared publicly.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Many apps call the xyz.com API. One day, a bug in one app made it send 5,000 requests every second. Our servers got stuck on that one app, and the site became slow for every other user. We need a "guard at the door" who keeps counting each visitor: "you have come 100 times this second, please wait a little". The hard part: there are 50 doors, and every guard must see <strong>the same count</strong>, without making anyone stand in a line. This lesson builds that guard system.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: xyz.com has a public API and 50 API servers. Each API key may send up to 100 requests per second. Where will you keep the count? What will you do if the counting system goes down? Then compare with this lesson.` },

    { type: 'p', html: `This is a "build the building block yourself" interview question. You already played with the counting methods (algorithms) in the <a href="#/rate-limiting">Rate limiting</a> lesson. The real question here is: <strong>a correct count across many servers, without slowing down every request</strong>. First, let us make a few words clear.` },

    { type: 'h2', text: 'A few words first' },
    { type: 'callout', tone: 'term', title: 'Rate limiter', html: `<strong>What it is:</strong> a component that answers one question for every request: "should I let this client in right now?" It keeps a count, like "this API key sent 57 requests this second".<br><strong>Why we need it:</strong> to protect all other users from one broken or bad client, and to stop misuse of costly things (SMS, payments, login).<br><strong>Without it:</strong> one runaway script or bot makes the whole site slow, and everyone suffers.` },
    { type: 'callout', tone: 'term', title: 'API key', html: `<strong>What it is:</strong> a long secret string (like <code>key_abc</code>) that xyz.com gives to each developer. The developer's app sends it with every request.<br><strong>Why we need it:</strong> it tells us <em>whose</em> request this is, so the count goes against that developer.<br><strong>Without it:</strong> we could only count by IP address, which many people share (we will see later why that is a problem).` },
    { type: 'callout', tone: 'term', title: 'API gateway', html: `<strong>What it is:</strong> the server that every xyz.com request passes through first, like the main gate of a building. It does common jobs like login checks, routing and rate limiting, and then sends the request to the real service.<br><strong>Why we need it:</strong> common jobs happen in one place. Each service does not need to write its own guard.<br><strong>Without it:</strong> every team writes its own limiter, each with its own bugs.` },
    { type: 'callout', tone: 'term', title: 'Redis', html: `<strong>What it is:</strong> a very fast database that keeps data in RAM (memory). Reading or increasing a small count takes less than about one millisecond.<br><strong>Why we need it:</strong> 50 gateways must see one shared count. If the count lives in one gateway's memory, the other 49 never see it. Redis is the "shared notebook" that all of them write to and read from.<br><strong>Without it:</strong> each gateway counts on its own. With a limit of 100, a client could get 50 × 100 = 5,000 requests through.` },
    { type: 'callout', tone: 'term', title: '429 Too Many Requests', html: `<strong>What it is:</strong> an HTTP status code that means "you are coming too often, please wait". It often comes with a <code>Retry-After: 1</code> header: "come back after 1 second".<br><strong>Why we need it:</strong> the client program understands that the problem is its own speed, not a server failure, so it waits and tries again.<br><strong>Without it:</strong> the client would get something like a 500 (server error) and retry right away, again and again, which adds even more load.` },
    { type: 'p', html: `There are five ways to count. You saw the inside of each one (bucket level, window counters) in the widgets of the <a href="#/rate-limiting">Rate limiting</a> lesson. Here is a one-line reminder:` },
    { type: 'table', head: ['Algorithm', 'In one line', 'What it must remember per key'], rows: [
      ['Token bucket', 'Tokens drip into a bucket at a fixed speed; each request takes one token; empty bucket = 429. Small bursts are allowed.', '2 numbers: tokens, time of last refill'],
      ['Leaky bucket', 'Requests wait in a line and leave at a fixed speed; if the line is full, the new request is dropped.', 'One queue (or one level number)'],
      ['Fixed window counter', 'A new counter every minute; over the limit = 429. At the edge of a minute, a 2× burst can slip through.', '1 counter per window'],
      ['Sliding window log', 'Remember the time of every request; the count for the last 60 seconds is exact.', 'A timestamp for every request (costly)'],
      ['Sliding window counter', 'Estimate from the previous and current window counters; smooth and cheap.', '2 numbers'],
    ]},
    { type: 'p', html: `Three real systems form the backbone of this lesson. All three have publicly explained how they built it:` },
    { type: 'list', items: [
      `<strong>Stripe</strong> (an online payments company whose API developers call): in a 2017 engineering post, they described their four limiters, the token bucket, and their use of Redis. The post is old (2017), but the ideas are still standard today.`,
      `<strong>Cloudflare</strong> (a CDN that sits in front of millions of websites): in 2017 they wrote why they chose an estimate (approximation) of the sliding window, and why they kept a separate count in each data center.`,
      `<strong>Lyft's ratelimit service</strong>: Lyft (a US ride app) built a separate rate limit service for a proxy called Envoy and made it open source (now envoyproxy/ratelimit). Rules live in a config file, counts live in Redis.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Envoy (proxy)', html: `<strong>What it is:</strong> an open-source <em>proxy</em>: a program that sits between the client and the real server and passes every request along. An API gateway is often built from a proxy like Envoy. (The full story of proxies is in the <a href="#/proxies">Proxies</a> lesson.)<br><strong>Why we need it:</strong> it sees every request, so it is the right place to ask "should I let this in?"<br><strong>Without it:</strong> every app would have to call the limiter itself.` },
    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Rules: per user, per IP, per API key, per endpoint (and combinations of these)<br>• Over the limit: <code>429 Too Many Requests</code> + <code>Retry-After</code><br>• Rules can change without a code deploy<br>• A "only watch, do not block" mode (to test a new rule)<br><br><strong>Out of scope:</strong> billing, invoices for monthly quotas` },
      right: { title: 'Non-functional', html: `• Add very little latency to each request (~1 ms)<br>• The limiter itself must not become a SPOF (single point of failure: the one part that, if it falls, takes everything down)<br>• The count across 50+ servers is roughly right (a little wrong is fine, very wrong is not)<br>• Scale to millions of keys and millions of requests per second` },
    },
    { type: 'callout', tone: 'term', title: 'Rate limiter service', html: `<strong>What it is:</strong> make the rate limiter a <em>separate small service</em>. The gateway asks it "allow?" on every request, and it answers "OK" or "OVER_LIMIT". It does no business work, and it keeps the count in Redis, not in itself.<br><strong>Why we need it:</strong> all the logic for rules and counting is in one place. All services (videos, payments, search) use the same guard.<br><strong>Without it:</strong> a copy of the limiter inside every service, each a bit different, and one bug fix means deploying every service again.` },
    { type: 'callout', tone: 'why', title: 'A little wrong is fine?', html: `Yes, and this is a big design decision. If the limit is 100/s and sometimes 103 get through, nobody is harmed. But an "exactly right" count on every request would force every server to take a lock from one central place each time: slow and fragile. So real systems choose <strong>roughly correct, but very fast</strong>. Cloudflare measured the error of their estimate and published it (we will see it later).` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `These numbers are "let us assume" numbers, not from any company. They tell us how big Redis needs to be. Two new words appear in the widget, so learn them first:` },
    { type: 'callout', tone: 'term', title: 'Shard and replica (in Redis)', html: `<strong>What it is:</strong> a <em>shard</em> is one part of the data, on a separate Redis machine. 4 shards means the keys are split across 4 machines, and each machine keeps only its own part of the counts. A <em>replica</em> is a backup copy of a shard, on another machine.<br><strong>Why we need it:</strong> one Redis machine can do only so much work per second. If traffic is higher, we must split the work (shards). And if a machine fails, we need a backup (replica).<br><strong>Without it:</strong> all the load is on one machine, it fills up and slows down; and if it fails, all counts are gone.` },
    { type: 'p', html: `A "Lua call" here just means: sending Redis a tiny program that reads the count, checks it and increases it (details in Deep dive 2). Every request makes one such call for every rule. Change the values and see:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Peak requests/second (thousands): <strong class="rln-qv"></strong></label><input class="rln-q" type="range" min="5" max="500" step="5" value="50"></div>
          <div><label>Active keys (millions): <strong class="rln-kv"></strong></label><input class="rln-k" type="range" min="1" max="100" step="1" value="10"></div>
          <div><label>Rules checked per request: <strong class="rln-rv"></strong></label><input class="rln-r" type="range" min="1" max="4" step="1" value="2"></div>
          <div><label>Lua calls/s one Redis shard can do (assumed): <strong class="rln-sv"></strong></label><input class="rln-s" type="range" min="20" max="150" step="10" value="50"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Redis script calls/s</span><strong class="rln-ops"></strong></div>
          <div class="stat"><span>Memory for counters</span><strong class="rln-mem"></strong></div>
          <div class="stat"><span>Primary shards needed</span><strong class="rln-sh"></strong></div>
          <div class="stat"><span>Nodes with replicas</span><strong class="rln-nodes"></strong></div>
        </div>
        <div class="calc-note rln-note"></div>`;
      const q = s => el.querySelector(s);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(Math.round(n));
      const upd = () => {
        const rps = +q('.rln-q').value * 1000, keys = +q('.rln-k').value * 1e6, rules = +q('.rln-r').value, shardCap = +q('.rln-s').value * 1000;
        q('.rln-qv').textContent = f(rps); q('.rln-kv').textContent = q('.rln-k').value + 'M'; q('.rln-rv').textContent = rules; q('.rln-sv').textContent = f(shardCap);
        const ops = rps * rules;
        const memGB = keys * rules * 100 / 1e9;
        const shards = Math.max(1, Math.ceil(ops / (shardCap * 0.6)));
        q('.rln-ops').textContent = f(ops) + '/s';
        q('.rln-mem').textContent = memGB < 1 ? (memGB * 1000).toFixed(0) + ' MB' : memGB.toFixed(1) + ' GB';
        q('.rln-sh').textContent = shards;
        q('.rln-nodes').textContent = shards * 2;
        q('.rln-note').textContent = `We assumed ~100 bytes per counter (key name + two numbers + Redis overhead). We plan to fill each shard only to 60%, to leave room for spikes and failover. Memory ${memGB.toFixed(1)} GB` + (memGB < 10 ? ': that is small. The real limit is operations per second, so we shard Redis because of traffic, not because of memory.' : ': now memory also needs attention, but the number of shards is still decided by operations per second.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default values: 50k requests/s × 2 rules = 100k Redis calls/s, ~2 GB of memory, and 4 primary shards (each at a 60% target). Conclusion: <strong>the data is small, the traffic is big</strong>. Also, every request needs one round trip to Redis (~0.5 to 1 ms inside the same data center), which eats our latency budget. These two facts drive the whole design.` },
    { type: 'h2', text: 'Step 3: API and rules' },
    { type: 'p', html: `There are two APIs. One is <strong>internal</strong>: the gateway asks the limiter. One is <strong>external</strong>: what the client sees. The internal API is like Lyft's ratelimit service: Envoy calls <code>ShouldRateLimit</code> over <strong>gRPC</strong>, and the answer is <code>OK</code> or <code>OVER_LIMIT</code>. (gRPC = a fast way for servers to talk to each other, where one server calls a function on another as if it were its own. Details in the <a href="#/graphql-grpc">GraphQL and gRPC</a> lesson.)` },
    { type: 'code', text: `
// Internal: gateway → rate limit service (gRPC). Fields simplified.
ShouldRateLimit({
  domain: "xyz_api",
  descriptors: [ { api_key: "key_abc", path: "/v1/payments" },
                 { ip: "49.36.1.7" } ]
})
→ { overall: "OVER_LIMIT",
    statuses: [ { code: "OVER_LIMIT", limit: "100/second", remaining: 0, reset_in: 1 },
                { code: "OK", limit: "1000/minute", remaining: 870 } ] }

// External: what the client sees
HTTP/1.1 429 Too Many Requests
Retry-After: 1
{ "error": "rate_limited", "message": "Max 100 requests/second per API key" }` },
    { type: 'callout', tone: 'term', title: 'Descriptor', html: `<strong>What it is:</strong> in Envoy/Lyft language, a "label" on a request: a pair of key and value, like <code>api_key = key_abc</code> or <code>path = /v1/payments</code>. Descriptors can also be <strong>nested</strong>: "for api_key X, on path Y".<br><strong>Why we need it:</strong> a rule must say what it counts. A rule says "requests with this label get this limit", and the count is kept under that label.<br><strong>Without it:</strong> we could set only one kind of limit ("every request 100/s"), not a different one per user or per endpoint.` },
    { type: 'p', html: `Rules are not hard-coded; they live in a config file. The file is in <strong>YAML</strong> format (YAML = a simple text format for settings, where spaces at the start of a line (indentation) show what belongs inside what). This format follows the style of the envoyproxy/ratelimit README (the example is for xyz.com):` },
    { type: 'code', text: `
domain: xyz_api
descriptors:
  # Each API key: 1000 requests/minute (all endpoints together)
  - key: api_key
    rate_limit: { unit: minute, requests_per_unit: 1000 }

  # The payments endpoint is costly: 100/second per API key
  - key: api_key
    descriptors:
      - key: path
        value: /v1/payments
        rate_limit: { unit: second, requests_per_unit: 100 }

  # Login: 10/minute per IP (bots that guess passwords)
  - key: path
    value: /login
    descriptors:
      - key: ip
        rate_limit: { unit: minute, requests_per_unit: 10 }

  # New rule: only watch first, do not block
  - key: user_agent
    value: old-sdk-1.2
    shadow_mode: true
    rate_limit: { unit: second, requests_per_unit: 5 }` },
    { type: 'callout', tone: 'term', title: 'Shadow mode / dark launch', html: `<strong>What it is:</strong> the rule is running, counting is happening, and "this request would have been blocked" is written to the log, but <strong>the request is not blocked</strong>. Lyft's service calls this <code>shadow_mode</code>; Stripe called it a "dark launch" in 2017.<br><strong>Why we need it:</strong> you check on real traffic whether the new limit is right. A week of logs shows who would be blocked.<br><strong>Without it:</strong> a wrong limit goes live directly, and one morning your biggest customer sees 429s.` },
    { type: 'p', html: `When the config file changes, the service picks up the new rules without a restart. Lyft's service watches the file and reads the new one as soon as it changes; this is called <strong>hot reload</strong>. In big companies, this file lives in Git (the place where code is kept) and only changes after a review.` },
    { type: 'h3', text: 'Count by what? User, IP, API key, endpoint' },
    { type: 'p', html: `Before writing a rule, the biggest question is: <strong>who counts as "one client"?</strong> Every choice has its own problem:` },
    { type: 'table', head: ['Count by', 'Good when', 'Problem'], rows: [
      ['API key', 'A public API for developers (the xyz.com API)', 'If a key is stolen, the thief gets the same limit; if all teams of a company share one key, they all share one limit'],
      ['User ID', 'Actions after login (writing a post, liking)', 'Before login we do not know the user yet (login page, signup)'],
      ['IP address', 'Login, signup, OTP: when we do not know the user ID yet', 'Thousands of people behind one college Wi-Fi or mobile network share one public IP (NAT). A strict IP limit = the whole college is blocked'],
      ['Endpoint (path)', 'Costly actions: payments, search, file upload', 'Not enough alone; usually combined with API key or IP ("each key, 100/s on /payments")'],
    ]},
    { type: 'p', html: `So real systems apply <strong>several rules at once</strong>, and a request goes through only when <em>all</em> rules say "OK". Send requests yourself below and see which rule blocks when:` },
    { type: 'custom', render(el) {
      // Rules playground: fixed-window counters per rule (Lyft/envoy ratelimit style). Small limits so clicks can reach them.
      const CLIENTS = [
        { id: 'riya', name: "Riya's app", key: 'key_abc', ip: '49.36.1.7' },
        { id: 'aman', name: "Aman's app (same college Wi-Fi)", key: 'key_xyz', ip: '49.36.1.7' },
        { id: 'neha', name: "Neha's app (from home)", key: 'key_neha', ip: '103.5.2.9' },
      ];
      const PATHS = ['/v1/videos', '/v1/payments', '/login'];
      const RULES = [
        { id: 'R1', label: 'each API key: 20 / minute', unit: 60, limit: 20, match: (c, p) => p !== '/login', key: (c) => 'api_key=' + c.key },
        { id: 'R2', label: 'API key + /v1/payments: 3 / second', unit: 1, limit: 3, match: (c, p) => p === '/v1/payments', key: (c) => 'api_key=' + c.key + ', path=/v1/payments' },
        { id: 'R3', label: '/login + IP: 5 / minute', unit: 60, limit: 5, match: (c, p) => p === '/login', key: (c) => 'path=/login, ip=' + c.ip },
      ];
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2)">Pick a client and an endpoint, then send requests. The numbers are small so you can reach the limit by clicking. Move the clock forward yourself.</div>
        <div class="rr-cl" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
        <div class="rr-pa" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <button type="button" class="btn small primary rr-s1">Send 1 request</button>
          <button type="button" class="btn small rr-s5">Send 5</button>
          <button type="button" class="btn small ghost rr-t1">+1 second</button>
          <button type="button" class="btn small ghost rr-t60">+1 minute</button>
          <button type="button" class="btn small ghost rr-rs">Reset</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Clock</span><strong class="rr-clock"></strong></div>
          <div class="stat"><span>Last answer</span><strong class="rr-last"></strong></div>
          <div class="stat"><span>Allowed / blocked</span><strong class="rr-tot"></strong></div>
        </div>
        <div class="rr-tab" style="overflow-x:auto"></div>
        <div class="calc-note rr-note"></div>`;
      const q = s => el.querySelector(s);
      let cl = CLIENTS[0], path = PATHS[0], t = 0, counters = {}, ok = 0, blocked = 0, last = null;
      const winKey = (r, cKey) => r.id + '|' + cKey + '|' + Math.floor(t / r.unit);
      const send = () => {
        const matched = RULES.filter(r => r.match(cl, path));
        const res = matched.map(r => { const k = winKey(r, r.key(cl)); counters[k] = (counters[k] || 0) + 1; return { r, n: counters[k], over: counters[k] > r.limit, retry: r.unit - (t % r.unit) }; });
        const bad = res.filter(x => x.over);
        if (bad.length) { blocked++; last = { code: 429, by: bad.map(x => x.r.id).join(' + '), retry: Math.max(...bad.map(x => x.retry)) }; }
        else { ok++; last = { code: 200 }; }
      };
      const chips = (box, list, cur, lab, set) => { box.innerHTML = ''; list.forEach(x => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (x === cur ? ' on' : ''); b.textContent = lab(x); b.onclick = () => { set(x); draw(); }; box.appendChild(b); }); };
      const draw = () => {
        chips(q('.rr-cl'), CLIENTS, cl, c => c.name + ' · ' + c.ip, c => { cl = c; });
        chips(q('.rr-pa'), PATHS, path, p => p, p => { path = p; });
        q('.rr-clock').textContent = 't = ' + t + 's';
        const L = q('.rr-last');
        L.textContent = !last ? '-' : last.code === 200 ? '200 OK' : '429 (' + last.by + '), Retry-After: ' + last.retry;
        L.style.color = !last ? '' : last.code === 200 ? 'var(--green)' : 'var(--red)';
        q('.rr-tot').textContent = ok + ' / ' + blocked;
        let rows = ''; const seen = new Set();
        CLIENTS.forEach(c => PATHS.forEach(p => RULES.filter(r => r.match(c, p)).forEach(r => {
          const k = winKey(r, r.key(c));
          if (seen.has(k)) return;
          const n = counters[k] || 0;
          if (!n && !(c === cl && p === path)) return;
          seen.add(k);
          rows += `<tr data-k="${k}"><td>${r.id}</td><td style="font-family:var(--f-mono);font-size:12px">${r.key(c)}</td><td>${r.label}</td><td style="color:${n > r.limit ? 'var(--red)' : 'var(--ink)'}"><strong>${n}</strong> / ${r.limit}</td></tr>`;
        })));
        q('.rr-tab').innerHTML = rows ? `<table class="table" style="width:100%;font-size:13px;margin-top:8px"><thead><tr><th>Rule</th><th>Whose counter</th><th>Limit</th><th>In this window</th></tr></thead><tbody>${rows}</tbody></table>` : '';
        q('.rr-note').textContent = last && last.code === 429 && last.by.indexOf('R3') >= 0 && cl.ip === '49.36.1.7'
          ? 'Logins are counted by IP. Riya and Aman come from the same college Wi-Fi (one public IP), so both of their logins are counted in one counter. Because of one person, the other was blocked too: this is the problem with IP limits.'
          : last && last.code === 429 ? 'At least one matching rule went over its limit, so the request was blocked (429). Retry-After tells how many seconds until the window ends. Move the clock forward: a new window, and the counter starts from 0 again.'
          : 'Each request is checked only against the rules that match its labels (API key, path, IP). Fixed window: each rule counter starts from 0 at every new second/minute.';
      };
      q('.rr-s1').onclick = () => { send(); draw(); };
      q('.rr-s5').onclick = () => { for (let i = 0; i < 5; i++) send(); draw(); };
      q('.rr-t1').onclick = () => { t += 1; draw(); };
      q('.rr-t60').onclick = () => { t += 60; draw(); };
      q('.rr-rs').onclick = () => { t = 0; counters = {}; ok = 0; blocked = 0; last = null; cl = CLIENTS[0]; path = PATHS[0]; draw(); };
      draw();
    }},
    { type: 'p', html: `Try this: pick Riya, <code>/v1/payments</code>, "Send 5". The first 3 are OK, the other 2 get 429 (R2). Press "+1 second" and send again: a new window, and it works again. Now send 5 to <code>/login</code> as Riya, then switch to Aman and send one: Aman did nothing wrong, but still gets 429, because both have the same IP. So at places like login, keep the IP limit loose, and also add a per-account limit (like "5 wrong passwords per username every 15 minutes").` },
    { type: 'h2', text: 'Step 4: where does the limiter sit?' },
    { type: 'p', html: `There are three possible places. The table has two new words: a <strong>sidecar</strong> is a small helper program that runs right next to each app server (on the same machine) and handles all its requests, like a sidecar attached to a motorbike. <strong>Edge / CDN</strong> means data centers spread around the world, the ones closest to the user (details in the <a href="#/cdn">CDN</a> lesson). Each place has its own price:` },
    { type: 'table', head: ['Place', 'How', 'Good', 'Bad'], rows: [
      ['Library inside the app', 'A function in the code of every API server that talks to Redis', 'No extra hop; business info (plan, user tier) is easy to get', 'Write it again in every language/service; a bug fix = deploy every service'],
      ['Gateway / sidecar + separate service', 'The gateway (like Envoy) asks the limiter service on every request', 'Rules in one place, for all services; app code stays clean', 'One extra network hop; the limiter service must also be scaled and monitored'],
      ['Edge / CDN', 'At the data center closest to the user (the Cloudflare way)', 'Junk traffic never reaches your servers', 'The user\'s business context (plan, account) is less known there'],
    ]},
    { type: 'p', html: `Lyft's design is the middle one: the Envoy proxy makes a gRPC call to the limiter service on every request. In 2017, Stripe ran its limiters in the API request path, with Redis. For xyz.com we take a gateway + separate service, because xyz.com has many services and wants the rules in one place. Play it and see:` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'c', label: 'Client', sub: 'API key_abc', x: 80, y: 160, w: 120, kind: 'client', info: 'What it is: a developer\'s app that uses the xyz.com API. It sends its API key with every request, so the count goes under its name.' },
        { id: 'gw', label: 'API gateway', sub: 'like Envoy', x: 250, y: 160, w: 140, kind: 'edge', info: 'What it is: the main gate of xyz.com that every request passes through. Why here: it builds labels (descriptors: api_key, path, ip) from the request and asks the limiter. If the answer is OVER_LIMIT, it returns 429 right there, and the request never reaches the API servers.' },
        { id: 'rl', label: 'Rate limit svc', sub: 'stateless', x: 450, y: 60, w: 160, kind: 'server', info: 'What it is: a small service that only answers "allow or not". It is stateless (it remembers no count itself), so many copies can run behind a load balancer; if one fails, another takes over. Rules in memory, counts in Redis.' },
        { id: 'rd', label: 'Redis', sub: 'counters', x: 640, y: 60, w: 130, kind: 'cache', info: 'What it is: a fast database that keeps data in RAM. Why here: the shared count of all limiters lives here. One counter per (rule, key, window). A Lua script does read + check + increase in one atomic step. The data is small, so keeping it in memory is cheap.' },
        { id: 'cfg', label: 'Rules config', sub: 'YAML, reviewed', x: 640, y: 160, w: 130, kind: 'data', info: 'What it is: the YAML file of rules (which label gets which limit). Why here: rules stay separate from code. When it changes, the limiter picks up new rules without a restart (hot reload). Kept in Git, changed after review.' },
        { id: 'api', label: 'API servers', sub: 'real work', x: 450, y: 260, w: 160, kind: 'server', info: 'What it is: the xyz.com servers that do the real work (payments, videos). Thanks to the rate limiter, they only get as much traffic as they can handle.' },
      ],
      edges: [{ a: 'c', b: 'gw' }, { a: 'gw', b: 'rl' }, { a: 'rl', b: 'rd' }, { a: 'rl', b: 'cfg', dashed: true }, { a: 'gw', b: 'api' }],
      scenarios: [
        { name: 'Allowed', steps: [
          { title: 'A request arrives', go: 'c>gw', text: 'The client called the payment API.', msg: 'POST /v1/payments   Authorization: key_abc' },
          { title: 'The gateway asks', go: 'gw>rl', text: 'The gateway built descriptors and asked the limiter. This call should take ~1 ms, so the limiter is in the same data center.', msg: 'ShouldRateLimit(api_key=key_abc, path=/v1/payments)' },
          { title: 'One atomic Lua call', go: ['rl>rd', 'res:rd>rl'], text: 'The limiter found the rule (100/second) and ran a tiny program (Lua script) in Redis: refill tokens, take one token, return what is left. All in one step. (EVALSHA = the command to run a script already stored in Redis by its ID number; details in Deep dive 2.)', msg: 'EVALSHA <sha> 1 rl:{key_abc}:payments 100 100 1   →  [1, 57]' },
          { title: 'OK', go: 'res:rl>gw', text: '57 tokens are left. Allow.', msg: 'OK  remaining=57' },
          { title: 'The real work', go: ['gw>api', 'res:api>gw', 'res:gw>c'], text: 'The request reached the API servers and the answer came back. The limiter added only ~1 ms.' },
        ]},
        { name: 'Over the limit: 429', steps: [
          { title: 'Script bug: requests in a loop', go: 'c>gw', text: 'A bug in the client code: a loop is sending 500 requests every second.', set: { c: { state: 'hot', sub: '500 req/s' } } },
          { title: 'The bucket is empty', go: ['gw>rl', 'rl>rd', 'res:rd>rl'], text: 'Redis said: 0 tokens. This request is not allowed.', after: { rd: { state: 'warn', sub: 'tokens = 0' } }, msg: '→ [0, 0]' },
          { title: '429, API servers are safe', go: ['bad:rl>gw', 'bad:gw>c'], set: { api: { state: 'dim' } }, text: 'The gateway returned 429 right there. The API servers never even knew. Stripe says its request rate limiter most often stopped exactly this kind of runaway script.', msg: '429 Too Many Requests\nRetry-After: 1' },
        ]},
        { name: 'Bot: local cache', intro: 'A bot is sending 10,000 requests/s. Even asking Redis on every request is costly.', steps: [
          { title: 'The first time, from Redis', go: ['c>gw', 'gw>rl', 'rl>rd', 'res:rd>rl'], set: { c: { state: 'hot', sub: 'bot, 10k/s' } }, text: 'Redis said: over the limit, and the window resets in 1 second.', msg: '→ OVER_LIMIT, reset_in = 1s' },
          { title: 'The limiter remembers', focus: ['rl'], after: { rl: { state: 'hit', sub: 'local: key over' } }, text: 'The limiter notes in its memory: "key_bot is over until the window ends". Lyft\'s service has an optional local cache of over-limit keys; Cloudflare caches a "block this source" flag locally on each server.' },
          { title: 'The other requests never reach Redis', flood: { paths: ['c>gw>rl', 'bad:rl>gw>c'], n: 6 }, set: { rd: { state: 'dim' } }, text: 'The next thousands of requests are answered from memory: zero load on Redis. The bot attack cannot knock down our counting machine.' },
        ]},
        { name: 'Rule changed', steps: [
          { title: 'New rule, shadow mode', go: 'evt:cfg>rl', after: { cfg: { state: 'ok', sub: 'v42 deployed' } }, text: 'The team added a new rule in shadow mode. The limiter picked up the new config as soon as the file changed, with no restart.', msg: 'user_agent=old-sdk-1.2 → 5/s   shadow_mode: true' },
          { title: 'Counted, but not blocked', go: ['c>gw', 'gw>rl', 'rl>rd', 'res:rd>rl', 'res:rl>gw', 'gw>api'], text: 'By the rule, the request was over the limit, but in shadow mode it was only logged. The request went on. After a week of logs, the team will decide whether the limit is right.', msg: 'log: WOULD_LIMIT key_abc user_agent=old-sdk-1.2' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "limiter = Redis"', html: `Redis only keeps the count. Reading rules, breaking a request into descriptors, picking the right counter, building the 429 and headers, the local cache, shadow mode, metrics: all of this is the job of the limiter service (or library). In an interview, saying "just add Redis" is only half an answer.` },
    { type: 'h2', text: 'Deep dive 1: which algorithm?' },
    { type: 'p', html: `The inside story of the algorithms is in the <a href="#/rate-limiting">Rate limiting</a> lesson. Here the only question is: <strong>which one for the service</strong>? The three real systems chose differently, and each reason is worth understanding:` },
    { type: 'table', head: ['', 'Stripe (2017)', 'Cloudflare (2017)', 'Lyft / envoyproxy ratelimit'], rows: [
      ['Algorithm', 'Token bucket', 'Sliding window counter (approximation)', 'Fixed window counter'],
      ['State per key', '2 numbers: tokens, last refill time', '2 numbers: count of the previous window, count of the current one', '1 counter per window'],
      ['Burst', 'Bursts up to the bucket size are allowed (on purpose)', 'Smooth; no double burst at the window edge', 'A 2× burst is possible at the window edge'],
      ['Why chosen', 'API clients need a small burst, while the average stays under control', 'Millions of domains, very little memory, few memcache (memcached: a RAM cache like Redis) operations', 'Simple, cheap; one INCR (count +1) + EXPIRE (delete the key after some time) in Redis'],
    ]},
    { type: 'p', html: `Cloudflare's trick is worth seeing. A full sliding window would need the time of every request (costly). They kept only two counters: the previous minute and the current minute. Then they assumed the previous minute's requests were spread evenly across that minute, and estimated:` },
    { type: 'code', text: `rate ≈ previous_count × (the part of the previous window still inside the "sliding window") + current_count

Cloudflare's example (limit 50/minute):
42 in the previous minute, 18 so far in this minute, 15 seconds since this minute began
rate ≈ 42 × (45/60) + 18 = 31.5 + 18 = 49.5   → allow for now (less than 50)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Limit (requests/minute): <strong class="rsw-lv"></strong></label><input class="rsw-l" type="range" min="10" max="200" step="5" value="50"></div>
          <div><label>Count in the previous minute: <strong class="rsw-pv"></strong></label><input class="rsw-p" type="range" min="0" max="200" step="1" value="42"></div>
          <div><label>So far in this minute: <strong class="rsw-cv"></strong></label><input class="rsw-c" type="range" min="0" max="200" step="1" value="18"></div>
          <div><label>Seconds since this minute began: <strong class="rsw-tv"></strong></label><input class="rsw-t" type="range" min="0" max="59" step="1" value="15"></div>
        </div>
        <svg class="rsw-svg" viewBox="0 0 320 70" style="width:100%;max-width:520px;height:auto;margin-top:10px" role="img" aria-label="Previous and current window, and the part covered by the sliding window"></svg>
        <div class="stats">
          <div class="stat"><span>Share of previous window</span><strong class="rsw-w"></strong></div>
          <div class="stat"><span>Estimated rate</span><strong class="rsw-r"></strong></div>
          <div class="stat"><span>What fixed window says</span><strong class="rsw-f"></strong></div>
          <div class="stat"><span>Sliding window decision</span><strong class="rsw-d"></strong></div>
        </div>
        <div class="calc-note rsw-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const L = +q('.rsw-l').value, P = +q('.rsw-p').value, C = +q('.rsw-c').value, t = +q('.rsw-t').value;
        q('.rsw-lv').textContent = L; q('.rsw-pv').textContent = P; q('.rsw-cv').textContent = C; q('.rsw-tv').textContent = t + 's';
        const w = (60 - t) / 60, rate = P * w + C;
        q('.rsw-w').textContent = (60 - t) + '/60';
        q('.rsw-r').textContent = (Math.round(rate * 10) / 10).toString();
        q('.rsw-f').textContent = C < L ? 'allow (' + C + ' < ' + L + ')' : 'block';
        const ok = rate < L;
        const d = q('.rsw-d'); d.textContent = ok ? 'allow' : 'block (429)'; d.style.color = ok ? 'var(--green)' : 'var(--red)';
        const x0 = 10, ww = 150, sx = x0 + ww * t / 60;
        q('.rsw-svg').innerHTML = `<rect x="${x0}" y="20" width="${ww}" height="26" rx="4" fill="var(--surface-2)" stroke="var(--line-2)"/>
          <rect x="${x0 + ww}" y="20" width="${ww}" height="26" rx="4" fill="var(--surface-2)" stroke="var(--line-2)"/>
          <rect x="${sx}" y="16" width="${ww}" height="34" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" opacity="0.85"/>
          <text x="${x0 + ww / 2}" y="64" text-anchor="middle" font-size="10" fill="var(--ink-2)" font-family="var(--f-mono)">previous min: ${P}</text>
          <text x="${x0 + ww * 1.5}" y="64" text-anchor="middle" font-size="10" fill="var(--ink-2)" font-family="var(--f-mono)">now: ${C}</text>
          <text x="${sx + ww / 2}" y="12" text-anchor="middle" font-size="10" fill="var(--accent-ink)" font-family="var(--f-mono)">sliding window (60s)</text>`;
        q('.rsw-note').textContent = `${P} × ${(60 - t)}/60 + ${C} = ${(Math.round(rate * 10) / 10)}. ` + (C < L && !ok ? 'Fixed window would allow this, because the new minute started "clean". Sliding window remembers how much traffic really came in the last 60 seconds. ' : '') + 'Only two numbers per key: that is why this stays cheap even for millions of keys.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `How wrong is the "estimate"? In 2017, Cloudflare measured it on 400 million requests from 270,000 sources: only <strong>0.003%</strong> of requests were wrongly allowed or wrongly blocked, and the estimated rate was on average ~6% away from the real rate. For that small error, each key needs just two numbers. This is the same "roughly correct, very cheap" trade-off.` },
    { type: 'callout', tone: 'tip', title: 'Interview default', html: `For a public API, say <strong>token bucket</strong> (bursts allowed, average under control, two numbers per key). If the interviewer talks about "a double burst at the window edge", use the sliding window counter. Use fixed window when simplicity matters most and a small burst is fine.` },
    { type: 'h2', text: 'Deep dive 2: Redis + Lua, done right' },
    { type: 'p', html: `First the problem. Two gateways read the same counter at the same moment: both see 99 (limit 100). Both think "there is still room", both allow, both write 100. In reality 101 requests got through. This is called a <strong>race condition</strong> (two runners racing for the same thing, and the one who writes last wipes out the work of the first). You played this in the <a href="#/rate-limiting">Rate limiting</a> lesson.` },
    { type: 'callout', tone: 'term', title: 'Atomic operation and Lua script', html: `<strong>What it is:</strong> <em>atomic</em> = several small steps that happen in one go; nobody else can get in between. <em>Lua</em> is a small programming language that can run inside Redis. We write "read, check, write" as a Lua script and send it to Redis. The Redis docs say that while a script runs, Redis runs no other command.<br><strong>Why we need it:</strong> no more race condition. Even if 50 gateways ask at once, Redis runs them one by one, each with the full script.<br><strong>Without it:</strong> another gateway's work slips in between a separate GET and SET, and more requests than the limit get through.` },
    { type: 'p', html: `Here is the full token bucket script. Read the comments as you go; each line does one small job:` },
    { type: 'code', text: `
-- KEYS[1] = "rl:{key_abc}:payments"      (name of the counter)
-- ARGV[1] = rate  (tokens per second)   ARGV[2] = capacity (burst)   ARGV[3] = cost
local rate, cap, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])

local t   = redis.call('TIME')                 -- Redis's own clock, not the gateways'
local now = tonumber(t[1]) + tonumber(t[2]) / 1000000

local b      = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or cap           -- first time: the bucket is full
local ts     = tonumber(b[2]) or now

tokens = math.min(cap, tokens + (now - ts) * rate)   -- add tokens for the time that passed
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(cap / rate) + 1)  -- an unused key deletes itself
return { allowed, math.floor(tokens) }` },
    { type: 'list', items: [
      `<strong>EVALSHA, not EVAL:</strong> load the script once with <code>SCRIPT LOAD</code>, then on every request send only its SHA1 (a short fingerprint of the script, like its ID number). The Redis docs warn that the script cache is volatile: after a restart or failover the script may be gone, so the client must know how to load it again on a <code>NOSCRIPT</code> error (most Redis libraries do this for you).`,
      `<strong>Redis's clock:</strong> the clocks of 50 gateways are slightly different (clock skew). If each gateway sent its own "now", the bucket would refill wrongly. Reading <code>TIME</code> inside Redis means everyone sees one clock. (Since Redis 5, "effects replication" is the default for scripts: the script does not run again on the replica; only its result (what was written) is sent. So writing with TIME inside a script is safe.)`,
      `<strong>EXPIRE is a must:</strong> most of the millions of API keys go quiet after a while. Without a TTL (time to live: how long until a key deletes itself), Redis fills up with useless counters.`,
      `<strong>Keep the script small:</strong> while the script runs, all of Redis waits. This script takes a few microseconds; put a loop or heavy work in it and every client slows down.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Hash tag (Redis Cluster)', html: `<strong>What it is:</strong> <em>Redis Cluster</em> = the Redis setup that splits keys into shards by itself. It puts keys into 16,384 "slots" (boxes), and each shard owns some slots. A key's slot is decided by the hash of its name. A <em>hash tag</em> = the part of the key name inside <code>{...}</code>; only that part is hashed. So for <code>rl:{key_abc}:payments</code> and <code>rl:{key_abc}:minute</code>, the slot is decided only by <code>key_abc</code>.<br><strong>Why we need it:</strong> all keys of one script must be in <strong>one slot</strong> (Redis docs: the keys a script touches must be passed by name in KEYS). With a hash tag, all counters of one API key land on one shard, and one script can check both rules together.<br><strong>Without it:</strong> two counters may sit on different shards, and the script fails with an error (CROSSSLOT).` },

    { type: 'h3', text: 'What GitHub learned when moving to Redis (2021)' },
    { type: 'p', html: `GitHub's 2021 engineering post (a few years old now) is a good real example. Their API rate limiter used to run on memcached (a RAM cache). Two problems came up: (1) memcached was a shared cache. When it fills up, it throws out old keys to make room (this is called <strong>evicting</strong>), and sometimes the rate limit keys were thrown out. A client would suddenly get a "new, empty" window. (2) They were moving to separate caches per data center, so a client that went to different data centers saw different counts. They set up a <strong>separate, sharded Redis</strong>: the application looks at the key and picks the shard itself (client-side sharding), each shard has a primary (writes go here) and replicas (reads come from here), and the logic is in Lua scripts.` },
    { type: 'p', html: `Two bugs they shared publicly, and both are worth knowing for interviews:` },
    { type: 'list', items: [
      `<strong>A reset time that kept moving:</strong> the <code>X-RateLimit-Reset</code> header moved a few seconds back and forth on each request, because it was computed by mixing Redis's TTL with the app server's clock. Fix: store the reset time directly in Redis, do not estimate it.`,
      `<strong>"remaining: 5000" on a rejected request:</strong> old data was read from a replica (replication lag) after the window had already ended on the primary. Fix: store the window's expiry time yourself and check it inside the script, instead of trusting Redis's own expiry; and set Redis's expiry a little after the window ends.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "read the count from a Redis replica to reduce load"', html: `In rate limiting, "reading and writing" are one job (every request increases the count). A replica is a little behind, so a number read from it can be wrong, as happened to GitHub. Make the decision on the primary, in one atomic script. Use replicas only for failover, or only for jobs like "showing headers" where slightly old data is fine.` },
    { type: 'h2', text: 'Deep dive 3: do not add latency to every request' },
    { type: 'p', html: `The napkin maths showed it: every request makes one round trip to Redis. At 100k requests/s, this is also the biggest job Redis has. Real systems use these four tricks:` },
    { type: 'steps', items: [
      { t: 'Local cache of over-limit keys', d: 'For a key that is over the limit right now, answer from memory until the window ends. However many requests a bot sends, only one reaches Redis. Lyft\'s service has this as an optional local cache; Cloudflare caches a "block this source" flag on each server.' },
      { t: 'Increase the count asynchronously', d: 'Cloudflare wrote in 2017 that increasing the counter does not make the request wait: the request moves on right away, and the increment happens in the background. Price: a few requests can get past the limit. For them, this was a cheap deal.' },
      { t: 'Two stages: local first, then global', d: 'The Envoy docs suggest that each proxy has its own local token bucket that soaks up big bursts first, so only the remaining traffic reaches the global rate limit service. Local = a rough filter, global = the correct count.' },
      { t: 'Pipelining and batching', d: 'Lyft\'s service can collect Redis commands for a tiny time window and send them together (pipelining, explained below), and it can keep a separate Redis for per-second limits, because those keys have very high churn (new keys created and old ones deleted every second).' },
    ]},
    { type: 'callout', tone: 'term', title: 'Pipelining', html: `<strong>What it is:</strong> normally you send Redis one command, wait for the answer, then send the next: one network round trip (there and back) per command. With <strong>pipelining</strong>, you send many commands together and get all the answers together.<br><strong>Why we need it:</strong> fewer round trips, more work per second (higher throughput).<br><strong>Without it:</strong> 100 commands = waiting for the network 100 times.<br><strong>Careful:</strong> other clients' commands can come in between the commands of a pipeline. For atomic work you still need a Lua script.` },

    { type: 'h2', text: 'Deep dive 4: Redis went down. Now what?' },
    { type: 'p', html: `This is the most important question of this design. The limiter is in the path of every request. If Redis (or the limiter service) does not answer, the gateway has only two choices:` },
    { type: 'callout', tone: 'term', title: 'Fail-open vs fail-closed', html: `<strong>What it is:</strong> the policy for what the gateway does when the limiter itself is broken. <em>Fail-open</em> = no answer, so <em>allow</em> the request (leave the door open). <em>Fail-closed</em> = no answer, so <em>reject</em> the request (close the door).<br><strong>Why we need it:</strong> the limiter is in the path of every request. What happens when it fails must be decided in advance, or every request will hang.<br><strong>Without it (without deciding):</strong> the gateway keeps waiting for the limiter, and an outage of a small helper stops the whole site.<br><strong>Price:</strong> with fail-open the site keeps running but there is no counting for a while; with fail-closed safety stays, but the limiter's problem becomes the whole site's problem.` },
    { type: 'p', html: `Stripe's advice in 2017 was clear: catch exceptions at every level so that any limiter bug or outage <strong>fails open</strong> and the API keeps running. Envoy has the same default: <code>failure_mode_deny</code> defaults to <code>false</code>, which means if the limiter returns an error the request is allowed, and a counter (<code>failure_mode_allowed</code>) goes up so you find out. Set it to <code>true</code> and an error gives a 500. Play it and see:` },
    { type: 'flow', height: 330, title: 'Redis down: three policies',
      nodes: [
        { id: 'u', label: 'Normal user', sub: '5 req/s', x: 80, y: 90, w: 130, kind: 'client', info: 'What it is: an ordinary client (like someone\'s app) that sends requests within its limit. We want it to never have trouble.' },
        { id: 'bot', label: 'Bot', sub: '20,000 req/s', x: 80, y: 250, w: 130, kind: 'threat', info: 'What it is: a scraper/bot (a program that sends lots of requests by itself), 200 times over the limit. On a normal day, the limiter stops it at 100 req/s.' },
        { id: 'gw', label: 'API gateway', sub: 'timeout 5 ms', x: 280, y: 170, w: 150, kind: 'edge', info: 'What it is: the main gate of xyz.com. Why here: it puts a short timeout (say 5 ms) on the limiter call. If the limiter does not answer, it does not keep the request hanging; it decides by the policy (fail-open or fail-closed).' },
        { id: 'rl', label: 'Limiter svc', x: 490, y: 60, w: 140, kind: 'server', info: 'What it is: the rate limit service, which says allow/deny. In this scenario it is alive, but it cannot count without Redis.' },
        { id: 'rd', label: 'Redis', sub: 'counters', x: 650, y: 170, w: 110, kind: 'cache', info: 'What it is: the Redis with the shared counters. In this scenario it is down (a failover is happening, which means a backup is being made the primary, or the network broke).' },
        { id: 'api', label: 'API servers', sub: 'capacity 10k/s', x: 490, y: 280, w: 150, kind: 'server', meter: true, load: 40, info: 'What it is: the xyz.com servers that do the real work. They can handle at most ~10,000 requests/s (assumed). More than that, and everything slows down, then times out.' },
      ],
      edges: [{ a: 'u', b: 'gw' }, { a: 'bot', b: 'gw' }, { a: 'gw', b: 'rl' }, { a: 'rl', b: 'rd' }, { a: 'gw', b: 'api' }],
      scenarios: [
        { name: 'Fail-open', steps: [
          { title: 'Redis down', set: { rd: { state: 'down', sub: 'DOWN' } }, go: ['u>gw', 'gw>rl', 'bad:rl>gw'], text: 'The limiter could not reach Redis and returned an error. The gateway did not wait more than 5 ms.', msg: 'ShouldRateLimit → error: redis connection refused' },
          { title: 'Policy: allow', go: ['gw>api', 'res:api>gw', 'res:gw>u'], text: 'Fail-open: the normal user\'s request went through without trouble. The site is running. The "failure_mode_allowed" metric is going up, and the on-call engineer got an alert.', msg: 'allowed (limiter unavailable)' },
          { title: 'But the bot is free too', flood: { paths: ['bot>gw>api'], n: 10 }, after: { api: { state: 'hot', load: 95, sub: 'overloaded' } }, text: 'The bot\'s 20,000 req/s also go straight to the API servers. If Redis stays down for long and the bot is active, the API servers overload. This is the risk of fail-open: fine for a short outage, not for a long one.' },
        ]},
        { name: 'Fail-closed', steps: [
          { title: 'Redis down', set: { rd: { state: 'down', sub: 'DOWN' } }, go: ['u>gw', 'gw>rl', 'bad:rl>gw'], text: 'Same situation.' },
          { title: 'Policy: reject', go: 'bad:gw>u', set: { api: { state: 'dim', load: 0 } }, text: 'Fail-closed: the normal user also gets an error. The bot stopped, but the whole site stopped with it. A small counting helper became the SPOF of the whole product.', msg: '500 / 503  (limiter unavailable)' },
          { title: 'Where is it right?', focus: ['gw'], text: 'On some endpoints this is the right choice: login, sending OTPs, password reset, sending money. There, "letting everything through without counting" means brute-force attacks or an exploding SMS bill. So the policy can be <strong>different for each rule</strong>.' },
        ]},
        { name: 'Hybrid: local fallback', steps: [
          { title: 'Redis down', set: { rd: { state: 'down', sub: 'DOWN' } }, go: ['u>gw', 'gw>rl', 'bad:rl>gw'], text: 'Same situation.' },
          { title: 'The gateway uses its own local bucket', after: { gw: { state: 'warn', sub: 'local limits' } }, go: ['gw>api', 'res:api>gw', 'res:gw>u'], text: 'Each gateway has a rough local limit in memory (like the global limit ÷ the number of gateways). The normal user notices nothing.' },
          { title: 'The bot is still mostly stopped', flood: { paths: ['bot>gw', 'bad:gw>bot'], n: 8 }, after: { api: { state: 'ok', load: 45 } }, text: 'The local bucket blocked most of the bot\'s requests. The count is not exact (a bit more or less if traffic is not spread evenly across gateways), but the site kept running and the bot was stopped. As soon as Redis is back, normal global limiting returns.' },
        ]},
      ],
    },
    { type: 'h3', text: 'Simulator: Redis is down, and a bot is here' },
    { type: 'p', html: `Feel it with numbers. The bot's limit is 100 req/s per client. In local fallback, each gateway keeps the same rough 100/s bucket (a simple config), so the bot can get at most "gateways × 100".` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rfm-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Normal traffic (req/s): <strong class="rfm-lv"></strong></label><input class="rfm-l" type="range" min="1000" max="15000" step="500" value="8000"></div>
          <div><label>Bot traffic (req/s): <strong class="rfm-bv"></strong></label><input class="rfm-b" type="range" min="0" max="50000" step="1000" value="20000"></div>
          <div><label>Gateways: <strong class="rfm-gv"></strong></label><input class="rfm-g" type="range" min="2" max="50" step="1" value="10"></div>
          <div><label>API capacity (req/s): <strong class="rfm-cv"></strong></label><input class="rfm-c" type="range" min="5000" max="30000" step="1000" value="10000"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Bot requests that got in</span><strong class="rfm-bp"></strong></div>
          <div class="stat"><span>Load on API servers</span><strong class="rfm-ld"></strong></div>
          <div class="stat"><span>Normal users who got an answer</span><strong class="rfm-ok"></strong></div>
        </div>
        <div class="calc-note rfm-note"></div>`;
      const q = s => el.querySelector(s);
      const MODES = [['normal', 'Redis up (normal)'], ['open', 'Redis down: fail-open'], ['closed', 'Redis down: fail-closed'], ['local', 'Redis down: local fallback']];
      const LIMIT = 100;
      let mode = 'open';
      const fmt = n => n.toLocaleString('en-IN');
      const calc = (m, L, B, G, C) => {
        let bot, legitPct;
        if (m === 'normal') bot = Math.min(B, LIMIT);
        else if (m === 'open') bot = B;
        else if (m === 'closed') bot = 0;
        else bot = Math.min(B, G * LIMIT);
        const load = m === 'closed' ? 0 : L + bot;
        legitPct = m === 'closed' ? 0 : load <= C ? 100 : C / load * 100;
        return { bot, load, legitPct };
      };
      const upd = () => {
        const L = +q('.rfm-l').value, B = +q('.rfm-b').value, G = +q('.rfm-g').value, C = +q('.rfm-c').value;
        q('.rfm-lv').textContent = fmt(L); q('.rfm-bv').textContent = fmt(B); q('.rfm-gv').textContent = G; q('.rfm-cv').textContent = fmt(C);
        const chips = q('.rfm-chips'); chips.innerHTML = '';
        MODES.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = t; b.onclick = () => { mode = k; upd(); }; chips.appendChild(b); });
        const r = calc(mode, L, B, G, C);
        q('.rfm-bp').textContent = fmt(r.bot) + '/s';
        const ld = q('.rfm-ld'); ld.textContent = (r.load / C * 100).toFixed(0) + '%'; ld.style.color = r.load > C ? 'var(--red)' : 'var(--green)';
        const ok = q('.rfm-ok'); ok.textContent = r.legitPct.toFixed(1) + '%'; ok.style.color = r.legitPct >= 99.9 ? 'var(--green)' : r.legitPct > 0 ? 'var(--amber)' : 'var(--red)';
        const notes = {
          normal: 'A normal day: the bot is stopped at 100/s, and the API servers are relaxed.',
          open: r.load > C ? 'Fail-open: the site is "open", but all of the bot traffic came in and the API servers are over capacity. In an overload everyone\'s requests slow down or fail, so normal users also got answers for only ' + r.legitPct.toFixed(1) + '% (assuming that in an overload the capacity is shared equally by everyone).' : 'Fail-open: the bot traffic came in, but there is still enough capacity. For a short outage, fail-open is perfectly fine.',
          closed: 'Fail-closed: the bot stopped, but normal users also get 0%. A limiter outage = an outage of the whole API.',
          local: 'Local fallback: each gateway has a rough 100/s bucket, so the bot got through up to ' + fmt(r.bot) + '/s (' + G + ' × 100). Not exact, but the site kept running and the bot was mostly stopped.',
        };
        q('.rfm-note').textContent = notes[mode];
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default numbers: fail-open puts 280% load on the API and normal users get only ~36% answers; fail-closed gives 0%; with local fallback the bot gets only 1,000/s through and normal users get 100%. That is why mature setups use <strong>fail-open + local fallback by default</strong>, and fail-closed only on a few sensitive endpoints (login, OTP, payouts).` },
    { type: 'callout', tone: 'warn', title: 'Kill switch', html: `Stripe said one more thing: keep a feature flag (an on/off setting that can be changed without a code deploy) for every limiter, so that if too many people get blocked by mistake, you can switch the limiter off in one click. And dashboards/alerts: how many requests each rule is blocking. A sudden spike = either an attack, or your new rule is wrong.` },
    { type: 'h2', text: 'Deep dive 5: many regions' },
    { type: 'p', html: `xyz.com now runs in two <strong>regions</strong>, Mumbai and Virginia (US) (a region = a group of data centers in one city or area). One API key can send requests to both. Where should we count? Two new words appear in the flow:` },
    { type: 'callout', tone: 'term', title: 'PoP and anycast', html: `<strong>What it is:</strong> a <em>PoP</em> (point of presence) = one CDN data center in some city; Cloudflare has very many around the world. <em>Anycast</em> = all PoPs in the world announce the same IP address, and internet routing automatically sends each user to the closest PoP.<br><strong>Why we need it (here):</strong> traffic from one place usually always reaches the same PoP. So all the counting for one attacker happens in one PoP, and a global counter is needed less.<br><strong>Without it:</strong> one user's requests would be scattered across many data centers, and each data center would have to ask the others for the count.` },
    { type: 'p', html: `Three options; play all three:` },
    { type: 'flow', height: 300, title: 'Two regions, one API key',
      nodes: [
        { id: 'cin', label: 'Client', sub: 'from India', x: 80, y: 80, w: 120, kind: 'client', info: 'What it is: a customer\'s app that runs in India. This API key\'s traffic arrives at the Mumbai region.' },
        { id: 'cus', label: 'Client', sub: 'from US, same key', x: 80, y: 230, w: 130, kind: 'client', info: 'What it is: the same customer, the same API key, but requests come from servers in the US (the customer also has servers in the US). They arrive at the Virginia region.' },
        { id: 'la', label: 'Mumbai limiter', x: 310, y: 80, w: 160, kind: 'server', info: 'What it is: the Mumbai region\'s own rate limit service. Requests arriving in Mumbai are decided here.' },
        { id: 'lb', label: 'Virginia limiter', x: 310, y: 230, w: 160, kind: 'server', info: 'What it is: the Virginia (US) region\'s own rate limit service. US requests are decided here.' },
        { id: 'ra', label: 'Redis Mumbai', x: 570, y: 80, w: 150, kind: 'cache', info: 'What it is: the Mumbai region\'s Redis, which holds the Mumbai count. In the same region, ~1 ms away.' },
        { id: 'rb', label: 'Redis Virginia', x: 570, y: 230, w: 150, kind: 'cache', info: 'What it is: the Virginia region\'s Redis, which holds the US count. Very far from Mumbai: one round trip is around 200 ms (because of the distance between the countries).' },
      ],
      edges: [{ a: 'cin', b: 'la' }, { a: 'cus', b: 'lb' }, { a: 'la', b: 'ra' }, { a: 'lb', b: 'rb' }, { a: 'lb', b: 'ra', id: 'far', hidden: true, dashed: true }, { a: 'ra', b: 'rb', id: 'sync', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Each region separate', steps: [
          { title: 'Each counts its own', parallel: true, go: ['cin>la>ra', 'cus>lb>rb'], text: 'Each region counts in its own Redis. Fast (~1 ms), and if one region fails, the other keeps working. Cloudflare did exactly this in 2017: each PoP (data center) had its own memcache cluster, no global count.' },
          { title: 'Why it works (for Cloudflare)', focus: ['la', 'ra'], text: 'Cloudflare uses <strong>anycast</strong>: traffic from one IP usually always reaches the same PoP. So one attacker is counted in one place. For them, per-PoP counting was accurate enough.' },
        ]},
        { name: 'Problem: one key, two regions', steps: [
          { title: 'Limit 100/s, on both sides', parallel: true, go: ['cin>la>ra', 'cus>lb>rb'], after: { ra: { sub: '100/100' }, rb: { sub: '100/100' } }, text: 'Each region allowed 100 by its own count.' },
          { title: 'Real total: 200/s', set: { ra: { state: 'warn' }, rb: { state: 'warn' } }, focus: ['ra', 'rb'], text: 'The customer got 200 instead of 100. Ways to fix it: split the limit (Mumbai 60, Virginia 40, based on last week\'s traffic), or give the API key a "home region" where it is counted.' },
        ]},
        { name: 'One global counter', steps: [
          { title: 'All counting in Mumbai', show: ['far'], go: ['cus>lb>ra', 'res:ra>lb'], set: { rb: { state: 'dim' } }, text: 'Now the count is exactly right. But every Virginia request makes a round trip to another continent.', msg: 'Virginia request + ~200 ms (cross-region round trip)' },
          { title: 'And if Mumbai goes down?', set: { ra: { state: 'down', sub: 'DOWN' } }, go: ['cus>lb', 'lb>ra', 'bad:ra>lb'], text: 'Virginia loses its rate limiting too (fail-open or fail-closed, both bad). A strict global counter = latency + a SPOF between regions. Wrong for this use case.' },
        ]},
        { name: 'Local + async sync', steps: [
          { title: 'Local count, instant decision', parallel: true, go: ['cin>la>ra', 'cus>lb>rb'], text: 'Each region counts locally (fast).' },
          { title: 'Share counts every second', show: ['sync'], parallel: true, go: ['evt:ra>rb', 'evt:rb>ra'], after: { ra: { sub: 'local + remote' }, rb: { sub: 'local + remote' } }, text: 'In the background, the regions send their counts to each other. The decision uses "local + the other region\'s last count". There can be a small overshoot (in the time between syncs), but it is bounded. This is a general industry approach; the Stripe, Cloudflare and Lyft posts do not describe it.' },
        ]},
      ],
    },
    { type: 'p', html: `GitHub's 2021 post also started from this problem: separate caches per data center meant one client's count looked different in different data centers. They built a separate Redis setup for rate limiting so that all data centers see one count. The stricter the accuracy you need, the farther away the count lives; the more speed you need, the closer it lives.` },

    { type: 'h2', text: 'One limiter is not enough: Stripe\'s four' },
    { type: 'p', html: `The most useful part of Stripe's 2017 post: a "rate limiter" is not one thing, it is a <strong>family</strong>. The table has one new word, so first that:` },
    { type: 'callout', tone: 'term', title: 'Load shedding', html: `<strong>What it is:</strong> when the whole system (all the servers, called the <em>fleet</em>) is full, you deliberately refuse less important requests (503), so the important work keeps running. Rate limiting stops "one client"; load shedding looks at "everyone's total".<br><strong>Why we need it:</strong> sometimes no single client is wrong, everyone together is just too much (like a sale day). Even then, critical work like payments must not stop.<br><strong>Without it:</strong> in an overload every request slows down, then times out, and critical work fails too.` },
    { type: 'p', html: `Now the four limiters. Each one stops a different problem:` },
    { type: 'table', head: ['Limiter', 'What it does', 'What it stops'], rows: [
      ['Request rate limiter', 'N requests per second per user (token bucket)', 'Runaway scripts, a flood from one user. Stripe says this one triggered the most.'],
      ['Concurrent requests limiter', 'A limit on how many requests one user has running at the same time (like 20)', 'Fights over CPU on costly, slow endpoints. On a slow endpoint the client retries, and the load grows.'],
      ['Fleet usage load shedder', 'A part of the fleet (Stripe ~20%) is reserved for critical requests (like creating a charge); non-critical ones get 503', 'Non-critical traffic starving critical work'],
      ['Worker utilization load shedder', 'When workers are full, drop traffic by priority: first test-mode, then GET, then POST, critical last', 'The whole system falling over in a big incident'],
    ]},
    { type: 'p', html: `The first two are <strong>per-user</strong> (fairness), the last two are for the <strong>whole system</strong> (load shedding, whose story is in the <a href="#/rate-limiting">Rate limiting</a> and <a href="#/resilience">Resilience</a> lessons). Stripe's advice: start with the request rate limiter, add the others slowly, when you need them.` },
    { type: 'h2', text: 'What can break' },
    { type: 'table', head: ['Failure', 'What happens', 'Protection'], rows: [
      ['Redis down / slow', 'Every request gets stuck at the limiter', 'Short timeout, fail-open + local fallback, fail-closed on sensitive rules'],
      ['Redis failover', 'The new primary lacks the latest counts (async replication); some clients get a "new" window; the script cache is empty', 'A little over-allowing is fine; reload the script on NOSCRIPT'],
      ['Hot key', 'One very big customer, all its traffic on one Redis shard', 'Local cache of over-limit keys; a local pre-filter for that customer; if needed, split its limit across shards'],
      ['Clock skew', 'Gateway clocks differ, the bucket refills wrongly; reset headers jump around (GitHub)', 'Take time from Redis (TIME), store the reset time'],
      ['Wrong rule deployed', 'Good traffic starts getting 429s', 'Shadow mode first, kill switch, dashboards'],
      ['Memory full', 'A shared cache evicted rate-limit keys (GitHub\'s memcached experience)', 'A separate Redis for rate limiting; a TTL on every key'],
    ]},

    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>One server?</strong> A token bucket in memory, that is all. <strong>Many servers?</strong> Shared Redis + an atomic Lua script, at the gateway. <strong>Default policy:</strong> fail-open + local fallback; endpoints for login/OTP/money fail-closed. <strong>Many regions?</strong> Each region counts its own; a strict global count only when the business truly needs it and the latency is acceptable.` },

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Requirements', d: 'What to limit by (user, IP, API key, endpoint), how much accuracy is needed, the latency budget (~1 ms), and what happens if Redis fails.' },
      { t: 'Where', d: 'Gateway + a separate stateless limiter service + Redis. Rules in config, hot reload, shadow mode.' },
      { t: 'Algorithm', d: 'Token bucket, two numbers per key, one atomic Lua script. Sliding window counter if you need it smooth (Cloudflare).' },
      { t: 'Scale', d: 'Redis Cluster, hash tags, TTL; local cache of over-limit keys; two stages, local + global.' },
      { t: 'Failure', d: 'Fail-open by default (Stripe, Envoy default), local fallback, fail-closed on sensitive endpoints. Kill switch, metrics.' },
      { t: 'Multi-region', d: 'Count per region, split the limit or use a home region; no strict global counter, because of latency and a SPOF.' },
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 590,
      groups: [
        { label: 'Clients', x: 10, y: 6, w: 480, h: 96 },
        { label: 'Edge', x: 10, y: 118, w: 480, h: 212 },
        { label: 'Services', x: 10, y: 345, w: 480, h: 112 },
        { label: 'Data + ops', x: 510, y: 118, w: 202, h: 462 },
      ],
      nodes: [
        { id: 'u', label: 'Normal client', sub: 'API key, 5 req/s', x: 130, y: 55, w: 160, kind: 'client', info: 'What it is: a developer\'s app that calls the xyz.com API with its API key, within the limit.' },
        { id: 'bot', label: 'Bot', sub: '20,000 req/s', x: 360, y: 55, w: 160, kind: 'threat', info: 'What it is: a runaway script or scraper that sends many times more requests than the limit. The limiter protects everyone else from it.' },
        { id: 'cdn', label: 'CDN / edge', sub: 'rough IP limit', x: 245, y: 170, w: 220, kind: 'edge', info: 'What it is: the data center close to the user (PoP). Why here: very rough IP-level limits are applied right here (the Cloudflare way), so junk traffic never reaches our servers.' },
        { id: 'gw', label: 'API gateway', sub: 'local bucket + cache', x: 245, y: 285, w: 220, kind: 'edge', info: 'What it is: the main gate of xyz.com (like Envoy). It builds labels from the request and asks the limiter. It keeps a rough local token bucket (the first filter) and a local cache of over-limit keys. Short timeout; if the limiter cannot be reached: fail-open + local fallback, fail-closed on login/OTP/payouts.' },
        { id: 'api', label: 'API servers', sub: 'real work', x: 130, y: 405, w: 170, kind: 'server', info: 'What it is: the xyz.com servers that do the real work. Only allowed traffic reaches them.' },
        { id: 'rl', label: 'Rate limit svc', sub: 'stateless, many copies', x: 360, y: 405, w: 170, kind: 'server', info: 'What it is: a small stateless service that says "OK" or "OVER_LIMIT". Rules in memory (from YAML, hot reload, shadow mode), counts in Redis.' },
        { id: 'mon', label: 'Metrics + alerts', sub: '429s, fail-open', x: 600, y: 180, w: 150, kind: 'data', info: 'What it is: dashboards and alerts. How many requests each rule blocks, how often fail-open happened. A sudden spike = an attack or a wrong rule. The kill switch is here too.' },
        { id: 'cfg', label: 'Rules config', sub: 'YAML in Git', x: 600, y: 285, w: 150, kind: 'data', info: 'What it is: the rules file: which label (API key, IP, path) gets which limit. It changes after review; the limiter picks it up without a restart.' },
        { id: 'rd', label: 'Redis Cluster', sub: 'counters + Lua', x: 600, y: 405, w: 150, kind: 'cache', info: 'What it is: the sharded Redis that holds all the counts. Keys like rl:{api_key}:rule, a TTL on every key. The token bucket runs as one atomic Lua script: no race condition.' },
        { id: 'rdr', label: 'Redis replica', sub: 'failover copy', x: 600, y: 525, w: 150, kind: 'cache', info: 'What it is: the backup copy of each shard. If the primary fails, this becomes the primary. It is an async copy, so a few counts can be lost; that is why decisions happen on the primary, and the replica is only for failover.' },
      ],
      edges: [
        { a: 'u', b: 'cdn', n: 1 },
        { a: 'bot', b: 'cdn' },
        { a: 'cdn', b: 'gw', n: 2 },
        { a: 'gw', b: 'rl', n: 3, label: 'allow?' },
        { a: 'rl', b: 'rd', n: 4 },
        { a: 'gw', b: 'api', n: 5, label: 'allowed' },
        { a: 'rl', b: 'cfg', dashed: true, label: 'rules' },
        { a: 'gw', b: 'mon', kind: 'evt', label: 'metrics' },
        { a: 'rd', b: 'rdr', kind: 'evt', dashed: true, label: 'async copy' },
      ],
      paths: [
        { name: 'Allowed', text: 'Client → CDN → gateway → limiter → Redis (Lua: take a token, 57 left) → "OK" → the gateway sends the request to the API servers. The limiter added ~1 ms.', go: ['u>cdn>gw>rl>rd', 'gw>api'] },
        { name: 'Blocked (429)', text: 'Bot request → limiter → Redis: 0 tokens → OVER_LIMIT → the gateway returns 429 + Retry-After right there. The API servers never even know. The next requests are answered from the gateway\'s local cache and never reach Redis.', go: ['bot>cdn>gw>rl>rd'] },
        { name: 'Redis down', text: 'Redis does not answer → limiter error → the gateway waits no more than 5 ms: fail-open + a decision from the local bucket, and the request goes to the API servers. Fail-closed on login/OTP. An alert in metrics; the replica becomes the primary.', go: ['gw>rl>rd>rdr', 'gw>api', 'gw>mon'] },
        { name: 'Rule change', text: 'A new rule in Git after review → the limiter hot reloads it, first in shadow mode. Look at the metrics, fix the limit, then enforce it.', go: ['cfg>rl', 'gw>mon'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A rate limiter answers one question: "should I let this client in right now?" The count lives in a <strong>shared Redis</strong>, so all gateways see one count.</li>
      <li>The limiter sits at the <strong>gateway</strong> (or as a separate service); rules live in a config file, with hot reload, and new rules start in <strong>shadow mode</strong>.</li>
      <li>Count by: API key, user, IP, endpoint. Several rules at once; IP limits block people on shared Wi-Fi (NAT) together.</li>
      <li>Algorithm: <strong>token bucket</strong> by default (2 numbers per key); the sliding window counter if you need it smooth. Details in the <a href="#/rate-limiting">Rate limiting</a> lesson.</li>
      <li>"Read, check, write" in one <strong>atomic Lua script</strong>; time from Redis; a TTL on every key; hash tags in Redis Cluster.</li>
      <li>Save latency: a local cache of over-limit keys, a local bucket first, the global one after.</li>
      <li>If Redis fails, the default is <strong>fail-open + local fallback</strong>; fail-closed on login/OTP/money. Kill switch and metrics.</li>
      <li>Many regions: each region counts its own (split the limit or use a home region); a strict global counter brings latency and a SPOF.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Rules in one place, for all services; app code stays clean', 'Token bucket + Lua: two numbers per key, no race condition', 'Local cache and local bucket: bots never reach Redis', 'Fail-open: a limiter outage does not become a site outage', 'Per-region counting: fast, and separate from a region failure'], costs: ['One extra hop on every request (~1 ms)', 'An approximate count: a little over-allowing is possible', 'With fail-open, bots are free during the outage', 'One more system to run and monitor (Redis Cluster + service)', 'With many regions, either split the limit or accept an overshoot'] },

    { type: 'think', questions: [
      { q: 'The xyz.com OTP endpoint spends money on every SMS. Redis is down. Fail-open or fail-closed? Is there a middle way?', a: 'Fail-closed is more correct, because with fail-open a bot could trigger lakhs of SMS (a huge bill + spam). The middle way: run the gateway\'s local bucket (per phone number / per IP, a rough limit), so real users keep getting OTPs and the bot is stopped. Plus an alert.' },
      { q: 'An enterprise customer has a limit of 50,000 req/s. All its traffic goes to one Redis key. What problem will this cause, and how will you solve it?', a: 'A hot key: 50k Lua calls/s on one shard, and that shard becomes the bottleneck. Options: split the limit into several sub-keys (like 10 keys of 5,000/s each, send each request to a random sub-key, slightly inaccurate); or give each gateway a "quota" from time to time (like a batch of 500 tokens), so it does not need Redis on every request; a local pre-filter.' },
      { q: 'Why did Stripe build a "concurrent requests limiter" when it already had a request rate limiter?', a: 'The rate limiter only counts "how many requests per second". But if a costly endpoint takes 10 seconds, even 10 req/s means 100 requests running at once, and the CPU fills up. The concurrent limiter counts "how many are running at the same time", which is directly tied to resource use.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why a Lua script, and not separate GET and SET commands?', options: ['Lua is a fast language', 'The script runs atomically in Redis, so another gateway\'s command cannot get in between', 'Redis has no SET'], answer: 1, explain: 'Read, check and write in one step. With separate commands, a race condition in between lets requests past the limit.' },
      { q: 'What is the default of Envoy\'s HTTP rate limit filter when the rate limit service returns an error?', options: ['Reject the request (fail-closed)', 'Allow the request (fail-open), failure_mode_deny = false', 'Put the request in a queue'], answer: 1, explain: 'The default is fail-open, and the failure_mode_allowed counter goes up. With failure_mode_deny: true, an error gives a 500.' },
      { q: 'Why did Cloudflare keep per-PoP counters instead of a global counter?', options: ['A global counter is very costly and adds latency; with anycast, one source\'s traffic usually reaches one PoP', 'Memcache cannot run globally', 'Each PoP has different rules'], answer: 0, explain: 'Asking a far-away counter on every request adds latency. Because of anycast, per-PoP counting was accurate enough.' },
      { q: 'What bug did GitHub find because of counts read from a replica?', options: ['Requests were counted twice', 'The headers of a rejected request showed the full quota left', 'Redis crashed'], answer: 1, explain: 'The replica was behind. Fix: store and check the window expiry yourself, and decide on the primary with an atomic script.' },
      { q: 'xyz.com set "5 / minute per IP" on login. 300 students of a college started getting 429. Why?', options: ['Redis is down', 'All the students are behind one public IP (NAT), so all their logins are counted in one counter', 'The students typed wrong passwords'], answer: 1, explain: 'IPs are shared. Keep the IP limit loose and add a per-account limit too. This is what happened to Riya and Aman in the rules widget.' },
      { q: 'Why put a new rule in shadow mode first?', options: ['Shadow mode is cheaper', 'See on real traffic who would be blocked, without blocking anyone; then fix the limit and enforce it', 'Shadow mode does not need Redis'], answer: 1, explain: 'Stripe calls this a dark launch. It removes the risk of blocking your own good customers with a wrong limit.' },
    ]},
    { type: 'sources', note: 'The Stripe, Cloudflare and GitHub posts are a few years old (2017, 2017, 2021); their systems may have changed since then. The ideas are still standard today.', items: [
      { title: 'Scaling your API with rate limiters', publisher: 'Stripe blog', official: true, year: 2017, url: 'https://stripe.com/blog/rate-limiters', used: 'Four limiter types, token bucket, Redis, ~20% fleet reserved for critical requests, traffic tiers for worker shedder, fail-open advice, dark launch, kill switches, 429/503.' },
      { title: 'How we built rate limiting capable of scaling to millions of domains', publisher: 'Cloudflare blog', official: true, year: 2017, url: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/', used: 'Sliding window approximation formula and 42/18/15s example, 0.003% error over 400M requests from 270k sources, ~6% average difference, per-PoP memcache, anycast, async increments, locally cached mitigation flag.' },
      { title: 'envoyproxy/ratelimit (README)', publisher: 'Envoy project on GitHub (originally Lyft)', official: true, url: 'https://github.com/envoyproxy/ratelimit', used: 'Domain/descriptor YAML rules, nested descriptors, shadow_mode, unit + requests_per_unit, ShouldRateLimit OK/OVER_LIMIT, Redis backend, fixed windows, local cache of over-limit keys, pipelining, separate per-second Redis, hot reload.' },
      { title: 'HTTP rate limit filter and Global rate limiting overview', publisher: 'Envoy documentation', official: true, url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting', used: 'failure_mode_deny default false (fail-open), 500 when true, failure_mode_allowed stat; local token bucket in front of global service to absorb bursts.' },
      { title: 'How we scaled the GitHub API with a sharded, replicated rate limiter in Redis', publisher: 'GitHub blog', official: true, year: 2021, url: 'https://github.blog/engineering/infrastructure/how-we-scaled-github-api-sharded-replicated-rate-limiter-redis/', used: 'Memcached eviction and per-datacenter problems, client-side sharded Redis with primary/replicas, Lua scripts, reset-time and replica-staleness bugs and fixes.' },
      { title: 'Scripting with Lua', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/programmability/eval-intro/', used: 'Atomic script execution blocking the server, keys passed via KEYS, EVALSHA and volatile script cache (NOSCRIPT), effects replication default from Redis 5.' },
    ]},
  ],
});
