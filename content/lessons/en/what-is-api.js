Lesson.register({
  id: 'what-is-api',
  title: 'What is an API? REST basics',
  minutes: 24,
  summary: `Until now the server sent a full HTML page. But the xyz.com mobile app does not want a page. It only wants data. An API is the fixed way any app can ask the server for data. In this lesson: the parts of a request and a response, JSON, REST (resources + HTTP methods), which methods are safe and idempotent, status codes (in a playground you can run), JSON vs binary formats, versioning, and the rules of good API design.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `The xyz.com app on your phone wants to know: "How many followers does Riya have?"<br>The app cannot look straight into the server's database. It has to <strong>ask</strong> the server.<br>So we need a fixed way to ask: which address to ask at, which words to use, and what shape the answer will come in.<br>This fixed way of asking is called an <strong>API</strong>. In this lesson we will see what it looks like, and what makes an API good.` },

    { type: 'h2', text: 'The problem: a mobile app does not want HTML' },
    { type: 'p', html: `In earlier lessons the browser asked for <code>GET /profile/42</code> and the server sent back a full <strong>HTML page</strong>. HTML is the whole design of the page: heading, image, buttons, everything.` },
    { type: 'p', html: `Now xyz.com also has an Android app. The app builds its own screens, with its own buttons and design. It does not need the design from the server. It only needs this: <em>"the name, photo and follower count of user 42."</em>` },
    { type: 'p', html: `And it is not only Android. The iPhone app, the website, and maybe another company also want data from xyz.com. If we build a separate trick for each one, we do four times the work. We need <strong>one</strong> door where everyone asks for data by the same rules.` },
    { type: 'callout', tone: 'term', title: 'New word: API', html: `<strong>What it is:</strong> an API (Application Programming Interface) is a fixed way for one program to talk to another program. Think of a TV remote. The remote has a few buttons (volume, channel). You press a button and the TV does the job. You do not need to know the circuits inside the TV.<br><strong>Why we need it:</strong> Android, iPhone, the website and partner companies can all ask for xyz.com data by the same rules, and nobody needs to know how the server works inside.<br><strong>Without it:</strong> separate code for every app, every small server change breaks all the apps, and outsiders would try to reach the database directly (dangerous).<br><strong>Example:</strong> send <code>GET https://xyz.com/api/v1/users/42</code> and you get back the data of user 42. That is the "button". Which database sits inside does not matter to anyone.` },
    { type: 'compare',
      left: { title: 'Before: the server sent HTML', ascii: `
GET /profile/42
→ <html><body>
   <h1>Riya</h1>
   <img src=...>
  </body></html>` },
      right: { title: 'Now: the API sends only data (JSON)', ascii: `
GET /api/users/42
→ {
    "id": 42,
    "name": "Riya",
    "followers": 1200
  }` },
    },
    { type: 'callout', tone: 'term', title: 'New word: JSON', html: `<strong>What it is:</strong> JSON (JavaScript Object Notation) is a simple text format for writing data. For example <code>{"name": "Riya", "followers": 1200}</code>.<br><strong>Why we need it:</strong> the server and the apps may be written in different languages (server in Java, app in Kotlin, website in JavaScript). All of them can read JSON, and a person can read it too.<br><strong>Without it:</strong> every team would invent its own format, and we would need "translator" code everywhere.<br><strong>What is inside:</strong> only 6 kinds of things. Object <code>{ }</code> (pairs of name → value), array <code>[ ]</code> (a list), string <code>"Riya"</code>, number <code>1200</code>, <code>true</code>/<code>false</code>, and <code>null</code> (nothing).` },
    { type: 'code', text: `
{
  "id": 42,                      ← number
  "name": "Riya",                ← string (text, in double quotes)
  "verified": true,              ← true / false
  "bio": null,                   ← null = nothing written yet
  "tags": ["cricket", "music"],  ← array = list
  "stats": { "followers": 1200, "posts": 87 }   ← object inside an object
}` },
    { type: 'h2', text: 'The parts of an API call' },
    { type: 'p', html: `Every API conversation has two parts. The app sends a <strong>request</strong> (the question). The server sends back a <strong>response</strong> (the answer). Both have fixed parts inside. Learn to spot them first, and the rest of the lesson will feel easy.` },
    { type: 'compare',
      left: { title: 'Request (app → server)', ascii: `
① method   ② path            ③ query
POST  /api/v1/posts?notify=true
④ headers
Authorization: Bearer eyJhbGc...
Content-Type: application/json
⑤ body
{ "text": "Hello xyz!" }` },
      right: { title: 'Response (server → app)', ascii: `
① status code
HTTP/1.1 201 Created
② headers
Content-Type: application/json
Location: /api/v1/posts/9001
③ body
{ "id": 9001,
  "text": "Hello xyz!" }` },
    },
    { type: 'list', items: [
      `<strong>Method</strong> (also called the <em>verb</em>): what to do. <code>GET</code> = read, <code>POST</code> = create something new, and so on. The full table is below.`,
      `<strong>Path</strong>: which thing to do it on. <code>/api/v1/posts</code> = the collection of posts.`,
      `<strong>Query parameters</strong>: small options after the <code>?</code>, like <code>?notify=true</code> or <code>?limit=20</code>. Used for filter, sort and page size.`,
      `<strong>Headers</strong>: extra information about the request, as <code>Name: value</code> lines. For example "who I am" (<code>Authorization</code>) or "what format the body is in" (<code>Content-Type</code>).`,
      `<strong>Body</strong>: the actual data being sent. GET usually has no body. POST, PUT and PATCH do.`,
      `<strong>Status code</strong>: the first number of the response. In one look it tells what happened: 201 = "created", 404 = "not found". You will try these yourself in the playground below.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: endpoint', html: `<strong>What it is:</strong> a pair of method + path, like <code>GET /api/v1/users/{id}</code>. One "button" of the API.<br><strong>Why we need it:</strong> the docs have one line for each endpoint: what to send, what you get back. Developers work from that list.<br><strong>Without it:</strong> nobody knows which address does what.` },
    { type: 'callout', tone: 'term', title: 'New word: stateless', html: `<strong>What it is:</strong> the server does not "remember" the previous request. Each request must be complete on its own: who is asking (token), what they want (method + path), and all the data (body).<br><strong>Why we need it:</strong> any request can go to any server and still work. Later, when xyz.com has 50 servers, this will matter a lot (scalability lesson).<br><strong>Without it:</strong> a request like "give me page 2" would only work on the server that gave page 1. If that server dies, the user's work is gone too.` },

    { type: 'h2', text: 'REST: the most common API design style' },
    { type: 'p', html: `There are several styles for designing an API. The most common one is <strong>REST</strong>. Its idea fits in two lines:` },
    { type: 'steps', items: [
      { t: 'Everything is a resource, and each resource has an address', d: 'Users, posts, comments, videos: all are resources. The address is made of a name (a noun): /users/42, /posts/9.' },
      { t: 'Say the action with the method, not the address', d: 'To read, use GET. To create, use POST. To remove, use DELETE. The address stays the same; the method changes.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: REST and resource', html: `<strong>What it is:</strong> REST (REpresentational State Transfer) is a design style that Roy Fielding described in his PhD thesis in 2000. A <strong>resource</strong> is any thing that has a name and can be reached by an address. The server sends a "representation" of the resource (usually JSON), which is where the word "Representational" comes from.<br><strong>Why we need it:</strong> all developers understand the same pattern. If you see <code>GET /users/42</code>, you can guess what <code>GET /posts/9</code> does without reading the docs.<br><strong>Without it:</strong> every API has new names: <code>/getUser</code>, <code>/fetchPostData</code>, <code>/user_delete_now</code>. You would have to memorise the docs every time.` },
    { type: 'code', text: `
/users              ← collection: all users
/users/42           ← one item: user 42
/users/42/posts     ← the posts of user 42 (nested: "belongs to")
/posts/9/comments   ← the comments of post 9
/posts?author=42&sort=-created_at   ← filter + sort with the query` },
    { type: 'table', head: ['Method', 'Meaning', 'xyz.com example', 'Safe?', 'Idempotent?'], rows: [
      ['<code>GET</code>', 'Read, change nothing', '<code>GET /users/42</code>: profile', 'Yes', 'Yes'],
      ['<code>POST</code>', 'Create something new (add to a collection)', '<code>POST /posts</code>: new post', 'No', 'No'],
      ['<code>PUT</code>', 'Replace the whole thing (what you send is what stays)', '<code>PUT /users/42/settings</code>: all settings', 'No', 'Yes'],
      ['<code>PATCH</code>', 'Change only some fields', '<code>PATCH /users/42</code> <code>{"name":"Riya S"}</code>', 'No', 'Not necessarily'],
      ['<code>DELETE</code>', 'Remove', '<code>DELETE /posts/9</code>', 'No', 'Yes'],
      ['<code>HEAD</code> / <code>OPTIONS</code>', 'Only headers / "what is allowed here"', 'The browser sends OPTIONS during a CORS check', 'Yes', 'Yes'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: safe and idempotent', html: `A <strong>safe</strong> method does not change the server's data at all (it only reads). An <strong>idempotent</strong> method leaves the server in the same final state whether you run it once or ten times. Like a lift button: press it once or five times, the lift comes only once.<br><strong>Why we need it:</strong> the network can break at any moment. If a method is idempotent, the app can send it again without fear (a retry). POST is not idempotent: send it again and a <em>second</em> post is created.<br><strong>Without it:</strong> a retry causes a double post, a double order, a double payment. The full fix (the idempotency key) is in the next lesson.` },
    { type: 'callout', tone: 'mistake', title: 'PUT vs PATCH', html: `If you send <code>PUT /users/42/settings</code> with <code>{"theme":"dark"}</code>, PUT means "the settings are <strong>now exactly this</strong>". Other fields (like language) may be removed. To change only one field, use <code>PATCH</code>. Also, names like <code>/getUserById?id=42</code> or <code>POST /deletePost</code> are not REST style: the action goes in the method, not in the address.` },
    { type: 'h2', text: 'Status codes: the first number of the answer' },
    { type: 'p', html: `A status code is a three-digit number. The app knows what happened even before it reads the body. The first digit tells the <strong>family</strong>:` },
    { type: 'table', head: ['Family', 'Meaning', 'Whose mistake / what to do'], rows: [
      ['<strong>2xx</strong>', 'Success', 'All good. Use the data.'],
      ['<strong>3xx</strong>', 'Redirect: "look somewhere else"', 'For example 301 (the address changed for good), 304 (your cached copy is still correct).'],
      ['<strong>4xx</strong>', 'The client made a mistake', 'Something is wrong in the request. Sending the same request again is useless. Fix the request first. (429 is the exception: you may wait and send again.)'],
      ['<strong>5xx</strong>', 'The server made a mistake', 'The request was fine, the server slipped. You can wait a little and retry.'],
    ]},
    { type: 'table', head: ['Code', 'Name', 'When to use it', 'Retry?'], rows: [
      ['200', 'OK', 'The request worked, here is the data', '-'],
      ['201', 'Created', 'POST created a new resource (the response has the new id / a Location header)', '-'],
      ['202', 'Accepted', '"We took the job, we will do it later" (like video processing). Check the status later.', '-'],
      ['204', 'No Content', 'Done, nothing to send back (like DELETE)', '-'],
      ['400', 'Bad Request', 'The format or data of the request is wrong (like a missing text field)', 'No, fix it first'],
      ['401', 'Unauthorized', '"Who are you?" Login/token missing or expired', 'After logging in'],
      ['403', 'Forbidden', '"We know who you are, but you are not allowed to do this"', 'No'],
      ['404', 'Not Found', 'This resource does not exist', 'No'],
      ['405', 'Method Not Allowed', 'The resource exists, but this method does not work on it', 'No'],
      ['409', 'Conflict', 'Clashes with the current data: like a username that is already taken', 'No (change the data)'],
      ['429', 'Too Many Requests', 'Too many requests (rate limiting). The Retry-After header says how long to wait', 'Yes, after waiting'],
      ['500', 'Internal Server Error', 'A bug in the server code', 'Maybe, after a short wait'],
      ['503', 'Service Unavailable', 'The server is overloaded, or a needed part (the DB) is down', 'Yes, after waiting'],
    ]},
    { type: 'callout', tone: 'mistake', html: `<strong>401 vs 403</strong> are the two that confuse people most. 401 = "we do not know who you are" (please log in). Its name is "Unauthorized", but it really means "unauthenticated". 403 = "we know you are Riya, but the admin panel is not for you."<br>Another common mistake: sending <code>200 OK</code> even on an error, and writing <code>{"error": "..."}</code> in the body. Then the app, caches and monitoring tools all think everything is fine. Send the right code.` },
    { type: 'h3', text: 'Playground: call the xyz.com API yourself' },
    { type: 'p', html: `Below is a small fake xyz.com server. Choose a request, choose a token, choose the server's health, and press "Send". See which status code comes back and why. Try this: DELETE the same post twice, send the same POST twice, and press "Send 20 times fast".` },
    { type: 'custom', render(el) {
      const S = {
        req: 'Request', tok: 'Token (who is asking)', srv: 'Server health', send: 'Send', spam: 'Send 20 times fast', clock: 'Clock +1 min', reset: 'Reset',
        toks: ['No token', 'Riya (user)', 'Aman (admin)'], srvs: ['Healthy', 'Bug in the code', 'Database down'],
        posts: 'Posts', riyaName: 'Name of user 42', used: 'Requests this minute', log: 'Recent calls', what: 'What happened: ', retry: 'Retry? ',
        start: 'Choose a request and press "Send".',
        why: {
          429: 'The reverse proxy counted more than 15 requests this minute. The request never reached the server. Retry-After says how long to wait.',
          401: 'No token was sent. The server does not know who you are, so it checked nothing else.',
          405: 'The path /users is correct, but DELETE on it (delete all users) is not allowed.',
          400: 'The body has no "text" field. The server saved nothing.',
          403: 'The server knows you are Riya (the token is fine), but admin stats are only for admins.',
          503: 'The database is not answering. The mistake is on the server side; the request was fine.',
          500: 'A bug in the server code threw an exception. This is also the server\'s mistake.',
          404: 'No resource exists with this id (or it was already deleted).',
          409: 'This username already belongs to someone. The format was fine, but the data clashed.',
          200: 'All good. You got the data (or it was updated).', 201: 'A new post was created. The new id came back in the response.',
          202: 'The video upload was accepted. Processing will happen later; ask for the job status later.', 204: 'The post was deleted. Nothing to send back.',
        },
        rt: { 2: 'Not needed, the job is done.', 4: 'No. The same request will get the same answer. Fix the request or the token first.', 429: 'Yes, but only after waiting as long as Retry-After says.', 5: 'Yes, after a short wait (and carefully, if the method is not idempotent).' },
        dupPost: ' Careful: this was the second POST, so one more new post was created. POST is not idempotent.',
        delAgain: ' The first time you got 204, now 404. The server state is the same (post 9 is gone), so DELETE is still idempotent. Idempotent means the same final state, not the same status number.',
        patchAgain: ' The same name was set again. The final state is the same: here PATCH behaved in an idempotent way.',
        spamNote: (a, b) => `20 requests at once: ${a} got through, ${b} got 429.`, clockNote: 'One minute has passed. The rate limit counter starts again from 0.',
      };
      const REQS = [
        { m: 'GET', p: '/api/v1/users/42' }, { m: 'GET', p: '/api/v1/users/99999' },
        { m: 'POST', p: '/api/v1/posts', b: '{ "text": "Hello xyz!" }' }, { m: 'POST', p: '/api/v1/posts', b: '{ }' },
        { m: 'DELETE', p: '/api/v1/posts/9' }, { m: 'PATCH', p: '/api/v1/users/42', b: '{ "name": "Riya S" }' },
        { m: 'POST', p: '/api/v1/users', b: '{ "username": "riya" }', open: true }, { m: 'POST', p: '/api/v1/users', b: '{ "username": "kabir" }', open: true },
        { m: 'POST', p: '/api/v1/videos', b: '{ "file": "match.mp4" }' }, { m: 'GET', p: '/api/v1/admin/stats' }, { m: 'DELETE', p: '/api/v1/users' },
      ];
      const sel = (cls, opts) => `<select class="${cls}" style="width:100%;margin-top:4px;font:13px var(--f-mono);padding:6px;border-radius:var(--r-sm);border:1px solid var(--line-2);background:var(--surface);color:var(--ink)">${opts.map((o, i) => `<option value="${i}">${o}</option>`).join('')}</select>`;
      el.innerHTML = `<div class="row2"><div><label>${S.req}</label>${sel('wa-req', REQS.map(r => r.m + ' ' + r.p + (r.b ? '  ' + r.b : '')))}</div>
        <div><label>${S.tok}</label>${sel('wa-tok', S.toks)}<label style="display:block;margin-top:8px">${S.srv}</label>${sel('wa-srv', S.srvs)}</div></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><button type="button" class="btn small primary wa-send">${S.send}</button><button type="button" class="btn small wa-spam">${S.spam}</button><button type="button" class="btn small wa-clock">${S.clock}</button><button type="button" class="btn small ghost wa-reset">${S.reset}</button></div>
        <pre class="wa-out" style="margin-top:12px;white-space:pre-wrap;font:13px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;min-height:80px"></pre>
        <div class="stats wa-stats"></div><div class="wa-log" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px"></div><div class="calc-note wa-note"></div>`;
      const q = c => el.querySelector(c);
      q('.wa-tok').value = '1';
      let st;
      const reset = () => { st = { posts: { 9: 'First post' }, next: 9001, made: 0, name: 'Riya', taken: ['riya', 'aman'], used: 0, job: 500, log: [], last: null }; q('.wa-out').textContent = ''; q('.wa-note').textContent = S.start; draw(); };
      const handle = (ri, tok, srv) => {
        const r = REQS[ri];
        if (st.used >= 15) return { c: 429, t: 'Too Many Requests', h: 'Retry-After: 60', b: '{ "error": "rate_limited" }' };
        st.used++;
        if (!r.open && tok === 0) return { c: 401, t: 'Unauthorized', b: '{ "error": "login required" }' };
        if (r.m === 'DELETE' && r.p === '/api/v1/users') return { c: 405, t: 'Method Not Allowed', h: 'Allow: GET, POST', b: '{ "error": "method not allowed" }' };
        if (r.b === '{ }') return { c: 400, t: 'Bad Request', b: '{ "error": "text is required" }' };
        if (r.p.includes('admin') && tok !== 2) return { c: 403, t: 'Forbidden', b: '{ "error": "admins only" }' };
        if (srv === 2) return { c: 503, t: 'Service Unavailable', h: 'Retry-After: 30', b: '{ "error": "try again later" }' };
        if (srv === 1) return { c: 500, t: 'Internal Server Error', b: '{ "error": "internal error" }' };
        if (r.p === '/api/v1/users/99999') return { c: 404, t: 'Not Found', b: '{ "error": "user not found" }' };
        if (r.m === 'GET' && r.p.includes('admin')) return { c: 200, t: 'OK', b: '{ "users": 1200000, "posts_today": 54000 }' };
        if (r.m === 'GET') return { c: 200, t: 'OK', b: `{ "id": 42, "name": "${st.name}", "followers": 1200 }` };
        if (r.m === 'POST' && r.p === '/api/v1/posts') { const id = st.next++; st.posts[id] = "Hello xyz!"; st.made++; return { c: 201, t: "Created", h: "Location: /api/v1/posts/" + id, b: `{ "id": ${id}, "text": "Hello xyz!" }`, dup: st.made > 1 }; }
        if (r.m === 'DELETE') { if (!st.posts[9]) return { c: 404, t: 'Not Found', b: '{ "error": "post not found" }', again: true }; delete st.posts[9]; return { c: 204, t: 'No Content', b: '' }; }
        if (r.m === 'PATCH') { const again = st.name === 'Riya S'; st.name = 'Riya S'; return { c: 200, t: 'OK', b: '{ "id": 42, "name": "Riya S", "followers": 1200 }', pagain: again }; }
        if (r.p === '/api/v1/users') { const u = r.b.includes('riya') ? 'riya' : 'kabir'; if (st.taken.includes(u)) return { c: 409, t: 'Conflict', b: '{ "error": "username taken" }' }; st.taken.push(u); return { c: 201, t: 'Created', h: 'Location: /api/v1/users/43', b: '{ "id": 43, "username": "kabir" }' }; }
        const j = ++st.job; return { c: 202, t: 'Accepted', h: 'Location: /api/v1/jobs/' + j, b: `{ "job_id": ${j}, "status": "queued" }` };
      };
      const fam = c => c < 300 ? 'var(--green)' : c < 500 ? 'var(--amber)' : 'var(--red)';
      const draw = () => {
        q('.wa-stats').innerHTML = `<div class="stat"><span>${S.posts}</span><strong>${Object.keys(st.posts).length}</strong></div><div class="stat"><span>${S.riyaName}</span><strong>${st.name}</strong></div><div class="stat"><span>${S.used}</span><strong>${st.used} / 15</strong></div>`;
        q('.wa-log').innerHTML = st.log.slice(-10).map(c => `<span style="padding:2px 8px;border-radius:6px;font:12px var(--f-mono);border:1px solid ${fam(c)};color:${fam(c)}">${c}</span>`).join('');
      };
      const one = () => {
        const ri = +q('.wa-req').value, tok = +q('.wa-tok').value, srv = +q('.wa-srv').value, r = REQS[ri];
        const res = handle(ri, tok, srv); st.log.push(res.c);
        const auth = tok ? `\nAuthorization: Bearer ${tok === 1 ? 'riya' : 'aman'}-token` : '';
        q('.wa-out').textContent = `${r.m} ${r.p}${auth}${r.b ? '\nContent-Type: application/json\n\n' + r.b : ''}\n\n→ HTTP/1.1 ${res.c} ${res.t}${res.h ? '\n' + res.h : ''}${res.b ? '\n\n' + res.b : ''}`;
        let w = S.why[res.c]; if (res.dup) w += S.dupPost; if (res.again) w += S.delAgain; if (res.pagain) w += S.patchAgain;
        const rt = res.c === 429 ? S.rt[429] : S.rt[Math.floor(res.c / 100)];
        q('.wa-note').textContent = S.what + w + ' ' + S.retry + rt; return res.c;
      };
      q('.wa-send').onclick = () => { one(); draw(); };
      q('.wa-spam').onclick = () => { let a = 0, b = 0; for (let i = 0; i < 20; i++) { if (one() === 429) b++; else a++; } q('.wa-note').textContent = S.spamNote(a, b) + ' ' + q('.wa-note').textContent; draw(); };
      q('.wa-clock').onclick = () => { st.used = 0; q('.wa-note').textContent = S.clockNote; draw(); };
      q('.wa-reset').onclick = reset;
      reset();
    }},
    { type: 'h2', text: 'The full journey of one API call' },
    { type: 'p', html: `Now see the same thing in the architecture. Remember the <strong>reverse proxy</strong> from the proxies lesson? It is the door in front of the xyz.com servers: it opens HTTPS and sends requests inside. In each scenario, watch how far the request went and which status code came back.` },
    { type: 'flow', height: 260,
      nodes: [
        { id: 'app', label: 'xyz app', sub: 'Android', x: 85, y: 130, w: 130, kind: 'client', info: 'What it is: the xyz.com app on Riya\'s phone. It sends the API call, reads the JSON in the response, and builds its screen from it. From the status code it decides whether to show the data, go to the login screen, or show "try again later".' },
        { id: 'proxy', label: 'Reverse proxy', sub: 'HTTPS, limits', x: 280, y: 130, w: 150, kind: 'edge', info: 'What it is: the door in front of the servers (like NGINX). HTTPS encryption is opened here. It can also count how many requests one client is sending; if the limit is crossed it returns 429 right here, and the request never reaches the API server.' },
        { id: 'api', label: 'API server', sub: '/api/v1/...', x: 480, y: 130, w: 150, kind: 'server', info: 'What it is: the program that runs the endpoints. On every request: check the token (who is it?), check permission (allowed?), check the body (is the data correct?), then run the logic and return JSON + a status code.' },
        { id: 'db', label: 'Database', sub: 'users, posts', x: 640, y: 130, w: 120, kind: 'data', info: 'What it is: where the real data is kept. Only the API server talks to it. The app never reaches the database directly: this is why the API is also a safety wall.' },
      ],
      edges: [{ a: 'app', b: 'proxy' }, { a: 'proxy', b: 'api' }, { a: 'api', b: 'db' }],
      scenarios: [
        { name: '200: read a profile', steps: [
          { title: 'The app sends a request', text: 'The user opened the profile screen. The app sent a GET, with a token.', go: 'app>proxy>api', msg: 'GET /api/v1/users/42\nAuthorization: Bearer eyJhbGc...' },
          { title: 'The server gets data from the database', text: 'The server checked the token, then read user 42 from the DB.', go: ['api>db', 'res:db>api'] },
          { title: '200 OK + JSON', text: 'All good. The app got the data and built the screen.', go: 'res:api>proxy>app', msg: 'HTTP/1.1 200 OK\n{ "id": 42, "name": "Riya", "followers": 1200 }' },
        ]},
        { name: '201: a new post', steps: [
          { title: 'The app sends a new post', text: 'POST means "create a new resource". The data goes in the request body.', go: 'app>proxy>api', msg: 'POST /api/v1/posts\n{ "text": "Hello xyz!" }' },
          { title: 'The server saves it', text: 'A new row was written in the database.', go: ['api>db', 'res:db>api'] },
          { title: '201 Created', text: '201 says "a new thing was created". The response also carries the new id and a Location header.', go: 'res:api>proxy>app', msg: 'HTTP/1.1 201 Created\nLocation: /api/v1/posts/9001\n{ "id": 9001, "text": "Hello xyz!" }' },
        ]},
        { name: '404: not found', steps: [
          { title: 'The app asks for user 99999', text: 'This user does not exist.', go: 'app>proxy>api', msg: 'GET /api/v1/users/99999' },
          { title: 'Nothing in the DB', go: ['api>db', 'res:db>api'], text: 'The database returned an empty answer.' },
          { title: '404 Not Found', text: '4xx = the client asked for something wrong. The app can show a "User not found" screen. Retrying is useless.', go: 'bad:api>proxy>app', msg: 'HTTP/1.1 404 Not Found\n{ "error": "user not found" }' },
        ]},
        { name: '401: not logged in', steps: [
          { title: 'A request with no token', text: 'The user is not logged in, or the token has expired.', go: 'app>proxy>api', msg: 'GET /api/v1/users/42\n(no Authorization header)' },
          { title: '401 Unauthorized', text: 'The server did not even go to the database. First identity, then work. The app will send the user to the login screen.', go: 'bad:api>proxy>app', set: { db: { state: 'dim' } }, msg: 'HTTP/1.1 401 Unauthorized' },
        ]},
        { name: '429: too fast', steps: [
          { title: 'A buggy app is stuck in a loop', text: 'Because of a bug, the app sends 50 requests every second.', go: 'app>proxy', after: { proxy: { state: 'warn', sub: '50 req/s!' } }, msg: 'GET /api/v1/feed  (x50 per second)' },
          { title: 'The proxy stops it right there', text: 'The limit (say 10 per second) is crossed. The proxy returns 429 at once. The API server and the DB never even know. The full lesson on this (rate limiting) comes later.', go: 'bad:proxy>app', set: { api: { state: 'dim' }, db: { state: 'dim' } }, msg: 'HTTP/1.1 429 Too Many Requests\nRetry-After: 5' },
        ]},
        { name: '503: database down', steps: [
          { title: 'A normal request', text: 'The app sent a perfectly correct request.', go: 'app>proxy>api', msg: 'GET /api/v1/users/42' },
          { title: 'The database is down', text: 'The server went to the DB, but the DB is not answering.', go: 'lost:api>db', after: { db: { state: 'down', sub: 'DOWN' } } },
          { title: '503 Service Unavailable', text: '5xx = the mistake is on the server side, not the client. The client can wait a little and retry. Retrying on a 4xx is useless (a wrong request stays wrong).', go: 'bad:api>proxy>app', msg: 'HTTP/1.1 503 Service Unavailable\nRetry-After: 30' },
        ]},
      ],
    },

    { type: 'h2', text: 'JSON vs binary formats' },
    { type: 'p', html: `JSON is text: a person can read it, and every language understands it. But text has a cost. The field name (<code>"followers"</code>) is written again every time, and the number <code>1200</code> takes four characters (4 bytes).` },
    { type: 'p', html: `So some systems use a <strong>binary format</strong>: the data is stored as bytes, directly in the computer's language. A small number replaces the field name. The most famous one is Google's <strong>Protocol Buffers (Protobuf)</strong>. There are others too: MessagePack, Avro, Thrift.` },
    { type: 'callout', tone: 'term', title: 'New word: binary format (serialization)', html: `<strong>What it is:</strong> turning data into bytes so it can be sent over the network is called <strong>serialization</strong>. In a binary format those bytes are not readable by people, only by programs.<br><strong>Why we need it:</strong> a smaller payload (less bandwidth), and faster parsing (less CPU). When services make lakhs of calls per second, these savings become very large.<br><strong>Without it:</strong> we just use JSON. That is perfectly fine for small or public APIs; for very high-traffic internal calls it costs more CPU and network.<br><strong>Example:</strong> <code>{"id":42,"name":"Riya","followers":1200}</code> is 40 bytes in JSON. The same data in Protobuf is 11 bytes. You will count these bytes yourself in the graphql-grpc lesson.` },
    { type: 'table', head: ['', 'JSON', 'Binary (like Protobuf)'], rows: [
      ['Reading', 'A person can read it, test with curl', 'Cannot be read without a tool'],
      ['Size', 'Bigger (field names every time)', 'Smaller (a number instead of a name)'],
      ['Speed', 'More CPU to parse', 'Fast'],
      ['Schema (a structure fixed in advance)', 'Not required, flexible', 'Required: a .proto file on both sides'],
      ['Where', 'Public APIs, browsers, mobile', 'Internal services, very high traffic, Kafka events'],
    ]},
    { type: 'h2', text: 'Versioning: change the API, do not break old apps' },
    { type: 'p', html: `Changing a website is easy: put new code on the server, and every user gets the new page on the next refresh. A mobile app is not like that. On lakhs of phones a six-month-old app is still running, because people do not update. That old app expects the old shape of JSON from the API.` },
    { type: 'p', html: `If you change the API response and the old app cannot understand it, the app breaks. Such a change is called a <strong>breaking change</strong>. Try it yourself below: which change breaks the app and which does not?` },
    { type: 'custom', render(el) {
      const S = {
        pick: 'Make this change on the server:', resp: 'The API response (this is what the old app gets)', screen: 'The six-month-old app (v1) on Riya\'s phone',
        ok: 'Working', broke: 'Broken', crash: 'App crash: "followers" was supposed to be a number',
        opts: ['Nothing changed', 'Added a new field "bio"', 'Renamed "name" to "full_name"', 'Changed "followers" from a number to the text "1.2k"', 'Removed the "followers" field', 'All these changes only in /v2, /v1 unchanged'],
        notes: [
          'Today\'s state. The old app reads "name" and "followers", and both are there.',
          'Adding a new field is not breaking. The old app does not know "bio", so it ignores it. This is why clients are written with the rule "ignore unknown fields".',
          'Breaking! The old app still looks for "name", which no longer exists. The screen shows blank/undefined instead of the name.',
          'Breaking! Changing the type of a field is the most dangerous. In typed languages like Kotlin/Swift, JSON parsing fails: the app crashes.',
          'Breaking! Removing a field also breaks it. If you must remove it, first announce it as "deprecated", run both for months, then remove it.',
          'The fix: make the changes in a new version, /v2. The old app stays on /v1 and gets the same old shape. The new app uses /v2. After a few months, when traffic on /v1 is very low, switch it off (sunset).',
        ],
      };
      const RESP = [
        '{ "id": 42, "name": "Riya", "followers": 1200 }', '{ "id": 42, "name": "Riya", "followers": 1200, "bio": "cricket fan" }',
        '{ "id": 42, "full_name": "Riya", "followers": 1200 }', '{ "id": 42, "name": "Riya", "followers": "1.2k" }', '{ "id": 42, "name": "Riya" }',
        'GET /api/v1/users/42 → { "id": 42, "name": "Riya", "followers": 1200 }\nGET /api/v2/users/42 → { "id": 42, "full_name": "Riya", "followers": "1.2k", "bio": "cricket fan" }',
      ];
      el.innerHTML = `<div style="font-weight:600">${S.pick}</div><div class="wv-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${S.opts.map((o, i) => `<button type="button" class="chip" data-i="${i}">${o}</button>`).join('')}</div>
        <div class="row2" style="margin-top:12px"><div><div style="font-size:13px;color:var(--ink-3)">${S.resp}</div><pre class="wv-json" style="white-space:pre-wrap;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;margin-top:4px"></pre></div>
        <div><div style="font-size:13px;color:var(--ink-3)">${S.screen}</div><div class="wv-phone" style="margin-top:4px;border:2px solid var(--line-2);border-radius:var(--r);padding:12px;background:var(--surface);max-width:300px"></div></div></div>
        <div class="calc-note wv-note"></div>`;
      // the old v1 app: reads name (string) and followers (must be a number)
      const oldApp = json => {
        const d = JSON.parse(json);
        if (d.followers !== undefined && typeof d.followers !== 'number') return { crash: true };
        return { line1: String(d.name), line2: (d.followers === undefined ? 'undefined' : d.followers.toLocaleString('en-IN')) + ' followers', ok: d.name !== undefined && d.followers !== undefined };
      };
      const show = i => {
        el.querySelectorAll('.wv-chips .chip').forEach(c => c.classList.toggle('on', +c.dataset.i === i));
        el.querySelector('.wv-json').textContent = RESP[i];
        const r = oldApp(i === 5 ? RESP[0] : RESP[i]);
        const badge = (ok, t) => `<div style="margin-top:8px;font-size:13px;font-weight:700;color:${ok ? 'var(--green)' : 'var(--red)'}">${t}</div>`;
        el.querySelector('.wv-phone').innerHTML = r.crash ? `<div style="color:var(--red);font-weight:700">${S.crash}</div>${badge(false, S.broke)}`
          : `<div style="font-family:var(--f-display);font-weight:700;font-size:18px">${r.line1}</div><div style="color:var(--ink-2)">${r.line2}</div>${badge(r.ok, r.ok ? S.ok : S.broke)}`;
        el.querySelector('.wv-note').textContent = S.notes[i];
      };
      el.querySelectorAll('.wv-chips .chip').forEach(c => { c.onclick = () => show(+c.dataset.i); });
      show(0);
    }},
    { type: 'callout', tone: 'term', title: 'New word: API versioning', html: `<strong>What it is:</strong> running the old and the new form of an API side by side, and letting each client say which version it uses.<br><strong>Why we need it:</strong> old apps (that were not updated) do not break, and you can still move the API forward.<br><strong>Without it:</strong> either you can never change the API, or every change crashes lakhs of old apps.` },
    { type: 'table', head: ['Method', 'What it looks like', 'Who uses it / note'], rows: [
      ['URL path', '<code>/api/v1/users</code>, <code>/api/v2/users</code>', 'The most common and the clearest. Easy to see in logs. We will use this for xyz.com.'],
      ['Header', '<code>Accept: application/vnd.xyz.v2+json</code>', 'The URL stays clean, but testing in a browser is harder'],
      ['Date-based version', '<code>Stripe-Version: 2024-06-20</code>', 'Stripe "pins" each account to one API version; you upgrade when you choose'],
      ['Query param', '<code>/users?version=2</code>', 'Rarely used; it confuses cache keys'],
    ]},
    { type: 'callout', tone: 'tip', html: `The rule: <strong>adding is fine, breaking needs a new version.</strong> Do not change the version to add a new optional field or a new endpoint. To remove a field, rename it, or change its type, make a new version. Before you switch off an old version, tell users early: send <code>Deprecation</code> and <code>Sunset</code> headers in the response, saying on which day the version will stop (both have IETF standards: RFC 9745 for Deprecation, RFC 8594 for Sunset).` },
    { type: 'h2', text: 'Design rules for a good API' },
    { type: 'p', html: `The roadmap says: <em>the API is the contract of your system.</em> A contract is a promise made to outside developers. Once people start using it, changing it is expensive. So hold on to these rules from the start:` },
    { type: 'steps', items: [
      { t: 'Predictable naming', d: 'Plural nouns: /users, /posts, /comments. One style everywhere (all snake_case or all camelCase). The action goes in the method, not in the address.' },
      { t: 'The right method, the right status code', d: 'GET for reading (it must never change data), POST for creating. Do not send 200 on an error; send the right code like 400/404/409.' },
      { t: 'One error format', d: 'Every error has the same shape: { "error": { "code": "username_taken", "message": "This username is already taken" } }. The app works with the code, a person reads the message. (RFC 9457 "problem details" gives a standard shape.)' },
      { t: 'Paginated', d: 'Do not send 10 lakh posts at once. Offer GET /posts?limit=20 and a way to get "the next page". The next lesson is about this.' },
      { t: 'Versioned', d: '/api/v1/... Adding is fine; breaking only in a new version.' },
      { t: 'Retry-safe (idempotent)', d: 'If the app sends again after a timeout, the work must not happen twice. GET, PUT, DELETE are safe to retry by nature; POST needs an idempotency key. All of it in the next lesson.' },
      { t: 'Filter, sort and fields through the query', d: 'GET /posts?author=42&sort=-created_at&fields=id,title. Use query parameters instead of creating a new endpoint.' },
      { t: 'Secure and limited', d: 'Always HTTPS. On every request, check identity (a token or an API key) and permission, on the server. Rate limits, so that one client cannot eat everything.' },
      { t: 'Documented', d: 'Every endpoint, its input, output and errors in an OpenAPI file. The docs page and the client code are generated from it.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: OpenAPI', html: `<strong>What it is:</strong> the full map of a REST API in one file (YAML or JSON): which endpoints exist, what to send, what you get, which errors. Its old name was Swagger.<br><strong>Why we need it:</strong> from this file, the docs website, test tools and client code for Android/iPhone are generated automatically.<br><strong>Without it:</strong> docs are written by hand and fall behind the code. Developers use the API by guessing.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>REST for public and mobile APIs</strong> (over JSON): it is simple, every developer knows it, it can be tested with curl, and GET responses can be cached by HTTP and CDNs. For internal services that call each other thousands of times per second, use <strong>gRPC</strong> (binary, typed, streaming). When many different apps need the same data in different shapes, use <strong>GraphQL</strong>. The next lessons compare all three. Start with REST.` },

    { type: 'diagram', title: 'API: the whole picture', height: 520,
      groups: [
        { label: 'Clients', x: 10, y: 14, w: 700, h: 92 },
        { label: 'API versions', x: 60, y: 276, w: 560, h: 90 },
        { label: 'Data + jobs', x: 200, y: 404, w: 510, h: 96 },
      ],
      nodes: [
        { id: 'web', label: 'Website', sub: 'browser', x: 95, y: 60, kind: 'client', info: 'What it is: the xyz.com website, running in a browser. It calls the same API as the apps, and builds parts of the page from the JSON.' },
        { id: 'and', label: 'New app', sub: 'uses /v2', x: 265, y: 60, kind: 'client', info: 'What it is: the latest xyz.com Android/iPhone app. It uses /v2, which has the new response shape.' },
        { id: 'old', label: 'Old app', sub: 'uses /v1', x: 435, y: 60, kind: 'client', info: 'What it is: a six-month-old app on someone\'s phone that was never updated. It expects the old shape of /v1. Versioning protects exactly this app.' },
        { id: 'partner', label: 'Partner dev', sub: 'API key', x: 610, y: 60, kind: 'client', info: 'What it is: an outside company that uses xyz.com data in its own product. It is identified by an API key, and its requests have a limit.' },
        { id: 'proxy', label: 'Reverse proxy', sub: 'HTTPS, rate limit', x: 360, y: 190, w: 170, kind: 'edge', info: 'What it is: one door for all requests. It opens HTTPS, counts whether anyone is sending more than the limit (429), and looks at the path (/v1 or /v2) to send the request to the right API server.' },
        { id: 'v1', label: 'API /v1', sub: 'old shape', x: 200, y: 320, kind: 'server', info: 'What it is: the old version of the API, still running so that old apps do not break. When its traffic becomes very low, it will be switched off with Deprecation/Sunset headers.' },
        { id: 'v2', label: 'API /v2', sub: 'new shape', x: 520, y: 320, kind: 'server', info: 'What it is: the new version of the API. Breaking changes (renaming, changing types) happen only here. It checks the token, permission and body, then returns a status code + JSON.' },
        { id: 'db', label: 'Database', sub: 'users, posts', x: 360, y: 450, kind: 'data', info: 'What it is: the real data. Both versions read the same database; they only build the response in a different shape.' },
        { id: 'jobs', label: 'Job queue', sub: 'later work', x: 610, y: 450, kind: 'queue', info: 'What it is: a line of "work to do later". Long work like video processing is put here, and the API returns 202 Accepted at once. The full lesson on queues comes later.' },
      ],
      edges: [
        { a: 'web', b: 'proxy' },
        { a: 'and', b: 'proxy', n: 1 },
        { a: 'old', b: 'proxy' },
        { a: 'partner', b: 'proxy' },
        { a: 'proxy', b: 'partner', kind: 'bad', label: '429', via: [[700, 190], [700, 60]] },
        { a: 'proxy', b: 'v1', label: '/v1/...' },
        { a: 'proxy', b: 'v2', n: 2, label: '/v2/...' },
        { a: 'v1', b: 'db' },
        { a: 'v2', b: 'db', n: 3 },
        { a: 'v2', b: 'jobs', dashed: true, label: '202 job' },
      ],
      paths: [
        { name: 'New app (v2)', text: 'The new app asks for /v2, the proxy sends it to the /v2 server, the data comes from the DB: 200 + the new shape.', go: ['and>proxy>v2>db'] },
        { name: 'Old app (v1)', text: 'The old app is still on /v1. It gets the old shape, so it does not break.', go: ['old>proxy>v1>db'] },
        { name: 'Video upload (202)', text: 'Long work: the API puts it in the job queue and returns 202 Accepted at once.', go: ['and>proxy>v2>jobs'] },
        { name: 'Too fast (429)', text: 'The partner is sending more than the limit: the proxy returns 429 + Retry-After right there.', go: ['partner>proxy', 'proxy>partner'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>API = a fixed contract for programs to talk. The app asks for data, the server returns JSON.</li>
      <li>Request = method + path + query + headers + body. Response = status code + headers + body.</li>
      <li>REST: everything is a resource (a noun address), the action is the method (GET, POST, PUT, PATCH, DELETE).</li>
      <li>Safe = does not change data (GET). Idempotent = run it many times, the final state is the same (GET, PUT, DELETE). Not POST.</li>
      <li>2xx is fine, 4xx is the client's mistake (retry is useless, except 429), 5xx is the server's mistake (wait and retry).</li>
      <li>JSON is easy to read; binary (Protobuf) is smaller and faster, for internal calls.</li>
      <li>Adding is fine; breaking only in a new version (/v2). Switch off the old version only after giving notice.</li>
      <li>Decide: REST for public/mobile, gRPC for internal high traffic, GraphQL for different shapes.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['One API for all clients: website, Android, iPhone, partners', 'The server can change inside (new database, new code) without telling the apps', 'REST is simple: every developer knows it, test with curl or a browser', 'GET responses can be cached by HTTP and CDNs', 'The database stays hidden from outsiders: every request is checked'], costs: ['Changing the contract is expensive: you must run several versions', 'JSON text is heavy: more CPU/bandwidth for high-traffic internal calls', 'One screen may need many REST calls (over/under-fetching, in the next lessons)', 'Docs, error format, pagination, auth: all must be designed with care'] },
    { type: 'think', questions: [
      { q: 'During signup, a user picks a username that is already taken. Which status code?', a: '409 Conflict. The format of the request is fine (not 400), signup does not need a login (not 401), the data just clashes with something that already exists.' },
      { q: 'The app got a 503. Should it retry? And on a 400?', a: 'On 503, yes, after a short wait (the server is busy for a while; look at Retry-After). On 400, no: the request itself is wrong, and it stays wrong however many times you send it. Fix the request first.' },
      { q: 'xyz.com wants to change "followers" in the user response from a number to an object { "count": 1200, "growth": 3 }. How do you do it without breaking old apps?', a: 'This is a type change, so it is breaking. Two ways: (1) keep the old "followers" number as it is and add a new field "followers_info" (adding is not breaking), or (2) make the change only in /v2, keep /v1 the same, and after a few months switch off /v1 with Deprecation/Sunset headers.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'The correct REST-style request to delete a post?', options: ['GET /deletePost?id=9', 'DELETE /posts/9', 'POST /posts/delete/9'], answer: 1, explain: 'The resource goes in the address (/posts/9), the action in the method (DELETE).' },
      { q: 'A logged-in user tries to open an admin page that is not allowed for them. Code?', options: ['401', '403', '404'], answer: 1, explain: 'The server knows who the user is (so not 401); they just lack permission: 403 Forbidden.' },
      { q: 'In which format does a mobile app usually get data from an API?', options: ['HTML', 'JSON', 'PDF'], answer: 1, explain: 'JSON is light and every language can read it. The app builds its own UI.' },
      { q: 'Which of these methods is NOT idempotent?', options: ['PUT', 'DELETE', 'POST'], answer: 2, explain: 'POST can create a new resource every time. PUT ("set this value") and DELETE ("remove") leave the same final state however many times you run them.' },
      { q: 'Which change will NOT break old apps?', options: ['Renaming a field', 'Adding a new optional field', 'Turning a number field into text'], answer: 1, explain: 'An old app ignores an unknown field. Renaming or changing a type is breaking.' },
      { q: 'A video upload was received; processing will take 10 minutes. The best answer?', options: ['200 OK, after 10 minutes', '202 Accepted + the address of the job', '500, because it is not ready yet'], answer: 1, explain: '202 = "we took the job, it will be done later". The app can ask for the job status later. Keeping a request open for 10 minutes invites a timeout.' },
    ]},
    { type: 'sources', note: 'The facts about methods, status codes and versioning come from these.', items: [
      { title: 'RFC 9110: HTTP Semantics', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110.html', used: 'Safe methods (GET, HEAD, OPTIONS), idempotent methods (plus PUT, DELETE), POST not idempotent; meanings of 200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 500, 503.' },
      { title: 'RFC 5789: PATCH Method for HTTP', publisher: 'IETF', official: true, year: 2010, url: 'https://www.rfc-editor.org/rfc/rfc5789.html', used: 'PATCH applies partial changes and is neither safe nor necessarily idempotent.' },
      { title: 'RFC 6585: Additional HTTP Status Codes', publisher: 'IETF', official: true, year: 2012, url: 'https://www.rfc-editor.org/rfc/rfc6585.html', used: '429 Too Many Requests with optional Retry-After.' },
      { title: 'RFC 8259: The JSON Data Interchange Format', publisher: 'IETF', official: true, year: 2017, url: 'https://www.rfc-editor.org/rfc/rfc8259.html', used: 'JSON value types: object, array, string, number, true, false, null.' },
      { title: 'Architectural Styles and the Design of Network-based Software Architectures (Chapter 5: REST)', publisher: 'Roy Fielding, UC Irvine', year: 2000, url: 'https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm', used: 'Origin of REST: resources, representations, stateless requests, uniform interface.' },
      { title: 'RFC 9457: Problem Details for HTTP APIs', publisher: 'IETF', official: true, year: 2023, url: 'https://www.rfc-editor.org/rfc/rfc9457.html', used: 'Standard JSON shape for API errors.' },
      { title: 'RFC 9745: The Deprecation HTTP Response Header Field, and RFC 8594: The Sunset HTTP Header Field', publisher: 'IETF', official: true, year: 2025, url: 'https://www.rfc-editor.org/rfc/rfc9745.html', used: 'Headers that warn clients that an API version is deprecated and when it will stop working.' },
      { title: 'API versioning (Stripe API reference)', publisher: 'Stripe docs', official: true, url: 'https://docs.stripe.com/api/versioning', used: 'Date-named API versions, account pinned to a version, Stripe-Version header to override.' },
      { title: 'OpenAPI Specification', publisher: 'OpenAPI Initiative', official: true, url: 'https://spec.openapis.org/oas/latest.html', used: 'Machine-readable description of REST endpoints, formerly Swagger.' },
    ]},
  ],
});
