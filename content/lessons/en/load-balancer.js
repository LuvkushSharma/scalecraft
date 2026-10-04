Lesson.register({
  id: 'load-balancer',
  title: 'Load balancer',
  minutes: 24,
  summary: `A load balancer answers one question: "which server should get this request?" It spreads traffic across many servers, quietly removes a sick server from the line, and keeps the website running even while new code is being deployed.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `xyz.com is now so popular that one computer (server) cannot answer all users alone. So we added 3 servers.<br>Now there is a new question: which server should a user go to? And what if one server gets sick?<br>The answer is a component that works like a traffic police officer. It sends every request to a healthy server that has free time. This is called a <strong>load balancer</strong>.` },

    { type: 'h2', text: 'The problem: one server is not enough' },
    { type: 'p', html: `At first, xyz.com ran on one server. Two problems showed up:` },
    { type: 'list', items: [
      `<strong>Overload:</strong> at 9 pm a post went viral. Say one server can handle 500 requests per second, but 2,000 are arriving. Requests wait in a line, and a page now takes 5 seconds to open.`,
      `<strong>Crash:</strong> the server ran out of memory and the program died. Now the whole website is down. There was only one server, so it was a <strong>SPOF</strong> (single point of failure): when it fell, everything fell.`,
    ]},
    { type: 'p', html: `In the scalability lesson we saw the cure: add more servers (horizontal scaling) and keep them <strong>stateless</strong>. Stateless means no server keeps anything important about a user in its own memory. But DNS has only one address for xyz.com. So which of the three servers should a user's request go to? And who stops requests from going to a sick server?` },
    { type: 'callout', tone: 'term', title: 'Load balancer (LB)', html: `<strong>What it is:</strong> a program (or machine) that stands in front of the servers. Every user request comes to it first, and it hands each request to one healthy server.<br><strong>Why we need it:</strong> so work is shared fairly across all servers, and no request goes to a sick server.<br><strong>Without it:</strong> either one server carries all the load while the others sit idle, or one server dies and its users get errors.<br><strong>Example:</strong> xyz.com gets 2,000 requests per second and has 4 servers that can each handle 500. The LB gives each server about 500. Everyone is happy.` },
    { type: 'compare',
      left: { title: 'Without a load balancer', ascii: `
 Users ──> Server 1  (overloaded)
           Server 2  (idle)
           Server 3  (idle)` },
      right: { title: 'With a load balancer', ascii: `
            ┌──> Server 1
 Users ─> LB ──> Server 2
            └──> Server 3` },
    },

    { type: 'h2', text: 'Where does the LB sit?' },
    { type: 'p', html: `The path of a request now looks like this. The user asks <strong>DNS</strong>: "where is xyz.com?" DNS now gives the <strong>address of the LB</strong>, not of a server. The user talks to the LB. The LB passes the request to a server behind it. The server gets data from the database, and the answer goes back along the same path.` },
    { type: 'p', html: `The user never knows if there are 3 servers or 300 behind it. The user only sees one address. A component that stands in front of servers and receives requests for them is also called a <strong>reverse proxy</strong>.` },
    { type: 'callout', tone: 'term', title: 'Reverse proxy', html: `<strong>What it is:</strong> a middle program that receives requests <em>on behalf of the servers</em>. The user thinks it is talking to the website. In fact it talks to the proxy, and the proxy talks to the servers inside.<br><strong>Why we need it:</strong> to keep servers hidden, and to control traffic from one place.<br><strong>Without it:</strong> every server's address would be public, and changing servers would be hard.<br>Every LB is a kind of reverse proxy. Tools like NGINX and HAProxy do both jobs.` },
    { type: 'image', src: 'assets/img/load-balancer/wmf-servers.jpg', alt: 'A long row of racks in a data center, each rack filled from top to bottom with dozens of servers', caption: 'This is what real servers look like: stacked in racks. These are the servers of Wikipedia (Wikimedia Foundation). Load balancers stand in front of all these machines too, so that every request reaches one healthy machine.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_35.jpg', license: 'CC BY-SA 3.0' } },

    { type: 'h2', text: 'Try it yourself' },
    { type: 'p', html: `Each scenario shows a different job of the LB. The meters on the server boxes show how busy each server is. Click any box to learn what it is.` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'u', label: 'Users', sub: 'xyz.com', x: 80, y: 180, w: 120, kind: 'client', info: 'What it is: people opening xyz.com (in a browser or app). They only know one address: xyz.com. DNS turns that name into an address, which is really the IP of the LB. Users do not know how many servers are behind it.' },
        { id: 'lb', label: 'Load Balancer', sub: 'round robin', x: 270, y: 180, w: 150, kind: 'edge', info: 'What it is: the traffic splitter. For every request it picks a healthy server, and every few seconds it checks the health of the servers. Popular LBs: NGINX, HAProxy, Envoy, AWS ALB/NLB.' },
        { id: 's1', label: 'Server 1', x: 480, y: 70, w: 130, kind: 'server', meter: true, load: 15, info: 'What it is: an application server that runs the code of xyz.com. It is stateless (it keeps nothing important about users in its memory), so it can handle any request.' },
        { id: 's2', label: 'Server 2', x: 480, y: 180, w: 130, kind: 'server', meter: true, load: 15, info: 'What it is: a second server just like Server 1, with the same code. With two servers, if one falls the other can take the work.' },
        { id: 's3', label: 'Server 3', x: 480, y: 290, w: 130, kind: 'server', meter: true, hidden: true, info: 'What it is: a new server that started when traffic grew. We told the LB about it, it passed the health check, and it started taking traffic at once.' },
        { id: 'db', label: 'Database', x: 660, y: 180, w: 110, kind: 'data', info: 'What it is: the place where all xyz.com data (users, posts) is saved for good. All servers talk to this one database, which is why the servers can stay stateless.' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' }, { a: 'lb', b: 's3' },
        { a: 's1', b: 'db' }, { a: 's2', b: 'db' }, { a: 's3', b: 'db' },
      ],
      scenarios: [
        { name: 'One request', steps: [
          { title: 'The user sends a request', text: 'DNS gave the address of xyz.com, which is really the address of the LB.', go: 'u>lb', msg: 'GET /profile/42  →  LB (203.0.113.10)' },
          { title: 'The LB picks a server', text: 'LB: "Server 1 is healthy and it is its turn." The request is forwarded.', go: 'lb>s1' },
          { title: 'The server does the work', text: 'Server 1 gets the data from the database.', go: ['s1>db', 'res:db>s1'] },
          { title: 'The response goes back', text: 'The response goes back through the LB to the user. The user never learns that Server 1 answered.', go: 'res:s1>lb>u' },
        ]},
        { name: 'Round robin', intro: 'Round robin is the simplest method: take turns. 1, 2, 1, 2... (More methods in the next lesson.)', steps: [
          { title: 'Request 1 → Server 1', go: 'u>lb>s1', text: 'The first request goes to Server 1.', after: { s1: { load: 30 } } },
          { title: 'Request 2 → Server 2', go: 'u>lb>s2', text: 'The next one goes to Server 2.', after: { s2: { load: 30 } } },
          { title: 'Request 3 → Server 1', go: 'u>lb>s1', text: 'Then back to Server 1. The load is shared evenly.', after: { s1: { load: 45 } } },
          { title: 'Request 4 → Server 2', go: 'u>lb>s2', text: 'Simple and fair, when all requests are about the same size.', after: { s2: { load: 45 } } },
        ]},
        { name: 'Server 2 down', intro: 'Every few seconds the LB asks each server: "are you alive?" This is called a health check (more details below).', steps: [
          { title: 'Health check: all good', text: 'Every 5 seconds the LB calls the /health address. Both servers answer "200 OK".', parallel: true, go: ['lb>s1', 'lb>s2'], after: { s1: { state: 'ok' }, s2: { state: 'ok' } }, msg: 'GET /health → 200 OK' },
          { title: 'Server 2 crashes', text: 'Server 2 ran out of memory and the program died.', set: { s2: { state: 'down', sub: 'DOWN', load: 0 } }, focus: ['s2'] },
          { title: 'Health check fails', text: 'Server 2 did not answer. After 3 failures in a row, the LB marks it "unhealthy" and takes it out of the rotation.', go: 'lost:lb>s2', msg: 'GET /health → timeout (3 times)  →  Server 2 removed' },
          { title: 'All traffic to Server 1', text: 'Users noticed nothing. The website is up. When Server 2 is fixed and passes the health check, the LB takes it back.', flood: { paths: ['u>lb>s1'], n: 6 }, after: { s1: { load: 70 } } },
        ]},
        { name: 'Traffic spike', intro: 'At 9 pm a post on xyz.com went viral.', steps: [
          { title: 'Traffic grows 10 times', text: 'Both servers turn red. Response time goes from 50 ms to 3 seconds.', flood: { paths: ['u>lb>s1', 'u>lb>s2'], n: 16 }, after: { s1: { load: 95, state: 'hot' }, s2: { load: 95, state: 'hot' } } },
          { title: 'Add Server 3', text: 'A new server started (in the cloud this can happen by itself; this is called <strong>autoscaling</strong>). As soon as it passes the health check, the LB starts sending it traffic.', show: ['s3'], set: { s1: { load: 64, state: '' }, s2: { load: 64, state: '' }, s3: { load: 64 } }, flood: { paths: ['u>lb>s1', 'u>lb>s2', 'u>lb>s3'], n: 15 } },
          { title: 'Look: what happened to the database?', text: 'We now have 3 servers, but still one database, and it now gets requests from 3 servers. The LB solves the server problem, not the database problem. The database will be the next bottleneck, and that is where a cache comes in.', go: ['s1>db', 's2>db', 's3>db'], parallel: true, set: { db: { state: 'warn', sub: 'pressure ↑' } } },
        ]},
        { name: 'What if the LB falls?', steps: [
          { title: 'The LB crashes', text: 'All traffic was going through it.', set: { lb: { state: 'down', sub: 'DOWN' } }, go: 'lost:u>lb' },
          { title: 'Servers healthy, site down', text: 'A single LB is itself a SPOF. The cure is in the section "Do not let the LB be a SPOF" below: two copies of the LB and a floating IP.', set: { s1: { state: 'ok', sub: 'healthy, idle' }, s2: { state: 'ok', sub: 'healthy, idle' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Health checks: how does the LB know a server is sick?' },
    { type: 'callout', tone: 'term', title: 'Health check', html: `<strong>What it is:</strong> the LB asking each server again and again: "are you OK?" Usually this is a small address like <code>GET /health</code> that returns <code>200 OK</code> when the server is fine.<br><strong>Why we need it:</strong> so the LB stops sending requests to a dead or stuck server.<br><strong>Without it:</strong> the LB keeps sending requests in turn with its eyes closed. If 1 of 3 servers is dead, 1 in every 3 users gets an error.` },
    { type: 'p', html: `There are two kinds of health checks:` },
    { type: 'compare',
      left: { title: 'Active health check', html: `The LB <strong>itself</strong> sends a test request to every server every few seconds.<br><br>• Finds problems even when a server has no user traffic<br>• A little extra traffic (one request per server per interval)<br>• Examples: HAProxy <code>check</code>, AWS ALB health checks, NGINX Plus <code>health_check</code>` },
      right: { title: 'Passive health check', html: `The LB watches <strong>real user requests</strong>. If a request fails (connection refused, timeout, 5xx error), it counts one "fail" against that server.<br><br>• No extra traffic<br>• You only find out after a real request has already had trouble<br>• Examples: open-source NGINX (<code>max_fails</code>, <code>fail_timeout</code>), Envoy "outlier detection"` },
    },
    { type: 'p', html: `A good setup uses both: the active check catches a dead server, and the passive check catches a server that is "alive" but gives an error on every second request.` },
    { type: 'h3', text: 'Thresholds: how many failures before we remove a server?' },
    { type: 'p', html: `Removing a server after one missed answer would be wrong. It could just be a tiny network hiccup. So there are four settings:` },
    { type: 'table', head: ['Setting', 'Meaning', 'Example values'], rows: [
      ['Interval', 'How many seconds until the next check', 'HAProxy: 2 s (default). AWS ALB: 30 s (default)'],
      ['Timeout', 'How long to wait for an answer before counting a "fail"', 'AWS ALB: 5 s (default)'],
      ['Unhealthy threshold (fall)', 'How many fails in a row before the server is removed', 'HAProxy: 3. AWS ALB: 2'],
      ['Healthy threshold (rise)', 'How many passes in a row before it comes back', 'HAProxy: 2. AWS ALB: 5'],
    ], caption: 'Open-source NGINX uses passive checks: by default max_fails=1 and fail_timeout=10s, so one failure puts a server aside for 10 seconds.' },
    { type: 'p', html: `Play with it below. xyz.com gets 300 requests per second, shared evenly across 3 servers (100 each). Server 2 crashes at time 10 s and is fixed at 60 s. See how the settings change the number of users who get an error.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
        <label>Interval: <strong class="v-i"></strong> s<input type="range" class="r-i" min="1" max="30" value="5"></label>
        <label>Timeout: <strong class="v-t"></strong> s<input type="range" class="r-t" min="1" max="10" value="2"></label>
        <label>Unhealthy threshold (fall): <strong class="v-f"></strong><input type="range" class="r-f" min="1" max="5" value="3"></label>
        <label>Healthy threshold (rise): <strong class="v-r"></strong><input type="range" class="r-r" min="1" max="5" value="2"></label>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" class="c-p"> Also turn on passive check + retry (send a failed request again to another server)</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0"><button type="button" class="btn small ghost p-h">Like HAProxy (2s, fall 3, rise 2)</button><button type="button" class="btn small ghost p-a">AWS ALB default (30s, 5s, 2, 5)</button></div>
        <svg class="tl" viewBox="0 0 640 96" style="width:100%;height:auto;display:block;margin:10px 0"></svg>
        <div class="stats"><div class="stat"><span>Time to notice</span><strong class="o-d"></strong></div><div class="stat"><span>Errors for users</span><strong class="o-e"></strong></div><div class="stat"><span>Time to come back</span><strong class="o-r"></strong></div><div class="stat"><span>Health check traffic</span><strong class="o-c"></strong></div></div>
        <div class="calc-note o-n"></div>`;
      const q = s => el.querySelector(s);
      const CRASH = 10, BACK = 60, END = 120, RPS = 100;
      const run = () => {
        const I = +q('.r-i').value, T = +q('.r-t').value, F = +q('.r-f').value, R = +q('.r-r').value, pas = q('.c-p').checked;
        q('.v-i').textContent = I; q('.v-t').textContent = T; q('.v-f').textContent = F; q('.v-r').textContent = R;
        const c1 = Math.ceil(CRASH / I) * I;
        const detect = c1 + (F - 1) * I + T;
        const blind = detect - CRASH;
        const b1 = Math.ceil(BACK / I) * I, backAt = b1 + (R - 1) * I;
        const errors = pas ? 0 : Math.round(blind * RPS);
        const x = t => 20 + Math.min(t, END) / END * 600;
        let s = `<line x1="20" y1="50" x2="620" y2="50" stroke="var(--line-2)" stroke-width="2"/>`;
        s += `<rect x="${x(CRASH)}" y="38" width="${Math.max(2, x(Math.min(detect, END)) - x(CRASH))}" height="24" fill="var(--red)" opacity=".25"/>`;
        s += `<rect x="${x(Math.min(detect, END))}" y="38" width="${Math.max(0, x(Math.min(backAt, END)) - x(Math.min(detect, END)))}" height="24" fill="var(--ink-3)" opacity=".15"/>`;
        for (let t = 0; t <= END; t += I) {
          const st = t < CRASH ? 'var(--green)' : t < BACK ? 'var(--red)' : 'var(--green)';
          s += `<circle cx="${x(t)}" cy="50" r="${I < 3 ? 2.2 : 3.5}" fill="${st}"/>`;
        }
        const mark = (t, label, y, col) => t <= END ? `<line x1="${x(t)}" y1="30" x2="${x(t)}" y2="70" stroke="${col}" stroke-width="2"/><text x="${x(t)}" y="${y}" text-anchor="middle" font-size="13" fill="var(--ink-2)" font-family="var(--f-mono)">${label}</text>` : '';
        s += mark(CRASH, 'crash 10s', 22, 'var(--red)') + mark(detect, 'LB removed ' + detect + 's', 86, 'var(--amber)') + mark(BACK, 'fixed 60s', 22, 'var(--green)') + mark(backAt, 'back ' + backAt + 's', 86, 'var(--accent)');
        q('.tl').innerHTML = s;
        q('.o-d').textContent = blind + ' s';
        q('.o-e').textContent = errors.toLocaleString('en-IN');
        q('.o-r').textContent = (backAt - BACK) + ' s';
        q('.o-c').textContent = Math.round(3 * 60 / I) + ' / min';
        q('.o-n').textContent = pas
          ? 'Passive check is on: a request that went to the dead server was sent again to another server as soon as it failed (retry). The user gets no error, that request is only a little slower. You still need the active check, so the LB notices problems without traffic and can bring the server back.'
          : `After the crash, the first check is at ${c1}s. After ${F} fails in a row + a ${T}s timeout, the LB removed the server. During that time 1 in 3 requests went to the dead server: ${blind}s × 100 = ${errors.toLocaleString('en-IN')} errors. ` + (F === 1 ? 'Careful: fall = 1 means even a tiny network hiccup removes the server (flapping).' : I <= 2 ? 'A short interval means you notice fast, but every LB pings every server more often.' : 'Lower the interval or the fall value and this number drops.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', run));
      q('.p-h').onclick = () => { q('.r-i').value = 2; q('.r-t').value = 2; q('.r-f').value = 3; q('.r-r').value = 2; run(); };
      q('.p-a').onclick = () => { q('.r-i').value = 30; q('.r-t').value = 5; q('.r-f').value = 2; q('.r-r').value = 5; run(); };
      run();
    }},
    { type: 'callout', tone: 'mistake', title: 'The deep health check trap', html: `Imagine <code>/health</code> also checks the database inside. The database becomes slow for 5 seconds. Now the health check of <em>every</em> server fails, and the LB removes all servers. A small database problem became an outage of the whole website.<br>That is why the health check used by the LB is often kept <strong>shallow</strong>: "is my program running and able to take requests?" Things the server depends on, like the database, are monitored separately. (AWS ALB has a guard for this: if all targets are unhealthy, it "fails open" and keeps sending traffic to all of them.)` },
    { type: 'h2', text: 'Do not let the LB be a SPOF' },
    { type: 'p', html: `Remember the last scenario of the flow above: the servers were fine, but the LB fell and the whole site went down. We removed the server SPOF and created a new SPOF (the LB). The cure: two copies of the LB too.` },
    { type: 'callout', tone: 'term', title: 'Floating IP (virtual IP, VIP)', html: `<strong>What it is:</strong> an IP address that is not stuck to one machine. Whichever machine says "I am in charge now" gets this address. It is like a helpline number that is forwarded to the next operator's phone when the shift changes.<br><strong>Why we need it:</strong> DNS has only one address for xyz.com. Even if the LB changes, the address should not change, or DNS updates and caching would take minutes.<br><strong>Without it:</strong> if the active LB falls, users keep knocking on the old address.` },
    { type: 'callout', tone: 'term', title: 'Heartbeat', html: `<strong>What it is:</strong> two machines sending each other a tiny "I am alive" message every second.<br><strong>Why we need it:</strong> so the standby knows when the active one has died and can take over.<br><strong>Without it:</strong> the standby would never know it has to step in. On Linux this job is often done by a tool called <strong>keepalived</strong> using the <strong>VRRP</strong> protocol.` },
    { type: 'p', html: `There are two ways:` },
    { type: 'list', items: [
      `<strong>Active-passive:</strong> LB-A does all the work, and LB-B sits idle listening to the heartbeat. When LB-A's heartbeat stops, LB-B takes the floating IP and handles traffic within 1-3 seconds. It is simple, but you pay for LB-B "just to wait".`,
      `<strong>Active-active:</strong> both LBs take traffic at the same time (DNS has both addresses, or the network routers split traffic between them). If one falls, the other takes everything. Rule: each LB must be less than 50% full, or the one left alone will drown.`,
      `<strong>Cloud LB:</strong> AWS ALB/NLB and Google Cloud Load Balancing already run on many machines inside. The cloud company handles this redundancy, and you only use one name (or IP).`,
    ]},
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: 'xyz.com', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: the users of xyz.com. DNS gives them a single address: the floating IP 203.0.113.10. They do not know which LB is behind it.' },
        { id: 'lba', label: 'LB-A', sub: 'active · VIP', x: 300, y: 80, w: 150, kind: 'edge', info: 'What it is: the load balancer in charge right now. It holds the floating IP, so all requests come here. Every second it sends a heartbeat to LB-B.' },
        { id: 'lbb', label: 'LB-B', sub: 'standby', x: 300, y: 260, w: 150, kind: 'edge', info: 'What it is: the backup load balancer, with the same settings. It keeps listening to the heartbeat. When the heartbeat stops, it takes the floating IP and becomes the one in charge.' },
        { id: 's1', label: 'Server 1', x: 570, y: 80, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: an application server. Both LBs know it, so it can answer a request from either LB.' },
        { id: 's2', label: 'Server 2', x: 570, y: 260, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: a second application server with the same code. Both LBs run health checks on it.' },
      ],
      edges: [
        { a: 'u', b: 'lba' }, { a: 'u', b: 'lbb', id: 'ub', hidden: true }, { a: 'lba', b: 'lbb', dashed: true },
        { a: 'lba', b: 's1' }, { a: 'lba', b: 's2' }, { a: 'lbb', b: 's1' }, { a: 'lbb', b: 's2' },
      ],
      scenarios: [
        { name: 'A normal day', steps: [
          { title: 'Heartbeat', text: 'Every second LB-A tells LB-B "I am alive". LB-B listens and stays quiet.', go: ['evt:lba>lbb'], msg: 'VRRP heartbeat: LB-A alive, priority 200' },
          { title: 'Request to LB-A', text: 'LB-A holds the floating IP, so the user request arrives there. LB-A picks Server 1.', go: ['u>lba>s1', 'res:s1>lba>u'], msg: 'GET /feed → 203.0.113.10 (LB-A)' },
        ]},
        { name: 'LB-A crashes (failover)', intro: 'The real test of active-passive.', steps: [
          { title: 'LB-A died', text: 'The power supply of the LB-A machine burned out. Requests are getting lost.', set: { lba: { state: 'down', sub: 'DOWN' } }, go: 'lost:u>lba' },
          { title: 'Heartbeat stops', text: 'LB-B missed 3 heartbeats in a row (about 3 seconds). It understands: the active one is gone.', go: 'lost:lba>lbb', focus: ['lbb'] },
          { title: 'LB-B takes the floating IP', text: 'LB-B announces to the network "203.0.113.10 is with me now". Nothing had to change in DNS.', show: ['ub'], set: { lbb: { state: 'ok', sub: 'ACTIVE · VIP' } }, msg: 'gratuitous ARP: 203.0.113.10 is-at LB-B' },
          { title: 'Site is back', text: 'New requests go from LB-B to the servers. Connections that were in the middle on LB-A broke, and the browser or app will try them again. Total pause: a few seconds.', go: ['u>lbb>s2', 'res:s2>lbb>u'] },
        ]},
        { name: 'Active-active', intro: 'Both LBs work at the same time.', steps: [
          { title: 'Both LBs take traffic', text: 'DNS or the network splits traffic across both LBs. Both are 40% full.', show: ['ub'], set: { lbb: { sub: 'active' } }, parallel: true, go: ['u>lba>s1', 'u>lbb>s2'] },
          { title: 'LB-A fell', text: 'All its traffic moves to LB-B. 40% + 40% = 80%. We survived, because each LB was less than half full.', set: { lba: { state: 'down', sub: 'DOWN' } }, flood: { paths: ['u>lbb>s1', 'u>lbb>s2'], n: 10 }, after: { lbb: { state: 'hot', sub: '80% busy' } } },
        ]},
        { name: 'Split brain', intro: 'A tricky kind of failure.', steps: [
          { title: 'Only the heartbeat link broke', text: 'Both LBs are alive, but the network cable between them came out.', go: 'lost:lba>lbb' },
          { title: 'Both say "I am in charge"', text: 'LB-B thought LB-A was dead, so it also took the floating IP. Now one address has two owners: sometimes packets reach A, sometimes B, and connections break. This is called <strong>split brain</strong>.', show: ['ub'], set: { lba: { state: 'warn', sub: 'VIP is mine!' }, lbb: { state: 'warn', sub: 'no, mine!' } } },
          { title: 'Protection', text: 'Use two separate network links for the heartbeat, or keep a third "referee" so that no one becomes the one in charge without its yes. (This idea comes in detail in the Coordination lesson.)' },
        ]},
      ],
    },
    { type: 'h2', text: 'Load balancing with DNS (and its limits)' },
    { type: 'p', html: `There is also a cheap way that needs no separate LB machine: put <strong>several addresses</strong> for xyz.com in DNS. DNS gives the list in a different order to each person who asks, and the browser usually uses the first address. This is called <strong>round-robin DNS</strong>.` },
    { type: 'code', text: `$ dig xyz.com
xyz.com.   300   IN   A   203.0.113.10
xyz.com.   300   IN   A   203.0.113.11
xyz.com.   300   IN   A   203.0.113.12
           ^^^ TTL: remember this answer for 300 seconds` },
    { type: 'callout', tone: 'term', title: 'TTL (Time To Live)', html: `<strong>What it is:</strong> a number that comes with a DNS answer: "you may remember this answer for this many seconds".<br><strong>Why we need it:</strong> asking DNS on every page load would be slow. Remembering (caching) the answer makes the internet faster.<br><strong>Without it:</strong> heavy load on DNS servers, and every website a bit slower.<br><strong>The side effect:</strong> if an address dies, people who remember the old answer keep going to that dead address until the TTL runs out.` },
    { type: 'p', html: `So DNS load balancing has limits:` },
    { type: 'list', items: [
      `<strong>Caching:</strong> a server died and you removed its address from DNS, but people keep using the old address until the TTL ends (and some old resolvers and apps keep it even longer).`,
      `<strong>It does not see health:</strong> plain DNS does not know a server has died. (Some managed DNS services, like AWS Route 53, run health checks and remove a dead address from the answer, but caching still remains.)`,
      `<strong>It does not see load:</strong> the DNS resolver of one big internet provider gives the same answer to hundreds of thousands of users. They can all land on one server.`,
    ]},
    { type: 'p', html: `So DNS is often used for the <em>first, rough</em> split (like "go to Mumbai or Virginia", or between two LBs), and the LB makes the real, fast decision. Answering based on location (GeoDNS) comes in the next lesson.` },
    { type: 'p', html: `See for yourself: an address died at time 0 and was removed from DNS at once. How many users are still going to that dead address?` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
        <label>TTL: <strong class="v-t"></strong><input type="range" class="r-t" min="0" max="5" value="2"></label>
        <label>Clients that ignore TTL: <strong class="v-g"></strong>%<input type="range" class="r-g" min="0" max="20" value="5"></label>
        </div><div class="bars" style="margin-top:12px"></div><div class="calc-note o-n"></div>`;
      const TTLS = [30, 60, 300, 900, 3600, 86400];
      const NAMES = ['30 s', '1 min', '5 min', '15 min', '1 hour', '1 day'];
      const AT = [[60, 'after 1 min'], [300, 'after 5 min'], [900, 'after 15 min'], [3600, 'after 1 hour']];
      const STUCK = 1800;
      const q = s => el.querySelector(s);
      const run = () => {
        const ttl = TTLS[+q('.r-t').value], g = +q('.r-g').value / 100;
        q('.v-t').textContent = NAMES[+q('.r-t').value]; q('.v-g').textContent = Math.round(g * 100);
        const stale = t => (1 - g) * Math.max(0, 1 - t / ttl) + g * Math.max(0, 1 - t / Math.max(ttl, STUCK));
        q('.bars').innerHTML = AT.map(([t, lab]) => { const v = stale(t) * 100; return `<div style="display:grid;grid-template-columns:110px 1fr 56px;gap:10px;align-items:center;margin:6px 0"><span style="font-size:14px">${lab}</span><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${v.toFixed(1)}%;background:var(--red)"></div></div><span style="font:13px var(--f-mono)">${v.toFixed(1)}%</span></div>`; }).join('');
        q('.o-n').textContent = `Red bar = users still going to the dead address. The TTL is ${NAMES[+q('.r-t').value]}: people who had the answer cached will see it expire at some point between 0 and the TTL. ` + (ttl >= 3600 ? 'A long TTL means less load on DNS servers, but failover takes hours.' : ttl <= 60 ? 'A short TTL means fast failover, but more DNS lookups (a bit more latency and DNS cost).' : 'A middle path. Stubborn clients (that ignore the TTL) keep the tail long.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', run));
      run();
    }},

    { type: 'h2', text: 'TLS termination: where is the lock opened?' },
    { type: 'callout', tone: 'term', title: 'TLS (the "S" in HTTPS)', html: `<strong>What it is:</strong> encryption between the browser and the website. Data travels in a locked box that nobody in the middle can read. To open the lock, the website has a <strong>certificate</strong> and a secret key.<br><strong>Why we need it:</strong> so nobody on the way can steal passwords, messages or payment details.<br><strong>Without it:</strong> anyone on the same cafe Wi-Fi could read your password.` },
    { type: 'p', html: `Opening the lock (decryption) costs CPU. The question: who should do it, the LB or every server? <strong>TLS termination</strong> means opening the lock at the LB itself. Three options:` },
    { type: 'table', head: ['Option', 'What happens', 'When'], rows: [
      ['Terminate at the LB', 'The LB decrypts and sends plain HTTP to the servers inside. The certificate lives only on the LB.', 'Most common. The LB can read the request (URL, cookie), and server CPU is saved.'],
      ['Re-encrypt', 'The LB opens it, reads it, then sends it to the server with new TLS.', 'When the inside network cannot be trusted either (banking, compliance rules).'],
      ['Passthrough', 'The LB never opens the lock and sends the bytes as they are. The server opens it.', 'When the LB does not need to see the content (L4), or the key must never leave the server.'],
    ]},
    { type: 'callout', tone: 'tip', title: 'How does the server learn the user\'s IP?', html: `Behind the LB, every request seems to come from the LB's IP. So an L7 LB adds a header: <code>X-Forwarded-For: 49.36.x.x</code> (the real IP of the user). Rate limiting and logs use this header to recognise the user.` },
    { type: 'h2', text: 'Sticky sessions, and connection draining during deploys' },
    { type: 'callout', tone: 'term', title: 'Session', html: `<strong>What it is:</strong> the server's "memory" of who you are. After login, the server sends a small ID (session ID) in a cookie and writes down for itself: "session abc = Riya, logged in".<br><strong>Why we need it:</strong> so you do not have to type your password on every page.<br><strong>Without it:</strong> a login on every click.` },
    { type: 'callout', tone: 'term', title: 'Sticky session (session affinity)', html: `<strong>What it is:</strong> an LB rule that one user always goes to the <em>same</em> server. The LB sets a cookie (like the <code>AWSALB</code> cookie of AWS ALB) or picks the server from the user's IP.<br><strong>Why we need it:</strong> when the server keeps the session in its own memory, the user must come back to that same server, or it will ask "who are you?"<br><strong>Without it (and with sessions in server memory):</strong> the user looks logged out on every second request.` },
    { type: 'p', html: `Sticky sessions are a workaround. They work, but they hurt in three places: (1) if that server falls, all its users lose their session, (2) load is not shared evenly, because some users are very active and they are stuck on one server, (3) when you add a new server, old users do not move to it, so it sits idle.` },
    { type: 'p', html: `<strong>The fix:</strong> take the session out of server memory and keep it in a <strong>shared session store</strong> (like Redis). Now every server is stateless, any server can recognise any user, and the LB does not need to stick users to servers.` },
    { type: 'callout', tone: 'term', title: 'Connection draining (deregistration delay)', html: `<strong>What it is:</strong> before shutting a server down, the LB marks it as "draining": it gets no new requests, but the requests already running are allowed to finish. Then the server is shut down.<br><strong>Why we need it:</strong> during a deploy (putting new code live), servers restart one by one. Without draining, an upload or payment in the middle would break.<br><strong>Without it:</strong> some users get errors on every deploy.<br><strong>Example:</strong> by default AWS ALB waits 300 seconds (you can change this setting).` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Riya', sub: 'logged in', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: a user of xyz.com. She has already logged in. Her browser sends the session cookie with every request.' },
        { id: 'lb', label: 'Load Balancer', x: 270, y: 170, w: 150, kind: 'edge', info: 'What it is: the traffic splitter. In sticky mode it reads the cookie and always picks the same server. During a deploy it can mark a server as "draining".' },
        { id: 's1', label: 'Server 1', x: 470, y: 80, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: an application server. In the sticky setup, Riya\'s session is in its memory.' },
        { id: 's2', label: 'Server 2', x: 470, y: 260, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: a second application server with the same code. But its memory does not have Riya\'s session (in the sticky setup).' },
        { id: 'ss', label: 'Session store', sub: 'Redis', x: 640, y: 170, w: 130, kind: 'cache', hidden: true, info: 'What it is: a shared, fast in-memory store that keeps all sessions. Why: any server can read any user\'s session. Without it, servers would have to be sticky.' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' },
        { a: 's1', b: 'ss', id: 'e1', hidden: true }, { a: 's2', b: 'ss', id: 'e2', hidden: true },
      ],
      scenarios: [
        { name: 'Sticky session', steps: [
          { title: 'Login on Server 1', text: 'Server 1 writes "abc = Riya" in its memory. The LB adds a cookie to the response: "send this user to Server 1".', go: ['u>lb>s1', 'res:s1>lb>u'], after: { s1: { sub: 'memory: Riya' } }, msg: 'Set-Cookie: session=abc; LBSTICKY=s1' },
          { title: 'Every next request to Server 1', text: 'The LB reads the cookie and always picks Server 1, however busy it is.', flood: { paths: ['u>lb>s1'], n: 8 }, after: { s1: { load: 85, state: 'hot' }, s2: { load: 10 } } },
          { title: 'Uneven load', text: 'Server 1 is red, Server 2 is idle. The more heavy users stick to Server 1, the worse it gets.', focus: ['s1', 's2'] },
        ]},
        { name: 'Sticky + crash', steps: [
          { title: 'Server 1 fell', text: 'Riya\'s session was in Server 1\'s memory. The session is gone with the memory.', set: { s1: { state: 'down', sub: 'DOWN', load: 0 } } },
          { title: 'The LB sends her to Server 2', text: 'Server 2 has no record of "abc".', go: ['u>lb>s2', 'bad:s2>lb>u'], msg: '302 → /login   (session abc not found)' },
          { title: 'Riya is logged out', text: 'Her cart and the data she typed in a form are all gone. The same happened to every user of Server 1.', set: { u: { state: 'warn', sub: 'logged out!' } } },
        ]},
        { name: 'Shared session store', intro: 'The fix: keep the session in Redis instead of server memory.', steps: [
          { title: 'Session in Redis', text: 'At login the server writes the session to Redis. Now the servers are stateless, and the LB can pick any server.', show: ['ss', 'e1', 'e2'], go: ['u>lb>s1>ss'], after: { ss: { state: 'hit', sub: 'abc = Riya' } } },
          { title: 'Server 1 fell', set: { s1: { state: 'down', sub: 'DOWN', load: 0 } }, text: 'Server 1 is gone, but the session was never in its memory.' },
          { title: 'Server 2 recognises her', text: 'Server 2 reads "abc" from Redis: it is Riya, logged in. Riya did not even notice.', go: ['u>lb>s2>ss', 'res:ss>s2>lb>u'], msg: 'GET session:abc → Riya ✓' },
        ]},
        { name: 'Deploy without draining', steps: [
          { title: 'Riya is uploading a video', text: 'A 40-second upload is running on Server 1.', go: 'u>lb>s1', after: { s1: { load: 60, sub: 'upload 50%' } } },
          { title: 'The deploy script stops Server 1 at once', text: 'The program is killed to put in new code. The connection of the upload in the middle broke.', set: { s1: { state: 'down', sub: 'restarting', load: 0 } }, go: 'bad:s1>lb>u', msg: '502 Bad Gateway  (upload failed at 50%)' },
        ]},
        { name: 'Deploy with draining', steps: [
          { title: 'The upload is running', text: 'Riya\'s 40-second upload is running on Server 1.', go: 'u>lb>s1', after: { s1: { load: 60, sub: 'upload 50%' } } },
          { title: 'LB: Server 1 is draining', text: 'The deploy first tells the LB: give Server 1 no new requests. The old ones keep running.', set: { s1: { state: 'warn', sub: 'draining' } } },
          { title: 'New requests go to Server 2', text: 'The other users notice nothing.', flood: { paths: ['u>lb>s2'], n: 6 }, after: { s2: { load: 55 } } },
          { title: 'Upload done, then restart', text: 'The upload finished (or the draining time ran out). Now Server 1 shuts down and comes up with the new code. It passes the health check and is back in the rotation.', go: 'res:s1>lb>u', after: { s1: { state: 'ok', sub: 'v2 ✓', load: 15 } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Hardware, software or cloud LB?' },
    { type: 'p', html: `An LB is not a magic box. It is also a program running on some machine. There are three kinds:` },
    { type: 'table', head: ['Type', 'Examples', 'Good', 'Bad'], rows: [
      ['Hardware appliance', 'F5 BIG-IP, Citrix ADC (NetScaler)', 'Very fast, special chips, vendor support', 'Expensive, you buy a new box to scale, lives only in your data center'],
      ['Software (you run it)', 'NGINX, HAProxy, Envoy, Linux LVS', 'Free/open source, runs on any machine, full control', 'Install, updates, redundancy (floating IP) are all your job'],
      ['Cloud managed', 'AWS ALB (L7) and NLB (L4), Google Cloud Load Balancing, Azure Load Balancer', 'Ready in a click, redundant inside, scales by itself', 'A bill for every GB/request, tied to the cloud, less control'],
    ]},
    { type: 'list', items: [
      `<strong>NGINX:</strong> a web server and a reverse proxy. Does L7 and L4. A very common first LB.`,
      `<strong>HAProxy:</strong> built only for load balancing. Very fast, with detailed health checks and stats.`,
      `<strong>Envoy:</strong> a modern proxy for microservices. It often runs next to each service as a small helper (a "sidecar"), and its settings can be changed through an API without a restart.`,
      `<strong>Real example:</strong> Wikipedia ran LVS (the Linux L4 load balancer) in front of its servers for years. Since around 2023 it has been moving to Katran (an open-source L4 LB from Meta).`,
    ]},

    { type: 'h2', text: 'L4 vs L7: a short intro' },
    { type: 'p', html: `There are two types, based on how much of the request the LB "reads". The numbers come from the layers of the internet: layer 4 = TCP/UDP (only address and port), layer 7 = HTTP (the full request).` },
    { type: 'compare',
      left: { title: 'L4 (transport level)', html: `Looks only at the IP and port, not the content inside.<br><br>• Very fast, light<br>• Any traffic (WebSockets, games, databases)<br>• Examples: AWS NLB, LVS<br><br>Like a courier who only reads the address and never opens the parcel.` },
      right: { title: 'L7 (application level)', html: `Reads the HTTP request: URL, headers, cookies.<br><br>• <code>/api/payments</code> → payment servers<br>• <code>/images</code> → image servers<br>• Examples: NGINX, Envoy, AWS ALB<br><br>Like an office receptionist who reads a letter and sends it to the right department.` },
    },
    { type: 'p', html: `The details (TLS, cost, when to use which) and all the algorithms are in the next lesson: <a href="#/lb-algorithms">Load balancing algorithms, L4 vs L7</a>. A quick look:` },
    { type: 'table', head: ['Algorithm', 'How it works', 'When to use'], rows: [
      ['Round robin', 'Take turns: 1, 2, 3, 1, 2, 3', 'Same-size servers, same-size requests. Often the default.'],
      ['Weighted round robin', 'Bigger server gets more turns (like 3:1)', 'Servers of different sizes'],
      ['Least connections', 'The server with the fewest running requests right now', 'Request times vary a lot (some 10 ms, some 10 s)'],
      ['IP hash', 'The user\'s IP always maps to the same server', 'When a user must stick to one server. Usually avoid it.'],
    ]},
    { type: 'callout', tone: 'why', title: 'How to decide', html: `• You need to send requests to different services by URL, header or cookie (like <code>/api/payments</code>) → <strong>L7</strong>.<br>• You need raw speed, or the traffic is not HTTP (like millions of WebSocket connections) → <strong>L4</strong>.<br>• Request times vary a lot → <strong>least connections</strong>, otherwise round robin.<br>• You only need to share traffic across identical servers → <strong>LB</strong>. You need auth, rate limiting and routing to many services → <strong>API gateway</strong> (often you have both: the gateway itself runs behind an LB).<br>• An LB always comes in a pair (or cloud managed), never alone.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: LB vs DNS', html: `An LB does not replace DNS. DNS turns a name into an address (and that address is often the LB's). The LB shares the requests that arrive at that address across servers. First DNS, then the LB. DNS can also share a little, but because of caching it is slow and blind.` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Load balancing at xyz.com, at a glance', height: 600,
      groups: [
        { label: 'Users and DNS', x: 20, y: 8, w: 680, h: 100 },
        { label: 'LB pair (floating IP)', x: 20, y: 140, w: 680, h: 110 },
        { label: 'App servers (stateless)', x: 20, y: 290, w: 680, h: 120 },
        { label: 'Data', x: 20, y: 450, w: 680, h: 130 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser / app', x: 200, y: 62, kind: 'client', info: 'What it is: the users of xyz.com. They only know one name. DNS gives them one address (the floating IP), and all requests go there.' },
        { id: 'dns', label: 'DNS', sub: 'xyz.com → VIP', x: 520, y: 62, kind: 'net', info: 'What it is: the phone book of the internet. It gives the address of xyz.com, which is the floating IP of the LB pair. Its answers are cached because of the TTL, so it is not used for fast failover.' },
        { id: 'lba', label: 'LB-A', sub: 'active · TLS', x: 200, y: 200, kind: 'edge', info: 'What it is: the load balancer in charge right now. It opens TLS, runs health checks, and gives every request to a healthy server. During deploys it drains servers.' },
        { id: 'lbb', label: 'LB-B', sub: 'standby', x: 520, y: 200, kind: 'edge', info: 'What it is: the backup LB. It listens to the heartbeat. If LB-A falls, it takes the floating IP, so the LB itself is not a SPOF.' },
        { id: 's1', label: 'Server 1', sub: 'stateless', x: 110, y: 360, kind: 'server', info: 'What it is: an application server. It keeps nothing important about users in memory, so it can take any request and can be removed without trouble.' },
        { id: 's2', label: 'Server 2', sub: 'stateless', x: 360, y: 360, kind: 'server', info: 'What it is: a second server with the same code. The LB health-checks it every 2-5 seconds.' },
        { id: 's3', label: 'Server 3', sub: 'autoscaled', x: 610, y: 360, kind: 'server', info: 'What it is: a server that started by itself when traffic grew. As soon as it passes the health check, the LB starts giving it traffic.' },
        { id: 'sess', label: 'Session store', sub: 'Redis', x: 200, y: 520, kind: 'cache', info: 'What it is: a shared place that keeps login sessions. Because of it we do not need sticky sessions: any server can recognise any user.' },
        { id: 'db', label: 'Database', x: 520, y: 520, kind: 'data', info: 'What it is: the permanent data of xyz.com. All servers read from here. The LB scales the servers, not the database: this will be the next bottleneck.' },
      ],
      edges: [
        { a: 'users', b: 'dns', n: 1, label: 'name → IP' },
        { a: 'users', b: 'lba', n: 2, label: 'HTTPS' },
        { a: 'users', b: 'lbb', dashed: true, label: 'on failover' },
        { a: 'lba', b: 'lbb', dashed: true, kind: 'evt', label: 'heartbeat', both: true },
        { a: 'lba', b: 's1' },
        { a: 'lba', b: 's2', n: 3, label: 'picked' },
        { a: 'lba', b: 's3' },
        { a: 'lbb', b: 's3', dashed: true },
        { a: 's1', b: 'sess' },
        { a: 's2', b: 'sess', n: 4, label: 'session' },
        { a: 's2', b: 'db', n: 5, label: 'data' },
        { a: 's3', b: 'db' },
      ],
      paths: [
        { name: 'Normal request', text: 'The floating IP from DNS, TLS opened at LB-A, healthy Server 2 picked, session from Redis and data from the database.', go: ['users>dns', 'users>lba>s2>sess', 's2>db'] },
        { name: 'Health checks', text: 'Every few seconds LB-A sends /health to every server. Fails in a row (fall) take a server out of the rotation, passes in a row (rise) bring it back.', go: ['lba>s1', 'lba>s2', 'lba>s3'] },
        { name: 'LB failover', text: 'LB-A fell: the heartbeat stopped and LB-B took the floating IP. The users\' address is the same, so DNS did not have to change.', go: ['lba>lbb', 'users>lbb>s3>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>The LB sits in front of the servers and gives every request to a healthy server. DNS gives the LB's address.</li>
      <li>Health checks: active (the LB asks itself) + passive (it counts failures of real requests). Interval, timeout, fall and rise decide how fast you notice.</li>
      <li>The LB must not be a SPOF: an active-passive pair + floating IP (keepalived/VRRP), or active-active, or a cloud LB.</li>
      <li>DNS load balancing is cheap, but TTL caching makes failover slow, and it is blind to health and load.</li>
      <li>TLS is usually opened at the LB (termination): one place for the certificate, and the LB can read the request.</li>
      <li>Avoid sticky sessions: keep sessions in a shared store like Redis, and keep servers stateless.</li>
      <li>Connection draining on deploys: first stop new requests, let running ones finish, then restart.</li>
      <li>L7 = routing by reading the URL/headers, L4 = only IP/port, very fast. Details in the next lesson.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Traffic is shared evenly across servers', 'A sick server is removed by itself (health checks)', 'Add/remove servers and deploy without downtime (draining)', 'Users see one address, whatever you change behind it', 'TLS is opened in one place, with one certificate'], costs: ['One extra hop for every request (a little latency, often under 1 ms)', 'The LB itself can become a SPOF: you need a pair or a cloud LB', 'One more component: settings, monitoring, bill', 'Servers must be made stateless (sessions moved out)', 'A wrong health check can take the whole site down'] },
    { type: 'think', questions: [
      { q: 'The health check runs every 10 seconds, fall = 3. Server 2 suddenly died. For how long can requests still go to it, and what would you do to protect users?', a: 'About 20-30 seconds (the first failed check within 10 s, then 2 more checks, plus the timeout). During that time 1 in 3 requests fails. Protection: a shorter interval (2-5 s), passive check + retry turned on (the failed request goes to another server), and retries on the client side. Zero failures is hard; "very few" is the target.' },
      { q: 'On xyz.com some requests take 20 ms and some video exports take 30 seconds. Round robin or least connections?', a: 'Least connections. Round robin shares by count, but if 3 long export requests land on one server, it gets stuck while the others are idle. Least connections looks at how busy each server is right now. Even better: send exports to a separate job queue.' },
      { q: 'You set up LB-A and LB-B as active-active, and both are usually 70% busy. What is the danger?', a: 'If one falls, the other gets 140% load and also drowns. In active-active, keep each LB below 50% (or add a third LB, N+1).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'How does the LB know that a server is down?', options: ['A user complains', 'From health checks', 'DNS tells it'], answer: 1, explain: 'The LB keeps checking an endpoint like /health (active) and counts failures of real requests (passive). When a server fails, it is taken out of the rotation.' },
      { q: 'You want to send /api/payments to separate servers and everything else to other servers. Which LB?', options: ['L4', 'L7', 'Either'], answer: 1, explain: 'You must read the URL path, and only an L7 (HTTP level) LB can do that.' },
      { q: 'The active LB fell. How does the standby LB take over without changing the users\' address (DNS)?', options: ['By setting the DNS TTL to 0', 'By taking the floating IP (VRRP/keepalived)', 'By emailing users a new link'], answer: 1, explain: 'A floating (virtual) IP is not stuck to one machine. As soon as the heartbeat stops, the standby takes that IP.' },
      { q: 'After login, users keep seeing "logged out" when a request goes to another server. Best fix?', options: ['Turn on sticky sessions', 'Keep sessions in a shared store like Redis', 'Use fewer servers'], answer: 1, explain: 'Sticky sessions are a workaround (if the server falls the session is lost, and load becomes uneven). A shared session store makes the servers stateless.' },
      { q: 'Uploads in the middle break during deploys. Which feature do you need?', options: ['Connection draining', 'GeoDNS', 'IP hash'], answer: 0, explain: 'With draining, the server first stops getting new requests, running requests finish, and then it restarts.' },
      { q: 'You added an LB and went from 3 to 10 servers. What is the most likely next bottleneck?', options: ['DNS', 'Database', 'Browser'], answer: 1, explain: 'All servers talk to one database. The LB scales the servers, not the database.' },
    ]},
    { type: 'sources', items: [
      { title: 'Module ngx_http_upstream_module', publisher: 'nginx.org', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_upstream_module.html', used: 'Default weighted round robin, the defaults max_fails=1 and fail_timeout=10s, active health_check only in the commercial version (NGINX Plus).' },
      { title: 'Health checks for Application Load Balancer target groups', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html', used: 'ALB defaults: interval 30 s, timeout 5 s, healthy threshold 5, unhealthy 2, and failing open when all targets are unhealthy.' },
      { title: 'Edit target group attributes (deregistration delay, sticky sessions)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html', used: 'Deregistration delay default of 300 s (draining), the AWSALB sticky cookie.' },
      { title: 'HAProxy configuration manual (server check options)', publisher: 'HAProxy', official: true, url: 'https://docs.haproxy.org/2.8/configuration.html', used: 'Health check options inter (2 s), fall (3), rise (2).' },
      { title: 'LVS', publisher: 'Wikitech (Wikimedia)', official: true, url: 'https://wikitech.wikimedia.org/wiki/LVS', used: 'Wikipedia\'s L4 load balancer (LVS + PyBal health checks) and the move to Katran.' },
      { title: 'Keepalived: introduction', publisher: 'Keepalived project docs', official: true, url: 'https://keepalived.readthedocs.io/en/latest/introduction.html', used: 'How floating IP failover works with VRRP.' },
    ]},
  ],
});
