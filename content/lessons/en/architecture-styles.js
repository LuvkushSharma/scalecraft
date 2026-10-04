Lesson.register({
  id: 'architecture-styles',
  title: 'Monolith, microservices, event-driven',
  minutes: 35,
  summary: `Keep everything in one app (monolith), split it into clean parts on the inside (modular monolith), or build separate services (microservices)? Should services call each other or send events? This lesson covers all the big options for the "overall shape" of a system: monolith, modular monolith, microservices, event-driven, CQRS, event sourcing, serverless (cold start), peer-to-peer and hexagonal architecture, plus Conway's law and a "which style when" decider. When each one is right, and when it is just fashion.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `There are many ways to build an app. Should all the code live in one big program? Or should it be split into 50 small programs that talk to each other over a network?<br>Both have their own benefits and pains. What is best for a team of 3 people can become a nightmare for a team of 300.<br>In this lesson, the story of xyz.com goes from 3 developers to 300. At every stage a new problem shows up, and we will see which "shape" (architecture style) solves it, and what price it asks in return. Every style also has a small game.` },
    { type: 'h2', text: 'The problem: what shape should xyz.com have?' },
    { type: 'p', html: `In the resilience lesson we simply assumed that xyz.com had already been split into ten services, and then we learned to fight network failures. Now let us take a step back and ask the real questions: <strong>was splitting necessary? When should we split? And if we must split, how?</strong>` },
    { type: 'p', html: `The roadmap's one-line truth: <em>most big companies started as monoliths and split later.</em> In this lesson we follow xyz.com from 3 developers to 300 developers, and at every stage we see which "shape" works.` },
    { type: 'callout', tone: 'term', title: 'New word: Architecture style', html: `<strong>What it is:</strong> the big shape of a system. It answers three questions: into how many separately deployable pieces is the code split; how do those pieces talk to each other (function call, network call, or event); and where does the data live.<br><strong>Why we need it:</strong> this is the top-level "boxes and arrows" decision. Speed, cost and team freedom all depend on it.<br><strong>Without it (moving on without thinking):</strong> the system grows into some tangled shape by itself, and changing it later is the most expensive thing.` },
    { type: 'callout', tone: 'term', title: 'New word: Deploy', html: `<strong>What it is:</strong> putting new code live on the servers, so that users get the new feature. A "deployable unit" = a piece of code that is built and released together.<br><strong>Why it matters:</strong> every style in this lesson really asks how many deployable units there should be, and how they should talk.<br><strong>Without it:</strong> the code is only on the developer's laptop; nothing has reached the user.` },

    { type: 'h2', text: 'Stage 1: Monolith (and that is not wrong)' },
    { type: 'p', html: `Day 1 of xyz.com. Three developers. One codebase, one server process, one Postgres database. Login, video upload, feed, comments: all inside one app, in different folders/functions. The feed needs the user's name? Just a <code>users.getName(42)</code> function call. An answer in ~microseconds, no network trouble.` },
    { type: 'callout', tone: 'term', title: 'New word: Monolith', html: `<strong>What it is:</strong> an app whose whole code is <strong>built together and deployed together</strong>, and runs as one process (a running program). One copy contains all the features. Running 10 copies behind a load balancer is still a monolith, because all the copies are exactly the same.<br><strong>Why we need it:</strong> the simplest shape. Build one thing, run one thing, debug one thing.<br><strong>Without it (split from day one):</strong> a team of 3 gets stuck handling network calls, many pipelines and many databases, instead of building features.<br><strong>Example:</strong> even big companies like Shopify ran on one big monolith for years (story below).` },
    { type: 'list', items: [
      `<strong>Simple deploy:</strong> one build, one pipeline, one thing to monitor.`,
      `<strong>Function calls are fast and reliable:</strong> no need for network timeouts, retries or circuit breakers.`,
      `<strong>One database, real transactions:</strong> "save the comment AND increase the video's comment_count" in one ACID transaction. Either both happen, or neither.`,
      `<strong>Easy debugging:</strong> one stack trace, one log file, and the whole app runs on a local machine.`,
      `<strong>Cheap refactoring:</strong> rename a function, and the code editor (IDE) updates every place by itself. Changing an API between services is far more expensive.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'A monolith is a valid starting point', html: `New product, small team, requirements changing every day: here a monolith is the fastest road. Martin Fowler also wrote that most of the systems he saw built as microservices from the start ran into serious trouble. In an interview, saying "start with a monolith, split when it hurts" is not weakness, it is maturity.` },

    { type: 'h2', text: 'Stage 2: The pain of a monolith' },
    { type: 'p', html: `Two years later, xyz.com has 80 developers in 8 teams. Still the same single codebase. Now problems appear. Play the diagram below:` },
    { type: 'flow', title: 'Monolith: one codebase, many identical copies', height: 300,
      nodes: [
        { id: 'u', label: 'Users', sub: 'app + web', x: 80, y: 150, w: 120, kind: 'client', info: 'What it is: xyz.com users. They do not care whether there is one app or a hundred services inside; they just want the feed fast and without errors.' },
        { id: 'lb', label: 'Load balancer', x: 250, y: 150, w: 140, kind: 'net', info: 'What it is: the server that spreads traffic (Load balancer lesson). It spreads requests across identical copies of the monolith. Any copy can handle any request, because every copy has all the code.' },
        { id: 'm1', label: 'Monolith #1', sub: 'feed+upload+recs+...', x: 455, y: 80, w: 170, kind: 'server', meter: true, load: 35, info: 'What it is: the first copy of the monolith. All of xyz.com in one process: login, upload, transcoding trigger, feed, recommendations, comments. The modules talk to each other with function calls (microseconds, no network).' },
        { id: 'm2', label: 'Monolith #2', sub: 'same code', x: 455, y: 220, w: 170, kind: 'server', meter: true, load: 35, info: 'What it is: a second copy of exactly the same code. Scaling means: more identical copies. But every copy carries the memory/CPU of all the features.' },
        { id: 'db', label: 'Postgres', sub: 'one shared DB', x: 640, y: 150, w: 130, kind: 'data', info: 'What it is: the single database of xyz.com. All tables of all modules live here. Benefit: one transaction across many tables. Cost: any module can touch any table, so the boundaries slowly get blurry.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'm1' }, { a: 'lb', b: 'm2' }, { a: 'm1', b: 'db' }, { a: 'm2', b: 'db' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'A request arrives', text: 'A user opened the feed. The LB gave it to copy #1.', go: 'u>lb>m1', msg: 'GET /feed' },
          { title: 'Inside, all function calls', text: 'The feed module called the profile, recs and comments modules with a <strong>function call</strong>. No network, no timeout, no JSON. Each call takes microseconds.', focus: ['m1'], msg: 'feed.build(user=42)\n  → profiles.get(42)        ~µs (function call)\n  → recs.top(42, 10)        ~µs + its own work\n  → comments.counts([...])  ~µs' },
          { title: 'One transaction', text: 'All data is in one DB, so joins and transactions are simple.', go: ['m1>db', 'res:db>m1'], msg: 'SELECT ... FROM videos JOIN users ... JOIN comment_counts ...' },
          { title: 'Response', text: 'Simple, fast, debugged in one place. For a small xyz.com this was the best.', go: 'res:m1>lb>u', after: { m1: { state: 'ok' } } },
        ]},
        { name: 'One bug, all down', intro: 'Code with a memory leak was deployed in the recommendations module.', steps: [
          { title: 'The recs module eats memory', text: 'A memory leak = code takes memory and never gives it back. The leak is in recs, but there is only one process. The memory of the whole process fills up.', set: { m1: { state: 'hot', sub: 'memory 95%', load: 95 }, m2: { state: 'hot', sub: 'memory 93%', load: 93 } }, focus: ['m1', 'm2'] },
          { title: 'Both copies crash', text: 'Out of memory (OOM), the process crashes. Both copies have the same code, so both fall. Login, upload, comments: all gone, even though the bug was only in recommendations.', set: { m1: { state: 'down', sub: 'OOM CRASH', load: 0 }, m2: { state: 'down', sub: 'OOM CRASH', load: 0 } }, go: ['u>lb', 'bad:lb>u'], msg: '502 Bad Gateway' },
          { title: 'Lesson', text: 'A monolith has no <strong>fault isolation</strong>: a mistake in one module is a mistake of the whole app. (Good tests, canary deploys and limits reduce this, but do not remove it.)', focus: ['m1', 'm2'] },
        ]},
        { name: 'One part is heavy', intro: 'On the day of a cricket final, uploads and thumbnail generation went up 20 times. Other features were normal.', steps: [
          { title: 'Load only on upload', text: 'Only the upload/thumbnail code is eating CPU, but it lives inside every copy.', flood: { paths: ['u>lb>m1', 'u>lb>m2'], n: 12 }, after: { m1: { state: 'hot', load: 92, sub: 'CPU: thumbnails' }, m2: { state: 'hot', load: 90, sub: 'CPU: thumbnails' } } },
          { title: 'Scale the whole app', text: 'Thumbnails need 10 more copies, so 10 copies of the <strong>whole monolith</strong>: each copy carries the memory of feed, comments, login and everything. And each opens DB connections. Scaling only the heavy part is not possible.', focus: ['lb'], set: { db: { state: 'warn', sub: 'connections full' } } },
        ]},
        { name: 'Deploy train', intro: '8 teams, one codebase, one release.', steps: [
          { title: 'Everyone on one train', text: 'Every team\'s code goes out in one release, say once a week. One test of the comments team failed, so the ready feature of the recs team was also blocked.', set: { m1: { state: 'warn', sub: 'release blocked' }, m2: { state: 'warn', sub: 'release blocked' } }, focus: ['m1', 'm2'] },
          { title: 'Teams stuck on each other', text: 'Merge conflicts, "who changed this table?", a 40-minute build. This is a <strong>people problem</strong>, not a technology problem. And this is the real reason companies start splitting.', focus: ['db'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New word: Big ball of mud', html: `<strong>What it is:</strong> the state where, inside a monolith, any code calls any other code, and any module reads/writes any table directly. The code becomes a tangled ball.<br><strong>Why it matters:</strong> most people call monoliths "bad" for exactly this reason. But the problem is not "one deploy"; it is <em>the lack of boundaries</em>.<br><strong>Living with it:</strong> change one place, and three unknown places break. Every change is made with fear.` },

    { type: 'h2', text: 'Stage 3: Modular monolith' },
    { type: 'p', html: `The first cure is not splitting, it is <strong>cleaning up on the inside</strong>. The code is still one deploy, but inside it is divided into modules by business area (domain), with <em>strict walls</em> between them.` },
    { type: 'callout', tone: 'term', title: 'New word: Modular monolith', html: `<strong>What it is:</strong> a single deployable app, but inside, every module (Users, Videos, Feed, Payments...) has its own <strong>public interface</strong> (functions open to outsiders) and its own tables. Another module can only call that interface; it cannot touch the inner classes or tables directly. These rules are enforced by tools and CI checks (automatic tests that run on every code change), not just by "promises".<br><strong>Why we need it:</strong> to avoid the big ball of mud, and to give every team its own clean area, without the cost of a network.<br><strong>Without it:</strong> either a tangled monolith, or microservices in a hurry.` },
    { type: 'ascii', text: `
            xyz.com  (one deploy, one process)
 ┌──────────────────────────────────────────────────┐
 │  ┌─────────┐   ┌─────────┐   ┌──────────┐        │
 │  │ Users   │   │ Videos  │   │ Payments │        │
 │  │ public: │◄──│ public: │   │ public:  │        │
 │  │ getUser │   │ upload  │   │ charge   │        │
 │  │─────────│   │─────────│   │──────────│        │
 │  │ private │   │ private │   │ private  │        │
 │  │ tables: │   │ tables: │   │ tables:  │        │
 │  │ users   │   │ videos  │   │ payments │        │
 │  └─────────┘   └─────────┘   └──────────┘        │
 │   ✗ Videos code cannot run                        │
 │     "SELECT * FROM payments". CI will fail it.    │
 └──────────────────────────────────────────────────┘`, caption: 'The boundaries are inside, not on the network.' },
    { type: 'p', html: `<strong>A real example: Shopify (2019).</strong> Shopify's Ruby on Rails monolith was one of the biggest Rails codebases in the world: according to their engineering blog, ~6,000 Ruby classes and the work of more than 1,000 developers. Instead of splitting into microservices, they reorganised the code into <em>components</em> by business concept (orders, shipping, inventory, billing...). Their reasons: microservices mean many deploy pipelines, network latency, hard refactoring across services, and coordinating deploys. To catch calls that break boundaries, they built an internal tool called "Wedge" that built a call graph in CI and counted violations. (This post is from Feb 2019; their tools have moved on since then, but the idea is the same.)` },
    { type: 'list', items: [
      `<strong>What you get:</strong> the simplicity of one deploy and one transaction, plus clear ownership: "the Payments module belongs to the Payments team".`,
      `<strong>What you do not get:</strong> separate scaling and fault isolation. A memory leak can still bring down the whole process.`,
      `<strong>Hidden benefit:</strong> if one day a module must become a service (say transcoding), its interface is already clean. Pulling it out is easy. That is why a modular monolith is often called the <em>preparation</em> for microservices.`,
    ]},
    { type: 'p', html: `<strong>Worked example:</strong> in the xyz.com code, there are 6 places where one module touches another. 4 calls go through the public interface (fine). 2 calls touch another module's table or private class directly (violations). Run CI: build fails, 2 violations. Replace each violation with a public function: build is green. Try it yourself below:` },
      { type: 'custom', render(el) {
      const CALLS = [
        { from: 'Feed', bad: 'SELECT name FROM users WHERE id = 42', good: 'Users.getName(42)' },
        { from: 'Videos', bad: null, good: 'Users.isVerified(42)' },
        { from: 'Payments', bad: null, good: 'Users.getEmail(42)' },
        { from: 'Feed', bad: null, good: 'Videos.latest(42, 10)' },
        { from: 'Videos', bad: 'UPDATE payments SET status = \'paid\'', good: 'Payments.markPaid(order_9)' },
        { from: 'Comments', bad: null, good: 'Videos.exists(7)' },
      ];
      let fixed = CALLS.map(c => !c.bad), ran = false;
      el.innerHTML = `<div class="mm-list" style="display:flex;flex-direction:column;gap:6px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary mm-ci">Run CI check</button><button type="button" class="btn small ghost mm-r">Reset</button></div>
        <div class="stats"><div class="stat"><span>Calls</span><strong>${CALLS.length}</strong></div><div class="stat"><span>Violations</span><strong class="mm-v"></strong></div><div class="stat"><span>Build</span><strong class="mm-b"></strong></div></div>
        <div class="calc-note mm-note"></div>`;
      const draw = () => {
        const bad = fixed.filter(f => !f).length;
        el.querySelector('.mm-list').innerHTML = CALLS.map((c, i) => {
          const ok = fixed[i], flag = ran && !ok;
          return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px;border:1.5px solid ${flag ? 'var(--red)' : 'var(--line)'};border-radius:var(--r-sm)"><strong style="min-width:76px">${c.from} →</strong><code style="font-size:12px;overflow-wrap:anywhere">${ok ? c.good : c.bad}</code>${!ok ? `<button type="button" class="btn small ghost" data-i="${i}" style="margin-left:auto">Replace with public API</button>` : '<span style="margin-left:auto;color:var(--green);font-size:13px">public interface ✓</span>'}</div>`;
        }).join('');
        el.querySelector('.mm-v').textContent = ran ? bad : '?';
        el.querySelector('.mm-b').textContent = !ran ? 'not run yet' : bad ? 'FAIL ✗' : 'PASS ✓';
        el.querySelector('.mm-note').textContent = !ran ? 'First press "Run CI check". This tool reads the code of every module and checks that nobody touches another module\'s table or private code directly.'
          : bad ? bad + ' boundary violation(s). This code will not be merged. Replace the red lines with public functions and run again.'
          : 'All calls go through public interfaces. Now, if Payments ever has to become a separate service, only its interface turns into a network call; the rest of the code will not even notice.';
      };
      el.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.classList.contains('mm-ci')) ran = true;
        else if (b.classList.contains('mm-r')) { fixed = CALLS.map(c => !c.bad); ran = false; }
        else if (b.dataset.i) { fixed[+b.dataset.i] = true; }
        draw();
      });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Monolith = old, dirty code." No! A monolith is a <strong>deployment</strong> decision (one unit), and dirty code is a <strong>design</strong> mistake. A monolith with clean modules is far better than a tangled microservices system (people call that a <em>distributed monolith</em>: the services are separate, but every deploy needs all of them to change together).` },

    { type: 'h2', text: 'Stage 4: Microservices' },
    { type: 'p', html: `Now xyz.com has 300 developers in 30 teams. The recommendations team wants to deploy 5 times a day, transcoding needs GPU machines, payments needs a strict security audit. One deploy unit is blocking everyone. Now it is time to split.` },
    { type: 'p', html: `<strong>Microservices</strong> (the term appeared in the resilience lesson): every business capability is a separate service, in its own process, with its own deploy pipeline, and <strong>with its own database</strong>. Services talk over the network (HTTP/gRPC) or through events. The 2014 article by James Lewis and Martin Fowler described them like this: services are built around business capabilities, deployed independently, data is decentralised (each service keeps its own data), and the design expects failure.` },
    { type: 'callout', tone: 'term', title: 'New word: Microservices', html: `<strong>What it is:</strong> splitting the app into many small services. Each service does one business job (profiles, recommendations, payments), runs in its own process, belongs to its own team, is deployed separately, and has <strong>its own database</strong>.<br><strong>Why we need it:</strong> so that 30 teams can deploy without waiting for each other, and only the heavy part needs to be scaled.<br><strong>Without it (with a very big team):</strong> a deploy train, merge conflicts, one team's bug blocks everyone's release.<br><strong>The price:</strong> what used to be a function call is now a network call: slow, it can fail, and the data is split across many databases.` },
    { type: 'flow', title: 'Microservices: one request, many network calls', height: 330,
      nodes: [
        { id: 'u', label: 'App', x: 70, y: 160, w: 110, kind: 'client', info: 'What it is: the xyz.com mobile app or browser. It sends just one request: GET /feed. It does not know how many services are inside.' },
        { id: 'gw', label: 'API gateway', x: 230, y: 160, w: 130, kind: 'edge', info: 'What it is: one front door for all services: login check (auth), rate limit, and routing to the right service. It sends the request to the Feed service. (See the resilience lesson.)' },
        { id: 'feed', label: 'Feed service', x: 420, y: 160, w: 140, kind: 'server', info: 'What it is: the service that builds the feed. Now it gets profiles, recs and comments through network calls, not function calls. Every call means: serialize, network, deserialize, and a chance of failure.' },
        { id: 'fdb', label: 'Feed DB', sub: 'feed data only', x: 420, y: 280, w: 140, kind: 'data', info: 'What it is: the database of the Feed service only ("database per service"). The Feed service cannot read another service\'s table directly; it must ask through an API. Teams become independent, but cross-service JOINs and transactions are gone.' },
        { id: 'prof', label: 'Profile svc', x: 615, y: 60, w: 150, kind: 'server', info: 'What it is: the service that gives users\' names and photos. Its own team, its own DB, its own deploy schedule.' },
        { id: 'recs', label: 'Recs svc', x: 615, y: 160, w: 150, kind: 'server', meter: true, load: 30, info: 'What it is: the service that builds "you may also like" (recommendations). Runs on GPU/ML machines and scales separately. Deployed many times a day.' },
        { id: 'cmt', label: 'Comments svc', x: 615, y: 270, w: 150, kind: 'server', info: 'What it is: the service that gives comments and their counts. If it is slow, should the feed wait or go on without counts? That decision is now part of the design.' },
      ],
      edges: [{ a: 'u', b: 'gw' }, { a: 'gw', b: 'feed' }, { a: 'feed', b: 'fdb' }, { a: 'feed', b: 'prof' }, { a: 'feed', b: 'recs' }, { a: 'feed', b: 'cmt' }],
      scenarios: [
        { name: 'Happy path (latency adds up)', steps: [
          { title: 'The request comes in', text: 'App → gateway → feed. Every hop is a network call.', go: 'u>gw>feed', msg: 'GET /feed   (gateway hop ~2 ms)' },
          { title: 'Feed\'s own data', text: 'Feed got the video IDs from its own DB.', go: ['feed>fdb', 'res:fdb>feed'], msg: 'SELECT video_id FROM feed_items WHERE user_id = 42   ~5 ms' },
          { title: 'Parallel calls to three services', text: 'What used to be function calls are now three network calls. Sent in parallel, the total = the slowest one. Sent one after another, it would be the sum of all three.', parallel: true, go: ['feed>prof', 'feed>recs', 'feed>cmt'], msg: 'parallel:  profile 8 ms | recs 25 ms | comments 6 ms\n→ wait = max = 25 ms   (sequential would be 39 ms)' },
          { title: 'Answers come back', text: 'All went well. But every call means building/reading JSON, TLS, and a small network delay. The microseconds of the monolith are now milliseconds.', parallel: true, go: ['res:prof>feed', 'res:recs>feed', 'res:cmt>feed'] },
          { title: 'Response', go: 'res:feed>gw>u', text: 'Total ~35-40 ms. Fine, but every new dependency adds to this bill.', after: { feed: { state: 'ok' } } },
        ]},
        { name: 'Recs down, no timeout', intro: 'The recs service hung. The feed code has no timeout.', steps: [
          { title: 'Recs does not answer', text: 'The request went out, the answer never came.', set: { recs: { state: 'down', sub: 'HANG', load: 0 } }, go: ['feed>prof', 'lost:feed>recs'] },
          { title: 'Feed threads are stuck', text: 'Every feed request is waiting for recs. The thread pool (the group of workers that handle requests) is full. Now the feed service itself cannot take new requests.', flood: { paths: ['u>gw>feed'], n: 10 }, after: { feed: { state: 'hot', sub: 'threads full' } } },
          { title: 'Cascading failure', text: 'One service\'s problem became the whole app\'s problem. In a monolith one bug took everything down; in microservices <em>one slow dependency</em> can take everything down, if there are no timeouts and circuit breakers.', go: ['u>gw', 'bad:gw>u'], set: { feed: { state: 'down', sub: 'DOWN' } }, msg: '504 Gateway Timeout' },
        ]},
        { name: 'Recs down, timeout + fallback', intro: 'The same failure, but feed uses the tricks from the resilience lesson.', steps: [
          { title: 'Timeout 100 ms', text: 'Recs is hung. Feed stops waiting after 100 ms (once the circuit breaker opens, it does not even call next time).', set: { recs: { state: 'down', sub: 'DOWN', load: 0 } }, go: ['lost:feed>recs'] },
          { title: 'The rest of the data arrived', go: ['feed>prof', 'feed>cmt', 'res:prof>feed', 'res:cmt>feed'], text: 'Profiles and comments are fine.' },
          { title: 'Graceful degradation', text: 'Instead of "Recommended for you", the feed shows "Trending" (a cached list). The user sees a small difference, the site stays up. This <strong>fault isolation</strong> is the real benefit of microservices, but it is not free: it must be designed.', go: 'res:feed>gw>u', after: { feed: { state: 'ok', sub: 'feed without recs' } } },
        ]},
        { name: 'Separate deploy, separate scale', steps: [
          { title: 'The recs team deploys', text: 'The recs team deployed a new model. Only recs restarted. Feed, profile and comments did not even notice. Even 5 deploys a day are fine.', set: { recs: { state: 'warn', sub: 'deploying v42' } }, focus: ['recs'] },
          { title: 'Scale only recs', text: 'At the evening peak, only recs goes from 4 to 20 copies. The profile service stays at 3 copies. That was not possible in the monolith.', set: { recs: { state: 'ok', sub: '20 copies', load: 45 } }, flood: { paths: ['feed>recs'], n: 8 } },
        ]},
        { name: 'The pain of distributed data', intro: 'User 42 deleted their account.', steps: [
          { title: 'Profile removed its data', text: 'User 42 is gone from the profile service\'s DB.', set: { prof: { state: 'ok', sub: 'user 42 deleted' } }, focus: ['prof'] },
          { title: 'Comments does not know', text: 'Comments has its own DB; user 42\'s comments are still there. In a monolith, one transaction would do "DELETE user + comments". Here there is no shared transaction.', set: { cmt: { state: 'warn', sub: '42\'s comments left' } }, focus: ['cmt'] },
          { title: 'Cure: events or a saga', text: 'Profile sends an event "UserDeleted" (through an outbox, remember the Kafka lesson), and comments listens and cleans its own data. For a short while the data is inconsistent: this is <strong>eventual consistency</strong>. Multi-step work needs sagas (see the Sagas lesson).', focus: ['prof', 'cmt'] },
        ]},
      ],
    },

    { type: 'h3', text: 'The bill for microservices' },
    { type: 'table', head: ['Benefit', 'Cost (that people forget)'], rows: [
      ['Every team deploys its own service, without waiting for anyone', '<strong>Network calls:</strong> any call can be slow, can fail, or can run twice. You need timeouts, retries, circuit breakers, idempotency'],
      ['Scale only the heavy part (transcoding vs profiles)', '<strong>Distributed data:</strong> no cross-service JOIN, no single ACID transaction. You must learn sagas, outbox, eventual consistency'],
      ['Fault isolation: if recs fails, feed can run without recs', '<strong>Operations:</strong> 50 services = 50 pipelines, dashboards, alerts, on-call. Without distributed tracing you cannot answer "where did the request get stuck?"'],
      ['Each service can pick its own tech (Python for ML, Go for the gateway)', '<strong>Testing and versioning:</strong> if service A changes its API, B, C, D can break. You need contract tests and backward-compatible changes'],
      ['Smaller codebase, a new developer understands it quickly', '<strong>Latency adds up:</strong> try the calculator below'],
    ]},
    { type: 'p', html: `A simple calculation: if a request must pass through N services <em>one after another</em>, the latency adds up and the availability <strong>multiplies</strong>. If every service is 99.9% up, a chain of 5 services is only ~99.5% up. Move the sliders and see:` },
      { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Services in the chain (one after another): <strong class="as-vn"></strong></label><input class="as-n" type="range" min="1" max="10" step="1" value="5"></div>
          <div><label>Latency of each call (ms): <strong class="as-vl"></strong></label><input class="as-l" type="range" min="1" max="50" step="1" value="10"></div>
        </div>
        <div style="margin-top:10px"><label>Availability of each service: <strong class="as-va"></strong></label><input class="as-a" type="range" min="0" max="4" step="1" value="2"></div>
        <div class="stats">
          <div class="stat"><span>Network latency (hops only)</span><strong class="as-lat"></strong></div>
          <div class="stat"><span>Availability of the whole chain</span><strong class="as-av"></strong></div>
          <div class="stat"><span>Downtime per month (30 days)</span><strong class="as-dt"></strong></div>
        </div>
        <div class="calc-note as-note"></div>`;
      const $ = c => el.querySelector(c);
      const AV = [99, 99.5, 99.9, 99.95, 99.99];
      const fmt = m => m >= 120 ? (m / 60).toFixed(1) + ' hours' : m.toFixed(1) + ' min';
      const upd = () => {
        const n = +$('.as-n').value, L = +$('.as-l').value, a = AV[+$('.as-a').value] / 100;
        const chain = Math.pow(a, n), down = (1 - chain) * 30 * 24 * 60, one = (1 - a) * 30 * 24 * 60;
        $('.as-vn').textContent = n; $('.as-vl').textContent = L; $('.as-va').textContent = (a * 100) + '%';
        $('.as-lat').textContent = n * L + ' ms';
        $('.as-av').textContent = (chain * 100).toFixed(3) + '%';
        $('.as-dt').textContent = fmt(down);
        $('.as-note').textContent = n === 1
          ? 'One service: the request is exactly as available as that service.'
          : `A single service would be down ~${fmt(one)}/month. A chain of ${n} is down ~${fmt(down)}/month, because if any one fails, the whole request fails. So: keep the chain short, make calls that are not essential async (events), and keep fallbacks.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h3', text: "Conway's law: the shape of the teams = the shape of the system" },
    { type: 'callout', tone: 'term', title: "New word: Conway's law", html: `<strong>What it is:</strong> an idea from Melvin Conway in 1968, in plain words: <strong>the structure of a system ends up looking like the way the organisation that builds it talks to itself.</strong><br><strong>Why it matters:</strong> microservice boundaries are really <em>team</em> boundaries. If one service belongs to two teams, every change needs a meeting; if one team looks after 15 services, it becomes a burden.<br><strong>Without it (if you ignore it):</strong> the system copies the confusion of the teams: teams that never talk end up with a thin, odd interface between their systems.<br><strong>Using it the other way round:</strong> many companies first shape their teams the way they want the system to look. This is called the "inverse Conway manoeuvre".` },
    { type: 'p', html: `<strong>Worked example:</strong> xyz.com wants to add a new field (a message with the tip) to the "Super Tips" feature. If the teams are built by <em>layer</em> (Frontend team, Backend team, Database team), one small feature needs three teams, three queues, two handoffs. If the teams are built by <em>feature</em> (Upload team, Feed team, Payments team, each with frontend + backend + DB people), one team does the whole job. Toggle and see:` },
    { type: 'custom', render(el) {
      const ORG = {
        layer: { teams: ['Frontend team', 'Backend team', 'Database team'], involved: [0, 1, 2], sys: 'The system also looks like three layers: one big UI, one big backend, one shared DB. Every feature touches every layer.' },
        feature: { teams: ['Upload team', 'Feed team', 'Payments team'], involved: [2], sys: 'The system also looks like three parts: Upload, Feed and Payments services, each with its own slice from UI to DB.' },
      };
      let mode = 'layer';
      el.innerHTML = `<div class="chips cw-c" role="group" aria-label="Team structure"><button type="button" class="chip on" data-m="layer">Teams by layer</button><button type="button" class="chip" data-m="feature">Teams by feature</button></div>
        <svg class="cw-svg" viewBox="0 0 340 120" style="width:100%;max-width:520px;display:block;margin:10px 0" role="img" aria-label="Teams involved in one feature"></svg>
        <div class="stats"><div class="stat"><span>Teams involved</span><strong class="cw-t"></strong></div><div class="stat"><span>Handoffs</span><strong class="cw-h"></strong></div></div>
        <div class="calc-note cw-n"></div>`;
      const draw = () => {
        const o = ORG[mode], n = o.involved.length;
        el.querySelectorAll('.cw-c .chip').forEach(c => c.classList.toggle('on', c.dataset.m === mode));
        el.querySelector('.cw-svg').innerHTML = `<rect x="125" y="4" width="90" height="26" rx="6" fill="var(--accent-soft)" stroke="var(--accent)"/><text x="170" y="21" text-anchor="middle" font-size="11" fill="var(--ink)">Tips feature</text>`
          + o.teams.map((t, i) => { const x = 10 + i * 112, on = o.involved.includes(i);
            return `<line x1="170" y1="30" x2="${x + 50}" y2="78" stroke="${on ? 'var(--accent)' : 'var(--line)'}" stroke-width="${on ? 2 : 1}" ${on ? '' : 'stroke-dasharray="3 3"'}/><rect x="${x}" y="78" width="100" height="32" rx="6" fill="var(--surface)" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${on ? 2 : 1}"/><text x="${x + 50}" y="98" text-anchor="middle" font-size="11" fill="${on ? 'var(--ink)' : 'var(--ink-3)'}">${t}</text>`; }).join('');
        el.querySelector('.cw-t').textContent = n + ' / 3';
        el.querySelector('.cw-h').textContent = n - 1;
        el.querySelector('.cw-n').textContent = o.sys + (n > 1 ? ' Every handoff = waiting, meetings, and a chance of misunderstanding.' : ' One team, no handoff: the feature ships quickly.');
      };
      el.querySelector('.cw-c').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-m]'); if (b) { mode = b.dataset.m; draw(); } });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Microservices = scalable." Wrong. 50 copies of a monolith behind a load balancer can handle a lot of traffic. Microservices mainly answer <strong>organisation scaling</strong> (many teams working independently) and <strong>different scaling profiles</strong> (GPU transcoding vs a light profile API). Giving a team of 5 people 20 services lowers productivity.` },

    { type: 'h2', text: 'Event-driven architecture' },
    { type: 'p', html: `Look at the code of the upload service. After a video is uploaded, it must call the transcoder, notifications, search and analytics. Every time a new team arrives, one more call is added to the upload team's code, and if any of them is down, the upload gets stuck. Why should the upload service know about so many services?` },
    { type: 'callout', tone: 'term', title: 'New word: Event-driven architecture (EDA)', html: `<strong>What it is:</strong> instead of telling each other "do this", services announce <strong>"this happened"</strong>. That announcement is an <strong>event</strong>: a fact in the past tense, like <code>VideoUploaded {id: 7}</code>. The event goes to a <strong>broker</strong> (a message system in the middle, like Kafka, SNS, RabbitMQ), and whoever cares subscribes (starts listening). The sender does not even know who is listening.<br><strong>Why we need it:</strong> the upload service should not need to know about 10 other services, and the upload should not get stuck when one of them is down.<br><strong>Without it:</strong> every new team adds one more call to the upload code; one slow service makes everyone slow.` },
    { type: 'compare',
      left: { title: 'Request-driven (command)', html: `Upload service: "Transcoder, transcode this. Notifications, tell the followers. Search, index it."<br><br>• The sender knows everyone<br>• All synchronous: one slow = all slow<br>• New team = change in the upload code<br>• Result known right away` },
      right: { title: 'Event-driven (event)', html: `Upload service: "VideoUploaded {id:7}". That is all.<br><br>• The sender knows nobody (loose coupling)<br>• Consumers at their own speed, async<br>• New team = new subscriber, zero change in upload<br>• Result comes later, and the flow is harder to see` },
    },
    { type: 'flow', title: 'Event fan-out: one event, many reactions', height: 330,
      nodes: [
        { id: 'up', label: 'Upload service', sub: 'producer', x: 90, y: 165, w: 140, kind: 'server', info: 'What it is: the service that receives video uploads (producer = the one that sends the event). It saves the video in object storage, writes a row + an outbox row in its DB, and that is all. It does not care who does what next.' },
        { id: 'bus', label: 'Kafka', sub: 'topic: video-events', x: 310, y: 165, w: 160, kind: 'queue', info: 'What it is: the event broker. The event is written to a log; every consumer group reads at its own speed and can even replay old events (Kafka lesson).' },
        { id: 'tr', label: 'Transcoder', x: 570, y: 45, w: 160, kind: 'server', info: 'What it is: the service that converts videos into different qualities. On VideoUploaded it makes 240p/720p/1080p versions. When done, it sends a new event itself: VideoTranscoded.' },
        { id: 'nt', label: 'Notifications', x: 570, y: 125, w: 160, kind: 'server', info: 'What it is: the service that sends push notifications to followers. If it is down, upload is not affected; when it comes back it reads from where it stopped.' },
        { id: 'se', label: 'Search indexer', x: 570, y: 205, w: 160, kind: 'server', info: 'What it is: the search indexer. It puts the new video into the search index. It can run a little behind: in the meantime the video does not show in search (eventual consistency).' },
        { id: 'an', label: 'Analytics', x: 570, y: 285, w: 160, kind: 'server', info: 'What it is: the analytics service. Counts uploads, creator stats. These events also go into the data pipeline (batch/stream): the next lesson.' },
        { id: 'mod', label: 'Moderation', sub: 'new team', x: 310, y: 285, w: 160, kind: 'server', hidden: true, info: 'What it is: the service of the new moderation team, which checks every new video for abuse/copyright. Not a single line changed in the upload service; just a new consumer group.' },
      ],
      edges: [{ a: 'up', b: 'bus' }, { a: 'bus', b: 'tr' }, { a: 'bus', b: 'nt' }, { a: 'bus', b: 'se' }, { a: 'bus', b: 'an' }, { a: 'bus', b: 'mod', hidden: true, id: 'bm' }],
      scenarios: [
        { name: 'Fan-out', steps: [
          { title: 'Upload published an event', text: 'The video was saved, and a fact was announced. The upload service is done; the user immediately sees "Uploaded, processing...".', go: 'up>bus', after: { up: { state: 'ok' } }, msg: 'topic=video-events key=video_7\n{ "type": "VideoUploaded", "video_id": 7, "creator": 42, "at": "2026-10-04T18:02:11Z" }' },
          { title: 'Everyone reacts on their own', text: 'All four consumers got the same event, all in parallel and independent.', parallel: true, go: ['evt:bus>tr', 'evt:bus>nt', 'evt:bus>se', 'evt:bus>an'], after: { tr: { state: 'ok', sub: 'transcoding...' }, nt: { state: 'ok' }, se: { state: 'ok' }, an: { state: 'ok' } } },
          { title: 'A chain of events', text: 'When the transcoder is done, it sends a new event <code>VideoTranscoded</code>, which the player/feed services listen to. Services react to each other\'s events without any "boss": this is called <strong>choreography</strong>. If a central coordinator tells every step, that is <strong>orchestration</strong> (Sagas lesson).', go: 'evt:tr>bus', msg: '{ "type": "VideoTranscoded", "video_id": 7, "renditions": ["240p","720p","1080p"] }' },
        ]},
        { name: 'A new team arrives', steps: [
          { title: 'The moderation team joins', text: 'The new service subscribes. No meeting with the upload team, no deploy.', show: ['mod', 'bm'], focus: ['mod'] },
          { title: 'Events start arriving', text: 'Because it is Kafka, it can also replay and check the videos of the last 7 days.', go: 'evt:bus>mod', after: { mod: { state: 'ok', sub: 'checking video 7' } } },
        ]},
        { name: 'Consumer down', steps: [
          { title: 'Notifications crash', text: 'The notifications service is down for 30 minutes.', set: { nt: { state: 'down', sub: 'DOWN' } }, focus: ['nt'] },
          { title: 'Everything else keeps running', text: 'Uploads go on; transcoding, search, analytics are all normal. In a request-driven design the upload service\'s call would fail here, and maybe the upload itself would fail.', parallel: true, go: ['up>bus', 'evt:bus>tr', 'evt:bus>se', 'evt:bus>an'] },
          { title: 'Comes back and catches up', text: 'Notifications reads from its last offset and processes 30 minutes of events. Careful: now 30-minute-old notifications will go out; for some events you need "too old, skip it" logic.', go: 'evt:bus>nt', set: { nt: { state: 'warn', sub: 'catching up' } } },
        ]},
        { name: 'Eventual consistency', intro: 'Riya uploaded a video and immediately searched for her title.', steps: [
          { title: 'Upload done', text: 'The upload service said "done".', go: 'up>bus', after: { up: { state: 'ok' } } },
          { title: 'Search is still behind', text: 'The search indexer is 20 seconds behind. Riya did not see her video in search. A bug? No: the system is <strong>eventually consistent</strong>. It will show up in a few seconds.', set: { se: { state: 'warn', sub: 'lag 20 s' } }, focus: ['se'] },
          { title: 'The design answer', text: 'Write "Processing, it will show up in search soon" in the UI, or show the uploader their own list straight from the upload service (read-your-own-writes). And for debugging, put a <code>correlation_id</code> in every event, so you can trace "everything that happened to video 7".', go: 'evt:bus>se', after: { se: { state: 'ok', sub: 'indexed' } } },
        ]},
      ],
    },
    { type: 'list', items: [
      `<strong>When to use EDA:</strong> when many different systems must react to one thing; when the work is slow and the user does not need the result right away; when teams should stay independent.`,
      `<strong>When not to:</strong> the user needs an answer right away ("did login succeed?"); a simple chain of 2-3 hops; when the flow of the whole business process must be visible in one place (there, orchestration/a workflow engine is better).`,
      `<strong>Hidden costs:</strong> duplicate events (make consumers idempotent), order only per key, changing the schema (old consumers must not break), and losing the map of "who does what on which event".`,
    ]},

    { type: 'h2', text: 'CQRS: separate models for writing and reading' },
    { type: 'p', html: `The xyz.com creator dashboard: "views per day for the last 30 days, top 10 videos, viewers by country, earnings". This query joins 6 tables and crushes the main database on every dashboard refresh. On the other side, the data being written (one view, one tip) is small and simple, and it needs strict rules ("a tip cannot be negative"). One single table design cannot do both jobs well.` },
    { type: 'callout', tone: 'term', title: 'New word: CQRS', html: `<strong>What it is:</strong> CQRS = Command Query Responsibility Segregation. A <strong>command</strong> = a request that changes something ("send a tip"). A <strong>query</strong> = a request that only reads ("show the dashboard"). In CQRS, the two have <strong>separate data models</strong> (separate tables, often separate databases). The write model focuses on rules and correct data. The read model is in a ready-made shape that can go straight to the screen. The read model is updated from the write side through events or CDC (reading the database's change log). The idea was described by Greg Young.<br><strong>Why we need it:</strong> so heavy dashboard queries do not crush the main database, and each side runs on the best DB for its job.<br><strong>Without it:</strong> every dashboard refresh joins 6 tables, and users sending tips get slow.` },
    { type: 'ascii', text: `
  Command: "send a tip"                Query: "show the dashboard"
         │                                       │
         ▼                                       ▼
 ┌────────────────┐   event: TipReceived   ┌──────────────────┐
 │  WRITE model   │ ─────── Kafka ───────► │   READ model     │
 │ Postgres,      │   (or CDC / outbox)    │ dashboard_daily  │
 │ normalised,    │                        │ (ClickHouse/ES/  │
 │ rules check    │                        │  Redis), ready   │
 └────────────────┘                        └──────────────────┘
   correct and strict                        fast and denormalised
              ← a lag of a few seconds in between →`, caption: 'The read model runs a little behind: eventual consistency.' },
    { type: 'list', items: [
      `<strong>Benefits:</strong> reads and writes scale separately; each side uses the best DB for its job (Postgres for writes, a column store, which is a DB built for analytics, for dashboards, Elasticsearch for search); many read models from one write model.`,
      `<strong>Cost:</strong> two models, a sync pipeline, and <em>lag</em>: the creator just received a tip, and the dashboard shows it 3 seconds later. Martin Fowler's warning: for most systems CQRS adds risky complexity for nothing; apply it only to one part of the system (a bounded context) where it is really needed.`,
      `<strong>You may already be doing it:</strong> sending data from Postgres to Elasticsearch with CDC (search lesson) is a light form of CQRS.`,
    ]},
    { type: 'p', html: `<strong>Worked example:</strong> the projector (the part that reads events and updates the read model) has a lag of 3 seconds. At t = 0 Aman sent a ₹50 tip: the write model shows ₹50 at once. At t = 1 Riya opened the dashboard: it showed ₹0 (old). At t = 3 the event arrived: the dashboard shows ₹50. And a "tip" of −₹20 is stopped by the write model itself; nothing reaches the read side. Run it yourself:` },
      { type: 'custom', render(el) {
      el.innerHTML = `<label>Read model lag: <strong class="cq-lv"></strong></label><input class="cq-lag" type="range" min="0" max="10" step="1" value="3">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"><button type="button" class="btn small primary" data-a="tip">Command: send ₹50 tip</button><button type="button" class="btn small ghost" data-a="badtip">Command: −₹20 tip</button><button type="button" class="btn small ghost" data-a="tick">+1 second</button><button type="button" class="btn small primary" data-a="read">Query: show dashboard</button><button type="button" class="btn small ghost" data-a="reset">Reset</button></div>
        <div class="stats"><div class="stat"><span>Time</span><strong class="cq-t"></strong></div><div class="stat"><span>Write model (Postgres)</span><strong class="cq-w"></strong></div><div class="stat"><span>Read model (dashboard)</span><strong class="cq-r"></strong></div><div class="stat"><span>Events on the way</span><strong class="cq-q"></strong></div></div>
        <div class="calc-note cq-n"></div>`;
      let t, w, r, q, msg;
      const reset = () => { t = 0; w = 0; r = 0; q = []; msg = 'Send a tip, then read the dashboard right away. Then keep pressing +1 second.'; };
      const flush = () => { q.filter(e => e.at <= t).forEach(e => { r += e.amt; }); q = q.filter(e => e.at > t); };
      const draw = () => {
        el.querySelector('.cq-lv').textContent = el.querySelector('.cq-lag').value + ' s';
        el.querySelector('.cq-t').textContent = 't = ' + t + ' s'; el.querySelector('.cq-w').textContent = '₹' + w; el.querySelector('.cq-r').textContent = '₹' + r; el.querySelector('.cq-q').textContent = q.length;
        el.querySelector('.cq-n').textContent = msg;
      };
      el.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a, lag = +el.querySelector('.cq-lag').value;
        if (a === 'reset') reset();
        else if (a === 'tip') { w += 50; q.push({ amt: 50, at: t + lag }); flush(); msg = 'The write model checked the rules (amount > 0, creator verified) and saved at once: ₹' + w + '. A TipReceived event went out; it will reach the read model in ' + lag + ' s.'; }
        else if (a === 'badtip') msg = 'The write model refused: a tip cannot be negative. No event was made, the read model got nothing. Rules live only on the write side.';
        else if (a === 'tick') { t++; flush(); msg = q.length ? q.length + ' event(s) still on the way. The dashboard is ' + (w - r > 0 ? '₹' + (w - r) + ' behind.' : 'equal.') : 'The read model has caught up with the write model (eventually consistent).'; }
        else if (a === 'read') msg = w === r ? 'Dashboard: ₹' + r + '. Completely fresh.' : 'Dashboard: ₹' + r + ', but the real total is ₹' + w + '. This is a stale read: the read model is ₹' + (w - r) + ' behind right now. This is the price of CQRS.';
        draw();
      });
      el.querySelector('.cq-lag').addEventListener('input', draw);
      reset(); draw();
    }},

    { type: 'h2', text: 'Event sourcing: save the history, not the state' },
    { type: 'p', html: `In a normal app, a table holds only the <em>current value</em>: <code>wallet.balance = 110</code>. What was the balance yesterday? How did it become 110? What if someone ran an UPDATE by mistake? The old value is gone. Think of a bank passbook: it does not only show the balance; every entry is written down, and the balance is the sum of those entries.` },
    { type: 'callout', tone: 'term', title: 'New word: Event sourcing', html: `<strong>What it is:</strong> the source of truth is an <strong>append-only event log</strong> (new events are only added at the end). Every change is an event: <code>TipReceived +100</code>, <code>Withdrawn -120</code>. The current state is not stored; it is built by <strong>replaying</strong> the events from the start (applying them one by one). Events are never edited or deleted; to fix a mistake you write a new "opposite" event (like <code>TipRefunded</code>).<br><strong>Why we need it:</strong> the full history: when, who, what. For money, wallets and orders, "how did this number come about?" always has an answer.<br><strong>Without it:</strong> the table holds only the last value; old values disappear forever with every UPDATE.` },
    { type: 'p', html: `Below is the "Super Tips" wallet of the xyz.com creator Riya. Use the slider to replay events one by one. Then switch the projection (the code that builds a read model from events) and see: <strong>the same events build a completely new read model</strong> that never existed before.` },
      { type: 'custom', render(el) {
      const EV = [
        { t: 'WalletOpened', d: 'creator: riya', amt: 0 },
        { t: 'TipReceived', d: '+100 from aman', amt: 100, who: 'aman' },
        { t: 'TipReceived', d: '+50 from zoya', amt: 50, who: 'zoya' },
        { t: 'Withdrawn', d: '-120 to bank', amt: -120 },
        { t: 'TipReceived', d: '+200 from aman', amt: 200, who: 'aman' },
        { t: 'TipRefunded', d: '-50 back to zoya', amt: -50, who: 'zoya' },
        { t: 'TipReceived', d: '+30 from dev', amt: 30, who: 'dev' },
        { t: 'Withdrawn', d: '-100 to bank', amt: -100 },
      ];
      // Two projections (read models) built from the same events.
      const balanceView = (s, e) => {
        s = Object.assign({ balance: 0, tips: 0, tipCount: 0, refunds: 0, withdrawn: 0 }, s);
        s.balance += e.amt;
        if (e.t === 'TipReceived') { s.tips += e.amt; s.tipCount++; }
        if (e.t === 'TipRefunded') s.refunds -= e.amt;
        if (e.t === 'Withdrawn') s.withdrawn -= e.amt;
        return s;
      };
      const supportersView = (s, e) => {
        s = Object.assign({}, s);
        if (e.who) s[e.who] = (s[e.who] || 0) + e.amt;
        return s;
      };
      const SNAP = 4; // snapshot saved after event #4
      el.innerHTML = `<div class="chips as-proj" role="group" aria-label="Read model">
          <button type="button" class="chip on" data-p="0">Read model 1: Balance</button>
          <button type="button" class="chip" data-p="1">Read model 2: Top supporters (new)</button>
        </div>
        <div style="margin-top:10px"><label>Replay: from event 1 to <strong class="as-vk"></strong></label><input class="as-k" type="range" min="0" max="${EV.length}" step="1" value="${EV.length}"></div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px;color:var(--ink-2)"><input class="as-snap" type="checkbox"> Use a snapshot (the state after event #${SNAP} is saved)</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px">
          <div><div style="font:600 13px var(--f-display);color:var(--ink-2);margin-bottom:6px">Event log (append-only)</div><ol class="as-log" style="margin:0;padding-left:22px;font:12.5px/1.7 var(--f-mono)"></ol></div>
          <div><div style="font:600 13px var(--f-display);color:var(--ink-2);margin-bottom:6px">State built by replay</div><div class="as-state" style="border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface-2);padding:10px 12px;font:13px/1.8 var(--f-mono);color:var(--ink)"></div></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Events applied</span><strong class="as-applied"></strong></div>
          <div class="stat"><span>Started from</span><strong class="as-from"></strong></div>
        </div>
        <div class="calc-note as-enote"></div>`;
      const $ = c => el.querySelector(c);
      let proj = 0;
      el.querySelectorAll('.as-proj .chip').forEach(b => b.addEventListener('click', () => {
        proj = +b.dataset.p;
        el.querySelectorAll('.as-proj .chip').forEach(x => x.classList.toggle('on', x === b));
        upd();
      }));
      const upd = () => {
        const k = +$('.as-k').value, snap = $('.as-snap').checked && k >= SNAP;
        const fn = proj ? supportersView : balanceView;
        let state = {}, start = 0;
        if (snap) { for (let i = 0; i < SNAP; i++) state = fn(state, EV[i]); start = SNAP; }
        for (let i = start; i < k; i++) state = fn(state, EV[i]);
        if (!proj) state = balanceView(state, { t: 'none', amt: 0 }); // fill defaults when k = 0
        $('.as-vk').textContent = k ? '#' + k : '(nothing)';
        $('.as-log').innerHTML = EV.map((e, i) => {
          const done = i < k, fromSnap = snap && i < SNAP;
          const col = !done ? 'var(--ink-3)' : fromSnap ? 'var(--violet)' : 'var(--ink)';
          return `<li style="color:${col}">${done ? '✓' : '·'} ${e.t} <span style="color:var(--ink-3)">${e.d}</span></li>`;
        }).join('');
        if (proj) {
          const rows = Object.entries(state).sort((a, b) => b[1] - a[1]);
          $('.as-state').innerHTML = rows.length ? rows.map(([w, v], i) => `${i + 1}. ${w}: ${v}`).join('<br>') : '(no supporters yet)';
        } else {
          $('.as-state').innerHTML = `balance: <strong>${state.balance}</strong><br>tips received: ${state.tips} (${state.tipCount} tips)<br>refunded: ${state.refunds}<br>withdrawn: ${state.withdrawn}`;
        }
        $('.as-applied').textContent = (k - start) + ' / ' + k;
        $('.as-from').textContent = snap ? 'Snapshot #' + SNAP : 'Event 1 (empty state)';
        const notes = [];
        if (snap) notes.push(`We started from the snapshot, so only ${k - start} events had to be applied, not ${k}. In a log with millions of events, snapshots are what keep replay fast.`);
        if (proj) notes.push('This "Top supporters" read model never existed before. Because the full history is saved, write a new projection and replay the same events: the new feature is ready at once, even for old data. If only the current balance had been stored, "who gave how much" could never be known.');
        else notes.push(k === 4 ? 'Temporal query: after event #4 the balance was 30. In a normal table this old value would have been overwritten long ago.' : 'The balance is not stored anywhere: every time, it is the sum of the events. Move the slider to event #4: you get the answer to "what was the balance at that time?".');
        $('.as-enote').textContent = notes.join(' ');
      };
      $('.as-k').addEventListener('input', upd); $('.as-snap').addEventListener('change', upd); upd();
    }},

    { type: 'list', items: [
      `<strong>What you get:</strong> a full audit trail (who did what, when); the state at any past time ("temporal query"); new read models over old data (seen above); after a bug fix, replay again with the correct code. That is why it is natural for ledgers, payments, wallets and orders.`,
      `<strong>Snapshots:</strong> replaying 5 years of events every time is slow, so from time to time you save a photo of the state (a snapshot) and apply only the events after it.`,
      `<strong>Difficulties:</strong> changing the format of an event (you must still read 5-year-old events: "event versioning"); a query like "all users whose balance is > 1000 today" needs a separate read model (that is, CQRS) anyway; during a replay, emails/payments must not go out to the outside world again; and "delete this user's data" (privacy laws) is tricky in an append-only log.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>Event sourcing ≠ event-driven ≠ CQRS.</strong> Event-driven: services <em>talk</em> through events (their state can live in normal tables). Event sourcing: one service stores <em>its state itself</em> in the form of events. CQRS: separate read and write models. The three often appear together, but each one can work without the others. And putting events into Kafka is not event sourcing by itself.` },

    { type: 'h2', text: 'Serverless: the cloud worries about servers' },
    { type: 'p', html: `On xyz.com, after every upload there is a small job: making a thumbnail. On a normal day sometimes 10 uploads per minute, on the day of a cricket final 5,000. Should we run servers 24x7 for this, sitting empty most of the time? And what if they are not enough at the peak?` },
    { type: 'callout', tone: 'term', title: 'New word: Serverless / FaaS', html: `<strong>What it is:</strong> serverless does not mean there are no servers; it means <strong>you do not manage the servers</strong>. You only upload a function (a small piece of code). The cloud runs it on some event (an HTTP request, an S3 upload, a queue message), scales it from 0 to thousands of copies as needed, and you pay only for the time it runs. This form is also called <strong>FaaS (Function as a Service)</strong>: AWS Lambda, Google Cloud Run functions, Azure Functions.<br><strong>Why we need it:</strong> jobs like thumbnails run 10 times on some days and 5,000 times on others. No paying for empty servers, no shortage at the peak.<br><strong>Without it:</strong> 24x7 servers that mostly sit empty, or fall short at the peak.` },
    { type: 'callout', tone: 'term', title: 'New word: Cold start', html: `<strong>What it is:</strong> the function has not run for a while, or traffic grew and a new copy is needed. So the cloud first has to create a new environment (a small container): download the code, start the runtime, run your init code (DB connection, loading libraries). This extra delay on the first request is the <strong>cold start</strong>. After that the same environment is reused for a while: a <strong>warm start</strong>, with no extra delay.<br><strong>Why it matters:</strong> according to the AWS docs, cold starts usually happen in less than 1% of invocations, and can take from under 100 ms to more than 1 second. For a low-traffic API this can be very visible.<br><strong>Cure:</strong> <em>provisioned concurrency</em> (copies kept warm in advance; you pay whether requests come or not), a small package, light init code.` },
    { type: 'p', html: `When does a cold start hurt, and how much? <strong>Worked example:</strong> assume an idle environment is removed after 10 minutes (AWS does not guarantee the exact time; this is only an assumption of the simulator). If the function runs once every 20 minutes, <strong>every</strong> request is cold: 3 out of 3. If 5 requests arrive every minute, only the 5 in the first minute are cold, the other 295 are warm: 1.7%. If 40 requests suddenly arrive together, then besides the 2 warm copies, 38 new copies start cold. Pick a pattern and see:` },
      { type: 'custom', render(el) {
      const PAT = { rare: t => (t === 0 || t === 20 || t === 45 ? 1 : 0), steady: () => 5, spike: t => (t === 30 ? 40 : 2) };
      const NAME = { rare: 'Rare (every ~20 min)', steady: 'Steady (5 / min)', spike: 'Spike (40 at minute 30)' };
      const simulate = (pat, coldMs, P, idle) => {
        let envs = [], cold = 0, n = 0; const bars = [];
        for (let t = 0; t < 60; t++) {
          const c = PAT[pat](t); n += c;
          envs = envs.filter(x => t - x < idle);
          const need = Math.max(0, c - P), reuse = Math.min(need, envs.length), k = need - reuse;
          envs.sort((x, y) => y - x); for (let i = 0; i < reuse; i++) envs[i] = t;
          for (let i = 0; i < k; i++) envs.push(t);
          cold += k; bars.push([c, k]);
        }
        const warmMs = 30, avg = n ? (cold * (coldMs + warmMs) + (n - cold) * warmMs) / n : 0;
        return { n, cold, pct: n ? 100 * cold / n : 0, avg, bars };
      };
      let pat = 'steady';
      el.innerHTML = `<div class="chips sl-c" role="group" aria-label="Traffic pattern">${Object.keys(NAME).map(k => `<button type="button" class="chip${k === pat ? ' on' : ''}" data-p="${k}">${NAME[k]}</button>`).join('')}</div>
        <div class="row2" style="margin-top:8px"><div><label>Cold start delay: <strong class="sl-cv"></strong></label><input class="sl-cold" type="range" min="100" max="2000" step="100" value="800"></div>
        <div><label>Provisioned (always warm) copies: <strong class="sl-pv"></strong></label><input class="sl-p" type="range" min="0" max="10" step="1" value="0"></div></div>
        <svg class="sl-svg" viewBox="0 0 340 90" style="width:100%;max-width:560px;display:block;margin:8px 0" role="img" aria-label="Requests per minute, cold starts in red"></svg>
        <div class="stats"><div class="stat"><span>Requests (60 min)</span><strong class="sl-n"></strong></div><div class="stat"><span>Cold starts</span><strong class="sl-k"></strong></div><div class="stat"><span>Average latency</span><strong class="sl-a"></strong></div></div>
        <div class="calc-note sl-note"></div>`;
      const q = c => el.querySelector(c);
      const upd = () => {
        const coldMs = +q('.sl-cold').value, P = +q('.sl-p').value, r = simulate(pat, coldMs, P, 10);
        q('.sl-cv').textContent = coldMs + ' ms'; q('.sl-pv').textContent = P;
        el.querySelectorAll('.sl-c .chip').forEach(c => c.classList.toggle('on', c.dataset.p === pat));
        q('.sl-svg').innerHTML = r.bars.map(([c, k], t) => { const h = c / 40 * 70, hk = k / 40 * 70, x = 6 + t * 5.5;
          return (c ? `<rect x="${x}" y="${80 - Math.max(h, 2)}" width="4" height="${Math.max(h, 2)}" fill="var(--accent)"/>` : '') + (k ? `<rect x="${x}" y="${80 - Math.max(hk, 2)}" width="4" height="${Math.max(hk, 2)}" fill="var(--red)"/>` : ''); }).join('')
          + `<line x1="4" y1="80" x2="336" y2="80" stroke="var(--line-2)"/><text x="4" y="89" font-size="8" fill="var(--ink-3)">minute 0</text><text x="336" y="89" font-size="8" text-anchor="end" fill="var(--ink-3)">60</text>`;
        q('.sl-n').textContent = r.n; q('.sl-k').textContent = r.cold + ' (' + r.pct.toFixed(1) + '%)'; q('.sl-a').textContent = r.avg.toFixed(1) + ' ms';
        q('.sl-note').textContent = (r.pct > 50 ? 'Low traffic: the environment goes cold every time, so almost every user sees a cold start. ' : r.pct > 5 ? 'At the spike, new copies start cold. ' : 'With steady traffic the copies stay warm; cold starts only at the beginning. ')
          + (P ? P + ' provisioned copies are warm 24x7: you pay for them even when no request comes.' : 'Red = requests with a cold start, blue = warm.');
      };
      q('.sl-c').addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-p]'); if (b) { pat = b.dataset.p; upd(); } });
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'table', head: ['AWS Lambda limit (official docs, 2026)', 'Value', 'Effect on design'], rows: [
      ['Max run time per invocation', '15 minutes (900 s)', 'Long video transcoding cannot run in one function directly; split it into pieces or use containers'],
      ['Memory', '128 MB to 10,240 MB', 'CPU grows with memory; a heavy ML model is hard'],
      ['Request/response payload (sync)', '6 MB each', 'Big files do not go through the function; send them straight to S3 with a pre-signed URL'],
      ['Concurrent executions (default, per region)', '1,000 (can be raised)', 'Throttling can happen on a spike; DB connections can also fill up'],
      ['/tmp disk', '512 MB to 10,240 MB', 'It is temporary; always keep state outside (S3/DB)'],
    ], caption: 'Numbers from the AWS Lambda quotas page; cloud limits keep changing, so check the current docs when you design.' },
    { type: 'list', items: [
      `<strong>Good fit:</strong> spiky or low traffic, small jobs that run on events (thumbnails, webhooks, cron jobs, "glue" code), a new product with no ops team.`,
      `<strong>Bad fit:</strong> constant heavy traffic (the bill for a function running every second can be higher than a reserved server), very low-latency APIs (cold starts), long jobs, or where functions pass lots of data back and forth.`,
      `<strong>You must stay stateless:</strong> you cannot rely on memory between two invocations; watch DB connections (a thousand copies = a thousand connections, so use a connection proxy/pooler).`,
    ]},
    { type: 'callout', tone: 'why', title: 'Real example: the Prime Video monitoring service (March 2023)', html: `In 2023, a team at Amazon Prime Video wrote on its tech blog that their <strong>audio/video quality monitoring</strong> service (which finds glitches in streams) was first built as a distributed system on AWS Step Functions + Lambda + S3. The in-between data of every video frame went into S3, and every step was a Step Functions state transition. This design hit its limits at only ~5% of the expected load and was expensive. They put all the components into <strong>one process</strong> (containers on ECS), data started passing through memory, and the infrastructure cost dropped by more than 90%. To go beyond the limit of one machine, they split the detectors across several ECS tasks. Note: this is the story of <em>one Prime Video service</em>, not all of Prime Video, and the lesson is not "serverless is bad" but "do not split components that send lots of data to each other across a network". (The original post now redirects; the InfoQ summary from May 2023 is in the sources.)` },

    { type: 'h2', text: 'Peer-to-peer (P2P)' },
    { type: 'p', html: `So far, every design had a server "in the middle". But think: two users are on a video call on xyz.com. Should every video frame go from Mumbai to the xyz.com server (say in Singapore) and then back to Pune? xyz.com pays the bandwidth bill, and the latency is higher. Can the two not talk directly?` },
    { type: 'callout', tone: 'term', title: 'New word: Peer-to-peer (P2P)', html: `<strong>What it is:</strong> every machine (a <strong>peer</strong>) is both a client and a server: it asks for data and also gives data to others. No central server carries all the data. Examples: <strong>BitTorrent</strong> (pieces of a big file downloaded from thousands of peers at once, while you also upload to others), <strong>WebRTC</strong> video calls (realtime lesson), and blockchains.<br><strong>Why we need it:</strong> the more users, the more capacity, because every new user also brings their own upload speed.<br><strong>Without it:</strong> all traffic goes through one central server: a big bandwidth bill, and everything slows down as users grow.` },
    { type: 'list', items: [
      `<strong>Benefits:</strong> more users, more capacity (every new peer also brings resources); lower central bandwidth cost; one server failing does not take everything down.`,
      `<strong>Difficulties:</strong> peers have to find each other (discovery often still needs a small central server: BitTorrent's tracker, WebRTC's signaling server); reaching devices behind NAT/firewalls (NAT = the home/office router that blocks incoming connections; STUN tells a device its public address, and many times the traffic must go through a TURN relay server anyway); peers can leave at any time (churn); trust (what if a peer sends bad data? that is why content hashes are checked); and control/moderation is hard.`,
      `<strong>When in system design:</strong> 1-on-1 calls, distributing big files (some companies spread software updates across their servers P2P style), or when the cost of a central server or a single point of failure must be removed. Group calls usually add a media server (SFU) in the middle, because one peer cannot send its video separately to 10 people.`,
    ]},
    { type: 'p', html: `How much difference does P2P make? A well-known formula (from the networking textbook by Kurose and Ross) gives the minimum time to deliver one file to N people. <strong>Client-server:</strong> the server must upload N copies, so time ≈ N × F / (server upload). <strong>P2P:</strong> every peer also uploads, so time ≈ N × F / (server upload + the sum of all peers' uploads). <strong>Worked example:</strong> a 1 GB game update (8 gigabits), 10,000 users, server upload 10 Gbps, each user's upload 10 Mbps and download 100 Mbps. Client-server: 10,000 × 8 / 10 = 8,000 s ≈ <strong>2.2 hours</strong>. P2P: 80,000 / (10 + 100) ≈ 727 s ≈ <strong>12 minutes</strong>. Try the sliders:` },
      { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Users (N): <strong class="pp-nv"></strong></label><input class="pp-n" type="range" min="0" max="5" step="1" value="3"></div>
        <div><label>File size: <strong class="pp-fv"></strong></label><input class="pp-f" type="range" min="1" max="20" step="1" value="1"></div></div>
        <div class="row2" style="margin-top:8px"><div><label>Server upload: <strong class="pp-sv"></strong></label><input class="pp-s" type="range" min="1" max="100" step="1" value="10"></div>
        <div><label>Upload of each user: <strong class="pp-uv"></strong></label><input class="pp-u" type="range" min="0" max="50" step="1" value="10"></div></div>
        <div class="stats"><div class="stat"><span>Client-server</span><strong class="pp-cs"></strong></div><div class="stat"><span>P2P</span><strong class="pp-p"></strong></div><div class="stat"><span>How much faster P2P is</span><strong class="pp-x"></strong></div></div>
        <div class="calc-note pp-note"></div>`;
      const NS = [10, 100, 1000, 10000, 100000, 1000000], D = 100, q = c => el.querySelector(c);
      const fmt = s => s < 120 ? s.toFixed(0) + ' s' : s < 7200 ? (s / 60).toFixed(0) + ' min' : (s / 3600).toFixed(1) + ' hours';
      const upd = () => {
        const N = NS[+q('.pp-n').value], Fgb = +q('.pp-f').value, F = Fgb * 8, us = +q('.pp-s').value, u = +q('.pp-u').value / 1000, d = D / 1000;
        const cs = Math.max(N * F / us, F / d), p2p = Math.max(F / us, F / d, N * F / (us + N * u));
        q('.pp-nv').textContent = N.toLocaleString('en-IN'); q('.pp-fv').textContent = Fgb + ' GB'; q('.pp-sv').textContent = us + ' Gbps'; q('.pp-uv').textContent = (u * 1000) + ' Mbps';
        q('.pp-cs').textContent = fmt(cs); q('.pp-p').textContent = fmt(p2p); q('.pp-x').textContent = (cs / p2p).toFixed(1) + '×';
        q('.pp-note').textContent = u === 0 ? 'The peers upload nothing: P2P is the same as client-server. The power of P2P is in the peers\' uploads.'
          : 'In client-server, time grows straight with the number of users. In P2P every new user also brings capacity, so the time stops at a limit (here the download speed of ' + D + ' Mbps is also a limit).';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'h2', text: 'Hexagonal architecture (ports and adapters), awareness' },
    { type: 'p', html: `This idea is at a different level from the other styles: it is not about the <em>boxes</em> of the system, but about <strong>how the code inside one service is organised</strong>. The problem: the business logic of the xyz.com Payments service ("a tip must be between 1 and 10,000, and the creator must be verified") is mixed right into Postgres queries and HTTP framework code. To test it you need a real DB; to change the DB you must also touch the logic.` },
    { type: 'callout', tone: 'term', title: 'New word: Hexagonal architecture (ports and adapters)', html: `<strong>What it is:</strong> an idea by Alistair Cockburn (2005). Keep the business logic in the middle. Talk to the outside world only through <strong>ports</strong>. A port = an interface, a "socket" with a fixed shape, like <code>WalletRepository</code> ("save/load the wallet") or <code>PaymentGateway</code>. Every technology is an <strong>adapter</strong> that fits into that socket: a Postgres adapter, an in-memory adapter for tests, an HTTP adapter, a Kafka adapter.<br><strong>Why we need it:</strong> the logic does not even know whether Postgres or a fake is behind it. Tests run in milliseconds without a DB, and to change the DB you only change the adapter.<br><strong>Without it:</strong> business rules mixed into SQL and HTTP code; a real DB for every test; touching the logic on every technology change.<br>The hexagon shape has no special meaning; it just shows "plug in from many sides".` },
    { type: 'ascii', text: `
   HTTP API ─┐                         ┌─ Postgres adapter
   (adapter) │    ┌───────────────┐    │
 Kafka event ┼──► │  Business     │ ◄──┼─ In-memory fake (tests)
   (adapter) │    │  logic (core) │    │
  Batch/CLI ─┘    │  ports:       │    └─ Stripe / bank adapter
                  │  WalletRepo   │
                  │  PaymentGw    │
                  └───────────────┘
   driving side (they drive the core)   driven side (the core drives them)`, caption: 'Dependencies point inwards: the core does not import any framework or DB.' },
    { type: 'p', html: `<strong>Worked example:</strong> the rule is "a tip must be between ₹1 and ₹10,000, and the creator must be verified". This rule is written once, in the core. Whether the request comes over HTTP, an event comes from Kafka, or a test is running: the same core function. Whether Postgres or an in-memory fake is behind it: not one line of the core changes. Swap the adapters on both sides below:` },
      { type: 'custom', render(el) {
      const DRV = { http: 'HTTP adapter: POST /tips', kafka: 'Kafka adapter: TipRequested event', test: 'Unit test: tipTest()' };
      const DRN = { pg: ['Postgres adapter', 4], mem: ['In-memory fake', 0.01], mongo: ['MongoDB adapter', 5] };
      let drv = 'http', drn = 'pg';
      el.innerHTML = `<div style="font:600 13px var(--f-display);color:var(--ink-2)">Driving side (who drives the core)</div><div class="chips hx-a" role="group" aria-label="Driving adapter">${Object.keys(DRV).map(k => `<button type="button" class="chip" data-d="${k}">${k === 'http' ? 'HTTP' : k === 'kafka' ? 'Kafka' : 'Test'}</button>`).join('')}</div>
        <div style="font:600 13px var(--f-display);color:var(--ink-2);margin-top:8px">Driven side (what the core drives)</div><div class="chips hx-b" role="group" aria-label="Driven adapter">${Object.keys(DRN).map(k => `<button type="button" class="chip" data-n="${k}">${DRN[k][0]}</button>`).join('')}</div>
        <div style="margin-top:8px"><label>Tip amount (₹): <strong class="hx-v"></strong></label><input class="hx-amt" type="range" min="0" max="12000" step="500" value="500"></div>
        <div class="ascii hx-trace" style="font-size:12.5px;white-space:pre-wrap;margin-top:8px"></div>
        <div class="stats"><div class="stat"><span>Core lines changed</span><strong>0</strong></div><div class="stat"><span>Storage time (about)</span><strong class="hx-t"></strong></div><div class="stat"><span>Result</span><strong class="hx-r"></strong></div></div>`;
      const q = c => el.querySelector(c);
      const draw = () => {
        const amt = +q('.hx-amt').value, ok = amt >= 1 && amt <= 10000;
        el.querySelectorAll('.hx-a .chip').forEach(c => c.classList.toggle('on', c.dataset.d === drv));
        el.querySelectorAll('.hx-b .chip').forEach(c => c.classList.toggle('on', c.dataset.n === drn));
        q('.hx-v').textContent = amt;
        q('.hx-trace').textContent = '1. ' + DRV[drv] + '\n2. core.sendTip(riya, ' + amt + ')   <- same code every time\n   rule: 1 <= amount <= 10000 && creator.verified\n3. ' + (ok ? 'port WalletRepository.save() -> ' + DRN[drn][0] : 'rule broken: it never reached save');
        q('.hx-t').textContent = ok ? DRN[drn][1] + ' ms' : '-';
        q('.hx-r').textContent = ok ? 'tip saved ✓' : 'rejected ✗';
      };
      el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.chip'); if (!b) return; if (b.dataset.d) drv = b.dataset.d; if (b.dataset.n) drn = b.dataset.n; draw(); });
      q('.hx-amt').addEventListener('input', draw); draw();
    }},
    { type: 'p', html: `In an interview, this is enough: "Inside every service, we keep the main domain logic separate from the infrastructure with ports/adapters, so the logic can be tested without a DB and changing the DB/queue is easy." Too many layers become a burden in a small service.` },

    { type: 'h2', text: 'All the styles at a glance' },
    { type: 'table', head: ['Style', 'In one line', 'When', 'When not'], rows: [
      ['Monolith', 'One deploy, one process, function calls', 'New product, small team', 'Many teams are blocking each other'],
      ['Modular monolith', 'One deploy, strict module boundaries inside', 'The default until it hurts; 1-5 teams', 'Parts must be scaled/deployed separately'],
      ['Microservices', 'Separate deploys, own DB, network calls', 'Many teams; parts scale very differently', 'Small team, domain not understood yet, weak ops'],
      ['Event-driven', 'Services announce "this happened"', 'Many reactions to one event, async work', 'The user needs an answer right away'],
      ['CQRS', 'Separate write and read models', 'Reads are very different/heavy (dashboards, search)', 'Simple CRUD'],
      ['Event sourcing', 'State = replay of events', 'Audit/history is essential: ledger, wallet, orders', 'Simple data, a new team'],
      ['Serverless', 'Upload a function, the cloud runs it', 'Spiky/small event-driven jobs', 'Steady heavy load, long/low-latency jobs'],
      ['P2P', 'Peers talk to each other directly', '1-on-1 calls, file distribution', 'Central control/consistency is essential'],
      ['Hexagonal', 'Logic separated from DB/framework by ports', 'Inside any service', 'Over-engineering in a small script'],
    ]},

    { type: 'h2', text: 'Recommender: what fits your case?' },
    { type: 'p', html: `Set the sliders for your situation. This widget follows the roadmap's Decide rule and gives a reason for every suggestion. In the real world it is a starting point, not a final decision.` },
      { type: 'custom', render(el) {
      const DEVS = [3, 8, 15, 30, 60, 120, 300];
      const LV = ['low', 'medium', 'high'];
      el.innerHTML = `<div class="row2">
          <div><label>Developers: <strong class="as-rd"></strong></label><input class="as-r-dev" type="range" min="0" max="6" step="1" value="1"></div>
          <div><label>Difference in scaling between parts: <strong class="as-rs"></strong></label><input class="as-r-sc" type="range" min="0" max="2" step="1" value="0"></div>
        </div>
        <div class="row2" style="margin-top:8px">
          <div><label>How well the domain is understood (clear boundaries?): <strong class="as-rc"></strong></label><input class="as-r-cl" type="range" min="0" max="2" step="1" value="0"></div>
          <div><label>Ops maturity (CI/CD, monitoring, tracing): <strong class="as-ro"></strong></label><input class="as-r-op" type="range" min="0" max="2" step="1" value="0"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px;color:var(--ink-2)"><input class="as-r-sp" type="checkbox"> Some side jobs have very spiky traffic (thumbnails, webhooks)</label>
        <div class="as-r-out" style="margin-top:12px;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:var(--r-sm);background:var(--surface);padding:12px 14px">
          <div class="as-r-rec" style="font:600 17px var(--f-display);color:var(--ink)"></div>
          <ul class="as-r-why" style="margin:8px 0 0;padding-left:20px;color:var(--ink-2);font-size:14px;line-height:1.6"></ul>
        </div>`;
      const $ = c => el.querySelector(c);
      const recommend = (devs, sc, cl, op, spiky) => {
        const teams = Math.ceil(devs / 8), why = [];
        let rec;
        why.push(`~${devs} developers ≈ ${teams} team${teams > 1 ? 's' : ''} (assuming 8 people per team).`);
        if (devs < 15) {
          rec = 'Monolith (keep it modular inside)';
          why.push('Small team: one deploy, one DB and function calls are the fastest road. The ops bill of microservices would be too heavy right now.');
          if (sc === 2) { rec += ' + a separate worker for the heavy part'; why.push('One part scales very differently: make only that part (like transcoding) a separate worker/service, keep the rest as a monolith.'); }
        } else if (devs < 60) {
          rec = 'Modular monolith';
          why.push('A few teams: module boundaries + ownership give enough freedom, without the bill of the network.');
          if (sc >= 1 && op >= 1) { rec += ' + pull out 1-2 services'; why.push('Pull out only the part that needs separate scaling or separate deploys.'); }
        } else if (cl === 0) {
          rec = 'Modular monolith (do not split yet)';
          why.push('There are many teams, but the domain boundaries are not clear yet. Split in the wrong place and every feature will need changes in 5 services: a distributed monolith. First make the boundaries solid as modules.');
        } else if (op === 0) {
          rec = 'Modular monolith, while working on ops';
          why.push('Microservices without CI/CD, monitoring and tracing is like driving in the dark. Build the platform first, then split.');
        } else {
          rec = 'Microservices (services by team)';
          why.push('Many teams that need independent deploys, clear boundaries, and ops ready: this is the microservices case of the Decide rule.');
          why.push("Conway's law: match service boundaries with team boundaries. Use events for async work, keep chains short.");
        }
        if (spiky) why.push('Serverless functions are a good fit for spiky side jobs (scale to zero, pay per use), whatever the main app is.');
        return { rec, why };
      };
      const upd = () => {
        const devs = DEVS[+$('.as-r-dev').value], sc = +$('.as-r-sc').value, cl = +$('.as-r-cl').value, op = +$('.as-r-op').value;
        $('.as-rd').textContent = devs; $('.as-rs').textContent = LV[sc]; $('.as-rc').textContent = LV[cl]; $('.as-ro').textContent = LV[op];
        const r = recommend(devs, sc, cl, op, $('.as-r-sp').checked);
        $('.as-r-rec').textContent = r.rec;
        $('.as-r-why').innerHTML = r.why.map(w => `<li>${w}</li>`).join('');
      };
      el.querySelectorAll('input').forEach(i => { i.addEventListener('input', upd); i.addEventListener('change', upd); }); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Small team, new product: modular monolith.</strong> <strong>Many teams that need to deploy independently, or parts that scale very differently (video transcoding vs user profiles): microservices.</strong> In between: a modular monolith, and pull out only the part that really needs to be separate. If many services must react to one event, event-driven; if heavy reads are very different, CQRS; if history/audit is the product itself, event sourcing; small spiky jobs on serverless.` },

    { type: 'diagram', title: 'The shape of xyz.com: the whole picture', height: 600,
      groups: [
        { label: 'Users', x: 20, y: 8, w: 680, h: 100 },
        { label: 'Services', x: 20, y: 240, w: 680, h: 100 },
        { label: 'Async + data', x: 20, y: 360, w: 680, h: 225 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya (app)', sub: 'creator', x: 120, y: 60, w: 140, kind: 'client', info: 'What it is: an xyz.com creator, on the phone app. She watches the feed, uploads videos, receives tips, and video-calls her fans.' },
        { id: 'arjun', label: 'Arjun (app)', sub: 'fan', x: 600, y: 60, w: 140, kind: 'client', info: 'What it is: a fan. On a video call with Riya, audio/video goes straight between the two phones (P2P, WebRTC), without xyz.com servers in the middle.' },
        { id: 'gw', label: 'API gateway', sub: 'auth, routing', x: 360, y: 170, w: 150, kind: 'edge', info: 'What it is: one front door for all requests. Login check, rate limit, and sending each request to the right place: the monolith, the recs service, the payments service or the dashboard.' },
        { id: 'mono', label: 'Modular monolith', sub: 'users, feed, comments', x: 170, y: 290, w: 180, kind: 'server', info: 'What it is: the main app of xyz.com. One deploy, with clean modules inside (Users, Feed, Comments, Upload) whose boundaries are checked by CI. Most features live here, because this is the simplest and cheapest.' },
        { id: 'recs', label: 'Recs service', sub: 'GPU, own scaling', x: 400, y: 290, w: 130, kind: 'server', info: 'What it is: a separate microservice for recommendations. It was pulled out because it needs GPU machines, is deployed many times a day, and scales very differently from the rest of the app.' },
        { id: 'pay', label: 'Payments svc', sub: 'tips, hexagonal', x: 590, y: 290, w: 150, kind: 'server', info: 'What it is: a separate service for tips and payouts (strict security audit). Hexagonal inside: business rules in the core, Postgres/bank only as adapters.' },
        { id: 'pg', label: 'Postgres', sub: 'monolith DB', x: 130, y: 410, w: 140, kind: 'data', info: 'What it is: the database of the monolith. Every module has its own tables; other modules ask for data only through the public interface.' },
        { id: 'kafka', label: 'Kafka', sub: 'events', x: 360, y: 410, w: 150, kind: 'queue', info: 'What it is: the event broker. Facts like "VideoUploaded" and "TipReceived" arrive here, and whoever cares listens. The producer does not know the consumers (event-driven).' },
        { id: 'elog', label: 'Wallet event log', sub: 'append-only', x: 590, y: 410, w: 150, kind: 'data', info: 'What it is: event sourcing for payments. Every tip, refund and withdrawal is an event; the balance is the replay of these events. Full history, audit, and new reports over old data.' },
        { id: 'thumb', label: 'Thumbnail fn', sub: 'serverless', x: 130, y: 530, w: 140, kind: 'server', info: 'What it is: a serverless function. It runs on VideoUploaded: thousands of copies at a spike, zero at night. You pay only while it runs.' },
        { id: 'dash', label: 'Dashboard', sub: 'CQRS read model', x: 360, y: 530, w: 150, kind: 'cache', info: 'What it is: the read model of the creator dashboard (CQRS). Ready-made numbers built from events, so dashboard queries do not crush the main DB. It can run a few seconds behind.' },
        { id: 'notif', label: 'Notifications', sub: 'consumer', x: 590, y: 530, w: 150, kind: 'server', info: 'What it is: the consumer that sends push notifications to followers. If it goes down, uploads are not affected; it catches up when it comes back.' },
      ],
      edges: [
        { a: 'riya', b: 'arjun', both: true, dashed: true, label: 'P2P video call' },
        { a: 'riya', b: 'gw', n: 1 },
        { a: 'gw', b: 'mono', n: 2, label: 'feed' },
        { a: 'gw', b: 'recs' },
        { a: 'gw', b: 'pay' },
        { a: 'mono', b: 'pg' },
        { a: 'mono', b: 'kafka', kind: 'evt', label: 'VideoUploaded' },
        { a: 'pay', b: 'elog' },
        { a: 'elog', b: 'kafka', kind: 'evt' },
        { a: 'kafka', b: 'thumb', kind: 'evt' },
        { a: 'kafka', b: 'dash', kind: 'evt' },
        { a: 'kafka', b: 'notif', kind: 'evt' },
        { a: 'gw', b: 'dash', label: 'dashboard query', via: [[485, 170], [485, 340], [485, 400], [485, 470]] },
      ],
      paths: [
        { name: 'Feed (monolith)', text: 'The feed request goes through the gateway to the modular monolith; inside, modules talk with function calls, one Postgres.', go: ['riya>gw>mono>pg'] },
        { name: 'Upload (events)', text: 'Upload done: the monolith sent a VideoUploaded event. The thumbnail function and notifications react by themselves.', go: ['riya>gw>mono>kafka', 'kafka>thumb', 'kafka>notif'] },
        { name: 'Tip (ES + CQRS)', text: 'The tip was written as an event in the Payments service (event sourcing). The event goes through Kafka to the dashboard read model; the dashboard query reads the read model (CQRS).', go: ['riya>gw>pay>elog>kafka>dash', 'gw>dash'] },
        { name: 'Video call (P2P)', text: 'The audio/video of the call goes straight between Riya and Arjun (WebRTC). The server only introduces the two (signaling).', go: ['riya>arjun'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Monolith = one deploy, function calls, one DB. The fastest for a new product and a small team. Dirty code is a separate problem.</li>
      <li>Modular monolith = one deploy, but strict module boundaries inside (checked by CI). The right default for most teams.</li>
      <li>Microservices = separate deploys, own DB, network calls. Benefit: independent teams and separate scaling. Price: latency, failures, distributed data, heavy ops. The availability of a chain multiplies.</li>
      <li>Conway's law: the system takes the shape of the teams. Service boundaries = team boundaries.</li>
      <li>Event-driven: announce "this happened"; consumers work at their own speed. Loose coupling, but eventual consistency.</li>
      <li>CQRS: separate write and read models; the read model runs a little behind. Event sourcing: state = replay of events; the full history.</li>
      <li>Serverless: upload a function, the cloud runs it, pay per use; cold starts and limits. P2P: every user is also a server; capacity grows with users.</li>
      <li>Hexagonal: core logic behind ports; change adapters, not logic. Decide: small team = modular monolith; many teams or very different scaling = microservices.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Monolith: simplicity, fast function calls, one ACID transaction, easy debugging', 'Modular monolith: ownership and clean boundaries without the bill of the network', 'Microservices: independent deploys, separate scaling, fault isolation (if designed for it)', 'Event-driven: loose coupling, new consumers without changing the producer, absorbs spikes', 'CQRS/event sourcing: fast read models, full history, new features through replay', 'Serverless: zero server management, scale to zero, pay per use'],
      costs: ['Monolith: one bug can take everything down, one deploy train, everything scales together', 'Microservices: network failures, latency adds up, distributed data, heavy ops', 'Event-driven: eventual consistency, the flow is hard to see, watch for duplicates/order', 'CQRS/event sourcing: syncing two models, event versioning, more concepts', 'Serverless: cold starts, time/memory limits, expensive under steady load, vendor lock-in', 'The wrong style at the wrong time: the biggest cost of all'] },

    { type: 'think', questions: [
      { q: 'Six xyz.com developers are building a new "short videos" product. A senior says "build 12 microservices from the start, splitting later will be hard". What would you say?', a: 'Start with a modular monolith. The domain is still changing, the boundaries will be wrong, and 6 people cannot handle 12 pipelines/dashboards/on-call rotas. Keep clean interfaces and separate tables between modules, so that later a module (like transcoding) can easily become a service. For heavy async work, one queue + worker is enough.' },
      { q: 'A feed request passes through a chain of 6 services, each 99.9% available. The product manager wants 99.9%. What will you do?', a: 'The availability of the chain is ~0.999^6 ≈ 99.4%, below the target. Options: (1) make calls that are not essential async, or remove them, (2) turn sequential calls into parallel ones where possible, (3) timeout + fallback for non-critical parts (recs, counts), so their failure does not fail the whole request, (4) make critical services more redundant, (5) cached/precomputed data.' },
      { q: 'The xyz.com "export my data" function runs only 5-10 times a day, and the user can wait up to 2 seconds. Is serverless right? What about cold starts?', a: 'Yes, a good fit: low and spiky traffic, so running a server 24x7 is a waste. Almost every call will be cold (the environment goes cold), but a cold start (~100 ms to 1 s) fits in the 2-second budget. Paying for provisioned concurrency is a waste here. If the user needed an answer in 100 ms, we would think again.' },
      { q: 'Riya\'s wallet shows a wrong amount. How is debugging different in a normal CRUD design and an event-sourced design?', a: 'In CRUD there is only the current balance; you have to find when and how it went wrong using logs. In event sourcing there is the full event log: replay it to find after which event the error appeared. If the bug was in the code, fix it and replay; if the data was wrong, write a correcting event (like a refund/adjustment); old events are never edited.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the most correct definition of a monolith?', options: ['Old, dirty code', 'An app that is built and deployed together, where every copy has all the features', 'An app that runs on one server and cannot scale'], answer: 1, explain: 'A monolith is a deployment decision. Many identical copies of it can scale behind a load balancer; dirty code is a separate design problem.' },
      { q: 'What is the biggest real benefit of microservices?', options: ['Everything becomes fast by itself', 'Many teams can deploy independently and parts can scale separately', 'Network calls are faster than function calls'], answer: 1, explain: 'Network calls are slow and unreliable. The benefit is organisational (independent teams/deploys) and about different scaling profiles.' },
      { q: 'A chain of 5 services, each 99.9% available. The whole chain is about?', options: ['99.9%', '99.5%', '95%'], answer: 1, explain: '0.999^5 ≈ 0.995. Availability multiplies along a chain, so every new synchronous dependency adds risk.' },
      { q: 'With event sourcing, how is a new "Top supporters" report built over old data?', options: ['It cannot be built for old data', 'Write a new projection and replay all the old events', 'Edit the events to add new fields'], answer: 1, explain: 'The full history is saved, so a new read model is built by replaying from the start. Events are never edited.' },
      { q: 'What is the right lesson from the Prime Video monitoring service (2023)?', options: ['Serverless is always expensive', 'Splitting components that send lots of data to each other across a network can cause cost and limit problems', 'Amazon shut down all its microservices'], answer: 1, explain: 'It was the case of one service. Frames moved through S3 and Step Functions transitions; bringing it into one process kept the data in memory and cut the cost by 90%+.' },
      { q: 'Right after sending a tip in CQRS, the dashboard showed the old total. What happened?', options: ['A bug: the write failed', 'The read model has not been updated from the events yet (lag); eventual consistency', 'The database got corrupted'], answer: 1, explain: 'The write model saved at once, but the read model is updated after the events arrive. A lag of a few seconds is the normal price of CQRS.' },
      { q: 'A serverless function runs once every 20 minutes. What will most requests be like?', options: ['Warm, because the function is small', 'Cold, because the environment is removed in between', 'Never cold'], answer: 1, explain: 'After a long idle gap the environment is not reused, so each request needs a new environment: a cold start.' },
      { q: 'In hexagonal architecture, Postgres must be replaced with MongoDB. What changes?', options: ['The business logic core', 'Only the storage adapter (the port stays the same)', 'The HTTP API'], answer: 1, explain: 'The core only knows the port (interface). Write a new adapter that implements the same port; not one line of the core changes.' },
      { q: 'According to Conway\'s law, what should you watch for when designing microservices?', options: ['One service per developer', 'Service boundaries should match team boundaries', 'Every service in a different language'], answer: 1, explain: 'The shape of the system ends up like the communication of the organisation. One service = one owning team, a clean interface.' },
    ]},

      { type: 'sources', note: 'Company posts are a picture of their time (Shopify 2019, Prime Video 2023); their systems may have changed since then. Cloud limits were taken from the current AWS docs (2026).', items: [
      { title: 'Microservices', publisher: 'James Lewis and Martin Fowler, martinfowler.com', year: 2014, official: true, url: 'https://martinfowler.com/articles/microservices.html', used: 'Definition and characteristics of microservices (business capabilities, independent deploy, decentralised data, design for failure), Conway\'s law reference, monolith scaling/deploy issues.' },
      { title: 'MonolithFirst', publisher: 'Martin Fowler, martinfowler.com', year: 2015, official: true, url: 'https://martinfowler.com/bliki/MonolithFirst.html', used: 'Successful microservice stories mostly started as monoliths; greenfield microservices often ran into trouble; boundaries need domain knowledge.' },
      { title: 'Deconstructing the Monolith: Designing Software that Maximizes Developer Productivity', publisher: 'Shopify Engineering (Kirsten Westeinde)', year: 2019, official: true, url: 'https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity', used: 'Modular monolith definition, reasons for not choosing microservices, reorganising ~6,000 classes into business-domain components, Wedge tool for boundary violations.' },
      { title: 'Prime Video Switched from Serverless to EC2 and ECS to Save Costs', publisher: 'InfoQ', year: 2023, url: 'https://infoq.com/news/2023/05/prime-ec2-ecs-saves-costs', used: 'Summary of the March 2023 Prime Video tech blog post (original URL now redirects): VQA monitoring service on Step Functions + Lambda + S3, ~5% of expected load, single-process ECS redesign, 90% cost reduction, applies to one service.' },
      { title: 'CQRS', publisher: 'Martin Fowler, martinfowler.com', year: 2011, official: true, url: 'https://martinfowler.com/bliki/CQRS.html', used: 'Definition, Greg Young origin, warning that CQRS adds risky complexity for most systems, use per bounded context, eventual consistency.' },
      { title: 'Event Sourcing', publisher: 'Martin Fowler, martinfowler.com', year: 2005, official: true, url: 'https://martinfowler.com/eaaDev/EventSourcing.html', used: 'Event log as source of truth, complete rebuild, temporal query, replay, snapshots, external systems during replay.' },
      { title: 'Lambda quotas', publisher: 'AWS Lambda Developer Guide', official: true, url: 'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html', used: '15-minute timeout, 128-10,240 MB memory, 6 MB sync payload, 1,000 default concurrency, /tmp 512-10,240 MB.' },
      { title: 'Understanding the Lambda execution environment lifecycle', publisher: 'AWS Lambda Developer Guide', official: true, url: 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html', used: 'Init phase, cold vs warm start, cold starts typically under 1% of invocations and under 100 ms to over 1 s, provisioned concurrency.' },
      { title: 'How Do Committees Invent?', publisher: 'Melvin E. Conway, Datamation', year: 1968, url: 'https://www.melconway.com/Home/Committees_Paper.html', used: 'Original statement of Conway\'s law (system structure mirrors the organisation\'s communication structure).' },
      { title: 'Computer Networking: A Top-Down Approach (P2P file distribution)', publisher: 'James Kurose and Keith Ross', url: 'https://gaia.cs.umass.edu/kurose_ross/index.php', used: 'Minimum distribution time formulas for client-server vs P2P used in the calculator.' },
      { title: 'Hexagonal Architecture', publisher: 'Alistair Cockburn', year: 2005, official: true, url: 'https://alistair.cockburn.us/hexagonal-architecture/', used: 'Intent of ports and adapters: drive the app from users, tests or scripts and develop it in isolation from devices and databases.' },
    ]},
  ],
});
