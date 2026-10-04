Lesson.register({
  id: 'decide-servers',
  title: 'How many servers do you need?',
  minutes: 30,
  summary: `The answer to "how many servers?" comes from a formula: peak QPS ÷ one server's capacity × headroom, then round up across availability zones. In this lesson you will use calculators to see why headroom, N+1 and AZs matter, and why the real question is "which layer breaks first".`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `One server can only handle a few thousand requests in one second.<br>If more users come, you need more servers. But how many?<br>Take too few, and the site falls over at the busiest time. Take too many, and money is wasted.<br>And machines sometimes die, and sometimes a whole data center goes dark.<br>In this lesson you will learn a small formula that tells you: how many servers, where to put them, and how many extra.` },
    { type: 'h2', text: 'The problem: the boss\'s question before launch' },
    { type: 'p', html: `A new xyz.com feature launches next week. The boss asks: "how many servers should we order?" One friend says "1 server is enough, average traffic is only 400 req/s". Another says "take 100 to be safe". The first will crash the site on launch day; the second will burn lakhs of rupees every month. The right answer is a small formula that combines <a href="#/scalability">horizontal scaling</a>, <a href="#/availability-spof">availability</a> and napkin maths.` },
    { type: 'callout', tone: 'term', title: 'New word: QPS (queries per second)', html: `<strong>What it is:</strong> QPS or req/s = how many requests arrive in one second.<br><strong>Why we need it:</strong> a server's capacity is also measured in "this many requests per second". Both must be in the same unit before you can divide (÷).<br><strong>Without it:</strong> "10 crore requests a day" does not tell you how much pressure there is in one second.<br><strong>Trick:</strong> one day ≈ 86,400 s, rounded to <strong>10<sup>5</sup></strong>. So 10 crore requests/day ÷ 10<sup>5</sup> ≈ 1,000 req/s on average.` },
    { type: 'callout', tone: 'term', title: 'New word: Peak', html: `<strong>What it is:</strong> the busiest time of the day, not the average. Traffic at 9 pm is several times the traffic at 3 pm.<br><strong>Why we need it:</strong> a site falls over at the peak, not at the average. The roadmap rule: peak ≈ average × 2 to × 5; for live events (a match, a sale) × 10 or more.<br><strong>Without it:</strong> if you size for the average, the site is slow or down every night at 9 pm.` },
    { type: 'callout', tone: 'term', title: 'New word: Headroom and utilisation', html: `<strong>What it is:</strong> <strong>Utilisation</strong> = how busy a server is (60% = 60% of its capacity is in use). <strong>Headroom</strong> = spare capacity kept on purpose.<br><strong>Why we need it:</strong> near 100%, requests queue up inside the server and latency shoots up. Any spike or failure knocks it over. The roadmap: × 1.3 to × 2 headroom in the formula, so servers are ~50-70% busy at the normal peak.<br><strong>Without it:</strong> the first jolt brings the site down.` },
    { type: 'callout', tone: 'term', title: 'New word: Region and Availability Zone (AZ)', html: `<strong>What it is:</strong> a <strong>region</strong> = a city or area where a cloud company has data centers (like Mumbai or Singapore). An <strong>AZ</strong> = one or more separate data centers inside a region, with their own power, cooling and network, but linked to each other by a fast network.<br><strong>Why we need it:</strong> if one AZ has a fire or a power cut, the other AZs keep running. If a whole region goes down, another region takes over.<br><strong>Without it:</strong> all servers in one building = one power cut and the whole site is down, even with 1,000 servers.` },

    { type: 'h2', text: 'The roadmap formula' },
    { type: 'code', text: `
servers = peak QPS ÷ QPS per server × headroom (1.3 – 2)
        → round up so every availability zone has at least 2
Target utilisation: 50 – 70%, never 100%
(so one zone can fail and the others absorb its traffic)` },
    { type: 'table', head: ['Peak load', 'Rough fleet (~2k req/s per server)'], rows: [
      ['100 req/s', '2-3 servers (just for redundancy)'],
      ['5,000 req/s', '≈ 4-5 servers'],
      ['50,000 req/s', '≈ 40-50 servers, and caching becomes essential'],
      ['500,000 req/s', 'Hundreds of servers; most reads must come from a cache or CDN'],
    ], caption: 'Source: roadmap phase 5, "How many servers?"' },
    { type: 'callout', tone: 'term', title: 'New word: Load test', html: `<strong>What it is:</strong> creating fake users and slowly raising the traffic on one server until its latency gets bad. That point is the real capacity of that server.<br><strong>Why we need it:</strong> the most important number in the formula, "how much one server can handle", comes from here.<br><strong>Without it:</strong> you copy a number from some blog, and the whole estimate is 10 times wrong.` },
    { type: 'p', html: `How much can one server do? The roadmap's napkin numbers: a stateless app server for a simple JSON API does ~1k-10k req/s, but if each request does real work (DB calls, building JSON, auth), use <strong>~1k-2k</strong> in estimates. These are ballparks, not benchmarks; the real number comes from a load test.` },

    { type: 'h2', text: 'Each line of the table, one by one' },
    { type: 'p', html: `Each line of the table is a different world. At small traffic, <em>redundancy</em> decides the server count. At large traffic, capacity does. At very large traffic, the question itself changes: "which requests should never reach the servers at all?"` },
    { type: 'h3', text: '100 req/s → 2-3 servers' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the new xyz.com "Help center": ~20 lakh page views a day.<br><strong>Reason:</strong> 100 ÷ 2,000 = 0.05 of a server. By capacity, even half a server is plenty. But 1 server = one reboot and the help center is down. So 2 servers in 2 AZs (or 3 in 3 AZs). Here the number came from redundancy.<br><strong>Trap:</strong> "traffic is low, so 1 server". The site will be down even during a deploy, because there is no other server while it restarts.` },
    { type: 'h3', text: '5,000 req/s → ~4-5 servers' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the xyz.com comments API at the 9 pm peak.<br><strong>Reason:</strong> 5,000 ÷ 2,000 = 2.5. × 1.5 headroom = 3.75 → 4. With 2 AZs, if one AZ fails only 2 are left, and they get 125% load. So with 2 AZs take 6 (3-3), or with 3 AZs 2-2-2 = 6.<br><strong>Trap:</strong> taking just the formula's 4 and never checking what happens when an AZ fails. See this number yourself in the calculator below.` },
    { type: 'h3', text: '50,000 req/s → ~40-50 servers, caching essential' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the xyz.com video page API on a viral day.<br><strong>Reason:</strong> 50,000 ÷ 2,000 × 1.5 ≈ 38, and 50 with × 2 headroom. App servers are stateless, so adding more is easy. But if every one of 50,000 requests reached the DB, the database would melt. So a cache: most reads come from the cache.<br><strong>Trap:</strong> counting only app servers. At this level, the real questions are the database, the cache hit rate and connection limits.` },
    { type: 'h3', text: '500,000 req/s → hundreds of servers, cache and CDN' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> the xyz.com homepage and score during a big match.<br><strong>Reason:</strong> 500,000 ÷ 2,000 × 1.5 = 375 app servers. But most requests ask for the same content. The CDN and cache stop them from reaching the servers at all, so the real traffic at the origin is much smaller.<br><strong>Trap:</strong> ordering 375 servers without asking how many of these requests could end at the CDN. The "live cricket score" trap below is exactly this.` },

    { type: 'h2', text: 'N+1, N+2 and "what if a whole AZ fails?"' },
    { type: 'callout', tone: 'term', title: 'New word: N+1 / N+2 redundancy', html: `<strong>What it is:</strong> <strong>N</strong> = the number of servers needed to handle the peak. <strong>N+1</strong> = one extra, so that if any one server dies (or restarts during a deploy), the peak is still handled. <strong>N+2</strong> = two extra: one is out for maintenance/deploy and another fails at the same time, and it is still fine. The more critical the system, the bigger the +.<br><strong>Why we need it:</strong> servers die every day, and in every deploy some servers are out for a short while.<br><strong>Without it:</strong> one server crashing during a deploy = less capacity at the peak = a slow site.` },
    { type: 'p', html: `Servers dying is an everyday thing, but a whole AZ failing also happens. Imagine 3 AZs with equal servers, and one AZ fails. The 2 remaining AZs must carry all the traffic, so the load on each server becomes 3/2 = 1.5 times. If servers were at 67% normally, now they are at 67% × 1.5 = 100%. Just barely survived. If they were at 80%, now 120%: overload and cascading failure (when one fails, its load moves to the others, and then they fail too).` },
    { type: 'p', html: `This gives a clear rule: <strong>if you must keep running after one of k AZs fails, keep normal utilisation ≤ (k−1)/k</strong>. 2 AZs → 50%, 3 AZs → ~67%. This is the roadmap's "50-70% target". AWS calls this <strong>static stability</strong> (static = without changing anything): keep enough capacity ready in advance that you never need to launch new servers when an AZ fails. (Autoscaling helps, but new servers take minutes to arrive, and during an outage the cloud's control plane, meaning the system that creates new servers, may itself be under pressure.)` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "size for the average"', html: `"The average is 400 req/s and one server does 2,000, so 1 server is enough". Three mistakes at once: (1) the peak is 2-5 times the average, (2) 1 server = a single point of failure (SPOF: the one part whose failure brings everything down), one reboot and the site is down, (3) a server running near 100% explodes in latency. Peak × headroom, and in at least 2 AZs.` },

    { type: 'h2', text: 'Calculator: run the formula yourself' },
    { type: 'p', html: `The example buttons load the roadmap table and the worked example. Below the numbers you will see the formula with the values filled in. Do not forget to look at the "a whole AZ fails" stat.` },
    { type: 'custom',
      presets: [
        { n: '100 req/s', peak: 100, per: 2000, hr: 1.5, sp: 0, az: 2, min: 1 },
        { n: '5,000 req/s', peak: 5000, per: 2000, hr: 1.5, sp: 0, az: 2, min: 1 },
        { n: '50,000 req/s', peak: 50000, per: 2000, hr: 1.5, sp: 0, az: 3, min: 2 },
        { n: '500,000 req/s', peak: 500000, per: 2000, hr: 1.5, sp: 0, az: 3, min: 2 },
        { n: 'Twitter-like feed', peak: 600000, per: 5000, hr: 1.5, sp: 0, az: 3, min: 2 },
      ],
      calc(p) {
        const raw = p.peak / p.per, withH = raw * p.hr;
        const N = Math.max(1, Math.ceil(withH - 1e-9));
        const NS = N + p.sp;
        const perAZ = Math.max(p.min, Math.ceil(NS / p.az));
        const total = perAZ * p.az;
        const uNorm = p.peak / (total * p.per);
        const uAZ = p.az > 1 ? p.peak / ((p.az - 1) * perAZ * p.per) : Infinity;
        const u1 = total > 1 ? p.peak / ((total - 1) * p.per) : Infinity;
        const azSafe = p.az > 1 ? Math.ceil(raw / (p.az - 1) - 1e-9) * p.az : null;
        return { raw, withH, N, NS, perAZ, total, uNorm, uAZ, u1, azSafe };
      },
      render(el) {
        const self = this, st = Object.assign({}, this.presets[2]);
        el.innerHTML = `<div class="ds-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
          <div class="row2">
            <div><label>Peak QPS (req/s)</label><input class="ds-peak" type="number" min="1" step="1"></div>
            <div><label>What one server can handle (req/s)</label><input class="ds-per" type="number" min="1" step="100"></div>
            <div><label>Headroom: <strong class="ds-vhr"></strong></label><input class="ds-hr" type="range" min="1" max="2" step="0.1"></div>
            <div><label>Extra spare servers</label><div class="ds-sp" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>Availability zones</label><div class="ds-az" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>At least this many per AZ</label><div class="ds-min" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
          </div>
          <div class="stats">
            <div class="stat"><span>From the formula (N)</span><strong class="ds-o-n"></strong></div>
            <div class="stat"><span>Rounded up across AZs: total</span><strong class="ds-o-t"></strong></div>
            <div class="stat"><span>Load at normal peak</span><strong class="ds-o-u"></strong></div>
            <div class="stat"><span>One server fails</span><strong class="ds-o-u1"></strong></div>
            <div class="stat"><span>A whole AZ fails</span><strong class="ds-o-uaz"></strong></div>
          </div>
          <pre class="ds-f" style="font:13px/1.6 var(--f-mono);background:var(--surface-2);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0"></pre>
          <div class="calc-note ds-note"></div>`;
        const $ = c => el.querySelector(c);
        const fmt = n => Math.round(n).toLocaleString('en-IN');
        const pct = u => isFinite(u) ? Math.round(u * 100) + '%' : 'all down';
        const chips = (box, key, vals, lab) => { const b = $(box); b.innerHTML = ''; vals.forEach(v => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (st[key] === v ? ' on' : ''); c.textContent = lab(v); c.onclick = () => { st[key] = v; upd(); }; b.appendChild(c); }); };
        this.presets.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p.n; b.onclick = () => { Object.assign(st, p); sync(); upd(); }; $('.ds-pre').appendChild(b); });
        const sync = () => { $('.ds-peak').value = st.peak; $('.ds-per').value = st.per; $('.ds-hr').value = st.hr; };
        const upd = () => {
          chips('.ds-sp', 'sp', [0, 1, 2], v => 'N+' + v);
          chips('.ds-az', 'az', [1, 2, 3], v => v + (v === 1 ? ' AZ' : ' AZs'));
          chips('.ds-min', 'min', [1, 2], v => v + ' server');
          $('.ds-vhr').textContent = '×' + st.hr.toFixed(1);
          const r = self.calc(st);
          $('.ds-o-n').textContent = fmt(r.N);
          $('.ds-o-t').textContent = fmt(r.total) + ' (' + r.perAZ + ' × ' + st.az + ')';
          $('.ds-o-u').textContent = pct(r.uNorm);
          $('.ds-o-u1').textContent = pct(r.u1);
          $('.ds-o-uaz').textContent = st.az === 1 ? 'site down' : pct(r.uAZ);
          $('.ds-o-uaz').style.color = st.az === 1 || r.uAZ > 1 ? 'var(--red)' : r.uAZ > 0.85 ? 'var(--amber)' : 'var(--green)';
          $('.ds-f').textContent =
            `1. ${fmt(st.peak)} ÷ ${fmt(st.per)} = ${r.raw.toFixed(2)} servers (at exactly 100%)\n` +
            `2. × headroom ${st.hr.toFixed(1)} = ${r.withH.toFixed(2)} → round up: N = ${r.N}\n` +
            `3. + spares (N+${st.sp}) = ${r.NS}\n` +
            `4. ${st.az} AZ: max(${st.min}, ceil(${r.NS} ÷ ${st.az})) = ${r.perAZ} per AZ → total ${r.perAZ * st.az}\n` +
            `5. Load = ${fmt(st.peak)} ÷ (${r.total} × ${fmt(st.per)}) = ${pct(r.uNorm)}` +
            (st.az > 1 ? `;  AZ down: ÷ (${st.az - 1} × ${r.perAZ} × ${fmt(st.per)}) = ${pct(r.uAZ)}` : '');
          let note;
          if (st.az === 1) note = 'Only 1 AZ: if that data center fails, the whole site is gone, no matter how many servers you have. At least 2 AZs, 3 is better.';
          else if (r.uAZ > 1) note = `As soon as one AZ fails, the remaining servers are at ${pct(r.uAZ)}: overload, then cascading failure. To survive losing an AZ you need at least ${fmt(r.azSafe)} servers (ceil(peak ÷ per-server ÷ ${st.az - 1}) in each AZ, then × ${st.az}), or more headroom.`;
          else if (r.uNorm < 0.25 && r.total > 2) note = `The normal load is only ${pct(r.uNorm)}: probably more servers than needed. But at small traffic this is the price of minimum redundancy.`;
          else if (r.uAZ > 0.85) note = `If one AZ fails, the remaining servers are at ${pct(r.uAZ)}: the site survives, but right at the edge (latency will rise, and one more spike would take it down). With ${st.az} AZs this follows naturally from a ${Math.round((st.az - 1) / st.az * 100)}% normal load; for comfort, add headroom or spares.`;
          else note = `${pct(r.uNorm)} at the normal peak, ${pct(r.uAZ)} if one AZ fails: the site survives.`;
          if (st.peak >= 50000) note += ' At this traffic, app servers are the easy part: to protect the database you need a cache, replicas and a CDN.';
          $('.ds-note').textContent = note;
        };
        const num = (c, k) => $(c).addEventListener('input', e => { const v = Number(e.target.value); if (v > 0) { st[k] = v; upd(); } });
        num('.ds-peak', 'peak'); num('.ds-per', 'per'); num('.ds-hr', 'hr');
        sync(); upd();
      },
    },

    { type: 'p', html: `What the calculator shows, in numbers you can check yourself:` },
    { type: 'list', items: [
      '<strong>It matches the roadmap table:</strong> 100 req/s → N = 1, but 2-3 in total for 2-3 AZs. 5,000 → N = 4 (5 with × 2 headroom). 50,000 → 38 (× 1.5) to 50 (× 2). 500,000 → 375. Twitter-like 600k ÷ 5k × 1.5 = 180, so 60-60-60 across 3 AZs.',
      '<strong>5,000 req/s in 2 AZs, 4 servers:</strong> 63% normally, but if one AZ fails the 2 remaining servers are at 125%. To survive losing an AZ you need 6 (3-3), so the surviving AZ alone can do the work of 2.5 servers. That is why the target with 2 AZs is ~50%.',
      '<strong>3 AZs, × 1.5 headroom:</strong> ~67% normally, ~100% if an AZ fails. You survive, but at the edge. 3 AZs are more efficient because a failure takes away only 1/3 of the capacity, compared to 1/2 with 2 AZs.',
      '<strong>"At least 2 in each AZ":</strong> this is the roadmap rule, so that even if one server in an AZ is in a deploy or has crashed, that AZ is not empty. For a very small, non-critical service, people sometimes run 1 per AZ; the 100 req/s line of the table (2-3 servers) is exactly that.',
    ]},

    { type: 'h2', text: 'The full calculation, step by step: from users to regions' },
    { type: 'p', html: `The calculator above started from peak QPS. In a real interview, you are only given the number of users. This calculator starts there and shows one step at a time: users → requests/day → average QPS → peak → one server's capacity → headroom → N+1/N+2 → AZs → regions. Press "Next step", or "Show all".` },
    { type: 'callout', tone: 'term', title: 'New word: Region failover', html: `<strong>What it is:</strong> xyz.com runs in two or three regions (like Mumbai and Hyderabad). If a whole region fails, its users' traffic is sent to another region.<br><strong>Why we need it:</strong> a region failing is rare, but it happens. The site must keep running even then.<br><strong>Without it:</strong> if a region fails, the site is down for all the users of that region.<br><strong>The cost:</strong> each region must be big enough to also carry the other region's traffic. With 2 regions, each one must handle the full peak.` },
    { type: 'custom',
      T: { pre: 'Example:', dau: 'DAU (crore users)', rpu: 'Requests per user per day', pf: 'Peak factor (× average)', per: 'What one server can handle (req/s)', hr: 'Headroom', sp: 'Spare servers', reg: 'Regions', fo: 'If a region fails, does another take over?', yes: 'Yes', no: 'No', az: 'AZs per region', min: 'At least this many per AZ', srv: 'server', next: 'Next step →', all: 'Show all', reset: 'Start over', total: 'Total servers', norm: 'Load at normal peak', azd: 'One AZ fails', regd: 'One region fails', both: 'Region + one AZ fail', na: 'not applicable', down: 'site down (for that region\'s users)',
        s1: (a, b, c) => `Users → requests/day: ${a} × ${b} = ${c} requests/day`,
        s2: (a, b) => `Average QPS: ${a} ÷ 10^5 (one day ≈ 10^5 s) = ${b} req/s`,
        s3: (a, f, b) => `Peak: ${a} × ${f} = ${b} req/s (plan for this)`,
        s4r1: (b) => `Per region: 1 region, so all ${b} req/s in one place`,
        s4fo: (b, r, c) => `Per region: ${b} ÷ (${r} − 1) = ${c} req/s (if one region fails, the remaining regions carry the full peak)`,
        s4no: (b, r, c) => `Per region: ${b} ÷ ${r} = ${c} req/s (no failover: each region carries only its own share)`,
        s5: (c, p, x) => `For one region, at exactly 100%: ${c} ÷ ${p} = ${x} servers`,
        s6: (x, h, y, n) => `× headroom ${h} = ${y} → round up: N = ${n}`,
        s7: (n, sp, ns) => `+ spares (N+${sp}) = ${ns}`,
        s8: (ns, az, m, pa, rt) => `Split across ${az} AZs: max(${m}, ceil(${ns} ÷ ${az})) = ${pa} per AZ → ${rt} per region`,
        s9: (rt, r, t) => `× ${r} region = ${t} servers in total`,
        okN: 'After every failure the load stays below 100%: the design survives.',
        badN: (w) => `Careful: the load goes above 100% for "${w}". Add headroom, spares or AZs.`,
        db: ' At this traffic, app servers are the easy part. The real question is the database, the cache and the CDN.' },
      presets: [
        { n: 'xyz.com API (default)', dau: 5, rpu: 20, pf: 3, per: 2000, hr: 1.5, sp: 1, reg: 2, fo: 1, az: 3, min: 2 },
        { n: 'Small startup', dau: 0.1, rpu: 20, pf: 3, per: 1000, hr: 1.5, sp: 0, reg: 1, fo: 0, az: 2, min: 1 },
        { n: 'Twitter-like feed', dau: 20, rpu: 100, pf: 3, per: 5000, hr: 1.5, sp: 0, reg: 1, fo: 0, az: 3, min: 2 },
        { n: 'Bank (N+2, 3 regions)', dau: 2, rpu: 10, pf: 5, per: 1000, hr: 1.5, sp: 2, reg: 3, fo: 1, az: 3, min: 2 },
      ],
      calc(p) {
        const reqDay = p.dau * 1e7 * p.rpu, avg = reqDay / 1e5, peak = avg * p.pf;
        const rp = p.reg === 1 ? peak : (p.fo ? peak / (p.reg - 1) : peak / p.reg);
        const raw = rp / p.per, withH = raw * p.hr;
        const N = Math.max(1, Math.ceil(withH - 1e-9)), NS = N + p.sp;
        const perAZ = Math.max(p.min, Math.ceil(NS / p.az)), rt = perAZ * p.az, total = rt * p.reg;
        const share = peak / p.reg, cap = rt * p.per, capAZ = (p.az - 1) * perAZ * p.per;
        const uNorm = share / cap;
        const uAZ = p.az > 1 ? share / capAZ : Infinity;
        const uReg = p.reg > 1 && p.fo ? (peak / (p.reg - 1)) / cap : null;
        const uBoth = p.reg > 1 && p.fo ? (peak / (p.reg - 1)) / capAZ : null;
        return { reqDay, avg, peak, rp, raw, withH, N, NS, perAZ, rt, total, uNorm, uAZ, uReg, uBoth };
      },
      render(el) {
        const T = this.T, self = this, st = Object.assign({}, this.presets[0]);
        let shown = 3;
        el.innerHTML = `<div class="dsr-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
          <div class="row2">
            <div><label>${T.dau}</label><input class="dsr-dau" type="number" min="0.01" step="0.1"></div>
            <div><label>${T.rpu}</label><input class="dsr-rpu" type="number" min="1" step="1"></div>
            <div><label>${T.pf}: <strong class="dsr-vpf"></strong></label><input class="dsr-pf" type="range" min="1" max="10" step="0.5"></div>
            <div><label>${T.per}</label><input class="dsr-per" type="number" min="1" step="100"></div>
            <div><label>${T.hr}: <strong class="dsr-vhr"></strong></label><input class="dsr-hr" type="range" min="1" max="2" step="0.1"></div>
            <div><label>${T.sp}</label><div class="dsr-sp" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.reg}</label><div class="dsr-reg" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.fo}</label><div class="dsr-fo" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.az}</label><div class="dsr-az" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.min}</label><div class="dsr-min" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
          </div>
          <ol class="dsr-steps" style="font:13px/1.7 var(--f-mono);background:var(--surface-2);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 10px 10px 34px;margin:10px 0;overflow-wrap:anywhere"></ol>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <button type="button" class="btn small primary dsr-next">${T.next}</button>
            <button type="button" class="btn small dsr-all">${T.all}</button>
            <button type="button" class="btn small ghost dsr-reset">${T.reset}</button></div>
          <div class="stats">
            <div class="stat"><span>${T.total}</span><strong class="dsr-o-t"></strong></div>
            <div class="stat"><span>${T.norm}</span><strong class="dsr-o-u"></strong></div>
            <div class="stat"><span>${T.azd}</span><strong class="dsr-o-az"></strong></div>
            <div class="stat"><span>${T.regd}</span><strong class="dsr-o-r"></strong></div>
            <div class="stat"><span>${T.both}</span><strong class="dsr-o-b"></strong></div>
          </div>
          <div class="calc-note dsr-note"></div>`;
        const $ = c => el.querySelector(c);
        const fmt = n => n >= 100 ? Math.round(n).toLocaleString('en-IN') : (Math.round(n * 100) / 100).toLocaleString('en-IN');
        const pct = u => u == null ? T.na : isFinite(u) ? Math.round(u * 100) + '%' : T.down;
        const colr = u => u == null ? 'var(--ink-3)' : !isFinite(u) || u > 1 ? 'var(--red)' : u > 0.85 ? 'var(--amber)' : 'var(--green)';
        const chips = (box, key, vals, lab) => { const b = $(box); b.innerHTML = ''; vals.forEach(v => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (st[key] === v ? ' on' : ''); c.textContent = lab(v); c.onclick = () => { st[key] = v; upd(); }; b.appendChild(c); }); };
        this.presets.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p.n; b.onclick = () => { Object.assign(st, p); sync(); upd(); }; $('.dsr-pre').appendChild(b); });
        const sync = () => { $('.dsr-dau').value = st.dau; $('.dsr-rpu').value = st.rpu; $('.dsr-pf').value = st.pf; $('.dsr-per').value = st.per; $('.dsr-hr').value = st.hr; };
        const upd = () => {
          chips('.dsr-sp', 'sp', [0, 1, 2], v => 'N+' + v);
          chips('.dsr-reg', 'reg', [1, 2, 3], v => String(v));
          chips('.dsr-fo', 'fo', [1, 0], v => v ? T.yes : T.no);
          chips('.dsr-az', 'az', [2, 3], v => String(v));
          chips('.dsr-min', 'min', [1, 2], v => v + ' ' + T.srv);
          $('.dsr-vpf').textContent = '×' + st.pf; $('.dsr-vhr').textContent = '×' + st.hr.toFixed(1);
          const r = self.calc(st);
          const s4 = st.reg === 1 ? T.s4r1(fmt(r.peak)) : st.fo ? T.s4fo(fmt(r.peak), st.reg, fmt(r.rp)) : T.s4no(fmt(r.peak), st.reg, fmt(r.rp));
          const lines = [T.s1(fmt(st.dau * 1e7), st.rpu, fmt(r.reqDay)), T.s2(fmt(r.reqDay), fmt(r.avg)), T.s3(fmt(r.avg), st.pf, fmt(r.peak)), s4,
            T.s5(fmt(r.rp), fmt(st.per), r.raw.toFixed(2)), T.s6(r.raw.toFixed(2), st.hr.toFixed(1), r.withH.toFixed(2), r.N), T.s7(r.N, st.sp, r.NS),
            T.s8(r.NS, st.az, st.min, r.perAZ, r.rt), T.s9(r.rt, st.reg, fmt(r.total))];
          $('.dsr-steps').innerHTML = lines.slice(0, shown).map(x => `<li>${x}</li>`).join('');
          const done = shown >= lines.length;
          $('.dsr-next').disabled = done;
          const out = [['.dsr-o-u', r.uNorm], ['.dsr-o-az', r.uAZ], ['.dsr-o-r', r.uReg], ['.dsr-o-b', r.uBoth]];
          $('.dsr-o-t').textContent = done ? fmt(r.total) : '?';
          out.forEach(([c, u]) => { $(c).textContent = done ? pct(u) : '?'; $(c).style.color = done ? colr(u) : 'var(--ink-3)'; });
          let note = '';
          if (done) {
            const bad = [[T.azd, r.uAZ], [T.regd, r.uReg], [T.both, r.uBoth]].find(([, u]) => u != null && u > 1);
            note = bad ? T.badN(bad[0]) : T.okN;
            if (r.peak >= 50000) note += T.db;
          }
          $('.dsr-note').textContent = note;
        };
        $('.dsr-next').onclick = () => { shown++; upd(); };
        $('.dsr-all').onclick = () => { shown = 99; upd(); };
        $('.dsr-reset').onclick = () => { shown = 3; upd(); };
        const num = (c, k) => $(c).addEventListener('input', e => { const v = Number(e.target.value); if (v > 0) { st[k] = v; upd(); } });
        num('.dsr-dau', 'dau'); num('.dsr-rpu', 'rpu'); num('.dsr-pf', 'pf'); num('.dsr-per', 'per'); num('.dsr-hr', 'hr');
        sync(); upd();
      },
    },
    { type: 'p', html: `Read the default example's numbers yourself: 5 crore DAU × 20 = 100 crore requests/day → 10,000 req/s average → × 3 = 30,000 peak. 2 regions with failover, so each region must handle the full 30,000: 15 servers × 1.5 = 22.5 → 23, N+1 = 24, 8-8-8 across 3 AZs. Both regions together: <strong>48 servers</strong>. On a normal day the load is only ~31%, because half the capacity is kept for "if the other region fails". If a region fails, 63%, and if an AZ fails along with the region, ~94%: survived, but at the edge. This is why a multi-region bill is heavy.` },

    { type: 'h3', text: 'For connections: how many gateways?' },
    { type: 'p', html: `In chat and live apps the limit is not requests/sec but <strong>open connections</strong> (one WebSocket per online user). The roadmap formula: concurrent users ÷ connections per gateway. In estimates, one gateway = ~1 lakh connections. For 10 crore online users, like WhatsApp: 10 crore ÷ 1 lakh ≈ <strong>1,000 gateway servers</strong>, plus a registry that remembers which user is on which gateway (the <a href="#/realtime">real-time</a> lesson).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Online users at peak (lakh)</label><input class="dsc-u" type="number" value="1000" min="1" step="1"></div>
          <div><label>Connections per gateway (thousand)</label><input class="dsc-c" type="number" value="100" min="1" step="1"></div>
          <div><label>Headroom: <strong class="dsc-vh"></strong></label><input class="dsc-h" type="range" min="1" max="2" step="0.1" value="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Gateway servers</span><strong class="dsc-o"></strong></div>
          <div class="stat"><span>One gateway fails: how many reconnect</span><strong class="dsc-r"></strong></div>
        </div>
        <div class="calc-note dsc-n"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const u = Math.max(1, +$('.dsc-u').value || 1) * 1e5, c = Math.max(1, +$('.dsc-c').value || 1) * 1e3, h = +$('.dsc-h').value;
        const g = Math.ceil(u / c * h - 1e-9), per = Math.round(u / g);
        $('.dsc-vh').textContent = '×' + h.toFixed(1);
        $('.dsc-o').textContent = g.toLocaleString('en-IN');
        $('.dsc-r').textContent = per.toLocaleString('en-IN');
        $('.dsc-n').textContent = `Formula: ${u.toLocaleString('en-IN')} ÷ ${c.toLocaleString('en-IN')} × ${h.toFixed(1)} = ${g.toLocaleString('en-IN')} gateways. If one gateway fails, its ~${per.toLocaleString('en-IN')} users will reconnect at the same moment: that is why reconnects need a random delay (jitter) and the other gateways need headroom.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Run it: an AZ fails, and which layer breaks first' },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: 'peak traffic', x: 70, y: 170, w: 110, kind: 'client', info: 'What it is: xyz.com users at the 9 pm peak. The plan is made for this, not for the average.' },
        { id: 'lb', label: 'Load balancer', x: 220, y: 170, w: 130, kind: 'net', info: 'What it is: the traffic splitter. With health checks (asking "are you alive?" every few seconds) it removes dead servers/AZs and spreads traffic across the remaining servers. Whether those servers can take the extra load is decided by headroom.' },
        { id: 'a', label: 'AZ-a servers', sub: '60 servers', x: 420, y: 55, w: 150, kind: 'server', meter: true, load: 67, info: 'What it is: the app servers in Availability Zone a. A data center with its own power and network. The meter shows how busy they are.' },
        { id: 'b', label: 'AZ-b servers', sub: '60 servers', x: 420, y: 170, w: 150, kind: 'server', meter: true, load: 67, info: 'What it is: the app servers in Availability Zone b. If AZ-a fails, they must take on its share.' },
        { id: 'c', label: 'AZ-c servers', sub: '60 servers', x: 420, y: 285, w: 150, kind: 'server', meter: true, load: 67, info: 'What it is: the app servers in Availability Zone c. If AZ-a fails, they must also take on its share.' },
        { id: 'db', label: 'Database', sub: 'leader + replicas', x: 625, y: 170, w: 150, kind: 'data', meter: true, load: 50, info: 'What it is: the main xyz.com database. All the app servers come here. Adding app servers is easy (they are stateless); growing the database is hard. That is why this often breaks first.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'a' }, { a: 'lb', b: 'b' }, { a: 'lb', b: 'c' }, { a: 'a', b: 'db' }, { a: 'b', b: 'db' }, { a: 'c', b: 'db' }],
      scenarios: [
        { name: 'Normal peak', steps: [
          { title: 'Peak traffic, 3 AZs', text: '600k req/s, 180 servers (5k each), 60 per AZ. Each server at ~67%.', flood: { paths: ['u>lb>a', 'u>lb>b', 'u>lb>c'], n: 12 } },
          { title: 'All comfortable', text: 'Each AZ takes its third. Most reads are kept away from the database by the cache.', go: ['b>db', 'res:db>b'], after: { a: { state: 'ok' }, b: { state: 'ok' }, c: { state: 'ok' } } },
        ]},
        { name: 'AZ fails (headroom ×2)', intro: 'The same traffic, but with × 2 headroom: 240 servers, 80 per AZ, 50% normal load.', steps: [
          { title: 'Normal: 50%', text: 'Every server is half empty.', set: { a: { load: 50, sub: '80 servers' }, b: { load: 50, sub: '80 servers' }, c: { load: 50, sub: '80 servers' } }, flood: { paths: ['u>lb>a', 'u>lb>b', 'u>lb>c'], n: 9 } },
          { title: 'Power cut in AZ-a', text: 'All of AZ-a is gone. The LB health checks remove it.', set: { a: { state: 'down', sub: 'AZ DOWN', load: 0 } }, go: 'lost:lb>a' },
          { title: 'The other AZs take the load', text: 'Now b and c carry 1.5 times the load: 50% → 75%. No new server had to be launched. Users barely noticed. This is static stability.', flood: { paths: ['u>lb>b', 'u>lb>c'], n: 12 }, after: { b: { load: 75, state: 'ok' }, c: { load: 75, state: 'ok' } } },
        ]},
        { name: 'Wrong: no headroom', intro: 'To save money, the fleet is so small that it runs at 85% at the normal peak.', steps: [
          { title: 'Normal: 85%', text: 'Everything looks green on the dashboard. No problem... yet.', set: { a: { load: 85, state: 'warn' }, b: { load: 85, state: 'warn' }, c: { load: 85, state: 'warn' } }, flood: { paths: ['u>lb>a', 'u>lb>b', 'u>lb>c'], n: 9 } },
          { title: 'AZ-a fails', text: 'Its traffic moves to b and c: 85% × 1.5 ≈ 128%.', set: { a: { state: 'down', sub: 'AZ DOWN', load: 0 } }, flood: { paths: ['u>lb>b', 'u>lb>c'], n: 14 }, after: { b: { load: 100, state: 'hot', sub: '128% demand' }, c: { load: 100, state: 'hot', sub: '128% demand' } } },
          { title: 'Cascading failure', text: 'Overloaded servers slow down, health checks fail, the LB removes them too, and the remaining servers get even more load. Users retry, and the load grows further. AZ-b fails too, then c. A problem in one AZ took down the whole site.', set: { b: { state: 'down', sub: 'DOWN' } }, flood: { paths: ['u>lb>c'], n: 14 }, after: { c: { state: 'down', sub: 'DOWN' } } },
          { title: 'Why autoscaling does not save you', text: 'New servers take minutes to arrive, boot and warm up. A cascade happens in seconds. The headroom has to be there in advance.', focus: ['lb'] },
        ]},
        { name: 'Scaled the wrong layer', intro: '"The site is slow, double the app servers!" See what happens.', steps: [
          { title: 'App servers doubled', text: 'Now the app servers are at 33%. But the site is still slow.', set: { a: { load: 33, sub: '120 servers' }, b: { load: 33, sub: '120 servers' }, c: { load: 33, sub: '120 servers' } }, flood: { paths: ['u>lb>a>db', 'u>lb>b>db', 'u>lb>c>db'], n: 12 }, after: { db: { load: 100, state: 'hot', sub: 'CPU 100%' } } },
          { title: 'The real bottleneck: the database', text: 'Every app server sends queries to the DB. More app servers = more DB connections = more pressure on the DB. The roadmap: "5 or 15 servers" is not the real question; the real question is which layer breaks first: usually the database, then hot keys, then connection limits.', go: ['bad:db>b'], focus: ['db'] },
          { title: 'The right fix', text: 'A cache (so most reads never reach the DB), read replicas, connection pooling, and sharding if writes are heavy. The app fleet goes back to its normal size.', set: { db: { load: 45, state: 'ok', sub: 'cache + replicas' } }, after: { a: { load: 67, sub: '60 servers' }, b: { load: 67, sub: '60 servers' }, c: { load: 67, sub: '60 servers' } }, go: ['b>db', 'res:db>b'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Worked scenarios' },
    { type: 'h3', text: '1. A new blog section on xyz.com' },
    { type: 'p', html: `10 lakh views/day ÷ 10<sup>5</sup> ≈ 10 req/s average, peak × 5 ≈ 50 req/s. 50 ÷ 2,000 × 1.5 = 0.04 → N = 1. But 1 server = a SPOF, so <strong>2 servers, in 2 AZs</strong>. Here the server count is set by redundancy, not capacity (the first line of the table).` },
    { type: 'h3', text: '2. A Twitter-like feed (the roadmap\'s worked example)' },
    { type: 'p', html: `200M DAU × 100 feed views ÷ 10<sup>5</sup> ≈ 200k reads/s, peak ≈ 600k/s. If one server handles 5k req/s (most of the work comes from the cache): 600k ÷ 5k × 1.5 = <strong>180 servers, 60-60-60 across 3 AZs</strong>. But the real design conclusion is that no database can take 600k reads/s: precomputed feeds and heavy caching.` },
    { type: 'h3', text: '3. WhatsApp-style chat gateways' },
    { type: 'p', html: `10 crore users online at the peak, each with one WebSocket. 10 crore ÷ 1 lakh per gateway ≈ <strong>1,000 gateways</strong> (more with headroom), plus a user → gateway registry. Here the bottleneck is not req/s but open connections and memory.` },
    { type: 'h3', text: '4. Trap: live cricket score, 3 crore viewers' },
    { type: 'p', html: `If every app polls every 5 seconds: 3 crore ÷ 5 = <strong>60 lakh req/s</strong>. Apply the formula: 6M ÷ 2k × 1.5 = 4,500 servers! Trap. The score JSON is the same for everyone, so this is a job for the CDN: the edges cache it for 1-2 seconds, and the origin gets only one or two requests per second from each edge. A small fleet is enough for the origin. Before applying the formula, ask: "should these requests even reach my servers?"` },
    { type: 'h3', text: '5. Trap: "one server does 10k req/s"' },
    { type: 'p', html: `Someone read in a blog that one server does 10k req/s, so for a 50k peak they ordered 5 × 1.5 ≈ 8 servers. But each xyz.com request makes 3 DB queries and resizes an image: the real capacity turned out to be 800 req/s. ~94 were needed. Take the per-server number from a load test of <strong>your own</strong> app; in estimates, use 1k-2k for requests that do real work.` },

    { type: 'h2', text: 'Practice: 6 small cases' },
    { type: 'p', html: `First do the maths yourself on paper. Then "Show signal", then the answer. Each answer shows the full formula.` },
    { type: 'custom',
      cases: [
        { q: 'Peak 12,000 req/s. The load test says one server does 1,500 req/s. Headroom × 1.5, 3 AZs. How many servers?', signal: 'The plain formula, then the AZ-loss check.', pick: '12 from the formula, but 15 is better (5 per AZ)', why: '12,000 ÷ 1,500 = 8; × 1.5 = 12 → 4 per AZ. If one AZ fails, 8 servers = 12,000 of capacity, which is 100%: right at the edge. Take 5 per AZ (15 total): if an AZ fails, 12,000 ÷ 15,000 = 80%.', trap: 'Stopping at the formula\'s number without checking AZ loss.' },
        { q: 'An image resize service: peak 300 resizes/s. Each resize takes 0.5 seconds of CPU, and one server has 8 cores. 3 AZs, headroom × 1.5.', signal: 'You must work out the per-server capacity yourself: cores ÷ time per request.', pick: '30 servers (10 per AZ)', why: 'One server = 8 cores ÷ 0.5 s = 16 resizes/s. 300 ÷ 16 = 18.75; × 1.5 = 28.1 → 29 → 10-10-10 across 3 AZs = 30. If an AZ fails, 300 ÷ (20 × 16) ≈ 94%.', trap: 'Using the "one server does 2,000 req/s" napkin number. For CPU-heavy work, the real capacity is 16, not 2,000.' },
        { q: 'xyz.com chat: 50 lakh users online at the peak, each with one WebSocket. One gateway handles 50,000 connections. Headroom × 1.5.', signal: 'Here the limit is open connections, not req/s.', pick: '150 gateways', why: '50,00,000 ÷ 50,000 = 100; × 1.5 = 150. If one gateway fails, its ~33,000 users will reconnect, so reconnects also need a random delay (jitter).', trap: 'Using the req/s formula for chat too. Even when users sit quietly, the connection stays open and uses memory.' },
        { q: '1 crore DAU, each user makes 30 requests a day. Peak factor × 4. One server does 2,000 req/s, headroom × 1.5, 3 AZs, at least 2 in each AZ.', signal: 'Start from users: first requests/day, then QPS, then the peak.', pick: '9 from the formula; 12 to survive an AZ loss (4 per AZ)', why: '1 crore × 30 = 30 crore/day ÷ 10^5 = 3,000 avg; × 4 = 12,000 peak. 12,000 ÷ 2,000 × 1.5 = 9 → 3 per AZ. If an AZ fails, 6 servers = 12,000: 100%. With 4 per AZ (12), an AZ failure gives 75%.', trap: 'Sizing for the average of 3,000: 3,000 ÷ 2,000 × 1.5 = 3 servers. The site will fall over at the peak.' },
        { q: 'App servers are at 30% CPU, but the site is slow and the p99 latency (the time of the slowest 1% of requests) is 4 seconds. The boss: "double the servers".', signal: 'The app servers are idle. The bottleneck is somewhere else.', pick: 'Do not add servers; find the bottleneck', why: 'Usually the database: a slow query, a lock, or a connection limit. Or a hot key, or a slow third party. More app servers = more connections to the DB = even slower.', trap: 'Treating "more servers" as the cure for every slowdown. The roadmap: the real question is which layer breaks first.' },
        { q: 'The xyz.com "Terms and conditions" page: 20,000 req/s on launch day, exactly the same page for everyone.', signal: 'The same content for everyone.', pick: 'CDN + 2 servers at the origin', why: 'The CDN edges cache the page. Each edge sends a request to the origin only now and then. The redundancy minimum (2 servers, 2 AZs) is enough for the origin.', trap: 'Ordering 20,000 ÷ 2,000 × 1.5 = 15 servers. First ask: should these requests even reach my servers?' },
      ],
      render(el) {
        const cases = this.cases, T = { case: 'Case', hint: 'Show signal', ans: 'Show answer', prev: '← Previous', next: 'Next →', signal: 'Signal', trap: 'Trap' };
        let i = 0, hint = false, ans = false;
        const draw = () => {
          const c = cases[i];
          el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
            <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn small" data-a="hint">${T.hint}</button>
              <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
              <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
              <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
            <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
            <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
              <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
              <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
          el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
            else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
            draw();
          });
        };
        draw();
      },
    },

    { type: 'callout', tone: 'tip', title: 'Decide (roadmap rule)', html: `servers = peak QPS ÷ QPS per server × headroom (1.3-2), then round up so every AZ has at least 2. Target utilisation 50-70% (2 AZs → ~50%, 3 AZs → ~67%) so that if one AZ fails, the others can take its load. For connections: concurrent users ÷ connections per gateway. And then ask the real question: <strong>which layer breaks first?</strong> Usually the database, then hot keys, then connection limits.` },

    { type: 'h2', text: 'How to say this in an interview' },
    { type: 'steps', items: [
      { t: 'From users to the peak', d: '"1 crore DAU × 30 = 30 crore/day ÷ 10^5 = 3,000 avg, × 4 = 12,000 peak." Say every number, so mistakes can be caught.' },
      { t: 'Say where the per-server number comes from', d: '"I am assuming ~2,000 req/s for a request that does real work; we will load test before production."' },
      { t: 'Headroom, spares, AZs', d: '"× 1.5, N+1, 4-4-4 across 3 AZs. If an AZ fails, ~75%." Do the failure maths out loud yourself.' },
      { t: 'Then the real bottleneck', d: '"App servers are easy. At this traffic the DB needs a cache and replicas, and shared content comes from the CDN." This is what the interviewer wants to hear.' },
    ]},
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'The xyz.com fleet: 2 regions, 3 AZs each', height: 575,
      groups: [
        { label: 'Region: Mumbai', x: 14, y: 200, w: 336, h: 362 },
        { label: 'Region: Hyderabad', x: 372, y: 200, w: 336, h: 362 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'peak 30,000 req/s', x: 360, y: 50, w: 150, kind: 'client', info: 'What it is: all xyz.com users. In the default example the peak is 30,000 req/s. The plan is for this peak, not for the average.' },
        { id: 'cdn', label: 'CDN', sub: 'static files', x: 150, y: 150, w: 140, kind: 'edge', info: 'What it is: cache servers near the user. Images, JS and videos come from here. Requests that end here do not need to be counted when sizing servers.' },
        { id: 'dns', label: 'Global DNS', sub: 'picks a region', x: 360, y: 150, w: 160, kind: 'net', info: 'What it is: the system that sends each user to a nearby region. If a region fails, it sends all users to the other region (region failover).' },
        { id: 'lbM', label: 'LB Mumbai', sub: 'health checks', x: 180, y: 270, w: 140, kind: 'net', info: 'What it is: the load balancer of the Mumbai region. With health checks it removes dead servers or a whole AZ, and spreads traffic across the remaining servers.' },
        { id: 'ma', label: 'AZ-a', sub: '8 servers', x: 70, y: 390, w: 90, kind: 'server', info: 'What it is: the first Availability Zone in Mumbai, 8 app servers. If it fails, the 16 servers in b and c take on its share.' },
        { id: 'mb', label: 'AZ-b', sub: '8 servers', x: 180, y: 390, w: 90, kind: 'server', info: 'What it is: the second AZ in Mumbai, 8 app servers, with separate power and network.' },
        { id: 'mc', label: 'AZ-c', sub: '8 servers', x: 290, y: 390, w: 90, kind: 'server', info: 'What it is: the third AZ in Mumbai, 8 app servers. 3 AZs so that a failure takes away only 1/3 of the capacity.' },
        { id: 'dbM', label: 'DB leader', sub: '+ cache', x: 180, y: 510, w: 140, kind: 'data', info: 'What it is: the main database (the leader) with a cache in front of it. Adding app servers is easy; this layer is not. It is often the first to break.' },
        { id: 'lbH', label: 'LB Hyderabad', sub: 'health checks', x: 540, y: 270, w: 140, kind: 'net', info: 'What it is: the load balancer of the Hyderabad region. Half the traffic on a normal day, all of it if Mumbai fails.' },
        { id: 'ha', label: 'AZ-a', sub: '8 servers', x: 430, y: 390, w: 90, kind: 'server', info: 'What it is: the first AZ in Hyderabad, 8 app servers. For region failover, Hyderabad is as big as Mumbai.' },
        { id: 'hb', label: 'AZ-b', sub: '8 servers', x: 540, y: 390, w: 90, kind: 'server', info: 'What it is: the second AZ in Hyderabad, 8 app servers.' },
        { id: 'hc', label: 'AZ-c', sub: '8 servers', x: 650, y: 390, w: 90, kind: 'server', info: 'What it is: the third AZ in Hyderabad, 8 app servers.' },
        { id: 'dbH', label: 'DB replica', sub: '+ cache', x: 540, y: 510, w: 140, kind: 'data', info: 'What it is: a copy of the database (a replica) with a cache, in Hyderabad. Reads come from here. If Mumbai fails, it can be made the leader.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', label: 'files' },
        { a: 'users', b: 'dns', n: 1 },
        { a: 'dns', b: 'lbM', n: 2 },
        { a: 'dns', b: 'lbH' },
        { a: 'lbM', b: 'ma' }, { a: 'lbM', b: 'mb', n: 3 }, { a: 'lbM', b: 'mc' },
        { a: 'lbH', b: 'ha' }, { a: 'lbH', b: 'hb' }, { a: 'lbH', b: 'hc' },
        { a: 'ma', b: 'dbM' }, { a: 'mb', b: 'dbM', n: 4 }, { a: 'mc', b: 'dbM' },
        { a: 'ha', b: 'dbH' }, { a: 'hb', b: 'dbH' }, { a: 'hc', b: 'dbH' },
        { a: 'dbM', b: 'dbH', label: 'replication', dashed: true },
      ],
      paths: [
        { name: 'Normal day', text: 'DNS sent half the users to Mumbai and half to Hyderabad. Each region has 24 of the 48 servers, load ~31%.', go: ['users>dns>lbM>mb>dbM', 'dns>lbH>hb>dbH'] },
        { name: 'AZ fails', text: 'Mumbai AZ-a failed. The LB removed it. The 16 servers in AZ-b and AZ-c are now at ~47%. No new server is needed.', go: ['bad:lbM>ma', 'users>dns>lbM>mb', 'lbM>mc'] },
        { name: 'Region fails', text: 'All of Mumbai is gone. DNS sent all users to Hyderabad. Hyderabad\'s 24 servers are at ~63%. That is why each region was built for the full peak.', go: ['bad:dns>lbM', 'users>dns>lbH>ha', 'lbH>hb', 'lbH>hc'] },
        { name: 'Static files', text: 'Images and JS come from the CDN. These requests never reach the servers, so they are not counted in the formula.', go: ['users>cdn', 'res:cdn>users'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>servers = peak QPS ÷ one server's capacity × headroom (1.3-2). The peak, not the average.</li>
      <li>Start from users: DAU × requests per user ÷ 10^5 = average QPS, × 2-5 = peak.</li>
      <li>The per-server number comes from a load test. In estimates, ~1k-2k req/s for a request that does real work.</li>
      <li>N+1 / N+2: one or two extra servers, so you survive a crash in the middle of a deploy.</li>
      <li>To keep running when one of k AZs fails: normal load ≤ (k−1)/k. 2 AZs → 50%, 3 AZs → ~67%. At least 2 in each AZ.</li>
      <li>Region failover: each region must also carry the other's traffic. 2 regions = each one built for the full peak.</li>
      <li>For connections: concurrent users ÷ connections per gateway.</li>
      <li>The real question: which layer breaks first? Usually the database, then hot keys, then connection limits.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Headroom + AZs: even if a server or a whole AZ fails, the site keeps running, without an emergency', 'Spikes and deploys (when some servers are out) are handled comfortably', 'The number comes from a formula, not from a guess or from fear'],
      costs: ['Money: 50-67% utilisation means 33-50% of the capacity sits idle most of the time', 'More servers = more DB connections, more deploys, more monitoring', 'If the estimate rests on a wrong per-server number, the whole answer is wrong: a load test is essential'],
    },
    { type: 'think', questions: [
      { q: '2 AZs or 3 AZs: which is cheaper if you must survive losing an AZ? 60k req/s, 2k per server.', a: 'Without headroom N = 30. With 2 AZs, even after losing an AZ you need 30 in one AZ, so 60 in total (50% utilisation). With 3 AZs, the 2 remaining AZs need 30, so 15 per AZ = 45 in total (67%). 3 AZs is 25% cheaper, because a failure takes away only one third of the capacity.' },
      { q: 'If we have autoscaling, why headroom? When the load grows, new servers will come.', a: 'New servers take minutes to arrive, boot, and warm up their cache/JIT. A spike or an AZ failure causes overload in seconds, and overload leads to a cascade. Autoscaling is for load that grows slowly; for a sudden jolt you need headroom kept ready in advance. And during an outage, the cloud\'s control plane may itself be under pressure.' },
      { q: 'App servers are at 40%, but the p99 latency is bad. Will you add servers?', a: 'No, first find which layer is the bottleneck. Often it is the database (slow queries, locks, the connection limit), or a hot key, or a slow third party. Adding app servers brings more connections and more load to the DB. Find the bottleneck from the metrics, then fix that layer.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Peak 8,000 req/s, one server does 2,000 req/s, headroom 1.5. What is N?', options: ['4', '6', '12'], answer: 1, explain: '8,000 ÷ 2,000 = 4; × 1.5 = 6.' },
      { q: '3 AZs are filled equally. One AZ fails. How many times more load do the remaining servers get?', options: ['1.33×', '1.5×', '3×'], answer: 1, explain: 'All the traffic is now on 2/3 of the servers: 3/2 = 1.5 times. That is why with 3 AZs the normal load stays below ~67%.' },
      { q: 'What does N+2 mean?', options: ['The servers needed for the peak + 2 extra', 'Double the servers', '2 AZs'], answer: 0, explain: 'Two extra: one is out for a deploy/maintenance and another fails, and the peak is still handled.' },
      { q: 'Which traffic do you size servers for?', options: ['The average', 'The peak (× 2 to × 5 the average), more for live events', 'The lowest traffic'], answer: 1, explain: 'A site falls over at the peak. If you size for the average, there is trouble every night at 9 pm.' },
    ]},
    { type: 'sources', items: [
      { title: 'Static stability using Availability Zones', publisher: 'Amazon Builders\' Library', official: true, url: 'https://aws.amazon.com/builders-library/static-stability-using-availability-zones/', used: 'Running through an AZ failure without launching new servers; the idea of ~66% utilisation (50% overprovisioning) across 3 AZs.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'What a region and an AZ are: separate, isolated locations inside a region, linked by a low-latency network.' },
    ]},
  ],
});
