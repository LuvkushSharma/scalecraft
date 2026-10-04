Lesson.register({
  id: 'graphql-grpc',
  title: 'REST vs GraphQL vs gRPC',
  minutes: 28,
  summary: `REST is the most common, but it is not the best everywhere. GraphQL shines when different apps need the same data in different shapes (no more over-fetching and under-fetching), but it brings N+1 queries and caching trouble with it. gRPC shines when internal services call each other thousands of times per second: Protobuf (small binary data), HTTP/2 and streaming. In this lesson: all three, with widgets, and when to use which.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In REST every thing has its own address. To build the profile screen, the app has to go to three places, and from each place it has to pick up more stuff than it needs.<br><strong>GraphQL</strong> says: "go to one window, and write on one slip exactly what you need." The server returns exactly that, and only that.<br><strong>gRPC</strong> is for a different problem: the programs inside xyz.com talk to each other lakhs of times per second. For them, sending long text like JSON is expensive. gRPC lets them talk fast, in small binary packets, over one connection that stays open.<br>Each of the three has its own job. By the end of this lesson you will know when to use which.` },

    { type: 'h2', text: 'Two small problems with REST' },
    { type: 'p', html: `The profile screen of the xyz.com mobile app needs: the user's name, photo, their latest 3 posts, and the follower count. In REST these are three different resources:` },
    { type: 'code', text: `
GET /users/42              → the whole user object (30 fields, only 2 needed)
GET /users/42/posts        → the list of all posts (only 3 needed, only the title)
GET /users/42/followers    → the list of followers (only the count needed)` },
    { type: 'callout', tone: 'term', title: 'New word: over-fetching and under-fetching', html: `<strong>What it is:</strong> <strong>over-fetching</strong> = getting more data than you need (2 fields needed, 30 arrived). <strong>Under-fetching</strong> = one call does not give all the data, so you must make several calls (here, 3).<br><strong>Why it is a problem:</strong> over-fetching eats mobile data and battery. With under-fetching every call is a <strong>round trip</strong> (the request goes + the answer comes back). On slow 4G one round trip can take 200-300 ms. Three, one after another = about 1 second of waiting.<br><strong>Without them (if these problems did not exist):</strong> one call, only the needed fields, the screen appears at once.<br><strong>The REST workaround:</strong> a new endpoint for each screen (<code>/profile-screen/42</code>) or <code>?fields=name,photo</code>. It works, but with 10 screens and 3 apps you get a jungle of endpoints.` },

    { type: 'h2', text: 'GraphQL: the client says what it needs' },
    { type: 'callout', tone: 'term', title: 'New word: GraphQL', html: `<strong>What it is:</strong> a style of API (and a query language) that Facebook built for its mobile app and open-sourced in 2015. There is only one endpoint (like <code>/graphql</code>). The client sends a <strong>query</strong> that describes the exact shape it wants, and the server returns exactly that shape.<br><strong>Why we need it:</strong> different screens and different apps (Android, iPhone, web, smart TV) need the same data in different shapes. Instead of building a new endpoint for each one, the client asks for what it needs.<br><strong>Without it:</strong> over/under-fetching, or the backend team keeps building a new endpoint for every new screen.<br><strong>Example:</strong> GitHub's public API offers both REST and GraphQL.` },
    { type: 'compare',
      left: { title: 'Query (the client sends it)', ascii: `
query {
  user(id: 42) {
    name
    photo
    followersCount
    posts(last: 3) { title }
  }
}` },
      right: { title: 'Response (in exactly that shape)', ascii: `
{
  "data": {
    "user": {
      "name": "Riya",
      "photo": "r.jpg",
      "followersCount": 1200,
      "posts": [{"title":"..."}, ...]
    }
  }
}` },
    },
    { type: 'callout', tone: 'term', title: 'New word: schema and resolver', html: `<strong>What it is:</strong> the <strong>schema</strong> is the <em>map</em> of a GraphQL server: which types exist, which fields each type has, and what type each field is (code below). The client can only ask for what is in the schema. A <strong>resolver</strong> is a small function that fetches the data for one field: the resolver for <code>User.posts</code> calls the Post service, the resolver for <code>User.followersCount</code> calls the Follow service.<br><strong>Why we need it:</strong> with the schema, the server rejects a wrong query before running it, and tools build autocomplete and docs automatically. With resolvers, each field comes from its own place.<br><strong>Without it:</strong> the client does not know what it can ask for, and the server does not know where to fetch each field from.` },
    { type: 'code', text: `
type User {
  id: ID!                 # ! = never null
  name: String!
  photo: String
  followersCount: Int!
  posts(last: Int): [Post!]!
}
type Post { id: ID!  title: String!  author: User! }

type Query    { user(id: ID!): User  feed(first: Int, after: String): [Post!]! }
type Mutation { createPost(text: String!): Post! }       # change data
type Subscription { newComment(postId: ID!): Comment! }   # live updates` },
    { type: 'table', head: ['Operation', 'What it does', 'Roughly in REST'], rows: [
      ['<code>query</code>', 'Read data', 'GET'],
      ['<code>mutation</code>', 'Change data (create, update, delete)', 'POST / PUT / PATCH / DELETE'],
      ['<code>subscription</code>', 'Live updates: the server sends new data as soon as it arrives (often over a WebSocket)', 'Polling or WebSocket (realtime lesson)'],
    ]},
    { type: 'p', html: `Now run it. First REST's three round trips, then GraphQL's one. The third scenario shows a new problem that GraphQL brings.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'app', label: 'Mobile app', sub: 'profile screen', x: 90, y: 150, w: 130, kind: 'client', info: 'What it is: the xyz.com app, building the profile screen. It is on slow 4G, so every round trip is expensive.' },
        { id: 'gw', label: 'API layer', sub: 'REST or GraphQL', x: 310, y: 150, w: 150, kind: 'edge', info: 'What it is: the outer door of xyz.com. In REST mode there are 3 separate endpoints. In GraphQL mode there is one endpoint that reads the query, checks it against the schema, and calls the services inside through resolvers to build the answer.' },
        { id: 'us', label: 'User service', x: 570, y: 50, w: 140, kind: 'server', info: 'What it is: a small separate program (a service) that keeps user data (name, photo). It is inside the data center, so a call from the API layer takes about 1 ms.' },
        { id: 'ps', label: 'Post service', x: 570, y: 150, w: 140, kind: 'server', info: 'What it is: the service that keeps posts. The "latest 3 posts" come from here.' },
        { id: 'fs', label: 'Follow service', x: 570, y: 250, w: 140, kind: 'server', info: 'What it is: the data about who follows whom. The follower count comes from here.' },
      ],
      edges: [{ a: 'app', b: 'gw' }, { a: 'gw', b: 'us' }, { a: 'gw', b: 'ps' }, { a: 'gw', b: 'fs' }],
      scenarios: [
        { name: 'REST: 3 round trips', steps: [
          { title: 'Call 1: /users/42', go: ['app>gw>us', 'res:us>gw>app'], text: 'The first round trip. 30 fields came, 2 were needed.', msg: 'GET /users/42' },
          { title: 'Call 2: /users/42/posts', go: ['app>gw>ps', 'res:ps>gw>app'], text: 'The second round trip. All posts came, 3 were needed.', msg: 'GET /users/42/posts' },
          { title: 'Call 3: /users/42/followers', go: ['app>gw>fs', 'res:fs>gw>app'], text: 'The third round trip. The whole list came, only the count was needed. On a slow network the user waited about 1 second.', msg: 'GET /users/42/followers' },
        ]},
        { name: 'GraphQL: 1 round trip', steps: [
          { title: 'One query', go: 'app>gw', text: 'In one request, the app said what it needs.', msg: 'POST /graphql  { user(id:42){ name photo followersCount posts(last:3){title} } }' },
          { title: 'Resolvers fetch the data inside', text: 'Each field\'s resolver calls its own service, at the same time. These calls are on the fast data-center network (~1 ms), not on the user\'s slow network.', parallel: true, go: ['gw>us', 'gw>ps', 'gw>fs'] },
          { title: 'The answers are joined', parallel: true, go: ['res:us>gw', 'res:ps>gw', 'res:fs>gw'], text: 'The API layer put all three together in the shape of the query.' },
          { title: 'To the app, in one round trip', go: 'res:gw>app', text: 'Only the needed fields. Only one wait on the slow network.' },
        ]},
        { name: 'Heavy query: stop it with a limit', steps: [
          { title: 'Someone sends a very deep query', text: 'Followers of followers of followers... 6 levels deep. One request, but inside it can touch crores of rows. By mistake or on purpose (an attack).', go: 'app>gw', msg: '{ user(id:42){ followers(first:100){ followers(first:100){ followers(first:100){ ... } } } } }' },
          { title: 'Count the cost before running it', text: 'The server first counts the depth and the "cost" of the query (how many items it will touch): 100 × 100 × 100 = 10 lakh+. Over the limit (say depth 5, cost 10,000). The services were never called.', go: 'bad:gw>app', set: { us: { state: 'dim' }, ps: { state: 'dim' }, fs: { state: 'dim' } }, after: { gw: { state: 'warn', sub: 'cost too high' } }, msg: '{ "errors": [{ "message": "Query cost 1010100 exceeds limit 10000" }] }' },
        ]},
      ],
    },

    { type: 'h3', text: 'The N+1 problem: GraphQL\'s hidden danger' },
    { type: 'p', html: `Think of a feed query: "give me 20 posts, and with each post, its author's name". Resolvers run field by field. The <code>feed</code> resolver fetches 20 posts with one query. Then the <code>Post.author</code> resolver runs <strong>separately for each post</strong>: 20 more queries. Total 1 + 20 = 21. This is called the <strong>N+1 problem</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: N+1 and DataLoader', html: `<strong>What it is:</strong> <strong>N+1</strong> = 1 query for the list, then 1 query for each of the N items in the list. <strong>DataLoader</strong> (a small library from Facebook) is a "batching" helper: for a moment it collects all the author requests, removes duplicate ids, and sends one single query: <code>WHERE id IN (...)</code>.<br><strong>Why we need it:</strong> 2 queries instead of 21. Less load on the database and less waiting.<br><strong>Without it:</strong> a feed of 100 posts = 101 queries, for every user. Traffic grows and the database collapses.<br>This problem can happen in REST too (badly written code), but in GraphQL resolvers make it very easy to fall into.` },
    { type: 'custom', render(el) {
      const S = { n: 'Posts in the feed (N)', dl: 'DataLoader (batching) ON', q: 'Database queries', authors: 'Different authors', log: 'Queries that reached the database:',
        more: k => `... and ${k} more queries like this`,
        noteOff: (n, a) => `Without batching: 1 query for the posts + 1 for each post's author = ${1 + n}. But there are only ${a} different authors: ${n - a} queries read a user that had already been read.`,
        noteOn: (n, a) => `DataLoader collected ${n} author requests, removed duplicates (${a} different ids), and sent one single IN query. 2 queries in total, whatever N is.` };
      el.innerHTML = `<div class="row2"><div><label>${S.n}: <strong class="np-nv"></strong></label><input type="range" class="np-n" min="1" max="50" value="20" aria-label="${S.n}"></div>
        <div><label style="display:flex;gap:8px;align-items:center;margin-top:18px"><input type="checkbox" class="np-dl"> ${S.dl}</label></div></div>
        <div class="stats np-stats"></div><div style="font-size:13px;color:var(--ink-3);margin-top:8px">${S.log}</div>
        <pre class="np-log" style="white-space:pre-wrap;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;margin-top:4px"></pre><div class="calc-note np-note"></div>`;
      const q = c => el.querySelector(c);
      // post i (1..N) is written by author ((i * 5) % 8) + 1, so there are at most 8 distinct authors
      const author = i => ((i * 5) % 8) + 1;
      const draw = () => {
        const n = +q('.np-n').value, on = q('.np-dl').checked;
        const ids = []; for (let i = 1; i <= n; i++) ids.push(author(i));
        const uniq = [...new Set(ids)].sort((a, b) => a - b);
        const lines = [`SELECT * FROM posts ORDER BY id DESC LIMIT ${n}`];
        if (on) lines.push(`SELECT * FROM users WHERE id IN (${uniq.join(', ')})`);
        else ids.forEach(id => lines.push(`SELECT * FROM users WHERE id = ${id}`));
        const shown = lines.slice(0, 8); if (lines.length > 8) shown.push(S.more(lines.length - 8));
        q('.np-nv').textContent = n;
        q('.np-stats').innerHTML = `<div class="stat"><span>${S.q}</span><strong>${lines.length}</strong></div><div class="stat"><span>${S.authors}</span><strong>${uniq.length}</strong></div>`;
        q('.np-log').textContent = shown.join('\n');
        q('.np-note').textContent = on ? S.noteOn(n, uniq.length) : S.noteOff(n, uniq.length);
      };
      q('.np-n').oninput = draw; q('.np-dl').onchange = draw; draw();
    }},
    { type: 'h3', text: 'Why caching is hard' },
    { type: 'p', html: `In REST, <code>GET /users/42</code> has a fixed URL. The browser, the CDN and the reverse proxy cache the answer by that URL (the caching and CDN lessons come later). In GraphQL, usually <strong>everything</strong> goes to <code>POST /graphql</code>, and the real question is in the body. Every request has the same URL and a different body. HTTP caches do not look at the body, and they do not cache POST at all. The result: the free caching from a CDN does not work.` },
    { type: 'list', items: [
      `<strong>Query over GET:</strong> send read-only queries with GET (<code>/graphql?query=...</code>). The GraphQL over HTTP spec allows this. But a long query = a long URL, and URLs have a size limit.`,
      `<strong>Persisted queries:</strong> instead of the whole query, the app sends its <em>hash</em> (<code>/graphql?id=a3f9...</code>). The server finds the query by its hash. The URL is short and stable, and a CDN can cache it. Bonus: the server only runs queries that were registered in advance, not unknown heavy ones.`,
      `<strong>Client-side cache:</strong> client libraries like Apollo and Relay keep every object by its id in their own memory, so the same user does not need to be fetched again on another screen.`,
    ]},
    { type: 'callout', tone: 'mistake', html: `<strong>"GraphQL returned 200 OK, so all is fine."</strong> Not necessarily. GraphQL often returns <code>{"data": {...}, "errors": [...]}</code> even with 200: some fields arrived, some failed. The app must always check the <code>errors</code> array. This is why monitoring tools that only look at the status code miss GraphQL errors.` },
    { type: 'table', head: ['GraphQL', 'What we get', 'What we pay'], rows: [
      ['Data shape', 'One request, exactly the needed fields', 'The server must limit the cost (depth/cost) of every query'],
      ['New screens', 'New combinations without backend changes', 'The risk of N+1 in resolvers; DataLoader is needed'],
      ['Types', 'A strongly typed schema, autocomplete, docs', 'Extra work to design the schema'],
      ['Caching', 'A normalized client-side cache', 'HTTP/CDN caching is hard (POST, one URL); persisted queries are needed'],
      ['When it is overkill', '-', 'A small, simple CRUD API with only one client'],
    ]},

    { type: 'h2', text: 'gRPC: fast talk between services' },
    { type: 'p', html: `Now look inside. The xyz.com backend is no longer one big program. There are 20 small services (user, post, follow, feed, notification...), and they call each other lakhs of times per second. On every call, building, sending and parsing JSON text costs both CPU and network. And JSON has no fixed contract: one team renames a field, and another team's service breaks at night.` },
    { type: 'callout', tone: 'term', title: 'New word: RPC', html: `<strong>What it is:</strong> RPC (Remote Procedure Call) = calling a function that runs on another machine as if it were a function in your own code: <code>user = userService.GetUser(42)</code>. A library hides all the network work (making bytes, sending them, reading the answer).<br><strong>Why we need it:</strong> service-to-service code stays clean and simple.<br><strong>Without it:</strong> building URLs by hand everywhere, writing JSON, reading status codes.<br><strong>Difference from REST:</strong> REST thinks in "resources" (nouns) and HTTP methods; RPC thinks in "actions" (functions, verbs): <code>GetUser</code>, <code>CreatePost</code>.` },
    { type: 'callout', tone: 'term', title: 'New word: gRPC', html: `<strong>What it is:</strong> an open-source RPC framework made by Google (open-sourced in 2015; based on Google's older internal system "Stubby"). It gives three things: <strong>Protobuf</strong> (small binary data), <strong>HTTP/2</strong> (many calls at the same time on one connection, and streaming), and <strong>code generation</strong> (client code for every language is generated from the contract file).<br><strong>Why we need it:</strong> high-traffic internal calls become fast, cheap and type-safe.<br><strong>Without it:</strong> JSON/REST also works, but with more CPU, more bytes, and bugs that break the contract.<br><strong>Example:</strong> companies like Netflix, Square and Cisco use gRPC; many parts inside Kubernetes also speak gRPC.` },
    { type: 'code', text: `
// user.proto  ← the contract: both services generate code from this file
syntax = "proto3";

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc WatchFollowers (GetUserRequest) returns (stream FollowerEvent);  // streaming
}
message GetUserRequest { int64 id = 1; }
message User {
  int64  id        = 1;   // ← this "= 1" is the field's NUMBER, not its value
  string name      = 2;
  int64  followers = 3;
}` },
    { type: 'callout', tone: 'term', title: 'New word: Protocol Buffers (Protobuf)', html: `<strong>What it is:</strong> Google's binary data format. In the <code>.proto</code> file every field gets a <strong>number</strong>. On the wire (over the network) the field's name is not sent, only this number and the value. Small numbers take fewer bytes (<strong>varint</strong> encoding: a number like 1200 fits in 2 bytes).<br><strong>Why we need it:</strong> much smaller than JSON and faster to parse. And the <code>.proto</code> file is a fixed contract.<br><strong>Without it:</strong> field names as text every time, and no contract.<br><strong>Rule:</strong> never change or reuse a field number. Add a new field with a new number; old code ignores it. Mark a removed number as <code>reserved</code>.` },
    { type: 'p', html: `In the what-is-API lesson we said: <code>{"id":42,"name":"Riya","followers":1200}</code> is 40 bytes in JSON and 11 in Protobuf. Now count it yourself. Change the values; the meaning of every byte is written below:` },
    { type: 'custom', render(el) {
      const S = { id: 'id', name: 'name', fol: 'followers', json: 'JSON', proto: 'Protobuf (hex bytes)', bytes: 'bytes', save: 'Saving',
        perSec: 'At 1 lakh calls per second', perSecV: (mb) => `${mb} MB/s less data`,
        tag: n => `tag of field ${n}`, len: 'length', skip: n => `field ${n}: value 0 / empty, so it is not sent at all (proto3 default)`,
        note: 'Tag byte = (field number × 8) + wire type. A number (varint) keeps 7 bits in each byte; if more bytes follow, the top bit of the byte is 1. A string: the tag, then the length, then the UTF-8 bytes. Field names ("followers") never travel over the network.' };
      el.innerHTML = `<div class="row2"><div><label>${S.id}</label><input type="number" class="pb-id" min="0" max="999999999" value="42" style="width:100%"></div>
        <div><label>${S.name}</label><input type="text" class="pb-name" maxlength="24" value="Riya" style="width:100%"></div>
        <div><label>${S.fol}</label><input type="number" class="pb-fol" min="0" max="999999999" value="1200" style="width:100%"></div></div>
        <div style="margin-top:12px;font-size:13px;color:var(--ink-3)">${S.json}</div><pre class="pb-json" style="white-space:pre-wrap;word-break:break-all;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin:4px 0"></pre>
        <div style="font-size:13px;color:var(--ink-3)">${S.proto}</div><div class="pb-proto" style="font:12.5px/1.6 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:4px"></div>
        <div class="stats pb-stats"></div><div class="calc-note">${S.note}</div>`;
      const q = c => el.querySelector(c);
      const hex = b => b.toString(16).padStart(2, '0');
      const varint = v => { const out = []; let n = Math.max(0, Math.floor(v)); do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b += 128; out.push(b); } while (n > 0); return out; };
      const utf8 = s => Array.from(new TextEncoder().encode(s));
      const draw = () => {
        const id = Math.min(999999999, Math.max(0, +q('.pb-id').value || 0)), name = q('.pb-name').value, fol = Math.min(999999999, Math.max(0, +q('.pb-fol').value || 0));
        const json = JSON.stringify({ id, name, followers: fol }), jb = utf8(json).length;
        const rows = []; let total = 0;
        const add = (num, parts, label) => { rows.push(`<div><span style="color:var(--accent)">${parts.map(p => p.b.map(hex).join(' ')).join(' ')}</span> <span style="color:var(--ink-3)">← ${parts.map(p => p.t).join(', ')}</span></div>`); total += parts.reduce((a, p) => a + p.b.length, 0); };
        if (id) add(1, [{ b: [8], t: S.tag(1) }, { b: varint(id), t: 'id = ' + id }]); else rows.push(`<div style="color:var(--ink-3)">${S.skip(1)}</div>`);
        if (name) { const nb = utf8(name); add(2, [{ b: [18], t: S.tag(2) }, { b: varint(nb.length), t: S.len + ' ' + nb.length }, { b: nb, t: '"' + name + '"' }]); } else rows.push(`<div style="color:var(--ink-3)">${S.skip(2)}</div>`);
        if (fol) add(3, [{ b: [24], t: S.tag(3) }, { b: varint(fol), t: 'followers = ' + fol }]); else rows.push(`<div style="color:var(--ink-3)">${S.skip(3)}</div>`);
        q('.pb-json').textContent = json;
        q('.pb-proto').innerHTML = rows.join('');
        const mb = ((jb - total) * 100000 / 1e6).toFixed(1);
        q('.pb-stats').innerHTML = `<div class="stat"><span>${S.json}</span><strong>${jb} ${S.bytes}</strong></div><div class="stat"><span>Protobuf</span><strong>${total} ${S.bytes}</strong></div><div class="stat"><span>${S.save}</span><strong>${Math.round(100 * (jb - total) / jb)}%</strong></div><div class="stat"><span>${S.perSec}</span><strong>${S.perSecV(mb)}</strong></div>`;
      };
      el.querySelectorAll('input').forEach(i => { i.oninput = draw; }); draw();
    }},
    { type: 'h3', text: 'HTTP/2 and 4 kinds of calls' },
    { type: 'p', html: `In the HTTP versions lesson we saw that <strong>HTTP/2</strong> can run many requests at the same time on one TCP connection (multiplexing). gRPC runs on it. The connection between services opens once, and thousands of calls go over it: no new TCP + TLS handshake for every call. Because of HTTP/2, gRPC is not only "one question, one answer"; it can also do <strong>streams</strong>: many messages inside one call, from both sides.` },
    { type: 'table', head: ['Call type', 'What it is like', 'xyz.com example'], rows: [
      ['Unary', 'One request, one response (like a normal function)', '<code>GetUser(42)</code> → User'],
      ['Server streaming', 'One request, the server keeps sending many messages', '<code>WatchScore(match)</code> → a new score on every ball'],
      ['Client streaming', 'The client sends many messages, the server answers once at the end', 'The phone sends 1000 location points → "saved"'],
      ['Bidirectional streaming', 'Both sides keep sending, at the same time', 'Live chat, or a voice assistant that answers while it listens'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: deadline', html: `<strong>What it is:</strong> in gRPC every call carries a <strong>deadline</strong>: "I need the answer by this time" (like 300 ms). If service A calls B and B calls C, the remaining time is passed on.<br><strong>Why we need it:</strong> if the user's request has already timed out, the services further down should not keep doing useless work.<br><strong>Without it:</strong> one slow service keeps the whole chain stuck, and threads and connections fill up (the resilience lesson calls this a cascade failure).<br>gRPC has its own status codes, like <code>OK</code>, <code>NOT_FOUND</code>, <code>DEADLINE_EXCEEDED</code>, <code>UNAVAILABLE</code> (you may retry), <code>PERMISSION_DENIED</code>.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'app', label: 'Mobile app', x: 85, y: 150, w: 120, kind: 'client', info: 'What it is: the xyz.com app. From outside it speaks REST/JSON (or GraphQL). Inside there is gRPC, and the app does not even know.' },
        { id: 'bff', label: 'API gateway', sub: 'REST → gRPC', x: 280, y: 150, w: 150, kind: 'edge', info: 'What it is: the translator between outside and inside. It takes REST/JSON from the app, calls the services inside with gRPC, joins the answers and returns JSON. It sets a deadline on every inside call.' },
        { id: 'feed', label: 'Feed service', x: 500, y: 55, w: 150, kind: 'server', info: 'What it is: the service that builds the feed. It fetches posts, then makes one batched gRPC call to the User service for the authors\' names.' },
        { id: 'user', label: 'User service', x: 500, y: 150, w: 150, kind: 'server', info: 'What it is: the service that gives user data. GetUsers([ids]) returns many users in one call (to avoid N+1).' },
        { id: 'live', label: 'Score service', x: 500, y: 245, w: 150, kind: 'server', info: 'What it is: the service that gives the live cricket score. A server-streaming RPC: subscribe once, then every new score arrives by itself.' },
      ],
      edges: [{ a: 'app', b: 'bff' }, { a: 'bff', b: 'feed' }, { a: 'bff', b: 'user' }, { a: 'bff', b: 'live' }, { a: 'feed', b: 'user' }],
      scenarios: [
        { name: 'Unary: get the feed', steps: [
          { title: 'The app makes a REST call', text: 'A normal JSON request from outside.', go: 'app>bff', msg: 'GET /api/v1/feed' },
          { title: 'The gateway calls the Feed service with gRPC', text: 'Binary Protobuf, on an HTTP/2 connection that is already open. Deadline: 300 ms.', go: 'bff>feed', msg: 'FeedService.GetFeed(user_id: 42)  deadline: 300ms' },
          { title: 'The Feed service gets names from the User service', text: 'One batched call: the 8 different authors of 20 posts, in one request.', go: ['feed>user', 'res:user>feed'], msg: 'UserService.GetUsers(ids: [1,2,3,4,5,6,7,8])' },
          { title: 'The answer goes back, in JSON', text: 'The gateway turned Protobuf into JSON and gave it to the app. The two inside calls together take only a few milliseconds.', go: ['res:feed>bff', 'res:bff>app'] },
        ]},
        { name: 'Server streaming: live score', steps: [
          { title: 'The gateway subscribes once', text: 'One single call, which stays open.', go: 'bff>live', msg: 'ScoreService.WatchScore(match: "IND-AUS")' },
          { title: 'A score arrived', text: 'The service sends the message by itself, without being asked. The gateway passes it on to the app (over a live connection like a WebSocket, see the realtime lesson).', go: 'evt:live>bff>app', after: { live: { sub: 'IND 120/2' } } },
          { title: 'The next score', text: 'The same stream, a new message. No new request each time, no new handshake.', go: 'evt:live>bff>app', after: { live: { sub: 'IND 124/2' } } },
          { title: 'Wicket!', text: 'The stream runs until the match ends or the client closes it.', go: 'evt:live>bff>app', after: { live: { sub: 'IND 124/3', state: 'hot' } } },
        ]},
        { name: 'Deadline exceeded', steps: [
          { title: 'A feed request, with a 300 ms deadline', text: 'The gateway called the Feed service.', go: 'app>bff>feed', msg: 'GetFeed(42)  deadline: 300ms' },
          { title: 'The User service is very slow', text: 'The User service is overloaded. The Feed service\'s call got stuck there. The remaining time ran out.', go: 'lost:feed>user', set: { user: { state: 'hot', sub: 'slow: 2 s' } } },
          { title: 'DEADLINE_EXCEEDED', text: 'gRPC cancelled the call by itself and returned an error. The Feed service does not wait for nothing; its thread is free.', go: 'bad:feed>bff', msg: 'status: DEADLINE_EXCEEDED' },
          { title: 'A clear answer to the app', text: 'The gateway gives the app an error quickly (or an older feed from a cache). The user does not stare at a spinner for 2 seconds. Retry a little later.', go: 'bad:bff>app', msg: 'HTTP/1.1 503 Service Unavailable\nRetry-After: 2' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', html: `<strong>"We will call gRPC directly from the browser."</strong> No. Browsers do not give the low-level HTTP/2 control that gRPC needs. For this there is <strong>gRPC-Web</strong>, where a proxy in between (like Envoy) translates. That is why gRPC is mostly used for <strong>internal service-to-service</strong> calls, and REST or GraphQL outside for public/mobile clients. (Mobile apps can speak gRPC, and some big apps do, but REST is still the common choice for public APIs.)` },
    { type: 'h2', text: 'When to use which?' },
    { type: 'table', head: ['', 'REST', 'GraphQL', 'gRPC'], rows: [
      ['Data format', 'JSON (text)', 'JSON (text)', 'Protobuf (binary)'],
      ['Endpoints', 'A URL for each resource', 'One endpoint, the shape is in the query', 'Each function is an RPC method'],
      ['HTTP caching / CDN', 'Easy (GET + URL)', 'Hard (possible with persisted queries)', 'No (inside calls, less needed anyway)'],
      ['Contract', 'Optional (OpenAPI)', 'Schema required', '.proto required, code is generated'],
      ['Streaming', 'No (separately with SSE/WebSocket)', 'Subscriptions', 'Yes, 4 kinds of calls'],
      ['Browser support', 'Full', 'Full', 'Needs gRPC-Web + a proxy'],
      ['Best for', 'Public APIs, simple CRUD', 'Many clients, different shapes', 'Internal service-to-service, high traffic'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>REST</strong> for public and mobile APIs: it is simple, it can be cached, and every developer knows it. <strong>gRPC</strong> between internal services that call each other thousands of times per second: fast, typed, streaming. <strong>GraphQL</strong> when many different clients need the same data in different shapes and you want to avoid over-fetching, and you are ready to handle N+1 and query limits. When in doubt, start with REST.` },
    { type: 'ascii', text: `
In the real world all three often live together:

 Mobile / Web ──(GraphQL or REST)──> API Gateway / BFF
 Partners ─────(REST)─────────────────────┘ │
                       ┌─────(gRPC)──────────┼──────(gRPC)─────┐
                       v                     v                 v
                  User service          Post service     Follow service` },
    { type: 'callout', tone: 'term', title: 'New word: BFF', html: `<strong>What it is:</strong> a BFF (Backend For Frontend) is a thin layer for each kind of client, like a "mobile BFF" and a "web BFF". Outside, it gives data in the shape the client likes (GraphQL or REST), and inside it calls the services with gRPC.<br><strong>Why we need it:</strong> mobile and web have different needs; the inside services should not have to worry about that difference.<br><strong>Without it:</strong> either every service builds special endpoints for every client, or the client calls 10 services directly.` },

    { type: 'diagram', title: 'REST + GraphQL + gRPC: the whole picture', height: 530,
      groups: [
        { label: 'Clients', x: 10, y: 14, w: 700, h: 92 },
        { label: 'Outer APIs', x: 60, y: 140, w: 600, h: 100 },
        { label: 'gRPC services', x: 15, y: 290, w: 690, h: 100 },
        { label: 'Data', x: 220, y: 420, w: 280, h: 96 },
      ],
      nodes: [
        { id: 'web', label: 'Website', sub: 'browser', x: 100, y: 60, kind: 'client', info: 'What it is: the xyz.com website. It asks the GraphQL BFF for exactly the data each of its screens needs.' },
        { id: 'mob', label: 'Mobile apps', sub: 'Android, iPhone', x: 300, y: 60, kind: 'client', info: 'What it is: the xyz.com apps. They are on slow networks, so with GraphQL they get only the needed fields in one round trip.' },
        { id: 'partner', label: 'Partner devs', sub: 'API key', x: 560, y: 60, kind: 'client', info: 'What it is: outside companies. For them: a simple, documented, cacheable REST API, with rate limits.' },
        { id: 'gql', label: 'GraphQL BFF', sub: '/graphql', x: 200, y: 190, kind: 'edge', info: 'What it is: the GraphQL server for the website and the apps. It checks each query against the schema, applies depth/cost limits, and makes gRPC calls through resolvers (with DataLoader, to avoid N+1).' },
        { id: 'rest', label: 'Public REST', sub: '/api/v1', x: 540, y: 190, kind: 'edge', info: 'What it is: the REST API for partners. GET responses can be cached on a CDN. Inside, it also calls the services with gRPC.' },
        { id: 'user', label: 'User service', x: 110, y: 340, kind: 'server', info: 'What it is: user data. RPC methods GetUser / GetUsers. Other services talk to it over gRPC.' },
        { id: 'post', label: 'Post service', x: 270, y: 340, kind: 'server', info: 'What it is: post data. While building a feed, it makes one batched gRPC call to the User service for the authors\' names.' },
        { id: 'follow', label: 'Follow service', x: 430, y: 340, kind: 'server', info: 'What it is: follower data and counts. Both the GraphQL BFF and the public REST API ask it over gRPC.' },
        { id: 'score', label: 'Score service', sub: 'stream', x: 600, y: 340, kind: 'server', info: 'What it is: the live score. A server-streaming RPC: subscribe once, then every update arrives by itself. Partners get it through the REST layer.' },
        { id: 'db', label: 'Databases', sub: 'one per service', x: 360, y: 470, w: 200, kind: 'data', info: 'What it is: each service\'s own data store. Services do not look into each other\'s databases directly; they ask through the gRPC API. This is why the .proto contract matters so much.' },
      ],
      edges: [
        { a: 'web', b: 'gql' },
        { a: 'mob', b: 'gql', n: 1, label: 'GraphQL' },
        { a: 'partner', b: 'rest', label: 'REST' },
        { a: 'gql', b: 'user' },
        { a: 'gql', b: 'post', n: 2, label: 'gRPC' },
        { a: 'gql', b: 'follow' },
        { a: 'rest', b: 'follow', label: 'gRPC' },
        { a: 'rest', b: 'score', kind: 'evt', label: 'stream' },
        { a: 'post', b: 'user' },
        { a: 'user', b: 'db' },
        { a: 'post', b: 'db', n: 3 },
        { a: 'follow', b: 'db' },
        { a: 'score', b: 'db' },
      ],
      paths: [
        { name: 'App screen (GraphQL)', text: 'The app sends one query. The BFF calls the Post service with gRPC, and it calls the User service with one batched call. One round trip, the exact shape.', go: ['mob>gql>post>user', 'post>db'] },
        { name: 'Partner (REST)', text: 'The partner makes a simple REST GET. Inside, the REST layer calls the Follow service with gRPC.', go: ['partner>rest>follow>db'] },
        { name: 'Live score (stream)', text: 'The REST layer opens one gRPC stream to the Score service. Every new score arrives without a new request.', go: ['partner>rest>score'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>REST's two weak points: over-fetching (more data than needed) and under-fetching (many round trips).</li>
      <li>GraphQL: one endpoint, the client writes the exact shape in a query. Schema + resolvers. Query, mutation, subscription.</li>
      <li>GraphQL's dangers: N+1 (batching with DataLoader), heavy queries (depth/cost limits), hard HTTP caching (GET + persisted queries), errors even with 200.</li>
      <li>gRPC: an RPC framework = Protobuf (binary, field numbers) + HTTP/2 (multiplexing, streaming) + code generation.</li>
      <li>In Protobuf, never change or reuse field numbers; adding new fields is safe.</li>
      <li>gRPC calls: unary, server streaming, client streaming, bidirectional. A deadline on every call.</li>
      <li>Browsers do not speak gRPC directly (gRPC-Web + a proxy). So gRPC inside, REST/GraphQL outside.</li>
      <li>Decide: public/mobile = REST, internal high traffic = gRPC, many clients with different shapes = GraphQL.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['REST: simple, cacheable, everyone knows it', 'GraphQL: one round trip, exact data, new screens without new endpoints', 'gRPC: small payload, less CPU, a typed contract, streaming, deadlines', 'All three together: flexible outside, fast inside'], costs: ['Three styles = three kinds of tools, monitoring and skills', 'GraphQL: extra work for N+1, cost limits and caching', 'gRPC: binary data cannot be read by eye, browsers need a proxy, .proto files must be managed', 'Translation layers (gateway/BFF) add one more hop and one more thing that can fail'] },
    { type: 'think', questions: [
      { q: 'xyz.com is building a public API that thousands of third-party developers will use. GraphQL or REST?', a: 'Mostly REST: every developer knows it, CDN/HTTP caching is easy, rate limiting is simple. GraphQL is also possible (GitHub offers both), but query cost limits, caching and docs take extra effort.' },
      { q: 'Two internal services call each other 50,000 times per second. What do they gain by moving from JSON/REST to gRPC?', a: 'A small binary payload (less bandwidth), fast serialization (less CPU), many calls on one HTTP/2 connection (no new handshake per call), deadlines, and fewer bugs thanks to a typed contract.' },
      { q: 'A GraphQL feed query fetches 50 posts and the author name of each post. The database dashboard shows 51 queries per request. What happened, and what is the fix?', a: 'The N+1 problem: the author resolver runs separately for each post. The fix: batching like DataLoader, which collects all the author ids and sends one WHERE id IN (...) query. From 51 queries down to 2.' },
      { q: 'A team removed the field "followers = 3" from a .proto and created a new field "bio = 3". What can break?', a: 'Old clients will still read field 3 as followers (a number), but now it holds bio (text): wrong data or a parse error. The rule: after removing it, mark the number reserved, and put the new field on a new number (like 4).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is over-fetching?', options: ['Less data than needed', 'More data than needed', 'Too many requests'], answer: 1, explain: '2 fields needed, 30 arrived.' },
      { q: 'In which format does gRPC send data?', options: ['XML', 'JSON', 'Protocol Buffers (binary)'], answer: 2, explain: 'Protobuf is compact and fast; a number is sent instead of the field name.' },
      { q: 'One big drawback of GraphQL?', options: ['With one (POST) endpoint, HTTP caching is hard', 'It is not typed', 'It does not run on mobile'], answer: 0, explain: 'All requests go to POST /graphql, so URL-based caching does not work. GET + persisted queries fix this to some extent.' },
      { q: 'What does DataLoader do?', options: ['Removes queries from the cache', 'Collects all requests from one moment and sends one batched query', 'Turns GraphQL into gRPC'], answer: 1, explain: 'N author lookups → one WHERE id IN (...) query. From N+1 down to 2.' },
      { q: 'A live cricket score must be sent between services on every ball. Which gRPC call type?', options: ['Unary', 'Server streaming', 'Client streaming'], answer: 1, explain: 'Subscribe once, then the server keeps sending new messages.' },
      { q: 'What is the benefit of a deadline in gRPC?', options: ['The data gets encrypted', 'Services further down do not waste work on something already late; one slow service does not freeze the whole chain', 'The payload gets smaller'], answer: 1, explain: 'The deadline is passed on. When time runs out = DEADLINE_EXCEEDED, and the work is cancelled.' },
    ]},
    { type: 'sources', note: 'The facts about GraphQL and gRPC come from the official docs.', items: [
      { title: 'Learn GraphQL (Introduction, Schemas and Types, Queries, Mutations, Subscriptions)', publisher: 'graphql.org', official: true, url: 'https://graphql.org/learn/', used: 'Single endpoint, schema and types, resolvers, query/mutation/subscription.' },
      { title: 'Performance', publisher: 'graphql.org', official: true, url: 'https://graphql.org/learn/performance/', used: 'N+1 problem and DataLoader batching, GET for queries and HTTP caching, persisted queries sending a hash.' },
      { title: 'Security', publisher: 'graphql.org', official: true, url: 'https://graphql.org/learn/security/', used: 'Depth limiting, query complexity/cost analysis, trusted documents.' },
      { title: 'GraphQL over HTTP (draft specification)', publisher: 'GraphQL Foundation', official: true, url: 'https://graphql.github.io/graphql-over-http/draft/', used: 'GET allowed for query operations, POST for all; response shape with data and errors.' },
      { title: 'DataLoader', publisher: 'GraphQL Foundation (GitHub)', official: true, url: 'https://github.com/graphql/dataloader', used: 'Batching and per-request caching of loads, originally from Facebook.' },
      { title: 'Core concepts, architecture and lifecycle', publisher: 'grpc.io', official: true, url: 'https://grpc.io/docs/what-is-grpc/core-concepts/', used: 'Service definition in .proto, unary / server streaming / client streaming / bidirectional RPCs, deadlines, cancellation.' },
      { title: 'Status codes and their use in gRPC', publisher: 'grpc.io', official: true, url: 'https://grpc.io/docs/guides/status-codes/', used: 'OK, NOT_FOUND, DEADLINE_EXCEEDED, UNAVAILABLE, PERMISSION_DENIED.' },
      { title: 'gRPC-Web basics', publisher: 'grpc.io', official: true, url: 'https://grpc.io/docs/platforms/web/basics/', used: 'Browsers need gRPC-Web and a proxy such as Envoy.' },
      { title: 'Encoding', publisher: 'Protocol Buffers documentation (protobuf.dev)', official: true, url: 'https://protobuf.dev/programming-guides/encoding/', used: 'Varints (7 bits per byte, continuation bit), tag = (field number << 3) | wire type, length-delimited strings; checked our 11-byte example.' },
      { title: 'Language Guide (proto3)', publisher: 'Protocol Buffers documentation (protobuf.dev)', official: true, url: 'https://protobuf.dev/programming-guides/proto3/', used: 'Field numbers must not be changed or reused, reserved fields, default values not serialized, unknown fields kept/ignored.' },
    ]},
  ],
});
