Lesson.register({
  id: 'scalability',
  title: 'Scalability: vertical vs horizontal',
  minutes: 24,
  summary: `Scalability means: if users grow 100 times, the system can grow too without breaking. There are two ways: make the machine bigger (vertical) or add more machines (horizontal). Horizontal is easy only when servers are "stateless", so we keep sessions outside the server. And when traffic goes up and down during the day, autoscaling adds and removes servers on its own. In this lesson: the limits and cost of both ways, three ways to handle sessions, and an autoscaling simulator.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Yesterday 1,000 people visited your website. Today a video went viral and 1 lakh people came. One computer cannot do the work for so many people, and the site freezes.<br>There are only two ways out: get <strong>one bigger, more powerful computer</strong>, or use <strong>many normal computers</strong> that share the work.<br>In this lesson we will see when each way works, when it fails, and why we must make computers "forgetful" (stateless) so that sharing the work is easy.` },

    { type: 'h2', text: 'The problem: xyz.com went viral' },
    { type: 'p', html: `Right now xyz.com runs on just one server. A server is a computer that answers users' requests (we saw this in earlier lessons). Yesterday there were 1,000 users. Today there are 1 lakh.` },
    { type: 'callout', tone: 'term', title: 'New words: CPU and RAM', html: `<strong>What it is:</strong> the <strong>CPU</strong> is the computer's "brain" that does the calculations and work. Inside it are several <strong>cores</strong>; each core can do one task at a time. In the cloud, we often count them as <strong>vCPUs</strong> (virtual CPUs). <strong>RAM</strong> is the computer's fast, small working memory, where the data for the work happening right now is kept.<br><strong>Why we need it:</strong> every request uses a little CPU time and a little RAM. These decide how many requests a server can handle.<br><strong>Without it:</strong> CPU full = requests wait in a line. RAM full = the server becomes very slow or crashes.` },
    { type: 'p', html: `One server has a fixed amount of CPU and RAM. After a point, there is no capacity left: requests wait in a line, pages get slow, and then a <strong>timeout</strong> happens (the user's browser gives up after waiting too long and shows an error).` },
    { type: 'callout', tone: 'term', title: 'New word: Scalability', html: `<strong>What it is:</strong> the ability of a system to handle more load (users, requests, data) by adding resources, without rebuilding the system and without getting slower.<br><strong>Why we need it:</strong> xyz.com's users grow every day. Today's setup will break under tomorrow's traffic.<br><strong>Without it:</strong> every time traffic grows, the site goes down, and engineers spend the whole night fighting fires.<br><strong>Example:</strong> users went from 1,000 to 1 lakh (100 times). If we add 100 times the servers and the site is as fast as before, the system is scalable.` },
    { type: 'p', html: `There are two ways to scale. The first and simplest answer: <strong>make the machine bigger</strong>.` },

    { type: 'h2', text: 'Vertical scaling: a bigger machine' },
    { type: 'callout', tone: 'term', title: 'New word: Vertical scaling (scale up)', html: `<strong>What it is:</strong> the same one server, but with more CPU cores, more RAM and a faster disk. Like selling your phone and buying a bigger, faster phone.<br><strong>Why we need it:</strong> capacity goes up without changing a single line of code. At the start, this is the cheapest and fastest way.<br><strong>Without it:</strong> even for small traffic you would have to manage many machines, a Load Balancer and their setup, which is wasted effort at the start.<br><strong>Example:</strong> remove the server with 4 vCPU and 8 GB RAM and put in one with 32 vCPU and 128 GB RAM. About 8 times the capacity.` },
    { type: 'p', html: `Run it below. Click any box to get its explanation. The meter shows how busy the server is: green is fine, orange is tight, red is overloaded.` },
    { type: 'flow', height: 240,
      nodes: [
        { id: 'u', label: 'Users', sub: 'keep growing', x: 90, y: 120, w: 140, kind: 'client', info: 'What it is: the people who open xyz.com on phones and laptops. Every click becomes a request that goes to the server. Their number is the load.' },
        { id: 'net', label: 'Internet', x: 260, y: 120, w: 120, kind: 'net', info: 'What it is: the network that carries the user\'s request to the server (DNS, routers, cables). In this lesson it is only the road; we do not worry about its capacity.' },
        { id: 's', label: 'Server', sub: '4 vCPU, 8 GB RAM', x: 460, y: 120, w: 200, h: 66, kind: 'server', meter: true, load: 20, info: 'What it is: the single computer that runs xyz.com\'s code. In vertical scaling we make this one bigger. Meter = how busy the CPU is.' },
        { id: 'db', label: 'Database', x: 650, y: 120, w: 120, kind: 'data', info: 'What it is: the place where data like users and posts is saved for good. The server asks it for data on every request.' },
      ],
      edges: [{ a: 'u', b: 'net' }, { a: 'net', b: 's' }, { a: 's', b: 'db' }],
      scenarios: [
        { name: 'Get a bigger machine', steps: [
          { title: '1,000 users: relaxed', text: 'Server is 30% busy. All good.', flood: { paths: ['u>net>s>db'], n: 4 }, after: { s: { load: 30 } } },
          { title: '10,000 users: server is struggling', text: 'CPU at 95%. Requests wait in a line, pages are slow.', flood: { paths: ['u>net>s'], n: 14 }, after: { s: { load: 95, state: 'hot' } } },
          { title: 'Vertical scaling: a bigger server', text: 'Same code, just a machine 8 times bigger. Not one line of code changed. That is why vertical scaling is the first and easiest step.', set: { s: { label: 'Big server', sub: '32 vCPU, 128 GB RAM', load: 25, state: '' } }, flood: { paths: ['u>net>s>db'], n: 8 } },
          { title: '1 crore users: even the biggest machine is full', text: 'Machines have a limit. There is no bigger machine to buy. And it is still <strong>one</strong> machine.', flood: { paths: ['u>net>s'], n: 16 }, after: { s: { load: 100, state: 'hot', sub: 'none bigger exists' } } },
        ]},
        { name: 'Downtime for upgrade', intro: 'To make the machine bigger, we have to stop it. What happens during that time?', steps: [
          { title: 'Upgrade starts: server stopped', text: 'Even in the cloud, changing a machine\'s size usually means stopping it and starting it again at the new size. For a few minutes there is no server.', set: { s: { state: 'down', sub: 'resizing', load: 0 } } },
          { title: 'Users get errors', text: 'The request reaches the internet, but there is no one to answer. The user sees "site can\'t be reached".', go: 'lost:u>net>s', msg: 'connection refused' },
          { title: 'Back up, bigger server', text: 'A few minutes later the new big server is up. This is why upgrades are done at 3 am, when the fewest users are online. Still, some people were affected.', set: { s: { state: 'ok', label: 'Big server', sub: '32 vCPU, 128 GB RAM', load: 20 } }, go: ['u>net>s>db', 'res:db>s>net>u'] },
        ]},
        { name: 'Machine crash', intro: 'Hardware can break at any time: a disk, a power supply, a memory chip.', steps: [
          { title: 'The server\'s power supply burned out', text: 'No matter how big the server is, it is still only one.', set: { s: { state: 'down', sub: 'DOWN', load: 0 } }, focus: ['s'] },
          { title: 'The whole website is down', text: 'The database is fine, the internet is fine, but the single server in the middle is gone, so everything is gone. This is called a <strong>Single Point of Failure (SPOF)</strong>. The next lesson is all about fixing it.', go: 'lost:u>net>s', msg: '502 / timeout' },
        ]},
      ],
    },
    { type: 'h3', text: 'The three walls of vertical scaling' },
    { type: 'list', items: [
      `<strong>Hard limit (ceiling):</strong> however big a machine is, it has a limit. AWS's normal general-purpose machines go up to about 192 vCPUs. The biggest special machine (launched in 2024) has 1,920 vCPUs and 32 TB of RAM, and it is very expensive and built for special databases. There is nothing above it.`,
      `<strong>Cost:</strong> in the cloud, inside one machine family, if you double the size, the price also roughly doubles (a straight line). But for the top special machines, and for physical servers you buy yourself, each extra core at the top end costs a lot more. And the machine you bought for the peak keeps charging full price even when it sits empty at night.`,
      `<strong>Only one machine:</strong> if it falls, everything falls (SPOF), and you must stop it to upgrade. One more thing: many cores help only if your code can use them at the same time. We will see this in the "Concurrency vs parallelism" lesson.`,
    ]},
    { type: 'tradeoffs', gains: ['No change in the code', 'Simple: only one machine to manage', 'The cheapest way at the start', 'No network trouble between machines: everything is in one memory'], costs: ['Hard limit: you cannot get a bigger machine', 'Top-end machines are very expensive', 'Still a SPOF', 'Upgrades often need downtime'] },
    { type: 'h2', text: 'Horizontal scaling: add more machines' },
    { type: 'callout', tone: 'term', title: 'New word: Horizontal scaling (scale out)', html: `<strong>What it is:</strong> instead of one big server, many normal servers, all running the same code. The work is shared between them. More traffic? Add one more server (scale out). Less traffic? Remove one (scale in).<br><strong>Why we need it:</strong> there is no ceiling: 2, 20, 2,000 servers. And if one server falls, the others keep running.<br><strong>Without it:</strong> you stay stuck with the limit of the biggest machine and its SPOF.<br><strong>Example:</strong> companies like Google, Netflix and Instagram run thousands of normal servers, not one "super computer".` },
    { type: 'image', src: 'assets/img/scalability/wikimedia-servers.jpg', alt: 'A long line of server racks in a data center, each rack filled from top to bottom with dozens of thin servers', caption: 'This is what horizontal scaling really looks like: racks full of many normal, thin servers (these are Wikimedia\'s servers, which run Wikipedia). Each thin plate is a separate computer.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_35.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'p', html: `But there is a question: how does the user know which server to go to? The user only knows one address: xyz.com. For this we need a new component in the middle.` },
    { type: 'callout', tone: 'term', title: 'New word: Load Balancer (short intro)', html: `<strong>What it is:</strong> a "traffic police" that sits in front of the servers. All requests come to it first, and it sends each request to one free server.<br><strong>Why we need it:</strong> users see only one address, and no matter how many servers are inside, the work is shared evenly.<br><strong>Without it:</strong> users would have to pick a server themselves, one server would be crowded while another sat empty, and a dead server would keep getting requests.<br>It has its own full lesson in Phase 2 (algorithms, health checks). For now, this is enough.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', x: 80, y: 170, w: 110, kind: 'client', info: 'What it is: xyz.com\'s users. They only know one address (xyz.com). They do not care how many servers are inside.' },
        { id: 'lb', label: 'Load Balancer', sub: 'shares traffic', x: 260, y: 170, w: 150, kind: 'edge', info: 'What it is: the traffic police that sends each incoming request to one server. Why: to share work across many servers and skip a server that has fallen.' },
        { id: 's1', label: 'Server 1', x: 470, y: 70, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: a normal-sized server that runs all of xyz.com\'s code. The other servers are exact copies of it.' },
        { id: 's2', label: 'Server 2', x: 470, y: 170, w: 130, kind: 'server', meter: true, load: 20, info: 'What it is: a copy of Server 1, same code. Why: the work is split in half, and if one falls, the other keeps running.' },
        { id: 's3', label: 'Server 3', x: 470, y: 270, w: 130, kind: 'server', meter: true, hidden: true, info: 'What it is: a new server added when traffic grew. Adding servers like this is called horizontal scaling (scale out).' },
        { id: 'sess', label: 'Session store', sub: 'Redis', x: 650, y: 170, w: 120, kind: 'cache', hidden: true, info: 'What it is: a shared, fast in-memory store (Redis) where "who is logged in" is written. Why: now any server can recognise any user, so servers become stateless.' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' }, { a: 'lb', b: 's3' },
        { a: 's1', b: 'sess' }, { a: 's2', b: 'sess' }, { a: 's3', b: 'sess' },
      ],
      scenarios: [
        { name: 'Add machines', steps: [
          { title: 'Two servers, traffic is growing', text: 'The Load Balancer splits it half and half, but both are now at 85%.', flood: { paths: ['u>lb>s1', 'u>lb>s2'], n: 12 }, after: { s1: { load: 85, state: 'warn' }, s2: { load: 85, state: 'warn' } } },
          { title: 'Add Server 3', text: 'A new server, same code. Tell the Load Balancer, that is all. Now the load is split in three.', show: ['s3'], set: { s1: { load: 57, state: '' }, s2: { load: 57, state: '' }, s3: { load: 57 } }, flood: { paths: ['u>lb>s1', 'u>lb>s2', 'u>lb>s3'], n: 12 } },
          { title: 'One server fell? No problem', text: 'Server 2 went down, but 1 and 3 are running. The website is up. Horizontal scaling gives you both capacity and reliability.', set: { s2: { state: 'down', sub: 'DOWN', load: 0 }, s1: { load: 85 }, s3: { load: 85 } }, flood: { paths: ['u>lb>s1', 'u>lb>s3'], n: 8 } },
        ]},
        { name: 'The stateful server problem', intro: 'A hidden problem. See what happens when a server keeps user information in its own memory.', steps: [
          { title: 'Riya logs in, on Server 1', text: 'Server 1 writes in its own memory: "session abc = Riya, logged in". This is called <strong>state</strong>.', go: ['u>lb>s1', 'res:s1>lb>u'], after: { s1: { sub: 'memory: Riya ✓' } } },
          { title: 'The next request went to Server 2', text: 'The Load Balancer gave Riya\'s next request to Server 2. Riya is not in Server 2\'s memory at all.', go: 'u>lb>s2', after: { s2: { sub: 'who is Riya?', state: 'miss' } } },
          { title: 'Riya had to log in again', text: 'A very bad experience. And if Server 1 crashes, all its logged-in users are logged out at once.', go: 'bad:s2>lb>u', msg: '401: please login again' },
          { title: 'Fix: move the state out of the server', text: 'Keep session information in a shared store (Redis). Now the servers are <strong>stateless</strong>: there is nothing about the user in their memory. Any server can serve any user.', show: ['sess'], set: { s1: { sub: 'stateless' }, s2: { sub: 'stateless', state: '' } }, go: ['u>lb>s2>sess', 'res:sess>s2>lb>u'], after: { sess: { state: 'hit', sub: 'abc = Riya ✓' } } },
        ]},
        { name: 'The sticky sessions shortcut', intro: 'Another way: the Load Balancer always sends Riya to the same server. It works, as long as that server is alive.', steps: [
          { title: 'The LB "sticks" Riya to Server 1', text: 'The LB sets a cookie: "this user belongs to Server 1". Every request from Riya goes to Server 1. This is called a <strong>sticky session</strong>.', go: ['u>lb>s1', 'res:s1>lb>u'], after: { s1: { sub: 'Riya sticks here' } } },
          { title: 'Everything works fine', text: 'Riya\'s next request also went to Server 1, and she is logged in. No Redis was needed.', go: ['u>lb>s1', 'res:s1>lb>u'] },
          { title: 'Server 1 crashes', text: 'Riya\'s session was lost along with Server 1\'s memory. The LB now sends Riya to Server 2, which does not know her at all.', set: { s1: { state: 'down', sub: 'DOWN' } }, go: 'u>lb>s2', after: { s2: { state: 'miss', sub: 'who is Riya?' } } },
          { title: 'Result: logged out + uneven load', text: 'All of Server 1\'s users are logged out. Also, because users are stuck to servers, the load is not shared evenly: some servers are full, some are empty. So sticky sessions are only a shortcut; the real fix is stateless servers.', go: 'bad:s2>lb>u', msg: '401: please login again' },
        ]},
      ],
    },
    { type: 'tradeoffs', gains: ['Almost unlimited growth: add more servers', 'If one server falls, the rest keep running', 'Normal machines are cheap and available right away', 'Upgrades without downtime: replace one server at a time (rolling update)'], costs: ['New components like a Load Balancer and a shared session store', 'State has to be moved out of the servers', 'More machines = more work for monitoring and deployment', 'Machines talk over the network: a bit of extra latency and new kinds of failure'] },
    { type: 'h2', text: 'Stateless vs stateful: the real condition for horizontal scaling' },
    { type: 'callout', tone: 'term', title: 'New word: State', html: `<strong>What it is:</strong> anything the system has to <em>remember</em> from one request to the next. Like "Riya is logged in", "Riya has 2 items in her cart", "the video stopped at 3:42".<br><strong>Why it matters:</strong> without it, the user would have to tell everything again on every click.<br><strong>Where the problem is:</strong> if this memory lives in one server's own memory, only that server knows it.` },
    { type: 'callout', tone: 'term', title: 'New words: Stateful vs stateless server', html: `<strong>Stateful server:</strong> keeps user information (login, cart) in its own memory. The next request must come to the same server, or it says "who are you?".<br><strong>Stateless server:</strong> remembers nothing between requests. Whatever it needs either comes with the request, or is read from a shared place (database, cache). Any request can go to any server.<br><strong>Why we need it:</strong> you can add, remove or restart stateless servers whenever you want: no user loses data.<br><strong>Without it:</strong> adding and removing servers is risky, and a crash = users logged out.` },
    { type: 'callout', tone: 'term', title: 'New word: Session (and cookie)', html: `<strong>What it is:</strong> a session = the server-side record after login: "session id abc123 = Riya, logged in, valid until 10 o'clock". A <strong>cookie</strong> = a small entry kept in the browser (like <code>session=abc123</code>) that is sent to the server with every request automatically.<br><strong>Why we need it:</strong> this is how the server knows on every request that this is Riya, without asking for the password each time.<br><strong>Without it:</strong> you would log in again on every page.` },
    { type: 'p', html: `There are three common ways to decide where to keep the session (and other state):` },
    { type: 'table', head: ['Way', 'How it works', 'Good', 'Bad'], rows: [
      ['<strong>Sticky sessions</strong>', 'The Load Balancer always sends one user to the same server (by looking at a cookie or IP). The session is in that server\'s memory.', 'No code change, the quickest', 'Server falls = its users are logged out. Load is not shared evenly. Hard to remove a server.'],
      ['<strong>Shared session store</strong>', 'The session lives in a shared, fast store (often Redis, a database that keeps data in RAM). Every server reads from there.', 'Servers are fully stateless. No one is logged out if a server falls.', 'One more component to run, ~1 ms extra per request. The store itself must also have a backup copy.'],
      ['<strong>Token kept by the client</strong>', 'At login the server gives a signed token (like a JWT, seen in the "AuthN, AuthZ, JWT" lesson). The browser sends it with every request, and the server checks the signature.', 'No session to keep on the server at all. The simplest scaling.', 'Hard to cancel a token in the middle (logout/ban). A big token makes every request heavier.'],
    ], caption: 'Real systems often mix 2 and 3: a small token + important things in a shared store.' },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Stateless" does <strong>not</strong> mean the app has no state. The state is still there; it just moved out of the server's own memory into a shared place (database, Redis, token). The problem does not disappear; it is collected in one place, which then has to be scaled separately.` },
    { type: 'callout', tone: 'mistake', html: `Horizontal scaling is easiest for <strong>application servers</strong> (because they can be made stateless). Scaling a <strong>database</strong> horizontally is much harder, because its whole job is to keep state. For that we will use replication and sharding, in Phase 2. That is why a database is often scaled vertically first.` },
    { type: 'h2', text: 'Weigh it yourself: one big machine or many small ones?' },
    { type: 'p', html: `Now let us look at it with numbers. This calculator uses simple, assumed numbers: one vCPU handles about <strong>250 requests/second</strong> (a simple JSON API), we run a server at most at <strong>70%</strong> (the rest is headroom = space for a sudden crowd), and in the cloud the cost is about <strong>₹4 per vCPU per hour</strong> (growing in a straight line with size). In horizontal scaling each server has 8 vCPUs, and there are at least 2 servers.` },
    { type: 'callout', tone: 'term', title: 'New word: Headroom', html: `<strong>What it is:</strong> the part of a server's capacity that we leave empty on purpose.<br><strong>Why we need it:</strong> if traffic suddenly grows, or one server falls, the others have room to take over its work.<br><strong>Without it:</strong> servers running at 100% get even a little extra load, requests wait in a line, and everything gets slow (we will see this graph in the latency lesson).` },
    { type: 'custom', render(el) {
      const PER = 250, UT = 0.7, LAD = [2, 4, 8, 16, 32, 48, 64, 96, 128, 192], PR = 4, SM = 8;
      const STEPS = [1000, 2000, 5000, 10000, 20000, 30000, 40000, 60000, 100000];
      el.innerHTML = `<label>Peak traffic: <strong class="scP"></strong> requests/second</label>
        <input class="scR" type="range" min="0" max="${STEPS.length - 1}" step="1" value="3">
        <div class="row2" style="margin-top:12px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><strong>Vertical: one big machine</strong><div class="stats scV"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px"><strong>Horizontal: many 8-vCPU servers</strong><div class="stats scH"></div></div>
        </div>
        <div class="calc-note scN"></div>`;
      const r = el.querySelector('.scR');
      const st = (a, b) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`;
      const nf = x => x.toLocaleString('en-IN');
      const upd = () => {
        const need = STEPS[r.value];
        el.querySelector('.scP').textContent = nf(need);
        const v = need / (PER * UT), m = LAD.find(x => x >= v);
        const n = Math.max(2, Math.ceil(need / (SM * PER * UT))), left = (n - 1) * SM * PER;
        el.querySelector('.scV').innerHTML = m
          ? st('Needed', v.toFixed(1) + ' vCPU') + st('Machine', m + ' vCPU') + st('Cost', '₹' + nf(m * PR) + '/hour') + st('If the machine falls', '0 req/s left')
          : st('Needed', v.toFixed(1) + ' vCPU') + st('Machine', 'none!') + st('Cost', '-') + st('If the machine falls', '-');
        el.querySelector('.scH').innerHTML = st('Servers', n + ' × 8 vCPU') + st('Total vCPU', nf(n * SM)) + st('Cost', '₹' + nf(n * SM * PR) + '/hour') + st('If 1 server falls', nf(left) + ' req/s left');
        el.querySelector('.scN').textContent = !m
          ? `${nf(need)} req/s needs ${v.toFixed(0)} vCPUs, and normal big machines stop at 192 vCPUs. The vertical road has ended. With horizontal, just use ${n} servers.`
          : need <= 2000
          ? `With this little traffic, one machine is cheaper or the same, and it is simple. But if it falls, the site is down. Horizontal's 2 servers cost a bit more, but even if one falls they still handle ${nf(left)} req/s.`
          : `The cost is about the same (in the cloud, price grows in a straight line with size). The real difference: if the big machine falls, 0 is left, while if one of the ${n} servers falls, ${nf(left)} req/s are still running (you need ${nf(need)}).`;
      };
      r.addEventListener('input', upd);
      upd();
    }},
    { type: 'p', html: `Put the slider on 10,000: vertical needs one machine with 64 vCPUs (₹256/hour), horizontal needs 8 servers (the same 64 vCPUs, the same ₹256/hour). Same cost, but if one server falls, horizontal still has 14,000 req/s left. Now move it to 40,000: you need 229 vCPUs, and the vertical road is closed.` },
    { type: 'callout', tone: 'tip', html: `This calculator is only an estimate. Real numbers depend a lot on the code, the data and the machine. In an interview this estimate is enough: "a simple API server handles ~1,000-2,000 req/s, and plan for 50-70% utilisation". These numbers come back in the "Napkin maths" lesson.` },
    { type: 'h2', text: 'Elasticity and autoscaling: breathing with the traffic' },
    { type: 'p', html: `A new problem. At 2 am xyz.com gets 500 req/s, at 8 pm 5,000, and on a cricket match day 9,000. If you run servers for the peak all day, half the day you burn money. If you run them for the average, the site falls at the peak.` },
    { type: 'callout', tone: 'term', title: 'New word: Elasticity', html: `<strong>What it is:</strong> the ability of a system to <em>grow and shrink</em> its capacity by itself with the load, like a rubber band.<br><strong>Why we need it:</strong> so the site does not fall at the peak, and you do not pay for idle servers in quiet hours.<br><strong>Without it:</strong> either you always pay for the peak, or you let the site fall at the peak.<br>Scalability = "it <em>can</em> grow". Elasticity = "it grows <em>and</em> shrinks by itself as needed".` },
    { type: 'callout', tone: 'term', title: 'New word: Autoscaling', html: `<strong>What it is:</strong> a cloud feature that keeps watching a metric (like the servers' average CPU) and adds servers (scale out) or removes them (scale in) by itself.<br><strong>Why we need it:</strong> elasticity without a human: no one has to press a button at 3 am.<br><strong>Without it:</strong> an engineer would watch a graph and add servers by hand, always too late.<br><strong>Example:</strong> a "target tracking" policy in AWS: "keep the servers' average CPU around 50%". If CPU goes above 50%, add servers; if it goes below, remove them slowly. Just like a thermostat (the temperature setting on an AC).` },
    { type: 'steps', items: [
      { t: 'Measure', d: 'Every minute, the servers\' CPU (or requests per second per server) is measured.' },
      { t: 'Compare with the target', d: 'The target is 70% and right now it is 90%? Calculate: how many servers to add to get back to ~70%.' },
      { t: 'Start a new server', d: 'A new server starts from a ready image (OS + code). This can take 1-5 minutes.' },
      { t: 'Warm-up', d: 'The server started, the code loaded, the cache filled up. Until then it does not get the full load. This is called warm-up time.' },
      { t: 'Add it to the Load Balancer', d: 'If the health check passes, the LB starts sending it traffic. The server is stateless, so it is useful right away.' },
      { t: 'Scale in (slowly)', d: 'When load drops, remove a server, but first let its running requests finish (draining). And do not remove servers too quickly, or adding and removing will keep swinging back and forth.' },
    ]},
    { type: 'p', html: `Now run one day. Each bar = one hour of traffic. Each server handles at most 1,000 req/s, and the autoscaler keeps a 70% target (so one server for every 700 req/s, at least 2). Reactive autoscaling decides by looking at the previous hour's traffic, because a new server takes time to start. At 8 pm (hour 20) there is a cricket match spike.` },
    { type: 'custom', render(el) {
      const T = [1200, 800, 600, 500, 500, 600, 1000, 1800, 2600, 3000, 3200, 3300, 3400, 3200, 3000, 3000, 3200, 3600, 4200, 5000, 9000, 5200, 3500, 2000];
      const CAP = 1000, D = t => Math.max(2, Math.ceil(t / 700)), PEAK = Math.max(...T), AVG = T.reduce((a, b) => a + b, 0) / 24;
      const MODES = [
        ['Fixed: for the peak', h => D(PEAK), '13 servers all day. Never overloaded, but at night 11 out of 13 sit idle and still add to the bill.'],
        ['Fixed: for the average', h => D(AVG), '5 servers all day. Cheap, but during the match (hours 20, 21) the site is overloaded. Planning for the average is the most common mistake.'],
        ['Autoscaling (reactive)', h => D(T[(h + 23) % 24]), 'Servers go up and down with traffic. Slowly growing traffic was handled easily (thanks to the headroom). But the sudden spike at hour 20: the autoscaler had kept 8 servers based on hour 19\'s traffic, and 9,000 arrived. One hour of overload.'],
        ['Autoscaling + pre-scale', h => (h >= 19 && h <= 21) ? Math.max(D(T[(h + 23) % 24]), D(PEAK)) : D(T[(h + 23) % 24]), 'The match time was known in advance, so from hour 19 to 21 there were already 13 servers (scheduled scaling). No overload, and the cost is less than half of fixed-for-the-peak.'],
      ];
      el.innerHTML = `<div class="chips asM" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <svg class="asSvg" viewBox="0 0 480 200" style="width:100%;margin-top:10px" role="img" aria-label="24 hours of traffic and servers"></svg>
        <div style="font-size:13px;color:var(--ink-3)">Bar = traffic (red = overload). Line = total capacity of the servers.</div>
        <div class="stats asS"></div><div class="calc-note asN"></div>`;
      const box = el.querySelector('.asM'), svg = el.querySelector('.asSvg');
      let mode = 2;
      MODES.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = m[0]; b.onclick = () => { mode = i; draw(); }; box.appendChild(b); });
      const draw = () => {
        [...box.children].forEach((b, i) => b.classList.toggle('on', i === mode));
        const f = MODES[mode][1], top = 13000, X = h => 20 + h * 19, Y = v => 180 - v / top * 165;
        let s = '', line = '', sh = 0, ov = [];
        T.forEach((t, h) => { const n = f(h), c = n * CAP; sh += n; const bad = t > c; if (bad) ov.push(h);
          s += `<rect x="${X(h) + 2}" y="${Y(t)}" width="15" height="${180 - Y(t)}" rx="2" fill="var(${bad ? '--red' : '--accent'})" opacity="0.85"></rect>`;
          line += `${h ? 'L' : 'M'}${X(h)} ${Y(c)} L${X(h) + 19} ${Y(c)} `; });
        s += `<path d="${line}" fill="none" stroke="var(--amber)" stroke-width="2.5"></path><line x1="20" y1="180" x2="476" y2="180" stroke="var(--line)"></line>`;
        [0, 6, 12, 18, 23].forEach(h => { s += `<text x="${X(h) + 9}" y="196" font-size="10" text-anchor="middle" fill="var(--ink-3)">${h}h</text>`; });
        svg.innerHTML = s;
        el.querySelector('.asS').innerHTML = `<div class="stat"><span>Server-hours (cost)</span><strong>${sh}</strong></div><div class="stat"><span>Overload at</span><strong>${ov.length ? ov.map(h => h + 'h').join(', ') : 'none'}</strong></div><div class="stat"><span>Cost (₹32/server/hour)</span><strong>₹${(sh * 32).toLocaleString('en-IN')}</strong></div>`;
        el.querySelector('.asN').textContent = MODES[mode][2];
      };
      draw();
    }},
    { type: 'p', html: `The math for all four modes: fixed-for-the-peak 312 server-hours, 0 overload. Fixed-for-the-average 120, but 2 hours of overload. Reactive autoscaling only 110, but 1 hour of overload at the spike. Autoscaling + pre-scale 122, and 0 overload. The lesson: <strong>autoscaling is great for traffic that grows slowly, but it wakes up too late for a sudden spike.</strong> If you know a spike is coming (a sale, a match, a launch), scale up in advance.` },
    { type: 'callout', tone: 'warn', title: 'Limits of autoscaling', html: `<ul><li><strong>Delay:</strong> measuring the metric, deciding, starting a server and warm-up together take several minutes. If the spike comes faster than that, only headroom can save you.</li><li><strong>The database does not grow:</strong> app servers went from 10 to 50, but all of them hit the same single database. The bottleneck just moved further down.</li><li><strong>Always set a min and a max:</strong> a min (like 2, in different zones) so the site runs even if one falls. A max so a bug or a bot attack does not create a bill for 1,000 servers.</li><li><strong>It does not work with stateful servers:</strong> when a server is removed during scale in, its users' data is lost. Make servers stateless first.</li></ul>` },
    { type: 'h2', text: 'What to choose, and when?' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Go vertical first</strong> (a bigger machine), as long as it is cheap and safe, because it is simple. <strong>Move to horizontal</strong> when one machine cannot handle the traffic, or when you cannot afford one machine falling. Horizontal is easy only when servers are <strong>stateless</strong>, so push state into databases and caches.` },
    { type: 'table', head: ['Situation', 'What to do', 'Why'], rows: [
      ['New startup, 500 users', 'One good server (+ a backup)', 'A fleet wastes both money and effort'],
      ['One server at 80%, slow growth', 'Vertical: one size bigger', 'The quickest, no code change'],
      ['Downtime is not acceptable at all', 'Horizontal: at least 2 servers, in different zones', 'If one falls, the other runs'],
      ['Traffic goes up and down all day', 'Horizontal + autoscaling', 'More servers at the peak, fewer at night'],
      ['You know there is a sale/match tomorrow', 'Autoscaling + scale up in advance (pre-scale)', 'Reactive scaling wakes up too late for a spike'],
      ['The database is worn out', 'First vertical + cache + read replicas; then sharding', 'Making a database horizontal is the hardest'],
    ]},
    { type: 'diagram', title: 'Scalability: the whole picture', height: 500,
      groups: [
        { label: 'Users', x: 20, y: 14, w: 680, h: 92 },
        { label: 'Entry + control', x: 20, y: 116, w: 680, h: 120 },
        { label: 'App servers', x: 20, y: 248, w: 680, h: 112 },
        { label: 'State lives here', x: 20, y: 372, w: 680, h: 116 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'web + app', x: 360, y: 60, kind: 'client', info: 'What it is: xyz.com\'s users. They only know one name: xyz.com. Whether there are 2 servers or 200 behind it, nothing changes for them.' },
        { id: 'dns', label: 'DNS', sub: 'name → LB\'s IP', x: 150, y: 180, kind: 'net', info: 'What it is: the phonebook of the internet. It turns the name xyz.com into the Load Balancer\'s IP address. Servers keep changing, but this address stays the same.' },
        { id: 'lb', label: 'Load Balancer', sub: 'shares work', x: 360, y: 180, w: 150, kind: 'edge', info: 'What it is: the first stop for all requests, which shares them among the live servers. Why: horizontal scaling is not possible without it. A fallen server is taken out by the health check.' },
        { id: 'auto', label: 'Autoscaler', sub: 'target CPU 70%', x: 580, y: 180, w: 150, kind: 'queue', info: 'What it is: the part that watches a metric (CPU or req/s per server) and adds or removes servers. Why: capacity at the peak, savings at night. Set a min of 2 and a max.' },
        { id: 's1', label: 'Server 1', sub: 'stateless', x: 170, y: 310, kind: 'server', info: 'What it is: a normal server that runs xyz.com\'s code. It is stateless: it remembers nothing about the user, so it can be removed or replaced at any time.' },
        { id: 's2', label: 'Server 2', sub: 'stateless', x: 360, y: 310, kind: 'server', info: 'What it is: a copy of Server 1. Any request can go to any server, because the session is in Redis.' },
        { id: 's3', label: 'Server 3', sub: 'new (autoscale)', x: 550, y: 310, kind: 'server', info: 'What it is: a server added by the autoscaler when traffic grew. After warm-up, the LB starts sending it traffic.' },
        { id: 'sess', label: 'Session store', sub: 'Redis', x: 265, y: 432, kind: 'cache', info: 'What it is: a shared, fast (RAM-based) store for login sessions. Why: this is why the app servers are stateless. It should also have a backup copy itself.' },
        { id: 'db', label: 'Database', sub: 'vertical first', x: 455, y: 432, kind: 'data', info: 'What it is: xyz.com\'s real data. The state lives here, so it is the hardest to scale: first a bigger machine, then replicas and sharding (Phase 2).' },
      ],
      edges: [
        { a: 'users', b: 'dns', n: 1, label: 'IP?' },
        { a: 'users', b: 'lb', n: 2 },
        { a: 'lb', b: 's1' }, { a: 'lb', b: 's2', n: 3 }, { a: 'lb', b: 's3' },
        { a: 'lb', b: 'auto', dashed: true, kind: 'evt', label: 'metrics' },
        { a: 'auto', b: 's3', dashed: true, kind: 'evt', label: '+1 server' },
        { a: 's1', b: 'sess' }, { a: 's2', b: 'sess', n: 4 }, { a: 's2', b: 'db', n: 5 }, { a: 's3', b: 'db' },
      ],
      paths: [
        { name: 'Normal request', text: 'DNS gives the LB\'s address, the LB picks Server 2, Server 2 reads the session from Redis (Riya is logged in), then gets data from the DB.', go: ['users>dns', 'users>lb>s2>sess', 's2>db'] },
        { name: 'Traffic spike', text: 'The LB\'s metrics show CPU above 70%. The autoscaler adds Server 3, and after warm-up the LB gives it work too.', go: ['lb>auto>s3', 'lb>s3>db'] },
        { name: 'Server crash', text: 'Server 2 falls. The LB\'s health check fails, and traffic goes to Servers 1 and 3. The session is in Redis, so no one is logged out. The autoscaler starts a new server.', go: ['users>lb>s1>sess', 'lb>s3'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Scalability = when load grows, you can handle it by adding resources, without rebuilding the system.</li>
      <li>Vertical (a bigger machine): simple, same code. But a hard limit, expensive at the top end, a SPOF, and downtime for upgrades.</li>
      <li>Horizontal (more machines): almost unlimited, and if one falls the rest keep running. But you need a Load Balancer and stateless servers.</li>
      <li>Stateless = the server remembers nothing between requests. State (session, cart) goes into Redis/DB/a token.</li>
      <li>Sticky sessions are only a shortcut: if the server falls, its users are logged out.</li>
      <li>Elasticity/autoscaling = adding and removing servers by itself based on a metric. Great for slow traffic changes; for a sudden spike, pre-scale.</li>
      <li>Plan for 50-70% utilisation (headroom). The database is the last and hardest part to scale.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['The site can keep running even if traffic grows 100 times', 'Horizontal + stateless = one server falling is no big deal', 'Autoscaling means fewer servers at night, a smaller bill', 'Deploys and upgrades without downtime (replace one server at a time)'], costs: ['More components: Load Balancer, session store, autoscaler', 'Work to move state out, and to scale that store too', 'Autoscaling wakes up late for a spike: you pay for headroom and pre-scaling', 'The database is still the hardest part'] },
    { type: 'think', questions: [
      { q: 'You have 3 servers and the shopping cart is kept in the server\'s memory. What problem will you hit?', a: 'If the next request goes to another server, the cart looks empty. And if the server with the cart restarts (or the autoscaler removes it), the cart is gone. Fix: keep the cart in Redis/the database so the servers stay stateless.' },
      { q: 'A startup has 500 users. Should it set up 5 servers + a Load Balancer, or one good server?', a: 'One good server (maybe with a backup). A fleet for 500 users wastes both money and complexity. Go horizontal when the need for traffic or reliability grows.' },
      { q: 'Autoscaling is on, but the site still fell in the 10 minutes before the IPL final. Why, and what should you have done?', a: 'Traffic grew many times in just a few minutes. The autoscaler took several minutes to see the metric, start servers and warm them up, and by then the old servers were overloaded. Fix: the match time was known, so scale up in advance (scheduled/pre-scaling), keep more headroom, and have a plan to switch off less important features.' },
      { q: 'You went from 10 app servers to 40, but the site is still slow. Where will you look?', a: 'The bottleneck is probably the database: 40 servers now send 4 times the queries to the same single DB. Horizontal scaling just pushed the problem further down. You need to think about a cache, read replicas, better queries/indexes, or sharding.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Upgrading a server from 8 GB to 64 GB of RAM is what?', options: ['Horizontal scaling', 'Vertical scaling', 'Sharding'], answer: 1, explain: 'Making the same machine bigger = vertical. Increasing the number of machines = horizontal.' },
      { q: 'What must servers be for horizontal scaling?', options: ['Stateless', 'Very big', 'In the same data center'], answer: 0, explain: 'Stateless servers remember nothing, so any request can go to any server.' },
      { q: 'The biggest weakness of vertical scaling?', options: ['You must rewrite the code', 'It has a hard limit and remains a SPOF', 'It needs a Load Balancer'], answer: 1, explain: 'Even the biggest machine has a limit, and it is one machine that can fall.' },
      { q: 'What is the problem with sticky sessions?', options: ['They are very slow', 'If a server falls, its users\' sessions are lost, and load is not shared evenly', 'They do not work with HTTPS'], answer: 1, explain: 'The session is in one server\'s memory. The real fix: a shared session store or a token, so the server is stateless.' },
      { q: 'Autoscaling target is 70% CPU, each server handles at most 1,000 req/s. Traffic is 5,600 req/s. How many servers are needed?', options: ['6', '8', '56'], answer: 1, explain: 'At 70%, each server takes ~700 req/s. 5,600 ÷ 700 = 8 servers.' },
      { q: 'What is the difference between elasticity and scalability?', options: ['They are the same', 'Scalability = it can grow; elasticity = it grows and shrinks by itself with the load', 'Elasticity is only for databases'], answer: 1, explain: 'In a scalable system, capacity can be added. An elastic system does this by itself, in both directions.' },
    ]},
    { type: 'sources', note: 'Machine sizes and autoscaling behaviour come from these official docs.', items: [
      { title: 'Target tracking scaling policies for Amazon EC2 Auto Scaling', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html', used: 'Target tracking works like a thermostat (example: keep average CPU at 50%), scale out above target and scale in more gradually, instance warm-up, rounding up when adding instances.' },
      { title: 'New Amazon EC2 High Memory U7inh instance on HPE server for large in-memory databases', publisher: 'AWS News Blog', official: true, year: 2024, url: 'https://aws.amazon.com/blogs/aws/new-amazon-ec2-high-memory-u7inh-instance-on-hpe-server-for-large-in-memory-databases/', used: 'Largest single cloud machine at launch: 1,920 vCPUs and 32 TB memory, built for big in-memory databases (the vertical-scaling ceiling).' },
      { title: 'Amazon EC2 M7i instances', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/ec2/instance-types/m7i/', used: 'General-purpose sizes go from 2 up to 192 vCPUs; on-demand price grows roughly in step with size inside one family (used for the planner\'s simple per-vCPU price).' },
    ]},
  ],
});
