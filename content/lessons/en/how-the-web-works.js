Lesson.register({
  id: 'how-the-web-works',
  title: 'You typed xyz.com. How did the page appear?',
  minutes: 25,
  summary: `You type xyz.com and press Enter, and the page appears in less than a second. In between, DNS, IP addresses, TCP, TLS, HTTP, the server, the database and the browser's rendering all work in a line. This lesson opens up that whole journey, step by step.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Your browser is a messenger. You say "show me xyz.com". First the messenger must find out <em>where</em> xyz.com lives. Then it must go there and knock on the door, agree on a secret code, ask clearly for what it wants, and turn whatever it gets into a nice page for you.<br><br>In this lesson we walk with this messenger, step by step. Each step has a name, and those same names appear in the rest of the course.` },

    { type: 'h2', text: 'The simplest architecture' },
    { type: 'ascii', text: `
Browser  ──────────>  Server
  (you)               (the computer of xyz.com)` },
    { type: 'callout', tone: 'term', title: 'New word: Browser (client)', html: `<strong>What it is:</strong> the app you use to open websites: Chrome, Safari, Firefox. In system design it is called the <em>client</em>, meaning "the one who asks".<br><strong>Why we need it:</strong> it turns what you type (the URL) into computer language, fetches things from the server, and turns them into a page.<br><strong>Without it:</strong> you would have to ask the server for raw text yourself and read it.` },
    { type: 'callout', tone: 'term', title: 'New word: Server', html: `<strong>What it is:</strong> just a computer, like your laptop. The difference is that it stays on 24x7, is connected to the internet, and its job is to send a response when a request arrives.<br><strong>Why we need it:</strong> the files, code and data of xyz.com must be kept somewhere that everyone can reach.<br><strong>Without it:</strong> the website has no home. If your laptop is switched off, the site is gone too.` },
    { type: 'image', src: 'assets/img/how-the-web-works/server-rack.jpg', alt: 'A rack in a data center with many thin server computers stacked on top of each other, with blue lights and cables in front', caption: 'This is what real servers look like: thin computers stacked in a cabinet (a rack). These are servers that run Wikipedia. No screen or keyboard, just network cables.', credit: { text: 'Victor Grigas, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Wikimedia_Foundation_Servers-8055_35.jpg', license: 'CC BY-SA 3.0' } },

    { type: 'h2', text: 'Problem: computers understand numbers, not names' },
    { type: 'callout', tone: 'term', title: 'New word: IP address', html: `<strong>What it is:</strong> a number address for every computer on the internet, like <code>203.0.113.10</code>. It is like a postal code plus a house number.<br><strong>Why we need it:</strong> to send data, you must know <em>where</em> to send it. Internet routers only understand these numbers.<br><strong>Without it:</strong> data cannot find its way. Full lesson: "IP addresses and ports".` },
    { type: 'callout', tone: 'term', title: 'New word: Domain name', html: `<strong>What it is:</strong> a human-friendly name for an IP, like <code>xyz.com</code>.<br><strong>Why we need it:</strong> <code>203.0.113.10</code> is hard to remember, <code>xyz.com</code> is easy. And if the server changes (a new IP), the name can stay the same.<br><strong>Without it:</strong> you would have to remember a number for every site, like phone numbers.` },
    { type: 'callout', tone: 'term', title: 'New word: DNS (Domain Name System)', html: `<strong>What it is:</strong> the phonebook of the internet. You give it a name (<code>xyz.com</code>), and it tells you the number (<code>203.0.113.10</code>).<br><strong>Why we need it:</strong> the browser has a name, but it needs a number to connect. DNS links the two.<br><strong>Without it:</strong> typing a name is useless. The browser would not know where to go.` },

    { type: 'h2', text: 'The parts of a URL' },
    { type: 'callout', tone: 'term', title: 'New word: URL', html: `<strong>What it is:</strong> the full address you type in the address bar, like <code>https://www.xyz.com/videos?page=2</code>. It holds more than just the name.<br><strong>Why we need it:</strong> it tells the browser which method to use (https), which computer (www.xyz.com), which thing on that computer (/videos), and some extra details (page=2).<br><strong>Example:</strong> type your own URL in the widget below.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Type a URL (or change this one)</label>
        <input type="text" class="hw-url" value="https://www.xyz.com/videos?page=2#comments" style="width:100%;font-family:var(--f-mono);font-size:14px;padding:8px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface);color:var(--ink)">
        <div class="hw-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"></div>
        <div class="hw-out" style="display:flex;flex-direction:column;gap:6px"></div>
        <div class="calc-note">The port is shown only when it is written in the URL. If it is not written, the default is 443 for https and 80 for http.</div>`;
      const q = s => el.querySelector(s);
      const parts = u => {
        let x; try { x = new URL(u.trim()); } catch (e) { return null; }
        const port = x.port || (x.protocol === 'https:' ? '443' : x.protocol === 'http:' ? '80' : '?');
        return [
          ['Scheme', x.protocol.replace(':', ''), x.protocol === 'https:' ? 'Method: https = the data travels locked (encrypted). Nobody in the middle can read it. TLS puts on this lock; we will see it below.' : 'Method: http = no encryption. Browsers today call this "Not secure".', 'var(--green)'],
          ['Host (domain)', x.hostname, 'Which computer. DNS will turn this name into an IP.', 'var(--accent)'],
          ['Port', port + (x.port ? '' : ' (default)'), 'Which door (program) on that computer. A web server usually listens on 443.', 'var(--violet)'],
          ['Path', x.pathname, 'Which thing you want from the server. "/" means the homepage.', 'var(--amber)'],
          ['Query', x.search || '(empty)', 'Extra details, as key=value. For example, page=2 means the second page.', 'var(--ink-2)'],
          ['Fragment', x.hash || '(empty)', 'The part after # never goes to the server. The browser uses it to scroll to the right spot on the page.', 'var(--ink-3)'],
        ];
      };
      const upd = () => {
        const p = parts(q('.hw-url').value);
        if (!p) { q('.hw-chips').innerHTML = ''; q('.hw-out').innerHTML = '<div style="color:var(--red)">This does not look like a valid URL. Start it with https://</div>'; return; }
        q('.hw-chips').innerHTML = p.map(([k, v, , c]) => `<span style="font-family:var(--f-mono);font-size:13px;padding:3px 8px;border-radius:999px;border:1.5px solid ${c};color:var(--ink)">${v.replace(/</g, '&lt;')}</span>`).join('');
        q('.hw-out').innerHTML = p.map(([k, v, why, c]) => `<div style="display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 10px;border-left:4px solid ${c};background:var(--surface-2);border-radius:var(--r-sm)"><strong style="min-width:110px">${k}</strong><code>${v.replace(/</g, '&lt;')}</code><span style="flex-basis:100%;color:var(--ink-2);font-size:14px">${why}</span></div>`).join('');
      };
      q('.hw-url').addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'How data really travels' },
    { type: 'callout', tone: 'term', title: 'New word: Packet', html: `<strong>What it is:</strong> a small piece of data, about 1,500 bytes. A big page or photo is broken into thousands of packets, and each packet carries the IP of the sender and the receiver.<br><strong>Why we need it:</strong> small pieces can take different roads, and if one is lost, only that one needs to be sent again.<br><strong>Without it:</strong> if one part of a big file got damaged, the whole file would have to be sent again.` },
    { type: 'p', html: `These packets do not fly through the air. They go over WiFi to your router, then over a wire to your internet provider (an ISP, like Jio or Airtel), and then further over <strong>fiber optic cables</strong>. A fiber is a thin thread of glass in which data travels as flashes of light. Between countries, these cables lie <strong>under the sea</strong>.` },
    { type: 'image', src: 'assets/img/how-the-web-works/submarine-cables.jpg', alt: 'A world map with red lines showing internet cables under the sea, connecting India, Europe, America and Asia', caption: 'The red lines are internet cables under the sea (this map is from 2015; there are even more cables today). Cables run from cities like Mumbai and Chennai to Europe, the Middle East and Singapore. Data from a website in America comes through these.', credit: { text: 'Greg Mahlknecht (cable data) and OpenStreetMap contributors, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Submarine_cable_map_umap.png', license: 'CC BY-SA 2.0' } },
    { type: 'callout', tone: 'term', title: 'New word: Latency and RTT', html: `<strong>Latency:</strong> the time data takes to get from one place to another.<br><strong>RTT (Round Trip Time):</strong> the time for a message to go and for its answer to come back. Like calling out to someone and waiting to hear their "yes".<br><strong>Why it matters:</strong> even light travels only about 200 km per millisecond in fiber. The RTT from India to America and back is often around 200 ms. Opening a page takes several round trips, so this time keeps adding up.` },

    { type: 'h2', text: '3 rules for talking to a server: TCP, TLS, HTTP' },
    { type: 'p', html: `We have the IP. Now the browser will talk to the server. This conversation happens in 3 layers, one on top of the other. First understand each of them on its own.` },
    { type: 'callout', tone: 'term', title: 'New word: TCP', html: `<strong>What it is:</strong> a rule book (a protocol) that makes sure all the packets arrive, in the right order. If a packet is lost, TCP sends it again.<br><strong>Why we need it:</strong> the internet sometimes drops packets or delivers them in the wrong order. If even one piece of a web page is missing, the page breaks.<br><strong>Without it:</strong> half a photo, an unfinished page, text in the wrong order.<br><strong>How it starts:</strong> before sending data, TCP "shakes hands", which is called the <em>3-way handshake</em>.` },
    { type: 'ascii', text: `
Browser                         Server
   │ ── SYN ──────────────────>   │   "Shall we talk?"
   │ <──────────────── SYN-ACK ── │   "Yes, I am ready"
   │ ── ACK ──────────────────>   │   "Great, let us start"
   │                              │
   └─ now the connection is open (it took 1 round trip) ─┘`, caption: 'TCP handshake: three small messages, one round trip (RTT). In detail: the "TCP, UDP and HTTPS" lesson.' },
    { type: 'callout', tone: 'term', title: 'New word: TLS (and HTTPS)', html: `<strong>What it is:</strong> a lock on top of TCP. The browser and the server agree on a secret key, and then all data is <em>encrypted</em> (locked) with that key. HTTP + TLS = <strong>HTTPS</strong>.<br><strong>Why we need it:</strong> your data passes through cafe WiFi, your ISP and many routers. Without a lock, anyone could read your password. The server also shows a <em>certificate</em>, which proves it is the real xyz.com and not a fake.<br><strong>Without it:</strong> passwords, messages and payments are all out in the open. The browser shows "Not secure".<br><strong>How long it takes:</strong> the new version, TLS 1.3, takes one round trip. The older TLS 1.2 took two.` },
    { type: 'callout', tone: 'term', title: 'New word: HTTP', html: `<strong>What it is:</strong> the question-and-answer language between the browser and the server. The browser sends an <em>HTTP request</em> ("give me the homepage"), and the server sends an <em>HTTP response</em> ("here you go, 200 OK").<br><strong>Why we need it:</strong> the programs on each side were written by different people. They need a common language so that Chrome can talk to any server.<br><strong>Without it:</strong> every website would have its own format, and no browser could open every site.` },
    { type: 'callout', tone: 'term', title: 'New word: Database (here)', html: `<strong>What it is:</strong> the permanent home of data behind the server: users, posts, comments.<br><strong>Why it is here:</strong> the homepage must show the "latest posts". The server does not have this list, so it asks the database.<br><strong>Without it:</strong> the server would forget everything on every restart (remember the previous lesson).` },

    { type: 'h2', text: 'The full journey, step by step' },
    { type: 'p', html: `Now put it all together. First run "First visit": read the message below at every step. Then run "Repeat visit", and then the three failure scenarios. Each scenario teaches a new lesson.` },
    { type: 'flow', title: 'You typed xyz.com: from Enter to the page', height: 290,
      nodes: [
        { id: 'browser', label: 'Browser', sub: 'your Chrome', x: 100, y: 200, w: 150, kind: 'client', info: 'What it is: your Chrome or Safari, the client. It does 4 jobs: takes the URL, asks DNS for the IP, talks to the server in HTTP, and turns the answer into a page. It also has its own cache (DNS answers and files).' },
        { id: 'dns', label: 'DNS Resolver', sub: 'name → IP', x: 330, y: 70, w: 150, kind: 'net', info: 'What it is: the counter of the internet phonebook. The browser gives a name, and it tells the IP: xyz.com → 203.0.113.10. It usually belongs to your ISP, or is a public resolver like 8.8.8.8. The full story inside it is in "Level 2".' },
        { id: 'server', label: 'Server', sub: '203.0.113.10', x: 420, y: 200, w: 140, kind: 'server', info: 'What it is: the computer of xyz.com, on 24x7. Why it is here: it does the TCP and TLS handshakes, reads the HTTP request, gets data from the database, and builds and sends the HTML page.' },
        { id: 'db', label: 'Database', sub: 'posts, users', x: 620, y: 200, w: 140, kind: 'data', info: 'What it is: the permanent home of data (on disk). Why it is here: the "latest posts" on the homepage come from here. The server sends a question (a query), and the database sends back rows.' },
      ],
      edges: [{ a: 'browser', b: 'dns' }, { a: 'browser', b: 'server' }, { a: 'server', b: 'db' }],
      scenarios: [
        { name: 'First visit', intro: 'You are opening xyz.com for the first time. The browser remembers nothing.', steps: [
          { title: 'You typed xyz.com and pressed Enter', text: 'The browser got a name, but it needs an IP to connect. First it checks its own memory (cache). This is the first visit, so there is nothing there.', focus: ['browser'], msg: 'Browser cache: xyz.com? ... not found' },
          { title: 'The browser asks DNS', text: '"What is the IP of xyz.com?" This is called a <strong>DNS query</strong>.', go: 'browser>dns', msg: 'DNS query: IP of xyz.com?' },
          { title: 'DNS answers', text: 'DNS says "203.0.113.10". It also gives a <strong>TTL</strong>: how long you may remember this answer. The browser remembers it.', go: 'res:dns>browser', msg: 'DNS answer: xyz.com = 203.0.113.10  (TTL 300 seconds)' },
          { title: 'TCP handshake: SYN', text: 'Now the browser knocks on the server\'s door at that IP. The first message is SYN, meaning "shall we talk?"', go: 'browser>server', msg: 'TCP SYN  →  203.0.113.10 : 443' },
          { title: 'TCP handshake: SYN-ACK', text: 'The server answers: "yes, I am ready."', go: 'res:server>browser', msg: 'TCP SYN-ACK' },
          { title: 'TCP handshake: ACK', text: 'The browser says "great". Now the TCP connection is open. This took one round trip.', go: 'browser>server', msg: 'TCP ACK  (connection ready)' },
          { title: 'TLS: the browser says hello', text: 'Now we need the lock. The browser lists the encryption methods it knows, and sends its half of the key material.', go: 'browser>server', msg: 'TLS ClientHello: TLS 1.3, these ciphers, my key share' },
          { title: 'TLS: the server says hello + certificate', text: 'The server sends its key material and its <strong>certificate</strong>. The browser checks the certificate: is this really xyz.com? Yes. Now both have the same secret key. In TLS 1.3 this took one round trip.', go: 'res:server>browser', msg: 'TLS ServerHello + Certificate (xyz.com) + Finished' },
          { title: 'The browser sends an HTTP request', text: 'Now the real question, locked. <code>GET</code> means "bring me something". <code>/</code> means the homepage.', go: 'browser>server', msg: 'GET / HTTP/1.1\nHost: xyz.com\nUser-Agent: Chrome\nAccept: text/html' },
          { title: 'The server asks the database for data', text: 'The homepage must show the latest posts. The server sends a <strong>query</strong> to the database.', go: 'server>db', msg: 'SELECT title, author FROM posts ORDER BY created_at DESC LIMIT 10' },
          { title: 'The database sends back rows', text: 'The database returns 10 posts. The server fills them into an HTML template and prepares the page.', go: 'res:db>server', msg: '10 rows: "My first post", "Cricket score app"...' },
          { title: 'The server sends the HTTP response', text: 'The response has two things: a <strong>status code</strong> (200 OK = all good) and a <strong>body</strong> (the real HTML). The headers say what this is and how long it may be cached.', go: 'res:server>browser', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\nCache-Control: max-age=60\n\n<html> ...the page of xyz.com... </html>' },
          { title: 'The browser reads the HTML and asks for files', text: 'The HTML says the page also needs <code>style.css</code>, <code>app.js</code> and <code>logo.png</code>. The browser sends more requests for these, on the same open connection (no new handshake).', go: ['browser>server', 'res:server>browser'], msg: 'GET /style.css   GET /app.js   GET /logo.png' },
          { title: 'The page is on the screen!', text: 'The browser builds the frame of the page from the HTML, colours and positions from the CSS, interactive parts from the JS, and paints it on the screen. The full journey: name → DNS → IP → TCP → TLS → HTTP → server → database → response → rendering.', focus: ['browser'] },
        ]},
        { name: 'Repeat visit (cached)', intro: '2 minutes later you open xyz.com again.', steps: [
          { title: 'The browser remembers the IP', text: 'The IP of xyz.com is still in the browser\'s memory (the TTL was 300 seconds, only 120 have passed). So there is no need to ask DNS. This is called <strong>DNS caching</strong>.', focus: ['browser'], set: { dns: { state: 'dim' } }, msg: 'Cache hit: xyz.com = 203.0.113.10 (180s left)' },
          { title: 'The connection may still be open', text: 'Browsers keep connections open for a while. If it is still open, the TCP and TLS handshakes are skipped too. If it has closed, only the handshakes happen again (not DNS).', focus: ['browser', 'server'] },
          { title: 'A request for the HTML only', text: 'The homepage HTML is requested, because its <code>max-age=60</code> has run out. But the logo, CSS and JS had a long max-age, so they came from the browser cache. No request for them.', go: 'browser>server', msg: 'GET / HTTP/1.1\nHost: xyz.com\n(logo.png, style.css: from browser cache)' },
          { title: 'Response and page', text: 'The server sent fresh HTML. Fewer round trips and fewer files than last time. The page is very fast.', go: 'res:server>browser', msg: 'HTTP/1.1 200 OK' },
        ]},
        { name: 'DNS down', intro: 'This time DNS is not working, and the browser does not remember the IP.', steps: [
          { title: 'The browser asks DNS', text: 'The IP is not in the cache, so it must ask DNS...', go: 'lost:browser>dns', after: { dns: { state: 'down', sub: 'DOWN' } } },
          { title: 'No answer', text: 'DNS is not responding. The browser does not even know the server\'s address.', focus: ['dns'] },
          { title: 'Error: site can\'t be reached', text: 'The server is running perfectly, yet the website did not open! Lesson: <strong>broken DNS = missing website</strong>, even if the server is alive. That is why big companies use more than one DNS provider.', focus: ['browser'], set: { server: { state: 'ok', sub: 'healthy, but alone' } }, msg: 'ERR_NAME_NOT_RESOLVED' },
        ]},
        { name: 'Server down', intro: 'DNS is fine, but the server has crashed.', steps: [
          { title: 'Got the IP from DNS', text: 'DNS gave 203.0.113.10. Everything is fine so far.', go: ['browser>dns', 'res:dns>browser'] },
          { title: 'TCP SYN goes to the server...', text: 'The browser starts the handshake. But nobody is listening at that IP.', go: 'lost:browser>server', after: { server: { state: 'down', sub: 'DOWN' } } },
          { title: 'Timeout', text: 'The browser waits for a while, then gives up. We have <strong>only one server</strong>, so this one down = the whole website down. This is called a <strong>Single Point of Failure (SPOF)</strong>.', focus: ['browser'], msg: 'ERR_CONNECTION_TIMED_OUT' },
        ]},
        { name: 'Database down', intro: 'DNS is fine, the server is fine, but the database is down.', steps: [
          { title: 'DNS, TCP, TLS all fine', text: 'Got the IP, shook hands, put on the lock. The request reached the server.', go: ['browser>dns', 'res:dns>browser', 'browser>server'], msg: 'GET / HTTP/1.1' },
          { title: 'The server asks the database', text: 'The server needs the posts, but the database does not answer.', go: 'bad:server>db', after: { db: { state: 'down', sub: 'DOWN' } } },
          { title: 'The server sends an error', text: 'The server is alive, so at least it can say that something is wrong. It sends a <strong>500</strong> or <strong>503</strong> status. Lesson: you need both the server and the database. If either one fails, the page cannot be built.', go: 'res:server>browser', msg: 'HTTP/1.1 503 Service Unavailable' },
        ]},
      ],
    },

    { type: 'h2', text: 'What is inside a request and a response' },
    { type: 'p', html: `An HTTP message is just written text. The first line is the most important. After it come the <strong>headers</strong> (extra information, in the form "name: value"), then an empty line, then the <strong>body</strong> (the real content).` },
    { type: 'compare',
      left: { title: 'HTTP request (browser → server)', ascii: `
GET /profile HTTP/1.1
Host: xyz.com
Cookie: session=abc123
Accept: text/html` },
      right: { title: 'HTTP response (server → browser)', ascii: `
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: max-age=60

<html>...profile page...</html>` },
    },
    { type: 'table', head: ['Part', 'Meaning'], rows: [
      ['<code>GET /profile</code>', 'Method + path: "bring me the profile page"'],
      ['<code>Host: xyz.com</code>', 'Which website. One server can hold many websites'],
      ['<code>Cookie: session=abc123</code>', 'A small note kept by the browser that says you are logged in'],
      ['<code>200 OK</code>', 'Status code: all good'],
      ['<code>Content-Type: text/html</code>', 'What is in the body: an HTML page (or an image, or JSON)'],
      ['<code>Cache-Control: max-age=60</code>', 'The browser may remember this for 60 seconds, no need to ask again'],
    ]},
    { type: 'table', head: ['Method', 'Meaning', 'xyz.com example'], rows: [
      ['GET', 'Read / fetch something', 'Open the homepage, view a profile'],
      ['POST', 'Create / send something new', 'Publish a new post, send a login form'],
      ['PUT / PATCH', 'Change something that already exists', 'Change the name on your profile'],
      ['DELETE', 'Remove', 'Delete your post'],
    ], caption: 'The full story of methods is in the "What is an API? REST basics" lesson.' },
    { type: 'table', head: ['Status code', 'Meaning', 'When it appears'], rows: [
      ['200', 'OK', 'All good, here is the data'],
      ['301 / 302', 'Go somewhere else', 'The page address has changed (redirect)'],
      ['304', 'Not modified', 'Your cached copy is still correct, use that'],
      ['404', 'Not found', 'This page does not exist'],
      ['500', 'Server error', 'Something broke in the server\'s code'],
      ['503', 'Service unavailable', 'The server is overloaded, or the database behind it is down'],
    ], caption: 'Remember the first digit: 2xx success, 3xx redirect, 4xx your (the client\'s) mistake, 5xx the server\'s mistake.' },

    { type: 'h2', text: 'How the browser builds the page (rendering)' },
    { type: 'callout', tone: 'term', title: 'New word: Rendering', html: `<strong>What it is:</strong> turning the text of HTML, CSS and JavaScript into a page you can see on the screen.<br><strong>Why we need it:</strong> the server only sends text. The buttons, the colours and the place of each photo all have to be built by the browser.<br><strong>Without it:</strong> you would see raw code like <code>&lt;html&gt;&lt;body&gt;...</code> on the screen.` },
    { type: 'steps', items: [
      { t: 'Read the HTML → the frame (DOM)', d: 'The browser reads the HTML from top to bottom and builds a tree-like frame: the page has a heading, under it 10 posts, and each post has a title and a photo. This frame is called the DOM.' },
      { t: 'Ask for more files', d: 'The HTML says that CSS, JavaScript and images are also needed. The browser sends more HTTP requests for them. 50-100 requests for one page is normal.' },
      { t: 'Apply CSS → style', d: 'CSS says what colour, size and font each thing will have.' },
      { t: 'Layout → what goes where', d: 'The browser works out how much space each thing will take on the screen and where it will sit. This is different on a phone and a laptop.' },
      { t: 'Paint → on the screen', d: 'The pixels are coloured. You see the page. JavaScript now brings the buttons to life (something happens on a click).' },
    ]},

    { type: 'h2', text: 'Level 2: what happens inside DNS' },
    { type: 'p', html: `In reality, DNS is not a single computer. The world has hundreds of millions of domains, and they cannot all fit on one machine. So DNS is a <strong>hierarchy</strong> (a ladder from top to bottom). Read the name from the end: <code>xyz.com.</code> = "." (root) → "com" → "xyz".` },
    { type: 'callout', tone: 'term', title: 'New word: Resolver', html: `<strong>What it is:</strong> your "DNS agent". The browser asks it just one question. It then asks the other servers, one by one, on your behalf.<br><strong>Where it lives:</strong> usually at your ISP (Jio, Airtel), or a public one like Google\'s 8.8.8.8 or Cloudflare\'s 1.1.1.1.<br><strong>Why we need it:</strong> it caches answers. Even if 100,000 people look up xyz.com, it asks the upper servers only once.` },
    { type: 'callout', tone: 'term', title: 'New word: Root, TLD and Authoritative server', html: `<strong>Root server:</strong> the top step of the ladder. It does not know the IP of every domain. It only knows where the servers for ".com", ".in" and ".org" are. The root has 13 names (A to M), run by 12 different organisations, and there are more than 2,000 copies of them around the world.<br><strong>TLD server (Top Level Domain):</strong> the register of one ending, like ".com". It knows which server holds the record for xyz.com.<br><strong>Authoritative server:</strong> the real record of xyz.com lives here (for example on Cloudflare DNS or AWS Route 53). The final answer comes from here.` },
    { type: 'flow', title: 'DNS lookup: the resolver asks around', height: 330,
      nodes: [
        { id: 'b', label: 'Browser', x: 90, y: 165, w: 120, kind: 'client', info: 'What it is: your browser. It asks the resolver just one question ("IP of xyz.com?") and waits for the final answer. The resolver does the rest of the work.' },
        { id: 'res', label: 'Resolver', sub: 'ISP / 8.8.8.8', x: 280, y: 165, w: 140, kind: 'net', info: 'What it is: your DNS agent. It asks the root, TLD and authoritative servers one by one, and caches the answers until the TTL ends, so it can answer the next user right away.' },
        { id: 'root', label: 'Root server', sub: 'boss of "."', x: 560, y: 55, w: 160, kind: 'net', info: 'What it is: the top server of the DNS ladder. It does not know the IP of every domain. It only knows where the servers for ".com", ".in" and ".org" are. 13 names, 2,000+ copies around the world.' },
        { id: 'tld', label: '.com TLD server', sub: 'register of .com', x: 560, y: 165, w: 160, kind: 'net', info: 'What it is: the TLD (Top Level Domain) server, the register of all ".com" names. It knows which authoritative server holds the record for xyz.com.' },
        { id: 'auth', label: 'Authoritative', sub: 'record of xyz.com', x: 560, y: 275, w: 160, kind: 'net', info: 'What it is: the server that holds the real record of xyz.com (for example Cloudflare or Route 53). The owner of xyz.com writes the IP here. The final answer comes from here.' },
      ],
      edges: [{ a: 'b', b: 'res' }, { a: 'res', b: 'root' }, { a: 'res', b: 'tld' }, { a: 'res', b: 'auth' }],
      scenarios: [
        { name: 'First time (no cache)', steps: [
          { title: 'The browser asks the resolver', text: '"IP of xyz.com?"', go: 'b>res' },
          { title: 'The resolver asks the root', text: 'The root says: "I do not know, but here is the address of the .com server."', go: ['res>root', 'res:root>res'] },
          { title: 'The resolver asks the .com TLD', text: 'The TLD says: "the record for xyz.com is with the authoritative server ns1.xyz-dns.com."', go: ['res>tld', 'res:tld>res'] },
          { title: 'The authoritative server gives the final answer', text: '"xyz.com = 203.0.113.10, TTL 300 seconds." This line is called an <strong>A record</strong> (A = address).', go: ['res>auth', 'res:auth>res'], msg: 'xyz.com.  300  IN  A  203.0.113.10' },
          { title: 'The resolver tells the browser, and remembers', text: 'For the next 300 seconds, whoever asks, the resolver answers directly. That is why DNS feels so fast.', go: 'res:res>b', set: { res: { sub: 'cached for 300s' } } },
        ]},
        { name: 'In the resolver cache', steps: [
          { title: 'The browser asks', text: 'Someone else looked up xyz.com 1 minute ago.', go: 'b>res' },
          { title: 'Instant answer', text: 'The resolver has a cached answer. The root, TLD and authoritative servers were not disturbed at all. 1 round trip instead of 4.', go: 'res:res>b', set: { root: { state: 'dim' }, tld: { state: 'dim' }, auth: { state: 'dim' } } },
        ]},
        { name: 'Authoritative down', intro: 'The DNS provider of xyz.com is down.', steps: [
          { title: 'The root and TLD show the way', text: 'The root and the .com TLD are fine. They said who holds the record for xyz.com.', go: ['b>res', 'res>root', 'res:root>res', 'res>tld', 'res:tld>res'] },
          { title: 'The authoritative server does not answer', text: 'The resolver asks, but the DNS server of xyz.com is down.', go: 'lost:res>auth', after: { auth: { state: 'down', sub: 'DOWN' } } },
          { title: 'An error for the browser', text: 'The resolver gives up and sends an error (SERVFAIL). Resolvers that still have a cached answer keep the site working until the TTL ends. For everyone else, xyz.com is gone. That is why big sites use two different DNS providers.', go: 'bad:res>b', msg: 'SERVFAIL  →  browser: ERR_NAME_NOT_RESOLVED' },
        ]},
      ],
    },
    { type: 'callout', tone: 'warn', title: 'The TTL trade-off', html: `A long TTL (like 1 day) = fewer DNS queries, faster. But if you have to change the server\'s IP, people keep going to the old IP for up to 1 day. A short TTL (60 seconds) = quick updates, but more queries. In system design, everything is a trade-off like this.` },
    { type: 'callout', tone: 'tip', title: 'Decide: how long should the TTL be?', html: `On a normal day: <strong>5 minutes to 1 hour</strong> (300-3600 seconds) is fine. If you plan to move servers (a migration): one day before, set the TTL to <strong>60 seconds</strong>, change the IP, and when everything works, make the TTL long again. A record that never changes can have a long TTL.` },

    { type: 'h2', text: 'Caching on the way: "remembering" everywhere' },
    { type: 'p', html: `You saw how fast the repeat visit was. The reason: things are remembered at many places on the way. This "remembering" is called <strong>caching</strong>. The sooner some cache can answer a request, the shorter the trip.` },
    { type: 'callout', tone: 'term', title: 'New word: CDN (just the name, for now)', html: `<strong>What it is:</strong> servers placed in cities around the world that keep copies of the images, CSS, JS and videos of xyz.com.<br><strong>Why we need it:</strong> if the server is in America, every photo has to cross the ocean. A CDN gives the copy in Mumbai instead.<br><strong>Without it:</strong> for faraway users every file is 200 ms away. Full lesson in Phase 2.` },
    { type: 'table', head: ['Where', 'What it remembers', 'For how long', 'Benefit'], rows: [
      ['Browser', 'DNS answers, images, CSS, JS, sometimes HTML', 'As long as the TTL / Cache-Control: max-age', 'The request is not sent at all. 0 ms'],
      ['Operating system', 'DNS answers', 'As long as the TTL', 'Other apps benefit too'],
      ['DNS Resolver', 'DNS answers, for millions of users', 'As long as the TTL', 'No need to go to the root/TLD'],
      ['CDN', 'Images, videos, CSS, JS', 'As long as Cache-Control says', 'The file comes from a nearby city'],
      ['Cache next to the server (Redis)', 'Answers from the database', 'The app decides', 'The database rests, answers come faster'],
    ], caption: 'The server-side cache (Redis) and the CDN have full lessons in Phase 2.' },
    { type: 'callout', tone: 'mistake', html: `"Cache = only the browser cache" is wrong. There is a cache at every level: browser, OS, resolver, CDN, server. And remember the other side too: every cache can give an <strong>old copy</strong>. That is why every cache has a TTL or max-age: "ask again after this much time".` },

    { type: 'h3', text: 'Try it: how long will the page take?' },
    { type: 'p', html: `Below, change how far the server is, the DNS cache, the connection and the TLS version. The widget adds up the time of each step until the first byte (the start of the response) comes back.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Where is the server (RTT)</label><select class="hw-rtt">
            <option value="10">In the same city (~10 ms)</option><option value="40">Somewhere in India (~40 ms)</option><option value="70">Singapore (~70 ms)</option><option value="220" selected>America (~220 ms)</option></select></div>
          <div><label>Where the DNS answer comes from</label><select class="hw-dns">
            <option value="full" selected>Full lookup (root → TLD → auth)</option><option value="res">From the resolver cache</option><option value="browser">From the browser cache</option></select></div>
          <div><label>Connection</label><select class="hw-conn"><option value="new" selected>New (handshake needed)</option><option value="reuse">Already open (reuse)</option></select></div>
          <div><label>TLS version</label><select class="hw-tls"><option value="1.3" selected>TLS 1.3 (1 round trip)</option><option value="1.2">TLS 1.2 (2 round trips)</option></select></div>
        </div>
        <label>Work done by the server + database: <strong class="hw-stv">50 ms</strong></label><input type="range" class="hw-st" min="5" max="500" step="5" value="50" style="width:100%">
        <div class="hw-bar" style="display:flex;height:26px;border-radius:var(--r-sm);overflow:hidden;margin:12px 0 6px;border:1px solid var(--line)"></div>
        <div class="hw-legend" style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--ink-2)"></div>
        <div class="stats"><div class="stat"><span>Until the first byte arrives</span><strong class="hw-tot"></strong></div><div class="stat"><span>Round trips to the server</span><strong class="hw-rt"></strong></div></div>
        <div class="calc-note">Estimate: about 20 ms to the resolver, and about 30 ms from the resolver to each of the root, TLD and authoritative servers (full lookup = 20 + 3 × 30 = 110 ms). After this, the time for rendering and the other files is added separately.</div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const rtt = Number(q('.hw-rtt').value), d = q('.hw-dns').value, reuse = q('.hw-conn').value === 'reuse', tls12 = q('.hw-tls').value === '1.2', st = Number(q('.hw-st').value);
        const dns = d === 'browser' ? 0 : d === 'res' ? 20 : 110;
        const tcp = reuse ? 0 : rtt, tls = reuse ? 0 : rtt * (tls12 ? 2 : 1), http = rtt;
        const segs = [['DNS', dns, 'var(--accent)'], ['TCP', tcp, 'var(--violet)'], ['TLS', tls, 'var(--amber)'], ['HTTP', http, 'var(--green)'], ['Server + DB', st, 'var(--ink-3)']];
        const tot = segs.reduce((a, s) => a + s[1], 0);
        q('.hw-stv').textContent = st + ' ms';
        q('.hw-bar').innerHTML = segs.filter(s => s[1] > 0).map(s => `<div title="${s[0]}: ${s[1]} ms" style="width:${(s[1] / tot * 100).toFixed(2)}%;background:${s[2]}"></div>`).join('');
        q('.hw-legend').innerHTML = segs.map(s => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s[2]};margin-right:4px"></i>${s[0]}: <strong>${s[1]} ms</strong></span>`).join('');
        q('.hw-tot').textContent = tot + ' ms';
        q('.hw-rt').textContent = (reuse ? 0 : 1) + (reuse ? 0 : (tls12 ? 2 : 1)) + 1;
      };
      el.querySelectorAll('select, input').forEach(i => { i.addEventListener('input', upd); i.addEventListener('change', upd); });
      upd();
    }},
    { type: 'p', html: `With the default setting (America, first visit, TLS 1.3) it takes <strong>820 ms</strong>, and only 50 ms of that is the server\'s work. The rest is all travel. Bring the server to India (~40 ms): <strong>280 ms</strong>. Keep it in America, but take DNS from the browser cache and reuse the connection: <strong>270 ms</strong>. The lesson: <em>distance and round trips</em> are the biggest cost. That is why CDNs, caching and connection reuse matter so much.` },

    { type: 'h2', text: 'When is this simple architecture enough?' },
    { type: 'p', html: `If 50 people visit xyz.com in a day, one server and one database are enough. Adding a Load Balancer or a CDN here would be useless complexity. But remember the "Server down" scenario: one server = a SPOF. And "Database down" too: even with a live server, the page cannot be built. The solutions come in later lessons.` },
    { type: 'callout', tone: 'mistake', html: `Three common mix-ups:<br>1) <strong>"DNS sends the page."</strong> No. DNS only gives the address. The server sends the page.<br>2) <strong>"HTTPS means the site is safe."</strong> HTTPS only makes sure nobody on the way can read your data and that you are talking to the real domain. The site itself can still be a scam.<br>3) <strong>"The internet = WiFi."</strong> WiFi is only the last part, inside your home. The rest of the trip happens over wires, fiber and cables under the sea.` },

    { type: 'diagram', title: 'From typing xyz.com to the page: the whole picture', height: 540,
      groups: [
        { label: 'Your device', x: 12, y: 220, w: 176, h: 262 },
        { label: 'DNS (phonebook)', x: 250, y: 8, w: 455, h: 270 },
        { label: 'On the way', x: 250, y: 425, w: 180, h: 100 },
        { label: 'xyz.com servers', x: 525, y: 300, w: 180, h: 225 },
      ],
      nodes: [
        { id: 'browser', label: 'Browser', sub: 'you', x: 100, y: 280, w: 150, kind: 'client', info: 'What it is: your Chrome or Safari. Why it is here: it manages the whole trip. It checks the cache, asks DNS for the IP, does the TCP + TLS handshakes, sends the HTTP request and renders the page.' },
        { id: 'bcache', label: 'Browser cache', sub: 'DNS + files', x: 100, y: 440, w: 150, kind: 'cache', info: 'What it is: the browser\'s own memory. Why it is here: DNS answers (until the TTL) and images/CSS/JS (until max-age) come straight from here. Cache hit = no network request, 0 ms.' },
        { id: 'res', label: 'DNS Resolver', sub: 'ISP / 8.8.8.8', x: 340, y: 120, w: 150, kind: 'net', info: 'What it is: your DNS agent. Why it is here: it asks the root, TLD and authoritative servers for the browser, and caches the answer for millions of users.' },
        { id: 'root', label: 'Root server', sub: '"." 13 names', x: 610, y: 60, w: 160, kind: 'net', info: 'What it is: the top server of the DNS ladder. Why it is here: it tells where the register for ".com" is. 13 names, 2,000+ copies around the world.' },
        { id: 'tld', label: '.com TLD', sub: 'register of .com', x: 610, y: 150, w: 160, kind: 'net', info: 'What it is: the register of ".com" names. Why it is here: it tells which authoritative server holds the record for xyz.com.' },
        { id: 'auth', label: 'Authoritative', sub: 'xyz.com record', x: 610, y: 240, w: 160, kind: 'net', info: 'What it is: the server that holds the real DNS record of xyz.com. Why it is here: the final answer "xyz.com = 203.0.113.10, TTL 300" comes from here.' },
        { id: 'cdn', label: 'CDN edge', sub: 'images, CSS, JS', x: 340, y: 480, w: 150, kind: 'net', info: 'What it is: a server near your city that keeps a copy of the files of xyz.com. Why it is here: heavy files should not come from a faraway server. If it does not have a copy (a miss), it fetches it from the server once and keeps it.' },
        { id: 'server', label: 'Server', sub: '203.0.113.10', x: 610, y: 360, w: 140, kind: 'server', info: 'What it is: the computer of xyz.com. Why it is here: the TCP/TLS handshake, reading the HTTP request, getting data from the database, building the HTML and sending 200 OK.' },
        { id: 'db', label: 'Database', sub: 'posts, users', x: 610, y: 480, w: 140, kind: 'data', info: 'What it is: the permanent home of data. Why it is here: the latest posts on the homepage come from here. If it is down, the server sends 503.' },
      ],
      edges: [
        { a: 'browser', b: 'bcache', n: 1, label: 'remember?' },
        { a: 'browser', b: 'res', n: 2, label: 'IP?' },
        { a: 'res', b: 'root', n: 3 },
        { a: 'res', b: 'tld', n: 4 },
        { a: 'res', b: 'auth', n: 5 },
        { a: 'browser', b: 'server', n: 6, label: 'TCP+TLS+GET' },
        { a: 'server', b: 'db', n: 7, label: 'query' },
        { a: 'browser', b: 'cdn', n: 8, label: 'files' },
        { a: 'cdn', b: 'server', label: 'on a miss', dashed: true },
      ],
      paths: [
        { name: 'DNS lookup', text: 'The browser checks its own cache (1). If it is not there, it asks the resolver (2). The resolver asks the root (3), the .com TLD (4) and the authoritative server (5), brings back the IP, and remembers it until the TTL ends.', go: ['browser>bcache', 'browser>res>root', 'res>tld', 'res>auth'] },
        { name: 'First visit', text: 'The IP comes from DNS, then the TCP + TLS handshake and GET with the server (6). The server gets the posts from the database (7) and sends the HTML. Images, CSS and JS come from the CDN (8); if the CDN does not have them, it fetches them from the server.', go: ['browser>res', 'browser>server>db', 'browser>cdn>server'] },
        { name: 'Repeat visit (cached)', text: 'The IP is in the browser cache, and so are the files. Only the HTML needed a trip to the server, and if the connection is still open, there is no handshake either. Very little travel.', go: ['browser>bcache', 'browser>server'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Browser = the client. Server = a computer that is on 24x7 and answers requests.</li>
      <li>DNS turns a name into an IP: resolver → root → TLD → authoritative. The answer is cached until the TTL ends.</li>
      <li>TCP handshake (SYN, SYN-ACK, ACK) = 1 round trip. TLS 1.3 = 1 more round trip. Then the HTTP request.</li>
      <li>HTTP request = method + path + headers. Response = status code + headers + body. 2xx fine, 4xx the client\'s mistake, 5xx the server\'s.</li>
      <li>The server often gets data from the database. Database down = 500/503, even if the server is alive.</li>
      <li>The browser turns HTML into the DOM, then asks for CSS, JS and images, then does layout and paint.</li>
      <li>Caching happens at every level: browser, OS, resolver, CDN, server. Distance and round trips are the biggest cost.</li>
      <li>One server, one DNS provider, one database: each one can be a SPOF.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Very simple: one server, one database, low cost', 'Easy to debug: a request has only one path', 'Perfect for small traffic', 'DNS + caching make repeat visits fast'], costs: ['If the server fails, the website fails (SPOF)', 'If the DNS provider or the database fails, the site is gone too', 'Slow when traffic grows', 'Everything is in one place: every round trip is costly for faraway users'] },

    { type: 'think', questions: [
      { q: 'DNS is working, but the server has crashed. What will the user see?', a: 'DNS will give the IP and the browser will start the TCP handshake, but no answer will come. After a while, a "connection timed out" error appears. The job of DNS is only to give the address, not the page.' },
      { q: 'You opened xyz.com yesterday and opened it again today. Did the browser have to ask DNS?', a: 'Probably yes! A TTL is usually minutes, not days. Once the TTL ends, the browser and resolver ask again. But often the resolver already has a fresh answer because of some other user, so the full root → TLD → authoritative trip is not needed.' },
      { q: 'The server is in America and the users are in India. The first visit takes 820 ms, and the server\'s work is only 50 ms. Name three ways to bring this down.', a: '1) Move the server (or a copy of it) close to India: RTT goes from 220 to about 40 ms. 2) Serve images/CSS/JS from nearby with a CDN. 3) Cut round trips with connection reuse and TLS 1.3. (Bonus: HTTP/3 makes the handshake even shorter; see the "HTTP versions" lesson.)' },
      { q: 'The database is down but the server is running. What will the browser get, and why is this better than a "timeout"?', a: 'The server will send 503 Service Unavailable. This is better than a timeout because the user (and the app) learns right away that something is wrong and should try again later. The request does not hang.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the job of DNS?', options: ['Sending the web page', 'Turning a domain name into an IP address', 'Splitting traffic across servers'], answer: 1, explain: 'DNS = the phonebook. The server sends the page, and a Load Balancer splits the traffic.' },
      { q: 'What does status code 404 mean?', options: ['The server crashed', 'This page does not exist', 'All good'], answer: 1, explain: '4xx = a problem on the client side. 404 = what you asked for was not found. A server problem is a 5xx.' },
      { q: 'What is the downside of setting the DNS TTL to 1 day?', options: ['The website becomes slow', 'When the IP changes, people keep going to the old IP for a long time', 'The DNS server crashes'], answer: 1, explain: 'A long TTL = a long-lived cache. It is fast, but changes arrive late.' },
      { q: 'What is the right order of the three messages in the TCP 3-way handshake?', options: ['ACK, SYN, SYN-ACK', 'SYN, SYN-ACK, ACK', 'HELLO, OK, GET'], answer: 1, explain: 'The browser sends SYN ("shall we talk?"), the server sends SYN-ACK ("yes"), the browser sends ACK ("great"). One round trip.' },
      { q: 'What does TLS do?', options: ['Makes the page faster', 'Encrypts the data and proves the server\'s identity with a certificate', 'Turns a name into an IP'], answer: 1, explain: 'TLS = a lock + an identity check. HTTP + TLS = HTTPS. For speed it actually costs one extra round trip.' },
      { q: 'Why is a repeat visit faster?', options: ['The server runs faster on a repeat visit', 'The DNS answer, the files and sometimes the connection are cached or reused', 'The internet is faster at night'], answer: 1, explain: 'The browser cache keeps DNS answers and files, and an open connection is reused. Fewer round trips = less time.' },
    ]},
    { type: 'sources', items: [
      { title: 'Root Servers', publisher: 'root-servers.org', url: 'https://root-servers.org/', used: '13 root server names, 12 operators, and 2,000+ operational instances (count from October 2026).', official: true },
      { title: 'RFC 9293: Transmission Control Protocol (TCP)', publisher: 'IETF', year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9293', used: 'The 3-way handshake (SYN, SYN-ACK, ACK) and reliable, in-order delivery.', official: true },
      { title: 'RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3', publisher: 'IETF', year: 2018, url: 'https://www.rfc-editor.org/rfc/rfc8446', used: 'The full TLS 1.3 handshake in one round trip; proving the server\'s identity with a certificate.', official: true },
      { title: 'An overview of HTTP', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview', used: 'The shape of a request and response, methods, headers and status codes.', official: true },
      { title: 'Cache-Control header', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control', used: 'Browser and CDN caching with max-age.', official: true },
      { title: 'Populating the page: how browsers work', publisher: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work', used: 'Rendering steps: DOM, CSS, layout, paint.', official: true },
    ]},
  ],
});
