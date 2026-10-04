(function () {
  /* Shared step-by-step engine for the five algorithm visualisers. Each one passes its own algorithm (init/send/tick/panel). */
  const RLUI = { one: 'Send 1 request', burst: 'Burst ×10', t1: 'Clock +1 s', t5: 'Clock +5 s', reset: 'Reset', clock: 'Clock', ok: 'Allowed', no: 'Blocked (429)',
    legend: 'Timeline: each dot is one request. Green = allowed, red = blocked, yellow = waiting in the queue. The outlined slot = the current second.', aria: 'Timeline of requests',
    burstNote: (n, a, b, q) => `${n} requests at once: ${a} allowed${q ? `, ${q} in the queue` : ''}, ${b} blocked.` };
  const fmt = x => String(Math.round(x * 100) / 100);
  const COL = { ok: 'var(--green)', no: 'var(--red)', q: 'var(--amber)' };
  function rlViz(el, o) {
    const p = {};
    const sl = (o.params || []).map(q => `<div><label>${q.label}: <strong class="rv-${q.key}"></strong> ${q.unit}</label><input type="range" aria-label="${q.label}" data-k="${q.key}" min="${q.min}" max="${q.max}" step="${q.step}" value="${q.val}"></div>`).join('');
    el.innerHTML = `${sl ? `<div class="row2">${sl}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
        <button type="button" class="btn small primary" data-a="one">${RLUI.one}</button>
        <button type="button" class="btn small" data-a="burst">${RLUI.burst}</button>
        <button type="button" class="btn small" data-a="t1">${RLUI.t1}</button>
        <button type="button" class="btn small" data-a="t5">${RLUI.t5}</button>
        ${(o.extra || []).map((x, i) => `<button type="button" class="btn small" data-x="${i}">${x.label}</button>`).join('')}
        <button type="button" class="btn small ghost" data-a="reset">${RLUI.reset}</button>
      </div>
      <div class="rv-panel" style="margin-top:14px"></div>
      <div style="font-size:13px;color:var(--ink-3);margin-top:12px">${RLUI.legend}</div>
      <div class="rv-tl"></div>
      <div class="stats rv-stats"></div>
      <div class="calc-note rv-note"></div>`;
    let s, reqs, t, note;
    const begin = () => { if (o.begin) o.begin(s); };
    const reset = () => { el.querySelectorAll('input[data-k]').forEach(i => { p[i.dataset.k] = Number(i.value); }); s = o.init(p); reqs = []; t = 0; note = o.start; draw(); };
    const send = n => { begin(); let a = 0, b = 0, q = 0, last = '';
      for (let i = 0; i < n; i++) { const r = { t, st: 'no', id: reqs.length + 1 }; last = o.send(s, t, r, p); reqs.push(r); if (r.st === 'ok') a++; else if (r.st === 'q') q++; else b++; }
      note = n > 1 ? RLUI.burstNote(n, a, b, q) + ' ' + last : last; draw(); };
    const tick = k => { begin(); let last = ''; for (let i = 0; i < k; i++) { t++; const m = o.tick ? o.tick(s, t, p, k > 1) : ''; if (m) last = m; } note = last || o.idle(s, t, p); draw(); };
    const draw = () => {
      (o.params || []).forEach(q => { el.querySelector('.rv-' + q.key).textContent = p[q.key]; });
      el.querySelector('.rv-panel').innerHTML = o.panel(s, t, p, reqs);
      const T0 = Math.max(0, t - 15), X = v => 24 + (v - T0) * 29;
      let svg = `<svg viewBox="0 0 640 120" width="100%" role="img" aria-label="${RLUI.aria}" style="font-family:var(--f-mono);display:block;margin-top:4px;min-width:520px">`;
      svg += o.overlay ? o.overlay(s, t, X, T0, p) : '';
      svg += `<rect x="${X(t) + 1}" y="22" width="27" height="72" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
      for (let v = T0; v <= T0 + 20; v++) svg += `<line x1="${X(v)}" y1="96" x2="${X(v)}" y2="${v % 5 ? 100 : 104}" stroke="var(--line-2)"/>` + (v % 5 ? '' : `<text x="${X(v)}" y="116" font-size="11" text-anchor="middle" fill="var(--ink-3)">${v}s</text>`);
      svg += `<line x1="24" y1="96" x2="${X(T0 + 20)}" y2="96" stroke="var(--line-2)"/>`;
      const by = {}; reqs.forEach(r => { if (r.t >= T0 && r.t < T0 + 20) (by[r.t] = by[r.t] || []).push(r); });
      Object.keys(by).forEach(k => { const a = by[k], d = Math.min(7, 64 / a.length); a.forEach((r, i) => { svg += `<circle cx="${X(+k) + 14.5}" cy="${88 - i * d}" r="3.4" fill="${COL[r.st]}"/>`; }); });
      el.querySelector('.rv-tl').innerHTML = '<div style="overflow-x:auto">' + svg + '</svg></div>';
      const st = [[RLUI.clock, t + ' s'], [RLUI.ok, reqs.filter(r => r.st === 'ok').length], [RLUI.no, reqs.filter(r => r.st === 'no').length], ...(o.stats ? o.stats(s, t, p) : [])];
      el.querySelector('.rv-stats').innerHTML = st.map(([a, b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');
      el.querySelector('.rv-note').innerHTML = note;
    };
    const api = { send, tick, reset, note: m => { note = m; draw(); } };
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ({ one: () => send(1), burst: () => send(10), t1: () => tick(1), t5: () => tick(5), reset })[b.dataset.a]());
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => o.extra[+b.dataset.x].run(api));
    el.querySelectorAll('input[data-k]').forEach(i => i.addEventListener('input', reset));
    reset();
  }

Lesson.register({
  id: 'rate-limiting',
  title: 'Rate limiting',
  minutes: 38,
  summary: `A cap on how many requests one client can send. It protects the system from bots, buggy scripts and sudden spikes. In this lesson: all five algorithms (token bucket, leaky bucket, fixed window, sliding window log, sliding window counter), each with its own simulator, distributed limiting with Redis + Lua, where to limit and on what key, 429 + Retry-After, how clients should back off, load shedding, and limiting AI products by tokens.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine one person (or one bot) presses "refresh" on your website a thousand times in one second. The server drops everything else to serve that one person, and the site freezes for everyone else.<br>Rate limiting is a simple rule: <strong>"each person can only ask this many times per minute."</strong> If someone asks more, the answer is: "please wait a bit, then come back."<br>In this lesson we will see how this counting is done (5 ways, and you can run each one), where the rule sits, and how the count stays correct even when there are many servers.` },
    { type: 'h2', text: 'The problem: one client brings down the whole system' },
    { type: 'p', html: `xyz.com is big now: Load Balancer, cache, queues, object storage, all in place. One night, three things happen at the same time:` },
    { type: 'list', items: [
      `<strong>Bot attack:</strong> someone sends 10,000 password guesses per minute to <code>POST /login</code> (password guessing; when stolen passwords are tried, it is called <em>credential stuffing</em>).`,
      `<strong>Buggy client:</strong> a partner company's script has a bug. When it gets an error, it retries right away, without stopping. 500 requests per second instead of 1.`,
      `<strong>One heavy user:</strong> a developer started to scrape the whole catalogue with a free API key (scrape = run a program that copies all the data).`,
    ]},
    { type: 'p', html: `All three have one thing in common: <strong>some clients ask for far more than their fair share</strong>. The number of servers and databases stays the same. Result: the site is slow for every user, and maybe down. Autoscaling (starting new servers automatically when load goes up) does not solve it either: you pay for new servers to serve abuse, and there is still only one database.` },
    { type: 'callout', tone: 'term', title: 'New word: rate limiting', html: `<strong>What it is:</strong> a rule that says "one client can send only this many requests in a time window", for example "100 requests per minute". A client means any identity: one user, one IP address, or one API key.<br><strong>Why we need it:</strong> so that one client (a bot, a buggy script, or a heavy user) cannot eat all the time of the servers and the database.<br><strong>Without it:</strong> one client's mistake or attack makes the site slow or down for all users.<br><strong>Example:</strong> xyz.com login: 10 attempts per minute from one IP. The 11th attempt gets "429: please wait" right away. It never reaches the server.<br>This is also called <strong>throttling</strong>. A long-term limit (like "10,000 per month") is often called a <strong>quota</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: request and 429', html: `A <strong>request</strong> = the client asking the server for something once (opening a page, pressing login, one API call). <strong>429</strong> is an HTTP status code, which is a number in the server's answer. 200 means "OK", 404 means "not found", and <strong>429 Too Many Requests</strong> means "you asked too much, please wait". We will look at it in detail later.` },
    { type: 'compare',
      left: { title: 'Without a rate limit', ascii: `
Bot (10,000/min) ─┐
Buggy script ─────┼──> Servers ──> DB (overload)
Normal users ─────┘     (slow for
                        everyone)` },
      right: { title: 'With a rate limit', ascii: `
Bot ──────────> Limiter ──X 429
Buggy script ─> Limiter ──X 429 (some pass)
Normal users ─> Limiter ──────> Servers ──> DB
                (each client
                 has its own cap)` },
    },
    { type: 'h2', text: 'Why rate limit? Five plain reasons' },
    { type: 'list', ordered: true, items: [
      `<strong>Security:</strong> if a password-guessing bot gets 10 tries per minute, trying 1 million passwords takes it about 70 days (1,000,000 ÷ 10 = 100,000 minutes). The attack becomes useless.`,
      `<strong>Protection from bugs:</strong> someone's script got stuck in a loop by mistake. The limit keeps the damage to that script's own share.`,
      `<strong>Fairness:</strong> one heavy user cannot take the whole server. Other users keep their share too.`,
      `<strong>Cost:</strong> some requests cost money: every OTP SMS, every AI answer (GPU). Without a limit, someone else decides how big your bill gets.`,
      `<strong>Trust in capacity:</strong> you know the DB can handle 5,000 queries per second. With limits in place, this number is never crossed, whatever happens outside.`,
    ]},
    { type: 'h2', text: 'Where the rate limiter sits: run it and see' },
    { type: 'callout', tone: 'term', title: 'New word: rate limiter and API gateway', html: `<strong>What it is:</strong> a <strong>rate limiter</strong> is the code that asks, for every request, "is this client still under its limit?" It usually lives in the <strong>API gateway</strong>. The API gateway is the single front door for all API requests: a request comes here first, then goes to the right service (the resilience lesson covers it in detail).<br><strong>Why we need it:</strong> stop it at the door, and the useless request never reaches the servers and the database inside. Each service does not have to write its own counting.<br><strong>Without it:</strong> every service counts on its own, with different rules, and abusive requests travel all the way inside and waste money and time.` },
    { type: 'callout', tone: 'term', title: 'Remember: Redis', html: `<strong>What it is:</strong> a very fast database that keeps data in RAM (you saw it in the caching lesson). One command takes less than about 1 ms.<br><strong>Why we need it:</strong> xyz.com has several gateways. All of them must see the same count, so the count is kept in one shared place: Redis.<br><strong>Without it:</strong> each gateway keeps its own count, and a client can switch between gateways and send many times more than the limit (you will see this under "Distributed limiting").` },
    { type: 'p', html: `The flow is simple. For every request, the gateway checks that client's count in Redis. Under the limit: send the request on. Over the limit: return <code>429</code> right away. Press "Next step" below and watch:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'Riya', sub: 'normal user', x: 80, y: 70, w: 130, kind: 'client', info: 'What it is: a normal user using the xyz.com app. 20-30 requests per minute. A good limit is one that Riya never even notices.' },
        { id: 'bot', label: 'Bot', sub: '10k req/min', x: 80, y: 260, w: 130, kind: 'threat', info: 'What it is: a program (bot) that keeps sending password guesses to login, from one IP or a few IPs. This is what we must stop.' },
        { id: 'gw', label: 'API gateway', sub: 'rate limiter', x: 320, y: 165, w: 160, kind: 'edge', info: 'What it is: the front door for all requests, with the rate limiter inside. For each request it builds a key (like "login:ip:1.2.3.4" or "api:user:42"), checks the count for that key in Redis, then allows or returns 429. This check should take about 1 ms, or every request gets slower.' },
        { id: 'r', label: 'Redis', sub: 'counters / buckets', x: 570, y: 265, w: 160, kind: 'cache', info: 'What it is: a fast database that runs in RAM. Here it holds the shared count for all gateways (counters, buckets). It has commands that finish in one go (INCR, Lua scripts), so the count does not go wrong. If these counters are lost, no real user data is lost, which is why Redis fits well here.' },
        { id: 'app', label: 'App servers', sub: 'real work', x: 570, y: 65, w: 160, kind: 'server', meter: true, load: 30, info: 'What it is: the servers of xyz.com that do the real work (login, feed, search). The whole job of the rate limiter is to protect them from useless traffic.' },
      ],
      edges: [{ a: 'u', b: 'gw' }, { a: 'bot', b: 'gw' }, { a: 'gw', b: 'r' }, { a: 'gw', b: 'app' }],
      scenarios: [
        { name: 'Normal request', steps: [
          { title: 'Riya logs in', text: 'The request reaches the gateway.', go: 'u>gw', msg: 'POST /login  (IP 49.36.x.x)' },
          { title: 'Check the count', text: 'The gateway asks Redis: how many login requests did this IP make in the last minute? 1. The limit is 10. Fine.', go: ['gw>r', 'res:r>gw'], after: { r: { sub: 'login:49.36..: 1/10' } }, msg: 'rate check  key=login:ip:49.36.x.x  →  allowed (remaining 9)' },
          { title: 'Send it on', text: 'The request reaches the app server and the answer comes back. It carries headers that tell the client how much is left.', go: ['gw>app', 'res:app>gw', 'res:gw>u'], msg: '200 OK\nRateLimit-Policy: "login";q=10;w=60\nRateLimit: "login";r=9;t=60' },
        ]},
        { name: 'Bot gets 429', steps: [
          { title: 'The bot floods', text: 'The bot keeps sending requests.', flood: { paths: ['bot>gw'], n: 10 }, after: { gw: { state: 'hot' } } },
          { title: 'First 10 pass, then stop', text: 'The first 10 requests use up the limit. From the 11th on, the gateway checks Redis and refuses right away. Not a single extra request reached the app servers.', go: ['gw>r', 'res:r>gw', 'bad:gw>bot'], after: { r: { sub: 'login:bot: 10/10' } }, set: { app: { load: 30 } }, msg: '429 Too Many Requests\nRetry-After: 42\n{ "error": "too many login attempts, try after 42 s" }' },
          { title: 'App servers stay calm', text: 'Riya\'s requests work as normal. The bot\'s load stopped at the gateway, and sending a 429 is very cheap work.', go: ['u>gw>app', 'res:app>gw>u'], set: { gw: { state: '' } }, after: { app: { state: 'ok' } } },
        ]},
        { name: 'Redis down', intro: 'The limiter is itself a dependency. What if it fails?', steps: [
          { title: 'Redis crashes', text: 'The gateway cannot check the count.', set: { r: { state: 'down', sub: 'DOWN' } }, go: 'lost:gw>r' },
          { title: 'Option 1: fail-open', text: 'Skip the limit check and let all requests through. The site keeps running, just without protection for a while. Stripe gave this advice in its rate limiting post (2017): a problem in the limiter should not block real traffic.', go: ['u>gw>app', 'res:app>gw>u'] },
          { title: 'Option 2: fail-closed', text: 'If you cannot check, refuse. For sensitive endpoints like login or OTP this is sometimes right (do not leave the door open for brute force). The price: Redis down = feature down. A middle path: each gateway keeps its own local, slightly looser limit as a fallback.', go: 'bad:gw>u' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Fail-open vs fail-closed', html: `<strong>What it is:</strong> the decision for when a safety part (limiter, login check) itself breaks. <strong>Fail-open</strong> = leave the door open (the site keeps running, availability first). <strong>Fail-closed</strong> = shut the door (safety first).<br><strong>Why we need it:</strong> Redis will fail one day too. You must decide in advance what to do then.<br><strong>Without it:</strong> Redis goes down and either the whole site stops (everything fail-closed), or the OTP endpoint is open with no limit (everything fail-open).<br>Each endpoint (one address of the API, like <code>POST /login</code>) can have its own decision: the feed API fail-open, sending OTPs fail-closed.` },
    { type: 'p', html: `One more point: the limit is always applied <strong>on the server side</strong>. Code inside the app like "the button can be pressed only once per second" is nice (fewer useless requests), but you cannot trust it. A bot does not use your app at all. It sends requests straight to the API.` },
    { type: 'h2', text: 'How do we count? Five algorithms' },
    { type: 'p', html: `All five algorithms answer one question: <strong>"should we allow this new request or not?"</strong> They differ in three things: how much <strong>memory</strong> they need per client, what happens with many requests arriving together (a <strong>burst</strong>), and how <strong>exact</strong> the count is.` },
    { type: 'callout', tone: 'term', title: 'New word: burst', html: `<strong>What it is:</strong> many requests at almost the same moment. For example, the xyz.com app sends 8 API calls together as soon as it opens (profile, feed, notifications...).<br><strong>Why it matters:</strong> real users are bursty. A good algorithm lets small, normal bursts through and stops big abuse.<br><strong>Without care:</strong> either the normal app gets 429 just by opening, or a bot gets away with one big burst.` },
    { type: 'p', html: `Each algorithm has its own <strong>simulator</strong>. You control the clock: "Clock +1 s" moves time forward, "Send 1 request" or "Burst ×10" sends requests, and you can see the inside state live (bucket, queue, counters, timestamps). To keep it easy, most simulators use a limit of <strong>5 requests per 10 seconds</strong>.` },

    { type: 'h2', text: 'Algorithm 1: token bucket (the default choice)' },
    { type: 'p', html: `Imagine every client has a <strong>bucket</strong> with <strong>tokens</strong> in it (small tickets, like coins).` },
    { type: 'steps', items: [
      { t: 'Each request takes one token', d: 'A request comes in, take one token out of the bucket, the request is allowed.' },
      { t: 'No token left? The request is blocked', d: 'If the bucket is empty, the request gets a 429.' },
      { t: 'The bucket refills by itself', d: 'New tokens keep arriving at a fixed speed, for example 1 token every 2 seconds.' },
      { t: 'But never above capacity', d: 'When the bucket is full, new tokens are thrown away. So nobody can send a burst bigger than the capacity in one go.' },
    ]},
    { type: 'callout', tone: 'term', title: 'The two numbers of a token bucket', html: `<strong>Capacity (burst size):</strong> the most tokens the bucket can hold. This decides how many requests can go through at once.<br><strong>Refill rate:</strong> how many new tokens arrive per second. This is the long-term average speed.<br><strong>Example:</strong> capacity 5, refill 0.5/s = "up to 5 at once is fine, but over a long time never more than 0.5 per second (that is, 5 per 10 s)".` },
    { type: 'p', html: `<strong>A small worked example (capacity 5, refill 0.5/s):</strong>` },
    { type: 'table', head: ['Clock', 'What happened', 'Tokens in the bucket', 'Result'], rows: [
      ['0 s', 'Start: the bucket is full', '5', ''],
      ['0 s', 'A burst of 10 requests', '5 → 0', '5 allowed, 5 blocked'],
      ['1 s', '+0.5 token arrived, 1 request', '0.5', 'Blocked (less than 1). Retry-After = (1 − 0.5) ÷ 0.5 = 1 s'],
      ['2 s', '+0.5 token, 1 request', '1 → 0', 'Allowed'],
      ['12 s', 'Nothing sent for 10 seconds', '5 (stopped at capacity)', 'The bucket is full again, the next burst can be up to 5'],
    ]},
    { type: 'p', html: `Now run it yourself. Do the same as the table above: "Burst ×10", then "Clock +1 s", then "Send 1 request". Change the capacity and refill rate with the sliders and watch:` },
    { type: 'custom', render(el) {
      rlViz(el, {
        params: [
          { key: 'cap', label: 'Capacity', unit: 'tokens', min: 1, max: 10, step: 1, val: 5 },
          { key: 'rate', label: 'Refill rate', unit: 'tokens/sec', min: 0.5, max: 3, step: 0.5, val: 0.5 },
        ],
        start: 'The bucket is full. Press "Burst ×10" and see how many requests get through.',
        init: p => ({ tok: p.cap, used: 0 }),
        send: (s, t, r, p) => {
          if (s.tok >= 1 - 1e-9) { s.tok -= 1; s.used++; r.st = 'ok'; return `Allowed: one token was used. ${fmt(s.tok)} left in the bucket.`; }
          return `Blocked: only ${fmt(s.tok)} token in the bucket (less than 1). The client gets a 429, Retry-After = (1 − ${fmt(s.tok)}) ÷ ${p.rate} = ${fmt((1 - s.tok) / p.rate)} s.`;
        },
        tick: (s, t, p, many) => { const b = s.tok; s.tok = Math.min(p.cap, s.tok + p.rate);
          return many ? '' : s.tok > b + 1e-9 ? `${t} s: +${fmt(s.tok - b)} token arrived (refill ${p.rate}/s). The bucket now has ${fmt(s.tok)} / ${p.cap}.` : `${t} s: the bucket was already full (${p.cap}). The new token was thrown away: it cannot store more than its capacity.`; },
        idle: (s, t, p) => `${t} s: the bucket now has ${fmt(s.tok)} / ${p.cap} tokens${s.tok >= p.cap - 1e-9 ? ' (full: it will not store more)' : ''}.`,
        panel: (s, t, p) => {
          let h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">';
          for (let i = 0; i < p.cap; i++) { const f = Math.max(0, Math.min(1, s.tok - i)) * 100;
            h += `<span style="width:26px;height:26px;border-radius:50%;border:2px solid var(--accent);background:linear-gradient(to top, var(--accent) ${f}%, transparent ${f}%)"></span>`; }
          return h + `</div><div style="font-size:14px;margin-top:8px;color:var(--ink-2)">Bucket: <strong>${fmt(s.tok)} / ${p.cap}</strong> tokens. Refill is ${p.rate} per second, so an empty bucket fills up in ${fmt(p.cap / p.rate)} s. Over a long time, never more than ${p.rate}/s on average will pass.</div>`;
        },
        stats: s => [['Tokens used', s.used]],
      });
    }},
    { type: 'p', html: `It is very cheap to build. No timer runs every second to "drop in" tokens. For each client only two numbers are stored: <code>tokens</code> and <code>last_refill_time</code>. When a request arrives, work out how much time has passed since last time, and add that many tokens:` },
    { type: 'code', text: `
now     = current time
tokens  = min(capacity, tokens + (now - last_refill_time) * refill_rate)
last_refill_time = now
if tokens >= 1:  tokens -= 1;  ALLOW
else:            REJECT  (Retry-After = (1 - tokens) / refill_rate seconds)` },
    { type: 'list', items: [
      `<strong>Pros:</strong> small bursts are allowed (up to capacity), and the long-term average is fixed (refill rate). Only 2 numbers per client. One request can also "cost" more than 1 (for example, a heavy search = 5 tokens).`,
      `<strong>Cons:</strong> you must pick two knobs (capacity, rate) well. A full bucket means that after a long quiet time, the first burst can be as big as the capacity, so the systems behind it must be able to handle that burst.`,
      `<strong>Where it is used:</strong> AWS API Gateway describes its throttling as a token bucket (rate + burst). Stripe's 2017 post describes a token bucket in Redis. Anthropic's Claude API docs also apply limits as a token bucket (capacity refills all the time).`,
    ]},
    { type: 'callout', tone: 'why', title: 'Why is token bucket the default?', html: `Real users are "bursty": 8 API calls together when the app opens, then nothing for 30 seconds. A token bucket lets these small bursts through easily (up to capacity), but keeps the long-term average speed fixed (refill rate). And it needs only two numbers of memory per client.` },
    { type: 'h2', text: 'Algorithm 2: leaky bucket' },
    { type: 'p', html: `Now think the other way round. The bucket does not fill with tokens, it fills with <strong>requests</strong>. At the bottom of the bucket there is a small hole, and requests drip out of it at a <strong>fixed speed</strong> to the server (for example, one every 2 seconds). If the bucket is full, a new request falls outside (rejected).` },
    { type: 'callout', tone: 'term', title: 'New word: queue (a line)', html: `<strong>What it is:</strong> a line of requests. Whoever comes first goes first. The "bucket" in a leaky bucket is really this line.<br><strong>Why we need it:</strong> instead of refusing burst requests right away, sit them in a line and give them to the server one by one at an even speed.<br><strong>Without it:</strong> the burst would hit the server directly, and a weak server (like an old payment service that cannot take more than 5/s) would get stuck.` },
    { type: 'ascii', text: `
requests (bursty)  ▼▼▼▼▼ ▼   ▼▼▼
                 ┌───────────┐
                 │ ● ● ● ● ● │  queue (capacity 5)   full? → reject
                 └─────┬─────┘
                       │  fixed rate: 1 request every 2 sec
                       ▼
                    Server   (always smooth, never a burst)` },
    { type: 'p', html: `<strong>A small worked example (queue 5, rate 0.5/s, so one every 2 s):</strong> at clock 0 s a burst of 10 requests arrives. The server was free, so the first request went straight through. The next 5 join the line: they reach the server after 2, 4, 6, 8 and 10 seconds. There is no room in the line for the other 4, so they are dropped. Notice: the 5th request in the line waits <strong>10 seconds</strong>. It was not rejected, but it arrived very late.` },
    { type: 'p', html: `Run it and see. Press "Burst ×10", then press "Clock +1 s" again and again, and watch the line empty at a fixed speed:` },
    { type: 'custom', render(el) {
      rlViz(el, {
        params: [
          { key: 'qcap', label: 'Queue capacity', unit: 'requests', min: 1, max: 10, step: 1, val: 5 },
          { key: 'rate', label: 'Leak rate', unit: 'requests/sec', min: 0.5, max: 2, step: 0.5, val: 0.5 },
        ],
        start: 'The queue is empty and the server is free. Press "Burst ×10".',
        init: () => ({ q: [], free: 0, drop: 0 }),
        send: (s, t, r, p) => {
          if (!s.q.length && s.free <= t + 1e-9) { r.st = 'ok'; s.free = t + 1 / p.rate; return 'The queue was empty and the server was free: the request went straight to the server, 0 s wait.'; }
          if (s.q.length < p.qcap) { r.st = 'q'; r.at = Math.max(s.free, t); s.free = r.at + 1 / p.rate; s.q.push(r); return `Joined the line at position ${s.q.length}. It will reach the server in ${fmt(r.at - t)} s.`; }
          s.drop++; return `The queue is full (${p.qcap}/${p.qcap}): the request was dropped (overflow). The server still sees only ${p.rate}/s.`;
        },
        tick: (s, t, p, many) => { let n = 0; while (s.q.length && s.q[0].at <= t + 1e-9) { s.q.shift().st = 'ok'; n++; }
          return n ? `${t} s: ${n} request left the line and reached the server (fixed ${p.rate}/s). ${s.q.length} left in the line.` : many ? '' : (s.q.length ? `${t} s: nothing left the line this second (one every ${fmt(1 / p.rate)} s). ${s.q.length} in the line.` : `${t} s: the line is empty, and the server is sitting idle.`); },
        idle: (s, t) => `${t} s: ${s.q.length} in the line.`,
        panel: (s, t, p) => {
          let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:13px;color:var(--ink-3)">Line:</span>';
          for (let i = 0; i < p.qcap; i++) { const r = s.q[i];
            h += `<span style="min-width:52px;padding:4px 6px;border-radius:8px;text-align:center;font:600 12px var(--f-mono);border:2px solid ${r ? 'var(--amber)' : 'var(--line-2)'};color:var(--ink)">${r ? `#${r.id}<br>${fmt(r.at - t)} s` : '&nbsp;<br>&nbsp;'}</span>`; }
          return h + `<span style="font:600 13px var(--f-mono);color:var(--ink-2)">→ server (${p.rate}/s)</span></div><div style="font-size:14px;margin-top:8px;color:var(--ink-2)">Each box shows the request number and "time left until it reaches the server". In the line: <strong>${s.q.length}/${p.qcap}</strong>. Extra wait for the last one in the line: <strong>${s.q.length ? fmt(s.q[s.q.length - 1].at - t) : 0} s</strong>.</div>`;
        },
        stats: s => [['In the line (yellow)', s.q.length], ['Dropped (overflow)', s.drop]],
      });
    }},
    { type: 'list', items: [
      `<strong>Pro:</strong> the systems behind it get perfectly smooth traffic. Perfect for a weak service or an outside API (one that says "do not send more than 2 per second").`,
      `<strong>Cons:</strong> requests that arrive in a burst are not rejected, they <em>wait</em>. A long line = more latency (up to 10 s above!). For user clicks this is often bad. And when the line is full, a new, important request is dropped too.`,
      `<strong>Where it is used:</strong> the NGINX <code>limit_req</code> module calls itself the "leaky bucket" method in its own docs. There, <code>burst=5</code> means 5 extra requests can wait in the line (just like the simulator above), and with <code>nodelay</code> they do not wait in the line. When the line is full, NGINX returns 503 by default; <code>limit_req_status 429</code> changes it to 429.`,
      `<strong>Careful:</strong> the name "leaky bucket" is used in two ways. One: the queue above. Two: a counter that goes down at a fixed speed (also called a "meter"): when it is full, the request gets 429 right away, with no waiting. This second form works the same as a token bucket in maths. The Shopify REST Admin API uses this second form: a bucket of 40 requests that empties at 2 per second. In an interview, say which meaning you are using.`,
    ]},
    { type: 'h2', text: 'Algorithm 3: fixed window counter' },
    { type: 'p', html: `The simplest way. Split time into equal <strong>windows</strong> (slots), like 0-10 s, 10-20 s, 20-30 s. Each window has a <strong>counter</strong>. A request comes in: counter +1. The counter reaches the limit: the remaining requests are blocked. A new window starts: the counter goes back to zero.` },
    { type: 'callout', tone: 'term', title: 'New word: window and counter', html: `<strong>What it is:</strong> a <strong>window</strong> = a piece of time, like "from 12:00 to 12:01". A <strong>counter</strong> = a number that counts how many requests came in that piece.<br><strong>Why we need it:</strong> the cheapest way to check a limit like "100 per minute": just one number per client.<br><strong>Without it:</strong> you would have to remember the full history of every request (which is what the sliding log does, and it is expensive).` },
    { type: 'p', html: `In Redis this is just two commands. Put the window number in the key, and each window gets its own key:` },
    { type: 'code', text: `
key = "rl:user42:" + floor(now / 60)      # like rl:user42:29384712 (window number)
count = INCR key                           # atomic +1, returns the new count
if count == 1: EXPIRE key 60               # old keys delete themselves
if count > 100: REJECT` },
    { type: 'p', html: `<strong>A small worked example (limit 5 per 10 s):</strong> at clock 3 s, 4 requests: counter 4, all allowed. At 7 s, 3 requests: the first is allowed (counter 5), the other 2 are blocked. At 10 s a new window starts, counter 0: now up to 5 are allowed again. Very cheap and easy to understand. But there is a hidden bug: the <strong>boundary burst</strong>.` },
    { type: 'ascii', text: `
Limit: 100 per minute

   window 12:00 - 12:01            window 12:01 - 12:02
|-------------------------------|-------------------------------|
                         100 req ▲▲▲ 100 req
                        12:00:59 │ 12:01:00
                                 │
            both windows within their limit, but 200 requests in 2 seconds!` },
    { type: 'p', html: `Each window did its job correctly. Still, around the boundary (the line between two windows), the client sent <strong>double</strong> the limit. If the server can really handle only 100/min, it fails right at that moment. In the simulator, press "Run the boundary trick" and watch it live. The strip at the top shows the counter of each window:` },
    { type: 'custom', render(el) {
      const W = 10, L = 5;
      rlViz(el, {
        start: 'Limit: 5 requests per 10 s window. Windows: 0-10 s, 10-20 s, 20-30 s...',
        init: () => ({ c: {} }),
        send: (s, t, r) => { const k = Math.floor(t / W); s.c[k] = s.c[k] || 0;
          if (s.c[k] < L) { s.c[k]++; r.st = 'ok'; return `Counter of window ${k * W}-${k * W + W} s: ${s.c[k]}/${L}. Allowed.`; }
          return `This window's counter is at ${L}/${L}. Blocked until a new window starts at ${(k + 1) * W} s (Retry-After ${(k + 1) * W - t} s).`; },
        tick: (s, t) => t % W === 0 ? `${t} s: a new window starts, the counter goes back to 0. What happened in the last window is now forgotten.` : '',
        idle: (s, t) => { const k = Math.floor(t / W); return `${t} s. Counter of this window (${k * W}-${k * W + W} s): ${s.c[k] || 0}/${L}. Reset at ${(k + 1) * W} s.`; },
        overlay: (s, t, X, T0) => { let g = '';
          for (let k = Math.floor(T0 / W); k * W < T0 + 20; k++) { const a = Math.max(T0, k * W), b = Math.min(T0 + 20, k * W + W);
            g += `<rect x="${X(a)}" y="2" width="${X(b) - X(a)}" height="94" fill="${k % 2 ? 'var(--surface-2)' : 'transparent'}" stroke="var(--line)"/><text x="${(X(a) + X(b)) / 2}" y="15" font-size="11" text-anchor="middle" fill="var(--ink-2)">${k * W}-${k * W + W}s: ${s.c[k] || 0}/${L}</text>`; }
          return g; },
        panel: (s, t, p, reqs) => { const k = Math.floor(t / W), c = s.c[k] || 0;
          const ts = reqs.filter(r => r.st === 'ok').map(r => r.t); let m = 0, from = 0, to = 0;
          for (let i = 0; i < ts.length; i++) { let n = 0, j = i; for (; j < ts.length && ts[j] < ts[i] + W; j++) n++; if (n > m) { m = n; from = ts[i]; to = ts[j - 1]; } }
          let h = `<div style="font-size:14px;color:var(--ink-2)">Current window: <strong>${k * W}-${k * W + W} s</strong> · counter <strong>${c}/${L}</strong> · resets in <strong>${(k + 1) * W - t} s</strong></div>`;
          h += `<div style="display:flex;gap:6px;margin-top:8px">${[...Array(L)].map((_, i) => `<span style="width:26px;height:14px;border-radius:4px;background:${i < c ? 'var(--accent)' : 'var(--surface-2)'};border:1px solid var(--line-2)"></span>`).join('')}</div>`;
          if (m > L) h += `<div style="margin-top:8px;color:var(--red);font-weight:600">Boundary burst: ${m} requests were allowed between ${from} s and ${to} s, but the limit was ${L} per ${W} s.</div>`;
          return h; },
        extra: [{ label: 'Run the boundary trick', run: api => { api.reset(); api.tick(9); api.send(10); api.tick(1); api.send(10);
          api.note('Sent 10 at clock 9 s: 5 allowed (the first window is now full). At 10 s a new window starts, counter 0: 5 more allowed. In just 2 seconds (9 s and 10 s), 10 requests got through: double the limit of 5 per 10 s.'); } }],
      });
    }},
    { type: 'list', items: [
      `<strong>Pros:</strong> the cheapest: one counter per client, one <code>INCR</code>. Easy to understand and easy to explain to users ("5,000 per hour, reset at the start of each hour").`,
      `<strong>Cons:</strong> up to double the limit can get through at a boundary. And at the moment of reset, all blocked clients come back together (a small storm).`,
      `<strong>Where it is used:</strong> long quotas (per day, per month) where double at the boundary is acceptable. The GitHub REST API gives a logged-in user 5,000 requests per hour, and the <code>x-ratelimit-reset</code> header tells when this hourly window resets: a form of fixed window.`,
    ]},
    { type: 'h2', text: 'Algorithm 4: sliding window log' },
    { type: 'p', html: `The cure for the boundary: do not make fixed slots at all. Write down the <strong>timestamp</strong> (the second it arrived) of every allowed request in a list. When a new request arrives, do two things: (1) remove timestamps older than 10 seconds from the list, (2) count how many are left. Below the limit: allow, and write down its timestamp too. This 10-second window moves forward every moment (it <em>slides</em>), so there is no boundary at all.` },
    { type: 'callout', tone: 'term', title: 'New word: timestamp and log', html: `<strong>What it is:</strong> a <strong>timestamp</strong> = the clock time when something happened (like "12:00:07"). A <strong>log</strong> = a list of such timestamps, like a diary.<br><strong>Why we need it:</strong> the exact answer to "how many in the last 10 seconds?" is only possible if you remember the time of every request.<br><strong>Without it:</strong> you only have counters, which forget when inside the window the requests came (and the boundary bug appears).` },
    { type: 'code', text: `
# Redis sorted set (score of each entry = timestamp)
ZREMRANGEBYSCORE key 0 (now - 60s)    # remove entries older than 60 s
count = ZCARD key                     # how many are left?
if count < 100:  ZADD key now req_id;  ALLOW
else:            REJECT` },
    { type: 'p', html: `<strong>A small worked example (limit 5 per 10 s):</strong> requests arrive at 1, 2, 3, 4 and 5 seconds: log = [1, 2, 3, 4, 5], all allowed. One more at 8 s: there are already 5 in the last 10 s, blocked. At 11 s: timestamp 1 is now 10 s old and is removed. Log = [2, 3, 4, 5], so it is allowed, and log = [2, 3, 4, 5, 11]. Never more than 5 in any 10 seconds.` },
    { type: 'p', html: `Watch the log list in the simulator. When you move the clock forward, old timestamps are crossed out and drop off. Also press "Run the boundary trick": this time the trick does not work.` },
    { type: 'custom', render(el) {
      const W = 10, L = 5;
      rlViz(el, {
        start: 'The log is empty. Limit: 5 in any 10 seconds.',
        begin: s => { s.gone = []; },
        init: () => ({ log: [], gone: [] }),
        send: (s, t, r) => { if (s.log.length < L) { s.log.push(t); r.st = 'ok'; return `There were ${s.log.length - 1} in the last 10 s (fewer than 5): allowed, and timestamp ${t} s was written to the log.`; }
          return `There are already ${L} in the last 10 s. Blocked. The oldest one (${s.log[0]} s) will be removed at ${s.log[0] + W} s: Retry-After ${s.log[0] + W - t} s.`; },
        tick: (s, t) => { const out = []; while (s.log.length && s.log[0] <= t - W) out.push(s.log.shift()); s.gone = s.gone.concat(out);
          return out.length ? `${t} s: timestamps ${out.join(', ')} are now 10 s old and were removed from the log. ${s.log.length} left in the log.` : ''; },
        idle: (s, t) => `${t} s. In the log: ${s.log.length}/${L}. Window: the seconds from ${Math.max(0, t - W + 1)} s to ${t} s.`,
        overlay: (s, t, X, T0) => { const a = Math.max(T0, t - W + 1);
          return `<rect x="${X(a)}" y="2" width="${X(t + 1) - X(a)}" height="94" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="4 3"/><text x="${X(a) + 6}" y="15" font-size="11" fill="var(--ink-2)">last 10 s</text>`; },
        panel: s => {
          const chip = (v, g) => `<span style="padding:3px 8px;border-radius:999px;font:600 12px var(--f-mono);border:1px solid ${g ? 'var(--line-2)' : 'var(--accent)'};color:${g ? 'var(--ink-3)' : 'var(--ink)'};${g ? 'text-decoration:line-through;' : ''}">${v} s</span>`;
          return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:13px;color:var(--ink-3)">Log:</span>${s.log.map(v => chip(v)).join('') || '<span style="color:var(--ink-3)">(empty)</span>'}${s.gone.map(v => chip(v, 1)).join('')}</div>
            <div style="font-size:14px;margin-top:8px;color:var(--ink-2)">Memory: <strong>${s.log.length}</strong> timestamps for this user × 8 bytes = <strong>${s.log.length * 8} bytes</strong> (plus the Redis overhead). With a limit of 1,000 per hour, up to 1,000 timestamps per user. 10 million users × 1,000 × 8 bytes = <strong>80 GB</strong>, just for timestamps.</div>`; },
        stats: s => [['Entries in the log', s.log.length]],
        extra: [{ label: 'Run the boundary trick', run: api => { api.reset(); api.tick(9); api.send(10); api.tick(1); api.send(10);
          api.note('At 9 s, 5 allowed, log = [9, 9, 9, 9, 9]. At 10 s the log still has 5 (the 9 s entries are not 10 s old yet), so all 10 are blocked. No boundary, no double.'); } }],
      });
    }},
    { type: 'list', items: [
      `<strong>Pro:</strong> exact. Never more than the limit in any 10 (or 60) seconds.`,
      `<strong>Cons:</strong> memory. One timestamp for every allowed request. If the limit is 10,000/hour, up to 10,000 per user. As shown above: gigabytes for tens of millions of users. And 3-4 Redis operations for every request.`,
      `<strong>A variant:</strong> some versions also write the timestamps of blocked requests into the log. Then a client that keeps spamming never gets in until it stops.`,
      `<strong>Where it is used:</strong> where the limit is small and must be exact: login attempts, OTP ("5 per hour"), password reset. A small limit = a small log, so memory is not a problem.`,
    ]},
    { type: 'h2', text: 'Algorithm 5: sliding window counter' },
    { type: 'p', html: `The middle path: as cheap as a fixed window, almost as exact as the log. Each client has only <strong>two counters</strong>: the <strong>previous window</strong> (like 0-10 s) and the <strong>current window</strong> (10-20 s). We do not remember when inside the previous window the requests came. So we assume they were <strong>spread evenly</strong> over the whole window, and make an estimate:` },
    { type: 'callout', tone: 'term', title: 'New word: weight', html: `<strong>What it is:</strong> how much of the previous window still falls inside "the last 10 seconds". If 3 seconds of the current window have passed, the last 10 seconds include the final 7 seconds of the previous window: weight = 7/10 = 0.7.<br><strong>Why we need it:</strong> with it, the old count does not drop to zero in one jump when a new window starts. It goes down slowly. The boundary burst is gone.<br><strong>Without it:</strong> this would just be a fixed window, with the boundary bug.` },
    { type: 'code', text: `
estimate = previous_count × weight + current_count
weight   = (window − time passed in the current window) / window

Cloudflare's example (limit 50/min), 15 s into the current minute:
  previous minute = 42,  so far = 18
  estimate = 42 × (60 − 15)/60 + 18 = 42 × 0.75 + 18 = 49.5   → below 50, ALLOW` },
    { type: 'p', html: `<strong>A small worked example (limit 5 per 10 s):</strong> 4 requests in the previous window (0-10 s), the clock is now at 13 s, and 1 in the current window. Estimate = 4 × 0.7 + 1 = 3.8. Below 5: allow (current is now 2). Next: 4 × 0.7 + 2 = 4.8: allow. Next: 4 × 0.7 + 3 = 5.8: block.` },
    { type: 'p', html: `In the simulator the formula runs live. Press "Run the boundary trick", then move the clock forward and watch the weight of the previous window go down:` },
    { type: 'custom', render(el) {
      const W = 10, L = 5;
      const calc = (s, t) => { const k = Math.floor(t / W), e = t - k * W, prev = s.c[k - 1] || 0, cur = s.c[k] || 0, w = (W - e) / W; return { k, e, prev, cur, w, est: prev * w + cur }; };
      const line = x => `${x.prev} × (10 − ${x.e})/10 + ${x.cur} = ${x.prev} × ${fmt(x.w)} + ${x.cur} = <strong>${fmt(x.est)}</strong>`;
      rlViz(el, {
        start: 'Limit: 5 per 10 s. Two counters: the previous window and the current window.',
        init: () => ({ c: {} }),
        send: (s, t, r) => { const x = calc(s, t);
          if (x.est < L) { s.c[x.k] = x.cur + 1; r.st = 'ok'; return `${line(x)} &lt; ${L} → ALLOW. The current counter is now ${x.cur + 1}.`; }
          return `${line(x)} ≥ ${L} → BLOCK (429).`; },
        tick: (s, t) => t % W === 0 ? `${t} s: a new window. The "current" counter is now the "previous" one (${s.c[t / W - 1] || 0}), and the new counter is 0. But the weight is still 1.0, so the old count did not vanish at once.` : '',
        idle: (s, t) => { const x = calc(s, t); return `${t} s. Current estimate: ${line(x)}. The next request will be ${x.est < L ? 'allowed' : 'blocked'}.`; },
        overlay: (s, t, X, T0) => { const x = calc(s, t); let g = '';
          [[x.k - 1, 'previous'], [x.k, 'current']].forEach(([k, nm]) => { if (k < 0) return; const a = Math.max(T0, k * W), b = Math.min(T0 + 20, k * W + W); if (b <= a) return;
            g += `<rect x="${X(a)}" y="2" width="${X(b) - X(a)}" height="94" fill="${nm === 'current' ? 'var(--surface-2)' : 'transparent'}" stroke="var(--line)"/><text x="${(X(a) + X(b)) / 2}" y="15" font-size="11" text-anchor="middle" fill="var(--ink-2)">${nm}: ${s.c[k] || 0}</text>`; });
          const a = Math.max(T0, t - W + 1);
          return g + `<rect x="${X(a)}" y="20" width="${X(t + 1) - X(a)}" height="76" rx="6" fill="none" stroke="var(--accent)" stroke-dasharray="4 3"/>`; },
        panel: (s, t) => { const x = calc(s, t);
          const box = (nm, v, sub) => `<div style="flex:1;min-width:120px;padding:8px 10px;border:1px solid var(--line-2);border-radius:10px"><div style="font-size:12px;color:var(--ink-3)">${nm}</div><div style="font:700 20px var(--f-display);color:var(--ink)">${v}</div><div style="font-size:12px;color:var(--ink-3)">${sub}</div></div>`;
          return `<div style="display:flex;flex-wrap:wrap;gap:8px">${box('Previous window', x.prev, x.k ? `${(x.k - 1) * W}-${x.k * W} s` : '(none yet)')}${box('Current window', x.cur, `${x.k * W}-${x.k * W + W} s, ${x.e} s passed`)}${box('Weight', fmt(x.w), `(10 − ${x.e}) / 10`)}</div>
            <div style="margin-top:10px;font:14px var(--f-mono);color:var(--ink)">estimate = ${line(x)} ${x.est < L ? '&lt;' : '≥'} ${L} → next request <strong style="color:${x.est < L ? 'var(--green)' : 'var(--red)'}">${x.est < L ? 'ALLOW' : 'BLOCK'}</strong></div>`; },
        stats: s => [['Memory', '2 counters']],
        extra: [{ label: 'Run the boundary trick', run: api => { api.reset(); api.tick(9); api.send(10); api.tick(1); api.send(10);
          api.note('At 9 s, 5 allowed. At 10 s a new window starts, but estimate = 5 × 1.0 + 0 = 5: all 10 blocked. Now press "Clock +5 s": at 15 s the weight is 0.5, the estimate is 2.5, so 3 requests will be allowed again.'); } }],
      });
    }},
    { type: 'p', html: `In a 2017 post, Cloudflare said that in their test of 400 million requests, this estimate wrongly allowed or rejected only 0.003% of requests. Memory: only two numbers per client. That is why it is very popular in big CDNs and gateways.` },
    { type: 'list', items: [
      `<strong>Pros:</strong> memory of 2 counters, the boundary burst is almost gone, and the maths is very cheap.`,
      `<strong>Cons:</strong> it is an estimate, not exact. And two keys must be read (previous + current).`,
      `<strong>Where it is used:</strong> Cloudflare rate limiting (their 2017 engineering post), and many API gateways that want cheap and good counting at large scale.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "the sliding counter is exact"', html: `No, it is an <strong>estimate</strong>. It assumes the requests of the previous window were spread evenly. If all the previous requests came in the last second of that window, the estimate will be a little wrong (sometimes it allows a bit more, sometimes it is a bit stricter). For most APIs this small error is fine. Where money or security needs an exact limit, use the log or a token bucket.` },
    { type: 'h2', text: 'All five together: same requests, different decisions' },
    { type: 'p', html: `The limit is the same for all: <strong>10 requests per 10 seconds</strong> (token bucket: capacity 10, refill 1/s; leaky bucket: queue 10, 1 per second leaves). Pick a traffic pattern. Each dot is one request: green = allowed, red = rejected.` },
    { type: 'custom', render(el) {
      const L = 10, W = 10, r2 = x => Math.round(x * 100) / 100;
      const seq = (n, a, d) => [...Array(n)].map((_, i) => r2(a + i * d));
      const TL = {
        boundary: { name: 'Boundary burst', ts: seq(10, 8, 0.2).concat(seq(10, 10, 0.2)) },
        steady: { name: 'Steady 2/s', ts: seq(30, 0, 0.5) },
        burst: { name: 'One big burst', ts: seq(25, 2, 0.02).concat([15, 16, 17, 18, 19]) },
      };
      const ALG = [
        ['Token bucket', ts => { let tok = L, last = 0; return ts.map(t => { tok = Math.min(L, tok + (t - last) * (L / W)); last = t; if (tok >= 1 - 1e-9) { tok -= 1; return 1; } return 0; }); }],
        ['Leaky bucket', ts => { let q = [], free = 0; return ts.map(t => { q = q.filter(d => d > t); if (q.length < L) { const d = Math.max(t, free) + W / L; free = d; q.push(d); return 1; } return 0; }); }],
        ['Fixed window', ts => { const c = {}; return ts.map(t => { const k = Math.floor(t / W); c[k] = c[k] || 0; if (c[k] < L) { c[k]++; return 1; } return 0; }); }],
        ['Sliding log', ts => { const log = []; return ts.map(t => { while (log.length && log[0] <= t - W) log.shift(); if (log.length < L) { log.push(t); return 1; } return 0; }); }],
        ['Sliding counter', ts => { const c = {}; return ts.map(t => { const k = Math.floor(t / W), el2 = t - k * W; const est = (c[k - 1] || 0) * (1 - el2 / W) + (c[k] || 0); if (est < L) { c[k] = (c[k] || 0) + 1; return 1; } return 0; }); }],
      ];
      const maxIn = (ts, a) => { const acc = ts.filter((_, i) => a[i]); let m = 0; for (let i = 0; i < acc.length; i++) { let n = 0; for (let j = i; j < acc.length && acc[j] < acc[i] + W - 1e-9; j++) n++; m = Math.max(m, n); } return m; };
      const NOTE = {
        boundary: 'Fixed window let all 20 through in 4 seconds (both windows were "within their limit"). Sliding log never allowed more than 10 in any 10 s. Token bucket allowed the burst of 10 plus the tokens that arrived on the way. Sliding counter is an estimate, so 12.',
        steady: 'Double the limit speed. Token bucket first spends the full bucket (10), then 1/s: so up to 19 can appear in some 10 s (capacity + refill × 10). Leaky bucket took the same number, but sat them in the queue and released them at 1/s: one request waits up to 10 s.',
        burst: '25 in half a second. All of them took only 10. The 10 requests in the leaky bucket were not rejected, but they waited in the queue for up to 10 s. All algorithms allowed the slow requests that came later.',
      };
      let cur = 'boundary';
      el.innerHTML = `<div class="rlP" style="display:flex;flex-wrap:wrap;gap:8px"></div><div class="rlSvg" style="margin-top:12px"></div>
        <div class="rlTbl" style="overflow-x:auto"></div><div class="calc-note rlCN"></div>`;
      const run = () => {
        const box = el.querySelector('.rlP'); box.innerHTML = '';
        Object.keys(TL).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (k === cur ? ' primary' : ''); b.textContent = TL[k].name; b.onclick = () => { cur = k; run(); }; box.appendChild(b); });
        const ts = TL[cur].ts, T = Math.max(20, Math.ceil(ts[ts.length - 1] + 1));
        const X = t => 118 + t / T * 510, rowH = 34, H = ALG.length * rowH + 30;
        let svg = `<svg viewBox="0 0 640 ${H}" width="100%" role="img" aria-label="Request timeline per algorithm" style="font-family:var(--f-mono)">`;
        for (let s = 0; s <= T; s += 5) svg += `<line x1="${X(s)}" y1="4" x2="${X(s)}" y2="${H - 22}" stroke="var(--line)" ${s % 10 ? 'stroke-dasharray="3 3"' : ''}/><text x="${X(s)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="var(--ink-3)">${s}s</text>`;
        const rows = ALG.map(([name, f], i) => {
          const a = f(ts), y = 4 + i * rowH + rowH / 2;
          svg += `<text x="4" y="${y + 4}" font-size="12" fill="var(--ink)">${name}</text>`;
          ts.forEach((t, j) => { svg += `<circle cx="${X(t)}" cy="${y + (j % 2 ? 5 : -5)}" r="3.6" fill="${a[j] ? 'var(--green)' : 'var(--red)'}"/>`; });
          return [name, a.filter(x => x).length, a.filter(x => !x).length, maxIn(ts, a)];
        });
        svg += '</svg>';
        el.querySelector('.rlSvg').innerHTML = svg;
        el.querySelector('.rlTbl').innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px"><tr style="text-align:left;color:var(--ink-3)"><th>Algorithm</th><th>Allowed</th><th>Rejected</th><th>Max in any 10 s</th></tr>` +
          rows.map(r => `<tr style="border-top:1px solid var(--line)"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td style="color:${r[3] > L ? 'var(--red)' : 'var(--ink)'};font-weight:600">${r[3]}</td></tr>`).join('') + '</table>';
        el.querySelector('.rlCN').textContent = NOTE[cur];
      };
      run();
    }},
    { type: 'table', head: ['Algorithm', 'Memory per client', 'Bursts', 'How exact', 'When'], rows: [
      ['Token bucket', '2 numbers', 'Allowed up to capacity', 'Average is fixed, bursts are allowed', 'Default: public APIs, user actions'],
      ['Leaky bucket (queue)', 'Queue', 'Wait in the queue', 'Output is perfectly smooth', 'Protecting a weak downstream'],
      ['Fixed window', '1 counter', 'Up to 2x at a boundary', 'The least', 'Simple quotas (per day/month)'],
      ['Sliding window log', 'A timestamp per request', 'Never over the limit', 'Exact', 'Small, strict limits (login, OTP)'],
      ['Sliding window counter', '2 counters', 'A small estimate', 'Almost (Cloudflare: 0.003% wrong)', 'Cheap + good at large scale'],
    ]},
    { type: 'h2', text: 'Distributed limiting: Redis + Lua' },
    { type: 'p', html: `xyz.com does not have one gateway, it has 10 (behind the Load Balancer). If each gateway kept the count in its own memory, a limit of 100/min would really become 10 × 100 = 1,000/min, because the Load Balancer spreads one client's requests over all gateways. So the count must live in one <strong>shared</strong> place: Redis.` },
    { type: 'p', html: `But a shared count brings a new problem: a <strong>race condition</strong>. See what happens when two gateways read the same client's counter at the same time:` },
    { type: 'callout', tone: 'term', title: 'New word: race condition and atomic', html: `<strong>What it is:</strong> a <strong>race condition</strong> = two jobs run at the same time, and the result depends on which one gets there first. "Read → check → write" are three separate steps. In between, someone else can change the same number. An <strong>atomic</strong> operation = one that finishes in one go, and nobody can get in between.<br><strong>Why it matters:</strong> the rate limiter's count is only correct if "read + increase + check" is atomic.<br><strong>Without it:</strong> two gateways read the same old number at the same time, both allow, and the limit is quietly broken. Run it below and see.` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'c', label: 'Client', sub: 'limit 100/min', x: 80, y: 160, w: 130, kind: 'client', info: 'What it is: an app or script with a limit of 100 per minute. It has already made 99 requests this minute. Now it sends two requests at almost the same time, and the Load Balancer sends them to two different gateways.' },
        { id: 'g1', label: 'Gateway 1', x: 320, y: 60, w: 150, kind: 'edge', info: 'What it is: one copy (instance) of the API gateway. It knows nothing about the other gateway, so it depends on Redis for the count.' },
        { id: 'g2', label: 'Gateway 2', x: 320, y: 260, w: 150, kind: 'edge', info: 'What it is: the second copy of the API gateway, doing the same job. The Load Balancer spreads requests between both.' },
        { id: 'r', label: 'Redis', sub: 'count = 99', x: 580, y: 160, w: 160, kind: 'cache', info: 'What it is: the shared counter for both gateways. Redis runs commands one at a time, but the command of another gateway can come BETWEEN your two commands. INCR or a Lua script runs as one single command, and nobody gets in between.' },
      ],
      edges: [{ a: 'c', b: 'g1' }, { a: 'c', b: 'g2' }, { a: 'g1', b: 'r' }, { a: 'g2', b: 'r' }],
      scenarios: [
        { name: 'Race: GET, then SET', steps: [
          { title: 'Two requests at once', text: 'Request #100 and #101, on different gateways.', parallel: true, go: ['c>g1', 'c>g2'] },
          { title: 'Both read: 99', text: 'Both read the count. Both got 99, because nobody has written yet.', parallel: true, go: ['g1>r', 'g2>r', 'res:r>g1', 'res:r>g2'], msg: 'Gateway 1: GET rl:c  →  99\nGateway 2: GET rl:c  →  99' },
          { title: 'Both think: 99 < 100, allow', text: 'Each one was right from its own point of view.', parallel: true, go: ['g1>r', 'g2>r'], after: { r: { state: 'warn', sub: 'count = 100 (?!)' } }, msg: 'Gateway 1: SET rl:c 100\nGateway 2: SET rl:c 100' },
          { title: 'Result: 101 requests pass, count 100', text: 'One request got past the limit, and the counter did not even count it. With 10 gateways and thousands of parallel bot requests, this error becomes very big.', parallel: true, go: ['res:g1>c', 'res:g2>c'] },
        ]},
        { name: 'Fix: atomic (INCR / Lua)', steps: [
          { title: 'Two requests at once', text: 'Same situation.', parallel: true, go: ['c>g1', 'c>g2'], set: { r: { sub: 'count = 99' } } },
          { title: 'One atomic command', text: 'Read + increase + check, all inside Redis in one command. Redis runs one command or script at a time, so the two run one after the other.', go: ['g1>r', 'res:r>g1'], after: { r: { sub: 'count = 100' } }, msg: 'Gateway 1: INCR rl:c  →  100   (≤ 100, allow)' },
          { title: 'The second one sees 101', text: 'Gateway 2 gets 101: over the limit, 429.', go: ['g2>r', 'res:r>g2', 'bad:g2>c'], after: { r: { state: 'ok', sub: 'count = 101' } }, msg: 'Gateway 2: INCR rl:c  →  101   (> 100, reject 429)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New word: Lua script', html: `<strong>What it is:</strong> Lua is a small programming language. Redis lets you send a small Lua program (a script) that runs inside Redis itself.<br><strong>Why we need it:</strong> a token bucket has several steps (read, calculate, write). Put them in a script and Redis runs it in one go: atomic, and only one network round trip.<br><strong>Without it:</strong> each step is a separate network call, with race conditions in between and more latency.` },
    { type: 'p', html: `For a fixed window, the Redis <code>INCR</code> command alone is atomic, and that is enough. But a token bucket must read two fields, do some maths, and write two fields. That does not fit in one Redis command. The fix: a <strong>Lua script</strong>. According to the Redis docs, while a script runs the server runs nothing else, so the whole script is atomic. And it needs only one network round trip.` },
    { type: 'code', text: `
-- token_bucket.lua    KEYS[1] = bucket key
-- ARGV: capacity, refill_per_sec, now_ms, cost
local b    = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap  = tonumber(ARGV[1]);  local rate = tonumber(ARGV[2])
local now  = tonumber(ARGV[3]);  local cost = tonumber(ARGV[4])
local tokens = tonumber(b[1]) or cap        -- new client: full bucket
local ts     = tonumber(b[2]) or now
local elapsed = math.max(0, now - ts) / 1000 -- if the clock went back, not negative
tokens = math.min(cap, tokens + elapsed * rate)
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))  -- full bucket = key not needed
return { allowed, tostring(tokens) }   -- a Lua number becomes an integer in Redis, so a string` },
    { type: 'list', items: [
      `<strong>Latency:</strong> one Redis round trip per request (~1 ms inside one data center). Keep the gateway and Redis close to each other.`,
      `<strong>Scale:</strong> one Redis node can handle a lot. If it is still too much, Redis Cluster splits (shards) the keys across nodes by client. All keys of one client stay on one node, so the script is still atomic.`,
      `<strong>Clock:</strong> the clocks of the gateways can differ a little. That is why the script has <code>max(0, ...)</code>. Some teams use Redis's own <code>TIME</code> so everyone looks at the same clock.`,
      `<strong>Need it cheaper?</strong> Each gateway counts locally for a short while and adds its count to Redis every few hundred ms. A little less exact, far fewer Redis calls. At very large scale this trade-off is common.`,
    ]},
    { type: 'h2', text: 'Where to limit, and on what?' },
    { type: 'p', html: `A rate limit is not applied in one place, but in several <strong>layers</strong>. The further out, the cheaper it is to stop a request; the further in, the more context you have.` },
    { type: 'table', head: ['Layer', 'Limit on', 'What it stops'], rows: [
      ['Edge / CDN / WAF', 'IP address', 'Big bot floods, DDoS-like waves (an attack from thousands of machines at once). A WAF (Web Application Firewall) is a filter at the edge that spots bad requests and stops them. The request never even reaches your data center.'],
      ['API gateway', 'User ID, API key, endpoint', 'A limit per customer (based on the plan), a separate limit per endpoint (login 10/min, feed 600/min).'],
      ['Inside a service', 'An expensive operation', 'Like a "report export" that holds the DB for 30 s: not more than 2 at a time per user.'],
      ['In front of a downstream call', 'An outside API', 'The payment or SMS provider has its own limit; do not send them more than that.'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: limit key', html: `<strong>What it is:</strong> the identity whose count is kept. In Redis it becomes the name of the key, like <code>rl:user:42</code> or <code>rl:ip:49.36.1.7</code> or <code>rl:apikey:abc123</code>.<br><strong>Why it matters:</strong> the key decides who "one client" is. Wrong key = the wrong people get counted together.<br><strong>Without it (if you pick it badly):</strong> either innocent people get blocked together, or a bot makes a new identity and escapes.` },
    { type: 'list', items: [
      `<strong>Per user:</strong> the fairest for logged-in users. One user = one count.`,
      `<strong>Per IP:</strong> before login (login page, signup, OTP) this is the only identity. But careful: thousands of people in a college or office can show up on the internet as one public IP (the router hides everyone's traffic behind one IP; this is called <strong>NAT</strong>). And one attacker can come from thousands of IPs.`,
      `<strong>Per API key:</strong> an API key is a long secret code that a developer sends with every request, so the server knows whose request it is. For developers and partners, this is the identity. Plans are built on it: free 60/min, paid 6,000/min.`,
      `<strong>Global:</strong> one limit for everyone together, like "50,000/s in total on this endpoint", so the backend never gets more than its real capacity.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: limiting only by IP', html: `If you limit only by IP, you make two mistakes at once: (1) 500 students in a hostel share one IP, and one student's mistake blocks them all. (2) A bot comes from 10,000 different IPs (a botnet, cloud machines) and each IP stays under the limit. So mix layers: a loose limit on IP, the real limit on account/API key, and on endpoints like login a separate limit "per username".` },

    { type: 'h2', text: 'How to say no: 429, Retry-After, headers' },
    { type: 'p', html: `Rejecting is also part of your API. Tell the client clearly what happened and when to come back. <strong>Headers</strong> do this job.` },
    { type: 'callout', tone: 'term', title: 'New word: header and Retry-After', html: `<strong>What it is:</strong> a <strong>header</strong> = a small piece of extra information attached to the answer (name: value). The user does not see it, the client's code does. <strong>Retry-After</strong> is a header that says "come back after this many seconds".<br><strong>Why we need it:</strong> the client does not have to guess. It waits exactly as long as needed.<br><strong>Without it:</strong> the client either retries right away and gets more 429s (useless load), or waits far too long (useless waiting).` },
    { type: 'code', text: `
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Policy: "default";q=100;w=60
RateLimit: "default";r=0;t=30
Content-Type: application/json

{ "error": "rate_limited", "message": "100 requests per minute. Try again after 30 s." }` },
    { type: 'list', items: [
      `<code>429 Too Many Requests</code> is defined in RFC 6585. The spec on purpose does not say how to identify users or how to count; that is your design.`,
      `<code>Retry-After</code>: after how many seconds (or after what time) to come back. Good clients (and SDKs) follow it.`,
      `<code>RateLimit-Policy</code> / <code>RateLimit</code>: an IETF draft standard that tells the limit and the quota left. <code>q</code> = total limit, <code>w</code> = window (seconds), <code>r</code> = how much is left, <code>t</code> = seconds until reset. It is not an RFC yet: in 2026 it is still at draft 11. Today many APIs use their own older headers, like <code>X-RateLimit-Remaining</code> or Anthropic's <code>anthropic-ratelimit-requests-remaining</code>. Different names, same job: the client learns early that it is close to the limit.`,
    ]},
    { type: 'h2', text: 'How the client should behave: backoff' },
    { type: 'p', html: `Retrying right after a 429 = the same problem as the buggy script, only now from your own app. A good client does this:` },
    { type: 'steps', items: [
      { t: 'Follow Retry-After', d: 'If the header says 30 s, wait 30 s. This is the most accurate information.' },
      { t: 'No header? Exponential backoff', d: 'After each failed try, double the wait: 1 s, 2 s, 4 s, 8 s... and keep a top limit (like 60 s) and a maximum number of tries (like 5).' },
      { t: 'Add jitter', d: 'Add some random time to each wait (for example, anywhere between 0 and 4 s instead of exactly 4 s). Otherwise thousands of clients come back in the same second and create the storm again.' },
      { t: 'Slow down early', d: 'Is the RateLimit or X-RateLimit-Remaining header saying only 2 are left? Slow down before the 429 even comes.' },
      { t: 'Retry only safe requests', d: 'Retrying read requests like GET is safe. Retry requests like payments only if the server understands an idempotency key (so the same job does not happen twice).' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: exponential backoff + jitter', html: `<strong>What it is:</strong> <strong>backoff</strong> = waiting a little after a failure. <strong>Exponential</strong> = the wait doubles every time (1, 2, 4, 8 s). <strong>Jitter</strong> = adding a bit of random time to that wait.<br><strong>Why we need it:</strong> the server gets time to breathe, and the clients come back at different moments.<br><strong>Without it:</strong> all clients retry together, the server falls again, all retry again: a loop that never ends. The resilience lesson has a simulator for this.` },
    { type: 'h2', text: 'Load shedding: when everyone together is too much' },
    { type: 'p', html: `Rate limiting stops each client at its own share. But imagine: an India-Pakistan match ends, and 20 million normal users open the app together. Every user is under their limit, yet the total is above the capacity of the servers. Now the server has to <strong>protect itself</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: load shedding', html: `<strong>What it is:</strong> the way a server protects itself. <strong>Why we need it:</strong> for when all clients are within their limits, but the total load is still more than the capacity. <strong>Without it:</strong> all requests get slow, then time out, then the server crashes: nobody gets anything.<br>How: when the server is close to overload, it drops some requests on purpose right away (often with <code>503 Service Unavailable</code>), so that the rest finish properly. Saying "not now" quickly to some is better than making everyone slow and timing out. Important: drop by <strong>priority</strong>. Analytics and recommendations first, login and payment last.` },
    { type: 'p', html: `In its 2017 post, Stripe described its four limiters: (1) request rate limiter: N requests/second per user, (2) concurrent requests limiter: a limit on how many requests of one user run at the same time, (3) fleet usage load shedder: a part of the infrastructure (20% in their example) reserved for critical requests; non-critical requests that try to use it are rejected, (4) worker utilization load shedder: when workers get too busy, slowly drop less important traffic (like test mode). The first two are "limits per client", the last two are "protection for the system".` },
    { type: 'table', head: ['', 'Rate limiting', 'Load shedding'], rows: [
      ['Question', 'Is this client within its limit?', 'Can the system handle more right now?'],
      ['Depends on', 'The client count', 'The server load (CPU, queue, latency)'],
      ['On a normal day', 'Stops only abuse', 'Does nothing'],
      ['Response', '429 + Retry-After', '503 (often with Retry-After)'],
    ]},

    { type: 'h2', text: 'AI products: count tokens, not requests' },
    { type: 'p', html: `xyz.com launched an AI chat assistant. One user asks "hi" (5 tokens). Another pastes a 300-page PDF and asks for a summary (150,000 tokens). Both are "1 request", but on the GPU the second is thousands of times more expensive. If you only count requests per minute, the second user eats the whole GPU.` },
    { type: 'callout', tone: 'term', title: 'New word: LLM token', html: `<strong>What it is:</strong> an AI model (LLM) reads and writes text in small pieces called <strong>tokens</strong>. In English, one token is about 3-4 letters or a short word. (This is different from the "token" in a token bucket; only the name is the same.)<br><strong>Why it matters:</strong> the cost of AI (GPU time) grows with tokens, not with requests.<br><strong>Without it (counting only requests):</strong> "hi" and "summarise 300 pages" are counted the same, and one user eats everyone's GPU.` },
    { type: 'p', html: `That is why LLM APIs apply several limits at once. According to Anthropic's docs: <strong>requests per minute (RPM)</strong>, <strong>input tokens per minute (ITPM)</strong> and <strong>output tokens per minute (OTPM)</strong>, and they are applied with the token bucket algorithm (capacity refills all the time; it does not reset at the start of each minute). Over the limit: 429 and a <code>retry-after</code> header. The same token bucket, except the <strong>cost</strong> of each request is not 1, it is its tokens:` },
    { type: 'code', text: `
# Bucket: capacity 200,000 tokens, refill 200,000 per minute
request arrives:  estimate = input tokens (you can count them) + a guess for the output
if bucket >= estimate:  bucket -= estimate;  ALLOW
else:                   429, Retry-After = seconds needed to refill that many tokens
response finished:  real output tokens are known → give back / take more from the bucket` },
    { type: 'p', html: `<strong>A small worked example:</strong> the limit is 30,000 input tokens per minute, so refill = 30,000 ÷ 60 = <strong>500 tokens per second</strong>. The bucket is full (30,000). The first request has 20,000 tokens: allowed, 10,000 left. Right away a second request, again 20,000 tokens: 10,000 short. 10,000 ÷ 500 = 20, so the answer is <code>429</code>, <code>Retry-After: 20</code>. If a small 50-token "hi" comes in meanwhile, it goes through, because the bucket has 10,000.` },
    { type: 'h2', text: 'Decide: which algorithm, when' },
    { type: 'table', head: ['Situation', 'Pick', 'Why'], rows: [
      ['Public API, user actions in an app', 'Token bucket', 'Small bursts pass, the average is fixed, 2 numbers of memory'],
      ['Smooth traffic for a weak downstream or outside API', 'Leaky bucket (queue)', 'Output at a perfectly even speed'],
      ['Per day / per month quota, simple billing', 'Fixed window', 'The cheapest, easy to explain to users'],
      ['Login, OTP, password reset (small, strict limit)', 'Sliding window log', 'Exact, and with a small limit the memory is small'],
      ['Very large scale, tens of millions of keys', 'Sliding window counter', '2 counters, the boundary bug is almost gone'],
      ['AI / LLM API', 'Token bucket, cost = tokens', 'The cost follows tokens, not requests'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `The default is the <strong>token bucket</strong>: it allows short bursts but keeps the average rate fixed. For a cheap estimate at large scale, use the sliding window counter; for a very strict small limit (login, OTP), use the sliding log. Keep the count in shared Redis, with an atomic Lua script. For a product like AI chat, limit by <strong>tokens consumed</strong>, not just by requests. And keep load shedding along with rate limiting: one stops a client, the other protects the whole system.` },
    { type: 'diagram', title: 'Rate limiting: the whole picture', height: 580,
      groups: [
        { label: 'Clients', x: 20, y: 14, w: 690, h: 94 },
        { label: 'Edge', x: 180, y: 128, w: 380, h: 190 },
        { label: 'Gateway + limiter', x: 180, y: 330, w: 535, h: 100 },
        { label: 'Services + data', x: 30, y: 452, w: 685, h: 112 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya’s app', sub: 'normal user', x: 200, y: 60, kind: 'client', info: 'What it is: a normal xyz.com user. A few dozen requests per minute. Good limits are never noticed by her. If she crosses the limit by mistake, she gets 429 + Retry-After, and the app waits that long before trying again (backoff).' },
        { id: 'bot', label: 'Bot', sub: '10k req/min', x: 540, y: 60, kind: 'threat', info: 'What it is: a program that guesses passwords or scrapes data. Stopping its flood at the outermost layer, the edge, is the cheapest.' },
        { id: 'edge', label: 'CDN / WAF', sub: 'per-IP limit', x: 370, y: 170, w: 170, kind: 'edge', info: 'What it is: the network layer closest to the user (CDN) and a filter for bad traffic (WAF). A loose per-IP limit sits here: big floods never even reach your data center.' },
        { id: 'lb', label: 'Load Balancer', x: 370, y: 280, kind: 'net', info: 'What it is: the part that spreads requests over several gateways. Because of it, the count cannot live in the memory of each gateway; it must live in shared Redis.' },
        { id: 'gw', label: 'API gateways', sub: 'limiter: user/key', x: 370, y: 390, w: 170, kind: 'edge', info: 'What it is: the front door for all API requests, with the rate limiter inside. For each request it builds a key (user, API key, endpoint), asks Redis, then allows or returns 429. If Redis fails, each endpoint follows its pre-decided fail-open or fail-closed rule.' },
        { id: 'redis', label: 'Redis', sub: 'counters + Lua', x: 640, y: 390, w: 130, kind: 'cache', info: 'What it is: a fast database in RAM, the shared count for all gateways (token buckets, window counters). A Lua script does "read + calculate + write" in one atomic step, so there is no race condition.' },
        { id: 'app', label: 'App services', sub: 'load shedding', x: 370, y: 510, w: 170, kind: 'server', info: 'What it is: the servers that do the real work. When they get close to overload they use load shedding: less important requests get 503 right away, so login and payment keep working.' },
        { id: 'db', label: 'Database', x: 120, y: 510, kind: 'data', info: 'What it is: the real data of xyz.com. The whole point of rate limits is that the DB never gets more work than its capacity.' },
        { id: 'sms', label: 'SMS provider', sub: 'outside limit', x: 640, y: 510, w: 130, kind: 'net', info: 'What it is: an outside company that sends the OTPs (or some AI API). It has its own limit, and every SMS costs money. So we also put a limit in front of it (often a smooth queue, like a leaky bucket).' },
      ],
      edges: [
        { a: 'riya', b: 'edge', n: 1 },
        { a: 'bot', b: 'edge', label: 'flood' },
        { a: 'edge', b: 'bot', kind: 'bad', label: 'block', via: [[640, 170]] },
        { a: 'edge', b: 'lb', n: 2 },
        { a: 'lb', b: 'gw', n: 3 },
        { a: 'gw', b: 'redis', n: 4, both: true, label: 'Lua check' },
        { a: 'gw', b: 'app', n: 5 },
        { a: 'app', b: 'db', n: 6 },
        { a: 'app', b: 'sms', dashed: true, label: 'own limit' },
        { a: 'gw', b: 'riya', kind: 'bad', label: '429 + Retry-After', via: [[70, 390], [70, 60]] },
      ],
      paths: [
        { name: 'Allowed request', text: 'The edge checked the IP, the gateway looked at the user bucket in Redis (a token was there), and the request went on to the app and the DB.', go: ['riya>edge>lb>gw>redis', 'gw>app>db'] },
        { name: 'Blocked (429)', text: 'The bucket is empty: the gateway returned 429 + Retry-After right away. The app servers and the DB never even knew.', go: ['riya>edge>lb>gw>redis', 'gw>riya'] },
        { name: 'Bot flood', text: 'A flood from one IP: the per-IP limit at the edge stopped it. Not one request got inside.', go: ['bot>edge', 'edge>bot'] },
        { name: 'Downstream limit', text: 'The OTP request is allowed, but the SMS provider has its own limit: our service sends to it only at a smooth speed.', go: ['riya>edge>lb>gw>app>sms'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Rate limiting = a limit for each client (user, IP, API key). Over the limit: <code>429</code> + <code>Retry-After</code>, and the request never goes inside.</li>
      <li>Token bucket is the default: capacity = how big a burst, refill rate = the long-term average speed.</li>
      <li>Leaky bucket makes output smooth but adds waiting. Fixed window is cheap but allows 2x at a boundary. Sliding log is exact but uses a lot of memory. Sliding counter is almost exact with 2 numbers.</li>
      <li>Many gateways = keep the count in shared Redis, and atomic (INCR or a Lua script), or a race condition breaks the limit.</li>
      <li>Limit in layers: per IP at the edge (loose), per user / per API key at the gateway (the real one), on expensive work inside the service.</li>
      <li>The client's job: follow Retry-After, otherwise exponential backoff + jitter.</li>
      <li>Rate limiting stops a client; load shedding protects the system (503, by priority).</li>
      <li>In AI APIs, count tokens, not requests.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['One bad client cannot bring down the whole system', 'Brute force and scraping become expensive', 'Backend capacity is predictable: limits by plan', 'Fair usage: free vs paid plans', 'With load shedding, important features keep working even in overload'], costs: ['One extra check per request (Redis ~1 ms)', 'Redis is one more dependency: you must decide fail-open or fail-closed', 'A wrong limit = real users get 429 (people behind NAT, bursty apps)', 'Distributed counting has race conditions, so you must write atomic scripts', 'A cheap method like the sliding counter is a small estimate, not exact'] },
    { type: 'think', questions: [
      { q: 'The xyz.com mobile app sends 8 API calls together as soon as it opens. The limit is "60 per minute" with a fixed window. What can go wrong, and which algorithm fits better?', a: 'In a fixed window a burst of 8 is fine, but there is a risk of double at the boundary. A token bucket (capacity ~20, refill 1/s) fits better: the burst when the app opens passes easily, and the long-term average stays at 60/min.' },
      { q: 'An OTP-sending endpoint: every OTP costs money for the SMS. Redis went down. Fail-open or fail-closed?', a: 'Usually fail-closed (or a local, very strict fallback limit). With fail-open, an attacker could send hundreds of thousands of SMS at that moment, running up the bill or spamming users. A cheap, read-only endpoint like the feed can be fail-open.' },
      { q: 'An outside payment API says "do not send more than 2 requests per second, or you will be blocked". Sometimes you get 50 requests at once. Which algorithm, and what does the user pay?', a: 'Leaky bucket (queue): requests wait in a line and go to the outside API at a fixed 2/s, so their limit is never broken. The price: waiting. A burst of 50 = the last request arrives after ~25 s. So choose the queue capacity and timeout with care, and show the user "processing".' },
      { q: 'You have 10 gateways and the Redis call takes 30% of the latency of every request. What will you do?', a: 'Options: one round trip with a Lua script, Redis close to the gateways (same zone), and if a small estimate is fine, each gateway keeps a local counter and syncs with Redis every ~100-500 ms. Trade-off: lower latency in exchange for a slightly looser limit (overshoot between syncs).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Token bucket, capacity 10, refill 2/s, the bucket is full. 15 requests arrive together. How many are allowed?', options: ['15', '10', '2'], answer: 1, explain: 'The bucket had 10 tokens, so 10 requests passed and the other 5 got 429. Then 2 new tokens arrive every second.' },
      { q: 'The biggest weakness of the fixed window counter?', options: ['It uses a lot of memory', 'Around a window boundary a client can send almost double the limit', 'It cannot work without Redis'], answer: 1, explain: '100 in the last second of one window and 100 in the first second of the next: both windows are "correct", but 200 in 2 seconds.' },
      { q: 'Two gateways do GET at the same time, both see 99, both allow. The fix?', options: ['More gateways', 'An atomic operation: INCR or a Lua script, so read + check + write is one step', 'Increase the TTL'], answer: 1, explain: 'Read-check-write are three separate steps, with a race in between. Redis INCR or a Lua script does it in one atomic step.' },
      { q: 'The difference between rate limiting and load shedding?', options: ['They are the same', 'Rate limiting looks at the client limit; load shedding looks at the server load and drops less important requests', 'Load shedding is only for bots'], answer: 1, explain: 'Even if all clients are within their limits, the total can be too much. Then load shedding drops requests by priority.' },
      { q: 'Leaky bucket (queue 5, 0.5/s), the server is free. 10 requests arrive together. What happens?', options: ['All 10 reach the server right away', '1 goes straight through, 5 wait in the line (2, 4, 6, 8, 10 s), 4 are dropped', '5 allowed, 5 blocked, no waiting'], answer: 1, explain: 'The server was free, so the first one went straight through. The line has room for 5, and one leaves every 2 s. The other 4 overflow. This is like the NGINX burst=5 behaviour.' },
      { q: 'Sliding window counter, limit 5 per 10 s. 4 in the previous window, 2 in the current one, 3 s into the current window. A new request?', options: ['Allow, because the estimate is 4 × 0.7 + 2 = 4.8, below 5', 'Block, because 4 + 2 = 6', 'Allow, because the current window has only 2'], answer: 0, explain: 'Only 70% of the previous window (its last 7 s) is still inside the last 10 s: 4 × 0.7 = 2.8, plus 2 = 4.8 < 5.' },
      { q: 'The best limit for an AI chat API?', options: ['Only requests per minute', 'Tokens per minute (input and output), together with requests per minute', 'Only by IP'], answer: 1, explain: 'One request can be 5 tokens or 150,000. The real cost (GPU) follows tokens.' },
    ]},
    { type: 'sources', note: 'The numbers and real-world examples of the algorithms come from these sources.', items: [
      { title: 'Scaling your API with rate limiters', publisher: 'Stripe blog', official: true, year: 2017, url: 'https://stripe.com/blog/rate-limiters', used: 'Four limiter types (request rate, concurrent requests, fleet usage load shedder with 20% reserved example, worker utilization load shedder), token bucket in Redis, fail open, 429.' },
      { title: 'How we built rate limiting capable of scaling to millions of domains', publisher: 'Cloudflare blog', official: true, year: 2017, url: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/', used: 'Sliding window counter formula, 42 × 0.75 + 18 = 49.5 example, 0.003% wrong decisions over 400M requests, two numbers per counter.' },
      { title: 'RFC 6585: Additional HTTP Status Codes', publisher: 'IETF', official: true, year: 2012, url: 'https://www.rfc-editor.org/rfc/rfc6585.html', used: '429 Too Many Requests, optional Retry-After, spec does not define how to identify users or count.' },
      { title: 'RateLimit header fields for HTTP (Internet-Draft)', publisher: 'IETF HTTPAPI working group', official: true, url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/', used: 'RateLimit-Policy and RateLimit fields (q, w, r, t); still an Internet-Draft (draft 11, 2026), not an RFC.' },
      { title: 'Scripting with Lua', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/programmability/eval-intro/', used: 'Scripts run atomically and block other commands; keys must be passed via KEYS for cluster correctness.' },
      { title: 'Module ngx_http_limit_req_module', publisher: 'NGINX documentation', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_limit_req_module.html', used: 'limit_req uses the leaky bucket method; burst queues extra requests, nodelay stops the delay.' },
      { title: 'REST Admin API rate limits', publisher: 'Shopify developer docs', official: true, url: 'https://shopify.dev/docs/api/admin-rest/usage/rate-limits', used: 'Leaky bucket: bucket of 40 requests, leaks 2 per second (standard plan).' },
      { title: 'Rate limits for the REST API', publisher: 'GitHub Docs', official: true, url: 'https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api', used: '5,000 requests per hour for authenticated users, x-ratelimit-reset tells when the hourly window resets.' },
      { title: 'Throttle requests to your REST APIs', publisher: 'AWS API Gateway documentation', official: true, url: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html', used: 'API Gateway throttles with the token bucket algorithm (rate + burst), 429 on throttle.' },
      { title: 'Rate limits', publisher: 'Claude API documentation (Anthropic)', official: true, url: 'https://platform.claude.com/docs/en/api/rate-limits', used: 'RPM, ITPM, OTPM limits, token bucket with continuous replenishment, 429 with retry-after, anthropic-ratelimit-* headers.' },
    ]},
  ],
});
})();
