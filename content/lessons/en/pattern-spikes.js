Lesson.register({
  id: 'pattern-spikes',
  title: 'Traffic spikes and hot keys',
  minutes: 30,
  summary: `The last over of a cricket final, the 12 o'clock second of a sale, or a viral video: traffic grows 5-10 times in minutes. In this lesson we climb a ladder of defences: add machines in advance, grow automatically, put work in a line, give every user a limit, turn some requests away when it is too crowded, make features lighter, and break up a crowd on one single item (a hot key). Turn everything on and off in a simulator and see for yourself.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine 1 lakh people visit xyz.com every evening, and today is the cricket final: 9 lakh people at once.<br>The servers can handle up to 1.5 lakh. What about the rest?<br>If we do nothing, the site gets slow for everyone, then falls over, and people keep pressing refresh, which makes the crowd even bigger.<br>In this lesson we learn what to do when we know the crowd is coming, what to do when it comes suddenly, and how to save the <em>most important</em> thing (the video playing) when there really is no room.` },
    { type: 'h2', text: 'The ladder for this pattern' },
    { type: 'p', html: `Each rung is a new tool. The lower ones are cheap; the higher ones take more work. Real systems use many rungs together (in layers), but to learn we will climb one at a time:` },
    { type: 'steps', items: [
      { t: 'Rung 1: Headroom + pre-scaling', d: 'Do you know the event is coming (match, sale)? Get machines, cache and DB ready in advance.' },
      { t: 'Rung 2: Autoscaling', d: 'A sudden crowd? Machines grow by themselves. But they arrive late (lag).' },
      { t: 'Rung 3: Queue (shock absorber)', d: 'Put work that can happen later (likes, history) in a line. The line takes the hit of the crowd.' },
      { t: 'Rung 4: Rate limiting', d: 'A limit for every user and bot. It also stops floods of retries.' },
      { t: 'Rung 5: Load shedding by priority', d: 'No room at all? Turn away less important requests at once, save the important ones.' },
      { t: 'Rung 6: Graceful degradation', d: 'Take the request, but give a lighter answer (one common page instead of a personalised home page).' },
      { t: 'Rung 7: Breaking up hot keys', d: 'Is everyone reading the same thing (the score)? Local cache, copies, or pieces of a counter.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop climbing', html: `A small app with spikes up to 2x? Headroom + autoscaling is enough. A few big known events a year? Add pre-scaling + load tests. A live event with crores of users? The whole ladder, because any missing rung becomes the weak link. Each rung ends with a "when to stop" note.` },
    { type: 'h2', text: 'The problem: from 1 lakh to 9 lakh in 15 minutes' },
    { type: 'p', html: `xyz.com now also shows live cricket. On a normal evening about 1 lakh requests arrive per second (written as <strong>rps</strong>: requests per second). Today is the final. After the toss the traffic climbs, reaches ~5 lakh in the last overs, and in the minute of the winning run, when the app sends a push notification, it hits <strong>~9 lakh rps</strong>. The servers are built to handle 1.5 lakh comfortably.` },
    { type: 'p', html: `This is not made up. In a talk at AWS re:Invent 2019, Hotstar (now JioHotstar) engineers said that during the India vs New Zealand match of the 2019 World Cup, <strong>2.53 crore people were streaming at the same time</strong>, and their traffic graph looked like a "tsunami": lakhs of new users within a few minutes. The first second of the Big Billion Days sale and the "Happy New Year" messages at midnight: all have the same shape.` },
    { type: 'callout', tone: 'term', title: 'Traffic spike', html: `<strong>What it is:</strong> traffic suddenly becoming many times bigger for a short time. Like going from 1 lakh rps to 9 lakh rps in 15 minutes.<br><strong>Why it matters:</strong> a system must be built for its worst minute, not its average. That minute is also the most important one (the last over of the match).<br><strong>Without it (in mind):</strong> the design fits the average, and the site falls over on the biggest day of the year.` },
    { type: 'callout', tone: 'term', title: 'Headroom', html: `<strong>What it is:</strong> how much extra capacity is kept free above the normal load. 1 lakh load, 1.5 lakh capacity = 50% headroom.<br><strong>Why we need it:</strong> small spikes (like 1.3x) are absorbed without doing anything, and autoscaling gets time to bring machines.<br><strong>Without it:</strong> the site slows down on every small wave.<br><strong>Limit:</strong> headroom does not stop a 9x spike. Keeping 9x headroom all the time = 8 parts of the machines sit empty all year, which is very expensive.` },
    { type: 'p', html: `There are two kinds of spikes, and each needs a different treatment:` },
    { type: 'table', head: ['', 'Known in advance', 'Not known (sudden)'], rows: [
      ['Example', 'Match, sale, New Year, product launch', 'Viral video, celebrity post, breaking news'],
      ['How much time you get', 'Days or weeks ahead', 'Zero. It arrived in minutes'],
      ['Main tool', 'Pre-scaling + load testing', 'Autoscaling + shedding + degradation'],
      ['Risk', 'Wrong forecast (more people came)', 'Autoscaling lag'],
    ]},

    { type: 'h2', text: 'Rung 1: headroom + pre-scaling (if you know, get ready early)' },
    { type: 'p', html: `<strong>Problem:</strong> the date of the final is known weeks ahead. If we wait for the match to start and only then add machines, it will be too late. So why not get ready in advance?` },
    { type: 'callout', tone: 'term', title: 'Pre-scaling (pre-warming)', html: `<strong>What it is:</strong> raising capacity <em>before</em> the event starts, based on a forecast (an estimate). Not only app servers: warming the cache (popular data already in Redis), database read replicas, connection pools, load balancer and CDN capacity, and the limits (quota) of the cloud account too.<br><strong>Why we need it:</strong> bringing a new machine takes minutes. For a known event, spend those minutes in advance.<br><strong>Without it:</strong> the first 5-10 minutes of the match run on the old capacity, and those are the heaviest minutes.` },
    { type: 'steps', items: [
      { t: 'Forecast', d: 'Last year\'s final, today\'s teams, the day, the time. Work out a number like "the peak will be ~7.5 lakh rps", and add a safety margin.' },
      { t: 'Load test', d: 'Before the real event, send that much traffic with fake users. In their talk Hotstar described a load-testing setup called "Project HULK" that simulated tsunami-like traffic from many regions, the jolt after a push notification, and even CDN failures.' },
      { t: 'Game day', d: 'A fake "match day" where the team breaks things together on purpose (chaos engineering): one zone off, one cache cluster down. You learn which part falls first.' },
      { t: 'Scale up, then the event', d: 'Before the match, machines are running, warm and health-checked. According to summaries of the Hotstar talk, they drove scaling with their own scripts based on concurrent viewers instead of request rate.' },
      { t: 'Scale down after the event', d: 'Otherwise you pay for empty machines. This is the price of pre-scaling: hours of capacity that may not be fully used.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Load test and game day', html: `<strong>What it is:</strong> load test = sending real-sized traffic with fake users (scripts) to see where the system breaks. Game day = the team breaks things on purpose together (one zone off, cache down), so there is no surprise on the real day.<br><strong>Why we need it:</strong> a forecast is a guess. A test shows the real weak link: often not the app, but the database or one hot key.<br><strong>Without it:</strong> you find out for the first time during the real match.` },
    { type: 'callout', tone: 'tip', html: `A push notification creates a spike by itself: "India won!" goes to 5 crore phones at once, and lakhs of people open the app within 30 seconds. So big notifications are sent <strong>in batches</strong> (not to everyone in one second), or capacity is checked before sending.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 1)', html: `No big known event all year, and spikes only up to 1.3-1.5x? A little headroom is enough; do not spend effort on pre-scaling. Pre-scale when you know the date and even one minute of downtime is costly (final, sale, launch).` },

    { type: 'h2', text: 'Rung 2: autoscaling, and its lag' },
    { type: 'p', html: `<strong>Problem:</strong> a creator's video suddenly went viral. There was no forecast. Traffic became 3x in 10 minutes. Nobody is going to add machines by hand at 2 am; the system must grow by itself.` },
    { type: 'callout', tone: 'term', title: 'Autoscaling', html: `<strong>What it is:</strong> a rule that watches a number (a metric: CPU, rps, queue length) and adds or removes machines by itself. Like "if average CPU stays above 70% for 2 minutes, add 20% more machines". AWS Auto Scaling groups, Kubernetes HPA and GCP managed instance groups all do this.<br><strong>Why we need it:</strong> for unknown spikes, and to save money by running fewer machines at night.<br><strong>Without it:</strong> either you always run peak-sized machines (expensive), or the site goes down on every viral video.` },
    { type: 'p', html: `Its problem is the <strong>lag</strong>. A new machine goes through these steps before it takes traffic:` },
    { type: 'ascii', text: `
 load rises ──> metric window ──> decision ──> machine boot ──> app start ──> health check ──> LB sends traffic
                (1-3 min avg)     (cooldown)    (~1 min+)       + cache/JIT     (a few checks)
                                                                  warm-up
 └──────────────────────────── often several minutes ───────────────────────────────────────┘
 During all this time the old capacity carries the new load.` },
    { type: 'p', html: `The problems listed in the Hotstar talk: during the spike the cloud provider ran out of that machine type (insufficient capacity), the app took ~1 minute to start while traffic grew by 10 lakh+ users every minute, and retries of failed requests added even more load. So by the time new machines arrived, the crowd had already moved ahead.` },
    { type: 'list', items: [
      `<strong>Ways to cut the lag:</strong> pre-built images (everything installed, just start), containers (start faster than VMs), a warm pool (machines already booted, only need to join the LB), and catching the signal early (request rate or queue length instead of CPU, because they rise first).`,
      `<strong>Scale in slowly:</strong> do not remove machines right after the spike. Traffic can jump a second time (after the innings break). Keep the cooldown (the waiting time between two scaling decisions) long.`,
      `<strong>The ceiling of autoscaling:</strong> the database and other stateful parts do not scale in minutes. If app servers become 10x, the DB behind them gets 10x connections. That is why the other defences are needed.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"We are on the cloud and autoscaling is on, so why worry about spikes?" Because autoscaling is <strong>reactive</strong>: first the load rises, then the metric shows it, then a new machine boots, then the app warms up. The traffic that arrives in between (often several minutes) lands on the old capacity. The Hotstar talk also said that normal autoscaling was not enough for their tsunami traffic. Autoscaling is the <em>second</em> answer to a spike, not the first.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 2)', html: `Put autoscaling on every stateless service; it is cheap. If your spikes arrive slowly (2x in an hour), autoscaling + headroom is enough. For spikes of 5x in a minute you need the next rungs.` },

    { type: 'h2', text: 'Rung 3: queue-based load levelling (shock absorber)' },
    { type: 'p', html: `Not every request needs an answer <em>right now</em>. Playing the video is needed now. But the like count, the watch-history event "I watched 10 minutes", comment moderation, analytics: if these happen 30 seconds later, the user does not care. Instead of doing them inside the request, put them in a <a href="#/queues">queue</a>, give the user <code>202 Accepted</code> at once, and let workers do them at their fixed speed.` },
    { type: 'callout', tone: 'term', title: 'Queue-based load levelling', html: `<strong>What it is:</strong> using a queue as a <strong>shock absorber</strong>. Incoming traffic jumps up and down, but workers take it at an even speed. At the peak the line (backlog) gets long; after the spike it empties.<br><strong>Why we need it:</strong> a database can only write up to a certain speed. The queue protects that speed: the DB never sees the peak.<br><strong>Without it:</strong> the spike hits the DB directly, writes fail, and retries of failed writes add more load.<br><strong>The price:</strong> <strong>delay</strong> (the work happens later). It only works for work whose answer the user does not need at once.` },
    { type: 'p', html: `<strong>Shock absorber lab.</strong> Normally 20,000 async writes arrive every second (likes, watch history). From minute 20 a spike comes. Workers write to the DB at a fixed speed (set equal to the DB's safe limit). See how long the line gets, how late the work happens, and when the line empties.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Spike size: <strong class="psq-vh"></strong></label><input class="psq-h" type="range" min="2" max="10" step="1" value="4"></div>
          <div><label>Spike length: <strong class="psq-vl"></strong></label><input class="psq-l" type="range" min="5" max="30" step="5" value="10"></div>
          <div><label>Worker speed (writes/s): <strong class="psq-vw"></strong></label><input class="psq-w" type="range" min="20000" max="120000" step="10000" value="50000"></div>
        </div>
        <svg class="psq-svg" viewBox="0 0 600 200" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Incoming writes vs DB writes and backlog"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-3)"><span style="color:var(--ink-2)">┄ incoming writes/s</span><span style="color:var(--green)">━ writes/s on the DB</span><span style="color:var(--amber)">█ line (backlog)</span></div>
        <div class="stats">
          <div class="stat"><span>Longest line</span><strong class="psq-max"></strong></div>
          <div class="stat"><span>Max delay of the work</span><strong class="psq-del"></strong></div>
          <div class="stat"><span>Line empty at</span><strong class="psq-dr"></strong></div>
          <div class="stat"><span>DB peak without a queue</span><strong class="psq-pk"></strong></div>
        </div>
        <div class="calc-note psq-note"></div>`;
      const $ = c => el.querySelector(c), B = 20000, T = 60, S0 = 20;
      const sim = (h, len, W) => { let bl = 0, mx = 0, drain = -1; const inc = [], db = [], q = [];
        for (let t = 0; t < T; t++) { const i = t >= S0 && t < S0 + len ? B * h : B; const avail = bl + i * 60, done = Math.min(avail, W * 60); bl = avail - done; mx = Math.max(mx, bl);
          if (t >= S0 + len && bl === 0 && drain < 0 && mx > 0) drain = t + 1; inc.push(i); db.push(done / 60); q.push(bl); }
        return { inc, db, q, mx, drain, peak: B * h }; };
      const f = n => n >= 1e7 ? (n / 1e7).toFixed(2) + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const h = +$('.psq-h').value, len = +$('.psq-l').value, W = +$('.psq-w').value, r = sim(h, len, W);
        $('.psq-vh').textContent = h + 'x'; $('.psq-vl').textContent = len + ' min'; $('.psq-vw').textContent = W.toLocaleString('en-IN');
        const top = Math.max(B * 10, W) * 1.05, qtop = Math.max(r.mx, 1);
        const X = i => 30 + i * (560 / (T - 1)), Y = v => 170 - v / top * 155, YQ = v => 170 - v / qtop * 120;
        const bars = r.q.map((v, i) => v > 0 ? `<rect x="${(X(i) - 4).toFixed(1)}" y="${YQ(v).toFixed(1)}" width="8" height="${(170 - YQ(v)).toFixed(1)}" fill="var(--amber)" opacity=".45"/>` : '').join('');
        const line = (a, col, dash, w) => `<polyline points="${a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? 'stroke-dasharray="4 4"' : ''}/>`;
        $('.psq-svg').innerHTML = `<line x1="30" x2="590" y1="170" y2="170" stroke="var(--line)"/>` + bars + line(r.inc, 'var(--ink-2)', 1, 1.5) + line(r.db, 'var(--green)', 0, 2.5) +
          `<text x="310" y="192" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">minute 0 → 60</text>`;
        const over = W < B;
        $('.psq-max').textContent = f(r.mx) + ' msgs'; $('.psq-del').textContent = (Math.round(r.mx / (W * 60) * 10) / 10) + ' min';
        $('.psq-dr').textContent = over ? 'never' : r.mx === 0 ? 'no line formed' : r.drain > 0 ? 'minute ' + r.drain : 'after 60';
        $('.psq-pk').textContent = r.peak.toLocaleString('en-IN') + '/s';
        $('.psq-note').textContent = over ? 'The workers are slower than even normal traffic (20,000/s): the line will always grow. A queue can absorb a spike, not a constant overload. Add workers.' : r.mx === 0 ? 'The workers are faster than the spike: no line formed. (So many workers means the DB must also take the peak.)' : `Without a queue the DB would have to take ${r.peak.toLocaleString('en-IN')}/s. With the queue the DB never went above ${W.toLocaleString('en-IN')}/s. The price: some likes showed up to ${(Math.round(r.mx / (W * 60) * 10) / 10)} minutes late.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'p', html: `Defaults (4x spike, 10 minutes, workers 50,000/s): the longest line is 1.8 crore messages, the work is at most 6 minutes late, and the line is empty by minute 40. The DB never saw more than 50,000/s, while without a queue 80,000/s would have arrived. Set the workers below 20,000/s: the line never empties. This is the rule: <strong>a queue can absorb a spike, not a constant overload</strong>.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 3)', html: `If most requests in your spike are "need an answer now" ones (video play, login), a queue will not help them; you need the next rungs. Use a queue when a big part of the traffic is background work (likes, views, analytics, emails) and a few minutes of delay is fine.` },

    { type: 'h2', text: 'Rung 4: rate limiting' },
    { type: 'p', html: `<strong>Problem:</strong> during the match some bots hit the score API every 100 ms, and when the site gets slow, apps retry 3 times each by themselves. A small group of clients creates a very big load.` },
    { type: 'callout', tone: 'term', title: 'Rate limiting (a reminder)', html: `<strong>What it is:</strong> a limit for each client (user, IP, API key), like "100 requests per minute". Above the limit: <code>429 Too Many Requests</code>.<br><strong>Why we need it:</strong> one client must not eat everyone else's share.<br><strong>Without it:</strong> one bot or one buggy app can take down the whole site.` },
    { type: 'p', html: `<a href="#/rate-limiting">Rate limiting</a> keeps each client within its share. During a spike it does two jobs: (1) bots and scrapers that hit the score API every 100 ms during the match get <code>429</code>; (2) it stops a <strong>retry storm</strong>. When the server is slow, apps retry, and every retry is a new request. Without a limit, failure doubles the load by itself. You need both exponential backoff + jitter on clients (<a href="#/resilience">resilience</a> lesson) and a per-user limit on the server.` },
    { type: 'callout', tone: 'warn', html: `Rate limiting alone does not stop a spike. During the final there are 2 crore <em>normal</em> users, each within their own limit. The total is still above capacity. There you need the next defence: the system protecting itself.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 4)', html: `If you have a public API or app, always add rate limiting (cheap, at the gateway). But if the spike comes from real users (all within their limits), this rung does nothing; you need the next two.` },

    { type: 'h2', text: 'Rung 5: load shedding, with priority' },
    { type: 'p', html: `When the total load is above capacity, there are only two ways: let every request in and everyone gets slow, or turn some away at once and serve the rest properly. The first way sounds "fair", but it is actually the worst:` },
    { type: 'callout', tone: 'term', title: 'Congestion collapse', html: `<strong>What it is:</strong> the worst state of overload. On an overloaded server every request waits in a line. The client times out after 2 seconds and leaves, but the server keeps working on that request: <strong>wasted work</strong>. Then the client retries: more load. Result: the server is 100% busy, but the useful output (requests finished in time) keeps falling. This is called congestion collapse.<br><strong>Why it matters:</strong> "let everyone in" sounds fair, but it makes everyone fail.` },
    { type: 'p', html: `<strong>Load shedding</strong> (first seen in the <a href="#/rate-limiting">rate limiting</a> lesson) is the cure: the server watches its own load (CPU, in-flight requests, waiting time in the line), and above a limit it gives a <em>cheap</em> rejection (<code>503</code> + <code>Retry-After</code>) right at the start, without doing any heavy work. And it rejects by <strong>priority</strong>:` },
    { type: 'table', head: ['Priority', 'On xyz.com', 'Under overload'], rows: [
      ['Critical', 'Video play, login, payment/subscription', 'Dropped last of all'],
      ['Normal', 'Posting comments, likes, search', 'Put in a queue or do later'],
      ['Low', 'Recommendations, "watch more" prefetch, analytics beacons', 'Dropped first'],
    ], caption: 'The priority comes from the request path/header and is checked right at the gateway, so a shed request costs very little.' },
    { type: 'callout', tone: 'term', title: 'Load shedding', html: `<strong>What it is:</strong> the server's way of protecting itself. It watches its load (CPU, how many requests are running inside, waiting time in the line). Above the limit it gives new requests an immediate, cheap "not now" (<code>503</code> + <code>Retry-After</code>), without doing any heavy work.<br><strong>Why we need it:</strong> the requests that do get in finish in time. And when turning requests away, the less important ones go first.<br><strong>Without it:</strong> congestion collapse: everyone in, everyone late, everyone fails.` },
    { type: 'p', html: `<strong>Goodput lab.</strong> Goodput = the requests that finished <em>in time</em> (the useful ones). Capacity is 1.5 lakh rps. Raise the incoming load (offered load) and compare the goodput of both ways. The model is simple: without shedding, the further above capacity, the more wasted work (timeouts), but at least 35% of the work survives. With shedding the server stays at 90%.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Offered load: <strong class="psg-vx"></strong></label><input class="psg-x" type="range" min="0.5" max="3" step="0.1" value="2"></div>
        <svg class="psg-svg" viewBox="0 0 600 210" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Goodput vs offered load, with and without shedding"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-3)"><span style="color:var(--red)">━ without shedding</span><span style="color:var(--green)">━ shedding by priority</span></div>
        <div class="stats">
          <div class="stat"><span>Goodput without shedding</span><strong class="psg-a"></strong></div>
          <div class="stat"><span>Goodput with shedding</span><strong class="psg-b"></strong></div>
          <div class="stat"><span>Video play saved (without / with)</span><strong class="psg-c"></strong></div>
          <div class="stat"><span>Latency (without / with)</span><strong class="psg-d"></strong></div>
        </div>
        <div class="calc-note psg-note"></div>`;
      const $ = c => el.querySelector(c), CAP = 1.5;
      const no = x => x <= 1 ? x : Math.max(0.35, 1 - 0.5 * (x - 1));
      const sh = x => x <= 1 ? x : 0.9;
      const critNo = x => x <= 1 ? 1 : no(x) / x, critSh = x => x <= 1 ? 1 : Math.min(0.5 * x, 0.9) / (0.5 * x);
      const upd = () => {
        const x = +$('.psg-x').value;
        $('.psg-vx').textContent = x.toFixed(1) + 'x capacity (' + (x * CAP).toFixed(2) + ' lakh rps)';
        const X = v => 40 + (v - 0.5) / 2.5 * 540, Y = v => 180 - v / 1.1 * 160, pts = fn => { const a = []; for (let v = 0.5; v <= 3.001; v += 0.05) a.push(X(v).toFixed(1) + ',' + Y(fn(v)).toFixed(1)); return a.join(' '); };
        $('.psg-svg').innerHTML = `<line x1="40" x2="580" y1="${Y(1)}" y2="${Y(1)}" stroke="var(--line-2)" stroke-dasharray="3 4"/><text x="44" y="${Y(1) - 5}" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">capacity</text>
          <line x1="40" x2="580" y1="180" y2="180" stroke="var(--line)"/><line x1="${X(1)}" x2="${X(1)}" y1="20" y2="180" stroke="var(--line)"/>
          <polyline points="${pts(no)}" fill="none" stroke="var(--red)" stroke-width="2.5"/><polyline points="${pts(sh)}" fill="none" stroke="var(--green)" stroke-width="2.5"/>
          <line x1="${X(x)}" x2="${X(x)}" y1="20" y2="180" stroke="var(--accent)" stroke-width="2"/>
          <text x="310" y="203" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">offered load: 0.5x → 3x capacity</text>`;
        const pc = v => Math.round(v * 100) + '%';
        $('.psg-a').textContent = (no(x) * CAP).toFixed(2) + ' lakh'; $('.psg-b').textContent = (sh(x) * CAP).toFixed(2) + ' lakh';
        $('.psg-c').textContent = pc(critNo(x)) + ' / ' + pc(critSh(x));
        $('.psg-d').textContent = x <= 1 ? 'normal' : 'timeouts / ~280 ms';
        $('.psg-note').textContent = x <= 1 ? 'Within capacity: both are the same. Shedding only does something when the load is above the limit.' : `Without shedding the goodput is ${(no(x) * CAP).toFixed(2)} lakh: below capacity, because the server kept working on requests that had already timed out. With shedding it is ${(sh(x) * CAP).toFixed(2)} lakh, and ${pc(critSh(x))} of video play (critical, half the traffic) was saved, because low-priority requests like recommendations were dropped first.`;
      };
      $('.psg-x').oninput = upd; upd();
    }},
    { type: 'p', html: `At 2x load: without shedding the goodput is only 0.75 lakh rps (half of capacity!) and only 25% of video plays survive. With shedding it is 1.35 lakh rps and 90% of video plays survive. Shedding does not add capacity; it stops wasted work and puts important work first.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 5)', html: `Every service that can get overloaded needs at least simple shedding (a limit on in-flight requests). Add priority-based shedding when the traffic has clear "important" and "less important" parts. Small internal tools do not need it.` },

    { type: 'h2', text: 'Rung 6: graceful degradation ("panic mode")' },
    { type: 'callout', tone: 'term', title: 'Graceful degradation', html: `<strong>What it is:</strong> running a lighter version of the app in hard times. Take the request, but give a cheaper answer. Like switching on only the important lights when power is low.<br><strong>Why we need it:</strong> building a personalised home page needs 5 services; one common cached page needs almost nothing. The same machines can then serve 3-5 times more users.<br><strong>Without it:</strong> either you run every feature and the site falls, or you turn requests away. There is no middle way.` },
    { type: 'p', html: `Shedding <em>drops</em> a request. Degradation makes a request <em>cheaper</em>. Instead of a personalised home page (a recommendation service, history and an ML model for each user), one cached home page for everyone. The live score every 5 seconds instead of every second. The comments section off, the video on. In the <a href="#/resilience">Resilience</a> lesson we saw fallbacks; during a spike these same fallbacks are switched on on purpose, in advance.` },
    { type: 'p', html: `According to summaries of the Hotstar talk, when the system was close to breaking they turned off features like recommendations and personalisation, so that core parts like video streaming and payment/subscription kept running. These switches (feature flags / kill switches) are built and tested in advance; nobody writes code in the middle of the match.` },
    { type: 'callout', tone: 'mistake', title: 'Shedding vs degradation vs rate limiting', html: `People mix these three up. <strong>Rate limiting</strong>: "you (one client) are above your limit". <strong>Load shedding</strong>: "I (the server) am full, not this request right now". <strong>Degradation</strong>: "I will take the request, but give a cheaper, lighter answer". All three work together.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 6)', html: `Build degradation switches (feature flags) when you really have costly "extra" features (recommendations, personalisation, live counters) and the core feature (video) is separate. Test every switch in advance; turning one on for the first time in the middle of a match is dangerous.` },

    { type: 'h2', text: 'Spike simulator: rungs 1-6 together' },
    { type: 'p', html: `60 minutes, one step per minute. Normal ~1 lakh rps, rising from minute 15, ~5 lakh in minutes 20-45, and ~9 lakh in minutes 30-35 (the win + push notification). The normal fleet handles 1.5 lakh rps. Turn defences on and off and see: how many were served, how many were dropped, what happened to critical requests (video, login), latency, and cost.` },
    { type: 'custom', render(el) {
      const SIM = (o) => {
        const T = 60, CAP0 = 150, PRE = 750, QC = 200, TO = 3000;
        let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const base = t => t < 15 ? 100 : t < 20 ? 100 + (t - 14) * 70 : t < 30 ? 500 : t < 35 ? 900 : t < 45 ? 500 : t < 50 ? 200 : 120;
        const D = []; for (let t = 0; t < T; t++) D.push(Math.round(base(t) * (1 + 0.08 * (rnd() - 0.5))));
        const want = []; let retry = 0, backlog = 0;
        const out = { dem: [], cap: [], srv: [], drop: [] };
        let tot = 0, served = 0, dropped = 0, critTot = 0, critDrop = 0, worst = 0, maxDelay = 0, cost = 0;
        for (let t = 0; t < T; t++) {
          const dem = D[t] + retry;
          let cap = o.pre && t >= 5 && t < 50 ? PRE : CAP0;
          if (o.auto) { const k = t - o.lag; if (k >= 0) { let m = 0; for (let j = Math.max(0, k - 10); j <= k; j++) m = Math.max(m, want[j] || 0); cap = Math.max(cap, m); } }
          let crit = dem * 0.5, asy = dem * 0.3, low = dem * 0.2;
          if (o.queue) { backlog = Math.max(0, backlog + (asy - QC) * 60); maxDelay = Math.max(maxDelay, backlog / (QC * 60)); served += asy * 60; asy = 0; }
          const syncLoad = crit + asy + low, over = syncLoad > cap, deg = o.degrade && over;
          const cC = deg ? 0.85 : 1, cA = deg ? 0.85 : 1, cL = deg ? 0.2 : 1;
          const work = crit * cC + asy * cA + low * cL;
          let sC = crit, sA = asy, sL = low, lat;
          if (work <= cap) { const u = work / cap; lat = 100 + 20 * u / (1 - Math.min(u, 0.95)); }
          else if (o.shed) {
            let b = cap * 0.9;
            sC = Math.min(crit, b / cC); b -= sC * cC; sA = Math.min(asy, b / cA); b -= sA * cA; sL = Math.min(low, b / cL);
            lat = 100 + 20 * 0.9 / 0.1;
          } else { const e = Math.max(0.35, 1 - 0.5 * (work / cap - 1)), f = cap * e / work; sC = crit * f; sA = asy * f; sL = low * f; lat = TO; }
          const s = sC + sA + sL, d = syncLoad - s;
          retry = d * (o.shed ? 0.1 : 0.5);
          want[t] = Math.ceil(syncLoad / 0.7);
          tot += dem * 60; served += s * 60; dropped += d * 60; critTot += crit * 60; critDrop += (crit - sC) * 60;
          worst = Math.max(worst, lat); cost += cap;
          out.dem.push(dem); out.cap.push(cap); out.srv.push(s + (o.queue ? dem * 0.3 : 0)); out.drop.push(d);
        }
        return { out, tot, served, dropped, critPct: critDrop / critTot * 100, worst, maxDelay, cost, servedPct: served / tot * 100 };
      };
      const DEF = [['pre', 'Pre-scale (7.5 lakh)'], ['auto', 'Autoscale'], ['queue', 'Queue (async 30%)'], ['shed', 'Shed by priority'], ['degrade', 'Degrade features']];
      const PRESETS = [['Nothing', {}], ['Autoscale only', { auto: 1 }], ['Pre-scale only', { pre: 1 }], ['Autoscale + shed', { auto: 1, shed: 1 }], ['All on', { pre: 1, auto: 1, queue: 1, shed: 1, degrade: 1 }]];
      const o = { lag: 5 };
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">Presets:</div><div class="psPre" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px"></div>
        <div style="font-size:13px;color:var(--ink-3)">Defences (click to turn on/off):</div><div class="psDef" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px"></div>
        <div><label>Autoscaling lag: <strong class="psLagV"></strong></label><input class="psLag" type="range" min="1" max="10" step="1" value="5"></div>
        <svg class="psChart" viewBox="0 0 600 230" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Traffic, capacity, served and dropped over 60 minutes"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-3)"><span style="color:var(--ink-2)">┄ demand</span><span style="color:var(--accent)">━ capacity</span><span style="color:var(--green)">━ served</span><span style="color:var(--red)">█ dropped</span></div>
        <div class="stats">
          <div class="stat"><span>Served</span><strong class="psS"></strong></div>
          <div class="stat"><span>Dropped (crore req)</span><strong class="psD"></strong></div>
          <div class="stat"><span>Critical fail (video/login)</span><strong class="psC"></strong></div>
          <div class="stat"><span>Worst p99 latency</span><strong class="psL"></strong></div>
          <div class="stat"><span>Max delay of async work</span><strong class="psQ"></strong></div>
          <div class="stat"><span>Cost (server-minutes)</span><strong class="psK"></strong></div>
        </div>
        <div class="calc-note psNote"></div>`;
      const $ = c => el.querySelector(c);
      const chips = (box, items, isOn, click) => { box.innerHTML = ''; items.forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (isOn(k) ? ' on' : ''); b.textContent = label; b.onclick = () => click(k); box.appendChild(b); }); };
      const upd = () => {
        chips($('.psPre'), PRESETS.map((p, i) => [i, p[0]]), () => false, i => { DEF.forEach(([k]) => o[k] = PRESETS[i][1][k] ? 1 : 0); upd(); });
        chips($('.psDef'), DEF, k => o[k], k => { o[k] = o[k] ? 0 : 1; upd(); });
        o.lag = +$('.psLag').value; $('.psLagV').textContent = o.lag + ' minute';
        const r = SIM(o), O = r.out, top = 1800;
        const X = i => 40 + i * (550 / 59), Y = v => 200 - Math.min(v, top) / top * 185;
        const line = (a, col, dash, w) => `<polyline points="${a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? 'stroke-dasharray="4 4"' : ''}/>`;
        const bars = O.drop.map((d, i) => d > 0.5 ? `<rect x="${(X(i) - 4).toFixed(1)}" y="${Y(d).toFixed(1)}" width="8" height="${(200 - Y(d)).toFixed(1)}" fill="var(--red)" opacity=".55"/>` : '').join('');
        const grid = [0, 300, 600, 900, 1200, 1500, 1800].map(v => `<line x1="40" x2="590" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="34" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="var(--ink-3)" font-family="var(--f-mono)">${v / 100}L</text>`).join('');
        $('.psChart').innerHTML = grid + bars + line(O.dem, 'var(--ink-2)', 1, 1.5) + line(O.cap, 'var(--accent)', 0, 2.5) + line(O.srv, 'var(--green)', 0, 2) +
          `<text x="315" y="224" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">minute 0 → 60 (rps, L = lakh)</text>`;
        $('.psS').textContent = r.servedPct.toFixed(1) + '%';
        $('.psD').textContent = (r.dropped * 1000 / 1e7).toFixed(1);
        $('.psC').textContent = r.critPct.toFixed(1) + '%';
        $('.psL').textContent = r.worst >= 3000 ? 'timeouts (3 s+)' : Math.round(r.worst) + ' ms';
        $('.psQ').textContent = o.queue ? r.maxDelay.toFixed(1) + ' min' : '-';
        $('.psK').textContent = r.cost.toLocaleString('en-IN');
        const peak = Math.max(...O.dem);
        let n = `Peak demand (including retries) ~${(peak / 100).toFixed(1)} lakh rps. `;
        if (!o.pre && !o.auto) n += 'Capacity stayed stuck at 1.5 lakh. Without shedding the server lets everything in, timeouts follow, then retries: the demand grew by itself (retry storm). ';
        if (o.auto && !o.pre) n += `Autoscaling runs ${o.lag} minutes behind: in the first ${o.lag} minutes of every jump, requests fell on the old capacity. `;
        if (o.pre && !o.auto && !o.degrade) n += 'The pre-scale was 7.5 lakh, the peak ~9 lakh: the part above the forecast still dropped. ';
        if (o.shed) n += r.dropped > 0 ? 'Shedding saved the critical requests and kept latency under control, but it did not create capacity. ' : 'Shedding was not even needed: the other defences kept the load within capacity. ';
        if (o.queue) n += `The queue moved 30% async work off the sync path; the price: up to ${r.maxDelay.toFixed(1)} minutes of delay. `;
        n += 'The model is simple (1 server = 1,000 rps, scale-in after 10 minutes); the numbers are not real, the shape is.';
        $('.psNote').textContent = n;
      };
      $('.psLag').addEventListener('input', upd); upd();
    }},

    { type: 'callout', tone: 'tip', title: 'What the simulator teaches', html: `
      • <strong>Nothing:</strong> only ~13.5% of requests served. After the timeouts, retries pushed peak demand from ~9.4 lakh to <strong>~17.6 lakh</strong>: failure doubled the load.<br>
      • <strong>Autoscale only (5 min lag):</strong> ~83% served, but for 5 minutes on every jump requests fell, critical ones too (~17% failed). Set the lag to 2 minutes: ~95%.<br>
      • <strong>Pre-scale only:</strong> ~88.5%. The forecast was 7.5 lakh, the real peak ~9 lakh: the part above it dropped.<br>
      • <strong>Autoscale + shed:</strong> total served is still ~87%, but critical failures drop from ~17% to <strong>~2.4%</strong>, and latency goes from timeouts to ~280 ms. Shedding saves <em>quality</em>, not quantity.<br>
      • <strong>All on:</strong> 100% served (the async part ~1.7 minutes late), ~238 ms. Cost ~42,000 server-minutes vs 9,000. Remove pre-scale and see: ~97% served, ~28,800 server-minutes. This is the real decision: how much money, for what % of users.` },

    { type: 'h2', text: 'Rung 7: hot keys (when the crowd is on one single key)' },
    { type: 'callout', tone: 'term', title: 'Hot key', html: `<strong>What it is:</strong> one single key in a cache or database (like <code>score:final</code>) that gets many times more traffic than all the other keys.<br><strong>Why it is a problem:</strong> sharding spreads keys across machines, but one key always lives on one machine (shard). All the traffic for that key goes to that one machine. 10 machines or 100, it makes no difference.<br><strong>Without a fix:</strong> one shard at 100%, the other keys on it slow too, and the cluster "half" down.` },
    { type: 'p', html: `All the other defences were about "more machines" or "less work". A hot key is a different illness: in the <a href="#/caching-strategies">caching strategies</a> lesson we saw that sharding spreads keys, not the traffic of one key. During the final, <code>score:final</code> gets 9 lakh reads/sec, and it sits on one shard that can handle, say, ~1 lakh ops/sec. There are two kinds of hot keys, and the fix is different:` },
    { type: 'table', head: ['', 'Read-hot key', 'Write-hot key'], rows: [
      ['Example', 'Live score, viral post, trending list', 'View/like counter of a viral video, stock in a flash sale'],
      ['Fix 1', 'Local (in-process) cache, 1-5 s TTL', 'Add up in memory, write once per second (batching)'],
      ['Fix 2', 'N copies: key#1..key#N on different shards, the reader reads a random copy', 'N sub-counters: key#1..key#N, the writer adds +1 to a random one, the reader sums them all'],
      ['Price', 'Slightly stale data; an update must write N copies', 'Reads cost more (read N keys), the exact count arrives a little late'],
    ]},
    { type: 'p', html: `Turn the numbers yourself. The shard capacity is taken as ~1 lakh ops/sec (a common estimate for one Redis node doing simple GET/SET):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Reads/sec on the hot key: <strong class="hkRv"></strong></label><input class="hkR" type="range" min="10000" max="2000000" step="10000" value="900000"></div>
          <div><label>Copies (key#1..#N): <strong class="hkNv"></strong></label><input class="hkN" type="range" min="1" max="32" step="1" value="1"></div>
          <div><label>App servers: <strong class="hkSv"></strong></label><input class="hkS" type="range" min="10" max="2000" step="10" value="500"></div>
          <div><label>Local cache TTL: <strong class="hkTv"></strong></label><input class="hkT" type="range" min="0" max="5" step="1" value="0"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Reads/sec reaching Redis</span><strong class="hkA"></strong></div>
          <div class="stat"><span>Hottest shard</span><strong class="hkB"></strong></div>
          <div class="stat"><span>How old the data can be</span><strong class="hkC"></strong></div>
        </div>
        <div class="calc-note hkNote"></div>`;
      const $ = c => el.querySelector(c), CAP = 100000;
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const R = +$('.hkR').value, N = +$('.hkN').value, S = +$('.hkS').value, T = +$('.hkT').value;
        $('.hkRv').textContent = fmt(R); $('.hkNv').textContent = N; $('.hkSv').textContent = fmt(S); $('.hkTv').textContent = T ? T + ' s' : 'off';
        const reach = T ? Math.min(R, S / T) : R, per = reach / N, pct = per / CAP * 100;
        $('.hkA').textContent = fmt(reach);
        $('.hkB').textContent = fmt(per) + '/s (' + Math.round(pct) + '%)';
        $('.hkC').textContent = T ? '≤ ' + T + ' s' : '~0';
        $('.hkNote').textContent = pct > 100
          ? `${Math.round(pct)}% of the shard's capacity: timeouts. ${T ? '' : 'Turn on the local cache: each server will go to Redis only once every ' + '1 s. '}${N < Math.ceil(reach / CAP / 0.8) ? 'Or use at least ' + Math.ceil(reach / CAP / 0.8) + ' copies (each shard up to ~80%).' : ''}`
          : pct > 80 ? `${Math.round(pct)}%: it works, but at the edge. A little more traffic and it is gone.`
          : `${Math.round(pct)}%: comfortable.${T ? ' Because of the local cache only ' + fmt(reach) + ' reads/sec reach Redis (servers ÷ TTL), even though users make ' + fmt(R) + ' reads/sec. The price: the score can be up to ' + T + ' seconds old.' : ''}`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'warn', title: 'Spot hot keys early', html: `You often find a hot key only when it is already on fire. So: (1) for known events, split / local-cache in advance (the score, the sale product), (2) monitor per-key traffic (the Redis <code>--hotkeys</code> option with an LFU policy, or client-side sampling; a sketch like the <a href="#/ds-for-scale">count-min sketch</a> can also find the top keys), and (3) make the system flexible enough to mark a key as "hot" at runtime and split it.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 7)', html: `First a local cache (1-5 s TTL): cheap and enough for most read-hot keys. Use key copies or sub-counters when one shard is still hot after the local cache, or when the key is write-hot. If the data is public and the same for everyone (the score), a CDN with a 1-2 s TTL stops the crowd before it even reaches you.` },

    { type: 'h2', text: 'All the rungs in one flow' },
    { type: 'p', html: `Now run everything together: first without defences, then with defences, then the hot key. Click any box to read what it does.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'watching final', x: 80, y: 170, w: 130, kind: 'client', info: 'What it is: crores of people watching the final, all at the same time. The app must retry with exponential backoff + jitter, otherwise every failure creates a new wave.' },
        { id: 'gw', label: 'API gateway', sub: 'rate limit + shed', x: 255, y: 170, w: 150, kind: 'edge', meter: true, load: 20, info: 'What it is: the front door where every request arrives first. The first line of defence. A per-user rate limit (429), and priority-based load shedding based on the system\'s load (503 + Retry-After). Rejecting here is cheap: the request never reaches the services inside.' },
        { id: 'app', label: 'App servers', sub: 'autoscaled', x: 440, y: 170, w: 140, kind: 'server', meter: true, load: 25, info: 'What it is: our group of app servers (stateless: they keep no user data themselves, so you can add as many as you like). Pre-scaled before the match, autoscaled during it. "Panic mode" through feature flags: recommendations off, a static home page.' },
        { id: 'q', label: 'Queue', sub: 'likes, history', x: 625, y: 60, w: 130, kind: 'queue', info: 'What it is: the shock-absorber line. Async work (likes, watch history, analytics) goes here. Workers write to the DB at a fixed speed. A backlog builds at the peak and empties later.' },
        { id: 'redis', label: 'Redis', sub: 'score, sessions', x: 625, y: 170, w: 130, kind: 'cache', meter: true, load: 20, info: 'What it is: a fast in-memory cache. The live score and sessions live here. Everyone looks at one key (score:final): the danger of a hot key.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 625, y: 280, w: 130, kind: 'data', meter: true, load: 20, info: 'What it is: the home of the real data (source of truth). The hardest part to scale. It does not become 10x in minutes. All the other defences really exist to protect it.' },
      ],
      edges: [{ a: 'users', b: 'gw' }, { a: 'gw', b: 'app' }, { a: 'app', b: 'q' }, { a: 'app', b: 'redis' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Normal evening', steps: [
          { title: 'Request', text: 'Requests for video play and the score. All within capacity.', go: 'users>gw>app>redis', msg: 'GET /live/final/score' },
          { title: 'Answer', text: '~120 ms. The meters are cool.', go: 'res:redis>app>gw>users' },
        ]},
        { name: 'Spike, no defences', intro: 'The winning run, and the app sent everyone a push notification. No defences.', steps: [
          { title: 'Winning run + push notification', text: 'Lakhs of people open the app at the same time.', flood: { paths: ['users>gw>app>db', 'users>gw>app>redis'], n: 18 }, after: { app: { state: 'hot', load: 100, sub: 'CPU 100%' }, db: { state: 'hot', load: 98, sub: 'connections full' } } },
          { title: 'Timeouts', text: 'Requests rot in the line and time out after 2-3 seconds. The server still keeps working on them: congestion collapse.', go: 'lost:app>db', after: { gw: { state: 'warn', load: 90, sub: 'timeouts' } } },
          { title: 'Retry storm', text: 'Every app retries 3 times. The load grows even more, and critical requests (video play) fail just as much as analytics.', flood: { paths: ['users>gw>app'], n: 18 }, after: { app: { state: 'down', sub: 'unhealthy' } } },
        ]},
        { name: 'Spike, with defences', intro: 'The same spike. A pre-scaled fleet, shedding, degradation, a queue.', steps: [
          { title: 'Pre-scaled fleet', text: '30 minutes before the match, 5x machines are already running and warm.', set: { app: { sub: 'pre-scaled 5x', load: 55 } }, flood: { paths: ['users>gw>app'], n: 12 } },
          { title: 'Gateway: shed low priority', text: 'Recommendation and prefetch requests get 503 + Retry-After at once. A microsecond of work; they never go inside.', go: ['users>gw', 'bad:gw>users'], after: { gw: { state: 'warn', load: 85, sub: 'shed: low priority' } }, msg: '503 Service Unavailable\nRetry-After: 30' },
          { title: 'Panic mode: light home page', text: 'Feature flag: personalised rows off, one cached home page for everyone. Much less work per request.', focus: ['app'], set: { app: { state: 'warn', sub: 'degraded mode', load: 75 } } },
          { title: 'Likes go to the queue', text: 'A like gets 202 at once; workers write it to the DB ~1-2 minutes later.', go: ['users>gw>app>q', 'res:app>gw>users'], after: { q: { sub: 'backlog 12 lakh' } }, msg: 'POST /like  →  202 Accepted' },
          { title: 'Critical keeps working', text: 'Video play in ~250 ms. Only essential writes reach the DB.', go: ['users>gw>app>redis', 'res:redis>app>gw>users'], after: { db: { load: 60, state: 'ok', sub: 'safe' } } },
        ]},
        { name: 'Hot key: score', intro: 'Everyone is reading one key: score:final.', steps: [
          { title: 'One key, one shard', text: 'In Redis Cluster one key lives on one shard. 9 lakh reads/sec on that one node. Adding shards does nothing.', flood: { paths: ['users>gw>app>redis'], n: 16 }, after: { redis: { state: 'hot', load: 100, sub: 'one shard 100%' } } },
          { title: 'Fix 1: local cache', text: 'Each app server keeps the score in its own memory for 1 second. 500 servers × 1 refresh/sec = only ~500 reads/sec on Redis.', set: { app: { state: 'ok', sub: 'local cache 1s' } }, go: ['app>redis', 'res:redis>app'], after: { redis: { state: 'ok', load: 20, sub: '~500 reads/s' } } },
          { title: 'Fix 2: key split', text: 'If the local cache is not enough (for example many different hot keys), keep N copies of the key: score:final#1 ... #8, on different shards. Each reader reads a random copy.', focus: ['redis'], msg: 'GET score:final#(random 1..8)' },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `When a spike is coming, ask: <strong>did we know?</strong> A known event (match, sale, New Year) → forecast, load test, <strong>pre-scale</strong> (servers + cache + DB + quotas). An unknown spike → <strong>autoscaling</strong> (keep the lag short), and until capacity arrives, <strong>load shedding by priority</strong> and <strong>graceful degradation</strong>. Work that can happen later → a <strong>queue</strong> (load levelling). Keep every client within a limit → <strong>rate limiting</strong> + client backoff. And a crowd on one key → <strong>split/replicate the hot key</strong> + a local cache. One defence is not enough; use them in layers.` },
    { type: 'table', head: ['Situation', 'First tool', 'Together with'], rows: [
      ['Cricket final / sale (date known)', 'Pre-scaling + load test', 'Shedding + degradation as a safety net'],
      ['Video goes viral (suddenly)', 'Autoscaling', 'Shedding + degradation until the machines arrive'],
      ['Flood of likes / views / analytics', 'Queue + batching', 'Sub-counters for the write-hot key'],
      ['Bots or one client hammering', 'Rate limiting', 'WAF (web application firewall: a filter that recognises and blocks bad traffic) / bot detection'],
      ['Everyone reads the same thing (score)', 'Local cache + key copies', 'Short TTL on the CDN'],
    ]},
    { type: 'h2', text: 'The whole design at a glance' },
    { type: 'p', html: `xyz.com on the day of the final, with every rung in its place. Click a box, and use the buttons to see one path at a time.` },
    { type: 'diagram', title: 'Traffic spikes and hot keys: the full picture', height: 650,
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'crores of phones', x: 90, y: 70, kind: 'client', info: 'What it is: the people watching the final. The app retries with backoff + jitter, so a failure does not create a wave (Rung 4).' },
        { id: 'cdn', label: 'CDN', sub: 'home + score, 1 s', x: 330, y: 70, kind: 'edge', info: 'What it is: cache servers spread around the world. The degraded home page and the live score live here with a 1-2 second TTL, so crores of reads never reach our servers (Rungs 6, 7).' },
        { id: 'scaler', label: 'Scaler', sub: 'pre-scale + auto', x: 570, y: 70, kind: 'server', info: 'What it is: the capacity manager. Pre-scales on the forecast before the match (Rung 1), autoscales on request rate / queue length during it (Rung 2). Scales in slowly.' },
        { id: 'gw', label: 'API gateway', sub: 'limit + shed', x: 90, y: 250, kind: 'edge', info: 'What it is: the first door for every API request. A per-user rate limit (429, Rung 4) and priority load shedding (503 + Retry-After, Rung 5). Turning requests away here is cheap.' },
        { id: 'app', label: 'App servers', sub: 'local cache 1 s', x: 330, y: 250, kind: 'server', info: 'What it is: the stateless app fleet. Pre-scaled + autoscaled. Each server keeps hot keys in its own memory for 1 second (Rung 7).' },
        { id: 'flags', label: 'Feature flags', sub: 'panic mode', x: 570, y: 250, kind: 'server', info: 'What it is: a service of on/off switches. Under overload, recommendations and personalisation go off: a light home page (Rung 6). Tested in advance.' },
        { id: 'q', label: 'Queue', sub: 'likes, history', x: 90, y: 430, kind: 'queue', info: 'What it is: the shock absorber (Rung 3). Likes, watch history and analytics go here. The user gets 202 at once; the backlog empties after the peak.' },
        { id: 'redis', label: 'Redis', sub: 'score#1..#8', x: 330, y: 430, kind: 'cache', info: 'What it is: an in-memory cache cluster. 8 copies of the hot key score:final on different shards; sub-counters for the like counter (Rung 7).' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 570, y: 430, kind: 'data', info: 'What it is: the home of the real data. It scales the slowest. All the rungs above protect it: only critical reads/writes and the steady speed of the workers.' },
        { id: 'workers', label: 'Workers', sub: 'fixed speed', x: 90, y: 590, kind: 'server', info: 'What it is: the machines that take work from the queue. They write at the DB\'s safe speed (like 50,000/s), however big the crowd outside.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', n: 1, label: 'reads' },
        { a: 'users', b: 'gw', n: 2, label: 'API calls' },
        { a: 'gw', b: 'app', n: 3 },
        { a: 'cdn', b: 'app', label: 'miss' },
        { a: 'scaler', b: 'app', dashed: true, label: '+ machines' },
        { a: 'flags', b: 'app', dashed: true, label: 'panic mode' },
        { a: 'app', b: 'q', label: '202 + msg' },
        { a: 'app', b: 'redis', label: 'cache miss' },
        { a: 'app', b: 'db', label: 'critical' },
        { a: 'q', b: 'workers' },
        { a: 'workers', b: 'db', label: 'steady writes' },
      ],
      paths: [
        { name: 'Scale', text: 'Before the match the scaler made the fleet 5x, and autoscaled during it. When the crowd grew, the flags switched on panic mode: a light home page.', go: ['scaler>app', 'flags>app'] },
        { name: 'Shed / limit', text: 'A bot gets 429, and under overload a low-priority request (recommendations) gets 503 + Retry-After right at the gateway.', go: ['users>gw', 'bad:gw>users'] },
        { name: 'Like (queue)', text: 'A like gets 202 at once. The message goes to the queue, and workers write it to the DB at a steady speed.', go: ['users>gw>app>q', 'res:app>gw>users', 'q>workers>db'] },
        { name: 'Score (hot key)', text: 'The score comes from the CDN (1 s TTL). On a miss, the app\'s local cache, then one of the 8 copies in Redis.', go: ['users>cdn>app>redis', 'res:redis>app>cdn>users'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>First ask: was the spike known (match, sale) or sudden (viral)? Known → pre-scale the whole path (servers, cache, DB, quotas) + load test.</li>
      <li>Autoscaling is reactive: the lag is minutes. Make the lag shorter (warm pool, request-rate metric), but do not rely on it alone.</li>
      <li>Queue = shock absorber: background work at an even speed; the price = delay. It can absorb a spike, not a constant overload.</li>
      <li>Rate limiting keeps each client within a limit and stops retry storms. It does not stop a crowd of real users.</li>
      <li>Load shedding by priority: protects from congestion collapse and saves critical requests. It does not create capacity.</li>
      <li>Graceful degradation: take the request, give a lighter answer (panic mode, feature flags tested in advance).</li>
      <li>Hot key: sharding does not help. Local cache → key copies (reads) / sub-counters + batching (writes) → CDN.</li>
      <li>One defence is not enough: use layers, and make the cost vs how-many-users decision on purpose.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Critical features (video, login, payment) keep working even during a spike', 'Latency under control: "not now" for some instead of slow for everyone', 'Protection from retry storms and congestion collapse', 'Async work is never lost, it just happens later', 'A hot key does not burn one shard'],
      costs: ['Pre-scaling = paying for empty machines for hours; the forecast can be wrong', 'Autoscaling lag; stateful parts (DB) still scale slowly', 'Shedding and degradation = a worse experience for some users, plus the work of building and testing feature flags', 'Queue = delay and eventual consistency (the like count is a bit old)', 'Key splitting and local cache = stale data and more complex reads/writes'] },

    { type: 'think', questions: [
      { q: 'In the simulator "All on" serves 100% but costs ~42,000 server-minutes; without pre-scale it serves ~97% for ~28,800. You are the CTO of xyz.com. Which do you choose?', a: 'It depends on who the dropped 3% are and how much losing them costs. Shedding is on, so the dropped part is mostly low priority, and critical failures are ~2%. For the final (the biggest day of the year, ad revenue, the brand) the money for pre-scaling is cheap. For a normal league match, autoscale + shed + degrade may be enough. In an interview, show this reasoning: cost vs how many users, which features.' },
      { q: 'The sale starts at 12:00. You made the app servers 10x. At 12:00:05 the site still fell over. What might you have missed?', a: 'Probably the things behind the app: the database (connections became 10x, max_connections or CPU ran out), a cold cache (all misses went to the DB), a hot key (the sale product), or a cloud quota / load balancer warm-up. Pre-scaling covers the whole path, not only the stateless servers. That is why load tests run on the real path.' },
      { q: 'Load shedding returns 503. What happens if the client retries at once, and what should it do?', a: 'If the retry comes at once, the benefit of shedding is gone: the load stays the same, and the server just does extra 503 work. The server should send Retry-After, and the client should use exponential backoff + jitter (and keep a total limit/budget on retries). Do not retry low-priority requests (prefetch, analytics) at all.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why is autoscaling alone not enough for the tsunami traffic of a cricket final?', options: ['Autoscaling does not work in the cloud', 'The metric → decision → boot → warm-up lag is minutes long; until then the spike falls on the old capacity', 'Autoscaling is only for databases'], answer: 1, explain: 'Autoscaling is reactive. The Hotstar talk also named boot time, lack of capacity and retries as reasons. Pre-scale for known events.' },
      { q: 'What is the biggest benefit of load shedding under overload?', options: ['More requests are served than even the capacity allows', 'The requests that get in finish in time, and critical ones get priority; there is no congestion collapse', 'Rate limiting is no longer needed'], answer: 1, explain: 'Shedding does not add capacity. It stops wasted work (on requests that already timed out) and saves important requests. In the simulator critical failures go from ~17% → ~2.4%.' },
      { q: 'The like counter of a viral video takes 2 lakh writes/sec on one row/key. Best fix?', options: ['Read replicas for the key', 'N sub-counters (likes#1..#N) with +1 on a random one and a sum when reading; or add up in memory and write once per second', 'Remove the like button'], answer: 1, explain: 'For a write-hot key, spread or batch the writes. Read replicas only help with reads.' },
      { q: 'The live score gets 9 lakh reads/sec, there are 500 app servers, and each has a 1-second local cache. About how many reads/sec reach Redis?', options: ['9 lakh', '~500', '~9,000'], answer: 1, explain: 'Each server goes to Redis once per second: 500 servers ÷ 1 s = ~500 reads/sec. The price: the score is at most 1 second old.' },
      { q: 'Which of these is "graceful degradation"?', options: ['Under overload, one cached home page for everyone instead of a personalised one', '429 for a user after 100 req/min', 'Putting a like in a queue and returning 202'], answer: 0, explain: 'Degradation takes the request but gives a cheaper answer. 429 is rate limiting; 202 + queue is load levelling.' },
    ]},
    { type: 'sources', note: 'The Hotstar details come from summaries of a conference talk (2019); they are several years old, and today\'s setup may be different.', items: [
      { title: 'How Hotstar.com dealt with 25 million concurrent viewers (re:Invent 2019, CMY302) — session report', publisher: 'Classmethod DevelopersIO (summary of a talk by Hotstar engineers)', year: 2019, url: 'https://dev.classmethod.jp/articles/reinvent-2019-cmy302/', used: '25.3M concurrent viewers, why ASG autoscaling failed (capacity errors, ~1 min boot, 1M+/min growth, retries), pre-warming and concurrency-based custom scaling, Project HULK load tests, turning off recommendations/personalisation under stress.' },
      { title: 'Scaling hotstar.com for 25 million concurrent viewers', publisher: 'Rootconf 2019 (HasGeek), talk by Hotstar engineer', year: 2019, url: 'https://hasgeek.com/rootconf/2019-hyderabad/sub/scaling-hotstar-com-for-25-million-concurrent-view-JAMnectbppSK5Dk8LGAuqy', used: 'Talk abstract: tsunami traffic, game days, load testing, autoscaling not working for this pattern.' },
      { title: 'Using load shedding to avoid overload', publisher: 'Amazon Builders\' Library', official: true, url: 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/', used: 'Why rejecting excess work keeps latency predictable; wasted work on timed-out requests.' },
      { title: 'Scaling your API with rate limiters', publisher: 'Stripe blog', official: true, year: 2017, url: 'https://stripe.com/blog/rate-limiters', used: 'Rate limiters vs load shedders, critical vs non-critical traffic (also used in the rate limiting lesson).' },
      { title: 'Redis CLI (--hotkeys option)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/tools/cli/', used: '--hotkeys samples keys and only works with an LFU maxmemory-policy.' },
      { title: 'Addressing Cascading Failures', publisher: 'Google SRE book', official: true, url: 'https://sre.google/sre-book/addressing-cascading-failures/', used: 'Overload, retries amplifying load, load shedding and graceful degradation concepts.' },
    ]},
  ],
});
