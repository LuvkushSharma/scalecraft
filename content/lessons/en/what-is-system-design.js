Lesson.register({
  id: 'what-is-system-design',
  title: 'What is system design?',
  minutes: 18,
  summary: `System design means deciding which "boxes" sit behind an app (servers, databases, caches) and how data flows between them. It is the plan you make before you write code.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You open an app on your phone and the page appears right away. This is not magic. Far away, many computers are working together to do your task.<br><br>This lesson answers one question: <strong>how many computers do we need, what does each one do, and how do they talk to each other?</strong> That plan is called system design.` },

    { type: 'h2', text: 'A simple definition' },
    { type: 'p', html: `When you open xyz.com, you see just one page. But behind it, several computers are working. Each computer has its own job.` },
    { type: 'callout', tone: 'term', title: 'New word: System design', html: `<strong>What it is:</strong> the plan for the computers behind an app. Which parts we need, what each part does, and how data moves from one part to another.<br><strong>Why we need it:</strong> the same setup does not work for 10 people and for 10 million people. You have to make the plan first.<br><strong>Without it:</strong> the app works for a small crowd, but becomes slow or stops when many people arrive. Data can also get lost.` },
    { type: 'callout', tone: 'analogy', html: `Before a house is built, an architect draws a plan: how many rooms, where the pipes go, where the lights go. Laying bricks comes later. System design is that plan. Writing code is laying the bricks.` },
    { type: 'p', html: `In a diagram we draw each part as a <strong>box</strong>. The <strong>arrows</strong> between boxes show which way a request travels. But what do these boxes look like in real life? Look below.` },
    { type: 'image', src: 'assets/img/what-is-system-design/server-room-cern.jpg', alt: 'A large data center room with long rows of metal cabinets (server racks)', caption: 'Every "box" in a diagram is, in real life, a computer inside cabinets like these. A room like this is called a data center (this photo is from CERN in Geneva). Big apps have many data centers.', credit: { text: 'Florian Hirzinger, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:CERN_Server_03.jpg', license: 'CC BY-SA 3.0' } },

    { type: 'h2', text: 'First, meet the 5 boxes' },
    { type: 'p', html: `Almost every big app uses these same 5 boxes again and again. For now, just learn their names and jobs. Each one gets a full lesson later.` },
    { type: 'callout', tone: 'term', title: 'New word: Request and Response', html: `<strong>What it is:</strong> a <em>request</em> is a question your phone or browser sends, like "give me the homepage". The <em>response</em> is the answer, like the homepage content.<br><strong>Why we need it:</strong> all work on the internet happens through this question and answer.<br><strong>Example:</strong> you open a photo on xyz.com. One request goes out, one response (the photo) comes back.` },
    { type: 'callout', tone: 'term', title: 'Box 1: Server', html: `<strong>What it is:</strong> a computer, like your laptop, that stays on 24 hours a day and is connected to the internet. Your code (the app's logic) runs on it.<br><strong>Why we need it:</strong> something must receive the request, do the work (like checking a login), and send the response.<br><strong>Without it:</strong> the app has no brain. You send a request and nobody is there to listen.` },
    { type: 'callout', tone: 'term', title: 'Box 2: Database', html: `<strong>What it is:</strong> a program that saves data permanently on <em>disk</em> and finds it again quickly. Users, posts and comments all live here.<br><strong>Why we need it:</strong> the server's memory (RAM) is temporary. When the server restarts, RAM is wiped clean.<br><strong>Without it:</strong> every account and post disappears on restart.<br><strong>Example:</strong> PostgreSQL, MySQL, MongoDB.` },
    { type: 'callout', tone: 'term', title: 'Box 3: Load Balancer', html: `<strong>What it is:</strong> a traffic police officer standing in front of the servers. It looks at each incoming request and hands it to one server.<br><strong>Why we need it:</strong> when one server is not enough, we add more servers. Someone has to decide which request goes to which server.<br><strong>Without it:</strong> all users land on the same server, or users have to pick a server themselves.` },
    { type: 'callout', tone: 'term', title: 'Box 4: Cache', html: `<strong>What it is:</strong> a small, very fast memory where we keep things that people ask for again and again. The data sits in <em>RAM</em>, so it is many times faster than a database on disk.<br><strong>Why we need it:</strong> 100,000 people view the trending posts. Asking the database every single time is wasted work.<br><strong>Without it:</strong> heavy load on the database, and everything gets slow.<br><strong>Example:</strong> Redis, the most popular cache software.` },
    { type: 'callout', tone: 'term', title: 'Box 5: CDN (Content Delivery Network)', html: `<strong>What it is:</strong> many small servers placed in cities around the world. They keep copies of images and videos.<br><strong>Why we need it:</strong> if the server is in Mumbai and the user is in America, every image has to travel halfway around the world. A CDN serves the copy that is near the user.<br><strong>Without it:</strong> images and videos are very slow for users who are far away.` },
    { type: 'callout', tone: 'term', title: 'Two more words: Bottleneck and SPOF', html: `<strong>Bottleneck:</strong> the part of a system that gets tired first and slows down the whole system. Like a narrow pipe that lets water out only slowly.<br><strong>SPOF (Single Point of Failure):</strong> one part whose failure brings down the whole system. If there is only one server, that server is a SPOF.` },

    { type: 'h2', text: 'How a website grows' },
    { type: 'p', html: `The diagram below tells the whole story of xyz.com. Press "Next step". Notice that every new box arrives <strong>only after a problem</strong>. Then run the other two scenarios: there, things break.` },
    { type: 'flow', title: 'xyz.com: from day 1 to 10 million users', height: 340,
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser / app', x: 80, y: 180, w: 120, kind: 'client', info: 'What it is: the people using xyz.com, from their browser or phone app. At first 10, later 10 million. Every user sends requests.' },
        { id: 'cdn', label: 'CDN', sub: 'images, videos', x: 250, y: 64, w: 130, kind: 'net', hidden: true, info: 'What it is: small servers spread around the world that keep copies of images and videos. Why: a user in Chennai gets the copy near Chennai, not the one in America. Its full lesson is in Phase 2.' },
        { id: 'lb', label: 'Load Balancer', sub: 'splits traffic', x: 250, y: 180, w: 140, kind: 'edge', hidden: true, info: 'What it is: a traffic police officer in front of the servers. It asks only one question: "which server should get this request?" Why: now there are several servers, and someone has to split the traffic.' },
        { id: 's1', label: 'Server 1', sub: 'code + data', x: 440, y: 120, w: 130, kind: 'server', meter: true, load: 10, info: 'What it is: the application server, the computer where your code runs. A request comes in, it runs the logic, and it sends a response. The meter shows how busy it is.' },
        { id: 's2', label: 'Server 2', sub: 'same code', x: 440, y: 250, w: 130, kind: 'server', meter: true, hidden: true, info: 'What it is: an exact copy of Server 1, with the same code. Why: two servers mean double the capacity, and if one fails the other keeps running.' },
        { id: 'cache', label: 'Cache', sub: 'Redis, in RAM', x: 630, y: 90, w: 130, kind: 'cache', hidden: true, info: 'What it is: fast memory (RAM) that keeps things people ask for again and again. Why: reading from RAM is many times faster than a database on disk, and the database gets a break.' },
        { id: 'db', label: 'Database', sub: 'permanent data', x: 630, y: 250, w: 130, kind: 'data', meter: true, hidden: true, info: 'What it is: the program that keeps data permanently on disk: users, posts, comments. Why: the data stays safe even when the server restarts.' },
      ],
      edges: [
        { a: 'users', b: 's1', id: 'direct' },
        { a: 'users', b: 'cdn' }, { a: 'users', b: 'lb' },
        { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' },
        { a: 's1', b: 'cache' }, { a: 's2', b: 'cache' },
        { a: 's1', b: 'db' }, { a: 's2', b: 'db' },
      ],
      scenarios: [{ name: 'The xyz.com journey', intro: 'Day 1: you built xyz.com. There is only one server. Press "Start".', steps: [
        { title: 'Day 1: a few users, one server', text: 'Everything is on one machine: the code and the data. For 10-20 users this is perfectly fine. Starting simple is the right way.', go: ['users>s1', 'res:s1>users'] },
        { title: 'Problem: the server restarted and the data vanished', text: 'The data was in the server\'s RAM. The restart wiped the RAM. <strong>Solution:</strong> keep the data in a separate Database that saves it permanently on disk.', show: ['db'], set: { s1: { sub: 'code only' } }, go: ['users>s1>db', 'res:db>s1>users'] },
        { title: 'Problem: 10,000 users arrived', text: 'One server has a limit: how much CPU (thinking power) and how much RAM it has. Look, the meter turned red. Requests are slow, and some fail. The server is now the <strong>bottleneck</strong>.', flood: { paths: ['users>s1'], n: 14 }, after: { s1: { load: 96, state: 'hot', sub: 'overloaded!' } } },
        { title: 'Solution: Load Balancer + Server 2', text: 'We added one more server (same code). In front, we placed a Load Balancer that decides which request goes to which server. The load is now split in half.', show: ['lb', 's2'], hide: ['direct'], set: { s1: { load: 50, state: '', sub: 'same code' }, s2: { load: 50 } }, flood: { paths: ['users>lb>s1', 'users>lb>s2'], n: 10 } },
        { title: 'Problem: the database is stressed on every request', text: 'Every page needs a question to the database. The database is now the new bottleneck (look at its meter).', set: { db: { load: 92, state: 'hot' } }, go: ['users>lb>s1>db', 'res:db>s1>lb>users'] },
        { title: 'Solution: Cache', text: 'Data that people ask for again and again (like trending posts) is kept in the cache, in RAM. Now most requests are answered by the cache itself. The database can relax.', show: ['cache'], set: { db: { load: 30, state: '' } }, go: ['users>lb>s1>cache', 'res:cache>s1>lb>users'], after: { cache: { state: 'hit' } } },
        { title: 'Problem: users from all over the world, slow images', text: 'The server is in India, the user is in America. Every image travels halfway around the world. <strong>Solution:</strong> a CDN, which keeps copies of images and videos on servers near the users.', show: ['cdn'], set: { cache: { state: '' } }, go: ['users>cdn', 'res:cdn>users'] },
        { title: 'This is the skeleton of every big system', text: 'Users → CDN / Load Balancer → Servers → Cache → Database. YouTube, Uber and ChatGPT all grow from this skeleton. In this course we will study each box separately, in detail.' },
      ]},
      { name: 'Server crash (SPOF)', intro: 'First there is only one server. It crashes. Then we see how two servers save us.', steps: [
        { title: 'Only one server, and it went down', text: 'The power went out, or a bug hit the code. The server stopped. The request got lost halfway.', show: ['db'], go: 'lost:users>s1', after: { s1: { state: 'down', sub: 'DOWN' } } },
        { title: 'The whole website is down', text: 'The database is fine, but nobody can reach it. One server = a <strong>SPOF</strong>. Users see an error.', focus: ['s1'], msg: 'Error: site can\'t be reached' },
        { title: 'Fix: two servers + a Load Balancer', text: 'Now there is a Load Balancer and also Server 2. The Load Balancer sees that Server 1 is not answering, so it sends every request to Server 2.', show: ['lb', 's2'], hide: ['direct'], go: ['users>lb>s2>db', 'res:db>s2>lb>users'], set: { s2: { load: 80 } } },
        { title: 'The site is up, a little slower', text: 'One server is now doing the work of two, so its load is higher. But the site did not go down. A new question: what if the Load Balancer itself fails? The answer is in the Load Balancer lesson.', focus: ['lb', 's2'] },
      ]},
      { name: 'Cache down', intro: 'All the boxes are in place. Suddenly the cache stops.', steps: [
        { title: 'The server asks the cache', text: 'A request arrives. The server checks the cache first, but the cache does not answer.', show: ['lb', 's2', 'cache', 'db'], hide: ['direct'], go: 'users>lb>s1>cache', after: { cache: { state: 'down', sub: 'DOWN' } } },
        { title: 'Every request hits the database', text: 'Now every request goes straight to the database. All the work the cache used to do easily has fallen on the database. Look at the meter.', flood: { paths: ['users>lb>s1>db', 'users>lb>s2>db'], n: 12 }, after: { db: { load: 97, state: 'hot', sub: 'heavy load!' } } },
        { title: 'The lesson', text: 'The data is safe, because the real data is in the database. But the site became slow. A cache is for speed, not for keeping data. That is why the database must be strong enough to survive for a while when the cache fails.', focus: ['db'] },
      ]}],
    },
    { type: 'callout', tone: 'mistake', html: `Beginners think a good design means more boxes. It is the opposite. Every box costs money, needs care, and can break. <strong>Rule: add a solution when the problem arrives, not before.</strong>` },

    { type: 'h2', text: 'Monolith: the right way to start' },
    { type: 'callout', tone: 'term', title: 'New word: Monolith', html: `<strong>What it is:</strong> the whole app in one program. Login, posts, search and payments all live in one codebase and are deployed together.<br><strong>Why we need it:</strong> at the start the team is small and features change fast. Building, testing and running one program is the easiest.<br><strong>Without it:</strong> if you split the app into 10 small programs (<em>microservices</em>) on day 1, you get network calls between them, separate deployments and hard debugging for no reason.` },
    { type: 'p', html: `A monolith is not "old" or "wrong". Many big companies started with a monolith and ran on it for years. You can also run many copies of a monolith behind a Load Balancer, like Server 1 and Server 2 in the diagram above.` },
    { type: 'compare',
      left: { title: 'When a monolith is fine', html: `• The team is small (1-15 people)<br>• The product is still being built and changes every day<br>• A few servers can handle the traffic<br>• You need to launch quickly` },
      right: { title: 'When it is time to split', html: `• Many teams block each other while working on the same code<br>• One part (like video processing) needs to scale very differently from the rest<br>• One small bug brings down the whole app<br>• Full lesson: "Architecture styles" (Phase 3)` },
    },

    { type: 'h2', text: 'HLD vs LLD' },
    { type: 'callout', tone: 'term', title: 'New word: HLD and LLD', html: `<strong>HLD (High-Level Design):</strong> the plan seen from far away. Which boxes (servers, database, cache, queue) exist and how the arrows run.<br><strong>LLD (Low-Level Design):</strong> zooming inside one box. Which classes and functions, and how the code will be written.` },
    { type: 'table', head: ['', 'High-Level Design (HLD)', 'Low-Level Design (LLD)'], rows: [
      ['What it decides', 'Which boxes (services, DB, cache, queue) and arrows', 'Classes, functions and code inside one box'],
      ['xyz.com example', '"Profile data will be cached in Redis and stored in PostgreSQL"', '"A getProfile() method in the UserService class"'],
      ['Who asks about it', 'System design interview, architecture review', 'Machine coding / OOP interview, code review'],
      ['This course', 'This is what we study', 'A separate topic'],
    ]},

    { type: 'h2', text: 'Functional vs non-functional requirements' },
    { type: 'p', html: `Before starting a design, we ask two kinds of questions. First: <em>what</em> will the app do? Second: <em>how well</em> will it do it?` },
    { type: 'callout', tone: 'term', title: 'New word: Requirements', html: `<strong>Functional requirement:</strong> what the app can do, meaning its features. "A user can publish a post."<br><strong>Non-functional requirement:</strong> how fast, how reliable and how big the app is. "The page opens in 200 ms." These are not features, they are qualities.` },
    { type: 'compare',
      left: { title: 'Functional: what will it do?', html: `For xyz.com:<br>• A user can sign up<br>• A user can publish a post<br>• A user can see other people\'s posts<br>• A user can search` },
      right: { title: 'Non-functional: how well?', html: `• The page opens in 200 ms (latency)<br>• It is up 99.9% of the time (availability)<br>• It handles 10 million users (scale)<br>• A post is never lost (durability)` },
    },
    { type: 'p', html: `Non-functional words come up in every interview. Here is the simple meaning of each, and which box helps with it:` },
    { type: 'table', head: ['Word', 'Simple meaning', 'xyz.com number', 'Which box helps'], rows: [
      ['Latency', 'How long one request takes to get an answer', 'Under 200 ms', 'Cache, CDN'],
      ['Availability', 'How much of the time the site is up', '99.9% = down about 8.8 hours a year', 'Many servers + Load Balancer'],
      ['Scale', 'How many users / requests it can handle', '10 million users a day', 'Load Balancer, more servers'],
      ['Durability', 'Saved data is never lost', '0 posts lost', 'Database (and its copies)'],
      ['Consistency', 'Everyone sees the same, latest data', 'Same like count for everyone', 'Database design (Phase 3)'],
      ['Cost', 'Monthly bill', '₹50,000 per month budget', 'Fewer boxes, the right size'],
    ], caption: '1 ms = one thousandth of a second. 200 ms = one fifth of a second.' },
    { type: 'callout', tone: 'why', html: `Functional requirements tell you <strong>which features</strong> to build. Non-functional requirements tell you <strong>which boxes</strong> to add. When you hear "10 million users", you should think of a Load Balancer and caching. This course builds exactly that skill.` },

    { type: 'h3', text: 'Try it: from requirements to boxes' },
    { type: 'p', html: `Change the number of users below and tick the requirements. The widget tells you which boxes xyz.com needs, and <em>why</em>. Notice how little you need for 50 users, and how much more for 10 million.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Users per day</label><select class="wsd-u">
            <option value="50">50</option><option value="10000">10,000</option><option value="1000000">1 million</option><option value="10000000" selected>10 million</option></select></div>
          <div class="wsd-checks" style="display:flex;flex-direction:column;gap:6px;font-size:14px">
            <label><input type="checkbox" class="wsd-g"> Users from all over the world</label>
            <label><input type="checkbox" class="wsd-m"> Lots of photos / videos</label>
            <label><input type="checkbox" class="wsd-a" checked> The site must not go down (99.9%+)</label>
            <label><input type="checkbox" class="wsd-r" checked> The same data is read again and again</label>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><span>Peak requests / second</span><strong class="wsd-rps"></strong></div>
          <div class="stat"><span>Servers needed</span><strong class="wsd-sv"></strong></div>
          <div class="stat"><span>Number of boxes</span><strong class="wsd-nb"></strong></div>
        </div>
        <div class="wsd-out" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
        <div class="calc-note">Estimate: each user makes about 20 requests a day. At the busiest time, traffic is 3 times the average. One simple server handles about 500 requests per second. The real number depends on the app; the method stays the same.</div>`;
      const q = s => el.querySelector(s);
      const row = (name, why, on) => `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid var(--line);border-radius:var(--r-sm);background:${on ? 'var(--surface-2)' : 'transparent'};opacity:${on ? 1 : 0.6}"><strong style="min-width:118px;color:${on ? 'var(--ink)' : 'var(--ink-3)'}">${on ? '✓' : '–'} ${name}</strong><span style="color:var(--ink-2);font-size:14px">${why}</span></div>`;
      const upd = () => {
        const users = Number(q('.wsd-u').value), G = q('.wsd-g').checked, M = q('.wsd-m').checked, A = q('.wsd-a').checked, R = q('.wsd-r').checked;
        const rps = users * 20 / 86400 * 3;
        let sv = Math.max(1, Math.ceil(rps / 500)); if (A) sv = Math.max(2, sv);
        const lb = sv >= 2, cache = R && rps >= 50, cdn = G || M;
        q('.wsd-rps').textContent = rps < 1 ? rps.toFixed(2) : Math.round(rps).toLocaleString('en-IN');
        q('.wsd-sv').textContent = sv;
        q('.wsd-nb').textContent = sv + 1 + (lb ? 1 : 0) + (cache ? 1 : 0) + (cdn ? 1 : 0);
        q('.wsd-out').innerHTML = [
          row('Server', sv === 1 ? 'One server is enough. The load is very low.' : `${sv} servers, because ${A && Math.ceil(rps / 500) < 2 ? 'if one fails, the other keeps running (availability).' : 'one server can only handle about 500 req/s.'}`, true),
          row('Database', 'Always needed: data must be saved permanently on disk.', true),
          row('Load Balancer', lb ? 'There are several servers, so something must split the traffic.' : 'There is only one server, nothing to split.', lb),
          row('Cache', cache ? 'The same data is read again and again and traffic is high. Protect the database.' : (R ? 'Traffic is so low that the database can handle it easily. Not needed yet.' : 'Different data is asked for every time, so a cache helps little.'), cache),
          row('CDN', cdn ? 'Photos/videos or faraway users: keep copies near the users.' : 'Users are nearby and there are few heavy files. Not needed yet.', cdn),
        ].join('');
      };
      el.querySelectorAll('select, input').forEach(i => i.addEventListener('input', upd));
      el.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', upd));
      upd();
    }},
    { type: 'p', html: `Try this: pick <strong>50 users</strong> and untick every box. Only <strong>Server + Database</strong> remain. With <strong>10 million users</strong> the peak is about 6,944 requests per second, which means about 14 servers, a Load Balancer and a cache. Same app, completely different design. That is why we ask about requirements first.` },

    { type: 'h2', text: 'How to read an architecture diagram' },
    { type: 'p', html: `Every lesson ends with one big diagram. Here are 5 simple rules for reading it:` },
    { type: 'steps', items: [
      { t: 'Box = one component', d: 'Each box is a computer or a program: a server, a database, a cache. The colour of the box shows its type (the Welcome page has a table of colours).' },
      { t: 'Arrow = the path of a request', d: 'An arrow shows who sends a request to whom. The request travels in the direction the arrow points. The answer comes back along the same path.' },
      { t: 'Number = order', d: 'If arrows have 1, 2, 3 written on them, that is the sequence. Step 1 happens first, then step 2.' },
      { t: 'Dashed line = "later" or "only sometimes"', d: 'A dashed arrow means this work does not happen right away with the request, or only happens in some cases.' },
      { t: 'Read from left to right', d: 'Users are usually on the left and data on the right. Follow one request with your finger from the users to the database. Then ask: what happens if this box fails?' },
    ]},

    { type: 'h2', text: 'Trade-off: every choice has a price' },
    { type: 'callout', tone: 'term', title: 'New word: Trade-off', html: `<strong>What it is:</strong> giving up one thing to get another. You added a cache and got speed, but you also got extra cost and the risk of "showing old data".<br><strong>Why it matters:</strong> in system design, no box comes for free. Every box gives something and takes something.` },
    { type: 'callout', tone: 'mistake', html: `System design has no single "right answer". Every choice is a <strong>trade-off</strong>: you get something and you pay something. A good designer is someone who can explain what they chose and <em>why</em>.` },

    { type: 'h2', text: 'Decide: which requirement matters most?' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Think of a cab booking app (like Uber, or "xyz Rides" from xyz.com).<br><strong>Functional:</strong> book a ride, see the driver live on a map, pay, rate the ride.<br><strong>Non-functional:</strong> availability (the app stays up), latency (booking in 2 seconds), scale (the evening rush), consistency (one driver is never given to two people).<br><strong>What would hurt most at 8 pm on a Saturday?</strong> Availability. App down = no rides = money lost right away and users lose trust, and people will open another app. That is why the design for extra servers at peak time and "if one fails, another takes over" comes first.` },

    { type: 'diagram', title: 'xyz.com: the whole picture at a glance', height: 490,
      groups: [
        { label: 'Users', x: 10, y: 140, w: 140, h: 120 },
        { label: 'Edge', x: 205, y: 30, w: 170, h: 380 },
        { label: 'Servers', x: 390, y: 150, w: 160, h: 330 },
        { label: 'Data', x: 565, y: 80, w: 150, h: 390 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'browser / app', x: 80, y: 200, w: 120, kind: 'client', info: 'What it is: the users of xyz.com, on a browser or a phone app. Every story starts here: a user sends a request.' },
        { id: 'cdn', label: 'CDN', sub: 'images, videos', x: 290, y: 90, w: 130, kind: 'net', info: 'What it is: small servers near the users that serve copies of photos and videos. Why it is here: heavy files should come from nearby, not from a faraway server.' },
        { id: 'lb', label: 'Load Balancer', sub: 'traffic police', x: 290, y: 320, w: 140, kind: 'edge', info: 'What it is: the traffic police in front of the servers. Why it is here: there are several servers, each request must go to a healthy one, and a failed server must be skipped.' },
        { id: 's1', label: 'Server 1', sub: 'monolith code', x: 470, y: 220, w: 130, kind: 'server', info: 'What it is: the computer where the code of xyz.com (one monolith) runs. Why it is here: it does the real work of a request: checking the login, creating a post, preparing the page.' },
        { id: 's2', label: 'Server 2', sub: 'same code', x: 470, y: 420, w: 130, kind: 'server', info: 'What it is: a copy of Server 1. Why it is here: double the capacity for more traffic, and the site keeps running if Server 1 fails.' },
        { id: 'cache', label: 'Cache', sub: 'Redis (RAM)', x: 640, y: 150, w: 120, kind: 'cache', info: 'What it is: a fast copy, kept in RAM, of data that people ask for again and again. Why it is here: less load on the database and faster answers.' },
        { id: 'db', label: 'Database', sub: 'PostgreSQL', x: 640, y: 420, w: 120, kind: 'data', info: 'What it is: the permanent home of the data, on disk. Why it is here: users, posts and comments must never be lost. Even if the cache is emptied, the real data is still here.' },
      ],
      edges: [
        { a: 'users', b: 'lb', n: 1, label: 'request' },
        { a: 'users', b: 'cdn', label: 'images', dashed: true },
        { a: 'lb', b: 's1', n: 2 },
        { a: 'lb', b: 's2' },
        { a: 's1', b: 'cache', n: 3 },
        { a: 's1', b: 'db', n: 4 },
        { a: 's2', b: 'cache' },
        { a: 's2', b: 'db' },
      ],
      paths: [
        { name: 'Page request', text: 'User → Load Balancer (1) → Server 1 (2) → the Cache first (3). If it is not in the cache, then the Database (4). The answer goes back the same way.', go: ['users>lb>s1>cache', 's1>db'] },
        { name: 'Photo / video', text: 'Heavy files come from the CDN, which is near the user. The server does not even notice.', go: ['users>cdn'] },
        { name: 'Server 1 down', text: 'The Load Balancer skips the failed Server 1. Requests go to Server 2. The site stays up.', go: ['users>lb>s2>cache', 's2>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>System design = which boxes, the job of each box, and how data flows between them. The plan before the code.</li>
      <li>5 basic boxes: Server (runs the code), Database (keeps data permanently), Load Balancer (splits traffic), Cache (fast copy), CDN (files near the users).</li>
      <li>Every box arrives because of a problem. No problem, no box.</li>
      <li>Starting with a monolith is right. Split it when it starts to hurt.</li>
      <li>HLD = boxes and arrows. LLD = the code inside one box.</li>
      <li>Functional = what it does. Non-functional = how fast, how often up, how big, how cheap.</li>
      <li>Every choice is a trade-off. If you can explain "why", that is good design.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['More boxes = you can handle more users (scale)', 'Copies (2 servers) = the site stays up even if one fails', 'Cache and CDN = faster pages and images', 'Planning first = less breaking and rebuilding later'], costs: ['Every box costs money (server rent)', 'Every box is one more thing that can break', 'More boxes = harder to understand and debug', 'Cache = risk of showing old data'] },

    { type: 'think', questions: [
      { q: 'Only 50 people visit xyz.com. Should we add a Load Balancer and a Cache?', a: 'No. One server can easily handle 50 users. Extra components mean extra cost, extra things that can break, and extra complexity. Rule: add a solution when the problem arrives, not before. (Pick 50 users in the widget and see.)' },
      { q: 'In the diagram, which two problems did adding a Load Balancer solve?', a: '1) Capacity: the load was split across two servers. 2) Reliability: now if one server fails, the other keeps running (the "Server crash" scenario). But notice: the Load Balancer is now a new box that can fail. Its solution is in the Load Balancer lesson.' },
      { q: 'Write 4 functional and 4 non-functional requirements for a video app (like xyz TV). On the night of the IPL final, which non-functional requirement would hurt most?', a: 'Functional: watch a video, search, create an account, buy a subscription. Non-functional: availability, latency (the video starts quickly), scale (tens of millions of people at once), cost (sending video is expensive). On the night of the final, availability and scale matter most: if the app goes down, tens of millions of people are upset, and that night will not come again.' },
    ]},
    { type: 'quiz', questions: [
      { q: '"The page should open in 200 ms" is which type of requirement?', options: ['Functional', 'Non-functional', 'LLD'], answer: 1, explain: 'This is not a feature, it is a quality: how fast the system is. Latency, availability, scale and durability are all non-functional.' },
      { q: 'The data of xyz.com vanished when the server restarted. What was missing?', options: ['Load Balancer', 'A Database that keeps data on disk', 'CDN'], answer: 1, explain: 'The server\'s memory (RAM) is temporary. Permanent data needs a Database that writes to disk.' },
      { q: 'Which component decides "which server should this request go to?"', options: ['Cache', 'CDN', 'Load Balancer'], answer: 2, explain: 'That is the one job of a Load Balancer. A cache keeps a fast copy, and a CDN keeps files near the users.' },
      { q: 'The cache stopped working. What happens?', options: ['All the data is gone forever', 'The site gets slow because all the load goes to the database', 'Nothing, a cache has no real job'], answer: 1, explain: 'A cache is only a fast copy. The real data is safe in the database. But now every request goes to the database, so its load rises and the site gets slow.' },
      { q: 'A new startup has 3 developers and must build its first version. What is the smartest start?', options: ['20 microservices from day 1', 'One monolith, one server and one database', 'A CDN in 5 countries first'], answer: 1, explain: 'A monolith is the fastest to build, test and run. Add new boxes only when a problem arrives.' },
    ]},
  ],
});
